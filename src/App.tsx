import { useEffect, useMemo, useRef, useState } from 'react';
import { Align, Model, empty, parse, toCsv, toHtml, toMarkdown, toTsv } from './table';

const LS = 'markdown-table-generator:v1';
type Fmt = 'md' | 'md-compact' | 'html' | 'csv' | 'tsv';
const FMTS: { id: Fmt; label: string }[] = [
  { id: 'md', label: 'Markdown' },
  { id: 'md-compact', label: 'Markdown (compact)' },
  { id: 'html', label: 'HTML' },
  { id: 'csv', label: 'CSV' },
  { id: 'tsv', label: 'TSV' },
];
const ALIGN_CYCLE: Align[] = ['none', 'left', 'center', 'right'];
const ALIGN_ICON: Record<Align, string> = { none: '↔', left: '⇤', center: '⇔', right: '⇥' };

function load(): Model {
  try {
    const j = JSON.parse(localStorage.getItem(LS) || 'null');
    if (j && Array.isArray(j.grid) && j.grid.length) return j;
  } catch { /* ignore */ }
  const m = empty(3, 3);
  m.grid = [['Feature', 'Free', 'Pro'], ['Projects', '3', 'Unlimited'], ['Support', 'Email', 'Priority']];
  m.align = ['left', 'center', 'center'];
  return m;
}

export default function App() {
  const [m, setM] = useState<Model>(load);
  const [fmt, setFmt] = useState<Fmt>('md');
  const [importText, setImportText] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyT = useRef<number>();

  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify(m)); } catch { /* ignore */ }
  }, [m]);

  const output = useMemo(() => {
    switch (fmt) {
      case 'md': return toMarkdown(m, true);
      case 'md-compact': return toMarkdown(m, false);
      case 'html': return toHtml(m);
      case 'csv': return toCsv(m);
      case 'tsv': return toTsv(m);
    }
  }, [m, fmt]);

  const rows = m.grid.length;
  const cols = m.grid[0]?.length ?? 0;

  const setCell = (r: number, c: number, v: string) =>
    setM((x) => ({ ...x, grid: x.grid.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? v : cell)) : row)) }));
  const addRow = () => setM((x) => ({ ...x, grid: [...x.grid, new Array(cols).fill('')] }));
  const addCol = () => setM((x) => ({ ...x, grid: x.grid.map((row, ri) => [...row, ri === 0 ? `Column ${cols + 1}` : '']), align: [...x.align, 'none'] }));
  const delRow = (r: number) => setM((x) => (rows > 2 && r > 0 ? { ...x, grid: x.grid.filter((_, ri) => ri !== r) } : x));
  const delCol = (c: number) => setM((x) => (cols > 1 ? { ...x, grid: x.grid.map((row) => row.filter((_, ci) => ci !== c)), align: x.align.filter((_, ci) => ci !== c) } : x));
  const cycleAlign = (c: number) =>
    setM((x) => ({ ...x, align: x.align.map((a, ci) => (ci === c ? ALIGN_CYCLE[(ALIGN_CYCLE.indexOf(a) + 1) % 4] : a)) }));

  const doImport = () => {
    const parsed = parse(importText);
    if (parsed) { setM(parsed); setImportText(''); setImportOpen(false); }
  };
  const clear = () => setM(empty(3, 3));

  const copy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      window.clearTimeout(copyT.current);
      copyT.current = window.setTimeout(() => setCopied(false), 1300);
    }).catch(() => {});
  };

  return (
    <div className="wrap">
      <header>
        <h1>Markdown Table Generator</h1>
        <p className="sub">
          Fill in the grid, set column alignment, and copy the table as Markdown, HTML, CSV or TSV.
          Paste an existing table to edit it. Runs in your browser.
        </p>
      </header>

      <div className="toolbar">
        <button onClick={addRow}>+ Row</button>
        <button onClick={addCol}>+ Column</button>
        <button onClick={() => setImportOpen((o) => !o)}>{importOpen ? 'Close import' : 'Import / paste'}</button>
        <button className="ghost" onClick={clear}>Clear</button>
      </div>

      {importOpen && (
        <div className="import">
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste a Markdown table, CSV or TSV…"
            spellCheck={false}
          />
          <button onClick={doImport} disabled={!parse(importText)}>Load into grid</button>
        </div>
      )}

      <div className="gridwrap">
        <table className="grid">
          <thead>
            <tr>
              <th className="corner" />
              {m.grid[0].map((_, c) => (
                <th key={c}>
                  <div className="colhead">
                    <button className="align" onClick={() => cycleAlign(c)} title={`Align: ${m.align[c]}`}>{ALIGN_ICON[m.align[c]]}</button>
                    <button className="delc" onClick={() => delCol(c)} disabled={cols <= 1} aria-label="Delete column">×</button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.grid.map((row, r) => (
              <tr key={r}>
                <td className="rownum">
                  {r === 0 ? 'H' : r}
                  {r > 0 && <button className="delr" onClick={() => delRow(r)} disabled={rows <= 2} aria-label="Delete row">×</button>}
                </td>
                {row.map((cell, c) => (
                  <td key={c}>
                    <input
                      value={cell}
                      className={r === 0 ? 'hcell' : ''}
                      style={{ textAlign: m.align[c] === 'none' ? undefined : m.align[c] }}
                      onChange={(e) => setCell(r, c, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="outbar">
        <div className="seg">
          {FMTS.map((f) => (
            <button key={f.id} className={fmt === f.id ? 'on' : ''} onClick={() => setFmt(f.id)}>{f.label}</button>
          ))}
        </div>
        <button className="copy" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <textarea className="output" readOnly value={output} spellCheck={false} onFocus={(e) => e.currentTarget.select()} />

      <div className="preview">
        <h2>Preview</h2>
        <div className="pvtable">
          <table>
            <thead><tr>{m.grid[0].map((c, i) => <th key={i} style={{ textAlign: m.align[i] === 'none' ? undefined : m.align[i] }}>{c}</th>)}</tr></thead>
            <tbody>
              {m.grid.slice(1).map((row, r) => (
                <tr key={r}>{row.map((c, i) => <td key={i} style={{ textAlign: m.align[i] === 'none' ? undefined : m.align[i] }}>{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <section className="explain">
        <h2>Markdown table syntax</h2>
        <p>
          A Markdown table is a header row, a divider row of dashes, then the body — cells separated
          by <code>|</code>. Alignment is set on the divider row: <code>:---</code> left,
          <code> :---:</code> centre, <code>---:</code> right. This tool keeps the columns padded so
          the source stays readable; the <strong>compact</strong> option drops the padding.
        </p>
        <h3>Importing</h3>
        <p>
          Paste a Markdown table, CSV or TSV into the import box and it fills the grid — including
          the alignment from a Markdown divider row. Tabs are detected first, then a lone semicolon,
          otherwise commas, with quoted CSV fields handled.
        </p>
        <h3>Escaping</h3>
        <p>
          A literal <code>|</code> inside a cell is written as <code>\|</code> in Markdown output,
          and <code>&lt;</code> / <code>&amp;</code> are entity-escaped in HTML output.
        </p>
        <h3>Is my data uploaded?</h3>
        <p>No. Everything runs in your browser and the table is saved only in local storage.</p>
        <footer>Markdown Table Generator · client-side · no sign-up · works offline</footer>
      </section>
    </div>
  );
}
