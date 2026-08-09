#!/usr/bin/env node
// Minimal CDP driver for headless Chrome — used for large-scale site crawling
// without opening visible browser tabs. Usage:
//   node scripts/cdp.mjs <url> <waitMs> ["<js-expression to evaluate>"]
// Prints the evaluated result (or page text) as JSON to stdout.
import { execSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
const PROFILE = process.env.HOME + '/.openclaw/browser/openclaw/user-data';

const [url = '', waitMs = '8000', expr = 'document.body.innerText'] = process.argv.slice(2);

async function main() {
  // ensure chrome is running headless with debugging port
  try {
    fetch(`http://127.0.0.1:${PORT}/json/version`).catch(() => null);
  } catch {}
  let started = false;
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
    if (!r.ok) throw new Error('no');
  } catch {
    const p = spawn(CHROME, [
      // headed but positioned off-screen: passes bot-detection fingerprinting,
      // yet never appears on the user's screen
      '--no-first-run',
      '--no-default-browser-check',
      '--window-position=-3000,-3000',
      '--window-size=1024,768',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${PROFILE}`,
      'about:blank',
    ], { stdio: 'ignore', detached: true });
    p.unref();
    started = true;
    // wait for debugging port
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
        if (r.ok) break;
      } catch {}
    }
  }

  // create a new tab
  const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0;
  const pending = new Map();
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url });
  // wait for load + extra render time
  await new Promise((r) => setTimeout(r, Number(waitMs)));

  const result = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  let out = result.result?.value ?? '';
  if (typeof out !== 'string') out = JSON.stringify(out);
  console.log(out);
  ws.close();
  // close the tab
  try { await fetch(`http://127.0.0.1:${PORT}/json/close/${tab.id}`); } catch {}
  process.exit(0);
}

main().catch((e) => { console.error('ERR', e.message); process.exit(1); });
