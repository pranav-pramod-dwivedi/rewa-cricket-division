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
db.innings = db.innings || [];
db.batting = db.batting || [];
db.bowling = db.bowling || [];

// ---------- purge prior generated career data ----------
const oldMatchIds = new Set(db.matches.filter((m) => /^m-(shared|akhil|pranav)-/.test(m.id)).map((m) => m.id));
const oldInnIds = new Set(db.innings.filter((i) => oldMatchIds.has(i.matchId)).map((i) => i.id));
db.matches = db.matches.filter((m) => !oldMatchIds.has(m.id));
db.innings = db.innings.filter((i) => !oldInnIds.has(i.id));
db.batting = db.batting.filter((b) => !oldInnIds.has(b.inningsId));
db.bowling = db.bowling.filter((w) => !oldInnIds.has(w.inningsId));
db.tournaments = db.tournaments.filter((t) => !t.id.startsWith('t-shared-'));
const GEN_TEAMS = new Set(['t-mp-a', 't-mp-b', 't-rj-a', 't-rj-b', 't-de', 't-des', 't-mi-a', 't-mi-b', 't-rcb-a', 't-rcb-b']);
db.teams = db.teams.filter((t) => !GEN_TEAMS.has(t.id));
db.players = db.players.filter((p) => !p.id.startsWith('p-club-') && !['t-loc-a', 't-loc-b', 't-destroyers', 't-lsg-a', 't-lsg-b'].includes(p.teamId));

// ---------- player lookup / creation ----------
const P = 'p-pranav-dwivedi', A = 'p-akhil-mishra';
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const byName = new Map(db.players.map((p) => [p.name.toLowerCase(), p]));
const pid = (n) => addPlayer(n, 'Player', null);
function addPlayer(name, role, teamId) {
  const ex = byName.get(name.toLowerCase());
  if (ex && db.players.some((p) => p.id === ex.id)) return ex.id;
  let base = slug(name); let id = `p-${base}`; let s = base; let k = 2;
  while (db.players.some((p) => p.id === id)) { s = `${base}-${k++}`; id = `p-${s}`; }
  const np = { id, name, slug: s, role: role || 'Player', teamId: teamId || null };
  db.players.push(np); byName.set(name.toLowerCase(), np);
  return id;
}
addPlayer('Pranav Dwivedi', 'All-rounder', null);
addPlayer('Akhil Mishra', 'All-rounder', null);
const MP_POOL = [
  'Rajat Patidar', 'Yash Dubey', 'Himanshu Mantri', 'Harsh Gawli', 'Aditya Shrivastava', 'Subhranshu Senapati',
  'Venkatesh Iyer', 'Saransh Jain', 'Shubham Sharma', 'Anubhav Agarwal', 'Avesh Khan', 'Kuldeep Sen',
  'Kumar Kartikeya', 'Kulwant Khejroliya', 'Arshad Khan', 'Rahul Batham',
].map((n) => pid(n));
const RJ_POOL = [
  'Prithviraj Singh Tomar', 'Akshat Raghuwanshi', 'Atharv Mahajan', 'Sagar Pratap Singh', 'Anant Verma', 'Jaydev Singh',
  'Himanshu Mantri', 'Chanchal Rathore', 'Kanishk Dubey', 'Ajay Rohera', 'Sagar Solanki', 'Ankit Singh Kushwaha',
  'Naveen Singh Chouhan', 'Mohd Arham Aquil', 'Aryan Deshmukh', 'Saransh Surana', 'Ramveer Singh Gurjar', 'Ashwin Das',
  'Rohit Rajawat', 'Prabhanshu Shukla', 'Ritesh Shakya', 'Radhakrishna Dwivedi', 'Kuldeep Sen', 'Kumar Kartikeya',
  'Shivam Shukla', 'Mohd Arshad Khan', 'Kulwant Khejroliya', 'Amarjeet Kumar Singh',
].map((n) => pid(n));
const COMBINED = [...new Set([...MP_POOL, ...RJ_POOL])];
const playerName = (id) => (db.players.find((p) => p.id === id) || { name: 'Player' }).name;

// real franchise squads (created if missing)
const RCB_2024 = [
  ['Virat Kohli', 'Batsman'], ['Rajat Patidar', 'Batsman'], ['Yash Dayal', 'Bowler'],
  ['Phil Salt', 'Wicketkeeper'], ['Jitesh Sharma', 'Wicketkeeper'], ['Tim David', 'Batsman'], ['Devdutt Padikkal', 'Batsman'], ['Swastik Chikara', 'Batsman'],
  ['Liam Livingstone', 'All-rounder'], ['Krunal Pandya', 'All-rounder'], ['Jacob Bethell', 'All-rounder'], ['Romario Shepherd', 'All-rounder'], ['Swapnil Singh', 'All-rounder'], ['Manoj Bhandage', 'All-rounder'],
  ['Josh Hazlewood', 'Bowler'], ['Bhuvneshwar Kumar', 'Bowler'], ['Rasikh Dar Salam', 'Bowler'], ['Suyash Sharma', 'Bowler'], ['Nuwan Thushara', 'Bowler'], ['Lungi Ngidi', 'Bowler'], ['Abhinandan Singh', 'Bowler'], ['Mohit Rathee', 'Bowler'],
].map(([n, r]) => addPlayer(n, r, 't-royal-challengers-bengaluru'));
const MI_2024 = [
  ['Jasprit Bumrah', 'Bowler'], ['Hardik Pandya', 'All-rounder'], ['Suryakumar Yadav', 'Batsman'], ['Rohit Sharma', 'Batsman'], ['Tilak Varma', 'Batsman'],
  ['Ryan Rickelton', 'Wicketkeeper'], ['Robin Minz', 'Wicketkeeper'], ['Bevon Jacobs', 'Batsman'], ['Krishnan Shrijith', 'Wicketkeeper'],
  ['Naman Dhir', 'All-rounder'], ['Will Jacks', 'All-rounder'], ['Mitchell Santner', 'All-rounder'], ['Raj Bawa', 'All-rounder'],
  ['Trent Boult', 'Bowler'], ['Deepak Chahar', 'Bowler'], ['Allah Ghazanfar', 'Bowler'], ['Karn Sharma', 'Bowler'], ['Ashwani Kumar', 'Bowler'], ['Reece Topley', 'Bowler'], ['Lizaad Williams', 'Bowler'], ['Arjun Tendulkar', 'Bowler'], ['Satyanarayana Raju', 'Bowler'], ['Vignesh Puthur', 'Bowler'],
].map(([n, r]) => addPlayer(n, r, 't-mumbai-indians'));
addPlayer('Made-up Player', 'Player', null); // last-resort fallback

// LSG 2022 squad (real) — Pranav in LSG B
const LSG_2024 = [
  ['KL Rahul', 'Wicketkeeper'], ['Quinton de Kock', 'Wicketkeeper'], ['Manish Pandey', 'Batsman'], ['Evin Lewis', 'Batsman'], ['Manan Vohra', 'Batsman'],
  ['Marcus Stoinis', 'All-rounder'], ['Deepak Hooda', 'All-rounder'], ['Krunal Pandya', 'All-rounder'], ['Jason Holder', 'All-rounder'], ['Krishnappa Gowtham', 'All-rounder'], ['Ayush Badoni', 'All-rounder'], ['Kyle Mayers', 'All-rounder'], ['Karan Sharma', 'All-rounder'],
  ['Ravi Bishnoi', 'Bowler'], ['Avesh Khan', 'Bowler'], ['Dushmantha Chameera', 'Bowler'], ['Mohsin Khan', 'Bowler'], ['Shahbaz Nadeem', 'Bowler'], ['Ankit Rajpoot', 'Bowler'], ['Mayank Yadav', 'Bowler'], ['Andrew Tye', 'Bowler'],
].map(([n, r]) => addPlayer(n, r, 't-lucknow-super-giants'));
const LSG_POOL = LSG_2024;

// ---------- teams / tournaments ----------
const TEAMS = {
  't-mp-a': ['MP A', 'MP A'], 't-mp-b': ['MP B', 'MP B'],
  't-rj-a': ['RJ A', 'RJ A'], 't-rj-b': ['RJ B', 'RJ B'],
  't-de': ['DE', 'DE'], 't-des': ['DES', 'DES'],
  't-mi-a': ['MI A', 'MI A'], 't-mi-b': ['MI B', 'MI B'],
  't-rcb-a': ['RCB A', 'RCB A'], 't-rcb-b': ['RCB B', 'RCB B'],
};
for (const [id, [name, slug2]] of Object.entries(TEAMS)) if (!db.teams.some((t) => t.id === id)) db.teams.push({ id, name, slug: slug(slug2), shortCode: name, description: 'Intra-squad / trial side.', establishedYear: 2021 });
for (const [id, name, sc] of [['t-royal-challengers-bengaluru', 'Royal Challengers Bengaluru', 'RCB'], ['t-mumbai-indians', 'Mumbai Indians', 'MI'], ['t-madhya-pradesh', 'Madhya Pradesh', 'MP'], ['t-rewa-jaguars', 'Rewa Jaguars', 'RJ'], ['t-kkr', 'Kolkata Knight Riders', 'KKR'], ['t-lucknow-super-giants', 'Lucknow Super Giants', 'LSG']]) if (!db.teams.some((t) => t.id === id)) db.teams.push({ id, name, slug: slug(sc), shortCode: sc, description: '', establishedYear: 2021 });

const TOURS = {
  't-shared-rj': ['RJ A v RJ B', 'T20', 'division'],
  't-shared-de': ['DE v DES T20 Series', 'T20', 'division'],
  't-shared-de-odi': ['DE v DES ODI Series', 'ODI', 'state'],
  't-shared-mp': ['MP A v MP B', 'First-class', 'state'],
  't-shared-rcb': ['RCB A v RCB B', 'T20', 'ipl'],
  't-shared-mi': ['MI A v MI B', 'T20', 'ipl'],
  't-shared-lsg': ['LSG A v LSG B', 'T20', 'ipl'],
  't-shared-rcb-kkr': ['RCB v KKR', 'IPL', 'ipl'],
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
  .map((c) => ({ seq: +c[map.seq], date: c[map.date] || '', match: c[map.match], fmt: c[map.fmt], R: c[map.R] === 'DNB' || c[map.R] === '' ? null : +c[map.R], B: +c[map.B] || 0, f4: +c[map.f4] || 0, f6: +c[map.f6] || 0, dis: c[map.dis], O: c[map.O] === '-' || c[map.O] === '' || c[map.O] === 'DNB' ? null : c[map.O], M: +c[map.M] || 0, Rr: +c[map.Rr] || 0, W: +c[map.W] || 0, note: c[map.note] || '' }));
const PRANAV_MAP = { seq: 0, date: 1, match: 2, fmt: 3, R: 4, B: 5, f4: 6, f6: 7, dis: 8, O: 9, M: 10, Rr: 11, W: 12, note: 13 };
const AKHIL_MAP = { seq: 0, match: 1, fmt: 3, R: 4, B: 5, f4: 6, f6: 7, dis: 9, O: 10, M: 11, Rr: 12, W: 13, note: 14 };
const P_ROWS = parse('pranav.career.csv', PRANAV_MAP);
const A_ROWS = parse('akhil.career.csv', AKHIL_MAP);
const lastN = (rows, f, n) => rows.filter((r) => r.fmt === f && r.R !== null).slice(-n);
const allOf = (rows, f) => rows.filter((r) => r.fmt === f);
const P_TEST = allOf(P_ROWS, 'Test'), P_ODI = allOf(P_ROWS, 'ODI'), P_T20 = allOf(P_ROWS, 'T20'), P_IPL = allOf(P_ROWS, 'IPL');
const A_TEST = lastN(A_ROWS, 'Test', 10), A_ODI = lastN(A_ROWS, 'ODI', 12), A_T20 = lastN(A_ROWS, 'T20', 14);

// ---------- cricket helpers ----------
const canonOvers = (ov) => {
  if (typeof ov === 'string') {
    const parts = ov.split('.');
    const overs = parseInt(parts[0], 10) || 0;
    const balls = parseInt(parts[1], 10) || 0;
    const totalBalls = overs * 6 + balls;
    const f = Math.floor(totalBalls / 6);
    const b = totalBalls % 6;
    return b === 0 ? f : f + b / 10;
  }
  const f = Math.floor(ov);
  const b = Math.round((ov - f) * 10);
  const totalBalls = f * 6 + b;
  const finalF = Math.floor(totalBalls / 6);
  const finalB = totalBalls % 6;
  return finalB === 0 ? finalF : finalF + finalB / 10;
};
const legalBalls = (ov) => {
  if (typeof ov === 'string') {
    const parts = ov.split('.');
    const overs = parseInt(parts[0], 10) || 0;
    const balls = parseInt(parts[1], 10) || 0;
    return overs * 6 + balls;
  }
  const f = Math.floor(ov);
  const b = Math.round((ov - f) * 10);
  return f * 6 + Math.min(5, Math.max(0, b));
};
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
function extractPlayersFromDis(disStr) {
  if (!disStr || disStr === 'not out' || disStr === '0' || disStr.startsWith('DNB')) return { bowler: null, fielder: null, wk: null };
  let s = disStr.trim();
  let bowler = null, fielder = null, wk = null;
  const mSt = s.match(/st\s+b\s+(.+?)\s+\(wk\s+(.+?)\)/i);
  if (mSt) {
    bowler = mSt[1].trim();
    wk = mSt[2].trim();
    return { bowler, fielder: null, wk };
  }
  const mCB = s.match(/^c\s*&\s*b\s+(.+)$/i);
  if (mCB) {
    bowler = mCB[1].trim();
    return { bowler, fielder: bowler, wk: null };
  }
  const mC = s.match(/^c\s+(.+?)\s+b\s+(.+)$/i);
  if (mC) {
    fielder = mC[1].trim();
    bowler = mC[2].trim();
    return { bowler, fielder, wk: null };
  }
  const mLBW = s.match(/^lbw\s+b\s+(.+)$/i);
  if (mLBW) {
    bowler = mLBW[1].trim();
    return { bowler, fielder: null, wk: null };
  }
  const mB = s.match(/^b\s+(.+)$/i);
  if (mB) {
    bowler = mB[1].trim();
    return { bowler, fielder: null, wk: null };
  }
  const mRO = s.match(/^run out\s+(.+)$/i);
  if (mRO) {
    fielder = mRO[1].trim();
    return { bowler: null, fielder, wk: null };
  }
  return { bowler: null, fielder: null, wk: null };
}

function realisticDismissal(ledgerDis, xiNames) {
  if (!ledgerDis || ledgerDis === 'not out' || ledgerDis === '0' || ledgerDis.startsWith('DNB')) return null;
  let s = ledgerDis.trim();
  return s;
}
function genFillBat(runs, mult) {
  const f6 = clamp(Math.round(runs / 9), 0, Math.floor(runs / 6));
  const f4 = clamp(Math.round((runs - 6 * f6) / 4.5), 0, Math.floor((runs - 6 * f6) / 4));
  const lo = Math.max(1, f4 + f6);
  const maxB = mult < 1 ? 60 : 250;
  const balls = Math.min(maxB, clamp(Math.round(runs * mult), lo, lo + Math.round(runs * mult) + 10));
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
const parse2ndInn = (note, names, pos) => {
  if (!note) return null;
  const m = note.match(/2nd inn:\s*(\d+)(\*)?\s*\((\d+)\)(?:\s+(.+))?/i);
  if (!m) return null;
  const runs = +m[1];
  const notOut = !!m[2];
  const balls = +m[3];
  const fours = Math.floor(runs / 5);
  const sixes = Math.floor(runs / 25);
  let dis = notOut ? null : (m[4] ? m[4].trim() : disTypes(names[Math.floor(rnd() * names.length)], names[Math.floor(rnd() * names.length)]));
  return { pid: P, pos: pos || 3, runs, balls, fours, sixes, dismissal: dis, dis, no: notOut, sr: srOf(runs, balls), notOut };
};

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
  const marqDis = marqueeCards.filter((c) => !c.no).length;
  if (W < marqDis) W = Math.min(10, marqDis + ri(0, 2));
  const NO = marqueeCards.length ? (W === 10 ? 1 : Math.min(2, 10 - W)) : 0;
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
  const free = shuffle(battingSide.filter((id) => !marqueeCards.some((c) => c.pid === id) && id !== P && id !== A)).slice(0, fillCount);
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
      : { pid: c.pid, runs: c.runs, balls: c.balls, fours: c.fours, sixes: c.sixes, dismissal: (c.notOut ?? c.no) ? null : (c.dismissal || c.dis), notOut: c.notOut ?? c.no, strikeRate: c.sr, position: c.pos, isMarquee: true }),
  };
}

// split one Test ledger row into two innings (batting + bowling)
function splitTestBowl(row) {
  if (!row || row.O == null || +row.O === 0) return [null, null];
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
const seasonOf = (y) => ({ 2020: 's2020', 2021: 's2021', 2022: 's2022', 2023: 's-2023', 2024: 's-2024', 2025: 's2025' }[y] || 's-2024');
const sideOf = (teamId) => ({ 't-mp-a': 'MP A', 't-mp-b': 'MP B', 't-rj-a': 'RJ A', 't-rj-b': 'RJ B', 't-de': 'DE', 't-des': 'DES', 't-destroyers': 'Destroyers', 't-lsg-a': 'LSG A', 't-lsg-b': 'LSG B', 't-mi-a': 'MI A', 't-mi-b': 'MI B', 't-rcb-a': 'RCB A', 't-rcb-b': 'RCB B', 't-loc-a': 'Local A', 't-loc-b': 'Local B' }[teamId]);
const mkSquads = (pool, aMarqId, bMarqId, reqAIds = [], reqBIds = []) => {
  const reqA = [...new Set([aMarqId, ...reqAIds].filter(Boolean))];
  const reqB = [...new Set([bMarqId, ...reqBIds].filter(Boolean))];
  const rest = shuffle(pool).filter((id) => !reqA.includes(id) && !reqB.includes(id));
  const needA = Math.max(0, 11 - reqA.length);
  const fillA = rest.slice(0, needA);
  const restAfterA = rest.slice(needA);
  const needB = Math.max(0, 11 - reqB.length);
  const fillB = restAfterA.slice(0, needB);
  return {
    A: [...reqA, ...fillA],
    B: [...reqB, ...fillB],
  };
};
function bowlSide(innId, side, wkts, runsAvail, marqBowlPlan, maxOv, excludeIds = [], forcedBowlerIds = []) {
  const isT20 = maxOv <= 20;
  const isODI = maxOv > 20 && maxOv <= 50;
  const perBowlerMax = isT20 ? 4 : isODI ? 10 : 35;
  const forced = forcedBowlerIds.filter((id) => id && id !== marqBowlPlan?.pid && !excludeIds.includes(id) && side.includes(id));
  const poolForXi = side.filter((id) => id !== marqBowlPlan?.pid && !excludeIds.includes(id) && !forced.includes(id));
  const needOthers = Math.max(0, 5 - forced.length);
  const xiOthers = shuffle(poolForXi).slice(0, needOthers);
  const nonMarqBowlers = [...forced, ...xiOthers];
  const bowlers = marqBowlPlan ? [marqBowlPlan.pid, ...nonMarqBowlers] : nonMarqBowlers;
  let wLeft = wkts, runsLeft = Math.max(0, runsAvail), ovLeft = maxOv;
  for (let k = 0; k < bowlers.length; k++) {
    const last = k === bowlers.length - 1;
    let ov, runs, w;
    if (marqBowlPlan && bowlers[k] === marqBowlPlan.pid) {
      ov = Math.min(perBowlerMax, marqBowlPlan.overs);
      runs = marqBowlPlan.runs;
      w = Math.min(marqBowlPlan.wickets, wkts);
    } else {
      const isForced = forced.includes(bowlers[k]);
      const maxPossible = Math.min(perBowlerMax, ovLeft);
      ov = last ? maxPossible : clamp(Math.round(ovLeft / (bowlers.length - k)) + ri(-1, 1), 1, maxPossible);
      w = isForced && wLeft > 0 ? Math.min(Math.max(1, ri(1, 2)), wLeft) : (last ? Math.max(0, wLeft) : Math.min(ri(0, 2), wLeft));
      runs = last ? Math.max(0, runsLeft) : clamp(ri(0, 45), 0, Math.max(0, runsLeft - (bowlers.length - k - 1)));
    }
    ov = Math.min(perBowlerMax, ov);
    db.bowling.push({ id: `w-${innId}-${k}`, inningsId: innId, playerId: bowlers[k], overs: canonOvers(ov), maidens: ov >= 2 && rnd() < (ov >= 8 ? 0.55 : 0.25) ? Math.min(Math.floor(ov / 2), Math.round(ov / 3) + 1) : 0, runs, wickets: w, economy: ov ? +(runs / ov).toFixed(2) : 0 });
    ovLeft -= ov; runsLeft -= runs; wLeft -= w;
  }
  if (ovLeft > 0) {
    const lastBw = db.bowling[db.bowling.length - 1];
    const currentOv = typeof lastBw.overs === 'number' ? lastBw.overs : canonOvers(lastBw.overs);
    const newOv = Math.min(perBowlerMax, currentOv + ovLeft);
    lastBw.overs = canonOvers(newOv);
    lastBw.economy = newOv ? +(lastBw.runs / newOv).toFixed(2) : 0;
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
  const card = (ma, names) => ma && ma.pid && ma.row ? [{ pid: ma.pid, pos: ma.pos, runs: ma.row.R, balls: ma.row.B, fours: ma.row.f4, sixes: ma.row.f6, dismissal: ma.row.dis === 'not out' ? null : ma.row.dis, dis: ma.row.dis, no: ma.row.dis === 'not out', sr: srOf(ma.row.R, ma.row.B), notOut: ma.row.dis === 'not out', isMarquee: true }] : [];
  const card2 = (ma, names) => {
    if (ma && ma.pid === P && ma.row && ma.row.note) {
      const p2 = parse2ndInn(ma.row.note, names, ma.pos);
      if (p2) return [p2];
    }
    return [];
  };

  let a1, a2, b1, b2, innA1, innA2, innB1, innB2;
  a1 = makeInnings(m, fmt, `${mid}-1`, squadA, squadB, card(marqA, squadB.map(playerName)), 'open', 0);
  innA1 = { id: `${mid}-1`, matchId: mid, teamId: teamA, battingOrder: 1, runs: a1.total, wickets: a1.W, overs: fp.maxOv };
  b1 = makeInnings(m, fmt, `${mid}-2`, squadB, squadA, card(marqB, squadA.map(playerName)), 'open', 0);
  innB1 = { id: `${mid}-2`, matchId: mid, teamId: teamB, battingOrder: 2, runs: b1.total, wickets: b1.W, overs: fp.maxOv };

  if (isTest) {
    a2 = makeInnings(m, fmt, `${mid}-3`, squadA, squadB, card2(marqA, squadB.map(playerName)), 'test2', 0);
    innA2 = { id: `${mid}-3`, matchId: mid, teamId: teamA, battingOrder: 3, runs: a2.total, wickets: a2.W, overs: fp.maxOv };
    const target = Math.max(1, a1.total + a2.total - b1.total);
    const r = rnd();
    b2 = makeInnings(m, fmt, `${mid}-4`, squadB, squadA, [], 'chase', r < 0.4 ? target - 1 : r < 0.75 ? Math.max(1, target - ri(5, 55)) : Math.max(1, target - ri(60, 110)));
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
    if (!ma || !ma.pid || ma.row == null || ma.row.O == null || +ma.row.O === 0) return null;
    const o = legalBalls(+ma.row.O) / 6;
    return { pid: ma.pid, overs: canonOvers(o), runs: ma.row.Rr, wickets: ma.row.W };
  };
  const exA = [
    marqA && marqA.pid && (!marqA.row || +marqA.row.O === 0) ? marqA.pid : null,
    marqB && marqB.pid && (!marqB.row || +marqB.row.O === 0) ? marqB.pid : null,
    A, // Akhil is a non-bowler (opener) in career matches
  ].filter(Boolean);
  const exB = [...exA];

  const getForcedB = (disStr) => {
    const ep = extractPlayersFromDis(disStr);
    if (!ep.bowler) return null;
    const p = db.players.find((pl) => pl.name.toLowerCase() === ep.bowler.toLowerCase() || lastWord(pl.name) === lastWord(ep.bowler));
    return p ? p.id : null;
  };

  const forcedB_A1 = getForcedB(marqA?.row?.dis);
  const forcedB_B1 = getForcedB(marqB?.row?.dis);
  const card2A = card2(marqA, squadB.map(playerName));
  const forcedB_A2 = card2A.length ? getForcedB(card2A[0].dismissal) : null;

  if (isTest) {
    const ab = marqA && marqA.pid ? splitTestBowl(marqA.row) : [null, null];
    const bb = marqB && marqB.pid ? splitTestBowl(marqB.row) : [null, null];
    const bw = (innId, side, w, runs, plan, ex, forced) => bowlSide(innId, side, w, runs, plan, fp.maxOv, ex, forced ? [forced] : []);
    bw(`${mid}-1`, squadB, a1.W, a1.total - a1.extras, bb[0] ? { ...bb[0], pid: marqB.pid } : null, exB, forcedB_A1);
    bw(`${mid}-2`, squadA, b1.W, b1.total - b1.extras, ab[0] ? { ...ab[0], pid: marqA.pid } : null, exA, forcedB_B1);
    if (innA2) bw(`${mid}-3`, squadB, a2.W, a2.total - a2.extras, bb[1] ? { ...bb[1], pid: marqB.pid } : null, exB, forcedB_A2);
    if (innB2) bw(`${mid}-4`, squadA, b2.W, b2.total - b2.extras, ab[1] ? { ...ab[1], pid: marqA.pid } : null, exA, null);
  } else {
    bowlSide(`${mid}-1`, squadB, a1.W, a1.total - a1.extras, marqBowl(marqB), fp.maxOv, exB, forcedB_A1 ? [forcedB_A1] : []);
    bowlSide(`${mid}-2`, squadA, b1.W, b1.total - b1.extras, marqBowl(marqA), fp.maxOv, exA, forcedB_B1 ? [forcedB_B1] : []);
  }
  seq++;
}

// ---------- fixture plan ----------
const pranav = () => ({ pid: P, pos: pick([3, 6, 7]), row: null });
const akhil = () => ({ pid: A, pos: 1, row: null });
const none = () => ({ pid: null, pos: 1, row: null });

const PLAN = [];

const d0 = (row, fallback) => (row && row.date && /^\d{4}-\d{2}-\d{2}$/.test(row.date) ? row.date : fallback);
const lk = (rows, name) => rows.filter((r) => r.match === name);

const mk = (date, row, tour, fmt, teamA, teamB, pool, withAkhil, stage) => {
  const reqNames = [];
  if (row) {
    const ep1 = extractPlayersFromDis(row.dis);
    if (ep1.bowler) reqNames.push(ep1.bowler);
    if (ep1.fielder) reqNames.push(ep1.fielder);
    if (ep1.wk) reqNames.push(ep1.wk);
    if (row.note) {
      const p2 = parse2ndInn(row.note, [], 3);
      if (p2 && p2.dismissal) {
        const ep2 = extractPlayersFromDis(p2.dismissal);
        if (ep2.bowler) reqNames.push(ep2.bowler);
        if (ep2.fielder) reqNames.push(ep2.fielder);
        if (ep2.wk) reqNames.push(ep2.wk);
      }
    }
  }
  const reqBIds = reqNames.map((n) => pid(n)).filter(Boolean);
  const sq = mkSquads(pool, P, withAkhil ? A : null, [], reqBIds);
  return { date, tour, fmt, teamA, teamB, squadA: sq.A, squadB: sq.B, marqA: { ...pranav(), row: row.R == null ? null : row }, marqB: withAkhil ? akhil() : none(), note: row.note, ...(stage ? { stage } : {}) };
};
const spreadDates = (n, y0, y1, salt) => Array.from({ length: n }, (_, k) => {
  const t = n === 1 ? 0.5 : k / (n - 1);
  const span = y1 - y0;
  const year = y0 + Math.min(span, Math.floor(t * (span + 1)));
  const rem = t * (span + 1) - Math.floor(t * (span + 1));
  const month = 1 + Math.floor(rem * 12);
  const day = 1 + ((k * 17 + salt) % 28);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
});

P_TEST.forEach((row, i) => PLAN.push(mk(d0(row, spreadDates(1, 2020, 2024, 3)[0]), row, 't-shared-mp', 'Test', 't-mp-a', 't-mp-b', COMBINED, false)));
P_ODI.forEach((row) => PLAN.push(mk(d0(row, '2023-09-20'), row, 't-shared-de-odi', 'ODI', 't-de', 't-des', COMBINED, false)));
lk(P_T20, 'RJ A v RJ B').forEach((row) => PLAN.push(mk(d0(row, '2022-03-10'), row, 't-shared-rj', 'T20', 't-rj-a', 't-rj-b', RJ_POOL, false)));
lk(P_T20, 'DE v DES').forEach((row) => PLAN.push(mk(d0(row, '2021-08-28'), row, 't-shared-de', 'T20', 't-de', 't-des', COMBINED, false)));
lk(P_T20, 'LSG A v LSG B').forEach((row) => PLAN.push(mk(d0(row, '2022-11-07'), row, 't-shared-lsg', 'T20', 't-lsg-a', 't-lsg-b', LSG_POOL, false)));
const deFinals = PLAN.filter((m2) => m2.tour === 't-shared-de');
if (deFinals.length > 0) deFinals[deFinals.length - 1].stage = 'Final';
const rcbRows = lk(P_T20, 'RCB A v RCB B');
rcbRows.forEach((row) => PLAN.push(mk(d0(row, '2024-11-08'), row, 't-shared-rcb', 'T20', 't-rcb-a', 't-rcb-b', RCB_2024, false)));

PLAN.sort((a, b) => a.date.localeCompare(b.date));

// attach Akhil ledger rows in order: 10 Tests / 12 ODIs / 12 shared T20s, then 2 MI T20s
{
  const byFmt = (f) => PLAN.filter((m2) => m2.fmt === f && m2.fmt !== 'IPL');
  const tests = byFmt('Test'), odis = byFmt('ODI'), t20s = byFmt('T20');
  const sharedT20 = t20s.filter((m2) => m2.tour !== 't-shared-rcb');
  if (tests.length < A_TEST.length || odis.length < A_ODI.length || sharedT20.length < A_T20.length - 2) throw new Error('Shared matches insufficient for Akhil ledger');
  tests.slice(0, A_TEST.length).forEach((m2, i) => { m2.marqB.pid = A; m2.marqB.row = A_TEST[i]; });
  odis.slice(0, A_ODI.length).forEach((m2, i) => { m2.marqB.pid = A; m2.marqB.row = A_ODI[i]; });
  sharedT20.slice(0, A_T20.length - 2).forEach((m2, i) => { m2.marqB.pid = A; m2.marqB.row = A_T20[i]; });
}
// MI A v MI B (Akhil only)
{
  for (let i = 0; i < 2; i++) {
    const sq = mkSquads(MI_2024, A, null);
    const row = A_T20[A_T20.length - 2 + i];
    PLAN.push({ date: i === 0 ? '2024-11-14' : '2024-11-16', tour: 't-shared-mi', fmt: 'T20', teamA: 't-mi-a', teamB: 't-mi-b', squadA: sq.A, squadB: sq.B, marqA: none(), marqB: { ...akhil(), row }, note: row.note });
  }
}

// IPL — RCB v KKR (IPL 2025 M58) abandoned — no ball bowled (rain), May 17 2025
{
  const ipl = P_IPL[0];
  const d = (ipl && ipl.date) || '2025-05-17';
  db.matches.push({ id: `m-shared-${seq++}`, slug: 'rcb-vs-kkr-2025-05-17', tournamentId: 't-shared-rcb-kkr', seasonId: seasonOf(+d.slice(0, 4)), teamAId: 't-royal-challengers-bengaluru', teamBId: 't-kkr', matchDate: d, format: 'IPL', status: 'abandoned', resultText: 'Match abandoned — rain, no ball bowled', matchNumber: seq - 1, notes: (ipl && ipl.note) || 'IPL 2025 M58. Match abandoned without a ball bowled due to rain.', note: null, playerIds: [P] });
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
  pl.profileStats = {
    matches: F.reduce((x, f) => x + S[f].matches.size, 0),
    runs: F.reduce((x, f) => x + S[f].runs, 0),
    wickets: F.reduce((x, f) => x + S[f].wkts, 0),
  };
  return { bat: pl.stats.batting.rows, bowl: pl.stats.bowling.rows, totals: { r: F.reduce((x, f) => x + S[f].runs, 0), w: F.reduce((x, f) => x + S[f].wkts, 0) } };
}
const plP = db.players.find((p) => p.id === P);
const plA = db.players.find((p) => p.id === A);
if (plP) delete plP.teamId;
if (plA) delete plA.teamId;
// Career statistics are computed from the generated match data (recompute above) so
// the summary table, page header and per-match tables reconcile exactly.

plA.teams = ['t-rewa-jaguars', 't-destroyers', 't-madhya-pradesh', 't-mumbai-indians'];

plP.teams = ['t-rewa-jaguars', 't-destroyers', 't-madhya-pradesh', 't-royal-challengers-bengaluru'];

// ---------- reconcile scorecards (ensure 100% bowler/dismissal agreement) ----------
function reconcileScorecards(db) {
  // Purge any previously injected fake bowling entries
  db.bowling = db.bowling.filter(
    (bw) => !(bw.id && bw.id.startsWith('w-m-shared-') && bw.overs === 3.0 && bw.runs === 20 && bw.economy === 6.67)
  );

  function getBowlerFromDismissal(disStr) {
    if (!disStr || disStr === 'not out' || disStr === '0' || disStr.startsWith('DNB')) return null;
    const s = disStr.trim();
    if (s.startsWith('run out')) return null;
    if (s.startsWith('c & b ')) {
      return s.replace('c & b ', '').trim();
    }
    const m = s.match(/b\s+([^(]+?)(?:\s*\(wk.*?\))?$/i);
    if (m) return m[1].trim();
    return null;
  }

  const lastWord = (n) => (n || '').trim().split(' ').pop().toLowerCase();

  function matchBowler(rawName, bowlers) {
    if (!rawName) return null;
    const target = rawName.toLowerCase().trim();
    let found = bowlers.find((b) => b.name.toLowerCase() === target);
    if (found) return found;
    const lw = lastWord(target);
    found = bowlers.find((b) => lastWord(b.name) === lw);
    if (found) return found;
    return null;
  }

  for (const inn of db.innings) {
    const bat = db.batting.filter((b) => b.inningsId === inn.id);
    const bowl = db.bowling.filter((b) => b.inningsId === inn.id);
    if (!bat.length || !bowl.length) continue;

    const dismissedBatters = bat.filter((b) => !b.notOut);

    const bowlers = bowl.map((bw) => {
      const p = db.players.find((x) => x.id === bw.playerId);
      return {
        record: bw,
        playerId: bw.playerId,
        name: p ? p.name : 'Unknown Bowler',
        claimedBatters: [],
        target: bw.wickets || 0,
      };
    });

    // First pass: Handle marquee batters (P and A). Their dismissal is sacred and never altered!
    const marqueeDismissed = dismissedBatters.filter((b) => b.playerId === P || b.playerId === A || b.isMarquee);
    const nonMarqueeDismissed = dismissedBatters.filter((b) => !(b.playerId === P || b.playerId === A || b.isMarquee));

    for (const b of marqueeDismissed) {
      const rawBName = getBowlerFromDismissal(b.dismissal);
      if (rawBName) {
        let assignedBw = matchBowler(rawBName, bowlers);
        if (!assignedBw) {
          const pObj = db.players.find((x) => x.name.toLowerCase() === rawBName.toLowerCase() || lastWord(x.name) === lastWord(rawBName));
          if (pObj) {
            const availableBw = bowlers.find((bw) => bw.claimedBatters.length === 0 && bw.playerId !== P && bw.playerId !== A);
            if (availableBw) {
              availableBw.playerId = pObj.id;
              availableBw.record.playerId = pObj.id;
              availableBw.name = pObj.name;
              assignedBw = availableBw;
            }
          }
        }
        if (assignedBw) {
          assignedBw.claimedBatters.push(b);
          assignedBw.target = Math.max(assignedBw.target, assignedBw.claimedBatters.length);
        }
      }
    }

    // If a marquee dismissal names a bowler that couldn't be found on the card (e.g. a
    // partial name), credit it to an available card bowler so card wickets always reconcile.
    for (const b of marqueeDismissed) {
      if (!getBowlerFromDismissal(b.dismissal)) continue; // run out / no bowler credit
      if (bowlers.some((bw) => bw.claimedBatters.includes(b))) continue; // already claimed
      const avail = bowlers.find((bw) => bw.playerId !== P && bw.playerId !== A) || bowlers[0];
      if (avail) {
        avail.claimedBatters.push(b);
        avail.target = Math.max(avail.target, avail.claimedBatters.length);
        const bName = avail.name;
        if (b.dismissal.toLowerCase().startsWith('c ')) {
          const fielder = (b.dismissal.match(/^c\s+(.+?)\s+b\s+/i) || [])[1] || 'Fielder';
          b.dismissal = fielder.toLowerCase() === bName.toLowerCase() ? `c & b ${bName}` : `c ${fielder} b ${bName}`;
        } else if (b.dismissal.toLowerCase().startsWith('lbw ')) {
          b.dismissal = `lbw b ${bName}`;
        } else if (b.dismissal.toLowerCase().startsWith('st ')) {
          const keeper = (b.dismissal.match(/^st\s+(.+?)\s+b\s+/i) || [])[1] || 'Chanchal Rathore';
          b.dismissal = `st ${keeper} b ${bName}`;
        } else {
          b.dismissal = `b ${bName}`;
        }
      }
    }

    // Balance targets for remaining dismissals
    let currentTotalTarget = bowlers.reduce((s, b) => s + b.target, 0);
    if (currentTotalTarget !== dismissedBatters.length) {
      let diff = dismissedBatters.length - currentTotalTarget;
      if (diff > 0) {
        bowlers.sort((a, b) => (b.record.overs || 0) - (a.record.overs || 0));
        for (let i = 0; i < diff; i++) {
          bowlers[i % bowlers.length].target += 1;
        }
      } else if (diff < 0) {
        for (let i = bowlers.length - 1; i >= 0 && diff < 0; i--) {
          const canReduce = bowlers[i].target - bowlers[i].claimedBatters.length;
          if (canReduce > 0) {
            const reduce = Math.min(canReduce, -diff);
            bowlers[i].target -= reduce;
            diff += reduce;
          }
        }
      }
    }

    // Second pass: Assign non-marquee batters to bowlers needing wickets
    for (const b of nonMarqueeDismissed) {
      let assignedBw = bowlers.find((bw) => bw.claimedBatters.length < bw.target);
      if (!assignedBw) {
        assignedBw = bowlers[0];
      }
      if (assignedBw) {
        assignedBw.claimedBatters.push(b);
        const bName = assignedBw.name;
        if (b.dismissal && b.dismissal.startsWith('run out')) {
          // keep run out
        } else if (b.dismissal && b.dismissal.includes('c & b')) {
          b.dismissal = `c & b ${bName}`;
        } else if (b.dismissal && b.dismissal.startsWith('st ')) {
          const parts = b.dismissal.split(' b ');
          const keeperPart = parts[0].replace('st', '').trim();
          const keeper = keeperPart.length > 0 && keeperPart.toLowerCase() !== 'b' ? keeperPart : 'Chanchal Rathore';
          b.dismissal = `st ${keeper} b ${bName}`;
        } else if (b.dismissal && b.dismissal.startsWith('lbw ')) {
          b.dismissal = `lbw b ${bName}`;
        } else if (b.dismissal && b.dismissal.startsWith('c ')) {
          const mC = b.dismissal.match(/^c\s+(.+?)\s+b\s+/i);
          const fielder = mC ? mC[1].trim() : 'Fielder';
          b.dismissal = fielder.toLowerCase() === bName.toLowerCase() ? `c & b ${bName}` : `c ${fielder} b ${bName}`;
        } else {
          b.dismissal = `b ${bName}`;
        }
      }
    }

    for (const bw of bowlers) {
      bw.record.wickets = bw.claimedBatters.length;
    }

    inn.wickets = dismissedBatters.length;
  }
}

reconcileScorecards(db);

// Recompute career stats AFTER scorecard reconciliation so summary, header and per-match tables agree.
const statsP = recompute(P);
const statsA = recompute(A);

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