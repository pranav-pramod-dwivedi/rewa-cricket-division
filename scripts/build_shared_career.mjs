// Build Pranav's (and Akhil's) real 2020-2024 careers from ledger rows with rule-consistent scorecards.
// - Timeline: 2020 local Test+ODI (Rewa club players); 2021 RJ T20s + Destroyers v DE T20 (7, Akhil in DE);
//   2022 RJ, DE v DES, MP ODI (5), LSG A v LSG B (Pranav in LSG B); 2023 RJ, DE v DES, MP ODI (4),
//   MP A v MP B Tests (5); 2024 RJ, DE v DES, MP ODI (4), MP Tests (5), RCB A v RCB B (Nov 2/6/8).
//   Akhil also plays 2 MI A v MI B T20s (Nov 2024). No IPL.
// - Pranav bats #3/#6/#7 in every innings; Akhil (when playing) opens (#1).
// - Tests are proper two-innings matches (4 innings). ODI/T20 are single innings.
// - Real squads: RCB 2024, LSG 2022, MI 2024, plus Rewa local club players for 2020.
// - Career = 51 matches for Pranav (11 Test / 14 ODI / 26 T20 / 0 IPL).
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'data/records.json');
const db = JSON.parse(readFileSync(DATA, 'utf8'));

// ---------- purge prior generated career data ----------
const oldMatchIds = new Set(db.matches.filter((m) => /^m-(shared|akhil|pranav)-/.test(m.id)).map((m) => m.id));
const oldInnIds = new Set(db.innings.filter((i) => oldMatchIds.has(i.matchId)).map((i) => i.id));
db.matches = db.matches.filter((m) => !oldMatchIds.has(m.id));
db.innings = db.innings.filter((i) => !oldInnIds.has(i.id));
db.batting = db.batting.filter((b) => !oldInnIds.has(b.inningsId));
db.bowling = db.bowling.filter((w) => !oldInnIds.has(w.inningsId));
db.tournaments = db.tournaments.filter((t) => !t.id.startsWith('t-shared-'));
const GEN_TEAMS = new Set(['t-mp-a', 't-mp-b', 't-rj-a', 't-rj-b', 't-de', 't-des', 't-destroyers', 't-lsg-a', 't-lsg-b', 't-mi-a', 't-mi-b', 't-rcb-a', 't-rcb-b', 't-loc-a', 't-loc-b']);
db.teams = db.teams.filter((t) => !GEN_TEAMS.has(t.id));
db.players = db.players.filter((p) => !p.id.startsWith('p-club-'));

// ---------- player lookup / creation ----------
const P = 'p-pranav-dwivedi', A = 'p-akhil-mishra';
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const byName = new Map(db.players.map((p) => [p.name.toLowerCase(), p]));
const pid = (n) => { const p = byName.get(n.toLowerCase()); if (!p) throw new Error('missing player: ' + n); return p.id; };
function addPlayer(name, role, teamId) {
  const ex = byName.get(name.toLowerCase());
  if (ex) return ex.id;
  let base = slug(name); let id = `p-${base}`; let s = base; let k = 2;
  while (db.players.some((p) => p.id === id)) { s = `${base}-${k++}`; id = `p-${s}`; }
  const np = { id, name, slug: s, role: role || 'Player', teamId: teamId || null };
  db.players.push(np); byName.set(name.toLowerCase(), np);
  return id;
}
const MP_POOL = [
  'Rajat Patidar', 'Yash Dubey', 'Himanshu Mantri', 'Harsh Gawli', 'Aditya Shrivastava', 'Subhranshu Senapati',
  'Venkatesh Iyer', 'Saransh Jain', 'Shubham Sharma', 'Anubhav Agarwal', 'Avesh Khan', 'Kuldeep Sen',
  'Kumar Kartikeya', 'Kulwant Khejroliya', 'Arshad Khan', 'Rahul Batham',
].map(pid);
const RJ_POOL = [
  'Prithviraj Singh Tomar', 'Akshat Raghuwanshi', 'Atharv Mahajan', 'Sagar Pratap Singh', 'Anant Verma', 'Jaydev Singh',
  'Himanshu Mantri', 'Chanchal Rathore', 'Kanishk Dubey', 'Ajay Rohera', 'Sagar Solanki', 'Ankit Singh Kushwaha',
  'Naveen Singh Chouhan', 'Mohd Arham Aquil', 'Aryan Deshmukh', 'Saransh Surana', 'Ramveer Singh Gurjar', 'Ashwin Das',
  'Rohit Rajawat', 'Prabhanshu Shukla', 'Ritesh Shakya', 'Radhakrishna Dwivedi', 'Kuldeep Sen', 'Kumar Kartikeya',
  'Shivam Shukla', 'Mohd Arshad Khan', 'Kulwant Khejroliya', 'Amarjeet Kumar Singh',
].map(pid);
const COMBINED = [...new Set([...MP_POOL, ...RJ_POOL])];
const playerName = (id) => db.players.find((p) => p.id === id).name;

// real franchise squads (created if missing)
const RCB_2024 = [
  ['Virat Kohli', 'Batsman'], ['Rajat Patidar', 'Batsman'], ['Yash Dayal', 'Bowler'],
  ['Phil Salt', 'Wicketkeeper'], ['Jitesh Sharma', 'Wicketkeeper'], ['Tim David', 'Batsman'], ['Devdutt Padikkal', 'Batsman'], ['Swastik Chikara', 'Batsman'],
  ['Liam Livingstone', 'All-rounder'], ['Krunal Pandya', 'All-rounder'], ['Jacob Bethell', 'All-rounder'], ['Romario Shepherd', 'All-rounder'], ['Swapnil Singh', 'All-rounder'], ['Manoj Bhandage', 'All-rounder'],
  ['Josh Hazlewood', 'Bowler'], ['Bhuvneshwar Kumar', 'Bowler'], ['Rasikh Dar Salam', 'Bowler'], ['Suyash Sharma', 'Bowler'], ['Nuwan Thushara', 'Bowler'], ['Lungi Ngidi', 'Bowler'], ['Abhinandan Singh', 'Bowler'], ['Mohit Rathee', 'Bowler'],
].map(([n, r]) => addPlayer(n, r, 't-royal-challengers-bengaluru'));
const LSG_2022 = [
  ['KL Rahul', 'Wicketkeeper'], ['Quinton de Kock', 'Wicketkeeper'], ['Manish Pandey', 'Batsman'], ['Evin Lewis', 'Batsman'], ['Manan Vohra', 'Batsman'],
  ['Marcus Stoinis', 'All-rounder'], ['Deepak Hooda', 'All-rounder'], ['Krunal Pandya', 'All-rounder'], ['Jason Holder', 'All-rounder'], ['Krishnappa Gowtham', 'All-rounder'], ['Ayush Badoni', 'Batsman'], ['Kyle Mayers', 'All-rounder'], ['Karan Sharma', 'Batsman'],
  ['Ravi Bishnoi', 'Bowler'], ['Avesh Khan', 'Bowler'], ['Dushmantha Chameera', 'Bowler'], ['Mohsin Khan', 'Bowler'], ['Shahbaz Nadeem', 'Bowler'], ['Ankit Rajpoot', 'Bowler'], ['Mayank Yadav', 'Bowler'], ['Andrew Tye', 'Bowler'],
].map(([n, r]) => addPlayer(n, r, 't-lucknow-super-giants'));
const MI_2024 = [
  ['Jasprit Bumrah', 'Bowler'], ['Hardik Pandya', 'All-rounder'], ['Suryakumar Yadav', 'Batsman'], ['Rohit Sharma', 'Batsman'], ['Tilak Varma', 'Batsman'],
  ['Ryan Rickelton', 'Wicketkeeper'], ['Robin Minz', 'Wicketkeeper'], ['Bevon Jacobs', 'Batsman'], ['Krishnan Shrijith', 'Wicketkeeper'],
  ['Naman Dhir', 'All-rounder'], ['Will Jacks', 'All-rounder'], ['Mitchell Santner', 'All-rounder'], ['Raj Bawa', 'All-rounder'],
  ['Trent Boult', 'Bowler'], ['Deepak Chahar', 'Bowler'], ['Allah Ghazanfar', 'Bowler'], ['Karn Sharma', 'Bowler'], ['Ashwani Kumar', 'Bowler'], ['Reece Topley', 'Bowler'], ['Lizaad Williams', 'Bowler'], ['Arjun Tendulkar', 'Bowler'], ['Satyanarayana Raju', 'Bowler'], ['Vignesh Puthur', 'Bowler'],
].map(([n, r]) => addPlayer(n, r, 't-mumbai-indians'));
const LOCAL_POOL = [
  ['Lovkush Prajapati', 'All-rounder'], ['Chandan Sahni', 'Batsman'], ['Prasoon Yadav', 'Batsman'], ['Suresh Kumar Verma', 'Wicketkeeper'],
  ['Dr Shad Owaisi', 'All-rounder'], ['Rahul Dubey', 'All-rounder'], ['Saurabh Maurya', 'All-rounder'], ['Dr.Rituraj Purwar', 'Bowler'],
  ['Altaaf Mohammad', 'Batsman'], ['Saurabh Kushwaha', 'Batsman'], ['Rakesh Tiwari', 'Bowler'], ['Sat Singh', 'Batsman'],
  ['Sunil', 'Bowler'], ['Rahul Soni', 'Batsman'], ['Pradeep Lakhera', 'Bowler'], ['RO-KO', 'Batsman'],
  ['Zayed Khan', 'Batsman'], ['Anish', 'Batsman'], ['Prakash Bansal', 'Bowler'], ['Shailendra Gupta', 'All-rounder'],
  ['Deepu Soni', 'Wicketkeeper'], ['Vishnu Lakhera', 'Bowler'], ['Saurabh R', 'Bowler'], ['Vikram', 'Batsman'],
  ['Ravi Lakhera', 'Bowler'], ['Dhruv Singh Baghel', 'Batsman'], ['Ravi Kosta', 'Wicketkeeper'], ['Ajay Sen', 'Bowler'],
  ['Shubham Gupta', 'Bowler'], ['Asif Khan', 'Batsman'], ['Raj Gupta', 'Batsman'], ['Guddu Cricket', 'All-rounder'],
  ['Vasu', 'Bowler'], ['Amber Gupta', 'Bowler'], ['Lavkush', 'Batsman'], ['Manish Digwani', 'Batsman'],
  ['Aamil Khan', 'Batsman'], ['Akhil Tiwari', 'All-rounder'],
].map(([n, r]) => addPlayer(n, r, 't-loc-a'));
addPlayer('Made-up Player', 'Player', null); // last-resort fallback

// ---------- teams / tournaments ----------
const TEAMS = {
  't-mp-a': ['MP A', 'MP A'], 't-mp-b': ['MP B', 'MP B'],
  't-rj-a': ['RJ A', 'RJ A'], 't-rj-b': ['RJ B', 'RJ B'],
  't-de': ['DE', 'DE'], 't-des': ['DES', 'DES'],
  't-destroyers': ['Destroyers', 'Destroyers'],
  't-lsg-a': ['LSG A', 'LSG A'], 't-lsg-b': ['LSG B', 'LSG B'],
  't-mi-a': ['MI A', 'MI A'], 't-mi-b': ['MI B', 'MI B'],
  't-rcb-a': ['RCB A', 'RCB A'], 't-rcb-b': ['RCB B', 'RCB B'],
  't-loc-a': ['Rewa Local XI A', 'Local A'], 't-loc-b': ['Rewa Local XI B', 'Local B'],
};
for (const [id, [name, slug2]] of Object.entries(TEAMS)) if (!db.teams.some((t) => t.id === id)) db.teams.push({ id, name, slug: slug(slug2), shortCode: name, description: 'Intra-squad / trial side.', establishedYear: 2021 });
for (const [id, name, sc] of [['t-royal-challengers-bengaluru', 'Royal Challengers Bengaluru', 'RCB'], ['t-mumbai-indians', 'Mumbai Indians', 'MI'], ['t-madhya-pradesh', 'Madhya Pradesh', 'MP'], ['t-rewa-jaguars', 'Rewa Jaguars', 'RJ'], ['t-kkr', 'Kolkata Knight Riders', 'KKR'], ['t-lucknow-super-giants', 'Lucknow Super Giants', 'LSG']]) if (!db.teams.some((t) => t.id === id)) db.teams.push({ id, name, slug: slug(sc), shortCode: sc, description: '', establishedYear: 2021 });

const TOURS = {
  't-shared-loc-fc': ['Rewa District Local XI', 'First-class', 'local'],
  't-shared-loc-odi': ['Rewa District Local ODI', 'ODI', 'local'],
  't-shared-rj': ['RJ A v RJ B', 'T20', 'division'],
  't-shared-destroyers': ['Destroyers v DE T20 Cup', 'T20', 'division'],
  't-shared-de': ['DE v DES', 'T20', 'division'],
  't-shared-mp-odi': ['MP A v MP B ODI Series', 'ODI', 'state'],
  't-shared-mp': ['MP A v MP B', 'First-class', 'state'],
  't-shared-lsg': ['LSG A v LSG B', 'T20', 'ipl'],
  't-shared-rcb': ['RCB A v RCB B', 'T20', 'ipl'],
  't-shared-mi': ['MI A v MI B', 'T20', 'ipl'],
};
for (const [id, [name, fmt, scope]] of Object.entries(TOURS)) if (!db.tournaments.some((t) => t.id === id)) db.tournaments.push({ id, name, slug: slug(name), format: fmt, status: 'completed', category: 'official', scope, description: 'Intra-squad trial series.' });

// ---------- deterministic RNG ----------
function mulberry32(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(2026081151);
const ri = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

// ---------- ledger parsing ----------
const parse = (f, map) => readFileSync(join(ROOT, 'data', f), 'utf8').trim().split('\n').slice(1).map((l) => l.split(','))
  .map((c) => ({ seq: +c[map.seq], match: c[map.match], fmt: c[map.fmt], R: c[map.R] === 'DNB' || c[map.R] === '' ? null : +c[map.R], B: +c[map.B] || 0, f4: +c[map.f4] || 0, f6: +c[map.f6] || 0, dis: c[map.dis], O: c[map.O] === '-' || c[map.O] === '' || c[map.O] === 'DNB' ? null : c[map.O], M: +c[map.M] || 0, Rr: +c[map.Rr] || 0, W: +c[map.W] || 0, note: c[map.note] || '' }));
const PRANAV_MAP = { seq: 0, match: 2, fmt: 3, R: 4, B: 5, f4: 6, f6: 7, dis: 8, O: 9, M: 10, Rr: 11, W: 12, note: 13 };
const AKHIL_MAP = { seq: 0, match: 1, fmt: 3, R: 4, B: 5, f4: 6, f6: 7, dis: 9, O: 10, M: 11, Rr: 12, W: 13, note: 14 };
const P_ROWS = parse('pranav.career.csv', PRANAV_MAP);
const A_ROWS = parse('akhil.career.csv', AKHIL_MAP);
const lastN = (rows, f, n) => rows.filter((r) => r.fmt === f && r.R !== null).slice(-n);
const P_TEST = lastN(P_ROWS, 'Test', 11), P_ODI = lastN(P_ROWS, 'ODI', 14), P_T20 = lastN(P_ROWS, 'T20', 26);
const A_TEST = lastN(A_ROWS, 'Test', 10), A_ODI = lastN(A_ROWS, 'ODI', 12), A_T20 = lastN(A_ROWS, 'T20', 14);

// ---------- cricket helpers ----------
const canonOvers = (ov) => { const f = Math.floor(ov); return f + Math.round((ov - f) * 10) / 10; };
const legalBalls = (ov) => Math.floor(ov) * 6 + Math.round((ov - Math.floor(ov)) * 10);
const fmtParams = {
  Test: { maxOv: 90, extras: [12, 30], wkts: [6, 10] },
  ODI: { maxOv: 50, totalLo: 205, totalHi: 290, extras: [8, 20], wkts: [6, 10] },
  T20: { maxOv: 20, totalLo: 140, totalHi: 185, extras: [4, 13], wkts: [5, 10] },
};
const FICTIONAL = { Saini: 0, Vora: 1, Malhotra: 2, Tessitore: 3, Bedi: 4, 'S. Verma': 5, Verma: 5, 'A. Choubey': 6, 'R. Tiwari': 7, 'V. Tripathi': 8, 'N. Sen': 9, 'P. Baghel': 10, 'M. Patel': 11, 'K. Singh': 12, 'D. Yadav': 13, 'R. Prajapati': 14, 'S. Mishra': 15, 'T. Gupta': 16, 'L. Ahirwar': 17, 'B. Kushwaha': 18, 'G. Pateria': 19, 'H. Nema': 20 };
const FICT = Object.fromEntries(Object.entries(FICTIONAL).map(([k, v]) => [k.toLowerCase(), v]));
const hashStr = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return Math.abs(h); };
const lastWord = (n) => (n || '').trim().split(' ').pop().toLowerCase();
function resolveName(token, xiNames) {
  if (!token) return null;
  const last = lastWord(token);
  let idx = FICT[last];
  if (idx == null) idx = xiNames.findIndex((n) => lastWord(n) === last);
  if (idx == null || idx < 0) idx = hashStr(last) % xiNames.length;
  return xiNames[idx] || token;
}
const distinctOf = (names, pickName, notName) => {
  const pick = names.indexOf(pickName);
  let j = pick >= 0 ? pick : hashStr(pickName) % names.length;
  if (names[j] === notName) j = (j + 1) % names.length;
  return names[j];
};
function realisticDismissal(ledgerDis, xiNames) {
  if (!ledgerDis || ledgerDis === 'not out' || ledgerDis === '0') return null;
  const f = (t) => resolveName(t, xiNames);
  let s = ledgerDis.trim();
  s = s.replace(/^c & b (.+)$/, (_, b) => `c & b ${f(b)}`);
  s = s.replace(/^c ([^ ]+) b (.+)$/, (_, fl, b) => {
    const fm = f(fl); const bm = f(b);
    return `c ${fm} b ${bm === fm ? distinctOf(xiNames, fm, fm) : bm}`;
  });
  s = s.replace(/^lbw b (.+)$/, (_, b) => `lbw b ${f(b)}`);
  s = s.replace(/^b (.+)$/, (_, b) => `b ${f(b)}`);
  s = s.replace(/^st b ([^ ]+) \(wk ([^)]+)\)$/, (_, b, wk) => `st b ${f(b)} (wk ${f(wk)})`);
  s = s.replace(/^c (.+)$/, (_, fl) => `c ${f(fl)} b ${f(fl + ' bowl')}`);
  s = s.replace(/^run out (.+)$/, (_, r) => `run out ${f(r)}`);
  return s;
}
function genFillBat(runs, mult) {
  const f6 = clamp(Math.round(runs / 9), 0, Math.floor(runs / 6));
  const f4 = clamp(Math.round((runs - 6 * f6) / 4.5), 0, Math.floor((runs - 6 * f6) / 4));
  const lo = Math.max(1, f4 + f6);
  const balls = clamp(Math.round(runs * mult), lo, lo + Math.round(runs * mult) + 10);
  return { runs, balls, fours: f4, sixes: f6 };
}
function distributeSum(S, n) {
  const out = new Array(n).fill(0);
  let remaining = S;
  for (let k = 0; k < n - 1; k++) {
    const left = n - k - 1;
    const maxK = Math.min(95, Math.max(0, remaining - left));
    if (maxK <= 0) { out[k] = 0; continue; }
    const r = rnd();
    let v;
    if (r < 0.3) v = ri(0, Math.min(12, maxK));
    else if (r < 0.62) v = ri(10, Math.min(35, maxK));
    else if (r < 0.88) v = ri(28, Math.min(60, maxK));
    else v = ri(50, maxK);
    out[k] = clamp(v, 0, maxK);
    remaining -= out[k];
  }
  out[n - 1] = Math.max(0, Math.min(95, remaining));
  return out;
}
const disTypes = (fn, bn) => { const r = rnd(); if (r < 0.45) return `c ${fn} b ${bn}`; if (r < 0.7) return `b ${bn}`; if (r < 0.88) return `lbw b ${bn}`; return `st b ${bn} (wk ${fn})`; };
const srOf = (r, b) => (b ? +((r / b) * 100).toFixed(2) : 0);

// ---------- innings builder ----------
// battingSide = XI batting (includes its marquees); fieldingSide = XI bowling/fielding
function makeInnings(match, fmt, innId, battingSide, fieldingSide, marqueeCards, mode, chaseTarget) {
  const fp = fmtParams[fmt];
  const extras = ri(fp.extras[0], fp.extras[1]);
  let W;
  if (mode === 'test2') W = ri(5, 9);
  else if (mode === 'chase') W = ri(6, 10);
  else W = ri(fp.wkts[0], fp.wkts[1]);
  const marqNOs = marqueeCards.filter((c) => c.no).length;
  const marqDis = marqueeCards.filter((c) => c.dis).length;
  if (W < marqDis) W = Math.min(10, marqDis + ri(0, 2));
  const NO = W === 10 ? 1 : Math.min(2, 10 - W);
  const slots = W + NO;

  let total;
  if (mode === 'chase') total = Math.max(chaseTarget + (rnd() < 0.5 ? ri(1, 20) : -ri(5, 55)), extras + slots + marqueeCards.length);
  else if (fmt === 'Test') total = mode === 'test2' ? ri(170, 290) : ri(295, 430);
  else total = ri(fp.totalLo, fp.totalHi);
  const marqSum = marqueeCards.reduce((s, c) => s + c.runs, 0);
  total = Math.max(total, marqSum + extras + Math.max(0, slots - marqueeCards.length));
  const batSum = total - extras;
  const fillCount = slots - marqueeCards.length;
  const fills = distributeSum(Math.max(0, batSum - marqSum), fillCount);

  const fieldNames = fieldingSide.map(playerName);
  const free = shuffle(battingSide.filter((id) => !marqueeCards.some((c) => c.pid === id))).slice(0, fillCount);
  if (free.length < fillCount) throw new Error('not enough batters in XI');
  const slotsArr = new Array(slots).fill(null);
  for (const c of marqueeCards) slotsArr[Math.min(c.pos, slots) - 1] = c;
  let disLeft = W - marqDis;
  let noLeft = Math.max(0, NO - marqNOs);
  let fi = 0;
  for (let i = 0; i < slotsArr.length; i++) {
    if (slotsArr[i]) continue;
    const g = genFillBat(fills[fi], fmt === 'T20' ? 0.65 : fmt === 'ODI' ? 1.15 : 2.3);
    const isNO = noLeft > 0 && (disLeft === 0 || (rnd() < 0.2 && noLeft > 0));
    let dis = null, no = false;
    if (isNO) { no = true; noLeft--; }
    else { disLeft--; dis = disTypes(fieldNames[Math.floor(rnd() * fieldNames.length)], fieldNames[Math.floor(rnd() * fieldNames.length)]); }
    slotsArr[i] = { pid: free[fi++], g, dis, no, pos: i + 1 };
  }
  if (disLeft !== 0 || noLeft !== 0) throw new Error('batter slot mismatch');
  return {
    total, W, extras,
    cards: slotsArr.map((c) => c.g
      ? { pid: c.pid, runs: c.g.runs, balls: c.g.balls, fours: c.g.fours, sixes: c.g.sixes, dismissal: c.dis, notOut: c.no, strikeRate: srOf(c.g.runs, c.g.balls), position: c.pos }
      : { pid: c.pid, runs: c.runs, balls: c.balls, fours: c.fours, sixes: c.sixes, dismissal: c.dis, notOut: c.no, strikeRate: c.sr, position: c.pos }),
  };
}

// split one Test ledger row into two innings (batting + bowling)
function splitTestBat(row) {
  if (!row) return [];
  if (row.dis === 'not out') return [{ runs: row.R, balls: row.B, fours: row.f4, sixes: row.f6, dis: null, no: true, sr: srOf(row.R, row.B) }];
  const pct = 0.55 + rnd() * 0.2;
  let r1 = Math.round(row.R * pct);
  if (row.R > 0 && r1 === 0) r1 = 1;
  const b1 = Math.min(Math.max(0, Math.round(row.B * pct)), row.B);
  const f41 = Math.min(row.f4, Math.round(row.f4 * pct)), f61 = Math.min(row.f6, Math.round(row.f6 * pct));
  const r2 = row.R - r1;
  const cards = [{ runs: r1, balls: b1, fours: f41, sixes: f61, dis: row.dis, no: false, sr: srOf(r1, b1) }];
  if (r2 > 0) cards.push({ runs: r2, balls: Math.max(1, row.B - b1), fours: row.f4 - f41, sixes: row.f6 - f61, dis: null, no: true, sr: srOf(r2, Math.max(1, row.B - b1)) });
  return cards;
}
function splitTestBowl(row) {
  if (!row || row.O == null) return [null, null];
  const o = legalBalls(+row.O) / 6;
  const o1 = Math.max(1, Math.round(o * 0.55));
  const o2 = Math.max(0, o - o1);
  const w1 = row.W > 0 ? Math.max(1, Math.round(row.W * 0.55)) : 0;
  const r1 = Math.round(row.Rr * 0.55);
  const m1 = Math.min(row.M, Math.round(row.M * 0.55));
  return [
    { overs: canonOvers(o1), runs: r1, wickets: w1, maidens: m1 },
    o2 > 0 ? { overs: canonOvers(o2), runs: row.Rr - r1, wickets: row.W - w1, maidens: row.M - m1 } : null,
  ];
}

// ---------- match builder ----------
let seq = 1;
const seasonOf = (y) => ({ 2020: 's2020', 2021: 's2021', 2022: 's2022', 2023: 's-2023', 2024: 's-2024' }[y] || 's-2024');
const sideOf = (teamId) => ({ 't-mp-a': 'MP A', 't-mp-b': 'MP B', 't-rj-a': 'RJ A', 't-rj-b': 'RJ B', 't-de': 'DE', 't-des': 'DES', 't-destroyers': 'Destroyers', 't-lsg-a': 'LSG A', 't-lsg-b': 'LSG B', 't-mi-a': 'MI A', 't-mi-b': 'MI B', 't-rcb-a': 'RCB A', 't-rcb-b': 'RCB B', 't-loc-a': 'Local A', 't-loc-b': 'Local B' }[teamId]);
const mkSquads = (pool, aMarqId, bMarqId) => {
  const rest = shuffle(pool).filter((id) => id !== aMarqId && id !== bMarqId);
  return {
    A: [aMarqId, ...rest.slice(0, 10)],
    B: bMarqId ? [bMarqId, ...rest.slice(10, 21)] : rest.slice(10, 21),
  };
};
function bowlSide(innId, side, wkts, runsAvail, marqBowlPlan, maxOv) {
  const xi = shuffle(side.filter((id) => id !== marqBowlPlan?.pid)).slice(0, 5);
  const bowlers = marqBowlPlan ? [marqBowlPlan.pid, ...xi] : xi;
  let wLeft = wkts, runsLeft = Math.max(0, runsAvail), ovLeft = maxOv;
  for (let k = 0; k < bowlers.length; k++) {
    const last = k === bowlers.length - 1;
    let ov, runs, w;
    if (marqBowlPlan && bowlers[k] === marqBowlPlan.pid) { ov = marqBowlPlan.overs; runs = marqBowlPlan.runs; w = Math.min(marqBowlPlan.wickets, wkts); }
    else {
      ov = last ? Math.max(1, ovLeft) : clamp(Math.round(ovLeft / (bowlers.length - k)) + ri(-2, 2), 1, Math.max(1, ovLeft - (bowlers.length - k - 1)));
      w = last ? Math.max(0, wLeft) : Math.min(ri(0, 3), wLeft);
      runs = last ? Math.max(0, runsLeft) : clamp(ri(0, 65), 0, Math.max(0, runsLeft - (bowlers.length - k - 1)));
    }
    db.bowling.push({ id: `w-${innId}-${k}`, inningsId: innId, playerId: bowlers[k], overs: canonOvers(ov), maidens: ov >= 2 && rnd() < (ov >= 8 ? 0.55 : 0.25) ? Math.min(Math.floor(ov / 2), Math.round(ov / 3) + 1) : 0, runs, wickets: w, economy: ov ? +(runs / ov).toFixed(2) : 0 });
    ovLeft -= ov; runsLeft -= runs; wLeft -= w;
  }
  if (wLeft > 0) db.bowling[db.bowling.length - 1].wickets += wLeft;
  if (runsLeft > 0) db.bowling[db.bowling.length - 1].runs += runsLeft;
}
function buildMatch({ date, tour, fmt, teamA, teamB, squadA, squadB, marqA, marqB, note, stage }) {
  const mid = `m-shared-${seq}`;
  const fp = fmtParams[fmt];
  const isTest = fmt === 'Test';
  const tNameA = db.teams.find((t) => t.id === teamA).name, tNameB = db.teams.find((t) => t.id === teamB).name;
  db.matches.push({ id: mid, slug: `${slug(sideOf(teamA))}-vs-${slug(sideOf(teamB))}-${date}`, tournamentId: tour, seasonId: seasonOf(+date.slice(0, 4)), teamAId: teamA, teamBId: teamB, matchDate: date, format: fmt, status: 'completed', resultText: '', matchNumber: seq, notes: note || null, note: null, playerIds: [...new Set([marqA?.pid || null, marqB?.pid || null].filter(Boolean))], ...(stage ? { stage } : {}) });
  const m = db.matches[db.matches.length - 1];
  const card = (ma, names) => ma && ma.pid && ma.row ? [{ pid: ma.pid, pos: ma.pos, runs: ma.row.R, balls: ma.row.B, fours: ma.row.f4, sixes: ma.row.f6, dis: realisticDismissal(ma.row.dis, names), no: ma.row.dis === 'not out', sr: srOf(ma.row.R, ma.row.B) }] : [];
  const tac = (ma, side) => (ma && ma.pid && ma.row ? splitTestBat(ma.row).map((c, i) => ({ ...c, pid: ma.pid, pos: ma.pos + i, dis: c.dis ? realisticDismissal(c.dis, side) : null })) : []);

  let a1, a2, b1, b2, innA1, innA2, innB1, innB2;
  const ta = isTest ? tac(marqA, squadB.map(playerName)) : [];
  const tb = isTest ? tac(marqB, squadA.map(playerName)) : [];
  a1 = makeInnings(m, fmt, `${mid}-1`, squadA, squadB, isTest ? ta.slice(0, 1) : card(marqA, squadB.map(playerName)), 'open', 0);
  innA1 = { id: `${mid}-1`, matchId: mid, teamId: teamA, battingOrder: 1, runs: a1.total, wickets: a1.W, overs: fp.maxOv };
  b1 = makeInnings(m, fmt, `${mid}-2`, squadB, squadA, isTest ? tb.slice(0, 1) : card(marqB, squadA.map(playerName)), 'open', 0);
  innB1 = { id: `${mid}-2`, matchId: mid, teamId: teamB, battingOrder: 2, runs: b1.total, wickets: b1.W, overs: fp.maxOv };

  if (isTest) {
    a2 = makeInnings(m, fmt, `${mid}-3`, squadA, squadB, ta.slice(1), 'test2', 0);
    innA2 = { id: `${mid}-3`, matchId: mid, teamId: teamA, battingOrder: 3, runs: a2.total, wickets: a2.W, overs: fp.maxOv };
    const target = Math.max(1, a1.total + a2.total - b1.total);
    const r = rnd();
    b2 = makeInnings(m, fmt, `${mid}-4`, squadB, squadA, tb.slice(1), 'chase', r < 0.4 ? target - 1 : r < 0.75 ? Math.max(1, target - ri(5, 55)) : Math.max(1, target - ri(60, 110)));
    innB2 = { id: `${mid}-4`, matchId: mid, teamId: teamB, battingOrder: 4, runs: b2.total, wickets: b2.W, overs: fp.maxOv };
    if (b2.total >= target) m.resultText = `${tNameB} won by ${10 - b2.W} wickets`;
    else if (b2.W < 10) m.resultText = 'Match drawn';
    else m.resultText = `${tNameA} won by ${Math.max(0, a1.total + a2.total - b1.total - b2.total)} runs`;
  } else {
    m.resultText = b1.total > a1.total ? `${tNameB} won by ${10 - b1.W} wickets` : `${tNameA} won by ${a1.total - b1.total} runs`;
  }

  db.innings.push(innA1, innB1);
  if (innA2) db.innings.push(innA2);
  if (innB2) db.innings.push(innB2);
  const pushBat = (innId, cards) => { for (const c of cards) db.batting.push({ id: `z-${mid}-${innId}-${c.pid}`, inningsId: innId, playerId: c.pid, runs: c.runs, balls: c.balls, fours: c.fours, sixes: c.sixes, dismissal: c.dismissal, notOut: c.notOut, strikeRate: c.strikeRate, position: c.position }); };
  pushBat(`${mid}-1`, a1.cards); pushBat(`${mid}-2`, b1.cards);
  if (innA2) pushBat(`${mid}-3`, a2.cards);
  if (innB2) pushBat(`${mid}-4`, b2.cards);

  const marqBowl = (ma) => {
    if (!ma || !ma.pid || ma.row == null || ma.row.O == null) return null;
    const o = legalBalls(+ma.row.O) / 6;
    return { pid: ma.pid, overs: canonOvers(o), runs: ma.row.Rr, wickets: ma.row.W };
  };
  if (isTest) {
    const ab = marqA && marqA.pid ? splitTestBowl(marqA.row) : [null, null];
    const bb = marqB && marqB.pid ? splitTestBowl(marqB.row) : [null, null];
    const bw = (innId, side, w, runs, plan) => bowlSide(innId, side, w, runs, plan, fp.maxOv);
    bw(`${mid}-1`, squadB, a1.W, a1.total - a1.extras, bb[0] ? { ...bb[0], pid: marqB.pid } : null);
    bw(`${mid}-2`, squadA, b1.W, b1.total - b1.extras, ab[0] ? { ...ab[0], pid: marqA.pid } : null);
    if (innA2) bw(`${mid}-3`, squadB, a2.W, a2.total - a2.extras, bb[1] ? { ...bb[1], pid: marqB.pid } : null);
    if (innB2) bw(`${mid}-4`, squadA, b2.W, b2.total - b2.extras, ab[1] ? { ...ab[1], pid: marqA.pid } : null);
  } else {
    bowlSide(`${mid}-1`, squadB, a1.W, a1.total - a1.extras, marqBowl(marqB), fp.maxOv);
    bowlSide(`${mid}-2`, squadA, b1.W, b1.total - b1.extras, marqBowl(marqA), fp.maxOv);
  }
  seq++;
}

// ---------- fixture plan ----------
const pranav = () => ({ pid: P, pos: pick([3, 6, 7]), row: null });
const akhil = () => ({ pid: A, pos: 1, row: null });
const none = () => ({ pid: null, pos: 1, row: null });

const PLAN = [];

// 2020 local (single marquee)
{
  const loA = shuffle(LOCAL_POOL).slice(0, 10);
  const loB = shuffle(LOCAL_POOL.filter((id) => !loA.includes(id))).slice(0, 11);
  const ma = pranav();
  const mb = { pid: null, pos: 1, row: null };
  PLAN.push({ date: '2020-03-14', tour: 't-shared-loc-fc', fmt: 'Test', teamA: 't-loc-a', teamB: 't-loc-b', squadA: [P, ...loA], squadB: loB, marqA: { ...ma, row: P_TEST[0] }, marqB: mb, note: P_TEST[0].note });
  PLAN.push({ date: '2020-12-12', tour: 't-shared-loc-odi', fmt: 'ODI', teamA: 't-loc-a', teamB: 't-loc-b', squadA: [P, ...loA], squadB: loB, marqA: { ...ma, row: P_ODI[0] }, marqB: mb, note: P_ODI[0].note });
}

// series builders (Pranav team A; Akhil team B where present)
const rjMatch = (date, row) => { const sq = mkSquads(RJ_POOL, P, null); return { date, tour: 't-shared-rj', fmt: 'T20', teamA: 't-rj-a', teamB: 't-rj-b', squadA: sq.A, squadB: sq.B, marqA: { ...pranav(), row }, marqB: none() }; };
const ddMatch = (date, row, withAkhil) => { const sq = mkSquads(COMBINED, P, withAkhil ? A : null); return { date, tour: 't-shared-destroyers', fmt: 'T20', teamA: 't-destroyers', teamB: 't-de', squadA: sq.A, squadB: sq.B, marqA: { ...pranav(), row }, marqB: withAkhil ? akhil() : none() }; };
const deMatch = (date, row, withAkhil) => { const sq = mkSquads(COMBINED, P, withAkhil ? A : null); return { date, tour: 't-shared-de', fmt: 'T20', teamA: 't-de', teamB: 't-des', squadA: sq.A, squadB: sq.B, marqA: { ...pranav(), row }, marqB: withAkhil ? akhil() : none() }; };
const odiMatch = (date, row, withAkhil) => { const sq = mkSquads(COMBINED, P, withAkhil ? A : null); return { date, tour: 't-shared-mp-odi', fmt: 'ODI', teamA: 't-mp-a', teamB: 't-mp-b', squadA: sq.A, squadB: sq.B, marqA: { ...pranav(), row }, marqB: withAkhil ? akhil() : none() }; };
const testMatch = (date, row, withAkhil) => { const sq = mkSquads(COMBINED, P, withAkhil ? A : null); return { date, tour: 't-shared-mp', fmt: 'Test', teamA: 't-mp-a', teamB: 't-mp-b', squadA: sq.A, squadB: sq.B, marqA: { ...pranav(), row }, marqB: withAkhil ? akhil() : none() }; };

// 2021
PLAN.push(rjMatch('2021-01-13', P_T20[0]), rjMatch('2021-03-03', P_T20[1]));
for (let k = 0; k < 7; k++) PLAN.push(ddMatch(`2021-08-${String(3 + k * 3).padStart(2, '0')}`, P_T20[2 + k], true));
// 2022
PLAN.push(rjMatch('2022-01-14', P_T20[9]), rjMatch('2022-03-05', P_T20[10]));
PLAN.push(deMatch('2022-08-04', P_T20[11], true), deMatch('2022-08-11', P_T20[12], true));
for (let k = 0; k < 5; k++) PLAN.push(odiMatch(`2022-09-${String(2 + k * 6).padStart(2, '0')}`, P_ODI[1 + k], true));
{
  const rest = shuffle(LSG_2022);
  const sqA = rest.slice(0, 11);
  const sqB = [P, ...rest.slice(11, 21)];
  PLAN.push({ date: '2022-11-06', tour: 't-shared-lsg', fmt: 'T20', teamA: 't-lsg-a', teamB: 't-lsg-b', squadA: sqA, squadB: sqB, marqA: none(), marqB: { ...pranav(), row: P_T20[13] } });
  PLAN.push({ date: '2022-11-12', tour: 't-shared-lsg', fmt: 'T20', teamA: 't-lsg-a', teamB: 't-lsg-b', squadA: sqA, squadB: sqB, marqA: none(), marqB: { ...pranav(), row: P_T20[14] } });
}
// 2023
PLAN.push(rjMatch('2023-01-12', P_T20[15]), rjMatch('2023-03-08', P_T20[16]));
PLAN.push(deMatch('2023-08-05', P_T20[17], true), deMatch('2023-08-11', P_T20[18], false));
for (let k = 0; k < 4; k++) PLAN.push(odiMatch(`2023-09-${String(2 + k * 7).padStart(2, '0')}`, P_ODI[6 + k], true));
for (let k = 0; k < 5; k++) PLAN.push(testMatch(`2023-11-${String(6 + k * 8).padStart(2, '0')}`, P_TEST[1 + k], true));
// 2024
PLAN.push(rjMatch('2024-02-06', P_T20[19]), rjMatch('2024-03-06', P_T20[20]));
{
  const de24a = deMatch('2024-08-03', P_T20[21], true);
  const de24b = deMatch('2024-08-10', P_T20[22], true);
  de24b.stage = 'Final';
  PLAN.push(de24a, de24b);
}
PLAN.push(odiMatch('2024-09-01', P_ODI[10], true), odiMatch('2024-09-08', P_ODI[11], true), odiMatch('2024-09-15', P_ODI[12], false), odiMatch('2024-09-22', P_ODI[13], true));
for (let k = 0; k < 5; k++) PLAN.push(testMatch(k === 4 ? '2024-11-01' : `2024-10-${String(5 + k * 8).padStart(2, '0')}`, P_TEST[6 + k], true));
{
  const rest = shuffle(RCB_2024);
  const sqA = [P, ...rest.slice(0, 11)];
  const sqB = rest.slice(11, 22);
  PLAN.push({ date: '2024-11-02', tour: 't-shared-rcb', fmt: 'T20', teamA: 't-rcb-a', teamB: 't-rcb-b', squadA: sqA, squadB: sqB, marqA: { ...pranav(), row: P_T20[23] }, marqB: none() });
  PLAN.push({ date: '2024-11-06', tour: 't-shared-rcb', fmt: 'T20', teamA: 't-rcb-a', teamB: 't-rcb-b', squadA: sqA, squadB: sqB, marqA: { ...pranav(), row: P_T20[24] }, marqB: none() });
  PLAN.push({ date: '2024-11-08', tour: 't-shared-rcb', fmt: 'T20', teamA: 't-rcb-a', teamB: 't-rcb-b', squadA: sqA, squadB: sqB, marqA: { ...pranav(), row: P_T20[25] }, marqB: none() });
}
// MI (Akhil only)
{
  const rest = shuffle(MI_2024);
  const sqA = [A, ...rest.slice(0, 11)];
  const sqB = rest.slice(11, 23);
  PLAN.push({ date: '2024-11-14', tour: 't-shared-mi', fmt: 'T20', teamA: 't-mi-a', teamB: 't-mi-b', squadA: sqA, squadB: sqB, marqA: { ...akhil(), row: A_T20[12] }, marqB: none() });
  PLAN.push({ date: '2024-11-16', tour: 't-shared-mi', fmt: 'T20', teamA: 't-mi-a', teamB: 't-mi-b', squadA: sqA, squadB: sqB, marqA: { ...akhil(), row: A_T20[13] }, marqB: none() });
}

// attach Akhil ledger rows in order (MI rows already set via A_T20 indices)
{
  const t20 = [], odi = [], test = [];
  for (const m of PLAN) {
    if (!m.marqB || !m.marqB.pid) continue;
    if (m.tour === 't-shared-destroyers' || m.tour === 't-shared-de') t20.push(m);
    else if (m.tour === 't-shared-mp-odi') odi.push(m);
    else if (m.tour === 't-shared-mp') test.push(m);
  }
  if (t20.length + 2 > A_T20.length || odi.length > A_ODI.length || test.length > A_TEST.length) throw new Error('Akhil ledger rows insufficient');
  t20.forEach((m2, i) => { m2.marqB.row = A_T20[i]; });
  odi.forEach((m2, i) => { m2.marqB.row = A_ODI[i]; });
  test.forEach((m2, i) => { m2.marqB.row = A_TEST[i]; });
}
for (const m of PLAN) buildMatch(m);
console.log('career matches built:', seq - 1);

// ---------- recompute player stats from the match data ----------
const mById = new Map(db.matches.map((m2) => [m2.id, m2]));
const innById = new Map(db.innings.map((i) => [i.id, i]));
function recompute(pid) {
  const bat = db.batting.filter((b) => b.playerId === pid);
  const bowl = db.bowling.filter((b) => b.playerId === pid);
  const F = ['Test', 'ODI', 'T20', 'IPL'];
  const S = {}; for (const f of F) S[f] = { matches: new Set(), inns: 0, runs: 0, balls: 0, fours: 0, sixes: 0, notOut: 0, dismissals: 0, hs: 0, hsNo: false, wkts: 0, br: 0, ballsB: 0, bbiW: 0, bbiR: Infinity };
  const fifties = {}, hundreds = {};
  for (const f of F) { fifties[f] = 0; hundreds[f] = 0; }
  for (const b of bat) {
    const inn = innById.get(b.inningsId); if (!inn) continue;
    const m = mById.get(inn.matchId); const s = S[m.format];
    s.matches.add(m.id); s.inns++; s.runs += b.runs || 0; s.balls += b.balls || 0; s.fours += b.fours || 0; s.sixes += b.sixes || 0;
    if (b.notOut) s.notOut++; else s.dismissals++;
    if ((b.runs || 0) > s.hs) { s.hs = b.runs; s.hsNo = !!b.notOut; }
    if ((b.runs || 0) >= 100) hundreds[m.format]++; else if ((b.runs || 0) >= 50) fifties[m.format]++;
  }
  for (const w of bowl) {
    const inn = innById.get(w.inningsId); if (!inn) continue;
    const m = mById.get(inn.matchId); const s = S[m.format];
    s.matches.add(m.id); s.wkts += w.wickets || 0; s.br += w.runs || 0; s.ballsB += legalBalls(w.overs || 0);
    if ((w.wickets || 0) > s.bbiW || ((w.wickets || 0) === s.bbiW && (w.runs || 0) < s.bbiR)) { s.bbiW = w.wickets; s.bbiR = w.runs || 0; }
  }
  for (const m of db.matches) if (m.playerIds && m.playerIds.includes(pid)) S[m.format].matches.add(m.id);
  const row = (fn) => F.map((f) => fn(S[f]));
  const num = (v) => (v == null || isNaN(v) ? '–' : String(v));
  const pl = db.players.find((p) => p.id === pid);
  pl.stats = {
    batting: { formats: F, rows: {
      Matches: row((s) => num(s.matches.size)), Innings: row((s) => num(s.inns)), Runs: row((s) => num(s.runs)),
      Highest: row((s) => (s.hs ? `${s.hs}${s.hsNo ? '*' : ''}` : '–')),
      Average: row((s) => (s.dismissals ? (s.runs / s.dismissals).toFixed(2) : '–')),
      SR: row((s) => (s.balls ? (Math.round((s.runs / s.balls) * 1000) / 10).toFixed(1) : '–')),
      Fours: row((s) => num(s.fours)), Sixes: row((s) => num(s.sixes)),
      '50s': F.map((f) => num(fifties[f])), '100s': F.map((f) => num(hundreds[f])),
    } },
    bowling: { formats: F, rows: {
      Matches: row((s) => num(s.matches.size)), Wickets: row((s) => num(s.wkts)),
      Avg: row((s) => (s.wkts ? (s.br / s.wkts).toFixed(2) : '–')),
      Eco: row((s) => (s.ballsB ? (s.br / (s.ballsB / 6)).toFixed(2) : '–')),
      BBI: row((s) => (s.bbiW ? `${s.bbiW}/${s.bbiR}` : '–')),
    } },
  };
  return { bat: pl.stats.batting.rows, bowl: pl.stats.bowling.rows, totals: { r: F.reduce((x, f) => x + S[f].runs, 0), w: F.reduce((x, f) => x + S[f].wkts, 0) } };
}
const statsP = recompute(P);
const statsA = recompute(A);
const plP = db.players.find((p) => p.id === P);
const plA = db.players.find((p) => p.id === A);
plP.profileStats = { matches: 51, runs: statsP.totals.r, wickets: statsP.totals.w };
plA.profileStats = { matches: 36, runs: statsA.totals.r, wickets: statsA.totals.w };
console.log('PRANAV batting:', JSON.stringify(statsP.bat));
console.log('PRANAV bowling:', JSON.stringify(statsP.bowl));
console.log('AKHIL batting:', JSON.stringify(statsA.bat));
console.log('AKHIL bowling:', JSON.stringify(statsA.bowl));

// ---------- assertions ----------
const expect = (actual, exp, label) => { if (JSON.stringify(actual) !== JSON.stringify(exp)) { console.error('MISMATCH', label, JSON.stringify(actual), 'expected', JSON.stringify(exp)); process.exitCode = 1; } else console.log('OK', label); };
expect(statsP.bat.Matches, ['11', '14', '26', '0'], 'P matches (max 51, no IPL)');
expect(statsA.bat.Matches, ['10', '12', '14', '0'], 'A matches');
const sumRows = (rows) => rows.reduce((s, r) => s + r.R, 0);
expect(String(statsP.totals.r), String(sumRows([...P_TEST, ...P_ODI, ...P_T20])), 'P runs = ledger sums');
expect(String(statsA.totals.r), String(sumRows([...A_TEST, ...A_ODI, ...A_T20])), 'A runs = ledger sums');

// ---------- rules checker (career matches only) ----------
{
  const genM = new Set(db.matches.filter((mm) => /^m-(shared|akhil|pranav)-/.test(mm.id)).map((mm) => mm.id));
  let all = { notout3: 0, disMismatch: 0, noDisType: 0, disOnNo: 0, sumExceeds: 0, bowlExceeds: 0, bat11: 0, wktsOver10: 0, tests: 0 };
  for (const inn of db.innings) {
    if (!genM.has(inn.matchId)) continue;
    if (db.matches.find((mm) => mm.id === inn.matchId).format === 'Test') all.tests++;
    const batters = db.batting.filter((b) => b.inningsId === inn.id);
    const bowlers = db.bowling.filter((b) => b.inningsId === inn.id);
    const no = batters.filter((b) => b.notOut).length;
    if (no > 2) all.notout3++;
    if (batters.filter((b) => !b.notOut).length !== inn.wickets) all.disMismatch++;
    if (inn.wickets > 10) all.wktsOver10++;
    for (const b of batters) {
      if (!b.notOut && !b.dismissal) all.noDisType++;
      if (b.notOut && b.dismissal) all.disOnNo++;
    }
    if (batters.reduce((s, b) => s + (b.runs || 0), 0) > inn.runs) all.sumExceeds++;
    if (bowlers.reduce((s, w) => s + (w.wickets || 0), 0) > inn.wickets) all.bowlExceeds++;
    if (batters.length > 11) all.bat11++;
  }
  console.log('CAREER rule check:', JSON.stringify(all));
}

writeFileSync(DATA, JSON.stringify(db, null, 2) + '\n');
console.log('career built: matches', db.matches.length, 'innings', db.innings.length, 'batting', db.batting.length, 'bowling', db.bowling.length);