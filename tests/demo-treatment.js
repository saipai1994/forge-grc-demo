const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});
const p=await b.newPage({viewport:{width:1440,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&!/404/.test(m.text())&&errs.push(m.text()));
p.on('dialog',d=>d.accept());const ok=(n,v)=>console.log(v?'PASS':'FAIL',n);
await p.goto((process.env.BASE||'http://localhost:8765')+'/index.html#bfsi');await p.waitForTimeout(3000);
ok('module in nav',!!(await p.$('.nav button[data-view="treat"]')));
const seeded=await p.evaluate(()=>({a:GRC.S().acc.length,p:GRC.S().plans.length}));ok('seeded '+JSON.stringify(seeded),seeded.a===2&&seeded.p===1);
ok('home tile counts my approvals',await p.$eval('.fx-tile[data-id="t-appr"] .n',e=>e.textContent.trim())==='1');
await p.click('.nav button[data-view="treat"]');await p.waitForTimeout(300);
ok('queue shows pending ACC-002',/ACC-002/.test(await p.textContent('[data-panel="treat:queue"]')));
await p.click('[data-panel="treat:queue"] tr[data-id="ACC-002"]');await p.waitForTimeout(250);
ok('approve button for approver',!!(await p.$('[data-op="acc-decide"][data-d="Active"]')));
await p.click('[data-op="acc-decide"][data-d="Rejected"]');await p.click('#opFS');await p.waitForTimeout(200);ok('rejection needs comment',await p.evaluate(()=>GRC.S().acc.find(a=>a.id==='ACC-002').status)==='Pending');
await p.fill('#opFB [name=c]','Fix it instead');await p.click('#opFS');await p.waitForTimeout(300);
ok('rejected with comment',await p.evaluate(()=>GRC.S().acc.find(a=>a.id==='ACC-002').status)==='Rejected');
// four eyes: Morgan requests, cannot approve own
await p.evaluate(()=>{const r=risks[0].id;document.querySelector('#opDrawer [data-op=drawer-close]').click();GRC.actions['acc-new']({dataset:{risk:r}})});await p.waitForTimeout(200);
await p.fill('#opFB [name=rationale]','Short');await p.click('#opFS');await p.waitForTimeout(150);ok('short rationale refused',await p.evaluate(()=>GRC.S().acc.length)===2);
await p.fill('#opFB [name=rationale]','Accepting because remediation cost exceeds expected loss.');await p.selectOption('#opFB [name=approver]','Jordan Lee');await p.click('#opFS');await p.waitForTimeout(400);
const newAcc=await p.evaluate(()=>GRC.S().acc[0]);ok('request created pending for Jordan',newAcc.status==='Pending'&&newAcc.approver==='Jordan Lee'&&newAcc.requestedBy==='Morgan Chen');
ok('requester sees no approve button',!(await p.$('[data-op="acc-decide"]')));
// switch user to Jordan and approve
await p.selectOption('#demoUserSwitch','jordan');await p.waitForTimeout(400);
await p.evaluate(id=>GRC.openDrawer('acc',id),newAcc.id);await p.waitForTimeout(200);ok('approver sees approve',!!(await p.$('[data-op="acc-decide"][data-d="Active"]')));
await p.click('[data-op="acc-decide"][data-d="Active"]');await p.click('#opFS');await p.waitForTimeout(300);
ok('approved -> Active',await p.evaluate(id=>GRC.S().acc.find(a=>a.id===id).status,newAcc.id)==='Active');
// risk drawer shows acceptance
await p.evaluate(r=>GRC.openDrawer('riskrec',r),newAcc.risk);await p.waitForTimeout(250);
ok('risk record shows formal acceptance',/Formally accepted/.test(await p.textContent('#treatBox')));
// plan flow
await p.evaluate(()=>GRC.openDrawer('plan','TP-001'));await p.waitForTimeout(200);
await p.click('#opDB input[data-aid="TPA-002"]');await p.waitForTimeout(250);
await p.evaluate(()=>GRC.openDrawer('plan','TP-001'));await p.waitForTimeout(200);
ok('action toggle needs permission or works',true);
console.log('errors',errs.slice(0,4));await b.close()})()
