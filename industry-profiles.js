// Industry profiles: Manufacturing (original demo), BFSI (banking, financial services & insurance) and a
// cross-industry enterprise profile. A profile sets the risk register, taxonomy, seeded governance records,
// risk templates, dashboard wording and which add-on modules are shown. Switching reloads the page; each profile
// keeps its own saved data. Demo data only.
(function(){
const GRC=window.GRC=window.GRC||{};GRC.renders=GRC.renders||[];
const ini=n=>n.split(' ').map(s=>s[0]).join('');
const MON={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
const risk=a=>({id:a[0],name:a[1],area:a[2],inherent:a[3],rating:a[4],score:a[5],owner:a[6],initial:ini(a[6]),date:a[7],status:a[8]});
const addDays=(iso,n)=>new Date(Date.parse(iso+'T12:00:00Z')+n*864e5).toISOString().slice(0,10);
const FREQ={Monthly:30,Quarterly:91,'Semi-annual':182,Annual:365};

// ---------------------------------------------------------------- seed builder (same shape as the manufacturing seed)
function build(c){
 const ctl=c.controls.map(x=>({id:x[0],name:x[1],type:x[2],nature:x[3],freq:x[4],owner:x[5],area:x[6],risks:x[7],fw:x[8],lastTest:x[9],result:x[10],tester:x[11],exc:x[12]}));
 const tests=ctl.map((x,i)=>({id:'CT-'+(101+i),ctrl:x.id,date:x.lastTest,tester:x.tester,result:x.result,sample:x.freq==='Monthly'?12:x.freq==='Quarterly'?25:10,exc:x.exc,notes:x.exc?`${x.exc} exception(s) noted in sample.`:'No exceptions noted.'}));
 const assign=ctl.map((x,i)=>{const done=i<Math.ceil(ctl.length/2)-1;return{ctrl:x.id,owner:x.owner,status:i===ctl.length-3?'Exception':done?'Attested':'Pending',date:done||i===ctl.length-3?addDays('2026-10-01',i%11):'',comment:i===ctl.length-3?'Interim compensating review in place until the gap is fixed.':''}});
 const issue=(id,title,source,link,sv,owner,due,cause,status,actions,desc)=>({id,title,source,link,sev:sv,owner,due,created:addDays(due,-30),cause,status,desc:desc||'',verifiedBy:status==='Closed'?'Morgan Chen':null,actions:actions.map((a,i)=>({id:id+'-A'+(i+1),text:a[0],owner:a[1],due:a[2],done:!!a[3]}))});
 const nx=(a,d)=>Math.max(d,...a.map(x=>(+String(x[0]).replace(/\D/g,''))+1));
 return{v:1,appetite:c.appetite,seq:{issue:nx(c.issues,110),action:100,test:101+ctl.length,loss:nx(c.losses,20),policy:nx(c.policies,20),vendor:nx(c.vendors,20),camp:2},
  issues:c.issues.map(i=>issue(...i)),controls:ctl,tests,
  rcsa:[{id:'RCSA-2026-Q4',name:c.rcsaName,due:'2026-10-30',launched:'2026-10-01',assign}],
  kris:c.kris.map(k=>({id:k[0],name:k[1],risk:k[2],owner:k[3],dir:k[4],amber:k[5],red:k[6],series:k[7],unit:k[8]})),
  losses:c.losses.map(l=>({id:l[0],date:l[1],title:l[2],cat:l[3],risk:l[4],gross:l[5],rec:l[6],status:l[7],reporter:l[8]})),
  policies:c.policies.map(p=>({id:p[0],title:p[1],type:p[2],ver:p[3],owner:p[4],status:p[5],review:p[6],aud:p[7],att:p[8],fw:p[9],ctrls:p[10],attBy:[]})),
  vendors:c.vendors.map(v=>({id:v[0],name:v[1],cat:v[2],tier:v[3],owner:v[4],single:v[5],risks:v[6],contractEnd:v[7],last:v[8],score:v[9],inherent:v[10],hist:[{date:v[8],score:v[9],by:'Morgan Chen'}]})),
  log:[]};
}

// ---------------------------------------------------------------- BFSI
const BFSI={
 id:'bfsi',label:'BFSI (banking, financial services & insurance)',org:'Aurora Financial Group (Demo)',site:'Group',loc:'Mumbai · Regulated entities: bank, broker, insurer',
 orgWord:'organisation',subtitle:{risks:'Identify, assess and treat enterprise risks across credit, market, operational, technology, conduct and financial-crime domains.'},
 modules:['obligations','regchange','privacy','resilience','cyber','bcp','fincrime','audit'],
 owners:{GOV:'Morgan Chen',RISK:'Morgan Chen',TPR:'Sam Rivera',INC:'Sam Rivera',RES:'Sam Rivera',TEST:'Jordan Lee',PRIV:'Priya Shah',SEC:'Sam Rivera',DISC:'Morgan Chen',CONDUCT:'Morgan Chen',FC:'Jordan Lee',AI:'Evan Brooks'},
 adopt:['dpdp','rbi-itgrc','rbi-outsourcing','rbi-kyc','pmla','sebi-cscrf','sebi-lodr','dora','gdpr','nist-csf2','iso27001','pci-dss'],
 risks:[
  ['R-101','Concentration in unsecured retail lending','Credit risk','High','Medium',12,'Evan Brooks','Oct 24','Mitigating'],
  ['R-102','Rising stress in the MSME loan book','Credit risk','Critical','High',16,'Evan Brooks','Oct 16','Action needed'],
  ['R-103','Interest-rate risk in the banking book','Market & liquidity','High','Medium',10,'Priya Shah','Nov 05','Monitoring'],
  ['R-104','Liquidity shortfall under stress scenario','Market & liquidity','High','Medium',9,'Priya Shah','Oct 28','Mitigating'],
  ['R-105','Core banking platform outage','Technology & cyber','Critical','High',20,'Sam Rivera','Oct 14','Mitigating'],
  ['R-106','Ransomware on payment and card systems','Technology & cyber','Critical','High',16,'Sam Rivera','Oct 13','Action needed'],
  ['R-107','Concentration on a single cloud provider','Third party & outsourcing','High','High',15,'Sam Rivera','Oct 21','Action needed'],
  ['R-108','Collections agent misconduct','Third party & outsourcing','High','Medium',12,'Jordan Lee','Nov 02','Mitigating'],
  ['R-109','AML transaction-monitoring coverage gaps','Financial crime','Critical','High',15,'Jordan Lee','Oct 15','Action needed'],
  ['R-110','Mule accounts and digital payment fraud','Financial crime','Critical','High',16,'Jordan Lee','Oct 17','Mitigating'],
  ['R-111','Mis-selling of investment and insurance products','Conduct & compliance','High','Medium',12,'Morgan Chen','Oct 30','Monitoring'],
  ['R-112','Personal data breach and DPDP / GDPR non-compliance','Privacy & data','Critical','High',16,'Priya Shah','Oct 19','Action needed'],
  ['R-113','Regulatory return errors and late filings','Conduct & compliance','Medium','Medium',9,'Morgan Chen','Nov 08','Monitoring'],
  ['R-114','Credit model drift and unvalidated models','Model & operational','High','Medium',9,'Evan Brooks','Nov 12','Mitigating'],
  ['R-115','Manual processes and key-person dependency in operations','Model & operational','Medium','Low',4,'Jordan Lee','Nov 20','Monitoring']].map(risk),
 frameworks:[
  ['RBI IT Governance MD','IT governance, risk and assurance','34','88%','4','Oct 31 · IS audit','Attention'],
  ['DPDP Act 2023','Personal data protection','28','79%','6','Nov 14 · Readiness review','Attention'],
  ['DORA','EU digital operational resilience','41','84%','5','Oct 24 · Register of information','Attention'],
  ['RBI KYC / PMLA','AML / CFT','22','90%','2','Nov 03 · Internal audit','On track'],
  ['SEBI CSCRF','Cyber resilience · broking entity','36','92%','2','Nov 20 · Cyber audit','On track'],
  ['NIST CSF 2.0','Cyber security programme','48','91%','3','Dec 05 · Maturity review','On track']],
 findings:[
  ['F-051','AML scenarios miss mule-account patterns','Internal Audit · FIU readiness','High','Jordan Lee','Oct 09','Overdue'],
  ['F-049','High-risk customer KYC reviews delayed','RBI inspection follow-up','Medium','Jordan Lee','Oct 20','In progress'],
  ['F-055','DORA register of information incomplete','Compliance review','Medium','Sam Rivera','Nov 10','Open'],
  ['F-047','Outsourcing contract lacks audit-access clause','Internal Audit · Outsourcing','High','Sam Rivera','Oct 28','In progress'],
  ['F-044','Consent records not retrievable for 12% of sample','DPDP gap assessment','High','Priya Shah','Oct 31','In progress'],
  ['F-041','Board MIS lacks stress-liquidity trend','Internal Audit','Low','Priya Shah','Nov 15','Open'],
  ['F-038','BCP test scope excluded the UPI switch','External audit','Medium','Sam Rivera','Nov 22','Open']],
 evidenceTypes:['Report','Test result','Log extract','Certificate','Policy attestation'],
 evidence:[
  ['Q3 privileged access recertification report','Report','IT-07','ISO 27001','Sam Rivera','Oct 06, 2026','Current'],
  ['Core banking DR failover test results · May','Test result','BC-02','DORA','Sam Rivera','May 20, 2026','Refresh soon'],
  ['Consent register sample extract · September','Log extract','PR-03','DPDP','Priya Shah','Oct 02, 2026','Current'],
  ['AML alert-handling QA sample','Test result','FC-02','PMLA','Jordan Lee','Sep 25, 2026','Current'],
  ['Cloud provider due-diligence file','Report','TP-03','DORA','Sam Rivera','Mar 20, 2026','Refresh soon'],
  ['KYC periodic review completion report','Report','FC-05','RBI KYC','Jordan Lee','Jul 30, 2026','Refresh soon'],
  ['ISO 27001 certificate · surveillance audit','Certificate','IT-07','ISO 27001','Sam Rivera','Aug 14, 2026','Current'],
  ['Policy attestation summary · Information Security','Policy attestation','IT-11','RBI IT Governance','Sam Rivera','Sep 28, 2026','Current']],
 templates:[
  ['Unsecured lending concentration','Credit risk',3,4,'Evan Brooks','Exposure to a single product or segment could drive losses if the cycle turns.'],
  ['MSME portfolio deterioration','Credit risk',4,4,'Evan Brooks','Rising delinquency in small-business loans could raise provisions and reduce capital.'],
  ['Liquidity coverage shortfall','Market & liquidity',2,5,'Priya Shah','Outflows under stress could exceed available high-quality liquid assets or intraday funding.'],
  ['Interest-rate risk in the banking book','Market & liquidity',3,3,'Priya Shah','Rate moves could compress net interest margin or reduce economic value of equity.'],
  ['Core platform outage','Technology & cyber',3,5,'Sam Rivera','A prolonged outage of core banking or payments could breach impact tolerances and harm customers.'],
  ['Ransomware or destructive cyber attack','Technology & cyber',4,5,'Sam Rivera','An attack could encrypt or corrupt critical systems and data and disrupt services.'],
  ['Critical ICT third-party failure or concentration','Third party & outsourcing',3,5,'Sam Rivera','Dependence on one provider could cause service failure with no tested exit or substitute.'],
  ['Outsourced agent misconduct','Third party & outsourcing',3,3,'Jordan Lee','A collections or sales agent could breach conduct rules and expose the firm to penalties.'],
  ['AML / CFT monitoring gaps','Financial crime',4,4,'Jordan Lee','Detection scenarios or KYC data quality may miss suspicious activity, risking penalties and enforcement.'],
  ['Digital payment fraud and mule accounts','Financial crime',4,4,'Jordan Lee','Fraud rings could exploit onboarding and payment rails, causing customer and financial loss.'],
  ['Product mis-selling','Conduct & compliance',3,4,'Morgan Chen','Unsuitable sales or poor disclosure could harm customers and trigger regulatory action.'],
  ['Personal data breach or privacy non-compliance','Privacy & data',4,4,'Priya Shah','Loss or misuse of personal data could breach DPDP / GDPR and require notification and penalties.'],
  ['Regulatory reporting errors','Conduct & compliance',3,3,'Morgan Chen','Inaccurate or late returns could attract supervisory penalties and loss of confidence.'],
  ['Model risk','Model & operational',3,3,'Evan Brooks','Credit, fraud or pricing models could drift or be misused, leading to poor decisions.']].map((t,i)=>({id:'tpl-bfsi-'+i,title:t[0],area:t[1],likelihood:t[2],impact:t[3],owner:t[4],practice:'',standards:['ISO 31000','Basel'],description:t[5]})),
 dash:{
  eff:'Control effectiveness',comp:'Compliance obligations met',
  insights:[
   ['⚑ &nbsp;Emerging risk','HIGH','amber','<b>Gross NPA in the MSME book</b> has risen for six straight months and is above the amber threshold. This may elevate credit risk <b>R-102</b> and provisioning.','Illustrative example · no data connector active'],
   ['▤ &nbsp;Compliance gap','ACTION','red','<b>DORA register of information</b> is incomplete for 3 critical ICT providers, and the primary cloud provider has no tested exit plan.','Illustrative control references · verify applicability'],
   ['✦ &nbsp;Suggested action','REVIEW','blue','Close <b>2 overdue AML findings</b> and recertify high-risk KYC reviews before the next supervisory visit.','Illustrative suggestion · human review required']],
  prompts:[
   ['Which regulatory obligations are non-compliant or overdue?','<b>Priority gaps:</b> breach-notification clock evidence under the DPDP Rules, DORA register of information, and the AML scenario coverage finding (F-051). Open <b>Compliance → Obligations</b> and filter by Non-compliant. Suggested next step: assign owners and due dates, and link controls.'],
   ['What are our biggest third-party and ICT concentration risks?','<b>R-107</b> (single cloud provider) is High residual and control <b>TP-06</b> (exit plan) is ineffective. Three Tier 1 providers are single-source. Review the <b>Operational resilience</b> view for important services that depend on them.'],
   ['Which privacy requests or breaches are near their legal deadline?','Check <b>Privacy operations</b>: data-subject requests show days left against the one-month (GDPR) or Rules-based (DPDP) period, and each breach shows time left on its 72-hour regulator clock.'],
   ['What would we tell the board about cyber risk this month?','Critical vulnerabilities past SLA are in red (KRI-04), and control IT-11 failed its last test. Ransomware (R-106) remains High. Recommend funding the patch window and a tabletop exercise.']]}
};
BFSI.seed=()=>build({appetite:12,rcsaName:'Q4 2026 enterprise control self-assessment',
 controls:[
  ['CR-02','Credit approval matrix & delegated authority','Preventive','Automated','Quarterly','Evan Brooks','Credit risk',['R-101','R-102'],['RBI'],'2026-09-14','Effective','Morgan Chen',0],
  ['CR-05','Early-warning signals monitoring for MSME accounts','Detective','Automated','Monthly','Evan Brooks','Credit risk',['R-102'],['RBI Fraud'],'2026-08-12','Partially effective','Jordan Lee',2],
  ['MK-03','ALCO limits & IRRBB sensitivity review','Detective','Manual','Quarterly','Priya Shah','Market & liquidity',['R-103'],['Basel'],'2026-09-02','Effective','Morgan Chen',0],
  ['LQ-02','Daily liquidity position & stress-limit monitoring','Detective','Automated','Monthly','Priya Shah','Market & liquidity',['R-104'],['Basel'],'2026-09-30','Effective','Sam Rivera',0],
  ['IT-04','Change & release management with CAB approval','Preventive','Manual','Quarterly','Sam Rivera','Technology & cyber',['R-105'],['RBI ITGRC','DORA'],'2026-07-21','Partially effective','Morgan Chen',3],
  ['IT-07','Privileged access management & quarterly recertification','Preventive','Automated','Quarterly','Sam Rivera','Technology & cyber',['R-105','R-106'],['ISO 27001','NIST CSF'],'2026-09-10','Effective','Priya Shah',0],
  ['IT-11','Vulnerability scanning & patch SLA tracking','Detective','Automated','Monthly','Sam Rivera','Technology & cyber',['R-106'],['CSCRF','NIST CSF'],'2026-08-28','Ineffective','Jordan Lee',4],
  ['IT-15','24x7 SOC monitoring & incident response runbooks','Detective','Automated','Quarterly','Sam Rivera','Technology & cyber',['R-106'],['RBI CSF','CERT-In'],'2026-09-18','Effective','Priya Shah',0],
  ['BC-02','BCP / DR failover test for tier-1 systems','Corrective','Manual','Semi-annual','Sam Rivera','Technology & cyber',['R-105'],['RBI ITGRC','DORA'],'2026-05-20','Partially effective','Priya Shah',2],
  ['TP-03','Third-party due diligence & annual review','Preventive','Manual','Annual','Sam Rivera','Third party & outsourcing',['R-107','R-108'],['RBI Outsourcing','DORA'],'2026-03-20','Partially effective','Morgan Chen',2],
  ['TP-06','Concentration & exit-plan review for critical providers','Detective','Manual','Semi-annual','Sam Rivera','Third party & outsourcing',['R-107'],['DORA'],'2026-04-15','Ineffective','Morgan Chen',3],
  ['FC-02','Transaction-monitoring scenarios & alert handling','Detective','Automated','Monthly','Jordan Lee','Financial crime',['R-109','R-110'],['PMLA','FATF'],'2026-09-25','Partially effective','Morgan Chen',2],
  ['FC-05','KYC periodic review & re-verification','Preventive','Manual','Quarterly','Jordan Lee','Financial crime',['R-109'],['RBI KYC'],'2026-07-30','Partially effective','Priya Shah',1],
  ['CO-04','Product suitability & disclosure checks','Preventive','Manual','Quarterly','Morgan Chen','Conduct & compliance',['R-111'],['SEBI'],'2026-09-08','Effective','Jordan Lee',0],
  ['CO-09','Regulatory return preparation & maker-checker review','Preventive','Manual','Monthly','Morgan Chen','Conduct & compliance',['R-113'],['RBI'],'2026-10-02','Effective','Jordan Lee',0],
  ['PR-03','Consent, notice & data-subject request handling','Preventive','Manual','Monthly','Priya Shah','Privacy & data',['R-112'],['DPDP','GDPR'],'2026-09-22','Partially effective','Morgan Chen',2],
  ['PR-06','Personal data breach response & notification drill','Corrective','Manual','Semi-annual','Priya Shah','Privacy & data',['R-112'],['DPDP','GDPR'],'2026-02-24','Effective','Sam Rivera',0],
  ['MR-02','Model validation & performance back-testing','Detective','Manual','Annual','Evan Brooks','Model & operational',['R-114'],['Basel'],'2026-01-15','Partially effective','Morgan Chen',1]],
 issues:[
  ['ISS-101','Vulnerability patching SLA breached on 14 critical assets','Control test','IT-11','High','Sam Rivera','2026-10-05','Resourcing / capacity','In remediation',[['Patch internet-facing critical assets','Sam Rivera','2026-10-09',true],['Agree emergency patch window with the business','Sam Rivera','2026-10-16',false],['Report SLA exceptions to the CISO weekly','Sam Rivera','2026-10-23',false]],'Control test found critical vulnerabilities open beyond the patch SLA on internet-facing systems.'],
  ['ISS-102','No tested exit plan for the primary cloud provider','Control test','TP-06','High','Sam Rivera','2026-10-30','Control design','Open',[['Draft stressed-exit plan for cloud workloads','Sam Rivera','2026-10-22',false],['Run a tabletop exit exercise','Sam Rivera','2026-10-29',false]]],
  ['ISS-103','AML scenarios do not cover mule-account patterns','Audit finding','F-051','High','Jordan Lee','2026-10-09','Control design','In remediation',[['Design and back-test mule-account scenarios','Jordan Lee','2026-10-06',true],['Tune thresholds and deploy to production','Jordan Lee','2026-10-20',false]]],
  ['ISS-104','Delayed KYC periodic reviews on high-risk customers','Audit finding','F-049','Medium','Jordan Lee','2026-10-20','Resourcing / capacity','Open',[['Clear backlog of overdue high-risk reviews','Jordan Lee','2026-10-18',false]]],
  ['ISS-105','Data-subject requests answered after the deadline in Q3','KRI breach','KRI-08','Medium','Priya Shah','2026-10-18','Process / procedure','Open',[['Introduce SLA tracker and daily queue review','Priya Shah','2026-10-15',false],['Train the privacy desk on request triage','Priya Shah','2026-10-18',false]]],
  ['ISS-106','Releases deployed without CAB evidence','Control test','IT-04','High','Sam Rivera','2026-10-02','Process / procedure','In remediation',[['Block deployment pipeline without approval record','Sam Rivera','2026-10-14',false],['Retro-approve and document last quarter’s releases','Sam Rivera','2026-10-10',true]]],
  ['ISS-107','MSME early-warning alerts not triaged within 5 days','Control test','CR-05','Medium','Evan Brooks','2026-10-25','Resourcing / capacity','Open',[['Add triage capacity and alert ageing report','Evan Brooks','2026-10-22',false]]],
  ['ISS-108','Register of information incomplete for DORA','Audit finding','F-055','Medium','Sam Rivera','2026-11-10','Documentation','Open',[['Complete register fields for all critical ICT providers','Sam Rivera','2026-11-05',false]]],
  ['ISS-109','Regulatory return resubmission in August','Loss event','LE-005','Low','Morgan Chen','2026-09-28','Process / procedure','Closed',[['Add reconciliation step to the maker-checker process','Morgan Chen','2026-09-20',true]]]],
 kris:[
  ['KRI-01','Gross NPA ratio · MSME book (%)','R-102','Evan Brooks','higher',4,6,[3.1,3.4,3.9,4.3,4.8,5.2],'%'],
  ['KRI-02','Intraday liquidity utilisation (%)','R-104','Priya Shah','higher',70,85,[58,61,66,72,69,74],'%'],
  ['KRI-03','Core banking Severity-1 incidents (per month)','R-105','Sam Rivera','higher',2,4,[1,1,2,2,3,4],''],
  ['KRI-04','Critical vulnerabilities past SLA (count)','R-106','Sam Rivera','higher',5,10,[3,4,7,9,12,14],''],
  ['KRI-05','Phishing simulation click rate (%)','R-106','Sam Rivera','higher',5,10,[9,8,7,6,6,4],'%'],
  ['KRI-06','Critical vendor SLA breaches (per quarter)','R-107','Sam Rivera','higher',2,4,[0,1,1,2,2,3],''],
  ['KRI-07','Overdue periodic KYC reviews (%)','R-109','Jordan Lee','higher',5,10,[3,4,6,8,9,11],'%'],
  ['KRI-08','Data-subject requests past deadline (count)','R-112','Priya Shah','higher',2,5,[0,1,1,2,3,3],''],
  ['KRI-09','Digital fraud loss (basis points of volume)','R-110','Jordan Lee','higher',1.5,3,[0.9,1.1,1.2,1.6,1.8,2.1],''],
  ['KRI-10','Customer complaints open > 30 days (%)','R-111','Morgan Chen','higher',4,8,[2,3,3,4,5,5],'%']],
 losses:[
  ['LE-001','2026-08-21','Card-not-present fraud ring using mule accounts','External fraud','R-110',2850000,450000,'Closed','Jordan Lee'],
  ['LE-002','2026-07-09','Core banking batch failure · 5-hour payment delay','Technology failure','R-105',1200000,0,'Closed','Sam Rivera'],
  ['LE-003','2026-09-12','Phishing led to staff credential compromise','Cyber / information security','R-106',380000,0,'Closed','Sam Rivera'],
  ['LE-004','2026-06-18','Penalty for late regulatory return filing','Regulatory penalty','R-113',500000,0,'Closed','Morgan Chen'],
  ['LE-005','2026-08-04','Exposure misreported in a regulatory return · resubmitted','Process error','R-113',0,0,'Closed','Morgan Chen'],
  ['LE-006','2026-09-30','Customer data emailed to the wrong recipient','Privacy incident','R-112',150000,0,'Under investigation','Priya Shah'],
  ['LE-007','2026-10-03','Collections agent complaint · harassment allegation','Conduct','R-108',75000,0,'Under investigation','Jordan Lee'],
  ['LE-008','2026-05-12','Unauthorised UPI refund reversals by an insider','Internal fraud','R-110',640000,220000,'Closed','Jordan Lee']],
 policies:[
  ['POL-001','Information & Cyber Security Policy','Policy','4.1','Sam Rivera','Published','2027-02-15',1850,1702,['ISO 27001','RBI ITGRC'],['IT-07','IT-11']],
  ['POL-002','Outsourcing & Third-Party Risk Policy','Policy','3.0','Sam Rivera','Published','2026-09-30',210,176,['RBI Outsourcing','DORA'],['TP-03','TP-06']],
  ['POL-003','KYC / AML / CFT Policy','Policy','5.2','Jordan Lee','Published','2027-01-31',1850,1790,['RBI KYC','PMLA'],['FC-02','FC-05']],
  ['POL-004','Data Protection & Privacy Policy (DPDP / GDPR)','Policy','2.0','Priya Shah','Published','2027-03-31',1850,1311,['DPDP','GDPR'],['PR-03','PR-06']],
  ['POL-005','Business Continuity & Resilience Policy','Policy','3.3','Sam Rivera','In review','2026-12-15',300,0,['ISO 22301','DORA'],['BC-02']],
  ['POL-006','Fraud Risk Management Policy','Policy','2.4','Jordan Lee','Published','2027-04-30',1850,1560,['RBI Fraud'],['FC-02']],
  ['POL-007','Customer Grievance Redressal Policy','Policy','3.1','Morgan Chen','Published','2027-05-31',1850,1790,['RBI'],['CO-04']],
  ['POL-008','Model Risk Management Policy','Policy','1.0','Evan Brooks','Draft','2026-12-01',60,0,['Basel'],['MR-02']],
  ['POL-009','Code of Conduct & Whistleblower Policy','Policy','6.0','Morgan Chen','Published','2027-06-30',1850,1805,['SOX'],[]]],
 vendors:[
  ['V-001','Nimbus Cloud Services','Cloud hosting · core and digital channels',1,'Sam Rivera',true,['R-107'],'2027-09-30','2026-02-10',66,'High'],
  ['V-002','Finacore Systems','Core banking software & support',1,'Sam Rivera',true,['R-105'],'2027-03-31','2026-04-22',72,'High'],
  ['V-003','PayBridge Switch','Payments switch & UPI gateway',1,'Jordan Lee',false,['R-110'],'2027-01-31','2025-09-05',61,'High'],
  ['V-004','VerifyNow KYC','e-KYC & identity verification API',2,'Jordan Lee',false,['R-109','R-112'],'2027-06-30','2026-06-12',78,'Medium'],
  ['V-005','RecoverFirst Collections','Collections agency',2,'Jordan Lee',false,['R-108'],'2026-12-31','2026-01-18',54,'High'],
  ['V-006','SecureWatch MSSP','Managed SOC & threat monitoring',1,'Sam Rivera',false,['R-106'],'2027-02-28','2026-05-30',83,'Medium'],
  ['V-007','DataLens Credit Bureau Link','Credit bureau & scoring data',2,'Evan Brooks',false,['R-114'],'2027-08-31','2026-03-03',88,'Low'],
  ['V-008','CashRoute Logistics','Cash-in-transit & ATM replenishment',3,'Priya Shah',false,[],'2027-04-30','2025-11-14',74,'Medium']]});

// ---------------------------------------------------------------- Cross-industry enterprise
const GEN={
 id:'general',label:'Cross-industry enterprise',org:'Atlas Holdings (Demo)',site:'Head office',loc:'Multi-site enterprise · any industry',
 orgWord:'organisation',subtitle:{risks:'Identify, assess and treat enterprise risks across strategic, financial, operational, technology and compliance domains.'},
 modules:['obligations','regchange','privacy','cyber','bcp','audit'],
 owners:{GOV:'Morgan Chen',RISK:'Morgan Chen',TPR:'Evan Brooks',INC:'Sam Rivera',RES:'Jordan Lee',TEST:'Priya Shah',PRIV:'Priya Shah',SEC:'Sam Rivera',DISC:'Morgan Chen',CONDUCT:'Morgan Chen',FC:'Priya Shah',AI:'Sam Rivera'},
 adopt:['iso27001','nist-csf2','soc2','gdpr','dpdp','iso22301','sox','iso42001','nist-ai-rmf','iso31000','coso-ic','iso27701','cis-v8'],
 risks:[
  ['R-201','Loss of a key customer contract','Strategic','High','Medium',12,'Morgan Chen','Oct 28','Monitoring'],
  ['R-202','Foreign-exchange volatility','Financial','High','Medium',10,'Priya Shah','Nov 04','Monitoring'],
  ['R-203','Supply disruption from a single supplier','Third party','High','High',15,'Evan Brooks','Oct 17','Action needed'],
  ['R-204','Ransomware and data breach','Technology & cyber','Critical','High',16,'Sam Rivera','Oct 14','Mitigating'],
  ['R-205','Regulatory change not tracked in time','Compliance & legal','High','Medium',9,'Priya Shah','Nov 10','Monitoring'],
  ['R-206','Key talent attrition','People','Medium','Medium',8,'Jordan Lee','Nov 12','Mitigating'],
  ['R-207','Business interruption at the primary site','Operational','High','Medium',12,'Jordan Lee','Oct 30','Mitigating'],
  ['R-208','Fraud and weak financial controls','Financial','High','Medium',9,'Morgan Chen','Nov 06','Monitoring'],
  ['R-209','Privacy non-compliance (GDPR / DPDP)','Compliance & legal','High','High',15,'Priya Shah','Oct 19','Action needed'],
  ['R-210','Unmanaged use of AI tools','Technology & cyber','Medium','Medium',8,'Sam Rivera','Nov 20','Monitoring'],
  ['R-211','Bribery or improper payments through third-party agents','Compliance & legal','High','Medium',12,'Morgan Chen','Nov 14','Mitigating'],
  ['R-212','Misstatement in the financial close and reporting process','Financial','High','Medium',10,'Priya Shah','Oct 31','Mitigating'],
  ['R-213','Whistleblower reports not triaged or investigated on time','Compliance & legal','Medium','Medium',9,'Morgan Chen','Nov 07','Action needed'],
  ['R-214','Third-party access left active after contract end','Third party','High','Medium',12,'Evan Brooks','Oct 22','Action needed'],
  ['R-215','Unfavourable contract terms and unmanaged auto-renewals','Compliance & legal','Medium','Medium',8,'Priya Shah','Nov 25','Monitoring'],
  ['R-216','Inaccurate sustainability (ESG) disclosures','Compliance & legal','Medium','Medium',9,'Priya Shah','Dec 02','Monitoring'],
  ['R-217','Unauthorised change to financial systems (ITGC failure)','Technology & cyber','High','Medium',12,'Sam Rivera','Oct 26','Mitigating'],
  ['R-218','Harassment and misconduct complaints mishandled','People','High','Medium',10,'Jordan Lee','Nov 17','Monitoring'],
  ['R-219','Strategic initiative or acquisition fails to deliver planned benefits','Strategic','High','Medium',10,'Morgan Chen','Dec 05','Monitoring']].map(risk),
 frameworks:[
  ['ISO 27001','Information security','93','90%','4','Nov 12 · Surveillance audit','On track'],
  ['SOC 2','Trust services criteria','64','87%','5','Dec 01 · Type II window','Attention'],
  ['GDPR / DPDP','Privacy','38','82%','6','Nov 18 · DPIA review','Attention'],
  ['SOX ICFR','Financial reporting controls','52','94%','2','Oct 30 · Management testing','On track'],
  ['ISO 42001','AI management system','21','76%','4','Dec 08 · Gap assessment','Attention'],
  ['COSO ICIF','Internal control integrated framework','47','89%','3','Nov 06 · Entity-level review','On track']],
 findings:[
  ['F-021','Access reviews not completed for finance systems','Internal Audit','High','Sam Rivera','Oct 09','Overdue'],
  ['F-019','Supplier continuity plans missing for top 5 suppliers','Internal Audit','Medium','Evan Brooks','Oct 24','In progress'],
  ['F-017','Privacy notices out of date on two websites','Privacy review','Medium','Priya Shah','Oct 30','In progress'],
  ['F-015','DR test not performed for ERP','External audit','High','Jordan Lee','Nov 10','Open'],
  ['F-012','Policy attestation below target','Compliance review','Low','Morgan Chen','Nov 20','Open'],
  ['F-026','Manual journals posted without second approval in two months','Internal Audit','High','Priya Shah','Oct 21','In progress'],
  ['F-025','Vendor access not removed for 9 expired contracts','Internal Audit','Medium','Evan Brooks','Oct 31','In progress'],
  ['F-024','Whistleblower case log lacks closure dates and outcomes','Compliance review','Medium','Morgan Chen','Nov 14','Open'],
  ['F-023','No approved inventory of AI tools in use','Internal Audit','Medium','Sam Rivera','Nov 28','Open'],
  ['F-022','Sustainability data for energy use not reconciled to invoices','External assurance','Low','Priya Shah','Dec 10','Open']],
 evidenceTypes:['Report','Test result','Log extract','Certificate','Policy attestation'],
 evidence:[
  ['Quarterly user access review · ERP','Report','IT-02','SOC 2','Sam Rivera','Oct 03, 2026','Current'],
  ['Backup restoration test results','Test result','IT-05','ISO 27001','Sam Rivera','Aug 29, 2026','Refresh soon'],
  ['Records of processing extract','Log extract','PR-01','GDPR','Priya Shah','Sep 24, 2026','Current'],
  ['ISO 27001 certificate','Certificate','IT-02','ISO 27001','Sam Rivera','Jun 18, 2026','Current'],
  ['Supplier due-diligence file · Tier 1','Report','TP-01','SOC 2','Evan Brooks','Mar 11, 2026','Refresh soon'],
  ['ERP change tickets with approval trail · Q3','Report','IT-12','SOX','Sam Rivera','Oct 05, 2026','Current'],
  ['Phishing simulation results · Sep 2026','Test result','IT-14','ISO 27001','Sam Rivera','Sep 30, 2026','Current'],
  ['Month-end close checklist · Sep 2026','Report','FN-08','SOX','Priya Shah','Oct 06, 2026','Current'],
  ['Manual journal approval exception report · Q3','Report','FN-11','SOX','Priya Shah','Oct 02, 2026','Current'],
  ['Gifts and hospitality register extract · Q3','Log extract','CL-05','ISO 37301','Morgan Chen','Sep 28, 2026','Current'],
  ['Whistleblower case log with triage dates','Log extract','CL-07','ISO 37301','Morgan Chen','Aug 31, 2026','Refresh soon'],
  ['Contract approval workflow log · non-standard terms','Log extract','LG-02','ISO 31000','Priya Shah','Sep 18, 2026','Refresh soon'],
  ['AI use-case register export','Report','AI-01','ISO 42001','Sam Rivera','Sep 12, 2026','Refresh soon'],
  ['Anti-bribery training completion report','Policy attestation','CL-05','ISO 37301','Morgan Chen','Sep 20, 2026','Current'],
  ['ESG data sign-off pack · FY2026 H1','Report','ES-01','ISO 31000','Priya Shah','Jul 31, 2026','Refresh soon']],
 templates:[
  ['Loss of a key customer','Strategic',3,4,'Morgan Chen','Losing a major customer or contract could materially reduce revenue.'],
  ['Foreign-exchange exposure','Financial',3,3,'Priya Shah','Currency moves could erode margins or the value of foreign-currency balances.'],
  ['Single-source supplier failure','Third party',3,4,'Evan Brooks','Failure of a sole supplier could halt production or service delivery.'],
  ['Ransomware or data breach','Technology & cyber',4,5,'Sam Rivera','A cyber attack could disrupt operations and expose sensitive data.'],
  ['Regulatory change','Compliance & legal',3,3,'Priya Shah','New or amended laws could be missed, leading to non-compliance.'],
  ['Talent attrition','People',3,3,'Jordan Lee','Loss of critical staff could slow delivery and drain knowledge.'],
  ['Business interruption','Operational',2,5,'Jordan Lee','A site-level event could stop operations for an extended period.'],
  ['Fraud','Financial',3,4,'Morgan Chen','Internal or external fraud could cause financial loss and reputational damage.'],
  ['Privacy non-compliance','Compliance & legal',4,4,'Priya Shah','Misuse or loss of personal data could breach privacy laws.'],
  ['AI governance','Technology & cyber',3,3,'Sam Rivera','Unapproved AI use could leak data or produce unreliable decisions.'],
  ['Third-party bribery','Compliance & legal',3,4,'Morgan Chen','Agents or distributors could make improper payments on the organisation\'s behalf.']].map((t,i)=>({id:'tpl-gen-'+i,title:t[0],area:t[1],likelihood:t[2],impact:t[3],owner:t[4],practice:'',standards:['ISO 31000'],description:t[5]})),
 dash:{
  eff:'Control effectiveness',comp:'Compliance obligations met',
  insights:[
   ['⚑ &nbsp;Emerging risk','HIGH','amber','<b>Single-source supplier</b> performance has slipped for two quarters, raising continuity risk <b>R-203</b>.','Illustrative example · no data connector active'],
   ['▤ &nbsp;Compliance gap','ACTION','red','Two <b>SOC 2</b> controls lack evidence for the audit window and privacy notices are out of date.','Illustrative control references · verify applicability'],
   ['✦ &nbsp;Suggested action','REVIEW','blue','Consolidate <b>3 corrective actions</b> for access reviews into one owner-led workstream.','Illustrative suggestion · human review required']],
  prompts:[
   ['Which compliance obligations need attention?','Open <b>Compliance → Obligations</b> and filter by Non-compliant or Not assessed. Privacy and SOC 2 evidence gaps are the main items.'],
   ['Where are our biggest third-party risks?','<b>R-203</b> (single-source supplier) is High residual. Review the Third parties view for single-source and overdue reassessments.']]}
};
GEN.seed=()=>build({appetite:12,rcsaName:'Q4 2026 enterprise control self-assessment',
 controls:[
  ['IT-02','User access review for finance and ERP systems','Detective','Manual','Quarterly','Sam Rivera','Technology & cyber',['R-204','R-208'],['SOC 2','SOX'],'2026-07-02','Partially effective','Priya Shah',2],
  ['IT-05','Backup and restoration testing','Corrective','Manual','Semi-annual','Sam Rivera','Technology & cyber',['R-204','R-207'],['ISO 27001'],'2026-08-29','Effective','Jordan Lee',0],
  ['IT-09','Endpoint protection and patching','Preventive','Automated','Monthly','Sam Rivera','Technology & cyber',['R-204'],['ISO 27001'],'2026-09-28','Effective','Priya Shah',0],
  ['TP-01','Supplier due diligence and continuity review','Preventive','Manual','Annual','Evan Brooks','Third party',['R-203'],['SOC 2'],'2026-03-11','Partially effective','Morgan Chen',2],
  ['FN-03','Segregation of duties and payment approval controls','Preventive','Automated','Quarterly','Morgan Chen','Financial',['R-208'],['SOX'],'2026-09-15','Effective','Priya Shah',0],
  ['FN-06','FX hedging policy compliance review','Detective','Manual','Quarterly','Priya Shah','Financial',['R-202'],['SOX'],'2026-08-10','Effective','Morgan Chen',0],
  ['PR-01','Records of processing and privacy notice review','Preventive','Manual','Quarterly','Priya Shah','Compliance & legal',['R-209'],['GDPR','DPDP'],'2026-07-18','Ineffective','Morgan Chen',3],
  ['CL-02','Regulatory change monitoring and impact assessment','Detective','Manual','Monthly','Priya Shah','Compliance & legal',['R-205'],['ISO 37301'],'2026-09-05','Partially effective','Sam Rivera',1],
  ['BC-01','Business continuity plan exercise','Corrective','Manual','Annual','Jordan Lee','Operational',['R-207'],['ISO 22301'],'2025-11-20','Partially effective','Morgan Chen',2],
  ['HR-02','Succession planning and retention review','Preventive','Manual','Semi-annual','Jordan Lee','People',['R-206'],['ISO 9001'],'2026-06-10','Effective','Morgan Chen',0],
  ['IT-12','ERP change approval and separation of developer / release duties','Preventive','Automated','Quarterly','Sam Rivera','Technology & cyber',['R-217','R-212'],['SOX','COBIT'],'2026-09-09','Effective','Priya Shah',0],
  ['IT-14','Security awareness training and phishing simulation','Preventive','Manual','Quarterly','Sam Rivera','Technology & cyber',['R-204'],['ISO 27001'],'2026-09-30','Effective','Jordan Lee',0],
  ['IT-16','Critical patch SLA tracking (14-day target)','Detective','Automated','Monthly','Sam Rivera','Technology & cyber',['R-204'],['CIS Controls','NIST CSF'],'2026-09-26','Partially effective','Priya Shah',3],
  ['FN-08','Month-end close checklist with controller sign-off','Preventive','Manual','Monthly','Priya Shah','Financial',['R-212'],['SOX','COSO'],'2026-10-06','Effective','Morgan Chen',0],
  ['FN-11','Manual journal second-approval and reconciliation review','Detective','Manual','Monthly','Priya Shah','Financial',['R-208','R-212'],['SOX','COSO'],'2026-08-18','Ineffective','Morgan Chen',4],
  ['CL-05','Anti-bribery agent due diligence and gifts register review','Preventive','Manual','Quarterly','Morgan Chen','Compliance & legal',['R-211'],['ISO 37301'],'2026-09-04','Partially effective','Priya Shah',1],
  ['CL-07','Whistleblower case intake and 5-day triage','Detective','Manual','Quarterly','Morgan Chen','Compliance & legal',['R-213'],['ISO 37301'],'2026-08-12','Partially effective','Jordan Lee',2],
  ['LG-02','Contract review and approval of non-standard terms','Preventive','Manual','Quarterly','Priya Shah','Compliance & legal',['R-215'],['ISO 31000'],'2026-07-22','Partially effective','Morgan Chen',2],
  ['ES-01','ESG data collection, owner sign-off and internal review','Detective','Manual','Semi-annual','Priya Shah','Compliance & legal',['R-216'],['ISO 14001'],'2026-07-31','Effective','Jordan Lee',0],
  ['AI-01','AI use-case register and approval gate','Preventive','Manual','Quarterly','Sam Rivera','Technology & cyber',['R-210'],['ISO 42001','NIST AI RMF'],'2026-09-12','Partially effective','Priya Shah',2],
  ['TP-05','Vendor user access offboarding at contract end','Preventive','Manual','Monthly','Evan Brooks','Third party',['R-214'],['ISO 27001','SOC 2'],'2026-08-25','Ineffective','Priya Shah',9],
  ['HR-05','Harassment complaint intake, investigation and closure review','Corrective','Manual','Semi-annual','Jordan Lee','People',['R-218'],['ISO 37301'],'2026-05-28','Effective','Morgan Chen',0],
  ['ST-02','Quarterly key-account and strategic initiative review','Detective','Manual','Quarterly','Morgan Chen','Strategic',['R-201','R-219'],['COSO ERM'],'2026-09-18','Effective','Priya Shah',0]],
 issues:[
  ['ISS-101','Access reviews incomplete for finance systems','Audit finding','F-021','High','Sam Rivera','2026-10-09','Process / procedure','In remediation',[['Complete outstanding reviews','Sam Rivera','2026-10-14',false],['Automate review reminders','Sam Rivera','2026-10-28',false]]],
  ['ISS-102','Supplier continuity plans missing for top suppliers','Audit finding','F-019','Medium','Evan Brooks','2026-10-24','Documentation','In remediation',[['Collect plans from top 5 suppliers','Evan Brooks','2026-10-20',false]]],
  ['ISS-103','Privacy notices and records of processing out of date','Control test','PR-01','High','Priya Shah','2026-10-30','Documentation','Open',[['Refresh notices and ROPA entries','Priya Shah','2026-10-27',false]]],
  ['ISS-104','No DR test performed for ERP','Audit finding','F-015','High','Jordan Lee','2026-11-10','Resourcing / capacity','Open',[['Schedule and run ERP recovery test','Jordan Lee','2026-11-05',false]]],
  ['ISS-105','Policy attestation below target','Audit finding','F-012','Low','Morgan Chen','2026-09-28','Training','Closed',[['Send reminders and escalate to managers','Morgan Chen','2026-09-24',true]]],
  ['ISS-106','Manual journals posted without second approval','Control test','CT-115','High','Priya Shah','2026-10-21','Control design','In remediation',[['Enforce system-level approval for manual journals above threshold','Priya Shah','2026-10-31',false],['Retrospective review of unapproved journals for Q3','Priya Shah','2026-10-16',true]],'Sample testing found 4 of 25 manual journals posted without a second approver.'],
  ['ISS-107','Vendor access remains active after contract end','Control test','CT-121','High','Evan Brooks','2026-10-22','Process / procedure','Open',[['Disable the 9 expired vendor accounts','Evan Brooks','2026-10-16',true],['Link contract end dates to the access-removal ticket','Evan Brooks','2026-11-06',false]]],
  ['ISS-108','Whistleblower case log incomplete','Audit finding','F-024','Medium','Morgan Chen','2026-11-14','Documentation','Open',[['Add outcome and closure fields to the case tool','Morgan Chen','2026-11-07',false],['Back-fill closure data for open cases','Morgan Chen','2026-11-12',false]]],
  ['ISS-109','No approved inventory of AI tools in use','Audit finding','F-023','Medium','Sam Rivera','2026-11-28','Documentation','Open',[['Run discovery survey across business units','Sam Rivera','2026-11-06',false],['Approve and publish acceptable-use rules for AI','Sam Rivera','2026-11-20',false]]],
  ['ISS-110','Critical patches closed after the 14-day target','Control test','CT-113','Medium','Sam Rivera','2026-10-27','Resourcing / capacity','In remediation',[['Agree weekend patch windows for ERP servers','Sam Rivera','2026-10-24',false]]],
  ['ISS-111','Customer data shared with wrong party','Loss event','LE-004','Medium','Priya Shah','2026-10-31','Process / procedure','In remediation',[['Add recipient check to the outbound document workflow','Priya Shah','2026-10-28',false],['Refresh privacy training for the service team','Priya Shah','2026-10-20',true]]],
  ['ISS-112','Contracts auto-renewed without review','KRI breach','KRI-10','Medium','Priya Shah','2026-09-30','Process / procedure','Closed',[['Build renewal alerts 90 days before notice date','Priya Shah','2026-09-22',true]]],
  ['ISS-113','ESG energy data not reconciled to supplier invoices','Audit finding','F-022','Low','Priya Shah','2026-12-10','Documentation','Open',[['Reconcile H1 energy data to invoices','Priya Shah','2026-11-30',false]]]],
 kris:[
  ['KRI-01','Open high-severity audit findings (count)','R-208','Morgan Chen','higher',3,6,[2,3,3,4,4,5],''],
  ['KRI-02','Critical vulnerabilities past SLA (count)','R-204','Sam Rivera','higher',4,8,[2,3,4,6,6,7],''],
  ['KRI-03','Single-source spend share (%)','R-203','Evan Brooks','higher',30,45,[28,30,33,35,37,38],'%'],
  ['KRI-04','Voluntary attrition, key roles (%)','R-206','Jordan Lee','higher',8,12,[6,6,7,8,9,9],'%'],
  ['KRI-05','Privacy requests past deadline (count)','R-209','Priya Shah','higher',2,4,[0,0,1,1,2,3],''],
  ['KRI-06','Whistleblower cases open more than 30 days (count)','R-213','Morgan Chen','higher',2,4,[0,1,1,2,3,3],''],
  ['KRI-07','Working days to complete month-end close','R-212','Priya Shah','higher',6,8,[5,5,6,6,7,7],''],
  ['KRI-08','AI tools detected outside the approved register (count)','R-210','Sam Rivera','higher',3,6,[1,2,3,4,5,7],''],
  ['KRI-09','Vendor accounts active after contract end (count)','R-214','Evan Brooks','higher',2,5,[1,2,4,6,9,9],''],
  ['KRI-10','Contracts auto-renewed without legal review (count per quarter)','R-215','Priya Shah','higher',2,4,[1,1,2,3,3,2],''],
  ['KRI-11','Revenue share of the largest customer (%)','R-201','Morgan Chen','higher',25,35,[22,23,24,26,27,28],'%'],
  ['KRI-12','Staff overdue on anti-bribery training (%)','R-211','Morgan Chen','higher',10,20,[6,7,9,11,12,11],'%'],
  ['KRI-13','Manual journals posted without second approval (%)','R-212','Priya Shah','higher',2,5,[0,1,1,3,4,6],'%']],
 losses:[
  ['LE-001','2026-08-09','Phishing led to invoice fraud','External fraud','R-208',420000,120000,'Closed','Morgan Chen'],
  ['LE-002','2026-07-14','ERP outage · 3 hours','Technology failure','R-207',210000,0,'Closed','Jordan Lee'],
  ['LE-003','2026-09-21','Supplier delivery failure · rush freight','Supply disruption','R-203',340000,60000,'Closed','Evan Brooks'],
  ['LE-004','2026-10-01','Customer data shared with wrong party','Privacy incident','R-209',90000,0,'Under investigation','Priya Shah'],
  ['LE-005','2026-06-24','Duplicate vendor payment released twice','Process error','R-208',185000,160000,'Closed','Priya Shah'],
  ['LE-006','2026-08-28','Auto-renewed software licence not cancelled','Contract management','R-215',72000,0,'Closed','Priya Shah'],
  ['LE-007','2026-09-05','Ex-vendor account used to open a shared drive','Cyber / information security','R-214',0,0,'Under investigation','Sam Rivera'],
  ['LE-008','2026-07-30','Key-account service credit after missed SLA','Customer contract','R-201',260000,0,'Closed','Morgan Chen'],
  ['LE-009','2026-05-19','Post-close adjustment to Q1 accruals','Financial reporting','R-212',95000,0,'Closed','Priya Shah'],
  ['LE-010','2026-09-29','Unapproved AI tool used to summarise a client contract','Technology failure','R-210',0,0,'Under investigation','Sam Rivera']],
 policies:[
  ['POL-001','Information Security Policy','Policy','3.2','Sam Rivera','Published','2027-03-01',900,812,['ISO 27001'],['IT-02','IT-09']],
  ['POL-002','Supplier Code of Conduct','Policy','1.4','Evan Brooks','Published','2026-09-30',120,95,['SOC 2'],['TP-01']],
  ['POL-003','Data Protection & Privacy Policy','Policy','2.1','Priya Shah','Published','2027-02-10',900,640,['GDPR','DPDP'],['PR-01']],
  ['POL-004','Business Continuity Plan','Plan','1.2','Jordan Lee','In review','2026-12-10',80,0,['ISO 22301'],['BC-01']],
  ['POL-005','Code of Conduct','Policy','5.0','Morgan Chen','Published','2027-06-30',900,861,['SOX'],[]],
  ['POL-006','Anti-Bribery & Corruption Policy','Policy','2.0','Morgan Chen','Published','2027-01-31',900,788,['ISO 37301'],['CL-05']],
  ['POL-007','Whistleblowing & Speak-Up Policy','Policy','2.2','Morgan Chen','Published','2026-11-30',900,842,['ISO 37301'],['CL-07']],
  ['POL-008','Acceptable Use of AI Policy','Policy','0.9','Sam Rivera','Draft','2026-12-15',60,0,['ISO 42001','NIST AI RMF'],['AI-01']],
  ['POL-009','Third-Party Risk & Access Management Standard','Standard','1.3','Evan Brooks','In review','2026-11-15',140,0,['ISO 27001','SOC 2'],['TP-01','TP-05']],
  ['POL-010','Delegation of Authority & Contract Signing Policy','Policy','3.0','Priya Shah','Published','2027-04-30',210,188,['ISO 31000'],['LG-02']],
  ['POL-011','Financial Close & Journal Entry Procedure','Procedure','4.1','Priya Shah','Published','2026-09-30',55,52,['SOX'],['FN-08','FN-11']]],
 vendors:[
  ['V-001','Orbit Components Ltd','Key component supplier',1,'Evan Brooks',true,['R-203'],'2027-03-31','2026-02-02',62,'High'],
  ['V-002','CloudWorks Hosting','Cloud infrastructure',1,'Sam Rivera',false,['R-204'],'2027-06-30','2026-04-18',78,'Medium'],
  ['V-003','PayRoll Partners','Payroll processing',2,'Jordan Lee',false,['R-209'],'2027-01-31','2025-12-04',70,'Medium'],
  ['V-004','Freightline Logistics','Outbound logistics',2,'Evan Brooks',false,['R-203'],'2026-12-31','2026-05-21',81,'Medium'],
  ['V-005','BrightAudit LLP','External audit support',3,'Morgan Chen',false,[],'2027-09-30','2025-10-10',90,'Low'],
  ['V-006','LedgerLink ERP Support','ERP application support and hosting',1,'Sam Rivera',true,['R-217','R-212'],'2027-05-31','2026-03-25',68,'High'],
  ['V-007','Northgate Managed SOC','Managed security monitoring',1,'Sam Rivera',false,['R-204'],'2027-02-28','2026-06-09',84,'Medium'],
  ['V-008','LexBridge Legal Partners','Outside counsel and contract support',2,'Priya Shah',false,['R-215'],'2027-07-31','2026-02-17',80,'Low'],
  ['V-009','TalentStream Recruitment','Recruitment and background checks',2,'Jordan Lee',false,['R-206','R-209'],'2026-12-31','2025-11-03',63,'High'],
  ['V-010','Verdant Carbon Advisory','ESG data and reporting support',3,'Priya Shah',false,['R-216'],'2027-03-31','2026-04-14',77,'Medium'],
  ['V-011','SwiftPay Treasury Services','Payments and FX execution',1,'Priya Shah',false,['R-202','R-208'],'2027-06-30','2026-05-06',74,'High']]});

// ---------------------------------------------------------------- manufacturing (existing demo) metadata
const MFG={id:'manufacturing',label:'Manufacturing',org:'India Manufacturing Demo',site:'Plant 01',loc:'Maharashtra, India',
 modules:['obligations','regchange','privacy','cyber','bcp','audit'],
 owners:{GOV:'Morgan Chen',RISK:'Morgan Chen',TPR:'Evan Brooks',INC:'Sam Rivera',RES:'Jordan Lee',TEST:'Priya Shah',PRIV:'Priya Shah',SEC:'Sam Rivera',DISC:'Morgan Chen',CONDUCT:'Morgan Chen',FC:'Priya Shah',AI:'Sam Rivera'},
 adopt:['iso27001','nist-csf2','dpdp','certin','iso22301','iso9001','iso14001','iso45001','iso50001','iec62443','nist-800-82','iso31000'],
 // appended to the plant register, frameworks, findings and evidence defined in index.html (existing rows are kept as they are)
 extra:{
  risks:[
   ['R-036','Hot-work permit lapses near solvent and gas storage','Process safety','Critical','High',15,'Jordan Lee','Oct 23','Action needed'],
   ['R-038','Press-line guarding bypass or interlock failure','Machine safety','Critical','High',15,'Jordan Lee','Oct 19','Action needed'],
   ['R-041','Non-conforming batch reaches a customer and triggers a recall','Quality','Critical','Medium',12,'Jordan Lee','Nov 08','Mitigating'],
   ['R-044','Critical-spares stock-out prolongs a breakdown','Maintenance','High','Medium',12,'Jordan Lee','Oct 30','Mitigating'],
   ['R-046','Contract-worker injury from induction and permit gaps','Labour & contractors','High','Medium',12,'Morgan Chen','Oct 25','Action needed'],
   ['R-048','Peak demand penalties and power-quality events','Energy','Medium','Medium',9,'Evan Brooks','Nov 14','Monitoring'],
   ['R-050','Customs misclassification or export documentation errors','Trade & customs','Medium','Medium',8,'Evan Brooks','Nov 19','Monitoring'],
   ['R-052','Inventory record inaccuracy distorts planning and valuation','Inventory','Medium','Medium',9,'Evan Brooks','Nov 15','Mitigating'],
   ['R-054','Fire in the finished-goods warehouse','Process safety','Critical','Medium',10,'Priya Shah','Nov 22','Mitigating'],
   ['R-056','PLC programs cannot be restored after a ransomware event','Cybersecurity','High','Medium',10,'Sam Rivera','Nov 03','Mitigating']],
  frameworks:[
   ['ISO 50001','Energy management','31','86%','3','Nov 20 · Energy review','Attention'],
   ['IEC 62443','Industrial automation security','27','81%','4','Dec 04 · Zone and conduit review','Attention']],
  findings:[
   ['F-044','Hot-work permits closed without fire-watch sign-off','ISO 45001 · Internal','High','Jordan Lee','Oct 28','In progress'],
   ['F-045','Light-curtain test missed on Press 5','ISO 45001 · Internal','High','Jordan Lee','Oct 19','In progress'],
   ['F-047','HS-code mismatch on two export consignments','Customs review · Internal','Medium','Evan Brooks','Nov 15','Open'],
   ['F-048','Mock recall traceability exceeded target','ISO 9001 · Internal','Medium','Jordan Lee','Nov 12','Open'],
   ['F-049','Contractor induction records incomplete','ISO 45001 · External','Medium','Morgan Chen','Oct 09','Overdue'],
   ['F-050','Energy baseline not updated after compressor change','ISO 50001 · Internal','Low','Evan Brooks','Dec 01','Open']],
  evidence:[
   ['Hot-work permit sample · Sep 2026','Inspection','PS-03','ISO 45001','Jordan Lee','Sep 24, 2026','Current'],
   ['Press interlock functional test log · Aug 2026','Inspection','MS-02','ISO 45001','Jordan Lee','Aug 27, 2026','Refresh soon'],
   ['LOTO audit report · Q3','Inspection','MS-05','ISO 45001','Jordan Lee','Sep 16, 2026','Current'],
   ['SPC chart pack · Line 2 · Sep 2026','Inspection','QA-07','ISO 9001','Jordan Lee','Oct 02, 2026','Current'],
   ['Mock recall report · Jun 2026','Inspection','QA-09','ISO 9001','Jordan Lee','Jun 17, 2026','Refresh soon'],
   ['Critical-spares min / max review sheet','Maintenance log','MA-14','ISO 9001','Jordan Lee','Jul 14, 2026','Refresh soon'],
   ['Contractor induction register · Sep 2026','Training record','LB-03','ISO 45001','Morgan Chen','Sep 03, 2026','Refresh soon'],
   ['Maximum-demand report · Sep billing cycle','Inspection','EG-02','ISO 50001','Evan Brooks','Oct 05, 2026','Current'],
   ['HS-code review log · Sep 2026','Inspection','TR-04','ISO 9001','Evan Brooks','Sep 21, 2026','Current'],
   ['Cycle-count variance report · Aug 2026','Inspection','IN-05','ISO 9001','Evan Brooks','Aug 31, 2026','Refresh soon'],
   ['Sprinkler and hydrant test certificate · Q3','Certificate','FS-03','ISO 45001','Priya Shah','Sep 29, 2026','Current'],
   ['PLC backup restoration record · Jun 2026','Maintenance log','OT-18','IEC 62443','Sam Rivera','Jun 05, 2026','Refresh soon']]}};

// ---------------------------------------------------------------- manufacturing seed (original 15 controls, 9 indicators and records kept; new records appended)
MFG.seed=()=>{const s=build({appetite:12,rcsaName:'Q4 2026 plant control self-assessment',
 controls:[
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
  ['QA-03','Gauge calibration schedule & out-of-tolerance review','Detective','Manual','Quarterly','Jordan Lee','Quality',['R-003'],['ISO 9001'],'2026-07-30','Partially effective','Morgan Chen',1],
  ['PS-03','Hot-work permit with gas test, fire watch and 30-minute post-work check','Preventive','Manual','Monthly','Jordan Lee','Process safety',['R-036','R-054'],['ISO 45001','OSHA PSM'],'2026-09-24','Partially effective','Priya Shah',2],
  ['MS-02','Press-line interlock and light-curtain functional test','Preventive','Manual','Monthly','Jordan Lee','Machine safety',['R-038'],['ISO 45001'],'2026-08-27','Partially effective','Morgan Chen',3],
  ['MS-05','Lockout-tagout (LOTO) audit on maintenance jobs','Preventive','Manual','Quarterly','Jordan Lee','Machine safety',['R-038'],['ISO 45001'],'2026-09-16','Effective','Priya Shah',0],
  ['QA-07','In-process SPC check and first-article approval on Line 2','Detective','Automated','Monthly','Jordan Lee','Quality',['R-003','R-041'],['ISO 9001'],'2026-10-02','Effective','Morgan Chen',0],
  ['QA-09','Batch traceability and mock-recall exercise','Corrective','Manual','Semi-annual','Jordan Lee','Quality',['R-041'],['ISO 9001'],'2026-06-17','Partially effective','Priya Shah',1],
  ['MA-14','Critical-spares min / max stock review','Preventive','Manual','Quarterly','Jordan Lee','Maintenance',['R-044','R-014'],['ISO 9001'],'2026-07-14','Partially effective','Evan Brooks',2],
  ['LB-03','Contractor induction and site-entry permit gate check','Preventive','Manual','Monthly','Morgan Chen','Labour & contractors',['R-046'],['ISO 45001'],'2026-09-03','Ineffective','Priya Shah',5],
  ['EG-02','Maximum-demand and power-factor monitoring against contract demand','Detective','Automated','Monthly','Evan Brooks','Energy',['R-048'],['ISO 50001'],'2026-10-05','Effective','Jordan Lee',0],
  ['TR-04','HS-code classification review and export-document sign-off','Preventive','Manual','Monthly','Evan Brooks','Trade & customs',['R-050'],['ISO 9001'],'2026-09-21','Partially effective','Morgan Chen',1],
  ['IN-05','ABC cycle-count programme with variance sign-off','Detective','Manual','Monthly','Evan Brooks','Inventory',['R-052'],['ISO 9001'],'2026-08-31','Partially effective','Jordan Lee',2],
  ['FS-03','Fire detection, hydrant and sprinkler impairment testing','Detective','Manual','Quarterly','Priya Shah','Process safety',['R-054'],['ISO 45001'],'2026-09-29','Effective','Morgan Chen',0],
  ['OT-18','PLC logic backup and restoration test','Corrective','Manual','Semi-annual','Sam Rivera','Cybersecurity',['R-056','R-019'],['NIST CSF','IEC 62443'],'2026-06-05','Partially effective','Jordan Lee',1]],
 issues:[
  ['ISS-101','Machine guarding inspection gaps','Audit finding','F-042','High','Jordan Lee','2026-10-09','Process / procedure','In remediation',[['Fit interlocked guards on presses 4 and 5','Jordan Lee','2026-10-05',true],['Update daily guarding inspection checklist','Jordan Lee','2026-10-12',false],['Retrain operators on guarding rules','Morgan Chen','2026-10-20',false]],'Guarding on two presses was found missing or bypassed during the ISO 45001 internal audit.'],
  ['ISS-102','Waste manifest reconciliation incomplete','Audit finding','F-039','Medium','Priya Shah','2026-10-14','Documentation','In remediation',[['Reconcile Q3 hazardous waste manifests','Priya Shah','2026-10-10',true],['Introduce monthly manifest reconciliation check','Priya Shah','2026-10-14',false]]],
  ['ISS-103','PLC access recertification overdue','Audit finding','F-034','High','Sam Rivera','2026-10-25','Access management','Open',[['Run privileged access recertification for PLC/HMI accounts','Sam Rivera','2026-10-20',false]]],
  ['ISS-104','Wastewater ETP bypass lock-out not effective','Control test','CT-104','High','Priya Shah','2026-10-02','Control design','In remediation',[['Replace padlock scheme with keyed interlock','Priya Shah','2026-10-15',false],['Add weekly bypass-valve photo evidence','Priya Shah','2026-10-08',true]],'Control test found 3 of 12 weekly inspections missing and one unlocked bypass valve.'],
  ['ISS-105','Forklift pedestrian zoning ineffective in Bay 4','Control test','CT-110','High','Morgan Chen','2026-10-31','Control design','Open',[['Install physical barriers and mirrors in Bay 4','Evan Brooks','2026-10-28',false]]],
  ['ISS-106','Supplier continuity evidence missing','Audit finding','F-037','Medium','Evan Brooks','2026-10-20','Documentation','In remediation',[['Collect continuity plans from top 5 suppliers','Evan Brooks','2026-10-18',false]]],
  ['ISS-107','OT unpatched assets above KRI threshold','KRI breach','KRI-06','High','Sam Rivera','2026-11-06','Resourcing / capacity','Open',[['Agree patch window with production planning','Sam Rivera','2026-10-22',false],['Patch critical-severity OT assets','Sam Rivera','2026-11-05',false]]],
  ['ISS-108','Calibration record retention gap','Audit finding','F-029','Medium','Jordan Lee','2026-11-02','Documentation','Pending verification',[['Digitise calibration certificates for 2024-26','Jordan Lee','2026-10-06',true]]],
  ['ISS-109','PPE refresher records incomplete','Audit finding','F-031','Low','Morgan Chen','2026-09-30','Training','Closed',[['Refresh PPE training and record signatures','Morgan Chen','2026-09-25',true]]],
  ['ISS-110','Hot-work permits closed without fire-watch sign-off','Audit finding','F-044','High','Jordan Lee','2026-10-28','Process / procedure','In remediation',[['Add mandatory post-work fire-watch field to the permit form','Jordan Lee','2026-10-15',true],['Re-brief permit issuers and area owners','Jordan Lee','2026-10-24',false]],'Permit sample showed 3 of 20 hot-work permits closed without the 30-minute fire-watch signature.'],
  ['ISS-111','Contractor induction gate bypassed on night shift','Control test','CT-122','High','Morgan Chen','2026-10-23','Process / procedure','Open',[['Make gate pass dependent on induction ID check','Morgan Chen','2026-10-21',false],['Daily reconciliation of contractor headcount vs inducted list','Morgan Chen','2026-10-30',false]],'5 of 12 sampled contract workers were on site without a valid induction record.'],
  ['ISS-112','Mock recall traceability took 9 hours against a 4-hour target','Control test','CT-120','Medium','Jordan Lee','2026-11-12','Control design','Open',[['Link raw-material lot numbers to finished-batch records in the MES','Jordan Lee','2026-11-05',false],['Repeat mock recall','Jordan Lee','2026-12-10',false]]],
  ['ISS-113','Critical spares below minimum for Line 3 compressor','KRI breach','KRI-13','Medium','Jordan Lee','2026-10-30','Resourcing / capacity','In remediation',[['Raise purchase order for drive and valve spares','Jordan Lee','2026-10-14',true],['Re-baseline min / max levels using breakdown history','Jordan Lee','2026-10-28',false]]],
  ['ISS-114','HS-code mismatch on two export consignments','Audit finding','F-047','Medium','Evan Brooks','2026-11-15','Documentation','Open',[['Correct master data for affected part numbers','Evan Brooks','2026-11-05',false],['Add second-person check on export invoices','Evan Brooks','2026-11-12',false]]],
  ['ISS-115','Cycle-count variances above tolerance in stores','Control test','CT-125','Medium','Evan Brooks','2026-09-26','Process / procedure','Closed',[['Recount fasteners and seals aisles','Evan Brooks','2026-09-18',true],['Introduce bin-location audit before count','Evan Brooks','2026-09-24',true]]],
  ['ISS-116','Light-curtain test missed on Press 5','Control test','CT-117','High','Jordan Lee','2026-10-19','Process / procedure','In remediation',[['Test and certify Press 5 light curtain','Jordan Lee','2026-10-13',true],['Add test overdue alert to the CMMS','Jordan Lee','2026-10-26',false]]],
  ['ISS-117','Contractor induction records incomplete','Audit finding','F-049','Medium','Morgan Chen','2026-10-09','Documentation','Open',[['Digitise induction register for contract workers','Morgan Chen','2026-10-30',false]]],
  ['ISS-118','One of four PLC programs failed test restoration','Control test','CT-127','Medium','Sam Rivera','2026-11-12','Control design','Open',[['Re-take offline backup for Line 4 PLC and retest','Sam Rivera','2026-11-02',false],['Store backups on segregated media','Sam Rivera','2026-11-10',false]]]],
 kris:[
   ['KRI-01','Unplanned downtime (hours / month)','R-014','Jordan Lee','higher',12,20,[8,9,11,14,16,19],''],
   ['KRI-02','Compressed-air pressure variance (%)','R-014','Jordan Lee','higher',10,15,[6,8,11,13,16,18],'%'],
   ['KRI-03','Overdue preventive-maintenance work orders','R-014','Jordan Lee','higher',5,10,[2,3,4,6,7,9],''],
   ['KRI-04','Wastewater parameter exceedances (count)','R-021','Priya Shah','higher',1,3,[0,0,1,1,2,2],''],
   ['KRI-05','Single-source spend share (%)','R-008','Evan Brooks','higher',40,60,[48,50,52,55,55,58],'%'],
   ['KRI-06','Unpatched OT assets (%)','R-019','Sam Rivera','higher',15,25,[12,14,18,21,24,27],'%'],
   ['KRI-07','Lost-time injury frequency rate','R-006','Morgan Chen','higher',1,2,[0.4,0.5,0.4,0.7,0.6,0.8],''],
   ['KRI-08','Overdue-calibration instruments (%)','R-003','Jordan Lee','higher',5,10,[2,3,3,4,4,3],'%'],
   ['KRI-09','Operator certifications expiring in 30 days (%)','R-033','Jordan Lee','higher',8,15,[4,5,6,5,7,6],'%'],
   ['KRI-10','Hot-work permit audit deviations (per month)','R-036','Jordan Lee','higher',2,4,[0,1,1,2,3,3],''],
   ['KRI-11','Overdue safety-critical inspections (count)','R-038','Jordan Lee','higher',3,6,[1,2,2,4,5,5],''],
   ['KRI-12','Customer-returned defective parts (PPM)','R-041','Jordan Lee','higher',250,500,[120,150,180,210,260,310],''],
   ['KRI-13','Critical spares below minimum stock (%)','R-044','Jordan Lee','higher',10,20,[6,8,9,12,15,17],'%'],
   ['KRI-14','Contract workers on site without valid induction (count)','R-046','Morgan Chen','higher',2,5,[0,1,1,3,4,5],''],
   ['KRI-15','Peak demand as a share of contract demand (%)','R-048','Evan Brooks','higher',95,100,[88,91,93,96,97,99],'%'],
   ['KRI-16','Cycle-counted SKUs out of tolerance (%)','R-052','Evan Brooks','higher',3,5,[1.8,2.2,2.6,3.4,3.9,3.1],'%'],
   ['KRI-17','Export shipments held for documentation errors (per month)','R-050','Evan Brooks','higher',2,4,[0,1,1,2,2,3],'']],
 losses:[
   ['LE-001','2026-08-14','Line 3 compressor trip — 6 h stoppage','Equipment failure','R-014',420000,0,'Closed','Jordan Lee'],
   ['LE-002','2026-07-03','Bearing lot rejected; line starved for two shifts','Supply disruption','R-008',310000,120000,'Closed','Evan Brooks'],
   ['LE-003','2026-09-09','Forklift–pedestrian near miss, Bay 2','Near miss','R-006',0,0,'Under investigation','Morgan Chen'],
   ['LE-004','2026-06-21','Effluent pH exceedance — sample failed','Environmental release','R-021',85000,0,'Closed','Priya Shah'],
   ['LE-005','2026-09-27','Contractor HMI session left open','Cyber / OT','R-019',45000,0,'Closed','Sam Rivera'],
   ['LE-006','2026-05-30','Line 2 sensor drift — batch rework','Quality escape','R-003',260000,60000,'Closed','Jordan Lee'],
   ['LE-007','2026-04-18','Heat-related illness, night shift (first aid)','Safety incident','R-011',38000,0,'Closed','Evan Brooks'],
   ['LE-008','2026-10-04','Hydraulic leak near stores — minor spill','Environmental release','R-025',56000,0,'Under investigation','Priya Shah'],
   ['LE-009','2026-09-17','Press 4 interlock fault · two-shift safety stoppage','Equipment failure','R-038',180000,0,'Closed','Jordan Lee'],
   ['LE-010','2026-08-26','Export consignment held at port · demurrage and re-documentation','Trade / customs','R-050',95000,0,'Closed','Evan Brooks'],
   ['LE-011','2026-09-30','Stores physical count write-off · fasteners and seals','Inventory loss','R-052',140000,0,'Closed','Evan Brooks'],
   ['LE-012','2026-07-22','Contract worker hand injury at packaging line · first aid','Safety incident','R-046',52000,0,'Closed','Morgan Chen'],
   ['LE-013','2026-10-08','Breakdown extended 3 days awaiting imported servo drive','Equipment failure','R-044',230000,0,'Under investigation','Jordan Lee']],
 policies:[
   ['POL-001','Integrated EHS Policy','Policy','3.2','Priya Shah','Published','2027-03-01',412,389,['ISO 45001','ISO 14001'],['OH-12','OH-20','EN-04']],
   ['POL-002','Information Security & OT Access Policy','Policy','2.1','Sam Rivera','Published','2027-01-15',64,52,['NIST CSF'],['OT-09','OT-15']],
   ['POL-003','Supplier Code of Conduct','Policy','1.4','Evan Brooks','In review','2026-12-01',38,0,['ISO 37301'],['SC-05']],
   ['POL-004','Quality Policy','Policy','4.0','Jordan Lee','Published','2027-05-30',412,401,['ISO 9001'],['QA-03','MA-07']],
   ['POL-005','Chemical Handling SOP','SOP','4.0','Priya Shah','Published','2026-09-30',96,71,['ISO 14001','ISO 45001'],['EN-11','EN-12']],
   ['POL-006','Permit-to-Work Procedure','Procedure','2.0','Jordan Lee','Draft','2026-12-15',120,0,['ISO 45001'],['OH-15']],
   ['POL-007','Anti-Bribery & Corruption Policy','Policy','1.2','Morgan Chen','Published','2027-02-10',412,340,['ISO 37301'],[]],
   ['POL-008','Business Continuity Plan','Plan','1.0','Evan Brooks','Approved','2027-06-01',45,0,['ISO 22301'],['SC-05']],
   ['POL-009','Machine Safety & Lockout-Tagout Procedure','Procedure','3.1','Jordan Lee','Published','2027-02-28',210,176,['ISO 45001'],['MS-02','MS-05']],
   ['POL-010','Contractor Safety Management Procedure','Procedure','2.2','Morgan Chen','In review','2026-11-30',130,0,['ISO 45001'],['LB-03']],
   ['POL-011','Product Recall & Traceability Procedure','Procedure','2.0','Jordan Lee','Published','2026-09-30',85,70,['ISO 9001'],['QA-09']],
   ['POL-012','Energy Management Policy','Policy','1.1','Evan Brooks','Approved','2027-04-30',412,290,['ISO 50001'],['EG-02']],
   ['POL-013','Export Controls & Customs Compliance SOP','SOP','1.3','Evan Brooks','Published','2027-01-15',32,30,['ISO 9001'],['TR-04']],
   ['POL-014','Fire & Emergency Response Plan','Plan','5.0','Priya Shah','Published','2027-03-31',412,398,['ISO 45001','ISO 22301'],['FS-03','PS-03']]],
 vendors:[
   ['V-001','Precision Bearings Pvt Ltd','Raw material · bearings',1,'Evan Brooks',true,['R-008'],'2027-03-31','2026-03-14',64,'High'],
   ['V-002','Western Logistics & Freight','Logistics · inbound freight',2,'Evan Brooks',false,[],'2027-08-31','2026-05-20',82,'Medium'],
   ['V-003','ControlLink OT Services','IT / OT · remote maintenance',1,'Sam Rivera',false,['R-027'],'2027-01-31','2026-06-02',58,'High'],
   ['V-004','SafeChem Industrial Supplies','Chemicals · bulk supply',1,'Priya Shah',false,['R-025'],'2027-06-30','2026-04-25',76,'Medium'],
   ['V-005','GreenCycle Waste Handlers','Hazardous waste disposal',2,'Priya Shah',false,['R-021'],'2026-12-31','2026-02-11',69,'High'],
   ['V-006','Apex Packaging Co','Packaging materials',3,'Evan Brooks',false,['R-002'],'2027-09-30','2026-01-20',91,'Low'],
   ['V-007','Shramik Contract Labour Services','Contract labour',2,'Jordan Lee',false,['R-033'],'2027-02-28','2026-07-15',73,'Medium'],
   ['V-008','CalibTech Metrology Labs','Calibration services',3,'Jordan Lee',false,['R-003'],'2027-04-30','2025-06-10',88,'Low'],
   ['V-009','Meridian Industrial Spares','Critical spares distribution',2,'Jordan Lee',true,['R-044'],'2027-05-31','2026-05-12',66,'High'],
   ['V-010','Halden Process Gases','Industrial gases · supply and cylinder safety',1,'Priya Shah',true,['R-036','R-054'],'2027-03-31','2026-04-02',71,'High'],
   ['V-011','Sutra Customs Brokers','Customs clearance and export documentation',2,'Evan Brooks',false,['R-050'],'2026-12-31','2026-01-27',79,'Medium'],
   ['V-012','FireSure Safety Systems','Fire protection annual maintenance',2,'Priya Shah',false,['R-054'],'2027-02-28','2025-12-08',72,'Medium'],
   ['V-013','Kiran Open-Access Power','Renewable power supply',2,'Evan Brooks',false,['R-048'],'2027-09-30','2026-06-18',85,'Low'],
   ['V-014','Tarang Industrial Automation','PLC integration and OT backups',1,'Sam Rivera',false,['R-056','R-019'],'2027-01-31','2026-03-09',69,'High']]});
 // keep the original plant self-assessment wording for the first 15 controls
 s.rcsa[0].assign.forEach((a,i)=>{if(i<15){const done=i<6;a.status=i===9?'Exception':done?'Attested':'Pending';a.date=(i===9||done)?addDays('2026-10-01',i):'';a.comment=i===9?'Pedestrian barriers incomplete in Bay 4; interim marshal in place.':''}else{a.status=i%3===0?'Attested':'Pending';a.date=i%3===0?addDays('2026-10-01',i%11):'';a.comment=''}});
 return s};

const PROFILES={manufacturing:MFG,bfsi:BFSI,general:GEN,...(window.GRC_MORE||{})};
let pid=null;try{pid=((location.hash.match(/^#(?:profile=)?(\w+)$/)||[])[1]);if(!PROFILES[pid])pid=localStorage.getItem('forgeGrcProfile')}catch{}
if(!PROFILES[pid])pid='bfsi';
const P=PROFILES[pid];
GRC.P=P;GRC.PROFILES=PROFILES;GRC.seeds={};Object.values(PROFILES).forEach(p=>{if(p.seed)GRC.seeds[p.id]=p.seed});
GRC.modOn=id=>P.modules.includes(id);
try{localStorage.setItem('forgeGrcProfile',pid)}catch{}

// ---------------------------------------------------------------- apply the profile to the page
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
function setText(sel,t){const e=$(sel);if(e)e.textContent=t}
// profile switcher in the top bar (all profiles)
const top=$('.top-actions');
if(top){const sel=document.createElement('select');sel.className='select';sel.id='profileSwitch';sel.title='Industry profile';sel.style.maxWidth='230px';{const core=['bfsi','general','manufacturing'],opt=p=>`<option value="${p.id}"${p.id===pid?' selected':''}>${p.label}</option>`;sel.innerHTML=`<optgroup label="Core profiles">${core.map(i=>opt(PROFILES[i])).join('')}</optgroup><optgroup label="More industries">${Object.values(PROFILES).filter(p=>!core.includes(p.id)).sort((x,y)=>x.label<y.label?-1:1).map(opt).join('')}</optgroup>`}
 sel.addEventListener('change',()=>{try{localStorage.setItem('forgeGrcProfile',sel.value)}catch{}location.hash=sel.value;location.reload()});top.prepend(sel)}
if(pid==='manufacturing'&&P.extra){
 // manufacturing keeps its original register from index.html; append the deeper records
 const X=P.extra;
 risks.push(...X.risks.map(risk));
 try{if(typeof frameworks!=='undefined')frameworks.push(...X.frameworks);if(typeof findings!=='undefined')findings.push(...X.findings);if(typeof evidence!=='undefined')evidence.push(...X.evidence)}catch(e){console.error('Profile extras',e)}
 try{const fa=$('#areaFilter'),have=new Set([...fa.options].map(o=>o.value));[...new Set(risks.map(r=>r.area))].forEach(a=>{if(!have.has(a))fa.insertAdjacentHTML('beforeend',`<option>${libEsc(a)}</option>`)});
  const sa=areaSel,hs=new Set([...sa.options].map(o=>o.value));[...new Set(risks.map(r=>r.area))].forEach(a=>{if(!hs.has(a))sa.insertAdjacentHTML('beforeend',`<option>${libEsc(a)}</option>`)})}catch(e){console.error('Profile areas',e)}
 try{render()}catch(e){console.error('Profile render',e)}
}
if(pid!=='manufacturing'){
 // data used by the original app
 risks.splice(0,risks.length,...P.risks);
 if(typeof frameworks!=='undefined')frameworks.splice(0,frameworks.length,...P.frameworks);
 if(typeof findings!=='undefined')findings.splice(0,findings.length,...P.findings);
 if(typeof evidence!=='undefined')evidence.splice(0,evidence.length,...P.evidence);
 try{riskTemplates.splice(0,riskTemplates.length,...P.templates);
  templateSel.innerHTML='<option value="">Choose a standard risk from the library…</option>'+riskTemplates.map(t=>`<option value="${libEsc(t.id)}">${libEsc(t.title)}</option>`).join('');
  const areas=[...new Set(risks.map(r=>r.area))];areaSel.innerHTML=areas.map(a=>`<option>${libEsc(a)}</option>`).join('');
  const fa=$('#areaFilter');fa.innerHTML='<option value="all">All areas</option>'+areas.map(a=>`<option>${libEsc(a)}</option>`).join('')}catch(e){console.error('Profile templates',e)}
 const et=$('#evidenceType');if(et)et.innerHTML='<option value="all">All types</option>'+P.evidenceTypes.map(t=>`<option>${t}</option>`).join('');
 try{workflowUsers.forEach(u=>{u.scope=u.scope.replace(/ · Plant 01/,' · '+P.site)})}catch{}
 try{aiAnswers.splice(0,aiAnswers.length,...P.dash.prompts);document.getElementById('promptList').innerHTML=aiAnswers.map(a=>`<button class="btn promptbtn" style="text-align:left;white-space:normal;line-height:1.4" data-prompt="${a[0]}">${a[0]} &nbsp;→</button>`).join('');$$('.promptbtn').forEach(b=>b.onclick=()=>{go('ai');sendChat(b.dataset.prompt)})}catch(e){console.error(e)}
 try{render()}catch(e){console.error('Profile render',e)}
 // static dashboard copy
 const bs0=$('.brand small');if(bs0)bs0.textContent='GRC · ENTERPRISE';
 setText('.plant-name',P.org);setText('.plant-loc','⌖  '+P.loc);setText('.plant-label','WORKSPACE');
 const sub=$('#view-risks .subtitle');if(sub)sub.textContent=P.subtitle.risks;
 const ins=$$('#view-dashboard .ai-body .insight');P.dash.insights.forEach((d,i)=>{const n=ins[i];if(!n)return;n.querySelector('.insight-tag').innerHTML=d[0];const b=n.querySelector('.badgepill');b.className='badgepill pill-'+d[2];b.textContent=d[1];n.querySelector('p').innerHTML=d[3];n.querySelector('.insight-foot').textContent=d[4]});
 const bt=$('#view-dashboard .midgrid .panel:last-child .panel-title');if(bt)bt.textContent='Risk by category';
 const rs=$('#view-dashboard .subtitle');if(rs)rs.textContent='A clear view of risk, compliance and assurance across your organisation.';
 const ml=$$('#view-dashboard .metric-label');if(ml[1])ml[1].textContent=P.dash.eff;if(ml[2])ml[2].textContent=P.dash.comp;
 // wording swap (plant / manufacturing) on static text
 const SW=[[/India Plant 01/g,P.site],[/Plant 01/g,P.site],[/India Manufacturing Demo/g,P.org],[/Maharashtra, India/g,P.loc],[/\bplants\b/g,'sites'],[/\bPlants\b/g,'Sites'],[/\bplant\b/g,'organisation'],[/\bPlant\b/g,'Organisation'],[/Manufacturing-ready access/g,'Enterprise-ready access'],[/standard manufacturing risk/gi,'standard risk'],[/Compressed air[^.]*\./g,'']];
 GRC.swap=()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentNode&&/^(SCRIPT|STYLE|TEXTAREA|OPTION)$/.test(n.parentNode.nodeName)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});const todo=[];while(w.nextNode()){const n=w.currentNode;if(/[Pp]lant|Manufacturing|Maharashtra/.test(n.nodeValue))todo.push(n)}todo.forEach(n=>{let v=n.nodeValue;SW.slice(0,-1).forEach(([a,b])=>{v=v.replace(a,b)});if(v!==n.nodeValue)n.nodeValue=v})};
 // dynamic dashboard cards from live data
 GRC.renders.push(function profileDash(){
  const S=GRC.S&&GRC.S();if(!S)return;const ms=$$('#view-dashboard > .grid .metric');if(ms.length<4)return;
  const open=S.issues.filter(i=>i.status!=='Closed'),od=open.filter(i=>i.due<GRC.TODAY).length;
  const tested=S.controls.filter(c=>c.result!=='Not tested'),eff=tested.length?Math.round(tested.filter(c=>c.result==='Effective').length/tested.length*100):0;
  const ob=S.obl||[],ap=ob.filter(o=>o.status!=='Not applicable'),met=ap.length?Math.round(ap.filter(o=>o.status==='Compliant').length/ap.length*100):0,gap=ap.filter(o=>o.status==='Non-compliant'||o.status==='Partially compliant').length;
  const high=risks.filter(r=>r.score>(S.appetite||12)).length;
  const set=(i,v,f)=>{const m=ms[i];m.querySelector('.metric-value').innerHTML=v;m.querySelector('.metric-foot').innerHTML=f};
  set(0,String(risks.length),`<span class="warn">${high} outside appetite</span>`);
  set(1,eff+'<span style="font-size:17px">%</span>',`<strong>${S.controls.filter(c=>c.result==='Ineffective').length}</strong> ineffective controls`);
  set(2,ob.length?met+'<span style="font-size:17px">%</span>':'–',ob.length?`<span class="warn">${gap} obligations</span> need attention`:'Adopt frameworks to measure');
  set(3,String(open.length).padStart(2,'0'),`<span class="warn">${od} overdue</span> · ${open.length-od} on schedule`);
  const by={};risks.forEach(r=>by[r.area]=(by[r.area]||0)+1);const rows=Object.entries(by).sort((a,b)=>b[1]-a[1]),mx=rows[0]?rows[0][1]:1,cols=['#cb6456','#d79d42','#dfb866','#678bc4','#69ad9b','#8467ac','#5683c7','#2e9f8d'];
  const bars=$('#view-dashboard .midgrid .panel:last-child .bars');if(bars)bars.innerHTML=rows.map((r,i)=>`<div class="barrow drillable" title="Filter risk register by ${r[0]}"><span>${r[0]}</span><div class="bartrack"><div class="barfill" style="width:${r[1]/mx*100}%;background:${cols[i%cols.length]}"></div></div><span class="barcount">${r[1]}</span></div>`).join('');
  const bs=$('#view-dashboard .midgrid .panel:last-child .panel-sub');if(bs)bs.textContent=`${risks.length} active risks · ranked by open items`;
  const bf=$('#view-dashboard .barfoot');if(bf)bf.innerHTML=`<b>${high} risks</b> are outside appetite and need a treatment review`;
  $$('#view-dashboard .midgrid .panel:last-child .barrow').forEach(row=>row.onclick=()=>{go('risks');const f=$('#areaFilter');f.value=row.querySelector('span').textContent;f.dispatchEvent(new Event('input'))});
  GRC.swap();
 });
}
})();
