/* ===== Kamarajar Sarathi AI · app.js (infrastructure) =====
   Shared helpers, storage, charts, auth, demo seed data, router, events.
   Views live in views-*.js and register themselves on window.SAHAYA.V / .A.
   SECURITY NOTE: this is a front-end prototype. Accounts, hashes and data are stored in this
   browser only, so access checks here are NOT real server-side authorization. A real deployment
   must enforce every check on a server (see README notes in the hand-over message). */
(() => {
'use strict';
const K = window.SAHAYA_CORE;
const S = window.SAHAYA = { K, st: { me: null, D: null, accounts: [], cur: '', ui: { hubTab: 'setup', schTab: 'profile', healthTab: 'wellness', schFilter: 'all', taskView: 'daily', qFilter: 'all', qSel: { subject: 'Mathematics', topic: 'Probability', diff: 'medium' }, q: null, chat: [], hchat: [], showDismissed: false, schSel: '', parentSel: '', eduSel: '' } }, V: {}, A: {}, H: {} };
const st = S.st, ui = st.ui, H = S.H, A = S.A, V = S.V;
const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- dom & format helpers ---------- */
H.$ = (s, r = document) => r.querySelector(s);
H.$$ = (s, r = document) => [...r.querySelectorAll(s)];
const $ = H.$, $$ = H.$$;
H.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const esc = H.esc;
H.chip = (c, t) => `<span class="chip ${c}">${t}</span>`;
H.badge = (c, t) => `<span class="badge ${c}">${t}</span>`;
H.optHTML = (list, cur) => list.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(cur) ? 'selected' : ''}>${esc(l)}</option>`; }).join('');
H.first = n => String(n || '').trim().split(/\s+/)[0] || 'there';
H.today = () => K.todayISO();
H.fmt = iso => (iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');
H.dayChip = d => (d < 0 ? H.badge('grey', 'passed') : d === 0 ? H.badge('red', 'today') : d <= 7 ? H.badge('red', `${d} day${d > 1 ? 's' : ''}`) : H.badge('blue', `${d} days`));
H.PRI = { high: ['red', 'High'], medium: ['yellow', 'Medium'], low: ['blue', 'Low'] };
H.tabs = (list, cur, act) => `<div class="tabs" role="tablist">${list.map(([id, label]) => `<button role="tab" aria-selected="${id === cur}" class="tab ${id === cur ? 'on' : ''}" data-act="${act}" data-tab="${id}">${label}</button>`).join('')}</div>`;
H.formObj = form => { const o = {}; new FormData(form).forEach((v, k) => { o[k] = o[k] === undefined ? v : [].concat(o[k], v); }); return o; };
H.empty = (icon, text) => `<div class="empty"><span>${icon}</span>${text}</div>`;

/* ---------- storage ---------- */
const mem = {};
const store = (() => { try { const k = '__t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return localStorage; } catch (e) { return { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } }; } })();
const db = H.db = {
  get(k, d) { try { const v = store.getItem('sahaya_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { store.setItem('sahaya_' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { store.removeItem('sahaya_' + k); } catch (e) { /* ignore */ } }
};
H.loadData = id => { const raw = db.get('data_' + id, null); return raw ? K.mergeDefaults(raw, K.newStudentData((raw.profile || {}).name || 'Student', (raw.profile || {}).level || 'other', raw.baseDate || H.today())) : null; };
H.saveData = (id, d) => { if (!db.set('data_' + id, d)) H.toast('Could not save. Browser storage may be full or blocked.'); };
H.save = () => { if (st.me && st.me.role === 'student') H.saveData(st.me.id, st.D); };
H.accounts = () => st.accounts;
H.saveAccounts = () => db.set('accounts', st.accounts);

/* ---------- toast, confetti, modal ---------- */
let toastT;
H.toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3600); };
H.confetti = () => {
  if (reduceMotion) return; const box = $('#confetti'), cols = ['#12467a', '#0fa3a3', '#e0645a', '#f0a030', '#f2c14e', '#1a8fb5'];
  for (let i = 0; i < 46; i++) { const p = document.createElement('i'); p.style.left = Math.random() * 100 + '%'; p.style.background = cols[i % 6]; p.style.animationDelay = Math.random() * .5 + 's'; p.style.animationDuration = 1.8 + Math.random() * 1.2 + 's'; box.appendChild(p); }
  setTimeout(() => { box.innerHTML = ''; }, 3600);
};
/* ---------- short sounds (Web Audio, no files) ---------- */
let actx = null;
const audioCtx = () => { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; } catch (e) { return null; } };
document.addEventListener('pointerdown', audioCtx, { once: true });   // browsers only allow sound after a first tap or click
function tones(list, vol) { const c = audioCtx(); if (!c) return; try { const t0 = c.currentTime + 0.02; list.forEach(([f, at, len, type]) => { const o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0 + at); g.gain.exponentialRampToValueAtTime(vol, t0 + at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + len); o.connect(g); g.connect(c.destination); o.start(t0 + at); o.stop(t0 + at + len + 0.05); }); } catch (e) { /* sound is optional */ } }
H.cheerSound = () => tones([[523, 0, .16], [659, .11, .16], [784, .22, .16], [1047, .33, .38]], .18);   // rising C-E-G-C
H.notifySound = () => tones([[880, 0, .14], [1175, .15, .26]], .16);                                      // soft two-note chime
/* small firework burst where the answer is shown */
H.burst = () => {
  if (reduceMotion) return; const box = document.createElement('div'); box.className = 'burst'; box.setAttribute('aria-hidden', 'true'); const cols = ['#f0a030', '#e0645a', '#2ecc71', '#1a8fb5', '#f2c14e', '#12467a'];
  [[30, 38], [70, 32], [50, 55]].forEach(([x, y], k) => { for (let i = 0; i < 14; i++) { const p = document.createElement('i'), a = i / 14 * 6.283, d = 60 + Math.random() * 50; p.style.left = x + '%'; p.style.top = y + '%'; p.style.background = cols[(i + k) % 6]; p.style.setProperty('--dx', Math.cos(a) * d + 'px'); p.style.setProperty('--dy', Math.sin(a) * d + 'px'); p.style.animationDelay = k * .18 + 's'; box.appendChild(p); } });
  document.body.appendChild(box); setTimeout(() => box.remove(), 1600);
};
H.celebrateCorrect = () => { H.burst(); H.cheerSound(); };
let lastFocus = null;
H.openModal = html => { lastFocus = document.activeElement; $('#modalBody').innerHTML = html; $('#modal').hidden = false; (($('#modalBody input,#modalBody select,#modalBody textarea,#modalBody button')) || $('.close')).focus(); };
H.closeModal = () => { $('#modal').hidden = true; $('#modalBody').innerHTML = ''; if (lastFocus && lastFocus.focus) lastFocus.focus(); };

/* ---------- charts (small canvas helpers) ---------- */
let redrawers = [];
H.clearCharts = () => { redrawers = []; };
function setup(canvas) { const dpr = window.devicePixelRatio || 1, w = canvas.clientWidth || 300, h = +(canvas.getAttribute('height') || 200); canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.height = h + 'px'; const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); return { ctx, w, h }; }
function frame(ctx, w, h, pad, min, max, Y) {
  ctx.font = '12px Nunito, sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = '#51657a'; ctx.strokeStyle = '#dbe6ee'; ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) { const v = min + (max - min) * g / 4, y = Y(v); ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.fillText(Math.round(v), pad.l - 6, y + 4); }
}
H.lineChart = (canvas, labels, series, o = {}) => {
  if (!canvas) return; const run = () => {
    const { ctx, w, h } = setup(canvas), pad = { l: 34, r: 14, t: 26, b: 28 }, min = o.min ?? 0, max = o.max ?? 100;
    const X = i => pad.l + (labels.length === 1 ? (w - pad.l - pad.r) / 2 : i * (w - pad.l - pad.r) / (labels.length - 1)), Y = v => pad.t + (1 - (v - min) / (max - min)) * (h - pad.t - pad.b);
    const draw = p => {
      ctx.clearRect(0, 0, w, h); frame(ctx, w, h, pad, min, max, Y); ctx.textAlign = 'center'; ctx.fillStyle = '#51657a'; labels.forEach((l, i) => ctx.fillText(l, X(i), h - 8));
      if (!labels.length) { ctx.fillText('No data yet', w / 2, h / 2); return; }
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, pad.l + (w - pad.l) * p, h); ctx.clip();
      series.forEach((s, si) => {
        ctx.strokeStyle = s.color; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); s.data.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)))); ctx.stroke();
        if (s.fill) { ctx.lineTo(X(s.data.length - 1), Y(min)); ctx.lineTo(X(0), Y(min)); ctx.closePath(); const gr = ctx.createLinearGradient(0, pad.t, 0, h); gr.addColorStop(0, s.color + '55'); gr.addColorStop(1, s.color + '00'); ctx.fillStyle = gr; ctx.fill(); }
        s.data.forEach((v, i) => { ctx.fillStyle = '#fff'; ctx.strokeStyle = s.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X(i), Y(v), 5, 0, 7); ctx.fill(); ctx.stroke(); if (o.values && si === 0) { ctx.fillStyle = '#12263a'; ctx.textAlign = 'center'; ctx.fillText(v, X(i), Y(v) - 10); } });
      }); ctx.restore();
      if (o.legend) { ctx.textAlign = 'left'; let x = pad.l; o.legend.forEach(([n, c]) => { ctx.fillStyle = c; ctx.fillRect(x, 6, 12, 12); ctx.fillStyle = '#12263a'; ctx.fillText(n, x + 17, 17); x += 22 + ctx.measureText(n).width + 12; }); }
    };
    if (reduceMotion || canvas.dataset.drawn) { draw(1); return; } canvas.dataset.drawn = '1';
    const t0 = performance.now(), step = t => { const p = Math.min((t - t0) / 800, 1); draw(1 - Math.pow(1 - p, 3)); if (p < 1) requestAnimationFrame(step); }; requestAnimationFrame(step);
  }; run(); redrawers.push(run);
};
H.barChart = (canvas, labels, series, o = {}) => {
  if (!canvas) return; const run = () => {
    const { ctx, w, h } = setup(canvas), pad = { l: 34, r: 10, t: 24, b: 40 }, min = 0, max = o.max ?? 100, Y = v => pad.t + (1 - (v - min) / (max - min)) * (h - pad.t - pad.b);
    frame(ctx, w, h, pad, min, max, Y); if (!labels.length) { ctx.textAlign = 'center'; ctx.fillText('No data yet', w / 2, h / 2); return; }
    const gw = (w - pad.l - pad.r) / labels.length, bw = Math.min(34, gw * .7 / series.length);
    labels.forEach((l, i) => {
      series.forEach((s, si) => { const x = pad.l + i * gw + (gw - bw * series.length) / 2 + si * bw, y = Y(s.data[i] || 0); ctx.fillStyle = s.color; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, bw - 2, Y(0) - y, 5); else ctx.rect(x, y, bw - 2, Y(0) - y); ctx.fill(); if (o.values) { ctx.fillStyle = '#12263a'; ctx.textAlign = 'center'; ctx.fillText(s.data[i] || 0, x + bw / 2, y - 5); } });
      ctx.fillStyle = '#51657a'; ctx.textAlign = 'center'; const t = String(l); ctx.fillText(t.length > 11 ? t.slice(0, 10) + '…' : t, pad.l + i * gw + gw / 2, h - 22);
    });
    if (series.length > 1) { ctx.textAlign = 'left'; let x = pad.l; series.forEach(s => { ctx.fillStyle = s.color; ctx.fillRect(x, h - 14, 10, 10); ctx.fillStyle = '#12263a'; ctx.fillText(s.name, x + 14, h - 5); x += 30 + ctx.measureText(s.name).width; }); }
  }; run(); redrawers.push(run);
};
window.addEventListener('resize', (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => redrawers.forEach(f => f()), 200); }; })());
H.ring = (label, pct, color, basis) => { const has = pct != null; return `<div class="ringbox"><div class="ring" data-pct="${has ? pct : 0}"><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="bg" cx="18" cy="18" r="15.9"/><circle class="fg" cx="18" cy="18" r="15.9" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100" style="stroke:${color}"/></svg><b>${has ? `<span class="count">0</span>%` : '—'}</b></div><div class="ring-label">${label}</div><small class="muted">${esc(basis)}</small></div>`; };
H.animateRings = () => $$('.ring').forEach(r => {
  const pct = +r.dataset.pct, fg = $('.fg', r), c = $('.count', r);
  requestAnimationFrame(() => setTimeout(() => { fg.style.strokeDashoffset = 100 - pct; }, 60));
  if (c) { if (reduceMotion) { c.textContent = pct; return; } const t0 = performance.now(), f = t => { const p = Math.min((t - t0) / 1100, 1); c.textContent = Math.round(pct * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }
});

/* ---------- shared student actions ---------- */
H.markActivity = () => { const t = H.today(); if (!st.D.activity.includes(t)) { st.D.activity.push(t); st.D.activity = st.D.activity.slice(-90); } };
H.pushInbox = (uid, from, text) => {
  const m = { id: K.uid('m'), ts: Date.now(), from, text, read: false }, acc = st.accounts.find(a => a.id === uid); if (!acc) return;
  if (acc.role === 'student') { const d = uid === (st.me && st.me.id) ? st.D : H.loadData(uid); d.inbox.unshift(m); d.inbox = d.inbox.slice(0, 50); if (d !== st.D) H.saveData(uid, d); else H.save(); }
  else { const l = db.get('inbox_' + uid, []); l.unshift(m); db.set('inbox_' + uid, l.slice(0, 50)); }
};
H.audit = (action, sid) => { const l = db.get('audit', []); l.unshift({ ts: Date.now(), actor: st.me.id, actorName: st.me.name, role: st.me.role, action, sid: sid || '' }); db.set('audit', l.slice(0, 300)); };
H.auditFor = pred => db.get('audit', []).filter(pred);
H.notifyEdu = text => { const D = st.D; if (D.share.edu && D.share.notifyEdu) D.links.filter(l => l.role === 'educator' && l.status === 'approved').forEach(l => H.pushInbox(l.uid, D.profile.name, text)); };
H.celebrate = (msg, edu) => { H.confetti(); H.toast(msg); if (edu) H.notifyEdu(edu); };
H.initTasks = () => { const D = st.D; if (!D.tasksInit) { D.tasks = K.mergeTasks(D.tasks, K.tasksFromRecs(K.buildRecs(D, H.today()), H.today())).tasks; D.tasksInit = true; H.save(); } };
H.refreshAI = () => { const D = st.D; if (!D.tasksInit) return; D.tasks = K.mergeTasks(D.tasks, K.tasksFromRecs(K.buildRecs(D, H.today()), H.today())).tasks; };
H.reassess = reason => { const D = st.D, n = K.agentNextAction(D, H.today()); D.agentLog.unshift({ ts: Date.now(), text: `${reason}. Next: ${n.text}` }); D.agentLog = D.agentLog.slice(0, 30); H.refreshAI(); H.save(); };
H.ensureChallenges = () => { const D = st.D, t = H.today(); if (D.challenges.date !== t) { D.challenges = K.buildChallenges(t, D.challenges); H.save(); } };

/* ---------- screens, router, nav ---------- */
const screens = ['welcome', 'authView', 'app'];
function showScreen(id) { screens.forEach(s => { $('#' + s).hidden = s !== id; }); const b = $('.demo-banner'); if (b) b.hidden = id === 'app'; }   // demo notice is hidden once logged in
const SCHOOL = ['c9', 'c10', 'c11', 'c12', 'c12done'];
H.levelAllows = () => true;   // every student account can open every student page, including Examinations
function navItems() {
  if (st.me.role === 'parent') return [['pdash', '🏠', 'Dashboard'], ['psettings', '⚙️', 'Account & Links']];
  if (st.me.role === 'educator') return [['edash', '🏠', 'Class Dashboard'], ['esettings', '⚙️', 'Account & Links']];
  if (st.me.role === 'warden') return [['wdash', '🏠', 'Hostel Dashboard'], ['wsettings', '⚙️', 'Account & Links']];
  return [['dashboard', '🏠', 'Home'], ['guardian', '🤖', 'AI Guardian'], ['hub', '📚', 'Learning Center'], ['health', '💚', 'Health'], ['scholarship', '🎓', 'Scholarship Guardian'], ['exams', '🚀', 'Examinations'], ['documents', '📄', 'Certificates and Documents']];
}
const QUICK = [['plans', '🗓️', 'Daily Plans'], ['questions', '🧠', 'Question Tracker'], ['passport', '🪪', 'Opportunity Passport'], ['about', '🙂', 'About Me'], ['settings', '⚙️', 'Settings']];
function buildNav() {
  $('#nav').innerHTML = navItems().map(([id, ic, lb]) => id === '--' ? `<div class="nav-group">${lb}</div>` : `<button class="nav-btn ${st.cur === id ? 'active' : ''}" data-act="go" data-view="${id}"><span>${ic}</span> ${lb}</button>`).join('');
  const r = { student: ['🎒', 'Student'], parent: ['👪', 'Parent / Guardian'], educator: ['🧑‍🏫', 'Educator'], warden: ['🏨', 'Hostel Warden'] }[st.me.role];
  $('#quick').innerHTML = st.me.role === 'student' ? QUICK.map(([id, ic, lb]) => `<button class="icon-btn ${st.cur === id ? 'on' : ''}" data-act="go" data-view="${id}" title="${lb}" aria-label="${lb}">${ic}</button>`).join('') : '';
  $('#who').innerHTML = `<span class="rolechip">${r[0]} ${r[1]}</span> <b>${esc(st.me.name)}</b>${st.me.demo ? ' <small class="muted">(demo)</small>' : ''}`;
  $('.side-card').hidden = st.me.role !== 'student';
}
H.go = view => { if (location.hash === '#/' + view) route(); else location.hash = '#/' + view; };
H.rerender = () => { const y = window.scrollY; renderView(st.cur, true); window.scrollTo(0, y); };
function renderView(view, keepScroll) {
  const v = V[view]; if (!v) return; st.cur = view; H.clearCharts(); $('#notifPanel').hidden = true; $('#sidebar').classList.remove('open');
  $('#content').innerHTML = `<section class="view active">${v.html()}</section>`;
  $$('#content .reveal').forEach((r, i) => r.style.setProperty('--d', Math.min(i, 10) * 0.06 + 's'));
  buildNav(); updateStreak(); updateBell(); if (v.after) v.after(); if (!keepScroll) { window.scrollTo(0, 0); $('#content').focus({ preventScroll: true }); }
}
function updateStreak() { if (st.me.role === 'student') $('#streakNum').textContent = K.streak(st.D.activity, H.today()); }
function route() {
  if (!st.me) { showScreen(location.hash.startsWith('#/auth') ? 'authView' : 'welcome'); return; }
  let view = location.hash.replace(/^#\/?/, '') || K.HOME[st.me.role];
  if (!K.canAccess(st.me.role, view) || (st.me.role === 'student' && !H.levelAllows(view))) { if (view) H.toast('That page is not available for your account.'); view = K.HOME[st.me.role]; history.replaceState(null, '', '#/' + view); }
  showScreen('app'); renderView(view);
}

/* ---------- notifications ---------- */
function inboxOf() { return st.me.role === 'student' ? st.D.inbox : db.get('inbox_' + st.me.id, []); }
function alertsOf() {
  if (st.me.role !== 'student') return []; const D = st.D, t = H.today(), a = [];
  Object.keys(D.saved).forEach(id => { const s = K.scheme(id), d = K.daysBetween(t, K.schemeDeadline(s, D)); if (d >= 0 && d <= 7 && !['applied', 'outcome'].includes(D.saved[id].stage)) a.push({ text: `${s.name} closes in ${d} day${d === 1 ? '' : 's'} (sample date)`, go: 'scholarship' }); });
  D.exams.forEach(e => { const d = K.daysBetween(t, e.date); if (d >= 0 && d <= 7) a.push({ text: `${e.name} in ${d} day${d === 1 ? '' : 's'}`, go: 'hub' }); });
  return a;
}
/* New-notification handling: the bell blinks while anything is unread; the chime plays once per notification (remembered per account). */
function newKeys() { const keys = inboxOf().filter(m => !m.read).map(m => 'm:' + m.id).concat(alertsOf().map(a => 'a:' + a.text)); return keys; }
function updateBell(allowSound) {
  if (!st.me) return; const keys = newKeys(), n = keys.length, d = $('#bellDot'), b = $('#bellBtn'); d.textContent = n; d.hidden = !n; b.classList.toggle('blink', n > 0);
  const heardKey = 'heard_' + st.me.id, heard = db.get(heardKey, []), fresh = keys.filter(k => !heard.includes(k));
  if (fresh.length) { db.set(heardKey, heard.concat(fresh).slice(-200)); if (allowSound !== false) H.notifySound(); }
}
H.updateBell = updateBell;
/* pick up messages that arrive while the page is open (from another tab or account on this browser) */
function pollInbox() {
  if (!st.me) return;
  if (st.me.role === 'student' && st.D) { const d = H.loadData(st.me.id); if (d) { const have = new Set(st.D.inbox.map(m => m.id)), add = d.inbox.filter(m => !have.has(m.id)); if (add.length) { st.D.inbox = add.concat(st.D.inbox).slice(0, 50); } } }
  updateBell();
}
setInterval(pollInbox, 4000); window.addEventListener('storage', pollInbox);
A.bell = () => {
  const p = $('#notifPanel'); p.hidden = !p.hidden; if (p.hidden) return;
  const inbox = inboxOf(), al = alertsOf();
  $('#notifList').innerHTML = (al.map(a => `<li><span>⏰ ${esc(a.text)}</span><button class="mini" data-act="go" data-view="${a.go}">Open</button></li>`).join('') + inbox.slice(0, 10).map(m => `<li class="${m.read ? '' : 'unread'}"><span>💌 <b>${esc(m.from)}</b>: ${esc(m.text)}</span></li>`).join('')) || '<li>You are all caught up. 🎉</li>';
  inbox.forEach(m => { m.read = true; }); if (st.me.role === 'student') H.save(); else db.set('inbox_' + st.me.id, inbox); updateBell(false);
};

/* ---------- auth ---------- */
const ROLE_INFO = { student: ['🎒', 'Student', 'rc-student'], parent: ['👪', 'Parent / Guardian', 'rc-parent'], educator: ['🧑‍🏫', 'Educator', 'rc-edu'], warden: ['🏨', 'Hostel Warden', 'rc-warden'] };
const fl = (id, label, inner, err, hint) => `<label class="field" for="${id}">${label}${inner}${hint ? `<small class="muted">${hint}</small>` : ''}${err ? `<small class="err" role="alert">${esc(err)}</small>` : ''}</label>`;
const inp = (id, type, v, extra = '') => `<input id="${id}" name="${id}" type="${type}" value="${esc(v || '')}" ${extra}>`;
A.showAuth = (el, ev, rv) => {
  const role = (el && el.dataset.role) || rv.role, mode = (el && el.dataset.mode) || rv.mode, err = (rv && rv.err) || {}, v = (rv && rv.v) || {}, [ic, name, cls] = ROLE_INFO[role];
  let f = '';
  if (mode === 'login') f = fl('email', 'Email', inp('email', 'email', v.email, 'autocomplete="username" required'), err.email) + fl('password', 'Password', inp('password', 'password', '', 'autocomplete="current-password" required'), err.password);
  else {
    f = fl('name', 'Your name', inp('name', 'text', v.name, 'autocomplete="name" maxlength="60" required'), err.name) + fl('email', 'Email', inp('email', 'email', v.email, 'autocomplete="username" required'), err.email);
    if (role === 'student') f += fl('level', 'Education level', `<select id="level" name="level"><option value="">Choose…</option>${H.optHTML(Object.entries(K.LEVELS), v.level)}</select>`, err.level, 'Used to show the right pages and scholarships.') + fl('gender', 'Gender (optional)', `<select id="gender" name="gender"><option value="">Prefer not to say</option>${H.optHTML([['female', 'Female'], ['male', 'Male']], v.gender)}</select>`, err.gender);
    if (role === 'parent') f += fl('relation', 'Relationship to the student', inp('relation', 'text', v.relation, 'placeholder="e.g. mother, guardian" maxlength="40"'), err.relation) + fl('linkCode', 'Student link code (optional now)', inp('linkCode', 'text', v.linkCode, 'placeholder="ANAN-7Q2K" maxlength="14"'), err.linkCode, 'Your child finds this in About Me. They must approve your request.');
    if (role === 'educator' || role === 'warden') f += fl('institution', role === 'warden' ? 'Hostel or institution' : 'School or institution', inp('institution', 'text', v.institution, 'maxlength="80"'), err.institution) + fl('linkCode', 'Student link code (optional now)', inp('linkCode', 'text', v.linkCode, 'placeholder="ANAN-7Q2K" maxlength="14"'), err.linkCode, 'Students must approve you and choose what you can see.');
    f += fl('password', 'Password', inp('password', 'password', '', 'autocomplete="new-password" required'), err.password, 'At least 8 characters with a letter and a number.') + fl('password2', 'Confirm password', inp('password2', 'password', '', 'autocomplete="new-password" required'), err.password2);
    f += `<label class="toggle"><input type="checkbox" name="consent" ${v.consent ? 'checked' : ''}><span></span> I understand Kamarajar Sarathi stores what I enter on this device (demo) and that I choose what to share. ${role === 'student' ? 'If I am under 18, a parent or guardian knows I am using it.' : ''}</label>${err.consent ? `<small class="err" role="alert">${esc(err.consent)}</small>` : ''}`;
  }
  $('#authCard').className = 'auth-card ' + cls;
  $('#authCard').innerHTML = `<button class="link" data-act="backWelcome">← Back</button><div class="rc-ico">${ic}</div><h2>${name} ${mode === 'login' ? 'log in' : 'registration'}</h2>
  <form data-form="${mode}" data-role="${role}" novalidate>${f}${err.form ? `<div class="flag" role="alert">${esc(err.form)}</div>` : ''}<button class="btn primary wide" type="submit">${mode === 'login' ? 'Log in' : 'Create my account'}</button></form>
  ${mode === 'login' ? `<p class="muted"><button class="link" data-act="showReset" data-role="${role}">Forgot password?</button></p>` : ''}
  <p class="muted">${mode === 'login' ? `New here? <button class="link" data-act="showAuth" data-role="${role}" data-mode="register">Register</button>` : `Already registered? <button class="link" data-act="showAuth" data-role="${role}" data-mode="login">Log in</button>`}</p>`;
  showScreen('authView'); const first = $('#authCard input,#authCard select'); if (first) first.focus();
};
A.showReset = (el, ev, rv) => {
  const role = (el && el.dataset.role) || rv.role, [ic, name, cls] = ROLE_INFO[role], err = (rv && rv.err) || {}, v = (rv && rv.v) || {};
  $('#authCard').className = 'auth-card ' + cls;
  $('#authCard').innerHTML = `<button class="link" data-act="showAuth" data-role="${role}" data-mode="login">← Back to log in</button><div class="rc-ico">${ic}</div><h2>Reset password</h2>
  <div class="banner">Demo only: this resets a password on this device. A real system emails a one-time link and never lets anyone reset an account without proving they own the email.</div>
  <form data-form="reset" data-role="${role}" novalidate>${fl('email', 'Email', inp('email', 'email', v.email, 'required'), err.email)}${fl('password', 'New password', inp('password', 'password', '', 'autocomplete="new-password" required'), err.password, 'At least 8 characters with a letter and a number.')}${err.form ? `<div class="flag" role="alert">${esc(err.form)}</div>` : ''}<button class="btn primary wide">Reset password</button></form>`;
};
A.reset = async (form) => {
  const f = H.formObj(form), role = form.dataset.role, email = String(f.email || '').trim().toLowerCase(), acc = st.accounts.find(a => a.email === email && a.role === role), err = {};
  if (!K.validateEmail(email)) err.email = 'Enter a valid email address.'; const pe = K.validatePassword(f.password); if (pe) err.password = pe;
  if (acc && acc.demo) err.form = 'Demo accounts cannot be reset.';
  if (Object.keys(err).length) return A.showReset(null, null, { role, v: f, err });
  if (acc) { acc.salt = K.randomSalt(); acc.hash = await K.hashPassword(f.password, acc.salt); H.saveAccounts(); const fx = fails(); delete fx[email]; db.set('fails', fx); }
  A.showAuth(null, null, { role, mode: 'login', v: { email }, err: { form: 'If that email is registered for this role, the password has been updated. Log in with it.' } });
};
A.backWelcome = () => { history.replaceState(null, '', location.pathname); showScreen('welcome'); };
const fails = () => db.get('fails', {});
async function doLogin(role, f) {
  const email = String(f.email || '').trim().toLowerCase(), fx = fails(), rec = fx[email];
  if (rec) { const left = Math.ceil((rec.t + K.lockoutSeconds(rec.n) * 1000 - Date.now()) / 1000); if (left > 0) return A.showAuth(null, null, { role, mode: 'login', v: f, err: { form: `Too many attempts. Please wait ${left} seconds.` } }); }
  const acc = st.accounts.find(a => a.email === email && a.role === role);
  const ok = acc && (await K.hashPassword(String(f.password || ''), acc.salt)) === acc.hash;
  if (!ok) { fx[email] = { n: (rec ? rec.n : 0) + 1, t: Date.now() }; db.set('fails', fx); return A.showAuth(null, null, { role, mode: 'login', v: { email }, err: { form: 'Email or password is not correct for this role.' } }); }
  delete fx[email]; db.set('fails', fx); enter(acc);
}
async function doRegister(role, f) {
  f.consent = !!f.consent; f.linkCode = String(f.linkCode || '').trim().toUpperCase();
  const err = K.validateRegistration(role, f), email = String(f.email || '').trim().toLowerCase();
  if (!err.email && st.accounts.some(a => a.email === email)) err.email = 'That email is already registered. Try logging in.';
  if (Object.keys(err).length) return A.showAuth(null, null, { role, mode: 'register', v: { ...f, password: '', password2: '' }, err });
  const salt = K.randomSalt(), acc = { id: K.uid('u'), role, name: String(f.name).trim(), email, salt, hash: await K.hashPassword(f.password, salt), createdAt: H.today(), relation: f.relation || '', institution: f.institution || '', approved: true };
  st.accounts.push(acc); H.saveAccounts();
  if (role === 'student') { const nd = K.newStudentData(acc.name, f.level, H.today()); if (f.gender === 'female' || f.gender === 'male') nd.profile.gender = f.gender; H.saveData(acc.id, nd); }
  let msg = `Welcome, ${H.first(acc.name)}! 🎉`;
  if (role !== 'student' && f.linkCode) msg += ' ' + requestLink(acc, f.linkCode);
  enter(acc, msg);
}
function requestLink(acc, code) {
  const sa = st.accounts.filter(a => a.role === 'student').find(a => { const d = H.loadData(a.id); return d && d.linkCode === String(code).trim().toUpperCase(); });
  if (!sa) return 'That link code was not found. Check it with the student.';
  const d = H.loadData(sa.id); if (d.links.some(l => l.uid === acc.id)) return 'You already have a request or link with this student.';
  d.links.push({ uid: acc.id, role: acc.role, name: acc.name, status: 'pending', ts: Date.now() }); d.inbox.unshift({ id: K.uid('m'), ts: Date.now(), from: 'Kamarajar Sarathi', text: `${acc.name} (${acc.role}) asked to link with you. Review it in Settings.`, read: false }); H.saveData(sa.id, d);
  return 'Link request sent. The student must approve it.';
}
H.requestLink = requestLink;
function enter(acc, msg) {
  st.me = acc; st.D = acc.role === 'student' ? H.loadData(acc.id) : null; db.set('session', { uid: acc.id, exp: Date.now() + 8 * 36e5 });
  if (st.D) { H.ensureChallenges(); } buildNav(); showScreen('app'); if (S.afterEnter) S.afterEnter();
  const target = '#/' + K.HOME[acc.role]; if (location.hash === target) route(); else location.hash = target; if (msg) H.toast(msg);
}
A.demoLogin = el => { const id = { student: 'demo-student', parent: 'demo-parent', educator: 'demo-teacher', warden: 'demo-warden' }[el.dataset.role], acc = st.accounts.find(a => a.id === id); if (acc) enter(acc, 'Signed in to a synthetic demo account.'); };
A.logout = () => { if (S.beforeLogout) S.beforeLogout(); db.del('session'); st.me = null; st.D = null; st.cur = ''; ui.q = null; ui.chat = []; ui.hchat = []; history.replaceState(null, '', location.pathname); H.closeModal(); showScreen('welcome'); H.toast('You have been logged out.'); };
A.go = el => H.go(el.dataset.view);
A.toggleMenu = () => $('#sidebar').classList.toggle('open');
A.closeModal = () => H.closeModal();

/* ---------- demo seed (synthetic) ---------- */
function demoStudent(name, o, t) {
  const d = K.newStudentData(name, o.level, t); Object.assign(d.profile, o.profile); Object.assign(d.hub, o.hub); d.tasksInit = false;
  d.exams = (o.exams || []).map(([n, off], i) => ({ id: 'e' + i, name: n, date: K.addDays(t, off) }));
  const rng = K.lcg(o.seed);
  o.practice.forEach(([subject, topic, diff, bits]) => bits.forEach((bit, i) => { const q = K.generateQuestion(subject, topic, diff, rng), off = -1 - ((i * 2 + subject.length) % 9);
    d.attempts.push({ id: K.uid('q'), date: K.addDays(t, off), subject, topic, diff, q: q.q, opts: q.opts, a: q.a, exp: q.exp, picked: bit ? q.a : (q.a + 1) % 4, result: bit ? 'correct' : 'incorrect', saved: false, source: 'generated', demo: true }); }));
  d.sessions = K.generatePlan({ subjects: d.hub.subjects, difficult: d.hub.difficult, weak: K.weakTopics(d.attempts), mins: d.hub.mins, start: K.addDays(t, -2), days: 9, exams: d.exams }).map(s => (s.date < t && s.type !== 'Break' ? { ...s, done: true } : s));
  d.lastPlanReview = K.addDays(t, -4);
  d.well = (o.well || []).map(([sl, w, ac, mo], i) => ({ date: K.addDays(t, -(o.well.length - i)), sleep: sl, water: w, act: ac, mood: mo, energy: '' }));
  d.goals = o.goals.map(([g, done]) => ({ t: g, done })); Object.entries(o.docs || {}).forEach(([k, v]) => { d.docs[k].status = v; });
  d.saved = o.saved || {}; d.share = { ...d.share, ...o.share }; d.links = o.links || []; d.activity = [K.addDays(t, -2), K.addDays(t, -1)]; d.health.diet = o.diet || ''; d.health.allergies = o.allergies || []; d.inbox = o.inbox || []; d.marks = o.marks || []; d.feedback = o.feedback || []; d.healthReports = []; d.profile.gender = o.gender || ''; d.profile.puberty = o.puberty || ''; if (o.hostel) d.hostel = { ...o.hostel, by: 'Mr. Selvam', ts: Date.now() };
  d.tasks = K.mergeTasks(d.tasks, K.tasksFromRecs(K.buildRecs(d, t), t)).tasks; d.tasksInit = true; return d;
}
async function seed() {
  const t = H.today(), pw = 'Demo@1234';
  const mk = async (id, role, name, email, extra) => { const salt = K.randomSalt(); return { id, role, name, email, salt, hash: await K.hashPassword(pw, salt), createdAt: t, demo: true, ...extra }; };
  st.accounts = [await mk('demo-student', 'student', 'Ananya', 'ananya@demo.test'), await mk('demo-rohan', 'student', 'Rohan', 'rohan@demo.test'), await mk('demo-meera', 'student', 'Meera', 'meera@demo.test'), await mk('demo-parent', 'parent', 'Mr. Ramesh', 'parent@demo.test', { relation: 'Father' }), await mk('demo-teacher', 'educator', 'Ms. Lakshmi', 'teacher@demo.test', { institution: 'Demo Higher Secondary School (fictional)', approved: true }), await mk('demo-warden', 'warden', 'Mr. Selvam', 'warden@demo.test', { institution: 'Demo Hostel (fictional)', approved: true })];
  H.saveAccounts();
  const links = (...n) => [{ uid: 'demo-teacher', role: 'educator', name: 'Ms. Lakshmi', status: 'approved', ts: 0 }, ...n];
  const parent = { uid: 'demo-parent', role: 'parent', name: 'Mr. Ramesh', status: 'approved', ts: 0 };
  const hub = { board: 'CBSE', subjects: ['Mathematics', 'Physics', 'Chemistry', 'Computer Science'], examGoals: ['Board exams', 'JEE Main'], difficult: [{ subject: 'Mathematics', topic: 'Probability' }, { subject: 'Computer Science', topic: 'Loops and arrays' }], mins: 150 };
  H.saveData('demo-student', demoStudent('Ananya', { level: 'c12', seed: 7, hub, exams: [['Pre-board exam (demo date)', 24], ['Maths unit test (demo date)', 9]],
    profile: { school: 'Demo Higher Secondary School (fictional)', state: 'Tamil Nadu', marks: 86, income: '2.5-8', course: 'cs', goals: 'Do well in boards and prepare for entrance exams', careers: 'Software engineer, AI', learnPrefs: ['Short sessions', 'Practice questions'], wellPrefs: ['Drink more water', 'Sleep on time'], schGoals: 'An undergraduate scholarship for Computer Science' },
    practice: [['Mathematics', 'Probability', 'medium', [0, 0, 1, 0, 1, 0, 0, 1]], ['Mathematics', 'Differentiation', 'easy', [1, 1, 1, 0, 1, 1]], ['Mathematics', 'Integration', 'medium', [1, 0, 1, 1, 0, 1]], ['Computer Science', 'Number systems', 'easy', [1, 1, 1, 1, 0, 1]], ['Physics', 'Kinematics', 'medium', [1, 0, 1, 1]]],
    well: [[6.5, 4, 15, '😐'], [7, 5, 30, '🙂'], [5.5, 4, 10, '😕'], [6, 3, 20, '🙂'], [6.5, 4, 25, '🙂']], goals: [['Finish Probability practice', false], ['Walk 20 minutes daily', true], ['Collect income certificate', false]],
    docs: { class10: 'have', class12: 'have', bank: 'update', tc: 'verify', domicile: 'get', income: 'get' }, saved: { s1: { stage: 'preparing', savedAt: t }, s3: { stage: 'saved', savedAt: t } }, diet: 'vegetarian', allergies: ['peanuts'],
    share: { parentAcademic: true, parentExams: true, parentDeadlines: true, edu: true, notifyEdu: true }, links: links(parent, { uid: 'demo-warden', role: 'warden', name: 'Mr. Selvam', status: 'approved', ts: 0 }),
    marks: [{ id: 'mk1', subject: 'Mathematics', exam: 'Unit test 1 (demo entry)', score: 38, max: 50, by: 'Ms. Lakshmi', ts: Date.now() }, { id: 'mk2', subject: 'Physics', exam: 'Unit test 1 (demo entry)', score: 31, max: 40, by: 'Ms. Lakshmi', ts: Date.now() }],
    feedback: [{ id: 'fb1', from: 'Ms. Lakshmi', text: 'Good steady practice (demo entry). Revise Probability once more.', ts: Date.now() }],
    gender: 'female', puberty: 'yes', hostel: { room: 'B-204', bed: '3', token: 'T-1047' }, inbox: [{ id: 'w1', ts: Date.now(), from: 'Ms. Lakshmi', text: 'Great progress in Differentiation, Ananya! Keep going. 🌟', read: false }] }, t));
  H.saveData('demo-rohan', demoStudent('Rohan', { level: 'c12', seed: 11, hub: { ...hub, subjects: ['Mathematics', 'Physics'], difficult: [], mins: 120 }, exams: [['Pre-board exam (demo date)', 24]], profile: { state: 'Karnataka', marks: 78, course: 'cs', goals: 'Improve physics' },
    practice: [['Mathematics', 'Integration', 'medium', [1, 1, 0, 1, 1, 1]], ['Physics', "Ohm's law", 'easy', [1, 0, 1, 1, 0]]], well: [], goals: [['Finish chapter tests', false]], share: { edu: true }, gender: 'male', hostel: { room: 'B-101', bed: '2', token: 'T-1012' }, links: links() }, t));
  H.saveData('demo-meera', demoStudent('Meera', { level: 'c12', seed: 21, hub: { ...hub, subjects: ['Chemistry', 'Mathematics'], difficult: [], mins: 90 }, exams: [], profile: { state: 'Kerala', marks: 70, course: 'med' },
    practice: [['Chemistry', 'pH and acids', 'medium', [0, 1, 0, 0, 1, 0]]], well: [], goals: [], share: { edu: false }, gender: 'female', puberty: 'no', links: links() }, t));
}

/* ---------- events ---------- */
document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el) return; const fn = A[el.dataset.act]; if (fn) { if (el.tagName === 'A') return; fn(el, e); } });
document.addEventListener('change', e => { const el = e.target.closest('[data-chg]'); if (el && A[el.dataset.chg]) A[el.dataset.chg](el, e); });
document.addEventListener('input', e => { const el = e.target.closest('[data-inp]'); if (el && A[el.dataset.inp]) A[el.dataset.inp](el, e); });
document.addEventListener('submit', e => {
  const form = e.target.closest('[data-form]'); if (!form) return; e.preventDefault(); const kind = form.dataset.form;
  if (kind === 'login') return doLogin(form.dataset.role, H.formObj(form));
  if (kind === 'register') return doRegister(form.dataset.role, H.formObj(form));
  if (A[kind]) A[kind](form, e);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('#modal').hidden) H.closeModal(); $('#notifPanel').hidden = true; } });
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') H.closeModal(); });
window.addEventListener('hashchange', route);

/* ---------- init ---------- */
async function init() {
  st.accounts = db.get('accounts', []); if (db.get('seedv', 0) < 2 || !st.accounts.some(a => a.id === 'demo-student') || !st.accounts.some(a => a.id === 'demo-warden')) { const keep = st.accounts.filter(a => !a.demo); await seed(); st.accounts = [...st.accounts, ...keep]; H.saveAccounts(); db.set('seedv', 2); }
  const s = db.get('session', null), acc = s && s.exp > Date.now() && st.accounts.find(a => a.id === s.uid);
  if (acc) { st.me = acc; st.D = acc.role === 'student' ? H.loadData(acc.id) : null; if (st.D) H.ensureChallenges(); buildNav(); if (S.afterEnter) S.afterEnter(); route(); } else { if (s) db.del('session'); showScreen('welcome'); }
}
S.ready = new Promise(res => { const go = () => init().then(res); if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else setTimeout(go, 0); });
})();
