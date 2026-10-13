// Country dropdown filters the built-in library; global standards always show; review panel opens on a framework.
const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});
const p=await b.newPage({viewport:{width:1440,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&!/404|favicon/.test(m.text())&&errs.push(m.text()));p.on('dialog',d=>d.accept());
const ok=(n,v,x)=>console.log(v?'PASS':'FAIL',n,x||'');
await p.goto((process.env.BASE||'http://localhost:8765')+'/index.html#bfsi');await p.evaluate(()=>localStorage.removeItem('forgeGrcJur'));await p.reload();await p.waitForTimeout(3000);
ok('jurisdiction dropdown present',!!(await p.$('#jurSwitch')));
const counts=async()=>p.evaluate(()=>GRC.jur.counts());
const all=await p.evaluate(()=>GRC_LIB&&0).catch(()=>0);
const c0=await counts();ok('default is India with global standards: '+c0.visible+' of '+c0.total,c0.visible>0&&c0.visible<=c0.total);
const names=['IN','ANZ','ME','EU','PH','US','CA','ALL'];const seen={};
for(const g of names){await p.selectOption('#jurSwitch',g);await p.waitForTimeout(250);const c=await counts();seen[g]=c.visible;
 const labelOk=await p.evaluate(()=>!!document.getElementById('jurSwitch').value);ok(g+': '+c.visible+' frameworks, '+c.obl+' requirements',c.visible>0&&labelOk)}
ok('All shows every framework',seen.ALL===(await counts()).total);
ok('regions differ',new Set(Object.values(seen)).size>3,JSON.stringify(seen));
// sub-country
await p.selectOption('#jurSwitch','ME');await p.waitForTimeout(200);const subVisible=await p.$eval('#jurSub',e=>!e.hidden);ok('Middle East shows a country list',subVisible);
// hub shows the filter
await p.selectOption('#jurSwitch','IN');await p.click('.nav button[data-view="libraries"]');await p.waitForTimeout(500);
const txt=await p.textContent('#hubTop');ok('hub shows jurisdiction summary',/India/.test(txt)&&/frameworks/.test(txt));
await p.selectOption('#jurSwitch','ALL');await p.waitForTimeout(300);
await p.evaluate(()=>GRC.openDrawer('fw','rbi-kyc'));await p.waitForTimeout(300);
const rv=await p.textContent('#revBox').catch(()=>'');ok('review panel on a framework',/content review/i.test(rv)&&/Applies to/.test(rv));
ok('no page errors',errs.length===0,JSON.stringify(errs.slice(0,3)));
await b.close()})()
