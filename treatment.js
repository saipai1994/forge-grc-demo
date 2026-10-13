// Risk treatment: formal risk acceptances with approval and expiry, treatment plans with actions,
// and one queue of everything waiting for a decision. Decisions are checked on the server too.
(function(){
const G=window.GRC;if(!G)return;
const {E,fmt,pill,own,table,card,kpi,TODAY,detail,toast,logIt,commit,actions,risks,openForm,openDrawer,panel,head,personOpts,nextId,addDays,dTo,me,riskOpts}=G;
const S=()=>G.S();
const GROUP='GOVERNANCE & ASSURANCE';
const isAdmin=()=>me().role==='Administrator';
const SLA={acc:7,plans:10};
const ACC=()=>S().acc||[],PLANS=()=>S().plans||[];
const rk=id=>risks.find(r=>r.id===id)||{id,name:id,score:0,rating:'—',area:'',owner:''};
const accStatus=a=>a.status==='Active'&&a.expires&&a.expires<TODAY?'Expired':a.status;
const AK={Pending:'amber',Active:'green',Rejected:'red',Expired:'red',Revoked:'red'};
const PK={Draft:'blue','Pending approval':'amber',Approved:'blue','In progress':'amber',Complete:'green',Rejected:'red',Cancelled:'red'};
const lateBy=(rec,kind)=>{const due=addDays(rec.created,SLA[kind]);return dTo(due)<0?-dTo(due):0};
const approverDefault=()=>{try{const u=workflowUsers.find(x=>x.role==='Administrator'&&x.name!==me().name)||workflowUsers.find(x=>x.role==='Administrator');return u?u.name:G.people()[0]}catch{return G.people()[0]}};
G.seeders.acc=()=>{const top=[...risks].sort((a,b)=>b.score-a.score);const r1=top[2]||top[0],r2=top[3]||top[0];if(!r1)return[];
 return[{id:'ACC-001',risk:r1.id,title:`Accept residual exposure on ${r1.name}`,rationale:'Cost of further mitigation exceeds the expected loss this year. Compensating monitoring is in place.',score:r1.score,requestedBy:r1.owner,approver:'Morgan Chen',status:'Active',expires:addDays(TODAY,24),created:addDays(TODAY,-160),decided:addDays(TODAY,-157),decidedBy:'Morgan Chen',comment:'Approved for 6 months with monthly KRI review.'},
  {id:'ACC-002',risk:r2.id,title:`Accept ${r2.name} until the system upgrade lands`,rationale:'Fix depends on the platform upgrade planned next quarter.',score:r2.score,requestedBy:r2.owner,approver:'Morgan Chen',status:'Pending',expires:addDays(TODAY,120),created:addDays(TODAY,-9),decided:'',decidedBy:'',comment:''}]};
G.seeders.plans=()=>{const top=[...risks].sort((a,b)=>b.score-a.score);const r=top[0];if(!r)return[];
 return[{id:'TP-001',risk:r.id,title:`Reduce ${r.name}`,strategy:'Mitigate',owner:r.owner,due:addDays(TODAY,75),status:'In progress',created:addDays(TODAY,-40),approver:'Morgan Chen',approvedBy:'Morgan Chen',cost:'',target:Math.max(4,r.score-8),actions:[{id:'TPA-001',text:'Agree the target control design with the owner',owner:r.owner,due:addDays(TODAY,-10),done:true},{id:'TPA-002',text:'Implement the new control and train staff',owner:r.owner,due:addDays(TODAY,30),done:false},{id:'TPA-003',text:'Test the control and confirm residual score',owner:'Morgan Chen',due:addDays(TODAY,70),done:false}]}]};
const seqs=()=>{const s=S();if(!s.seq)s.seq={};['acc','plan','tpa'].forEach(k=>{if(!(s.seq[k]>0))s.seq[k]=k==='tpa'?10:k==='plan'?2:3})};

G.mount({id:'treat',label:'Risk treatment',ico:'⚖',group:GROUP,title:'Risk treatment',sub:'Formal risk acceptances with approval and expiry, treatment plans with actions, and everything waiting for a decision.',tabs:[['queue','Approvals'],['acc','Risk acceptances'],['plans','Treatment plans']]});

// ---------------------------------------------------------------- what is waiting for me
function waiting(name){const out=[];ACC().filter(a=>a.status==='Pending'&&(a.approver===name||isAdmin()&&name===me().name)).forEach(a=>out.push({type:'acc',id:a.id,title:a.title,by:a.requestedBy,created:a.created,late:lateBy(a,'acc'),risk:a.risk}));
 PLANS().filter(p=>p.status==='Pending approval'&&(p.approver===name||isAdmin()&&name===me().name)).forEach(p=>out.push({type:'plan',id:p.id,title:p.title,by:p.owner,created:p.created,late:lateBy(p,'plans'),risk:p.risk}));return out}
G.approvalsFor=waiting;
const canDecide=(rec,who)=>rec.requestedBy!==who&&rec.owner!==who&&(rec.approver===who||isAdmin());

function renderTreat(){
 seqs();
 const mine=waiting(me().name),allP=[...ACC().filter(a=>a.status==='Pending'),...PLANS().filter(p=>p.status==='Pending approval')];
 head('treat',`<button class="btn" data-op="plan-new"><span class="btnico">＋</span>Treatment plan</button><button class="btn primary" data-op="acc-new"><span class="btnico">＋</span>Request risk acceptance</button>`);
 const row=x=>`<tr data-op="open" data-t="${x.type}" data-id="${x.id}"><td class="riskid">${x.id}</td><td><div class="riskname">${E(x.title)}</div><div class="riskarea">${E(x.risk)} · requested by ${E(x.by)}</div></td><td>${fmt(x.created)}</td><td>${x.late?pill('Overdue by '+x.late+' d','red'):pill('Within SLA','green')}</td><td>${pill(x.type==='acc'?'Risk acceptance':'Treatment plan','blue')}</td></tr>`;
 const act=ACC().filter(a=>accStatus(a)==='Active'),exp=act.filter(a=>dTo(a.expires)<=30);
 panel('treat','queue').innerHTML=`<div class="op-kpis">${kpi('Waiting for me',mine.length,mine.length?'decide to keep risks moving':'nothing to decide','',mine.map(x=>x.id))}${kpi('Waiting overall',allP.length,'across all approvers','',allP.map(x=>x.id))}${kpi('Active acceptances',act.length,`${exp.length} expire within 30 days`,exp.length?'warn':'',act.map(a=>a.id))}${kpi('Treatment plans open',PLANS().filter(p=>!['Complete','Cancelled','Rejected'].includes(p.status)).length,'in progress or awaiting approval','',PLANS().filter(p=>!['Complete','Cancelled','Rejected'].includes(p.status)).map(p=>p.id))}</div>`+
  card('Waiting for my decision',`${mine.length} item(s). Approvals are due within ${SLA.acc} days; late ones are flagged and the approver is notified.`,table(['ID','Request','Raised','SLA','Type'],mine.map(row),'Nothing is waiting for you.'))+
  card('All pending approvals','Everyone\'s open requests',table(['ID','Request','Raised','SLA','Type'],allP.map(a=>row({type:a.status==='Pending'&&a.id.startsWith('ACC')?'acc':'plan',id:a.id,title:a.title,by:a.requestedBy||a.owner,created:a.created,late:lateBy(a,a.id.startsWith('ACC')?'acc':'plans'),risk:a.risk})),'No pending approvals.'));
 const ar=ACC().map(a=>{const st=accStatus(a);return `<tr data-op="open" data-t="acc" data-id="${a.id}"><td class="riskid">${a.id}</td><td><div class="riskname">${E(a.title)}</div><div class="riskarea">${E(a.risk)} · score ${a.score}</div></td><td>${own(a.requestedBy)}</td><td>${own(a.approver)}</td><td>${a.expires?fmt(a.expires)+(st==='Active'&&dTo(a.expires)<=30?' '+pill('Expiring','amber'):''):'—'}</td><td>${pill(st,AK[st])}</td></tr>`});
 panel('treat','acc').innerHTML=card('Risk acceptances','A risk above appetite can be accepted only with a named approver, a reason and an expiry date.',table(['ID','Acceptance','Requested by','Approver','Expires','Status'],ar,'No acceptances yet.'),'<button class="op-mini p" data-op="acc-new">Request risk acceptance</button>');
 const pr=PLANS().map(p=>{const d=p.actions.filter(a=>a.done).length;return `<tr data-op="open" data-t="plan" data-id="${p.id}"><td class="riskid">${p.id}</td><td><div class="riskname">${E(p.title)}</div><div class="riskarea">${E(p.risk)} · ${E(p.strategy)}</div></td><td>${own(p.owner)}</td><td>${fmt(p.due)}${dTo(p.due)<0&&!['Complete','Cancelled'].includes(p.status)?' '+pill('Overdue','red'):''}</td><td>${d}/${p.actions.length}</td><td>${pill(p.status,PK[p.status])}</td></tr>`});
 panel('treat','plans').innerHTML=card('Treatment plans','What will be done to bring a risk back inside appetite, who does it and by when.',table(['ID','Plan','Owner','Due','Actions','Status'],pr,'No treatment plans yet.'),'<button class="op-mini p" data-op="plan-new">New treatment plan</button>');
 G.setBadge&&G.setBadge('treat',mine.length);
}
G.renders.push(renderTreat);

// ---------------------------------------------------------------- drawers
G.drawers.acc=id=>{const a=ACC().find(x=>x.id===id);if(!a){G.setDrawer('Acceptance','Not found','<p class="op-note">This acceptance no longer exists.</p>');return}
 const st=accStatus(a),r=rk(a.risk),P=[],me_=me().name;
 if(st==='Pending'){const l=lateBy(a,'acc');P.push([l?'red':'amber',`Waiting for ${E(a.approver)}${l?`, ${l} day(s) past the ${SLA.acc}-day SLA. Escalate to an administrator.`:'.'}`])}
 if(st==='Active'&&dTo(a.expires)<=30)P.push([dTo(a.expires)<=7?'red':'amber',`Expires in ${dTo(a.expires)} day(s) (${fmt(a.expires)}). Renew it or treat the risk.`]);
 if(st==='Expired')P.push(['red',`Expired on ${fmt(a.expires)}. The risk is no longer formally accepted.`]);
 const can=st==='Pending'&&canDecide(a,me_);
 detail({kicker:'Risk acceptance · '+a.id,title:a.title,pending:P,ok:st==='Active'?'Accepted and within its expiry date.':'Nothing pending.',todo:['The approver reads the rationale and checks monitoring is in place.','Decide with a comment. Reject if the exposure should be treated instead.','Review before the expiry date; an expired acceptance lapses automatically.'],
  facts:[['Risk',`${E(a.risk)} · ${E(r.name)}`],['Score when requested',String(a.score)],['Requested by',own(a.requestedBy)],['Approver',own(a.approver)],['Expires',a.expires?fmt(a.expires):'—'],['Status',pill(st,AK[st])],['Decided',a.decided?`${fmt(a.decided)} by ${E(a.decidedBy)}`:'—']],
  buttons:(can?`<button class="op-mini p" data-op="acc-decide" data-id="${a.id}" data-d="Active">Approve</button><button class="op-mini" data-op="acc-decide" data-id="${a.id}" data-d="Rejected">Reject</button>`:'')+((st==='Active'||st==='Expired')&&(isAdmin()||a.approver===me_)?`<button class="op-mini" data-op="acc-revoke" data-id="${a.id}">Revoke</button>`:'')+((st==='Expired'||st==='Active')?`<button class="op-mini" data-op="acc-renew" data-id="${a.id}">Renew</button>`:'')+`<button class="op-mini" data-op="plan-new" data-risk="${a.risk}">Treat this risk instead</button>`,
  extra:`<h4>Rationale</h4><p>${E(a.rationale)}</p>${a.comment?`<h4>Decision comment</h4><p>${E(a.comment)}</p>`:''}`,links:[a.risk,...PLANS().filter(p=>p.risk===a.risk).map(p=>p.id)]})};
G.drawers.plan=id=>{const p=PLANS().find(x=>x.id===id);if(!p){G.setDrawer('Plan','Not found','<p class="op-note">This plan no longer exists.</p>');return}
 const r=rk(p.risk),P=[],me_=me().name,done=p.actions.filter(a=>a.done).length;
 if(p.status==='Pending approval')P.push([lateBy(p,'plans')?'red':'amber',`Waiting for ${E(p.approver)} to approve.`]);
 if(!['Complete','Cancelled','Rejected'].includes(p.status)&&dTo(p.due)<0)P.push(['red',`Plan is ${-dTo(p.due)} day(s) past its due date ${fmt(p.due)}.`]);
 p.actions.filter(a=>!a.done&&dTo(a.due)<0).forEach(a=>P.push(['red',`Action "${E(a.text)}" (${E(a.owner)}) is overdue.`]));
 if(p.status==='Draft')P.push(['amber','Not yet submitted for approval.']);
 const can=p.status==='Pending approval'&&canDecide(p,me_),mineP=p.owner===me_||isAdmin();
 detail({kicker:'Treatment plan · '+p.id,title:p.title,pending:P,ok:p.status==='Complete'?'Plan complete.':'On track.',todo:['Agree actions, owners and dates.','Submit for approval; the approver signs off the plan.','Complete every action, then mark the plan complete and re-score the risk.'],
  facts:[['Risk',`${E(p.risk)} · ${E(r.name)}`],['Strategy',E(p.strategy)],['Owner',own(p.owner)],['Approver',own(p.approver)],['Due',fmt(p.due)],['Status',pill(p.status,PK[p.status])],['Current / target score',`${r.score} → ${p.target||'—'}`],['Actions',`${done} of ${p.actions.length} done`]],
  buttons:(p.status==='Draft'&&mineP?`<button class="op-mini p" data-op="plan-submit" data-id="${p.id}">Submit for approval</button>`:'')+(can?`<button class="op-mini p" data-op="plan-decide" data-id="${p.id}" data-d="Approved">Approve</button><button class="op-mini" data-op="plan-decide" data-id="${p.id}" data-d="Rejected">Reject</button>`:'')+(mineP&&!['Complete','Cancelled','Rejected'].includes(p.status)?`<button class="op-mini" data-op="plan-act-new" data-id="${p.id}">Add action</button>`:'')+(mineP&&['Approved','In progress'].includes(p.status)&&done===p.actions.length&&p.actions.length?`<button class="op-mini p" data-op="plan-complete" data-id="${p.id}">Mark complete</button>`:'')+(mineP&&!['Complete','Cancelled'].includes(p.status)?`<button class="op-mini" data-op="plan-cancel" data-id="${p.id}">Cancel plan</button>`:''),
  extra:`<h4>Actions</h4>${p.actions.length?p.actions.map(a=>`<div class="op-li"><div><label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" data-op="plan-act-toggle" data-id="${p.id}" data-aid="${a.id}"${a.done?' checked':''}><span><b${a.done?' style="text-decoration:line-through"':''}>${E(a.text)}</b><div class="riskarea">${E(a.owner)} · due ${fmt(a.due)}</div></span></label></div></div>`).join(''):'<p class="op-note">No actions yet.</p>'}`,links:[p.risk,...ACC().filter(a=>a.risk===p.risk).map(a=>a.id)]})};
G.parents.acc=id=>{const a=ACC().find(x=>x.id===id);return a?['riskrec',a.risk]:null};
G.parents.plan=id=>{const a=PLANS().find(x=>x.id===id);return a?['riskrec',a.risk]:null};
G.linkers.push(id=>{let x;if(/^ACC-/.test(id)&&(x=ACC().find(q=>q.id===id)))return{type:'acc',label:`${x.id} · ${x.title}`};if(/^TP-/.test(id)&&(x=PLANS().find(q=>q.id===id)))return{type:'plan',label:`${x.id} · ${x.title}`};return null});

// ---------------------------------------------------------------- actions
const needSelf=()=>{};
Object.assign(actions,{
 'acc-new':b=>{seqs();const pre=b&&b.dataset&&b.dataset.risk;
  openForm('Request risk acceptance',[{name:'risk',label:'Risk',type:'select',options:riskOpts(),value:pre||(risks.find(r=>r.score>S().appetite)||risks[0]||{}).id,full:true},{name:'rationale',label:'Why is accepting it reasonable?',type:'textarea',full:true,ph:'Cost, compensating controls, what changes and when'},{name:'expires',label:'Accepted until',type:'date',value:addDays(TODAY,180)},{name:'approver',label:'Approver',type:'select',options:personOpts(),value:approverDefault()}],'Submit request',v=>{
   if(!v.risk||!v.rationale||v.rationale.length<15)return 'Explain the reason in at least a sentence.';if(!v.expires||v.expires<=TODAY)return 'Choose an expiry date in the future.';if(v.approver===me().name&&!isAdmin())return 'Choose someone else to approve.';
   const r=rk(v.risk),id=nextId('acc','ACC-',3);S().acc=S().acc||[];S().acc.unshift({id,risk:v.risk,title:`Accept ${r.name}`,rationale:v.rationale,score:r.score,requestedBy:me().name,approver:v.approver,status:'Pending',expires:v.expires,created:TODAY,decided:'',decidedBy:'',comment:''});
   logIt(id,`Risk acceptance requested for ${v.risk}.`);commit();toast(`${id} sent to ${v.approver}.`);setTimeout(()=>openDrawer('acc',id),0)})},
 'acc-decide':b=>{const a=ACC().find(x=>x.id===b.dataset.id);if(!a||!canDecide(a,me().name)){toast('You cannot decide this request.');return}const d=b.dataset.d;
  openForm(d==='Active'?'Approve acceptance':'Reject acceptance',[{name:'c',label:'Comment',type:'textarea',full:true,ph:d==='Active'?'Conditions or monitoring required':'Why it should be treated instead'}],d==='Active'?'Approve':'Reject',v=>{
   if(d==='Rejected'&&!v.c)return 'A rejection needs a comment.';a.status=d;a.decided=TODAY;a.decidedBy=me().name;a.comment=v.c||'';logIt(a.id,`Acceptance ${d==='Active'?'approved':'rejected'} by ${me().name}.`);commit();toast(`${a.id} ${d==='Active'?'approved':'rejected'}.`)})},
 'acc-revoke':b=>{const a=ACC().find(x=>x.id===b.dataset.id);if(!a)return;if(!confirm('Revoke this acceptance? The risk will no longer be formally accepted.'))return;a.status='Revoked';a.decided=TODAY;a.decidedBy=me().name;logIt(a.id,'Acceptance revoked.');commit()},
 'acc-renew':b=>{const a=ACC().find(x=>x.id===b.dataset.id);if(!a)return;actions['acc-new']({dataset:{risk:a.risk}})},
 'plan-new':b=>{seqs();const pre=b&&b.dataset&&b.dataset.risk;
  openForm('New treatment plan',[{name:'risk',label:'Risk',type:'select',options:riskOpts(),value:pre||(risks.find(r=>r.score>S().appetite)||risks[0]||{}).id,full:true},{name:'title',label:'Plan title',full:true,ph:'What will be done'},{name:'strategy',label:'Strategy',type:'select',options:['Mitigate','Transfer','Avoid','Accept']},{name:'owner',label:'Owner',type:'select',options:personOpts(),value:me().name},{name:'due',label:'Complete by',type:'date',value:addDays(TODAY,90)},{name:'target',label:'Target residual score',type:'number',value:6},{name:'approver',label:'Approver',type:'select',options:personOpts(),value:approverDefault()}],'Create plan',v=>{
   if(!v.risk||!v.title)return 'Choose a risk and give the plan a title.';const id=nextId('plan','TP-',3);S().plans=S().plans||[];
   S().plans.unshift({id,risk:v.risk,title:v.title,strategy:v.strategy,owner:v.owner,due:v.due,status:'Draft',created:TODAY,approver:v.approver,approvedBy:'',cost:'',target:+v.target||0,actions:[]});logIt(id,`Treatment plan created for ${v.risk}.`);commit();setTimeout(()=>openDrawer('plan',id),0)})},
 'plan-act-new':b=>{const p=PLANS().find(x=>x.id===b.dataset.id);if(!p)return;openForm('Add action',[{name:'text',label:'Action',full:true},{name:'owner',label:'Owner',type:'select',options:personOpts(),value:p.owner},{name:'due',label:'Due',type:'date',value:p.due}],'Add',v=>{if(!v.text)return 'Describe the action.';p.actions.push({id:nextId('tpa','TPA-',3),text:v.text,owner:v.owner,due:v.due||p.due,done:false});if(p.status==='Approved')p.status='In progress';logIt(p.id,'Action added.');commit()})},
 'plan-act-toggle':b=>{const p=PLANS().find(x=>x.id===b.dataset.id),a=p&&p.actions.find(x=>x.id===b.dataset.aid);if(!a)return;if(!(isAdmin()||a.owner===me().name||p.owner===me().name)){toast('Only the action owner, plan owner or an administrator can update this.');G.renderAll();return}a.done=!a.done;if(a.done&&p.status==='Approved')p.status='In progress';logIt(p.id,`Action ${a.done?'completed':'reopened'}: ${a.text}`);commit()},
 'plan-submit':b=>{const p=PLANS().find(x=>x.id===b.dataset.id);if(!p)return;if(!p.actions.length){toast('Add at least one action first.');return}if(p.approver===me().name&&!isAdmin()){toast('Choose another approver.');return}p.status='Pending approval';p.created=TODAY;logIt(p.id,'Submitted for approval.');commit();toast(`${p.id} sent to ${p.approver}.`)},
 'plan-decide':b=>{const p=PLANS().find(x=>x.id===b.dataset.id);if(!p||!canDecide(p,me().name)){toast('You cannot decide this plan.');return}const d=b.dataset.d;
  openForm(d==='Approved'?'Approve plan':'Reject plan',[{name:'c',label:'Comment',type:'textarea',full:true}],d==='Approved'?'Approve':'Reject',v=>{if(d==='Rejected'&&!v.c)return 'A rejection needs a comment.';p.status=d==='Approved'?'Approved':'Rejected';p.approvedBy=d==='Approved'?me().name:'';p.comment=v.c||'';logIt(p.id,`Plan ${d.toLowerCase()} by ${me().name}.`);commit()})},
 'plan-complete':b=>{const p=PLANS().find(x=>x.id===b.dataset.id);if(!p)return;p.status='Complete';logIt(p.id,'Plan completed. Re-score the risk.');commit();toast(`${p.id} complete. Re-score ${p.risk} in the risk register.`)},
 'plan-cancel':b=>{const p=PLANS().find(x=>x.id===b.dataset.id);if(!p||!confirm('Cancel this plan?'))return;p.status='Cancelled';logIt(p.id,'Plan cancelled.');commit()}
});

// ---------------------------------------------------------------- show it on the risk record
G.drawerHooks.push(d=>{
 if(d.type!=='riskrec')return;const body=document.getElementById('opDB');if(!body)return;
 const a=ACC().filter(x=>x.risk===d.id),p=PLANS().filter(x=>x.risk===d.id);let box=document.getElementById('treatBox');if(!box){box=document.createElement('div');box.id='treatBox';body.appendChild(box)}
 const act=a.find(x=>accStatus(x)==='Active');
 box.innerHTML=`<h4>Treatment and acceptance</h4>${act?`<div class="op-banner green" style="margin-bottom:8px"><div><b>Formally accepted</b><div>${E(act.id)} until ${fmt(act.expires)}, approved by ${E(act.decidedBy)}.</div></div></div>`:''}<div class="op-btns"><button class="op-mini p" data-op="acc-new" data-risk="${E(d.id)}">Request risk acceptance</button><button class="op-mini" data-op="plan-new" data-risk="${E(d.id)}">New treatment plan</button></div>${a.length||p.length?`<div class="op-links">${[...a.map(x=>x.id),...p.map(x=>x.id)].map(G.lk).join('')}</div>`:'<p class="op-note">No acceptance or treatment plan yet.</p>'}`;
});
G.renderAll();
})();
