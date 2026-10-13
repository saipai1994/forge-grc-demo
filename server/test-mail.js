// Checks the SMTP client against stand-in mail servers (plain with login, STARTTLS and implicit TLS).
const net=require('net'),tls=require('tls'),fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process'),assert=require('assert');
const MAIL=require('./mail.js');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'forge-mail-'));
cp.execSync(`openssl req -x509 -newkey rsa:2048 -nodes -keyout ${dir}/k.pem -out ${dir}/c.pem -days 2 -subj /CN=localhost 2>/dev/null`);
const KEY=fs.readFileSync(dir+'/k.pem'),CERT=fs.readFileSync(dir+'/c.pem');
function server({mode,auth}){const got={msgs:[],auth:null};
 const handle=sock=>{let data=false,body='',tlsDone=mode!=='starttls',cur=sock;const w=l=>cur.write(l+'\r\n');w('220 mock ESMTP');
  let buf='';cur.on('data',function onD(d){buf+=d.toString();let i;while((i=buf.indexOf('\r\n'))>=0){const line=buf.slice(0,i);buf=buf.slice(i+2);
   if(data){if(line==='.'){data=false;got.msgs.push(body);body='';w('250 queued')}else body+=line+'\n';continue}
   const u=line.toUpperCase();
   if(u.startsWith('EHLO')){cur.write('250-mock\r\n'+(mode==='starttls'&&!tlsDone?'250-STARTTLS\r\n':'')+(tlsDone&&auth?'250-AUTH PLAIN LOGIN\r\n':'')+'250 OK\r\n')}
   else if(u==='STARTTLS'){w('220 go ahead');const t=new tls.TLSSocket(cur,{isServer:true,key:KEY,cert:CERT});cur.removeListener('data',onD);t.on('data',onD);t.on('error',()=>{});cur=t;tlsDone=true;buf=''}
   else if(u.startsWith('AUTH PLAIN')){got.auth=Buffer.from(line.slice(11),'base64').toString().split('\0').slice(1).join(':');w(got.auth==='u:p'?'235 ok':'535 bad')}
   else if(u.startsWith('MAIL FROM')||u.startsWith('RCPT TO')){got[u.startsWith('MAIL')?'from':'to']=line.replace(/^[^<]*</,'').replace(/>.*/,'');w('250 OK')}
   else if(u==='DATA'){data=true;w('354 go')}else if(u==='QUIT'){w('221 bye');cur.end()}else w('250 OK')}})};
 const srv=mode==='tls'?tls.createServer({key:KEY,cert:CERT},handle):net.createServer(handle);return new Promise(r=>srv.listen(0,()=>r({srv,got,port:srv.address().port})))}
(async()=>{
 process.env.FORGE_SMTP_INSECURE_TLS='1';process.env.FORGE_MAIL_FROM='Forge GRC <noreply@example.com>';
 for(const [mode,scheme,auth] of [['plain','smtp',true],['starttls','smtp',true],['tls','smtps',true]]){
  const s=await server({mode,auth});process.env.FORGE_SMTP_URL=`${scheme}://u:p@localhost:${s.port}`;
  await MAIL.send({to:'Priya <priya@example.com>',subject:'Issue ISS-9 assigned to you — café',text:'Line one\n.starts with a dot\nÜmlaut'});
  const m=s.got.msgs[0];assert(m,mode+': message received');assert.equal(s.got.to,'priya@example.com',mode+': recipient');assert.equal(s.got.from,'noreply@example.com',mode+': sender');assert.equal(s.got.auth,'u:p',mode+': authenticated');
  assert(/Subject: =\?UTF-8\?B\?/.test(m),mode+': non-ASCII subject encoded');const body=Buffer.from(m.split('\n\n').slice(1).join('').replace(/\s/g,''),'base64').toString();assert(body.includes('.starts with a dot')&&body.includes('Ümlaut'),mode+': body intact');
  console.log('ok',mode);s.srv.close()}
 process.env.FORGE_SMTP_URL='smtp://u:wrong@localhost:1';let failed=false;try{await MAIL.send({to:'a@b.c',subject:'x',text:'y'})}catch{failed=true}assert(failed,'unreachable server reports failure');
 process.env.FORGE_SMTP_URL;const s2=await server({mode:'plain',auth:true});process.env.FORGE_SMTP_URL=`smtp://u:bad@localhost:${s2.port}`;failed=false;try{await MAIL.send({to:'a@b.c',subject:'x',text:'y'})}catch(e){failed=/535|235/.test(e.message)}assert(failed,'bad password reported');s2.srv.close();
 console.log('Mail checks passed');process.exit(0)})().catch(e=>{console.error('FAILED:',e.message);process.exit(1)});
