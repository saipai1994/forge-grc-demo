// Fiori-style experience: a Horizon-like theme, a Home launchpad of live tiles with search, and an
// Overview page of analytical, list and table cards with a filter bar. Every tile, bar, segment and
// row opens the records behind it, using the same drawers and trail as the rest of the app.
(function(){
const G=window.GRC;if(!G)return;
const {E,fmt,pill,inr,TODAY,dTo,addDays,actions,risks,openDrawer,me,PROF}=G;
const S=()=>G.S();
const FREQ={Monthly:30,Quarterly:91,'Semi-annual':182,Annual:365};

// ---------------------------------------------------------------- palette (validated, see docs)
const C={brand:'#0070F2',s1:'#2a78d6',s2:'#eb6834',s3:'#1baf7a',ink:'#1D2D3E',sub:'#556B82',line:'#D9D9D9',grid:'#E8EAED',
 good:'#256F3A',goodBg:'#EAF4EC',crit:'#E76500',critTxt:'#B44F00',critBg:'#FFF1E3',neg:'#AA0808',negBg:'#FCEBEB',neu:'#5B738B',neuBg:'#EEF1F4'};
const ST={good:{c:C.good,bg:C.goodBg,i:'✔',l:'Good'},critical:{c:C.critTxt,bg:C.critBg,i:'▲',l:'Critical'},negative:{c:C.neg,bg:C.negBg,i:'✖',l:'Negative'},neutral:{c:C.ink,bg:C.neuBg,i:'●',l:'Neutral'}};
const fill={good:C.good,critical:C.crit,negative:C.neg,neutral:C.neu};
const RATING={Critical:'negative',High:'critical',Medium:'neutral',Low:'good'};
const ids=a=>a.map(x=>x&&typeof x==='object'?x.id:x).filter(Boolean);
const pct=(a,b)=>b?Math.round(a/b*100):0;
const sum=a=>a.reduce((t,x)=>t+x,0);

// ---------------------------------------------------------------- theme
const THEME_KEY='forgeGrcTheme';
const getTheme=()=>{try{return localStorage.getItem(THEME_KEY)||'fiori'}catch{return 'fiori'}};
const css=document.createElement('style');css.id='fxCss';css.textContent=`
body.fiori{--bg:#F5F6F7;--ink:#1D2D3E;--muted:#556B82;--line:#D9D9D9;--teal:#256F3A;font-family:"72","72full","Segoe UI","Helvetica Neue",Arial,sans-serif}
body.fiori .card{border-radius:16px;border:0;box-shadow:0 0 .125rem #00000026,0 .125rem .25rem #0000001f}
body.fiori .title,body.fiori h1,body.fiori h2,body.fiori h3{font-family:"72","72full","Segoe UI",Arial,sans-serif;letter-spacing:0;color:#1D2D3E}
body.fiori .title{font-weight:700;font-size:24px}
body.fiori .subtitle{color:#556B82}
body.fiori .topbar{background:#fff;border-bottom:1px solid #D9D9D9;box-shadow:0 2px 4px #0000000d}
body.fiori .sidebar{background:#fff;color:#556B82;border-right:1px solid #D9D9D9}
body.fiori .brand{color:#1D2D3E}body.fiori .brand small{color:#556B82}
body.fiori .brandmark{background:#0070F2;color:#fff}
body.fiori .plant{background:#F5F6F7;border:1px solid #E5E5E5;border-radius:12px}body.fiori .plant-label,body.fiori .plant-loc{color:#556B82}body.fiori .plant-name{color:#1D2D3E}
body.fiori .navlabel{color:#6A7B8C}
body.fiori .nav button{color:#32363A;border-radius:8px;font-size:13px}
body.fiori .nav button:hover{background:#EBF5FE;color:#0064D9}
body.fiori .nav button.active{background:#EBF5FE;color:#0064D9;font-weight:700;box-shadow:inset 3px 0 0 #0070F2}
body.fiori .nav .badge{background:#AA0808;color:#fff}
body.fiori .btn{border-radius:8px;border:1px solid #BCC3CA;color:#0064D9;background:#fff;font-weight:600}
body.fiori .btn:hover{background:#EBF5FE}
body.fiori .btn.primary{background:#0070F2;border-color:#0070F2;color:#fff}body.fiori .btn.primary:hover{background:#0064D9}
body.fiori th{background:#fff;color:#556B82;text-transform:none;font:700 12px "72","72full","Segoe UI",Arial,sans-serif;letter-spacing:0;border-top:0;border-bottom:1px solid #D9D9D9}
body.fiori td{border-bottom:1px solid #EDEFF1}
body.fiori tbody tr:hover{background:#F5FAFF}
body.fiori .libtab.active{color:#0064D9;border-bottom-color:#0070F2}
body.fiori .op-link{border-radius:8px}
body.fiori .detailmodal{border-radius:16px}
body.fiori .op-banner{border-radius:12px}
#gcPill,#fxTheme{font-family:inherit}

/* Home and Overview */
.fx{--gap:16px}
.fx-hello{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:18px}
.fx-hello h1{font:700 26px/1.2 "72","72full","Segoe UI",Arial,sans-serif;margin:0;color:#1D2D3E}
.fx-hello p{margin:4px 0 0;color:#556B82;font-size:13px}
.fx-search{position:relative;flex:1;min-width:240px;max-width:460px}
.fx-search input{width:100%;box-sizing:border-box;border:1px solid #BCC3CA;border-radius:18px;padding:10px 16px 10px 38px;font:14px "72","72full","Segoe UI",Arial,sans-serif;background:#fff;color:#1D2D3E}
.fx-search input:focus{outline:2px solid #0070F2;outline-offset:1px;border-color:#0070F2}
.fx-search:before{content:"⌕";position:absolute;left:14px;top:7px;font-size:19px;color:#556B82}
.fx-results{position:absolute;left:0;right:0;top:44px;background:#fff;border-radius:12px;box-shadow:0 8px 28px #00000033;z-index:30;max-height:420px;overflow:auto;padding:6px 0}
.fx-results h5{margin:8px 14px 4px;font:700 11px "72","72full",Arial,sans-serif;color:#556B82;text-transform:uppercase;letter-spacing:.5px}
.fx-results [data-op]{display:flex;justify-content:space-between;gap:10px;padding:8px 14px;cursor:pointer;font-size:13px;color:#1D2D3E}
.fx-results [data-op]:hover,.fx-results [data-op]:focus{background:#EBF5FE;outline:0}
.fx-results small{color:#556B82}
.fx-group{margin:0 0 22px}
.fx-group>h2{font:700 14px "72","72full","Segoe UI",Arial,sans-serif;color:#556B82;margin:0 0 10px 2px}
.fx-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-flow:dense;gap:var(--gap)}#view-launchpad>.pagehead{display:none}
.fx-tile{background:#fff;border-radius:16px;box-shadow:0 0 .125rem #00000026,0 .125rem .25rem #0000001f;padding:14px 16px;min-height:150px;display:flex;flex-direction:column;cursor:pointer;transition:box-shadow .15s,transform .15s;position:relative;text-align:left;border:0;font-family:inherit;color:#1D2D3E}
.fx-tile:hover{box-shadow:0 0 .125rem #00000040,0 .5rem 1rem #00000026;transform:translateY(-1px)}
.fx-tile:focus-visible{outline:2px solid #0070F2;outline-offset:2px}
.fx-tile.wide{grid-column:span 2}
.fx-tile h4{margin:0;font:700 14px/1.3 "72","72full","Segoe UI",Arial,sans-serif;color:#1D2D3E}
.fx-tile .s{font-size:12px;color:#556B82;margin-top:2px}
.fx-tile .n{font:300 38px/1.1 "72","72full","Segoe UI",Arial,sans-serif;margin-top:auto;display:flex;align-items:baseline;gap:6px}
.fx-tile .n small{font-size:14px;color:#556B82;font-weight:400}
.fx-tile .f .fx-sem{white-space:normal}.fx-tile .f{font-size:12px;color:#556B82;margin-top:6px;display:flex;gap:6px;align-items:center;min-height:16px}
.fx-tile .ic{position:absolute;right:14px;top:12px;font-size:18px}
.fx-tile .chart{margin-top:8px}
.fx-tile.app{align-items:flex-start;justify-content:space-between;min-height:110px}
.fx-tile.app .ico{width:44px;height:44px;border-radius:50%;background:#EBF5FE;color:#0064D9;display:flex;align-items:center;justify-content:center;font-size:20px}
.fx-sem{white-space:nowrap;display:inline-flex;align-items:center;gap:4px;font-weight:700}
.fx-bar{display:flex;gap:16px;align-items:center;flex-wrap:wrap;background:#fff;border-radius:16px;box-shadow:0 0 .125rem #00000026,0 .125rem .25rem #0000001f;padding:10px 16px;margin-bottom:16px}
.fx-bar label{font-size:12px;color:#556B82;display:flex;flex-direction:column;gap:3px;font-weight:600}
.fx-bar select{border:1px solid #BCC3CA;border-radius:8px;padding:7px 10px;font:13px "72","72full","Segoe UI",Arial,sans-serif;background:#fff;color:#1D2D3E;min-width:150px}
.fx-bar .sp{flex:1}
.fx-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:stretch}
.fx-card{background:#fff;border-radius:16px;box-shadow:0 0 .125rem #00000026,0 .125rem .25rem #0000001f;display:flex;flex-direction:column;min-width:0}
.fx-card.span2{grid-column:span 2}.fx-card.span3{grid-column:span 3}
.fx-card header{padding:16px 16px 0;display:flex;justify-content:space-between;gap:12px}
.fx-card h3{margin:0;font:700 14px/1.3 "72","72full","Segoe UI",Arial,sans-serif;color:#1D2D3E}
.fx-card header p{margin:2px 0 0;font-size:12px;color:#556B82}
.fx-card .kpi{text-align:right;white-space:nowrap}.fx-card .kpi b{font:300 28px/1 "72","72full","Segoe UI",Arial,sans-serif;display:block}.fx-card .kpi span{font-size:11.5px;font-weight:700}
.fx-card .body{padding:12px 16px;flex:1;overflow-x:auto;min-width:0}
.fx-card footer{padding:8px 16px 12px;border-top:1px solid #EDEFF1;font-size:12px}
.fx-card footer button{border:0;background:none;color:#0064D9;font:600 12px "72","72full","Segoe UI",Arial,sans-serif;cursor:pointer;padding:2px 0}
.fx-card footer button:hover{text-decoration:underline}
.fx-list>[data-op]{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:9px 6px;border-bottom:1px solid #EDEFF1;cursor:pointer;border-radius:6px}
.fx-list>[data-op]:last-child{border-bottom:0}.fx-list>[data-op]:hover,.fx-list>[data-op]:focus-visible{background:#F5FAFF;outline:0}
.fx-list b{font-weight:600;font-size:13px;color:#1D2D3E;display:block}.fx-list small{color:#556B82;font-size:12px}
.fx-hb [data-op]{display:grid;grid-template-columns:minmax(80px,32%) 1fr 34px;gap:10px;align-items:center;padding:5px 4px;cursor:pointer;border-radius:6px;font-size:12.5px}
.fx-hb [data-op]:hover{background:#F5FAFF}.fx-hb .t{height:12px;background:#EEF1F4;border-radius:0 6px 6px 0;overflow:hidden}.fx-hb .t i{display:block;height:100%;border-radius:0 6px 6px 0}.fx-hb .v{text-align:right;font-weight:700;color:#1D2D3E}
.fx-hb .l{color:#32363A;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fx-legend{display:flex;flex-direction:column;gap:5px;font-size:12.5px;justify-content:center}.fx-legend [data-op]{display:flex;gap:8px;align-items:center;cursor:pointer;padding:2px 4px;border-radius:6px}.fx-legend [data-op]:hover{background:#F5FAFF}
.fx-legend i{width:12px;height:12px;border-radius:3px;flex:none}.fx-legend b{margin-left:auto;padding-left:10px}
.fx-donut{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
.fx-tbl{width:100%;border-collapse:collapse;font-size:12.5px}.fx-tbl td,.fx-tbl th{padding:7px 6px;text-align:left}.fx-tbl tr[data-op]{cursor:pointer}
.fx-bul{display:grid;grid-template-columns:1fr 70px;gap:10px;align-items:center}
#fxTip{position:fixed;z-index:99999;background:#1D2D3E;color:#fff;padding:6px 10px;border-radius:8px;font:12px "72","72full","Segoe UI",Arial,sans-serif;pointer-events:none;display:none;max-width:260px;box-shadow:0 4px 14px #0004}
#fxMgr{position:fixed;inset:0;background:#00000066;z-index:99990;display:flex;align-items:center;justify-content:center;padding:16px}
#fxMgr .box{background:#fff;border-radius:16px;width:min(480px,100%);max-height:86vh;overflow:auto;padding:20px;box-shadow:0 20px 60px #0005}
#fxMgr h3{margin:0 0 4px;font:700 18px "72","72full",Arial,sans-serif}#fxMgr p{margin:0 0 12px;color:#556B82;font-size:13px}
#fxMgr .r{display:flex;align-items:center;gap:8px;padding:7px 4px;border-bottom:1px solid #EDEFF1;font-size:13px}#fxMgr .r span{flex:1}
#fxMgr .r button{border:1px solid #BCC3CA;background:#fff;border-radius:6px;padding:2px 8px;cursor:pointer}
@media(max-width:1100px){.fx-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.fx-card.span3{grid-column:span 2}}
@media(max-width:1000px){.fx-tiles{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:720px){.fx-tile{min-width:0;overflow:hidden;padding:12px}.fx-tile .n{font-size:28px;flex-wrap:wrap}.fx-tile .chart svg{max-width:100%}.fx-cards{grid-template-columns:1fr}.fx-card.span2,.fx-card.span3{grid-column:span 1}.fx-tile.wide{grid-column:span 1}.fx-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.fx-hb [data-op]{grid-template-columns:minmax(70px,38%) 1fr 30px}}
@media print{#fxTip{display:none!important}}`;
document.head.appendChild(css);
function applyTheme(){document.body.classList.toggle('fiori',getTheme()==='fiori');const s=document.getElementById('fxTheme');if(s)s.value=getTheme()}
const top=document.querySelector('.top-actions');
if(top){const s=document.createElement('select');s.id='fxTheme';s.className='select';s.title='Visual theme';s.setAttribute('aria-label','Visual theme');s.style.maxWidth='150px';s.innerHTML='<option value="fiori">Fiori Horizon</option><option value="classic">Classic</option>';s.onchange=()=>{try{localStorage.setItem(THEME_KEY,s.value)}catch{}applyTheme()};top.prepend(s)}
applyTheme();

// ---------------------------------------------------------------- tooltip
const tip=document.createElement('div');tip.id='fxTip';document.body.appendChild(tip);
document.addEventListener('mouseover',e=>{const t=e.target.closest&&e.target.closest('[data-tip]');if(t){tip.textContent=t.dataset.tip;tip.style.display='block'}else tip.style.display='none'});
document.addEventListener('mousemove',e=>{if(tip.style.display==='block'){tip.style.left=Math.min(innerWidth-270,e.clientX+14)+'px';tip.style.top=(e.clientY+16)+'px'}});

// ---------------------------------------------------------------- chart pieces (SVG / HTML, no libraries)
const dd=a=>`data-op="kpi" data-label="${E(a.label)}" data-ids="${E(ids(a.ids||[]).join(','))}"`;
function donut(segs,big,small,size){size=size||150;const r=size/2-14,c=2*Math.PI*r,tot=sum(segs.map(s=>s.value))||1;let off=0;const cx=size/2;
 const arcs=segs.filter(s=>s.value>0).map(s=>{const len=s.value/tot*c,gap=segs.filter(x=>x.value>0).length>1?2.5:0,d=Math.max(0.1,len-gap);const el=`<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${s.color}" stroke-width="22" stroke-dasharray="${d} ${c-d}" stroke-dashoffset="${-off}" transform="rotate(-90 ${cx} ${cx})" ${dd(s)} data-tip="${E(s.label)}: ${s.value} (${pct(s.value,tot)}%)" style="cursor:pointer"/>`;off+=len;return el}).join('');
 return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${E(small||'')}"><circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="#EEF1F4" stroke-width="22"/>${arcs}<text x="${cx}" y="${cx+4}" text-anchor="middle" font-size="26" font-weight="300" fill="${C.ink}">${E(big)}</text><text x="${cx}" y="${cx+22}" text-anchor="middle" font-size="11" fill="${C.sub}">${E(small||'')}</text></svg>`}
const legend=segs=>`<div class="fx-legend">${segs.map(s=>`<div ${dd(s)} tabindex="0"><i style="background:${s.color}"></i><span>${E(s.label)}</span><b>${s.value}</b></div>`).join('')}</div>`;
function hbar(items,color,max){max=max||Math.max(1,...items.map(i=>i.value));return `<div class="fx-hb">${items.map(i=>`<div ${dd(i)} tabindex="0" data-tip="${E(i.label)}: ${i.value}"><span class="l">${E(i.label)}</span><span class="t"><i style="width:${Math.max(i.value?3:0,i.value/max*100)}%;background:${i.color||color||C.s1}"></i></span><span class="v">${i.value}</span></div>`).join('')}</div>`}
function columns(items,color,h){h=h||120;const w=300,n=items.length,bw=Math.min(34,(w-20)/n-10),max=Math.max(1,...items.map(i=>i.value)),base=h-22;
 const gx=i=>10+(w-20)/n*(i+0.5);
 return `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img">${[0.5,1].map(f=>`<line x1="10" x2="${w-10}" y1="${base-(base-16)*f}" y2="${base-(base-16)*f}" stroke="${C.grid}" stroke-width="1"/>`).join('')}<line x1="10" x2="${w-10}" y1="${base}" y2="${base}" stroke="${C.line}" stroke-width="1"/>`+
  items.map((i,k)=>{const bh=Math.max(i.value?3:0,i.value/max*(base-16));const x=gx(k)-bw/2,y=base-bh;return `<g ${dd(i)} data-tip="${E(i.label)}: ${i.value}" style="cursor:pointer"><rect x="${gx(k)-(bw+10)/2}" y="0" width="${bw+10}" height="${h}" fill="transparent"/><path d="M${x},${base}V${y+4}Q${x},${y} ${x+4},${y}H${x+bw-4}Q${x+bw},${y} ${x+bw},${y+4}V${base}Z" fill="${i.color||color||C.s1}"/><text x="${gx(k)}" y="${y-4}" text-anchor="middle" font-size="11" font-weight="700" fill="${C.ink}">${i.value||''}</text><text x="${gx(k)}" y="${h-6}" text-anchor="middle" font-size="10.5" fill="${C.sub}">${E(i.label)}</text></g>`}).join('')+`</svg>`}
function line(pts,fmtv,h){h=h||120;const w=300,n=pts.length;if(!n)return '<p class="op-note">No data yet.</p>';const max=Math.max(1,...pts.map(p=>p.value)),base=h-22,top=18;
 const x=i=>n===1?w/2:16+(w-32)*i/(n-1),y=v=>base-(v/max)*(base-top);
 return `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img">${[0.5,1].map(f=>`<line x1="10" x2="${w-10}" y1="${base-(base-top)*f}" y2="${base-(base-top)*f}" stroke="${C.grid}"/>`).join('')}<line x1="10" x2="${w-10}" y1="${base}" y2="${base}" stroke="${C.line}"/>
 <polyline fill="none" stroke="${C.s1}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${pts.map((p,i)=>x(i)+','+y(p.value)).join(' ')}"/>`+
 pts.map((p,i)=>`<g ${p.ids?dd(p):''} data-tip="${E(p.label)}: ${E(fmtv?fmtv(p.value):p.value)}" style="cursor:pointer"><circle cx="${x(i)}" cy="${y(p.value)}" r="12" fill="transparent"/><circle cx="${x(i)}" cy="${y(p.value)}" r="4" fill="${C.s1}" stroke="#fff" stroke-width="2"/><text x="${x(i)}" y="${h-6}" text-anchor="middle" font-size="10.5" fill="${C.sub}">${E(p.label)}</text></g>`).join('')+`</svg>`}
function bullet(v,amber,red,unit){const max=Math.max(red*1.35,v*1.1,1),st=v>=red?'negative':v>=amber?'critical':'good';const w=x=>x/max*100;
 return `<div style="position:relative;height:14px;border-radius:7px;overflow:hidden;background:linear-gradient(90deg,${C.goodBg} ${w(amber)}%,${C.critBg} ${w(amber)}% ${w(red)}%,${C.negBg} ${w(red)}%)" data-tip="Value ${v}${unit||''} · amber ${amber}${unit||''} · red ${red}${unit||''}"><i style="position:absolute;left:0;top:4px;height:6px;width:${w(v)}%;background:${fill[st]};border-radius:3px"></i><b style="position:absolute;left:${w(amber)}%;top:0;bottom:0;width:1px;background:${C.crit}"></b><b style="position:absolute;left:${w(red)}%;top:0;bottom:0;width:2px;background:${C.neg}"></b></div>`}
function bulletHi(v,target){const lo=target-10,max=100,st=v>=target?'good':v>=lo?'critical':'negative',w=x=>x/max*100;
 return `<div style="position:relative;height:14px;border-radius:7px;overflow:hidden;background:linear-gradient(90deg,${C.negBg} ${w(lo)}%,${C.critBg} ${w(lo)}% ${w(target)}%,${C.goodBg} ${w(target)}%)" data-tip="Attested ${v}% · target ${target}%"><i style="position:absolute;left:0;top:4px;height:6px;width:${w(v)}%;background:${fill[st]};border-radius:3px"></i><b style="position:absolute;left:${w(target)}%;top:0;bottom:0;width:2px;background:${C.good}"></b></div>`}
function radial(p,st,size){size=size||64;const r=size/2-6,c=2*Math.PI*r,cx=size/2;return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${p}%"><circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="#EEF1F4" stroke-width="8"/><circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${fill[st]}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${c*Math.min(100,p)/100} ${c}" transform="rotate(-90 ${cx} ${cx})"/><text x="${cx}" y="${cx+4}" text-anchor="middle" font-size="13" font-weight="700" fill="${C.ink}">${p}%</text></svg>`}
function stack(segs){const tot=sum(segs.map(s=>s.value))||1;return `<div style="display:flex;height:16px;gap:2px;border-radius:8px;overflow:hidden">${segs.filter(s=>s.value>0).map(s=>`<i ${dd(s)} data-tip="${E(s.label)}: ${s.value}" style="flex:${s.value};background:${s.color};cursor:pointer"></i>`).join('')}</div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;font-size:11px;color:${C.sub}">${segs.map(s=>`<span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${s.color};margin-right:4px"></i>${E(s.label)} ${s.value}</span>`).join('')}</div>`}
const sem=(st,text)=>`<span class="fx-sem" style="color:${ST[st].c}"><span aria-hidden="true">${ST[st].i}</span>${E(text)}</span>`;

// ---------------------------------------------------------------- numbers behind tiles and cards
function M(f){
 f=f||{};const s=S(),ap=s.appetite;
 const filtered=!!(f.area||f.owner||f.rating);
 const rk=risks.filter(r=>(!f.area||r.area===f.area)&&(!f.owner||r.owner===f.owner)&&(!f.rating||r.rating===f.rating));
 const rid=new Set(rk.map(r=>r.id));
 const rOf=link=>{if(!link)return null;if(rid.has(link))return link;const c=s.controls.find(x=>x.id===link);if(c&&c.risks[0])return c.risks[0];const k=s.kris.find(x=>x.id===link);if(k)return k.risk;const l=s.losses.find(x=>x.id===link);return l?l.risk:null};
 const inScope=(riskIds,owner)=>!filtered||(riskIds||[]).some(i=>rid.has(i))||(!f.area&&!f.rating&&f.owner&&owner===f.owner);
 const controls=s.controls.filter(c=>inScope(c.risks,c.owner)&&(!f.area||!c.area||c.area===f.area||c.risks.some(i=>rid.has(i))));
 const kris=s.kris.filter(k=>inScope([k.risk],k.owner));
 const losses=s.losses.filter(l=>inScope([l.risk],l.reporter));
 const issues=s.issues.filter(i=>!filtered||rid.has(rOf(i.link))||(f.owner&&!f.area&&!f.rating&&i.owner===f.owner));
 const vendors=s.vendors.filter(v=>inScope(v.risks,v.owner));
 const open=issues.filter(i=>i.status!=='Closed'),od=open.filter(G.isOverdue);
 const out=rk.filter(r=>r.score>ap);
 const eff=controls.filter(c=>c.result==='Effective'),bad=controls.filter(c=>c.result==='Ineffective'),part=controls.filter(c=>c.result==='Partially effective'),nt=controls.filter(c=>c.result==='Not tested');
 const due=controls.filter(c=>dTo(addDays(c.lastTest,FREQ[c.freq]||91))<=0);
 const red=kris.filter(k=>G.kriStatus(k)==='Red'),amb=kris.filter(k=>G.kriStatus(k)==='Amber');
 const obl=(s.obl||[]).filter(o=>o.status!=='Not applicable'),oc=obl.filter(o=>o.status==='Compliant'),og=obl.filter(o=>o.status==='Non-compliant'||o.status==='Partially compliant'),on=obl.filter(o=>o.status==='Not assessed');
 const plan=((s.audit||{}).plan)||[],pdone=plan.filter(a=>a.status==='Complete'),plate=plan.filter(a=>{try{return a.status==='Planned'&&dTo(a.start)<0}catch{return false}});
 const chg=(s.regchg||[]).filter(r=>r.status!=='Implemented'&&r.status!=='Not applicable');
 const vhi=vendors.filter(v=>['High','Critical'].includes(G.ratingOf(v.score)));
 const pols=s.policies,pOver=pols.filter(p=>p.status==='Published'&&p.review&&p.review<TODAY),pLow=pols.filter(p=>p.status==='Published'&&p.aud&&(p.att||0)/p.aud<0.8);
 const age=open.map(i=>-dTo(i.created||TODAY)),avgAge=age.length?Math.round(sum(age)/age.length):0;
 const mine=s.issues.filter(i=>i.status!=='Closed'&&i.actions.some(a=>!a.done&&a.owner===me().name));
 const byMonth={};losses.forEach(l=>{const k=(l.date||'').slice(0,7);if(!k)return;(byMonth[k]=byMonth[k]||{v:0,ids:[]});byMonth[k].v+=l.gross-l.rec;byMonth[k].ids.push(l.id)});
 const months=Object.keys(byMonth).sort().slice(-6);
 const net=sum(losses.map(l=>l.gross-l.rec));
 return{s,ap,rk,out,controls,eff,bad,part,nt,due,kris,red,amb,losses,issues,open,od,vendors,vhi,obl,oc,og,on,plan,pdone,plate,chg,pols,pOver,pLow,avgAge,age,mine,byMonth,months,net,filtered}
}

// ---------------------------------------------------------------- tiles (Home)
const TARGET=new Proxy({},{get:(_,k)=>G.target?G.target(k):({controls:85,attest:80,oblig:90})[k]});
G.metrics=M;
function tiles(){
 const m=M(),s=m.s;const T=[];const add=t=>T.push(t);
 const L=(label,a)=>()=>G.openList(label,ids(a));
 add({metric:'out',id:'t-out',g:'Risk',title:'Risks above appetite',sub:`Appetite ${m.ap} · ${risks.length} risks`,num:m.out.length,st:m.out.length?'negative':'good',foot:m.out.length?sem('negative','Needs treatment or acceptance'):sem('good','All within appetite'),click:L('Risks above appetite',m.out)});
 add({id:'t-prof',g:'Risk',wide:true,title:'Residual risk profile',sub:'Open the register to see every risk',chart:stack(['Critical','High','Medium','Low'].map(k=>({label:k,value:risks.filter(r=>r.rating===k).length,color:fill[RATING[k]],ids:risks.filter(r=>r.rating===k),dl:k}))),num:risks.length,unit:'risks',click:()=>nav('risks')});
 add({id:'t-appr',g:'Risk',title:'Waiting for my approval',sub:'Acceptances and treatment plans',num:(G.approvalsFor?G.approvalsFor(me().name):[]).length,st:(G.approvalsFor?G.approvalsFor(me().name):[]).length?'critical':'good',foot:(G.approvalsFor?G.approvalsFor(me().name):[]).some(x=>x.late)?sem('negative','Past SLA'):'',click:()=>nav('treat')});
 add({metric:'red',id:'t-kri',g:'Risk',title:'Indicators in red',sub:`${m.kris.length} tracked · ${m.amb.length} amber`,num:m.red.length,st:m.red.length?'negative':'good',foot:m.red.length?sem('negative','Threshold breached'):sem('good','Within tolerance'),click:L('Indicators in red',m.red)});
 const mo=m.months.map(k=>({label:k.slice(5)+'/'+k.slice(2,4),value:m.byMonth[k].v,ids:m.byMonth[k].ids}));const lastTwo=mo.slice(-2);
 const dl=lastTwo.length===2&&lastTwo[0].value?Math.round((lastTwo[1].value-lastTwo[0].value)/lastTwo[0].value*100):null;
 add({id:'t-loss',g:'Risk',wide:true,title:'Net operational losses',sub:'By month, after recoveries',num:inr(m.net).replace(/\.0+$/,''),foot:dl==null?'':sem(dl>0?'negative':'good',`${dl>0?'▲':'▼'} ${Math.abs(dl)}% vs previous month`),chart:mo.length?line(mo.map(p=>({...p,label:p.label})),inr):'<span class="s">No loss events recorded</span>',click:L('Loss events',s.losses)});
 add({id:'t-lev',g:'Risk',title:'Loss events logged',sub:`${s.losses.filter(l=>l.status!=='Closed').length} still open`,num:s.losses.length,st:'neutral',click:L('Loss events',s.losses)});
 const ce=pct(m.eff.length,m.controls.length),cst=ce>=TARGET.controls?'good':ce>=TARGET.controls-10?'critical':'negative';
 add({metric:'ctl',id:'t-ctl',g:'Controls and assurance',title:'Control effectiveness',sub:`Target ${TARGET.controls}% · ${m.controls.length} controls`,num:ce,unit:'%',st:cst,foot:sem(cst,`${ce>=TARGET.controls?'▲':'▼'} ${Math.abs(ce-TARGET.controls)} pts ${ce>=TARGET.controls?'above':'below'} target`),click:L('Controls',m.controls)});
 add({metric:'due',id:'t-due',g:'Controls and assurance',title:'Tests due or overdue',sub:`${m.bad.length} ineffective`,num:m.due.length,st:m.due.length?'critical':'good',foot:m.due.length?sem('critical','Schedule testing'):sem('good','Testing up to date'),click:L('Controls due for testing',m.due)});
 const pd=pct(m.pdone.length,m.plan.length);
 add({id:'t-aud',g:'Controls and assurance',title:'Audit plan delivery',sub:`${m.pdone.length} of ${m.plan.length} complete`,num:pd,unit:'%',st:m.plate.length?'critical':'neutral',foot:m.plate.length?sem('critical',`${m.plate.length} late to start`):'',click:()=>nav('audit')});
 const of=findingsOpen();
 add({id:'t-fnd',g:'Controls and assurance',title:'Open audit findings',sub:`${of.filter(f=>f[6]==='Overdue').length} overdue`,num:of.length,st:of.some(f=>f[6]==='Overdue')?'negative':of.length?'critical':'good',click:L('Open findings',of.map(f=>f[0]))});
 add({metric:'open',id:'t-iss',g:'Issues and actions',title:'Open issues',sub:`${m.od.length} overdue`,num:m.open.length,st:m.od.length?'critical':'good',foot:m.od.length?sem('critical','Escalation applies'):sem('good','None overdue'),click:L('Open issues',m.open)});
 add({metric:'od',id:'t-od',g:'Issues and actions',title:'Overdue issues',sub:'Past their due date',num:m.od.length,st:m.od.length?'negative':'good',click:L('Overdue issues',m.od)});
 add({id:'t-age',g:'Issues and actions',title:'Average age of open issues',sub:'Days since raised',num:m.avgAge,unit:'days',st:m.avgAge>60?'critical':'neutral',click:L('Open issues',m.open)});
 add({id:'t-my',g:'Issues and actions',title:'My open actions',sub:me().name,num:m.mine.length,st:m.mine.length?'critical':'good',foot:m.mine.length?'Issues with actions assigned to you':sem('good','Nothing assigned'),click:L('Issues with my actions',m.mine)});
 const oq=pct(m.oc.length,m.obl.length),ost=!m.obl.length?'neutral':oq>=TARGET.oblig?'good':oq>=TARGET.oblig-15?'critical':'negative';
 add({metric:'obl',id:'t-obl',g:'Compliance and third parties',title:'Obligations compliant',sub:m.obl.length?`${m.oc.length} of ${m.obl.length} · ${m.og.length} gaps`:'No framework adopted yet',num:m.obl.length?oq:'–',unit:m.obl.length?'%':'',st:ost,foot:m.obl.length?sem(ost,`Target ${TARGET.oblig}%`):'Adopt a framework pack',click:()=>nav('obligations')});
 add({id:'t-chg',g:'Compliance and third parties',title:'Regulatory changes open',sub:'Not yet implemented',num:m.chg.length,st:m.chg.length?'critical':'good',click:L('Regulatory changes',m.chg)});
 add({id:'t-ven',g:'Compliance and third parties',title:'High-risk vendors',sub:`${m.vendors.length} vendors`,num:m.vhi.length,st:m.vhi.length?'critical':'good',click:L('High-risk vendors',m.vhi)});
 add({id:'t-pol',g:'Compliance and third parties',title:'Policies needing attention',sub:`${m.pOver.length} review overdue · ${m.pLow.length} low attestation`,num:new Set([...ids(m.pOver),...ids(m.pLow)]).size,st:m.pOver.length?'negative':m.pLow.length?'critical':'good',click:L('Policies needing attention',[...m.pOver,...m.pLow])});
 return T}
function trendLine(key){
 if(!key||!G.trendOf)return '';const tr=G.trendOf(key,7);if(!tr)return '';const mt=(G.METRICS||[]).find(x=>x.k===key)||{low:true};
 if(tr.delta===0)return `<div class="f" style="margin-top:2px">${sem('neutral','No change in '+tr.days+' days')}${tr.demo?' <span title="Illustrative history for sample data">·</span>':''}</div>`;
 const good=mt.low?tr.delta<0:tr.delta>0,sign=tr.delta>0?'▲ +':'▼ −';
 return `<div class="f" style="margin-top:2px">${sem(good?'good':'negative',`${sign}${Math.abs(tr.delta)}${key==='ctl'||key==='obl'?' pts':''} in ${tr.days} days`)}</div>`}
function findingsOpen(){try{return findings.filter(f=>f[6]!=='Closed')}catch{return []}}
const nav=v=>{G.go(v);G.renderAll()};

// ---------------------------------------------------------------- personalise (order / hide), kept per person
const pk=kind=>`forgeGrcFx-${PROF}-${kind}-${(me()||{}).id||'x'}`;
function layout(kind,all){let st={hidden:[],order:[]};try{st=JSON.parse(localStorage.getItem(pk(kind))||'null')||st}catch{}
 const byId=Object.fromEntries(all.map(x=>[x.id,x]));const ord=[...st.order.filter(i=>byId[i]),...all.map(x=>x.id).filter(i=>!st.order.includes(i))];
 return{items:ord.map(i=>byId[i]),hidden:new Set(st.hidden),save(order,hidden){try{localStorage.setItem(pk(kind),JSON.stringify({order,hidden:[...hidden]}))}catch{}}}}
function manager(kind,all,rerender,what){
 const lay=layout(kind,all);let order=lay.items.map(x=>x.id),hidden=new Set(lay.hidden);
 const m=document.createElement('div');m.id='fxMgr';
 const paint=()=>{m.innerHTML=`<div class="box" role="dialog" aria-modal="true" aria-label="Personalise"><h3>Personalise ${what}</h3><p>Choose what you see and the order. This is saved for you only.</p>${order.map((id,i)=>{const x=all.find(a=>a.id===id);return `<div class="r"><input type="checkbox" id="fxm-${id}" data-id="${id}" ${hidden.has(id)?'':'checked'}><label for="fxm-${id}" style="flex:1">${E(x.title)}</label><button data-mv="-1" data-id="${id}" aria-label="Move up" ${i?'':'disabled'}>↑</button><button data-mv="1" data-id="${id}" aria-label="Move down" ${i<order.length-1?'':'disabled'}>↓</button></div>`}).join('')}<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="btn" data-x="reset">Reset</button><button class="btn primary" data-x="done">Done</button></div></div>`};
 paint();document.body.appendChild(m);
 m.addEventListener('click',e=>{const b=e.target.closest('button');if(e.target===m){m.remove();return}if(!b)return;
  if(b.dataset.mv){const i=order.indexOf(b.dataset.id),j=i+ +b.dataset.mv;if(j>=0&&j<order.length){[order[i],order[j]]=[order[j],order[i]];paint()}}
  if(b.dataset.x==='reset'){order=all.map(x=>x.id);hidden=new Set();paint()}
  if(b.dataset.x==='done'){lay.save(order,hidden);m.remove();rerender()}});
 m.addEventListener('change',e=>{const id=e.target.dataset.id;if(!id)return;if(e.target.checked)hidden.delete(id);else hidden.add(id)});
}

// ---------------------------------------------------------------- Home (launchpad)
G.mount({id:'launchpad',label:'Home',ico:'⌂',group:'HOME',title:'Home',sub:'',tabs:[['home','Home']]});
let homeQ='';
function renderHome(){
 const pn=G.panel('launchpad','home');if(!pn)return;
 const all=tiles(),lay=layout('home',all);const vis=lay.items.filter(t=>!lay.hidden.has(t.id));
 const groups=[...new Set(lay.items.map(t=>t.g))];
 const hr=new Date().getHours(),greet=hr<12?'Good morning':hr<18?'Good afternoon':'Good evening';
 const org=(G.org&&G.org().profile)||{};
 window.__fxTiles=Object.fromEntries(all.map(t=>[t.id,t]));
 const apps=[...document.querySelectorAll('.nav button')].filter(b=>!['launchpad','overview'].includes(b.dataset.view)).map(b=>({v:b.dataset.view,ico:(b.querySelector('.ico')||{}).textContent||'•',label:(b.querySelector('.navtext')||{}).textContent||b.dataset.view}));
 const tile=t=>`<button class="fx-tile${t.wide?' wide':''}" data-op="fx-tile" data-id="${t.id}"><h4>${E(t.title)}</h4><div class="s">${E(t.sub||'')}</div>${t.chart?`<div class="chart">${t.chart}</div>`:''}<div class="n" ${t.st?`style="color:${ST[t.st].c}"`:''}>${t.num===undefined?'':E(String(t.num))}${t.unit?`<small>${E(t.unit)}</small>`:''}</div><div class="f">${t.foot||''}</div>${trendLine(t.metric)}</button>`;
 pn.innerHTML=`<div class="fx"><div class="fx-hello"><div><h1>${greet}, ${E(me().name.split(' ')[0])}</h1><p>${E(org.name||'Your organisation')}${G.scopeLabel&&G.scopeLabel()?' · Scope: <b>'+E(G.scopeLabel())+'</b>':''} · ${E(fmt(TODAY))} · ${E(me().role)}</p></div><div class="fx-search"><input id="fxQ" type="search" placeholder="Search apps, risks, controls, issues, obligations…" aria-label="Search" autocomplete="off" value="${E(homeQ)}"><div class="fx-results" id="fxRes" hidden></div></div><div style="display:flex;gap:8px"><button class="btn" data-op="fx-mgr-home">Personalise</button><button class="btn primary" data-op="goto" data-v="overview">Overview page</button></div></div>`+
  groups.map(g=>{const ts=vis.filter(t=>t.g===g);return ts.length?`<section class="fx-group"><h2>${E(g)}</h2><div class="fx-tiles">${ts.map(tile).join('')}</div></section>`:''}).join('')+
  `<section class="fx-group"><h2>Apps</h2><div class="fx-tiles">${apps.map(a=>`<button class="fx-tile app" data-op="goto" data-v="${E(a.v)}"><span class="ico" aria-hidden="true">${E(a.ico)}</span><h4>${E(a.label)}</h4></button>`).join('')}</div></section></div>`;
 if(homeQ)runSearch(homeQ);
}
G.renders.push(renderHome);
actions['fx-tile']=b=>{const t=(window.__fxTiles||{})[b.dataset.id];if(t&&t.click)t.click()};
actions['fx-mgr-home']=()=>manager('home',tiles(),renderHome,'Home tiles');

// global search
function runSearch(q){
 const res=document.getElementById('fxRes');if(!res)return;q=q.trim().toLowerCase();if(q.length<2){res.hidden=true;return}
 const s=S(),hit=(...a)=>a.join(' ').toLowerCase().includes(q);const sec=[];
 const apps=[...document.querySelectorAll('.nav button')].map(b=>({v:b.dataset.view,l:(b.querySelector('.navtext')||{}).textContent||''})).filter(a=>hit(a.l));
 if(apps.length)sec.push(['Apps',apps.slice(0,5).map(a=>`<div data-op="goto" data-v="${E(a.v)}" tabindex="0"><span>${E(a.l)}</span><small>Open app</small></div>`)]);
 const rec=(t,type,arr,lab,sub)=>{const h=arr.filter(x=>hit(x.id,lab(x),sub?sub(x):'')).slice(0,4).map(x=>`<div data-op="open" data-t="${type}" data-id="${E(x.id)}" tabindex="0"><span>${E(x.id)} · ${E(lab(x))}</span><small>${t}</small></div>`);return h};
 const R=[...rec('Risk','riskrec',risks,r=>r.name,r=>r.area+r.owner),...rec('Control','control',s.controls,c=>c.name,c=>c.owner),...rec('Issue','issue',s.issues,i=>i.title,i=>i.owner),...rec('Indicator','kri',s.kris,k=>k.name),...rec('Policy','policy',s.policies,p=>p.title),...rec('Vendor','vendor',s.vendors,v=>v.name),...rec('Loss event','loss',s.losses,l=>l.title),...rec('Obligation','obligation',s.obl||[],o=>o.title,o=>o.ref+o.req)];
 if(R.length)sec.push(['Records',R.slice(0,14)]);
 res.hidden=false;res.innerHTML=sec.length?sec.map(([h,rows])=>`<h5>${h}</h5>${rows.join('')}`).join(''):'<div style="padding:14px;color:#556B82;font-size:13px">Nothing found. Try a record number, a name or an owner.</div>';
}
document.addEventListener('input',e=>{if(e.target.id==='fxQ'){homeQ=e.target.value;runSearch(homeQ)}});
document.addEventListener('click',e=>{if(!e.target.closest('.fx-search')){const r=document.getElementById('fxRes');if(r)r.hidden=true}else if(e.target.closest('[data-op]')){const r=document.getElementById('fxRes');if(r)r.hidden=true}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const r=document.getElementById('fxRes');if(r)r.hidden=true}});

// ---------------------------------------------------------------- Overview page (cards)
G.mount({id:'overview',label:'Overview',ico:'◫',group:'HOME',title:'Overview',sub:'Cards that answer the questions a risk owner asks every day. Filter them, personalise them, and select anything to open the records.',tabs:[['cards','Cards']]});
let F={area:'',owner:'',rating:''};
function cards(){
 const m=M(F),s=m.s,k=(label,a)=>({label,ids:a});
 const C_=[];const add=c=>C_.push(c);
 const rate=['Critical','High','Medium','Low'].map(r=>({label:r,value:m.rk.filter(x=>x.rating===r).length,color:fill[RATING[r]],ids:m.rk.filter(x=>x.rating===r)}));
 add({id:'c-rating',title:'Risk exposure',sub:'Residual rating of risks in scope',kpi:{n:m.rk.length,t:`${m.out.length} above appetite`,st:m.out.length?'negative':'good'},span:1,
  body:`<div class="fx-donut">${donut(rate,String(m.rk.length),'risks')}${legend(rate)}</div>`,foot:['Open risk register','risks']});
 const areas=[...new Set(m.rk.map(r=>r.area))].map(a=>({label:a,value:m.rk.filter(r=>r.area===a&&r.score>m.ap).length,ids:m.rk.filter(r=>r.area===a&&r.score>m.ap)})).sort((a,b)=>b.value-a.value).slice(0,7);
 add({id:'c-area',title:'Risks above appetite by area',sub:`Appetite score ${m.ap}`,kpi:{n:m.out.length,t:'above appetite',st:m.out.length?'negative':'good'},span:1,body:areas.length?hbar(areas,C.s1):'<p class="op-note">No risks in scope.</p>',foot:['Open risk register','risks']});
 const ce=pct(m.eff.length,m.controls.length),cst=ce>=TARGET.controls?'good':ce>=TARGET.controls-10?'critical':'negative';
 const cseg=[{label:'Effective',value:m.eff.length,color:fill.good,ids:m.eff},{label:'Partially effective',value:m.part.length,color:fill.critical,ids:m.part},{label:'Ineffective',value:m.bad.length,color:fill.negative,ids:m.bad},{label:'Not tested',value:m.nt.length,color:fill.neutral,ids:m.nt}];
 add({id:'c-ctl',title:'Control effectiveness',sub:`Target ${TARGET.controls}%`,kpi:{n:ce+'%',t:ce>=TARGET.controls?'on target':'below target',st:cst},span:1,body:`<div class="fx-donut">${donut(cseg,ce+'%','effective')}${legend(cseg)}</div>`,foot:['Open controls','controls']});
 add({id:'c-kri',title:'Key risk indicators',sub:'Value against amber and red thresholds',kpi:{n:m.red.length,t:'in red',st:m.red.length?'negative':'good'},span:2,
  body:`<div class="fx-list">${[...m.kris].sort((a,b)=>(G.kriStatus(b)==='Red')-(G.kriStatus(a)==='Red')||(G.kriStatus(b)==='Amber')-(G.kriStatus(a)==='Amber')).slice(0,6).map(x=>{const v=x.series[x.series.length-1],st=G.kriStatus(x),sk=st==='Red'?'negative':st==='Amber'?'critical':'good';return `<div data-op="open" data-t="kri" data-id="${E(x.id)}" tabindex="0"><div style="flex:1;min-width:0"><b>${E(x.name)}</b><div class="fx-bul"><div>${bullet(v,x.amber,x.red,x.unit==='%'?'%':'')}</div><span style="font-size:12px;font-weight:700">${v}${x.unit==='%'?'%':''}</span></div></div>${sem(sk,st)}</div>`}).join('')||'<p class="op-note">No indicators in scope.</p>'}</div>`,foot:['Open indicators','kris']});
 const bucket=[['0–30 d',0,30],['31–60 d',31,60],['61–90 d',61,90],['90+ d',91,1e9]].map(([l,a,b])=>({label:l,value:m.open.filter((i,x)=>{const g=-dTo(i.created||TODAY);return g>=a&&g<=b}).length,ids:m.open.filter(i=>{const g=-dTo(i.created||TODAY);return g>=a&&g<=b})}));
 add({id:'c-age',title:'Open issues by age',sub:'Days since raised',kpi:{n:m.open.length,t:`${m.od.length} overdue`,st:m.od.length?'critical':'good'},span:1,body:columns(bucket,C.s1),foot:['Open issues','issues']});
 add({id:'c-od',title:'Overdue issues',sub:'Most overdue first',kpi:{n:m.od.length,t:m.od.length?'need escalation':'none',st:m.od.length?'negative':'good'},span:1,
  body:`<div class="fx-list">${[...m.od].sort((a,b)=>a.due.localeCompare(b.due)).slice(0,5).map(i=>`<div data-op="open" data-t="issue" data-id="${E(i.id)}" tabindex="0"><div><b>${E(i.id)} · ${E(i.title.length>46?i.title.slice(0,44)+'…':i.title)}</b><small>${E(i.owner)} · due ${E(fmt(i.due))}</small></div>${sem('negative',(-dTo(i.due))+' d')}</div>`).join('')||`<p class="op-note">${sem('good','Nothing overdue')}</p>`}</div>`,foot:['Open issues','issues']});
 const mo=m.months.map(x=>({label:x.slice(5)+'/'+x.slice(2,4),value:m.byMonth[x].v,ids:m.byMonth[x].ids,label2:x}));
 add({id:'c-loss',title:'Net losses by month',sub:'After recoveries',kpi:{n:inr(m.net),t:`${m.losses.length} events`,st:'neutral'},span:2,body:mo.length?line(mo,inr):'<p class="op-note">No loss events in scope.</p>',foot:['Open loss events','kris']});
 add({id:'c-top',title:'Top risks',sub:'Highest residual scores',kpi:null,span:2,
  body:`<table class="fx-tbl"><thead><tr><th>Risk</th><th>Area</th><th>Owner</th><th>Residual</th><th>Coverage</th></tr></thead><tbody>${[...m.rk].sort((a,b)=>b.score-a.score).slice(0,6).map(r=>`<tr data-op="open" data-t="riskrec" data-id="${E(r.id)}" tabindex="0"><td><b>${E(r.id)}</b> ${E(r.name.length>40?r.name.slice(0,38)+'…':r.name)}</td><td>${E(r.area)}</td><td>${E(r.owner)}</td><td>${sem(RATING[r.rating],r.rating+' '+r.score)}</td><td>${E(G.riskCoverage(r.id))}</td></tr>`).join('')}</tbody></table>`,foot:['Open risk register','risks']});
 const oq=pct(m.oc.length,m.obl.length),ost=!m.obl.length?'neutral':oq>=TARGET.oblig?'good':oq>=TARGET.oblig-15?'critical':'negative';
 const oseg=[{label:'Compliant',value:m.oc.length,color:fill.good,ids:m.oc},{label:'Gaps',value:m.og.length,color:fill.negative,ids:m.og},{label:'Not assessed',value:m.on.length,color:fill.neutral,ids:m.on}];
 add({id:'c-obl',title:'Regulatory obligations',sub:`Target ${TARGET.oblig}% compliant`,kpi:{n:m.obl.length?oq+'%':'–',t:m.obl.length?(oq>=TARGET.oblig?'on target':'below target'):'none adopted',st:ost},span:1,body:m.obl.length?`<div class="fx-donut">${donut(oseg,oq+'%','compliant')}${legend(oseg)}</div>`:'<p class="op-note">Adopt a framework pack in Standards and data to track obligations.</p>',foot:['Open obligations','obligations']});
 const pdone=pct(m.pdone.length,m.plan.length);
 add({id:'c-aud',title:'Audit plan',sub:'Status of planned audits',kpi:{n:pdone+'%',t:'delivered',st:m.plate.length?'critical':'neutral'},span:1,
  body:`<div class="fx-list">${m.plan.slice(0,5).map(a=>{const st=a.status==='Complete'?'good':a.status==='Planned'&&m.plate.includes(a)?'negative':'neutral';return `<div data-op="open" data-t="audit" data-id="${E(a.id)}" tabindex="0"><div><b>${E(a.title.length>40?a.title.slice(0,38)+'…':a.title)}</b><small>${E(a.area)} · ${E(a.lead)}</small></div>${sem(st,a.status)}</div>`}).join('')||'<p class="op-note">No audits planned.</p>'}</div>`,foot:['Open internal audit','audit']});
 const tiers=[1,2,3].map(t=>({label:'Tier '+t,value:m.vendors.filter(v=>v.tier===t).length,ids:m.vendors.filter(v=>v.tier===t)}));
 add({id:'c-ven',title:'Third parties by tier',sub:'Tier 1 are the most critical',kpi:{n:m.vhi.length,t:'high or critical risk',st:m.vhi.length?'critical':'good'},span:1,body:hbar(tiers,C.s1),foot:['Open vendors','vendors']});
 const pa=m.pols.filter(p=>p.status==='Published'&&p.aud),att=pa.length?Math.round(sum(pa.map(p=>(p.att||0)/p.aud))/pa.length*100):0,pst=att>=TARGET.attest?'good':att>=TARGET.attest-10?'critical':'negative';
 add({id:'c-pol',title:'Policy attestation',sub:`Average across published policies · target ${TARGET.attest}%`,kpi:{n:att+'%',t:att>=TARGET.attest?'on target':'below target',st:pst},span:1,
  body:`<div class="fx-list">${pa.slice(0,5).map(p=>{const a=Math.round((p.att||0)/p.aud*100),sk=a>=TARGET.attest?'good':a>=TARGET.attest-10?'critical':'negative';return `<div data-op="open" data-t="policy" data-id="${E(p.id)}" tabindex="0"><div style="flex:1;min-width:0"><b>${E(p.title.length>38?p.title.slice(0,36)+'…':p.title)}</b><div class="fx-bul"><div>${bulletHi(a,TARGET.attest)}</div><span style="font-size:12px;font-weight:700">${a}%</span></div></div></div>`}).join('')||'<p class="op-note">No published policies.</p>'}</div>`,foot:['Open policies','policies']});
 add({id:'c-my',title:'My work',sub:`${me().name}`,kpi:{n:m.mine.length,t:'issues with your actions',st:m.mine.length?'critical':'good'},span:1,
  body:`<div class="fx-list">${m.mine.slice(0,5).map(i=>`<div data-op="open" data-t="issue" data-id="${E(i.id)}" tabindex="0"><div><b>${E(i.id)} · ${E(i.title.length>40?i.title.slice(0,38)+'…':i.title)}</b><small>${i.actions.filter(a=>!a.done&&a.owner===me().name).length} action(s) open · due ${E(fmt(i.due))}</small></div>${G.isOverdue(i)?sem('negative','Overdue'):''}</div>`).join('')||`<p class="op-note">${sem('good','Nothing assigned to you')}</p>`}</div>`,foot:['Open issues','issues']});
 add({id:'c-trend',title:'Trend',sub:(S().snapsDemo?'Illustrative history for sample data · ':'')+'Daily snapshots, group-wide',kpi:null,span:3,body:trendBody(),foot:['Open settings','org']});
 add({id:'c-chg',title:'Regulatory change',sub:'Open items, soonest effective date first',kpi:{n:m.chg.length,t:m.chg.length?'to implement':'none open',st:m.chg.length?'critical':'good'},span:2,
  body:`<div class="fx-list">${[...m.chg].sort((a,b)=>a.effective<b.effective?-1:1).slice(0,5).map(r=>`<div data-op="open" data-t="regchange" data-id="${E(r.id)}" tabindex="0"><div><b>${E(r.title.length>64?r.title.slice(0,62)+'…':r.title)}</b><small>${E(r.source)} · effective ${E(fmt(r.effective))} · ${E(r.owner)}</small></div>${sem(r.impact==='High'?'negative':r.impact==='Medium'?'critical':'neutral',r.impact+' impact')}</div>`).join('')||`<p class="op-note">${sem('good','No open regulatory changes')}</p>`}</div>`,foot:['Open regulatory change','regchange']});
 return C_}
function trendBody(){
 const mets=G.METRICS||[];if(!mets.length)return '';const key=F.trend||'out',mt=mets.find(x=>x.k===key)||mets[0],tr=G.trendOf?G.trendOf(mt.k,30):null;
 const pts=tr?tr.series.slice(-26).map(x=>({label:x.date.slice(5),value:x.v})):[];
 const delta=tr?`<span style="margin-left:10px;font-size:12px">${sem(((mt.low?tr.delta<0:tr.delta>0)?'good':tr.delta===0?'neutral':'negative'),`${tr.delta>0?'▲ +':tr.delta<0?'▼ −':''}${Math.abs(tr.delta)} over ${tr.days} days`)}</span>`:'';
 return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${mets.map(x=>`<button class="btn" data-op="fx-trend" data-k="${x.k}" style="${x.k===mt.k?'background:#EBF5FE;border-color:#0070F2':''}">${E(x.label)}</button>`).join('')}${delta}</div>${pts.length>1?line(pts,mt.fmt,150):'<p class="op-note">Not enough history yet. Snapshots are saved once a day.</p>'}`}
actions['fx-trend']=b=>{F.trend=b.dataset.k;renderOverview()};
function renderOverview(){
 const pn=G.panel('overview','cards');if(!pn)return;
 const areas=[...new Set(risks.map(r=>r.area))].sort(),owners=G.people(),all=cards(),lay=layout('ovp',all),vis=lay.items.filter(c=>!lay.hidden.has(c.id));
 window.__fxCards=Object.fromEntries(all.map(c=>[c.id,c]));
 const opt=(arr,v)=>`<option value="">All</option>${arr.map(a=>`<option${a===v?' selected':''}>${E(a)}</option>`).join('')}`;
 pn.innerHTML=`<div class="fx"><div class="fx-bar"><label>Area<select id="fxfArea">${opt(areas,F.area)}</select></label><label>Owner<select id="fxfOwner">${opt(owners,F.owner)}</select></label><label>Residual rating<select id="fxfRating">${opt(['Critical','High','Medium','Low'],F.rating)}</select></label>${(F.area||F.owner||F.rating)?'<button class="btn" data-op="fx-clear">Clear filters</button>':''}<span class="sp"></span><span style="font-size:12px;color:#556B82">${E(fmt(TODAY))}</span><button class="btn" data-op="fx-mgr-ovp">Personalise cards</button><button class="btn primary" data-op="board-pack">Board pack</button></div>
 <div class="fx-cards">${vis.map(c=>`<article class="fx-card${c.span===2?' span2':c.span===3?' span3':''}" aria-label="${E(c.title)}"><header><div><h3>${E(c.title)}</h3><p>${E(c.sub||'')}</p></div>${c.kpi?`<div class="kpi"><b style="color:${ST[c.kpi.st].c}">${E(String(c.kpi.n))}</b><span style="color:${ST[c.kpi.st].c}">${ST[c.kpi.st].i} ${E(c.kpi.t)}</span></div>`:''}</header><div class="body">${c.body}</div><footer><button data-op="goto" data-v="${c.foot[1]}">${E(c.foot[0])} ›</button></footer></article>`).join('')}</div></div>`;
}
G.renders.push(renderOverview);
document.addEventListener('change',e=>{const m={fxfArea:'area',fxfOwner:'owner',fxfRating:'rating'}[e.target.id];if(m){F[m]=e.target.value;renderOverview()}});
actions['fx-clear']=()=>{F={area:'',owner:'',rating:''};renderOverview()};
actions['fx-mgr-ovp']=()=>manager('ovp',cards(),renderOverview,'Overview cards');

// Home and Overview go to the top of the navigation, and Home is where you land
(function(){
 const nav=document.querySelector('.sidebar');const firstLabel=nav&&nav.querySelector('.navlabel');if(!firstLabel)return;
 const hb=document.querySelector('.nav button[data-view="launchpad"]');if(!hb)return;const homeNav=hb.parentNode,homeLab=homeNav.previousElementSibling;
 const ob=document.querySelector('.nav button[data-view="overview"]');if(ob&&ob.parentNode!==homeNav){homeNav.appendChild(ob);const ol=ob.parentNode;}
 firstLabel.before(homeLab,homeNav);
 // the overview nav group created for 'overview' shares the HOME group, so remove any empty leftover
 document.querySelectorAll('.nav').forEach(n=>{if(!n.children.length){const l=n.previousElementSibling;if(l&&l.classList.contains('navlabel'))l.remove();n.remove()}});
 document.querySelectorAll('.sidebar .navlabel').forEach(l=>{if(l.textContent.trim()==='OVERVIEW')l.textContent='CLASSIC VIEWS'});
 G.go('launchpad');
})();
G.renderAll();
})();
