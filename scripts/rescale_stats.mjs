// Rescale data/pranav.career.csv to exact target totals & averages.
// Batting: Test 739 (avg 82.11, 9 dis), ODI 883 (avg 73.58, 12 dis), T20 1359 (avg 52.27, 26 dis)
// Bowling: Test 29w avg 14.03 eco 2.17; ODI 47w avg 11.64 eco 5.21; T20 41w avg 11.66 eco 5.63
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const f = join(ROOT, 'data/pranav.career.csv');
const lines = readFileSync(f, 'utf8').trim().split('\n');
const hdr = lines[0].split(',');
const rows = lines.slice(1).map((l) => l.split(','));

const TARGET = {
  Test: { runs: 739, notOuts: 1, w: 29, bavg: 14.03, eco: 2.17 },
  ODI: { runs: 883, notOuts: 3, w: 47, bavg: 11.64, eco: 5.21 },
  T20: { runs: 1359, notOuts: 0, w: 41, bavg: 11.66, eco: 5.63 },
};
// cols: 0 seq 1 date 2 match 3 format 4 R 5 B 6 4s 7 6s 8 dis 9 O 10 M 11 RW 12 W 13 note

const byFmt = {};
for (const r of rows) (byFmt[r[3]] = byFmt[r[3]] || []).push(r);

for (const fmt of Object.keys(TARGET)) {
  const t = TARGET[fmt];
  const group = byFmt[fmt]; if (!group || !group.length) continue;
  // ---- batting sum rescale (proportional, exact sum, integer) ----
  const curSum = group.reduce((s, r) => s + (r[4] === 'DNB' ? 0 : +r[4] || 0), 0);
  const factor = t.runs / (curSum || 1);
  let acc = 0, raw = group.map((r) => (r[4] === 'DNB' ? 0 : (r[4] === '' ? 0 : +r[4]))).map((v) => v * factor);
  for (let i = 0; i < group.length; i++) {
    group[i][4] = i === group.length - 1 ? String(t.runs - acc) : String(Math.max(0, Math.round(raw[i])));
    acc += +group[i][4];
    // balls proportional
    const bF = group[i][4] / (+group[i][5] || 1) / (raw[i] / Math.max(1, +group[i][5])) || 1;
    let nb;
    if (fmt === 'Test') nb = Math.round((+group[i][4]) * 1.55);
    else if (fmt === 'ODI') nb = Math.round((+group[i][4]) * 1.18);
    else nb = Math.round((+group[i][4]) / 0.68);
    group[i][5] = String(Math.max((+group[i][4]) > 0 ? 1 : 0, nb));
  }
  // ---- not-out distribution (first t.notOuts HIGHEST scores are not out) ----
  const NOwanted = t.notOuts;
  const idx = group.map((_, i) => i).sort((a, b) => (+group[b][4] || 0) - (+group[a][4] || 0));
  for (const r of group) if (r[8] === 'not out') r[8] = 'b Vora';
  idx.slice(0, NOwanted).forEach((i) => { group[i][8] = 'not out'; });
  // ---- bowling ----
  const curW = group.reduce((s, r) => s + (+r[12] || 0), 0);
  const wr = t.w / (curW || 1);
  let wombat = group.map((r) => +r[12] || 0).map((v) => v * wr);
  let wacc = 0;
  for (let i = 0; i < group.length; i++) {
    group[i][12] = i === group.length - 1 ? String(t.w - wacc) : String(Math.max(0, Math.round(wombat[i])));
    wacc += +group[i][12];
  }
  // runs conceded = avg * wickets ; overs = runs/eco
  const br = Math.round(t.bavg * t.w);
  const overs = +(br / t.eco).toFixed(1);
  const curBr = group.reduce((s, r) => s + (+r[11] || 0), 0);
  const bf = br / (curBr || 1);
  let bacc = 0, braw = group.map((r) => +r[11] || 0).map((v) => v * bf);
  for (let i = 0; i < group.length; i++) {
    if (+group[i][12] === 0 && i !== group.length - 1) { group[i][11] = '0'; group[i][9] = '0'; group[i][10] = '0'; continue; }
    group[i][11] = i === group.length - 1 ? String(Math.max(0, br - bacc)) : String(Math.max(0, Math.round(braw[i])));
    bacc += +group[i][11];
  }
  const curO = group.reduce((s, r) => s + (+r[9] || 0), 0);
  const of = curO ? overs / curO : 0;
  for (const r of group) { if (+r[12] > 0 || +r[11] > 0) r[9] = String(Math.max(1, Math.round((+r[9] || 1) * of * 10) / 10)); }
}

writeFileSync(f, [hdr.join(','), ...rows.map((r) => r.join(','))].join('\n') + '\n');

// verify
const v = {};
for (const r of rows) {
  const g = (v[r[3]] = v[r[3]] || { runs: 0, dis: 0, w: 0, br: 0, ov: 0 });
  if (r[4] !== 'DNB') g.runs += +r[4];
  if (r[8] !== 'not out') g.dis++;
  g.w += +r[12] || 0; g.br += +r[11] || 0; g.ov += +r[9] || 0;
}
for (const fmt of Object.keys(v)) {
  const g = v[fmt], t = TARGET[fmt];
  console.log(fmt, { runs: g.runs, avg: (g.runs / g.dis).toFixed(2), wkts: g.w, bavg: (g.br / g.w).toFixed(2), eco: (g.br / g.ov).toFixed(2), overs: g.ov });
}