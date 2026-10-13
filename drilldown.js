// Drill-down and drill-up for the original views (risk rows, compliance frameworks, audit findings,
// evidence library, headline cards) and for every KPI card that carries a list of records.
// Records open in the shared drawer, which keeps a trail so you can go back, jump to any earlier
// step, or go up to the parent record.
(function(){
const G=window.GRC;if(!G)return;
const {E,fmt,pill,own,table,card,kpi,TODAY,detail,toast,logIt,commit,actions,risks,riskCoverage,kriStatus,riskControls,openDrawer,setDrawer,pendHtml,todoHtml,links,lk,dTo,addDays,go}=G;
const S=()=>G.S(),LIB=window.GRC_LIB||{frameworks:[]};
const pad3=n=>String(n).padStart(3,'0');
const evId=i=>'EV-'+pad3(i+128);
const evIdx=id=>{const m=/^EV-(\d+)$/.exec(id);return m?(+m[1])-128:-1};
const fnIdx=id=>findings.findIndex(f=>f[0]===id);
const cfIdx=id=>{const m=/^CFW-(\d+)$/.exec(id);return m?+m[1]:-1};
const MONS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const todayLong=()=>{const d=new Date(TODAY+'T00:00:00');return `${MONS[d.getMonth()]} ${String(d.getDate()).padStart(2,'0')}, ${d.getFullYear()}`};
const libFw=txt=>{const t=String(txt||'').toLowerCase();return LIB.frameworks.find(f=>f.code&&t.includes(String(f.code).toLowerCase()))||LIB.frameworks.find(f=>f.name&&t.includes(String(f.name).toLowerCase()))};
const planOf=()=>((S().audit||{}).plan)||[];
const effCtl=c=>c.result==='Effective';

// ---- overrides made on legacy records (kept in browser storage, re-applied after each render) ----
G.seeders.ovr=()=>({ev:{},fn:{}});
function applyOverrides(){const o=S().ovr;if(!o)return;let ch=false;
 for(const id in o.ev){const i=evIdx(id);if(i>=0&&evidence[i]&&(evidence[i][6]!==o.ev[id].fresh||evidence[i][5]!==o.ev[id].date)){evidence[i][6]=o.ev[id].fresh;evidence[i][5]=o.ev[id].date;ch=true}}
 for(const id in o.fn){const i=fnIdx(id);if(i>=0&&findings[i][6]!==o.fn[id]){findings[i][6]=o.fn[id];ch=true}}
 if(ch&&typeof render==='function')render()}
G.renders.push(applyOverrides);

// ---- linkers so legacy records appear as chips in other records ----
G.linkers.push(id=>{let i;
 if(/^EV-\d+$/.test(id)&&(i=evIdx(id))>=0&&evidence[i])return{type:'evidence',label:`${id} · ${evidence[i][0]}`};
 if(/^F-\d+$/.test(id)&&(i=fnIdx(id))>=0)return{type:'finding',label:`${id} · ${findings[i][1]}`};
 if(/^CFW-\d+$/.test(id)&&(i=cfIdx(id))>=0&&frameworks[i])return{type:'cfw',label:`${frameworks[i][0]} · ${frameworks[i][1]}`};
 if(/^ARA-/.test(id))return{type:'area',label:'Area · '+id.slice(4)};
 return null});

// ---- generic list drawer behind every KPI card ----
let LISTS={},LN=0;
G.openList=(label,ids,note)=>{const key='L'+(++LN);LISTS[key]={label,ids,note};openDrawer('kpilist',key)};
G.drawers.kpilist=key=>{const L=LISTS[key];if(!L){setDrawer('List','List no longer available','<p class="op-note">Close this panel and select the card again.</p>');return}
 setDrawer('Drill-down list',L.label,`<p class="op-note">${L.ids.length} record(s) behind this figure. Select one to open its full record; use Back to return to this list.${L.note?' '+E(L.note):''}</p><div class="op-links" style="flex-direction:column;align-items:stretch">${L.ids.map(id=>lk(id)).join('')}</div>`)};

// ---- risk record ----
G.drawers.riskrec=id=>{const r=risks.find(x=>x.id===id);if(!r)return;const s=S(),cs=riskControls(id),cov=riskCoverage(id),ks=s.kris.filter(k=>k.risk===id),
 iss=s.issues.filter(i=>i.link===id||ks.some(k=>k.id===i.link)||cs.some(c=>c.id===i.link)),open=iss.filter(i=>i.status!=='Closed'),ls=s.losses.filter(l=>l.risk===id),vs=s.vendors.filter(v=>(v.risks||[]).includes(id)),
 rc=((s.rcsa2||{}).items||[]).filter(i=>i.risk===id).map(i=>i.id),au=planOf().filter(a=>a.area===r.area).map(a=>a.id),P=[];
 if(r.score>s.appetite)P.push(['red',`Residual score ${r.score} is above the appetite of ${s.appetite}. Agree a treatment plan or accept formally.`]);
 if(cov==='No control')P.push(['red','No control is mapped to this risk. Map an existing control or design a new one.']);else if(cov==='Weak'||cov==='Partial')P.push(['amber',`Control coverage is ${cov.toLowerCase()}. Review the mapped controls and their latest test results.`]);
 cs.filter(c=>c.result==='Ineffective').forEach(c=>P.push(['red',`Control ${E(c.id)} (${E(c.name)}) is ineffective.`]));
 ks.filter(k=>kriStatus(k)==='Red').forEach(k=>P.push(['red',`Indicator ${E(k.id)} (${E(k.name)}) is in red.`]));
 open.forEach(i=>P.push([i.due<TODAY?'red':'amber',`Issue ${E(i.id)}: ${E(i.title)} (${E(i.owner)}, due ${fmt(i.due)}).`]));
 detail({kicker:'Risk · '+r.id,title:r.name,pending:P,ok:'Within appetite, covered by effective controls, nothing open.',todo:['Confirm the inherent and residual ratings still reflect the business today.','Check each mapped control was tested within its frequency and the result is effective.','Review indicator trends and close or escalate open issues.','Record the review in the register and set the next review date.'],
 facts:[['Area',E(r.area)],['Owner',own(r.owner)],['Inherent',G.badge(r.inherent)],['Residual',`${G.badge(r.rating)} <span class="risk-score">${r.score}</span>`],['Status',G.badge(r.status)],['Next review',E(r.date)+', 2026'],['Control coverage',pill(cov==='No control'?'Gap':cov,{Strong:'green',Adequate:'green',Partial:'amber',Weak:'red','No control':'red'}[cov]||'blue')],['Appetite',`Score ${s.appetite}`]],
 buttons:`<button class="op-mini p" data-op="risk-full" data-id="${r.id}">Open full risk record (assessment, treatment)</button>`,
 extra:`<h4>Where this risk shows up</h4><div class="detailgrid"><div class="detailbox"><b>Mapped controls</b>${cs.length}</div><div class="detailbox"><b>Indicators</b>${ks.length} (${ks.filter(k=>kriStatus(k)==='Red').length} red)</div><div class="detailbox"><b>Issues</b>${iss.length} (${open.length} open)</div><div class="detailbox"><b>Loss events</b>${ls.length}</div></div>`,
 links:[...cs.map(c=>c.id),...ks.map(k=>k.id),...iss.map(i=>i.id),...ls.map(l=>l.id),...vs.map(v=>v.id),...rc,...au]})};
G.parents.riskrec=null;

// ---- evidence ----
G.drawers.evidence=id=>{const i=evIdx(id),e=evidence[i];if(!e){setDrawer('Evidence','Not found','<p class="op-note">This evidence record is no longer in the library.</p>');return}
 const f=libFw(e[3]),ctl=G.S().controls.find(c=>c.id===e[2])||G.S().controls.find(c=>(c.fw||[]).some(x=>String(x).toLowerCase().includes(String(e[3]).toLowerCase()))),
 related=evidence.map((x,k)=>[x,k]).filter(([x,k])=>k!==i&&(x[2]===e[2]||x[3]===e[3])).slice(0,5).map(([x,k])=>evId(k)),
 tests=ctl?G.S().tests.filter(t=>t.ctrl===ctl.id).slice(0,3).map(t=>t.id):[],P=[];
 if(e[6]!=='Current')P.push(['amber',`Freshness is "${E(e[6])}". Request an updated copy from ${E(e[4])} before the next audit or control test.`]);
 if(ctl&&!effCtl(ctl))P.push([ctl.result==='Ineffective'?'red':'amber',`Linked control ${E(ctl.id)} is ${E(ctl.result.toLowerCase())}; this evidence may not be enough to rely on.`]);
 detail({kicker:'Evidence · '+id,title:e[0],pending:P,ok:'Current and linked to a control.',todo:['Confirm the record is authentic, complete and covers the period and site in question.','Check it supports the control and framework it is linked to.','Refresh or replace it when freshness drops, then record the date.'],
 facts:[['Type',E(e[1])],['Control code',E(e[2])],['Framework',E(e[3])],['Owner',own(e[4])],['Last updated',E(e[5])],['Freshness',G.badge(e[6])]],
 buttons:e[6]!=='Current'?`<button class="op-mini p" data-op="ev-refresh" data-id="${id}">Mark as refreshed today</button>`:'',
 extra:ctl?`<h4>Supports control</h4><p class="op-note">${E(ctl.name)} · last test ${fmt(ctl.lastTest)} · ${E(ctl.result)}</p>`:'',
 links:[...(ctl?[ctl.id]:[]),...(f?[f.id]:[]),...tests,...related]})};
G.parents.evidence=id=>{const e=evidence[evIdx(id)];if(!e)return null;const c=G.S().controls.find(c=>c.id===e[2])||G.S().controls.find(c=>(c.fw||[]).some(x=>String(x).toLowerCase().includes(String(e[3]).toLowerCase())));if(c)return['control',c.id];const f=libFw(e[3]);return f?['fw',f.id]:null};
actions['ev-refresh']=b=>{const id=b.dataset.id,i=evIdx(id);if(!evidence[i])return;const s=S();s.ovr=s.ovr||{ev:{},fn:{}};s.ovr.ev[id]={fresh:'Current',date:todayLong()};logIt(id,'Evidence marked as refreshed.');commit();toast(`${id} marked as refreshed.`)};

// ---- audit finding (original findings list) ----
G.drawers.finding=id=>{const i=fnIdx(id),f=findings[i];if(!f){setDrawer('Finding','Not found','<p class="op-note">This finding is no longer in the list.</p>');return}
 const s=S(),aud=planOf().filter(a=>(a.fids||[]).includes(id)),iss=s.issues.filter(x=>x.link===id),fw=libFw(f[2]),P=[];
 if(f[6]==='Overdue')P.push(['red',`Overdue: was due ${E(f[5])}, 2026. Agree a recovery date with ${E(f[4])}.`]);else if(f[6]!=='Closed'&&f[6]!=='Complete')P.push(['amber',`Open, due ${E(f[5])}, 2026 with ${E(f[4])}.`]);
 if(f[6]!=='Closed'&&!iss.length)P.push(['amber','No issue is tracking this finding yet. Raise one so actions and escalation are followed.']);
 iss.filter(x=>x.status!=='Closed').forEach(x=>P.push([x.due<TODAY?'red':'amber',`Issue ${E(x.id)}: ${E(x.title)} (due ${fmt(x.due)}).`]));
 detail({kicker:'Audit finding · '+id,title:f[1],pending:P,ok:'Closed and verified.',todo:['Document the condition, criterion, evidence sampled and impact.','Agree a cause-based corrective action with one accountable owner and date.','Collect closure evidence and have it independently verified.'],
 facts:[['Source',E(f[2])],['Severity',G.badge(f[3])],['Owner',own(f[4])],['Due date',E(f[5])+', 2026'],['Status',G.badge(f[6])],['Open issues',String(iss.filter(x=>x.status!=='Closed').length)]],
 buttons:(f[6]==='Closed'?'':`<button class="op-mini p" data-op="fn-close" data-id="${id}">Mark closed</button>`)+(iss.length?'':`<button class="op-mini" data-op="fn-raise" data-id="${id}">Raise tracking issue</button>`)+(f[6]==='Closed'?`<button class="op-mini" data-op="fn-reopen" data-id="${id}">Reopen</button>`:''),
 links:[...aud.map(a=>a.id),...iss.map(x=>x.id),...(fw?[fw.id]:[]),...risks.filter(r=>aud.some(a=>a.area===r.area)).slice(0,3).map(r=>r.id)]})};
G.parents.finding=id=>{const a=planOf().find(a=>(a.fids||[]).includes(id));if(a)return['audit',a.id];const x=S().issues.find(x=>x.link===id);return x?['issue',x.id]:null};
const setFn=(id,st)=>{const s=S();s.ovr=s.ovr||{ev:{},fn:{}};s.ovr.fn[id]=st;logIt(id,'Finding status set to '+st+'.');commit()};
actions['fn-close']=b=>{setFn(b.dataset.id,'Closed');toast(b.dataset.id+' closed.')};
actions['fn-reopen']=b=>{setFn(b.dataset.id,'In progress');toast(b.dataset.id+' reopened.')};
actions['fn-raise']=b=>{const i=fnIdx(b.dataset.id),f=findings[i];if(!f)return;const x=G.raise({title:f[1],source:'Audit finding',link:f[0],sev:f[3]==='High'?'High':f[3]==='Low'?'Low':'Medium',owner:f[4],due:addDays(TODAY,30),cause:'To be determined',desc:`Raised from audit finding ${f[0]} (${f[2]}).`});commit();toast(`Issue ${x.id} raised.`);openDrawer('issue',x.id)};

// ---- compliance framework row ----
G.drawers.cfw=id=>{const i=cfIdx(id),f=frameworks[i];if(!f){setDrawer('Framework','Not found','<p class="op-note">This framework is no longer listed.</p>');return}
 const lib=libFw(f[0]),obl=(S().obl||[]).filter(o=>lib&&o.fw===lib.id),gaps=obl.filter(o=>/gap|not/i.test(o.status||'')),cs=S().controls.filter(c=>(c.fw||[]).some(x=>String(x).toLowerCase().includes(String(f[0]).toLowerCase()))),
 fnd=findings.filter(x=>String(x[2]).toLowerCase().includes(String(f[0]).toLowerCase())),evs=evidence.map((x,k)=>[x,k]).filter(([x])=>x[3]===f[0]).map(([x,k])=>evId(k)),P=[];
 if(f[6]!=='On track')P.push(['amber',`Status is "${E(f[6])}" with ${E(f[4])} control(s) needing attention.`]);
 cs.filter(c=>c.result==='Ineffective').forEach(c=>P.push(['red',`Control ${E(c.id)} (${E(c.name)}) is ineffective.`]));
 fnd.filter(x=>x[6]!=='Closed').forEach(x=>P.push([x[6]==='Overdue'?'red':'amber',`Finding ${E(x[0])}: ${E(x[1])} (${E(x[6])}).`]));
 detail({kicker:'Framework · '+f[0],title:f[1],pending:P,ok:'On track with no open findings.',todo:['Confirm scope with the framework owner and the next assessment date.','Close findings and ineffective controls that affect the certificate or attestation.','Check evidence is current for the sampled controls.'],
 facts:[['Scope',E(f[2])],['Controls effective',E(f[3])],['Needing attention',E(f[4])],['Next milestone',E(f[5])],['Status',G.badge(f[6])],['Library entry',lib?E(lib.name):'Not mapped']],
 buttons:lib?`<button class="op-mini p" data-op="open" data-t="fw" data-id="${lib.id}">Open in regulatory library</button>`:'',
 links:[...cs.slice(0,6).map(c=>c.id),...fnd.map(x=>x[0]),...evs.slice(0,4),...obl.slice(0,4).map(o=>o.id)]})};

// ---- risk area and owner groupings ----
G.drawers.area=id=>{const area=id.replace(/^ARA-/,''),rs=risks.filter(r=>r.area===area),au=planOf().filter(a=>a.area===area),s=S(),
 iss=s.issues.filter(i=>rs.some(r=>r.id===i.link)),P=[];
 const out=rs.filter(r=>r.score>s.appetite);if(out.length)P.push(['red',`${out.length} risk(s) above appetite: ${out.map(r=>E(r.id)).join(', ')}.`]);
 if(!au.length)P.push(['amber','No audit is planned for this area.']);
 detail({kicker:'Risk area',title:area,pending:P,ok:'Everything in this area is within appetite and audited.',todo:['Review risks above appetite first.','Check audit coverage follows risk.','Look at open issues and indicators in red.'],
 facts:[['Risks',String(rs.length)],['Above appetite',String(out.length)],['Audits planned',String(au.length)],['Open issues',String(iss.filter(i=>i.status!=='Closed').length)]],links:[...rs.map(r=>r.id),...au.map(a=>a.id)]})};
G.parents.area=null;

// ---- parents for existing record types ----
const P=G.parents;
P.control=id=>{const c=S().controls.find(x=>x.id===id);return c&&c.risks&&c.risks[0]?['riskrec',c.risks[0]]:null};
P.kri=id=>{const k=S().kris.find(x=>x.id===id);return k?['riskrec',k.risk]:null};
P.loss=id=>{const l=S().losses.find(x=>x.id===id);return l?['riskrec',l.risk]:null};
P.vendor=id=>{const v=S().vendors.find(x=>x.id===id);return v&&v.risks&&v.risks[0]?['riskrec',v.risks[0]]:null};
P.issue=id=>{const i=S().issues.find(x=>x.id===id);if(!i||!i.link)return null;const l=lk(i.link);const m=/data-t="(\w+)"/.exec(l);return m&&m[1]!=='issue'?[m[1],i.link]:null};
P.obligation=id=>{const o=(S().obl||[]).find(x=>x.id===id);return o?['fw',o.fw]:null};
P.audit=id=>{const a=planOf().find(x=>x.id===id);return a?['area','ARA-'+a.area]:null};
P.rassess=id=>{const it=((S().rcsa2||{}).items||[]).find(x=>x.id===id);return it&&it.camp?['rcamp',it.camp]:null};
P.rcamp=null;

// ---- original views: delegated handlers (survive every re-render and profile) ----
const rowId=(tr,sel)=>{const el=tr.querySelector(sel);return el?el.textContent.trim():''};
document.addEventListener('click',e=>{
 if(e.target.closest('a,button,select,input,.close'))return;
 const tr=e.target.closest('#priorityRows tr,#allRiskRows tr,#evidenceRows tr,#findingRows tr,#frameworkRows tr');
 if(tr){const body=tr.parentNode.id;let t,id;
  if(body==='priorityRows'||body==='allRiskRows'){id=rowId(tr,'.riskid').split(' ')[0]||(tr.dataset.search||'').match(/r-\d+/i)?.[0]?.toUpperCase();t='riskrec';if(!risks.find(r=>r.id===id))return}
  else if(body==='evidenceRows'){id=rowId(tr,'.riskid');t='evidence'}
  else if(body==='findingRows'){id=rowId(tr,'.riskid');t='finding'}
  else{id='CFW-'+[...tr.parentNode.children].indexOf(tr);t='cfw'}
  e.stopPropagation();e.preventDefault();openDrawer(t,id);return}
 const m=e.target.closest('#view-dashboard > .grid .metric,#view-compliance .metric,#view-audits .metric');
 if(m){const lab=(m.querySelector('.metric-label')||{}).textContent||'';const s=S(),L={
  'Open risks':()=>risks.map(r=>r.id),
  'Control effectiveness':()=>s.controls.map(c=>c.id),
  'Compliance posture':()=>frameworks.map((f,i)=>'CFW-'+i),
  'Open findings':()=>findings.filter(f=>f[6]!=='Closed').map(f=>f[0]),
  'Frameworks in scope':()=>frameworks.map((f,i)=>'CFW-'+i),
  'Mapped controls':()=>s.controls.map(c=>c.id),
  'Controls needing attention':()=>s.controls.filter(c=>c.result!=='Effective').map(c=>c.id),
  'Evidence freshness':()=>evidence.map((x,k)=>evId(k)),
  'Audits in progress':()=>planOf().filter(a=>['Fieldwork','Reporting'].includes(a.status)).map(a=>a.id),
  'Closed this quarter':()=>[...findings.filter(f=>f[6]==='Closed').map(f=>f[0]),...s.issues.filter(i=>i.status==='Closed').map(i=>i.id)],
  'Next audit':()=>planOf().filter(a=>a.status==='Planned').sort((a,b)=>a.start.localeCompare(b.start)).map(a=>a.id)}[lab.trim()];
  if(L){e.stopPropagation();const ids=L();G.openList(lab.trim(),ids,ids.length?'':'Nothing to show right now.')}}
},true);

// ---- figures and rows that have no single record behind them ----
const VIEWOF=el=>{const v=el.closest('.view');return v?v.id.replace('view-',''):''};
const TABOF=el=>{const p=el.closest('[data-panel]');return p?p.dataset.panel:VIEWOF(el)};
let INFO={},IN=0;
const keep=o=>{const k='I'+(++IN);INFO[k]=o;return k};
G.drawers.kpiinfo=key=>{const o=INFO[key];if(!o){setDrawer('Figure','No longer available','<p class="op-note">Close this panel and select the card again.</p>');return}
 detail({kicker:'Figure · '+o.view,title:o.label,pending:[],ok:'Reported as shown. It is calculated live from the records in this module.',todo:['Open the module list behind this figure to see the individual records.','Compare it with the previous period before reporting it.'],facts:[['Value',E(o.value)],['Basis',E(o.note||'Calculated from module data')]],buttons:`<button class="op-mini p" data-op="goto" data-v="${E(o.v)}">Go to ${E(o.view)}</button>`,links:o.ids||[]})};
G.drawers.rowinfo=key=>{const o=INFO[key];if(!o){setDrawer('Row','No longer available','<p class="op-note">Close this panel and select the row again.</p>');return}
 const ids=[...new Set((o.text.match(/\b[A-Z]{1,6}-\d{1,4}\b/g)||[]))].filter(x=>!/^(ISO|NIST)/.test(x));
 detail({kicker:o.view,title:o.title,pending:[],ok:'Reported as shown.',todo:['Compare each figure with its target or previous period.','Open linked records to see what sits behind the numbers.'],facts:o.facts.map(f=>[E(f[0]),E(f[1])]),buttons:`<button class="op-mini p" data-op="goto" data-v="${E(o.v)}">Go to ${E(o.view)}</button>`,links:ids})};
G.drawers.owner=name=>{const s=S(),ap=s.appetite,rs=risks.filter(r=>r.owner===name&&r.score>ap),is=s.issues.filter(i=>i.owner===name&&G.isOverdue(i)),cs=s.controls.filter(c=>c.owner===name&&c.result==='Ineffective'),ks=s.kris.filter(k=>k.owner===name&&kriStatus(k)==='Red'),P=[];
 rs.forEach(r=>P.push(['red',`${E(r.id)} is above appetite (score ${r.score}).`]));is.forEach(i=>P.push(['red',`${E(i.id)} is overdue: ${E(i.title)}.`]));cs.forEach(c=>P.push(['red',`${E(c.id)} is ineffective: ${E(c.name)}.`]));ks.forEach(k=>P.push(['red',`${E(k.id)} is in red: ${E(k.name)}.`]));
 detail({kicker:'Owner',title:name,pending:P,ok:'No items need this owner\'s attention.',todo:['Agree a date for each item with the owner.','Escalate items that stay open past their due date.'],facts:[['Risks over appetite',String(rs.length)],['Overdue issues',String(is.length)],['Control gaps',String(cs.length)],['Red indicators',String(ks.length)]],links:[...rs.map(r=>r.id),...is.map(i=>i.id),...cs.map(c=>c.id),...ks.map(k=>k.id)]})};
G.parents.owner=null;
document.addEventListener('click',e=>{
 if(e.target.closest('a,button,select,input'))return;
 const k=e.target.closest('.op-kpi:not(.drillable)');
 if(k){const lab=(k.querySelector('.l')||{}).textContent||'',val=(k.querySelector('.v')||{}).textContent||'',note=(k.querySelector('.f')||{}).textContent||'',v=VIEWOF(k),s=S();
  const KR={'Red (breached)':'Red','Amber (warning)':'Amber','Green (within tolerance)':'Green'}[lab];
  e.stopPropagation();
  if(KR){G.openList(lab,s.kris.filter(x=>kriStatus(x)===KR).map(x=>x.id));return}
  if(['Gross loss','Recoveries','Net loss'].includes(lab)){G.openList(lab+' · loss events',s.losses.map(x=>x.id),'Sorted as logged; open an event for its amounts.');return}
  openDrawer('kpiinfo',keep({label:lab,value:val,note,view:(G.labels&&G.labels[v])||v,v,ids:[]}));return}
 const tr=e.target.closest('#view-exec tbody tr,[data-panel="cyber:maturity"] tbody tr,[data-panel="fincrime:kyc"] tbody tr,#view-access tbody tr');
 if(tr&&tr.children.length>1&&!/No |^\s*$/.test(tr.children[0].textContent.slice(0,3))){const v=VIEWOF(tr),tb=tr.closest('table'),heads=[...tb.querySelectorAll('thead th')].map(h=>h.textContent.trim()),cells=[...tr.children].map(c=>c.innerText.replace(/\s+/g,' ').trim());
  e.stopPropagation();
  if(v==='exec'&&heads[0]==='Owner'){const nm=risks.length&&G.people().find(n=>cells[0].includes(n));if(nm){openDrawer('owner',nm);return}}
  openDrawer('rowinfo',keep({view:(G.labels&&G.labels[v])||v,v,title:cells[0],text:cells.join(' '),facts:heads.map((h,i)=>[h||'Detail',cells[i]||'—']).filter(f=>f[0]!=='Detail'||f[1]!=='—')}))}
},true);

// ---- other tables that were read-only ----
const wire=(sel,fn)=>document.addEventListener('click',e=>{if(e.target.closest('a,button,select,input,[data-op]'))return;const tr=e.target.closest(sel);if(!tr)return;const r=fn(tr);if(r){e.stopPropagation();openDrawer(r[0],r[1])}},true);
const firstId=tr=>{const el=tr.querySelector('.riskid');return el?el.textContent.trim():''};
const cellText=(tr,i)=>(tr.children[i]?.textContent||'').trim();
wire('[data-panel="controls:matrix"] tbody tr',tr=>{const id=firstId(tr);return risks.find(r=>r.id===id)?['riskrec',id]:null});
wire('[data-panel="controls:tests"] tbody tr, [data-panel="controls:rcsa"] tbody tr',tr=>{const id=firstId(tr);const t=S().tests.find(x=>x.id===id);const c=t?t.ctrl:id;return S().controls.find(x=>x.id===c)?['control',c]:null});
wire('[data-panel="issues:log"] tbody tr',tr=>{const id=cellText(tr,2),m=/^[A-Z]+-\d+/.exec(id);if(!m)return null;const x=lk(m[0]);const t=/data-t="(\w+)"/.exec(x);return t?[t[1],m[0]]:(risks.find(r=>r.id===m[0])?['riskrec',m[0]]:null)});
wire('[data-panel="audit:coverage"] tbody tr, [data-panel="rcsa:results"] tbody tr',tr=>{const n=tr.querySelector('.riskname,td');const a=n?n.textContent.trim():'';return risks.some(r=>r.area===a)?['area','ARA-'+a]:null});
wire('[data-panel="fincrime:kyc"] tbody tr',tr=>null);
})();
