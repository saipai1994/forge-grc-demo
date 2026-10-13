// Reports and declarations: staff-reported events, policy exceptions, conflicts of interest and gifts,
// and a restricted speak-up inbox. Anonymous speak-up reports never enter the shared workspace: they
// live on the server and only administrators and auditors can read them.
(function(){
const G=window.GRC;if(!G)return;
const {E,fmt,pill,own,table,card,kpi,TODAY,detail,toast,logIt,commit,actions,risks,openForm,openDrawer,panel,head,personOpts,nextId,addDays,dTo,me}=G;
const S=()=>G.S();
const isAdmin=()=>me().role==='Administrator';
const GROUP='GOVERNANCE & ASSURANCE';
const approverDefault=()=>{try{const u=workflowUsers.find(x=>x.role==='Administrator'&&x.name!==me().name)||workflowUsers.find(x=>x.role==='Administrator');return u?u.name:G.people()[0]}catch{return G.people()[0]}};
const EVT=()=>S().evt||[],EXC=()=>S().exc||[],COI=()=>S().coi||[];
const seqs=()=>{const s=S();if(!s.seq)s.seq={};[['evt',3],['exc',2],['coi',3]].forEach(([k,n])=>{if(!(s.seq[k]>0))s.seq[k]=n})};
const EK={New:'amber',Triage:'amber',Assigned:'blue',Closed:'green'};
const XK={Pending:'amber',Approved:'green',Rejected:'red',Expired:'red'};
const CK={Declared:'amber','Under review':'amber',Cleared:'green',Mitigated:'blue',Declined:'red'};
const excStatus=x=>x.status==='Approved'&&x.expires&&x.expires<TODAY?'Expired':x.status;

// ---------------------------------------------------------------- sample records
G.seeders.evt=()=>{const r=risks.slice(0,3);if(!r.length)return[];const P=G.people();
 return[{id:'EVT-001',type:'Near miss',title:'Wrong file shared with an external party, caught before opening',desc:'A report with customer names was attached to the wrong email. The recipient was asked to delete it unread.',date:addDays(TODAY,-6),reportedBy:P[1]||'Staff',area:r[0].area,severity:'Medium',status:'New',assignee:'',link:'',outcome:''},
  {id:'EVT-002',type:'Control failure',title:'Daily reconciliation was skipped for two days',desc:'The reconciliation job failed silently on the weekend and nobody noticed until Monday.',date:addDays(TODAY,-12),reportedBy:P[2]||'Staff',area:r[1]?r[1].area:r[0].area,severity:'High',status:'Assigned',assignee:P[0]||'',link:'',outcome:''}]};
G.seeders.exc=()=>{const p=(S().policies||[]).find(x=>x.status==='Published');if(!p)return[];
 return[{id:'EXC-001',policy:p.id,title:`Exception to ${p.title}`,reason:'A legacy system cannot yet support the required control. The upgrade is scheduled.',compensating:'Weekly manual review by the owner and an extra approval for exceptions above the limit.',requestedBy:G.people()[1]||'Staff',approver:'Morgan Chen',status:'Pending',created:addDays(TODAY,-4),expires:addDays(TODAY,90),decided:'',comment:''}]};
G.seeders.coi=()=>[{id:'COI-001',type:'Gift received',person:G.people()[3]||'Staff',description:'Hamper from a software vendor at the year-end event',counterparty:'Vendor under contract renewal',value:4500,date:addDays(TODAY,-15),status:'Under review',reviewer:'Morgan Chen',comment:''},
 {id:'COI-002',type:'Outside activity',person:G.people()[2]||'Staff',description:'Unpaid advisory role on a university industry board',counterparty:'University',value:0,date:addDays(TODAY,-60),status:'Cleared',reviewer:'Morgan Chen',comment:'No overlap with duties.'}];

G.mount({id:'intake',label:'Reports and declarations',ico:'✎',group:GROUP,title:'Reports and declarations',sub:'Events staff report, policy exceptions, conflicts of interest and gifts, and the speak-up inbox for confidential reports.',tabs:[['evt','Events and incidents'],['exc','Policy exceptions'],['coi','Conflicts and gifts'],['spk','Speak-up']]});

// ---------------------------------------------------------------- speak-up store: server when connected, local demo otherwise
const DEMO_KEY='forgeGrcSpkDemo';
const demoLoad=()=>{try{const v=JSON.parse(localStorage.getItem(DEMO_KEY)||'null');if(v)return v}catch{}return[{id:'SU-1001',ts:addDays(TODAY,-9)+'T09:10:00Z',category:'Bribery or corruption',body:'A supplier representative told me a payment to a procurement manager would "help the contract along". I did not see the payment.',contact:'',status:'Under review',assignee:'Audrey Kim',outcome:'',updates:[{ts:addDays(TODAY,-9)+'T09:10:00Z',by:'System',text:'Report received.',public:true},{ts:addDays(TODAY,-7)+'T11:00:00Z',by:'Audrey Kim',text:'Reviewed procurement approvals for the period.',public:false}]}]};
let SPK=null,SPK_ERR='';
const demoSave=()=>{try{localStorage.setItem(DEMO_KEY,JSON.stringify(SPK))}catch{}};
const live=()=>G.api&&G.api.connected;
async function loadSpk(){
 if(!live()){SPK=demoLoad();SPK_ERR='';renderSpk();return}
 if(!['Administrator','Auditor'].includes(me().role)){SPK=[];SPK_ERR='Speak-up reports are restricted to administrators and auditors.';renderSpk();return}
 try{const r=await G.api.call('GET','/api/speakup');if(r.ok){SPK=r.data.rows;SPK_ERR=''}else{SPK=[];SPK_ERR=r.data.error||'Could not load reports.'}}catch{SPK=[];SPK_ERR='Could not reach the server.'}renderSpk()}
async function patchSpk(id,body){
 if(!live()){const r=SPK.find(x=>x.id===id);if(!r)return false;const now=new Date().toISOString();
  if(body.status!==undefined&&body.status!==r.status){r.updates.push({ts:now,by:me().name,text:'Status changed to '+body.status+'.',public:true});r.status=body.status}
  if(body.assignee!==undefined)r.assignee=body.assignee||null;if(body.outcome!==undefined)r.outcome=body.outcome;
  if(body.note)r.updates.push({ts:now,by:me().name,text:body.note,public:!!body.public});demoSave();renderSpk();return true}
 const r=await G.api.call('PATCH','/api/speakup/'+id,body);if(!r.ok){toast(r.data.error||'Could not save.');return false}
 const i=SPK.findIndex(x=>x.id===id);if(i>=0)SPK[i]=r.data.row;renderSpk();return true}

// ---------------------------------------------------------------- render
function renderIntake(){
 const adm=true;seqs();
 head('intake','<button class="btn primary" data-op="evt-new"><span class="btnico">＋</span>Report an event</button><button class="btn" data-op="exc-new">Request an exception</button><button class="btn" data-op="coi-new">Declare</button>');
 const ev=EVT(),open=ev.filter(e=>e.status!=='Closed');
 panel('intake','evt').innerHTML=`<div class="op-kpis">${kpi('Events reported',ev.length,'all time','',ev)}${kpi('Waiting for triage',ev.filter(e=>e.status==='New').length,'new, not yet looked at','',ev.filter(e=>e.status==='New'))}${kpi('Open',open.length,'not yet closed','',open)}${kpi('High severity',ev.filter(e=>e.severity==='High'||e.severity==='Critical').length,'as reported','',ev.filter(e=>e.severity==='High'||e.severity==='Critical'))}</div>`+
  card('Events and incidents','Anyone can report an incident, near miss, control failure or suspected fraud. Triage turns a report into an issue or a loss event.',table(['ID','Event','Reported by','Date','Severity','Status'],ev.map(e=>`<tr data-op="open" data-t="evt" data-id="${e.id}"><td class="riskid">${e.id}</td><td><div class="riskname">${E(e.title)}</div><div class="riskarea">${E(e.type)} · ${E(e.area||'')}</div></td><td>${own(e.reportedBy)}</td><td>${fmt(e.date)}</td><td>${G.sev?G.sev(e.severity):E(e.severity)}</td><td>${pill(e.status,EK[e.status])}</td></tr>`),'No events reported.'),'<button class="op-mini p" data-op="evt-new">Report an event</button>');
 const ex=EXC();
 panel('intake','exc').innerHTML=card('Policy exceptions','A time-limited approval to depart from a policy, with compensating controls. The requester cannot approve their own.',table(['ID','Exception','Requested by','Approver','Expires','Status'],ex.map(x=>{const st=excStatus(x);return `<tr data-op="open" data-t="exc" data-id="${x.id}"><td class="riskid">${x.id}</td><td><div class="riskname">${E(x.title)}</div><div class="riskarea">${E(x.policy)}</div></td><td>${own(x.requestedBy)}</td><td>${own(x.approver)}</td><td>${x.expires?fmt(x.expires):'—'}</td><td>${pill(st,XK[st])}</td></tr>`}),'No exceptions requested.'),'<button class="op-mini p" data-op="exc-new">Request an exception</button>');
 const co=COI();
 panel('intake','coi').innerHTML=card('Conflicts of interest and gifts','Declare outside activities, conflicts and gifts given or received. A reviewer decides and records why.',table(['ID','Declaration','Person','Date','Value','Status'],co.map(x=>`<tr data-op="open" data-t="coi" data-id="${x.id}"><td class="riskid">${x.id}</td><td><div class="riskname">${E(x.description)}</div><div class="riskarea">${E(x.type)} · ${E(x.counterparty||'')}</div></td><td>${own(x.person)}</td><td>${fmt(x.date)}</td><td>${x.value?G.inr(x.value):'—'}</td><td>${pill(x.status,CK[x.status])}</td></tr>`),'No declarations.'),'<button class="op-mini p" data-op="coi-new">Make a declaration</button>');
 renderSpk();
}
function renderSpk(){
 const pn=panel('intake','spk');if(!pn)return;
 if(SPK===null){pn.innerHTML='<p class="op-note">Loading…</p>';return}
 const dem=!live();
 const ban=dem?`<div class="op-banner amber" style="margin-bottom:12px"><div><b>Demo mode</b><div>These reports are stored only in this browser. With the server running, people report at <code>/report.html</code> without signing in, and only administrators and auditors can read them here.</div></div><button class="op-mini p" data-op="spk-test">Submit a test report</button></div>`:'';
 if(SPK_ERR){pn.innerHTML=`<div class="op-banner amber"><div><b>Restricted</b><div>${E(SPK_ERR)}</div></div></div>`;return}
 const open=SPK.filter(r=>!/^Closed/.test(r.status));
 pn.innerHTML=ban+`<div class="op-kpis">${kpi('Reports',SPK.length,'received',undefined,undefined)}${kpi('Open',open.length,'not yet closed')}${kpi('Not yet assigned',open.filter(r=>!r.assignee).length,'need an investigator',open.some(r=>!r.assignee)?'warn':'ok')}${kpi('Public form',live()?'/report.html':'server needed','no sign-in, no tracking')}</div>`+
  card('Speak-up inbox','Confidential. Opening a report is recorded in the audit trail.',table(['ID','Category','Received','Investigator','Status'],SPK.map(r=>`<tr data-op="open" data-t="spk" data-id="${E(r.id)}"><td class="riskid">${E(r.id)}</td><td><div class="riskname">${E(r.category)}</div></td><td>${fmt(r.ts.slice(0,10))}</td><td>${r.assignee?own(r.assignee):'<span style="color:#ad4b45">Unassigned</span>'}</td><td>${pill(r.status,/^Closed/.test(r.status)?'green':r.status==='Received'?'amber':'blue')}</td></tr>`),'No reports yet.'));
}
G.renders.push(renderIntake);
let spkLoaded=false;G.renders.push(()=>{if(!spkLoaded&&SPK===null){spkLoaded=true;loadSpk()}});
document.addEventListener('click',e=>{const t=e.target.closest('[data-op="tab"][data-view="intake"][data-tab="spk"]');if(t)loadSpk()});

// ---------------------------------------------------------------- drawers
G.drawers.evt=id=>{const e=EVT().find(x=>x.id===id);if(!e){G.setDrawer('Event','Not found','<p class="op-note">This event no longer exists.</p>');return}
 const P=[];if(e.status==='New')P.push(['amber','Not yet triaged. Decide whether this becomes an issue, a loss event, or is closed.']);
 detail({kicker:'Reported event · '+e.id,title:e.title,pending:P,ok:e.status==='Closed'?'Closed.':'Being handled.',todo:['Check what happened and how serious it was.','Raise an issue so it is tracked to closure, or log a loss event if money was lost.','Record the outcome and close it.'],
  facts:[['Type',E(e.type)],['Reported by',own(e.reportedBy)],['Date',fmt(e.date)],['Area',E(e.area||'—')],['Severity',E(e.severity)],['Status',pill(e.status,EK[e.status])],['Triaged to',E(e.assignee||'—')]],
  buttons:e.status!=='Closed'&&me().role!=='Auditor'?`<button class="op-mini p" data-op="evt-issue" data-id="${e.id}">Raise an issue</button><button class="op-mini" data-op="evt-loss" data-id="${e.id}">Log as loss event</button><button class="op-mini" data-op="evt-close" data-id="${e.id}">Close</button>`:'',
  extra:`<h4>What happened</h4><p>${E(e.desc)}</p>${e.outcome?`<h4>Outcome</h4><p>${E(e.outcome)}</p>`:''}`,links:[e.link].filter(Boolean)})};
G.drawers.exc=id=>{const x=EXC().find(q=>q.id===id);if(!x){G.setDrawer('Exception','Not found','<p class="op-note">This exception no longer exists.</p>');return}
 const st=excStatus(x),P=[];if(st==='Pending')P.push(['amber',`Waiting for ${E(x.approver)}.`]);if(st==='Approved'&&dTo(x.expires)<=30)P.push([dTo(x.expires)<=7?'red':'amber',`Expires in ${dTo(x.expires)} day(s). Renew it or bring the system into line.`]);if(st==='Expired')P.push(['red','Expired. The departure from policy is no longer approved.']);
 const can=st==='Pending'&&x.requestedBy!==me().name&&(x.approver===me().name||isAdmin());
 detail({kicker:'Policy exception · '+x.id,title:x.title,pending:P,ok:'Approved and in date.',todo:['Check the reason and the compensating controls are enough.','Approve with an expiry, or reject and ask for the policy to be followed.'],
  facts:[['Policy',E(x.policy)],['Requested by',own(x.requestedBy)],['Approver',own(x.approver)],['Expires',x.expires?fmt(x.expires):'—'],['Status',pill(st,XK[st])],['Decided',x.decided?fmt(x.decided):'—']],
  buttons:can?`<button class="op-mini p" data-op="exc-decide" data-id="${x.id}" data-d="Approved">Approve</button><button class="op-mini" data-op="exc-decide" data-id="${x.id}" data-d="Rejected">Reject</button>`:'',
  extra:`<h4>Reason</h4><p>${E(x.reason)}</p><h4>Compensating controls</h4><p>${E(x.compensating||'None stated')}</p>${x.comment?`<h4>Decision comment</h4><p>${E(x.comment)}</p>`:''}`,links:[x.policy]})};
G.drawers.coi=id=>{const x=COI().find(q=>q.id===id);if(!x){G.setDrawer('Declaration','Not found','<p class="op-note">This declaration no longer exists.</p>');return}
 const P=[];if(['Declared','Under review'].includes(x.status))P.push(['amber',`Waiting for ${E(x.reviewer)} to review.`]);
 const can=['Declared','Under review'].includes(x.status)&&x.person!==me().name&&(x.reviewer===me().name||isAdmin());
 detail({kicker:'Declaration · '+x.id,title:x.description,pending:P,ok:'Reviewed.',todo:['Check the gift or interest against the code of conduct and any live decisions the person makes.','Clear it, require mitigation (for example, step aside from decisions), or decline.'],
  facts:[['Type',E(x.type)],['Person',own(x.person)],['Counterparty',E(x.counterparty||'—')],['Value',x.value?G.inr(x.value):'—'],['Date',fmt(x.date)],['Reviewer',own(x.reviewer)],['Status',pill(x.status,CK[x.status])]],
  buttons:can?`<button class="op-mini p" data-op="coi-decide" data-id="${x.id}" data-d="Cleared">Clear</button><button class="op-mini" data-op="coi-decide" data-id="${x.id}" data-d="Mitigated">Clear with mitigation</button><button class="op-mini" data-op="coi-decide" data-id="${x.id}" data-d="Declined">Decline</button>`:'',
  extra:x.comment?`<h4>Reviewer comment</h4><p>${E(x.comment)}</p>`:''})};
G.drawers.spk=id=>{const r=(SPK||[]).find(x=>x.id===id);if(!r){G.setDrawer('Speak-up','Not available','<p class="op-note">Open the Speak-up tab first, or you may not have access.</p>');return}
 const P=[];if(!r.assignee&&!/^Closed/.test(r.status))P.push(['red','No investigator assigned.']);if(r.status==='Received')P.push(['amber','Not yet reviewed.']);
 const investigators=(()=>{try{return workflowUsers.filter(u=>['Administrator','Auditor'].includes(u.role)).map(u=>u.name)}catch{return[]}})();
 const STS=['Received','Under review','Investigating','Closed - substantiated','Closed - not substantiated','Closed - no action'];
 detail({kicker:'Speak-up report · '+r.id,title:r.category,pending:P,ok:'Being handled.',todo:['Assign an investigator who is independent of the people named.','Keep the reporter informed with public replies; keep notes internal.','Record the outcome and close with a reason.'],
  facts:[['Received',fmt(r.ts.slice(0,10))],['Status',pill(r.status,/^Closed/.test(r.status)?'green':'amber')],['Investigator',r.assignee?own(r.assignee):'Unassigned'],['Reporter contact',E(r.contact||'None given')]],
  buttons:`<select class="select" id="spkStatus">${STS.map(s=>`<option${s===r.status?' selected':''}>${s}</option>`).join('')}</select><select class="select" id="spkAssign"><option value="">Unassigned</option>${investigators.map(n=>`<option${n===r.assignee?' selected':''}>${E(n)}</option>`).join('')}</select><button class="op-mini p" data-op="spk-save" data-id="${E(r.id)}">Save</button>`,
  extra:`<h4>Report</h4><p style="white-space:pre-wrap">${E(r.body)}</p><h4>Thread</h4>${r.updates.map(u=>`<div class="op-li"><div><b>${E(u.by)}</b> <span class="riskarea">${E((u.ts||'').slice(0,16).replace('T',' '))} · ${u.public?'visible to reporter':'internal'}</span><div style="white-space:pre-wrap">${E(u.text)}</div></div></div>`).join('')}<div style="margin-top:10px"><textarea id="spkNote" style="width:100%;min-height:70px;border:1px solid #dde2e8;border-radius:8px;padding:8px" placeholder="Write a note or a reply"></textarea><div class="op-btns"><button class="op-mini" data-op="spk-note" data-id="${E(r.id)}" data-pub="0">Add internal note</button><button class="op-mini p" data-op="spk-note" data-id="${E(r.id)}" data-pub="1">Reply to reporter</button></div></div>${r.outcome?`<h4>Outcome</h4><p>${E(r.outcome)}</p>`:''}<button class="op-mini" data-op="spk-outcome" data-id="${E(r.id)}">Record outcome</button>`})};
G.parents.exc=id=>{const x=EXC().find(q=>q.id===id);return x?['policy',x.policy]:null};
G.linkers.push(id=>{let x;if(/^EVT-/.test(id)&&(x=EVT().find(q=>q.id===id)))return{type:'evt',label:`${x.id} · ${x.title}`};if(/^EXC-/.test(id)&&(x=EXC().find(q=>q.id===id)))return{type:'exc',label:`${x.id} · ${x.title}`};if(/^COI-/.test(id)&&(x=COI().find(q=>q.id===id)))return{type:'coi',label:`${x.id} · ${x.description}`};return null});

// ---------------------------------------------------------------- actions
const EVT_TYPES=['Incident','Near miss','Control failure','Suspected fraud','Data or privacy event','Safety event'];
Object.assign(actions,{
 'evt-new':()=>{seqs();openForm('Report an event',[{name:'type',label:'What kind of event?',type:'select',options:EVT_TYPES},{name:'title',label:'Short title',full:true},{name:'desc',label:'What happened?',type:'textarea',full:true},{name:'date',label:'When',type:'date',value:TODAY},{name:'area',label:'Area',type:'select',options:[...new Set(risks.map(r=>r.area))]},{name:'severity',label:'How serious do you think it is?',type:'select',options:['Low','Medium','High','Critical'],value:'Medium'}],'Submit report',v=>{
   if(!v.title||v.desc.length<10)return 'Add a title and a short description.';const id=nextId('evt','EVT-',3);S().evt=S().evt||[];S().evt.unshift({id,type:v.type,title:v.title,desc:v.desc,date:v.date||TODAY,reportedBy:me().name,area:v.area,severity:v.severity,status:'New',assignee:'',link:'',outcome:''});logIt(id,'Event reported.');commit();toast(`${id} reported. Thank you.`)})},
 'evt-issue':b=>{const e=EVT().find(x=>x.id===b.dataset.id);if(!e)return;const sv={Critical:'Critical',High:'High',Medium:'Medium',Low:'Low'}[e.severity]||'Medium';const i=G.raise('Self-reported',e.id,e.title,sv,me().name,e.desc,'To be determined');e.status='Assigned';e.assignee=me().name;e.link=i.id;logIt(e.id,`Triaged to issue ${i.id}.`);commit();openDrawer('evt',e.id)},
 'evt-loss':b=>{const e=EVT().find(x=>x.id===b.dataset.id);if(!e)return;openForm('Log as loss event',[{name:'gross',label:`Gross loss (${G.cur?G.cur().sym:'₹'})`,type:'number',value:'0'},{name:'risk',label:'Linked risk',type:'select',options:G.riskOpts(true)}],'Log',v=>{const id=nextId('loss','LE-',3);S().losses.unshift({id,date:e.date,title:e.title,cat:'Process failure',risk:v.risk||'',gross:+v.gross||0,rec:0,status:'Open',reporter:e.reportedBy});e.status='Assigned';e.assignee=me().name;e.link=id;logIt(e.id,`Logged as loss event ${id}.`);commit()})},
 'evt-close':b=>{const e=EVT().find(x=>x.id===b.dataset.id);if(!e)return;openForm('Close event',[{name:'o',label:'Outcome',type:'textarea',full:true}],'Close',v=>{if(!v.o)return 'Say what was done.';e.status='Closed';e.outcome=v.o;logIt(e.id,'Event closed.');commit()})},
 'exc-new':()=>{seqs();openForm('Request a policy exception',[{name:'policy',label:'Policy',type:'select',options:(S().policies||[]).map(p=>[p.id,`${p.id} · ${p.title}`]),full:true},{name:'reason',label:'Why is an exception needed?',type:'textarea',full:true},{name:'comp',label:'What compensating controls apply?',type:'textarea',full:true},{name:'expires',label:'Until',type:'date',value:addDays(TODAY,90)},{name:'approver',label:'Approver',type:'select',options:personOpts(),value:approverDefault()}],'Submit request',v=>{
   if(!v.policy||v.reason.length<15)return 'Explain why the exception is needed.';if(v.expires<=TODAY)return 'Choose an end date in the future.';if(v.approver===me().name&&!isAdmin())return 'Choose someone else to approve.';
   const p=(S().policies||[]).find(x=>x.id===v.policy),id=nextId('exc','EXC-',3);S().exc=S().exc||[];S().exc.unshift({id,policy:v.policy,title:`Exception to ${p?p.title:v.policy}`,reason:v.reason,compensating:v.comp,requestedBy:me().name,approver:v.approver,status:'Pending',created:TODAY,expires:v.expires,decided:'',comment:''});logIt(id,'Policy exception requested.');commit();toast(`${id} sent to ${v.approver}.`)})},
 'exc-decide':b=>{const x=EXC().find(q=>q.id===b.dataset.id);if(!x)return;const d=b.dataset.d;openForm(d==='Approved'?'Approve exception':'Reject exception',[{name:'c',label:'Comment',type:'textarea',full:true}],d==='Approved'?'Approve':'Reject',v=>{if(d==='Rejected'&&!v.c)return 'A rejection needs a comment.';x.status=d;x.decided=TODAY;x.comment=v.c||'';logIt(x.id,`Exception ${d.toLowerCase()} by ${me().name}.`);commit()})},
 'coi-new':()=>{seqs();openForm('Make a declaration',[{name:'type',label:'Type',type:'select',options:['Conflict of interest','Gift received','Gift offered','Outside activity']},{name:'description',label:'What are you declaring?',type:'textarea',full:true},{name:'counterparty',label:'Who or what is it with?',full:true},{name:'value',label:`Approximate value (${G.cur?G.cur().sym:'₹'})`,type:'number',value:'0'},{name:'date',label:'Date',type:'date',value:TODAY},{name:'reviewer',label:'Reviewer',type:'select',options:personOpts(),value:approverDefault()}],'Submit',v=>{
   if(v.description.length<8)return 'Describe what you are declaring.';if(v.reviewer===me().name&&!isAdmin())return 'Choose someone else to review it.';const id=nextId('coi','COI-',3);S().coi=S().coi||[];S().coi.unshift({id,type:v.type,person:me().name,description:v.description,counterparty:v.counterparty,value:+v.value||0,date:v.date||TODAY,status:'Declared',reviewer:v.reviewer,comment:''});logIt(id,'Declaration made.');commit();toast(`${id} sent to ${v.reviewer}.`)})},
 'coi-decide':b=>{const x=COI().find(q=>q.id===b.dataset.id);if(!x)return;const d=b.dataset.d;openForm('Decision: '+d,[{name:'c',label:'Why?',type:'textarea',full:true}],'Save decision',v=>{if(!v.c)return 'Record the reason.';x.status=d;x.comment=v.c;logIt(x.id,`Declaration ${d.toLowerCase()} by ${me().name}.`);commit()})},
 'spk-save':async b=>{const st=document.getElementById('spkStatus').value,as=document.getElementById('spkAssign').value;if(await patchSpk(b.dataset.id,{status:st,assignee:as}))toast('Saved.')},
 'spk-note':async b=>{const t=document.getElementById('spkNote').value.trim();if(t.length<2){toast('Write something first.');return}if(await patchSpk(b.dataset.id,{note:t,public:b.dataset.pub==='1'}))toast(b.dataset.pub==='1'?'Reply sent to the reporter.':'Note added.')},
 'spk-outcome':b=>openForm('Record outcome',[{name:'o',label:'Outcome and action taken',type:'textarea',full:true}],'Save',v=>{if(!v.o)return 'Describe the outcome.';patchSpk(b.dataset.id,{outcome:v.o})}),
 'spk-test':()=>{const id='SU-'+(1000+(SPK||[]).length+1);SPK=SPK||[];SPK.unshift({id,ts:new Date().toISOString(),category:'Fraud or financial misconduct',body:'Test report: expense claims for a team event appear to have been split to stay under the approval limit.',contact:'',status:'Received',assignee:null,outcome:'',updates:[{ts:new Date().toISOString(),by:'System',text:'Report received.',public:true}]});demoSave();renderSpk();toast(id+' received.')}
});

(G.connectHooks=G.connectHooks||[]).push(()=>{SPK=null;spkLoaded=false;loadSpk()});
// quick "Report" button for everyone
const top=document.querySelector('.top-actions');if(top&&!document.getElementById('rptBtn')){const b=document.createElement('button');b.id='rptBtn';b.className='btn';b.textContent='＋ Report';b.title='Report an event, request an exception or make a declaration';b.onclick=()=>actions['evt-new']();top.prepend(b)}
G.renderAll();
})();
