const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});
const p=await b.newPage({viewport:{width:1440,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&!/404/.test(m.text())&&errs.push(m.text()));
p.on('dialog',d=>d.accept());const ok=(n,v)=>console.log(v?'PASS':'FAIL',n);
await p.goto((process.env.BASE||'http://localhost:8765')+'/index.html#bfsi');await p.waitForTimeout(2800);
ok('selector hidden before structure exists',!(await p.isVisible('#scopeSel')));
await p.click('.nav button[data-view="org"]');await p.evaluate(()=>document.querySelector('#view-org .libtab[data-tab="scope"]').click());await p.waitForTimeout(200);
await p.click('[data-op="scope-demo"]');await p.waitForTimeout(500);
const info=await p.evaluate(()=>({e:GRC.org().entities.length,u:GRC.org().units.length,s:GRC.org().sites.length,tagged:Object.keys(GRC.S().scopeMap).length,risks:risks.length,issues:GRC.S().issues.length}));console.log(' ',JSON.stringify(info));
ok('structure created and records tagged',info.e===3&&info.tagged>40);
ok('selector now visible',await p.isVisible('#scopeSel'));
const opts=await p.$$eval('#scopeSel option',x=>x.map(o=>o.value+'|'+o.textContent.trim()));console.log(' ',opts.slice(0,5));
await p.selectOption('#scopeSel',{index:1});await p.waitForTimeout(500);
const scoped=await p.evaluate(()=>({reg:document.querySelectorAll('#allRiskRows tr').length,label:GRC.scopeLabel(),issues:GRC.S().issues.length,risksArr:risks.length}));
console.log(' scoped',JSON.stringify(scoped));
ok('register shows fewer risks in scope',scoped.reg<info.risks&&scoped.reg>0);
ok('data fully restored after drawing',scoped.issues===info.issues&&scoped.risksArr===info.risks);
await p.click('.nav button[data-view="launchpad"]');await p.waitForTimeout(400);
const tile=await p.$eval('.fx-tile[data-id="t-iss"] .n',e=>e.textContent);console.log(' open issues tile in scope',tile);
ok('home notes the scope',/Scope:/.test(await p.textContent('.fx-hello')));
// tag a record from its drawer
await p.selectOption('#scopeSel','');await p.waitForTimeout(300);
await p.evaluate(()=>GRC.openDrawer('issue',GRC.S().issues[0].id));await p.waitForTimeout(300);
ok('scope block in drawer',!!(await p.$('#scopeBox select[data-scope="u"]')));
await p.selectOption('#scopeBox select[data-scope="u"]',{index:2});await p.waitForTimeout(300);
ok('tag saved',await p.evaluate(()=>{const i=GRC.S().issues[0].id;return !!GRC.S().scopeMap[i]&&!!GRC.S().scopeMap[i].u}));
// reload keeps selection
await p.selectOption('#scopeSel',{index:2});await p.reload();await p.waitForTimeout(2800);ok('selection persists',await p.evaluate(()=>!!GRC.scopeLabel()));
console.log('errors',errs.slice(0,4));await b.close()})()
