# Rewa Cricket Division — Official Website

Plain **HTML5 + CSS3 + vanilla JS**. No frontend framework. Data lives in JSON and a
plain-Node script generates real static `.html` files (SEO content is baked into the HTML).

## Structure
```
data/organization.json   → org identity (only what's authorized)
data/records.json        → seasons, tournaments, teams, players, venues,
                           officials, announcements, matches, innings, batting, bowling
scripts/build.mjs        → generates static HTML into dist/ (vanilla Node, no deps)
src/css/styles.css       → plain CSS3, mobile-first
src/js/main.js           → tiny vanilla JS (nav toggle, contact form, year)
public/favicon.svg
dist/                    → generated output (deploy this)
```

## Build & run
```bash
npm run build    # generate dist/ (no npm install needed — zero dependencies)
python3 -m http.server -d dist 8000   # or any static server
```

## How it works
1. Edit `data/*.json` (the source of truth).
2. Run `npm run build`.
3. `dist/` gets every page with a unique `<title>`, meta description, canonical URL,
   JSON-LD (SportsOrganization, SportsTeam, Person, Place, SportsEvent, BreadcrumbList),
   `sitemap.xml` and `robots.txt`.
4. Deploy `dist/` to any free static host (Cloudflare Pages / GitHub Pages / Netlify).

## URL architecture (trailing slash, permanent)
```
/  /about/  /news/  /news/{slug}/  /matches/  /matches/{slug}/
/live/  /tournaments/  /tournaments/{slug}/  /teams/{slug}/  /players/{slug}/
/venues/{slug}/  /seasons/  /seasons/{year}/  /points-tables/  /stats/  /records/  /contact/
```

## Portability
The generated HTML is throwaway. To migrate to Astro/Next/etc. later, keep `data/` and this
URL structure — swap the data source in the new framework without rebuilding the site.

## Integrity rule
No match, scorecard, statistic, player, team, tournament, date or result is ever invented.
Pages render clean empty states until official data is confirmed.
