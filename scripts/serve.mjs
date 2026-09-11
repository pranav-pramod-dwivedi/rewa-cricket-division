// Production static server for dist/ (zero dependencies).
//
// Sitemap + robots.txt are generated DYNAMICALLY from the request Host,
// so the same build works on localhost, any preview domain, and the final
// production domain — no rebuild needed when the domain changes.
//
// Usage: node scripts/serve.mjs            (PORT=8080 HOST=0.0.0.0)
//        npm run start

import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, extname, normalize, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { negotiateVariant, MD_VARY, notFoundMarkdown } from '../lib/agentic.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const GZIP_TYPES = new Set(['text/html', 'text/css', 'text/javascript', 'application/json', 'application/xml', 'image/svg+xml']);

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  Vary: MD_VARY,
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'",
};

// /players/x/ -> /players/x.md ; / -> /index.md
const mdFileFor = (path) => join(DIST, path === '/' ? 'index.md' : path.replace(/\/+$/, '') + '.md');

// ---- dynamic sitemap ----
// Walks dist/ for every index.html and emits absolute URLs using the
// request's own host, so the sitemap always matches the domain it is
// served from.
async function walkIndexHtml(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walkIndexHtml(p, out);
    else if (e.name === 'index.html') {
      out.push(p.slice(DIST.length).replace(/index\.html$/, '').replace(sep + '/', '/') || '/');
    }
  }
  return out;
}

const siteBase = (req) => {
  const proto = req.headers['x-forwarded-proto']?.split(',')[0].trim() || 'http';
  const host = req.headers['x-forwarded-host']?.split(',')[0].trim() || req.headers.host || 'localhost';
  return `${proto}://${host}`;
};

const send = (res, status, body, type, extra = {}) => {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': extra.cache || 'no-cache', ...SECURITY_HEADERS });
  res.end(body);
};

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const path = decodeURIComponent(url.pathname);
  const base = siteBase(req);
  try {

    // ---- dynamic sitemap.xml (never served from disk) ----
    if (path === '/sitemap.xml') {
      const pages = await walkIndexHtml(DIST);
      const locs = [...new Set(pages)].sort();
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locs
        .map((p) => `  <url><loc>${base}${p === '/' ? '/' : p}</loc></url>`)
        .join('\n')}\n</urlset>\n`;
      const body = Buffer.from(xml, 'utf8');
      const acceptGzip = /gzip/.test(req.headers['accept-encoding'] || '');
      res.writeHead(200, {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        ...(acceptGzip ? { 'Content-Encoding': 'gzip' } : {}),
        ...SECURITY_HEADERS,
      });
      res.end(acceptGzip ? gzipSync(body) : body);
      return;
    }

    // ---- MCP live handshake ----
    if (path === '/.well-known/mcp' || path === '/.well-known/mcp/') {
      try {
        const mcpData = await readFile(join(DIST, '.well-known', 'mcp', 'manifest.json'));
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          ...SECURITY_HEADERS,
        });
        res.end(mcpData);
        return;
      } catch {}
    }

    // ---- dynamic robots.txt ----
    if (path === '/robots.txt') {
      const txt = `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${base}/sitemap.xml\n`;
      send(res, 200, txt, 'text/plain; charset=utf-8');
      return;
    }

    // ---- markdown content negotiation (mirrors edge middleware) ----
    const lastSeg = path.split('/').pop() || '';
    if (!lastSeg.includes('.') && negotiateVariant(req.headers.accept) === 'markdown') {
      try {
        const md = await readFile(mdFileFor(path));
        const acceptGzip = /gzip/.test(req.headers['accept-encoding'] || '');
        res.writeHead(200, {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Cache-Control': 'public, max-age=0, must-revalidate',
          ...(acceptGzip ? { 'Content-Encoding': 'gzip' } : {}),
          ...SECURITY_HEADERS,
        });
        res.end(acceptGzip ? gzipSync(md) : md);
      } catch {
        send(res, 404, notFoundMarkdown(path), 'text/markdown; charset=utf-8');
      }
      return;
    }

    // ---- static files ----
    let filePath = normalize(join(DIST, path));
    if (!filePath.startsWith(DIST)) return send(res, 403, 'Forbidden', 'text/plain');

    // directory → index.html
    try {
      const st = await stat(filePath);
      if (st.isDirectory()) filePath = join(filePath, 'index.html');
    } catch {}

    const body = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    const acceptGzip = /gzip/.test(req.headers['accept-encoding'] || '');
    const cacheable = mime.startsWith('text/') || mime.includes('json') || mime.includes('xml') || mime.includes('svg');
    const headers = {
      'Content-Type': mime,
      'Cache-Control': cacheable ? 'no-cache' : 'public, max-age=604800',
      ...(acceptGzip && GZIP_TYPES.has(mime.split(';')[0]) ? { 'Content-Encoding': 'gzip' } : {}),
      ...SECURITY_HEADERS,
    };
    res.writeHead(200, headers);
    res.end(acceptGzip && GZIP_TYPES.has(mime.split(';')[0]) ? gzipSync(body) : body);
  } catch {
    // ---- 404: content negotiation (markdown for agents, HTML for browsers) ----
    const accept = req.headers.accept || '';
    const ua = req.headers['user-agent'] || '';
    const wantsMd = negotiateVariant(accept) === 'markdown' ||
      (/curl|bot|spider|crawler|agent|ora/i.test(ua) && !accept.includes('text/html'));

    if (wantsMd) {
      send(res, 404, notFoundMarkdown(path), 'text/markdown; charset=utf-8');
      return;
    }
    try {
      const notFound = await readFile(join(DIST, '404.html'));
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', ...SECURITY_HEADERS });
      res.end(notFound);
    } catch {
      send(res, 404, notFoundMarkdown(path), 'text/markdown; charset=utf-8');
    }
  }
}).listen(PORT, HOST, () => {
  console.log(`Rewa Cricket Division archive serving dist/ at http://localhost:${PORT} (dynamic sitemap & robots)`);
});
