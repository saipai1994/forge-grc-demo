// Regulatory feed inbox: adds a "Feed inbox" tab to Regulatory change. With the server it lists scored items from
// the regulator and law-firm feeds an administrator has added; without a server (demo mode) it shows clearly
// labelled SAMPLE items so the screen can be tried. Either way, an item converts into a real change record.
(function(){
const G=window.GRC;if(!G||!G.mount||!document.getElementById('view-regchange'))return;
const {E,fmt,pill,table,card,bar,toast,logIt,commit,actions,TODAY,addDays,openForm,panel,head}=G;
const S=()=>G.S();
const live=()=>!!(G.api&&G.api.connected);
const isAdmin=()=>{try{return (live()?G.api.user:G.me()).role==='Administrator'}catch{return false}};
const canWork=()=>{try{return (live()?G.api.user:G.me()).role!=='Auditor'}catch{return true}};
const F={status:'New',min:0,jur:''};
let items=[],feeds=[],catalogue=null,loaded=false,loading=false,err='';

// ---------------------------------------------------------------- demo-mode sample items (invented, labelled)
const SAMPLE_NOTE='Sample item, not from a regulator';
const SAMPLES=[
 [1,'Sample: revised periodic KYC updation timelines for low-risk customers',88,'rbi-kyc','RBI KYC','names "RBI KYC"; adopted by your organisation','circular, amendment, effective','A made-up circular about how often customer KYC records must be refreshed.'],
 [2,'Sample: master direction on cyber incident reporting channel and format',81,'rbi-itgrc','RBI ITGRC','mentions RBI + ITGRC; adopted by your organisation','direction, deadline','A made-up direction on how and when cyber incidents are reported.'],
 [3,'Sample: register of information data points updated for DORA',76,'dora','DORA','names "DORA"; adopted by your organisation','amendment, effective','A made-up notice on changes to a third-party register template.'],
 [4,'Sample: DPDP phase-in notification for consent managers',72,'dpdp','DPDP Act 2023','title terms: digital, personal, protection; adopted by your organisation','notification, effective','A made-up notification on the next obligations to come into force.'],
 [5,'Sample: guidelines on outsourcing of IT services',58,'rbi-outsourcing','RBI Outsourcing','mentions outsourcing; adopted by your organisation','guidelines','A made-up set of guidelines for third-party and outsourced IT services.'],
 [6,'Sample: CERT-In advisory on log retention scope',46,'certin','CERT-In','names "CERT-In"','notification','A made-up advisory clarifying which logs must be kept and where.'],
 [7,'Sample: consultation on sustainability disclosure formats',27,'','','','regulation','A made-up consultation about annual sustainability reporting formats.'],
 [8,'Sample: regulator opens new office and appoints spokesperson',6,'','','','','A made-up press note with little compliance relevance.']];
const sampleState=()=>{const s=S();if(!s.feedInbox)s.feedInbox={};return s.feedInbox};
function sampleItems(){const st=sampleState();return SAMPLES.map(([n,title,score,fw,code,why,kw,summary])=>{const id='SAMPLE-'+n,x=st[id]||{};
 const matched=[];if(fw)matched.push({fw,code,why});if(kw)matched.push({fw:'',code:'Keywords',why:kw});
 return{id,title,link:'',published:addDays(TODAY,-n*2)+'T09:00:00.000Z',summary:summary+' ('+SAMPLE_NOTE+'.)',feed_name:'Sample feed (built in)',feed_jur:'',status:x.status||'New',score,matched,converted:x.converted||null,sample:true}})}

// ---------------------------------------------------------------- data
async function api(m,u,b){const r=await G.api.call(m,u,b);return r}
async function loadCatalogue(){
 if(catalogue)return;catalogue=[];
 try{if(live()){const r=await api('GET','/api/regfeed/catalogue');if(r.ok)catalogue=r.data.sources||[]}
  else{const r=await fetch('server/regfeed-sources.json');if(r.ok)catalogue=(await r.json()).sources||[]}}catch{}}
async function load(){
 if(!live()||loading)return;loading=true;err='';
 try{const q='profile='+encodeURIComponent(G.PROF);
  const [f,i]=await Promise.all([api('GET','/api/regfeed/feeds?'+q),api('GET','/api/regfeed/items?'+q)]);
  if(!f.ok||!i.ok)err=(f.data&&f.data.error)||(i.data&&i.data.error)||'Could not load the feed inbox.';
  else{feeds=f.data.feeds;items=i.data.items}
  await loadCatalogue();loaded=true}
 catch(e){err='Could not reach the server.'}
 loading=false;render()}
const all=()=>live()?items:sampleItems();

// ---------------------------------------------------------------- rendering
const lvl=s=>s>=70?['High','red']:s>=40?['Medium','amber']:['Low','green'];
const when=iso=>iso?fmt(String(iso).slice(0,10)):'date not given';
const STATUS_K={New:'blue',Triaged:'amber',Dismissed:'green',Converted:'green'};
const safeHref=u=>/^https?:\/\/[^\s"<>]+$/i.test(u||'')?u:'';
function inbox(){
 const rows=all().filter(i=>(F.status==='Active'?(i.status==='New'||i.status==='Triaged'):!F.status||F.status==='All'||i.status===F.status)&&i.score>=F.min&&(!F.jur||i.feed_jur===F.jur));
 const jurs=[...new Set(all().map(i=>i.feed_jur).filter(Boolean))].sort(),names=(G.jur&&G.jur.names)||{};
 const sel=(id,label,opts,cur)=>`<div class="rf-f"><label for="${id}">${label}</label><select class="select" id="${id}">${opts.map(([v,l])=>`<option value="${E(v)}"${String(v)===String(cur)?' selected':''}>${E(l)}</option>`).join('')}</select></div>`;
 const w=canWork();
 const trs=rows.map(i=>{const [lv,k]=lvl(i.score),href=safeHref(i.link),why=(i.matched||[]).map(m=>`<li><b>${E(m.code||'')}</b>${m.why?': '+E(m.why):''}</li>`).join('');
  return `<tr style="cursor:default" data-rf-item="${E(i.id)}"><td style="white-space:normal;min-width:260px"><div class="riskname">${E(i.title)}</div><div class="riskarea">${E(i.feed_name||'')} · ${E(when(i.published))}${i.sample?` · <b>${SAMPLE_NOTE}</b>`:''}</div>${i.summary?`<div class="riskarea" style="white-space:normal;line-height:1.5">${E(i.summary.length>220?i.summary.slice(0,218)+'…':i.summary)}</div>`:''}</td>
  <td style="min-width:200px;white-space:normal"><div>${bar(i.score,k)}</div><div class="riskarea"><b>Relevance ${i.score} of 100 (${lv})</b></div>${why?`<details><summary class="riskarea" style="cursor:pointer">Why it matched</summary><ul class="rf-why">${why}</ul></details>`:'<div class="riskarea">No framework or keyword matched.</div>'}</td>
  <td>${pill(i.status,STATUS_K[i.status]||'blue')}${i.converted?`<div class="riskarea">Record ${E(i.converted)}</div>`:''}</td>
  <td style="white-space:normal"><div class="op-btns" style="margin:0">${href?`<a class="op-mini" href="${E(href)}" target="_blank" rel="noopener noreferrer">Open source<span class="rf-sr"> (opens in a new tab)</span></a>`:`<span class="riskarea">${i.sample?'No source (sample)':'No source link'}</span>`}
  ${w&&i.status!=='Converted'?`<button class="op-mini p" data-op="rf-convert" data-id="${E(i.id)}">Convert to change record</button>${i.status!=='Triaged'?`<button class="op-mini" data-op="rf-set" data-st="Triaged" data-id="${E(i.id)}">Mark triaged</button>`:''}${i.status!=='Dismissed'?`<button class="op-mini" data-op="rf-set" data-st="Dismissed" data-id="${E(i.id)}">Dismiss</button>`:`<button class="op-mini" data-op="rf-set" data-st="New" data-id="${E(i.id)}">Restore</button>`}`:''}</div></td></tr>`});
 const banner=live()?'':`<div class="op-banner amber" role="note"><div><b>Demo mode: sample items only</b><div>Nothing here comes from a regulator. Sign in to a Forge GRC server to watch real feeds. You can still convert a sample into a real change record to try the flow.</div></div></div>`;
 const eb=err?`<div class="op-banner red" role="alert"><div><b>Problem</b><div>${E(err)}</div></div></div>`:'';
 return banner+eb+`<div class="toolbar" style="gap:12px;align-items:flex-end">${sel('rfStatus','Status',[['Active','New and triaged'],['New','New'],['Triaged','Triaged'],['Dismissed','Dismissed'],['Converted','Converted'],['All','All']],F.status)}${sel('rfMin','Minimum relevance',[[0,'Any'],[20,'20 or more'],[40,'40 or more (medium)'],[60,'60 or more'],[70,'70 or more (high)']],F.min)}${jurs.length?sel('rfJur','Jurisdiction',[['','All'],...jurs.map(j=>[j,names[j]||j])],F.jur):''}${live()&&canWork()?'<button class="btn" data-op="rf-refresh">Refresh now</button>':''}</div>`
  +card('Feed inbox',`${rows.length} of ${all().length} items shown, most relevant first${live()?'':' · SAMPLE DATA'}`,table(['Item','Relevance','Status','Actions'],trs,live()?(feeds.length?'No items match the filters.':'No feeds yet. Add one on the Sources tab.'):'No sample items match the filters.'))}
function sources(){
 const adm=isAdmin();
 if(!live())return `<div class="op-banner amber" role="note"><div><b>Feeds need the server</b><div>In demo mode the app cannot fetch regulator feeds. The suggested sources below can be added once you sign in to a Forge GRC server as an administrator.</div></div></div>`+cat(false);
 const fr=feeds.map(f=>`<tr style="cursor:default"><td style="white-space:normal"><div class="riskname">${E(f.name)}</div><div class="riskarea" style="word-break:break-all">${E(f.url)}</div></td><td>${E(f.jur||'—')}</td><td>${E(f.kind||'')}</td><td>${f.interval_min} min</td><td>${f.last_ok?E(new Date(f.last_ok).toLocaleString()):'never'}</td><td style="white-space:normal">${f.last_err?pill('Error','red')+' '+E(f.last_err):pill('OK','green')}</td><td style="white-space:normal">${canWork()?`<button class="op-mini" data-op="rf-refresh" data-id="${E(f.id)}">Refresh now</button>`:''}${adm?` <button class="op-mini" data-op="rf-del" data-id="${E(f.id)}" aria-label="Remove ${E(f.name)}">Remove</button>`:''}</td></tr>`);
 return (err?`<div class="op-banner red" role="alert"><div><b>Problem</b><div>${E(err)}</div></div></div>`:'')+card('Watched feeds',`${feeds.length} of 20 · the server refreshes each feed on its own interval`,table(['Feed','Jurisdiction','Kind','Interval','Last refreshed','Status','Actions'],fr,'No feeds yet.'),adm?'<button class="btn primary" data-op="rf-add">＋ Add feed</button> ':'<span class="riskarea">Only an administrator can add or remove feeds.</span>')+cat(adm)}
function cat(adm){
 const rows=(catalogue||[]).map((s,i)=>`<tr style="cursor:default"><td style="white-space:normal"><div class="riskname">${E(s.name)}</div><div class="riskarea" style="white-space:normal">${E(s.note||'')}</div></td><td>${E(s.jur)}</td><td>${pill(s.kind==='feed'?'Feed':'Web page, feed URL needed',s.kind==='feed'?'blue':'amber')} ${pill('Not verified','amber')}</td><td style="word-break:break-all">${s.url?E(s.url):'<span class="riskarea">no address found</span>'}</td><td>${adm?`<button class="op-mini" data-op="rf-cat" data-i="${i}">${s.kind==='feed'&&s.url?'Add':'Add with your feed URL'}</button>`:''}</td></tr>`);
 return card('Suggested sources','Taken from web search results and not tested. Confirm each address works before relying on it.',table(['Source','Jurisdiction','Type','Address','Action'],rows,catalogue===null?'Loading…':'No suggestions available.'))}
function render(){
 const pn=panel('regchange','feed');if(!pn)return;
 if(live()&&!loaded&&!loading){load()}
 if(!catalogue&&!live())loadCatalogue().then(render);
 const sub=pn.dataset.sub||'inbox';
 pn.innerHTML=`<div class="libtabs" role="tablist" aria-label="Feed inbox sections" style="margin:0 0 12px"><button class="libtab${sub==='inbox'?' active':''}" role="tab" aria-selected="${sub==='inbox'}" data-op="rf-sub" data-sub="inbox">Inbox</button><button class="libtab${sub==='sources'?' active':''}" role="tab" aria-selected="${sub==='sources'}" data-op="rf-sub" data-sub="sources">Sources</button></div>`+(sub==='inbox'?inbox():sources());
}
G.renders.push(render);
document.addEventListener('change',e=>{const t=e.target,m={rfStatus:'status',rfMin:'min',rfJur:'jur'}[t.id];if(!m)return;F[m]=m==='min'?+t.value:t.value;render();const n=document.getElementById(t.id);if(n)n.focus()});

// ---------------------------------------------------------------- converting an item (demo path; live conversion happens on the server)
const nextRc=()=>(S().regchg||[]).reduce((m,r)=>Math.max(m,+String(r.id).slice(3)||0),0)+1;
function convertLocal(i){
 const s=S();if(!s.regchg)s.regchg=[];const id='RC-'+String(nextRc()).padStart(3,'0'),fws=(i.matched||[]).filter(m=>m.fw);
 const adopted=new Set((s.obl||[]).map(o=>o.fw)),pub=String(i.published||'').slice(0,10)||TODAY;
 const rec={id,title:i.title,source:i.feed_name,type:'Guidance',published:pub,effective:addDays(pub,120),impact:i.score>=70?'High':i.score>=40?'Medium':'Low',status:'New',owner:G.me().name,fw:(fws.find(m=>adopted.has(m.fw))||fws[0]||{fw:''}).fw,summary:i.summary,obligations:[],
  notes:`${i.sample?SAMPLE_NOTE+'. ':''}From feed "${i.feed_name}" (relevance ${i.score}/100). Effective date is a placeholder (published + 120 days): confirm from the source.`,link:i.link||'',feedItem:i.id};
 s.regchg.push(rec);sampleState()[i.id]={status:'Converted',converted:id};logIt(id,`Created from feed item: ${i.title}`);commit();return id}

// ---------------------------------------------------------------- actions
const find=id=>all().find(x=>x.id===id);
Object.assign(actions,{
 'rf-sub':b=>{const pn=panel('regchange','feed');pn.dataset.sub=b.dataset.sub;render()},
 'rf-convert':async b=>{const i=find(b.dataset.id);if(!i)return;
  if(!live()){const id=convertLocal(i);toast(`${id} created from the sample item. Open Change register to see it.`);return}
  const r=await api('POST','/api/regfeed/items/'+encodeURIComponent(i.id)+'/convert',{profile:G.PROF});
  if(!r.ok){toast(r.data.error||'Could not convert this item.');return}
  toast(`${r.data.id} created in the change register.`);await load()},
 'rf-set':async b=>{const i=find(b.dataset.id);if(!i)return;const st=b.dataset.st;
  if(!live()){sampleState()[i.id]={...(sampleState()[i.id]||{}),status:st};G.save();render();toast(`Sample item marked ${st.toLowerCase()}.`);return}
  const r=await api('POST','/api/regfeed/items/'+encodeURIComponent(i.id),{status:st});if(!r.ok){toast(r.data.error||'Could not update the item.');return}
  i.status=st;render();toast(`Item marked ${st.toLowerCase()}.`)},
 'rf-refresh':async b=>{if(!live())return;toast('Refreshing…');const r=await api('POST','/api/regfeed/refresh',{profile:G.PROF,...(b.dataset.id?{feed:b.dataset.id}:{})});
  if(!r.ok){toast(r.data.error||'Refresh failed.');return}
  const added=r.data.results.reduce((n,x)=>n+(x.added||0),0),bad=r.data.results.filter(x=>x.error).length;
  toast(`${added} new item${added===1?'':'s'}${bad?`, ${bad} feed${bad===1?'':'s'} with errors (see Sources)`:''}.`);await load()},
 'rf-add':()=>addForm({}),
 'rf-cat':b=>{const s=(catalogue||[])[+b.dataset.i];if(!s)return;addForm({name:s.name,url:s.kind==='feed'?s.url:'',jur:s.jur,hint:s.kind==='feed'?'':'This source is a web page. Paste its RSS or Atom feed address.'})},
 'rf-del':async b=>{const f=feeds.find(x=>x.id===b.dataset.id);if(!f||!confirm(`Remove ${f.name}? Its items that were not converted are deleted.`))return;
  const r=await api('DELETE','/api/regfeed/feeds/'+encodeURIComponent(f.id));toast(r.ok?'Feed removed.':(r.data.error||'Could not remove.'));await load()}});
function addForm(d){
 const jurs=Object.entries((G.jur&&G.jur.names)||{IN:'India',EU:'EU',UK:'UK',US:'United States'});
 openForm('Add feed',[{name:'name',label:'Name',full:true,value:d.name||'',ph:'e.g. SEBI circulars'},{name:'url',label:'Feed address (https, RSS or Atom)'+(d.hint?' · '+d.hint:''),full:true,value:d.url||'',ph:'https://…'},{name:'jur',label:'Jurisdiction',type:'select',options:[['','— any —'],...jurs],value:d.jur||''},{name:'kind',label:'Kind',type:'select',options:['Regulator','Law firm','Government','Standards body','Other'],value:'Regulator'},{name:'interval_min',label:'Check every (minutes, 15 to 1440)',type:'number',value:'360'}],'Add feed',v=>{
  if(!v.name||!/^https?:\/\//i.test(v.url))return 'Enter a name and a feed address starting with https://';
  api('POST','/api/regfeed/feeds',{profile:G.PROF,name:v.name,url:v.url,jur:v.jur,kind:v.kind,interval_min:+v.interval_min||360}).then(async r=>{
   if(!r.ok){toast(r.data.error||'Could not add the feed.');return}
   toast('Feed added. Fetching it now…');await api('POST','/api/regfeed/refresh',{profile:G.PROF,feed:r.data.feed.id});await load()})})}

// ---------------------------------------------------------------- source link on the change record
G.drawerHooks.push(d=>{if(!d||d.type!=='regchange')return;const r=(S().regchg||[]).find(x=>x.id===d.id),body=document.getElementById('opDB'),href=r&&safeHref(r.link);
 if(!body||!href||body.querySelector('#rfSrc'))return;const box=document.createElement('div');box.id='rfSrc';
 box.innerHTML=`<h4>Source</h4><p class="op-note" style="font-size:11px"><a href="${E(href)}" target="_blank" rel="noopener noreferrer">${E(href)}</a> (opens in a new tab)${r.feedItem?' · from the feed inbox':''}</p>`;body.appendChild(box)});

// ---------------------------------------------------------------- make the tab appear (the view has one tab, so it has no tab bar yet)
(function(){
 const view=document.getElementById('view-regchange');if(!view||view.querySelector('[data-panel="regchange:feed"]'))return;
 let tabs=document.getElementById('opTabs-regchange');
 if(!tabs){tabs=document.createElement('div');tabs.className='libtabs';tabs.id='opTabs-regchange';tabs.innerHTML='<button class="libtab active" data-op="tab" data-view="regchange" data-tab="register">Change register</button>';
  const ph=view.querySelector('.pagehead');ph.parentNode.insertBefore(tabs,ph.nextSibling)}
 const b=document.createElement('button');b.className='libtab';b.dataset.op='tab';b.dataset.view='regchange';b.dataset.tab='feed';b.textContent='Feed inbox';tabs.appendChild(b);
 const p=document.createElement('div');p.className='op-panel';p.dataset.panel='regchange:feed';view.appendChild(p);
 tabs.addEventListener('click',e=>{if(e.target.dataset&&e.target.dataset.tab==='feed'&&live()){loaded=false;setTimeout(()=>{if(!loading)load()},0)}});
 const css=document.createElement('style');css.textContent='.rf-f{display:flex;flex-direction:column;gap:3px}.rf-f label{font:600 10px "DM Sans",sans-serif;color:#44566a}.rf-why{margin:4px 0 0 16px;padding:0;font-size:10px;line-height:1.5;color:#425065}.rf-sr{position:absolute;left:-9999px}';document.head.appendChild(css)})();
(G.connectHooks=G.connectHooks||[]).push(()=>{loaded=false;items=[];feeds=[];load()});
G.renderAll();
})();
