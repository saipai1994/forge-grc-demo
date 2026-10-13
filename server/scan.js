// Virus scanning through a ClamAV daemon (clamd), using the INSTREAM protocol.
// FORGE_CLAMD_HOST=127.0.0.1  FORGE_CLAMD_PORT=3310   Without a host, scanning is off.
'use strict';
const net=require('node:net');
const configured=()=>!!process.env.FORGE_CLAMD_HOST;
function scan(buf){
 return new Promise((resolve,reject)=>{
  const s=net.connect({host:process.env.FORGE_CLAMD_HOST,port:+process.env.FORGE_CLAMD_PORT||3310});let out='',done=false;
  const end=(f,v)=>{if(done)return;done=true;try{s.destroy()}catch{}f(v)};
  s.setTimeout(30000,()=>end(reject,new Error('Scanner timed out')));s.on('error',e=>end(reject,new Error('Scanner unreachable: '+e.message)));
  s.on('data',d=>{out+=d.toString('latin1');if(out.includes('\0')||out.includes('\n')){const r=out.replace(/[\0\n]+$/,'').trim();
   if(/ OK$/.test(r))end(resolve,{clean:true});else if(/ FOUND$/.test(r))end(resolve,{clean:false,signature:r.replace(/^stream:\s*/,'').replace(/ FOUND$/,'')});else end(reject,new Error('Scanner said: '+r.slice(0,100)))}});
  s.on('connect',()=>{s.write('zINSTREAM\0');for(let i=0;i<buf.length;i+=65536){const c=buf.subarray(i,i+65536),h=Buffer.alloc(4);h.writeUInt32BE(c.length);s.write(h);s.write(c)}s.write(Buffer.alloc(4))});
 })}
module.exports={configured,scan};
