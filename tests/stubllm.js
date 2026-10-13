// Stand-in for the model API, used by the assistant test. Records the last request it received.
const http=require('http'),fs=require('fs');
const LOG=process.env.LLM_LOG||__dirname+'/llm-last.json';
http.createServer((rq,rs)=>{let d='';rq.on('data',c=>d+=c);rq.on('end',()=>{fs.writeFileSync(LOG,d);const b=JSON.parse(d);const q=b.messages[0].content;rs.setHeader('content-type','application/json');
 if(/FAIL-NOW/.test(q)){rs.statusCode=500;return rs.end('{}')}
 rs.end(JSON.stringify({content:[{type:'text',text:'**Summary:** '+(/<focus_record>\n\(none/.test(q)?'No record selected.':'Looks like a record about '+(q.match(/"id": "([A-Z]+-\d+)"/)||[])[1])+'. Start with R-101 and ISS-101.'}],usage:{input_tokens:100,output_tokens:20}}))})}).listen(+process.env.PORT||8191,()=>console.log('stub up'));
