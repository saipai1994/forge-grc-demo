// Validates the built-in regulatory library (all regulatory-library*.js files, in load order).
// Usage: node tools/validate-library.js [jurisdiction ...]   e.g. node tools/validate-library.js AU NZ
const fs=require('fs'),vm=require('vm'),path=require('path');const root=path.join(__dirname,'..');
const ctx={window:{},console};vm.createContext(ctx);
const files=['regulatory-library.js','regulatory-library-industries.js','regulatory-library-sectors.js',...fs.readdirSync(root).filter(f=>/^regulatory-library-(?!industries|sectors)[a-z-]+\.js$/.test(f)).sort(),'regulatory-clauses.js'];
const origin={};for(const f of files){const before=(ctx.window.GRC_LIB?ctx.window.GRC_LIB.frameworks.length:0);vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});const L0=ctx.window.GRC_LIB;if(L0)for(let i=before;i<L0.frameworks.length;i++)origin[L0.frameworks[i].id]=f}
const L=ctx.window.GRC_LIB,themes=new Set(Object.keys(L.themes)),sectors=new Set(L.sectors);
const JUR=new Set(['GLOBAL','IN','AU','NZ','AE','SA','QA','BH','OM','KW','EU','UK','CH','PH','US','CA']);
const KINDS=new Set(['Law','Regulator direction','Framework','Standard']);
const want=process.argv.slice(2);let bad=0;const seen=new Set();const byJ={};
const REGIONAL=f=>/^regulatory-library-(?!industries|sectors)/.test(origin[f.id]||'');
for(const f of L.frameworks){const errs=[];const id=f.id;
 if(!/^[a-z0-9][a-z0-9-]*$/.test(id||''))errs.push('bad id');if(seen.has(id))errs.push('duplicate id');seen.add(id);
 for(const k of ['code','name','kind','region','issuer','summary'])if(!f[k]||typeof f[k]!=='string')errs.push('missing '+k);
 if(f.kind&&!KINDS.has(f.kind))errs.push('kind '+f.kind);
 if(f.jur!==undefined){if(!Array.isArray(f.jur)||!f.jur.length||f.jur.some(j=>!JUR.has(j)))errs.push('bad jur '+JSON.stringify(f.jur))}
 if(!Array.isArray(f.sectors)||!f.sectors.length)errs.push('no sectors');else for(const s of f.sectors)if(s!=='All'&&!sectors.has(s))errs.push('unknown sector '+s);
 if(!Array.isArray(f.obl)||(REGIONAL(f)&&f.obl.length<5))errs.push('needs at least 5 obligations');else f.obl.forEach((o,i)=>{if(!Array.isArray(o)||o.length!==4||o.some(x=>typeof x!=='string'||!x.trim()))errs.push('obl['+i+'] shape');else{if(!themes.has(o[3]))errs.push('obl['+i+'] theme '+o[3]);if(REGIONAL(f)&&o[2].length<40)errs.push('obl['+i+'] requirement too short')}});
 if(REGIONAL(f)&&(!f.verify||f.verify.length<20))errs.push('needs a verify note (what to confirm against the official text)');
 for(const j of (f.jur||[]))byJ[j]=(byJ[j]||0)+1;
 const inScope=!want.length||(f.jur||[]).some(j=>want.includes(j));
 if(errs.length&&inScope){bad++;console.log('FAIL',id);errs.forEach(e=>console.log('   ',e))}}
const ids=new Set(L.frameworks.map(f=>f.id));for(const pk of L.packs||[]){const e=[];if(!Array.isArray(pk)||pk.length<3)e.push('pack shape');else for(const i of pk[2])if(!ids.has(i))e.push('pack "'+pk[0]+'" unknown framework '+i);if(e.length){bad++;e.forEach(x=>console.log('FAIL',x))}}
console.log('\nframeworks',L.frameworks.length,'| with jurisdiction tag:',L.frameworks.filter(f=>f.jur).length,'| per jurisdiction:',JSON.stringify(byJ));
console.log('sectors:',[...sectors].join(' | '));console.log('themes:',[...themes].join(' '));
if(bad){console.log(bad,'framework(s) with errors');process.exit(1)}console.log('library OK');
