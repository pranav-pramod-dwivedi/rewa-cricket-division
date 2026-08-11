// Randomize intra-squad squads for Rewa Jaguars (RJ-A vs RJ-B) and Mumbai Indians (MI-A vs MI-B)
// trial matches around Akhil Mishra's career. Pranav Dwivedi and Akhil Mishra both feature in every
// RJ intra-squad match (Akhil already bats innings A; Pranav is fielded on the opposite side B).
// Other existing squad players are split across the two sides each match and receive
// mathematically-possible batting/bowling cards that never exceed the recorded innings totals.
// Idempotent: only adds a card for a (playerId, inningsId) pair that does not already exist.
import { readFileSync, writeFileSync } from 'fs';
const DATA = '/Users/tanutripathi/Downloads/RAPID/rewa-cricket-division/data/records.json';
const db = JSON.parse(readFileSync(DATA, 'utf8'));

const PID_AKHIL = 'p-akhil-mishra';
const PID_PRANAV = 'p-pranav-dwivedi';

// ---- deterministic PRNG (mulberry32) so squads are stable across runs ----
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260812);
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const ri = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const existing = new Set(db.players.map((p) => p.id));
const namesById = Object.fromEntries(db.players.map((p) => [p.id, p.name]));

// ---- pools (existing DB players only; missing names are skipped: "dont make clickable") ----
const RJ = {
  bat: ['p-prithviraj-singh-tomar', 'p-akshat-raghuwanshi', 'p-atharv-mahajan', 'p-anant-verma', 'p-jaydev-singh', 'p-himanshu-mantri', 'p-chanchal-rathore', 'p-kanishk-dubey', 'p-ajay-rohera'],
  ar: ['p-sagar-solanki', 'p-naveen-singh-chouhan', 'p-aryan-deshmukh', 'p-saransh-surana'],
  bowl: ['p-ashwin-das', 'p-rohit-rajawat', 'p-prabhanshu-shukla', 'p-ritesh-shakya', 'p-radhakrishna-dwivedi', 'p-kuldeep-sen', 'p-kumar-kartikeya', 'p-shivam-shukla', 'p-kulwant-khejroliya'],
};
const MI = {
  bat: ['p-rohit-sharma', 'p-suryakumar-yadav', 'p-tilak-varma', 'p-vishnu-vinod', 'p-harvik-desai'],
  ar: ['p-hardik-pandya', 'p-naman-dhir', 'p-nehal-wadhera', 'p-shams-mulani', 'p-shivalik-sharma'],
  bowl: ['p-piyush-chawla', 'p-akash-madhwal', 'p-shreyas-gopal', 'p-arjun-tendulkar'],
};

const innByMatch = new Map();
for (const i of db.innings) {
  if (!innByMatch.has(i.matchId)) innByMatch.set(i.matchId, []);
  innByMatch.get(i.matchId).push(i);
}
const existingBat = new Set(db.batting.map((b) => `${b.playerId}|${b.inningsId}`));
const existingBowl = new Set(db.bowling.map((b) => `${b.playerId}|${b.inningsId}`));

let batAdded = 0, bowlAdded = 0;
const DISMISS = ['c {f} b {b}', 'b {b}', 'lbw b {b}', 'c & b {b}'];

// batting score generator (background players)
function genBat(format, maxScore) {
  const cap = clamp(maxScore, 4, 95);
  let runs, balls, fours, sixes;
  if (format === 'Test') {
    runs = ri(8, Math.min(95, cap)); balls = clamp(Math.round(runs * ri(105, 145) / 100), runs, 200);
    sixes = clamp(Math.round(runs / ri(22, 40)), 0, Math.floor(runs / 6));
    fours = clamp(Math.round(runs / ri(5, 9)), 0, Math.floor((runs - sixes * 6) / 4));
  } else if (format === 'ODI') {
    runs = ri(6, Math.min(75, cap)); balls = clamp(Math.round(runs * ri(65, 95) / 100), Math.max(3, Math.round(runs / 3)), 100);
    sixes = clamp(Math.round(runs / ri(12, 24)), 0, Math.floor(runs / 6));
    fours = clamp(Math.round(runs / ri(5, 8)), 0, Math.floor((runs - sixes * 6) / 4));
  } else {
    runs = ri(2, Math.min(58, cap)); balls = clamp(Math.round(runs * ri(45, 75) / 100), Math.max(1, Math.round(runs / 4)), 45);
    sixes = clamp(Math.round(runs / ri(6, 14)), 0, Math.floor(runs / 6));
    fours = clamp(Math.round(runs / ri(4, 7)), 0, Math.floor((runs - sixes * 6) / 4));
  }
  return { runs, balls, fours, sixes, strikeRate: +(balls ? (runs / balls) * 100 : 0).toFixed(2) };
}
// Pranav: dominant Test bat, solid ODI, brisk T20
function genPranavBat(format, maxScore) {
  const cap = clamp(maxScore, 5, 95);
  let runs, balls, fours, sixes;
  if (format === 'Test') { runs = ri(28, Math.min(95, cap)); sixes = ri(1, 4); balls = clamp(Math.round(runs * ri(120, 150) / 100), runs, 200); }
  else if (format === 'ODI') { runs = ri(24, Math.min(78, cap)); sixes = ri(1, 3); balls = clamp(Math.round(runs * ri(80, 98) / 100), Math.round(runs / 2), 100); }
  else { runs = ri(18, Math.min(62, cap)); sixes = ri(1, 5); balls = clamp(Math.round(runs * ri(52, 72) / 100), Math.max(4, Math.round(runs / 3)), 40); }
  sixes = clamp(sixes, 0, Math.floor(runs / 6));
  fours = clamp(Math.round(runs / ri(4, 7)), 1, Math.floor((runs - sixes * 6) / 4));
  return { runs, balls, fours, sixes, strikeRate: +(balls ? (runs / balls) * 100 : 0).toFixed(2) };
}
function genBowl(format, wktCap) {
  let overs, maidens, runs, wickets;
  if (format === 'Test') { overs = ri(8, 16); maidens = Math.round(overs / 4); runs = Math.round(overs * ri(24, 38) / 10); wickets = Math.min(ri(1, 4), wktCap); }
  else if (format === 'ODI') { overs = ri(5, 9); maidens = rnd() < 0.3 ? 1 : 0; runs = Math.round(overs * ri(38, 58) / 10); wickets = Math.min(ri(0, 3), wktCap); }
  else { overs = ri(2, 4); maidens = 0; runs = Math.round(overs * ri(50, 85) / 10); wickets = Math.min(ri(0, 2), wktCap); }
  return { overs, maidens, runs, wickets, economy: +(runs / overs).toFixed(2) };
}
// field ~10 batters per side from a pool, forcing required players in
function fieldSide(pool, forced, requiredSize) {
  const avail = pool.slice();
  const side = forced.filter((id) => !existing.has(id) ? false : true).slice();
  const rest = shuffle(avail.filter((id) => !side.includes(id)));
  const need = Math.max(0, requiredSize - side.length);
  // forced players (Pranav) stay first so their cards are guaranteed within budget
  return side.concat(rest.slice(0, need));
}

function processMatch(m, pool) {
  const inns = (innByMatch.get(m.id) || []).sort((a, b) => a.battingOrder - b.battingOrder);
  if (inns.length < 2) return;
  const [innA, innB] = inns;
  const format = m.format;
  const isMI = m.tournamentId === 't-akhil-mi-intra';

  const batRunsUsedA = db.batting.filter((b) => b.inningsId === innA.id).reduce((s, b) => s + (b.runs || 0), 0);
  const wktUsedA = db.bowling.filter((b) => b.inningsId === innA.id).reduce((s, b) => s + (b.wickets || 0), 0);
  const wktUsedB = db.bowling.filter((b) => b.inningsId === innB.id).reduce((s, b) => s + (b.wickets || 0), 0);
  const wktCapA = Math.max(0, (innA.wickets ?? 10) - wktUsedA);
  const wktCapB = Math.max(0, (innB.wickets ?? 10) - wktUsedB);

  const allPool = [...pool.bat, ...pool.ar, ...pool.bowl].filter((id) => existing.has(id));
  // Akhil already bats innA -> he is on side A. Side A excludes Pranav (RJ): he plays the opposing side B.
  const keptA = allPool.filter((id) => id !== PID_PRANAV);
  const sideA = fieldSide(keptA, [], 10);
  // Side B drawn from the remaining pool so sides never overlap (no duplicate card ids)
  const remainingB = keptA.filter((id) => !sideA.includes(id));
  const sideB = fieldSide(remainingB, (isMI ? [] : [PID_PRANAV]).filter((id) => existing.has(id)), 10);

  const bowlerNamePoolA = sideB.filter((id) => existing.has(id) && pool.bowl.includes(id)).map((id) => namesById[id]).filter(Boolean); // bowlers on opposing side B
  const bowlerNamePoolB = sideA.filter((id) => existing.has(id) && pool.bowl.includes(id)).map((id) => namesById[id]).filter(Boolean); // bowlers on opposing side A
  const bnameA = bowlerNamePoolA.length ? bowlerNamePoolA : ['R. Solanki'];
  const bnameB = bowlerNamePoolB.length ? bowlerNamePoolB : ['R. Solanki'];

  // ---- batting on innA (side A; Akhil already present) ----
  let budget = innA.runs - batRunsUsedA - 20;
  for (const pid of sideA) {
    if (pid === PID_AKHIL || !existing.has(pid) || existingBat.has(`${pid}|${innA.id}`)) continue;
    if (budget <= 0) break;
    const g = pid === PID_PRANAV ? genPranavBat(format, budget) : genBat(format, budget);
    if (g.runs >= budget) continue;
    budget -= g.runs;
    const notOut = g.runs % 4 === 0;
    db.batting.push({ id: `b-rsq-${m.id}-${pid}`, inningsId: innA.id, playerId: pid, runs: g.runs, balls: g.balls, fours: g.fours, sixes: g.sixes, dismissal: notOut ? null : pick(DISMISS).replace('{f}', pick(bnameA)).replace('{b}', pick(bnameA)), notOut, strikeRate: g.strikeRate });
    existingBat.add(`${pid}|${innA.id}`); batAdded++;
  }
  // ---- batting on innB (side B; Pranav here) ----
  budget = innB.runs - 20;
  for (const pid of sideB) {
    if (pid === PID_AKHIL || !existing.has(pid) || existingBat.has(`${pid}|${innB.id}`)) continue;
    if (budget <= 0) break;
    const g = pid === PID_PRANAV ? genPranavBat(format, budget) : genBat(format, budget);
    if (g.runs >= budget) continue;
    budget -= g.runs;
    const notOut = g.runs % 4 === 0;
    db.batting.push({ id: `b-rsq-${m.id}-${pid}`, inningsId: innB.id, playerId: pid, runs: g.runs, balls: g.balls, fours: g.fours, sixes: g.sixes, dismissal: notOut ? null : pick(DISMISS).replace('{f}', pick(bnameB)).replace('{b}', pick(bnameB)), notOut, strikeRate: g.strikeRate });
    existingBat.add(`${pid}|${innB.id}`); batAdded++;
  }
  // ---- bowling: side-A bowlers bowl in innB ----
  let wbudget = wktCapB;
  for (const pid of sideA.filter((id) => pool.bowl.includes(id))) {
    if (!existing.has(pid) || existingBowl.has(`${pid}|${innB.id}`)) continue;
    if (wbudget <= 0) break;
    const g = genBowl(format, wbudget);
    wbudget -= g.wickets;
    db.bowling.push({ id: `w-rsq-${m.id}-${pid}`, inningsId: innB.id, playerId: pid, overs: g.overs, maidens: g.maidens, runs: g.runs, wickets: g.wickets, economy: g.economy });
    existingBowl.add(`${pid}|${innB.id}`); bowlAdded++;
  }
  // ---- bowling: side-B bowlers bowl in innA ----
  wbudget = wktCapA;
  for (const pid of sideB.filter((id) => pool.bowl.includes(id))) {
    if (!existing.has(pid) || existingBowl.has(`${pid}|${innA.id}`)) continue;
    if (wbudget <= 0) break;
    const g = genBowl(format, wbudget);
    wbudget -= g.wickets;
    db.bowling.push({ id: `w-rsq-${m.id}-${pid}`, inningsId: innA.id, playerId: pid, overs: g.overs, maidens: g.maidens, runs: g.runs, wickets: g.wickets, economy: g.economy });
    existingBowl.add(`${pid}|${innA.id}`); bowlAdded++;
  }
}
const poolForMatch = (m) => (m.tournamentId === 't-akhil-mi-intra' ? MI : RJ);
const TARGET_TOURS = ['t-akhil-rj-fc', 't-akhil-rj-odi', 't-akhil-rj-t20', 't-akhil-mi-intra'];
const targets = db.matches.filter((m) => TARGET_TOURS.includes(m.tournamentId));
for (const m of targets) processMatch(m, poolForMatch(m));

writeFileSync(DATA, JSON.stringify(db, null, 2) + '\n');
console.log('target intra-squad matches:', targets.length);
console.log('added batting cards:', batAdded, 'bowling cards:', bowlAdded);
console.log('totals -> matches:', db.matches.length, 'innings:', db.innings.length, 'batting:', db.batting.length, 'bowling:', db.bowling.length);
console.log('Akhil cards -> bat:', db.batting.filter((b) => b.playerId === PID_AKHIL).length, 'bowl:', db.bowling.filter((b) => b.playerId === PID_AKHIL).length);
console.log('Pranav cards -> bat:', db.batting.filter((b) => b.playerId === PID_PRANAV).length, 'bowl:', db.bowling.filter((b) => b.playerId === PID_PRANAV).length);