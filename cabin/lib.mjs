// Shared helpers for the cabin scripts.
// The page is assembled from cabin/src/page.html: each <!--@include path--> is replaced by
// that file's text minus one trailing newline, so source files can end in a newline and the
// template's own line breaks separate them.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = dirname(fileURLToPath(import.meta.url));
export const SRC = join(ROOT, 'src');
export const REPO = dirname(ROOT);
export const PAGE_OUT = join(REPO, 'public/mountain-house/index.html');
export const PDF_OUT = join(REPO, 'public/mountain-house/rime-cabin-drawings.pdf');
// Files the page loads at run time (the realistic view's textures), copied as they are.
export const ASSETS_SRC = join(SRC, 'assets');
export const ASSETS_OUT = join(REPO, 'public/mountain-house/assets');

const INCLUDE = /<!--@include ([^>]+?)-->/g;

export function read(path) {
  return readFileSync(join(SRC, path), 'utf8');
}

function body(path) {
  const text = read(path);
  return text.endsWith('\n') ? text.slice(0, -1) : text;
}

export function includes(template = read('page.html')) {
  return [...template.matchAll(INCLUDE)].map((m) => m[1]);
}

// A replacer function, not a string, so `$&` and friends inside the sources stay literal.
export function assemble(template = read('page.html')) {
  return template.replace(INCLUDE, (_, path) => body(path));
}

// Shared by print-pdf.mjs and test.mjs, which drive the installed Google Chrome.
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function waitFor(what, fn, ms = 90000) {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(250)) {
    try {
      const v = await fn();
      if (v) return v;
    } catch {}
  }
  throw new Error(`Timed out waiting for ${what}.`);
}

// A Chrome DevTools Protocol connection: send(method, params) returns the result; on(event, fn) listens
// for page events such as Runtime.exceptionThrown.
export function devtools(url) {
  return new Promise((ok, fail) => {
    const ws = new WebSocket(url), pending = new Map();
    let id = 0;
    ws.onerror = (e) => fail(new Error(`Chrome DevTools connection failed: ${e.message || e.type}`));
    // a dropped connection fails every call still waiting, instead of leaving them hanging
    ws.onclose = () => {
      for (const p of pending.values()) p.fail(new Error('Chrome DevTools connection closed.'));
      pending.clear();
    };
    const listeners = {};
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data), p = pending.get(msg.id);
      if (msg.method) (listeners[msg.method] || []).forEach((fn) => fn(msg.params));
      if (!p) return;
      pending.delete(msg.id);
      msg.error ? p.fail(new Error(msg.error.message)) : p.ok(msg.result);
    };
    ws.onopen = () => ok({
      send: (method, params = {}) => new Promise((ok2, fail2) => {
        pending.set(++id, { ok: ok2, fail: fail2 });
        ws.send(JSON.stringify({ id, method, params }));
      }),
      on: (method, fn) => { (listeners[method] = listeners[method] || []).push(fn); },
      close: () => ws.close(),
    });
  });
}
