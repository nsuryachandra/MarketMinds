"""Real-data market metrics, transparent relative scores, and FDS analytical methods."""

from __future__ import annotations

import math
from statistics import median
from typing import Any

import numpy as np
import pandas as pd

from data.data_cleaning import (
    CATEGORY_BY_ID,
    CATEGORY_NAMES,
    DEFAULT_RADIUS_M,
    RADIUS_OPTIONS_M,
    clamp,
    percentage,
)

MIN_CATEGORY_CITY_COUNT = 10
MIN_CATCHMENT_COUNT = 3
CATEGORY_SUPPORT_TARGET = 25
ACCESS_WEIGHTS = {"bus_stops": 0.45, "metro_stations": 0.30, "schools": 0.25}


def validate_radius(radius_m: int | None) -> int:
    radius = DEFAULT_RADIUS_M if radius_m is None else int(radius_m)
    if radius not in RADIUS_OPTIONS_M:
        allowed = ", ".join(str(value) for value in RADIUS_OPTIONS_M)
        raise ValueError(f"radius_m must be one of {allowed}")
    return radius


def get_category_or_raise(category_id: str | None) -> dict[str, Any]:
    selected_id = category_id or "cafes"
    category = CATEGORY_BY_ID.get(selected_id)
    if category is None:
        raise ValueError(f"Unknown category: {selected_id}")
    return category


def _row_to_dict(row: Any) -> dict[str, Any]:
    return dict(row)


def get_locality(connection: Any, locality_id: str) -> dict[str, Any] | None:
    row = connection.execute(
        """
        SELECT id, name, zone, latitude, longitude, coordinate_source,
               is_approximate, ward_id, ward_no, circle_no, circle_name,
               ward_assignment_method, population_2011, population_note,
               source_id, as_of_date
        FROM localities
        WHERE id = ?
        """,
        (locality_id,),
    ).fetchone()
    return _row_to_dict(row) if row else None


def get_locality_or_raise(connection: Any, locality_id: str) -> dict[str, Any]:
    locality = get_locality(connection, locality_id)
    if locality is None:
        raise ValueError(f"Unknown locality: {locality_id}")
    return locality


def list_localities(connection: Any) -> list[dict[str, Any]]:
    return [
        _row_to_dict(row)
        for row in connection.execute(
            """
            SELECT id, name, zone, latitude, longitude, coordinate_source,
                   is_approximate, ward_id, ward_no, circle_no, circle_name,
                   ward_assignment_method, population_2011, population_note
            FROM localities
            ORDER BY name
            """
        ).fetchall()
    ]


def _haversine_km(
    lat1: np.ndarray | float,
    lon1: np.ndarray | float,
    lat2: np.ndarray | float,
    lon2: np.ndarray | float,
) -> np.ndarray | float:
    """NumPy vectorized haversine calculation in kilometers."""
    phi1 = np.radians(lat1)
    phi2 = np.radians(lat2)
    d_phi = np.radians(lat2 - lat1)
    d_lam = np.radians(lon2 - lon1)
    a = np.sin(d_phi / 2.0) ** 2 + np.cos(phi1) * np.cos(phi2) * np.sin(d_lam / 2.0) ** 2
    return 2.0 * 6371.0088 * np.arcsin(np.sqrt(np.clip(a, 0.0, 1.0)))


def nearest_locality(
    connection: Any,
    latitude: float,
    longitude: float,
) -> dict[str, Any] | None:
    localities = list_localities(connection)
    if not localities:
        return None
    loc_lats = np.array([item["latitude"] for item in localities], dtype=float)
    loc_lons = np.array([item["longitude"] for item in localities], dtype=float)
    distances_km = _haversine_km(latitude, longitude, loc_lats, loc_lons)
    min_idx = int(np.argmin(distances_km))
    result = dict(localities[min_idx])
    result["distance_m"] = round(float(distances_km[min_idx]) * 1000.0, 1)
    return result


def get_business(connection: Any, osm_id: str) -> dict[str, Any] | None:
    row = connection.execute(
        """
        SELECT osm_id, name, name_status, category_id, category_name, subtype,
               osm_key, osm_value, latitude, longitude, ward_id, inside_ghmc
        FROM businesses
        WHERE osm_id = ?
        """,
        (osm_id,),
    ).fetchone()
    if row is None:
        return None
    business = _row_to_dict(row)
    business["inside_ghmc"] = bool(business["inside_ghmc"])
    return business


def get_business_or_raise(connection: Any, osm_id: str) -> dict[str, Any]:
    business = get_business(connection, osm_id)
    if business is None:
        raise ValueError(f"Unknown business: {osm_id}")
    return business


def _load_businesses(connection: Any) -> pd.DataFrame:
    df = pd.read_sql_query(
        """
        SELECT osm_id, name, name_status, category_id, category_name, subtype,
               latitude, longitude, ward_id, inside_ghmc
        FROM businesses
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        """,
        connection,
    )
    df["inside_ghmc"] = df["inside_ghmc"].astype(int)
    return df


def _load_points_df(connection: Any, table: str) -> pd.DataFrame:
    return pd.read_sql_query(f"SELECT latitude, longitude FROM {table}", connection)


def city_category_counts(connection: Any) -> dict[str, dict[str, int]]:
    counts = {
        category_id: {"mapped_poi_count": 0, "inside_ghmc_count": 0, "named_count": 0}
        for category_id in CATEGORY_BY_ID
    }
    rows = connection.execute(
        """
        SELECT category_id, COUNT(*) AS mapped_poi_count,
               SUM(inside_ghmc) AS inside_ghmc_count,
               SUM(CASE WHEN name_status = 'named' THEN 1 ELSE 0 END) AS named_count
        FROM businesses
        WHERE category_id IS NOT NULL
        GROUP BY category_id
        """
    ).fetchall()
    for row in rows:
        cat_id = row["category_id"]
        if cat_id in counts:
            counts[cat_id] = {
                "mapped_poi_count": int(row["mapped_poi_count"]),
                "inside_ghmc_count": int(row["inside_ghmc_count"] or 0),
                "named_count": int(row["named_count"] or 0),
            }
    return counts


def _circle_totals(connection: Any) -> dict[int, int]:
    rows = connection.execute(
        """
        SELECT circle_no, SUM(applications) AS applications
        FROM trade_license_monthly
        GROUP BY circle_no
        """
    ).fetchall()
    return {int(row["circle_no"]): int(row["applications"] or 0) for row in rows}


def _school_counts_by_ward(connection: Any) -> dict[int, int]:
    rows = connection.execute(
        """
        SELECT ward_no, COUNT(*) AS school_count
        FROM schools
        WHERE ward_no IS NOT NULL
        GROUP BY ward_no
        """
    ).fetchall()
    return {int(row["ward_no"]): int(row["school_count"]) for row in rows}


def _selection_context(
    connection: Any,
    locality: dict[str, Any],
    category_id: str,
    radius_m: int,
    b_df: pd.DataFrame,
    localities: list[dict[str, Any]],
    city_counts: dict[str, dict[str, int]],
    circle_totals: dict[int, int],
    bus_df: pd.DataFrame,
    metro_df: pd.DataFrame,
    school_counts: dict[int, int],
    analysis_center: dict[str, Any] | None = None,
) -> dict[str, Any]:
    radius_km = radius_m / 1000.0
    center = analysis_center or {
        "type": "locality_reference_point",
        "label": locality["name"],
        "latitude": locality["latitude"],
        "longitude": locality["longitude"],
        "nearest_locality_id": locality["id"],
        "nearest_locality_name": locality["name"],
        "distance_to_nearest_locality_center_m": 0.0,
    }
    latitude = float(center["latitude"])
    longitude = float(center["longitude"])
    area_km2 = math.pi * radius_km**2

    # Vectorized distances to all businesses
    b_lats = b_df["latitude"].to_numpy(dtype=float)
    b_lons = b_df["longitude"].to_numpy(dtype=float)
    dists = _haversine_km(latitude, longitude, b_lats, b_lons)
    within_mask = dists <= radius_km
    within_b = b_df.iloc[within_mask]

    total_all = len(within_b)
    mapped_b = within_b[within_b["category_id"].notna()]
    total_mapped = len(mapped_b)
    total_inside_ghmc = int(mapped_b["inside_ghmc"].sum()) if total_mapped else 0

    cat_counts_series = mapped_b["category_id"].value_counts()
    category_counts = cat_counts_series.to_dict()

    selected_b = mapped_b[mapped_b["category_id"] == category_id]
    selected_count = len(selected_b)
    selected_named = int((selected_b["name_status"] == "named").sum())

    category_mix = [
        {
            "category_id": mix_cat,
            "category_name": CATEGORY_NAMES.get(mix_cat, mix_cat),
            "mapped_poi_count": int(cnt),
            "share_pct": percentage(int(cnt), total_mapped),
        }
        for mix_cat, cnt in category_counts.items()
    ]
    hhi = (
        round(float(sum((cnt / total_mapped) ** 2 for cnt in category_counts.values()) * 10000.0), 1)
        if total_mapped
        else None
    )

    # Locality category counts using vectorized distance for each locality
    cat_mask = b_df["category_id"] == category_id
    cat_lats = b_lats[cat_mask]
    cat_lons = b_lons[cat_mask]

    selected_counts = []
    for loc in localities:
        d = _haversine_km(loc["latitude"], loc["longitude"], cat_lats, cat_lons)
        selected_counts.append(int(np.sum(d <= radius_km)))

    max_locality_count = max(selected_counts) if selected_counts else 0
    median_locality_count = median(selected_counts) if selected_counts else 0
    city_category_count = city_counts[category_id]["mapped_poi_count"]
    insufficient_data = (
        city_category_count < MIN_CATEGORY_CITY_COUNT
        or selected_count < MIN_CATCHMENT_COUNT
    )

    competition_index = None
    if not insufficient_data and max_locality_count > 0:
        competition_index = round(clamp((selected_count / max_locality_count) * 100), 2)

    # Vectorized bus & metro distance
    bus_lats = bus_df["latitude"].to_numpy(dtype=float)
    bus_lons = bus_df["longitude"].to_numpy(dtype=float)
    bus_count = int(np.sum(_haversine_km(latitude, longitude, bus_lats, bus_lons) <= radius_km))

    metro_lats = metro_df["latitude"].to_numpy(dtype=float)
    metro_lons = metro_df["longitude"].to_numpy(dtype=float)
    metro_count = int(np.sum(_haversine_km(latitude, longitude, metro_lats, metro_lons) <= radius_km))

    ward_no = locality.get("ward_no")
    school_count = school_counts.get(ward_no, 0) if ward_no is not None else 0

    bus_counts = [
        int(np.sum(_haversine_km(item["latitude"], item["longitude"], bus_lats, bus_lons) <= radius_km))
        for item in localities
    ]
    metro_counts = [
        int(np.sum(_haversine_km(item["latitude"], item["longitude"], metro_lats, metro_lons) <= radius_km))
        for item in localities
    ]
    supported_school_counts = [
        school_counts.get(item.get("ward_no"), 0) if item.get("ward_no") is not None else 0
        for item in localities
    ]

    bus_max = max(bus_counts) if bus_counts else 0
    metro_max = max(metro_counts) if metro_counts else 0
    school_max = max(supported_school_counts) if supported_school_counts else 0

    bus_component = (bus_count / bus_max) * 100 if bus_max else 0.0
    metro_component = (metro_count / metro_max) * 100 if metro_max else 0.0
    school_component = (school_count / school_max) * 100 if school_max else 0.0

    access_index = round(
        clamp(
            bus_component * ACCESS_WEIGHTS["bus_stops"]
            + metro_component * ACCESS_WEIGHTS["metro_stations"]
            + school_component * ACCESS_WEIGHTS["schools"]
        ),
        2,
    )

    circle_no = locality.get("circle_no")
    circle_total = circle_totals.get(circle_no) if circle_no is not None else None
    max_circle_total = max(circle_totals.values()) if circle_totals else 0
    activity_index = (
        round(clamp((circle_total / max_circle_total) * 100), 2)
        if circle_total is not None and max_circle_total
        else None
    )

    named_share = percentage(selected_named, selected_count)
    ward_assigned_share = percentage(total_inside_ghmc, total_mapped) if total_mapped else 0.0
    category_support = clamp((city_category_count / CATEGORY_SUPPORT_TARGET) * 100)
    support_layers = sum(1 for cnt in (len(bus_df), len(metro_df), len(school_counts)) if cnt > 0)
    support_availability = (support_layers / 3.0) * 100
    data_completeness = round(
        clamp(
            category_support * 0.35
            + (named_share or 0.0) * 0.25
            + (ward_assigned_share or 0.0) * 0.25
            + support_availability * 0.15
        ),
        2,
    )

    opportunity_index = None
    if not insufficient_data:
        components: list[tuple[float, float]] = []
        if competition_index is not None:
            components.append((100.0 - competition_index, 0.45))
        if activity_index is not None:
            components.append((activity_index, 0.30))
        components.append((access_index, 0.25))
        total_weight = sum(weight for _, weight in components)
        if total_weight:
            opportunity_index = round(
                clamp(sum(value * weight for value, weight in components) / total_weight),
                2,
            )

    category_name = CATEGORY_NAMES.get(category_id, category_id)
    data_status = "insufficient_data" if insufficient_data else "available"
    data_status_message = None
    if insufficient_data:
        data_status_message = (
            "Insufficient data for a reliable assessment. "
            f"The catchment has {selected_count} mapped {category_name} POIs, and the "
            f"citywide mapped count is {city_category_count}. "
            f"A minimum of {MIN_CATCHMENT_COUNT} in the catchment and "
            f"{MIN_CATEGORY_CITY_COUNT} citywide is required for model scores."
        )

    return {
        "locality": {
            "id": locality["id"],
            "name": locality["name"],
            "zone": locality["zone"],
            "latitude": locality["latitude"],
            "longitude": locality["longitude"],
            "coordinate_source": locality["coordinate_source"],
            "is_approximate": bool(locality["is_approximate"]),
            "ward_id": locality["ward_id"],
            "ward_no": locality["ward_no"],
            "circle_no": locality["circle_no"],
            "circle_name": locality["circle_name"],
            "ward_assignment_method": locality["ward_assignment_method"],
            "population_2011": locality["population_2011"],
            "population_note": locality["population_note"],
        },
        "category": {
            "id": category_id,
            "name": category_name,
        },
        "catchment": {
            "type": "circular_radius",
            "center_kind": (
                "business mapped coordinate"
                if center["type"] == "business_mapped_coordinate"
                else "approximate locality reference point"
            ),
            "center_label": center["label"],
            "center_latitude": round(latitude, 6),
            "center_longitude": round(longitude, 6),
            "radius_m": radius_m,
            "radius_km": radius_km,
            "area_km2": round(area_km2, 3),
            "overlap_disclosure": (
                "Catchments may overlap. Do not sum locality counts as unique city totals."
            ),
        },
        "analysis_center": {
            "type": center["type"],
            "label": center["label"],
            "latitude": round(latitude, 6),
            "longitude": round(longitude, 6),
            "nearest_locality_id": center.get("nearest_locality_id"),
            "nearest_locality_name": center.get("nearest_locality_name"),
            "distance_to_nearest_locality_center_m": center.get(
                "distance_to_nearest_locality_center_m"
            ),
            "osm_id": center.get("osm_id"),
        },
        "mapped_poi_count": selected_count,
        "named_poi_count": selected_named,
        "unnamed_poi_count": selected_count - selected_named,
        "named_share_pct": named_share,
        "density_per_sq_km": round(selected_count / area_km2, 2),
        "all_mapped_poi_count_in_catchment": total_mapped,
        "all_poi_count_in_catchment": total_all,
        "category_share_of_mapped_pct": percentage(selected_count, total_mapped),
        "category_mix": category_mix,
        "category_mix_hhi": hhi,
        "unmapped_category_poi_count": total_all - total_mapped,
        "scores": {
            "competition_index": competition_index,
            "activity_index": activity_index,
            "access_index": access_index,
            "opportunity_index": opportunity_index,
            "data_completeness": data_completeness,
        },
        "competition_context": {
            "metric": "selected-category mapped POI count relative to the highest locality count at the same radius",
            "selected_count": selected_count,
            "max_locality_count": max_locality_count,
            "median_locality_count": median_locality_count,
            "locality_count": len(localities),
        },
        "activity_context": {
            "source": "GHMC circle-level reported licence applications, 2022-2023",
            "circle_no": circle_no,
            "circle_name": locality.get("circle_name"),
            "circle_application_total_2022_2023": circle_total,
            "max_circle_application_total_2022_2023": max_circle_total,
            "locality_level_openings_available": False,
        },
        "access_counts": {
            "bus_stops_within_radius": bus_count,
            "metro_stations_within_radius": metro_count,
            "schools_in_assigned_ward": school_count,
            "school_scope": "All UDISE school profile records assigned to the locality's mapped GHMC ward, not a radius count.",
        },
        "data_quality": {
            "city_category_mapped_poi_count": city_category_count,
            "category_support_target": CATEGORY_SUPPORT_TARGET,
            "ward_assigned_share_pct": ward_assigned_share,
            "support_layers_available": support_layers,
            "status": data_status,
            "message": data_status_message,
        },
        "data_status": data_status,
        "data_notes": [
            "Mapped POIs come from OpenStreetMap and are not a verified business register.",
            "Locality centres and circular catchments are approximate; catchments overlap.",
            "Scores are relative model estimates, not market forecasts.",
            "GHMC activity is circle-level 2022-2023 licence application data, not current locality openings.",
            "Schools use the mapped ward because school coordinates are unavailable.",
        ],
        "sources": {
            "businesses": "OpenStreetMap Hyderabad POI extract",
            "wards": "GHMC ward boundary KML",
            "licence_activity": "GHMC trade licence application aggregates",
            "schools": "UDISE+ 2024-25 school profile",
            "bus_stops": "Hyderabad bus stops",
            "metro_stations": "Hyderabad Metro GTFS",
        },
    }


def _locality_analysis_center(locality: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "locality_reference_point",
        "label": locality["name"],
        "latitude": locality["latitude"],
        "longitude": locality["longitude"],
        "nearest_locality_id": locality["id"],
        "nearest_locality_name": locality["name"],
        "distance_to_nearest_locality_center_m": 0.0,
    }


def _point_analysis_center(
    business: dict[str, Any],
    nearest: dict[str, Any],
) -> dict[str, Any]:
    return {
        "type": "business_mapped_coordinate",
        "label": business.get("name") or "Unnamed mapped business",
        "latitude": business["latitude"],
        "longitude": business["longitude"],
        "nearest_locality_id": nearest["id"],
        "nearest_locality_name": nearest["name"],
        "distance_to_nearest_locality_center_m": nearest["distance_m"],
        "osm_id": business["osm_id"],
    }


def locality_market_metrics(
    connection: Any,
    locality_id: str,
    category_id: str | None = None,
    radius_m: int | None = None,
) -> dict[str, Any]:
    radius = validate_radius(radius_m)
    category = get_category_or_raise(category_id)
    locality = get_locality_or_raise(connection, locality_id)

    b_df = _load_businesses(connection)
    bus_df = _load_points_df(connection, "bus_stops")
    metro_df = _load_points_df(connection, "metro_stations")
    localities = list_localities(connection)
    city_counts = city_category_counts(connection)
    circle_totals = _circle_totals(connection)
    school_counts = _school_counts_by_ward(connection)

    snapshot = _selection_context(
        connection,
        locality,
        category["id"],
        radius,
        b_df,
        localities,
        city_counts,
        circle_totals,
        bus_df,
        metro_df,
        school_counts,
        _locality_analysis_center(locality),
    )

    # Attach Machine Learning similarity cluster info
    try:
        from analysis.machine_learning import get_cached_bundle, prescriptive_recommendations

        ml_bundle = get_cached_bundle(connection, category["id"], radius)
        clusters = ml_bundle["clusters"]
        if clusters["status"] == "available" and locality_id in clusters["labels"]:
            c_id = clusters["labels"][locality_id]
            profile = clusters["profile_map"].get(c_id, {})
            snapshot["similarity_cluster"] = {
                "cluster_id": c_id,
                "label": profile.get("label"),
                "description": profile.get("description"),
                "pca_coordinates": clusters["coordinates"].get(locality_id),
            }
            snapshot["prescriptive_recommendations"] = prescriptive_recommendations(
                snapshot,
                clusters.get("medians", {}),
                c_id,
            )
        else:
            snapshot["similarity_cluster"] = {
                "cluster_id": None,
                "label": "Not clustered (insufficient mapped data)",
                "description": "Locality has fewer than 3 mapped businesses for statistical clustering.",
                "pca_coordinates": None,
            }
            snapshot["prescriptive_recommendations"] = prescriptive_recommendations(
                snapshot,
                clusters.get("medians", {}),
                0,
            )
    except Exception:
        pass

    return snapshot


def all_locality_metrics(
    connection: Any,
    category_id: str | None = None,
    radius_m: int | None = None,
) -> dict[str, Any]:
    radius = validate_radius(radius_m)
    category = get_category_or_raise(category_id)

    b_df = _load_businesses(connection)
    bus_df = _load_points_df(connection, "bus_stops")
    metro_df = _load_points_df(connection, "metro_stations")
    localities = list_localities(connection)
    city_counts = city_category_counts(connection)
    circle_totals = _circle_totals(connection)
    school_counts = _school_counts_by_ward(connection)

    # Optional cluster profiles
    clusters_info = {}
    try:
        from analysis.machine_learning import get_cached_bundle

        ml_bundle = get_cached_bundle(connection, category["id"], radius)
        clusters_info = ml_bundle.get("clusters", {})
    except Exception:
        pass

    snapshots = []
    labels = clusters_info.get("labels", {})
    profiles = clusters_info.get("profile_map", {})
    coords = clusters_info.get("coordinates", {})

    for locality in localities:
        snap = _selection_context(
            connection,
            locality,
            category["id"],
            radius,
            b_df,
            localities,
            city_counts,
            circle_totals,
            bus_df,
            metro_df,
            school_counts,
            _locality_analysis_center(locality),
        )
        loc_id = locality["id"]
        if loc_id in labels:
            c_id = labels[loc_id]
            snap["similarity_cluster"] = {
                "cluster_id": c_id,
                "label": profiles.get(c_id, {}).get("label"),
                "pca_coordinates": coords.get(loc_id),
            }
        snapshots.append(snap)

    return {
        "category": {"id": category["id"], "name": category["name"]},
        "radius_m": radius,
        "locality_count": len(snapshots),
        "localities": snapshots,
        "clustering_model": clusters_info.get("model"),
        "data_notes": [
            "Locality centres are approximate and catchments overlap.",
            "Counts are mapped OpenStreetMap POIs, not a verified business register.",
        ],
    }


def business_market_metrics(
    connection: Any,
    osm_id: str,
    category_id: str | None = None,
    radius_m: int | None = None,
) -> dict[str, Any]:
    radius = validate_radius(radius_m)
    business = get_business_or_raise(connection, osm_id)
    if business["latitude"] is None or business["longitude"] is None:
        raise ValueError("This business has no usable mapped coordinates.")
    selected_category_id = category_id or business.get("category_id")
    if not selected_category_id:
        raise ValueError("This business has no supported category.")
    category = get_category_or_raise(selected_category_id)
    nearest = nearest_locality(
        connection,
        business["latitude"],
        business["longitude"],
    )
    if nearest is None:
        raise RuntimeError("No locality reference points are available.")

    b_df = _load_businesses(connection)
    b_df = b_df[b_df["osm_id"] != osm_id].reset_index(drop=True)
    bus_df = _load_points_df(connection, "bus_stops")
    metro_df = _load_points_df(connection, "metro_stations")
    localities = list_localities(connection)
    city_counts = city_category_counts(connection)
    circle_totals = _circle_totals(connection)
    school_counts = _school_counts_by_ward(connection)

    snapshot = _selection_context(
        connection,
        nearest,
        category["id"],
        radius,
        b_df,
        localities,
        city_counts,
        circle_totals,
        bus_df,
        metro_df,
        school_counts,
        _point_analysis_center(business, nearest),
    )
    snapshot["business"] = {
        "osm_id": business["osm_id"],
        "name": business["name"],
        "name_status": business["name_status"],
        "category_id": business["category_id"],
        "category_name": business["category_name"],
        "latitude": round(business["latitude"], 6),
        "longitude": round(business["longitude"], 6),
        "inside_ghmc": business["inside_ghmc"],
        "nearest_locality_id": nearest["id"],
        "nearest_locality_name": nearest["name"],
        "nearest_locality_distance_m": nearest["distance_m"],
        "coordinate_note": (
            "The business location is its OpenStreetMap mapped coordinate. "
            "Locality context uses the nearest reference-point centre."
        ),
    }
    return snapshot


def city_overview(
    connection: Any,
    category_id: str | None = None,
    radius_m: int | None = None,
) -> dict[str, Any]:
    radius = validate_radius(radius_m)
    category = get_category_or_raise(category_id)
    counts = city_category_counts(connection)
    total_mapped = sum(item["mapped_poi_count"] for item in counts.values())
    total_inside = sum(item["inside_ghmc_count"] for item in counts.values())
    total_named = sum(item["named_count"] for item in counts.values())
    category_stats = counts[category["id"]]

    localities = list_localities(connection)
    b_df = _load_businesses(connection)

    cat_b = b_df[b_df["category_id"] == category["id"]]
    cat_lats = cat_b["latitude"].to_numpy(dtype=float)
    cat_lons = cat_b["longitude"].to_numpy(dtype=float)

    locality_counts = {}
    radius_km = radius / 1000.0
    for loc in localities:
        d = _haversine_km(loc["latitude"], loc["longitude"], cat_lats, cat_lons)
        locality_counts[loc["id"]] = int(np.sum(d <= radius_km))

    named_by_id = {loc["id"]: loc["name"] for loc in localities}
    top_localities = [
        {
            "id": loc_id,
            "name": named_by_id[loc_id],
            "mapped_poi_count": count,
        }
        for loc_id, count in sorted(
            locality_counts.items(),
            key=lambda item: (-item[1], named_by_id[item[0]]),
        )[:5]
    ]
    total_pois = connection.execute("SELECT COUNT(*) AS count FROM businesses").fetchone()["count"]
    unnamed_total = connection.execute(
        "SELECT COUNT(*) AS count FROM businesses WHERE name_status = 'unnamed'"
    ).fetchone()["count"]

    return {
        "category": {"id": category["id"], "name": category["name"]},
        "city": {
            "mapped_poi_count": total_mapped,
            "inside_ghmc_count": total_inside,
            "named_poi_count": total_named,
            "unnamed_poi_count": unnamed_total,
            "total_poi_records": total_pois,
            "mapped_category_coverage_pct": percentage(total_mapped, total_pois),
        },
        "selected_category": {
            "id": category["id"],
            "name": category["name"],
            "mapped_poi_count": category_stats["mapped_poi_count"],
            "inside_ghmc_count": category_stats["inside_ghmc_count"],
            "named_count": category_stats["named_count"],
            "named_share_pct": percentage(
                category_stats["named_count"],
                category_stats["mapped_poi_count"],
            ),
            "share_of_mapped_pct": percentage(
                category_stats["mapped_poi_count"],
                total_mapped,
            ),
        },
        "category_counts": [
            {
                "category_id": definition["id"],
                "category_name": definition["name"],
                **counts[definition["id"]],
                "share_of_mapped_pct": percentage(
                    counts[definition["id"]]["mapped_poi_count"],
                    total_mapped,
                ),
            }
            for definition in CATEGORY_BY_ID.values()
        ],
        "top_localities_by_selected_category": top_localities,
        "radius_m": radius,
        "data_status": (
            "insufficient_data"
            if category_stats["mapped_poi_count"] < MIN_CATEGORY_CITY_COUNT
            else "available"
        ),
        "data_notes": [
            "Counts are mapped OpenStreetMap POIs, not a verified business register.",
            "Top localities use approximate centre points and overlapping catchments.",
            "GHMC licence data is not part of these city POI counts.",
        ],
        "sources": {
            "businesses": "OpenStreetMap Hyderabad POI extract",
            "wards": "GHMC ward boundary KML",
        },
    }
