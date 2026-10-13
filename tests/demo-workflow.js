const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});
const p=await b.newPage({viewport:{width:1440,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());const ok=(n,v)=>console.log(v?'PASS':'FAIL',n);
for(const prof of ['bfsi','manufacturing','healthcare']){
 await p.goto((process.env.BASE||'http://localhost:8765')+'/index.html#'+prof);await p.waitForTimeout(2500);
 await p.click('.nav button[data-view="workflow"]');await p.waitForTimeout(400);
 const ids=await p.$$eval('.wf-leaf-open',x=>x.map(e=>e.dataset.openWorkflow));let good=0;const bad=[];
 for(const k of ids){await p.click(`.wf-leaf-open[data-open-workflow="${k}"]`);await p.waitForTimeout(40);
  const r=await p.evaluate(()=>({v:document.getElementById('opDrawer').classList.contains('show'),n:document.getElementById('opDB').textContent.length,s:!!document.getElementById('wfStageBox')}));
  if(r.v&&r.n>200&&r.s)good++;else bad.push(k);await p.evaluate(()=>document.querySelector('#opDrawer [data-op=drawer-close]')?.click())}
 ok(prof+': every workflow row opens a drill-down ('+good+'/'+ids.length+')',ids.length>20&&good===ids.length);if(bad.length)console.log('  not opening:',bad.slice(0,5));
}
console.log('errors',errs.slice(0,4));await b.close()})()
