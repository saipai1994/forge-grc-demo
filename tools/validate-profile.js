// Validates sector profile specs: structure, cross references and depth targets.
// Usage: node tools/validate-profile.js [sectorId ...]   (no ids = all sectors in sectors/)
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
const ctx={window:{},console,localStorage:{getItem(){return null}}};vm.createContext(ctx);
for(const f of ['regulatory-library.js','regulatory-library-industries.js','regulatory-library-sectors.js','regulatory-clauses.js','profile-kit.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const want=process.argv.slice(2),files=fs.readdirSync(path.join(root,'sectors')).filter(f=>f.endsWith('.js')&&(!want.length||want.includes(f.slice(0,-3))));
for(const f of files)vm.runInContext(fs.readFileSync(path.join(root,'sectors',f),'utf8'),ctx,{filename:'sectors/'+f});
const M=ctx.window.GRC_MORE,LIB=ctx.window.GRC_LIB,fwIds=new Set(LIB.frameworks.map(x=>x.id));
const TARGET={risks:15,controls:18,kris:10,losses:8,policies:9,vendors:8,issues:9,findings:8,evidence:12,adopt:8};
let bad=0;const rows=[];
for(const f of files){const id=f.slice(0,-3),p=M[id];const errs=[];
 if(!p){console.log('FAIL',id,'profile not defined');bad++;continue}
 let s;try{s=p.seed()}catch(e){console.log('FAIL',id,'seed() threw:',e.message);bad++;continue}
 const rid=new Set(p.risks.map(r=>r.id)),cid=new Set(s.controls.map(c=>c.id)),kid=new Set(s.kris.map(k=>k.id));
 const dupe=(a,n)=>{const seen=new Set();for(const x of a){if(seen.has(x))errs.push('duplicate '+n+' '+x);seen.add(x)}};
 dupe(p.risks.map(r=>r.id),'risk');dupe(s.controls.map(c=>c.id),'control');dupe(s.kris.map(k=>k.id),'kri');dupe(s.issues.map(i=>i.id),'issue');
 for(const r of p.risks){if(!(r.score>=1&&r.score<=25))errs.push('risk score '+r.id);if(!['Critical','High','Medium','Low'].includes(r.inherent))errs.push('inherent '+r.id+' '+r.inherent);if(!['Critical','High','Medium','Low'].includes(r.rating))errs.push('rating '+r.id)}
 for(const c of s.controls){for(const r of c.risks)if(!rid.has(r))errs.push('control '+c.id+' maps to unknown risk '+r);if(!c.lastTest||isNaN(Date.parse(c.lastTest)))errs.push('control date '+c.id)}
 for(const k of s.kris){if(!rid.has(k.risk))errs.push('kri '+k.id+' unknown risk '+k.risk);if(!Array.isArray(k.series)||k.series.length<4)errs.push('kri series '+k.id);if(!(k.red>k.amber))errs.push('kri thresholds '+k.id+' (red must exceed amber)')}
 for(const l of s.losses)if(!rid.has(l.risk))errs.push('loss '+l.id+' unknown risk '+l.risk);
 for(const v of s.vendors)for(const r of v.risks)if(!rid.has(r))errs.push('vendor '+v.id+' unknown risk '+r);
 for(const x of s.policies)for(const c of x.ctrls)if(!cid.has(c))errs.push('policy '+x.id+' unknown control '+c);
 for(const i of s.issues)if(i.link&&!(rid.has(i.link)||cid.has(i.link)||kid.has(i.link)||/^(F|EV)-/.test(i.link)))errs.push('issue '+i.id+' link '+i.link);
 for(const a of p.adopt||[])if(!fwIds.has(a))errs.push('adopt unknown framework '+a);
 const count={risks:p.risks.length,controls:s.controls.length,kris:s.kris.length,losses:s.losses.length,policies:s.policies.length,vendors:s.vendors.length,issues:s.issues.length,findings:(p.findings||[]).length,evidence:(p.evidence||[]).length,adopt:(p.adopt||[]).length};
 const obl=(p.adopt||[]).reduce((a,x)=>a+((LIB.frameworks.find(y=>y.id===x)||{}).obl||[]).length,0);
 const short=Object.keys(TARGET).filter(k=>count[k]<TARGET[k]).map(k=>k+' '+count[k]+'/'+TARGET[k]);
 rows.push({id,...count,obl,short});
 if(errs.length){bad++;console.log('FAIL',id);errs.forEach(e=>console.log('   ',e))}
}
console.log('\nsector        risks ctrl  kri loss  pol vend issue find evid adopt  obl | below target');
for(const r of rows)console.log(r.id.padEnd(13),String(r.risks).padStart(5),String(r.controls).padStart(5),String(r.kris).padStart(4),String(r.losses).padStart(4),String(r.policies).padStart(4),String(r.vendors).padStart(4),String(r.issues).padStart(5),String(r.findings).padStart(4),String(r.evidence).padStart(4),String(r.adopt).padStart(5),String(r.obl).padStart(5),'|',r.short.join(', ')||'meets target');
console.log('\ntargets (BFSI baseline):',JSON.stringify(TARGET));
if(bad){console.log(bad,'sector(s) with errors');process.exit(1)}console.log('structure OK');
