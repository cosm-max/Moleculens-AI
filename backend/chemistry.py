"""Basic cheminformatics analysis for MolecuLens AI."""

from rdkit import Chem
from rdkit.Chem import Descriptors, Lipinski, rdMolDescriptors


def analyze_smiles(smiles: str):
    """Analyze a SMILES string using common drug-likeness properties.

    The function checks the conventional Lipinski Rule of Five and returns
    the calculated properties together with a simple PASS/FAIL result.
    """

    # Check for missing input before asking RDKit to parse the SMILES string.
    if not smiles or not smiles.strip():
        return {
            "smiles": smiles,
            "error": "SMILES input cannot be empty.",
        }

    # RDKit returns None when the SMILES string cannot be parsed.
    molecule = Chem.MolFromSmiles(smiles)
    if molecule is None:
        return {
            "smiles": smiles,
            "error": "Invalid SMILES string.",
        }

    # Calculate the four properties used by the Lipinski Rule of Five.
    molecular_weight = Descriptors.MolWt(molecule)
    log_p = Descriptors.MolLogP(molecule)
    hydrogen_bond_donors = Lipinski.NumHDonors(molecule)
    hydrogen_bond_acceptors = Lipinski.NumHAcceptors(molecule)

    # Calculate additional RDKit descriptors for the Molecular Insights section.
    molecular_formula = rdMolDescriptors.CalcMolFormula(molecule)
    tpsa = rdMolDescriptors.CalcTPSA(molecule)
    rotatable_bonds = rdMolDescriptors.CalcNumRotatableBonds(molecule)
    aromatic_rings = Lipinski.NumAromaticRings(molecule)
    fraction_csp3 = Descriptors.FractionCSP3(molecule)

    # Each criterion is True when the molecule stays within the conventional
    # Lipinski limit. A failed criterion counts as one violation.
    criteria = {
        "molecular_weight": {
            "value": molecular_weight,
            "limit": 500,
            "passes": molecular_weight <= 500,
        },
        "log_p": {
            "value": log_p,
            "limit": 5,
            "passes": log_p <= 5,
        },
        "hydrogen_bond_donors": {
            "value": hydrogen_bond_donors,
            "limit": 5,
            "passes": hydrogen_bond_donors <= 5,
        },
        "hydrogen_bond_acceptors": {
            "value": hydrogen_bond_acceptors,
            "limit": 10,
            "passes": hydrogen_bond_acceptors <= 10,
        },
    }

    violation_count = sum(
        not criterion["passes"] for criterion in criteria.values()
    )
    result = "PASS" if violation_count <= 1 else "FAIL"

    if violation_count == 0:
        interpretation = "The molecule passes all Lipinski Rule of Five criteria."
    elif violation_count == 1:
        interpretation = (
            "The molecule has one Lipinski Rule of Five violation and passes "
            "the conventional screening rule."
        )
    else:
        interpretation = (
            f"The molecule has {violation_count} Lipinski Rule of Five violations "
            "and fails the conventional screening rule."
        )

    return {
        "smiles": smiles,
        "properties": {
            "molecular_weight": molecular_weight,
            "log_p": log_p,
            "hydrogen_bond_donors": hydrogen_bond_donors,
            "hydrogen_bond_acceptors": hydrogen_bond_acceptors,
            "molecular_formula": molecular_formula,
            "tpsa": tpsa,
            "rotatable_bonds": rotatable_bonds,
            "aromatic_rings": aromatic_rings,
            "fraction_csp3": fraction_csp3,
        },
        "criteria": criteria,
        "violation_count": violation_count,
        "result": result,
        "interpretation": interpretation,
    }
