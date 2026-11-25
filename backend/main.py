"""FastAPI endpoints for the MolecuLens AI chemistry backend."""

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from rdkit import Chem
from rdkit.Chem.Draw import rdMolDraw2D

from backend.chemistry import analyze_smiles


app = FastAPI(title="MolecuLens AI Chemistry API")

# Allow only the local Vite development server to call this API from a browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class SMILESRequest(BaseModel):
    """Request body containing the SMILES string to analyze."""

    smiles: str


class BatchMolecule(BaseModel):
    """One CSV row submitted for batch analysis."""

    row: int = Field(ge=1)
    smiles: str


class BatchRequest(BaseModel):
    """A bounded list of molecules selected from a CSV file."""

    molecules: list[BatchMolecule] = Field(min_length=1, max_length=500)


@app.get("/")
def health_check():
    """Return a simple message confirming that the backend is running."""

    return {"message": "MolecuLens AI chemistry backend is running."}


@app.post("/analyze")
def analyze_molecule(request: SMILESRequest):
    """Analyze a SMILES string and return the chemistry results as JSON."""

    # Treat an empty or whitespace-only SMILES as a client-side input error.
    if not request.smiles.strip():
        return JSONResponse(
            status_code=400,
            content={
                "smiles": request.smiles,
                "error": "SMILES input cannot be empty.",
            },
        )

    # Reuse the tested chemistry function instead of duplicating its logic.
    result = analyze_smiles(request.smiles)

    # The chemistry function reports invalid SMILES in an error dictionary.
    # Convert that into a clear HTTP 400 response without stopping the server.
    if "error" in result:
        return JSONResponse(status_code=400, content=result)

    return result


@app.post("/analyze/batch")
def analyze_batch(request: BatchRequest):
    """Analyze CSV rows individually and preserve row numbers and errors."""

    results = []
    for molecule in request.molecules:
        # Each row uses the same tested chemistry function as /analyze.
        result = analyze_smiles(molecule.smiles)
        results.append({"row": molecule.row, **result})

    return {"results": results, "count": len(results)}


@app.post("/depict")
def depict_molecule(request: SMILESRequest):
    """Return an RDKit-generated SVG structure diagram for valid SMILES."""

    if not request.smiles.strip():
        raise HTTPException(status_code=400, detail="SMILES input cannot be empty.")

    molecule = Chem.MolFromSmiles(request.smiles)
    if molecule is None:
        raise HTTPException(status_code=400, detail="Invalid SMILES string.")

    # Generate a true 2D structure diagram from the submitted molecular graph.
    drawer = rdMolDraw2D.MolDraw2DSVG(520, 340)
    drawer.DrawMolecule(molecule)
    drawer.FinishDrawing()
    return {"svg": drawer.GetDrawingText()}
