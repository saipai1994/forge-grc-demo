// Document management core (no screens): folders, documents, versions, integrity hashes, retention and legal hold,
// links to GRC records, access by confidentiality and search. Screens live in dms.js; signatures in esign-core.js.
//
// Storage. Records (folders, documents) are ordinary state collections, so they sync like everything else:
//   S().dmsFolders  [{id,name,parent}]
//   S().dmsDocs     [{id,title,type,folder,status,owner,conf,tags[],linked[],desc,created,modified,createdBy,
//                     retention:{years,hold,holdReason}, versions:[{n,ts,by,name,size,mime,sha,fileId,note}], cur, out, idx, sig}]
// File bytes live on the server (the existing /api/files store, ref = document id) when signed in, and in this
// browser (IndexedDB) in demo mode. Every version stores a SHA-256 of its bytes, checked on demand.
(function(){
const G=window.GRC;if(!G)return;
const {logIt,commit,me,TODAY,addDays}=G;
const S=()=>G.S();
const coll=k=>{const s=S();if(!Array.isArray(s[k]))s[k]=[];return s[k]};
// ids continue after the highest existing one, so seeded and imported records never collide
const nextId=(k,pre,w,list)=>{const s=S();if(!s.seq)s.seq={};const mx=Math.max(0,...(list||[]).map(x=>parseInt(String(x.id).slice(pre.length),10)||0));if(!(s.seq[k]>mx))s.seq[k]=mx+1;return pre+String(s.seq[k]++).padStart(w,'0')};

const TYPES=['Policy','Standard','Procedure','Contract','Regulatory filing','Regulator correspondence','Evidence','Report','Minutes','Certificate','Template','Other'];
const STATUSES=['Draft','In review','Approved','Published','Archived','Superseded'];
const CONF=['Public','Internal','Confidential','Restricted'];
const MAX_DEMO=8*1024*1024,MAX_LIVE=10*1024*1024;

// ---------------------------------------------------------------- SHA-256 (WebCrypto when available, else pure JS)
const K256=new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
function sha256sync(data){
 const b=data instanceof Uint8Array?data:new Uint8Array(data),l=b.length,n=((l+9+63)>>6)<<6,p=new Uint8Array(n);p.set(b);p[l]=0x80;
 const dv=new DataView(p.buffer);dv.setUint32(n-8,Math.floor(l/0x20000000));dv.setUint32(n-4,(l<<3)>>>0);
 const H=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]),w=new Uint32Array(64);
 const rr=(x,k)=>(x>>>k)|(x<<(32-k));
 for(let o=0;o<n;o+=64){
  for(let i=0;i<16;i++)w[i]=dv.getUint32(o+i*4);
  for(let i=16;i<64;i++){const s0=rr(w[i-15],7)^rr(w[i-15],18)^(w[i-15]>>>3),s1=rr(w[i-2],17)^rr(w[i-2],19)^(w[i-2]>>>10);w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0}
  let [a,bb,c,d,e,f,g,h]=H;
  for(let i=0;i<64;i++){const S1=rr(e,6)^rr(e,11)^rr(e,25),ch=(e&f)^(~e&g),t1=(h+S1+ch+K256[i]+w[i])>>>0,S0=rr(a,2)^rr(a,13)^rr(a,22),mj=(a&bb)^(a&c)^(bb&c),t2=(S0+mj)>>>0;h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=bb;bb=a;a=(t1+t2)>>>0}
  H[0]+=a;H[1]+=bb;H[2]+=c;H[3]+=d;H[4]+=e;H[5]+=f;H[6]+=g;H[7]+=h}
 return [...H].map(x=>x.toString(16).padStart(8,'0')).join('');
}
const utf8=s=>new TextEncoder().encode(String(s));
async function sha256(data){
 const b=data instanceof Uint8Array?data:new Uint8Array(data);
 try{if(window.crypto&&crypto.subtle){const d=await crypto.subtle.digest('SHA-256',b);return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}}catch{}
 return sha256sync(b)}
const shaText=s=>sha256(utf8(s));

// ---------------------------------------------------------------- byte storage
const mem=new Map();let dbp=null;
const idb=()=>dbp||(dbp=new Promise((res,rej)=>{try{const q=indexedDB.open('forgeGrcDms',1);q.onupgradeneeded=()=>q.result.createObjectStore('b',{keyPath:'k'});q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)}catch(e){rej(e)}}));
const bkey=(id,n)=>`${G.PROF}|${id}|${n}`;
async function localPut(k,bytes,type){try{const d=await idb();await new Promise((res,rej)=>{const t=d.transaction('b','readwrite');t.objectStore('b').put({k,bytes,type});t.oncomplete=res;t.onerror=()=>rej(t.error)})}catch{mem.set(k,{bytes,type})}}
async function localGet(k){try{const d=await idb();const r=await new Promise((res,rej)=>{const q=d.transaction('b').objectStore('b').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});if(r)return r}catch{}return mem.get(k)||null}
async function localDel(k){try{const d=await idb();await new Promise((res,rej)=>{const t=d.transaction('b','readwrite');t.objectStore('b').delete(k);t.oncomplete=res;t.onerror=()=>rej(t.error)})}catch{}mem.delete(k)}
const live=()=>!!(G.api&&G.api.connected&&G.api.upload);

// ---------------------------------------------------------------- sources: a File/Blob, or {text, name}
async function readSource(src){
 if(src&&typeof src.text==='string'&&!src.arrayBuffer){const name=(src.name||'document.txt').replace(/[^\w.\- ()]/g,'_');return{bytes:utf8(src.text),name,mime:src.mime||'text/plain',text:src.text}}
 if(src&&typeof src.arrayBuffer==='function'){const bytes=new Uint8Array(await src.arrayBuffer());const name=(src.name||'document').replace(/[^\w.\- ()]/g,'_');const mime=src.type||'application/octet-stream';
  return{bytes,name,mime,text:/^text\/|json|xml/.test(mime)||/\.(txt|md|csv|html?)$/i.test(name)?new TextDecoder().decode(bytes):''}}
 throw new Error('Choose a file or provide text.')}
const searchable=t=>String(t||'').toLowerCase().replace(/\s+/g,' ').slice(0,6000);

async function store(doc,n,r){
 const max=live()?MAX_LIVE:MAX_DEMO;if(r.bytes.length>max)throw new Error('Files can be up to '+(max/1048576)+' MB.');if(!r.bytes.length)throw new Error('The file is empty.');
 const sha=await sha256(r.bytes);let fileId='';
 if(live()){const j=await G.api.upload(doc.id,new Blob([r.bytes],{type:r.mime}),r.name);fileId=j.id}
 else await localPut(bkey(doc.id,n),r.bytes.buffer.slice(r.bytes.byteOffset,r.bytes.byteOffset+r.bytes.byteLength),r.mime);
 return{n,ts:new Date().toISOString(),by:me().name,name:r.name,size:r.bytes.length,mime:r.mime,sha,fileId}}

// ---------------------------------------------------------------- access
const isAdmin=()=>me().role==='Administrator';
const canView=d=>!d||d.conf!=='Restricted'||isAdmin()||me().role==='Auditor'||d.owner===me().name||(d.shared||[]).includes(me().name);
const canEdit=d=>!!d&&me().role!=='Auditor'&&(isAdmin()||d.owner===me().name||(d.shared||[]).includes(me().name))&&!d.sig;
const find=id=>coll('dmsDocs').find(d=>d.id===id);
const ver=(d,n)=>d&&(d.versions||[]).find(v=>v.n===(n||d.cur));

// ---------------------------------------------------------------- folders
const folders=()=>coll('dmsFolders');
const folder=id=>folders().find(f=>f.id===id);
function folderPath(id){const out=[];let f=folder(id),g=0;while(f&&g++<20){out.unshift(f.name);f=folder(f.parent)}return out.join(' / ')}
function createFolder(name,parent){name=String(name||'').trim();if(!name)throw new Error('Give the folder a name.');if(name.length>60)throw new Error('Folder names can be up to 60 characters.');
 if(parent&&!folder(parent))throw new Error('Parent folder not found.');if(folders().some(f=>f.parent===(parent||'')&&f.name.toLowerCase()===name.toLowerCase()))throw new Error('A folder with that name already exists here.');
 const f={id:nextId('fld','FLD-',3,folders()),name,parent:parent||''};folders().push(f);logIt('DOC','Folder created: '+folderPath(f.id));commit();return f}
function deleteFolder(id){if(coll('dmsDocs').some(d=>d.folder===id))throw new Error('Move or delete the documents in this folder first.');if(folders().some(f=>f.parent===id))throw new Error('Delete the sub-folders first.');
 const i=folders().findIndex(f=>f.id===id);if(i<0)return;const p=folderPath(id);folders().splice(i,1);logIt('DOC','Folder deleted: '+p);commit()}
function renameFolder(id,name){const f=folder(id);if(!f)throw new Error('Folder not found.');name=String(name||'').trim();if(!name)throw new Error('Give the folder a name.');f.name=name.slice(0,60);logIt('DOC','Folder renamed: '+folderPath(id));commit()}

// ---------------------------------------------------------------- documents
async function create(meta,src){
 meta=meta||{};const r=await readSource(src);const title=String(meta.title||r.name.replace(/\.[^.]+$/,'')).trim();if(!title)throw new Error('Give the document a title.');
 const type=TYPES.includes(meta.type)?meta.type:'Other',conf=CONF.includes(meta.conf)?meta.conf:'Internal';if(meta.folder&&!folder(meta.folder))throw new Error('Folder not found.');
 const d={id:nextId('doc','DOC-',4,coll('dmsDocs')),title:title.slice(0,140),type,folder:meta.folder||'',status:STATUSES.includes(meta.status)?meta.status:'Draft',owner:meta.owner||me().name,conf,tags:[...new Set((meta.tags||[]).map(t=>String(t).trim().toLowerCase()).filter(Boolean))].slice(0,12),linked:[...new Set(meta.linked||[])],desc:String(meta.desc||'').slice(0,500),
  created:TODAY,modified:TODAY,createdBy:me().name,retention:{years:Number.isFinite(+meta.retentionYears)&&+meta.retentionYears>0?Math.min(99,Math.round(+meta.retentionYears)):7,hold:false,holdReason:''},versions:[],cur:1,out:'',idx:searchable(title+' '+r.text),sig:null};
 coll('dmsDocs').push(d);
 try{d.versions.push(await store(d,1,r))}catch(e){coll('dmsDocs').splice(coll('dmsDocs').indexOf(d),1);throw e}
 d.versions[0].note=String(meta.note||'Initial version').slice(0,200);logIt('DOC',`Document created: ${d.id} ${d.title} (v1)`);commit();return d}
async function addVersion(id,src,note){
 const d=find(id);if(!d)throw new Error('Document not found.');if(!canEdit(d))throw new Error(d.sig?'This document has been signed. Create a new document or request a new signature on a revised copy.':'You cannot edit this document.');
 if(d.out&&d.out!==me().name)throw new Error('Checked out by '+d.out+'.');if(d.retention&&d.retention.hold)throw new Error('This document is on legal hold.');
 const r=await readSource(src),n=Math.max(0,...d.versions.map(v=>v.n))+1,v=await store(d,n,r);v.note=String(note||'').slice(0,200)||'New version';d.versions.push(v);d.cur=n;d.out='';d.modified=TODAY;d.idx=searchable(d.title+' '+r.text);
 if(d.status==='Approved'||d.status==='Published')d.status='Draft';logIt('DOC',`New version: ${d.id} v${n}`);commit();return v}
async function bytes(id,n){
 const d=find(id),v=ver(d,n);if(!v)return null;
 if(v.fileId){const b=await G.api.fetchFile(v.fileId);return b?new Uint8Array(await b.arrayBuffer()):null}
 const r=await localGet(bkey(id,v.n));return r?new Uint8Array(r.bytes):null}
async function blob(id,n){const b=await bytes(id,n),v=ver(find(id),n);return b?new Blob([b],{type:(v&&v.mime)||'application/octet-stream'}):null}
async function text(id,n){const b=await bytes(id,n),v=ver(find(id),n);if(!b||!v)return '';const ok=/^text\/|json|xml/.test(v.mime||'')||/\.(txt|md|csv|html?)$/i.test(v.name||'');return ok?new TextDecoder().decode(b):''}
async function verify(id,n){const d=find(id),v=ver(d,n);if(!v)return{ok:false,reason:'No such version'};const b=await bytes(id,n);if(!b)return{ok:false,reason:'The stored file could not be found'};const s=await sha256(b);return{ok:s===v.sha,expected:v.sha,actual:s,reason:s===v.sha?'':'The stored file no longer matches the recorded checksum'}}
async function download(id,n){const d=find(id),v=ver(d,n),b=await blob(id,n);if(!b||!v)throw new Error('The file could not be found.');
 const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=v.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);logIt('DOC',`Downloaded ${d.id} v${v.n}`)}

function update(id,patch){const d=find(id);if(!d)throw new Error('Document not found.');if(!canEdit(d)&&!isAdmin())throw new Error('You cannot edit this document.');
 const ch=[];const set=(k,v)=>{if(JSON.stringify(d[k])!==JSON.stringify(v)){d[k]=v;ch.push(k)}};
 if(patch.title!==undefined){const t=String(patch.title).trim();if(!t)throw new Error('Give the document a title.');set('title',t.slice(0,140))}
 if(patch.type!==undefined&&TYPES.includes(patch.type))set('type',patch.type);if(patch.conf!==undefined&&CONF.includes(patch.conf))set('conf',patch.conf);
 if(patch.status!==undefined&&STATUSES.includes(patch.status))set('status',patch.status);if(patch.folder!==undefined){if(patch.folder&&!folder(patch.folder))throw new Error('Folder not found.');set('folder',patch.folder||'')}
 if(patch.owner!==undefined)set('owner',patch.owner);if(patch.desc!==undefined)set('desc',String(patch.desc).slice(0,500));
 if(patch.tags!==undefined)set('tags',[...new Set(patch.tags.map(t=>String(t).trim().toLowerCase()).filter(Boolean))].slice(0,12));
 if(patch.shared!==undefined)set('shared',patch.shared);
 if(patch.retentionYears!==undefined){const y=Math.min(99,Math.max(1,Math.round(+patch.retentionYears||7)));if(d.retention.years!==y){d.retention.years=y;ch.push('retention')}}
 if(ch.length){d.modified=TODAY;logIt('DOC',`Document updated: ${d.id} (${ch.join(', ')})`);commit()}return d}
const setStatus=(id,s)=>update(id,{status:s});
function checkOut(id){const d=find(id);if(!d)throw new Error('Document not found.');if(!canEdit(d))throw new Error('You cannot edit this document.');if(d.out&&d.out!==me().name)throw new Error('Already checked out by '+d.out+'.');d.out=me().name;logIt('DOC',`Checked out: ${d.id}`);commit();return d}
function cancelCheckOut(id){const d=find(id);if(!d)return;if(d.out&&d.out!==me().name&&!isAdmin())throw new Error('Checked out by '+d.out+'.');d.out='';logIt('DOC',`Check-out cancelled: ${d.id}`);commit();return d}
function archive(id){const d=update(id,{status:'Archived'});return d}
function setHold(id,on,reason){if(!isAdmin()&&me().role!=='Business user')throw new Error('Only administrators and business users can place a legal hold.');const d=find(id);if(!d)throw new Error('Document not found.');
 if(on&&!String(reason||'').trim())throw new Error('Give a reason for the hold.');d.retention.hold=!!on;d.retention.holdReason=on?String(reason).trim().slice(0,200):'';logIt('DOC',`${on?'Legal hold placed':'Legal hold released'}: ${d.id}`);commit();return d}
const retentionEnd=d=>addDays(d.modified||d.created||TODAY,Math.round((d.retention&&d.retention.years||7)*365.25));
function disposition(d){if(d.retention&&d.retention.hold)return{state:'Held',label:'Legal hold: '+(d.retention.holdReason||'')};const e=retentionEnd(d);return e<=TODAY?{state:'Due',label:'Retention ended '+e}:{state:'Retained',label:'Retained until '+e}}
async function dispose(id){if(!isAdmin())throw new Error('Only an administrator can dispose of documents.');const d=find(id);if(!d)throw new Error('Document not found.');const s=disposition(d);if(s.state==='Held')throw new Error('This document is on legal hold.');if(s.state!=='Due')throw new Error('The retention period has not ended.');
 if(d.sig)throw new Error('Signed documents must be exported and approved for disposal outside the system.');for(const v of d.versions){if(!v.fileId)await localDel(bkey(d.id,v.n))}
 if(live()&&G.api.removeFiles)try{await G.api.removeFiles(d.versions.map(v=>v.fileId).filter(Boolean))}catch{}
 coll('dmsDocs').splice(coll('dmsDocs').indexOf(d),1);logIt('DOC',`Document disposed: ${d.id} ${d.title}`);commit()}
async function remove(id){const d=find(id);if(!d)return;if(!isAdmin()&&d.owner!==me().name)throw new Error('Only the owner or an administrator can delete a document.');if(d.retention.hold)throw new Error('This document is on legal hold.');if(d.sig)throw new Error('Signed documents cannot be deleted.');
 for(const v of d.versions){if(!v.fileId)await localDel(bkey(d.id,v.n))}coll('dmsDocs').splice(coll('dmsDocs').indexOf(d),1);logIt('DOC',`Document deleted: ${d.id} ${d.title}`);commit()}

// ---------------------------------------------------------------- links and search
function link(id,rec){const d=find(id);if(!d)throw new Error('Document not found.');if(!rec)return d;if(!d.linked.includes(rec)){d.linked.push(rec);logIt('DOC',`Linked ${d.id} to ${rec}`);commit()}return d}
function unlink(id,rec){const d=find(id);if(!d)return;const i=d.linked.indexOf(rec);if(i>=0){d.linked.splice(i,1);logIt('DOC',`Unlinked ${d.id} from ${rec}`);commit()}return d}
const docsFor=rec=>coll('dmsDocs').filter(d=>(d.linked||[]).includes(rec)&&canView(d));
function search(q,f){f=f||{};q=String(q||'').trim().toLowerCase();const terms=q.split(/\s+/).filter(Boolean);
 return coll('dmsDocs').filter(d=>canView(d)&&(!f.type||d.type===f.type)&&(!f.status||d.status===f.status)&&(!f.folder||d.folder===f.folder||(f.deep&&folderPath(d.folder).startsWith(folderPath(f.folder))))&&(!f.tag||d.tags.includes(f.tag))&&(!f.owner||d.owner===f.owner)&&(!f.conf||d.conf===f.conf)
  &&terms.every(t=>(d.title+' '+d.id+' '+d.tags.join(' ')+' '+d.desc+' '+d.owner+' '+d.type+' '+(d.linked||[]).join(' ')+' '+d.idx).toLowerCase().includes(t)))}

// ---------------------------------------------------------------- demo content
G.seeders.dmsFolders=()=>[['FLD-001','Policies and procedures',''],['FLD-002','Regulatory',''],['FLD-003','Regulatory / Filings and returns','FLD-002'],['FLD-004','Regulatory / Inspections','FLD-002'],['FLD-005','Contracts and vendors',''],['FLD-006','Audit and assurance',''],['FLD-007','Board and committees',''],['FLD-008','Evidence','']].map(a=>({id:a[0],name:a[1].replace(/^.* \/ /,''),parent:a[2]}));
G.seeders.dmsDocs=()=>{const s=S(),pol=(s.policies||[]);const mk=(n,title,type,folder,status,text,tags,linked,conf,years)=>{const bytes=utf8(text),sha=sha256sync(bytes);return{id:'DOC-'+String(n).padStart(4,'0'),title,type,folder,status,owner:'Morgan Chen',conf:conf||'Internal',tags,linked:linked||[],desc:'Sample document for the demonstration.',created:addDays(TODAY,-60+n*3),modified:addDays(TODAY,-30+n*2),createdBy:'Morgan Chen',retention:{years:years||7,hold:false,holdReason:''},versions:[{n:1,ts:new Date(Date.parse(TODAY+'T09:00:00Z')-(40-n)*864e5).toISOString(),by:'Morgan Chen',name:title.replace(/[^\w ]/g,'').replace(/ +/g,'-').toLowerCase()+'.txt',size:bytes.length,mime:'text/plain',sha,fileId:'',note:'Initial version'}],cur:1,out:'',idx:searchable(title+' '+text),sig:null,seed:text}};
 const p0=pol[0]&&pol[0].id,p1=pol[1]&&pol[1].id;
 return[
  mk(1,'Code of conduct','Policy','FLD-001','Published','Code of conduct. Sample text for the demonstration. Replace with your approved policy.\n\nPurpose: set the standard of behaviour expected of everyone who works for the organisation.\nScope: all employees, contractors and board members.\nKey rules: act with integrity, declare conflicts of interest, protect confidential information, speak up about concerns.',['conduct','hr'],p0?[p0]:[]),
  mk(2,'Information security policy','Policy','FLD-001','Published','Information security policy. Sample text for the demonstration.\n\nPurpose: protect information assets from unauthorised access, loss and disruption.\nScope: all systems, data and people.\nRules: least-privilege access, multi-factor authentication for remote and privileged access, encryption of sensitive data, incident reporting without delay.',['security','policy'],p1?[p1]:[]),
  mk(3,'Regulatory inspection: response pack','Regulator correspondence','FLD-004','Draft','Response to the regulator inspection findings. Sample text for the demonstration.\n\nFinding 1: describe the observation, the agreed action, the owner and the date.\nFinding 2: describe the observation, the agreed action, the owner and the date.',['inspection','regulator'],[],'Confidential',10),
  mk(4,'Periodic return: quarterly filing (sample)','Regulatory filing','FLD-003','Approved','Quarterly regulatory return. Sample text for the demonstration, not a real filing.\n\nReporting period, figures and declarations would appear here. Prepared by compliance, reviewed by the head of compliance.',['filing','return'],[],'Confidential',8),
  mk(5,'Outsourcing agreement: cloud hosting (sample)','Contract','FLD-005','Approved','Cloud hosting services agreement. Sample text for the demonstration, not a real contract.\n\nParties, services, service levels, security, audit and access rights for the organisation and its regulator, exit and data return.',['contract','vendor'],[],'Confidential',8),
  mk(6,'Internal audit report: access management','Report','FLD-006','Published','Internal audit report. Sample text for the demonstration.\n\nObjective, scope, summary of findings by rating, management actions and agreed dates.',['audit','report'],[],'Confidential'),
  mk(7,'Board risk committee minutes (sample)','Minutes','FLD-007','Approved','Board risk committee minutes. Sample text for the demonstration.\n\nAttendees, risks above appetite discussed, decisions and actions.',['board','minutes'],[],'Restricted',10)]};

G.dms={TYPES,STATUSES,CONF,docs:()=>coll('dmsDocs'),folders,folder,folderPath,doc:find,version:ver,createFolder,deleteFolder,renameFolder,create,addVersion,bytes,blob,text,verify,download,update,setStatus,checkOut,cancelCheckOut,archive,setHold,retentionEnd,disposition,dispose,remove,link,unlink,docsFor,search,canView,canEdit,sha256,sha256sync,shaText,utf8,live,
 children:parent=>folders().filter(f=>f.parent===(parent||'')),sizeLabel:n=>n>1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB'};
G.esignHooks=G.esignHooks||[];
})();
