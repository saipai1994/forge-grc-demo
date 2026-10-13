// Settings (appetite, targets, currency, date mode), daily metric snapshots and real trends.
(function(){
const G=window.GRC;if(!G)return;
const {E,fmt,pill,table,card,toast,logIt,commit,actions,TODAY,addDays,dTo,openForm,panel,head}=G;
const S=()=>G.S(),O=()=>G.org();
const isAdmin=()=>G.me().role==='Administrator';

// ---------------------------------------------------------------- currency and number format
const CURS={INR:['₹','en-IN'],USD:['$','en-US'],EUR:['€','en-IE'],GBP:['£','en-GB'],AED:['AED ','en-AE'],SGD:['S$','en-SG'],AUD:['A$','en-AU'],CAD:['C$','en-CA'],CHF:['CHF ','de-CH'],ZAR:['R','en-ZA'],JPY:['¥','ja-JP'],NZD:['NZ$','en-NZ'],PHP:['₱','en-PH'],SAR:['SAR ','en-SA'],QAR:['QAR ','en-QA'],BHD:['BHD ','en-BH'],OMR:['OMR ','en-OM'],KWD:['KWD ','en-KW']};
G.cur=()=>{const c=(O().profile.currency||'INR').toUpperCase(),d=CURS[c]||CURS.INR;return{code:CURS[c]?c:'INR',sym:d[0],loc:d[1]}};
const DEFAULT_T={controls:85,attest:80,oblig:90};
G.target=k=>{const t=S().targets||{};return t[k]!=null?t[k]:DEFAULT_T[k]};

// ---------------------------------------------------------------- the metrics we keep history for
const METRICS=[
 {k:'out',label:'Risks above appetite',low:true,fmt:v=>String(v)},
 {k:'red',label:'Indicators in red',low:true,fmt:v=>String(v)},
 {k:'open',label:'Open issues',low:true,fmt:v=>String(v)},
 {k:'od',label:'Overdue issues',low:true,fmt:v=>String(v)},
 {k:'ctl',label:'Control effectiveness',low:false,fmt:v=>v+'%'},
 {k:'obl',label:'Obligations compliant',low:false,fmt:v=>v+'%'},
 {k:'due',label:'Tests due or overdue',low:true,fmt:v=>String(v)},
 {k:'net',label:'Net losses to date',low:true,fmt:v=>G.inr(v)}];
G.METRICS=METRICS;
function compute(){const m=G.metrics({});return{out:m.out.length,red:m.red.length,open:m.open.length,od:m.od.length,ctl:m.controls.length?Math.round(m.eff.length/m.controls.length*100):0,obl:m.obl.length?Math.round(m.oc.length/m.obl.length*100):0,due:m.due.length,net:m.net}}

// ---------------------------------------------------------------- daily snapshots
let timer=null;
function snapshot(){
 try{
  if(!G.metrics)return;const s=S();if(!s.snaps)s.snaps={};
  const cur=compute(),prev=s.snaps[TODAY];let ch=false;
  if(!prev||JSON.stringify(prev)!==JSON.stringify(cur)){s.snaps[TODAY]=cur;ch=true}
  const mode=O().profile.mode;
  if(!ch&&Object.keys(s.snaps).length>1)return;
  if(Object.keys(s.snaps).length<=1&&mode!=='clean'&&!s.snapsDemo){backfill(s,cur);ch=true}
  const keys=Object.keys(s.snaps).sort();if(keys.length>400){keys.slice(0,keys.length-400).forEach(k=>delete s.snaps[k]);ch=true}
  if(ch){G.save();G.renderAll()}
 }catch(e){console.warn('snapshot failed',e)}
}
// Sample data has no history, so a trial would show empty trends. We draw twelve weeks of plausible movement
// ending at today's real numbers and label it clearly as illustrative. It is never created for a clean start.
function backfill(s,cur){
 s.snapsDemo=true;let seed=0;for(const c of PROFKEY())seed=(seed*31+c.charCodeAt(0))>>>0;
 const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 let v={...cur};
 for(let w=1;w<=12;w++){
  const nv={};for(const k in v){const pct=(k==='ctl'||k==='obl'),step=pct?Math.round((rnd()-0.4)*5):Math.round((rnd()-0.5)*3);
   nv[k]=k==='net'?Math.max(0,Math.round(v[k]*(1-rnd()*0.12))):Math.max(0,pct?Math.min(100,v[k]+step):v[k]+step)}
  v=nv;s.snaps[addDays(TODAY,-7*w)]=v}
}
const PROFKEY=()=>G.PROF||'x';
G.renders.push(()=>{clearTimeout(timer);timer=setTimeout(snapshot,1200)});

// ---------------------------------------------------------------- reading trends
G.trendOf=(key,days)=>{
 days=days||7;const s=S().snaps||{},dates=Object.keys(s).sort();if(!dates.length)return null;
 const series=dates.filter(d=>s[d][key]!=null).map(d=>({date:d,v:s[d][key]}));if(series.length<2)return null;
 const want=addDays(TODAY,-days);let ref=null;for(const x of series){if(x.date<=want)ref=x}
 const cur=series[series.length-1];if(!ref||ref.date===cur.date)ref=series[0];if(ref.date===cur.date)return null;
 return{cur:cur.v,prev:ref.v,delta:cur.v-ref.v,days:Math.max(1,Math.round((new Date(cur.date)-new Date(ref.date))/86400000)),series,demo:!!S().snapsDemo}};

// ---------------------------------------------------------------- Settings tab (Organisation)
function renderSettings(){
 const pn=panel('org','settings');if(!pn)return;const s=S(),adm=isAdmin(),c=G.cur(),t=k=>G.target(k);
 const row=(l,v,h)=>`<tr style="cursor:default"><td style="width:260px;color:#677280">${l}${h?`<div class="riskarea">${h}</div>`:''}</td><td>${v}</td></tr>`;
 const dateMode=(()=>{try{return localStorage.getItem('forgeGrcDate')==='real'?'real':'demo'}catch{return 'demo'}})();
 pn.innerHTML=card('Settings','Used by dashboards, tiles and reports',table(['Setting','Value'],[
  row('Risk appetite',`Residual score above ${s.appetite}`,'Risks above this show as outside appetite'),
  row('Target: control effectiveness',t('controls')+'%','Share of controls rated effective'),
  row('Target: policy attestation',t('attest')+'%','Average share of the audience that has attested'),
  row('Target: obligations compliant',t('oblig')+'%','Share of in-scope obligations rated compliant'),
  row('Reporting currency',`${E(c.code)} (${E(c.sym.trim())}) · numbers formatted for ${E(c.loc)}`),
  row('Date used by the app',dateMode==='real'?'Today\'s real date':'Fixed demo date, so sample data stays current',dateMode==='real'?'Due dates, ageing and snapshots use the real calendar':'Switch to the real date when you start with your own data'),
  row('History for trends',`${Object.keys(s.snaps||{}).length} daily snapshot(s)${s.snapsDemo?' · illustrative history, because the sample data has none':''}`)]),
  adm?'<button class="op-mini p" data-op="set-edit">Edit settings</button> <button class="op-mini" data-op="set-date">'+(dateMode==='real'?'Use demo date':'Use real date')+'</button>':'');
}
G.renders.push(renderSettings);
actions['set-edit']=()=>{
 if(!isAdmin()){toast('Only an administrator can change settings.');return}
 const s=S(),c=G.cur();
 openForm('Settings',[{name:'appetite',label:'Risk appetite (residual score, 1 to 25)',type:'number',value:s.appetite},{name:'tc',label:'Target: control effectiveness (%)',type:'number',value:G.target('controls')},{name:'ta',label:'Target: policy attestation (%)',type:'number',value:G.target('attest')},{name:'to',label:'Target: obligations compliant (%)',type:'number',value:G.target('oblig')},{name:'cur',label:'Reporting currency',type:'select',options:Object.keys(CURS),value:c.code}],'Save',v=>{
  const n=(x,lo,hi)=>{x=Number(x);return Number.isFinite(x)&&x>=lo&&x<=hi?Math.round(x):null};
  const ap=n(v.appetite,1,25),tc=n(v.tc,1,100),ta=n(v.ta,1,100),to=n(v.to,1,100);
  if(ap==null||tc==null||ta==null||to==null)return 'Appetite must be 1 to 25 and targets 1 to 100.';
  s.appetite=ap;s.targets={controls:tc,attest:ta,oblig:to};O().profile.currency=v.cur;logIt('SETTINGS','Settings updated.');commit()});
};
actions['set-date']=()=>{if(!isAdmin()){toast('Only an administrator can change this.');return}
 const real=(()=>{try{return localStorage.getItem('forgeGrcDate')==='real'}catch{return false}})();
 try{localStorage.setItem('forgeGrcDate',real?'demo':'real')}catch{}toast('Switching date mode…');setTimeout(()=>location.reload(),600)};

// ---------------------------------------------------------------- make the settings tab appear
(function(){const tabs=document.getElementById('opTabs-org');if(!tabs||tabs.querySelector('[data-tab="settings"]'))return;
 const b=document.createElement('button');b.className='libtab';b.dataset.op='tab';b.dataset.view='org';b.dataset.tab='settings';b.textContent='Settings';tabs.appendChild(b);
 const p=document.createElement('div');p.className='op-panel';p.dataset.panel='org:settings';tabs.parentNode.appendChild(p)})();
G.renderAll();
})();
