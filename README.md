# MolecuLens AI

MolecuLens AI is a local molecular-property exploration application. It accepts SMILES notation, calculates RDKit descriptors, checks the Lipinski Rule of Five, and can analyze a small CSV batch. The project is intended for learning and exploratory use—not for medical or clinical decisions.

## Features

- Single-molecule analysis from a SMILES string.
- RDKit molecular weight, LogP, hydrogen-bond donors and acceptors.
- Lipinski Rule of Five criterion results, violation count, and PASS/FAIL screen.
- Molecular formula, TPSA, rotatable bonds, aromatic ring count, and FractionCSP3.
- RDKit-generated 2D molecular structure depiction.
- CSV upload and batch analysis for up to 500 parsed rows, with row-level errors.
- Browser-generated results CSV with descriptor, criterion, verdict, and error columns.
- A deterministic “Want to know why?” explanation based on the calculated Rule of Five values.
- Animated React interface with a reduced-motion-friendly particle scene.

## Technology

- Python, FastAPI, Pydantic, and RDKit for the API and chemistry calculations.
- React and Vite for the web interface.
- PapaParse for CSV input and CSV output verification.
- Three.js for the animated particle sphere.

## Project layout

```text
backend/
  chemistry.py            RDKit descriptor calculations and Lipinski screening
  main.py                 FastAPI routes, validation, batch analysis, and depiction
  tests/                  Python unittest coverage
frontend/
  src/App.jsx             Main React experience and API workflows
  src/csvExport.js        Browser-side batch results CSV formatter
  src/components/         UI components, including the particle sphere
  tests/                  Frontend CSV export tests
  package.json            Frontend scripts and dependencies
requirements.txt          Python backend dependencies
```

## Setup

Use Python 3.14 or another Python version for which RDKit has a compatible package, plus Node.js 18 or newer.

From the project root, create an environment and install the backend dependencies:

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Install the frontend dependencies:

```powershell
cd frontend
npm install
cd ..
```

## Start the application

In one terminal at the project root, start FastAPI:

```powershell
.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

In another terminal:

```powershell
cd frontend
npm run dev
```

Open the local Vite address shown in the terminal (normally `http://localhost:5173`). The API allows browser requests from `localhost:5173` and `127.0.0.1:5173` only.

## API

The default API base URL used by the frontend is `http://127.0.0.1:8000`.

| Method and path | Purpose |
| --- | --- |
| `GET /` | Backend health message. |
| `POST /analyze` | Analyze one molecule. Invalid or empty SMILES returns HTTP 400; a missing or incorrectly typed request field is rejected by FastAPI validation. |
| `POST /analyze/batch` | Analyze 1–500 submitted rows. Each result keeps its row number; invalid or empty SMILES are returned as row-level errors so other rows can still be processed. |
| `POST /depict` | Return an RDKit-generated SVG for a valid SMILES; invalid or empty input returns HTTP 400. |

Single-molecule request example:

```json
{
  "smiles": "CC(=O)Nc1ccc(O)cc1"
}
```

The sample is paracetamol. The response contains `properties`, `criteria`, `violation_count`, `result`, and `interpretation`. The four conventional screening limits are molecular weight ≤ 500 Da, LogP ≤ 5, hydrogen-bond donors ≤ 5, and hydrogen-bond acceptors ≤ 10. This application reports PASS for zero or one violations and FAIL for two or more.

Batch requests have this shape:

```json
{
  "molecules": [
    { "row": 2, "smiles": "CC(=O)Nc1ccc(O)cc1" },
    { "row": 3, "smiles": "not_a_valid_smiles" }
  ]
}
```

## CSV batch workflow

1. Open **SMILES / CSV** and choose or drop a `.csv` file with a header row.
2. Select the column containing SMILES strings (the app suggests a column whose name includes “SMILES”).
3. Check the preview, then analyze the batch. The frontend limits input to 500 parsed rows; fully blank lines are skipped by CSV parsing.
4. Review valid results and row-level invalid/missing-SMILES errors.
5. Choose **Download Results CSV**. Export is generated in the browser and includes the original SMILES, row number, error/status, all returned descriptors, all four criterion statuses, violation count, verdict, and interpretation. Invalid input rows remain in the export with blank chemistry values and an error message.

## Tests and production build

Run backend tests from the project root:

```powershell
.venv\Scripts\python.exe -m unittest discover -s backend/tests -v
```

Run frontend tests and create the production build:

```powershell
cd frontend
npm test
npm run build
```

## Scientific limitations and intended use

RDKit calculates the molecular descriptors from the submitted molecular graph. Lipinski Rule of Five is a heuristic screening rule; it does not establish that a compound is safe, effective, absorbed, approved, or suitable for a person. Descriptor values and a PASS result are not medical advice and should not be used to make treatment or health decisions. The explanation panel is deterministic and is not connected to an AI service.
