// A record created locally must survive a full state pull that happens before its save reaches the server
// (a) pull before the push timer fires, (b) pull while the save is in flight.
const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});
const U=(process.env.SERVER||'http://localhost:8090')+'/index.html#bfsi';const errs=[];
const ok=(n,v)=>console.log(v?'PASS':'FAIL',n);
const c=await b.newContext({viewport:{width:1400,height:900}});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
await p.goto(U);await p.waitForSelector('#gcLogin');await p.fill('#gcEmail','morgan@forge.demo');await p.fill('#gcPw','forge-demo');await p.click('#gcLogin .go');
await p.waitForSelector('#gcDot',{timeout:8000});await p.waitForFunction(()=>!!GRC.pullNow);await p.waitForTimeout(800);
let hold=null;await p.route('**/api/ops',async r=>{if(hold)await hold;r.continue()});
const server=()=>p.evaluate(async()=>{const t=sessionStorage.getItem('forgeGrcToken');const r=await fetch('/api/state?profile='+GRC.PROF,{headers:{authorization:'Bearer '+t}});const j=await r.json();return (j.state.issues||[]).map(i=>i.title)});
const local=()=>p.evaluate(()=>GRC.S().issues.map(i=>i.title));
// (a) pull before the push timer fires
await p.evaluate(()=>{GRC.raise('Self-reported','R-201','Pending A','High','Morgan','x','Process / procedure');return GRC.pullNow()});
ok('(a) unsaved record kept after pull',(await local()).includes('Pending A'));
await p.waitForTimeout(1500);ok('(a) record reaches the server',(await server()).includes('Pending A'));
// (b) pull while the save is in flight and not yet acknowledged
let rel;hold=new Promise(r=>rel=r);
await p.evaluate(()=>{GRC.raise('Self-reported','R-202','Pending B','High','Morgan','x','Process / procedure')});
await p.waitForTimeout(600);
const pr=p.evaluate(()=>GRC.pullNow().then(()=>1));await p.waitForTimeout(500);
ok('(b) in-flight record kept',(await local()).includes('Pending B'));
rel();await pr;await p.waitForTimeout(1500);
const l=await local(),s=await server();
ok('(b) record on server once',s.filter(t=>t==='Pending B').length===1&&l.filter(t=>t==='Pending B').length===1);
console.log('errors',errs);await b.close()})()
