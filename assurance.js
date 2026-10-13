// Assurance depth: vendor questionnaires answered through a private link, audit workpapers with sampling
// and reviewer sign-off, and a review workflow for the built-in regulatory library.
(function(){
const G=window.GRC,VQ=window.GRC_VQ;if(!G||!VQ)return;
const {E,fmt,pill,own,table,card,kpi,TODAY,detail,toast,logIt,commit,actions,risks,openForm,openDrawer,panel,head,personOpts,nextId,addDays,dTo,me}=G;
const S=()=>G.S(),LIB=window.GRC_LIB||{frameworks:[]};
const isAdmin=()=>me().role==='Administrator';
const live=()=>G.api&&G.api.connected;
const seqs=()=>{const s=S();if(!s.seq)s.seq={};[['vq',2],['wp',2],['wps',10]].forEach(([k,n])=>{if(!(s.seq[k]>0))s.seq[k]=n})};
const VQS=()=>S().vq||[];
const VK={Sent:'blue','In progress':'amber',Submitted:'amber',Reviewed:'green'};
const vname=id=>{const v=(S().vendors||[]).find(x=>x.id===id);return v?v.name:id};

// ================================================================ vendor questionnaires
G.seeders.vq=()=>{const v=(S().vendors||[])[0];if(!v)return[];
 const ans={};VQ.questions().forEach((q,i)=>{ans[q.id]={a:i%7===3?'Partial':i%11===5?'No':'Yes',c:i%5===0?'Policy and evidence available on request.':''}});const sc=VQ.score(ans);
 return[{id:'VQ-001',vendor:v.id,template:VQ.id,status:'Submitted',requestedBy:v.owner,sent:addDays(TODAY,-18),due:addDays(TODAY,-4),answers:ans,signer:'A. Menon, Head of Security',submitted:addDays(TODAY,-6),score:sc.score,flags:sc.flags,comment:''}]};
G.drawers.vq=id=>{const r=VQS().find(x=>x.id===id);if(!r){G.setDrawer('Questionnaire','Not found','<p class="op-note">This questionnaire no longer exists.</p>');return}
 const sc=VQ.score(r.answers),P=[],late=['Sent','In progress'].includes(r.status)&&r.due&&dTo(r.due)<0;
 if(late)P.push(['red',`The vendor is ${-dTo(r.due)} day(s) past the reply date ${fmt(r.due)}.`]);
 if(r.status==='Submitted')P.push(['amber','Waiting for your review. Accepting it updates the vendor\'s score and assessment date.']);
 sc.flags.forEach(f=>{const q=VQ.questions().find(x=>x.id===f);if(q)P.push(['red',`Critical gap: ${E(q.q)}`])});
 const canReview=r.status==='Submitted'&&me().role!=='Auditor';
 detail({kicker:'Vendor questionnaire · '+r.id,title:`${vname(r.vendor)} · ${VQ.title}`,pending:P,ok:r.status==='Reviewed'?'Reviewed and applied to the vendor.':'On track.',todo:['Send the questionnaire and give the vendor a reply date.','Read the answers, especially the critical ones answered "No".','Accept the score to update the vendor, or reopen it for clarification.'],
  facts:[['Vendor',G.lk(r.vendor)||E(vname(r.vendor))],['Status',pill(r.status,VK[r.status])],['Requested by',own(r.requestedBy)],['Sent',fmt(r.sent)],['Reply by',r.due?fmt(r.due):'—'],['Submitted',r.submitted?`${fmt(r.submitted)} by ${E(r.signer)}`:'—'],['Score',r.status==='Sent'?'—':sc.score+'%'],['Answered',`${sc.answered} of ${sc.total}`]],
  buttons:(['Sent','In progress'].includes(r.status)?(live()?`<button class="op-mini p" data-op="vq-link" data-id="${r.id}">Get a new link</button>`:`<button class="op-mini p" data-op="vq-sim" data-id="${r.id}">Simulate the vendor's reply</button>`):'')+(canReview?`<button class="op-mini p" data-op="vq-accept" data-id="${r.id}">Accept and update vendor</button><button class="op-mini" data-op="vq-reopen" data-id="${r.id}">Reopen for the vendor</button>`:''),
  extra:r.status==='Sent'?'':`<h4>Answers</h4>${table(['Question','Answer','Comment'],VQ.questions().map(q=>{const a=r.answers[q.id]||{};const bad=a.a==='No'&&q.w>=3;return `<tr style="cursor:default"><td style="white-space:normal">${E(q.q)}<div class="riskarea">${E(q.section)}${q.w>=3?' · critical':''}</div></td><td>${a.a?pill(a.a,a.a==='Yes'?'green':a.a==='Partial'?'amber':a.a==='No'?'red':'blue'):'—'}${bad?' ⚠':''}</td><td style="white-space:normal">${E(a.c||'')}</td></tr>`}))}`,links:[r.vendor]})};
G.parents.vq=id=>{const r=VQS().find(x=>x.id===id);return r?['vendor',r.vendor]:null};
G.linkers.push(id=>{const x=/^VQ-/.test(id)&&VQS().find(q=>q.id===id);return x?{type:'vq',label:`${x.id} · ${vname(x.vendor)} questionnaire`}:null});
G.drawerHooks.push(d=>{
 if(d.type!=='vendor')return;const body=document.getElementById('opDB');if(!body)return;
 const list=VQS().filter(x=>x.vendor===d.id);let box=document.getElementById('vqBox');if(!box){box=document.createElement('div');box.id='vqBox';body.appendChild(box)}
 box.innerHTML=`<h4>Security questionnaires</h4>${list.length?`<div class="op-links">${list.map(x=>G.lk(x.id)).join('')}</div>`:'<p class="op-note">No questionnaire sent yet.</p>'}${me().role==='Auditor'?'':`<div class="op-btns"><button class="op-mini p" data-op="vq-send" data-id="${E(d.id)}">Send questionnaire</button></div>`}`});
async function issueLink(vq){
 for(let i=0;i<8;i++){const r=await G.api.call('POST','/api/vq/issue',{profile:G.PROF,vq,days:30});if(r.ok){const url=location.origin+r.data.url;openForm('Link for the vendor',[{name:'u',label:`Private link (valid until ${fmt(r.data.expires)}). Send it to the vendor. It is shown once; you can create a new one at any time.`,value:url,full:true}],'Done',()=>{});return}
  if(r.status!==404){toast(r.data.error||'Could not create the link.');return}await new Promise(ok=>setTimeout(ok,700))}
 toast('Could not create the link yet. Try again in a moment.')}
Object.assign(actions,{
 'vq-send':b=>{seqs();const v=(S().vendors||[]).find(x=>x.id===b.dataset.id);if(!v)return;
  openForm('Send security questionnaire',[{name:'due',label:'Vendor should reply by',type:'date',value:addDays(TODAY,21)}],'Create',f=>{
   if(!f.due||f.due<=TODAY)return 'Choose a reply date in the future.';const id=nextId('vq','VQ-',3);S().vq=S().vq||[];
   S().vq.unshift({id,vendor:v.id,template:VQ.id,status:'Sent',requestedBy:me().name,sent:TODAY,due:f.due,answers:{},signer:'',submitted:'',score:null,flags:[],comment:''});logIt(id,`Questionnaire created for ${v.name}.`);commit();
   if(live())setTimeout(()=>issueLink(id),0);else{toast(`${id} created. In the demo, use "Simulate the vendor's reply".`);setTimeout(()=>openDrawer('vq',id),0)}})},
 'vq-link':b=>{if(live())issueLink(b.dataset.id)},
 'vq-sim':b=>{const r=VQS().find(x=>x.id===b.dataset.id);if(!r)return;let seed=r.id.length*7+r.vendor.length;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff};
  const ans={};VQ.questions().forEach(q=>{const x=rnd();ans[q.id]={a:x<0.62?'Yes':x<0.82?'Partial':x<0.94?'No':'N/A',c:x<0.3?'Evidence attached to our trust centre.':''}});const sc=VQ.score(ans);
  Object.assign(r,{answers:ans,status:'Submitted',signer:'Vendor contact (simulated)',submitted:TODAY,score:sc.score,flags:sc.flags});logIt(r.id,'Vendor reply simulated.');commit()},
 'vq-accept':b=>{const r=VQS().find(x=>x.id===b.dataset.id);if(!r)return;const v=(S().vendors||[]).find(x=>x.id===r.vendor);if(!v)return;
  openForm('Accept assessment',[{name:'c',label:'Comment (optional)',type:'textarea',full:true}],'Accept and update vendor',f=>{r.status='Reviewed';r.comment=f.c||'';v.score=r.score;v.last=TODAY;(v.hist=v.hist||[]).push({date:TODAY,score:r.score,by:me().name});logIt(r.id,`Reviewed; ${v.name} score set to ${r.score}.`);commit();toast(`${v.name} score updated to ${r.score}.`)})},
 'vq-reopen':b=>{const r=VQS().find(x=>x.id===b.dataset.id);if(!r)return;r.status='In progress';logIt(r.id,'Reopened for the vendor.');commit();if(live())setTimeout(()=>issueLink(r.id),0)}
});

// ================================================================ audit workpapers
const WPS=()=>(S().audit&&S().audit.wp)||[];
const WK={Draft:'blue','Ready for review':'amber',Reviewed:'green'};
const planOf=id=>((S().audit||{}).plan||[]).find(a=>a.id===id);
const sampleSize=(N,conf)=>{N=Math.max(1,+N||0);const n0=Math.ceil(Math.log(1-conf)/Math.log(1-0.05));return Math.min(N,Math.ceil(n0/(1+(n0-1)/N)))};
G.drawers.wp=id=>{const w=WPS().find(x=>x.id===id);if(!w){G.setDrawer('Workpaper','Not found','<p class="op-note">This workpaper no longer exists.</p>');return}
 const a=planOf(w.audit),P=[],me_=me().name;
 if(w.status==='Ready for review')P.push(['amber',`Waiting for ${E(w.reviewer)} to review.`]);
 if(w.exceptions>0&&!w.issue)P.push(['red',`${w.exceptions} exception(s) found and no issue raised yet.`]);
 if(w.status==='Draft'&&w.steps.some(s=>!s.done))P.push(['amber',`${w.steps.filter(s=>!s.done).length} procedure step(s) not yet done.`]);
 const mine=w.preparer===me_||isAdmin(),canRev=w.status==='Ready for review'&&w.preparer!==me_&&(w.reviewer===me_||isAdmin());
 const rate=w.tested?Math.round(w.exceptions/w.tested*1000)/10:0;
 detail({kicker:'Audit workpaper · '+w.id,title:w.title,pending:P,ok:w.status==='Reviewed'?'Reviewed and signed off.':'Nothing pending.',todo:['State the objective and the procedure.','Size and draw the sample, then test each item.','Record exceptions, raise an issue, conclude, and send for review.'],
  facts:[['Audit',a?G.lk(a.id):E(w.audit)],['Preparer',own(w.preparer)],['Reviewer',own(w.reviewer)],['Status',pill(w.status,WK[w.status])],['Population',String(w.population||'—')],['Sample (method)',`${w.sample||'—'} (${E(w.method)})`],['Tested / exceptions',`${w.tested||0} / ${w.exceptions||0}${w.tested?` (${rate}%)`:''}`],['Conclusion',E(w.conclusion||'Not yet concluded')]],
  buttons:(mine&&w.status!=='Reviewed'?`<button class="op-mini" data-op="wp-edit" data-id="${w.id}">Edit</button><button class="op-mini" data-op="wp-size" data-id="${w.id}">Suggest sample size</button><button class="op-mini" data-op="wp-draw" data-id="${w.id}">Draw random sample</button><button class="op-mini" data-op="wp-step-new" data-id="${w.id}">Add step</button>`:'')+(mine&&w.status==='Draft'?`<button class="op-mini p" data-op="wp-submit" data-id="${w.id}">Send for review</button>`:'')+(canRev?`<button class="op-mini p" data-op="wp-review" data-id="${w.id}">Sign off</button><button class="op-mini" data-op="wp-return" data-id="${w.id}">Return to preparer</button>`:'')+(w.exceptions>0&&!w.issue&&me_&&me().role!=='Auditor'?`<button class="op-mini" data-op="wp-issue" data-id="${w.id}">Raise issue for exceptions</button>`:''),
  extra:`<h4>Objective</h4><p>${E(w.objective||'—')}</p><h4>Procedure</h4><p style="white-space:pre-wrap">${E(w.procedure||'—')}</p>${w.sampleNums?`<h4>Sample drawn</h4><p style="word-break:break-word">${E(w.sampleNums)}</p>`:''}<h4>Steps</h4>${w.steps.length?w.steps.map(s=>`<div class="op-li"><label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" data-op="wp-step" data-id="${w.id}" data-sid="${s.id}"${s.done?' checked':''}${w.status==='Reviewed'?' disabled':''}><span><b${s.done?' style="text-decoration:line-through"':''}>${E(s.text)}</b>${s.result?`<div class="riskarea">${E(s.result)}</div>`:''}</span></label></div>`).join(''):'<p class="op-note">No steps yet.</p>'}`,links:[w.audit,...(w.issue?[w.issue]:[])]})};
G.parents.wp=id=>{const w=WPS().find(x=>x.id===id);return w?['audit',w.audit]:null};
G.linkers.push(id=>{const x=/^WP-/.test(id)&&WPS().find(q=>q.id===id);return x?{type:'wp',label:`${x.id} · ${x.title}`}:null});
G.drawerHooks.push(d=>{
 if(d.type!=='audit')return;const body=document.getElementById('opDB');if(!body)return;const list=WPS().filter(x=>x.audit===d.id);
 let box=document.getElementById('wpBox');if(!box){box=document.createElement('div');box.id='wpBox';body.appendChild(box)}
 box.innerHTML=`<h4>Workpapers</h4>${list.length?`<div class="op-links">${list.map(x=>G.lk(x.id)).join('')}</div>`:'<p class="op-note">No workpapers yet.</p>'}<div class="op-btns"><button class="op-mini p" data-op="wp-new" data-audit="${E(d.id)}">Add workpaper</button></div>`});
const wpForm=(w,audit)=>[{name:'title',label:'Title',value:w.title||'',full:true},{name:'objective',label:'Objective',type:'textarea',value:w.objective||'',full:true},{name:'procedure',label:'Procedure',type:'textarea',value:w.procedure||'',full:true},{name:'population',label:'Population (items)',type:'number',value:w.population||''},{name:'sample',label:'Sample size',type:'number',value:w.sample||''},{name:'method',label:'Method',type:'select',options:['Random','Judgmental','Statistical','All items'],value:w.method||'Random'},{name:'tested',label:'Items tested',type:'number',value:w.tested||0},{name:'exceptions',label:'Exceptions found',type:'number',value:w.exceptions||0},{name:'conclusion',label:'Conclusion',type:'select',options:['','Satisfactory','Needs improvement','Unsatisfactory'],value:w.conclusion||''},{name:'reviewer',label:'Reviewer',type:'select',options:personOpts(),value:w.reviewer||''}];
const num=v=>{v=Number(v);return Number.isFinite(v)&&v>=0?Math.round(v):0};
Object.assign(actions,{
 'wp-new':b=>{seqs();const audit=b.dataset.audit;if(!planOf(audit))return;const rev=personOpts().map(x=>x[0]).find(n=>n!==me().name)||me().name;
  openForm('New workpaper',wpForm({reviewer:rev}),'Create',v=>{if(!v.title)return 'Give the workpaper a title.';if(v.reviewer===me().name)return 'Choose someone else as reviewer.';const id=nextId('wp','WP-',3);const A=S().audit||(S().audit={plan:[]});A.wp=A.wp||[];
   A.wp.unshift({id,audit,title:v.title,objective:v.objective,procedure:v.procedure,population:num(v.population),sample:num(v.sample),method:v.method,tested:num(v.tested),exceptions:num(v.exceptions),conclusion:v.conclusion,preparer:me().name,reviewer:v.reviewer,status:'Draft',date:TODAY,steps:[],sampleNums:'',issue:''});logIt(id,`Workpaper created for ${audit}.`);commit();setTimeout(()=>openDrawer('wp',id),0)})},
 'wp-edit':b=>{const w=WPS().find(x=>x.id===b.dataset.id);if(!w)return;openForm('Edit workpaper',wpForm(w),'Save',v=>{if(!v.title)return 'Give the workpaper a title.';if(v.reviewer===w.preparer)return 'The reviewer cannot be the preparer.';Object.assign(w,{title:v.title,objective:v.objective,procedure:v.procedure,population:num(v.population),sample:num(v.sample),method:v.method,tested:num(v.tested),exceptions:num(v.exceptions),conclusion:v.conclusion,reviewer:v.reviewer});logIt(w.id,'Workpaper updated.');commit()})},
 'wp-size':b=>{const w=WPS().find(x=>x.id===b.dataset.id);if(!w)return;openForm('Suggest sample size',[{name:'N',label:'Population (items)',type:'number',value:w.population||''},{name:'c',label:'Confidence',type:'select',options:[['0.90','90%'],['0.95','95%'],['0.99','99%']],value:'0.95'}],'Use this size',v=>{const N=num(v.N);if(!N)return 'Enter the population.';w.population=N;w.sample=sampleSize(N,+v.c);w.method=w.method==='All items'?'Random':w.method;logIt(w.id,`Sample size set to ${w.sample} of ${N}.`);commit();toast(`Sample size ${w.sample} of ${N} (5% tolerable error, none expected).`)})},
 'wp-draw':b=>{const w=WPS().find(x=>x.id===b.dataset.id);if(!w)return;if(!w.population||!w.sample){toast('Set the population and sample size first.');return}
  const N=w.population,n=Math.min(w.sample,N),arr=new Uint32Array(1),pick=new Set();while(pick.size<n){crypto.getRandomValues(arr);pick.add(1+arr[0]%N)}
  w.sampleNums=[...pick].sort((a,b)=>a-b).join(', ');w.method=w.method==='Judgmental'?w.method:'Random';logIt(w.id,`Random sample of ${n} drawn from ${N}.`);commit()},
 'wp-step-new':b=>{const w=WPS().find(x=>x.id===b.dataset.id);if(!w)return;openForm('Add step',[{name:'text',label:'Procedure step',full:true},{name:'result',label:'Result (optional)',type:'textarea',full:true}],'Add',v=>{if(!v.text)return 'Describe the step.';w.steps.push({id:nextId('wps','S-',3),text:v.text,result:v.result,done:false});logIt(w.id,'Step added.');commit()})},
 'wp-step':b=>{const w=WPS().find(x=>x.id===b.dataset.id),s=w&&w.steps.find(x=>x.id===b.dataset.sid);if(!s)return;if(!(w.preparer===me().name||isAdmin())){toast('Only the preparer can update steps.');G.renderAll();return}s.done=!s.done;commit()},
 'wp-submit':b=>{const w=WPS().find(x=>x.id===b.dataset.id);if(!w)return;if(!w.conclusion){toast('Add a conclusion first.');return}if(w.steps.some(s=>!s.done)){toast('Finish or remove open steps first.');return}w.status='Ready for review';logIt(w.id,'Sent for review.');commit();toast(`${w.id} sent to ${w.reviewer}.`)},
 'wp-review':b=>{const w=WPS().find(x=>x.id===b.dataset.id);if(!w)return;w.status='Reviewed';w.signed=me().name;w.signedDate=TODAY;logIt(w.id,`Signed off by ${me().name}.`);commit()},
 'wp-return':b=>{const w=WPS().find(x=>x.id===b.dataset.id);if(!w)return;w.status='Draft';logIt(w.id,'Returned to the preparer.');commit()},
 'wp-issue':b=>{const w=WPS().find(x=>x.id===b.dataset.id);if(!w)return;const a=planOf(w.audit)||{};const i=G.raise('Audit finding',w.audit,`${w.title}: ${w.exceptions} exception(s) in ${w.tested} items tested`,w.conclusion==='Unsatisfactory'?'High':'Medium',a.lead||w.preparer,`From workpaper ${w.id}. ${w.objective||''}`,'Control design / operation');w.issue=i.id;commit()}
});

// ================================================================ library review
const FWS=()=>LIB.frameworks||[];
const LV=()=>S().libv||{};
const adoptedIds=()=>[...new Set((S().obl||[]).map(o=>o.fw))];
const lvState=id=>{const v=LV()[id];if(!v)return{st:'Not reviewed',cls:'amber'};if(v.status==='Needs update')return{st:'Needs update',cls:'red'};const age=-dTo(v.date);return age>365?{st:'Review due',cls:'amber'}:{st:'Reviewed',cls:'green'}};
G.libReview={pending:()=>adoptedIds().filter(id=>lvState(id).st!=='Reviewed'),state:lvState};
G.drawerHooks.push(d=>{
 if(d.type!=='fw')return;const f=FWS().find(x=>x.id===d.id);if(!f)return;const body=document.getElementById('opDB');if(!body)return;
 let box=document.getElementById('lvBox');if(!box){box=document.createElement('div');box.id='lvBox';body.appendChild(box)}
 const v=LV()[f.id],st=lvState(f.id),can=['Administrator','Business user'].includes(me().role);
 box.innerHTML=`<h4>Content review</h4><p class="op-note">Library entries are summaries for planning. Before relying on one, a qualified person should check it against the official text.</p><div class="detailgrid"><div class="detailbox"><b>Status</b>${pill(st.st,st.cls)}</div><div class="detailbox"><b>Last reviewed</b>${v?`${fmt(v.date)} by ${E(v.by)}`:'Never'}</div></div>${v&&v.note?`<p class="op-note">${E(v.note)}</p>`:''}${can?`<div class="op-btns"><button class="op-mini p" data-op="lv-ok" data-id="${E(f.id)}">Mark reviewed</button><button class="op-mini" data-op="lv-bad" data-id="${E(f.id)}">Needs update</button></div>`:''}`});
Object.assign(actions,{
 'lv-ok':b=>{const f=FWS().find(x=>x.id===b.dataset.id);if(!f)return;openForm('Mark as reviewed',[{name:'note',label:'What did you check it against?',type:'textarea',full:true,ph:'Official text, version, date'}],'Mark reviewed',v=>{if(v.note.length<5)return 'Say what you checked it against.';const s=S();s.libv=s.libv||{};s.libv[f.id]={status:'Reviewed',by:me().name,date:TODAY,note:v.note};logIt(f.id,`Library entry reviewed: ${f.name}.`);commit()})},
 'lv-bad':b=>{const f=FWS().find(x=>x.id===b.dataset.id);if(!f)return;openForm('Needs update',[{name:'note',label:'What is wrong or out of date?',type:'textarea',full:true}],'Flag it',v=>{if(v.note.length<5)return 'Describe the problem.';const s=S();s.libv=s.libv||{};s.libv[f.id]={status:'Needs update',by:me().name,date:TODAY,note:v.note};const i=G.raise('Self-reported',f.id,`Library entry needs update: ${f.name}`,'Medium',me().name,v.note,'Documentation');logIt(f.id,`Library entry flagged: ${f.name}.`);commit()})}
});
G.seeders.libv=()=>({});
G.renderAll();
})();
