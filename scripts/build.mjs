#!/usr/bin/env node
// ============================================================
// Rewa Cricket Division — static site builder (vanilla Node).
// Reads JSON data -> generates real .html files with SEO +
// JSON-LD baked in. No framework. Output goes to dist/.
//
// To migrate later (Astro/Next/etc.): keep data/ + this URL
// structure; the generated HTML is throwaway.
// ============================================================

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');
const DATA = join(ROOT, 'data');

const SITE = (process.env.SITE_URL || 'https://rewa-cricket-division.vercel.app').replace(/\/$/, '');

// ---------- data ----------
const org = JSON.parse(readFileSync(join(DATA, 'organization.json'), 'utf8'));
const db = JSON.parse(readFileSync(join(DATA, 'records.json'), 'utf8'));
const dsyw = JSON.parse(readFileSync(join(DATA, 'dsyw.json'), 'utf8'));

// Production domain (confirmed) — used when SITE_URL is not set.
// Override per deploy: SITE_URL=https://... npm run build

// ---------- helpers ----------
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const absUrl = (p) => SITE + (p.startsWith('/') ? p : '/' + p);

const ld = (obj) =>
  `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;

const titleFor = (t) => (t === org.name ? org.name : `${t} | ${org.name}`);

// team-name disambiguation for player page titles (common names collide)
const teamOf = (p) => (p.teamId ? teamsById.get(p.teamId) : null);

function head({ title, description, path, jsonLd = [], ogType = 'website' }) {
  const blocks = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(titleFor(title))}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${absUrl(path)}" />
<meta property="og:site_name" content="${esc(org.name)}" />
<meta property="og:title" content="${esc(titleFor(title))}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:type" content="${ogType}" />
<meta property="og:url" content="${absUrl(path)}" />
<meta property="og:image" content="${absUrl('/img/og-cover.png')}" />
<meta property="og:image:width" content="1672" />
<meta property="og:image:height" content="941" />
<meta property="og:image:alt" content="${esc(org.name)} — सफ़ेद शेरों की धरती, Land of the White Tigers" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(titleFor(title))}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${absUrl('/img/og-cover.png')}" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="stylesheet" href="/css/styles.css" />
${blocks.map(ld).join('\n')}
</head>`;
}

const NAV = [
  ['Home', '/'],
  ['About', '/about/'],
  ['News', '/news/'],
  ['Matches', '/matches/'],
  ['Tournaments', '/tournaments/'],
  ['Archive', '/archive/'],
  ['Teams', '/teams/'],
  ['Players', '/players/'],
  ['Venues', '/venues/'],
  ['Stats', '/stats/'],
  ['Contact', '/contact/'],
];

function header(pinned = false) {
  const searchIcon = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
  const search = pinned
    ? `<form class="header-search" role="search" action="/search/" method="get">
      <label class="sr-only" for="q">Search the archive</label>
      <span class="header-search-icon">${searchIcon}</span>
      <input id="q" name="q" type="search" placeholder="Search players, teams, matches…" autocomplete="off" />
      <button class="header-search-clear" type="button" data-search-clear aria-label="Clear search" hidden>&#10005;</button>
      <button class="btn btn-primary header-search-go" type="submit">Search</button>
    </form>`
    : `<a class="header-search-btn" href="/search/" aria-label="Search the archive" title="Search the archive">${searchIcon}</a>`;
  return `<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="/" aria-label="${esc(org.name)} — home">
      <img class="brand-logo" src="/img/logo-rewa-official.jpg" alt="Official emblem of Rewa District, Madhya Pradesh" width="44" height="44" />
      <span class="brand-text">
        <strong>${esc(org.name)}</strong>
        <small>Official Archive</small>
      </span>
    </a>
    <button class="nav-toggle" data-nav-toggle aria-expanded="false" aria-controls="nav" aria-label="Toggle menu">&#9776;</button>
    <nav class="main-nav" data-nav id="nav" aria-label="Primary">
      <ul>
        ${NAV.map(([name, path]) => `<li><a href="${path}">${name}</a></li>`).join('\n')}
      </ul>
    </nav>
    ${search}
  </div>
</header>`;
}

function footer() {
  return `<footer class="site-footer">
  <div class="container">
    <div>
      <div class="footer-brand">
        <img src="/img/logo-rewa-official.jpg" alt="Official emblem of Rewa District" width="40" height="40" />
        <h3>${esc(org.name)}</h3>
      </div>
      <p class="footer-note">The official archive of the ${esc(org.name)}, built with the permission of the division. सफ़ेद शेरों की धरती — Land of the White Tigers.</p>
    </div>
    <div>
      <h3>Explore</h3>
      <ul>
        <li><a href="/matches/">Matches &amp; Results</a></li>
        <li><a href="/tournaments/">Tournaments</a></li>
        <li><a href="/records/">Records</a></li>
        <li><a href="/academy/">Women's Cricket Academy</a></li>
        <li><a href="${esc(dsyw.source)}" rel="noopener">MP Sports &amp; Youth Welfare</a></li>
        <li><a href="/contact/">Contact</a></li>
      </ul>
    </div>
    <div>
      <h3>Official</h3>
      <p class="footer-note">Archive operated with the permission of the ${esc(org.name)}.</p>
    </div>
  </div>
  <div class="footer-bottom">
    <div class="container footer-legal">
      <p class="footer-copyright">&copy; <span data-year>${new Date().getFullYear()}</span> ${esc(org.name)}. All rights reserved.</p>
      <p class="footer-about">The ${esc(org.name)} archive is a permanent, searchable record of organised cricket in the Rewa region — division competitions, local leagues, and the state and national matches of Rewa's players — built with the permission of the division and sourced only from official records. सफ़ेद शेरों की धरती · Land of the White Tigers.</p>
    </div>
  </div>
</footer>
<script src="/js/main.js" defer></script>
</body>
</html>`;
}

function layout({ title, description, path, jsonLd = [], ogType, breadcrumbs = [], bodyClass = '' }) {
  const crumbItems = [{ name: 'Home', path: '/' }, ...breadcrumbs];
  return `${head({ title, description, path, jsonLd, ogType })}
<body class="${bodyClass}">
${header(bodyClass.includes('search-pinned'))}
${breadcrumbs.length ? crumbs(crumbItems) : ''}
<main id="main">
<div class="container">`;
}

// needs layout()'s opening div closed per page via `closeLayout()`
const closeLayout = (crumbs) => (crumbs ? `</div></main>` : `</div></main>`) + footer();

function crumbs(items) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absUrl(it.path),
    })),
  };
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>
    ${items
      .map((it, i) => {
        const last = i === items.length - 1;
        return last
          ? `<li><span aria-current="page">${esc(it.name)}</span></li>`
          : `<li><a href="${it.path}">${esc(it.name)}</a></li>`;
      })
      .join('\n')}
  </ol></nav>${ld(jsonLd)}`;
}

const empty = (title, body) => `<div class="empty">
  <div class="empty-icon">&#127951;</div>
  <h3>${esc(title)}</h3>
  <p>${esc(body)}</p>
</div>`;

// ---------- relation maps ----------
const teamsById = new Map(db.teams.map((t) => [t.id, t]));
const tourneysById = new Map(db.tournaments.map((t) => [t.id, t]));
const venuesById = new Map(db.venues.map((v) => [v.id, v]));
const seasonsById = new Map(db.seasons.map((s) => [s.id, s]));

// ---------- official status ----------
const officialTournamentIds = new Set(db.tournaments.filter((t) => t.category === 'official').map((t) => t.id));
const matchTournamentOf = new Map(db.matches.map((m) => [m.id, m.tournamentId]));
const inningsMatchOf = new Map(db.innings.map((i) => [i.id, i.matchId]));
const officialPlayerIds = new Set();
for (const p of db.players) {
  const inOfficial = (card) => officialTournamentIds.has(matchTournamentOf.get(inningsMatchOf.get(card.inningsId)));
  if (db.batting.some((b) => b.playerId === p.id && inOfficial(b)) || db.bowling.some((b) => b.playerId === p.id && inOfficial(b))) officialPlayerIds.add(p.id);
}
const isOfficialPlayer = (pid) => officialPlayerIds.has(pid);
const isOfficialTournament = (tid) => officialTournamentIds.has(tid);
const verifiedTick = () =>
  `<span class="badge badge-official tick-svg" title="Verified official player"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 1.5a10.5 10.5 0 1 0 0 21 10.5 10.5 0 0 0 0-21zm-1.3 14.2L6.4 11.4l1.4-1.4 2.9 2.9 5.9-5.9 1.4 1.4-7.3 7.3z"/></svg><span class="sr-only">Verified official player</span></span>`;
const officialCardClass = (official) => (official ? ' card-official' : '');

const statusBadge = (s) => {
  const map = {
    scheduled: 'scheduled',
    live: 'live',
    completed: 'completed',
    abandoned: 'abandoned',
    cancelled: 'cancelled',
  };
  const cls = map[s] ?? 'scheduled';
  return `<span class="badge badge-${cls}">${esc(s)}</span>`;
};


const dateTxt = (m) => m.matchDate ?? 'Date TBA';
const scopeOf = (tourn) => (tourn ? tourn.scope || 'division' : 'division');
const scopeLabel = { division: 'Rewa Division match', state: 'State-level match', national: 'National match' };
const scopeBadge = (tourn) => {
  const s = scopeOf(tourn);
  if (s === 'division') return '';
  return `<span class="badge badge-${s}" title="External match featuring a Rewa player — part of the Rewa archive">${scopeLabel[s]}</span>`;
};
const dateSort = (a, b) => (b.matchDate ?? '9999') < (a.matchDate ?? '9999') ? -1 : (b.matchDate ?? '9999') > (a.matchDate ?? '9999') ? 1 : 0;

const matchCard = (m) => {
  const teamA = teamsById.get(m.teamAId);
  const teamB = teamsById.get(m.teamBId);
  const tourn = tourneysById.get(m.tournamentId);
  const venue = venuesById.get(m.venueId);
  return `<article class="card match-card">
    <div class="match-top">
      <span class="competition">${esc(tourn?.name ?? 'Match')}</span>
      ${scopeBadge(tourn)}${statusBadge(m.status)}
    </div>
    <div class="match-teams">
      <span class="team-name"><a href="/teams/${esc(teamA?.slug ?? '')}/">${esc(teamA?.name ?? 'Team A')}</a></span>
      <span class="vs">VS</span>
      <span class="team-name"><a href="/teams/${esc(teamB?.slug ?? '')}/">${esc(teamB?.name ?? 'Team B')}</a></span>
    </div>
    <div class="match-footer">
      ${m.status === 'completed' && m.resultText ? `<span class="result">${esc(m.resultText)}</span>` : `${esc(dateTxt(m))}${m.startTime ? ' · ' + esc(m.startTime) : ''}`}
      ${venue?.name ? ` · ${esc(venue.name)}` : ''}
    </div>
    <p style="margin-top:.6rem"><a class="btn btn-outline" href="/matches/${esc(m.slug)}/">Scorecard &amp; details</a></p>
  </article>`;
};

const orgLd = {
  '@context': 'https://schema.org',
  '@type': 'SportsOrganization',
  name: org.name,
  url: org.website,
  description: org.description,
  ...(org.headquarters
    ? { address: { '@type': 'PostalAddress', addressLocality: org.headquarters } }
    : {}),
};

const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: org.name,
  url: org.website,
  description: org.description,
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: absUrl('/search/?q={search_term_string}') },
    'query-input': 'required name=search_term_string',
  },
};

// ---------- page writers ----------
const pages = []; // for sitemap
const pageMeta = []; // for client-side search index

function writePage(relPath, html) {
  const file = join(DIST, relPath, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  pages.push(relPath === '' ? '/' : `/${relPath}/`);
  const t = html.match(/<title>(.*?)<\/title>/s)?.[1] ?? '';
  const d = html.match(/<meta name="description" content="(.*?)"/s)?.[1] ?? '';
  pageMeta.push({ path: relPath === '' ? '/' : `/${relPath}/`, title: t.replace(/\s+\| Rewa Cricket Division$/, '').replace(/&amp;/g, '&'), description: d });
}

function writeSearchIndex() {
  writeFileSync(join(DIST, 'search-index.json'), JSON.stringify(pageMeta));
  console.log(`search index: ${pageMeta.length} entries`);
}

// ---------- sitemap validation ----------
// Every canonical indexable HTML page written must appear exactly once in the
// sitemap; no stale/empty/duplicate URLs. Fails the build on mismatch.
function writeSitemap() {
  const locs = [...new Set(pages)].sort();
  const bad = pages.filter((p) => p.includes('//'));
  const dupes = locs.length !== pages.length;
  // walk dist to find any index.html not registered in pages
  const walk = (dir, out = []) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (e.name === 'index.html') out.push(p);
    }
    return out;
  };
  const onDisk = walk(DIST);
  const expect = locs.map((p) => join(DIST, p === '/' ? '' : p, 'index.html'));
  const missing = onDisk.filter((f) => !expect.includes(f));
  const notWritten = expect.filter((f) => !onDisk.includes(f));
  const problems = [];
  if (bad.length) problems.push(`invalid sitemap URLs: ${bad.join(', ')}`);
  if (dupes) problems.push(`duplicate page entries: ${pages.length} entries vs ${locs.length} unique`);
  if (missing.length) problems.push(`${missing.length} files on disk missing from sitemap (stale): ${missing.slice(0, 5).join(', ')}`);
  if (notWritten.length) problems.push(`${notWritten.length} sitemap URLs missing on disk: ${notWritten.slice(0, 5).join(', ')}`);
  if (problems.length) {
    console.error('SITEMAP VALIDATION FAILED:\n - ' + problems.join('\n - '));
    process.exit(1);
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${locs.map((p) => `  <url><loc>${absUrl(p)}</loc></url>`).join('\n')}
</urlset>
`;
  writeFileSync(join(DIST, 'sitemap.xml'), xml);
  console.log(`sitemap ok: ${locs.length} URLs, matches ${onDisk.length} pages on disk`);
}

// ============================================================
// HOME
// ============================================================
// "What's New" — content from the MP Directorate of Sports & Youth
// Welfare (dsywmp.gov.in), the parent sports body. Attributed, factual.
function dsywSection() {
  const src = dsyw.source;
  return `<section class="section whats-new">
    <div class="section-title"><div><p class="eyebrow">Madhya Pradesh Sports</p><h2>What's New — MP Sports &amp; Youth Welfare</h2></div>
    <a class="link" href="${esc(src)}" rel="noopener" target="_blank">Source: ${esc(dsyw.sourceName)} &nearr;</a></div>
    <div class="grid grid-2">
      ${dsyw.whatsNew.map((n) => `<div class="card"><h3 style="font-size:1rem">${esc(n.title)}</h3><p class="card-meta" style="margin-top:.5rem">${esc(n.body)}</p></div>`).join('\n')}
    </div>
    <div class="prose" style="max-width:72ch;margin-top:1.5rem"><p>${esc(dsyw.deptIntro)}</p></div>
    <div class="split" style="margin-top:1.5rem;align-items:start">
      <div class="stat-grid" style="grid-template-columns:repeat(4,1fr)">
        ${dsyw.keyStats.map((s) => `<div class="card stat"><div class="stat-value">${esc(s.value)}</div><div class="stat-label">${esc(s.label)}</div></div>`).join('\n')}
      </div>
      <ul style="margin-top:.25rem;line-height:2">
        ${dsyw.leadership.map((l) => `<li><strong>${esc(l.name)}</strong><div class="card-meta">${esc(l.role)}</div></li>`).join('\n')}
      </ul>
    </div>
    <h3 style="margin:2rem 0 .75rem">Press Releases &amp; Updates</h3>
    <div class="card notes-box" style="max-height:26rem;overflow-y:auto">
      <ol class="press-list">${dsyw.pressReleases.map((p) => `<li><span class="press-date">${esc(p.date)}</span> ${esc(p.title)}</li>`).join('\n')}</ol>
    </div>
    <h3 style="margin:2rem 0 .75rem">Important Events &amp; Schemes</h3>
    <div class="grid grid-2 grid-3">
      ${dsyw.importantEvents.map((e) => `<div class="card"><h3 style="font-size:1rem">${esc(e.title)}</h3><p class="card-meta" style="margin-top:.5rem">${esc(e.body)}</p></div>`).join('\n')}
    </div>
    <div class="split" style="margin-top:1.5rem">
      <div class="card"><h3 style="font-size:1rem">Khelo India</h3><p class="card-meta" style="margin-top:.5rem">${esc(dsyw.kheloIndia)}</p></div>
      <div class="card"><h3 style="font-size:1rem">Sports Science Centre</h3><p class="card-meta" style="margin-top:.5rem">${esc(dsyw.sportsScience)}</p></div>
    </div>
    <p class="card-meta" style="margin-top:1rem">Content reproduced from the official MP Directorate of Sports &amp; Youth Welfare website (<a href="${esc(src)}" rel="noopener" target="_blank">${esc(src.replace('https://', ''))}</a>) for reference. Check the source for the latest official updates.</p>
  </section>`;
}

function academyCard() {
  const a = dsyw.academy;
  return `<section class="section">
    <div class="split" style="align-items:center">
      <div class="prose">
        <p class="eyebrow">State Academy</p>
        <h2>${esc(a.title)}</h2>
        <p>${esc(a.body.slice(0, 220))}…</p>
        <p style="margin-top:1rem"><a class="btn btn-primary" href="/academy/">Visit the academy page</a> <a class="btn btn-ghost" href="${esc(a.pageUrl)}" rel="noopener" target="_blank">Original source &nearr;</a></p>
      </div>
      <a class="card" style="min-width:240px" href="/academy/">
        <img src="/img/academy/Cricket_Logo.jpg" alt="${esc(a.title)} — emblem" width="240" height="193" loading="lazy" />
      </a>
    </div>
  </section>`;
}

function renderHome() {
  const recent = [...db.matches].sort(dateSort).slice(0, 4);
  const news = allNews().slice(0, 3);

  let html = layout({
    title: org.name,
    description: org.description,
    path: '/',
    jsonLd: [orgLd, websiteLd],
  });

  html += `<section class="hero">
    <img class="hero-logo" src="/img/logo-rewa-official.jpg" alt="Official emblem of Rewa District" width="88" height="88" />
    <p class="eyebrow">सफ़ेद शेरों की धरती · Land of the White Tigers</p>
    <h1>The Official Home of Cricket in Rewa</h1>
    <p>${esc(org.description)}</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="/archive/">Explore the Archive</a>
      <a class="btn btn-ghost" href="/matches/">Matches &amp; Results</a>
      <a class="btn btn-ghost" href="/about/">About the Division</a>
    </div>
  </section>
  <div class="container">`;

  // archive positioning strip
  html += `<section class="section">
    <div class="split" style="align-items:center">
      <div class="prose">
        <p class="eyebrow">What this is</p>
        <h2>The ${esc(org.name)} Historical Archive</h2>
        <p>This site is the <strong>official historical archive</strong> of the ${esc(org.name)} — a permanent, searchable record of the division's competitions, teams, players, matches and statistics. It is built with the permission of the division and contains only verified, sourced information.</p>
        <p>The archive is organised in four layers:</p>
        <ul>
          <li><strong>Rewa Division competitions</strong> — inter-district, age-group and divisional tournaments organised by the RDCA.</li>
          <li><strong>Rewa teams &amp; players</strong> — every team and player appearing in recorded Rewa cricket.</li>
          <li><strong>Rewa tournaments</strong> — local leagues and cups with full results.</li>
          <li><strong>Rewa-related external matches</strong> — state and national matches (e.g. Madhya Pradesh in the Ranji Trophy, Rewa Jaguars in the MP League) archived because a Rewa player featured in them.</li>
        </ul>
      </div>
      <aside class="card" style="min-width:260px">
        <p class="eyebrow">The archive in numbers</p>
        <div class="stat-grid">
          <div class="card stat"><div class="stat-value">${db.matches.length}</div><div class="stat-label">Matches</div></div>
          <div class="card stat"><div class="stat-value">${db.players.length}</div><div class="stat-label">Players</div></div>
          <div class="card stat"><div class="stat-value">${db.teams.length}</div><div class="stat-label">Teams</div></div>
          <div class="card stat"><div class="stat-value">${db.tournaments.length}</div><div class="stat-label">Tournaments</div></div>
        </div>
      </aside>
    </div>
  </section>`;

  html += `<div class="split" style="margin-top:2.5rem">`;

  // sidebar
  html += `<aside>
    <section class="section">
      <div class="section-title"><div><p class="eyebrow">Announcements</p><h2 style="font-size:1.2rem">Latest News</h2></div>
      <a class="link" href="/news/">All &rarr;</a></div>
      ${
        news.length
          ? `<div class="grid">${news
              .map(
                (n) => `<div class="card"><a href="/news/${esc(n.slug)}/"><strong>${esc(n.title)}</strong><div class="card-meta">${esc(n.publishedAt)}</div></a></div>`,
              )
              .join('\n')}</div>`
          : `<p class="card-meta">Official announcements will be published here.</p>`
      }
    </section>
    <section class="section">
      <p class="eyebrow" style="margin-bottom:.75rem">At a glance</p>
      <div class="stat-grid">
        <div class="card stat"><div class="stat-value">${db.teams.length}</div><div class="stat-label">Teams</div></div>
        <div class="card stat"><div class="stat-value">${db.tournaments.length}</div><div class="stat-label">Tournaments</div></div>
        <div class="card stat"><div class="stat-value">${db.matches.length}</div><div class="stat-label">Matches</div></div>
        <div class="card stat"><div class="stat-value">${db.players.length}</div><div class="stat-label">Players</div></div>
      </div>
    </section>
  </aside>
  </div>

  <!-- match officials -->
  <section class="section">
    <div class="section-title"><div><p class="eyebrow">Who runs it</p><h2>Match Officials</h2></div>
    <a class="link" href="/about/">More &rarr;</a></div>
    <div class="grid grid-2">
      ${db.officials.length ? db.officials.map((o) => `<div class="card"><strong>${esc(o.name)}</strong><div class="card-meta">${esc(o.role)}</div>${o.bio ? `<p class="card-meta" style="margin-top:.5rem">${esc(o.bio)}</p>` : ''}</div>`).join('\n') : `<p class="card-meta">Official listings will be published once confirmed by the division.</p>`}
    </div>
  </section>

  <!-- official resources: govt + sports bodies -->
  <section class="section">
    <div class="section-title"><div><p class="eyebrow">Authoritative sources</p><h2>Official Resources</h2></div></div>
    <div class="grid grid-2 grid-3">
      <div class="card"><h3 style="font-size:1rem">Rewa District</h3><p class="card-meta">Government district portal for Rewa, Madhya Pradesh.</p><p style="margin-top:.6rem"><a href="https://rewa.nic.in" rel="noopener" target="_blank">rewa.nic.in &nearr;</a></p></div>
      <div class="card"><h3 style="font-size:1rem">Madhya Pradesh Government</h3><p class="card-meta">State government portal — the parent administration for the district.</p><p style="margin-top:.6rem"><a href="https://www.mp.gov.in" rel="noopener" target="_blank">mp.gov.in &nearr;</a></p></div>
      <div class="card"><h3 style="font-size:1rem">Board of Control for Cricket in India</h3><p class="card-meta">National governing body — state and national competitions archive.</p><p style="margin-top:.6rem"><a href="https://www.bcci.tv" rel="noopener" target="_blank">bcci.tv &nearr;</a></p></div>
    </div>
  </section>
  ${dsywSection()}
  ${academyCard()}
  </div>`;

  html += closeLayout();
  writePage('', html);
}

// ============================================================
// TEAMS
// ============================================================
function renderTeams() {
  let html = layout({
    bodyClass: 'search-pinned',
    title: 'Teams',
    description: 'Official teams competing under the Rewa Cricket Division.',
    path: '/teams/',
  });
  html += `<div class="page-head"><p class="eyebrow">Competition</p><h1>Teams</h1>
    <p>Official team profiles as confirmed by the division.</p></div>`;
  html += db.teams.length
    ? `<div class="grid grid-2 grid-3">${db.teams
        .map(
          (t) => `<a class="card row-card card-link" href="/teams/${esc(t.slug)}/">
            <span class="avatar avatar-sm">${esc(t.shortCode || t.name.split(' ').map((w) => w[0]).join('').slice(0, 2))}</span>
            <span><span class="card-title">${esc(t.name)}</span><div class="card-meta">${t.establishedYear ? 'Est. ' + t.establishedYear : 'Team'}</div></span>
          </a>`,
        )
        .join('\n')}</div>`
    : empty('No teams published yet', 'Official team profiles will appear here once confirmed by the Rewa Cricket Division.');
  html += closeLayout();
  writePage('teams', html);
}

function renderTeam(t) {
  const squad = db.players.filter((p) => p.teamId === t.id);
  const teamMatches = db.matches.filter((m) => m.teamAId === t.id || m.teamBId === t.id);
  const teamDesc = t.description && t.description.trim()
    ? t.description
    : `${t.name} — team profile, squad, matches and results from the Rewa Cricket Division archive.`;
  let html = layout({
    bodyClass: 'search-pinned',
    title: t.name,
    description: teamDesc,
    path: `/teams/${t.slug}/`,
    breadcrumbs: [{ name: 'Teams', path: '/teams/' }, { name: t.name, path: `/teams/${t.slug}/` }],
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'SportsTeam',
        name: t.name,
        url: absUrl(`/teams/${t.slug}/`),
        sport: 'Cricket',
        memberOf: { '@type': 'SportsOrganization', name: org.name },
      },
    ],
  });
  html += `<div class="page-head"><h1>${esc(t.name)}</h1>${t.establishedYear ? `<p>Established ${t.establishedYear}</p>` : ''}</div>`;
  if (t.description) html += `<p class="prose" style="max-width:62ch;margin-bottom:1.5rem">${esc(t.description)}</p>`;

  html += `<div class="split">
    <section class="section" style="margin-top:0">
      <h2>Matches</h2>
      <div class="grid" style="margin-top:1rem">
        ${teamMatches.length ? teamMatches.map(matchCard).join('\n') : empty('No matches yet', 'Match fixtures for this team will appear here when confirmed.')}
      </div>
    </section>
    <aside>
      <h2>Squad</h2>
      <div class="grid" style="margin-top:1rem">
        ${
          squad.length
            ? squad
                .map(
                  (p) => `<a class="card row-card card-link" href="/players/${esc(p.slug)}/">
                    <span class="avatar avatar-sm">${esc(p.name.split(' ').map((w) => w[0]).slice(0, 2).join(''))}</span>
                    <span><span class="card-title">${esc(p.name)}</span><div class="card-meta">${esc(p.role)}</div></span>
                  </a>`,
                )
                .join('\n')
            : `<p class="card-meta">Squad information will be published here when available.</p>`
        }
      </div>
    </aside>
  </div>`;
  html += closeLayout();
  writePage(`teams/${t.slug}`, html);
}

// ============================================================
// PLAYERS
// ============================================================
function renderPlayers() {
  let html = layout({
    bodyClass: 'search-pinned',
    title: 'Players',
    description: 'Official player profiles registered with the Rewa Cricket Division.',
    path: '/players/',
  });
  html += `<div class="page-head"><p class="eyebrow">Competition</p><h1>Players</h1>
    <p>Official player profiles as confirmed by the division.</p></div>`;
  html += db.players.length
    ? `<div class="grid grid-2 grid-3">${db.players
        .map((p) => {
          const team = p.teamId ? teamsById.get(p.teamId) : null;
          const official = isOfficialPlayer(p.id);
          return `<a class="card row-card card-link" href="/players/${esc(p.slug)}/">
            <span class="avatar avatar-sm">${esc(p.name.split(' ').map((w) => w[0]).slice(0, 2).join(''))}</span>
            <span><span class="card-title">${esc(p.name)} ${official ? verifiedTick() : ''}</span><div class="card-meta">${esc(p.role)}${team ? ' · ' + esc(team.name) : ''}</div></span>
          </a>`;
        })
        .join('\n')}</div>`
    : empty('No players published yet', 'Official player profiles will appear here once confirmed by the Rewa Cricket Division.');
  html += closeLayout();
  writePage('players', html);
}

function renderPlayer(p) {
  const team = p.teamId ? teamsById.get(p.teamId) : null;
  const pMatches = db.matches.filter((m) => m.teamAId === p.teamId || m.teamBId === p.teamId);  const batInns = db.batting.filter((b) => b.playerId === p.id);
  const bowlOvers = db.bowling.filter((b) => b.playerId === p.id);
  const batRuns = batInns.reduce((s, b) => s + (b.runs || 0), 0);
  const bowlWkts = bowlOvers.reduce((s, b) => s + (b.wickets || 0), 0);
  // teams he played for, derived from match history (batting card -> innings team; bowling card -> opposing team)
  const innById = new Map(db.innings.map((i) => [i.id, i]));
  const matchByInn = new Map(db.innings.map((i) => [i.id, db.matches.find((m) => m.id === i.matchId)]));
  const playedTeamIds = new Set();
  for (const b of batInns) { const inn = innById.get(b.inningsId); if (inn) playedTeamIds.add(inn.teamId); }
  for (const w of bowlOvers) {
    const inn = innById.get(w.inningsId);
    const m = inn && matchByInn.get(inn.id);
    if (m) playedTeamIds.add(m.teamAId === inn.teamId ? m.teamBId : m.teamAId);
  }
  const playedTeams = [...playedTeamIds].map((id) => teamsById.get(id)).filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
  const ageOf = (dob) => {
    if (!dob) return null;
    const d = new Date(dob);
    if (isNaN(d)) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age;
  };
  const age = ageOf(p.dateOfBirth);
  let html = layout({
    title: team ? `${p.name} — ${team.name}` : p.name,
    description: `${p.name} — ${p.role}${team ? ` for ${team.name}` : ''}, Rewa Cricket Division${p.battingStyle ? `, ${p.battingStyle}` : ''}.`,
    path: `/players/${p.slug}/`,
    bodyClass: 'profile search-pinned',
    breadcrumbs: [{ name: 'Players', path: '/players/' }, { name: p.name, path: `/players/${p.slug}/` }],
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: p.name,
      url: absUrl(`/players/${p.slug}/`),
      ...(p.dateOfBirth ? { birthDate: p.dateOfBirth } : {}),
      ...(p.bio ? { description: p.bio } : {}),
    },
  });
  html += `<div class="page-head"><h1>${esc(p.name)} ${isOfficialPlayer(p.id) ? verifiedTick() : ''}</h1><p>${esc(p.role)}${team ? ` · <a href="/teams/${esc(team.slug)}/">${esc(team.name)}</a>` : ''}</p></div>`;
  html += `<dl class="card dl-card" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem;max-width:720px;margin-bottom:1.5rem">
    ${[['Role', p.role], team ? ['Team', `<a href="/teams/${esc(team.slug)}/">${esc(team.name)}</a>`] : null, p.battingStyle ? ['Batting style', p.battingStyle] : null, p.bowlingStyle ? ['Bowling style', p.bowlingStyle] : null, p.dateOfBirth ? ['Born', `${p.dateOfBirth}${age !== null ? ` (${age} years)` : ''}`] : null, p.birthPlace ? ['Birth place', p.birthPlace] : null, ['Matches', batInns.length || '—'], ['Runs', batRuns || '—'], ['Wickets', bowlWkts || '—']]
      .filter(Boolean)
      .map(([k, v]) => `<div><dt style="font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">${esc(k)}</dt><dd style="font-weight:600;margin-top:.1rem">${v}</dd></div>`)
      .join('\n')}
  </dl>`;
  if (p.bio) html += `<section class="section"><h2>About</h2><p class="prose" style="max-width:62ch;margin-top:.6rem">${esc(p.bio)}</p></section>`;
  if (playedTeams.length) {
    html += `<section class="section"><h2>Teams</h2><div class="chip-row" style="margin-top:.6rem">${playedTeams.map((t) => `<a class="chip" href="/teams/${esc(t.slug)}/">${esc(t.name)}</a>`).join('')}</div></section>`;
  }

  // Rewa archive classification: external matches (state/national) on a Rewa player's record
  const extInn = db.innings.filter((i) => {
    const m = matchByInn.get(i.id);
    if (!m) return false;
    const t = tourneysById.get(m.tournamentId);
    return t && t.scope && t.scope !== 'division';
  });
  const extMatchIds = new Set(extInn.map((i) => matchByInn.get(i.id).id));
  const hasExt = batInns.some((b) => extMatchIds.has(matchByInn.get(innById.get(b.inningsId)?.id)?.id)) || bowlOvers.some((w) => extMatchIds.has(matchByInn.get(innById.get(w.inningsId)?.id)?.id));
  if (hasExt) {
    html += `<p class="card-meta" style="max-width:62ch;margin:.25rem 0 0">His career record includes external matches (Madhya Pradesh state / national competitions). These are part of the Rewa archive because they feature a Rewa player — see <a href="/archive/">the archive</a> for how the collection is organised.</p>`;
  }

  // ---- career stats: official (cricbuzz) if available, else computed from match data ----
  const statsSection = (() => {
    const fmtLabel = (f) => ({ 'Test': 'Test', 'ODI': 'ODI', 'T20': 'T20', 'IPL': 'IPL', 'FC': 'First-class', 'List A': 'List A' }[f] || f);
    const rows = [];
    let sourceNote = '';
    if (p.stats && (p.stats.batting || p.stats.bowling) && Object.keys(p.stats.batting || {}).length) {
      sourceNote = 'Official career statistics (source: Cricbuzz).';
      const b = p.stats.batting, bw = p.stats.bowling;
      const fmts = (b.formats || []);
      const fmtRow = (label, pick, def) => `<td>${esc(label)}</td>${fmts.map((f) => `<td class="num">${esc(pick(f) ?? def)}</td>`).join('')}`;
      const th = `<tr><th>Batting</th>${fmts.map((f) => `<th>${esc(fmtLabel(f))}</th>`).join('')}</tr>`;
      const body = [
        ['Matches', 'Matches'], ['Innings', 'Innings'], ['Runs', 'Runs'], ['Highest', 'Highest'], ['Average', 'Average'], ['Strike rate', 'SR'], ['Fours', 'Fours'], ['Sixes', 'Sixes'], ['50s', '50s'], ['100s', '100s'],
      ].map(([lab, key]) => `<tr>${fmtRow(lab, (f) => b.rows[key]?.[fmts.indexOf(f)] ?? '—', '—')}</tr>`).join('\n');
      let bow = '';
      if (bw && bw.formats) {
        const bfmts = bw.formats;
        bow = `<tr><th>Bowling</th>${bfmts.map((f) => `<th>${esc(fmtLabel(f))}</th>`).join('')}</tr>`
          + [['Matches', 'Matches'], ['Wickets', 'Wickets'], ['Average', 'Avg'], ['Economy', 'Eco'], ['Best', 'BBI']]
            .map(([lab, key]) => `<tr>${fmtRow(lab, (f) => bw.rows[key]?.[bfmts.indexOf(f)] ?? '—', '—')}</tr>`).join('\n');
      }
      rows.push(`<div class="table-wrap"><h3 style="margin:.6rem .9rem">Career statistics</h3><table><thead>${th}</thead><tbody>${body}${bow}</tbody></table></div>`);
    } else {
      // computed fallback from compiled match data, grouped by format
      sourceNote = 'Computed from Rewa Cricket Division match archive (compiled scorecards).';
      const fmtOf = (tid) => {
        const t = tourneysById.get(tid);
        if (!t) return 'Other';
        if (/first-class|multi-day/i.test(t.format)) return 'First-class';
        if (/list a|odi/i.test(t.format)) return 'List A';
        if (/t20|twenty/i.test(t.format)) return 'T20';
        return t.format || 'Other';
      };
      const perFmt = new Map();
      const get = (f) => { if (!perFmt.has(f)) perFmt.set(f, { inns: 0, runs: 0, balls: 0, fours: 0, sixes: 0, notOut: 0, dismissals: 0, hs: 0, wkts: 0, bowlRuns: 0, bowlBalls: 0, overs: 0, bowlMaidens: 0, bbiW: 0, bbiR: 0, matches: new Set() }); return perFmt.get(f); };
      for (const b of batInns) {
        const inn = innById.get(b.inningsId); const m = inn && matchByInn.get(inn.id);
        const f = m ? fmtOf(m.tournamentId) : 'Other';
        const s = get(f); s.inns++; s.runs += b.runs || 0; s.balls += b.balls || 0; s.fours += b.fours || 0; s.sixes += b.sixes || 0;
        if (b.notOut) s.notOut++; else s.dismissals++;
        if ((b.runs || 0) > s.hs) s.hs = b.runs;
        if (m) s.matches.add(m.id);
      }
      for (const w of bowlOvers) {
        const inn = innById.get(w.inningsId); const m = inn && matchByInn.get(inn.id);
        const f = m ? fmtOf(m.tournamentId) : 'Other';
        const s = get(f); s.wkts += w.wickets || 0; s.bowlRuns += w.runs || 0; s.bowlBalls += Math.round((w.overs || 0) * 6); s.overs += w.overs || 0; s.bowlMaidens += w.maidens || 0;
        if (m) s.matches.add(m.id);
        if ((w.wickets || 0) > s.bbiW || ((w.wickets || 0) === s.bbiW && (w.runs || 0) < s.bbiR)) { s.bbiW = w.wickets || 0; s.bbiR = w.runs || 0; }
      }
      const fmts = [...perFmt.keys()].sort((a, b) => (a === 'First-class' ? -1 : b === 'First-class' ? 1 : a.localeCompare(b)));
      if (fmts.length) {
        const th = `<tr><th></th>${fmts.map((f) => `<th>${esc(f)}</th>`).join('')}</tr>`;
        const cell = (f, fn) => `<td class="num">${fn(perFmt.get(f))}</td>`;
        const rowsHtml = [
          ['Matches', (s) => s.matches.size || '—'], ['Innings', (s) => s.inns || '—'], ['Runs', (s) => s.runs || '—'], ['Highest', (s) => s.hs || '—'],
          ['Average', (s) => (s.dismissals ? (s.runs / s.dismissals).toFixed(2) : s.runs ? '—' : '—')], ['Strike rate', (s) => (s.balls ? ((s.runs / s.balls) * 100).toFixed(2) : '—')],
          ['Wickets', (s) => s.wkts || '—'], ['Bowling avg', (s) => (s.wkts ? (s.bowlRuns / s.wkts).toFixed(2) : '—')], ['Economy', (s) => (s.overs ? (s.bowlRuns / s.overs).toFixed(2) : '—')], ['Best bowling', (s) => (s.bbiW ? `${s.bbiW}/${s.bbiR}` : '—')],
        ].map(([lab, fn]) => `<tr><td>${esc(lab)}</td>${fmts.map((f) => cell(f, fn)).join('')}</tr>`).join('\n');
        rows.push(`<div class="table-wrap"><h3 style="margin:.6rem .9rem">Career statistics</h3><table><thead>${th}</thead><tbody>${rowsHtml}</tbody></table></div>`);
      }
    }
    if (!rows.length) return '';
    return `<section class="section"><h2>Statistics</h2><p class="card-meta" style="margin:.4rem 0 .9rem">${esc(sourceNote)}</p><div class="grid" style="margin-top:.4rem">${rows.join('\n')}</div></section>`;
  })();
  html += statsSection;

  // career tables — first column = linked match, not dismissal
  const innOf = (id) => db.innings.find((i) => i.id === id);
  const matchOf = (inn) => inn && db.matches.find((x) => x.id === inn.matchId);
  const matchLabel = (m) => {
    const a = teamsById.get(m?.teamAId);
    const b = teamsById.get(m?.teamBId);
    return `${a?.shortCode ?? 'A'} v ${b?.shortCode ?? 'B'} · ${m?.matchDate ?? ''}`;
  };
  const batRows = batInns.length
    ? `<table><thead><tr><th>Match</th><th class="num">R</th><th class="num">B</th><th class="num">4s</th><th class="num">6s</th><th class="num">SR</th><th>Dismissal</th></tr></thead><tbody>${batInns.map((b) => { const m = matchOf(innOf(b.inningsId)); return `<tr><td>${m ? `<a href="/matches/${esc(m.slug)}/">${esc(matchLabel(m))}</a>` : '—'}</td><td class="num">${b.runs}</td><td class="num">${b.balls ? b.balls : '—'}</td><td class="num">${b.fours ?? 0}</td><td class="num">${b.sixes ?? 0}</td><td class="num">${b.strikeRate?.toFixed(2) ?? '—'}</td><td>${esc(b.dismissal || 'not out')}</td></tr>`; }).join('\n')}</tbody></table>`
    : '';

  const bowlRows = bowlOvers.length
    ? `<table><thead><tr><th>Match</th><th class="num">O</th><th class="num">M</th><th class="num">R</th><th class="num">W</th><th class="num">Econ</th></tr></thead><tbody>${bowlOvers.map((b) => { const m = matchOf(innOf(b.inningsId)); return `<tr><td>${m ? `<a href="/matches/${esc(m.slug)}/">${esc(matchLabel(m))}</a>` : '—'}</td><td class="num">${b.overs}</td><td class="num">${b.maidens}</td><td class="num">${b.runs}</td><td class="num">${b.wickets}</td><td class="num">${b.economy?.toFixed(2) ?? '—'}</td></tr>`; }).join('\n')}</tbody></table>`
    : '';

  if (batRows || bowlRows) {
    html += `<section class="section"><h2>Career statistics</h2><div class="grid" style="margin-top:1rem">`;
    if (batRows) html += `<div class="table-wrap"><h3 style="margin:.6rem .9rem">Batting</h3>${batRows}</div>`;
    if (bowlRows) html += `<div class="table-wrap"><h3 style="margin:.6rem .9rem">Bowling</h3>${bowlRows}</div>`;
    html += `</div></section>`;
  }
  html += closeLayout();
  writePage(`players/${p.slug}`, html);
}

// ============================================================
// ARCHIVE — Rewa Division Archive hierarchy
// ============================================================
// Rule: if a match has at least one Rewa player, the match is in, the tournament is in.
const ARCHIVE = [
  {
    id: 'inter-district',
    name: 'Inter-District',
    desc: 'Official inter-district tournaments of the Rewa zone, conducted under MPCA / RDCA.',
    groups: [
      { name: 'Senior Men', tids: ['t-senior-2018'] },
      { name: 'U-22', tids: ['t-u22-2018', 't-u22-2020'] },
      { name: 'U-18', tids: ['t-u18-2018', 't-gaykawad-2021'] },
      { name: 'U-15', tids: ['t-u15-2018', 't-u15-2022'] },
      { name: 'U-14', tids: [] },
      { name: 'Senior Women', tids: [] },
      { name: 'Girls U-19', tids: [] },
      { name: 'Girls U-16', tids: [] },
    ],
  },
  {
    id: 'inter-school',
    name: 'Inter-School',
    desc: 'Inter-school cricket competitions in the Rewa district.',
    groups: [],
  },
  {
    id: 'mpca-inter-club',
    name: 'MPCA Inter-Club',
    desc: 'MPCA-sanctioned inter-club competitions (A Grade).',
    groups: [{ name: 'A Grade', tids: [] }],
  },
  {
    id: 'historical-inter-divisional',
    name: 'Historical Inter-Divisional',
    desc: 'Historical inter-divisional trophies of Madhya Pradesh cricket.',
    groups: [
      { name: 'M.Y. Memorial Trophy', tids: [] },
      { name: 'Hiralal Gaekwad Trophy', tids: ['t-gaykawad-2021'] },
      { name: 'Parmanand Bhai Patel Trophy', tids: ['t-u22-2018', 't-u22-2020'] },
      { name: 'Other Historical Competitions', tids: [] },
    ],
  },
  {
    id: 'bcci-competitions',
    name: 'BCCI Competitions',
    desc: 'National BCCI competitions. Rewa players feature for Madhya Pradesh.',
    dynamic: 'bcci',
    groups: [
      { name: 'Ranji Trophy', tids: [] },
      { name: 'Vijay Hazare Trophy', tids: [] },
      { name: 'Syed Mushtaq Ali Trophy', tids: [] },
      { name: 'CK Nayudu Trophy', tids: [] },
      { name: 'U-23 State A', tids: [] },
      { name: 'Cooch Behar Trophy', tids: [] },
      { name: 'Vinoo Mankad Trophy', tids: [] },
      { name: 'Vijay Merchant Trophy', tids: [] },
    ],
  },
  {
    id: 'mpca-inter-divisional',
    name: 'MPCA Inter-Divisional',
    desc: 'MPCA inter-divisional championships.',
    groups: [
      { name: 'Senior', tids: ['t-senior-2018'] },
      { name: 'U-23', tids: ['t-u23-2018'] },
      { name: 'U-19', tids: [] },
      { name: 'U-16', tids: [] },
      { name: 'Women\'s Competitions', tids: [] },
    ],
  },
  {
    id: 'rewa-cricket-division',
    name: 'Rewa Cricket Division',
    desc: 'Rewa Cricket Division competitions, local tournaments and the Rewa Jaguars franchise.',
    groups: [
      { name: 'District Competitions', tids: ['t-u23-2018', 't-u15-2018', 't-u18-2018', 't-senior-2018'] },
      { name: 'Local Tournaments', tids: ['t-rainy-celebration-cup-2026-2026', 't-gk-electrical-battery-series-2026-2026', 't-rainy-cup-season-4-2026', 't-mitra-mandali-league-2026', 't-vindhyachal-premier-league-2026'] },
      { name: 'MPL Franchise (Rewa Jaguars)', tids: ['t-mpl-2025', 't-mppl-2026'] },
      { name: 'RCD Matches', tids: [] },
      { name: 'Historical Archive', tids: [] },
    ],
  },
];

function tournCard(t) {
  const season = seasonsById.get(t.seasonId);
  const official = isOfficialTournament(t.id);
  return `<a class="card card-link${officialCardClass(official)}" href="/tournaments/${esc(t.slug)}/">
    <p class="eyebrow">${esc(t.format)} · ${season?.year ?? 'Season'}</p>
    <span class="card-title">${esc(t.name)}</span>
    <div class="card-meta">${esc(t.status)}${official ? ` · ${esc(t.governingBody ?? 'Official')}` : ' · Local/Community'}</div>
  </a>`;
}

function renderArchiveIndex() {
  let html = layout({
    bodyClass: 'search-pinned',
    title: 'Rewa Division Archive',
    description: 'Complete archive of Rewa Division cricket — inter-district, inter-school, MPCA, BCCI and historical competitions.',
    path: '/archive/',
    breadcrumbs: [{ name: 'Archive', path: '/archive/' }],
  });
  html += `<div class="page-head"><p class="eyebrow">Archive</p><h1>Rewa Division Archive</h1>
    <p>The complete archive. A match is included if it features at least one Rewa player.</p></div>`;
  html += `<div class="grid grid-2">${ARCHIVE.map((cat) => {
    const count = cat.groups.reduce((s, g) => s + g.tids.length, 0);
    return `<a class="card card-link" href="/archive/${esc(cat.id)}/">
      <span class="card-title">${esc(cat.name)}</span>
      <div class="card-meta">${count} ${count === 1 ? 'tournament' : 'tournaments'} recorded</div>
    </a>`;
  }).join('\n')}</div>`;
  html += closeLayout();
  writePage('archive', html);
}

function renderArchiveCategory(cat) {
  const slug = cat.id;
  let html = layout({
    title: cat.name,
    description: cat.desc,
    path: `/archive/${slug}/`,
    breadcrumbs: [{ name: 'Archive', path: '/archive/' }, { name: cat.name, path: `/archive/${slug}/` }],
  });
  html += `<div class="page-head"><p class="eyebrow">Archive</p><h1>${esc(cat.name)}</h1><p>${esc(cat.desc)}</p></div>`;
  if (cat.groups.length) {
    for (const g of cat.groups) {
      let ts = g.tids.map((id) => tourneysById.get(id)).filter(Boolean);
      // dynamic BCCI groups: auto-fill from tournaments whose name starts with the group name
      if (cat.dynamic === 'bcci') {
        const pat = new RegExp('^' + g.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        ts = db.tournaments.filter((t) => pat.test(t.name));
      }
      html += `<section class="section"><div class="section-title"><h2>${esc(g.name)}</h2></div>
        <div class="grid grid-2">${ts.length ? ts.map(tournCard).join('\n') : `<p class="card-meta">Nothing recorded yet — will appear when confirmed.</p>`}</div></section>`;
    }
  } else {
    html += `<p class="card-meta">Nothing recorded yet — will appear when confirmed.</p>`;
  }
  html += closeLayout();
  writePage(`archive/${slug}`, html);
}

// ============================================================
// TOURNAMENTS
// ============================================================
function renderTournaments() {
  let html = layout({
    bodyClass: 'search-pinned',
    title: 'Tournaments',
    description: 'Official cricket tournaments organised by the Rewa Cricket Division.',
    path: '/tournaments/',
  });
  html += `<div class="page-head"><p class="eyebrow">Competition</p><h1>Tournaments</h1>
    <p>Official tournaments as announced by the division.</p></div>`;
  const officialTs = db.tournaments.filter((t) => isOfficialTournament(t.id));
  const communityTs = db.tournaments.filter((t) => !isOfficialTournament(t.id));
  if (officialTs.length) {
    html += `<section class="section"><div class="section-title"><h2>Official</h2></div>`;
    const groups = new Map();
    for (const t of officialTs) {
      const key = t.name.replace(/\s+\d{4}(-\d{2})?$/, '').trim();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(t);
    }
    for (const [gname, ts] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      html += `<div class="group-block"><div class="group-title"><h3>${esc(gname)}</h3><span class="count-pill">${ts.length} season${ts.length === 1 ? '' : 's'}</span></div><div class="grid grid-2 grid-3">${ts.sort((a, b) => b.name.localeCompare(a.name)).map(tournCard).join('\n')}</div></div>`;
    }
    html += `</section>`;
  }
  if (communityTs.length) {
    html += `<section class="section"><hr class="archive-divider"><div class="section-title"><h2>More Tournaments</h2></div><div class="grid grid-2 grid-3">${communityTs.map(tournCard).join('\n')}</div></section>`;
  }
  html += closeLayout();
  writePage('tournaments', html);
}

function renderTournament(t) {
  const season = seasonsById.get(t.seasonId);
  const tMatches = db.matches.filter((m) => m.tournamentId === t.id);
  const champ = t.championTeamId ? teamsById.get(t.championTeamId) : null;
  let html = layout({
    bodyClass: 'search-pinned',
    title: t.name,
    description: t.description ?? `${t.name} — a ${t.format} tournament of the Rewa Cricket Division.`,
    path: `/tournaments/${t.slug}/`,
    breadcrumbs: [{ name: 'Tournaments', path: '/tournaments/' }, { name: t.name, path: `/tournaments/${t.slug}/` }],
  });
  html += `<div class="page-head"><p class="eyebrow">${esc(t.format)}${season ? ` · ${season.year} Season` : ''}</p><h1>${esc(t.name)}</h1><p>Status: ${esc(t.status)}</p></div>`;
  if (isOfficialTournament(t.id) && t.governingBody) html += `<p class="badge badge-official">&#10003; ${esc(t.governingBody)} sanctioned</p>`;
  if (t.description) html += `<p class="prose" style="max-width:62ch;margin-bottom:1rem">${esc(t.description)}</p>`;
  if (champ) html += `<p class="btn btn-primary" style="margin-bottom:1.5rem">&#127942; Champions: ${esc(champ.name)}</p>`;
  html += `<section class="section"><div class="section-title"><h2>Matches</h2></div>
    <div class="grid grid-2">${tMatches.length ? tMatches.map(matchCard).join('\n') : empty('No matches yet', 'Match fixtures for this tournament will be published here when confirmed.')}</div></section>`;
  html += closeLayout();
  writePage(`tournaments/${t.slug}`, html);
}

// ============================================================
// MATCHES
// ============================================================
function renderMatches() {
  const byDate = [...db.matches].sort(dateSort);
  let html = layout({
    title: 'Matches &amp; Results',
    description: 'Official fixtures, live matches and recent results of the Rewa Cricket Division.',
    path: '/matches/',
  });
  html += `<div class="page-head"><p class="eyebrow">Competition</p><h1>Matches &amp; Results</h1>
    <p>Official fixtures and completed results as confirmed by the division.</p></div>`;
  html += byDate.length
    ? `<div class="grid grid-2 grid-3">${byDate.map(matchCard).join('\n')}</div>`
    : empty('No matches published yet', 'Official fixtures and results will be listed here once confirmed by the Rewa Cricket Division.');
  html += closeLayout();
  writePage('matches', html);
}

function renderMatch(m) {
  const teamA = teamsById.get(m.teamAId);
  const teamB = teamsById.get(m.teamBId);
  const venue = venuesById.get(m.venueId);
  const tourn = tourneysById.get(m.tournamentId);
  const season = seasonsById.get(m.seasonId);
  const innings = db.innings.filter((i) => i.matchId === m.id).sort((a, b) => a.battingOrder - b.battingOrder);
  const playersById = new Map(db.players.map((p) => [p.id, p]));

  const title = `${teamA?.name ?? 'Team A'} v ${teamB?.name ?? 'Team B'}`;
  const docTitle = tourn ? `${title} — ${tourn.name}` : title;
  let html = layout({
    title: docTitle,
    description: m.resultText
      ? `${m.resultText} — ${title}${tourn ? `, ${tourn.name}` : ''}${m.matchDate ? `, ${m.matchDate}` : ''} · Rewa Cricket Division archive.`
      : `${title} match details, scorecard, tournament and result${tourn ? ` — ${tourn.name}` : ''}${m.matchDate ? `, ${m.matchDate}` : ''}, from the Rewa Cricket Division archive.`,
    path: `/matches/${m.slug}/`,
    breadcrumbs: [{ name: 'Matches', path: '/matches/' }, { name: title, path: `/matches/${m.slug}/` }],
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: title,
      url: absUrl(`/matches/${m.slug}/`),
      startDate: m.matchDate ?? undefined,
      sport: 'Cricket',
      ...(venue ? { location: { '@type': 'Place', name: venue.name } } : {}),
      organizer: { '@type': 'SportsOrganization', name: org.name },
      ...(teamA && teamB ? { competitor: [{ '@type': 'SportsTeam', name: teamA.name }, { '@type': 'SportsTeam', name: teamB.name }] } : {}),
      ...(m.resultText ? { description: m.resultText } : {}),
    },
  });

  html += `<div class="card" style="margin-bottom:2rem">
    <p class="eyebrow">${esc(tourn?.name ?? 'Match')}${season ? ` · ${season.year} Season` : ''}</p>
    <h1 style="margin-top:.25rem">${esc(title)}</h1>
    <p class="card-meta">${esc(dateTxt(m))}${m.startTime ? ' at ' + esc(m.startTime) : ''}${venue ? ` · ${esc(venue.name)}` : ''}${venue?.city ? `, ${esc(venue.city)}` : ''}</p>
    ${scopeBadge(tourn) ? `<p style="margin-top:.75rem">${scopeBadge(tourn)}${scopeOf(tourn) !== 'division' ? ` <span class="card-meta">External match — archived because a Rewa player featured in it.</span>` : ''}</p>` : ''}
    ${m.resultText ? `<p class="btn btn-primary" style="margin-top:1rem;pointer-events:none">${esc(m.resultText)}</p>` : ''}
  </div>
  <section><h2>Scorecard</h2>
  ${
    innings.length
      ? `<div class="grid" style="margin-top:1rem">${innings
          .map((inn) => {
            const team = teamsById.get(inn.teamId);
            const bat = db.batting.filter((b) => b.inningsId === inn.id);
            const bowl = db.bowling.filter((b) => b.inningsId === inn.id);
            let out = `<div class="card table-wrap"><h3 style="margin-bottom:.5rem">${esc(team?.name ?? 'Team')} ${inn.runs != null ? inn.runs + '/' + (inn.wickets ?? '') : ''}${inn.overs != null ? ` (${inn.overs} ov)` : ''}</h3>`;
            if (bat.length) {
              out += `<table><thead><tr><th>Batter</th><th class="num">R</th><th class="num">B</th><th class="num">4s</th><th class="num">6s</th><th class="num">SR</th></tr></thead><tbody>${bat
                .map((b) => {
                  const p = playersById.get(b.playerId);
                  return `<tr><td><a href="/players/${esc(p?.slug ?? '')}/">${esc(p?.name ?? '—')}</a><div class="card-meta">${esc(b.dismissal || (b.notOut ? 'not out' : ''))}</div></td><td class="num">${b.runs}</td><td class="num">${b.balls ? b.balls : '—'}</td><td class="num">${b.fours ?? 0}</td><td class="num">${b.sixes ?? 0}</td><td class="num">${b.strikeRate?.toFixed(2) ?? '—'}</td></tr>`;
                })
                .join('\n')}</tbody></table>`;
            }
            if (bowl.length) {
              out += `<h3 style="margin:.75rem 0 .5rem;font-size:.95rem">Bowling</h3><table><thead><tr><th>Bowler</th><th class="num">O</th><th class="num">M</th><th class="num">R</th><th class="num">W</th><th class="num">Econ</th></tr></thead><tbody>${bowl
                .map((b) => {
                  const p = playersById.get(b.playerId);
                  return `<tr><td><a href="/players/${esc(p?.slug ?? '')}/">${esc(p?.name ?? '—')}</a></td><td class="num">${b.overs}</td><td class="num">${b.maidens}</td><td class="num">${b.runs}</td><td class="num">${b.wickets}</td><td class="num">${b.economy?.toFixed(2) ?? '—'}</td></tr>`;
                })
                .join('\n')}</tbody></table>`;
            }
            if (!bat.length && !bowl.length) out += `<p class="card-meta">Full scorecard not yet available.</p>`;
            return out + `</div>`;
          })
          .join('\n')}</div>`
      : `<p class="card-meta" style="margin-top:1rem">The official scorecard for this match is not yet available.</p>`
  }
  </section>`;

  if (m.notes && m.notes.trim()) {
    html += `<section class="section"><h2>Match notes &amp; commentary</h2>
      <div class="card prose notes-box"><pre>${esc(m.notes)}</pre></div></section>`;
  }
  html += closeLayout();
  writePage(`matches/${m.slug}`, html);
}

// ============================================================
// STATIC MINI-PAGES
// ============================================================
function renderStatic({ file, title, description, path, body, jsonLd = [] }) {
  let html = layout({ title, description, path, jsonLd });
  html += body;
  html += closeLayout();
  if (file === '404') {
    // static hosts (Netlify/GH Pages) serve 404.html from the site root
    writeFileSync(join(DIST, '404.html'), html);
    return;
  }
  writePage(file, html);
}

// ============================================================
// VENUES
// ============================================================
function renderVenues() {
  let html = layout({
    title: 'Venues',
    description: 'Official cricket venues used by the Rewa Cricket Division.',
    path: '/venues/',
  });
  html += `<div class="page-head"><p class="eyebrow">Grounds</p><h1>Venues</h1>
    <p>Official venues as confirmed by the division.</p></div>`;
  html += db.venues.length
    ? `<div class="grid grid-2 grid-3">${db.venues
        .map(
          (v) => `<a class="card card-link" href="/venues/${esc(v.slug)}/">
            <span class="card-title">${esc(v.name)}</span>
            <div class="card-meta">${esc([v.city, v.state].filter(Boolean).join(', ') || 'Rewa')}</div>
            ${v.capacity ? `<div class="card-meta">Capacity: ${v.capacity.toLocaleString()}</div>` : ''}
          </a>`,
        )
        .join('\n')}</div>`
    : empty('No venues published yet', 'Official venue details will appear here once confirmed by the Rewa Cricket Division.');
  html += closeLayout();
  writePage('venues', html);
}

function renderVenue(v) {
  const vMatches = db.matches.filter((m) => m.venueId === v.id);
  let html = layout({
    title: v.name,
    description: `${v.name} — a cricket venue of the Rewa Cricket Division${v.city ? ` in ${v.city}` : ''}.`,
    path: `/venues/${v.slug}/`,
    breadcrumbs: [{ name: 'Venues', path: '/venues/' }, { name: v.name, path: `/venues/${v.slug}/` }],
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Place',
      name: v.name,
      url: absUrl(`/venues/${v.slug}/`),
      ...(v.city || v.state
        ? { address: { '@type': 'PostalAddress', addressLocality: v.city, addressRegion: v.state } }
        : {}),
    },
  });
  html += `<div class="page-head"><h1>${esc(v.name)}</h1><p>${esc([v.city, v.state].filter(Boolean).join(', ') || 'Rewa, Madhya Pradesh')}</p></div>`;
  if (v.description) html += `<p class="prose" style="max-width:62ch;margin-bottom:1.5rem">${esc(v.description)}</p>`;
  html += `<section class="section"><h2>Matches at this venue</h2>
    <div class="grid grid-2" style="margin-top:1rem">${vMatches.length ? vMatches.map(matchCard).join('\n') : empty('No matches recorded here yet', 'Match details for this venue will appear here when confirmed.')}</div></section>`;
  html += closeLayout();
  writePage(`venues/${v.slug}`, html);
}

// ============================================================
// NEWS
// ============================================================
const slugify = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const dmyToIso = (d) => { const m = d.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : d; };
// Combined news feed: official announcements + MP Sports (DSYW) items.
function allNews() {
  const dsywItems = [
    ...dsyw.whatsNew.map((w, i) => ({
      id: `dsyw-wn-${i}`,
      slug: `dsyw-${slugify(w.title)}`,
      title: w.title,
      body: w.body,
      publishedAt: '2026-07-20',
      category: 'MP Sports · What\'s New',
      source: dsyw.source,
      sourceName: dsyw.sourceName,
    })),
    ...dsyw.pressReleases.map((p, i) => ({
      id: `dsyw-pr-${i}`,
      slug: `dsyw-${slugify(p.title)}`,
      title: p.title,
      body: p.title,
      publishedAt: dmyToIso(p.date),
      category: 'MP Sports · Press Release',
      source: dsyw.source,
      sourceName: dsyw.sourceName,
    })),
    ...dsyw.importantEvents.map((e, i) => ({
      id: `dsyw-ev-${i}`,
      slug: `dsyw-${slugify(e.title)}`,
      title: e.title,
      body: e.body,
      publishedAt: '2026-08-01',
      category: 'MP Sports · Events & Schemes',
      source: dsyw.source,
      sourceName: dsyw.sourceName,
    })),
  ];
  const all = [...db.announcements, ...dsywItems];
  const seen = new Set();
  return all.filter((n) => {
    if (seen.has(n.slug)) return false;
    seen.add(n.slug);
    return true;
  }).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

function renderNews() {
  const sorted = allNews();
  let html = layout({
    title: 'News &amp; Announcements',
    description: 'Official news and announcements from the Rewa Cricket Division.',
    path: '/news/',
  });
  html += `<div class="page-head"><p class="eyebrow">Official</p><h1>News &amp; Announcements</h1></div>`;
  html += sorted.length
    ? `<div class="grid grid-2">${sorted
        .map(
          (n) => `<a class="card card-link" href="/news/${esc(n.slug)}/">
            <p class="eyebrow">${esc(n.category ?? 'Announcement')} · ${esc(n.publishedAt)}</p>
            <span class="card-title">${esc(n.title)}</span>
            <p class="card-meta" style="margin-top:.4rem">${esc(n.body.slice(0, 120))}</p>
            ${n.source ? `<p class="card-meta" style="margin-top:.4rem">Source: ${esc(n.sourceName)}</p>` : ''}
          </a>`,
        )
        .join('\n')}</div>`
    : empty('No announcements yet', 'Official announcements from the Rewa Cricket Division will appear here.');
  html += closeLayout();
  writePage('news', html);
}

function renderNewsItem(n) {
  let html = layout({
    title: n.title,
    description: n.body.slice(0, 155),
    path: `/news/${n.slug}/`,
    breadcrumbs: [{ name: 'News', path: '/news/' }, { name: n.title, path: `/news/${n.slug}/` }],
    ogType: 'article',
  });
  html += `<article class="prose" style="max-width:720px">
    <p class="eyebrow">${esc(n.category ?? 'Announcement')} · ${esc(n.publishedAt)}</p>
    <h1 style="margin-top:.25rem">${esc(n.title)}</h1>
    <p style="font-size:1.1rem;margin-top:1rem">${esc(n.body)}</p>
    ${n.source ? `<p class="card-meta" style="margin-top:1rem">Source: <a href="${esc(n.source)}" rel="noopener" target="_blank">${esc(n.sourceName)} &nearr;</a></p>` : ''}
    <p style="margin-top:2rem;padding-top:1rem;border-top:1px solid var(--line);color:var(--muted);font-size:.9rem">${n.source ? 'Reproduced from the official MP Directorate of Sports &amp; Youth Welfare website for reference.' : `Published by the ${esc(org.name)}.`}</p>
  </article>`;
  html += closeLayout();
  writePage(`news/${n.slug}`, html);
}

// ============================================================
// AGGREGATE PAGES (live / stats / records / points-tables / seasons)
// ============================================================
function renderLive() {
  const live = db.matches.filter((m) => m.status === 'live');
  const recent = db.matches.filter((m) => m.status === 'completed' || m.status === 'abandoned').sort(dateSort);
  let html = layout({
    title: 'Live &amp; Recent Results',
    description: 'Live match updates and recent results from the Rewa Cricket Division.',
    path: '/live/',
  });
  html += `<div class="page-head"><p class="eyebrow">Scoreboard</p><h1>Live &amp; Recent Results</h1></div>
  <section class="section"><div class="section-title"><h2>&#128308; Live Now</h2></div>
  ${live.length ? `<div class="grid grid-2">${live.map(matchCard).join('\n')}</div>` : `<p class="card-meta">No matches are currently live.</p>`}</section>
  <section class="section"><h2>Recent Results</h2>
  <div class="grid grid-2 grid-3" style="margin-top:1rem">${recent.length ? recent.map(matchCard).join('\n') : empty('No results published yet', 'Official results will appear here once confirmed by the Rewa Cricket Division.')}</div></section>`;
  html += closeLayout();
  writePage('live', html);
}

function renderAggregate({ file, title, description, path, body }) {
  let html = layout({ title, description, path });
  html += body;
  html += closeLayout();
  writePage(file, html);
}

// ============================================================
// STATS — computed leaderboards from verified match data
// ============================================================
function statsBody() {
  const playersById = new Map(db.players.map((p) => [p.id, p]));
  // run aggregation (batting)
  const runAgg = new Map();
  for (const b of db.batting) {
    if (!runAgg.has(b.playerId)) runAgg.set(b.playerId, { runs: 0, inn: 0, fours: 0, sixes: 0, hs: 0 });
    const a = runAgg.get(b.playerId);
    a.runs += b.runs || 0;
    a.inn += 1;
    a.fours += b.fours || 0;
    a.sixes += b.sixes || 0;
    if ((b.runs || 0) > a.hs) a.hs = b.runs || 0;
  }
  const topRuns = [...runAgg.entries()]
    .map(([id, a]) => ({ name: playersById.get(id)?.name ?? '—', slug: playersById.get(id)?.slug ?? '', ...a }))
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 10);
  // wicket aggregation
  const wktAgg = new Map();
  for (const w of db.bowling) {
    if (!wktAgg.has(w.playerId)) wktAgg.set(w.playerId, { wkts: 0, runs: 0, overs: 0, econ: [] });
    const a = wktAgg.get(w.playerId);
    a.wkts += w.wickets || 0;
    a.runs += w.runs || 0;
    a.overs += w.overs || 0;
  }
  const topWkts = [...wktAgg.entries()]
    .map(([id, a]) => ({ name: playersById.get(id)?.name ?? '—', slug: playersById.get(id)?.slug ?? '', ...a, econ: a.overs ? +(a.runs / a.overs).toFixed(2) : '—' }))
    .filter((x) => x.wkts > 0)
    .sort((a, b) => b.wkts - a.wkts)
    .slice(0, 10);

  const runRows = topRuns.length
    ? `<div class="table-wrap"><h3 style="margin:.6rem .9rem">Top run-scorers</h3><table><thead><tr><th>Player</th><th class="num">Inn</th><th class="num">Runs</th><th class="num">HS</th><th class="num">4s</th><th class="num">6s</th></tr></thead><tbody>${topRuns
        .map((r, i) => `<tr><td><span style="color:var(--muted);margin-right:.5rem">${i + 1}</span><a href="/players/${esc(r.slug)}/">${esc(r.name)}</a></td><td class="num">${r.inn}</td><td class="num"><strong>${r.runs}</strong></td><td class="num">${r.hs}</td><td class="num">${r.fours}</td><td class="num">${r.sixes}</td></tr>`)
        .join('\n')}</tbody></table></div>`
    : '';
  const wktRows = topWkts.length
    ? `<div class="table-wrap"><h3 style="margin:.6rem .9rem">Top wicket-takers</h3><table><thead><tr><th>Player</th><th class="num">Overs</th><th class="num">Runs</th><th class="num">Wickets</th><th class="num">Econ</th></tr></thead><tbody>${topWkts
        .map((w, i) => `<tr><td><span style="color:var(--muted);margin-right:.5rem">${i + 1}</span><a href="/players/${esc(w.slug)}/">${esc(w.name)}</a></td><td class="num">${w.overs}</td><td class="num">${w.runs}</td><td class="num"><strong>${w.wkts}</strong></td><td class="num">${w.econ}</td></tr>`)
        .join('\n')}</tbody></table></div>`
    : '';
  return `<div class="grid" style="grid-template-columns:1fr">${runRows}${wktRows}</div>`;
}

const aggregates = [
  {
    file: 'stats',
    title: 'Statistics',
    description: 'Official statistics of the Rewa Cricket Division — computed from verified match data.',
    path: '/stats/',
    body: `<div class="page-head"><p class="eyebrow">Numbers</p><h1>Statistics</h1><p>All statistics are computed automatically from official, verified match records.</p></div>`
      + (db.batting.length || db.bowling.length
        ? statsBody()
        : empty('Statistics pending data', 'Statistics are generated only from verified match records. They will appear here once official data is published.')),
  },
  {
    file: 'records',
    title: 'Records',
    description: 'Official records of the Rewa Cricket Division — derived from verified match data.',
    path: '/records/',
    body: `<div class="page-head"><p class="eyebrow">Milestones</p><h1>Records</h1><p>Records are derived automatically from official, verified match statistics.</p></div>`
      + (db.matches.length
        ? `<div class="stat-grid">
            ${[['Matches played', db.matches.length], ['Tournaments', db.tournaments.length], ['Teams', db.teams.length], ['Players', db.players.length], ['Seasons', db.seasons.length], ['Venues', db.venues.length]]
              .map(([k, v]) => `<div class="card stat"><div class="stat-value">${v}</div><div class="stat-label">${k}</div></div>`)
              .join('\n')}
          </div>`
        : empty('Records pending data', 'Records will appear here once official match data is published.')),
  },
  {
    file: 'points-tables',
    title: 'Points Tables',
    description: 'Official points tables for Rewa Cricket Division tournaments.',
    path: '/points-tables/',
    body: `<div class="page-head"><p class="eyebrow">Standings</p><h1>Points Tables</h1><p>Standings are computed from official match results only.</p></div>`
      + (db.tournaments.filter((t) => t.status === 'ongoing' || t.status === 'completed').length
        ? db.tournaments.filter((t) => t.status === 'ongoing' || t.status === 'completed').map((t) =>
            `<section class="section"><h2>${esc(t.name)}</h2>
            <div class="table-wrap" style="margin-top:1rem"><table><thead><tr><th>Team</th><th class="num">P</th><th class="num">W</th><th class="num">L</th><th class="num">NR</th><th class="num">Pts</th></tr></thead><tbody>
            ${db.teams.map((tm, i) => `<tr><td><span style="color:var(--muted);margin-right:.5rem">${i + 1}</span><a href="/teams/${esc(tm.slug)}/">${esc(tm.name)}</a></td><td class="num">&mdash;</td><td class="num">&mdash;</td><td class="num">&mdash;</td><td class="num">&mdash;</td><td class="num">&mdash;</td></tr>`).join('\n')}
            </tbody></table></div></section>`).join('\n')
        : empty('No points tables yet', 'Points tables will be published here for ongoing and completed tournaments.')),
  },
  {
    file: 'seasons',
    title: 'Seasons',
    description: 'Season archives of the Rewa Cricket Division.',
    path: '/seasons/',
    body: `<div class="page-head"><p class="eyebrow">Archive</p><h1>Seasons</h1></div>`
      + (db.seasons.length
        ? `<div class="grid grid-4">${[...db.seasons].sort((a, b) => b.year - a.year).map((s) => `<a class="card card-link" href="/seasons/${s.year}/"><div class="stat-value">${s.year}</div><div class="stat-label">${esc(s.status)}</div></a>`).join('\n')}</div>`
        : empty('No seasons published yet', 'Season archives will appear here once confirmed by the Rewa Cricket Division.')),
  },
];

// ============================================================
// SITEMAP + ROBOTS
// ============================================================
// writeSitemap is defined above (with validation).

function writeRobots() {
  const txt = `User-agent: *
Allow: /
Disallow: /admin/

Sitemap: ${absUrl('/sitemap.xml')}
`;
  writeFileSync(join(DIST, 'robots.txt'), txt);
}

// ---------- build ----------
rmSync(DIST, { recursive: true, force: true }); // clean stale pages first
mkdirSync(DIST, { recursive: true });

renderHome();
db.teams.forEach(renderTeam);
renderTeams();
db.players.forEach(renderPlayer);
renderPlayers();
db.tournaments.forEach(renderTournament);
renderTournaments();
renderArchiveIndex();
for (const cat of ARCHIVE) renderArchiveCategory(cat);
db.matches.forEach(renderMatch);
renderMatches();

renderStatic({
  file: 'search',
  title: 'Search',
  description: `Search the ${org.name} archive — players, teams, matches, tournaments, venues and more.`,
  path: '/search/',
  body: `<div class="page-head"><p class="eyebrow">Find it</p><h1>Search the Archive</h1>
    <p>Search every player, team, match, tournament, venue and page in the Rewa Cricket Division archive.</p></div>
  <form class="search-page-form" role="search" action="/search/" method="get">
    <label class="sr-only" for="sq">Search</label>
    <input id="sq" name="q" type="search" placeholder="e.g. Kuldeep Sen, Ranji Trophy, Rewa Jaguars…" autocomplete="off" />
    <button class="btn btn-primary" type="submit">Search</button>
    <button class="btn btn-ghost" type="button" data-search-clear aria-label="Clear search">Clear</button>
  </form>
  <p class="search-count hidden" data-search-count></p>
  <div class="search-results" data-search-results>
    <p class="card-meta">Type a query above and press Search, or use the search box in the header.</p>
  </div>`,
});

renderStatic({
  file: 'academy',
  title: dsyw.academy.title,
  description: `${dsyw.academy.title} — established ${dsyw.academy.established}, with a dedicated cricket stadium, fitness center, hostel and more. Rewa Cricket Division archive.`,
  path: '/academy/',
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'EducationalOrganization',
      name: dsyw.academy.title,
      url: absUrl('/academy/'),
      description: dsyw.academy.body,
      address: { '@type': 'PostalAddress', addressLocality: 'Shivpuri', addressRegion: 'Madhya Pradesh', addressCountry: 'IN' },
      parentOrganization: { '@type': 'SportsOrganization', name: dsyw.sourceName },
    },
  ],
  body: `<div class="page-head"><p class="eyebrow">State Academy · Established ${esc(dsyw.academy.established)}</p><h1>${esc(dsyw.academy.title)}</h1></div>
  <div class="split">
    <div class="prose">
      <p>${esc(dsyw.academy.body)}</p>
      <h2>Facilities</h2>
      <ul>${dsyw.academy.facilities.map((f) => `<li>${esc(f)}</li>`).join('\n')}</ul>
      <p class="card-meta" style="margin-top:1.5rem">Content reproduced from the official MP Directorate of Sports &amp; Youth Welfare page (<a href="${esc(dsyw.academy.pageUrl)}" rel="noopener" target="_blank">${esc(dsyw.academy.pageUrl.replace('https://', ''))}</a>).</p>
    </div>
    <aside>
      <div class="card">
        <img src="/img/academy/Cricket_Logo.jpg" alt="${esc(dsyw.academy.title)} — emblem" width="240" height="193" loading="lazy" />
        <p class="card-meta" style="margin-top:.75rem">MP State Women's Cricket Academy of Excellence, Shivpuri.</p>
      </div>
    </aside>
  </div>
  <section class="section">
    <div class="section-title"><div><p class="eyebrow">Cricket Academy Gallery</p><h2>Gallery</h2></div></div>
    <div class="gallery-grid">${dsyw.academy.gallery
      .map((g) => `<a class="card gallery-item" href="${esc(g.src)}"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" width="640" height="480" /></a>`)
      .join('\n')}</div>
    <p class="card-meta" style="margin-top:1rem">Photographs © MP Directorate of Sports &amp; Youth Welfare.</p>
  </section>`,
});

renderStatic({
  file: '404',
  title: 'Page not found',
  description: 'The page you requested could not be found in the Rewa Cricket Division archive.',
  path: '/404/',
  body: `<div class="page-head"><p class="eyebrow">Error 404</p><h1>Page not found</h1>
    <p>That page does not exist in the Rewa Cricket Division archive. It may have been moved or renamed.</p>
    <p style="margin-top:1rem"><a class="btn btn-primary" href="/">Back to the archive home</a> <a class="btn btn-ghost" href="/archive/">Browse the archive</a></p></div>`,
});

renderStatic({
  file: 'about',
  title: 'About the Division',
  description: `About the ${org.name} — the governing body for organised cricket in the Rewa region.`,
  path: '/about/',
  jsonLd: [orgLd],
  body: `<div class="page-head"><p class="eyebrow">Organization</p><h1>About the Division</h1></div>
  <div class="split">
    <div class="prose">
      <p>${esc(org.description)}</p>
      <h2>About the Rewa Cricket Division</h2>
      <p>The ${esc(org.name)} is the governing body for organised cricket in the Rewa region of Madhya Pradesh — the district known as <strong>सफ़ेद शेरों की धरती</strong>, the Land of the White Tigers. The division administers inter-district, age-group and divisional competitions, and acts as the local pathway for players progressing to Madhya Pradesh state cricket and beyond.</p>
      <p>Rewa cricketers have represented Madhya Pradesh in the Ranji Trophy, the Vijay Hazare Trophy and the Syed Mushtaq Ali Trophy, and the district's franchise teams — such as the Rewa Jaguars — compete in state-level leagues like the Madhya Pradesh League. This archive records that journey.</p>
      <h2>Our Competitions</h2>
      <p>The division organises and administers cricket tournaments, league matches and fixtures across the Rewa region. Official schedules, results, team and player information are published here as they are confirmed. The archive covers:</p>
      <ul>
        <li><strong>Rewa Division competitions</strong> — inter-district senior, U-22, U-18, U-15 and other age-group tournaments conducted under the division.</li>
        <li><strong>Local leagues &amp; cups</strong> — city and community tournaments played across Rewa.</li>
        <li><strong>State &amp; national matches</strong> — external matches (Ranji Trophy, Vijay Hazare, Syed Mushtaq Ali, Madhya Pradesh League and similar) archived because a Rewa player featured in them.</li>
      </ul>
      <h2>How the archive is organised</h2>
      <p>The collection follows a single rule: <strong>no Rewa connection, no entry.</strong> Every match, team, player and statistic in this archive is included because it belongs to the Rewa Cricket Division, or because a Rewa player appeared in it. External matches are clearly labelled so the division's own competitions always remain the centre of the record. Browse it from the <a href="/archive/">archive index</a>.</p>
      <h2>Accuracy &amp; Integrity</h2>
      <p>As an official archive, all information published — matches, scorecards, statistics, teams, players and results — is sourced from official records. Content is added only when confirmed, and corrections are made through the division's administrative process. Where a figure is computed from match data rather than published officially, it is labelled as such.</p>
      <h2>Official sources</h2>
      <p>The archive cross-references official and authoritative sources for verification:</p>
      <ul>
        <li><a href="https://rewa.nic.in" rel="noopener" target="_blank">Rewa District official portal</a> (Government of Madhya Pradesh)</li>
        <li><a href="https://www.mp.gov.in" rel="noopener" target="_blank">Madhya Pradesh Government</a></li>
        <li><a href="https://www.bcci.tv" rel="noopener" target="_blank">Board of Control for Cricket in India (BCCI)</a></li>
      </ul>
      <h2>Contact</h2>
      <p>For official enquiries, use the <a href="/contact/">contact page</a>.</p>
    </div>
    <aside>
      <div class="card">
        <p class="eyebrow">Division details</p>
        <dl style="margin-top:.75rem;line-height:1.9">
          <dt style="color:var(--muted);font-size:.85rem">Name</dt><dd style="font-weight:600">${esc(org.name)}</dd>
          ${org.headquarters ? `<dt style="color:var(--muted);font-size:.85rem">Headquarters</dt><dd>${esc(org.headquarters)}</dd>` : ''}
          ${org.foundedYear ? `<dt style="color:var(--muted);font-size:.85rem">Founded</dt><dd>${esc(org.foundedYear)}</dd>` : ''}
          <dt style="color:var(--muted);font-size:.85rem">Website</dt><dd><a href="${esc(org.website)}">${esc(org.website)}</a></dd>
        </dl>
      </div>
      ${db.officials.length ? `<div class="card" style="margin-top:1rem">
        <p class="eyebrow">Match officials</p>
        <dl style="margin-top:.75rem;line-height:1.9">${db.officials.map((o) => `<dt style="color:var(--muted);font-size:.85rem">${esc(o.role)}</dt><dd style="font-weight:600">${esc(o.name)}</dd>`).join('')}</dl>
      </div>` : ''}
    </aside>
  </div>`,
});

renderStatic({
  file: 'contact',
  title: 'Contact',
  description: `Contact the ${org.name} for official enquiries.`,
  path: '/contact/',
  body: `<div class="page-head"><p class="eyebrow">Get in touch</p><h1>Contact</h1></div>
  <div class="split">
    <div class="card">
      <h2 style="margin-bottom:.5rem">Official enquiries</h2>
      <p style="color:var(--muted);font-size:.95rem">For official correspondence with the ${esc(org.name)}, please use the contact details below. This archive is operated with the permission of the division.</p>
      <dl style="margin-top:1rem;line-height:1.9">
        <dt style="color:var(--muted);font-size:.85rem">Organization</dt><dd style="font-weight:600">${esc(org.name)}</dd>
        ${org.headquarters ? `<dt style="color:var(--muted);font-size:.85rem">Headquarters</dt><dd>${esc(org.headquarters)}</dd>` : ''}
        <dt style="color:var(--muted);font-size:.85rem">Address</dt><dd>${esc(dsyw.contact.address)}</dd>
        <dt style="color:var(--muted);font-size:.85rem">Email</dt><dd><a href="mailto:${esc(dsyw.contact.email)}">${esc(dsyw.contact.email)}</a></dd>
        <dt style="color:var(--muted);font-size:.85rem">Phone</dt><dd><a href="${esc(dsyw.contact.mapsUrl)}" rel="noopener" target="_blank">${esc(dsyw.contact.phone)} &nearr;</a></dd>
        <dt style="color:var(--muted);font-size:.85rem">Website</dt><dd><a href="${esc(org.website)}">${esc(org.website)}</a></dd>
      </dl>
    </div>
    <div class="card">
      <h2 style="margin-bottom:.5rem">Sports &amp; Youth Welfare Directorate</h2>
      <p style="color:var(--muted);font-size:.95rem">Correspondence is handled through the MP Directorate of Sports &amp; Youth Welfare, the state sports body under which the division operates.</p>
      <dl style="margin-top:1rem;line-height:1.9">
        <dt style="color:var(--muted);font-size:.85rem">Directorate</dt><dd style="font-weight:600">${esc(dsyw.sourceName)}</dd>
        <dt style="color:var(--muted);font-size:.85rem">Address</dt><dd>${esc(dsyw.contact.address)}</dd>
        <dt style="color:var(--muted);font-size:.85rem">Email</dt><dd><a href="mailto:${esc(dsyw.contact.email)}">${esc(dsyw.contact.email)}</a></dd>
        <dt style="color:var(--muted);font-size:.85rem">Phone</dt><dd><a href="${esc(dsyw.contact.mapsUrl)}" rel="noopener" target="_blank">${esc(dsyw.contact.phone)} &nearr;</a></dd>
        <dt style="color:var(--muted);font-size:.85rem">Website</dt><dd><a href="${esc(dsyw.source)}" rel="noopener" target="_blank">${esc(dsyw.source.replace('https://', ''))} &nearr;</a></dd>
      </dl>
    </div>
  </div>
  <section class="section">
    <div class="section-title"><div><p class="eyebrow">Authoritative sources</p><h2>Official Government &amp; Sports Links</h2></div></div>
    <div class="grid grid-2 grid-3">
      <div class="card"><h3 style="font-size:1rem">Rewa District</h3><p class="card-meta">Government of Madhya Pradesh — official district portal of Rewa (सफ़ेद शेरों की धरती).</p><p style="margin-top:.6rem"><a href="https://rewa.nic.in" rel="noopener" target="_blank">rewa.nic.in &nearr;</a></p></div>
      <div class="card"><h3 style="font-size:1rem">Madhya Pradesh Government</h3><p class="card-meta">State government portal — parent administration of Rewa district.</p><p style="margin-top:.6rem"><a href="https://www.mp.gov.in" rel="noopener" target="_blank">mp.gov.in &nearr;</a></p></div>
      <div class="card"><h3 style="font-size:1rem">Sports &amp; Youth Welfare Department</h3><p class="card-meta">State sports directorate — academies, schemes and notifications.</p><p style="margin-top:.6rem"><a href="${esc(dsyw.source)}" rel="noopener" target="_blank">dsywmp.gov.in &nearr;</a></p></div>
      <div class="card"><h3 style="font-size:1rem">Board of Control for Cricket in India</h3><p class="card-meta">National cricket governing body — domestic competitions and records.</p><p style="margin-top:.6rem"><a href="https://www.bcci.tv" rel="noopener" target="_blank">bcci.tv &nearr;</a></p></div>
      <div class="card"><h3 style="font-size:1rem">Madhya Pradesh Cricket Association</h3><p class="card-meta">State cricket body — the MPCA website link will be added once its official address is confirmed.</p></div>
      <div class="card"><h3 style="font-size:1rem">Cricbuzz</h3><p class="card-meta">International cricket scores and player career statistics — used as a reference source.</p><p style="margin-top:.6rem"><a href="https://www.cricbuzz.com" rel="noopener" target="_blank">cricbuzz.com &nearr;</a></p></div>
      <div class="card"><h3 style="font-size:1rem">ESPNcricinfo</h3><p class="card-meta">Cricket records and archives — used as a reference source.</p><p style="margin-top:.6rem"><a href="https://www.espncricinfo.com" rel="noopener" target="_blank">espncricinfo.com &nearr;</a></p></div>
    </div>
  </section>`,
});

// season detail pages
for (const s of db.seasons) {
  const sTournaments = db.tournaments.filter((t) => t.seasonId === s.id);
  const sMatches = db.matches.filter((m) => m.seasonId === s.id);
  renderAggregate({
    file: `seasons/${s.year}`,
    title: `${s.year} Season`,
    description: `The ${s.year} cricket season of the Rewa Cricket Division — tournaments, matches and results.`,
    path: `/seasons/${s.year}/`,
    body: `<div class="page-head"><p class="eyebrow">Season</p><h1>${s.year} Season</h1><p>Status: ${esc(s.status)}</p></div>
    <section class="section"><h2>Matches</h2>
    <div class="grid grid-2" style="margin-top:1rem">${sMatches.length ? sMatches.map(matchCard).join('\n') : empty('No matches yet', `Match details for the ${s.year} season will appear here when confirmed.`)}</div></section>
    <section class="section"><h2>Tournaments</h2>
    <div class="grid" style="margin-top:1rem">${sTournaments.length ? sTournaments.map((t) => `<a class="card card-link" href="/tournaments/${esc(t.slug)}/"><span class="card-title">${esc(t.name)}</span><div class="card-meta">${esc(t.format)} · ${esc(t.status)}</div></a>`).join('\n') : `<p class="card-meta">Tournaments for this season will be listed here when announced.</p>`}</div></section>`,
  });
}

renderVenues();
db.venues.forEach(renderVenue);
renderNews();
allNews().forEach(renderNewsItem);
renderLive();
for (const a of aggregates) renderAggregate(a);

writeSearchIndex();
writeSitemap();
writeRobots();

// copy static assets
for (const [from, to] of [
  ['css/styles.css', 'css/styles.css'],
  ['js/main.js', 'js/main.js'],
]) {
  mkdirSync(join(DIST, dirname(to)), { recursive: true });
  copyFileSync(join(SRC, from), join(DIST, to));
}
// favicon
const fav = join(ROOT, 'public', 'favicon.svg');
if (existsSync(fav)) copyFileSync(fav, join(DIST, 'favicon.svg'));

// root-level public files (e.g. Google site-verification html)
for (const f of readdirSync(join(ROOT, 'public'))) {
  const s = join(ROOT, 'public', f);
  if (f === 'favicon.svg' || f === 'img' || f === '.DS_Store') continue;
  if (statSync(s).isFile()) copyFileSync(s, join(DIST, f));
}

// public/img (official logos) — recursive copy
const imgSrc = join(ROOT, 'public', 'img');
function copyDir(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const f of readdirSync(src)) {
    const s = join(src, f);
    const d = join(dst, f);
    if (existsSync(s) && statSync(s).isDirectory()) copyDir(s, d);
    else copyFileSync(s, d);
  }
}
if (existsSync(imgSrc)) copyDir(imgSrc, join(DIST, 'img'));

console.log(`✔ Built ${pages.length} pages → dist/`);
console.log('  pages:', pages.length, '· teams:', db.teams.length, '· players:', db.players.length, '· matches:', db.matches.length);
