# MarketMinds — Full Stage 1 Audit & Implementation Plan

**Status:** Stage 1 audit complete. No project files have been modified yet.
**Date:** 15 November 2026
**Project root:** `C:\Users\nsury\Downloads\Aurora\2nd Year\TERM-2\FDS\Project-ui`
**Goal:** Transform the existing mock-data frontend into a fully functional, data-driven business-intelligence product with a real FastAPI + SQLite backend, real Hyderabad datasets, and all nine pages preserved.

---

## 0. Objective and Hard Constraints

### Product objective

Turn MarketMinds into a working market-intelligence application that lets a user:

1. Choose a business category and a Hyderabad locality.
2. See real mapped business supply, competition, activity, accessibility, and trend signals.
3. Compare localities side by side.
4. Estimate risk and financial feasibility from transparent assumptions.
5. Ask questions and receive data-grounded briefs rather than fabricated “AI” answers.

### Non-negotiable constraints

- Final frontend must be **JavaScript/JSX only**:
  - no `.tsx` files
  - no `.ts` files
  - no TypeScript interfaces, type aliases, or TypeScript-specific syntax
  - remove TypeScript configs and TypeScript-only dependencies
  - production build must pass without TypeScript
- Backend must use:
  - Python 3.11+
  - FastAPI
  - SQLite
  - Pandas
  - NumPy
  - Scikit-learn where genuinely useful
  - Uvicorn
- No Docker, Redis, Celery, microservices, paid APIs, or external LLM dependency.
- Backend structure is locked to the required files listed below.
- Preserve all nine existing pages, navigation, visual identity, components, animations, and responsiveness.
- Do not redesign the product. Do not delete useful components.
- API prefix must be `/api/v1`.
- Use Pydantic validation and clear error responses.
- Frontend must show loading, error, and empty states.
- No silent fallback to mock data. If real data fails, the UI must say so.
- Never fabricate:
  - business records
  - footfall
  - sales or revenue
  - closures
  - rent benchmarks
  - locality population
  - market share
  - competitor ratings or reviews
- Clearly label every estimate, proxy, and dataset limitation.
- Risk and suitability weights must be category-specific. A café, supermarket, pharmacy, and gym cannot share identical weights.
- Code must be simple and readable enough for a second-year computer-science student to explain.

---

## 1. Current Project Reality

### 1.1 Stack

- React 19
- Vite
- TypeScript
- React Router 7
- Tailwind CSS
- Recharts
- Framer Motion
- Lucide React
- oxlint

### 1.2 Existing routes

Routes are wired in `src/App.tsx`:

| Page | Route |
|---|---|
| Landing | `/` |
| Dashboard | `/dashboard` |
| Market Explorer | `/market-explorer` |
| Competitor Intelligence | `/competitor-intelligence` |
| Market Trends | `/market-trends` |
| Risk Analysis | `/risk-analysis` |
| Location Comparison | `/location-comparison` |
| Financial Feasibility | `/financial-feasibility` |
| AI Market Assistant | `/market-assistant` |

Unknown routes redirect to `/`.

### 1.3 Existing source inventory

- `src/App.tsx`
- `src/main.tsx`
- `src/components/charts/ChartTooltip.tsx`
- `src/components/domain/RiskGauge.tsx`
- `src/components/layout/AppShell.tsx`
- `src/components/layout/CommandPalette.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/Topbar.tsx`
- `src/components/layout/navigation.ts`
- `src/components/ui/Badge.tsx`
- `src/components/ui/CategoryGlyph.tsx`
- `src/components/ui/GlassPanel.tsx`
- `src/components/ui/Logo.tsx`
- `src/components/ui/Meter.tsx`
- `src/components/ui/MetricCard.tsx`
- `src/components/ui/Modal.tsx`
- `src/components/ui/PageHeader.tsx`
- `src/components/ui/PanelHeader.tsx`
- `src/components/ui/SegmentedControl.tsx`
- `src/components/ui/Select.tsx`
- `src/components/ui/Sparkline.tsx`
- `src/components/ui/Toast.tsx`
- `src/context/MarketContext.tsx`
- `src/data/brandNames.ts`
- `src/data/categories.ts`
- `src/data/dashboard.ts`
- `src/data/insights.ts`
- `src/data/localities.ts`
- `src/data/trends.ts`
- `src/lib/analytics.ts`
- `src/lib/types.ts`
- `src/lib/utils.ts`
- `src/pages/AIAssistant.tsx`
- `src/pages/CompetitorIntelligence.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/FinancialFeasibility.tsx`
- `src/pages/Landing.tsx`
- `src/pages/LocationComparison.tsx`
- `src/pages/MarketExplorer.tsx`
- `src/pages/MarketTrends.tsx`
- `src/pages/RiskAnalysis.tsx`

### 1.4 The central problem

Every number in the current application is fake.

- `src/lib/analytics.ts` generates business counts, competition, opportunity, risk, trends, comparisons, feasibility outputs, and “AI” answers.
- Generation uses hardcoded arrays and deterministic pseudo-random helpers such as `hashString` and `seededRandom`.
- There are no `fetch` or axios calls.
- There is no backend.
- There is no database.
- There are no tests.
- `src/data/*.ts` stores invented businesses, trends, insights, and locality metrics.
- The existing `PROJECT_AUDIT.md` (844 lines) already documents the mock-data problem and confirms `npx tsc --noEmit -p tsconfig.app.json` passes.

### 1.5 Fake UI elements that must be replaced

- Sidebar:
  - “Demo data” badge (`Sidebar.tsx:56`)
  - “86% coverage” (`Sidebar.tsx:124`)
  - “Synced 4 min ago” (`Sidebar.tsx:19,135`)
  - fake refresh `setTimeout`
  - fake user identity “Aarav Mehta”
- Topbar:
  - fabricated notifications about Kokapet and Banjara Hills (`Topbar.tsx:27-58`)
  - fake “Demo” badge (`Topbar.tsx:127`)
  - fake user identity
- Dashboard:
  - hardcoded metrics, activity series, insights, and recent businesses
- Landing:
  - hardcoded preview category, locality, risk, brief, feasibility, and stats (`Landing.tsx:38-43,114-119`)
- Market Trends:
  - invented 2018–2025 registration and closure series
- Competitor Intelligence:
  - invented ratings, reviews, market share, positioning, and nearby outlet tables
- Risk Analysis:
  - invented rent benchmark and risk inputs
- Location Comparison:
  - invented rent index and affordability scores
- Financial Feasibility:
  - fabricated demand/revenue defaults
- AI Assistant:
  - rule-based answers presented as an AI model, with invented evidence

### 1.6 Existing UI worth preserving

- Application shell and responsive sidebar/topbar
- Navigation structure
- Glass-panel visual language
- Metric cards
- Meters and gauges
- Recharts charts
- Category glyphs and tints
- Command palette
- Toasts and modals
- Page headers and panel headers
- Existing typography and color tokens
- All nine page layouts, adapted to real data where necessary

### 1.7 Existing data model

Categories currently use:

```text
id, name, shortName, icon, tint, businesses, growth, avgRisk, share, trend[], keywords[], blurb
```

Current category IDs:

```text
cafes, restaurants, grocery, fashion, wellness, fitness, education, tech, salon, bakery, pharmacy, realestate
```

Localities currently use:

```text
id, name, zone, x, y, businesses, active, newRegs, inactive, growth, competition,
opportunity, rentIndex, footfall, activity, density, topCategories, note
```

`MarketContext.tsx` persists:

- `mm.category` — default `cafes`
- `mm.locality` — default `banjara-hills`

It exposes `categoryId`, `localityId`, `category`, `locality`, and setters.

`CategoryGlyph.tsx` maps:

| Category | Icon |
|---|---|
| coffee | Coffee |
| restaurant | UtensilsCrossed |
| grocery | ShoppingBasket |
| fashion | Shirt |
| wellness | HeartPulse |
| fitness | Dumbbell |
| education | GraduationCap |
| tech | Cpu |
| salon | Scissors |
| bakery | Cookie |
| pharmacy | Pill |
| realestate | Building2 |

Tint hex values:

```text
brand   #4946B4
sea     #14958C
jade    #1D9B6A
gold    #D0922B
coral   #DC6A5F
slate   #7B8194
```

---

## 2. Real Dataset Audit

### 2.1 Dataset summary

| Dataset | What it actually contains | Usable for |
|---|---|---|
| `datasets/raw/business_pois/hyderabad_business_pois.geojson` | 10,194 OSM features, mostly Points; 8,937 named; **5,438 mapped business POIs**; **5,411 inside GHMC wards** | Real mapped outlet counts, nearby competitors, category mix, coordinates |
| `datasets/raw/ghmc/ghmc_trade_licences_2022.csv` | 30 circles × 12 months; **41,575** applications | GHMC circle-level activity context |
| `datasets/raw/ghmc/ghmc_trade_licences_2023.csv` | 30 circles × 12 months; **54,737** applications (+31.7% YoY) | GHMC circle-level activity context |
| `datasets/raw/ghmc/ghmc_trade_licence_dashboard.xlsx` | Sheet `'Projects 3 '`; 237,281 rows × 7 cols; header rows 0–1; application/approval dates and fees; no business names or categories | Monthly counts and fee aggregates only |
| `datasets/raw/geography/hyderabad_ghmc_wards.kml` | 155 placemarks; `ward`, `CIRCLE`, `ZONE`, `AREA_IN_SQ`; polygons | Ward/circle joins, polygon fallback, area |
| `datasets/raw/demographics/hyderabad_census_2011.csv.csv` | 108 rows × 96 cols; 2011 ward/mandal data | City context; census ward numbers do not match current GHMC wards |
| `datasets/raw/education/hyderabad_udise_2024_25/*.csv` | 3,181 schools; all district `HYDERABAD`; 98 unique ward labels like `Ward No.78 - ...`; no lat/lon | School access by ward |
| `datasets/raw/transport/hyderabad_bus_stops.csv` | ~5,028 bus stops with lat/lon | Transport accessibility |
| `datasets/raw/transport/hyderabad_metro_gtfs_2026_07.zip` | GTFS stops | Metro accessibility |
| `datasets/raw/demand/google_trends_hyderabad.csv` | Weekly relative interest, 2021-11-14 → 2026-11-15, for Restaurant, Supermarket, Clothing store, Pharmacy, gym | Category momentum, not market size |
| `datasets/raw/land_use/GHATKESAR.jpeg` | One reference image only | Nothing quantitative |

All dataset files have modification dates of 2026-11-15.

### 2.2 OSM business POIs

Key facts:

- 10,194 total features.
- 8,937 have a name.
- 5,438 classified as supported business POIs.
- 5,411 fall inside GHMC ward polygons.
- Source is OpenStreetMap, which is community-maintained and incomplete.

Observed category mapping:

| Supported category | Approximate mapped POIs | OSM tags used |
|---|---:|---|
| Cafés | 292 | `amenity=cafe` |
| Restaurants | ~1,339 | `restaurant`, `fast_food`, `food_court`, `pub`, `bar` |
| Grocery | ~649 | `supermarket`, `convenience`, `general`, `marketplace`, `greengrocer`, `department_store` |
| Bakery | 285 | `bakery`, `confectionery` |
| Fashion | ~600+ | `clothes`, `shoes`, `jewelry`, `tailor`, and related shop tags |
| Pharmacy | ~470 | `amenity=pharmacy`, `healthcare=pharmacy`, `medical_supply` |
| Fitness | ~92 | `fitness_centre` |
| Wellness | clinics and dentists | healthcare-related tags |
| Education | ~1,157 | `school`, `university`, `college`, `office=educational_institution` |
| Tech | 93 | `office=it` |
| Salon | ~153 | `hairdresser`, `beauty` |
| Real estate | very thin, ~2 | real-estate-related tags |
| Meat | 62 | `butcher`, `seafood` |

Unmapped POIs include hospitals, other shops, buildings, and unrelated features.

### 2.3 GHMC trade licences

2022 monthly totals:

```text
Jan 1,298   Feb 1,411   Mar 2,399   Apr 1,736
May 1,358   Jun 8,352   Jul 7,813   Aug 3,364
Sep 2,939   Oct 2,670   Nov 5,126   Dec 3,109
Total: 41,575
```

2023 monthly totals:

```text
Jan 11,891  Feb 11,555  Mar 7,168   Apr 4,176
May 3,642   Jun 2,803   Jul 2,846   Aug 3,261
Sep 2,621   Oct 2,099   Nov 1,605   Dec 1,070
Total: 54,737
```

2023 was approximately **+31.7%** above 2022.

Top circles:

- 2022: Kukatpally, Serilingampally, Gosha Mahal, Jubilee Hills, Moosapet
- 2023: Gosha Mahal, Begumpet, L B Nagar, Serilingampally, Chanda Nagar

Critical limitation: these are licence applications aggregated by GHMC circle. They do not identify businesses, categories, or locality-level openings.

### 2.4 GHMC wards

The KML contains 155 wards with:

- `ward` — includes a ward number and name, e.g. `93-BANJARA HILLS`
- `CIRCLE`
- `ZONE`
- `AREA_IN_SQ`
- polygon coordinates

Direct locality-name matches include:

- `93-BANJARA HILLS`
- `95-JUBILEE HILLS`
- `105-GACHIBOWLI`
- `104-KONDAPUR`
- `121/122-KUKATPALLY`
- `108-MIYAPUR`
- `149-BEGUMPET`
- `98-AMEERPET`
- `18-LINGOJIGUDA` (LB Nagar area)
- `7-CHILKA NAGAR` (Uppal area)

Charminar, Kokapet, Manikonda, HITEC City, and Dilsukhnagar do not have exact ward-name matches and must be handled via nearest centroid, polygon containment, or nearest-ward mapping.

### 2.5 Census 2011

- 108 rows × 96 columns.
- Includes district, mandal, rural/urban, households, population, literacy, and worker categories.
- Census ward numbering does **not** match current GHMC 150-ward numbering.
  - Example: census ward 93 = Musheerabad, while KML ward 93 = Banjara Hills.
- Locality population is only defensible for a few mandal-name matches such as Ameerpet, Charminar, and Secunderabad.
- Do not fabricate locality-level population for the other localities.

### 2.6 UDISE schools 2024–25

- 3,181 schools.
- All records are in `HYDERABAD` district.
- 3,173 urban, 8 rural.
- 98 unique `lgd_ward_name` values.
- Ward names follow patterns like `Ward No.78 - ...`.
- `dummy_ward` appears 135 times.
- 60 blank ward values.
- No latitude or longitude.
- `pseudocode` links profile and enrolment files.

Plan: parse the ward number, join to GHMC ward numbers, and aggregate school counts for accessibility context.

### 2.7 Transport

- Bus stops: approximately 5,028 records with coordinates.
- Metro GTFS: stops and other GTFS files; use parent stations where appropriate.

### 2.8 Google Trends

- First lines:
  - `Category: All categories`
  - blank line
  - `Week,Restaurant: (Telangana),Supermarket: (Telangana),Clothing store: (Telangana),Pharmacy: (Telangana),gym: (Telangana)`
- Weekly data from 2021-11-14 to 2026-11-15.
- Approximately 262 weekly rows.
- Values are relative interest on a 0–100 scale.
- Mapping:
  - Restaurant → restaurants
  - Supermarket → grocery
  - Clothing store → fashion
  - Pharmacy → pharmacy
  - gym → fitness
- Do not call these search volumes, customers, or revenue.

### 2.9 Land use

- Only `GHATKESAR.jpeg` is present.
- It is a reference image and must not block the product.
- No quantitative land-use analysis will be built from it.

---

## 3. Environment

Verified locally:

- Python 3.14.1
- pandas 2.3.3
- numpy 2.3.5
- FastAPI 0.115.6
- scikit-learn 1.8.0
- Uvicorn 0.34.0
- openpyxl installed (verified by reading the GHMC xlsx with pandas)

Geocoding:

- Nominatim worked with User-Agent `MarketMinds-student-project/1.0`.
- Approximate locality coordinates for all 16 localities:

```text
Banjara Hills   17.4177464, 78.4399014
Jubilee Hills   17.4308362, 78.4102882
Gachibowli      17.4436222, 78.3519638
HITEC City      17.4490055, 78.3831376
Kondapur        17.4587912, 78.3730556
Kukatpally      17.4930841, 78.4054408
Miyapur         17.4981608, 78.3567628
Secunderabad    17.4337246, 78.5006827
Begumpet        17.4461950, 78.4630160
Ameerpet        17.4375012, 78.4482505
Charminar       17.3616024, 78.4746421
LB Nagar        17.3501617, 78.5510938
Uppal           17.4025091, 78.5612562
Kokapet         17.3948624, 78.3365214
Manikonda       17.3999951, 78.3861689
Dilsukhnagar    17.3684433, 78.5228597
```

These will be stored with a source/approximation label and displayed as approximate.

---

## 4. Data Limitations That Must Be Visible

- OSM is not a verified business register and is incomplete.
- OSM does not contain revenue, footfall, sales, or closures.
- GHMC licence data is circle-level and cannot identify individual businesses.
- Census 2011 cannot provide reliable current locality population.
- No public rent dataset exists in this project.
- Google Trends measures relative search interest, not demand volume.
- Locality catchments overlap and use approximate centres.
- Many OSM POIs are unnamed.
- Category mapping is heuristic and must be described as such.
- Estimates must be labelled as estimates, not facts.

---

## 5. Planned Architecture

### 5.1 Locked backend structure

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

### 5.2 Database

Planned SQLite tables:

- `data_sources`
  - name, type, file path, licence, attribution, last loaded time, notes
- `categories`
  - ID, display name, short name, icon, tint, description, OSM tag rules
- `localities`
  - ID, name, zone, latitude, longitude, coordinate source, ward, nullable 2011 population
- `wards`
  - ward number, ward name, circle, zone, area, geometry
- `businesses`
  - OSM ID, name, name status, category ID, latitude, longitude, ward number, tags, source
- `locality_metrics`
  - locality, category, radius, business count, density, category-mix HHI, access counts, activity, growth, opportunity, competition, data completeness, computed time
- `monthly_activity`
  - source, year, month, circle, applications, approvals, fee totals
- `trend_metrics`
  - category, week, relative interest
- `analysis_history`
  - analysis type, inputs, outputs, timestamp
- `financial_scenarios`
  - locality, category, inputs, outputs, timestamp

Additional supporting tables may include:

- `ward_schools`
- `transport_stops`
- `census_wards`

### 5.3 Data processing pipeline

1. Create tables if they do not exist.
2. Seed data-source metadata and categories.
3. Seed the 16 localities with approximate coordinates.
4. Load and clean OSM business POIs.
5. Map OSM tags to supported categories.
6. Load GHMC ward polygons and circles.
7. Load GHMC licence aggregates.
8. Load UDISE school counts by ward.
9. Load bus and metro stops.
10. Load Google Trends weekly data.
11. Load city-level Census 2011 context and defensible mandal proxies only.
12. Compute and cache locality/category metrics.
13. Skip re-import when data is already present, unless explicitly refreshed.

### 5.4 Catchment methodology

- Use circular catchments around approximate locality centres.
- Radii: 500 m, 1 km, and 2 km.
- Primary metric radius: 2 km.
- Business count = POIs inside the radius.
- Density = count / area of circle.
- Overlap between catchments will be disclosed.
- No ward polygon is treated as an exact locality boundary.

### 5.5 Category-specific analysis

Category weights will differ for at least:

- competition sensitivity
- market activity sensitivity
- financial pressure
- location/accessibility
- data completeness

Example: a café, supermarket, pharmacy, and gym will not receive identical risk weights.

---

## 6. Analytics Design

### 6.1 Market analytics

Real inputs:

- mapped POI counts
- mapped POI density
- category mix
- ward/circle context
- transport access
- school access
- Google Trends momentum
- data completeness

Planned outputs:

- business count at 500 m, 1 km, 2 km
- density per km²
- category mix
- competition score
- opportunity score
- activity score
- accessibility context
- data-quality indicators

Scores must be explainable, normalized, and labelled as model estimates.

### 6.2 Competitor analytics

Real inputs:

- nearby mapped POIs in the selected category
- distance from locality centre
- names and name status
- OSM tags
- coordinates
- source attribution

Planned outputs:

- nearby outlet table
- distance for each outlet
- category-mix concentration HHI
- top categories in the locality
- share of unnamed POIs
- data-source notes

Removed:

- ratings
- reviews
- estimated sales
- positioning scores
- invented market share

Concentration will be labelled as category-mix concentration, not revenue market share.

### 6.3 Trend analytics

Real inputs:

- GHMC 2022 and 2023 monthly licence applications
- GHMC circle totals
- Google Trends weekly relative interest for five mapped categories
- OSM snapshot only for current supply, not historical growth

Planned outputs:

- 2022 vs 2023 application comparisons
- monthly totals
- YoY change
- circle-level context
- Google Trends monthly averages and YoY movement

Removed:

- invented 2018–2025 series
- estimated closures
- fabricated net additions
- fabricated CAGR

### 6.4 Risk analytics

Inputs:

- competition signals
- market activity signals
- user financial assumptions
- location/accessibility signals
- data completeness

Planned outputs:

- score 0–100
- risk band
- factor breakdown
- factor weights
- category-specific weighting
- explanations and mitigations

Removed:

- rent benchmark
- invented locality rent
- invented financial defaults presented as market facts

Rent is user-supplied only.

### 6.5 Location comparison

Compare up to four localities on real metrics:

- business count
- density
- competition
- category mix
- accessibility
- activity context
- risk estimate
- data completeness

Removed:

- rent index
- rental affordability
- fabricated growth
- fabricated footfall

### 6.6 Financial feasibility

Inputs are explicitly user-provided:

- investment
- monthly rent
- employee expenses
- other operating expenses
- expected monthly revenue

Outputs:

- monthly profit
- margin
- payback / break-even months
- cash-flow projection
- conservative/base/optimistic scenarios

No fabricated revenue or demand defaults will be presented as market data.

### 6.7 Market assistant

No external LLM.

Planned behavior:

- deterministic intent handling
- answers grounded in database-backed metrics
- explicit source/dataset references
- generated briefs from the selected category and locality
- clear statements when a question cannot be answered from available data

Removed:

- invented evidence
- fake confidence scores presented as model certainty
- fabricated “AI” answers

---

## 7. API Plan

Prefix: `/api/v1`

Planned endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Service and database health |
| GET | `/meta` | App metadata, data sources, freshness |
| GET | `/meta/categories` | Category metadata |
| GET | `/meta/localities` | Locality metadata and coordinates |
| GET | `/meta/sources` | Dataset attribution and limitations |
| GET | `/dashboard` | Real overview metrics |
| GET | `/businesses` | Filtered mapped POIs |
| GET | `/market/overview` | City/category overview |
| GET | `/market/snapshot` | Selected category + locality snapshot |
| GET | `/market/localities` | Locality ranking metrics |
| GET | `/competitors` | Nearby mapped outlets and concentration |
| GET | `/trends` | GHMC and Google Trends data |
| POST | `/risk` | Category-specific risk estimate |
| GET | `/compare` | Multi-locality comparison |
| POST | `/feasibility` | Financial scenario calculation |
| POST | `/assistant/query` | Data-grounded question answering |
| GET | `/assistant/brief` | Generated market brief |

Implementation requirements:

- Pydantic request/response models.
- Consistent error shape.
- No mock-data fallback.
- Clear source and limitation metadata.
- Reasonable limits on list endpoints.

---

## 8. Frontend Migration and Integration Plan

### 8.1 JavaScript migration

- Convert every `.tsx` file to `.jsx`.
- Convert every `.ts` file to `.js`.
- Remove:
  - TypeScript type annotations
  - interfaces
  - type aliases
  - `import type`
  - TS-only generics
- Update all imports.
- Rename `vite.config.ts` to `vite.config.js`.
- Remove TypeScript configs and dependencies.
- Change build script from `tsc -b && vite build` to `vite build`.
- Verify with `npm run build`.
- Confirm no `.ts` or `.tsx` files remain under `src/`.

### 8.2 API client

Add:

- `src/lib/api.js`
  - base URL from `VITE_API_BASE_URL`
  - default `http://127.0.0.1:8000/api/v1`
  - JSON parsing
  - clear error handling
- `src/hooks/useApi.js`
  - loading state
  - error state
  - refetch/refresh
  - cancellation where appropriate

### 8.3 Context

Update `MarketContext` to:

- fetch categories and localities from `/meta`
- expose loading and error states
- expose refresh
- preserve selected category/locality in localStorage
- avoid inventing fallback data

### 8.4 Pages

Update all nine pages to use API data:

- Landing: real metadata and a real preview
- Dashboard: real aggregate metrics
- Market Explorer: real locality/category metrics
- Competitor Intelligence: real nearby POIs and concentration
- Market Trends: real GHMC and Google Trends data
- Risk Analysis: real signals plus user assumptions
- Location Comparison: real comparison metrics
- Financial Feasibility: real context plus user assumptions
- AI Assistant: API-generated grounded briefs and answers

Each page must include:

- loading state
- error state
- empty state
- dataset/source labels where relevant

### 8.5 Static data cleanup

Remove or reduce:

- `src/data/dashboard.ts`
- `src/data/trends.ts`
- `src/data/insights.ts`
- `src/data/brandNames.ts`
- mock calculations in `src/lib/analytics.ts`
- TS-only types in `src/lib/types.ts`

Keep only genuinely static presentation metadata if needed.

### 8.6 Fake UI cleanup

- Replace sidebar coverage and sync with real metadata or remove.
- Replace fake notifications with real data-source/status information or remove.
- Replace demo badges with accurate data-status labels.
- Remove fake user identity or label it as a sample workspace.
- Ensure “Demo” is not used unless the content truly is demo data.

---

## 9. Stage-by-Stage Execution Plan

### Stage 1 — Audit

Status: complete.

Deliverables:

- project structure audit
- route and page audit
- mock-data audit
- dataset audit
- environment audit
- limitation list
- implementation plan
- decisions requiring confirmation

### Stage 2 — JavaScript migration

- Convert all frontend files to JS/JSX.
- Remove TypeScript tooling.
- Update Vite config and package scripts.
- Verify production build.
- Confirm zero TypeScript files remain.

### Stage 3 — Backend foundation

- Create locked backend structure.
- Add `requirements.txt`.
- Implement SQLite connection and schema creation.
- Implement FastAPI app and `/api/v1/health`.
- Add metadata endpoints.
- Verify server starts and responses work.

### Stage 4 — Dataset processing

- Implement loaders and cleaners.
- Import OSM POIs and map categories.
- Import GHMC ward polygons and licence aggregates.
- Import UDISE school counts.
- Import transport stops.
- Import Google Trends.
- Import defensible census context.
- Store source attribution and limitations.
- Verify record counts and spot-check mappings.

### Stage 5 — Analytics and APIs

- Implement market, competitor, trend, risk, location, and financial modules.
- Compute and cache locality metrics.
- Implement all planned API endpoints.
- Validate inputs and error handling.
- Add backend tests where practical.

### Stage 6 — Frontend integration

- Add API client and hook.
- Update MarketContext.
- Update all nine pages.
- Remove mock analytics and mock data dependencies.
- Fix fake UI labels and notifications.
- Add loading, error, and empty states.
- Add source and limitation notes.
- Verify responsive behavior.

### Stage 7 — Validation and documentation

- Run backend and import checks.
- Run API smoke tests.
- Run frontend production build.
- Run lint.
- Confirm no TypeScript files remain.
- Confirm no silent mock fallback exists.
- Test main user flows:
  - select category
  - select locality
  - explore market
  - view competitors
  - view trends
  - run risk analysis
  - compare localities
  - run feasibility
  - ask assistant a question
- Write backend README with setup and data notes.
- Update project README with run instructions.

---

## 10. What Will Be Removed or Relabelled

### Removed

- fabricated registration history
- fabricated closures
- fabricated net additions
- fabricated CAGR
- fabricated market share
- competitor ratings and reviews
- estimated competitor sales
- rent benchmark
- rent index
- rental affordability score
- locality footfall
- locality population beyond defensible sources
- fake notifications
- fake sync status
- fake coverage percentage
- fake AI confidence and evidence

### Relabelled

- “market share” → mapped category-mix concentration
- “AI” → data-grounded assistant
- “growth” → dataset-backed change or trend signal
- “opportunity” → transparent model estimate
- “risk” → directional estimate with factor weights
- “businesses” → mapped OSM business POIs
- “licences” → GHMC circle-level licence applications
- “demand” → relative Google search interest where applicable

---

## 11. Validation and Acceptance Criteria

The implementation is not complete until:

- [ ] No `.ts` or `.tsx` files remain in `src/`.
- [ ] `npm run build` succeeds without TypeScript.
- [ ] Backend starts with Uvicorn.
- [ ] `/api/v1/health` returns success.
- [ ] Metadata endpoints return categories, localities, and sources.
- [ ] OSM import yields the expected order of magnitude (roughly 5,000+ mapped POIs).
- [ ] GHMC 2022 and 2023 totals match known aggregates.
- [ ] Locality metrics are computed and returned.
- [ ] Competitor endpoint returns real mapped POIs with distances.
- [ ] Trend endpoint returns real GHMC and Google Trends data.
- [ ] Risk endpoint returns category-specific factor weights.
- [ ] Comparison endpoint supports multiple localities.
- [ ] Feasibility endpoint returns transparent calculations from user inputs.
- [ ] Assistant endpoint answers only from available data.
- [ ] Frontend pages show loading, error, and empty states.
- [ ] No page silently falls back to mock data.
- [ ] Fake sidebar/topbar signals are removed or corrected.
- [ ] Dataset attributions and limitations are visible.
- [ ] Main user flows work in a browser.
- [ ] README documents setup and data sources.

---

## 12. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| OSM data is incomplete | Understates real supply | Label as mapped POIs, show source and completeness |
| Locality coordinates are approximate | Catchment counts vary | Store source, disclose approximation, test alternatives |
| Catchments overlap | Double-counting across localities | Disclose overlap, avoid treating counts as unique city totals |
| GHMC data is circle-level | Cannot map licences to localities | Present as circle context only, never as locality openings |
| Census wards do not align | Population mismatch | Use city/mandal context only, avoid locality population |
| Google Trends is relative | Misleading if called demand | Label as relative search interest |
| No rent dataset | Cannot benchmark rent | User-supplied rent only, remove benchmark UI |
| Category mapping is heuristic | Counts vary by mapping rules | Document tag rules, expose category mapping notes |
| Many POIs unnamed | Competitor tables look sparse | Show “unnamed mapped outlet” and name status |
| Large xlsx file | Slow import | Aggregate monthly counts/fees, avoid storing all rows |
| Scores look authoritative | Overconfidence | Show weights, inputs, limitations, and “estimate” labels |

---

## 13. Decisions Needed Before Coding

1. **Meat category**
   - Only 61 butcher POIs were mapped.
   - Recommendation: fold them into `grocery` to keep 12 categories.
   - Alternative: add a 13th “Meat & Poultry” category.

2. **Catchments**
   - Recommendation: circular 500 m / 1 km / 2 km catchments with overlap disclosed.
   - Alternative: ward polygons, which do not align cleanly with locality names.

3. **Rent**
   - No rent dataset exists.
   - Recommendation: rent is entirely user-supplied; remove the “rent benchmark” and “rent index” UI.
   - Confirm this is acceptable.

---

## 14. Immediate Next Step

If the assumptions above are approved:

1. Start **Stage 2: JavaScript migration**.
2. Then build the **backend foundation**.
3. Then process datasets and implement analytics.
4. Then connect the frontend.
5. Then validate and document.

No application files have been modified during Stage 1.