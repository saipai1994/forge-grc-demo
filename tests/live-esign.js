// E-signature with the server: an external signer with no account signs through a private link (sign.html), plus the
// failure cases: replaced stored file, reused link, expired link, decline, forged records, and the audit trail.
// This test starts its own server (its own empty data folder and port) because it must read and change that folder.
const {chromium}=require('playwright');const {spawn}=require('child_process'),fs=require('fs'),os=require('os'),path=require('path'),net=require('net');
const {DatabaseSync}=require('node:sqlite');
const ROOT=path.join(__dirname,'..');
const freePort=()=>new Promise(r=>{const s=net.createServer();s.listen(0,()=>{const p=s.address().port;s.close(()=>r(p))})});
(async()=>{
const ok=(n,v,x)=>console.log(v?'PASS':'FAIL',n,x||'');
const DATA=fs.mkdtempSync(path.join(os.tmpdir(),'forge-esign-')),port=await freePort(),U='http://localhost:'+port;
const srv=spawn('node',[path.join(ROOT,'server/server.js')],{env:{...process.env,PORT:String(port),FORGE_DATA:DATA,FORGE_TODAY:'2026-10-12',FORGE_BACKUP:'0',FORGE_SMTP_URL:''},stdio:'ignore'});
const stop=async(code)=>{try{srv.kill()}catch{}try{await b.close()}catch{}process.exit(code)};
let b;const errs=global.__errs=[];
for(let i=0;i<60;i++){try{const r=await fetch(U+'/api/health');if(r.ok)break}catch{}await new Promise(r=>setTimeout(r,250))}
b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});
async function open(email){const c=await b.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});const p=await c.newPage();p.on('pageerror',e=>errs.push(email+' '+e.message));p.on('console',m=>m.type()==='error'&&!/404|409|429|401/.test(m.text())&&errs.push(email+' '+m.text()));
 await p.goto(U+'/index.html#bfsi');await p.waitForSelector('#gcLogin');await p.fill('#gcEmail',email);await p.fill('#gcPw','forge-demo');await p.click('#gcLogin .go');await p.waitForSelector('#gcDot',{timeout:10000});
 await p.waitForFunction(()=>window.GRC&&GRC.api&&GRC.api.connected&&GRC.esign&&GRC.S().dmsDocs,null,{timeout:15000});return p}
const A=await open('morgan@forge.demo');
const db=()=>new DatabaseSync(path.join(DATA,'forge.db'));
const serverState=()=>A.evaluate(async()=>{const r=await GRC.api.call('GET','/api/state?profile='+GRC.PROF);return r.data.state});
const waitServer=(fn,arg)=>A.waitForFunction(async([f,a])=>{const r=await GRC.api.call('GET','/api/state?profile='+GRC.PROF);return !!(r.data.state&&eval('('+f+')')(r.data.state,a))},[fn.toString(),arg],{timeout:12000,polling:300});
const mkDoc=(title,text)=>A.evaluate(async([t,x])=>{const d=await GRC.dms.create({title:t,type:'Contract'},{text:x,name:t.replace(/\W+/g,'-').toLowerCase()+'.txt'});return d.id},[title,text]);
const mkReq=async(doc,signers,o)=>{const id=await A.evaluate(async([doc,signers,o])=>{const r=await GRC.esign.create(doc,signers,o||{});GRC.esign.send(r.id);return r.id},[doc,signers,o]);await waitServer((s,i)=>(s.esReq||[]).some(r=>r.id===i&&r.status==='Out for signature'),id);return id};
const issue=(req,signer)=>A.evaluate(async([req,signer])=>{for(let i=0;i<10;i++){const r=await GRC.api.call('POST','/api/sign/issue',{profile:GRC.PROF,req,signer});if(r.ok)return r.data;if(r.status!==404)return{error:r.data.error,status:r.status};await new Promise(o=>setTimeout(o,500))}return{error:'timeout'}},[req,signer]);
const info=async t=>{const r=await fetch(U+'/api/sign/info?t='+encodeURIComponent(t));return{status:r.status,j:await r.json().catch(()=>({}))}};
const submit=async(t,body)=>{const r=await fetch(U+'/api/sign/submit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({t,...body})});return{status:r.status,j:await r.json().catch(()=>({}))}};
async function ext(link){const c=await b.newContext({viewport:{width:900,height:900}});const p=await c.newPage();p.on('pageerror',e=>errs.push('ext '+e.message));const reqs=[];p.on('request',r=>reqs.push(r.url()));await p.goto(link);return{p,c,reqs}}

// ---- admin creates a document and a request: Morgan signs first, then Ann (outside, no account)
const docId=await mkDoc('Services agreement','Services agreement.\n\nThe supplier will provide the services described in Schedule 1.\nPayment is due in 30 days.\nEither party may end this agreement with 60 days notice.');
await waitServer((s,i)=>(s.dmsDocs||[]).some(d=>d.id===i),docId);
const id1=await mkReq(docId,[{name:'Morgan Chen',role:'Approver',order:1},{name:'Ann Partner',email:'ann@partner.example',internal:false,role:'Signer',order:2}],{title:'Sign the services agreement',message:'Please sign by Friday.'});
ok('request reached the server',id1==='SIG-001');
// link through the screen
await A.evaluate(i=>GRC.openDrawer('esreq',i),id1);await A.waitForSelector('#opDB [data-op=esign-link]');
ok('live: signing link buttons shown for the external signer',!!(await A.$('#opDB [data-op=esign-link][data-email]'))&&!/need the server/.test(await A.textContent('#opDB')));
await A.click('#opDB [data-op=esign-link]:not([data-email])');await A.waitForSelector('#opFB [name=u]',{timeout:10000});
const link=await A.inputValue('#opFB [name=u]');ok('link issued '+link.slice(0,48)+'...',/\/sign\.html\?t=[\w-]{43}$/.test(link));
await A.click('#opFS');
const tok=new URL(link).searchParams.get('t');
const tokRow=db().prepare('SELECT * FROM sign_tokens').all();
ok('only the hash of the token is stored',tokRow.length===1&&tokRow[0].token_hash.length===64&&tokRow[0].token_hash!==tok&&!JSON.stringify(tokRow).includes(tok)&&tokRow[0].used===0&&tokRow[0].expires===new Date(Date.parse((await serverState()).esReq[0].due+'T00:00:00Z')+864e5).toISOString().slice(0,10),JSON.stringify(tokRow[0]));
ok('email option reports that mail is not set up',(await A.evaluate(async i=>{const r=await GRC.api.call('POST','/api/sign/issue',{profile:GRC.PROF,req:i,signer:'s2',email:true});return r.data.emailed},id1))==='email is not set up');
const tok1=(await issue(id1,'s2')).token;ok('a new link revokes the older ones',db().prepare('SELECT COUNT(*) c FROM sign_tokens').get().c===1&&(await info(tok)).status===404&&(await info(tok1)).status===200);

// ---- not their turn yet
let I=await info(tok1);
ok('info: title, document, checksum, role; waiting for Morgan',I.j.request.title==='Sign the services agreement'&&I.j.signer.name==='Ann Partner'&&I.j.signer.role==='Signer'&&I.j.doc.name==='services-agreement.txt'&&I.j.doc.sha256.length===64&&I.j.turn==='waiting'&&I.j.waitingFor.join()==='Morgan Chen',JSON.stringify(I.j).slice(0,200));
ok('info never exposes anyone\'s email',!/@/.test(JSON.stringify(I.j)));
ok('file refused while waiting',(await fetch(U+'/api/sign/file?t='+tok1)).status===409);
ok('signing refused while waiting',(await submit(tok1,{action:'sign',method:'typed',typed:'Ann Partner',consent:true})).status===409);
ok('bad token gets the generic message',await (async()=>{const r=await info('x'.repeat(43));return r.status===404&&/not valid or has expired/.test(r.j.error)})());

// ---- Morgan signs in the app, the server checks the record
await A.evaluate(i=>GRC.actions['esign-sign']({dataset:{id:i}}),id1);await A.waitForSelector('#esGo');
await A.waitForFunction(()=>/Document viewed/.test(document.getElementById('esRead').textContent));await A.fill('#esTx','Morgan Chen');await A.check('#esCons');await A.click('#esGo');
await A.waitForFunction(()=>/Your signature is recorded/.test(document.querySelector('.es-back .es-body').textContent));await A.click('.es-back [data-es=close]');
await waitServer((s,i)=>(s.esReq||[]).find(r=>r.id===i).signers[0].status==='Signed',id1);ok('server accepted the internal signature (gate recomputed the hash)',true);

// ---- the external signer, in a fresh browser context with no login
const E1=await ext(link.replace(tok,tok1));
await E1.p.waitForSelector('#go');
ok('page shows the title, legal note, document details and Download',/Sign the services agreement/.test(await E1.p.textContent('#m'))&&/Aadhaar eSign/.test(await E1.p.textContent('#m'))&&/services-agreement\.txt/.test(await E1.p.textContent('#m'))&&!!(await E1.p.$('#dl')));
await E1.p.waitForFunction(()=>/Document viewed/.test(document.getElementById('rd').textContent));
ok('inline preview shows the text',/Payment is due in 30 days/.test(await E1.p.textContent('#pv')));
ok('Sign disabled until name and consent',await E1.p.isDisabled('#go'));
await E1.p.fill('#tx','Ann');ok('wrong name keeps it disabled',await E1.p.isDisabled('#go'));
await E1.p.fill('#tx','Ann Partner');await E1.p.check('#cs');ok('right name and consent enable Sign',!(await E1.p.isDisabled('#go')));
ok('the page made no requests outside its own origin',E1.reqs.every(u=>u.startsWith(U)||u.startsWith('data:')||u.startsWith('blob:')),E1.reqs.filter(u=>!u.startsWith(U)).join(','));
await E1.p.click('#go');await E1.p.waitForFunction(()=>/Your signature is recorded|Thank you/.test(document.getElementById('m').textContent),null,{timeout:8000});
ok('external signer sees the thank-you page',/Signed/.test(await E1.p.textContent('#m')));
// the admin's open page updated live, and the browser code verifies what the server wrote
await A.waitForFunction(i=>GRC.esign.req(i).status==='Completed',id1,{timeout:10000});
const live1=await A.evaluate(async i=>{const r=GRC.esign.req(i),v=await GRC.esign.verify(i),d=GRC.dms.doc(r.doc);return{signer:r.signers[1],seal:!!r.seal,verify:v.ok,problems:v.problems,sig:d.sig&&d.sig.req,events:r.events.map(e=>e.by+':'+e.action),dstatus:d.status}},id1);
ok('request Completed live on the admin page with an external signature',live1.signer.status==='Signed'&&live1.signer.method==='typed'&&live1.seal&&live1.sig===id1,JSON.stringify(live1.signer).slice(0,160));
ok('browser verify accepts the signature and seal written by the server',live1.verify,live1.problems.join(';'));
ok('history names the external signer',live1.events.includes('External signer: Ann Partner:signed')&&live1.events.includes('External signer: Ann Partner:completed'),live1.events.join());
ok('the document moved to Approved when the approval completed',live1.dstatus==='Approved',live1.dstatus);
ok('requester was notified',(await A.evaluate(async()=>{const r=await GRC.api.call('GET','/api/notifications?profile='+GRC.PROF);return r.data.rows.map(n=>n.title)})).some(t=>/fully signed|Ann Partner signed/.test(t)));
// reused link
ok('used link refused for signing and for the file',(await submit(tok1,{action:'sign',method:'typed',typed:'Ann Partner',consent:true})).status===409&&(await fetch(U+'/api/sign/file?t='+tok1)).status===409);
await E1.p.reload();await E1.p.waitForFunction(()=>/already|signed/i.test(document.getElementById('m').textContent));ok('reloading the used link shows it is done',!(await E1.p.$('#go')));
ok('the signed document is locked',await A.evaluate(i=>!GRC.dms.canEdit(GRC.dms.doc(GRC.esign.req(i).doc)),id1));
await E1.c.close();

// ---- replaced stored file
const doc2=await mkDoc('Lease renewal','Lease renewal terms. Rent is fixed for two years.');
await waitServer((s,i)=>(s.dmsDocs||[]).some(d=>d.id===i),doc2);
const id2=await mkReq(doc2,[{name:'Ann Partner',email:'ann@partner.example',internal:false,role:'Signer',order:1}],{title:'Sign the lease renewal'});
const t2=(await issue(id2,'s1')).token;
const fid=db().prepare('SELECT id,org FROM files WHERE ref=?').get(doc2);fs.appendFileSync(path.join(DATA,'files',fid.org,fid.id),'tampered');
const E2=await ext(U+'/sign.html?t='+t2);await E2.p.waitForSelector('#m');await E2.p.waitForTimeout(500);
ok('with the stored file replaced, the page cannot show the document',/no longer matches/.test(await E2.p.textContent('#pv'))&&await E2.p.isDisabled('#go'));
const sub2=await submit(t2,{action:'sign',method:'typed',typed:'Ann Partner',consent:true});
ok('signing refused when the stored bytes differ from the recorded checksum',sub2.status===409&&/no longer matches/.test(sub2.j.error),JSON.stringify(sub2));
ok('request stays open and the link is not consumed',(await serverState()).esReq.find(r=>r.id===id2).status==='Out for signature'&&db().prepare('SELECT used FROM sign_tokens WHERE req_id=?').get(id2).used===0);
ok('admin integrity check flags the replaced file',await A.evaluate(async i=>{const v=await GRC.esign.verify(i);return !v.ok&&v.docOk===false},id2));
await E2.c.close();

// ---- expired link
const doc3=await mkDoc('NDA','Mutual non-disclosure agreement.');await waitServer((s,i)=>(s.dmsDocs||[]).some(d=>d.id===i),doc3);
const id3=await mkReq(doc3,[{name:'Ann Partner',email:'ann@partner.example',internal:false,role:'Signer',order:1}],{title:'Sign the NDA'});
const t3=(await issue(id3,'s1')).token;const d3=db();d3.prepare("UPDATE sign_tokens SET expires='2026-10-11' WHERE req_id=?").run(id3);d3.close();
const i3=await info(t3);ok('expired link refused with the generic message',i3.status===404&&/not valid or has expired/.test(i3.j.error));
ok('expired link cannot sign or fetch the file',(await submit(t3,{action:'sign',method:'typed',typed:'Ann Partner',consent:true})).status===404&&(await fetch(U+'/api/sign/file?t='+t3)).status===404);
const t3b=(await issue(id3,'s1')).token;ok('a fresh link works',(await info(t3b)).status===200);

// ---- decline through the page
const E3=await ext(U+'/sign.html?t='+t3b);await E3.p.waitForSelector('#dc');
await E3.p.click('#dc');await E3.p.click('#dc');ok('decline needs a reason',/reason/.test(await E3.p.textContent('#msg')));
await E3.p.fill('#rs','The notice period is too long');await E3.p.click('#dc');await E3.p.waitForFunction(()=>/Response recorded/.test(document.getElementById('m').textContent));
await A.waitForFunction(i=>GRC.esign.req(i).status==='Declined',id3,{timeout:10000});
ok('decline recorded live with the reason',await A.evaluate(i=>GRC.esign.req(i).signers[0].reason,id3)==='The notice period is too long');
await E3.c.close();

// ---- drawn signature through the page
const doc4=await mkDoc('Side letter','Side letter text.');await waitServer((s,i)=>(s.dmsDocs||[]).some(d=>d.id===i),doc4);
const id4=await mkReq(doc4,[{name:'Ann Partner',email:'ann@partner.example',internal:false,role:'Witness',order:1}],{title:'Sign the side letter',purpose:'Agreement'});
const t4=(await issue(id4,'s1')).token;const E4=await ext(U+'/sign.html?t='+t4);await E4.p.waitForSelector('#go');
await E4.p.waitForFunction(()=>/Document viewed/.test(document.getElementById('rd').textContent));
await E4.p.check('input[name=md][value=drawn]');await E4.p.check('#cs');ok('drawn: Sign disabled before drawing; typed alternative explained',await E4.p.isDisabled('#go')&&/Prefer to type/.test(await E4.p.textContent('#dr')));
const bb=await (await E4.p.$('#cv')).boundingBox();await E4.p.mouse.move(bb.x+20,bb.y+90);await E4.p.mouse.down();for(let i=0;i<25;i++)await E4.p.mouse.move(bb.x+20+i*14,bb.y+50+Math.cos(i/2)*30);await E4.p.mouse.up();
await E4.p.click('#go');await E4.p.waitForFunction(()=>/Signed/.test(document.querySelector('h1').textContent),null,{timeout:8000});
await A.waitForFunction(i=>GRC.esign.req(i).status==='Completed',id4,{timeout:10000});
const live4=await A.evaluate(async i=>{const r=GRC.esign.req(i),v=await GRC.esign.verify(i);return{m:r.signers[0].method,len:r.signers[0].image.length,ok:v.ok,problems:v.problems,d:GRC.dms.doc(r.doc).status}},id4);
ok('drawn signature stored as a small PNG and verifies in the browser',live4.m==='drawn'&&live4.len>400&&live4.len<60000&&live4.ok,JSON.stringify(live4));
await E4.c.close();

// ---- server-side validation of what a signer sends
const doc5=await mkDoc('Addendum','Addendum text.');await waitServer((s,i)=>(s.dmsDocs||[]).some(d=>d.id===i),doc5);
const id5=await mkReq(doc5,[{name:'Ann Partner',email:'ann@partner.example',internal:false,role:'Signer',order:1}],{title:'Sign the addendum'});
const t5=(await issue(id5,'s1')).token;
const bad=async(b)=>(await submit(t5,{action:'sign',consent:true,...b}));
ok('no consent refused',(await submit(t5,{action:'sign',method:'typed',typed:'Ann Partner'})).status===400);
ok('wrong typed name refused',(await bad({method:'typed',typed:'Bob'})).status===400);
ok('image that is not a PNG data URL refused',(await bad({method:'drawn',image:'data:image/jpeg;base64,'+'A'.repeat(600)})).status===400&&(await bad({method:'drawn',image:'<img onerror=x>'})).status===400);
ok('oversized image refused (60,000 characters)',(await bad({method:'drawn',image:'data:image/png;base64,iVBORw0KGgo'+'A'.repeat(60001)})).status===400);
ok('nothing was recorded by the refusals',(await serverState()).esReq.find(r=>r.id===id5).signers[0].status==='Pending'&&db().prepare('SELECT used FROM sign_tokens WHERE req_id=?').get(id5).used===0);

// ---- forged records are refused by the server gate
const forged=await A.evaluate(async i=>{const r=JSON.parse(JSON.stringify(GRC.esign.req(i)));const s=r.signers[0];s.status='Signed';s.ts=new Date().toISOString();s.method='typed';s.typed=s.name;s.sigHash='f'.repeat(64);
 const x=await GRC.api.call('POST','/api/ops',{profile:GRC.PROF,ops:[{op:'put',p:['esReq'],id:i,rec:r,ch:['signers']}]});return{status:x.status,denied:x.data.denied}},id5);
ok('even an administrator cannot write an external signer\'s signature',forged.denied>=1,JSON.stringify(forged));
ok('server still shows the signer as Pending',(await serverState()).esReq.find(r=>r.id===id5).signers[0].status==='Pending');
const frozen=await A.evaluate(async i=>{const r=JSON.parse(JSON.stringify(GRC.esign.req(i)));r.docSha='a'.repeat(64);const x=await GRC.api.call('POST','/api/ops',{profile:GRC.PROF,ops:[{op:'put',p:['esReq'],id:i,rec:r,ch:['docSha']}]});return x.data.denied},id5);
ok('the recorded checksum cannot be changed',frozen>=1);

// ---- other roles
const J=await open('priya@forge.demo');
ok('a function user cannot create a request',await J.evaluate(async()=>{const r=await GRC.esign.create('DOC-0001',[{name:'Morgan Chen',role:'Signer',order:1}]).then(x=>x,e=>e);const x=await GRC.api.call('POST','/api/ops',{profile:GRC.PROF,ops:[{op:'put',p:['esReq'],id:r.id,rec:r,isNew:true,at:0}]});return x.data.denied>=1}));
const AU=await open('audrey@forge.demo');
ok('an auditor cannot change documents or requests',await AU.evaluate(async()=>{const x=await GRC.api.call('POST','/api/ops',{profile:GRC.PROF,ops:[{op:'put',p:['dmsFolders'],id:'FLD-099',rec:{id:'FLD-099',name:'x',parent:''},isNew:true,at:0}]});return x.data.denied>=1}));

// ---- audit trail
const audit=await A.evaluate(async()=>{const r=await GRC.api.call('GET','/api/audit?profile='+GRC.PROF+'&limit=500');return r.data.rows});
const ipRows=audit.filter(r=>r.detail&&r.detail.ip&&/external signer|declined by external/.test(r.action));
ok('audit trail has external-signer entries with IP address and user agent',ipRows.length>=3&&ipRows.every(r=>/^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(r.detail.ip)&&r.detail.userAgent),JSON.stringify(ipRows[0]));
ok('audit trail names the actor and records link issue, refusal and download',audit.some(r=>/^External signer: Ann Partner$/.test(r.user))&&audit.some(r=>r.action==='signing link issued')&&audit.some(r=>r.action==='signature refused'&&r.detail.ip)&&audit.some(r=>r.action==='document downloaded'));
ok('the audit trail never contains the token',!JSON.stringify(audit).includes(tok1)&&!JSON.stringify(audit).includes(t2));

// ---- rate limit style: too many bad tokens
let limited=0;for(let i=0;i<40;i++){const r=await fetch(U+'/api/sign/info?t='+'z'.repeat(40)+i);if(r.status===429)limited++}
ok('repeated bad tokens are rate limited',limited>0);
console.log('errors',errs.slice(0,4));ok('no page errors',errs.length===0);
await stop(0)})().catch(e=>{console.error('FAIL',e&&e.stack||e);console.error('page errors so far',global.__errs);process.exit(1)});
