// Workflow tree: every row opens the drill-down drawer (insights, linked records, then the approval stages).
(function(){
const G=window.GRC;if(!G||typeof workflowRecord!=='function')return;
const {E,fmt,detail,setDrawer}=G;
const D2W={riskrec:'risk',audit:'audit',finding:'finding',evidence:'evidence',cfw:'framework',wflib:'library'};
const W2D={risk:'riskrec',audit:'audit',finding:'finding',evidence:'evidence',framework:'cfw',library:'wflib'};

// tree id -> drawer id (frameworks are indexed in the drawer)
function drawerId(type,id){if(type==='framework'){const i=frameworks.findIndex(f=>f[0]===id);return i<0?null:'CFW-'+i}return id}
function treeId(dtype,id){if(dtype==='cfw'){const f=frameworks[+String(id).replace('CFW-','')];return f&&f[0]}return id}
function openTreeItem(type,id){const d=W2D[type],did=drawerId(type,id);if(!d||did==null)return false;G.openDrawer(d,did);return true}

// ---- library items: standards, practices and ESG metrics
const LABELS={code:'Code',jurisdiction:'Jurisdiction',current_edition:'Current edition',edition_listed:'Edition listed',issuing_body:'Issuing body',regulator:'Regulator',type:'Type',certifiable:'Certifiable',status:'Status',area:'Area',maturity:'Maturity',typical_unit:'Typical unit',boundary_and_cadence:'Boundary and cadence'};
const TEXTS={summary:'Summary',objective:'Objective',key_controls:'Key controls',status_note:'Status note',evidence_examples:'Evidence examples',reporting_references:'Reporting references',reference_notes:'Notes'};
G.drawers.wflib=id=>{const r=libraryById.get(id);if(!r){setDrawer('Library','Not found','<p class="op-note">This library item is no longer listed.</p>');return}
 const P=[],t=r.libraryType,title=libTitle(r);
 if(t==='Standard'){
  if(r.status&&r.status!=='current')P.push(['red','Status is "'+E(r.status)+'". '+E(r.status_note||'Confirm whether it still applies.')]);
  if(r.edition_listed&&r.current_edition&&r.edition_listed!==r.current_edition)P.push(['amber','Edition '+E(r.edition_listed)+' is listed but the current edition is '+E(r.current_edition)+'. Review what changed.']);
  if(String(r.certifiable)==='True')P.push(['amber','This standard is certifiable. Decide whether certification is in scope and plan the audit.'])}
 if(t==='Practice'&&/starter/i.test(r.maturity||''))P.push(['amber','This is a starter practice. Map it to an approved requirement before relying on it.']);
 if(t==='Metric')P.push(['amber','Confirm the source system, owner sign-off and reporting boundary before this metric is reported.']);
 const facts=[['Type',E(t)],...Object.keys(LABELS).filter(k=>r[k]!=null&&r[k]!==''&&k!=='status_note').map(k=>[LABELS[k],E(String(r[k]))])];
 const extra=Object.keys(TEXTS).filter(k=>r[k]).map(k=>'<h4>'+TEXTS[k]+'</h4><p class="op-note" style="white-space:pre-wrap">'+E(String(r[k]).split(' | ').join('\n'))+'</p>').join('');
 const links=[...(S0().frameworks||[])].filter(f=>f&&[r.code,r.short_title,r.title].some(x=>x&&String(f.name||f.id||'').includes(x))).map(f=>f.id);
 detail({kicker:t+' · '+id,title,pending:P,ok:'Nothing needs attention on this item.',todo:['Name an owner for this item.','Link the evidence that shows it is applied.','Set the next review date.'],facts,extra,links})};
const S0=()=>G.S();

// ---- workflow stages shown under the insights
G.drawerHooks.push(d=>{
 const wt=D2W[d.type];if(!wt)return;const body=document.getElementById('opDB');if(!body)return;
 const id=treeId(d.type,d.id),rec=id&&workflowRecord(wt,id);if(!rec)return;
 let box=document.getElementById('wfStageBox');if(!box){box=document.createElement('div');box.id='wfStageBox';body.appendChild(box)}
 box.innerHTML='<h4>Workflow and approvals</h4>'+workflowTreeHtml(wt,rec);wireWorkflowControls(box)});

// ---- the tree must follow the live data (the profile loads after the first draw), including audit plans
const plans=()=>((G.S().audit||{}).plan)||[];
const planRec=x=>({id:x.id,name:x.title,owner:x.owner||x.lead||'Morgan Chen',status:x.status,area:x.area||x.standard||'',historical:x.status==='Complete'});
const baseRecord=workflowRecord;
workflowRecord=function(type,id){if(type==='audit'){const x=plans().find(p=>p.id===id);return x?planRec(x):baseRecord(type,id)}return baseRecord(type,id)};
const baseData=workflowDatasets;
workflowDatasets=function(){return baseData().map(g=>g.type!=='audit'?g:{...g,items:plans().map(x=>({...planRec(x),record:planRec(x)}))})};
G.renders.push(()=>{try{renderWorkflowTree()}catch(e){console.warn('workflow tree',e)}});

// ---- stage actions re-open the drawer instead of the old dialog
const oldShow=showWorkflowRecord;
showWorkflowRecord=function(type,record){if(!openTreeItem(type,record.id))oldShow(type,record)};

// ---- tree rows
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#workflowTreeRoot [data-open-workflow]');if(!b)return;
 e.stopImmediatePropagation();e.preventDefault();const [type,id]=b.dataset.openWorkflow.split('|');
 if(!openTreeItem(type,id)&&window.toast)toast('This record could not be opened.')},true);
})();
