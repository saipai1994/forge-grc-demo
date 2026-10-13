const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});
const U=(process.env.SERVER||'http://localhost:8090')+'/index.html#bfsi';const errs=[];
async function open(email){const c=await b.newContext({viewport:{width:1400,height:900}});const p=await c.newPage();p.on('pageerror',e=>errs.push(email+': '+e.message));p.on('console',m=>m.type()==='error'&&errs.push(email+' console: '+m.text()));
 await p.goto(U);await p.waitForSelector('#gcLogin',{timeout:8000});await p.fill('#gcEmail',email);await p.fill('#gcPw','forge-demo');await p.click('#gcLogin .go');await p.waitForSelector('#gcDot',{timeout:8000});await p.waitForTimeout(800);return p}
const ok=(n,v)=>console.log(v?'PASS':'FAIL',n);
const A=await open('morgan@forge.demo'),B=await open('jordan@forge.demo');
const cnt=p=>p.evaluate(()=>GRC.S().issues.length);
const a0=await cnt(A),b0=await cnt(B);ok('both see same issue count '+a0,a0===b0);
await A.evaluate(()=>{GRC.raise('Self-reported','R-101','Live test issue','High','Morgan Chen','created in test','Process / procedure')});
await B.waitForTimeout(1500);ok("B receives A's new issue",(await cnt(B))===a0+1&&await B.evaluate(()=>GRC.S().issues.some(i=>i.title==='Live test issue')));
await Promise.all([A.evaluate(()=>GRC.raise('Self-reported','R-102','Race A','Low','Morgan Chen','a','x')),B.evaluate(()=>GRC.raise('Self-reported','R-103','Race B','Low','Jordan Lee','b','x'))]);
await A.waitForTimeout(2200);
const ids=async p=>p.evaluate(()=>GRC.S().issues.map(i=>i.id+'|'+i.title).filter(x=>/Race/.test(x)).sort().join(','));
const ia=await ids(A),ib=await ids(B);console.log('  A',ia,'B',ib);ok('race: both converge, distinct ids',ia===ib&&new Set(ia.split(',').map(x=>x.split('|')[0])).size===2);
const kri=await A.evaluate(()=>GRC.S().kris[0]);
const r=await (await fetch((process.env.SERVER||'http://localhost:8090')+'/api/ingest/kri',{method:'POST',headers:{'content-type':'application/json','x-api-key':'dev-ingest-key'},body:JSON.stringify({profile:'bfsi',id:kri.id,value:kri.red+5,source:'Monitoring feed'})})).json();console.log('  ingest',JSON.stringify(r));
await B.waitForTimeout(1500);ok('ingest reaches both browsers',await B.evaluate(id=>GRC.S().kris.find(k=>k.id===id).series.slice(-1)[0],kri.id)===kri.red+5&&await A.evaluate(id=>GRC.S().kris.find(k=>k.id===id).series.slice(-1)[0],kri.id)===kri.red+5);
await B.evaluate(()=>{GRC.S().appetite=2;GRC.save()});await B.waitForTimeout(1800);
ok('server refuses appetite change by business user, reverted',await B.evaluate(()=>GRC.S().appetite)!==2);
await A.click('.nav button[data-view="trail"]');await A.waitForTimeout(1200);
const rows=await A.$$eval('[data-panel="trail:log"] tbody tr',x=>x.length);ok('audit trail shows '+rows+' rows',rows>3);
console.log(await A.$eval('[data-panel="trail:log"] tbody tr',x=>x.innerText.replace(/\s+/g,' ').slice(0,140)));
const C=await open('audrey@forge.demo');
await C.evaluate(()=>{GRC.S().vendors[0].name='Hacked';GRC.save()});await C.waitForTimeout(1800);
ok('auditor cannot edit vendors',await C.evaluate(()=>GRC.S().vendors[0].name)!=='Hacked');
await A.click('#gcOut');await A.waitForSelector('#gcLogin');await A.click('#gcDemo');ok('demo mode available after sign out',await A.evaluate(()=>!!document.querySelector('#gcPill')));
console.log('errors',errs);await b.close()})()
