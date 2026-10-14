// Stand-in regulator feeds for tests. PORT=nnnn node tests/stubfeed.js
//   /rss.xml   RSS 2.0 (a CDATA item, an item mentioning "RBI KYC Directions", an ETag)
//   /atom.xml  Atom 1.0
//   /evil.xml  a feed with a DOCTYPE/ENTITY declaration (must be refused)
//   /redir.xml redirects to /rss.xml
const http=require('http');
const RSS=`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>Stub Regulator News</title><link>http://stub.example/</link>
<item><title>RBI KYC Directions: amendment to periodic updation timelines</title><link>http://stub.example/rbi-kyc-1</link><guid>stub-rss-1</guid><pubDate>Mon, 12 Oct 2026 09:00:00 GMT</pubDate><description>The Reserve Bank of India has issued an amendment to the RBI KYC Directions. Regulated entities must comply by the effective date.</description></item>
<item><title><![CDATA[Garden show opens & "flowers" <b>galore</b>]]></title><link>http://stub.example/garden</link><guid>stub-rss-2</guid><pubDate>Sun, 11 Oct 2026 09:00:00 GMT</pubDate><description><![CDATA[<p>Annual <i>garden</i> exhibition &amp; fair.</p>]]></description></item>
<item><title>Notice on cyber incident reporting &#38; 6 hour clock &#x41;</title><link>http://stub.example/cyber</link><guid>stub-rss-3</guid><description>Circular on incident reporting.</description></item>
</channel></rss>`;
const ATOM=`<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>Stub Law Firm Alerts</title><id>urn:stub:atom</id>
<entry><title>DORA register of information: new data points</title><id>urn:stub:atom:1</id><link rel="alternate" href="http://stub.example/dora"/><updated>2026-10-10T08:00:00Z</updated><summary type="html">&lt;p&gt;The ESAs updated the DORA register of information template.&lt;/p&gt;</summary></entry>
<entry><title>Office party planning</title><id>urn:stub:atom:2</id><link href="http://stub.example/party"/><updated>2026-10-09T08:00:00Z</updated><content type="text">Pizza on Friday.</content></entry>
</feed>`;
const EVIL=`<?xml version="1.0"?><!DOCTYPE rss [<!ENTITY xxe "boom">]><rss version="2.0"><channel><title>x</title><item><title>&xxe;</title></item></channel></rss>`;
const srv=http.createServer((q,s)=>{
 if(q.url==='/rss.xml'){if(q.headers['if-none-match']==='"v1"'){s.writeHead(304);return s.end()}s.writeHead(200,{'content-type':'application/rss+xml',etag:'"v1"'});return s.end(RSS)}
 if(q.url==='/atom.xml'){s.writeHead(200,{'content-type':'application/atom+xml'});return s.end(ATOM)}
 if(q.url==='/evil.xml'){s.writeHead(200,{'content-type':'application/xml'});return s.end(EVIL)}
 if(q.url==='/redir.xml'){s.writeHead(302,{location:'/rss.xml'});return s.end()}
 s.writeHead(404);s.end()});
if(require.main===module)srv.listen(+process.env.PORT||8399,()=>console.log('stub feeds on',srv.address().port));
module.exports={srv,RSS,ATOM,EVIL};
