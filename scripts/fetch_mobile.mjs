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
  // extract innings sections from DOM: pair header (team-*) + body (scard-team-*)
  const sections = [];
  const pairRe = /id="team-(\d+)-innings-(\d+)"[^>]*>([\s\S]*?)(?=id="team-\d+-innings-\d+"|class="cb-footer)/g;
  let pm;
  while ((pm = pairRe.exec(html))) {
    const headHtml = pm[3] || '';
    // find matching scard body (same team+innings)
    const bodyM = html.match(new RegExp('id="scard-team-' + pm[1] + '-innings-' + pm[2] + '"[\s\S]*?(?=id="(?:scard-)?team-\\d+-innings-\\d+"|class="cb-footer|class="cb-col-100 cb-col cb-mtchs-lst)', 'g'));
    const bodyHtml = bodyM ? bodyM[0] : '';
    const strip = (h) => h.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\n{2,}/g, '\n').trim();
    sections.push(strip(headHtml) + '\n' + strip(bodyHtml));
  }
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
