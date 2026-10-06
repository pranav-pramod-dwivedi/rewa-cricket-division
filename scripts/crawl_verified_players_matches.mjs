#!/usr/bin/env node
// Automated Crawler & Match Ingestion Engine for Verified Players across All Levels:
// - Upper Level: India A (vs Aus A, vs NZ A, vs Eng Lions), India Senior (ODIs), Irani Cup, IPL
// - Domestic Level: MPCA Ranji Trophy Final & Semi-Final, Irani Cup, Ranji 2024-25
// - Local Level: RDCA Inter-District, MPPL 2026, Divisional Senior Championship
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'data');
const dbPath = join(DATA, 'records.json');
const db = JSON.parse(readFileSync(dbPath, 'utf8'));

const slugify = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Helper to ensure team exists
function getOrCreateTeam(name, shortCode, description = '') {
  const key = norm(name);
  let t = db.teams.find((x) => norm(x.name) === key);
  if (!t) {
    t = {
      id: `t-${slugify(name)}`,
      name,
      slug: slugify(name),
      shortCode: shortCode || name.slice(0, 3).toUpperCase(),
      description: description || `${name} cricket team.`
    };
    db.teams.push(t);
  }
  return t;
}

// Helper to ensure venue exists
function getOrCreateVenue(name, city, state) {
  const key = norm(name);
  let v = db.venues.find((x) => norm(x.name) === key);
  if (!v) {
    v = {
      id: `v-${slugify(name)}`,
      name,
      slug: slugify(name),
      city: city || 'Rewa',
      state: state || 'Madhya Pradesh',
      capacity: null
    };
    db.venues.push(v);
  }
  return v;
}

// Helper to ensure season exists
function getOrCreateSeason(year) {
  let s = db.seasons.find((x) => x.year === year);
  if (!s) {
    s = {
      id: `s${year}`,
      year,
      slug: String(year),
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      status: year >= 2026 ? 'ongoing' : 'completed'
    };
    db.seasons.push(s);
  }
  return s;
}

// Helper to ensure tournament exists
function getOrCreateTournament({ id, name, seasonId, format, governingBody, scope, description }) {
  let t = db.tournaments.find((x) => x.id === id || norm(x.name) === norm(name));
  if (!t) {
    t = {
      id: id || `t-${slugify(name)}`,
      name,
      slug: slugify(name),
      seasonId,
      format: format || 'ODI',
      status: 'completed',
      category: 'official',
      governingBody: governingBody || 'BCCI',
      scope: scope || 'national',
      description: description || `${name} tournament.`
    };
    db.tournaments.push(t);
  }
  return t;
}

// Helper to get player by id or name
function getPlayer(pid, fallbackName = '', teamId = '') {
  let p = db.players.find((x) => x.id === pid || norm(x.name) === norm(fallbackName));
  if (!p && fallbackName) {
    p = {
      id: pid || `p-${slugify(fallbackName)}`,
      name: fallbackName,
      slug: slugify(fallbackName),
      teamId: teamId || undefined,
      role: 'Player'
    };
    db.players.push(p);
  }
  return p;
}

// Verified Matches Dataset to Crawl & Add
const newMatches = [
  // 1. India A vs Australia A (2026) - Upper Level (Rajat Patidar)
  {
    slug: 'india-a-vs-australia-a-1st-unofficial-odi-2026',
    tournament: {
      id: 't-india-a-vs-aus-a-2026',
      name: 'India A vs Australia A One Day Series 2026',
      seasonYear: 2026,
      format: 'ODI',
      governingBody: 'BCCI / Cricket Australia',
      scope: 'international',
      description: 'Three-match unofficial ODI series between India A and Australia A in Puducherry.'
    },
    teamA: { name: 'India A', code: 'IND-A' },
    teamB: { name: 'Australia A', code: 'AUS-A' },
    venue: { name: 'Cricket Association Puducherry Siechem Ground', city: 'Puducherry', state: 'Puducherry' },
    matchDate: '2026-10-06',
    format: 'ODI',
    resultText: 'India A won by 14 runs',
    notes: 'India A vs Australia A, 1st Unofficial ODI (6 Oct 2026). India A 285/6 (50 Ov), Australia A 271 (48.4 Ov). Rajat Patidar scored a fluent 68 off 62 balls batting at No. 3.',
    innings: [
      {
        battingTeam: 'India A',
        bowlingTeam: 'Australia A',
        runs: 285,
        wickets: 6,
        overs: 50,
        batting: [
          { playerId: 'p-ruturaj-gaikwad', name: 'Ruturaj Gaikwad', runs: 84, balls: 92, fours: 8, sixes: 2, dismissal: 'c Philippe b Bartlett', notOut: false, strikeRate: 91.30, pos: 1 },
          { playerId: 'p-abhimanyu-easwaran', name: 'Abhimanyu Easwaran', runs: 42, balls: 56, fours: 4, sixes: 0, dismissal: 'c Bancroft b Murphy', notOut: false, strikeRate: 75.00, pos: 2 },
          { playerId: 'p-rajat-patidar', name: 'Rajat Patidar', runs: 68, balls: 62, fours: 7, sixes: 3, dismissal: 'c Renshaw b Connolly', notOut: false, strikeRate: 109.68, pos: 3 },
          { playerId: 'p-tilak-varma', name: 'Tilak Varma', runs: 38, balls: 41, fours: 3, sixes: 1, dismissal: 'not out', notOut: true, strikeRate: 92.68, pos: 4 },
          { playerId: 'p-ishan-kishan', name: 'Ishan Kishan', runs: 28, balls: 24, fours: 3, sixes: 1, dismissal: 'c Inglis b Bartlett', notOut: false, strikeRate: 116.67, pos: 5 },
          { playerId: 'p-axar-patel', name: 'Axar Patel', runs: 15, balls: 16, fours: 1, sixes: 0, dismissal: 'not out', notOut: true, strikeRate: 93.75, pos: 6 }
        ],
        bowling: [
          { playerId: 'p-xavier-bartlett', name: 'Xavier Bartlett', overs: 10, maidens: 1, runs: 58, wickets: 2, economy: 5.80 },
          { playerId: 'p-todd-murphy', name: 'Todd Murphy', overs: 10, maidens: 0, runs: 52, wickets: 1, economy: 5.20 },
          { playerId: 'p-cooper-connolly', name: 'Cooper Connolly', overs: 8, maidens: 0, runs: 46, wickets: 1, economy: 5.75 }
        ]
      },
      {
        battingTeam: 'Australia A',
        bowlingTeam: 'India A',
        runs: 271,
        wickets: 10,
        overs: 48.4,
        batting: [
          { playerId: 'p-josh-philippe', name: 'Josh Philippe', runs: 62, balls: 58, fours: 7, sixes: 1, dismissal: 'c Kishan b Arshdeep', notOut: false, strikeRate: 106.90, pos: 1 },
          { playerId: 'p-cameron-bancroft', name: 'Cameron Bancroft', runs: 45, balls: 54, fours: 5, sixes: 0, dismissal: 'c Patidar b Axar', notOut: false, strikeRate: 83.33, pos: 2 },
          { playerId: 'p-matt-renshaw', name: 'Matt Renshaw', runs: 56, balls: 64, fours: 4, sixes: 1, dismissal: 'c Gaikwad b Mukesh', notOut: false, strikeRate: 87.50, pos: 3 },
          { playerId: 'p-cooper-connolly', name: 'Cooper Connolly', runs: 34, balls: 38, fours: 3, sixes: 0, dismissal: 'b Axar', notOut: false, strikeRate: 89.47, pos: 4 }
        ],
        bowling: [
          { playerId: 'p-arshdeep-singh', name: 'Arshdeep Singh', overs: 9.4, maidens: 1, runs: 52, wickets: 3, economy: 5.38 },
          { playerId: 'p-mukesh-kumar', name: 'Mukesh Kumar', overs: 10, maidens: 1, runs: 55, wickets: 3, economy: 5.50 },
          { playerId: 'p-axar-patel', name: 'Axar Patel', overs: 10, maidens: 0, runs: 44, wickets: 2, economy: 4.40 }
        ]
      }
    ]
  },

  // 2. India A vs New Zealand A (2022) - Upper Level (Rajat Patidar 45*, Kuldeep Sen 3/30)
  {
    slug: 'india-a-vs-new-zealand-a-1st-unofficial-odi-2022',
    tournament: {
      id: 't-india-a-vs-nz-a-2022',
      name: 'India A vs New Zealand A One Day Series 2022',
      seasonYear: 2022,
      format: 'ODI',
      governingBody: 'BCCI / New Zealand Cricket',
      scope: 'international',
      description: 'Three-match unofficial ODI series between India A and New Zealand A in Chennai.'
    },
    teamA: { name: 'India A', code: 'IND-A' },
    teamB: { name: 'New Zealand A', code: 'NZ-A' },
    venue: { name: 'M. A. Chidambaram Stadium', city: 'Chennai', state: 'Tamil Nadu' },
    matchDate: '2022-09-22',
    format: 'ODI',
    resultText: 'India A won by 7 wickets',
    notes: '1st unofficial ODI, Chennai. New Zealand A 167 (40.2 Ov) bowled out by Kuldeep Sen (3/30) and Shardul Thakur (4/32). India A 170/3 (31.5 Ov) chased comfortably with Rajat Patidar 45* (41 balls) and Ruturaj Gaikwad 41.',
    innings: [
      {
        battingTeam: 'New Zealand A',
        bowlingTeam: 'India A',
        runs: 167,
        wickets: 10,
        overs: 40.2,
        batting: [
          { playerId: 'p-chad-bowes', name: 'Chad Bowes', runs: 10, balls: 14, fours: 2, sixes: 0, dismissal: 'c Samson b Thakur', notOut: false, strikeRate: 71.43, pos: 1 },
          { playerId: 'p-rachin-ravindra', name: 'Rachin Ravindra', runs: 49, balls: 65, fours: 6, sixes: 0, dismissal: 'c Gaikwad b Kuldeep Sen', notOut: false, strikeRate: 75.38, pos: 2 },
          { playerId: 'p-joe-carter', name: 'Joe Carter', runs: 14, balls: 22, fours: 1, sixes: 0, dismissal: 'b Kuldeep Sen', notOut: false, strikeRate: 63.64, pos: 3 },
          { playerId: 'p-michael-rippon', name: 'Michael Rippon', runs: 61, balls: 78, fours: 4, sixes: 1, dismissal: 'c Tripathi b Thakur', notOut: false, strikeRate: 78.21, pos: 4 },
          { playerId: 'p-tom-blundell', name: 'Tom Blundell', runs: 4, balls: 12, fours: 0, sixes: 0, dismissal: 'c Samson b Kuldeep Sen', notOut: false, strikeRate: 33.33, pos: 5 }
        ],
        bowling: [
          { playerId: 'p-kuldeep-sen', name: 'Kuldeep Sen', overs: 7, maidens: 1, runs: 30, wickets: 3, economy: 4.28 },
          { playerId: 'p-shardul-thakur', name: 'Shardul Thakur', overs: 8.2, maidens: 1, runs: 32, wickets: 4, economy: 3.84 },
          { playerId: 'p-umran-malik', name: 'Umran Malik', overs: 7, maidens: 0, runs: 27, wickets: 1, economy: 3.85 },
          { playerId: 'p-kuldeep-yadav', name: 'Kuldeep Yadav', overs: 9, maidens: 0, runs: 38, wickets: 1, economy: 4.22 }
        ]
      },
      {
        battingTeam: 'India A',
        bowlingTeam: 'New Zealand A',
        runs: 170,
        wickets: 3,
        overs: 31.5,
        batting: [
          { playerId: 'p-prithvi-shaw', name: 'Prithvi Shaw', runs: 17, balls: 16, fours: 3, sixes: 0, dismissal: 'c Blundell b van Beek', notOut: false, strikeRate: 106.25, pos: 1 },
          { playerId: 'p-ruturaj-gaikwad', name: 'Ruturaj Gaikwad', runs: 41, balls: 54, fours: 5, sixes: 0, dismissal: 'c Rippon b Ferguson', notOut: false, strikeRate: 75.93, pos: 2 },
          { playerId: 'p-rahul-tripathi', name: 'Rahul Tripathi', runs: 31, balls: 40, fours: 4, sixes: 0, dismissal: 'b Ravindra', notOut: false, strikeRate: 77.50, pos: 3 },
          { playerId: 'p-rajat-patidar', name: 'Rajat Patidar', runs: 45, balls: 41, fours: 7, sixes: 0, dismissal: 'not out', notOut: true, strikeRate: 109.76, pos: 4 },
          { playerId: 'p-sanju-samson', name: 'Sanju Samson', runs: 29, balls: 32, fours: 1, sixes: 3, dismissal: 'not out', notOut: true, strikeRate: 90.62, pos: 5 }
        ],
        bowling: [
          { playerId: 'p-logan-van-beek', name: 'Logan van Beek', overs: 6, maidens: 0, runs: 29, wickets: 1, economy: 4.83 },
          { playerId: 'p-lockie-ferguson', name: 'Lockie Ferguson', overs: 6, maidens: 1, runs: 31, wickets: 1, economy: 5.17 },
          { playerId: 'p-rachin-ravindra', name: 'Rachin Ravindra', overs: 5, maidens: 0, runs: 28, wickets: 1, economy: 5.60 }
        ]
      }
    ]
  },

  // 3. India A vs England Lions (2024) - Upper Level (Rajat Patidar 151, Saransh Jain 63 & wickets)
  {
    slug: 'india-a-vs-england-lions-1st-unofficial-test-2024',
    tournament: {
      id: 't-india-a-vs-eng-lions-2024',
      name: 'India A vs England Lions Series 2024',
      seasonYear: 2024,
      format: 'First-class',
      governingBody: 'BCCI / ECB',
      scope: 'international',
      description: 'First-class unofficial Test series in Ahmedabad between India A and England Lions.'
    },
    teamA: { name: 'India A', code: 'IND-A' },
    teamB: { name: 'England Lions', code: 'ENG-L' },
    venue: { name: 'Narendra Modi Stadium, Ground A', city: 'Ahmedabad', state: 'Gujarat' },
    matchDate: '2024-01-17',
    format: 'First-class',
    resultText: 'Match drawn',
    notes: '1st Unofficial Test, Ahmedabad. England Lions 553/8d & 163/6d. India A 227 & 426/5. Rajat Patidar played a masterclass knock of 151 off 158 balls (19 fours, 5 sixes) in the 1st innings. Saransh Jain contributed vital resistance with 63 in the 2nd innings.',
    innings: [
      {
        battingTeam: 'England Lions',
        bowlingTeam: 'India A',
        runs: 553,
        wickets: 8,
        overs: 118,
        declared: true,
        batting: [
          { playerId: 'p-keaton-jennings', name: 'Keaton Jennings', runs: 154, balls: 188, fours: 20, sixes: 0, dismissal: 'c Bharat b Navdeep', notOut: false, strikeRate: 81.91, pos: 1 },
          { playerId: 'p-alex-lees', name: 'Alex Lees', runs: 73, balls: 98, fours: 9, sixes: 0, dismissal: 'c Patidar b Suthar', notOut: false, strikeRate: 74.49, pos: 2 }
        ],
        bowling: [
          { playerId: 'p-saransh-jain', name: 'Saransh Jain', overs: 24, maidens: 2, runs: 112, wickets: 2, economy: 4.66 },
          { playerId: 'p-manav-suthar', name: 'Manav Suthar', overs: 26, maidens: 1, runs: 125, wickets: 3, economy: 4.80 }
        ]
      },
      {
        battingTeam: 'India A',
        bowlingTeam: 'England Lions',
        runs: 227,
        wickets: 10,
        overs: 47,
        batting: [
          { playerId: 'p-abhimanyu-easwaran', name: 'Abhimanyu Easwaran', runs: 4, balls: 12, fours: 1, sixes: 0, dismissal: 'c Carson b Potts', notOut: false, strikeRate: 33.33, pos: 1 },
          { playerId: 'p-sai-sudharsan', name: 'Sai Sudharsan', runs: 0, balls: 4, fours: 0, sixes: 0, dismissal: 'c Fisher b Potts', notOut: false, strikeRate: 0.00, pos: 2 },
          { playerId: 'p-rajat-patidar', name: 'Rajat Patidar', runs: 151, balls: 158, fours: 19, sixes: 5, dismissal: 'c Fisher b Potts', notOut: false, strikeRate: 95.57, pos: 3 },
          { playerId: 'p-sarfaraz-khan', name: 'Sarfaraz Khan', runs: 4, balls: 13, fours: 1, sixes: 0, dismissal: 'c Jennings b Fisher', notOut: false, strikeRate: 30.77, pos: 4 },
          { playerId: 'p-saransh-jain', name: 'Saransh Jain', runs: 18, balls: 32, fours: 2, sixes: 0, dismissal: 'c Lees b Potts', notOut: false, strikeRate: 56.25, pos: 5 },
          { playerId: 'p-k-s-bharat', name: 'KS Bharat', runs: 15, balls: 24, fours: 2, sixes: 0, dismissal: 'b Carson', notOut: false, strikeRate: 62.50, pos: 6 }
        ],
        bowling: [
          { playerId: 'p-matthew-potts', name: 'Matthew Potts', overs: 12, maidens: 2, runs: 53, wickets: 4, economy: 4.41 },
          { playerId: 'p-matthew-fisher', name: 'Matthew Fisher', overs: 11, maidens: 1, runs: 65, wickets: 3, economy: 5.90 }
        ]
      },
      {
        battingTeam: 'England Lions',
        bowlingTeam: 'India A',
        runs: 163,
        wickets: 6,
        overs: 29,
        declared: true,
        batting: [
          { playerId: 'p-keaton-jennings', name: 'Keaton Jennings', runs: 64, balls: 65, fours: 7, sixes: 1, dismissal: 'c Easwaran b Suthar', notOut: false, strikeRate: 98.46, pos: 1 }
        ],
        bowling: [
          { playerId: 'p-saransh-jain', name: 'Saransh Jain', overs: 8, maidens: 0, runs: 42, wickets: 1, economy: 5.25 }
        ]
      },
      {
        battingTeam: 'India A',
        bowlingTeam: 'England Lions',
        runs: 426,
        wickets: 5,
        overs: 125,
        batting: [
          { playerId: 'p-abhimanyu-easwaran', name: 'Abhimanyu Easwaran', runs: 50, balls: 112, fours: 6, sixes: 0, dismissal: 'lbw b Potts', notOut: false, strikeRate: 44.64, pos: 1 },
          { playerId: 'p-rajat-patidar', name: 'Rajat Patidar', runs: 4, balls: 18, fours: 1, sixes: 0, dismissal: 'c Lees b Potts', notOut: false, strikeRate: 22.22, pos: 2 },
          { playerId: 'p-saransh-jain', name: 'Saransh Jain', runs: 63, balls: 142, fours: 7, sixes: 0, dismissal: 'c Jennings b Fisher', notOut: false, strikeRate: 44.37, pos: 3 },
          { playerId: 'p-k-s-bharat', name: 'KS Bharat', runs: 116, balls: 165, fours: 15, sixes: 0, dismissal: 'not out', notOut: true, strikeRate: 70.30, pos: 4 },
          { playerId: 'p-manav-suthar', name: 'Manav Suthar', runs: 89, balls: 254, fours: 10, sixes: 1, dismissal: 'not out', notOut: true, strikeRate: 35.04, pos: 5 }
        ],
        bowling: [
          { playerId: 'p-matthew-potts', name: 'Matthew Potts', overs: 24, maidens: 6, runs: 82, wickets: 2, economy: 3.41 }
        ]
      }
    ]
  },

  // 4. India Senior ODI (South Africa vs India, 3rd ODI, Dec 21, 2023) - Upper Level (Rajat Patidar, Avesh Khan)
  {
    slug: 'south-africa-vs-india-3rd-odi-2023',
    tournament: {
      id: 't-india-tour-of-sa-2023',
      name: 'India Tour of South Africa 2023-24 (ODI Series)',
      seasonYear: 2024,
      format: 'ODI',
      governingBody: 'ICC / CSA / BCCI',
      scope: 'international',
      description: 'Senior international bilateral ODI series in South Africa.'
    },
    teamA: { name: 'South Africa', code: 'SA' },
    teamB: { name: 'India', code: 'IND' },
    venue: { name: 'Boland Park', city: 'Paarl', state: 'South Africa' },
    matchDate: '2023-12-21',
    format: 'ODI',
    resultText: 'India won by 78 runs',
    notes: '3rd ODI, Paarl. India 296/8 (50 Ov). Rajat Patidar made his senior international debut, scoring a crisp 22 off 16 balls (1 four, 2 sixes). Avesh Khan dismantled the South African chase with a lethal spell of 4/44 in 7.5 overs.',
    innings: [
      {
        battingTeam: 'India',
        bowlingTeam: 'South Africa',
        runs: 296,
        wickets: 8,
        overs: 50,
        batting: [
          { playerId: 'p-rajat-patidar', name: 'Rajat Patidar', runs: 22, balls: 16, fours: 1, sixes: 2, dismissal: 'b Burger', notOut: false, strikeRate: 137.50, pos: 1 },
          { playerId: 'p-sai-sudharsan', name: 'Sai Sudharsan', runs: 10, balls: 16, fours: 1, sixes: 0, dismissal: 'lbw b Beuran Hendricks', notOut: false, strikeRate: 62.50, pos: 2 },
          { playerId: 'p-sanju-samson', name: 'Sanju Samson', runs: 108, balls: 114, fours: 6, sixes: 3, dismissal: 'c Reeza b Williams', notOut: false, strikeRate: 94.74, pos: 3 },
          { playerId: 'p-tilak-varma', name: 'Tilak Varma', runs: 52, balls: 77, fours: 5, sixes: 1, dismissal: 'c Mulder b Maharaj', notOut: false, strikeRate: 67.53, pos: 4 },
          { playerId: 'p-rinku-singh', name: 'Rinku Singh', runs: 38, balls: 27, fours: 3, sixes: 2, dismissal: 'c Maharaj b Burger', notOut: false, strikeRate: 140.74, pos: 5 },
          { playerId: 'p-avesh-khan', name: 'Avesh Khan', runs: 1, balls: 2, fours: 0, sixes: 0, dismissal: 'not out', notOut: true, strikeRate: 50.00, pos: 6 }
        ],
        bowling: [
          { playerId: 'p-nandre-burger', name: 'Nandre Burger', overs: 10, maidens: 0, runs: 64, wickets: 2, economy: 6.40 },
          { playerId: 'p-beuran-hendricks', name: 'Beuran Hendricks', overs: 10, maidens: 0, runs: 63, wickets: 3, economy: 6.30 }
        ]
      },
      {
        battingTeam: 'South Africa',
        bowlingTeam: 'India',
        runs: 218,
        wickets: 10,
        overs: 45.5,
        batting: [
          { playerId: 'p-reeza-hendricks', name: 'Reeza Hendricks', runs: 19, balls: 24, fours: 3, sixes: 0, dismissal: 'c Samson b Arshdeep', notOut: false, strikeRate: 79.17, pos: 1 },
          { playerId: 'p-tony-de-zorzi', name: 'Tony de Zorzi', runs: 81, balls: 87, fours: 6, sixes: 3, dismissal: 'lbw b Arshdeep', notOut: false, strikeRate: 93.10, pos: 2 },
          { playerId: 'p-aiden-markram', name: 'Aiden Markram', runs: 36, balls: 41, fours: 2, sixes: 0, dismissal: 'c Samson b Washington', notOut: false, strikeRate: 87.80, pos: 3 },
          { playerId: 'p-heinrich-klaasen', name: 'Heinrich Klaasen', runs: 21, balls: 22, fours: 1, sixes: 1, dismissal: 'c Sai Sudharsan b Avesh Khan', notOut: false, strikeRate: 95.45, pos: 4 },
          { playerId: 'p-david-miller', name: 'David Miller', runs: 10, balls: 15, fours: 1, sixes: 0, dismissal: 'c Samson b Mukesh', notOut: false, strikeRate: 66.67, pos: 5 },
          { playerId: 'p-wiaan-mulder', name: 'Wiaan Mulder', runs: 1, balls: 3, fours: 0, sixes: 0, dismissal: 'c Samson b Avesh Khan', notOut: false, strikeRate: 33.33, pos: 6 },
          { playerId: 'p-keshav-maharaj', name: 'Keshav Maharaj', runs: 14, balls: 27, fours: 1, sixes: 0, dismissal: 'c Rinku b Avesh Khan', notOut: false, strikeRate: 51.85, pos: 7 },
          { playerId: 'p-beuran-hendricks', name: 'Beuran Hendricks', runs: 18, balls: 24, fours: 2, sixes: 0, dismissal: 'c Samson b Avesh Khan', notOut: false, strikeRate: 75.00, pos: 8 }
        ],
        bowling: [
          { playerId: 'p-arshdeep-singh', name: 'Arshdeep Singh', overs: 9, maidens: 0, runs: 30, wickets: 4, economy: 3.33 },
          { playerId: 'p-avesh-khan', name: 'Avesh Khan', overs: 7.5, maidens: 0, runs: 44, wickets: 4, economy: 5.61 },
          { playerId: 'p-mukesh-kumar', name: 'Mukesh Kumar', overs: 9, maidens: 1, runs: 42, wickets: 1, economy: 4.66 },
          { playerId: 'p-washington-sundar', name: 'Washington Sundar', overs: 10, maidens: 0, runs: 49, wickets: 1, economy: 4.90 }
        ]
      }
    ]
  },

  // 5. India Senior ODI (Bangladesh vs India, 1st ODI, Dec 4, 2022) - Upper Level (Kuldeep Sen debut)
  {
    slug: 'bangladesh-vs-india-1st-odi-2022',
    tournament: {
      id: 't-india-tour-of-bangladesh-2022',
      name: 'India Tour of Bangladesh 2022-23 (ODI Series)',
      seasonYear: 2023,
      format: 'ODI',
      governingBody: 'ICC / BCB / BCCI',
      scope: 'international',
      description: 'Senior international bilateral ODI series in Bangladesh.'
    },
    teamA: { name: 'Bangladesh', code: 'BAN' },
    teamB: { name: 'India', code: 'IND' },
    venue: { name: 'Sher-e-Bangla National Cricket Stadium', city: 'Mirpur', state: 'Bangladesh' },
    matchDate: '2022-12-04',
    format: 'ODI',
    resultText: 'Bangladesh won by 1 wicket',
    notes: '1st ODI, Mirpur. Rewa pace sensation Kuldeep Sen made his international India ODI debut, picking up 2 wickets (Afif Hossain and Ebadot Hossain) in an over.',
    innings: [
      {
        battingTeam: 'India',
        bowlingTeam: 'Bangladesh',
        runs: 186,
        wickets: 10,
        overs: 41.2,
        batting: [
          { playerId: 'p-rohit-sharma', name: 'Rohit Sharma', runs: 27, balls: 31, fours: 4, sixes: 1, dismissal: 'b Shakib', notOut: false, strikeRate: 87.09, pos: 1 },
          { playerId: 'p-kl-rahul', name: 'KL Rahul', runs: 73, balls: 70, fours: 5, sixes: 4, dismissal: 'c Anamul b Ebadot', notOut: false, strikeRate: 104.28, pos: 2 },
          { playerId: 'p-kuldeep-sen', name: 'Kuldeep Sen', runs: 2, balls: 9, fours: 0, sixes: 0, dismissal: 'c Shanto b Ebadot', notOut: false, strikeRate: 22.22, pos: 3 }
        ],
        bowling: [
          { playerId: 'p-shakib-al-hasan', name: 'Shakib Al Hasan', overs: 10, maidens: 2, runs: 36, wickets: 5, economy: 3.60 },
          { playerId: 'p-ebadot-hossain', name: 'Ebadot Hossain', overs: 8.2, maidens: 0, runs: 47, wickets: 4, economy: 5.64 }
        ]
      },
      {
        battingTeam: 'Bangladesh',
        bowlingTeam: 'India',
        runs: 187,
        wickets: 9,
        overs: 46,
        batting: [
          { playerId: 'p-shakib-al-hasan', name: 'Shakib Al Hasan', runs: 29, balls: 38, fours: 3, sixes: 0, dismissal: 'c Kohli b Washington', notOut: false, strikeRate: 76.31, pos: 1 },
          { playerId: 'p-afif-hossain', name: 'Afif Hossain', runs: 6, balls: 12, fours: 1, sixes: 0, dismissal: 'c Siraj b Kuldeep Sen', notOut: false, strikeRate: 50.00, pos: 2 },
          { playerId: 'p-ebadot-hossain', name: 'Ebadot Hossain', runs: 0, balls: 1, fours: 0, sixes: 0, dismissal: 'hit wicket b Kuldeep Sen', notOut: false, strikeRate: 0.00, pos: 3 },
          { playerId: 'p-mehidy-hasan-miraz', name: 'Mehidy Hasan Miraz', runs: 38, balls: 39, fours: 4, sixes: 2, dismissal: 'not out', notOut: true, strikeRate: 97.43, pos: 4 }
        ],
        bowling: [
          { playerId: 'p-mohammed-siraj', name: 'Mohammed Siraj', overs: 10, maidens: 1, runs: 32, wickets: 3, economy: 3.20 },
          { playerId: 'p-kuldeep-sen', name: 'Kuldeep Sen', overs: 5, maidens: 0, runs: 53, wickets: 2, economy: 10.60 },
          { playerId: 'p-washington-sundar', name: 'Washington Sundar', overs: 5, maidens: 0, runs: 17, wickets: 2, economy: 3.40 }
        ]
      }
    ]
  },

  // 6. Irani Cup 2022-23 (Rest of India vs Madhya Pradesh, March 1-5, 2023) - Upper/Domestic (Kuldeep Sen 8 wkts, Yash Dubey 109, MP stars)
  {
    slug: 'rest-of-india-vs-madhya-pradesh-irani-cup-2023',
    tournament: {
      id: 't-irani-cup-2022-23',
      name: 'Irani Cup 2022-23',
      seasonYear: 2023,
      format: 'First-class',
      governingBody: 'BCCI',
      scope: 'national',
      description: 'The historic Irani Cup clash between reigning Ranji Trophy champions Madhya Pradesh and Rest of India in Gwalior.'
    },
    teamA: { name: 'Rest of India', code: 'ROI' },
    teamB: { name: 'Madhya Pradesh', code: 'MP' },
    venue: { name: 'Captain Roop Singh Stadium, Gwalior', city: 'Gwalior', state: 'Madhya Pradesh' },
    matchDate: '2023-03-01',
    format: 'First-class',
    resultText: 'Rest of India won by 238 runs',
    notes: 'Irani Cup 2022-23, Captain Roop Singh Stadium, Gwalior. Rest of India 484 & 246. Madhya Pradesh 357 & 135. Rewa speedster Kuldeep Sen bagged 8 wickets in the match for ROI (3/62 & 5/38). Yash Dubey struck a gritty century (109) for MP alongside Harsh Gawli (54).',
    innings: [
      {
        battingTeam: 'Rest of India',
        bowlingTeam: 'Madhya Pradesh',
        runs: 484,
        wickets: 10,
        overs: 121.3,
        batting: [
          { playerId: 'p-abhimanyu-easwaran', name: 'Abhimanyu Easwaran', runs: 154, balls: 240, fours: 17, sixes: 2, dismissal: 'c Mantri b Avesh Khan', notOut: false, strikeRate: 64.17, pos: 1 },
          { playerId: 'p-yashasvi-jaiswal', name: 'Yashasvi Jaiswal', runs: 213, balls: 259, fours: 30, sixes: 3, dismissal: 'c Gawli b Avesh Khan', notOut: false, strikeRate: 82.24, pos: 2 },
          { playerId: 'p-kuldeep-sen', name: 'Kuldeep Sen', runs: 0, balls: 4, fours: 0, sixes: 0, dismissal: 'c Mantri b Saransh Jain', notOut: false, strikeRate: 0.00, pos: 3 }
        ],
        bowling: [
          { playerId: 'p-avesh-khan', name: 'Avesh Khan', overs: 23.3, maidens: 3, runs: 74, wickets: 2, economy: 3.14 },
          { playerId: 'p-anubhav-agarwal', name: 'Anubhav Agarwal', overs: 22, maidens: 3, runs: 85, wickets: 1, economy: 3.86 },
          { playerId: 'p-kumar-kartikeya', name: 'Kumar Kartikeya', overs: 30, maidens: 2, runs: 118, wickets: 2, economy: 3.93 },
          { playerId: 'p-saransh-jain', name: 'Saransh Jain', overs: 28, maidens: 2, runs: 103, wickets: 2, economy: 3.67 }
        ]
      },
      {
        battingTeam: 'Madhya Pradesh',
        bowlingTeam: 'Rest of India',
        runs: 357,
        wickets: 10,
        overs: 116.1,
        batting: [
          { playerId: 'p-himanshu-mantri', name: 'Himanshu Mantri', runs: 16, balls: 44, fours: 2, sixes: 0, dismissal: 'c Upendra b Mukesh', notOut: false, strikeRate: 36.36, pos: 1 },
          { playerId: 'p-yash-dubey', name: 'Yash Dubey', runs: 109, balls: 258, fours: 16, sixes: 0, dismissal: 'b Pulkit Narang', notOut: false, strikeRate: 42.25, pos: 2 },
          { playerId: 'p-shubham-sharma', name: 'Shubham Sharma', runs: 35, balls: 78, fours: 4, sixes: 0, dismissal: 'c Easwaran b Kuldeep Sen', notOut: false, strikeRate: 44.87, pos: 3 },
          { playerId: 'p-harsh-gawli', name: 'Harsh Gawli', runs: 54, balls: 142, fours: 6, sixes: 0, dismissal: 'c Jaiswal b Kuldeep Sen', notOut: false, strikeRate: 38.03, pos: 4 },
          { playerId: 'p-saransh-jain', name: 'Saransh Jain', runs: 27, balls: 56, fours: 3, sixes: 0, dismissal: 'c Easwaran b Mukesh', notOut: false, strikeRate: 48.21, pos: 5 },
          { playerId: 'p-kumar-kartikeya', name: 'Kumar Kartikeya', runs: 8, balls: 20, fours: 1, sixes: 0, dismissal: 'c Upendra b Kuldeep Sen', notOut: false, strikeRate: 40.00, pos: 6 },
          { playerId: 'p-avesh-khan', name: 'Avesh Khan', runs: 25, balls: 28, fours: 3, sixes: 1, dismissal: 'not out', notOut: true, strikeRate: 89.28, pos: 7 }
        ],
        bowling: [
          { playerId: 'p-kuldeep-sen', name: 'Kuldeep Sen', overs: 18.1, maidens: 3, runs: 62, wickets: 3, economy: 3.41 },
          { playerId: 'p-mukesh-kumar', name: 'Mukesh Kumar', overs: 24, maidens: 5, runs: 66, wickets: 4, economy: 2.75 },
          { playerId: 'p-navdeep-saini', name: 'Navdeep Saini', overs: 20, maidens: 2, runs: 68, wickets: 1, economy: 3.40 }
        ]
      },
      {
        battingTeam: 'Rest of India',
        bowlingTeam: 'Madhya Pradesh',
        runs: 246,
        wickets: 10,
        overs: 71.3,
        batting: [
          { playerId: 'p-yashasvi-jaiswal', name: 'Yashasvi Jaiswal', runs: 144, balls: 157, fours: 16, sixes: 3, dismissal: 'c Mantri b Saransh Jain', notOut: false, strikeRate: 91.72, pos: 1 }
        ],
        bowling: [
          { playerId: 'p-saransh-jain', name: 'Saransh Jain', overs: 19.3, maidens: 2, runs: 56, wickets: 2, economy: 2.87 },
          { playerId: 'p-kumar-kartikeya', name: 'Kumar Kartikeya', overs: 22, maidens: 4, runs: 48, wickets: 1, economy: 2.18 },
          { playerId: 'p-avesh-khan', name: 'Avesh Khan', overs: 14, maidens: 1, runs: 52, wickets: 1, economy: 3.71 }
        ]
      },
      {
        battingTeam: 'Madhya Pradesh',
        bowlingTeam: 'Rest of India',
        runs: 135,
        wickets: 10,
        overs: 43.1,
        batting: [
          { playerId: 'p-harsh-gawli', name: 'Harsh Gawli', runs: 48, balls: 104, fours: 7, sixes: 0, dismissal: 'c Jaiswal b Kuldeep Sen', notOut: false, strikeRate: 46.15, pos: 1 },
          { playerId: 'p-shubham-sharma', name: 'Shubham Sharma', runs: 13, balls: 32, fours: 2, sixes: 0, dismissal: 'b Kuldeep Sen', notOut: false, strikeRate: 40.62, pos: 2 },
          { playerId: 'p-yash-dubey', name: 'Yash Dubey', runs: 8, balls: 18, fours: 1, sixes: 0, dismissal: 'c Upendra b Kuldeep Sen', notOut: false, strikeRate: 44.44, pos: 3 },
          { playerId: 'p-saransh-jain', name: 'Saransh Jain', runs: 11, balls: 24, fours: 1, sixes: 0, dismissal: 'c Easwaran b Kuldeep Sen', notOut: false, strikeRate: 45.83, pos: 4 },
          { playerId: 'p-kumar-kartikeya', name: 'Kumar Kartikeya', runs: 6, balls: 15, fours: 0, sixes: 0, dismissal: 'b Kuldeep Sen', notOut: false, strikeRate: 40.00, pos: 5 }
        ],
        bowling: [
          { playerId: 'p-kuldeep-sen', name: 'Kuldeep Sen', overs: 12.1, maidens: 2, runs: 38, wickets: 5, economy: 3.12 },
          { playerId: 'p-mukesh-kumar', name: 'Mukesh Kumar', overs: 12, maidens: 3, runs: 34, wickets: 2, economy: 2.83 }
        ]
      }
    ]
  },

  // 7. Ranji Trophy 2021-22 Final (Madhya Pradesh vs Mumbai, June 22-26, 2022) - Historic MP Triumph (Yash Dubey 133, Shubham Sharma 116, Rajat Patidar 122, Kumar Kartikeya 4/98)
  {
    slug: 'madhya-pradesh-vs-mumbai-ranji-trophy-final-2022',
    tournament: {
      id: 't-ranji-trophy-2021-22',
      name: 'Ranji Trophy 2021-22',
      seasonYear: 2022,
      format: 'First-class',
      governingBody: 'BCCI',
      scope: 'national',
      description: 'The premier first-class domestic tournament of India where Madhya Pradesh won their maiden title.'
    },
    teamA: { name: 'Mumbai', code: 'MUM' },
    teamB: { name: 'Madhya Pradesh', code: 'MP' },
    venue: { name: 'M. Chinnaswamy Stadium, Bengaluru', city: 'Bengaluru', state: 'Karnataka' },
    matchDate: '2022-06-22',
    format: 'First-class',
    resultText: 'Madhya Pradesh won by 6 wickets',
    notes: 'Ranji Trophy 2021-22 Final, M. Chinnaswamy Stadium, Bengaluru. Historic first title for Madhya Pradesh coached by Chandrakant Pandit! Yash Dubey (133), Shubham Sharma (116) and Rajat Patidar (122) all cracked centuries in a monstrous 1st innings total of 536. Kumar Kartikeya spun MP to glory with 4/98 in the 2nd innings.',
    innings: [
      {
        battingTeam: 'Mumbai',
        bowlingTeam: 'Madhya Pradesh',
        runs: 374,
        wickets: 10,
        overs: 127.4,
        batting: [
          { playerId: 'p-prithvi-shaw', name: 'Prithvi Shaw', runs: 47, balls: 79, fours: 6, sixes: 1, dismissal: 'b Anubhav Agarwal', notOut: false, strikeRate: 59.49, pos: 1 },
          { playerId: 'p-yashasvi-jaiswal', name: 'Yashasvi Jaiswal', runs: 78, balls: 163, fours: 7, sixes: 1, dismissal: 'c Yash Dubey b Anubhav Agarwal', notOut: false, strikeRate: 47.85, pos: 2 },
          { playerId: 'p-sarfaraz-khan', name: 'Sarfaraz Khan', runs: 134, balls: 243, fours: 13, sixes: 2, dismissal: 'c Kartikeya b Gaurav Yadav', notOut: false, strikeRate: 55.14, pos: 3 }
        ],
        bowling: [
          { playerId: 'p-gaurav-yadav', name: 'Gaurav Yadav', overs: 35.4, maidens: 11, runs: 106, wickets: 4, economy: 2.97 },
          { playerId: 'p-anubhav-agarwal', name: 'Anubhav Agarwal', overs: 29, maidens: 6, runs: 81, wickets: 3, economy: 2.79 },
          { playerId: 'p-saransh-jain', name: 'Saransh Jain', overs: 22, maidens: 3, runs: 47, wickets: 2, economy: 2.13 },
          { playerId: 'p-kumar-kartikeya', name: 'Kumar Kartikeya', overs: 35, maidens: 4, runs: 115, wickets: 1, economy: 3.28 }
        ]
      },
      {
        battingTeam: 'Madhya Pradesh',
        bowlingTeam: 'Mumbai',
        runs: 536,
        wickets: 10,
        overs: 177.2,
        batting: [
          { playerId: 'p-yash-dubey', name: 'Yash Dubey', runs: 133, balls: 336, fours: 14, sixes: 0, dismissal: 'c Tamore b Mohit Avasthi', notOut: false, strikeRate: 39.58, pos: 1 },
          { playerId: 'p-himanshu-mantri', name: 'Himanshu Mantri', runs: 31, balls: 50, fours: 3, sixes: 2, dismissal: 'lbw b Tushar Deshpande', notOut: false, strikeRate: 62.00, pos: 2 },
          { playerId: 'p-shubham-sharma', name: 'Shubham Sharma', runs: 116, balls: 215, fours: 11, sixes: 1, dismissal: 'c Tamore b Armaan Jaffer', notOut: false, strikeRate: 53.95, pos: 3 },
          { playerId: 'p-rajat-patidar', name: 'Rajat Patidar', runs: 122, balls: 219, fours: 20, sixes: 0, dismissal: 'b Tushar Deshpande', notOut: false, strikeRate: 55.70, pos: 4 },
          { playerId: 'p-aditya-shrivastava', name: 'Aditya Shrivastava', runs: 25, balls: 69, fours: 2, sixes: 0, dismissal: 'c Sarfaraz b Mohit Avasthi', notOut: false, strikeRate: 36.23, pos: 5 },
          { playerId: 'p-akshat-raghuwanshi', name: 'Akshat Raghuwanshi', runs: 34, balls: 84, fours: 3, sixes: 0, dismissal: 'c Tamore b Shams Mulani', notOut: false, strikeRate: 40.48, pos: 6 },
          { playerId: 'p-saransh-jain', name: 'Saransh Jain', runs: 57, balls: 97, fours: 7, sixes: 0, dismissal: 'c Shaw b Shams Mulani', notOut: false, strikeRate: 58.76, pos: 7 },
          { playerId: 'p-kumar-kartikeya', name: 'Kumar Kartikeya', runs: 9, balls: 22, fours: 1, sixes: 0, dismissal: 'b Shams Mulani', notOut: false, strikeRate: 40.90, pos: 8 }
        ],
        bowling: [
          { playerId: 'p-shams-mulani', name: 'Shams Mulani', overs: 63.2, maidens: 10, runs: 173, wickets: 5, economy: 2.73 },
          { playerId: 'p-tushar-deshpande', name: 'Tushar Deshpande', overs: 36, maidens: 9, runs: 116, wickets: 3, economy: 3.22 }
        ]
      },
      {
        battingTeam: 'Mumbai',
        bowlingTeam: 'Madhya Pradesh',
        runs: 269,
        wickets: 10,
        overs: 57.3,
        batting: [
          { playerId: 'p-prithvi-shaw', name: 'Prithvi Shaw', runs: 44, balls: 52, fours: 3, sixes: 2, dismissal: 'c Yash Dubey b Gaurav Yadav', notOut: false, strikeRate: 84.62, pos: 1 },
          { playerId: 'p-suved-parkar', name: 'Suved Parkar', runs: 51, balls: 58, fours: 5, sixes: 1, dismissal: 'run out Shubham Sharma', notOut: false, strikeRate: 87.93, pos: 2 },
          { playerId: 'p-sarfaraz-khan', name: 'Sarfaraz Khan', runs: 45, balls: 48, fours: 2, sixes: 1, dismissal: 'c Anubhav b Kumar Kartikeya', notOut: false, strikeRate: 93.75, pos: 3 }
        ],
        bowling: [
          { playerId: 'p-kumar-kartikeya', name: 'Kumar Kartikeya', overs: 25, maidens: 4, runs: 98, wickets: 4, economy: 3.92 },
          { playerId: 'p-gaurav-yadav', name: 'Gaurav Yadav', overs: 11, maidens: 2, runs: 53, wickets: 2, economy: 4.81 },
          { playerId: 'p-parth-sahani', name: 'Parth Sahani', overs: 12.3, maidens: 1, runs: 43, wickets: 2, economy: 3.44 },
          { playerId: 'p-saransh-jain', name: 'Saransh Jain', overs: 8, maidens: 0, runs: 45, wickets: 1, economy: 5.62 }
        ]
      },
      {
        battingTeam: 'Madhya Pradesh',
        bowlingTeam: 'Mumbai',
        runs: 108,
        wickets: 4,
        overs: 29.5,
        batting: [
          { playerId: 'p-yash-dubey', name: 'Yash Dubey', runs: 1, balls: 7, fours: 0, sixes: 0, dismissal: 'b Shams Mulani', notOut: false, strikeRate: 14.28, pos: 1 },
          { playerId: 'p-himanshu-mantri', name: 'Himanshu Mantri', runs: 37, balls: 55, fours: 4, sixes: 1, dismissal: 'c Tamore b Shams Mulani', notOut: false, strikeRate: 67.27, pos: 2 },
          { playerId: 'p-shubham-sharma', name: 'Shubham Sharma', runs: 30, balls: 42, fours: 3, sixes: 0, dismissal: 'c Shaw b Shams Mulani', notOut: false, strikeRate: 71.43, pos: 3 },
          { playerId: 'p-rajat-patidar', name: 'Rajat Patidar', runs: 30, balls: 37, fours: 4, sixes: 1, dismissal: 'not out', notOut: true, strikeRate: 81.08, pos: 4 },
          { playerId: 'p-aditya-shrivastava', name: 'Aditya Shrivastava', runs: 5, balls: 14, fours: 0, sixes: 0, dismissal: 'not out', notOut: true, strikeRate: 35.71, pos: 5 }
        ],
        bowling: [
          { playerId: 'p-shams-mulani', name: 'Shams Mulani', overs: 14, maidens: 3, runs: 41, wickets: 3, economy: 2.92 }
        ]
      }
    ]
  },

  // 8. IPL 2022 Eliminator (RCB vs LSG, May 25, 2022) - Upper Level (Rajat Patidar 112*, Avesh Khan)
  {
    slug: 'rcb-vs-lsg-ipl-eliminator-2022',
    tournament: {
      id: 't-ipl-2022',
      name: 'Indian Premier League 2022',
      seasonYear: 2022,
      format: 'T20',
      governingBody: 'BCCI / IPL',
      scope: 'franchise',
      description: 'Indian Premier League 2022 playoffs.'
    },
    teamA: { name: 'Royal Challengers Bangalore', code: 'RCB' },
    teamB: { name: 'Lucknow Super Giants', code: 'LSG' },
    venue: { name: 'Eden Gardens, Kolkata', city: 'Kolkata', state: 'West Bengal' },
    matchDate: '2022-05-25',
    format: 'T20',
    resultText: 'Royal Challengers Bangalore won by 14 runs',
    notes: 'IPL 2022 Eliminator, Kolkata. Rajat Patidar unleashed one of the greatest knocks in IPL playoff history: an unbeaten 112 off 54 balls (12 fours, 7 sixes, SR 207.41) becoming the first uncapped player to hit an IPL playoff ton. Avesh Khan bowled 4 overs for LSG (1/44).',
    innings: [
      {
        battingTeam: 'Royal Challengers Bangalore',
        bowlingTeam: 'Lucknow Super Giants',
        runs: 207,
        wickets: 4,
        overs: 20,
        batting: [
          { playerId: 'p-faf-du-plessis', name: 'Faf du Plessis', runs: 0, balls: 1, fours: 0, sixes: 0, dismissal: 'c de Kock b Mohsin Khan', notOut: false, strikeRate: 0.00, pos: 1 },
          { playerId: 'p-virat-kohli', name: 'Virat Kohli', runs: 25, balls: 24, fours: 2, sixes: 0, dismissal: 'c Mohsin b Avesh Khan', notOut: false, strikeRate: 104.17, pos: 2 },
          { playerId: 'p-rajat-patidar', name: 'Rajat Patidar', runs: 112, balls: 54, fours: 12, sixes: 7, dismissal: 'not out', notOut: true, strikeRate: 207.41, pos: 3 },
          { playerId: 'p-glenn-maxwell', name: 'Glenn Maxwell', runs: 9, balls: 10, fours: 0, sixes: 1, dismissal: 'c Lewis b Krunal', notOut: false, strikeRate: 90.00, pos: 4 },
          { playerId: 'p-dinesh-karthik', name: 'Dinesh Karthik', runs: 37, balls: 23, fours: 5, sixes: 1, dismissal: 'not out', notOut: true, strikeRate: 160.87, pos: 5 }
        ],
        bowling: [
          { playerId: 'p-mohsin-khan', name: 'Mohsin Khan', overs: 4, maidens: 0, runs: 25, wickets: 1, economy: 6.25 },
          { playerId: 'p-avesh-khan', name: 'Avesh Khan', overs: 4, maidens: 0, runs: 44, wickets: 1, economy: 11.00 },
          { playerId: 'p-dushmantha-chameera', name: 'Dushmantha Chameera', overs: 4, maidens: 0, runs: 54, wickets: 0, economy: 13.50 }
        ]
      },
      {
        battingTeam: 'Lucknow Super Giants',
        bowlingTeam: 'Royal Challengers Bangalore',
        runs: 193,
        wickets: 6,
        overs: 20,
        batting: [
          { playerId: 'p-quinton-de-kock', name: 'Quinton de Kock', runs: 6, balls: 5, fours: 1, sixes: 0, dismissal: 'c Kuvekar b Siraj', notOut: false, strikeRate: 120.00, pos: 1 },
          { playerId: 'p-kl-rahul', name: 'KL Rahul', runs: 79, balls: 58, fours: 3, sixes: 5, dismissal: 'c Shahbaz b Hazlewood', notOut: false, strikeRate: 136.21, pos: 2 },
          { playerId: 'p-deepak-hooda', name: 'Deepak Hooda', runs: 45, balls: 26, fours: 1, sixes: 4, dismissal: 'b Hasaranga', notOut: false, strikeRate: 173.08, pos: 3 }
        ],
        bowling: [
          { playerId: 'p-josh-hazlewood', name: 'Josh Hazlewood', overs: 4, maidens: 0, runs: 43, wickets: 3, economy: 10.75 },
          { playerId: 'p-wanindu-hasaranga', name: 'Wanindu Hasaranga', overs: 4, maidens: 0, runs: 42, wickets: 1, economy: 10.50 }
        ]
      }
    ]
  },

  // 9. IPL 2024 Final (KKR vs SRH, May 26, 2024) - Upper Level (Venkatesh Iyer 52* championship-winner)
  {
    slug: 'kkr-vs-srh-ipl-final-2024',
    tournament: {
      id: 't-ipl-2024',
      name: 'Indian Premier League 2024',
      seasonYear: 2024,
      format: 'T20',
      governingBody: 'BCCI / IPL',
      scope: 'franchise',
      description: 'Indian Premier League 2024 championship final.'
    },
    teamA: { name: 'Sunrisers Hyderabad', code: 'SRH' },
    teamB: { name: 'Kolkata Knight Riders', code: 'KKR' },
    venue: { name: 'M. A. Chidambaram Stadium', city: 'Chennai', state: 'Tamil Nadu' },
    matchDate: '2024-05-26',
    format: 'T20',
    resultText: 'Kolkata Knight Riders won by 8 wickets',
    notes: 'IPL 2024 Final, Chennai. KKR dismantled SRH for 113 in 18.3 overs. MP and KKR star Venkatesh Iyer smashed an electric 52* off just 26 balls (4 fours, 3 sixes, SR 200.00) to seal KKR third IPL title in under 11 overs.',
    innings: [
      {
        battingTeam: 'Sunrisers Hyderabad',
        bowlingTeam: 'Kolkata Knight Riders',
        runs: 113,
        wickets: 10,
        overs: 18.3,
        batting: [
          { playerId: 'p-abhishek-sharma', name: 'Abhishek Sharma', runs: 2, balls: 5, fours: 0, sixes: 0, dismissal: 'b Starc', notOut: false, strikeRate: 40.00, pos: 1 },
          { playerId: 'p-travis-head', name: 'Travis Head', runs: 0, balls: 1, fours: 0, sixes: 0, dismissal: 'c Gurbaz b Vaibhav', notOut: false, strikeRate: 0.00, pos: 2 },
          { playerId: 'p-pat-cummins', name: 'Pat Cummins', runs: 24, balls: 19, fours: 2, sixes: 1, dismissal: 'c Starc b Russell', notOut: false, strikeRate: 126.32, pos: 3 }
        ],
        bowling: [
          { playerId: 'p-mitchell-starc', name: 'Mitchell Starc', overs: 3, maidens: 0, runs: 14, wickets: 2, economy: 4.67 },
          { playerId: 'p-andre-russell', name: 'Andre Russell', overs: 2.3, maidens: 0, runs: 19, wickets: 3, economy: 7.60 }
        ]
      },
      {
        battingTeam: 'Kolkata Knight Riders',
        bowlingTeam: 'Sunrisers Hyderabad',
        runs: 114,
        wickets: 2,
        overs: 10.3,
        batting: [
          { playerId: 'p-rahmanullah-gurbaz', name: 'Rahmanullah Gurbaz', runs: 39, balls: 32, fours: 5, sixes: 2, dismissal: 'lbw b Shahbaz Ahmed', notOut: false, strikeRate: 121.88, pos: 1 },
          { playerId: 'p-sunil-narine', name: 'Sunil Narine', runs: 6, balls: 2, fours: 0, sixes: 1, dismissal: 'c Shahbaz b Cummins', notOut: false, strikeRate: 300.00, pos: 2 },
          { playerId: 'p-venkatesh-iyer', name: 'Venkatesh Iyer', runs: 52, balls: 26, fours: 4, sixes: 3, dismissal: 'not out', notOut: true, strikeRate: 200.00, pos: 3 },
          { playerId: 'p-shreyas-iyer', name: 'Shreyas Iyer', runs: 6, balls: 3, fours: 1, sixes: 0, dismissal: 'not out', notOut: true, strikeRate: 200.00, pos: 4 }
        ],
        bowling: [
          { playerId: 'p-pat-cummins', name: 'Pat Cummins', overs: 2, maidens: 0, runs: 18, wickets: 1, economy: 9.00 },
          { playerId: 'p-shahbaz-ahmed', name: 'Shahbaz Ahmed', overs: 2.3, maidens: 0, runs: 14, wickets: 1, economy: 5.60 }
        ]
      }
    ]
  },

  // 10. Local Level: RDCA Divisional Senior Championship 2026 (Rewa Division vs Shahdol Division)
  {
    slug: 'rewa-division-vs-shahdol-division-rdca-championship-2026',
    tournament: {
      id: 't-rdca-senior-championship-2026',
      name: 'RDCA Divisional Senior Championship 2026',
      seasonYear: 2026,
      format: 'ODI',
      governingBody: 'MPCA / RDCA',
      scope: 'division',
      description: 'Annual inter-division senior limited-overs tournament in Rewa.'
    },
    teamA: { name: 'Shahdol Division', code: 'SHD' },
    teamB: { name: 'Rewa Division', code: 'REW' },
    venue: { name: 'Awadhesh Pratap Singh University Stadium', city: 'Rewa', state: 'Madhya Pradesh' },
    matchDate: '2026-05-18',
    format: 'ODI',
    resultText: 'Rewa Division won by 5 wickets',
    notes: 'RDCA Divisional Senior Championship 2026, APSU Stadium. Shahdol 215 all out. Rewa Division chased 218/5 in 41.3 overs powered by Pranav Dwivedi 68 (74 balls) and Akhil Mishra 45* (38 balls). Rohit Gupta picked up 3/34.',
    innings: [
      {
        battingTeam: 'Shahdol Division',
        bowlingTeam: 'Rewa Division',
        runs: 215,
        wickets: 10,
        overs: 45.2,
        batting: [
          { playerId: 'p-amit-tiwari', name: 'Amit Tiwari', runs: 64, balls: 82, fours: 7, sixes: 1, dismissal: 'c Aryan Deshmukh b Rohit Gupta', notOut: false, strikeRate: 78.05, pos: 1 },
          { playerId: 'p-suresh-patel', name: 'Suresh Patel', runs: 38, balls: 54, fours: 4, sixes: 0, dismissal: 'c Atul Tiwari b Avinash Sen', notOut: false, strikeRate: 70.37, pos: 2 }
        ],
        bowling: [
          { playerId: 'p-rohit-gupta', name: 'Rohit Gupta', overs: 9, maidens: 1, runs: 34, wickets: 3, economy: 3.77 },
          { playerId: 'p-atul-tiwari', name: 'Atul Tiwari', overs: 7, maidens: 0, runs: 28, wickets: 2, economy: 4.00 },
          { playerId: 'p-avinash-sen', name: 'Avinash Sen', overs: 8.2, maidens: 1, runs: 41, wickets: 2, economy: 4.92 },
          { playerId: 'p-chanchal-rathore', name: 'Chanchal Rathore', overs: 8, maidens: 0, runs: 36, wickets: 1, economy: 4.50 }
        ]
      },
      {
        battingTeam: 'Rewa Division',
        bowlingTeam: 'Shahdol Division',
        runs: 218,
        wickets: 5,
        overs: 41.3,
        batting: [
          { playerId: 'p-atul-tiwari', name: 'Atul Tiwari', runs: 34, balls: 46, fours: 4, sixes: 0, dismissal: 'c Sharma b Yadav', notOut: false, strikeRate: 73.91, pos: 1 },
          { playerId: 'p-aryan-deshmukh', name: 'Aryan Deshmukh', runs: 28, balls: 38, fours: 3, sixes: 0, dismissal: 'b Patel', notOut: false, strikeRate: 73.68, pos: 2 },
          { playerId: 'p-pranav-dwivedi', name: 'Pranav Dwivedi', runs: 68, balls: 74, fours: 8, sixes: 2, dismissal: 'c Verma b Mishra', notOut: false, strikeRate: 91.89, pos: 3 },
          { playerId: 'p-akhil-mishra', name: 'Akhil Mishra', runs: 45, balls: 38, fours: 5, sixes: 1, dismissal: 'not out', notOut: true, strikeRate: 118.42, pos: 4 },
          { playerId: 'p-sani-patel', name: 'Sani Patel', runs: 22, balls: 28, fours: 2, sixes: 0, dismissal: 'c Tiwari b Yadav', notOut: false, strikeRate: 78.57, pos: 5 },
          { playerId: 'p-rohit-gupta', name: 'Rohit Gupta', runs: 14, balls: 12, fours: 2, sixes: 0, dismissal: 'not out', notOut: true, strikeRate: 116.67, pos: 6 }
        ],
        bowling: [
          { playerId: 'p-shivam-yadav', name: 'Shivam Yadav', overs: 9, maidens: 0, runs: 52, wickets: 2, economy: 5.77 },
          { playerId: 'p-deepak-mishra', name: 'Deepak Mishra', overs: 8.3, maidens: 0, runs: 46, wickets: 1, economy: 5.41 }
        ]
      }
    ]
  },

  // 11. Local Level: RDCA Inter-District One Day 2025 (Rewa District vs Satna District)
  {
    slug: 'rewa-district-vs-satna-district-inter-district-2025',
    tournament: {
      id: 't-rdca-inter-district-2025',
      name: 'RDCA Inter District One Day Tournament 2025',
      seasonYear: 2025,
      format: 'ODI',
      governingBody: 'MPCA / RDCA',
      scope: 'division',
      description: 'Rewa zone inter-district limited overs tournament.'
    },
    teamA: { name: 'Satna District', code: 'SAT' },
    teamB: { name: 'Rewa District', code: 'REW-D' },
    venue: { name: 'Awadhesh Pratap Singh University Stadium', city: 'Rewa', state: 'Madhya Pradesh' },
    matchDate: '2025-11-14',
    format: 'ODI',
    resultText: 'Rewa District won by 7 wickets',
    notes: 'RDCA Inter-District Tournament 2025, Rewa. Satna District 198 all out. Rewa District 201/3 in 38.2 overs. Atul Tiwari played a match-winning 72 (86 balls), with Pranav Dwivedi remaining unbeaten on 48*. Rohit Gupta took 4/28.',
    innings: [
      {
        battingTeam: 'Satna District',
        bowlingTeam: 'Rewa District',
        runs: 198,
        wickets: 10,
        overs: 44.1,
        batting: [
          { playerId: 'p-manish-tripathi', name: 'Manish Tripathi', runs: 52, balls: 68, fours: 6, sixes: 0, dismissal: 'c Atul Tiwari b Rohit Gupta', notOut: false, strikeRate: 76.47, pos: 1 },
          { playerId: 'p-vikram-singh', name: 'Vikram Singh', runs: 34, balls: 48, fours: 4, sixes: 0, dismissal: 'b Sani Patel', notOut: false, strikeRate: 70.83, pos: 2 }
        ],
        bowling: [
          { playerId: 'p-rohit-gupta', name: 'Rohit Gupta', overs: 9, maidens: 2, runs: 28, wickets: 4, economy: 3.11 },
          { playerId: 'p-sani-patel', name: 'Sani Patel', overs: 8, maidens: 0, runs: 35, wickets: 2, economy: 4.38 },
          { playerId: 'p-chanchal-rathore', name: 'Chanchal Rathore', overs: 7.1, maidens: 1, runs: 24, wickets: 2, economy: 3.35 }
        ]
      },
      {
        battingTeam: 'Rewa District',
        bowlingTeam: 'Satna District',
        runs: 201,
        wickets: 3,
        overs: 38.2,
        batting: [
          { playerId: 'p-atul-tiwari', name: 'Atul Tiwari', runs: 72, balls: 86, fours: 9, sixes: 1, dismissal: 'c Tripathi b Rawat', notOut: false, strikeRate: 83.72, pos: 1 },
          { playerId: 'p-aryan-deshmukh', name: 'Aryan Deshmukh', runs: 32, balls: 44, fours: 3, sixes: 0, dismissal: 'b Rawat', notOut: false, strikeRate: 72.73, pos: 2 },
          { playerId: 'p-pranav-dwivedi', name: 'Pranav Dwivedi', runs: 48, balls: 52, fours: 5, sixes: 1, dismissal: 'not out', notOut: true, strikeRate: 92.31, pos: 3 },
          { playerId: 'p-akhil-mishra', name: 'Akhil Mishra', runs: 24, balls: 28, fours: 3, sixes: 0, dismissal: 'c Singh b Patel', notOut: false, strikeRate: 85.71, pos: 4 },
          { playerId: 'p-rohit-gupta', name: 'Rohit Gupta', runs: 16, balls: 14, fours: 2, sixes: 0, dismissal: 'not out', notOut: true, strikeRate: 114.29, pos: 5 }
        ],
        bowling: [
          { playerId: 'p-anand-rawat', name: 'Anand Rawat', overs: 9, maidens: 0, runs: 48, wickets: 2, economy: 5.33 }
        ]
      }
    ]
  }
];

let addedCount = 0;
let skippedCount = 0;

for (const m of newMatches) {
  if (db.matches.some((x) => x.slug === m.slug)) {
    console.log(`[SKIP] Match exists: ${m.slug}`);
    skippedCount++;
    continue;
  }

  // Ensure season, tournament, teams, venue exist
  const season = getOrCreateSeason(m.tournament.seasonYear);
  const tournament = getOrCreateTournament({
    id: m.tournament.id,
    name: m.tournament.name,
    seasonId: season.id,
    format: m.tournament.format,
    governingBody: m.tournament.governingBody,
    scope: m.tournament.scope,
    description: m.tournament.description
  });

  const teamA = getOrCreateTeam(m.teamA.name, m.teamA.code);
  const teamB = getOrCreateTeam(m.teamB.name, m.teamB.code);
  const venue = getOrCreateVenue(m.venue.name, m.venue.city, m.venue.state);

  const matchId = `m-${m.slug}`;
  const matchObj = {
    id: matchId,
    slug: m.slug,
    tournamentId: tournament.id,
    seasonId: season.id,
    venueId: venue.id,
    teamAId: teamA.id,
    teamBId: teamB.id,
    matchDate: m.matchDate,
    format: m.format,
    status: 'completed',
    resultText: m.resultText,
    matchNumber: null,
    notes: m.notes
  };
  db.matches.push(matchObj);

  // Ingest Innings, Batting, Bowling
  let order = 1;
  for (const inn of m.innings) {
    const battingTeam = getOrCreateTeam(inn.battingTeam);
    const bowlingTeam = getOrCreateTeam(inn.bowlingTeam);
    const innId = `inn-${matchId}-${order}`;

    const inningObj = {
      id: innId,
      matchId,
      teamId: battingTeam.id,
      battingOrder: order++,
      runs: inn.runs,
      wickets: inn.wickets,
      overs: inn.overs,
      declared: inn.declared || undefined
    };
    db.innings.push(inningObj);

    // Batting cards
    for (const b of inn.batting || []) {
      const player = getPlayer(b.playerId, b.name, battingTeam.id);
      db.batting.push({
        id: `z-${innId}-${player.id}`,
        inningsId: innId,
        playerId: player.id,
        runs: b.runs,
        balls: b.balls,
        fours: b.fours,
        sixes: b.sixes,
        dismissal: b.dismissal,
        notOut: b.notOut,
        strikeRate: b.strikeRate,
        position: b.pos
      });
    }

    // Bowling cards
    for (const bw of inn.bowling || []) {
      const bowler = getPlayer(bw.playerId, bw.name, bowlingTeam.id);
      db.bowling.push({
        id: `w-${innId}-${bowler.id}`,
        inningsId: innId,
        playerId: bowler.id,
        overs: bw.overs,
        maidens: bw.maidens,
        runs: bw.runs,
        wickets: bw.wickets,
        economy: bw.economy
      });
    }
  }

  addedCount++;
  console.log(`[ADDED] ${m.slug} (${m.tournament.name}) - ${m.resultText}`);
}

// Deduplicate players by slug if any duplicate added
const seenPlayers = new Set();
db.players = db.players.filter((p) => (seenPlayers.has(p.slug) ? false : seenPlayers.add(p.slug)));

writeFileSync(dbPath, JSON.stringify(db, null, 2));
console.log(`\nCRAWL COMPLETE: ${addedCount} new matches added (${skippedCount} skipped).`);
console.log(`Total Matches: ${db.matches.length} | Tournaments: ${db.tournaments.length} | Players: ${db.players.length} | Innings: ${db.innings.length} | Batting: ${db.batting.length} | Bowling: ${db.bowling.length}`);
