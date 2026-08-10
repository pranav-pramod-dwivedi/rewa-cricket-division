#!/usr/bin/env node
// Fetch official career stats (Batting/Bowling Career Summary tables) from
// Cricbuzz mobile profiles for players with a harvested profile id, stored as
// player.stats = { batting: {formats, rows}, bowling: {...} }.
// Fallback (no stats / no profile): build.mjs computes from match data.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'data');
const db = JSON.parse(readFileSync(join(DATA, 'records.json'), 'utf8'));
const name2id = new Map(JSON.parse(readFileSync('/tmp/name2slug.json', 'utf8')));
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function extractTable(html, title) {
  const i = html.indexOf(title);
  if (i < 0) return null;
  const seg = html.slice(i, i + 40000);
  const ti = seg.indexOf('<table');
  if (ti < 0) return null;
  const table = seg.slice(ti);
  const end = table.indexOf('</table>');
  if (end < 0) return null;
  const body = table.slice(0, end);
  const trs = [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
  const rows = trs
    .map((tr) => [...tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((x) => x[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()))
    .filter((r) => r.length);
  return rows.length ? rows : null;
}

function toStats(rows) {
  if (!rows || rows.length < 2) return null;
  const formats = rows[0].slice(1).map((f) => (f === 'List A' || f === 'ListA' ? 'List A' : f));
  const rowMap = {};
  for (const r of rows.slice(1)) {
    if (r.length >= 1 + formats.length) rowMap[r[0]] = r.slice(1, 1 + formats.length);
  }
  if (!Object.keys(rowMap).length) return null;
  return { formats, rows: rowMap };
}

async function fetchProfile(id) {
  const url = `https://m.cricbuzz.com/profiles/${id}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html' } });
  if (!res.ok) return null;
  const html = await res.text();
  const batting = toStats(extractTable(html, 'Batting Career Summary'));
  const bowling = toStats(extractTable(html, 'Bowling Career Summary'));
  if (!batting && !bowling) return null;
  const stats = {};
  if (batting) stats.batting = batting;
  if (bowling) stats.bowling = bowling;
  return stats;
}

const players = db.players.filter((p) => p.teamId);
let fetched = 0, empty = 0, noId = 0;
for (const p of players) {
  const id = name2id.get(norm(p.name)) || name2id.get(p.slug);
  if (!id) { noId++; continue; }
  try {
    const stats = await fetchProfile(id);
    if (stats) { p.stats = stats; fetched++; }
    else { p.stats = {}; empty++; }
  } catch { p.stats = {}; empty++; }
  await new Promise((r) => setTimeout(r, 500));
}
console.log(`stats fetched: ${fetched}, empty: ${empty}, no profile id: ${noId}`);
writeFileSync(join(DATA, 'records.json'), JSON.stringify(db, null, 2));
console.log('saved.');
