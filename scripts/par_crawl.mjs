#!/usr/bin/env node
// PARALLEL multi-tab CDP crawler — opens N tabs, fetches concurrently.
// Usage: node scripts/par_crawl.mjs <urls-file> <waitMs> <tabs> <expr-file> > out.jsonl
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
const PROFILE = process.env.HOME + '/.openclaw/browser/openclaw/user-data';

const [urlsFile, waitMsStr, tabsStr, exprFile] = process.argv.slice(2);
const waitMs = Number(waitMsStr || '10000');
const TABS = Math.min(Number(tabsStr || '4'), 8);
const expr = exprFile ? readFileSync(exprFile, 'utf8') : 'document.body.innerText';
const urls = readFileSync(urlsFile, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);

async function ensureChrome() {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch {}
  const p = spawn(CHROME, ['--no-first-run','--no-default-browser-check','--window-position=-3000,-3000','--window-size=1400,900',`--remote-debugging-port=${PORT}`,`--user-data-dir=${PROFILE}`,'about:blank'], { stdio: 'ignore', detached: true });
  p.unref();
  for (let i = 0; i < 40; i++) { await new Promise(r => setTimeout(r, 500)); try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return; } catch {} }
  throw new Error('chrome did not start');
}

async function openTab(url) {
  const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mid = ++id; pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result); } };
  await send('Page.enable'); await send('Runtime.enable');
  return { tab, ws, send };
}

async function fetchInTab(t, url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await t.send('Page.navigate', { url });
      await new Promise(r => setTimeout(r, waitMs));
      // wait for load event; retry if target navigated mid-eval
      const result = await t.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      let out = result.result?.value ?? '';
      if (typeof out !== 'string') out = JSON.stringify(out);
      if (out) return out;
      await new Promise(r => setTimeout(r, 3000));
    } catch (e) {
      await new Promise(r => setTimeout(r, 4000));
      if (attempt === 2) throw e;
    }
  }
  return '';
}

await ensureChrome();
// pre-open TABS tabs
const tabs = [];
for (let i = 0; i < TABS; i++) tabs.push(await openTab('about:blank'));

let next = 0;
async function worker(t) {
  while (next < urls.length) {
    const i = next++;
    const url = urls[i];
    try {
      const out = await fetchInTab(t, url);
      console.log(JSON.stringify({ url, result: out }));
    } catch (e) {
      console.log(JSON.stringify({ url, error: e.message }));
    }
  }
  try { await fetch(`http://127.0.0.1:${PORT}/json/close/${t.tab.id}`); } catch {}
}

await Promise.all(tabs.map(worker));
process.exit(0);
