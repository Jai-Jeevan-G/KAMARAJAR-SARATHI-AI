/* ===== Kamarajar Sarathi AI · views-student.js : dashboard, daily plans, About Me, settings, passport ===== */
(() => {
'use strict';
const S = window.SAHAYA, K = S.K, H = S.H, A = S.A, V = S.V, st = S.st;
const { esc, chip, badge, optHTML } = H;
const AREA = { Learning: 'pink', Exams: 'blue', Scholarship: 'yellow', Plan: 'violet', Wellness: 'green', Profile: 'orange' };
const AREA_ICON = { Learning: '📚', Wellness: '💚', Readiness: '📄', Personal: '🌟' };
const LEARN_PREFS = ['Short sessions', 'Practice questions', 'Visual explanations', 'Study with friends', 'Morning study', 'Evening study'];
const WELL_PREFS = ['Drink more water', 'Sleep on time', 'Move more', 'Take regular breaks', 'Eat balanced meals'];
const tf = (id, label, v, extra = '') => `<label class="field" for="${id}">${label}<input id="${id}" name="${id}" type="text" value="${esc(v || '')}" ${extra}></label>`;
const checks = (name, list, cur) => `<div class="chips">${list.map(x => `<label class="chip-btn ${cur.includes(x) ? 'on' : ''}"><input type="checkbox" name="${name}" value="${esc(x)}" ${cur.includes(x) ? 'checked' : ''} hidden> ${esc(x)}</label>`).join('')}</div>`;
document.addEventListener('change', e => { if (e.target.matches('.chips input[type=checkbox]')) e.target.closest('.chip-btn').classList.toggle('on', e.target.checked); });

/* ----- recommendations ----- */
const yn = id => { const a = (st.D.focusAns || {})[id]; return ['yes', 'no'].map(v => `<button class="btn small ${a === v ? 'primary' : 'ghost-dark'}" data-act="focusAns" data-id="${esc(id)}" data-v="${v}" aria-pressed="${a === v}">${v === 'yes' ? 'Yes' : 'No'}</button>`).join(' '); };
A.focusAns = el => { const D = st.D; D.focusAns = D.focusAns || {}; D.focusAns[el.dataset.id] = el.dataset.v; H.save(); H.rerender(); };
function recCard(r) {
  return `<article class="rec reveal"><div class="rec-top">${chip(AREA[r.area] || 'blue', r.area)}<b>${esc(r.title)}</b></div>
  <div class="fact"><span class="tag t-fact">✔ Verified · ${esc(r.factSource)}</span>${esc(r.fact)}</div>
  <div class="aisug"><span class="tag t-ai">✨ AI suggestion</span><p><b>Why it matters:</b> ${esc(r.why)}</p><p><b>Next few days:</b></p><ol>${r.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol><p><b>How to track it:</b> ${esc(r.track)}</p></div>
  <div class="row-actions"><b>Focus on this?</b> ${yn(r.id)}<button class="btn small ghost-dark" data-act="recEdit" data-id="${esc(r.id)}">Edit</button><button class="btn small ghost-dark" data-act="recPostpone" data-id="${esc(r.id)}">Later</button><button class="btn small ghost-dark" data-act="recDismiss" data-id="${esc(r.id)}">Dismiss</button><button class="mini" data-act="go" data-view="${r.go}">Open</button></div></article>`;
}
const mkTask = (r, o = {}) => ({ id: K.uid('t'), key: r.id, title: r.task.title, desc: r.task.desc, due: r.task.due, priority: r.task.priority, done: false, source: 'ai', area: r.area, edited: false, accepted: true, ...o });
const setRec = (id, v) => { st.D.recState[id] = v; H.refreshAI(); H.save(); H.rerender(); };
A.recAccept = el => { const D = st.D, r = K.buildRecs(D, H.today()).find(x => x.id === el.dataset.id); if (!r) return; D.tasks = D.tasks.filter(x => !(x.key === r.id && x.source === 'ai' && !x.accepted && !x.edited && !x.done)); D.tasks.push(mkTask(r)); D.recState[r.id] = { status: 'accepted' }; H.save(); H.toast('Added to Your Next Steps ✔'); H.rerender(); };
A.recPostpone = el => { setRec(el.dataset.id, { status: 'postponed', until: K.addDays(H.today(), 2) }); H.toast('Okay, I will bring this back in 2 days.'); };
A.recDismiss = el => setRec(el.dataset.id, { status: 'dismissed' });
A.recRestore = () => { Object.keys(st.D.recState).forEach(k => { if (st.D.recState[k].status === 'dismissed') delete st.D.recState[k]; }); H.refreshAI(); H.save(); H.rerender(); };
A.recEdit = el => { const r = K.buildRecs(st.D, H.today()).find(x => x.id === el.dataset.id); if (!r) return; H.openModal(`<h3 id="modalTitle">Edit before adding</h3><form data-form="recEditSave"><input type="hidden" name="rid" value="${esc(r.id)}">${tf('title', 'Task', r.task.title, 'required maxlength="90"')}${tf('desc', 'Details', r.task.desc, 'maxlength="200"')}<label class="field">Due date<input type="date" name="due" value="${r.task.due}"></label><label class="field">Priority<select name="priority">${optHTML([['high', 'High'], ['medium', 'Medium'], ['low', 'Low']], r.task.priority)}</select></label><button class="btn primary">Add to Next Steps</button></form>`); };
A.recEditSave = form => { const f = H.formObj(form), D = st.D, r = K.buildRecs(D, H.today()).find(x => x.id === f.rid); if (!r || !String(f.title).trim()) return; D.tasks = D.tasks.filter(x => !(x.key === r.id && x.source === 'ai' && !x.accepted && !x.edited && !x.done)); D.tasks.push(mkTask(r, { title: String(f.title).trim(), desc: f.desc, due: f.due || r.task.due, priority: f.priority, edited: true })); D.recState[r.id] = { status: 'accepted' }; H.save(); H.closeModal(); H.toast('Added with your changes ✔'); H.rerender(); };

/* ----- daily challenges ----- */
function challengesCard() {
  const items = st.D.challenges.items;
  return `<article class="card reveal"><h3>⚡ Today’s challenges <small class="muted">· small and optional</small></h3><div class="chal-grid">${items.map(c => `<div class="chal ${c.status !== 'open' ? c.status : ''}"><b>${AREA_ICON[c.area]} ${c.area}</b><span>${esc(c.text)}${c.carried ? ' <small class="muted">(from yesterday)</small>' : ''}</span>
  ${c.status === 'open' ? `<div class="row-actions"><button class="btn small primary" data-act="chal" data-id="${esc(c.id)}" data-s="done">Done ✔</button><button class="btn small ghost-dark" data-act="chal" data-id="${esc(c.id)}" data-s="skipped">Skip</button><button class="btn small ghost-dark" data-act="chal" data-id="${esc(c.id)}" data-s="postponed">Tomorrow</button></div>` : `<div class="row-actions">${badge(c.status === 'done' ? 'green' : 'grey', c.status === 'done' ? 'Completed' : c.status === 'skipped' ? 'Skipped' : 'Moved to tomorrow')}<button class="link" data-act="chal" data-id="${esc(c.id)}" data-s="open">Undo</button></div>`}</div>`).join('')}</div></article>`;
}
A.chal = el => { const c = st.D.challenges.items.find(x => x.id === el.dataset.id); if (!c) return; c.status = el.dataset.s; if (c.status === 'done') { H.markActivity(); H.save(); H.celebrate('Challenge complete! 🎉', `${st.D.profile.name} completed a challenge: ${c.text}`); } else H.save(); H.rerender(); };

/* ----- next steps (editable tasks) ----- */
function taskRow(t) {
  const [pc, pl] = H.PRI[t.priority] || H.PRI.medium, src = t.source === 'user' ? badge('blue', 'Mine') : t.source === 'educator' ? badge('yellow', 'From educator') : badge('violet', t.edited || t.accepted ? 'AI · accepted' : 'AI suggested');
  return `<div class="task ${t.done ? 'done' : ''}"><input type="checkbox" ${t.done ? 'checked' : ''} data-chg="taskToggle" data-id="${esc(t.id)}" aria-label="Mark done"><div class="grow"><b class="t-title">${esc(t.title)}</b> ${src}${t.desc ? `<br><small class="muted">${esc(t.desc)}</small>` : ''}<br><small class="muted">${t.due ? 'Due ' + H.fmt(t.due) : 'No date'}</small> ${badge(pc, pl)}</div><button class="icon-mini" data-act="taskEdit" data-id="${esc(t.id)}" aria-label="Edit task">✎</button><button class="icon-mini" data-act="taskDelete" data-id="${esc(t.id)}" aria-label="Delete task">🗑</button></div>`;
}
function tasksCard() {
  const D = st.D, t = H.today(), wk = K.addDays(t, 7), pr = { high: 0, medium: 1, low: 2 };
  const list = D.tasks.filter(x => (st.ui.taskView === 'daily' ? (!x.due || x.due <= t) : (!x.due || x.due <= wk))).sort((a, b) => a.done - b.done || (pr[a.priority] ?? 1) - (pr[b.priority] ?? 1) || String(a.due).localeCompare(String(b.due)));
  return `<article class="card reveal"><h3>🧭 Your Next Steps</h3>${H.tabs([['daily', 'Today'], ['weekly', 'This week']], st.ui.taskView, 'taskView')}
  ${list.length ? list.map(taskRow).join('') : H.empty('🎉', 'Nothing due here. Add a task or regenerate suggestions.')}
  <form class="inline-form" data-form="taskSave"><input name="title" placeholder="Add your own task…" maxlength="90" aria-label="New task"><input type="date" name="due" value="${t}" aria-label="Due date"><select name="priority" aria-label="Priority">${optHTML([['medium', 'Medium'], ['high', 'High'], ['low', 'Low']], 'medium')}</select><button class="btn small primary">Add</button></form>
  <div class="row-actions" style="margin-top:10px"><button class="btn small ghost-dark" data-act="taskRegen">✨ Regenerate AI suggestions</button><small class="muted">Your own, edited, accepted and finished tasks are never replaced.</small></div></article>`;
}
A.taskView = el => { st.ui.taskView = el.dataset.tab; H.rerender(); };
A.taskToggle = el => { const t = st.D.tasks.find(x => x.id === el.dataset.id); if (!t) return; t.done = el.checked; if (t.done) { H.markActivity(); H.toast('Task done ✔'); } H.save(); H.rerender(); };
A.taskDelete = el => { st.D.tasks = st.D.tasks.filter(x => x.id !== el.dataset.id); H.save(); H.rerender(); };
A.taskEdit = el => { const t = st.D.tasks.find(x => x.id === el.dataset.id); if (!t) return; H.openModal(`<h3 id="modalTitle">Edit task</h3><form data-form="taskSave"><input type="hidden" name="id" value="${esc(t.id)}">${tf('title', 'Task', t.title, 'required maxlength="90"')}${tf('desc', 'Details', t.desc, 'maxlength="200"')}<label class="field">Due date<input type="date" name="due" value="${esc(t.due || '')}"></label><label class="field">Priority<select name="priority">${optHTML([['high', 'High'], ['medium', 'Medium'], ['low', 'Low']], t.priority)}</select></label><button class="btn primary">Save</button></form>`); };
A.taskSave = form => {
  const f = H.formObj(form), title = String(f.title || '').trim(), D = st.D; if (!title) { H.toast('Please enter a task name.'); return; }
  if (f.id) { const t = D.tasks.find(x => x.id === f.id); if (t) { Object.assign(t, { title, desc: f.desc || '', due: f.due || '', priority: f.priority, edited: true }); } H.closeModal(); }
  else D.tasks.push({ id: K.uid('t'), key: '', title, desc: '', due: f.due || H.today(), priority: f.priority || 'medium', done: false, source: 'user', area: 'Personal', edited: false, accepted: false });
  H.save(); H.rerender();
};
A.taskRegen = () => { const D = st.D, t = H.today(), r = K.mergeTasks(D.tasks, K.tasksFromRecs(K.buildRecs(D, t), t)); D.tasks = r.tasks; H.save(); H.toast(`Suggestions refreshed: ${r.added} new. Kept ${r.kept} of your tasks untouched.`); H.rerender(); };

/* ----- goals ----- */
function goalsCard() {
  const g = st.D.goals;
  return `<article class="card reveal"><h3>🎯 My goals</h3>${g.length ? g.map((x, i) => `<label class="goal-row ${x.done ? 'done' : ''}"><input type="checkbox" data-chg="goalToggle" data-i="${i}" ${x.done ? 'checked' : ''}><span>${esc(x.t)}</span><button class="icon-mini" type="button" data-act="goalDel" data-i="${i}" aria-label="Delete goal">🗑</button></label>`).join('') : H.empty('🌟', 'No goals yet. Add your first one!')}
  <form class="inline-form" data-form="goalAdd"><input name="g" placeholder="Add a goal…" maxlength="80" aria-label="New goal"><button class="btn small primary">Add</button></form></article>`;
}
A.goalAdd = form => { const v = String(H.formObj(form).g || '').trim(); if (!v) return; st.D.goals.push({ t: v, done: false }); H.save(); H.rerender(); };
A.goalToggle = el => { const g = st.D.goals[+el.dataset.i]; g.done = el.checked; if (g.done) { H.markActivity(); H.save(); H.celebrate('Goal achieved. Well done! 🏆', `${st.D.profile.name} completed a goal: ${g.t}`); } else H.save(); H.rerender(); };
A.goalDel = el => { st.D.goals.splice(+el.dataset.i, 1); H.save(); H.rerender(); };

/* ----- dashboard ----- */
function dontMiss() {
  const D = st.D, t = H.today(), out = [];
  D.exams.forEach(e => out.push({ t: e.name, d: K.daysBetween(t, e.date), go: 'hub', tag: 'you entered' }));
  Object.keys(D.saved).forEach(id => { const s = K.scheme(id); if (!['applied', 'outcome'].includes(D.saved[id].stage)) out.push({ t: s.name, d: K.daysBetween(t, K.schemeDeadline(s, D)), go: 'scholarship', tag: 'sample date' }); });
  return out.filter(x => x.d >= 0).sort((a, b) => a.d - b.d).slice(0, 5);
}
function aboutSummary() {
  const P = st.D.profile, sh = st.D.share, row = (l, v) => `<div class="prow"><span>${l}</span><b>${esc(v || 'Not added yet')}</b></div>`;
  return `<article class="card reveal"><h3>🙂 About me</h3>${row('Name', P.name)}${row('Education', K.LEVELS[P.level])}${row('School', P.school)}${row('Goals', P.goals)}${row('Career interests', P.careers)}${row('Learning style', (P.learnPrefs || []).join(', '))}${row('Wellness preferences', (P.wellPrefs || []).join(', '))}${row('Scholarship goals', P.schGoals)}
  <button class="btn small primary" data-act="go" data-view="about">Edit my info</button></article>`;
}
function shareToggles() {
  const sh = st.D.share, t = (k, l) => `<label class="toggle"><input type="checkbox" data-chg="shareToggle" data-k="${k}" ${sh[k] ? 'checked' : ''}><span></span> ${l}</label>`;
  return t('parentAcademic', 'Parent: learning progress summary') + t('parentExams', 'Parent: upcoming exams') + t('parentDeadlines', 'Parent: scholarship deadlines') + t('edu', 'Educator: learning progress') + t('notifyEdu', 'Tell educator when I finish a challenge or goal');
}
A.shareToggle = el => { st.D.share[el.dataset.k] = el.checked; H.save(); H.toast(el.checked ? 'Sharing turned on' : 'Sharing turned off'); };

function marksCard() {
  const D = st.D, m = D.marks || [], f = D.feedback || [];
  return `<article class="card reveal"><h3>📝 Official marks & educator feedback</h3><p class="muted">Entered by your educator. You can read them but not change them.</p>${m.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Subject</th><th>Assessment</th><th>Marks</th></tr></thead><tbody>${m.map(x => `<tr><td>${esc(x.subject)}</td><td>${esc(x.exam)}</td><td><b>${esc(x.score)}/${esc(x.max)}</b></td></tr>`).join('')}</tbody></table></div>` : H.empty('📝', 'No official marks have been entered yet.')}${f.length ? `<h4>Feedback</h4>${f.map(x => `<div class="hist"><span><b>${esc(x.from)}</b>: ${esc(x.text)}</span></div>`).join('')}` : ''}</article>`;
}
H.marksCard = marksCard;
V.dashboard = {
  html() {
    const D = st.D, t = H.today(); H.ensureChallenges(); H.initTasks();
    const L = K.learningProgress(D, t), W = K.wellnessProgress(D, t), R = K.readinessProgress(D), recs = K.buildRecs(D, t), hidden = Object.values(D.recState).filter(x => x.status === 'dismissed').length;
    const mt = K.markTrend(D.marks), trM = K.trend(mt.map(x => x.pct)), dm = dontMiss();
    const tr = (x, what) => (x ? `<small class="muted">${x.dir === 'up' ? '📈 Improving' : x.dir === 'down' ? '📉 Dipped' : '➖ Steady'} (${x.delta > 0 ? '+' : ''}${x.delta}) in ${what}. A pattern, not a verdict.</small>` : `<small class="muted">Need at least 4 data points to show a trend.</small>`);
    return `<div class="hero"><div><h1>Hi ${esc(H.first(D.profile.name))}! 👋</h1><p>${recs[0] ? `Top focus today: <b>${esc(recs[0].title)}</b>.` : 'You are all caught up. Nice work!'} ${D.profile.goals ? `Your goal: <i>${esc(D.profile.goals)}</i>.` : ''}</p><div class="hero-actions"><button class="btn primary" data-act="go" data-view="guardian">Chat with Guardian</button><button class="btn ghost" data-act="go" data-view="scholarship">Scholarship agent</button></div></div><div class="hero-art" aria-hidden="true"><span class="float f1">📘</span><span class="float f2">🎓</span><span class="float f3">⭐</span><span class="float f4">💡</span></div></div>
    <article class="card reveal"><h3>💬 How am I doing?</h3><div class="rings3">${H.ring('Learning progress', L.pct, '#12467a', L.basis)}${H.ring('Documents & opportunity readiness', R.pct, '#f0a030', R.basis)}</div><small class="muted">Percentages come only from what you have recorded. No records means no number, never a guess.</small></article>
    <article class="card reveal"><h3>Mark trend</h3>${mt.length >= 2 ? '<canvas id="chMarks" height="190" aria-label="Mark trend from official marks"></canvas>' : H.empty('📝', 'Your educator’s official marks will appear here as a trend once there are at least two.')}${tr(trM, 'marks')} <small class="muted">Percentage of each official mark entry, in the order entered.</small></article>
    <article class="card reveal"><h3>🎯 What should I focus on?</h3><p class="muted"><span class="tag t-fact">✔ Verified</span> comes from your records. <span class="tag t-ai">✨ AI suggestion</span> is advice you can edit, postpone or dismiss.</p>${recs.length ? recs.slice(0, 4).map(recCard).join('') : H.empty('🎉', 'Nothing needs attention right now.')}${hidden ? `<button class="link" data-act="recRestore">Show ${hidden} dismissed suggestion${hidden > 1 ? 's' : ''} again</button>` : ''}</article>
    ${challengesCard()}${tasksCard()}${marksCard()}
    <div class="grid two"><article class="card reveal"><h3>⏰ Don’t miss these</h3>${dm.length ? `<ul class="deadline-list">${dm.map(x => `<li><span>${esc(x.t)} <small class="muted">(${x.tag})</small></span><span class="when">${H.dayChip(x.d)}</span><button class="mini" data-act="go" data-view="${x.go}">Open</button></li>`).join('')}</ul>` : H.empty('📅', 'Add an exam date or save a scholarship to see deadlines here.')}</article>${aboutSummary()}</div>`;
  },
  after() { H.animateRings(); const mt = K.markTrend(st.D.marks);
    if ($('#chMarks')) H.lineChart($('#chMarks'), mt.map(x => x.subject.slice(0, 4) + ' ' + H.fmt(new Date(x.ts).toISOString().slice(0, 10))), [{ data: mt.map(x => x.pct), color: '#12467a', fill: true }], { min: 0, max: 100 }); }
};
const $ = H.$;

/* ----- daily plans ----- */
V.plans = {
  html() {
    const D = st.D, t = H.today(); H.ensureChallenges(); H.initTasks();
    const today = D.sessions.filter(s => s.date === t), days = Array.from({ length: 7 }, (_, i) => K.addDays(t, i));
    return `<h2 class="view-title">🗓️ Daily Plans <small>Your sessions, tasks and goals in one place. Everything is editable.</small></h2>
    <div class="grid two"><article class="card reveal"><h3>Today’s study sessions</h3>${today.length ? today.map(s => `<div class="sess ${s.type === 'Break' ? 'brk' : ''} ${s.done ? 'done' : ''}">${s.type === 'Break' ? '☕' : `<input type="checkbox" ${s.done ? 'checked' : ''} data-chg="sessToggle" data-id="${esc(s.id)}" aria-label="Done">`}<div class="grow"><b class="t-title">${esc(s.title)}</b><br><small class="muted">${s.mins} min</small></div></div>`).join('') : H.empty('📚', 'No sessions today. Generate a plan in the Learning Hub.')}<button class="btn small primary" data-act="go" data-view="hub">Open planner</button></article>${goalsCard()}</div>
    ${challengesCard()}${tasksCard()}
    <article class="card reveal"><h3>This week at a glance</h3>${days.map(d => { const ss = D.sessions.filter(s => s.date === d && s.type !== 'Break'), tt = D.tasks.filter(x => x.due === d && !x.done); return `<div class="prow"><span><b>${d === t ? 'Today' : new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</b></span><span>${ss.length} session${ss.length === 1 ? '' : 's'} · ${tt.length} task${tt.length === 1 ? '' : 's'} due</span></div>`; }).join('')}</article>`;
  }
};

/* ----- about me ----- */
V.about = {
  html() {
    const D = st.D, P = D.profile;
    return `<h2 class="view-title">🙂 About Me <small>Your details, in your control</small></h2>
    <div class="grid two"><article class="card reveal"><h3>My information</h3><form data-form="aboutSave">${tf('name', 'Name', P.name, 'required maxlength="60"')}<label class="field">Education level<select name="level">${optHTML(Object.entries(K.LEVELS), P.level)}</select></label><label class="field">Gender<select name="gender"><option value="">Not recorded</option>${optHTML(Object.entries(K.GENDERS), P.gender)}</select></label>${P.gender === 'female' ? `<label class="field">Have you reached puberty?<select name="puberty"><option value="">Not recorded</option>${optHTML([['yes', 'Yes'], ['no', 'Not yet']], P.puberty)}</select><small class="muted">Used only to decide whether the Health Center shows the Menstrual Cycle Tracker.</small></label>` : ''}${tf('school', 'School or college (optional)', P.school, 'maxlength="80"')}<label class="field">State (used for state scholarships)<select name="state"><option value="">Prefer not to say</option>${optHTML(K.STATES, P.state)}</select></label>${tf('goals', 'Current academic goals', P.goals, 'maxlength="120"')}${tf('careers', 'Career interests', P.careers, 'maxlength="120"')}<b>Learning preferences</b>${checks('learnPrefs', LEARN_PREFS, P.learnPrefs || [])}<b>Wellness preferences</b>${checks('wellPrefs', WELL_PREFS, P.wellPrefs || [])}${tf('schGoals', 'Scholarship and opportunity goals', P.schGoals, 'maxlength="140"')}<button class="btn primary">Save</button></form></article>
    <div><article class="card reveal"><h3>My link code</h3><p>Give this to a parent or educator so they can send a link request. You approve it in Settings.</p><p class="code">${esc(D.linkCode)}</p></article></div></div>`;
  }
};
A.aboutSave = form => {
  const f = H.formObj(form), D = st.D, P = D.profile; if (!String(f.name || '').trim()) { H.toast('Please enter your name.'); return; }
  const gender = K.GENDERS[f.gender] ? f.gender : '';
  Object.assign(P, { name: f.name.trim(), level: f.level, gender, puberty: gender === 'female' && ['yes', 'no'].includes(f.puberty) ? f.puberty : '', school: f.school || '', state: f.state || '', goals: f.goals || '', careers: f.careers || '', schGoals: f.schGoals || '', learnPrefs: [].concat(f.learnPrefs || []), wellPrefs: [].concat(f.wellPrefs || []) });
  st.me.name = P.name; const a = st.accounts.find(x => x.id === st.me.id); if (a) { a.name = P.name; H.saveAccounts(); }
  H.reassess('Profile updated'); H.toast('Saved ✔'); H.rerender();
};

/* ----- settings ----- */
V.settings = {
  html() {
    const D = st.D, pend = D.links.filter(l => l.status === 'pending'), ok = D.links.filter(l => l.status === 'approved');
    const tg = (k, l) => `<label class="toggle"><input type="checkbox" data-chg="setToggle" data-k="${k}" ${D.share[k] ? 'checked' : ''}><span></span> ${l}</label>`;
    return `<h2 class="view-title">⚙️ Settings & Privacy <small>Review, correct, export or delete your data</small></h2>
    <div class="grid two"><article class="card reveal"><h3>Link requests</h3>${pend.length ? pend.map(l => `<div class="doc-row"><div><b>${esc(l.name)}</b> <small>(${l.role})</small><small>Wants to link with you. You choose what they see.</small></div><div><button class="btn small primary" data-act="linkApprove" data-uid="${esc(l.uid)}">Review</button> <button class="btn small ghost-dark" data-act="linkRemove" data-uid="${esc(l.uid)}">Decline</button></div></div>`).join('') : '<p class="muted">No pending requests.</p>'}
    <h4>Linked people</h4>${ok.length ? ok.map(l => `<div class="doc-row"><div><b>${esc(l.name)}</b> <small>(${l.role})</small></div><button class="btn small ghost-dark" data-act="linkRemove" data-uid="${esc(l.uid)}">Remove access</button></div>`).join('') : '<p class="muted">Nobody is linked yet.</p>'}</article>
    <article class="card reveal"><h3>Personalization & sharing</h3>${tg('pause', 'Pause personalization (Guardian gives general advice only)')}${tg('quiet', 'Quiet hours for reminders (9 PM – 7 AM)')}<h4>Sharing</h4>${shareToggles()}</article></div>
    <article class="card reveal"><h3>🔎 Who accessed my information</h3>${accessLog()}</article>
    <div class="grid two"><article class="card reveal"><h3>My data</h3><div class="prow"><span>Practice records</span><b>${D.attempts.length}</b></div><div class="prow"><span>Study sessions</span><b>${D.sessions.length}</b></div><div class="prow"><span>Wellness check-ins</span><b>${D.well.length}</b></div><div class="prow"><span>Health records</span><b>${D.health.records.length}</b></div><div class="prow"><span>Saved scholarships</span><b>${Object.keys(D.saved).length}</b></div>
    <div class="row-actions" style="margin-top:10px"><button class="btn small primary" data-act="exportData">⬇ Export my data</button></div></article>
    <article class="card reveal"><h3>Delete optional records</h3><div class="row-actions"><button class="btn small ghost-dark" data-act="delData" data-what="well">Wellness & meals</button><button class="btn small ghost-dark" data-act="delData" data-what="health">Health records</button><button class="btn small ghost-dark" data-act="delData" data-what="attempts">Practice history</button><button class="btn small ghost-dark" data-act="delData" data-what="plan">Study plan</button></div><hr style="margin:14px 0;border:0;border-top:1px solid var(--line)"><button class="btn small ghost-dark" data-act="delAccount">Delete my account</button><div class="safe-note">🔐 Demo note: data lives only in this browser. Real deployments store it on a secure server with server-side permission checks.</div></article></div>`;
  }
};
A.setToggle = el => { st.D.share[el.dataset.k] = el.checked; H.save(); H.toast('Saved'); };
A.linkApprove = el => { const l = st.D.links.find(x => x.uid === el.dataset.uid); if (!l) return; const p = l.role === 'parent'; H.openModal(`<h3 id="modalTitle">Approve ${esc(l.name)}?</h3><p class="muted">Choose what this ${l.role} may see. You can change it any time.</p><form data-form="linkApproveSave"><input type="hidden" name="uid" value="${esc(l.uid)}">${p ? `<label class="toggle"><input type="checkbox" name="parentAcademic"><span></span> Learning progress summary</label><label class="toggle"><input type="checkbox" name="parentExams"><span></span> Upcoming exams</label><label class="toggle"><input type="checkbox" name="parentDeadlines"><span></span> Scholarship deadlines</label>` : l.role === 'warden' ? `<p class="muted">A hostel warden can upload health reports for you and see only that report history. They never see your learning data, chats, documents or income.</p>` : `<label class="toggle"><input type="checkbox" name="edu"><span></span> Learning progress</label><label class="toggle"><input type="checkbox" name="notifyEdu"><span></span> Tell them when I finish a challenge or goal</label>`}<p class="muted">Health records, chats, documents and income are never shared with parents or educators.</p><button class="btn primary">Approve</button></form>`); };
A.linkApproveSave = form => { const f = H.formObj(form), D = st.D, l = D.links.find(x => x.uid === f.uid); if (!l) return; l.status = 'approved'; ['parentAcademic', 'parentExams', 'parentDeadlines', 'edu', 'notifyEdu'].forEach(k => { if (k in f) D.share[k] = true; }); H.save(); H.pushInbox(l.uid, D.profile.name, 'Your link request was approved.'); H.closeModal(); H.toast('Approved ✔'); H.rerender(); };
A.linkRemove = el => { const D = st.D, l = D.links.find(x => x.uid === el.dataset.uid); D.links = D.links.filter(x => x.uid !== el.dataset.uid); if (l && l.role === 'educator' && !D.links.some(x => x.role === 'educator')) { D.share.edu = false; D.share.notifyEdu = false; } if (l && l.role === 'parent' && !D.links.some(x => x.role === 'parent')) Object.assign(D.share, { parentAcademic: false, parentExams: false, parentDeadlines: false }); H.save(); H.toast('Access removed'); H.rerender(); };
function accessLog() {
  const e = H.auditFor(x => x.sid === st.me.id).slice(0, 15);
  return e.length ? `<p class="muted">Changes made by linked people are recorded here.</p>${e.map(x => `<div class="hist"><span>${esc(x.actorName)} (${esc(x.role)}): ${esc(x.action)}</span><small class="muted">${new Date(x.ts).toLocaleString()}</small></div>`).join('')}` : '<p class="muted">No linked person has changed anything yet.</p>';
}
A.exportData = () => { const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), account: { name: st.me.name, email: st.me.email, role: st.me.role }, data: st.D }, null, 2)], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sahaya-my-data.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
A.delData = el => { const D = st.D, w = el.dataset.what; if (w === 'well') { D.well = []; D.meals = []; } if (w === 'health') D.health.records = []; if (w === 'attempts') D.attempts = []; if (w === 'plan') D.sessions = []; H.save(); H.toast('Deleted ✔'); H.rerender(); };
A.delAccount = () => H.openModal(`<h3 id="modalTitle">Delete your account?</h3><p>This removes your account and everything stored for it on this device. It cannot be undone.</p><div class="row-actions"><button class="btn primary" data-act="delAccountYes">Yes, delete everything</button><button class="btn ghost-dark" data-act="closeModal">Cancel</button></div>`);
A.delAccountYes = () => { const id = st.me.id; st.accounts = st.accounts.filter(a => a.id !== id); H.saveAccounts(); H.db.del('data_' + id); H.db.del('inbox_' + id); A.logout(); };

/* ----- opportunity passport ----- */
const PT = { s: '<span class="ptag p-student">Student-entered</span>', v: '<span class="ptag p-verified">Verified external</span>', a: '<span class="ptag p-ai">AI / rule-generated</span>', n: '<span class="ptag p-verify">Needs verification</span>', c: '<span class="ptag p-student">Calculated from your records</span>' };
V.passport = {
  html() {
    const D = st.D, t = H.today(), P = D.profile, L = K.learningProgress(D, t), R = K.readinessProgress(D), W = K.wellnessProgress(D, t), o = K.overallStats(D.attempts), recs = K.buildRecs(D, t).slice(0, 3), next = K.agentNextAction(D, t);
    const row = (l, v, tag) => `<div class="prow"><span>${l}</span><span><b>${v ? esc(v) : '<i class="muted">Not added</i>'}</b>${tag || ''}</span></div>`, card = (h, b, edit) => `<article class="card reveal"><h3>${h} ${edit ? `<button class="link" data-act="go" data-view="${edit}">Review / correct</button>` : ''}</h3>${b}</article>`;
    const done = D.tasks.filter(x => x.done), saved = Object.entries(D.saved);
    return `<h2 class="view-title">🪪 Student Opportunity Passport <small>Everything in one place, with where each fact came from</small></h2>
    <div class="banner"><b>How to read this:</b> ${PT.s} you typed it · ${PT.c} counted from your records · ${PT.a} suggested by Kamarajar Sarathi rules/AI · ${PT.n} confirm with the official source · ${PT.v} none yet, because this demo has no live verified sources.</div>
    <div class="row-actions"><button class="btn small primary" data-act="printPassport">🖨 Print or save as PDF</button></div>
    <div class="grid two">${card('Profile', row('Name', P.name, PT.s) + row('Education', K.LEVELS[P.level], PT.s) + row('School', P.school, PT.s) + row('Career interests', P.careers, PT.s) + row('Goals', P.goals, PT.s) + row('Scholarship goals', P.schGoals, PT.s), 'about')}
    ${card('Learning & practice', row('Learning progress', L.pct == null ? '' : L.pct + '%', PT.c) + row('Questions answered', o.attempted ? `${o.attempted} (${o.accuracy}% correct)` : '', PT.c) + row('Study sessions done', `${D.sessions.filter(s => s.type !== 'Break' && s.done).length} of ${D.sessions.filter(s => s.type !== 'Break').length}`, PT.c) + row('Day streak', String(K.streak(D.activity, t)), PT.c), 'questions')}
    ${card('Exams', D.exams.length ? D.exams.map(e => row(esc(e.name), `${H.fmt(e.date)} (${K.daysBetween(t, e.date)} days)`, PT.s)).join('') : '<p class="muted">No exams added.</p>', 'hub')}
    ${card('Scholarships', saved.length ? saved.map(([id, v]) => { const s = K.scheme(id), e = K.evaluate(s, P); return row(esc(s.name), `${e.label} · ${v.stage}`, PT.a + PT.n); }).join('') + '<small class="muted">Sample dataset. Stage is what you reported. Eligibility is a rule-based check, never an approval.</small>' : '<p class="muted">No scholarships saved yet.</p>', 'scholarship')}
    ${card('Document readiness', row('Documents available', R.pct == null ? '' : R.pct + '%', PT.c) + K.DOCS.map(d => row(d.name, ({ have: 'Available', get: 'Pending', update: 'Needs updating', verify: 'Awaiting verification' })[(D.docs[d.id] || {}).status], PT.s + PT.n)).join(''), 'documents')}
    ${card('Well-being (private to you)', row('Habit indicator', W.pct == null ? '' : W.pct + '%', PT.c) + `<small class="muted">${esc(W.basis)} Never shared with parents or educators, never used for scholarship decisions.</small>`, 'health')}
    ${card('Completed actions', row('Tasks finished', String(done.length), PT.s) + row('Goals achieved', String(D.goals.filter(g => g.done).length), PT.s) + done.slice(-4).map(x => `<div class="prow"><span>✔ ${esc(x.title)}</span></div>`).join(''))}
    ${card('Recommended next steps', recs.map(r => row(esc(r.title), r.fact, PT.a)).join('') + row('Scholarship agent says', next.text, PT.a))}</div>`;
  }
};
A.printPassport = () => window.print();
})();
