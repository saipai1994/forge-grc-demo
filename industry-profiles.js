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
 return{v:1,appetite:c.appetite,seq:{issue:110,action:100,test:101+ctl.length,loss:20,policy:20,vendor:20,camp:2},
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
 adopt:['iso27001','nist-csf2','soc2','gdpr','dpdp','iso22301','sox'],
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
  ['R-210','Unmanaged use of AI tools','Technology & cyber','Medium','Medium',8,'Sam Rivera','Nov 20','Monitoring']].map(risk),
 frameworks:[
  ['ISO 27001','Information security','93','90%','4','Nov 12 · Surveillance audit','On track'],
  ['SOC 2','Trust services criteria','64','87%','5','Dec 01 · Type II window','Attention'],
  ['GDPR / DPDP','Privacy','38','82%','6','Nov 18 · DPIA review','Attention'],
  ['SOX ICFR','Financial reporting controls','52','94%','2','Oct 30 · Management testing','On track']],
 findings:[
  ['F-021','Access reviews not completed for finance systems','Internal Audit','High','Sam Rivera','Oct 09','Overdue'],
  ['F-019','Supplier continuity plans missing for top 5 suppliers','Internal Audit','Medium','Evan Brooks','Oct 24','In progress'],
  ['F-017','Privacy notices out of date on two websites','Privacy review','Medium','Priya Shah','Oct 30','In progress'],
  ['F-015','DR test not performed for ERP','External audit','High','Jordan Lee','Nov 10','Open'],
  ['F-012','Policy attestation below target','Compliance review','Low','Morgan Chen','Nov 20','Open']],
 evidenceTypes:['Report','Test result','Log extract','Certificate','Policy attestation'],
 evidence:[
  ['Quarterly user access review · ERP','Report','IT-02','SOC 2','Sam Rivera','Oct 03, 2026','Current'],
  ['Backup restoration test results','Test result','IT-05','ISO 27001','Sam Rivera','Aug 29, 2026','Refresh soon'],
  ['Records of processing extract','Log extract','PR-01','GDPR','Priya Shah','Sep 24, 2026','Current'],
  ['ISO 27001 certificate','Certificate','IT-02','ISO 27001','Sam Rivera','Jun 18, 2026','Current'],
  ['Supplier due-diligence file · Tier 1','Report','TP-01','SOC 2','Evan Brooks','Mar 11, 2026','Refresh soon']],
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
  ['AI governance','Technology & cyber',3,3,'Sam Rivera','Unapproved AI use could leak data or produce unreliable decisions.']].map((t,i)=>({id:'tpl-gen-'+i,title:t[0],area:t[1],likelihood:t[2],impact:t[3],owner:t[4],practice:'',standards:['ISO 31000'],description:t[5]})),
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
  ['HR-02','Succession planning and retention review','Preventive','Manual','Semi-annual','Jordan Lee','People',['R-206'],['ISO 9001'],'2026-06-10','Effective','Morgan Chen',0]],
 issues:[
  ['ISS-101','Access reviews incomplete for finance systems','Audit finding','F-021','High','Sam Rivera','2026-10-09','Process / procedure','In remediation',[['Complete outstanding reviews','Sam Rivera','2026-10-14',false],['Automate review reminders','Sam Rivera','2026-10-28',false]]],
  ['ISS-102','Supplier continuity plans missing for top suppliers','Audit finding','F-019','Medium','Evan Brooks','2026-10-24','Documentation','In remediation',[['Collect plans from top 5 suppliers','Evan Brooks','2026-10-20',false]]],
  ['ISS-103','Privacy notices and records of processing out of date','Control test','PR-01','High','Priya Shah','2026-10-30','Documentation','Open',[['Refresh notices and ROPA entries','Priya Shah','2026-10-27',false]]],
  ['ISS-104','No DR test performed for ERP','Audit finding','F-015','High','Jordan Lee','2026-11-10','Resourcing / capacity','Open',[['Schedule and run ERP recovery test','Jordan Lee','2026-11-05',false]]],
  ['ISS-105','Policy attestation below target','Audit finding','F-012','Low','Morgan Chen','2026-09-28','Training','Closed',[['Send reminders and escalate to managers','Morgan Chen','2026-09-24',true]]]],
 kris:[
  ['KRI-01','Open high-severity audit findings (count)','R-208','Morgan Chen','higher',3,6,[2,3,3,4,4,5],''],
  ['KRI-02','Critical vulnerabilities past SLA (count)','R-204','Sam Rivera','higher',4,8,[2,3,4,6,6,7],''],
  ['KRI-03','Single-source spend share (%)','R-203','Evan Brooks','higher',30,45,[28,30,33,35,37,38],'%'],
  ['KRI-04','Voluntary attrition, key roles (%)','R-206','Jordan Lee','higher',8,12,[6,6,7,8,9,9],'%'],
  ['KRI-05','Privacy requests past deadline (count)','R-209','Priya Shah','higher',2,4,[0,0,1,1,2,3],'']],
 losses:[
  ['LE-001','2026-08-09','Phishing led to invoice fraud','External fraud','R-208',420000,120000,'Closed','Morgan Chen'],
  ['LE-002','2026-07-14','ERP outage · 3 hours','Technology failure','R-207',210000,0,'Closed','Jordan Lee'],
  ['LE-003','2026-09-21','Supplier delivery failure · rush freight','Supply disruption','R-203',340000,60000,'Closed','Evan Brooks'],
  ['LE-004','2026-10-01','Customer data shared with wrong party','Privacy incident','R-209',90000,0,'Under investigation','Priya Shah']],
 policies:[
  ['POL-001','Information Security Policy','Policy','3.2','Sam Rivera','Published','2027-03-01',900,812,['ISO 27001'],['IT-02','IT-09']],
  ['POL-002','Supplier Code of Conduct','Policy','1.4','Evan Brooks','Published','2026-09-30',120,95,['SOC 2'],['TP-01']],
  ['POL-003','Data Protection & Privacy Policy','Policy','2.1','Priya Shah','Published','2027-02-10',900,640,['GDPR','DPDP'],['PR-01']],
  ['POL-004','Business Continuity Plan','Plan','1.2','Jordan Lee','In review','2026-12-10',80,0,['ISO 22301'],['BC-01']],
  ['POL-005','Code of Conduct','Policy','5.0','Morgan Chen','Published','2027-06-30',900,861,['SOX'],[]]],
 vendors:[
  ['V-001','Orbit Components Ltd','Key component supplier',1,'Evan Brooks',true,['R-203'],'2027-03-31','2026-02-02',62,'High'],
  ['V-002','CloudWorks Hosting','Cloud infrastructure',1,'Sam Rivera',false,['R-204'],'2027-06-30','2026-04-18',78,'Medium'],
  ['V-003','PayRoll Partners','Payroll processing',2,'Jordan Lee',false,['R-209'],'2027-01-31','2025-12-04',70,'Medium'],
  ['V-004','Freightline Logistics','Outbound logistics',2,'Evan Brooks',false,['R-203'],'2026-12-31','2026-05-21',81,'Medium'],
  ['V-005','BrightAudit LLP','External audit support',3,'Morgan Chen',false,[],'2027-09-30','2025-10-10',90,'Low']]});

// ---------------------------------------------------------------- manufacturing (existing demo) metadata
const MFG={id:'manufacturing',label:'Manufacturing',org:'India Manufacturing Demo',site:'Plant 01',loc:'Maharashtra, India',
 modules:['obligations','regchange','privacy','cyber','bcp','audit'],
 owners:{GOV:'Morgan Chen',RISK:'Morgan Chen',TPR:'Evan Brooks',INC:'Sam Rivera',RES:'Jordan Lee',TEST:'Priya Shah',PRIV:'Priya Shah',SEC:'Sam Rivera',DISC:'Morgan Chen',CONDUCT:'Morgan Chen',FC:'Priya Shah',AI:'Sam Rivera'},
 adopt:['iso27001','nist-csf2','dpdp','certin','iso22301']};

const PROFILES={manufacturing:MFG,bfsi:BFSI,general:GEN};
let pid=null;try{pid=((location.hash.match(/^#(?:profile=)?(manufacturing|bfsi|general)$/)||[])[1])||localStorage.getItem('forgeGrcProfile')}catch{}
if(!PROFILES[pid])pid='bfsi';
const P=PROFILES[pid];
GRC.P=P;GRC.PROFILES=PROFILES;GRC.seeds={bfsi:BFSI.seed,general:GEN.seed};
GRC.modOn=id=>P.modules.includes(id);
try{localStorage.setItem('forgeGrcProfile',pid)}catch{}

// ---------------------------------------------------------------- apply the profile to the page
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
function setText(sel,t){const e=$(sel);if(e)e.textContent=t}
// profile switcher in the top bar (all profiles)
const top=$('.top-actions');
if(top){const sel=document.createElement('select');sel.className='select';sel.id='profileSwitch';sel.title='Industry profile';sel.style.maxWidth='210px';sel.innerHTML=Object.values(PROFILES).map(p=>`<option value="${p.id}"${p.id===pid?' selected':''}>${p.label}</option>`).join('');
 sel.addEventListener('change',()=>{try{localStorage.setItem('forgeGrcProfile',sel.value)}catch{}location.hash=sel.value;location.reload()});top.prepend(sel)}
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
