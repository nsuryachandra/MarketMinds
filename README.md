# MarketMinds

MarketMinds is a full-stack market-intelligence application for evaluating business locations across 16 Hyderabad localities and 13 approved business categories. It combines mapped OpenStreetMap businesses, GHMC licence aggregates, transport access, UDISE schools, Google Trends relative interest, and user-entered financial assumptions.

The application is data-honest by design: it does not invent ratings, sales, footfall, revenue, closure status, population, or verified rent. Deterministic analysis remains available without AI.

## Stack

- React 19, React Router 7, Vite 8
- Tailwind CSS 3.4, Recharts, Framer Motion, Lucide
- FastAPI, Pydantic, SQLite
- Server-side NVIDIA chat completions for the optional assistant

## Quick start

Backend, from `backend/`:

```powershell
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Frontend, from the project root:

```powershell
npm run dev
```

Open `http://127.0.0.1:5173`. The API and Swagger UI are at `http://127.0.0.1:8000/api/v1` and `http://127.0.0.1:8000/docs`.

First-time setup:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

```powershell
npm install
```

The first backend startup creates `backend/marketminds.db` and imports the supplied datasets.

## Configuration

Frontend `.env.local`:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Backend `backend/.env`:

```text
NVIDIA_API_KEY=your-key-here
NVIDIA_MODEL=minimaxai/minimax-m3.1-flash
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
```

The NVIDIA key is optional for deterministic analysis and must never be placed in the frontend. The assistant is disabled when no key is configured.

## Routes

| Route | View |
|---|---|
| `/` | Landing and deterministic search |
| `/dashboard` | City and locality overview |
| `/market-explorer` | Locality ledger, map, category supply, and shortlist |
| `/competitor-intelligence` | Nearby mapped competitors and category-mix HHI |
| `/market-trends` | GHMC licence activity and Google Trends |
| `/risk-analysis` | Directional category risk estimate |
| `/location-comparison` | Compare 2-4 localities |
| `/financial-feasibility` | Revenue and customer-based scenarios |
| `/market-assistant` | Grounded NVIDIA chat with current analysis context |

## Search

Search is deterministic and works without an AI model. It supports category names and aliases, the 16 supported localities, exact mapped business names, multiple outlets, and clarification when a locality or category is ambiguous.

Examples:

- `Cafes in Banjara Hills`
- `Juice Shop in Ameerpet` maps to `cafes`
- `Blue Moon Irani Chai Cafe` opens the mapped business
- `supermarket in Gachibowli` maps to `grocery`

Missing localities are never silently assumed. The app asks the user to choose.

## Data and limitations

- Business counts are mapped OpenStreetMap POIs, not a verified register.
- Catchments are circular and overlapping; they must not be summed as unique city totals.
- GHMC values are licence applications, not proof of openings or current growth.
- Census 2011 is not assigned to modern localities.
- Google Trends is relative interest, not demand volume.
- Schools lack coordinates and are used as ward-level access context, not map markers.
- Rent is user input only.
- Financial and risk outputs are directional scenarios, not guarantees.
- AI output can be wrong and does not replace the deterministic metrics.

See `backend/README.md` for the complete API, ETL, analysis, and assistant documentation.

## Checks

```powershell
npm run build
npm run lint
```

For the full backend setup and endpoint reference, see [backend/README.md](backend/README.md).
