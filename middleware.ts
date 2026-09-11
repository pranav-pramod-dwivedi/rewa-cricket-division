// Edge middleware: markdown content negotiation, live MCP handshake, and agent-friendly 404s.
const MD_VARY = 'Accept, Accept-Encoding';

const MCP_MANIFEST = {
  name: "rewa-cricket-division-mcp",
  version: "1.0.0",
  protocolVersion: "2024-11-05",
  description: "Official Model Context Protocol (MCP) server for the Rewa Division Cricket Association (RDCA) archive.",
  capabilities: {
    tools: { listChanged: false },
    resources: { subscribe: false, listChanged: false },
  },
  serverInfo: {
    name: "RDCA Archive MCP Server",
    version: "1.0.0",
  },
  tools: [
    {
      name: "search_archive",
      description: "Search players, matches, tournaments, and teams in the RDCA cricket archive",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query or player/match name" },
        },
        required: ["query"],
      },
    },
    {
      name: "get_player",
      description: "Fetch player profile, career statistics, and batting/bowling records",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Player slug (e.g. pranav-dwivedi)" },
        },
        required: ["id"],
      },
    },
    {
      name: "get_match",
      description: "Fetch complete match scorecard, playing XIs, and official match details",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Match slug" },
        },
        required: ["id"],
      },
    },
    {
      name: "get_tournament",
      description: "Fetch tournament schedule, points table, and historical champions",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Tournament slug" },
        },
        required: ["id"],
      },
    },
  ],
};

function wantsMarkdown(request: Request): boolean {
  const accept = request.headers.get("accept") || "";
  if (!accept.toLowerCase().includes("text/markdown")) return false;
  const entries = accept.split(",");
  let mdQ = -1;
  let htmlQ = -1;
  for (const raw of entries) {
    const [typePart, ...params] = raw.trim().split(";");
    const type = typePart.trim().toLowerCase();
    let q = 1;
    for (const p of params) {
      const m = p.trim().match(/^q\s*=\s*([0-9.]+)$/i);
      if (m) {
        const n = parseFloat(m[1]);
        if (!isNaN(n)) q = n;
      }
    }
    if (type === "text/markdown") mdQ = q;
    else if (type === "text/html" || type === "*/*") htmlQ = Math.max(htmlQ, q);
  }
  return mdQ > 0 && htmlQ <= mdQ;
}

function mdUrlFor(pathname: string): string | null {
  const last = pathname.split("/").pop() || "";
  if (last.includes(".")) return null;
  return pathname.replace(/\/+$/, "") + ".md";
}

function notFoundMarkdown(pathname: string, origin: string = ""): string {
  const safePath = String(pathname || "/").slice(0, 300);
  return `# 404 — Page Not Found\n\nThe requested path \`${safePath}\` does not exist in the **Rewa Division Cricket Association (RDCA)** archive — the official record of organised cricket in the Rewa region of Madhya Pradesh, India.\n\n## Where to look next\n\n- [Home](${origin}/) — latest results, news and archive overview\n- [llms.txt](${origin}/llms.txt) — machine-readable guide to this site, when to use it, and how to query it\n- [Sitemap](${origin}/sitemap.xml) — complete URL inventory (${origin}/sitemap.xml)\n- [Developers](${origin}/developers/) — API documentation, OpenAPI 3.1 specification, and MCP manifests\n- [MCP Manifest](${origin}/.well-known/mcp/manifest.json) — Model Context Protocol endpoint\n- [Archive](${origin}/archive/) · [Players](${origin}/players/) · [Teams](${origin}/teams/) · [Matches](${origin}/matches/) · [Tournaments](${origin}/tournaments/)\n- [Search](${origin}/search/) — full-text search across the archive\n\nTip: append \`.md\` to any page URL (or send \`Accept: text/markdown\`) to receive the clean Markdown version.\n`;
}

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const accept = request.headers.get("accept") || "";
  const isHead = request.method === "HEAD";

  if (url.pathname === "/.well-known/mcp" || url.pathname === "/.well-known/mcp/") {
    const body = isHead ? null : JSON.stringify(MCP_MANIFEST, null, 2);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Cache-Control": "public, max-age=3600",
        Vary: MD_VARY,
      },
    });
  }

  if (wantsMarkdown(request)) {
    let mdPath: string | null = url.pathname === "/" ? "/index.md" : mdUrlFor(url.pathname);
    if (mdPath) {
      const mdRes = await fetch(new URL(mdPath, url.origin), { method: request.method });
      if (mdRes.ok) {
        return new Response(isHead ? null : mdRes.body, {
          status: 200,
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            Vary: MD_VARY,
            "Cache-Control": "public, max-age=0, must-revalidate",
          },
        });
      }
    }
    return new Response(isHead ? null : notFoundMarkdown(url.pathname, url.origin), {
      status: 404,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        Vary: MD_VARY,
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  }

  const res = await fetch(request);

  if (res.status === 404) {
    const ua = request.headers.get("user-agent") || "";
    const isAgent =
      wantsMarkdown(request) ||
      !accept.includes("text/html") ||
      accept.includes("text/markdown") ||
      accept === "*/*" ||
      /curl|bot|spider|crawler|agent|ora|python|fetch/i.test(ua);

    if (isAgent) {
      return new Response(isHead ? null : notFoundMarkdown(url.pathname, url.origin), {
        status: 404,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          Vary: MD_VARY,
          "Cache-Control": "public, max-age=0, must-revalidate",
        },
      });
    }
  }

  const headers = new Headers(res.headers);
  headers.set("Vary", MD_VARY);
  return new Response(isHead ? null : res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}
