#!/usr/bin/env node
// Compile Ranji Trophy (and other BCCI) scorecards into records.json.
// Sources: /tmp/ranji_sc.jsonl + /tmp/ranji_more_sc.jsonl (Cricbuzz scorecard captures).
// Format: "TEAM 1st Innings\n670-7 d (160 Ov)\nBatter\nR\nB\n4s\n6s\nSR\n..."
// Supports 4-innings multi-day matches + declared (d) innings.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'data');
const db = JSON.parse(readFileSync(join(DATA, 'records.json'), 'utf8'));

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const slugify = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function getTeam(name) {
  const key = norm(name);
  let t = db.teams.find((x) => norm(x.name) === key);
  if (!t) { t = { id: `t-${slugify(name)}`, name, slug: slugify(name), shortCode: (name.split(' ').map((w) => w[0]).join('').slice(0, 3) || 'TM').toUpperCase(), description: '' }; db.teams.push(t); }
  return t;
}
function getPlayer(name, teamId, role) {
  const clean = (name || '').replace(/\s*\((c|wk|c\/wk|vc)\)\s*$/i, '').trim();
  const key = norm(clean);
  let p = db.players.find((x) => norm(x.name) === key);
  if (!p) { p = { id: `p-${slugify(clean)}`, name: clean, slug: slugify(clean), teamId, role: role || 'Player' }; db.players.push(p); }
  else { if (teamId && !p.teamId) p.teamId = teamId; if (role && p.role === 'Player') p.role = role; }
  return p;
}

// Innings blocks: "TEAM 1st Innings\n670-7 d (160 Ov)\nBatter\nR\nB\n4s\n6s\nSR"
function inningsBlocks(text) {
  const blocks = [];
  const re = /([A-Z][A-Za-z .'-]+?)\s+(1st|2nd|3rd|4th) Innings\n(\d{1,4})-(\d{1,2})\s*(d)?\s*\(([\d.]+) Ov\)\nBatter\nR\nB\n4s\n6s\nSR/g;
  let m;
  while ((m = re.exec(text))) {
    const bodyStart = m.index + m[0].length;
    const rest = text.slice(bodyStart);
    const end = rest.search(/(?=[A-Z][A-Za-z .'-]+?\s+(?:1st|2nd|3rd|4th) Innings\n\d{1,4}-\d{1,2}\s*(?:d)?\s*\([\d.]+ Ov\)\nBatter)|(?=INFOMatch)/);
    const body = rest.slice(0, end < 0 ? 40000 : end);
    blocks.push({ team: m[1].trim(), runs: parseInt(m[3], 10), wickets: parseInt(m[4], 10), declared: !!m[5], overs: parseFloat(m[6]), body });
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
  while (i < linesArr.length) {
    const name = (linesArr[i] || '').trim();
    if (!name) { i++; continue; }
    if (/^(Fall of Wickets|Powerplays|Partnerships|INFO|Batter|Extras|Total)/.test(name)) break;
    const nums = linesArr.slice(i + 1, i + 8).map((n) => parseFloat(n));
    if (nums.slice(0, 4).some((n) => isNaN(n))) { i++; continue; }
    rows.push({ name: name.replace(/\s*\((c|wk|c\/wk|vc)\)\s*$/i, '').trim(), overs: nums[0], maidens: nums[1], runs: nums[2], wickets: nums[3], economy: nums[6] || null });
    let j = i + 1;
    while (j < linesArr.length && !isNaN(parseFloat(linesArr[j])) && linesArr[j].trim() !== '') j++;
    i = j;
  }
  return rows;
}

// ---- match metadata from scorecard text ----
function matchInfo(text) {
  const titleM = text.match(/([A-Z][A-Za-z .']+?) vs ([A-Z][A-Za-z .']+?), ([^,]+), ([^\n]+) - Scorecard/);
  const dateM = text.match(/Date & Time:\s*\w+,\s*([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})/);
  const venueM = text.match(/Venue:\s*([^\n•]+)/);
  const resultM = text.match(/(?:Match|:)\s*([A-Za-z ].{0,80}?)\n(?:[A-Z]{2,}|Info|Live|Scorecard)/);
  const seriesM = text.match(/Series:\s*([^\n]+)/);
  return {
    title: titleM ? titleM[0] : null,
    teamA: titleM?.[1]?.trim(), teamB: titleM?.[2]?.trim(),
    date: dateM ? `${dateM[3]}-${String({ january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 }[dateM[1].toLowerCase()]).padStart(2, '0')}-${String(Number(dateM[2])).padStart(2, '0')}` : null,
    venue: venueM ? venueM[1].trim() : null,
    result: resultM ? resultM[1].trim() : null,
    series: seriesM ? seriesM[1].trim() : null,
  };
}

// season/tournament from series name
function getTournament(seriesName, dateStr) {
  const year = dateStr ? parseInt(dateStr.slice(0, 4), 10) : 2024;
  const sYear = `${year - 1}-${String(year).slice(2)}`;
  const isRanji = /ranji/i.test(seriesName || '');
  const slugBase = isRanji ? 'ranji-trophy' : slugify(seriesName || 'bcci-competition');
  let season = db.seasons.find((s) => s.year === year);
  if (!season) { season = { id: `s-${year}`, year, slug: String(year), startDate: `${year}-01-01`, endDate: `${year}-12-31`, status: year >= 2025 ? 'ongoing' : 'completed' }; db.seasons.push(season); }
  const tname = isRanji ? `Ranji Trophy ${sYear}` : (seriesName || 'BCCI Competition');
  let t = db.tournaments.find((x) => norm(x.name + x.seasonId) === norm(tname + season.id));
  if (!t) {
    t = { id: `t-${slugBase}-${sYear}`, name: tname, slug: `${slugBase}-${sYear}`, seasonId: season.id, format: 'First-class', status: 'completed', category: 'official', governingBody: 'BCCI', description: `${tname} — national ${isRanji ? 'first-class' : ''} competition. Rewa players feature for Madhya Pradesh.` };
    db.tournaments.push(t);
  }
  return t;
}

function getVenue(name) {
  const key = norm(name);
  let v = db.venues.find((x) => norm(x.name) === key);
  if (!v) { v = { id: `v-${slugify(name)}`, name, slug: slugify(name), city: 'India', state: '', capacity: null }; db.venues.push(v); }
  return v;
}

// load captures
const captures = [];
for (const f of ['/tmp/ranji_sc.jsonl', '/tmp/ranji_more_sc.jsonl']) {
  try {
    for (const l of readFileSync(f, 'utf8').trim().split('\n').filter(Boolean)) {
      try {
        const o = JSON.parse(l);
        if (o.result && o.result.length > 500) captures.push({ url: o.url, text: o.result });
      } catch {}
    }
  } catch {}
}
console.log('captures loaded:', captures.length);

let created = 0, skipped = 0;
for (const cap of captures) {
  const text = cap.text;
  const id = (cap.url.match(/scorecard\/(\d+)/) || [])[1];
  const info = matchInfo(text);
  const blocks = inningsBlocks(text);
  if (!blocks.length) { console.log('NO-INNINGS', id); skipped++; continue; }

  const teamA = getTeam(blocks[0].team);
  const teamB = getTeam(blocks.find((b) => norm(b.team) !== norm(teamA.name))?.team || blocks[1]?.team || '');
  const t = getTournament(info.series, info.date);
  const venue = getVenue(info.venue || 'Unknown Ground');

  const slug = `${slugify(teamA.name)}-vs-${slugify(teamB.name)}-${id}`;
  if (db.matches.some((m) => m.slug === slug)) { console.log('EXISTS', slug); continue; }

  const match = {
    id: `m-${slug}`,
    slug,
    tournamentId: t.id,
    seasonId: t.seasonId,
    venueId: venue.id,
    teamAId: teamA.id,
    teamBId: teamB.id,
    matchDate: info.date,
    format: 'First-class',
    status: 'completed',
    resultText: info.result || '',
    matchNumber: null,
    notes: text.slice(0, 6000),
  };
  db.matches.push(match);

  let order = 1;
  for (const blk of blocks) {
    const team = norm(blk.team) === norm(teamA.name) ? teamA : teamB;
    const inn = { id: `inn-${match.id}-${db.innings.length + 1}`, matchId: match.id, teamId: team.id, battingOrder: order++, runs: blk.runs, wickets: blk.wickets, overs: blk.overs, declared: blk.declared || undefined };
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
  console.log('CREATED', slug, '|', info.series, '|', info.date, '| innings:', blocks.length);
}

const seen = new Set();
db.players = db.players.filter((p) => (seen.has(p.slug) ? false : seen.add(p.slug)));
writeFileSync(join(DATA, 'records.json'), JSON.stringify(db, null, 2));
console.log(`RANJI COMPILED: created=${created} skipped=${skipped} matches=${db.matches.length} players=${db.players.length} innings=${db.innings.length} batting=${db.batting.length} bowling=${db.bowling.length} tournaments=${db.tournaments.length}`);
