#!/usr/bin/env node
// Clean mobile scorecard text: drop nav noise, keep innings tables in parser format.
// Reads /tmp/mob_sc.jsonl -> writes /tmp/mob_clean.jsonl
import { readFileSync, writeFileSync } from 'node:fs';

const src = process.argv[2] || '/tmp/mob_sc.jsonl';
const out = process.argv[3] || '/tmp/mob_clean.jsonl';

const lines = readFileSync(src, 'utf8').trim().split('\n').filter(Boolean);
const cleaned = [];
for (const l of lines) {
  const o = JSON.parse(l);
  let t = o.text || '';
  // drop noise lines
  t = t.split('\n').filter((ln) => {
    const s = ln.trim();
    if (!s) return false;
    if (/^View match performance$/i.test(s)) return false;
    if (/^View profile$/i.test(s)) return false;
    if (/^id="scard-team-\d+-innings-\d+"$/.test(s)) return false;
    return true;
  }).join('\n');
  // normalize innings headers: "MP 1st Innings Madhya Pradesh 1st Innings 425-8 d (140 Ov)" -> "Madhya Pradesh 1st Innings 425-8 d (140 Ov)"
  t = t.replace(/([A-Z]{2,5}) (\d+)(?:st|nd|rd|th) Innings\n[A-Z][A-Za-z ]+? \1? ?(\d+)(?:st|nd|rd|th) Innings\n/g, '$1 $2 Innings\n');
  cleaned.push(JSON.stringify({ ...o, text: t }));
}
writeFileSync(out, cleaned.join('\n'));
console.log('cleaned', cleaned.length, '→', out);
