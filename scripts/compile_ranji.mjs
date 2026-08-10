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

// Innings blocks: "MP 1st Innings\nMadhya Pradesh 1st Innings\n425-8 d\n(140 Ov)\nBatter\nR\nB\n4s\n6s\nSR"
function inningsBlocks(text) {
  const blocks = [];
  // header: SHORT Xth Innings / FULL NAME Xth Innings / SCORE[-W] [d] / (OV Ov) / [div junk] / Batter
  const re = /([A-Z][A-Za-z .'-]+?) (\d+)(?:st|nd|rd|th) Innings\n([A-Z][A-Za-z .'-]+?) \d+(?:st|nd|rd|th) Innings\n(\d{1,4})-(\d{1,2})\s*(d)?\s*\n[\s\S]{0,120}?\(([\d.]+) Ov\)[\s\S]{0,120}?\nBatter\nR\nB\n4s\n6s\nSR/g;
  let m;
  while ((m = re.exec(text))) {
    const bodyStart = m.index + m[0].length;
    const rest = text.slice(bodyStart);
    const end = rest.search(/(?=[A-Z][A-Za-z .'-]+? \d+(?:st|nd|rd|th) Innings\n[A-Z][A-Za-z .'-]+? \d+(?:st|nd|rd|th) Innings\n\d{1,4}-\d{1,2})|(?=INFOMatch)/);
    const body = rest.slice(0, end < 0 ? 40000 : end);
    blocks.push({ team: m[2].trim(), fullTeam: m[3].trim(), runs: parseInt(m[4], 10), wickets: parseInt(m[5], 10), declared: !!m[6], overs: parseFloat(m[7]), body });
  }
  // fallback: single-innings format without duplicate name line
  if (!blocks.length) {
    const re2 = /([A-Z][A-Za-z .'-]+?) (\d+)(?:st|nd|rd|th) Innings\n(\d{1,4})-(\d{1,2})\s*(d)?\s*\n[\s\S]{0,120}?\(([\d.]+) Ov\)[\s\S]{0,120}?\nBatter\nR\nB\n4s\n6s\nSR/g;
    while ((m = re2.exec(text))) {
      const bodyStart = m.index + m[0].length;
      const rest = text.slice(bodyStart);
      const end = rest.search(/(?=[A-Z][A-Za-z .'-]+? \d+(?:st|nd|rd|th) Innings\n\d{1,4}-\d{1,2})|(?=INFOMatch)/);
      const body = rest.slice(0, end < 0 ? 40000 : end);
      blocks.push({ team: m[1].trim(), fullTeam: m[1].trim(), runs: parseInt(m[3], 10), wickets: parseInt(m[4], 10), declared: !!m[5], overs: parseFloat(m[6]), body });
    }
  }
  // fallback 2: white-ball format "SHORT\nFULL\nSCORE-W\n(50 Ov)\nBatter..." (no Innings label)
  if (!blocks.length) {
    const re3 = /([A-Z]{2,6})\n([A-Z][A-Za-z .'-]+?)\n(\d{1,4})-(\d{1,2})\s*(d)?\s*\n[\s\S]{0,80}?\(([\d.]+) Ov\)[\s\S]{0,120}?\nBatter\nR\nB\n4s\n6s\nSR/g;
    while ((m = re3.exec(text))) {
      const bodyStart = m.index + m[0].length;
      const rest = text.slice(bodyStart);
      const end = rest.search(/(?=[A-Z]{2,6}\n[A-Z][A-Za-z .'-]+?\n\d{1,4}-\d{1,2})|(?=INFOMatch)/);
      const body = rest.slice(0, end < 0 ? 40000 : end);
      blocks.push({ team: m[1].trim(), fullTeam: m[2].trim(), runs: parseInt(m[3], 10), wickets: parseInt(m[4], 10), declared: !!m[5], overs: parseFloat(m[6]), body });
    }
  }
  return blocks;
}

function battingRows(body) {
  const rows = [];
  const linesArr = body.split('\n').map((s) => s.trim());
  let i = 0;
  while (i < linesArr.length) {
    const name = linesArr[i];
    if (!name) { i++; continue; }
    if (/^(Extras|Total|Did not Bat|Bowler|Fall of Wickets|Powerplays|Partnerships|INFO)/.test(name)) break;
    if (/^View match performance$|^View profile$/.test(name)) { i++; continue; }
    // skip noise between name and dismissal
    let j = i + 1;
    while (j < linesArr.length && (/^View match performance$|^View profile$/.test(linesArr[j]) || !linesArr[j])) j++;
    const dismissal = linesArr[j] || '';
    const nums = linesArr.slice(j + 1, j + 5).map((n) => parseInt(n, 10));
    if (nums.some((n) => isNaN(n))) { i++; continue; }
    const sr = parseFloat(linesArr[j + 5]);
    rows.push({ name: name.replace(/\s*\((c|wk|c\/wk|vc)\)\s*$/i, '').trim(), dismissal, runs: nums[0], balls: nums[1], fours: nums[2], sixes: nums[3], strikeRate: isNaN(sr) ? null : sr });
    i = j + 6;
  }
  return rows;
}

function bowlingRows(body) {
  const rows = [];
  const linesArr = body.split('\n').map((s) => s.trim());
  const bi = linesArr.findIndex((l) => /^Bowler$/.test(l));
  if (bi < 0) return rows;
  let i = bi + 1;
  while (i < linesArr.length) {
    const name = linesArr[i];
    if (!name) { i++; continue; }
    if (/^(Fall of Wickets|Powerplays|Partnerships|INFO|Batter|Extras|Total|Did not Bat)/.test(name)) break;
    if (/^View match performance$|^View profile$/.test(name)) { i++; continue; }
    let j = i + 1;
    while (j < linesArr.length && (/^View match performance$|^View profile$/.test(linesArr[j]) || !linesArr[j])) j++;
    const nums = linesArr.slice(j, j + 8).map((n) => parseFloat(n));
    if (nums.slice(0, 4).some((n) => isNaN(n))) { i++; continue; }
    rows.push({ name: name.replace(/\s*\((c|wk|c\/wk|vc)\)\s*$/i, '').trim(), overs: nums[0], maidens: nums[1], runs: nums[2], wickets: nums[3], economy: nums[6] || null });
    let k = j;
    while (k < linesArr.length && !isNaN(parseFloat(linesArr[k])) && linesArr[k] !== '') k++;
    i = k;
  }
  return rows;
}

// ---- match metadata: mobile fetch provides title/startDate/venue directly ----
function matchInfo(cap) {
  const text = cap.text;
  const title = cap.title || '';
  // "BEN vs MP, Round 7, Group E, Vijay Hazare Trophy 2024-25" or "MP vs KAR, Elite Group C, Ranji Trophy Elite 2024-25"
  const tm = title.match(/([A-Z][A-Za-z .']+?) vs ([A-Z][A-Za-z .']+?), (.+)/);
  const segs = tm ? tm[3].split(',').map((s) => s.trim()).filter(Boolean) : [];
  const series = segs.length ? segs[segs.length - 1] : (text.match(/Series:\s*([^\n]+)/)?.[1]?.trim() || '');
  const date = cap.startDate ? cap.startDate.slice(0, 10) : (text.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || null);
  const venue = cap.venue || (text.match(/Venue:\s*([^\n•]+)/)?.[1]?.trim() || null);
  return { teamA: tm?.[1]?.trim(), teamB: tm?.[2]?.trim(), series, date, venue, result: null };
}

// season/tournament from series name (supports Ranji + Vijay Hazare + SMAT + others)
function getTournament(seriesName, dateStr) {
  const sn = seriesName || '';
  const isRanji = /ranji/i.test(sn);
  const isVH = /vijay hazare/i.test(sn);
  const isSMAT = /mushtaq ali/i.test(sn);
  const isCK = /ck nayudu/i.test(sn);
  const isCooch = /cooch behar/i.test(sn);
  const isVM = /vijay merchant/i.test(sn);
  const isVinoo = /vinoo mankad/i.test(sn);
  const comp = isRanji ? 'Ranji Trophy' : isVH ? 'Vijay Hazare Trophy' : isSMAT ? 'Syed Mushtaq Ali Trophy' : isCK ? 'CK Nayudu Trophy' : isCooch ? 'Cooch Behar Trophy' : isVM ? 'Vijay Merchant Trophy' : isVinoo ? 'Vinoo Mankad Trophy' : 'BCCI Competition';
  const slugBase = slugify(comp);
  // prefer the label in the series name (e.g. "2024-25", "2023", "2020-21"); fall back to date-derived
  let label = '';
  const lm = sn.match(/(\d{4})[-–]?(\d{2})?/);
  const year = dateStr ? parseInt(dateStr.slice(0, 4), 10) : (lm ? parseInt(lm[1], 10) : 2024);
  if (lm && lm[2]) label = `${lm[1]}-${lm[2]}`;
  else if (lm) label = `${parseInt(lm[1], 10) - 1}-${lm[1].slice(2)}`;
  else label = `${year - 1}-${String(year).slice(2)}`;
  // ensure the label year matches a season that exists
  const labelStart = parseInt(label.slice(0, 4), 10);
  const seasonYear = labelStart + 1;
  let season = db.seasons.find((s) => s.year === seasonYear);
  if (!season) { season = { id: `s-${seasonYear}`, year: seasonYear, slug: String(seasonYear), startDate: `${seasonYear}-01-01`, endDate: `${seasonYear}-12-31`, status: seasonYear >= 2025 ? 'ongoing' : 'completed' }; db.seasons.push(season); }
  const tname = `${comp} ${label}`;
  let t = db.tournaments.find((x) => norm(x.name + x.seasonId) === norm(tname + season.id));
  if (!t) {
    const fmt = isRanji || isCK || isCooch ? 'First-class' : 'List A';
    t = { id: `t-${slugBase}-${label}`, name: tname, slug: `${slugBase}-${label}`, seasonId: season.id, format: fmt, status: 'completed', category: 'official', governingBody: 'BCCI', description: `${tname} — national competition. Rewa players feature for Madhya Pradesh.` };
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
for (const f of ['/tmp/od_all.jsonl']) {
  try {
    for (const l of readFileSync(f, 'utf8').trim().split('\n').filter(Boolean)) {
      try {
        const o = JSON.parse(l);
        const text = o.text || o.result || '';
        if (text.length > 500) captures.push({ url: o.url, title: o.title || '', startDate: o.startDate || '', venue: o.venue || '', text });
      } catch {}
    }
  } catch {}
}
console.log('captures loaded:', captures.length);

let created = 0, skipped = 0;
for (const cap of captures) {
  const text = cap.text;
  const id = (cap.url.match(/scorecard\/(\d+)/) || [])[1];
  const info = matchInfo(cap);
  const blocks = inningsBlocks(text);
  if (!blocks.length) { console.log('NO-INNINGS', id); skipped++; continue; }

  const teamA = getTeam(blocks[0].fullTeam || blocks[0].team);
  const teamB = getTeam(blocks.find((b) => norm(b.fullTeam || b.team) !== norm(teamA.name))?.fullTeam || blocks.find((b) => norm(b.fullTeam || b.team) !== norm(teamA.name))?.team || '');
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
