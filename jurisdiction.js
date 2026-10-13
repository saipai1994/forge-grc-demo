// Jurisdiction selector: tags every library framework with the countries it applies to, adds a country dropdown
// beside the industry dropdown and filters the built-in library (Standards & data hub) by it. Global standards always show.
(function(){
const G=window.GRC,LIB=window.GRC_LIB;if(!G||!LIB)return;
const E=G.E;
// ---------------------------------------------------------------- groups the user can choose
const GROUPS=[
 {id:'IN',label:'India',codes:['IN'],cur:'INR'},
 {id:'ANZ',label:'Australia & New Zealand',codes:['AU','NZ'],cur:'AUD',subs:[['AU','Australia','AUD'],['NZ','New Zealand','NZD']]},
 {id:'ME',label:'Middle East (UAE, Saudi Arabia, Qatar, Bahrain, Oman, Kuwait)',short:'Middle East',codes:['AE','SA','QA','BH','OM','KW'],cur:'AED',subs:[['AE','UAE','AED'],['SA','Saudi Arabia','SAR'],['QA','Qatar','QAR'],['BH','Bahrain','BHD'],['OM','Oman','OMR'],['KW','Kuwait','KWD']]},
 {id:'EU',label:'Europe (EU, UK, Switzerland)',short:'Europe',codes:['EU','UK','CH'],cur:'EUR',subs:[['EU','European Union','EUR'],['UK','United Kingdom','GBP'],['CH','Switzerland','CHF']]},
 {id:'PH',label:'Philippines',codes:['PH'],cur:'PHP'},
 {id:'US',label:'United States',codes:['US'],cur:'USD'},
 {id:'CA',label:'Canada',codes:['CA'],cur:'CAD'},
 {id:'ALL',label:'All jurisdictions',codes:null}];
const KEY='forgeGrcJur';
const read=()=>{let v='IN';try{v=localStorage.getItem(KEY)||'IN'}catch{}const [g,s]=v.split(':'),grp=GROUPS.find(x=>x.id===g)||GROUPS[0];return{group:grp,sub:grp.subs&&grp.subs.find(x=>x[0]===s)?s:''}};
let cur=read();

// ---------------------------------------------------------------- tag frameworks that have no explicit jurisdiction
const OVERRIDE={gdpr:['EU','GLOBAL'],nerc:['US','CA']};
function derive(f){
 if(OVERRIDE[f.id])return OVERRIDE[f.id];
 const r=(f.region||'').toLowerCase(),c=new Set();
 if(/india/.test(r))c.add('IN');
 if(/\beu\b|europe|eea/.test(r))c.add('EU');
 if(/united kingdom|\buk\b/.test(r))c.add('UK');
 if(/united states|california|\bus\b|us-listed|north america/.test(r))c.add('US');
 if(/canada|north america/.test(r))c.add('CA');
 if(/global|icao|maritime|mobile network/.test(r)||!c.size)c.add('GLOBAL');
 return[...c]}
LIB.frameworks.forEach(f=>{if(!Array.isArray(f.jur)||!f.jur.length)f.jur=derive(f)});

// ---------------------------------------------------------------- matching
const codes=()=>{if(!cur.group.codes)return null;return cur.sub?[cur.sub]:cur.group.codes};
const match=f=>{const c=codes();return !c||(f.jur||[]).some(j=>j==='GLOBAL'||c.includes(j))};
const label=()=>{if(!cur.group.codes)return 'All jurisdictions';const s=cur.sub&&cur.group.subs.find(x=>x[0]===cur.sub);return s?s[1]:(cur.group.short||cur.group.label)};
const names={IN:'India',AU:'Australia',NZ:'New Zealand',AE:'UAE',SA:'Saudi Arabia',QA:'Qatar',BH:'Bahrain',OM:'Oman',KW:'Kuwait',EU:'EU',UK:'UK',CH:'Switzerland',PH:'Philippines',US:'United States',CA:'Canada',GLOBAL:'Global'};
G.jur={groups:GROUPS,codes,match,label,names,
 state:()=>({group:cur.group.id,sub:cur.sub}),
 counts(){const all=LIB.frameworks,vis=all.filter(match);return{visible:vis.length,total:all.length,obl:vis.reduce((n,f)=>n+(f.obl||[]).length,0)}},
 set(group,sub,silent){const g=GROUPS.find(x=>x.id===group)||GROUPS[0];try{localStorage.setItem(KEY,g.id+(sub?':'+sub:''))}catch{}cur=read();
  const c=sub&&g.subs?(g.subs.find(x=>x[0]===sub)||[])[2]:g.cur;
  if(!silent){try{if(c&&G.org&&G.org().profile&&G.org().profile.currency!==c){G.org().profile.currency=c;G.logIt&&G.logIt('SETTINGS','Jurisdiction set to '+label()+'; reporting currency set to '+c+'.');G.commit&&G.commit()}}catch{}
   draw();G.renderAll();const n=G.jur.counts();G.toast&&G.toast(label()+': '+n.visible+' of '+n.total+' library frameworks shown (global standards included)'+(c?' · currency '+c:''))}}};

// ---------------------------------------------------------------- the dropdowns
function draw(){
 const top=document.querySelector('.top-actions');if(!top)return;
 let a=document.getElementById('jurSwitch'),b=document.getElementById('jurSub');
 if(!a){a=document.createElement('select');a.className='select';a.id='jurSwitch';a.title='Country or region: filters the regulatory library';a.style.maxWidth='210px';a.setAttribute('aria-label','Country or region');
  a.innerHTML=GROUPS.map(g=>`<option value="${g.id}">${E(g.id==='ALL'?'🌐 All jurisdictions':g.label)}</option>`).join('');
  a.addEventListener('change',()=>G.jur.set(a.value,''));
  b=document.createElement('select');b.className='select';b.id='jurSub';b.title='Country within the region';b.style.maxWidth='150px';b.setAttribute('aria-label','Country within region');
  b.addEventListener('change',()=>G.jur.set(a.value,b.value));
  const ps=document.getElementById('profileSwitch');if(ps)ps.after(a);else top.prepend(a);a.after(b)}
 a.value=cur.group.id;
 if(cur.group.subs){b.hidden=false;b.innerHTML=`<option value="">All in region</option>`+cur.group.subs.map(s=>`<option value="${s[0]}">${E(s[1])}</option>`).join('');b.value=cur.sub}else{b.hidden=true}}
draw();
// the top bar can be rebuilt by other modules: make sure the selector survives
new MutationObserver(()=>{if(!document.getElementById('jurSwitch'))draw()}).observe(document.body,{childList:true,subtree:false});
G.actions['jur-all']=()=>G.jur.set('ALL','');
})();
