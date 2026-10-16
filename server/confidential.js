// Server-side confidentiality for documents. A document with conf === 'Restricted' (and everything tied to it) is
// visible only to: Administrators, its owner, its creator, and the people named in its access list.
//   dmsDocs[].owner, .createdBy   person names (as in dms-core.js)
//   dmsDocs[].shared              access list (names), written by the "Edit details" screen
//   dmsDocs[].access              optional alias for the same thing; names or user ids are both accepted
// Tied to a document: its files (/api/files, ref = document id), signature requests (esReq[].doc), and audit rows about them.
// Auditors get no special view: they see a Restricted document only when named like anyone else (they stay
// read-only everywhere through the `only` rule in server.js).
// All functions are pure; server.js applies them to state pulls, ops, the live stream, files and the audit trail.
'use strict';

const who=u=>[u&&u.name,u&&u.id].filter(Boolean);
const accessList=d=>[...(Array.isArray(d.access)?d.access:[]),...(Array.isArray(d.shared)?d.shared:[])];
const isRestricted=d=>!!d&&d.conf==='Restricted';
const isAdmin=u=>!!u&&u.role==='Administrator';

function canSeeDoc(d,user){
 if(!isRestricted(d)||isAdmin(user))return true;
 const me=who(user);if(!me.length)return false;
 return me.includes(d.owner)||me.includes(d.createdBy)||accessList(d).some(x=>me.includes(x))}
const docOf=(st,id)=>Array.isArray(st&&st.dmsDocs)?st.dmsDocs.find(d=>d&&d.id===id):undefined;
// a signature request follows the confidentiality of its document
function canSeeReq(st,req,user){const d=req&&docOf(st,req.doc);return !d||canSeeDoc(d,user)}
// a file or audit reference may be a document id or a signature request id
function canSeeRef(st,ref,user){
 if(isAdmin(user))return true;
 const d=docOf(st,ref);if(d)return canSeeDoc(d,user);
 const r=Array.isArray(st&&st.esReq)&&st.esReq.find(x=>x&&x.id===ref);return r?canSeeReq(st,r,user):true}

// State for one person: hidden documents and their signature requests removed. Returns the same object when nothing is hidden.
function filterState(st,user){
 if(!st||isAdmin(user))return st;
 const docs=Array.isArray(st.dmsDocs)?st.dmsDocs.filter(d=>canSeeDoc(d,user)):st.dmsDocs;
 const reqs=Array.isArray(st.esReq)?st.esReq.filter(r=>canSeeReq(st,r,user)):st.esReq;
 if((!Array.isArray(st.dmsDocs)||docs.length===st.dmsDocs.length)&&(!Array.isArray(st.esReq)||reqs.length===st.esReq.length))return st;
 const out={...st};if(Array.isArray(st.dmsDocs))out.dmsDocs=docs;if(Array.isArray(st.esReq))out.esReq=reqs;return out}

// May this person's operation proceed? (checked against the stored state before it is applied)
function opAllowed(st,op,user){
 if(isAdmin(user)||!op||!Array.isArray(op.p)||op.p.length!==1)return true;
 const k=op.p[0];
 if(k==='dmsDocs'){
  if(op.op==='set'||op.op==='unset')return !(st.dmsDocs||[]).some(d=>!canSeeDoc(d,user));
  const ex=docOf(st,op.id);return !ex||canSeeDoc(ex,user)}
 if(k==='esReq'){
  if(op.op==='set'||op.op==='unset')return !(st.esReq||[]).some(r=>!canSeeReq(st,r,user));
  const ex=(st.esReq||[]).find(r=>r.id===op.id);
  if(ex)return canSeeReq(st,ex,user);
  return op.op!=='put'||!op.rec||canSeeReq(st,op.rec,user)}
 return true}

// What a person should hear about a change that was applied. `before` is the stored record before the change (put/del),
// `st` the state afterwards. Returns the operation to send, or null when it must not reach this person.
function opForUser(op,before,st,user){
 if(isAdmin(user)||!op||!Array.isArray(op.p)||op.p.length!==1)return op;
 const k=op.p[0];
 if(k==='dmsDocs'){
  if(op.op==='set')return Array.isArray(op.v)?{...op,v:op.v.filter(d=>canSeeDoc(d,user))}:op;
  if(op.op==='del')return before&&!canSeeDoc(before,user)?null:op;
  if(op.op==='put'){const after=canSeeDoc(op.rec,user),was=before?canSeeDoc(before,user):false;
   if(after)return op;
   return was?{op:'del',p:op.p,id:op.id}:null} // it just became hidden from them: take it off their screen
  return op}
 if(k==='esReq'){
  if(op.op==='set')return Array.isArray(op.v)?{...op,v:op.v.filter(r=>canSeeReq(st,r,user))}:op;
  const r=op.op==='put'?op.rec:before;return r&&!canSeeReq(st,r,user)?null:op}
 return op}

// Audit rows about a hidden document or request are hidden too. A row whose record no longer exists is shown only to its actor.
function auditRowVisible(row,st,user){
 if(isAdmin(user)||!row||!row.rec)return true;
 const c=row.coll;if(c!=='dmsDocs'&&c!=='esReq'&&c!=='files')return true;
 const known=docOf(st,row.rec)||(Array.isArray(st&&st.esReq)&&st.esReq.some(r=>r.id===row.rec));
 if(known)return canSeeRef(st,row.rec,user);
 if(c==='files'&&!/^(DOC|SIG)-/.test(String(row.rec)))return true; // a file on some other kind of record
 return row.user===user.name}

module.exports={canSeeDoc,canSeeReq,canSeeRef,filterState,opAllowed,opForUser,auditRowVisible,accessList};
