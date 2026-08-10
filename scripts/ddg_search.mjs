#!/usr/bin/env node
// DuckDuckGo HTML search → extract result URLs (bypasses broken search provider).
// Usage: node scripts/ddg_search.mjs "query" [maxResults] [domainFilter]
const q = process.argv[2];
const max = Number(process.argv[3] || '10');
const domain = process.argv[4] || '';
const results = [];
for (let page = 0; page < Math.ceil(max / 30); page++) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}${page ? `&s=${page * 30}` : ''}`;
  const html = await (await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' } })).text();
  const links = [...html.matchAll(/uddg=([^&"]+)/g)].map((m) => decodeURIComponent(m[1]));
  for (const l of links) {
    if (!results.includes(l) && (!domain || l.includes(domain))) results.push(l);
  }
  if (results.length >= max) break;
  await new Promise((r) => setTimeout(r, 1500));
}
console.log(results.slice(0, max).join('\n'));
