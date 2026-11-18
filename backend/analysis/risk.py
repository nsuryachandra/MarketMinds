"""Category-specific directional risk estimates with visible weights."""

from __future__ import annotations

from typing import Any

from analysis import market
from data.data_cleaning import clamp


def _risk_band(score: float | None) -> str:
    if score is None:
        return "insufficient_data"
    if score < 30:
        return "low"
    if score < 50:
        return "moderate"
    if score < 70:
        return "elevated"
    return "high"


def _factor(
    key: str,
    label: str,
    signal_value: float | None,
    risk_points: float | None,
    configured_weight: float,
    explanation: str,
) -> dict[str, Any]:
    return {
        "key": key,
        "label": label,
        "signal_value": (
            round(signal_value, 2) if signal_value is not None else None
        ),
        "risk_points": (
            round(risk_points, 2) if risk_points is not None else None
        ),
        "configured_weight": configured_weight,
        "applied_weight": None,
        "explanation": explanation,
    }


def _risk_from_snapshot(
    snapshot: dict[str, Any],
    category: dict[str, Any],
    monthly_rent: float | None = None,
    staff_expenses: float | None = None,
    other_monthly_expenses: float | None = None,
    expected_monthly_revenue: float | None = None,
) -> dict[str, Any]:
    weights = category["risk_weights"]
    scores = snapshot["scores"]
    factors = [
        _factor(
            "competition",
            "Mapped competitive supply",
            scores["competition_index"],
            scores["competition_index"],
            weights["competition"],
            (
                "Higher relative mapped-outlet count in the selected category. "
                "This is not a sales or saturation measure."
            ),
        ),
        _factor(
            "activity",
            "GHMC circle activity",
            scores["activity_index"],
            100.0 - scores["activity_index"]
            if scores["activity_index"] is not None
            else None,
            weights["activity"],
            (
                "Lower recorded 2022-2023 circle-level licence application activity "
                "raises directional uncertainty. This is not locality-level demand."
            ),
        ),
        _factor(
            "access",
            "Accessibility context",
            scores["access_index"],
            100.0 - scores["access_index"]
            if scores["access_index"] is not None
            else None,
            weights["access"],
            (
                "Lower relative access to mapped bus stops, metro stations, and "
                "assigned-ward schools raises directional pressure."
            ),
        ),
        _factor(
            "data_quality",
            "Mapped-data completeness",
            scores["data_completeness"],
            100.0 - scores["data_completeness"]
            if scores["data_completeness"] is not None
            else None,
            weights["data_quality"],
            (
                "Lower mapped-data completeness increases uncertainty in the other "
                "factors. It is not a market-risk measurement by itself."
            ),
        ),
    ]

    if expected_monthly_revenue is not None:
        if expected_monthly_revenue <= 0:
            raise ValueError("expected_monthly_revenue must be greater than zero")
        expenses = (
            (monthly_rent or 0.0)
            + (staff_expenses or 0.0)
            + (other_monthly_expenses or 0.0)
        )
        cost_ratio = expenses / expected_monthly_revenue
        financial_risk = clamp(cost_ratio * 100)
        factors.insert(
            3,
            _factor(
                "financial",
                "User-supplied operating cost pressure",
                round(cost_ratio * 100, 2),
                round(financial_risk, 2),
                weights["financial"],
                (
                    "Operating costs divided by expected monthly revenue from the "
                    "user's own assumptions. Taxes, financing, and depreciation are excluded."
                ),
            ),
        )
    else:
        factors.insert(
            3,
            _factor(
                "financial",
                "User-supplied operating cost pressure",
                None,
                None,
                weights["financial"],
                "Not applied because no expected monthly revenue was supplied.",
            ),
        )

    available_factors = [
        factor for factor in factors if factor["risk_points"] is not None
    ]
    total_applied_weight = sum(
        factor["configured_weight"] for factor in available_factors
    )
    for factor in factors:
        if (
            factor["risk_points"] is not None
            and total_applied_weight > 0
        ):
            factor["applied_weight"] = round(
                factor["configured_weight"] / total_applied_weight,
                4,
            )

    insufficient = snapshot["data_status"] == "insufficient_data"
    risk_score = None
    if not insufficient and total_applied_weight > 0:
        risk_score = round(
            sum(
                factor["risk_points"] * factor["applied_weight"]
                for factor in available_factors
                if factor["applied_weight"] is not None
            ),
            2,
        )
    message = None
    if insufficient:
        message = snapshot["data_quality"]["message"]
    elif risk_score is not None:
        message = (
            "Directional estimate built from relative mapped-data signals. "
            "It is not a prediction of business failure or profit."
        )

    result = {
        "locality": snapshot["locality"],
        "analysis_center": snapshot["analysis_center"],
        "category": snapshot["category"],
        "catchment": snapshot["catchment"],
        "risk_score": risk_score,
        "risk_band": _risk_band(risk_score),
        "data_status": "insufficient_data" if insufficient else "available",
        "message": message,
        "factor_weights_configured": dict(weights),
        "factors": factors,
        "financial_inputs": {
            "monthly_rent": monthly_rent,
            "staff_expenses": staff_expenses,
            "other_monthly_expenses": other_monthly_expenses,
            "expected_monthly_revenue": expected_monthly_revenue,
            "financial_factor_applied": expected_monthly_revenue is not None,
        },
        "inputs_used": {
            "mapped_poi_count": snapshot["mapped_poi_count"],
            "competition_index": scores["competition_index"],
            "activity_index": scores["activity_index"],
            "access_index": scores["access_index"],
            "data_completeness": scores["data_completeness"],
            "circle_no": snapshot["activity_context"]["circle_no"],
            "circle_name": snapshot["activity_context"]["circle_name"],
        },
        "data_notes": [
            "Risk is a directional model estimate, not a factual probability.",
            "Higher scores mean more directional pressure, not expected failure.",
            "Category-specific weights differ by business type.",
            "Rent is used only from user inputs; no rent benchmark exists in the datasets.",
            "GHMC activity is circle-level and refers to 2022-2023 applications.",
            "No fabricated footfall, sales, revenue, ratings, or locality population is used.",
        ],
        "sources": snapshot["sources"],
    }
    if snapshot.get("business") is not None:
        result["business"] = snapshot["business"]
    return result


def estimate_risk(
    connection: Any,
    locality_id: str,
    category_id: str | None = None,
    radius_m: int | None = None,
    monthly_rent: float | None = None,
    staff_expenses: float | None = None,
    other_monthly_expenses: float | None = None,
    expected_monthly_revenue: float | None = None,
) -> dict[str, Any]:
    category = market.get_category_or_raise(category_id)
    snapshot = market.locality_market_metrics(
        connection,
        locality_id,
        category["id"],
        radius_m,
    )
    return _risk_from_snapshot(
        snapshot,
        category,
        monthly_rent,
        staff_expenses,
        other_monthly_expenses,
        expected_monthly_revenue,
    )


def estimate_risk_for_business(
    connection: Any,
    osm_id: str,
    category_id: str | None = None,
    radius_m: int | None = None,
    monthly_rent: float | None = None,
    staff_expenses: float | None = None,
    other_monthly_expenses: float | None = None,
    expected_monthly_revenue: float | None = None,
) -> dict[str, Any]:
    snapshot = market.business_market_metrics(
        connection,
        osm_id,
        category_id,
        radius_m,
    )
    category = market.get_category_or_raise(snapshot["category"]["id"])
    return _risk_from_snapshot(
        snapshot,
        category,
        monthly_rent,
        staff_expenses,
        other_monthly_expenses,
        expected_monthly_revenue,
    )
