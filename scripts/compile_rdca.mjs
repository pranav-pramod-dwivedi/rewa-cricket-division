#!/usr/bin/env node
// Compile CricHeroes RDCA scorecards (tab/blank-line format) into records.json.
// Handles multi-day (4 innings: team A 1st/2nd, team B 1st/2nd) and OD (2 innings).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'data');
const db = JSON.parse(readFileSync(join(DATA, 'records.json'), 'utf8'));
const caps = JSON.parse(readFileSync('/tmp/sc_full.json', 'utf8'));

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

// Split full capture text into innings blocks.
// Innings header: "TEAM NAME\n\n(47.1 Ov)" then "Batters\t\tR\tB..." table.
function inningsBlocks(text) {
  const blocks = [];
  // each innings starts after a team-name line followed by blank line then "(X.X Ov)"
  const re = /([A-Z][A-Za-z0-9 .&()'-]+?)\n\n\(([\d.]+) Ov\)\nBatters/g;
  let m;
  while ((m = re.exec(text))) {
    const bodyStart = m.index + m[0].length;
    const rest = text.slice(bodyStart);
    // next innings header or "Commentary/Analysis/Heroes" nav or end
    const end = rest.search(/\n\n[A-Z][A-Za-z0-9 .&()'-]+?\n\n\([\d.]+ Ov\)\nBatters|Commentary\nAnalysis|Summary\nScorecard|Live scores/);
    const body = rest.slice(0, end < 0 ? 40000 : end);
    blocks.push({ team: m[1].trim(), overs: parseFloat(m[2]), body });
  }
  return blocks;
}

// Batters table rows: each line = name\tdismissal\t\tR\tB\t4s\t6s\tSR\tMin
function battingRows(body) {
  const rows = [];
  for (const line of body.split('\n')) {
    const cols = line.split('\t').map((s) => s.trim());
    if (cols.length < 7) continue;
    const name = cols[0];
    if (!name || /^(Extras|Yet to Bat|Fall Of Wickets|Fall of Wickets|Bowlers?$|Did not Bat|Total|Powerplays|Partnerships)/.test(name)) continue;
    const R = parseInt(cols[3], 10);
    if (isNaN(R)) continue;
    rows.push({ name, dismissal: cols[1] || '', runs: R, balls: parseInt(cols[4], 10) || null, fours: parseInt(cols[5], 10) || 0, sixes: parseInt(cols[6], 10) || 0, strikeRate: parseFloat(cols[7]) || null });
  }
  return rows;
}

// Bowlers table rows: each line = name\tO\tM\tR(empty in CH)\tW\t0s\t4s\t6s\tWD\tNB\tEco
function bowlingRows(body) {
  const rows = [];
  for (const line of body.split('\n')) {
    const cols = line.split('\t').map((s) => s.trim());
    if (cols.length < 5) continue;
    const name = cols[0];
    if (!name || /^(Fall Of Wickets|Fall of Wickets|Powerplays|Partnerships|INFO|Batters?$|Extras|Yet to Bat|Total)/.test(name)) continue;
    const O = parseFloat(cols[1]);
    const M = parseFloat(cols[2]);
    const W = parseFloat(cols[4]);
    if (isNaN(O) || isNaN(W)) continue;
    const eco = parseFloat(cols[10]);
    let R = parseFloat(cols[3]);
    if (isNaN(R) && !isNaN(eco) && !isNaN(O)) R = Math.round(eco * oversToBalls(O) / 6);
    rows.push({ name, overs: O, maidens: isNaN(M) ? 0 : M, runs: isNaN(R) ? null : R, wickets: W, economy: isNaN(eco) ? null : eco });
  }
  return rows;
}
function oversToBalls(o) { const whole = Math.floor(o); const frac = Math.round((o - whole) * 10); return whole * 6 + Math.min(frac, 5); }

// map cricheroes scorecard id -> existing match id (from rdca_matches.json style URL)
const urlToMatch = new Map();
for (const m of db.matches) urlToMatch.set(m.slug, m);

let fixed = 0, skipped = 0;
for (const c of caps) {
  const url = c.url || c.href || '';
  const idM = url.match(/scorecard\/(\d+)\//);
  if (!idM) { skipped++; continue; }
  const text = c.text || c.content || '';
  const blocks = inningsBlocks(text);
  if (!blocks.length) { console.log('NO-INNINGS', idM[1], url.split('/')[4] || url); skipped++; continue; }

  // find the match: URL's teamA-vs-teamB segment must match the match's actual team names
  const vsSlug = (url.split('/scorecard/')[1] || '').split('/')[2] || '';
  const vsTeams = vsSlug.split('-vs-').map((s) => slugify(s)); // e.g. ['u23-singrauli','u23-sidhi']
  let match = null;
  if (vsTeams.length === 2) {
    const withTeam = (m) => {
      const ta = slugify(db.teams.find((t) => t.id === m.teamAId)?.slug || '');
      const tb = slugify(db.teams.find((t) => t.id === m.teamBId)?.slug || '');
      return { ta, tb };
    };
    const fuzzyEq = (a, b) => a === b || (a.length > 3 && b.length > 3 && (a.startsWith(b.slice(0, 3)) || b.startsWith(a.slice(0, 3))));
    const cands = db.matches.filter((m) => {
      const { ta, tb } = withTeam(m);
      return (fuzzyEq(ta, vsTeams[0]) && fuzzyEq(tb, vsTeams[1])) || (fuzzyEq(ta, vsTeams[1]) && fuzzyEq(tb, vsTeams[0]));
    });
    if (cands.length === 1) match = cands[0];
    else if (cands.length > 1) {
      // prefer exact order match
      match = cands.find((m) => {
        const { ta, tb } = withTeam(m);
        return ta === vsTeams[0] && tb === vsTeams[1];
      }) || cands[0];
    }
  }
  // fallback: match by teams (norm + fuzzy prefix)
  if (!match) {
    const teamNames = blocks.map((b) => b.team);
    const teamMatches = (n) => {
      const k = norm(n);
      const mk = (x) => norm(x);
      return (t) => mk(t) === k || (k.length > 4 && mk(t).startsWith(k.slice(0, 4)));
    };
    match = db.matches.find((m) => {
      const ta = db.teams.find((t) => t.id === m.teamAId)?.name || '';
      const tb = db.teams.find((t) => t.id === m.teamBId)?.name || '';
      return teamNames.some((n) => teamMatches(n)(ta)) && teamNames.some((n) => teamMatches(n)(tb));
    });
  }
  if (!match) { console.log('NO-MATCH', idM[1], vsSlug, '| teams:', blocks.map((b) => b.team).join(' vs ')); skipped++; continue; }

  // add innings (dedupe by team + runs + overs) — backfill batting/bowling into existing innings too
  const existing = db.innings.filter((i) => i.matchId === match.id);
  let added = 0;
  for (const blk of blocks) {
    const team = getTeam(blk.team);
    let inn = existing.find((i) => i.teamId === team.id && Math.abs(i.overs - blk.overs) < 0.01);
    if (!inn) {
      const order = db.innings.filter((i) => i.matchId === match.id).length + 1;
      const totalM = blk.body.match(/Total\s*(\d+)\s*[-/]\s*(\d+)/i) || blk.body.match(/Total\s*(\d+)-(\d+)/i) || blk.body.match(/All Out\s*(\d+)/i);
      inn = { id: `inn-${match.id}-r-${db.innings.length + 1}`, matchId: match.id, teamId: team.id, battingOrder: order, runs: totalM ? parseInt(totalM[1], 10) : null, wickets: totalM ? parseInt(totalM[2] || '10', 10) : null, overs: blk.overs };
      db.innings.push(inn);
      existing.push(inn);
      added++;
    }
    const batters = battingRows(blk.body);
    for (const b of batters) {
      const p = getPlayer(b.name, team.id, 'Player');
      if (db.batting.some((x) => x.inningsId === inn.id && x.playerId === p.id)) continue;
      db.batting.push({ id: `b-${db.batting.length + 1}`, inningsId: inn.id, playerId: p.id, runs: b.runs, balls: b.balls, fours: b.fours, sixes: b.sixes, dismissal: b.dismissal, notOut: /not out/i.test(b.dismissal), strikeRate: b.strikeRate });
    }
    const oppTeamId = team.id === match.teamAId ? match.teamBId : match.teamAId;
    const bowlers = bowlingRows(blk.body);
    for (const bw of bowlers) {
      const p = getPlayer(bw.name, oppTeamId, 'Player');
      if (db.bowling.some((x) => x.inningsId === inn.id && x.playerId === p.id)) continue;
      db.bowling.push({ id: `w-${db.bowling.length + 1}`, inningsId: inn.id, playerId: p.id, overs: bw.overs, maidens: bw.maidens, runs: bw.runs, wickets: bw.wickets, economy: bw.economy });
    }
    if (batters.length || bowlers.length) added += 0; // backfill counts as progress
  }
  if (added) { fixed++; console.log('FIXED', idM[1], '|', match.slug.slice(0, 50), '| +' + added + ' innings (' + blocks.map((b) => b.team + ' ' + b.overs + 'ov').join(', ') + ')'); }
  else console.log('NO-ADD', idM[1], match.slug.slice(0, 50));
}

const seen = new Set();
db.players = db.players.filter((p) => (seen.has(p.slug) ? false : seen.add(p.slug)));
writeFileSync(join(DATA, 'records.json'), JSON.stringify(db, null, 2));
console.log(`RDCA COMPILED: fixed=${fixed} skipped=${skipped} matches=${db.matches.length} players=${db.players.length} innings=${db.innings.length} batting=${db.batting.length} bowling=${db.bowling.length}`);
