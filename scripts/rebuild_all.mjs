#!/usr/bin/env node
// MASTER REBUILD: start from clean precompile (RDCA core), re-apply all compilers with FIXED parsers.
// Order: 1) precompile base (RDCA 27 matches, clean) -> 2) compile_rdca (backfill RDCA innings, fixed cols)
//         3) compile_mpl2025 (5 MPL 2025 matches, newline format) -> 4) compile_all on community vacuums (fixed cols)
import { execSync } from 'node:child_process';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'data');
const records = join(DATA, 'records.json');

// Step 0: backup current
execSync(`cp ${records} /tmp/records_CURRENT_before_rebuild.json`, { stdio: 'inherit' });

// Step 1: restore clean precompile base
copyFileSync('/tmp/records.precompile.json', records);
console.log('STEP 1: base = records.precompile.json (clean RDCA core)');
let db = JSON.parse(readFileSync(records, 'utf8'));

// Step 2: fix the single crazy-SR entry in precompile (validate columns manually)
// find & show it
const crazy = db.batting.filter((b) => b.runs > 0 && b.balls > 0 && b.runs / b.balls > 6);
console.log('precompile crazy SR entries:', crazy.length);
if (crazy.length) {
  const pn = new Map(db.players.map((p) => [p.id, p.name]));
  for (const c of crazy) console.log('  ', pn.get(c.playerId), c.runs, 'off', c.balls, '4s:', c.fours, '6s:', c.sixes, 'sr:', c.strikeRate);
}

// Step 3: compile_rdca backfill
console.log('\nSTEP 3: compile_rdca (fixed parser)...');
execSync('node scripts/compile_rdca.mjs', { cwd: ROOT, stdio: 'inherit' });

// Step 4: compile_mpl2025
console.log('\nSTEP 4: compile_mpl2025...');
execSync('node scripts/compile_mpl2025.mjs', { cwd: ROOT, stdio: 'inherit' });

// Step 5: compile_all on community vacuums (fixed parser)
console.log('\nSTEP 5: compile_all community (vacuum_full + vacuum_batch2)...');
execSync('node scripts/compile_all.mjs /tmp/vacuum_full.jsonl', { cwd: ROOT, stdio: 'inherit' });
execSync('node scripts/compile_all.mjs /tmp/vacuum_batch2.jsonl', { cwd: ROOT, stdio: 'inherit' });

// Step 6: dedupe pass (drop duplicate innings, merge batting/bowling)
console.log('\nSTEP 6: dedupe pass...');
db = JSON.parse(readFileSync(records, 'utf8'));
const battByInn = {};
for (const b of db.batting) battByInn[b.inningsId] = (battByInn[b.inningsId] || 0) + 1;
const dropInn = new Set();
const innByMatch = {};
for (const i of db.innings) (innByMatch[i.matchId] = innByMatch[i.matchId] || []).push(i);
for (const [mid, inns] of Object.entries(innByMatch)) {
  const groups = {};
  for (const i of inns) { const key = i.teamId + '|' + (i.overs == null ? 'null' : Math.round(i.overs * 10) / 10); (groups[key] = groups[key] || []).push(i); }
  for (const g of Object.values(groups)) {
    if (g.length <= 1) continue;
    g.sort((a, b) => (battByInn[b.id] || 0) - (battByInn[a.id] || 0));
    const keeper = g[0];
    for (const dup of g.slice(1)) {
      for (const b of db.batting) if (b.inningsId === dup.id) { if (!db.batting.some((x) => x.inningsId === keeper.id && x.playerId === b.playerId)) db.batting.push({ ...b, id: 'b-' + db.batting.length + 1, inningsId: keeper.id }); }
      for (const b of db.bowling) if (b.inningsId === dup.id) { if (!db.bowling.some((x) => x.inningsId === keeper.id && x.playerId === b.playerId)) db.bowling.push({ ...b, id: 'w-' + db.bowling.length + 1, inningsId: keeper.id }); }
      dropInn.add(dup.id);
    }
  }
}
db.innings = db.innings.filter((i) => !dropInn.has(i.id));
db.batting = db.batting.filter((b) => !dropInn.has(b.inningsId));
db.bowling = db.bowling.filter((b) => !dropInn.has(b.inningsId));

// Step 7: drop junk players + orphan innings
const junk = ['Your work, safely backed up.', 'Help protect your work with 100GB cloud storage, available in a licensed Adobe Creative Cloud plan.', 'Adobe Creative Cloud', '|', 'Sponsored'];
const junkIds = new Set(db.players.filter((p) => junk.includes(p.name)).map((p) => p.id));
db.players = db.players.filter((p) => !junkIds.has(p.id));
const matchIds = new Set(db.matches.map((m) => m.id));
const orphanIds = new Set(db.innings.filter((i) => !matchIds.has(i.matchId)).map((i) => i.id));
db.innings = db.innings.filter((i) => !orphanIds.has(i.id));
db.batting = db.batting.filter((b) => !orphanIds.has(b.inningsId));
db.bowling = db.bowling.filter((b) => !orphanIds.has(b.inningsId));

// Step 8: fix MPL 2026 dates + dedupe tournaments + dedupe matches (shells)
const DATES = { '120812': '2025-06-17', '120916': '2025-06-23', '160383': '2026-06-06', '160427': '2026-06-07', '160471': '2026-06-10', '160537': '2026-06-12', '160592': '2026-06-13', '160625': '2026-06-15', '160651': '2026-06-16', '160755': '2026-06-22', '160777': '2026-06-23', '160810': '2026-06-25' };
const ID_MAP = { '160383': 'bundelkhand-bulls-vs-rewa-jaguars-6th-match-2026', '160427': 'rewa-jaguars-vs-bhopal-leopards-10th-match-2026', '160471': 'rewa-jaguars-vs-indore-pink-panthers-14th-match-2026', '160537': 'rewa-jaguars-vs-royal-nimar-eagles-20th-match-2026', '160592': 'rewa-jaguars-vs-ujjain-falcons-25th-match-2026', '160625': 'rewa-jaguars-vs-gwalior-cheetahs-28th-match-2026', '160651': 'rewa-jaguars-vs-jabalpur-royal-lions-31st-match-2026', '160755': 'rewa-jaguars-vs-malwa-stallions-41st-match-2026', '160777': 'chambal-ghariyals-vs-rewa-jaguars-43rd-match-2026', '160810': 'rewa-jaguars-vs-royal-nimar-eagles-1st-semi-final-2026', '120916': 'rewa-jaguars-vs-bhopal-leopards-1st-semi-final-2025', '120812': 'rewa-jaguars-vs-bhopal-leopards-11th-match-2025' };
for (const m of db.matches) {
  const d = DATES[Object.keys(ID_MAP).find((k) => ID_MAP[k] === m.slug)];
  if (d && !m.matchDate) m.matchDate = d;
}
// tournament dedupe (keep richer)
const tseen = new Map();
for (const t of db.tournaments) { const prev = tseen.get(t.id); if (!prev || (t.name || '').length > (prev.name || '').length) tseen.set(t.id, t); }
db.tournaments = [...tseen.values()];
// match dedupe: same teams+date, keep the one with innings
const innByMatch2 = {};
for (const i of db.innings) innByMatch2[i.matchId] = (innByMatch2[i.matchId] || 0) + 1;
const seen = new Map();
const drop = new Set();
for (const m of db.matches) {
  const k = m.teamAId + '|' + m.teamBId + '|' + (m.matchDate || '');
  if (seen.has(k)) {
    const prev = seen.get(k);
    const pI = innByMatch2[prev.id] || 0, cI = innByMatch2[m.id] || 0;
    if (cI > pI) { drop.add(prev.id); seen.set(k, m); } else drop.add(m.id);
  } else seen.set(k, m);
}
db.matches = db.matches.filter((m) => !drop.has(m.id));
// remove innings of dropped matches
const alive = new Set(db.matches.map((m) => m.id));
const deadInn = new Set(db.innings.filter((i) => !alive.has(i.matchId)).map((i) => i.id));
db.innings = db.innings.filter((i) => !deadInn.has(i.id));
db.batting = db.batting.filter((b) => !deadInn.has(b.inningsId));
db.bowling = db.bowling.filter((b) => !deadInn.has(b.inningsId));
// fix 11th match 2025 rain result
const m11 = db.matches.find((m) => m.id === 'm-rewa-jaguars-vs-bhopal-leopards-11th-match-2025');
if (m11 && !/no result/i.test(m11.resultText || '')) m11.resultText = 'No result due to rain';

writeFileSync(records, JSON.stringify(db, null, 2));
console.log('\nREBUILD COMPLETE:');
console.log('matches:', db.matches.length, '| players:', db.players.length, '| innings:', db.innings.length, '| batting:', db.batting.length, '| bowling:', db.bowling.length, '| tournaments:', db.tournaments.length);
