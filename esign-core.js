// E-signature core (no screens): signature requests on a document version, ordered or parallel signers,
// typed or drawn signatures, integrity checks against the document's SHA-256, a tamper-evident seal and a
// completion certificate. Screens live in esign.js; external signers (no account) use the server portal.
//
// IMPORTANT LIMITS. This is a simple electronic signature with an audit trail. It is NOT an Aadhaar eSign, a
// digital signature certificate (DSC) or a qualified/advanced signature, and it does not by itself prove who
// the signer is. Whether it is legally sufficient depends on the document type and law. Use a licensed
// provider where the law or the counterparty requires one. The screens say so.
//
// State: S().esReq [{id,title,doc,ver,docSha,purpose,message,order,due,status,created,createdBy,signers[],events[],seal,completedAt}]
//   signer {id,name,email,role,internal,order,status('Pending'|'Signed'|'Declined'),ts,method,typed,image,reason,sigHash}
(function(){
const G=window.GRC;if(!G||!G.dms)return;
const {logIt,commit,me,TODAY,addDays,dTo}=G;const D=G.dms;
const S=()=>G.S();
const coll=()=>{const s=S();if(!Array.isArray(s.esReq))s.esReq=[];return s.esReq};
const nextId=()=>{const s=S();if(!s.seq)s.seq={};const mx=Math.max(0,...coll().map(x=>parseInt(String(x.id).slice(4),10)||0));if(!(s.seq.sig>mx))s.seq.sig=mx+1;return 'SIG-'+String(s.seq.sig++).padStart(3,'0')};
const ROLES=['Signer','Approver','Reviewer','Witness'],PURPOSES=['Approval','Agreement','Acknowledgement'],ORDERS=['Sequential','Parallel'];
const LEGAL='Simple electronic signature with an audit trail. It is not an Aadhaar eSign, a digital signature certificate or a qualified signature, and it does not by itself prove the signer\'s identity. Confirm it is legally sufficient for this document, or use a licensed provider.';
const find=id=>coll().find(r=>r.id===id);
const signerOf=(r,sid)=>r&&r.signers.find(s=>s.id===sid);
const ev=(r,action,detail)=>{r.events.push({ts:new Date().toISOString(),by:me().name,action,detail:detail||''})};

// ---------------------------------------------------------------- hashing
const sigHash=(r,s)=>D.shaText([r.docSha,r.id,s.id,s.name,s.email||'',s.ts,s.method,s.typed||'',s.imageSha||''].join('|'));
const sealHash=r=>D.shaText(r.docSha+'|'+r.id+'|'+r.signers.filter(s=>s.status==='Signed').sort((a,b)=>a.ts<b.ts?-1:1).map(s=>`${s.name}:${s.ts}:${s.sigHash}`).join(';'));

// ---------------------------------------------------------------- create and send
async function create(docId,signers,opts){
 opts=opts||{};const d=D.doc(docId);if(!d)throw new Error('Choose a document.');if(!D.canView(d))throw new Error('You cannot see this document.');
 if(me().role==='Auditor')throw new Error('Auditors cannot request signatures.');
 const v=D.version(d);if(!v)throw new Error('The document has no file.');const chk=await D.verify(docId,v.n);if(!chk.ok)throw new Error('The document file failed its integrity check: '+chk.reason);
 if(!Array.isArray(signers)||!signers.length)throw new Error('Add at least one signer.');if(signers.length>12)throw new Error('Up to 12 signers.');
 const people=G.people(),seen=new Set(),list=[];
 signers.forEach((x,i)=>{const name=String(x.name||'').trim(),email=String(x.email||'').trim().toLowerCase(),internal=x.internal!==false&&people.includes(name);
  if(!name)throw new Error('Every signer needs a name.');
  if(!internal&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))throw new Error(`${name}: an email address is needed for a signer outside the organisation.`);
  const key=internal?'n:'+name:'e:'+email;if(seen.has(key))throw new Error(`${name} is listed twice.`);seen.add(key);
  list.push({id:'s'+(i+1),name,email:internal?'':email,role:ROLES.includes(x.role)?x.role:'Signer',internal,order:Math.max(1,Math.min(12,Math.round(+x.order||i+1))),status:'Pending',ts:'',method:'',typed:'',image:'',reason:''})});
 const due=opts.due||addDays(TODAY,14);if(due<TODAY)throw new Error('The due date is in the past.');
 const r={id:nextId(),title:String(opts.title||('Signature: '+d.title)).slice(0,140),doc:d.id,ver:v.n,docSha:v.sha,purpose:PURPOSES.includes(opts.purpose)?opts.purpose:'Approval',message:String(opts.message||'').slice(0,600),order:ORDERS.includes(opts.order)?opts.order:'Sequential',due,status:'Draft',created:TODAY,createdBy:me().name,signers:list,events:[],seal:null,completedAt:''};
 ev(r,'created',`Document ${d.id} v${v.n}, checksum ${v.sha.slice(0,12)}`);coll().push(r);logIt('ESIGN',`Signature request created: ${r.id} for ${d.id}`);commit();return r}
function send(id){const r=find(id);if(!r)throw new Error('Request not found.');if(r.createdBy!==me().name&&me().role!=='Administrator')throw new Error('Only the requester or an administrator can send it.');if(r.status!=='Draft')throw new Error('This request has already been sent.');
 r.status='Out for signature';ev(r,'sent',r.signers.map(s=>s.name).join(', '));const d=D.doc(r.doc);if(d&&d.status==='Draft'&&r.purpose==='Approval'){d.status='In review'}logIt('ESIGN',`Sent for signature: ${r.id}`);commit();return r}

// ---------------------------------------------------------------- who can sign now
const pendingNow=r=>{if(r.status!=='Out for signature')return[];const p=r.signers.filter(s=>s.status==='Pending');if(r.order==='Parallel')return p;const m=Math.min(...p.map(s=>s.order));return p.filter(s=>s.order===m)};
const canSign=(r,s)=>!!s&&r.status==='Out for signature'&&s.internal&&s.name===me().name&&pendingNow(r).includes(s);
const waitingFor=name=>coll().flatMap(r=>pendingNow(r).filter(s=>s.internal&&s.name===(name||me().name)).map(s=>({req:r,signer:s})));
function refresh(){let n=0;coll().forEach(r=>{if(r.status==='Out for signature'&&r.due<TODAY){r.status='Expired';ev(r,'expired','Due date passed');n++}});if(n){logIt('ESIGN',`${n} signature request(s) expired`);commit()}return n}

// ---------------------------------------------------------------- signing (internal users sign in the app)
async function sign(id,signerId,how){
 how=how||{};const r=find(id),s=signerOf(r,signerId);if(!r||!s)throw new Error('Request not found.');
 if(r.status!=='Out for signature')throw new Error('This request is '+r.status.toLowerCase()+'.');if(!canSign(r,s))throw new Error(s.internal&&s.name!==me().name?'This signature is for '+s.name+'.':'It is not this signer\'s turn yet.');
 if(!how.consent)throw new Error('Tick the box to confirm you agree to sign electronically.');
 const method=how.method==='drawn'?'drawn':'typed';let typed='',image='',imageSha='';
 if(method==='typed'){typed=String(how.typed||'').trim();if(typed.length<2)throw new Error('Type your full name to sign.');if(typed.toLowerCase().replace(/\s+/g,' ')!==s.name.toLowerCase())throw new Error('Type your name exactly as shown: '+s.name+'.')}
 else{image=String(how.image||'');if(!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(image)||image.length<400)throw new Error('Draw your signature in the box.');if(image.length>60000)throw new Error('The drawn signature is too large. Clear it and sign again.');imageSha=await D.shaText(image)}
 const d=D.doc(r.doc),v=D.version(d,r.ver);if(!v||v.sha!==r.docSha)throw new Error('The document version no longer matches this request.');const chk=await D.verify(r.doc,r.ver);if(!chk.ok)throw new Error('The document file failed its integrity check, so it cannot be signed: '+chk.reason);
 s.status='Signed';s.ts=new Date().toISOString();s.method=method;s.typed=typed;s.image=image;s.imageSha=imageSha;s.sigHash=await sigHash(r,s);ev(r,'signed',`${s.name} (${s.role}) ${method}`);
 await finishIfDone(r);logIt('ESIGN',`${s.name} signed ${r.id}`);commit();return r}
async function finishIfDone(r){
 if(r.signers.some(x=>x.status==='Pending'))return;r.status='Completed';r.completedAt=new Date().toISOString();r.seal={ts:r.completedAt,sha:await sealHash(r)};ev(r,'completed','Sealed '+r.seal.sha.slice(0,16));
 const d=D.doc(r.doc);if(d){d.sig={req:r.id,ts:r.completedAt,seal:r.seal.sha,ver:r.ver};if(r.purpose==='Approval'&&(d.status==='Draft'||d.status==='In review'))d.status='Approved';d.modified=TODAY}
 (G.esignHooks||[]).forEach(h=>{try{h(r,'completed')}catch(e){console.warn('esign hook',e)}})}
function decline(id,signerId,reason){const r=find(id),s=signerOf(r,signerId);if(!r||!s)throw new Error('Request not found.');if(!canSign(r,s))throw new Error('You cannot decline this signature.');reason=String(reason||'').trim();if(reason.length<3)throw new Error('Give a reason for declining.');
 s.status='Declined';s.ts=new Date().toISOString();s.reason=reason.slice(0,300);r.status='Declined';ev(r,'declined',`${s.name}: ${s.reason}`);const d=D.doc(r.doc);if(d&&d.status==='In review')d.status='Draft';(G.esignHooks||[]).forEach(h=>{try{h(r,'declined')}catch{}});logIt('ESIGN',`${s.name} declined ${r.id}`);commit();return r}
function cancel(id,reason){const r=find(id);if(!r)throw new Error('Request not found.');if(r.createdBy!==me().name&&me().role!=='Administrator')throw new Error('Only the requester or an administrator can cancel it.');if(r.status==='Completed')throw new Error('A completed request cannot be cancelled.');
 r.status='Cancelled';ev(r,'cancelled',String(reason||'').slice(0,200));const d=D.doc(r.doc);if(d&&d.status==='In review'&&!d.sig)d.status='Draft';logIt('ESIGN',`Cancelled ${r.id}`);commit();return r}
function remind(id){const r=find(id);if(!r||r.status!=='Out for signature')throw new Error('Nothing to remind.');const p=pendingNow(r);if(!p.length)throw new Error('Nobody is waiting.');ev(r,'reminder',p.map(s=>s.name).join(', '));logIt('ESIGN',`Reminder sent for ${r.id}`);commit();return p}
function reviseSigned(id){const d=D.doc(id);if(!d||!d.sig)throw new Error('This document is not signed.');if(me().role!=='Administrator'&&d.owner!==me().name)throw new Error('Only the owner or an administrator can start a revision.');
 d.sigHistory=[...(d.sigHistory||[]),d.sig];d.sig=null;d.status='Draft';logIt('ESIGN',`Revision started on signed document ${d.id}; the signed version stays in history`);commit();return d}

// ---------------------------------------------------------------- verify and certificate
async function verify(id){
 const r=find(id);if(!r)return{ok:false,reason:'Request not found'};const out={ok:true,docOk:true,sigs:[],sealOk:null,problems:[]};
 const chk=await D.verify(r.doc,r.ver);if(!chk.ok||chk.expected!==r.docSha){out.docOk=false;out.ok=false;out.problems.push('The document file does not match the checksum recorded when signing was requested.')}
 for(const s of r.signers.filter(x=>x.status==='Signed')){let ok=(await sigHash(r,s))===s.sigHash;
  // FIX: the drawn image must also match its recorded hash (sigHash covers imageSha, not the image bytes, so a swapped image went unnoticed)
  if(ok&&s.method==='drawn'&&(await D.shaText(s.image||''))!==s.imageSha)ok=false;out.sigs.push({id:s.id,name:s.name,ok});if(!ok){out.ok=false;out.problems.push(`The record of ${s.name}'s signature has been altered.`)}}
 if(r.seal){out.sealOk=(await sealHash(r))===r.seal.sha;if(!out.sealOk){out.ok=false;out.problems.push('The completion seal does not match the signatures.')}}
 return out}
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function certificate(id){const r=find(id);if(!r)throw new Error('Request not found.');const d=D.doc(r.doc)||{title:r.doc};
 const rows=r.signers.map(s=>`<tr><td>${esc(s.name)}${s.internal?'':' (external)'}<br><small>${esc(s.role)}${s.email?' · '+esc(s.email):''}</small></td><td>${esc(s.status)}</td><td>${s.ts?esc(s.ts.replace('T',' ').slice(0,19))+' UTC':''}</td><td>${s.status==='Signed'?esc(s.method)+(s.typed?': '+esc(s.typed):''):esc(s.reason||'')}<br><small>${s.sigHash?esc(s.sigHash.slice(0,32)):''}</small></td></tr>`).join('');
 return `<!doctype html><meta charset="utf-8"><title>Certificate of completion ${esc(r.id)}</title><style>body{font:14px/1.5 Arial,sans-serif;margin:40px;color:#14231b}h1{font-size:22px;margin:0 0 4px}table{border-collapse:collapse;width:100%;margin:16px 0}td,th{border:1px solid #cfd6d1;padding:8px;text-align:left;vertical-align:top}th{background:#eef2ee}.m{font-family:monospace;font-size:12px;word-break:break-all}.n{font-size:12px;color:#555;margin-top:20px}</style>
<h1>Certificate of completion</h1><div>${esc(r.title)} · ${esc(r.id)}</div>
<p>Status: <b>${esc(r.status)}</b>${r.completedAt?' · completed '+esc(r.completedAt.replace('T',' ').slice(0,19))+' UTC':''}<br>Document: ${esc(d.title)} (${esc(r.doc)}, version ${r.ver})<br>Purpose: ${esc(r.purpose)} · Signing order: ${esc(r.order)}<br>Requested by ${esc(r.createdBy)} on ${esc(r.created)}</p>
<p>Document SHA-256: <span class="m">${esc(r.docSha)}</span></p><table><tr><th>Signer</th><th>Status</th><th>Time</th><th>Method / signature record</th></tr>${rows}</table>
${r.seal?`<p>Seal (SHA-256 over the document checksum and every signature record): <span class="m">${esc(r.seal.sha)}</span></p>`:''}
<h3>History</h3><table><tr><th>Time (UTC)</th><th>By</th><th>Action</th><th>Detail</th></tr>${r.events.map(e=>`<tr><td>${esc(e.ts.replace('T',' ').slice(0,19))}</td><td>${esc(e.by)}</td><td>${esc(e.action)}</td><td>${esc(e.detail)}</td></tr>`).join('')}</table>
<p class="n">${esc(LEGAL)}</p>`}
function downloadCertificate(id){const html=certificate(id),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([html],{type:'text/html'}));a.download=`certificate-${id}.html`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);logIt('ESIGN',`Certificate downloaded: ${id}`)}
async function issueLink(id,signerId){if(!(G.api&&G.api.connected))throw new Error('Signing links for people outside the organisation need the server. Sign in to the server first.');
 const r=find(id),s=signerOf(r,signerId);if(!r||!s)throw new Error('Request not found.');if(s.internal)throw new Error('This person signs inside the app.');if(r.status!=='Out for signature')throw new Error('Send the request first.');
 const x=await G.api.call('POST','/api/sign/issue',{profile:G.PROF,req:id,signer:signerId});if(!x.ok)throw new Error(x.data.error||'Could not create the link.');ev(r,'link issued',s.name);commit();return location.origin+(x.data.url||'')}

G.esign={ROLES,PURPOSES,ORDERS,LEGAL,reqs:coll,req:find,create,send,sign,decline,cancel,remind,pendingNow,canSign,waitingFor,refresh,verify,certificate,downloadCertificate,issueLink,reviseSigned,
 forDoc:docId=>coll().filter(r=>r.doc===docId),sigHash,sealHash};
})();
