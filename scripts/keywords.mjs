#!/usr/bin/env node
// ============================================================
// Rewa Cricket Division — keyword research & keyword→page map.
//
// Sources (free, no auth):
//   1. Google Autocomplete (suggestqueries.google.com) — real user queries
//   2. Google Trends API — relative search interest (geo=IN)
//
// Strategy: long-tail, low-competition keywords only. The archive's
// entity pages (players/teams/tournaments/matches) each target their own
// intent family. Output: data/seo-keyword-map.json + console summary.
// ============================================================
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const db = JSON.parse(readFileSync(join(ROOT, 'data', 'records.json'), 'utf8'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

async function suggest(seed) {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=en&q=${encodeURIComponent(seed)}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.[1]) ? json[1] : [];
  } catch {
    return [];
  }
}

// Trends relative interest 0-100 per keyword (geo=IN, 12 months). null = no data.
async function trendsInterest(keywords) {
  const req = {
    comparisonItem: keywords.map((k) => ({ keyword: k, geo: 'IN', time: 'today 12-m' })),
    category: 0,
    property: '',
  };
  const url = `https://trends.google.com/trends/api/explore?hl=en-US&tz=330&req=${encodeURIComponent(JSON.stringify(req))}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return keywords.map(() => null);
    const text = await res.text();
    const m = text.match(/^\s*\)]}'\s*(.*)$/s);
    const json = JSON.parse(m ? m[1] : text);
    const widget = json.widgets?.find((w) => w.id === 'TIMESERIES');
    if (!widget) return keywords.map(() => null);
    const data = widget.data?.timelineData ?? [];
    if (data.length < 2) return keywords.map(() => null);
    // each timeline point has one value per comparison keyword
    const n = keywords.length;
    const avgs = Array(n).fill(0);
    data.forEach((d) => {
      (d.value ?? []).forEach((v, i) => {
        if (i < n && typeof v === 'number') avgs[i] += v;
      });
    });
    return avgs.map((s) => Math.round(s / data.length));
  } catch {
    return keywords.map(() => null);
  }
}

// ---- build seeds from the archive itself ----
const matchesByTeam = new Map();
db.matches.forEach((m) => {
  [m.teamAId, m.teamBId].forEach((id) => matchesByTeam.set(id, (matchesByTeam.get(id) || 0) + 1));
});
const playersByTeam = new Map();
db.players.forEach((p) => playersByTeam.set(p.teamId, (playersByTeam.get(p.teamId) || 0) + 1));

const CORE = [
  'rewa cricket',
  'rewa cricket division',
  'rewa district cricket',
  'rewa cricket academy',
  'rewa cricket stadium',
  'rewa cricketer',
  'rewa cricket team',
  'rewa jaguars',
  'ranji trophy rewa',
  'rewa cricket match',
];

const topTeams = [...matchesByTeam.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 12)
  .map(([id]) => db.teams.find((t) => t.id === id)?.name)
  .filter(Boolean);

const topTournaments = db.tournaments
  .slice(0, 15)
  .map((t) => t.name.replace(/ \d{4}-\d{2}$/, '').replace(/ \d{4}$/, ''))
  .filter((n, i, a) => a.indexOf(n) === i);

const topPlayers = [...db.players]
  .filter((p) => playersByTeam.get(p.teamId) > 0 || db.batting.some((b) => b.playerId === p.id) || db.bowling.some((b) => b.playerId === p.id))
  .slice(0, 25)
  .map((p) => p.name);

const seeds = [...CORE, ...topTeams, ...topTournaments].filter(Boolean);

// ---- collect suggestions (rank = relative popularity proxy) ----
const suggestions = new Map(); // query -> { seed, rank }
for (const seed of seeds) {
  const sug = await suggest(seed);
  sug.forEach((s, i) => {
    if (!suggestions.has(s)) suggestions.set(s, { seed, rank: i });
  });
  await sleep(150);
}

// ---- classify & map to pages ----
const playerByName = new Map(db.players.map((p) => [p.name.toLowerCase(), p]));
const teamByName = new Map(db.teams.map((t) => [t.name.toLowerCase(), t]));
const tournByName = new Map(db.tournaments.map((t) => [t.name.toLowerCase(), t]));
const venueByName = new Map(db.venues.map((v) => [v.name.toLowerCase(), v]));

const classify = (q) => {
  const ql = q.toLowerCase();
  const p = playerByName.get(ql);
  if (p) return { family: 'player', page: `/players/${p.slug}/`, pageTitle: p.name };
  for (const [n, pl] of playerByName) if (ql.includes(n) && n.split(' ').length >= 2) return { family: 'player', page: `/players/${pl.slug}/`, pageTitle: pl.name };
  const t = teamByName.get(ql);
  if (t) return { family: 'team', page: `/teams/${t.slug}/`, pageTitle: t.name };
  for (const [n, tl] of teamByName) if (ql.includes(n) && n.split(' ').length >= 2) return { family: 'team', page: `/teams/${tl.slug}/`, pageTitle: tl.name };
  const tv = tournByName.get(ql);
  if (tv) return { family: 'tournament', page: `/tournaments/${tv.slug}/`, pageTitle: tv.name };
  for (const [n, tl] of tournByName) if (ql.includes(n) && n.split(' ').length >= 2) return { family: 'tournament', page: `/tournaments/${tl.slug}/`, pageTitle: tl.name };
  const v = venueByName.get(ql);
  if (v) return { family: 'venue', page: `/venues/${v.slug}/`, pageTitle: v.name };
  if (ql.includes('scorecard') || ql.includes('vs')) return { family: 'match', page: '/matches/', pageTitle: 'Matches' };
  if (ql.includes('archive') || ql.includes('history')) return { family: 'archive', page: '/archive/', pageTitle: 'Archive' };
  if (ql.includes('academy')) return { family: 'academy', page: '/academy/', pageTitle: 'Academy' };
  if (ql.includes('ranji') || ql.includes('trophy') || ql.includes('hazare') || ql.includes('mushtaq') || ql.includes('ipl')) return { family: 'tournament', page: '/tournaments/', pageTitle: 'Tournaments' };
  if (ql.includes('stadium') || ql.includes('ground')) return { family: 'venue', page: '/venues/', pageTitle: 'Venues' };
  if (ql.includes('division') || ql.includes('association')) return { family: 'archive', page: '/about/', pageTitle: 'About' };
  return { family: 'rewa-cricket', page: '/', pageTitle: 'Home' };
};

const entries = [...suggestions.entries()]
  .map(([q, meta]) => ({ keyword: q, source: meta.seed, suggestRank: meta.rank, ...classify(q) }))
  .filter((e) => e.page); // all map somewhere

// ---- volume check (best-effort, ONE batch of 5, heavy backoff on 429) ----
const vol = new Map();
const prio = ['rewa cricket division', 'rewa cricket academy', 'rewa cricket stadium', 'rewa cricket', 'rewa cricketer'];
for (let attempt = 0; attempt < 3; attempt++) {
  const vals = await trendsInterest(prio);
  if (vals.every((v) => v == null)) {
    console.log('  [trends] empty response — backing off 30s…');
    await sleep(30000);
    continue;
  }
  prio.forEach((k, j) => vol.set(k, vals[j]));
  break;
}
// entity-derived keywords: no Trends data = ultra-long-tail by construction

const out = entries.map((e) => ({
  ...e,
  interest: vol.get(e.keyword) ?? null, // null = no data = ultra long-tail
  lowCompetition: vol.get(e.keyword) == null || vol.get(e.keyword) < 10,
}));

const dir = join(ROOT, 'data', 'seo');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'keyword-map.json'), JSON.stringify(out, null, 2));

// ---- summary ----
const famCount = {};
out.forEach((e) => (famCount[e.family] = (famCount[e.family] || 0) + 1));
const withData = out.filter((e) => e.interest != null && e.interest < 10);
const noData = out.filter((e) => e.interest == null);
console.log(`keywords collected: ${out.length}`);
console.log('families:', JSON.stringify(famCount));
console.log(`low-interest (<10): ${withData.length}, no-data (ultra long-tail): ${noData.length}`);
console.log('low-competition keywords (the ranking targets):', out.filter((e) => e.lowCompetition).length);
console.log('\ntop 15 mapped keywords:');
out.slice(0, 15).forEach((e) => console.log(`  ${e.keyword} [${e.family}] -> ${e.page}${e.interest != null ? ` (interest ${e.interest})` : ' (no data)'} rank#${e.suggestRank + 1}`));
