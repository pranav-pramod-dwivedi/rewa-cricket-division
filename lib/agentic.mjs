// Shared agentic-readiness helpers used by the builder, dev server and tests.
// Zero dependencies — node builtins only.

// ---------- Accept-header negotiation ----------
// RFC 9110 proactive negotiation over {text/html, text/markdown}.

export function parseAccept(header) {
  if (!header || typeof header !== 'string') return [];
  return header
    .split(',')
    .map((part) => {
      const [rawType, ...params] = part.trim().split(';');
      let q = 1;
      for (const p of params) {
        const m = p.trim().match(/^q\s*=\s*([0-9.]+)$/i);
        if (m) {
          const n = parseFloat(m[1]);
          if (!isNaN(n)) q = n;
        }
      }
      return { type: rawType.trim().toLowerCase(), q };
    })
    .filter((e) => e.type);
}

// Returns 'markdown' | 'html'. Only engages when text/markdown is explicitly
// listed with q > 0; anything else keeps the historical HTML behaviour.
export function negotiateVariant(acceptHeader) {
  const entries = parseAccept(acceptHeader);
  if (!entries.length) return 'html';
  const md = entries.find((e) => e.type === 'text/markdown');
  if (!md || md.q <= 0) return 'html';
  const exactHtml = entries.find((e) => e.type === 'text/html');
  const wild = entries.find((e) => e.type === '*/*');
  const htmlQ = exactHtml ? exactHtml.q : wild ? wild.q : -1;
  return htmlQ > md.q ? 'html' : 'markdown';
}

export const MD_VARY = 'Accept, Accept-Encoding';

// ---------- entities ----------
const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '—', ndash: '–', hellip: '…', copy: '©', reg: '®', trade: '™',
  middot: '·', bull: '•', rarr: '→', larr: '←', nearr: '↗', dagger: '†',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', times: '×',
};

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      try { return String.fromCodePoint(parseInt(h, 16)); } catch { return ''; }
    })
    .replace(/&#(\d+);/g, (_, d) => {
      try { return String.fromCodePoint(parseInt(d, 10)); } catch { return ''; }
    })
    .replace(/&([a-z][a-z0-9]*);/gi, (m, name) => {
      const v = ENTITIES[name.toLowerCase()];
      return v !== undefined ? v : m;
    });
}

// ---------- HTML -> Markdown ----------
// Converts the subset of HTML emitted by scripts/build.mjs. Not a general
// parser: layout chrome (header/nav/footer/scripts/forms/search widgets) is
// dropped, <main> content becomes clean Markdown.

const BLOCK_CLOSE_NEWLINE =
  /(<\/(?:p|h[1-6]|li|tr|div|section|article|aside|table|thead|tbody|ul|ol|dl|pre|blockquote|figcaption)>)/gi;

function inlineToMarkdown(html) {
  return html
    .replace(/<(script|style|svg|template)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/<input\b[^>]*>/gi, '')
    .replace(/<button\b[^>]*>[\s\S]*?<\/button>/gi, '')
    .replace(/<select\b[^>]*>[\s\S]*?<\/select>/gi, '')
    .replace(/<label\b[^>]*>[\s\S]*?<\/label>/gi, '')
    .replace(/<a\b[^>]*href="([^"#]*)"[^>]*>\s*([\s\S]*?)<\/a>/gi, (m, href, inner) => {
      const text = inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (!text) return '';
      if (/^(mailto:|tel:)/i.test(href)) return text;
      if (href.startsWith('/')) return `[${text}](${href})`;
      try { return `[${text}](${new URL(href, 'https://x.local').href})`; }
      catch { return text; }
    })
    .replace(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b\b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em\b[^>]*>([\s\S]*?)<\/em>/gi, '_$1_')
    .replace(/<i\b[^>]*>([\s\S]*?)<\/i>/gi, '_$1_')
    .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');
}

const cellText = (cell) =>
  cell
    .replace(BLOCK_CLOSE_NEWLINE, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\|/g, '\\|');

function tablesToMarkdown(html) {
  return html.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (m, inner) => {
    const rows = [...inner.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(
      (r) => [...r[1].matchAll(/<t([hd])\b[^>]*>([\s\S]*?)<\/t\1>/gi)].map((c) => cellText(c[2])),
    );
    if (!rows.length) return '';
    const width = Math.max(...rows.map((r) => r.length));
    const norm = rows.map((r) => { const c = r.slice(); while (c.length < width) c.push(''); return c; });
    const out = [];
    out.push('| ' + norm[0].join(' | ') + ' |');
    out.push('| ' + Array(width).fill('---').join(' | ') + ' |');
    for (let i = 1; i < norm.length; i++) out.push('| ' + norm[i].join(' | ') + ' |');
    return '\n' + out.join('\n') + '\n';
  });
}

function listsToMarkdown(html) {
  let depthFix = html;
  // ordered lists keep their numbers as literal prefixes
  depthFix = depthFix.replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (m, inner) =>
    inner.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (mm, li) => `\n1. ${li}\n`),
  );
  depthFix = depthFix.replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, (m, inner) =>
    inner.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (mm, li) => `\n- ${li}\n`),
  );
  return depthFix;
}

export function htmlToMarkdown(pageHtml, { title, url } = {}) {
  let html = String(pageHtml ?? '');
  const mainMatch = html.match(/<main\b[^>]*id="main"[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) html = mainMatch[1];

  html = tablesToMarkdown(html);
  html = listsToMarkdown(html);
  html = inlineToMarkdown(html);
  html = html
    .replace(/<h([1-6])\b[^>]*>/gi, (m, lvl) => '\n\n' + '#'.repeat(Number(lvl)) + ' ')
    .replace(BLOCK_CLOSE_NEWLINE, '\n')
    .replace(/<hr\b[^>]*>/gi, '\n\n---\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<dt\b[^>]*>([\s\S]*?)<\/dt>/gi, (m, t) => '\n**' + t.trim() + ':** ')
    .replace(/<dd\b[^>]*>([\s\S]*?)<\/dd>/gi, '$1\n')
    .replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (m, code) => '\n```\n' + code.trim() + '\n```\n')
    .replace(/<blockquote\b[^>]*>/gi, '\n> ');

  let text = decodeEntities(html)
    .split('\n')
    .map((line) => line.replace(/<[^>]+>/g, '').replace(/[ \t]+/g, ' ').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const header = [];
  if (title) header.push('# ' + title, '');
  if (url) header.push('Source: ' + url, '');
  return (header.length ? header.join('\n') + '\n' : '') + text + '\n';
}

export function pageTitleFromHtml(html) {
  const t = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '';
  return decodeEntities(t)
    .replace(/\s*\|\s*Rewa Division Cricket Association \(RDCA\)\s*$/, '')
    .replace(/\s+—\s+Official Website & Archive\s*$/, '')
    .trim();
}

// ---------- shared bodies ----------

export function notFoundMarkdown(path, base = '') {
  const safePath = String(path || '/').slice(0, 300);
  return `# 404 — Page Not Found

The requested path \`${safePath}\` does not exist in the **Rewa Division Cricket Association (RDCA)** archive — the official record of organised cricket in the Rewa region of Madhya Pradesh, India.

## Where to look next

- [Home](${base}/) — latest results, news and archive overview
- [llms.txt](${base}/llms.txt) — machine-readable guide to this site: what it covers, how to fetch content as Markdown, and developer resources
- [Sitemap](${base}/sitemap.xml) — every public URL (${base}/sitemap.xml)
- [Archive](/archive/) — browse competitions by category
- [Players](/players/) · [Teams](/teams/) · [Matches](/matches/) · [Tournaments](/tournaments/) · [Venues](/venues/)
- [Search](/search/) — full-text search across the archive

Tip: append \`.md\` to any page URL (or send \`Accept: text/markdown\`) to get a Markdown version.
`;
}
