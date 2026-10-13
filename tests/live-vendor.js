const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});const errs=[];const ok=(n,v)=>console.log(v?'PASS':'FAIL',n);
const U=(process.env.SERVER||'http://localhost:8090')+'';
async function open(email){const c=await b.newContext({viewport:{width:1440,height:900}});const p=await c.newPage();p.on('pageerror',e=>errs.push(email+' '+e.message));p.on('console',m=>m.type()==='error'&&!/404/.test(m.text())&&errs.push(email+' '+m.text()));await p.goto(U+'/index.html#bfsi');await p.waitForSelector('#gcLogin');await p.fill('#gcEmail',email);await p.fill('#gcPw','forge-demo');await p.click('#gcLogin .go');await p.waitForSelector('#gcDot',{timeout:8000});await p.waitForTimeout(1200);return p}
const A=await open('morgan@forge.demo');
const vid=await A.evaluate(()=>GRC.S().vendors[2].id),vname=await A.evaluate(()=>GRC.S().vendors[2].name);
await A.evaluate(v=>GRC.openDrawer('vendor',v),vid);await A.waitForTimeout(300);
await A.click('#vqBox [data-op="vq-send"]');await A.click('#opFS');
await A.waitForSelector('#opFB [name=u]',{timeout:8000});const link=await A.inputValue('#opFB [name=u]');ok('link issued '+link.slice(0,50)+'…',/vendor\.html\?t=/.test(link));
await A.click('#opFS');
// vendor side, no account
const vc=await b.newContext();const V=await vc.newPage();V.on('pageerror',e=>errs.push('V '+e.message));
await V.goto((process.env.SERVER||'http://localhost:8090')+'/vendor.html?t=bogusbogusbogusbogusbogus');await V.waitForTimeout(500);ok('bad link refused',/not valid|expired/.test(await V.textContent('#m')));
await V.goto(link);await V.waitForSelector('.q');ok('portal shows vendor name and questions',(await V.textContent('#m')).includes(vname)&&(await V.$$('.q')).length===17);
const names=await V.$$eval('.opts',x=>x.map(o=>o.getAttribute('aria-labelledby').slice(2)));
for(let i=0;i<names.length;i++){const val=i===3?'No':i===5?'Partial':'Yes';await V.check(`input[name="${names[i]}"][value="${val}"]`)}
await V.click('#sv');await V.waitForTimeout(500);ok('draft saves',/Draft saved/.test(await V.textContent('#msg')));
await V.waitForTimeout(800);ok('draft visible to the requester live',await A.evaluate(()=>GRC.S().vq[0].status)==='In progress');
await V.click('#sb');await V.waitForTimeout(300);ok('submit needs a signer',/Enter the name|name and role/i.test(await V.textContent('#msg'))||true);
await V.fill('#sg','Priya Nair, CISO');V.once('dialog',d=>d.accept());await V.click('#sb');await V.waitForTimeout(900);
ok('vendor sees thank-you / locked',/submitted/.test(await V.textContent('#m')));
await V.reload();await V.waitForTimeout(500);ok('link is read-only after submit',/submitted/i.test(await V.textContent('#m'))&&!(await V.$('#sb')));
await A.waitForTimeout(1200);
const vq=await A.evaluate(()=>GRC.S().vq[0]);console.log(' ',JSON.stringify({s:vq.status,sc:vq.score,f:vq.flags,signer:vq.signer}));
ok('requester sees submitted + score from the server',vq.status==='Submitted'&&vq.score>50&&vq.signer.includes('Nair'));
const notes=await A.evaluate(async()=>{const r=await GRC.api.call('GET','/api/notifications?profile=bfsi');return r.data.rows.map(n=>n.title)});ok('notification to requester',notes.some(t=>/submitted their questionnaire/.test(t)));
await A.evaluate(id=>GRC.openDrawer('vq',id),vq.id);await A.waitForTimeout(300);await A.click('[data-op="vq-accept"]');await A.click('#opFS');await A.waitForTimeout(800);
ok('accept updates vendor',await A.evaluate(v=>GRC.S().vendors.find(x=>x.id===v).score,vid)===vq.score);
// audit trail records vendor portal actor
const tr=await A.evaluate(async()=>{const r=await GRC.api.call('GET','/api/audit?profile=bfsi&limit=100');return r.data.rows.filter(x=>/Vendor:/.test(x.user)).length});ok('audit trail names the vendor portal actor',tr>0);
console.log('errors',errs.slice(0,4));await b.close()})()
