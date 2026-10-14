// Document management in connected mode: upload to the server through the UI, a colleague sees and downloads the same
// bytes, an auditor is read-only (UI and server), and a tampered stored file is caught by Verify.
// Starts its own server so it knows the data folder (the shared test server hides it).
const {chromium}=require('playwright');const {spawn}=require('child_process'),fs=require('fs'),os=require('os'),path=require('path'),net=require('net');
const ROOT=path.join(__dirname,'..');
const freePort=()=>new Promise(r=>{const s=net.createServer();s.listen(0,()=>{const p=s.address().port;s.close(()=>r(p))})});
(async()=>{
const port=await freePort(),data=fs.mkdtempSync(path.join(os.tmpdir(),'forge-dms-'));
const srv=spawn('node',[path.join(ROOT,'server/server.js')],{env:{...process.env,PORT:String(port),FORGE_DATA:data,FORGE_TODAY:'2026-10-12',FORGE_BACKUP:'0'},stdio:'ignore'});
const U='http://localhost:'+port+'/index.html#bfsi';
const errs=[],ok=(n,v,x)=>console.log(v?'PASS':'FAIL',n,v?'':(x||''));
const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});
const stop=async()=>{await b.close().catch(()=>{});srv.kill()};
try{
 for(let i=0;i<40;i++){try{const r=await fetch('http://localhost:'+port+'/api/health');if(r.ok)break}catch{}await new Promise(r=>setTimeout(r,250))}
 async function login(p,email,pw){await p.goto(U);await p.waitForSelector('#gcLogin');await p.fill('#gcEmail',email);await p.fill('#gcPw',pw);await p.click('#gcLogin .go')}
 async function open(email,pw='forge-demo'){const c=await b.newContext({viewport:{width:1400,height:900},acceptDownloads:true});const p=await c.newPage();p.on('pageerror',e=>errs.push(email+': '+e.message));p.on('console',m=>m.type()==='error'&&!/status of (404|403|400)/.test(m.text())&&errs.push(email+' console: '+m.text()));
  p.on('dialog',d=>d.accept());await login(p,email,pw);await p.waitForSelector('#gcDot',{timeout:10000});await p.waitForFunction(()=>window.GRC&&GRC.dms&&document.querySelector('.nav button[data-view="documents"]'),null,{timeout:10000});return p}
 const W=(p,fn,arg,t)=>p.waitForFunction(fn,arg,{timeout:t||10000}).then(()=>true,()=>false);
 const A=await open('morgan@forge.demo');
 await A.click('.nav button[data-view="documents"]');await W(A,()=>document.querySelectorAll('#view-documents tbody tr[data-id]').length>=1);
 ok('documents module works in connected mode',!!(await A.$('#view-documents')));
 // upload through the UI -> bytes go to the server
 const body='Supplier security addendum.\nClause 4: breach notice within 24 hours. Marker: pelican-77.';
 const f=path.join(os.tmpdir(),'dms-live-addendum.txt');fs.writeFileSync(f,body);
 await A.setInputFiles('#dmsUp',f);await W(A,()=>document.getElementById('opForm').classList.contains('show'));
 await A.fill('#opFB [name=title]','Supplier security addendum');await A.selectOption('#opFB [name=type]','Contract');await A.click('#opFS');
 ok('upload stored on the server (file id recorded, checksum present)',await W(A,()=>GRC.dms.docs().some(d=>d.title==='Supplier security addendum'&&d.versions.length&&d.versions[0].fileId&&d.versions[0].sha.length===64)));
 const doc=await A.evaluate(()=>{const d=GRC.dms.docs().find(x=>x.title==='Supplier security addendum');return{id:d.id,sha:d.versions[0].sha,fileId:d.versions[0].fileId}});
 const files=fs.readdirSync(path.join(data,'files'),{recursive:true}).map(x=>String(x));
 ok('file exists in the server data folder',files.some(x=>x.endsWith(doc.fileId)),files.join(','));
 ok('server rejects an unsupported type with a friendly message',await A.evaluate(async()=>GRC.dms.create({title:'bad'},{text:'x',name:'x.exe'}).then(()=>false,e=>/not accepted/i.test(e.message))));
 // invite a colleague the way live-users.js does
 await W(A,()=>document.getElementById('opDrawer').classList.contains('show'));await A.click('[data-op="drawer-close"] >> nth=-1');
 await A.click('.nav button[data-view="users"]');await A.click('[data-op="u-new"]');await A.fill('#opFB [name=name]','Riya Kapoor');await A.fill('#opFB [name=email]','riya@acme.test');await A.selectOption('#opFB [name=role]','Function user');await A.click('#opFS');
 await A.waitForFunction(()=>document.querySelector('#opFB [name=tp]')?.value.length>=8);const tp=await A.inputValue('#opFB [name=tp]');await A.click('#opFS');
 const c2=await b.newContext({viewport:{width:1400,height:900},acceptDownloads:true});const R=await c2.newPage();R.on('pageerror',e=>errs.push('riya: '+e.message));R.on('console',m=>m.type()==='error'&&!/status of (404|403|400)/.test(m.text())&&errs.push('riya console: '+m.text()));R.on('dialog',d=>d.accept());
 await login(R,'riya@acme.test',tp);await R.waitForSelector('#gcN1');await R.fill('#gcN1','Maple-Orbit-2026');await R.fill('#gcN2','Maple-Orbit-2026');await R.click('#gcLogin .go');await R.waitForSelector('#gcDot',{timeout:10000});
 await R.waitForFunction(()=>window.GRC&&GRC.dms&&document.querySelector('.nav button[data-view="documents"]'));
 ok('colleague sees the document without reloading',await W(R,i=>!!GRC.dms.doc(i),doc.id));
 await R.click('.nav button[data-view="documents"]');ok('it is listed on her Browse screen',await W(R,i=>!!document.querySelector(`#view-documents tr[data-id="${i}"]`),doc.id));
 await R.evaluate(i=>GRC.openDrawer('doc',i),doc.id);await W(R,i=>document.getElementById('opDK')?.textContent==='Document · '+i,doc.id);
 ok('colleague preview shows the text from the server',await W(R,()=>/pelican-77/.test(document.getElementById('dmsPrev')?.textContent||'')));
 const dl=R.waitForEvent('download',{timeout:10000});await R.click(`#opDB [data-op="dms-dl"][data-id="${doc.id}"]`);const d=await dl;const p2=await d.path();
 const got=fs.readFileSync(p2);const sha=require('crypto').createHash('sha256').update(got).digest('hex');
 ok('colleague downloads the same bytes (same checksum)',sha===doc.sha&&got.toString()===body&&d.suggestedFilename()==='dms-live-addendum.txt',sha+' vs '+doc.sha);
 ok('verify passes for the colleague',await R.evaluate(async i=>(await GRC.dms.verify(i)).ok,doc.id));
 const re=await R.evaluate(async i=>GRC.dms.addVersion(i,{text:'x'}).then(()=>'allowed',e=>e.message),doc.id);ok('a colleague who is not owner or shared cannot edit',/cannot edit/.test(re),re);
 // she uploads her own document; the administrator sees it
 const f2=path.join(os.tmpdir(),'dms-live-riya.txt');fs.writeFileSync(f2,'Riya working note about onboarding checks.');
 await R.click('[data-op="drawer-close"] >> nth=-1');await R.setInputFiles('#dmsUp',f2);await W(R,()=>document.getElementById('opForm').classList.contains('show'));await R.click('#opFS');
 ok('colleague upload reaches the administrator',await W(A,()=>GRC.dms.docs().some(x=>x.title==='dms-live-riya'&&x.versions.length&&x.versions[0].fileId)));
 // auditor is read-only
 const U2=await open('audrey@forge.demo');await U2.click('.nav button[data-view="documents"]');await W(U2,i=>!!GRC.dms.doc(i),doc.id);
 ok('auditor sees documents but no upload buttons',!(await U2.$('[data-op="dms-pick"]'))&&!(await U2.$('[data-op="dms-new-text"]'))&&await U2.evaluate(i=>!!GRC.dms.doc(i),doc.id));
 const au=await U2.evaluate(async()=>({create:await GRC.dms.create({title:'x'},{text:'abc',name:'x.txt'}).then(()=>'allowed',e=>e.message),upload:await GRC.api.upload('DOC-0001',new Blob(['x']),'x.txt').then(()=>'allowed',e=>e.message)}));
 ok('auditor cannot upload (core and server refuse)',/read-only/.test(au.create)&&/read-only/.test(au.upload),JSON.stringify(au));
 await U2.evaluate(i=>GRC.openDrawer('doc',i),doc.id);await W(U2,i=>document.getElementById('opDK')?.textContent==='Document · '+i,doc.id);
 ok('auditor drawer has no edit buttons',!(await U2.$('[data-op="dms-edit"]'))&&!(await U2.$('[data-op="dms-newver"]'))&&!(await U2.$('[data-op="dms-del"]')));
 await U2.click(`#opDB [data-op="dms-verify"][data-id="${doc.id}"]:not([data-n])`);ok('auditor can verify integrity',await W(U2,()=>/Integrity check passed/.test(document.getElementById('dmsVerify')?.textContent||'')));
 // tamper with the stored file on disk
 const full=fs.readdirSync(path.join(data,'files'),{recursive:true}).map(x=>path.join(data,'files',String(x))).find(x=>x.endsWith(doc.fileId));
 fs.appendFileSync(full,'\nTAMPERED');
 await A.evaluate(i=>GRC.openDrawer('doc',i),doc.id);await W(A,i=>document.getElementById('opDK')?.textContent==='Document · '+i,doc.id);
 await A.click(`#opDB [data-op="dms-verify"][data-id="${doc.id}"]:not([data-n])`);
 ok('tampered stored file is detected by Verify',await W(A,()=>/Integrity check FAILED/.test(document.getElementById('dmsVerify')?.textContent||'')&&document.querySelectorAll('#dmsVerify .dms-sha').length===2));
 ok('failure text explains what to do',/no longer matches/.test(await A.textContent('#dmsVerify')));
 const other=await A.evaluate(async()=>{const d=GRC.dms.docs().find(x=>x.title==='dms-live-riya');return (await GRC.dms.verify(d.id)).ok});ok('other documents still verify',other);
 // activity shows server audit rows
 await A.click('[data-op="drawer-close"] >> nth=-1');await A.click('.nav button[data-view="documents"]');await A.click('#view-documents .libtab[data-tab="activity"]');ok('activity tab shows shared activity from the server',await W(A,()=>/Shared activity/.test(document.querySelector('[data-panel="documents:activity"]').textContent)&&/file added|created/.test(document.querySelector('[data-panel="documents:activity"]').textContent),null,15000));
 ok('no page errors',errs.length===0,JSON.stringify(errs.slice(0,4)));
 console.log('errors',errs.slice(0,4));
}catch(e){console.log('FAIL exception',e.message);console.log('errors',errs.slice(0,4))}
await stop();process.exit(0)})()
