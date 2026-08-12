// Build the MERGED Pranav + Akhil shared career with fully-generated, randomised scorecards.
// Model (per Pranav's answers):
//  - One shared fixture pool from BOTH ledgers (no new matches). Remove 4 Pranav rows (seeded random).
//  - Shared team-pairs (MP A/B, RJ A/B, DE/DES): BOTH players on the same XI (Pranav #3, Akhil opener);
//    a few RJ/MP matches see them on OPPOSITE sides.
//  - Own-team matches: RCB A/B + RCB v KKR → Pranav only; MI A/B → Akhil only.
//  - Dates re-assigned so formats INTERLEAVE across 2021-2025 (fixes the "Test Test Test… ODI ODI" error).
//  - Scorecards generated bottom-up: innings.runs = sum(batter runs)+extras, so totals always match.
//  - Pranav's own ledger numbers are kept on every fixture he sources; Akhil's kept on fixtures he sources.
//  - The co-present partner in a shared fixture gets a realistic supporting score.
import { readFileSync, writeFileSync } from 'fs';
const DATA = '/Users/tanutripathi/Downloads/RAPID/rewa-cricket-division/data/records.json';
const db = JSON.parse(readFileSync(DATA, 'utf8'));

// ---------- PURGE prior akhil/shared data (idempotent) ----------
const oldMatchIds = new Set(db.matches.filter((m) => m.id.startsWith('m-akhil-') || m.id.startsWith('m-shared-')).map((m) => m.id));
const oldInnIds = new Set(db.innings.filter((i) => oldMatchIds.has(i.matchId)).map((i) => i.id));
db.matches = db.matches.filter((m) => !oldMatchIds.has(m.id));
db.innings = db.innings.filter((i) => !oldInnIds.has(i.id));
db.batting = db.batting.filter((b) => !oldInnIds.has(b.inningsId));
db.bowling = db.bowling.filter((w) => !oldInnIds.has(w.inningsId));
db.tournaments = db.tournaments.filter((t) => !t.id.startsWith('t-akhil-'));
// reset the removed akhil combo teams we no longer need (they were only for akhil matches)
const DROP_TEAMS = ['t-red', 't-blue', 't-gold', 't-central-xi', 't-south-xi', 't-west-xi', 't-india-central-xi', 't-india-south-xi', 't-india-west-xi'];
db.teams = db.teams.filter((t) => !DROP_TEAMS.includes(t.id));
// purge prior generated entities so each run recreates them cleanly (no stale slugs)
const GEN_TEAMS = new Set(['t-mp-a','t-mp-b','t-rj-a','t-rj-b','t-mi-a','t-mi-b','t-de','t-des','t-rcb-a','t-rcb-b','t-rcb-v-kkr-a','t-rcb-v-kkr-b','t-destroyers','t-daredevils','t-kkr']);
db.teams = db.teams.filter((t) => !GEN_TEAMS.has(t.id));
db.players = db.players.filter((p) => !p.id.startsWith('p-club-'));
// keep the real clubs un-touched

const P = 'p-pranav-dwivedi', A = 'p-akhil-mishra';
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const seasonOf = (y) => ({ 2021: 's2021', 2022: 's2022', 2023: 's-2023', 2024: 's-2024', 2025: 's2025' }[y] || 's-2024');

// ---------- deterministic RNG ----------
function mulberry32(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(2026081250);
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const ri = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ---------- pools (existing DB players, + born for the shared career) ----------
const existing = new Set(db.players.map((p) => p.id));
const namesById = Object.fromEntries(db.players.map((p) => [p.id, p.name]));
const RJ_BOWLERS = ['p-ashwin-das','p-rohit-rajawat','p-kuldeep-sen','p-kumar-kartikeya','p-shivam-shukla','p-kulwant-khejroliya','p-ritesh-shakya','p-radhakrishna-dwivedi'];
const RJ_BATS = ['p-prithviraj-singh-tomar','p-akshat-raghuwanshi','p-atharv-mahajan','p-anant-verma','p-himanshu-mantri','p-chanchal-rathore','p-sagar-solanki','p-naveen-singh-chouhan'];
const MP_BATS = ['p-aditya-shrivastava','p-yash-dubey','p-shubham-sharma','p-harpreet-singh-bhatia','p-rakesh-thakur','p-subhranshu-senapati','p-arshad-khan','p-saransh-jain'];
const MP_BOWLERS = ['p-avesh-khan','p-gaurav-yadav','p-mihir-hirwani','p-ishwar-pandey','p-rahul-batham'];
// friendly filler names (Render as text only; not in DB -> non-clickable)
const FILL_NAMES = ['S. Verma','A. Choubey','R. Tiwari','V. Tripathi','N. Sen','P. Baghel','M. Patel','K. Singh','D. Yadav','R. Prajapati','S. Mishra','T. Gupta','L. Ahirwar','B. Kushwaha','G. Pateria','H. Nema'];
let FILL_COUNTER = 0;
// Real-ish destroyers/daredevils/professional names (created as real players so scorecards link back)
const CLUB_BATS = ['K. Yadav','R. Sharma','S. Khan','A. Singh','M. Ahmed','D. Kumar','N. Iqbal','P. Rao','T. Khan','V. Anand','L. Verma','B. Joshi','S. Nair','R. Menon'];
const CLUB_BOWLERS = ['Z. Khan','A. Kumar','S. Yadav','R. Chawla','P. Mehta','J. Choudhary','T. Prasad','O. Sharma','Y. Gill','H. Rao'];
// create club players once (id -> name)
const CLUB_PLAYERS = {};
{
  let n = 0;
  const taken = new Set(db.players.map((p) => p.slug));
  for (const nm of [...CLUB_BATS, ...CLUB_BOWLERS]) {
    const id = `p-club-${String(++n).padStart(2, '0')}`;
    if (!db.players.some((p) => p.id === id)) {
      let name = nm, sl = slug(nm), k = 1;
      while (taken.has(sl)) { k++; name = `${nm} ${k}`; sl = slug(name); }
      taken.add(sl);
      db.players.push({ id, name, slug: sl, role: n <= CLUB_BATS.length ? 'Batter' : 'Bowler', bio: '' });
    }
    CLUB_PLAYERS[nm] = id;
  }
}
const POOL_ALL = [...RJ_BATS, ...RJ_BOWLERS, ...MP_BATS, ...MP_BOWLERS, ...Object.values(CLUB_PLAYERS)].filter((id) => db.players.some((p) => p.id === id));

// ---------- read ledgers ----------
// pranav.career.csv: seq,date,match,format,R,B,4s,6s,dismissal,O,M,RW,W,note
// akhil.career.csv:  num,match,date,format,R,B,4s,6s,SR,dismissal,O,M,RW,W,note
const parse = (f, map) => readFileSync(f, 'utf8').trim().split('\n').slice(1).map((l) => l.split(','))
  .map((c) => ({ seq: +c[map.seq], match: c[map.match], fmt: c[map.fmt], R: c[map.R] === 'DNB' ? -1 : +c[map.R], B: +c[map.B], f4: +c[map.f4], f6: +c[map.f6], dis: c[map.dis], O: c[map.O], M: c[map.M], Rr: c[map.Rr], W: c[map.W], note: c[map.note] || '' }));
const PRANAV_MAP = { seq: 0, match: 2, fmt: 3, R: 4, B: 5, f4: 6, f6: 7, dis: 8, O: 9, M: 10, Rr: 11, W: 12, note: 13 };
const AKHIL_MAP = { seq: 0, match: 1, fmt: 3, R: 4, B: 5, f4: 6, f6: 7, dis: 9, O: 10, M: 11, Rr: 12, W: 13, note: 14 };
const P_ROWS = parse('/Users/tanutripathi/Downloads/RAPID/rewa-cricket-division/data/pranav.career.csv', PRANAV_MAP);
const A_ROWS = parse('/Users/tanutripathi/Downloads/RAPID/rewa-cricket-division/data/akhil.career.csv', AKHIL_MAP);

// ---------- remove 4 Pranav rows (seeded random, skip IPL + HS + first/last) ----------
{
  const removable = P_ROWS.filter((r) => !/IPL/.test(r.fmt) && r.note !== 'HS158*' && r.note !== 'HS121*' && r.seq !== 1 && r.seq !== P_ROWS.length);
  const todrop = shuffle(removable).slice(0, 4).map((r) => r.seq);
  const dropped = new Set(todrop);
  const filtered = P_ROWS.filter((r) => !dropped.has(r.seq));
  console.log('dropped Pranav rows:', dropped);
  // reassign seq so ordering is contiguous
  P_ROWS.length = 0; P_ROWS.push(...filtered.map((r, i) => ({ ...r, seq: i })));
}

// ---------- interleave formats per player chronologically ----------
// Take each player's rows-grouped-by-format and round-robin them so formats mix.
function interleave(rows) {
  const groups = {};
  for (const fmt of [...new Set(rows.map((r) => r.fmt))]) groups[fmt] = rows.filter((r) => r.fmt === fmt);
  const out = []; let guard = 0;
  while (guard++ < 10000) {
    let moved = false;
    const fmts = Object.keys(groups);
    for (const fmt of fmts) if (groups[fmt].length) { out.push(groups[fmt].shift()); moved = true; }
    if (!moved) break;
  }
  return out;
}
const P_MIX = interleave(P_ROWS);
const A_MIX = interleave(A_ROWS);

// ---------- assign dates, interleaved across 2021-2025 ----------
function assignDates(rows, teamSlotFilter) {
  // generate candidate dates from 2021-01 to 2025-12, ~6 every month (avoid identity of exact day buckets)
  const dates = [];
  for (let y = 2021; y <= 2025; y++) for (let mo = 1; mo <= 12; mo++) {
    const d = [3, 8, 13, 18, 23, 28]; for (const dd of d) dates.push(`${y}-${String(mo).padStart(2, '0')}-${String(dd).padStart(2, '0')}`);
  }
  rows.forEach((r, i) => {
    const slot = dates[Math.min(i, dates.length - 1)];
    r.date = slot;
  });
  return rows;
}
assignDates(P_MIX, null);
assignDates(A_MIX, null);

// ---------- participation model ----------
// team-pair -> which marquees play, and whether both or opponents
function teamPair(match) {
  if (/MP A/.test(match)) return 'mp';
  if (/RJ A/.test(match)) return 'rj';
  if (/DE v DES/.test(match)) return 'de';
  if (/RCB/.test(match)) return 'rcb';
  if (/MI A/.test(match)) return 'mi';
  return 'other';
}
// For shared (mp/rj/de) matches decide side; most same team, a few opposite (Pranav's opponent matches)
function sidesFor(tp, i) {
  if (tp === 'mp' || tp === 'rj') { const opp = i % 11 === 7; return opp ? 'opp' : 'same'; } // a few opponents
  if (tp === 'de') return 'same';
  return 'solo';
}

// ---------- teams ----------
const TEAMS = {
  't-mp-a': ['MP A', 'MP A'], 't-mp-b': ['MP B', 'MP B'],
  't-rj-a': ['RJ A', 'RJ A'], 't-rj-b': ['RJ B', 'RJ B'],
  't-de': ['DE', 'DE'], 't-des': ['DES', 'DES'],
  't-rcb-a': ['RCB A', 'RCB A'], 't-rcb-b': ['RCB B', 'RCB B'],
  't-mi-a': ['MI A', 'MI A'], 't-mi-b': ['MI B', 'MI B'],
  't-destroyers': ['Destroyers', 'Destroyers'], 't-daredevils': ['Daredevils', 'Daredevils'],
};
for (const [id, [name, slug2]] of Object.entries(TEAMS)) if (!db.teams.some((t) => t.id === id)) db.teams.push({ id, name, slug: slug(slug2), shortCode: name, description: 'Intra-squad / trial side.', establishedYear: 2021 });
// ensure real clubs exist
for (const id of ['t-royal-challengers-bengaluru', 't-mumbai-indians', 't-madhya-pradesh', 't-rewa-jaguars', 't-kkr']) if (!db.teams.some((t) => t.id === id)) db.teams.push({ id, name: ({ 't-royal-challengers-bengaluru': 'Royal Challengers Bengaluru', 't-mumbai-indians': 'Mumbai Indians', 't-madhya-pradesh': 'Madhya Pradesh', 't-rewa-jaguars': 'Rewa Jaguars', 't-kkr': 'Kolkata Knight Riders' }[id]), slug: slug({ 't-royal-challengers-bengaluru': 'RCB', 't-mumbai-indians': 'MI', 't-madhya-pradesh': 'MP', 't-rewa-jaguars': 'RJ', 't-kkr': 'KKR' }[id]), shortCode: { 't-royal-challengers-bengaluru': 'RCB', 't-mumbai-indians': 'MI', 't-madhya-pradesh': 'MP', 't-rewa-jaguars': 'RJ', 't-kkr': 'KKR' }[id], description: '' });

const TOURS = {
  't-shared-mp': ['MP A v MP B', 'First-class', 'state'], 't-shared-rj': ['RJ A v RJ B', 'T20', 'division'],
  't-shared-de': ['DE v DES', 'ODI', 'division'], 't-shared-rcb': ['RCB A v RCB B', 'T20', 'ipl'],
  't-shared-mi': ['MI A v MI B', 'T20', 'ipl'], 't-shared-odide': ['DE v DES T20', 'T20', 'division'],
};
for (const [id, [name, fmt, scope]] of Object.entries(TOURS)) if (!db.tournaments.some((t) => t.id === id)) db.tournaments.push({ id, name, slug: slug(name), format: fmt, status: 'completed', category: 'official', scope, description: 'Intra-squad trial series.' });

const tourFor = (tp, fmt, match) => {
  if (tp === 'mp') return 't-shared-mp';
  if (tp === 'rj') return 't-shared-rj';
  if (tp === 'de') return /T20/.test(fmt) ? 't-shared-odide' : 't-shared-de';
  if (tp === 'rcb') return /IPL/.test(fmt) ? 't-shared-rcb' : 't-shared-rcb';
  if (tp === 'mi') return 't-shared-mi';
  return 't-shared-rcb';
};
const sideTeams = (tp, side, match) => {
  if (tp === 'mp') return side === 'A' ? 't-mp-a' : 't-mp-b';
  if (tp === 'rj') return side === 'A' ? 't-rj-a' : 't-rj-b';
  if (tp === 'de') return side === 'A' ? 't-de' : 't-des';
  if (tp === 'rcb' && !/IPL/.test(match)) return side === 'A' ? 't-rcb-a' : 't-rcb-b';
  if (tp === 'rcb') return side === 'A' ? 't-royal-challengers-bengaluru' : 't-kkr';
  if (tp === 'mi') return side === 'A' ? 't-mi-a' : 't-mi-b';
  return side === 'A' ? 't-destroyers' : 't-daredevils';
};

// ---------- score generation ----------
let seq = 1;
const DISMISS = ['c {f} b {b}', 'b {b}', 'lbw b {b}', 'c & b {b}'];
function genBat(fmt, maxScore) {
  const cap = clamp(maxScore, 3, 95);
  let runs, balls, f4, f6;
  if (fmt === 'Test') { runs = ri(8, Math.min(90, cap)); balls = clamp(Math.round(runs * 1.4), runs, 180); f6 = clamp(Math.round(runs / 26), 0, Math.floor(runs / 6)); f4 = clamp(Math.round(runs / 7), 0, Math.floor((runs - f6 * 6) / 4)); }
  else if (fmt === 'ODI') { runs = ri(5, Math.min(70, cap)); balls = clamp(Math.round(runs * 0.85), Math.round(runs / 3), 100); f6 = clamp(Math.round(runs / 14), 0, Math.floor(runs / 6)); f4 = clamp(Math.round(runs / 6), 0, Math.floor((runs - f6 * 6) / 4)); }
  else { runs = ri(2, Math.min(55, cap)); balls = clamp(Math.round(runs * 0.6), Math.max(1, Math.round(runs / 4)), 45); f6 = clamp(Math.round(runs / 8), 0, Math.floor(runs / 6)); f4 = clamp(Math.round(runs / 5), 0, Math.floor((runs - f6 * 6) / 4)); }
  return { runs, balls, fours: f4, sixes: f6, sr: +(balls ? (runs / balls) * 100 : 0).toFixed(2) };
}
function supportingBat(fmt) { const g = genBat(fmt, fmt === 'Test' ? 40 : 30); g.runs = clamp(g.runs, 4, fmt === 'Test' ? 45 : 28); g.notOut = g.runs < 16; return g; }
function genBowl(fmt, oppWktsMax) {
  let ov, md, rr, w;
  if (fmt === 'Test') { ov = ri(6, 16); md = Math.round(ov / 3); rr = Math.round(ov * ri(24, 34) / 10); w = Math.min(ri(0, 3), oppWktsMax); }
  else if (fmt === 'ODI') { ov = ri(4, 9); md = rnd() < 0.35 ? 1 : 0; rr = Math.round(ov * ri(40, 60) / 10); w = Math.min(ri(0, 3), oppWktsMax); }
  else { ov = ri(1, 4); md = 0; rr = Math.round(ov * ri(45, 90) / 10); w = Math.min(ri(0, 2), oppWktsMax); }
  return { overs: ov, maidens: md, runs: rr, wickets: w, eco: +(rr / ov).toFixed(2) };
}

// build a full 2-innings match with the given marquee cards
// marqueeBat: [{playerId, runs,balls,fours,sixes,dismissal|null,notOut, side}]
function buildMatch(slot, marqueeBat, extrasNote) {
  const { date, tp, fmt, match } = slot;
  const teams = { A: sideTeams(tp, 'A', match), B: sideTeams(tp, 'B', match) };
  const mid = `m-shared-${seq}`;
  const innA = `inn-shared-${seq}-1`, innB = `inn-shared-${seq}-2`;
  const isTest = fmt === 'Test';
  const runsUsed = {};
  // assign each marquee to their side innings
  const sideBatters = { [innA]: [], [innB]: [] };
  const sideBowlers = { [innA]: [], [innB]: [] };
  for (const mb of marqueeBat) {
    const inn = mb.side === 'A' ? innA : innB;
    if (mb.runs >= 0) sideBatters[inn] = sideBatters[inn].concat([mb]);
  }
  // choose extras header
  const extrapad = isTest ? 40 : fmt === 'ODI' ? 25 : 15;
  // fill each side with randomized batters + bowlers so totals are plausible
  function fill(inn) {
    const cur = sideBatters[inn].reduce((s, b) => s + (b.runs || 0), 0);
    const desired = Math.max(cur + 60, (isTest ? 320 : fmt === 'ODI' ? 250 : 165));
    const batters = sideBatters[inn].slice();
    const used = new Set(batters.map((b) => b.pid));
    let sum = cur;
    let guard = 0;
    while (sum < desired && batters.length < 11 && guard++ < 40) {
      const cap = clamp(desired - sum - 12, 4, 60);
      const g = genBat(fmt, cap);
      if (g.runs < 3) break;
      const notOut = g.runs % 3 === 0;
      const cands = shuffle(POOL_ALL.filter((id) => !used.has(id) && id !== 'p-pranav-dwivedi' && id !== 'p-akhil-mishra'));
      const pid = cands[0];
      if (!pid) break;
      used.add(pid);
      sum += g.runs;
      batters.push({ pid, runs: g.runs, balls: g.balls, fours: g.fours, sixes: g.sixes, dismissal: notOut ? null : pick(DISMISS).replace('{f}', pick(Object.keys(CLUB_PLAYERS))).replace('{b}', pick(Object.keys(CLUB_PLAYERS))), notOut, sr: g.sr });
    }
    return { batters, total: sum + extrapad };
  }
  const A = fill(innA);
  const B = fill(innB);
  // batting-order correctness: Akhil opens (idx 0), Pranav bats #3 (idx 2) when both in the XI
  const orderEleven = (arr) => {
    const a = arr.slice();
    const find = (pid) => a.findIndex((b) => b.pid === pid);
    const iA = find('p-akhil-mishra'), iP = find('p-pranav-dwivedi');
    if (iA >= 0 && iP >= 0) {
      const akh = a.splice(iA, 1)[0]; const pra = a.splice(iP >= iA ? iP - 1 : iP, 1)[0];
      a.unshift(akh, pra);
      // now akh at 0, pra at 1 -> move pra to 2 by inserting a filler marker shifted
      const keep = a.splice(0, 2); a.unshift(keep[0]); a.splice(2, 0, keep[1]);
    }
    return a;
  };
  A.batters = orderEleven(A.batters);
  B.batters = orderEleven(B.batters);
  // bowling: give ~5 bowlers on the opposite innings
  function bowlSide(oppInn, wktsMax) {
    const arr = [];
    let remaining = wktsMax;
    const used = new Set();
    for (let k = 0; k < 5 && remaining >= 0; k++) {
      const g = genBowl(fmt, remaining);
      const cands = shuffle(POOL_ALL.filter((id) => !used.has(id) && id !== 'p-pranav-dwivedi' && id !== 'p-akhil-mishra'));
      const pid = cands[0]; if (!pid) break;
      used.add(pid);
      arr.push({ pid, overs: g.overs, maidens: g.maidens, runs: g.runs, wickets: g.wickets, eco: g.eco });
      remaining -= g.wickets;
    }
    return arr;
  }
  // bowling: owner ledger figures attach on the opponent innings (innB) in orchestration below
  const bowlA_onB = bowlSide(innB, isTest ? 10 : fmt === 'ODI' ? 10 : 8);
  const bowlB_onA = bowlSide(innA, isTest ? 10 : fmt === 'ODI' ? 10 : 8);

  const wktsA = A.batters.filter((b) => !b.notOut).length;
  const wktsB = B.batters.filter((b) => !b.notOut).length;
  const ovA = isTest ? 90 : fmt === 'ODI' ? 50 : 20;
  const ovB = isTest ? 90 : fmt === 'ODI' ? 47 : 20;

  const tA = TEAMS[teams.A][0], tB = TEAMS[teams.B][0];
  db.matches.push({ id: mid, slug: `${slug(tA)}-vs-${slug(tB)}-${date}`, tournamentId: tourFor(tp, fmt, match), seasonId: seasonOf(+date.slice(0, 4)), teamAId: teams.A, teamBId: teams.B, matchDate: date, format: fmt, status: 'completed', resultText: `${tA} won by ${isTest ? 3 + (seq % 5) + ' wickets' : 15 + (seq % 18) + ' runs'}`, matchNumber: seq, notes: extrasNote, note: null });
  db.innings.push({ id: innA, matchId: mid, teamId: teams.A, battingOrder: 1, runs: A.total, wickets: wktsA, overs: ovA }, { id: innB, matchId: mid, teamId: teams.B, battingOrder: 2, runs: B.total, wickets: wktsB, overs: ovB });
  for (const b of A.batters) db.batting.push({ id: `z-${mid}-${b.pid}`, inningsId: innA, playerId: b.pid, runs: b.runs, balls: b.balls, fours: b.fours, sixes: b.sixes, dismissal: b.dismissal, notOut: !!b.notOut, strikeRate: b.sr });
  for (const b of B.batters) db.batting.push({ id: `z-${mid}-${b.pid}`, inningsId: innB, playerId: b.pid, runs: b.runs, balls: b.balls, fours: b.fours, sixes: b.sixes, dismissal: b.dismissal, notOut: !!b.notOut, strikeRate: b.sr });
  for (const w of bowlA_onB) db.bowling.push({ id: `wz-${mid}-${w.pid}`, inningsId: innB, playerId: w.pid, overs: w.overs, maidens: w.maidens, runs: w.runs, wickets: w.wickets, economy: w.eco });
  for (const w of bowlB_onA) db.bowling.push({ id: `wz-${mid}-${w.pid}`, inningsId: innA, playerId: w.pid, overs: w.overs, maidens: w.maidens, runs: w.runs, wickets: w.wickets, economy: w.eco });
  seq++;
}

// ---------- orchestrate ----------
// Build a combined chronological list of fixtures: each row from either player becomes ONE match.
// For shared team-pairs both marquees appear; for solo pairs only the owner.
const fixtures = [];
for (const r of P_MIX) fixtures.push({ src: 'P', row: r });
for (const r of A_MIX) fixtures.push({ src: 'A', row: r });
// interleave the two player timelines by date so the shared career mixes both players too
fixtures.sort((a, b) => a.row.date.localeCompare(b.row.date) || (a.src === 'P' ? -1 : 1));
// reassign strictly unique dates across the merged timeline (prevents duplicate slugs)
const DATE_POOL = [];
for (let y = 2021; y <= 2025; y++) for (let mo = 1; mo <= 12; mo++) for (const dd of [3, 8, 13, 18, 23, 28]) DATE_POOL.push(`${y}-${String(mo).padStart(2, '0')}-${String(dd).padStart(2, '0')}`);
fixtures.forEach((f, i) => { f.row.date = DATE_POOL[i % DATE_POOL.length]; });

for (let i = 0; i < fixtures.length; i++) {
  const { src, row } = fixtures[i];
  const tp = teamPair(row.match);
  const fmt = row.fmt === 'IPL' ? 'IPL' : row.fmt;
  const isIPL = fmt === 'IPL';
  if (isIPL) continue; // handled as the single abandoned IPL match below
  const sides = sidesFor(tp, i);
  const marqueeBat = [];
  const bowlerRows = [];
  const marqueePidOf = src === 'P' ? P : A;
  const otherPidOf = src === 'P' ? A : P;
  // owner bats their ledger figure
  if (!isIPL) {
    const dis = row.dis === 'not out' ? null : row.dis;
    marqueeBat.push({ pid: marqueePidOf, runs: row.R, balls: row.B, fours: row.f4, sixes: row.f6, dismissal: dis, notOut: row.dis === 'not out', sr: +((row.R / row.B) * 100).toFixed(2), side: 'A' });
  }
  // shared team-pair: the partner also plays (same team mostly; opponent for a few rj/mp)
  let partnerSide = null;
  if ((tp === 'mp' || tp === 'rj' || tp === 'de') && !isIPL) {
    partnerSide = sides === 'opp' ? 'B' : 'A';
    const g = supportingBat(fmt);
    marqueeBat.push({ pid: otherPidOf, runs: g.runs, balls: g.balls, fours: g.fours, sixes: g.sixes, dismissal: g.notOut ? null : pick(DISMISS).replace('{f}', pick(CLUB_BATS)).replace('{b}', pick(CLUB_BOWLERS)), notOut: g.notOut, sr: g.sr, side: partnerSide });
  }
  // bowling: owner's ledger figures go on the opponent innings (owner always side A -> innB)
  const extrasNote = row.note || null;
  buildMatch({ date: row.date, tp, fmt, match: row.match }, marqueeBat, extrasNote);
  // attach owner bowling figures (from ledger) onto opponent innings (innB)
  if (row.O !== '-' && !isIPL) {
    const mid = `m-shared-${seq - 1}`;
    const oppInn = `inn-shared-${seq - 1}-2`;
    db.bowling.push({ id: `wo-${mid}-${marqueePidOf}`, inningsId: oppInn, playerId: marqueePidOf, overs: +row.O, maidens: +row.M, runs: +row.Rr, wickets: +row.W, economy: +((+row.Rr) / (+row.O)).toFixed(2) });
  }
}

// IPL match: abandoned before play — match row only, zero innings (rule #8)
const iplRow = P_MIX.find((r) => r.fmt === 'IPL');
if (iplRow) {
  const mid = `m-shared-${seq++}`;
  db.matches.push({ id: mid, slug: `rcb-vs-kkr-${iplRow.date}`, tournamentId: 't-shared-rcb', seasonId: seasonOf(+iplRow.date.slice(0, 4)), teamAId: 't-royal-challengers-bengaluru', teamBId: 't-kkr', matchDate: iplRow.date, format: 'IPL', status: 'abandoned', resultText: 'Match abandoned without a ball bowled (rain)', matchNumber: seq - 1, notes: 'IPL match #58 — abandoned before play.', note: null });
}

// ---------- recompute BOTH players' summaries from the final match rows (rule #9) ----------
const mById2 = new Map(db.matches.map((m) => [m.id, m]));
const innById2 = new Map(db.innings.map((i) => [i.id, i]));
const fmtOfM = (m) => (m.format === 'IPL' ? 'IPL' : m.format);
function recompute(pid) {
  const bat = db.batting.filter((b) => b.playerId === pid);
  const bowl = db.bowling.filter((b) => b.playerId === pid);
  const S = {}; for (const f of ['Test', 'ODI', 'T20', 'IPL']) S[f] = { matches: new Set(), inns: 0, runs: 0, balls: 0, fours: 0, sixes: 0, notOut: 0, dismissals: 0, hs: 0, hsNo: false, wkts: 0, br: 0, ov: 0, bbiW: 0, bbiR: Infinity };
  for (const b of bat) {
    const inn = innById2.get(b.inningsId); if (!inn) continue;
    const m = mById2.get(inn.matchId); const f = fmtOfM(m);
    if (!S[f]) { console.log('UNKNOWN FORMAT', f, 'match', m && m.id, 'pid', pid); continue; }
    const s = S[f];
    s.matches.add(m.id); s.inns++; s.runs += b.runs || 0; s.balls += b.balls || 0; s.fours += b.fours || 0; s.sixes += b.sixes || 0;
    if (b.notOut) s.notOut++; else s.dismissals++;
    if ((b.runs || 0) > s.hs) { s.hs = b.runs; s.hsNo = !!b.notOut; }
  }
  for (const w of bowl) {
    const inn = innById2.get(w.inningsId); if (!inn) continue;
    const m = mById2.get(inn.matchId); const f = fmtOfM(m); const s = S[f];
    s.matches.add(m.id); s.wkts += w.wickets || 0; s.br += w.runs || 0; s.ov += w.overs || 0;
    if ((w.wickets || 0) > s.bbiW || ((w.wickets || 0) === s.bbiW && (w.runs || 0) < s.bbiR)) { s.bbiW = w.wickets; s.bbiR = w.runs; }
  }
  // IPL abandoned match: counts as a match only for the player whose club it is (RCB -> Pranav)
  const plTeams = (db.players.find((p) => p.id === pid).teams) || [];
  if (plTeams.includes('t-royal-challengers-bengaluru')) {
    for (const m of db.matches.filter((x) => x.format === 'IPL')) S.IPL.matches.add(m.id);
  }
  const F = ['Test', 'ODI', 'T20', 'IPL'];
  const row = (fn) => F.map((f) => fn(S[f]));
  const num = (v) => (v == null || isNaN(v) ? '–' : String(v));
  const batRows = {
    Matches: row((s) => num(s.matches.size)), Innings: row((s) => num(s.inns)), Runs: row((s) => num(s.runs)),
    Highest: row((s) => (s.hs ? `${s.hs}${s.hsNo ? '*' : ''}` : '–')),
    Average: row((s) => (s.dismissals ? (s.runs / s.dismissals).toFixed(2) : s.runs ? '–' : '–')),
    SR: row((s) => (s.balls ? Math.round((s.runs / s.balls) * 100) : '–')),
    Fours: row((s) => num(s.fours)), Sixes: row((s) => num(s.sixes)),
    '50s': row((s) => num('--')), '100s': row((s) => num('--')),
  };
  const fifties = {}, hundreds = {};
  for (const f of F) { fifties[f] = 0; hundreds[f] = 0; }
  for (const b of bat) {
    const inn = innById2.get(b.inningsId); if (!inn) continue;
    const m = mById2.get(inn.matchId); const f = fmtOfM(m);
    if ((b.runs || 0) >= 100) hundreds[f]++; else if ((b.runs || 0) >= 50) fifties[f]++;
  }
  batRows['50s'] = F.map((f) => num(fifties[f]));
  batRows['100s'] = F.map((f) => num(hundreds[f]));
  const bowlRows = {
    Matches: row((s) => num(s.matches.size)), Wickets: row((s) => num(s.wkts)),
    Avg: row((s) => (s.wkts ? (s.br / s.wkts).toFixed(2) : '–')),
    Eco: row((s) => (s.ov ? (s.br / s.ov).toFixed(2) : '–')),
    BBI: row((s) => (s.bbiW ? `${s.bbiW}/${s.bbiR}` : '–')),
  };
  const pl = db.players.find((p) => p.id === pid);
  pl.stats = {
    batting: { formats: F, rows: Object.fromEntries(Object.entries(batRows).map(([k, v]) => [k, v.map(String)])) },
    bowling: { formats: F, rows: Object.fromEntries(Object.entries(bowlRows).map(([k, v]) => [k, v.map(String)])) },
  };
  return { bat: batRows, bowl: bowlRows };
}
const statsP = recompute(P);
const statsA = recompute(A);
console.log('PRANAV summary:', JSON.stringify(statsP));
console.log('AKHIL summary:', JSON.stringify(statsA));

writeFileSync(DATA, JSON.stringify(db, null, 2) + '\n');
console.log('fixtures built:', fixtures.length, '+1 IPL =', seq - 1);
console.log('totals -> matches:', db.matches.length, 'teams:', db.teams.length, 'tournaments:', db.tournaments.length, 'innings:', db.innings.length, 'batting:', db.batting.length, 'bowling:', db.bowling.length);
console.log('Pranav batting cards:', db.batting.filter((b) => b.playerId === P).length, 'Akhil:', db.batting.filter((b) => b.playerId === A).length);
console.log('Pranav bowling cards:', db.bowling.filter((b) => b.playerId === P).length, 'Akhil:', db.bowling.filter((b) => b.playerId === A).length);