"""Side-by-side locality comparison on real mapped-data metrics and similarity clusters."""

from __future__ import annotations

from typing import Any

from analysis import market

MAX_COMPARISON_LOCALITIES = 4


def compare_localities(
    connection: Any,
    locality_ids: list[str],
    category_id: str | None = None,
    radius_m: int | None = None,
) -> dict[str, Any]:
    unique_ids = []
    for locality_id in locality_ids:
        if locality_id in unique_ids:
            raise ValueError(f"Duplicate locality in comparison: {locality_id}")
        unique_ids.append(locality_id)
    if not 2 <= len(unique_ids) <= MAX_COMPARISON_LOCALITIES:
        raise ValueError(
            f"Select between 2 and {MAX_COMPARISON_LOCALITIES} unique localities"
        )
    snapshot_list = [
        market.locality_market_metrics(
            connection,
            locality_id,
            category_id,
            radius_m,
        )
        for locality_id in unique_ids
    ]
    category = snapshot_list[0]["category"]
    radius = snapshot_list[0]["catchment"]["radius_m"]
    return {
        "category": category,
        "radius_m": radius,
        "localities": [
            {
                "locality": snapshot["locality"],
                "catchment": snapshot["catchment"],
                "mapped_poi_count": snapshot["mapped_poi_count"],
                "named_poi_count": snapshot["named_poi_count"],
                "unnamed_poi_count": snapshot["unnamed_poi_count"],
                "named_share_pct": snapshot["named_share_pct"],
                "density_per_sq_km": snapshot["density_per_sq_km"],
                "category_share_of_mapped_pct": snapshot["category_share_of_mapped_pct"],
                "category_mix_hhi": snapshot["category_mix_hhi"],
                "scores": snapshot["scores"],
                "competition_context": snapshot["competition_context"],
                "activity_context": snapshot["activity_context"],
                "access_counts": snapshot["access_counts"],
                "similarity_cluster": snapshot.get("similarity_cluster"),
                "prescriptive_recommendations": snapshot.get("prescriptive_recommendations", []),
                "data_status": snapshot["data_status"],
                "data_quality": snapshot["data_quality"],
                "data_notes": snapshot["data_notes"],
            }
            for snapshot in snapshot_list
        ],
        "comparison_note": (
            "Catchments are approximate and overlap. Metrics are not additive across "
            "localities, and scores are relative model estimates rather than forecasts."
        ),
        "data_notes": [
            "Business counts are mapped OpenStreetMap POIs, not a verified register.",
            "Rent benchmarks and rental affordability are intentionally excluded.",
            "Footfall, closures, and sales are not available in the supplied datasets.",
            "Activity uses GHMC circle-level 2022-2023 licence applications.",
            "Locality similarity clusters are computed via K-Means and Ward hierarchical linkage on standardized infrastructure features.",
        ],
        "sources": snapshot_list[0]["sources"],
    }
