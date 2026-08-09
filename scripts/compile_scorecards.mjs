#!/usr/bin/env node
// Compile vacuumed CricHeroes scorecards into data/records.json.
// Preserves FULL page text as match.notes; extracts structured innings/batting/bowling.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'data');
const SC = '/tmp/sc_full.json';

const db = JSON.parse(readFileSync(join(DATA, 'records.json'), 'utf8'));
const caps = JSON.parse(readFileSync(SC, 'utf8'));

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// aggressive normalize: strip u-/u /hyphens/space/dots, lowercase alnum
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// slug of the "teamA-vs-teamB" url segment
const vsSlug = (url) => url.split('/scorecard/')[1]?.split('/')[2] ?? '';

const matchByUrl = {};
for (const m of db.matches) {
  matchByUrl[slugify(m.slug)] = m;
}

const teamsByName = {};
for (const t of db.teams) teamsByName[slugify(t.name)] = t;

function getPlayer(name, teamId) {
  const key = slugify(name);
  let p = db.players.find((x) => slugify(x.name) === key);
  if (!p) {
    p = { id: `p-${key}`, name: name.replace(/\s*\([^)]*\)/g, '').trim(), slug: key, teamId, role: 'Player' };
    db.players.push(p);
  } else if (teamId && !p.teamId) {
    p.teamId = teamId;
  }
  return p;
}

function parseInningsScore(text) {
  // Capture blocks like "TEAM NAME\n\n(44.3 Ov)" plus the runs/wickets from text
  const score = /([A-Z0-9 .&()-]+?)\n\n\(([\d.]+) Ov\)/g;
  const inns = [];
  let m;
  while ((m = score.exec(text))) {
    const teamLabel = m[1].trim();
    const overs = parseFloat(m[2]);
    inns.push({ teamLabel, overs });
  }
  return inns;
}

function splitInnings(text) {
  // Split full text by each "TEAM\n\n(ov Ov)" occurrence; return array of {team, body}
  const re = /(^|\n)([A-Z0-9 .&()-]+?)\n\n\(([\d.]+) Ov\)/g;
  const blocks = [];
  let m, last = 0, lastTeam = null;
  const re2 = /(^|\n)([A-Z0-9 .&()-]+?)\n\n\(([\d.]+) Ov\)/g;
  let match;
  const positions = [];
  while ((match = re2.exec(text))) {
    positions.push({ idx: match.index, team: match[2].trim(), overs: match[3] });
  }
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
    if (!name || /^(Extras|Total|Did not bat)/.test(name)) continue;
    const runs = parseInt(f[3], 10);
    if (isNaN(runs)) continue;
    const sr = parseFloat(f[6]) || null;
    const dismissal = f[1] || (runs === 0 ? '—' : 'not out');
    if (/^\d+$/.test(name)) continue;
    // disambiguate the two numbers after runs: 4s/6s if plausible, else balls/4s
    let balls = 0, fours = 0, sixes = 0;
    const n1 = parseInt(f[4], 10) || 0;
    const n2 = parseInt(f[5], 10) || 0;
    if (4 * n1 + 6 * n2 <= runs) {
      fours = n1; sixes = n2;
    } else {
      balls = n1; sixes = n2;
    }
    rows.push({ name, runs, balls, fours, sixes, dismissal, strikeRate: sr });
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
    if (inBowlers && !/^\S/.test(t)) inBowlers = false;
    if (!inBowlers || !t) continue;
    if (/^Batters|^Extras|^Fall|^Yet/.test(t)) { inBowlers = false; continue; }
    const f = line.split('\t').map((x) => x.trim());
    const name = f[0];
    if (!name || name === 'Bowlers') continue;
    const overs = parseFloat(f[1]);
    if (isNaN(overs)) continue;
    const maidens = parseInt(f[2], 10) || 0;
    const runs = parseInt(f[3], 10) || 0;
    const wkts = parseInt(f[4], 10) || 0;
    const econ = parseFloat(f[10]) || (overs > 0 ? +(runs / overs).toFixed(2) : null);
    rows.push({ name, overs, maidens, runs, wickets: wkts, economy: econ });
  }
  return rows;
}

let inningsCount = db.innings.length;
let batCount = db.batting.length;
let bowlCount = db.bowling.length;

for (const cap of caps) {
  const vs = vsSlug(cap.url);
  if (!vs) continue;
  // find match by matching teamA-teamB in slug
  const match = db.matches.find((m) => {
    const tA = db.teams.find((x) => x.id === m.teamAId);
    const tB = db.teams.find((x) => x.id === m.teamBId);
    if (!tA || !tB) return false;
    return slugify(tA.slug) && slugify(tB.slug) && vs.includes(slugify(tA.slug)) && vs.includes(slugify(tB.slug));
  });
  if (!match) { console.log('NO MATCH for', vs); continue; }

  // store full page text as notes (preserve all information)
  match.notes = cap.text;

  // innings team totals from "Innings Break: TEAM - X/Y in Z overs" notes (reliable)
  const innBreak = {};
  const ibRe = /Innings Break:\s*([A-Z0-9 .&()-]+?)\s*-\s*(\d+)\/(\d+)\s*in\s*([\d.]+)/gi;
  let ib;
  while ((ib = ibRe.exec(cap.text))) {
    const key = norm(ib[1]);
    innBreak[key] = { runs: parseInt(ib[2], 10), wickets: parseInt(ib[3], 10), overs: parseFloat(ib[4]) };
  }

  // parse innings blocks
  const blocks = splitInnings(cap.text);
  for (const block of blocks) {
    const team = db.teams.find((t) => norm(t.name) === norm(block.team));
    if (!team) { console.log('  unknown team:', block.team); continue; }
    const ibD = innBreak[norm(block.team)] || {};
    const inn = { id: `inn-${match.id}-${norm(team.name).slice(0, 8)}-${db.innings.filter((x) => x.matchId === match.id).length + 1}`, matchId: match.id, teamId: team.id, battingOrder: db.innings.filter((x) => x.matchId === match.id).length + 1, runs: ibD.runs ?? null, wickets: ibD.wickets ?? null, overs: (ibD.overs ?? parseFloat(block.overs)) || null };
    db.innings.push(inn);

    const batting = parseBatting(block.body);
    const bowling = parseBowling(block.body);
    for (const b of batting) {
      const p = getPlayer(b.name, team.id);
      db.batting.push({ id: `b-${++batCount}`, inningsId: inn.id, playerId: p.id, runs: b.runs, balls: b.balls || 0, fours: b.fours || 0, sixes: b.sixes || 0, dismissal: b.dismissal, notOut: /not out/i.test(b.dismissal), strikeRate: b.strikeRate });
    }
    for (const bw of bowling) {
      const p = getPlayer(bw.name, team.id);
      db.bowling.push({ id: `w-${++bowlCount}`, inningsId: inn.id, playerId: p.id, overs: bw.overs, maidens: bw.maidens, runs: bw.runs, wickets: bw.wickets, economy: bw.economy });
    }
    inningsCount++;
  }
  console.log('processed', match.slug);
}

// dedupe players by slug, keep first
const seen = new Set();
db.players = db.players.filter((p) => (seen.has(p.slug) ? false : seen.add(p.slug)));

writeFileSync(join(DATA, 'records.json'), JSON.stringify(db, null, 2));
console.log(`DONE. matches=${db.matches.length} players=${db.players.length} innings=${db.innings.length} batting=${db.batting.length} bowling=${db.bowling.length}`);
