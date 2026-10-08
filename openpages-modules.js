// Enterprise GRC modules inspired by IBM OpenPages: issues & action plans, controls & testing (RCSA),
// KRIs / loss events / heatmap, policy management, and third-party risk. Demo data only; runs in the
// same scope as library-enhancements.js (see the loader at the end of index.html).
(function(){
const KEY='forgeGrcOpenPagesV1',TODAY='2026-10-12';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const pad=n=>String(n).padStart(2,'0'),MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmt=iso=>{if(!iso)return '—';const [y,m,d]=iso.split('-');return `${MON[+m-1]} ${pad(+d)}, ${y}`};
const dayN=iso=>Math.round(Date.parse(iso+'T12:00:00Z')/864e5);
const addDays=(iso,n)=>{const d=new Date((dayN(iso)+n)*864e5);return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`};
const inr=n=>'₹'+Number(n||0).toLocaleString('en-IN');
const me=()=>currentDemoUser(),people=()=>workflowUsers.map(u=>u.name);
const isAdmin=()=>me().role==='Administrator',canAct=owner=>isAdmin()||me().name===owner;
const ini=n=>String(n).split(' ').map(s=>s[0]).join('');
const own=n=>`<span class="owner"><span class="ownerav">${E(ini(n))}</span>${E(n)}</span>`;
const pill=(t,k)=>`<span class="badgepill pill-${k}">${E(t)}</span>`;
const sevK=s=>s==='Critical'||s==='High'?'red':s==='Medium'?'amber':'green';
const stK={Open:'blue','In remediation':'amber','Pending verification':'blue',Closed:'green',Overdue:'red'};
const resK={Effective:'green','Partially effective':'amber',Ineffective:'red','Not tested':'blue'};
const ragK={Green:'green',Amber:'amber',Red:'red'};
const polK={Draft:'blue','In review':'amber',Approved:'blue',Published:'green','Review overdue':'red'};
const sev=s=>pill(s,sevK(s));

// ---------- seed data ----------
const FREQ={Monthly:30,Quarterly:91,'Semi-annual':182,Annual:365};
function seed(){
 const ctl=[
  ['MA-07','Compressor preventive maintenance & pressure log review','Preventive','Manual','Monthly','Jordan Lee','Production',['R-014'],['ISO 9001'],'2026-09-18','Partially effective','Morgan Chen',2],
  ['MA-11','Air-pressure deviation alarm & escalation','Detective','Automated','Quarterly','Jordan Lee','Production',['R-014'],['ISO 9001'],'2026-08-20','Effective','Sam Rivera',0],
  ['EN-04','Wastewater discharge sampling against permit limits','Detective','Manual','Monthly','Priya Shah','Environment',['R-021'],['ISO 14001'],'2026-09-30','Effective','Morgan Chen',0],
  ['EN-07','ETP bypass lock-out and weekly inspection','Preventive','Manual','Monthly','Priya Shah','Environment',['R-021'],['ISO 14001'],'2026-07-25','Ineffective','Jordan Lee',3],
  ['SC-05','Critical-supplier continuity & safety-stock review','Preventive','Manual','Semi-annual','Evan Brooks','Supply chain',['R-008'],['ISO 9001'],'2026-04-10','Partially effective','Morgan Chen',1],
  ['OT-09','Quarterly PLC / HMI privileged access review','Detective','Manual','Quarterly','Sam Rivera','Cybersecurity',['R-019'],['NIST CSF'],'2026-06-29','Effective','Morgan Chen',0],
  ['OT-14','OT network segmentation & firewall rule review','Preventive','Manual','Semi-annual','Sam Rivera','Cybersecurity',['R-019'],['NIST CSF'],'2026-05-15','Partially effective','Jordan Lee',2],
  ['OT-15','Vendor remote access via MFA jump host','Preventive','Automated','Quarterly','Sam Rivera','Cybersecurity',['R-027'],['NIST CSF'],'2026-09-05','Effective','Priya Shah',0],
  ['OH-12','Operator safety induction with signed acknowledgement','Preventive','Manual','Quarterly','Morgan Chen','Production',['R-006'],['ISO 45001'],'2026-09-12','Partially effective','Priya Shah',2],
  ['OH-15','Forklift pedestrian zoning & traffic management plan','Preventive','Manual','Quarterly','Morgan Chen','Production',['R-006'],['ISO 45001'],'2026-07-08','Ineffective','Priya Shah',4],
  ['OH-18','Forklift operator certification & refresher','Preventive','Manual','Annual','Evan Brooks','Production',['R-006','R-033'],['ISO 45001'],'2026-09-22','Effective','Morgan Chen',0],
  ['OH-20','Night-shift heat stress protocol & hydration breaks','Preventive','Manual','Quarterly','Evan Brooks','Production',['R-011'],['ISO 45001'],'2026-08-28','Effective','Priya Shah',0],
  ['EN-11','Emergency spill drill & kit inspection','Corrective','Manual','Semi-annual','Priya Shah','Environment',['R-025'],['ISO 14001'],'2026-02-18','Effective','Morgan Chen',0],
  ['EN-12','Chemical storage segregation inspection','Preventive','Manual','Monthly','Priya Shah','Environment',['R-025'],['ISO 14001'],'2026-10-01','Effective','Jordan Lee',0],
  ['QA-03','Gauge calibration schedule & out-of-tolerance review','Detective','Manual','Quarterly','Jordan Lee','Quality',['R-003'],['ISO 9001'],'2026-07-30','Partially effective','Morgan Chen',1]
 ].map(c=>({id:c[0],name:c[1],type:c[2],nature:c[3],freq:c[4],owner:c[5],area:c[6],risks:c[7],fw:c[8],lastTest:c[9],result:c[10],tester:c[11],exc:c[12]}));
 const tests=ctl.map((c,i)=>({id:'CT-'+(101+i),ctrl:c.id,date:c.lastTest,tester:c.tester,result:c.result,sample:c.freq==='Monthly'?12:c.freq==='Quarterly'?25:10,exc:c.exc,notes:c.exc?`${c.exc} exception(s) noted in sample.`:'No exceptions noted.'}));
 const rcsaAssign=ctl.map((c,i)=>{const done=i<6;return{ctrl:c.id,owner:c.owner,status:i===9?'Exception':done?'Attested':'Pending',date:i===9||done?addDays('2026-10-01',i):'',comment:i===9?'Pedestrian barriers incomplete in Bay 4; interim marshal in place.':''}});
 const issue=(id,title,source,link,sv,owner,due,cause,status,actions,desc)=>({id,title,source,link,sev:sv,owner,due,created:addDays(due,-30),cause,status,desc:desc||'',verifiedBy:status==='Closed'?'Morgan Chen':null,actions:actions.map((a,i)=>({id:id+'-A'+(i+1),text:a[0],owner:a[1],due:a[2],done:!!a[3]}))});
 return{v:1,appetite:12,seq:{issue:110,action:100,test:116,loss:9,policy:9,vendor:9,camp:2},
  issues:[
   issue('ISS-101','Machine guarding inspection gaps','Audit finding','F-042','High','Jordan Lee','2026-10-09','Process / procedure','In remediation',[['Fit interlocked guards on presses 4 and 5','Jordan Lee','2026-10-05',true],['Update daily guarding inspection checklist','Jordan Lee','2026-10-12',false],['Retrain operators on guarding rules','Morgan Chen','2026-10-20',false]],'Guarding on two presses was found missing or bypassed during the ISO 45001 internal audit.'),
   issue('ISS-102','Waste manifest reconciliation incomplete','Audit finding','F-039','Medium','Priya Shah','2026-10-14','Documentation','In remediation',[['Reconcile Q3 hazardous waste manifests','Priya Shah','2026-10-10',true],['Introduce monthly manifest reconciliation check','Priya Shah','2026-10-14',false]]),
   issue('ISS-103','PLC access recertification overdue','Audit finding','F-034','High','Sam Rivera','2026-10-25','Access management','Open',[['Run privileged access recertification for PLC/HMI accounts','Sam Rivera','2026-10-20',false]]),
   issue('ISS-104','Wastewater ETP bypass lock-out not effective','Control test','CT-104','High','Priya Shah','2026-10-02','Control design','In remediation',[['Replace padlock scheme with keyed interlock','Priya Shah','2026-10-15',false],['Add weekly bypass-valve photo evidence','Priya Shah','2026-10-08',true]],'Control test found 3 of 12 weekly inspections missing and one unlocked bypass valve.'),
   issue('ISS-105','Forklift pedestrian zoning ineffective in Bay 4','Control test','CT-110','High','Morgan Chen','2026-10-31','Control design','Open',[['Install physical barriers and mirrors in Bay 4','Evan Brooks','2026-10-28',false]]),
   issue('ISS-106','Supplier continuity evidence missing','Audit finding','F-037','Medium','Evan Brooks','2026-10-20','Documentation','In remediation',[['Collect continuity plans from top 5 suppliers','Evan Brooks','2026-10-18',false]]),
   issue('ISS-107','OT unpatched assets above KRI threshold','KRI breach','KRI-06','High','Sam Rivera','2026-11-06','Resourcing / capacity','Open',[['Agree patch window with production planning','Sam Rivera','2026-10-22',false],['Patch critical-severity OT assets','Sam Rivera','2026-11-05',false]]),
   issue('ISS-108','Calibration record retention gap','Audit finding','F-029','Medium','Jordan Lee','2026-11-02','Documentation','Pending verification',[['Digitise calibration certificates for 2024-26','Jordan Lee','2026-10-06',true]]),
   issue('ISS-109','PPE refresher records incomplete','Audit finding','F-031','Low','Morgan Chen','2026-09-30','Training','Closed',[['Refresh PPE training and record signatures','Morgan Chen','2026-09-25',true]])
  ],
  controls:ctl,tests,
  rcsa:[{id:'RCSA-2026-Q4',name:'Q4 2026 plant control self-assessment',due:'2026-10-30',launched:'2026-10-01',assign:rcsaAssign}],
  kris:[
   ['KRI-01','Unplanned downtime (hours / month)','R-014','Jordan Lee','higher',12,20,[8,9,11,14,16,19],''],
   ['KRI-02','Compressed-air pressure variance (%)','R-014','Jordan Lee','higher',10,15,[6,8,11,13,16,18],'%'],
   ['KRI-03','Overdue preventive-maintenance work orders','R-014','Jordan Lee','higher',5,10,[2,3,4,6,7,9],''],
   ['KRI-04','Wastewater parameter exceedances (count)','R-021','Priya Shah','higher',1,3,[0,0,1,1,2,2],''],
   ['KRI-05','Single-source spend share (%)','R-008','Evan Brooks','higher',40,60,[48,50,52,55,55,58],'%'],
   ['KRI-06','Unpatched OT assets (%)','R-019','Sam Rivera','higher',15,25,[12,14,18,21,24,27],'%'],
   ['KRI-07','Lost-time injury frequency rate','R-006','Morgan Chen','higher',1,2,[0.4,0.5,0.4,0.7,0.6,0.8],''],
   ['KRI-08','Overdue-calibration instruments (%)','R-003','Jordan Lee','higher',5,10,[2,3,3,4,4,3],'%'],
   ['KRI-09','Operator certifications expiring in 30 days (%)','R-033','Jordan Lee','higher',8,15,[4,5,6,5,7,6],'%']
  ].map(k=>({id:k[0],name:k[1],risk:k[2],owner:k[3],dir:k[4],amber:k[5],red:k[6],series:k[7],unit:k[8]})),
  losses:[
   ['LE-001','2026-08-14','Line 3 compressor trip — 6 h stoppage','Equipment failure','R-014',420000,0,'Closed','Jordan Lee'],
   ['LE-002','2026-07-03','Bearing lot rejected; line starved for two shifts','Supply disruption','R-008',310000,120000,'Closed','Evan Brooks'],
   ['LE-003','2026-09-09','Forklift–pedestrian near miss, Bay 2','Near miss','R-006',0,0,'Under investigation','Morgan Chen'],
   ['LE-004','2026-06-21','Effluent pH exceedance — sample failed','Environmental release','R-021',85000,0,'Closed','Priya Shah'],
   ['LE-005','2026-09-27','Contractor HMI session left open','Cyber / OT','R-019',45000,0,'Closed','Sam Rivera'],
   ['LE-006','2026-05-30','Line 2 sensor drift — batch rework','Quality escape','R-003',260000,60000,'Closed','Jordan Lee'],
   ['LE-007','2026-04-18','Heat-related illness, night shift (first aid)','Safety incident','R-011',38000,0,'Closed','Evan Brooks'],
   ['LE-008','2026-10-04','Hydraulic leak near stores — minor spill','Environmental release','R-025',56000,0,'Under investigation','Priya Shah']
  ].map(l=>({id:l[0],date:l[1],title:l[2],cat:l[3],risk:l[4],gross:l[5],rec:l[6],status:l[7],reporter:l[8]})),
  policies:[
   ['POL-001','Integrated EHS Policy','Policy','3.2','Priya Shah','Published','2027-03-01',412,389,['ISO 45001','ISO 14001'],['OH-12','OH-20','EN-04']],
   ['POL-002','Information Security & OT Access Policy','Policy','2.1','Sam Rivera','Published','2027-01-15',64,52,['NIST CSF'],['OT-09','OT-15']],
   ['POL-003','Supplier Code of Conduct','Policy','1.4','Evan Brooks','In review','2026-12-01',38,0,['ISO 37301'],['SC-05']],
   ['POL-004','Quality Policy','Policy','4.0','Jordan Lee','Published','2027-05-30',412,401,['ISO 9001'],['QA-03','MA-07']],
   ['POL-005','Chemical Handling SOP','SOP','4.0','Priya Shah','Published','2026-09-30',96,71,['ISO 14001','ISO 45001'],['EN-11','EN-12']],
   ['POL-006','Permit-to-Work Procedure','Procedure','2.0','Jordan Lee','Draft','2026-12-15',120,0,['ISO 45001'],['OH-15']],
   ['POL-007','Anti-Bribery & Corruption Policy','Policy','1.2','Morgan Chen','Published','2027-02-10',412,340,['ISO 37301'],[]],
   ['POL-008','Business Continuity Plan','Plan','1.0','Evan Brooks','Approved','2027-06-01',45,0,['ISO 22301'],['SC-05']]
  ].map(p=>({id:p[0],title:p[1],type:p[2],ver:p[3],owner:p[4],status:p[5],review:p[6],aud:p[7],att:p[8],fw:p[9],ctrls:p[10],attBy:[]})),
  vendors:[
   ['V-001','Precision Bearings Pvt Ltd','Raw material · bearings',1,'Evan Brooks',true,['R-008'],'2027-03-31','2026-03-14',64,'High'],
   ['V-002','Western Logistics & Freight','Logistics · inbound freight',2,'Evan Brooks',false,[],'2027-08-31','2026-05-20',82,'Medium'],
   ['V-003','ControlLink OT Services','IT / OT · remote maintenance',1,'Sam Rivera',false,['R-027'],'2027-01-31','2026-06-02',58,'High'],
   ['V-004','SafeChem Industrial Supplies','Chemicals · bulk supply',1,'Priya Shah',false,['R-025'],'2027-06-30','2026-04-25',76,'Medium'],
   ['V-005','GreenCycle Waste Handlers','Hazardous waste disposal',2,'Priya Shah',false,['R-021'],'2026-12-31','2026-02-11',69,'High'],
   ['V-006','Apex Packaging Co','Packaging materials',3,'Evan Brooks',false,['R-002'],'2027-09-30','2026-01-20',91,'Low'],
   ['V-007','Shramik Contract Labour Services','Contract labour',2,'Jordan Lee',false,['R-033'],'2027-02-28','2026-07-15',73,'Medium'],
   ['V-008','CalibTech Metrology Labs','Calibration services',3,'Jordan Lee',false,['R-003'],'2027-04-30','2025-06-10',88,'Low']
  ].map(v=>({id:v[0],name:v[1],cat:v[2],tier:v[3],owner:v[4],single:v[5],risks:v[6],contractEnd:v[7],last:v[8],score:v[9],inherent:v[10],hist:[{date:v[8],score:v[9],by:'Morgan Chen'}]})),
  log:[]};
}
let S;try{const raw=localStorage.getItem(KEY);S=raw?JSON.parse(raw):null}catch{S=null}
if(!S||S.v!==1)S=seed();
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch{}};
const UI={tab:{},drawer:null,filters:{},heat:'residual'};
function logIt(ref,txt){S.log.unshift({t:TODAY,who:me().name,ref,txt});S.log.length=Math.min(S.log.length,300)}
const nextId=(k,prefix,w)=>prefix+String(S.seq[k]++).padStart(w,'0');
const ratingOf=sc=>sc>=85?'Low':sc>=70?'Medium':sc>=50?'High':'Critical';

// ---------- derived helpers ----------
const isOverdue=i=>i.status!=='Closed'&&i.due<TODAY;
const escLevel=i=>{if(!isOverdue(i))return 0;const d=dayN(TODAY)-dayN(i.due);return d>14?3:d>7?2:1};
const ESC=['—','L1 · Owner’s manager','L2 · Function head','L3 · Plant head'];
const ctrlNext=c=>addDays(c.lastTest,FREQ[c.freq]||91);
const ctrlDue=c=>ctrlNext(c)<TODAY;
function kriStatus(k,v=k.series[k.series.length-1]){return v>=k.red?'Red':v>=k.amber?'Amber':'Green'}
function riskControls(rid){return S.controls.filter(c=>c.risks.includes(rid))}
function riskCoverage(rid){const cs=riskControls(rid);if(!cs.length)return 'No control';if(cs.some(c=>c.result==='Ineffective'))return 'Weak';if(cs.every(c=>c.result==='Effective'))return 'Strong';return 'Partial'}
const covK={'No control':'red',Weak:'red',Partial:'amber',Strong:'green'};
const polNext=p=>p.review,polOverdue=p=>p.status==='Published'&&p.review<TODAY;
const polStatus=p=>polOverdue(p)?'Review overdue':p.status;
const attCount=p=>p.att+p.attBy.length,attPct=p=>p.aud?Math.round(attCount(p)/p.aud*100):0;
const vNext=v=>{const m={1:12,2:18,3:24}[v.tier];const d=new Date(v.last+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+m);return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`};
const vRating=v=>ratingOf(v.score),vDue=v=>vNext(v)<TODAY;
const PAIRS={25:[5,5],20:[5,4],16:[4,4],15:[5,3],12:[4,3],10:[5,2],9:[3,3],8:[4,2],6:[3,2],5:[5,1],4:[2,2],3:[3,1],2:[2,1],1:[1,1]};
function li(score){if(PAIRS[score])return PAIRS[score];let b=[3,3],bd=99;for(let l=1;l<=5;l++)for(let i=1;i<=5;i++){const d=Math.abs(l*i-score);if(d<bd){bd=d;b=[l,i]}}return b}
function riskLI(r,mode){let[l,i]=li(r.score);if(mode==='inherent'){const rk={Low:1,Medium:2,High:3,Critical:4},diff=Math.max(0,(rk[r.inherent]||0)-(rk[r.rating]||0));for(let k=0;k<diff;k++){if(l<=i&&l<5)l++;else if(i<5)i++;else if(l<5)l++}}return[l,i]}
const heatCol=s=>s>=20?'#f3b8b3':s>=12?'#f7d2a8':s>=6?'#fbe8b8':'#cfe9df';

// ---------- record creation ----------
function createIssue(o){const id=nextId('issue','ISS-',3);const i={id,title:o.title,source:o.source,link:o.link||'',sev:o.sev,owner:o.owner,due:o.due,created:TODAY,cause:o.cause||'To be determined',status:'Open',desc:o.desc||'',verifiedBy:null,actions:[]};S.issues.unshift(i);logIt(id,`Issue raised from ${o.source}${o.link?' '+o.link:''} (${o.sev}).`);return i}
const openIssueFor=(source,link)=>S.issues.find(i=>i.source===source&&i.link===link&&i.status!=='Closed');
function raise(source,link,title,sv,owner,desc,cause){const ex=openIssueFor(source,link);if(ex){toast(`${ex.id} is already open for ${link}.`);return ex}const i=createIssue({title,source,link,sev:sv,owner,due:addDays(TODAY,sv==='Critical'?14:sv==='High'?21:45),desc,cause});save();renderAll();toast(`${i.id} raised: ${title}`);return i}

// ---------- DOM scaffolding ----------
const css=document.createElement('style');css.textContent=`
.op-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-bottom:14px}.op-kpi{padding:14px 16px}.op-kpi .l{font-size:10px;font-weight:600;color:#778293}.op-kpi .v{font:700 24px Manrope;letter-spacing:-.8px;margin-top:6px}.op-kpi .f{font-size:9px;color:#8a95a3;margin-top:2px}.op-kpi.warn .v{color:#bf554d}.op-kpi.ok .v{color:#178b78}
.op-bar{height:7px;background:#f0f2f5;border-radius:5px;overflow:hidden;min-width:70px}.op-bar i{display:block;height:100%;background:#178b78;border-radius:5px}.op-bar.amber i{background:#d48a24}.op-bar.red i{background:#cb554d}
.op-panel{display:none}.op-panel.show{display:block}.op-two{display:grid;grid-template-columns:1.25fr .75fr;gap:14px;margin-bottom:14px}
.op-heat{display:grid;grid-template-columns:22px repeat(5,1fr);gap:4px}.op-cell{min-height:62px;border-radius:6px;padding:5px;display:flex;flex-wrap:wrap;gap:3px;align-content:flex-start;cursor:pointer;border:2px solid transparent;position:relative}.op-cell:hover{box-shadow:0 3px 12px #22334a22}.op-cell.out{border-color:#cb554d}.op-cell small{position:absolute;right:5px;bottom:3px;font:8px 'DM Mono';color:#00000044}.op-chip{font:500 8px 'DM Mono';background:#fffffff0;color:#38485c;border-radius:4px;padding:2px 4px;box-shadow:0 1px 2px #0002}.op-axis{font:9px 'DM Mono';color:#8a95a3;display:grid;place-items:center}.op-legend{display:flex;gap:12px;flex-wrap:wrap;font-size:9px;color:#778393;margin-top:10px}.op-legend i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:4px;vertical-align:-1px}
.op-li{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid #f0f2f4;font-size:10px}.op-li:last-child{border-bottom:0}
.op-spark{display:block}.op-steps{display:flex;gap:4px;margin:6px 0 14px}.op-steps div{flex:1;text-align:center;font:500 8px 'DM Mono';padding:7px 3px;border-radius:5px;background:#f3f5f7;color:#8a95a3}.op-steps div.done{background:#e7f4f1;color:#247763}.op-steps div.cur{background:#19283b;color:#fff}
.op-actrow{display:grid;grid-template-columns:20px 1fr auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #f0f2f4;font-size:10px}.op-actrow:last-child{border-bottom:0}.op-actrow input{accent-color:#178b78}.op-actrow .m{font-size:9px;color:#8a95a3;margin-top:2px}.op-actrow.done .t{text-decoration:line-through;color:#98a2ae}
.op-btns{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.op-mini{border:1px solid #dde2e8;background:#fff;color:#425065;border-radius:6px;padding:6px 9px;font-size:10px;font-weight:600}.op-mini:hover{background:#f8fafb;border-color:#aeb8c5}.op-mini.p{background:#19283b;border-color:#19283b;color:#fff}.op-mini.g{color:#187766;border-color:#cce4dd;background:#f1faf7}.op-mini.r{color:#ad4b45;border-color:#f0cbc8;background:#fdf3f2}
.op-form{display:grid;grid-template-columns:1fr 1fr;gap:0 12px}.op-form .field{margin-bottom:12px}.op-form .full{grid-column:1/-1}
.op-hist{font-size:9px;color:#6b7888;line-height:1.7;border-left:2px solid #e8ebef;padding-left:10px;margin:6px 0}.op-hist b{color:#34475c;font-weight:600}
.op-tile{padding:14px 16px;cursor:pointer}.op-tile .l{font-size:10px;font-weight:600;color:#778293}.op-tile .v{font:700 24px Manrope;letter-spacing:-.8px;margin-top:6px}.op-tile .f{font-size:9px;margin-top:2px;color:#8a95a3}.op-tile .v.red{color:#bf554d}.op-tile .v.amber{color:#c2791a}
.op-note{font-size:9px;color:#8a95a3;line-height:1.55;margin-top:8px}.op-bars .barrow{grid-template-columns:130px 1fr 60px}
@media(max-width:1100px){.op-kpis{grid-template-columns:repeat(2,1fr)}.op-two{grid-template-columns:1fr}}@media(max-width:600px){.op-form{grid-template-columns:1fr}}`;
document.head.appendChild(css);

const MODS=[
 {id:'issues',label:'Issues & actions',ico:'⚑',title:'Issues &amp; action plans',sub:'One register for issues from audits, control tests, KRI breaches, loss events and assessments, with action plans, escalation and independent closure.',tabs:[['register','Issue register'],['log','Activity log']]},
 {id:'controls',label:'Controls & testing',ico:'⛨',title:'Controls, testing &amp; RCSA',sub:'Control library mapped to risks and frameworks, test plans and results, and risk &amp; control self-assessment campaigns.',tabs:[['library','Control library'],['matrix','Risk–control matrix'],['tests','Control tests'],['rcsa','RCSA campaigns']]},
 {id:'kris',label:'KRIs & loss events',ico:'◬',title:'Key risk indicators, loss events &amp; heatmap',sub:'Inherent vs residual heatmap against risk appetite, early-warning indicators with thresholds, and a loss and near-miss event database.',tabs:[['heat','Heatmap & appetite'],['kri','Key risk indicators'],['loss','Loss events']]},
 {id:'policies',label:'Policies',ico:'☰',title:'Policy &amp; procedure management',sub:'Lifecycle from draft to published, version history, review dates, and employee attestation.',tabs:[['library','Policy library']]},
 {id:'vendors',label:'Third parties',ico:'⇄',title:'Third-party risk',sub:'Vendor inventory with criticality tiers, due-diligence questionnaires, risk scoring, and reassessment tracking.',tabs:[['register','Vendor register']]}
];
MODS.forEach(m=>{views.push(m.id);labels[m.id]=m.label});
const navLabels=$$('.sidebar .navlabel'),intel=navLabels.find(n=>/INTELLIGENCE/i.test(n.textContent));
const gLabel=document.createElement('div');gLabel.className='navlabel';gLabel.style.marginTop='22px';gLabel.textContent='GOVERNANCE & ASSURANCE';
const gNav=document.createElement('nav');gNav.className='nav';
gNav.innerHTML=MODS.map(m=>`<button data-view="${m.id}"><span class="ico">${m.ico}</span><span class="navtext">${E(m.label)}</span><span class="badge" id="opBadge-${m.id}" style="display:none"></span></button>`).join('');
if(intel){intel.parentNode.insertBefore(gLabel,intel);intel.parentNode.insertBefore(gNav,intel)}else{$('.sidebar').insertBefore(gNav,$('.side-bottom'))}
const host=$('.content');
MODS.forEach(m=>{const s=document.createElement('section');s.className='view';s.id='view-'+m.id;
 s.innerHTML=`<div class="pagehead"><div><h1 class="title">${m.title}</h1><div class="subtitle">${m.sub}</div></div><div class="head-actions" id="opHead-${m.id}"></div></div>`+(m.tabs.length>1?`<div class="libtabs" id="opTabs-${m.id}">${m.tabs.map((t,i)=>`<button class="libtab${i?'':' active'}" data-op="tab" data-view="${m.id}" data-tab="${t[0]}">${E(t[1])}</button>`).join('')}</div>`:'')+m.tabs.map((t,i)=>`<div class="op-panel${i?'':' show'}" data-panel="${m.id}:${t[0]}"></div>`).join('');
 host.appendChild(s);UI.tab[m.id]=m.tabs[0][0]});
gNav.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{go(b.dataset.view);renderAll()}));
// drawer + form modal (reuse the app's modal styling)
const drawer=document.createElement('div');drawer.className='detailback';drawer.id='opDrawer';drawer.innerHTML='<div class="detailmodal" role="dialog" aria-modal="true"><div class="detailhead"><div><div class="detailkicker" id="opDK"></div><h2 id="opDT"></h2></div><button class="close" data-op="drawer-close" aria-label="Close">×</button></div><div class="detailbody" id="opDB"></div><div class="detailfooter"><button class="detailclose" data-op="drawer-close">Close</button></div></div>';document.body.appendChild(drawer);
const fm=document.createElement('div');fm.className='modalback';fm.id='opForm';fm.style.zIndex=30;fm.innerHTML='<div class="modal" style="width:min(620px,100%);max-height:90vh;overflow:auto"><div class="modalhead"><h3 id="opFT"></h3><button class="close" data-op="form-close">×</button></div><div class="modalbody"><div class="op-form" id="opFB"></div></div><div class="modalfoot"><button class="btn" data-op="form-close">Cancel</button><button class="btn primary" id="opFS" data-op="form-submit">Save</button></div></div>';document.body.appendChild(fm);
function openDrawer(type,id){UI.drawer={type,id};renderDrawer();drawer.classList.add('show')}
function closeDrawer(){UI.drawer=null;drawer.classList.remove('show')}
function setDrawer(kicker,title,html){$('#opDK').textContent=kicker;$('#opDT').textContent=title;$('#opDB').innerHTML=html}
function openForm(title,fields,label,onSubmit){$('#opFT').textContent=title;$('#opFS').textContent=label;
 $('#opFB').innerHTML=fields.map(f=>{const cls='field'+(f.full||f.type==='textarea'?' full':'');let c;const v=f.value??'';
  if(f.type==='select')c=`<select name="${f.name}">${f.options.map(o=>{const ov=Array.isArray(o)?o[0]:o,ol=Array.isArray(o)?o[1]:o;return `<option value="${E(ov)}"${String(ov)===String(v)?' selected':''}>${E(ol)}</option>`}).join('')}</select>`;
  else if(f.type==='textarea')c=`<textarea name="${f.name}" placeholder="${E(f.ph||'')}">${E(v)}</textarea>`;
  else c=`<input name="${f.name}" type="${f.type||'text'}" value="${E(v)}" placeholder="${E(f.ph||'')}"${f.step?` step="${f.step}"`:''}>`;
  return `<div class="${cls}"><label>${E(f.label)}</label>${c}</div>`}).join('');
 UI.submit=onSubmit;fm.classList.add('show');const first=$('#opFB input,#opFB select,#opFB textarea');if(first)first.focus()}
function closeForm(){fm.classList.remove('show');UI.submit=null}
function submitForm(){const v={};$$('#opFB [name]').forEach(el=>v[el.name]=el.value.trim());const r=UI.submit&&UI.submit(v);if(typeof r==='string'){toast(r);return}closeForm()}
const personOpts=()=>people().map(n=>[n,n]);
const riskOpts=(blank)=>[...(blank?[['','— none —']]:[]),...risks.map(r=>[r.id,`${r.id} · ${r.name}`])];

// ---------- table helper ----------
function table(head,rows,empty){return `<div class="tablewrap"><table><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.join(''):`<tr><td colspan="${head.length}" style="text-align:center;color:#8a95a3;padding:22px;cursor:default">${E(empty||'No records match the current filters.')}</td></tr>`}</tbody></table></div>`}
const card=(title,meta,inner,actions)=>`<article class="card tablepanel" style="margin-bottom:14px"><div class="tablehead"><div><div class="tabletitle">${title}</div>${meta?`<div class="tablemeta">${meta}</div>`:''}</div><div>${actions||''}</div></div>${inner}</article>`;
const kpi=(l,v,f,k)=>`<div class="card op-kpi ${k||''}"><div class="l">${l}</div><div class="v">${v}</div><div class="f">${f||''}</div></div>`;
const bar=(pct,k)=>`<div class="op-bar ${k||''}"><i style="width:${Math.max(0,Math.min(100,pct))}%"></i></div>`;
function toolbar(view,key,searchPh,selects){const f=UI.filters[view+key]||{};return `<div class="toolbar"><input class="search" data-op="filter" data-fk="${view}${key}" data-f="q" placeholder="${E(searchPh)}" value="${E(f.q||'')}">${selects.map(s=>`<select class="select" data-op="filter" data-fk="${view}${key}" data-f="${s[0]}">${s[1].map(o=>`<option value="${E(o)}"${(f[s[0]]||'All')===o?' selected':''}>${E(s[2]&&o==='All'?s[2]:o)}</option>`).join('')}</select>`).join('')}</div>`}
const flt=(view,key)=>UI.filters[view+key]||{};
const match=(f,hay)=>!f.q||hay.toLowerCase().includes(f.q.toLowerCase());
const panel=(view,tab)=>$(`[data-panel="${view}:${tab}"]`);
const head=(view,html)=>{$('#opHead-'+view).innerHTML=html};

// ---------- ISSUES ----------
function renderIssues(){
 const all=S.issues,open=all.filter(i=>i.status!=='Closed'),od=open.filter(isOverdue),hi=open.filter(i=>i.sev==='High'||i.sev==='Critical');
 const age=open.length?Math.round(open.reduce((a,i)=>a+dayN(TODAY)-dayN(i.created),0)/open.length):0;
 head('issues','<button class="btn" data-op="issue-export"><span class="btnico">↓</span>Export CSV</button><button class="btn primary" data-op="issue-new"><span class="btnico">＋</span>New issue</button>');
 const f=flt('issues','reg');
 const rows=all.filter(i=>match(f,i.id+i.title+i.owner+i.source+i.link)&&(!f.sev||f.sev==='All'||i.sev===f.sev)&&(!f.status||f.status==='All'||(f.status==='Overdue'?isOverdue(i):i.status===f.status))&&(!f.src||f.src==='All'||i.source===f.src))
  .sort((a,b)=>(a.status==='Closed')-(b.status==='Closed')||a.due.localeCompare(b.due)).map(i=>{const done=i.actions.filter(a=>a.done).length;return `<tr data-op="open" data-t="issue" data-id="${i.id}"><td class="riskid">${i.id}</td><td><div class="riskname">${E(i.title)}</div><div class="riskarea">${E(i.source)}${i.link?' · '+E(i.link):''}</div></td><td>${sev(i.sev)}</td><td>${own(i.owner)}</td><td>${fmt(i.due)}${isOverdue(i)?' '+pill('Overdue','red'):''}</td><td>${escLevel(i)?pill(ESC[escLevel(i)],'red'):'—'}</td><td>${done}/${i.actions.length}</td><td>${pill(i.status,stK[i.status])}</td></tr>`});
 const srcs=['All',...new Set(all.map(i=>i.source))];
 panel('issues','register').innerHTML=`<div class="op-kpis">${kpi('Open issues',open.length,'across all sources')}${kpi('Overdue',od.length,od.length?'escalation triggered':'none overdue',od.length?'warn':'ok')}${kpi('High / critical open',hi.length,'need senior attention',hi.length?'warn':'ok')}${kpi('Average age',age+' d','open issues, from creation')}</div>${toolbar('issues','reg','Search issues, owners, sources…',[['sev',['All','Critical','High','Medium','Low'],'All severities'],['status',['All','Open','In remediation','Pending verification','Overdue','Closed'],'All statuses'],['src',srcs,'All sources']])}${card('Issue register',`${rows.length} of ${all.length} issues · sorted by due date`,table(['ID','Issue','Severity','Owner','Due','Escalation','Actions','Status'],rows))}<div class="op-note">Escalation is automatic: L1 on the first overdue day, L2 after 7 days, L3 after 14 days. Closing an issue requires a verifier who is not the issue owner.</div>`;
 panel('issues','log').innerHTML=card('Activity log','Append-only record of changes made in these modules (this browser only)',table(['Date','User','Record','Event'],S.log.slice(0,60).map(l=>`<tr style="cursor:default"><td>${fmt(l.t)}</td><td>${own(l.who)}</td><td class="riskid">${E(l.ref)}</td><td style="white-space:normal">${E(l.txt)}</td></tr>`),'No activity yet. Changes you make will be listed here.'));
}

// ---------- CONTROLS ----------
function renderControls(){
 const cs=S.controls,eff=cs.filter(c=>c.result==='Effective').length,bad=cs.filter(c=>c.result==='Ineffective'||c.result==='Partially effective').length,due=cs.filter(ctrlDue).length;
 head('controls','<button class="btn" data-op="ctrl-export"><span class="btnico">↓</span>Export CSV</button><button class="btn" data-op="ctrl-new"><span class="btnico">＋</span>New control</button><button class="btn primary" data-op="test-new"><span class="btnico">✓</span>Record test</button>');
 const f=flt('controls','lib');
 const rows=cs.filter(c=>match(f,c.id+c.name+c.owner+c.risks.join(' ')+c.fw.join(' '))&&(!f.type||f.type==='All'||c.type===f.type)&&(!f.res||f.res==='All'||c.result===f.res)).map(c=>`<tr data-op="open" data-t="control" data-id="${c.id}"><td class="riskid">${c.id}</td><td><div class="riskname">${E(c.name)}</div><div class="riskarea">${E(c.fw.join(', '))}</div></td><td>${c.type} · ${c.nature}</td><td>${c.freq}</td><td>${own(c.owner)}</td><td>${E(c.risks.join(', ')||'—')}</td><td>${fmt(c.lastTest)}</td><td>${fmt(ctrlNext(c))}${ctrlDue(c)?' '+pill('Due','red'):''}</td><td>${pill(c.result,resK[c.result])}</td></tr>`);
 panel('controls','library').innerHTML=`<div class="op-kpis">${kpi('Controls in library',cs.length,`${new Set(cs.flatMap(c=>c.risks)).size} risks covered`)}${kpi('Effective',Math.round(eff/cs.length*100)+'%',`${eff} of ${cs.length} at last test`,'ok')}${kpi('Needs remediation',bad,'partially effective or ineffective',bad?'warn':'ok')}${kpi('Tests due or overdue',due,'per test frequency',due?'warn':'ok')}</div>${toolbar('controls','lib','Search controls, owners, risks, frameworks…',[['type',['All','Preventive','Detective','Corrective'],'All types'],['res',['All','Effective','Partially effective','Ineffective','Not tested'],'All results']])}${card('Control library',`${rows.length} of ${cs.length} controls`,table(['ID','Control','Type','Frequency','Owner','Risks','Last test','Next test','Result'],rows))}`;
 const mrows=risks.map(r=>{const rc=riskControls(r.id),cov=riskCoverage(r.id);return `<tr style="cursor:default"><td class="riskid">${r.id}</td><td><div class="riskname">${E(r.name)}</div><div class="riskarea">${E(r.area)}</div></td><td>${badge(r.inherent)}</td><td>${badge(r.rating)} <span class="risk-score">${r.score}</span></td><td style="white-space:normal">${rc.length?rc.map(c=>`<span class="badgepill pill-${resK[c.result]}" style="margin:0 3px 3px 0;cursor:pointer" data-op="open" data-t="control" data-id="${c.id}">${c.id}</span>`).join(''):'<span style="color:#ad4b45">No mapped control</span>'}</td><td>${pill(cov==='No control'?'Gap':cov,covK[cov])}</td></tr>`});
 const gaps=risks.filter(r=>riskCoverage(r.id)==='No control').length;
 panel('controls','matrix').innerHTML=`<div class="op-kpis">${kpi('Risks in register',risks.length,'mapped to controls below')}${kpi('Strong coverage',risks.filter(r=>riskCoverage(r.id)==='Strong').length,'all controls effective','ok')}${kpi('Weak / partial',risks.filter(r=>['Weak','Partial'].includes(riskCoverage(r.id))).length,'controls need remediation')}${kpi('Coverage gaps',gaps,'risks with no mapped control',gaps?'warn':'ok')}</div>`+card('Risk–control matrix','Coverage is Strong when every mapped control tested effective, Weak if any is ineffective.',table(['Risk','Name','Inherent','Residual','Mapped controls','Coverage'],mrows));
 const trows=[...S.tests].sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id)).map(t=>{const c=S.controls.find(x=>x.id===t.ctrl);return `<tr style="cursor:default"><td class="riskid">${t.id}</td><td><div class="riskname">${c?E(c.name):E(t.ctrl)}</div><div class="riskarea">${E(t.ctrl)}</div></td><td>${fmt(t.date)}</td><td>${own(t.tester)}</td><td>${t.sample}</td><td>${t.exc}</td><td>${pill(t.result,resK[t.result])}</td><td style="white-space:normal;max-width:260px">${E(t.notes)}</td></tr>`});
 panel('controls','tests').innerHTML=card('Control test results',`${S.tests.length} tests · tester must be independent of the control owner`,table(['Test','Control','Date','Tester','Sample','Exceptions','Result','Notes'],trows),'<button class="op-mini p" data-op="test-new">Record test</button>');
 const camp=S.rcsa[0],as=camp.assign,att=as.filter(a=>a.status!=='Pending').length,pct=Math.round(att/as.length*100);
 const arows=as.map((a,i)=>{const c=S.controls.find(x=>x.id===a.ctrl);const can=a.status==='Pending'&&canAct(a.owner);return `<tr style="cursor:default"><td class="riskid">${a.ctrl}</td><td><div class="riskname">${c?E(c.name):''}</div></td><td>${own(a.owner)}</td><td>${pill(a.status,a.status==='Attested'?'green':a.status==='Exception'?'amber':'blue')}</td><td>${fmt(a.date)}</td><td style="white-space:normal;max-width:250px">${E(a.comment)}</td><td>${can?`<button class="op-mini g" data-op="rcsa-attest" data-i="${i}">Attest</button> <button class="op-mini r" data-op="rcsa-exc" data-i="${i}">Exception</button>`:''}</td></tr>`});
 panel('controls','rcsa').innerHTML=`<div class="op-kpis">${kpi('Campaign',E(camp.id),E(camp.name))}${kpi('Completion',pct+'%',`${att} of ${as.length} controls responded`,pct<60?'warn':'ok')}${kpi('Exceptions raised',as.filter(a=>a.status==='Exception').length,'owners disagreed with design/operation')}${kpi('Due date',fmt(camp.due),(dayN(camp.due)-dayN(TODAY))+' days remaining')}</div><article class="card panel" style="margin-bottom:14px"><div class="panelhead"><div><div class="panel-title">Self-assessment progress</div><div class="panel-sub">Control owners attest that the control operated as designed during the period.</div></div><button class="op-mini p" data-op="rcsa-new">Launch new campaign</button></div>${bar(pct,pct<60?'amber':'')}</article>`+card('Assignments','Switch demo user in the top bar to attest as a control owner (administrators can attest for anyone).',table(['Control','Name','Owner','Status','Responded','Comment',''],arows));
}

// ---------- KRIs / HEATMAP / LOSS ----------
function spark(k){const s=k.series,mx=Math.max(...s,k.red),mn=Math.min(...s,0),w=84,h=24,pts=s.map((v,i)=>`${(i/(s.length-1)*w).toFixed(1)},${(h-2-((v-mn)/(mx-mn||1))*(h-4)).toFixed(1)}`).join(' ');const col={Green:'#178b78',Amber:'#d48a24',Red:'#cb554d'}[kriStatus(k)];return `<svg class="op-spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline fill="none" stroke="${col}" stroke-width="1.8" points="${pts}"/><circle cx="${pts.split(' ').pop().split(',')[0]}" cy="${pts.split(' ').pop().split(',')[1]}" r="2.6" fill="${col}"/></svg>`}
function renderKris(){
 const mode=UI.heat,ap=S.appetite;
 head('kris','<button class="btn" data-op="kri-export"><span class="btnico">↓</span>Export KRIs</button><button class="btn" data-op="loss-new"><span class="btnico">＋</span>Log loss event</button><button class="btn primary" data-op="kri-log"><span class="btnico">＋</span>Log KRI reading</button>');
 const cells={};risks.forEach(r=>{const[l,i]=riskLI(r,mode);(cells[l+'-'+i]=cells[l+'-'+i]||[]).push(r)});
 let grid='<div class="op-axis"></div>'+[1,2,3,4,5].map(i=>`<div class="op-axis">${i}</div>`).join('');
 for(let l=5;l>=1;l--){grid+=`<div class="op-axis">${l}</div>`;for(let i=1;i<=5;i++){const rs=cells[l+'-'+i]||[],sc=l*i;grid+=`<div class="op-cell${sc>ap?' out':''}" style="background:${heatCol(sc)}" data-op="open" data-t="cell" data-id="${l}-${i}">${rs.map(r=>`<span class="op-chip">${r.id}</span>`).join('')}<small>${sc}</small></div>`}}
 const outside=risks.filter(r=>r.score>ap).sort((a,b)=>b.score-a.score);
 panel('kris','heat').innerHTML=`<div class="op-two"><article class="card panel"><div class="panelhead"><div><div class="panel-title">${mode==='inherent'?'Inherent':'Residual'} risk heatmap</div><div class="panel-sub">Likelihood (vertical) × impact (horizontal). Red outline = above risk appetite of ${ap}.</div></div><div class="libtabs" style="margin:0;border:0"><button class="libtab${mode==='inherent'?' active':''}" data-op="heat" data-m="inherent">Inherent</button><button class="libtab${mode==='residual'?' active':''}" data-op="heat" data-m="residual">Residual</button></div></div><div class="op-heat">${grid}</div><div class="op-legend"><span><i style="background:#cfe9df"></i>Low (1–5)</span><span><i style="background:#fbe8b8"></i>Medium (6–11)</span><span><i style="background:#f7d2a8"></i>High (12–19)</span><span><i style="background:#f3b8b3"></i>Critical (20–25)</span></div><div class="op-note">Likelihood and impact are derived from each risk’s score; inherent positions step up from residual by the rating difference.</div></article>
 <article class="card panel"><div class="panelhead"><div><div class="panel-title">Risk appetite</div><div class="panel-sub">Maximum residual score the plant will accept without escalation.</div></div></div><div class="field"><select data-op="appetite">${[6,9,12,15,20].map(v=>`<option value="${v}"${v===ap?' selected':''}>Score ${v} (${v>=20?'Critical':v>=12?'High':v>=6?'Medium':'Low'} and above is outside)</option>`).join('')}</select></div><div class="panel-title" style="margin:6px 0">Outside appetite · ${outside.length}</div>${outside.length?outside.map(r=>`<div class="op-li"><div><b>${r.id}</b> · ${E(r.name)}<div class="riskarea">Residual ${r.score} · ${E(r.owner)}</div></div><button class="op-mini r" data-op="risk-issue" data-id="${r.id}">Raise issue</button></div>`).join(''):'<p class="op-note">All risks are within appetite.</p>'}</article></div>`;
 const ks=S.kris,cnt={Red:0,Amber:0,Green:0};ks.forEach(k=>cnt[kriStatus(k)]++);
 const f=flt('kris','kri');
 const krows=ks.filter(k=>match(f,k.id+k.name+k.risk+k.owner)&&(!f.rag||f.rag==='All'||kriStatus(k)===f.rag)).map(k=>{const v=k.series[k.series.length-1],st=kriStatus(k);return `<tr data-op="open" data-t="kri" data-id="${k.id}"><td class="riskid">${k.id}</td><td><div class="riskname">${E(k.name)}</div><div class="riskarea">Linked risk ${k.risk}</div></td><td><b>${v}${k.unit==='%'?'%':''}</b></td><td>${k.amber} / ${k.red}</td><td>${spark(k)}</td><td>${own(k.owner)}</td><td>${pill(st,ragK[st])}</td></tr>`});
 panel('kris','kri').innerHTML=`<div class="op-kpis">${kpi('Indicators tracked',ks.length,'linked to register risks')}${kpi('Red (breached)',cnt.Red,'red threshold reached',cnt.Red?'warn':'ok')}${kpi('Amber (warning)',cnt.Amber,'amber threshold reached')}${kpi('Green (within tolerance)',cnt.Green,'no action needed','ok')}</div>${toolbar('kris','kri','Search indicators, risks, owners…',[['rag',['All','Red','Amber','Green'],'All statuses']])}${card('Key risk indicators','Amber / red thresholds shown; the sparkline covers the latest readings',table(['ID','Indicator','Latest','Amber / red','Trend','Owner','Status'],krows))}`;
 const ls=S.losses,net=l=>l.gross-l.rec,tot=ls.reduce((a,l)=>a+l.gross,0),rec=ls.reduce((a,l)=>a+l.rec,0),byCat={};ls.forEach(l=>byCat[l.cat]=(byCat[l.cat]||0)+net(l));
 const cats=Object.entries(byCat).sort((a,b)=>b[1]-a[1]),mx=Math.max(1,...cats.map(c=>c[1]));
 const lrows=[...ls].sort((a,b)=>b.date.localeCompare(a.date)).map(l=>`<tr data-op="open" data-t="loss" data-id="${l.id}"><td class="riskid">${l.id}</td><td><div class="riskname">${E(l.title)}</div><div class="riskarea">${E(l.cat)} · ${l.risk}</div></td><td>${fmt(l.date)}</td><td>${inr(l.gross)}</td><td>${inr(l.rec)}</td><td><b>${inr(net(l))}</b></td><td>${pill(l.status,l.status==='Closed'?'green':'amber')}</td></tr>`);
 panel('kris','loss').innerHTML=`<div class="op-kpis">${kpi('Events logged',ls.length,`${ls.filter(l=>l.gross===0).length} near misses with no loss`)}${kpi('Gross loss',inr(tot),'before recoveries')}${kpi('Recoveries',inr(rec),'insurance and supplier credits','ok')}${kpi('Net loss',inr(tot-rec),'year to date','warn')}</div><div class="op-two"><div>${card('Loss and near-miss events','Click a row for detail or to raise an issue',table(['ID','Event','Date','Gross','Recovered','Net','Status'],lrows))}</div><article class="card panel"><div class="panel-title">Net loss by category</div><div class="panel-sub">Basel-style event categories adapted to plant operations</div><div class="bars op-bars" style="margin-top:12px">${cats.map(c=>`<div class="barrow"><span>${E(c[0])}</span><div class="bartrack"><div class="barfill" style="width:${c[1]/mx*100}%;background:#cb554d"></div></div><span class="barcount">${inr(c[1])}</span></div>`).join('')}</div></article></div>`;
}

// ---------- POLICIES ----------
const LIFE=['Draft','In review','Approved','Published'];
function renderPolicies(){
 const ps=S.policies,pub=ps.filter(p=>p.status==='Published'),od=ps.filter(polOverdue).length,wip=ps.filter(p=>p.status==='Draft'||p.status==='In review').length,avg=pub.length?Math.round(pub.reduce((a,p)=>a+attPct(p),0)/pub.length):0;
 head('policies','<button class="btn" data-op="pol-export"><span class="btnico">↓</span>Export CSV</button><button class="btn primary" data-op="pol-new"><span class="btnico">＋</span>New document</button>');
 const f=flt('policies','lib');
 const rows=ps.filter(p=>match(f,p.id+p.title+p.owner+p.fw.join(' '))&&(!f.status||f.status==='All'||polStatus(p)===f.status)&&(!f.type||f.type==='All'||p.type===f.type)).map(p=>{const a=attPct(p),st=polStatus(p);return `<tr data-op="open" data-t="policy" data-id="${p.id}"><td class="riskid">${p.id}</td><td><div class="riskname">${E(p.title)}</div><div class="riskarea">${E(p.fw.join(', '))}</div></td><td>${p.type} · v${p.ver}</td><td>${own(p.owner)}</td><td>${pill(st,polK[st])}</td><td>${fmt(p.review)}</td><td style="min-width:120px">${p.status==='Published'?`${bar(a,a<80?'amber':'')}<div class="riskarea">${attCount(p)} of ${p.aud} · ${a}%</div>`:'—'}</td></tr>`});
 panel('policies','library').innerHTML=`<div class="op-kpis">${kpi('Published',pub.length,`of ${ps.length} controlled documents`,'ok')}${kpi('Draft or in review',wip,'in the approval workflow')}${kpi('Review overdue',od,'past scheduled review date',od?'warn':'ok')}${kpi('Average attestation',avg+'%','across published documents',avg<85?'warn':'ok')}</div>${toolbar('policies','lib','Search policies, owners, frameworks…',[['status',['All','Draft','In review','Approved','Published','Review overdue'],'All statuses'],['type',['All','Policy','Procedure','SOP','Plan'],'All types']])}${card('Policy library',`${rows.length} of ${ps.length} documents`,table(['ID','Document','Type / version','Owner','Status','Next review','Attestation'],rows))}`;
}

// ---------- THIRD PARTIES ----------
const QUESTIONS=[['Financial','Financial stability: audited accounts reviewed and no going-concern concerns?'],['Quality','Certified quality system (e.g. ISO 9001) with recent audit and defect-rate reporting?'],['EHS','Documented EHS management and incident reporting, with no unresolved major incidents?'],['Cyber / OT','Access to plant systems is MFA-protected, least-privilege and logged?'],['Compliance','Anti-bribery, labour and statutory compliance verified (licences, PF/ESI, GST)?'],['Continuity','Tested business continuity plan with alternate capacity or sourcing available?'],['Sustainability','Environmental permits and ESG disclosures are available and current?'],['Sub-tier','Sub-contractors and contract labour are screened and requirements flowed down?']];
function renderVendors(){
 const vs=S.vendors,crit=vs.filter(v=>v.tier===1).length,hi=vs.filter(v=>['High','Critical'].includes(vRating(v))).length,due=vs.filter(vDue).length;
 head('vendors','<button class="btn" data-op="ven-export"><span class="btnico">↓</span>Export CSV</button><button class="btn primary" data-op="ven-new"><span class="btnico">＋</span>Onboard vendor</button>');
 const f=flt('vendors','reg');
 const rows=vs.filter(v=>match(f,v.id+v.name+v.cat+v.owner)&&(!f.tier||f.tier==='All'||'Tier '+v.tier===f.tier)&&(!f.rate||f.rate==='All'||vRating(v)===f.rate)).map(v=>`<tr data-op="open" data-t="vendor" data-id="${v.id}"><td class="riskid">${v.id}</td><td><div class="riskname">${E(v.name)}</div><div class="riskarea">${E(v.cat)}${v.single?' · single source':''}</div></td><td>Tier ${v.tier}</td><td>${badge(vRating(v))} <span class="risk-score">${v.score}</span></td><td>${own(v.owner)}</td><td>${fmt(v.last)}</td><td>${fmt(vNext(v))}${vDue(v)?' '+pill('Overdue','red'):''}</td><td>${E(v.risks.join(', ')||'—')}</td></tr>`);
 panel('vendors','register').innerHTML=`<div class="op-kpis">${kpi('Vendors',vs.length,`${vs.filter(v=>v.single).length} single-source`)}${kpi('Tier 1 (critical)',crit,'annual reassessment')}${kpi('High / critical risk',hi,'by questionnaire score',hi?'warn':'ok')}${kpi('Reassessments overdue',due,'tier 1: 12 mo · tier 2: 18 mo · tier 3: 24 mo',due?'warn':'ok')}</div>${toolbar('vendors','reg','Search vendors, categories, owners…',[['tier',['All','Tier 1','Tier 2','Tier 3'],'All tiers'],['rate',['All','Critical','High','Medium','Low'],'All risk ratings']])}${card('Vendor register',`${rows.length} of ${vs.length} vendors · score = % of due-diligence criteria met`,table(['ID','Vendor','Tier','Risk rating','Owner','Last assessed','Next due','Linked risks'],rows))}`;
}
// ---------- record drill-downs: status, what is pending, what to do, linked records ----------
const dTo=iso=>dayN(iso)-dayN(TODAY);
const dcss=document.createElement('style');dcss.textContent=`.op-banner{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:8px;margin:2px 0 12px;font-size:10px}.op-banner b{font:700 11px Manrope}.op-banner.red{background:#fcebea;color:#8f3a35}.op-banner.amber{background:#fff4e1;color:#85530f}.op-banner.green{background:#e7f4f1;color:#1d6a5a}
.op-pend{display:grid;grid-template-columns:18px 1fr;gap:8px;padding:8px 10px;border-radius:7px;margin-bottom:6px;font-size:10px;line-height:1.5;border:1px solid #edf0f3}.op-pend.red{background:#fdf4f3;border-color:#f3d6d4}.op-pend.amber{background:#fffaf0;border-color:#f6e5c6}.op-pend.green{background:#f3faf8;border-color:#d6ece6}.op-pend span{text-align:center}
.op-todo{margin:4px 0 10px;padding-left:18px;font-size:10px;line-height:1.65;color:#4b5a6b}.op-todo li{margin:4px 0}
.op-links{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 10px}.op-link{border:1px solid #d6e0ee;background:#f4f8fd;color:#3d6197;border-radius:14px;padding:5px 10px;font-size:9.5px;font-weight:600;text-align:left}.op-link:hover{background:#e6eefa}`;document.head.appendChild(dcss);
const rname=id=>{const r=risks.find(x=>x.id===id);return r?`${r.id} · ${r.name}`:id};
function lk(id){if(!id)return '';const m=[['risk',risks.find(x=>x.id===id),r=>rname(id)],['issue',S.issues.find(x=>x.id===id),r=>`${r.id} · ${r.title}`],['control',S.controls.find(x=>x.id===id),r=>`${r.id} · ${r.name}`],['kri',S.kris.find(x=>x.id===id),r=>`${r.id} · ${r.name}`],['loss',S.losses.find(x=>x.id===id),r=>`${r.id} · ${r.title}`],['policy',S.policies.find(x=>x.id===id),r=>`${r.id} · ${r.title}`],['vendor',S.vendors.find(x=>x.id===id),r=>`${r.id} · ${r.name}`]].find(x=>x[1]);
 if(!m){const t=S.tests.find(x=>x.id===id);return t?lk(t.ctrl):`<span class="badgepill pill-blue">${E(id)}</span>`}
 const lab=m[2](m[1]);return `<button class="op-link" data-op="${m[0]==='risk'?'risk':'open'}" data-t="${m[0]}" data-id="${E(id)}">${E(lab.length>58?lab.slice(0,56)+'…':lab)}</button>`}
const links=ids=>{const u=[...new Set(ids.filter(Boolean))];return u.length?`<div class="op-links">${u.map(lk).join('')}</div>`:'<p class="op-note">Nothing linked yet.</p>'};
function pendHtml(P,okText){const r=P.filter(x=>x[0]==='red').length,a=P.filter(x=>x[0]==='amber').length,k=r?'red':a?'amber':'green';
 return `<div class="op-banner ${k}"><div><b>${k==='red'?'Action needed':k==='amber'?'Needs attention':'On track'}</b><div>${P.length?`${P.length} item(s) pending${r?` · ${r} urgent`:''}`:E(okText||'Nothing pending on this record.')}</div></div></div><h4>What is pending</h4>`+(P.length?P.map(x=>`<div class="op-pend ${x[0]}"><span>${x[0]==='red'?'⚠':'◔'}</span><div>${x[1]}</div></div>`).join(''):`<div class="op-pend green"><span>✓</span><div>${E(okText||'Nothing pending on this record.')}</div></div>`)}
const todoHtml=a=>`<h4>What needs to be done</h4><ol class="op-todo">${a.map(t=>`<li>${t}</li>`).join('')}</ol>`;
const bl=a=>`<ul>${a.map(t=>`<li>${t}</li>`).join('')}</ul>`;
const CAUSE={'Process / procedure':['Rewrite or simplify the procedure with the people who do the work; remove steps that are routinely bypassed.','Add a checkpoint or sign-off where the process failed and brief every shift.'],'Control design':['Redesign the control so it works by default (interlock, automation, forced step) instead of relying on memory.','Define who performs it, how often, and what evidence proves it ran.'],'Documentation':['Correct the missing or inconsistent records and set a retention and review rule.','Add a periodic completeness check by someone independent of the record owner.'],'Training':['Deliver refresher training to the affected roles and capture signed attendance.','Add a competence check or observation before people work unsupervised.'],'Access management':['Remove or recertify excess accounts and enforce least privilege.','Schedule recurring access reviews with a named reviewer and recorded outcome.'],'Resourcing / capacity':['Confirm whether the work is realistic with current people and time; agree a funded plan or reprioritise.','Escalate the trade-off to the function head if the date cannot be met.'],'Third party':['Share the finding with the third party and agree a dated remediation plan.','Add the requirement to the contract or purchase conditions and re-assess.'],'To be determined':['Run a short cause analysis (5-whys) with the process owner, then update the root-cause category.']};
const EVID={'Audit finding':['Updated record, procedure or physical fix showing the gap is closed','Re-inspection or follow-up note from the auditor'],'Control test':['Re-test of the control showing it now passes','Evidence the control operated for at least one full period'],'KRI breach':['Two consecutive readings back below the amber threshold','Evidence of the corrective action taken'],'Loss event':['Completed investigation report','Proof corrective actions are in place'],'Vendor assessment':['Vendor remediation plan and supporting proof','New due-diligence score'],'Risk treatment':['Revised risk assessment with treatment plan','Evidence new controls are operating']};
function issueRisks(i){const l=i.link||'',t=S.tests.find(x=>x.id===l),c=S.controls.find(x=>x.id===l)||(t&&S.controls.find(x=>x.id===t.ctrl)),k=S.kris.find(x=>x.id===l),e=S.losses.find(x=>x.id===l),v=S.vendors.find(x=>x.id===l);return[...(l.startsWith('R-')?[l]:[]),...(c?c.risks:[]),...(k?[k.risk]:[]),...(e&&e.risk?[e.risk]:[]),...(v?v.risks:[])]}
function drawIssue(i){
 const steps=['Open','In remediation','Pending verification','Closed'],ci=steps.indexOf(i.status),closed=i.status==='Closed',dd=-dTo(i.due),openA=i.actions.filter(a=>!a.done),P=[];
 if(!closed){
  if(isOverdue(i))P.push(['red',`Overdue by <b>${dd} day(s)</b> (was due ${fmt(i.due)}). Escalated to <b>${ESC[escLevel(i)]}</b>.`]);else if(dTo(i.due)<=7)P.push(['amber',`Due in <b>${dTo(i.due)} day(s)</b> (${fmt(i.due)}).`]);
  if(!i.actions.length)P.push(['red','No action plan yet. Add at least one corrective or preventive action.']);
  openA.forEach(a=>P.push([a.due<TODAY?'red':'amber',`Action ${a.due<TODAY?'late':'open'}: ${E(a.text)} · ${E(a.owner)} · due ${fmt(a.due)}`]));
  if(i.status==='Pending verification')P.push(['amber',`Waiting for independent verification. Anyone except <b>${E(i.owner)}</b> can verify and close.`]);
  if(i.cause==='To be determined')P.push(['amber','Root cause has not been identified yet.']);}
 const todo={Open:[`${E(i.owner)} confirms scope, severity and root cause.`,'Agree an action plan with owners and dates (Add action).','Move the issue to <b>In remediation</b> so progress is tracked.'],'In remediation':[openA.length?`Complete the ${openA.length} open action(s) listed above.`:'All actions are complete.','Attach evidence to each completed action.','Submit for verification once every action is done.'],'Pending verification':['An independent person (not the owner) checks the evidence against each action.','Close the issue if the fix is effective, or reopen it with reasons.','Re-test the linked control or indicator after closure.'],Closed:['Monitor for recurrence over the next review cycle.','Confirm the linked control re-test or indicator check is scheduled.']}[i.status];
 const why=i.sev==='Critical'||i.sev==='High'?'Left open, this can lead to a repeat event, a regulator or customer finding, or avoidable loss. Escalate early if the due date is at risk.':'Lower urgency, but unresolved items accumulate and weaken audit results. Keep the owner and date current.';
 const linked=[i.link,...issueRisks(i),...S.controls.filter(c=>issueRisks(i).some(r=>c.risks.includes(r))).slice(0,3).map(c=>c.id),...S.kris.filter(k=>issueRisks(i).includes(k.risk)).map(k=>k.id)];
 const hist=S.log.filter(l=>l.ref===i.id).slice(0,12);
 setDrawer('Issue · '+i.id,i.title,`<div class="op-steps">${steps.map((s,k)=>`<div class="${k<ci||closed?'done':k===ci?'cur':''}">${s}</div>`).join('')}</div>${pendHtml(P,closed?'Closed and verified.':'No pending items.')}${todoHtml(todo)}
 <div class="detailgrid">${box('Severity',sev(i.sev))}${box('Owner',E(i.owner))}${box('Due date',fmt(i.due))}${box('Escalation',escLevel(i)?ESC[escLevel(i)]:'None')}${box('Source',E(i.source)+(i.link?' · '+E(i.link):''))}${box('Root-cause category',E(i.cause))}</div>
 ${i.desc?`<h4>Description</h4><p>${E(i.desc)}</p>`:''}<h4>Why it matters</h4><p>${why}</p>
 <h4>Action plan (${i.actions.filter(a=>a.done).length}/${i.actions.length} complete)</h4><div>${i.actions.length?i.actions.map(a=>`<div class="op-actrow${a.done?' done':''}"><input type="checkbox" data-op="act-toggle" data-id="${i.id}" data-aid="${a.id}"${a.done?' checked':''}${closed?' disabled':''}><div><div class="t">${E(a.text)}</div><div class="m">${E(a.owner)} · due ${fmt(a.due)}</div></div><span>${a.done?pill('Done','green'):a.due<TODAY?pill('Late','red'):pill('Open','blue')}</span></div>`).join(''):'<p class="op-note">No actions yet.</p>'}</div>
 <div class="op-btns">${!closed?`<button class="op-mini" data-op="act-new" data-id="${i.id}">＋ Add action</button>`:''}${{Open:'Start remediation','In remediation':'Submit for verification','Pending verification':'Verify & close'}[i.status]?`<button class="op-mini p" data-op="issue-step" data-id="${i.id}">${{Open:'Start remediation','In remediation':'Submit for verification','Pending verification':'Verify & close'}[i.status]}</button>`:`<button class="op-mini" data-op="issue-reopen" data-id="${i.id}">Reopen issue</button>`}</div>
 <h4>Typical corrective actions for “${E(i.cause)}”</h4>${bl(CAUSE[i.cause]||CAUSE['To be determined'])}<h4>Evidence to verify before closing</h4>${bl(EVID[i.source]||['Evidence that each action was completed','Independent verification note'])}
 <h4>Linked records</h4>${links(linked)}${i.verifiedBy?`<div class="detailbox"><b>Independently verified</b>${E(i.verifiedBy)} confirmed the actions and closed this issue.</div>`:''}
 <h4>History</h4><div class="op-hist">${hist.length?hist.map(h=>`<div><b>${fmt(h.t)}</b> · ${E(h.who)} — ${E(h.txt)}</div>`).join(''):'<div>No recorded changes yet.</div>'}</div>`);
}
function drawControl(c){
 const tests=S.tests.filter(t=>t.ctrl===c.id).sort((a,b)=>b.date.localeCompare(a.date)),tIds=tests.map(t=>t.id),iss=S.issues.filter(i=>i.source==='Control test'&&tIds.includes(i.link)),openI=iss.filter(i=>i.status!=='Closed'),P=[];
 const att=S.rcsa[0].assign.find(a=>a.ctrl===c.id);
 if(c.result==='Not tested')P.push(['red','Never tested. Record a test to rate this control.']);
 if(ctrlDue(c))P.push(['red',`Test overdue since <b>${fmt(ctrlNext(c))}</b> (${-dTo(ctrlNext(c))} days).`]);else if(dTo(ctrlNext(c))<=14)P.push(['amber',`Next test due in ${dTo(ctrlNext(c))} days (${fmt(ctrlNext(c))}).`]);
 if(c.result==='Ineffective'||c.result==='Partially effective'){P.push([c.result==='Ineffective'?'red':'amber',`Last test was <b>${c.result.toLowerCase()}</b> with ${c.exc} exception(s).`]);if(!openI.length)P.push(['red','No open issue is tracking this failure. Raise one so it has an owner and a date.']);else openI.forEach(i=>P.push(['amber',`Remediation in progress: ${i.id} (${E(i.owner)}, due ${fmt(i.due)}).`]))}
 if(att&&att.status==='Pending')P.push(['amber',`Self-assessment attestation pending from ${E(att.owner)} (campaign due ${fmt(S.rcsa[0].due)}).`]);
 if(att&&att.status==='Exception')P.push(['amber',`Owner reported an exception in the self-assessment: ${E(att.comment)}`]);
 if(!c.risks.length)P.push(['amber','Not mapped to any risk. Link it so its value can be measured.']);
 const n=c.freq==='Monthly'?12:c.freq==='Quarterly'?25:c.freq==='Semi-annual'?10:5;
 const todo=[ctrlDue(c)||c.result==='Not tested'?`Record a test now: independent tester, sample of about ${n}.`:`Schedule the next test for ${fmt(ctrlNext(c))}.`];
 if(c.result==='Ineffective'||c.result==='Partially effective')todo.push(`${E(c.owner)} to fix the ${c.exc} exception(s) and redesign the step that failed, then re-test.`);
 if(att&&att.status==='Pending')todo.push(`${E(att.owner)} to attest or report an exception in the RCSA campaign.`);
 todo.push('Keep evidence for the full period so the next test can be completed quickly.');
 const how={Preventive:'Stops the event before it happens (approval, interlock, certification, segregation).',Detective:'Finds problems after the fact so they can be corrected (review, reconciliation, alarm, sampling).',Corrective:'Limits damage and restores normal operation (drill, response plan, recovery action).'}[c.type];
 const rel=c.risks.flatMap(r=>S.kris.filter(k=>k.risk===r).map(k=>k.id));
 setDrawer('Control · '+c.id,c.name,`${pendHtml(P,'Tested effective and up to date.')}${todoHtml(todo)}<div class="detailgrid">${box('Type / nature',c.type+' · '+c.nature)}${box('Frequency',c.freq)}${box('Control owner',E(c.owner))}${box('Result at last test',pill(c.result,resK[c.result]))}${box('Last test',fmt(c.lastTest)+' by '+E(c.tester))}${box('Next test due',fmt(ctrlNext(c)))}</div>
 <div class="op-btns"><button class="op-mini p" data-op="test-new" data-id="${c.id}">Record test</button>${(c.result==='Ineffective'||c.result==='Partially effective')&&!openI.length?`<button class="op-mini r" data-op="ctrl-issue" data-id="${c.id}">Raise issue</button>`:''}</div>
 <h4>How this control works</h4><p>${how} It is performed ${c.freq.toLowerCase()} and is ${c.nature.toLowerCase()}.</p>
 <h4>How to test it</h4>${bl([`Confirm it ran at the stated frequency for the whole period.`,`Inspect evidence for a sample of about ${n} occurrences and count exceptions.`,`Tester must be independent of ${E(c.owner)}.`,'Rate it effective (no exceptions), partially effective (isolated exceptions) or ineffective (systemic).'])}
 <h4>Evidence to retain</h4>${bl(c.nature==='Automated'?['System configuration or alert rule export','Log extract showing the rule fired and was handled']:['Signed or dated record of each performance','Reviewer sign-off and exception follow-up'])}
 <h4>Linked records</h4>${links([...c.risks,...S.policies.filter(p=>p.ctrls.includes(c.id)).map(p=>p.id),...iss.map(i=>i.id),...rel])}<p class="op-note">Frameworks: ${E(c.fw.join(', '))}</p>
 <h4>Test history</h4>${tests.length?table(['Test','Date','Tester','Sample','Exc.','Result'],tests.map(t=>`<tr style="cursor:default"><td class="riskid">${t.id}</td><td>${fmt(t.date)}</td><td>${E(t.tester)}</td><td>${t.sample}</td><td>${t.exc}</td><td>${pill(t.result,resK[t.result])}</td></tr>`)):'<p class="op-note">Not yet tested.</p>'}`);
}
function drawKri(k){
 const v=k.series[k.series.length-1],st=kriStatus(k),s=k.series,rising=s.length>=4&&s.slice(-3).every((x,i,a)=>i===0||x>a[i-1]),iss=S.issues.filter(i=>i.source==='KRI breach'&&i.link===k.id&&i.status!=='Closed'),weak=S.controls.filter(c=>c.risks.includes(k.risk)&&c.result!=='Effective'),r=risks.find(x=>x.id===k.risk),P=[];
 if(st==='Red')P.push(['red',`Reading <b>${v}</b> has reached the red threshold (${k.red}).`]);else if(st==='Amber')P.push(['amber',`Reading <b>${v}</b> is in the amber zone (amber ${k.amber}, red ${k.red}). ${k.red-v} to go before red.`]);
 if(rising)P.push(['amber','The indicator has risen for the last three readings.']);
 if(st!=='Green'&&!iss.length)P.push([st==='Red'?'red':'amber','No open issue is tracking this breach.']);iss.forEach(i=>P.push(['amber',`Response in progress: ${i.id} (${E(i.owner)}, due ${fmt(i.due)}).`]));
 weak.forEach(c=>P.push([c.result==='Ineffective'?'red':'amber',`Linked control ${c.id} is ${c.result.toLowerCase()}.`]));
 if(r&&r.score>S.appetite)P.push(['amber',`Linked risk ${r.id} sits above risk appetite (${r.score} vs ${S.appetite}).`]);
 const todo=st==='Green'?['Keep logging the reading each period.','Review thresholds yearly against actual performance.']:['Confirm the reading is accurate and not a data error.',`${E(k.owner)} to find the cause and agree a response (raise an issue to track it).`,weak.length?`Fix the weak linked control(s): ${weak.map(c=>c.id).join(', ')}.`:'Check the linked controls are operating.',`Log the next reading and escalate if it reaches ${k.red}.`];
 setDrawer('KRI · '+k.id,k.name,`${pendHtml(P,'Within tolerance and no open breach.')}${todoHtml(todo)}<div class="detailgrid">${box('Latest reading',`<b>${v}${k.unit==='%'?'%':''}</b> ${pill(st,ragK[st])}`)}${box('Thresholds',`Amber ≥ ${k.amber} · Red ≥ ${k.red}`)}${box('Indicator owner',E(k.owner))}${box('Linked risk',E(r?r.id+' · '+r.name:k.risk))}</div>
 <h4>Trend</h4><div style="padding:6px 0">${spark(k).replace('width="84" height="24"','width="320" height="60"')}</div><p class="op-note">Readings (oldest to latest): ${s.join(' · ')}</p>
 <div class="op-btns"><button class="op-mini p" data-op="kri-log" data-id="${k.id}">Log new reading</button>${st!=='Green'&&!iss.length?`<button class="op-mini r" data-op="kri-issue" data-id="${k.id}">Raise issue</button>`:''}</div>
 <h4>Linked records</h4>${links([k.risk,...S.controls.filter(c=>c.risks.includes(k.risk)).map(c=>c.id),...S.issues.filter(i=>i.link===k.id).map(i=>i.id),...S.losses.filter(l=>l.risk===k.risk).map(l=>l.id)])}`);
}
const LQ={'Equipment failure':['What failed, and was it in the maintenance plan?','Were alarms or condition signals missed?','Is the same asset type at risk on other lines?'],'Safety incident':['Which controls and PPE were in place and used?','Was training and supervision adequate?','Does the event need statutory reporting?'],'Environmental release':['What quantity left site and where did it go?','Do permit conditions require notification?','Which containment barrier failed?'],'Quality escape':['How did the defect pass inspection?','Which batches and customers are affected?','Is the gauge or sensor within calibration?'],'Supply disruption':['What was the single point of failure?','Was there a qualified alternate source or buffer stock?','What did expediting cost?'],'Cyber / OT':['How did the access or exposure occur?','Was any data or process affected?','Which access control should have stopped it?'],'Near miss':['What stopped this becoming an injury or loss?','Which control barrier was missing or ignored?','Share the lesson with all shifts.']};
function drawLoss(l){
 const age=-dTo(l.date),iss=S.issues.filter(i=>i.link===l.id),open=iss.filter(i=>i.status!=='Closed'),r=risks.find(x=>x.id===l.risk),net=l.gross-l.rec,P=[];
 if(l.status!=='Closed'){P.push([age>30?'red':'amber',`Investigation still open after <b>${age} days</b>.`]);}
 if(!iss.length)P.push(['amber','No corrective actions are tracked. Raise an issue so actions have an owner and a date.']);open.forEach(i=>P.push(['amber',`Corrective action in progress: ${i.id} (${E(i.owner)}, due ${fmt(i.due)}).`]));
 if(l.gross>0&&l.rec===0&&l.status!=='Closed')P.push(['amber','No recovery claimed yet (insurance or supplier credit).']);
 if(net>=300000)P.push(['amber','Significant net loss. Brief site leadership and review the linked risk rating.']);
 if(r&&r.score>S.appetite)P.push(['amber',`Linked risk ${r.id} is above risk appetite.`]);
 const todo=[l.status!=='Closed'?'Complete the investigation and record the root cause.':'Confirm lessons learned were shared with affected teams.',iss.length?'Track the corrective actions to closure.':'Raise an issue for the corrective actions.',`Review whether ${E(r?r.id:'the linked risk')} residual rating and its controls still hold.`,'Update or add a KRI if this type of event should be an early-warning signal.'];
 setDrawer('Loss event · '+l.id,l.title,`${pendHtml(P,'Investigated, actions complete.')}${todoHtml(todo)}<div class="detailgrid">${box('Category',E(l.cat))}${box('Date',fmt(l.date))}${box('Reported by',E(l.reporter))}${box('Status',E(l.status))}${box('Gross loss',inr(l.gross))}${box('Recovered',inr(l.rec))}${box('Net loss',inr(net))}${box('Linked risk',E(r?r.id+' · '+r.name:'None'))}</div>
 <div class="op-btns">${!iss.length?`<button class="op-mini r" data-op="loss-issue" data-id="${l.id}">Raise issue</button>`:''}${l.status!=='Closed'?`<button class="op-mini g" data-op="loss-close" data-id="${l.id}">Mark investigation closed</button>`:''}</div>
 <h4>Questions the investigation should answer</h4>${bl(LQ[l.cat]||LQ['Near miss'])}
 <h4>Linked records</h4>${links([l.risk,...iss.map(i=>i.id),...S.controls.filter(c=>c.risks.includes(l.risk)).map(c=>c.id),...S.kris.filter(k=>k.risk===l.risk).map(k=>k.id)])}`);
}
const PCONTENT={Policy:['Purpose, scope and who it applies to','Principles and mandatory requirements','Roles and accountabilities','Exceptions, breaches and review cycle'],Procedure:['Trigger and scope','Step-by-step instructions with responsible role','Records to keep and approvals','Emergency / exception handling'],SOP:['Hazards and required PPE','Step-by-step method','Checks and acceptance criteria','Records and reporting'],Plan:['Scope and critical processes','Recovery roles and contacts','Recovery steps and timings','Test schedule and last exercise result']};
function drawPolicy(p){
 const st=polStatus(p),ci=LIFE.indexOf(p.status),a=attPct(p),out=p.aud-attCount(p),hist=S.log.filter(l=>l.ref===p.id).slice(0,12),done=p.attBy.includes(me().name),P=[];
 if(polOverdue(p))P.push(['red',`Periodic review overdue by <b>${-dTo(p.review)} days</b> (was due ${fmt(p.review)}).`]);else if(dTo(p.review)<=60&&p.status==='Published')P.push(['amber',`Review due in ${dTo(p.review)} days (${fmt(p.review)}).`]);
 if(p.status==='Published'&&a<80)P.push([a<50?'red':'amber',`Attestation at <b>${a}%</b>: ${out} of ${p.aud} people have not attested to v${p.ver}.`]);
 if(p.status==='Draft')P.push(['amber',`Draft v${p.ver} has not been submitted for review.`]);
 if(p.status==='In review')P.push(['amber',`Waiting for approval by someone other than <b>${E(p.owner)}</b>.`]);
 if(p.status==='Approved')P.push(['amber','Approved but not yet published, so staff cannot attest.']);
 if(!p.ctrls.length)P.push(['amber','No supporting controls are linked, so compliance with this document cannot be tested.']);
 const todo={Draft:['Finish the content and submit for review.','Link the controls that prove the policy is followed.'],'In review':['A reviewer who is not the owner checks and approves it.','Resolve any review comments before approving.'],Approved:['Publish the document and start attestation.','Tell the audience where to find it and by when to attest.'],Published:[polOverdue(p)?'Review the content now and mark it reviewed, or draft a new version.':`Schedule the next review for ${fmt(p.review)}.`,out>0?`Chase the ${out} outstanding attestations (target 100%).`:'All attestations complete.','Test the linked controls to confirm the policy is working in practice.']}[p.status];
 setDrawer(p.type+' · '+p.id,p.title,`<div class="op-steps">${LIFE.map((s,k)=>`<div class="${k<ci?'done':k===ci?'cur':''}">${s}</div>`).join('')}</div>${pendHtml(P,'Published, reviewed and fully attested.')}${todoHtml(todo)}<div class="detailgrid">${box('Version','v'+p.ver)}${box('Owner',E(p.owner))}${box('Status',pill(st,polK[st]))}${box('Next review',fmt(p.review))}${box('Frameworks',E(p.fw.join(', ')||'None'))}${box('Audience',p.aud+' people')}</div>
 ${p.status==='Published'?`<h4>Attestation</h4>${bar(a,a<80?'amber':'')}<p class="op-note">${attCount(p)} of ${p.aud} attested to v${p.ver} (${a}%).</p>`:''}
 <div class="op-btns">${{Draft:'Submit for review','In review':'Approve',Approved:'Publish & start attestation'}[p.status]?`<button class="op-mini p" data-op="pol-step" data-id="${p.id}">${{Draft:'Submit for review','In review':'Approve',Approved:'Publish & start attestation'}[p.status]}</button>`:''}${p.status==='Published'&&!done?`<button class="op-mini g" data-op="pol-attest" data-id="${p.id}">Attest as ${E(me().name)}</button>`:''}${p.status==='Published'?`<button class="op-mini" data-op="pol-revise" data-id="${p.id}">Create new version</button>`:''}${polOverdue(p)?`<button class="op-mini" data-op="pol-reviewed" data-id="${p.id}">Mark reviewed (no change)</button>`:''}</div>
 <h4>What this ${p.type.toLowerCase()} should cover</h4>${bl(PCONTENT[p.type]||PCONTENT.Policy)}<h4>Supporting controls &amp; linked records</h4>${links(p.ctrls)}
 <h4>Version &amp; approval history</h4><div class="op-hist">${hist.length?hist.map(h=>`<div><b>${fmt(h.t)}</b> · ${E(h.who)} — ${E(h.txt)}</div>`).join(''):'<div>Current version carried over from the document register.</div>'}</div>`);
}
function drawVendor(v){
 const r=vRating(v),iss=S.issues.filter(i=>i.link===v.id),open=iss.filter(i=>i.status!=='Closed'),last=v.hist[v.hist.length-1],weak=last&&last.ans?last.ans.filter(x=>x[1]==='No'||x[1]==='Partial'):[],P=[];
 if(vDue(v))P.push(['red',`Reassessment overdue since <b>${fmt(vNext(v))}</b> (${-dTo(vNext(v))} days). Tier ${v.tier} vendors are reassessed every ${{1:12,2:18,3:24}[v.tier]} months.`]);else if(dTo(vNext(v))<=60)P.push(['amber',`Reassessment due in ${dTo(vNext(v))} days (${fmt(vNext(v))}).`]);
 if(r==='Critical')P.push(['red',`Due-diligence score <b>${v.score}/100</b> is critical.`]);else if(r==='High')P.push(['amber',`Due-diligence score <b>${v.score}/100</b> is high risk.`]);
 if(v.single)P.push(['amber','Single-source supplier. No qualified alternate is recorded.']);
 if(dTo(v.contractEnd)<=180)P.push(['amber',`Contract ends in ${dTo(v.contractEnd)} days (${fmt(v.contractEnd)}). Plan renewal or exit and refresh due diligence.`]);
 open.forEach(i=>P.push(['amber',`Open issue ${i.id}: ${E(i.title)} (${E(i.owner)}, due ${fmt(i.due)}).`]));
 if(['High','Critical'].includes(r)&&!open.length)P.push(['red','No issue is tracking remediation of this vendor’s risk.']);
 const todo=[vDue(v)?'Run the due-diligence assessment now.':`Run the next assessment by ${fmt(vNext(v))}.`];
 if(['High','Critical'].includes(r))todo.push('Request a dated remediation plan from the vendor and track it as an issue.');
 if(v.single)todo.push('Qualify an alternate source or agree safety stock and a continuity plan with the vendor.');
 if(v.tier===1)todo.push('Confirm right-to-audit, incident-notification and continuity clauses are in the contract.');
 todo.push(`${E(v.owner)} (relationship owner) to review performance and open issues each quarter.`);
 const rel=v.risks;
 setDrawer('Vendor · '+v.id,v.name,`${pendHtml(P,'Assessed within cycle and no open concerns.')}${todoHtml(todo)}<div class="detailgrid">${box('Category',E(v.cat))}${box('Criticality tier','Tier '+v.tier+(v.single?' · single source':''))}${box('Risk rating',`${badge(r)} score ${v.score}/100`)}${box('Relationship owner',E(v.owner))}${box('Last assessed',fmt(v.last))}${box('Next assessment due',fmt(vNext(v)))}${box('Contract end',fmt(v.contractEnd))}${box('Open issues',String(open.length))}</div>
 <div class="op-btns"><button class="op-mini p" data-op="ven-assess" data-id="${v.id}">Run due-diligence assessment</button>${['High','Critical'].includes(r)&&!open.length?`<button class="op-mini r" data-op="ven-issue" data-id="${v.id}">Raise issue</button>`:''}</div>
 ${weak.length?`<h4>Weak areas in the last assessment</h4>${bl(weak.map(x=>`<b>${E(x[0])}</b>: ${x[1]==='No'?'not met':'partly met'}`))}`:''}
 <h4>Due-diligence areas to evidence</h4>${bl(QUESTIONS.map(q=>`<b>${q[0]}</b>: ${E(q[1].replace(/\?$/,''))}`))}
 <h4>Linked records</h4>${links([...rel,...iss.map(i=>i.id),...S.controls.filter(c=>c.risks.some(x=>rel.includes(x))).map(c=>c.id),...S.kris.filter(k=>rel.includes(k.risk)).map(k=>k.id),...S.losses.filter(l=>rel.includes(l.risk)).map(l=>l.id)])}
 <h4>Assessment history</h4>${table(['Date','Score','Rating','Assessed by'],[...v.hist].reverse().map(h=>`<tr style="cursor:default"><td>${fmt(h.date)}</td><td>${h.score}</td><td>${badge(ratingOf(h.score))}</td><td>${E(h.by)}</td></tr>`))}`);
}
function drawCell(id){const[l,i]=id.split('-').map(Number),rs=risks.filter(r=>{const p=riskLI(r,UI.heat);return p[0]===l&&p[1]===i});setDrawer(`${UI.heat==='inherent'?'Inherent':'Residual'} heatmap`,`Likelihood ${l} × Impact ${i} = ${l*i}`,(rs.length?`<p class="op-note">Select a risk to open its full record.</p><div class="op-links">${rs.map(r=>lk(r.id)).join('')}</div>`+rs.map(r=>`<div class="op-li"><div><b>${r.id}</b> · ${E(r.name)}<div class="riskarea">${E(r.area)} · ${E(r.owner)} · control coverage: ${riskCoverage(r.id)}</div></div>${badge(r.rating)}</div>`).join(''):'<p class="op-note">No risks in this cell.</p>'))}
function renderDrawer(){const d=UI.drawer;if(!d)return;const find=(a,id)=>a.find(x=>x.id===id);
 const m={issue:()=>drawIssue(find(S.issues,d.id)),control:()=>drawControl(find(S.controls,d.id)),kri:()=>drawKri(find(S.kris,d.id)),loss:()=>drawLoss(find(S.losses,d.id)),policy:()=>drawPolicy(find(S.policies,d.id)),vendor:()=>drawVendor(find(S.vendors,d.id)),cell:()=>drawCell(d.id),metric:()=>drawMetric(d.id)}[d.type];try{m()}catch(e){console.error('Record view failed',d,e);closeDrawer()}}

// ---------- dashboard snapshot + nav badges ----------
function renderSnapshot(){
 const dash=$('#view-dashboard');let host=$('#opSnapshot');if(!host){host=document.createElement('div');host.id='opSnapshot';const g=dash.querySelector('.grid');g?g.after(host):dash.appendChild(host)}
 const open=S.issues.filter(i=>i.status!=='Closed'),od=open.filter(isOverdue).length,bad=S.controls.filter(c=>c.result==='Ineffective').length,red=S.kris.filter(k=>kriStatus(k)==='Red').length,pol=S.policies.filter(p=>p.status==='Published'&&attPct(p)<80||polOverdue(p)).length,ven=S.vendors.filter(v=>['High','Critical'].includes(vRating(v))).length;
 const t=(v,l,n,f,c,k)=>`<article class="card op-tile drillable" data-op="goto" data-v="${v}"><div class="l">${l}</div><div class="v ${c}">${n}</div><div class="f">${f}</div></article>`;
 host.innerHTML=`<div class="panelhead" style="margin:4px 2px 9px"><div><div class="panel-title">Governance &amp; assurance snapshot</div><div class="panel-sub">Issues, controls, indicators, policies and third parties · click a tile to open the module</div></div></div><div class="grid" style="grid-template-columns:repeat(5,1fr)">${t('issues','Open issues',open.length,od?od+' overdue':'none overdue',od?'red':'')}${t('controls','Ineffective controls',bad,'of '+S.controls.length+' in library',bad?'red':'')}${t('kris','KRIs in red',red,'of '+S.kris.length+' indicators',red?'red':'')}${t('policies','Policies needing attention',pol,'overdue review or low attestation',pol?'amber':'')}${t('vendors','High-risk vendors',ven,'of '+S.vendors.length+' third parties',ven?'amber':'')}</div>`;
}
function renderBadges(){const set=(id,n)=>{const b=$('#opBadge-'+id);if(b){b.textContent=n;b.style.display=n?'':'none'}};set('issues',S.issues.filter(isOverdue).length);set('controls',S.controls.filter(c=>c.result==='Ineffective').length);set('kris',S.kris.filter(k=>kriStatus(k)==='Red').length);set('policies',S.policies.filter(polOverdue).length);set('vendors',S.vendors.filter(v=>['High','Critical'].includes(vRating(v))).length)}
function renderAll(){[renderIssues,renderControls,renderKris,renderPolicies,renderVendors,renderSnapshot,renderBadges,renderExec].forEach(f=>{try{f()}catch(e){console.error('OpenPages module render failed',f.name,e)}});renderDrawer()}
const commit=()=>{save();renderAll()};

// ---------- exports ----------
const csv=(name,rows,msg)=>{downloadCsv(name,rows);toast(msg)};

// ---------- actions ----------
function addTest(c,res,sample,exc,notes){const t={id:nextId('test','CT-',3),ctrl:c.id,date:TODAY,tester:me().name,result:res,sample,exc,notes};S.tests.unshift(t);c.lastTest=TODAY;c.result=res;c.tester=me().name;c.exc=exc;logIt(c.id,`Control test ${t.id} recorded: ${res} (${exc} exception(s) in sample of ${sample}).`);
 if(res==='Ineffective'||res==='Partially effective'){const i=createIssue({title:`${c.name} — ${res.toLowerCase()}`,source:'Control test',link:t.id,sev:res==='Ineffective'?'High':'Medium',owner:c.owner,due:addDays(TODAY,res==='Ineffective'?21:45),cause:'Control design / operation',desc:notes||`Test ${t.id} found ${exc} exception(s).`});toast(`Test ${t.id} recorded. Issue ${i.id} raised automatically.`)}else toast(`Test ${t.id} recorded: ${res}.`)}
const actions={
 'tab':b=>{const v=b.dataset.view,t=b.dataset.tab;UI.tab[v]=t;$$('#opTabs-'+v+' .libtab').forEach(x=>x.classList.toggle('active',x.dataset.tab===t));$$(`[data-panel^="${v}:"]`).forEach(p=>p.classList.toggle('show',p.dataset.panel===v+':'+t))},
 'open':b=>openDrawer(b.dataset.t,b.dataset.id),
 'risk':b=>{const r=risks.find(x=>x.id===b.dataset.id);if(r){closeDrawer();displayRisk(r)}},
 'goto':b=>{go(b.dataset.v);renderAll()},
 'drawer-close':closeDrawer,'form-close':closeForm,'form-submit':submitForm,
 'heat':b=>{UI.heat=b.dataset.m;renderKris()},
 'issue-export':()=>csv('forge-issues.csv',[['ID','Title','Source','Link','Severity','Owner','Due','Status','Escalation','Actions done','Actions total'],...S.issues.map(i=>[i.id,i.title,i.source,i.link,i.sev,i.owner,i.due,i.status,ESC[escLevel(i)],i.actions.filter(a=>a.done).length,i.actions.length])],'Issues exported as CSV.'),
 'ctrl-export':()=>csv('forge-controls.csv',[['ID','Control','Type','Nature','Frequency','Owner','Risks','Frameworks','Last test','Next test','Result'],...S.controls.map(c=>[c.id,c.name,c.type,c.nature,c.freq,c.owner,c.risks.join('|'),c.fw.join('|'),c.lastTest,ctrlNext(c),c.result])],'Controls exported as CSV.'),
 'kri-export':()=>csv('forge-kris.csv',[['ID','Indicator','Linked risk','Owner','Amber','Red','Latest','Status'],...S.kris.map(k=>[k.id,k.name,k.risk,k.owner,k.amber,k.red,k.series[k.series.length-1],kriStatus(k)])],'KRIs exported as CSV.'),
 'pol-export':()=>csv('forge-policies.csv',[['ID','Title','Type','Version','Owner','Status','Next review','Audience','Attested'],...S.policies.map(p=>[p.id,p.title,p.type,p.ver,p.owner,polStatus(p),p.review,p.aud,attCount(p)])],'Policies exported as CSV.'),
 'ven-export':()=>csv('forge-vendors.csv',[['ID','Vendor','Category','Tier','Owner','Score','Rating','Last assessed','Next due'],...S.vendors.map(v=>[v.id,v.name,v.cat,v.tier,v.owner,v.score,vRating(v),v.last,vNext(v)])],'Vendors exported as CSV.'),
 'issue-new':()=>openForm('New issue',[
  {name:'title',label:'Title',full:true,ph:'What is the problem?'},{name:'source',label:'Source',type:'select',options:['Audit finding','Control test','KRI breach','Loss event','Vendor assessment','Self-reported']},{name:'link',label:'Linked record (optional)',ph:'e.g. F-042, R-014'},
  {name:'sev',label:'Severity',type:'select',options:['Critical','High','Medium','Low'],value:'Medium'},{name:'owner',label:'Issue owner',type:'select',options:personOpts(),value:me().name},{name:'due',label:'Due date',type:'date',value:addDays(TODAY,30)},{name:'cause',label:'Root-cause category',type:'select',options:['Process / procedure','Control design','Documentation','Training','Access management','Resourcing / capacity','Third party','To be determined']},
  {name:'desc',label:'Description',type:'textarea',ph:'Context, impact and evidence'}],'Create issue',v=>{if(!v.title)return 'Add an issue title to continue.';const i=createIssue(v);commit();toast(`${i.id} created.`);openDrawer('issue',i.id)}),
 'act-new':b=>{const i=S.issues.find(x=>x.id===b.dataset.id);openForm('Add action to '+i.id,[{name:'text',label:'Action',full:true,ph:'Corrective or preventive action'},{name:'owner',label:'Action owner',type:'select',options:personOpts(),value:i.owner},{name:'due',label:'Due date',type:'date',value:i.due}],'Add action',v=>{if(!v.text)return 'Describe the action.';i.actions.push({id:nextId('action','ACT-',3),text:v.text,owner:v.owner,due:v.due||i.due,done:false});logIt(i.id,`Action added for ${v.owner}: ${v.text}`);commit()})},
 'act-toggle':b=>{const i=S.issues.find(x=>x.id===b.dataset.id),a=i.actions.find(x=>x.id===b.dataset.aid);if(!canAct(a.owner)){toast(`Only ${a.owner} or an administrator can update this action.`);renderDrawer();return}a.done=!a.done;logIt(i.id,`Action ${a.done?'completed':'reopened'}: ${a.text}`);commit()},
 'issue-step':b=>{const i=S.issues.find(x=>x.id===b.dataset.id);
  if(i.status==='Open'){if(!canAct(i.owner))return toast(`Only ${i.owner} or an administrator can start remediation.`);i.status='In remediation'}
  else if(i.status==='In remediation'){if(!canAct(i.owner))return toast(`Only ${i.owner} or an administrator can submit for verification.`);if(!i.actions.length)return toast('Add at least one action first.');if(i.actions.some(a=>!a.done))return toast('Complete all actions before submitting for verification.');i.status='Pending verification'}
  else if(i.status==='Pending verification'){if(me().name===i.owner)return toast('Segregation of duties: the issue owner cannot verify and close their own issue.');i.status='Closed';i.verifiedBy=me().name}
  logIt(i.id,`Status changed to ${i.status}.`);commit();toast(`${i.id} is now ${i.status}.`)},
 'issue-reopen':b=>{const i=S.issues.find(x=>x.id===b.dataset.id);i.status='In remediation';i.verifiedBy=null;logIt(i.id,'Issue reopened.');commit()},
 'ctrl-new':()=>openForm('New control',[{name:'name',label:'Control description',full:true},{name:'type',label:'Type',type:'select',options:['Preventive','Detective','Corrective']},{name:'nature',label:'Nature',type:'select',options:['Manual','Automated']},{name:'freq',label:'Test frequency',type:'select',options:Object.keys(FREQ),value:'Quarterly'},{name:'owner',label:'Control owner',type:'select',options:personOpts(),value:me().name},{name:'risk',label:'Mitigates risk',type:'select',options:riskOpts(true)},{name:'fw',label:'Framework',type:'select',options:['ISO 9001','ISO 14001','ISO 45001','NIST CSF','ISO 37301']}],'Add control',v=>{if(!v.name)return 'Describe the control.';const pre={Production:'OH',Environment:'EN',Cybersecurity:'OT',Quality:'QA','Supply chain':'SC'},rk=risks.find(r=>r.id===v.risk),id=(pre[rk?.area]||'GC')+'-'+String(30+S.controls.length);S.controls.push({id,name:v.name,type:v.type,nature:v.nature,freq:v.freq,owner:v.owner,area:rk?.area||'General',risks:v.risk?[v.risk]:[],fw:[v.fw],lastTest:TODAY,result:'Not tested',tester:'—',exc:0});logIt(id,'Control added to library.');commit();toast(`Control ${id} added. Record a test to rate it.`)}),
 'test-new':b=>{const pre=b&&b.dataset.id;openForm('Record control test',[{name:'ctrl',label:'Control',type:'select',full:true,options:S.controls.map(c=>[c.id,`${c.id} · ${c.name}`]),value:pre||S.controls[0].id},{name:'result',label:'Result',type:'select',options:['Effective','Partially effective','Ineffective'],value:'Effective'},{name:'sample',label:'Sample size',type:'number',value:'25'},{name:'exc',label:'Exceptions found',type:'number',value:'0'},{name:'notes',label:'Test notes / evidence reference',type:'textarea'}],'Save test result',v=>{const c=S.controls.find(x=>x.id===v.ctrl);if(c.owner===me().name)return `Segregation of duties: ${me().name} owns ${c.id} and cannot test it. Switch demo user.`;addTest(c,v.result,+v.sample||0,+v.exc||0,v.notes);commit()})},
 'ctrl-issue':b=>{const c=S.controls.find(x=>x.id===b.dataset.id),t=S.tests.find(x=>x.ctrl===c.id);raise('Control test',t?t.id:c.id,`${c.name} — ${c.result.toLowerCase()}`,c.result==='Ineffective'?'High':'Medium',c.owner,`Control ${c.id} last tested ${c.result.toLowerCase()}.`,'Control design / operation')},
 'rcsa-attest':b=>{const a=S.rcsa[0].assign[+b.dataset.i];a.status='Attested';a.date=TODAY;a.comment='';logIt(S.rcsa[0].id,`${a.owner} attested control ${a.ctrl}.`);commit();toast(`${a.ctrl} attested.`)},
 'rcsa-exc':b=>{const a=S.rcsa[0].assign[+b.dataset.i];openForm('Report exception for '+a.ctrl,[{name:'c',label:'What is not working as designed?',type:'textarea',full:true}],'Submit exception',v=>{if(!v.c)return 'Describe the exception.';a.status='Exception';a.date=TODAY;a.comment=v.c;logIt(S.rcsa[0].id,`${a.owner} reported an exception on ${a.ctrl}.`);commit();raise('RCSA exception',a.ctrl,`RCSA exception on ${a.ctrl}`,'Medium',a.owner,v.c,'Control design / operation')})},
 'rcsa-new':()=>openForm('Launch RCSA campaign',[{name:'name',label:'Campaign name',full:true,value:'Q1 2027 plant control self-assessment'},{name:'due',label:'Response due date',type:'date',value:addDays(TODAY,21)}],'Launch campaign',v=>{if(!v.name)return 'Name the campaign.';const id='RCSA-'+TODAY.slice(0,4)+'-'+String(S.seq.camp++).padStart(2,'0');S.rcsa.unshift({id,name:v.name,due:v.due,launched:TODAY,assign:S.controls.map(c=>({ctrl:c.id,owner:c.owner,status:'Pending',date:'',comment:''}))});logIt(id,`Campaign launched for ${S.controls.length} controls.`);commit();toast(`${id} launched.`)}),
 'appetite':b=>{S.appetite=+b.value;commit()},
 'risk-issue':b=>{const r=risks.find(x=>x.id===b.dataset.id);raise('Risk treatment',r.id,`Residual risk above appetite: ${r.name}`,r.score>=20?'Critical':'High',r.owner,`Residual score ${r.score} exceeds the appetite threshold of ${S.appetite}.`,'To be determined')},
 'kri-log':b=>{const pre=b&&b.dataset.id;openForm('Log KRI reading',[{name:'k',label:'Indicator',type:'select',full:true,options:S.kris.map(k=>[k.id,`${k.id} · ${k.name}`]),value:pre||S.kris[0].id},{name:'v',label:'Reading for this period',type:'number',step:'any',ph:'e.g. 14'}],'Save reading',v=>{if(v.v===''||isNaN(+v.v))return 'Enter a numeric reading.';const k=S.kris.find(x=>x.id===v.k);k.series.push(+v.v);if(k.series.length>8)k.series.shift();logIt(k.id,`Reading ${v.v} logged (${kriStatus(k)}).`);commit();toast(`${k.id}: ${v.v} is ${kriStatus(k)}.`)})},
 'kri-issue':b=>{const k=S.kris.find(x=>x.id===b.dataset.id),st=kriStatus(k);raise('KRI breach',k.id,`KRI ${st.toLowerCase()}: ${k.name}`,st==='Red'?'High':'Medium',k.owner,`Latest reading ${k.series[k.series.length-1]} against amber ${k.amber} / red ${k.red}.`,'To be determined')},
 'loss-new':()=>openForm('Log loss or near-miss event',[{name:'title',label:'What happened?',full:true},{name:'cat',label:'Category',type:'select',options:['Equipment failure','Safety incident','Environmental release','Quality escape','Supply disruption','Cyber / OT','Near miss']},{name:'risk',label:'Linked risk',type:'select',options:riskOpts()},{name:'date',label:'Event date',type:'date',value:TODAY},{name:'gross',label:'Gross loss (₹)',type:'number',value:'0'},{name:'rec',label:'Recovered (₹)',type:'number',value:'0'}],'Log event',v=>{if(!v.title)return 'Describe the event.';if((+v.rec||0)>(+v.gross||0))return 'Recoveries cannot exceed the gross loss.';const id=nextId('loss','LE-',3);S.losses.unshift({id,date:v.date||TODAY,title:v.title,cat:v.cat,risk:v.risk,gross:+v.gross||0,rec:+v.rec||0,status:'Under investigation',reporter:me().name});logIt(id,`Loss event logged: ${v.title}`);commit();toast(`${id} logged.`)}),
 'loss-issue':b=>{const l=S.losses.find(x=>x.id===b.dataset.id),r=risks.find(x=>x.id===l.risk);raise('Loss event',l.id,`Follow-up on ${l.id}: ${l.title}`,l.gross>=300000?'High':'Medium',r?r.owner:l.reporter,`${l.cat} with net loss ${inr(l.gross-l.rec)}.`,'To be determined')},
 'loss-close':b=>{const l=S.losses.find(x=>x.id===b.dataset.id);l.status='Closed';logIt(l.id,'Investigation closed.');commit()},
 'pol-new':()=>openForm('New controlled document',[{name:'title',label:'Title',full:true},{name:'type',label:'Type',type:'select',options:['Policy','Procedure','SOP','Plan']},{name:'owner',label:'Document owner',type:'select',options:personOpts(),value:me().name},{name:'aud',label:'Attestation audience (people)',type:'number',value:'100'},{name:'review',label:'Review date',type:'date',value:addDays(TODAY,365)},{name:'fw',label:'Framework',type:'select',options:['ISO 9001','ISO 14001','ISO 45001','NIST CSF','ISO 37301']}],'Create draft',v=>{if(!v.title)return 'Add a title.';const id=nextId('policy','POL-',3);S.policies.unshift({id,title:v.title,type:v.type,ver:'0.1',owner:v.owner,status:'Draft',review:v.review,aud:+v.aud||0,att:0,fw:[v.fw],ctrls:[],attBy:[]});logIt(id,'Draft v0.1 created.');commit();openDrawer('policy',id)}),
 'pol-step':b=>{const p=S.policies.find(x=>x.id===b.dataset.id);
  if(p.status==='Draft'){if(!canAct(p.owner))return toast(`Only ${p.owner} or an administrator can submit this draft.`);p.status='In review'}
  else if(p.status==='In review'){if(me().name===p.owner)return toast('Segregation of duties: the document owner cannot approve their own document.');p.status='Approved'}
  else if(p.status==='Approved'){if(!canAct(p.owner))return toast(`Only ${p.owner} or an administrator can publish.`);p.status='Published';p.ver=p.ver.startsWith('0.')?'1.0':p.ver;p.att=0;p.attBy=[]}
  logIt(p.id,`v${p.ver} moved to ${p.status}.`);commit();toast(`${p.id} is now ${p.status}.`)},
 'pol-attest':b=>{const p=S.policies.find(x=>x.id===b.dataset.id);if(!p.attBy.includes(me().name)){p.attBy.push(me().name);logIt(p.id,`${me().name} attested to v${p.ver}.`);commit();toast('Attestation recorded.')}},
 'pol-revise':b=>{const p=S.policies.find(x=>x.id===b.dataset.id),[maj,min]=p.ver.split('.').map(Number);p.ver=`${maj}.${(min||0)+1}`;p.status='Draft';p.att=0;p.attBy=[];logIt(p.id,`New version v${p.ver} drafted from published copy.`);commit()},
 'pol-reviewed':b=>{const p=S.policies.find(x=>x.id===b.dataset.id);if(!canAct(p.owner))return toast(`Only ${p.owner} or an administrator can confirm the review.`);p.review=addDays(TODAY,365);logIt(p.id,'Periodic review completed with no change; next review in 12 months.');commit()},
 'ven-new':()=>openForm('Onboard vendor',[{name:'name',label:'Vendor name',full:true},{name:'cat',label:'Category / service',ph:'e.g. Raw material · castings'},{name:'tier',label:'Criticality tier',type:'select',options:[['1','Tier 1 · critical'],['2','Tier 2 · important'],['3','Tier 3 · standard']],value:'2'},{name:'owner',label:'Relationship owner',type:'select',options:personOpts(),value:me().name},{name:'single',label:'Single source?',type:'select',options:['No','Yes']},{name:'end',label:'Contract end date',type:'date',value:addDays(TODAY,365)}],'Onboard vendor',v=>{if(!v.name)return 'Add the vendor name.';const id=nextId('vendor','V-',3);S.vendors.push({id,name:v.name,cat:v.cat||'Unspecified',tier:+v.tier,owner:v.owner,single:v.single==='Yes',risks:[],contractEnd:v.end,last:addDays(TODAY,-366),score:50,inherent:'High',hist:[]});logIt(id,'Vendor onboarded; due-diligence assessment required.');commit();toast(`${id} added. Run the due-diligence assessment.`);openDrawer('vendor',id)}),
 'ven-assess':b=>{const v=S.vendors.find(x=>x.id===b.dataset.id);openForm('Due-diligence assessment · '+v.name,QUESTIONS.map((q,i)=>({name:'q'+i,label:`${q[0]}: ${q[1]}`,type:'select',full:true,options:['Yes','Partial','No','N/A'],value:'Yes'})),'Score & save',a=>{let pts=0,n=0;QUESTIONS.forEach((q,i)=>{const x=a['q'+i];if(x==='N/A')return;n++;pts+=x==='Yes'?1:x==='Partial'?.5:0});if(!n)return 'Answer at least one question.';const sc=Math.round(pts/n*100);v.score=sc;v.last=TODAY;v.hist.push({date:TODAY,score:sc,by:me().name,ans:QUESTIONS.map((q,i)=>[q[0],a['q'+i]])});logIt(v.id,`Assessment completed: score ${sc} (${ratingOf(sc)}).`);commit();toast(`${v.name}: score ${sc} · ${ratingOf(sc)} risk.`);if(sc<50)raise('Vendor assessment',v.id,`Critical third-party risk: ${v.name}`,'Critical',v.owner,`Due-diligence score ${sc}/100.`,'Third party')})},
 'ven-issue':b=>{const v=S.vendors.find(x=>x.id===b.dataset.id);raise('Vendor assessment',v.id,`Third-party risk: ${v.name}`,vRating(v)==='Critical'?'Critical':'High',v.owner,`Due-diligence score ${v.score}/100 (${vRating(v)}).`,'Third party')}
};
// ---------- executive (management) dashboard ----------
// Every tile, chart bar, heatmap cell and table row is clickable and opens the records behind the number.
const XF=UI.x={area:'All',owner:'All',period:'365'};
const AREAS=['Production','Environment','Supply chain','Cybersecurity','Quality'],PERIODS=[['30','Last 30 days'],['90','Last 90 days'],['365','Last 12 months'],['all','All time']];
const monthKey=iso=>iso.slice(0,7);
const riskArea=id=>(risks.find(r=>r.id===id)||{}).area;
const areaOk=a=>XF.area==='All'||a===XF.area,ownerOk=o=>XF.owner==='All'||o===XF.owner;
function xData(){
 const rs=risks.filter(r=>areaOk(r.area)&&ownerOk(r.owner));
 const issues=S.issues.filter(i=>ownerOk(i.owner)&&(XF.area==='All'||issueRisks(i).some(id=>riskArea(id)===XF.area)));
 const ctrls=S.controls.filter(c=>areaOk(c.area)&&ownerOk(c.owner));
 const kris=S.kris.filter(k=>ownerOk(k.owner)&&areaOk(riskArea(k.risk)));
 const cut=XF.period==='all'?'0000-00-00':addDays(TODAY,-(+XF.period));
 const losses=S.losses.filter(l=>l.date>=cut&&ownerOk(l.reporter)&&(XF.area==='All'||riskArea(l.risk)===XF.area));
 const vendors=S.vendors.filter(v=>ownerOk(v.owner)&&(XF.area==='All'||v.risks.some(id=>riskArea(id)===XF.area)));
 const cids=new Set(ctrls.map(c=>c.id));
 const policies=S.policies.filter(p=>ownerOk(p.owner)&&(XF.area==='All'||p.ctrls.some(id=>S.controls.find(c=>c.id===id&&c.area===XF.area))));
 return{rs,issues,ctrls,kris,losses,vendors,policies,cut};
}
const net=l=>l.gross-l.rec;
const ageBucket=i=>{if(i.status==='Closed')return -1;if(!isOverdue(i))return 0;const d=dayN(TODAY)-dayN(i.due);return d<=7?1:d<=14?2:3};
const AGE=['Not yet due','Overdue 1–7 days','Overdue 8–14 days','Overdue 15+ days'];
const kriWorse=k=>k.series.length>1&&k.series[k.series.length-1]>k.series[k.series.length-2];

// ---- drill-down lists: key -> {kicker,title,note,rows:[{id,sub,pill}]}
function metric(key){
 const d=xData(),ap=S.appetite,[k,arg]=key.split(':');
 const R=(id,sub,p)=>({id,sub,pill:p||''});
 const risksRows=a=>a.map(r=>R(r.id,`${r.area} · ${r.owner} · residual ${r.score} · control coverage ${riskCoverage(r.id)}`,badge(r.rating)));
 const issueRows=a=>a.map(i=>R(i.id,`${i.sev} · ${i.owner} · due ${fmt(i.due)}${isOverdue(i)?` · ${dayN(TODAY)-dayN(i.due)} days overdue (${ESC[escLevel(i)]})`:''} · ${i.actions.filter(x=>x.done).length}/${i.actions.length} actions`,pill(i.status,stK[isOverdue(i)?'Overdue':i.status]||'blue')));
 const ctlRows=a=>a.map(c=>R(c.id,`${c.area} · ${c.owner} · last tested ${fmt(c.lastTest)}${ctrlDue(c)?' · test overdue':''}`,pill(c.result,resK[c.result])));
 const M={
  'risk-out':()=>['Risk','Risks outside appetite (score above '+ap+')','Highest residual score first. Open a risk to see its treatment, or raise an issue from the register.',risksRows(d.rs.filter(r=>r.score>ap).sort((a,b)=>b.score-a.score))],
  'exposure':()=>['Risk','Residual exposure by risk','All risks in the current view, ranked by residual score.',risksRows([...d.rs].sort((a,b)=>b.score-a.score))],
  'area':()=>['Risk',`${arg} risks`,'Risks in this operational area for the selected owner.',risksRows(risks.filter(r=>r.area===arg&&ownerOk(r.owner)).sort((a,b)=>b.score-a.score))],
  'issue-od':()=>['Issues','Overdue issues','Oldest first. Level shows who the escalation has reached.',issueRows(d.issues.filter(isOverdue).sort((a,b)=>a.due<b.due?-1:1))],
  'issue-open':()=>['Issues','All open issues','Everything not yet closed in the current view.',issueRows(d.issues.filter(i=>i.status!=='Closed').sort((a,b)=>a.due<b.due?-1:1))],
  'age':()=>['Issues',AGE[arg],'Open issues in this ageing bucket.',issueRows(d.issues.filter(i=>ageBucket(i)===+arg))],
  'ctl-bad':()=>['Controls','Ineffective or partially effective controls','Controls whose latest test found failures.',ctlRows(d.ctrls.filter(c=>c.result==='Ineffective'||c.result==='Partially effective'))],
  'ctl-due':()=>['Controls','Controls with an overdue test','The next test date has passed.',ctlRows(d.ctrls.filter(ctrlDue))],
  'ctl':()=>['Controls',`Controls · ${arg}`,'Latest test result across the control library.',ctlRows(d.ctrls.filter(c=>c.result===arg))],
  'kri-red':()=>['Indicators','Key risk indicators in red','Breached the red threshold. Open one to log a reading or raise an issue.',d.kris.filter(x=>kriStatus(x)==='Red').map(x=>R(x.id,`${x.name} · latest ${x.series[x.series.length-1]}${x.unit} · red at ${x.red} · ${x.owner}`,pill('Red','red')))],
  'kri-all':()=>['Indicators','All key risk indicators','Status of every indicator in the current view.',d.kris.map(x=>R(x.id,`${x.name} · latest ${x.series[x.series.length-1]}${x.unit} · ${x.owner}${kriWorse(x)?' · worsening':''}`,pill(kriStatus(x),ragK[kriStatus(x)])))],
  'loss':()=>['Losses','Loss and near-miss events',`Events from ${XF.period==='all'?'all time':'the selected period'}. Net loss = gross loss minus recoveries.`,d.losses.sort((a,b)=>a.date<b.date?1:-1).map(l=>R(l.id,`${fmt(l.date)} · ${l.cat} · gross ${inr(l.gross)} · recovered ${inr(l.rec)} · ${l.status}`,pill(inr(net(l)),net(l)>=300000?'red':net(l)>0?'amber':'green')))],
  'lossm':()=>['Losses',`Loss events · ${MON[+arg.slice(5)-1]} ${arg.slice(0,4)}`,'Events dated in this month.',S.losses.filter(l=>monthKey(l.date)===arg&&ownerOk(l.reporter)&&(XF.area==='All'||riskArea(l.risk)===XF.area)).map(l=>R(l.id,`${fmt(l.date)} · ${l.cat} · gross ${inr(l.gross)} · recovered ${inr(l.rec)}`,pill(inr(net(l)),net(l)>=300000?'red':net(l)>0?'amber':'green')))],
  'vendor-high':()=>['Third parties','High and critical risk third parties','Lowest due-diligence score first.',d.vendors.filter(v=>['High','Critical'].includes(vRating(v))).sort((a,b)=>a.score-b.score).map(v=>R(v.id,`Tier ${v.tier} · ${v.cat} · score ${v.score}/100 · ${v.owner}${v.single?' · single source':''}${vDue(v)?' · reassessment overdue':''}`,badge(vRating(v))))],
  'policy':()=>['Policies','Policies needing attention','Review overdue, or attestation below 80%.',d.policies.filter(p=>polOverdue(p)||(p.status==='Published'&&attPct(p)<80)).map(p=>R(p.id,`${p.type} v${p.ver} · ${p.owner} · attested ${attPct(p)}% · review ${fmt(p.review)}`,pill(polStatus(p),polK[polStatus(p)])))],
  'owner':()=>['People',`Accountability · ${arg}`,'Everything this person owns that needs attention.',[
    ...risks.filter(r=>r.owner===arg&&r.score>ap).map(r=>R(r.id,`Risk outside appetite · residual ${r.score}`,badge(r.rating))),
    ...S.issues.filter(i=>i.owner===arg&&isOverdue(i)).map(i=>R(i.id,`Overdue issue · ${dayN(TODAY)-dayN(i.due)} days`,pill(i.sev,sevK(i.sev)))),
    ...S.controls.filter(c=>c.owner===arg&&(c.result==='Ineffective'||ctrlDue(c))).map(c=>R(c.id,c.result==='Ineffective'?'Ineffective control':'Control test overdue',pill(c.result,resK[c.result]))),
    ...S.kris.filter(x=>x.owner===arg&&kriStatus(x)==='Red').map(x=>R(x.id,'Indicator in red',pill('Red','red')))]]
 };
 const r=(M[k]||M['risk-out'])();
 return{kicker:r[0],title:r[1],note:r[2],rows:r[3],key};
}
function drawMetric(key){
 const m=metric(key);
 setDrawer(m.kicker,m.title,`<p class="op-note" style="margin:0 0 8px">${m.note}</p><div class="op-btns" style="margin-top:0"><button class="op-mini" data-op="x-export" data-key="${E(key)}">↓ Export this list</button></div>`+(m.rows.length?m.rows.map(r=>`<div class="op-li"><div>${lk(r.id)}<div class="riskarea">${E(r.sub)}</div></div>${r.pill}</div>`).join(''):'<p class="op-note">Nothing here for the current filters.</p>'));
}

// ---- the view
const xSec=document.createElement('section');xSec.className='view';xSec.id='view-exec';
$('.content').appendChild(xSec);views.push('exec');labels.exec='Executive view';
const dashBtn=$('.nav button[data-view="dashboard"]');
if(dashBtn){const b=document.createElement('button');b.dataset.view='exec';b.innerHTML='<span class="ico">◐</span><span class="navtext">Executive view</span><span class="badge" id="opBadge-exec" style="display:none"></span>';dashBtn.after(b);b.addEventListener('click',()=>{go('exec');renderAll()})}
const dHead=$('#view-dashboard .head-actions');if(dHead){const b=document.createElement('button');b.className='btn primary';b.dataset.op='goto';b.dataset.v='exec';b.innerHTML='<span class="btnico">◐</span>Executive view';dHead.prepend(b)}
const xcss=document.createElement('style');xcss.textContent=`
.x-filters{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:14px}.x-filters label{font:500 9px 'DM Mono';letter-spacing:.8px;color:#8a95a3;text-transform:uppercase}.x-chip{border:1px solid #cce4dd;background:#f1faf7;color:#187766;border-radius:12px;padding:4px 9px;font-size:10px;font-weight:600}
.x-tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-bottom:14px}.x-tile{padding:15px 16px;cursor:pointer;border-top:3px solid #e8ebef;transition:.15s}.x-tile:hover{box-shadow:0 8px 22px #22334a1c;transform:translateY(-1px)}.x-tile.red{border-top-color:#cb554d}.x-tile.amber{border-top-color:#d48a24}.x-tile.green{border-top-color:#178b78}
.x-tile .l{font-size:10px;font-weight:600;color:#778293;display:flex;justify-content:space-between}.x-tile .v{font:700 27px Manrope;letter-spacing:-1px;margin:6px 0 2px}.x-tile.red .v{color:#bf554d}.x-tile.amber .v{color:#c2791a}.x-tile.green .v{color:#178b78}.x-tile .f{font-size:9.5px;color:#8a95a3}.x-tile .go{font-size:9px;color:#6784a2;margin-top:8px;font-weight:600}
.x-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:14px;margin-bottom:14px}.x-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:14px}
.x-row{display:grid;grid-template-columns:110px 1fr 54px;gap:10px;align-items:center;padding:6px 4px;border-radius:6px;cursor:pointer;font-size:10px;color:#586779}.x-row:hover,.x-row.sel{background:#f3f6f9}.x-row.sel{outline:1px solid #cdd9e6}.x-stack{display:flex;height:10px;border-radius:5px;overflow:hidden;background:#f0f2f5}.x-stack i{display:block;height:100%}.x-row .n{text-align:right;font:10px 'DM Mono';color:#516174}
.x-att{display:grid;grid-template-columns:22px 1fr auto auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #f0f2f4;font-size:10px}.x-att:last-child{border-bottom:0}.x-att .ic{width:22px;height:22px;border-radius:6px;display:grid;place-items:center;font-size:11px;background:#fcebea;color:#ad4b45}.x-att .ic.a{background:#fff4e1;color:#a66b13}.x-att .m{font-size:9px;color:#8a95a3;margin-top:2px}
.x-bars{display:flex;align-items:flex-end;gap:10px;height:150px;padding:6px 4px 0}.x-bar{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;cursor:pointer;border-radius:6px}.x-bar:hover{background:#f3f6f9}.x-bar .col{width:70%;min-height:2px;border-radius:5px 5px 0 0;background:#6487c0}.x-bar .val{font:9px 'DM Mono';color:#516174;margin-bottom:3px}.x-bar .lab{font:9px 'DM Mono';color:#8a95a3;margin-top:6px}
.x-kri{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.x-kt{border:1px solid #edf0f2;border-radius:8px;padding:9px 10px;cursor:pointer;background:#fff}.x-kt:hover{border-color:#aeb8c5}.x-kt.Red{border-left:3px solid #cb554d}.x-kt.Amber{border-left:3px solid #d48a24}.x-kt.Green{border-left:3px solid #178b78}.x-kt .n{font-size:9px;color:#586779;line-height:1.35;min-height:24px}.x-kt .vv{display:flex;justify-content:space-between;align-items:center;margin-top:4px;font:600 13px Manrope}
tr.x-own{cursor:pointer}tr.x-own.sel{background:#f3f6f9}.x-num{font:600 11px 'DM Mono'}.x-num.r{color:#bf554d}
@media(max-width:1100px){.x-tiles{grid-template-columns:repeat(2,1fr)}.x-grid,.x-grid3{grid-template-columns:1fr}}@media(max-width:600px){.x-tiles{grid-template-columns:1fr}.x-kri{grid-template-columns:repeat(2,1fr)}}`;
document.head.appendChild(xcss);

function renderExec(){
 const d=xData(),ap=S.appetite;
 const sel=(k,opts,cur)=>`<select class="select" data-xf="${k}">${opts.map(o=>`<option value="${E(o[0])}"${o[0]===cur?' selected':''}>${E(o[1])}</option>`).join('')}</select>`;
 const filtered=XF.area!=='All'||XF.owner!=='All';
 // headline numbers
 const out=d.rs.filter(r=>r.score>ap),avg=d.rs.length?(d.rs.reduce((s,r)=>s+r.score,0)/d.rs.length):0;
 const od=d.issues.filter(isOverdue),hiOd=od.filter(i=>['High','Critical'].includes(i.sev)),openI=d.issues.filter(i=>i.status!=='Closed');
 const tested=d.ctrls.filter(c=>c.result!=='Not tested'),eff=tested.filter(c=>c.result==='Effective').length,effPct=tested.length?Math.round(eff/tested.length*100):0,ineff=d.ctrls.filter(c=>c.result==='Ineffective').length,cDue=d.ctrls.filter(ctrlDue).length;
 const red=d.kris.filter(k=>kriStatus(k)==='Red'),worse=d.kris.filter(kriWorse).length;
 const gross=d.losses.reduce((s,l)=>s+l.gross,0),rec=d.losses.reduce((s,l)=>s+l.rec,0);
 const hv=d.vendors.filter(v=>['High','Critical'].includes(vRating(v))),vd=d.vendors.filter(vDue).length;
 const pub=d.policies.filter(p=>p.status==='Published'),att=pub.length?Math.round(pub.reduce((s,p)=>s+attPct(p),0)/pub.length):0,polBad=d.policies.filter(p=>polOverdue(p)||(p.status==='Published'&&attPct(p)<80)).length;
 const tile=(key,l,v,f,k,ic)=>`<article class="card x-tile ${k}" data-op="x-open" data-key="${key}"><div class="l"><span>${l}</span><span>${ic}</span></div><div class="v">${v}</div><div class="f">${f}</div><div class="go">View records →</div></article>`;
 const tiles=[
  tile('risk-out','Risks outside appetite',`${out.length}<span style="font-size:15px;color:#8a95a3"> / ${d.rs.length}</span>`,`Appetite score ${ap} · avg residual ${avg.toFixed(1)}`,out.length>2?'red':out.length?'amber':'green','◈'),
  tile('issue-od','Overdue issues',od.length,`${hiOd.length} high / critical · ${openI.length} open in total`,hiOd.length?'red':od.length?'amber':'green','⚑'),
  tile('ctl-bad','Control effectiveness',effPct+'%',`${ineff} ineffective · ${cDue} test${cDue===1?'':'s'} overdue`,effPct<75?'red':effPct<90?'amber':'green','⛨'),
  tile('kri-red','Indicators in red',`${red.length}<span style="font-size:15px;color:#8a95a3"> / ${d.kris.length}</span>`,`${worse} indicator${worse===1?'':'s'} worsening on last reading`,red.length>2?'red':red.length?'amber':'green','◬'),
  tile('loss','Net loss · '+(PERIODS.find(p=>p[0]===XF.period)||[])[1].toLowerCase(),inr(gross-rec),`Gross ${inr(gross)} · recovered ${inr(rec)} · ${d.losses.length} events`,gross-rec>600000?'red':gross-rec>0?'amber':'green','₹'),
  tile('vendor-high','High-risk third parties',hv.length,`${vd} reassessment${vd===1?'':'s'} overdue · ${d.vendors.filter(v=>v.single).length} single-source`,hv.length>2?'red':hv.length?'amber':'green','⇄'),
  tile('policy','Policy attestation',att+'%',`${polBad} polic${polBad===1?'y':'ies'} need attention`,att<80?'red':att<92?'amber':'green','☰'),
  tile('exposure','Residual exposure',avg.toFixed(1),`Average residual score (1–25) across ${d.rs.length} risks`,avg>12?'red':avg>8?'amber':'green','▦')
 ].join('');
 // attention list
 const A=[];
 d.issues.filter(isOverdue).forEach(i=>A.push({w:60+escLevel(i)*10+(['High','Critical'].includes(i.sev)?15:0),id:i.id,t:`${i.title}`,m:`${i.sev} issue · ${dayN(TODAY)-dayN(i.due)} days overdue · ${ESC[escLevel(i)]} · ${i.owner}`,o:i.owner,r:1}));
 d.rs.filter(r=>r.score>ap&&['No control','Weak'].includes(riskCoverage(r.id))).forEach(r=>A.push({w:50+r.score,id:r.id,t:r.name,m:`Outside appetite (${r.score}) with ${riskCoverage(r.id).toLowerCase()} control coverage · ${r.owner}`,o:r.owner,r:1}));
 d.ctrls.filter(c=>c.result==='Ineffective').forEach(c=>A.push({w:55,id:c.id,t:c.name,m:`Ineffective control${ctrlDue(c)?', test overdue':''} · ${c.owner}`,o:c.owner,r:1}));
 red.forEach(k=>A.push({w:52+(kriWorse(k)?5:0),id:k.id,t:k.name,m:`Red indicator${kriWorse(k)?' and worsening':''} · latest ${k.series[k.series.length-1]}${k.unit} vs red ${k.red} · ${k.owner}`,o:k.owner,r:1}));
 hv.filter(vDue).forEach(v=>A.push({w:45,id:v.id,t:v.name,m:`${vRating(v)} risk third party, reassessment overdue · score ${v.score} · ${v.owner}`,o:v.owner,r:0}));
 d.policies.filter(polOverdue).forEach(p=>A.push({w:35,id:p.id,t:p.title,m:`Review overdue since ${fmt(p.review)} · ${p.owner}`,o:p.owner,r:0}));
 A.sort((a,b)=>b.w-a.w);const attn=A.slice(0,7);
 const attnHtml=attn.length?attn.map(a=>`<div class="x-att"><div class="ic${a.r?'':' a'}">${a.r?'!':'◷'}</div><div><div class="riskname" style="font-size:11px">${lk(a.id)}</div><div class="m">${E(a.t.length>70?a.t.slice(0,68)+'…':a.t)}<br>${E(a.m)}</div></div><div></div><button class="op-mini" data-op="x-nudge" data-id="${a.id}" data-owner="${E(a.o)}">Ask for update</button></div>`).join(''):'<p class="op-note">Nothing needs executive attention for these filters.</p>';
 // heatmap
 const cells={};d.rs.forEach(r=>{const[l,i]=riskLI(r,UI.heat);(cells[l+'-'+i]=cells[l+'-'+i]||[]).push(r)});
 let grid='<div class="op-axis"></div>'+[1,2,3,4,5].map(i=>`<div class="op-axis">${i}</div>`).join('');
 for(let l=5;l>=1;l--){grid+=`<div class="op-axis">${l}</div>`;for(let i=1;i<=5;i++){const rs=cells[l+'-'+i]||[],sc=l*i;grid+=`<div class="op-cell${sc>ap?' out':''}" style="background:${heatCol(sc)}" data-op="open" data-t="cell" data-id="${l}-${i}">${rs.map(r=>`<span class="op-chip">${r.id}</span>`).join('')}<small>${sc}</small></div>`}}
 // risk by area
 const RK=['Critical','High','Medium','Low'],RC={Critical:'#cb554d',High:'#e08a52',Medium:'#e4b85c',Low:'#69ad9b'};
 const areaRows=AREAS.map(a=>{const rs=risks.filter(r=>r.area===a&&ownerOk(r.owner));const mx=Math.max(1,...AREAS.map(z=>risks.filter(r=>r.area===z&&ownerOk(r.owner)).length));
  return `<div class="x-row${XF.area===a?' sel':''}" data-op="x-area" data-a="${a}"><span>${a}</span><div class="x-stack" style="width:${rs.length/mx*100}%;min-width:${rs.length?8:0}px">${RK.map(k=>{const n=rs.filter(r=>r.rating===k).length;return n?`<i style="flex:${n};background:${RC[k]}" title="${n} ${k}"></i>`:''}).join('')}</div><span class="n">${rs.length} · ${rs.filter(r=>r.score>ap).length} out</span></div>`}).join('');
 // loss trend (6 months)
 const months=[];for(let i=5;i>=0;i--){const dt=new Date(TODAY+'T12:00:00Z');dt.setUTCMonth(dt.getUTCMonth()-i,1);months.push(`${dt.getUTCFullYear()}-${pad(dt.getUTCMonth()+1)}`)}
 const lm=months.map(m=>({m,v:S.losses.filter(l=>monthKey(l.date)===m&&ownerOk(l.reporter)&&(XF.area==='All'||riskArea(l.risk)===XF.area)).reduce((s,l)=>s+net(l),0)})),lmax=Math.max(1,...lm.map(x=>x.v));
 const lossBars=lm.map(x=>`<div class="x-bar" data-op="x-open" data-key="lossm:${x.m}"><div class="val">${x.v?'₹'+Math.round(x.v/1000)+'k':'–'}</div><div class="col" style="height:${Math.max(2,x.v/lmax*100)}%;${x.v>=300000?'background:#cb554d':''}"></div><div class="lab">${MON[+x.m.slice(5)-1]}</div></div>`).join('');
 // ageing + control results
 const ageN=[0,1,2,3].map(b=>d.issues.filter(i=>ageBucket(i)===b).length),ageMx=Math.max(1,...ageN),AK=['green','amber','amber','red'];
 const ageRows=AGE.map((l,b)=>`<div class="x-row" data-op="x-open" data-key="age:${b}"><span>${l}</span>${bar(ageN[b]/ageMx*100,AK[b])}<span class="n">${ageN[b]}</span></div>`).join('');
 const RES=['Effective','Partially effective','Ineffective','Not tested'],resN=RES.map(r=>d.ctrls.filter(c=>c.result===r).length),resMx=Math.max(1,...resN),RK2=['green','amber','red','amber'];
 const resRows=RES.map((l,i)=>`<div class="x-row" data-op="x-open" data-key="ctl:${l}"><span>${l}</span>${bar(resN[i]/resMx*100,RK2[i])}<span class="n">${resN[i]}</span></div>`).join('');
 // KRI board
 const kriTiles=d.kris.map(k=>{const st=kriStatus(k);return `<div class="x-kt ${st}" data-op="open" data-t="kri" data-id="${k.id}"><div class="n">${E(k.name)}</div><div class="vv"><span>${k.series[k.series.length-1]}${k.unit}</span>${spark(k)}</div></div>`}).join('');
 // owner accountability
 const owners=[...new Set([...risks.map(r=>r.owner),...S.issues.map(i=>i.owner),...S.controls.map(c=>c.owner),...S.kris.map(k=>k.owner)])].sort();
 const ownRows=owners.map(o=>({o,r:risks.filter(r=>r.owner===o&&r.score>ap).length,i:S.issues.filter(i=>i.owner===o&&isOverdue(i)).length,c:S.controls.filter(c=>c.owner===o&&(c.result==='Ineffective'||ctrlDue(c))).length,k:S.kris.filter(k=>k.owner===o&&kriStatus(k)==='Red').length})).map(x=>({...x,t:x.r+x.i+x.c+x.k})).sort((a,b)=>b.t-a.t);
 const n=(v)=>`<span class="x-num${v?' r':''}">${v||'–'}</span>`;
 const ownHtml=table(['Owner','Risks over appetite','Overdue issues','Control gaps','Red indicators','Total'],ownRows.map(x=>`<tr class="x-own${XF.owner===x.o?' sel':''}" data-op="x-owner" data-o="${E(x.o)}"><td>${own(x.o)}</td><td>${n(x.r)}</td><td>${n(x.i)}</td><td>${n(x.c)}</td><td>${n(x.k)}</td><td><b class="x-num">${x.t}</b></td></tr>`));
 $('#view-exec').innerHTML=`<div class="pagehead"><div><h1 class="title">Executive view</h1><div class="subtitle">Where the plant stands today, what needs a decision, and who owns it. Click any tile, bar, cell or row to see the records behind it.</div></div><div class="head-actions"><button class="btn" data-op="x-pack"><span class="btnico">↓</span>Export board pack</button><button class="btn" data-op="x-print"><span class="btnico">⎙</span>Print</button></div></div>
 <div class="x-filters"><label>Area</label>${sel('area',[['All','All areas'],...AREAS.map(a=>[a,a])],XF.area)}<label>Owner</label>${sel('owner',[['All','All owners'],...owners.map(o=>[o,o])],XF.owner)}<label>Losses</label>${sel('period',PERIODS,XF.period)}${filtered?`<span class="x-chip">Filtered view</span><button class="op-mini" data-op="x-reset">Clear filters</button>`:''}<span class="panel-sub" style="margin-left:auto">As of ${fmt(TODAY)} · demo data</span></div>
 <div class="x-tiles">${tiles}</div>
 <div class="x-grid">${card('Needs executive attention','Ranked by severity and how long it has been overdue',attnHtml)}<article class="card panel"><div class="panelhead"><div><div class="panel-title">${UI.heat==='inherent'?'Inherent':'Residual'} risk heatmap</div><div class="panel-sub">Red outline = above appetite (${ap}). Click a cell to list its risks.</div></div><div class="libtabs" style="margin:0;border:0"><button class="libtab${UI.heat==='inherent'?' active':''}" data-op="x-heat" data-m="inherent">Inherent</button><button class="libtab${UI.heat==='residual'?' active':''}" data-op="x-heat" data-m="residual">Residual</button></div></div><div class="op-heat">${grid}</div></article></div>
 <div class="x-grid3"><article class="card panel"><div class="panel-title">Risks by area</div><div class="panel-sub" style="margin-bottom:10px">Bar length = risk count, colour = rating. Click an area to filter the whole page.</div>${areaRows}<div class="op-legend" style="margin-top:8px">${RK.map(k=>`<span><i style="background:${RC[k]}"></i>${k}</span>`).join('')}</div></article>
 <article class="card panel"><div class="panel-title">Net loss by month</div><div class="panel-sub">Gross loss less recoveries. Red = ₹3 lakh or more. Click a month.</div><div class="x-bars">${lossBars}</div></article>
 <article class="card panel"><div class="panel-title">Issue ageing</div><div class="panel-sub" style="margin-bottom:10px">Open issues by how late they are.</div>${ageRows}<div class="panel-title" style="margin-top:16px">Control test results</div><div class="panel-sub" style="margin-bottom:10px">Latest result for each control.</div>${resRows}</article></div>
 <div class="x-grid">${card('Key risk indicators','Early-warning readings. Border colour = status; click to open the indicator.',`<div style="padding:0 16px 16px"><div class="x-kri">${kriTiles||'<p class="op-note">No indicators for these filters.</p>'}</div></div>`)}${card('Accountability by owner','Open items per person across risks, issues, controls and indicators. Click a row to filter.',ownHtml)}</div>`;
}
Object.assign(actions,{
 'x-open':b=>openDrawer('metric',b.dataset.key),
 'x-area':b=>{XF.area=XF.area===b.dataset.a?'All':b.dataset.a;renderExec()},
 'x-owner':b=>{XF.owner=XF.owner===b.dataset.o?'All':b.dataset.o;renderExec()},
 'x-reset':()=>{XF.area='All';XF.owner='All';renderExec()},
 'x-heat':b=>{UI.heat=b.dataset.m;renderAll()},
 'x-print':()=>window.print(),
 'x-nudge':b=>{logIt(b.dataset.id,`Management asked ${b.dataset.owner} for a status update.`);save();toast(`Update requested from ${b.dataset.owner} for ${b.dataset.id}.`)},
 'x-export':b=>{const m=metric(b.dataset.key);csv('forge-'+b.dataset.key.replace(/[^a-z0-9]+/gi,'-')+'.csv',[['Record','Detail'],...m.rows.map(r=>[r.id,r.sub])],'List exported as CSV.')},
 'x-pack':()=>{const d=xData(),ap=S.appetite;csv('forge-board-pack.csv',[['Measure','Value','Detail'],['Risks outside appetite',d.rs.filter(r=>r.score>ap).length,`of ${d.rs.length}; appetite ${ap}`],['Overdue issues',d.issues.filter(isOverdue).length,`${d.issues.filter(i=>i.status!=='Closed').length} open`],['Controls ineffective',d.ctrls.filter(c=>c.result==='Ineffective').length,`${d.ctrls.filter(ctrlDue).length} tests overdue`],['Indicators in red',d.kris.filter(k=>kriStatus(k)==='Red').length,`of ${d.kris.length}`],['Net loss',d.losses.reduce((s,l)=>s+net(l),0),`${d.losses.length} events`],['High-risk third parties',d.vendors.filter(v=>['High','Critical'].includes(vRating(v))).length,`of ${d.vendors.length}`]],'Board pack exported as CSV.')}
});
document.addEventListener('change',e=>{const k=e.target.dataset&&e.target.dataset.xf;if(k){XF[k]=e.target.value;renderExec()}});
document.addEventListener('click',e=>{const t=e.target.closest('[data-op]');if(!t||t.tagName==='SELECT'||(t.tagName==='INPUT'&&t.type!=='checkbox'))return;const op=t.dataset.op;if(op==='filter'||op==='appetite')return;if(t.tagName==='INPUT'&&op==='act-toggle'){actions[op](t);return}const fn=actions[op];if(fn)fn(t)});
document.addEventListener('change',e=>{const t=e.target;if(t.dataset.op==='appetite')actions.appetite(t);else if(t.dataset.op==='filter'){const k=t.dataset.fk;(UI.filters[k]=UI.filters[k]||{})[t.dataset.f]=t.value;renderAll()}});
document.addEventListener('input',e=>{const t=e.target;if(t.dataset.op==='filter'&&t.tagName==='INPUT'){const k=t.dataset.fk,pos=t.selectionStart;(UI.filters[k]=UI.filters[k]||{})[t.dataset.f]=t.value;renderAll();const n=$(`input[data-fk="${k}"]`);if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch{}}}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDrawer();closeForm()}});
drawer.addEventListener('click',e=>{if(e.target===drawer)closeDrawer()});fm.addEventListener('click',e=>{if(e.target===fm)closeForm()});
// refresh data-driven views when the demo user changes (permissions) or the risk register changes
document.addEventListener('change',e=>{if(e.target.id==='demoUserSwitch')setTimeout(renderAll,0)});
document.addEventListener('click',e=>{if(e.target.closest('#saveRisk'))setTimeout(renderAll,50)});
renderAll();
})();

