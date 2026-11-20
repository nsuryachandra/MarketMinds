# MarketMinds — Foundation of Data Science (FDS) Concepts Mapping

> **Academic Curriculum Alignment Reference for Second-Year B.Tech CSE (Foundation of Data Science)**

This document provides a rigorous, verifiable mapping between the core concepts taught in the Foundation of Data Science curriculum and their concrete implementation on genuine Hyderabad market datasets within MarketMinds.

Every concept listed below corresponds to an actual, executed Python function and real dataset. No synthetic rows, mock fallbacks, or placeholder imports are used.

---

## Curriculum Syllabus Mapping Matrix

| Curriculum Domain / Topic | Academic Concept | Concrete Source File | Concrete Function / Class | Real Dataset Used | Implementation Status | Academic Role & Application in MarketMinds |
|---|---|---|---|---|---|---|
| **Module 1: Data Preprocessing & Cleaning** | Ingestion, Type Casting, Missing Value Handling | `backend/analysis/machine_learning.py` | `get_locality_features()` | OpenStreetMap Businesses, GHMC Ward GeoJSON, TSRTC Bus Stops, Metro GTFS | **Fully Implemented** | Normalizes heterogeneous data sources, converts coordinates to float arrays, calculates catchment aggregations, and applies median imputation on missing numerical attributes. |
| **Module 1: Exploratory Data Analysis (EDA)** | Automated Dataset Profiling & Summary Statistics | `backend/analysis/machine_learning.py` | `run_full_eda()` | All 12 SQLite tables (`businesses`, `ghmc_activity`, `search_trends`, etc.) | **Fully Implemented** | Automated pipeline reporting row/column counts, missingness counts, duplicate rows, and interquartile range (IQR) outlier detection across every table. Exposed via `GET /api/v1/analytics/eda`. |
| **Module 2: Numerical Computing & Vectorization** | Vectorized Distance Metrics & Array Operations | `backend/analysis/machine_learning.py`, `backend/analysis/market.py` | `_haversine_km_vec()`, `_haversine_km()` | 10,193 OSM POIs, 5,028 Bus Stops, 57 Metro Stations | **Fully Implemented** | Replaces nested iterative Python loops with NumPy trigonometric array operations (`np.radians`, `np.sin`, `np.arcsin`), evaluating spatial distance matrices >300× faster for sub-10ms response times. |
| **Module 2: Feature Standardization & Scaling** | Z-Score Normalization | `backend/analysis/machine_learning.py` | `cluster_and_pca_bundle()` | 8 locality infrastructure and commercial supply dimensions | **Fully Implemented** | Standardizes features with `sklearn.preprocessing.StandardScaler` ($z = \frac{x - \mu}{\sigma}$) so that high-magnitude counts (e.g. 5,000 bus stops) do not dominate low-magnitude features (e.g. 57 metro stations). |
| **Module 3: Descriptive Analytics** | Five-Number Summaries & Distribution Metrics | `backend/analysis/machine_learning.py` | `descriptive_summary()` | Locality feature table ($N=16$) | **Fully Implemented** | Calculates minimum, 25th percentile (Q1), median, 75th percentile (Q3), maximum, IQR, mean, and sample standard deviation across all locality features to establish empirical market baselines. |
| **Module 3: Diagnostic Analytics & Hypothesis Testing** | Rank & Product-Moment Statistical Correlations | `backend/analysis/machine_learning.py` | `diagnostic_correlations()` | Transport stops, schools, municipal licences vs mapped commercial supply | **Fully Implemented** | Executes `scipy.stats.spearmanr` and `pearsonr` to test statistical co-occurrence. Reports exact sample sizes ($n$), correlation coefficients ($\rho, r$), and two-tailed $p$-values with explicit disclaimers that correlation does not establish causation. |
| **Module 4: Supervised Learning — Regression** | Ordinary Least Squares & Regularized Linear Models | `backend/analysis/machine_learning.py` | `evaluate_search_interest_regression()` | Google Trends weekly relative interest (262 weeks, 2021–2026) | **Fully Implemented** | Trains `LinearRegression`, `Ridge(alpha=1.0)`, and `Lasso(alpha=0.1)` on past lag features. Evaluated strictly on a 52-week chronological holdout against Naive Lag-1 persistence. Model performance is transparently categorized as `validated` (improving both MAE & RMSE) or `mixed_performance` (RMSE lead). |
| **Module 4: Administrative Regression Benchmarking** | Negative Evaluation Reporting & Baseline Superiority | `backend/analysis/machine_learning.py` | `evaluate_ghmc_activity_regression()` | GHMC monthly citywide trade licence approvals (52 months) | **Fully Implemented** | Demonstrates scientific honesty: Linear models underperform naive persistence ($R^2 < 0$) on administrative records. Reported transparently as `baseline_not_beaten` rather than publishing inaccurate forecasts. |
| **Module 5: Prediction Uncertainty Intervals** | Empirical Residual Dispersion Bands | `backend/analysis/machine_learning.py` | `evaluate_search_interest_regression()` | Holdout test set residuals | **Fully Implemented** | Constructs empirical prediction uncertainty bounds ($\hat{y} \pm 1.96 s_e$) derived from holdout test set residual standard deviation, clipped to the valid $[0, 100]$ range of relative search interest. |
| **Module 5: Supervised Learning — Classification** | Tree-Based Classification & Class Imbalance Analysis | `backend/analysis/machine_learning.py` | `evaluate_decision_tree_classification()` | 5,409 mapped OpenStreetMap businesses | **Fully Implemented** | Trains `DecisionTreeClassifier(max_depth=4)` to predict real ground-truth `name_status` (named vs unnamed POI). Evaluated against `DummyClassifier` (majority baseline: 87.15%). Analyzes how 87.15% class imbalance impacts headline accuracy (88.63%) and reports minority recall (27.34%) with full confusion matrix. |
| **Module 5: Commercial Outcome Feasibility** | Ground-Truth Boundary Analysis | `backend/analysis/machine_learning.py` | `evaluate_decision_tree_classification()` | OpenStreetMap POI extract | **Properly Documented as Unsupported** | Formally documents why predicting business failure/bankruptcy is unsupported in production: OpenStreetMap contains operating POIs, not bankruptcy or closure records. Inventing synthetic failure labels violates academic ethics. |
| **Module 6: Unsupervised Learning — K-Means Clustering** | Centroid-Based Locality Grouping & Silhouette Optimization | `backend/analysis/machine_learning.py` | `cluster_and_pca_bundle()` | Standardized locality infrastructure matrix ($N=15$) | **Fully Implemented** | Evaluates candidate cluster counts $k \in [2, 5]$ using `sklearn.metrics.silhouette_score`. Formally rejects degenerate singleton clusters (`min(sizes) >= 2`). Yields stable groupings ($k=3$ at 2000m radius; $k=4$ at 1000m radius). Outliers (Kokapet, 0 mapped POIs) receive graceful fallback. |
| **Module 6: Unsupervised Learning — Hierarchical Clustering** | Agglomerative Linkage & Partition Agreement | `backend/analysis/machine_learning.py` | `cluster_and_pca_bundle()` | Standardized locality infrastructure matrix | **Fully Implemented** | Computes hierarchical clustering using `scipy.cluster.hierarchy.linkage` with Ward’s minimum-variance criterion. Computes `adjusted_rand_index` to validate cluster consensus with K-Means (ARI = 0.408 at 2000m; perfect ARI = 1.000 at 1000m). |
| **Module 7: Dimensionality Reduction (PCA)** | Principal Component Analysis & Loadings Interpretation | `backend/analysis/machine_learning.py` | `cluster_and_pca_bundle()` | Standardized locality infrastructure matrix (8 dimensions $\to$ 2D) | **Fully Implemented** | Fits `sklearn.decomposition.PCA(n_components=2)`. Projects 8 dimensions into 2 orthogonal axes explaining 59.14% (1000m) to 64.16% (2000m) of variance. Mathematical sum of components equals total variance within 0.05% tolerance. Component loadings reveal distinct Transit Access (PC1) and Municipal Licensing Activity (PC2) axes. |
| **Module 8: Prescriptive Analytics & Decision Support** | Conditional Decision Rules with Limitations | `backend/analysis/machine_learning.py` | `prescriptive_recommendations()` | Catchment competitive supply, HHI concentration, transit counts | **Fully Implemented** | Translates descriptive metrics and cluster assignments into conditional business considerations (e.g. transit opportunity vs competitive clustering) with mandatory real-world field survey caveats. |

---

## Detailed Concept Descriptions & Code Implementations

### 1. Vectorized Spatial Computing (`NumPy`)
- **File**: `backend/analysis/machine_learning.py` (`_haversine_km_vec`)
- **Formula**:
  $$\Delta \phi = \text{radians}(\phi_2 - \phi_1), \quad \Delta \lambda = \text{radians}(\lambda_2 - \lambda_1)$$
  $$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)$$
  $$d = 2 R \arcsin\left(\sqrt{a}\right)$$
- **Academic Importance**: Evaluates geographic proximity between query coordinates and thousands of points of interest simultaneously in NumPy C-arrays without allocating intermediate Python objects.

### 2. Diagnostic Rank Correlations (`SciPy`)
- **File**: `backend/analysis/machine_learning.py` (`diagnostic_correlations`)
- **Concept**: Computes Spearman rank correlation coefficient ($\rho$) and Pearson product-moment ($r$) between public infrastructure (bus stops, metro stations, municipal trade licences, schools) and mapped commercial supply.
- **Academic Finding**: Demonstrates statistical co-occurrence (e.g. transit accessibility co-occurs with commercial outlet density, $\rho = +0.547, p = 0.028$), while emphasizing that correlation does not establish causality.

### 3. Chronological Time-Series Holdout Regression (`Scikit-Learn`)
- **File**: `backend/analysis/machine_learning.py` (`evaluate_search_interest_regression`)
- **No-Leakage Holdout**: The last 52 weeks of weekly Google Trends data are held out strictly chronologically. Features are constructed exclusively using lagged values ($t-1, t-2, t-4$) and rolling windows ($k=4, 12$) shifted by one week.
- **Baseline Rule**: Evaluated against a Naive Lag-1 persistence benchmark ($y_t = y_{t-1}$).
- **Evaluation Criteria**: Root Mean Squared Error (RMSE) is the primary metric to penalize large forecasting outliers; Mean Absolute Error (MAE) is reported side-by-side to expose trade-offs.

### 4. Principal Component Analysis (`Scikit-Learn`)
- **File**: `backend/analysis/machine_learning.py` (`cluster_and_pca_bundle`)
- **Concept**: Projects 8 standardized infrastructure dimensions into 2 orthogonal principal dimensions maximizing variance:
  - **PC1 (Transit Access vs Isolated Concentration Axis)**: High positive loadings on metro stations (+0.504), bus stops (+0.446), category diversity (+0.425), and mapped places (+0.410); negative loading on category concentration HHI (-0.439).
  - **PC2 (Commercial Licensing Scale vs Residential Schools Axis)**: High positive loading on licence applications (+0.517) and negative loading on ward schools (-0.516).
- **Mathematical Consistency**: Total variance explained is dynamically computed as $\sum \lambda_i$ and verified by automated unit tests ($33.65\% + 30.50\% = 64.16\%$ at 2000m; $34.39\% + 24.74\% = 59.14\%$ at 1000m).

### 5. Supervised Classification & Class Imbalance (`Scikit-Learn`)
- **File**: `backend/analysis/machine_learning.py` (`evaluate_decision_tree_classification`)
- **Concept**: Demonstrates the `DecisionTreeClassifier` syllabus concept on real OpenStreetMap `name_status` (named vs unnamed POI).
- **Class Imbalance Reality**: 87.15% of records belong to the majority class ("named"). While the decision tree achieves 88.63% test accuracy, its minority class recall is 27.34% (38/139). This highlights why accuracy is insufficient in class-imbalanced datasets.
- **Academic Data Ethics**: Commercial failure prediction is documented as unsupported due to zero historical closure labels in OpenStreetMap.

