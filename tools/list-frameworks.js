// Lists the built-in regulatory library: id | code | kind | region | obligations. Usage: node tools/list-frameworks.js [filter]
const fs=require('fs'),vm=require('vm'),path=require('path');const ctx={window:{},console};vm.createContext(ctx);
for(const f of ['regulatory-library.js','regulatory-library-industries.js','regulatory-library-sectors.js','regulatory-clauses.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ctx);
const q=(process.argv[2]||'').toLowerCase();
for(const f of ctx.window.GRC_LIB.frameworks){const line=[f.id,f.code,f.kind,f.region,(f.obl||[]).length+' obl','sectors: '+(f.sectors||[]).join(', ')].join(' | ');if(!q||line.toLowerCase().includes(q))console.log(line)}
