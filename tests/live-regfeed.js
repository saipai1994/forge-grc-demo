// Live: regulatory feed ingestion against the test server and stub feeds (tests/stubfeed.js).
// The runner starts the server with FORGE_FEED_ALLOW_HTTP=1 FORGE_FEED_ALLOW_PRIVATE=1 FORGE_FEED_SCHEDULER=0 and passes STUB and SPARE_PORT.
const {chromium}=require('playwright'),{spawn}=require('child_process'),path=require('path'),os=require('os'),fs=require('fs');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});const errs=[];const ok=(n,v)=>console.log(v?'PASS':'FAIL',n);
const SERVER=process.env.SERVER||'http://localhost:8090',STUB=process.env.STUB||'http://127.0.0.1:8399';
async function open(email){const c=await b.newContext({viewport:{width:1440,height:1000}});const p=await c.newPage();p.on('pageerror',e=>errs.push(email+' '+e.message));p.on('console',m=>m.type()==='error'&&!/404|40[0-9] \(/.test(m.text())&&errs.push(email+' '+m.text()));
 await p.goto(SERVER+'/index.html#bfsi');await p.waitForSelector('#gcLogin');await p.fill('#gcEmail',email);await p.fill('#gcPw','forge-demo');await p.click('#gcLogin .go');await p.waitForSelector('#gcDot',{timeout:8000});await p.waitForTimeout(1200);return p}
const call=(p,m,u,body)=>p.evaluate(([m,u,body])=>GRC.api.call(m,u,body).then(r=>({status:r.status,ok:r.ok,data:r.data})),[m,u,body]);
const A=await open('morgan@forge.demo'),B=await open('jordan@forge.demo');
// business users may read but not configure
let r=await call(B,'POST','/api/regfeed/feeds',{profile:'bfsi',name:'x',url:STUB+'/rss.xml'});ok('business user cannot add a feed (403)',r.status===403);
r=await call(B,'GET','/api/regfeed/feeds?profile=bfsi');ok('business user can list feeds',r.ok&&r.data.feeds.length===0);
// administrator adds two feeds
r=await call(A,'POST','/api/regfeed/feeds',{profile:'bfsi',name:'Stub regulator news',url:STUB+'/rss.xml',jur:'IN',kind:'Regulator',interval_min:60});const f1=r.data.feed;ok('add RSS feed',r.ok&&f1&&f1.id&&f1.interval_min===60);
r=await call(A,'POST','/api/regfeed/feeds',{profile:'bfsi',name:'Stub law firm alerts',url:STUB+'/atom.xml',jur:'EU',kind:'Law firm'});const f2=r.data.feed;ok('add Atom feed',r.ok&&f2);
r=await call(A,'POST','/api/regfeed/feeds',{profile:'bfsi',name:'dup',url:STUB+'/atom.xml'});ok('duplicate url refused (409)',r.status===409);
r=await call(A,'POST','/api/regfeed/feeds',{profile:'bfsi',name:'bad',url:'ftp://example.com/x'});ok('non-http scheme refused (400)',r.status===400);
// refresh
r=await call(A,'POST','/api/regfeed/refresh',{profile:'bfsi'});const added=r.data.results.reduce((n,x)=>n+(x.added||0),0);ok('refresh adds 5 items '+JSON.stringify(r.data.results.map(x=>x.added)),r.ok&&added===5&&r.data.results.every(x=>!x.error));
r=await call(A,'GET','/api/regfeed/items?profile=bfsi');const its=r.data.items;
const kyc=its.find(i=>/RBI KYC Directions/.test(i.title)),garden=its.find(i=>/Garden show/.test(i.title)),dora=its.find(i=>/DORA/.test(i.title));
ok('5 items listed, sorted by score',its.length===5&&its.every((x,i)=>i===0||its[i-1].score>=x.score));
ok('RBI KYC item scores high and matches rbi-kyc '+(kyc&&kyc.score),kyc&&kyc.score>=60&&kyc.matched.some(m=>m.fw==='rbi-kyc')&&kyc.feed_name==='Stub regulator news'&&kyc.feed_jur==='IN');
ok('CDATA item decoded to plain text',garden&&garden.title==='Garden show opens & "flowers" galore'&&garden.summary==='Annual garden exhibition & fair.'&&garden.score<kyc.score);
ok('Atom item matches DORA',dora&&dora.matched.some(m=>m.fw==='dora'));
r=await call(A,'GET','/api/regfeed/items?profile=bfsi&min=60');ok('min filter works',r.data.items.length>=1&&r.data.items.every(i=>i.score>=60)&&r.data.items.length<5);
// dedupe and conditional fetch
r=await call(A,'POST','/api/regfeed/refresh',{profile:'bfsi'});ok('second refresh adds nothing (dedupe, 304)',r.ok&&r.data.results.every(x=>!x.added)&&r.data.results.some(x=>x.notModified));
r=await call(A,'GET','/api/regfeed/items?profile=bfsi');ok('still 5 items',r.data.items.length===5);
// DOCTYPE feed
r=await call(A,'POST','/api/regfeed/feeds',{profile:'bfsi',name:'Evil',url:STUB+'/evil.xml'});const f3=r.data.feed;
r=await call(A,'POST','/api/regfeed/refresh',{profile:'bfsi',feed:f3.id});ok('DOCTYPE feed refused and error recorded',r.data.results[0].error&&/DOCTYPE/.test(r.data.results[0].error));
r=await call(A,'GET','/api/regfeed/feeds?profile=bfsi');const ev=r.data.feeds.find(f=>f.id===f3.id);ok('last_err visible in the feed list, no items from it',/DOCTYPE/.test(ev.last_err)&&!ev.last_ok);
// UI: the inbox row explains the match, then convert through the button
await A.click('.nav button[data-view="regchange"]');await A.click('#opTabs-regchange [data-tab="feed"]');await A.waitForTimeout(1200);
const panel='[data-panel="regchange:feed"]';
ok('inbox lists live items, no demo banner',(await A.$$eval(panel+' tbody tr',x=>x.length))===5&&!/Demo mode/.test(await A.textContent(panel)));
const row=await A.$(`${panel} tr[data-rf-item="${kyc.id}"]`);ok('KYC row has explanation and source link with rel=noopener',/rbi-kyc|RBI KYC/.test(await row.innerHTML())&&/rel="noopener noreferrer"/.test(await row.innerHTML()));
const rc0=await A.evaluate(()=>GRC.S().regchg.length);
await row.$eval('[data-op="rf-convert"]',x=>x.click());await A.waitForTimeout(1500);
const recA=await A.evaluate(()=>GRC.S().regchg.slice(-1)[0]);
ok('conversion created a change record in the creator\'s state '+recA.id,(await A.evaluate(()=>GRC.S().regchg.length))===rc0+1&&recA.source==='Stub regulator news'&&recA.link===kyc.link&&recA.fw==='rbi-kyc'&&recA.title===kyc.title);
await B.waitForTimeout(1200);
const recB=await B.evaluate(id=>GRC.S().regchg.find(x=>x.id===id),recA.id);ok('another user sees the record live',recB&&recB.title===kyc.title&&recB.link===kyc.link);
r=await call(A,'POST','/api/regfeed/items/'+kyc.id+'/convert',{profile:'bfsi'});ok('converting twice is refused (409)',r.status===409);
r=await call(A,'GET','/api/regfeed/items?profile=bfsi&status=Converted');ok('item is Converted with record id',r.data.items.length===1&&r.data.items[0].converted===recA.id);
r=await call(A,'GET','/api/audit?profile=bfsi&limit=100');ok('audit trail records feed actions',r.data.rows.some(x=>x.coll==='regfeed'&&x.action==='feed added')&&r.data.rows.some(x=>x.action==='item converted'));
// triage and dismiss, by a business user
r=await call(B,'POST','/api/regfeed/items/'+garden.id,{status:'Dismissed'});ok('business user dismisses an item',r.ok);
r=await call(B,'POST','/api/regfeed/items/'+garden.id,{status:'Bogus'});ok('bad status refused',r.status===400);
r=await call(B,'POST','/api/regfeed/items/'+dora.id,{status:'Triaged'});r=await call(B,'GET','/api/regfeed/items?profile=bfsi&status=Triaged');ok('triaged filter',r.data.items.length===1&&r.data.items[0].id===dora.id);
// convert by a different user (business user) and the id sequence continues
r=await call(B,'POST','/api/regfeed/items/'+dora.id+'/convert',{profile:'bfsi'});ok('business user converts too, next id',r.ok&&r.data.id===('RC-'+String(+recA.id.slice(3)+1).padStart(3,'0')));
// auditor is read-only
const aud=await open('audrey@forge.demo');r=await call(aud,'GET','/api/regfeed/items?profile=bfsi');ok('auditor can read',r.ok);
r=await call(aud,'POST','/api/regfeed/items/'+garden.id,{status:'New'});ok('auditor cannot change items (403)',r.status===403);
// remove a feed
r=await call(A,'DELETE','/api/regfeed/feeds/'+f3.id);ok('administrator removes a feed',r.ok);
r=await call(B,'DELETE','/api/regfeed/feeds/'+f2.id);ok('business user cannot remove a feed',r.status===403);
// SSRF: a second server without FORGE_FEED_ALLOW_PRIVATE refuses loopback addresses
const port=+process.env.SPARE_PORT||18999,data=fs.mkdtempSync(path.join(os.tmpdir(),'forge-rf-'));
const sp=spawn('node',[path.join(__dirname,'..','server','server.js')],{env:{...process.env,PORT:String(port),FORGE_DATA:data,FORGE_BACKUP:'0',FORGE_FEED_ALLOW_HTTP:'1',FORGE_FEED_SCHEDULER:'0',FORGE_FEED_ALLOW_PRIVATE:''},stdio:'ignore'});
await new Promise(r=>setTimeout(r,1500));
try{const U='http://localhost:'+port,lg=await (await fetch(U+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'morgan@forge.demo',password:'forge-demo'})})).json();
 const h={'content-type':'application/json',authorization:'Bearer '+lg.token};
 for(const u of ['http://127.0.0.1:1/feed.xml','http://localhost/x','http://169.254.169.254/latest/meta-data','http://[::1]/x']){const x=await fetch(U+'/api/regfeed/feeds',{method:'POST',headers:h,body:JSON.stringify({profile:'bfsi',name:'ssrf',url:u})});const j=await x.json();ok('SSRF refused '+u+' -> '+x.status,x.status===400&&/refused/.test(j.error))}}
finally{sp.kill()}
console.log('errors',errs.slice(0,4));ok('no page errors',!errs.length);await b.close()})()
