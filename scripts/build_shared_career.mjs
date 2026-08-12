// Build Pranav's (101) and Akhil's (51) careers from their ledgers, with rule-consistent scorecards.
// - Each player plays ONLY their own fixtures (P: 43 Test/23 ODI/34 T20/1 IPL, A: 23 Test/12 ODI/16 T20).
// - Scorecards follow basic cricket laws: 11-player XIs, <=2 not outs, dismissed=wickets,
//   team score = batter runs + extras, bowler wickets <= team wickets, legal-ball economy.
// - Fill players are real Rewa/MP players (no synthetic club names).
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
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
const GEN_TEAMS = ['t-mp-a', 't-mp-b', 't-rj-a', 't-rj-b', 't-mi-a', 't-mi-b', 't-de', 't-des', 't-rcb-a', 't-rcb-b', 't-rcb-v-kkr-a', 't-rcb-v-kkr-b', 't-destroyers', 't-daredevils'];
db.teams = db.teams.filter((t) => !GEN_TEAMS.includes(t.id));
db.players = db.players.filter((p) => !p.id.startsWith('p-club-'));

// ---------- real player pools ----------
const P = 'p-pranav-dwivedi', A = 'p-akhil-mishra';
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const byName = new Map(db.players.map((p) => [p.name.toLowerCase(), p]));
const ids = (names) => names.map((n) => { const p = byName.get(n.toLowerCase()); if (!p) throw new Error('missing player: ' + n); return p.id; });
const MP_POOL = ids([
  'Rajat Patidar', 'Yash Dubey', 'Himanshu Mantri', 'Harsh Gawli', 'Aditya Shrivastava', 'Subhranshu Senapati',
  'Venkatesh Iyer', 'Saransh Jain', 'Shubham Sharma', 'Anubhav Agarwal', 'Avesh Khan', 'Kuldeep Sen',
  'Kumar Kartikeya', 'Kulwant Khejroliya', 'Arshad Khan', 'Rahul Batham',
]);
const RJ_POOL = ids([
  'Prithviraj Singh Tomar', 'Akshat Raghuwanshi', 'Atharv Mahajan', 'Sagar Pratap Singh', 'Anant Verma', 'Jaydev Singh',
  'Himanshu Mantri', 'Chanchal Rathore', 'Kanishk Dubey', 'Ajay Rohera', 'Sagar Solanki', 'Ankit Singh Kushwaha',
  'Naveen Singh Chouhan', 'Mohd Arham Aquil', 'Aryan Deshmukh', 'Saransh Surana', 'Ramveer Singh Gurjar', 'Ashwin Das',
  'Rohit Rajawat', 'Prabhanshu Shukla', 'Ritesh Shakya', 'Radhakrishna Dwivedi', 'Kuldeep Sen', 'Kumar Kartikeya',
  'Shivam Shukla', 'Mohd Arshad Khan', 'Kulwant Khejroliya', 'Amarjeet Kumar Singh',
]);
const COMBINED = [...new Set([...MP_POOL, ...RJ_POOL])];
const poolFor = (tp) => (tp === 'rj' ? RJ_POOL : COMBINED);
const playerName = (id) => byName.get(db.players.find((p) => p.id === id).name.toLowerCase()).name;

// ---------- teams / tournaments ----------
const TEAMS = {
  't-mp-a': ['MP A', 'MP A'], 't-mp-b': ['MP B', 'MP B'],
  't-rj-a': ['RJ A', 'RJ A'], 't-rj-b': ['RJ B', 'RJ B'],
  't-de': ['DE', 'DE'], 't-des': ['DES', 'DES'],
  't-rcb-a': ['RCB A', 'RCB A'], 't-rcb-b': ['RCB B', 'RCB B'],
  't-mi-a': ['MI A', 'MI A'], 't-mi-b': ['MI B', 'MI B'],
};
for (const [id, [name, slug2]] of Object.entries(TEAMS)) if (!db.teams.some((t) => t.id === id)) db.teams.push({ id, name, slug: slug(slug2), shortCode: name, description: 'Intra-squad / trial side.', establishedYear: 2021 });
for (const [id, name, sc] of [['t-royal-challengers-bengaluru', 'Royal Challengers Bengaluru', 'RCB'], ['t-mumbai-indians', 'Mumbai Indians', 'MI'], ['t-madhya-pradesh', 'Madhya Pradesh', 'MP'], ['t-rewa-jaguars', 'Rewa Jaguars', 'RJ'], ['t-kkr', 'Kolkata Knight Riders', 'KKR']]) if (!db.teams.some((t) => t.id === id)) db.teams.push({ id, name, slug: slug(sc), shortCode: sc, description: '', establishedYear: 2021 });

const TOURS = {
  't-shared-mp': ['MP A v MP B', 'First-class', 'state'],
  't-shared-rj': ['RJ A v RJ B', 'T20', 'division'],
  't-shared-de': ['DE v DES', 'ODI', 'division'],
  't-shared-odide': ['DE v DES T20', 'T20', 'division'],
  't-shared-rcb': ['RCB A v RCB B', 'T20', 'ipl'],
  't-shared-mi': ['MI A v MI B', 'T20', 'ipl'],
};
for (const [id, [name, fmt, scope]] of Object.entries(TOURS)) if (!db.tournaments.some((t) => t.id === id)) db.tournaments.push({ id, name, slug: slug(name), format: fmt, status: 'completed', category: 'official', scope, description: 'Intra-squad trial series.' });

// ---------- deterministic RNG ----------
function mulberry32(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(2026081251);
const ri = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

// ---------- ledger parsing ----------
const parse = (f, map) => readFileSync(join(ROOT, 'data', f), 'utf8').trim().split('\n').slice(1).map((l) => l.split(','))
  .map((c) => ({ seq: +c[map.seq], match: c[map.match], fmt: c[map.fmt], R: c[map.R] === 'DNB' ? null : +c[map.R], B: +c[map.B], f4: +c[map.f4], f6: +c[map.f6], dis: c[map.dis], O: c[map.O], M: c[map.M], Rr: c[map.Rr], W: c[map.W], note: c[map.note] || '' }));
const PRANAV_MAP = { seq: 0, match: 2, fmt: 3, R: 4, B: 5, f4: 6, f6: 7, dis: 8, O: 9, M: 10, Rr: 11, W: 12, note: 13 };
const AKHIL_MAP = { seq: 0, match: 1, fmt: 3, R: 4, B: 5, f4: 6, f6: 7, dis: 9, O: 10, M: 11, Rr: 12, W: 13, note: 14 };
const P_ROWS = parse('pranav.career.csv', PRANAV_MAP);
const A_ROWS = parse('akhil.career.csv', AKHIL_MAP);

// interleave formats within a player's timeline (avoid all-Tests-then-all-ODIs)
function interleave(rows) {
  const groups = {};
  for (const fmt of [...new Set(rows.map((r) => r.fmt))]) groups[fmt] = rows.filter((r) => r.fmt === fmt);
  const out = []; let guard = 0;
  while (guard++ < 10000) {
    let moved = false;
    for (const fmt of Object.keys(groups)) if (groups[fmt].length) { out.push(groups[fmt].shift()); moved = true; }
    if (!moved) break;
  }
  return out;
}
const P_MIX = interleave(P_ROWS);
const A_MIX = interleave(A_ROWS);

// dates: one pool for the whole career timeline, unique per match
const DATES = [];
for (let y = 2021; y <= 2025; y++) for (let mo = 1; mo <= 12; mo++) for (const dd of [3, 8, 13, 18, 23, 28]) DATES.push(`${y}-${String(mo).padStart(2, '0')}-${String(dd).padStart(2, '0')}`);
let dateCursor = 0;
const nextDate = () => DATES[dateCursor++ % DATES.length];
const seasonOf = (y) => ({ 2021: 's2021', 2022: 's2022', 2023: 's-2023', 2024: 's-2024', 2025: 's2025' }[y] || 's-2024');

// ---------- cricket helpers ----------
const legalOvers = (ov) => Math.floor(ov) + Math.round((ov - Math.floor(ov)) * 10) / 6;
const legalBalls = (ov) => Math.floor(ov) * 6 + Math.round((ov - Math.floor(ov)) * 10);
const fmtParams = {
  Test: { maxOv: 90, totalLo: 285, totalHi: 430, extras: [10, 30], bowlOvers: [10, 18], eco: [2.5, 4.6], ballsMul: 2.3, f6Div: 22, f4Div: 5.5, wkts: [6, 10] },
  ODI: { maxOv: 50, totalLo: 205, totalHi: 290, extras: [8, 22], bowlOvers: [5, 10], eco: [3.8, 6.4], ballsMul: 1.15, f6Div: 14, f4Div: 5, wkts: [6, 10] },
  T20: { maxOv: 20, totalLo: 140, totalHi: 185, extras: [4, 14], bowlOvers: [2, 4], eco: [5.5, 10], ballsMul: 0.65, f6Div: 9, f4Div: 4.5, wkts: [5, 10] },
};
const FICTIONAL = { Saini: 0, Vora: 1, Malhotra: 2, Tessitore: 3, Bedi: 4, 'S. Verma': 5, Verma: 5, 'A. Choubey': 6, 'R. Tiwari': 7, 'V. Tripathi': 8, 'N. Sen': 9, 'P. Baghel': 10, 'M. Patel': 11, 'K. Singh': 12, 'D. Yadav': 13, 'R. Prajapati': 14, 'S. Mishra': 15, 'T. Gupta': 16, 'L. Ahirwar': 17, 'B. Kushwaha': 18, 'G. Pateria': 19, 'H. Nema': 20 };
function realisticDismissal(ledgerDis, xiNames) {
  if (!ledgerDis) return null;
  const names = xiNames;
  let out = ledgerDis;
  const subName = (nm) => (FICTIONAL[nm] != null ? names[FICTIONAL[nm] % names.length] : nm);
  out = out
    .replace(/^c & b (.+)$/, (_, b) => `c & b ${subName(b)}`)
    .replace(/^c (.+) b (.+)$/, (_, f, b) => `c ${subName(f)} b ${subName(b)}`)
    .replace(/^c (.+)$/, (_, f) => `c ${subName(f)}`)
    .replace(/^st b (.+) \(wk (.+)\)$/, (_, b, f) => `st b ${subName(b)} (wk ${subName(f)})`)
    .replace(/^lbw b (.+)$/, (_, b) => `lbw b ${subName(b)}`)
    .replace(/^b (.+)$/, (_, b) => `b ${subName(b)}`);
  return out;
}
function genFillBat(fmt, runs) {
  const fp = fmtParams[fmt];
  const f6 = clamp(Math.round(runs / fp.f6Div), 0, Math.floor(runs / 6));
  const f4 = clamp(Math.round((runs - 6 * f6) / fp.f4Div), 0, Math.floor((runs - 6 * f6) / 4));
  const balls = clamp(Math.round(runs * fp.ballsMul), Math.max(1, f4 + f6), Math.max(Math.max(1, f4 + f6), Math.round(runs * fp.ballsMul) + 10));
  return { runs, balls, fours: f4, sixes: f6, sr: +(balls ? (runs / balls) * 100 : 0).toFixed(2) };
}
function distributeSum(S, n) {
  const out = new Array(n).fill(0);
  let remaining = S;
  for (let k = 0; k < n - 1; k++) {
    const left = n - k - 1;
    const maxK = Math.min(95, remaining - left);
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
function genBowlingCard(fmt, xiNames, wktsLeft, oversHint) {
  const fp = fmtParams[fmt];
  const ov = oversHint || ri(fp.bowlOvers[0], fp.bowlOvers[1]);
  const maidens = fmt === 'Test' ? clamp(Math.round(ov / 3), 0, Math.floor(ov / 2)) : fmt === 'ODI' ? (rnd() < 0.4 ? 1 : 0) : (rnd() < 0.2 ? 1 : 0);
  const runs = clamp(Math.round(ov * (fp.eco[0] + rnd() * (fp.eco[1] - fp.eco[0]))), 0, 200);
  const w = Math.min(ri(0, 3), wktsLeft);
  return { overs: ov, maidens, runs, wickets: w, eco: +(runs / ov).toFixed(2) };
}

// ---------- match builder ----------
const fixtures = [];
for (const r of P_MIX) fixtures.push({ pid: P, prefix: 'm-pranav', row: r });
for (const r of A_MIX) fixtures.push({ pid: A, prefix: 'm-akhil', row: r });
let seq = 1;

function teamPair(match) {
  if (/MP A/.test(match)) return 'mp';
  if (/RJ A/.test(match)) return 'rj';
  if (/DE v DES/.test(match)) return 'de';
  if (/RCB/.test(match)) return 'rcb';
  if (/MI A/.test(match)) return 'mi';
  return 'other';
}
const tourFor = (tp, fmt) => ({ mp: 't-shared-mp', rj: 't-shared-rj', de: /T20/.test(fmt) ? 't-shared-odide' : 't-shared-de', rcb: 't-shared-rcb', mi: 't-shared-mi' }[tp] || 't-shared-rcb');
const sideTeams = (tp, side, match) => {
  if (tp === 'mp') return side === 'A' ? 't-mp-a' : 't-mp-b';
  if (tp === 'rj') return side === 'A' ? 't-rj-a' : 't-rj-b';
  if (tp === 'de') return side === 'A' ? 't-de' : 't-des';
  if (tp === 'rcb' && !/IPL/.test(match)) return side === 'A' ? 't-rcb-a' : 't-rcb-b';
  if (tp === 'rcb') return side === 'A' ? 't-royal-challengers-bengaluru' : 't-kkr';
  return side === 'A' ? 't-mi-a' : 't-mi-b';
};

function buildMatch({ pid, prefix, date, row }) {
  const tp = teamPair(row.match);
  const fmt = row.fmt === 'IPL' ? 'IPL' : row.fmt;
  const isIPL = fmt === 'IPL';
  const pool = poolFor(tp).filter((id) => id !== pid);
  const teamA = sideTeams(tp, 'A', row.match), teamB = sideTeams(tp, 'B', row.match);
  const tNameA = db.teams.find((t) => t.id === teamA).name, tNameB = db.teams.find((t) => t.id === teamB).name;
  const fp = fmtParams[fmt];

  const mid = `${prefix}-${seq}`;
  const innA = `${mid}-1`, innB = `${mid}-2`;
  const innOvers = isIPL ? 0 : fp.maxOv;

  if (isIPL) {
    db.matches.push({ id: mid, slug: `${slug(tNameA)}-vs-${slug(tNameB)}-${date}`, tournamentId: 't-shared-rcb', seasonId: seasonOf(+date.slice(0, 4)), teamAId: teamA, teamBId: teamB, matchDate: date, format: 'IPL', status: 'abandoned', resultText: 'Match abandoned without a ball bowled (rain)', matchNumber: seq, notes: 'IPL match — abandoned before play.', note: null, playerIds: [pid] });
    seq++;
    return;
  }

  const used = new Set([pid]);
  const xiA = shuffle(pool).filter((id) => !used.has(id)).slice(0, 10); // + marquee = 11
  for (const id of xiA) used.add(id);
  const xiB = shuffle(pool).filter((id) => !used.has(id)).slice(0, 11);
  for (const id of xiB) used.add(id);
  const xiAAll = [pid, ...xiA], xiBNames = xiB.map((id) => playerName(id)), xiANames = xiAAll.map((id) => playerName(id));

  // ---- innings A: team A bats (marquee bats) ----
  const marqueeBats = row.R !== null;
  const marqueeDis = !marqueeBats ? null : row.dis === 'not out' ? null : realisticDismissal(row.dis, xiBNames);
  const marqueeNO = marqueeBats && row.dis === 'not out';
  const extrasA = isIPL ? 0 : ri(fp.extras[0], fp.extras[1]);
  let W_A = ri(fp.wkts[0], fp.wkts[1]);
  if (marqueeBats && !marqueeNO) W_A = clamp(W_A, 1, 10);
  if (marqueeBats && marqueeNO) W_A = clamp(W_A, fp.wkts[0], 9);
  const NO_A = W_A === 10 ? 0 : 2;
  const slotsA = W_A + NO_A;
  const TA = Math.max(ri(fp.totalLo, fp.totalHi), (marqueeBats ? row.R : 0) + extrasA + slotsA);
  const batSumA = TA - extrasA;
  const marqRuns = marqueeBats ? row.R : 0;
  const fillRunsA = distributeSum(batSumA - marqRuns, slotsA - (marqueeBats ? 1 : 0));
  let disLeftA = W_A - (marqueeBats && !marqueeNO ? 1 : 0);
  let noLeftA = NO_A - (marqueeNO ? 1 : 0);
  const batA = [];
  if (marqueeBats) batA.push({ pid, runs: marqRuns, balls: row.B, fours: row.f4, sixes: row.f6, dismissal: marqueeDis, notOut: marqueeNO, sr: row.B ? +((row.R / row.B) * 100).toFixed(2) : 0 });
  const batOrder = shuffle(xiA);
  const disTypes = (fn, bn) => { const r = rnd(); if (r < 0.45) return `c ${fn} b ${bn}`; if (r < 0.7) return `b ${bn}`; if (r < 0.88) return `lbw b ${bn}`; return `st b ${bn} (wk ${fn})`; };
  for (let k = 0; k < fillRunsA.length; k++) {
    const id = batOrder[k % batOrder.length];
    const g = genFillBat(fmt, fillRunsA[k]);
    const isNO = noLeftA > 0 && (disLeftA === 0 || (rnd() < 0.2 && noLeftA > 0));
    let dis = null, no = false;
    if (isNO) { no = true; noLeftA--; }
    else { disLeftA--; const fn = xiBNames[Math.floor(rnd() * xiBNames.length)], bn = xiBNames[Math.floor(rnd() * xiBNames.length)]; dis = disTypes(fn, bn); }
    batA.push({ pid: id, runs: g.runs, balls: g.balls, fours: g.fours, sixes: g.sixes, dismissal: dis, notOut: no, sr: g.sr });
  }
  if (disLeftA > 0 || noLeftA > 0) throw new Error('battter slot mismatch');

  // bowling for innings A: 5 bowlers from team B XI, sum wickets = W_A
  const bowlA = [];
  let wLeftA = W_A;
  const bA = shuffle(xiB).slice(0, 5);
  const ovSumA = fp.maxOv - ri(0, 5);
  let ovLeftA = ovSumA;
  const runsDesiredA = batSumA + Math.min(extrasA, ri(2, 8));
  let runsLeftA = runsDesiredA;
  for (let k = 0; k < bA.length; k++) {
    const last = k === bA.length - 1;
    const ov = last ? ovLeftA : clamp(Math.round(ovLeftA / (bA.length - k)) + ri(-2, 2), 1, ovLeftA - (bA.length - k - 1));
    const w = last ? wLeftA : Math.min(ri(0, 3), wLeftA - (bA.length - k - 1));
    const runs = last ? Math.max(0, runsLeftA) : clamp(ri(0, 60), 0, runsLeftA - (bA.length - k - 1));
    bowlA.push({ pid: bA[k], overs: ov, maidens: fmt === 'Test' ? clamp(Math.round(ov / 3), 0, Math.floor(ov / 2)) : (rnd() < 0.4 ? 1 : 0), runs, wickets: w, eco: ov ? +(runs / ov).toFixed(2) : 0 });
    ovLeftA -= ov; runsLeftA -= runs; wLeftA -= w;
  }
  if (wLeftA !== 0) bowlA[bowlA.length - 1].wickets += wLeftA;

  // ---- innings B: team B bats (marquee bowls) ----
  const marqBowl = row.O && row.O !== '-';
  const marqW = marqBowl ? +row.W : 0;
  const extrasB = ri(fp.extras[0], fp.extras[1]);
  let W_B = marqBowl ? clamp(ri(fp.wkts[0], fp.wkts[1]), marqW, 10) : ri(fp.wkts[0], fp.wkts[1]);
  const NO_B = W_B === 10 ? 0 : 2;
  const slotsB = W_B + NO_B;
  const winB = rnd() < 0.55;
  const TB = winB ? TA + ri(1, 30) : Math.max(TA - ri(5, 45), slotsB + extrasB);
  const batSumB = TB - extrasB;
  const fillRunsB = distributeSum(batSumB, slotsB);
  let disLeftB = W_B, noLeftB = NO_B;
  const batB = [];
  const batOrderB = shuffle(xiB);
  for (let k = 0; k < fillRunsB.length; k++) {
    const id = batOrderB[k % batOrderB.length];
    const g = genFillBat(fmt, fillRunsB[k]);
    const isNO = noLeftB > 0 && (disLeftB === 0 || (rnd() < 0.2 && noLeftB > 0));
    let dis = null, no = false;
    if (isNO) { no = true; noLeftB--; }
    else { disLeftB--; const fn = xiANames[Math.floor(rnd() * xiANames.length)], bn = xiANames[Math.floor(rnd() * xiANames.length)]; dis = disTypes(fn, bn); }
    batB.push({ pid: id, runs: g.runs, balls: g.balls, fours: g.fours, sixes: g.sixes, dismissal: dis, notOut: no, sr: g.sr });
  }
  if (disLeftB !== 0 || noLeftB !== 0) throw new Error('batter slot mismatch B');

  // bowling for innings B: marquee (ledger) + 4 bowlers from team A XI
  const bowlB = [];
  if (marqBowl) {
    bowlB.push({ pid, overs: +row.O, maidens: +row.M || 0, runs: +row.Rr, wickets: marqW, eco: legalOvers(+row.O) ? +((+row.Rr) / legalOvers(+row.O)).toFixed(2) : 0 });
  }
  const fillB = shuffle(xiAAll.filter((id) => id !== pid)).slice(0, 4);
  let wLeftB = W_B - marqW;
  const runsDesiredB = batSumB + Math.min(extrasB, ri(2, 8)) - (marqBowl ? +row.Rr : 0);
  let runsLeftB = runsDesiredB;
  const ovTargetB = fp.maxOv - (marqBowl ? legalOvers(+row.O) : 0);
  let ovLeftB = Math.max(0, ovTargetB);
  for (let k = 0; k < fillB.length; k++) {
    const last = k === fillB.length - 1;
    const ov = last ? Math.max(1, ovLeftB) : clamp(Math.round(ovLeftB / (fillB.length - k)) + ri(-2, 2), 1, Math.max(1, ovLeftB - (fillB.length - k - 1)));
    const w = last ? Math.max(0, wLeftB) : Math.min(ri(0, 3), wLeftB);
    const runs = last ? Math.max(0, runsLeftB) : clamp(ri(0, 60), 0, Math.max(0, runsLeftB));
    bowlB.push({ pid: fillB[k], overs: ov, maidens: fmt === 'Test' ? clamp(Math.round(ov / 3), 0, Math.floor(ov / 2)) : (rnd() < 0.4 ? 1 : 0), runs, wickets: w, eco: ov ? +(runs / ov).toFixed(2) : 0 });
    ovLeftB -= ov; runsLeftB -= runs; wLeftB -= w;
  }
  if (wLeftB > 0) bowlB[bowlB.length - 1].wickets += wLeftB;

  const resultText = TB > TA ? `${tNameB} won by ${10 - W_B} wickets` : `${tNameA} won by ${TA - TB} runs`;
  db.matches.push({ id: mid, slug: `${slug(tNameA)}-vs-${slug(tNameB)}-${date}`, tournamentId: tourFor(tp, fmt), seasonId: seasonOf(+date.slice(0, 4)), teamAId: teamA, teamBId: teamB, matchDate: date, format: fmt, status: 'completed', resultText, matchNumber: seq, notes: row.note || null, note: null, playerIds: [pid] });
  db.innings.push({ id: innA, matchId: mid, teamId: teamA, battingOrder: 1, runs: TA, wickets: W_A, overs: innOvers }, { id: innB, matchId: mid, teamId: teamB, battingOrder: 2, runs: TB, wickets: W_B, overs: innOvers });
  for (const b of batA) db.batting.push({ id: `z-${mid}-${b.pid}`, inningsId: innA, playerId: b.pid, runs: b.runs, balls: b.balls, fours: b.fours, sixes: b.sixes, dismissal: b.dismissal, notOut: b.notOut, strikeRate: b.sr });
  for (const b of batB) db.batting.push({ id: `z-${mid}-${b.pid}`, inningsId: innB, playerId: b.pid, runs: b.runs, balls: b.balls, fours: b.fours, sixes: b.sixes, dismissal: b.dismissal, notOut: b.notOut, strikeRate: b.sr });
  for (const w of bowlA) db.bowling.push({ id: `w-${mid}-${w.pid}`, inningsId: innA, playerId: w.pid, overs: w.overs, maidens: w.maidens, runs: w.runs, wickets: w.wickets, economy: w.eco });
  for (const w of bowlB) db.bowling.push({ id: `w-${mid}-${w.pid}`, inningsId: innB, playerId: w.pid, overs: w.overs, maidens: w.maidens, runs: w.runs, wickets: w.wickets, economy: w.eco });
  seq++;
}

for (const f of fixtures) {
  f.row.date = nextDate();
  buildMatch({ pid: f.pid, prefix: f.prefix, date: f.row.date, row: f.row });
}

// ---------- recompute player stats from the match data ----------
const mById = new Map(db.matches.map((m) => [m.id, m]));
const innById = new Map(db.innings.map((i) => [i.id, i]));
function recompute(pid) {
  const bat = db.batting.filter((b) => b.playerId === pid);
  const bowl = db.bowling.filter((b) => b.playerId === pid);
  const S = {}; for (const f of ['Test', 'ODI', 'T20', 'IPL']) S[f] = { matches: new Set(), inns: 0, runs: 0, balls: 0, fours: 0, sixes: 0, notOut: 0, dismissals: 0, hs: 0, hsNo: false, wkts: 0, br: 0, ballsB: 0, bbiW: 0, bbiR: Infinity };
  for (const b of bat) {
    const inn = innById.get(b.inningsId); if (!inn) continue;
    const m = mById.get(inn.matchId); const f = m.format;
    const s = S[f];
    s.matches.add(m.id); s.inns++; s.runs += b.runs || 0; s.balls += b.balls || 0; s.fours += b.fours || 0; s.sixes += b.sixes || 0;
    if (b.notOut) s.notOut++; else s.dismissals++;
    if ((b.runs || 0) > s.hs) { s.hs = b.runs; s.hsNo = !!b.notOut; }
  }
  for (const w of bowl) {
    const inn = innById.get(w.inningsId); if (!inn) continue;
    const m = mById.get(inn.matchId); const s = S[m.format];
    s.matches.add(m.id); s.wkts += w.wickets || 0; s.br += w.runs || 0; s.ballsB += legalBalls(w.overs || 0);
    if ((w.wickets || 0) > s.bbiW || ((w.wickets || 0) === s.bbiW && (w.runs || 0) < s.bbiR)) { s.bbiW = w.wickets; s.bbiR = w.runs || 0; }
  }
  // matches with no cards (abandoned IPL) count via playerIds
  for (const m of db.matches) if (m.playerIds && m.playerIds.includes(pid)) S[m.format].matches.add(m.id);
  const F = ['Test', 'ODI', 'T20', 'IPL'];
  const row = (fn) => F.map((f) => fn(S[f]));
  const num = (v) => (v == null || isNaN(v) ? '–' : String(v));
  const fifties = {}, hundreds = {};
  for (const f of F) { fifties[f] = 0; hundreds[f] = 0; }
  for (const b of bat) {
    const inn = innById.get(b.inningsId); if (!inn) continue;
    const m = mById.get(inn.matchId); const f = m.format;
    if ((b.runs || 0) >= 100) hundreds[f]++; else if ((b.runs || 0) >= 50) fifties[f]++;
  }
  const pl = db.players.find((p) => p.id === pid);
  pl.stats = {
    batting: { formats: F, rows: {
      Matches: row((s) => num(s.matches.size)), Innings: row((s) => num(s.inns)), Runs: row((s) => num(s.runs)),
      Highest: row((s) => (s.hs ? `${s.hs}${s.hsNo ? '*' : ''}` : '–')),
      Average: row((s) => (s.dismissals ? (s.runs / s.dismissals).toFixed(2) : '–')),
      SR: row((s) => (s.balls ? String(Math.round((s.runs / s.balls) * 1000) / 10) : '–')),
      Fours: row((s) => num(s.fours)), Sixes: row((s) => num(s.sixes)),
      '50s': row((s) => num(fifties[s] != null ? 0 : 0)),
      '50s': F.map((f) => num(fifties[f])), '100s': F.map((f) => num(hundreds[f])),
    } },
    bowling: { formats: F, rows: {
      Matches: row((s) => num(s.matches.size)), Wickets: row((s) => num(s.wkts)),
      Avg: row((s) => (s.wkts ? (s.br / s.wkts).toFixed(2) : '–')),
      Eco: row((s) => (s.ballsB ? (s.br / (s.ballsB / 6)).toFixed(2) : '–')),
      BBI: row((s) => (s.bbiW ? `${s.bbiW}/${s.bbiR}` : '–')),
    } },
  };
  return { bat: pl.stats.batting.rows, bowl: pl.stats.bowling.rows };
}
const statsP = recompute(P);
const statsA = recompute(A);
console.log('PRANAV batting:', JSON.stringify(statsP.bat));
console.log('PRANAV bowling:', JSON.stringify(statsP.bowl));

// ---------- assertions ----------
const expect = (actual, exp, label) => { if (JSON.stringify(actual) !== JSON.stringify(exp)) { console.error('MISMATCH', label, JSON.stringify(actual), 'expected', JSON.stringify(exp)); process.exitCode = 1; } else console.log('OK', label); };
expect(statsP.bat.Matches, ['43', '23', '34', '1'], 'P matches');
expect(statsP.bat.Innings, ['43', '23', '33', '0'], 'P innings');
expect(statsP.bat.Runs, ['2180', '742', '688', '0'], 'P runs');
expect(statsP.bat.Highest, ['158*', '121*', '86*', '–'], 'P HS');
expect(statsP.bat.Average, ['72.67', '53.00', '43.00', '–'], 'P avg');
expect(statsP.bat.SR, ['68.5', '112.4', '232.4', '–'], 'P SR');
expect(statsP.bat.Fours, ['244', '76', '48', '0'], 'P fours');
expect(statsP.bat.Sixes, ['34', '29', '47', '0'], 'P sixes');
expect(statsP.bat['50s'], ['13', '8', '7', '0'], 'P 50s');
expect(statsP.bat['100s'], ['5', '2', '0', '0'], 'P 100s');
expect(statsP.bowl.Matches, ['43', '23', '34', '1'], 'P bowl matches');
expect(statsP.bowl.Wickets, ['158', '66', '59', '0'], 'P wickets');
expect(statsP.bowl.Avg, ['26.20', '13.00', '11.69', '–'], 'P bowl avg');
expect(statsP.bowl.Eco, ['2.62', '4.54', '6.80', '–'], 'P eco');
expect(statsP.bowl.BBI, ['5/62', '6/13', '5/2', '–'], 'P BBI');

writeFileSync(DATA, JSON.stringify(db, null, 2) + '\n');
console.log('career built: matches', db.matches.length, 'innings', db.innings.length, 'batting', db.batting.length, 'bowling', db.bowling.length);
