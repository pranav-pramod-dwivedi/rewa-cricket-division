#!/usr/bin/env node
// Fetch Cricbuzz scorecards via MOBILE HTML (all innings in DOM, no tab clicks, no browser).
// Usage: node scripts/fetch_mobile.mjs <urls-file> [out-file]
import { readFileSync, writeFileSync } from 'node:fs';

const urlsFile = process.argv[2];
const outFile = process.argv[3] || '/tmp/mob_sc.jsonl';
const urls = readFileSync(urlsFile, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

async function fetchOne(url) {
  // convert desktop URL to mobile if needed
  const mob = url.replace('www.cricbuzz.com', 'm.cricbuzz.com');
  const res = await fetch(mob, { headers: { 'User-Agent': UA, 'Accept': 'text/html' } });
  const html = await res.text();
  // extract innings: collect header divs and scard bodies independently, pair by (teamId, innings)
  const headers = {};
  const hparts = html.split(/id="team-(\d+)-innings-(\d+)"/);
  for (let i = 1; i + 2 < hparts.length; i += 3) {
    const key = hparts[i] + '-' + hparts[i + 1];
    const content = hparts[i + 2] || '';
    headers[key] = content.slice(0, content.indexOf('id="scard-team-'));
  }
  const bodies = {};
  const bparts = html.split(/id="scard-team-(\d+)-innings-(\d+)"/);
  for (let i = 1; i + 2 < bparts.length; i += 3) {
    const key = bparts[i] + '-' + bparts[i + 1];
    const content = bparts[i + 2] || '';
    // body ends at next scard or footer or team header
    const endIdx = content.search(/id="scard-team-\d+-innings-\d+"|class="cb-footer|id="team-\d+-innings-\d+"/);
    bodies[key] = content.slice(0, endIdx < 0 ? content.length : endIdx);
  }
  const strip = (h) => h.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\n{2,}/g, '\n').trim();
  const sections = [];
  const keys = [...new Set([...Object.keys(headers), ...Object.keys(bodies)])];
  for (const k of keys) sections.push(strip(headers[k] || '') + '\n' + strip(bodies[k] || ''));
  let text = '';
  if (sections.length) {
    text = sections.join('\n\n');
  } else {
    text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/\n{2,}/g, '\n').trim();
  }
  // also grab the info section (title, series, date, venue)
  const titleM = html.match(/<title>([^<]+)/);
  const startM = html.match(/"startDate":"([^"]+)/);
  const venueM = html.match(/Venue[^<]*<\/span>\s*<[^>]*>([^<]+)/) || html.match(/"venue":"([^"]+)/);
  return { url: mob, title: titleM?.[1]?.trim() || '', startDate: startM?.[1] || '', venue: venueM?.[1]?.trim() || '', text };
}

const out = [];
for (const u of urls) {
  try {
    const r = await fetchOne(u);
    out.push(JSON.stringify(r));
    console.log('fetched', u.split('/')[4], '| text len:', r.text.length, '| sections ok');
  } catch (e) {
    console.log('ERR', u, e.message);
  }
  await new Promise((r) => setTimeout(r, 800));
}
writeFileSync(outFile, out.join('\n'));
console.log('DONE →', outFile, '(' + out.length + ' matches)');
