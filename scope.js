// Scope: tag records to a legal entity, business unit and site, and view the whole app for one scope.
// Risks, controls, issues, indicators, loss events, policies and vendors can be tagged. Anything not
// tagged is treated as group-wide and shows in every scope. Other registers are group-wide for now.
(function(){
const G=window.GRC;if(!G)return;
const {E,fmt,pill,table,card,toast,logIt,commit,actions,risks,PROF,openForm}=G;
const S=()=>G.S(),O=()=>G.org();
const TAGGED=['issues','controls','kris','losses','policies','vendors'];
const TYPES={riskrec:'Risk',control:'Control',issue:'Issue',kri:'Indicator',loss:'Loss event',policy:'Policy',vendor:'Vendor'};
G.seeders.scopeMap=()=>({});
const MAP=()=>{const s=S();if(!s.scopeMap)s.scopeMap={};return s.scopeMap};

// ---------------------------------------------------------------- which scope is selected
const KEY='forgeGrcScope-'+PROF;
let scope={t:'',id:''};
try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&v.id)scope=v}catch{}
const setScope=v=>{scope=v||{t:'',id:''};try{localStorage.setItem(KEY,JSON.stringify(scope))}catch{}};
const ents=()=>O().entities,units=()=>O().units,sites=()=>O().sites;
function valid(){if(!scope.id)return false;const list=scope.t==='e'?ents():scope.t==='u'?units():sites();if(!list.find(x=>x.id===scope.id)){setScope();return false}return true}
const ok=id=>{if(!scope.id)return true;const t=MAP()[id];if(!t)return true;return (scope.t==='e'?t.e:scope.t==='u'?t.u:t.s)===scope.id};
G.inScope=ok;
G.scopeLabel=()=>{if(!valid())return '';const list=scope.t==='e'?ents():scope.t==='u'?units():sites();const x=list.find(q=>q.id===scope.id);return x?x.name:''};

// ---------------------------------------------------------------- temporarily narrow the data while the screens draw
let saved=null;
G.scopeEnter=()=>{if(saved||!valid())return false;const s=S();saved={};
 TAGGED.forEach(k=>{if(Array.isArray(s[k])){saved[k]=s[k];s[k]=s[k].filter(x=>ok(x.id))}});
 if(Array.isArray(s.tests)){saved.tests=s.tests;const cs=new Set((s.controls||[]).map(c=>c.id));s.tests=s.tests.filter(t=>cs.has(t.ctrl))}
 saved.__risks=risks.slice();for(let i=risks.length-1;i>=0;i--)if(!ok(risks[i].id))risks.splice(i,1);
 return true};
G.scopeLeave=()=>{if(!saved)return;const s=S();for(const k in saved){if(k==='__risks')risks.splice(0,risks.length,...saved.__risks);else s[k]=saved[k]}saved=null};
(function(){const r=window.render;if(typeof r!=='function')return;window.render=function(){const on=G.scopeEnter();try{return r.apply(this,arguments)}finally{if(on)G.scopeLeave()}}})();

// ---------------------------------------------------------------- selector in the top bar
const top=document.querySelector('.top-actions');let sel=null;
function paintSelector(){
 if(!top)return;if(!sel){sel=document.createElement('select');sel.id='scopeSel';sel.className='select';sel.title='Show one entity, unit or site';sel.setAttribute('aria-label','Scope');sel.style.maxWidth='210px';top.prepend(sel);
  sel.onchange=()=>{const v=sel.value;setScope(v?{t:v[0],id:v.slice(2)}:null);G.renderAll();try{window.render()}catch{}}}
 const E_=ents();sel.style.display=E_.length||units().length||sites().length?'':'none';
 const o=(t,x,ind)=>`<option value="${t}:${x.id}"${scope.id===x.id?' selected':''}>${ind?'  ':''}${E(x.name)}</option>`;
 sel.innerHTML=`<option value="">All entities</option>`+E_.map(e=>`<optgroup label="${E(e.name)}">${o('e',e)}${units().filter(u=>u.entity===e.id).map(u=>o('u',u,1)).join('')}${sites().filter(u=>u.entity===e.id).map(u=>o('s',u,1)).join('')}</optgroup>`).join('')+
  (units().some(u=>!u.entity)||sites().some(u=>!u.entity)?`<optgroup label="Not under an entity">${units().filter(u=>!u.entity).map(u=>o('u',u)).join('')}${sites().filter(u=>!u.entity).map(u=>o('s',u)).join('')}</optgroup>`:'');
 valid();
}
G.renders.push(paintSelector);

// ---------------------------------------------------------------- tag a record from its panel
const tagOf=id=>MAP()[id]||{};
function setTag(id,part,val){const m=MAP(),t=Object.assign({},m[id]||{});if(val)t[part]=val;else delete t[part];
 if(part==='e'&&val){const u=units().find(x=>x.id===t.u);if(u&&u.entity&&u.entity!==val)delete t.u;const si=sites().find(x=>x.id===t.s);if(si&&si.entity&&si.entity!==val)delete t.s}
 if(part==='u'&&val){const u=units().find(x=>x.id===val);if(u&&u.entity)t.e=u.entity}
 if(part==='s'&&val){const u=sites().find(x=>x.id===val);if(u&&u.entity)t.e=u.entity}
 if(Object.keys(t).length)m[id]=t;else delete m[id];logIt(id,'Scope updated.');G.save()}
const optsFor=(arr,v)=>`<option value="">—</option>${arr.map(x=>`<option value="${E(x.id)}"${x.id===v?' selected':''}>${E(x.name)}</option>`).join('')}`;
function drawerBlock(d){
 if(!TYPES[d.type])return;const body=document.getElementById('opDB');if(!body)return;
 const O_=O();if(!O_.entities.length&&!O_.units.length&&!O_.sites.length)return;
 let box=document.getElementById('scopeBox');if(!box){box=document.createElement('div');box.id='scopeBox';body.appendChild(box)}
 const t=tagOf(d.id),dis=G.me().role==='Auditor'?' disabled':'';
 box.innerHTML=`<h4>Scope</h4><div class="detailgrid"><div class="detailbox"><b>Entity</b><select class="select" data-scope="e" data-id="${E(d.id)}"${dis}>${optsFor(ents(),t.e)}</select></div><div class="detailbox"><b>Business unit</b><select class="select" data-scope="u" data-id="${E(d.id)}"${dis}>${optsFor(units(),t.u)}</select></div><div class="detailbox"><b>Site</b><select class="select" data-scope="s" data-id="${E(d.id)}"${dis}>${optsFor(sites(),t.s)}</select></div></div>${t.e||t.u||t.s?'':'<p class="op-note">Not tagged: this record shows in every scope.</p>'}`;
}
G.drawerHooks.push(drawerBlock);
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||!t.dataset.scope)return;setTag(t.dataset.id,t.dataset.scope,t.value);G.renderAll();try{window.render()}catch{}});

// ---------------------------------------------------------------- assign scope in bulk (Organisation > Scope)
G.addTab&&0;
const ALL=()=>{const s=S(),out=[];
 const R=saved&&saved.__risks?saved.__risks:risks;R.forEach(r=>out.push(['riskrec','Risk',r.id,r.name]));
 const g=k=>saved&&saved[k]?saved[k]:s[k]||[];
 g('controls').forEach(r=>out.push(['control','Control',r.id,r.name]));g('issues').forEach(r=>out.push(['issue','Issue',r.id,r.title]));g('kris').forEach(r=>out.push(['kri','Indicator',r.id,r.name]));g('losses').forEach(r=>out.push(['loss','Loss event',r.id,r.title]));g('policies').forEach(r=>out.push(['policy','Policy',r.id,r.title]));g('vendors').forEach(r=>out.push(['vendor','Vendor',r.id,r.name]));return out};
let BF={type:'',q:'',untagged:true};
function renderScopeTab(){
 const pn=G.panel('org','scope');if(!pn)return;const adm=G.me().role==='Administrator';
 G.head&&0;
 const all=ALL(),map=MAP(),rows=all.filter(r=>(!BF.type||r[0]===BF.type)&&(!BF.untagged||!map[r[2]])&&(!BF.q||(r[2]+r[3]).toLowerCase().includes(BF.q.toLowerCase())));
 const tagged=all.filter(r=>map[r[2]]).length;
 const eo=ents().map(e=>[e.id,e.name]);
 pn.innerHTML=`<p class="op-note">Tag records to an entity, unit and site, then use the Scope selector in the top bar to see the whole app for one of them. Untagged records are group-wide and show in every scope. ${tagged} of ${all.length} records are tagged.</p>
 <div class="toolbar"><input class="search" id="bfQ" placeholder="Search records…" value="${E(BF.q)}"><select class="select" id="bfType"><option value="">All types</option>${Object.entries(TYPES).map(([k,v])=>`<option value="${k}"${BF.type===k?' selected':''}>${v}</option>`).join('')}</select><label style="font-size:12px;display:flex;gap:6px;align-items:center"><input type="checkbox" id="bfUn"${BF.untagged?' checked':''}>Untagged only</label>
 ${adm&&eo.length?`<select class="select" id="bfBulk"><option value="">Assign shown to…</option>${eo.map(e=>`<option value="${E(e[0])}">${E(e[1])}</option>`).join('')}</select>`:''}${adm?'<button class="btn" data-op="scope-demo">Apply demo structure</button>':''}</div>`+
 card('Records',`${rows.length} shown${rows.length>200?' (first 200)':''}`,table(['Type','ID','Record','Entity','Unit','Site'],rows.slice(0,200).map(r=>{const t=map[r[2]]||{};return `<tr style="cursor:default"><td>${E(r[1])}</td><td class="riskid">${E(r[2])}</td><td><div class="riskname">${E((r[3]||'').slice(0,70))}</div></td><td><select class="select" data-scope="e" data-id="${E(r[2])}">${optsFor(ents(),t.e)}</select></td><td><select class="select" data-scope="u" data-id="${E(r[2])}">${optsFor(units(),t.u)}</select></td><td><select class="select" data-scope="s" data-id="${E(r[2])}">${optsFor(sites(),t.s)}</select></td></tr>`}),'Nothing to show. Create entities, units and sites first, or clear the filters.'));
}
G.renders.push(renderScopeTab);
document.addEventListener('input',e=>{if(e.target.id==='bfQ'){BF.q=e.target.value;renderScopeTab();const i=document.getElementById('bfQ');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}}});
document.addEventListener('change',e=>{
 if(e.target.id==='bfType'){BF.type=e.target.value;renderScopeTab()}
 if(e.target.id==='bfUn'){BF.untagged=e.target.checked;renderScopeTab()}
 if(e.target.id==='bfBulk'&&e.target.value){const eid=e.target.value,all=ALL(),map=MAP();const rows=all.filter(r=>(!BF.type||r[0]===BF.type)&&(!BF.untagged||!map[r[2]])&&(!BF.q||(r[2]+r[3]).toLowerCase().includes(BF.q.toLowerCase())));
  rows.forEach(r=>{const t=Object.assign({},map[r[2]]||{});t.e=eid;map[r[2]]=t});logIt('SCOPE',`${rows.length} record(s) assigned to ${(ents().find(x=>x.id===eid)||{}).name}.`);toast(`${rows.length} record(s) assigned.`);commit()}
});

// demo structure so a trial can show scoping straight away
const hash=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))>>>0;return h};
actions['scope-demo']=()=>{
 if(G.me().role!=='Administrator'){toast('Only an administrator can do this.');return}
 if(!confirm('Add sample entities, units and sites and tag existing records to them?'))return;
 const o=O(),s=S(),nm=(o.profile.name||'Company').replace(/\s+(Ltd|Limited|Group|Inc)\.?$/i,'');
 const DEMO={bfsi:{e:[['Bank','Subsidiary'],['Securities','Subsidiary'],['Life Insurance','Subsidiary']],u:['Retail banking','Corporate banking','Treasury','Technology and operations','Compliance and risk'],s:[['Mumbai head office','Head office'],['Pune operations centre','Office'],['Chennai data centre','Data centre']]}};
 const D=DEMO[PROF]||{e:[['Operations','Subsidiary'],['Services','Subsidiary'],['International','Subsidiary']],u:['Operations','Finance','Technology','People and compliance','Commercial'],s:[['Head office','Head office'],['Regional office','Office'],['Data centre','Data centre']]};
 if(!o.entities.length){D.e.forEach((x,i)=>{const id=G.nextId('entity','ENT-',3);o.entities.push({id,name:`${nm} ${x[0]}`,type:x[1],country:o.profile.country,regNo:'',regulators:o.profile.regulators,owner:''})})}
 const E0=o.entities.slice(0,3);
 if(!o.units.length){D.u.forEach((n,i)=>{o.units.push({id:G.nextId('unit','BU-',3),name:n,entity:E0[i%E0.length].id,head:''})})}
 if(!o.sites.length){D.s.forEach((x,i)=>{o.sites.push({id:G.nextId('site','SITE-',3),name:x[0],type:x[1],entity:E0[i%E0.length].id,city:'',country:o.profile.country})})}
 const map=MAP();
 ALL().forEach(r=>{const h=hash(r[2]),u=o.units[h%o.units.length],si=o.sites.filter(x=>x.entity===u.entity)[0]||o.sites[0];map[r[2]]={e:u.entity,u:u.id,s:si.id}});
 logIt('SCOPE','Demo structure applied.');toast('Demo structure applied. Use the Scope selector in the top bar.');commit();
};
G.renderAll();
})();
