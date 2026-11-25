import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import './insights.css';
import './export.css';
import { buildResultsCsv, resultsCsvFilename } from './csvExport.js';

const ParticleSphere = lazy(() => import('./components/ParticleSphere.jsx'));

const API = 'http://127.0.0.1:8000';
const EXAMPLES = [
  { name: 'Paracetamol', category: 'Analgesic · antipyretic', note: 'A familiar pain-relief molecule.', smiles: 'CC(=O)Nc1ccc(O)cc1', number: '01', color: 'blue' },
  { name: 'Aspirin', category: 'Analgesic · anti-inflammatory', note: 'A classic salicylate structure.', smiles: 'CC(=O)Oc1ccccc1C(=O)O', number: '02', color: 'orange' },
  { name: 'Caffeine', category: 'Methylxanthine · stimulant', note: 'A compact nitrogen-rich molecule.', smiles: 'Cn1c(=O)c2c(ncn2C)n(C)c1=O', number: '03', color: 'violet' },
];

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const paths = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    atom: <><circle cx="12" cy="12" r="1.5" /><ellipse cx="12" cy="12" rx="9" ry="4" /><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)" /></>,
    upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M4 16v4h16v-4" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16Z" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 20h14" /></>,
  };
  return <svg {...common}>{paths[name] || paths.atom}</svg>;
}

function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || !('IntersectionObserver' in window)) {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.16 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${visible ? 'is-visible' : ''} ${className}`} style={{ '--reveal-delay': `${delay}ms` }}>{children}</div>;
}

function ExampleCard({ molecule, onSelect }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let live = true;
    fetch(`${API}/depict`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ smiles: molecule.smiles }),
    }).then((response) => response.ok ? response.json() : null)
      .then((body) => { if (live && body?.svg) setSvg(body.svg); })
      .catch(() => {});
    return () => { live = false; };
  }, [molecule.smiles]);

  return (
    <article className={`example-card ${molecule.color}`}>
      <div className="example-card-top"><span className="eyebrow">REFERENCE / {molecule.number}</span><Icon name="arrow" size={16} /></div>
      <div className="example-structure" aria-label={`${molecule.name} molecular structure preview`}>
        {svg ? <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt={`${molecule.name} molecular structure`} /> : <div className="structure-loading"><Icon name="atom" size={28} /></div>}
      </div>
      <div className="example-copy">
        <div><span className="example-category">{molecule.category}</span><h3>{molecule.name}</h3><p>{molecule.note}</p></div>
        <button className="text-action" type="button" onClick={() => onSelect(molecule)} aria-label={`Analyze ${molecule.name}`}>
          Analyze molecule <Icon name="arrow" size={16} />
        </button>
      </div>
    </article>
  );
}

function MetricCard({ title, metricKey, unit, criteria, index }) {
  const criterion = criteria?.[metricKey];
  if (!criterion) return null;
  const pass = criterion.passes;
  const value = typeof criterion.value === 'number'
    ? (metricKey === 'hydrogen_bond_donors' || metricKey === 'hydrogen_bond_acceptors'
      ? criterion.value
      : criterion.value.toFixed(2))
    : criterion.value;
  return (
    <Reveal className="metric-reveal" delay={index * 90}>
      <article className={`metric-card ${pass ? 'passed' : 'failed'}`}>
        <div className="metric-heading"><span className="metric-index">0{index + 1}</span><span className={`status-chip ${pass ? 'good' : 'warn'}`}><i />{pass ? 'Within limit' : 'Over limit'}</span></div>
        <p className="metric-label">{title}</p>
        <div className="metric-value">{value}<span>{unit}</span></div>
        <div className="metric-rule"><span>Ro5 threshold</span><strong>≤ {criterion.limit}{unit}</strong></div>
        <div className="metric-track"><span style={{ width: `${Math.min(Math.max((Number(criterion.value) / criterion.limit) * 100, 4), 100)}%` }} /></div>
      </article>
    </Reveal>
  );
}

function InsightCard({ index, label, value, unit, detail }) {
  return (
    <Reveal className="insight-reveal" delay={index * 75}>
      <article className="insight-card">
        <div className="insight-card-top"><span className="insight-index">0{index + 1}</span><span className="insight-marker" /></div>
        <p className="insight-label">{label}</p>
        <div className="insight-value">{value}<span>{unit}</span></div>
        <p className="insight-detail">{detail}</p>
      </article>
    </Reveal>
  );
}

function Results({ result, svg, moleculeLabel, onExplain }) {
  const props = result.properties;
  const metrics = [
    ['Molecular weight', 'molecular_weight', ' Da'],
    ['Octanol / water partition', 'log_p', ' LogP'],
    ['Hydrogen bond donors', 'hydrogen_bond_donors', ' HBD'],
    ['Hydrogen bond acceptors', 'hydrogen_bond_acceptors', ' HBA'],
  ];
  return (
    <section className="results-section" id="results" aria-live="polite">
      <div className="section-heading result-heading">
        <div><span className="eyebrow">ANALYSIS / COMPLETE</span><h2>Inside the molecule.</h2><p>Calculated by RDKit for <strong>{moleculeLabel || result.smiles}</strong></p></div>
        <button className="explain-trigger" type="button" onClick={onExplain}><Icon name="spark" size={16} /> Want to know why?</button>
      </div>
      <div className="metrics-grid">
        {metrics.map(([title, key, unit], index) => <MetricCard key={key} title={title} metricKey={key} unit={unit} criteria={result.criteria} index={index} />)}
      </div>
      <section className="insights-section" aria-labelledby="molecular-insights-title">
        <div className="insights-heading">
          <div><span className="eyebrow">STRUCTURAL PROFILE / 05 DESCRIPTORS</span><h3 id="molecular-insights-title">Molecular Insights</h3></div>
          <p>Additional structure descriptors calculated directly from the submitted molecule.</p>
        </div>
        <div className="insights-grid">
          <InsightCard index={0} label="Molecular formula" value={props.molecular_formula} unit="" detail="Elemental composition of this molecule" />
          <InsightCard index={1} label="Polar surface area" value={props.tpsa.toFixed(2)} unit=" Å²" detail="Topological polar surface area (TPSA)" />
          <InsightCard index={2} label="Rotatable bonds" value={props.rotatable_bonds} unit=" bonds" detail="A simple measure of molecular flexibility" />
          <InsightCard index={3} label="Aromatic rings" value={props.aromatic_rings} unit=" rings" detail="Aromatic ring count from RDKit" />
          <InsightCard index={4} label="FractionCSP3" value={props.fraction_csp3.toFixed(3)} unit=" fraction" detail="Fraction of carbon atoms that are sp³-hybridized" />
        </div>
      </section>
      <div className="results-lower">
        <Reveal className="verdict-reveal">
          <article className={`verdict-card ${result.result === 'PASS' ? 'verdict-pass' : 'verdict-fail'}`}>
            <div className="verdict-top"><span className="eyebrow">LIPINSKI SCREEN / SUMMARY</span><Icon name={result.result === 'PASS' ? 'check' : 'spark'} size={19} /></div>
            <div className="verdict-word">{result.result}<span> {result.result === 'PASS' ? '●' : '!'}</span></div>
            <p className="verdict-interpretation">{result.interpretation}</p>
            <div className="violation-total"><span>Rule violations</span><strong>{result.violation_count}<small> / 4</small></strong></div>
            <p className="science-note">A Lipinski screen is an early property filter—not a measure of safety, effectiveness, or clinical suitability.</p>
          </article>
        </Reveal>
        <Reveal className="diagram-reveal" delay={120}>
          <article className="diagram-card">
            <div className="diagram-title"><span className="eyebrow">STRUCTURE / 2D</span><span className="structure-live"><i /> RDKit depiction</span></div>
            <div className="molecule-diagram">
              {svg ? <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt={`2D molecular structure diagram for ${moleculeLabel || result.smiles}`} /> : <div className="diagram-placeholder"><Icon name="atom" size={36} /><span>Structure preview unavailable</span></div>}
            </div>
            <div className="diagram-caption"><span>{moleculeLabel || 'Submitted molecule'}</span><code>{result.smiles}</code></div>
          </article>
        </Reveal>
      </div>
      <div className="sr-only">Molecular weight: {props.molecular_weight}; LogP: {props.log_p}; donors: {props.hydrogen_bond_donors}; acceptors: {props.hydrogen_bond_acceptors}.</div>
    </section>
  );
}

function ExplanationPanel({ result, onClose }) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  if (!result) return null;
  const rows = [
    ['Molecular weight', 'molecular_weight', 'Da', 'Lower molecular weight may support passive absorption; this simple screen uses 500 Da as its threshold.'],
    ['LogP', 'log_p', '', 'LogP estimates preference for an oily versus watery environment. This screen checks that the value is no greater than 5.'],
    ['H-bond donors', 'hydrogen_bond_donors', '', 'Donors are groups that can donate a hydrogen bond. The screening threshold is 5.'],
    ['H-bond acceptors', 'hydrogen_bond_acceptors', '', 'Acceptors are atoms/groups that can accept a hydrogen bond. The screening threshold is 10.'],
  ];
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="explanation-panel" role="dialog" aria-modal="true" aria-labelledby="explanation-title">
        <div className="panel-top"><div><span className="eyebrow">FIELD NOTES / RULE OF FIVE</span><h2 id="explanation-title">Why this result?</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close explanation"><Icon name="close" /></button></div>
        <p className="panel-intro">A deterministic reading of the RDKit values above. No AI-generated claims are being made.</p>
        <div className="explanation-list">{rows.map(([label, key, unit, description]) => {
          const criterion = result.criteria[key];
          return <article key={key}><div><strong>{label}</strong><span className={criterion.passes ? 'explain-pass' : 'explain-fail'}>{criterion.value}{unit ? ` ${unit}` : ''} · limit {criterion.limit} · {criterion.passes ? 'within' : 'over'}</span></div><p>{description}</p></article>;
        })}</div>
        <div className="limitation-box"><strong>What the verdict means</strong><p>This app marks a molecule PASS when there are zero or one threshold violations. The Rule of Five is a rough oral-drug-likeness heuristic. It does not predict whether a compound is safe, effective, absorbed, or suitable for a patient.</p></div>
      </section>
    </div>
  );
}

function App() {
  const [smiles, setSmiles] = useState('');
  const [result, setResult] = useState(null);
  const [svg, setSvg] = useState('');
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [csvRows, setCsvRows] = useState([]);
  const [csvColumns, setCsvColumns] = useState([]);
  const [smilesColumn, setSmilesColumn] = useState('');
  const [csvResults, setCsvResults] = useState([]);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState('');
  const [csvName, setCsvName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState('smiles');
  const fileInput = useRef(null);
  const workspaceRef = useRef(null);
  const resultsRef = useRef(null);
  const busy = loading || csvLoading;

  const columnsHint = useMemo(() => csvRows.slice(0, 12).reduce((score, row) => {
    const value = String(row[smilesColumn] ?? '').trim();
    return score + (value && /[A-Za-z0-9()[\]@=#+\\/.-]/.test(value) ? 1 : 0);
  }, 0), [csvRows, smilesColumn]);

  async function analyzeOne(value = smiles, moleculeLabel = '') {
    const trimmed = value.trim();
    setResult(null); setSvg(''); setError(''); setLabel(moleculeLabel); setLoading(true);
    if (!trimmed) { setLoading(false); setError('Add a SMILES string before starting analysis.'); return; }
    try {
      const response = await fetch(`${API}/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ smiles: trimmed }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || body.error || 'The molecule could not be analyzed.');
      setResult(body);
      setLabel(moleculeLabel);
      const depiction = await fetch(`${API}/depict`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ smiles: trimmed }),
      });
      if (depiction.ok) setSvg((await depiction.json()).svg || '');
      window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (requestError) {
      setError(requestError.message.includes('Failed to fetch') ? 'Could not reach the chemistry backend. Start FastAPI on port 8000 and try again.' : requestError.message);
    } finally { setLoading(false); }
  }

  function selectExample(molecule) {
    setSmiles(molecule.smiles); setLabel(molecule.name); setWorkspaceMode('smiles');
    window.setTimeout(() => { workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 40);
  }

  function loadCsv(file) {
    setCsvError(''); setCsvResults([]); setCsvRows([]); setCsvColumns([]); setSmilesColumn('');
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) { setCsvError('Please choose a file ending in .csv.'); return; }
    Papa.parse(file, {
      header: true, skipEmptyLines: 'greedy', transformHeader: (header) => header.trim(),
      complete: ({ data, meta, errors: parseErrors }) => {
        const columns = meta.fields || [];
        if (!columns.length) { setCsvError('The CSV needs a header row with a column name.'); return; }
        if (!data.length) { setCsvError('No data rows were found in this CSV.'); return; }
        if (data.length > 500) { setCsvError('For this first batch workflow, please upload 500 rows or fewer.'); return; }
        const guessed = columns.find((column) => /smiles/i.test(column)) || columns[0];
        setCsvName(file.name); setCsvColumns(columns); setCsvRows(data); setSmilesColumn(guessed);
        if (parseErrors.length) setCsvError(`${parseErrors.length} CSV formatting issue(s) were found; review the preview before analysis.`);
      },
      error: () => setCsvError('This CSV could not be read. Try saving it as UTF-8 CSV and upload again.'),
    });
  }

  async function analyzeCsv() {
    if (!csvRows.length || !smilesColumn) { setCsvError('Upload a CSV and select its SMILES column first.'); return; }
    const molecules = csvRows.map((row, index) => ({ row: index + 2, smiles: String(row[smilesColumn] ?? '').trim() }));
    setCsvLoading(true); setCsvError(''); setCsvResults([]);
    try {
      const response = await fetch(`${API}/analyze/batch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ molecules }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || 'The batch could not be analyzed.');
      setCsvResults(body.results || []);
    } catch (requestError) {
      setCsvError(requestError.message.includes('Failed to fetch') ? 'Could not reach the chemistry backend. Start FastAPI on port 8000 and try again.' : requestError.message);
    } finally { setCsvLoading(false); }
  }

  function downloadBatchResults() {
    if (!csvResults.length) return;
    const blob = new Blob([buildResultsCsv(csvResults)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = resultsCsvFilename();
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const csvSummary = csvResults.reduce((summary, row) => {
    if (row.error) summary.invalid += 1;
    else if (row.result === 'PASS') summary.pass += 1;
    else summary.fail += 1;
    return summary;
  }, { pass: 0, fail: 0, invalid: 0 });

  return (
    <div className="app-shell">
      <Suspense fallback={<div className="sphere-layer" aria-hidden="true"><div className="sphere-fallback" /></div>}>
        <ParticleSphere active={busy} />
      </Suspense>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="MolecuLens AI home"><span className="brand-mark"><Icon name="atom" size={21} /></span><span>MolecuLens <i>AI</i></span></a>
        <nav className="main-nav" aria-label="Main navigation"><a href="#examples">Explore</a><a href="#method">Method</a><button type="button" onClick={() => { setWorkspaceMode('smiles'); workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>SMILES / CSV <span className="nav-dot" /></button></nav>
        <a className="header-cta" href="#workspace">Open lab <Icon name="arrow" size={15} /></a>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <div className="system-status"><span className="status-pulse" /> MOLECULAR INTELLIGENCE / 01</div>
            <h1>See what<br />a molecule <em>means.</em></h1>
            <p className="hero-description">A closer look at molecular properties. Explore structure, measure the familiar, and make chemistry a little more visible.</p>
            <div className="hero-actions"><a className="button-primary" href="#workspace">Start an analysis <Icon name="arrow" size={17} /></a><a className="button-quiet" href="#examples">Explore examples <span>↓</span></a></div>
          </div>
          <div className="hero-annotation annotation-top"><span>FIELD / 01</span><strong>Structure</strong></div>
          <div className="hero-annotation annotation-bottom"><span>LIVE COMPUTATION</span><strong>RDKit <i>●</i> Ready</strong></div>
          <div className="hero-coordinates" aria-hidden="true">37° 46′ 49.7″ N<br />122° 25′ 09.1″ W</div>
          <div className="hero-scroll"><span /> Scroll to explore</div>
        </section>

        <section className="examples-section content-width" id="examples">
          <div className="section-heading"><div><span className="eyebrow">A FEW KNOWN QUANTITIES / 01—03</span><h2>Example molecules</h2></div><p>Choose a reference molecule to load its SMILES into the analysis workspace.</p></div>
          <div className="example-grid">{EXAMPLES.map((molecule, index) => <Reveal key={molecule.name} delay={index * 100}><ExampleCard molecule={molecule} onSelect={selectExample} /></Reveal>)}</div>
        </section>

        <section className="workspace-section content-width" id="workspace" ref={workspaceRef}>
          <div className="workspace-heading"><div><span className="eyebrow">INPUT STATION / 02</span><h2>Bring a molecule in.</h2><p>Start with one SMILES string or inspect a small CSV batch.</p></div><div className="workspace-state"><span className="status-pulse" /> LOCAL ANALYSIS</div></div>
          <div className="workspace-panel">
            <div className="workspace-tabs" role="tablist" aria-label="Input type">
              <button type="button" role="tab" aria-selected={workspaceMode === 'smiles'} className={workspaceMode === 'smiles' ? 'active' : ''} onClick={() => setWorkspaceMode('smiles')}><Icon name="atom" size={16} /> Single SMILES</button>
              <button type="button" role="tab" aria-selected={workspaceMode === 'csv'} className={workspaceMode === 'csv' ? 'active' : ''} onClick={() => setWorkspaceMode('csv')}><Icon name="upload" size={16} /> CSV batch</button>
              <span className="workspace-tab-note">{workspaceMode === 'smiles' ? 'ONE STRUCTURE AT A TIME' : 'UP TO 500 ROWS'}</span>
            </div>
            {workspaceMode === 'smiles' ? (
              <div className="smiles-workspace">
                <label className="field-label" htmlFor="smiles-input">SMILES NOTATION <span>Required</span></label>
                <textarea id="smiles-input" value={smiles} onChange={(event) => { setSmiles(event.target.value); setLabel(''); }} placeholder="Paste a SMILES string, for example: CC(=O)Nc1ccc(O)cc1" rows={3} spellCheck="false" autoCapitalize="off" autoCorrect="off" />
                <div className="input-meta"><span><i className={smiles.trim() ? 'meta-dot entered' : 'meta-dot'} />{smiles.trim() ? `${smiles.trim().length} characters` : 'Awaiting molecular notation'}</span><button type="button" onClick={() => { setSmiles('CC(=O)Nc1ccc(O)cc1'); setLabel('Paracetamol'); setError(''); }}>Load sample SMILES</button></div>
                {error && <p className="form-error" role="alert">{error}</p>}
                <div className="analyze-row"><p>Analysis runs locally through your RDKit chemistry backend.</p><button className="button-primary analyze-button" type="button" onClick={() => analyzeOne()} disabled={loading}>{loading ? <><span className="button-spinner" /> Analyzing…</> : <>Analyze molecule <Icon name="arrow" size={17} /></>}</button></div>
              </div>
            ) : (
              <div className="csv-workspace">
                <input ref={fileInput} className="sr-only" type="file" accept=".csv,text/csv" aria-label="Choose a CSV file" onChange={(event) => { const file = event.target.files?.[0]; loadCsv(file); event.target.value = ''; }} />
                <div className={`drop-zone ${dragging ? 'dragging' : ''} ${csvRows.length ? 'has-file' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); loadCsv(event.dataTransfer.files?.[0]); }}>
                  <div className="drop-icon"><Icon name={csvRows.length ? 'check' : 'upload'} size={21} /></div>
                  <div><strong>{csvName || 'Drop a CSV file here'}</strong><span>{csvRows.length ? `${csvRows.length} data rows · ${csvColumns.length} columns` : 'or choose a file from your device · max 500 rows'}</span></div>
                  <button type="button" className="button-secondary" onClick={() => fileInput.current?.click()}>Browse files</button>
                </div>
                {csvColumns.length > 0 && <div className="csv-details">
                  <div className="column-select"><label htmlFor="smiles-column">SMILES COLUMN</label><select id="smiles-column" value={smilesColumn} onChange={(event) => setSmilesColumn(event.target.value)}>{csvColumns.map((column) => <option key={column} value={column}>{column}</option>)}</select><span className="column-hint">{columnsHint} recognizable entries in preview</span></div>
                  <div className="csv-preview-wrap"><div className="preview-heading"><span>DATA PREVIEW</span><span>FIRST {Math.min(csvRows.length, 6)} ROWS</span></div><div className="table-scroll"><table className="csv-preview"><thead><tr><th>ROW</th>{csvColumns.slice(0, 5).map((column) => <th key={column}>{column}</th>)}{csvColumns.length > 5 && <th>…</th>}</tr></thead><tbody>{csvRows.slice(0, 6).map((row, index) => { const value = String(row[smilesColumn] ?? '').trim(); return <tr key={index} className={!value ? 'row-invalid' : ''}><td>{index + 2}</td>{csvColumns.slice(0, 5).map((column) => <td key={column} title={String(row[column] ?? '')}>{row[column] || <span className="missing-cell">{column === smilesColumn ? 'missing SMILES' : '—'}</span>}</td>)}{csvColumns.length > 5 && <td>…</td>}</tr>; })}</tbody></table></div></div>
                  <div className="csv-submit-row"><p>Missing and invalid SMILES are returned as row-level errors.</p><button className="button-primary analyze-button" type="button" onClick={analyzeCsv} disabled={csvLoading}>{csvLoading ? <><span className="button-spinner" /> Analyzing batch…</> : <>Analyze {csvRows.length} rows <Icon name="arrow" size={17} /></>}</button></div>
                </div>}
                {csvError && <p className="form-error" role="alert">{csvError}</p>}
                <div className="batch-export-bar" aria-live="polite">
                  <span className="batch-export-note">{csvResults.length ? `${csvResults.length} batch row${csvResults.length === 1 ? '' : 's'} ready to export, including invalid rows.` : 'No batch results to export yet. Upload a CSV and analyze its rows first.'}</span>
                  <button className="batch-export-button" type="button" onClick={downloadBatchResults} disabled={!csvResults.length}><Icon name="download" size={16} /> Download Results CSV</button>
                </div>
                {csvResults.length > 0 && <div className="csv-results" aria-live="polite"><div className="batch-summary"><span>{csvName} · {csvResults.length} rows</span><div><b className="summary-pass">{csvSummary.pass} pass</b><b className="summary-fail">{csvSummary.fail} fail</b><b className="summary-invalid">{csvSummary.invalid} invalid</b></div></div><div className="batch-list">{csvResults.map((item) => <article key={`${item.row}-${item.smiles}`} className="batch-row"><span className="batch-row-number">ROW {item.row}</span><code>{item.smiles || 'Empty SMILES'}</code>{item.error ? <span className="batch-status invalid">Invalid · {item.error}</span> : <><span className={`batch-status ${item.result === 'PASS' ? 'pass' : 'fail'}`}>{item.result}</span><span className="batch-violations">{item.violation_count} violation{item.violation_count === 1 ? '' : 's'}</span></>}</article>)}</div></div>}
              </div>
            )}
          </div>
        </section>

        <div ref={resultsRef}>{result && <Results result={result} svg={svg} moleculeLabel={label} onExplain={() => setExplanationOpen(true)} />}</div>

        <section className="method-section content-width" id="method"><div className="method-orbit"><Icon name="atom" size={34} /><span /><span /></div><div><span className="eyebrow">A NOTE ON THE MODEL / 03</span><h2>A useful filter.<br /><em>Not the whole story.</em></h2><p>The Lipinski Rule of Five is a heuristic built from four molecular properties. It can help describe patterns in drug-like compounds, but it cannot determine whether a molecule is a medicine—or whether it is right for any person.</p><a className="text-action" href="#workspace">Explore a molecule <Icon name="arrow" size={16} /></a></div><div className="method-side-note"><span>01 / PROPERTY ESTIMATES</span><span>02 / THRESHOLD CHECK</span><span>03 / HUMAN INTERPRETATION</span></div></section>
      </main>

      <footer className="site-footer"><a className="brand" href="#top"><span className="brand-mark"><Icon name="atom" size={18} /></span><span>MolecuLens <i>AI</i></span></a><span>Curiosity, measured.</span><span>BUILT FOR MOLECULAR EXPLORATION <i>·</i> 2026</span></footer>
      {explanationOpen && <ExplanationPanel result={result} onClose={() => setExplanationOpen(false)} />}
    </div>
  );
}

export default App;
