# Rewa Cricket Division — Official Archive

Plain **HTML5 + CSS3 + vanilla JS**. No frontend framework. Data lives in JSON and a
plain-Node script generates real static `.html` files (SEO content is baked into the HTML).

## Structure
```
data/organization.json   → org identity (only what's authorized)
data/records.json        → seasons, tournaments, teams, players, venues,
                           officials, announcements, matches, innings, batting, bowling
scripts/build.mjs        → generates static HTML into dist/ (vanilla Node, no deps)
scripts/serve.mjs        → zero-dep production server (dynamic sitemap/robots, security headers)
src/css/styles.css       → plain CSS3, mobile-first
src/js/main.js           → tiny vanilla JS (nav toggle, contact form, year)
public/favicon.svg
dist/                    → generated output (deploy this)
```

## Build & run
```bash
npm run build    # generate dist/ (no npm install needed — zero dependencies)
npm start        # production server on :8080 (dynamic sitemap + robots, gzip, security headers)
```

## Site URL (important)
The production domain is **configurable** — nothing is hardcoded.

- `npm run build` uses `SITE_URL` for canonical URLs, Open Graph URLs and the static
  `sitemap.xml`/`robots.txt`. Without it, the build falls back to the default URL in
  `scripts/build.mjs` (change that constant once the domain is confirmed):

  ```bash
  SITE_URL=https://yourdomain.example npm run build
  ```

- `npm start` (scripts/serve.mjs) generates `sitemap.xml` and `robots.txt` **dynamically**
  from the request Host, so localhost, preview domains and the final domain all get
  correct absolute URLs with zero rebuilds. Works behind a proxy that sets
  `X-Forwarded-Proto`/`X-Forwarded-Host` (HTTPS).

## Deploy options
1. **Node host / VPS**: `npm run build && npm start` (PORT/HOST env vars).
2. **Static host** (Cloudflare Pages / GitHub Pages / Netlify): build with the right
   `SITE_URL`, then publish `dist/` — static sitemap.xml + 404.html included.

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
