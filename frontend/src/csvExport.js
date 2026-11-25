const COLUMNS = [
  ['row', 'Row'], ['smiles', 'SMILES'], ['status', 'Status'], ['error', 'Error'],
  ['molecular_formula', 'Molecular Formula'], ['molecular_weight', 'Molecular Weight (Da)'],
  ['log_p', 'LogP'], ['hydrogen_bond_donors', 'Hydrogen Bond Donors'],
  ['hydrogen_bond_acceptors', 'Hydrogen Bond Acceptors'], ['tpsa', 'TPSA (Å²)'],
  ['rotatable_bonds', 'Rotatable Bonds'], ['aromatic_rings', 'Aromatic Rings'],
  ['fraction_csp3', 'FractionCSP3'], ['violation_count', 'Violation Count'],
  ['molecular_weight_pass', 'Molecular Weight Criterion (≤ 500 Da)'],
  ['log_p_pass', 'LogP Criterion (≤ 5)'],
  ['hydrogen_bond_donors_pass', 'H-Bond Donors Criterion (≤ 5)'],
  ['hydrogen_bond_acceptors_pass', 'H-Bond Acceptors Criterion (≤ 10)'],
  ['interpretation', 'Interpretation'],
];

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function readableNumber(value, decimals) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(decimals) : '';
}

function criterionStatus(criteria, key) {
  const criterion = criteria?.[key];
  return criterion ? (criterion.passes ? 'PASS' : 'FAIL') : '';
}

function exportRow(item) {
  const properties = item.properties || {};
  const criteria = item.criteria || {};
  const values = {
    row: item.row, smiles: item.smiles, status: item.error ? 'INVALID' : item.result,
    error: item.error || '', molecular_formula: properties.molecular_formula,
    molecular_weight: readableNumber(properties.molecular_weight, 2),
    log_p: readableNumber(properties.log_p, 2),
    hydrogen_bond_donors: properties.hydrogen_bond_donors,
    hydrogen_bond_acceptors: properties.hydrogen_bond_acceptors,
    tpsa: readableNumber(properties.tpsa, 2), rotatable_bonds: properties.rotatable_bonds,
    aromatic_rings: properties.aromatic_rings,
    fraction_csp3: readableNumber(properties.fraction_csp3, 3),
    violation_count: item.violation_count,
    molecular_weight_pass: criterionStatus(criteria, 'molecular_weight'),
    log_p_pass: criterionStatus(criteria, 'log_p'),
    hydrogen_bond_donors_pass: criterionStatus(criteria, 'hydrogen_bond_donors'),
    hydrogen_bond_acceptors_pass: criterionStatus(criteria, 'hydrogen_bond_acceptors'),
    interpretation: item.interpretation,
  };
  return COLUMNS.map(([key]) => csvCell(values[key]));
}

export function buildResultsCsv(results) {
  const header = COLUMNS.map(([, label]) => csvCell(label)).join(',');
  return `\uFEFF${[header, ...results.map((item) => exportRow(item).join(','))].join('\r\n')}\r\n`;
}

export function resultsCsvFilename(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `MolecuLens_Analysis_${year}-${month}-${day}.csv`;
}
