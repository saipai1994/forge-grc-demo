// A tiny stand-in OpenID Connect provider for tests and local trials. Not for production.
const http=require('http'),crypto=require('crypto');
const {publicKey,privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'k1',use:'sig',alg:'RS256'};
const b64=o=>Buffer.from(typeof o==='string'?o:JSON.stringify(o)).toString('base64url');
const idp={email:'priya@forge.demo',verified:true,tamper:false,badNonce:false,badAud:false,name:'Priya Shah'};
const codes=new Map();let idpUrl='';
function start(port){return new Promise(r=>mock.listen(port||0,()=>{idpUrl='http://localhost:'+mock.address().port;r({url:idpUrl,idp})}))}
module.exports={start,idp};
const mock=http.createServer((rq,rs)=>{const u=new URL(rq.url,idpUrl);
 if(u.pathname==='/.well-known/openid-configuration'){rs.setHeader('content-type','application/json');return rs.end(JSON.stringify({issuer:idpUrl,authorization_endpoint:idpUrl+'/authorize',token_endpoint:idpUrl+'/token',jwks_uri:idpUrl+'/jwks'}))}
 if(u.pathname==='/jwks'){rs.setHeader('content-type','application/json');return rs.end(JSON.stringify({keys:[jwk]}))}
 if(u.pathname==='/authorize'){const code=crypto.randomBytes(8).toString('hex');codes.set(code,{challenge:u.searchParams.get('code_challenge'),nonce:u.searchParams.get('nonce')});const r=new URL(u.searchParams.get('redirect_uri'));r.searchParams.set('code',code);r.searchParams.set('state',u.searchParams.get('state'));rs.writeHead(302,{location:r.toString()});return rs.end()}
 if(u.pathname==='/token'){let d='';rq.on('data',c=>d+=c);rq.on('end',()=>{const f=new URLSearchParams(d),c=codes.get(f.get('code'));codes.delete(f.get('code'));
  const ok=c&&crypto.createHash('sha256').update(f.get('code_verifier')).digest('base64url')===c.challenge&&rq.headers.authorization==='Basic '+Buffer.from('forge:s3cret').toString('base64');
  if(!ok){rs.statusCode=400;return rs.end('{"error":"invalid_grant"}')}
  const now=Math.floor(Date.now()/1000),claims={iss:idpUrl,aud:idp.badAud?'someone-else':'forge',sub:'u1',email:idp.email,email_verified:idp.verified,name:idp.name,nonce:idp.badNonce?'wrong':c.nonce,iat:now,exp:now+300};
  const head=b64({alg:'RS256',kid:'k1',typ:'JWT'}),body=b64(claims),sig=crypto.sign('sha256',Buffer.from(head+'.'+body),privateKey).toString('base64url');
  rs.setHeader('content-type','application/json');rs.end(JSON.stringify({id_token:head+'.'+body+'.'+(idp.tamper?sig.slice(0,-4)+'AAAA':sig),access_token:'x',token_type:'Bearer'}))});return}
 rs.statusCode=404;rs.end()});

