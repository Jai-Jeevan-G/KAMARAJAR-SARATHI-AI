/* ===== Kamarajar Sarathi AI · views-people.js : parent / guardian and educator dashboards, account & links ===== */
(() => {
'use strict';
const S = window.SAHAYA, K = S.K, H = S.H, A = S.A, V = S.V, st = S.st;
const { esc, chip, badge, optHTML } = H;
const locked = t => `<p class="muted">🔒 ${t}</p>`;
function linked() {
  return st.accounts.filter(a => a.role === 'student').map(a => ({ acc: a, d: H.loadData(a.id) })).filter(x => x.d && x.d.links.some(l => l.uid === st.me.id)).map(x => ({ ...x, link: x.d.links.find(l => l.uid === st.me.id) }));
}
const approved = role => linked().filter(x => x.link.status === 'approved' && K.canView(st.me, x.d, role));
function pick(list, key) { if (!list.some(x => x.acc.id === st.ui[key])) st.ui[key] = list[0] ? list[0].acc.id : ''; return list.find(x => x.acc.id === st.ui[key]); }
A.pickStudent = el => { st.ui[el.dataset.key] = el.value; H.rerender(); };
const picker = (list, key) => (list.length > 1 ? `<label class="field">Student<select data-chg="pickStudent" data-key="${key}">${optHTML(list.map(x => [x.acc.id, x.acc.name]), st.ui[key])}</select></label>` : '');
const linkForm = () => `<form class="inline-form" data-form="linkReq"><input name="code" placeholder="Student link code, e.g. ANAN-7Q2K" maxlength="14" aria-label="Student link code"><button class="btn small primary">Send request</button></form><small class="muted">The student must approve it and choose what you can see.</small>`;
A.linkReq = form => { const code = String(H.formObj(form).code || '').trim().toUpperCase(); if (!/^[A-Z0-9-]{6,14}$/.test(code)) { H.toast('Link codes look like ANAN-7Q2K.'); return; } H.toast(H.requestLink(st.me, code)); H.rerender(); };

/* ---------- parent ---------- */
V.pdash = {
  html() {
    const all = linked(), ok = approved('parent'), cur = pick(ok, 'parentSel'), t = H.today(), pend = all.filter(x => x.link.status === 'pending');
    let body = '';
    if (cur) {
      const v = K.parentView(cur.d, t), a = v.academic;
      body = `<div class="grid two"><article class="card reveal"><h3>Learning progress for ${esc(v.name)}</h3>${a ? `<div class="statrow"><div class="stile"><b>${a.attempted}</b>Questions answered</div><div class="stile"><b>${a.accuracy == null ? '—' : a.accuracy + '%'}</b>Accuracy</div><div class="stile"><b>${a.planDone}/${a.planTotal}</b>Study sessions</div><div class="stile"><b>${a.goalsDone}/${a.goalsTotal}</b>Goals done</div></div><p class="muted">Based on ${esc(v.name)}’s own records. Small numbers are early signals, not a verdict.</p>` : locked(`${esc(v.name)} has not shared learning progress with you. You can kindly ask whether they would like to.`)}</article>
      <article class="card reveal"><h3>Upcoming exams</h3>${v.exams ? (v.exams.length ? `<ul class="deadline-list">${v.exams.map(e => `<li><span>${esc(e.name)}</span><span class="when">${H.dayChip(e.days)}</span></li>`).join('')}</ul><small class="muted">Dates entered by the student.</small>` : '<p class="muted">No upcoming exams listed.</p>') : locked('Not shared.')}</article>
      <article class="card reveal"><h3>Scholarship deadlines</h3>${v.deadlines ? (v.deadlines.length ? `<ul class="deadline-list">${v.deadlines.map(e => `<li><span>${esc(e.name)}</span><span class="when">${H.dayChip(e.days)}</span></li>`).join('')}</ul><small class="muted">Sample demo dates. Verify on official portals.</small>` : '<p class="muted">No saved scholarships.</p>') : locked('Not shared.')}</article>
      <article class="card reveal"><h3>Official marks & educator feedback</h3>${v.marks ? (v.marks.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Subject</th><th>Assessment</th><th>Marks</th></tr></thead><tbody>${v.marks.map(m => `<tr><td>${esc(m.subject)}</td><td>${esc(m.exam)}</td><td><b>${esc(m.score)}/${esc(m.max)}</b></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No marks entered yet.</p>') + (v.feedback && v.feedback.length ? v.feedback.map(f => `<div class="hist"><span><b>${esc(f.from)}</b>: ${esc(f.text)}</span></div>`).join('') : '') : locked('Not shared.')}</article>
      <article class="card reveal"><h3>How you can support</h3>${a ? `<ul><li>${a.weak.length ? `Ask gently how you can help with ${esc(a.weak.join(', '))}. A teacher session might also help.` : 'Celebrate steady effort. Ask what is going well.'}</li><li>Offer a quiet study space and regular breaks.</li><li>Praise effort and progress, not only results.</li></ul>` : '<ul><li>Ask how studies are going and how you can help.</li><li>Praise effort, not only results.</li></ul>'}${a && a.goalsDone ? `<p>🎉 ${esc(v.name)} has completed ${a.goalsDone} goal${a.goalsDone > 1 ? 's' : ''}. A kind word would mean a lot.</p>` : ''}<div class="safe-note">Private conversations, health records, documents and income are never shown here.</div></article></div>
      <article class="card reveal"><h3>Send encouragement</h3><form class="inline-form" data-form="pMsg"><input type="hidden" name="sid" value="${esc(cur.acc.id)}"><input name="m" placeholder="e.g. Proud of your effort!" maxlength="140" aria-label="Message"><button class="btn small primary">Send 💌</button></form></article>`;
    }
    return `<h2 class="view-title">👪 Parent / Guardian Dashboard <small>You see only what your child has chosen to share</small></h2>${picker(ok, 'parentSel')}
    ${pend.length ? `<div class="banner">⏳ Waiting for approval: ${pend.map(x => esc(x.acc.name)).join(', ')}.</div>` : ''}${cur ? body : `<article class="card">${H.empty('🔗', 'No linked student yet. Ask your child for their link code and send a request.')}${linkForm()}</article>`}`;
  }
};
A.pMsg = form => { const f = H.formObj(form), m = String(f.m || '').trim(), x = approved('parent').find(y => y.acc.id === f.sid); if (!m || !x) return; H.pushInbox(x.acc.id, st.me.name, m); H.toast('Sent 💌'); H.rerender(); };

const auditList = pred => { const e = H.auditFor(pred).slice(0, 12); return e.length ? e.map(x => `<div class="hist"><span>${esc(x.action)}</span><small class="muted">${new Date(x.ts).toLocaleString()}</small></div>`).join('') : '<p class="muted">Nothing recorded yet.</p>'; };
/* people an educator may message: students who approved them (and enabled sharing), plus those students' approved parents and wardens */
function contacts() {
  const out = new Map();
  approved('educator').filter(x => x.d.share && x.d.share.edu).forEach(x => {
    out.set(x.acc.id, { id: x.acc.id, name: x.acc.name, kind: 'Student', sid: x.acc.id });
    (x.d.links || []).filter(l => l.status === 'approved' && (l.role === 'parent' || l.role === 'warden') && st.accounts.some(a => a.id === l.uid && a.role === l.role)).forEach(l => { if (!out.has(l.uid)) out.set(l.uid, { id: l.uid, name: l.name, kind: l.role === 'parent' ? 'Parent' : 'Hostel warden', about: x.acc.name, sid: x.acc.id }); });
  });
  return [...out.values()];
}
A.eSend = form => {
  const f = H.formObj(form), m = String(f.m || '').trim(), c = contacts().find(x => x.id === f.to);
  if (!c) { H.toast('You can only message people linked to a student who approved you.'); return; } if (!m) return;
  H.pushInbox(c.id, `${st.me.name} (Educator)`, m.slice(0, 300)); H.audit(`Sent a message to a ${c.kind.toLowerCase()}`, c.sid); H.toast(`Message sent to ${c.name} ✔`); H.rerender();
};
/* ---------- educator ---------- */
function withStudent(sid, fn) {
  const d = H.loadData(sid); if (!d || !K.canView(st.me, d, 'educator') || !d.share.edu) { H.toast('This student has not given you access.'); return false; }
  fn(d); H.saveData(sid, d); return true;
}
V.edash = {
  html() {
    const ok = approved('educator'), t = H.today(), views = ok.map(x => ({ x, v: K.educatorView(x.d) })), sharing = views.filter(y => !y.v.restricted), accs = sharing.map(y => y.v.academic.accuracy).filter(a => a != null);
    const cur = pick(ok, 'eduSel'), cv = cur ? K.educatorView(cur.d) : null, pend = linked().filter(x => x.link.status === 'pending');
    return `<h2 class="view-title">🧑‍🏫 Educator Dashboard <small>Only students who approved you and chose to share. No health or private information.</small></h2>
    <div class="statrow reveal"><div class="stile"><b>${ok.length}</b>Linked students</div><div class="stile"><b>${sharing.length}</b>Sharing progress</div><div class="stile"><b>${accs.length ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length) + '%' : '—'}</b>Avg accuracy (sharing students)</div></div>${pend.length ? `<div class="banner">⏳ Waiting for approval: ${pend.map(x => esc(x.acc.name)).join(', ')}.</div>` : ''}
    <article class="card reveal"><h3>My students</h3>${ok.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Student</th><th>Answered</th><th>Accuracy</th><th>Sessions</th><th>Needs support?</th><th></th></tr></thead><tbody>${views.map(({ x, v }) => v.restricted ? `<tr><td><b>${esc(x.acc.name)}</b></td><td colspan="4">🔒 Progress not shared by the student</td><td></td></tr>` : `<tr><td><b>${esc(v.name)}</b></td><td>${v.academic.attempted}</td><td>${v.academic.accuracy == null ? '—' : v.academic.accuracy + '%'}</td><td>${v.academic.planDone}/${v.academic.planTotal}</td><td>${v.academic.topics.some(tp => tp.status === 'needs') ? chip('yellow', 'Offer extra practice') : chip('green', 'On track')}</td><td><button class="btn small ghost-dark" data-act="eSel" data-id="${esc(x.acc.id)}">Open</button></td></tr>`).join('')}</tbody></table></div><small class="muted">Suggestions are supportive prompts, never judgments.</small>` : H.empty('🔗', 'No linked students yet.') + linkForm()}</article>
    ${cur && cv && !cv.restricted ? studentPanel(cur, cv) : ''}
    <article class="card reveal"><h3>💬 Send a message</h3>${(() => { const c = contacts(); return c.length ? `<form data-form="eSend"><label class="field">To<select name="to">${optHTML(c.map(x => [x.id, `${x.name} · ${x.kind}${x.about ? ' of ' + x.about : ''}`]), c[0].id)}</select></label><label class="field">Message<textarea name="m" maxlength="300" required></textarea></label><button class="btn primary">Send</button><small class="muted">You can message students who approved you, their linked parents and their hostel wardens.</small></form>` : '<p class="muted">Link with a student first. Then their parents and hostel wardens appear here.</p>'; })()}</article>
    <div class="grid two"><article class="card reveal"><h3>📢 Announcement to my students</h3><form class="inline-form" data-form="eAnn"><input name="m" maxlength="200" placeholder="e.g. Unit test on Friday" required aria-label="Announcement"><button class="btn small primary">Send</button></form><small class="muted">Goes only to students who approved you.</small></article>
    <article class="card reveal"><h3>🧾 My audit trail</h3>${auditList(x => x.actor === st.me.id)}</article></div>`;
  }
};
A.eSel = el => { st.ui.eduSel = el.dataset.id; H.rerender(); setTimeout(() => { const p = H.$('#spanel'); if (p) p.scrollIntoView({ behavior: 'smooth' }); }, 50); };
function studentPanel(x, v) {
  const a = v.academic, topics = [...new Set(Object.values(K.SUBJECT_TOPICS).flat())];
  return `<article class="card reveal" id="spanel"><h3>${esc(v.name)} · progress</h3>${a.topics.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Topic</th><th>Answered</th><th>Accuracy</th><th>Status</th></tr></thead><tbody>${a.topics.map(tp => `<tr><td>${esc(tp.topic)}<br><small class="muted">${esc(tp.subject)}</small></td><td>${tp.n}</td><td>${tp.acc == null ? '—' : tp.acc + '%'}</td><td>${tp.status === 'needs' ? badge('red', 'Needs revision') : tp.status === 'strong' ? badge('green', 'Doing well') : tp.status === 'ok' ? badge('blue', 'Okay') : badge('grey', 'Not enough data')}</td></tr>`).join('')}</tbody></table></div><small class="muted">A topic is flagged only after ${K.MIN_SAMPLE}+ answered questions.</small>` : '<p class="muted">No practice records yet.</p>'}</article>
  <div class="grid two"><article class="card reveal"><h3>Assign practice</h3><form data-form="eAssign"><input type="hidden" name="sid" value="${esc(x.acc.id)}"><label class="field">Subject<select name="subject">${optHTML(Object.keys(K.SUBJECT_TOPICS), '')}</select></label><label class="field">Topic<input type="text" name="topic" list="eTopics" maxlength="40" required><datalist id="eTopics">${topics.map(t => `<option value="${esc(t)}">`).join('')}</datalist></label><label class="field">Number of questions<input type="number" name="n" min="1" max="50" value="10"></label><button class="btn primary">Assign</button></form>${v.assigned.length ? `<h4>Assigned so far</h4>${v.assigned.map(t => `<div class="hist"><span>${esc(t.title)}</span>${badge(t.done ? 'green' : 'yellow', t.done ? 'Done' : 'Open')}</div>`).join('')}` : ''}</article>
  <article class="card reveal"><h3>Message & recognise</h3><form data-form="eMsg"><input type="hidden" name="sid" value="${esc(x.acc.id)}"><label class="field">Type<select name="kind">${optHTML([['Feedback', 'Feedback'], ['Supportive message', 'Supportive message'], ['Achievement', 'Acknowledge an achievement']], 'Feedback')}</select></label><label class="field">Message<textarea name="m" maxlength="240" required></textarea></label><button class="btn primary">Send</button></form>${v.goalsDone.length ? `<h4>Completed goals</h4>${v.goalsDone.map((g, i) => `<div class="hist"><span>🎯 ${esc(g)}</span><button class="btn small ghost-dark" data-act="eRecognise" data-sid="${esc(x.acc.id)}" data-i="${i}">Recognise 🎉</button></div>`).join('')}` : ''}</article></div>
  <article class="card reveal"><h3>Official marks (only you can enter them)</h3>${v.marks.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Subject</th><th>Assessment</th><th>Marks</th><th></th></tr></thead><tbody>${v.marks.map(m => `<tr><td>${esc(m.subject)}</td><td>${esc(m.exam)}</td><td><b>${esc(m.score)}/${esc(m.max)}</b></td><td><button class="btn small ghost-dark" data-act="eMarkDel" data-sid="${esc(x.acc.id)}" data-id="${esc(m.id)}">Remove</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No marks yet.</p>'}<form class="inline-form" data-form="eMark"><input type="hidden" name="sid" value="${esc(x.acc.id)}"><input name="subject" placeholder="Subject" maxlength="40" required aria-label="Subject"><input name="exam" placeholder="Assessment" maxlength="60" required aria-label="Assessment"><input name="score" type="number" step="0.5" min="0" placeholder="Marks" required aria-label="Marks" style="width:90px"><input name="max" type="number" min="1" max="1000" placeholder="Out of" required aria-label="Maximum" style="width:90px"><button class="btn small primary">Save marks</button></form><small class="muted">Students and parents can read these but cannot change them. Every entry is logged.</small></article>`;
}
A.eAssign = form => { const f = H.formObj(form), n = Math.max(1, Math.min(50, +f.n || 10)), topic = String(f.topic || '').trim(); if (!topic) return; const ok = withStudent(f.sid, d => { d.tasks.push({ id: K.uid('t'), key: '', title: `Practise ${n} questions: ${topic}`, desc: `Assigned by ${st.me.name}`, due: K.addDays(H.today(), 3), priority: 'medium', done: false, source: 'educator', area: 'Learning', edited: false, accepted: true }); d.inbox.unshift({ id: K.uid('m'), ts: Date.now(), from: st.me.name, text: `New practice: ${n} questions on ${topic}.`, read: false }); H.audit(`Assigned practice: ${topic}`, f.sid); }); if (ok) { H.toast('Practice assigned ✔'); H.rerender(); } };
A.eMsg = form => { const f = H.formObj(form), m = String(f.m || '').trim(); if (!m) return; const ok = withStudent(f.sid, d => { if (f.kind === 'Feedback') d.feedback.unshift({ id: K.uid('fb'), from: st.me.name, text: m, ts: Date.now() }); H.audit(`Sent ${String(f.kind || 'message').toLowerCase()}`, f.sid); d.inbox.unshift({ id: K.uid('m'), ts: Date.now(), from: st.me.name, text: `${f.kind === 'Achievement' ? '🏅 ' : ''}${m}`, read: false }); }); if (ok) { H.toast('Sent ✔'); H.rerender(); } };
A.eMark = form => {
  const f = H.formObj(form), e = K.validateMark(f); if (Object.keys(e).length) { H.toast(Object.values(e)[0]); return; }
  const ok = withStudent(f.sid, d => { d.marks.push({ id: K.uid('mk'), subject: String(f.subject).trim().slice(0, 40), exam: String(f.exam).trim().slice(0, 60), score: +f.score, max: +f.max, by: st.me.name, ts: Date.now() }); H.audit(`Entered marks: ${f.subject}, ${f.exam}`, f.sid); d.inbox.unshift({ id: K.uid('m'), ts: Date.now(), from: st.me.name, text: `New official marks entered for ${f.subject}.`, read: false }); });
  if (ok) { H.toast('Marks saved ✔'); H.rerender(); }
};
A.eMarkDel = el => { if (withStudent(el.dataset.sid, d => { d.marks = d.marks.filter(m => m.id !== el.dataset.id); H.audit('Removed a marks entry', el.dataset.sid); })) { H.toast('Entry removed'); H.rerender(); } };
A.eAnn = form => {
  const m = String(H.formObj(form).m || '').trim(); if (!m) return; let n = 0;
  approved('educator').forEach(x => { if (withStudent(x.acc.id, d => { d.inbox.unshift({ id: K.uid('m'), ts: Date.now(), from: st.me.name, text: '📢 ' + m, read: false }); H.audit('Announcement', x.acc.id); })) n++; });
  H.toast(`Announcement sent to ${n} student${n === 1 ? '' : 's'}`); H.rerender();
};
A.eRecognise = el => { const x = approved('educator').find(y => y.acc.id === el.dataset.sid); if (!x) return; const g = K.educatorView(x.d).goalsDone[+el.dataset.i]; if (withStudent(el.dataset.sid, d => d.inbox.unshift({ id: K.uid('m'), ts: Date.now(), from: st.me.name, text: `🎉 Great work completing your goal: ${g}`, read: false }))) H.toast('Recognition sent 🎉'); };

/* ---------- hostel warden: room, bed and token details for student candidates ---------- */
const hostelOf = d => d.hostel || { room: '', bed: '', token: '' };
const hasHostel = h => !!(h.room || h.bed || h.token);
V.wdash = {
  html() {
    const ok = approved('warden'), pend = linked().filter(x => x.link.status === 'pending' && x.link.role === 'warden'), q = String(st.ui.wQ || '').trim().toLowerCase();
    const rows = ok.map(x => ({ x, h: hostelOf(H.loadData(x.acc.id)) })), shown = q ? rows.filter(({ x, h }) => [x.acc.name, h.room, h.bed, h.token].some(v => String(v || '').toLowerCase().includes(q))) : rows;
    const err = st.ui.wErr || {};
    return `<h2 class="view-title">🏨 Hostel Warden Dashboard <small>Hostel details for students who approved you</small></h2>
    <div class="statrow reveal"><div class="stile"><b>${ok.length}</b>Assigned students</div><div class="stile"><b>${rows.filter(r => hasHostel(r.h)).length}</b>With hostel details saved</div></div>${pend.length ? `<div class="banner">⏳ Waiting for approval: ${pend.map(x => esc(x.acc.name)).join(', ')}.</div>` : ''}
    ${ok.length ? `<div class="grid two"><article class="card reveal"><h3>Add or update details</h3><form data-form="wSave"><label class="field">Student<select name="sid">${optHTML(ok.map(x => [x.acc.id, x.acc.name]), st.ui.wSid || ok[0].acc.id)}</select></label><label class="field">Hostel room number<input name="room" maxlength="12" required>${err.room ? `<small class="err" role="alert">${esc(err.room)}</small>` : ''}</label><label class="field">Bed number<input name="bed" maxlength="12" required>${err.bed ? `<small class="err" role="alert">${esc(err.bed)}</small>` : ''}</label><label class="field">Token number<input name="token" maxlength="12" required>${err.token ? `<small class="err" role="alert">${esc(err.token)}</small>` : ''}</label>${err.form ? `<div class="flag" role="alert">${esc(err.form)}</div>` : ''}<button class="btn primary">Save details</button></form></article>
    <article class="card reveal"><h3>Check a student’s information</h3><form class="inline-form" data-form="wFind"><input name="q" value="${esc(st.ui.wQ || '')}" placeholder="Name, room, bed or token" maxlength="40" aria-label="Search students"><button class="btn small primary">Search</button>${q ? '<button class="btn small ghost-dark" type="button" data-act="wClear">Clear</button>' : ''}</form>
    ${shown.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Student</th><th>Room</th><th>Bed</th><th>Token</th></tr></thead><tbody>${shown.map(({ x, h }) => `<tr><td><b>${esc(x.acc.name)}</b></td><td>${esc(h.room || '—')}</td><td>${esc(h.bed || '—')}</td><td>${esc(h.token || '—')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No student matches.</p>'}<small class="muted">Details are read from each student’s saved record.</small></article></div>` : `<article class="card">${H.empty('🔗', 'No assigned students yet. Ask a student for their link code.')}${linkForm()}</article>`}
    <article class="card reveal"><h3>🧾 My audit trail</h3>${auditList(x => x.actor === st.me.id)}</article>`;
  }
};
A.wFind = form => { st.ui.wQ = String(H.formObj(form).q || '').slice(0, 40); H.rerender(); };
A.wClear = () => { st.ui.wQ = ''; H.rerender(); };
A.wSave = form => {
  const f = H.formObj(form), x = approved('warden').find(y => y.acc.id === f.sid); st.ui.wSid = f.sid;
  if (!x) { st.ui.wErr = { form: 'This student has not approved you.' }; H.rerender(); return; }
  const h = { room: String(f.room || '').trim(), bed: String(f.bed || '').trim(), token: String(f.token || '').trim() }, e = K.validateHostel(h);
  if (!Object.keys(e).length) st.accounts.filter(a => a.role === 'student' && a.id !== f.sid).forEach(a => { const o = hostelOf(H.loadData(a.id) || {}); if (hasHostel(o) && K.sameHostel({ room: o.room, bed: o.bed, token: '' }, { room: h.room, bed: h.bed, token: '' })) e.form = 'That room and bed are already assigned to another student.'; else if (hasHostel(o) && String(o.token).toLowerCase() === h.token.toLowerCase()) e.form = 'That token number is already assigned to another student.'; });
  st.ui.wErr = e; if (Object.keys(e).length) { H.rerender(); return; }
  const d = H.loadData(f.sid); d.hostel = { ...h, by: st.me.name, ts: Date.now() }; H.saveData(f.sid, d); H.audit('Saved hostel details', f.sid); st.ui.wErr = {}; H.toast('Hostel details saved ✔'); H.rerender();
};

/* ---------- account & links (parent, educator and warden) ---------- */
const account = () => `<h2 class="view-title">⚙️ Account & Links</h2><div class="grid two"><article class="card reveal"><h3>My account</h3><div class="prow"><span>Name</span><b>${esc(st.me.name)}</b></div><div class="prow"><span>Email</span><b>${esc(st.me.email)}</b></div><div class="prow"><span>${st.me.role === 'parent' ? 'Relationship' : 'Institution'}</span><b>${esc(st.me.relation || st.me.institution || '—')}</b></div><div class="safe-note">🔐 Demo note: accounts live only in this browser. A real deployment checks every login and permission on a secure server.</div></article>
<article class="card reveal"><h3>Linked students</h3>${linked().length ? linked().map(x => `<div class="doc-row"><div><b>${esc(x.acc.name)}</b></div>${badge(x.link.status === 'approved' ? 'green' : 'yellow', x.link.status === 'approved' ? 'Approved' : 'Waiting for student')}</div>`).join('') : '<p class="muted">None yet.</p>'}<h4>Link another student</h4>${linkForm()}</article></div>`;
V.psettings = { html: account };
V.esettings = { html: account };
V.wsettings = { html: account };
})();
