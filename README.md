# Markdown Table Generator

Build a table in a grid and export it, in the browser.

- Editable grid; add/remove rows and columns; per-column alignment (none / left / centre / right).
- Output: **Markdown** (padded so the source lines up), **Markdown compact**, **HTML**
  (with `text-align`), **CSV**, **TSV**.
- **Import**: paste a Markdown table, CSV or TSV to fill the grid — Markdown alignment is read
  from the divider row.
- Live rendered preview. `|` is escaped in Markdown, `< & >` in HTML.
- Table persists in `localStorage`.

## Develop

```
npm install
npm run dev
npm run build
```

Model & serialisers: [`src/table.ts`](src/table.ts). Static site on Cloudflare Workers.

Part of [Tiny Tools](https://tinytools.correia95.workers.dev).
