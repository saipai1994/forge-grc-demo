// "Standards & data" hub: industry packs, framework browser and clause search over the built-in library.
(function(){
const G=window.GRC,LIB=window.GRC_LIB;if(!G||!LIB)return;
const P=G.P,{E,addDays,pill,toast,logIt,commit,actions,TODAY,table,bar,csv}=G;
const S=()=>G.S(),FW=id=>LIB.frameworks.find(f=>f.id===id),TH=LIB.themes;
const PACKS=[
 ['Top GRC frameworks','The most widely used GRC frameworks, plus Sarbanes-Oxley.',['iso27001','soc2','nist-csf2','cobit','coso-ic','coso-erm','iso31000','pci-dss','hipaa','gdpr','iso42001','sox']],
 ['Aviation / Aerospace','Aviation security is risk- and safety-centric, not just IT-focused. Cyber risks are often treated as safety risks.',['icao-a17','icao-a19','sms','easa','faa','do326a','iso27001','nist-csf2']],
 ['Healthcare','Healthcare frameworks emphasise patient data protection, privacy and availability of critical systems.',['hipaa','hitech','iso27799','iso27001','nist-csf2','nist-800-53']],
 ['Banking & Financial Services','Finance is driven by data confidentiality, fraud prevention and regulatory compliance.',['pci-dss','iso27001','nist-csf2','soc2','glba','rbi-csf']],
 ['India BFSI regulators','RBI, SEBI, IRDAI, FIU-IND and CERT-In requirements for banks, NBFCs, brokers and insurers, plus EU rules that reach Indian groups.',['dpdp','rbi-itgrc','rbi-outsourcing','rbi-csf','rbi-kyc','pmla','rbi-fraud','rbi-digital-lending','sebi-cscrf','sebi-cloud','sebi-lodr','irdai-cyber','certin','dora','gdpr','fatf','basel','nis2']],
 ['Industrial / OT / Manufacturing','Operational technology security focuses on availability, safety and system integrity.',['iec62443','nist-800-82','iso27001']],
 ['IT / Corporate','Used across most general-purpose IT environments.',['iso27001','nist-csf2','cis-v8','soc2']],
 ['Cloud & SaaS','Cloud security frameworks focus on shared responsibility and data protection.',['iso27017','iso27018','csa-ccm','soc2','nist-csf2']],
 ['E-Commerce & Retail','Retail security is centred on payment security and customer data protection.',['pci-dss','iso27001','soc2','gdpr']],
 ['Government & Defense','Government frameworks are control-heavy and compliance-driven.',['nist-800-53','nist-csf2','iso27001','fedramp']],
 ['Telecommunications','Telecom security emphasises network integrity and service availability.',['iso27001','nist-csf2','etsi','gsma']],
 ['Energy & Utilities','Critical infrastructure protection is the primary focus.',['nerc-cip','iec62443','nist-800-82','iso27001']],
 ['Data Privacy (cross-industry)','Privacy frameworks apply across all industries.',['gdpr','iso27701','dpdp','ccpa']]];
G.PACKS=PACKS;
const st=G.UI.hub={pack:'All',q:''};
const cl=f=>f.clauses||[],nObl=f=>f.obl.length;
const adopted=id=>(S().obl||[]).some(o=>o.fw===id),clAdopted=id=>(S().obl||[]).some(o=>o.fw===id&&o.lvl==='clause');
const nextN=()=>(S().obl||[]).reduce((m,o)=>Math.max(m,+o.id.slice(3)||0),0)+1;
const mk=(f,o,n,lvl)=>({id:'OB-'+String(n).padStart(3,'0'),fw:f.id,ref:o[0],title:o[1],req:o[2],theme:o[3],owner:(P.owners||{})[o[3]]||'Morgan Chen',status:'Not assessed',controls:[],evidence:'',last:'',next:addDays(TODAY,60),notes:'',lvl});
// ---------------------------------------------------------------- page chrome
const view=document.getElementById('view-libraries');
if(view){
 const css=document.createElement('style');css.textContent=`.hub-chips{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 12px}.hub-chip{border:1px solid #dde2e8;background:#fff;color:#425065;border-radius:14px;padding:6px 11px;font-size:10px;font-weight:600}.hub-chip:hover{border-color:#aeb8c5}.hub-chip.on{background:#19283b;border-color:#19283b;color:#fff}.hub-chip small{opacity:.6;margin-left:5px;font:500 9px 'DM Mono'}
.hub-pack{padding:14px 16px;margin-bottom:12px;display:flex;gap:14px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}.hub-pack p{margin:4px 0 0;font-size:11px;line-height:1.55;color:#526172;max-width:68ch}.hub-pack .names{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}
.hub-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:12px}.hub-card{padding:14px 15px;display:flex;flex-direction:column;gap:6px;cursor:pointer}.hub-card:hover{box-shadow:0 8px 22px #22334a1c}.hub-card h3{margin:0;font:700 13px Manrope}.hub-card .m{font-size:9.5px;color:#8a95a3}.hub-card .s{font-size:10.5px;line-height:1.55;color:#526172;flex:1}.hub-card .f{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:4px}
.hub-search{width:100%;max-width:520px;border:1px solid #dde2e8;border-radius:7px;padding:10px 12px;font-size:12px;outline:none;margin-bottom:12px}.hub-search:focus{border-color:#77b6a5;box-shadow:0 0 0 2px #dff2ec}.hub-res td{white-space:normal}.hub-count{font-size:10px;color:#8a95a3;margin:0 0 8px}`;
 document.head.appendChild(css);
 // new first tab + section
 const tabs=view.querySelector('.libtabs');
 const tab=document.createElement('button');tab.className='libtab active';tab.dataset.lib='hub';tab.textContent='Industry frameworks & clauses';tabs.prepend(tab);
 const sec=document.createElement('div');sec.className='libsection active';sec.id='lib-hub';
 sec.innerHTML='<div id="hubTop"></div><input class="hub-search" id="hubSearch" placeholder="⌕  Search every framework and clause (e.g. incident reporting, A.8.8, encryption, DORA)…"><div id="hubBody"></div>';
 const ls=view.querySelector('.libsection');ls.parentNode.insertBefore(sec,ls);
 // scoped tab switching (the original handler also toggled tabs of other modules)
 const show=name=>{view.querySelectorAll('.libtab').forEach(x=>x.classList.toggle('active',x.dataset.lib===name));view.querySelectorAll('.libsection').forEach(x=>x.classList.toggle('active',x.id==='lib-'+name));const s=document.getElementById('libSearch');s.style.display=name==='hub'?'none':'';s.value='';if(name!=='hub')try{filterLib()}catch{}};
 view.querySelectorAll('.libtab').forEach(b=>{b.onclick=()=>show(b.dataset.lib)});
 new MutationObserver(()=>{const mp=view.querySelector('.libtab[data-lib="mapping"]');if(mp&&!mp.dataset.hubBound){mp.dataset.hubBound='1';mp.onclick=()=>show('mapping')}}).observe(tabs,{childList:true});
 show('hub');
 if(P.id!=='manufacturing'){
  view.querySelectorAll('.libtab').forEach(b=>{if(b.dataset.lib!=='hub')b.style.display='none'});
  const h=view.querySelector('.title');if(h)h.textContent='Standards & data';
  const sub=view.querySelector('.subtitle');if(sub)sub.textContent='The built-in library of laws, regulator directions and standards by industry, down to clause and control level. Adopt what applies to you.';
  const ln=view.querySelector('.libnotice');if(ln)ln.innerHTML='<b>Applicability matters.</b> Summaries are plain-language planning aids, not legal text or a certification claim. Confirm applicability, current editions, dates and obligations with your legal and compliance team.';
  const bp=view.querySelector('.head-actions .badgepill');if(bp)bp.textContent='BUILT-IN LIBRARY · REVIEW APPLICABILITY';
 }else{
  const sub=view.querySelector('.subtitle');if(sub)sub.textContent='Reusable reference catalogs for governance, compliance and ESG reporting, plus the industry framework and clause library.';
 }
}
// ---------------------------------------------------------------- rendering
const inPack=f=>st.pack==='All'||(PACKS.find(p=>p[0]===st.pack)||[,,[]])[2].includes(f.id);
function renderHub(){
 const top=document.getElementById('hubTop'),body=document.getElementById('hubBody');if(!top||!body)return;
 const totalC=LIB.frameworks.reduce((n,f)=>n+cl(f).length+nObl(f),0);
 top.innerHTML=`<p class="hub-count" style="margin-top:0">${LIB.frameworks.length} frameworks · ${LIB.frameworks.reduce((n,f)=>n+nObl(f),0)} key requirements · ${LIB.frameworks.reduce((n,f)=>n+cl(f).length,0)} clause-level entries (ISO 27001, SOC 2, COBIT, COSO, ISO 31000, ISO 42001, GDPR, HIPAA, PCI DSS). Choose an industry, then open or adopt.</p><div class="hub-chips"><button class="hub-chip${st.pack==='All'?' on':''}" data-op="hub-pack" data-p="All">All industries<small>${LIB.frameworks.length}</small></button>${PACKS.map(p=>`<button class="hub-chip${st.pack===p[0]?' on':''}" data-op="hub-pack" data-p="${E(p[0])}">${E(p[0])}<small>${p[2].length}</small></button>`).join('')}</div>`;
 const pk=PACKS.find(p=>p[0]===st.pack),q=st.q.trim().toLowerCase();
 let html='';
 if(pk){const fs=pk[2].map(FW).filter(Boolean),un=fs.filter(f=>!adopted(f.id)),reqs=un.reduce((n,f)=>n+nObl(f),0);html+=`<article class="card hub-pack"><div><div class="panel-title">${E(pk[0])} pack</div><p>${E(pk[1])}</p><div class="names">${fs.map(f=>`<button class="op-link" data-op="open" data-t="fw" data-id="${f.id}">${E(f.code)}</button>`).join('')}</div></div><div style="display:flex;gap:8px;flex-direction:column;align-items:flex-end"><button class="op-mini p" data-op="pack-adopt" data-p="${E(pk[0])}"${un.length?'':' disabled'}>${un.length?`Adopt pack · ${un.length} framework${un.length>1?'s':''}, ${reqs} requirements`:'Pack fully adopted'}</button><button class="op-mini" data-op="pack-export" data-p="${E(pk[0])}">↓ Export pack requirements</button></div></article>`}
 if(q.length>=2){
  const fs=LIB.frameworks.filter(f=>inPack(f)&&[f.code,f.name,f.summary,f.issuer,f.region].join(' ').toLowerCase().includes(q));
  const rows=[];LIB.frameworks.filter(inPack).forEach(f=>{[...f.obl.map((o,i)=>[o,i,'o']),...cl(f).map((o,i)=>[o,i,'c'])].forEach(([o,i,k])=>{if([o[0],o[1],o[2]].join(' ').toLowerCase().includes(q))rows.push([f,o,i,k])})});
  html+=`<p class="hub-count">${fs.length} framework(s) and ${rows.length} clause / requirement match${rows.length===1?'':'es'} for “${E(st.q)}”${rows.length>120?' (showing 120)':''}</p>`;
  if(fs.length)html+=`<div class="hub-grid" style="margin-bottom:14px">${fs.map(cardHtml).join('')}</div>`;
  html+=rows.length?`<article class="card tablepanel hub-res">${table(['Framework','Ref','Clause / requirement','Theme'],rows.slice(0,120).map(([f,o,i,k])=>`<tr data-op="open" data-t="clause" data-id="${f.id}|${k}|${i}"><td><span class="badgepill pill-blue">${E(f.code)}</span></td><td class="riskid">${E(o[0])}</td><td><div class="riskname">${E(o[1])}</div><div class="riskarea" style="white-space:normal">${E(o[2].length>150?o[2].slice(0,148)+'…':o[2])}</div></td><td>${E(TH[o[3]]||'')}</td></tr>`),'No matches.')}</article>`:'';
 }else{html+=`<div class="hub-grid">${LIB.frameworks.filter(inPack).map(cardHtml).join('')}</div>`}
 body.innerHTML=html;
}
function cardHtml(f){const a=adopted(f.id),mine=(S().obl||[]).filter(o=>o.fw===f.id),cp=mine.length?Math.round(mine.filter(o=>o.status==='Compliant').length/mine.length*100):0;
 return `<article class="card hub-card" data-op="open" data-t="fw" data-id="${f.id}"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><h3>${E(f.code)}</h3>${a?pill('Adopted','green'):''}</div><div class="m">${E(f.kind)} · ${E(f.region)} · ${E(f.issuer)}</div><div class="s">${E(f.summary)}</div>${a?`<div>${bar(cp,cp>=85?'':cp>=60?'amber':'red')}<div class="op-note" style="margin-top:3px">${cp}% compliant · ${mine.length} obligations</div></div>`:''}<div class="f"><span class="badgepill pill-blue">${nObl(f)} key requirements</span>${cl(f).length?`<span class="badgepill pill-green">${cl(f).length} clauses</span>`:''}</div></article>`}
G.renders.push(renderHub);
document.addEventListener('input',e=>{if(e.target.id==='hubSearch'){st.q=e.target.value;renderHub()}});
// ---------------------------------------------------------------- drawers (replace the basic framework drawer)
G.drawers.fw=id=>{const f=FW(id);if(!f)return;const mine=(S().obl||[]).filter(o=>o.fw===id),a=mine.length>0,ca=clAdopted(id);
 const pks=PACKS.filter(p=>p[2].includes(id)).map(p=>p[0]);
 const tbl=(rows,kind)=>table(['Ref','Requirement','Theme',a?'Status':''],rows.map((o,i)=>{const m=mine.find(x=>x.ref===o[0]&&x.title===o[1]);return `<tr data-op="open" data-t="clause" data-id="${f.id}|${kind}|${i}"><td class="riskid" style="white-space:normal">${E(o[0])}</td><td style="white-space:normal"><div class="riskname">${E(o[1])}</div><div class="riskarea" style="white-space:normal;line-height:1.5">${E(o[2])}</div></td><td style="white-space:normal">${E(TH[o[3]]||'')}</td><td>${m?pill(m.status,{Compliant:'green','Partially compliant':'amber','Non-compliant':'red'}[m.status]||'blue'):''}</td></tr>`}));
 G.setDrawer(f.kind+' · '+f.region,f.code,`<p style="font-size:11px;line-height:1.6;color:#475569;margin-top:0">${E(f.name)}<br>${E(f.summary)}</p>${pks.length?`<p class="op-note">Included in: ${pks.map(E).join(' · ')}</p>`:''}${f.verify?`<div class="op-banner amber"><div><b>Verify before relying on this</b><div>${E(f.verify)}</div></div></div>`:''}
 <div class="op-btns">${a?'':`<button class="op-mini p" data-op="obl-adopt-lvl" data-fw="${f.id}" data-lvl="summary">Adopt ${nObl(f)} key requirements</button>`}${cl(f).length&&!ca?`<button class="op-mini${a?' p':''}" data-op="obl-adopt-lvl" data-fw="${f.id}" data-lvl="clause">Adopt ${cl(f).length} clauses${a?' as well':''}</button>`:''}<button class="op-mini" data-op="fw-export" data-id="${f.id}">↓ Export</button></div>
 <h4>Key requirements (${nObl(f)})</h4>${tbl(f.obl,'o')}${cl(f).length?`<h4>Clause-level detail (${cl(f).length})</h4>${tbl(cl(f),'c')}`:''}`)};
G.drawers.clause=id=>{const [fid,k,i]=id.split('|'),f=FW(fid);if(!f)return;const o=(k==='c'?cl(f):f.obl)[+i];if(!o)return;
 const mine=(S().obl||[]).find(x=>x.fw===fid&&x.ref===o[0]&&x.title===o[1]);
 const sib=LIB.frameworks.filter(x=>x.id!==fid).flatMap(x=>[...x.obl,...cl(x)].filter(y=>y[3]===o[3]).slice(0,2).map(y=>[x,y])).slice(0,10);
 G.detail({kicker:`${f.code} · ${o[0]}`,title:o[1],pending:mine?(mine.status==='Compliant'?[]:[['amber',`In your register as <b>${E(mine.status.toLowerCase())}</b>.`]]):[['amber','Not yet in your obligations register.']],ok:'Adopted and compliant.',
  todo:mine?['Assess, map controls and attach evidence in the obligation record.']:['Adopt this framework (or its clauses) to start tracking this requirement.','Assign an owner and map a control that meets it.'],
  facts:[['Framework',E(f.code)],['Reference',E(o[0])],['Theme',E(TH[o[3]]||'')],['Issuer',E(f.issuer)]],buttons:mine?`<button class="op-mini p" data-op="open" data-t="obligation" data-id="${mine.id}">Open obligation ${mine.id}</button>`:`<button class="op-mini p" data-op="obl-adopt-lvl" data-fw="${f.id}" data-lvl="${k==='c'?'clause':'summary'}">Adopt ${E(f.code)}${k==='c'?' clauses':''}</button>`,
  extra:`<h4>What it requires</h4><p class="op-note" style="font-size:11px;color:#475569;margin-top:0">${E(o[2])}</p>${f.verify?`<p class="op-note">⚠ ${E(f.verify)}</p>`:''}<h4>Same theme in other frameworks (${E(TH[o[3]]||'')})</h4>${sib.length?sib.map(([x,y])=>`<div class="op-li"><div><button class="op-link" data-op="open" data-t="fw" data-id="${x.id}">${E(x.code)}</button> <b>${E(y[0])}</b> · ${E(y[1])}</div></div>`).join(''):'<p class="op-note">None.</p>'}`,links:mine?mine.controls:[]})};
// ---------------------------------------------------------------- actions
function adoptOne(f,lvl){const s=S();if(!s.obl)s.obl=[];const rows=lvl==='clause'?cl(f):f.obl;if(lvl==='clause'&&clAdopted(f.id))return 0;if(lvl!=='clause'&&adopted(f.id))return 0;let n=nextN();rows.forEach(o=>{if(s.obl.some(x=>x.fw===f.id&&x.ref===o[0]&&x.title===o[1]))return;s.obl.push(mk(f,o,n++,lvl==='clause'?'clause':'summary'))});return rows.length}
Object.assign(actions,{
 'hub-pack':b=>{st.pack=b.dataset.p;renderHub()},
 'obl-adopt-lvl':b=>{const f=FW(b.dataset.fw),n=adoptOne(f,b.dataset.lvl);if(!n){toast('Already adopted.');return}logIt(f.id,`Adopted ${f.code} (${b.dataset.lvl==='clause'?'clause level':'key requirements'}).`);commit();toast(`${f.code}: ${n} obligations added. Open Obligations to assess them.`)},
 'pack-adopt':b=>{const pk=PACKS.find(p=>p[0]===b.dataset.p);let n=0,fw=0;pk[2].map(FW).filter(Boolean).forEach(f=>{const c=adoptOne(f,'summary');if(c){n+=c;fw++}});logIt('PACK',`Adopted pack: ${pk[0]}`);commit();toast(`${pk[0]}: ${fw} framework(s), ${n} obligations added to your register.`)},
 'pack-export':b=>{const pk=PACKS.find(p=>p[0]===b.dataset.p);csv('forge-pack-'+pk[0].toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.csv',[['Framework','Reference','Requirement','Detail','Theme'],...pk[2].map(FW).filter(Boolean).flatMap(f=>[...f.obl,...cl(f)].map(o=>[f.code,o[0],o[1],o[2],TH[o[3]]]))],pk[0]+' pack exported.')},
 'obl-tab':()=>{G.go('libraries');G.renderAll()}
});
// "Adopt framework" in the obligations module sends people here
G.renderAll();
})();
