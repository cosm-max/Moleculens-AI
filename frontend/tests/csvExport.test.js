import test from 'node:test';
import assert from 'node:assert/strict';
import Papa from 'papaparse';

import { buildResultsCsv, resultsCsvFilename } from '../src/csvExport.js';

const validResult = {
  row: 2,
  smiles: 'CC(=O)Nc1ccc(O)cc1',
  properties: {
    molecular_formula: 'C8H9NO2',
    molecular_weight: 151.165,
    log_p: 1.3506,
    hydrogen_bond_donors: 2,
    hydrogen_bond_acceptors: 2,
    tpsa: 49.33,
    rotatable_bonds: 1,
    aromatic_rings: 1,
    fraction_csp3: 0.125,
  },
  criteria: {
    molecular_weight: { passes: true },
    log_p: { passes: true },
    hydrogen_bond_donors: { passes: true },
    hydrogen_bond_acceptors: { passes: true },
  },
  violation_count: 0,
  result: 'PASS',
  interpretation: 'The molecule passes all Lipinski Rule of Five criteria.',
};

test('CSV export retains batch properties, verdict, and invalid rows', () => {
  const invalidError = 'Needs, quoting: "carefully"\nand a second line';
  const csv = buildResultsCsv([
    validResult,
    { row: 3, smiles: '', error: 'SMILES input cannot be empty.' },
    { row: 4, smiles: 'bad', error: invalidError },
  ]);
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });

  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.data.length, 3);
  assert.equal(parsed.data[0].SMILES, validResult.smiles);
  assert.equal(parsed.data[0]['Molecular Formula'], 'C8H9NO2');
  assert.equal(parsed.data[0]['Molecular Weight (Da)'], '151.16');
  assert.equal(parsed.data[0]['TPSA (Å²)'], '49.33');
  assert.equal(parsed.data[0].FractionCSP3, '0.125');
  assert.equal(parsed.data[0].Status, 'PASS');
  assert.equal(parsed.data[0]['Molecular Weight Criterion (≤ 500 Da)'], 'PASS');
  assert.equal(parsed.data[0]['Violation Count'], '0');
  assert.equal(parsed.data[1].Status, 'INVALID');
  assert.equal(parsed.data[1].SMILES, '');
  assert.equal(parsed.data[1].Error, 'SMILES input cannot be empty.');
  assert.equal(parsed.data[2].Error, invalidError);
  assert.equal(parsed.data[2]['Molecular Formula'], '');
});

test('CSV export filename uses the local calendar date', () => {
  assert.equal(
    resultsCsvFilename(new Date(2026, 10, 26)),
    'MolecuLens_Analysis_2026-11-26.csv',
  );
});
