# sanderblue.com

Next.js 15 static export (`output: 'export'`). `npm run build` writes `out/`; everything in `public/` is copied as-is. Every push to `main` deploys `out/` to the DigitalOcean droplet (`.github/workflows/main.yml`). The droplet's nginx answers unknown paths with the homepage and a 200, so check a deploy by content (size or hash), not status code.

## Mountain house page

`public/mountain-house/` (the Rime Cabin page, its drawing PDF and the realistic view's textures in `assets/`) is built from `cabin/`. See `cabin/README.md`.

- Never hand-edit `public/mountain-house/index.html`, the PDF or `public/mountain-house/assets/`. Edit `cabin/src/`, then `npm run cabin:build`.
- Before committing a cabin change: `npm run cabin:check` (also with `-- --lean`) and `npm run cabin:build -- --check`. Run `npm run cabin:pdf` when the drawings could have changed; each PDF adds ~14 MB to git history.
- Commit `cabin/` and `public/mountain-house/` together.
- The claude.ai "Rime Cabin" artifact is retired; this repo is the only source.
