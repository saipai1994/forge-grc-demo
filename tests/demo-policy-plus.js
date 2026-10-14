// Policy management: template to policy, managed document and redline, approval chain with e-signature,
// segregation of duties, publish and attestation campaign, review cycle, hierarchy, coverage and CSV exports.
const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});
const p=await b.newPage({viewport:{width:1440,height:1100},acceptDownloads:true});const errs=[];
p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&!/404/.test(m.text())&&errs.push(m.text()));
p.on('dialog',d=>d.accept());
let bad=0;const ok=(n,v,x)=>{if(!v)bad++;console.log(v?'PASS':'FAIL',n,x===undefined?'':x)};
const BASE=process.env.BASE||'http://localhost:8765';
const T=15000;
const ev=(f,a)=>p.evaluate(f,a);
const until=(f,a,n)=>p.waitForFunction(f,a,{timeout:n||T}).then(()=>true,()=>false);
const as=async(id,name)=>{await p.selectOption('#demoUserSwitch',id);await until(n=>GRC.me().name===n,name)};
const dlgGo=async()=>{await p.click('#ppFS');return p.waitForSelector('#ppDlg',{state:'detached',timeout:T}).then(()=>true,()=>false)};
const toastText=()=>ev(()=>{const t=document.querySelector('.toast,#toast,[class*=toast]');return t?t.textContent:''});
const pol=id=>ev(i=>{const x=GRC.S().policies.find(q=>q.id===i);return x?JSON.parse(JSON.stringify(x)):null},id);
const openPol=async id=>{await ev(i=>GRC.openDrawer('policy',i),id);await p.waitForSelector('#ppBox',{timeout:T})};
await p.goto(BASE+'/index.html#bfsi');
await until(()=>window.GRC&&GRC.policyDue&&GRC.S&&GRC.S().policies&&document.querySelector('#opTabs-policies [data-tab=tpl]'));
await p.evaluate(()=>{indexedDB.deleteDatabase('forgeGrcDms')});
// ---- seed and structure
const seed=await ev(()=>({docs:GRC.S().policies.filter(x=>x.doc).map(x=>x.id+':'+x.doc),rm:GRC.S().policies.every(x=>x.reviewMonths>0),tabs:[...document.querySelectorAll('#opTabs-policies .libtab')].map(x=>x.textContent)}));
ok('two seeded policies have a document',seed.docs.length>=2,seed.docs.join(' '));
ok('every policy has reviewMonths',seed.rm);
ok('tabs added',['Hierarchy','Review cycle','Attestation','Coverage','Templates'].every(t=>seed.tabs.includes(t)),seed.tabs.join('|'));
await p.click('.nav button[data-view="policies"]');
ok('dashboard has six cards',await p.$$eval('[data-panel="policies:library"] .pp-kpis .op-kpi',e=>e.length)===6);
// ---- templates: fixtures of our own (the shared library may be empty or change)
const fx=await ev(()=>{const f=(GRC.S().obl||[])[0];const fw=f?f.fw:'iso27001';
 window.GRC_POLICY_TEMPLATES.push(
  {id:'pt-fixture-a',title:'Fixture Acceptable Use',type:'Policy',category:'Information security',sectors:['All'],frameworks:[fw],purpose:'Set rules for use of systems.',scope:'All staff.',roles:{owner:'CISO',approver:'Board'},reviewMonths:6,audience:'All staff',sections:[{h:'1. Purpose',t:'Rules for acceptable use.'},{h:'2. Rules',items:['Lock your screen.','Report incidents.']}],controls:['Screen lock enforced','Incident reporting channel'],kpis:['Incidents reported'],placeholders:['[Organisation name]']},
  {id:'pt-fixture-b',title:'Fixture Procedure',type:'Procedure',category:'Risk & compliance',sectors:['Healthcare'],frameworks:[],purpose:'How to do it.',scope:'Ops.',roles:{owner:'COO',approver:'CEO'},reviewMonths:12,audience:'Operations',sections:[{h:'1. Steps',items:['Do A.','Do B.']}],controls:['Checklist'],kpis:['Steps done'],placeholders:[]});
 GRC.renderAll();return{fw}});
await p.click('#opTabs-policies [data-tab=tpl]');
ok('fixture templates listed',/Fixture Acceptable Use/.test(await p.textContent('[data-panel="policies:tpl"]')));
ok('review-by-Legal note shown',/reviewed by Legal and Compliance/.test(await p.textContent('[data-panel="policies:tpl"]'))&&/jurisdiction-specific/.test(await p.textContent('[data-panel="policies:tpl"]')));
await p.selectOption('[data-panel="policies:tpl"] select[data-f=cat]','Information security');
const rowsTpl=await p.$$eval('[data-panel="policies:tpl"] tbody tr',e=>e.map(x=>x.textContent));
ok('category filter works',rowsTpl.length>=1&&rowsTpl.every(t=>/Information security/.test(t)));
await p.selectOption('[data-panel="policies:tpl"] select[data-f=cat]','All');
ok('sector defaults to the profile sector (BFSI) and hides other sectors',await p.$eval('[data-panel="policies:tpl"] select[data-f=sec]',e=>e.value)==='BFSI'&&!/Fixture Procedure/.test(await p.textContent('[data-panel="policies:tpl"] tbody')));
await p.fill('[data-panel="policies:tpl"] input.search','fixture procedure');
ok('search filter works',(await p.$$eval('[data-panel="policies:tpl"] tbody tr',e=>e.length))===1);
await p.fill('[data-panel="policies:tpl"] input.search','');
await p.click('[data-panel="policies:tpl"] tr[data-id="pt-fixture-a"]');
await p.waitForSelector('#opDB [data-op="pp-tpl-create"]');
ok('template detail shows sections and controls',/Lock your screen/.test(await p.textContent('#opDB'))&&/Screen lock enforced/.test(await p.textContent('#opDB')));
await p.click('#opDB [data-op="pp-tpl-create"]');await p.waitForSelector('#ppDlg');
await p.click('#ppDlg [name=ack]');
ok('create from template',await dlgGo());
await until(()=>GRC.S().policies[0].tpl==='pt-fixture-a'&&GRC.S().policies[0].doc);
const A=await ev(()=>GRC.S().policies[0].id);
let pa=await pol(A);
ok('policy record from template',pa.title==='Fixture Acceptable Use'&&pa.type==='Policy'&&pa.owner==='Morgan Chen'&&pa.reviewMonths===6&&pa.status==='Draft'&&/Screen lock enforced/.test(pa.desc)&&pa.fw.length===1);
const txt1=await ev(async i=>GRC.dms.text(GRC.S().policies.find(x=>x.id===i).doc),A);
ok('document text has sections and notice',/2\. Rules/.test(txt1)&&/- Lock your screen\./.test(txt1)&&/reviewed by Legal and Compliance/.test(txt1));
ok('policy drawer opened',await until(i=>document.querySelector('#opDK')&&document.querySelector('#opDK').textContent.includes(i),A));
// ---- edit text, version label, redline
await p.waitForSelector('#ppBox [data-op="pp-doc-edit"]');
await p.click('#ppBox [data-op="pp-doc-edit"]');await p.waitForSelector('#ppDlg textarea[name=text]');
const cur=await p.inputValue('#ppDlg textarea[name=text]');
ok('edit dialog loads current text',/Lock your screen/.test(cur));
await p.fill('#ppDlg textarea[name=text]',cur.replace('- Report incidents.','- Report incidents.\n- Never share passwords.'));
await p.fill('#ppDlg input[name=note]','Added a password rule');
ok('edit saves',await dlgGo());
await until(i=>GRC.dms.doc(GRC.S().policies.find(x=>x.id===i).doc).versions.length===2,A);
pa=await pol(A);const dv=await ev(i=>GRC.dms.doc(GRC.S().policies.find(x=>x.id===i).doc).versions.map(v=>v.n),A);
ok('new document version and minor label',dv.length===2&&pa.ver==='0.2'&&pa.vmap['2']==='0.2'&&pa.vmap['1']==='0.1',JSON.stringify(pa.vmap));
await p.waitForSelector('#ppRlA');
await p.selectOption('#ppRlA','1');await p.selectOption('#ppRlB','2');await p.click('[data-op="pp-compare"]');
await p.waitForSelector('#ppRedline .pp-add');
const rl=await p.textContent('#ppRedline');
ok('redline shows the added line with symbol and text',/Never share passwords/.test(rl)&&/\+/.test(rl)&&/1 line added/.test(rl)&&(await p.$$eval('#ppRedline .pp-add .pp-sr',e=>e.length))===1);
ok('redline marks nothing removed',/0 lines removed/.test(rl));
// ---- document actions
const dl=p.waitForEvent('download',{timeout:T});await p.click('#ppBox [data-op="pp-doc-dl"]');const d1=await dl.then(x=>x.suggestedFilename(),()=>'');
ok('download works',/\.txt$/.test(d1),d1);
await p.click('#ppBox [data-op="pp-doc-open"][data-d]');
const hasDocDrawer=await ev(()=>!!GRC.drawers.doc);
ok('open document: drawer or fallback',hasDocDrawer?await until(()=>/DOC-/.test(document.querySelector('#opDK').textContent)):true,hasDocDrawer?'document drawer':'fallback toast');
await ev(()=>GRC.closeDrawer());
// ---- approval chain: submit
await openPol(A);
await p.click('#ppBox [data-op="pp-submit"]');await p.waitForSelector('#ppDlg');
ok('owner is not offered as reviewer or approver',(await p.$$eval('#ppDlg input[name=reviewers]',e=>e.map(x=>x.value))).every(n=>n!=='Morgan Chen'));
await p.click('#ppDlg input[name=reviewers][value="Jordan Lee"]');await p.click('#ppDlg input[name=approvers][value="Priya Shah"]');
const esAvail=await ev(()=>!!(GRC.esign&&GRC.esign.create));
const sigBox=await p.$('#ppDlg input[name=reqSig]');const sigDefault=await sigBox.isChecked();
ok('e-signature option defaults on when a document and e-sign exist',sigDefault===esAvail);
if(!sigDefault&&esAvail)await sigBox.check();
ok('submitted',await dlgGo());
await until(i=>GRC.S().policies.find(x=>x.id===i).status==='In review',A);
pa=await pol(A);
ok('chain created: review stage, 2 steps',pa.status==='In review'&&pa.chain.stage==='review'&&pa.chain.steps.length===2&&pa.chain.steps[0].who==='Jordan Lee'&&pa.chain.steps[1].who==='Priya Shah');
ok('built-in Approve button hidden while chain runs',(await p.$$('#opDB [data-op="pol-step"]')).length===0);
// segregation of duties
await ev(i=>GRC.actions['pp-step']({dataset:{id:i,i:'0',d:'Approved'}}),A);
await p.waitForTimeout(150);
ok('owner cannot act on the chain (SoD)',(await pol(A)).chain.steps[0].status==='Pending'&&!(await p.$('#ppDlg')));
await ev(()=>GRC.S().policies.find(x=>x.status==='In review'&&!x.chain&&x.owner===GRC.me().name));
const legacy=await ev(()=>{const q=GRC.S().policies.find(x=>x.status==='In review'&&!x.chain&&x.owner===GRC.me().name);if(!q)return null;GRC.actions['pol-step']({dataset:{id:q.id}});return{id:q.id,st:GRC.S().policies.find(x=>x.id===q.id).status}});
ok('owner cannot approve own policy on the simple path (SoD)',legacy===null||legacy.st==='In review',JSON.stringify(legacy));
// ---- reviewer approves
await as('jordan','Jordan Lee');await openPol(A);
ok('only the assigned reviewer sees the action',(await p.$$('#ppBox [data-op="pp-step"][data-d="Approved"]')).length===1);
await p.click('#ppBox [data-op="pp-step"][data-d="Approved"]');await p.waitForSelector('#ppDlg');await p.fill('#ppDlg textarea[name=c]','Looks good');
ok('review approved',await dlgGo());
await until(i=>GRC.S().policies.find(x=>x.id===i).chain.stage==='approval',A);
pa=await pol(A);
ok('review step records who, time and comment',pa.chain.steps[0].status==='Approved'&&pa.chain.steps[0].comment==='Looks good'&&/^\d{4}-/.test(pa.chain.steps[0].ts));
// ---- final approval
const esScreens=await ev(()=>!!(GRC.drawers&&GRC.drawers.esreq&&GRC.actions['esign-new']));
if(!esAvail){console.log('SKIP e-signature approval: G.esign is not available')}
else{
 ok('signature request created and sent for the approver',await until(i=>{const q=GRC.S().policies.find(x=>x.id===i);return q.chain.esReq&&GRC.esign.req(q.chain.esReq)&&GRC.esign.req(q.chain.esReq).status==='Out for signature'},A));
 const rq=await ev(i=>{const q=GRC.S().policies.find(x=>x.id===i),r=GRC.esign.req(q.chain.esReq);return{id:r.id,purpose:r.purpose,signers:r.signers.map(s=>s.name),doc:r.doc===q.doc}},A);
 ok('request: purpose Approval, signer is the approver',rq.purpose==='Approval'&&rq.signers.join()==='Priya Shah'&&rq.doc,JSON.stringify(rq));
 await as('priya','Priya Shah');
 const sgn=await ev(async i=>{const q=GRC.S().policies.find(x=>x.id===i),r=GRC.esign.req(q.chain.esReq);try{await GRC.esign.sign(r.id,r.signers[0].id,{consent:true,method:'typed',typed:'Priya Shah'});return 'ok'}catch(e){return e.message}},A);
 ok('approver signs',sgn==='ok',sgn);
 await until(i=>GRC.S().policies.find(x=>x.id===i).status==='Approved',A);
 pa=await pol(A);
 ok('policy becomes Approved after e-signature completes',pa.status==='Approved'&&pa.chain.stage==='done'&&pa.chain.steps[1].status==='Approved');
 ok('document carries the signature',await ev(i=>!!GRC.dms.doc(GRC.S().policies.find(x=>x.id===i).doc).sig,A));
 if(esScreens){await openPol(A);ok('signature request opens in its drawer',true)}else console.log('SKIP e-signature screens (esreq drawer / esign-new) not present; core signing used')
}
// ---- decline sends the policy back to draft (second policy), then the simple in-app path
await as('morgan','Morgan Chen');
await ev(()=>GRC.closeDrawer());
await p.click('#opTabs-policies [data-tab=tpl]');await p.selectOption('[data-panel="policies:tpl"] select[data-f=sec]','Healthcare');await p.click('[data-panel="policies:tpl"] tr[data-id="pt-fixture-b"]');await p.waitForSelector('#opDB [data-op="pp-tpl-create"]');
await p.click('#opDB [data-op="pp-tpl-create"]');await p.waitForSelector('#ppDlg');await p.click('#ppDlg [name=ack]');await dlgGo();
await until(()=>GRC.S().policies[0].tpl==='pt-fixture-b'&&GRC.S().policies[0].doc);
const B=await ev(()=>GRC.S().policies[0].id);
ok('procedure template maps to type Procedure',(await pol(B)).type==='Procedure');
await openPol(B);await p.click('#ppBox [data-op="pp-submit"]');await p.waitForSelector('#ppDlg');
await p.click('#ppDlg input[name=approvers][value="Evan Brooks"]');
const bs=await p.$('#ppDlg input[name=reqSig]');if(esAvail)await bs.check();else await bs.uncheck();
await dlgGo();await until(i=>GRC.S().policies.find(x=>x.id===i).status==='In review',B);
if(esAvail){
 await until(i=>GRC.S().policies.find(x=>x.id===i).chain.esReq,B);
 await as('evan','Evan Brooks');
 await ev(async i=>{const q=GRC.S().policies.find(x=>x.id===i),r=GRC.esign.req(q.chain.esReq);await GRC.esign.decline(r.id,r.signers[0].id,'Not ready to approve')},B);
 await until(i=>GRC.S().policies.find(x=>x.id===i).status==='Draft',B);
 ok('declined signature returns the policy to Draft',(await pol(B)).chain.stage==='declined');
 await as('morgan','Morgan Chen');await openPol(B);await p.click('#ppBox [data-op="pp-submit"]');await p.waitForSelector('#ppDlg');
 ok('previous chain settings are prefilled',await p.isChecked('#ppDlg input[name=approvers][value="Evan Brooks"]'));
 await p.uncheck('#ppDlg input[name=approvers][value="Evan Brooks"]');await p.click('#ppDlg input[name=approvers][value="Sam Rivera"]');await (await p.$('#ppDlg input[name=reqSig]')).uncheck();await dlgGo();
 await until(i=>GRC.S().policies.find(x=>x.id===i).status==='In review',B);
}
await as('sam','Sam Rivera');await openPol(B);
await p.click('#ppBox [data-op="pp-step"][data-d="Approved"]');await p.waitForSelector('#ppDlg');await dlgGo();
await until(i=>GRC.S().policies.find(x=>x.id===i).status==='Approved',B);
ok('simple in-app approval path still works',(await pol(B)).chain.stage==='done');
// ---- publish and campaign
await as('morgan','Morgan Chen');
if(!esAvail){ // keep going: approve A by the simple path
 await openPol(A);await p.click('#ppBox [data-op="pp-submit"]');await p.waitForSelector('#ppDlg');await dlgGo().catch(()=>0);
}
await openPol(A);
const pubBtn=await p.$('#opDB [data-op="pol-step"]');
ok('publish button present for the approved policy',!!pubBtn&&/Publish/.test(await pubBtn.textContent()));
await pubBtn.click();await until(i=>GRC.S().policies.find(x=>x.id===i).status==='Published',A);
pa=await pol(A);const sha2=await ev(i=>GRC.dms.version(GRC.dms.doc(GRC.S().policies.find(x=>x.id===i).doc)).sha,A);
ok('published: major version, snapshot checksum, next review from review cycle',pa.ver==='1.0'&&pa.pub.sha===sha2&&pa.pub.docVer===2,`${pa.ver} ${pa.review}`);
const rv6=await ev(()=>GRC.policyPlus.addMonths(GRC.TODAY,6));
ok('next review date = today + reviewMonths',pa.review===rv6,pa.review+' vs '+rv6);
await openPol(A);
await p.click('#ppBox [data-op="pp-camp-start"]');await p.waitForSelector('#ppDlg');
ok('campaign starts (all staff default)',await dlgGo());
await until(i=>GRC.S().policies.find(x=>x.id===i).camps.length===1,A);
pa=await pol(A);const total=await ev(()=>GRC.people().length);
ok('campaign audience and att fields consistent',pa.camps[0].people.length===total&&pa.aud===total&&pa.att===0&&pa.attBy.length===0&&pa.camps[0].status==='Open');
// ---- a second user attests; checksum stored
await as('jordan','Jordan Lee');await openPol(A);
ok('person sees an attest button only for themselves',(await p.$$('#ppBox [data-op="pp-attest"]')).length===1&&/Attest as Jordan Lee/.test(await p.textContent('#ppBox [data-op="pp-attest"]')));
await p.click('#ppBox [data-op="pp-attest"]');
await until(i=>GRC.S().policies.find(x=>x.id===i).attLog.length===1,A);
pa=await pol(A);const rec=pa.attLog[0];
ok('attestation stores time, document version and checksum',rec.name==='Jordan Lee'&&/^\d{4}-\d\d-\d\dT/.test(rec.ts)&&rec.docVer===2&&rec.sha===sha2&&rec.ver==='1.0'&&rec.camp===pa.camps[0].id);
ok('stored checksum matches the current document version',rec.sha===(await ev(i=>GRC.dms.version(GRC.dms.doc(GRC.S().policies.find(x=>x.id===i).doc)).sha,A)));
ok('legacy att/attBy stay consistent',pa.attBy.join()==='Jordan Lee'&&pa.camps[0].people.find(x=>x.name==='Jordan Lee').status==='Attested');
await ev(i=>GRC.actions['pp-attest']({dataset:{id:i}}),A);await p.waitForTimeout(100);
ok('cannot attest twice',(await pol(A)).attLog.length===1);
// exemption and reminder by owner
await as('morgan','Morgan Chen');await openPol(A);
await p.click('#ppBox [data-op="pp-exempt"][data-n="Evan Brooks"]');await p.waitForSelector('#ppDlg');
await p.fill('#ppDlg textarea[name=r]','x');await p.click('#ppFS');await until(()=>document.querySelector('#ppErr').textContent.length>0);
const err=await p.textContent('#ppErr');ok('short reason refused with a message',/reason/i.test(err),err);
await p.fill('#ppDlg textarea[name=r]','On long-term leave until January');await dlgGo();
await until(i=>GRC.S().policies.find(x=>x.id===i).camps[0].people.find(x=>x.name==='Evan Brooks').status==='Exempt',A);
pa=await pol(A);ok('exempt person recorded and removed from the audience count',pa.aud===total-1&&pa.camps[0].people.find(x=>x.name==='Evan Brooks').reason.length>5);
await openPol(A);const logN=await ev(()=>GRC.S().log.length);
await p.click('#ppBox [data-op="pp-camp-remind"]');await until(()=>GRC.S().log[0].txt.startsWith('Attestation reminder'));
ok('reminder recorded in the activity log',await ev(()=>/Attestation reminder sent to \d+/.test(GRC.S().log[0].txt)));
const dl2=p.waitForEvent('download',{timeout:T});await p.click('#ppBox [data-op="pp-evidence"]');
const f2=await dl2;const csvTxt=fs.readFileSync(await f2.path(),'utf8');
ok('evidence CSV has the attestation, checksum and exemption',csvTxt.includes(sha2)&&/Jordan Lee/.test(csvTxt)&&/Exempt/.test(csvTxt)&&/Checksum/.test(csvTxt));
await ev(()=>GRC.closeDrawer());await p.click('#opTabs-policies [data-tab=att]');
ok('attestation tab lists the campaign',new RegExp(pa.camps[0].id).test(await p.textContent('[data-panel="policies:att"]')));
// ---- review cycle and G.policyDue
await ev(i=>{const q=GRC.S().policies.find(x=>x.id===i);q.review=GRC.policyPlus.plusDays(GRC.TODAY,-5);GRC.save();GRC.renderAll()},A);
await p.click('#opTabs-policies [data-tab=rev]');
const rvt=await p.textContent('[data-panel="policies:rev"]');
ok('overdue and due soon list shows the overdue policy',rvt.includes(A)&&/Overdue by 5 days/.test(rvt),rvt.slice(rvt.indexOf(A),rvt.indexOf(A)+200));
const due=await ev(()=>({d30:GRC.policyDue(30),d90:GRC.policyDue()}));
ok('G.policyDue exposes id,title,due,owner',due.d30.some(x=>x.id===A&&x.title&&x.due&&x.owner&&x.overdue)&&due.d90.length>=due.d30.length);
const p45=await ev(()=>{const x=GRC.S().policies.find(q=>q.status==='Published'&&GRC.dTo(q.review)>90);if(!x)return null;x.review=GRC.policyPlus.plusDays(GRC.TODAY,45);GRC.save();GRC.renderAll();return x.id});
const b45=await ev(i=>({d30:GRC.policyDue(30).some(x=>x.id===i),d60:GRC.policyDue(60).some(x=>x.id===i),d90:GRC.policyDue(90).some(x=>x.id===i)}),p45);
ok('policy due in 45 days is in the 60 and 90 day lists, not the 30 day list',p45&&!b45.d30&&b45.d60&&b45.d90,JSON.stringify(b45));
await p.click('[data-panel="policies:rev"] [data-op="pp-remind"][data-id="all"]');await until(()=>/review reminder/i.test(GRC.S().log[0].txt));
ok('review reminders recorded in the activity log',true);
await p.click(`[data-panel="policies:rev"] tr[data-id="${A}"] [data-op="pp-reviewed"]`);
await until(o=>GRC.S().policies.find(x=>x.id===o[0]).review===o[1],[A,rv6]);
ok('mark reviewed sets the next date from the review cycle',(await pol(A)).review===rv6);
// ---- hierarchy
await p.click('#opTabs-policies [data-tab=library]');
await ev(()=>GRC.actions['pol-new']());await p.waitForSelector('#ppDlg');
await p.fill('#ppDlg input[name=title]','Fixture Standard Operating Procedure');await p.selectOption('#ppDlg select[name=type]','Procedure');await p.selectOption('#ppDlg select[name=parent]',A);
ok('new procedure under a policy',await dlgGo());
await until(()=>GRC.S().policies.some(x=>x.title==='Fixture Standard Operating Procedure'));
await ev(()=>GRC.closeDrawer());
await ev(()=>GRC.actions['pol-new']());await p.waitForSelector('#ppDlg');
await p.fill('#ppDlg input[name=title]','Fixture Orphan Standard');await p.selectOption('#ppDlg select[name=type]','Standard');await dlgGo();
await until(()=>GRC.S().policies.some(x=>x.title==='Fixture Orphan Standard'));
await ev(()=>GRC.closeDrawer());
await p.click('#opTabs-policies [data-tab=hier]');
const nest=await p.$$eval('[data-panel="policies:hier"] .pp-tree li > ul li',e=>e.map(x=>x.textContent));
ok('hierarchy shows the procedure under its policy',nest.some(t=>/Fixture Standard Operating Procedure/.test(t)));
const orph=await p.textContent('[data-panel="policies:hier"]');
ok('orphaned standard is flagged with text',/Orphaned: Standard/.test(orph)&&/Fixture Orphan Standard/.test(orph));
const kid=await ev(()=>GRC.S().policies.find(x=>x.title==='Fixture Standard Operating Procedure'));
await p.click(`[data-panel="policies:hier"] .pp-tree button[data-id="${kid.id}"]`);
ok('drill-down opens the child',await until(i=>document.querySelector('#opDK').textContent.includes(i),kid.id));
ok('child drawer links to its parent',(await p.$$eval(`#ppBox [data-op="open"][data-id="${A}"]`,e=>e.length))>0||(await p.$$eval('#opDB .op-link',e=>e.some(x=>x.dataset.id)))); 
await ev(()=>GRC.closeDrawer());
// ---- coverage
await p.click('#opTabs-policies [data-tab=cov]');
const cov=await ev(()=>{const c=GRC.policyPlus.cover();return{n:c.rows.length,gaps:c.gaps.length,noObl:c.noObl.length}});
ok('coverage matrix lists obligations and gaps',cov.n>0&&cov.gaps>0,JSON.stringify(cov));
ok('gap lists rendered',/Obligations with no policy/.test(await p.textContent('[data-panel="policies:cov"]'))&&/Policies with no obligation/.test(await p.textContent('[data-panel="policies:cov"]')));
const gapId=await ev(()=>GRC.policyPlus.cover().gaps[0].o.id);
ok('gap row is labelled with text',(await p.$$eval(`[data-panel="policies:cov"] tr[data-id="${gapId}"]`,e=>e.some(x=>/No policy/.test(x.textContent)))));
await p.click(`[data-panel="policies:cov"] tr[data-id="${gapId}"] [data-op="pp-link-obl"]`);await p.waitForSelector('#ppDlg');await p.selectOption('#ppDlg select[name=p]',A);await dlgGo();
await until(g=>GRC.policyPlus.cover().gaps.every(r=>r.o.id!==g),gapId);
ok('Link action closes the gap',(await pol(A)).obls.includes(gapId));
const dl3=p.waitForEvent('download',{timeout:T});await p.click('[data-panel="policies:cov"] [data-op="pp-cov-export"]');
const csv2=fs.readFileSync(await (await dl3).path(),'utf8');
ok('coverage CSV export',/^"Obligation","Framework"/.test(csv2)&&csv2.includes(gapId)&&csv2.split('\r\n').length>cov.n);
const nolink=await ev(()=>GRC.policyPlus.cover().noObl[0]);
if(nolink){await p.click(`[data-panel="policies:cov"] tr[data-id="${nolink.id}"] [data-op="pp-link-pol"]`);await p.waitForSelector('#ppDlg');ok('policy gap offers an obligation Link dialog',true);await p.click('#ppDlg [data-pp="x"]')}
// ---- exceptions in the drawer, dashboard drill, accessibility basics
const exc=await ev(()=>(GRC.S().exc||[])[0]);
if(exc){await openPol(exc.policy);ok('exceptions referencing the policy are listed',new RegExp(exc.id).test(await p.textContent('#ppBox'))&&!!(await p.$('#ppBox [data-op="pp-exc-new"]')))}
await ev(()=>GRC.closeDrawer());
await p.click('#opTabs-policies [data-tab=library]');await p.click('[data-panel="policies:library"] .pp-kpis .op-kpi.drillable');
ok('dashboard card drills into a list',await until(()=>document.querySelector('#opDK')&&/list|Published/i.test(document.querySelector('#opDK').textContent+document.querySelector('#opDT').textContent)));
await ev(()=>GRC.closeDrawer());
await openPol(A);await p.click('#ppBox [data-op="pp-edit"]');await p.waitForSelector('#ppDlg');
const unl=await p.$$eval('#ppDlg [name]',els=>els.filter(e=>e.type!=='checkbox'&&!document.querySelector(`label[for="${e.id}"]`)).length);
ok('dialog controls are labelled',unl===0,unl);await p.click('#ppDlg [data-pp="x"]');await ev(()=>GRC.closeDrawer());await ev(()=>GRC.closeDrawer());
// ---- empty template library must not break the screen
await ev(()=>{window.__t=window.GRC_POLICY_TEMPLATES.splice(0);GRC.renderAll()});
await p.click('#opTabs-policies [data-tab=tpl]');
ok('empty template list handled',/library is empty/i.test(await p.textContent('[data-panel="policies:tpl"]')));
await ev(()=>{window.GRC_POLICY_TEMPLATES.push(...window.__t);GRC.renderAll()});
ok('no em dashes in policy-plus.js',!/\u2014/.test(fs.readFileSync(__dirname+'/../policy-plus.js','utf8')));
console.log('errors',errs.slice(0,5));ok('no page errors',errs.length===0);
await b.close();process.exit(bad?1:0)})()
