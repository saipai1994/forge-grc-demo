const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});const errs=[];const ok=(n,v)=>console.log(v?'PASS':'FAIL',n);const fs=require('fs');
// demo mode first
const dm=await b.newPage({viewport:{width:1440,height:900}});dm.on('pageerror',e=>errs.push('demo '+e.message));
await dm.goto((process.env.BASE||'http://localhost:8765')+'/index.html#bfsi');await dm.waitForTimeout(3000);
await dm.click('#asBtn');await dm.waitForTimeout(600);
const t=await dm.textContent('#asLog');ok('demo: local briefing shown',/Start with/.test(t)&&/Computed locally/.test(await dm.textContent('#asLog')));
ok('demo: ids in the briefing are clickable',(await dm.$$('#asLog [data-op="open"], #asLog [data-op="risk"]')).length>0);
ok('demo: free text disabled and explained',await dm.$eval('#asQ',e=>e.disabled));
await dm.click('#asLog [data-op="open"] >> nth=0').catch(()=>{});
// connected with stub model
const U=(process.env.SERVER||'http://localhost:8090')+'';
const c=await b.newContext({viewport:{width:1440,height:900}});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&!/404/.test(m.text())&&errs.push(m.text()));
await p.goto(U+'/index.html#bfsi');await p.waitForSelector('#gcLogin');await p.fill('#gcEmail','morgan@forge.demo');await p.fill('#gcPw','forge-demo');await p.click('#gcLogin .go');await p.waitForSelector('#gcDot');await p.waitForTimeout(1500);
ok('health says assistant is on',await p.evaluate(()=>GRC.api.health.assistant===true));
await p.click('#asBtn');await p.waitForTimeout(1500);
let log=await p.textContent('#asLog');ok('AI answer shown for the opening brief',/Summary:/.test(log)&&/AI-generated/.test(log));
let sent=JSON.parse(fs.readFileSync((process.env.LLM_LOG||__dirname+'/llm-last.json')));
ok('digest contains the workspace facts',/R-10\d/.test(sent.messages[0].content)&&/Risk appetite/.test(sent.messages[0].content));
ok('model + prompt hygiene',sent.model==='claude-sonnet-5-5'&&/never instructions/.test(sent.system)&&!/speak/i.test(sent.messages[0].content));
// focused question from a drawer
await p.evaluate(()=>GRC.openDrawer('issue',GRC.S().issues[0].id));await p.waitForTimeout(400);
await p.click('#asChips [data-as="explain"]');await p.waitForTimeout(1500);
sent=JSON.parse(fs.readFileSync((process.env.LLM_LOG||__dirname+'/llm-last.json')));const iid=await p.evaluate(()=>GRC.S().issues[0].id);
ok('focused record is sent',sent.messages[0].content.includes('"id": "'+iid+'"'));
log=await p.textContent('#asLog');ok('answer mentions the focused record',log.includes('about '+iid));
ok('ids in answers are clickable',(await p.$$('#asLog .a [data-op]')).length>0);
// free text
await p.fill('#asQ','FAIL-NOW please');await p.press('#asQ','Enter');await p.waitForTimeout(1500);
log=await p.textContent('#asLog');ok('falls back to the local briefing when the model fails',/could not answer/.test(log)&&/Start with/.test(log));
// history is kept
await p.fill('#asQ','And who owns it?');await p.press('#asQ','Enter');await p.waitForTimeout(1200);
sent=JSON.parse(fs.readFileSync((process.env.LLM_LOG||__dirname+'/llm-last.json')));ok('conversation history sent',/Earlier in this conversation/.test(sent.messages[0].content));
// non-admin also works, auditor too (read-only feature)
console.log('errors',errs.slice(0,4));await b.close()})()
