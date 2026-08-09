#!/usr/bin/env node
// Compile the 5 missing MPL 2025 Rewa Jaguars matches into records.json.
// Sources: /tmp/mpl2025_sc.jsonl (1st innings, CDP captures) + /tmp/mpl2025_inn2/*.txt (2nd innings, web_fetch).
// Both are in the clean Cricbuzz newline format that inningsBlocks() understands.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'data');
const db = JSON.parse(readFileSync(join(DATA, 'records.json'), 'utf8'));

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const slugify = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const MATCHES = {
  '120751': { num: 3, slug: 'bundelkhand-bulls-vs-rewa-jaguars-3rd-match-2025', result: 'Rewa Jaguars won by 30 runs (6 overs game due to rain)', date: '2025-06-13' },
  '120757': { num: 4, slug: 'rewa-jaguars-vs-gwalior-cheetahs-4th-match-2025', result: 'Rewa Jaguars won by 6 runs', date: '2025-06-14' },
  '120784': { num: 8, slug: 'chambal-ghariyals-vs-rewa-jaguars-8th-match-2025', result: 'Rewa Jaguars won by 39 runs', date: '2025-06-16' },
  '120856': { num: 16, slug: 'jabalpur-royal-lions-vs-rewa-jaguars-16th-match-2025', result: 'Jabalpur Royal Lions won by 21 runs', date: '2025-06-20' },
  '120883': { num: 19, slug: 'rewa-jaguars-vs-indore-pink-panthers-19th-match-2025', result: 'Rewa Jaguars won by 61 runs', date: '2025-06-21' },
};

function getTeam(name) {
  const key = norm(name);
  let t = db.teams.find((x) => norm(x.name) === key);
  if (!t) { t = { id: `t-${slugify(name)}`, name, slug: slugify(name), shortCode: (name.split(' ').map((w) => w[0]).join('').slice(0, 3) || 'TM').toUpperCase(), description: '' }; db.teams.push(t); }
  return t;
}
function getPlayer(name, teamId, role) {
  const key = norm(name.replace(/\s*\((c|wk|c\/wk|vc)\)\s*$/i, ''));
  let p = db.players.find((x) => norm(x.name) === key);
  if (!p) { p = { id: `p-${slugify(name.replace(/\s*\((c|wk|c\/wk|vc)\)\s*$/i, ''))}`, name: name.replace(/\s*\((c|wk|c\/wk|vc)\)\s*$/i, '').trim(), slug: slugify(name.replace(/\s*\((c|wk|c\/wk|vc)\)\s*$/i, '')), teamId, role: role || 'Player' }; db.players.push(p); }
  else { if (teamId && !p.teamId) p.teamId = teamId; if (role && p.role === 'Player') p.role = role; }
  return p;
}

// ---- same parsers as compile_mpl.mjs ----
function inningsBlocks(text) {
  const blocks = [];
  const re = /([A-Z][A-Za-z .'\n-]+?)(\d{1,3})-(\d{1,2})\s*\(([\d.]+) Ov\)\s*\nBatter\nR\nB\n4s\n6s\nSR/g;
  let m;
  while ((m = re.exec(text))) {
    const bodyStart = m.index + m[0].length;
    const rest = text.slice(bodyStart);
    const end = rest.search(/(?=[A-Z][A-Za-z .'-]+?\d{1,3}-\d{1,2}\s*\([\d.]+ Ov\)\s*\nBatter)|(?=INFOMatch)/);
    const body = rest.slice(0, end < 0 ? 14000 : end);
    blocks.push({ team: m[1].trim(), runs: parseInt(m[2], 10), wickets: parseInt(m[3], 10), overs: parseFloat(m[4]), body });
  }
  return blocks;
}

function battingRows(body) {
  const rows = [];
  const linesArr = body.split('\n');
  let i = 0;
  while (i < linesArr.length) {
    const name = (linesArr[i] || '').trim();
    if (!name) { i++; continue; }
    if (/^(Extras|Total|Did not Bat|Bowler|Fall of Wickets|Powerplays|Partnerships|INFO)/.test(name)) break;
    const dismissal = (linesArr[i + 1] || '').trim();
    const nums = linesArr.slice(i + 2, i + 6).map((n) => parseInt(n, 10));
    if (nums.some((n) => isNaN(n))) { i++; continue; }
    const sr = parseFloat(linesArr[i + 6]);
    rows.push({ name: name.replace(/\s*\((c|wk|c\/wk|vc)\)\s*$/i, '').trim(), dismissal, runs: nums[0], balls: nums[1], fours: nums[2], sixes: nums[3], strikeRate: isNaN(sr) ? null : sr });
    i += 7;
  }
  return rows;
}

function bowlingRows(body) {
  const rows = [];
  const linesArr = body.split('\n');
  const bi = linesArr.findIndex((l) => /^Bowler$/.test(l.trim()));
  if (bi < 0) return rows;
  let i = bi + 1;
  // skip header lines (O, M, R, W, ... ECO) — advance until a name followed by 5+ numeric lines
  while (i < linesArr.length) {
    const name = (linesArr[i] || '').trim();
    if (!name) { i++; continue; }
    if (/^(Fall of Wickets|Powerplays|Partnerships|INFO|Batter|Extras|Total)/.test(name)) break;
    const nums = linesArr.slice(i + 1, i + 7).map((n) => parseFloat(n));
    if (nums.slice(0, 5).some((n) => isNaN(n))) { i++; continue; } // header row — keep scanning
    rows.push({ name: name.replace(/\s*\((c|wk|c\/wk|vc)\)\s*$/i, '').trim(), overs: nums[0], maidens: nums[1], runs: nums[2], wickets: nums[3], economy: nums[6] || null });
    // advance past name + all consecutive numeric lines (header width varies: 5 or 7 fields)
    let j = i + 1;
    while (j < linesArr.length && !isNaN(parseFloat(linesArr[j])) && linesArr[j].trim() !== '') j++;
    i = j;
  }
  return rows;
}

// load sources
const firstInn = new Map(); // id -> text (1st innings)
for (const l of readFileSync('/tmp/mpl2025_sc.jsonl', 'utf8').trim().split('\n').filter(Boolean)) {
  try {
    const o = JSON.parse(l);
    const id = (o.url.match(/live-cricket-scores\/(\d+)/) || [])[1];
    if (id && o.result) firstInn.set(id, o.result);
  } catch {}
}
const secondInn = new Map(); // id -> text (2nd innings)
import { readdirSync } from 'node:fs';
for (const f of readdirSync('/tmp/mpl2025_inn2')) {
  const id = f.replace('.txt', '');
  secondInn.set(id, readFileSync(join('/tmp/mpl2025_inn2', f), 'utf8'));
}

// tournament + season
let s2025 = db.seasons.find((s) => s.year === 2025);
if (!s2025) { s2025 = { id: 's-2025', year: 2025, slug: '2025', startDate: '2025-01-01', endDate: '2025-12-31', status: 'completed' }; db.seasons.push(s2025); }
let t2025 = db.tournaments.find((t) => t.id === 't-mpl-2025');
if (!t2025) { t2025 = { id: 't-mpl-2025', name: 'Madhya Pradesh League 2025', slug: 'madhya-pradesh-league-2025', seasonId: s2025.id, format: 'T20', status: 'completed', description: 'Madhya Pradesh League T20, 2025 season. Rewa Jaguars reached the semi-finals.' }; db.tournaments.push(t2025); }
// ensure the OTHER dup tournament id (t-mpl-2025 'Madhya Pradesh League') is gone
db.tournaments = db.tournaments.filter((t, i, arr) => t.id !== 't-mpl-2025' || arr.findIndex((x) => x.id === 't-mpl-2025') === i);

const venueMap = {
  'Shrimant Madhavrao Scindia Cricket Stadium': null,
};
function getVenue(name) {
  const key = norm(name);
  let v = db.venues.find((x) => norm(x.name) === key);
  if (!v) { v = { id: `v-${slugify(name)}`, name, slug: slugify(name), city: 'Gwalior', state: 'Madhya Pradesh', capacity: null }; db.venues.push(v); }
  return v;
}

let created = 0;
for (const [id, cfg] of Object.entries(MATCHES)) {
  const f1 = firstInn.get(id) || '';
  const f2 = secondInn.get(id) || '';
  const all = f1 + '\n' + f2;
  const blocks = inningsBlocks(all);
  if (blocks.length < 2) { console.log('SKIP', id, 'blocks:', blocks.length); continue; }

  // match already exists?
  if (db.matches.some((m) => m.slug === cfg.slug)) { console.log('EXISTS', cfg.slug); continue; }

  // team A = 1st innings team, team B = 2nd innings team
  const teamA = getTeam(blocks[0].team);
  const teamB = getTeam(blocks[1].team);
  const venueM = all.match(/Venue:\s*([^\n]+)/) || all.match(/Venue\n([^\n]+)/);
  const venue = getVenue((venueM ? venueM[1].trim() : 'Shrimant Madhavrao Scindia Cricket Stadium').replace(/\s*•.*/, ''));

  const match = {
    id: `m-${cfg.slug}`,
    slug: cfg.slug,
    tournamentId: t2025.id,
    seasonId: s2025.id,
    venueId: venue.id,
    teamAId: teamA.id,
    teamBId: teamB.id,
    matchDate: cfg.date,
    format: 'T20',
    status: 'completed',
    resultText: cfg.result,
    matchNumber: cfg.num,
    notes: all.slice(0, 6000),
  };
  db.matches.push(match);

  for (let bi = 0; bi < blocks.length; bi++) {
    const blk = blocks[bi];
    const team = bi === 0 ? teamA : teamB;
    const inn = { id: `inn-${match.id}-mpl-${db.innings.length + 1}`, matchId: match.id, teamId: team.id, battingOrder: bi + 1, runs: blk.runs, wickets: blk.wickets, overs: blk.overs };
    db.innings.push(inn);
    for (const b of battingRows(blk.body)) {
      const p = getPlayer(b.name, team.id, 'Player');
      db.batting.push({ id: `b-${db.batting.length + 1}`, inningsId: inn.id, playerId: p.id, runs: b.runs, balls: b.balls, fours: b.fours, sixes: b.sixes, dismissal: b.dismissal, notOut: /not out/i.test(b.dismissal), strikeRate: b.strikeRate });
    }
    const oppTeamId = team.id === match.teamAId ? match.teamBId : match.teamAId;
    for (const bw of bowlingRows(blk.body)) {
      const p = getPlayer(bw.name, oppTeamId, 'Player');
      db.bowling.push({ id: `w-${db.bowling.length + 1}`, inningsId: inn.id, playerId: p.id, overs: bw.overs, maidens: bw.maidens, runs: bw.runs, wickets: bw.wickets, economy: bw.economy });
    }
  }
  created++;
  console.log('CREATED', cfg.slug, '| blocks:', blocks.length);
}

const seen = new Set();
db.players = db.players.filter((p) => (seen.has(p.slug) ? false : seen.add(p.slug)));
writeFileSync(join(DATA, 'records.json'), JSON.stringify(db, null, 2));
console.log(`DONE: created=${created} matches=${db.matches.length} players=${db.players.length} innings=${db.innings.length} batting=${db.batting.length} bowling=${db.bowling.length}`);
