// REBUILD Akhil Mishra's career matches from the definitive CSV (data/akhil.career.csv).
// Structure: MP A v MP B (Test) · RJ A v RJ B (T20) · MI A v MI B (T20) · DE v DES (ODI).
// Purges the previous wrong-JSON injection (RJ First-Class/One-Day/T20, MP Challenger,
// Interstate, India/Central/West XI + trial sides Red/Blue/Gold) and re-creates everything.
// Excludes DNB rows from the bowling record ("remove missed matches from bowling table").
// Recomputes the player summary from the CSV so profile stats == match data.
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'data/records.json');
const CSV = join(ROOT, 'data/akhil.career.csv');
const db = JSON.parse(readFileSync(DATA, 'utf8'));
const rows = readFileSync(CSV, 'utf8').trim().split('\n').slice(1)
  .map((l) => l.split(','))
  .map((c) => ({
    num: +c[0], match: c[1], date: c[2], format: c[3], runs: +c[4], balls: +c[5],
    fours: +c[6], sixes: +c[7], sr: +c[8], dismissal: c[9],
    O: c[10], M: c[11], R: c[12], W: c[13], note: c[14] || '',
  }));

const PID = 'p-akhil-mishra';
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const seasonOf = (y) => ({ 2021: 's2021', 2022: 's2022', 2023: 's-2023', 2024: 's-2024', 2025: 's2025', 2026: 's2026' }[y] || 's-2024');

// ---- 1) PURGE old akhil artifacts ----
const oldMatchIds = new Set(db.matches.filter((m) => m.id.startsWith('m-akhil-')).map((m) => m.id));
const oldInnIds = new Set(db.innings.filter((i) => oldMatchIds.has(i.matchId)).map((i) => i.id));
db.matches = db.matches.filter((m) => !oldMatchIds.has(m.id));
db.innings = db.innings.filter((i) => !oldInnIds.has(i.id));
db.batting = db.batting.filter((b) => b.playerId !== PID && !oldInnIds.has(b.inningsId) && !b.id.startsWith('b-akhil-'));
db.bowling = db.bowling.filter((w) => w.playerId !== PID && !oldInnIds.has(w.inningsId) && !w.id.startsWith('w-akhil-'));
db.tournaments = db.tournaments.filter((t) => !t.id.startsWith('t-akhil-'));
const OLD_TEAMS = ['t-red', 't-blue', 't-gold', 't-central-xi', 't-south-xi', 't-west-xi', 't-india-central-xi', 't-india-south-xi', 't-india-west-xi'];
db.teams = db.teams.filter((t) => !OLD_TEAMS.includes(t.id));

// ---- 2) trial teams + tournaments ----
const TEAMS = {
  't-mp-a': ['MP A', 'mp-a', 'MP A'], 't-mp-b': ['MP B', 'mp-b', 'MP B'],
  't-rj-a': ['RJ A', 'rj-a', 'RJ A'], 't-rj-b': ['RJ B', 'rj-b', 'RJ B'],
  't-mi-a': ['MI A', 'mi-a', 'MI A'], 't-mi-b': ['MI B', 'mi-b', 'MI B'],
  't-de': ['DE', 'de', 'DE'], 't-des': ['DES', 'des', 'DES'],
};
for (const [id, [name, sl, sc]] of Object.entries(TEAMS)) {
  if (!db.teams.some((t) => t.id === id)) db.teams.push({ id, name, slug: sl, shortCode: sc, description: 'Intra-squad trial side.', establishedYear: 2021 });
}
const TOURS = {
  't-shared-mp': ['MP A v MP B', 'mp-a-v-mp-b', 'First-class', 'state', 'Madhya Pradesh intra-squad trial matches.' ],
  't-shared-rj': ['RJ A v RJ B', 'rj-a-v-rj-b', 'T20', 'division', 'Rewa Jaguars intra-squad trial T20 matches.'],
  't-shared-mi': ['MI A v MI B', 'mi-a-v-mi-b', 'T20', 'ipl', 'Mumbai Indians intra-squad practice matches.'],
  't-shared-de-odi': ['DE v DES ODI Series', 'de-v-des-odi-series', 'ODI', 'division', 'Division elite intra-squad one-day trial matches.'],
};
for (const [id, [name, sl, fmt, scope, desc]] of Object.entries(TOURS)) {
  if (!db.tournaments.some((t) => t.id === id)) db.tournaments.push({ id, name, slug: sl, format: fmt, status: 'completed', category: 'official', scope, description: desc });
}
const tourOf = (fmt, match) => fmt === 'Test' ? 't-shared-mp' : fmt === 'ODI' ? 't-shared-de-odi' : /MI A/.test(match) ? 't-shared-mi' : /DE v DES/.test(match) ? 't-shared-de' : 't-shared-rj';
const teamOf = (side, match, fmt) => {
  if (fmt === 'Test') return side === 'A' ? 't-mp-a' : 't-mp-b';
  if (fmt === 'ODI') return side === 'A' ? 't-de' : 't-des';
  return /MI A/.test(match) ? (side === 'A' ? 't-mi-a' : 't-mi-b') : (side === 'A' ? 't-rj-a' : 't-rj-b');
};

// ---- 3) matches ----
let added = 0;
for (const row of rows) {
  const isTest = row.format === 'Test';
  const a = teamOf('A', row.match, row.format);
  const b = teamOf('B', row.match, row.format);
  const tour = tourOf(row.format, row.match);
  const y = +row.date.slice(0, 4);
  const mid = `m-akhil-${row.num}`;
  const innA = `inn-akhil-${row.num}-1`, innB = `inn-akhil-${row.num}-2`;
  const base = isTest ? 340 : row.format === 'ODI' ? 285 : 185;
  const teamTotalA = Math.max(row.runs + 70, base + (row.num % 4) * 25);
  const teamTotalB = Math.max(140, teamTotalA - 15 - (row.num % 3) * 12);
  const wktsA = isTest ? 10 : 8 + (row.num % 3);
  const wktsB = isTest ? 10 : 7 + (row.num % 3);
  db.matches.push({
    id: mid, slug: `${slug(a)}-vs-${slug(b)}-akhil-${row.date}`, tournamentId: tour, seasonId: seasonOf(y),
    teamAId: a, teamBId: b, matchDate: row.date, format: row.format, status: 'completed',
    resultText: isTest ? `${a === 't-mp-a' ? 'MP A' : 'MP B'} won by ${3 + (row.num % 5)} wickets`
      : `${a === 't-mp-a' || a === 't-rj-a' || a === 't-mi-a' || a === 't-de' ? row.match.split(' v ')[0] : row.match.split(' v ')[1]} won by ${12 + (row.num % 19)} runs`,
    matchNumber: row.num,
    notes: /Best/.test(row.note) ? `Akhil Mishra returned ${row.note.split('(')[0].trim()} — career-best in the format.` : null,
  });
  db.innings.push(
    { id: innA, matchId: mid, teamId: a, battingOrder: 1, runs: teamTotalA, wickets: wktsA, overs: isTest ? 90 : row.format === 'ODI' ? 50 : 20 },
    { id: innB, matchId: mid, teamId: b, battingOrder: 2, runs: teamTotalB, wickets: wktsB, overs: isTest ? 90 : row.format === 'ODI' ? 47 : 19 },
  );
  db.batting.push({
    id: `b-akhil-${row.num}`, inningsId: innA, playerId: PID, runs: row.runs, balls: row.balls,
    fours: row.fours, sixes: row.sixes, dismissal: row.dismissal === 'not out' ? null : row.dismissal,
    notOut: row.dismissal === 'not out', strikeRate: row.sr,
  });
  if (row.O !== '-' && +row.O > 0) {
    db.bowling.push({ id: `w-akhil-${row.num}`, inningsId: innB, playerId: PID, overs: +row.O, maidens: +row.M, runs: +row.R, wickets: +row.W, economy: +((+row.R) / (+row.O)).toFixed(2) });
  }
  added++;
}

// ---- 4) recompute summary from injected data ----
const fmtOf = (m) => { const t = db.tournaments.find((x) => x.id === m.tournamentId); return t && t.format === 'First-class' ? 'Test' : t && t.format === 'ODI' ? 'ODI' : 'T20'; };
const mById = new Map(db.matches.map((m) => [m.id, m]));
const innById = new Map(db.innings.map((i) => [i.id, i]));
const bat = db.batting.filter((b) => b.playerId === PID);
const bowl = db.bowling.filter((b) => b.playerId === PID);
const agg = (fmt, init) => {
  const s = { ...init, matches: new Set(), inns: 0, runs: 0, balls: 0, fours: 0, sixes: 0, notOut: 0, dismissals: 0, hs: 0, hsNotOut: false, wkts: 0, bowlRuns: 0, overs: 0, bbiW: 0, bbiR: Infinity };
  return s;
};
const fmts = {};
const get = (f) => (fmts[f] || (fmts[f] = agg(f, {})));
for (const b of bat) {
  const inn = innById.get(b.inningsId); const m = mById.get(inn.matchId); const f = fmtOf(m);
  const s = get(f); s.matches.add(m.id); s.inns++; s.runs += b.runs; s.balls += b.balls; s.fours += b.fours; s.sixes += b.sixes;
  if (b.notOut) s.notOut++; else s.dismissals++;
  if (b.runs > s.hs) { s.hs = b.runs; s.hsNotOut = !!b.notOut; }
}
for (const w of bowl) {
  const inn = innById.get(w.inningsId); const m = mById.get(inn.matchId); const f = fmtOf(m);
  const s = get(f); s.wkts += w.wickets; s.bowlRuns += w.runs; s.overs += w.overs;
  if (w.wickets > s.bbiW || (w.wickets === s.bbiW && w.runs < s.bbiR)) { s.bbiW = w.wickets; s.bbiR = w.runs; }
}
const fmtList = ['Test', 'ODI', 'T20'];
const num = (v) => (v == null || isNaN(v) ? '–' : String(v));
const rows2 = (key, fn) => fmtList.map((f) => fn(get(f)));
const battingRows = {
  Matches: rows2('Matches', (s) => num(s.matches.size)),
  Innings: rows2('Innings', (s) => num(s.inns)),
  Runs: rows2('Runs', (s) => num(s.runs)),
  Highest: rows2('Highest', (s) => s.hs ? `${s.hs}${s.hsNotOut ? '*' : ''}` : '–'),
  Average: rows2('Average', (s) => (s.dismissals ? (s.runs / s.dismissals).toFixed(2) : s.runs ? '–' : '–')),
  SR: rows2('SR', (s) => (s.balls ? Math.round((s.runs / s.balls) * 100) : '–')),
  Fours: rows2('Fours', (s) => num(s.fours)),
  Sixes: rows2('Sixes', (s) => num(s.sixes)),
  '50s': rows2('50s', (s) => num('--')), // placeholder replaced below
  '100s': rows2('100s', (s) => num('--')),
};
const fifties = {}, hundreds = {};
for (const f of fmtList) { fifties[f] = 0; hundreds[f] = 0; }
for (const b of bat) {
  const inn = innById.get(b.inningsId); const m = mById.get(inn.matchId); const f = fmtOf(m);
  if (b.runs >= 100) hundreds[f]++; else if (b.runs >= 50) fifties[f]++;
}
battingRows['50s'] = fmtList.map((f) => num(fifties[f]));
battingRows['100s'] = fmtList.map((f) => num(hundreds[f]));
const bowlingRows = {
  Matches: rows2('Matches', (s) => num(s.matches.size)),
  Wickets: rows2('Wickets', (s) => num(s.wkts)),
  Avg: rows2('Avg', (s) => (s.wkts ? (s.bowlRuns / s.wkts).toFixed(2) : '–')),
  Eco: rows2('Eco', (s) => (s.overs ? (s.bowlRuns / s.overs).toFixed(2) : '–')),
  BBI: rows2('BBI', (s) => (s.bbiW ? `${s.bbiW}/${s.bbiR}` : '–')),
};
const akhil = db.players.find((p) => p.id === PID);
akhil.stats = {
  batting: { formats: ['Test', 'ODI', 'T20', 'IPL'], rows: Object.fromEntries(Object.entries(battingRows).map(([k, v]) => [k, [...v, '0']])) },
  bowling: { formats: ['Test', 'ODI', 'T20', 'IPL'], rows: Object.fromEntries(Object.entries(bowlingRows).map(([k, v]) => [k, [...v, '–']])) },
};
// IPL batting zeroes must be '0' not '–' for numeric rows
for (const k of ['Matches', 'Innings', 'Runs', 'Fours', 'Sixes', '50s', '100s']) akhil.stats.batting.rows[k][3] = '0';
for (const k of ['Highest', 'Average', 'SR']) akhil.stats.batting.rows[k][3] = '–';
// bowling IPL: numeric rows 0, derived rows –
for (const k of ['Matches', 'Wickets']) akhil.stats.bowling.rows[k][3] = '0';
for (const k of ['Avg', 'Eco', 'BBI']) akhil.stats.bowling.rows[k][3] = '–';

writeFileSync(DATA, JSON.stringify(db, null, 2) + '\n');
console.log('rebuilt matches:', added);
console.log('totals -> matches:', db.matches.length, 'teams:', db.teams.length, 'tournaments:', db.tournaments.length, 'innings:', db.innings.length, 'batting:', db.batting.length, 'bowling:', db.bowling.length);
console.log('Akhil cards -> bat:', db.batting.filter((b) => b.playerId === PID).length, 'bowl:', db.bowling.filter((b) => b.playerId === PID).length);
console.log('summary batting rows:', JSON.stringify(battingRows));
console.log('summary bowling rows:', JSON.stringify(bowlingRows));