// Time-based one-time passwords (RFC 6238) and recovery codes. No dependencies.
'use strict';
const crypto=require('node:crypto');
const A='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32enc(buf){let bits=0,val=0,out='';for(const b of buf){val=(val<<8)|b;bits+=8;while(bits>=5){out+=A[(val>>>(bits-5))&31];bits-=5}}if(bits>0)out+=A[(val<<(5-bits))&31];return out}
function b32dec(s){s=String(s).toUpperCase().replace(/[^A-Z2-7]/g,'');let bits=0,val=0;const out=[];for(const c of s){val=(val<<5)|A.indexOf(c);bits+=5;if(bits>=8){out.push((val>>>(bits-8))&255);bits-=8}}return Buffer.from(out)}
const newSecret=()=>b32enc(crypto.randomBytes(20));
function hotp(secret,counter,digits){const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(counter));const h=crypto.createHmac('sha1',b32dec(secret)).update(b).digest();const o=h[h.length-1]&15;const n=((h[o]&0x7f)<<24)|(h[o+1]<<16)|(h[o+2]<<8)|h[o+3];return String(n%10**digits).padStart(digits,'0')}
const step=(t,period)=>Math.floor((t==null?Date.now():t)/1000/(period||30));
const code=(secret,t,digits)=>hotp(secret,step(t),digits||6);
// returns the matching time step (so a code cannot be used twice) or -1
function verify(secret,input,t,window){input=String(input||'').replace(/\s/g,'');if(!/^\d{6}$/.test(input))return -1;const s=step(t);
 for(let w=-(window==null?1:window);w<=(window==null?1:window);w++){const c=hotp(secret,s+w,6);if(c.length===input.length&&crypto.timingSafeEqual(Buffer.from(c),Buffer.from(input)))return s+w}return -1}
const uri=(secret,account,issuer)=>`otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
const recoveryCodes=()=>Array.from({length:8},()=>{const r=crypto.randomBytes(5).toString('hex');return r.slice(0,5)+'-'+r.slice(5)});
module.exports={b32enc,b32dec,newSecret,hotp,code,verify,uri,recoveryCodes};
