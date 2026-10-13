// Checks single sign-on against a stand-in identity provider.
const os=require('os'),fs=require('fs'),path=require('path'),http=require('http'),crypto=require('crypto'),assert=require('assert');
process.env.FORGE_DATA=fs.mkdtempSync(path.join(os.tmpdir(),'forge-oidc-'));
const {start,idp}=require('./mock-idp.js');
let idpUrl='';
(async()=>{
 idpUrl=(await start()).url;
 Object.assign(process.env,{FORGE_OIDC_ISSUER:idpUrl,FORGE_OIDC_CLIENT_ID:'forge',FORGE_OIDC_CLIENT_SECRET:'s3cret'});
 const {server,db}=require('./server.js');await new Promise(r=>server.listen(0,r));const base='http://localhost:'+server.address().port;process.env.FORGE_PUBLIC_URL=base;
 const hz=await (await fetch(base+'/api/health')).json();assert(hz.oidc===true,'health advertises single sign-on');
 // one full sign-in
 async function flow(){const l=await fetch(base+'/api/oidc/login',{redirect:'manual'});assert.equal(l.status,302,'login redirects to the provider');const ck=l.headers.get('set-cookie').split(';')[0];
  const a=await fetch(l.headers.get('location'),{redirect:'manual'});const cb=await fetch(a.headers.get('location'),{redirect:'manual',headers:{cookie:ck}});return{cb,ck,loc:cb.headers.get('location')||''}}
 let r=await flow();assert(/\/index\.html\?sso=/.test(r.loc),'callback sends the browser back with a one-time code: '+r.loc);
 const code=new URL(r.loc,base).searchParams.get('sso');
 const ex=await fetch(base+'/api/oidc/exchange',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code})});const j=await ex.json();assert(j.token&&j.user.email==='priya@forge.demo','one-time code exchanged for a session');
 assert.equal((await fetch(base+'/api/oidc/exchange',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code})})).status,401,'the code works only once');
 assert.equal((await fetch(base+'/api/me',{headers:{authorization:'Bearer '+j.token}})).status,200,'the session works');
 // attacks and mistakes
 const l=await fetch(base+'/api/oidc/login',{redirect:'manual'});const a=await fetch(l.headers.get('location'),{redirect:'manual'});
 let bad=await fetch(a.headers.get('location'),{redirect:'manual'});assert(/ssoerror/.test(bad.headers.get('location')),'callback without the browser cookie is refused (login CSRF)');
 idp.tamper=true;r=await flow();assert(/ssoerror/.test(r.loc)&&/trusted/.test(decodeURIComponent(r.loc)),'tampered token refused');idp.tamper=false;
 idp.badNonce=true;r=await flow();assert(/ssoerror/.test(r.loc),'wrong nonce refused');idp.badNonce=false;
 idp.badAud=true;r=await flow();assert(/ssoerror/.test(r.loc),'wrong audience refused');idp.badAud=false;
 idp.verified=false;r=await flow();assert(/ssoerror/.test(r.loc),'unverified email refused');idp.verified=true;
 idp.email='stranger@example.com';r=await flow();assert(/ssoerror/.test(r.loc)&&/administrator/.test(decodeURIComponent(r.loc)),'unknown people are not let in by default');
 process.env.FORGE_OIDC_PROVISION='1';process.env.FORGE_OIDC_ROLE='Function user';r=await flow();assert(/sso=/.test(r.loc),'with provisioning on, a new person is created');
 const nu=db.prepare('SELECT role,name FROM users WHERE email=?').get('stranger@example.com');assert(nu&&nu.role==='Function user','provisioned with the configured role, not admin');
 db.prepare("UPDATE users SET active=0 WHERE email='priya@forge.demo'").run();idp.email='priya@forge.demo';r=await flow();assert(/ssoerror/.test(r.loc),'switched-off accounts cannot sign in through SSO');
 process.env.FORGE_LOCAL_LOGIN='0';assert.equal((await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'morgan@forge.demo',password:'forge-demo'})})).status,403,'password sign-in can be turned off');
 console.log('SSO checks passed');process.exit(0)})().catch(e=>{console.error('FAILED:',e.message);process.exit(1)});
