#!/usr/bin/env node
// Generalized scorecard compiler — merges ANY vacuumed CricHeroes scorecard
// into records.json, auto-creating tournaments, teams, players, matches.
// Input: JSONL lines of {url, result} where result = {url, text, tables?} or raw JSON.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'data');
const inputFile = process.argv[2];
const outFile = process.argv[3] || join(DATA, 'records.json');

const db = JSON.parse(readFileSync(join(DATA, 'records.json'), 'utf8'));

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const slugify = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const teamsById = new Map(db.teams.map((t) => [t.id, t]));
const playersByKey = new Map(db.players.map((p) => [norm(p.name), p]));
const tourneysByKey = new Map(db.tournaments.map((t) => [norm(t.name + t.seasonId), t]));
const matchesByUrl = new Map(db.matches.map((m) => [m.slug, m]));

function getTeam(name) {
  const key = norm(name);
  let t = [...teamsById.values()].find((x) => norm(x.name) === key);
  if (!t) {
    t = { id: `t-${slugify(name)}-${teamsById.size + 1}`, name, slug: slugify(name) || `team-${teamsById.size + 1}`, shortCode: (name.split(' ').map((w) => w[0]).join('').slice(0, 3) || 'TM').toUpperCase(), description: '' };
    db.teams.push(t);
    teamsById.set(t.id, t);
  }
  return t;
}

function getPlayer(name, teamId) {
  const key = norm(name);
  let p = playersByKey.get(key);
  if (!p) {
    p = { id: `p-${slugify(name)}-${playersByKey.size + 1}`, name: name.replace(/\s*\([^)]*\)/g, '').trim(), slug: slugify(name), teamId, role: 'Player' };
    db.players.push(p);
    playersByKey.set(key, p);
  } else if (teamId && !p.teamId) p.teamId = teamId;
  return p;
}

function getTournament(name, format, year) {
  const season = db.seasons.find((s) => s.year === year) || (() => {
    const s = { id: `s-${year}`, year, slug: String(year), startDate: `${year}-01-01`, endDate: `${year}-12-31`, status: 'completed' };
    db.seasons.push(s);
    return s;
  })();
  const key = norm(name + season.id);
  let t = tourneysByKey.get(key);
  if (!t) {
    t = { id: `t-${slugify(name)}-${year}`, name, slug: slugify(name), seasonId: season.id, format, status: 'completed', description: `Cricket tournament played in Rewa, ${year}.` };
    db.tournaments.push(t);
    tourneysByKey.set(key, t);
  }
  return t;
}

function getVenue(raw) {
  // raw like "NCL Nigahi Stadium, Singrauli" -> name + city
  const [name = raw, city] = raw.split(',').map((s) => s.trim());
  const key = norm(name);
  let v = db.venues.find((x) => norm(x.name) === key);
  if (!v) {
    v = { id: `v-${slugify(name)}-${db.venues.length + 1}`, name, slug: slugify(name), city: city || 'Rewa', state: 'Madhya Pradesh', capacity: null };
    db.venues.push(v);
  }
  return v;
}

function parseHeader(text) {
  // Past\nTOURNAMENT\n(round)\nVENUE, City, date, format\nToss: X
  const m = text.match(/Past\s*\n([^\n]+)\n\(([^)]*)\)\n([^\n]+)/);
  return m ? { tournament: m[1].trim(), round: m[2].trim(), venueLine: m[3].trim() } : null;
}

function parseInningsBlocks(text) {
  const re = /(^|\n)([A-Z0-9 .&()-]+?)\n+\(([\d.]+) Ov\)/g;
  const positions = [];
  let mm;
  while ((mm = re.exec(text))) positions.push({ idx: mm.index + (mm[1] ? 1 : 0), team: mm[2].trim(), overs: mm[3] });
  const blocks = [];
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].idx;
    const end = i + 1 < positions.length ? positions[i + 1].idx : text.length;
    blocks.push({ team: positions[i].team, overs: positions[i].overs, body: text.slice(start, end) });
  }
  return blocks;
}

function parseBatting(body) {
  const rows = [];
  const lines = body.split('\n');
  let inBatters = false;
  for (const line of lines) {
    const t = line.trim();
    if (/^Batters/.test(t)) { inBatters = true; continue; }
    if (/^Bowlers|^Extras|^Yet to Bat|^Fall Of Wickets/.test(t)) { inBatters = false; }
    if (!inBatters || !t) continue;
    const f = line.split('\t').map((x) => x.trim());
    const name = (f[0] || '').replace(/\s*\((C|Wk|C\/Wk)\)\s*$/, '');
    if (!name || /^(Extras|Total|Did not bat)/.test(name) || /^\d+$/.test(name)) continue;
    const runs = parseInt(f[3], 10);
    if (isNaN(runs)) continue;
    const sr = parseFloat(f[6]) || null;
    const dismissal = f[1] || (runs === 0 ? '—' : 'not out');
    // columns: [0]=name [1]=dismissal(or empty) [2]='' [3]=R [4]=4s [5]=6s [6]=SR [7]=Min; balls not in flat text
    const fours = parseInt(f[4], 10) || 0;
    const sixes = parseInt(f[5], 10) || 0;
    rows.push({ name, runs, balls: 0, fours, sixes, dismissal, strikeRate: sr });
  }
  return rows;
}

function parseBowling(body) {
  const rows = [];
  const lines = body.split('\n');
  let inBowlers = false;
  for (const line of lines) {
    const t = line.trim();
    if (/^Bowlers/.test(t)) { inBowlers = true; continue; }
    if (!inBowlers || !t) continue;
    if (/^Batters|^Extras|^Fall|^Yet/.test(t)) { inBowlers = false; continue; }
    if (!/^\S/.test(t)) { inBowlers = false; continue; }
    const f = line.split('\t').map((x) => x.trim());
    const name = f[0];
    if (!name || name === 'Bowlers') continue;
    const overs = parseFloat(f[1]);
    if (isNaN(overs)) continue;
    rows.push({
      name,
      overs,
      maidens: parseInt(f[2], 10) || 0,
      runs: parseInt(f[3], 10) || 0,
      wickets: parseInt(f[4], 10) || 0,
      economy: parseFloat(f[10]) || null,
    });
  }
  return rows;
}

const lines = readFileSync(inputFile, 'utf8').split('\n').filter((l) => l.trim());
let parsed = 0, skipped = 0;

for (const line of lines) {
  let page;
  try {
    const o = JSON.parse(line);
    page = o.result ? JSON.parse(o.result) : o;
  } catch { skipped++; continue; }
  if (!page || !page.text || !page.url.includes('scorecard')) { skipped++; continue; }
  const header = parseHeader(page.text);
  if (!header) { skipped++; continue; }

  // innings totals from "Innings Break: TEAM - X/Y in Z overs" notes (reliable)
  const innBreak = {};
  const ibRe = /Innings Break:\s*([A-Z0-9 .&()-]+?)\s*-\s*(\d+)\/(\d+)\s*in\s*([\d.]+)/gi;
  let ib;
  while ((ib = ibRe.exec(page.text))) {
    innBreak[norm(ib[1])] = { runs: parseInt(ib[2], 10), wickets: parseInt(ib[3], 10), overs: parseFloat(ib[4]) };
  }

  const blocks = parseInningsBlocks(page.text);
  if (blocks.length < 1) { skipped++; continue; }

  // date + format from venue line: "Venue, City, 27-Dec-18 09:00 AM, Limited Overs, 50 Ov."
  const dMatch = page.text.match(/(\d{2}-[A-Za-z]{3}-\d{2})/);
  let year = 2026;
  if (dMatch) {
    const [dd, mmm, yy] = dMatch[1].split('-');
    const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
    const dt = new Date(2000 + Number(yy), months[mmm], Number(dd));
    year = dt.getFullYear();
  }
  const format = /T20|Twenty/i.test(page.text) ? 'T20' : /T10/i.test(page.text) ? 'T10' : /50 Ov|One Day/i.test(page.text) ? 'ODI' : /Test/i.test(page.text) ? 'Multi-day' : 'T20';
  const tournament = getTournament(header.tournament, format, year);
  const venue = getVenue(header.venueLine.split(', ').slice(0, 2).join(', '));

  // result
  const resultMatch = page.text.match(/([A-Za-z0-9 .&()-]+?) won by ([^.\n]+)/) || page.text.match(/Match Drawn, ([^\n]+)/);
  let resultText = resultMatch ? resultMatch[0].trim().replace(/\s+/g, ' ') : null;

  // teams from innings blocks
  const teamObjs = blocks.map((b) => getTeam(b.team));
  if (teamObjs.length < 2) { skipped++; continue; }
  const teamA = teamObjs[0];
  const teamB = teamObjs[1];

  // unique slug
  let slug = slugify(`${teamA.slug}-vs-${teamB.slug}-${year}-${tournament.slug}`.slice(0, 80));
  let u = 2;
  while (matchesByUrl.has(slug)) slug = slugify(`${teamA.slug}-vs-${teamB.slug}-${year}-${tournament.slug}-${u++}`.slice(0, 80));

  const status = /won by|Drawn/i.test(page.text) ? 'completed' : 'completed';
  const match = {
    id: `m-${slug}`,
    slug,
    tournamentId: tournament.id,
    seasonId: tournament.seasonId,
    venueId: venue.id,
    teamAId: teamA.id,
    teamBId: teamB.id,
    matchDate: dMatch ? `${year}-${String(({ Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 })[dMatch[1].split('-')[1]]).padStart(2, '0')}-${dMatch[1].split('-')[0]}` : `${year}-01-01`,
    format,
    status,
    resultText,
    notes: page.text,
  };
  db.matches.push(match);
  matchesByUrl.set(slug, match);

  // innings + scorecards
  for (const block of blocks) {
    const team = getTeam(block.team);
    const ibD = innBreak[norm(block.team)] || {};
    const inn = { id: `inn-${match.id}-${db.innings.length + 1}`, matchId: match.id, teamId: team.id, battingOrder: db.innings.filter((x) => x.matchId === match.id).length + 1, runs: ibD.runs ?? null, wickets: ibD.wickets ?? null, overs: parseFloat(block.overs) || null };
    db.innings.push(inn);
    for (const b of parseBatting(block.body)) {
      const p = getPlayer(b.name, team.id);
      db.batting.push({ id: `b-${db.batting.length + 1}`, inningsId: inn.id, playerId: p.id, runs: b.runs, balls: b.balls, fours: b.fours, sixes: b.sixes, dismissal: b.dismissal, notOut: /not out/i.test(b.dismissal), strikeRate: b.strikeRate });
    }
    for (const bw of parseBowling(block.body)) {
      const p = getPlayer(bw.name, team.id);
      db.bowling.push({ id: `w-${db.bowling.length + 1}`, inningsId: inn.id, playerId: p.id, overs: bw.overs, maidens: bw.maidens, runs: bw.runs, wickets: bw.wickets, economy: bw.economy });
    }
  }
  parsed++;
}

writeFileSync(outFile, JSON.stringify(db, null, 2));
console.log(`COMPILED: parsed=${parsed} skipped=${skipped}`);
console.log(`matches=${db.matches.length} teams=${db.teams.length} players=${db.players.length} innings=${db.innings.length} batting=${db.batting.length} bowling=${db.bowling.length} tournaments=${db.tournaments.length} venues=${db.venues.length}`);
