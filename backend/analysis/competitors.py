"""Nearby mapped competitors without invented ratings, sales, or market share."""

from __future__ import annotations

from typing import Any

from analysis import market
from data.data_cleaning import haversine_km, percentage


def _competitor_rows_at(
    connection: Any,
    latitude: float,
    longitude: float,
    category_id: str,
    radius_m: int,
    exclude_osm_id: str | None = None,
) -> list[dict[str, Any]]:
    rows = connection.execute(
        """
        SELECT osm_id, name, name_status, subtype, osm_key, osm_value,
               latitude, longitude, ward_id, inside_ghmc
        FROM businesses
        WHERE category_id = ?
        """,
        (category_id,),
    ).fetchall()
    radius_km = radius_m / 1000.0
    competitors: list[dict[str, Any]] = []
    for row in rows:
        if exclude_osm_id is not None and row["osm_id"] == exclude_osm_id:
            continue
        distance_km = haversine_km(
            latitude,
            longitude,
            row["latitude"],
            row["longitude"],
        )
        if distance_km > radius_km:
            continue
        competitors.append(
            {
                "osm_id": row["osm_id"],
                "name": row["name"],
                "display_name": row["name"] or "Unnamed mapped outlet",
                "name_status": row["name_status"],
                "subtype": row["subtype"],
                "osm_key": row["osm_key"],
                "osm_value": row["osm_value"],
                "latitude": row["latitude"],
                "longitude": row["longitude"],
                "distance_m": round(distance_km * 1000.0, 1),
                "ward_id": row["ward_id"],
                "inside_ghmc": bool(row["inside_ghmc"]),
            }
        )
    competitors.sort(
        key=lambda item: (
            item["distance_m"],
            0 if item["name_status"] == "named" else 1,
            (item["name"] or "").lower(),
            item["osm_id"],
        )
    )
    return competitors


def _competitor_payload(
    snapshot: dict[str, Any],
    competitors: list[dict[str, Any]],
    limit: int,
) -> dict[str, Any]:
    unnamed_count = sum(1 for row in competitors if row["name_status"] == "unnamed")
    return {
        "locality": snapshot["locality"],
        "analysis_center": snapshot["analysis_center"],
        "category": snapshot["category"],
        "catchment": snapshot["catchment"],
        "competitor_count": len(competitors),
        "returned_count": min(len(competitors), max(1, limit)),
        "limit": max(1, limit),
        "unnamed_competitor_count": unnamed_count,
        "unnamed_competitor_share_pct": percentage(unnamed_count, len(competitors)),
        "category_mix": snapshot["category_mix"],
        "category_mix_hhi": snapshot["category_mix_hhi"],
        "category_mix_hhi_note": (
            "HHI here measures concentration across mapped POI categories. "
            "It is not revenue market share."
        ),
        "competitors": competitors[: max(1, limit)],
        "data_status": snapshot["data_status"],
        "data_notes": [
            "Competitor rows are mapped OpenStreetMap POIs in the selected category.",
            "Ratings, reviews, sales, revenue, and closure status are unavailable and were not estimated.",
            "Unnamed mapped outlets are shown with an explicit 'Unnamed mapped outlet' label.",
            "Schools, hospitals, bus stops, and metro stations are supporting facilities and are excluded from competitor counts.",
            "Distances are straight-line distances from the selected analysis centre.",
        ],
        "supporting_facilities_excluded": [
            "schools",
            "hospitals",
            "bus stops",
            "metro stations",
        ],
        "source_attribution": "© OpenStreetMap contributors; GHMC ward boundaries; UDISE+; Hyderabad transport datasets",
    }


def nearby_competitors(
    connection: Any,
    locality_id: str,
    category_id: str | None = None,
    radius_m: int | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    radius = market.validate_radius(radius_m)
    category = market.get_category_or_raise(category_id)
    locality = market.get_locality_or_raise(connection, locality_id)
    snapshot = market.locality_market_metrics(
        connection,
        locality_id,
        category["id"],
        radius,
    )
    competitors = _competitor_rows_at(
        connection,
        locality["latitude"],
        locality["longitude"],
        category["id"],
        radius,
    )
    return _competitor_payload(snapshot, competitors, limit)


def nearby_competitors_for_business(
    connection: Any,
    osm_id: str,
    category_id: str | None = None,
    radius_m: int | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    snapshot = market.business_market_metrics(
        connection,
        osm_id,
        category_id,
        radius_m,
    )
    center = snapshot["analysis_center"]
    competitors = _competitor_rows_at(
        connection,
        center["latitude"],
        center["longitude"],
        snapshot["category"]["id"],
        snapshot["catchment"]["radius_m"],
        exclude_osm_id=osm_id,
    )
    payload = _competitor_payload(snapshot, competitors, limit)
    payload["business"] = snapshot["business"]
    return payload
