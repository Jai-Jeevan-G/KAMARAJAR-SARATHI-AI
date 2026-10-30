/* ===== Kamarajar Sarathi AI · views-scholarship.js : Scholarship AI Agent, AI Guardian chat, Exams & Opportunities, Documents ===== */
(() => {
'use strict';
const S = window.SAHAYA, K = S.K, H = S.H, A = S.A, V = S.V, st = S.st;
const { esc, chip, badge, optHTML } = H, $ = H.$;
const STAGES = [['saved', 'Saved'], ['preparing', 'Preparing'], ['ready', 'Ready to apply'], ['applied', 'Applied on the official portal (I did this)'], ['outcome', 'Outcome received']];
const DOC_ST = { have: ['green', '✅ Available'], get: ['pink', '📝 Pending'], update: ['yellow', '✏️ Needs updating'], verify: ['blue', '⏳ Awaiting verification'] };
const num = v => (v === '' || v == null || isNaN(+v) ? '' : +v);
const savedIds = () => Object.keys(st.D.saved);
const missingDocs = id => K.scheme(id).docs.filter(d => (st.D.docs[d] || {}).status !== 'have');

/* ---------- tabs ---------- */
function profileTab() {
  const P = st.D.profile;
  return `<div class="grid two"><article class="card reveal"><h3>Step 1 · Understand me</h3><p class="muted">I only ask for what matching needs, and I explain why. You can skip anything sensitive.</p><form data-form="schProfile">
  <label class="field">Education level<select name="level">${optHTML(Object.entries(K.LEVELS), P.level)}</select><small class="muted">Why: many schemes are only for certain classes or levels.</small></label>
  <label class="field">State of residence<select name="state"><option value="">Prefer not to say</option>${optHTML(K.STATES, P.state)}</select><small class="muted">Why: state schemes usually need residency in that state.</small></label>
  <label class="field">Marks or percentage (latest)<input type="number" name="marks" min="0" max="100" step="0.1" value="${P.marks === '' ? '' : esc(P.marks)}" placeholder="e.g. 86"><small class="muted">Why: merit schemes set minimum marks.</small></label>
  <label class="field">Family income bracket (only for need-based schemes)<select name="income"><option value="">Not entered</option>${optHTML(Object.entries(K.INCOME), P.income)}</select><small class="muted">Why: need-based schemes set an income limit. Choosing “prefer not to say” just keeps those results as “possibly eligible”.</small></label>
  <label class="field">Intended course<select name="course"><option value="">Not entered</option>${optHTML([['cs', 'Computer Science'], ['med', 'Medicine'], ['arts', 'Arts']], P.course)}</select><small class="muted">Why: some awards are for specific courses.</small></label><button class="btn primary">Save and check matches</button></form></article>
  <article class="card reveal"><h3>What the agent does</h3><ol><li>Understands you (this step)</li><li>Discovers sample scholarships</li><li>Checks eligibility with explicit rules</li><li>Builds a document checklist</li><li>Explains how to obtain documents officially</li><li>Helps you prepare a draft for your review</li><li>Tracks deadlines and your progress</li><li>Reassesses whenever something changes</li></ol><div class="safe-note">It never invents scholarships, deadlines or requirements, never issues certificates, and never submits anything for you.</div></article></div>`;
}
A.schProfile = form => {
  const f = H.formObj(form), P = st.D.profile, m = num(f.marks); if (m !== '' && (m < 0 || m > 100)) { H.toast('Marks must be between 0 and 100.'); return; }
  Object.assign(P, { level: f.level, state: f.state || '', marks: m, income: f.income || '', course: f.course || '' });
  const e = K.matchesFor(P); H.reassess(`Profile updated: ${e.filter(x => x.e.key === 'likely').length} likely and ${e.filter(x => x.e.key === 'possible').length} possible matches`);
  st.ui.schTab = 'matches'; H.toast('Saved. Matches updated ✔'); H.rerender();
};
function matchesTab() {
  const D = st.D, f = st.ui.schFilter, t = H.today(), all = K.matchesFor(D.profile), list = all;
  const icon = r => (r === true ? '✅' : r === false ? '❌' : '❔'), cls = r => (r === true ? 'ok' : r === false ? 'no' : 'unk');
  return `<div class="banner">Steps 2–3 · These are <b>sample demo entries</b>. Live search of official portals is not connected in this prototype. Real scholarships must be checked on the <a href="${K.PORTAL}" target="_blank" rel="noopener">National Scholarship Portal</a> and the provider’s page. Set “Selected” to Yes only after the provider’s official result says you were selected.</div>
  <div class="grid two">${list.length ? list.map(({ s, e }) => { const dl = K.schemeDeadline(s, D), d = K.daysBetween(t, dl), on = !!D.saved[s.id]; return `<article class="card scheme reveal"><div class="scheme-head"><div><span class="sample-tag">SAMPLE · DEMO DATA</span><h3>${esc(s.name)}</h3><div class="meta"><span>${esc(s.provider)}</span><span>·</span><span>${esc(s.type)}</span></div></div>${badge(on ? 'green' : 'grey', 'Selected: ' + (on ? 'Yes' : 'No'))}</div>
  ${e.rows.length ? `<ul class="crit">${e.rows.map(r => `<li class="${cls(r.r)}">${icon(r.r)} ${esc(r.label)}<br><small class="muted">${esc(r.have)}</small></li>`).join('')}</ul>` : ''}
  <div class="meta"><span>🔗 Source: <a href="${s.sourceUrl}" target="_blank" rel="noopener">${s.sourceUrl.replace('https://', '')}</a> · Last verified: <b>not verified</b></span></div><div class="meta"><span>📅 Sample deadline ${H.fmt(dl)} ${H.dayChip(d)} (verify officially)</span></div><div class="meta">📎 ${s.docs.map(id => chip(((D.docs[id] || {}).status === 'have') ? 'green' : 'pink', esc(K.docName(id)))).join('')}</div>
  <div class="row-actions"><b>Selected:</b> <button class="btn small ${on ? 'primary' : 'ghost-dark'}" data-act="schSelected" data-id="${s.id}" data-v="yes" aria-pressed="${on}">Yes</button><button class="btn small ${on ? 'ghost-dark' : 'primary'}" data-act="schSelected" data-id="${s.id}" data-v="no" aria-pressed="${!on}">No</button><a class="btn small ghost-dark" href="${K.PORTAL}" target="_blank" rel="noopener">Official portal ↗</a></div></article>`; }).join('') : `<article class="card">${H.empty('🔍', 'Nothing in this group right now.')}</article>`}</div>`;
}
A.schFilter = el => { st.ui.schFilter = el.dataset.tab; H.rerender(); };
A.schSelected = el => { const s = K.scheme(el.dataset.id), yes = el.dataset.v === 'yes'; if (yes) st.D.saved[s.id] = Object.assign(st.D.saved[s.id] || {}, { stage: 'outcome', selected: true, savedAt: (st.D.saved[s.id] || {}).savedAt || H.today() }); else delete st.D.saved[s.id]; H.reassess(`“${s.name}” selected: ${yes ? 'Yes' : 'No'}`); H.save(); H.rerender(); };

function checklistTab() {
  const D = st.D, ids = savedIds(), t = H.today();
  if (!ids.length) return `<article class="card">${H.empty('📋', 'Save a scholarship in Matches to build its checklist.')}<button class="btn small primary" data-act="schTab" data-tab="matches">See matches</button></article>`;
  return `<div class="grid two">${ids.map(id => { const s = K.scheme(id), e = K.evaluate(s, D.profile), have = s.docs.length - missingDocs(id).length, unk = e.rows.filter(r => r.r === null);
    return `<article class="card reveal"><h3>${esc(s.name)}</h3><div class="meta">📅 Sample deadline ${H.fmt(K.schemeDeadline(s, D))} ${H.dayChip(K.daysBetween(t, K.schemeDeadline(s, D)))} · <a href="${K.PORTAL}" target="_blank" rel="noopener">Official portal ↗</a></div><div class="progress"><div class="bar" style="width:${K.pct(have, s.docs.length)}%"></div></div><small class="muted">${have} of ${s.docs.length} documents available</small>
    ${s.docs.map(d => { const [c, l] = DOC_ST[(D.docs[d] || {}).status || 'get']; return `<div class="doc-row"><div><b>${esc(K.docName(d))}</b> ${badge(c, l)}</div><div>${(D.docs[d] || {}).status === 'have' ? `<button class="btn small ghost-dark" data-act="docSet" data-id="${d}" data-s="get">Mark pending</button>` : `<button class="btn small primary" data-act="docSet" data-id="${d}" data-s="have">Mark available</button>`}</div></div>`; }).join('')}
    <h4>Needs verification</h4>${unk.length || s.docs.some(d => (D.docs[d] || {}).status === 'verify') ? `<ul>${unk.map(r => `<li>${esc(r.label)}</li>`).join('')}${s.docs.filter(d => (D.docs[d] || {}).status === 'verify').map(d => `<li>${esc(K.docName(d))} (awaiting official verification)</li>`).join('')}</ul>` : '<p class="muted">Nothing flagged.</p>'}</article>`; }).join('')}</div>`;
}
A.docSet = el => { const d = st.D.docs[el.dataset.id]; d.status = el.dataset.s; H.reassess(`${K.docName(el.dataset.id)} marked ${el.dataset.s === 'have' ? 'available' : el.dataset.s === 'verify' ? 'awaiting verification' : 'pending'}`); H.rerender(); };
function guidanceTab() {
  const D = st.D, ids = savedIds().length ? [...new Set(savedIds().flatMap(id => K.scheme(id).docs))] : K.DOCS.map(d => d.id);
  return `<div class="banner">Step 5 · Kamarajar Sarathi can explain the usual route, but it <b>cannot issue, approve or authenticate</b> any certificate. Only the official issuing authority can. Always read the current rules on the official site.</div><div class="grid two">${ids.map(id => { const d = K.DOCS.find(x => x.id === id), [c, l] = DOC_ST[(D.docs[id] || {}).status || 'get']; return `<article class="card reveal"><h3>${esc(d.name)} ${badge(c, l)}</h3><p>${esc(d.how)}</p><div class="row-actions"><button class="btn small primary" data-act="docSet" data-id="${id}" data-s="have">I have it</button><button class="btn small ghost-dark" data-act="docSet" data-id="${id}" data-s="verify">I applied, waiting</button><button class="btn small ghost-dark" data-act="docSet" data-id="${id}" data-s="update">Needs updating</button></div></article>`; }).join('')}</div>`;
}
const draftOf = id => st.D.drafts[id] || { statement: '', achievements: '', answer: '' };
function applyTab() {
  const D = st.D, ids = savedIds(); if (!ids.length) return `<article class="card">${H.empty('✍️', 'Save a scholarship first, then I can help you prepare a draft.')}</article>`;
  if (!ids.includes(st.ui.schSel)) st.ui.schSel = ids[0]; const id = st.ui.schSel, s = K.scheme(id), d = draftOf(id);
  return `<article class="card reveal"><h3>Step 6 · Application assistant</h3><label class="field">Scholarship<select data-chg="schSel">${optHTML(ids.map(i => [i, K.scheme(i).name]), id)}</select></label><div class="banner">I can draft from the details <b>you entered</b>. Anything I don’t know is left as [a placeholder] for you to write. Nothing is submitted from here.</div>
  <form data-form="draftSave"><input type="hidden" name="id" value="${id}"><label class="field">Personal statement<textarea name="statement" maxlength="1500">${esc(d.statement)}</textarea></label><label class="field">Achievement summary<textarea name="achievements" maxlength="1200">${esc(d.achievements)}</textarea></label><label class="field">Answer to the provider’s question<textarea name="answer" maxlength="1500">${esc(d.answer)}</textarea></label>
  <div class="row-actions"><button class="btn small ghost-dark" type="button" data-act="draftGen" data-id="${id}">✨ Draft from my details</button><button class="btn small ghost-dark">Save draft</button><button class="btn small primary" type="button" data-act="draftReview" data-id="${id}">Review before use</button></div></form></article>`;
}
A.schSel = el => { st.ui.schSel = el.value; H.rerender(); };
A.draftGen = el => {
  const D = st.D, P = D.profile, s = K.scheme(el.dataset.id), o = K.overallStats(D.attempts), has = P.marks !== '' && P.marks != null, sess = D.sessions.filter(x => x.done && x.type !== 'Break').length, goals = D.goals.filter(g => g.done);
  const statement = `My name is ${P.name}. I am a student (${K.LEVELS[P.level] || 'level not set'})${P.school ? ' at ' + P.school : ''}${P.state ? ' from ' + P.state : ''}. ${P.careers ? 'I am interested in ' + P.careers + '.' : '[Add your career interests.]'} ${P.goals ? 'My current goal is: ' + P.goals + '.' : '[Add your academic goal.]'} ${has ? 'My latest recorded marks are ' + P.marks + '%.' : '[Add your marks.]'} I am applying for ${s.name} because [explain in your own words how this support would help you].`;
  const ach = [o.attempted ? `I have practised ${o.attempted} questions with ${o.accuracy}% accuracy in my own tracker.` : '', sess ? `I have completed ${sess} planned study sessions.` : '', ...goals.map(g => `I achieved my goal: ${g.t}.`)].filter(Boolean);
  D.drafts[s.id] = { statement, achievements: ach.length ? ach.join('\n') : '[Add achievements such as awards, projects or volunteering.]', answer: '[Answer the provider’s question in your own words. Do not copy generated text.]' };
  if (D.saved[s.id].stage === 'saved') D.saved[s.id].stage = 'preparing'; H.reassess(`Draft started for “${s.name}”`); H.toast('Draft created. Please edit it in your own words.'); H.rerender();
};
A.draftSave = form => { const f = H.formObj(form), D = st.D; D.drafts[f.id] = { statement: f.statement, achievements: f.achievements, answer: f.answer }; H.save(); H.toast('Draft saved ✔'); };
A.draftReview = el => {
  const D = st.D, id = el.dataset.id, f = $('#content form[data-form=draftSave]'); if (f) { const o = H.formObj(f); D.drafts[id] = { statement: o.statement, achievements: o.achievements, answer: o.answer }; H.save(); }
  const d = draftOf(id), s = K.scheme(id), ph = (d.statement + d.achievements + d.answer).match(/\[[^\]]+\]/g) || [], miss = missingDocs(id);
  H.openModal(`<h3 id="modalTitle">Review before you use this</h3><p class="muted">${esc(s.name)} · sample scholarship</p><div class="fb"><b>Personal statement</b><p>${esc(d.statement) || '<i>empty</i>'}</p><b>Achievements</b><p>${esc(d.achievements).replace(/\n/g, '<br>') || '<i>empty</i>'}</p><b>Answer</b><p>${esc(d.answer) || '<i>empty</i>'}</p></div>${ph.length ? `<div class="flag">⚠️ ${ph.length} placeholder${ph.length > 1 ? 's' : ''} still need your own words.</div>` : ''}${miss.length ? `<div class="flag">⚠️ Documents not marked available: ${miss.map(m => esc(K.docName(m))).join(', ')}</div>` : ''}
  <form data-form="draftApprove"><input type="hidden" name="id" value="${id}"><label class="toggle"><input type="checkbox" name="ok" required><span></span> I (or my guardian) checked that everything is true and in my own words.</label><p class="muted">Kamarajar Sarathi cannot submit applications from this prototype. Marking “ready” only updates your tracker. Use the official portal to apply.</p><div class="row-actions"><button class="btn primary">Mark ready to apply</button><a class="btn ghost-dark" href="${K.PORTAL}" target="_blank" rel="noopener">Official portal ↗</a></div></form>`);
};
A.draftApprove = form => { const f = H.formObj(form); if (!f.ok) return; const s = K.scheme(f.id); st.D.saved[f.id].stage = 'ready'; H.reassess(`“${s.name}” marked ready to apply`); H.closeModal(); H.celebrate('Marked ready. Apply on the official portal before the deadline! 🎓'); H.rerender(); };
const nextFor = id => { const v = st.D.saved[id]; if (missingDocs(id).length) return 'Get: ' + K.docName(missingDocs(id)[0]); return { saved: 'Prepare your draft', preparing: 'Finish and review your draft', ready: 'Apply on the official portal', applied: 'Check the official portal for updates', outcome: 'Done. Well done for applying!' }[v.stage]; };
function trackerTab() {
  const D = st.D, ids = savedIds(), t = H.today();
  const soon = ids.filter(id => { const d = K.daysBetween(t, K.schemeDeadline(K.scheme(id), D)); return d >= 0 && d <= 14 && !['applied', 'outcome'].includes(D.saved[id].stage); });
  if (!ids.length) return `<article class="card">${H.empty('📌', 'Saved scholarships appear here with deadlines, missing documents and next steps.')}</article>`;
  return `${soon.length ? `<div class="banner">⏰ Closing within 14 days (sample dates): ${soon.map(id => esc(K.scheme(id).name)).join('; ')}</div>` : ''}<article class="card reveal"><h3>Step 7 · Deadline & status tracker</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Scholarship</th><th>Eligibility</th><th>Missing docs</th><th>My progress</th><th>Deadline</th><th>Next step</th><th></th></tr></thead><tbody>${ids.map(id => { const s = K.scheme(id), e = K.evaluate(s, D.profile), v = D.saved[id], dl = K.schemeDeadline(s, D); return `<tr><td><b>${esc(s.name)}</b></td><td>${badge(e.cls, esc(e.label))}</td><td>${missingDocs(id).length}</td><td><select data-chg="schStage" data-id="${id}" aria-label="Progress">${optHTML(STAGES, v.stage)}</select></td><td>${H.fmt(dl)} ${H.dayChip(K.daysBetween(t, dl))}</td><td>${esc(nextFor(id))}</td><td><button class="icon-mini" data-act="schUnsave" data-id="${id}" aria-label="Remove">🗑</button></td></tr>`; }).join('')}</tbody></table></div><small class="muted">“Progress” is what <b>you</b> report. Kamarajar Sarathi cannot see the provider’s system and never invents an application status. Deadlines are sample dates.</small></article>`;
}
A.schStage = el => { const s = K.scheme(el.dataset.id); st.D.saved[el.dataset.id].stage = el.value; H.reassess(`“${s.name}” progress set to ${el.value}`); if (el.value === 'applied') H.celebrate('Great job applying! 🎉'); H.rerender(); };
A.schTab = el => { st.ui.schTab = el.dataset.tab; H.rerender(); };
V.scholarship = {
  html() {
    const D = st.D, t = H.today(), tab = st.ui.schTab, n = K.agentNextAction(D, t);
    return `<h2 class="view-title">🎓 Scholarship AI Agent <small>Understand → discover → check → prepare → track → adapt</small></h2>
    <div class="nextbox"><div><b>Step 8 · Next best action</b><br>${esc(n.text)}</div><button class="btn small primary" data-act="schGo" data-tab="${n.tab}">Do it</button></div>
    ${H.tabs([['profile', '1 · Profile'], ['matches', '2–3 · Matches'], ['checklist', '4 · Checklist'], ['guidance', '5 · Documents'], ['apply', '6 · Application'], ['tracker', '7 · Tracker']], tab, 'schTab')}${{ profile: profileTab, matches: matchesTab, checklist: checklistTab, guidance: guidanceTab, apply: applyTab, tracker: trackerTab }[tab]()}
    <article class="card reveal"><h3>🤖 Agent activity</h3>${D.agentLog.length ? D.agentLog.slice(0, 6).map(l => `<div class="prow"><span>${esc(l.text)}</span><small class="muted">${new Date(l.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</small></div>`).join('') : '<p class="muted">The agent reassesses your plan here whenever your profile, documents or progress change.</p>'}</article>`;
  }
};
A.schGo = el => { st.ui.schTab = el.dataset.tab || 'matches'; H.rerender(); };

/* ---------- AI Guardian chat (rule-based demo) ---------- */
const bot = h => ({ u: false, t: h });
function structured(o) { return `<p><b>What I noticed:</b> ${o.n}</p><p><b>Based on:</b> ${o.b} <span class="chip ${o.c}">${o.tag}</span></p><p><b>Why it may matter:</b> ${o.w}</p><p><b>What you can do next:</b> ${o.x}</p>${o.h ? `<p><b>Who could help:</b> ${o.h}</p>` : ''}`; }
function guardianReply(text) {
  const D = st.D, t = text.toLowerCase(), P = D.profile, today = H.today();
  if (D.share.pause) return '<p>Personalization is paused, so I’ll keep answers general. You can turn it back on in Settings.</p>';
  if (K.healthSafetyCheck(text) === 'selfharm') return '<p>I’m really glad you told me. 💙 Please reach out to someone you trust right now. In India you can call <b>Tele-MANAS at 14416</b>. If you might act on these thoughts, call your local emergency number (112).</p>';
  if (/stress|anxious|overwhelm|worried|sad|tired|burn/.test(t)) return structured({ n: 'You mention feeling stressed or worn out.', b: 'Your own message.', c: 'blue', tag: 'Self-reported', w: 'Rest and breaks help learning. I can’t tell what is causing it, and I won’t guess.', x: 'Try a 5-minute walk, a glass of water, then one small task. The Health page has a break timer.', h: 'If it lasts for days, talk to a trusted adult, teacher, counsellor or a health professional.' }) + '<button class="mini" data-act="go" data-view="health">Open Health</button>';
  if (/math|physics|chem|weak|practice|question|topic|study/.test(t)) { const w = K.weakTopics(D.attempts); return w.length ? structured({ n: `${w[0].topic} looks like a topic to practise (${w[0].correct} of ${w[0].n} correct).`, b: `${w[0].n} answered questions in your tracker.`, c: 'yellow', tag: 'Early signal, not a verdict', w: 'A few more practice rounds will show whether this is a real gap.', x: 'Do the 3-day practice plan from Learning Hub → Weak topics.', h: 'Your teacher can look at the topic with you.' }) + '<button class="mini" data-act="go" data-view="questions">Practise now</button>' : '<p>I don’t see a clearly weak topic yet. I need at least 5 answered questions per topic before I call anything weak. Try the Question Tracker! 🧠</p><button class="mini" data-act="go" data-view="questions">Practise</button>'; }
  if (/scholar|fee|money|aid|fund/.test(t)) { const m = K.matchesFor(P), l = m.filter(x => x.e.key === 'likely'), p = m.filter(x => x.e.key === 'possible'); return `<p>Using the <b>sample</b> scholarships in this demo: ✅ Likely eligible (${l.length}): ${l.map(x => esc(x.s.name)).join('; ') || 'none'}. 🟡 Possibly eligible (${p.length}): ${p.map(x => esc(x.s.name)).join('; ') || 'none'}.</p><p class="muted">Match scores are not selection chances. Always verify on the official portal.</p><button class="mini" data-act="go" data-view="scholarship">Open the agent</button>`; }
  if (/exam|test|jee|cuet|neet|date/.test(t)) { const ex = D.exams.map(e => ({ ...e, d: K.daysBetween(today, e.date) })).filter(e => e.d >= 0).sort((a, b) => a.d - b.d); return ex.length ? `<p>Next exam you entered: <b>${esc(ex[0].name)}</b> in ${ex[0].d} days (${H.fmt(ex[0].date)}). Let’s build a revision plan.</p><button class="mini" data-act="go" data-view="hub">Open countdown</button>` : '<p>You haven’t added any exam dates. Add them in the Learning Hub and I’ll build a countdown. For official dates, check the exam body’s website.</p>'; }
  if (/doc|certificate|income|marksheet/.test(t)) { const need = K.DOCS.filter(d => (D.docs[d.id] || {}).status !== 'have'); return `<p>${need.length ? `Not yet marked available: ${need.map(d => esc(d.name)).join(', ')}.` : 'All documents are marked available. 🎉'}</p><p class="muted">I can’t issue or verify certificates. Only the official authority can.</p><button class="mini" data-act="go" data-view="scholarship">Document guidance</button>`; }
  const calc = calcAnswer(text); if (calc) return calc;
  return `<p>I can’t answer that one on my own right now, because <b>no live AI is connected</b>. I can still help with your <b>practice topics, exam dates, scholarships (sample data), documents</b> and <b>quick calculations</b> (try “12 * 7 + 5”). To answer any question, this app must be connected to a live AI through a server. The README explains how.</p>`;
}
/* Small safe calculator (no eval): + - * / ^ % and brackets */
function calcAnswer(text) {
  const src = String(text).toLowerCase().replace(/what('| i)?s|what is|calculate|compute|solve|equals?|=|\?/g, ' ').replace(/[x×]/g, '*').replace(/÷/g, '/').trim();
  if (!/^[0-9+\-*\/().^%\s]+$/.test(src) || !/\d/.test(src) || !/[+\-*\/^%]/.test(src)) return '';
  let i = 0; const ws = () => { while (src[i] === ' ') i++; };
  const num = () => { ws(); if (src[i] === '(') { i++; const v = add(); ws(); if (src[i] !== ')') throw 0; i++; return v; } if (src[i] === '-') { i++; return -pow(); } const m = /^\d+(\.\d+)?/.exec(src.slice(i)); if (!m) throw 0; i += m[0].length; return +m[0]; };
  const pow = () => { let b = num(); ws(); if (src[i] === '^') { i++; return Math.pow(b, pow()); } return b; };
  const mul = () => { let v = pow(); for (;;) { ws(); const c = src[i]; if (c === '*') { i++; v *= pow(); } else if (c === '/') { i++; const d = pow(); if (d === 0) throw 0; v /= d; } else if (c === '%') { i++; v %= pow(); } else return v; } };
  const add = () => { let v = mul(); for (;;) { ws(); const c = src[i]; if (c === '+') { i++; v += mul(); } else if (c === '-') { i++; v -= mul(); } else return v; } };
  try { const v = add(); ws(); if (i < src.length || !isFinite(v)) return ''; return `<p><b>${esc(src.replace(/\s+/g, ' '))} = ${Math.round(v * 1e9) / 1e9}</b></p><p class="muted">Calculated by the built-in calculator, not by an AI.</p>`; } catch (e) { return ''; }
}
V.guardian = {
  html() {
    const ui = st.ui; if (!ui.chat.length) ui.chat.push(bot('<p>Hi! I’m your Guardian, a mentor and not a monitor. 💙 I use only what you chose to share, I explain my reasoning, and I never diagnose or decide scholarships. This chat is not shared with anyone and isn’t stored.</p>'));
    return `<h2 class="view-title">🤖 AI Guardian <small>Your supportive mentor, never surveillance</small></h2><div class="banner">${aiEndpoint() ? '<b>Live AI is configured.</b> Answers come from your server. Only your question, class and subjects are sent. If the server is unreachable, a rule-based helper replies.' : '<b>Rule-based fallback, not a live AI model.</b> No AI provider is connected, so replies come from fixed rules and your own data and cannot answer every question. A live model must run behind a secure server endpoint (see README); keys never belong in the browser.'}</div><div class="chat-wrap card"><div class="chat" id="chat" aria-live="polite">${ui.chat.map(m => `<div class="msg ${m.u ? 'user' : 'bot'}">${m.u ? esc(m.t) : m.t}</div>`).join('')}</div><div class="chips">${['Help me with practice', 'Which scholarships fit me?', 'I’m feeling stressed', 'When is my next exam?', 'What documents am I missing?'].map(x => `<button class="chip-btn" data-act="gQuick" data-t="${esc(x)}">${x}</button>`).join('')}</div><form class="chat-form" data-form="gChat"><input name="m" placeholder="Ask me anything about studies, scholarships, exams…" maxlength="300" autocomplete="off" aria-label="Message"><button class="btn primary">Send ➤</button></form><small class="muted">Demo uses rule-based replies built from your own records. A live build would add an LLM through a secure backend, with these rules still deciding facts.</small></div>`;
  },
  after() { const c = $('#chat'); if (c) c.scrollTop = c.scrollHeight; }
};
const aiEndpoint = () => String((window.KS_CONFIG || {}).aiEndpoint || '').trim();
const liveBot = text => ({ u: false, t: `<p>${esc(text).replace(/\n/g, '<br>')}</p><small class="muted">✨ Live AI answer from your configured server</small>` });
async function gsay(text) {
  const ui = st.ui, D = st.D, ep = aiEndpoint(); ui.chat.push({ u: true, t: text });
  if (!ep || D.share.pause) { ui.chat.push(bot(guardianReply(text))); H.rerender(); return; }
  const slot = bot('<p><i>Thinking…</i></p>'); ui.chat.push(slot); H.rerender();
  const history = ui.chat.filter(m => m !== slot).slice(-10).map(m => ({ role: m.u ? 'user' : 'assistant', content: m.u ? m.t : String(m.t).replace(/<[^>]+>/g, ' ').slice(0, 600) }));
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal, body: JSON.stringify({ question: text, history, context: { class: K.LEVELS[D.profile.level] || '', subjects: D.hub.subjects } }) });
    if (!r.ok) throw new Error('bad status'); const j = await r.json(); if (!j || typeof j.reply !== 'string' || !j.reply.trim()) throw new Error('empty'); Object.assign(slot, liveBot(j.reply.slice(0, 4000)));
  } catch (e) { Object.assign(slot, bot('<p class="muted">The live AI server could not be reached, so here is the offline helper instead.</p>' + guardianReply(text))); }
  clearTimeout(timer); if (st.cur === 'guardian') H.rerender();
}
A.gChat = form => { const t = String(H.formObj(form).m || '').trim(); if (t) gsay(t); };
A.gQuick = el => gsay(el.dataset.t);

/* ---------- Exams & Opportunities ---------- */
V.exams = {
  html() {
    const D = st.D, c = D.profile.course, t = H.today(), sv = D.savedExams || {};
    const mine = Object.keys(sv).map(id => ({ x: K.EXAMS.find(e => e.id === id), v: sv[id] })).filter(o => o.x);
    return `<h2 class="view-title">🚀 Examinations <small>Scholarship exams, Olympiads, entrance exams and competitions</small></h2><div class="banner">Dates and eligibility change every year and <b>none are loaded here</b>. Read the official notification, then enter the date yourself. Anything you enter is shown as “entered by you”, never as verified.</div>
    ${mine.length ? `<article class="card reveal"><h3>⭐ My saved opportunities</h3>${mine.map(({ x, v }) => `<div class="doc-row"><div><b>${esc(x.name)}</b><small>${v.deadline ? `Deadline entered by you: ${H.fmt(v.deadline)} ${H.dayChip(K.daysBetween(t, v.deadline))}${v.source ? ' · Source: ' + esc(v.source) : ''} · <b>not verified</b>` : 'No deadline entered yet.'}</small></div><button class="btn small ghost-dark" data-act="examUnsave" data-id="${x.id}">Remove</button></div>`).join('')}</article>` : ''}
    <div class="grid three">${K.EXAMS.map(x => { const [fit, cl] = K.examFit(x.id, c), on = !!sv[x.id]; return `<article class="card exam-card reveal">${badge(cl, fit)}<h3>${esc(x.name)}</h3><div class="muted">${esc(x.body)}</div><p style="margin-top:8px"><b>Why:</b> ${esc(x.why)}</p><ul>${x.reqs.map(r => `<li>${esc(r)}</li>`).join('')}</ul><p class="muted">📅 Dates: not loaded. Source: ${x.link ? `<a href="${x.link}" target="_blank" rel="noopener">${x.link.replace('https://', '')}</a>` : 'your state’s official admission portal'} · Last verified: <b>not verified</b></p>
    ${on ? `<form class="inline-form" data-form="examDeadline"><input type="hidden" name="id" value="${x.id}"><input type="date" name="deadline" value="${esc(sv[x.id].deadline || '')}" aria-label="Deadline from the official notice"><input name="source" placeholder="Where you read it" maxlength="80" value="${esc(sv[x.id].source || '')}" aria-label="Source of the date"><button class="btn small primary">Save date</button></form>` : ''}
    <div class="row-actions"><button class="btn small ${on ? 'ghost-dark' : 'primary'}" data-act="${on ? 'examUnsave' : 'examSave'}" data-id="${x.id}">${on ? '✔ Saved · remove' : '＋ Save'}</button>${x.link ? `<a class="btn small ghost-dark" href="${x.link}" target="_blank" rel="noopener">Official site ↗</a>` : ''}</div></article>`; }).join('')}</div>`;
  }
};
A.examSave = el => { st.D.savedExams[el.dataset.id] = { savedAt: H.today(), deadline: '', source: '' }; H.save(); H.rerender(); };
A.examUnsave = el => { delete st.D.savedExams[el.dataset.id]; H.save(); H.rerender(); };
A.examDeadline = form => { const f = H.formObj(form), e = st.D.savedExams[f.id]; if (!e) return; e.deadline = /^\d{4}-\d{2}-\d{2}$/.test(f.deadline) ? f.deadline : ''; e.source = String(f.source || '').slice(0, 80); H.save(); H.toast('Saved as entered by you (not verified)'); H.rerender(); };

/* ---------- Certificates & Documents ---------- */
V.documents = {
  html() {
    const D = st.D;
    return `<h2 class="view-title">📄 Certificates & Documents <small>Know what you have, what is pending and what to get</small></h2><div class="grid two"><article class="card reveal"><h3>My documents</h3>${K.DOCS.map(d => { const s = (D.docs[d.id] || {}).status || 'get'; return `<div class="doc-row"><div><b>${esc(d.name)}</b> ${badge(DOC_ST[s][0], DOC_ST[s][1])}</div><div><select data-chg="docSelect" data-id="${d.id}" aria-label="Status of ${esc(d.name)}">${optHTML([['have', 'Available'], ['get', 'Pending / to obtain'], ['update', 'Needs updating'], ['verify', 'Awaiting verification']], s)}</select></div></div>`; }).join('')}<small class="muted">The AI never issues, authenticates or approves a certificate.</small></article>
    ${vault()}
</div>`;
  }
};
const FILE_OK = ['application/pdf', 'image/png', 'image/jpeg'], FILE_MAX = 600 * 1024, TOTAL_MAX = 3 * 1024 * 1024;
const kb = n => (n < 1024 * 1024 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(1) + ' MB');
function vault() {
  const D = st.D, q = (st.ui.fileQ || '').toLowerCase(), f = st.ui.fileF || 'all', all = D.files || [], used = all.reduce((a, x) => a + x.size, 0);
  const list = all.filter(x => (f === 'all' || x.docId === f) && x.name.toLowerCase().includes(q));
  return `<article class="card reveal" style="grid-column:1/-1"><h3>🗄️ My files</h3><div class="banner">Prototype storage: files stay <b>only in this browser</b> (about ${kb(used)} of ${kb(TOTAL_MAX)} used). PDF, PNG or JPG up to ${kb(FILE_MAX)}. A real deployment stores them in private, access-controlled cloud storage.</div>
  <form class="inline-form" data-form="fileUpload"><select name="docId" aria-label="Document type">${optHTML(K.DOCS.map(d => [d.id, d.name]), K.DOCS[0].id)}</select><input type="file" name="file" accept=".pdf,.png,.jpg,.jpeg" required aria-label="Choose file"><button class="btn small primary">Upload from folder</button></form>
  <div class="inline-form"><input type="search" placeholder="Search files" value="${esc(st.ui.fileQ || '')}" data-inp="fileSearch" aria-label="Search files"><select data-chg="fileFilter" aria-label="Filter by type">${optHTML([['all', 'All types'], ...K.DOCS.map(d => [d.id, d.name])], f)}</select></div>
  <div id="fileList">${list.length ? list.map(x => `<div class="doc-row" data-name="${esc(x.name.toLowerCase())}"><div><b>${esc(x.name)}</b><small class="muted">${esc(K.docName(x.docId))} · ${kb(x.size)} · ${new Date(x.ts).toLocaleDateString()}</small></div><div><button class="btn small ghost-dark" data-act="filePreview" data-id="${x.id}">Preview</button> <button class="btn small ghost-dark" data-act="fileDownload" data-id="${x.id}">Download</button> <button class="btn small ghost-dark" data-act="fileDelete" data-id="${x.id}">Delete</button></div></div>`).join('') : H.empty('🗄️', all.length ? 'No files match.' : 'No files yet. Upload a certificate to keep it ready.')}</div></article>`;
}
A.fileSearch = el => { st.ui.fileQ = el.value; const q = el.value.toLowerCase(); document.querySelectorAll('#fileList .doc-row').forEach(r => { r.hidden = !r.dataset.name.includes(q); }); };
A.fileFilter = el => { st.ui.fileF = el.value; H.rerender(); };
A.fileUpload = form => {
  const f = form.querySelector('[name=file]').files[0], docId = form.querySelector('[name=docId]').value, D = st.D; if (!f) return;
  if (!FILE_OK.includes(f.type)) return H.toast('Only PDF, PNG or JPG files are allowed.');
  if (f.size > FILE_MAX) return H.toast('That file is too big. The limit is ' + kb(FILE_MAX) + '.');
  if ((D.files || []).reduce((a, x) => a + x.size, 0) + f.size > TOTAL_MAX) return H.toast('Storage is full. Delete a file first.');
  const rd = new FileReader();
  rd.onload = () => { D.files.push({ id: K.uid('f'), docId, name: String(f.name).replace(/[<>"']/g, '').slice(0, 80), type: f.type, size: f.size, ts: Date.now(), data: rd.result });
    if ((D.docs[docId] || {}).status === 'get') D.docs[docId].status = 'verify';
    H.save(); H.reassess(`${K.docName(docId)} file added`); H.toast('Uploaded. Marked “awaiting verification” ✔'); H.rerender(); };
  rd.onerror = () => H.toast('Could not read that file.'); rd.readAsDataURL(f);
};
A.filePreview = el => { const x = st.D.files.find(y => y.id === el.dataset.id); if (!x) return; H.openModal(`<h3 id="modalTitle">${esc(x.name)}</h3>${x.type === 'application/pdf' ? `<iframe title="Preview of ${esc(x.name)}" src="${x.data}" style="width:100%;height:60vh;border:0"></iframe>` : `<img alt="Preview of ${esc(x.name)}" src="${x.data}" style="max-width:100%;max-height:60vh">`}`); };
A.fileDownload = el => { const x = st.D.files.find(y => y.id === el.dataset.id); if (!x) return; const a = document.createElement('a'); a.href = x.data; a.download = x.name; document.body.appendChild(a); a.click(); a.remove(); };
A.fileDelete = el => { const x = st.D.files.find(y => y.id === el.dataset.id); if (!x) return; H.openModal(`<h3 id="modalTitle">Delete this file?</h3><p>“${esc(x.name)}” will be removed from this browser. This cannot be undone.</p><div class="row-actions"><button class="btn primary" data-act="fileDeleteYes" data-id="${x.id}">Yes, delete</button> <button class="btn ghost-dark" data-act="closeModal">Cancel</button></div>`); };
A.fileDeleteYes = el => { st.D.files = st.D.files.filter(y => y.id !== el.dataset.id); H.save(); H.closeModal(); H.toast('File deleted'); H.rerender(); };
A.docSelect = el => { st.D.docs[el.dataset.id].status = el.value; H.reassess(`${K.docName(el.dataset.id)} status updated`); H.rerender(); };
})();
