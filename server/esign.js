// E-signature server side: signing links for people outside the organisation, the public signing endpoints,
// and a server-side gate on the shared signature-request records.
//
//   POST /api/sign/issue   staff (signed in): create a signing link for one external signer of a request
//   GET  /api/sign/info    public, by token: what the signer needs to see before signing
//   GET  /api/sign/file    public, by token: the exact stored document (only on the signer's turn)
//   POST /api/sign/submit  public, by token: sign or decline
//
// LEGAL LIMITS. This is a simple electronic signature with an audit trail. It is not an Aadhaar eSign, a digital
// signature certificate or a qualified signature, and it does not by itself prove who the signer is: anyone who
// holds the link can sign as that person. Whether it is legally sufficient depends on the document type and law.
//
// Tokens: 32 random bytes (base64url), stored only as a SHA-256 hash, valid until the request due date plus one day,
// one submission each. Issuing a new link revokes the older ones for that signer.
//
// The hashing below must stay byte-for-byte identical to esign-core.js (sigHash, sealHash); server/test-esign.js
// loads the browser code and compares the two on fixed inputs.
'use strict';
const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const MAIL=require('./mail.js');

const PORTAL_LABEL='Signing portal';
const LEGAL='Simple electronic signature with an audit trail. It is not an Aadhaar eSign, a digital signature certificate or a qualified signature, and it does not by itself prove the signer\'s identity. Confirm it is legally sufficient for this document, or use a licensed provider.';
const CONSENT='I have read this document and I agree to sign it electronically.';
const GENERIC='This link is not valid or has expired. Ask the person who sent it for a new one.';

const sha256hex=x=>crypto.createHash('sha256').update(typeof x==='string'?Buffer.from(x,'utf8'):x).digest('hex');
// ---- the same canonical strings as esign-core.js ----
const sigHash=(r,s)=>sha256hex([r.docSha,r.id,s.id,s.name,s.email||'',s.ts,s.method,s.typed||'',s.imageSha||''].join('|'));
const sealHash=r=>sha256hex(r.docSha+'|'+r.id+'|'+r.signers.filter(s=>s.status==='Signed').sort((a,b)=>a.ts<b.ts?-1:1).map(s=>`${s.name}:${s.ts}:${s.sigHash}`).join(';'));
const normName=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
const PNG_RE=/^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
function imageProblem(image){
 if(typeof image!=='string'||!PNG_RE.test(image)||image.length<400)return 'Draw your signature in the box.';
 if(image.length>=60000)return 'The drawn signature is too large. Clear it and sign again.';
 const head=Buffer.from(image.slice(22,60),'base64');if(!(head[0]===0x89&&head[1]===0x50&&head[2]===0x4e&&head[3]===0x47))return 'The drawn signature is not a valid image.';
 return ''}
// same rule as esign-core.js pendingNow
function pendingNow(r){if(r.status!=='Out for signature')return[];const p=r.signers.filter(s=>s.status==='Pending');if(r.order==='Parallel')return p;const m=Math.min(...p.map(s=>s.order));return p.filter(s=>s.order===m)}

let C=null,db=null;
const rate=new Map(),bad=new Map();
function init(ctx){
 C=ctx;db=ctx.db;
 db.exec('CREATE TABLE IF NOT EXISTS sign_tokens(token_hash TEXT PRIMARY KEY,org TEXT NOT NULL,profile TEXT NOT NULL,req_id TEXT NOT NULL,signer_id TEXT NOT NULL,expires TEXT NOT NULL,created TEXT NOT NULL,used INTEGER DEFAULT 0)');
}
const addDaysISO=(iso,n)=>{const d=new Date(iso+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
// behind a reverse proxy set FORGE_TRUST_PROXY=1 so the address in the audit trail is the signer's, not the proxy's
function clientIp(req){if(process.env.FORGE_TRUST_PROXY==='1'){const x=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();if(x)return x.slice(0,64)}return String(req.socket.remoteAddress||'?').slice(0,64)}
const clientUa=req=>String(req.headers['user-agent']||'').replace(/[\r\n]/g,' ').slice(0,200);

function find(token){
 if(typeof token!=='string'||token.length<30||token.length>200)return null;
 const r=db.prepare('SELECT * FROM sign_tokens WHERE token_hash=?').get(sha256hex(token));
 if(!r||r.expires<C.today())return null;return r}

// ---------------------------------------------------------------- issue (staff)
async function issue(req,res,user){
 const send=C.send;
 if(user.role==='Auditor'||user.role==='Function user')return send(res,403,{error:'Not permitted'});
 let b;try{b=await C.readBody(req)}catch{return send(res,400,{error:'Bad request'})}
 if(!C.okProfile(b.profile))return send(res,400,{error:'Bad profile'});
 const doc=C.getDoc(user.org,b.profile),rec=doc&&(doc.state.esReq||[]).find(x=>x.id===b.req);
 if(!rec)return send(res,404,{error:'This request has not reached the server yet. Try again in a moment.'});
 if(rec.createdBy!==user.name&&user.role!=='Administrator')return send(res,403,{error:'Only the requester or an administrator can create a signing link.'});
 if(rec.status!=='Out for signature')return send(res,409,{error:rec.status==='Draft'?'Send the request first.':'This request is '+String(rec.status).toLowerCase()+'.'});
 const s=rec.signers.find(x=>x.id===b.signer);
 if(!s)return send(res,404,{error:'No such signer on this request.'});
 if(s.internal)return send(res,400,{error:'This person signs inside the app.'});
 if(s.status!=='Pending')return send(res,409,{error:'This signer has already responded.'});
 const exp=addDaysISO(String(rec.due||C.today()).slice(0,10),1);
 if(exp<C.today())return send(res,409,{error:'The due date has passed. Cancel this request and send a new one.'});
 db.prepare('DELETE FROM sign_tokens WHERE org=? AND profile=? AND req_id=? AND signer_id=?').run(user.org,b.profile,rec.id,s.id);
 const token=crypto.randomBytes(32).toString('base64url');
 db.prepare('INSERT INTO sign_tokens VALUES(?,?,?,?,?,?,?,0)').run(sha256hex(token),user.org,b.profile,rec.id,s.id,exp,new Date().toISOString());
 const url='/sign.html?t='+token;let emailed='not requested';
 if(b.email){
  if(!s.email)emailed='no address';
  else if(!MAIL.configured())emailed='email is not set up';
  else{
   const base=(process.env.FORGE_PUBLIC_URL||('http://'+(req.headers.host||'localhost'))).replace(/\/$/,'');
   try{await MAIL.send({to:s.email,subject:'Signature requested: '+rec.title,text:`${user.name} has asked you to review and sign "${rec.title}".\n\n${rec.message?rec.message+'\n\n':''}Open this private link (valid until ${exp}):\n${base}${url}\n\nThe link is personal to you. Do not forward it.\n\n${LEGAL}`});emailed='sent'}
   catch(e){console.error('sign mail failed:',e.message);emailed='failed'}}}
 C.logA(user.org,b.profile,null,user.name,user.role,'esReq',rec.id,'signing link issued',{signer:s.name,expires:exp,emailed});
 return send(res,200,{token,url,expires:exp,emailed})}

// ---------------------------------------------------------------- public (by token)
function limited(req,res,isBad){
 const ip=clientIp(req),hr=Math.floor(Date.now()/3600e3),k=sha256hex(ip+'|'+hr);
 const n=(rate.get(k)||0)+1;rate.set(k,n);if(rate.size>5000)rate.clear();
 if(n>200){C.send(res,429,{error:'Too many requests. Try again later.'});return true}
 if(isBad){const m=(bad.get(k)||0)+1;bad.set(k,m);if(bad.size>5000)bad.clear();if(m>30){C.send(res,429,{error:'Too many requests. Try again later.'});return true}}
 return false}
function situation(t,rec,s){
 if(s.status!=='Pending'||t.used)return{turn:'done'};
 if(rec.status!=='Out for signature')return{turn:'closed',reason:'This request is '+String(rec.status).toLowerCase()+'.'};
 const p=pendingNow(rec);if(p.some(x=>x.id===s.id))return{turn:'ready'};
 return{turn:'waiting',waitingFor:p.map(x=>x.name)}}
function loadDoc(st,rec){const d=(st.dmsDocs||[]).find(x=>x.id===rec.doc),v=d&&(d.versions||[]).find(x=>x.n===rec.ver);return d&&v?{d,v}:null}
// read the stored bytes and check them against the checksum recorded when signing was requested
function readStored(t,rec,dv){
 if(!dv.v.fileId)return{error:'This document is not available.',status:404};
 const row=db.prepare('SELECT * FROM files WHERE id=? AND org=?').get(dv.v.fileId,t.org);if(!row)return{error:'This document is not available.',status:404};
 let buf;try{buf=fs.readFileSync(path.join(C.dataDir,'files',t.org,row.id))}catch{return{error:'This document is not available.',status:404}}
 const sha=sha256hex(buf);
 if(sha!==rec.docSha||(dv.v.sha&&dv.v.sha!==sha))return{error:'The stored document no longer matches the version that was sent for signature, so it cannot be shown or signed. Contact '+(rec.createdBy||'the sender')+'.',status:409,mismatch:true};
 return{buf,row,sha}}

async function publicRoute(req,res,url,p){
 const send=C.send;
 if(limited(req,res,false))return;
 let b={};
 if(req.method==='POST'){try{b=await C.readBody(req)}catch{return send(res,400,{error:'Bad request'})}}
 const t=find(req.method==='POST'?b.t:url.searchParams.get('t'));
 if(!t){if(limited(req,res,true))return;return send(res,404,{error:GENERIC})}
 const doc=C.getDoc(t.org,t.profile);if(!doc)return send(res,404,{error:GENERIC});
 const rec=(doc.state.esReq||[]).find(x=>x.id===t.req_id),s=rec&&rec.signers.find(x=>x.id===t.signer_id);
 if(!rec||!s)return send(res,404,{error:GENERIC});
 const dv=loadDoc(doc.state,rec),sit=situation(t,rec,s);
 const actor='External signer: '+s.name,sys={role:'Administrator',label:PORTAL_LABEL,name:actor};

 if(p==='/api/sign/info'&&req.method==='GET'){
  const out={ok:true,turn:sit.turn,reason:sit.reason||'',waitingFor:sit.waitingFor||[],legal:LEGAL,consent:CONSENT,
   request:{id:rec.id,title:rec.title,message:rec.message||'',purpose:rec.purpose,order:rec.order,due:rec.due,status:rec.status,requestedBy:rec.createdBy},
   signer:{name:s.name,role:s.role,status:s.status},
   doc:dv?{title:dv.d.title,name:dv.v.name,size:dv.v.size,type:dv.v.mime,sha256:rec.docSha,ver:rec.ver}:null};
  return send(res,200,out)}

 if(p==='/api/sign/file'&&req.method==='GET'){
  if(sit.turn!=='ready')return send(res,409,{error:sit.turn==='waiting'?'It is not your turn to sign yet.':'This document is no longer available through this link.'});
  if(!dv)return send(res,404,{error:'This document is not available.'});
  const f=readStored(t,rec,dv);if(f.error)return send(res,f.status,{error:f.error});
  C.logA(t.org,t.profile,null,actor,PORTAL_LABEL,'esReq',rec.id,'document downloaded',{signer:s.name,ip:clientIp(req),userAgent:clientUa(req),sha256:f.sha.slice(0,16)});
  res.writeHead(200,{'content-type':'application/octet-stream','content-disposition':'attachment; filename="'+String(dv.v.name||'document').replace(/[^\w.\- ()]/g,'_')+'"','content-length':f.buf.length,'x-content-type-options':'nosniff','cache-control':'no-store'});
  return res.end(f.buf)}

 if(p==='/api/sign/submit'&&req.method==='POST'){
  const ip=clientIp(req),ua=clientUa(req);
  if(t.used||s.status!=='Pending')return send(res,409,{error:'You have already responded to this request. This link cannot be used again.'});
  if(rec.status!=='Out for signature')return send(res,409,{error:'This request is '+String(rec.status).toLowerCase()+'. It can no longer be signed.'});
  if(sit.turn==='waiting')return send(res,409,{error:'It is not your turn to sign yet. Waiting for '+sit.waitingFor.join(', ')+'.'});
  const action=b.action;
  const apply=(newRec,docPatch)=>{
   const idx=doc.state.esReq.indexOf(rec),ops=[{op:'put',p:['esReq'],id:rec.id,at:idx,ch:['signers','status','events','seal','completedAt'],rec:newRec}];
   if(docPatch&&dv)ops.push({op:'put',p:['dmsDocs'],id:dv.d.id,at:doc.state.dmsDocs.indexOf(dv.d),ch:Object.keys(docPatch),rec:{...dv.d,...docPatch}});
   const out=C.applyOps(t.org,t.profile,sys,ops,'portal');
   if(out.error||!out.applied||!out.applied.length)return false;
   db.prepare('UPDATE sign_tokens SET used=1 WHERE token_hash=?').run(t.token_hash);return true};

  if(action==='decline'){
   const reason=String(b.reason||'').trim().slice(0,300);if(reason.length<3)return send(res,400,{error:'Give a reason for declining.'});
   const ts=new Date().toISOString();
   const nr={...rec,status:'Declined',signers:rec.signers.map(x=>x.id===s.id?{...x,status:'Declined',ts,reason}:x),events:[...rec.events,{ts,by:actor,action:'declined',detail:`${s.name}: ${reason}`}]};
   const patch=dv&&dv.d.status==='In review'?{status:'Draft'}:null;
   if(!apply(nr,patch))return send(res,500,{error:'Could not record your response. Try again.'});
   C.logA(t.org,t.profile,null,actor,PORTAL_LABEL,'esReq',rec.id,'declined by external signer',{signer:s.name,reason,ip,userAgent:ua});
   if(rec.createdBy)C.note(t.org,t.profile,{kind:'approval',title:`${s.name} declined to sign ${rec.id}`,body:`${rec.title}: ${reason}`,ref:rec.id,who:rec.createdBy,dedupe:`esign:${rec.id}:${s.id}:declined`});
   return send(res,200,{ok:true,message:'Your response has been recorded. The sender has been told that you declined.'})}

  if(action!=='sign')return send(res,400,{error:'Bad request'});
  if(b.consent!==true)return send(res,400,{error:'Tick the box to confirm you agree to sign electronically.'});
  const method=b.method==='drawn'?'drawn':'typed';let typed='',image='',imageSha='';
  if(method==='typed'){typed=String(b.typed||'').trim().slice(0,120);if(typed.length<2)return send(res,400,{error:'Type your full name to sign.'});if(normName(typed)!==normName(s.name))return send(res,400,{error:'Type your name exactly as shown: '+s.name+'.'})}
  else{image=b.image;const pr=imageProblem(image);if(pr)return send(res,400,{error:pr});imageSha=sha256hex(image)}
  if(!dv)return send(res,404,{error:'This document is not available.'});
  const f=readStored(t,rec,dv);
  if(f.error){
   C.logA(t.org,t.profile,null,actor,PORTAL_LABEL,'esReq',rec.id,'signature refused',{signer:s.name,reason:'stored document does not match the recorded checksum',ip,userAgent:ua});
   if(f.mismatch&&rec.createdBy)C.note(t.org,t.profile,{kind:'approval',title:`Signature on ${rec.id} refused: document changed`,body:`${s.name} tried to sign but the stored file no longer matches its checksum.`,ref:rec.id,who:rec.createdBy,dedupe:`esign:${rec.id}:${s.id}:mismatch:${Date.now()}`});
   return send(res,f.status===404?404:409,{error:f.error})}
  const ts=new Date().toISOString();
  const signed={...s,status:'Signed',ts,method,typed,image,imageSha};signed.sigHash=sigHash(rec,signed);
  const nr={...rec,signers:rec.signers.map(x=>x.id===s.id?signed:x),events:[...rec.events,{ts,by:actor,action:'signed',detail:`${s.name} (${s.role}) ${method}`}]};
  let docPatch=null;
  if(!nr.signers.some(x=>x.status==='Pending')){
   const at=new Date().toISOString();nr.status='Completed';nr.completedAt=at;nr.seal={ts:at,sha:sealHash(nr)};nr.events.push({ts:at,by:actor,action:'completed',detail:'Sealed '+nr.seal.sha.slice(0,16)});
   docPatch={sig:{req:rec.id,ts:at,seal:nr.seal.sha,ver:rec.ver},modified:C.today()};
   if(rec.purpose==='Approval'&&(dv.d.status==='Draft'||dv.d.status==='In review'))docPatch.status='Approved'}
  if(!apply(nr,docPatch))return send(res,500,{error:'Could not record your signature. Try again.'});
  C.logA(t.org,t.profile,null,actor,PORTAL_LABEL,'esReq',rec.id,'signed by external signer',{signer:s.name,method,sha256:rec.docSha.slice(0,16),sigHash:signed.sigHash.slice(0,16),ip,userAgent:ua});
  if(nr.status==='Completed')C.logA(t.org,t.profile,null,actor,PORTAL_LABEL,'esReq',rec.id,'completed',{seal:nr.seal.sha.slice(0,16),document:rec.doc});
  if(rec.createdBy)C.note(t.org,t.profile,{kind:'approval',title:nr.status==='Completed'?`${rec.id} is fully signed`:`${s.name} signed ${rec.id}`,body:`${rec.title}${nr.status==='Completed'?' · sealed and locked in Documents':''}`,ref:rec.id,who:rec.createdBy,dedupe:`esign:${rec.id}:${s.id}:signed`});
  if(nr.status!=='Completed')pendingNow(nr).filter(x=>x.internal&&x.name!==rec.createdBy).forEach(x=>C.note(t.org,t.profile,{kind:'approval',title:`${rec.id} needs your signature`,body:`${rec.title} · ${s.name} has signed`,ref:rec.id,who:x.name,dedupe:`esign:${rec.id}:${x.id}:turn`}));
  return send(res,200,{ok:true,completed:nr.status==='Completed',message:nr.status==='Completed'?'Thank you. Your signature is recorded and the document is now fully signed.':'Thank you. Your signature is recorded.',signedAt:ts,sigHash:signed.sigHash})}
 return send(res,405,{error:'Method not allowed'})}

// ---------------------------------------------------------------- gate on the shared records
// Applied to every change made through /api/ops (never to the signing portal itself). Returns true to DENY.
// It keeps signatures honest even though the browser holds the records: nobody can sign, decline or edit for someone
// else, an external signer's entry can only be written by the portal, sealed fields cannot change, history only grows,
// and every signature record must recompute to its own hash.
function gate(st,op,user,today){
 if(!op.p||op.p[0]!=='esReq'||op.p.length!==1)return false;
 if(user.label===PORTAL_LABEL)return false;
 const arr=Array.isArray(st.esReq)?st.esReq:[];
 if(op.op==='set')return !(Array.isArray(op.v)&&op.v.length===0&&arr.length===0);
 if(op.op==='unset')return arr.length>0;
 const ex=arr.find(x=>x.id===op.id);
 if(op.op==='del')return !(ex&&user.role==='Administrator'&&ex.status!=='Completed'&&!ex.signers.some(s=>s.status==='Signed'));
 if(op.op!=='put'||!op.rec||typeof op.rec!=='object'||op.rec.id!==op.id)return true;
 const n=op.rec,adminOrOwner=u=>u.role==='Administrator'||(ex?ex.createdBy:n.createdBy)===u.name;
 if(!Array.isArray(n.signers)||!Array.isArray(n.events))return true;
 if(!ex){ // creation
  if(user.role==='Function user'||user.role==='Auditor')return true;
  if(n.createdBy!==user.name||!['Draft','Out for signature'].includes(n.status))return true;
  if(n.seal||n.completedAt)return true;
  if(n.signers.length<1||n.signers.length>12||n.signers.some(s=>s.status!=='Pending'||s.ts||s.sigHash||s.image||s.typed))return true;
  if(n.events.some(e=>e.by!==user.name))return true;
  return false}
 if(ex.status==='Completed')return true;
 for(const k of ['id','doc','ver','docSha','createdBy','created','order','due','purpose','title','message'])if(JSON.stringify(ex[k])!==JSON.stringify(n[k]))return true;
 // history only grows, and new entries are in the caller's own name
 if(n.events.length<ex.events.length)return true;
 for(let i=0;i<ex.events.length;i++)if(JSON.stringify(ex.events[i])!==JSON.stringify(n.events[i]))return true;
 if(n.events.slice(ex.events.length).some(e=>e.by!==user.name))return true;
 // signers
 if(n.signers.length!==ex.signers.length)return true;
 let signedNow=0,declinedNow=0;
 for(let i=0;i<ex.signers.length;i++){
  const a=ex.signers[i],b=n.signers[i];if(!b||b.id!==a.id)return true;
  for(const k of ['name','email','role','internal','order'])if(JSON.stringify(a[k])!==JSON.stringify(b[k]))return true;
  if(JSON.stringify(a)===JSON.stringify(b))continue;
  if(ex.status!=='Out for signature'||a.status!=='Pending')return true;
  if(!a.internal||a.name!==user.name)return true; // external signers are written by the portal only; nobody signs for someone else
  if(!pendingNow(ex).some(x=>x.id===a.id))return true; // and only on their turn
  if(b.status==='Declined'){declinedNow++;if(!b.ts||String(b.reason||'').trim().length<3)return true;continue}
  if(b.status!=='Signed')return true;
  signedNow++;
  if(!['typed','drawn'].includes(b.method)||!b.ts||!/^[0-9a-f]{64}$/.test(b.sigHash||''))return true;
  if(b.method==='drawn'){if(imageProblem(b.image))return true;if(sha256hex(b.image)!==b.imageSha)return true}
  else if(normName(b.typed)!==normName(b.name))return true;
  if(sigHash(n,b)!==b.sigHash)return true}
 if(signedNow+declinedNow>1)return true;
 // status moves
 if(ex.status!==n.status){
  const from=ex.status,to=n.status;
  const okMove=
   (from==='Draft'&&to==='Out for signature'&&adminOrOwner(user))||
   (to==='Cancelled'&&from!=='Completed'&&adminOrOwner(user))||
   (from==='Out for signature'&&to==='Expired'&&String(ex.due)<today)||
   (from==='Out for signature'&&to==='Declined'&&declinedNow===1)||
   (from==='Out for signature'&&to==='Completed'&&n.signers.every(s=>s.status==='Signed'));
  if(!okMove)return true}
 else if(declinedNow)return true;
 // the seal exists only on a completed request and must recompute
 if(n.status==='Completed'){
  if(!n.seal||n.seal.sha!==sealHash(n)||!n.completedAt)return true}
 else if(JSON.stringify(ex.seal||null)!==JSON.stringify(n.seal||null)||(ex.completedAt||'')!==(n.completedAt||''))return true;
 return false}

module.exports={init,issue,publicRoute,gate,sigHash,sealHash,sha256hex,pendingNow,imageProblem,normName,find,PORTAL_LABEL,LEGAL,CONSENT,GENERIC};
