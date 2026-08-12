import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const f = join(ROOT, 'data/pranav.career.csv');
const lines = readFileSync(f, 'utf8').trim().split('\n');
const hdr = lines[0];
const rows = lines.slice(1).map((l) => l.split(','));

// Helper to normalize overs to valid base-6 cricket overs (fractional part 0-5)
function normalizeOvers(ovStr) {
  if (!ovStr || ovStr === '-' || ovStr === 'DNB' || ovStr === '0' || ovStr === '0.0') return '0';
  const parts = String(ovStr).split('.');
  const overs = parseInt(parts[0], 10) || 0;
  const balls = parseInt(parts[1], 10) || 0;
  const totalBalls = overs * 6 + balls;
  const finalOvers = Math.floor(totalBalls / 6);
  const finalBalls = totalBalls % 6;
  return finalBalls === 0 ? `${finalOvers}` : `${finalOvers}.${finalBalls}`;
}

// Process rows
for (const r of rows) {
  // r[9] is overs O
  if (r[9] && r[9] !== '-' && r[9] !== 'DNB') {
    r[9] = normalizeOvers(r[9]);
  }
  // ensure wickets r[12] is valid (non-negative)
  if (r[12] === '-' || r[12] === '' || r[12] === 'DNB') {
    r[12] = '0';
  } else {
    const w = parseInt(r[12], 10);
    if (isNaN(w) || w < 0) r[12] = '0';
  }
}

writeFileSync(f, [hdr, ...rows.map((r) => r.join(','))].join('\n') + '\n');
console.log('Successfully fixed Pranav career CSV overs and wickets.');
