// Restricted documents are enforced by the server, not only hidden by the screens: people without access never receive the
// metadata, the file ids or the files, and access changes reach connected browsers live. Starts its own server.
const {chromium}=require('playwright');const {spawn}=require('child_process'),fs=require('fs'),os=require('os'),path=require('path'),net=require('net');
const ROOT=path.join(__dirname,'..');
const freePort=()=>new Promise(r=>{const s=net.createServer();s.listen(0,()=>{const p=s.address().port;s.close(()=>r(p))})});
(async()=>{
const port=await freePort(),data=fs.mkdtempSync(path.join(os.tmpdir(),'forge-restr-'));
const srv=spawn('node',[path.join(ROOT,'server/server.js')],{env:{...process.env,PORT:String(port),FORGE_DATA:data,FORGE_TODAY:'2026-10-12',FORGE_BACKUP:'0'},stdio:'ignore'});
const U='http://localhost:'+port+'/index.html#bfsi';
const errs=[],ok=(n,v,x)=>console.log(v?'PASS':'FAIL',n,v?'':(x||''));
const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});
const stop=async()=>{await b.close().catch(()=>{});srv.kill()};
try{
 for(let i=0;i<40;i++){try{const r=await fetch('http://localhost:'+port+'/api/health');if(r.ok)break}catch{}await new Promise(r=>setTimeout(r,250))}
 async function open(email){const c=await b.newContext({viewport:{width:1400,height:900}});const p=await c.newPage();p.on('pageerror',e=>errs.push(email+': '+e.message));p.on('console',m=>m.type()==='error'&&!/status of (404|403|400)/.test(m.text())&&errs.push(email+' console: '+m.text()));p.on('dialog',d=>d.accept());
  await p.goto(U);await p.waitForSelector('#gcLogin');await p.fill('#gcEmail',email);await p.fill('#gcPw','forge-demo');await p.click('#gcLogin .go');await p.waitForSelector('#gcDot',{timeout:10000});
  await p.waitForFunction(()=>window.GRC&&GRC.dms&&GRC.api&&GRC.api.connected&&document.querySelector('.nav button[data-view="documents"]'),null,{timeout:15000});await p.waitForTimeout(500);return p}
 const W=(p,fn,arg,t)=>p.waitForFunction(fn,arg,{timeout:t||10000}).then(()=>true,()=>false);
 const A=await open('morgan@forge.demo');
 await W(A,()=>GRC.dms.docs().length>=7);
 // the seeded Restricted document and a new one with a file
 const seeded=await A.evaluate(()=>{const d=GRC.dms.docs().find(x=>x.conf==='Restricted');return d&&{id:d.id,title:d.title}});
 const made=await A.evaluate(async()=>{const d=await GRC.dms.create({title:'Merger term sheet',conf:'Restricted',type:'Contract'},{text:'Codename walrus-42: price and terms.',name:'term-sheet.txt'});GRC.dms.update(d.id,{shared:['Priya Shah']});return{id:d.id,fileId:d.versions[0].fileId}});
 ok('administrator created a Restricted document with a stored file',!!made.id&&!!made.fileId);
 await A.waitForFunction(i=>{const d=GRC.dms.doc(i);return d&&d.versions[0].fileId},made.id);await A.waitForTimeout(800);
 const J=await open('jordan@forge.demo'),P=await open('priya@forge.demo'),AU=await open('audrey@forge.demo');
 const hid=async(p,m)=>p.evaluate(async m=>{const st=(await GRC.api.call('GET','/api/state?profile='+GRC.PROF)).data.state,all=JSON.stringify(st);
  const f=await GRC.api.call('GET','/api/files?profile='+GRC.PROF+'&ref='+m.id),blob=await GRC.api.fetchFile(m.fileId);
  return{inServer:(st.dmsDocs||[]).some(d=>d.id===m.id),leak:all.includes(m.id)||all.includes('Merger term sheet')||all.includes(m.fileId)||all.includes('walrus'),files:(f.data.files||[]).length,blob:blob?await blob.text():null,inMem:!!GRC.dms.doc(m.id)}},m);
 let r=await hid(J,made);
 ok('a business user without access gets no metadata, no file list and no bytes',!r.inServer&&!r.leak&&r.files===0&&r.blob===null&&!r.inMem,JSON.stringify(r));
 ok('the seeded Restricted document is hidden from him too',await J.evaluate(s=>!GRC.dms.doc(s.id)&&!JSON.stringify(GRC.S()).includes(s.title),seeded));
 await J.click('.nav button[data-view="documents"]');await W(J,()=>document.querySelectorAll('#view-documents tbody tr[data-id]').length>=1);
 ok('the Browse screen lists no Restricted documents for him',await J.evaluate(()=>[...document.querySelectorAll('#view-documents tr[data-id]')].every(tr=>{const d=GRC.dms.doc(tr.dataset.id);return d&&d.conf!=='Restricted'})));
 r=await hid(AU,made);ok('an auditor who is not named does not get it either',!r.inServer&&!r.leak&&r.files===0&&r.blob===null,JSON.stringify(r));
 // priya is in the access list
 ok('a person in the access list receives the document',await W(P,i=>!!GRC.dms.doc(i),made.id));
 const pr=await P.evaluate(async m=>{const bt=await GRC.dms.bytes(m.id);const f=await GRC.api.call('GET','/api/files?profile='+GRC.PROF+'&ref='+m.id);return{text:bt?new TextDecoder().decode(bt):null,files:f.data.files.length,verify:(await GRC.dms.verify(m.id)).ok}},made);
 ok('... and can list, download and verify its file',/walrus-42/.test(pr.text||'')&&pr.files===1&&pr.verify,JSON.stringify(pr));
 // a user who cannot see the document cannot write to it either
 const w=await J.evaluate(async m=>{const o=await GRC.api.call('POST','/api/ops',{profile:GRC.PROF,ops:[{op:'del',p:['dmsDocs'],id:m.id}]});const u=await GRC.api.upload(m.id,new Blob(['x']),'x.txt').then(()=>'allowed',e=>e.message);return{denied:o.data.denied,upload:u}},made);
 ok('he cannot delete it or attach files to it',w.denied===1&&/access/.test(w.upload),JSON.stringify(w));
 ok('it survived on the server',await A.evaluate(async i=>(await GRC.api.call('GET','/api/state?profile='+GRC.PROF)).data.state.dmsDocs.some(d=>d.id===i),made.id));
 // access changes reach connected browsers live
 await A.evaluate(i=>GRC.dms.update(i,{shared:['Priya Shah','Jordan Lee','Audrey Kim']}),made.id);
 ok('adding him to the access list delivers the document live',await W(J,i=>!!GRC.dms.doc(i),made.id));
 const jb=await J.evaluate(async m=>{const b=await GRC.dms.bytes(m.id);return b?new TextDecoder().decode(b):null},made);ok('... with its file',/walrus-42/.test(jb||''),jb);
 ok('an auditor named on the list sees it, read-only',await W(AU,i=>!!GRC.dms.doc(i),made.id)&&await AU.evaluate(i=>!GRC.dms.canEdit(GRC.dms.doc(i)),made.id));
 await A.evaluate(i=>GRC.dms.update(i,{shared:['Priya Shah']}),made.id);
 ok('removing him takes it off his screen live',await W(J,i=>!GRC.dms.doc(i),made.id));
 ok('... and the file is closed to him again',(await hid(J,made)).blob===null);
 const open1=await A.evaluate(async()=>{const d=GRC.dms.docs().find(x=>x.conf!=='Restricted'&&x.status!=='Archived'&&x.owner===GRC.me().name);return d&&d.id});
 ok('an open document is visible to him',!!open1&&await W(J,i=>!!GRC.dms.doc(i),open1));
 await A.evaluate(i=>GRC.dms.update(i,{conf:'Restricted'}),open1);
 ok('making an open document Restricted removes it from people without access, live',await W(J,i=>!GRC.dms.doc(i),open1));
 ok('the audit trail does not show him the hidden document',await J.evaluate(async m=>{const r=await GRC.api.call('GET','/api/audit?profile='+GRC.PROF+'&limit=500');return !JSON.stringify(r.data.rows).includes(m.id)},made));
 ok('no page errors',errs.length===0,JSON.stringify(errs.slice(0,4)));
}catch(e){console.log('FAIL exception',e.message);console.log('errors',errs.slice(0,4))}
await stop();process.exit(0)})()
