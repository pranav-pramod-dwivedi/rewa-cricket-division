#!/usr/bin/env node
// 1) Auto-calculate any ONE missing field among runs/balls/strikeRate.
//    SR = runs*100/balls → solve for whichever is absent.
// 2) Write hyped biography-style bios for qualifying official players
//    (2+ teams, 2+ official tournaments) from their REAL match records.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'data');
const db = JSON.parse(readFileSync(join(DATA, 'records.json'), 'utf8'));

// ---------- 1) missing-field math ----------
let calcBalls = 0, calcRuns = 0, calcSR = 0;
for (const b of db.batting) {
  const r = b.runs, bl = b.balls, sr = b.strikeRate;
  const hasR = r > 0, hasBl = bl > 0, hasSr = sr > 0;
  const present = [hasR, hasBl, hasSr].filter(Boolean).length;
  if (present < 2) continue;
  if (!hasBl && hasR && hasSr) { b.balls = Math.round((r * 100) / sr); calcBalls++; }
  else if (!hasR && hasBl && hasSr) { b.runs = Math.round((bl * sr) / 100); calcRuns++; }
  else if (!hasSr && hasR && hasBl) { b.strikeRate = Number(((r / bl) * 100).toFixed(2)); calcSR++; }
}
console.log(`auto-calc: balls=${calcBalls} runs=${calcRuns} sr=${calcSR}`);

// ---------- 2) bios for qualifying players ----------
const teams = new Map(db.teams.map((t) => [t.id, t]));
const tourneys = new Map(db.tournaments.map((t) => [t.id, t]));
const matches = new Map(db.matches.map((m) => [m.id, m]));
const innById = new Map(db.innings.map((i) => [i.id, i]));
const matchByInn = new Map(db.innings.map((i) => [i.id, matches.get(i.matchId)]));
const innMatch = new Map(db.innings.map((i) => [i.id, i.matchId]));

const stats = new Map(); // playerId -> {teams, tourneys, runs, wkts, hs, bbi, notOuts, inns}
for (const p of db.players) stats.set(p.id, { teams: new Set(), tourneys: new Set(), runs: 0, wkts: 0, hs: 0, bbi: null, hsStr: '', inns: 0 });
for (const b of db.batting) {
  const s = stats.get(b.playerId); if (!s) continue;
  const inn = innById.get(b.inningsId); if (!inn) continue;
  s.teams.add(inn.teamId);
  const m = matchByInn.get(inn.id);
  if (m) { const t = tourneys.get(m.tournamentId); if (t) s.tourneys.add(t.id); }
  s.inns++;
  s.runs += b.runs || 0;
  if ((b.runs || 0) > s.hs) { s.hs = b.runs; s.hsStr = `${b.runs}${b.notOut ? '*' : ''}`; }
}
for (const w of db.bowling) {
  const s = stats.get(w.playerId); if (!s) continue;
  const inn = innById.get(w.inningsId); if (!inn) continue;
  const m = matchByInn.get(inn.id);
  s.teams.add(m && (m.teamAId === inn.teamId ? m.teamBId : m.teamAId));
  if (m) { const t = tourneys.get(m.tournamentId); if (t) s.tourneys.add(t.id); }
  s.wkts += w.wickets || 0;
  const wl = w.wickets || 0, wr = w.runs || 0;
  if (!s.bbi || wl > s.bbi.w || (wl === s.bbi.w && wr < s.bbi.r)) s.bbi = { w: wl, r: wr };
}

const OPENERS = [
  (n) => `${n} is a name that Rewa cricket whispers about with growing reverence.`,
  (n) => `Every great cricket story has a hometown — for ${n}, that story starts in the heart of Madhya Pradesh.`,
  (n) => `When ${n} walks out to bat, something changes in the air.`,
  (n) => `They don't make cricketers like ${n} every day.`,
  (n) => `${n} has been the quiet engine of more than one famous Rewa triumph.`,
];
const BODY = [
  (t) => `A proven performer across ${t} official competitions, he has carried his form from district cricket to the state stage.`,
  (t) => `With appearances in ${t} official tournaments, his versatility has made him a fixture in dressing rooms that demand results.`,
  (t) => `From inter-district battles to the big stage, ${t} official tournaments have showcased his hunger for runs and wickets alike.`,
];
const CLOSERS = [
  (r, w) => `With ${r} runs and ${w} wickets to his name on this platform, the numbers only tell half the story — the other half is heart.`,
  (r, w) => `${r} runs, ${w} wickets, and a reputation that keeps growing. The best is still being written.`,
  (r, w) => `He has contributed ${r} runs and taken ${w} wickets in recorded Rewa cricket — and he is nowhere near finished.`,
];

let written = 0, skipped = 0;
const officialIds = new Set(db.tournaments.filter((t) => t.category === 'official').map((t) => t.id));
for (const p of db.players) {
  if (p.bio) continue; // keep existing (cricbuzz) bios
  const s = stats.get(p.id);
  if (!s || s.teams.size < 2) { skipped++; continue; }
  const offT = [...s.tourneys].filter((id) => officialIds.has(id)).length;
  if (offT < 2) { skipped++; continue; }
  const teamNames = [...s.teams].map((id) => teams.get(id)?.name).filter(Boolean);
  const offNames = [...s.tourneys].filter((id) => officialIds.has(id)).map((id) => tourneys.get(id)?.name);
  const famous = teamNames.filter((n) => /Madhya Pradesh|Jaguars|Cheetahs|Leopards|Falcons|Stallions|Panthers|Lions|Ghariyals|Bulls|Railways|India A|India B|India C|Central Zone/.test(n));
  const lead = famous.length ? famous.slice(0, 3).join(', ') : teamNames.slice(0, 3).join(', ');
  const parts = [
    OPENERS[written % OPENERS.length](p.name),
    `He has represented ${lead}${famous.length && famous.length < teamNames.length ? ' and more' : ''}, proving his worth wherever the jersey has been handed to him.`,
    BODY[written % BODY.length](offT),
  ];
  if (s.runs > 0 || s.wkts > 0) {
    const rbit = s.runs > 0 ? `${s.runs} runs (best of ${s.hsStr})` : null;
    const wbit = s.wkts > 0 ? `${s.wkts} wickets${s.bbi && s.bbi.w > 0 ? ` (best ${s.bbi.w}/${s.bbi.r})` : ''}` : null;
    parts.push(`In recorded Rewa cricket he has amassed ${[rbit, wbit].filter(Boolean).join(' and ')}.`);
  }
  parts.push(CLOSERS[written % CLOSERS.length](s.runs, s.wkts));
  p.bio = parts.join(' ');
  written++;
}
console.log(`bios written: ${written}, skipped (no 2+ teams or 2+ official tourneys): ${skipped}`);

writeFileSync(join(DATA, 'records.json'), JSON.stringify(db, null, 2));
console.log('saved.');
