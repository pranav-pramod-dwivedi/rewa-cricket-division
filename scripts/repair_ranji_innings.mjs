#!/usr/bin/env node
// Repair Ranji innings team attribution. compile_ranji.mjs had a parser bug
// (team: m[2] = innings number, and short-vs-full name comparison) so every
// Ranji innings was tagged with teamB. Match notes preserve the original
// scorecard text, so we re-parse and fix innings.teamId + player.teamId.
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

function inningsBlocks(text) {
  const blocks = [];
  const re = /([A-Z][A-Za-z .'-]+?) (\d+)(?:st|nd|rd|th) Innings\n([A-Z][A-Za-z .'-]+?) \d+(?:st|nd|rd|th) Innings\n(\d{1,4})-(\d{1,2})\s*(d)?\s*\n[\s\S]{0,120}?\(([\d.]+) Ov\)[\s\S]{0,120}?\nBatter\nR\nB\n4s\n6s\nSR/g;
  let m;
  while ((m = re.exec(text))) {
    const bodyStart = m.index + m[0].length;
    const rest = text.slice(bodyStart);
    const end = rest.search(/(?=[A-Z][A-Za-z .'-]+? \d+(?:st|nd|rd|th) Innings\n[A-Z][A-Za-z .'-]+? \d+(?:st|nd|rd|th) Innings\n\d{1,4}-\d{1,2})|(?=INFOMatch)/);
    const body = rest.slice(0, end < 0 ? 40000 : end);
    blocks.push({ team: m[1].trim(), fullTeam: m[3].trim(), runs: parseInt(m[4], 10), wickets: parseInt(m[5], 10), declared: !!m[6], overs: parseFloat(m[7]), body });
  }
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

const ranji = db.matches.filter((m) => m.tournamentId.startsWith('t-ranji'));
console.log('Ranji matches:', ranji.length);
let fixedInn = 0, fixedMatches = 0, noParse = 0;
for (const m of ranji) {
  const inns = db.innings.filter((i) => i.matchId === m.id).sort((a, b) => a.battingOrder - b.battingOrder);
  if (!inns.length) continue;
  const blocks = inningsBlocks(m.notes || '');
  if (!blocks.length) { noParse++; console.log('NOPARSE', m.slug); continue; }
  let changed = false;
  for (let i = 0; i < inns.length && i < blocks.length; i++) {
    const t = getTeam(blocks[i].fullTeam);
    if (inns[i].teamId !== t.id) { inns[i].teamId = t.id; fixedInn++; changed = true; }
    // also correct declared flag if we know it
    if (blocks[i].declared) inns[i].declared = true;
  }
  if (changed) fixedMatches++;
}
console.log(`innings fixed: ${fixedInn} across ${fixedMatches} matches, unparsed: ${noParse}`);

// Recompute player.teamId = most common team from their cards (batting = innings team, bowling = opposite)
const innById = new Map(db.innings.map((i) => [i.id, i]));
const matchById = new Map(db.matches.map((x) => [x.id, x]));
const tally = new Map(); // playerId -> Map(teamId -> count)
for (const b of db.batting) {
  const inn = innById.get(b.inningsId);
  if (!inn) continue;
  if (!tally.has(b.playerId)) tally.set(b.playerId, new Map());
  const t = tally.get(b.playerId);
  t.set(inn.teamId, (t.get(inn.teamId) || 0) + 1);
}
for (const w of db.bowling) {
  const inn = innById.get(w.inningsId);
  const m = inn && matchById.get(inn.matchId);
  if (!m) continue;
  const opp = m.teamAId === inn.teamId ? m.teamBId : m.teamAId;
  if (!tally.has(w.playerId)) tally.set(w.playerId, new Map());
  const t = tally.get(w.playerId);
  t.set(opp, (t.get(opp) || 0) + 1);
}
let fixedPlayers = 0;
for (const p of db.players) {
  const t = tally.get(p.id);
  if (!t) continue;
  let best = null, bestN = 0;
  for (const [tid, n] of t) if (n > bestN) { best = tid; bestN = n; }
  if (best && best !== p.teamId) { p.teamId = best; fixedPlayers++; }
}
console.log(`player primary teams fixed: ${fixedPlayers}`);

writeFileSync(join(DATA, 'records.json'), JSON.stringify(db, null, 2));
console.log('saved. matches:', db.matches.length, 'innings:', db.innings.length, 'players:', db.players.length);
