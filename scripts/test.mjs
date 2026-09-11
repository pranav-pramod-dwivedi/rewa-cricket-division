// Agentic-readiness regression suite. Zero dependencies (node:test).
//
//   unit        — Accept negotiation + HTML→Markdown converter
//   integration — builds the site, boots scripts/serve.mjs, probes HTTP
//
// Run: npm test

import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { negotiateVariant, htmlToMarkdown } from '../lib/agentic.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------- unit: negotiation ----------
describe('negotiateVariant', () => {

  const cases = [
    ['text/markdown', 'markdown'],
    ['text/markdown;q=0.5', 'markdown'],
    ['TEXT/MARKDOWN ; Q=0.7', 'markdown'],
    ['text/markdown;q=0.9, text/html;q=0.5', 'markdown'],
    ['text/markdown; q=0.9; level=1, text/html; q=0.5', 'markdown'],
    ['text/html', 'html'],
    ['', 'html'],
    [undefined, 'html'],
    ['*/*', 'html'],
    ['text/*', 'html'],
    ['application/json', 'html'],
    ['text/html;q=0.9, text/markdown;q=0.8', 'html'],
    ['text/markdown;q=0', 'html'],
    ['text/markdown;q=0.000, */*', 'html'],
  ];
  for (const [accept, expected] of cases) {
    test(`Accept: ${JSON.stringify(accept)} -> ${expected}`, () => {
      assert.equal(negotiateVariant(accept), expected);
    });
  }
});

// ---------- unit: HTML -> Markdown ----------
describe('htmlToMarkdown', () => {

  test('strips script/style/svg and layout chrome', () => {
    const md = htmlToMarkdown(
      '<main id="main"><p>Hello</p><script>alert(1)</script><style>.x{}</style></main>',
      {},
    );
    assert.ok(md.includes('Hello'));
    assert.ok(!md.includes('alert'));
    assert.ok(!md.includes('.x{}'));
    assert.ok(!/<script/i.test(md));
  });

  test('headings map to hashes', () => {
    const md = htmlToMarkdown('<main id="main"><h2>Fixtures</h2></main>', {});
    assert.match(md, /^## Fixtures$/m);
  });

  test('tables become pipe tables', () => {
    const md = htmlToMarkdown(
      '<main id="main"><table><thead><tr><th>Batter</th><th class="num">R</th></tr></thead>' +
        '<tbody><tr><td>A | B</td><td class="num">42</td></tr></tbody></table></main>',
      {},
    );
    assert.ok(md.includes('| Batter | R |'));
    assert.ok(md.includes('| --- | --- |'));
    assert.ok(md.includes('A \\| B | 42'));
  });

  test('links: internal kept relative, external absolute, mailto stripped to text', () => {
    const md = htmlToMarkdown(
      '<main id="main"><a href="/players/x/">X</a> <a href="https://ext.example/p?a=1">E</a> <a href="mailto:a@b.c">Mail</a></main>',
      {},
    );
    assert.ok(md.includes('[X](/players/x/)'));
    assert.ok(md.includes('[E](https://ext.example/p?a=1)'));
    assert.ok(md.includes('Mail') && !md.includes('mailto'));
  });

  test('entities decoded incl. numeric and unknown-safe', () => {
    const md = htmlToMarkdown(
      '<main id="main"><p>A &amp; B &nearr; &#169; &notanentity; R&amp;D</p></main>',
      {},
    );
    assert.ok(md.includes('A & B ↗ © &notanentity; R&D'));
  });

  test('lists and strong/em', () => {
    const md = htmlToMarkdown(
      '<main id="main"><ul><li><strong>One</strong></li><li><em>Two</em></li></ul><ol><li>First</li></ol></main>',
      {},
    );
    assert.ok(md.includes('- **One**'));
    assert.ok(md.includes('- _Two_'));
    assert.ok(md.match(/1\.\s*First/));
  });

  test('header block carries title + source url', () => {
    const md = htmlToMarkdown('<main id="main"><p>Body</p></main>', {
      title: 'About the Division',
      url: 'https://x.test/about/',
    });
    assert.ok(md.startsWith('# About the Division\n'));
    assert.ok(md.includes('Source: https://x.test/about/'));
  });

  test('content outside <main> is dropped', () => {
    const md = htmlToMarkdown(
      '<header>SITE NAV Search</header><main id="main"><p>Real</p></main><footer>Copyright footer</footer>',
      {},
    );
    assert.ok(md.includes('Real'));
    assert.ok(!md.includes('SITE NAV'));
    assert.ok(!md.includes('Copyright footer'));
  });
});

// ---------- integration ----------
describe('integration (build + serve)', () => {
  const PORT = 4890;
  const BASE = `http://127.0.0.1:${PORT}`;
  let server;

  const get = async (path, { headers = {} } = {}) => {
    const res = await fetch(BASE + path, { headers });
    const body = await res.text();
    return { status: res.status, headers: res.headers, body };
  };

  before(async () => {
    await new Promise((resolve, reject) => {
      const p = spawn('node', ['scripts/build.mjs'], { cwd: ROOT, stdio: 'inherit' });
      p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`build failed (${code})`))));
    });
    server = spawn('node', ['scripts/serve.mjs'], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1' },
      stdio: 'ignore',
    });
    for (let i = 0; i < 50; i++) {
      try {
        await fetch(BASE + '/');
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    throw new Error('dev server did not start');
  });

  after(() => server?.kill());

  test('homepage: unchanged HTML for browsers, with Vary declared', async () => {
    const r = await get('/');
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type'), /text\/html/);
    assert.match(r.body, /^<!doctype html>/i);
    assert.match(r.headers.get('vary') || '', /Accept/i);
    assert.ok(r.body.includes('Rewa Division Cricket Association (RDCA)'));
  });

  test('homepage: markdown for agents on the same URL', async () => {
    const r = await get('/', { headers: { accept: 'text/markdown' } });
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type'), /text\/markdown/);
    assert.match(r.headers.get('vary') || '', /Accept/);
    assert.ok(r.body.startsWith('# '));
    assert.ok(r.body.includes('Rewa Division Cricket Association'));
    assert.ok(!r.body.includes('<!doctype html'));
  });

  test('q-values honoured end to end', async () => {
    const htmlWins = await get('/about/', {
      headers: { accept: 'text/html;q=0.9, text/markdown;q=0.8' },
    });
    assert.match(htmlWins.headers.get('content-type'), /text\/html/);

    const mdWins = await get('/about/', {
      headers: { accept: 'text/markdown;q=0.8, text/html;q=0.5' },
    });
    assert.match(mdWins.headers.get('content-type'), /text\/markdown/);

    const qZero = await get('/about/', { headers: { accept: 'text/markdown;q=0' } });
    assert.match(qZero.headers.get('content-type'), /text\/html/);
  });

  test('404 for browsers keeps real status + HTML page', async () => {
    const r = await get('/this-path-does-not-exist-xyz/');
    assert.equal(r.status, 404);
    assert.match(r.headers.get('content-type'), /text\/html/);
  });

  test('404 for agents is markdown with recovery links', async () => {
    const r = await get('/this-path-does-not-exist-xyz/', {
      headers: { accept: 'text/markdown' },
    });
    assert.equal(r.status, 404);
    assert.match(r.headers.get('content-type'), /text\/markdown/);
    assert.match(r.headers.get('vary') || '', /Accept/);
    assert.ok(r.body.includes('/sitemap.xml'));
    assert.ok(r.body.includes('/llms.txt'));
    assert.ok(r.body.includes('this-path-does-not-exist-xyz'));
  });

  test('static .md convenience URL serves markdown', async () => {
    const r = await get('/about.md');
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type'), /text\/markdown/);
  });

  test('llms.txt exists with when-to-use + developer resources', async () => {
    const r = await get('/llms.txt');
    assert.equal(r.status, 200);
    assert.match(r.body, /^# Rewa Division Cricket Association \(RDCA\)/m);
    assert.ok(r.body.includes('## When to use this'));
    assert.ok(r.body.includes('## Developer resources'));
    assert.ok(r.body.includes('search-index.json'));
    assert.ok(r.body.includes('sitemap.xml'));
  });

  test('sitemap.xml still valid and complete', async () => {
    const r = await get('/sitemap.xml');
    assert.equal(r.status, 200);
    const urls = [...r.body.matchAll(/<loc>(.*?)<\/loc>/g)].length;
    assert.ok(urls > 1900, `expected >1900 urls, got ${urls}`);
    assert.ok(!r.body.includes('.md</loc>'), 'md variants must not enter sitemap');
  });

  test('robots.txt unchanged policy', async () => {
    const r = await get('/robots.txt');
    assert.equal(r.status, 200);
    assert.ok(r.body.includes('User-agent: *'));
    assert.ok(r.body.includes('Sitemap: '));
  });

  test('assets unaffected by negotiation', async () => {
    const css = await get('/css/styles.css', { headers: { accept: 'text/markdown' } });
    assert.equal(css.status, 200);
    assert.match(css.headers.get('content-type'), /text\/css/);
  });

  test('search index intact', async () => {
    const r = await get('/search-index.json');
    assert.equal(r.status, 200);
    const entries = JSON.parse(r.body);
    assert.ok(Array.isArray(entries) && entries.length > 1900);
  });

  test('Organization JSON-LD has Organization type, contactPoint + PostalAddress', async () => {
    const r = await get('/');
    const blocks = [...r.body.matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    )].map((m) => JSON.parse(m[1]));
    const org = blocks.find((b) => {
      const t = b['@type'];
      return Array.isArray(t) ? t.includes('Organization') : t === 'Organization';
    });
    assert.ok(org, 'Organization type missing in JSON-LD');
    assert.equal(org.name, 'Rewa Division Cricket Association (RDCA)');
    assert.equal(org.address['@type'], 'PostalAddress');
    assert.ok(org.address.streetAddress, 'streetAddress missing');
    assert.equal(org.address.addressCountry, 'IN');
    assert.ok(org.contactPoint?.email, 'email missing');
    assert.ok(org.contactPoint?.telephone, 'telephone missing');
  });

  test('Trust anchor pages: /privacy/ and /about/ exist with >= 500 characters', async () => {
    const privacy = await get('/privacy/');
    assert.equal(privacy.status, 200);
    assert.ok(privacy.body.length >= 500, `privacy body too short: ${privacy.body.length}`);

    const about = await get('/about/');
    assert.equal(about.status, 200);
    assert.ok(about.body.length >= 500, `about body too short: ${about.body.length}`);
  });

  test('Developer resources: /developers/, /api/openapi.json, and MCP manifest', async () => {
    const dev = await get('/developers/');
    assert.equal(dev.status, 200);
    assert.ok(dev.body.length >= 500);

    const openapi = await get('/api/openapi.json');
    assert.equal(openapi.status, 200);
    const spec = JSON.parse(openapi.body);
    assert.equal(spec.openapi, '3.1.0');
    assert.ok(spec.paths['/']);

    const mcp = await get('/.well-known/mcp');
    assert.equal(mcp.status, 200);
    const mcpJson = JSON.parse(mcp.body);
    assert.ok(mcpJson.tools?.length > 0);
  });

  test('deep page: player HTML + markdown variant agree', async () => {
    const db = JSON.parse(readFileSync(join(ROOT, 'data/records.json'), 'utf8'));
    const player = db.players.find((p) => p.slug);
    assert.ok(player, 'no player with slug in fixtures');
    const html = await get(`/players/${player.slug}/`);
    assert.equal(html.status, 200);
    const md = await get(`/players/${player.slug}/`, {
      headers: { accept: 'text/markdown' },
    });
    assert.equal(md.status, 200);
    assert.match(md.headers.get('content-type'), /text\/markdown/);
    assert.ok(md.body.includes(player.name.split(' ')[0]));
  });

  test('match scorecard markdown contains a table', async () => {
    const db = JSON.parse(readFileSync(join(ROOT, 'data/records.json'), 'utf8'));
    const matchIdOfInnings = new Map(db.innings.map((i) => [i.id, i.matchId]));
    const matchesWithBatting = new Set(db.batting.map((b) => matchIdOfInnings.get(b.inningsId)).filter(Boolean));
    const match = db.matches.find((m) => m.slug && matchesWithBatting.has(m.id));
    if (!match) return;
    const md = await get(`/matches/${match.slug}/`, {
      headers: { accept: 'text/markdown' },
    });
    assert.equal(md.status, 200);
    assert.ok(md.body.includes('|'), 'scorecard should convert to a pipe table');
    assert.ok(/Batter|Bowler/.test(md.body));
  });
});
