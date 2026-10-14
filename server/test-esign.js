// Checks the server-side signature hashing against the browser code (esign-core.js, loaded as-is) on fixed inputs,
// known SHA-256 vectors, the signature image rules and the gate that protects signature records.
// If someone changes the canonical strings on one side only, this fails.
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const ES=require('./esign.js');
const ROOT=path.join(__dirname,'..');

// ---- known vectors (FIPS 180-2 / common test strings)
assert.equal(ES.sha256hex(''),'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855','empty string');
assert.equal(ES.sha256hex('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad','abc');
assert.equal(ES.sha256hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'),'248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1','two-block message');
assert.equal(ES.sha256hex('é'),crypto.createHash('sha256').update(Buffer.from('é','utf8')).digest('hex'),'utf-8 encoding');
console.log('ok sha-256 vectors');

// ---- load the browser code in a stand-in page
function loadCore(){
 const store={dmsDocs:[],esReq:[],seq:{}};
 const G={S:()=>store,logIt(){},commit(){},me:()=>({name:'Test User',role:'Administrator'}),TODAY:'2026-10-12',addDays:(d,n)=>d,dTo:()=>0,seeders:{},PROF:'t',people:()=>['A','B'],api:{}};
 const win={GRC:G,crypto:crypto.webcrypto,indexedDB:undefined};
 const ctx=vm.createContext({window:win,crypto:crypto.webcrypto,TextEncoder,TextDecoder,Blob,console,setTimeout,Uint8Array,Uint32Array,DataView});
 for(const f of ['dms-core.js','esign-core.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});
 return G}

(async()=>{
 const G=loadCore();assert(G.esign&&G.esign.sigHash&&G.esign.sealHash,'core exports its hashes');
 const img='data:image/png;base64,'+'iVBORw0KGgo'.padEnd(500,'A');
 const imageSha=ES.sha256hex(img);
 const req={id:'SIG-007',docSha:ES.sha256hex('the document'),
  signers:[
   {id:'s1',name:'Priya Shah',email:'',status:'Signed',ts:'2026-10-12T09:15:00.123Z',method:'typed',typed:'Priya Shah',imageSha:''},
   {id:'s2',name:'Jordan Lee',email:'',status:'Signed',ts:'2026-10-12T10:20:00.456Z',method:'drawn',typed:'',imageSha},
   {id:'s3',name:'Ann O\'Neil | Partner',email:'ann@example.com',status:'Signed',ts:'2026-10-11T08:00:00.000Z',method:'typed',typed:'Ann O\'Neil | Partner',imageSha:''},
   {id:'s4',name:'Not Yet',email:'x@y.z',status:'Pending',ts:'',method:'',typed:'',imageSha:''}]};
 for(const s of req.signers.filter(x=>x.status==='Signed')){
  const a=await G.esign.sigHash(req,s),b=ES.sigHash(req,s);assert.equal(b,a,'sigHash '+s.id);s.sigHash=b}
 assert.equal(ES.sealHash(req),await G.esign.sealHash(req),'sealHash agrees with the browser');
 // fixed expectation so a change on BOTH sides is also noticed
 const s1=req.signers[0];
 assert.equal(s1.sigHash,ES.sha256hex([req.docSha,'SIG-007','s1','Priya Shah','','2026-10-12T09:15:00.123Z','typed','Priya Shah',''].join('|')),'sigHash canonical string');
 assert.equal(ES.sealHash(req),ES.sha256hex(req.docSha+'|SIG-007|'+['Ann O\'Neil | Partner:2026-10-11T08:00:00.000Z:'+req.signers[2].sigHash,'Priya Shah:2026-10-12T09:15:00.123Z:'+s1.sigHash,'Jordan Lee:2026-10-12T10:20:00.456Z:'+req.signers[1].sigHash].join(';')),'seal canonical string (signatures sorted by time)');
 console.log('ok sigHash and sealHash match esign-core.js');

 // ---- the same through the browser verify(): a record built by the server passes, an altered one fails
 const D=G.dms,dd=await D.create({title:'T'},{text:'hello document',name:'a.txt'}),docSha=dd.versions[0].sha;
 assert.equal(docSha,ES.sha256hex('hello document'),'the browser hashes files like the server');
 const full={id:'SIG-009',title:'x',doc:dd.id,ver:1,docSha,purpose:'Approval',order:'Parallel',due:'2026-10-20',status:'Completed',created:'2026-10-12',createdBy:'Test User',events:[],seal:null,completedAt:'',
  signers:[{id:'s1',name:'Ext Person',email:'e@x.io',role:'Signer',internal:false,order:1,status:'Signed',ts:'2026-10-12T11:00:00.000Z',method:'drawn',typed:'',image:img,imageSha,reason:''}]};
 full.signers[0].sigHash=ES.sigHash(full,full.signers[0]);full.seal={ts:'2026-10-12T11:00:01.000Z',sha:ES.sealHash(full)};
 G.S().esReq.push(full);
 let v=await G.esign.verify('SIG-009');assert(v.ok,'server-built record verifies in the browser code: '+JSON.stringify(v.problems));
 full.signers[0].image=img.replace(/A$/,'B');v=await G.esign.verify('SIG-009');assert(!v.ok,'a swapped signature image is detected');full.signers[0].image=img;
 full.signers[0].typed='Someone Else';v=await G.esign.verify('SIG-009');assert(!v.ok,'an altered typed name is detected');full.signers[0].typed='';
 console.log('ok records written by the server verify in the browser');

 // ---- signature image rules
 assert.equal(ES.imageProblem(img),'','valid png data url');
 assert(ES.imageProblem('data:image/png;base64,AAAA'),'too short');
 assert(ES.imageProblem('data:image/jpeg;base64,'+'A'.repeat(600)),'not png');
 assert(ES.imageProblem('data:image/png;base64,'+'iVBORw0KGgo'.padEnd(60001,'A')),'too large (limit 60,000 characters)');
 assert(ES.imageProblem('data:image/png;base64,'+'QUJDREVGR0hJSktM'.repeat(40)),'does not decode to a PNG');
 assert(ES.imageProblem('<script>'),'not a data url');
 assert.equal(ES.normName('  Priya   SHAH '),'priya shah');
 console.log('ok image and name rules');

 // ---- the gate (returns true to DENY)
 const today='2026-10-12',morgan={name:'Morgan Chen',role:'Administrator'},jordan={name:'Jordan Lee',role:'Business user'},priya={name:'Priya Shah',role:'Function user'},audrey={name:'Audrey Kim',role:'Auditor'};
 const mk=(over)=>({id:'SIG-001',title:'t',doc:'DOC-1',ver:1,docSha:'a'.repeat(64),purpose:'Approval',message:'',order:'Sequential',due:'2026-10-20',status:'Out for signature',created:today,createdBy:'Morgan Chen',events:[{ts:'t0',by:'Morgan Chen',action:'created',detail:''}],seal:null,completedAt:'',
  signers:[{id:'s1',name:'Jordan Lee',email:'',role:'Signer',internal:true,order:1,status:'Pending',ts:'',method:'',typed:'',image:'',reason:''},{id:'s2',name:'Ext Person',email:'e@x.io',role:'Signer',internal:false,order:2,status:'Pending',ts:'',method:'',typed:'',image:'',reason:''}],...over});
 const st=()=>({esReq:[mk()]}),put=rec=>({op:'put',p:['esReq'],id:rec.id,rec});
 const clone=o=>JSON.parse(JSON.stringify(o));
 const signAs=(r,i,name)=>{const n=clone(r);const s=n.signers[i];s.status='Signed';s.ts='2026-10-12T12:00:00.000Z';s.method='typed';s.typed=name;s.imageSha='';s.sigHash=ES.sigHash(n,s);return n};
 // creation
 assert.equal(ES.gate({esReq:[]},put(mk({createdBy:'Morgan Chen',status:'Draft'})),morgan,today),false,'admin can create');
 assert.equal(ES.gate({esReq:[]},put(mk({createdBy:'Jordan Lee',status:'Draft',events:[{ts:'t',by:'Jordan Lee',action:'created',detail:''}]})),jordan,today),false,'business user can create');
 assert.equal(ES.gate({esReq:[]},put(mk({createdBy:'Priya Shah',status:'Draft',events:[{ts:'t',by:'Priya Shah',action:'created',detail:''}]})),priya,today),true,'function user cannot create');
 assert.equal(ES.gate({esReq:[]},put(mk({createdBy:'Audrey Kim',status:'Draft'})),audrey,today),true,'auditor cannot create');
 assert.equal(ES.gate({esReq:[]},put(mk({status:'Completed'})),morgan,today),true,'cannot be created already completed');
 assert.equal(ES.gate({esReq:[]},put(mk({createdBy:'Jordan Lee'})),morgan,today),true,'cannot be created in someone else\'s name');
 // own signature
 let r0=mk();let r1=signAs(r0,0,'Jordan Lee');
 assert.equal(ES.gate({esReq:[r0]},put(r1),jordan,today),false,'internal signer signs for themselves');
 assert.equal(ES.gate({esReq:[r0]},put(r1),morgan,today),true,'admin cannot sign for Jordan');
 r1.events.push({ts:'t1',by:'Jordan Lee',action:'signed',detail:''});assert.equal(ES.gate({esReq:[r0]},put(r1),jordan,today),false,'with a history entry');
 // forged hash
 const forged=signAs(r0,0,'Jordan Lee');forged.signers[0].sigHash='b'.repeat(64);assert.equal(ES.gate({esReq:[r0]},put(forged),jordan,today),true,'inconsistent signature hash refused');
 const wrongName=signAs(r0,0,'Somebody Else');assert.equal(ES.gate({esReq:[r0]},put(wrongName),jordan,today),true,'typed name must match');
 // external signer entry can only come from the portal
 const ext=signAs(r0,1,'Ext Person');assert.equal(ES.gate({esReq:[r0]},put(ext),morgan,today),true,'nobody can sign for an external signer');
 assert.equal(ES.gate({esReq:[r0]},put(ext),{name:'External signer: Ext Person',role:'Administrator',label:ES.PORTAL_LABEL},today),false,'the portal can');
 // order
 const par=mk({order:'Sequential'});par.signers[0].order=2;par.signers[1].order=1;par.signers[1].internal=true;par.signers[1].name='Priya Shah';
 assert.equal(ES.gate({esReq:[par]},put(signAs(par,0,'Jordan Lee')),jordan,today),true,'sequential order is enforced');
 // frozen fields, history
 const tampered=clone(r0);tampered.docSha='c'.repeat(64);assert.equal(ES.gate({esReq:[r0]},put(tampered),morgan,today),true,'docSha is frozen');
 const hist=clone(r0);hist.events=[];assert.equal(ES.gate({esReq:[r0]},put(hist),morgan,today),true,'history cannot shrink');
 const hist2=clone(r0);hist2.events.push({ts:'t',by:'Someone Else',action:'x',detail:''});assert.equal(ES.gate({esReq:[r0]},put(hist2),morgan,today),true,'history entries are in the caller\'s name');
 // status moves
 assert.equal(ES.gate({esReq:[r0]},put({...clone(r0),status:'Cancelled'}),morgan,today),false,'requester cancels');
 assert.equal(ES.gate({esReq:[r0]},put({...clone(r0),status:'Cancelled'}),jordan,today),true,'someone else cannot cancel');
 assert.equal(ES.gate({esReq:[r0]},put({...clone(r0),status:'Completed'}),morgan,today),true,'cannot be completed without signatures');
 assert.equal(ES.gate({esReq:[r0]},put({...clone(r0),status:'Expired'}),morgan,today),true,'not expired before the due date');
 assert.equal(ES.gate({esReq:[{...clone(r0),due:'2026-10-01'}]},put({...clone(r0),due:'2026-10-01',status:'Expired'}),morgan,today),false,'expires after the due date');
 // completion with a seal
 const done=signAs(signAs(r0,0,'Jordan Lee'),1,'Ext Person');done.signers[1].internal=true;
 // (external flag is part of the frozen identity, so build an all-internal request for the completion path)
 const ri=mk();ri.signers[1].internal=true;ri.signers[1].name='Priya Shah';ri.order='Parallel';
 let c=signAs(ri,0,'Jordan Lee');c=signAs(c,1,'Priya Shah');c.status='Completed';c.completedAt='2026-10-12T12:00:02.000Z';c.seal={ts:c.completedAt,sha:'d'.repeat(64)};
 // two signers in one change is refused (only one's own entry can move)
 assert.equal(ES.gate({esReq:[ri]},put(c),jordan,today),true,'cannot sign two entries at once');
 const rj=signAs(ri,0,'Jordan Lee');
 const last=signAs(rj,1,'Priya Shah');last.status='Completed';last.completedAt='2026-10-12T12:00:02.000Z';last.seal={ts:last.completedAt,sha:ES.sealHash(last)};
 assert.equal(ES.gate({esReq:[rj]},put(last),priya,today),false,'last signer completes with a correct seal');
 last.seal.sha='e'.repeat(64);assert.equal(ES.gate({esReq:[rj]},put(last),priya,today),true,'a wrong seal is refused');
 const fin=clone(rj);fin.status='Completed';assert.equal(ES.gate({esReq:[{...rj,status:'Completed'}]},put({...fin,title:'x'}),morgan,today),true,'completed records are frozen');
 // delete / collection
 assert.equal(ES.gate(st(),{op:'del',p:['esReq'],id:'SIG-001'},morgan,today),false,'admin deletes an unsigned request');
 assert.equal(ES.gate(st(),{op:'del',p:['esReq'],id:'SIG-001'},jordan,today),true,'others cannot delete');
 assert.equal(ES.gate({esReq:[rj]},{op:'del',p:['esReq'],id:'SIG-001'},morgan,today),true,'a request with a signature cannot be deleted');
 assert.equal(ES.gate({},{op:'set',p:['esReq'],v:[]},jordan,today),false,'creating the empty collection is fine');
 assert.equal(ES.gate(st(),{op:'unset',p:['esReq']},morgan,today),true,'the collection cannot be wiped');
 assert.equal(ES.gate(st(),{op:'put',p:['issues'],id:'I-1',rec:{id:'I-1'}},jordan,today),false,'other collections are untouched');
 console.log('ok gate');
 console.log('E-signature server checks passed');
})().catch(e=>{console.error('FAILED:',e&&e.stack||e);process.exit(1)});
