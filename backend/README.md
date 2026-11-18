# MarketMinds Backend

FastAPI + SQLite backend for the MarketMinds Hyderabad market-intelligence application. It imports the supplied Hyderabad datasets, exposes real-data analysis under `/api/v1`, and powers all nine frontend routes.

The API never substitutes mock records when a dataset is missing. The optional market assistant uses a server-side NVIDIA model, while every deterministic metric and recommendation boundary remains available without AI.

## Requirements

- Python 3.11 or newer
- Node.js and npm for the frontend
- The dataset files under `datasets/raw/`
- Packages in `backend/requirements.txt`

## Quick start

Start the backend from the `backend` directory:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Start the frontend from the project root in a separate terminal:

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

The API is available at:

- `http://127.0.0.1:8000/api/v1`
- Swagger: `http://127.0.0.1:8000/docs`

The first startup creates `backend/marketminds.db` and imports the datasets. The GHMC workbook import can take roughly 15-30 seconds. Later startups skip sources that already have a successful import, but always refresh the 16 locality reference points.

## Environment

Create `backend/.env` from `backend/.env.example` and set the server-side NVIDIA key:

```text
NVIDIA_API_KEY=your-key-here
NVIDIA_MODEL=minimaxai/minimax-m3.1-flash
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
```

The backend reads `NVIDIA_MODEL`. An optional `NVIDIA_API_URL` can replace the full chat-completions URL derived from `NVIDIA_BASE_URL`.

The key stays in the backend process. It is never sent to the browser, returned by an endpoint, or stored in source control. If the key is absent or rejected, deterministic analysis remains fully functional and the assistant reports that it is unavailable.

For the frontend, create `.env.local` in the project root:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

The default API URL in `src/lib/api.js` is the same address. CORS allows `http://localhost:5173` and `http://127.0.0.1:5173`.

## Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/health` | Database, source, table-count, and assistant configuration status |
| GET | `/api/v1/meta/categories` | 13 categories, aliases, mapped counts, and risk weights |
| GET | `/api/v1/meta/localities` | 16 approximate locality reference points |
| GET | `/api/v1/meta/data-sources` | Source attribution, dates, status, and limitations |
| POST | `/api/v1/search/interpret` | Deterministic category, locality, and business search |
| GET | `/api/v1/market/overview` | Citywide category overview |
| GET | `/api/v1/market/locality` | Snapshot metrics for one locality and category |
| GET | `/api/v1/market/localities` | Ranked snapshot metrics for all 16 localities |
| GET | `/api/v1/market/business` | Snapshot centered on a specific mapped business |
| GET | `/api/v1/market/business/competitors` | Nearby competitors around a specific mapped business |
| GET | `/api/v1/market/competitors` | Nearby mapped competitors around a locality |
| GET | `/api/v1/market/trends` | GHMC 2022-2023 applications and Google Trends |
| GET | `/api/v1/market/location-comparison` | Compare 2-4 localities |
| POST | `/api/v1/market/risk` | Category-specific directional risk estimate |
| POST | `/api/v1/market/business/risk` | Directional risk estimate around a mapped business |
| POST | `/api/v1/financial/estimate` | Method A/B financial scenarios |
| POST | `/api/v1/assistant/chat` | Grounded NVIDIA chat using the frontend analysis context |

Common query parameters:

- `category`: one of the 13 category IDs; default `cafes`
- `locality`: a locality ID such as `banjara-hills`
- `osm_id`: an OpenStreetMap ID such as `node/6205211485`
- `radius_m`: `500`, `1000`, or `2000`; default `2000`
- `limit`: competitor list limit, 1-200

Locality comparison uses a comma-separated ID list:

```text
GET /api/v1/market/location-comparison?localities=banjara-hills,gachibowli&category=cafes
```

Search request:

```json
{
  "query": "Juice Shop in Ameerpet",
  "locality_id": null
}
```

The search response identifies a supported category analysis, a specific mapped business, a locality clarification, a category/business clarification, or an unsupported result. It includes matched aliases, mapping notes, confidence, and business candidates where applicable. Search never assumes a missing locality.

Risk request example:

```json
{
  "locality": "banjara-hills",
  "category": "cafes",
  "radius_m": 2000,
  "monthly_rent": 100000,
  "staff_expenses": 80000,
  "other_monthly_expenses": 40000,
  "expected_monthly_revenue": 500000
}
```

Business risk uses `osm_id`; `category`, the financial fields, and `radius_m` are optional.

Financial request example:

```json
{
  "method": "revenue",
  "monthly_rent": 100000,
  "staff_expenses": 80000,
  "other_monthly_expenses": 40000,
  "initial_investment": 1500000,
  "expected_monthly_revenue": 500000
}
```

Method B uses `daily_customers`, `average_selling_price`, and `working_days` instead of `expected_monthly_revenue`.

Assistant request:

```json
{
  "messages": [
    { "role": "user", "content": "Compare Banjara Hills and Gachibowli for a cafe." }
  ],
  "context": {
    "snapshot": {},
    "competitors": {},
    "risk": {},
    "localities": [],
    "trends": {}
  }
}
```

The latest message must be a non-empty user message. The backend accepts up to 20 messages, forwards the last 12, and truncates analysis context at 24,000 characters. The provider timeout is 45 seconds.

## Assistant behavior

- Model: `minimaxai/minimax-m3.1-flash` by default.
- Temperature: `0.2`; `top_p`: `0.7`; maximum output: `900` tokens.
- The system prompt treats the supplied analysis context as authoritative data and forbids invented businesses, ratings, rent, footfall, sales, population, or operation status.
- The assistant must distinguish mapped OSM counts from verified facts and must preserve the application's documented limitations.
- Provider failures return structured `ai_unavailable`, `ai_rate_limited`, `ai_timeout`, or `ai_provider_error` responses.

## Data import

To import without starting the API:

```powershell
python -m data.data_loader
```

To re-run every import:

```powershell
python -m data.data_loader --force
```

To rebuild from scratch, stop the API, delete `backend/marketminds.db`, and start it again.

## Imported datasets

| Source ID | Stored as | Expected first-import result |
|---|---|---|
| `osm_business_pois` | `businesses` | 10,193 valid POIs; 5,409 mapped; 5,320 mapped inside GHMC |
| `ghmc_wards` | `wards` | 155 ward polygons |
| `ghmc_trade_licences_2022` | `trade_license_monthly` | 360 circle-month rows; 41,575 applications |
| `ghmc_trade_licences_2023` | `trade_license_monthly` | 360 circle-month rows; 54,737 applications |
| `ghmc_activity` | `ghmc_activity` | 237,279 approval records aggregated to 52 months |
| `census_2011` | `census_records` | 108 historical ward records |
| `udise_schools_2024_25` | `schools` | 3,181 school profile records |
| `bus_stops` | `bus_stops` | 5,028 mapped stops |
| `metro_gtfs` | `metro_stations` | 57 parent stations |
| `google_trends` | `search_trends` | 1,310 weekly values across 5 terms |
| `locality_reference_points` | `localities` | 16 approximate centres |

Cleaned outputs are written to `datasets/processed/`. Raw files are never modified.

## Analysis design

- Catchments are circular around approximate locality centres. Scores use the default 2 km radius unless another allowed radius is requested.
- Catchments overlap. Counts are not additive across localities.
- Business-centered analysis excludes the selected business from nearby-competitor and snapshot supply counts.
- `competition_index` compares the selected-category mapped POI count with the highest locality count at the same radius.
- `activity_index` uses recorded GHMC circle-level licence applications for 2022-2023.
- `access_index` combines mapped bus stops, metro parent stations, and UDISE schools assigned to the locality's mapped ward. School coordinates are unavailable, so schools are not a radius count.
- `data_completeness` combines citywide category support, named-POI share in the catchment, GHMC ward assignment share, and supporting-layer availability.
- `opportunity_index` is a relative supply/activity/access indicator. It is not a profit forecast.
- Location comparison requires 2-4 unique localities and uses the same category and radius for each.
- Risk weights differ by category. Higher risk scores mean more directional pressure, not a predicted failure probability.
- Competitor HHI is a category-mix concentration measure, not revenue or market-share concentration.
- Financial estimates use only user-entered revenue, costs, and investment. Scenario multipliers are explicit planning assumptions, not market forecasts.

## Important limitations

- OpenStreetMap POIs are community-maintained and incomplete. They are not a verified business register.
- No revenue, sales, footfall, rating, review, closure, or verified rent data is available.
- GHMC licence data is aggregated by circle or city; it cannot identify locality-level openings or current growth.
- Census 2011 ward numbering does not align with current GHMC wards, so no locality population is assigned.
- Google Trends is relative search interest, not demand volume, and is mapped only to `restaurants`, `grocery`, `fashion`, `pharmacy`, and `fitness`.
- Locality coordinates are approximate and catchments overlap.
- Kokapet and Manikonda use nearest-centroid ward assignment; the other localities use polygon geography.
- Category mapping uses documented heuristic OSM tag rules.
- No fake data is returned when a source is missing or insufficient. `data_status` becomes `insufficient_data` where model scores would be unreliable.
- AI output can be wrong. It does not replace the deterministic metrics or the documented boundaries.

## Error format

HTTP and validation errors use a consistent payload:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed.",
    "details": []
  }
}
```

Common codes include `not_found`, `validation_error`, `unprocessable_request`, `ai_unavailable`, `ai_rate_limited`, `ai_timeout`, and `ai_provider_error`.

## Validation

From the project root:

```powershell
npm run build
npm run lint
```

The production build passes. Lint currently has no errors and retains nine pre-existing fast-refresh or set-state warnings outside the Stage 4 page rewrites. All nine routes, deterministic search, explorer-to-comparison navigation, and a live assistant response were also browser-verified against the built frontend and real backend.

## Files

```text
backend/
├── main.py
├── database.py
├── assistant.py
├── .env.example
├── data/
│   ├── data_loader.py
│   └── data_cleaning.py
├── analysis/
│   ├── search.py
│   ├── market.py
│   ├── competitors.py
│   ├── trends.py
│   ├── risk.py
│   ├── location.py
│   └── financial.py
├── requirements.txt
└── README.md
```
