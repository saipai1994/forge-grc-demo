// Builder kit for industry profiles: turns a compact spec into the profile object, risk register and seed records
// used by the app. All dates are offsets in days from the demo date so records stay consistent.
(function(){
const K=window.GRC_KIT={};
const TODAY0='2026-10-12';
K.PEOPLE=['Morgan Chen','Jordan Lee','Priya Shah','Evan Brooks','Sam Rivera'];
K.ini=n=>n.split(' ').map(s=>s[0]).join('');
K.addDays=(iso,n)=>new Date(Date.parse(iso+'T12:00:00Z')+n*864e5).toISOString().slice(0,10);
const off=n=>K.addDays(TODAY0,n);
K.off=off;
K.risk=a=>({id:a[0],name:a[1],area:a[2],inherent:a[3],rating:a[4],score:a[5],owner:a[6],initial:K.ini(a[6]),date:a[7],status:a[8]});
// same shape as the manufacturing seed
K.build=function(c){
 const ctl=c.controls.map(x=>({id:x[0],name:x[1],type:x[2],nature:x[3],freq:x[4],owner:x[5],area:x[6],risks:x[7],fw:x[8],lastTest:x[9],result:x[10],tester:x[11],exc:x[12]}));
 const tests=ctl.map((x,i)=>({id:'CT-'+(101+i),ctrl:x.id,date:x.lastTest,tester:x.tester,result:x.result,sample:x.freq==='Monthly'?12:x.freq==='Quarterly'?25:10,exc:x.exc,notes:x.exc?`${x.exc} exception(s) noted in sample.`:'No exceptions noted.'}));
 const assign=ctl.map((x,i)=>{const done=i<Math.ceil(ctl.length/2)-1;return{ctrl:x.id,owner:x.owner,status:i===ctl.length-3?'Exception':done?'Attested':'Pending',date:done||i===ctl.length-3?K.addDays('2026-10-01',i%11):'',comment:i===ctl.length-3?'Interim compensating review in place until the gap is fixed.':''}});
 const issue=(id,title,source,link,sv,owner,due,cause,status,actions,desc)=>({id,title,source,link,sev:sv,owner,due,created:K.addDays(due,-30),cause,status,desc:desc||'',verifiedBy:status==='Closed'?'Morgan Chen':null,actions:actions.map((a,i)=>({id:id+'-A'+(i+1),text:a[0],owner:a[1],due:a[2],done:!!a[3]}))});
 return{v:1,appetite:c.appetite||12,seq:{issue:110,action:100,test:101+ctl.length,loss:20,policy:20,vendor:20,camp:2},
  issues:c.issues.map(i=>issue(...i)),controls:ctl,tests,
  rcsa:[{id:'RCSA-2026-Q4',name:c.rcsaName||'Q4 2026 control self-assessment',due:'2026-10-30',launched:'2026-10-01',assign}],
  kris:c.kris.map(k=>({id:k[0],name:k[1],risk:k[2],owner:k[3],dir:k[4],amber:k[5],red:k[6],series:k[7],unit:k[8]})),
  losses:c.losses.map(l=>({id:l[0],date:l[1],title:l[2],cat:l[3],risk:l[4],gross:l[5],rec:l[6],status:l[7],reporter:l[8]})),
  policies:c.policies.map(p=>({id:p[0],title:p[1],type:p[2],ver:p[3],owner:p[4],status:p[5],review:p[6],aud:p[7],att:p[8],fw:p[9],ctrls:p[10],attBy:[]})),
  vendors:c.vendors.map(v=>({id:v[0],name:v[1],cat:v[2],tier:v[3],owner:v[4],single:v[5],risks:v[6],contractEnd:v[7],last:v[8],score:v[9],inherent:v[10],hist:[{date:v[8],score:v[9],by:'Morgan Chen'}]})),
  log:[]};
};
const pad=(n,w=2)=>String(n).padStart(w,'0');
const RATING=s=>s>=20?'Critical':s>=15?'High':s>=8?'Medium':'Low';
// spec -> profile
K.fromSpec=function(s){
 const P=K.PEOPLE,rid=i=>'R-'+(s.base+i+1);
 const risks=s.risks.map((r,i)=>K.risk([rid(i),r[0],s.areas[r[1]],r[2],r[3]||RATING(r[4]),r[4],P[r[5]],r[6],r[7]]));
 const cid=i=>(s.cp||'C')+'-'+pad(i+1),kid=i=>'KRI-'+pad(i+1);
 const linkOf=l=>/^c\d+$/.test(l)?cid(+l.slice(1)):/^k\d+$/.test(l)?kid(+l.slice(1)):/^r\d+$/.test(l)?rid(+l.slice(1)):l;
 const prof={id:s.id,label:s.label,org:s.org,site:s.site,loc:s.loc,orgWord:s.orgWord||'organisation',pack:s.pack,noun:s.noun||'Customer',
  subtitle:{risks:s.subtitle||`Identify, assess and treat risks across ${s.areas.slice(0,4).join(', ').toLowerCase()} and related domains.`},
  modules:s.modules,owners:s.owners||{GOV:P[0],RISK:P[0],TPR:P[3],INC:P[4],RES:P[1],TEST:P[2],PRIV:P[2],SEC:P[4],DISC:P[0],CONDUCT:P[0],FC:P[2],AI:P[4],SAFETY:P[1],SUPPLY:P[3]},
  adopt:s.adopt,risks,frameworks:s.frameworks,findings:s.findings,evidenceTypes:s.evidenceTypes,evidence:s.evidence,
  templates:risks.map((r,i)=>({id:'tpl-'+s.id+'-'+i,title:r.name,area:r.area,likelihood:Math.max(1,Math.round(Math.sqrt(r.score))),impact:Math.max(1,Math.ceil(r.score/Math.max(1,Math.round(Math.sqrt(r.score))))),owner:r.owner,practice:'',standards:['ISO 31000'],description:`${r.name} could affect ${r.area.toLowerCase()} objectives, compliance or service delivery. Confirm the causes, consequences and existing controls for your context.`})),
  dash:{eff:'Control effectiveness',comp:'Compliance obligations met',insights:s.insights,prompts:s.prompts},
  registers:s.registers||[],sectorLabel:s.sectorLabel||'Sector operations',extras:s.extras||{}};
 prof.seed=()=>{
  const ctrl=s.controls.map((c,i)=>[cid(i),c[0],c[2],c[3],c[4],P[c[5]],s.areas[s.risks[c[1]][1]],[rid(c[1]),...(c[10]||[]).map(rid)],c[9],off(c[7]),c[6],P[(c[5]+2)%5],c[8]]);
  return K.build({appetite:s.appetite,rcsaName:s.rcsaName,controls:ctrl,
   issues:s.issues.map((x,i)=>['ISS-'+(101+i),x[0],x[1],linkOf(x[2]),x[3],P[x[4]],off(x[5]),x[6],x[7],x[8].map(a=>[a[0],P[a[1]],off(a[2]),a[3]]),x[9]||'']),
   kris:s.kris.map((k,i)=>[kid(i),k[0],rid(k[1]),P[k[2]],'higher',k[3],k[4],k[5],k[6]||'']),
   losses:s.losses.map((l,i)=>['LE-'+pad(i+1,3),off(-l[0]),l[1],l[2],rid(l[3]),l[4],l[5],l[6],P[l[7]]]),
   policies:s.policies.map((p,i)=>['POL-'+pad(i+1,3),p[0],p[1],p[8]||'1.0',P[p[2]],p[3],off(p[4]),p[5],p[6],p[7],(p[9]||[]).map(cid)]),
   vendors:s.vendors.map((v,i)=>['V-'+pad(i+1,3),v[0],v[1],v[2],P[v[8]],v[3],v[4].map(rid),off(v[5]),off(v[6]),v[7],v[9]||'Medium'])})};
 return prof};
})();
