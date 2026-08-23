// Edge middleware: markdown content negotiation for agents.
//
// Browsers are untouched — requests without an explicit `Accept: text/markdown`
// preference pass straight through to the statically served site. Agents that
// ask for Markdown get a pre-rendered `.md` variant of the same URL, served as
// `text/markdown` with `Vary: Accept, Accept-Encoding`. Unknown paths get a
// real HTTP 404 whose body is short Markdown pointing at recovery resources.

const MD_VARY = 'Accept, Accept-Encoding';

function wantsMarkdown(request: Request): boolean {
  const accept = request.headers.get('accept') || '';
  if (!accept.toLowerCase().includes('text/markdown')) return false;
  const entries = accept.split(',');
  let mdQ = -1;
  let htmlQ = -1;
  for (const raw of entries) {
    const [typePart, ...params] = raw.trim().split(';');
    const type = typePart.trim().toLowerCase();
    let q = 1;
    for (const p of params) {
      const m = p.trim().match(/^q\s*=\s*([0-9.]+)$/i);
      if (m) {
        const n = parseFloat(m[1]);
        if (!isNaN(n)) q = n;
      }
    }
    if (type === 'text/markdown') mdQ = q;
    else if (type === 'text/html' || type === '*/*') htmlQ = Math.max(htmlQ, q);
  }
  return mdQ > 0 && htmlQ <= mdQ;
}

function mdUrlFor(pathname: string): string | null {
  const last = pathname.split('/').pop() || '';
  if (last.includes('.')) return null; // assets & explicit files never negotiate
  return pathname.replace(/\/+$/, '') + '.md';
}

function notFoundMarkdown(pathname: string): string {
  return `# 404 — Page Not Found

The requested path \`${pathname}\` does not exist in the **Rewa Division Cricket Association (RDCA)** archive — the official record of organised cricket in the Rewa region of Madhya Pradesh, India.

## Where to look next

- [Home](/) — latest results, news and archive overview
- [llms.txt](/llms.txt) — machine-readable guide to this site
- [Sitemap](/sitemap.xml) — every public URL
- [Archive](/archive/) · [Players](/players/) · [Teams](/teams/) · [Matches](/matches/)
- [Search](/search/) — full-text search across the archive

Tip: append \`.md\` to any page URL (or send \`Accept: text/markdown\`) to get a Markdown version.
`;
}

export default async function middleware(request: Request): Promise<Response> {
  const accept = request.headers.get('accept') || '';
  if (!accept.toLowerCase().includes('text/markdown')) {
    return fetch(request);
  }

  const url = new URL(request.url);
  if (url.pathname === '/') {
    if (!wantsMarkdown(request)) return fetch(request);
    const res = await fetch(new URL('/index.md', url.origin));
    if (res.ok) {
      return new Response(res.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          Vary: MD_VARY,
          'Cache-Control': 'public, max-age=0, must-revalidate',
        },
      });
    }
    return fetch(request);
  }

  const mdPath = mdUrlFor(url.pathname);
  if (!mdPath || !wantsMarkdown(request)) return fetch(request);

  const res = await fetch(new URL(mdPath, url.origin));
  if (res.ok) {
    return new Response(res.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        Vary: MD_VARY,
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    });
  }

  return new Response(notFoundMarkdown(url.pathname), {
    status: 404,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      Vary: MD_VARY,
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
