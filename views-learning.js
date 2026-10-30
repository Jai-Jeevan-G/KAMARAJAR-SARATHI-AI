/* ===== Kamarajar Sarathi AI · views-learning.js : Learning Hub (Class 12 hub / learning dashboard) + Question Tracker ===== */
(() => {
'use strict';
const S = window.SAHAYA, K = S.K, H = S.H, A = S.A, V = S.V, st = S.st;
const { esc, chip, badge, optHTML } = H, $ = H.$;
const SUBJECTS = Object.keys(K.SUBJECT_TOPICS), EXAM_GOALS = ['Board exams', 'JEE Main', 'JEE Advanced', 'CUET', 'NEET', 'State entrance', 'Other'], BOARDS = K.BOARDS;
const school = () => ['c9', 'c10', 'c11', 'c12', 'c12done'].includes(st.D.profile.level);
const attention = () => { const D = st.D, seen = new Set(), out = []; K.weakTopics(D.attempts).map(t => ({ subject: t.subject, topic: t.topic, why: 'low accuracy in your practice' })).concat(D.hub.difficult.map(t => ({ ...t, why: 'you marked it difficult' }))).forEach(t => { const k = t.subject + '|' + t.topic; if (!seen.has(k)) { seen.add(k); out.push(t); } }); return out; };

/* ---------- Learning Hub ---------- */
const chipBox = (list, cur, act) => `<div class="chips">${list.map(s => `<label class="chip-btn ${cur.includes(s) ? 'on' : ''}"><input type="checkbox" hidden data-chg="${act}" data-v="${esc(s)}" ${cur.includes(s) ? 'checked' : ''}> ${esc(s)}</label>`).join('')}</div>`;
function setupTab() {
  const D = st.D, h = D.hub, custom = h.subjects.filter(s => !SUBJECTS.includes(s)), tList = [...new Set(Object.values(K.SUBJECT_TOPICS).flat())];
  return `<div class="grid two"><article class="card reveal"><h3>My subjects & goals</h3>${school() ? `<label class="field">Education board<select data-chg="hubBoard"><option value="">Choose…</option>${optHTML(BOARDS, h.board)}</select></label>` : ''}
  <b>Subjects</b>${chipBox([...SUBJECTS, ...custom], h.subjects, 'hubSubj')}<form class="inline-form" data-form="hubAddSubj"><input name="s" placeholder="Add another subject" maxlength="30" aria-label="Add subject"><button class="btn small primary">Add</button></form>
  ${school() ? `<b>Examination goals</b>${chipBox(EXAM_GOALS, h.examGoals, 'hubGoal')}` : ''}
  <label class="field">Daily study time: <b id="minsV">${h.mins}</b> min<input type="range" min="30" max="360" step="15" value="${h.mins}" data-inp="hubMinsLabel" data-chg="hubMins"></label><small class="muted">Plans always include breaks. You can lower this any time.</small></article>
  <div><article class="card reveal"><h3>Topics I find difficult</h3>${h.difficult.length ? h.difficult.map((t, i) => `<div class="hist"><span>${esc(t.subject)} · <b>${esc(t.topic)}</b></span><button class="icon-mini" data-act="hubDiffDel" data-i="${i}" aria-label="Remove">🗑</button></div>`).join('') : '<p class="muted">None added.</p>'}
  <form class="inline-form" data-form="hubDiffAdd"><select name="subject" aria-label="Subject">${optHTML(h.subjects.length ? h.subjects : SUBJECTS, '')}</select><input name="topic" list="topicList" placeholder="Topic" maxlength="40" aria-label="Topic"><datalist id="topicList">${tList.map(x => `<option value="${esc(x)}">`).join('')}</datalist><button class="btn small primary">Add</button></form></article>
  <article class="card reveal"><h3>Upcoming exams</h3>${D.exams.length ? D.exams.map(e => `<div class="hist"><span><b>${esc(e.name)}</b> · ${H.fmt(e.date)}</span><button class="icon-mini" data-act="examDel" data-id="${esc(e.id)}" aria-label="Remove exam">🗑</button></div>`).join('') : '<p class="muted">No exams yet.</p>'}
  <form class="inline-form" data-form="examAdd"><input name="name" placeholder="Exam name" maxlength="50" required aria-label="Exam name"><input type="date" name="date" required aria-label="Exam date"><button class="btn small primary">Add</button></form><small class="muted">Dates are the ones you enter. Always confirm official dates on the exam body’s website.</small></article></div></div>`;
}
const hubSave = () => { H.save(); H.rerender(); };
const toggle = (arr, v, on) => { const i = arr.indexOf(v); if (on && i < 0) arr.push(v); if (!on && i >= 0) arr.splice(i, 1); };
A.hubBoard = el => { st.D.hub.board = el.value; H.save(); };
A.hubSubj = el => { toggle(st.D.hub.subjects, el.dataset.v, el.checked); hubSave(); };
A.hubGoal = el => { toggle(st.D.hub.examGoals, el.dataset.v, el.checked); H.save(); };
A.hubAddSubj = form => { const s = String(H.formObj(form).s || '').trim(); if (s && !st.D.hub.subjects.includes(s)) st.D.hub.subjects.push(s); hubSave(); };
A.hubMinsLabel = el => { $('#minsV').textContent = el.value; };
A.hubMins = el => { st.D.hub.mins = +el.value; H.save(); };
A.hubDiffAdd = form => { const f = H.formObj(form), t = String(f.topic || '').trim(); if (!t) { H.toast('Type a topic first.'); return; } st.D.hub.difficult.push({ subject: f.subject, topic: t }); hubSave(); };
A.hubDiffDel = el => { st.D.hub.difficult.splice(+el.dataset.i, 1); hubSave(); };
A.examAdd = form => { const f = H.formObj(form); if (!String(f.name || '').trim() || !f.date) { H.toast('Enter an exam name and date.'); return; } st.D.exams.push({ id: K.uid('e'), name: f.name.trim(), date: f.date }); H.refreshAI(); hubSave(); };
A.examDel = el => { st.D.exams = st.D.exams.filter(e => e.id !== el.dataset.id); H.refreshAI(); hubSave(); };

function sessRow(s, i, sameDay) {
  const brk = s.type === 'Break';
  return `<div class="sess ${brk ? 'brk' : ''} ${s.done ? 'done' : ''}">${brk ? '☕' : `<input type="checkbox" ${s.done ? 'checked' : ''} data-chg="sessToggle" data-id="${esc(s.id)}" aria-label="Done">`}<div class="grow"><b class="t-title">${esc(s.title)}</b> ${s.source === 'user' ? badge('blue', 'Mine') : s.edited ? badge('violet', 'AI · edited') : badge('violet', 'AI')}<br><small class="muted">${s.mins} min${s.subject ? ' · ' + esc(s.subject) : ''}</small></div>
  <button class="icon-mini" data-act="sessMove" data-id="${esc(s.id)}" data-d="-1" aria-label="Move up">▲</button><button class="icon-mini" data-act="sessMove" data-id="${esc(s.id)}" data-d="1" aria-label="Move down">▼</button><button class="icon-mini" data-act="sessEdit" data-id="${esc(s.id)}" aria-label="Edit">✎</button><button class="icon-mini" data-act="sessDel" data-id="${esc(s.id)}" aria-label="Delete">🗑</button></div>`;
}
function plannerTab() {
  const D = st.D, t = H.today(), days = Array.from({ length: 7 }, (_, i) => K.addDays(t, i)), late = D.sessions.filter(s => s.date < t && !s.done && s.type !== 'Break');
  if (D.lastPlanReview !== t) { D.lastPlanReview = t; H.save(); }
  return `<article class="card reveal"><div class="row-actions"><button class="btn primary" data-act="planGen">✨ ${D.sessions.length ? 'Refresh my week' : 'Generate my week'}</button><button class="btn ghost-dark" data-act="sessEdit">＋ Add a session</button></div>
  <small class="muted">Based on your subjects, difficult topics, practice results, exams and ${D.hub.mins} min a day. Refreshing never replaces sessions you added, edited, finished or moved.</small></article>
  ${late.length ? `<article class="card reveal"><h3>Earlier, not done yet</h3>${late.map(s => sessRow(s)).join('')}<small class="muted">Edit a session to move it to a new day.</small></article>` : ''}
  ${days.map(d => { const ss = D.sessions.filter(s => s.date === d); return `<article class="card reveal sday"><h4>${d === t ? 'Today' : new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</h4>${ss.length ? ss.map(s => sessRow(s)).join('') : '<p class="muted">Rest day or nothing planned.</p>'}</article>`; }).join('')}`;
}
A.planGen = () => {
  const D = st.D; if (!D.hub.subjects.length) { H.toast('Pick your subjects first.'); st.ui.hubTab = 'setup'; return H.rerender(); } if (D.hub.mins < 30) { H.toast('Choose at least 30 minutes a day.'); return; }
  const r = K.regeneratePlan(D.sessions, { subjects: D.hub.subjects, difficult: D.hub.difficult, weak: K.weakTopics(D.attempts).map(t => ({ subject: t.subject, topic: t.topic })), mins: D.hub.mins, start: H.today(), days: 7, exams: D.exams });
  D.sessions = r.sessions; D.lastPlanReview = H.today(); H.save(); H.toast(`Week planned: ${r.added} new items. Kept ${r.kept} of your sessions.`); H.rerender();
};
A.sessToggle = el => { const s = st.D.sessions.find(x => x.id === el.dataset.id); if (!s) return; s.done = el.checked; if (s.done) { H.markActivity(); H.toast('Session done ✔'); } H.save(); H.rerender(); };
A.sessDel = el => { st.D.sessions = st.D.sessions.filter(x => x.id !== el.dataset.id); H.save(); H.rerender(); };
A.sessMove = el => {
  const a = st.D.sessions, i = a.findIndex(x => x.id === el.dataset.id), d = +el.dataset.d; let j = i + d; while (j >= 0 && j < a.length && a[j].date !== a[i].date) j += d;
  if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; a[i].edited = true; a[j].edited = true; H.save(); H.rerender();
};
A.sessEdit = el => {
  const s = el && el.dataset && el.dataset.id ? st.D.sessions.find(x => x.id === el.dataset.id) : null, subj = [''].concat(st.D.hub.subjects);
  H.openModal(`<h3 id="modalTitle">${s ? 'Edit session' : 'Add a session'}</h3><form data-form="sessSave"><input type="hidden" name="id" value="${s ? esc(s.id) : ''}"><label class="field">Title<input type="text" name="title" value="${esc(s ? s.title : '')}" required maxlength="80"></label><label class="field">Subject<select name="subject">${optHTML(subj, s ? s.subject : '')}</select></label><div class="two-col"><label class="field">Minutes<input type="number" name="mins" min="10" max="180" value="${s ? s.mins : 30}"></label><label class="field">Date<input type="date" name="date" value="${s ? s.date : H.today()}"></label></div><button class="btn primary">Save</button></form>`);
};
A.sessSave = form => {
  const f = H.formObj(form), D = st.D, title = String(f.title || '').trim(), mins = Math.max(10, Math.min(180, +f.mins || 30)); if (!title || !f.date) { H.toast('Add a title and date.'); return; }
  if (f.id) { const s = D.sessions.find(x => x.id === f.id); if (s) Object.assign(s, { title, subject: f.subject || '', mins, date: f.date, edited: true }); } else D.sessions.push({ id: K.uid('s'), date: f.date, title, subject: f.subject || '', topic: '', type: 'Revision', mins, done: false, source: 'user', edited: false });
  D.sessions.sort((a, b) => a.date.localeCompare(b.date)); H.save(); H.closeModal(); H.rerender();
};
function countdownTab() {
  const D = st.D, t = H.today(), ex = D.exams.map(e => ({ ...e, d: K.daysBetween(t, e.date) })).sort((a, b) => a.d - b.d), att = attention();
  if (!ex.length) return `<article class="card reveal">${H.empty('⏳', 'Add an exam in Setup to see a countdown and a revision plan.')}<button class="btn small primary" data-act="hubTab" data-tab="setup">Go to Setup</button></article>`;
  return `<div class="grid two">${ex.map(e => `<article class="card reveal"><h3>${esc(e.name)}</h3><div class="stile"><b>${e.d < 0 ? '—' : e.d}</b>${e.d < 0 ? 'already passed' : e.d === 0 ? 'today!' : 'days to go'} · ${H.fmt(e.date)}</div>
  ${e.d >= 0 ? `<h4 style="margin-top:10px">Revision phases</h4><ol>${K.examPhases(e.d).map(p => `<li><b>${p.label}</b><br><small class="muted">${p.note}</small></li>`).join('')}</ol><p class="muted">${att.length ? `Topics needing attention: ${att.map(x => esc(x.topic)).join(', ')}.` : 'No topics flagged yet. Practise some questions or mark difficult topics.'}</p>${e.d >= 2 ? `<button class="btn small primary" data-act="examPlan" data-id="${esc(e.id)}">Add revision sessions to my planner</button>` : ''}` : ''}</article>`).join('')}</div>`;
}
A.examPlan = el => {
  const D = st.D, e = D.exams.find(x => x.id === el.dataset.id); if (!e) return;
  D.sessions = D.sessions.filter(s => !(s.examId === e.id && s.source === 'ai' && !s.edited && !s.done)).concat(K.revisionSessions(e, attention(), H.today())); D.sessions.sort((a, b) => a.date.localeCompare(b.date));
  H.save(); H.toast('Revision sessions added to your planner ✔'); st.ui.hubTab = 'planner'; H.rerender();
};
function weakTab() {
  const D = st.D, ts = K.topicStats(D.attempts), flagged = D.hub.difficult.filter(d => !ts.some(t => t.subject === d.subject && t.topic === d.topic));
  const stat = { needs: badge('red', 'Needs revision'), strong: badge('green', 'Doing well'), ok: badge('blue', 'Okay'), insufficient: badge('grey', 'Not enough data yet') };
  return `<article class="card reveal"><h3>Topic analysis</h3><div class="banner">A topic is only called “needs revision” after at least ${K.MIN_SAMPLE} answered questions. A few questions can’t show what you are capable of.</div>
  ${ts.length || flagged.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Topic</th><th>Answered</th><th>Accuracy</th><th>Status</th><th></th></tr></thead><tbody>${ts.map(t => `<tr><td><b>${esc(t.topic)}</b><br><small class="muted">${esc(t.subject)}</small></td><td>${t.n}${t.n < K.MIN_SAMPLE ? ` / ${K.MIN_SAMPLE}` : ''}</td><td>${t.acc == null ? '—' : t.acc + '%'}</td><td>${stat[t.status]}</td><td><button class="btn small ghost-dark" data-act="practiceTopic" data-s="${esc(t.subject)}" data-t="${esc(t.topic)}">Practise</button>${t.status === 'needs' ? ` <button class="btn small primary" data-act="planTopic" data-s="${esc(t.subject)}" data-t="${esc(t.topic)}">3-day plan</button>` : ''}</td></tr>`).join('')}${flagged.map(t => `<tr><td><b>${esc(t.topic)}</b><br><small class="muted">${esc(t.subject)}</small></td><td>0</td><td>—</td><td>${badge('yellow', 'Student-reported difficult')}</td><td><button class="btn small ghost-dark" data-act="practiceTopic" data-s="${esc(t.subject)}" data-t="${esc(t.topic)}">Practise</button></td></tr>`).join('')}</tbody></table></div>` : H.empty('🔍', 'No practice records yet. Practise some questions to see topic analysis.')}</article>`;
}
const topicsFor = subject => K.syllabus(st.D.profile.level, subject);
A.practiceTopic = el => { const l = topicsFor(el.dataset.s); Object.assign(st.ui.qSel, { subject: el.dataset.s, topic: l.includes(el.dataset.t) ? el.dataset.t : (l.find(t => K.genTopic(el.dataset.s, t) === el.dataset.t) || l[0] || '') }); st.ui.q = null; H.go('questions'); };
A.planTopic = el => {
  const D = st.D, t = H.today(); for (let i = 1; i <= 3; i++) D.sessions.push({ id: K.uid('s'), date: K.addDays(t, i), title: `Practice questions: ${el.dataset.t}`, subject: el.dataset.s, topic: el.dataset.t, type: 'Practice questions', mins: 25, done: false, source: 'ai', edited: true });
  D.sessions.sort((a, b) => a.date.localeCompare(b.date)); H.save(); H.toast('Added 3 short practice sessions ✔'); st.ui.hubTab = 'planner'; H.rerender();
};
A.hubTab = el => { st.ui.hubTab = el.dataset.tab; H.rerender(); };
V.hub = {
  html() {
    const lv = st.D.profile.level, tab = st.ui.hubTab, cls = school() ? ' · ' + K.LEVELS[lv] : '';
    return `<h2 class="view-title">📚 Learning Center <small>${esc(cls.replace(' · ', ''))}${cls ? ' · ' : ''}Syllabus, study plans, practice, quizzes and feedback</small></h2><div class="row-actions" style="margin-bottom:10px"><button class="btn small ghost-dark" data-act="go" data-view="plans">🗓️ Daily Plans</button><button class="btn small ghost-dark" data-act="go" data-view="questions">🧠 Question Tracker & Quizzes</button></div>${H.tabs([['setup', '⚙️ Board & subjects'], ['planner', '🗓️ Study planner'], ['countdown', '⏳ Exam countdown'], ['weak', '🔍 Weak topics'], ['feedback', '📝 Marks & feedback']], tab, 'hubTab')}${{ setup: setupTab, planner: plannerTab, countdown: countdownTab, weak: weakTab, feedback: () => H.marksCard() }[tab]()}`;
  }
};

/* ---------- Question Tracker ---------- */
const rec = id => st.D.attempts.find(a => a.id === id);
function record(q, result, picked) { const r = { id: K.uid('q'), date: H.today(), subject: q.subject, topic: q.topic, diff: q.diff, q: q.q, opts: q.opts || [], a: q.a, exp: q.exp || '', picked, result, saved: false, source: q.source || 'generated', retryOf: q.retryOf || null }; st.D.attempts.push(r); H.markActivity(); H.save(); return r.id; }
A.qSel = el => { const s = st.ui.qSel; s[el.name] = el.value; if (el.name === 'subject') s.topic = topicsFor(s.subject)[0] || ''; H.rerender(); };
A.qGen = () => { const s = st.ui.qSel, q = K.generateQuestion(s.subject, s.topic, s.diff); if (!q) { H.toast('Practice questions are not generated for this topic yet. Use “Log a question I practised elsewhere” to track it.'); return; } st.ui.q = { ...q, picked: null, rec: null }; H.rerender(); };
A.qAnswer = el => { const q = st.ui.q; if (!q || q.picked !== null) return; q.picked = +el.dataset.i; const ok = q.picked === q.a; q.rec = record(q, ok ? 'correct' : 'incorrect', q.picked); H.rerender(); if (ok) H.celebrateCorrect(); };
A.qSkip = () => { const q = st.ui.q; if (!q || q.picked !== null) return; q.picked = -1; q.rec = record(q, 'skipped', -1); H.rerender(); };
A.qMark = el => { const r = rec(st.ui.q.rec); if (r) { r.result = el.dataset.r; H.save(); H.rerender(); } };
A.qStar = el => { const r = rec(el.dataset.id); if (r) { r.saved = !r.saved; H.save(); H.rerender(); } };
A.qDel = el => { st.D.attempts = st.D.attempts.filter(a => a.id !== el.dataset.id); H.save(); H.rerender(); };
A.qRetry = el => { const a = rec(el.dataset.id); if (!a || !a.opts.length) return; st.ui.q = { subject: a.subject, topic: a.topic, diff: a.diff, q: a.q, opts: a.opts, a: a.a, exp: a.exp, label: 'Retrying a question you attempted before.', picked: null, rec: null, retryOf: a.id }; H.rerender(); window.scrollTo(0, 0); };
A.qReview = el => { const a = rec(el.dataset.id); if (!a) return; H.openModal(`<h3 id="modalTitle">Review</h3><p class="quiz-q">${esc(a.q)}</p>${a.opts.length ? `<ul>${a.opts.map((o, i) => `<li>${i === a.a ? '✅ ' : i === a.picked ? '❌ ' : ''}${esc(o)}</li>`).join('')}</ul><div class="fb"><b>Explanation:</b> ${esc(a.exp)}</div>` : '<p class="muted">This question was logged by you, so there is no stored explanation.</p>'}`); };
A.qLog = form => { const f = H.formObj(form), t = String(f.topic || '').trim(); if (!t) { H.toast('Enter a topic.'); return; } record({ subject: f.subject, topic: t, diff: f.diff, q: String(f.note || '').trim() || 'Question logged by me', source: 'logged' }, f.result, null); H.toast('Logged ✔'); H.rerender(); };
A.qFilter = el => { st.ui.qFilter = el.dataset.tab; H.rerender(); };
function qCard() {
  const q = st.ui.q; if (!q) return H.empty('🎲', 'Choose a subject, topic and difficulty, then press “Generate question”.');
  const done = q.picked !== null, r = done ? rec(q.rec) : null, res = r ? r.result : '';
  return `<div class="qcard"><div class="q-meta">${esc(q.subject)} · ${esc(q.topic)} · ${esc(q.diff)}</div><p class="quiz-q">${esc(q.q)}</p><div class="quiz-opts">${q.opts.map((o, i) => `<button class="quiz-opt ${done ? (i === q.a ? 'right' : i === q.picked ? 'wrong' : '') : ''}" data-act="qAnswer" data-i="${i}" ${done ? 'disabled' : ''}>${esc(o)}</button>`).join('')}</div>
  ${done ? `<div class="fb"><b>${res === 'correct' ? '✅ Correct!' : res === 'incorrect' ? '💡 Not quite.' : 'Skipped (not attempted).'}</b> ${esc(q.exp)}<div class="row-actions" style="margin-top:8px"><button class="btn small ghost-dark" data-act="qStar" data-id="${esc(q.rec)}">${r && r.saved ? '⭐ Saved as difficult' : '☆ Save as difficult'}</button><span class="muted">Mark as:</span><button class="btn small ghost-dark" data-act="qMark" data-r="correct">Correct</button><button class="btn small ghost-dark" data-act="qMark" data-r="incorrect">Incorrect</button><button class="btn small ghost-dark" data-act="qMark" data-r="skipped">Not attempted</button><button class="btn small primary" data-act="qGen">Next question ➤</button></div></div>` : `<div class="row-actions"><button class="btn small ghost-dark" data-act="qSkip">Skip (not attempted)</button></div>`}<small class="muted">${esc(q.label || '')}</small></div>`;
}
V.questions = {
  html() {
    const D = st.D, o = K.overallStats(D.attempts), ts = K.topicStats(D.attempts), by = K.byDay(D.attempts), sel = st.ui.qSel, f = st.ui.qFilter, tl = topicsFor(sel.subject); if (tl.length && !tl.includes(sel.topic)) sel.topic = tl[0]; const canGen = !!K.genTopic(sel.subject, sel.topic);
    const hist = D.attempts.slice().reverse().filter(a => f === 'all' || (f === 'incorrect' && a.result === 'incorrect') || (f === 'saved' && a.saved) || (f === 'skipped' && a.result === 'skipped')).slice(0, 40);
    return `<h2 class="view-title">🧠 Question Tracker <small>Practise, record, retry, and watch your accuracy grow</small></h2>
    <article class="card reveal"><h3>Practise</h3><div class="two-col"><label class="field">Subject<select name="subject" data-chg="qSel">${optHTML(Object.keys(K.SUBJECT_TOPICS), sel.subject)}</select></label><label class="field">Topic (${esc(K.LEVELS[D.profile.level] || 'your class')})<select name="topic" data-chg="qSel">${optHTML(tl.map(t => [t, t + (K.genTopic(sel.subject, t) ? '' : ' (log only)')]), sel.topic)}</select></label></div><small class="muted">${tl.length} topics from the typical CBSE/NCERT ${esc(K.LEVELS[D.profile.level] || '')} ${esc(sel.subject)} syllabus. Check your own board’s syllabus. ${canGen ? '✔ Practice questions are available for this topic.' : 'Practice questions are not generated for this topic yet. You can still log your practice below.'}</small><div class="row-actions"><label class="field" style="margin:0">Difficulty<select name="diff" data-chg="qSel">${optHTML(['easy', 'medium', 'hard'], sel.diff)}</select></label><button class="btn primary" data-act="qGen" ${canGen ? '' : 'disabled'}>Generate question</button></div><hr style="margin:12px 0;border:0;border-top:1px solid var(--line)">${qCard()}</article>
    <div class="statrow reveal"><div class="stile"><b>${o.attempted}</b>Answered</div><div class="stile"><b>${o.correct}</b>Correct</div><div class="stile"><b>${o.accuracy == null ? '—' : o.accuracy + '%'}</b>Accuracy</div><div class="stile"><b>${o.skipped}</b>Not attempted</div><div class="stile"><b>${D.attempts.filter(a => a.saved).length}</b>Saved ⭐</div></div>
    <div class="grid two"><article class="card reveal"><h3>Accuracy over time</h3>${by.length >= 2 ? '<canvas id="chA" height="200" aria-label="Accuracy by day"></canvas>' : H.empty('📈', 'Practise on at least 2 days to see a trend.')}</article><article class="card reveal"><h3>Answered vs correct per day</h3>${by.length ? '<canvas id="chB" height="200" aria-label="Answered and correct per day"></canvas>' : H.empty('📊', 'No answers yet.')}</article></div>
    <article class="card reveal"><h3>Accuracy by topic</h3>${ts.some(t => t.n) ? '<canvas id="chC" height="220" aria-label="Accuracy by topic"></canvas>' : H.empty('📚', 'Nothing to compare yet.')}<small class="muted">Topics marked <i>not enough data</i> have fewer than ${K.MIN_SAMPLE} answers, so treat them as early signals. Topics needing revision: ${ts.filter(t => t.status === 'needs').map(t => esc(t.topic)).join(', ') || 'none flagged yet'}.</small></article>
    <div class="grid two"><article class="card reveal"><h3>My history</h3>${H.tabs([['all', 'All'], ['incorrect', 'Incorrect'], ['saved', '⭐ Saved'], ['skipped', 'Not attempted']], f, 'qFilter')}${hist.length ? hist.map(a => `<div class="hist"><span><b>${esc(a.topic)}</b> · ${esc(a.diff)} · ${H.fmt(a.date)}<br><small class="muted">${esc(a.q.slice(0, 70))}${a.q.length > 70 ? '…' : ''}</small></span><span>${badge(a.result === 'correct' ? 'green' : a.result === 'incorrect' ? 'red' : 'grey', a.result === 'skipped' ? 'not attempted' : a.result)} <button class="icon-mini" data-act="qStar" data-id="${esc(a.id)}" aria-label="Save as difficult">${a.saved ? '⭐' : '☆'}</button> <button class="icon-mini" data-act="qReview" data-id="${esc(a.id)}" aria-label="Review">👁</button>${a.opts.length ? ` <button class="icon-mini" data-act="qRetry" data-id="${esc(a.id)}" aria-label="Retry">↻</button>` : ''} <button class="icon-mini" data-act="qDel" data-id="${esc(a.id)}" aria-label="Delete">🗑</button></span></div>`).join('') : H.empty('🗂️', 'Nothing here yet.')}</article>
    <article class="card reveal"><h3>Log a question I practised elsewhere</h3><form data-form="qLog"><label class="field">Subject<select name="subject">${optHTML(Object.keys(K.SUBJECT_TOPICS), sel.subject)}</select></label><label class="field">Topic<input type="text" name="topic" list="qTopics" maxlength="60" required><datalist id="qTopics">${tl.map(t => `<option value="${esc(t)}">`).join('')}</datalist></label><label class="field">Note (optional)<input type="text" name="note" maxlength="100"></label><div class="two-col"><label class="field">Difficulty<select name="diff">${optHTML(['easy', 'medium', 'hard'], 'medium')}</select></label><label class="field">Result<select name="result">${optHTML([['correct', 'Correct'], ['incorrect', 'Incorrect'], ['skipped', 'Not attempted']], 'correct')}</select></label></div><button class="btn primary">Save to my records</button></form><small class="muted">Statistics are computed only from records you create here.</small></article></div>`;
  },
  after() {
    const D = st.D, by = K.byDay(D.attempts), ts = K.topicStats(D.attempts).filter(t => t.n);
    if ($('#chA')) H.lineChart($('#chA'), by.map(x => H.fmt(x.date)), [{ data: by.map(x => x.acc), color: '#12467a', fill: true }], { min: 0, max: 100 });
    if ($('#chB')) { const mx = Math.max(5, ...by.map(x => x.n)); H.barChart($('#chB'), by.map(x => H.fmt(x.date)), [{ name: 'Answered', data: by.map(x => x.n), color: '#1a8fb5' }, { name: 'Correct', data: by.map(x => x.c), color: '#0fa3a3' }], { max: mx, values: true }); }
    if ($('#chC')) H.barChart($('#chC'), ts.map(t => t.topic), [{ name: 'Accuracy %', data: ts.map(t => t.acc), color: '#e0645a' }], { max: 100, values: true });
  }
};
})();
