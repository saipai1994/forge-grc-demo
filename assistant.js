// Assistant: a side panel that answers questions about the records you can see. With the server and an
// API key it uses Claude; without them it still gives a briefing computed from the data on screen.
// It is read-only: it suggests, you act.
(function(){
const G=window.GRC;if(!G)return;
const {E,fmt,TODAY,toast,risks,me,dTo,addDays,openDrawer,PROF}=G;
const S=()=>G.S();
const trim=(v,n)=>{v=String(v==null?'':v);return v.length>n?v.slice(0,n-1)+'…':v};
const aiOn=()=>!!(G.api&&G.api.connected&&G.api.health&&G.api.health.assistant);

// ---------------------------------------------------------------- what the assistant is allowed to see
function withScope(fn){const on=G.scopeEnter&&G.scopeEnter();try{return fn()}finally{if(on)G.scopeLeave()}}
function digest(){return withScope(()=>{
 const m=G.metrics({}),s=S(),org=(G.org&&G.org().profile)||{},L=[];
 L.push(`Date: ${TODAY}. Organisation: ${org.name||'(not set)'}; industry profile: ${(G.PROFILES&&G.PROFILES[org.industry]||{}).label||PROF}; currency ${G.cur?G.cur().code:'INR'}.${G.scopeLabel&&G.scopeLabel()?' Scope: '+G.scopeLabel()+'.':''} Signed-in user: ${me().name} (${me().role}).`);
 L.push(`Risk appetite: residual score above ${s.appetite} is outside appetite.`);
 L.push(`Headlines: ${m.out.length} of ${risks.length} risks above appetite; ${m.eff.length} of ${m.controls.length} controls effective, ${m.bad.length} ineffective, ${m.due.length} tests due; ${m.open.length} open issues, ${m.od.length} overdue; ${m.red.length} indicators red, ${m.amb.length} amber; ${m.oc.length} of ${m.obl.length} obligations compliant, ${m.og.length} with gaps; net losses ${G.inr(m.net)} over ${m.losses.length} events.`);
 L.push('Risks above appetite (id | name | area | residual | owner | control coverage):');m.out.sort((a,b)=>b.score-a.score).slice(0,12).forEach(r=>L.push(`${r.id} | ${trim(r.name,70)} | ${r.area} | ${r.rating} ${r.score} | ${r.owner} | ${G.riskCoverage(r.id)}`));
 L.push('Open issues, overdue or high first (id | title | severity | owner | due | status):');[...m.open].sort((a,b)=>(G.isOverdue(b)-G.isOverdue(a))||a.due.localeCompare(b.due)).slice(0,15).forEach(i=>L.push(`${i.id} | ${trim(i.title,70)} | ${i.sev} | ${i.owner} | ${i.due}${G.isOverdue(i)?' OVERDUE':''} | ${i.status}`));
 L.push('Ineffective or partially effective controls (id | name | result | owner | linked risks):');m.controls.filter(c=>c.result!=='Effective').slice(0,12).forEach(c=>L.push(`${c.id} | ${trim(c.name,60)} | ${c.result} | ${c.owner} | ${(c.risks||[]).join(',')}`));
 L.push('Indicators in red or amber (id | name | latest | amber/red | owner):');[...m.red,...m.amb].slice(0,12).forEach(k=>L.push(`${k.id} | ${trim(k.name,60)} | ${k.series[k.series.length-1]}${k.unit||''} | ${k.amber}/${k.red} | ${k.owner}`));
 const gaps=(s.obl||[]).filter(o=>o.status==='Non-compliant'||o.status==='Partially compliant').slice(0,10);if(gaps.length){L.push('Obligation gaps (id | reference | title | status | owner):');gaps.forEach(o=>L.push(`${o.id} | ${o.ref||''} | ${trim(o.title,70)} | ${o.status} | ${o.owner||''}`))}
 const ap=(G.approvalsFor?G.approvalsFor(me().name):[]);if(ap.length){L.push('Waiting for the signed-in user to decide:');ap.forEach(a=>L.push(`${a.id} | ${trim(a.title,70)} | from ${a.by}${a.late?' | '+a.late+' days past SLA':''}`))}
 const acc=(s.acc||[]).filter(a=>a.status==='Active'&&dTo(a.expires)<=30);if(acc.length){L.push('Risk acceptances expiring within 30 days:');acc.forEach(a=>L.push(`${a.id} | ${a.risk} | expires ${a.expires}`))}
 return L.join('\n').slice(0,50000)})}
function focus(d){
 if(!d)return '';const s=S(),J=o=>JSON.stringify(o,(k,v)=>typeof v==='string'&&v.length>600?v.slice(0,599)+'…':v,1);
 const find=(a,id)=>(a||[]).find(x=>x.id===id);
 return withScope(()=>{let o=null;
  switch(d.type){
   case 'riskrec':{const r=risks.find(x=>x.id===d.id);if(r)o={risk:r,coverage:G.riskCoverage(r.id),controls:G.riskControls(r.id),indicators:s.kris.filter(k=>k.risk===r.id),issues:s.issues.filter(i=>i.link===r.id),losses:s.losses.filter(l=>l.risk===r.id),acceptances:(s.acc||[]).filter(a=>a.risk===r.id),plans:(s.plans||[]).filter(p=>p.risk===r.id)};break}
   case 'issue':o=find(s.issues,d.id);break;case 'control':{const c=find(s.controls,d.id);if(c)o={control:c,tests:s.tests.filter(t=>t.ctrl===c.id).slice(0,6)};break}
   case 'kri':o=find(s.kris,d.id);break;case 'loss':o=find(s.losses,d.id);break;case 'policy':o=find(s.policies,d.id);break;
   case 'vendor':{const v=find(s.vendors,d.id);if(v)o={vendor:v,questionnaires:(s.vq||[]).filter(q=>q.vendor===v.id).map(q=>({id:q.id,status:q.status,score:q.score,flags:q.flags}))};break}
   case 'obligation':o=find(s.obl,d.id);break;case 'acc':o=find(s.acc,d.id);break;case 'plan':o=find(s.plans,d.id);break;case 'evt':o=find(s.evt,d.id);break;case 'exc':o=find(s.exc,d.id);break;case 'coi':o=find(s.coi,d.id);break;case 'vq':{const q=find(s.vq,d.id);if(q){const T=window.GRC_VQ;o={id:q.id,vendor:q.vendor,status:q.status,score:q.score,answers:T?T.questions().map(x=>({q:x.q,answer:(q.answers[x.id]||{}).a||'',comment:(q.answers[x.id]||{}).c||''})):q.answers}}break}
   case 'audit':{const a=((s.audit||{}).plan||[]).find(x=>x.id===d.id);if(a)o={audit:a,workpapers:((s.audit||{}).wp||[]).filter(w=>w.audit===a.id)};break}
   case 'wp':o=find((s.audit||{}).wp,d.id);break;
   case 'fw':{const f=((window.GRC_LIB||{}).frameworks||[]).find(x=>x.id===d.id);if(f)o={name:f.name,code:f.code,kind:f.kind,region:f.region,issuer:f.issuer,summary:f.summary,requirements:(f.obl||[]).slice(0,25).map(x=>({ref:x[0],title:x[1]})),adoptedObligations:(s.obl||[]).filter(x=>x.fw===f.id).length};break}
  }
  return o?J(o).slice(0,18000):''})}

// ---------------------------------------------------------------- a briefing that needs no AI
function brief(){return withScope(()=>{
 const m=G.metrics({}),L=[],s=S();
 const items=[];
 [...m.od].sort((a,b)=>a.due.localeCompare(b.due)).slice(0,3).forEach(i=>items.push([100-Math.min(50,-dTo(i.due)),`**${i.id}** is ${-dTo(i.due)} days overdue: ${trim(i.title,80)} (${i.owner}). Agree a recovery date or escalate.`]));
 m.red.slice(0,3).forEach(k=>items.push([95,`Indicator **${k.id}** is in red (${k.series[k.series.length-1]}${k.unit||''} against ${k.red}): ${trim(k.name,70)}. Ask ${k.owner} for the cause and an action.`]));
 m.out.filter(r=>G.riskCoverage(r.id)==='No control'||G.riskCoverage(r.id)==='Weak').sort((a,b)=>b.score-a.score).slice(0,3).forEach(r=>items.push([90,`Risk **${r.id}** is above appetite (${r.score}) with ${G.riskCoverage(r.id).toLowerCase()} control coverage: ${trim(r.name,70)}. Map or design a control, or request a formal acceptance.`]));
 (G.approvalsFor?G.approvalsFor(me().name):[]).slice(0,3).forEach(a=>items.push([a.late?92:80,`**${a.id}** is waiting for your decision${a.late?`, ${a.late} days past its SLA`:''}: ${trim(a.title,70)}.`]));
 (s.acc||[]).filter(a=>a.status==='Active'&&dTo(a.expires)<=14).slice(0,2).forEach(a=>items.push([85,`Risk acceptance **${a.id}** expires on ${fmt(a.expires)}. Renew it or start a treatment plan.`]));
 m.bad.slice(0,2).forEach(c=>items.push([70,`Control **${c.id}** is ineffective: ${trim(c.name,70)}. Check an issue is tracking the fix.`]));
 items.sort((a,b)=>b[0]-a[0]);
 L.push(`**Today, ${fmt(TODAY)}.** ${m.out.length} of ${risks.length} risks are above appetite, ${m.od.length} issues are overdue, ${m.red.length} indicators are red.`);
 if(!items.length)L.push('Nothing urgent stands out. Check upcoming control tests and policy reviews.');else{L.push('');L.push('**Start with:**');items.slice(0,7).forEach((x,i)=>L.push(`${i+1}. ${x[1]}`))}
 return L.join('\n')})}

// ---------------------------------------------------------------- panel
let MSGS=[],busy=false;
const css=document.createElement('style');css.textContent=`
#asPanel{position:fixed;top:0;right:0;bottom:0;width:min(440px,100%);background:#fff;z-index:99980;box-shadow:-10px 0 40px #0003;display:none;flex-direction:column;font-family:"72","72full","Segoe UI",Arial,sans-serif}
#asPanel.show{display:flex}
#asPanel header{padding:14px 16px;border-bottom:1px solid #D9D9D9;display:flex;justify-content:space-between;align-items:center;gap:8px}
#asPanel header h3{margin:0;font-size:16px;color:#1D2D3E}#asPanel header small{display:block;color:#556B82;font-size:11px;font-weight:400}
#asPanel .log{flex:1;overflow:auto;padding:14px 16px;font-size:13.5px;line-height:1.6;color:#1D2D3E}
#asPanel .m{margin:0 0 12px;padding:10px 12px;border-radius:12px;max-width:94%;white-space:pre-wrap}
#asPanel .u{background:#EBF5FE;margin-left:auto}#asPanel .a{background:#F5F6F7}
#asPanel .a .op-link{margin:0 2px}
#asPanel .chips{display:flex;gap:6px;flex-wrap:wrap;padding:0 16px 8px}
#asPanel .chips button{border:1px solid #0070F2;background:#fff;color:#0064D9;border-radius:16px;padding:5px 11px;font:600 12px inherit;cursor:pointer}
#asPanel .chips button:hover{background:#EBF5FE}
#asPanel form{display:flex;gap:8px;padding:10px 16px 14px;border-top:1px solid #EDEFF1}
#asPanel textarea{flex:1;border:1px solid #BCC3CA;border-radius:10px;padding:8px 10px;font:13.5px inherit;resize:none;min-height:42px;max-height:120px}
#asPanel form button{border:0;background:#0070F2;color:#fff;border-radius:10px;padding:0 16px;font-weight:700;cursor:pointer}
#asPanel form button:disabled{background:#9db8dd}
#asPanel .note{font-size:11.5px;color:#556B82;padding:0 16px 8px}
#asPanel .src{font-size:11px;color:#627382;margin-top:6px}
@media print{#asPanel{display:none!important}}`;document.head.appendChild(css);
const panel=document.createElement('aside');panel.id='asPanel';panel.setAttribute('role','complementary');panel.setAttribute('aria-label','Assistant');
panel.innerHTML=`<header><div><h3>✳ Assistant</h3><small id="asMode"></small></div><button class="btn" data-as="close" aria-label="Close">✕</button></header><div class="log" id="asLog" aria-live="polite"></div><div class="chips" id="asChips"></div><div class="note" id="asNote"></div><form id="asForm"><textarea id="asQ" rows="1" placeholder="Ask about your risks, controls, issues…" aria-label="Question"></textarea><button type="submit" id="asSend">Ask</button></form>`;
document.body.appendChild(panel);
const consent=()=>{try{return localStorage.getItem('forgeGrcAssistantOk')==='1'}catch{return true}};
function md(t){let h=E(t).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
 h=h.replace(/\b([A-Z]{1,5}-\d{1,4})\b/g,(m,id)=>{const l=G.lk(id);return /data-op/.test(l)?l:m});return h}
function paint(){
 const log=document.getElementById('asLog');log.innerHTML=MSGS.map(m=>`<div class="m ${m.r==='user'?'u':'a'}">${m.r==='user'?E(m.t):md(m.t)}${m.src?`<div class="src">${E(m.src)}</div>`:''}</div>`).join('')||`<div class="m a">Hello ${E(me().name.split(' ')[0])}. ${aiOn()?'Ask me about your records, or pick a suggestion below.':'Free-form questions need the AI assistant, which is not switched on here. The briefing below is computed from your data.'}</div>`;
 if(busy)log.innerHTML+='<div class="m a">Thinking…</div>';log.scrollTop=log.scrollHeight;
 document.getElementById('asMode').textContent=aiOn()?'Uses Claude · read-only · you stay in control':'Briefing computed locally · no AI';
 const d=G.UI.drawer,chips=[['Brief me on today','brief']];
 if(d&&d.title)chips.push(['Explain this record','explain'],['Suggest next steps','next']);if(d&&d.type==='riskrec')chips.push(['Draft a treatment plan','plan']);if(d&&d.type==='obligation')chips.push(['Which controls could cover this?','cover']);
 chips.push(['What should I do first?','first']);
 document.getElementById('asChips').innerHTML=chips.map(c=>`<button type="button" data-as="${c[1]}">${E(c[0])}</button>`).join('');
 document.getElementById('asNote').textContent=aiOn()?(consent()?'A summary of your workspace is sent to the AI service to answer. Files and speak-up reports are never sent.':'Before first use: a summary of your workspace is sent to the AI service to answer. Files and speak-up reports are never sent. Asking confirms you accept this.'):'';
 const q=document.getElementById('asQ'),snd=document.getElementById('asSend');q.disabled=!aiOn()||busy;snd.disabled=!aiOn()||busy;q.placeholder=aiOn()?'Ask about your risks, controls, issues…':'Needs the AI assistant (server with an API key)';
}
async function ask(question,withFocus){
 if(busy)return;const d=withFocus?G.UI.drawer:null;MSGS.push({r:'user',t:question});
 if(!aiOn()){MSGS.push({r:'assistant',t:brief(),src:'Computed locally from the records on screen. No AI was used.'});paint();return}
 if(!consent()){try{localStorage.setItem('forgeGrcAssistantOk','1')}catch{}}
 busy=true;paint();
 try{
  const hist=MSGS.slice(0,-1).slice(-6).map(m=>({role:m.r==='user'?'user':'assistant',content:m.t}));
  const r=await G.api.call('POST','/api/assistant',{question,digest:digest(),focus:d?focus(d):'',history:hist,profile:PROF,ref:d?d.id:''});
  if(r.ok)MSGS.push({r:'assistant',t:r.data.answer,src:'AI-generated from your records. Check important details before acting.'});
  else MSGS.push({r:'assistant',t:(r.data.error||'The assistant could not answer.')+'\n\n'+brief(),src:'Showing the local briefing instead.'});
 }catch(e){MSGS.push({r:'assistant',t:'The assistant could not be reached.\n\n'+brief(),src:'Showing the local briefing instead.'})}
 busy=false;paint()}
const PRESET={
 brief:()=>ask('Brief me on what needs attention today.',false),
 first:()=>ask('What should I do first this week, and why?',false),
 explain:()=>ask('Explain this record in plain language: what it is, what is wrong or pending, and why it matters.',true),
 next:()=>ask('Suggest the next three practical steps for this record, with who should do each.',true),
 plan:()=>ask('Draft a treatment plan for this risk: strategy, 3 to 5 actions with suggested owners and timing, and the target residual score. Only use controls and facts present in the data.',true),
 cover:()=>ask('Which of the existing controls could help cover this obligation? Name the control IDs and say what gap remains. If none fit, say so.',true)};
panel.addEventListener('click',e=>{const b=e.target.closest('[data-as]');if(!b)return;if(b.dataset.as==='close'){panel.classList.remove('show');return}const f=PRESET[b.dataset.as];if(f)f()});
panel.addEventListener('submit',e=>{e.preventDefault();const q=document.getElementById('asQ'),t=q.value.trim();if(!t)return;q.value='';ask(t,true)});
document.getElementById('asQ').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();document.getElementById('asForm').requestSubmit()}});
document.addEventListener('click',e=>{if(panel.classList.contains('show')&&e.target.closest('#asPanel [data-op]'))return});
const top=document.querySelector('.top-actions');
if(top&&!document.getElementById('asBtn')){const b=document.createElement('button');b.id='asBtn';b.className='btn';b.textContent='✳ Ask';b.title='Assistant';b.onclick=()=>{panel.classList.toggle('show');paint();if(panel.classList.contains('show')&&!MSGS.length)PRESET.brief()};top.prepend(b)}
G.drawerHooks.push(d=>{if(panel.classList.contains('show'))paint()});
G.assistant={ask,brief,digest,focus};
})();
