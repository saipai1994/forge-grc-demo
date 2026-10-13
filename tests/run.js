// Runs the browser tests. Usage: node tests/run.js [filter]
// Needs Playwright's Chromium (npx playwright install chromium) or CHROMIUM=/path/to/chromium.
const {spawn}=require('child_process'),http=require('http'),fs=require('fs'),os=require('os'),path=require('path');
const ROOT=path.join(__dirname,'..'),filter=process.argv[2]||'';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
function staticServer(){return new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=new URL(rq.url,'http://x');let f=path.join(ROOT,decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){rs.statusCode=404;return rs.end()}rs.setHeader('content-type',MIME[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(rs)});s.listen(0,()=>r(s))})}
function run(file,env,timeout){return new Promise(res=>{const p=spawn('node',[path.join(__dirname,file)],{cwd:os.tmpdir(),env:{...process.env,...env}});let out='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>out+=d);
 const t=setTimeout(()=>{p.kill();out+='\nFAIL timed out\n'},timeout||150000);p.on('close',code=>{clearTimeout(t);res({code,out})})})}
function startServer(port,extra){const data=fs.mkdtempSync(path.join(os.tmpdir(),'forge-t-'));const p=spawn('node',[path.join(ROOT,'server/server.js')],{env:{...process.env,PORT:String(port),FORGE_DATA:data,FORGE_TODAY:'2026-10-12',FORGE_BACKUP:'0',...(extra||{})},stdio:'ignore'});return new Promise(r=>setTimeout(()=>r(p),1500))}
(async()=>{
 const st=await staticServer(),BASE='http://localhost:'+st.address().port;
 const demo=fs.readdirSync(__dirname).filter(f=>f.startsWith('demo-')&&f.includes(filter)),live=fs.readdirSync(__dirname).filter(f=>f.startsWith('live-')&&f.includes(filter));
 const results=[];let port=8300;
 const report=(f,r)=>{const fails=r.out.split('\n').filter(l=>/^FAIL/.test(l));const ok=r.code===0&&!fails.length;results.push([f,ok]);console.log((ok?'PASS ':'FAIL ')+f);if(!ok)console.log(r.out.split('\n').filter(l=>/FAIL|Error|errors \[[^\]]|timed out/.test(l)).slice(0,8).map(l=>'   '+l).join('\n'))};
 for(const f of demo)report(f,await run(f,{BASE},f==='demo-sectors.js'?420000:undefined));
 for(const f of live){
  if(f==='live-sso-mfa.js'){report(f,await run(f,{}));continue}
  const p0=port++;let extra={},stub=null;
  if(f==='live-assistant.js'){const sp=port++;stub=spawn('node',[path.join(__dirname,'stubllm.js')],{env:{...process.env,PORT:String(sp),LLM_LOG:path.join(os.tmpdir(),'llm-last.json')},stdio:'ignore'});extra={ANTHROPIC_API_KEY:'sk-test',FORGE_LLM_URL:'http://localhost:'+sp};await new Promise(r=>setTimeout(r,500))}
  const srv=await startServer(p0,extra);
  report(f,await run(f,{BASE,SERVER:'http://localhost:'+p0,LLM_LOG:path.join(os.tmpdir(),'llm-last.json')}));
  srv.kill();if(stub)stub.kill()}
 const bad=results.filter(r=>!r[1]).length;console.log(`\n${results.length-bad} of ${results.length} browser tests passed`);st.close();process.exit(bad?1:0)})();
