#!/usr/bin/env node
// Fetch official career stats (Batting/Bowling Career Summary) from Cricbuzz
// mobile profiles for players with a harvested profile id, then store as
// player.stats {batting:{Test:{...},ODI:...}, bowling:{...}}.
// Fallback (no stats available): build.mjs computes from match data.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'data');
const db = JSON.parse(readFileSync(join(DATA, 'records.json'), 'utf8'));
const name2id = new Map(JSON.parse(readFileSync('/tmp/name2slug.json', 'utf8')));
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// tokens after stripping tags: "Batting Career Summary Test ODI T20 IPL Matches 3 1 0 57 Innings ..."
function parseSummary(text, title, rowLabels) {
  const i = text.indexOf(title);
  if (i < 0) return null;
  const rest = text.slice(i + title.length).trim();
  const toks = rest.split(/\s+/).slice(0, 400);
  // format headers: consecutive known labels at start (Test ODI T20 IPL / FC ListA ...)
  const known = new Set(['Test', 'ODI', 'T20', 'IPL', 'FC', 'List A', 'ListA', 'T20s', 'First-class']);
  const fmts = [];
  let j = 0;
  while (j < toks.length && (known.has(toks[j]) || toks[j] === 'List')) {
    if (toks[j] === 'List' && toks[j + 1] === 'A') { fmts.push('List A'); j += 2; continue; }
    fmts.push(toks[j]); j++;
  }
  if (!fmts.length) return null;
  const n = fmts.length;
  const out = { formats: fmts, rows: {} };
  // now label + n values pairs
  const labelIdx = new Map(rowLabels.map((l, idx) => [l, idx]));
  while (j < toks.length) {
    const lab = toks[j];
    if (labelIdx.has(lab)) {
      const vals = toks.slice(j + 1, j + 1 + n);
      if (vals.length === n && vals.every((v) => v !== undefined)) {
        out.rows[lab] = vals;
        j += 1 + n;
        continue;
      }
    }
    j++;
  }
  return out;
}

const BAT_LABELS = ['Matches', 'Innings', 'Runs', 'Balls', 'Highest', 'Average', 'SR', 'Not Out', 'Fours', 'Sixes', 'Ducks', '50s', '100s', '200s', '300s', '400s'];
const BOWL_LABELS = ['Matches', 'Innings', 'Balls', 'Runs', 'Maidens', 'Wickets', 'Avg', 'Eco', 'SR', 'BBI', 'BBM', '4w', '5w', '10w'];

async function fetchProfile(id) {
  const url = `https://m.cricbuzz.com/profiles/${id}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html' } });
  if (!res.ok) return null;
  const html = await res.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/\n{2,}/g, '\n')
    .replace(/\n/g, ' ')
    .trim();
  const batting = parseSummary(text, 'Batting Career Summary', BAT_LABELS);
  const bowling = parseSummary(text, 'Bowling Career Summary', BOWL_LABELS);
  if (!batting && !bowling) return null;
  const stats = {};
  if (batting) stats.batting = batting;
  if (bowling) stats.bowling = bowling;
  return stats;
}

const players = db.players.filter((p) => p.teamId);
let fetched = 0, matched = 0, noId = 0;
for (const p of players) {
  const id = name2id.get(norm(p.name)) || name2id.get(p.slug);
  if (!id) { noId++; continue; }
  try {
    const stats = await fetchProfile(id);
    if (stats) { p.stats = stats; fetched++; }
    else { p.stats = {}; matched++; }
  } catch { p.stats = {}; matched++; }
  await new Promise((r) => setTimeout(r, 500));
}
console.log(`profiles matched: ${matched + fetched}, stats fetched: ${fetched}, no profile id: ${noId}`);
writeFileSync(join(DATA, 'records.json'), JSON.stringify(db, null, 2));
console.log('saved.');
