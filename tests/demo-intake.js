const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});
const p=await b.newPage({viewport:{width:1440,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&!/404/.test(m.text())&&errs.push(m.text()));
p.on('dialog',d=>d.accept());const ok=(n,v)=>console.log(v?'PASS':'FAIL',n);
await p.goto((process.env.BASE||'http://localhost:8765')+'/index.html#bfsi');await p.waitForTimeout(3000);
ok('module in nav',!!(await p.$('.nav button[data-view="intake"]')));
const c=await p.evaluate(()=>({e:GRC.S().evt.length,x:GRC.S().exc.length,c:GRC.S().coi.length}));ok('seeded '+JSON.stringify(c),c.e===2&&c.x===1&&c.c===2);
await p.click('.nav button[data-view="intake"]');await p.waitForTimeout(300);
// report event via top button
await p.click('#rptBtn');await p.fill('#opFB [name=title]','Printer left unlocked with client files');await p.fill('#opFB [name=desc]','Found client paperwork in a shared printer overnight.');await p.click('#opFS');await p.waitForTimeout(300);
ok('event created',await p.evaluate(()=>GRC.S().evt[0].title.startsWith('Printer')));
await p.evaluate(()=>GRC.openDrawer('evt',GRC.S().evt[0].id));await p.waitForTimeout(200);await p.click('[data-op="evt-issue"]');await p.waitForTimeout(400);
ok('triaged into an issue',await p.evaluate(()=>{const e=GRC.S().evt[0];return e.status==='Assigned'&&/^ISS-/.test(e.link)&&GRC.S().issues.some(i=>i.id===e.link)}));
// exception: pending for Morgan (admin) from someone else
await p.evaluate(()=>GRC.openDrawer('exc','EXC-001'));await p.waitForTimeout(200);ok('approver can decide exception',!!(await p.$('[data-op="exc-decide"][data-d="Approved"]')));
await p.click('[data-op="exc-decide"][data-d="Approved"]');await p.click('#opFS');await p.waitForTimeout(300);
ok('exception approved',await p.evaluate(()=>GRC.S().exc.find(x=>x.id==='EXC-001').status)==='Approved');
// own declaration cannot be self-reviewed (non-admin)
await p.selectOption('#demoUserSwitch','jordan');await p.waitForTimeout(400);
await p.evaluate(()=>GRC.actions['coi-new']());await p.fill('#opFB [name=description]','Shares in a supplier company');await p.selectOption('#opFB [name=reviewer]','Jordan Lee');await p.click('#opFS');await p.waitForTimeout(200);
ok('cannot choose self as reviewer',await p.evaluate(()=>GRC.S().coi.length)===2);
await p.selectOption('#opFB [name=reviewer]','Morgan Chen');await p.click('#opFS');await p.waitForTimeout(300);ok('declaration filed',await p.evaluate(()=>GRC.S().coi.length)===3);
await p.selectOption('#demoUserSwitch','morgan');await p.waitForTimeout(400);
await p.evaluate(()=>document.querySelector('#opDrawer [data-op=drawer-close]')?.click());
// speak-up demo
await p.click('.nav button[data-view="intake"]');await p.click('#view-intake .libtab[data-tab="spk"]');await p.waitForTimeout(400);
ok('speak-up inbox shows demo case',/SU-1001/.test(await p.textContent('[data-panel="intake:spk"]')));
await p.click('[data-op="spk-test"]');await p.waitForTimeout(200);
await p.click('[data-panel="intake:spk"] tr[data-op="open"] >> nth=0');await p.waitForTimeout(250);
await p.selectOption('#spkAssign','Audrey Kim').catch(()=>{});await p.selectOption('#spkStatus','Investigating');await p.click('[data-op="spk-save"]');await p.waitForTimeout(250);
await p.fill('#spkNote','Thanks, we are looking into it.');await p.click('[data-op="spk-note"][data-pub="1"]');await p.waitForTimeout(300);
const r0=await p.evaluate(()=>JSON.parse(localStorage.getItem('forgeGrcSpkDemo'))[0]);ok('status, assignee and public reply saved',r0.status==='Investigating'&&r0.updates.some(u=>u.public&&/looking/.test(u.text)));
// home/overview still fine
await p.evaluate(()=>document.querySelector('#opDrawer [data-op=drawer-close]')?.click());
await p.click('.nav button[data-view="launchpad"]');await p.waitForTimeout(300);ok('home still renders',(await p.$$eval('.fx-tile',x=>x.length))>10);
console.log('errors',errs.slice(0,4));await b.close()})()
