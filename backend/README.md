# MarketMinds Backend

FastAPI + SQLite backend for the MarketMinds Hyderabad market-intelligence application.

The backend imports the supplied Hyderabad datasets into a local SQLite database, exposes real-data metrics under `/api/v1`, and never substitutes mock records when a dataset fails. The React frontend is not wired to these endpoints yet.

## Requirements

- Python 3.11 or newer
- The dataset files under `datasets/raw/`
- Packages in `requirements.txt`

## Setup

From the `backend` directory:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The API is available at:

- `http://127.0.0.1:8000/api/v1`
- Swagger: `http://127.0.0.1:8000/docs`

The first startup creates `backend/marketminds.db` and imports the datasets. The GHMC workbook import can take roughly 15-30 seconds. Later startups skip sources that already have a successful import, but always refresh the 16 locality reference points.

To import without starting the API:

```powershell
python -m data.data_loader
```

To re-run every import:

```powershell
python -m data.data_loader --force
```

To rebuild from scratch, stop the API, delete `backend/marketminds.db`, and start it again.

## Frontend API setting

In the project root, create `.env.local` from `.env.example`:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

`src/lib/api.js` contains the frontend API client. Pages are intentionally not connected during this stage.

## Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/health` | Database, table, and source status |
| GET | `/api/v1/meta/categories` | 13 categories, tag rules, mapped counts, risk weights |
| GET | `/api/v1/meta/localities` | 16 approximate locality reference points |
| GET | `/api/v1/meta/data-sources` | Source attribution, dates, status, limitations |
| GET | `/api/v1/market/overview` | Citywide category overview |
| GET | `/api/v1/market/competitors` | Nearby mapped competitors in one category |
| GET | `/api/v1/market/trends` | GHMC 2022-2023 applications and Google Trends |
| GET | `/api/v1/market/location-comparison` | Compare 2-4 localities |
| POST | `/api/v1/market/risk` | Category-specific directional risk estimate |
| POST | `/api/v1/financial/estimate` | Method A/B financial scenarios |

Common query parameters:

- `category`: one of the 13 category IDs; default `cafes`
- `locality`: a locality ID such as `banjara-hills`
- `radius_m`: `500`, `1000`, or `2000`; default `2000`
- `limit`: competitor list limit, 1-200

Locality comparison uses a comma-separated ID list:

```text
GET /api/v1/market/location-comparison?localities=banjara-hills,gachibowli&category=cafes
```

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
- `competition_index` compares the selected-category mapped POI count with the highest locality count at the same radius.
- `activity_index` uses recorded GHMC circle-level licence applications for 2022-2023.
- `access_index` combines mapped bus stops, metro parent stations, and UDISE schools assigned to the locality's mapped ward. School coordinates are unavailable, so schools are not a radius count.
- `data_completeness` combines citywide category support, named-POI share in the catchment, GHMC ward assignment share, and supporting-layer availability.
- `opportunity_index` is a relative supply/activity/access indicator. It is not a profit forecast.
- Risk weights differ by category. Higher risk scores mean more directional pressure, not a predicted failure probability.
- Financial estimates use only user-entered revenue, costs, and investment. Scenario multipliers are explicit planning assumptions, not market forecasts.

## Important limitations

- OpenStreetMap POIs are community-maintained and incomplete. They are not a verified business register.
- No revenue, sales, footfall, rating, review, closure, or verified rent data is available.
- GHMC licence data is aggregated by circle or city; it cannot identify locality-level openings.
- Census 2011 ward numbering does not align with current GHMC wards, so no locality population is assigned.
- Google Trends is relative search interest, not demand volume.
- Locality coordinates are approximate and catchments overlap.
- Category mapping uses documented heuristic OSM tag rules.
- No fake data is returned when a source is missing or insufficient. `data_status` becomes `insufficient_data` where model scores would be unreliable.

## Files

```text
backend/
├── main.py
├── database.py
├── data/
│   ├── data_loader.py
│   └── data_cleaning.py
├── analysis/
│   ├── market.py
│   ├── competitors.py
│   ├── trends.py
│   ├── risk.py
│   ├── location.py
│   └── financial.py
├── requirements.txt
└── README.md
```
