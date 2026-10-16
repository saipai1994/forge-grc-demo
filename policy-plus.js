// policy-plus: policy management on top of the Policies screen (openpages-modules.js).
// Managed documents (G.dms), approval chains with e-signature (G.esign), hierarchy, review cycle, attestation
// campaigns with evidence, obligation coverage, and the policy template library (window.GRC_POLICY_TEMPLATES).
// Extra fields on S().policies records: doc, reviewMonths, parent, obls[], vmap{docVersion:label}, fresh, chain,
// chainCfg, chainHist[], camps[], attLog[], pub{ver,docVer,sha,ts,by}, reqSig, desc, tpl, lastReviewed, rem[].
// Public: G.policyDue(days) -> [{id,title,due,owner,days,overdue}], G.policyPlus (helpers used by tests).
(function(){
const G=window.GRC;if(!G||!G.dms)return;
const {E,fmt,pill,own,table,card,kpi,bar,TODAY,toast,logIt,commit,actions,openDrawer,panel,dTo,me,csv}=G;
const D=G.dms,S=()=>G.S();
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const P=()=>{const s=S();return Array.isArray(s&&s.policies)?s.policies:[]};
const find=id=>P().find(p=>p.id===id);
const isAdmin=()=>me().role==='Administrator',canAct=o=>isAdmin()||me().name===o;
const people=()=>G.people();
const wu=()=>typeof workflowUsers!=='undefined'?workflowUsers:[];
const roleOf=n=>(wu().find(u=>u.name===n)||{}).role||'';
const unitOf=n=>{const s=(wu().find(u=>u.name===n)||{}).scope||'';return s.split('·')[0].trim()||'General'};
const errMsg=e=>(e&&e.message)||String(e);
const nowIso=()=>new Date().toISOString();
const short=s=>s?String(s).slice(0,12):'';
const addMonths=(iso,n)=>{const [y,m,d]=iso.split('-').map(Number);const t=new Date(Date.UTC(y,m-1+n,1)),last=new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()+1,0)).getUTCDate();return `${t.getUTCFullYear()}-${String(t.getUTCMonth()+1).padStart(2,'0')}-${String(Math.min(d,last)).padStart(2,'0')}`};
// G.addDays (openpages-modules.js) is one day too long (dayN rounds a midday time up); use an exact helper here
const plusDays=(iso,n)=>new Date(Date.parse(iso+'T00:00:00Z')+n*864e5).toISOString().slice(0,10);
const rmOf=p=>Math.max(1,Math.min(60,Math.round(+p.reviewMonths)||12));
const verParts=v=>{const m=String(v||'0.1').split('.').map(x=>parseInt(x,10)||0);return[m[0]||0,m[1]||0]};
const isE=()=>!!(G.esign&&G.esign.create&&G.esign.send);
const TYPES=['Policy','Standard','Procedure','Guideline','SOP','Plan'];
const NEEDPARENT=['Standard','Procedure'];
const docOf=p=>p&&p.doc&&S().dmsDocs!==undefined?D.doc(p.doc):null;
const curV=p=>{const d=docOf(p);return d?D.version(d):null};
const polOverdue=p=>p.status==='Published'&&p.review&&p.review<TODAY;
const polSt=p=>polOverdue(p)?'Review overdue':p.status;
const attCount=p=>(p.att||0)+(p.attBy||[]).length,attPct=p=>p.aud?Math.round(attCount(p)/p.aud*100):0;
const SK={Draft:'blue','In review':'amber',Approved:'blue',Published:'green','Review overdue':'red'};
const btn=(op,label,attrs,cls)=>`<button class="${cls||'op-mini'}" data-op="${op}" ${attrs||''}>${E(label)}</button>`;
const notify=(who,title,ref)=>{const f=G.notify||(G.api&&G.api.notify);if(typeof f==='function'&&G.api&&G.api.connected){try{f({who,title,ref});return true}catch{}}return !!(G.api&&G.api.connected)}; // connected: the server turns the reminder recorded on the policy into a notification (bell, chat, email)

// ---------------------------------------------------------------- styles
const css=document.createElement('style');css.textContent=`
.pp-kpis{grid-template-columns:repeat(3,1fr)}@media(max-width:760px){.pp-kpis{grid-template-columns:repeat(2,1fr)}}
.pp-sec{border-top:1px solid #edf0f3;margin-top:16px;padding-top:2px}.pp-sec h4{margin:12px 0 6px}
.pp-l{display:grid;grid-template-columns:20px 1fr;gap:4px;font:11px/1.55 'DM Mono',monospace;padding:1px 6px;white-space:pre-wrap;word-break:break-word}
.pp-add{background:#e7f4f1;color:#14544a;text-decoration:underline}.pp-del{background:#fcebea;color:#7a2f2a;text-decoration:line-through}.pp-gap{color:#5d6773;font-style:italic}
.pp-red{border:1px solid #e1e6ec;border-radius:7px;padding:6px 0;margin:8px 0;max-height:360px;overflow:auto;background:#fff}
.pp-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.pp-tree,.pp-tree ul{list-style:none;margin:0;padding-left:22px;border-left:1px dashed #cfd8e0}.pp-tree{border:0;padding-left:0}.pp-tree li{margin:6px 0}
.pp-node{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.pp-chk{display:flex;gap:7px;align-items:center;font-size:11px;margin:3px 0}.pp-checks{max-height:170px;overflow:auto;border:1px solid #e1e6ec;border-radius:6px;padding:6px 9px}
.pp-lab{font-size:10px;font-weight:600;margin-bottom:5px;color:#4b5a6b}
.pp-cmp{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}.pp-cmp select{max-width:220px}
.pp-fine{font-size:9.5px;color:#5d6773;line-height:1.55}
#ppDlg textarea,#ppDlg input,#ppDlg select{width:100%}#ppDlg .pp-chk input{width:auto}
`;document.head.appendChild(css);

// ---------------------------------------------------------------- dialog with labelled controls, checkboxes and async submit
let DLG=null;
function closeDlg(){if(DLG){DLG.remove();DLG=null}}
function dlg(o){
 closeDlg();const back=document.createElement('div');back.className='modalback show';back.id='ppDlg';back.style.zIndex=45;
 const fld=f=>{const id='ppf-'+f.name,v=f.value;let c;
  if(f.type==='select')c=`<select id="${id}" name="${f.name}">${f.options.map(op=>{const a=Array.isArray(op)?op:[op,op];return `<option value="${E(a[0])}"${String(a[0])===String(v)?' selected':''}>${E(a[1])}</option>`}).join('')}</select>`;
  else if(f.type==='textarea')c=`<textarea id="${id}" name="${f.name}" rows="${f.rows||4}"${f.mono?' style="font-family:\'DM Mono\',monospace;font-size:11px;line-height:1.5"':''}>${E(v||'')}</textarea>`;
  else if(f.type==='checks')c=`<div class="pp-checks" role="group" aria-labelledby="${id}-l">${f.options.length?f.options.map(op=>{const a=Array.isArray(op)?op:[op,op];return `<label class="pp-chk"><input type="checkbox" name="${f.name}" value="${E(a[0])}"${(v||[]).includes(a[0])?' checked':''}> ${E(a[1])}</label>`}).join(''):'<span class="op-note">Nothing to choose from.</span>'}</div>`;
  else if(f.type==='check')c=`<label class="pp-chk"><input type="checkbox" id="${id}" name="${f.name}"${v?' checked':''}> ${E(f.text||f.label)}</label>`;
  else c=`<input id="${id}" name="${f.name}" type="${f.type||'text'}" value="${E(v==null?'':v)}" placeholder="${E(f.ph||'')}"${f.min!=null?` min="${f.min}"`:''}${f.max!=null?` max="${f.max}"`:''}>`;
  const lab=f.type==='check'?'':f.type==='checks'?`<div class="pp-lab" id="${id}-l">${E(f.label)}</div>`:`<label for="${id}">${E(f.label)}</label>`;
  return `<div class="field${f.half?'':' full'}">${lab}${c}${f.help?`<div class="op-note">${E(f.help)}</div>`:''}</div>`};
 back.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="ppDlgT" style="width:min(${o.wide?760:600}px,100%);max-height:90vh;overflow:auto"><div class="modalhead"><h3 id="ppDlgT">${E(o.title)}</h3><button class="close" data-pp="x" aria-label="Close dialog">×</button></div><div class="modalbody">${o.note?`<p class="op-note" style="margin:0 0 10px">${o.note}</p>`:''}<div class="op-form">${(o.fields||[]).map(fld).join('')}</div><div id="ppErr" role="alert" style="color:#8f3a35;font-size:10.5px;font-weight:600;min-height:14px"></div></div><div class="modalfoot"><button class="btn" data-pp="x">Cancel</button><button class="btn primary" id="ppFS">${E(o.submit||'Save')}</button></div></div>`;
 const read=()=>{const v={};(o.fields||[]).forEach(f=>{if(f.type==='checks')v[f.name]=$$(`input[name="${f.name}"]:checked`,back).map(x=>x.value);else if(f.type==='check')v[f.name]=!!$(`[name="${f.name}"]`,back).checked;else{const el=$(`[name="${f.name}"]`,back);v[f.name]=el?(f.raw?el.value:el.value.trim()):''}});return v};
 back.addEventListener('click',async e=>{
  if(e.target===back||e.target.closest('[data-pp="x"]')){closeDlg();return}
  if(e.target.closest('#ppFS')){const b=$('#ppFS',back),er=$('#ppErr',back);b.disabled=true;er.textContent='';let r;try{r=await o.onSubmit(read())}catch(x){r=errMsg(x)}b.disabled=false;if(typeof r==='string'){er.textContent=r;return}closeDlg()}});
 document.body.appendChild(back);DLG=back;const first=$('input:not([type=checkbox]),select,textarea,input',back);if(first)first.focus()}
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&DLG){e.stopPropagation();closeDlg()}},true);

// ---------------------------------------------------------------- migration and seeds
const SEEDPARENT={'POL-005':['Chemical Handling SOP','POL-001']};
function migrate(){let ch=false;const hasDocs=S().dmsDocs!==undefined;
 P().forEach(p=>{
  if(p.reviewMonths===undefined){p.reviewMonths=12;ch=true}
  if(p.parent===undefined){const sp=SEEDPARENT[p.id];p.parent=sp&&sp[0]===p.title&&find(sp[1])?sp[1]:'';ch=true}
  if(!Array.isArray(p.obls)){p.obls=[];ch=true}
  if(!Array.isArray(p.attLog)){p.attLog=[];ch=true}
  if(!Array.isArray(p.camps)){p.camps=[];ch=true}
  if(!Array.isArray(p.attBy)){p.attBy=[];ch=true}
  if(!p.vmap||typeof p.vmap!=='object'){p.vmap={};ch=true}
  if(p.doc===undefined&&hasDocs){const d=D.docs().find(x=>(x.linked||[]).includes(p.id)&&x.type==='Policy'&&x.status!=='Archived');p.doc=d?d.id:'';if(d)p.vmap[d.cur]=p.ver;ch=true}
 });
 if(ch)G.save()}

// ---------------------------------------------------------------- coverage (obligations to policies to controls)
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
function cover(){
 const obl=S().obl||[],ps=P(),lib=(window.GRC_LIB&&window.GRC_LIB.frameworks)||[],libBy={};lib.forEach(f=>libBy[f.id]=f);
 const pk=ps.map(p=>new Set((p.fw||[]).map(norm).filter(Boolean)));
 const rows=obl.map(o=>{const f=libBy[o.fw]||{},keys=[o.fw,f.code,f.name].map(norm).filter(Boolean);
  const pols=ps.filter((p,i)=>(p.obls||[]).includes(o.id)||keys.some(k=>pk[i].has(k)));
  const ctrls=[...new Set(pols.flatMap(p=>p.ctrls||[]))];
  return{o,fwName:f.code||f.name||o.fw,pols,ctrls,cov:!pols.length?'No policy':!ctrls.length?'Policy, no control':'Covered'}});
 const has=new Set();rows.forEach(r=>r.pols.forEach(p=>has.add(p.id)));
 return{rows,gaps:rows.filter(r=>!r.pols.length),noObl:ps.filter(p=>!has.has(p.id)),oblsOf:p=>rows.filter(r=>r.pols.includes(p)).map(r=>r.o)}}

// ---------------------------------------------------------------- text diff (line based)
function diffLines(a,b){
 const A=String(a).split('\n'),B=String(b).split('\n');let s=0;while(s<A.length&&s<B.length&&A[s]===B[s])s++;
 let ea=A.length,eb=B.length;while(ea>s&&eb>s&&A[ea-1]===B[eb-1]){ea--;eb--}
 const a2=A.slice(s,ea),b2=B.slice(s,eb),n=a2.length,m=b2.length;let mid=[];
 if(n*m>4e6){mid=[...a2.map(x=>['-',x]),...b2.map(x=>['+',x])]}
 else{const w=m+1,L=new Uint16Array((n+1)*w);
  for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)L[i*w+j]=a2[i]===b2[j]?L[(i+1)*w+j+1]+1:Math.max(L[(i+1)*w+j],L[i*w+j+1]);
  let i=0,j=0;while(i<n&&j<m){if(a2[i]===b2[j]){mid.push(['=',a2[i]]);i++;j++}else if(L[(i+1)*w+j]>=L[i*w+j+1]){mid.push(['-',a2[i]]);i++}else{mid.push(['+',b2[j]]);j++}}
  while(i<n)mid.push(['-',a2[i++]]);while(j<m)mid.push(['+',b2[j++]])}
 return[...A.slice(0,s).map(x=>['=',x]),...mid,...A.slice(ea).map(x=>['=',x])]}
function redlineHtml(ops,la,lb){
 const add=ops.filter(o=>o[0]==='+').length,del=ops.filter(o=>o[0]==='-').length,keep=new Array(ops.length).fill(false);
 ops.forEach((o,i)=>{if(o[0]!=='='){for(let k=Math.max(0,i-2);k<=Math.min(ops.length-1,i+2);k++)keep[k]=true}});
 let out='',gap=0;const flush=()=>{if(gap){out+=`<div class="pp-l pp-gap"><span aria-hidden="true">…</span><span>${gap} unchanged line${gap===1?'':'s'}</span></div>`;gap=0}};
 ops.forEach((o,i)=>{if(!keep[i]&&o[0]==='='){gap++;return}flush();const t=E(o[1])||'&nbsp;';
  out+=o[0]==='+'?`<div class="pp-l pp-add"><span aria-hidden="true">+</span><span><span class="pp-sr">Added: </span>${t}</span></div>`:o[0]==='-'?`<div class="pp-l pp-del"><span aria-hidden="true">-</span><span><span class="pp-sr">Removed: </span>${t}</span></div>`:`<div class="pp-l"><span aria-hidden="true"> </span><span>${t}</span></div>`});flush();
 return `<div class="op-note" id="ppRlSum" style="margin:6px 0">Comparing ${E(la)} with ${E(lb)}: <b>${add} line${add===1?'':'s'} added</b> (marked +, underlined), <b>${del} line${del===1?'':'s'} removed</b> (marked -, struck through).</div>${add||del?`<div class="pp-red" tabindex="0" role="region" aria-label="Text comparison">${out}</div>`:'<p class="op-note">The two versions have the same text.</p>'}`}

// ---------------------------------------------------------------- templates
const tpls=()=>(Array.isArray(window.GRC_POLICY_TEMPLATES)?window.GRC_POLICY_TEMPLATES:[]).filter(t=>t&&t.id&&t.title);
const SECTOR_OF={bfsi:'BFSI',insurance:'Insurance',healthcare:'Healthcare',fintech:'Fintech & crypto',itsaas:'Cloud & SaaS',realestate:'Real estate & construction',logistics:'Transport & logistics',general:'IT / Corporate'};
const mySector=()=>{const P_=G.P||{};return P_.templateSector||SECTOR_OF[P_.id]||''};
const mapType=t=>({Policy:'Policy',Standard:'Standard',Procedure:'Procedure',Guideline:'Guideline',Charter:'Policy'}[t]||'Policy');
const docType=t=>({Policy:'Policy',Standard:'Standard',Procedure:'Procedure',SOP:'Procedure'}[t]||'Other');
const NOTICE='Template starting point. It must be reviewed by Legal and Compliance before approval, and jurisdiction-specific requirements must be inserted.';
function secText(s){return `${s.h||s.title||''}\n${s.t||s.text||''}${Array.isArray(s.items)?s.items.map(i=>'- '+i).join('\n'):''}`.replace(/\n+$/,'')}
function tplText(t,p){
 const L=[t.title,'='.repeat(Math.min(60,t.title.length)),'',NOTICE,''];
 if(p)L.push(`Document ${p.id} | ${p.type} | Version ${p.ver} | Owner ${p.owner}`,'');
 const secs=Array.isArray(t.sections)?t.sections:[];
 if(!secs.length){if(t.purpose)L.push('Purpose',t.purpose,'');if(t.scope)L.push('Scope',t.scope,'')}
 secs.forEach(s=>L.push(secText(s),''));
 if((t.controls||[]).length)L.push('Appendix A. Suggested controls',...t.controls.map(c=>'- '+c),'');
 if((t.kpis||[]).length)L.push('Appendix B. Key indicators',...t.kpis.map(c=>'- '+c),'');
 if((t.placeholders||[]).length)L.push('Placeholders to complete',...t.placeholders.map(c=>'- '+c),'');
 return L.join('\n')}
const blankText=p=>`${p.title}\n${'='.repeat(Math.min(60,p.title.length))}\n\nDocument ${p.id} | ${p.type} | Version ${p.ver} | Owner ${p.owner}\n\n1. Purpose\n[Describe why this ${p.type.toLowerCase()} exists.]\n\n2. Scope\n[Who and what it applies to.]\n\n3. Requirements\n[State the rules.]\n\n4. Roles and responsibilities\n[Name the roles.]\n\n5. Review\nThis document is reviewed every ${rmOf(p)} months.\n`;
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50)||'policy';
const fwLabel=id=>{const f=((window.GRC_LIB||{}).frameworks||[]).find(x=>x.id===id);return f?(f.code||f.name):id};

// ---------------------------------------------------------------- document sync and versions
function syncDoc(p){const d=docOf(p);if(!d)return;const st={Draft:'Draft','In review':'In review',Approved:'Approved',Published:'Published'}[p.status];if(!st||d.status===st)return;try{D.update(d.id,{status:st})}catch{d.status=st}}
function bumpMinor(p){const [a,b]=verParts(p.ver);p.ver=`${a}.${b+1}`}
function snapOf(p){if(p.pub&&p.pub.ver===p.ver)return p.pub;const v=curV(p);return{ver:p.ver,docVer:v?v.n:0,sha:v?v.sha:''}}
function resetDraft(p,why){ // a published or approved policy goes back to draft
 const wasPub=p.status==='Published';p.status='Draft';
 if(wasPub){p.att=0;p.attBy=[];p.camps.forEach(c=>{if(c.status==='Open')c.status='Superseded'})}
 if(p.chain&&p.chain.esReq&&isE()){try{const r=G.esign.req(p.chain.esReq);if(r&&r.status==='Out for signature')G.esign.cancel(r.id,why||'Document edited')}catch{}}
 if(p.chain&&!['done','changes','declined','cancelled'].includes(p.chain.stage)){p.chain.stage='changes';p.chain.note=why||'Document edited during review'}}

// ---------------------------------------------------------------- approval chain
const openCamp=p=>(p.camps||[]).filter(c=>c.status==='Open').slice(-1)[0]||null;
const latestCamp=p=>(p.camps||[]).filter(c=>c.status!=='Superseded').slice(-1)[0]||null;
function openSubmit(p){
 if(!canAct(p.owner))return toast(`Only ${p.owner} or an administrator can submit this draft.`);
 const cfg=p.chainCfg||{},others=people().filter(n=>n!==p.owner),hasDoc=!!docOf(p);
 dlg({title:p.status==='Draft'?'Submit for review':'Set up approval chain',wide:true,submit:'Submit',
  note:`Reviewers check the content first. The approvers then give final approval. The owner (${E(p.owner)}) cannot review or approve their own document.`,
  fields:[{name:'reviewers',label:'Reviewers',type:'checks',options:others,value:cfg.reviewers||[]},
   {name:'rmode',label:'Reviewer rule',type:'select',options:[['any','Any one reviewer can approve'],['all','All reviewers must approve']],value:cfg.rmode||'any',half:true},
   {name:'approvers',label:'Approvers',type:'checks',options:others,value:cfg.approvers||[]},
   {name:'reqSig',type:'check',label:'Require e-signature for final approval',text:'Require e-signature for final approval (uses the managed document)',value:cfg.reqSig!==undefined?cfg.reqSig:(isE()&&hasDoc),help:isE()?(hasDoc?'The approvers sign the current document version.':'Create the managed document first to use e-signature.'):'E-signature is not available here; approvers approve in the app.'}],
  onSubmit:v=>submitChain(p,v)})}
function submitChain(p,v){
 if(!v.approvers.length)return 'Choose at least one approver.';
 if(v.approvers.some(n=>n===p.owner)||v.reviewers.some(n=>n===p.owner))return 'Segregation of duties: the owner cannot be a reviewer or approver.';
 if(v.reviewers.some(n=>v.approvers.includes(n)))return 'A person cannot be both a reviewer and an approver.';
 if(v.reqSig){if(!isE())return 'E-signature is not available. Untick the e-signature option.';if(!docOf(p)||!curV(p))return 'Create the managed document first, or untick the e-signature option.'}
 const dv=curV(p),old=p.chain;if(old){(p.chainHist=p.chainHist||[]).push({round:old.round,stage:old.stage,by:old.by,started:old.started});p.chainHist=p.chainHist.slice(-5)}
 p.chain={round:old?old.round+1:1,by:me().name,started:nowIso(),rmode:v.rmode==='all'?'all':'any',reqSig:!!v.reqSig,stage:v.reviewers.length?'review':'approval',esReq:'',docVer:dv?dv.n:0,docSha:dv?dv.sha:'',
  steps:[...v.reviewers.map(n=>({kind:'Review',who:n,status:'Pending',ts:'',comment:'',by:''})),...v.approvers.map(n=>({kind:'Approval',who:n,status:'Pending',ts:'',comment:'',by:''}))]};
 p.chainCfg={reviewers:v.reviewers,approvers:v.approvers,rmode:p.chain.rmode,reqSig:!!v.reqSig};p.reqSig=!!v.reqSig;
 p.status='In review';syncDoc(p);
 logIt(p.id,`Submitted for review (round ${p.chain.round}): ${v.reviewers.length} reviewer(s), ${v.approvers.length} approver(s), ${v.reqSig?'e-signature':'in-app'} final approval.`);
 commit();toast(`${p.id} submitted for review.`);
 if(p.chain.stage==='approval'&&p.chain.reqSig)return requestSig(p,true)}
async function requestSig(p,quiet){
 const c=p.chain;
 try{if(!isE())throw new Error('E-signature is not available.');const d=docOf(p),v=d&&D.version(d);if(!v)throw new Error('The policy has no document to sign.');
  if(c.docSha&&v.sha!==c.docSha)throw new Error('The document changed after it was submitted. Submit it again.');
  const signers=c.steps.filter(x=>x.kind==='Approval').map(x=>({name:x.who,role:'Approver',order:1}));
  const r=await G.esign.create(d.id,signers,{purpose:'Approval',title:`Approve ${p.title} v${p.ver}`,order:'Parallel',message:`Final approval of ${p.id} ${p.title}, version ${p.ver}.`});
  G.esign.send(r.id);c.esReq=r.id;c.sigBy=me().name;logIt(p.id,`Signature request ${r.id} sent to ${signers.map(s=>s.name).join(', ')}.`);commit();toast(`Signature request ${r.id} sent.`)}
 catch(e){toast(quiet?`Signature request not created: ${errMsg(e)} Use "Request e-signature approval" on the policy.`:errMsg(e))}}
function decide(p,i,d,comment){
 const c=p.chain,st=c.steps[i];st.status=d;st.ts=nowIso();st.comment=comment||'';st.by=me().name;
 logIt(p.id,`${st.kind} ${d==='Approved'?'approved':'changes requested'} by ${me().name}${comment?': '+comment:''}`);
 if(d!=='Approved'){c.stage='changes';p.status='Draft';c.steps.forEach(x=>{if(x.status==='Pending')x.status='Not needed'})}
 else if(st.kind==='Review'){const rv=c.steps.filter(x=>x.kind==='Review'),ok=c.rmode==='all'?rv.every(x=>x.status==='Approved'):rv.some(x=>x.status==='Approved');
  if(ok){rv.forEach(x=>{if(x.status==='Pending')x.status='Not needed'});c.stage='approval';logIt(p.id,'Review stage complete; waiting for final approval.')}}
 else if(c.steps.filter(x=>x.kind==='Approval').every(x=>x.status==='Approved')){c.stage='done';p.status='Approved';logIt(p.id,`v${p.ver} approved.`)}
 syncDoc(p);commit();
 if(c.stage==='approval'&&c.reqSig&&!c.esReq)return requestSig(p,true)}
actions['pp-step']=b=>{const p=find(b.dataset.id),c=p&&p.chain,i=+b.dataset.i,st=c&&c.steps[i],d=b.dataset.d;if(!st||st.status!=='Pending')return;
 if(me().name===p.owner)return toast('Segregation of duties: the document owner cannot review or approve their own document.');
 if(!(st.who===me().name||isAdmin()))return toast(`This step belongs to ${st.who}.`);
 if(st.kind==='Review'&&c.stage!=='review')return toast('The review stage is complete.');
 if(st.kind==='Approval'&&(c.stage!=='approval'||c.reqSig))return toast(c.reqSig?'Final approval is given by e-signature.':'Waiting for the review stage to finish.');
 dlg({title:d==='Approved'?(st.kind==='Review'?'Approve this review':'Approve this document'):'Request changes',submit:d==='Approved'?'Approve':'Request changes',fields:[{name:'c',label:d==='Approved'?'Comment (optional)':'What needs to change?',type:'textarea',rows:4}],
  onSubmit:v=>{if(d!=='Approved'&&v.c.length<3)return 'Say what needs to change.';return decide(p,i,d,v.c)}})};
actions['pp-sig-req']=b=>{const p=find(b.dataset.id);if(p&&p.chain&&p.status==='In review')requestSig(p,false)};
actions['pp-chain-cancel']=b=>{const p=find(b.dataset.id);if(!p||!p.chain||!canAct(p.owner))return toast('Only the owner or an administrator can withdraw the submission.');
 resetDraft(p,'Submission withdrawn');p.chain.stage='cancelled';p.status='Draft';syncDoc(p);logIt(p.id,'Submission withdrawn; back to draft.');commit()};
actions['pp-submit']=b=>{const p=find(b.dataset.id);if(p)openSubmit(p)};
// e-signature hook: final approval completes (or declines) the policy
(G.esignHooks=G.esignHooks||[]).push((r,ev)=>{const p=P().find(x=>x.chain&&x.chain.esReq===r.id);if(!p)return;const c=p.chain;
 c.steps.filter(x=>x.kind==='Approval').forEach(x=>{const s=(r.signers||[]).find(q=>q.name===x.who);if(s&&s.status==='Signed'){x.status='Approved';x.ts=s.ts;x.by=s.name;x.comment='Signed electronically'}else if(s&&s.status==='Declined'){x.status='Changes requested';x.ts=s.ts;x.by=s.name;x.comment=s.reason||'Declined'}});
 if(ev==='completed'){c.stage='done';p.status='Approved';logIt(p.id,`v${p.ver} approved by e-signature ${r.id}.`)}
 else if(ev==='declined'){c.stage='declined';p.status='Draft';logIt(p.id,`Signature ${r.id} declined; policy back to draft.`)}});

// ---------------------------------------------------------------- core lifecycle actions (override the simple ones)
function publish(p){
 if(!canAct(p.owner))return toast(`Only ${p.owner} or an administrator can publish.`);
 const [a,b]=verParts(p.ver);p.ver=a===0?'1.0':b>0?`${a+1}.0`:p.ver;
 p.status='Published';p.att=0;p.attBy=[];p.camps.forEach(c=>{if(c.status==='Open')c.status='Superseded'});
 const v=curV(p);if(v)p.vmap[v.n]=p.ver;p.pub={ver:p.ver,docVer:v?v.n:0,sha:v?v.sha:'',ts:nowIso(),by:me().name};
 p.review=addMonths(TODAY,rmOf(p));p.fresh=false;syncDoc(p);
 logIt(p.id,`v${p.ver} published; next review ${fmt(p.review)} (every ${rmOf(p)} months).`);commit();toast(`${p.id} v${p.ver} published. Start an attestation campaign from the policy.`)}
const origStep=actions['pol-step'];
actions['pol-step']=b=>{const p=find(b.dataset.id);if(!p)return origStep&&origStep(b);
 if(p.status==='Draft')return openSubmit(p);
 if(p.status==='In review'){
  if(p.chain&&!['done','changes','declined','cancelled'].includes(p.chain.stage))return toast('This policy has an approval chain. Reviewers and approvers act on their own steps in the policy view.');
  if(me().name===p.owner)return toast('Segregation of duties: the document owner cannot approve their own document.');
  p.status='Approved';syncDoc(p);logIt(p.id,`v${p.ver} moved to Approved.`);commit();return toast(`${p.id} is now Approved.`)}
 if(p.status==='Approved')return publish(p)};
const origRevise=actions['pol-revise'];
actions['pol-revise']=b=>{const p=find(b.dataset.id);if(!p)return;origRevise(b);p.fresh=true;p.chain&&(p.chain.stage='cancelled');p.camps.forEach(c=>{if(c.status==='Open')c.status='Superseded'});syncDoc(p);commit()};
actions['pol-reviewed']=b=>{const p=find(b.dataset.id);if(!p)return;if(!canAct(p.owner))return toast(`Only ${p.owner} or an administrator can confirm the review.`);
 p.review=addMonths(TODAY,rmOf(p));p.lastReviewed=TODAY;logIt(p.id,`Periodic review completed with no change; next review ${fmt(p.review)} (every ${rmOf(p)} months).`);commit()};

// ---------------------------------------------------------------- documents: create, edit text, compare, download
const ST={rl:null};
function docTypeOf(p){return docType(p.type)}
async function makeDoc(p,text,desc){
 const folder=D.folder&&D.folder('FLD-001')?'FLD-001':'';
 const d=await D.create({title:p.title,type:docTypeOf(p),folder,status:'Draft',owner:p.owner,linked:[p.id],tags:['policy',String(p.type).toLowerCase()],desc:desc||`Managed document for ${p.id}.`},{text,name:slug(p.title)+'.txt'});
 p.doc=d.id;p.vmap[1]=p.ver;p.fresh=false;logIt(p.id,`Managed document ${d.id} created.`);commit();return d}
actions['pp-doc-new']=b=>{const p=find(b.dataset.id);if(!p||p.doc)return;if(!canAct(p.owner))return toast(`Only ${p.owner} or an administrator can create the document.`);
 const T=tpls();
 dlg({title:'Create document',submit:'Create document',note:'Creates a managed document (version 1) linked to this policy.',fields:[
  {name:'src',label:'Start from',type:'select',options:[['blank','Blank text'],...T.map(t=>['t:'+t.id,'Template: '+t.title])],value:'blank'},
  {name:'warn',type:'check',label:'I understand a template is only a starting point',text:'I understand a template is only a starting point that Legal and Compliance must review.',value:true}],
  onSubmit:async v=>{let text;if(v.src==='blank')text=blankText(p);else{const t=T.find(x=>'t:'+x.id===v.src);if(!t)return 'Choose a template.';text=tplText(t,p)}await makeDoc(p,text);toast('Document created.')}})};
actions['pp-doc-link']=b=>{const p=find(b.dataset.id);if(!p||!canAct(p.owner))return toast('Only the owner or an administrator can link a document.');
 const ds=D.docs().filter(d=>D.canView(d)&&d.status!=='Archived');if(!ds.length)return toast('There are no documents to link.');
 dlg({title:'Link existing document',submit:'Link',fields:[{name:'d',label:'Document',type:'select',options:ds.map(d=>[d.id,`${d.id} · ${d.title} (v${d.cur})`])}],
  onSubmit:v=>{const d=D.doc(v.d);if(!d)return 'Choose a document.';p.doc=d.id;p.vmap[d.cur]=p.vmap[d.cur]||p.ver;try{D.link(d.id,p.id)}catch{}logIt(p.id,`Linked document ${d.id}.`);commit()}})};
actions['pp-doc-open']=b=>{const id=b.dataset.d;if(G.drawers&&G.drawers.doc)openDrawer('doc',id);else toast(`The document screens are not available yet. The document is ${id}.`)};
actions['pp-doc-dl']=async b=>{try{await D.download(b.dataset.d,b.dataset.n?+b.dataset.n:undefined);toast('Download started.')}catch(e){toast(errMsg(e))}};
actions['pp-doc-verify']=async b=>{try{const r=await D.verify(b.dataset.d,+b.dataset.n);toast(r.ok?`Checksum verified for version ${b.dataset.n}.`:'Integrity check failed: '+r.reason)}catch(e){toast(errMsg(e))}};
actions['pp-doc-edit']=async b=>{const p=find(b.dataset.id),d=docOf(p);if(!p||!d)return;
 if(!canAct(p.owner))return toast(`Only ${p.owner} or an administrator can edit the text.`);
 let cur='';try{cur=await D.text(d.id)}catch{}const v0=D.version(d);
 if(!cur&&v0&&v0.size)return toast('This document is a file, not text. Upload a new version from the document screen.');
 const warn=d.sig?' This document is signed. Saving starts a revision; the signed version stays in history.':p.status==='Published'?' This policy is published. Saving starts a new draft version.':p.status==='In review'?' This policy is in review. Saving withdraws it from review.':'';
 dlg({title:`Edit text of ${p.title}`,wide:true,submit:'Save new version',note:'Saving creates a new document version and a new minor version label.'+E(warn),
  fields:[{name:'text',label:'Text',type:'textarea',rows:16,mono:true,value:cur,raw:true},{name:'note',label:'What changed',type:'text',ph:'For example: added a retention rule'}],
  onSubmit:async v=>{if(!v.text.trim())return 'The text cannot be empty.';if(v.text===cur)return 'No changes to save.';
   if(d.sig){try{G.esign.reviseSigned(d.id)}catch(e){return errMsg(e)}}
   if(!D.canEdit(d)&&!isAdmin())return 'You cannot edit this document.';
   const ver=await D.addVersion(d.id,{text:v.text,name:(v0&&v0.name)||slug(p.title)+'.txt'},v.note||'Text edited');
   if(p.fresh){p.fresh=false}else bumpMinor(p);
   if(['Published','Approved','In review'].includes(p.status))resetDraft(p,'Document edited');
   p.vmap[ver.n]=p.ver;syncDoc(p);logIt(p.id,`Text edited: document ${d.id} v${ver.n}, policy v${p.ver}${v.note?' ('+v.note+')':''}.`);ST.rl=null;commit();toast(`Saved as policy v${p.ver} (document version ${ver.n}).`)}})};
actions['pp-compare']=async b=>{const p=find(b.dataset.id),d=docOf(p);if(!d)return;const a=+$('#ppRlA').value,c=+$('#ppRlB').value;
 try{const [ta,tb]=await Promise.all([D.text(d.id,a),D.text(d.id,c)]);if(!ta&&!tb){toast('These versions are not text files, so they cannot be compared.');return}
  ST.rl={pid:p.id,a,b:c,html:redlineHtml(diffLines(ta,tb),`v${a} (policy ${p.vmap[a]||'?'})`,`v${c} (policy ${p.vmap[c]||'?'})`)};G.renderAll()}catch(e){toast(errMsg(e))}};

// ---------------------------------------------------------------- edit details, new policy, links
function descendants(id,seen){seen=seen||new Set();P().filter(c=>c.parent===id).forEach(c=>{if(!seen.has(c.id)){seen.add(c.id);descendants(c.id,seen)}});return seen}
function parentOpts(p){const ban=p?descendants(p.id):new Set();return[['','No parent'],...P().filter(x=>(!p||x.id!==p.id)&&!ban.has(x.id)&&['Policy','Standard'].includes(x.type)).map(x=>[x.id,`${x.id} · ${x.title}`])]}
actions['pp-edit']=b=>{const p=find(b.dataset.id);if(!p)return;if(!canAct(p.owner))return toast(`Only ${p.owner} or an administrator can change the details.`);
 dlg({title:'Edit details',wide:true,submit:'Save',fields:[
  {name:'type',label:'Type',type:'select',options:TYPES,value:p.type,half:true},{name:'parent',label:'Parent policy',type:'select',options:parentOpts(p),value:p.parent||'',half:true,help:'Standards and procedures should sit under a parent policy.'},
  {name:'rm',label:'Review cycle (months)',type:'number',min:1,max:60,value:rmOf(p),half:true},{name:'fw',label:'Frameworks (comma separated)',type:'text',value:(p.fw||[]).join(', '),half:true},
  {name:'ctrls',label:'Supporting controls',type:'checks',options:(S().controls||[]).map(c=>[c.id,`${c.id} · ${c.name}`]),value:p.ctrls||[]},
  {name:'reqSig',type:'check',label:'Require e-signature for final approval',text:'Require e-signature for final approval',value:!!p.reqSig}],
  onSubmit:v=>{const m=Math.round(+v.rm);if(!(m>=1&&m<=60))return 'Review cycle must be 1 to 60 months.';if(v.parent&&descendants(p.id).has(v.parent))return 'A policy cannot sit under its own child.';
   p.type=v.type;p.parent=v.parent;p.reviewMonths=m;p.fw=v.fw.split(',').map(s=>s.trim()).filter(Boolean);p.ctrls=v.ctrls;p.reqSig=v.reqSig;if(p.chainCfg)p.chainCfg.reqSig=v.reqSig;
   logIt(p.id,`Details updated (${p.type}${p.parent?', under '+p.parent:''}, review every ${m} months).`);commit()}})};
actions['pol-new']=()=>{
 const fws=[...new Set([...P().flatMap(p=>p.fw||[]),'ISO 9001','ISO 14001','ISO 45001','NIST CSF','ISO 37301'])];
 dlg({title:'New controlled document',wide:true,submit:'Create draft',fields:[
  {name:'title',label:'Title',type:'text'},{name:'type',label:'Type',type:'select',options:TYPES,value:'Policy',half:true},{name:'parent',label:'Parent policy (optional)',type:'select',options:parentOpts(null),value:'',half:true},
  {name:'owner',label:'Document owner',type:'select',options:people().map(n=>[n,n]),value:me().name,half:true},{name:'rm',label:'Review cycle (months)',type:'number',min:1,max:60,value:12,half:true},
  {name:'fw',label:'Framework',type:'select',options:fws,half:true},{name:'mk',type:'check',label:'Create the managed document now',text:'Create the managed document now (blank text)',value:true}],
  onSubmit:async v=>{if(!v.title)return 'Add a title.';const m=Math.round(+v.rm);if(!(m>=1&&m<=60))return 'Review cycle must be 1 to 60 months.';
   let id;do{id=G.nextId('policy','POL-',3)}while(find(id));
   const p={id,title:v.title,type:v.type,ver:'0.1',owner:v.owner,status:'Draft',review:addMonths(TODAY,m),aud:people().length,att:0,fw:[v.fw],ctrls:[],attBy:[],reviewMonths:m,parent:v.parent,obls:[],attLog:[],camps:[],vmap:{},doc:'',fresh:true};
   S().policies.unshift(p);logIt(id,'Draft v0.1 created.');
   if(v.mk){try{await makeDoc(p,blankText(p))}catch(e){commit();toast('Policy created, but the document could not be: '+errMsg(e));setTimeout(()=>openDrawer('policy',id),0);return}}
   else commit();setTimeout(()=>openDrawer('policy',id),0)}})};
actions['pp-link-obl']=b=>{if(me().role==='Auditor')return toast('Auditors cannot change links.');const o=(S().obl||[]).find(x=>x.id===b.dataset.obl);if(!o)return;
 dlg({title:`Link ${o.id} to a policy`,submit:'Link',note:E(o.ref?o.ref+' · ':'')+E(o.title),fields:[{name:'p',label:'Policy',type:'select',options:P().map(p=>[p.id,`${p.id} · ${p.title}`])}],
  onSubmit:v=>{const p=find(v.p);if(!p)return 'Choose a policy.';if(!p.obls.includes(o.id))p.obls.push(o.id);logIt(p.id,`Linked to obligation ${o.id}.`);commit()}})};
actions['pp-link-pol']=b=>{if(me().role==='Auditor')return toast('Auditors cannot change links.');const p=find(b.dataset.id);if(!p)return;
 const os=(S().obl||[]).filter(o=>!(p.obls||[]).includes(o.id));if(!os.length)return toast('There are no obligations to link. Adopt a framework first.');
 dlg({title:`Link ${p.id} to an obligation`,submit:'Link',fields:[{name:'o',label:'Obligation',type:'select',options:os.map(o=>[o.id,`${o.id} · ${o.ref||''} ${o.title}`.slice(0,110)])}],
  onSubmit:v=>{if(!v.o)return 'Choose an obligation.';if(!p.obls.includes(v.o))p.obls.push(v.o);logIt(p.id,`Linked to obligation ${v.o}.`);commit()}})};
actions['pp-unlink-obl']=b=>{const p=find(b.dataset.id);if(!p||me().role==='Auditor')return;p.obls=p.obls.filter(x=>x!==b.dataset.obl);logIt(p.id,`Unlinked obligation ${b.dataset.obl}.`);commit()};
actions['pp-exc-new']=b=>{const f=actions['exc-new'];if(!f)return toast('Policy exceptions are not available here.');f();const sel=$('#opFB [name=policy]');if(sel)sel.value=b.dataset.id};

// ---------------------------------------------------------------- review cycle
G.policyDue=function(days){days=days==null?90:+days;return P().filter(p=>p.status==='Published'&&p.review&&dTo(p.review)<=days).map(p=>({id:p.id,title:p.title,due:p.review,owner:p.owner,days:dTo(p.review),overdue:dTo(p.review)<0})).sort((a,b)=>a.due<b.due?-1:a.due>b.due?1:0)};
function remindReview(p){p.rem=p.rem||[];p.rem.push({ts:nowIso(),by:me().name});const sent=notify(p.owner,`Review due: ${p.title}`,p.id);
 logIt(p.id,`Review reminder for ${p.owner}: due ${fmt(p.review)}${dTo(p.review)<0?' (overdue)':''}${sent?'':' (recorded only)'}.`)}
actions['pp-remind']=b=>{const id=b.dataset.id;let list;if(id==='all')list=G.policyDue(30);else{const p=find(id);list=p?[p]:[]}
 if(!list.length)return toast('Nothing is due in the next 30 days.');list.forEach(x=>{const p=x.title&&x.owner&&x.id?find(x.id):x;if(p)remindReview(p)});commit();toast(`${list.length} review reminder${list.length===1?'':'s'} recorded.`)};

// ---------------------------------------------------------------- attestation campaigns
function syncAtt(p){const c=latestCamp(p);if(!c)return;const act=c.people.filter(x=>x.status!=='Exempt');p.aud=act.length;p.att=0;p.attBy=act.filter(x=>x.status==='Attested').map(x=>x.name)}
function closeIfDone(c){if(c.status==='Open'&&!c.people.some(x=>x.status==='Pending'))c.status='Complete'}
const campPct=c=>{const a=c.people.filter(x=>x.status!=='Exempt');return a.length?Math.round(a.filter(x=>x.status==='Attested').length/a.length*100):100};
actions['pp-camp-start']=b=>{const p=find(b.dataset.id);if(!p)return;if(p.status!=='Published')return toast('Only a published policy can have an attestation campaign.');if(!canAct(p.owner))return toast(`Only ${p.owner} or an administrator can start a campaign.`);
 const roles=[...new Set(people().map(roleOf).filter(Boolean))],sn=snapOf(p);
 dlg({title:`Start attestation campaign for ${p.title}`,wide:true,submit:'Start campaign',
  note:`People attest to version ${E(sn.ver)}${sn.sha?', document checksum '+E(short(sn.sha))+'…':' (no managed document, so no checksum)'}. Starting a campaign replaces the attestation count for this policy with this audience.`,
  fields:[{name:'mode',label:'Audience',type:'select',options:[['all','All staff'],['roles','By role'],['people','Named people']],value:'all',half:true},{name:'due',label:'Due date',type:'date',value:plusDays(TODAY,30),half:true},
   {name:'roles',label:'Roles (when audience is By role)',type:'checks',options:roles,value:[]},{name:'ppl',label:'People (when audience is Named people)',type:'checks',options:people(),value:[]}],
  onSubmit:v=>{if(!v.due||v.due<TODAY)return 'Choose a due date that is today or later.';
   const names=v.mode==='all'?people():v.mode==='roles'?people().filter(n=>v.roles.includes(roleOf(n))):v.ppl;
   if(!names.length)return v.mode==='roles'?'Choose at least one role.':'Choose at least one person.';
   p.camps.forEach(c=>{if(c.status==='Open')c.status='Superseded'});
   const c={id:`${p.id}-C${p.camps.length+1}`,ver:sn.ver,docVer:sn.docVer,sha:sn.sha,started:TODAY,startedBy:me().name,due:v.due,mode:v.mode,roles:v.mode==='roles'?v.roles:[],status:'Open',reminders:[],
    people:names.map(n=>({name:n,role:roleOf(n),unit:unitOf(n),status:'Pending',ts:'',ver:'',docVer:'',sha:'',reason:'',by:''}))};
   p.camps.push(c);syncAtt(p);logIt(p.id,`Attestation campaign ${c.id} started for v${c.ver}: ${names.length} people, due ${fmt(c.due)}.`);commit();toast(`Campaign ${c.id} started.`)}})};
function attest(p){
 if(p.status!=='Published')return toast('Only a published policy can be attested.');const name=me().name,sn=snapOf(p),c=openCamp(p);let e=null;
 if(c){e=c.people.find(x=>x.name===name);if(!e)return toast('You are not in the audience of the current campaign.');if(e.status==='Attested')return toast('You have already attested.');if(e.status==='Exempt')return toast('You are exempt from this campaign.');if(c.ver!==p.ver)return toast('This campaign is for an older version.')}
 else if(p.attBy.includes(name))return toast('You have already attested.');
 const rec={name,role:roleOf(name),unit:unitOf(name),ts:nowIso(),ver:sn.ver,docVer:sn.docVer,sha:sn.sha,camp:c?c.id:''};
 p.attLog.push(rec);if(!p.attBy.includes(name))p.attBy.push(name);
 if(e){Object.assign(e,{status:'Attested',ts:rec.ts,ver:sn.ver,docVer:sn.docVer,sha:sn.sha,by:name});closeIfDone(c);syncAtt(p)}
 logIt(p.id,`${name} attested to v${sn.ver}${sn.sha?' (document checksum '+short(sn.sha)+')':''}.`);commit();toast('Attestation recorded.')}
actions['pol-attest']=actions['pp-attest']=b=>{const p=find(b.dataset.id);if(p)attest(p)};
actions['pp-camp-remind']=b=>{const p=find(b.dataset.id),c=p&&(p.camps.find(x=>x.id===b.dataset.c)||openCamp(p));if(!c)return;if(!canAct(p.owner))return toast(`Only ${p.owner} or an administrator can send reminders.`);
 const pend=c.people.filter(x=>x.status==='Pending');if(!pend.length)return toast('Everyone has responded.');
 c.reminders.push({ts:nowIso(),by:me().name,to:pend.map(x=>x.name)});const sent=pend.map(x=>notify(x.name,`Please attest: ${p.title}`,p.id)).some(Boolean);
 logIt(p.id,`Attestation reminder sent to ${pend.length} ${pend.length===1?'person':'people'}: ${pend.map(x=>x.name).join(', ')}${sent?'':' (recorded only)'}.`);commit();toast(`Reminder recorded for ${pend.length} ${pend.length===1?'person':'people'}.`)};
actions['pp-exempt']=b=>{const p=find(b.dataset.id),c=p&&p.camps.find(x=>x.id===b.dataset.c),e=c&&c.people.find(x=>x.name===b.dataset.n);if(!e||e.status!=='Pending')return;if(!canAct(p.owner))return toast(`Only ${p.owner} or an administrator can grant an exemption.`);
 dlg({title:`Exempt ${e.name}`,submit:'Grant exemption',fields:[{name:'r',label:'Reason',type:'textarea',rows:3}],onSubmit:v=>{if(v.r.length<5)return 'Give a reason of at least a few words.';
  Object.assign(e,{status:'Exempt',reason:v.r,ts:nowIso(),by:me().name});closeIfDone(c);syncAtt(p);logIt(p.id,`${e.name} exempted from ${c.id}: ${v.r}`);commit()}})};
function evidence(list){const rows=[['Policy','Title','Policy version','Document','Document version','Checksum (SHA-256)','Person','Role','Unit','Status','Recorded at (UTC)','Campaign','Exemption reason']];
 list.forEach(p=>{(p.attLog||[]).forEach(r=>rows.push([p.id,p.title,r.ver,p.doc||'',r.docVer||'',r.sha||'',r.name,r.role||'',r.unit||'','Attested',r.ts,r.camp||'','']));
  (p.camps||[]).forEach(c=>c.people.filter(x=>x.status==='Exempt').forEach(x=>rows.push([p.id,p.title,c.ver,p.doc||'',c.docVer||'',c.sha||'',x.name,x.role,x.unit,'Exempt',x.ts,c.id,x.reason])))});return rows}
actions['pp-evidence']=b=>{const id=b.dataset.id,list=id&&id!=='all'?[find(id)].filter(Boolean):P();const rows=evidence(list);csv(`forge-attestation-evidence${id&&id!=='all'?'-'+id:''}.csv`,rows,`Attestation evidence exported (${rows.length-1} record${rows.length===2?'':'s'}).`)};

// ---------------------------------------------------------------- templates: create a policy
actions['pp-tpl-create']=b=>{const t=tpls().find(x=>x.id===b.dataset.id);if(!t)return;
 dlg({title:'Create policy from template',wide:true,submit:'Create policy and document',note:E(NOTICE),fields:[
  {name:'title',label:'Policy title',type:'text',value:t.title},{name:'owner',label:'Owner',type:'select',options:people().map(n=>[n,n]),value:me().name,half:true},{name:'parent',label:'Parent policy (optional)',type:'select',options:parentOpts(null),value:'',half:true},
  {name:'ack',type:'check',label:'Acknowledge',text:'I understand this is a starting point for Legal and Compliance review and that jurisdiction-specific requirements must be inserted.',value:false}],
  onSubmit:async v=>{if(!v.title)return 'Add a title.';if(!v.ack)return 'Tick the acknowledgement to continue.';
   let id;do{id=G.nextId('policy','POL-',3)}while(find(id));const m=[6,12,24,36].includes(t.reviewMonths)?t.reviewMonths:(+t.reviewMonths>0?Math.round(+t.reviewMonths):12);
   const p={id,title:v.title,type:mapType(t.type),ver:'0.1',owner:v.owner,status:'Draft',review:addMonths(TODAY,m),aud:people().length,att:0,fw:[...(t.frameworks||[])],ctrls:[],attBy:[],reviewMonths:m,parent:v.parent,obls:[],attLog:[],camps:[],vmap:{},doc:'',fresh:true,tpl:t.id,audText:t.audience||'',
    desc:`Created from template ${t.id} (${t.category||'uncategorised'}). Intended audience: ${t.audience||'all staff'}. ${NOTICE} Suggested controls to link: ${(t.controls||[]).join('; ')||'none listed'}. Suggested indicators: ${(t.kpis||[]).join('; ')||'none listed'}.`};
   S().policies.unshift(p);
   try{await makeDoc(p,tplText(t,p),`Created from policy template ${t.id}. ${NOTICE}`)}catch(e){S().policies.splice(S().policies.indexOf(p),1);commit();return 'The document could not be created: '+errMsg(e)}
   logIt(id,`Created from template ${t.id}.`);commit();toast(`${id} created from the template.`);setTimeout(()=>{G.closeDrawer&&G.closeDrawer();openDrawer('policy',id)},0)}})};
G.drawers.poltpl=id=>{const t=tpls().find(x=>x.id===id);if(!t){G.setDrawer('Template','Not found','<p class="op-note">This template is not available.</p>');return}
 const secs=Array.isArray(t.sections)?t.sections:[];
 G.setDrawer('Policy template · '+(t.category||''),t.title,`<div class="op-banner amber"><div><b>Review before use</b><div>${E(NOTICE)}</div></div></div>
 <div class="detailgrid"><div class="detailbox"><b>Type</b><span>${E(t.type||'Policy')}</span></div><div class="detailbox"><b>Review cycle</b><span>${E(t.reviewMonths||12)} months</span></div><div class="detailbox"><b>Sectors</b><span>${E((t.sectors||[]).join(', ')||'All')}</span></div><div class="detailbox"><b>Frameworks</b><span>${E((t.frameworks||[]).map(fwLabel).join(', ')||'None')}</span></div><div class="detailbox"><b>Suggested owner / approver</b><span>${E(t.roles?`${t.roles.owner} / ${t.roles.approver}`:'Not set')}</span></div><div class="detailbox"><b>Audience</b><span>${E(t.audience||'All staff')}</span></div></div>
 <div class="op-btns">${btn('pp-tpl-create','Create policy from template',`data-id="${E(t.id)}"`,'op-mini p')}</div>
 <h4>Purpose</h4><p>${E(t.purpose||'')}</p><h4>Scope</h4><p>${E(t.scope||'')}</p>
 <h4>Sections (${secs.length})</h4>${secs.map(s=>`<details style="margin:4px 0"><summary><b>${E(s.h||s.title||'')}</b></summary>${s.t||s.text?`<p class="op-note">${E(s.t||s.text)}</p>`:''}${Array.isArray(s.items)?`<ul>${s.items.map(i=>`<li>${E(i)}</li>`).join('')}</ul>`:''}</details>`).join('')||'<p class="op-note">No sections.</p>'}
 <h4>Suggested controls</h4>${(t.controls||[]).length?`<ul>${t.controls.map(c=>`<li>${E(c)}</li>`).join('')}</ul>`:'<p class="op-note">None listed.</p>'}
 <h4>Key indicators</h4>${(t.kpis||[]).length?`<ul>${t.kpis.map(c=>`<li>${E(c)}</li>`).join('')}</ul>`:'<p class="op-note">None listed.</p>'}
 ${(t.placeholders||[]).length?`<h4>Placeholders to complete</h4><p class="op-note">${E(t.placeholders.join(', '))}</p>`:''}`)};
G.parents.policy=id=>{const p=find(id);return p&&p.parent&&find(p.parent)?['policy',p.parent]:null};

// ---------------------------------------------------------------- policy drawer sections
const stPill=s=>pill(s,{Pending:'blue',Approved:'green','Changes requested':'red','Not needed':'blue'}[s]||'blue');
function docHtml(p){
 const d=docOf(p);let h='<div class="pp-sec"><h4>Policy document</h4>';
 if(!d){h+=`<p class="op-note">${p.doc?`The linked document ${E(p.doc)} could not be found.`:'No managed document yet, so the text is not under version control and attestations carry no checksum.'}</p><div class="op-btns">${btn('pp-doc-new','Create document',`data-id="${p.id}"`,'op-mini p')}${btn('pp-doc-link','Link existing document',`data-id="${p.id}"`)}</div></div>`;return h}
 const v=D.version(d),vs=[...d.versions].sort((x,y)=>y.n-x.n),rl=ST.rl&&ST.rl.pid===p.id?ST.rl:null,a0=rl?rl.a:(vs[1]||vs[0]).n,b0=rl?rl.b:vs[0].n;
 h+=`<div class="detailgrid"><div class="detailbox"><b>Document</b><span>${E(d.id)} · ${E(d.status)}</span></div><div class="detailbox"><b>Document version</b><span>v${v.n} of ${d.versions.length}</span></div><div class="detailbox"><b>Policy version label</b><span>${E(p.vmap[v.n]||p.ver)}</span></div><div class="detailbox"><b>Checksum (SHA-256)</b><span title="${E(v.sha)}">${E(short(v.sha))}…</span></div></div>
 ${d.sig?`<p class="op-note">Signed electronically (${E(d.sig.req)}) on ${E(String(d.sig.ts).slice(0,10))}. Editing starts a revision and keeps the signed version in history.</p>`:''}
 <div class="op-btns">${btn('pp-doc-edit','Edit text',`data-id="${p.id}"`,'op-mini p')}${btn('pp-doc-dl','Download',`data-d="${d.id}"`)}${btn('pp-doc-open','Open document',`data-d="${d.id}"`)}${btn('pp-doc-verify','Verify checksum',`data-d="${d.id}" data-n="${v.n}"`)}</div>
 <h4>Versions</h4>${table(['Doc version','Policy version','Date','By','Note','Checksum',''],vs.map(x=>`<tr style="cursor:default"><td>v${x.n}${x.n===d.cur?' (current)':''}</td><td>${E(p.vmap[x.n]||'-')}</td><td>${E(String(x.ts).slice(0,10))}</td><td>${E(x.by)}</td><td style="white-space:normal">${E(x.note||'')}</td><td title="${E(x.sha)}">${E(short(x.sha))}…</td><td>${btn('pp-doc-dl','Download',`data-d="${d.id}" data-n="${x.n}"`)}</td></tr>`),'No versions.')}
 ${vs.length>1?`<div class="pp-cmp"><label for="ppRlA">Compare</label><select id="ppRlA">${vs.map(x=>`<option value="${x.n}"${x.n===a0?' selected':''}>v${x.n} (policy ${E(p.vmap[x.n]||'?')})</option>`).join('')}</select><label for="ppRlB">with</label><select id="ppRlB">${vs.map(x=>`<option value="${x.n}"${x.n===b0?' selected':''}>v${x.n} (policy ${E(p.vmap[x.n]||'?')})</option>`).join('')}</select>${btn('pp-compare','Show redline',`data-id="${p.id}"`,'op-mini p')}</div><div class="pp-fine">Added lines are marked + and underlined. Removed lines are marked - and struck through.</div>`:'<p class="op-note">Edit the text to create a second version and compare them.</p>'}
 ${rl?`<div id="ppRedline">${rl.html}</div>`:''}</div>`;return h}
function chainHtml(p){
 const c=p.chain;let h='<div class="pp-sec"><h4>Approval chain</h4>';
 if(!c){h+=(p.status==='Draft'||p.status==='In review')?`<p class="op-note">${p.status==='Draft'?'Not submitted yet.':'In review without a configured chain (simple approval).'} Choose reviewers and approvers, and whether the final approval is by e-signature.</p><div class="op-btns">${btn('pp-submit',p.status==='Draft'?'Submit for review':'Set up approval chain',`data-id="${p.id}"`,'op-mini p')}</div>`:'<p class="op-note">No approval chain was recorded for this version.</p>';return h+'</div>'}
 const SL={review:'Review stage',approval:'Waiting for final approval',done:'Approved',changes:'Changes requested, back to draft',declined:'Signature declined, back to draft',cancelled:'Withdrawn'}[c.stage]||c.stage;
 const req=c.esReq&&isE()?G.esign.req(c.esReq):null,me_=me().name,own_=me_===p.owner;
 h+=`<div class="op-banner ${c.stage==='done'?'green':['changes','declined','cancelled'].includes(c.stage)?'red':'amber'}"><div><b>${E(SL)}</b><div>Round ${c.round}, started ${E(String(c.started).slice(0,10))} by ${E(c.by)}. Reviewer rule: ${c.rmode==='all'?'all reviewers must approve':'any one reviewer can approve'}. Final approval: ${c.reqSig?'e-signature':'in the app'}.${c.note?' '+E(c.note):''}</div></div>`;
 const rows=c.steps.map((s,i)=>{const can=s.status==='Pending'&&!own_&&(s.who===me_||isAdmin())&&((s.kind==='Review'&&c.stage==='review')||(s.kind==='Approval'&&c.stage==='approval'&&!c.reqSig));
  return `<tr style="cursor:default"><td>${i+1}. ${E(s.kind)}</td><td>${own(s.who)}</td><td>${stPill(s.status)}</td><td>${s.ts?E(String(s.ts).slice(0,16).replace('T',' ')):'-'}</td><td style="white-space:normal;max-width:240px">${E(s.comment||'')}${s.by&&s.by!==s.who?` <span class="riskarea">(by ${E(s.by)})</span>`:''}</td><td>${can?btn('pp-step','Approve',`data-id="${p.id}" data-i="${i}" data-d="Approved"`,'op-mini g')+' '+btn('pp-step','Request changes',`data-id="${p.id}" data-i="${i}" data-d="Changes requested"`,'op-mini r'):''}</td></tr>`});
 h+=table(['Step','Who','Status','When','Comment',''],rows);
 if(c.reqSig&&c.stage==='approval'){
  if(!req||['Cancelled','Expired'].includes(req.status))h+=`<p class="op-note">${req?`Signature request ${E(req.id)} is ${E(req.status.toLowerCase())}.`:'The signature request has not been created yet.'}</p><div class="op-btns">${btn('pp-sig-req','Request e-signature approval',`data-id="${p.id}"`,'op-mini p')}</div>`;
  else{const mineSig=(req.signers||[]).some(s=>s.internal&&s.name===me_&&s.status==='Pending');
   h+=`<h4>E-signature ${E(req.id)}</h4><p class="op-note">Status: ${E(req.status)}. ${(req.signers||[]).map(s=>`${E(s.name)}: ${E(s.status)}`).join(' · ')}</p><div class="op-btns">${G.drawers&&G.drawers.esreq?btn('pp-sig-open',mineSig?'Open and sign':'Open signature request',`data-r="${E(req.id)}"`,mineSig?'op-mini p':'op-mini'):''}</div>${G.drawers&&G.drawers.esreq?'':'<p class="op-note">The signature screens are not available yet; signers use the e-signature area when it is.</p>'}`}}
 if(!['done','cancelled'].includes(c.stage)&&p.status==='In review'&&canAct(p.owner))h+=`<div class="op-btns">${btn('pp-chain-cancel','Withdraw submission',`data-id="${p.id}"`)}</div>`;
 if(['changes','declined','cancelled'].includes(c.stage)&&p.status==='Draft'&&canAct(p.owner))h+=`<div class="op-btns">${btn('pp-submit','Submit again',`data-id="${p.id}"`,'op-mini p')}</div>`;
 return h+'</div>'}
actions['pp-sig-open']=b=>{if(G.drawers&&G.drawers.esreq)openDrawer('esreq',b.dataset.r);else toast('The signature screens are not available yet.')};
function detailsHtml(p){
 const kids=P().filter(c=>c.parent===p.id),par=p.parent&&find(p.parent),cv=cover(),ob=cv.oblsOf(p),exp=(p.obls||[]).map(id=>(S().obl||[]).find(o=>o.id===id)).filter(Boolean);
 const exc=(S().exc||[]).filter(x=>x.policy===p.id);
 let h=`<div class="pp-sec"><h4>Hierarchy and review cycle</h4><div class="detailgrid"><div class="detailbox"><b>Type</b><span>${E(p.type)}</span></div><div class="detailbox"><b>Parent</b><span>${par?E(par.id):'None'}</span></div><div class="detailbox"><b>Review cycle</b><span>${rmOf(p)} months</span></div><div class="detailbox"><b>Next review</b><span>${fmt(p.review)}</span></div></div>
 ${NEEDPARENT.includes(p.type)&&!par?'<div class="op-pend amber"><span>◔</span><div>Orphaned: a '+E(p.type.toLowerCase())+' should sit under a parent policy.</div></div>':''}
 ${par?`<p class="op-note">Parent</p>${G.links([par.id])}`:''}${kids.length?`<p class="op-note">Children (${kids.length})</p>${G.links(kids.map(k=>k.id))}`:''}
 ${p.desc?`<p class="op-note">${E(p.desc)}</p>`:''}
 <div class="op-btns">${canAct(p.owner)?btn('pp-edit','Edit details',`data-id="${p.id}"`):''}${polOverdue(p)||dTo(p.review)<=30?btn('pp-remind','Record review reminder',`data-id="${p.id}"`):''}</div></div>`;
 h+=`<div class="pp-sec"><h4>Obligations covered (${ob.length})</h4>${exp.length?`<p class="op-note">Linked explicitly</p><div class="op-links">${exp.map(o=>`<span class="op-link" style="display:inline-flex;gap:6px;align-items:center"><span data-op="open" data-t="obligation" data-id="${E(o.id)}" role="button" tabindex="0">${E(o.id)} · ${E((o.title||'').slice(0,40))}</span><button class="op-mini" data-op="pp-unlink-obl" data-id="${p.id}" data-obl="${E(o.id)}" aria-label="Unlink ${E(o.id)}">Unlink</button></span>`).join('')}</div>`:''}
 <p class="op-note">${ob.length-exp.length>0?`${ob.length-exp.length} more matched through frameworks (${E((p.fw||[]).join(', '))}).`:ob.length?'':'No obligation is linked or matched through frameworks.'}</p><div class="op-btns">${btn('pp-link-pol','Link obligation',`data-id="${p.id}"`)}</div></div>`;
 h+=`<div class="pp-sec"><h4>Exceptions (${exc.length})</h4>${exc.length?G.links(exc.map(x=>x.id))+`<p class="op-note">${exc.map(x=>`${E(x.id)}: ${E(x.status)}${x.expires?', until '+fmt(x.expires):''}`).join(' · ')}</p>`:'<p class="op-note">No exceptions reference this policy.</p>'}<div class="op-btns">${btn('pp-exc-new','Request an exception',`data-id="${p.id}"`)}</div></div>`;return h}
function campHtml(p){
 const c=latestCamp(p),can=canAct(p.owner);let h='<div class="pp-sec"><h4>Attestation campaign</h4>';
 if(p.status!=='Published')return h+`<p class="op-note">Publish the policy to attest to it.</p>${(p.attLog||[]).length?`<div class="op-btns">${btn('pp-evidence','Export evidence (CSV)',`data-id="${p.id}"`)}</div>`:''}</div>`;
 const mineDone=c?c.people.some(x=>x.name===me().name&&x.status!=='Pending'):p.attBy.includes(me().name),inAud=c?c.people.some(x=>x.name===me().name):true;
 if(!c)h+=`<p class="op-note">No campaign yet. ${attCount(p)} of ${p.aud} have attested to v${E(p.ver)} (${attPct(p)}%).</p>`;
 else{const pct=campPct(c),late=c.status==='Open'&&c.due<TODAY;
  h+=`<div class="op-banner ${c.status==='Complete'?'green':late?'red':'amber'}"><div><b>${E(c.id)} · ${E(c.status)}${late?' · overdue':''}</b><div>Version ${E(c.ver)}${c.sha?', checksum '+E(short(c.sha))+'…':''}. Due ${fmt(c.due)}. ${pct}% complete.</div></div></div>${bar(pct,pct<80?'amber':'')}
  ${table(['Person','Role','Unit','Status','Recorded','Checksum',''],c.people.map(x=>`<tr style="cursor:default"><td>${own(x.name)}</td><td>${E(x.role)}</td><td>${E(x.unit)}</td><td>${pill(x.status,x.status==='Attested'?'green':x.status==='Exempt'?'blue':late?'red':'amber')}${x.status==='Exempt'?`<div class="riskarea">${E(x.reason)}</div>`:''}</td><td>${x.ts?E(String(x.ts).slice(0,16).replace('T',' ')):'-'}</td><td title="${E(x.sha)}">${x.sha?E(short(x.sha))+'…':'-'}</td><td>${x.status==='Pending'&&x.name===me().name?btn('pp-attest',`Attest as ${me().name}`,`data-id="${p.id}"`,'op-mini g'):''}${x.status==='Pending'&&can?' '+btn('pp-exempt','Exempt',`data-id="${p.id}" data-c="${E(c.id)}" data-n="${E(x.name)}"`):''}</td></tr>`),'No audience.')}`;
  const by=(k)=>{const m={};c.people.filter(x=>x.status!=='Exempt').forEach(x=>{const o=m[x[k]]=m[x[k]]||[0,0];o[1]++;if(x.status==='Attested')o[0]++});return Object.entries(m)};
  h+=`<div class="pp-fine" style="margin-top:8px"><b>By role:</b> ${by('role').map(([k,v])=>`${E(k||'None')} ${v[0]}/${v[1]}`).join(' · ')||'none'}<br><b>By unit:</b> ${by('unit').map(([k,v])=>`${E(k)} ${v[0]}/${v[1]}`).join(' · ')||'none'}</div>`}
 h+=`<div class="op-btns">${!c&&inAud&&!mineDone?btn('pp-attest',`Attest as ${me().name}`,`data-id="${p.id}"`,'op-mini g'):''}${can?btn('pp-camp-start',c?'Start new campaign':'Start campaign',`data-id="${p.id}"`,'op-mini p'):''}${can&&c&&c.status==='Open'?btn('pp-camp-remind','Send reminder',`data-id="${p.id}" data-c="${E(c.id)}"`):''}${(p.attLog||[]).length||c?btn('pp-evidence','Export evidence (CSV)',`data-id="${p.id}"`):''}</div></div>`;return h}
G.drawerHooks.push(d=>{
 if(d.type!=='policy')return;const body=document.getElementById('opDB'),p=find(d.id);if(!body||!p)return;
 try{
  if(p.status==='In review'&&p.chain&&!['done','changes','declined','cancelled'].includes(p.chain.stage)){$$('[data-op="pol-step"]',body).forEach(x=>x.remove())}
  let box=document.getElementById('ppBox');if(!box){box=document.createElement('div');box.id='ppBox';body.appendChild(box)}
  box.innerHTML=chainHtml(p)+docHtml(p)+campHtml(p)+detailsHtml(p)}catch(e){console.warn('policy-plus drawer',e)}});

// ---------------------------------------------------------------- tabs and panels
const TABS=[['hier','Hierarchy'],['rev','Review cycle'],['att','Attestation'],['cov','Coverage'],['tpl','Templates']];
function installTabs(){const view=document.getElementById('view-policies');if(!view)return false;
 let tabs=document.getElementById('opTabs-policies');
 if(!tabs){tabs=document.createElement('div');tabs.className='libtabs';tabs.id='opTabs-policies';tabs.setAttribute('role','tablist');tabs.innerHTML='<button class="libtab active" data-op="tab" data-view="policies" data-tab="library">Policy library</button>';const ph=view.querySelector('.pagehead');ph.parentNode.insertBefore(tabs,ph.nextSibling)}
 TABS.forEach(([k,l])=>{if(!tabs.querySelector(`[data-tab="${k}"]`)){const bt=document.createElement('button');bt.className='libtab';bt.dataset.op='tab';bt.dataset.view='policies';bt.dataset.tab=k;bt.textContent=l;tabs.appendChild(bt)}
  if(!view.querySelector(`[data-panel="policies:${k}"]`)){const pn=document.createElement('div');pn.className='op-panel';pn.dataset.panel='policies:'+k;view.appendChild(pn)}});return true}
function rLib(){const pn=panel('policies','library');if(!pn)return;const ps=P(),pub=ps.filter(p=>p.status==='Published'),rev=ps.filter(p=>p.status==='In review'),od=ps.filter(polOverdue),cv=cover();
 const noDoc=ps.filter(p=>!p.doc),noObl=cv.noObl,low=pub.filter(p=>attPct(p)<100),sa=pub.reduce((a,p)=>a+attCount(p),0),sb=pub.reduce((a,p)=>a+(p.aud||0),0),rate=sb?Math.round(sa/sb*100):0;
 const html=`<div class="op-kpis pp-kpis">${kpi('Published',pub.length,`of ${ps.length} controlled documents`,'ok',pub)}${kpi('In review',rev.length,`${ps.filter(p=>p.status==='Draft').length} more in draft`,rev.length?'':'',rev)}${kpi('Overdue for review',od.length,'past the next review date',od.length?'warn':'ok',od)}${kpi('Attestation rate',rate+'%',`${sa} of ${sb} attestations, published documents`,rate<85?'warn':'ok',low)}${kpi('Without a document',noDoc.length,'no managed document linked',noDoc.length?'warn':'ok',noDoc)}${kpi('Without an obligation',noObl.length,(S().obl||[]).length?'not tied to any obligation':'no framework adopted yet',noObl.length?'warn':'ok',noObl)}</div>`;
 const k=pn.querySelector('.op-kpis');if(k)k.outerHTML=html;else pn.insertAdjacentHTML('afterbegin',html);
 const sel=pn.querySelector('select[data-f="type"]');if(sel){const cur=(G.flt('policies','lib')||{}).type;['Standard','Guideline'].forEach(t=>{if(![...sel.options].some(o=>o.value===t)){const o=document.createElement('option');o.value=o.textContent=t;sel.appendChild(o)}});if(cur)sel.value=cur}}
function treeHtml(p,seen,depth){if(seen.has(p.id)||depth>6)return '';seen.add(p.id);const kids=P().filter(c=>c.parent===p.id&&!seen.has(c.id)),st=polSt(p);
 return `<li><div class="pp-node"><button class="op-link" data-op="open" data-t="policy" data-id="${E(p.id)}"><b>${E(p.id)}</b> ${E(p.title)}</button>${pill(p.type,'blue')}${pill(st,SK[st])}<span class="riskarea">v${E(p.ver)} · ${E(p.owner)}${kids.length?` · ${kids.length} child${kids.length===1?'':'ren'}`:''}</span></div>${kids.length?`<ul>${kids.map(k=>treeHtml(k,seen,depth+1)).join('')}</ul>`:''}</li>`}
function rHier(){const pn=panel('policies','hier');if(!pn)return;const ps=P(),root=p=>!p.parent||!find(p.parent),orph=ps.filter(p=>root(p)&&NEEDPARENT.includes(p.type)),roots=ps.filter(p=>root(p)&&!NEEDPARENT.includes(p.type)),seen=new Set();
 const withKids=roots.filter(r=>ps.some(c=>c.parent===r.id)),alone=roots.filter(r=>!ps.some(c=>c.parent===r.id));
 const tree=[...withKids,...alone].map(r=>treeHtml(r,seen,0)).join('');
 pn.innerHTML=`<div class="op-kpis">${kpi('Documents',ps.length,'in the hierarchy',undefined,ps)}${kpi('Top-level',roots.length,'no parent',undefined,roots)}${kpi('With a parent',ps.filter(p=>!root(p)).length,'standards, procedures and guidelines under a policy',undefined,ps.filter(p=>!root(p)))}${kpi('Orphaned',orph.length,'standards and procedures without a parent',orph.length?'warn':'ok',orph)}</div>`+
  card('Policy hierarchy','Policies with the standards, procedures and guidelines beneath them. Select a document to open it.',`<div style="padding:4px 16px 14px"><ul class="pp-tree" aria-label="Policy hierarchy">${tree||'<li class="op-note">No documents.</li>'}</ul></div>`)+
  card('Orphaned standards and procedures',`${orph.length} without a parent policy`,table(['ID','Document','Type','Owner','Status',''],orph.map(p=>`<tr data-op="open" data-t="policy" data-id="${p.id}"><td class="riskid">${p.id}</td><td><div class="riskname">${E(p.title)}</div></td><td>${pill('Orphaned: '+p.type,'amber')}</td><td>${own(p.owner)}</td><td>${pill(polSt(p),SK[polSt(p)])}</td><td>${canAct(p.owner)?btn('pp-edit','Set parent',`data-id="${p.id}"`):''}</td></tr>`),'No orphaned standards or procedures.'))}
function rRev(){const pn=panel('policies','rev');if(!pn)return;const pub=P().filter(p=>p.status==='Published'&&p.review).sort((a,b)=>a.review<b.review?-1:1),d=p=>dTo(p.review);
 const od=pub.filter(p=>d(p)<0),b30=pub.filter(p=>d(p)>=0&&d(p)<=30),b60=pub.filter(p=>d(p)>30&&d(p)<=60),b90=pub.filter(p=>d(p)>60&&d(p)<=90),list=pub.filter(p=>d(p)<=90);
 const rows=list.map(p=>{const n=d(p),last=(p.rem||[]).slice(-1)[0];return `<tr data-op="open" data-t="policy" data-id="${p.id}"><td class="riskid">${p.id}</td><td><div class="riskname">${E(p.title)}</div><div class="riskarea">${E(p.type)} · v${E(p.ver)} · every ${rmOf(p)} months</div></td><td>${own(p.owner)}</td><td>${fmt(p.review)}</td><td>${n<0?pill(`Overdue by ${-n} days`,'red'):pill(`Due in ${n} days`,n<=30?'amber':'blue')}</td><td>${last?fmt(last.ts.slice(0,10)):'-'}</td><td>${canAct(p.owner)?btn('pp-reviewed','Mark reviewed',`data-id="${p.id}"`,'op-mini g')+' ':''}${btn('pp-remind','Remind',`data-id="${p.id}"`)}</td></tr>`});
 pn.innerHTML=`<div class="op-kpis">${kpi('Overdue',od.length,'past the review date',od.length?'warn':'ok',od)}${kpi('Due in 30 days',b30.length,'review soon',b30.length?'warn':'ok',b30)}${kpi('Due in 31 to 60 days',b60.length,'plan the review',undefined,b60)}${kpi('Due in 61 to 90 days',b90.length,'on the horizon',undefined,b90)}</div>`+
  card('Overdue and due soon',`${list.length} published document${list.length===1?'':'s'} due within 90 days or overdue. The same list is available to the compliance calendar as GRC.policyDue().`,table(['ID','Document','Owner','Next review','Status','Last reminder',''],rows,'Nothing is overdue or due in the next 90 days.'),btn('pp-remind','Remind owners (overdue and next 30 days)','data-id="all"','op-mini p'))+
  `<p class="op-note">Reminders are recorded in the activity log${(G.api&&G.api.connected)?' and sent to the person as a notification (bell and email when configured)':' (sent as notifications when connected to the server)'}. The next review date is set from the review cycle each time a policy is published or reviewed.</p>`}
actions['pp-reviewed']=b=>actions['pol-reviewed'](b);
function rAtt(){const pn=panel('policies','att');if(!pn)return;const rows=[];P().forEach(p=>(p.camps||[]).filter(c=>c.status!=='Superseded').forEach(c=>rows.push([p,c])));
 const open=rows.filter(([,c])=>c.status==='Open'),late=open.filter(([,c])=>c.due<TODAY),ex=rows.reduce((a,[,c])=>a+c.people.filter(x=>x.status==='Exempt').length,0),tot=open.reduce((a,[,c])=>a+c.people.filter(x=>x.status!=='Exempt').length,0),dn=open.reduce((a,[,c])=>a+c.people.filter(x=>x.status==='Attested').length,0);
 pn.innerHTML=`<div class="op-kpis">${kpi('Open campaigns',open.length,'collecting attestations',undefined,open.map(([p])=>p))}${kpi('Completion',(tot?Math.round(dn/tot*100):0)+'%',`${dn} of ${tot} people, open campaigns`,tot&&dn/tot<.8?'warn':'ok')}${kpi('Past due',late.length,'campaigns with people still pending',late.length?'warn':'ok',late.map(([p])=>p))}${kpi('Exemptions',ex,'recorded with a reason')}</div>`+
  card('Attestation campaigns','Each attestation stores the time, the document version and the document checksum. Start a campaign from a published policy.',table(['Campaign','Policy','Version','Audience','Due','Completion','Status',''],rows.map(([p,c])=>{const pct=campPct(c),pend=c.people.filter(x=>x.status==='Pending').length;return `<tr data-op="open" data-t="policy" data-id="${p.id}"><td class="riskid">${E(c.id)}</td><td><div class="riskname">${E(p.title)}</div></td><td>v${E(c.ver)}</td><td>${c.people.length} (${c.mode==='all'?'all staff':c.mode==='roles'?'by role':'named'})</td><td>${fmt(c.due)}</td><td style="min-width:120px">${bar(pct,pct<80?'amber':'')}<div class="riskarea">${pct}% · ${pend} pending</div></td><td>${pill(c.status+(c.status==='Open'&&c.due<TODAY?' (past due)':''),c.status==='Complete'?'green':c.due<TODAY?'red':'amber')}</td><td>${c.status==='Open'&&canAct(p.owner)?btn('pp-camp-remind','Remind',`data-id="${p.id}" data-c="${E(c.id)}"`):''}</td></tr>`}),'No campaigns yet. Open a published policy and choose Start campaign.'),btn('pp-evidence','Export evidence (CSV)','data-id="all"','op-mini p'))}
function rCov(){const pn=panel('policies','cov');if(!pn)return;const cv=cover(),f=G.flt('policies','cov')||{},fws=['All',...new Set(cv.rows.map(r=>r.fwName))];
 const rows=cv.rows.filter(r=>G.match(f,r.o.id+(r.o.ref||'')+r.o.title+r.fwName)&&(!f.cov||f.cov==='All'||r.cov===f.cov)&&(!f.fw||f.fw==='All'||r.fwName===f.fw));
 const chips=(ids,t)=>ids.length?ids.map(id=>`<button class="op-link" data-op="open" data-t="${t}" data-id="${E(id)}">${E(id)}</button>`).join(' '):'<span class="riskarea">None</span>';
 const ck={'No policy':'red','Policy, no control':'amber',Covered:'green'};
 pn.innerHTML=`<div class="op-kpis">${kpi('Obligations',cv.rows.length,'in the register',undefined,cv.rows.map(r=>r.o))}${kpi('Covered',cv.rows.filter(r=>r.cov==='Covered').length,'policy and control','ok',cv.rows.filter(r=>r.cov==='Covered').map(r=>r.o))}${kpi('Policy but no control',cv.rows.filter(r=>r.cov==='Policy, no control').length,'cannot be tested',undefined,cv.rows.filter(r=>r.cov==='Policy, no control').map(r=>r.o))}${kpi('No policy',cv.gaps.length,'obligations with no policy',cv.gaps.length?'warn':'ok',cv.gaps.map(r=>r.o))}</div>`+
  G.toolbar('policies','cov','Search obligations, references, frameworks…',[['cov',['All','No policy','Policy, no control','Covered'],'All coverage'],['fw',fws,'All frameworks']])+
  card('Coverage matrix',`${rows.length} of ${cv.rows.length} obligations. A policy covers an obligation when its framework matches or it is linked explicitly.`,table(['Obligation','Requirement','Policies','Controls','Coverage',''],rows.map(r=>`<tr data-op="open" data-t="obligation" data-id="${E(r.o.id)}"><td class="riskid">${E(r.o.id)}</td><td><div class="riskname">${E(r.o.title)}</div><div class="riskarea">${E(r.fwName)}${r.o.ref?' · '+E(r.o.ref):''}</div></td><td style="white-space:normal">${chips(r.pols.map(p=>p.id),'policy')}</td><td style="white-space:normal">${chips(r.ctrls,'control')}</td><td>${pill(r.cov,ck[r.cov])}</td><td>${btn('pp-link-obl','Link',`data-obl="${E(r.o.id)}"`)}</td></tr>`),(S().obl||[]).length?'No obligations match.':'No framework is adopted, so there are no obligations yet.'),btn('pp-cov-export','Export CSV','','op-mini p'))+
  card('Obligations with no policy',`${cv.gaps.length} gap${cv.gaps.length===1?'':'s'}`,table(['Obligation','Requirement','Framework',''],cv.gaps.map(r=>`<tr data-op="open" data-t="obligation" data-id="${E(r.o.id)}"><td class="riskid">${E(r.o.id)}</td><td><div class="riskname">${E(r.o.title)}</div></td><td>${E(r.fwName)}</td><td>${btn('pp-link-obl','Link to a policy',`data-obl="${E(r.o.id)}"`)}</td></tr>`),'Every obligation has a policy.'))+
  card('Policies with no obligation',`${cv.noObl.length} polic${cv.noObl.length===1?'y':'ies'} not tied to an obligation`,table(['ID','Document','Frameworks',''],cv.noObl.map(p=>`<tr data-op="open" data-t="policy" data-id="${p.id}"><td class="riskid">${p.id}</td><td><div class="riskname">${E(p.title)}</div><div class="riskarea">${E(p.type)}</div></td><td>${E((p.fw||[]).join(', ')||'None')}</td><td>${btn('pp-link-pol','Link obligation',`data-id="${p.id}"`)}</td></tr>`),'Every policy covers at least one obligation.'))}
actions['pp-cov-export']=()=>{const cv=cover();csv('forge-policy-coverage.csv',[['Obligation','Framework','Reference','Requirement','Status','Policies','Controls','Coverage'],...cv.rows.map(r=>[r.o.id,r.fwName,r.o.ref||'',r.o.title,r.o.status||'',r.pols.map(p=>p.id).join(' '),r.ctrls.join(' '),r.cov])],`Coverage exported (${cv.rows.length} obligations).`)};
function rTpl(){const pn=panel('policies','tpl');if(!pn)return;const T=tpls();G.UI.filters.policiestpl=G.UI.filters.policiestpl||{sec:mySector()||'All'};const f=G.flt('policies','tpl');
 const cats=['All',...new Set(T.map(t=>t.category).filter(Boolean))],secs=['All',...new Set(T.flatMap(t=>t.sectors||[]).filter(s=>s!=='All'))];
 const rows=T.filter(t=>G.match(f,t.title+(t.purpose||'')+(t.category||'')+(t.id))&&(!f.cat||f.cat==='All'||t.category===f.cat)&&(!f.sec||f.sec==='All'||(t.sectors||[]).includes('All')||(t.sectors||[]).includes(f.sec)));
 pn.innerHTML=`<div class="op-banner amber"><div><b>Starting points only</b><div>${E(NOTICE)}</div></div></div>`+(T.length?G.toolbar('policies','tpl','Search templates…',[['cat',cats,'All categories'],['sec',secs,'All sectors']]):'')+
  card('Policy templates',T.length?`${rows.length} of ${T.length} templates${mySector()?' · your profile sector: '+E(mySector()):''}`:'The template library is empty.',table(['Template','Category','Type','Sectors','Review','Frameworks',''],rows.map(t=>`<tr data-op="open" data-t="poltpl" data-id="${E(t.id)}"><td><div class="riskname">${E(t.title)}</div><div class="riskarea">${E((t.purpose||'').slice(0,110))}</div></td><td>${E(t.category||'')}</td><td>${E(t.type||'Policy')}</td><td style="white-space:normal">${E((t.sectors||[]).join(', '))}</td><td>${E(t.reviewMonths||12)} months</td><td style="white-space:normal">${E((t.frameworks||[]).map(fwLabel).join(', '))}</td><td>${btn('pp-tpl-create','Create policy',`data-id="${E(t.id)}"`,'op-mini p')}</td></tr>`),T.length?'No templates match the filters.':'No templates are loaded.'))}

let tabsOk=false;
function renderPP(){
 try{migrate();if(!tabsOk)tabsOk=installTabs();if(!tabsOk)return;rLib();rHier();rRev();rAtt();rCov();rTpl()}catch(e){console.error('policy-plus render failed',e)}}
G.renders.push(renderPP);
G.policyPlus={plusDays,diffLines,redlineHtml,tplText,cover,evidence,snapOf,addMonths,NOTICE};
G.renderAll();
})();
