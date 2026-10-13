// Forge GRC server: shared data, sign-in, roles, audit trail, live updates and an ingest API.
// No dependencies. Needs Node 22.13 or later (built-in SQLite).
//   node server/server.js            -> http://localhost:8080  (serves the app and the API)
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const SYNC=require('../sync-core.js');

const PORT=+process.env.PORT||8080,ROOT=path.join(__dirname,'..'),DATA=process.env.FORGE_DATA||path.join(ROOT,'data');
const INGEST_KEY=process.env.FORGE_INGEST_KEY||'dev-ingest-key';
const DEMO_PW=process.env.FORGE_DEMO_PASSWORD||'forge-demo';
const today=()=>process.env.FORGE_TODAY||new Date().toISOString().slice(0,10);
fs.mkdirSync(DATA,{recursive:true});
const db=new DatabaseSync(path.join(DATA,'forge.db'));
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY,v TEXT);
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,org TEXT NOT NULL,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL,salt TEXT NOT NULL,hash TEXT NOT NULL,active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS docs(org TEXT NOT NULL,profile TEXT NOT NULL,rev INTEGER NOT NULL,json TEXT NOT NULL,updated TEXT NOT NULL,PRIMARY KEY(org,profile));
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,ts TEXT NOT NULL,org TEXT NOT NULL,profile TEXT NOT NULL,rev INTEGER,user TEXT NOT NULL,role TEXT,coll TEXT,rec TEXT,action TEXT NOT NULL,detail TEXT);
CREATE INDEX IF NOT EXISTS audit_idx ON audit(org,profile,id);
CREATE TABLE IF NOT EXISTS notes(id INTEGER PRIMARY KEY AUTOINCREMENT,ts TEXT NOT NULL,org TEXT NOT NULL,profile TEXT NOT NULL,kind TEXT NOT NULL,title TEXT NOT NULL,body TEXT,ref TEXT,who TEXT,dedupe TEXT,email_status TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS notes_dedupe ON notes(org,profile,dedupe) WHERE dedupe IS NOT NULL;
CREATE TABLE IF NOT EXISTS note_read(user TEXT NOT NULL,note INTEGER NOT NULL,PRIMARY KEY(user,note));
CREATE TABLE IF NOT EXISTS files(id TEXT PRIMARY KEY,org TEXT NOT NULL,profile TEXT NOT NULL,ref TEXT NOT NULL,name TEXT NOT NULL,size INTEGER,type TEXT,by TEXT,ts TEXT,sha TEXT);`);
try{db.exec('ALTER TABLE users ADD COLUMN must_change INTEGER DEFAULT 0')}catch{}

// ---- secrets and users ----
const meta=k=>{const r=db.prepare('SELECT v FROM meta WHERE k=?').get(k);return r&&r.v};
if(!meta('secret'))db.prepare('INSERT INTO meta VALUES(?,?)').run('secret',process.env.FORGE_SECRET||crypto.randomBytes(32).toString('hex'));
const SECRET=process.env.FORGE_SECRET||meta('secret');
const hashPw=(pw,salt)=>crypto.scryptSync(pw,salt,32).toString('hex');
function addUser(id,org,email,name,role,pw){const salt=crypto.randomBytes(16).toString('hex');db.prepare('INSERT OR IGNORE INTO users(id,org,email,name,role,salt,hash) VALUES(?,?,?,?,?,?,?)').run(id,org,email,name,role,salt,hashPw(pw,salt))}
if(!db.prepare('SELECT 1 FROM users LIMIT 1').get()&&process.env.FORGE_ADMIN_EMAIL){
 const pw=process.env.FORGE_ADMIN_PASSWORD||crypto.randomBytes(9).toString('base64url');
 addUser('admin',process.env.FORGE_ORG||'org',process.env.FORGE_ADMIN_EMAIL.toLowerCase(),process.env.FORGE_ADMIN_NAME||'Administrator','Administrator',pw);db.prepare("UPDATE users SET must_change=1 WHERE id='admin'").run();
 console.log(`Created administrator ${process.env.FORGE_ADMIN_EMAIL}${process.env.FORGE_ADMIN_PASSWORD?'':' with temporary password '+pw}. You must change it at first sign-in.`);
}
if(!db.prepare('SELECT 1 FROM users LIMIT 1').get()){
 [['morgan','Morgan Chen','Administrator'],['jordan','Jordan Lee','Business user'],['priya','Priya Shah','Function user'],['evan','Evan Brooks','Business user'],['sam','Sam Rivera','Function user'],['audrey','Audrey Kim','Auditor']]
  .forEach(([id,name,role])=>addUser(id,'demo',id+'@forge.demo',name,role,DEMO_PW));
 console.log(`Seeded demo users (password "${DEMO_PW}"): morgan, jordan, priya, evan, sam, audrey @forge.demo`);
}

// ---- tokens ----
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const sign=p=>crypto.createHmac('sha256',SECRET).update(p).digest('base64url');
const issue=(u)=>{const p=b64({id:u.id,org:u.org,exp:Date.now()+12*3600e3});return p+'.'+sign(p)};
function verify(tok){if(!tok)return null;const [p,s]=String(tok).split('.');if(!p||!s)return null;const e=sign(p);if(e.length!==s.length||!crypto.timingSafeEqual(Buffer.from(e),Buffer.from(s)))return null;
 let o;try{o=JSON.parse(Buffer.from(p,'base64url').toString())}catch{return null}if(!o||o.exp<Date.now())return null;
 const u=db.prepare('SELECT id,org,email,name,role,must_change FROM users WHERE id=? AND active=1').get(o.id);return u||null}
const authUser=(req,url)=>verify((req.headers.authorization||'').replace(/^Bearer /,'')||url.searchParams.get('token'));

// ---- permissions: what each role may change (enforced here, never in the browser) ----
const COLL_ALL=null;
const RULES={
 'Administrator':{},
 'Business user':{noDelete:true,deny:['appetite','org']},
 'Function user':{noDelete:true,deny:['appetite','policies','vendors','org']},
 'Auditor':{only:['audit','issues','ovr','seq']}
};
function allowed(role,op){const r=RULES[role];if(!r)return false;const top=op.p[0];
 if(r.only)return r.only.includes(top)&&op.op!=='del';
 if(r.deny&&r.deny.includes(top))return false;if(r.noDelete&&(op.op==='del'||op.op==='unset'))return false;return true}

// ---- state ----
const getDoc=(org,profile)=>{const r=db.prepare('SELECT rev,json FROM docs WHERE org=? AND profile=?').get(org,profile);return r?{rev:r.rev,state:JSON.parse(r.json)}:null};
const putDoc=(org,profile,rev,state)=>db.prepare('INSERT INTO docs(org,profile,rev,json,updated) VALUES(?,?,?,?,?) ON CONFLICT(org,profile) DO UPDATE SET rev=excluded.rev,json=excluded.json,updated=excluded.updated').run(org,profile,rev,JSON.stringify(state),new Date().toISOString());
const logA=(org,profile,rev,user,role,coll,rec,action,detail)=>db.prepare('INSERT INTO audit(ts,org,profile,rev,user,role,coll,rec,action,detail) VALUES(?,?,?,?,?,?,?,?,?,?)').run(new Date().toISOString(),org,profile,rev,user,role,coll,rec,action,detail?JSON.stringify(detail):null);
const okProfile=p=>/^[a-z0-9_-]{1,40}$/.test(p||'');

// ---- notifications: in-app, chat webhook, and an email outbox ----
const ROLES_LIST=['Administrator','Business user','Function user','Auditor'];
async function postJson(url,body){const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});return r.ok}
function note(org,profile,n){
 let id;try{const r=db.prepare('INSERT INTO notes(ts,org,profile,kind,title,body,ref,who,dedupe,email_status) VALUES(?,?,?,?,?,?,?,?,?,?)').run(new Date().toISOString(),org,profile,n.kind,n.title,n.body||'',n.ref||null,n.who||null,n.dedupe||null,null);id=Number(r.lastInsertRowid)}catch(e){return null}
 const rec={id,ts:new Date().toISOString(),kind:n.kind,title:n.title,body:n.body||'',ref:n.ref||null,who:n.who||null};
 broadcast(org,profile,{type:'note',note:rec});
 if(process.env.FORGE_WEBHOOK_URL)postJson(process.env.FORGE_WEBHOOK_URL,{text:`*${n.title}* ${n.body||''}`}).catch(()=>{});
 const u=n.who&&db.prepare('SELECT email FROM users WHERE org=? AND name=? AND active=1').get(org,n.who);
 const setSt=v=>db.prepare('UPDATE notes SET email_status=? WHERE id=?').run(v,id);
 if(!n.who)setSt('not sent (everyone)');else if(!u)setSt('no address on file');
 else if(process.env.FORGE_MAIL_WEBHOOK){postJson(process.env.FORGE_MAIL_WEBHOOK,{to:u.email,subject:n.title,text:n.body||n.title}).then(ok=>setSt(ok?'sent':'failed')).catch(()=>setSt('failed'))}
 else setSt('queued (no mail relay configured)');
 return rec}
function onChange(org,profile,op,res,user){
 if(op.p.join('.')==='issues'&&op.op==='put'){const r=op.rec;
  if(r.owner&&r.owner!==user.name&&(res.kind==='create'||(res.before&&res.before.owner!==r.owner)))note(org,profile,{kind:'assigned',title:`Issue ${r.id} assigned to you`,body:`${r.title} (${r.sev}, due ${r.due}) · by ${user.name}`,ref:r.id,who:r.owner})}
 if(op.p.join('.')==='kris'&&op.op==='put'){const k=op.rec,v=k.series[k.series.length-1],pv=res.before&&res.before.series[res.before.series.length-1];
  if(v>=k.red&&!(pv>=k.red))note(org,profile,{kind:'breach',title:`Indicator ${k.id} is in red`,body:`${k.name}: ${v}${k.unit==='%'?'%':''} (red at ${k.red})`,ref:k.id,who:k.owner})}}
function sweep(){ // overdue items, once per day per record
 const t=today();for(const d of db.prepare('SELECT org,profile,json FROM docs').all()){let st;try{st=JSON.parse(d.json)}catch{continue}
  (st.issues||[]).filter(i=>i.status!=='Closed'&&i.due&&i.due<t).forEach(i=>note(d.org,d.profile,{kind:'overdue',title:`Issue ${i.id} is overdue`,body:`${i.title} was due ${i.due}`,ref:i.id,who:i.owner,dedupe:`overdue:${i.id}:${t}`}));
  (st.policies||[]).filter(p=>p.status==='Published'&&p.review&&p.review<t).forEach(p=>note(d.org,d.profile,{kind:'overdue',title:`Policy ${p.id} review is overdue`,body:`${p.title} was due for review ${p.review}`,ref:p.id,who:p.owner,dedupe:`polreview:${p.id}:${t}`}))}}

// ---- live updates (server-sent events) ----
const clients=new Set();
function broadcast(org,profile,msg){const data=`data: ${JSON.stringify(msg)}\n\n`;for(const c of clients)if(c.org===org&&(profile==='*'||c.profile===profile))try{c.res.write(data)}catch{}}

// Apply operations from a user to the stored state. Returns the operations that actually changed something.
function applyOps(org,profile,user,ops,source){
 const doc=getDoc(org,profile);if(!doc)return{error:'No data for this profile yet',status:404};
 const st=doc.state,applied=[],denied=[],renames={};const rev=doc.rev+1;
 for(const raw of ops){
  const op={...raw};if(!Array.isArray(op.p)||!op.p.length||!['put','del','set','unset'].includes(op.op))continue;
  if(!allowed(user.role,op)){denied.push(op);continue}
  // two people creating a record at the same moment can pick the same number: give the newer one the next free number
  if(op.op==='put'&&op.isNew){const arr=SYNC_get(st,op.p);if(arr&&arr.some(x=>x.id===op.id)){const m=/^(.*?)(\d+)$/.exec(op.id);if(m){const used=arr.map(x=>x.id).filter(i=>i.startsWith(m[1])).map(i=>+i.slice(m[1].length)||0);const nid=m[1]+String(Math.max(...used)+1).padStart(m[2].length,'0');renames[op.id]=nid;op.rec={...op.rec,id:nid};op.id=nid}}}
  if(op.op==='put'&&!op.isNew&&Array.isArray(op.ch)){const arr0=SYNC_get(st,op.p),ex=arr0&&arr0.find(x=>x.id===op.id);if(ex){const m={...ex};op.ch.forEach(f=>{if(f in op.rec)m[f]=op.rec[f];else delete m[f]});op.rec=m}}
  const res=SYNC.apply(st,op);if(!res)continue;
  applied.push(op);try{onChange(org,profile,op,res,user)}catch(e){console.error('notify',e.message)}
  const coll=op.p.join('.');
  if(op.op==='put')logA(org,profile,rev,user.name,user.label||user.role,coll,op.id,res.kind==='create'?'created':'updated',res.kind==='create'?{title:op.rec.title||op.rec.name||op.rec.id}:SYNC.fieldChanges(res.before,op.rec));
  else if(op.op==='del')logA(org,profile,rev,user.name,user.label||user.role,coll,op.id,'deleted',{title:(res.before&&(res.before.title||res.before.name))||op.id});
  else logA(org,profile,rev,user.name,user.label||user.role,coll,null,'changed',{from:null,to:op.v===undefined?'removed':String(JSON.stringify(op.v)).slice(0,80)});
 }
 if(applied.length){putDoc(org,profile,rev,st);broadcast(org,profile,{type:'ops',rev,by:{name:user.name,role:user.role,source:source||'user'},ops:applied})}
 return{rev:applied.length?rev:doc.rev,applied,denied,renames,seq:st.seq};
}
function SYNC_get(st,p){let o=st;for(const k of p){if(o==null)return undefined;o=o[k]}return Array.isArray(o)?o:undefined}

// ---- ingest: a source system reports an indicator value ----
function ingestKri(org,profile,body){
 const doc=getDoc(org,profile);if(!doc)return{status:404,error:'No data for this profile yet'};
 const st=doc.state,k=(st.kris||[]).find(x=>x.id===body.id);if(!k)return{status:404,error:'Unknown indicator '+body.id};
 const v=Number(body.value);if(!Number.isFinite(v))return{status:400,error:'value must be a number'};
 const before=k.series[k.series.length-1],wasRed=before>=k.red;
 const nk={...k,series:[...k.series,v].slice(-24)};
 const ops=[{op:'put',p:['kris'],id:k.id,rec:nk,at:st.kris.indexOf(k)}];
 const nowRed=v>=k.red;
 if(nowRed&&!wasRed&&!(st.issues||[]).some(i=>i.source==='KRI breach'&&i.link===k.id&&i.status!=='Closed')){
  const n=(st.seq&&st.seq.issue)||200,id='ISS-'+String(n).padStart(3,'0'),d=new Date(today()+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+21);
  ops.push({op:'put',p:['issues'],id,at:0,isNew:true,rec:{id,title:`${k.name} breached its red threshold`,source:'KRI breach',link:k.id,sev:'High',owner:k.owner,due:d.toISOString().slice(0,10),created:today(),cause:'To be determined',status:'Open',desc:`${body.source||'Source system'} reported ${v}${k.unit||''} against a red threshold of ${k.red}${k.unit||''}.`,verifiedBy:null,actions:[]}});
  ops.push({op:'set',p:['seq','issue'],v:n+1});
 }
 const sys={name:body.source||'Source system',role:'Integration'};
 const out=applyOps(org,profile,{role:'Administrator',label:'Integration',name:sys.name},ops,'integration');
 return{status:200,rev:out.rev,value:v,status_after:v>=k.red?'Red':v>=k.amber?'Amber':'Green',issue_raised:ops.length>1};
}

// ---- http ----
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.md':'text/markdown'};
const send=(res,code,obj)=>{const b=JSON.stringify(obj);res.writeHead(code,{'content-type':'application/json','cache-control':'no-store'});res.end(b)};
const readBody=req=>new Promise((ok,no)=>{let b='';req.on('data',c=>{b+=c;if(b.length>20e6){no(new Error('too large'));req.destroy()}});req.on('end',()=>{try{ok(b?JSON.parse(b):{})}catch(e){no(e)}});req.on('error',no)});
const attempts=new Map(),lockouts=new Map();
const readRaw=(req,max)=>new Promise((ok,no)=>{const c=[];let n=0;req.on('data',d=>{n+=d.length;if(n>max){no(new Error('too large'));req.destroy()}else c.push(d)});req.on('end',()=>ok(Buffer.concat(c)));req.on('error',no)});
const COMMON=['password','password1','welcome123','letmein123','qwerty12345','forge-demo','changeme123'];
function pwProblem(pw,u){if(typeof pw!=='string'||pw.length<10)return 'Use at least 10 characters.';if(!/[A-Za-z]/.test(pw)||!/[^A-Za-z]/.test(pw))return 'Mix letters with numbers or symbols.';if(COMMON.includes(pw.toLowerCase()))return 'That password is too common.';if(u&&(pw.toLowerCase().includes(u.email.split('@')[0])))return 'Do not use your name or email in the password.';return ''}
const tempPw=()=>crypto.randomBytes(9).toString('base64url');
const FILE_OK=new Set(['pdf','png','jpg','jpeg','docx','xlsx','csv','txt','pptx','msg','eml']);
const FILES_DIR=path.join(DATA,'files');

async function api(req,res,url){
 const p=url.pathname;
 if(p==='/api/health')return send(res,200,{ok:true,name:'Forge GRC',version:1,hint:process.env.FORGE_SHOW_DEMO_LOGINS!=='0'?`Demo accounts: morgan@forge.demo (administrator), jordan@, priya@, evan@, sam@, audrey@ (auditor) · password ${DEMO_PW}`:''});
 if(p==='/api/login'&&req.method==='POST'){
  const ip=req.socket.remoteAddress,a=attempts.get(ip)||{n:0,t:Date.now()};if(Date.now()-a.t>6e5){a.n=0;a.t=Date.now()}if(a.n>=20)return send(res,429,{error:'Too many attempts. Try again in a few minutes.'});
  const b=await readBody(req),em=String(b.email||'').toLowerCase().trim(),lk=lockouts.get(em)||{n:0,t:Date.now()};
  if(Date.now()-lk.t>15*60e3){lk.n=0;lk.t=Date.now()}
  if(lk.n>=5)return send(res,429,{error:'This account is locked for 15 minutes after repeated failed sign-ins.'});
  const u=db.prepare('SELECT * FROM users WHERE email=? AND active=1').get(em);
  const good=u&&crypto.timingSafeEqual(Buffer.from(hashPw(String(b.password||''),u.salt)),Buffer.from(u.hash));
  if(!good){a.n++;attempts.set(ip,a);lk.n++;lockouts.set(em,lk);if(u)logA(u.org,'-',null,u.name,u.role,'session',null,'failed sign-in',null);return send(res,401,{error:'Email or password is not correct.'})}
  lockouts.delete(em);
  logA(u.org,'-',null,u.name,u.role,'session',null,'signed in',null);
  return send(res,200,{token:issue(u),mustChange:!!u.must_change,user:{id:u.id,name:u.name,role:u.role,org:u.org,email:u.email}});
 }
 if(p==='/api/ingest/kri'&&req.method==='POST'){
  if(req.headers['x-api-key']!==INGEST_KEY)return send(res,401,{error:'Invalid API key'});
  const b=await readBody(req),profile=b.profile||'manufacturing';if(!okProfile(profile))return send(res,400,{error:'Bad profile'});
  const r=ingestKri(b.org||'demo',profile,b);return send(res,r.status,r);
 }
 const user=authUser(req,url);if(!user)return send(res,401,{error:'Sign in required'});
 const profile=url.searchParams.get('profile')||'';
 if(user.must_change&&p!=='/api/me'&&p!=='/api/password')return send(res,403,{error:'Choose a new password first.',code:'must_change'});
 if(p==='/api/me')return send(res,200,{user,mustChange:!!user.must_change});
 if(p==='/api/password'&&req.method==='POST'){
  const b=await readBody(req),row=db.prepare('SELECT * FROM users WHERE id=?').get(user.id);
  if(!crypto.timingSafeEqual(Buffer.from(hashPw(String(b.current||''),row.salt)),Buffer.from(row.hash)))return send(res,400,{error:'Current password is not correct.'});
  const pr=pwProblem(b.next,user);if(pr)return send(res,400,{error:pr});if(b.next===b.current)return send(res,400,{error:'Choose a different password.'});
  const salt=crypto.randomBytes(16).toString('hex');db.prepare('UPDATE users SET salt=?,hash=?,must_change=0 WHERE id=?').run(salt,hashPw(b.next,salt),user.id);logA(user.org,'-',null,user.name,user.role,'session',null,'password changed',null);return send(res,200,{ok:true});
 }
 if(p==='/api/people'&&req.method==='GET')return send(res,200,{people:db.prepare('SELECT id,name,role,active FROM users WHERE org=? ORDER BY name').all(user.org)});
 if(p.startsWith('/api/users')){
  if(user.role!=='Administrator')return send(res,403,{error:'Only an administrator can manage users.'});
  if(p==='/api/users'&&req.method==='GET')return send(res,200,{users:db.prepare('SELECT id,name,email,role,active,must_change FROM users WHERE org=? ORDER BY name').all(user.org),roles:ROLES_LIST});
  if(p==='/api/users'&&req.method==='POST'){
   const b=await readBody(req),email=String(b.email||'').toLowerCase().trim(),name=String(b.name||'').trim();
   if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||name.length<2)return send(res,400,{error:'Enter a name and a valid email address.'});
   if(!ROLES_LIST.includes(b.role))return send(res,400,{error:'Choose a role.'});
   if(db.prepare('SELECT 1 FROM users WHERE email=?').get(email))return send(res,409,{error:'That email already has an account.'});
   if(db.prepare('SELECT 1 FROM users WHERE org=? AND name=?').get(user.org,name))return send(res,409,{error:'Someone with that name already exists. Names identify record owners, so make it unique.'});
   const id=email.split('@')[0].replace(/[^a-z0-9]/g,'').slice(0,20)+crypto.randomBytes(2).toString('hex'),pw=tempPw();addUser(id,user.org,email,name,b.role,pw);db.prepare('UPDATE users SET must_change=1 WHERE id=?').run(id);
   logA(user.org,'-',null,user.name,user.role,'users',id,'created',{name,role:b.role});broadcast(user.org,'*',{type:'people'});return send(res,200,{id,tempPassword:pw});
  }
  const m=/^\/api\/users\/([a-z0-9]+)(\/reset)?$/.exec(p);
  if(m){const t=db.prepare('SELECT * FROM users WHERE id=? AND org=?').get(m[1],user.org);if(!t)return send(res,404,{error:'No such user'});
   if(m[2]&&req.method==='POST'){const pw=tempPw(),salt=crypto.randomBytes(16).toString('hex');db.prepare('UPDATE users SET salt=?,hash=?,must_change=1 WHERE id=?').run(salt,hashPw(pw,salt),t.id);logA(user.org,'-',null,user.name,user.role,'users',t.id,'password reset',{name:t.name});return send(res,200,{tempPassword:pw})}
   if(req.method==='PATCH'){const b=await readBody(req),nr=b.role===undefined?t.role:b.role,na=b.active===undefined?t.active:(b.active?1:0);
    if(!ROLES_LIST.includes(nr))return send(res,400,{error:'Unknown role'});
    const admins=db.prepare("SELECT COUNT(*) c FROM users WHERE org=? AND role='Administrator' AND active=1 AND id<>?").get(user.org,t.id).c;
    if((t.role==='Administrator'&&(nr!=='Administrator'||!na))&&admins===0)return send(res,400,{error:'There must be at least one active administrator.'});
    db.prepare('UPDATE users SET role=?,active=? WHERE id=?').run(nr,na,t.id);logA(user.org,'-',null,user.name,user.role,'users',t.id,'updated',[{field:'role',from:t.role,to:nr},{field:'active',from:String(t.active),to:String(na)}]);
    broadcast(user.org,'*',{type:'people'});return send(res,200,{ok:true})}}
  return send(res,404,{error:'Not found'});
 }
 if(p==='/api/notifications'&&req.method==='GET'){
  const rows=db.prepare('SELECT n.*,(SELECT 1 FROM note_read r WHERE r.user=? AND r.note=n.id) AS seen FROM notes n WHERE n.org=? AND n.profile=? AND (n.who IS NULL OR n.who=? OR ?=\'Administrator\') ORDER BY n.id DESC LIMIT 100').all(user.id,user.org,profile,user.name,user.role);
  return send(res,200,{rows:rows.map(r=>({id:r.id,ts:r.ts,kind:r.kind,title:r.title,body:r.body,ref:r.ref,who:r.who,seen:!!r.seen,email:r.email_status}))});
 }
 if(p==='/api/notifications/read'&&req.method==='POST'){const b=await readBody(req);const ids=Array.isArray(b.ids)?b.ids:[];const ins=db.prepare('INSERT OR IGNORE INTO note_read VALUES(?,?)');ids.slice(0,200).forEach(i=>ins.run(user.id,+i));return send(res,200,{ok:true})}
 if(p==='/api/files'&&req.method==='POST'){
  if(user.role==='Auditor'&&false)return send(res,403,{error:'Not permitted'});
  if(!okProfile(profile))return send(res,400,{error:'Bad profile'});
  const ref=(url.searchParams.get('ref')||'').slice(0,40),name=path.basename(url.searchParams.get('name')||'').replace(/[^\w.\- ()]/g,'_').slice(0,120),ext=path.extname(name).slice(1).toLowerCase();
  if(!ref||!name)return send(res,400,{error:'Name and record are required'});if(!FILE_OK.has(ext))return send(res,400,{error:'This file type is not accepted. Allowed: '+[...FILE_OK].join(', ')});
  let buf;try{buf=await readRaw(req,10*1024*1024)}catch{return send(res,413,{error:'Files can be up to 10 MB.'})}if(!buf.length)return send(res,400,{error:'The file is empty.'});
  const id=crypto.randomUUID(),dir=path.join(FILES_DIR,user.org);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,id),buf);
  const sha=crypto.createHash('sha256').update(buf).digest('hex');db.prepare('INSERT INTO files VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,user.org,profile,ref,name,buf.length,ext,user.name,new Date().toISOString(),sha);
  logA(user.org,profile,null,user.name,user.role,'files',ref,'file added',{title:name,sha256:sha.slice(0,16)});broadcast(user.org,profile,{type:'files',ref});return send(res,200,{id,name,size:buf.length});
 }
 if(p==='/api/files'&&req.method==='GET'){const ref=url.searchParams.get('ref')||'';return send(res,200,{files:db.prepare('SELECT id,name,size,type,by,ts,sha FROM files WHERE org=? AND profile=? AND ref=? ORDER BY ts DESC').all(user.org,profile,ref)})}
 const fm=/^\/api\/files\/([0-9a-f-]{36})$/.exec(p);
 if(fm){const f=db.prepare('SELECT * FROM files WHERE id=? AND org=?').get(fm[1],user.org);if(!f)return send(res,404,{error:'No such file'});
  if(req.method==='DELETE'){if(user.role==='Auditor'||user.role==='Function user')return send(res,403,{error:'Not permitted'});try{fs.unlinkSync(path.join(FILES_DIR,user.org,f.id))}catch{}db.prepare('DELETE FROM files WHERE id=?').run(f.id);logA(user.org,f.profile,null,user.name,user.role,'files',f.ref,'file removed',{title:f.name});broadcast(user.org,f.profile,{type:'files',ref:f.ref});return send(res,200,{ok:true})}
  logA(user.org,f.profile,null,user.name,user.role,'files',f.ref,'file opened',{title:f.name});
  res.writeHead(200,{'content-type':'application/octet-stream','content-disposition':'attachment; filename="'+f.name.replace(/"/g,'')+'"','x-content-type-options':'nosniff','cache-control':'no-store'});return fs.createReadStream(path.join(FILES_DIR,user.org,f.id)).pipe(res)}
 if(p==='/api/state'&&req.method==='GET'){if(!okProfile(profile))return send(res,400,{error:'Bad profile'});const d=getDoc(user.org,profile);return send(res,200,d?{rev:d.rev,state:d.state}:{rev:0,state:null})}
 if(p==='/api/init'&&req.method==='POST'){
  const b=await readBody(req);if(!okProfile(b.profile))return send(res,400,{error:'Bad profile'});
  if(user.role!=='Administrator'&&user.role!=='Business user')return send(res,403,{error:'Ask an administrator to start this workspace.'});
  const ex=getDoc(user.org,b.profile);if(ex)return send(res,200,{rev:ex.rev,state:ex.state});
  if(!b.state||typeof b.state!=='object')return send(res,400,{error:'state required'});
  delete b.state.log;putDoc(user.org,b.profile,1,b.state);logA(user.org,b.profile,1,user.name,user.role,'workspace',null,'created',{profile:b.profile});return send(res,200,{rev:1,state:b.state});
 }
 if(p==='/api/ops'&&req.method==='POST'){
  const b=await readBody(req);if(!okProfile(b.profile))return send(res,400,{error:'Bad profile'});if(!Array.isArray(b.ops))return send(res,400,{error:'ops required'});
  const r=applyOps(user.org,b.profile,user,b.ops.slice(0,2000));if(r.error)return send(res,r.status,{error:r.error});
  return send(res,r.denied.length?207:200,{rev:r.rev,renames:r.renames,seq:r.seq,denied:r.denied.length,deniedPaths:[...new Set(r.denied.map(o=>o.p.join('.')))]});
 }
 if(p==='/api/audit'&&req.method==='GET'){
  if(!okProfile(profile))return send(res,400,{error:'Bad profile'});
  const lim=Math.min(+url.searchParams.get('limit')||200,1000),q=(url.searchParams.get('q')||'').toLowerCase();
  let rows=db.prepare('SELECT id,ts,user,role,coll,rec,action,detail,rev FROM audit WHERE org=? AND (profile=? OR profile=\'-\') ORDER BY id DESC LIMIT ?').all(user.org,profile,lim*(q?5:1)).map(r=>({...r,detail:r.detail?JSON.parse(r.detail):null}));
  if(q)rows=rows.filter(r=>(r.user+' '+r.coll+' '+r.rec+' '+r.action+' '+JSON.stringify(r.detail)).toLowerCase().includes(q)).slice(0,lim);
  return send(res,200,{rows});
 }
 if(p==='/api/events'){
  if(!okProfile(profile))return send(res,400,{error:'Bad profile'});
  res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-store',connection:'keep-alive'});res.write('retry: 2000\n\n');
  const c={res,org:user.org,profile};clients.add(c);const ping=setInterval(()=>{try{res.write(': ping\n\n')}catch{}},25000);
  req.on('close',()=>{clearInterval(ping);clients.delete(c)});return;
 }
 return send(res,404,{error:'Not found'});
}

function serveStatic(req,res,url){
 let rel=decodeURIComponent(url.pathname);if(rel==='/')rel='/index.html';
 const f=path.normalize(path.join(ROOT,rel));
 const blocked=/(^|[\\/])(server|data|node_modules|\.git[^\\/]*|\.github)([\\/]|$)/.test(path.relative(ROOT,f))||path.basename(f).startsWith('.');
 if(!f.startsWith(ROOT)||blocked||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('Not found')}
 res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream','cache-control':'no-cache'});fs.createReadStream(f).pipe(res);
}

const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://x');
 res.setHeader('x-content-type-options','nosniff');res.setHeader('referrer-policy','same-origin');res.setHeader('x-frame-options','DENY');res.setHeader('permissions-policy','camera=(),microphone=(),geolocation=()');
 if(process.env.FORGE_HSTS==='1')res.setHeader('strict-transport-security','max-age=31536000; includeSubDomains');
 res.setHeader('content-security-policy',"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
 if(url.pathname.startsWith('/api/'))return api(req,res,url).catch(e=>{console.error(e);try{send(res,500,{error:'Server error'})}catch{}});
 serveStatic(req,res,url);
});
function backup(){try{const dir=path.join(DATA,'backups');fs.mkdirSync(dir,{recursive:true});const f=path.join(dir,'forge-'+new Date().toISOString().replace(/[:.]/g,'-')+'.db');db.exec(`VACUUM INTO '${f.replace(/'/g,"''")}'`);
 fs.readdirSync(dir).filter(x=>x.endsWith('.db')).sort().slice(0,-14).forEach(x=>fs.unlinkSync(path.join(dir,x)));return f}catch(e){console.error('backup failed',e.message)}}
if(require.main===module){setTimeout(sweep,4000);setInterval(sweep,3600e3);if(process.env.FORGE_BACKUP!=='0'){setTimeout(backup,8000);setInterval(backup,24*3600e3)}}
if(require.main===module)server.listen(PORT,()=>console.log(`Forge GRC running at http://localhost:${PORT}  (data: ${DATA})`));
module.exports={server,db,backup,sweep};
