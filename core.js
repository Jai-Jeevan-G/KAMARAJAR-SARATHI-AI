/* ===== Kamarajar Sarathi AI · core.js =====
   Pure logic, no DOM. Deterministic rules for eligibility, progress %, recommendations,
   planner, practice-question templates, recipes and privacy filters.
   Runs in the browser (window.SAHAYA_CORE) and in Node (require) for tests.
   NOTE: AI-style text is template-based here. A live build would call an LLM from a backend
   (never from frontend code with an API key) while these rules stay the source of truth. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SAHAYA_CORE = factory();
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';
const C = {};

/* ---------- dates & small helpers ---------- */
const p2 = n => String(n).padStart(2, '0');
const ymd = s => { const [y, m, d] = String(s).split('-').map(Number); return [y, m - 1, d]; };
C.iso = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
C.todayISO = now => C.iso(now || new Date());
C.addDays = (s, n) => { const [y, m, d] = ymd(s); return C.iso(new Date(y, m, d + n)); };
C.daysBetween = (a, b) => Math.round((Date.UTC(...ymd(b)) - Date.UTC(...ymd(a))) / 864e5);
C.uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
C.pct = (n, d) => (d ? Math.round(100 * n / d) : null);
C.MIN_SAMPLE = 5; // minimum answered questions before a topic is called "weak"
const avg = a => a.reduce((s, x) => s + x, 0) / a.length;

C.LEVELS = { c9: 'Class 9', c10: 'Class 10', c11: 'Class 11', c12: 'Class 12 (studying)', c12done: 'Completed Class 12', ug: 'Undergraduate (college)', pg: 'Postgraduate', other: 'Other' };
C.INCOME = { '<2.5': 'Below ₹2.5 lakh', '2.5-8': '₹2.5 – 8 lakh', '8+': 'Above ₹8 lakh', unknown: 'Prefer not to say' };
C.STATES = ['Tamil Nadu', 'Karnataka', 'Kerala', 'Maharashtra', 'Andhra Pradesh', 'Telangana', 'Other'];

/* ---------- roles & access ---------- */
C.BOARDS = ['CBSE', 'ICSE / ISC', 'Tamil Nadu State Board', 'Other State Board', 'Other'];
C.ROLE_VIEWS = {
  student: ['dashboard', 'guardian', 'hub', 'health', 'scholarship', 'exams', 'documents', 'plans', 'questions', 'passport', 'about', 'settings'],
  parent: ['pdash', 'psettings'],
  educator: ['edash', 'esettings'],
  warden: ['wdash', 'wsettings']
};
C.HOME = { student: 'dashboard', parent: 'pdash', educator: 'edash', warden: 'wdash' };
/* Privileged roles need administrator approval. DEMO ONLY: a browser prototype cannot truly enforce this.
   A real deployment checks approval on the server (see supabase/migrations). */
C.PRIVILEGED = ['educator', 'warden'];
C.DEMO_APPROVAL_CODE = 'KS-APPROVE-2026';
C.approvalOk = code => String(code || '').trim().toUpperCase() === C.DEMO_APPROVAL_CODE;
C.canAccess = (role, view) => !!(C.ROLE_VIEWS[role] && C.ROLE_VIEWS[role].includes(view));

/* ---------- validation & passwords ---------- */
C.validateEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());
C.validatePassword = p => {
  p = String(p || '');
  if (p.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'Include at least one letter and one number.';
  return '';
};
C.validateRegistration = (role, f) => {
  const e = {}, name = String(f.name || '').trim();
  if (name.length < 2 || name.length > 60) e.name = 'Enter your name (2–60 characters).';
  if (!C.validateEmail(f.email)) e.email = 'Enter a valid email address.';
  const pe = C.validatePassword(f.password); if (pe) e.password = pe;
  if (f.password !== f.password2) e.password2 = 'Passwords do not match.';
  if (!f.consent) e.consent = 'Please confirm you understand how your data is used.';
  if (role === 'student' && !C.LEVELS[f.level]) e.level = 'Choose your education level.';
  if (role === 'student' && f.gender && !C.GENDERS[f.gender]) e.gender = 'Choose one of the listed options.';
  if (role === 'parent' && !String(f.relation || '').trim()) e.relation = 'Tell us your relationship (e.g. mother, guardian).';
  if ((role === 'educator' || role === 'warden') && !String(f.institution || '').trim()) e.institution = role === 'warden' ? 'Enter your hostel or institution.' : 'Enter your school or institution.';
  if (role !== 'student' && f.linkCode && !/^[A-Z0-9-]{6,14}$/.test(String(f.linkCode).trim().toUpperCase())) e.linkCode = 'Link codes look like ANAN-7Q2K.';
  return e;
};
C.lockoutSeconds = fails => (fails < 5 ? 0 : Math.min(300, 30 * Math.pow(2, fails - 5)));
let subtle = null, rnd = null;
try {
  const g = typeof globalThis !== 'undefined' ? globalThis : {};
  const wc = (g.crypto && g.crypto.subtle) ? g.crypto : (typeof require === 'function' ? require('crypto').webcrypto : null);
  if (wc) { subtle = wc.subtle; rnd = a => wc.getRandomValues(a); }
} catch (e) { /* no WebCrypto: fallback below */ }
C.randomSalt = () => { const a = new Uint8Array(16); if (rnd) rnd(a); else for (let i = 0; i < 16; i++) a[i] = Math.floor(Math.random() * 256); return [...a].map(b => p2(b.toString(16))).join(''); };
C.hashPassword = async (pw, salt) => {
  if (subtle) {
    const key = await subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
    const bits = await subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 120000, hash: 'SHA-256' }, key, 256);
    return 'pbkdf2$' + [...new Uint8Array(bits)].map(b => p2(b.toString(16))).join('');
  }
  let h = 5381; const s = salt + pw; for (let r = 0; r < 2000; r++) for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return 'weak$' + h.toString(16); // demo fallback only
};
C.makeLinkCode = (name, r = Math.random) => {
  const letters = String(name || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4).padEnd(4, 'S');
  const tail = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(r() * 32)]).join('');
  return `${letters}-${tail}`;
};

/* ---------- documents ---------- */
// status: have (available) | get (pending / to obtain) | update (needs updating) | verify (awaiting official verification)
C.DOCS = [
  { id: 'class10', name: 'Class 10 marksheet', how: 'Issued by your school board. If it is lost, ask your school how to request a duplicate from the board, and check the board’s official website for the process.' },
  { id: 'class12', name: 'Class 12 marksheet', how: 'Issued by your school board after results. Your school can guide you on duplicates or provisional certificates through the board’s official process.' },
  { id: 'bank', name: 'Bank account details', how: 'Ask your bank branch for passbook or statement details. Some schemes need the account in the student’s own name or linked in a specific way. Read the scheme’s official page for its exact rule.' },
  { id: 'tc', name: 'Transfer certificate', how: 'Issued by your school’s principal or office. Ask the school office what is needed and how long it takes.' },
  { id: 'domicile', name: 'Domicile / residence certificate', how: 'Usually issued by a state government office. Many states offer an online e-services portal. Search your state’s official portal for the required papers, fees and timelines.' },
  { id: 'income', name: 'Income certificate', how: 'Usually issued by the state revenue department or a local government office, often through the state’s official e-services portal. Check the current required papers, fees and validity on the official site.' }
];
C.docName = id => (C.DOCS.find(d => d.id === id) || { name: id }).name;

/* ---------- scholarship engine (rule-based, explainable) ---------- */
// ENTRIES ARE SAMPLE DEMO RECORDS. Real data must come from verified official sources (e.g. scholarships.gov.in).
const incomeOk = (inc, max) => (!inc || inc === 'unknown') ? null : inc === '<2.5' ? true : inc === '2.5-8' ? max >= 8 : false;
const hasNum = v => v !== '' && v != null && !isNaN(+v);
const X = {
  level: list => ({ label: 'Education level: ' + list.map(l => C.LEVELS[l]).join(' / '), test: p => (p.level ? list.includes(p.level) : null), have: p => (p.level ? 'You selected: ' + C.LEVELS[p.level] : 'Education level not set') }),
  marks: min => ({ label: `Marks of ${min}% or more`, test: p => (hasNum(p.marks) ? +p.marks >= min : null), have: p => (hasNum(p.marks) ? `You entered ${p.marks}%` : 'Marks not entered') }),
  income: max => ({ label: `Family income up to ₹${max} lakh`, test: p => incomeOk(p.income, max), have: p => (p.income && p.income !== 'unknown' ? 'Bracket: ' + C.INCOME[p.income] : 'Income not shared') }),
  state: list => ({ label: 'Resident of: ' + list.join(' / '), test: p => (p.state ? list.includes(p.state) : null), have: p => (p.state ? 'State: ' + p.state : 'State not set') }),
  course: (code, name) => ({ label: `Intended course: ${name}`, test: p => (p.course ? p.course === code : null), have: p => (p.course ? 'Intended: ' + ({ cs: 'Computer Science', med: 'Medicine', arts: 'Arts' }[p.course] || p.course) : 'Course not set') }),
  verify: label => ({ label, test: () => null, have: () => 'Only the issuing authority or provider can confirm this' })
};
C.SCHEMES = [
  { id: 's1', name: 'Sample Central Merit Scholarship', provider: 'Central government scheme (demo entry)', type: 'Merit · Central', dl: 12, docs: ['class12', 'income', 'bank'], crit: [X.level(['c12', 'c12done']), X.marks(80), X.income(8)] },
  { id: 's2', name: 'Sample State Higher-Education Support', provider: 'State government scheme (demo entry)', type: 'State · Need-based', dl: 25, docs: ['class12', 'domicile', 'income'], crit: [X.state(['Tamil Nadu', 'Karnataka', 'Kerala']), X.income(8), X.verify('Domicile certificate verified by the issuing authority')] },
  { id: 's3', name: 'Sample Tech Futures Foundation Grant', provider: 'Private foundation (demo entry)', type: 'Private · Merit', dl: 34, docs: ['class12', 'class10'], crit: [X.course('cs', 'Computer Science'), X.marks(75), X.level(['c12', 'c12done', 'ug'])] },
  { id: 's4', name: 'Sample Fee Assistance for Low-Income Families', provider: 'Educational institution (demo entry)', type: 'Institution · Need-based', dl: 18, docs: ['income', 'class12', 'tc'], crit: [X.income(2.5), X.level(['c12', 'c12done', 'ug'])] },
  { id: 's5', name: 'Sample Medical Merit Award', provider: 'Private foundation (demo entry)', type: 'Private · Merit', dl: 40, docs: ['class12'], crit: [X.course('med', 'Medicine'), X.marks(90)] },
  { id: 's6', name: 'Sample Corporate Coding Scholarship', provider: 'Corporate programme (demo entry)', type: 'Corporate', dl: 45, docs: ['class12'], unverified: true, crit: [] },
  { id: 's7', name: 'Sample School-Level Merit Scholarship (Class 11–12)', provider: 'State government scheme (demo entry)', type: 'Merit · School', dl: 22, docs: ['class10', 'bank'], crit: [X.level(['c11', 'c12']), X.marks(75)] },
  { id: 's8', name: 'Sample Undergraduate Excellence Award', provider: 'Educational institution (demo entry)', type: 'Merit · UG', dl: 30, docs: ['class12', 'bank'], crit: [X.level(['ug']), X.marks(70), X.income(8)] }
];
C.PORTAL = 'https://scholarships.gov.in';
C.scheme = id => C.SCHEMES.find(s => s.id === id);
C.schemeDeadline = (s, D) => C.addDays((D && D.baseDate) || C.todayISO(), s.dl);
C.STATUS = {
  likely: { label: 'Likely Eligible', cls: 'green' },
  possible: { label: 'Possibly Eligible', cls: 'yellow' },
  moreinfo: { label: 'More Information Needed', cls: 'blue' },
  not: { label: 'Likely Ineligible', cls: 'red' },
  unverified: { label: 'Not Verified', cls: 'grey' }
};
C.SCHEMES.forEach(s => { s.sourceUrl = C.PORTAL; s.lastVerified = null; });
C.evaluate = (s, p) => {
  p = p || {};
  if (s.unverified) return { key: 'unverified', ...C.STATUS.unverified, score: 0, rows: [], note: 'Official criteria are not loaded in this demo. Read them on the provider’s official page.' };
  const rows = s.crit.map(c => ({ label: c.label, r: c.test(p), have: c.have(p) }));
  const met = rows.filter(x => x.r === true).length;
  const key = rows.some(x => x.r === false) ? 'not' : rows.length && rows.every(x => x.r === null) ? 'moreinfo' : rows.some(x => x.r === null) ? 'possible' : 'likely';
  const note = { moreinfo: 'None of the criteria can be checked yet. Complete your profile so this can be assessed.', not: 'Some criteria are not met with the details you shared. If your details change, this is checked again.', possible: 'Some conditions are unknown or can only be confirmed by an official document or the provider.', likely: 'Based on what you shared. The provider makes the final decision after verification. Approval is never guaranteed.' }[key];
  return { key, ...C.STATUS[key], score: C.pct(met, rows.length) || 0, rows, note };
};
C.matchesFor = p => C.SCHEMES.map(s => ({ s, e: C.evaluate(s, p) }));
C.agentNextAction = (D, today) => {
  const P = D.profile, miss = [];
  if (!P.level) miss.push('your education level'); if (!hasNum(P.marks)) miss.push('your marks'); if (!P.state) miss.push('your state'); if (!P.course) miss.push('your intended course');
  if (miss.length) return { text: `Tell me ${miss.join(', ')} so I can check eligibility. I only use it for matching.`, go: 'scholarship', tab: 'profile' };
  const saved = Object.entries(D.saved || {}).filter(([, v]) => !['applied', 'outcome'].includes(v.stage));
  if (!saved.length) { const n = C.matchesFor(P).filter(x => ['likely', 'possible'].includes(x.e.key)).length; return { text: n ? `You have ${n} possible match${n > 1 ? 'es' : ''}. Save the ones you like to start tracking them.` : 'No matches with the details given. Check again if your details change.', go: 'scholarship', tab: 'matches' }; }
  saved.sort((a, b) => C.daysBetween(today, C.schemeDeadline(C.scheme(a[0]), D)) - C.daysBetween(today, C.schemeDeadline(C.scheme(b[0]), D)));
  const [id, v] = saved[0], s = C.scheme(id), days = C.daysBetween(today, C.schemeDeadline(s, D));
  const missing = s.docs.filter(d => (D.docs[d] || {}).status !== 'have');
  if (missing.length) return { text: `For “${s.name}” (${days} days left, sample date), the next step is: ${C.docName(missing[0])}. ${missing.length > 1 ? `${missing.length - 1} more pending.` : ''}`, go: 'scholarship', tab: 'guidance' };
  if (v.stage === 'saved' || v.stage === 'preparing') return { text: `All documents for “${s.name}” are marked available. Prepare your application draft for review.`, go: 'scholarship', tab: 'apply' };
  return { text: `“${s.name}” is marked ready. Open the official portal to apply before the deadline (${days} days left, sample date).`, go: 'scholarship', tab: 'tracker' };
};

/* ---------- exams (informational; always verify officially) ---------- */
C.EXAMS = [
  { id: 'jeemain', name: 'JEE Main', body: 'National Testing Agency', link: 'https://jeemain.nta.nic.in', why: 'You studied Maths and want Computer Science. Many B.E./B.Tech admissions use JEE Main.', reqs: ['Class 12 (or equivalent) with the subject combination in the current notification', 'Age and attempt rules can change each year'] },
  { id: 'jeeadv', name: 'JEE Advanced', body: 'A participating IIT (rotates yearly)', link: 'https://jeeadv.ac.in', why: 'An option if you qualify through JEE Main ranking and meet the attempt limits.', reqs: ['Qualification depends on JEE Main performance', 'Check attempt and eligibility rules in the official brochure'] },
  { id: 'cuet', name: 'CUET (UG)', body: 'National Testing Agency', link: 'https://cuet.nta.nic.in', why: 'Many universities use CUET for UG courses such as B.Sc. Computer Science or BCA. Subject combinations vary by university.', reqs: ['Check each university’s accepted subjects and minimum marks', 'Registration windows are announced officially'] },
  { id: 'neet', name: 'NEET (UG)', body: 'National Testing Agency', link: 'https://neet.nta.nic.in', why: 'For medical courses. It needs Biology in Class 12.', reqs: ['Biology, Physics and Chemistry in Class 12', 'Check current age and attempt rules'] },
  { id: 'ntse', name: 'NTSE (National Talent Search Examination)', body: 'NCERT', link: 'https://ncert.nic.in', why: 'A national talent and scholarship examination usually taken in Class 10. Check the current notification for who can apply.', reqs: ['Eligibility, stages and dates change; read the NCERT notification', 'Your state may run the first stage'] },
  { id: 'olymp', name: 'Science and Mathematics Olympiads', body: 'Indian Olympiad programme (HBCSE) and other organisers', link: 'https://olympiads.hbcse.tifr.res.in', why: 'Competitions for strong problem-solvers in Maths, Physics, Chemistry, Biology and Astronomy. Good for building depth.', reqs: ['Stages, eligibility and dates differ by subject and year', 'Check the organiser’s official page'] },
  { id: 'state', name: 'State engineering counselling', body: 'Your state’s admission authority', link: null, why: 'Many states run their own counselling for engineering seats. Rules and dates differ by state.', reqs: ['Search for your state’s official admission portal', 'Keep your marksheets and certificates ready'] }
];
C.EXAMS.forEach(x => { x.sourceUrl = x.link; x.lastVerified = null; });
C.examFit = (id, course) => {
  const cs = course === 'cs', med = course === 'med';
  if (id === 'neet') return med ? ['Strong fit', 'green'] : ['Not matched to your goal', 'grey'];
  if (id === 'jeeadv') return cs ? ['Conditional', 'yellow'] : ['Not matched to your goal', 'grey'];
  if (id === 'jeemain' || id === 'state') return cs ? ['Strong fit', 'green'] : ['Check relevance', 'yellow'];
  if (id === 'cuet') return med ? ['Check relevance', 'yellow'] : ['Good fit', 'green'];
  return ['Check relevance', 'yellow'];
};

/* ---------- practice questions: stats ---------- */
C.SUBJECT_TOPICS = {
  Mathematics: ['Differentiation', 'Integration', 'Probability', 'Quadratic equations'],
  Physics: ['Kinematics', "Ohm's law"],
  Chemistry: ['Mole concept', 'pH and acids'],
  'Computer Science': ['Number systems', 'Loops and arrays']
};
const answered = a => a.result === 'correct' || a.result === 'incorrect';
C.overallStats = attempts => {
  const ans = attempts.filter(answered), c = ans.filter(a => a.result === 'correct').length;
  return { attempted: ans.length, correct: c, incorrect: ans.length - c, skipped: attempts.length - ans.length, accuracy: C.pct(c, ans.length) };
};
C.topicStats = attempts => {
  const m = {};
  attempts.forEach(a => {
    const k = a.subject + '|' + a.topic; m[k] = m[k] || { subject: a.subject, topic: a.topic, n: 0, correct: 0, skipped: 0 };
    if (answered(a)) { m[k].n++; if (a.result === 'correct') m[k].correct++; } else m[k].skipped++;
  });
  return Object.values(m).map(t => {
    t.acc = C.pct(t.correct, t.n);
    t.status = t.n < C.MIN_SAMPLE ? 'insufficient' : t.acc < 60 ? 'needs' : t.acc >= 75 ? 'strong' : 'ok';
    return t;
  }).sort((a, b) => (a.acc ?? 101) - (b.acc ?? 101));
};
C.weakTopics = attempts => C.topicStats(attempts).filter(t => t.status === 'needs');
C.byDay = attempts => {
  const m = {};
  attempts.filter(answered).forEach(a => { const d = a.date; m[d] = m[d] || { date: d, n: 0, c: 0 }; m[d].n++; if (a.result === 'correct') m[d].c++; });
  return Object.values(m).sort((a, b) => a.date.localeCompare(b.date)).map(x => ({ ...x, acc: C.pct(x.c, x.n) }));
};
C.trend = series => {
  if (!series || series.length < 4) return null;
  const h = Math.floor(series.length / 2), a = avg(series.slice(0, h)), b = avg(series.slice(series.length - h)), d = Math.round(b - a);
  return { dir: d >= 3 ? 'up' : d <= -3 ? 'down' : 'flat', delta: d };
};
C.streak = (dates, today) => {
  const set = new Set(dates || []); let d = set.has(today) ? today : C.addDays(today, -1), n = 0;
  while (set.has(d)) { n++; d = C.addDays(d, -1); }
  return n;
};

/* ---------- progress indicators (computed only from recorded data; null = no data yet) ---------- */
C.learningProgress = (D, today) => {
  const parts = [], basis = [];
  const due = (D.sessions || []).filter(s => s.type !== 'Break' && s.date <= today);
  if (due.length) { const done = due.filter(s => s.done).length; parts.push(100 * done / due.length); basis.push(`${done} of ${due.length} study sessions done so far`); }
  const o = C.overallStats(D.attempts || []);
  if (o.attempted >= C.MIN_SAMPLE) { parts.push(o.accuracy); basis.push(`${o.accuracy}% accuracy over ${o.attempted} practice questions`); }
  return { pct: parts.length ? Math.round(avg(parts)) : null, basis: basis.length ? basis.join(' · ') : 'Add study sessions or practise questions to see this.' };
};
C.wellnessProgress = (D, today) => {
  const l = (D.well || []).filter(w => C.daysBetween(w.date, today) <= 6 && C.daysBetween(w.date, today) >= 0);
  if (!l.length) return { pct: null, basis: 'No well-being data has been recorded.' };
  const sc = w => { const p = []; if (hasNum(w.sleep)) p.push(Math.min(w.sleep / 7, 1)); if (hasNum(w.water)) p.push(Math.min(w.water / 6, 1)); if (hasNum(w.act)) p.push(Math.min(w.act / 20, 1)); return p.length ? avg(p) : null; };
  const s = l.map(sc).filter(x => x !== null);
  if (!s.length) return { pct: null, basis: 'Your check-ins have no sleep, water or activity values yet.' };
  return { pct: Math.round(100 * avg(s)), basis: `Average progress towards gentle targets (7 h sleep, 6 glasses water, 20 min activity) over ${l.length} check-in${l.length > 1 ? 's' : ''} this week. A habit indicator, not a medical measure.` };
};
C.readinessProgress = D => {
  const saved = Object.keys(D.saved || {});
  const ids = saved.length ? [...new Set(saved.flatMap(id => (C.scheme(id) || { docs: [] }).docs))] : C.DOCS.map(d => d.id);
  const have = ids.filter(id => (D.docs[id] || {}).status === 'have').length;
  return { pct: C.pct(have, ids.length), basis: `${have} of ${ids.length} documents marked available${saved.length ? ` for your ${saved.length} saved scholarship${saved.length > 1 ? 's' : ''}` : ' (all common documents)'}.` };
};

/* ---------- recommendation engine (deterministic rules; text is explanatory) ---------- */
C.buildRecs = (D, today) => {
  const out = [], rs = D.recState || {}, P = D.profile || {};
  const add = r => { const st = rs[r.id]; if (st && (st.status === 'dismissed' || st.status === 'accepted')) return; if (st && st.status === 'postponed' && st.until > today) return; out.push(r); };
  C.weakTopics(D.attempts || []).forEach(t => add({ id: `weak:${t.subject}:${t.topic}`, area: 'Learning', priority: 1, title: `Practise ${t.topic} (${t.subject})`,
    fact: `You answered ${t.correct} of ${t.n} questions correctly in ${t.topic} (${t.acc}%).`, factSource: 'Your practice records',
    why: `Topics with low accuracy over several questions are good candidates for focused practice. This is based on ${t.n} questions, so treat it as a pointer, not a verdict.`,
    steps: ['Day 1: 5 easy questions and read every explanation', 'Day 2: 5 medium questions, then retry any you missed', 'Day 3: 5 mixed questions and check your accuracy'], track: 'Question Tracker: accuracy for this topic',
    task: { title: `Practise 5 ${t.topic} questions`, desc: `Use the Question Tracker. Subject: ${t.subject}.`, due: C.addDays(today, 1), priority: 'high' }, go: 'questions' }));
  (D.exams || []).forEach(e => { const d = C.daysBetween(today, e.date); if (d >= 0 && d <= 45) add({ id: `exam:${e.id}`, area: 'Exams', priority: d <= 14 ? 1 : 2, title: `Prepare for ${e.name}`,
    fact: `${e.name} is on ${e.date} (${d === 0 ? 'today' : d + ' days left'}).`, factSource: 'Date you entered',
    why: 'Spreading revision over the days you have left is easier than last-minute cramming.', steps: ['Open the exam countdown and generate revision sessions', 'Revise topics that need attention first', 'Take one timed mock in the last week'], track: 'Learning Hub → Countdown',
    task: { title: `Revision block for ${e.name}`, desc: 'Follow the revision sessions in your planner.', due: C.addDays(today, 1), priority: d <= 14 ? 'high' : 'medium' }, go: 'hub' }); });
  Object.entries(D.saved || {}).forEach(([id, v]) => {
    const s = C.scheme(id); if (!s || ['applied', 'outcome'].includes(v.stage)) return;
    const missing = s.docs.filter(d => (D.docs[d] || {}).status !== 'have'), days = C.daysBetween(today, C.schemeDeadline(s, D));
    if (missing.length && days >= 0) add({ id: `docs:${id}`, area: 'Scholarship', priority: days <= 14 ? 1 : 2, title: `Get ready for ${s.name}`,
      fact: `${missing.length} of ${s.docs.length} documents are not marked available: ${missing.map(C.docName).join(', ')}. Sample deadline in ${days} days (demo data; verify officially).`, factSource: 'Your document checklist',
      why: 'Certificates such as income or domicile can take time, so starting early avoids missing a deadline.', steps: ['Open the document guidance for the first missing item', 'Follow the official procedure for it', 'Mark it available once you hold it'], track: 'Scholarship AI Agent → Tracker',
      task: { title: `Start: ${C.docName(missing[0])}`, desc: `Needed for ${s.name}. Check the official procedure first.`, due: C.addDays(today, 2), priority: days <= 14 ? 'high' : 'medium' }, go: 'scholarship' });
  });
  if ((D.sessions || []).length) { const last = D.lastPlanReview; if (!last || C.daysBetween(last, today) >= 3) add({ id: 'plan-review', area: 'Plan', priority: 2, title: 'Review your study plan',
    fact: last ? `You last reviewed your plan on ${last}.` : 'You have not reviewed your study plan yet.', factSource: 'Your planner',
    why: 'A quick weekly check keeps your plan realistic and lets you move sessions that no longer fit.', steps: ['Open the planner', 'Move or edit sessions that no longer fit', 'Tick off what you have done'], track: 'Learning Hub → Planner',
    task: { title: 'Review my study plan', desc: 'Move, edit or complete sessions.', due: today, priority: 'medium' }, go: 'hub' }); }
  else if ((D.hub || {}).subjects && D.hub.subjects.length) add({ id: 'plan-first', area: 'Plan', priority: 2, title: 'Create your first study plan',
    fact: `You picked ${D.hub.subjects.length} subject${D.hub.subjects.length > 1 ? 's' : ''} and ${D.hub.mins} minutes a day.`, factSource: 'Your Learning Hub settings',
    why: 'A realistic plan with breaks is easier to follow than a long to-do list.', steps: ['Open the planner', 'Generate your week', 'Edit anything that does not suit you'], track: 'Learning Hub → Planner',
    task: { title: 'Generate my week plan', desc: '', due: today, priority: 'medium' }, go: 'hub' });
  const w = (D.well || []).filter(x => C.daysBetween(x.date, today) <= 6 && C.daysBetween(x.date, today) >= 0);
  const lastW = (D.well || []).length ? D.well[D.well.length - 1].date : '';
  const sl = w.filter(x => hasNum(x.sleep));
  if (sl.length >= 3 && avg(sl.map(x => +x.sleep)) < 7) add({ id: 'well-sleep', area: 'Wellness', priority: 3, title: 'Gentle sleep routine idea',
    fact: `Your average sleep over ${sl.length} check-ins this week is ${avg(sl.map(x => +x.sleep)).toFixed(1)} hours.`, factSource: 'Your check-ins',
    why: 'Many students feel better studying with regular, sufficient sleep. This is a wellness indicator, not a medical conclusion. If tiredness worries you, talk to a trusted adult or a health professional.',
    steps: ['Pick a fixed wake-up time', 'Keep screens away 30 minutes before bed', 'Log your sleep for 3 more days'], track: 'Health → sleep trend', task: { title: 'Try a screen-free wind-down tonight', desc: 'Optional.', due: today, priority: 'low' }, go: 'health' });
  const wt = w.filter(x => hasNum(x.water));
  if ((P.wellPrefs || []).includes('Drink more water') && wt.length >= 3 && avg(wt.map(x => +x.water)) < 6) add({ id: 'habit:water', area: 'Wellness', priority: 3, title: 'Build your water habit',
    fact: `You said you want to drink more water. Your average is ${avg(wt.map(x => +x.water)).toFixed(1)} glasses over ${wt.length} check-ins.`, factSource: 'Your preference and check-ins',
    why: 'Linking a glass of water to each study break is an easy habit hook. How much you need varies from person to person.', steps: ['Keep a bottle on your desk', 'Sip at each break', 'Optionally switch on Water Buddy'], track: 'Health → water trend', task: { title: 'Sip water at every study break today', desc: '', due: today, priority: 'low' }, go: 'health' });
  if (!P.goals || !P.careers) add({ id: 'profile', area: 'Profile', priority: 3, title: 'Tell Kamarajar Sarathi your goals',
    fact: `${!P.goals ? 'Academic goals' : 'Career interests'} not filled in yet.`, factSource: 'Your About Me', why: 'Goals help tailor your plan and scholarship matches. Share only what you are comfortable with.',
    steps: ['Open About Me', 'Add one or two goals', 'Choose what to share with parents or educators'], track: 'About Me', task: { title: 'Complete my About Me', desc: '', due: C.addDays(today, 2), priority: 'low' }, go: 'about' });
  if (!hasNum(P.marks) || !P.income || !P.state || !P.course) add({ id: 'sch-profile', area: 'Scholarship', priority: 2, title: 'Add details to unlock scholarship matching',
    fact: 'Some matching details (marks, income bracket, state, course) are missing.', factSource: 'Your profile', why: 'Eligibility rules use these details. Income is only needed for need-based schemes, and you can skip it.',
    steps: ['Open the Scholarship AI Agent', 'Fill the profile step', 'Review your matches'], track: 'Scholarship AI Agent', task: { title: 'Fill my scholarship profile', desc: '', due: C.addDays(today, 2), priority: 'medium' }, go: 'scholarship' });
  return out.sort((a, b) => a.priority - b.priority);
};
C.tasksFromRecs = (recs, today, limit = 5) => recs.slice(0, limit).map(r => ({ id: C.uid('t'), key: r.id, title: r.task.title, desc: r.task.desc, due: r.task.due, priority: r.task.priority, done: false, source: 'ai', area: r.area, edited: false, accepted: false }));
const protectedTask = t => t.source !== 'ai' || t.edited || t.accepted || t.done;
C.mergeTasks = (existing, generated) => {
  const keep = existing.filter(protectedTask), keys = new Set(keep.map(t => t.key).filter(Boolean));
  const add = generated.filter(g => !keys.has(g.key));
  return { tasks: keep.concat(add), replaced: existing.length - keep.length, kept: keep.length, added: add.length };
};

/* ---------- study planner ---------- */
C.generatePlan = o => {
  const { subjects = [], difficult = [], weak = [], mins = 0, start, days = 7, exams = [], used = {} } = o;
  if (!subjects.length || mins < 30) return [];
  const flagged = difficult.concat(weak);
  const topicsFor = s => [...new Set(flagged.filter(t => t.subject === s).map(t => t.topic))];
  const near = exams.map(e => C.daysBetween(start, e.date)).filter(d => d >= 0).sort((a, b) => a - b)[0];
  const types = near != null && near <= 14 ? ['Practice questions', 'Revision', 'Topic revision'] : ['Topic revision', 'Practice questions', 'Revision'];
  const order = []; subjects.forEach(s => { for (let i = 0; i < 1 + Math.min(2, topicsFor(s).length); i++) order.push(s); });
  let rr = 0; const out = [];
  for (let d = 0; d < days; d++) {
    const date = C.addDays(start, d); let budget = mins - (used[date] || 0);
    const light = days >= 7 && d === days - 1 && !(near != null && near - d <= 2);
    if (light) budget = Math.min(budget, 50);
    let n = Math.floor(budget / 50); if (n < 1 && budget >= 30) n = 1; if (n < 1) continue;
    const mock = near != null && near <= 21 && d === Math.min(5, days - 1) && !light;
    for (let i = 0; i < n; i++) {
      const subject = order[rr++ % order.length], tps = topicsFor(subject), topic = tps.length ? tps[(d + i) % tps.length] : '';
      const type = mock && i === 0 ? 'Mock-test preparation' : types[(d + i) % types.length];
      out.push({ id: C.uid('s'), date, title: `${light ? 'Light day · ' : ''}${type}: ${topic || subject}`, subject, topic, type, mins: Math.min(40, budget), done: false, source: 'ai', edited: false });
      if (i < n - 1) out.push({ id: C.uid('s'), date, title: 'Break · stretch and sip water', subject: '', topic: '', type: 'Break', mins: 10, done: false, source: 'ai', edited: false });
    }
  }
  return out;
};
const protectedSess = (s, today) => s.source !== 'ai' || s.edited || s.done || s.date < today;
C.regeneratePlan = (existing, o) => {
  const keep = existing.filter(s => protectedSess(s, o.start)), used = {};
  keep.forEach(s => { used[s.date] = (used[s.date] || 0) + (s.type === 'Break' ? 0 : s.mins); });
  const gen = C.generatePlan({ ...o, used });
  return { sessions: keep.concat(gen), removed: existing.length - keep.length, kept: keep.length, added: gen.length };
};
C.examPhases = d => d < 0 ? [] : d <= 2 ? [{ label: 'Light revision and rest', note: 'Skim notes, sleep well, no new topics.' }]
  : [{ label: d > 21 ? 'Learn and fix weak topics' : 'Fix weak topics quickly', note: 'Start with topics that need attention.' }, { label: 'Practise by difficulty', note: 'Easy → medium → hard, with explanations.' }, { label: 'Mocks and revision', note: 'Timed paper once, then review mistakes.' }, { label: 'Light revision and rest', note: 'Last two days: rest and recap.' }];
C.revisionSessions = (exam, topics, today, mins = 40) => {
  const d = C.daysBetween(today, exam.date), n = Math.min(d - 1, 10), out = [];
  for (let i = 1; i <= n; i++) {
    const date = C.addDays(today, i), left = d - i, t = topics.length ? topics[(i - 1) % topics.length] : null;
    const title = left <= 2 ? `Light revision for ${exam.name}` : t ? `Revision for ${exam.name}: ${t.topic}` : `Mixed revision for ${exam.name}`;
    out.push({ id: C.uid('s'), date, title, subject: t ? t.subject : '', topic: t ? t.topic : '', type: left <= 2 ? 'Revision' : 'Topic revision', mins, done: false, source: 'ai', edited: false, examId: exam.id });
  }
  return out;
};

/* ---------- daily challenges ---------- */
C.CHAL = {
  Learning: ['Answer 5 practice questions in your weakest topic', 'Revise one topic for 25 minutes', 'Finish one session from your study plan', 'Write down 3 things you learned today'],
  Wellness: ['Sip a glass of water at each study break', 'Take a 5-minute stretch break', 'Go for a 10-minute walk'],
  Readiness: ['Look at one scholarship’s document checklist', 'Note which certificate to apply for first', 'Review your saved scholarship dates', 'Read one official scholarship page'],
  Personal: ['Write one goal for this week', 'Thank someone who helped you', 'Plan tomorrow in 3 bullet points', 'Spend 10 minutes on a hobby']
};
C.buildChallenges = (date, prev) => {
  const h = [...date].reduce((a, c) => a * 31 + c.charCodeAt(0), 7), areas = Object.keys(C.CHAL);
  const items = areas.map((area, i) => ({ id: `${date}:${area}`, area, text: C.CHAL[area][(h + i * 3) % 4], status: 'open', carried: false }));
  (prev && prev.items || []).filter(x => x.status === 'postponed').forEach(x => { const t = items.find(i => i.area === x.area); if (t) { t.text = x.text; t.carried = true; } });
  return { date, items };
};

/* ---------- practice-question templates (generated; NOT official exam questions) ---------- */
C.lcg = seed => { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const shuffle = (arr, r) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pw = (c, e) => (e === 0 ? `${c}` : e === 1 ? `${c}x` : `${c}x^${e}`);
const nf = x => String(+(+x).toFixed(2));
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const fr = (n, d) => { const g = gcd(n, d); return d / g === 1 ? `${n / g}` : `${n / g}/${d / g}`; };
function build(q, correct, wrongs, exp, r) {
  const c = String(correct), set = [c];
  wrongs.forEach(w => { const s = String(w); if (!set.includes(s) && set.length < 4) set.push(s); });
  const numeric = !isNaN(+c); let k = 1; const filler = ['None of these', 'Cannot be determined', 'Not enough data'];
  while (set.length < 4) { const s = numeric ? nf(+c + k) : filler[k - 1]; k++; if (!set.includes(s)) set.push(s); }
  const opts = shuffle(set, r);
  return { q, opts, a: opts.indexOf(c), exp };
}
const GEN = {
  Mathematics: {
    Differentiation(d, r) {
      if (d === 'easy') { const a = ri(r, 1, 5), n = ri(r, 2, 4); return build(`If f(x) = ${pw(a, n)}, find f′(x).`, pw(a * n, n - 1), [pw(a, n - 1), pw(a * n, n), pw(a * (n - 1), n - 1)], `Power rule: d/dx(a·xⁿ) = a·n·xⁿ⁻¹. Here ${a}×${n} = ${a * n}, so f′(x) = ${pw(a * n, n - 1)}.`, r); }
      if (d === 'medium') { const a = ri(r, 2, 6), n = ri(r, 3, 5), b = ri(r, 1, 9); return build(`If f(x) = ${pw(a, n)} + ${b}x, find f′(x).`, `${pw(a * n, n - 1)} + ${b}`, [pw(a * n, n - 1), `${pw(a * n, n - 1)} + ${b}x`, `${pw(a * (n - 1), n - 1)} + ${b}`], `Differentiate each term: the first gives ${pw(a * n, n - 1)}, and the derivative of ${b}x is ${b}.`, r); }
      const a = ri(r, 2, 5), n = ri(r, 2, 4), k = ri(r, 2, 3);
      return build(`If f(x) = ${pw(a, n)}, what is f′(${k})?`, a * n * Math.pow(k, n - 1), [a * n * Math.pow(k, n), a * (n - 1) * Math.pow(k, n - 1), a * Math.pow(k, n - 1)], `f′(x) = ${pw(a * n, n - 1)}. Substitute x = ${k}: ${a * n} × ${k}^${n - 1} = ${a * n * Math.pow(k, n - 1)}.`, r);
    },
    Integration(d, r) {
      const n = ri(r, 1, 3), m = ri(r, 1, 5), a = m * (n + 1), k = ri(r, d === 'hard' ? 2 : 1, 3);
      if (d === 'easy') return build(`Evaluate ∫ ${pw(a, n)} dx.`, `${pw(m, n + 1)} + C`, [`${pw(a, n + 1)} + C`, `${pw(m, n)} + C`, `${pw(a * (n + 1), n + 1)} + C`], `∫ xⁿ dx = xⁿ⁺¹/(n+1). Here ${a}/${n + 1} = ${m}, so the answer is ${pw(m, n + 1)} + C.`, r);
      if (d === 'medium') return build(`Evaluate ∫ from 0 to ${k} of ${pw(a, n)} dx.`, m * Math.pow(k, n + 1), [a * Math.pow(k, n + 1), m * Math.pow(k, n), m * Math.pow(k, n + 1) + m], `Antiderivative is ${pw(m, n + 1)}. At x = ${k} it is ${m * Math.pow(k, n + 1)}, and at 0 it is 0.`, r);
      return build(`Evaluate ∫ from 1 to ${k} of ${pw(a, n)} dx.`, m * (Math.pow(k, n + 1) - 1), [m * Math.pow(k, n + 1), a * (Math.pow(k, n + 1) - 1), m * (Math.pow(k, n) - 1)], `Antiderivative ${pw(m, n + 1)}: ${m}(${Math.pow(k, n + 1)} − 1) = ${m * (Math.pow(k, n + 1) - 1)}.`, r);
    },
    Probability(d, r) {
      if (d === 'easy') { const m = ri(r, 1, 4); return build(`A fair six-sided die is rolled. What is the probability of a number greater than ${m}?`, fr(6 - m, 6), [fr(m, 6), fr(7 - m, 6), fr(5 - m, 6)], `Favourable outcomes: ${6 - m} (${Array.from({ length: 6 - m }, (_, i) => m + 1 + i).join(', ')}) out of 6, so ${fr(6 - m, 6)}.`, r); }
      if (d === 'medium') { const n = ri(r, 2, 4); return build(`${n} fair coins are tossed together. What is the probability that all show heads?`, `1/${Math.pow(2, n)}`, [`1/${Math.pow(2, n) - 1}`, `1/${Math.pow(2, n + 1)}`, `${n}/${Math.pow(2, n)}`], `Each coin gives heads with probability 1/2, and tosses are independent: (1/2)^${n} = 1/${Math.pow(2, n)}.`, r); }
      const p = ri(r, 2, 5) / 10, q = ri(r, 2, 5) / 10;
      return build(`A and B are independent with P(A) = ${p} and P(B) = ${q}. Find P(A or B).`, nf(p + q - p * q), [nf(p + q), nf(p * q), nf((p + q) / 2)], `P(A∪B) = P(A) + P(B) − P(A)P(B) = ${p} + ${q} − ${nf(p * q)} = ${nf(p + q - p * q)}.`, r);
    },
    'Quadratic equations'(d, r) {
      if (d === 'easy') { const r1 = ri(r, 1, 6), r2 = ri(r, 1, 6), S = r1 + r2, Pd = r1 * r2; return build(`For x² − ${S}x + ${Pd} = 0, what is the sum of the roots?`, S, [Pd, S + Pd, -S], `For x² + bx + c = 0 the sum of roots is −b. Here b = −${S}, so the sum is ${S}.`, r); }
      if (d === 'medium') { const r1 = ri(r, 1, 7), r2 = ri(r, 1, 7) + 7 - 0, S = r1 + r2, Pd = r1 * r2; return build(`The equation x² − ${S}x + ${Pd} = 0 has two real roots. What is the larger root?`, Math.max(r1, r2), [Math.min(r1, r2), S, Pd], `The roots multiply to ${Pd} and add to ${S}: they are ${r1} and ${r2}. The larger is ${Math.max(r1, r2)}.`, r); }
      const a = ri(r, 1, 3), b = ri(r, 3, 9), c = ri(r, 1, 4);
      return build(`Find the discriminant of ${a}x² + ${b}x + ${c} = 0.`, b * b - 4 * a * c, [b * b + 4 * a * c, b * b - 2 * a * c, 4 * a * c - b * b], `D = b² − 4ac = ${b * b} − ${4 * a * c} = ${b * b - 4 * a * c}.`, r);
    }
  },
  Physics: {
    Kinematics(d, r) {
      if (d === 'easy') { const u = ri(r, 0, 10), a = ri(r, 1, 5), t = ri(r, 2, 6); return build(`A body starts at ${u} m/s and accelerates uniformly at ${a} m/s² for ${t} s. Final speed?`, `${u + a * t} m/s`, [`${u + a + t} m/s`, `${a * t} m/s`, `${u * a * t} m/s`], `v = u + at = ${u} + ${a}×${t} = ${u + a * t} m/s.`, r); }
      if (d === 'medium') { const a = 2 * ri(r, 1, 3), t = ri(r, 2, 5), u = ri(r, 0, 6); return build(`A body with u = ${u} m/s and a = ${a} m/s² moves for ${t} s. Distance covered?`, `${u * t + a * t * t / 2} m`, [`${u * t + a * t * t} m`, `${u * t} m`, `${(u + a) * t} m`], `s = ut + ½at² = ${u * t} + ½×${a}×${t * t} = ${u * t + a * t * t / 2} m.`, r); }
      const a = 2 * ri(r, 1, 3), m = ri(r, 2, 5), u = a * m;
      return build(`A car moving at ${u} m/s brakes with constant deceleration ${a} m/s². Stopping distance?`, `${a * m * m / 2} m`, [`${a * m * m} m`, `${m} m`, `${u * m} m`], `v² = u² − 2as with v = 0: s = u²/(2a) = ${u * u}/${2 * a} = ${a * m * m / 2} m.`, r);
    },
    "Ohm's law"(d, r) {
      if (d === 'easy') { const I = ri(r, 1, 5), R = ri(r, 2, 10); return build(`A current of ${I} A flows through a ${R} Ω resistor. Voltage across it?`, `${I * R} V`, [`${I + R} V`, `${nf(R / I)} V`, `${nf(I / R)} V`], `V = IR = ${I} × ${R} = ${I * R} V.`, r); }
      if (d === 'medium') { const R = ri(r, 2, 8), I = ri(r, 1, 6); return build(`A ${R * I} V supply is connected to a ${R} Ω resistor. Current?`, `${I} A`, [`${R * I * R} A`, `${R + I} A`, `${nf(R / (R * I))} A`], `I = V/R = ${R * I}/${R} = ${I} A.`, r); }
      const R1 = ri(r, 1, 4), R2 = ri(r, 1, 4), R3 = ri(r, 1, 4), I = ri(r, 1, 4), S = R1 + R2 + R3;
      return build(`Resistors of ${R1} Ω, ${R2} Ω and ${R3} Ω are in series across ${S * I} V. Current?`, `${I} A`, [`${nf(S * I / R1)} A`, `${S * I * S} A`, `${S} A`], `Series resistance = ${S} Ω, so I = V/R = ${S * I}/${S} = ${I} A.`, r);
    }
  },
  Chemistry: {
    'Mole concept'(d, r) {
      const subs = [['H₂O', 18], ['CO₂', 44], ['O₂', 32], ['CH₄', 16], ['NaOH', 40]], [f, M] = subs[ri(r, 0, 4)], k = ri(r, 1, 5);
      if (d === 'easy') return build(`How many moles are in ${M * k} g of ${f}? (molar mass ${M} g/mol)`, `${k} mol`, [`${k + 1} mol`, `${k * 2} mol`, `${M * k * M} mol`], `moles = mass ÷ molar mass = ${M * k} ÷ ${M} = ${k}.`, r);
      if (d === 'medium') return build(`What is the mass of ${k} mol of ${f}? (molar mass ${M} g/mol)`, `${M * k} g`, [`${M + k} g`, `${nf(k / M)} g`, `${M * k * 2} g`], `mass = moles × molar mass = ${k} × ${M} = ${M * k} g.`, r);
      return build(`How many molecules are in ${k} mol of ${f}? (Avogadro’s number = 6.022 × 10²³)`, `${k} × 6.022 × 10²³`, [`${k} × 6.022 × 10²²`, `${k} × 6.022 × 10²⁴`, `${k * M} × 6.022 × 10²³`], `Number of molecules = moles × Avogadro’s number = ${k} × 6.022 × 10²³.`, r);
    },
    'pH and acids'(d, r) {
      const k = ri(r, 1, 6);
      if (d === 'easy') return build(`A strong acid has [H⁺] = 10⁻${k} M. What is its pH?`, `${k}`, [`${14 - k}`, `${-k}`, `${k + 1}`], `pH = −log[H⁺] = −log(10⁻${k}) = ${k}.`, r);
      if (d === 'medium') return build(`A strong base solution has [OH⁻] = 10⁻${k} M at 25 °C. What is its pH?`, `${14 - k}`, [`${k}`, `${7 - k}`, `${14 + k}`], `pOH = ${k}, and pH + pOH = 14, so pH = ${14 - k}.`, r);
      const a = ri(r, 1, 3), b = a + ri(r, 1, 3);
      return build(`How many times higher is [H⁺] at pH ${a} than at pH ${b}?`, `${Math.pow(10, b - a)}`, [`${b - a}`, `${10 * (b - a)}`, `${Math.pow(2, b - a)}`], `Each pH unit is a factor of 10, so the ratio is 10^${b - a} = ${Math.pow(10, b - a)}.`, r);
    }
  },
  'Computer Science': {
    'Number systems'(d, r) {
      if (d === 'easy') { const n = ri(r, 3, 15); return build(`Convert binary ${n.toString(2)} to decimal.`, n, [n + 1, n - 1, n * 2], `Add place values of the 1s: ${n.toString(2)}₂ = ${n}.`, r); }
      if (d === 'medium') { const n = ri(r, 8, 31); return build(`Convert decimal ${n} to binary.`, n.toString(2), [(n + 1).toString(2), (n - 1).toString(2), (n + 2).toString(2)], `Repeatedly divide by 2 and read the remainders upwards: ${n} = ${n.toString(2)}₂.`, r); }
      const h = ri(r, 16, 255); return build(`Convert hexadecimal ${h.toString(16).toUpperCase()} to decimal.`, h, [h + 16, h - 16, h + 1], `${h.toString(16).toUpperCase()}₁₆ = ${h} in decimal (16 × first digit + second digit).`, r);
    },
    'Loops and arrays'(d, r) {
      if (d === 'easy') { const a = ri(r, 0, 5), b = a + ri(r, 4, 10); return build(`How many times does \`for i in range(${a}, ${b})\` run?`, b - a, [b - a + 1, b - a - 1, b], `range(${a}, ${b}) gives ${b - a} values (the end is excluded).`, r); }
      if (d === 'medium') { const a = ri(r, 0, 3), st = ri(r, 2, 4), b = a + st * ri(r, 3, 6) + ri(r, 1, st - 1); return build(`How many times does \`for i in range(${a}, ${b}, ${st})\` run?`, Math.ceil((b - a) / st), [Math.floor((b - a) / st), b - a, Math.ceil((b - a) / st) + 1], `Count = ceil((${b} − ${a}) / ${st}) = ${Math.ceil((b - a) / st)}.`, r); }
      const arr = Array.from({ length: 5 }, () => ri(r, 1, 9)), ev = arr.filter(x => x % 2 === 0), od = arr.filter(x => x % 2);
      const sum = ev.reduce((s, x) => s + x, 0);
      return build(`For the list [${arr.join(', ')}], what is the sum of its even numbers?`, sum, [od.reduce((s, x) => s + x, 0), arr.reduce((s, x) => s + x, 0), ev.length], `Even numbers: ${ev.length ? ev.join(' + ') : 'none'} = ${sum}.`, r);
    }
  }
};
C.generateQuestion = (subject, topic, diff = 'medium', rng = Math.random) => {
  const g = GEN[subject]; if (!g) return null;
  const t = C.genTopic(subject, topic); if (!t || !g[t]) return null;   // no template: never fake a question
  const q = g[t](['easy', 'medium', 'hard'].includes(diff) ? diff : 'medium', rng);
  return { ...q, subject, topic, diff, label: 'Generated practice question (template-based). Not an official exam question.' };
};


/* ---------- syllabus by class and subject (typical CBSE/NCERT chapter lists) ----------
   Topic lists are a guide. Boards differ, so students should check their own board's syllabus. */
C.levelKey = level => (['c9', 'c10', 'c11', 'c12'].includes(level) ? level : level === 'c12done' ? 'c12' : 'c12');
C.SYLLABUS = {
  c9: {
    Mathematics: ['Number Systems', 'Polynomials', 'Coordinate Geometry', 'Linear Equations in Two Variables', 'Introduction to Euclid’s Geometry', 'Lines and Angles', 'Triangles', 'Quadrilaterals', 'Circles', 'Heron’s Formula', 'Surface Areas and Volumes', 'Statistics'],
    Physics: ['Motion', 'Force and Laws of Motion', 'Gravitation', 'Work and Energy', 'Sound'],
    Chemistry: ['Matter in Our Surroundings', 'Is Matter Around Us Pure?', 'Atoms and Molecules', 'Structure of the Atom'],
    'Computer Science': ['Computer Basics and Hardware', 'Software and Operating Systems', 'Number Systems', 'Internet and Online Safety', 'Word Processing and Presentations', 'Spreadsheet Basics']
  },
  c10: {
    Mathematics: ['Real Numbers', 'Polynomials', 'Pair of Linear Equations in Two Variables', 'Quadratic Equations', 'Arithmetic Progressions', 'Triangles', 'Coordinate Geometry', 'Introduction to Trigonometry', 'Some Applications of Trigonometry', 'Circles', 'Areas Related to Circles', 'Surface Areas and Volumes', 'Statistics', 'Probability'],
    Physics: ['Light: Reflection and Refraction', 'The Human Eye and the Colourful World', 'Electricity', 'Magnetic Effects of Electric Current'],
    Chemistry: ['Chemical Reactions and Equations', 'Acids, Bases and Salts', 'Metals and Non-metals', 'Carbon and Its Compounds'],
    'Computer Science': ['Computer Basics and Hardware', 'Number Systems', 'Internet and Web Basics', 'Spreadsheet Functions', 'Introduction to Programming']
  },
  c11: {
    Mathematics: ['Sets', 'Relations and Functions', 'Trigonometric Functions', 'Complex Numbers and Quadratic Equations', 'Linear Inequalities', 'Permutations and Combinations', 'Binomial Theorem', 'Sequences and Series', 'Straight Lines', 'Conic Sections', 'Introduction to Three Dimensional Geometry', 'Limits and Derivatives', 'Statistics', 'Probability'],
    Physics: ['Units and Measurements', 'Motion in a Straight Line', 'Motion in a Plane', 'Laws of Motion', 'Work, Energy and Power', 'System of Particles and Rotational Motion', 'Gravitation', 'Mechanical Properties of Solids', 'Mechanical Properties of Fluids', 'Thermal Properties of Matter', 'Thermodynamics', 'Kinetic Theory', 'Oscillations', 'Waves'],
    Chemistry: ['Some Basic Concepts of Chemistry', 'Structure of Atom', 'Classification of Elements and Periodicity', 'Chemical Bonding and Molecular Structure', 'Thermodynamics', 'Equilibrium', 'Redox Reactions', 'Organic Chemistry: Basic Principles and Techniques', 'Hydrocarbons'],
    'Computer Science': ['Computer System and Organisation', 'Number Systems', 'Encoding Schemes and Boolean Logic', 'Python Basics', 'Python: Loops and Lists', 'Python: Strings, Tuples and Dictionaries', 'Society, Law and Ethics']
  },
  c12: {
    Mathematics: ['Relations and Functions', 'Inverse Trigonometric Functions', 'Matrices', 'Determinants', 'Continuity and Differentiability', 'Applications of Derivatives', 'Integrals', 'Applications of Integrals', 'Differential Equations', 'Vector Algebra', 'Three Dimensional Geometry', 'Linear Programming', 'Probability'],
    Physics: ['Electric Charges and Fields', 'Electrostatic Potential and Capacitance', 'Current Electricity', 'Moving Charges and Magnetism', 'Magnetism and Matter', 'Electromagnetic Induction', 'Alternating Current', 'Electromagnetic Waves', 'Ray Optics and Optical Instruments', 'Wave Optics', 'Dual Nature of Radiation and Matter', 'Atoms', 'Nuclei', 'Semiconductor Electronics'],
    Chemistry: ['Solutions', 'Electrochemistry', 'Chemical Kinetics', 'The d- and f-Block Elements', 'Coordination Compounds', 'Haloalkanes and Haloarenes', 'Alcohols, Phenols and Ethers', 'Aldehydes, Ketones and Carboxylic Acids', 'Amines', 'Biomolecules'],
    'Computer Science': ['Python Revision Tour', 'Functions', 'File Handling', 'Data Structures: Stack', 'Computer Networks', 'Database Management and SQL', 'Interface Python with SQL']
  }
};
C.syllabus = (level, subject) => ((C.SYLLABUS[C.levelKey(level)] || {})[subject] || []).slice();
/* Practice questions are generated only where a template exists. These syllabus topics map onto an existing template. */
C.GEN_ALIAS = {
  Mathematics: { 'Continuity and Differentiability': 'Differentiation', 'Limits and Derivatives': 'Differentiation', Integrals: 'Integration', Probability: 'Probability', 'Quadratic Equations': 'Quadratic equations' },
  Physics: { Motion: 'Kinematics', 'Motion in a Straight Line': 'Kinematics', Electricity: "Ohm's law", 'Current Electricity': "Ohm's law" },
  Chemistry: { 'Atoms and Molecules': 'Mole concept', 'Some Basic Concepts of Chemistry': 'Mole concept', 'Acids, Bases and Salts': 'pH and acids', Equilibrium: 'pH and acids' },
  'Computer Science': { 'Number Systems': 'Number systems', 'Python: Loops and Lists': 'Loops and arrays' }
};
C.genTopic = (subject, topic) => { const list = C.SUBJECT_TOPICS[subject] || []; return list.includes(topic) ? topic : ((C.GEN_ALIAS[subject] || {})[topic] || null); };

/* ---------- health: recipes & safety ---------- */
C.ALLERGENS = ['milk', 'gluten (wheat)', 'peanuts', 'tree nuts', 'soy', 'sesame', 'eggs', 'mustard', 'legumes (dals, chickpeas)'];
C.RECIPES = [
  { id: 'idli', name: 'Idli with sambar', time: '35 min (batter fermented 8–12 h beforehand)', diet: 'veg', main: ['idli batter', 'toor dal', 'vegetables', 'tamarind', 'sambar powder'], allergens: ['legumes (dals, chickpeas)', 'mustard'],
    ingredients: ['Idli batter (idli rice + urad dal) 2 cups', 'Toor dal ½ cup', 'Mixed vegetables 1 cup', 'Tamarind, a small piece', 'Sambar powder 1½ tbsp', 'Mustard seeds, curry leaves, salt, a little oil'],
    steps: ['Steam idli batter in greased idli moulds for 10–12 minutes.', 'Pressure-cook toor dal with turmeric until soft, then mash.', 'Boil vegetables with tamarind water and sambar powder, add dal, simmer 8 minutes.', 'Temper mustard seeds and curry leaves in oil and pour over sambar.'],
    subs: ['No ready batter: use store-bought idli batter or instant rava idli mix (contains wheat).', 'No sambar powder: dry-roast coriander seeds, red chilli and a little methi.'] },
  { id: 'dosa', name: 'Plain dosa with coconut chutney', time: '25 min (batter fermented beforehand)', diet: 'veg', main: ['dosa batter', 'idli batter', 'coconut', 'roasted chana dal', 'green chilli'], allergens: ['legumes (dals, chickpeas)'],
    ingredients: ['Dosa batter 2 cups', 'Oil for the tawa', 'Grated coconut ½ cup', 'Roasted chana dal 2 tbsp', 'Green chilli 1–2, salt'],
    steps: ['Heat a tawa and spread a ladle of batter in a thin circle.', 'Drizzle a little oil around the edge and cook until golden and crisp.', 'Grind coconut, roasted chana dal, chilli and salt with water into chutney.'],
    subs: ['No roasted chana dal: use a small piece of roasted peanut only if there is no peanut allergy, or skip it.'] },
  { id: 'ricedal', name: 'Rice and dal', time: '30 min', diet: 'veg', main: ['rice', 'toor dal', 'turmeric', 'ghee', 'cumin', 'garlic'], allergens: ['legumes (dals, chickpeas)', 'milk'],
    ingredients: ['Rice 1 cup', 'Toor dal ½ cup', 'Turmeric ¼ tsp, salt', 'Ghee or oil 1 tsp', 'Cumin ½ tsp, garlic 2 cloves'],
    steps: ['Cook rice and keep warm.', 'Pressure-cook dal with turmeric until very soft and mash.', 'Temper cumin and sliced garlic in ghee or oil and pour over the dal.', 'Serve dal over rice with a squeeze of lemon.'],
    subs: ['Milk-free: use oil instead of ghee.', 'No toor dal: moong dal cooks faster.'] },
  { id: 'poriyal', name: 'Simple vegetable poriyal', time: '20 min', diet: 'veg', main: ['beans', 'carrot', 'cabbage', 'coconut', 'mustard seeds', 'urad dal'], allergens: ['mustard', 'legumes (dals, chickpeas)'],
    ingredients: ['Chopped beans, carrot or cabbage 2 cups', 'Grated coconut 3 tbsp', 'Mustard seeds ½ tsp, urad dal ½ tsp', 'Curry leaves, oil 1 tsp, salt'],
    steps: ['Temper mustard seeds and urad dal in oil with curry leaves.', 'Add vegetables, salt and a splash of water, cover and cook 8–10 minutes.', 'Stir in coconut and cook 2 more minutes.'],
    subs: ['No coconut: skip it or add a little lemon juice.', 'Mustard allergy: temper with cumin instead.'] },
  { id: 'curdrice', name: 'Curd rice', time: '15 min', diet: 'veg', main: ['rice', 'curd', 'milk', 'mustard seeds', 'curry leaves', 'ginger', 'green chilli'], allergens: ['milk', 'mustard'],
    ingredients: ['Cooked soft rice 1 cup', 'Curd 1 cup, a splash of milk', 'Salt', 'Mustard seeds, curry leaves, ginger, green chilli, a little oil'],
    steps: ['Mash warm rice lightly and let it cool a little.', 'Mix in curd, a splash of milk and salt.', 'Temper mustard seeds, curry leaves, ginger and chilli, then stir in.', 'Rest 10 minutes so flavours blend.'],
    subs: ['Dairy-free: a plain unsweetened plant-based curd, if tolerated (check its allergens).'] },
  { id: 'sundal', name: 'Chickpea sundal', time: '20 min (+ soaking overnight)', diet: 'veg', main: ['chickpeas', 'channa', 'coconut', 'mustard seeds', 'curry leaves', 'green chilli'], allergens: ['legumes (dals, chickpeas)', 'mustard'],
    ingredients: ['Chickpeas 1 cup (soaked overnight)', 'Grated coconut 3 tbsp', 'Mustard seeds ½ tsp, curry leaves', 'Green chilli 1, oil 1 tsp, salt'],
    steps: ['Pressure-cook soaked chickpeas with salt until soft, then drain.', 'Temper mustard seeds, curry leaves and chilli in oil.', 'Toss in chickpeas and coconut for 2 minutes.'],
    subs: ['Use green gram or black-eyed peas instead of chickpeas.', 'Mustard allergy: use cumin for tempering.'] },
  { id: 'upma', name: 'Vegetable upma', time: '20 min', diet: 'veg', main: ['rava', 'semolina', 'onion', 'carrot', 'beans', 'mustard seeds', 'ginger'], allergens: ['gluten (wheat)', 'mustard', 'legumes (dals, chickpeas)'],
    ingredients: ['Rava (semolina) 1 cup', 'Chopped onion, carrot, beans 1 cup', 'Mustard seeds, chana dal ½ tsp, curry leaves, ginger', 'Water 2½ cups, oil 1 tbsp, salt'],
    steps: ['Dry-roast rava until fragrant and set aside.', 'Temper mustard seeds, chana dal, curry leaves and ginger; sauté vegetables.', 'Add hot water and salt, bring to a boil, then stream in rava while stirring.', 'Cover and cook on low for 3–4 minutes.'],
    subs: ['Gluten-free: millet or rice rava (check packaging for cross-contamination).'] },
  { id: 'lemonrice', name: 'Lemon rice', time: '15 min', diet: 'veg', main: ['rice', 'lemon', 'peanuts', 'mustard seeds', 'turmeric', 'curry leaves', 'chana dal'], allergens: ['peanuts', 'mustard', 'legumes (dals, chickpeas)'],
    ingredients: ['Cooked rice 1½ cups', 'Lemon juice 1½ tbsp', 'Peanuts 1 tbsp, chana dal ½ tsp', 'Mustard seeds, turmeric, curry leaves, oil, salt'],
    steps: ['Temper mustard seeds, chana dal and peanuts in oil until golden.', 'Add curry leaves and turmeric, then switch off the heat.', 'Mix in rice, salt and lemon juice gently.'],
    subs: ['Peanut-free: roasted pumpkin seeds or just omit.'] },
  { id: 'khichdi', name: 'Vegetable khichdi', time: '30 min', diet: 'veg', main: ['rice', 'moong dal', 'vegetables', 'turmeric', 'cumin', 'ghee'], allergens: ['legumes (dals, chickpeas)', 'milk'],
    ingredients: ['Rice ½ cup, moong dal ½ cup', 'Chopped vegetables 1 cup', 'Turmeric ¼ tsp, cumin ½ tsp, salt', 'Ghee or oil 1 tsp'],
    steps: ['Rinse rice and dal together.', 'Temper cumin in ghee, add vegetables, rice, dal, turmeric, salt and 3 cups water.', 'Pressure-cook for 3–4 whistles until soft and porridge-like.'],
    subs: ['Milk-free: use oil.', 'No moong dal: use masoor dal.'] },
  { id: 'rasam', name: 'Tomato rasam with rice', time: '20 min', diet: 'veg', main: ['tomato', 'tamarind', 'garlic', 'pepper', 'rice', 'rasam powder'], allergens: ['mustard'],
    ingredients: ['Tomatoes 2', 'Tamarind a small piece', 'Garlic 3 cloves, pepper ½ tsp, rasam powder 1 tsp', 'Mustard seeds, curry leaves, oil, salt', 'Cooked rice to serve'],
    steps: ['Boil mashed tomato with tamarind water, garlic, pepper and salt for 8 minutes.', 'Temper mustard seeds and curry leaves and pour over.', 'Serve hot with rice.'],
    subs: ['Mustard allergy: temper with cumin.'] },
  { id: 'bhurji', name: 'Egg bhurji with chapati', time: '15 min', diet: 'egg', main: ['egg', 'eggs', 'onion', 'tomato', 'turmeric', 'chapati'], allergens: ['eggs', 'gluten (wheat)'],
    ingredients: ['Eggs 2', 'Onion 1, tomato 1', 'Turmeric a pinch, salt, green chilli', 'Oil 1 tsp, chapati to serve'],
    steps: ['Sauté onion, chilli and tomato in oil until soft.', 'Add turmeric, salt and beaten eggs, and stir gently until just set.', 'Serve with chapati.'],
    subs: ['Egg-free: crumble firm paneer or tofu (check allergens) instead of eggs.'] }
];
C.findRecipes = ({ have = [], allergies = [], diet = '' } = {}) => {
  const al = allergies.map(a => a.toLowerCase()); let excluded = 0; const pool = [];
  C.RECIPES.forEach(r => {
    const dietBad = (diet === 'vegetarian' && r.diet === 'egg') || (diet === 'vegan' && (r.diet === 'egg' || r.allergens.includes('milk')));
    if (dietBad) return;
    if (r.allergens.some(a => al.includes(a.toLowerCase()))) { excluded++; return; }
    pool.push(r);
  });
  const toks = have.map(h => h.trim().toLowerCase()).filter(Boolean);
  const rows = pool.map(r => { const matched = r.main.filter(m => toks.some(t => m.includes(t) || t.includes(m))); return { r, matched, missing: r.main.filter(m => !matched.includes(m)) }; });
  return { matches: toks.length ? rows.filter(x => x.matched.length).sort((a, b) => b.matched.length - a.matched.length || a.missing.length - b.missing.length) : rows, excluded };
};
C.healthSafetyCheck = t => {
  t = String(t || '').toLowerCase();
  if (/(suicid|kill myself|end my life|self[- ]?harm|hurt myself|want to die)/.test(t)) return 'selfharm';
  if (/(chest pain|can'?t breathe|cannot breathe|difficulty breathing|short(ness)? of breath|faint|passed out|unconscious|seizure|swelling (of|in) (the )?(face|throat|lips)|vomiting blood|won'?t stop bleeding|poison|overdose|severe allergic)/.test(t)) return 'urgent';
  if (/(starv|crash diet|skip(ping)? (all )?meals|only water|purg|lose \d+ ?kg)/.test(t)) return 'extreme-diet';
  if (/(fever|pain|dizz|headache|vomit|diarrh|rash|cough|infection|swollen|not eating|can'?t sleep|insomnia|panic)/.test(t)) return 'concern';
  return null;
};

/* ---------- official marks (written only by an approved educator, read-only for students) ---------- */
C.validateMark = m => {
  const e = {}, sc = Number(m.score), mx = Number(m.max);
  if (!String(m.subject || '').trim()) e.subject = 'Enter the subject.';
  if (!String(m.exam || '').trim()) e.exam = 'Enter the assessment name.';
  if (!(mx >= 1 && mx <= 1000)) e.max = 'Maximum marks must be between 1 and 1000.';
  if (!(m.score !== '' && m.score != null && sc >= 0 && sc <= mx)) e.score = 'Marks must be between 0 and the maximum.';
  return e;
};
/* ---------- consent-aware views for other roles (the privacy filter) ---------- */
const planCounts = D => { const s = (D.sessions || []).filter(x => x.type !== 'Break'); return { planDone: s.filter(x => x.done).length, planTotal: s.length }; };
C.canView = (actor, D, role) => !!(actor && D && (D.links || []).some(l => l.uid === actor.id && l.status === 'approved' && l.role === role) && actor.role === role);
C.parentView = (D, today) => {
  const sh = D.share || {}, out = { name: D.profile.name };
  if (sh.parentAcademic) {
    const o = C.overallStats(D.attempts || []), g = D.goals || [];
    out.academic = { ...planCounts(D), attempted: o.attempted, accuracy: o.accuracy, goalsDone: g.filter(x => x.done).length, goalsTotal: g.length, weak: C.weakTopics(D.attempts || []).map(t => t.topic) };
  }
  if (sh.parentExams) out.exams = (D.exams || []).map(e => ({ name: e.name, date: e.date, days: C.daysBetween(today, e.date) })).filter(x => x.days >= 0).sort((a, b) => a.days - b.days);
  if (sh.parentDeadlines) out.deadlines = Object.keys(D.saved || {}).map(id => { const s = C.scheme(id); const date = C.schemeDeadline(s, D); return { name: s.name, date, days: C.daysBetween(today, date) }; }).filter(x => x.days >= 0).sort((a, b) => a.days - b.days);
  if (sh.parentAcademic) out.marks = (D.marks || []).map(m => ({ subject: m.subject, exam: m.exam, score: m.score, max: m.max }));
  if (sh.parentAcademic) out.feedback = (D.feedback || []).map(f => ({ from: f.from, text: f.text, ts: f.ts }));
  return out;
};
C.educatorView = D => {
  if (!(D.share || {}).edu) return { name: D.profile.name, restricted: true };
  const o = C.overallStats(D.attempts || []);
  return { name: D.profile.name, restricted: false, academic: { ...planCounts(D), ...o, topics: C.topicStats(D.attempts || []) }, assigned: (D.tasks || []).filter(t => t.source === 'educator'), marks: D.marks || [], goalsDone: (D.goals || []).filter(g => g.done).map(g => g.t) };
};

/* Warden sees ONLY the student's name and hostel details, nothing academic or personal. */
C.wardenView = D => ({ name: D.profile.name, hostel: { room: (D.hostel || {}).room || '', bed: (D.hostel || {}).bed || '', token: (D.hostel || {}).token || '' } });

/* ---------- gender-based menstrual cycle tracker ---------- */
C.GENDERS = { female: 'Female', male: 'Male', undisclosed: 'Prefer not to say' };
C.canUseCycleTracker = p => !!p && p.gender === 'female' && p.puberty !== 'no';   // female students only; stays off if recorded as not yet reached puberty
C.validateCycleEntry = (e, today) => {
  const r = {}, iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso.test(e.start || '')) r.start = 'Enter the first day of the period.'; else if (e.start > today) r.start = 'The start date cannot be in the future.';
  if (e.end) { if (!iso.test(e.end)) r.end = 'Enter a valid end date.'; else if (e.end < e.start) r.end = 'The end date cannot be before the start.'; else if (C.daysBetween(e.start, e.end) > 14) r.end = 'A period usually lasts fewer than 15 days. Check the date.'; }
  return r;
};
C.cycleStats = list => {
  const starts = (list || []).map(x => x.start).sort(), gaps = [];
  for (let i = 1; i < starts.length; i++) gaps.push(C.daysBetween(starts[i - 1], starts[i]));
  if (gaps.length < 2) return null;                       // not enough cycles for any estimate
  const avg = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length), lo = Math.min(...gaps), hi = Math.max(...gaps), last = starts[starts.length - 1];
  return { cycles: gaps.length, avg, lo, hi, last, nextFrom: C.addDays(last, lo), nextTo: C.addDays(last, hi) };
};
/* ---------- hostel details (warden) ---------- */
C.validateHostel = h => {
  const e = {}, ok = v => /^[A-Za-z0-9][A-Za-z0-9 \-\/]{0,11}$/.test(String(v || '').trim());
  if (!ok(h.room)) e.room = 'Enter the room number (letters, numbers, - or /, up to 12 characters).';
  if (!ok(h.bed)) e.bed = 'Enter the bed number (up to 12 characters).';
  if (!ok(h.token)) e.token = 'Enter the token number (up to 12 characters).';
  return e;
};
C.sameHostel = (a, b) => ['room', 'bed', 'token'].every(k => String(a[k] || '').trim().toLowerCase() === String(b[k] || '').trim().toLowerCase());
/* ---------- mark trend (from official marks only) ---------- */
C.markTrend = marks => (marks || []).slice().sort((a, b) => a.ts - b.ts).map(m => ({ ts: m.ts, subject: m.subject, exam: m.exam, pct: Math.round((Number(m.score) / Number(m.max)) * 100) }));

/* ---------- achievements ---------- */
C.achievements = (D, today) => {
  const o = C.overallStats(D.attempts || []), st = C.streak(D.activity || [], today);
  return [
    { i: '🌱', n: 'First step', on: true }, { i: '🔥', n: '3-day streak', on: st >= 3 }, { i: '🧠', n: '20 questions practised', on: o.attempted >= 20 },
    { i: '🎯', n: 'Goal getter', on: (D.goals || []).some(g => g.done) }, { i: '📚', n: 'Plan champion', on: (D.sessions || []).filter(s => s.type !== 'Break').length > 0 && (D.sessions || []).filter(s => s.type !== 'Break').every(s => s.done) },
    { i: '💚', n: 'Wellness explorer', on: (D.well || []).length >= 5 }, { i: '📄', n: 'Docs champion', on: C.DOCS.every(d => (D.docs[d.id] || {}).status === 'have') }
  ];
};

/* ---------- data defaults ---------- */
C.newStudentData = (name, level, today) => ({
  v: 1, baseDate: today,
  profile: { name, level, gender: '', puberty: '', school: '', state: '', marks: '', income: '', course: '', goals: '', careers: '', learnPrefs: [], wellPrefs: [], schGoals: '' },
  marks: [], feedback: [], healthReports: [], hostel: { room: '', bed: '', token: '', by: '', ts: 0 }, cycle: [], medFiles: [],
  hub: { board: '', subjects: [], examGoals: [], difficult: [], mins: 120 },
  exams: [], focusAns: {}, savedExams: {}, files: [], sessions: [], lastPlanReview: '', attempts: [], tasks: [], challenges: { date: '', items: [] }, recState: {},
  well: [], meals: [], health: { allergies: [], diet: '', restrictions: '', records: [] },
  reminders: { enabled: false, water: { on: false, mins: 90 }, brk: { on: false, mins: 50 }, stretch: { on: false, mins: 60 }, back: { on: false }, pausedUntil: 0 },
  docs: Object.fromEntries(C.DOCS.map(d => [d.id, { status: 'get', note: '' }])), saved: {}, drafts: {}, agentLog: [], goals: [], activity: [],
  share: { parentAcademic: false, parentExams: false, parentDeadlines: false, edu: false, notifyEdu: false, pause: false, quiet: true },
  linkCode: C.makeLinkCode(name), links: [], inbox: []
});
C.mergeDefaults = (d, def) => {
  if (Array.isArray(def) || def === null || typeof def !== 'object') return d === undefined ? def : d;
  const o = { ...(d && typeof d === 'object' && !Array.isArray(d) ? d : {}) };
  Object.keys(def).forEach(k => { o[k] = C.mergeDefaults(o[k], def[k]); });
  return o;
};

return C;
});
