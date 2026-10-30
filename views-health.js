/* ===== Kamarajar Sarathi AI · views-health.js : Health Center: medical documents, cycle tracker (conditional), water/break buddy ===== */
(() => {
'use strict';
const S = window.SAHAYA, K = S.K, H = S.H, A = S.A, V = S.V, st = S.st;
const { esc, chip, badge, optHTML } = H, $ = H.$;
const num = v => (v === '' || v == null || isNaN(+v) ? '' : +v);
const MOODS = ['😞', '😕', '😐', '🙂', '😄'];

/* ---------- reminders (Water Buddy / Break Buddy) ---------- */
let timers = [], lastRem = 0, focusT = null, focusLeft = 0, focusMode = '';
const MSG = { water: '💧 Gentle nudge: a sip of water if you feel like it.', brk: '🧘 You have been at it a while. A short break might help.', stretch: '🤸 Stretch your neck and shoulders for a minute?' };
function clearTimers() { timers.forEach(clearInterval); timers = []; if (focusT) { clearInterval(focusT); focusT = null; } }
function fire(msg) {
  const D = st.D; if (!D || !st.me || st.me.role !== 'student') return; const R = D.reminders, now = Date.now();
  if (!R.enabled || (R.pausedUntil && now < R.pausedUntil) || document.hidden || now - lastRem < 60000) return;
  if (D.share.quiet) { const h = new Date().getHours(); if (h >= 21 || h < 7) return; }
  lastRem = now; H.toast(msg);
}
function schedule() { clearTimers(); const D = st.D; if (!D || st.me.role !== 'student' || !D.reminders.enabled) return; ['water', 'brk', 'stretch'].forEach(k => { if (D.reminders[k].on) timers.push(setInterval(() => fire(MSG[k]), Math.max(30, D.reminders[k].mins) * 60000)); }); }
S.afterEnter = schedule; S.beforeLogout = clearTimers;
A.remSet = el => { const path = el.dataset.k.split('.'), R = st.D.reminders; let o = R; path.slice(0, -1).forEach(p => { o = o[p]; }); o[path[path.length - 1]] = el.type === 'checkbox' ? el.checked : +el.value; H.save(); schedule(); H.rerender(); };
A.remPause = () => { const R = st.D.reminders; R.pausedUntil = R.pausedUntil > Date.now() ? 0 : Date.now() + 3600000; H.save(); H.toast(R.pausedUntil ? 'Reminders paused for 1 hour.' : 'Reminders resumed.'); H.rerender(); };
A.timerStart = el => {
  if (focusT) { clearInterval(focusT); focusT = null; } focusMode = el.dataset.m; focusLeft = (focusMode === 'focus' ? 25 : 5) * 60;
  const paint = () => { const t = $('#timerV'); if (t) t.textContent = String(Math.floor(focusLeft / 60)).padStart(2, '0') + ':' + String(focusLeft % 60).padStart(2, '0'); };
  paint(); focusT = setInterval(() => { focusLeft--; paint(); if (focusLeft <= 0) { clearInterval(focusT); focusT = null; H.toast(focusMode === 'focus' ? '⏰ Nice focus! Time for a short break. Stretch and sip some water.' : (st.D.reminders.back.on ? '📘 Break over. Ready to return to study when you are.' : 'Break over.')); } }, 1000);
};
A.timerStop = () => { if (focusT) { clearInterval(focusT); focusT = null; } const t = $('#timerV'); if (t) t.textContent = '00:00'; };
function buddiesTab() {
  const R = st.D.reminders, paused = R.pausedUntil > Date.now(), tg = (k, v, l) => `<label class="toggle"><input type="checkbox" data-chg="remSet" data-k="${k}" ${v ? 'checked' : ''}><span></span> ${l}</label>`, sel = (k, v, list) => `<select data-chg="remSet" data-k="${k}" aria-label="Frequency">${optHTML(list.map(m => [m, `every ${m} min`]), v)}</select>`;
  return `<div class="grid two"><article class="card reveal"><h3>💧 Water Buddy & 🧘 Break Buddy</h3><p class="muted">Optional and off by default. Nudges are gentle, appear only while this page is open, respect quiet hours, and never assume how much water you need.</p>${tg('enabled', R.enabled, '<b>Turn reminders on</b>')}
  ${tg('water.on', R.water.on, 'Drink water') + sel('water.mins', R.water.mins, [60, 90, 120])}${tg('brk.on', R.brk.on, 'Study break') + sel('brk.mins', R.brk.mins, [45, 60, 90])}${tg('stretch.on', R.stretch.on, 'Stretch or move') + sel('stretch.mins', R.stretch.mins, [60, 90, 120])}${tg('back.on', R.back.on, 'Nudge me to return after a break')}
  <div class="row-actions" style="margin-top:10px"><button class="btn small ghost-dark" data-act="remPause" ${R.enabled ? '' : 'disabled'}>${paused ? 'Resume reminders' : 'Pause for 1 hour'}</button></div></article>
  <article class="card reveal"><h3>⏱️ Focus & break timer</h3><div class="stile"><b id="timerV">00:00</b>${focusT ? 'running' : 'ready'}</div><div class="row-actions" style="margin-top:10px"><button class="btn small primary" data-act="timerStart" data-m="focus">25-min focus</button><button class="btn small ghost-dark" data-act="timerStart" data-m="break">5-min break</button><button class="btn small ghost-dark" data-act="timerStop">Stop</button></div></article></div>`;
}


/* ---------- Health Center: medical documents only ---------- */
const MED_TYPES = ['Hospital bill', 'Bill receipt', 'Certificate', 'Letter'];
const MED_OK = ['application/pdf', 'image/png', 'image/jpeg'], MED_MAX = 600 * 1024, MED_TOTAL = 3 * 1024 * 1024;
const kb = n => (n < 1024 * 1024 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(1) + ' MB');
function docsTab() {
  const D = st.D, all = D.medFiles || [], f = st.ui.medF || 'all', list = all.filter(x => f === 'all' || x.type === f), used = all.reduce((a, x) => a + x.size, 0);
  return `<article class="card reveal"><h3>🏥 Medical documents</h3><div class="banner">Keep your <b>previous hospital bills, bill receipts, certificates and letters</b> here. Private to you. Files stay <b>only in this browser</b> (${kb(used)} of ${kb(MED_TOTAL)} used). PDF, PNG or JPG up to ${kb(MED_MAX)}.</div>
  <form class="inline-form" data-form="medUpload"><select name="type" aria-label="Document type">${optHTML(MED_TYPES, MED_TYPES[0])}</select><input type="file" name="file" accept=".pdf,.png,.jpg,.jpeg" required aria-label="Choose file"><button class="btn small primary">Upload</button></form>
  <div class="inline-form"><select data-chg="medFilter" aria-label="Filter by type">${optHTML([['all', 'All types'], ...MED_TYPES.map(t => [t, t])], f)}</select></div>
  ${list.length ? list.map(x => `<div class="doc-row"><div><b>${esc(x.name)}</b><small class="muted">${esc(x.type)} · ${kb(x.size)} · ${new Date(x.ts).toLocaleDateString()}</small></div><div><button class="btn small ghost-dark" data-act="medPreview" data-id="${x.id}">Preview</button> <button class="btn small ghost-dark" data-act="medDownload" data-id="${x.id}">Download</button> <button class="btn small ghost-dark" data-act="medDelete" data-id="${x.id}">Delete</button></div></div>`).join('') : H.empty('🏥', all.length ? 'No documents of this type.' : 'No documents yet. Upload a bill, receipt, certificate or letter.')}</article>`;
}
A.medFilter = el => { st.ui.medF = el.value; H.rerender(); };
A.medUpload = form => {
  const file = form.querySelector('[name=file]').files[0], type = form.querySelector('[name=type]').value, D = st.D; if (!file) return;
  if (!MED_TYPES.includes(type)) return H.toast('Choose a document type.');
  if (!MED_OK.includes(file.type)) return H.toast('Only PDF, PNG or JPG files are allowed.');
  if (file.size > MED_MAX) return H.toast('That file is too big. The limit is ' + kb(MED_MAX) + '.');
  if ((D.medFiles || []).reduce((a, x) => a + x.size, 0) + file.size > MED_TOTAL) return H.toast('Storage is full. Delete a file first.');
  const rd = new FileReader();
  rd.onload = () => { D.medFiles.push({ id: K.uid('m'), type, name: String(file.name).replace(/[<>"']/g, '').slice(0, 80), mime: file.type, size: file.size, ts: Date.now(), data: rd.result }); H.save(); H.toast('Uploaded ✔'); H.rerender(); };
  rd.onerror = () => H.toast('Could not read that file.'); rd.readAsDataURL(file);
};
A.medPreview = el => { const x = st.D.medFiles.find(y => y.id === el.dataset.id); if (!x) return; H.openModal(`<h3 id="modalTitle">${esc(x.name)}</h3>${x.mime === 'application/pdf' ? `<iframe title="Preview of ${esc(x.name)}" src="${x.data}" style="width:100%;height:60vh;border:0"></iframe>` : `<img alt="Preview of ${esc(x.name)}" src="${x.data}" style="max-width:100%;max-height:60vh">`}`); };
A.medDownload = el => { const x = st.D.medFiles.find(y => y.id === el.dataset.id); if (!x) return; const a = document.createElement('a'); a.href = x.data; a.download = x.name; document.body.appendChild(a); a.click(); a.remove(); };
A.medDelete = el => { const x = st.D.medFiles.find(y => y.id === el.dataset.id); if (!x) return; H.openModal(`<h3 id="modalTitle">Delete this document?</h3><p>“${esc(x.name)}” will be removed from this browser. This cannot be undone.</p><div class="row-actions"><button class="btn primary" data-act="medDeleteYes" data-id="${x.id}">Yes, delete</button> <button class="btn ghost-dark" data-act="closeModal">Cancel</button></div>`); };
A.medDeleteYes = el => { st.D.medFiles = st.D.medFiles.filter(y => y.id !== el.dataset.id); H.save(); H.closeModal(); H.toast('Document deleted'); H.rerender(); };

/* ---------- Menstrual Cycle Tracker: only for female students who have reached puberty ---------- */
function cycleTab() {
  const D = st.D, list = (D.cycle || []).slice().sort((a, b) => (a.start < b.start ? 1 : -1)), cs = K.cycleStats(D.cycle), err = st.ui.cycleErr || {};
  return `<div class="grid two"><article class="card reveal"><h3>🌸 Menstrual Cycle Tracker</h3><div class="banner">Private to you and never shared. Cycles vary a lot, especially in the first years. This tracker shows only what you record. It is not medical advice. If something worries you, talk to a doctor or a trusted adult.</div>
  <form data-form="cycleAdd"><label class="field">First day of period<input type="date" name="start" max="${H.today()}" required>${err.start ? `<small class="err" role="alert">${esc(err.start)}</small>` : ''}</label><label class="field">Last day (optional)<input type="date" name="end">${err.end ? `<small class="err" role="alert">${esc(err.end)}</small>` : ''}</label><label class="field">Note (optional)<input name="note" maxlength="100"></label><button class="btn primary">Save</button></form></article>
  <article class="card reveal"><h3>My cycle history</h3>${cs ? `<div class="statrow"><div class="stile"><b>${cs.avg}</b>Average cycle (days)</div><div class="stile"><b>${cs.lo}–${cs.hi}</b>Shortest to longest</div><div class="stile"><b>${cs.cycles}</b>Cycles recorded</div></div><p class="muted">A rough guide only: the next period may start between ${H.fmt(cs.nextFrom)} and ${H.fmt(cs.nextTo)}.</p>` : '<p class="muted">Record at least three period start dates to see averages. Until then nothing is estimated.</p>'}
  ${list.length ? list.map(x => `<div class="doc-row"><div><b>${H.fmt(x.start)}${x.end ? ' to ' + H.fmt(x.end) : ''}</b>${x.note ? `<small class="muted">${esc(x.note)}</small>` : ''}</div><button class="btn small ghost-dark" data-act="cycleDel" data-id="${x.id}">Delete</button></div>`).join('') : H.empty('🌸', 'Nothing recorded yet.')}</article></div>`;
}
A.cycleAdd = form => {
  if (!K.canUseCycleTracker(st.D.profile)) return;
  const f = H.formObj(form), e = K.validateCycleEntry(f, H.today()); st.ui.cycleErr = e;
  if (Object.keys(e).length) { H.rerender(); return; }
  if ((st.D.cycle || []).some(x => x.start === f.start)) { st.ui.cycleErr = { start: 'That date is already recorded.' }; H.rerender(); return; }
  st.D.cycle.push({ id: K.uid('c'), start: f.start, end: f.end || '', note: String(f.note || '').slice(0, 100) }); st.ui.cycleErr = {}; H.save(); H.toast('Saved ✔'); H.rerender();
};
A.cycleDel = el => { if (!K.canUseCycleTracker(st.D.profile)) return; st.D.cycle = st.D.cycle.filter(x => x.id !== el.dataset.id); H.save(); H.rerender(); };

V.health = {
  html() {
    const can = K.canUseCycleTracker(st.D.profile), tabs = [['docs', '🏥 Medical documents'], ...(can ? [['cycle', '🌸 Menstrual Cycle Tracker']] : []), ['buddies', '💧 Buddies']];
    let t = st.ui.healthTab; if (!tabs.some(x => x[0] === t)) t = st.ui.healthTab = 'docs';
    return `<h2 class="view-title">💚 Health Center <small>Your medical papers, kept private</small></h2>${H.tabs(tabs, t, 'healthTab')}${{ docs: docsTab, cycle: cycleTab, buddies: buddiesTab }[t]()}`;
  },
  after() { }
};
A.healthTab = el => { st.ui.healthTab = el.dataset.tab; H.rerender(); };
})();
