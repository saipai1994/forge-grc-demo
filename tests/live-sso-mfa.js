const {chromium}=require('playwright');const {spawn}=require('child_process');
const R=path.join(__dirname,'..');const {start,idp}=require(R+'/server/mock-idp.js');const MFA=require(R+'/server/mfa.js');
(async()=>{const ok=(n,v)=>console.log(v?'PASS':'FAIL',n);const errs=[];
 const {url}=await start(9301);const data=fs.mkdtempSync(path.join(require('os').tmpdir(),'forge-sso-'));
 const srv=spawn('node',['server/server.js'],{cwd:R,env:{...process.env,PORT:'8091',FORGE_DATA:data,FORGE_TODAY:'2026-10-12',FORGE_OIDC_ISSUER:url,FORGE_OIDC_CLIENT_ID:'forge',FORGE_OIDC_CLIENT_SECRET:'s3cret',FORGE_PUBLIC_URL:'http://localhost:8091'},stdio:'ignore'});
 await new Promise(r=>setTimeout(r,1800));
 const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined});const U='http://localhost:8091';
 // ---- SSO
 const c1=await b.newContext({viewport:{width:1300,height:900}});const p=await c1.newPage();p.on('pageerror',e=>errs.push(e.message));
 await p.goto(U+'/index.html#bfsi');await p.waitForSelector('#gcLogin');ok('SSO button shown',!!(await p.$('#gcSso')));
 await p.click('#gcSso');await p.waitForSelector('#gcDot',{timeout:10000});await p.waitForTimeout(800);
 ok('signed in through the identity provider as Priya',/Priya Shah/.test(await p.textContent('#gcPill')));
 ok('one-time code removed from the address bar',!/sso=/.test(p.url()));
 // ---- two-step for Morgan
 const c2=await b.newContext({viewport:{width:1300,height:900}});const m=await c2.newPage();m.on('pageerror',e=>errs.push('m '+e.message));
 await m.goto(U+'/index.html#bfsi');await m.waitForSelector('#gcLogin');await m.fill('#gcEmail','morgan@forge.demo');await m.fill('#gcPw','forge-demo');await m.click('#gcLogin button[type=submit]');await m.waitForSelector('#gcDot',{timeout:8000});await m.waitForTimeout(800);
 await m.click('#gcMfa');await m.waitForSelector('#gcLogin');const secret=(await m.textContent('#gcLogin div[style*="DM Mono"]')).trim();ok('secret shown ('+secret.length+' chars)',/^[A-Z2-7]{32}$/.test(secret));
 await m.fill('#gcCode','000000');await m.click('#gcLogin button[type=submit]');await m.waitForTimeout(400);ok('wrong code refused',/not correct/.test(await m.textContent('#gcErr')));
 await m.fill('#gcCode',MFA.code(secret));await m.click('#gcLogin button[type=submit]');await m.waitForSelector('#gcDone');
 const codes=(await m.textContent('#gcLogin div[style*="DM Mono"]')).match(/[0-9a-f]{5}-[0-9a-f]{5}/g);ok('8 recovery codes shown',codes.length===8);await m.click('#gcDone');await m.waitForTimeout(300);
 await m.click('#gcOut');await m.waitForSelector('#gcLogin');await m.fill('#gcEmail','morgan@forge.demo');await m.fill('#gcPw','forge-demo');await m.click('#gcLogin button[type=submit]');
 await m.waitForSelector('#gcCode');ok('password alone now asks for a code',true);
 await m.fill('#gcCode','111111');await m.click('#gcLogin button[type=submit]');await m.waitForTimeout(400);ok('wrong code refused at sign-in',/not correct/.test(await m.textContent('#gcErr')));
 await m.fill('#gcCode',codes[0]);await m.click('#gcLogin button[type=submit]');await m.waitForSelector('#gcDot',{timeout:8000});ok('recovery code signs in',/Morgan/.test(await m.textContent('#gcPill')));
 // admin resets someone else's two-step: users module
 await m.click('.nav button[data-view="users"]');await m.waitForTimeout(500);ok('reset two-step button in the users list',!!(await m.$('[data-op="u-mfa"]')));
 console.log('errors',errs.slice(0,4));await b.close();srv.kill();process.exit(0)})().catch(e=>{console.error(e.message);process.exit(1)});
