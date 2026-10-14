// Validates policy-templates.js against the built-in regulatory library.
// Usage: node tools/validate-policy-templates.js
const fs=require('fs'),vm=require('vm'),path=require('path');const root=path.join(__dirname,'..');
const ctx={window:{},console};vm.createContext(ctx);
const libFiles=['regulatory-library.js','regulatory-library-industries.js','regulatory-library-sectors.js',...fs.readdirSync(root).filter(f=>/^regulatory-library-(?!industries|sectors)[a-z-]+\.js$/.test(f)).sort(),'regulatory-clauses.js'];
for(const f of libFiles)vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
vm.runInContext(fs.readFileSync(path.join(root,'policy-templates.js'),'utf8'),ctx,{filename:'policy-templates.js'});
const L=ctx.window.GRC_LIB,T=ctx.window.GRC_POLICY_TEMPLATES;
const fwIds=new Set(L.frameworks.map(f=>f.id)),themes=new Set(Object.keys(L.themes)),sectors=new Set(L.sectors);
const TYPES=new Set(['Policy','Standard','Procedure','Charter']);
const CATS=['Governance & ethics','Risk & compliance','Information security','Privacy & data','Third parties','Resilience','Financial crime','People & safety','Technology & AI','Records'];
const errors=[],warns=[];const E=(id,m)=>errors.push(id+': '+m),W=(id,m)=>warns.push(id+': '+m);
if(!Array.isArray(T)){console.log('GRC_POLICY_TEMPLATES missing or not an array');process.exit(1)}
const seen=new Set(),words=s=>(String(s).match(/\S+/g)||[]).length;
const str=v=>typeof v==='string'&&v.trim().length>0;
const RISKY=/Art\.|Section [0-9]|s\.[0-9]|%|₹|USD|\$/g,DASH=/[–—]/;
for(const t of T){const id=t.id||'(no id)';
 if(!/^pt-[a-z0-9]+(-[a-z0-9]+)*$/.test(t.id||''))E(id,'bad id');if(seen.has(t.id))E(id,'duplicate id');seen.add(t.id);
 for(const k of ['title','purpose','scope','audience'])if(!str(t[k]))E(id,'missing '+k);
 if(!TYPES.has(t.type))E(id,'bad type '+t.type);
 if(!CATS.includes(t.category))E(id,'bad category '+t.category);
 if(!Array.isArray(t.sectors)||!t.sectors.length)E(id,'no sectors');else{if(t.sectors.includes('All')&&t.sectors.length>1)E(id,"'All' mixed with named sectors");for(const s of t.sectors)if(s!=='All'&&!sectors.has(s))E(id,'unknown sector '+s)}
 if(!Array.isArray(t.themes)||!t.themes.length)E(id,'no themes');else for(const x of t.themes)if(!themes.has(x))E(id,'bad theme '+x);
 if(!Array.isArray(t.frameworks)||!t.frameworks.length)E(id,'no frameworks');else for(const f of t.frameworks)if(!fwIds.has(f))E(id,'unknown framework '+f);
 if(!t.roles||!str(t.roles.owner)||!str(t.roles.approver))E(id,'roles.owner/approver missing');
 if(![6,12,24,36].includes(t.reviewMonths))E(id,'reviewMonths should be 6, 12, 24 or 36');
 const S=t.sections;let wc=0;
 if(!Array.isArray(S)||S.length<6||S.length>10)E(id,'sections must be 6 to 10 (got '+(S&&S.length)+')');
 else S.forEach((s,i)=>{if(!str(s.h))E(id,'section '+i+' no heading');const hasT=str(s.t),hasI=Array.isArray(s.items)&&s.items.length&&s.items.every(str);if(hasT===hasI)E(id,'section '+i+' needs exactly one of non-empty t or items');wc+=words(s.h)+(hasT?words(s.t):0)+(hasI?s.items.reduce((a,b)=>a+words(b),0):0)});
 if(wc<300||wc>900)E(id,'word count '+wc+' outside 300-900');else if(wc<350||wc>800)W(id,'word count '+wc+' outside 350-800 target');
 if(!Array.isArray(t.controls)||t.controls.length<6||t.controls.length>10||!t.controls.every(str))E(id,'controls must be 6 to 10 non-empty (got '+(t.controls&&t.controls.length)+')');
 if(!Array.isArray(t.kpis)||t.kpis.length<3||t.kpis.length>5||!t.kpis.every(str))E(id,'kpis must be 3 to 5 non-empty');
 if(!Array.isArray(t.placeholders)||!t.placeholders.length||!t.placeholders.every(p=>/^\[.+\]$/.test(p)))E(id,'placeholders must be bracketed strings');
 const all=JSON.stringify([t.title,t.purpose,t.scope,t.sections,t.controls,t.kpis]);
 const hits=all.match(RISKY);if(hits)W(id,'review pattern(s): '+[...new Set(hits)].join(' '));
 if(DASH.test(all))E(id,'contains en/em dash');
 if(/\bsection\s+\d|\barticle\s+\d/i.test(all))W(id,'possible statutory citation');
}
console.log('Templates:',T.length,T.length<32||T.length>40?'(target 32 to 40)':'');
const byCat={},byType={};for(const t of T){byCat[t.category]=(byCat[t.category]||0)+1;byType[t.type]=(byType[t.type]||0)+1}
console.log('\nCategory'.padEnd(26)+'Count');for(const c of CATS)console.log(c.padEnd(25)+(byCat[c]||0));
console.log('\nBy type:',JSON.stringify(byType));
if(T.length<32||T.length>40)errors.push('template count '+T.length+' outside 32-40');
for(const c of CATS)if(!byCat[c])errors.push('no templates in category '+c);
if(warns.length){console.log('\nWARNINGS (review):');warns.forEach(w=>console.log('  '+w))}
if(errors.length){console.log('\nERRORS:');errors.forEach(e=>console.log('  '+e));process.exit(1)}
console.log('\npolicy templates OK');
