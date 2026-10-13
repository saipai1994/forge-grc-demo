const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});const errs=[];const ok=(n,v)=>console.log(v?'PASS':'FAIL',n);
const U=(process.env.SERVER||'http://localhost:8090')+'';
// reporter, anonymous
const rc=await b.newContext();const R=await rc.newPage();R.on('pageerror',e=>errs.push('R '+e.message));
await R.goto(U+'/report.html');await R.selectOption('#cat','Bribery or corruption');await R.fill('#body','A supplier representative offered our buyer a cash payment during the tender last month.');await R.fill('#contact','');await R.click('#f button[type=submit]');await R.waitForSelector('#done:not([hidden])');
const codes=await R.$$eval('#done code',x=>x.map(e=>e.textContent));ok('report accepted, codes shown',codes.length===2&&/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(codes[0]));
// admin
async function open(email){const c=await b.newContext({viewport:{width:1440,height:900}});const p=await c.newPage();p.on('pageerror',e=>errs.push(email+' '+e.message));p.on('console',m=>m.type()==='error'&&!/404/.test(m.text())&&errs.push(email+' '+m.text()));await p.goto(U+'/index.html#bfsi');await p.waitForSelector('#gcLogin');await p.fill('#gcEmail',email);await p.fill('#gcPw','forge-demo');await p.click('#gcLogin .go');await p.waitForSelector('#gcDot',{timeout:8000});await p.waitForTimeout(1200);return p}
const A=await open('morgan@forge.demo');
await A.click('.nav button[data-view="intake"]');await A.click('#view-intake .libtab[data-tab="spk"]');await A.waitForTimeout(700);
ok('admin sees the report in the inbox',/Bribery/.test(await A.textContent('[data-panel="intake:spk"]')));
ok('real mode, no demo banner',!/Demo mode/.test(await A.textContent('[data-panel="intake:spk"]')));
await A.click('[data-panel="intake:spk"] tr[data-op="open"] >> nth=0');await A.waitForTimeout(400);
await A.selectOption('#spkAssign','Audrey Kim');await A.selectOption('#spkStatus','Investigating');await A.click('[data-op="spk-save"]');await A.waitForTimeout(500);
await A.fill('#spkNote','We have started a review. Can you tell us which tender?');await A.click('[data-op="spk-note"][data-pub="1"]');await A.waitForTimeout(500);
// reporter checks
await R.fill('#ref',codes[0]);await R.fill('#sec',codes[1]);await R.click('#g button[type=submit]');await R.waitForSelector('#status:not([hidden])');
const st=await R.textContent('#status');ok('reporter sees status and reply',/Investigating/.test(st)&&/which tender/.test(st));
await R.fill('#more','It was the road maintenance tender in September.');await R.click('#send');await R.waitForTimeout(700);
ok('reporter reply goes through',/road maintenance/.test(await R.textContent('#status')));
// auditor assigned sees it, function user does not
const Au=await open('audrey@forge.demo');await Au.click('.nav button[data-view="intake"]');await Au.click('#view-intake .libtab[data-tab="spk"]');await Au.waitForTimeout(700);ok('auditor sees the case',/SU-/.test(await Au.textContent('[data-panel="intake:spk"]')));
const Pr=await open('priya@forge.demo');await Pr.click('.nav button[data-view="intake"]');await Pr.click('#view-intake .libtab[data-tab="spk"]');await Pr.waitForTimeout(700);ok('function user is refused',/restricted/i.test(await Pr.textContent('[data-panel="intake:spk"]')));
ok('speak-up text never entered the shared workspace',await A.evaluate(()=>!/cash payment/.test(JSON.stringify(GRC.S()))));
// shared workspace features sync
await A.evaluate(()=>GRC.actions['evt-new']());await A.fill('#opFB [name=title]','Server room door left open');await A.fill('#opFB [name=desc]','Door was propped open during maintenance.');await A.click('#opFS');await A.waitForTimeout(1500);
ok('event syncs to colleague',await Pr.evaluate(()=>GRC.S().evt.some(e=>e.title==='Server room door left open')));
console.log('errors',errs.slice(0,4));await b.close()})()
