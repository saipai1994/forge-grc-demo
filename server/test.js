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
 console.log('All checks passed');server.close();db.close();process.exit(0);
})().catch(e=>{console.error('FAILED:',e.message);process.exit(1)});
