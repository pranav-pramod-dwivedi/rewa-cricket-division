
```bash
npm run build    # generate dist/ (no npm install needed — zero dependencies)
npm start        # production server on :8080 (dynamic sitemap + robots, gzip, security headers)
```

## Site URL (important)
The production domain is **configurable** — nothing is hardcoded.

- `npm run build` uses `SITE_URL` for canonical URLs, Open Graph URLs and the static
  `sitemap.xml`/`robots.txt`. Without it, the build falls back to the default URL in
  `scripts/build.mjs` (currently `https://rewa-cricket-division.vercel.app`):
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

## SEO
- Every page has a unique `<title>`, meta description, canonical URL, JSON-LD
  (SportsOrganization, SportsTeam, Person, Place, SportsEvent, EducationalOrganization,
  BreadcrumbList) and a validated sitemap.
- **Keyword strategy — no stuffing.** A keyword→page map is maintained in
  `data/seo/keyword-map.json`: 160+ ultra-long-tail, low-competition queries collected
  from Google Autocomplete, each classified into an intent family and mapped to the
  exact archive page that should rank for it (players, teams, tournaments, matches,
  venues, academy, archive).
- Refresh the research anytime:
  ```bash
  node scripts/keywords.mjs
  ```
- The home page declares a schema.org `SearchAction`, wiring Google to `/search/?q=`.
- After launch, use Google Search Console's query report as the live keyword source:
  improve the page each real query already points at.

## Integrity rule
No match, scorecard, statistic, player, team, tournament, date or result is ever invented.
Pages render clean empty states until official data is confirmed.
