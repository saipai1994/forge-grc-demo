// Minimal SMTP client (plain, STARTTLS or implicit TLS) with AUTH PLAIN/LOGIN. No dependencies.
// FORGE_SMTP_URL=smtp://user:pass@host:587   (STARTTLS is used when the server offers it)
//               smtps://user:pass@host:465   (implicit TLS)
// FORGE_MAIL_FROM="Forge GRC <noreply@example.com>"
'use strict';
const net=require('node:net'),tls=require('node:tls'),crypto=require('node:crypto'),os=require('node:os');
const configured=()=>!!process.env.FORGE_SMTP_URL;
function cfg(){const u=new URL(process.env.FORGE_SMTP_URL);const secure=u.protocol==='smtps:';return{secure,host:u.hostname,port:+u.port||(secure?465:587),user:decodeURIComponent(u.username||''),pass:decodeURIComponent(u.password||''),from:process.env.FORGE_MAIL_FROM||('Forge GRC <noreply@'+u.hostname+'>'),insecure:process.env.FORGE_SMTP_INSECURE_TLS==='1'}}
const addr=s=>{const m=/<([^>]+)>/.exec(s);return (m?m[1]:s).trim()};
const enc=s=>/^[\x20-\x7e]*$/.test(s)?s:'=?UTF-8?B?'+Buffer.from(s,'utf8').toString('base64')+'?=';
function reader(sock){let buf='';const waiters=[];let err=null;
 const onData=d=>{buf+=d.toString('utf8');pump()},onErr=e=>{err=e;while(waiters.length)waiters.shift().rej(e)},onClose=()=>onErr(new Error('Connection closed'));
 function attach(s){s.on('data',onData);s.on('error',onErr);s.on('close',onClose)}
 function pump(){while(waiters.length){const lines=buf.split('\r\n');let end=-1;for(let i=0;i<lines.length-1;i++){if(/^\d{3}( |$)/.test(lines[i])){end=i;break}}if(end<0)return;const block=lines.slice(0,end+1);buf=lines.slice(end+1).join('\r\n');waiters.shift().res({code:+block[end].slice(0,3),lines:block})}}
 attach(sock);
 return{read:()=>new Promise((res,rej)=>{if(err)return rej(err);waiters.push({res,rej});pump()}),swap:s=>{buf='';attach(s)}}}
async function send({to,subject,text,from}){
 if(!configured())throw new Error('SMTP not configured');const c=cfg();const F=from||c.from;
 let sock=await new Promise((res,rej)=>{const s=c.secure?tls.connect({host:c.host,port:c.port,rejectUnauthorized:!c.insecure,servername:c.host},()=>res(s)):net.connect({host:c.host,port:c.port},()=>res(s));s.setTimeout(20000,()=>{s.destroy(new Error('SMTP timeout'))});s.once('error',rej)});
 const rd=reader(sock);
 const write=l=>sock.write(l+'\r\n');
 const cmd=async(l,ok)=>{write(l);const r=await rd.read();if(!ok.includes(r.code))throw new Error(`SMTP ${r.code} after "${l.split(' ')[0]}"`);return r};
 try{
  let r=await rd.read();if(r.code!==220)throw new Error('SMTP greeting '+r.code);
  r=await cmd('EHLO '+(os.hostname()||'forge'),[250]);
  if(!c.secure&&r.lines.some(l=>/STARTTLS/i.test(l))){await cmd('STARTTLS',[220]);const t=tls.connect({socket:sock,rejectUnauthorized:!c.insecure,servername:c.host});await new Promise((res,rej)=>{t.once('secureConnect',res);t.once('error',rej)});sock.removeAllListeners('data');sock.removeAllListeners('close');sock.removeAllListeners('error');sock=t;rd.swap(t);r=await cmd('EHLO '+(os.hostname()||'forge'),[250])}
  if(c.user){const mech=r.lines.join(' ');if(/AUTH[^\r\n]*PLAIN/i.test(mech)||!/AUTH/i.test(mech)){await cmd('AUTH PLAIN '+Buffer.from('\0'+c.user+'\0'+c.pass).toString('base64'),[235])}
   else{await cmd('AUTH LOGIN',[334]);await cmd(Buffer.from(c.user).toString('base64'),[334]);await cmd(Buffer.from(c.pass).toString('base64'),[235])}}
  await cmd('MAIL FROM:<'+addr(F)+'>',[250]);await cmd('RCPT TO:<'+addr(to)+'>',[250,251]);await cmd('DATA',[354]);
  const body=Buffer.from(String(text||''),'utf8').toString('base64').replace(/(.{76})/g,'$1\r\n');
  const msg=[`From: ${F}`,`To: ${to}`,`Subject: ${enc(subject||'')}`,`Date: ${new Date().toUTCString()}`,`Message-ID: <${crypto.randomUUID()}@forge>`,'MIME-Version: 1.0','Content-Type: text/plain; charset=utf-8','Content-Transfer-Encoding: base64','',body].join('\r\n');
  write(msg.replace(/^\./gm,'..')+'\r\n.');r=await rd.read();if(r.code!==250)throw new Error('SMTP rejected the message ('+r.code+')');
  try{write('QUIT')}catch{}
 }finally{try{sock.end()}catch{}}
}
module.exports={configured,send};
