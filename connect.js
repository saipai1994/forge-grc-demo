// Connected mode. When the Forge GRC server is reachable the app asks you to sign in, keeps one shared
// copy of the data on the server, shows other people's changes within a second, and lists every change
// in an audit trail. When no server is reachable (GitHub Pages, a shared file) nothing changes and the
// app runs as the browser-only demo.
(function(){
const G=window.GRC,SY=window.GRC_SYNC;if(!G||!SY)return;
const {E,fmt,table,card,toast,PROF}=G;
const q=new URLSearchParams(location.search);
let API=(q.get('server')||(()=>{try{return localStorage.getItem('forgeGrcServer')}catch{}})()||'').replace(/\/$/,'');
if(!API&&/^https?:$/.test(location.protocol))API=location.origin;
if(!API)return;
if(q.get('server'))try{localStorage.setItem('forgeGrcServer',API)}catch{}
const TKEY='forgeGrcToken',DKEY='forgeGrcDemoOnly';
const ss={get:k=>{try{return sessionStorage.getItem(k)}catch{return null}},set:(k,v)=>{try{sessionStorage.setItem(k,v)}catch{}},del:k=>{try{sessionStorage.removeItem(k)}catch{}}};
let token=ss.get(TKEY),user=null,rev=0,base=null,es=null,timer=null,busy=false,dirty=false,health=null,trailRows=[],trailQ='',connected=false;
const clone=o=>JSON.parse(JSON.stringify(o));
const snap=()=>{const s=clone(G.S());delete s.log;return s};

async function call(method,url,body){
 const r=await fetch(API+url,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});
 let j={};try{j=await r.json()}catch{}
 if(r.status===401&&token){signOut(true);throw new Error('Session ended')}
 return{status:r.status,ok:r.ok||r.status===207,data:j};
}

// ---- status pill ----
const pill=document.createElement('div');pill.id='gcPill';
pill.style.cssText='display:inline-flex;align-items:center;gap:7px;font:600 10px "DM Sans",sans-serif;padding:5px 10px;border:1px solid #d6dde5;border-radius:14px;background:#fff;color:#44566a;cursor:default;margin-right:8px';
function paintPill(){
 if(!connected){pill.innerHTML=`<i style="width:7px;height:7px;border-radius:50%;background:#c9a13b;display:inline-block"></i>Demo mode · this browser only <button id="gcSignIn" style="border:0;background:none;color:#17766A;font:600 10px 'DM Sans';cursor:pointer">Sign in</button>`;return}
 pill.innerHTML=`<i id="gcDot" style="width:7px;height:7px;border-radius:50%;background:#2e9d6f;display:inline-block"></i>Live · ${E(user.name)} · ${E(user.role)} <button id="gcPwd" style="border:0;background:none;color:#17766A;font:600 10px 'DM Sans';cursor:pointer">Password</button><button id="gcOut" style="border:0;background:none;color:#8a4a45;font:600 10px 'DM Sans';cursor:pointer">Sign out</button>`}
function mountPill(){const bar=document.querySelector('.top-actions');if(bar&&!pill.parentNode)bar.prepend(pill)}
const css=document.createElement('style');css.textContent='.gc-live .demo-user-label{display:none!important}@keyframes gcpulse{0%{box-shadow:0 0 0 0 #2e9d6f88}100%{box-shadow:0 0 0 9px #2e9d6f00}}.gcflash{animation:gcpulse .9s}#gcLogin{position:fixed;inset:0;background:#0F1B2Bf0;z-index:99998;display:flex;align-items:center;justify-content:center;padding:18px}#gcLogin form{background:#fff;border-radius:14px;padding:28px;width:min(400px,100%);box-shadow:0 30px 80px #0006;font-family:"DM Sans",sans-serif}#gcLogin h2{font:800 20px Manrope,sans-serif;margin:0 0 4px;color:#14202E}#gcLogin p{font-size:12px;color:#5b6b7c;margin:0 0 16px;line-height:1.5}#gcLogin label{display:block;font:600 11px "DM Sans";color:#344558;margin:10px 0 4px}#gcLogin input{width:100%;box-sizing:border-box;padding:10px 11px;border:1px solid #cfd8e1;border-radius:8px;font-size:13px}#gcLogin .go{width:100%;margin-top:16px;padding:11px;border:0;border-radius:8px;background:#17766A;color:#fff;font:700 13px "DM Sans";cursor:pointer}#gcLogin .alt{display:block;margin:12px auto 0;border:0;background:none;color:#5b6b7c;font:600 11px "DM Sans";cursor:pointer;text-decoration:underline}#gcLogin .err{color:#b3392f;font-size:12px;margin-top:10px;min-height:16px}#gcLogin .hint{margin-top:14px;padding:9px 10px;background:#f3f6f9;border-radius:8px;font-size:10.5px;color:#5b6b7c;line-height:1.5}';document.head.appendChild(css);

// ---- sign in ----
function showLogin(msg){
 if(document.getElementById('gcLogin'))return;
 const d=document.createElement('div');d.id='gcLogin';
 d.innerHTML=`<form autocomplete="on"><h2>Sign in to Forge GRC</h2><p>Your workspace is shared with your team. Every change is recorded in the audit trail.</p><label for="gcEmail">Email</label><input id="gcEmail" type="email" autocomplete="username" required><label for="gcPw">Password</label><input id="gcPw" type="password" autocomplete="current-password" required><div class="err" id="gcErr">${E(msg||'')}</div><button class="go" type="submit">Sign in</button><button type="button" class="alt" id="gcDemo">Continue in demo mode (this browser only)</button>${health&&health.hint?`<div class="hint">${E(health.hint)}</div>`:''}</form>`;
 document.body.appendChild(d);d.querySelector('#gcEmail').focus();
 d.querySelector('form').onsubmit=async e=>{e.preventDefault();const err=d.querySelector('#gcErr');err.textContent='';
  try{const r=await call('POST','/api/login',{email:d.querySelector('#gcEmail').value,password:d.querySelector('#gcPw').value});
   if(!r.ok){err.textContent=r.data.error||'Sign in failed.';return}
   token=r.data.token;ss.set(TKEY,token);user=r.data.user;ss.del(DKEY);d.remove();if(r.data.mustChange){await forceChange(d.querySelector('#gcPw').value)}else await goLive()}catch(x){err.textContent='Could not reach the server.'}};
 d.querySelector('#gcDemo').onclick=()=>{ss.set(DKEY,'1');d.remove();paintPill()};
}
function forceChange(current){
 return new Promise(done=>{
  const d=document.createElement('div');d.id='gcLogin';
  d.innerHTML=`<form><h2>Choose a new password</h2><p>Your password was set by an administrator. Pick one only you know: at least 10 characters, mixing letters with numbers or symbols.</p><label for="gcN1">New password</label><input id="gcN1" type="password" autocomplete="new-password" required><label for="gcN2">Repeat it</label><input id="gcN2" type="password" autocomplete="new-password" required><div class="err" id="gcErr"></div><button class="go" type="submit">Save and continue</button></form>`;
  document.body.appendChild(d);d.querySelector('#gcN1').focus();
  d.querySelector('form').onsubmit=async e=>{e.preventDefault();const err=d.querySelector('#gcErr'),a=d.querySelector('#gcN1').value;
   if(a!==d.querySelector('#gcN2').value){err.textContent='The two passwords do not match.';return}
   const r=await call('POST','/api/password',{current,next:a});if(!r.ok){err.textContent=r.data.error||'Could not save.';return}
   d.remove();await goLive();done()}})}
function signOut(expired){
 ss.del(TKEY);token=null;user=null;connected=false;if(es){es.close();es=null}document.body.classList.remove('gc-live');const bl=document.getElementById('gcBell');if(bl)bl.remove();paintPill();
 if(expired){toast('Your session ended. Sign in again.')}
 showLogin(expired?'Your session ended. Please sign in again.':'')}

// ---- state sync ----
function bindIdentity(){
 try{
  if(!workflowState.users.find(u=>u.id===user.id))workflowState.users.push({id:user.id,name:user.name,role:user.role,scope:'Internal audit · All functions',enabled:true});
  workflowState.activeUser=user.id;renderDemoUserSwitch();
 }catch(e){console.warn('Identity bind failed',e)}
 document.body.classList.add('gc-live');
}
function replaceState(server){
 const S=G.S(),log=S.log||[];for(const k of Object.keys(S))delete S[k];Object.assign(S,server);S.log=log;
 G.ensure();base=snap();
}
async function pull(){
 const r=await call('GET','/api/state?profile='+PROF);if(!r.ok)throw new Error(r.data.error||'Could not load data');
 if(!r.data.state){const mine=snap();const i=await call('POST','/api/init',{profile:PROF,state:mine});if(!i.ok){toast(i.data.error||'This workspace has not been started yet.');base=mine;rev=0;return}r.data=i.data}
 rev=r.data.rev;replaceState(r.data.state);G.renderAll();try{render()}catch{}
}
let resyncNeeded=false;
// Take the server's copy, then put back anything typed since the last save.
async function resync(sent){const late=SY.diff(sent,snap());await pull();if(late.length){const S=G.S();late.forEach(o=>SY.apply(S,o));G.save()}}
function schedule(){if(!connected)return;clearTimeout(timer);timer=setTimeout(push,250)}
async function push(){
 if(!connected)return;if(busy){dirty=true;return}
 const cur=snap(),ops=SY.diff(base,cur);if(!ops.length)return;
 busy=true;
 try{
  const r=await call('POST','/api/ops',{profile:PROF,ops});
  if(!r.ok){toast(r.data.error||'Could not save to the server.');throw new Error('save failed')}
  const ren=r.data.renames||{},S=G.S();
  if(r.data.seq&&S.seq)for(const k in r.data.seq)if(S.seq[k]<r.data.seq[k])S.seq[k]=r.data.seq[k];
  base=cur;rev=r.data.rev||rev;
  if(r.data.denied){toast(`Your role cannot change: ${(r.data.deniedPaths||[]).join(', ')}. Reloading shared data.`);await resync(cur)}
  else if(Object.keys(ren).length||resyncNeeded){resyncNeeded=false;Object.keys(ren).forEach(o=>toast(`${o} was already taken, so this record is now ${ren[o]}.`));await resync(cur)}
  refreshTrail();
 }catch(e){console.warn(e);setTimeout(()=>{if(connected)push()},5000)}
 finally{busy=false;if(dirty){dirty=false;schedule()}}
}
G.onSave=schedule;

// ---- live updates from other people and from connected systems ----
const AREA={issues:'issue',controls:'control',kris:'indicator',losses:'loss event',policies:'policy',vendors:'vendor',tests:'control test',appetite:'risk appetite'};
function describe(msg){const ops=msg.ops;if(!ops.length)return '';const o=ops[0],what=AREA[o.p[0]]||o.p.join(' ');
 const first=o.id?`${what} ${o.id}`:what;const more=ops.length>1?` and ${ops.length-1} more`:'';
 const verb=o.op==='del'?'removed':o.op==='put'?(o.isNew?'added':'updated'):'changed';return `${msg.by.name} ${verb} ${first}${more}`}
function startEvents(){
 if(es)es.close();let first=true;
 es=new EventSource(`${API}/api/events?profile=${encodeURIComponent(PROF)}&token=${encodeURIComponent(token)}`);
 es.onopen=()=>{if(!first&&!busy&&!SY.diff(base,snap()).length)pull().catch(()=>{});first=false;const d=document.getElementById('gcDot');if(d)d.style.background='#2e9d6f'};
 es.onerror=()=>{const d=document.getElementById('gcDot');if(d)d.style.background='#c9a13b'};
 es.onmessage=ev=>{let msg;try{msg=JSON.parse(ev.data)}catch{return}
  if(msg.type==='note'){onNote(msg.note);return}
  if(msg.type==='people'){syncPeople();return}
  if(msg.type==='files'){const d=G.UI.drawer;if(d&&d.id===msg.ref&&document.getElementById('gcFiles'))onDrawer(d);return}
  if(msg.type!=='ops')return;
  const S=G.S();let changed=0;
  for(const op of msg.ops){
   if(op.op==='put'&&op.isNew){let arr=S;op.p.forEach(k=>{arr=arr&&arr[k]});let ba=base;op.p.forEach(k=>{ba=ba&&ba[k]});
    if(Array.isArray(arr)&&arr.some(x=>x.id===op.id)&&!(Array.isArray(ba)&&ba.some(x=>x.id===op.id))){resyncNeeded=true;continue}} // same number used locally and not yet saved: settle after our save
   const a=SY.apply(S,op);const b=SY.apply(base,op);if(a||b)changed++}
  rev=msg.rev;
  if(changed){G.save();G.renderAll();try{render()}catch{}
   const mine=msg.by.name===user.name&&msg.by.source!=='integration';
   if(!mine){toast(describe(msg));const d=document.getElementById('gcDot');if(d){d.classList.remove('gcflash');void d.offsetWidth;d.classList.add('gcflash')}}}
  refreshTrail();
 };
}

// ---- audit trail module ----
let mounted=false;
function mountTrail(){
 if(mounted)return;mounted=true;
 G.mount({id:'trail',label:'Audit trail',ico:'⌖',group:'GOVERNANCE & ADMIN',title:'Audit trail',sub:'Every change made by people and connected systems, recorded on the server. It cannot be edited from the browser.',tabs:[['log','Change history']]});
 G.renders.push(renderTrail);
 document.addEventListener('input',e=>{if(e.target.id==='gcTrailQ'){trailQ=e.target.value;refreshTrail(true)}});
}
let tq=null;
function refreshTrail(now){clearTimeout(tq);tq=setTimeout(async()=>{if(!connected||!mounted)return;try{const r=await call('GET',`/api/audit?profile=${encodeURIComponent(PROF)}&limit=300&q=${encodeURIComponent(trailQ)}`);if(r.ok){trailRows=r.data.rows;renderTrail()}}catch{}},now?150:600)}
const ACT={created:'green',updated:'blue',deleted:'red','signed in':'blue',changed:'amber'};
function renderTrail(){
 const pn=G.panel('trail','log');if(!pn)return;const focus=document.activeElement&&document.activeElement.id==='gcTrailQ';
 const rows=trailRows.map(r=>{const d=r.detail,det=Array.isArray(d)?d.map(c=>`<div class="riskarea"><b>${E(c.field)}</b>: ${E(c.from)} → ${E(c.to)}</div>`).join(''):d&&d.title?E(d.title):d&&d.to?E('→ '+d.to):'';
  const t=new Date(r.ts),when=t.toLocaleDateString(undefined,{day:'2-digit',month:'short'})+' '+t.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  return `<tr style="cursor:default"><td style="white-space:nowrap">${E(when)}</td><td><div class="riskname">${E(r.user)}</div><div class="riskarea">${E(r.role||'')}</div></td><td>${G.pill(r.action,ACT[r.action]||'blue')}</td><td>${r.rec?G.lk(r.rec):''}<div class="riskarea">${E(r.coll||'')}</div></td><td style="white-space:normal">${det}</td></tr>`});
 pn.innerHTML=`<div class="toolbar"><input class="search" id="gcTrailQ" placeholder="Search by person, record or field…" value="${E(trailQ)}"></div>`+card('Change history',`${trailRows.length} most recent entries · updates live`,table(['When','Who','Action','Record','What changed'],rows,'No changes recorded yet.'));
 if(focus){const i=document.getElementById('gcTrailQ');i.focus();i.setSelectionRange(i.value.length,i.value.length)}
}

// ---- people: the app's owner lists follow the server's user list ----
async function syncPeople(){
 try{const r=await call('GET','/api/people');if(!r.ok)return;const list=r.data.people;
  list.forEach(p=>{let u=workflowState.users.find(x=>x.id===p.id);if(!u){u={id:p.id,name:p.name,role:p.role,scope:'All functions',enabled:!!p.active};workflowState.users.push(u)}u.name=p.name;u.role=p.role;u.enabled=!!p.active});
  workflowState.users.forEach(u=>{if(!list.find(p=>p.id===u.id))u.enabled=false});
  list.forEach(p=>{const i=workflowUsers.findIndex(x=>x.id===p.id);if(p.active&&i<0)workflowUsers.push({id:p.id,name:p.name,role:p.role,scope:'All functions'});else if(!p.active&&i>=0)workflowUsers.splice(i,1);else if(i>=0){workflowUsers[i].name=p.name;workflowUsers[i].role=p.role}});
  G.renderAll();renderUsers()}catch{}}

// ---- users and access (administrators) ----
let mountedUsers=false,userRows=[];
function mountUsers(){
 if(mountedUsers||user.role!=='Administrator')return;mountedUsers=true;
 G.mount({id:'users',label:'Users and access',ico:'☺',group:'GOVERNANCE & ADMIN',title:'Users and access',sub:'Invite people, set their role and switch accounts off. Roles are enforced on the server.',tabs:[['list','People']]});
 G.renders.push(renderUsers);
 Object.assign(G.actions,{
  'u-new':()=>G.openForm('Invite a person',[{name:'name',label:'Full name',full:true,ph:'Used to name them as an owner'},{name:'email',label:'Work email',full:true},{name:'role',label:'Role',type:'select',options:['Business user','Function user','Auditor','Administrator'],value:'Business user'}],'Create account',v=>{
   call('POST','/api/users',v).then(r=>{if(!r.ok){toast(r.data.error||'Could not create the account.');return}loadUsers();syncPeople();setTimeout(()=>G.openForm('Account created',[{name:'tp',label:`Temporary password for ${v.name} (shown once; they must change it at first sign-in)`,value:r.data.tempPassword,full:true}],'Done',()=>{}),0)})}),
  'u-role':b=>{if(b.value===b.dataset.cur)return;call('PATCH','/api/users/'+b.dataset.id,{role:b.value}).then(r=>{toast(r.ok?'Role updated.':(r.data.error||'Could not update.'));loadUsers();syncPeople()})},
  'u-active':b=>{call('PATCH','/api/users/'+b.dataset.id,{active:b.dataset.on==='1'}).then(r=>{toast(r.ok?(b.dataset.on==='1'?'Account switched on.':'Account switched off.'):(r.data.error||'Could not update.'));loadUsers();syncPeople()})},
  'u-reset':b=>{if(!confirm('Reset this person\'s password?'))return;call('POST','/api/users/'+b.dataset.id+'/reset').then(r=>{if(!r.ok){toast(r.data.error||'Could not reset.');return}G.openForm('Password reset',[{name:'tp',label:'New temporary password (shown once)',value:r.data.tempPassword,full:true}],'Done',()=>{})})}
 });
 document.addEventListener('change',e=>{const t=e.target;if(t.dataset&&t.dataset.op==='u-role')G.actions['u-role'](t)});
 loadUsers();
}
async function loadUsers(){try{const r=await call('GET','/api/users');if(r.ok){userRows=r.data.users;renderUsers()}}catch{}}
function renderUsers(){
 const pn=G.panel('users','list');if(!pn)return;G.head('users','<button class="btn primary" data-op="u-new"><span class="btnico">＋</span>Invite person</button>');
 const roles=['Administrator','Business user','Function user','Auditor'];
 const rows=userRows.map(u=>`<tr style="cursor:default"><td><div class="riskname">${E(u.name)}</div><div class="riskarea">${E(u.email)}</div></td><td><select class="select" data-op="u-role" data-id="${E(u.id)}" data-cur="${E(u.role)}">${roles.map(r=>`<option${r===u.role?' selected':''}>${r}</option>`).join('')}</select></td><td>${G.pill(u.active?(u.must_change?'Invited':'Active'):'Off',u.active?(u.must_change?'amber':'green'):'red')}</td><td><button class="op-mini" data-op="u-reset" data-id="${E(u.id)}">Reset password</button> <button class="op-mini" data-op="u-active" data-id="${E(u.id)}" data-on="${u.active?0:1}">${u.active?'Switch off':'Switch on'}</button></td></tr>`);
 pn.innerHTML=G.card('People',`${userRows.length} account(s). Names identify record owners, so use each person's full name.`,G.table(['Person','Role','Status','Actions'],rows,'No accounts yet.'));
}

// ---- notifications ----
let notes=[],bell=null;
function mountBell(){const bar=document.querySelector('.top-actions');if(!bar||document.getElementById('gcBell'))return;
 bell=document.createElement('div');bell.id='gcBell';bell.style.cssText='position:relative;margin-right:8px';
 bell.innerHTML='<button id="gcBellBtn" aria-label="Notifications" style="border:1px solid #d6dde5;background:#fff;border-radius:14px;padding:5px 11px;font:600 11px \'DM Sans\';cursor:pointer;color:#44566a">🔔 <span id="gcBellN"></span></button><div id="gcBellBox" style="display:none;position:absolute;right:0;top:34px;width:340px;max-height:420px;overflow:auto;background:#fff;border:1px solid #d6dde5;border-radius:10px;box-shadow:0 12px 40px #0003;z-index:60"></div>';
 bar.prepend(bell);
 bell.querySelector('#gcBellBtn').onclick=async()=>{const box=bell.querySelector('#gcBellBox');const open=box.style.display==='none';box.style.display=open?'block':'none';if(open){paintNotes();const un=notes.filter(n=>!n.seen).map(n=>n.id);if(un.length){await call('POST','/api/notifications/read',{ids:un});notes.forEach(n=>n.seen=true);setTimeout(paintBell,1500)}}};
 document.addEventListener('click',e=>{if(bell&&!bell.contains(e.target))bell.querySelector('#gcBellBox').style.display='none'});
 bell.addEventListener('click',e=>{const it=e.target.closest('[data-ref]');if(it){const ref=it.dataset.ref,l=G.lk(ref),m=/data-t="(\w+)"/.exec(l);bell.querySelector('#gcBellBox').style.display='none';if(m)G.openDrawer(m[1],ref);else if(G.risks.find(r=>r.id===ref))G.openDrawer('riskrec',ref)}})}
function paintBell(){const n=notes.filter(x=>!x.seen).length,el=document.getElementById('gcBellN');if(el)el.textContent=n?String(n):''}
function paintNotes(){const box=document.getElementById('gcBellBox');if(!box)return;box.innerHTML=`<div style="padding:10px 14px;border-bottom:1px solid #edf0f3;font:700 12px Manrope">Notifications</div>`+(notes.length?notes.map(n=>`<div ${n.ref?`data-ref="${E(n.ref)}"`:''} style="padding:10px 14px;border-bottom:1px solid #f1f4f7;cursor:${n.ref?'pointer':'default'};${n.seen?'':'background:#f4faf8'}"><div style="font:600 11.5px 'DM Sans';color:#26384c">${E(n.title)}</div><div style="font-size:10.5px;color:#6b7888;line-height:1.5">${E(n.body||'')}</div><div style="font-size:9.5px;color:#9aa6b2;margin-top:3px">${E(new Date(n.ts).toLocaleString())}${n.email?' · email: '+E(n.email):''}</div></div>`).join(''):'<div style="padding:18px;font-size:11px;color:#8a95a3">Nothing yet.</div>')}
async function loadNotes(){try{const r=await call('GET','/api/notifications?profile='+encodeURIComponent(PROF));if(r.ok){notes=r.data.rows;paintBell();paintNotes()}}catch{}}
function onNote(n){const mine=!n.who||n.who===user.name||user.role==='Administrator';if(!mine)return;notes.unshift({...n,seen:false});paintBell();paintNotes();if(n.who===user.name)toast(n.title)}

// ---- files on records ----
const FILE_TYPES=new Set(['issue','control','kri','loss','policy','vendor','evidence','finding','audit','riskrec','obligation','entity','dsr','breach','dpia','ropa','case']);
async function onDrawer(d){
 if(!connected||!d||!FILE_TYPES.has(d.type))return;const body=document.getElementById('opDB');if(!body)return;
 let box=document.getElementById('gcFiles');if(!box){box=document.createElement('div');box.id='gcFiles';body.appendChild(box)}
 let files=[];try{const r=await call('GET',`/api/files?profile=${encodeURIComponent(PROF)}&ref=${encodeURIComponent(d.id)}`);if(r.ok)files=r.data.files}catch{}
 if(!UIdrawerIs(d))return;
 const sz=n=>n>1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
 box.innerHTML=`<h4>Files</h4>${files.length?files.map(f=>`<div class="op-li"><div><b>${E(f.name)}</b><div class="riskarea">${sz(f.size)} · ${E(f.by)} · ${E(new Date(f.ts).toLocaleDateString())}</div></div><span><button class="op-mini" data-gcf="${f.id}" data-name="${E(f.name)}">Download</button>${user.role==='Administrator'||user.role==='Business user'?` <button class="op-mini" data-gcd="${f.id}">Remove</button>`:''}</span></div>`).join(''):'<p class="op-note">No files attached.</p>'}<label class="op-mini p" style="display:inline-block;cursor:pointer;margin-top:6px">Attach a file<input type="file" id="gcUp" style="display:none"></label><span class="op-note" style="margin-left:8px">PDF, images, Office files, CSV, text · up to 10 MB</span>`;
}
const UIdrawerIs=d=>G.UI.drawer&&G.UI.drawer.id===d.id&&G.UI.drawer.type===d.type;
G.drawerHooks.push(onDrawer);
document.addEventListener('change',async e=>{if(e.target.id!=='gcUp'||!e.target.files[0])return;const f=e.target.files[0],d=G.UI.drawer;if(!d)return;
 if(f.size>10*1024*1024){toast('Files can be up to 10 MB.');return}
 const r=await fetch(`${API}/api/files?profile=${encodeURIComponent(PROF)}&ref=${encodeURIComponent(d.id)}&name=${encodeURIComponent(f.name)}`,{method:'POST',headers:{authorization:'Bearer '+token},body:f});
 const j=await r.json().catch(()=>({}));toast(r.ok?`${f.name} attached.`:(j.error||'Could not attach the file.'));if(r.ok)onDrawer(d);refreshTrail()});
document.addEventListener('click',async e=>{const dl=e.target.closest('[data-gcf]'),rm=e.target.closest('[data-gcd]');
 if(dl){const r=await fetch(`${API}/api/files/${dl.dataset.gcf}`,{headers:{authorization:'Bearer '+token}});if(!r.ok){toast('Could not download.');return}const b=await r.blob(),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=dl.dataset.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000)}
 if(rm){if(!confirm('Remove this file?'))return;const r=await call('DELETE','/api/files/'+rm.dataset.gcd);toast(r.ok?'File removed.':(r.data.error||'Not permitted.'));if(G.UI.drawer)onDrawer(G.UI.drawer);refreshTrail()}});

// ---- go live ----
async function goLive(){
 connected=true;paintPill();bindIdentity();
 try{await pull()}catch(e){connected=false;paintPill();toast('Could not load shared data: '+e.message);return}
 mountTrail();mountUsers();mountBell();await syncPeople();loadNotes();startEvents();refreshTrail(true);G.renderAll();
 toast(`Connected as ${user.name} (${user.role}). Changes are shared live.`);
}
pill.addEventListener('click',e=>{if(e.target.id==='gcOut')signOut(false);if(e.target.id==='gcPwd')G.openForm('Change password',[{name:'cur',label:'Current password',type:'password',full:true},{name:'n1',label:'New password',type:'password',full:true},{name:'n2',label:'Repeat new password',type:'password',full:true}],'Change',v=>{if(v.n1!==v.n2)return 'The new passwords do not match.';call('POST','/api/password',{current:v.cur,next:v.n1}).then(r=>toast(r.ok?'Password changed.':(r.data.error||'Could not change it.')))});if(e.target.id==='gcSignIn'){ss.del(DKEY);showLogin('')}});

async function start(){

 try{const c=new AbortController(),t=setTimeout(()=>c.abort(),2000);const r=await fetch(API+'/api/health',{signal:c.signal});clearTimeout(t);const j=await r.json();if(!j||j.name!=='Forge GRC')return;health=j;try{const want=j.fixedDate?'demo':'real',have=localStorage.getItem('forgeGrcDate')==='real'?'real':'demo';if(want!==have&&!sessionStorage.getItem('gcDateSet')){localStorage.setItem('forgeGrcDate',want);sessionStorage.setItem('gcDateSet','1');location.reload();return}}catch{}}catch{return}
 mountPill();paintPill();
 if(token){try{const r=await call('GET','/api/me');if(r.ok){user=r.data.user;if(r.data.mustChange){showLogin('Please sign in again to choose a new password.');token=null;ss.del(TKEY);return}await goLive();return}}catch{}token=null;ss.del(TKEY)}
 if(!ss.get(DKEY))showLogin('');
}
start();
})();
