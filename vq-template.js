// Vendor questionnaire: questions, weights and scoring. Used by the server, the portal page and the app.
(function(root){
const T={id:'infosec-core',title:'Information security and privacy questionnaire',version:'1.0',
 sections:[
 {id:'gov',title:'Governance',qs:[
  {id:'g1',q:'Do you have a board- or executive-approved information security policy that is reviewed at least once a year?',w:3},
  {id:'g2',q:'Is there a named person responsible for information security and for data protection?',w:2},
  {id:'g3',q:'Do all staff complete security and privacy training when they join and every year?',w:2}]},
 {id:'acc',title:'Access and identity',qs:[
  {id:'a1',q:'Is multi-factor authentication required for remote access and for all administrator accounts?',w:3},
  {id:'a2',q:'Is access to customer data limited to people who need it, and reviewed at least every quarter?',w:3},
  {id:'a3',q:'Is access removed on the day someone leaves or changes role?',w:2}]},
 {id:'dat',title:'Data protection',qs:[
  {id:'d1',q:'Is customer data encrypted in transit and at rest?',w:3},
  {id:'d2',q:'Do you know where customer data is stored and processed, and will you tell us before that changes?',w:2},
  {id:'d3',q:'Can you delete or return customer data when the contract ends, and confirm it in writing?',w:2},
  {id:'d4',q:'Do you use sub-processors, and do you hold contracts that pass these obligations on to them?',w:2}]},
 {id:'res',title:'Resilience and incidents',qs:[
  {id:'r1',q:'Do you have a tested business continuity and disaster recovery plan covering the service you provide to us?',w:3},
  {id:'r2',q:'Are backups taken regularly, kept separately and restored in a test at least once a year?',w:2},
  {id:'r3',q:'Will you notify us of a security incident affecting our data within 72 hours?',w:3},
  {id:'r4',q:'Do you have a documented incident response process that you have exercised in the last year?',w:2}]},
 {id:'ass',title:'Assurance',qs:[
  {id:'s1',q:'Do you hold an independent certification or report (for example ISO 27001 or SOC 2) that covers this service?',w:3},
  {id:'s2',q:'Is penetration testing done by an independent party at least once a year, with findings fixed?',w:2},
  {id:'s3',q:'Are you willing to let us audit you, or answer follow-up questions, if we need to?',w:1}]}]};
const VAL={'Yes':1,'Partial':0.5,'No':0};
T.questions=()=>T.sections.flatMap(s=>s.qs.map(q=>({...q,section:s.title})));
// score 0 to 100 (higher is better). "N/A" answers are left out. Critical questions (weight 3) answered "No" are flagged.
T.score=answers=>{answers=answers||{};let got=0,tot=0,answered=0;const all=T.questions(),flags=[];
 for(const q of all){const a=answers[q.id]&&answers[q.id].a;if(a==null||a==='')continue;answered++;if(a==='N/A')continue;tot+=q.w;got+=q.w*(VAL[a]??0);if(a==='No'&&q.w>=3)flags.push(q.id)}
 return{score:tot?Math.round(got/tot*100):0,answered,total:all.length,flags,complete:answered===all.length}};
if(typeof module!=='undefined'&&module.exports)module.exports=T;else root.GRC_VQ=T;
})(typeof window!=='undefined'?window:globalThis);
