// Runs axe-core on the main screens and reports serious or critical problems.
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const BASE=process.env.BASE||'http://localhost:8765',AXE=fs.readFileSync(path.join(__dirname,'..','node_modules','axe-core','axe.min.js'),'utf8');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});const p=await b.newPage({viewport:{width:1400,height:1000}});
 await p.goto(BASE+'/index.html#bfsi');await p.waitForTimeout(3000);
 const views=(process.argv[2]?process.argv[2].split(','):['launchpad','overview','dashboard','risks','issues','controls','treat','intake','org','obligations']);
 const bad={};let total=0;
 for(const v of views){await p.evaluate(v=>document.querySelector(`.nav button[data-view="${v}"]`)?.click(),v);await p.waitForTimeout(400);
  await p.addScriptTag({content:AXE}).catch(()=>{});
  const r=await p.evaluate(async()=>{const x=await axe.run(document.querySelector('.view.active')||document,{runOnly:['wcag2a','wcag2aa','wcag21aa']});return x.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,help:v.help,sample:v.nodes.slice(0,2).map(n=>n.target.join(' ')+' :: '+(n.any[0]||n.all[0]||n.none[0]||{}).message)}))});
  for(const x of r){total+=x.n;(bad[x.id]=bad[x.id]||{help:x.help,impact:x.impact,n:0,views:new Set(),sample:x.sample}).n+=x.n;bad[x.id].views.add(v)}}
 for(const [id,x] of Object.entries(bad))console.log(`${x.impact.toUpperCase()} ${id}: ${x.n} node(s) in ${[...x.views].join(',')} — ${x.help}\n    e.g. ${x.sample[0]||''}`);
 console.log(Object.keys(bad).length?`FAIL ${Object.keys(bad).length} issue type(s), ${total} nodes`:'PASS no serious or critical accessibility violations');
 await b.close();process.exit(Object.keys(bad).length?1:0)})();
