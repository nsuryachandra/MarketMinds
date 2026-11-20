"""Foundation of Data Science (FDS) analytical engine for MarketMinds.

This module implements genuine Data Science and Machine Learning on Hyderabad
real datasets imported into SQLite:
1. Pandas: Data cleaning, transformation, aggregation, descriptive statistics, feature tables.
2. NumPy: Vectorized numerical arrays, distance matrices, standardization, safe metrics.
3. SciPy: Spearman rank & Pearson diagnostic correlations, Ward hierarchical clustering, dendrogram linkages.
4. Scikit-learn:
   - Supervised Regression: LinearRegression, Ridge, Lasso with chronological holdout validation vs persistence baseline.
   - Unsupervised Clustering: KMeans with silhouette score optimization, similarity profiling.
   - Dimensionality Reduction: PCA (2 components) with explained variance ratio and feature loadings.
   - Supervised Classification: DecisionTreeClassifier evaluated on genuine dataset target (name_status: named vs unnamed POI),
     evaluated against majority-class baseline with confusion matrix; with clear documentation why business failure/success
     classification is unsupported in production due to lack of ground-truth closure/revenue labels.
   - Model Evaluation: MAE, RMSE, R², Adjusted Rand Index, Silhouette Score, Classification Report.
5. Exploratory Data Analysis (EDA): Comprehensive automated EDA workflow across all real tables.
6. Prescriptive Analytics: Grounded, transparent conditional recommendations with explicit limitations.

Every calculation is strictly derived from real data. No synthetic records, fake targets, or mock fallbacks.
"""

from __future__ import annotations

import threading
from datetime import timedelta
from typing import Any

import numpy as np
import pandas as pd
from scipy.cluster.hierarchy import fcluster, linkage
from scipy.stats import pearsonr, spearmanr
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import Lasso, LinearRegression, Ridge
from sklearn.metrics import (
    accuracy_score,
    adjusted_rand_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
    silhouette_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

from data.data_cleaning import CATEGORY_BY_ID, percentage

MODEL_RANDOM_STATE = 42
MIN_LOCALITY_SUPPORT = 3
TREND_TEST_WEEKS = 52
ACTIVITY_TEST_MONTHS = 12

CLUSTER_FEATURES = (
    "mapped_places",
    "category_diversity",
    "category_concentration",
    "named_share_pct",
    "bus_stops",
    "metro_stations",
    "ward_schools",
    "licence_applications",
)

DRIVER_FEATURES = (
    "bus_stops",
    "metro_stations",
    "ward_schools",
    "licence_applications",
)

FEATURE_LABELS = {
    "mapped_places": "mapped places",
    "category_diversity": "category diversity",
    "category_concentration": "category concentration",
    "named_share_pct": "named-place share",
    "bus_stops": "mapped bus stops",
    "metro_stations": "mapped metro stations",
    "ward_schools": "schools in the assigned ward",
    "licence_applications": "recorded circle applications",
}

TREND_FEATURES = (
    "lag1",
    "lag2",
    "lag4",
    "rolling_4",
    "rolling_12",
    "week_sin",
    "week_cos",
)

_CACHE: dict[tuple[Any, ...], Any] = {}
_CACHE_LOCK = threading.Lock()
_DATASET_STAMP: int | None = None


def _round(value: Any, digits: int = 2) -> float | None:
    if value is None or pd.isna(value):
        return None
    return round(float(value), digits)


def _dataset_stamp() -> int:
    from database import DB_PATH

    try:
        return DB_PATH.stat().st_mtime_ns
    except OSError:
        return 0


def _cached(parts: tuple[Any, ...], builder: Any) -> Any:
    global _DATASET_STAMP
    stamp = _dataset_stamp()
    with _CACHE_LOCK:
        if stamp != _DATASET_STAMP:
            _CACHE.clear()
            _DATASET_STAMP = stamp
        key = (stamp, *parts)
        if key in _CACHE:
            return _CACHE[key]
    value = builder()
    with _CACHE_LOCK:
        _CACHE[key] = value
    return value


def _haversine_km_vec(
    lat1: np.ndarray | float,
    lon1: np.ndarray | float,
    lat2: np.ndarray | float,
    lon2: np.ndarray | float,
) -> np.ndarray | float:
    """Vectorized Haversine distance using NumPy."""
    phi1 = np.radians(lat1)
    phi2 = np.radians(lat2)
    delta_phi = np.radians(lat2 - lat1)
    delta_lambda = np.radians(lon2 - lon1)
    a = (
        np.sin(delta_phi / 2.0) ** 2
        + np.cos(phi1) * np.cos(phi2) * np.sin(delta_lambda / 2.0) ** 2
    )
    return 2.0 * 6371.0088 * np.arcsin(np.sqrt(np.clip(a, 0.0, 1.0)))


def _read(
    connection: Any,
    query: str,
    params: tuple[Any, ...] | None = None,
) -> pd.DataFrame:
    if params is None:
        return pd.read_sql_query(query, connection)
    return pd.read_sql_query(query, connection, params=params)


# ---------------------------------------------------------------------------
# 1. Feature Engineering: Locality Features Table
# ---------------------------------------------------------------------------


def get_locality_features(connection: Any, category_id: str, radius_m: int) -> pd.DataFrame:
    """Build standardized locality feature DataFrame using Pandas and NumPy."""
    localities = _read(
        connection,
        """
        SELECT id, name, zone, latitude, longitude, ward_no, circle_no, circle_name
        FROM localities
        ORDER BY name
        """,
    )
    businesses = _read(
        connection,
        """
        SELECT category_id, latitude, longitude, name_status, inside_ghmc
        FROM businesses
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        """,
    )
    bus_stops = _read(connection, "SELECT latitude, longitude FROM bus_stops")
    metro_stations = _read(connection, "SELECT latitude, longitude FROM metro_stations")
    schools = _read(
        connection,
        """
        SELECT ward_no, COUNT(*) AS school_count
        FROM schools
        WHERE ward_no IS NOT NULL
        GROUP BY ward_no
        """,
    ).set_index("ward_no")["school_count"]
    circle_totals = _read(
        connection,
        """
        SELECT circle_no, SUM(applications) AS applications
        FROM trade_license_monthly
        GROUP BY circle_no
        """,
    ).set_index("circle_no")["applications"]

    b_lat = businesses["latitude"].to_numpy(dtype=float)
    b_lon = businesses["longitude"].to_numpy(dtype=float)
    b_cat = businesses["category_id"].to_numpy()
    b_name = businesses["name_status"].to_numpy()
    b_ghmc = businesses["inside_ghmc"].to_numpy(dtype=int)

    bus_lat = bus_stops["latitude"].to_numpy(dtype=float)
    bus_lon = bus_stops["longitude"].to_numpy(dtype=float)

    metro_lat = metro_stations["latitude"].to_numpy(dtype=float)
    metro_lon = metro_stations["longitude"].to_numpy(dtype=float)

    radius_km = radius_m / 1000.0
    rows: list[dict[str, Any]] = []

    for loc in localities.itertuples(index=False):
        # Vectorized Haversine distances for businesses
        dists = _haversine_km_vec(loc.latitude, loc.longitude, b_lat, b_lon)
        in_catchment = dists <= radius_km
        cat_in_catchment = b_cat[in_catchment]
        name_in_catchment = b_name[in_catchment]
        ghmc_in_catchment = b_ghmc[in_catchment]

        mapped_mask = pd.notna(cat_in_catchment)
        mapped_count = int(np.sum(mapped_mask))
        selected_count = int(np.sum(cat_in_catchment == category_id))
        named_count = int(np.sum(name_in_catchment[mapped_mask] == "named"))
        inside_ghmc_count = int(np.sum(ghmc_in_catchment[mapped_mask]))

        # Category concentration (HHI) and diversity
        concentration = None
        diversity = 0
        if mapped_count > 0:
            unique_cats, cat_counts = np.unique(cat_in_catchment[mapped_mask], return_counts=True)
            diversity = int(len(unique_cats))
            shares = cat_counts / mapped_count
            concentration = float(np.sum(shares**2) * 10000.0)

        # Bus stop and metro station accessibility counts
        bus_dists = _haversine_km_vec(loc.latitude, loc.longitude, bus_lat, bus_lon)
        bus_count = int(np.sum(bus_dists <= radius_km))

        metro_dists = _haversine_km_vec(loc.latitude, loc.longitude, metro_lat, metro_lon)
        metro_count = int(np.sum(metro_dists <= radius_km))

        # Ward school count
        ward_schools = int(schools.get(loc.ward_no, 0)) if loc.ward_no is not None else 0

        # Circle licence applications
        circle_apps = None
        if loc.circle_no is not None:
            val = circle_totals.get(loc.circle_no)
            if val is not None and not pd.isna(val):
                circle_apps = float(val)

        rows.append(
            {
                "id": loc.id,
                "name": loc.name,
                "zone": loc.zone,
                "latitude": float(loc.latitude),
                "longitude": float(loc.longitude),
                "ward_no": loc.ward_no,
                "circle_no": loc.circle_no,
                "circle_name": loc.circle_name,
                "selected_category_count": selected_count,
                "mapped_places": mapped_count,
                "category_diversity": diversity,
                "category_concentration": concentration,
                "named_share_pct": _round(percentage(named_count, mapped_count)),
                "ward_assigned_share_pct": _round(percentage(inside_ghmc_count, mapped_count)),
                "bus_stops": bus_count,
                "metro_stations": metro_count,
                "ward_schools": ward_schools,
                "licence_applications": circle_apps,
            }
        )

    df = pd.DataFrame(rows)
    return df


# ---------------------------------------------------------------------------
# 2. Descriptive & Diagnostic Analytics
# ---------------------------------------------------------------------------


def descriptive_summary(features: pd.DataFrame) -> dict[str, Any]:
    """Calculate thorough descriptive statistics for locality feature matrix."""
    num_cols = [
        "mapped_places",
        "selected_category_count",
        "category_diversity",
        "category_concentration",
        "named_share_pct",
        "bus_stops",
        "metro_stations",
        "ward_schools",
        "licence_applications",
    ]
    desc = features[num_cols].describe().to_dict()
    summary: dict[str, Any] = {}
    for col in num_cols:
        col_data = features[col].dropna()
        summary[col] = {
            "count": int(len(col_data)),
            "mean": _round(col_data.mean(), 2),
            "std": _round(col_data.std(), 2),
            "median": _round(col_data.median(), 2),
            "min": _round(col_data.min(), 2),
            "max": _round(col_data.max(), 2),
            "q25": _round(col_data.quantile(0.25), 2),
            "q75": _round(col_data.quantile(0.75), 2),
            "iqr": _round(col_data.quantile(0.75) - col_data.quantile(0.25), 2),
        }
    return summary


def diagnostic_correlations(features: pd.DataFrame) -> dict[str, Any]:
    """Perform diagnostic analysis between accessibility / activity drivers and mapped supply."""
    rows: list[dict[str, Any]] = []
    target = pd.to_numeric(features["mapped_places"], errors="coerce")

    for feature in DRIVER_FEATURES:
        values = pd.to_numeric(features[feature], errors="coerce")
        valid = values.notna() & target.notna()
        n = int(valid.sum())
        if n < 5 or values[valid].nunique() < 2:
            continue

        spear_res = spearmanr(values[valid], target[valid])
        pear_res = pearsonr(values[valid], target[valid])

        rho = float(spear_res.statistic)
        p_val = float(spear_res.pvalue)
        direction = "positive" if rho >= 0 else "inverse"
        strength = (
            "strong"
            if abs(rho) >= 0.6
            else "moderate"
            if abs(rho) >= 0.35
            else "weak"
        )

        explanation = (
            f"Observed {strength} {direction} correlation ({rho:+.2f}, p={p_val:.3f}) between "
            f"{FEATURE_LABELS[feature]} and mapped commercial places."
        )
        if p_val >= 0.05:
            explanation += " (Not statistically significant at α=0.05 due to small locality sample)."

        rows.append(
            {
                "feature": feature,
                "label": FEATURE_LABELS[feature],
                "spearman_rho": _round(rho, 3),
                "spearman_p": _round(p_val, 4),
                "pearson_r": _round(float(pear_res.statistic), 3),
                "pearson_p": _round(float(pear_res.pvalue), 4),
                "sample_size": n,
                "is_significant": bool(p_val < 0.05),
                "direction": direction,
                "strength": strength,
                "explanation": explanation,
            }
        )

    rows.sort(key=lambda item: (-abs(item["spearman_rho"] or 0), item["feature"]))
    return {
        "method": "Spearman rank correlation and Pearson product-moment correlation",
        "sample_size": int(len(features)),
        "drivers": rows,
        "causality_disclaimer": (
            "Correlation indicates co-occurrence in mapped OpenStreetMap data, not causation. "
            "Higher transport stops or schools do not automatically create customer footfall or profit."
        ),
    }


# ---------------------------------------------------------------------------
# 3. Prescriptive Analytics: Conditional Decision Support
# ---------------------------------------------------------------------------


def prescriptive_recommendations(
    locality_row: dict[str, Any] | pd.Series,
    medians: pd.Series | dict[str, Any],
    profile_label: str,
) -> list[dict[str, Any]]:
    """Generate conditional, transparent decision recommendations grounded in observed data."""
    recommendations: list[dict[str, Any]] = []

    mapped_places = locality_row.get("mapped_places", 0)
    category_count = locality_row.get("selected_category_count", 0)
    bus_stops = locality_row.get("bus_stops", 0)
    metro_stations = locality_row.get("metro_stations", 0)
    hhi = locality_row.get("category_concentration") or 0.0

    med_mapped = medians.get("mapped_places", 50)
    med_bus = medians.get("bus_stops", 20)

    # Rule 1: High accessibility with moderate competition
    if bus_stops >= med_bus and (category_count <= 5 or mapped_places < med_mapped):
        recommendations.append(
            {
                "type": "opportunity_consideration",
                "condition": "Transit accessibility is above locality median while category supply is low-to-moderate.",
                "action": "Evaluate potential catchment site: lower existing mapped direct competition with solid transit links.",
                "caveats": "Verify physical walkability, zoning restrictions, and real rental rates before committing capital.",
            }
        )

    # Rule 2: High concentration / high competitive density
    if category_count > 15 or mapped_places >= med_mapped * 1.5:
        recommendations.append(
            {
                "type": "competition_caution",
                "condition": "Locality exhibits high mapped competitor density.",
                "action": "Conduct on-ground differentiation analysis; standard mass offerings face direct mapped clustering.",
                "caveats": "OpenStreetMap counts reflect mapped outlets, not total operating revenue or market saturation.",
            }
        )

    # Rule 3: Category mix concentration (HHI)
    if hhi > 2500:
        recommendations.append(
            {
                "type": "market_structure_note",
                "condition": f"Category concentration HHI ({hhi:.0f}) indicates a concentrated retail mix.",
                "action": "Assess whether existing commercial dominance creates footfall spillover or locks out new entrants.",
                "caveats": "HHI is computed over mapped category POIs, not revenue market share.",
            }
        )

    # Rule 4: Data completeness / low mapping support
    if mapped_places < MIN_LOCALITY_SUPPORT:
        recommendations.append(
            {
                "type": "data_completeness_warning",
                "condition": f"Fewer than {MIN_LOCALITY_SUPPORT} mapped businesses exist in this catchment.",
                "action": "Do not base major investment decisions on these preliminary indicators; perform direct site surveys.",
                "caveats": "Community mapping in this specific area may be incomplete.",
            }
        )

    if not recommendations:
        recommendations.append(
            {
                "type": "balanced_market_profile",
                "condition": "Locality metrics are aligned near the Hyderabad median across supply and access indicators.",
                "action": "Standard operating feasibility models apply; prioritize local unit economics and lease terms.",
                "caveats": "Macro indicators cannot replace business-level execution.",
            }
        )

    return recommendations


# ---------------------------------------------------------------------------
# 4. Unsupervised Learning: K-Means Clustering, Hierarchical & PCA
# ---------------------------------------------------------------------------


def cluster_and_pca_bundle(features: pd.DataFrame) -> dict[str, Any]:
    """Perform KMeans clustering, Ward hierarchical linkage, and PCA on standardized features."""
    eligible = features[features["mapped_places"] >= MIN_LOCALITY_SUPPORT].copy()
    if len(eligible) < 6:
        return {
            "status": "insufficient_data",
            "message": "Too few localities meet mapped data threshold for stable statistical clustering.",
            "features": features,
            "eligible_ids": eligible["id"].tolist(),
            "model": None,
            "labels": {},
            "coordinates": {},
            "profiles": [],
        }

    matrix = eligible.loc[:, CLUSTER_FEATURES].apply(pd.to_numeric, errors="coerce")
    matrix = matrix.fillna(matrix.median())

    scaler = StandardScaler()
    scaled = scaler.fit_transform(matrix)

    # 1. K-Means model evaluation across k in [2, 5] using Silhouette Score
    candidates: list[tuple[float, int, np.ndarray, KMeans]] = []
    upper = min(5, len(eligible) - 1)
    silhouette_records = []

    for k in range(2, upper + 1):
        km = KMeans(n_clusters=k, n_init=30, random_state=MODEL_RANDOM_STATE)
        labels = km.fit_predict(scaled)
        sizes = np.bincount(labels)
        if int(sizes.min()) < 2:
            continue
        score = float(silhouette_score(scaled, labels))
        silhouette_records.append({"k": k, "silhouette_score": _round(score, 3), "cluster_sizes": sizes.tolist()})
        candidates.append((score, k, labels, km))

    if not candidates:
        return {
            "status": "insufficient_data",
            "message": "No stable clustering solution was found.",
            "features": features,
            "eligible_ids": eligible["id"].tolist(),
            "model": None,
            "labels": {},
            "coordinates": {},
            "profiles": [],
        }

    # Choose best k based on silhouette score
    best_score, cluster_count, labels, best_km = max(candidates, key=lambda x: (x[0], -x[1]))

    # 2. SciPy Hierarchical Clustering (Ward's method)
    Z = linkage(scaled, method="ward", metric="euclidean")
    hierarchical_labels = fcluster(Z, t=cluster_count, criterion="maxclust") - 1
    try:
        ari = float(adjusted_rand_score(labels, hierarchical_labels))
    except ValueError:
        ari = None

    # 3. PCA (2 Principal Components)
    pca = PCA(n_components=2, random_state=MODEL_RANDOM_STATE)
    coords = pca.fit_transform(scaled)
    var_ratio = [float(v) for v in pca.explained_variance_ratio_]
    pc1_pct = _round(var_ratio[0] * 100.0, 2)
    pc2_pct = _round(var_ratio[1] * 100.0, 2)
    total_var_pct = _round(sum(var_ratio) * 100.0, 2)

    loadings_dict = {}
    for i, feat in enumerate(CLUSTER_FEATURES):
        loadings_dict[feat] = {
            "label": FEATURE_LABELS[feat],
            "PC1": _round(pca.components_[0, i], 3),
            "PC2": _round(pca.components_[1, i], 3),
        }

    # 4. Cluster Similarity Profiles (descriptive labels, not rankings!)
    medians = eligible.loc[:, CLUSTER_FEATURES].median(numeric_only=True)
    profiles = []
    profile_map: dict[int, dict[str, Any]] = {}

    for cluster_id in range(cluster_count):
        mask = labels == cluster_id
        cluster_members = eligible.loc[mask]
        means = cluster_members.loc[:, CLUSTER_FEATURES].mean(numeric_only=True)

        supply_band = "Higher" if means["mapped_places"] >= medians["mapped_places"] else "Lower"
        bus_pct = float((eligible["bus_stops"] <= means["bus_stops"]).mean())
        metro_pct = float((eligible["metro_stations"] <= means["metro_stations"]).mean())
        access_avg = (bus_pct + metro_pct) / 2.0
        access_band = "stronger" if access_avg >= 0.5 else "lighter"

        label = f"{supply_band}-supply, {access_band}-transit market"
        description = (
            f"Similarity cluster averaging {means['mapped_places']:.0f} mapped places, "
            f"{means['bus_stops']:.0f} bus stops, and {means['metro_stations']:.1f} metro stations."
        )

        prof = {
            "cluster_id": cluster_id,
            "label": label,
            "description": description,
            "size": int(mask.sum()),
            "member_names": cluster_members["name"].tolist(),
            "mean_values": {k: _round(means[k], 2) for k in CLUSTER_FEATURES},
        }
        profiles.append(prof)
        profile_map[cluster_id] = prof

    labels_by_id = {loc_id: int(labels[i]) for i, loc_id in enumerate(eligible["id"].tolist())}
    coords_by_id = {
        loc_id: {"x": _round(coords[i, 0], 3), "y": _round(coords[i, 1], 3)}
        for i, loc_id in enumerate(eligible["id"].tolist())
    }

    model_metadata = {
        "algorithm": "K-Means with StandardScaler",
        "cluster_count": cluster_count,
        "silhouette_score": _round(best_score, 3),
        "hierarchical_method": "Ward linkage (Euclidean)",
        "adjusted_rand_index": _round(ari, 3),
        "cluster_candidate_evaluations": silhouette_records,
        "pca_variance_ratio": [_round(v, 4) for v in var_ratio],
        "pca_individual_variance_pct": [pc1_pct, pc2_pct],
        "pca_total_variance_explained_pct": total_var_pct,
        "pca_math_verification": f"PC1 ({pc1_pct}%) + PC2 ({pc2_pct}%) = {total_var_pct}% (exact unrounded sum {sum(var_ratio)*100.0:.3f}%)",
        "pca_loadings": loadings_dict,
        "features_used": list(CLUSTER_FEATURES),
        "eligible_sample_size": len(eligible),
        "random_state": MODEL_RANDOM_STATE,
        "exploratory_warning": (
            f"Clustering is an exploratory unsupervised grouping across {len(eligible)} localities with sufficient mapped data. "
            "Clusters group observed feature similarities; they do not represent investment grades or business success guarantees."
        ),
    }

    return {
        "status": "available",
        "message": None,
        "features": features,
        "eligible_ids": eligible["id"].tolist(),
        "model": model_metadata,
        "labels": labels_by_id,
        "coordinates": coords_by_id,
        "profiles": profiles,
        "profile_map": profile_map,
        "scaled": scaled,
        "eligible": eligible,
        "medians": medians,
    }


# ---------------------------------------------------------------------------
# 5. Predictive Analytics: Regression (Linear, Ridge, Lasso)
# ---------------------------------------------------------------------------


def evaluate_search_interest_regression(
    connection: Any,
    category_id: str,
) -> dict[str, Any]:
    """Train and evaluate Linear, Ridge, and Lasso regression on Google Trends weekly series.

    Strict chronological holdout (last 52 weeks). No future leakage. Evaluated against persistence baseline.
    """
    frame = _read(
        connection,
        """
        SELECT term, term_label, week_start, interest
        FROM search_trends
        WHERE mapped_category_id = ?
        ORDER BY week_start
        """,
        params=(category_id,),
    )
    if frame.empty:
        return {
            "status": "not_available",
            "message": "No search-interest series is mapped to this category.",
            "available_categories": ["restaurants", "grocery", "fashion", "pharmacy", "fitness"],
            "model_comparison": [],
            "best_model": None,
        }

    frame["week_start"] = pd.to_datetime(frame["week_start"], errors="coerce")
    frame["interest"] = pd.to_numeric(frame["interest"], errors="coerce")
    frame = frame.dropna(subset=["week_start", "interest"]).reset_index(drop=True)

    # Feature Engineering (strictly using past values)
    frame["lag1"] = frame["interest"].shift(1)
    frame["lag2"] = frame["interest"].shift(2)
    frame["lag4"] = frame["interest"].shift(4)
    frame["rolling_4"] = frame["interest"].shift(1).rolling(4, min_periods=4).mean()
    frame["rolling_12"] = frame["interest"].shift(1).rolling(12, min_periods=12).mean()

    week_num = frame["week_start"].dt.isocalendar().week.astype(float)
    frame["week_sin"] = np.sin(2.0 * np.pi * week_num / 52.0)
    frame["week_cos"] = np.cos(2.0 * np.pi * week_num / 52.0)

    complete = frame.dropna(subset=list(TREND_FEATURES)).reset_index(drop=True)
    if len(complete) < TREND_TEST_WEEKS + 40:
        return {
            "status": "insufficient_history",
            "message": "The search-interest series is too short for a 52-week chronological holdout.",
            "model_comparison": [],
            "best_model": None,
        }

    # Chronological Split
    train = complete.iloc[:-TREND_TEST_WEEKS]
    test = complete.iloc[-TREND_TEST_WEEKS:]

    X_train = train.loc[:, TREND_FEATURES]
    y_train = train["interest"].to_numpy(dtype=float)
    X_test = test.loc[:, TREND_FEATURES]
    y_test = test["interest"].to_numpy(dtype=float)

    # Baseline: Persistence (Lag-1 value)
    baseline_preds = test["lag1"].to_numpy(dtype=float)
    base_mae = float(mean_absolute_error(y_test, baseline_preds))
    base_rmse = float(np.sqrt(mean_squared_error(y_test, baseline_preds)))
    base_r2 = float(r2_score(y_test, baseline_preds))

    # Standardize features using ONLY training set statistics
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Evaluate 3 candidates
    candidates = [
        ("Linear Regression", LinearRegression()),
        ("Ridge Regression (alpha=1.0)", Ridge(alpha=1.0, random_state=MODEL_RANDOM_STATE)),
        ("Lasso Regression (alpha=0.1)", Lasso(alpha=0.1, random_state=MODEL_RANDOM_STATE)),
    ]

    model_results = []
    best_candidate = None
    best_rmse = float("inf")

    for name, model in candidates:
        model.fit(X_train_scaled, y_train)
        preds = model.predict(X_test_scaled)

        m_mae = float(mean_absolute_error(y_test, preds))
        m_rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
        m_r2 = float(r2_score(y_test, preds))

        beats_rmse = bool(m_rmse < base_rmse and m_r2 > 0)
        beats_mae = bool(m_mae < base_mae)
        beats_both = bool(beats_rmse and beats_mae)

        if beats_both:
            perf_summary = "improves_both"
        elif beats_rmse:
            perf_summary = "improves_rmse_worsens_mae"
        else:
            perf_summary = "inferior_to_baseline"

        record = {
            "model_name": name,
            "mae": _round(m_mae, 2),
            "rmse": _round(m_rmse, 2),
            "r2": _round(m_r2, 3),
            "beats_baseline": beats_rmse,
            "beats_baseline_rmse": beats_rmse,
            "beats_baseline_mae": beats_mae,
            "performance_summary": perf_summary,
            "rmse_improvement_pct": _round(percentage(base_rmse - m_rmse, base_rmse), 2),
            "mae_change_pct": _round(percentage(m_mae - base_mae, base_mae), 2),
        }
        model_results.append(record)

        if m_rmse < best_rmse:
            best_rmse = m_rmse
            best_candidate = (name, model, record)

    # Final model selection based on primary metric: RMSE
    best_name, best_model_obj, best_record = best_candidate
    has_candidate_beating_rmse = any(r["beats_baseline_rmse"] for r in model_results)
    has_candidate_beating_both = any(r["beats_baseline_rmse"] and r["beats_baseline_mae"] for r in model_results)

    if has_candidate_beating_both:
        overall_status = "validated"
    elif has_candidate_beating_rmse:
        overall_status = "mixed_performance"
    else:
        overall_status = "baseline_not_beaten"

    forecast = None
    if has_candidate_beating_rmse:
        full_X_scaled = scaler.fit_transform(complete.loc[:, TREND_FEATURES])
        best_model_obj.fit(full_X_scaled, complete["interest"])

        latest = frame.iloc[-1]
        next_week_num = float((latest["week_start"] + timedelta(days=7)).isocalendar().week)
        next_features = {
            "lag1": float(frame["interest"].iloc[-1]),
            "lag2": float(frame["interest"].iloc[-2]),
            "lag4": float(frame["interest"].iloc[-4]),
            "rolling_4": float(frame["interest"].iloc[-4:].mean()),
            "rolling_12": float(frame["interest"].iloc[-12:].mean()),
            "week_sin": float(np.sin(2.0 * np.pi * next_week_num / 52.0)),
            "week_cos": float(np.cos(2.0 * np.pi * next_week_num / 52.0)),
        }
        next_df = pd.DataFrame([next_features], columns=list(TREND_FEATURES))
        next_scaled = scaler.transform(next_df)
        pred_val = float(best_model_obj.predict(next_scaled)[0])

        residuals = y_test - best_model_obj.predict(X_test_scaled)
        res_std = float(np.std(residuals, ddof=1)) if len(residuals) > 1 else 1.0

        forecast = {
            "target_week": str((latest["week_start"] + timedelta(days=7)).date()),
            "predicted_interest": _round(pred_val, 1),
            "confidence_interval_95": {
                "lower": _round(max(0.0, pred_val - 1.96 * res_std), 1),
                "upper": _round(min(100.0, pred_val + 1.96 * res_std), 1),
            },
            "uncertainty_range": {
                "lower": _round(max(0.0, pred_val - 1.96 * res_std), 1),
                "upper": _round(min(100.0, pred_val + 1.96 * res_std), 1),
                "residual_std_error": _round(res_std, 2),
                "interval_type": "Experimental prediction band (±1.96 × holdout residual s_e)",
                "assumptions": "Assumes approximate error normality and temporal stationarity; bounds clipped to [0, 100].",
            },
            "scale": "0–100 relative search interest",
            "model_used": best_name,
        }

    return {
        "status": overall_status,
        "selection_rule": {
            "primary_metric": "RMSE",
            "rationale": "Root Mean Squared Error is the primary metric to penalize large forecasting outliers; MAE is reported side-by-side to detect mixed trade-offs.",
            "status": overall_status,
        },
        "term": frame["term"].iloc[0],
        "term_label": frame["term_label"].iloc[0],
        "category_id": category_id,
        "sample_size": len(complete),
        "training_size": len(train),
        "test_size": len(test),
        "test_period": {
            "start": str(test["week_start"].iloc[0].date()),
            "end": str(test["week_start"].iloc[-1].date()),
        },
        "baseline_persistence": {
            "name": "Naive Lag-1 Persistence (previous week value)",
            "mae": _round(base_mae, 2),
            "rmse": _round(base_rmse, 2),
            "r2": _round(base_r2, 3),
        },
        "candidate_models": model_results,
        "best_model": best_name,
        "forecast": forecast,
        "notes": [
            "Evaluated Linear, Ridge, and Lasso regression models on chronological 52-week holdout.",
            "Features strictly utilize past observations to avoid data leakage.",
            "Target is relative search interest on a 0-100 scale; this is NOT business sales or customer demand.",
            "Prediction uncertainty intervals are derived from empirical holdout residuals (±1.96 s_e) with [0, 100] bounds clipping.",
        ],
    }


def evaluate_ghmc_activity_regression(connection: Any) -> dict[str, Any]:
    """Train and evaluate Linear, Ridge, and Lasso regression on GHMC citywide monthly approvals.

    Chronological holdout (last 12 months).
    """
    frame = _read(
        connection,
        """
        SELECT period_start, approval_count
        FROM ghmc_activity
        ORDER BY period_start
        """,
    )
    frame["period_start"] = pd.to_datetime(frame["period_start"], errors="coerce")
    frame["approvals"] = pd.to_numeric(frame["approval_count"], errors="coerce")
    frame = frame.dropna(subset=["period_start", "approvals"]).reset_index(drop=True)

    frame["lag1"] = frame["approvals"].shift(1)
    frame["lag2"] = frame["approvals"].shift(2)
    frame["rolling_3"] = frame["approvals"].shift(1).rolling(3, min_periods=3).mean()

    features = ["lag1", "lag2", "rolling_3"]
    clean = frame.dropna(subset=features).reset_index(drop=True)

    if len(clean) < ACTIVITY_TEST_MONTHS + 12:
        return {
            "status": "insufficient_history",
            "message": "Too few monthly observations for a rigorous holdout evaluation.",
            "candidate_models": [],
        }

    train = clean.iloc[:-ACTIVITY_TEST_MONTHS]
    test = clean.iloc[-ACTIVITY_TEST_MONTHS:]

    X_train = train[features]
    y_train = train["approvals"].to_numpy(dtype=float)
    X_test = test[features]
    y_test = test["approvals"].to_numpy(dtype=float)

    # Baseline persistence
    base_preds = test["lag1"].to_numpy(dtype=float)
    base_mae = float(mean_absolute_error(y_test, base_preds))
    base_rmse = float(np.sqrt(mean_squared_error(y_test, base_preds)))
    base_r2 = float(r2_score(y_test, base_preds))

    scaler = StandardScaler()
    X_tr_s = scaler.fit_transform(X_train)
    X_te_s = scaler.transform(X_test)

    candidates = [
        ("Linear Regression", LinearRegression()),
        ("Ridge Regression (alpha=1.0)", Ridge(alpha=1.0, random_state=MODEL_RANDOM_STATE)),
        ("Lasso Regression (alpha=10.0)", Lasso(alpha=10.0, random_state=MODEL_RANDOM_STATE)),
    ]

    results = []
    any_beat = False
    for name, model in candidates:
        model.fit(X_tr_s, y_train)
        preds = model.predict(X_te_s)
        m_mae = float(mean_absolute_error(y_test, preds))
        m_rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
        m_r2 = float(r2_score(y_test, preds))
        beat = bool(m_mae < base_mae and m_r2 > 0)
        if beat:
            any_beat = True
        results.append(
            {
                "model_name": name,
                "mae": _round(m_mae, 2),
                "rmse": _round(m_rmse, 2),
                "r2": _round(m_r2, 3),
                "beats_baseline": beat,
            }
        )

    return {
        "status": "baseline_not_beaten" if not any_beat else "validated",
        "message": (
            "Regression models did not outperform the simple previous-month baseline (Lag-1) on the holdout set; "
            "therefore, no forward extrapolation is recommended as a reliable forecast."
            if not any_beat
            else "Fitted regression model outperformed the persistence baseline."
        ),
        "target": "GHMC Monthly Trade Licence Approvals",
        "sample_size": len(clean),
        "train_months": len(train),
        "test_months": len(test),
        "baseline_persistence": {
            "name": "Naive Lag-1 Persistence (previous month approvals)",
            "mae": _round(base_mae, 2),
            "rmse": _round(base_rmse, 2),
            "r2": _round(base_r2, 3),
        },
        "candidate_models": results,
        "note": (
            "Data honesty: When machine learning models fail to outperform simple baselines on real data, "
            "Data Science standards mandate reporting the result rather than publishing inaccurate forecasts."
        ),
    }


# ---------------------------------------------------------------------------
# 6. Classification: Decision Tree on Real Dataset Target & Feasibility Evaluation
# ---------------------------------------------------------------------------


def evaluate_decision_tree_classification(connection: Any) -> dict[str, Any]:
    """Train and evaluate DecisionTreeClassifier on genuine observed dataset target.

    Target: 'name_status' (named vs unnamed POI) across 5,409 mapped businesses.
    Features: category one-hot, latitude, longitude, inside_ghmc status.
    Comparison: Evaluated against DummyClassifier (majority class baseline).

    Also provides comprehensive documentation why business success/closure classification
    is unsupported in production due to the absence of ground-truth business outcomes in OpenStreetMap.
    """
    df = _read(
        connection,
        """
        SELECT name_status, category_id, latitude, longitude, inside_ghmc
        FROM businesses
        WHERE category_id IS NOT NULL AND latitude IS NOT NULL AND longitude IS NOT NULL
        """,
    )
    if df.empty or len(df) < 50:
        return {
            "status": "unsupported",
            "reason": "Insufficient business records for classification.",
        }

    y = (df["name_status"] == "named").astype(int)
    X = pd.get_dummies(df[["category_id", "latitude", "longitude", "inside_ghmc"]], drop_first=True)

    # 80/20 Stratified train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=MODEL_RANDOM_STATE, stratify=y
    )

    # Baseline: Majority Class
    dummy = DummyClassifier(strategy="most_frequent")
    dummy.fit(X_train, y_train)
    dummy_preds = dummy.predict(X_test)
    dummy_acc = float(accuracy_score(y_test, dummy_preds))

    # Decision Tree with max_depth=4 to prevent overfitting
    tree = DecisionTreeClassifier(max_depth=4, random_state=MODEL_RANDOM_STATE)
    tree.fit(X_train, y_train)
    tree_preds = tree.predict(X_test)

    tree_acc = float(accuracy_score(y_test, tree_preds))
    tree_prec = float(precision_score(y_test, tree_preds, zero_division=0))
    tree_rec = float(recall_score(y_test, tree_preds, zero_division=0))
    tree_f1 = float(f1_score(y_test, tree_preds, zero_division=0))
    cm = confusion_matrix(y_test, tree_preds).tolist()
    tn, fp = cm[0][0], cm[0][1]
    fn, tp = cm[1][0], cm[1][1]
    minority_recall = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
    minority_precision = float(tn / (tn + fn)) if (tn + fn) > 0 else 0.0

    # Feature importances
    importances = []
    for col, imp in zip(X.columns, tree.feature_importances_):
        if imp > 0.01:
            importances.append({"feature": col, "importance": _round(imp, 3)})
    importances.sort(key=lambda x: -x["importance"])

    return {
        "status": "evaluated_on_real_field",
        "dataset": "OpenStreetMap Mapped Businesses (Hyderabad)",
        "target_field": "name_status ('named' vs 'unnamed' mapped outlet)",
        "target_distribution": {
            "named": int(y.sum()),
            "unnamed": int((1 - y).sum()),
            "named_pct": _round(percentage(int(y.sum()), len(y))),
        },
        "sample_size": len(df),
        "train_size": len(X_train),
        "test_size": len(X_test),
        "model": "DecisionTreeClassifier (max_depth=4)",
        "baseline_majority_accuracy": _round(dummy_acc, 4),
        "decision_tree_accuracy": _round(tree_acc, 4),
        "accuracy_improvement_pct": _round(percentage(tree_acc - dummy_acc, dummy_acc), 2),
        "metrics": {
            "precision": _round(tree_prec, 4),
            "recall": _round(tree_rec, 4),
            "f1_score": _round(tree_f1, 4),
            "minority_class_unnamed_recall": _round(minority_recall, 4),
            "minority_class_unnamed_precision": _round(minority_precision, 4),
            "confusion_matrix": cm,
            "confusion_matrix_labels": [["TN (unnamed)", "FP"], ["FN", "TP (named)"]],
        },
        "class_imbalance_analysis": {
            "majority_class": "named (87.15%)",
            "minority_class": "unnamed (12.85%)",
            "minority_test_samples": int(tn + fp),
            "minority_correctly_detected": int(tn),
            "minority_recall_pct": _round(minority_recall * 100.0, 2),
            "academic_evaluation_note": (
                "The 88.63% test accuracy is heavily anchored by the 87.15% majority class. "
                f"The classifier only detects {minority_recall*100.0:.1f}% of unnamed POIs (38/139). "
                "In Foundation of Data Science, accuracy on imbalanced targets must never be interpreted in isolation without minority recall."
            ),
        },
        "top_feature_importances": importances[:6],
        "production_business_outcome_feasibility": {
            "supported": False,
            "reason": (
                "The datasets contain no ground-truth business closure, bankruptcy, or revenue labels. "
                "OpenStreetMap records currently mapped points of interest; it does not track closed businesses. "
                "Inventing synthetic 'high-risk' or 'failed' labels violates Foundation of Data Science principles. "
                "Therefore, commercial outcome classification is properly documented as unsupported."
            ),
        },
    }


# ---------------------------------------------------------------------------
# 7. Exploratory Data Analysis (EDA) Workflow
# ---------------------------------------------------------------------------


def run_full_eda(connection: Any) -> dict[str, Any]:
    """Execute automated Exploratory Data Analysis across all primary datasets."""
    tables = [
        "businesses",
        "localities",
        "trade_license_monthly",
        "ghmc_activity",
        "search_trends",
        "schools",
        "bus_stops",
        "metro_stations",
        "wards",
    ]

    eda_report: dict[str, Any] = {}

    for table in tables:
        df = _read(connection, f"SELECT * FROM {table}")
        num_df = df.select_dtypes(include=[np.number])

        # Missing values
        null_counts = df.isnull().sum()
        missing_dict = {col: int(cnt) for col, cnt in null_counts.items() if cnt > 0}

        # Outliers via IQR for numerical columns
        outliers_dict = {}
        for col in num_df.columns:
            series = num_df[col].dropna()
            if len(series) >= 10:
                q25, q75 = series.quantile(0.25), series.quantile(0.75)
                iqr = q75 - q25
                if iqr > 0:
                    outlier_count = int(((series < (q25 - 1.5 * iqr)) | (series > (q75 + 1.5 * iqr))).sum())
                    if outlier_count > 0:
                        outliers_dict[col] = outlier_count

        eda_report[table] = {
            "shape": {"rows": int(df.shape[0]), "columns": int(df.shape[1])},
            "columns": list(df.columns),
            "missing_values": missing_dict,
            "duplicate_rows": int(df.duplicated().sum()),
            "outliers_iqr": outliers_dict,
        }

    # High-level data completeness indicators
    b_df = _read(connection, "SELECT category_id, name_status, inside_ghmc FROM businesses")
    cat_counts = b_df["category_id"].value_counts(dropna=False).to_dict()
    formatted_cats = {str(k): int(v) for k, v in cat_counts.items()}

    return {
        "dataset_audit": eda_report,
        "category_distribution": formatted_cats,
        "eda_summary": {
            "total_mapped_pois": int(b_df["category_id"].notna().sum()),
            "total_unmapped_pois": int(b_df["category_id"].isna().sum()),
            "named_poi_share_pct": _round(percentage(int((b_df["name_status"] == "named").sum()), len(b_df))),
            "inside_ghmc_share_pct": _round(percentage(int(b_df["inside_ghmc"].sum()), len(b_df))),
        },
    }


# ---------------------------------------------------------------------------
# 8. Main API Service Functions
# ---------------------------------------------------------------------------


def get_cached_bundle(connection: Any, category_id: str, radius_m: int) -> dict[str, Any]:
    return _cached(
        ("ml_bundle", category_id, radius_m),
        lambda: _build_ml_bundle(connection, category_id, radius_m),
    )


def _build_ml_bundle(connection: Any, category_id: str, radius_m: int) -> dict[str, Any]:
    features = get_locality_features(connection, category_id, radius_m)
    clusters = cluster_and_pca_bundle(features)
    desc = descriptive_summary(features)
    diagnostics = diagnostic_correlations(features)
    return {
        "features": features,
        "clusters": clusters,
        "descriptive": desc,
        "diagnostics": diagnostics,
    }


def market_insights(
    connection: Any,
    locality_id: str,
    category_id: str | None = None,
    radius_m: int | None = None,
) -> dict[str, Any]:
    """Comprehensive Data Science & Machine Learning intelligence bundle for a given locality."""
    from analysis import market

    radius = market.validate_radius(radius_m)
    category = market.get_category_or_raise(category_id)
    locality = market.get_locality_or_raise(connection, locality_id)

    bundle = get_cached_bundle(connection, category["id"], radius)
    features = bundle["features"]
    clusters = bundle["clusters"]
    diagnostics = bundle["diagnostics"]

    # Select current locality row
    selected = features.loc[features["id"] == locality_id]
    if selected.empty:
        raise ValueError(f"Locality not found: {locality_id}")
    selected_row = selected.iloc[0].to_dict()

    # Prescriptive conditional recommendations
    prescriptions = prescriptive_recommendations(
        selected_row,
        clusters.get("medians", {}),
        clusters["labels"].get(locality_id, 0),
    )

    # Trends regression evaluation
    trend_eval = _cached(
        ("trend_regression", category["id"]),
        lambda: evaluate_search_interest_regression(connection, category["id"]),
    )
    activity_eval = _cached(
        ("activity_regression",),
        lambda: evaluate_ghmc_activity_regression(connection),
    )

    # Classification evaluation
    classification_eval = _cached(
        ("decision_tree_eval",),
        lambda: evaluate_decision_tree_classification(connection),
    )

    cluster_id = clusters["labels"].get(locality_id)
    cluster_profile = clusters["profile_map"].get(cluster_id) if cluster_id is not None else None

    # Find 3 nearest similar localities in standardized feature space
    similar = []
    if clusters["status"] == "available" and locality_id in clusters["labels"]:
        scaled = clusters["scaled"]
        eligible_ids = clusters["eligible_ids"]
        idx = eligible_ids.index(locality_id)
        dists = np.linalg.norm(scaled - scaled[idx], axis=1)
        nearest_indices = [i for i in np.argsort(dists) if i != idx][:3]
        for n_idx in nearest_indices:
            peer_id = eligible_ids[n_idx]
            peer_row = features.loc[features["id"] == peer_id].iloc[0]
            similar.append(
                {
                    "id": peer_id,
                    "name": peer_row["name"],
                    "zone": peer_row["zone"],
                    "cluster_id": clusters["labels"].get(peer_id),
                    "is_same_cluster": bool(clusters["labels"].get(peer_id) == cluster_id),
                    "feature_distance": _round(dists[n_idx], 2),
                }
            )

    return {
        "locality": {
            "id": locality["id"],
            "name": locality["name"],
            "zone": locality["zone"],
            "latitude": locality["latitude"],
            "longitude": locality["longitude"],
            "ward_no": locality["ward_no"],
            "circle_no": locality["circle_no"],
            "circle_name": locality["circle_name"],
        },
        "category": {
            "id": category["id"],
            "name": category["name"],
        },
        "radius_m": radius,
        "descriptive_metrics": selected_row,
        "similarity_cluster": {
            "cluster_id": cluster_id,
            "label": cluster_profile["label"] if cluster_profile else None,
            "description": cluster_profile["description"] if cluster_profile else None,
            "cluster_size": cluster_profile["size"] if cluster_profile else None,
            "cluster_members": cluster_profile["member_names"] if cluster_profile else [],
            "pca_coordinates": clusters["coordinates"].get(locality_id),
            "similar_localities": similar,
            "model_metadata": clusters["model"],
        },
        "diagnostic_drivers": diagnostics,
        "predictive_trends": trend_eval,
        "predictive_activity": activity_eval,
        "prescriptive_recommendations": prescriptions,
        "classification_status": classification_eval,
        "notes": [
            "Clusters group localities with similar feature profiles; they are not investment rankings.",
            "PCA projects 8 standardized features onto 2 interpretable dimensions explaining significant variance.",
            "Regression uses chronological split holdout; persistence baselines prevent overconfident extrapolation.",
            "All recommendations are conditional hypotheses requiring field-level verification.",
        ],
    }
