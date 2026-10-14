// Document management screens: browse (folders, search, upload), document drawer (versions, preview, diff, integrity,
// check-out, retention, legal hold, signatures, links, audit), retention and holds, activity, and the "Documents"
// section on every other record drawer. All rules (who may do what) live in dms-core.js; this file only shows them
// and turns the core's error messages into toasts.
(function(){const G=window.GRC;if(!G||!G.dms)return;
const D=G.dms;
const {E,fmt,pill,own,table,card,kpi,TODAY,detail,toast,actions,openForm,openDrawer,panel,head,personOpts,me,toolbar,flt,links,logIt}=G;
const S=()=>G.S();
const GROUP='DOCUMENTS & SIGNATURES';
const isAdmin=()=>me().role==='Administrator',isAud=()=>me().role==='Auditor';
const SK={Draft:'blue','In review':'amber',Approved:'blue',Published:'green',Archived:'blue',Superseded:'blue'};
const CK={Public:'green',Internal:'blue',Confidential:'amber',Restricted:'red'};
const RK={Held:'amber',Due:'red',Retained:'green'};
// DEFAULTS ONLY, used to pre-fill the create dialog. Retention periods must be confirmed with Legal.
const DEFY={Policy:7,Standard:7,Procedure:7,Contract:8,'Regulatory filing':8,'Regulator correspondence':10,Evidence:7,Report:7,Minutes:10,Certificate:7,Template:3,Other:5};
const LEGAL_NOTE='These periods are defaults to start from, not legal advice. Confirm retention periods with Legal and your regulators before relying on them.';
const LIVE_EXT='.pdf,.png,.jpg,.jpeg,.docx,.xlsx,.csv,.txt,.pptx,.msg,.eml';
const TXT=v=>!!v&&(/^text\/|json|xml/.test(v.mime||'')||/\.(txt|md|csv|html?)$/i.test(v.name||''));
const fail=e=>toast((e&&e.message)||'That did not work.');
const sizeOf=d=>{const v=D.version(d);return v?v.size:0};
const totalBytes=ds=>ds.reduce((s,d)=>s+d.versions.reduce((a,v)=>a+(v.size||0),0),0);
const visible=()=>D.docs().filter(D.canView);
const shortSha=s=>s?s.slice(0,12)+'…':'';
const guessType=n=>/policy/i.test(n)?'Policy':/contract|agreement/i.test(n)?'Contract':/minutes/i.test(n)?'Minutes':/report/i.test(n)?'Report':/cert/i.test(n)?'Certificate':'Other';
const folderOpts=(blank)=>[[ '',blank||'No folder' ],...D.folders().map(f=>[f.id,D.folderPath(f.id)]).sort((a,b)=>a[1]<b[1]?-1:1)];
const idOf=s=>{const m=/DOC-\d+/.exec(s||'');return m?m[0]:''};
// the shared openForm has no label associations and no dialog role; add them so screen readers can use the dialogs
function openF(title,fields,label,cb){openForm(title,fields,label,cb);
 [...document.querySelectorAll('#opFB .field')].forEach((f,i)=>{const l=f.querySelector('label'),c=f.querySelector('input,select,textarea');if(l&&c){c.id='dmsf-'+i;l.htmlFor=c.id}});
 const m=document.querySelector('#opForm .modal');if(m){m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-labelledby','opFT')}}

const css=document.createElement('style');css.textContent=`
.dms-wrap{display:grid;grid-template-columns:250px minmax(0,1fr);gap:14px;align-items:start}
.dms-side{background:#fff;border:1px solid #e3e8ee;border-radius:10px;padding:10px}
.dms-side h3{font:700 11px Manrope;margin:2px 4px 8px;color:#26384c}
.dms-ti{display:flex;justify-content:space-between;gap:6px;width:100%;text-align:left;border:0;background:none;padding:6px 8px;border-radius:6px;font:600 11px 'DM Sans';color:#33475b;cursor:pointer}
.dms-ti:hover{background:#f1f5f8}.dms-ti.sel{background:#e6f2ef;color:#15594c;box-shadow:inset 3px 0 0 #21816f}.dms-ti:focus-visible,.dms-kpis [role=button]:focus-visible{outline:2px solid #0070F2;outline-offset:1px}
.dms-n{color:#5c6773;font-weight:500}.dms-tree{list-style:none;margin:0 0 8px;padding:0}
.dms-fbtn{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0 2px}
.dms-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:13px;margin-bottom:14px}.dms-kpis .op-kpi[aria-pressed=true]{outline:2px solid #21816f}
.dms-drop.over{outline:2px dashed #21816f;outline-offset:3px}.dms-hint{font-size:9.5px;color:#5c6773;margin:0 2px 8px}
.dms-pre{white-space:pre-wrap;word-break:break-word;max-height:300px;overflow:auto;background:#f7f9fb;border:1px solid #e3e8ee;border-radius:8px;padding:10px;font:11px/1.5 ui-monospace,Menlo,Consolas,monospace;margin:6px 0}
.dms-img{max-width:100%;max-height:340px;border:1px solid #e3e8ee;border-radius:8px}.dms-pdf{width:100%;height:360px;border:1px solid #e3e8ee;border-radius:8px}
.dms-diff{border:1px solid #e3e8ee;border-radius:8px;overflow:auto;max-height:340px;font:11px/1.5 ui-monospace,Menlo,Consolas,monospace;margin:6px 0}
.dms-dl{display:grid;grid-template-columns:18px 64px 1fr;gap:6px;padding:1px 8px;white-space:pre-wrap;word-break:break-word}.dms-dl.add{background:#e9f6ef}.dms-dl.del{background:#fdeeed}
.dms-dl b{text-align:center}.dms-dl i{font:700 9px 'DM Sans';font-style:normal;text-transform:uppercase;letter-spacing:.4px}.dms-dl.skip{color:#5c6773;background:#f7f9fb;font-style:italic}
code.dms-sha{font:10px ui-monospace,Menlo,Consolas,monospace;background:#f1f5f8;padding:1px 4px;border-radius:4px;word-break:break-all}
#opFB textarea[name=text],#opFB textarea[name=body]{min-height:240px;font:11px/1.5 ui-monospace,Menlo,Consolas,monospace}
@media(max-width:1100px){.dms-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:900px){.dms-wrap{grid-template-columns:1fr}}@media(max-width:600px){.dms-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}`;
document.head.appendChild(css);

G.mount({id:'documents',label:'Documents',ico:'▤',group:GROUP,title:'Document management',sub:'Folders, versions with integrity checks, retention and legal hold, and links to the records the documents support.',tabs:[['browse','Browse'],['retention','Retention and holds'],['activity','Activity']]});

// ---------------------------------------------------------------- hidden file inputs (picker, new version, attach)
function inputs(){
 if(document.getElementById('dmsUp'))return;
 const mk=(id,label,multi)=>{const i=document.createElement('input');i.type='file';i.id=id;i.setAttribute('aria-label',label);i.style.display='none';if(multi)i.multiple=true;document.body.appendChild(i)};
 mk('dmsUp','Choose files to upload',true);mk('dmsVerUp','Choose the file for the new version',false);mk('dmsAttUp','Choose a file to upload and attach',false);
}
inputs();
const setAccept=()=>['dmsUp','dmsVerUp','dmsAttUp'].forEach(id=>{const i=document.getElementById(id);if(i){if(D.live())i.setAttribute('accept',LIVE_EXT);else i.removeAttribute('accept')}});

// ---------------------------------------------------------------- state of the browse view
const V={folder:'',kpi:'',sort:''};
const ctx={id:'',cmp:0,ver:null};         // the open document drawer: compare version and last integrity result
let pendingDoc='',attachRec='';
const pv={key:'',html:'',urls:[]};          // preview cache; blob URLs are revoked when the preview changes or the drawer closes
function pvClear(){pv.urls.forEach(u=>{try{URL.revokeObjectURL(u)}catch{}});pv.key='';pv.html='';pv.urls=[]}
function descendants(id){const out=new Set([id]);let ch=true;while(ch){ch=false;D.folders().forEach(f=>{if(out.has(f.parent)&&!out.has(f.id)){out.add(f.id);ch=true}})}return out}
const dueNow=d=>D.disposition(d).state==='Due';
function browseRows(){
 const f=flt('documents','br'),pick=k=>f[k]&&f[k]!=='All'?f[k]:'';
 let list=D.search(f.q||'',{type:pick('type'),status:pick('status'),tag:pick('tag'),owner:pick('owner'),conf:pick('conf')});
 if(V.folder==='__none')list=list.filter(d=>!d.folder);else if(V.folder&&V.folder!=='__recent'){const set=descendants(V.folder);list=list.filter(d=>set.has(d.folder))}
 if(V.kpi==='review')list=list.filter(d=>d.status==='In review');if(V.kpi==='out')list=list.filter(d=>d.out);if(V.kpi==='due')list=list.filter(dueNow);if(V.kpi==='hold')list=list.filter(d=>d.retention.hold);
 list=[...list].sort(V.sort==='size'?(a,b)=>totalBytes([b])-totalBytes([a]):(a,b)=>a.modified<b.modified?1:a.modified>b.modified?-1:a.id<b.id?1:-1);
 if(V.folder==='__recent')list=list.slice(0,25);return list}

function treeHtml(){
 const vis=visible(),cnt=id=>{const set=descendants(id);return vis.filter(d=>set.has(d.folder)).length};
 const item=(id,label,n,lvl)=>`<li role="none"><button type="button" role="treeitem" class="dms-ti${V.folder===id?' sel':''}" aria-selected="${V.folder===id}" aria-level="${lvl}" style="padding-left:${8+(lvl-1)*14}px" data-op="dms-folder" data-id="${E(id)}"><span>${label}</span><span class="dms-n" aria-label="${n} documents">${n}</span></button></li>`;
 const walk=(parent,lvl)=>D.children(parent).sort((a,b)=>a.name.localeCompare(b.name)).map(f=>item(f.id,E(f.name),cnt(f.id),lvl)+walk(f.id,lvl+1)).join('');
 return `<ul class="dms-tree" role="tree" aria-label="Folders">${item('','All documents',vis.length,1)}${item('__recent','Recently modified',Math.min(25,vis.length),1)}${walk('',1)}${item('__none','Unfiled',vis.filter(d=>!d.folder).length,1)}</ul>`}

function docRow(d){
 const v=D.version(d)||{},rs=D.disposition(d);
 return `<tr data-op="open" data-t="doc" data-id="${d.id}"><td class="riskid"><button type="button" class="op-link" data-op="open" data-t="doc" data-id="${d.id}">${d.id}</button></td><td><div class="riskname">${E(d.title)}</div><div class="riskarea">${E(D.folderPath(d.folder)||'No folder')}${d.tags.length?' · '+E(d.tags.join(', ')):''}</div></td><td>${E(d.type)}</td><td>${pill(d.status,SK[d.status])}${d.out?'<div class="riskarea">Checked out: '+E(d.out)+'</div>':''}${d.sig?'<div class="riskarea">Signed</div>':''}</td><td>${own(d.owner)}</td><td>v${d.cur}</td><td>${D.sizeLabel(v.size||0)}</td><td>${fmt(d.modified)}</td><td>${pill(d.conf,CK[d.conf])}</td><td>${pill(rs.state,RK[rs.state])}<div class="riskarea">${E(rs.state==='Held'?'Legal hold':rs.state==='Due'?'Ended '+D.retentionEnd(d):'Until '+D.retentionEnd(d))}</div></td></tr>`}

function renderBrowse(){
 const pn=panel('documents','browse');if(!pn)return;setAccept();
 const vis=visible(),rev=vis.filter(d=>d.status==='In review'),out=vis.filter(d=>d.out),due=vis.filter(dueNow),hold=vis.filter(d=>d.retention.hold);
 const k=(key,label,val,foot,cls)=>kpi(label,val,foot,cls).replace('<div class="card op-kpi',`<div role="button" tabindex="0" aria-pressed="${V.kpi===key||(key==='size'&&V.sort==='size')}" data-op="dms-kpi" data-k="${key}" class="card op-kpi drillable`);
 const rows=browseRows(),types=D.TYPES,tags=[...new Set(vis.flatMap(d=>d.tags))].sort(),owners=[...new Set(vis.map(d=>d.owner))].sort();
 const filtersOn=V.kpi||V.sort||['q','type','status','tag','owner','conf'].some(x=>{const v=flt('documents','br')[x];return v&&v!=='All'});
 const canUp=!isAud();
 head('documents',canUp?`<button type="button" class="btn" data-op="dms-pick"><span class="btnico">↑</span>Upload files</button><button class="btn" data-op="dms-new-text"><span class="btnico">＋</span>New text document</button>`:'<span class="op-note">Read-only access (auditor)</span>');
 const sel=V.folder&&!['__recent','__none'].includes(V.folder)?D.folder(V.folder):null;
 pn.innerHTML=`<div class="dms-kpis">${k('all','Total documents',vis.length,`${new Set(vis.map(d=>d.type)).size} types`,'')}${k('review','In review',rev.length,rev.length?'waiting for a decision':'nothing waiting',rev.length?'warn':'ok')}${k('out','Checked out',out.length,out.length?'being edited':'none',out.length?'warn':'ok')}${k('due','Due for disposal',due.length,due.length?'retention has ended':'none due',due.length?'warn':'ok')}${k('hold','On legal hold',hold.length,hold.length?'cannot be changed or deleted':'none',hold.length?'warn':'ok')}${k('size','Storage used',D.sizeLabel(totalBytes(vis)),'all versions; select to sort by size','')}</div>
 ${toolbar('documents','br','Search title, content, tags, owner…',[['type',['All',...types],'All types'],['status',['All',...D.STATUSES],'All statuses'],['tag',['All',...tags],'All tags'],['owner',['All',...owners],'All owners'],['conf',['All',...D.CONF],'All confidentiality']])}
 <div class="dms-wrap"><aside class="dms-side" aria-label="Folders"><h3>Folders</h3>${treeHtml()}${canUp?`<div class="dms-fbtn"><button type="button" class="op-mini" data-op="dms-fnew">New folder</button>${sel?`<button type="button" class="op-mini" data-op="dms-fren">Rename</button><button type="button" class="op-mini r" data-op="dms-fdel">Delete</button>`:''}</div>`:''}</aside>
 <div id="dmsDrop" class="dms-drop" role="region" aria-label="Documents. ${canUp?'You can drop files here to upload them.':''}">${canUp?'<p class="dms-hint">Drag files here to upload them, or use Upload files.'+(D.live()?' Accepted: PDF, images, Word, Excel, PowerPoint, CSV, text, email files, up to 10 MB.':' Files stay in this browser in the demonstration.')+'</p>':''}
 ${card(sel?E(D.folderPath(sel.id)):V.folder==='__recent'?'Recently modified':V.folder==='__none'?'Unfiled':'All documents',`${rows.length} document(s)${filtersOn?' · filters applied':''}`,table(['ID','Title','Type','Status','Owner','Ver','Size','Modified','Confidentiality','Retention'],rows.map(docRow),'No documents match. Upload a file or clear the filters.'),filtersOn?'<button type="button" class="op-mini" data-op="dms-clear">Clear filters</button>':'')}</div></div>`;
 G.setBadge&&G.setBadge('documents',due.length);
}

// ---------------------------------------------------------------- retention and holds
function renderRetention(){
 const pn=panel('documents','retention');if(!pn)return;const vis=visible(),due=vis.filter(dueNow),hold=vis.filter(d=>d.retention.hold);
 const adm=isAdmin();
 const dueRows=due.map(d=>`<tr data-op="open" data-t="doc" data-id="${d.id}"><td class="riskid"><button type="button" class="op-link" data-op="open" data-t="doc" data-id="${d.id}">${d.id}</button></td><td><div class="riskname">${E(d.title)}</div></td><td>${E(d.type)}</td><td>${own(d.owner)}</td><td>${fmt(D.retentionEnd(d))}<div class="riskarea">${d.retention.years} year(s) from ${fmt(d.modified)}</div></td><td>${d.sig?'<span class="riskarea">Signed: export and approve outside the system</span>':adm?`<button type="button" class="op-mini r" data-op="dms-dispose" data-id="${d.id}">Dispose</button>`:'<span class="riskarea">Administrator only</span>'}</td></tr>`);
 const holdRows=hold.map(d=>`<tr data-op="open" data-t="doc" data-id="${d.id}"><td class="riskid"><button type="button" class="op-link" data-op="open" data-t="doc" data-id="${d.id}">${d.id}</button></td><td><div class="riskname">${E(d.title)}</div></td><td>${E(d.retention.holdReason||'')}</td><td>${own(d.owner)}</td><td>${pill('Legal hold','amber')}</td></tr>`);
 const typeRows=D.TYPES.map(t=>{const ds=vis.filter(d=>d.type===t),ys=ds.map(d=>d.retention.years);return `<tr style="cursor:default"><td>${E(t)}</td><td>${ds.length}</td><td>${DEFY[t]} years</td><td>${ds.length?(Math.min(...ys)===Math.max(...ys)?Math.min(...ys):Math.min(...ys)+' to '+Math.max(...ys))+' years':'None'}</td><td>${ds.filter(dueNow).length}</td></tr>`});
 pn.innerHTML=`<div class="op-banner amber" role="note"><div><b>Confirm retention with Legal</b><div>${E(LEGAL_NOTE)} Retention runs from the last modified date of the document.</div></div></div>
 ${card('Due for disposal',`${due.length} document(s) past their retention period. Only an administrator can dispose of a document; documents on legal hold are never listed here.`,table(['ID','Title','Type','Owner','Retention ended','Action'],dueRows,'Nothing is due for disposal.'))}
 ${card('On legal hold',`${hold.length} document(s). A held document cannot be changed, deleted or disposed of until the hold is released.`,table(['ID','Title','Reason','Owner','Status'],holdRows,'No documents are on legal hold.'))}
 ${card('Retention by document type','Default years pre-fill the create dialog. Each document can have its own period (Edit details).',table(['Type','Documents','Default years','Set on documents','Due now'],typeRows))}`;
}

// ---------------------------------------------------------------- activity
let liveRows=[],liveAt=0;
function liveActivity(){if(!(G.api&&G.api.connected&&G.api.call)||Date.now()-liveAt<15000)return;liveAt=Date.now();
 G.api.call('GET',`/api/audit?profile=${encodeURIComponent(G.PROF)}&limit=300`).then(r=>{if(r&&r.ok){liveRows=(r.data.rows||[]).filter(x=>['dmsDocs','dmsFolders','esReq'].includes(x.coll)||/^DOC-/.test(x.rec||'')||(x.coll==='files'&&/^DOC-/.test(x.rec||'')));renderActivity()}}).catch(()=>{})}
function renderActivity(){
 const pn=panel('documents','activity');if(!pn)return;const f=flt('documents','act'),q=(f.q||'').toLowerCase();
 const ent=(S().log||[]).filter(e=>/^(DOC|ESIGN)$/.test(e.ref||'')||/DOC-\d+/.test(e.txt||'')).filter(e=>!q||(e.who+' '+e.txt).toLowerCase().includes(q));
 const rows=ent.map(e=>{const id=idOf(e.txt),d=id&&D.doc(id);return `<tr style="cursor:default"><td style="white-space:nowrap">${fmt(e.t)}</td><td>${own(e.who)}</td><td>${E(e.ref==='ESIGN'?'Signature':'Document')}</td><td style="white-space:normal">${E(e.txt)}</td><td>${id&&d&&D.canView(d)?`<button type="button" class="op-link" data-op="open" data-t="doc" data-id="${id}">${id}</button>`:''}</td></tr>`});
 let shared='';if(G.api&&G.api.connected){liveActivity();const lr=liveRows.filter(x=>!q||JSON.stringify(x).toLowerCase().includes(q)).map(x=>`<tr style="cursor:default"><td style="white-space:nowrap">${E(new Date(x.ts).toLocaleString())}</td><td>${own(x.user)}</td><td>${E(x.action)}</td><td>${E(x.coll||'')} ${E(x.rec||'')}</td><td style="white-space:normal">${E(Array.isArray(x.detail)?x.detail.map(c=>c.field+': '+c.from+' to '+c.to).join('; '):x.detail&&(x.detail.title||x.detail.to)||'')}</td></tr>`);
  shared=card('Shared activity (server audit trail)','Changes and file downloads by everyone, recorded on the server.',table(['When','Who','Action','Record','Detail'],lr,'No shared activity recorded yet.'))}
 pn.innerHTML=toolbar('documents','act','Search people or events…',[])+card('Recent document events',`${ent.length} event(s) recorded in this workspace: who created, changed, downloaded or signed what.`,table(['Date','Who','Kind','What happened','Document'],rows,'No document events yet.'))+shared;
}
G.renders.push(()=>{renderBrowse();renderRetention();renderActivity()});

// ---------------------------------------------------------------- upload and create dialogs
function startUpload(files,linkRec){
 files=[...files||[]];if(!files.length)return;if(isAud()){toast('Auditors have read-only access to documents.');return}
 const one=files.length===1;
 openF(one?'Upload '+files[0].name:`Upload ${files.length} files`,[
  ...(one?[{name:'title',label:'Title',value:files[0].name.replace(/\.[^.]+$/,''),full:true}]:[]),
  {name:'type',label:'Type',type:'select',options:D.TYPES,value:guessType(files[0].name)},{name:'conf',label:'Confidentiality',type:'select',options:D.CONF,value:'Internal'},
  {name:'folder',label:'Folder',type:'select',options:folderOpts(),value:linkRec||['','__recent','__none'].includes(V.folder)?'':V.folder,full:true},
  {name:'tags',label:'Tags (separated by commas)',full:true},{name:'years',label:'Retention in years (blank uses the default for the type; confirm with Legal)',type:'number'}],'Upload',v=>{
  if(one&&!v.title)return 'Give the document a title.';
  const meta={title:one?v.title:undefined,type:v.type,conf:v.conf,folder:v.folder,tags:v.tags?v.tags.split(','):[],retentionYears:v.years||DEFY[v.type],linked:linkRec?[linkRec]:[]};
  (async()=>{let made=[];for(const f of files){try{made.push(await D.create({...meta},f))}catch(e){toast(f.name+': '+(e.message||'could not be saved.'))}}
   if(made.length){toast(made.length===1?`${made[0].id} created.`:`${made.length} documents created.`);if(made.length===1&&!linkRec)setTimeout(()=>openDrawer('doc',made[0].id),0)}})()});
}
document.addEventListener('change',e=>{const t=e.target;
 if(t.id==='dmsUp'){const fs=[...t.files];t.value='';startUpload(fs)}
 else if(t.id==='dmsAttUp'){const fs=[...t.files],rec=attachRec;t.value='';startUpload(fs,rec)}
 else if(t.id==='dmsVerUp'){const f=t.files[0],id=pendingDoc;t.value='';if(!f||!id)return;
  openF('Upload new version of '+id,[{name:'note',label:'What changed?',full:true,ph:'For example: legal review comments added'}],'Upload',v=>{D.addVersion(id,f,v.note).then(x=>toast(`Version ${x.n} saved.`)).catch(fail)})}});
// drag and drop onto the document table
document.addEventListener('dragover',e=>{const z=e.target.closest&&e.target.closest('#dmsDrop');if(z&&!isAud()){e.preventDefault();z.classList.add('over')}});
document.addEventListener('dragleave',e=>{const z=document.getElementById('dmsDrop');if(z&&!z.contains(e.relatedTarget))z.classList.remove('over')});
document.addEventListener('drop',e=>{const z=e.target.closest&&e.target.closest('#dmsDrop');if(!z)return;e.preventDefault();z.classList.remove('over');if(e.dataTransfer&&e.dataTransfer.files.length)startUpload(e.dataTransfer.files)});

// ---------------------------------------------------------------- line diff (text documents)
function lineDiff(a,b){
 const A=String(a).replace(/\r\n/g,'\n').split('\n'),B=String(b).replace(/\r\n/g,'\n').split('\n');
 let s=0;while(s<A.length&&s<B.length&&A[s]===B[s])s++;let ea=A.length,eb=B.length;while(ea>s&&eb>s&&A[ea-1]===B[eb-1]){ea--;eb--}
 const x=A.slice(s,ea),y=B.slice(s,eb),n=x.length,m=y.length;if(n*m>4e6)return null;
 const W=m+1,L=new Uint32Array((n+1)*W);for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)L[i*W+j]=x[i]===y[j]?L[(i+1)*W+j+1]+1:Math.max(L[(i+1)*W+j],L[i*W+j+1]);
 const out=A.slice(0,s).map(t=>['=',t]);let i=0,j=0;
 while(i<n&&j<m){if(x[i]===y[j]){out.push(['=',x[i]]);i++;j++}else if(L[(i+1)*W+j]>=L[i*W+j+1]){out.push(['-',x[i++]])}else out.push(['+',y[j++]])}
 while(i<n)out.push(['-',x[i++]]);while(j<m)out.push(['+',y[j++]]);A.slice(ea).forEach(t=>out.push(['=',t]));return out}
function diffHtml(ops){
 const add=ops.filter(o=>o[0]==='+').length,del=ops.filter(o=>o[0]==='-').length;if(!add&&!del)return '<p class="op-note" role="status">The two versions have the same text.</p>';
 const keep=new Set();ops.forEach((o,i)=>{if(o[0]!=='='){for(let k=Math.max(0,i-2);k<=Math.min(ops.length-1,i+2);k++)keep.add(k)}});
 let h='',skipped=0;const flush=()=>{if(skipped){h+=`<div class="dms-dl skip"><b></b><i></i><span>${skipped} unchanged line(s)</span></div>`;skipped=0}};
 ops.forEach((o,i)=>{if(!keep.has(i)){skipped++;return}flush();const k=o[0]==='+'?'add':o[0]==='-'?'del':'';h+=`<div class="dms-dl ${k}"><b aria-hidden="true">${o[0]==='+'?'+':o[0]==='-'?'−':''}</b><i>${k==='add'?'Added':k==='del'?'Removed':''}</i><span>${E(o[1])||'&nbsp;'}</span></div>`});flush();
 return `<p class="op-note" role="status">${add} line(s) added (+), ${del} line(s) removed (−).</p><div class="dms-diff" role="region" aria-label="Text differences" tabindex="0">${h}</div>`}

// ---------------------------------------------------------------- preview
async function buildPreview(d,urls){
 const v=D.version(d);if(!v)return '';
 if(TXT(v)){const t=await D.text(d.id);if(!t&&v.size)return '<p class="op-note">The stored file could not be found. Use Verify integrity.</p>';return `<pre class="dms-pre" tabindex="0" aria-label="Text preview of ${E(v.name)}">${E(t.slice(0,20000))}</pre>${t.length>20000?'<p class="op-note">Preview shows the first 20,000 characters. Download for the rest.</p>':''}`}
 const isImg=/^image\/(png|jpe?g|gif|webp)$/.test(v.mime||''),isPdf=v.mime==='application/pdf';
 if(!isImg&&!isPdf)return '<p class="op-note">Download to open this file type.</p>';
 const b=await D.blob(d.id);if(!b)return '<p class="op-note">The stored file could not be found. Use Verify integrity.</p>';
 const url=URL.createObjectURL(b);urls.push(url);
 // PDFs: the browser PDF viewer in an object element (the sandbox attribute is not available on object; the blob is never rendered as HTML)
 return isImg?`<img class="dms-img" src="${url}" alt="Preview of ${E(v.name)}">`:`<object class="dms-pdf" data="${url}" type="application/pdf" aria-label="PDF preview of ${E(v.name)}"><p class="op-note">This browser cannot show PDFs inline. Download to open.</p></object>`}
let pvTok=0;
async function fillPreview(d,key){const tok=++pvTok,urls=[];let html='';try{html=await buildPreview(d,urls)}catch(e){html='<p class="op-note">Preview is not available.</p>'}
 if(tok!==pvTok||!G.UI.drawer||G.UI.drawer.type!=='doc'||G.UI.drawer.id!==d.id){urls.forEach(u=>URL.revokeObjectURL(u));return}
 pvClear();pv.key=key;pv.html=html;pv.urls=urls;const el=document.getElementById('dmsPrev');if(el)el.innerHTML=html}
async function fillDiff(d,n){const el=document.getElementById('dmsDiff');if(!el)return;
 const [a,b]=await Promise.all([D.text(d.id,n),D.text(d.id)]);const cur=document.getElementById('dmsDiff');if(!cur||ctx.cmp!==n)return;
 const ops=(a||b)?lineDiff(a,b):null;cur.innerHTML=`<h4>Version ${n} compared with current version ${d.cur}</h4><p class="op-note">Removed lines (−) exist only in version ${n}. Added lines (+) exist only in the current version.</p>${ops?diffHtml(ops):'<p class="op-note">These versions are too large or are not text, so they cannot be compared here.</p>'}<button type="button" class="op-mini" data-op="dms-cmp-x">Close comparison</button>`}

// ---------------------------------------------------------------- the document drawer
const verHtml=v=>v?`<div class="op-banner ${v.r.ok?'green':'red'}" role="status"><div><b>${v.r.ok?'✓ Integrity check passed':'✕ Integrity check FAILED'} (version ${v.n})</b><div>Recorded checksum: <code class="dms-sha">${E(v.r.expected||'')}</code></div><div>Checksum of the stored file: <code class="dms-sha">${E(v.r.actual||'not available')}</code></div>${v.r.ok?'':`<div>${E(v.r.reason||'')}. Do not rely on this file; restore it from a backup or upload it again.</div>`}</div></div>`:'';
G.drawers.doc=id=>{
 const d=D.doc(id);
 if(!d||!D.canView(d)){G.setDrawer('Document',id||'Not found','<p class="op-note">This document does not exist or you do not have access to it.</p>');return}
 if(ctx.id!==id){ctx.id=id;ctx.cmp=0;ctx.ver=null;pvClear();try{logIt('DOC',`Opened ${d.id} ${d.title}`);G.save()}catch{}}
 const v=D.version(d)||{},rs=D.disposition(d),can=D.canEdit(d),adm=isAdmin(),aud=isAud(),mine=d.out===me().name,canHold=adm||me().role==='Business user';
 const reqs=G.esign&&G.esign.forDoc?G.esign.forDoc(d.id):[],P=[];
 if(d.out)P.push([mine?'amber':'red',mine?'You have this document checked out. Upload a new version or cancel the check-out.':`Checked out by ${E(d.out)}. Others cannot change it until it is checked in.`]);
 if(d.status==='In review')P.push(['amber','In review. Approve it by changing its status, or request signatures.']);
 if(d.retention.hold)P.push(['amber',`Legal hold: ${E(d.retention.holdReason||'')}. It cannot be changed, deleted or disposed of.`]);
 if(rs.state==='Due')P.push(['red',`Retention ended on ${fmt(D.retentionEnd(d))}. ${adm?'You can dispose of it from Retention and holds.':'An administrator can dispose of it.'}`]);
 if(d.sig)P.push(['amber','Signed and locked. Start a revision from the signature request to change it.']);
 reqs.filter(r=>r.status==='Out for signature').forEach(r=>P.push(['amber',`Waiting for signatures: ${E(r.id)}.`]));
 const key=`${d.id}|${d.cur}|${v.sha}`,cached=pv.key===key;
 const vrows=[...d.versions].sort((a,b)=>b.n-a.n).map(x=>`<tr style="cursor:default"><td>v${x.n}${x.n===d.cur?' (current)':''}</td><td>${E(new Date(x.ts).toLocaleDateString())}</td><td>${E(x.by)}</td><td>${D.sizeLabel(x.size)}</td><td style="white-space:normal">${E(x.note||'')}</td><td><code class="dms-sha" title="${E(x.sha)}">${E(shortSha(x.sha))}</code></td><td style="white-space:nowrap"><button type="button" class="op-mini" data-op="dms-dl" data-id="${d.id}" data-n="${x.n}">Download</button> <button type="button" class="op-mini" data-op="dms-verify" data-id="${d.id}" data-n="${x.n}">Verify</button>${x.n!==d.cur&&can&&!d.out||x.n!==d.cur&&mine?` <button type="button" class="op-mini" data-op="dms-mkcur" data-id="${d.id}" data-n="${x.n}">Make current</button>`:''}${x.n!==d.cur&&TXT(x)&&TXT(v)?` <button type="button" class="op-mini" data-op="dms-cmp" data-id="${d.id}" data-n="${x.n}">Compare with current</button>`:''}</td></tr>`);
 const sigRows=reqs.map(r=>`<div class="op-li"><div><b>${E(r.id)} · ${E(r.title||'Signature request')}</b><div class="riskarea">${E(r.status)}${r.ver?' · version '+r.ver:''}</div></div><button type="button" class="op-mini" data-op="open" data-t="esreq" data-id="${E(r.id)}">Open</button></div>`).join('');
 const aud_=(S().log||[]).filter(e=>(e.txt||'').includes(d.id)).slice(0,12).map(e=>`<div class="op-li"><div>${E(e.txt)}<div class="riskarea">${E(e.who)} · ${fmt(e.t)}</div></div></div>`).join('');
 detail({kicker:'Document · '+d.id,title:d.title,pending:P,ok:'No action is pending on this document.',
  todo:['Check the status, owner and confidentiality are right.','Upload a new version for changes; earlier versions stay available and verifiable.','When it is final, request signatures and confirm the retention period with Legal.'],
  facts:[['Type',E(d.type)],['Status',pill(d.status,SK[d.status])],['Owner',own(d.owner)],['Folder',E(D.folderPath(d.folder)||'No folder')],['Confidentiality',pill(d.conf,CK[d.conf])],['Version',`v${d.cur} of ${d.versions.length}`],['Size',D.sizeLabel(v.size||0)],['Checksum (SHA-256)',`<code class="dms-sha" title="${E(v.sha||'')}">${E(shortSha(v.sha))}</code>`],['Retention',`${pill(rs.state,RK[rs.state])} ${E(rs.state==='Held'?'':rs.state==='Due'?'ended '+fmt(D.retentionEnd(d)):'until '+fmt(D.retentionEnd(d)))} (${d.retention.years} years)`],['Legal hold',d.retention.hold?'Yes: '+E(d.retention.holdReason):'No'],['Checked out',d.out?own(d.out):'No'],['Tags',E(d.tags.join(', ')||'None')],['Shared with',E((d.shared||[]).join(', ')||'Nobody else')],['Modified',fmt(d.modified)]],
  buttons:`<button type="button" class="op-mini p" data-op="dms-dl" data-id="${d.id}">Download</button>`+(can&&!aud?`<button type="button" class="op-mini" data-op="dms-newver" data-id="${d.id}">Upload new version</button>`:'')+(can&&TXT(v)?`<button type="button" class="op-mini" data-op="dms-edit-text" data-id="${d.id}">Edit text</button>`:'')+(can&&!mine?`<button type="button" class="op-mini" data-op="dms-out" data-id="${d.id}">Check out</button>`:'')+(d.out&&(mine||adm)?`<button type="button" class="op-mini" data-op="dms-in" data-id="${d.id}">Cancel check-out</button>`:'')+`<button type="button" class="op-mini" data-op="dms-verify" data-id="${d.id}">Verify integrity</button>`+((can||adm)&&!aud?`<button type="button" class="op-mini" data-op="dms-sign" data-id="${d.id}">Request signature</button>`:'')+((can||adm)&&!aud?`<button type="button" class="op-mini" data-op="dms-edit" data-id="${d.id}">Edit details</button>`:'')+((can||adm)&&!aud?(d.status==='Archived'?`<button type="button" class="op-mini" data-op="dms-restore" data-id="${d.id}">Restore</button>`:`<button type="button" class="op-mini" data-op="dms-archive" data-id="${d.id}">Archive</button>`):'')+(canHold&&!aud?(d.retention.hold?`<button type="button" class="op-mini" data-op="dms-hold" data-id="${d.id}" data-on="0">Release legal hold</button>`:`<button type="button" class="op-mini" data-op="dms-hold" data-id="${d.id}" data-on="1">Place legal hold</button>`):'')+((adm||d.owner===me().name)&&!aud?`<button type="button" class="op-mini r" data-op="dms-del" data-id="${d.id}">Delete</button>`:''),
  extra:`${d.desc?`<h4>Description</h4><p>${E(d.desc)}</p>`:''}<div id="dmsVerify">${ctx.ver&&ctx.ver.id===d.id?verHtml(ctx.ver):''}</div><h4>Preview</h4><div id="dmsPrev">${cached?pv.html:'<p class="op-note">Loading preview…</p>'}</div><h4>Versions</h4>${table(['Version','Date','By','Size','Note','Checksum','Actions'],vrows)}<div id="dmsDiff"></div><h4>Signatures</h4>${sigRows||'<p class="op-note">No signature requests yet.</p>'}`,
  links:d.linked,after:`<div class="op-btns">${(can||adm)&&!aud?`<button type="button" class="op-mini" data-op="dms-link" data-id="${d.id}">Link a record</button>${d.linked.length?`<button type="button" class="op-mini" data-op="dms-unlink" data-id="${d.id}">Remove a link</button>`:''}`:''}</div><h4>Audit trail</h4>${aud_||'<p class="op-note">No events recorded for this document in this workspace.</p>'}`});
 if(!cached)fillPreview(d,key);
 if(ctx.cmp)fillDiff(d,ctx.cmp);
};

// ---------------------------------------------------------------- actions
const gd=b=>D.doc(b.dataset.id);
const run=p=>Promise.resolve(p).catch(fail);
Object.assign(actions,{
 'dms-folder':b=>{V.folder=b.dataset.id;G.renderAll()},
 'dms-kpi':b=>{const k=b.dataset.k;if(k==='size'){V.sort=V.sort==='size'?'':'size';V.kpi=''}else{V.sort='';V.kpi=(k==='all'||V.kpi===k)?'':k}G.renderAll()},
 'dms-clear':()=>{V.kpi='';V.sort='';G.UI.filters['documentsbr']={};G.renderAll()},
 'dms-pick':b=>{const i=document.getElementById('dmsUp');if(i)i.click()},
 'dms-new-text':()=>{if(isAud()){toast('Auditors have read-only access to documents.');return}
  openF('New text document',[{name:'title',label:'Title',full:true},{name:'type',label:'Type',type:'select',options:D.TYPES,value:'Procedure'},{name:'conf',label:'Confidentiality',type:'select',options:D.CONF,value:'Internal'},{name:'folder',label:'Folder',type:'select',options:folderOpts(),value:['','__recent','__none'].includes(V.folder)?'':V.folder,full:true},{name:'body',label:'Text',type:'textarea',full:true}],'Save document',v=>{
   if(!v.title)return 'Give the document a title.';if(!v.body)return 'Write some text for the document.';
   D.create({title:v.title,type:v.type,conf:v.conf,folder:v.folder,retentionYears:DEFY[v.type]},{text:v.body,name:v.title.replace(/[^\w\- ()]/g,'').trim().slice(0,60)+'.txt'}).then(x=>{toast(x.id+' created.');setTimeout(()=>openDrawer('doc',x.id),0)}).catch(fail)})},
 'dms-fnew':()=>{const sel=V.folder&&!['__recent','__none'].includes(V.folder)?V.folder:'';
  openF('New folder',[{name:'name',label:'Folder name',full:true},{name:'parent',label:'Inside',type:'select',options:folderOpts('Top level'),value:sel,full:true}],'Create',v=>{try{const f=D.createFolder(v.name,v.parent);V.folder=f.id}catch(e){return e.message}})},
 'dms-fren':()=>{const f=D.folder(V.folder);if(!f)return;openF('Rename folder',[{name:'name',label:'New name',value:f.name,full:true}],'Rename',v=>{try{D.renameFolder(f.id,v.name)}catch(e){return e.message}})},
 'dms-fdel':()=>{const f=D.folder(V.folder);if(!f)return;if(!confirm(`Delete the folder "${D.folderPath(f.id)}"? Only empty folders can be deleted.`))return;try{D.deleteFolder(f.id);V.folder='';toast('Folder deleted.')}catch(e){toast(e.message)}},
 'dms-dl':b=>run(D.download(b.dataset.id,b.dataset.n?+b.dataset.n:undefined)),
 'dms-newver':b=>{const d=gd(b);if(!d)return;if(!D.canEdit(d)){toast(d.sig?'This document has been signed and is locked.':'You cannot edit this document.');return}pendingDoc=d.id;document.getElementById('dmsVerUp').click()},
 'dms-edit-text':b=>run((async()=>{const d=gd(b);if(!d)return;if(!D.canEdit(d)){toast('You cannot edit this document.');return}const t=await D.text(d.id),name=(D.version(d)||{}).name;
  openF('Edit text: '+d.title,[{name:'text',label:'Text',type:'textarea',value:t,full:true},{name:'note',label:'What changed?',full:true}],'Save as new version',v=>{
   if(!v.text)return 'The document cannot be empty.';if(v.text===t.trim())return 'You have not changed the text.';
   D.addVersion(d.id,{text:v.text,name},v.note||'Text edited').then(x=>toast(`Version ${x.n} saved.`)).catch(fail)})})()),
 'dms-out':b=>{try{D.checkOut(b.dataset.id);toast('Checked out to you.')}catch(e){toast(e.message)}},
 'dms-in':b=>{try{D.cancelCheckOut(b.dataset.id);toast('Check-out cancelled.')}catch(e){toast(e.message)}},
 'dms-verify':b=>run((async()=>{const id=b.dataset.id,d=D.doc(id);if(!d)return;const n=b.dataset.n?+b.dataset.n:d.cur,r=await D.verify(id,n);ctx.ver={id,n,r};
  logIt('DOC',`Integrity checked: ${id} v${n}: ${r.ok?'passed':'FAILED'}`);G.save();toast(r.ok?`Version ${n} passed the integrity check.`:`Version ${n} FAILED the integrity check.`);G.renderAll();
  const el=document.getElementById('dmsVerify');if(el&&!el.innerHTML)el.innerHTML=verHtml(ctx.ver)})()),
 'dms-mkcur':b=>run((async()=>{const id=b.dataset.id,n=+b.dataset.n,d=D.doc(id),v=D.version(d,n),bl=await D.blob(id,n);if(!bl||!v){toast('The file for that version could not be found.');return}
  if(!confirm(`Make version ${n} the current version? It is added again as a new version; nothing is deleted.`))return;
  const x=await D.addVersion(id,new File([bl],v.name,{type:v.mime}),`Restored from version ${n}`);toast(`Version ${n} is now current as version ${x.n}.`)})()),
 'dms-cmp':b=>{ctx.cmp=+b.dataset.n;G.renderAll()},
 'dms-cmp-x':()=>{ctx.cmp=0;G.renderAll()},
 'dms-sign':b=>{const a=G.actions['esign-new'];if(typeof a==='function')a({dataset:{id:b.dataset.id}});else toast('E-signature is not available yet')},
 'dms-edit':b=>{const d=gd(b);if(!d)return;
  openF('Edit details: '+d.id,[{name:'title',label:'Title',value:d.title,full:true},{name:'type',label:'Type',type:'select',options:D.TYPES,value:d.type},{name:'status',label:'Status',type:'select',options:D.STATUSES,value:d.status},{name:'folder',label:'Folder',type:'select',options:folderOpts(),value:d.folder},{name:'conf',label:'Confidentiality',type:'select',options:D.CONF,value:d.conf},{name:'tags',label:'Tags (separated by commas)',value:d.tags.join(', '),full:true},{name:'years',label:'Retention in years (confirm with Legal)',type:'number',value:d.retention.years},{name:'owner',label:'Owner',type:'select',options:personOpts(),value:d.owner},{name:'shared',label:'Shared with (names separated by commas; they can edit)',value:(d.shared||[]).join(', '),full:true},{name:'desc',label:'Description',type:'textarea',value:d.desc,full:true}],'Save',v=>{
   if(!v.title)return 'Give the document a title.';const people=G.people(),shared=v.shared?v.shared.split(',').map(s=>s.trim()).filter(Boolean):[];const bad=shared.filter(n=>!people.includes(n));if(bad.length)return 'Not a known person: '+bad.join(', ');
   try{D.update(d.id,{title:v.title,type:v.type,status:v.status,folder:v.folder,conf:v.conf,tags:v.tags?v.tags.split(','):[],retentionYears:v.years,owner:v.owner,shared,desc:v.desc});toast('Details saved.')}catch(e){return e.message}})},
 'dms-archive':b=>{try{D.archive(b.dataset.id);toast('Document archived.')}catch(e){toast(e.message)}},
 'dms-restore':b=>{try{D.setStatus(b.dataset.id,'Draft');toast('Document restored as a draft.')}catch(e){toast(e.message)}},
 'dms-hold':b=>{const id=b.dataset.id;
  if(b.dataset.on==='1'){openF('Place legal hold',[{name:'reason',label:'Reason for the hold (for example, case reference)',full:true}],'Place hold',v=>{try{D.setHold(id,true,v.reason);toast('Legal hold placed.')}catch(e){return e.message}})}
  else{if(!confirm('Release the legal hold on '+id+'?'))return;try{D.setHold(id,false);toast('Legal hold released.')}catch(e){toast(e.message)}}},
 'dms-del':b=>run((async()=>{const id=b.dataset.id,d=D.doc(id);if(!d)return;if(!confirm(`Delete ${id} "${d.title}" and all its versions? This cannot be undone.`))return;await D.remove(id);G.closeDrawer();toast(id+' deleted.')})()),
 'dms-dispose':b=>run((async()=>{const id=b.dataset.id,d=D.doc(id);if(!d)return;if(!confirm(`Dispose of ${id} "${d.title}"? The file and all its versions are permanently deleted. Check with Legal first. This cannot be undone.`))return;await D.dispose(id);G.closeDrawer();toast(id+' disposed.')})()),
 'dms-link':b=>{const d=gd(b);if(!d)return;openF('Link a record',[{name:'rec',label:'Record ID (for example POL-001, ISS-101, C-12, V-001)',full:true}],'Link',v=>{const rec=(v.rec||'').toUpperCase();if(!rec)return 'Enter a record ID.';if(rec===d.id)return 'A document cannot link to itself.';
   if(!/data-op="(open|risk)"/.test(G.lk(rec)))return 'No record with that ID was found.';try{D.link(d.id,rec);toast(rec+' linked.')}catch(e){return e.message}})},
 'dms-unlink':b=>{const d=gd(b);if(!d||!d.linked.length)return;openF('Remove a link',[{name:'rec',label:'Linked record',type:'select',options:d.linked,value:d.linked[0],full:true}],'Remove',v=>{D.unlink(d.id,v.rec);toast('Link removed.')})},
 'dms-unlink-rec':b=>{const d=gd(b);if(!d)return;if(!(D.canEdit(d)||isAdmin())||isAud()){toast('You cannot change this document.');return}D.unlink(d.id,b.dataset.rec);toast('Document unlinked.')},
 'dms-attach':b=>{const rec=b.dataset.rec,opts=D.docs().filter(d=>D.canView(d)&&(D.canEdit(d)||isAdmin())&&!d.linked.includes(rec));
  if(!opts.length){toast('No documents available to attach. Upload one instead.');return}
  openF('Attach a document to '+rec,[{name:'doc',label:'Document',type:'select',options:[['','Choose a document'],...opts.map(d=>[d.id,`${d.id} · ${d.title}`])],full:true}],'Attach',v=>{if(!v.doc)return 'Choose a document.';try{D.link(v.doc,rec);toast(v.doc+' attached to '+rec+'.')}catch(e){return e.message}})},
 'dms-attach-up':b=>{if(isAud()){toast('Auditors have read-only access to documents.');return}attachRec=b.dataset.rec;document.getElementById('dmsAttUp').click()}
});
// keyboard: activate dashboard cards with Enter or Space; arrow keys move through the folder tree
document.addEventListener('keydown',e=>{const t=e.target;if(!t||!t.closest)return;
 if((e.key==='Enter'||e.key===' ')&&t.matches('[role=button][data-op=dms-kpi]')){e.preventDefault();actions['dms-kpi'](t);return}
 if((e.key==='ArrowDown'||e.key==='ArrowUp')&&t.matches('.dms-ti')){const all=[...document.querySelectorAll('.dms-ti')],i=all.indexOf(t),n=all[i+(e.key==='ArrowDown'?1:-1)];if(n){e.preventDefault();n.focus()}}},true);

// ---------------------------------------------------------------- other record drawers: Documents (managed)
const SKIP=new Set(['doc','esreq','kpilist','kpiinfo','rowinfo','owner','area','theme','metric','cell','spk']);
G.drawerHooks.push(d=>{
 if(!d||d.type!=='doc'){ctx.id='';pvClear()}
 if(!d||!d.id||SKIP.has(d.type))return;const body=document.getElementById('opDB');if(!body)return;
 let box=document.getElementById('dmsBox');if(!box){box=document.createElement('div');box.id='dmsBox';body.appendChild(box)}
 const ds=D.docsFor(d.id),edit=!isAud();
 box.innerHTML=`<h4>Documents (managed)</h4>${ds.length?ds.map(x=>`<div class="op-li"><div><button type="button" class="op-link" data-op="open" data-t="doc" data-id="${x.id}">${E(x.id)} · ${E(x.title)}</button><div class="riskarea">${E(x.type)} · ${E(x.status)} · v${x.cur}${x.sig?' · signed':''}</div></div>${edit&&(D.canEdit(x)||isAdmin())?`<button type="button" class="op-mini" data-op="dms-unlink-rec" data-id="${x.id}" data-rec="${E(d.id)}" aria-label="Unlink ${E(x.id)}">Unlink</button>`:''}</div>`).join(''):'<p class="op-note">No managed documents are linked to this record.</p>'}${edit?`<div class="op-btns"><button type="button" class="op-mini p" data-op="dms-attach" data-rec="${E(d.id)}">Attach document</button><button type="button" class="op-mini" data-op="dms-attach-up" data-rec="${E(d.id)}">Upload and attach</button></div>`:''}`;
});
// close the drawer: release preview blob URLs and forget per-document state
new MutationObserver(()=>{const dr=document.getElementById('opDrawer');if(dr&&!dr.classList.contains('show')){ctx.id='';pvClear()}}).observe(document.getElementById('opDrawer')||document.body,{attributes:true,attributeFilter:['class']});

// ---------------------------------------------------------------- links, parents, search, tiles
G.linkers.push(id=>{if(!/^DOC-\d+$/.test(id))return null;const d=D.doc(id);return d&&D.canView(d)?{type:'doc',label:`${d.id} · ${d.title}`}:null});
G.parents.doc=null;
// global search (the Home search box has no provider list, so add a section after it has drawn its results)
function augmentSearch(){
 const res=document.getElementById('fxRes'),inp=document.getElementById('fxQ');if(!res||!inp||res.hidden)return;const q=inp.value.trim();if(q.length<2||res.querySelector('#dmsSearchSec'))return;
 const hits=D.search(q).slice(0,6);if(!hits.length)return;
 const sec=document.createElement('div');sec.id='dmsSearchSec';sec.innerHTML=`<h5>Documents</h5>${hits.map(d=>`<div data-op="open" data-t="doc" data-id="${E(d.id)}" tabindex="0"><span>${E(d.id)} · ${E(d.title)}</span><small>Document</small></div>`).join('')}`;
 const nf=[...res.children].find(c=>/Nothing found/.test(c.textContent)&&!c.matches('h5'));if(nf)nf.remove();res.appendChild(sec)}
document.addEventListener('input',e=>{if(e.target&&e.target.id==='fxQ')setTimeout(augmentSearch,0)});
// executive view tile
G.xTiles.push(()=>{const vis=visible();if(!vis.length)return null;const due=vis.filter(dueNow),rev=vis.filter(d=>d.status==='In review'),hold=vis.filter(d=>d.retention.hold);
 return{key:'dms-attn',l:'Documents needing attention',v:due.length+rev.length,f:`${due.length} due for disposal · ${rev.length} in review · ${hold.length} on legal hold · ${vis.filter(d=>d.out).length} checked out`,k:due.length?'red':rev.length?'amber':'green',ic:'▤'}});
G.metrics['dms-attn']=()=>['Documents','Documents needing attention','Documents past their retention period or waiting in review.',visible().filter(d=>dueNow(d)||d.status==='In review').map(d=>({id:d.id,sub:`${d.title} · ${d.type} · ${d.owner}`,pill:pill(dueNow(d)?'Due for disposal':'In review',dueNow(d)?'red':'amber')}))];
G.renderAll();
})();
