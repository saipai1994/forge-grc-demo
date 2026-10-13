// Pretends to be a monitoring system: sends indicator readings to the ingest API every few seconds.
// Usage: node server/feed-sim.js [profile] [seconds]   (server must be running; KEY via FORGE_INGEST_KEY)
const profile=process.argv[2]||'manufacturing',every=(+process.argv[3]||5)*1000,base=process.env.FORGE_URL||'http://localhost:8080',key=process.env.FORGE_INGEST_KEY||'dev-ingest-key';
const H={'content-type':'application/json','x-api-key':key};
async function state(){const tok=(await (await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'morgan@forge.demo',password:process.env.FORGE_DEMO_PASSWORD||'forge-demo'})})).json()).token;
 return (await (await fetch(`${base}/api/state?profile=${profile}`,{headers:{authorization:'Bearer '+tok}})).json()).state}
(async()=>{const st=await state();if(!st){console.error('Open the app and sign in once so the workspace exists.');process.exit(1)}
 const cur=Object.fromEntries(st.kris.map(k=>[k.id,{...k,v:k.series[k.series.length-1]}]));const ids=Object.keys(cur);
 console.log(`Feeding ${ids.length} indicators to ${base} every ${every/1000}s. Ctrl+C to stop.`);
 setInterval(async()=>{const k=cur[ids[Math.floor(Math.random()*ids.length)]];
  const span=Math.max(1,k.red-k.amber),drift=(Math.random()-0.35)*span*0.5;let v=Math.max(0,k.v+drift);v=k.unit==='%'?Math.round(v*10)/10:Math.round(v);k.v=v;
  try{const r=await (await fetch(base+'/api/ingest/kri',{method:'POST',headers:H,body:JSON.stringify({profile,id:k.id,value:v,source:'Monitoring feed'})})).json();console.log(k.id,v,r.status_after||r.error,r.issue_raised?'→ issue raised':'')}catch(e){console.error(e.message)}},every)})();
