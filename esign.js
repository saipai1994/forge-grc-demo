// E-signature screens: Waiting for me, Requests, Completed, the request wizard, the request drawer, the signing dialog,
// signing links for people outside the organisation (live mode), a demo preview of the external page, launchpad tile.
// The rules live in esign-core.js (and server/esign.js for external signers). This file only shows them.
//
// LEGAL LIMITS: a simple electronic signature with an audit trail. Not Aadhaar eSign, not a digital signature
// certificate, and it does not by itself prove who signed. The screens say so (G.esign.LEGAL).
(function(){const G=window.GRC;if(!G||!G.dms||!G.esign)return;
const X=G.esign,D=G.dms;
const {E,fmt,pill,table,card,kpi,TODAY,toast,actions,openForm,openDrawer,panel,head,me,toolbar,flt,detail,logIt,commit}=G;
const GROUP='DOCUMENTS & SIGNATURES';
const CONSENT='I have read this document and I agree to sign it electronically.'; // keep identical to server/esign.js
X.CONSENT=CONSENT;
const live=()=>!!(G.api&&G.api.connected);
const STK={Draft:'blue','Out for signature':'amber',Completed:'green',Declined:'red',Cancelled:'red',Expired:'red'};
const STATUSES=['Draft','Out for signature','Completed','Declined','Cancelled','Expired'];
const ICON={Signed:'✓',Declined:'✗',Pending:'◔'};
const CURSIVE="'Segoe Script','Brush Script MT','Lucida Handwriting','Snell Roundhand','Apple Chancery','URW Chancery L',cursive";
const norm=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
const when=ts=>ts?String(ts).replace('T',' ').slice(0,16)+' UTC':'';
const isOwnerOrAdmin=r=>me().role==='Administrator'||r.createdBy===me().name;
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
const PNG_OK=u=>typeof u==='string'&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(u);
const fileSize=n=>D.sizeLabel?D.sizeLabel(n||0):((n||0)+' bytes');

// ---------------------------------------------------------------- styles
const css=document.createElement('style');css.textContent=`
.es-back .modal{width:min(720px,100%);max-height:94vh;display:flex;flex-direction:column}.es-back .es-body{overflow:auto;font-size:12px;line-height:1.55}.es-back .modalfoot{flex-wrap:wrap}
.es-back h4,.es-x h4{margin:14px 0 6px;font:700 12px Manrope}.es-back .field label,.es-back label{font-size:11px}.es-back .field input,.es-back .field select,.es-back .field textarea{font-size:12px}
.es-back button:focus-visible,.es-back input:focus-visible,.es-back select:focus-visible,.es-back textarea:focus-visible,.es-back pre:focus-visible,.es-x button:focus-visible{outline:3px solid #0070F2;outline-offset:2px}
.es-sg{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:8px;align-items:center;border:1px solid #e3e8ee;border-radius:8px;padding:8px 10px;margin-bottom:6px}.es-sg label{display:flex;gap:6px;align-items:center;margin:0}.es-sg select,.es-sg input{border:1px solid #dfe4e9;border-radius:6px;padding:5px 6px;font-size:12px}.es-sg input[type=number]{width:56px}
.es-tag{display:inline-block;border:1px solid #cdd6e0;border-radius:10px;padding:1px 7px;font-size:10px;color:#44566a;margin-left:6px}
.es-add{display:grid;grid-template-columns:1fr 1fr;gap:10px}.es-add fieldset{border:1px solid #e3e8ee;border-radius:8px;padding:8px 10px;margin:0;display:flex;flex-wrap:wrap;gap:6px;align-items:center}.es-add legend{font-size:11px;font-weight:700;padding:0 4px}.es-add input,.es-add select{border:1px solid #dfe4e9;border-radius:6px;padding:7px 8px;font-size:12px;min-width:0;flex:1 1 130px}
.es-err{color:#a1322b;font-weight:600;min-height:1.2em;margin:8px 0 0}.es-ok{color:#1d6a5a;font-weight:600}
.es-pre{white-space:pre-wrap;word-break:break-word;max-height:240px;overflow:auto;background:#f7f9fb;border:1px solid #cfd8e1;border-radius:8px;padding:10px;font:12px/1.55 ui-monospace,Menlo,Consolas,monospace;margin:6px 0}
.es-img{max-width:100%;max-height:320px;border:1px solid #e3e8ee;border-radius:8px}.es-pdf{width:100%;height:320px;border:1px solid #e3e8ee;border-radius:8px}
.es-cv{display:block;width:100%;max-width:520px;aspect-ratio:520/170;border:2px dashed #7c8da1;border-radius:8px;background:#fff;touch-action:none;cursor:crosshair}
.es-cursive{font:28px/1.3 ${CURSIVE};min-height:38px;color:#14231b;border-bottom:1px solid #aab6c3;margin:6px 0;padding:0 6px}
.es-radio{display:flex;gap:16px;flex-wrap:wrap;margin:6px 0}.es-radio label{display:flex;gap:6px;align-items:center}
.es-consent{display:flex;gap:8px;align-items:flex-start;margin:12px 0;padding:10px;border:1px solid #cfd8e1;border-radius:8px;background:#f7f9fb}.es-consent input{margin-top:3px}
.es-demo{background:#14231b;color:#fff;border-radius:8px;padding:8px 12px;margin-bottom:10px;font-weight:700}
.es-tl{list-style:none;margin:6px 0 12px;padding:0}.es-tl li{display:grid;grid-template-columns:26px 1fr;gap:8px;padding:8px 0;border-bottom:1px solid #edf0f3;font-size:11px}.es-tl .mk{font-size:15px;text-align:center}
.es-sig{font:24px/1.3 ${CURSIVE};color:#14231b}.es-sigimg{display:block;max-width:240px;max-height:80px;border:1px solid #e3e8ee;border-radius:6px;background:#fff;margin-top:4px}
.es-hist{font-size:10px;color:#44566a;line-height:1.7;border-left:2px solid #e8ebef;padding-left:10px;margin:6px 0}
code.es-sha{font:10px ui-monospace,Menlo,Consolas,monospace;background:#f1f5f8;padding:1px 4px;border-radius:4px;word-break:break-all}
.es-small{font-size:10px;color:#5c6773}
@media(max-width:700px){.es-sg{grid-template-columns:1fr 1fr}.es-add{grid-template-columns:1fr}}`;
document.head.appendChild(css);

G.mount({id:'esign',label:'E-signature',ico:'✍',group:GROUP,title:'E-signature',sub:'Ask people to sign a document, sign what is waiting for you, and keep a sealed record of who signed which version and when. A simple electronic signature with an audit trail.',tabs:[['wait','Waiting for me'],['all','Requests'],['done','Completed']]});

// ---------------------------------------------------------------- who sees what
const canSeeAll=()=>me().role==='Administrator'||me().role==='Auditor';
const visible=()=>X.reqs().filter(r=>canSeeAll()||r.createdBy===me().name||r.signers.some(s=>s.internal&&s.name===me().name));
const canCreate=()=>me().role!=='Auditor'&&(!live()||me().role!=='Function user');
const mySigner=r=>r.signers.find(s=>X.canSign(r,s));
const stPill=s=>pill(s,STK[s]||'blue');
const doneCount=r=>r.signers.filter(s=>s.status==='Signed').length;

// ---------------------------------------------------------------- tabs
function reqRow(r){
 const d=D.doc(r.doc),next=X.pendingNow(r).map(s=>s.name);
 return `<tr data-op="open" data-t="esreq" data-id="${E(r.id)}"><td class="riskid"><button type="button" class="op-link" data-op="open" data-t="esreq" data-id="${E(r.id)}">${E(r.id)}</button></td><td><div class="riskname">${E(r.title)}</div><div class="riskarea">${E(d?d.title:r.doc)} · ${E(r.purpose)} · ${E(r.order.toLowerCase())}</div></td><td>${stPill(r.status)}</td><td>${doneCount(r)} of ${r.signers.length} signed${r.status==='Out for signature'&&next.length?`<div class="riskarea">Waiting for ${E(next.join(', '))}</div>`:''}</td><td>${E(r.createdBy)}</td><td>${r.status==='Completed'?E(fmt((r.completedAt||'').slice(0,10))):E(fmt(r.due))}</td></tr>`}
const RHEAD=['ID','Request','Status','Signed','From','Due / done'];
function renderES(){
 if(X.reqs().some(r=>r.status==='Out for signature'&&r.due<TODAY))setTimeout(()=>{try{X.refresh()}catch(e){console.warn(e)}},0); // due dates mark requests Expired
 const mine=X.waitingFor(me().name),vis=visible();
 head('esign',canCreate()?`<button class="btn primary" data-op="esign-new"><span class="btnico">＋</span>New request</button>`:'');
 const out=vis.filter(r=>r.status==='Out for signature'),mo=TODAY.slice(0,7),mo2=new Date().toISOString().slice(0,7);
 const done=vis.filter(r=>r.status==='Completed'),doneMonth=done.filter(r=>[mo,mo2].includes((r.completedAt||'').slice(0,7))),bad=vis.filter(r=>r.status==='Declined'||r.status==='Expired');
 const cards=`<div class="op-kpis">${kpi('Waiting for me',mine.length,mine.length?'your signature is needed':'nothing to sign',mine.length?'warn':'',mine.map(x=>x.req.id))}${kpi('Out for signature',out.length,'sent and not finished','',out.map(r=>r.id))}${kpi('Completed this month',doneMonth.length,`${done.length} completed in all`,'',doneMonth.map(r=>r.id))}${kpi('Declined or expired',bad.length,bad.length?'needs a new request':'none','' ,bad.map(r=>r.id))}</div>`;
 const legal=`<div class="op-banner amber" role="note"><div><b>What a signature here means</b><div>${E(X.LEGAL)}</div></div></div>`;
 // waiting for me
 const wrows=mine.map(({req:r,signer:s})=>{const d=D.doc(r.doc);
  return `<tr data-op="open" data-t="esreq" data-id="${E(r.id)}"><td class="riskid"><button type="button" class="op-link" data-op="open" data-t="esreq" data-id="${E(r.id)}">${E(r.id)}</button></td><td><div class="riskname">${E(r.title)}</div><div class="riskarea">${E(d?d.title:r.doc)} · ${E(r.purpose)}</div></td><td>${E(r.createdBy)}</td><td>${E(fmt(r.due))}</td><td>${E(s.role)}</td><td><button type="button" class="op-mini p" data-op="esign-sign" data-id="${E(r.id)}" aria-label="Review and sign ${E(r.id)}">Review and sign</button></td></tr>`});
 panel('esign','wait').innerHTML=cards+legal+card('Waiting for my signature',`${mine.length} request(s). Open the document, check it, then sign. You can decline with a reason.`,table(['ID','Request','From','Due','Your role',''],wrows,'Nothing is waiting for your signature.'));
 // all requests
 const f=flt('esign','req'),list=vis.filter(r=>(!f.status||f.status==='All'||r.status===f.status)&&G.match(f,`${r.id} ${r.title} ${r.doc} ${r.createdBy} ${r.signers.map(s=>s.name).join(' ')}`)).sort((a,b)=>a.id<b.id?1:-1);
 panel('esign','all').innerHTML=cards+card(canSeeAll()?'All signature requests':'Requests I sent or must sign',canSeeAll()?'Everyone\'s requests, newest first.':'Requests you sent, and requests that name you as a signer.',toolbar('esign','req','Search by number, title, document or person',[['status',['All',...STATUSES],'All statuses']])+table(RHEAD,list.map(reqRow),'No requests match.'));
 panel('esign','all').querySelectorAll('[data-fk]').forEach(c=>c.setAttribute('aria-label',c.tagName==='SELECT'?'Filter by status':'Search requests')); // the shared toolbar has no labels
 // completed
 const crow=r=>{const d=D.doc(r.doc);return `<tr data-op="open" data-t="esreq" data-id="${E(r.id)}"><td class="riskid"><button type="button" class="op-link" data-op="open" data-t="esreq" data-id="${E(r.id)}">${E(r.id)}</button></td><td><div class="riskname">${E(r.title)}</div><div class="riskarea">${E(d?d.title:r.doc)} · version ${r.ver}</div></td><td>${E(r.signers.map(s=>s.name).join(', '))}</td><td>${E(fmt((r.completedAt||'').slice(0,10)))}</td><td><button type="button" class="op-mini" data-op="esign-cert" data-id="${E(r.id)}" aria-label="Download certificate for ${E(r.id)}">Certificate</button> <button type="button" class="op-mini" data-op="esign-verify" data-id="${E(r.id)}" data-open="1" aria-label="Verify integrity of ${E(r.id)}">Verify</button></td></tr>`};
 panel('esign','done').innerHTML=cards+card('Completed requests','Fully signed and sealed. The signed document version is locked in Documents.',table(['ID','Request','Signers','Completed',''],done.sort((a,b)=>a.completedAt<b.completedAt?1:-1).map(crow),'Nothing has been completed yet.'));
 G.setBadge&&G.setBadge('esign',mine.length);
}
G.renders.push(renderES);

// ---------------------------------------------------------------- linking, tile, parents
G.linkers.push(id=>{const r=/^SIG-\d+$/.test(id)&&X.req(id);return r?{type:'esreq',label:`${r.id} · ${r.title}`}:null});
G.parents.esreq=id=>{const r=X.req(id);return r&&G.drawers.doc&&D.doc(r.doc)?['doc',r.doc]:null};
G.fxTiles=G.fxTiles||[];
G.fxTiles.push(()=>{const n=X.waitingFor(me().name).length;
 return{id:'t-sig',g:'Documents and signatures',title:'Waiting for my signature',sub:'Signature requests',num:n,st:n?'critical':'good',foot:n?'▲ Open the E-signature screen':'✓ Nothing to sign',click:()=>{G.go('esign');G.renderAll()}}});

// ---------------------------------------------------------------- signature appearance and timeline
function appearance(s){
 if(s.status!=='Signed')return '';
 if(s.method==='drawn'&&PNG_OK(s.image))return `<img class="es-sigimg" src="${E(s.image)}" alt="Drawn signature of ${E(s.name)}"><span class="es-small">Drawn signature of ${E(s.name)}</span>`;
 return `<div class="es-sig">${E(s.typed||s.name)}</div><span class="es-small">Typed signature</span>`}
function timeline(r){
 const turn=new Set(X.pendingNow(r).map(s=>s.id));
 return `<ol class="es-tl">${[...r.signers].sort((a,b)=>r.order==='Sequential'?a.order-b.order:0).map(s=>{
  const st=s.status==='Pending'&&r.status==='Out for signature'?(turn.has(s.id)?'Pending, their turn':'Pending, waiting for earlier signers'):s.status==='Pending'?'Not signed':s.status;
  return `<li><span class="mk" aria-hidden="true">${ICON[s.status]||'◔'}</span><div><b>${E(s.name)}</b> <span class="es-tag">${s.internal?'Internal':'External'}</span> <span class="es-tag">${E(s.role)}</span>${r.order==='Sequential'?` <span class="es-tag">Order ${s.order}</span>`:''}
   <div><b>${E(st)}</b>${s.ts?` · ${E(when(s.ts))}`:''}${s.method?` · ${E(s.method)}`:''}</div>${appearance(s)}${s.status==='Declined'?`<div>Reason: ${E(s.reason)}</div>`:''}${s.sigHash?`<div class="es-small">Record <code class="es-sha" title="${E(s.sigHash)}">${E(s.sigHash.slice(0,24))}</code></div>`:''}</div></li>`}).join('')}</ol>`}
const VER={};
function verifyPanel(r){
 const v=VER[r.id];if(!v)return '';
 if(v.busy)return `<div class="op-banner amber" role="status"><div><b>Checking integrity</b><div>Recomputing checksums and signature records.</div></div></div>`;
 if(v.error)return `<div class="op-banner red" role="alert"><div><b>Could not check</b><div>${E(v.error)}</div></div></div>`;
 return v.ok?`<div class="op-banner green" role="status"><div><b>Integrity check passed</b><div>The stored document matches its checksum, ${v.sigs.length} signature record(s) are unaltered${v.sealOk===null?'':' and the completion seal is intact'}. Checked ${E(when(v.at))}.</div></div></div>`
  :`<div class="op-banner red" role="alert"><div><b>Integrity check FAILED</b><div>Do not rely on this record until the problems below are explained.<ul>${v.problems.map(p=>`<li>${E(p)}</li>`).join('')}</ul></div></div></div>`}

G.drawers.esreq=id=>{
 const r=X.req(id);if(!r||!visible().includes(r)){G.setDrawer('Signature request','Not available','<p class="op-note">This request does not exist or you cannot see it.</p>');return}
 const d=D.doc(r.doc),v=d&&D.version(d,r.ver),pend=X.pendingNow(r),mineS=mySigner(r),P=[];
 if(r.status==='Draft')P.push(['amber','This request has not been sent yet. Nobody can sign until it is sent.']);
 if(r.status==='Out for signature')pend.forEach(s=>P.push(['amber',`Waiting for <b>${E(s.name)}</b> (${E(s.role.toLowerCase())})${s.internal?'':', outside the organisation, who needs a signing link'}.`]));
 if(r.status==='Out for signature'&&r.due>=TODAY&&G.dTo&&G.dTo(r.due)<=3)P.push(['amber',`Due ${E(fmt(r.due))}. Unsigned requests expire after the due date.`]);
 r.signers.filter(s=>s.status==='Declined').forEach(s=>P.push(['red',`${E(s.name)} declined: ${E(s.reason)}`]));
 if(r.status==='Expired')P.push(['red',`The due date ${E(fmt(r.due))} passed before everyone signed. Create a new request.`]);
 const ext=r.signers.filter(s=>!s.internal&&s.status==='Pending'&&r.status==='Out for signature');
 const btn=(op,label,cls,extra)=>`<button type="button" class="op-mini ${cls||''}" data-op="${op}" data-id="${E(r.id)}"${extra||''}>${label}</button>`;
 let buttons='';
 if(mineS)buttons+=btn('esign-sign','Sign','p')+btn('esign-decline','Decline','r');
 if(r.status==='Draft'&&isOwnerOrAdmin(r))buttons+=btn('esign-send','Send for signature','p');
 if(r.status==='Out for signature'&&isOwnerOrAdmin(r))buttons+=btn('esign-remind','Send reminder');
 if(!['Completed','Cancelled'].includes(r.status)&&isOwnerOrAdmin(r))buttons+=btn('esign-cancel','Cancel request','r');
 buttons+=btn('esign-verify','Verify integrity')+(r.status==='Completed'?btn('esign-cert','Download certificate','g'):'');
 let extLinks='';
 if(ext.length&&isOwnerOrAdmin(r)){
  extLinks=live()?`<h4>Signing links for people outside the organisation</h4><p class="op-note" style="margin-top:0">Each link is private to one person, works once and expires the day after the due date. Creating a new link cancels the old one.</p><div class="op-btns">${ext.map(s=>`<button type="button" class="op-mini p" data-op="esign-link" data-id="${E(r.id)}" data-sid="${E(s.id)}" aria-label="Copy signing link for ${E(s.name)}">Copy signing link: ${E(s.name)}</button><button type="button" class="op-mini" data-op="esign-link" data-email="1" data-id="${E(r.id)}" data-sid="${E(s.id)}" aria-label="Email signing link to ${E(s.name)}">Email link</button>`).join('')}</div>`
   :`<h4>People outside the organisation</h4><div class="op-banner amber" role="note"><div><b>Signing links need the server</b><div>${E(ext.map(s=>s.name).join(', '))} can only sign through a private link, and links exist only when you are signed in to a Forge GRC server. In this browser-only demo you can preview what they would see.</div></div></div><div class="op-btns">${ext.map(s=>`<button type="button" class="op-mini" data-op="esign-preview" data-id="${E(r.id)}" data-sid="${E(s.id)}">Preview the external signing page: ${E(s.name)}</button>`).join('')}</div>`}
 const docBtn=d&&G.drawers.doc?`<button type="button" class="op-link" data-op="open" data-t="doc" data-id="${E(d.id)}">${E(d.id)} · ${E(d.title)}</button>`:E(d?`${d.id} · ${d.title}`:r.doc+' (no longer in Documents)');
 detail({kicker:'Signature request · '+r.id,title:r.title,pending:P,ok:r.status==='Completed'?'Fully signed and sealed.':r.status==='Cancelled'?'This request was cancelled.':'Nothing pending on this record.',
  todo:r.status==='Draft'?['Check the signers and the order.','Send the request.']:r.status==='Out for signature'?['Each signer opens the document, checks it and signs or declines.','Use Send reminder to nudge the signer whose turn it is.','When the last signer signs, the document is sealed and locked.']:['Verify integrity to re-check the checksum and every signature record.','Download the certificate as evidence.'],
  facts:[['Status',stPill(r.status)],['Document',docBtn],['Version',`v${r.ver}${v?' · '+E(v.name)+' · '+E(fileSize(v.size)):''}`],['Checksum (SHA-256)',`<code class="es-sha" title="${E(r.docSha)}">${E(r.docSha.slice(0,32))}</code>`],['Purpose',E(r.purpose)],['Signing order',E(r.order)],['Due',E(fmt(r.due))],['Requested by',E(r.createdBy)+' on '+E(fmt(r.created))],['Seal',r.seal?`<code class="es-sha" title="${E(r.seal.sha)}">${E(r.seal.sha.slice(0,32))}</code>`:'Not sealed yet']],
  buttons,links:[r.doc],
  extra:`${r.message?`<h4>Message to signers</h4><p style="white-space:pre-wrap">${E(r.message)}</p>`:''}<div aria-live="polite" id="esVerify">${verifyPanel(r)}</div><h4>Signers</h4>${timeline(r)}${extLinks}<h4>History</h4><div class="es-hist">${r.events.map(e=>`<div><b>${E(when(e.ts))}</b> · ${E(e.by)} · ${E(e.action)}${e.detail?': '+E(e.detail):''}</div>`).join('')}</div><p class="es-small">${E(X.LEGAL)}</p>`})};

// ---------------------------------------------------------------- dialogs (own markup, focus kept inside, Escape closes the top one)
const stack=[];
function dialog(title,html,opts){
 opts=opts||{};const prev=document.activeElement;
 const back=document.createElement('div');back.className='modalback show es-back';back.style.zIndex=40+stack.length;
 back.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="esDT${stack.length}"${opts.id?` id="${opts.id}"`:''}><div class="modalhead"><h3 id="esDT${stack.length}" tabindex="-1">${E(title)}</h3><button type="button" class="close" data-es="close" aria-label="Close dialog">×</button></div><div class="modalbody es-body">${html}</div><div class="modalfoot es-foot"></div></div>`;
 document.body.appendChild(back);
 const dlg={el:back,body:back.querySelector('.es-body'),foot:back.querySelector('.es-foot'),title:back.querySelector('h3'),onClose:opts.onClose,
  close(){const i=stack.indexOf(dlg);if(i>=0)stack.splice(i,1);try{dlg.onClose&&dlg.onClose()}catch{}back.remove();if(prev&&document.contains(prev)&&prev.focus)try{prev.focus()}catch{}}};
 back.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const f=[...back.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(x=>x.offsetParent!==null);
  if(!f.length)return;const a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}});
 back.addEventListener('click',e=>{if(e.target.closest('[data-es="close"]')||(e.target===back&&!opts.sticky))dlg.close()});
 stack.push(dlg);setTimeout(()=>{(opts.focus?back.querySelector(opts.focus):null||dlg.title)?.focus?.()},0);
 return dlg}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&stack.length){e.stopPropagation();e.preventDefault();stack[stack.length-1].close()}},true);

// ---------------------------------------------------------------- request wizard
const ROLE_OPTS=X.ROLES.map(r=>`<option>${E(r)}</option>`).join('');
function openWizard(docId){
 if(!canCreate()){toast(me().role==='Auditor'?'Auditors cannot request signatures.':'Ask a business user or administrator to create the request.');return}
 const docs=D.search('').filter(d=>D.version(d)&&(!d.sig||true)).sort((a,b)=>a.id<b.id?-1:1);
 if(!docs.length){toast('There are no documents yet. Add a document under Documents first.');return}
 const st={signers:[],titleTouched:false};
 const dlg=dialog('Request signatures',`
 <div class="op-banner amber" role="note"><div><b>Before you send</b><div>${E(X.LEGAL)}</div></div></div>
 <div class="op-form">
  <div class="field full"><label for="esw-doc">Document</label><select id="esw-doc">${docs.map(d=>`<option value="${E(d.id)}"${d.id===docId?' selected':''}>${E(d.id)} · ${E(d.title)}${d.sig?' (already signed)':''}</option>`).join('')}</select></div>
  <div class="field full"><label for="esw-ver">Version</label><select id="esw-ver" aria-describedby="esw-verh"></select><div class="es-small" id="esw-verh">A request covers one version. The signed version is locked, and its checksum is recorded.</div></div>
  <div class="field full"><label for="esw-title">Title</label><input id="esw-title" maxlength="140" autocomplete="off"></div>
  <div class="field"><label for="esw-purpose">Purpose</label><select id="esw-purpose">${X.PURPOSES.map(p=>`<option>${E(p)}</option>`).join('')}</select></div>
  <div class="field"><label for="esw-order">Signing order</label><select id="esw-order">${X.ORDERS.map(p=>`<option>${E(p)}</option>`).join('')}</select></div>
  <div class="field"><label for="esw-due">Due date</label><input id="esw-due" type="date" min="${TODAY}" value="${G.addDays(TODAY,14)}"></div>
  <div class="field full"><label for="esw-msg">Message to signers (optional)</label><textarea id="esw-msg" maxlength="600"></textarea></div>
 </div>
 <h4 id="esw-sh">Signers</h4><div id="esw-list" role="list" aria-labelledby="esw-sh"></div><p class="op-note" id="esw-empty" style="margin-top:0">No signers yet. Add at least one.</p>
 <div class="es-add">
  <fieldset><legend>Add a person from the organisation</legend><select id="esw-int" aria-label="Person in the organisation">${G.people().map(n=>`<option>${E(n)}</option>`).join('')}</select><select id="esw-ir" aria-label="Role for this person">${ROLE_OPTS}</select><button type="button" class="btn" data-es="add-int">Add person</button></fieldset>
  <fieldset><legend>Add someone outside the organisation</legend><input id="esw-xn" placeholder="Full name" aria-label="External signer full name" autocomplete="off"><input id="esw-xe" type="email" placeholder="Email address" aria-label="External signer email address" autocomplete="off"><select id="esw-xr" aria-label="Role for this external signer">${ROLE_OPTS}</select><button type="button" class="btn" data-es="add-ext">Add external signer</button></fieldset>
 </div>
 <p class="es-small" id="esw-note"></p><p class="es-err" id="esw-err" role="alert"></p>`,{focus:'#esw-doc',sticky:true});
 dlg.foot.innerHTML=`<button type="button" class="btn" data-es="close">Cancel</button><button type="button" class="btn" data-es="draft">Save as draft</button><button type="button" class="btn primary" data-es="send">Send for signature</button>`;
 const $=s=>dlg.el.querySelector(s),err=m=>{$('#esw-err').textContent=m||''};
 const curDoc=()=>D.doc($('#esw-doc').value);
 function fillDoc(){const d=curDoc(),sel=$('#esw-ver');if(!d){sel.innerHTML='';return}
  sel.innerHTML=(d.versions||[]).filter(v=>v.n===d.cur).map(v=>`<option value="${v.n}">Version ${v.n} (current) · ${E(v.name)} · ${E(fileSize(v.size))} · ${E(v.sha.slice(0,12))}</option>`).join('');sel.disabled=true;
  if(!st.titleTouched)$('#esw-title').value=('Signature: '+d.title).slice(0,140)}
 function renderList(){const seq=$('#esw-order').value==='Sequential';
  $('#esw-list').innerHTML=st.signers.length?st.signers.map((s,i)=>`<div class="es-sg" role="listitem"><div><b>${E(s.name)}</b><span class="es-tag">${s.internal?'Internal':'External'}</span>${s.internal?'':`<div class="es-small">${E(s.email)}</div>`}</div><label>Role <select data-es="role" data-i="${i}">${X.ROLES.map(r=>`<option${r===s.role?' selected':''}>${E(r)}</option>`).join('')}</select></label>${seq?`<label>Order <input type="number" min="1" max="12" data-es="ord" data-i="${i}" value="${s.order}"></label>`:'<span class="es-small">Signs at any time</span>'}<button type="button" class="btn" data-es="rm" data-i="${i}" aria-label="Remove ${E(s.name)}">Remove</button></div>`).join(''):'';$('#esw-empty').hidden=st.signers.length>0;
  $('#esw-note').textContent=seq?'Sequential: people sign in order, lowest number first. Signers with the same number sign at the same time.':'Parallel: everyone can sign at the same time.'}
 const nextOrder=()=>Math.min(12,Math.max(0,...st.signers.map(s=>s.order))+1);
 fillDoc();renderList();
 dlg.el.addEventListener('change',e=>{const t=e.target;
  if(t.id==='esw-doc'){fillDoc()}
  else if(t.id==='esw-order')renderList();
  else if(t.dataset.es==='role')st.signers[+t.dataset.i].role=t.value;
  else if(t.dataset.es==='ord')st.signers[+t.dataset.i].order=Math.max(1,Math.min(12,Math.round(+t.value||1)))});
 dlg.el.addEventListener('input',e=>{if(e.target.id==='esw-title')st.titleTouched=true});
 dlg.el.addEventListener('click',async e=>{const b=e.target.closest('[data-es]');if(!b)return;const k=b.dataset.es;
  if(k==='add-int'){const n=$('#esw-int').value;if(st.signers.some(s=>s.internal&&s.name===n)){err(n+' is already a signer.');return}err('');st.signers.push({name:n,email:'',internal:true,role:$('#esw-ir').value,order:nextOrder()});renderList()}
  else if(k==='add-ext'){const n=$('#esw-xn').value.trim(),m=$('#esw-xe').value.trim().toLowerCase();
   if(n.length<2){err('Enter the external signer\'s full name.');return}if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)){err('Enter a valid email address for '+n+'.');return}
   if(st.signers.some(s=>!s.internal&&s.email===m)){err(m+' is already a signer.');return}err('');st.signers.push({name:n,email:m,internal:false,role:$('#esw-xr').value,order:nextOrder()});$('#esw-xn').value='';$('#esw-xe').value='';renderList()}
  else if(k==='rm'){st.signers.splice(+b.dataset.i,1);renderList()}
  else if(k==='draft'||k==='send'){
   err('');if(!curDoc()){err('Choose a document.');return}if(!st.signers.length){err('Add at least one signer.');return}
   dlg.foot.querySelectorAll('button').forEach(x=>x.disabled=true);let made=null;
   try{made=await X.create(curDoc().id,st.signers.map(s=>({name:s.name,email:s.email,internal:s.internal,role:s.role,order:s.order})),{title:$('#esw-title').value.trim(),purpose:$('#esw-purpose').value,order:$('#esw-order').value,due:$('#esw-due').value,message:$('#esw-msg').value.trim()});
    if(k==='send')X.send(made.id);
    dlg.close();toast(k==='send'?`${made.id} sent for signature.`:`${made.id} saved as a draft.`);openDrawer('esreq',made.id)}
   catch(x){dlg.foot.querySelectorAll('button').forEach(y=>y.disabled=false);if(made){dlg.close();toast(`${made.id} was saved as a draft but not sent: ${x.message}`);openDrawer('esreq',made.id);return}err(x.message||'That did not work.')}}});
}

// ---------------------------------------------------------------- the signing dialog (also the demo preview of the external page)
function openSign(rid,sid,opts){
 opts=opts||{};const r=X.req(rid),s=r&&r.signers.find(x=>x.id===sid);if(!r||!s){toast('Request not found.');return}
 if(!opts.preview&&!X.canSign(r,s)){toast(s.internal&&s.name!==me().name?'This signature is for '+s.name+'.':'It is not your turn to sign yet.');return}
 const d=D.doc(r.doc),v=d&&D.version(d,r.ver);if(!v){toast('The document could not be found.');return}
 const urls=[];let viewed=false,mode='typed',ink=false,busy=false,done=false,bytesCache=null;
 const dlg=dialog(opts.preview?`Preview: signing page for ${s.name}`:`Sign: ${r.title}`,`
 ${opts.preview?`<div class="es-demo" role="note">DEMO preview of the page ${E(s.name)} would open from their private link. Nothing you do here is recorded.</div>`:''}
 <div class="op-banner amber" role="note"><div><b>Electronic signature</b><div>${E(X.LEGAL)}</div></div></div>
 <p><b>${E(r.title)}</b><br><span class="es-small">${E(r.purpose)} · requested by ${E(r.createdBy)} · due ${E(fmt(r.due))} · you sign as ${E(s.role.toLowerCase())}</span></p>${r.message?`<p style="white-space:pre-wrap">${E(r.message)}</p>`:''}
 <section aria-labelledby="esDocH"><h4 id="esDocH">Document</h4><div class="es-small">${E(v.name)} · ${E(fileSize(v.size))} · version ${r.ver} · SHA-256 <code class="es-sha">${E(r.docSha.slice(0,16))}</code></div>
  <div id="esPrev" aria-busy="true">Loading the document…</div>
  <div class="op-btns"><button type="button" class="op-mini" data-es="open">Open document</button><button type="button" class="op-mini" data-es="dl">Download</button></div>
  <p id="esRead" class="es-small" role="status"></p></section>
 <section aria-labelledby="esSigH"><h4 id="esSigH">Your signature</h4>
  <div class="es-radio" role="radiogroup" aria-label="How do you want to sign"><label><input type="radio" name="esMode" value="typed" checked> Type my name</label><label><input type="radio" name="esMode" value="drawn"> Draw my signature</label></div>
  <div id="esTyped"><label for="esTx">Type your full name exactly as shown: <b>${E(s.name)}</b></label><div class="field" style="margin:4px 0"><input id="esTx" autocomplete="off" autocapitalize="off" spellcheck="false"></div><div class="es-cursive" id="esTp" aria-hidden="true"></div></div>
  <div id="esDrawn" hidden><canvas id="esCv" class="es-cv" width="520" height="170" aria-label="Signature drawing area. If you cannot draw, choose Type my name instead." aria-describedby="esCvH"></canvas><div class="op-btns" style="margin:6px 0"><button type="button" class="op-mini" data-es="clear">Clear</button></div><p class="es-small" id="esCvH">Draw with your mouse, finger or stylus. Prefer to type, or cannot draw? Choose "Type my name" above; it is equally valid.</p></div>
 </section>
 <label class="es-consent"><input type="checkbox" id="esCons"><span>${E(CONSENT)}</span></label>
 <p id="esNeed" class="es-small" role="status"></p><p class="es-err" id="esErr" role="alert"></p>`,{focus:'#esTx',sticky:true,onClose(){urls.forEach(u=>{try{URL.revokeObjectURL(u)}catch{}})}});
 dlg.foot.innerHTML=`<button type="button" class="btn" data-es="close" id="esCancel">Cancel</button><button type="button" class="btn primary" id="esGo" data-es="go" disabled aria-describedby="esNeed">Sign</button>`;
 const $=q=>dlg.el.querySelector(q);
 function update(){
  const typedOk=norm($('#esTx').value)===norm(s.name),signOk=mode==='typed'?typedOk:ink,cons=$('#esCons').checked,need=[];
  if(!viewed)need.push('open or scroll through the whole document');if(!signOk)need.push(mode==='typed'?'type your name exactly as shown':'draw your signature');if(!cons)need.push('tick the consent box');
  $('#esGo').disabled=busy||done||need.length>0;$('#esNeed').textContent=need.length?'Still needed: '+need.join('; ')+'.':'Ready to sign.';
  $('#esTp').textContent=mode==='typed'?$('#esTx').value:''}
 function markViewed(){if(viewed)return;viewed=true;$('#esRead').textContent='Document viewed.';
  if(!opts.preview){try{const rr=X.req(r.id);if(rr&&!rr.events.some(e=>e.action==='viewed'&&e.by===me().name)){rr.events.push({ts:new Date().toISOString(),by:me().name,action:'viewed',detail:`${s.name} viewed ${rr.doc} v${rr.ver}`});logIt('ESIGN',`${s.name} viewed ${rr.id}`);commit()}}catch(e){console.warn(e)}}
  update()}
 // preview (own small code): text, image, PDF
 (async()=>{const box=$('#esPrev');
  try{bytesCache=await D.bytes(r.doc,r.ver)}catch{bytesCache=null}
  box.removeAttribute('aria-busy');
  if(!bytesCache){box.innerHTML='<p class="es-err">The document file could not be loaded, so it cannot be signed. Tell the sender.</p>';return}
  const mime=String(v.mime||'').toLowerCase(),name=v.name||'document';
  const isTxt=/^text\/(?!html)|json|xml/.test(mime)||/\.(txt|md|csv)$/i.test(name),isImg=/^image\/(png|jpeg|gif|webp)$/.test(mime),isPdf=mime==='application/pdf'||/\.pdf$/i.test(name);
  if(isTxt){const big=bytesCache.length>300000,pre=document.createElement('pre');pre.className='es-pre';pre.tabIndex=0;pre.setAttribute('role','region');pre.setAttribute('aria-label','Document text. Scroll to the end to continue.');pre.textContent=new TextDecoder().decode(bytesCache.slice(0,300000));
   box.textContent='';box.appendChild(pre);if(big)box.insertAdjacentHTML('beforeend','<p class="es-small">Only the first part is shown. Open or download the document to read all of it.</p>');
   const chk=()=>{if(!big&&pre.clientHeight>0&&pre.scrollTop+pre.clientHeight>=pre.scrollHeight-6)markViewed()};pre.addEventListener('scroll',chk);
   $('#esRead').textContent='Scroll to the end of the document, or open it, to enable signing.';requestAnimationFrame(()=>requestAnimationFrame(chk))}
  else if(isImg){const fr=new FileReader();fr.onload=()=>{const im=new Image();im.className='es-img';im.alt='Document image: '+name;im.onload=markViewed;im.src=fr.result;box.textContent='';box.appendChild(im)};fr.readAsDataURL(new Blob([bytesCache],{type:mime}))}
  else if(isPdf){const u=URL.createObjectURL(new Blob([bytesCache],{type:'application/pdf'}));urls.push(u);box.innerHTML=`<iframe class="es-pdf" title="PDF preview of ${E(name)}" src="${u}"></iframe><p class="es-small">If the preview is blank, use Open document.</p>`;$('#esRead').textContent='Use Open document or Download to read the PDF, then continue.'}
  else{box.innerHTML='<p>A preview is not available for this file type.</p>';$('#esRead').textContent='Download the document and read it, then continue.'}})();
 const bytesOrNull=()=>bytesCache;
 function openIt(download){const b=bytesOrNull();if(!b){toast('The document file could not be loaded.');return}
  const mime=String(v.mime||'').toLowerCase(),safe=/^image\/(png|jpeg|gif|webp)$/.test(mime)||mime==='application/pdf'?mime:'text/plain';
  const u=URL.createObjectURL(new Blob([b],{type:download?'application/octet-stream':(/^text\//.test(mime)||/json|xml/.test(mime)?'text/plain':safe)}));urls.push(u);
  if(download||!(/^(image\/(png|jpeg|gif|webp)|application\/pdf)$/.test(mime)||/^text\/|json|xml/.test(mime))){const a=document.createElement('a');a.href=u;a.download=v.name||'document';document.body.appendChild(a);a.click();a.remove()}
  else window.open(u,'_blank','noopener');
  markViewed()}
 // drawing
 const cv=$('#esCv'),cx=cv.getContext('2d');cx.lineWidth=2.6;cx.lineCap='round';cx.lineJoin='round';cx.strokeStyle='#14231b';let down=false,lx=0,ly=0;
 const pos=e=>{const b=cv.getBoundingClientRect();return[(e.clientX-b.left)*cv.width/b.width,(e.clientY-b.top)*cv.height/b.height]};
 cv.addEventListener('pointerdown',e=>{e.preventDefault();down=true;[lx,ly]=pos(e);try{cv.setPointerCapture(e.pointerId)}catch{}cx.beginPath();cx.arc(lx,ly,1.2,0,6.3);cx.fillStyle='#14231b';cx.fill();ink=true;update()});
 cv.addEventListener('pointermove',e=>{if(!down)return;e.preventDefault();const[x,y]=pos(e);cx.beginPath();cx.moveTo(lx,ly);cx.lineTo(x,y);cx.stroke();lx=x;ly=y});
 const up=()=>{down=false};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);cv.addEventListener('pointerleave',up);
 const clear=()=>{cx.clearRect(0,0,cv.width,cv.height);ink=false;update()};
 function exportPng(){for(const w of [360,260,180]){const o=document.createElement('canvas');o.width=w;o.height=Math.round(w*cv.height/cv.width);const c=o.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,o.width,o.height);c.drawImage(cv,0,0,o.width,o.height);const u=o.toDataURL('image/png');if(u.length<58000)return u}return ''}
 dlg.el.addEventListener('change',e=>{const t=e.target;if(t.name==='esMode'){mode=t.value;$('#esTyped').hidden=mode!=='typed';$('#esDrawn').hidden=mode!=='drawn';update()}else if(t.id==='esCons')update()});
 dlg.el.addEventListener('input',e=>{if(e.target.id==='esTx')update()});
 dlg.el.addEventListener('click',async e=>{const b=e.target.closest('[data-es]');if(!b)return;const k=b.dataset.es;
  if(k==='open')openIt(false);else if(k==='dl')openIt(true);else if(k==='clear')clear();
  else if(k==='go'){
   $('#esErr').textContent='';busy=true;update();
   try{
    if(opts.preview){await sleep(150);finish(null)}
    else{await X.sign(r.id,s.id,{method:mode,typed:$('#esTx').value,image:mode==='drawn'?exportPng():'',consent:$('#esCons').checked});finish(X.req(r.id))}}
   catch(x){busy=false;$('#esErr').textContent=x.message||'Could not sign.';update()}}});
 function finish(rr){
  done=true;busy=false;dlg.title.textContent=opts.preview?'Preview complete':'Signed';
  const rows=rr?rr.signers.map(x=>`<tr><td>${E(x.name)}${x.internal?'':' (external)'}<br><span class="es-small">${E(x.role)}</span></td><td>${E(ICON[x.status]||'')} ${E(x.status)}</td><td>${E(when(x.ts))}</td><td>${E(x.method||'')}</td></tr>`).join(''):'';
  dlg.body.innerHTML=opts.preview?`<div class="es-demo" role="note">DEMO preview</div><div class="op-banner green" role="status"><div><b>This is where ${E(s.name)} sees the thank-you page</b><div>No signature was recorded. In the live product the signing link is used once and the request updates for everyone straight away.</div></div></div>`
   :`<div class="op-banner green" role="status"><div><b>Your signature is recorded</b><div>${rr.status==='Completed'?'Everyone has signed. The request is sealed and the signed version is locked in the Documents screen.':'Waiting for '+E(X.pendingNow(rr).map(x=>x.name).join(', ')||'the remaining signers')+'.'}</div></div></div>
   ${rr.status==='Completed'?`<h4>Certificate of completion</h4><p class="es-small">${E(rr.title)} · ${E(rr.id)} · completed ${E(when(rr.completedAt))}<br>Document SHA-256 <code class="es-sha">${E(rr.docSha)}</code>${rr.seal?`<br>Seal <code class="es-sha">${E(rr.seal.sha)}</code>`:''}</p><div class="tablewrap"><table><thead><tr><th>Signer</th><th>Status</th><th>Time</th><th>Method</th></tr></thead><tbody>${rows}</tbody></table></div>`:''}
   <p class="es-small">${E(X.LEGAL)}</p>`;
  dlg.foot.innerHTML=(!opts.preview&&rr&&rr.status==='Completed'?`<button type="button" class="btn" data-es="cert">Download certificate</button>`:'')+`<button type="button" class="btn primary" data-es="close">Close</button>`;
  dlg.foot.querySelectorAll('[data-es=cert]').forEach(c=>c.onclick=()=>X.downloadCertificate(rr.id));dlg.title.focus()}
 update();
}

// ---------------------------------------------------------------- links for external signers (live mode)
async function issueLink(r,s,email){
 for(let i=0;i<8;i++){
  const x=await G.api.call('POST','/api/sign/issue',{profile:G.PROF,req:r.id,signer:s.id,email:!!email});
  if(x.ok)return x.data;
  if(x.status!==404)throw new Error(x.data.error||'Could not create the link.');
  await sleep(700)}
 throw new Error('The request has not reached the server yet. Try again in a moment.')}
function openF(title,fields,label,cb){openForm(title,fields,label,cb);
 [...document.querySelectorAll('#opFB .field')].forEach((f,i)=>{const l=f.querySelector('label'),c=f.querySelector('input,select,textarea');if(l&&c){c.id='esf-'+i;l.htmlFor=c.id}});
 const m=document.querySelector('#opForm .modal');if(m){m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-labelledby','opFT')}}
const fail=e=>toast((e&&e.message)||'That did not work.');

// ---------------------------------------------------------------- actions
Object.assign(actions,{
 'esign-new':b=>openWizard(b&&b.dataset&&b.dataset.id||''),
 'esign-sign':b=>{const r=X.req(b.dataset.id);if(!r)return;const s=mySigner(r);if(!s){toast('It is not your turn to sign, or this request is closed.');return}openSign(r.id,s.id)},
 'esign-preview':b=>openSign(b.dataset.id,b.dataset.sid,{preview:true}),
 'esign-decline':b=>{const r=X.req(b.dataset.id);if(!r)return;const s=mySigner(r);if(!s){toast('You cannot decline this request now.');return}
  openF('Decline to sign',[{name:'reason',label:'Reason (the requester will see it)',type:'textarea',full:true}],'Decline',v=>{try{X.decline(r.id,s.id,v.reason);toast('You declined '+r.id+'.')}catch(e){return e.message}})},
 'esign-send':b=>{try{X.send(b.dataset.id);toast(b.dataset.id+' sent for signature.')}catch(e){fail(e)}},
 'esign-remind':b=>{try{const p=X.remind(b.dataset.id);toast('Reminder recorded for '+p.map(s=>s.name).join(', ')+'. They see the request under Waiting for me.')}catch(e){fail(e)}},
 'esign-cancel':b=>{const r=X.req(b.dataset.id);if(!r)return;
  openF('Cancel this request',[{name:'reason',label:'Reason (optional)',type:'textarea',full:true}],'Cancel request',v=>{try{X.cancel(r.id,v.reason);toast(r.id+' cancelled.')}catch(e){return e.message}})},
 'esign-verify':async b=>{const id=b.dataset.id;VER[id]={busy:true};if(b.dataset.open)openDrawer('esreq',id);else G.renderAll();
  try{const x=await X.verify(id);VER[id]={...x,at:new Date().toISOString()}}catch(e){VER[id]={error:e.message}}
  G.renderAll();const p=document.getElementById('esVerify');if(p&&p.scrollIntoView)p.scrollIntoView({block:'nearest'})},
 'esign-cert':b=>{try{X.downloadCertificate(b.dataset.id)}catch(e){fail(e)}},
 'esign-link':async b=>{const r=X.req(b.dataset.id),s=r&&r.signers.find(x=>x.id===b.dataset.sid);if(!r||!s)return;
  if(!live()){toast('Signing links need the server. Sign in to Forge GRC first, or use the preview.');return}
  try{const out=await issueLink(r,s,!!b.dataset.email);const url=location.origin+out.url;
   r.events.push({ts:new Date().toISOString(),by:me().name,action:'link issued',detail:s.name+(out.emailed==='sent'?' (emailed)':'')});commit();
   if(b.dataset.email){toast(out.emailed==='sent'?`The link was emailed to ${s.email}.`:out.emailed==='email is not set up'?'Email is not set up on this server (FORGE_SMTP_URL). Copy the link instead.':'The email could not be sent. Copy the link instead.')}
   openF('Signing link for '+s.name,[{name:'u',label:`Private link, valid until ${fmt(out.expires)}. It works once, so send it only to ${s.name}. It is shown now only; you can create a new one at any time (the old one then stops working).`,value:url,full:true}],'Copy link',()=>{try{navigator.clipboard.writeText(url).then(()=>toast('Link copied.'),()=>toast('Select the link and copy it.'))}catch{toast('Select the link and copy it.')}});
   const inp=document.querySelector('#opFB [name=u]');if(inp){inp.readOnly=true;inp.select()}}
  catch(e){fail(e)}}
});
X.openSign=openSign;X.openWizard=openWizard;
})();
