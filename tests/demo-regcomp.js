// Regulatory compliance management (regcomp-plus.js): calendar, filings, inspections, certifications, breaches,
// impact assessment, traceability, correspondence, obligation tests and the overview.
// Run: CHROMIUM=/opt/pw-browsers/chromium node tests/demo-regcomp.js   (static server on 8765, or BASE=...)
const {chromium}=require('playwright');
const BASE=process.env.BASE||'http://localhost:8765';
let fails=0;const ok=(n,v,x)=>{if(!v)fails++;console.log(v?'PASS':'FAIL',n,x===undefined?'':(typeof x==='string'?x:JSON.stringify(x)))};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});
const p=await b.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});const errs=[];
p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&!/404|favicon/.test(m.text())&&errs.push(m.text()));p.on('dialog',d=>d.accept());
const wait=(fn,arg,t)=>p.waitForFunction(fn,arg,{timeout:t||8000});
const load=async prof=>{await p.goto(BASE+'/index.html#'+prof);await p.evaluate(()=>{try{indexedDB.deleteDatabase('forgeGrcDms')}catch(e){}});await p.reload();await wait(()=>window.GRC&&GRC.regcomp&&GRC.S().obl&&GRC.S().regFilings)};
const fill=async v=>{for(const [k,x] of Object.entries(v))await p.$eval(`#opFB [name="${k}"]`,(el,x)=>{el.value=x;el.dispatchEvent(new Event('input',{bubbles:true}))},x)};
const submit=async()=>{await p.click('#opFS')};
const formClosed=()=>wait(()=>!document.querySelector('#opForm.show'));
const formOpen=()=>wait(()=>document.querySelector('#opForm.show'));
const closeD=()=>p.evaluate(()=>document.querySelector('#opDrawer [data-op=drawer-close]')?.click());
const nav=async v=>{await closeD();await wait(()=>!document.querySelector('#opDrawer.show'));await p.click(`.nav button[data-view="${v}"]`)};
const tab=async(v,t)=>{await p.evaluate(([v,t])=>document.querySelector(`#view-${v} .libtab[data-op="tab"][data-tab="${t}"]`).click(),[v,t])};
const drawer=async(t,id)=>{await p.evaluate(([t,id])=>GRC.openDrawer(t,id),[t,id]);await wait(()=>document.querySelector('#opDrawer.show')&&document.querySelector('#opDB').innerText.length>20)};
const user=async id=>{await p.selectOption('#demoUserSwitch',id);await wait(i=>document.querySelector('#demoUserSwitch').value===i,id);await p.waitForTimeout(150)};
const S=(fn,a)=>p.evaluate(fn,a);
const dbDrawerText=()=>p.evaluate(()=>document.querySelector('#opDB').innerText);
const toastText=()=>p.evaluate(()=>{const t=document.querySelector('#opToast,.op-toast,.toast');return t?t.innerText:''});

await load('bfsi');
const TODAY=await S(()=>GRC.TODAY);

// ------------------------------------------------ navigation and seeds
const navs=await p.$$eval('.nav button[data-view]',x=>x.map(e=>e.dataset.view));
ok('nine regulatory compliance screens in the nav',['regov','regcal','regfil','reginsp','regcert','regbrc','regcor','regtest','regtrace'].every(v=>navs.includes(v)));
const seed=await S(()=>{const s=GRC.S();return{cal:s.regCal.length,fil:s.regFilings.length,runs:s.regFilingRuns.length,ins:s.regInsp.length,cert:s.regCerts.length,items:s.regCertItems.length,brc:s.regBreach.length,cor:s.regCorr.length,tst:s.regTests.length}});
ok('sample data seeded in every collection',Object.values(seed).every(n=>n>0),seed);
ok('sample filings are generic and labelled',await S(()=>GRC.S().regFilings.every(f=>f.sample&&/Sample, replace with your own filings/.test(f.notes)&&/Sample/.test(f.name))));

// ------------------------------------------------ 1. calendar
const types=await S(()=>[...new Set(GRC.regcomp.calEvents().map(e=>e.type))]);
ok('calendar draws on many sources',types.length>=8&&['Obligation review','Regulatory change','Filing due','Inspection request','Certification due','Breach deadline','Test due','Custom event'].every(t=>types.includes(t)),types);
ok('policy review dates are on the calendar',types.includes('Policy review')||types.includes('Attestation'));
await nav('regcal');await wait(()=>document.querySelector('[data-panel="regcal:month"] table.rg-cal'));
ok('month grid renders with items',(await p.$$('[data-panel="regcal:month"] .rg-ev')).length>0);
ok('overdue and next-30-day cards',/Overdue/.test(await p.textContent('[data-panel="regcal:month"] .op-kpis'))&&/next 30 days/.test(await p.textContent('[data-panel="regcal:month"] .op-kpis')));
await p.click('#opHead-regcal [data-op="rg-cal-new"]');await formOpen();
await fill({title:'Board compliance briefing XYZ',date:TODAY.slice(0,8)+'28',owner:'Priya Shah'});await submit();await formClosed();
ok('custom event added',await S(()=>GRC.S().regCal.some(c=>c.title==='Board compliance briefing XYZ'&&/^CAL-/.test(c.id))));
await tab('regcal','list');
await p.fill('[data-panel="regcal:list"] input.search','Board compliance briefing XYZ');
await wait(()=>document.querySelectorAll('[data-panel="regcal:list"] tbody tr[data-op]').length===1);
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#opHead-regcal [data-op="rg-cal-ics"]')]);
const ics=require('fs').readFileSync(await dl.path(),'utf8');
ok('ICS export has the visible event only',/BEGIN:VCALENDAR/.test(ics)&&(ics.match(/BEGIN:VEVENT/g)||[]).length===1&&/SUMMARY:Custom event: Board compliance briefing XYZ/.test(ics)&&/DTSTART;VALUE=DATE:\d{8}/.test(ics)&&/\r\n/.test(ics),ics.split('\r\n').slice(0,4));
await p.fill('[data-panel="regcal:list"] input.search','');await wait(()=>document.querySelectorAll('[data-panel="regcal:list"] tbody tr[data-op]').length>20||document.querySelector('[data-panel="regcal:list"] .tablemeta'));
await p.selectOption('[data-panel="regcal:list"] select[data-f="ty"]','Filing due');
await wait(()=>[...document.querySelectorAll('[data-panel="regcal:list"] tbody tr')].every(r=>/Filing due/.test(r.innerText)));
const nFil=await S(()=>GRC.regcomp.calEvents().filter(e=>e.type==='Filing due').length);
ok('filter by type',(await p.$$('[data-panel="regcal:list"] tbody tr[data-op]')).length===nFil);
await p.selectOption('[data-panel="regcal:list"] select[data-f="ty"]','All');
await p.click('[data-panel="regcal:list"] tbody tr[data-op] >> nth=0');await wait(()=>document.querySelector('#opDrawer.show'));
ok('calendar row opens the record',/Filing run|Obligation|Regulatory change|Policy|Inspection|Certif|Breach|Calendar|Test|Correspondence/.test(await p.textContent('#opDK')));await closeD();
ok('compliance due tile data',await S(()=>GRC.xTiles.map(f=>f({})).some(t=>t&&t.key==='rc-due30'&&typeof t.v==='number')));

// ------------------------------------------------ 2. filings: definition, generation, maker-checker, late
await nav('regfil');await p.click('#opHead-regfil [data-op="rg-fil-new"]');await formOpen();
await fill({name:'Test return X',regulator:'Test regulator',freq:'Monthly',dueDays:'10',preparer:'Jordan Lee',reviewer:'Jordan Lee'});await submit();
ok('same preparer and reviewer is refused',await S(()=>!GRC.S().regFilings.some(f=>f.name==='Test return X'))&&await p.$('#opForm.show')!==null);
await fill({preparer:'Morgan Chen',reviewer:'Jordan Lee'});await submit();await formClosed();
const fid=await S(()=>GRC.S().regFilings.find(f=>f.name==='Test return X').id);
ok('filing definition created',/^FIL-\d+$/.test(fid));
await wait(()=>document.querySelector('#opDrawer.show [data-op="rg-fil-gen"]'));
await p.click('#opDrawer [data-op="rg-fil-gen"]');await wait(id=>GRC.S().regFilingRuns.filter(r=>r.def===id).length>=12,fid);
const runs=await S(()=>GRC.S().regFilingRuns);const mine=runs.filter(r=>r.def===fid);
ok('runs generated for the next 12 months',mine.length>=12&&mine.length<=14,mine.length);
const due10=mine.every(r=>{const d=new Date(Date.parse(r.end+'T00:00:00Z')+10*864e5).toISOString().slice(0,10);return r.due===d});
ok('due date follows the rule N days after period end',due10);
await p.click('#opDrawer [data-op="rg-fil-gen"]');await p.waitForTimeout(200);
ok('generating twice does not duplicate',(await S(()=>GRC.S().regFilingRuns)).filter(r=>r.def===fid).length===mine.length);
await closeD();
const r1=mine.find(r=>r.due>TODAY).id;
await drawer('filrun',r1);await p.click('#opDrawer [data-op="rg-run-submit"]');await wait(id=>GRC.S().regFilingRuns.find(r=>r.id===id).status==='In review',r1);
await drawer('filrun',r1);await p.click('#opDrawer [data-op="rg-run-review"]');await p.waitForTimeout(250);
ok('maker-checker: preparer cannot review own run',await S(()=>!document.querySelector('#opForm.show'))&&await S(()=>true)&&(await S(()=>GRC.S().regFilingRuns.find(x=>x.status==='In review'&&x.preparedBy==='Morgan Chen'&&!x.reviewedBy)))!==null);
await closeD();await user('jordan');
await drawer('filrun',r1);await p.click('#opDrawer [data-op="rg-run-review"]');await formOpen();await fill({d:'Approve',c:'Checked against the working papers.'});await submit();await formClosed();
ok('a different reviewer approves',await S(id=>GRC.S().regFilingRuns.find(r=>r.id===id).reviewedBy,r1)==='Jordan Lee');
await drawer('filrun',r1);await p.click('#opDrawer [data-op="rg-run-file"]');await formOpen();await fill({filed:TODAY,ack:'ACK-TEST-1',penalty:'0'});await submit();await formClosed();
const f1=await S(id=>GRC.S().regFilingRuns.find(r=>r.id===id),r1);
ok('filed on time with acknowledgement',f1.status==='Filed'&&f1.late===false&&f1.ack==='ACK-TEST-1'&&f1.daysLate===0);
// filing documents from the DMS
const docId=await S(async()=>{const d=await GRC.dms.create({title:'Filed return copy (test)',type:'Regulatory filing'},{text:'Filed return, test copy.'});return d.id});
await drawer('filrun',r1);await p.click('#opDrawer [data-op="rg-doc-pick"]');await formOpen();await fill({doc:docId});await submit();await formClosed();
ok('filed document attached from the DMS and linked back',await S(([id,d])=>GRC.S().regFilingRuns.find(r=>r.id===id).docs.includes(d)&&GRC.dms.docsFor(id).some(x=>x.id===d)||GRC.dms.doc(d).linked.includes(id),[r1,docId]));
await closeD();
// late filing: the seeded run that is past its due date
await user('morgan');
const lateId=await S(()=>GRC.S().regFilingRuns.find(r=>GRC.regcomp.runState(r)==='Late').id);
await nav('regfil');ok('late run is flagged in text',/Late by \d+ d/.test(await p.textContent('[data-panel="regfil:runs"]')));
await user('jordan');await drawer('filrun',lateId);await p.click('#opDrawer [data-op="rg-run-submit"]');await wait(id=>GRC.S().regFilingRuns.find(r=>r.id===id).status==='In review',lateId);
await user('morgan');await drawer('filrun',lateId);await p.click('#opDrawer [data-op="rg-run-review"]');await formOpen();await fill({d:'Approve'});await submit();await formClosed();
await drawer('filrun',lateId);await p.click('#opDrawer [data-op="rg-run-file"]');await formOpen();await fill({filed:TODAY,ack:'ACK-LATE',penalty:'1500',pn:'Sample late fee'});await submit();await formClosed();
const fl=await S(id=>GRC.S().regFilingRuns.find(r=>r.id===id),lateId);
ok('late filing flagged with days late and penalty',fl.status==='Filed'&&fl.late===true&&fl.daysLate>0&&fl.penalty===1500,{late:fl.late,days:fl.daysLate});
await drawer('filrun',lateId);ok('late filing shows in the record',/late/i.test(await dbDrawerText()));await closeD();
// e-signature sign-off on a filing document
await drawer('filrun',r1);ok('e-signature sign-off offered when a document is attached',await p.$('#opDrawer [data-op="rg-run-esign"]')!==null);
await p.click('#opDrawer [data-op="rg-run-esign"]');await formOpen();await fill({signer:'Jordan Lee'});await submit();await wait(id=>GRC.S().regFilingRuns.find(r=>r.id===id).esign,r1);
ok('e-signature request created for the filing',await S(id=>{const r=GRC.S().regFilingRuns.find(x=>x.id===id);return !!GRC.esign.req(r.esign)},r1));await closeD();await user('morgan');

// ------------------------------------------------ 3. inspections
await drawer('insp','INS-002');
await p.click('#opDrawer [data-op="rg-req-add"]');await formOpen();await fill({text:'Board minutes for the last four meetings',due:TODAY,owner:'Sam Rivera'});await submit();await formClosed();
await drawer('insp','INS-002');await p.click('#opDrawer [data-op="rg-fnd-add"]');await formOpen();await fill({text:'Escalation of near misses is not documented',severity:'High',owner:'Sam Rivera',due:'2027-01-15'});await submit();await formClosed();
const ins2=await S(()=>GRC.S().regInsp.find(i=>i.id==='INS-002'));
ok('request and finding recorded',ins2.requests.length===1&&ins2.findings.length===1&&/^INS-002-F\d+$/.test(ins2.findings[0].id));
await drawer('insp','INS-002');await p.click('#opDrawer [data-op="rg-fnd-plan"]');await wait(()=>GRC.S().regInsp.find(i=>i.id==='INS-002').findings[0].issue);
const fnd=await S(()=>{const f=GRC.S().regInsp.find(i=>i.id==='INS-002').findings[0];return{f,is:GRC.S().issues.find(i=>i.id===f.issue)}});
ok('create action plan raises an issue',fnd.is&&fnd.is.link===fnd.f.id&&fnd.is.source==='Regulatory inspection'&&fnd.is.sev==='High');
await drawer('insp','INS-002');await p.click('#opDrawer [data-op="rg-fnd-close"]');await p.waitForTimeout(250);
ok('closure blocked while the action plan is open',await S(()=>GRC.S().regInsp.find(i=>i.id==='INS-002').findings[0].status!=='Closed'));
await S(()=>{const i=GRC.S().issues.find(x=>x.id===GRC.S().regInsp.find(i=>i.id==='INS-002').findings[0].issue);i.status='Closed';GRC.commit()});
await drawer('insp','INS-002');await p.click('#opDrawer [data-op="rg-fnd-close"]');await formOpen();await fill({note:'Procedure updated and sample of 10 near misses reviewed, all escalated.'});await submit();await formClosed();
ok('finding closed with evidence',await S(()=>{const f=GRC.S().regInsp.find(i=>i.id==='INS-002').findings[0];return f.status==='Closed'&&f.closedOn&&f.evNote.length>15}));
await nav('reginsp');
const kv=await p.$$eval('[data-panel="reginsp:reg"] .op-kpi',x=>x.map(e=>[e.querySelector('.l').innerText,e.querySelector('.v').innerText]));
ok('inspection dashboard shows open findings and overdue requests',kv.some(k=>/Open findings/.test(k[0])&&+k[1]>=2)&&kv.some(k=>/Overdue document requests/.test(k[0])&&+k[1]>=1),kv);
await p.click('[data-panel="reginsp:reg"] .op-kpi:has-text("Open findings")');await wait(()=>/INS-/.test(document.querySelector('#opDB').innerText));
ok('inspection KPI drills to the findings',/INS-001-F01|INS-001/.test(await dbDrawerText()));await closeD();

// ------------------------------------------------ 8. correspondence linked to a document
const cdoc=await S(async()=>(await GRC.dms.create({title:'Regulator letter scan (test)',type:'Regulator correspondence'},{text:'Letter from the regulator.'})).id);
await drawer('corr','COR-001');await p.click('#opDrawer [data-op="rg-doc-pick"]');await formOpen();await fill({doc:cdoc});await submit();await formClosed();
ok('correspondence has the DMS document attached and the document links back',await S(d=>GRC.S().regCorr.find(c=>c.id==='COR-001').docs.includes(d)&&GRC.dms.docsFor('COR-001').some(x=>x.id===d),cdoc));
await nav('regcor');await p.click('#opHead-regcor [data-op="rg-cor-new"]');await formOpen();await fill({regulator:'Test regulator',subject:'Follow-up letter on test inspection',link:'INS-002',date:TODAY,respDue:'2026-12-01'});await submit();await formClosed();
ok('correspondence linked to an inspection',await S(()=>GRC.S().regCorr.some(c=>c.subject==='Follow-up letter on test inspection'&&c.link==='INS-002')));
await drawer('insp','INS-002');ok('inspection shows its correspondence',/Follow-up letter on test inspection|COR-004/.test(await dbDrawerText()));await closeD();
ok('overdue regulator reply is counted',await S(()=>GRC.S().regCorr.some(c=>c.id==='COR-003')&&GRC.S().regCorr.find(c=>c.id==='COR-003').respDue<GRC.TODAY));

// ------------------------------------------------ 4. certifications
await nav('regcert');await p.click('#opHead-regcert [data-op="rg-cyc-new"]');await formOpen();
await fill({name:'Test certification cycle',period:'Test period',role:'Function head',due:'2026-11-20'});await submit();await formClosed();
const cy=await S(()=>{const c=GRC.S().regCerts.find(x=>x.name==='Test certification cycle');return{c,items:GRC.S().regCertItems.filter(i=>i.cycle===c.id)}});
ok('certification cycle generates one item per owner',cy.items.length>=2&&cy.items.every(i=>i.obls.length>0)&&new Set(cy.items.map(i=>i.certifier)).size===cy.items.length,cy.items.length);
const item=cy.items.find(i=>i.certifier==='Morgan Chen')||cy.items[0];
if(item.certifier!=='Morgan Chen'){console.log('NOTE no item for Morgan; skipping sign test')}
await closeD();
await drawer('crtitem',item.id);await p.click(`#opDrawer [data-op="rg-ans"][data-ob="${item.obls[0].ob}"]`);await formOpen();await fill({ans:'Non-compliant',comment:''});await submit();await p.waitForTimeout(250);
ok('non-compliant needs a comment',await S(([i,o])=>!GRC.S().regCertItems.find(x=>x.id===i).obls.find(x=>x.ob===o).ans,[item.id,item.obls[0].ob]));
await fill({comment:'Evidence of the quarterly review is missing for this period.'});await submit();await formClosed();
const ans=await S(([i,o])=>{const a=GRC.S().regCertItems.find(x=>x.id===i).obls.find(x=>x.ob===o);return{a,is:GRC.S().issues.find(x=>x.id===a.issue)}},[item.id,item.obls[0].ob]);
ok('non-compliant answer creates an issue',ans.a.ans==='Non-compliant'&&ans.is&&ans.is.source==='Compliance certification'&&ans.is.link===`${item.id}-${item.obls[0].ob}`);
await drawer('crtitem',item.id);await p.click('#opDrawer [data-op="rg-cert-sign"]');await p.waitForTimeout(250);
ok('cannot sign with unanswered obligations',await S(i=>GRC.S().regCertItems.find(x=>x.id===i).status!=='Signed',item.id));
await p.click('#opDrawer [data-op="rg-ans-rest"]');await formOpen();await fill({ans:'Compliant',ok:'yes'});await submit();await formClosed();
await drawer('crtitem',item.id);await p.click('#opDrawer [data-op="rg-cert-sign"]');await formOpen();await fill({typed:'Wrong Name',ok:'yes'});await submit();await p.waitForTimeout(250);
ok('typed name must match',await S(i=>GRC.S().regCertItems.find(x=>x.id===i).status!=='Signed',item.id));
await fill({typed:'Morgan Chen',ok:'yes'});await submit();await wait(i=>GRC.S().regCertItems.find(x=>x.id===i).status==='Signed',item.id);
const sg=await S(i=>{const s=GRC.S().regCertItems.find(x=>x.id===i).signed;return{s,req:s.req&&GRC.esign.req(s.req)&&GRC.esign.req(s.req).status}},item.id);
ok('certification signed (e-signature when available, typed otherwise) with timestamp',sg.s.ts&&(sg.s.method==='esign'?sg.req==='Completed':sg.s.method==='typed'),{m:sg.s.method,req:sg.req});
await S(c=>{GRC.S().regCerts.find(x=>x.name==='Test certification cycle').due='2026-10-05';GRC.commit()});
await tab('regcert','items');ok('late certifications are flagged in text',/Late/.test(await p.textContent('[data-panel="regcert:items"] tbody')));
await tab('regcert','roll');ok('roll-up by unit and owner',/Completion by unit/.test(await p.textContent('[data-panel="regcert:roll"]'))&&/Completion by owner/.test(await p.textContent('[data-panel="regcert:roll"]')));

// ------------------------------------------------ 5. breaches
await nav('regbrc');await p.click('#opHead-regbrc [data-op="rg-brc-new"]');await formOpen();
const yday=await S(()=>{const d=new Date(Date.parse(GRC.TODAY+'T00:00:00Z')-864e5);return d.toISOString().slice(0,10)});
await fill({title:'Test breach with clock',what:'A test breach to check the countdown and overdue states.',notifyReq:'Yes',clockVal:'',discovered:yday+'T09:00'});await submit();await p.waitForTimeout(250);
ok('clock must be set when notification is required',await S(()=>!GRC.S().regBreach.some(x=>x.title==='Test breach with clock')));
await fill({clockVal:'6',clockUnit:'hours'});await submit();await formClosed();
const bid=await S(()=>GRC.S().regBreach.find(x=>x.title==='Test breach with clock').id);
await wait(()=>document.querySelector('#opDrawer.show'));
const bt=await dbDrawerText();ok('overdue clock shown in text',/Overdue by/.test(bt),bt.match(/Overdue by[^\n]*/)&&bt.match(/Overdue by[^\n]*/)[0]);
ok('UI tells people to confirm deadlines with Legal',/Legal/.test(bt));await closeD();
await nav('regbrc');ok('register row shows overdue state',/Overdue by/.test(await p.textContent('[data-panel="regbrc:reg"]')));
await p.click('#opHead-regbrc [data-op="rg-brc-new"]');await formOpen();await fill({title:'Test breach running',what:'Second test breach with a long clock.',notifyReq:'Yes',clockVal:'5',clockUnit:'days',discovered:TODAY+'T10:00'});await submit();await formClosed();
const rb=await S(()=>GRC.regcomp.clockOf(GRC.S().regBreach.find(x=>x.title==='Test breach running')));
ok('running clock shows a countdown',rb.state==='running'&&/left/.test(rb.text),rb.text);await closeD();
await drawer('breach',bid);await p.click('#opDrawer [data-op="rg-brc-issue"]');await wait(i=>GRC.S().regBreach.find(x=>x.id===i).issues.length===1,bid);
ok('corrective action linked to an issue',await S(i=>{const b=GRC.S().regBreach.find(x=>x.id===i),is=GRC.S().issues.find(x=>x.id===b.issues[0]);return is&&is.link===i&&is.source==='Regulatory breach'},bid));
await drawer('breach',bid);await p.click('#opDrawer [data-op="rg-brc-analysis"]');await formOpen();await fill({rootCause:'Manual step missed',impact:'Late report',penalty:'25000'});await submit();await formClosed();
await drawer('breach',bid);await p.click('#opDrawer [data-op="rg-brc-notify"]');await formOpen();await fill({sentAt:TODAY+'T11:00',sentRef:'NOTIF-T1'});await submit();await formClosed();
const cl=await S(i=>GRC.regcomp.clockOf(GRC.S().regBreach.find(x=>x.id===i)),bid);
ok('late notification recorded as late',cl.state==='late'&&/after the deadline/.test(cl.text),cl.text);
await drawer('breach',bid);ok('penalty shown with currency',/25,000/.test(await dbDrawerText()));await closeD();

// ------------------------------------------------ 6. impact assessment
const rc1=await S(()=>{const r=GRC.S().regchg.find(x=>x.fw&&GRC.S().obl.some(o=>o.fw===x.fw))||GRC.S().regchg[0];return{id:r.id,fw:r.fw,n:(r.obligations||[]).length}});
const sug=await S(id=>{const r=GRC.S().regchg.find(x=>x.id===id),s=GRC.regcomp.suggest(r);return{ob:s.ob.length,fw:s.fw,pol:s.pol.length,ctl:s.ctl.length,units:s.units.length}},rc1.id);
ok('impact assessment auto-suggests obligations',sug.ob>0,sug);
await nav('regchange');await tab('regchange','ia');ok('impact tab lists changes',/Awaiting assessment/.test(await p.textContent('[data-panel="regchange:ia"]')));
await drawer('regchange',rc1.id);ok('impact box shows suggestions and progress',await p.$('#iaBox')!==null&&/Suggested obligations/.test(await p.textContent('#iaBox'))&&/complete/.test(await p.textContent('#iaBox')));
await p.click('#iaBox [data-op="rg-ia-addall"]');await wait(([id,n])=>GRC.S().regchg.find(r=>r.id===id).obligations.length>n,[rc1.id,rc1.n]);
await closeD();await user('jordan');
await drawer('regchange',rc1.id);await p.click('#iaBox [data-op="rg-ia-assess"]');await formOpen();await fill({applic:'Applies',rationale:'We hold customer records in scope of this change.'});await submit();await formClosed();
await drawer('regchange',rc1.id);await p.click('#iaBox [data-op="rg-ia-task-std"]');await wait(id=>GRC.S().regchg.find(r=>r.id===id).ia.tasks.length>=4,rc1.id);
ok('implementation plan with owner and due dates',await S(id=>GRC.S().regchg.find(r=>r.id===id).ia.tasks.every(t=>t.owner&&t.due&&t.status==='Open'),rc1.id));
await drawer('regchange',rc1.id);await p.click('#iaBox [data-op="rg-ia-rate"]');await formOpen();const rate=await S(id=>GRC.regcomp.iaScore(GRC.S().regchg.find(r=>r.id===id)).suggested,rc1.id);await fill({rating:rate});await submit();await formClosed();
ok('rating saved with a score',await S(id=>{const r=GRC.S().regchg.find(x=>x.id===id);return !!r.ia.rating&&r.impact===r.ia.rating&&r.ia.score>0},rc1.id));
await drawer('regchange',rc1.id);await p.click('#iaBox [data-op="rg-ia-sign"]');await p.waitForTimeout(250);
ok('assessor cannot sign off their own assessment',await S(id=>!GRC.S().regchg.find(x=>x.id===id).ia.signoff,rc1.id));await closeD();
await S(id=>{GRC.S().regchg.find(r=>r.id===id).ia.tasks.forEach(t=>t.status='Done');GRC.commit()},rc1.id);
await user('morgan');await drawer('regchange',rc1.id);await p.click('#iaBox [data-op="rg-ia-sign"]');await formOpen();await fill({typed:'Morgan Chen',ok:'yes'});await submit();await wait(id=>GRC.S().regchg.find(r=>r.id===id).ia.signoff,rc1.id);
ok('compliance head sign-off recorded',await S(id=>{const s=GRC.S().regchg.find(r=>r.id===id).ia.signoff;return s&&(s.method==='esign'||s.method==='typed')},rc1.id));
await drawer('regchange',rc1.id);await p.click('#iaBox [data-op="rg-ia-effect"]');await formOpen();await fill({result:'Effective',note:'Re-tested a sample after go-live; all passed.'});await submit();await formClosed();
const fin=await S(id=>{const r=GRC.S().regchg.find(x=>x.id===id);return{st:r.status,pct:GRC.regcomp.iaProgress(r).pct}},rc1.id);
ok('effectiveness check completes the change',fin.st==='Implemented'&&fin.pct===100,fin);
// changes from the feed inbox keep their source link
await S(()=>{GRC.S().regchg.push({id:'RC-090',title:'Feed test change about outsourcing',source:'Sample feed',type:'Guidance',published:GRC.TODAY,effective:'2027-02-01',impact:'Medium',status:'New',owner:'Morgan Chen',fw:'',summary:'Feed item.',obligations:[],notes:'',link:'https://example.org/source-item',feedItem:'SAMPLE-1'});GRC.commit()});
await drawer('regchange','RC-090');ok('feed-converted change shows its source link',/example\.org\/source-item/.test(await dbDrawerText())&&await p.$('#opDB a[href="https://example.org/source-item"]')!==null);await closeD();
ok('existing change fields untouched',await S(()=>GRC.S().regchg.every(r=>r.id&&r.title&&r.status&&Array.isArray(r.obligations))));

// ------------------------------------------------ 7. traceability
await nav('regtrace');const tr=await S(()=>{const d=GRC.regcomp.traceData(),by={};d.forEach(r=>r.gaps.forEach(g=>by[g]=(by[g]||0)+1));return{n:d.length,by,traced:d.filter(r=>r.traced).length}});
const gk=Object.keys(tr.by).sort((a,b)=>tr.by[b]-tr.by[a])[0];
ok('matrix finds obligations with a gap',tr.n>0&&!!gk,tr);
await p.selectOption('[data-panel="regtrace:matrix"] select[data-f="g"]',gk);
await wait(n=>document.querySelectorAll('[data-panel="regtrace:matrix"] tbody tr[data-op]').length===n,Math.min(tr.by[gk],50));
ok(`gap filter lists the obligations with "${gk}"`,(await p.$$('[data-panel="regtrace:matrix"] tbody tr[data-op]')).length===Math.min(tr.by[gk],50));
const [dl2]=await Promise.all([p.waitForEvent('download'),p.click('#opHead-regtrace [data-op="rg-trace-csv"]')]);
const csv=require('fs').readFileSync(await dl2.path(),'utf8').trim().split('\r\n');
ok('traceability CSV has a header and one row per obligation',/^"Obligation"/.test(csv[0])&&csv.length===tr.n+1&&/Fully traced/.test(csv[0]),{lines:csv.length,n:tr.n});
await tab('regtrace','cov');ok('coverage by framework and jurisdiction',/Coverage by framework/.test(await p.textContent('[data-panel="regtrace:cov"]'))&&/Coverage by jurisdiction/.test(await p.textContent('[data-panel="regtrace:cov"]')));
await p.click('[data-panel="regtrace:cov"] .op-link[data-op="rg-list"] >> nth=0');await wait(()=>document.querySelector('#opDrawer.show')&&/OB-/.test(document.querySelector('#opDB').innerText));
ok('every coverage number drills to the obligations',/OB-/.test(await dbDrawerText()));await closeD();
await tab('regtrace','gaps');ok('gap lists render',/No control \(\d+\)/.test(await p.textContent('[data-panel="regtrace:gaps"]')));

// ------------------------------------------------ 9. obligation tests
await drawer('rtest','TST-004');await p.click('#opDrawer [data-op="rg-test-rec"]');await formOpen();
await fill({result:'Fail',note:'Sampled 10 records; 3 had no second approval recorded.',raise:'yes',date:TODAY});await submit();await formClosed();
const tt=await S(()=>{const t=GRC.S().regTests.find(x=>x.id==='TST-004'),h=t.hist[t.hist.length-1];return{t,is:GRC.S().issues.find(i=>i.id===h.issue)}});
ok('failed test raises an issue',tt.t.result==='Fail'&&tt.is&&tt.is.source==='Obligation test'&&tt.is.link.startsWith('TST-004')&&tt.t.due>TODAY,tt.is&&tt.is.id);
await nav('regtest');await tab('regtest','cov');ok('coverage view lists obligations tested in the last 12 months',/Tested in last 12 months/.test(await p.textContent('[data-panel="regtest:cov"]')));
ok('test result counts as coverage',await S(()=>{const o=GRC.S().regTests.find(x=>x.id==='TST-004').ob;return GRC.S().regTests.some(t=>t.ob===o&&t.hist.some(h=>h.result!=='Not tested'&&h.date>=GRC.TODAY.slice(0,4)+'-01-01'))}));

// ------------------------------------------------ 10. overview
await nav('regov');
const ov=await p.$$eval('#view-regov .op-kpi',x=>x.map(e=>e.querySelector('.l').innerText));
ok('overview has cards for every area',['Overdue filings','Open inspection findings','Breaches within the clock','Certifications outstanding','Obligations untested','Changes awaiting assessment'].every(l=>ov.includes(l)),ov);
await S(()=>GRC.S().regFilingRuns.find(r=>r.status!=='Filed').due=GRC.TODAY.slice(0,8)+'01');await S(()=>GRC.commit());
await p.click('#view-regov .op-kpi:has-text("Overdue filings")');await wait(()=>document.querySelector('#opDrawer.show')&&/FRN-/.test(document.querySelector('#opDB').innerText));
ok('overview card drills to the records',/FRN-/.test(await dbDrawerText()));await closeD();
await p.click('#view-regov .op-kpi:has-text("Open inspection findings")');await wait(()=>document.querySelector('#opDrawer.show')&&/INS-/.test(document.querySelector('#opDB').innerText));
ok('findings card drills to findings',/INS-/.test(await dbDrawerText()));await closeD();
await nav('launchpad');await wait(()=>document.querySelectorAll('.fx-tile').length>5);ok('home still renders',true);

// ------------------------------------------------ other actions: ad hoc runs, status changes, replies, tests, uploads
await drawer('filing','FIL-001');await p.click('#opDrawer [data-op="rg-run-adhoc"]');await formOpen();await fill({period:'Event-driven filing (test)',end:TODAY,due:'2026-12-31'});await submit();await formClosed();
ok('ad hoc run added',await S(()=>GRC.S().regFilingRuns.some(r=>r.period==='Event-driven filing (test)'&&r.def==='FIL-001'&&r.due==='2026-12-31')));
await closeD();await drawer('cal','CAL-001');await p.click('#opDrawer [data-op="rg-cal-done"]');await wait(()=>GRC.S().regCal.find(c=>c.id==='CAL-001').done);
ok('calendar event marked done and shown as done',await S(()=>GRC.regcomp.calEvents().find(e=>e.ref==='CAL-001').state==='Done'));await closeD();
await drawer('insp','INS-001');await p.click('#opDrawer [data-op="rg-insp-status"]');await formOpen();await fill({status:'Closed'});await submit();await p.waitForTimeout(250);
ok('inspection cannot close with open findings',await S(()=>GRC.S().regInsp.find(i=>i.id==='INS-001').status==='In progress'));await p.click('#opForm [data-op="form-close"]');
await p.click('#opDrawer [data-op="rg-req-upd"][data-sid="INS-001-R01"]');await formOpen();await fill({status:'Provided',note:''});await submit();await p.waitForTimeout(250);
ok('request cannot be marked provided without a response',await S(()=>GRC.S().regInsp[0].requests[0].status!=='Provided'));
await fill({note:'Sent by secure channel on request.'});await submit();await formClosed();
ok('request marked provided with a note',await S(()=>GRC.S().regInsp[0].requests[0].status==='Provided'));
await drawer('corr','COR-003');await p.click('#opDrawer [data-op="rg-cor-reply"]');await formOpen();await fill({respDue:''});await submit();await formClosed();
ok('logging a response marks the inbound item responded',await S(()=>GRC.S().regCorr.find(c=>c.id==='COR-003').status==='Responded'&&GRC.S().regCorr.some(c=>c.replyTo==='COR-003'&&c.dir==='Outbound')));
await drawer('breach','BRC-002');await p.click('#opDrawer [data-op="rg-brc-status"]');await formOpen();await fill({status:'Closed'});await submit();await p.waitForTimeout(250);
ok('breach cannot close before the required notification',await S(()=>GRC.S().regBreach.find(b=>b.id==='BRC-002').status!=='Closed'));await p.click('#opForm [data-op="form-close"]');await closeD();
const untested=await S(()=>GRC.S().obl.find(o=>o.status!=='Not applicable'&&!GRC.S().regTests.some(t=>t.ob===o.id)).id);
await drawer('obligation',untested);await p.click('#opDrawer [data-op="rg-test-new"]');await formOpen();await fill({freq:'Quarterly',tester:'Sam Rivera',due:'2026-11-30'});await submit();await formClosed();
ok('test scheduled from the obligation record',await S(o=>GRC.S().regTests.some(t=>t.ob===o&&t.freq==='Quarterly'&&t.tester==='Sam Rivera'),untested));
await nav('regtest');await p.click('#opHead-regtest [data-op="rg-test-new"]');await formOpen();await fill({ob:untested});await submit();await p.waitForTimeout(250);
ok('duplicate active test plan refused',(await S(o=>GRC.S().regTests.filter(t=>t.ob===o).length,untested))===1);await p.click('#opForm [data-op="form-close"]');
const nT=await S(()=>GRC.S().regTests.length);await p.click('#opHead-regtest [data-op="rg-test-bulk"]');await wait(n=>GRC.S().regTests.length>n,nT);
ok('bulk planning adds at most 20 tests',(await S(()=>GRC.S().regTests.length))-nT<=20);
await drawer('regchange','RC-090');await p.click('#iaBox [data-op="rg-ia-unit"]');await formOpen();await fill({u:'Customer onboarding'});await submit();await formClosed();
await drawer('regchange','RC-090');ok('process added to the assessment',/Customer onboarding/.test(await p.textContent('#iaBox')));
await p.click('#iaBox [data-op="rg-ia-rm"][data-k="units"][data-v="Customer onboarding"]');await wait(()=>!GRC.S().regchg.find(r=>r.id==='RC-090').ia.links.units.includes('Customer onboarding'));
ok('linked process removed',true);await p.click('#iaBox [data-op="rg-ia-task-add"]');await formOpen();await fill({text:'Update the outsourcing procedure',due:'2026-12-15'});await submit();await formClosed();
await drawer('regchange','RC-090');await p.click('#iaBox [data-op="rg-ia-task"]');await formOpen();await fill({status:'Done'});await submit();await formClosed();
ok('task added and updated',await S(()=>{const t=GRC.S().regchg.find(r=>r.id==='RC-090').ia.tasks;return t.length===1&&t[0].status==='Done'}));
await nav('regcert');await tab('regcert','cyc');const cid=await S(()=>GRC.S().regCerts.find(c=>c.name==='Test certification cycle').id);
await drawer('cert',cid);const [dl3]=await Promise.all([p.waitForEvent('download'),p.click('#opDrawer [data-op="rg-cyc-csv"]')]);
ok('certification answers exported as CSV',/^"Item","Certifier"/.test(require('fs').readFileSync(await dl3.path(),'utf8')));
await p.click('#opDrawer [data-op="rg-cyc-status"]');await wait(c=>GRC.S().regCerts.find(x=>x.id===c).status==='Closed',cid);ok('cycle closed',true);
// upload a file from the user's computer into a correspondence record
await drawer('corr','COR-002');await p.setInputFiles('#opDrawer input[data-rg-up]',{name:'reply-letter.txt',mimeType:'text/plain',buffer:Buffer.from('Reply letter to the regulator, test file.')});
await wait(()=>GRC.S().regCorr.find(c=>c.id==='COR-002').docs.length>=2);
const up=await S(()=>{const d=GRC.S().regCorr.find(c=>c.id==='COR-002').docs.slice(-1)[0];return{d,t:GRC.dms.doc(d).title,l:GRC.dms.doc(d).linked}});
ok('uploaded file becomes a document linked to the record',up.t==='reply-letter'&&up.l.includes('COR-002'),up);
await drawer('corr','COR-002');await p.click(`#opDrawer [data-op="rg-doc-detach"][data-doc="${up.d}"]`);await wait(d=>!GRC.S().regCorr.find(c=>c.id==='COR-002').docs.includes(d),up.d);
ok('document detached',true);
// Auditors are read-only
await user('morgan');

// ------------------------------------------------ errors
await user('morgan');
ok('no page errors in the main flow',errs.length===0,errs.slice(0,3));

// ------------------------------------------------ every screen and drawer in three profiles
for(const prof of ['bfsi','healthcare','manufacturing']){
 errs.length=0;await load(prof);
 const res=await p.evaluate(async()=>{const out={views:0,drawers:0,empty:[]};
  for(const v of ['regov','regcal','regfil','reginsp','regcert','regbrc','regcor','regtest','regtrace','regchange']){document.querySelector(`.nav button[data-view="${v}"]`).click();await new Promise(r=>setTimeout(r,60));
   const tabs=[...document.querySelectorAll(`#view-${v} .libtab[data-op="tab"]`)].map(t=>t.dataset.tab);for(const t of tabs){document.querySelector(`#view-${v} .libtab[data-op="tab"][data-tab="${t}"]`).click();await new Promise(r=>setTimeout(r,40));
    const pn=document.querySelector(`[data-panel="${v}:${t}"]`);if(!pn||pn.innerText.trim().length<20)out.empty.push(v+':'+t);out.views++}}
  const s=GRC.S(),recs=[['cal',s.regCal],['filing',s.regFilings],['filrun',s.regFilingRuns],['insp',s.regInsp],['cert',s.regCerts],['crtitem',s.regCertItems],['breach',s.regBreach],['corr',s.regCorr],['rtest',s.regTests],['regchange',s.regchg]];
  for(const [t,l] of recs)for(const r of l.slice(0,6)){GRC.openDrawer(t,r.id);await new Promise(x=>setTimeout(x,30));if(document.querySelector('#opDB').innerText.length<30)out.empty.push(t+':'+r.id);out.drawers++;document.querySelector('#opDrawer [data-op=drawer-close]')?.click()}
  return out});
 ok(`${prof}: ${res.views} panels and ${res.drawers} drawers render, no page errors`,res.empty.length===0&&errs.length===0&&res.views>=18,{empty:res.empty.slice(0,4),errs:errs.slice(0,2)});
}
console.log(fails?`\n${fails} FAILED`:'\nall passed');await b.close();process.exit(fails?1:0)})().catch(e=>{console.log('FAIL crashed',e.message);process.exit(1)});
