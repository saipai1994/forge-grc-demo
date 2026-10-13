const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});const p=await b.newPage({viewport:{width:1400,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto((process.env.BASE||'http://localhost:8765')+'/index.html#bfsi');await p.waitForTimeout(2800);
await p.click('.nav button[data-view="obligations"]');await p.waitForTimeout(400);
const n=await p.$$eval('[data-panel="obligations:register"] tbody tr',x=>x.length);console.log('rows shown',n);
await p.click('[data-op="more"]');await p.waitForTimeout(300);const n2=await p.$$eval('[data-panel="obligations:register"] tbody tr',x=>x.length);console.log('after more',n2);
console.log(n===51&&n2>n?'PASS paging works':'FAIL','errors',errs);await b.close()})()
