// E-signature screens in demo mode: wizard, sequential order, typed and drawn signatures, certificate, integrity check,
// tampering, decline, cancel, expiry, the Home tile, the read-first gate, the external-signer preview and accessibility basics.
const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});
const p=await b.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&!/404/.test(m.text())&&errs.push(m.text()));
const ok=(n,v,x)=>console.log(v?'PASS':'FAIL',n,x||'');
await p.goto((process.env.BASE||'http://localhost:8765')+'/index.html#bfsi');await p.waitForFunction(()=>window.GRC&&GRC.esign&&GRC.dms&&document.querySelector('.nav button[data-view="esign"]'),null,{timeout:20000});await p.waitForTimeout(500);
const gotoES=async tab=>{await p.click('.nav button[data-view="esign"]');if(tab)await p.click(`#opTabs-esign [data-tab="${tab}"]`)};
const closeDrawer=()=>p.evaluate(()=>{document.querySelector('#opDrawer [data-op=drawer-close]')?.click()});
const as=async id=>{await p.selectOption('#demoUserSwitch',id);await p.waitForTimeout(150)};
const st=id=>p.evaluate(i=>{const r=GRC.esign.req(i);return r&&{status:r.status,signers:r.signers.map(s=>s.status),events:r.events.map(e=>e.action)}},id);
const draw=async()=>{const bb=await (await p.$('#esCv')).boundingBox();await p.mouse.move(bb.x+30,bb.y+100);await p.mouse.down();for(let i=0;i<30;i++)await p.mouse.move(bb.x+30+i*12,bb.y+60+Math.sin(i/3)*35);await p.mouse.up()};
const mkReq=(doc,signers,o)=>p.evaluate(async([doc,signers,o])=>{const r=await GRC.esign.create(doc,signers,o||{});GRC.esign.send(r.id);return r.id},[doc,signers,o]);

// ---- navigation and empty state
ok('E-signature is in the DOCUMENTS & SIGNATURES group',await p.evaluate(()=>{const n=document.querySelector('.nav button[data-view="esign"]');const prev=n.parentElement.previousElementSibling;return !!n&&/DOCUMENTS/.test(prev&&prev.textContent)}));
await gotoES();
ok('three tabs and four cards',(await p.$$eval('#opTabs-esign .libtab',x=>x.map(y=>y.textContent))).join('|')==='Waiting for me|Requests|Completed'&&(await p.$$('[data-panel="esign:wait"] .op-kpi')).length===4);
ok('legal limits shown on the screen',/Aadhaar eSign/.test(await p.textContent('[data-panel="esign:wait"]')));
ok('no em dashes in the UI text',!/—/.test(await p.textContent('#view-esign')));

// ---- wizard: create from a document and send
await p.evaluate(()=>GRC.actions['esign-new']({dataset:{id:'DOC-0001'}}));await p.waitForSelector('#esw-doc');
ok('wizard preselects the document, shows the current version and the legal limits',await p.inputValue('#esw-doc')==='DOC-0001'&&/Version 1 \(current\)/.test(await p.textContent('#esw-ver'))&&/Aadhaar eSign/.test(await p.textContent('.es-back')));
ok('wizard dialog is labelled and modal',await p.evaluate(()=>{const d=document.querySelector('.es-back [role=dialog]');return d.getAttribute('aria-modal')==='true'&&!!document.getElementById(d.getAttribute('aria-labelledby'))}));
await p.click('[data-es=send]');ok('cannot send without signers',/at least one signer/i.test(await p.textContent('#esw-err')));
await p.selectOption('#esw-int','Morgan Chen');await p.click('[data-es=add-int]');await p.selectOption('#esw-int','Jordan Lee');await p.selectOption('#esw-ir','Approver');await p.click('[data-es=add-int]');
await p.click('[data-es=add-int]');ok('same person cannot be added twice',/already a signer/.test(await p.textContent('#esw-err')));
await p.fill('#esw-xn','Ann Partner');await p.fill('#esw-xe','nope');await p.click('[data-es=add-ext]');ok('bad external email refused',/valid email/.test(await p.textContent('#esw-err')));
await p.fill('#esw-xe','ann@partner.example');await p.click('[data-es=add-ext]');
ok('three signers listed, external one marked',(await p.$$eval('#esw-list [data-es=ord]',x=>x.map(i=>i.value))).join()==='1,2,3'&&/External/.test(await p.textContent('#esw-list')));
await p.click('#esw-list [aria-label="Remove Ann Partner"]');ok('signer can be removed',(await p.$$('#esw-list .es-sg')).length===2);
await p.selectOption('#esw-order','Parallel');ok('parallel hides the order boxes',(await p.$$('#esw-list [data-es=ord]')).length===0);await p.selectOption('#esw-order','Sequential');
await p.fill('#esw-msg','Please approve the code of conduct.');await p.fill('#esw-title','Approve the code of conduct');
await p.click('[data-es=send]');await p.waitForSelector('#opDrawer.show');
const r1=await p.evaluate(()=>{const r=GRC.esign.reqs()[0];return{id:r.id,status:r.status,order:r.order,n:r.signers.length,roles:r.signers.map(s=>s.role).join(),sha:r.docSha.length,title:r.title}});
ok('request created and sent',r1.id==='SIG-001'&&r1.status==='Out for signature'&&r1.order==='Sequential'&&r1.n===2&&r1.roles==='Signer,Approver'&&r1.sha===64,JSON.stringify(r1));
ok('drawer: kicker, checksum, signers, history',/Signature request · SIG-001/.test(await p.textContent('#opDK'))&&/Checksum/.test(await p.textContent('#opDB'))&&(await p.$$('#opDB .es-tl li')).length===2&&/sent/.test(await p.textContent('#opDB .es-hist')));
ok('document link opens the document drawer',await p.evaluate(()=>!!document.querySelector('#opDB [data-op=open][data-t=doc][data-id="DOC-0001"]')));
await closeDrawer();

// ---- sequential order guard (Jordan is second)
await as('jordan');
ok('Jordan has nothing waiting yet',await p.evaluate(()=>GRC.esign.waitingFor('Jordan Lee').length)===0);
const guard=await p.evaluate(()=>GRC.esign.sign('SIG-001','s2',{method:'typed',typed:'Jordan Lee',consent:true}).then(()=>'allowed',e=>e.message));
ok('out-of-turn signing refused',/not this signer.s turn/i.test(guard),guard);
ok('the Sign button is not offered out of turn',await p.evaluate(()=>{GRC.openDrawer('esreq','SIG-001');return !document.querySelector('#opDB [data-op=esign-sign]')}));
await closeDrawer();

// ---- Morgan signs typed
await as('morgan');
ok('Home tile counts one waiting signature',await p.evaluate(()=>{GRC.go('launchpad');GRC.renderAll();const n=document.querySelector('.fx-tile[data-id="t-sig"] .n');return n&&n.textContent.trim()})==='1');
await p.click('.fx-tile[data-id="t-sig"]');await p.waitForTimeout(100);
ok('tile opens the E-signature screen',await p.evaluate(()=>document.querySelector('.view.active').id)==='view-esign');
ok('nav badge shows 1',(await p.textContent('#opBadge-esign')).trim()==='1');
await p.click('[data-panel="esign:wait"] [data-op=esign-sign][data-id="SIG-001"]');await p.waitForSelector('#esGo');
ok('signing dialog: legal limits, the document and the exact consent sentence',/Aadhaar eSign/.test(await p.textContent('.es-back'))&&/Code of conduct/.test(await p.textContent('#esPrev'))&&(await p.textContent('.es-consent')).includes('I have read this document and I agree to sign it electronically.'));
await p.waitForFunction(()=>/Document viewed/.test(document.getElementById('esRead').textContent));
ok('Sign is disabled until name and consent are given',await p.isDisabled('#esGo'));
await p.fill('#esTx','Morgan');ok('partial name keeps it disabled',await p.isDisabled('#esGo'));
await p.fill('#esTx','morgan  chen');await p.check('#esCons');ok('exact name (case and spacing tolerant) enables Sign',!(await p.isDisabled('#esGo')));
ok('typed signature preview is cursive and the name is real text',await p.evaluate(()=>{const e=document.getElementById('esTp');return /cursive/.test(getComputedStyle(e).fontFamily)&&e.textContent==='morgan  chen'}));
await p.press('#esTx','Escape');ok('Escape closes only the dialog',await p.evaluate(()=>!document.querySelector('.es-back')));
await p.click('[data-panel="esign:wait"] [data-op=esign-sign][data-id="SIG-001"]');await p.waitForSelector('#esGo');await p.waitForFunction(()=>/Document viewed/.test(document.getElementById('esRead').textContent));
await p.fill('#esTx','Morgan Chen');await p.check('#esCons');await p.click('#esGo');await p.waitForFunction(()=>/Your signature is recorded/.test(document.querySelector('.es-back .es-body').textContent));
let s1=await st('SIG-001');ok('Morgan signature recorded, request still open, view recorded',s1.signers.join()==='Signed,Pending'&&s1.status==='Out for signature'&&s1.events.includes('viewed'),JSON.stringify(s1));
await p.click('.es-back [data-es=close]');

// ---- Jordan signs drawn on the canvas, completing the request
await as('jordan');
await gotoES('wait');
ok('Jordan now sees it waiting',await p.$('[data-panel="esign:wait"] [data-op=esign-sign][data-id="SIG-001"]')!==null);
await p.click('[data-panel="esign:wait"] [data-op=esign-sign][data-id="SIG-001"]');await p.waitForSelector('#esGo');
await p.check('input[name=esMode][value=drawn]');await p.check('#esCons');await p.waitForFunction(()=>/Document viewed/.test(document.getElementById('esRead').textContent));
ok('with nothing drawn Sign is disabled; the typed alternative is explained',await p.isDisabled('#esGo')&&/Prefer to type/.test(await p.textContent('#esDrawn')));
await draw();ok('drawing enables Sign',!(await p.isDisabled('#esGo')));
await p.click('[data-es=clear]');ok('Clear removes the ink',await p.isDisabled('#esGo'));
await draw();await p.click('#esGo');await p.waitForFunction(()=>/Certificate of completion/.test(document.querySelector('.es-back .es-body').textContent),null,{timeout:8000});
const done=await p.evaluate(()=>{const r=GRC.esign.req('SIG-001'),d=GRC.dms.doc(r.doc);return{status:r.status,methods:r.signers.map(s=>s.method).join(),seal:r.seal&&r.seal.sha.length,img:r.signers[1].image.length,png:/^data:image\/png;base64,/.test(r.signers[1].image),sig:d.sig&&d.sig.req,locked:!GRC.dms.canEdit(d)}});
ok('request completed with a seal; the drawn signature is a small PNG; the document is locked',done.status==='Completed'&&done.methods==='typed,drawn'&&done.seal===64&&done.png&&done.img>400&&done.img<60000&&done.sig==='SIG-001'&&done.locked,JSON.stringify(done));
ok('completion note mentions Documents',/locked in the Documents screen/.test(await p.textContent('.es-back')));
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('.es-back [data-es=cert]')]);ok('certificate downloads',/certificate-SIG-001\.html/.test(dl.suggestedFilename()));
await p.click('.es-back [data-es=close]');

// ---- Completed tab, drawer with signature appearance, verify
await gotoES('done');ok('request listed under Completed',/SIG-001/.test(await p.textContent('[data-panel="esign:done"]')));
await p.click('[data-panel="esign:done"] button.op-link[data-id="SIG-001"]');await p.waitForSelector('#opDrawer.show');
ok('typed signature is cursive text, drawn one is an image with alt text',await p.evaluate(()=>{const t=document.querySelector('#opDB .es-sig'),i=document.querySelector('#opDB img.es-sigimg');return !!t&&/cursive/.test(getComputedStyle(t).fontFamily)&&t.textContent==='Morgan Chen'&&!!i&&/Drawn signature of Jordan Lee/.test(i.alt)}));
ok('drawer offers certificate and verify',!!(await p.$('#opDB [data-op=esign-cert]'))&&!!(await p.$('#opDB [data-op=esign-verify]')));
await p.click('#opDB [data-op=esign-verify]');await p.waitForFunction(()=>/Integrity check passed/.test(document.querySelector('#opDB').textContent));
ok('integrity check passes',true);
// tamper with the stored record: typed name, then drawn image
await p.evaluate(()=>{GRC.esign.req('SIG-001').signers[0].typed='Morgan Chen X'});
await p.click('#opDB [data-op=esign-verify]');await p.waitForFunction(()=>/Integrity check FAILED/.test(document.querySelector('#opDB').textContent));
ok('an altered signature record fails with a clear problem',/signature has been altered/.test(await p.textContent('#esVerify'))&&await p.evaluate(()=>!!document.querySelector('#esVerify [role=alert]')));
await p.evaluate(()=>{const r=GRC.esign.req('SIG-001');r.signers[0].typed='Morgan Chen';r.signers[1].image=r.signers[1].image.slice(0,-6)+'AAAAAA'});
await p.click('#opDB [data-op=esign-verify]');await p.waitForFunction(()=>/Integrity check FAILED/.test(document.querySelector('#opDB').textContent));
ok('a swapped drawn image is detected',/Jordan Lee.s signature has been altered/.test(await p.textContent('#esVerify')));
await p.evaluate(()=>{GRC.esign.req('SIG-001').seal.sha='0'.repeat(64)});
await p.click('#opDB [data-op=esign-verify]');await p.waitForFunction(()=>/seal does not match/.test(document.querySelector('#opDB').textContent));
ok('a wrong seal is reported',true);
await closeDrawer();

// ---- decline path
await as('morgan');
const id2=await mkReq('DOC-0002',[{name:'Morgan Chen',role:'Signer',order:1},{name:'Jordan Lee',role:'Signer',order:2}],{title:'Info security policy sign-off'});
await p.evaluate(i=>GRC.openDrawer('esreq',i),id2);await p.waitForSelector('#opDB [data-op=esign-decline]');
await p.click('#opDB [data-op=esign-decline]');await p.fill('#opFB [name=reason]','');await p.click('#opFS');await p.waitForTimeout(150);
ok('declining needs a reason',(await st(id2)).status==='Out for signature');
await p.fill('#opFB [name=reason]','Section 4 is wrong');await p.click('#opFS');await p.waitForTimeout(200);
ok('declined: request Declined with the reason shown',(await st(id2)).status==='Declined'&&/Section 4 is wrong/.test(await p.textContent('#opDB')));
ok('declined request can no longer be signed',await p.evaluate(async i=>GRC.esign.sign(i,'s2',{method:'typed',typed:'Jordan Lee',consent:true}).then(()=>'allowed',e=>e.message),id2).then(m=>/declined|turn|for Jordan/i.test(m)));
await closeDrawer();

// ---- cancel
const id3=await mkReq('DOC-0003',[{name:'Jordan Lee',role:'Signer',order:1}],{title:'Inspection response sign-off'});
await p.evaluate(i=>GRC.openDrawer('esreq',i),id3);await p.waitForSelector('#opDB [data-op=esign-cancel]');
await p.click('#opDB [data-op=esign-remind]');await p.waitForTimeout(150);ok('reminder recorded in the history',(await st(id3)).events.includes('reminder'));
await p.click('#opDB [data-op=esign-cancel]');await p.fill('#opFB [name=reason]','Sent by mistake');await p.click('#opFS');await p.waitForTimeout(200);
ok('cancelled, with no sign or cancel buttons left',(await st(id3)).status==='Cancelled'&&!(await p.$('#opDB [data-op=esign-cancel]')));
await closeDrawer();

// ---- expiry
const id4=await mkReq('DOC-0004',[{name:'Jordan Lee',role:'Signer',order:1}],{title:'Return sign-off',due:'2026-10-13'});
await p.evaluate(i=>{GRC.esign.req(i).due='2026-10-01';GRC.renderAll()},id4);await p.waitForFunction(i=>GRC.esign.req(i).status==='Expired',id4,{timeout:4000});
ok('past the due date the request is marked Expired',(await st(id4)).events.includes('expired'));
await gotoES('all');ok('Requests tab shows all and the status filter works',await (async()=>{await p.selectOption('[data-fk="esignreq"][data-f="status"]','Expired');await p.waitForTimeout(200);const t=await p.textContent('[data-panel="esign:all"] tbody');return t.includes(id4)&&!t.includes('SIG-001')})());
await p.selectOption('[data-fk="esignreq"][data-f="status"]','All');
{const v=await p.evaluate(()=>[...document.querySelectorAll('[data-panel="esign:all"] .op-kpi .v')].map(x=>x.textContent.trim()).join());ok('cards: waiting, out, completed this month, declined or expired',v==='0,0,1,2',v)}

// ---- read-first gate with a long text document
const longId=await p.evaluate(async()=>{const d=await GRC.dms.create({title:'Long agreement',type:'Contract'},{text:Array.from({length:120},(_,i)=>`Clause ${i+1}. The parties agree to the terms set out in this clause.`).join('\n'),name:'long.txt'});return d.id});
const id5=await mkReq(longId,[{name:'Morgan Chen',role:'Signer',order:1}],{title:'Sign the long agreement'});
await p.evaluate(i=>GRC.actions['esign-sign']({dataset:{id:i}}),id5);await p.waitForSelector('#esGo');
await p.fill('#esTx','Morgan Chen');await p.check('#esCons');await p.waitForTimeout(250);
ok('long document: Sign stays disabled until the document is read',await p.isDisabled('#esGo')&&/open or scroll/.test(await p.textContent('#esNeed')));
await p.evaluate(()=>{const e=document.querySelector('.es-pre');e.scrollTop=e.scrollHeight});
await p.waitForFunction(()=>!document.getElementById('esGo').disabled,null,{timeout:3000});ok('scrolling to the end enables Sign',true);
ok('reading is recorded on the request',(await st(id5)).events.includes('viewed'));
await p.press('.es-pre','Escape');
// opening/downloading also counts
await p.evaluate(i=>GRC.actions['esign-sign']({dataset:{id:i}}),id5);await p.waitForSelector('#esGo');await p.fill('#esTx','Morgan Chen');await p.check('#esCons');
const [dl2]=await Promise.all([p.waitForEvent('download'),p.click('[data-es=dl]')]);ok('Download counts as viewing',/long\.txt/.test(dl2.suggestedFilename())&&!(await p.isDisabled('#esGo')));
await p.keyboard.press('Escape');

// ---- external signer in demo mode: explanation and preview
const id6=await mkReq('DOC-0005',[{name:'Ann Partner',email:'ann@partner.example',internal:false,role:'Signer',order:1}],{title:'Hosting agreement signature'});
await p.evaluate(i=>GRC.openDrawer('esreq',i),id6);await p.waitForSelector('#opDB [data-op=esign-preview]');
ok('demo: explains links need the server, no link button, preview offered',/need the server/i.test(await p.textContent('#opDB'))&&!(await p.$('#opDB [data-op=esign-link]')));
const linkErr=await p.evaluate(i=>GRC.esign.issueLink(i,'s1').then(()=>'ok',e=>e.message),id6);ok('core refuses to issue a link without the server',/need the server/.test(linkErr),linkErr);
await p.click('#opDB [data-op=esign-preview]');await p.waitForSelector('#esGo');
ok('preview is marked DEMO and shows the external page contents',/DEMO preview/.test(await p.textContent('.es-demo'))&&/Hosting agreement/.test(await p.textContent('.es-back')));
await p.waitForFunction(()=>/Document viewed/.test(document.getElementById('esRead').textContent));await p.fill('#esTx','Ann Partner');await p.check('#esCons');await p.click('#esGo');
await p.waitForFunction(()=>/DEMO preview/.test(document.querySelector('.es-back .es-body').textContent)&&/No signature was recorded/.test(document.querySelector('.es-back .es-body').textContent));
ok('preview signing records nothing',(await st(id6)).signers.join()==='Pending');
await p.click('.es-back [data-es=close]');await closeDrawer();

// ---- roles
await as('priya');await gotoES('all');
ok('a non-admin sees only requests they sent or must sign',await p.evaluate(()=>{const t=document.querySelector('[data-panel="esign:all"] tbody').textContent;return !/SIG-001/.test(t)}));
await as('morgan');

// ---- accessibility (axe-core, WCAG A and AA): screen, drawer, wizard and signing dialog
await p.addScriptTag({content:require('fs').readFileSync(require('path').join(__dirname,'..','node_modules','axe-core','axe.min.js'),'utf8')});
const axe=sel=>p.evaluate(async s=>{const x=await axe.run(document.querySelector(s),{runOnly:['wcag2a','wcag2aa','wcag21aa']});return x.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id+': '+v.nodes[0].html.slice(0,80))},sel);
await gotoES('all');ok('axe: E-signature screen',(await axe('#view-esign')).length===0,(await axe('#view-esign')).join(' | '));
await p.evaluate(()=>GRC.openDrawer('esreq','SIG-001'));await p.waitForTimeout(150);ok('axe: request drawer',(await axe('#opDrawer')).length===0,(await axe('#opDrawer')).join(' | '));await closeDrawer();
await p.evaluate(()=>GRC.actions['esign-new']({dataset:{id:'DOC-0001'}}));await p.waitForSelector('#esw-doc');ok('axe: request wizard',(await axe('.es-back')).length===0,(await axe('.es-back')).join(' | '));
ok('wizard keeps focus inside (Tab wraps)',await (async()=>{for(let i=0;i<40;i++)await p.keyboard.press('Tab');return p.evaluate(()=>!!document.activeElement.closest('.es-back'))})());
await p.keyboard.press('Escape');
await p.evaluate(()=>GRC.actions['esign-preview']({dataset:{id:'SIG-006',sid:'s1'}}));await p.waitForSelector('#esGo');await p.check('input[name=esMode][value=drawn]');ok('axe: signing dialog (drawn mode)',(await axe('.es-back')).length===0,(await axe('.es-back')).join(' | '));await p.keyboard.press('Escape');

// ---- linking
ok('SIG ids resolve to links',await p.evaluate(()=>/data-t="esreq"/.test(GRC.lk('SIG-001'))));
ok('page has no scripted errors',errs.length===0,errs.slice(0,3).join(' | '));
console.log('errors',errs.slice(0,4));await b.close()})()
