// OpenID Connect sign-in (authorization code flow with PKCE). No dependencies.
// FORGE_OIDC_ISSUER, FORGE_OIDC_CLIENT_ID, FORGE_OIDC_CLIENT_SECRET (optional for public clients)
'use strict';
const crypto=require('node:crypto');
const configured=()=>!!(process.env.FORGE_OIDC_ISSUER&&process.env.FORGE_OIDC_CLIENT_ID);
const b64u=b=>Buffer.from(b).toString('base64url');
let disc=null,discAt=0,jwks=null,jwksAt=0;
async function getJson(url){const r=await fetch(url,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('HTTP '+r.status+' from '+new URL(url).pathname);return r.json()}
async function discover(){if(disc&&Date.now()-discAt<3600e3)return disc;const iss=process.env.FORGE_OIDC_ISSUER.replace(/\/$/,'');disc=await getJson(iss+'/.well-known/openid-configuration');discAt=Date.now();return disc}
async function keys(force){if(!force&&jwks&&Date.now()-jwksAt<3600e3)return jwks;const d=await discover();jwks=(await getJson(d.jwks_uri)).keys||[];jwksAt=Date.now();return jwks}
const pkce=()=>{const verifier=b64u(crypto.randomBytes(32));return{verifier,challenge:b64u(crypto.createHash('sha256').update(verifier).digest())}};
async function authUrl({redirect,state,nonce,challenge}){const d=await discover();const u=new URL(d.authorization_endpoint);
 u.search=new URLSearchParams({response_type:'code',client_id:process.env.FORGE_OIDC_CLIENT_ID,redirect_uri:redirect,scope:process.env.FORGE_OIDC_SCOPE||'openid email profile',state,nonce,code_challenge:challenge,code_challenge_method:'S256'}).toString();return u.toString()}
async function exchange({code,redirect,verifier}){const d=await discover();const body=new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:redirect,client_id:process.env.FORGE_OIDC_CLIENT_ID,code_verifier:verifier});
 const headers={'content-type':'application/x-www-form-urlencoded'};if(process.env.FORGE_OIDC_CLIENT_SECRET)headers.authorization='Basic '+Buffer.from(encodeURIComponent(process.env.FORGE_OIDC_CLIENT_ID)+':'+encodeURIComponent(process.env.FORGE_OIDC_CLIENT_SECRET)).toString('base64');
 const r=await fetch(d.token_endpoint,{method:'POST',headers,body,signal:AbortSignal.timeout(10000)});const j=await r.json().catch(()=>({}));if(!r.ok||!j.id_token)throw new Error('The sign-in service refused the request');return j}
async function verifyIdToken(token,{nonce}){
 const parts=String(token).split('.');if(parts.length!==3)throw new Error('Malformed token');
 const head=JSON.parse(Buffer.from(parts[0],'base64url')),claims=JSON.parse(Buffer.from(parts[1],'base64url'));
 if(head.alg!=='RS256'&&head.alg!=='ES256')throw new Error('Unsupported signing algorithm');
 let ks=await keys(false),k=ks.find(x=>x.kid===head.kid&&(!x.use||x.use==='sig'));if(!k){ks=await keys(true);k=ks.find(x=>x.kid===head.kid)}if(!k)throw new Error('Unknown signing key');
 const pub=crypto.createPublicKey({key:k,format:'jwk'}),data=Buffer.from(parts[0]+'.'+parts[1]),sig=Buffer.from(parts[2],'base64url');
 const okSig=head.alg==='RS256'?crypto.verify('sha256',data,pub,sig):crypto.verify('sha256',data,{key:pub,dsaEncoding:'ieee-p1363'},sig);if(!okSig)throw new Error('Bad signature');
 const d=await discover(),now=Math.floor(Date.now()/1000);
 if(claims.iss!==d.issuer)throw new Error('Wrong issuer');
 const aud=[].concat(claims.aud||[]);if(!aud.includes(process.env.FORGE_OIDC_CLIENT_ID))throw new Error('Wrong audience');
 if(!claims.exp||claims.exp<now-60)throw new Error('Token expired');if(claims.nbf&&claims.nbf>now+60)throw new Error('Token not yet valid');
 if(claims.nonce!==nonce)throw new Error('Nonce mismatch');
 return claims}
module.exports={configured,pkce,authUrl,exchange,verifyIdToken};
