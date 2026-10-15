# Rime Cabin

Source for the cabin page at https://sanderblue.com/mountain-house/: a 3D model, cost estimate, build schedule and 20-sheet drawing set, all generated from one data model.

The page ships as a single self-contained file, `public/mountain-house/index.html`, next to the drawing set `public/mountain-house/rime-cabin-drawings.pdf` and the realistic view's textures in `public/mountain-house/assets/`. All three are build outputs of this folder and are committed. The site's normal deploy (push to `main`) publishes them.

## Commands

| Command | What it does |
|---|---|
| `npm run cabin:build` | Assembles `src/` into `public/mountain-house/index.html` and copies `src/assets/` to `public/mountain-house/assets/`. |
| `npm run cabin:build -- --check` | Exits 1 if the committed page or assets don't match `src/`. |
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
src/real.js          REAL: the Realistic view (sky light, textures, terrain, trees, grass, snow, post pass)
src/assets/          files the page loads at run time: the Realistic view's textures
src/viewer.js        startViewer(): renderer, camera views, sun, layers, section cut
src/plan.js          PLAN: the page's floor plan
src/drawings/        DWG: the drawing set, one SVG per sheet
src/page/            APP, COST, BUILD, DWGUI: the page UI
build.mjs, check.mjs, print-pdf.mjs, lib.mjs   the scripts above
prompts/             price-check.md, a prompt for re-checking the estimate's prices against 2026 sources, and
                     price-check.mjs, which refreshes that prompt's appendix from model.json (not part of the build)
```

`page.html` pulls files in with `<!--@include path-->`, which is replaced by that file's text minus one trailing newline, so files end in a newline and the shell's line breaks separate them. Scripts share globals (`MODEL`, `ENG`, `DWG`, ...) in that order, so a new file goes into the include list after what it uses.

## Realistic view

The Realistic chip on the 3D model turns on `src/real.js`. It is off by default and built the first time it is turned on, so the plain view, the flyby and the drawing set cover render exactly as before. While it is on, it adds:

- A sky and the light it gives: a blue sky with a sun glow, the same sky as an environment map, and a haze that matches the horizon.
- The building's own materials, upgraded and put back when it turns off. Paint colors are treated as sRGB, the siding and seams get normal maps, and wood and gravel get photo textures.
- Rolling ground beyond the lot and a ring of peaks.
- Engelmann spruce, lodgepole pine and aspen where the plain view's trees stand, with card trees and spires further out.
- Summer grass and wildflowers.
- Winter snow: a rounded roof blanket that curls over the north eave, drifts, tree wells, and plowed gravel with windrows.
- A post pass for ambient occlusion and filmic tone.

Phones and other touch screens get a lighter version aimed at 60 fps on an iPhone 13 Pro. It drops the post pass, draws at 1.5 times the screen's pixels instead of 2, and uses simpler and fewer distant trees, half the grass and a smaller shadow map. That comes to about 0.7 million triangles a frame in summer, against 1.75 million before the trim.

On any device, a frame-rate guard watches the first few seconds after the view turns on. If frames come slower than about 45 fps, it steps down in this order: half the grass, a lower pixel ratio, then no post pass on desktop, or a quarter of the grass and no tree shadows on phones. A browser that caps animation at 30 fps to save power also gets these steps.

The textures load from `assets/textures/` beside the page, about 2 MB, only when the view is first turned on. Until they arrive, or if they can't load (a `file://` page), the same surfaces show in plain colors.

Textures are CC0 from [Poly Haven](https://polyhaven.com), resized to 1K or 512 px and saved as WebP:

| File prefix | Poly Haven asset | Authors |
|---|---|---|
| `snow_` | Snow 02 | Rob Tuytel |
| `meadow_` | Rocky Terrain 02 | Amal Kumar |
| `gravel_` | Gravel Floor 02 | Jenelle van Heerden, Dimitrios Savva |
| `bark_` | Pine Bark | Dimitrios Savva |
| `planks_` | Brown Planks 09 | Rob Tuytel |

The needles, leaves, flowers, aspen bark, siding and seam normal maps are drawn in the page.

The page keeps `<meta name="robots" content="noindex">` and the inline script that adds the trailing slash to `/mountain-house`; both are in `src/page.html`.

## History

The page was last generated in the claude.ai artifact "Rime Cabin" (https://claude.ai/artifact/LvR9hEkCPDjVfhYdDGtDNR). This folder was split out of the published page on 2026-10-13, after the budget was removed from it, and rebuilds that page byte for byte. The claude.ai artifact is retired: it still shows the budget and doesn't get later changes.
