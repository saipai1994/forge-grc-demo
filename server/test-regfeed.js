// Unit tests for the regulatory feed parser, SSRF guard, fetch and scoring. Run: node server/test-regfeed.js
const assert=require('assert'),RF=require('./regfeed.js'),{srv,RSS,ATOM}=require('../tests/stubfeed.js');
let n=0;const t=(name,fn)=>Promise.resolve().then(fn).then(()=>{n++;console.log('ok  ',name)},e=>{console.error('FAIL',name,'-',e.message);process.exitCode=1});
const throws=(fn,re)=>{let e;try{fn()}catch(x){e=x}assert(e,'expected an error');if(re)assert(re.test(e.message),e.message)};
(async()=>{
await t('RSS: items, CDATA, entities, numeric refs',()=>{const f=RF.parseFeed(RSS);assert.equal(f.format,'rss');assert.equal(f.items.length,3);
 assert.equal(f.title,'Stub Regulator News');assert.equal(f.items[1].title,'Garden show opens & "flowers" galore');assert.equal(f.items[1].summary,'Annual garden exhibition & fair.');
 assert.equal(f.items[2].title,'Notice on cyber incident reporting & 6 hour clock A');assert.equal(f.items[0].published,'2026-10-12T09:00:00.000Z');assert.equal(f.items[0].guid,'stub-rss-1')});
await t('Atom: link, escaped html summary, id as guid',()=>{const f=RF.parseFeed(ATOM);assert.equal(f.format,'atom');assert.equal(f.items.length,2);assert.equal(f.items[0].link,'http://stub.example/dora');assert.equal(f.items[0].summary,'The ESAs updated the DORA register of information template.');assert.equal(f.items[1].summary,'Pizza on Friday.');assert.equal(f.items[0].guid,'urn:stub:atom:1')});
await t('DOCTYPE and ENTITY are refused',()=>{throws(()=>RF.parseFeed('<?xml version="1.0"?><!DOCTYPE x [<!ENTITY a "b">]><rss><channel/></rss>'),/DOCTYPE/);throws(()=>RF.parseFeed('<!doctype rss><rss/>'),/DOCTYPE/);throws(()=>RF.parseFeed('<rss><channel><!ENTITY a "b"></channel></rss>'),/ENTITY/)});
await t('unknown entities stay literal (no expansion), bad numeric refs dropped',()=>{const f=RF.parseFeed('<rss><channel><item><title>a &foo; b &#0; c &#xD800; d</title><guid>1</guid></item></channel></rss>');assert.equal(f.items[0].title,'a &foo; b c d')});
await t('malformed XML and non-feeds are rejected',()=>{throws(()=>RF.parseFeed('<rss><channel><item></channel></rss>'),/Malformed/);throws(()=>RF.parseFeed('<html><body/></html>'),/Not an RSS/);throws(()=>RF.parseFeed(''),/Not an RSS|empty/)});
await t('javascript: links are dropped',()=>{const f=RF.parseFeed('<rss><channel><item><title>x</title><link>javascript:alert(1)</link></item></channel></rss>');assert.equal(f.items[0].link,'')});
await t('caps: 200 items, 4000 characters',()=>{let x='<rss><channel>';for(let i=0;i<500;i++)x+=`<item><title>t${i}</title><guid>g${i}</guid><description>${'a'.repeat(9000)}</description></item>`;const f=RF.parseFeed(x+'</channel></rss>');assert.equal(f.items.length,200);assert(f.items[0].summary.length<=4000)});
await t('deep nesting is refused',()=>{throws(()=>RF.parseFeed('<rss>'+'<a>'.repeat(200)+'</rss>'),/nested|Malformed/)});
await t('address classification',()=>{for(const a of ['127.0.0.1','10.1.2.3','192.168.0.5','172.16.0.1','172.31.255.255','169.254.169.254','0.0.0.0','100.64.0.1','::1','fe80::1','fd00:ec2::254','::ffff:127.0.0.1','::ffff:7f00:1','224.0.0.1'])assert(RF.blockedAddress(a),a+' should be blocked');
 for(const a of ['8.8.8.8','172.32.0.1','93.184.216.34','2606:4700:4700::1111'])assert(!RF.blockedAddress(a),a+' should be allowed')});
await new Promise(r=>srv.listen(0,r));const base='http://127.0.0.1:'+srv.address().port;
const clear=()=>{delete process.env.FORGE_FEED_ALLOW_HTTP;delete process.env.FORGE_FEED_ALLOW_PRIVATE};
await t('https only; private refused by default',async()=>{clear();await assert.rejects(RF.checkUrl('http://example.com/x'),/https/);await assert.rejects(RF.checkUrl('https://user:pw@example.com/x'),/user name/);
 process.env.FORGE_FEED_ALLOW_HTTP='1';await assert.rejects(RF.checkUrl(base+'/rss.xml'),/refused/);await assert.rejects(RF.checkUrl('http://localhost/x'),/refused/);await assert.rejects(RF.checkUrl('http://[::1]/x'),/refused/);await assert.rejects(RF.checkUrl('http://169.254.169.254/latest'),/refused/)});
process.env.FORGE_FEED_ALLOW_HTTP='1';process.env.FORGE_FEED_ALLOW_PRIVATE='1';
await t('fetch, etag/304, redirect',async()=>{const r=await RF.fetchFeed(base+'/rss.xml');assert(r.xml.includes('<rss')&&r.etag==='"v1"');const r2=await RF.fetchFeed(base+'/rss.xml',{etag:r.etag});assert(r2.notModified);const r3=await RF.fetchFeed(base+'/redir.xml');assert(r3.xml.includes('<rss'))});
await t('fetch errors: 404, redirect loop, oversize',async()=>{await assert.rejects(RF.fetchFeed(base+'/nope'),/404/);
 const http=require('http');const s=http.createServer((q,res)=>{if(q.url==='/loop'){res.writeHead(302,{location:'/loop'});return res.end()}res.writeHead(200,{'content-length':3*1024*1024});res.write(Buffer.alloc(1024*1024));setTimeout(()=>res.end(Buffer.alloc(2*1024*1024)),50)});await new Promise(r=>s.listen(0,r));const b2='http://127.0.0.1:'+s.address().port;
 await assert.rejects(RF.fetchFeed(b2+'/loop'),/redirect/);await assert.rejects(RF.fetchFeed(b2+'/big'),/2 MB/);s.close()});
await t('scoring: RBI KYC item scores high and names the framework',()=>{const it=RF.parseFeed(RSS).items[0];const s=RF.scoreItem(it,{adopted:new Set(['rbi-kyc']),orgThemes:new Set(['FC']),feedJur:'IN'});
 assert(s.score>=60,'score '+s.score);const m=s.matched.find(x=>x.fw==='rbi-kyc');assert(m&&/adopted/.test(m.why),JSON.stringify(s.matched));
 const s2=RF.scoreItem(it,{});assert(s2.score<s.score);const g=RF.scoreItem(RF.parseFeed(RSS).items[1],{});assert(g.score<=10,'garden '+g.score);assert.equal(RF.scoreItem({title:'x',summary:''}).matched.length,0)});
await t('scoring: DORA item matches dora',()=>{const s=RF.scoreItem(RF.parseFeed(ATOM).items[0],{adopted:new Set(['dora'])});assert(s.matched.some(x=>x.fw==='dora'),JSON.stringify(s.matched));assert(s.score>=50,String(s.score))});
// ---- SSRF: connect-time validation, pinning, redirects (DNS rebinding) ----
const http=require('http');
const resolver=map=>(host,opts,cb)=>{map.calls=(map.calls||0)+1;const r=map[host];if(!r)return cb(Object.assign(new Error('not found'),{code:'ENOTFOUND'}));cb(null,r.map(a=>({address:a,family:a.includes(':')?6:4})))};
const lookup=(host)=>new Promise((ok,no)=>RF.safeLookup(host,{all:true},(e,a)=>e?no(e):ok(a)));
await t('address classification: IPv6 spellings of private IPv4, deprecated and embedded forms',()=>{
 for(const a of ['::ffff:10.0.0.1','::ffff:a00:1','::ffff:169.254.169.254','::ffff:a9fe:a9fe','::ffff:c0a8:1','::127.0.0.1','::7f00:1','64:ff9b::7f00:1','64:ff9b::10.1.2.3','2002:7f00:1::','2002:a9fe:a9fe::1','fec0::1','fc00::1','ff02::1','0:0:0:0:0:0:0:1','::FFFF:127.0.0.1','[::1]'.slice(1,-1)])assert(RF.blockedAddress(a),a+' should be blocked');
 for(const a of ['::ffff:8.8.8.8','::ffff:808:808','64:ff9b::808:808','2002:808:808::1','2001:4860:4860::8888','2a00:1450:4009:81f::200e'])assert(!RF.blockedAddress(a),a+' should be allowed');
 assert(RF.blockedAddress('not an address'),'garbage is refused')});
await t('safeLookup refuses loopback, private, link-local and IPv4-mapped answers (pinned lookup)',async()=>{
 delete process.env.FORGE_FEED_ALLOW_PRIVATE;
 RF._hooks.resolve=resolver({'lo.test':['127.0.0.1'],'priv.test':['10.1.2.3'],'meta.test':['169.254.169.254'],'v6.test':['::1'],'map.test':['::ffff:127.0.0.1'],'map2.test':['::ffff:a9fe:a9fe'],'ll.test':['fe80::1'],'mixed.test':['93.184.216.34','192.168.1.5'],'pub.test':['93.184.216.34'],'pub6.test':['2606:4700:4700::1111']});
 for(const h of ['lo.test','priv.test','meta.test','v6.test','map.test','map2.test','ll.test','mixed.test'])await assert.rejects(lookup(h),e=>e.code==='FORGE_BLOCKED'&&/refused/.test(e.message),h+' should be refused');
 const ok1=await lookup('pub.test');assert.equal(ok1[0].address,'93.184.216.34');assert.equal((await lookup('pub6.test'))[0].address,'2606:4700:4700::1111');
 const single=await new Promise((ok,no)=>RF.safeLookup('pub.test',{},(e,a,f)=>e?no(e):ok([a,f])));assert.deepEqual(single,['93.184.216.34',4],'single-address form returns the validated address');
 await assert.rejects(lookup('nx.test'),/not found/);
 process.env.FORGE_FEED_ALLOW_PRIVATE='1';assert.equal((await lookup('lo.test'))[0].address,'127.0.0.1','the test switch still works');delete process.env.FORGE_FEED_ALLOW_PRIVATE;RF._hooks.resolve=null});
await t('fetchFeed refuses a name that resolves to a private address at connect time (no request is sent)',async()=>{
 let hits=0;const s=http.createServer((q,r)=>{hits++;r.end('x')});await new Promise(r=>s.listen(0,r));const port=s.address().port;
 process.env.FORGE_FEED_ALLOW_HTTP='1';delete process.env.FORGE_FEED_ALLOW_PRIVATE;
 // the old check (resolve, then fetch) would have passed this: the first answer is public, the second is loopback. Now there is only one answer and it is the one used.
 const m={'rebind.test':['127.0.0.1']};RF._hooks.resolve=resolver(m);
 await assert.rejects(RF.fetchFeed(`http://rebind.test:${port}/rss.xml`),/refused/);assert.equal(hits,0,'nothing reached the server');assert.equal(m.calls,1,'one resolution, used for the connection');
 // IP literals are refused without any lookup
 for(const lit of [`http://127.0.0.1:${port}/`,`http://[::ffff:7f00:1]:${port}/`,`http://[::ffff:127.0.0.1]:${port}/`,`http://[::1]:${port}/`,`http://169.254.169.254/latest`,`http://10.0.0.1/`])await assert.rejects(RF.fetchFeed(lit),/refused/,lit);
 assert.equal(hits,0);RF._hooks.resolve=null;s.close()});
await t('fetchFeed connects to the validated address only (pinned), keeping the host name for the request',async()=>{
 let host='';const s=http.createServer((q,r)=>{host=q.headers.host;r.setHeader('content-type','application/xml');r.end(RSS)});await new Promise(r=>s.listen(0,r));const port=s.address().port;
 process.env.FORGE_FEED_ALLOW_HTTP='1';process.env.FORGE_FEED_ALLOW_PRIVATE='1';
 const m={'feed.test':['127.0.0.1']};RF._hooks.resolve=resolver(m);
 const r=await RF.fetchFeed(`http://feed.test:${port}/rss.xml`);assert(r.xml.includes('<rss'));assert.equal(host,'feed.test:'+port);assert.equal(m.calls,1,'resolved once');
 delete process.env.FORGE_FEED_ALLOW_PRIVATE;RF._hooks.resolve=null;s.close()});
await t('a redirect to a private or link-local address is refused on that hop (literal, mapped IPv6 and named)',async()=>{
 process.env.FORGE_FEED_ALLOW_HTTP='1';
 for(const target of ['http://169.254.169.254/latest/meta-data','http://[::ffff:a9fe:a9fe]/x','http://[::1]/x','http://10.0.0.5/x','NAMED']){
  let after=0;const s2=http.createServer((q,r)=>{after++;r.end('secret')});await new Promise(r=>s2.listen(0,r));
  const s=http.createServer((q,r)=>{delete process.env.FORGE_FEED_ALLOW_PRIVATE; // the first hop was allowed; from here on the guard is on
   r.writeHead(302,{location:target==='NAMED'?`http://inner.test:${s2.address().port}/x`:target});r.end()});
  await new Promise(r=>s.listen(0,r));
  const m={'inner.test':['10.0.0.5']};RF._hooks.resolve=resolver(m);
  process.env.FORGE_FEED_ALLOW_PRIVATE='1';
  await assert.rejects(RF.fetchFeed(`http://127.0.0.1:${s.address().port}/start`),/refused/,target);
  assert.equal(after,0,'the redirect target was never contacted');RF._hooks.resolve=null;delete process.env.FORGE_FEED_ALLOW_PRIVATE;s.close();s2.close()}});
await t('redirect hop 2 is validated before any request is made (first hop served by a stand-in)',async()=>{
 // hop 1 is served through the request hook (stands in for a public server); hop 2 must be refused before it is requested
 process.env.FORGE_FEED_ALLOW_HTTP='1';delete process.env.FORGE_FEED_ALLOW_PRIVATE;
 const {Readable}=require('stream');let calls=[];
 RF._hooks.request=async(url)=>{calls.push(url.href);if(calls.length===1){const r=Readable.from([]);r.statusCode=302;r.headers={location:'http://127.0.0.1:1/internal'};return r}throw new Error('should not connect')};
 await assert.rejects(RF.fetchFeed('http://public.example/feed'),/refused/);assert.equal(calls.length,1,'second hop never requested');RF._hooks.request=null});
srv.close();console.log(n+' checks run');
})();
