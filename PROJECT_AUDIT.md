# MarketMinds — Frontend and Data Feasibility Audit

Audit date: 15 November 2026. Project root: `C:\Users\nsury\Downloads\Aurora\2nd Year\TERM-2\FDS\Project-ui`. This is a source-level audit plus external data-source verification. No project files were changed. `npx tsc --noEmit -p tsconfig.app.json` passes; `npm run lint` reports warnings only (React fast-refresh export warnings, effect state warnings, and a `Date` purity warning).

---

## 1. Executive Summary

MarketMinds is a polished, frontend-only React/TypeScript decision-support prototype for evaluating business locations in Hyderabad. It presents nine routes: a public landing page and eight workspace views (Dashboard, Market Explorer, Competitor Intelligence, Market Trends, Risk Analysis, Location Comparison, Financial Feasibility, Market Assistant). The UI is visually coherent, responsive, and built around a real design system, but every number, competitor, trend, risk score, and "AI" answer is generated from hardcoded TypeScript data or deterministic pseudo-random functions.

**What is genuinely complete:** the frontend product surface, navigation, global category/locality context, filtering/sorting, scenario calculators, clipboard exports, command palette, and local persistence.

**What does not exist:** backend, database, API layer, authentication, real data ingestion, ETL, tests, and any statistical or machine-learning model. A repository-wide search found no `fetch()`/`axios`/API calls and no `VITE_` environment configuration.

**Data reality:** the project's most valuable idea — combining business registrations, competition, rent, footfall, risk, and financial feasibility — cannot currently be backed by a single public dataset. GHMC publishes application/fee dashboards and some searchable locality-level trade records, but no bulk dataset with category, locality, active status, and closures. OpenCity provides only monthly circle-wise trade-licence application counts for 2022–2023. Census 2011 provides ward demographics. OpenStreetMap can provide POIs but not revenue, ratings, rent, footfall, or reliable closure dates. Closures, rents, footfall, ratings, and market shares are not publicly available at the required granularity.

**Feasibility verdict:** a truthful aggregate-level decision-support app is feasible using alternative data plus clearly labelled estimates. Business-level competitor intelligence, sales-based forecasting, and most ML use cases are not currently feasible without licensed data or primary collection.

| Area | Status | Summary |
|---|---|---|
| Frontend prototype | READY | Nine routes, strong design system, working interactions |
| Backend/API | NOT STARTED | No server, database, or data layer |
| Real aggregate data | FEASIBLE WITH ALTERNATIVE DATA | GHMC/OpenCity/Census/OSM can support partial indicators |
| Business-level competitor data | REQUIRES DATA COLLECTION | No public bulk source with ratings/reviews/share |
| Closures/active status | NOT CURRENTLY FEASIBLE | No public closure register at locality/category level |
| ML/forecasting | NOT CURRENTLY FEASIBLE for most use cases | Insufficient longitudinal, labelled data |
| Demo credibility | AT RISK | Synthetic precision is presented as real market intelligence |

**Bottom line:** keep the frontend; build a small FastAPI + SQLite read layer; ingest only what can be sourced and labelled; replace fabricated competitor shares, ratings, and AI claims with transparent estimates; defer ML until at least 24–36 months of consistent data and labelled outcomes exist.

---

## 2. Existing Project Technology Stack

| Layer | Technology | Version | Evidence | Role / observation |
|---|---|---|---|---|
| UI runtime | React | ^19.3.1 | `package.json:18` | Functional components and hooks throughout |
| DOM renderer | react-dom | ^19.3.1 | `package.json:19` | Standard client-side rendering |
| Routing | react-router-dom | ^7.18.5 | `package.json:20` | `BrowserRouter`, nested routes in `src/App.tsx:27-44` |
| Build tool | Vite | ^8.3.6 | `package.json:33` | `vite.config.ts` uses only the React plugin |
| Language | TypeScript | ~7.0.2 | `package.json:32` | Strict app config; `tsc -b` runs before build |
| React plugin | @vitejs/plugin-react | ^6.1.2 | `package.json:27` | Fast Refresh |
| Styling | Tailwind CSS | ^3.4.17 | `package.json:31` | Custom palette in `tailwind.config.js:6-67` |
| CSS pipeline | PostCSS + Autoprefixer | ^8.5.33 / ^10.6.2 | `package.json:28,30` | Standard Tailwind pipeline |
| Class utility | clsx | ^2.1.1 | `package.json:15` | Used by `cn()` in `src/lib/utils.ts` |
| Animation | framer-motion | ^14.14.0 | `package.json:16` | Page transitions in `AppShell`, landing motion |
| Icons | lucide-react | ^1.73.0 | `package.json:17` | Icons across navigation and panels |
| Charts | recharts | ^3.10.1 | `package.json:21` | Area, bar, line, composed, pie, radar charts |
| Fonts | Manrope Variable, Instrument Serif | ^5.3.0 | `package.json:13-14` | Loaded via `@fontsource` |
| State | React Context + hooks | built-in | `src/context/MarketContext.tsx` | Global category/locality selection; no Redux/Zustand |
| Server state | None | — | No fetch/API usage found | No React Query/SWR/Apollo |
| Persistence | `localStorage` | browser API | `MarketContext.tsx:19-39`, `FinancialFeasibility.tsx:55-70` | Context and feasibility scenario only |
| Linting | oxlint | ^1.90.0 | `package.json:29`, `.oxlintrc.json` | React/TypeScript/oxc plugins; no type-aware rules |
| Tests | None | — | No test script or test files | No Vitest/Playwright/Jest |
| Backend | None | — | No server directory or API calls | Fully static SPA |
| Deployment | Static build | — | `dist/` present | `BrowserRouter` requires SPA fallback |

**Notable absences:** no API client, no environment variables, no authentication, no database, no form library, no schema validation, no error boundary, no analytics, no CI configuration, and no project-specific documentation. `README.md` is the default Vite template.

---

## 3. Complete Folder Structure

```text
Project-ui/
├─ .git/                          # single commit: 26dcdc2 "First Try"
├─ dist/                          # prior production build output
├─ node_modules/                  # installed dependencies
├─ public/
│  ├─ favicon.svg
│  └─ icons.svg
├─ src/
│  ├─ assets/
│  │  ├─ hero.png                 # unused
│  │  ├─ react.svg                # unused
│  │  └─ vite.svg                 # unused
│  ├─ components/
│  │  ├─ charts/
│  │  │  └─ ChartTooltip.tsx
│  │  ├─ domain/
│  │  │  └─ RiskGauge.tsx
│  │  ├─ layout/
│  │  │  ├─ AppShell.tsx
│  │  │  ├─ Sidebar.tsx
│  │  │  ├─ Topbar.tsx
│  │  │  ├─ CommandPalette.tsx
│  │  │  └─ navigation.ts
│  │  └─ ui/
│  │     ├─ Badge.tsx
│  │     ├─ CategoryGlyph.tsx
│  │     ├─ GlassPanel.tsx
│  │     ├─ Logo.tsx
│  │     ├─ Meter.tsx
│  │     ├─ MetricCard.tsx
│  │     ├─ Modal.tsx
│  │     ├─ PageHeader.tsx
│  │     ├─ PanelHeader.tsx
│  │     ├─ SegmentedControl.tsx
│  │     ├─ Select.tsx
│  │     ├─ Sparkline.tsx
│  │     └─ Toast.tsx
│  ├─ context/
│  │  └─ MarketContext.tsx
│  ├─ data/
│  │  ├─ brandNames.ts
│  │  ├─ categories.ts
│  │  ├─ dashboard.ts
│  │  ├─ insights.ts
│  │  ├─ localities.ts
│  │  └─ trends.ts
│  ├─ lib/
│  │  ├─ analytics.ts
│  │  ├─ types.ts
│  │  └─ utils.ts
│  ├─ pages/
│  │  ├─ AIAssistant.tsx
│  │  ├─ CompetitorIntelligence.tsx
│  │  ├─ Dashboard.tsx
│  │  ├─ FinancialFeasibility.tsx
│  │  ├─ Landing.tsx
│  │  ├─ LocationComparison.tsx
│  │  ├─ MarketExplorer.tsx
│  │  ├─ MarketTrends.tsx
│  │  └─ RiskAnalysis.tsx
│  ├─ App.tsx
│  ├─ index.css
│  └─ main.tsx
├─ index.html
├─ package.json
├─ package-lock.json
├─ postcss.config.js
├─ tailwind.config.js
├─ vite.config.ts
├─ tsconfig.json
├─ tsconfig.app.json
├─ tsconfig.node.json
├─ .oxlintrc.json
├─ .gitignore
└─ README.md                      # untouched Vite template
```

**Observations:** the structure is clean and conventional for a Vite SPA. Pages are large (roughly 600–1,200 lines each), with domain logic living in `src/lib/analytics.ts` and data in `src/data/`. There is no `api/`, `services/`, `hooks/`, `tests/`, `docs/`, or `backend/` directory. `src/assets/hero.png`, `react.svg`, and `vite.svg` are unreferenced.

---

## 4. Page-by-Page Frontend Audit

| Page | Route | Primary data | Real interaction | Backend needed |
|---|---|---|---|---|
| Landing | `/` | Hardcoded preview of cafés/Banjara Hills | Links, animations | Optional |
| Dashboard | `/dashboard` | Static dashboard arrays + context snapshot | Range toggle, selectors, navigation | Yes for real metrics |
| Market Explorer | `/market-explorer` | Localities + derived snapshots | Filters, sort, shortlist, modal | Yes |
| Competitor Intelligence | `/competitor-intelligence` | Generated competitor records | Search, sort, CSV copy | Yes |
| Market Trends | `/market-trends` | Hardcoded 2018–2025 series | Category comparison, CSV copy | Yes |
| Risk Analysis | `/risk-analysis` | `calculateRisk()` | Live inputs, reset | Optional/yes |
| Location Comparison | `/location-comparison` | `getComparisonMetrics()` | Add/remove localities, copy | Yes |
| Financial Feasibility | `/financial-feasibility` | `calculateFeasibility()` | Sliders, scenarios, save | Optional |
| Market Assistant | `/market-assistant` | Rule-based brief generator | Chat, copy/download, clear | Yes for real answers |

All workspace routes are nested inside `AppShell` (`src/App.tsx:31-42`). The unknown-route fallback redirects to `/`.

### 4.1 Landing — `src/pages/Landing.tsx`

- Public marketing page with hero, marketplace preview, statistics, feature cards, three-step explainer, and CTA links into the workspace.
- The preview is computed at module scope: `getCategory('cafes')`, `getLocality('banjara-hills')`, `getMarketSnapshot`, `calculateRisk`, `buildMarketBrief`, and `calculateFeasibility` run once at import (`Landing.tsx:38-43`). It always shows cafés in Banjara Hills, regardless of user context.
- The hero line chart is hand-built from `category.trend` and SVG path math, not a real time series (`Landing.tsx:88-112`).
- Stats claim "tracked businesses" from `totalLocalityBusinesses`, 16 localities, 12 categories, and eight decision views (`Landing.tsx:114-119`).
- No API. No backend status. The visual quality is high, but the numbers imply a live dataset that does not exist.

### 4.2 Dashboard — `src/pages/Dashboard.tsx`

- KPI row with sparklines for tracked, active, registrations, and inactive businesses.
- Market pulse panel: index 74.2, "expanding" badge, 12M/6M/3M toggle, area chart of monthly activity, and active/new/opportunity mini-KPIs.
- Quick analysis panel with category and locality selectors that update global context.
- Panels for market growth, category distribution (top six plus "Other"), locality activity ranking, emerging categories, competition heat/gaps, and recent insights.
- Data comes from `src/data/dashboard.ts`, `categories.ts`, `localities.ts`, `insights.ts`, plus `getMarketSnapshot()` (`Dashboard.tsx:47-61`).
- Interactions are real: range toggle, selectors, navigation to risk analysis, and a custom search event (`Dashboard.tsx:148-150`).
- Issues: "updated 4 minutes ago" is static; `new Date()` in render triggers the lint purity warning; the dashboard's monthly series conflicts with the annual trend series (see Section 5).
- No backend. Every metric is static or derived from static data.

### 4.3 Market Explorer — `src/pages/MarketExplorer.tsx`

- Left filter rail: category select, competition filter (all/low/medium/high, bucketed at 50/70), minimum activity slider, search, sort by opportunity/activity, and map mode (competition/opportunity).
- Main area: a schematic locality atlas, locality list/cards, selected-locality detail, opportunity signals, and a comparison bar chart.
- Shortlist supports up to four localities; "Compare shortlist" opens a modal (`MarketExplorer.tsx:137-156`, `830`).
- Data: `localities.map(getMarketSnapshot(categoryId, item.id))` (`MarketExplorer.tsx:92-99`); filtering and sorting are pure client-side (`101-112`).
- The "map" uses `x`/`y` values from `localities.ts`, not real latitude/longitude; it is a schematic, not a geographic map.
- No URL state: filters and shortlist reset on reload. No backend.

### 4.4 Competitor Intelligence — `src/pages/CompetitorIntelligence.tsx`

- Scope selector; KPI cards for total, nearby, density, and HHI; category-mix bar chart; concentration gauge; nearby market-pressure list; competitor table with search and sortable columns (distance, rating, share); CSV copy.
- Data: `getCompetitors()` generates exactly eight fictional records by splicing names from `brandNames.ts` and using a seeded generator (`analytics.ts:152-190`). Category mix comes from dividing locality business counts by category shares (`getLocalityCategoryBreakdown`, `analytics.ts:126-141`).
- HHI is computed from those synthetic sample shares plus an arbitrary `+155` (`analytics.ts:179`). This is not a valid market concentration measure.
- Copy CSV is a real Clipboard API call (`CompetitorIntelligence.tsx:188-207`), but the content is fabricated.
- No Google Places/OSM integration. Ratings, review counts, establishment years, positioning, distances, and shares are all synthetic.

### 4.5 Market Trends — `src/pages/MarketTrends.tsx`

- Four KPI cards (2025 registrations, net additions, estimated closures, five-year CAGR).
- Composed chart of registrations vs. estimated closures by year; year-over-year growth chart; category growth comparison (up to three categories); growing/lagging category lists; yearly table; milestone notes; CSV copy.
- Data is entirely hardcoded in `src/data/trends.ts:5-56`: eight yearly points from 2018–2025, headline figures, category lists, and milestones. Category comparison uses the arbitrary eight-point `trend` arrays in `categories.ts`.
- Interactions: add/remove comparison categories (minimum one, maximum three), copy CSV, navigate to assistant.
- Issues: the 2020 contraction and 2021 surge are plausible but unsourced; "estimated closures" are invented; the five-year CAGR is a literal string/value (12.1) rather than calculated; no forecast is implemented.
- No backend.

### 4.6 Risk Analysis — `src/pages/RiskAnalysis.tsx`

- Inputs: investment, monthly rent, monthly operating cost, each with a number field and slider.
- Risk gauge, four signal cards (competition, market, financial, location), weighted factor breakdown, rent-sensitivity chart (0.55–1.5× benchmark), mitigation cards, and a "what would lower the risk" panel.
- Calculation is `calculateRisk()` (`analytics.ts:192-296`): competition 32%, market 20%, financial 28%, location 20%; bands at 38/55/70. Default inputs are ₹12,00,000 investment, ₹45,000 rent, ₹1,55,000 monthly opex (`analytics.ts:487-491`).
- Inputs recalculate live; reset restores defaults. No persistence.
- Weights, thresholds, and the rent benchmark (`locality.rentIndex * 1200`) are arbitrary and uncalibrated. The result is a directional heuristic, not a validated risk model.
- No backend.

### 4.7 Location Comparison — `src/pages/LocationComparison.tsx`

- Compares two to four localities, initialised from the current locality plus nearby localities selected by Euclidean distance on the schematic `x`/`y` coordinates (`LocationComparison.tsx:142-145`).
- Scorecard rows: suitability, competition, density, growth, activity, risk, affordability, rent index; each row highlights the best value.
- Radar chart (opportunity, low competition, growth, activity, affordability) and bar chart (suitability vs. risk); locality profile comparison cards; copy comparison.
- Data: `getComparisonMetrics()` (`analytics.ts:76-112`), which normalises growth with an arbitrary ×4.2 factor and computes affordability from the rent index.
- Interactions: add/remove, reset, copy, assistant link. No URL state or backend.

### 4.8 Financial Feasibility — `src/pages/FinancialFeasibility.tsx`

- Five inputs: investment, monthly rent, employee expenses, other expenses, monthly revenue.
- Three scenarios: conservative 0.85×, base 1.0×, optimistic 1.15× revenue (`FinancialFeasibility.tsx:43-47`).
- Outputs: feasibility dial, verdict, total expenses, monthly profit, margin, break-even months, cumulative cash-flow chart over 25 months, cost-composition pie, and scenario comparison table.
- `calculateFeasibility()` (`analytics.ts:298-347`) uses revenue minus rent/people/other costs; break-even is investment divided by monthly profit; verdict thresholds are margin ≥20% and payback ≤18 months for "Strong", margin ≥8% and payback ≤30 for "Viable".
- Save writes `{inputs, scenario}` to `localStorage` under `mm.feasibility.scenario` (`FinancialFeasibility.tsx:55-70, 236-245`), with a toast.
- Issues: no cost of goods sold, taxes, depreciation, working capital, ramp-up, or seasonality; `annualProfit` is simply monthly profit ×12; break-even ignores revenue growth; the score formula is ad hoc.
- No backend; persistence is browser-local only.

### 4.9 Market Assistant — `src/pages/AIAssistant.tsx`

- Chat interface with an intro message, suggested prompts, typing indicator, and a side panel showing "What the data says" with tabs for signals, risks, and plan.
- Answers come from `answerMarketQuestion()` (`analytics.ts:448-485`), which uses regex intent matching (saturation, rent, risk, opportunity, outlook, location) and fills templates from `getMarketSnapshot`, `getCompetitors`, and `buildMarketBrief`.
- The typing effect is a 720 ms `setTimeout` (`AIAssistant.tsx:234-249`); there is no model, API, or conversation memory. Each answer is independent of previous turns.
- Copy brief uses the Clipboard API; download creates a `.txt` Blob (`AIAssistant.tsx:292-312`).
- The page description explicitly says "deterministic mock engine" (`AIAssistant.tsx:319`), which is good, but the generated brief still reports confidence values (58–92%) that are not statistical confidence.
- No backend.

### 4.10 Workspace shell and navigation

- `AppShell` handles route transitions, scroll-to-top, document titles, mobile sidebar state, and the global `Ctrl/Cmd+K` search shortcut (`AppShell.tsx:14-35`).
- `Sidebar` shows the current category/locality, labels the data "Demo data" (`Sidebar.tsx:53-57`), advertises 86% coverage with a static meter (`123-129`), shows "Synced 4 min ago", and simulates refresh with a 1.1-second timeout (`21-28`).
- `Topbar` provides page context, search, locality selector, notifications, demo badges, and a fake analyst profile. Notifications are local state with fabricated messages (`Topbar.tsx:27-58, 163-217`).
- `CommandPalette` searches pages, localities, and categories, supports keyboard navigation, and applies context changes (`CommandPalette.tsx:43-100`).
- These are well-built UI patterns, but the "sync", "coverage", and notification data are simulated.

---

## 5. Complete Mock Data Inventory

### 5.1 Static data files

| File | Exports | Size / shape | Key fields | Consumers | Nature |
|---|---|---|---|---|---|
| `src/data/categories.ts` | `categories`, `totalBusinesses`, `getCategory()` | 12 records | id, name, shortName, icon, tint, businesses, growth, avgRisk, share, trend[8], keywords, blurb | Landing, Dashboard, Explorer, Competitor, Trends, Assistant, Command Palette, Topbar | Hardcoded |
| `src/data/localities.ts` | `localities`, `getLocality()`, four totals | 16 records | id, name, zone, x/y, businesses, active, newRegs, inactive, growth, competition, opportunity, rentIndex, footfall, activity, density, topCategories, note | Nearly every page and shell | Hardcoded |
| `src/data/dashboard.ts` | `monthlyActivity`, `kpiSparks`, `categoryDistribution`, `topEmergingCategories`, `highCompetitionAreas`, `marketGapAreas`, `localityActivityRanking`, `marketPulseSummary` | 12 monthly points, 4×12 spark arrays, derived lists | month, activity, registrations, closures; pulse index 74.2 | Dashboard | Hardcoded/derived |
| `src/data/trends.ts` | `trendYears`, `yearlyRegistrations`, `trendHeadline`, `growingCategories`, `decliningCategories`, `milestoneNotes`, `yearlyTable` | 8 yearly points, 4 growing, 3 declining, 3 milestones | year, registrations, closures, growth; headline 8,620 registrations and 2,460 closures for 2025 | Market Trends | Hardcoded |
| `src/data/insights.ts` | `insights` | 5 cards | type, title, detail, tag, time, metric, route | Dashboard | Hardcoded narrative |
| `src/data/brandNames.ts` | `brandNames` | 12 categories × 10 names = 120 | fictional brand names | `getCompetitors()` only | Fictional |
| `src/lib/analytics.ts` | MarketSnapshot, ComparisonMetrics, CompetitorSet, RiskResult, FeasibilityResult, MarketBrief, default inputs | Functions and interfaces | All derived metrics and templates | All workspace pages | Deterministic generation |

### 5.2 Cross-file totals and consistency

- Category business counts sum to **48,236**, exactly matching the locality business total (`categories.ts:174`, `localities.ts:330`).
- Locality active (39,967) + inactive (8,269) = 48,236.
- Locality `newRegs` values sum to **1,284**, exactly matching November's monthly registrations.
- Category shares sum to **100.00%**.
- `kpiSparks` end values match the dashboard totals: 48,236 tracked, 39,967 active, 8,269 inactive, 1,284 registrations.
- These consistencies show deliberate authoring, but they do not establish real-world validity.

**Important inconsistency:** the dashboard's monthly registrations sum to **13,186** over 12 months, while `trends.ts` reports **8,620** registrations for 2025. The two series are not reconcilable without a definition that does not exist in the code. This will be visible to an evaluator who adds up the numbers.

**Other unsupported specifics:** `insights.ts` claims "12 organised grocery outlets per 10,000 residents", "footfall rose just 2.8%", "three new premium openings", "rents softened 4.2%", and "six outlets exited". None of these quantities exist in the data model. They are fabricated narrative details.

### 5.3 Derived analytics

| Function | Inputs | Output | Nature |
|---|---|---|---|
| `getMarketSnapshot()` | category id, locality id | presence, nearby, density, competition, opportunity, growth, rent benchmark | Deterministic formula plus `hashString`/`seededRandom` jitter (`analytics.ts:26-62`) |
| `getComparisonMetrics()` | category id, locality id | locality + snapshot + risk + suitability + affordability + activity + growth + competition + rent | Weighted heuristic (`76-112`) |
| `getNearbyLocalities()` | locality id, count | nearest localities by Euclidean `x`/`y` distance | Schematic distance, not road distance (`114-124`) |
| `getLocalityCategoryBreakdown()` | locality id | category counts | Locality businesses × category share × jitter (`126-141`) |
| `getCompetitors()` | category id, locality id | 8 records + nearby + total + density + HHI + label | Brand names + seeded random; synthetic shares (`152-190`) |
| `calculateRisk()` | category, locality, investment/rent/opex | score, band, headline, factors | Weighted rules (`192-296`) |
| `calculateFeasibility()` | investment, rent, people, other, revenue | expenses, profit, margin, break-even, score, verdict | Accounting arithmetic (`298-347`) |
| `buildMarketBrief()` | category, locality | recommendation, confidence, summary, opportunities, risks, competition, financial, next steps | Template composition (`368-446`) |
| `answerMarketQuestion()` | question, category, locality | templated answer | Regex intent router (`448-485`) |

### 5.4 Persistence keys

| Key | Written by | Read by | Purpose |
|---|---|---|---|
| `mm.category` | `MarketContext.tsx:34` | `MarketContext.tsx:27` | Selected category |
| `mm.locality` | `MarketContext.tsx:38` | `MarketContext.tsx:30` | Selected locality |
| `mm.feasibility.scenario` | `FinancialFeasibility.tsx:238` | `FinancialFeasibility.tsx:59` | Saved feasibility inputs and scenario |

### 5.5 Data lineage examples

1. `category.share` + `locality.businesses` → `getMarketSnapshot().presence` → Dashboard KPIs, Explorer cards, Competitor totals.
2. `locality.rentIndex × 1200` → `snapshot.rentBenchmark` → Risk rent pressure, Assistant rent answer, Brief financial section.
3. `brandNames[categoryId]` + `seededRandom()` → competitor names, distances, ratings, reviews, years, positioning, shares → Competitor table and CSV.
4. Feasibility inputs × scenario multiplier → `calculateFeasibility()` → dial, verdict, cash-flow chart, scenario table.
5. Regex intent + snapshot/brief → `answerMarketQuestion()` → chat reply.

**Synthetic status:** all data is synthetic or heuristic. There is no `source`, `as_of`, `confidence`, `is_estimated`, or `is_synthetic` field anywhere. The only explicit disclosure is the sidebar "Demo data" badge and small "illustrative" labels; many pages present estimates with two-decimal precision and no caveat.

---

## 6. Functionality and Interaction Audit

### 6.1 Working frontend interactions

| Feature | Location | Status | Notes |
|---|---|---|---|
| Routing and nested layout | `App.tsx`, `AppShell.tsx` | Works | `BrowserRouter`; unknown routes redirect to `/` |
| Global category/locality context | `MarketContext.tsx` | Works | Persisted to localStorage; defaults cafés/Banjara Hills |
| Category/locality selectors | Dashboard, Explorer, Competitor, Risk, Topbar | Works | Searchable custom `Select` |
| Command palette | `CommandPalette.tsx` | Works | `Ctrl/Cmd+K`, arrow keys, Enter, Escape |
| Dashboard search button | `Dashboard.tsx:148-150` | Works | Dispatches `marketminds:open-search` |
| Range toggle | Dashboard | Works | 12M/6M/3M slices the static monthly array |
| Explorer filters/sort/shortlist | `MarketExplorer.tsx` | Works | Client-side filtering, max four shortlisted |
| Comparison modal | `MarketExplorer.tsx` | Works | Uses `Modal` and derived metrics |
| Competitor search/sort | `CompetitorIntelligence.tsx` | Works | Sort by distance, rating, share |
| Clipboard CSV export | Competitor, Trends, Comparison, Assistant | Works in secure contexts | Wrapped in try/catch; failure only shows a toast |
| Brief download | `AIAssistant.tsx:301-312` | Works | Client-side `.txt` Blob |
| Risk live inputs | `RiskAnalysis.tsx` | Works | Sliders and number fields recalculate |
| Feasibility scenarios | `FinancialFeasibility.tsx` | Works | 0.85/1.0/1.15 revenue multipliers |
| Save feasibility scenario | `FinancialFeasibility.tsx` | Works locally | localStorage only; not synced |
| Sidebar refresh | `Sidebar.tsx:21-28` | Simulated | 1.1-second spinner; no data changes |
| Notifications | `Topbar.tsx` | Local only | Read/unread state resets on reload |
| Assistant "typing" | `AIAssistant.tsx:243-249` | Simulated | 720 ms delay; deterministic answer |

### 6.2 Simulated or unsupported functionality

- **Data refresh/sync:** the sidebar says "Synced 4 min ago" and changes to "just now" after a timeout; no data is fetched.
- **Coverage:** "86% Hyderabad coverage" is a literal value with no definition.
- **Notifications:** three hardcoded signals, including "three new openings detected in the last 90 days", which the data cannot support.
- **AI assistant:** rule-based template engine; no model, no retrieval corpus beyond the same mock functions, no memory.
- **Competitor intelligence:** names, ratings, review counts, establishment years, distances, and market shares are generated.
- **HHI:** computed from synthetic sample shares that do not sum to a market total; adding 155 is arbitrary.
- **Risk and feasibility:** transparent arithmetic, but weights and thresholds are not calibrated or validated.
- **Exports:** CSV is copied to the clipboard, not downloaded as a file; this may surprise users and fails outside secure contexts.

### 6.3 Missing functionality

- No backend, API client, loading states, error states, retries, or empty states tied to real data.
- No authentication, user accounts, roles, or server-side saved scenarios.
- No URL state for filters/comparisons, so views are not shareable.
- No pagination or virtualisation for large competitor/business tables.
- No real map or geospatial query; the atlas is schematic.
- No data provenance, freshness, or source citations in the UI.
- No tests, CI, or browser E2E checks.
- No accessibility audit; many `aria-label`s exist, but focus management, contrast, and reduced-motion behaviour are unverified.
- No error boundary or fallback UI for runtime failures.

### 6.4 Quality checks performed

- TypeScript: `npx tsc --noEmit -p tsconfig.app.json` passes.
- Lint: `npm run lint` reports warnings only, including `react/only-export-components` in `CategoryGlyph.tsx` and `MarketContext.tsx`, `set-state-in-effect` in `AppShell.tsx` and `CommandPalette.tsx`, and a `Date` purity warning in `Dashboard.tsx`.
- No test script exists in `package.json`.
- No runtime browser audit was performed as part of this source review; visual claims below are based on component structure and styling, not screenshots.

---

## 7. Backend Architecture Recommendation

**Recommended stack:** Python 3.11+, FastAPI, SQLite, Pandas, NumPy, scikit-learn, and Matplotlib/Plotly for offline analysis and reports. This matches the preferred stack and is appropriate for a student project: one process, one database file, simple deployment, and no infrastructure overhead.

### 7.1 Recommended architecture

```text
React SPA (existing)
        │  HTTPS / JSON
        ▼
FastAPI application  (/api/v1)
        │
        ├── Routers: meta, dashboard, localities, competitors,
        │            trends, risk, feasibility, assistant, admin
        ├── Services: analytics, estimation, briefs, validation
        ├── SQLite database (SQLAlchemy 2.x or plain sqlite3)
        ├── ETL scripts (Pandas): CSV/OSM/Census → normalized tables
        └── Offline ML scripts (scikit-learn): forecasting/clustering
                 │
                 ▼
        data/raw, data/processed, data/seed (CSV/GeoJSON)
```

### 7.2 Proposed backend structure

```text
backend/
├─ app/
│  ├─ main.py                 # FastAPI app, CORS, router registration
│  ├─ config.py               # pydantic-settings, .env
│  ├─ database.py             # SQLite engine/session
│  ├─ models.py               # SQLAlchemy models
│  ├─ schemas.py              # Pydantic request/response models
│  ├─ routers/
│  │  ├─ meta.py
│  │  ├─ dashboard.py
│  │  ├─ market.py
│  │  ├─ competitors.py
│  │  ├─ trends.py
│  │  ├─ risk.py
│  │  ├─ feasibility.py
│  │  └─ assistant.py
│  ├─ services/
│  │  ├─ analytics.py         # port/refine current formulas
│  │  ├─ estimates.py         # confidence and provenance helpers
│  │  └─ briefs.py
│  └─ seed.py                 # load data/seed CSVs into SQLite
├─ etl/
│  ├─ ingest_opencity.py
│  ├─ ingest_census.py
│  ├─ ingest_osm.py
│  ├─ ingest_ghmc_manual.py
│  └─ validate.py
├─ data/
│  ├─ raw/
│  ├─ processed/
│  └─ seed/
├─ tests/
│  ├─ test_meta.py
│  ├─ test_market.py
│  └─ test_feasibility.py
├─ requirements.txt
└─ README.md
```

### 7.3 Design principles

- **Read-heavy API:** most endpoints are GETs returning precomputed aggregates. Only risk, feasibility, and assistant need POST bodies.
- **Estimates are first-class:** every response includes `source`, `as_of`, `is_estimated`, and `confidence` where applicable. Do not let the frontend infer provenance.
- **Keep calculations server-side for consistency:** the current client formulas can remain for instant feedback, but the server should become authoritative. If the client keeps a calculator, share the same formula definitions and test both.
- **No microservices, queues, or LLM in v1.** Use CLI ETL scripts and SQLite. Add Postgres/PostGIS only if the project grows beyond a single-user demo.
- **CORS:** allow the Vite dev origin in development; restrict in production.
- **Validation:** Pydantic models for all inputs; reject negative money values, unknown category/locality IDs, and excessive payloads.
- **Errors:** consistent `{detail, code}` JSON; never expose stack traces.
- **Documentation:** FastAPI's `/docs` plus a short `backend/README.md` with setup, seed, and ETL commands.
- **Testing:** pytest + `httpx`/`TestClient`; at minimum test meta counts, one snapshot, risk boundaries, feasibility zero-revenue, and 404s.
- **Spatial data:** store latitude/longitude and compute haversine distances in Python; SQLite is sufficient for 16 localities and a few thousand POIs. Use SpatiaLite only if polygon joins become necessary.
- **Deployment:** build the SPA, serve it behind the same origin as the API (or configure SPA fallback), run `uvicorn app.main:app`. Docker is optional.

---

## 8. Proposed Database Design

SQLite is sufficient for aggregates and a student project. Use `TEXT` IDs that match the frontend (`cafes`, `banjara-hills`), `INTEGER`/`REAL` for measures, and ISO dates stored as `TEXT`/`DATE`. Store JSON-derived fields as `TEXT` and validate in the application layer.

### 8.1 Core tables

| Table | Purpose | Key columns | Notes |
|---|---|---|---|
| `categories` | Canonical category list | `id` PK, `name`, `short_name`, `icon`, `tint`, `description` | 12 rows; taxonomy mapping fields can be added |
| `localities` | Canonical locality list | `id` PK, `name`, `zone`, `ward_code`, `latitude`, `longitude`, `geometry_json` | 16 rows; `x/y` from the frontend are presentation coordinates, not geography |
| `locality_category_metrics` | Latest snapshot per locality/category | `locality_id` FK, `category_id` FK, `business_count`, `active_count`, `new_registrations`, `inactive_count`, `growth_pct`, `competition_index`, `opportunity_index`, `rent_index`, `footfall_index`, `activity_index`, `density_per_sqkm`, `as_of_date`, `source_id` FK, `is_estimated` | Composite PK (`locality_id`, `category_id`, `as_of_date`); primary analytics table |
| `monthly_activity` | Monthly registrations/closures/activity | `id` PK, `locality_id` nullable, `month` DATE, `registrations`, `closures`, `activity_index`, `source_id`, `is_estimated` | Locality-null rows are city-wide; never mix scopes without a `scope` column |
| `yearly_trends` | Annual series | `year` PK, `registrations`, `closures`, `growth_pct`, `source_id`, `is_estimated` | Prefer deriving from monthly when possible |
| `businesses` | Optional business-level registry | `id` PK, `name`, `category_id`, `locality_id`, `address`, `latitude`, `longitude`, `status`, `licence_type`, `licence_date`, `first_seen`, `last_seen`, `source_id`, `source_ref`, `is_synthetic` | Only populate when a lawful source exists; supports OSM/manual data |
| `competitor_observations` | Manual/field observations | `id` PK, `business_id` FK, `observed_at`, `rating`, `reviews`, `price_tier`, `distance_km`, `occupancy_note`, `source_id` | Ratings/reviews are not public; collect manually or omit |
| `data_sources` | Source register | `id` PK, `name`, `url`, `publisher`, `licence`, `granularity`, `retrieved_at`, `notes`, `reliability` | Required for provenance and viva defence |
| `ingestion_runs` | ETL audit log | `id` PK, `source_id` FK, `started_at`, `finished_at`, `status`, `rows_in`, `rows_out`, `error` | Makes data failures visible |
| `risk_assessments` | Optional saved risk scenarios | `id` PK, `category_id`, `locality_id`, `investment`, `monthly_rent`, `monthly_opex`, `score`, `band`, `factors_json`, `created_at` | Only if server-side saving is required |
| `feasibility_scenarios` | Saved financial scenarios | `id` PK, `category_id`, `locality_id`, `scenario`, `inputs_json`, `result_json`, `created_at`, `client_token` | Replaces/augments localStorage |
| `market_briefs` | Optional cache | `id` PK, `category_id`, `locality_id`, `brief_json`, `generated_at`, `model_version` | Cache deterministic briefs; no LLM required |

### 8.2 Relationships and constraints

- `locality_category_metrics` many-to-one `localities`, many-to-one `categories`, many-to-one `data_sources`.
- `businesses` many-to-one `categories`/`localities`; optional one-to-many `competitor_observations`.
- `monthly_activity` and `yearly_trends` many-to-one `data_sources`.
- Use foreign keys and `PRAGMA foreign_keys=ON`.
- Check constraints: non-negative counts, `growth_pct` within a sane range, `competition_index`/`opportunity_index` between 0 and 100, `band` in a fixed set.
- Indexes: `(locality_id, category_id)`, `(category_id)`, `(month)`, `(year)`, `businesses(locality_id, category_id)`, `businesses(status)`.
- Add a `scope` column (`city`, `circle`, `ward`, `locality`) to any aggregate table to prevent mixing geographies.

### 8.3 Provenance rules

Every fact row should answer:

1. Where did it come from? `source_id`
2. When was it true? `as_of_date`
3. Is it observed or estimated? `is_estimated`
4. How confident are we? `confidence` or a documented qualitative flag.
5. Is it synthetic demo data? `is_synthetic`.

This is the single most important schema decision. Without it, the project will repeat the current problem of mixing invented data with real-world claims.

### 8.4 Views

- `v_locality_category_latest`: latest metrics per locality/category.
- `v_monthly_series`: city-wide and locality monthly series with source labels.
- `v_business_counts`: counts by locality/category/status for competitor and explorer endpoints.
- `v_data_quality`: latest ingestion status and rows missing provenance.

---

## 9. Data Source Availability and Limitations

### 9.1 Verification log

| Source | URL | Verification result | Status |
|---|---|---|---|
| GHMC EODB Trade License Dashboard | `https://www.ghmc.gov.in/EODBReport.aspx` | Direct fetch succeeded. Shows 238,373 applications received since 1 Aug 2022, all approved, average fee ₹5,026.87, and an application table with TIN, dates, and fee fields. Export Excel link present. Last update on page: 29-10-2026. | Verified |
| GHMC circle-wise trade status | `https://eodb.ghmc.gov.in/CircleWiseTradeStatus.aspx` | Verified via search index: 30 circles, total 364,513, approved/rejected and officer-stage counts, Excel export. Not directly fetched in this audit. | Partially verified |
| GHMC circle-wise trade search | `https://eodb.ghmc.gov.in/Certificatesearch.aspx` | Verified via search index: 60 circles, trade type (5 broad groups), financial year, TIN, title, new/renewal search fields. No bulk export observed. | Partially verified |
| CDMA trade licence dashboard | `https://cdma.cgg.gov.in/CDMA_TRADE/Reports/TL_DASHBOARD_RPT_Level3?ULBOBJID=...` | Verified via search index: ULB-specific application rows with TIN, trade title, door number, locality; some reports expose Excel/PDF/Print. ULBOBJID=1042 appears to show Nalgonda, not Hyderabad. | Partially verified |
| Telangana DES Business Register | `https://ecostat.telangana.gov.in/business_register.html` | Direct site fetch returned a transport error; search index shows methodology, 7 registering Acts, 32-column format, 16-digit location code, 16-digit BR code, NIC-2008 codes, and district totals (Hyderabad 71,230 establishments, as of 31-3-2012). | Data exists; access unverified |
| Telangana Open Data portal | `https://data.telangana.gov.in/` | Search index shows 6,937 resources, 2,285 high-value resources, 312 datasets in search; featured RTA, weather, TG-iPASS. A labour dataset with district-level establishment counts exists. No GHMC trade-licence dataset surfaced. | Verified for portal; dataset not found |
| OpenCity monthly trade licences | `https://data.opencity.in/dataset/hyderabad-monthly-trade-licenses-data` | Metadata verified via search index: two CSV resources, circle-wise monthly counts for 2022 and 2023, source `data.telangana.gov.in`, public domain, last updated 27 Nov 2025. Direct dataset page, API, and CSV fetch returned HTTP 403 in this environment. | Metadata verified; download unverified |
| OpenCity Census 2011 | `https://data.opencity.in/dataset/hyderabad-census-2011-data` | Metadata verified: ward-level CSV/XLSX, fields include ward, households, population, SC/ST, literacy, workers; public domain; source `data.telangana.gov.in`; last updated Feb 2026. Direct CSV fetch returned 403. | Metadata verified; download unverified |
| Census India 2011 | `https://censusindia.gov.in/nada/index.php/catalog/6727` | Catalog entry verified via search index: PCA at town/village/ward level for Hyderabad, XLSX download. Direct site fetch earlier returned a transport error. | Data exists; access unverified |
| OpenStreetMap | `https://www.openstreetmap.org/` | Direct fetch succeeded. Overpass API interpreter returned HTTP 406 and an alternate endpoint timed out from this environment. Ohsome API docs fetched successfully (v2.1.1; free API key required; statistics/extraction endpoints). | OSM verified; query access unverified |
| Google Trends | `https://trends.google.com/` | Web UI fetched; no official public API verified. | UI verified; API unverified |
| Telangana Labour procedure | `https://labour.telangana.gov.in/ProcedureChecklist.do` | Search index shows Shops & Establishments registration procedure, Form I, and fee structure. No public register download found. | Process info verified; data not available |

### 9.2 Feasibility scorecard

| Capability | Best available source | Status | Why |
|---|---|---|---|
| Trade-licence application volumes and fees | GHMC EODB dashboard | **READY** | Public dashboard with totals and exportable table, but no category/locality fields |
| Circle-level application/approval counts | GHMC circle dashboard | **READY** | 30-circle operational counts with Excel export |
| Locality-level business names and broad trade type | GHMC/CDMA search dashboards | **REQUIRES DATA COLLECTION** | Search/paginated dashboards, no bulk export; automation and reuse terms unverified; trade title is free text |
| Monthly trade-licence counts by circle | OpenCity CSVs (2022–2023) | **READY (metadata)** | Public-domain CKAN resources; direct download blocked in this environment (403), must confirm manually |
| Active/inactive/closed business status | None | **NOT CURRENTLY FEASIBLE** | No public closure register; OSM disappearance is not proof of closure |
| Category-level business counts by locality | No single source | **FEASIBLE WITH ALTERNATIVE DATA** | Combine GHMC/CDMA counts, OSM POIs, and manual classification; approximate |
| Ward demographics | Census 2011 / OpenCity | **READY** | Ward-level population, households, literacy, workers; 2011 vintage |
| Competitor locations / POIs | OSM / Overpass / ohsome | **FEASIBLE WITH ALTERNATIVE DATA** | POIs with names/categories, subject to completeness and ODbL; no revenue/share/ratings |
| Ratings, reviews, price tiers | Google/other platforms | **NOT CURRENTLY FEASIBLE** | No legitimate free bulk source; licensing/cost/ToS barriers |
| Rent levels | None public | **REQUIRES DATA COLLECTION** | No public locality rent series; listing data has quality and ToS issues |
| Footfall | None public | **NOT CURRENTLY FEASIBLE** | No public locality-level footfall dataset; transit/POI proxies are weak |
| Search demand | Google Trends | **FEASIBLE WITH ALTERNATIVE DATA** | Relative search interest, not business counts or sales |
| Business register establishment counts | DES Business Register | **REQUIRES DATA COLLECTION** | District totals from 2012; establishment-level data not publicly downloadable |
| Store openings/closures from OSM history | ohsome API | **REQUIRES DATA COLLECTION** | Historical edits exist, but appearance ≠ opening and disappearance ≠ closure |
| Category taxonomy mapping | NIC-2008, GHMC trade types, OSM tags | **REQUIRES DATA COLLECTION** | Manual crosswalk across 12 app categories, 5 GHMC types, NIC codes, OSM tags |

### 9.3 Hard limitations that shape the product

- **No public dataset combines business name, category, locality, status, and closure date.** This is the central constraint.
- **GHMC's public application table has no trade category or locality columns.** The circle search pages expose trade type and locality, but only interactively.
- **OpenCity's trade-licence series is aggregate monthly counts by circle for 2022–2023 only.** It cannot produce an eight-year trend or competitor-level analytics.
- **Census data is from 2011 and uses ward boundaries that may not match current localities.** Any join is an approximation.
- **OSM completeness varies by neighbourhood and category.** A missing café is not evidence of no café; a new node is not necessarily a new business.
- **Rent, footfall, ratings, revenue, and market share are not publicly available.** Any UI that shows them must label them as estimates or remove them.
- **Licensing must be checked before ingestion.** GHMC pages show no explicit open licence; OpenCity labels its data public domain; OSM is ODbL with attribution/share-alike obligations; Census has Government of India terms; Google Trends has usage restrictions.
- **Privacy:** CDMA/GHMC search pages can expose owner names and addresses. Do not ingest personal data without a lawful basis; store business-level fields only.

### 9.4 What can be truthfully claimed after ingestion

- "This dashboard combines GHMC trade-licence application counts, Census 2011 ward demographics, and OSM POI counts."
- "Counts are observed where sourced; opportunity, risk, and suitability scores are model estimates."
- "Closure figures are not observed; they are estimates or unavailable."
- "Competitor ratings and market shares are not available and are therefore omitted."

---

## 10. Data Science and ML Feasibility

### 10.1 Current state

The project contains **no ML**. `src/lib/analytics.ts` is a deterministic rule-and-template engine with seeded pseudo-random variation. The `hashString`/`seededRandom` utilities make outputs stable, which is good for demos but does not make them predictive or data-derived.

### 10.2 Capability scorecard

| Capability | Status | Recommended method | Data requirement | Evaluation |
|---|---|---|---|---|
| Descriptive dashboards | **READY** | Aggregation, shares, growth rates | Clean aggregate tables | Reconcile totals; source labels |
| Market snapshot indices | **FEASIBLE WITH ALTERNATIVE DATA** | Weighted index from POI density, licence counts, demographics | Locality/category counts + denominators | Sensitivity analysis; compare with manual audit |
| Trend forecasting | **FEASIBLE WITH ALTERNATIVE DATA** | Seasonal naive baseline, linear trend, ARIMA/SARIMA | ≥24–36 monthly points at consistent scope | Rolling-origin MAE/RMSE vs. baseline |
| Risk scoring | **READY as a heuristic** | Weighted rule-based index | Cost inputs + market indicators | Scenario testing; expert review; later logistic calibration |
| Competitor concentration (HHI) | **FEASIBLE WITH ALTERNATIVE DATA** | HHI on outlet counts, not revenue shares | Complete business counts by category/locality | State that it is outlet concentration, not market share |
| Location suitability ranking | **READY as a heuristic** | Weighted index; later learning-to-rank | Features + preference weights | Rank stability and sensitivity |
| Rent prediction | **REQUIRES DATA COLLECTION** | Regression on listing data | Lawful rent observations | Temporal holdout; report uncertainty |
| Footfall/demand prediction | **NOT CURRENTLY FEASIBLE** | — | Footfall/sales/transaction data | No ground truth |
| Closure/survival prediction | **NOT CURRENTLY FEASIBLE** | Logistic regression / survival model | Labelled closures and business features | No reliable labels |
| Customer segmentation | **NOT CURRENTLY FEASIBLE** | Clustering | Customer-level data | No customer data |
| Review sentiment | **NOT CURRENTLY FEASIBLE** | NLP | Licensed review corpus | No lawful corpus |
| "AI assistant" | **READY as retrieval/templates** | Intent routing over database facts | Structured metrics + brief templates | Answer accuracy tests; no LLM needed |

### 10.3 Recommended student-level sequence

1. **Baseline forecasting:** seasonal naive (same month last year) and linear regression on monthly registrations. Report MAE/RMSE with a time-based split. With fewer than 24 points, do not present a forecast as reliable.
2. **Descriptive clustering:** KMeans on standardised locality features (demographics, POI density, rent proxy, activity) to group localities. Label clusters, do not claim causal insight.
3. **Risk calibration (later):** if labelled outcomes exist, logistic regression with a small feature set. Otherwise keep the transparent weighted index.
4. **Outlier/anomaly detection:** simple z-scores or IQR on monthly registrations; useful for data-quality alerts.
5. **Avoid:** deep learning, LLMs for factual answers, synthetic data training, and any claim of predictive accuracy without a holdout.

### 10.4 Data thresholds and evaluation rules

- **Forecasting:** at least 24 months, preferably 36+, with a fixed geographic scope and consistent definitions. Use rolling-origin cross-validation and compare against a naive baseline.
- **Classification/survival:** at least 100–200 labelled outcomes; otherwise report descriptive patterns only.
- **HHI:** requires complete outlet counts and a defined market; if only a sample is available, call it a sample concentration index.
- **Uncertainty:** show ranges or qualitative confidence. Do not present a single "92% confidence" number without a statistical basis.
- **Leakage:** do not use future data to compute current features; do not train on the same synthetic data used for the demo.
- **Reproducibility:** pin random seeds, log dataset versions, and store ETL outputs.

### 10.5 Tooling

- Pandas/NumPy for ETL and feature building.
- scikit-learn for linear/ridge regression, KMeans, logistic regression, and preprocessing.
- statsmodels for ARIMA/SARIMA if needed.
- Matplotlib/Plotly for notebooks, EDA, and report figures; the product UI can keep Recharts.
- No production ML service in v1; run training scripts offline and store predictions/results in SQLite.

---

## 11. Frontend-to-Backend Integration Mapping

### 11.1 Page-to-endpoint map

| Frontend need | Current source | Proposed endpoint | Database tables | Notes |
|---|---|---|---|---|
| Category list | `categories.ts` | `GET /api/v1/meta/categories` | `categories` | Include taxonomy mappings |
| Locality list | `localities.ts` | `GET /api/v1/meta/localities` | `localities` | Include lat/lon, zone, ward |
| Dashboard KPIs and charts | `dashboard.ts` + snapshot | `GET /api/v1/dashboard?category_id&locality_id&range` | `monthly_activity`, `locality_category_metrics`, `insights` | Return scope and source labels |
| Market Explorer list | `localities.map(getMarketSnapshot)` | `GET /api/v1/market/snapshots?category_id` | `locality_category_metrics` | Precompute; return all 16 |
| Selected locality detail | same | `GET /api/v1/market/snapshot?category_id&locality_id` | same | Cacheable |
| Competitor table | `getCompetitors()` | `GET /api/v1/competitors?category_id&locality_id` | `businesses`, `competitor_observations` | Return `is_estimated`; omit unavailable fields |
| Category mix | `getLocalityCategoryBreakdown()` | `GET /api/v1/localities/{id}/category-mix` | `locality_category_metrics` | Include counts and shares |
| Market Trends | `trends.ts` | `GET /api/v1/trends?category_id` | `monthly_activity`, `yearly_trends`, category series | Do not invent 2018–2025 if unavailable |
| Risk calculation | `calculateRisk()` | `POST /api/v1/risk` | `locality_category_metrics`, optional `risk_assessments` | Validate money inputs |
| Location comparison | `getComparisonMetrics()` | `GET /api/v1/compare?category_id&ids=...` | `locality_category_metrics` | Limit to 2–4 IDs |
| Feasibility | `calculateFeasibility()` | `POST /api/v1/feasibility` | optional `feasibility_scenarios` | Can remain client-side initially |
| Saved scenario | localStorage | `POST /api/v1/scenarios` | `feasibility_scenarios` | Needs user/session identity; optional |
| Assistant | `answerMarketQuestion()` | `POST /api/v1/assistant/query` | metrics + brief templates | Rule-based retrieval; label as such |
| Market brief | `buildMarketBrief()` | `GET /api/v1/brief?category_id&locality_id` | metrics, competitors | Include provenance and limitations |
| Landing preview | module-scope mock | `GET /api/v1/preview` or keep static | metrics | Keep static if no API on public page |
| Exports | Clipboard | `GET /api/v1/exports/...csv` | relevant tables | Optional; server CSV is more reliable |

### 11.2 Example contracts

```json
GET /api/v1/market/snapshot?category_id=cafes&locality_id=banjara-hills
{
  "category": {"id": "cafes", "name": "Cafés & Coffee"},
  "locality": {"id": "banjara-hills", "name": "Banjara Hills", "zone": "Central"},
  "as_of": "2025-11-30",
  "presence": 520,
  "nearby": 41,
  "density": 3.3,
  "competition": 72,
  "opportunity": 54,
  "growth": 8.7,
  "rent_benchmark": 50400,
  "source": "model_estimate",
  "is_estimated": true,
  "confidence": "medium"
}
```

```json
POST /api/v1/risk
{
  "category_id": "cafes",
  "locality_id": "banjara-hills",
  "investment": 1200000,
  "monthly_rent": 45000,
  "monthly_opex": 155000
}
{
  "score": 58,
  "band": "Elevated",
  "factors": [
    {"key": "competition", "score": 72, "weight": 0.32},
    {"key": "market", "score": 50, "weight": 0.20},
    {"key": "financial", "score": 55, "weight": 0.28},
    {"key": "location", "score": 35, "weight": 0.20}
  ],
  "is_estimated": true,
  "method_version": "risk-v1"
}
```

```json
GET /api/v1/trends?category_id=cafes
{
  "scope": "city",
  "series": [
    {"month": "2022-01", "registrations": 812, "closures": null, "source": "opencity_ghmc"}
  ],
  "notes": ["Closures are unavailable; 2022–2023 coverage only."]
}
```

### 11.3 Frontend adapter plan

1. Add `src/lib/api.ts` with a typed `request<T>()` helper and base URL from `VITE_API_BASE_URL`.
2. Add domain hooks such as `useCategories()`, `useLocalities()`, `useSnapshot()`, and `useCompetitors()`; use `AbortController` and explicit loading/error/empty states.
3. Keep the current data modules as a **demo fallback** controlled by `VITE_DATA_MODE=mock|api`. Do not silently fall back from a failed API to mock data in production; show an error and a clearly labelled demo badge.
4. Migrate one page at a time, starting with Dashboard or Market Explorer. Keep the feasibility calculator client-side for instant feedback, but align it with the server formula.
5. Replace clipboard-only exports with server CSV downloads where reliability matters.
6. Add URL query parameters for category, locality, comparison IDs, and filters so views are shareable.
7. Remove or relabel fabricated UI claims (sync time, coverage, notifications, "AI confidence", competitor ratings/shares) before connecting real data.

---

## 12. Development Roadmap

Assumption: one student working part-time over roughly 10 weeks. The plan prioritises a truthful, demonstrable system over feature breadth.

| Phase | Time | Deliverables | Exit criteria |
|---|---|---|---|
| 0. Foundations | Week 1 | Source register, metric dictionary, taxonomy crosswalk, SQLite schema, FastAPI skeleton, seed CSVs | `uvicorn` runs; `/api/v1/meta/categories` and `/localities` return seeded data; source register lists ≥8 sources with licence/status |
| 1. Read API and seed data | Weeks 2–3 | SQLAlchemy models, seed script, meta/dashboard/snapshot endpoints, pytest smoke tests, frontend API adapter with demo mode | Dashboard and Explorer read from API; loading/error states; totals reconcile |
| 2. Real aggregate ingestion | Weeks 4–5 | OpenCity trade-licence CSVs, Census 2011 ward data, OSM POI extract, ETL validation reports | At least one real series and one real denominator in the database; provenance visible |
| 3. Honest competitor and locality analytics | Weeks 6–7 | Competitor counts from OSM/manual observations, outlet-concentration metric, calibrated snapshot formulas, source labels in UI | No fabricated ratings/shares; every estimate labelled; competitor page works with available fields |
| 4. Risk, feasibility, assistant | Week 7–8 | Server-side risk/feasibility endpoints aligned with client; rule-based assistant over real metrics; brief with limitations | Formulas tested; answers cite data and admit missing fields; no fake confidence |
| 5. Trends and baseline forecast | Week 8–9 | Real monthly series where available; seasonal-naive/linear baseline; backtest report | Forecast beats or matches naive baseline; uncertainty and coverage shown |
| 6. Hardening and deployment | Week 9–10 | Tests, accessibility pass, error handling, docs, demo script, deployment | `pytest` green; SPA + API deploy; demo runs without manual fixes |

### MVP boundary

**MVP:** 12 categories, 16 localities, real aggregate data where available, read API, Dashboard/Explorer/Trends wired, risk/feasibility calculators, rule-based assistant, explicit provenance, demo fallback clearly labelled.

**Later:** business-level competitor observations, saved scenarios with accounts, OSM history, forecasting, admin import UI.

**Do not build in v1:** LLM chat, deep learning, revenue-share HHI, scraped reviews, real-time sync, multi-city support.

---

## 13. Major Risks and Missing Requirements

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Fabricated data presented as real | Loss of credibility; ethically problematic demo | High | Label every estimate; add provenance; remove unsupported specifics |
| No backend | Cannot persist, ingest, or scale | Certain | FastAPI + SQLite read layer |
| No real closure/active data | Trend and risk claims are unverifiable | High | Remove closure claims or mark as unavailable/estimated |
| No category+locality bulk data | Competitor and explorer pages remain synthetic | High | Use OSM/manual counts; label as outlet estimates |
| Fake HHI and shares | Invalid concentration conclusions | Certain | Compute outlet-count concentration only; never call it market share |
| Fake AI confidence | Overstates certainty | High | Replace with qualitative confidence or remove |
| Locality boundary mismatch | Joins between 16 localities, 30/60 circles, 145 wards are approximate | High | Build and document a crosswalk; show mapping caveats |
| Category taxonomy mismatch | 12 app categories vs. 5 GHMC types vs. NIC/OSM tags | High | Publish a mapping table; keep an "other" bucket |
| Rent/footfall/ratings unavailable | Core feasibility inputs are guesses | High | Require user inputs; label benchmarks as estimates; collect manually |
| Data licensing/privacy | Legal/reputational risk; personal data exposure | Medium | Source register with licences; no owner names/PII; attribution |
| Internal KPI inconsistency | Evaluators will notice | Certain | Reconcile monthly vs. annual series; define scope |
| No tests or CI | Regressions; hard to defend | High | pytest + frontend smoke tests; simple CI |
| No auth or server persistence | Scenarios are browser-only | Medium | Optional accounts or export/import JSON |
| BrowserRouter deployment | Deep links 404 on static hosts | Medium | Configure SPA fallback |
| Overprecision in UI | False trust | High | Round estimates; show ranges; use "estimated" badges |

### Missing requirements checklist

- Data provenance and freshness indicators.
- Real data ingestion and validation.
- Backend API and database.
- Server-side or portable saved scenarios.
- Authentication/authorisation if multi-user.
- Error, loading, and empty states for API data.
- URL state for shareable analyses.
- Export reliability beyond clipboard.
- Accessibility and reduced-motion checks.
- Tests, CI, and deployment documentation.
- A clear data limitations page for evaluators/users.

### Must relabel or remove before demo

- "AI" claims; call it a rule-based decision assistant.
- Competitor ratings, reviews, establishment years, distances, and market shares unless replaced by observed data.
- HHI as "market concentration"; it is currently a synthetic sample index.
- "Synced 4 min ago", "86% coverage", and notifications unless backed by real jobs.
- "Confidence 92%" unless a statistical model produces it.
- Insight claims such as "12 outlets per 10,000 residents", "rents softened 4.2%", and "six outlets exited" that have no underlying data.

---

## 14. Recommended First Implementation Step

**Do not start with ML.** Start by making the data foundation honest and machine-readable.

### Step 1: Create the data source register and canonical seed schema

Create these files (do not hardcode data in React anymore):

1. `docs/data_source_register.csv` — one row per source with `name, publisher, url, licence, granularity, fields, coverage, retrieved_at, status, notes`.
2. `docs/metric_dictionary.md` — definitions for registrations, closures, active, competition, opportunity, rent index, footfall, HHI, risk score, feasibility score, and confidence.
3. `data/seed/categories.csv` — 12 categories with IDs matching the frontend.
4. `data/seed/localities.csv` — 16 localities with IDs, zone, latitude/longitude, and optional ward codes.
5. `data/seed/locality_category_metrics.csv` — current demo values with `source='demo'`, `is_synthetic=1`, `as_of` and `notes`.

### Step 2: Stand up the smallest possible backend

- FastAPI app with `GET /api/v1/meta/categories` and `GET /api/v1/meta/localities`.
- SQLite database seeded from the CSVs.
- `/docs` enabled; CORS for the Vite dev server.
- One pytest smoke test asserting 12 categories and 16 localities.

### Why this first

- It forces every number to have a source or an explicit synthetic label.
- It unblocks the API contract and frontend integration without touching the UI.
- It prevents the team from building ML on top of fabricated data.
- It creates the evidence needed for the viva: what is real, what is estimated, and why.

### Acceptance criteria

- `uvicorn app.main:app --reload` starts successfully.
- `GET /api/v1/meta/categories` returns all 12 categories from SQLite.
- `GET /api/v1/meta/localities` returns all 16 localities from SQLite.
- The source register lists at least GHMC, OpenCity trade licences, Census 2011, OSM, and Google Trends with licence/status notes.
- Every seed row has `source`, `as_of`, and `is_synthetic`.
- The existing frontend still runs unchanged in mock mode.

---

## Final Assessment

**What is complete**
- A visually strong, responsive, nine-route React/TypeScript prototype with a coherent design system and reusable components.
- Working navigation, global context, command palette, filters, sorting, risk/feasibility calculators, scenario saving, clipboard exports, and a rule-based assistant.
- Clean typecheck; lint warnings only; internally consistent demo totals across categories, localities, and dashboard KPIs.

**What works visually**
- The layout, typography, colour system, cards, charts, gauges, and motion are well executed by code inspection.
- The landing page and workspace feel like a real product rather than a student CRUD app.
- No browser screenshot/E2E validation was performed in this audit, so visual claims are source-based.

**What works functionally**
- All interactions are real frontend interactions, but they operate on hardcoded or generated data.
- The risk and feasibility calculators are transparent arithmetic and are the most defensible functional pieces.
- The assistant is deterministic, not AI; the competitor table and HHI are synthetic.

**What is missing**
- Backend, database, API layer, real ingestion, ETL, provenance, tests, auth, deployment hardening, and data limitations documentation.
- A truthful treatment of closures, rents, footfall, ratings, reviews, and market shares.
- Reconciliation between the monthly registration series and the annual trend series.

**What is realistically achievable**
- A credible aggregate-level market intelligence tool for Hyderabad using GHMC application counts, OpenCity 2022–2023 circle data, Census 2011 ward demographics, and OSM POIs.
- Transparent heuristic risk/suitability scores and a rule-based assistant grounded in those indicators.
- Baseline forecasting and descriptive clustering, with strict caveats.

**What is not realistically achievable now**
- Business-level competitor intelligence with ratings, reviews, and revenue shares.
- Reliable closure/survival prediction or sales forecasting.
- A true LLM analyst without a verified data corpus and a clear evaluation plan.
- Real-time rent or footfall data at locality level from public sources.

**What to build first**
- The verified data register, canonical seed CSVs, SQLite schema, and FastAPI meta endpoints. Everything else should wait until the project can distinguish observed data from estimates.
