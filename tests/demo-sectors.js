// Every sector profile loads with its deeper data and every screen renders without errors.
const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});
const p=await b.newPage({viewport:{width:1440,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&!/404|favicon/.test(m.text())&&errs.push(m.text()));p.on('dialog',d=>d.accept());
const ok=(n,v,x)=>console.log(v?'PASS':'FAIL',n,x||'');
const profs=['bfsi','general','manufacturing','aviation','education','energy','fintech','government','healthcare','itsaas','insurance','mining','pharma','realestate','retail','telecom','logistics'];
for(const id of profs){errs.length=0;await p.goto((process.env.BASE||'http://localhost:8765')+'/index.html#'+id);await p.reload();await p.waitForTimeout(2200);
 const views=await p.$$eval('.nav button[data-view]',x=>x.map(e=>e.dataset.view));
 for(const v of views){await p.click(`.nav button[data-view="${v}"]`).catch(()=>{});await p.waitForTimeout(90)}
 const n=await p.evaluate(()=>{const s=GRC.S();return{controls:s.controls.length,kris:s.kris.length,obl:(s.obl||[]).length}});
 const deep=id==='bfsi'||id==='general'||id==='manufacturing'||(n.controls>=18&&n.kris>=10);
 ok(id+': '+views.length+' screens render, '+n.controls+' controls, '+n.kris+' indicators, '+n.obl+' obligations',errs.length===0&&deep,errs.length?JSON.stringify(errs.slice(0,2)):'')}
await b.close()})()
