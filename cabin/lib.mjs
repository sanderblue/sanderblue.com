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
