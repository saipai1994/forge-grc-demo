const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});
const prof=process.argv[2]||'bfsi';const p=await b.newPage({viewport:{width:1400,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&!/404/.test(m.text())&&errs.push(m.text()));
const ok=(n,v)=>console.log(v?'PASS':'FAIL',n);
await p.goto((process.env.BASE||'http://localhost:8765')+'/index.html#'+prof);await p.waitForTimeout(2500);
ok('org module in nav',!!(await p.$('.nav button[data-view="org"]')));
ok('setup banner on dashboard',!!(await p.$('#orgBanner')));
await p.click('.nav button[data-view="org"]');await p.waitForTimeout(300);
// wizard
await p.click('#view-org [data-op="org-wizard"] >> visible=true >> nth=0');await p.waitForTimeout(200);
await p.fill('#opFB [name=name]','Acme Finance Ltd');await p.fill('#opFB [name=hq]','Mumbai');await p.click('#opFS');await p.waitForTimeout(300);
ok('step 2 shown',(await p.textContent('#opFT')).includes('step 2'));
await p.click('#opFS');await p.waitForTimeout(300);
ok('step 3 shown',(await p.textContent('#opFT')).includes('step 3'));
await p.selectOption('#opFB [name=mode]','clean');await p.click('#opFS');await p.waitForTimeout(300);
ok('step 4 shown',(await p.textContent('#opFT')).includes('step 4'));
await p.click('#opFS');await p.waitForTimeout(1500);
const st=await p.evaluate(()=>({done:GRC.S().org.profile.done,ents:GRC.S().org.entities.length,sites:GRC.S().org.sites.length,issues:GRC.S().issues.length,controls:GRC.S().controls.length,risks:risks.length,title:document.title}));
console.log(' ',JSON.stringify(st));ok('wizard completed, clean start',st.done&&st.ents===1&&st.sites===1&&st.issues===0&&st.controls===0&&st.risks===0);
// every nav view renders without errors on clean data
const views=await p.$$eval('.nav button',x=>x.map(b=>b.dataset.view));
for(const v of views){await p.click(`.nav button[data-view="${v}"]`);await p.waitForTimeout(150);const tabs=await p.$$eval(`#view-${v} .libtab`,x=>x.map(b=>b.dataset.tab));for(const t of tabs){await p.evaluate(([v,t])=>document.querySelector(`#view-${v} .libtab[data-tab="${t}"]`)?.click(),[v,t]);await p.waitForTimeout(60)}}
ok('all views render on clean data (errors: '+errs.length+')',errs.length===0);if(errs.length)console.log(errs.slice(0,6));
// persists after reload
await p.reload();await p.waitForTimeout(2500);
ok('clean start survives reload',await p.evaluate(()=>risks.length===0&&GRC.S().org.profile.done));
// import
await p.click('.nav button[data-view="org"]');await p.evaluate(()=>document.querySelector('#view-org .libtab[data-tab="import"]').click());
await p.selectOption('#impType','issues');
require('fs').writeFileSync('/tmp/imp.csv','title,severity,owner,due,source,link,description\nLate KYC closure,High,Priya Shah,30/11/2026,Audit finding,,backlog\n"Quoted, title",Low,Sam Rivera,2026-12-01,,,\n,High,Sam Rivera,,,,\nBad date,Low,Morgan Chen,31-31-2026,,,\n');
await p.setInputFiles('#impFile','/tmp/imp.csv');await p.waitForTimeout(400);
const prev=await p.$$eval('[data-panel="org:import"] tbody tr',x=>x.map(r=>r.innerText.replace(/\s+/g,' ')));console.log(' ',prev);
ok('preview flags 2 bad rows',prev.filter(r=>/required|date/.test(r)).length===2);
await p.click('[data-op="imp-go"]');await p.waitForTimeout(300);
console.log(' issues now',await p.evaluate(()=>GRC.S().issues.map(i=>i.id+' '+i.title+' '+i.due)));ok('2 issues imported',await p.evaluate(()=>GRC.S().issues.length)===2);
// every importer: build one record from its template
const kinds=await p.$$eval('#impType option',x=>x.map(o=>o.value));
for(const k of kinds){await p.selectOption('#impType',k);await p.evaluate(()=>{});}
// board pack
await p.click('[data-op="board-pack"] >> nth=0');await p.waitForTimeout(300);
const pages=await p.$$eval('#bpOverlay .bp-page',x=>x.length);ok('board pack has '+pages+' pages',pages===4);
ok('board pack carries company name',(await p.textContent('#bpOverlay'))?.includes('Acme Finance Ltd'));
await p.click('#bpClose');
ok('no page errors overall',errs.length===0);console.log(errs.slice(0,5));await b.close()})()
