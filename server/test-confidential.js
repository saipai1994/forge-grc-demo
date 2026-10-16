// Restricted documents on the server: state pull, ops, the live stream, files and the audit trail.
// Run: node server/test-confidential.js   (starts its own server on a temporary database)
const os=require('os'),fs=require('fs'),path=require('path'),assert=require('assert'),http=require('http');
process.env.FORGE_DATA=fs.mkdtempSync(path.join(os.tmpdir(),'forge-conf-'));process.env.FORGE_TODAY='2026-10-12';process.env.FORGE_BACKUP='0';
const CONF=require('./confidential.js'),{server,db}=require('./server.js');
let n=0;const ok=(c,m)=>{assert(c,m);n++;console.log('ok  ',m)};

// ---- pure rules ----
const adm={id:'morgan',name:'Morgan Chen',role:'Administrator'},own={id:'jordan',name:'Jordan Lee',role:'Business user'},oth={id:'evan',name:'Evan Brooks',role:'Business user'},aud={id:'audrey',name:'Audrey Kim',role:'Auditor'};
const D=(o)=>({id:'DOC-0001',conf:'Restricted',owner:'Jordan Lee',createdBy:'Jordan Lee',...o});
ok(CONF.canSeeDoc(D({}),adm)&&CONF.canSeeDoc(D({}),own)&&!CONF.canSeeDoc(D({}),oth)&&!CONF.canSeeDoc(D({}),aud),'owner and administrator see it; others and unnamed auditors do not');
ok(CONF.canSeeDoc(D({owner:'Morgan Chen',createdBy:'Evan Brooks'}),oth),'the creator sees it');
ok(CONF.canSeeDoc(D({shared:['Evan Brooks']}),oth)&&CONF.canSeeDoc(D({access:['Evan Brooks']}),oth)&&CONF.canSeeDoc(D({access:['evan']}),oth),'people named in the access list (shared or access, by name or id) see it');
ok(CONF.canSeeDoc(D({access:['Audrey Kim']}),aud),'an auditor sees it only when named');
ok(CONF.canSeeDoc(D({conf:'Confidential'}),oth)&&CONF.canSeeDoc(undefined,oth),'other levels are not affected');
ok(!CONF.canSeeDoc(D({owner:'',createdBy:''}),{role:'Business user'}),'a nameless caller never matches an empty owner');

// ---- over http ----
(async()=>{
 await new Promise(r=>server.listen(0,r));const base='http://localhost:'+server.address().port;
 const J=async(m,u,body,h)=>{const r=await fetch(base+u,{method:m,headers:{'content-type':'application/json',...h},body:body?JSON.stringify(body):undefined});return{s:r.status,j:await r.json().catch(()=>({}))}};
 const tok={};for(const u of ['morgan','jordan','priya','evan','sam','audrey'])tok[u]={authorization:'Bearer '+(await J('POST','/api/login',{email:u+'@forge.demo',password:'forge-demo'},{})).j.token};
 const P='dc',doc=(id,o)=>({id,title:'Doc '+id,type:'Other',folder:'',status:'Draft',owner:'Morgan Chen',createdBy:'Morgan Chen',conf:'Internal',tags:[],linked:[],desc:'',versions:[],cur:1,out:'',idx:'secret-'+id,sig:null,retention:{years:7,hold:false,holdReason:''},...o});
 const req=(id,d,o)=>({id,doc:d,ver:1,docSha:'a'.repeat(64),title:'Sign '+d,message:'',purpose:'Approval',order:'Parallel',due:'2026-12-01',status:'Out for signature',createdBy:'Morgan Chen',created:'2026-10-01',signers:[{id:'s1',name:'Priya Shah',email:'',role:'Reviewer',internal:true,order:1,status:'Pending'}],events:[],...o});
 const docs=[doc('DOC-0001',{conf:'Restricted',owner:'Jordan Lee',createdBy:'Jordan Lee'}),doc('DOC-0002',{conf:'Restricted',shared:['Priya Shah']}),doc('DOC-0003',{conf:'Restricted',createdBy:'Evan Brooks'}),doc('DOC-0004',{conf:'Internal'}),doc('DOC-0005',{conf:'Restricted',access:['Audrey Kim']})];
 await J('POST','/api/init',{profile:P,state:{v:1,seq:{doc:6},issues:[],dmsFolders:[],dmsDocs:docs,esReq:[req('SIG-001','DOC-0001'),req('SIG-002','DOC-0004'),req('SIG-003','DOC-0002')]}},tok.morgan);
 const pull=async u=>(await J('GET','/api/state?profile='+P,null,tok[u])).j.state;
 const ids=a=>(a||[]).map(x=>x.id).join(',');
 ok(ids((await pull('morgan')).dmsDocs)==='DOC-0001,DOC-0002,DOC-0003,DOC-0004,DOC-0005','administrator pulls every document');
 ok(ids((await pull('jordan')).dmsDocs)==='DOC-0001,DOC-0004','owner sees own Restricted document only (plus open ones)');
 ok(ids((await pull('priya')).dmsDocs)==='DOC-0002,DOC-0004','a person in the access list sees it');
 ok(ids((await pull('evan')).dmsDocs)==='DOC-0003,DOC-0004','the creator sees it');
 ok(ids((await pull('sam')).dmsDocs)==='DOC-0004','a function user without access sees none');
 ok(ids((await pull('audrey')).dmsDocs)==='DOC-0004,DOC-0005','an auditor sees only what is open or names them');
 ok(ids((await pull('evan')).esReq)==='SIG-002','signature requests on a hidden document are hidden too');
 ok(ids((await pull('priya')).esReq)==='SIG-002,SIG-003','... and visible to people who can see the document');
 const serialized=JSON.stringify(await pull('sam'));ok(!serialized.includes('secret-DOC-0001')&&!serialized.includes('DOC-0001')&&!serialized.includes('SIG-001'),'nothing about hidden documents is in the payload (no titles, search text or ids)');
 const init=await J('POST','/api/init',{profile:P,state:{v:1}},tok.evan);ok(ids(init.j.state.dmsDocs)==='DOC-0003,DOC-0004','/api/init for an existing workspace returns the filtered state');

 // ---- ops ----
 const putDoc=(u,id,rec,extra)=>J('POST','/api/ops',{profile:P,ops:[{op:'put',p:['dmsDocs'],id,at:0,rec,...extra}]},tok[u]);
 let r=await putDoc('evan','DOC-0001',{...docs[0],title:'hijacked'});ok(r.j.denied===1,'cannot overwrite a document you cannot see');
 r=await J('POST','/api/ops',{profile:P,ops:[{op:'del',p:['dmsDocs'],id:'DOC-0001'}]},tok.evan);ok(r.j.denied===1,'cannot delete it');
 r=await J('POST','/api/ops',{profile:P,ops:[{op:'unset',p:['dmsDocs']}]},tok.evan);ok(r.j.denied===1,'cannot clear the whole collection while hidden documents exist');
 r=await J('POST','/api/ops',{profile:P,ops:[{op:'set',p:['dmsDocs'],v:[]}]},tok.evan);ok(r.j.denied===1,'... or replace it');
 r=await putDoc('evan','DOC-0001',{...docs[0],id:'DOC-0001',title:'mine'},{isNew:true});ok(r.j.renames&&r.j.renames['DOC-0001']==='DOC-0006','a new document that reuses a hidden id is renamed, not merged');
 ok((await pull('morgan')).dmsDocs.find(d=>d.id==='DOC-0001').title==='Doc DOC-0001','the hidden document is untouched');
 r=await putDoc('priya','DOC-0002',{...docs[1],title:'Doc DOC-0002 edited'},{ch:['title']});ok(!r.j.denied&&(await pull('morgan')).dmsDocs.find(d=>d.id==='DOC-0002').title.endsWith('edited'),'a person in the access list can edit it');
 const mkReq=(id,d)=>req(id,d,{createdBy:'Evan Brooks',signers:[{id:'s1',name:'Priya Shah',email:'',role:'Reviewer',internal:true,order:1,status:'Pending'}],events:[{ts:'2026-10-12T00:00:00Z',by:'Evan Brooks',action:'created',detail:''}],status:'Draft'});
 r=await J('POST','/api/ops',{profile:P,ops:[{op:'put',p:['esReq'],id:'SIG-009',at:0,isNew:true,rec:mkReq('SIG-009','DOC-0001')}]},tok.evan);ok(r.j.denied===1,'cannot request signatures on a document you cannot see');
 r=await J('POST','/api/ops',{profile:P,ops:[{op:'put',p:['esReq'],id:'SIG-010',at:0,isNew:true,rec:mkReq('SIG-010','DOC-0004')}]},tok.evan);ok(!r.j.denied,'... but can on an open one');
 r=await J('POST','/api/ops',{profile:P,ops:[{op:'del',p:['esReq'],id:'SIG-001'}]},tok.evan);ok(r.j.denied===1,'cannot touch a signature request on a hidden document');

 // ---- files ----
 const up=(u,ref)=>fetch(base+`/api/files?profile=${P}&ref=${ref}&name=a.txt`,{method:'POST',headers:tok[u],body:Buffer.from('secret bytes '+ref)});
 const f1=await(await up('jordan','DOC-0001')).json(),f2=await(await up('morgan','DOC-0002')).json(),f3=await(await up('morgan','DOC-0004')).json(),f4=await(await up('morgan','SIG-001')).json();
 ok(f1.id&&f2.id&&f3.id&&f4.id,'owner and administrator can attach files');
 ok((await up('evan','DOC-0001')).status===403,'upload to a hidden document is refused');
 const list=async(u,ref)=>(await J('GET',`/api/files?profile=${P}&ref=${ref}`,null,tok[u])).j.files;
 ok((await list('jordan','DOC-0001')).length===1&&(await list('morgan','DOC-0001')).length===1,'owner and administrator list the files');
 ok((await list('evan','DOC-0001')).length===0&&(await list('sam','SIG-001')).length===0,'others get an empty list (document and request references)');
 const dl=(u,id)=>fetch(base+'/api/files/'+id,{headers:tok[u]});
 ok((await dl('jordan',f1.id)).status===200&&(await dl('morgan',f1.id)).status===200,'owner and administrator download');
 ok((await dl('evan',f1.id)).status===404&&(await dl('sam',f4.id)).status===404&&(await dl('audrey',f1.id)).status===404,'others cannot download (looks like no such file)');
 ok((await dl('priya',f2.id)).status===200&&(await dl('evan',f2.id)).status===404,'the access list applies to files');
 ok((await dl('evan',f3.id)).status===200,'files of open documents are unchanged');
 ok((await fetch(base+'/api/files/'+f1.id,{method:'DELETE',headers:tok.evan})).status===404,'cannot delete a hidden file');

 // ---- audit trail ----
 const au=async u=>(await J('GET','/api/audit?profile='+P+'&limit=500',null,tok[u])).j.rows;
 ok((await au('morgan')).some(x=>x.rec==='DOC-0001')&&(await au('jordan')).some(x=>x.rec==='DOC-0001'),'administrator and owner see audit rows about the document');
 ok(!(await au('evan')).some(x=>x.rec==='DOC-0001'||x.rec==='SIG-001'||/Doc DOC-0001/.test(JSON.stringify(x.detail))),'others do not');

 // ---- live stream ----
 const listen=u=>new Promise(res=>{const buf=[];const rq=http.get(base+`/api/events?profile=${P}&token=${encodeURIComponent(tok[u].authorization.slice(7))}`,rs=>{rs.on('data',d=>buf.push(String(d)));res({buf,close:()=>rq.destroy(),ops:()=>buf.join('').split('\n\n').filter(x=>x.startsWith('data: ')).map(x=>JSON.parse(x.slice(6))).filter(m=>m.type==='ops').flatMap(m=>m.ops)})})});
 const sEvan=await listen('evan'),sJordan=await listen('jordan'),sMorgan=await listen('morgan');await new Promise(r=>setTimeout(r,300));
 const tick=()=>new Promise(r=>setTimeout(r,250));
 await putDoc('morgan','DOC-0001',{...docs[0],title:'renamed by admin'},{ch:['title']});await tick();
 ok(sJordan.ops().some(o=>o.id==='DOC-0001')&&sMorgan.ops().some(o=>o.id==='DOC-0001'),'the owner and administrator hear about a change to it');
 ok(!sEvan.ops().some(o=>o.id==='DOC-0001'),'someone without access does not');
 await putDoc('morgan','DOC-0004',{...docs[3],conf:'Restricted'},{ch:['conf']});await tick();
 ok(sEvan.ops().some(o=>o.op==='del'&&o.id==='DOC-0004'),'a document that becomes Restricted is removed from the screens of people who lose access');
 ok(sJordan.ops().some(o=>o.op==='del'&&o.id==='DOC-0004')&&sMorgan.ops().some(o=>o.op==='put'&&o.id==='DOC-0004'),'... while administrators keep it');
 await putDoc('morgan','DOC-0004',{...docs[3],conf:'Restricted',shared:['Evan Brooks']},{ch:['shared']});await tick();
 ok(sEvan.ops().some(o=>o.op==='put'&&o.id==='DOC-0004'&&o.rec.shared),'a person added to the access list receives it');
 await J('POST','/api/ops',{profile:P,ops:[{op:'put',p:['esReq'],id:'SIG-001',at:0,rec:{...req('SIG-001','DOC-0001'),events:[{ts:'2026-10-12T01:00:00Z',by:'Morgan Chen',action:'note',detail:'x'}]}}]},tok.morgan);await tick();
 ok(sMorgan.ops().some(o=>o.id==='SIG-001')&&!sEvan.ops().some(o=>o.id==='SIG-001'),'signature-request changes follow the document');
 [sEvan,sJordan,sMorgan].forEach(s=>s.close());

 console.log(n+' checks passed');server.close();db.close();process.exit(0);
})().catch(e=>{console.error('FAILED:',e.stack||e.message);process.exit(1)});
