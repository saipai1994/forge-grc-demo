// Quick checks: node server/test.js   (starts its own server on a temporary database)
const os=require('os'),fs=require('fs'),path=require('path'),assert=require('assert');
process.env.FORGE_DATA=fs.mkdtempSync(path.join(os.tmpdir(),'forge-'));process.env.FORGE_TODAY='2026-10-12';
const SYNC=require('../sync-core.js'),{server,db}=require('./server.js');
(async()=>{
 const a={issues:[{id:'I1',t:'a'}],seq:{issue:5},audit:{plan:[{id:'A1',x:1}]}},b=JSON.parse(JSON.stringify(a));b.issues.unshift({id:'I2'});b.audit.plan[0].x=2;b.seq.issue=6;
 const t=JSON.parse(JSON.stringify(a));SYNC.diff(a,b).forEach(o=>SYNC.apply(t,o));assert(SYNC.same(t,b),'diff/apply round trip');
 await new Promise(r=>server.listen(0,r));const base='http://localhost:'+server.address().port;
 const J=async(m,u,body,h)=>{const r=await fetch(base+u,{method:m,headers:{'content-type':'application/json',...h},body:body?JSON.stringify(body):undefined});return{s:r.status,j:await r.json().catch(()=>({}))}};
 const login=async e=>(await J('POST','/api/login',{email:e+'@forge.demo',password:'forge-demo'},{})).j.token;
 assert.equal((await J('POST','/api/login',{email:'morgan@forge.demo',password:'bad'},{})).s,401,'bad password refused');
 assert.equal((await J('GET','/api/state?profile=t',null,{})).s,401,'sign-in required');
 const adm={authorization:'Bearer '+await login('morgan')},aud={authorization:'Bearer '+await login('audrey')},bus={authorization:'Bearer '+await login('jordan')};
 await J('POST','/api/init',{profile:'t',state:{v:1,seq:{issue:10},appetite:12,issues:[{id:'ISS-001',title:'x'}],vendors:[{id:'V-1',name:'v'}],kris:[{id:'K1',name:'k',owner:'o',red:10,amber:5,series:[1]}]}},adm);
 let r=await J('POST','/api/ops',{profile:'t',ops:[{op:'put',p:['issues'],id:'ISS-001',isNew:true,at:0,rec:{id:'ISS-001',title:'dup'}}]},adm);assert(r.j.renames['ISS-001']==='ISS-002','id collision renamed');
 r=await J('POST','/api/ops',{profile:'t',ops:[{op:'set',p:['appetite'],v:3}]},bus);assert.equal(r.j.denied,1,'business user cannot change appetite');
 r=await J('POST','/api/ops',{profile:'t',ops:[{op:'put',p:['vendors'],id:'V-1',rec:{id:'V-1',name:'h'},at:0}]},aud);assert.equal(r.j.denied,1,'auditor cannot edit vendors');
 r=await J('POST','/api/ingest/kri',{profile:'t',id:'K1',value:12},{'x-api-key':'wrong'});assert.equal(r.s,401,'ingest needs key');
 r=await J('POST','/api/ingest/kri',{profile:'t',id:'K1',value:12},{'x-api-key':'dev-ingest-key'});assert(r.j.issue_raised,'breach raises an issue');
 const au=(await J('GET','/api/audit?profile=t',null,adm)).j.rows;assert(au.some(x=>x.action==='created'&&x.coll==='issues'),'audit trail written');
 const sf=await fetch(base+'/server/server.js');assert.equal(sf.status,404,'server code is not served');
 // users, passwords, notifications, files
 r=await J('POST','/api/users',{email:'new.person@example.com',name:'New Person',role:'Function user'},bus);assert.equal(r.s,403,'only admin creates users');
 r=await J('POST','/api/users',{email:'new.person@example.com',name:'New Person',role:'Function user'},adm);assert(r.j.tempPassword,'admin creates user');const uid=r.j.id,tmp=r.j.tempPassword;
 let tk=(await J('POST','/api/login',{email:'new.person@example.com',password:tmp},{})).j;assert(tk.mustChange,'must change password');const nh={authorization:'Bearer '+tk.token};
 assert.equal((await J('GET','/api/state?profile=t',null,nh)).s,403,'blocked until password changed');
 assert.equal((await J('POST','/api/password',{current:tmp,next:'short'},nh)).s,400,'weak password refused');
 assert.equal((await J('POST','/api/password',{current:tmp,next:'Better-pass-2026'},nh)).s,200,'password changed');
 assert.equal((await J('GET','/api/state?profile=t',null,nh)).s,200,'access after change');
 r=await J('PATCH','/api/users/'+uid,{role:'Auditor'},adm);assert.equal(r.s,200,'role change');
 r=await J('PATCH','/api/users/admin',{active:false},adm);
 for(let i=0;i<5;i++)await J('POST','/api/login',{email:'sam@forge.demo',password:'nope'},{});assert.equal((await J('POST','/api/login',{email:'sam@forge.demo',password:'forge-demo'},{})).s,429,'account locks after repeated failures');
 await J('POST','/api/ops',{profile:'t',ops:[{op:'put',p:['issues'],id:'ISS-009',isNew:true,at:0,rec:{id:'ISS-009',title:'n',owner:'Priya Shah',sev:'High',due:'2026-01-01',status:'Open'}}]},adm);
 const nt=(await J('GET','/api/notifications?profile=t',null,adm)).j.rows;assert(nt.some(n=>n.kind==='assigned'&&n.who==='Priya Shah'),'assignment notification');
 server.__sweep&&0;require('./server.js').sweep();const nt2=(await J('GET','/api/notifications?profile=t',null,adm)).j.rows;assert(nt2.some(n=>n.kind==='overdue'),'overdue notification');
 // field-level merge: two people change different fields of one record
 await J('POST','/api/ops',{profile:'t',ops:[{op:'put',p:['issues'],id:'ISS-009',at:0,ch:['title'],rec:{id:'ISS-009',title:'renamed',owner:'Priya Shah',sev:'High',due:'2026-01-01',status:'Open'}}]},adm);
 await J('POST','/api/ops',{profile:'t',ops:[{op:'put',p:['issues'],id:'ISS-009',at:0,ch:['status'],rec:{id:'ISS-009',title:'n',owner:'Priya Shah',sev:'High',due:'2026-01-01',status:'In progress'}}]},adm);
 const st=(await J('GET','/api/state?profile=t',null,adm)).j.state.issues.find(i=>i.id==='ISS-009');assert(st.title==='renamed'&&st.status==='In progress','field-level merge keeps both edits');
 const up=await fetch(base+'/api/files?profile=t&ref=ISS-009&name=evidence.pdf',{method:'POST',headers:adm,body:Buffer.from('%PDF-1.4 test')});assert.equal(up.status,200,'file upload');const fid=(await up.json()).id;
 assert.equal((await fetch(base+'/api/files?profile=t&ref=ISS-009&name=x.exe',{method:'POST',headers:adm,body:Buffer.from('MZ')})).status,400,'exe refused');
 const dl=await fetch(base+'/api/files/'+fid,{headers:adm});assert.equal(Buffer.from(await dl.arrayBuffer()).toString().slice(0,5),'%PDF-','download');
 assert.equal((await fetch(base+'/api/files/'+fid)).status,401,'download needs sign-in');
 console.log('All checks passed');server.close();db.close();process.exit(0);
})().catch(e=>{console.error('FAILED:',e.message);process.exit(1)});
