# MarketMinds — Technical Reference & Architecture

> **Complete Backend API Specification, Dataset Provenance & Mathematical Formulations**

---

## 1. Backend Architecture & API Specification

All backend endpoints are served under `/api/v1` via FastAPI (`backend/main.py`). The persistent storage layer is SQLite 3 (`backend/marketminds.db`).

### A. System & Metadata Endpoints

| Endpoint | Method | Parameters | Response Summary |
|---|---|---|---|
| `/api/v1/health` | GET | None | Database status, table counts for all 12 tables. |
| `/api/v1/meta/categories` | GET | None | 13 business categories with risk weights and query aliases. |
| `/api/v1/meta/localities` | GET | None | 16 curated Hyderabad localities, coordinates, ward/circle assignments. |
| `/api/v1/meta/data-sources` | GET | None | 11 public data sources with licensing, attribution, and limitation disclosures. |

### B. Natural-Language Search Endpoint

| Endpoint | Method | Body Payload | Response Summary |
|---|---|---|---|
| `/api/v1/search/interpret` | POST | `{"query": str, "locality_id": Optional[str]}` | Parsed intent, resolved category ID, resolved locality ID, business name match if applicable, and fallback suggestions. |

### C. Market Intelligence Endpoints

| Endpoint | Method | Query Parameters | Response Summary |
|---|---|---|---|
| `/api/v1/market/overview` | GET | `category` (str), `radius_m` (int: 500, 1000, 2000) | Citywide supply totals, top supply localities, category mix breakdown. |
| `/api/v1/market/locality` | GET | `locality` (str), `category` (str), `radius_m` (int) | Catchment business counts, competition score, access score, data completeness, and `similarity_cluster`. |
| `/api/v1/market/localities` | GET | `category` (str), `radius_m` (int) | Ranked locality comparison table across all 16 Hyderabad markets with cluster profiles. |
| `/api/v1/market/business` | GET | `osm_id` (str), `category` (str), `radius_m` (int) | Business-centered catchment metrics using exact mapped point coordinates. |
| `/api/v1/market/competitors` | GET | `locality` (str), `category` (str), `radius_m` (int), `limit` (int) | Nearest competitor POIs sorted ascending by Haversine distance. |
| `/api/v1/market/business/competitors` | GET | `osm_id` (str), `category` (str), `radius_m` (int), `limit` (int) | Nearest competitor POIs relative to selected business coordinates. |
| `/api/v1/market/trends` | GET | `category` (str), `circle_no` (Optional[int]) | GHMC licence application aggregates, Google Trends series, and `predictive_analytics` payload. |
| `/api/v1/market/location-comparison` | GET | `localities` (comma-separated str), `category` (str), `radius_m` (int) | Side-by-side metric comparison, similarity clusters, and conditional prescriptive notes. |

### D. Risk & Financial Feasibility Endpoints

| Endpoint | Method | Body Payload | Response Summary |
|---|---|---|---|
| `/api/v1/market/risk` | POST | `locality`, `category`, `radius_m`, `monthly_rent`, `staff_expenses`, `other_monthly_expenses`, `expected_monthly_revenue` | Directional risk score (0–100), risk band, and breakdown of competitive, cost, and completeness factors. |
| `/api/v1/market/business/risk` | POST | `osm_id`, `category`, `radius_m`, expenses, revenue | Business-focused risk evaluation from exact business coordinates. |
| `/api/v1/financial/estimate` | POST | Method (`revenue` or `customers`), cost inputs, revenue / customer inputs, `working_days` | 12-month cash flow projections across Base, Conservative, and Optimistic scenarios; break-even analysis. |
| `/api/v1/assistant/chat` | POST | `messages` (list), `context` (dict) | Context-grounded conversational responses using NVIDIA NIM API with deterministic fallback. |

### E. Foundation of Data Science (FDS) Endpoints

| Endpoint | Method | Query Parameters | Response Summary |
|---|---|---|---|
| `/api/v1/analytics/eda` | GET | None | Automated profiling across 9 tables: dimensions, missingness, duplicate rows, and IQR outlier counts. |
| `/api/v1/analytics/models` | GET | `category` (str), `radius_m` (int) | Regression model comparisons (OLS, Ridge, Lasso vs Persistence), K-Means cluster evaluations, PCA coordinates, Decision Tree metrics. |
| `/api/v1/analytics/market-insights` | GET | `locality` (str), `category` (str), `radius_m` (int) | Comprehensive locality intelligence bundle combining descriptive, diagnostic, predictive, and prescriptive analytics. |

---

## 2. Dataset Provenance & Real Data Inventory

| Dataset Name | Source & Provenance | Record Count | Attributes | Academic Usage & Caveats |
|---|---|---|---|---|
| **OSM Business POIs** | OpenStreetMap Hyderabad extract | 10,193 records (5,409 mapped with category) | `osm_id`, `name`, `category_id`, `latitude`, `longitude`, `inside_ghmc` | Catchment competition and density. Incomplete community mapping; not a commercial tax registry. |
| **Hyderabad Localities** | Curated urban commercial centers | 16 localities | `id`, `name`, `latitude`, `longitude`, `ward_no`, `circle_no`, `zone` | Analysis anchors. Centroids are approximate neighborhood centers; circular catchments overlap. |
| **GHMC Wards** | Official GHMC administrative boundary shapefile | 155 wards | `ward_id`, `ward_no`, `ward_name`, `circle_no`, `zone` | Spatial administrative assignment for municipal data joining. |
| **GHMC Trade Licences** | GHMC Open Data portal (2022–2023) | 720 monthly circle aggregates | `circle_no`, `month_year`, `applications`, `issued` | Circle-level commercial licensing volume; does not track operational business health. |
| **GHMC Activity Time Series** | Citywide monthly licence application totals | 52 monthly observations (2022–2026) | `period_start`, `approval_count` | Administrative activity time-series regression benchmarking. |
| **UDISE+ Schools** | Department of School Education (2024–2025) | 3,181 institutions | `school_id`, `ward_no`, `category`, `enrolment` | Ward-level educational density indicator. Coordinated at ward level due to absent lat/lon coordinates. |
| **TSRTC Bus Stops** | Hyderabad public bus network | 5,028 mapped stops | `stop_id`, `name`, `latitude`, `longitude` | Multi-modal transit accessibility index. Does not measure commuter passenger boardings. |
| **Hyderabad Metro GTFS** | Hyderabad Metro Rail GTFS specification | 57 stations | `station_id`, `name`, `latitude`, `longitude` | Rapid transit accessibility index. Does not measure passenger turnstile counts. |
| **Google Trends** | Google Trends Telangana search series | 1,310 weekly records across 5 categories | `week_start`, `interest` (0–100), `category_id` | Relative search interest regression forecasting. Reflects search query interest, NOT retail sales volume. |

---

## 3. Mathematical & Algorithmic Formulations

### A. Vectorized Haversine Distance (NumPy)
$$\Delta \phi = \frac{\pi}{180} (\phi_2 - \phi_1), \quad \Delta \lambda = \frac{\pi}{180} (\lambda_2 - \lambda_1)$$
$$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos\left(\frac{\pi \phi_1}{180}\right) \cos\left(\frac{\pi \phi_2}{180}\right) \sin^2\left(\frac{\Delta \lambda}{2}\right)$$
$$d = 2 R \arcsin\left(\sqrt{\min(1.0, a)}\right) \quad \text{where } R = 6371.0088 \text{ km}$$

### B. Retail Herfindahl-Hirschman Index (HHI)
$$\text{HHI} = \sum_{i=1}^{C} \left(\frac{n_i}{N}\right)^2 \times 10000$$
Where $n_i$ is the count of mapped POIs in category $i$, $N$ is total mapped POIs in the catchment, and $C$ is the number of distinct categories.

### C. Principal Component Analysis (PCA)
Given standardized locality feature matrix $X \in \mathbb{R}^{15 \times 8}$ with zero mean and unit variance:
$$\Sigma = \frac{1}{N-1} X^T X, \quad \Sigma v_i = \lambda_i v_i$$
Principal component coordinates: $Z = X V_2$ where $V_2 = [v_1, v_2]$ are the top 2 eigenvectors.
$$\text{Explained Variance Ratio } = \frac{\lambda_1 + \lambda_2}{\sum_{j=1}^{8} \lambda_j} = 64.16\% \text{ (at 2000m)}, \quad 59.14\% \text{ (at 1000m)}$$

### D. Time-Series Persistence Baseline & Error Metrics
$$\hat{y}_t^{\text{persistence}} = y_{t-1}$$
$$\text{MAE} = \frac{1}{n} \sum_{t=1}^{n} \lvert y_t - \hat{y}_t \rvert, \quad \text{RMSE} = \sqrt{\frac{1}{n} \sum_{t=1}^{n} (y_t - \hat{y}_t)^2}, \quad R^2 = 1 - \frac{\sum (y_t - \hat{y}_t)^2}{\sum (y_t - \bar{y})^2}$$

