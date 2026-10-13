// Shared by the browser and the server: turn a change in the app state into record-level operations
// and apply them again elsewhere. Collections are arrays whose items all have an `id`; everything
// else is a value that is replaced as a whole (numbers under `seq` keep the larger value).
(function(root){
const isObj=v=>v&&typeof v==='object'&&!Array.isArray(v);
const keyed=a=>Array.isArray(a)&&a.length>0&&a.every(x=>isObj(x)&&typeof x.id==='string');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const SKIP=new Set(['log']); // the activity log is written by the server audit trail instead

function diff(base,cur,path,ops,depth){
 path=path||[];ops=ops||[];depth=depth||0;
 const keys=new Set([...Object.keys(base||{}),...Object.keys(cur||{})]);
 for(const k of keys){
  if(depth===0&&SKIP.has(k))continue;
  const b=base?base[k]:undefined,c=cur?cur[k]:undefined,p=[...path,k];
  if(same(b,c))continue;
  if(c===undefined){ops.push({op:'unset',p});continue}
  const bothKeyedish=(keyed(c)||(Array.isArray(c)&&!c.length&&keyed(b)))&&(b===undefined||Array.isArray(b));
  if(bothKeyedish){
   const bm=new Map((b||[]).map(x=>[x.id,x]));const seen=new Set();
   c.forEach((x,i)=>{seen.add(x.id);const o=bm.get(x.id);if(!o||!same(o,x)){const op={op:'put',p,id:x.id,rec:x,at:i,isNew:!o};if(o)op.ch=Object.keys({...o,...x}).filter(f=>!same(o[f],x[f]));ops.push(op)}});
   (b||[]).forEach(x=>{if(!seen.has(x.id))ops.push({op:'del',p,id:x.id})});
  }else if(isObj(c)&&isObj(b)&&depth<3){diff(b,c,p,ops,depth+1)}
  else ops.push({op:'set',p,v:c});
 }
 return ops;
}

function walk(state,path,make){let o=state;for(const k of path){if(!isObj(o[k])){if(!make)return undefined;o[k]={}}o=o[k]}return o}

// Applies one operation in place. Returns a short description of what changed, or null if nothing did.
function apply(state,op){
 const p=op.p,last=p[p.length-1],parent=walk(state,p.slice(0,-1),op.op!=='unset'&&op.op!=='del');
 if(parent===undefined)return null;
 if(op.op==='set'){if(p[0]==='seq'&&typeof parent[last]==='number'&&typeof op.v==='number')op=Object.assign({},op,{v:Math.max(parent[last],op.v)});if(same(parent[last],op.v))return null;parent[last]=op.v;return{kind:'set'}}
 if(op.op==='unset'){if(parent[last]===undefined)return null;delete parent[last];return{kind:'unset'}}
 let arr=parent[last];if(!Array.isArray(arr)){if(op.op==='del')return null;arr=parent[last]=[]}
 const i=arr.findIndex(x=>x.id===op.id);
 if(op.op==='put'){
  if(i>=0){if(same(arr[i],op.rec))return null;const before=arr[i];arr[i]=op.rec;return{kind:'update',before}}
  arr.splice(Math.min(op.at==null?0:op.at,arr.length),0,op.rec);return{kind:'create'}}
 if(op.op==='del'){if(i<0)return null;const before=arr.splice(i,1)[0];return{kind:'delete',before}}
 return null;
}

// Fields that differ between two records, for the audit trail.
function fieldChanges(a,b){const out=[];const ks=new Set([...Object.keys(a||{}),...Object.keys(b||{})]);
 for(const k of ks){if(same(a&&a[k],b&&b[k]))continue;const f=v=>{const s=typeof v==='string'?v:JSON.stringify(v);return s===undefined?'—':s.length>60?s.slice(0,58)+'…':s};out.push({field:k,from:f(a&&a[k]),to:f(b&&b[k])})}
 return out}

const api={diff,apply,fieldChanges,keyed,same};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GRC_SYNC=api;
})(typeof window!=='undefined'?window:globalThis);
