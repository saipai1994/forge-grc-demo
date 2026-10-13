// Platform basics a customer needs on day one: company profile and entities, a setup wizard, a clean
// start (no sample data), CSV import, a printable board pack, and an in-app guide.
(function(){
const G=window.GRC;if(!G)return;
const {E,fmt,pill,own,table,card,kpi,TODAY,detail,toast,logIt,commit,actions,risks,openForm,openDrawer,panel,head,personOpts,nextId,addDays,setDrawer,dTo,inr,me,PROF}=G;
const S=()=>G.S(),GROUP='GOVERNANCE & ADMIN';
const isAdmin=()=>me().role==='Administrator';
const csvEsc=v=>{v=String(v??'');return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};

// ---------------------------------------------------------------- data
const INDUSTRY=()=>Object.values(G.PROFILES||{}).map(p=>[p.id,p.label]);
const SIZES=['1–50','51–250','251–1,000','1,001–5,000','5,000+'];
const ETYPES=['Parent company','Subsidiary','Branch','Joint venture','Division'];
const STYPES=['Head office','Office','Plant / factory','Branch','Data centre','Warehouse / depot','Other'];
const blank=()=>({name:'',legal:'',industry:PROF,hq:'',country:'India',size:'',fy:'April–March',currency:'INR',regulators:'',website:'',contact:'',done:false,mode:'sample'});
G.seeders.org=()=>({profile:blank(),entities:[],units:[],sites:[]});
const O=()=>{const s=S();if(!s.org)s.org={profile:blank(),entities:[],units:[],sites:[]};const o=s.org;if(!o.profile)o.profile=blank();const d=blank();for(const k in d)if(!(k in o.profile))o.profile[k]=d[k];['entities','units','sites'].forEach(k=>{if(!Array.isArray(o[k]))o[k]=[]});if(!s.seq)s.seq={};['entity','unit','site'].forEach(k=>{if(!(s.seq[k]>0))s.seq[k]=1});return o};
const ent=id=>O().entities.find(e=>e.id===id);
const entOpts=()=>[['','— none —'],...O().entities.map(e=>[e.id,e.name])];
const needAdmin=()=>{if(isAdmin())return false;toast('Only an administrator can change company setup.');return true};

// ---------------------------------------------------------------- module
G.mount({id:'org',label:'Organisation',ico:'⌂',group:GROUP,title:'Organisation',sub:'Your company profile, legal entities, business units and sites. Records, reports and the board pack use these.',tabs:[['profile','Company profile'],['entities','Legal entities'],['units','Business units'],['sites','Sites'],['scope','Scope assignment'],['import','Import data']]});

function renderOrg(){
 const o=O(),p=o.profile,adm=isAdmin();
 head('org',adm?`<button class="btn" data-op="org-wizard"><span class="btnico">✦</span>${p.done?'Run setup again':'Set up company'}</button><button class="btn primary" data-op="board-pack"><span class="btnico">▤</span>Board pack</button>`:'<button class="btn primary" data-op="board-pack"><span class="btnico">▤</span>Board pack</button>');
 const row=(l,v)=>`<tr style="cursor:default"><td style="width:220px;color:#778293">${l}</td><td>${v?E(v):'<span style="color:#a3adb9">Not set</span>'}</td></tr>`;
 const prof=(G.PROFILES||{})[p.industry];
 panel('org','profile').innerHTML=(p.done?'':`<div class="op-banner amber" style="margin-bottom:14px"><div><b>Company setup is not finished</b><div>Add your company details, first legal entity and the framework packs that apply to you. It takes about two minutes.</div></div><button class="op-mini p" data-op="org-wizard">Start setup</button></div>`)+
  `<div class="op-kpis">${kpi('Legal entities',o.entities.length,'in scope of this workspace','',o.entities)}${kpi('Business units',o.units.length,'across all entities','',o.units)}${kpi('Sites',o.sites.length,'locations','',o.sites)}${kpi('Data',p.mode==='clean'?'Clean start':'Sample data',p.mode==='clean'?'only your own records':'demo records are loaded')}</div>`+
  card('Company profile',p.done?'Used on reports and the board pack':'Draft',table(['Field','Value'],[row('Company name',p.name),row('Legal name',p.legal),row('Industry',prof?prof.label:p.industry),row('Head office',[p.hq,p.country].filter(Boolean).join(', ')),row('Employees',p.size),row('Financial year',p.fy),row('Reporting currency',p.currency),row('Regulators',p.regulators),row('Website',p.website),row('Compliance contact',p.contact)]),adm?'<button class="op-mini p" data-op="org-edit">Edit profile</button>':'');
 const er=o.entities.map(e=>`<tr data-op="open" data-t="entity" data-id="${e.id}"><td class="riskid">${e.id}</td><td><div class="riskname">${E(e.name)}</div><div class="riskarea">${E(e.regNo||'')}</div></td><td>${E(e.type)}</td><td>${E(e.country)}</td><td>${E(e.regulators||'—')}</td><td>${o.units.filter(u=>u.entity===e.id).length}</td><td>${o.sites.filter(u=>u.entity===e.id).length}</td></tr>`);
 panel('org','entities').innerHTML=card('Legal entities','The companies in scope. Select one to see its units, sites and who is responsible.',table(['ID','Entity','Type','Country','Regulators','Units','Sites'],er,'No legal entities yet. Add your first one.'),adm?'<button class="op-mini p" data-op="ent-new">Add entity</button>':'');
 const ur=o.units.map(u=>`<tr data-op="open" data-t="unit" data-id="${u.id}"><td class="riskid">${u.id}</td><td><div class="riskname">${E(u.name)}</div></td><td>${E((ent(u.entity)||{}).name||'—')}</td><td>${own(u.head||'—')}</td></tr>`);
 panel('org','units').innerHTML=card('Business units','Functions or lines of business that own risks and controls.',table(['ID','Unit','Entity','Head'],ur,'No business units yet.'),adm?'<button class="op-mini p" data-op="unit-new">Add unit</button>':'');
 const sr=o.sites.map(u=>`<tr data-op="open" data-t="site" data-id="${u.id}"><td class="riskid">${u.id}</td><td><div class="riskname">${E(u.name)}</div></td><td>${E(u.type)}</td><td>${E(u.city||'')}${u.city&&u.country?', ':''}${E(u.country||'')}</td><td>${E((ent(u.entity)||{}).name||'—')}</td></tr>`);
 panel('org','sites').innerHTML=card('Sites','Offices, plants, branches and data centres.',table(['ID','Site','Type','Location','Entity'],sr,'No sites yet.'),adm?'<button class="op-mini p" data-op="site-new">Add site</button>':'');
 renderImport();
 try{document.title=(p.name?p.name+' · ':'')+'Forge GRC';if(p.name){const pn=document.querySelector('.plant-name');if(pn)pn.textContent=p.name;const pl=document.querySelector('.plant-loc');if(pl&&(p.hq||p.country))pl.textContent='⌖  '+[p.hq,p.country].filter(Boolean).join(', ')}}catch{}
}
G.renders.push(renderOrg);

// drawers
G.drawers.entity=id=>{const e=ent(id);if(!e)return;const o=O(),us=o.units.filter(u=>u.entity===id),ss=o.sites.filter(u=>u.entity===id);
 detail({kicker:'Legal entity · '+e.id,title:e.name,pending:e.regulators?[]:[['amber','No regulators are listed for this entity. Add them so obligations can be matched.']],ok:'Entity details are complete.',todo:['Confirm the legal name, registration number and country.','List the regulators that supervise this entity.','Add its business units and sites.'],
  facts:[['Type',E(e.type)],['Country',E(e.country)],['Registration no.',E(e.regNo||'—')],['Regulators',E(e.regulators||'—')],['Responsible',own(e.owner||'—')],['Units / sites',`${us.length} / ${ss.length}`]],
  buttons:isAdmin()?`<button class="op-mini p" data-op="ent-edit" data-id="${id}">Edit</button><button class="op-mini" data-op="org-del" data-k="entities" data-id="${id}">Remove</button>`:'',links:[...us.map(u=>u.id),...ss.map(u=>u.id)]})};
G.drawers.unit=id=>{const u=O().units.find(x=>x.id===id);if(!u)return;
 detail({kicker:'Business unit · '+u.id,title:u.name,pending:[],ok:'Nothing pending.',todo:['Name a head of unit who owns its risks.','Map the unit\'s processes to risks and controls.'],facts:[['Entity',E((ent(u.entity)||{}).name||'—')],['Head',own(u.head||'—')]],buttons:isAdmin()?`<button class="op-mini p" data-op="unit-edit" data-id="${id}">Edit</button><button class="op-mini" data-op="org-del" data-k="units" data-id="${id}">Remove</button>`:'',links:[u.entity].filter(Boolean)})};
G.drawers.site=id=>{const u=O().sites.find(x=>x.id===id);if(!u)return;
 detail({kicker:'Site · '+u.id,title:u.name,pending:[],ok:'Nothing pending.',todo:['Confirm the address and the person responsible for the site.'],facts:[['Type',E(u.type)],['City',E(u.city||'—')],['Country',E(u.country||'—')],['Entity',E((ent(u.entity)||{}).name||'—')]],buttons:isAdmin()?`<button class="op-mini p" data-op="site-edit" data-id="${id}">Edit</button><button class="op-mini" data-op="org-del" data-k="sites" data-id="${id}">Remove</button>`:'',links:[u.entity].filter(Boolean)})};
G.parents.unit=id=>{const u=O().units.find(x=>x.id===id);return u&&u.entity?['entity',u.entity]:null};
G.parents.site=id=>{const u=O().sites.find(x=>x.id===id);return u&&u.entity?['entity',u.entity]:null};
G.linkers.push(id=>{const o=S().org;if(!o)return null;let x;if(/^ENT-/.test(id)&&(x=o.entities.find(q=>q.id===id)))return{type:'entity',label:`${x.id} · ${x.name}`};if(/^BU-/.test(id)&&(x=o.units.find(q=>q.id===id)))return{type:'unit',label:`${x.id} · ${x.name}`};if(/^SITE-/.test(id)&&(x=o.sites.find(q=>q.id===id)))return{type:'site',label:`${x.id} · ${x.name}`};return null});

// forms
const profFields=p=>[{name:'name',label:'Company name',value:p.name,full:true,ph:'As you want it shown on reports'},{name:'legal',label:'Legal name',value:p.legal,ph:'Registered name'},{name:'industry',label:'Industry profile',type:'select',options:INDUSTRY(),value:p.industry},{name:'hq',label:'Head office city',value:p.hq},{name:'country',label:'Country',value:p.country},{name:'size',label:'Employees',type:'select',options:['',...SIZES],value:p.size},{name:'fy',label:'Financial year',value:p.fy},{name:'currency',label:'Reporting currency',value:p.currency},{name:'regulators',label:'Regulators (comma separated)',value:p.regulators,full:true,ph:'e.g. RBI, SEBI, IRDAI'},{name:'website',label:'Website',value:p.website},{name:'contact',label:'Compliance contact (email)',value:p.contact}];
function saveProfile(v,done){const o=O();Object.assign(o.profile,{name:v.name,legal:v.legal,industry:v.industry,hq:v.hq,country:v.country,size:v.size,fy:v.fy,currency:v.currency,regulators:v.regulators,website:v.website,contact:v.contact});if(done)o.profile.done=true;logIt('ORG','Company profile updated.')}
const entFields=e=>[{name:'name',label:'Entity name',value:e.name||'',full:true},{name:'type',label:'Type',type:'select',options:ETYPES,value:e.type||ETYPES[0]},{name:'country',label:'Country',value:e.country||O().profile.country},{name:'regNo',label:'Registration number',value:e.regNo||''},{name:'regulators',label:'Regulators',value:e.regulators||O().profile.regulators},{name:'owner',label:'Responsible person',type:'select',options:[['','— none —'],...personOpts()],value:e.owner||''}];
function upsert(k,prefix,v,id){const o=O();if(id){Object.assign(o[k].find(x=>x.id===id),v)}else{const nid=nextId({entities:'entity',units:'unit',sites:'site'}[k],prefix,3);o[k].push({id:nid,...v});id=nid}logIt(id,(id?'Saved ':'Added ')+id);commit();return id}
Object.assign(actions,{
 'org-edit':()=>{if(needAdmin())return;openForm('Company profile',profFields(O().profile),'Save',v=>{if(!v.name)return 'Enter the company name.';saveProfile(v);commit()})},
 'ent-new':()=>{if(needAdmin())return;openForm('Add legal entity',entFields({}),'Add',v=>{if(!v.name)return 'Enter the entity name.';const id=upsert('entities','ENT-',v);setTimeout(()=>openDrawer('entity',id),0)})},
 'ent-edit':b=>{if(needAdmin())return;const e=ent(b.dataset.id);openForm('Edit '+e.id,entFields(e),'Save',v=>{if(!v.name)return 'Enter the entity name.';upsert('entities','ENT-',v,e.id)})},
 'unit-new':()=>{if(needAdmin())return;openForm('Add business unit',[{name:'name',label:'Unit name',full:true},{name:'entity',label:'Entity',type:'select',options:entOpts()},{name:'head',label:'Head of unit',type:'select',options:[['','— none —'],...personOpts()]}],'Add',v=>{if(!v.name)return 'Enter the unit name.';upsert('units','BU-',v)})},
 'unit-edit':b=>{if(needAdmin())return;const u=O().units.find(x=>x.id===b.dataset.id);openForm('Edit '+u.id,[{name:'name',label:'Unit name',full:true,value:u.name},{name:'entity',label:'Entity',type:'select',options:entOpts(),value:u.entity},{name:'head',label:'Head of unit',type:'select',options:[['','— none —'],...personOpts()],value:u.head}],'Save',v=>{if(!v.name)return 'Enter the unit name.';upsert('units','BU-',v,u.id)})},
 'site-new':()=>{if(needAdmin())return;openForm('Add site',siteFields({}),'Add',v=>{if(!v.name)return 'Enter the site name.';upsert('sites','SITE-',v)})},
 'site-edit':b=>{if(needAdmin())return;const u=O().sites.find(x=>x.id===b.dataset.id);openForm('Edit '+u.id,siteFields(u),'Save',v=>{if(!v.name)return 'Enter the site name.';upsert('sites','SITE-',v,u.id)})},
 'org-del':b=>{if(needAdmin())return;const o=O(),k=b.dataset.k,i=o[k].findIndex(x=>x.id===b.dataset.id);if(i<0)return;const r=o[k][i];if(!confirm(`Remove ${r.name}?`))return;if(k==='entities'){o.units.forEach(u=>{if(u.entity===r.id)u.entity=''});o.sites.forEach(u=>{if(u.entity===r.id)u.entity=''})}o[k].splice(i,1);logIt(r.id,'Removed '+r.id);G.closeDrawer();commit()},
});
const siteFields=u=>[{name:'name',label:'Site name',full:true,value:u.name||''},{name:'type',label:'Type',type:'select',options:STYPES,value:u.type||STYPES[0]},{name:'entity',label:'Entity',type:'select',options:entOpts(),value:u.entity||''},{name:'city',label:'City',value:u.city||''},{name:'country',label:'Country',value:u.country||O().profile.country}];

// ---------------------------------------------------------------- setup wizard
function packOptions(){return (G.PACKS||[]).map(p=>p[0])}
actions['org-wizard']=()=>{
 if(needAdmin())return;const p=O().profile;
 openForm('Set up your company · step 1 of 4',profFields(p).slice(0,8),'Next',v=>{
  if(!v.name)return 'Enter the company name.';
  const industryChanged=v.industry!==PROF;saveProfile(v);
  setTimeout(()=>openForm('Set up your company · step 2 of 4',[{name:'ename',label:'First legal entity',value:v.legal||v.name,full:true},{name:'etype',label:'Type',type:'select',options:ETYPES,value:ETYPES[0]},{name:'regulators',label:'Regulators that supervise it',value:v.regulators||'',full:true,ph:'e.g. RBI, SEBI'},{name:'site',label:'Head office site',value:v.hq?v.hq+' head office':'Head office'},{name:'owner',label:'Responsible person',type:'select',options:[['','— none —'],...personOpts()],value:me().name}],'Next',w=>{
   if(!w.ename)return 'Enter the entity name.';
   const o=O();const id=nextId('entity','ENT-',3);o.entities.push({id,name:w.ename,type:w.etype,country:v.country,regNo:'',regulators:w.regulators,owner:w.owner});
   if(w.site)o.sites.push({id:nextId('site','SITE-',3),name:w.site,type:'Head office',entity:id,city:v.hq,country:v.country});
   o.profile.regulators=w.regulators||o.profile.regulators;
   setTimeout(()=>openForm('Set up your company · step 3 of 4',[{name:'mode',label:'Starting data',type:'select',full:true,options:[['sample','Keep the sample data so I can explore'],['clean','Start clean: remove the sample records, keep the templates and library']],value:o.profile.mode||'sample'},{name:'pack',label:'Adopt a framework pack now (optional)',type:'select',full:true,options:[['','— choose later —'],...packOptions().map(x=>[x,x])]}],'Next',x=>{
    o.profile.mode=x.mode;if(x.pack&&actions['pack-adopt'])actions['pack-adopt']({dataset:{p:x.pack}});
    setTimeout(()=>openForm('Set up your company · step 4 of 4',[{name:'ok',label:'Ready to finish?',type:'select',full:true,options:[['yes',`Finish setup for ${v.name}${x.mode==='clean'?' and remove the sample records':''}`]]}],'Finish',()=>{
     o.profile.done=true;logIt('ORG','Company setup completed.');
     if(x.mode==='clean')cleanStart();
     if(industryChanged){commit();try{localStorage.setItem('forgeGrcProfile',v.industry)}catch{}toast('Switching to the '+((G.PROFILES[v.industry]||{}).label||v.industry)+' profile…');setTimeout(()=>{location.hash=v.industry;location.reload()},900);return}
     commit();toast('Setup complete. Welcome to Forge GRC.');G.go('org');G.renderAll()}),0);}),0);
  }),0)});
};

// ---------------------------------------------------------------- clean start
const EMPTY_KEEP=new Set(['v','seq','appetite','org','ovr','myrisks','targets','scopeMap']);
function emptyDeep(v,depth){if(Array.isArray(v))return [];if(v&&typeof v==='object'&&depth<4){const o={};for(const k in v)o[k]=emptyDeep(v[k],depth+1);return o}return v}
function cleanStart(){
 const s=S();for(const k of Object.keys(s)){if(EMPTY_KEEP.has(k))continue;if(k==='log'){s.log=[];continue}s[k]=emptyDeep(s[k],0)}
 s.obl=[];s.snaps={};s.snapsDemo=false;s.org.profile.mode='clean';try{localStorage.setItem('forgeGrcDate','real')}catch{}applyClean();
}
function applyClean(){
 const o=S().org;if(!o||o.profile.mode!=='clean'||o.__applied)return;
 let keep=[];try{keep=(JSON.parse(localStorage.getItem('forgeGrcCreatedRisksV1')||'[]')||[]).map(r=>r.id)}catch{}
 const mine=new Set([...(S().myrisks||[]).map(r=>r.id),...keep]);
 for(let i=risks.length-1;i>=0;i--)if(!mine.has(risks[i].id))risks.splice(i,1);
 try{[findings,evidence,frameworks].forEach(a=>a.splice(0,a.length))}catch{}
 try{render()}catch{}
}
// when the shared data says "clean", make this browser's built-in lists match (they come from the industry profile)
function applyCleanLive(){const o=S().org;if(o&&o.profile&&o.profile.mode==='clean'&&!window.__gcClean){window.__gcClean=true;applyClean()}}
G.renders.unshift(applyCleanLive);

// risks added through the original "New risk" form are mirrored into shared data so other people see them
function mirrorMyRisks(){try{const l=JSON.parse(localStorage.getItem('forgeGrcCreatedRisksV1')||'[]');if(!Array.isArray(l))return;const s=S();const cur=JSON.stringify(s.myrisks||[]);const nxt=l.filter(r=>r&&r.id);if(JSON.stringify(nxt)!==cur&&(nxt.length||(s.myrisks||[]).length)){s.myrisks=nxt;G.save()}}catch{}}
document.addEventListener('click',e=>{if(e.target.closest('#saveRisk'))setTimeout(mirrorMyRisks,120)});
function pullMyRisks(){const s=S();(s.myrisks||[]).forEach(r=>{if(!risks.find(x=>x.id===r.id)){risks.unshift(r);window.__gcRiskAdded=true}});if(window.__gcRiskAdded){window.__gcRiskAdded=false;try{render()}catch{}}}
G.renders.push(pullMyRisks);

// ---------------------------------------------------------------- import
const L={
 issues:{label:'Issues',cols:['title*','severity','owner*','due','source','link','description'],ex:['Late closure of KYC exceptions','High','Priya Shah','2026-11-30','Audit finding','','Backlog of 40 cases'],
  build:(r,s)=>{const sv=['Critical','High','Medium','Low'],sev=pick(r.severity,sv,'Medium');return{id:nextId('issue','ISS-',3),title:r.title,source:r.source||'Self-reported',link:r.link||'',sev,owner:r.owner,due:date(r.due)||addDays(TODAY,45),created:TODAY,cause:'To be determined',status:'Open',desc:r.description||'',verifiedBy:null,actions:[]}},key:'issues'},
 controls:{label:'Controls',cols:['id','name*','type','nature','frequency','owner*','area','risks','frameworks'],ex:['','Daily reconciliation of nostro accounts','Detective','Automated','Monthly','Evan Brooks','Operational risk','R-101|R-102','RBI'],
  build:(r,s)=>({id:r.id||newId(s.controls,'CTL-'),name:r.name,type:pick(r.type,['Preventive','Detective','Corrective'],'Preventive'),nature:pick(r.nature,['Manual','Automated','IT-dependent manual'],'Manual'),freq:pick(r.frequency,['Monthly','Quarterly','Semi-annual','Annual'],'Quarterly'),owner:r.owner,area:r.area||'',risks:list(r.risks),fw:list(r.frameworks),lastTest:addDays(TODAY,-(({Monthly:30,Quarterly:91,'Semi-annual':182,Annual:365})[pick(r.frequency,['Monthly','Quarterly','Semi-annual','Annual'],'Quarterly')])),result:'Not tested',tester:'',exc:0}),key:'controls'},
 vendors:{label:'Vendors',cols:['name*','category','tier*','owner*','single_source','risks','contract_end'],ex:['Nimbus Cloud Services','Cloud hosting','1','Sam Rivera','yes','R-107','2027-09-30'],
  build:(r,s)=>({id:nextId('vendor','V-',3),name:r.name,cat:r.category||'',tier:Math.min(3,Math.max(1,+r.tier||2)),owner:r.owner,single:/^(y|yes|true|1)$/i.test(r.single_source||''),risks:list(r.risks),contractEnd:date(r.contract_end)||'',last:TODAY,score:70,inherent:'Medium',hist:[{date:TODAY,score:70,by:me().name}]}),key:'vendors'},
 policies:{label:'Policies',cols:['title*','type','version','owner*','status','next_review','audience','frameworks'],ex:['Outsourcing Policy','Policy','2.0','Jordan Lee','Published','2027-03-31','900','RBI'],
  build:(r,s)=>({id:nextId('policy','POL-',3),title:r.title,type:pick(r.type,['Policy','Standard','Procedure','Guideline'],'Policy'),ver:r.version||'1.0',owner:r.owner,status:pick(r.status,['Draft','In review','Approved','Published'],'Draft'),review:date(r.next_review)||addDays(TODAY,365),aud:+r.audience||0,att:0,fw:list(r.frameworks),ctrls:[],attBy:[]}),key:'policies'},
 losses:{label:'Loss events',cols:['date*','title*','category','risk','gross*','recovered','status','reporter'],ex:['2026-09-12','Duplicate vendor payment','Process failure','R-104','450000','150000','Open','Priya Shah'],
  build:(r,s)=>({id:nextId('loss','LE-',3),date:date(r.date),title:r.title,cat:r.category||'Process failure',risk:r.risk||'',gross:+r.gross||0,rec:+r.recovered||0,status:pick(r.status,['Open','Closed'],'Open'),reporter:r.reporter||me().name}),key:'losses'},
 kris:{label:'Indicators (KRIs)',cols:['id','name*','risk*','owner*','amber*','red*','latest*','unit'],ex:['','Overdue reconciliations (count)','R-104','Evan Brooks','5','10','3',''],
  build:(r,s)=>({id:r.id||newId(s.kris,'KRI-'),name:r.name,risk:r.risk,owner:r.owner,dir:'higher',amber:+r.amber,red:+r.red,series:[+r.latest],unit:r.unit||''}),key:'kris'}
};
const pick=(v,list,def)=>{const f=list.find(x=>x.toLowerCase()===String(v||'').trim().toLowerCase());return f||def};
const list=v=>String(v||'').split(/[|;]/).map(x=>x.trim()).filter(Boolean);
const newId=(arr,prefix)=>{const n=Math.max(0,...arr.map(x=>+String(x.id).replace(/\D/g,'')||0))+1;return prefix+String(n).padStart(3,'0')};
function date(v){v=String(v||'').trim();if(!v)return '';let y,m,d,x;if(x=/^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v)){y=+x[1];m=+x[2];d=+x[3]}else if(x=/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(v)){d=+x[1];m=+x[2];y=+x[3]}else return '';
 const t=new Date(Date.UTC(y,m-1,d));if(t.getUTCFullYear()!==y||t.getUTCMonth()!==m-1||t.getUTCDate()!==d)return '';return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
function parseCsv(text){const rows=[];let row=[],cur='',q=false;text=text.replace(/^﻿/,'');
 for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'){if(text[i+1]==='"'){cur+='"';i++}else q=false}else cur+=c}else if(c==='"')q=true;else if(c===','||c==='\t'){row.push(cur);cur=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cur);rows.push(row);row=[];cur=''}else cur+=c}
 if(cur!==''||row.length){row.push(cur);rows.push(row)}return rows.filter(r=>r.some(c=>String(c).trim()))}
let IMP={type:'issues',rows:null,errs:[],text:''};
function validate(type,recs){const spec=L[type],people=new Set(G.people()),req=spec.cols.filter(c=>c.endsWith('*')).map(c=>c.slice(0,-1));const out=[];
 recs.forEach((r,i)=>{const e=[],w=[];req.forEach(k=>{if(!String(r[k]??'').trim())e.push(`${k} is required`)});
  if(r.owner&&!people.has(r.owner))w.push(`owner "${r.owner}" is not a user yet`);
  if(type==='issues'&&r.due&&!date(r.due))e.push('due must be a date (YYYY-MM-DD or DD/MM/YYYY)');
  if(type==='losses'&&!date(r.date))e.push('date must be a date');
  if(type==='kris'){['amber','red','latest'].forEach(k=>{if(r[k]!==''&&isNaN(+r[k]))e.push(k+' must be a number')})}
  out.push({line:i+2,r,e,w})});return out}
function renderImport(){
 const pn=panel('org','import');if(!pn)return;const spec=L[IMP.type],adm=isAdmin();
 let body=`<p class="op-note">Bring in records from a spreadsheet. Save the sheet as CSV (comma or tab separated), pick what it contains, and check the preview before importing. Columns marked * are required; use | between several values.</p>
 <div class="toolbar"><select class="select" id="impType">${Object.keys(L).map(k=>`<option value="${k}"${k===IMP.type?' selected':''}>${L[k].label}</option>`).join('')}</select><button class="btn" data-op="imp-template">↓ Download template</button><label class="btn primary" style="cursor:pointer">Choose CSV file<input type="file" id="impFile" accept=".csv,.txt,.tsv" style="display:none"></label></div>`;
 if(IMP.rows){const ok=IMP.rows.filter(x=>!x.e.length);
  body+=card('Preview',`${IMP.rows.length} row(s) read · ${ok.length} ready · ${IMP.rows.length-ok.length} with errors`,table(['Line','Summary','Check'],IMP.rows.slice(0,50).map(x=>`<tr style="cursor:default"><td>${x.line}</td><td>${E(x.r[spec.cols[0].replace('*','')]||x.r[spec.cols[1].replace('*','')]||'')}</td><td>${x.e.length?pill(x.e.join('; '),'red'):x.w.length?pill(x.w.join('; '),'amber'):pill('Ready','green')}</td></tr>`)),adm||true?`<button class="op-mini p" data-op="imp-go"${ok.length?'':' disabled'}>Import ${ok.length} record(s)</button> <button class="op-mini" data-op="imp-clear">Clear</button>`:'')}
 pn.innerHTML=body;
}
document.addEventListener('change',e=>{
 if(e.target.id==='impType'){IMP={type:e.target.value,rows:null,errs:[],text:''};renderImport()}
 if(e.target.id==='impFile'&&e.target.files[0]){const f=e.target.files[0];if(f.size>5e6){toast('Choose a file under 5 MB.');return}const r=new FileReader();r.onload=()=>{const rows=parseCsv(String(r.result));if(rows.length<2){toast('The file needs a header row and at least one data row.');return}
  const spec=L[IMP.type],heads=rows[0].map(h=>h.trim().toLowerCase().replace(/\*$/,'').replace(/[\s-]+/g,'_'));const want=spec.cols.map(c=>c.replace('*',''));
  const miss=spec.cols.filter(c=>c.endsWith('*')).map(c=>c.slice(0,-1)).filter(c=>!heads.includes(c));if(miss.length){toast('Missing column(s): '+miss.join(', ')+'. Download the template to see the format.');return}
  const recs=rows.slice(1).map(r=>{const o={};want.forEach(k=>o[k]='');heads.forEach((h,i)=>{if(want.includes(h))o[h]=(r[i]||'').trim()});return o});
  IMP.rows=validate(IMP.type,recs);renderImport()};r.readAsText(f);e.target.value=''}
});
Object.assign(actions,{
 'imp-template':()=>{const spec=L[IMP.type];G.csv(`forge-${IMP.type}-template.csv`,[spec.cols,spec.ex],'Template downloaded.')},
 'imp-clear':()=>{IMP.rows=null;renderImport()},
 'imp-go':()=>{const spec=L[IMP.type],s=S();const ok=IMP.rows.filter(x=>!x.e.length);if(!ok.length)return;
  ok.forEach(x=>{const rec=spec.build(x.r,s);s[spec.key].unshift(rec);logIt(rec.id,`Imported from CSV (${spec.label.toLowerCase()}).`)});
  toast(`${ok.length} ${spec.label.toLowerCase()} imported.`);IMP.rows=null;commit()}
});

// ---------------------------------------------------------------- board pack
function packHtml(){
 const s=S(),o=O(),p=o.profile,ap=s.appetite,cov=G.riskCoverage;const name=p.name||'Your company';
 const out=risks.filter(r=>r.score>ap),topR=[...risks].sort((a,b)=>b.score-a.score).slice(0,8);
 const openI=s.issues.filter(i=>i.status!=='Closed'),od=openI.filter(G.isOverdue),bad=s.controls.filter(c=>c.result==='Ineffective'),red=s.kris.filter(k=>G.kriStatus(k)==='Red'),amb=s.kris.filter(k=>G.kriStatus(k)==='Amber');
 const net=s.losses.reduce((t,l)=>t+l.gross-l.rec,0),plan=(s.audit||{}).plan||[],obl=s.obl||[];
 const tbl=(h,rows,empty)=>`<table><thead><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.join(''):`<tr><td colspan="${h.length}" class="mut">${empty}</td></tr>`}</tbody></table>`;
 const stat=(l,v,sub,k)=>`<div class="st ${k||''}"><div class="v">${v}</div><div class="l">${l}</div><div class="s">${sub||''}</div></div>`;
 const oblGap=obl.filter(x=>/gap|non/i.test(x.status||'')).length;
 return `<div class="bp-page cover"><div><div class="k">Board risk and compliance pack</div><h1>${E(name)}</h1><p>${E(p.legal&&p.legal!==name?p.legal:'')}</p></div><div class="meta">As at ${E(fmt(TODAY))}<br>Prepared by ${E(me().name)}<br>Industry: ${E(((G.PROFILES||{})[p.industry]||{}).label||p.industry)}<br>Entities in scope: ${o.entities.length||'not yet set up'}${G.scopeLabel&&G.scopeLabel()?'<br>Scope: '+E(G.scopeLabel()):''}</div></div>
 <div class="bp-page"><h2>1. Headlines</h2><div class="sts">${stat('Risks above appetite',out.length,`of ${risks.length} in the register`,out.length?'r':'')}${stat('Open issues',openI.length,`${od.length} overdue`,od.length?'r':'')}${stat('Ineffective controls',bad.length,`of ${s.controls.length}`,bad.length?'r':'')}${stat('Indicators in red',red.length,`${amb.length} amber`,red.length?'r':'')}${stat('Net loss to date',E(inr(net)),`${s.losses.length} events`)}${stat('Obligations with gaps',oblGap,`of ${obl.length} tracked`,oblGap?'a':'')}</div>
 <h2>2. Top risks by residual score</h2>${tbl(['Risk','Area','Residual','Owner','Control coverage'],topR.map(r=>`<tr><td><b>${E(r.id)}</b> ${E(r.name)}</td><td>${E(r.area)}</td><td>${E(r.rating)} (${r.score})</td><td>${E(r.owner)}</td><td>${E(cov(r.id))}</td></tr>`),'No risks recorded.')}</div>
 <div class="bp-page"><h2>3. Issues needing attention</h2>${tbl(['Issue','Severity','Owner','Due','Status'],openI.filter(i=>G.isOverdue(i)||['Critical','High'].includes(i.sev)).slice(0,14).map(i=>`<tr><td><b>${E(i.id)}</b> ${E(i.title)}</td><td>${E(i.sev)}</td><td>${E(i.owner)}</td><td>${E(fmt(i.due))}${G.isOverdue(i)?' (overdue)':''}</td><td>${E(i.status)}</td></tr>`),'No overdue or high-severity issues.')}
 <h2>4. Control and indicator exceptions</h2>${tbl(['Item','Detail','Owner'],[...bad.slice(0,8).map(c=>`<tr><td><b>${E(c.id)}</b> ${E(c.name)}</td><td>Ineffective · last test ${E(fmt(c.lastTest))}</td><td>${E(c.owner)}</td></tr>`),...red.slice(0,8).map(k=>`<tr><td><b>${E(k.id)}</b> ${E(k.name)}</td><td>Red · latest ${k.series[k.series.length-1]}${k.unit==='%'?'%':''} against ${k.red}</td><td>${E(k.owner)}</td></tr>`)],'No exceptions.')}
 <h2>5. Assurance</h2>${tbl(['Audit','Area','Status','Rating'],plan.slice(0,10).map(a=>`<tr><td><b>${E(a.id)}</b> ${E(a.title)}</td><td>${E(a.area)}</td><td>${E(a.status)}</td><td>${E(a.rating||'—')}</td></tr>`),'No audits planned.')}</div>
 <div class="bp-page"><h2>6. Decisions and sign-off</h2><p class="mut">Matters for the board to note or decide:</p><div class="box"></div><div class="sign"><div>Chair of the risk committee<br><br>__________________________</div><div>Chief Risk Officer<br><br>__________________________</div><div>Date<br><br>__________________________</div></div><p class="mut" style="margin-top:30px">Prepared from the records in Forge GRC as at ${E(fmt(TODAY))}. Library summaries are for planning and need legal review before being relied on.</p></div>`}
function showPack(){
 let ov=document.getElementById('bpOverlay');if(ov)ov.remove();ov=document.createElement('div');ov.id='bpOverlay';
 ov.innerHTML=`<style>
 #bpOverlay{position:fixed;inset:0;z-index:99990;background:#e9edf1;overflow:auto;font-family:"DM Sans",Arial,sans-serif;color:#14202E}
 #bpOverlay .bar{position:sticky;top:0;background:#0F1B2B;color:#fff;padding:10px 18px;display:flex;gap:10px;align-items:center;justify-content:space-between;font-size:12px}
 #bpOverlay .bar button{border:0;border-radius:6px;padding:8px 14px;font:700 12px "DM Sans";cursor:pointer}
 #bpOverlay .bp-page{background:#fff;width:min(820px,calc(100% - 24px));margin:16px auto;padding:44px 48px;box-shadow:0 2px 14px #0002;box-sizing:border-box;min-height:600px}
 #bpOverlay h1{font:800 34px Manrope,Arial;margin:8px 0}#bpOverlay h2{font:800 17px Manrope,Arial;margin:26px 0 10px;color:#17766A}#bpOverlay h2:first-child{margin-top:0}
 #bpOverlay .cover{display:flex;flex-direction:column;justify-content:space-between;background:#0F1B2B;color:#F3F5F7}#bpOverlay .cover .k{font:500 11px "DM Mono",monospace;letter-spacing:2px;text-transform:uppercase;color:#E3A33B}#bpOverlay .cover .meta{font-size:12px;line-height:1.8;color:#9fb0c2}
 #bpOverlay table{width:100%;border-collapse:collapse;font-size:11.5px;margin:6px 0 14px}#bpOverlay th{text-align:left;font:700 10px "DM Mono",monospace;text-transform:uppercase;color:#56667A;border-bottom:2px solid #cbd6e0;padding:6px 8px}#bpOverlay td{padding:7px 8px;border-bottom:1px solid #e6ecf1;vertical-align:top}#bpOverlay .mut{color:#8a95a3}
 #bpOverlay .sts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:8px}#bpOverlay .st{border:1px solid #dbe3ea;border-radius:8px;padding:12px}#bpOverlay .st .v{font:800 26px Manrope,Arial}#bpOverlay .st .l{font-size:11px;font-weight:700}#bpOverlay .st .s{font-size:10.5px;color:#778293}#bpOverlay .st.r{border-color:#e9b3ae;background:#fdf3f2}#bpOverlay .st.a{border-color:#ecd18f;background:#fffaf0}
 #bpOverlay .box{border:1px solid #cbd6e0;border-radius:8px;min-height:200px}#bpOverlay .sign{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:40px;font-size:11px}
 @media print{body.bp-printing>*:not(#bpOverlay){display:none!important}#bpOverlay{position:static;background:#fff;overflow:visible}#bpOverlay .bar{display:none}#bpOverlay .bp-page{box-shadow:none;margin:0;width:auto;page-break-after:always;min-height:0}#bpOverlay .cover{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
 @page{size:A4;margin:14mm}</style>
 <div class="bar"><span>Board pack preview · use Print and choose “Save as PDF”</span><span><button style="background:#17766A;color:#fff" id="bpPrint">Print / save as PDF</button> <button style="background:#fff;color:#14202E" id="bpClose">Close</button></span></div>${(()=>{const on=G.scopeEnter&&G.scopeEnter();try{return packHtml()}finally{if(on)G.scopeLeave()}})()}`;
 document.body.appendChild(ov);document.body.classList.add('bp-printing');
 ov.querySelector('#bpClose').onclick=()=>{ov.remove();document.body.classList.remove('bp-printing')};
 ov.querySelector('#bpPrint').onclick=()=>window.print();
}
actions['board-pack']=showPack;

// ---------------------------------------------------------------- guide
G.mount({id:'guide',label:'Guide',ico:'?',group:GROUP,title:'Guide',sub:'How to get started, who can do what, and how the main ideas fit together.',tabs:[['start','Getting started'],['roles','Roles and access'],['terms','Key terms']]});
function renderGuide(){
 const step=(n,t,d,op,lab)=>`<div class="op-li"><div><b>${n}. ${t}</b><div class="riskarea">${d}</div></div>${op?`<button class="op-mini p" data-op="${op}"${op==='goto'?' data-v="'+lab[1]+'"':''}>${lab[0]}</button>`:''}</div>`;
 panel('guide','start').innerHTML=card('Set up in six steps','Most teams are working with real records within an hour.',
  step(1,'Describe your company','Name, industry, regulators, first legal entity and head office.','org-wizard',['Run setup'])+
  step(2,'Invite your team','Create accounts and give each person a role. People you add can then be named as owners.','goto',['Users and access','users'])+
  step(3,'Adopt the frameworks that apply','Pick a pack in Standards and data. Obligations appear in the register ready to be assessed.','goto',['Open Standards and data','hub'])+
  step(4,'Bring in what you already have','Import risks, controls, issues, vendors and policies from your spreadsheets.','goto',['Import data','org'])+
  step(5,'Link controls to risks, then test them','Coverage and gaps show up on the dashboard as soon as controls are mapped.','goto',['Open Controls','controls'])+
  step(6,'Report','The board pack turns the live records into a printable PDF.','board-pack',['Board pack']));
 const R=[['Administrator','Everything, including company setup, users, appetite and deletions'],['Business user','Create and update records; cannot change appetite or company setup; cannot delete'],['Function user','Update records for their own area; also cannot change policies or vendors'],['Auditor','Read everything; can record audits and issues; cannot change anything else']];
 panel('guide','roles').innerHTML=card('What each role can do','Enforced on the server when you are signed in',table(['Role','Allowed'],R.map(r=>`<tr style="cursor:default"><td><b>${r[0]}</b></td><td>${r[1]}</td></tr>`)))+`<p class="op-note">Every change is recorded in the Audit trail with who made it, when, and what changed.</p>`;
 const T=[['Inherent risk','The risk before any controls are considered.'],['Residual risk','What is left after controls. Compared with appetite.'],['Risk appetite','The residual score above which a risk needs action or formal acceptance.'],['Control','A step that prevents, detects or corrects a problem. Tested on a schedule.'],['Issue','A problem that must be fixed, with an owner, due date and actions.'],['KRI','Key risk indicator: a number watched against amber and red thresholds.'],['RCSA','Risk and control self-assessment: owners rate their own risks and controls; the second line challenges.'],['Obligation','A requirement from a law, regulation or standard that you map controls to.']];
 panel('guide','terms').innerHTML=card('Key terms','',table(['Term','Meaning'],T.map(t=>`<tr style="cursor:default"><td><b>${t[0]}</b></td><td>${t[1]}</td></tr>`)));
}
G.renders.push(renderGuide);

// dashboard banner until setup is done
function banner(){const dash=document.getElementById('view-dashboard');if(!dash)return;let b=document.getElementById('orgBanner');const p=O().profile;
 if(p.done){if(b)b.remove();return}
 if(!b){b=document.createElement('div');b.id='orgBanner';const ph=dash.querySelector('.pagehead');ph?ph.after(b):dash.prepend(b)}
 b.innerHTML=`<div class="op-banner amber" style="margin:0 0 14px"><div><b>Make it yours</b><div>Add your company, entities and frameworks, or start clean without the sample records.</div></div><button class="op-mini p" data-op="${isAdmin()?'org-wizard':'goto'}" data-v="org">${isAdmin()?'Start setup':'See setup'}</button></div>`}
G.renders.push(banner);

// ---------------------------------------------------------------- small screens and keyboard use
const st=document.createElement('style');st.textContent=`
a.gc-skip{position:absolute;left:-999px;top:6px;background:#17766A;color:#fff;padding:8px 12px;border-radius:6px;z-index:100000;font:600 12px "DM Sans"}a.gc-skip:focus{left:8px}
button:focus-visible,select:focus-visible,input:focus-visible,textarea:focus-visible,[tabindex]:focus-visible,a:focus-visible,tr[data-op]:focus-visible{outline:2px solid #17766A;outline-offset:2px}
tr[data-op]:focus-visible,.drillable:focus-visible{background:#eef6f4}
@media(max-width:720px){
 .main,.content,.view{min-width:0}.topbar{height:auto;min-height:56px;padding:8px 12px;flex-wrap:wrap;gap:6px}.top-actions{flex-wrap:wrap;gap:6px;justify-content:flex-end}
 .content{padding:16px 12px 32px}.grid,.op-kpis{grid-template-columns:1fr 1fr}.bottomgrid,.op-two{grid-template-columns:1fr}
 .pagehead{flex-direction:column;align-items:flex-start;gap:10px}.head-actions{flex-wrap:wrap;width:100%}.toolbar{flex-wrap:wrap}.toolbar .search{min-width:0;width:100%}
 .detailback{padding:0}.detailmodal{width:100%!important;max-height:100vh!important;border-radius:0!important;min-height:100vh}.detailgrid{grid-template-columns:1fr}
 #gcPill{max-width:100%;white-space:normal}#opSnapshot .grid,.grid[style]{grid-template-columns:1fr 1fr!important}.libtabs{overflow-x:auto;flex-wrap:nowrap}.libtab{white-space:nowrap}
}
@media(max-width:480px){.grid,.op-kpis{grid-template-columns:1fr}}`;document.head.appendChild(st);
if(!document.querySelector('.gc-skip')){const a=document.createElement('a');a.className='gc-skip';a.href='#';a.textContent='Skip to main content';a.onclick=e=>{e.preventDefault();const m=document.querySelector('.content');if(m){m.setAttribute('tabindex','-1');m.focus()}};document.body.prepend(a)}
// rows that open a record can be reached and opened from the keyboard
function keyboardRows(){document.querySelectorAll('tbody tr[data-op="open"],#priorityRows tr,#allRiskRows tr,#evidenceRows tr,#findingRows tr,#frameworkRows tr').forEach(tr=>{if(!tr.hasAttribute('tabindex')){tr.tabIndex=0;tr.setAttribute('role','button')}});document.querySelectorAll('.op-kpi.drillable,.op-tile.drillable,.metric').forEach(c=>{if(!c.hasAttribute('tabindex')){c.tabIndex=0;c.setAttribute('role','button')}})}
G.renders.push(keyboardRows);
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('tr[tabindex],.op-kpi[tabindex],.op-tile[tabindex],.metric[tabindex]')){e.preventDefault();e.target.click()}});
G.org=O;
G.renderAll();
})();
