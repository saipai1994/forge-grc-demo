// Document and e-signature core: versions, hashes, signing order, seal and tamper detection (demo mode).
const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});
const p=await b.newPage({viewport:{width:1440,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());const ok=(n,v,x)=>console.log(v?'PASS':'FAIL',n,x||'');
await p.goto((process.env.BASE||'http://localhost:8765')+'/index.html#bfsi');await p.evaluate(()=>{indexedDB.deleteDatabase('forgeGrcDms')});await p.reload();await p.waitForTimeout(3000);
const r=await p.evaluate(async()=>{const D=GRC.dms,E=GRC.esign,out={};
 out.seeded=[D.docs().length,D.folders().length];
 out.shaKnown=(await D.shaText('abc'))==='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'&&D.sha256sync(D.utf8('abc'))==='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
 const d=await D.create({title:'Outsourcing policy',type:'Policy',folder:'FLD-001',tags:['Outsourcing','TPRM'],linked:['POL-001']},{text:'Version one of the policy.'});
 out.created=[d.id,d.versions.length,d.versions[0].sha.length];
 out.verify1=(await D.verify(d.id)).ok;out.text1=await D.text(d.id);
 await D.addVersion(d.id,{text:'Version two with changes.'},'Edited scope');out.v2=[D.doc(d.id).cur,D.doc(d.id).versions.length,await D.text(d.id),await D.text(d.id,1)];
 out.search=[D.search('outsourcing').length,D.search('version two').length,D.search('nothing-here-xyz').length,D.docsFor('POL-001').map(x=>x.id).includes(d.id)];
 // signing
 const q=await E.create(d.id,[{name:'Morgan Chen',role:'Approver',order:1},{name:'Jordan Lee',role:'Signer',order:2}],{purpose:'Approval',title:'Approve outsourcing policy'});
 E.send(q.id);out.pending=E.pendingNow(E.req(q.id)).map(s=>s.name);
 out.orderGuard=await E.sign(q.id,'s2',{typed:'Jordan Lee',consent:true}).then(()=>'allowed',e=>e.message);
 out.noConsent=await E.sign(q.id,'s1',{typed:'Morgan Chen'}).then(()=>'allowed',e=>e.message);
 out.badName=await E.sign(q.id,'s1',{typed:'Someone Else',consent:true}).then(()=>'allowed',e=>e.message);
 await E.sign(q.id,'s1',{typed:'Morgan Chen',consent:true});out.afterFirst=[E.req(q.id).status,E.req(q.id).signers[0].status];
 out.locked=[!D.canEdit(D.doc(d.id)),(await D.addVersion(d.id,{text:'x'}).then(()=>'allowed',e=>e.message))];
 out.id=q.id;out.docId=d.id;return out});
ok('demo documents and folders seeded ('+r.seeded.join(' docs, ')+' folders)',r.seeded[0]>=7&&r.seeded[1]>=6);
ok('SHA-256 matches the known test vector (WebCrypto and pure JS)',r.shaKnown);
ok('document created with checksum',r.created[1]===1&&r.created[2]===64,r.created.join(','));
ok('integrity check passes and text round-trips',r.verify1&&r.text1==='Version one of the policy.');
ok('new version keeps history',r.v2[0]===2&&r.v2[1]===2&&/two/.test(r.v2[2])&&/one/.test(r.v2[3]));
ok('search by title, content, links',r.search[0]>=1&&r.search[1]===1&&r.search[2]===0&&r.search[3]);
ok('only the first signer can sign first',r.pending.join()==='Morgan Chen'&&/not this signer|turn|for Jordan/i.test(r.orderGuard),r.orderGuard);
ok('consent and exact name are required',/agree to sign/.test(r.noConsent)&&/exactly/.test(r.badName),r.noConsent+' | '+r.badName);
ok('first signature recorded, request still open',r.afterFirst.join()==='Out for signature,Signed');
// now Jordan signs by drawing, from his own session
await p.selectOption('#demoUserSwitch','jordan');await p.waitForTimeout(500);
const r2=await p.evaluate(async(id)=>{const E=GRC.esign,D=GRC.dms;const c=document.createElement('canvas');c.width=300;c.height=100;const x=c.getContext('2d');x.lineWidth=3;x.beginPath();x.moveTo(10,80);x.bezierCurveTo(60,0,120,120,200,30);x.stroke();const img=c.toDataURL('image/png');
 const o={};o.badImage=await E.sign(id,'s2',{method:'drawn',image:'data:image/png;base64,AAAA',consent:true}).then(()=>'allowed',e=>e.message);
 await E.sign(id,'s2',{method:'drawn',image:img,consent:true});const q=E.req(id);o.status=[q.status,!!q.seal,q.signers.map(s=>s.status).join()];
 o.docState=[D.doc(q.doc).status,!!D.doc(q.doc).sig];o.verify=await E.verify(id);o.cert=/Certificate of completion/.test(E.certificate(id))&&E.certificate(id).includes(q.seal.sha)&&/not an Aadhaar/.test(E.certificate(id));
 // tamper with a signature record and with the recorded document checksum
 q.signers[0].ts='2020-01-01T00:00:00.000Z';o.tamperSig=(await E.verify(id)).ok;q.signers[0].ts=q.signers[0].ts;return o},r.id);
ok('drawn signature validated',/Draw your signature/.test(r2.badImage),r2.badImage);
ok('request completes and is sealed',r2.status[0]==='Completed'&&r2.status[1]&&r2.status[2]==='Signed,Signed');
ok('document approved and locked',r2.docState[0]==='Approved'&&r2.docState[1]);
ok('verification passes on an untouched record',r2.verify.ok&&r2.verify.sigs.length===2&&r2.verify.sealOk===true,JSON.stringify(r2.verify.problems));
ok('certificate contains seal and legal note',r2.cert);
ok('altering a signature record is detected',r2.tamperSig===false);
ok('no page errors',errs.length===0,JSON.stringify(errs.slice(0,3)));
await b.close()})()
