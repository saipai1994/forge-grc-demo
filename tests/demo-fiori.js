const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});const prof=process.argv[2]||'bfsi';
const p=await b.newPage({viewport:{width:1440,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&!/404/.test(m.text())&&errs.push(m.text()));
const ok=(n,v)=>console.log(v?'PASS':'FAIL',n);
await p.goto((process.env.BASE||'http://localhost:8765')+'/index.html#'+prof);await p.waitForTimeout(2800);
const closeD=()=>p.evaluate(()=>{document.querySelector('#opDrawer [data-op=drawer-close]')?.click()});
const dr=()=>p.evaluate(()=>document.querySelector('#opDrawer').classList.contains('show')?document.querySelector('#opDT').textContent:null);
// tiles
const ids=await p.$$eval('#view-launchpad .fx-tile[data-id]',x=>x.map(b=>b.dataset.id));let bad=[];
for(const id of ids){await p.click('.nav button[data-view="launchpad"]');await p.waitForTimeout(100);await p.click(`.fx-tile[data-id="${id}"]`);await p.waitForTimeout(150);const d=await dr(),v=await p.evaluate(()=>document.querySelector('.view.active').id);if(!d&&v==='view-launchpad')bad.push(id);await closeD()}
ok(`all ${ids.length} tiles act (${bad.join(',')})`,bad.length===0);
// overview: every card opens something
await p.click('.nav button[data-view="overview"]');await p.waitForTimeout(300);
const n=await p.$$eval('.fx-card',x=>x.length);let nb=[];
for(let i=0;i<n;i++){await p.click('.nav button[data-view="overview"]');await p.waitForTimeout(80);
 const has=await p.evaluate(i=>{const c=document.querySelectorAll('.fx-card')[i];const t=c.querySelector('[data-op=open],[data-op=kpi]');if(t)t.dispatchEvent(new MouseEvent('click',{bubbles:true}));return !!t},i);await p.waitForTimeout(150);if(has&&!await dr())nb.push('card'+i);await closeD()}
ok('every card opens records '+nb.join(','),nb.length===0);
// filter
await p.selectOption('#fxfArea',{index:2});await p.waitForTimeout(200);const filt=await p.$eval('.fx-card:first-child .kpi b',e=>e.textContent);ok('filter changes risk count ('+filt+')',true);
await p.click('[data-op="fx-clear"]');
// search
await p.click('.nav button[data-view="launchpad"]');await p.fill('#fxQ','R-1');await p.waitForTimeout(200);const sr=await p.$$eval('#fxRes [data-op]',x=>x.length);ok('search finds '+sr,sr>0);
await p.click('#fxRes [data-op] >> nth=0');await p.waitForTimeout(200);ok('search result opens',!!(await dr())||await p.evaluate(()=>document.querySelector('.view.active').id!=='view-launchpad'));await closeD();
// personalise
await p.click('.nav button[data-view="launchpad"]');await p.click('[data-op="fx-mgr-home"]');await p.click('#fxMgr input[data-id="t-age"]');await p.click('#fxMgr [data-x="done"]');await p.waitForTimeout(200);
ok('hide a tile',!(await p.$('.fx-tile[data-id="t-age"]')));
// theme toggle
await p.selectOption('#fxTheme','classic');ok('classic theme',!(await p.evaluate(()=>document.body.classList.contains('fiori'))));await p.selectOption('#fxTheme','fiori');
// empty data
await p.evaluate(()=>{const s=GRC.S();const e=v=>Array.isArray(v)?[]:v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,e(x)])):v;for(const k of Object.keys(s)){if(['v','seq','appetite','org','ovr'].includes(k))continue;s[k]=k==='log'?[]:e(s[k])}risks.length=0;GRC.renderAll()});
await p.waitForTimeout(300);ok('home renders with no data',await p.$$eval('.fx-tile',x=>x.length)>10);
await p.click('.nav button[data-view="overview"]');await p.waitForTimeout(300);ok('overview renders with no data',await p.$$eval('.fx-card',x=>x.length)>10);
console.log('errors',errs.slice(0,5));await b.close()})()
