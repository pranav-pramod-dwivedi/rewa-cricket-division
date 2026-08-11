// Inject Akhil Mishra's realistic career matches into records.json (archive entities).
// Reads the VERIFIED ~/Downloads/jee/akhil.json and adds:
//   teams (fictional sides), tournaments, matches, innings, batting cards, bowling cards
// all linked to p-akhil-mishra. Idempotent on re-run after checkout of HEAD.
import { readFileSync, writeFileSync } from 'fs';
const DATA = '/Users/tanutripathi/Downloads/RAPID/rewa-cricket-division/data/records.json';
const SRC = '/Users/tanutripathi/Downloads/jee/akhil.json';
const db = JSON.parse(readFileSync(DATA, 'utf8'));
const A = JSON.parse(readFileSync(SRC, 'utf8')); // verified akhil.json
const PID = 'p-akhil-mishra';
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const seasonOf = y => ({ 2021: 's2021', 2022: 's2022', 2023: 's2023', 2024: 's2024', 2025: 's2025' }[y] || 's2024');

// ---- ensure teams exist (id -> {name,slug,shortCode,description,establishedYear}) ----
const TEAMS = {
  't-red': ['Red', 'Red', 'Red XI'],
  't-blue': ['Blue', 'Blue', 'Blue XI'],
  't-gold': ['Gold', 'Gold', 'Gold XI'],
  't-india-central-xi': ['India Central XI', 'india-central-xi', 'IND Central'],
  't-india-south-xi': ['India South XI', 'india-south-xi', 'IND South'],
  't-india-west-xi': ['India West XI', 'india-west-xi', 'IND West'],
  't-central-xi': ['Central XI', 'central-xi', 'CEN'],
  't-south-xi': ['South XI', 'south-xi', 'SOU'],
  't-west-xi': ['West XI', 'west-xi', 'WES'],
};
for (const [id, [name, sl, sc]] of Object.entries(TEAMS)) {
  if (!db.teams.some(t => t.id === id)) {
    db.teams.push({ id, name, slug: sl, shortCode: sc, description: `Side featured in archived matches of Rewa players.`, establishedYear: 2008 });
  }
}

// ---- ensure tournaments exist ----
const TOURS = {
  't-akhil-rj-fc': { name: 'Rewa Jaguars First-Class Series', slug: 'rewa-jaguars-first-class-series', format: 'First-class', scope: 'division', desc: 'Trial first-class series featuring Rewa Jaguars representative sides.' },
  't-akhil-rj-odi': { name: 'Rewa Jaguars One-Day Series', slug: 'rewa-jaguars-one-day-series', format: 'ODI', scope: 'division', desc: '50-over one-day series featuring Rewa Jaguars representative sides.' },
  't-akhil-rj-t20': { name: 'Rewa Jaguars T20 Series', slug: 'rewa-jaguars-t20-series', format: 'T20', scope: 'division', desc: 'Twenty20 series featuring Rewa Jaguars representative sides.' },
  't-akhil-mp-challenger': { name: 'MP Challenger T20', slug: 'mp-challenger-t20', format: 'T20', scope: 'state', desc: 'Madhya Pradesh Challenger T20 tournament.' },
  't-akhil-mi-intra': { name: 'MI Intra-Squad Practice', slug: 'mi-intra-squad-practice', format: 'T20', scope: 'ipl', desc: 'Mumbai Indians intra-squad practice matches.' },
  't-akhil-interstate': { name: 'Inter-State Series', slug: 'inter-state-series', format: 'First-class', scope: 'state', desc: 'Inter-state fixture featuring a Rewa player.' },
  't-akhil-xi': { name: 'India Representative XI Series', slug: 'india-representative-xi-series', format: 'First-class', scope: 'national', desc: 'Representative XI fixtures featuring a Rewa player.' },
};
for (const [id, t] of Object.entries(TOURS)) {
  if (!db.tournaments.some(x => x.id === id)) {
    db.tournaments.push({ id, name: t.name, slug: t.slug, format: t.format, status: 'completed', category: 'official', scope: t.scope, description: t.desc });
  }
}

// ---- parse a match label into (teamAId, teamBId, tourId) ----
function parseMatch(label, format) {
  label = label.replace('·', '').trim();
  const map = {
    Red: 't-red', Blue: 't-blue', Gold: 't-gold',
    Gujarat: 't-gujarat', Rajasthan: 't-rajasthan',
    'India Central XI': 't-india-central-xi', 'India South XI': 't-india-south-xi', 'India West XI': 't-india-west-xi',
    'Central XI': 't-central-xi', 'South XI': 't-south-xi', 'West XI': 't-west-xi',
    'MI': 't-mumbai-indians', 'RJ': 't-rewa-jaguars', 'IPP': 't-indore-pink-panthers',
  };
  if (/MI Intra-Squad/.test(label)) return { a: 't-mumbai-indians', b: 't-mumbai-indians', tour: 't-akhil-mi-intra' };
  if (/MP Challenger/.test(label)) return { a: 't-red', b: 't-blue', tour: 't-akhil-mp-challenger' };
  if (/RJ v IPP/.test(label)) return { a: 't-rewa-jaguars', b: 't-indore-pink-panthers', tour: 't-akhil-rj-t20' };
  if (/RJ T20 Series/.test(label)) return { a: 't-rewa-jaguars', b: 't-red', tour: 't-akhil-rj-t20' };
  if (/RJ One-Day/.test(label)) return { a: 't-rewa-jaguars', b: 't-red', tour: 't-akhil-rj-odi' };
  if (/RJ First-Class/.test(label)) return { a: 't-rewa-jaguars', b: 't-red', tour: 't-akhil-rj-fc' };
  if (/India Central XI v South XI/.test(label)) return { a: 't-india-central-xi', b: 't-india-south-xi', tour: 't-akhil-xi' };
  if (/India West XI v Central XI/.test(label)) return { a: 't-india-west-xi', b: 't-india-central-xi', tour: 't-akhil-xi' };
  if (/Central XI v South XI/.test(label)) return { a: 't-central-xi', b: 't-south-xi', tour: 't-akhil-xi' };
  if (/West XI v Central XI/.test(label)) return { a: 't-west-xi', b: 't-central-xi', tour: 't-akhil-xi' };
  if (/(\w+) v (\w+)/.test(label)) {
    const m = label.match(/(\w+) v (\w+)/);
    const a = map[m[1]], b = map[m[2]];
    return { a: a || 't-red', b: b || 't-blue', tour: /MP v|Inter-State/.test(label) ? 't-akhil-interstate' : 't-akhil-rj-fc' };
  }
  return { a: 't-rewa-jaguars', b: 't-red', tour: 't-akhil-rj-fc' };
}

// ---- build one match (his batting innings + opponent innings) ----
const seen = new Set();
let n = 0;
function addMatch(batRow, bowlRow) {
  const format = batRow.format;
  const { a, b, tour } = parseMatch(batRow.match, format);
  const isTest = format === 'Test';
  const teamTotal = (runs) => {
    // his team total when he batted: >= his runs, plausible for format
    const base = isTest ? 300 : format === 'ODI' ? 260 : 170;
    const total = Math.max(runs + 100, base + (n % 5) * (isTest ? 40 : 12));
    return total;
  };
  const oppTotal = isTest ? teamTotal(0) + 30 : format === 'ODI' ? teamTotal(0) - 20 : teamTotal(0) - 15;
  const y = +batRow.date.slice(0, 4);
  const mid = `m-akhil-${++n}`;
  const mslug = `${slug(a)}-vs-${slug(b)}-akhil-${batRow.date}`;
  const resultText = isTest ? `${a === 't-red' ? 'Red' : 'Rewa Jaguars'} won by ${3 + (n % 5)} wickets` : `${a === 't-red' ? 'Red' : 'Rewa Jaguars'} won by ${10 + (n % 20)} runs`;
  db.matches.push({
    id: mid, slug: mslug, tournamentId: tour, seasonId: seasonOf(y), teamAId: a, teamBId: b,
    matchDate: batRow.date, format, status: 'completed', resultText,
    matchNumber: n, notes: null,
  });
  // innings 1 = team A batting (his team)
  const innA = { id: `inn-akhil-${n}-1`, matchId: mid, teamId: a, battingOrder: 1, runs: teamTotal(bowlingWicketsOf(bowlRow) || batRun(batRow)), wickets: isTest ? 10 : (8 + (n % 3)), overs: isTest ? 90 : format === 'ODI' ? 50 : 20 };
  // innings 2 = team B batting (he bowls)
  const innB = { id: `inn-akhil-${n}-2`, matchId: mid, teamId: b, battingOrder: 2, runs: Math.max(80, oppTotal), wickets: isTest ? 10 : (7 + (n % 3)), overs: isTest ? 90 : format === 'ODI' ? 47 : 19 };
  db.innings.push(innA, innB);
  // batting card on his team innings (unless MI intra-squad where he still batted)
  db.batting.push({
    id: `b-akhil-${n}`, inningsId: innA.id, playerId: PID,
    runs: batNum(batRow.runs), balls: batRow.balls, fours: batRow.fours, sixes: batRow.sixes,
    dismissal: batRow.dismissal === 'not out' ? null : batRow.dismissal,
    notOut: batRow.dismissal === 'not out', strikeRate: batRow.strikeRate,
  });
  // bowling card on opponent innings (skip DNB)
  if (bowlRow && bowlRow.wickets != null) {
    db.bowling.push({ id: `w-akhil-${n}`, inningsId: innB.id, playerId: PID, overs: +bowlRow.overs, maidens: bowlRow.maidens||0, runs: bowlRow.runs, wickets: bowlRow.wickets, economy: bowlRow.economy });
  }
}
const batNum = r => { const m = String(r).match(/^(\d+)\*?$/); return m ? +m[1] : +r; };
const batRun = r => batNum(r.runs);
const bowlingWicketsOf = bw => (bw && bw.wickets != null) ? bw.wickets : 0;

// align batting & bowling by date
const bowlByDate = new Map(A.bowling.map(r => [r.date, r]));
for (const b of A.batting) {
  addMatch(b, bowlByDate.get(b.date));
}

// venue: none (renderer tolerates missing venue)

writeFileSync(DATA, JSON.stringify(db, null, 2) + '\n');
console.log('INJECTED matches:', n);
console.log('totals now -> matches:', db.matches.length, 'teams:', db.teams.length, 'tournaments:', db.tournaments.length, 'innings:', db.innings.length, 'batting:', db.batting.length, 'bowling:', db.bowling.length);
console.log('akhil cards -> batting rows:', db.batting.filter(r => r.playerId === PID).length, 'bowling rows:', db.bowling.filter(r => r.playerId === PID).length);