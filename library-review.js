// Content-review panel for library frameworks: jurisdictions, review status, flagged details and missing items.
// The review data (regulatory-review.js) comes from automated reviewers that could only reach search summaries and
// secondary sources, so every flag is a lead to confirm against the official text, not a verified fact.
(function(){
const G=window.GRC,R=window.GRC_REVIEW;if(!G)return;const E=G.E,pill=G.pill;
const COLOR={INCORRECT:'amber',MINOR_ISSUES:'blue',UNVERIFIABLE:'grey',VERIFIED:'green'};
G.drawerHooks.push(d=>{
 if(d.type!=='fw')return;const body=document.getElementById('opDB');if(!body)return;
 const f=(window.GRC_LIB.frameworks||[]).find(x=>x.id===d.id);if(!f)return;
 const r=R&&R.items&&R.items[d.id],names=(G.jur&&G.jur.names)||{};
 let box=document.getElementById('revBox');if(!box){box=document.createElement('div');box.id='revBox';body.appendChild(box)}
 const jur=(f.jur||[]).map(j=>E(names[j]||j)).join(', ');
 const flags=r?r.flags.map(x=>`<li><b>${E(x.sev)}</b> · ${E(x.ref)}: ${E(x.note)}${x.url?` <a href="${E(x.url)}" target="_blank" rel="noopener noreferrer">source</a>`:''}</li>`).join(''):'';
 const miss=r&&r.missing.length?`<p class="op-note" style="margin:8px 0 2px"><b>Possibly missing from this entry</b></p><ul style="font-size:11px;line-height:1.6;margin:0 0 0 16px">${r.missing.map(m=>`<li>${E(m.ref)}: ${E(m.title)}</li>`).join('')}</ul>`:'';
 box.innerHTML=`<h4>Jurisdiction and content review</h4><p class="op-note" style="margin-top:0">Applies to: <b>${jur||'Global'}</b></p>`+(r?`<p style="margin:4px 0">${pill(r.label,COLOR[r.status]||'grey')} <span class="op-note">Reviewed ${E(R.checked)}</span></p><p class="op-note">${E(R.basis)}. Treat the points below as items to confirm with the official text.</p>${r.official&&r.official.title?`<p class="op-note"><b>Current official instrument found:</b> ${E(r.official.title)}${r.official.number?` (${E(r.official.number)})`:''}${r.official.inForce?`, ${E(r.official.inForce)}`:''}</p>`:''}${flags?`<ul style="font-size:11px;line-height:1.6;margin:4px 0 0 16px">${flags}</ul>`:'<p class="op-note">No medium or high issues flagged.</p>'}${miss}`:`<p class="op-note">Not yet independently reviewed. Written from search summaries and secondary sources; confirm wording, dates and applicability with the official text and your legal team.</p>`);
});
})();
