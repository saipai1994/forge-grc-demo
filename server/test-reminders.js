// Reminders in connected mode: a review reminder, an attestation reminder and an e-sign reminder recorded by the browser on
// the shared record become real notifications (bell, chat webhook, email relay). Run: node server/test-reminders.js
const os=require('os'),fs=require('fs'),path=require('path'),assert=require('assert'),http=require('http');
process.env.FORGE_DATA=fs.mkdtempSync(path.join(os.tmpdir(),'forge-rem-'));process.env.FORGE_TODAY='2026-10-12';process.env.FORGE_BACKUP='0';
(async()=>{
 const mails=[];const relay=http.createServer((q,r)=>{let b='';q.on('data',c=>b+=c);q.on('end',()=>{mails.push(JSON.parse(b));r.end('{}')})});await new Promise(r=>relay.listen(0,r));
 process.env.FORGE_MAIL_WEBHOOK='http://127.0.0.1:'+relay.address().port;
 const {server,db}=require('./server.js');await new Promise(r=>server.listen(0,r));const base='http://localhost:'+server.address().port;
 const J=async(m,u,body,h)=>{const r=await fetch(base+u,{method:m,headers:{'content-type':'application/json',...h},body:body?JSON.stringify(body):undefined});return{s:r.status,j:await r.json().catch(()=>({}))}};
 const tok={};for(const u of ['morgan','jordan','priya','evan','sam'])tok[u]={authorization:'Bearer '+(await J('POST','/api/login',{email:u+'@forge.demo',password:'forge-demo'},{})).j.token};
 let n=0;const ok=(c,m)=>{assert(c,m);n++;console.log('ok  ',m)};
 const P='rm';
 const pol={id:'POL-001',title:'Code of conduct',status:'Published',owner:'Jordan Lee',review:'2026-10-20',rem:[],camps:[{id:'POL-001-C1',ver:'1',status:'Open',due:'2026-11-01',reminders:[],people:[{name:'Priya Shah',status:'Pending'},{name:'Evan Brooks',status:'Attested'},{name:'Sam Rivera',status:'Pending'},{name:'Jordan Lee',status:'Pending'}]}]};
 const sr={id:'SIG-001',doc:'DOC-0001',ver:1,docSha:'a'.repeat(64),title:'Supplier addendum',message:'',purpose:'Approval',order:'Parallel',due:'2026-12-01',status:'Out for signature',createdBy:'Jordan Lee',created:'2026-10-01',
  signers:[{id:'s1',name:'Priya Shah',email:'priya@forge.demo',role:'Reviewer',internal:true,order:1,status:'Pending'},{id:'s2',name:'Outside Person',email:'o@example.com',role:'Counterparty',internal:false,order:2,status:'Pending'}],events:[{ts:'2026-10-01T09:00:00Z',by:'Jordan Lee',action:'sent',detail:''}]};
 await J('POST','/api/init',{profile:P,state:{v:1,seq:{},policies:[pol],esReq:[sr],dmsDocs:[],dmsFolders:[]}},tok.morgan);
 const notes=async u=>(await J('GET','/api/notifications?profile='+P,null,tok[u])).j.rows.filter(x=>x.kind==='reminder');
 const put=(u,coll,rec)=>J('POST','/api/ops',{profile:P,ops:[{op:'put',p:[coll],id:rec.id,at:0,rec}]},tok[u]);
 const tick=()=>new Promise(r=>setTimeout(r,300));

 // review reminder: an administrator reminds the owner
 let r=await put('morgan','policies',{...pol,rem:[{ts:'2026-10-12T10:00:00.000Z',by:'Morgan Chen'}]});ok(!r.j.denied,'reminder recorded on the policy');
 let nj=await notes('jordan');ok(nj.length===1&&/Review due: Code of conduct/.test(nj[0].title)&&nj[0].ref==='POL-001','the policy owner gets a review-reminder notification');
 await tick();ok(mails.some(m=>m.to==='jordan@forge.demo'&&/Review due/.test(m.subject)),'... and an email through the mail relay');
 ok((await notes('priya')).length===0,'nobody else is told');
 // someone who is neither the owner nor an administrator cannot trigger one
 await put('evan','policies',{...pol,rem:[{ts:'2026-10-12T10:00:00.000Z',by:'Morgan Chen'},{ts:'2026-10-12T10:05:00.000Z',by:'Evan Brooks'}]});
 ok((await notes('jordan')).length===1,'a bystander cannot send reminders by editing the record');
 // the owner reminding themselves creates no noise
 await put('jordan','policies',{...pol,rem:[{ts:'2026-10-12T10:00:00.000Z',by:'Morgan Chen'},{ts:'2026-10-12T10:05:00.000Z',by:'Evan Brooks'},{ts:'2026-10-12T10:09:00.000Z',by:'Jordan Lee'}]});
 ok((await notes('jordan')).length===1,'a reminder to yourself is not notified');

 // attestation reminder: only people still pending, never the sender, never names that were not pending
 const camp=(c)=>({...pol,rem:[],camps:[{...pol.camps[0],...c}]});
 const rem1={ts:'2026-10-12T11:00:00.000Z',by:'Jordan Lee',to:['Priya Shah','Sam Rivera','Evan Brooks','Jordan Lee','Nobody Here']};
 r=await put('jordan','policies',camp({reminders:[rem1]}));ok(!r.j.denied,'campaign reminder recorded');
 const np=await notes('priya'),ns=await notes('sam');
 ok(np.some(x=>/Please attest: Code of conduct/.test(x.title))&&ns.some(x=>/Please attest/.test(x.title)),'pending people are notified');
 ok(!(await notes('evan')).some(x=>/attest/.test(x.title)),'someone who already attested is not');
 ok(!(await notes('jordan')).some(x=>/attest/.test(x.title)),'the sender is not');
 await tick();ok(mails.some(m=>m.to==='priya@forge.demo'&&/Please attest/.test(m.subject)),'attestation reminders are emailed');
 const before=(await notes('priya')).length;
 await put('jordan','policies',camp({reminders:[rem1,{...rem1,ts:'2026-10-13T08:00:00.000Z'}]}));
 ok((await notes('priya')).length===before+1,'each new reminder notifies again (once)');
 await put('jordan','policies',camp({reminders:[rem1,{...rem1,ts:'2026-10-13T08:00:00.000Z'}]}));
 ok((await notes('priya')).length===before+1,'saving the same record again does not repeat it');

 // e-sign reminder: requester or administrator, pending internal signers only
 const ev={ts:'2026-10-12T12:00:00.000Z',by:'Jordan Lee',action:'reminder',detail:'Priya Shah, Outside Person'};
 r=await put('jordan','esReq',{...sr,events:[...sr.events,ev]});ok(!r.j.denied,'e-sign reminder recorded by the requester');
 const ps=await notes('priya');ok(ps.some(x=>/SIG-001 needs your signature/.test(x.title)&&x.ref==='SIG-001'),'the waiting internal signer is notified');
 await tick();ok(mails.some(m=>m.to==='priya@forge.demo'&&/SIG-001 needs your signature/.test(m.subject)),'... and emailed');
 ok(!mails.some(m=>m.to==='o@example.com'),'an outside signer is never sent anything through the account mechanism (no link is stored)');
 const cnt=(await notes('priya')).length;
 const evEvan={ts:'2026-10-12T12:30:00.000Z',by:'Evan Brooks',action:'reminder',detail:'x'};
 await put('evan','esReq',{...sr,events:[...sr.events,ev,evEvan]});
 ok((await notes('priya')).length===cnt,'a person who is not the requester or an administrator cannot send e-sign reminders');
 const adm=await put('morgan','esReq',{...sr,events:[...sr.events,ev,evEvan,{ts:'2026-10-12T13:00:00.000Z',by:'Morgan Chen',action:'reminder',detail:'x'}]});
 ok(!adm.j.denied&&(await notes('priya')).length===cnt+1,'an administrator can');
 ok((await J('GET','/api/notifications?profile='+P,null,tok.morgan)).j.rows.filter(x=>x.kind==='reminder').length>=4,'administrators see them all in the bell');

 console.log(n+' checks passed');relay.close();server.close();db.close();process.exit(0);
})().catch(e=>{console.error('FAILED:',e.stack||e.message);process.exit(1)});
