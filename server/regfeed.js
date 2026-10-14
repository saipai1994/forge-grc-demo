// Regulatory feed ingestion: watch regulator / law-firm feeds (RSS 2.0, Atom 1.0), score each new item for
// relevance to the organisation's adopted frameworks, keep an inbox, and convert items into Regulatory
// change records. No dependencies. server.js wires it in with a few lines (see "regfeed" there).
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),dns=require('node:dns').promises,net=require('node:net'),crypto=require('node:crypto');

const MAX_ITEMS=200,MAX_TEXT=4000,MAX_BODY=2*1024*1024,MAX_REDIRECTS=3,TIMEOUT_MS=15000,MAX_FEEDS=20,MAX_DEPTH=64;
const env=k=>process.env[k]==='1';

// ------------------------------------------------------------------ safe XML / feed parser
// Hand-written, non-validating. DOCTYPE and ENTITY declarations are refused outright so there is no
// entity expansion or external fetch. Only the five XML entities and numeric references are decoded.
const ENT={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
function decodeEntities(s){
 return s.replace(/&(#x[0-9a-fA-F]{1,6}|#[0-9]{1,7}|[a-zA-Z]{2,5});/g,(m,e)=>{
  if(e[0]==='#'){const n=e[1]==='x'||e[1]==='X'?parseInt(e.slice(2),16):parseInt(e.slice(1),10);
   if(!(n>=0x20||n===9||n===10||n===13)||n>0x10FFFF||(n>=0xD800&&n<=0xDFFF))return '';return String.fromCodePoint(n)}
  return Object.prototype.hasOwnProperty.call(ENT,e)?ENT[e]:m})}
const local=n=>{const i=n.indexOf(':');return (i>=0?n.slice(i+1):n).toLowerCase()};
function parseXml(xml){
 if(/<!\s*(DOCTYPE|ENTITY)/i.test(xml))throw new Error('Feed refused: DOCTYPE/ENTITY declarations are not allowed');
 const root={name:'#root',attrs:{},kids:[]},stack=[root];let i=0,nodes=0;const n=xml.length;
 const top=()=>stack[stack.length-1];
 while(i<n){
  const lt=xml.indexOf('<',i);
  if(lt<0){top().kids.push(decodeEntities(xml.slice(i)));break}
  if(lt>i)top().kids.push(decodeEntities(xml.slice(i,lt)));
  if(xml.startsWith('<!--',lt)){const e=xml.indexOf('-->',lt+4);if(e<0)throw new Error('Malformed XML (unterminated comment)');i=e+3;continue}
  if(xml.startsWith('<![CDATA[',lt)){const e=xml.indexOf(']]>',lt+9);if(e<0)throw new Error('Malformed XML (unterminated CDATA)');top().kids.push({cdata:xml.slice(lt+9,e)});i=e+3;continue}
  if(xml[lt+1]==='?'){const e=xml.indexOf('?>',lt+2);if(e<0)throw new Error('Malformed XML (unterminated declaration)');i=e+2;continue}
  if(xml[lt+1]==='!')throw new Error('Feed refused: unsupported markup declaration');
  if(xml[lt+1]==='/'){const e=xml.indexOf('>',lt+2);if(e<0)throw new Error('Malformed XML');const nm=xml.slice(lt+2,e).trim();
   if(stack.length<2||top().raw!==nm)throw new Error('Malformed XML (mismatched </'+nm+'>)');stack.pop();i=e+1;continue}
  // start tag: name, attributes (quoted values), optional self-close
  let j=lt+1;while(j<n&&!/[\s/>]/.test(xml[j]))j++;
  const raw=xml.slice(lt+1,j);if(!raw||!/^[A-Za-z_][\w.:-]*$/.test(raw))throw new Error('Malformed XML (bad tag)');
  const attrs={};let self=false;
  for(;;){
   while(j<n&&/\s/.test(xml[j]))j++;
   if(j>=n)throw new Error('Malformed XML (unterminated tag)');
   if(xml[j]==='>'){j++;break}
   if(xml[j]==='/'&&xml[j+1]==='>'){self=true;j+=2;break}
   let k=j;while(k<n&&!/[\s=/>]/.test(xml[k]))k++;const an=xml.slice(j,k);if(!an)throw new Error('Malformed XML (bad attribute)');
   j=k;while(j<n&&/\s/.test(xml[j]))j++;
   if(xml[j]!=='='){attrs[local(an)]='';continue}
   j++;while(j<n&&/\s/.test(xml[j]))j++;const q=xml[j];if(q!=='"'&&q!=="'")throw new Error('Malformed XML (unquoted attribute)');
   const e=xml.indexOf(q,j+1);if(e<0)throw new Error('Malformed XML (unterminated attribute)');attrs[local(an)]=decodeEntities(xml.slice(j+1,e));j=e+1}
  if(++nodes>200000)throw new Error('Feed has too many elements');
  const el={name:local(raw),raw,attrs,kids:[]};top().kids.push(el);
  if(!self){if(stack.length>MAX_DEPTH)throw new Error('Feed is nested too deeply');stack.push(el)}
  i=j}
 if(stack.length!==1)throw new Error('Malformed XML (unclosed <'+top().raw+'>)');
 return root}
const isEl=k=>k&&typeof k==='object'&&k.name!==undefined;
const textOf=el=>el.kids.map(k=>typeof k==='string'?k:k.cdata!==undefined?k.cdata:textOf(k)).join('');
const kid=(el,name)=>el.kids.find(k=>isEl(k)&&k.name===name);
const kids=(el,name)=>el.kids.filter(k=>isEl(k)&&k.name===name);
function collect(el,name,out){for(const k of el.kids)if(isEl(k)){if(k.name===name)out.push(k);else collect(k,name,out)}return out}
// Feed text may carry HTML (escaped or in CDATA): reduce it to plain text.
function plain(s,max){
 s=String(s||'').replace(/<(script|style)[^>]{0,500}>[\s\S]*?<\/\1\s*>/gi,' ').replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi,' ').replace(/<[^>]{0,2000}>/g,' ');
 s=decodeEntities(s).replace(/&nbsp;/gi,' ').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/\s+/g,' ').trim();
 return s.length>max?s.slice(0,max-1)+'…':s}
const safeLink=s=>{s=String(s||'').trim();return /^https?:\/\/[^\s<>"]{1,1990}$/i.test(s)?s:''};
function isoDate(s){s=String(s||'').trim();if(!s)return '';const t=Date.parse(s);return Number.isFinite(t)?new Date(t).toISOString():''}
function parseFeed(xml){
 if(typeof xml!=='string')throw new Error('Feed is empty');
 xml=xml.replace(/^﻿/,'');
 const doc=parseXml(xml),rootEl=doc.kids.find(isEl);if(!rootEl)throw new Error('Not an RSS or Atom feed');
 let format,list,title;
 if(rootEl.name==='feed'){format='atom';list=kids(rootEl,'entry');title=plain(textOf(kid(rootEl,'title')||{kids:[]}),300)}
 else if(rootEl.name==='rss'||rootEl.name==='rdf'){format='rss';const ch=kid(rootEl,'channel')||rootEl;list=collect(rootEl,'item',[]);title=plain(textOf(kid(ch,'title')||{kids:[]}),300)}
 else throw new Error('Not an RSS or Atom feed (root <'+rootEl.raw+'>)');
 const items=[];
 for(const e of list.slice(0,MAX_ITEMS)){
  const t=n=>{const k=kid(e,n);return k?textOf(k):''};
  let link='',summary='',published='',guid='';
  if(format==='atom'){
   const ls=kids(e,'link'),alt=ls.find(l=>!l.attrs.rel||l.attrs.rel==='alternate')||ls[0];link=safeLink(alt&&alt.attrs.href);
   summary=plain(t('summary')||t('content'),MAX_TEXT);published=isoDate(t('published')||t('updated'));guid=plain(t('id'),500)}
  else{
   link=safeLink(plain(t('link'),2000));summary=plain(t('encoded')||t('description')||t('summary'),MAX_TEXT);
   published=isoDate(t('pubdate')||t('date')||t('published'));guid=plain(t('guid'),500)}
  const ti=plain(t('title'),500);
  if(!ti&&!summary)continue;
  if(!guid)guid=link||crypto.createHash('sha1').update(ti+'|'+published).digest('hex');
  items.push({guid,title:ti||summary.slice(0,120),link,published,summary})}
 return{format,title,items}}

// ------------------------------------------------------------------ SSRF guard and fetch
function blockedAddress(addr){
 if(net.isIPv4(addr)){const [a,b,c]=addr.split('.').map(Number);
  return a===0||a===10||a===127||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===0&&c===0)||(a===192&&b===168)||(a===198&&(b===18||b===19))||a>=224}
 if(net.isIPv6(addr)){const x=addr.toLowerCase();
  const m4=/^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(x)||/^64:ff9b::(\d+\.\d+\.\d+\.\d+)$/.exec(x);if(m4)return blockedAddress(m4[1]);
  const hx=/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(x);if(hx){const h=parseInt(hx[1],16),l=parseInt(hx[2],16);return blockedAddress([h>>8,h&255,l>>8,l&255].join('.'))}
  return x==='::'||x==='::1'||/^f[cd]/.test(x)||/^fe[89ab]/.test(x)||/^ff/.test(x)}
 return true}
async function checkUrl(u){
 let url;try{url=new URL(u)}catch{throw new Error('That is not a valid web address')}
 if(url.protocol!=='https:'&&!(url.protocol==='http:'&&env('FORGE_FEED_ALLOW_HTTP')))throw new Error('Only https:// feed addresses are allowed');
 if(url.username||url.password)throw new Error('Feed addresses must not contain a user name or password');
 const host=url.hostname.replace(/^\[|\]$/g,'');
 let addrs;try{addrs=net.isIP(host)?[{address:host}]:await dns.lookup(host,{all:true})}catch{throw new Error('The host name could not be resolved')}
 if(!env('FORGE_FEED_ALLOW_PRIVATE')&&addrs.some(a=>blockedAddress(a.address)))throw new Error('Address refused: feeds on private, loopback, link-local or metadata addresses are not allowed');
 return url}
async function readCapped(res){
 const cl=+res.headers.get('content-length');if(cl>MAX_BODY)throw new Error('Feed is larger than 2 MB');
 const chunks=[];let n=0;const rd=res.body.getReader();
 for(;;){const {done,value}=await rd.read();if(done)break;n+=value.length;if(n>MAX_BODY){try{await rd.cancel()}catch{}throw new Error('Feed is larger than 2 MB')}chunks.push(value)}
 const buf=Buffer.concat(chunks);let enc='utf-8';const m=/^<\?xml[^>]*encoding=["']([\w-]+)["']/i.exec(buf.subarray(0,200).toString('latin1'));
 if(m){try{new TextDecoder(m[1]);enc=m[1]}catch{}}
 return new TextDecoder(enc).decode(buf)}
// cond: {etag,lastModified}. Returns {notModified:true} or {xml,etag,lastModified}.
async function fetchFeed(u,cond){
 let cur=u;const signal=AbortSignal.timeout(TIMEOUT_MS);
 for(let hop=0;hop<=MAX_REDIRECTS;hop++){
  const url=await checkUrl(cur),h={'user-agent':'ForgeGRC-RegFeed/1','accept':'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5'};
  if(cond&&cond.etag)h['if-none-match']=cond.etag;if(cond&&cond.lastModified)h['if-modified-since']=cond.lastModified;
  const res=await fetch(url,{headers:h,redirect:'manual',signal});
  if(res.status>=300&&res.status<400&&res.headers.get('location')){if(hop===MAX_REDIRECTS)throw new Error('Too many redirects');cur=new URL(res.headers.get('location'),url).href;try{await res.body.cancel()}catch{}continue}
  if(res.status===304)return{notModified:true};
  if(!res.ok){try{await res.body.cancel()}catch{}throw new Error('The server answered '+res.status)}
  return{xml:await readCapped(res),etag:res.headers.get('etag')||'',lastModified:res.headers.get('last-modified')||''}}
 throw new Error('Too many redirects')}

// ------------------------------------------------------------------ relevance scoring (explainable, no ML)
let LIB=null;
function loadLibrary(){ // same load order as tools/validate-library.js
 if(LIB)return LIB;const root=path.join(__dirname,'..'),ctx={window:{},console};vm.createContext(ctx);
 const files=['regulatory-library.js','regulatory-library-industries.js','regulatory-library-sectors.js',...fs.readdirSync(root).filter(f=>/^regulatory-library-(?!industries|sectors)[a-z-]+\.js$/.test(f)).sort(),'regulatory-clauses.js'];
 for(const f of files)vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
 const L=ctx.window.GRC_LIB;
 const STOP=new Set(['the','and','for','of','on','in','to','act','law','rules','rule','regulation','regulations','directive','framework','standard','standards','requirements','guidelines','guideline','master','direction','directions','md','general','information','management','security','national','india','indian','government','international','code','policy','system','systems','risk','data','cyber']);
 const norm=s=>' '+String(s||'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim()+' ';
 const prep=f=>{
  const code=norm(f.code),ct=code.trim().split(' ').filter(t=>t&&!STOP.has(t)&&(t.length>=3||/\d/.test(t)));
  const nm=norm(String(f.name||'').replace(/\([^)]*\)/g,' ')),nt=[...new Set(nm.trim().split(' ').filter(t=>t.length>=4&&!STOP.has(t)))];
  const issuers=String(f.issuer||'').split(/[\/,;]| and /i).map(x=>norm(x)).filter(x=>x.trim().length>=6);
  const themes=new Set((f.obl||[]).map(o=>o[3]));
  return{id:f.id,code:f.code,codeN:code,ct,nmN:nm,nt,issuers,themes,jur:f.jur,region:norm(f.region)}};
 LIB={frameworks:L.frameworks.map(prep),themes:L.themes||{},norm};
 return LIB}
const THEME_KW={PRIV:['privacy','personal data','data protection','consent','data principal'],SEC:['cyber','cybersecurity','information security','vulnerability','ransomware'],INC:['incident','breach','incident reporting'],TPR:['outsourcing','third party','third-party','vendor','service provider'],RES:['resilience','business continuity','continuity','disaster recovery'],FC:['kyc','know your customer','money laundering','aml','sanctions','fraud','terrorist financing'],CONDUCT:['consumer protection','customer protection','grievance','mis-selling','disclosure to customers'],AI:['artificial intelligence','machine learning','model risk'],DISC:['disclosure','reporting requirements','returns'],GOV:['governance','board of directors','fit and proper'],RISK:['risk management','capital adequacy','stress test'],TEST:['audit','testing','assurance'],SAFETY:['safety','hazard'],SUPPLY:['supply chain']};
const GENERIC_KW=['circular','direction','master direction','guidelines','amendment','notification','regulation','penalty','deadline','effective'];
const JURMAP={IN:/india/,EU:/european|\beu\b|europe/,UK:/united kingdom|\buk\b/,US:/united states|\bus\b|america/,AU:/australia/,CA:/canada/,AE:/emirates|uae/,SA:/saudi/,PH:/philippines/,GLOBAL:/global|international/};
const has=(text,term)=>text.includes(' '+term+' ')||(term.length>=5&&text.includes(' '+term));
// item: {title,summary}; opts: {adopted:Set(fw ids), orgThemes:Set(theme keys), feedJur}
function scoreItem(item,opts){
 opts=opts||{};const L=loadLibrary(),text=L.norm((item.title||'')+' . '+(item.summary||'')),adopted=opts.adopted||new Set(),orgThemes=opts.orgThemes||new Set();
 const hits=[];
 for(const f of L.frameworks){
  let raw=0,why=[];
  if(f.codeN.trim().length>=3&&text.includes(f.codeN)){raw+=40;why.push(`names "${f.code}"`)}
  else if(f.ct.length>=2&&f.ct.every(t=>has(text,t))){raw+=30;why.push(`mentions ${f.ct.map(t=>t.toUpperCase()).join(' + ')} (from "${f.code}")`)}
  if(f.nmN.trim().split(' ').length>=3&&text.includes(f.nmN)){raw+=35;why.push('quotes the full title')}
  else if(f.nt.length>=3){const k=f.nt.filter(t=>has(text,t));if(k.length>=3&&k.length/f.nt.length>=0.6){raw+=20;why.push(`title terms: ${k.slice(0,4).join(', ')}`)}}
  if(raw>0){const is=f.issuers.find(x=>text.includes(x));if(is){raw+=10;why.push(`issuer ${is.trim()}`)}}
  if(raw>0){const jt=opts.feedJur&&(f.jur||[]).includes(opts.feedJur)||(opts.feedJur&&JURMAP[opts.feedJur]&&JURMAP[opts.feedJur].test(f.region));if(jt){raw+=3;why.push('same jurisdiction as feed')}}
  if(raw>0)hits.push({fw:f.id,code:f.code,raw:Math.min(raw,60),why,adopted:adopted.has(f.id)})}
 hits.sort((a,b)=>(b.adopted-a.adopted)||(b.raw-a.raw));
 let score=0;const matched=[];
 const best=hits.slice().sort((a,b)=>b.raw-a.raw)[0];if(best)score+=best.raw;
 if(hits.some(h=>h.adopted))score+=20;
 for(const h of hits.slice(0,5))matched.push({fw:h.fw,code:h.code,why:h.why.join('; ')+(h.adopted?'; adopted by your organisation':'')});
 const th=[];for(const [k,kw] of Object.entries(THEME_KW)){const w=kw.find(x=>has(text,L.norm(x).trim()));if(w)th.push([k,w])}
 const thHit=th.slice(0,3);score+=thHit.length*6;
 const orgHit=thHit.filter(([k])=>orgThemes.has(k)).slice(0,2);score+=orgHit.length*4;
 if(thHit.length)matched.push({fw:'',code:'Themes',why:thHit.map(([k,w])=>`"${w}" (${L.themes[k]||k}${orgThemes.has(k)?', you have obligations here':''})`).join('; ')});
 const kw=GENERIC_KW.filter(k=>has(text,k));score+=Math.min(kw.length*3,12);
 if(kw.length)matched.push({fw:'',code:'Keywords',why:kw.join(', ')});
 return{score:Math.max(0,Math.min(100,Math.round(score))),matched}}

// ------------------------------------------------------------------ database, scheduler, routes
let C=null; // context from server.js: {db,getDoc,applyOps,logA,broadcast,send,readBody,okProfile,today}
const now=()=>new Date().toISOString();
const rid=p=>p+crypto.randomBytes(6).toString('hex');
function init(ctx){
 C=ctx;
 C.db.exec(`CREATE TABLE IF NOT EXISTS reg_feeds(id TEXT PRIMARY KEY,org TEXT NOT NULL,profile TEXT NOT NULL,name TEXT NOT NULL,url TEXT NOT NULL,jur TEXT,kind TEXT,interval_min INTEGER DEFAULT 360,active INTEGER DEFAULT 1,etag TEXT,last_modified TEXT,last_ok TEXT,last_err TEXT,created TEXT);
CREATE TABLE IF NOT EXISTS reg_items(id TEXT PRIMARY KEY,org TEXT NOT NULL,profile TEXT NOT NULL,feed_id TEXT NOT NULL,guid TEXT NOT NULL,title TEXT,link TEXT,published TEXT,summary TEXT,fetched TEXT,status TEXT DEFAULT 'New',score INTEGER DEFAULT 0,matched TEXT,UNIQUE(feed_id,guid));
CREATE INDEX IF NOT EXISTS reg_items_idx ON reg_items(org,profile,status,score);`);
 for(const c of ['last_try TEXT'])try{C.db.exec('ALTER TABLE reg_feeds ADD COLUMN '+c)}catch{}
 try{C.db.exec('ALTER TABLE reg_items ADD COLUMN converted TEXT')}catch{}}
const inflight=new Set();
function orgContext(org,profile){
 const d=C.getDoc(org,profile),adopted=new Set(),themes=new Set();
 if(d&&Array.isArray(d.state.obl))for(const o of d.state.obl){if(o.fw)adopted.add(o.fw);if(o.theme&&o.status!=='Not applicable')themes.add(o.theme)}
 return{adopted,orgThemes:themes}}
// Fetch one feed, store new items. Never throws: errors are recorded in last_err.
async function refreshFeed(f){
 if(inflight.has(f.id))return{skipped:true};inflight.add(f.id);
 const db=C.db;let out;
 try{
  db.prepare('UPDATE reg_feeds SET last_try=? WHERE id=?').run(now(),f.id);
  const r=await fetchFeed(f.url,{etag:f.etag,lastModified:f.last_modified});
  if(r.notModified){db.prepare('UPDATE reg_feeds SET last_ok=?,last_err=NULL WHERE id=?').run(now(),f.id);out={added:0,total:0,notModified:true}}
  else{
   const parsed=parseFeed(r.xml),ctx=orgContext(f.org,f.profile),ins=db.prepare('INSERT OR IGNORE INTO reg_items(id,org,profile,feed_id,guid,title,link,published,summary,fetched,status,score,matched) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)');
   let added=0;
   for(const it of parsed.items){const s=scoreItem(it,{...ctx,feedJur:f.jur}),id='ri_'+crypto.createHash('sha256').update(f.id+'|'+it.guid).digest('hex').slice(0,20);
    const x=ins.run(id,f.org,f.profile,f.id,it.guid.slice(0,500),it.title,it.link,it.published,it.summary,now(),'New',s.score,JSON.stringify(s.matched));added+=Number(x.changes)}
   db.prepare('UPDATE reg_feeds SET last_ok=?,last_err=NULL,etag=?,last_modified=? WHERE id=?').run(now(),r.etag||null,r.lastModified||null,f.id);
   out={added,total:parsed.items.length};if(added)C.broadcast(f.org,f.profile,{type:'regfeed',feed:f.id,added})}
 }catch(e){const m=String(e&&e.message||e).slice(0,300);try{db.prepare('UPDATE reg_feeds SET last_err=? WHERE id=?').run(m,f.id)}catch{}out={error:m}}
 finally{inflight.delete(f.id)}
 return out}
async function tick(){ // refresh feeds that are due
 if(!C)return;let rows;try{rows=C.db.prepare('SELECT * FROM reg_feeds WHERE active=1').all()}catch{return}
 const t=Date.now();
 for(const f of rows){const last=f.last_try?Date.parse(f.last_try):0;if(t-last>=Math.max(15,f.interval_min||360)*60e3)await refreshFeed(f)}}
let timer=null;
function startScheduler(){if(process.env.FORGE_FEED_SCHEDULER==='0'||timer)return;timer=setInterval(()=>{tick().catch(e=>console.error('regfeed:',e.message))},60e3);if(timer.unref)timer.unref()}

const feedView=f=>({id:f.id,profile:f.profile,name:f.name,url:f.url,jur:f.jur||'',kind:f.kind||'',interval_min:f.interval_min,active:!!f.active,last_ok:f.last_ok,last_err:f.last_err,last_try:f.last_try,created:f.created});
const itemView=r=>{let m=[];try{m=JSON.parse(r.matched||'[]')}catch{}return{id:r.id,profile:r.profile,feed_id:r.feed_id,feed_name:r.feed_name,feed_jur:r.feed_jur||'',title:r.title,link:r.link,published:r.published,summary:r.summary,fetched:r.fetched,status:r.status,score:r.score,matched:m,converted:r.converted||null}};
const KINDS=['Regulator','Law firm','Government','Standards body','Other'];
function catalogue(){try{return JSON.parse(fs.readFileSync(path.join(__dirname,'regfeed-sources.json'),'utf8'))}catch{return{sources:[]}}}
const guessType=t=>/consult|discussion paper|draft/i.test(t)?'Consultation':/amend/i.test(t)?'Amendment':/circular/i.test(t)?'Circular':/notif/i.test(t)?'Notification':'Guidance';
const addDays=(iso,n)=>{const d=new Date(iso+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const ID_OK=/^[A-Za-z0-9_]{1,40}$/;

async function route(req,res,url,user){
 const {send,readBody,okProfile,logA}=C,p=url.pathname,M=req.method,admin=user.role==='Administrator',canWork=user.role!=='Auditor';
 const prof=url.searchParams.get('profile')||'';
 if(p==='/api/regfeed/catalogue'&&M==='GET')return send(res,200,catalogue());
 if(p==='/api/regfeed/feeds'&&M==='GET'){
  if(!okProfile(prof))return send(res,400,{error:'Bad profile'});
  return send(res,200,{feeds:C.db.prepare('SELECT * FROM reg_feeds WHERE org=? AND profile=? ORDER BY name').all(user.org,prof).map(feedView),max:MAX_FEEDS})}
 if(p==='/api/regfeed/feeds'&&M==='POST'){
  if(!admin)return send(res,403,{error:'Only an administrator can add or remove feeds.'});
  let b;try{b=await readBody(req)}catch{return send(res,400,{error:'Bad request'})}
  if(!okProfile(b.profile))return send(res,400,{error:'Bad profile'});
  const name=String(b.name||'').trim().slice(0,120),u=String(b.url||'').trim().slice(0,1000);if(name.length<2)return send(res,400,{error:'Give the feed a name.'});
  try{await checkUrl(u)}catch(e){return send(res,400,{error:e.message})}
  if(C.db.prepare('SELECT COUNT(*) c FROM reg_feeds WHERE org=? AND profile=?').get(user.org,b.profile).c>=MAX_FEEDS)return send(res,409,{error:`A workspace can watch up to ${MAX_FEEDS} feeds.`});
  if(C.db.prepare('SELECT 1 FROM reg_feeds WHERE org=? AND profile=? AND url=?').get(user.org,b.profile,u))return send(res,409,{error:'That feed is already added.'});
  const id=rid('rf_'),iv=Math.min(Math.max(Math.round(+b.interval_min)||360,15),1440),kind=KINDS.includes(b.kind)?b.kind:'Regulator',jur=String(b.jur||'').trim().slice(0,12);
  C.db.prepare('INSERT INTO reg_feeds(id,org,profile,name,url,jur,kind,interval_min,active,created) VALUES(?,?,?,?,?,?,?,?,1,?)').run(id,user.org,b.profile,name,u,jur,kind,iv,now());
  logA(user.org,b.profile,null,user.name,user.role,'regfeed',id,'feed added',{title:name,url:u});
  return send(res,200,{feed:feedView(C.db.prepare('SELECT * FROM reg_feeds WHERE id=?').get(id))})}
 let m=/^\/api\/regfeed\/feeds\/([A-Za-z0-9_]+)$/.exec(p);
 if(m&&M==='DELETE'){
  if(!admin)return send(res,403,{error:'Only an administrator can add or remove feeds.'});
  const f=C.db.prepare('SELECT * FROM reg_feeds WHERE id=? AND org=?').get(m[1],user.org);if(!f)return send(res,404,{error:'No such feed'});
  C.db.prepare('DELETE FROM reg_items WHERE feed_id=? AND status<>?').run(f.id,'Converted');C.db.prepare('DELETE FROM reg_feeds WHERE id=?').run(f.id);
  logA(user.org,f.profile,null,user.name,user.role,'regfeed',f.id,'feed removed',{title:f.name});return send(res,200,{ok:true})}
 if(p==='/api/regfeed/refresh'&&M==='POST'){
  if(!canWork)return send(res,403,{error:'Not permitted'});
  let b;try{b=await readBody(req)}catch{return send(res,400,{error:'Bad request'})}
  if(!okProfile(b.profile))return send(res,400,{error:'Bad profile'});
  const rows=b.feed?C.db.prepare('SELECT * FROM reg_feeds WHERE id=? AND org=? AND profile=?').all(String(b.feed),user.org,b.profile):C.db.prepare('SELECT * FROM reg_feeds WHERE org=? AND profile=? AND active=1').all(user.org,b.profile);
  if(b.feed&&!rows.length)return send(res,404,{error:'No such feed'});
  const results=[];for(const f of rows)results.push({feed:f.id,name:f.name,...(await refreshFeed(f))});
  logA(user.org,b.profile,null,user.name,user.role,'regfeed',b.feed||null,'feeds refreshed',{feeds:rows.length,added:results.reduce((n,r)=>n+(r.added||0),0)});
  return send(res,200,{results,feeds:C.db.prepare('SELECT * FROM reg_feeds WHERE org=? AND profile=? ORDER BY name').all(user.org,b.profile).map(feedView)})}
 if(p==='/api/regfeed/items'&&M==='GET'){
  if(!okProfile(prof))return send(res,400,{error:'Bad profile'});
  const st=url.searchParams.get('status')||'',min=Math.max(0,Math.min(100,+url.searchParams.get('min')||0));
  let sql='SELECT i.*,f.name AS feed_name,f.jur AS feed_jur FROM reg_items i LEFT JOIN reg_feeds f ON f.id=i.feed_id WHERE i.org=? AND i.profile=? AND i.score>=?';const a=[user.org,prof,min];
  if(st){sql+=' AND i.status=?';a.push(st)}
  sql+=' ORDER BY i.score DESC,i.published DESC LIMIT 500';
  return send(res,200,{items:C.db.prepare(sql).all(...a).map(itemView)})}
 m=/^\/api\/regfeed\/items\/([A-Za-z0-9_]+)(\/convert)?$/.exec(p);
 if(m&&M==='POST'){
  if(!canWork)return send(res,403,{error:'Auditors have read-only access to the feed inbox.'});
  let b;try{b=await readBody(req)}catch{return send(res,400,{error:'Bad request'})}
  const it=C.db.prepare('SELECT i.*,f.name AS feed_name FROM reg_items i LEFT JOIN reg_feeds f ON f.id=i.feed_id WHERE i.id=? AND i.org=?').get(m[1],user.org);if(!it)return send(res,404,{error:'No such item'});
  if(!m[2]){
   if(!['Triaged','Dismissed','New'].includes(b.status))return send(res,400,{error:'Status must be Triaged, Dismissed or New.'});
   if(it.status==='Converted')return send(res,409,{error:'This item is already a change record ('+it.converted+').'});
   C.db.prepare('UPDATE reg_items SET status=? WHERE id=?').run(b.status,it.id);
   logA(user.org,it.profile,null,user.name,user.role,'regfeed',it.id,'item '+b.status.toLowerCase(),{title:it.title});return send(res,200,{ok:true,status:b.status})}
  // convert: append a record to the regchg collection through the same op path as browser edits
  const profile=b.profile||it.profile;if(profile!==it.profile||!okProfile(profile))return send(res,400,{error:'Profile does not match this item.'});
  if(it.status==='Converted')return send(res,409,{error:'Already converted to '+it.converted+'.',id:it.converted});
  const doc=C.getDoc(user.org,profile);if(!doc)return send(res,404,{error:'No data for this profile yet'});
  const st=doc.state,arr=st.regchg||[],n=arr.reduce((x,r)=>Math.max(x,+String(r.id).slice(3)||0),0)+1,id='RC-'+String(n).padStart(3,'0');
  let matched=[];try{matched=JSON.parse(it.matched||'[]')}catch{}
  const fws=matched.filter(x=>x.fw),text=((it.title||'')+' '+(it.summary||'')).toLowerCase();
  const words=new Set(text.split(/[^a-z0-9]+/).filter(w=>w.length>=4));
  const obl=(st.obl||[]).filter(o=>fws.some(x=>x.fw===o.fw)).map(o=>({id:o.id,k:String(o.title+' '+o.ref).toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>=4&&words.has(w)).length})).filter(o=>o.k>0).sort((a,b)=>b.k-a.k).slice(0,5).map(o=>o.id);
  const pub=(it.published||it.fetched||'').slice(0,10)||C.today();
  const rec={id,title:String(it.title||'Untitled item').slice(0,300),source:it.feed_name||'Feed',type:guessType(it.title),published:pub,effective:addDays(pub,120),impact:it.score>=70?'High':it.score>=40?'Medium':'Low',status:'New',owner:user.name,fw:(fws.find(x=>(st.obl||[]).some(o=>o.fw===x.fw))||fws[0]||{fw:''}).fw,
   summary:(it.summary||'').slice(0,1500),obligations:obl,
   notes:`From feed "${it.feed_name||'?'}" (relevance ${it.score}/100). Effective date is a placeholder (published + 120 days): confirm from the source.${fws.length?' Matched: '+fws.map(x=>x.code).join(', ')+'.':''}`,link:it.link||'',feedItem:it.id};
  const out=C.applyOps(user.org,profile,user,[{op:'put',p:['regchg'],id,at:arr.length,isNew:true,rec}],'feed');
  if(out.error)return send(res,out.status||500,{error:out.error});
  if(!out.applied.length)return send(res,403,{error:'Your role cannot add regulatory change records.'});
  const fid=(out.renames&&out.renames[id])||id;
  C.db.prepare('UPDATE reg_items SET status=?,converted=? WHERE id=?').run('Converted',fid,it.id);
  logA(user.org,profile,out.rev,user.name,user.role,'regfeed',it.id,'item converted',{title:it.title,record:fid});
  return send(res,200,{ok:true,id:fid,record:{...rec,id:fid}})}
 return send(res,404,{error:'Not found'})}

module.exports={init,route,startScheduler,tick,refreshFeed,parseFeed,fetchFeed,checkUrl,blockedAddress,scoreItem,loadLibrary,MAX_ITEMS,MAX_TEXT,MAX_FEEDS};
