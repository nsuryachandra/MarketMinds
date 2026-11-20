# MarketMinds — Smart Market Intelligence & Business Risk Analysis

> **A Foundation of Data Science (FDS) Full-Stack Application for Urban Commercial Intelligence in Hyderabad**

MarketMinds is an evidence-first market intelligence and commercial risk evaluation platform focused on Hyderabad. Built as a comprehensive academic project for the **Foundation of Data Science (FDS)** curriculum (2nd-Year B.Tech Computer Science & Engineering), MarketMinds transforms real-world spatial, municipal, transit, educational, and search-interest datasets into actionable decision support for retail entrepreneurs and commercial planners.

---

## 1. Key Features

- **Natural-Language Market Search**: Deterministic search parsing for natural-language queries (e.g. *"Bakery in Ameerpet"*, *"Pharmacy in Kukatpally"*), exact business name matching, and alias normalization.
- **Nine Connected Decision Views**:
  1. **Landing**: Overview of Hyderabad retail footprint, public dataset provenance, and data boundary disclosures.
  2. **Dashboard**: High-level supply metrics, category distribution charts, and direct navigation actions.
  3. **Market Explorer**: Interactive catchment mapping (500m, 1000m, 2000m), competition scores, transit access scores, and locality similarity clusters.
  4. **Competitor Intelligence**: Distance-sorted competitor POIs using vectorized NumPy Haversine computing.
  5. **Market Trends**: Historical GHMC trade licence filing activity, Google Trends relative search interest, and supervised regression model evaluations.
  6. **Risk Analysis**: Category-weighted directional risk index, cost structure sensitivity, and break-even vulnerability analysis.
  7. **Location Comparison**: Multi-locality side-by-side benchmarking across infrastructure access, retail density, and similarity clusters.
  8. **Financial Feasibility**: Interactive financial simulator supporting both Revenue-driven and Customer-driven cash flow projections.
  9. **MarketMinds Assistant**: Context-grounded conversational agent powered by NVIDIA NIM API with deterministic offline fallback.
- **Genuine Foundation of Data Science Pipeline**:
  - **Exploratory Data Analysis (EDA)** across all 12 SQLite tables.
  - **Vectorized Spatial Computing** in NumPy.
  - **Diagnostic Correlation Analysis** ($\rho, r, p$-values) in SciPy.
  - **Chronological Time-Series Holdout Regression** (OLS, Ridge, Lasso vs Persistence Baseline) in Scikit-Learn.
  - **K-Means Clustering** with silhouette optimization and singleton cluster rejection.
  - **Ward Hierarchical Clustering** linkage validation.
  - **Principal Component Analysis (PCA)** 2D projection explaining up to 64.16% of variance.
  - **Decision Tree Classification** on real POI name status with class imbalance analysis.

---

## 2. Technology Stack

- **Frontend**:
  - React 18 / Vite 8 / Tailwind CSS
  - Recharts for data visualization
  - Lucide React for UI iconography
  - Framer Motion for smooth transitions
- **Backend**:
  - Python 3.14 / FastAPI / Uvicorn
  - SQLite 3 (`backend/marketminds.db`)
  - Pandas & NumPy (data transformation and vectorization)
  - SciPy (statistical hypothesis testing and hierarchical clustering)
  - Scikit-Learn (regression, clustering, PCA, decision trees)
- **AI Integration**:
  - NVIDIA NIM API (`minimaxai/minimax-m3.1-flash`) with deterministic rule-based fallback

---

## 3. Project Directory Layout

```
MarketMinds/
│
├── frontend/                     # React 18 / Vite application
│   ├── public/                   # Static assets and favicons
│   ├── src/                      # Source components, pages, context, and lib
│   │   ├── components/           # UI cards, charts, layout, search console
│   │   ├── context/              # MarketContext shared state provider
│   │   ├── hooks/                # useApiResource custom hook
│   │   ├── lib/                  # api.js client, formatting utilities
│   │   ├── pages/                # All 9 application view pages
│   │   ├── App.jsx               # React Router configuration
│   │   └── main.jsx              # Entry point
│   ├── index.html                # HTML template
│   ├── package.json              # Frontend dependencies and npm scripts
│   ├── vite.config.js            # Vite build configuration
│   ├── tailwind.config.js        # Design tokens and theme styling
│   └── .env.example              # Frontend environment configuration template
│
├── backend/                      # FastAPI Python application
│   ├── analysis/                 # Analytical & machine learning engines
│   │   ├── machine_learning.py   # Core FDS engine (Regression, Clustering, PCA, Tree, EDA)
│   │   ├── market.py             # Catchment metrics, vectorized Haversine distance
│   │   ├── competitors.py        # Nearest competitor discovery and distance sorting
│   │   ├── trends.py             # Historical GHMC & Google Trends aggregations
│   │   ├── risk.py               # Directional risk estimation
│   │   ├── financial.py          # 12-month financial feasibility simulation
│   │   ├── location.py           # Multi-locality side-by-side comparison
│   │   └── search.py             # Deterministic natural-language search parser
│   ├── data/                     # Data cleaning and ingestion pipelines
│   │   ├── data_cleaning.py      # Schema normalizers, category mapping dictionaries
│   │   └── data_loader.py        # Repeatable SQLite ETL importer
│   ├── assistant.py              # NVIDIA NIM conversational assistant integration
│   ├── database.py               # SQLite connection management and table schema
│   ├── main.py                   # FastAPI route dispatching and dependency injection
│   ├── marketminds.db            # Persistent SQLite database (10,193 businesses, 16 localities)
│   ├── requirements.txt          # Python dependencies (FastAPI, Scikit-learn, SciPy, Pandas)
│   ├── test_fds_backend.py       # Automated backend test suite (7/7 suites passed)
│   └── test_browser_all_pages.py # Automated Selenium headless verification script
│
├── datasets/                     # Real Hyderabad datasets
│   ├── raw/                      # Original OpenStreetMap, GHMC, UDISE, TSRTC, Metro files
│   └── processed/                # Normalized clean CSV files and import summaries
│
├── docs/                         # Academic and technical documentation
│   ├── FDS_CONCEPTS.md           # Syllabus mapping for 2nd-Year B.Tech CSE
│   └── TECHNICAL_REFERENCE.md    # API specification, dataset provenance, mathematical formulas
│
├── README.md                     # Root project guide (this document)
└── .gitignore                    # Git exclusions (caches, node_modules, secrets)
```

---

## 4. Getting Started & Installation

### Prerequisites
- **Node.js** (v18 or higher) and `npm`
- **Python** (v3.10 to v3.14) and `pip`

### Step 1: Clone the Repository
```powershell
git clone <repository-url>
cd MarketMinds
```

### Step 2: Setup and Run the Backend
```powershell
# Navigate to backend
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```
- Backend API will be available at: `http://127.0.0.1:8000`
- Interactive Swagger documentation: `http://127.0.0.1:8000/docs`

### Step 3: Setup and Run the Frontend
```powershell
# Open a new terminal and navigate to frontend
cd frontend

# Install npm dependencies
npm install

# Start Vite development server
npm run dev

# Or compile and preview production bundle
npm run build
npm run preview -- --port 5173 --host 127.0.0.1
```
- Frontend application will be available at: `http://127.0.0.1:5173`

---

## 5. Automated Verification & Testing

MarketMinds includes comprehensive automated test suites verifying database integrity, API contracts, machine learning models, and frontend responsiveness:

```powershell
# 1. Run Backend & FDS Algorithms Test Suite:
python backend/test_fds_backend.py

# 2. Run Headless Browser Responsive Audit across all 9 pages and 6 viewports:
python backend/test_browser_all_pages.py

# 3. Verify Frontend Code Style and Production Build:
cd frontend
npm run lint
npm run build
```

---

## 6. Public Datasets & Data Boundaries

MarketMinds operates exclusively on real, publicly available datasets:
- **OpenStreetMap (OSM)**: 10,193 commercial points of interest across Hyderabad.
- **GHMC Trade Licences**: 720 circle-level monthly trade licence filings (2022–2023).
- **GHMC Activity Time Series**: 52 monthly citywide trade licence approval records.
- **TSRTC Bus Stops**: 5,028 mapped public bus stops in Hyderabad.
- **Hyderabad Metro GTFS**: 57 rapid transit stations.
- **UDISE+ 2024–2025**: 3,181 educational institutions aggregated to ward level.
- **Google Trends**: 1,310 weekly search-interest observations across 5 commercial categories.

### Scientific Honesty Disclosures
1. **OpenStreetMap Incompleteness**: Mapped POIs represent community mapping contributions; low counts do not guarantee low commercial activity.
2. **Circular Catchment Overlap**: Locality catchments overlap; counts cannot be summed to unique municipal totals.
3. **No Ground-Truth Commercial Failure Records**: OpenStreetMap tracks active POIs, not closures or bankruptcies. Predicting business failure is documented as structurally unsupported to prevent data fabrication.
4. **Administrative Non-Stationarity**: GHMC municipal licence applications represent administrative volume, not consumer footfall or revenue. Linear models fail to outperform naive persistence ($R^2 < 0$), which is reported transparently as `baseline_not_beaten`.

---

## 7. Additional Documentation

- [FDS_CONCEPTS.md](file:///c:/Users/nsury/Downloads/Aurora/2nd%20Year/TERM-2/FDS/Project-ui/docs/FDS_CONCEPTS.md) — Comprehensive Foundation of Data Science curriculum mapping (Modules 1–8).
- [TECHNICAL_REFERENCE.md](file:///c:/Users/nsury/Downloads/Aurora/2nd%20Year/TERM-2/FDS/Project-ui/docs/TECHNICAL_REFERENCE.md) — Complete `/api/v1` specification, dataset schema inventory, and mathematical formulations.

---

## 8. License

Academic project developed for educational demonstration in the Foundation of Data Science course. Dataset attribution remains with OpenStreetMap contributors, GHMC, UDISE+, and Google Trends.
