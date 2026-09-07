// Table model + serialisers. grid[0] is the header row.

export type Align = 'left' | 'center' | 'right' | 'none';

export interface Model {
  grid: string[][];
  align: Align[]; // per column
}

export function empty(rows: number, cols: number): Model {
  const grid = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => (r === 0 ? `Column ${c + 1}` : '')),
  );
  return { grid, align: Array.from({ length: cols }, () => 'none' as Align) };
}

function colWidths(grid: string[][]): number[] {
  const cols = grid[0]?.length ?? 0;
  const w = new Array(cols).fill(3);
  for (const row of grid) row.forEach((cell, i) => { w[i] = Math.max(w[i], cell.length); });
  return w;
}

function sep(align: Align, width: number): string {
  const dashes = '-'.repeat(Math.max(1, width - (align === 'center' ? 2 : align === 'none' ? 0 : 1)));
  if (align === 'left') return ':' + dashes;
  if (align === 'right') return dashes + ':';
  if (align === 'center') return ':' + dashes + ':';
  return '-'.repeat(Math.max(3, width));
}

function pad(s: string, width: number, align: Align): string {
  const gap = width - s.length;
  if (gap <= 0) return s;
  if (align === 'right') return ' '.repeat(gap) + s;
  if (align === 'center') return ' '.repeat(Math.floor(gap / 2)) + s + ' '.repeat(Math.ceil(gap / 2));
  return s + ' '.repeat(gap);
}

export function toMarkdown(m: Model, pretty = true): string {
  const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const grid = m.grid.map((r) => r.map(esc));
  if (!pretty) {
    const head = `| ${grid[0].join(' | ')} |`;
    const div = `| ${m.align.map((a) => (a === 'left' ? ':---' : a === 'right' ? '---:' : a === 'center' ? ':---:' : '---')).join(' | ')} |`;
    const body = grid.slice(1).map((r) => `| ${r.join(' | ')} |`);
    return [head, div, ...body].join('\n');
  }
  const w = colWidths(grid);
  const line = (cells: string[]) => `| ${cells.map((c, i) => pad(c, w[i], m.align[i])).join(' | ')} |`;
  const divCells = m.align.map((a, i) => sep(a, w[i]));
  return [line(grid[0]), `| ${divCells.join(' | ')} |`, ...grid.slice(1).map(line)].join('\n');
}

export function toHtml(m: Model): string {
  const cell = (tag: 'th' | 'td', s: string, a: Align) =>
    `<${tag}${a !== 'none' ? ` style="text-align:${a}"` : ''}>${s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</${tag}>`;
  const head = `  <thead>\n    <tr>\n${m.grid[0].map((c, i) => `      ${cell('th', c, m.align[i])}`).join('\n')}\n    </tr>\n  </thead>`;
  const body = `  <tbody>\n${m.grid
    .slice(1)
    .map((r) => `    <tr>\n${r.map((c, i) => `      ${cell('td', c, m.align[i])}`).join('\n')}\n    </tr>`)
    .join('\n')}\n  </tbody>`;
  return `<table>\n${head}\n${body}\n</table>`;
}

export function toCsv(m: Model, delim = ','): string {
  const q = (s: string) => (/[",\n]/.test(s) || s.includes(delim) ? '"' + s.replace(/"/g, '""') + '"' : s);
  return m.grid.map((r) => r.map(q).join(delim)).join('\r\n');
}

export function toTsv(m: Model): string {
  return m.grid.map((r) => r.map((s) => s.replace(/\t/g, ' ')).join('\t')).join('\n');
}

// import from pasted Markdown / CSV / TSV
export function parse(text: string): Model | null {
  const t = text.trim();
  if (!t) return null;
  const lines = t.split('\n').map((l) => l.trim()).filter(Boolean);

  // markdown pipe table
  if (lines[0].includes('|') && lines[1] && /^\|?[\s:|-]+\|?$/.test(lines[1])) {
    const cells = (l: string) => l.replace(/^\||\|$/g, '').split('|').map((s) => s.trim().replace(/\\\|/g, '|'));
    const grid = [cells(lines[0]), ...lines.slice(2).map(cells)];
    const align: Align[] = cells(lines[1]).map((s) => {
      const l = s.startsWith(':');
      const r = s.endsWith(':');
      return l && r ? 'center' : r ? 'right' : l ? 'left' : 'none';
    });
    const cols = grid[0].length;
    const norm = grid.map((row) => Array.from({ length: cols }, (_, i) => row[i] ?? ''));
    return { grid: norm, align: Array.from({ length: cols }, (_, i) => align[i] ?? 'none') };
  }

  // CSV / TSV
  const delim = lines[0].includes('\t') ? '\t' : lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const parseRow = (l: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < l.length; i++) {
      const ch = l[i];
      if (q) {
        if (ch === '"' && l[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') q = false;
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === delim) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const rows = lines.map(parseRow);
  const cols = Math.max(...rows.map((r) => r.length));
  const grid = rows.map((r) => Array.from({ length: cols }, (_, i) => r[i] ?? ''));
  return { grid, align: Array.from({ length: cols }, () => 'none' as Align) };
}
