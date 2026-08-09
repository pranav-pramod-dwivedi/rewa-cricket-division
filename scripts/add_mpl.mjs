#!/usr/bin/env node
// Add verified Madhya Pradesh League (MPL) Rewa Jaguars matches to records.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'data');
const db = JSON.parse(readFileSync(join(DATA, 'records.json'), 'utf8'));

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const byName = (n) => db.teams.find((t) => t.name === n);

function team(name, shortCode) {
  let t = byName(name);
  if (!t) {
    t = { id: `t-${slugify(name)}`, name, slug: slugify(name), shortCode, description: `${name} — franchise in the Madhya Pradesh League.` };
    db.teams.push(t);
  }
  return t;
}

const RJ = team('Rewa Jaguars', 'RJ');
const BKB = team('Bundelkhand Bulls', 'BKB');
const BL = team('Bhopal Leopards', 'BL');
const IPP = team('Indore Pink Panthers', 'IPP');
const RNE = team('Royal Nimar Eagles', 'RNE');
const UJF = team('Ujjain Falcons', 'UJF');
const GC = team('Gwalior Cheetahs', 'GC');
const JRL = team('Jabalpur Royal Lions', 'JRL');
const MLSS = team('Malwa Stallions', 'MLSS');
const CG = team('Chambal Ghariyals', 'CG');

let holkar = db.venues.find((v) => v.name === 'Holkar Stadium');
if (!holkar) { holkar = { id: 'v-holkar-indore', name: 'Holkar Stadium', slug: 'holkar-stadium-indore', city: 'Indore', state: 'Madhya Pradesh', capacity: 30000 }; db.venues.push(holkar); }
let daly = db.venues.find((v) => v.name === 'Daly College Ground');
if (!daly) { daly = { id: 'v-daly-college', name: 'Daly College Ground', slug: 'daly-college-ground-indore', city: 'Indore', state: 'Madhya Pradesh', capacity: null }; db.venues.push(daly); }

let s2026 = db.seasons.find((s) => s.year === 2026);
if (!s2026) { s2026 = { id: 's-2026', year: 2026, slug: '2026', startDate: '2026-01-01', endDate: '2026-12-31', status: 'ongoing' }; db.seasons.push(s2026); }
let t2026 = db.tournaments.find((t) => t.name === 'Madhya Pradesh Premier League' && t.seasonId === s2026.id);
if (!t2026) { t2026 = { id: 't-mppl-2026', name: 'Madhya Pradesh Premier League', slug: 'madhya-pradesh-premier-league-2026', seasonId: s2026.id, format: 'T20', status: 'ongoing', description: 'Madhya Pradesh Premier League T20, 2026 season.' }; db.tournaments.push(t2026); }

const mpl2026 = [
  { num: 6, a: BKB, b: RJ, scoreA: '74 (15 ov)', scoreB: '76/1 (5.1 ov)', result: 'Rewa Jaguars won by 9 wickets (with 89 balls remaining)', venue: holkar, date: null, slug: 'bundelkhand-bulls-vs-rewa-jaguars-6th-match-2026' },
  { num: 10, a: RJ, b: BL, scoreA: '203/8 (20 ov)', scoreB: '205/7 (19.3 ov)', result: 'Bhopal Leopards won by 3 wickets (with 3 balls remaining)', venue: holkar, date: null, slug: 'rewa-jaguars-vs-bhopal-leopards-10th-match-2026' },
  { num: 14, a: RJ, b: IPP, scoreA: '209/5 (20 ov)', scoreB: '178 (19 ov)', result: 'Rewa Jaguars won by 31 runs', venue: daly, date: null, slug: 'rewa-jaguars-vs-indore-pink-panthers-14th-match-2026' },
  { num: 20, a: RJ, b: RNE, scoreA: '130/8 (20 ov)', scoreB: '136/7 (19.3 ov)', result: 'Royal Nimar Eagles won by 3 wickets (with 3 balls remaining)', venue: daly, date: null, slug: 'rewa-jaguars-vs-royal-nimar-eagles-20th-match-2026' },
  { num: 25, a: UJF, b: RJ, scoreA: '231/4 (20 ov)', scoreB: '234/5 (19 ov)', result: 'Rewa Jaguars won by 5 wickets (with 6 balls remaining)', venue: holkar, date: null, slug: 'rewa-jaguars-vs-ujjain-falcons-25th-match-2026' },
  { num: 28, a: RJ, b: GC, scoreA: '238/6 (20 ov)', scoreB: '215/9 (20 ov)', result: 'Rewa Jaguars won by 23 runs', venue: holkar, date: '2026-06-15', slug: 'rewa-jaguars-vs-gwalior-cheetahs-28th-match-2026' },
  { num: 31, a: JRL, b: RJ, scoreA: '218/8 (20 ov)', scoreB: '219/2 (16 ov)', result: 'Rewa Jaguars won by 8 wickets (with 21 balls remaining)', venue: holkar, date: null, slug: 'rewa-jaguars-vs-jabalpur-royal-lions-31st-match-2026' },
  { num: 41, a: MLSS, b: RJ, scoreA: '214/7 (20 ov)', scoreB: '162 (20 ov)', result: 'Malwa Stallions won by 52 runs', venue: holkar, date: null, slug: 'rewa-jaguars-vs-malwa-stallions-41st-match-2026' },
  { num: 43, a: CG, b: RJ, scoreA: null, scoreB: null, result: 'Match abandoned without a ball bowled (rain)', venue: holkar, date: null, slug: 'chambal-ghariyals-vs-rewa-jaguars-43rd-match-2026' },
  { num: 'SF1', a: RJ, b: RNE, scoreA: '41/4 (7.2 ov)', scoreB: null, result: 'No result — 1st Semi-final (rain)', venue: holkar, date: null, slug: 'rewa-jaguars-vs-royal-nimar-eagles-1st-semi-final-2026' },
];

for (const m of mpl2026) {
  const slug = m.slug;
  db.matches.push({
    id: `m-${slug}`,
    slug,
    tournamentId: t2026.id,
    seasonId: s2026.id,
    venueId: m.venue.id,
    teamAId: m.a.id,
    teamBId: m.b.id,
    matchDate: m.date,
    format: 'T20',
    status: /won|abandoned|No result/.test(m.result) ? 'completed' : 'completed',
    resultText: m.result,
    matchNumber: m.num,
    notes: `Madhya Pradesh Premier League 2026 · ${m.a.name} ${m.scoreA ?? ''} v ${m.b.name} ${m.scoreB ?? ''}. ${m.result}.`,
  });
}

// MPL 2025 (two verified matches from Cricbuzz)
let s2025 = db.seasons.find((s) => s.year === 2025);
if (!s2025) { s2025 = { id: 's-2025', year: 2025, slug: '2025', startDate: '2025-01-01', endDate: '2025-12-31', status: 'completed' }; db.seasons.push(s2025); }
let t2025 = db.tournaments.find((t) => t.name === 'Madhya Pradesh League 2025');
if (!t2025) { t2025 = { id: 't-mpl-2025', name: 'Madhya Pradesh League 2025', slug: 'madhya-pradesh-league-2025', seasonId: s2025.id, format: 'T20', status: 'completed', description: 'Madhya Pradesh League T20, 2025 season.' }; db.tournaments.push(t2025); }

const mpl2025 = [
  { num: 11, a: RJ, b: BL, scoreA: null, scoreB: null, result: 'Rewa Jaguars v Bhopal Leopards, 11th Match, Madhya Pradesh League 2025', venue: holkar, date: '2025-06-17', slug: 'rewa-jaguars-vs-bhopal-leopards-11th-match-2025' },
  { num: 'SF1', a: RJ, b: BL, scoreA: '176/7 (20 ov)', scoreB: '180/7 (18.5 ov)', result: 'Bhopal Leopards won by 3 wickets — 1st Semi-final (1 v 4)', venue: holkar, date: '2025-06-23', slug: 'rewa-jaguars-vs-bhopal-leopards-1st-semi-final-2025' },
];
for (const m of mpl2025) {
  const slug = m.slug;
  db.matches.push({ id: `m-${slug}`, slug, tournamentId: t2025.id, seasonId: s2025.id, venueId: m.venue.id, teamAId: m.a.id, teamBId: m.b.id, matchDate: m.date, format: 'T20', status: 'completed', resultText: m.result, matchNumber: m.num, notes: `Madhya Pradesh League 2025 · ${m.a.name} v ${m.b.name}. ${m.result}.` });
}

writeFileSync(join(DATA, 'records.json'), JSON.stringify(db, null, 2));
console.log(`MPL added. matches=${db.matches.length} teams=${db.teams.length} tournaments=${db.tournaments.length}`);
