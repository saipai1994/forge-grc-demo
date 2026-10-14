// Demo mode (no server): the Feed inbox shows labelled sample items and converting one makes a real change record.
const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});
const p=await b.newPage({viewport:{width:1440,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&!/404/.test(m.text())&&errs.push(m.text()));
p.on('dialog',d=>d.accept());const ok=(n,v)=>console.log(v?'PASS':'FAIL',n);
await p.goto((process.env.BASE||'http://localhost:8765')+'/index.html#bfsi');await p.waitForTimeout(3000);
await p.click('.nav button[data-view="regchange"]');await p.waitForTimeout(300);
ok('Feed inbox tab exists next to Change register',await p.$$eval('#opTabs-regchange .libtab',x=>x.map(y=>y.textContent.trim())).then(a=>a[0]==='Change register'&&a.includes('Feed inbox')));
await p.click('#opTabs-regchange [data-tab="feed"]');await p.waitForTimeout(400);
ok('change register panel hidden, inbox shown',await p.evaluate(()=>!document.querySelector('[data-panel="regchange:register"]').classList.contains('show')&&document.querySelector('[data-panel="regchange:feed"]').classList.contains('show')));
const panel='[data-panel="regchange:feed"]';
ok('demo banner says sample items only',/Demo mode: sample items only/.test(await p.textContent(panel)));
ok('8 sample items, each labelled',await p.$$eval(panel+' tbody tr',x=>x.length)===8&&(await p.$$eval(panel+' tbody tr',x=>x.filter(r=>/Sample item, not from a regulator/.test(r.textContent)).length))===8);
ok('relevance shown as text, not colour only',/Relevance 88 of 100 \(High\)/.test(await p.textContent(panel)));
ok('filter controls are labelled',await p.$$eval(panel+' label[for]',x=>x.map(l=>l.getAttribute('for')).join())==='rfStatus,rfMin');
await p.selectOption('#rfMin','60');await p.waitForTimeout(200);
ok('minimum relevance 60 leaves 4',await p.$$eval(panel+' tbody tr',x=>x.length)===4);
await p.selectOption('#rfMin','0');await p.waitForTimeout(200);
// dismiss the last sample, it leaves the default "New" list
await p.click(panel+' tbody tr:last-child [data-st="Dismissed"]');await p.waitForTimeout(200);
ok('dismissed item leaves the New list',await p.$$eval(panel+' tbody tr',x=>x.length)===7);
await p.selectOption('#rfStatus','Dismissed');await p.waitForTimeout(200);
ok('dismissed item visible under Dismissed with a text status',/Dismissed/.test(await p.textContent(panel+' tbody tr')));
await p.selectOption('#rfStatus','Active');await p.waitForTimeout(200);
const n0=await p.evaluate(()=>GRC.S().regchg.length);
await p.click(panel+' tbody tr:first-child [data-op="rf-convert"]');await p.waitForTimeout(500);
const rec=await p.evaluate(()=>GRC.S().regchg.slice(-1)[0]);
ok('conversion adds a real change record '+rec.id,(await p.evaluate(()=>GRC.S().regchg.length))===n0+1&&/Sample: revised periodic KYC/.test(rec.title)&&rec.status==='New'&&rec.fw==='rbi-kyc'&&/Sample item, not from a regulator/.test(rec.notes));
await p.selectOption('#rfStatus','Converted');await p.waitForTimeout(200);
ok('Converted filter shows the record id',new RegExp(rec.id).test(await p.textContent(panel+' tbody')));
await p.click('#opTabs-regchange [data-tab="register"]');await p.waitForTimeout(300);
ok('new record appears in the Change register',(await p.textContent('[data-panel="regchange:register"]')).includes(rec.id));
await p.click('#opTabs-regchange [data-tab="feed"]');await p.click(panel+' [data-op="rf-sub"][data-sub="sources"]');await p.waitForTimeout(500);
ok('sources tab explains feeds need the server and lists suggestions',/Feeds need the server/.test(await p.textContent(panel))&&(await p.$$eval(panel+' tbody tr',x=>x.length))>10&&/Not verified/.test(await p.textContent(panel)));
console.log('errors',errs.slice(0,4));ok('no page errors',!errs.length);await b.close()})()
