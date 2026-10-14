// Document management screens (demo mode): browse, folders, upload, drawer, versions, diff, integrity, check-out,
// legal hold, restricted documents, auditor read-only, retention, attach from a record drawer.
const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});
const p=await b.newPage({viewport:{width:1440,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message+' '+String(e.stack).split('\n').slice(1,4).join(' | ')));p.on('console',m=>m.type()==='error'&&!/404/.test(m.text())&&errs.push(m.text()));
p.on('dialog',d=>d.accept());const ok=(n,v,x)=>console.log(v?'PASS':'FAIL',n,v?'':(x||''));
const W=(fn,arg,t)=>p.waitForFunction(fn,arg,{timeout:t||8000}).then(()=>true,()=>false);
const toastIs=re=>W(r=>{const t=document.getElementById('toast');return t&&t.classList.contains('show')&&new RegExp(r,'i').test(t.textContent)},re.source||re,5000);
const tmp=require('os').tmpdir();const fs=require('fs'),path=require('path');
const f1=path.join(tmp,'dms-test-vendor-policy.txt');fs.writeFileSync(f1,'Vendor onboarding policy.\nAll vendors need a zebra-mango security review.\nOwner: procurement.');
const BASE=process.env.BASE||'http://localhost:8765';
await p.goto(BASE+'/index.html#bfsi');await p.evaluate(()=>{indexedDB.deleteDatabase('forgeGrcDms');localStorage.clear()});await p.reload();
await W(()=>window.GRC&&GRC.dms&&document.querySelector('.nav button[data-view="documents"]'),null,15000);
ok('Documents module in the nav',!!(await p.$('.nav button[data-view="documents"]')));
await p.click('.nav button[data-view="documents"]');await W(()=>document.querySelectorAll('#view-documents tbody tr[data-id]').length>=7);
ok('browse lists the seeded documents and 6 dashboard cards',(await p.$$('#view-documents tbody tr[data-id]')).length>=7&&(await p.$$('.dms-kpis .op-kpi')).length===6);
ok('folder tree has All documents and Recently modified',/All documents/.test(await p.textContent('.dms-tree'))&&/Recently modified/.test(await p.textContent('.dms-tree')));
// ---- folders
await p.click('[data-op="dms-fnew"]');await p.fill('#opFB [name=name]','Vendor files');await p.click('#opFS');
ok('folder created',await W(()=>GRC.dms.folders().some(f=>f.name==='Vendor files')));
await p.click('[data-op="dms-fnew"]');await p.fill('#opFB [name=name]','vendor files');await p.selectOption('#opFB [name=parent]','');await p.click('#opFS');
ok('duplicate folder name refused and dialog stays open',await W(()=>document.getElementById('opForm').classList.contains('show'))&&await p.evaluate(()=>GRC.dms.folders().filter(f=>/vendor files/i.test(f.name)).length)===1);
await p.click('[data-op="form-close"]');
await p.click('.dms-ti[data-id="FLD-001"]');await W(()=>document.querySelector('.dms-ti.sel')?.dataset.id==='FLD-001');
ok('folder filter shows its documents only',await p.evaluate(()=>[...document.querySelectorAll('#view-documents tbody tr[data-id]')].every(r=>GRC.dms.doc(r.dataset.id).folder==='FLD-001')));
await p.click('[data-op="dms-fdel"]');ok('folder with documents cannot be deleted',await toastIs(/Move or delete the documents/)&&await p.evaluate(()=>!!GRC.dms.folder('FLD-001')));
await p.click('.dms-ti[data-id="FLD-002"]');await W(()=>document.querySelector('.dms-ti.sel')?.dataset.id==='FLD-002');
await p.click('[data-op="dms-fdel"]');ok('folder with sub-folders cannot be deleted',await toastIs(/sub-folders/));
const vf=await p.evaluate(()=>GRC.dms.folders().find(f=>f.name==='Vendor files').id);
await p.click(`.dms-ti[data-id="${vf}"]`);await W(id=>document.querySelector('.dms-ti.sel')?.dataset.id===id,vf);
await p.click('[data-op="dms-fren"]');await p.fill('#opFB [name=name]','Vendor records');await p.click('#opFS');
ok('folder renamed',await W(()=>GRC.dms.folders().some(f=>f.name==='Vendor records')));
// ---- upload through the picker
await p.click('.dms-ti[data-id="'+vf+'"]');
await p.setInputFiles('#dmsUp',f1);await W(()=>document.getElementById('opForm').classList.contains('show'));
ok('upload dialog opens with title from file name',await p.inputValue('#opFB [name=title]')==='dms-test-vendor-policy');
await p.fill('#opFB [name=title]','Vendor onboarding policy');await p.selectOption('#opFB [name=type]','Policy');await p.fill('#opFB [name=tags]','Vendor, onboarding');await p.click('#opFS');
ok('uploaded file becomes a document in the chosen folder',await W(v=>GRC.dms.docs().some(d=>d.title==='Vendor onboarding policy'&&d.folder===v&&d.versions.length&&d.versions[0].size>50&&d.versions[0].sha.length===64),vf));
const id1=await p.evaluate(()=>GRC.dms.docs().find(d=>d.title==='Vendor onboarding policy').id);
ok('drawer opens after upload with the document kicker',await W(i=>document.getElementById('opDK')?.textContent==='Document · '+i,id1)&&/Vendor onboarding policy/.test(await p.textContent('#opDT')));
ok('text preview shows the content (escaped)',await W(()=>/zebra-mango/.test(document.getElementById('dmsPrev')?.textContent||'')));
await p.click('[data-op="drawer-close"] >> nth=-1');
// drag and drop
await p.evaluate(()=>{const dt=new DataTransfer();dt.items.add(new File(['Dropped file about quokkas.'],'dropped-note.txt',{type:'text/plain'}));document.getElementById('dmsDrop').dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}))});
ok('drop on the table opens the upload dialog',await W(()=>document.getElementById('opForm').classList.contains('show')&&document.querySelector('#opFB [name=title]')?.value==='dropped-note'));
await p.click('#opFS');ok('dropped file saved',await W(()=>GRC.dms.docs().some(d=>d.title==='dropped-note'&&d.versions.length===1)));
await W(()=>document.getElementById('opDT')?.textContent==='dropped-note'&&document.getElementById('opDrawer').classList.contains('show'));await p.click('[data-op="drawer-close"] >> nth=-1');
// new text document
await p.click('[data-op="dms-new-text"]');await p.fill('#opFB [name=title]','Incident runbook');await p.selectOption('#opFB [name=type]','Procedure');await p.fill('#opFB [name=body]','Step one: call the duty manager.\nStep two: open an incident record.');await p.click('#opFS');
ok('new text document created with text bytes',await W(()=>GRC.dms.docs().some(d=>d.title==='Incident runbook'&&d.versions.length&&d.versions[0].name==='Incident runbook.txt')));
await W(()=>document.getElementById('opDT')?.textContent==='Incident runbook'&&document.getElementById('opDrawer').classList.contains('show'));
const id2=await p.evaluate(()=>GRC.dms.docs().find(d=>d.title==='Incident runbook').id);
await p.click('[data-op="drawer-close"] >> nth=-1');
// ---- search by content and filters
await p.click('.dms-ti[data-id=""]');
await p.fill('#view-documents input.search','zebra-mango');await W(()=>document.querySelectorAll('#view-documents tbody tr[data-id]').length===1);
ok('search by content finds the uploaded document',await p.evaluate(i=>document.querySelector('#view-documents tbody tr[data-id]')?.dataset.id===i,id1)||false);
await p.fill('#view-documents input.search','');await W(()=>document.querySelectorAll('#view-documents tbody tr[data-id]').length>5);
await p.selectOption('#view-documents select[data-f="type"]','Policy');await W(()=>[...document.querySelectorAll('#view-documents tbody tr[data-id]')].every(r=>GRC.dms.doc(r.dataset.id).type==='Policy'));
ok('type filter works',(await p.$$('#view-documents tbody tr[data-id]')).length>=3);
await p.selectOption('#view-documents select[data-f="type"]','All');
await p.click('.dms-kpis [data-k="review"]');ok('dashboard card filters (in review)',await W(()=>document.querySelector('.dms-kpis [data-k="review"]').getAttribute('aria-pressed')==='true')&&await p.evaluate(()=>[...document.querySelectorAll('#view-documents tbody tr[data-id]')].every(r=>GRC.dms.doc(r.dataset.id).status==='In review')));
await p.click('.dms-kpis [data-k="all"]');
// ---- drawer, new version, diff, integrity
await p.evaluate(i=>GRC.openDrawer('doc',i),id1);await W(i=>document.getElementById('opDK')?.textContent==='Document · '+i,id1);
ok('drawer shows facts and the checksum',/SHA-256/.test(await p.textContent('#opDB'))&&await p.evaluate(()=>!!document.querySelector('#opDB .dms-sha')));
await p.click(`[data-op="dms-newver"][data-id="${id1}"]`);await p.setInputFiles('#dmsVerUp',{name:'vendor-policy-v2.txt',mimeType:'text/plain',buffer:Buffer.from('Vendor onboarding policy.\nAll vendors need a zebra-mango security review.\nOwner: procurement.\nNew line added in version two.')});
await W(()=>document.getElementById('opForm').classList.contains('show'));await p.fill('#opFB [name=note]','Added a line');await p.click('#opFS');
ok('new version saved and current',await W(i=>GRC.dms.doc(i).versions.length===2&&GRC.dms.doc(i).cur===2,id1)&&await W(()=>document.querySelectorAll('#opDB table tbody tr').length>=2));
await p.click(`[data-op="dms-cmp"][data-id="${id1}"][data-n="1"]`);
ok('text diff shows the added line with symbol and label',await W(()=>{const a=document.querySelector('#dmsDiff .dms-dl.add');return a&&/New line added in version two/.test(a.textContent)&&/Added/.test(a.textContent)&&/\+/.test(a.textContent)}));
await p.click('[data-op="dms-cmp-x"]');
await p.click(`[data-op="dms-verify"][data-id="${id1}"]:not([data-n])`);
ok('verify integrity passes and shows both checksums',await W(()=>/Integrity check passed/.test(document.getElementById('dmsVerify')?.textContent||'')&&document.querySelectorAll('#dmsVerify .dms-sha').length===2));
// edit text -> new version
await p.click(`[data-op="dms-edit-text"][data-id="${id2}"]`).catch(async()=>{await p.evaluate(i=>GRC.openDrawer('doc',i),id2);await W(i=>document.getElementById('opDK')?.textContent==='Document · '+i,id2);await p.click(`[data-op="dms-edit-text"][data-id="${id2}"]`)});
await W(()=>document.getElementById('opForm').classList.contains('show')&&/Step one/.test(document.querySelector('#opFB [name=text]').value));
await p.fill('#opFB [name=text]','Step one: call the duty manager.\nStep two: open an incident record.\nStep three: notify the regulator if required.');await p.click('#opFS');
ok('edit text saves a new version',await W(i=>GRC.dms.doc(i).versions.length===2,id2));
ok('seeded sample document verifies (bytes served from its sample text)',await p.evaluate(async()=>(await GRC.dms.verify('DOC-0001')).ok));
// ---- check-out blocks another user
await p.evaluate(i=>GRC.openDrawer('doc',i),id2);await W(i=>document.getElementById('opDK')?.textContent==='Document · '+i,id2);
await p.click('[data-op="dms-edit"]');await p.fill('#opFB [name=shared]','Jordan Lee');await p.click('#opFS');
ok('shared with Jordan',await W(i=>(GRC.dms.doc(i).shared||[]).includes('Jordan Lee'),id2));
await p.click(`[data-op="dms-out"][data-id="${id2}"]`);ok('checked out by Morgan',await W(i=>GRC.dms.doc(i).out==='Morgan Chen',id2));
await p.click('[data-op="drawer-close"] >> nth=-1');
await p.selectOption('#demoUserSwitch','jordan');await W(()=>GRC.me().name==='Jordan Lee');
await p.evaluate(i=>GRC.openDrawer('doc',i),id2);await W(i=>document.getElementById('opDK')?.textContent==='Document · '+i,id2);
ok('drawer says who has it checked out',/Checked out by Morgan Chen/.test(await p.textContent('#opDB')));
await p.click(`[data-op="dms-out"][data-id="${id2}"]`);ok('another user cannot check it out',await toastIs(/checked out by Morgan Chen/)&&await p.evaluate(i=>GRC.dms.doc(i).out==='Morgan Chen',id2));
const up=await p.evaluate(async i=>GRC.dms.addVersion(i,{text:'x'}).then(()=>'allowed',e=>e.message),id2);ok('another user cannot add a version while checked out',/Checked out by Morgan Chen/.test(up),up);
// ---- restricted document hidden from people who cannot see it
await p.click('[data-op="drawer-close"] >> nth=-1');
const rs=await p.evaluate(()=>{const d=GRC.dms.docs().find(x=>x.conf==='Restricted');return{id:d.id,title:d.title,owner:d.owner}});
await p.click('.nav button[data-view="documents"]');await W(()=>document.querySelectorAll('#view-documents tbody tr[data-id]').length>3);
const hid=await p.evaluate(r=>{const rows=[...document.querySelectorAll('#view-documents tr[data-id]')].map(x=>x.dataset.id);return{inTable:rows.includes(r.id),search:GRC.dms.search(r.title).length,total:GRC.dms.docs().filter(GRC.dms.canView).length,all:GRC.dms.docs().length,link:/data-op="open"/.test(GRC.lk(r.id)),docsFor:GRC.dms.docsFor('POL-001').some(x=>x.id===r.id)}},rs);
ok('restricted document is hidden from a user without access (table, search, counts, links)',!hid.inTable&&hid.search===0&&hid.total===hid.all-1&&!hid.link,JSON.stringify(hid));
await p.evaluate(i=>GRC.openDrawer('doc',i),rs.id);await W(()=>/not exist or you do not have access/.test(document.getElementById('opDB').textContent));
ok('opening it by id reveals nothing',!/Board risk/.test(await p.textContent('#opDB')));
await p.click('[data-op="drawer-close"] >> nth=-1');
ok('dashboard total excludes it',await p.evaluate(()=>{const c=[...document.querySelectorAll('.dms-kpis .op-kpi')][0];return +c.querySelector('.v').textContent===GRC.dms.docs().filter(GRC.dms.canView).length}));
await p.selectOption('#demoUserSwitch','morgan');await W(()=>GRC.me().name==='Morgan Chen');
// ---- legal hold blocks delete
await p.evaluate(i=>GRC.openDrawer('doc',i),id1);await W(i=>document.getElementById('opDK')?.textContent==='Document · '+i,id1);
await p.click(`[data-op="dms-hold"][data-id="${id1}"][data-on="1"]`);await p.fill('#opFB [name=reason]','Case 42 preservation');await p.click('#opFS');
ok('legal hold placed with reason',await W(i=>GRC.dms.doc(i).retention.hold,id1)&&await W(()=>/Case 42 preservation/.test(document.getElementById('opDB').textContent)));
await p.click(`[data-op="dms-del"][data-id="${id1}"]`);ok('legal hold blocks delete',await toastIs(/legal hold/)&&await p.evaluate(i=>!!GRC.dms.doc(i),id1));
const holdEdit=await p.evaluate(async i=>GRC.dms.addVersion(i,{text:'x'}).then(()=>'allowed',e=>e.message),id1);ok('legal hold blocks a new version',/legal hold/.test(holdEdit),holdEdit);
await p.click('[data-op="drawer-close"] >> nth=-1');
// ---- retention tab
await p.evaluate(i=>{const d=GRC.dms.doc(i);d.modified='2015-01-01';d.retention.years=2;GRC.commit()},id2);
await p.evaluate(i=>{const d=GRC.dms.doc(i);d.modified='2015-01-01';d.retention.years=2;GRC.commit()},'DOC-0003');
await p.click('#view-documents .libtab[data-tab="retention"]');
ok('retention tab lists a document made due',await W(i=>!!document.querySelector(`[data-panel="documents:retention"] tr[data-id="${i}"] [data-op="dms-dispose"]`),id2));
ok('legal hold list and policy summary with the Legal warning',/Case 42 preservation/.test(await p.textContent('[data-panel="documents:retention"]'))&&/Confirm retention with Legal/.test(await p.textContent('[data-panel="documents:retention"]'))&&/Regulatory filing/.test(await p.textContent('[data-panel="documents:retention"]')));
await p.evaluate(i=>{GRC.dms.doc(i).out=''},id2);
await p.click(`[data-panel="documents:retention"] [data-op="dms-dispose"][data-id="${id2}"]`);
ok('administrator disposes after confirmation',await W(i=>!GRC.dms.doc(i),id2));
// ---- activity tab
await p.click('#view-documents .libtab[data-tab="activity"]');
ok('activity lists document events',await W(()=>/Document created/.test(document.querySelector('[data-panel="documents:activity"]').textContent)&&/Document disposed/.test(document.querySelector('[data-panel="documents:activity"]').textContent)));
// ---- attach from a policy drawer
await p.click('#view-documents .libtab[data-tab="browse"]');
await p.evaluate(()=>GRC.openDrawer('policy','POL-001'));await W(()=>!!document.getElementById('dmsBox'));
ok('policy drawer has a clearly labelled managed documents section',/Documents \(managed\)/.test(await p.textContent('#dmsBox')));
await p.click('#dmsBox [data-op="dms-attach"]');await p.selectOption('#opFB [name=doc]',id1);await p.click('#opFS');
ok('document attached to the policy',await W(i=>GRC.dms.docsFor('POL-001').some(d=>d.id===i),id1)&&await W(i=>document.getElementById('dmsBox')?.textContent.includes(i),id1));
await p.click(`#dmsBox [data-op="open"][data-id="${id1}"]`);ok('attached document opens from the policy drawer',await W(i=>document.getElementById('opDK')?.textContent==='Document · '+i,id1));
ok('document drawer lists the linked policy',await W(()=>/POL-001/.test(document.getElementById('opDB').textContent)));
await p.click('[data-op="drawer-close"] >> nth=-1');
// ---- request signature without the e-sign action present
const sg=await p.evaluate(()=>!!GRC.actions['esign-new']);
if(!sg){await p.evaluate(i=>GRC.openDrawer('doc',i),id1);await W(i=>document.getElementById('opDK')?.textContent==='Document · '+i,id1);await p.click(`[data-op="dms-sign"][data-id="${id1}"]`);ok('request signature explains when e-signature is unavailable',await toastIs(/E-signature is not available yet/));await p.click('[data-op="drawer-close"] >> nth=-1')}
else ok('esign-new action is wired',true);
// ---- auditor is read only
await p.evaluate(()=>{GRC.me().role='Auditor';GRC.renderAll()});
await p.click('.nav button[data-view="documents"]');await W(()=>!document.querySelector('[data-op="dms-new-text"]'));
ok('auditor sees no upload or new-document buttons',!(await p.$('[data-op="dms-pick"]'))&&!(await p.$('[data-op="dms-new-text"]')));
const aud=await p.evaluate(async()=>({create:await GRC.dms.create({title:'x'},{text:'abc'}).then(()=>'allowed',e=>e.message),canEdit:GRC.dms.canEdit(GRC.dms.docs()[0])}));
ok('auditor cannot create or edit through the core',/read-only/.test(aud.create)&&aud.canEdit===false,JSON.stringify(aud));
await p.evaluate(i=>GRC.openDrawer('doc',i),'DOC-0001');await W(()=>document.getElementById('opDK')?.textContent==='Document · DOC-0001');
ok('auditor drawer has no edit buttons but can verify and download',!(await p.$('[data-op="dms-edit"]'))&&!(await p.$('[data-op="dms-newver"]'))&&!(await p.$('[data-op="dms-del"]'))&&!!(await p.$('[data-op="dms-verify"]'))&&!!(await p.$('[data-op="dms-dl"]')));
await p.click('[data-op="drawer-close"] >> nth=-1');
await p.evaluate(()=>{GRC.me().role='Administrator';GRC.renderAll()});
// ---- global search and blob URL hygiene
await p.click('.nav button[data-view="launchpad"]');await p.fill('#fxQ','security');ok('home search offers documents',await W(()=>/Documents/.test(document.getElementById('fxRes')?.textContent||'')&&!!document.querySelector('#fxRes [data-t="doc"]')));
ok('no page errors',errs.length===0,JSON.stringify(errs.slice(0,3)));
console.log('errors',errs.slice(0,4));await b.close()})()
