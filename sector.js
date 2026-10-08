// Sector registers: industry-specific registers defined by the profile (e.g. patient-safety incidents, CAPA, process
// safety events, claims fraud cases). One generic engine renders them as tabs with record views, pending items and actions.
(function(){
const G=window.GRC,K=window.GRC_KIT;if(!G||!K)return;
const P=G.P,regs=P.registers||[];if(!regs.length)return;
const {E,fmt,addDays,dTo,pill,own,table,card,kpi,toolbar,flt,match,toast,logIt,commit,openForm,actions,TODAY,detail,dueState,csv,head,panel,personOpts,raise,me,risks}=G;
const S=()=>G.S(),D=()=>S().sector||{};
const rid=i=>(risks[i]||{}).id||'';
const isOpen=(r,x)=>!r.closed.includes(x.status);
// ---------------------------------------------------------------- seed
G.seeders.sector=()=>{const out={};regs.forEach(r=>{out[r.id]=r.rows.map((x,i)=>({id:r.idp+String(i+1).padStart(3,'0'),title:x[0],sev:x[1],owner:K.PEOPLE[x[2]],opened:K.off(x[3]),due:K.off(x[4]),status:x[5],detail:x[6],risk:x[7]!=null?rid(x[7]):''}))});return out};
// ---------------------------------------------------------------- mount
G.mount({id:'sector',label:P.sectorLabel||'Sector operations',ico:'◈',group:'RISK OPERATIONS',title:E(P.sectorLabel||'Sector operations'),sub:`Industry-specific registers for ${E(P.label.toLowerCase())}: track events and actions to closure, see what is overdue, and link each record to the risk register.`,tabs:regs.map(r=>[r.id,r.label])});
const regOf=id=>regs.find(r=>r.id===id);
const findRec=(rid2,id)=>(D()[rid2]||[]).find(x=>x.id===id);
function renderSector(){
 if(!S().sector)return;
 head('sector',regs.map(r=>`<button class="btn" data-op="sec-new" data-r="${r.id}"><span class="btnico">＋</span>New ${E(r.titleLabel.toLowerCase())}</button>`).slice(0,2).join('')+'<button class="btn" data-op="sec-export"><span class="btnico">↓</span>Export</button>');
 let badge=0;
 regs.forEach(r=>{const rows=D()[r.id]||[],open=rows.filter(x=>isOpen(r,x)),od=open.filter(x=>x.due&&dTo(x.due)<0),hi=open.filter(x=>x.sev==='High'||x.sev==='Critical');badge+=od.length;
  const f=flt('sector',r.id),trs=rows.filter(x=>match(f,[x.id,x.title,x.detail,x.owner].join(' '))&&(!f.st||f.st==='All'||x.status===f.st)).sort((a,b)=>(isOpen(r,b)-isOpen(r,a))||(a.due<b.due?-1:1)).map(x=>{const o=isOpen(r,x)&&x.due&&dTo(x.due)<0;return `<tr data-op="open" data-t="sreg" data-id="${r.id}|${x.id}"><td class="riskid">${x.id}</td><td><div class="riskname">${E(x.title)}</div><div class="riskarea" style="white-space:normal">${E(x.detail)}</div></td><td>${pill(x.sev,G.sevK(x.sev))}</td><td>${own(x.owner)}</td><td>${fmt(x.opened)}</td><td>${isOpen(r,x)?fmt(x.due):'—'}${o?' '+pill(-dTo(x.due)+' days late','red'):''}</td><td>${pill(x.status,isOpen(r,x)?'amber':'green')}</td></tr>`});
  panel('sector',r.id).innerHTML=`<div class="op-kpis">${kpi('Open',open.length,`${rows.length} on the register`)}${kpi('Overdue',od.length,'past the due date',od.length?'warn':'ok')}${kpi('High severity open',hi.length,'needs senior attention',hi.length?'warn':'ok')}${kpi('Closed',rows.length-open.length,'completed')}</div>${toolbar('sector',r.id,'Search '+r.label.toLowerCase()+'…',[['st',['All',...r.statuses],'All statuses']])}${card(r.label,`${E(r.detailLabel)} shown under each ${E(r.titleLabel.toLowerCase())}. Click a row for the full record.`,table(['ID',r.titleLabel,'Severity','Owner','Opened','Due','Status'],trs,'No records.'))}`});
 G.setBadge('sector',badge)}
G.renders.push(renderSector);
// ---------------------------------------------------------------- record view
G.drawers.sreg=key=>{const [rg,id]=key.split('|'),r=regOf(rg),x=findRec(rg,id);if(!r||!x)return;const P2=[],open=isOpen(r,x);
 if(open){if(x.due){const ds=dueState(x.due,14);P2.push(ds?[ds[0],`Due ${ds[1]}.`]:['amber',`Due ${fmt(x.due)}.`])}if(x.sev==='High'||x.sev==='Critical')P2.push(['amber',`${E(x.sev)} severity item still open.`]);const age=-dTo(x.opened);if(age>45)P2.push(['amber',`Open for ${age} days.`])}
 const iss=S().issues.filter(i=>i.link===x.id),openI=iss.filter(i=>i.status!=='Closed');openI.forEach(i=>P2.push(['amber',`Open issue ${i.id}: ${E(i.title)} (${E(i.owner)}, due ${fmt(i.due)}).`]));
 detail({kicker:`${r.label} · ${x.id}`,title:x.title,pending:P2,ok:open?'On track.':'Closed.',todo:open?r.todo:['Closed. Share any learning and keep the evidence.'],
  facts:[[E(r.titleLabel),E(x.title)],['Severity',pill(x.sev,G.sevK(x.sev))],['Owner',E(x.owner)],['Opened',fmt(x.opened)],['Due',open?fmt(x.due):'—'],['Status',pill(x.status,open?'amber':'green')],['Linked risk',x.risk?E(x.risk):'—'],[E(r.detailLabel),E(x.detail)]],
  buttons:`<button class="op-mini p" data-op="sec-update" data-r="${rg}" data-id="${x.id}">Update record</button>${open&&!openI.length&&(x.sev==='High'||x.sev==='Critical')?`<button class="op-mini r" data-op="sec-issue" data-r="${rg}" data-id="${x.id}">Raise issue</button>`:''}${open?`<button class="op-mini g" data-op="sec-close" data-r="${rg}" data-id="${x.id}">Close</button>`:''}`,
  links:[x.risk,...iss.map(i=>i.id),...(x.risk?S().controls.filter(c=>c.risks.includes(x.risk)).slice(0,3).map(c=>c.id):[])].filter(Boolean)})};
G.linkers.push(id=>{for(const r of regs){const x=(D()[r.id]||[]).find(q=>q.id===id);if(x)return{type:'sreg',label:`${x.id} · ${x.title}`,key:r.id+'|'+x.id}}return null});
// the generic linker opens drawers by id; sreg needs the register key, so resolve it here
const baseOpen=actions.open;actions.open=b=>{if(b.dataset.t==='sreg'&&!String(b.dataset.id).includes('|')){for(const r of regs){const x=(D()[r.id]||[]).find(q=>q.id===b.dataset.id);if(x){G.openDrawer('sreg',r.id+'|'+x.id);return}}}baseOpen(b)};
// ---------------------------------------------------------------- actions
const nextId=(r)=>{const rows=D()[r.id]||[];return r.idp+String(rows.reduce((m,x)=>Math.max(m,+x.id.replace(/\D/g,'')),0)+1).padStart(3,'0')};
Object.assign(actions,{
 'sec-new':b=>{const r=regOf(b.dataset.r);openForm('New '+r.titleLabel.toLowerCase(),[{name:'title',label:r.titleLabel,full:true},{name:'sev',label:'Severity',type:'select',options:['Low','Medium','High','Critical'],value:'Medium'},{name:'owner',label:'Owner',type:'select',options:personOpts(),value:me().name},{name:'due',label:'Due date',type:'date',value:addDays(TODAY,30)},{name:'risk',label:'Linked risk',type:'select',options:[['','— none —'],...risks.map(x=>[x.id,x.id+' · '+x.name])]},{name:'detail',label:r.detailLabel,type:'textarea',full:true}],'Create',v=>{if(!v.title)return 'Add a title.';const x={id:nextId(r),title:v.title,sev:v.sev,owner:v.owner,opened:TODAY,due:v.due,status:r.statuses[0],detail:v.detail||'',risk:v.risk};S().sector[r.id].push(x);logIt(x.id,`${r.titleLabel} logged.`);commit();toast(x.id+' created.')})},
 'sec-update':b=>{const r=regOf(b.dataset.r),x=findRec(r.id,b.dataset.id);openForm('Update · '+x.id,[{name:'status',label:'Status',type:'select',options:r.statuses,value:x.status},{name:'sev',label:'Severity',type:'select',options:['Low','Medium','High','Critical'],value:x.sev},{name:'owner',label:'Owner',type:'select',options:personOpts(),value:x.owner},{name:'due',label:'Due date',type:'date',value:x.due},{name:'detail',label:r.detailLabel,type:'textarea',full:true,value:x.detail}],'Save',v=>{Object.assign(x,{status:v.status,sev:v.sev,owner:v.owner,due:v.due,detail:v.detail});logIt(x.id,'Updated: '+v.status);commit()})},
 'sec-close':b=>{const r=regOf(b.dataset.r),x=findRec(r.id,b.dataset.id);x.status=r.closed[0];logIt(x.id,'Closed.');commit();toast(x.id+' closed.')},
 'sec-issue':b=>{const r=regOf(b.dataset.r),x=findRec(r.id,b.dataset.id);raise(r.label,x.id,`${r.titleLabel}: ${x.title}`,x.sev==='Critical'?'Critical':'High',x.owner,x.detail||x.title,'Process / procedure');commit()},
 'sec-export':()=>csv('forge-sector-registers.csv',[['Register','ID','Title','Severity','Owner','Opened','Due','Status','Details','Risk'],...regs.flatMap(r=>(D()[r.id]||[]).map(x=>[r.label,x.id,x.title,x.sev,x.owner,x.opened,x.due,x.status,x.detail,x.risk]))],'Registers exported as CSV.')
});
// ---------------------------------------------------------------- executive tile
G.xTiles.push(()=>{if(!S().sector)return null;const all=regs.flatMap(r=>(D()[r.id]||[]).filter(x=>isOpen(r,x)).map(x=>({x,r}))),od=all.filter(a=>a.x.due&&dTo(a.x.due)<0),hi=all.filter(a=>a.x.sev==='High'||a.x.sev==='Critical');return{key:'sec-open',l:(P.sectorLabel||'Sector registers')+' · overdue',v:od.length,f:`${hi.length} high-severity open · ${all.length} open in total across ${regs.length} registers`,k:od.length>2?'red':od.length?'amber':'green',ic:'◈'}});
G.metrics['sec-open']=()=>['Sector',(P.sectorLabel||'Sector registers')+' · open items','Overdue and high-severity open items across the sector registers.',regs.flatMap(r=>(D()[r.id]||[]).filter(x=>isOpen(r,x)&&((x.due&&dTo(x.due)<0)||x.sev==='High'||x.sev==='Critical')).map(x=>({id:x.id,sub:`${r.label} · ${x.title} · ${x.owner} · due ${fmt(x.due)}`,pill:x.due&&dTo(x.due)<0?pill('overdue','red'):pill(x.sev,G.sevK(x.sev))})))];
G.renderAll();
})();
