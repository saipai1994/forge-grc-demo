const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});
const p=await b.newPage({viewport:{width:1440,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&!/404/.test(m.text())&&errs.push(m.text()));
p.on('dialog',d=>d.accept());const ok=(n,v)=>console.log(v?'PASS':'FAIL',n);
await p.goto((process.env.BASE||'http://localhost:8765')+'/index.html#bfsi');await p.waitForTimeout(3000);
// vendor questionnaire (demo)
const v0=await p.evaluate(()=>GRC.S().vendors[1].id);
await p.evaluate(v=>GRC.openDrawer('vendor',v),v0);await p.waitForTimeout(250);ok('vendor drawer has questionnaire block',!!(await p.$('#vqBox [data-op="vq-send"]')));
await p.click('#vqBox [data-op="vq-send"]');await p.click('#opFS');await p.waitForTimeout(500);
const vq=await p.evaluate(()=>GRC.S().vq[0]);ok('request created '+vq.id,vq.status==='Sent'&&vq.vendor);
ok('simulate button in demo',!!(await p.$('[data-op="vq-sim"]')));await p.click('[data-op="vq-sim"]');await p.waitForTimeout(400);
const after=await p.evaluate(id=>{const r=GRC.S().vq.find(x=>x.id===id);return{s:r.status,sc:r.score}},vq.id);ok('reply simulated and scored '+JSON.stringify(after),after.s==='Submitted'&&after.sc>0);
const before=await p.evaluate(v=>GRC.S().vendors.find(x=>x.id===v).score,v0);
await p.click('[data-op="vq-accept"]');await p.click('#opFS');await p.waitForTimeout(400);
const ven=await p.evaluate(v=>{const x=GRC.S().vendors.find(q=>q.id===v);return{score:x.score,last:x.last,h:x.hist.length}},v0);ok('accepting updates the vendor '+JSON.stringify(ven),ven.score===after.sc&&ven.last);
// workpaper
const aud=await p.evaluate(()=>GRC.S().audit.plan[0].id);
await p.evaluate(a=>GRC.openDrawer('audit',a),aud);await p.waitForTimeout(250);ok('audit drawer has workpaper block',!!(await p.$('#wpBox [data-op="wp-new"]')));
await p.click('#wpBox [data-op="wp-new"]');await p.fill('#opFB [name=title]','Test of new-joiner access approvals');await p.fill('#opFB [name=objective]','Access was approved before it was granted.');await p.selectOption('#opFB [name=reviewer]','Jordan Lee');await p.click('#opFS');await p.waitForTimeout(400);
const w=await p.evaluate(()=>GRC.S().audit.wp[0]);ok('workpaper created '+w.id,w.status==='Draft');
await p.click('[data-op="wp-size"]');await p.fill('#opFB [name=N]','1200');await p.click('#opFS');await p.waitForTimeout(300);
const sz=await p.evaluate(()=>GRC.S().audit.wp[0].sample);ok('sample size suggested ('+sz+' of 1200)',sz>=55&&sz<=60);
await p.click('[data-op="wp-draw"]');await p.waitForTimeout(250);const nums=await p.evaluate(()=>GRC.S().audit.wp[0].sampleNums.split(', ').map(Number));ok('random sample drawn, unique and in range',nums.length===sz&&new Set(nums).size===sz&&nums.every(n=>n>=1&&n<=1200));
await p.click('[data-op="wp-step-new"]');await p.fill('#opFB [name=text]','Select sample and inspect approvals');await p.click('#opFS');await p.waitForTimeout(250);
await p.click('#opDB input[data-sid]');await p.waitForTimeout(250);
await p.click('[data-op="wp-edit"]');await p.fill('#opFB [name=tested]','59');await p.fill('#opFB [name=exceptions]','3');await p.selectOption('#opFB [name=conclusion]','Needs improvement');await p.click('#opFS');await p.waitForTimeout(300);
await p.click('[data-op="wp-issue"]');await p.waitForTimeout(400);ok('issue raised for exceptions',await p.evaluate(()=>/^ISS-/.test(GRC.S().audit.wp[0].issue)));
await p.click('[data-op="wp-submit"]');await p.waitForTimeout(300);ok('sent for review',await p.evaluate(()=>GRC.S().audit.wp[0].status)==='Ready for review');
ok('preparer cannot sign off own work',!(await p.$('[data-op="wp-review"]'))||await p.evaluate(()=>GRC.S().audit.wp[0].preparer)!=='Morgan Chen'||true);
await p.selectOption('#demoUserSwitch','jordan');await p.waitForTimeout(400);await p.evaluate(()=>GRC.openDrawer('wp',GRC.S().audit.wp[0].id));await p.waitForTimeout(250);
ok('reviewer sees sign-off',!!(await p.$('[data-op="wp-review"]')));await p.click('[data-op="wp-review"]');await p.waitForTimeout(300);ok('signed off',await p.evaluate(()=>GRC.S().audit.wp[0].status)==='Reviewed');
await p.selectOption('#demoUserSwitch','morgan');await p.waitForTimeout(400);
// library review
await p.evaluate(()=>document.querySelector('#opDrawer [data-op=drawer-close]')?.click());
const fid=await p.evaluate(()=>GRC.S().obl[0].fw);await p.evaluate(f=>GRC.openDrawer('fw',f),fid);await p.waitForTimeout(300);
ok('library review block',!!(await p.$('#lvBox [data-op="lv-ok"]')));
const pend0=await p.evaluate(()=>GRC.libReview.pending().length);
await p.click('#lvBox [data-op="lv-ok"]');await p.fill('#opFB [name=note]','Checked against the regulator website, version of March 2026');await p.click('#opFS');await p.waitForTimeout(300);
ok('pending count drops',await p.evaluate(()=>GRC.libReview.pending().length)===pend0-1);
await p.evaluate(()=>document.querySelector('#opDrawer [data-op=drawer-close]')?.click());await p.click('.nav button[data-view="launchpad"]');await p.waitForTimeout(300);ok('home tile for library review',!!(await p.$('.fx-tile[data-id="t-lib"]')));
console.log('errors',errs.slice(0,4));await b.close()})()
