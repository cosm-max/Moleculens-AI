"""Focused tests for the SMILES analysis and RDKit descriptors."""

import unittest
from unittest.mock import patch

from rdkit import Chem
from rdkit.Chem import Descriptors, Lipinski, rdMolDescriptors

from backend.chemistry import analyze_smiles
from backend.main import BatchMolecule, BatchRequest, analyze_batch


class AnalyzeSmilesTests(unittest.TestCase):
    """Check descriptor values and safe handling of invalid SMILES input."""

    paracetamol_smiles = "CC(=O)Nc1ccc(O)cc1"

    def test_new_molecular_insights_match_rdkit(self):
        molecule = Chem.MolFromSmiles(self.paracetamol_smiles)
        result = analyze_smiles(self.paracetamol_smiles)
        properties = result["properties"]

        self.assertEqual(properties["molecular_formula"], rdMolDescriptors.CalcMolFormula(molecule))
        self.assertAlmostEqual(properties["tpsa"], rdMolDescriptors.CalcTPSA(molecule))
        self.assertEqual(
            properties["rotatable_bonds"],
            rdMolDescriptors.CalcNumRotatableBonds(molecule),
        )
        self.assertEqual(
            properties["aromatic_rings"],
            Lipinski.NumAromaticRings(molecule),
        )
        self.assertAlmostEqual(
            properties["fraction_csp3"],
            Descriptors.FractionCSP3(molecule),
        )

    def test_existing_lipinski_response_is_preserved(self):
        result = analyze_smiles(self.paracetamol_smiles)

        self.assertEqual(result["result"], "PASS")
        self.assertEqual(result["violation_count"], 0)
        self.assertEqual(
            set(result["criteria"]),
            {
                "molecular_weight",
                "log_p",
                "hydrogen_bond_donors",
                "hydrogen_bond_acceptors",
            },
        )
        self.assertEqual(result["properties"]["molecular_formula"], "C8H9NO2")

    def test_empty_smiles_returns_existing_error_shape(self):
        result = analyze_smiles("   ")

        self.assertEqual(result["error"], "SMILES input cannot be empty.")
        self.assertNotIn("properties", result)

    def test_invalid_smiles_returns_existing_error_shape(self):
        result = analyze_smiles("not_a_valid_smiles")

        self.assertEqual(result["error"], "Invalid SMILES string.")
        self.assertNotIn("properties", result)

    def test_lipinski_limits_are_inclusive_and_verdict_counts_violations(self):
        def analyze_with_values(molecular_weight, log_p):
            # Hold the descriptor values at known limits to test only the
            # threshold comparisons and PASS/FAIL policy.
            with (
                patch("backend.chemistry.Descriptors.MolWt", return_value=molecular_weight),
                patch("backend.chemistry.Descriptors.MolLogP", return_value=log_p),
                patch("backend.chemistry.Lipinski.NumHDonors", return_value=5),
                patch("backend.chemistry.Lipinski.NumHAcceptors", return_value=10),
                patch("backend.chemistry.rdMolDescriptors.CalcMolFormula", return_value="C2H6"),
                patch("backend.chemistry.rdMolDescriptors.CalcTPSA", return_value=0.0),
                patch("backend.chemistry.rdMolDescriptors.CalcNumRotatableBonds", return_value=0),
                patch("backend.chemistry.Lipinski.NumAromaticRings", return_value=0),
            ):
                return analyze_smiles("CC")

        at_limits = analyze_with_values(500, 5)
        self.assertEqual(at_limits["violation_count"], 0)
        self.assertEqual(at_limits["result"], "PASS")

        one_violation = analyze_with_values(500.01, 5)
        self.assertEqual(one_violation["violation_count"], 1)
        self.assertEqual(one_violation["result"], "PASS")

        two_violations = analyze_with_values(500.01, 5.01)
        self.assertEqual(two_violations["violation_count"], 2)
        self.assertEqual(two_violations["result"], "FAIL")

    def test_batch_endpoint_preserves_rows_and_invalid_smiles_errors(self):
        response = analyze_batch(BatchRequest(molecules=[
            BatchMolecule(row=2, smiles=self.paracetamol_smiles),
            BatchMolecule(row=3, smiles=""),
            BatchMolecule(row=4, smiles="not_a_valid_smiles"),
        ]))

        self.assertEqual(response["count"], 3)
        self.assertEqual([item["row"] for item in response["results"]], [2, 3, 4])
        self.assertEqual(response["results"][0]["result"], "PASS")
        self.assertEqual(
            [item.get("error") for item in response["results"][1:]],
            ["SMILES input cannot be empty.", "Invalid SMILES string."],
        )


if __name__ == "__main__":
    unittest.main()
