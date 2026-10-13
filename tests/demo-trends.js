const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});
const p=await b.newPage({viewport:{width:1440,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&!/404/.test(m.text())&&errs.push(m.text()));
p.on('dialog',d=>d.accept());const ok=(n,v)=>console.log(v?'PASS':'FAIL',n);
await p.goto((process.env.BASE||'http://localhost:8765')+'/index.html#bfsi');await p.waitForTimeout(4000);
const sn=await p.evaluate(()=>({n:Object.keys(GRC.S().snaps||{}).length,demo:GRC.S().snapsDemo}));console.log(' snaps',JSON.stringify(sn));ok('history created and labelled',sn.n>=12&&sn.demo);
ok('tile shows a trend line',(await p.$$eval('.fx-tile .f',x=>x.filter(e=>/days/.test(e.textContent)).length))>=4);
await p.click('.nav button[data-view="overview"]');await p.waitForTimeout(500);
ok('trend card renders',!!(await p.$('.fx-card[aria-label="Trend"] svg')));
await p.click('[data-op="fx-trend"][data-k="ctl"]');await p.waitForTimeout(200);ok('metric switch',await p.$eval('[data-op="fx-trend"][data-k="ctl"]',e=>/EBF5FE|235, 245, 254/.test(e.getAttribute('style')||getComputedStyle(e).backgroundColor)));
// settings
await p.click('.nav button[data-view="org"]');await p.evaluate(()=>document.querySelector('#view-org .libtab[data-tab="settings"]').click());await p.waitForTimeout(200);
ok('settings tab',/Risk appetite/.test(await p.textContent('[data-panel="org:settings"]')));
await p.click('[data-op="set-edit"]');await p.fill('#opFB [name=appetite]','8');await p.fill('#opFB [name=tc]','70');await p.selectOption('#opFB [name=cur]','USD');await p.click('#opFS');await p.waitForTimeout(400);
const r=await p.evaluate(()=>({ap:GRC.S().appetite,t:GRC.target('controls'),m:GRC.inr(5125000),cur:GRC.cur().code}));console.log(' ',JSON.stringify(r));
ok('settings applied',r.ap===8&&r.t===70&&r.m==='$5,125,000');
await p.click('.nav button[data-view="launchpad"]');await p.waitForTimeout(300);
ok('target change visible on Home',/Target 70%/.test(await p.textContent('.fx-tile[data-id="t-ctl"]')));
ok('loss tile uses new currency',/\$/.test(await p.textContent('.fx-tile[data-id="t-loss"]')));
// bad input rejected
await p.click('.nav button[data-view="org"]');await p.evaluate(()=>document.querySelector('#view-org .libtab[data-tab="settings"]').click());await p.click('[data-op="set-edit"]');await p.fill('#opFB [name=appetite]','99');await p.click('#opFS');await p.waitForTimeout(200);
ok('invalid appetite refused',await p.evaluate(()=>GRC.S().appetite)===8);
console.log('errors',errs.slice(0,4));await b.close()})()
