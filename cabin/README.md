# Rime Cabin

Source for the cabin page at https://sanderblue.com/mountain-house/: a 3D model, cost estimate, build schedule and 20-sheet drawing set, all generated from one data model.

The page ships as a single self-contained file, `public/mountain-house/index.html`, next to the drawing set `public/mountain-house/rime-cabin-drawings.pdf`. Both are build outputs of this folder and are committed. The site's normal deploy (push to `main`) publishes them.

## Commands

| Command | What it does |
|---|---|
| `npm run cabin:build` | Assembles `src/` into `public/mountain-house/index.html`. |
| `npm run cabin:build -- --check` | Exits 1 if the committed page doesn't match `src/`. |
| `npm run cabin:check` | Runs the engine in Node with the default choices and prints the total, parts count and design checks. Exits 1 on a failed check or a parts-list problem. `-- --lean` runs the "Lean build" preset; `-- --set heat=propane --set loft=true` changes single choices. |
| `npm run cabin:pdf` | Prints every sheet (default choices) to `public/mountain-house/rime-cabin-drawings.pdf` with the installed Google Chrome. `-- --out <file>` writes elsewhere. Set `CHROME_PATH` if Chrome isn't in `/Applications`. Needs network access for the Google Fonts. |

## Making a change

1. Edit files in `src/`. Design data (sizes, rooms, openings, catalog and prices, rates) is in `src/model.json`. How parts, prices and checks are generated is in `src/engine/`. Sheets are in `src/drawings/`.
2. `npm run cabin:check`, and the same with `-- --lean`.
3. `npm run cabin:build`, then look at the page: `npm run build`, serve `out/` (e.g. `python3 -m http.server --directory out`), open `/mountain-house/`. `next dev` won't serve the folder's index.
4. If anything on the drawings could have changed, `npm run cabin:pdf`. Each new PDF adds about 14 MB to git history, so skip it for page-only changes.
5. Commit `cabin/` and `public/mountain-house/` together.

## Layout

```
src/page.html        page shell: head, markup, and the include list (load order)
src/styles.css       page styles
src/model.json       the data model, exposed to the page as MODEL
src/vendor/          three.js r147 (MIT) and its OrbitControls, as they were in the page
src/engine/          ENG: geometry, parts, structure, pricing, checks, schedule (no DOM; also runs in Node)
src/scene.js         SCN: engine parts to three.js meshes
src/viewer.js        startViewer(): renderer, camera views, sun, layers, section cut
src/plan.js          PLAN: the page's floor plan
src/drawings/        DWG: the drawing set, one SVG per sheet
src/page/            APP, COST, BUILD, DWGUI: the page UI
build.mjs, check.mjs, print-pdf.mjs, lib.mjs   the scripts above
```

`page.html` pulls files in with `<!--@include path-->`, which is replaced by that file's text minus one trailing newline, so files end in a newline and the shell's line breaks separate them. Scripts share globals (`MODEL`, `ENG`, `DWG`, ...) in that order, so a new file goes into the include list after what it uses.

The page keeps `<meta name="robots" content="noindex">` and the inline script that adds the trailing slash to `/mountain-house`; both are in `src/page.html`.

## History

The page was last generated in the claude.ai artifact "Rime Cabin" (https://claude.ai/artifact/LvR9hEkCPDjVfhYdDGtDNR). This folder was split out of the published page on 2026-10-13, after the budget was removed from it, and rebuilds that page byte for byte. The claude.ai artifact is retired: it still shows the budget and doesn't get later changes.
