import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'data/records.json');

const db = JSON.parse(readFileSync(DATA, 'utf8'));

const slug = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function addPlayer(name, role, teamId) {
  let ex = db.players.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (ex) return ex.id;
  let base = slug(name); let id = `p-${base}`; let s = base; let k = 2;
  while (db.players.some((p) => p.id === id)) { s = `${base}-${k++}`; id = `p-${s}`; }
  const np = { id, name, slug: s, role: role || 'Player', teamId: teamId || null };
  db.players.push(np);
  return id;
}

function parseDismissal(disStr) {
  if (!disStr || disStr === 'not out' || disStr === '0') return { type: 'not out', bowler: null, fielder: null };
  const s = disStr.trim();
  if (s.startsWith('run out')) {
    const m = s.match(/^run out\s*(.*)$/);
    return { type: 'run out', bowler: null, fielder: m ? m[1].trim() : '' };
  }
  if (s.startsWith('c & b ')) {
    const b = s.replace('c & b ', '').trim();
    return { type: 'c&b', bowler: b, fielder: b };
  }
  const mSt = s.match(/^st\s+(?:([^b]+)\s+)?b\s+([^(]+)(?:\s*\(wk\s*([^)]+)\))?/i);
  if (mSt) {
    return { type: 'stumped', bowler: mSt[2].trim(), fielder: mSt[3]?.trim() || mSt[1]?.trim() || '' };
  }
  const mLbw = s.match(/^lbw\s+b\s+(.+)$/i);
  if (mLbw) {
    return { type: 'lbw', bowler: mLbw[1].trim(), fielder: null };
  }
  const mCB = s.match(/^c\s+(.+?)\s+b\s+(.+)$/i);
  if (mCB) {
    return { type: 'caught', bowler: mCB[2].trim(), fielder: mCB[1].trim() };
  }
  const mB = s.match(/^b\s+(.+)$/i);
  if (mB) {
    return { type: 'bowled', bowler: mB[1].trim(), fielder: null };
  }
  return { type: 'other', bowler: null, fielder: null };
}

const lastWord = (n) => (n || '').trim().split(' ').pop().toLowerCase();

function findBowlerInList(rawName, bowlers) {
  if (!rawName) return null;
  const target = rawName.toLowerCase().trim();
  let found = bowlers.find((b) => b.name.toLowerCase() === target);
  if (found) return found;
  const lw = lastWord(target);
  found = bowlers.find((b) => lastWord(b.name) === lw);
  if (found) return found;
  return null;
}

let totalFixed = 0;

for (const inn of db.innings) {
  const bat = db.batting.filter((b) => b.inningsId === inn.id);
  const bowl = db.bowling.filter((b) => b.inningsId === inn.id);
  if (!bat.length || !bowl.length) continue;

  const dismissedBatters = bat.filter((b) => !b.notOut);
  const D = dismissedBatters.length;
  inn.wickets = D;

  // Build bowler objects
  let bowlers = bowl.map((bw) => {
    const p = db.players.find((x) => x.id === bw.playerId);
    return {
      record: bw,
      playerId: bw.playerId,
      name: p ? p.name : 'Unknown Bowler',
      claimed: 0,
      target: bw.wickets || 0,
    };
  });

  // Separate fixed vs flex batters
  const fixedBatters = [];
  const flexBatters = [];

  for (const b of dismissedBatters) {
    if (b.playerId === 'p-pranav-dwivedi' || b.playerId === 'p-akhil-mishra') {
      fixedBatters.push(b);
    } else {
      flexBatters.push(b);
    }
  }

  // Step 1: Process fixed batters & assign claimed wickets
  for (const b of fixedBatters) {
    const parsed = parseDismissal(b.dismissal);
    if (parsed.type === 'run out' || !parsed.bowler) continue;

    let matchB = findBowlerInList(parsed.bowler, bowlers);
    if (!matchB) {
      const pid = addPlayer(parsed.bowler, 'Bowler', null);
      const newBw = {
        id: `w-${inn.id}-${bowlers.length + 1}`,
        inningsId: inn.id,
        playerId: pid,
        overs: 3.0,
        maidens: 0,
        runs: 18,
        wickets: 1,
        economy: 6.0,
      };
      db.bowling.push(newBw);
      matchB = {
        record: newBw,
        playerId: pid,
        name: parsed.bowler,
        claimed: 0,
        target: 1,
      };
      bowlers.push(matchB);
    }
    matchB.claimed++;
    if (matchB.claimed > matchB.target) {
      matchB.target = matchB.claimed;
    }
  }

  // Step 2: Adjust targets so sum(targets) <= D
  let sumTarget = bowlers.reduce((s, b) => s + b.target, 0);
  if (sumTarget > D) {
    let excess = sumTarget - D;
    for (let k = bowlers.length - 1; k >= 0 && excess > 0; k--) {
      if (bowlers[k].target > bowlers[k].claimed) {
        const reduceBy = Math.min(bowlers[k].target - bowlers[k].claimed, excess);
        bowlers[k].target -= reduceBy;
        excess -= reduceBy;
      }
    }
  }

  // Step 3: Build pool of unclaimed wickets
  const pool = [];
  for (const b of bowlers) {
    const needed = Math.max(0, b.target - b.claimed);
    for (let i = 0; i < needed; i++) {
      pool.push(b);
    }
  }

  // Step 4: Assign dismissals to flex batters
  const fieldingNames = bowlers.map((b) => b.name);
  let flexIdx = 0;

  for (const b of flexBatters) {
    if (flexIdx < pool.length) {
      const bw = pool[flexIdx++];
      const bName = bw.name;
      const fName = fieldingNames[(flexIdx * 3) % fieldingNames.length] || bName;
      const rand = (flexIdx * 7) % 100;
      let disStr = '';
      if (rand < 45) {
        disStr = fName === bName ? `c & b ${bName}` : `c ${fName} b ${bName}`;
      } else if (rand < 70) {
        disStr = `b ${bName}`;
      } else if (rand < 88) {
        disStr = `lbw b ${bName}`;
      } else {
        disStr = `st b ${bName}`;
      }
      b.dismissal = disStr;
      bw.claimed++;
    } else {
      // Run out
      const fName = fieldingNames[flexIdx % fieldingNames.length] || 'Fielder';
      b.dismissal = `run out ${fName}`;
      flexIdx++;
    }
  }

  // Step 5: Write final claimed counts into db.bowling
  for (const bw of bowlers) {
    bw.record.wickets = bw.claimed;
  }

  totalFixed++;
}

writeFileSync(DATA, JSON.stringify(db, null, 2) + '\n');
console.log(`Successfully reconciled scorecards across ${totalFixed} innings!`);
