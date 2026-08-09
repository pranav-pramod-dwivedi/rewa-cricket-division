#!/usr/bin/env node
// Compile MPL scorecards from messy Cricbuzz full-page captures (both innings).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'data');
const db = JSON.parse(readFileSync(join(DATA, 'records.json'), 'utf8'));

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const slugify = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };

const ID_MAP = {
  '160383': 'bundelkhand-bulls-vs-rewa-jaguars-6th-match-2026',
  '160427': 'rewa-jaguars-vs-bhopal-leopards-10th-match-2026',
  '160471': 'rewa-jaguars-vs-indore-pink-panthers-14th-match-2026',
  '160537': 'rewa-jaguars-vs-royal-nimar-eagles-20th-match-2026',
  '160592': 'rewa-jaguars-vs-ujjain-falcons-25th-match-2026',
  '160625': 'rewa-jaguars-vs-gwalior-cheetahs-28th-match-2026',
  '160651': 'rewa-jaguars-vs-jabalpur-royal-lions-31st-match-2026',
  '160755': 'rewa-jaguars-vs-malwa-stallions-41st-match-2026',
  '160777': 'chambal-ghariyals-vs-rewa-jaguars-43rd-match-2026',
  '160810': 'rewa-jaguars-vs-royal-nimar-eagles-1st-semi-final-2026',
  '120916': 'rewa-jaguars-vs-bhopal-leopards-1st-semi-final-2025',
  '120812': 'rewa-jaguars-vs-bhopal-leopards-11th-match-2025',
};

function getTeam(name) {
  const key = norm(name);
  let t = db.teams.find((x) => norm(x.name) === key);
  if (!t) { t = { id: `t-${slugify(name)}`, name, slug: slugify(name), shortCode: (name.split(' ').map((w) => w[0]).join('').slice(0, 3) || 'TM').toUpperCase(), description: '' }; db.teams.push(t); }
  return t;
}
function getPlayer(name, teamId, role) {
  const key = norm(name);
  let p = db.players.find((x) => norm(x.name) === key);
  if (!p) { p = { id: `p-${slugify(name)}`, name, slug: slugify(name), teamId, role: role || 'Player' }; db.players.push(p); }
  else { if (teamId && !p.teamId) p.teamId = teamId; if (role && p.role === 'Player') p.role = role; }
  return p;
}

// ---- clean-format parsers (parts text contains all innings with newlines) ----
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
  let i = 0; // body starts at the first batter (header already consumed)
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
  let i = bi + 8; // skip header: O M R W NB WD ECO
  while (i < linesArr.length) {
    const name = (linesArr[i] || '').trim();
    if (!name) { i++; continue; }
    if (/^(Fall of Wickets|Powerplays|Partnerships|INFO|Batter)/.test(name)) break;
    const nums = linesArr.slice(i + 1, i + 8).map((n) => parseFloat(n));
    if (nums.some((n) => isNaN(n))) break;
    rows.push({ name: name.replace(/\s*\((c|wk|c\/wk|vc)\)\s*$/i, '').trim(), overs: nums[0], maidens: nums[1], runs: nums[2], wickets: nums[3], economy: nums[6] || null });
    i += 8;
  }
  return rows;
}

// ---- clean-text parsers (match info + squads) ----
function cleanSquads(text) {
  const squads = [];
  const re = /([A-Za-z ]+?) squad\nPlayers\n([\s\S]*?)(?:\nBench\n([\s\S]*?))?(?=\n[A-Za-z ]+? squad\n|\nBook Before|$)/g;
  let m;
  while ((m = re.exec(text))) {
    squads.push({
      teamName: m[1].trim(),
      players: (m[2] || '').split('\n').map((s) => s.replace(/,$/, '').trim()).filter(Boolean),
      bench: (m[3] || '').split('\n').map((s) => s.replace(/,$/, '').trim()).filter(Boolean),
    });
  }
  return squads;
}

// load both capture files, keyed by match id
const cleanPages = new Map();
for (const l of readFileSync('/tmp/cb_sc.jsonl', 'utf8').trim().split('\n').filter(Boolean)) {
  try { const o = JSON.parse(JSON.parse(l).result || '{}'); const id = (o.url.match(/scorecard\/(\d+)\//) || [])[1]; if (id) cleanPages.set(id, o.text); } catch {}
}
const messyPages = new Map();
for (const l of readFileSync('/tmp/cb_inn.jsonl', 'utf8').trim().split('\n').filter(Boolean)) {
  try {
    const raw = JSON.parse(l);
    const o = JSON.parse(raw.result || '{}');
    const id = (o.url.match(/scorecard\/(\d+)\//) || [])[1];
    if (id) messyPages.set(id, (o.parts || []).map((p) => p.text || '').join('\n'));
  } catch {}
}

let parsed = 0;
const ids = new Set([...cleanPages.keys(), ...messyPages.keys()]);
for (const id of ids) {
  const match = db.matches.find((m) => m.slug === ID_MAP[id]);
  if (!match) { console.log('no match for', id); continue; }
  const clean = cleanPages.get(id) || '';
  const messy = messyPages.get(id) || '';

  // date + venue from clean text
  const dateM = clean.match(/Date\n([A-Za-z]+) (\d{1,2})/);
  const year = /2025/.test(id) ? 2025 : 2026;
  if (dateM) {
    const mon = MONTHS[dateM[1].toLowerCase()];
    if (mon) match.matchDate = `${year}-${String(mon).padStart(2, '0')}-${String(Number(dateM[2])).padStart(2, '0')}`;
  }
  const venueM = clean.match(/Venue\n([^\n]+)/);
  if (venueM) {
    let v = db.venues.find((x) => norm(x.name) === norm(venueM[1].trim()));
    if (!v) { v = { id: `v-${slugify(venueM[1])}`, name: venueM[1].trim(), slug: slugify(venueM[1]), city: 'Indore', state: 'Madhya Pradesh', capacity: null }; db.venues.push(v); }
    match.venueId = v.id;
  }

  // squads
  for (const sq of cleanSquads(clean)) {
    const team = getTeam(sq.teamName);
    for (const p of sq.players) {
      const role = /\(c\)$/i.test(p) ? 'Captain' : /\(wk\)$/i.test(p) ? 'Wicketkeeper' : 'Player';
      getPlayer(p.replace(/\((c|wk|c\/wk)\)$/i, '').trim(), team.id, role);
    }
    for (const p of sq.bench) getPlayer(p.replace(/,$/, '').trim(), team.id, 'Player');
  }

  // innings from parts text (contains both innings in clean format)
  const source = messy || clean;
  const blocks = inningsBlocks(source);
  for (const blk of blocks) {
    const team = getTeam(blk.team);
    const already = db.innings.some((x) => x.matchId === match.id && x.teamId === team.id);
    if (already) continue; // dedupe repeated page captures
    const inn = { id: `inn-${match.id}-mpl-${db.innings.length + 1}`, matchId: match.id, teamId: team.id, battingOrder: db.innings.filter((x) => x.matchId === match.id).length + 1, runs: blk.runs, wickets: blk.wickets, overs: blk.overs };
    db.innings.push(inn);
    const batters = battingRows(blk.body);
    for (const b of batters) {
      const p = getPlayer(b.name, team.id, 'Player');
      if (db.batting.some((x) => x.inningsId === inn.id && x.playerId === p.id)) continue;
      db.batting.push({ id: `b-${db.batting.length + 1}`, inningsId: inn.id, playerId: p.id, runs: b.runs, balls: b.balls, fours: b.fours, sixes: b.sixes, dismissal: b.dismissal, notOut: /not out/i.test(b.dismissal), strikeRate: b.strikeRate });
    }
    const bowlers = bowlingRows(blk.body);
    const oppTeamId = team.id === match.teamAId ? match.teamBId : match.teamAId;
    for (const bw of bowlers) {
      const p = getPlayer(bw.name, oppTeamId, 'Player');
      if (db.bowling.some((x) => x.inningsId === inn.id && x.playerId === p.id)) continue;
      db.bowling.push({ id: `w-${db.bowling.length + 1}`, inningsId: inn.id, playerId: p.id, overs: bw.overs, maidens: bw.maidens, runs: bw.runs, wickets: bw.wickets, economy: bw.economy });
    }
  }
  if (clean) match.notes = (match.notes || '') + '\n\n' + clean.slice(0, 6000);
  parsed++;
  console.log('processed', match.slug, 'innings:', blocks.length);
}

const seen = new Set();
db.players = db.players.filter((p) => (seen.has(p.slug) ? false : seen.add(p.slug)));
writeFileSync(join(DATA, 'records.json'), JSON.stringify(db, null, 2));
console.log(`MPL COMPILED: parsed=${parsed} matches=${db.matches.length} players=${db.players.length} innings=${db.innings.length} batting=${db.batting.length} bowling=${db.bowling.length}`);
