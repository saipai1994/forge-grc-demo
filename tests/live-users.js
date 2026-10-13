
const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});
const U=(process.env.SERVER||'http://localhost:8090')+'/index.html#bfsi';const errs=[];
const ok=(n,v)=>console.log(v?'PASS':'FAIL',n);
async function login(p,email,pw){await p.goto(U);await p.waitForSelector('#gcLogin');await p.fill('#gcEmail',email);await p.fill('#gcPw',pw);await p.click('#gcLogin .go')}
async function open(email,pw='forge-demo'){const c=await b.newContext({viewport:{width:1400,height:900}});const p=await c.newPage();p.on('pageerror',e=>errs.push(email+': '+e.message));p.on('console',m=>m.type()==='error'&&!/404/.test(m.text())&&errs.push(email+' console: '+m.text()));
 await login(p,email,pw);await p.waitForSelector('#gcDot',{timeout:8000});await p.waitForTimeout(1000);return p}
const A=await open('morgan@forge.demo');
ok('users module for admin',!!(await A.$('.nav button[data-view="users"]')));
// invite someone through the UI
await A.click('.nav button[data-view="users"]');await A.waitForTimeout(500);
await A.click('[data-op="u-new"]');await A.fill('#opFB [name=name]','Riya Kapoor');await A.fill('#opFB [name=email]','riya@acme.test');await A.selectOption('#opFB [name=role]','Function user');await A.click('#opFS');await A.waitForTimeout(800);
const tp=await A.inputValue('#opFB [name=tp]');ok('temporary password shown',tp&&tp.length>=8);await A.click('#opFS');
await A.waitForTimeout(900);ok('new person appears in owner lists',await A.evaluate(()=>GRC.people().includes('Riya Kapoor')));
// she signs in, must change password
const c2=await b.newContext();const R=await c2.newPage();R.on('pageerror',e=>errs.push('riya: '+e.message));
await login(R,'riya@acme.test',tp);await R.waitForSelector('#gcN1');
await R.fill('#gcN1','short');await R.fill('#gcN2','short');await R.click('#gcLogin .go');await R.waitForTimeout(500);
ok('weak password refused',/10 characters/.test(await R.textContent('#gcErr')));
R.on('console',m=>console.log('R console',m.type(),m.text()));await R.fill('#gcN1','Maple-Orbit-2026');await R.fill('#gcN2','Maple-Orbit-2026');await R.click('#gcLogin .go');await R.waitForSelector('#gcDot',{timeout:8000}).catch(async()=>{console.log('R state',await R.evaluate(()=>({pill:document.getElementById('gcPill')?.innerText,err:document.getElementById('gcErr')?.textContent,login:!!document.getElementById('gcLogin')})))});
ok('riya is live as Function user',/Function user/.test(await R.textContent('#gcPill')));
ok('riya has no users module',!(await R.$('.nav button[data-view="users"]')));
// assign an issue to Riya -> she gets notified
await A.evaluate(()=>{GRC.raise('Self-reported','R-101','Check onboarding files','High','Riya Kapoor','x','Process / procedure')});
await R.waitForTimeout(1500);
const n=await R.textContent('#gcBellN');ok('riya sees a notification ('+n+')',n==='1');
await R.click('#gcBellBtn');ok('notification text',/assigned to you/.test(await R.textContent('#gcBellBox')));
// file upload on the issue
await A.evaluate(()=>{const i=GRC.S().issues[0];GRC.openDrawer('issue',i.id)});await A.waitForSelector('#gcUp',{state:'attached',timeout:5000});
require('fs').writeFileSync('/tmp/ev.pdf','%PDF-1.4 evidence');await A.setInputFiles('#gcUp','/tmp/ev.pdf');await A.waitForFunction(()=>/ev\.pdf/.test((document.getElementById('gcFiles')||{}).textContent||''),null,{timeout:8000}).catch(()=>{});
ok('file listed on record',/ev\.pdf/.test(await A.textContent('#gcFiles')));
// Riya sees it too and can download
await R.evaluate(()=>{document.getElementById('gcBellBox').style.display='none';const i=GRC.S().issues[0];GRC.openDrawer('issue',i.id)});await R.waitForFunction(()=>/ev\.pdf/.test((document.getElementById('gcFiles')||{}).textContent||''),null,{timeout:8000}).catch(()=>{});
ok('colleague sees the file',/ev\.pdf/.test(await R.textContent('#gcFiles')));
// company setup syncs
await A.evaluate(()=>{GRC.S().org.profile.name='Acme Finance';GRC.S().org.profile.done=true;GRC.S().org.entities.push({id:'ENT-001',name:'Acme Finance Ltd',type:'Parent company',country:'India',regNo:'',regulators:'RBI',owner:''});GRC.save()});
await R.waitForTimeout(1500);ok('company profile shared live',await R.evaluate(()=>GRC.S().org.profile.name==='Acme Finance'&&GRC.S().org.entities.length===1));
// Riya cannot change company setup
await R.evaluate(()=>{GRC.S().org.profile.name='Hacked';GRC.save()});await R.waitForTimeout(1800);ok('function user cannot edit company profile',await R.evaluate(()=>GRC.S().org.profile.name)==='Acme Finance');
// admin switches Riya off
await A.evaluate(async()=>{});
console.log('errors',errs);await b.close()})()
