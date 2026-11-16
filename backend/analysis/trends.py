"""GHMC application and Google Trends summaries built from recorded data."""

from __future__ import annotations

from collections import defaultdict
from typing import Any

from data.data_cleaning import CATEGORY_BY_ID, percentage, round_or_none


TREND_CATEGORY_IDS = {"restaurants", "grocery", "fashion", "pharmacy", "fitness"}


def _monthly_activity(connection: Any, circle_no: int | None) -> list[dict[str, Any]]:
    if circle_no is None:
        rows = connection.execute(
            """
            SELECT year, month, SUM(applications) AS applications
            FROM trade_license_monthly
            GROUP BY year, month
            ORDER BY year, month
            """
        ).fetchall()
    else:
        rows = connection.execute(
            """
            SELECT year, month, SUM(applications) AS applications
            FROM trade_license_monthly
            WHERE circle_no = ?
            GROUP BY year, month
            ORDER BY year, month
            """,
            (circle_no,),
        ).fetchall()
    return [
        {
            "year": int(row["year"]),
            "month": int(row["month"]),
            "period": f"{int(row['year']):04d}-{int(row['month']):02d}",
            "applications": int(row["applications"] or 0),
        }
        for row in rows
    ]


def _annual_totals(monthly: list[dict[str, Any]]) -> list[dict[str, Any]]:
    totals: dict[int, int] = defaultdict(int)
    for row in monthly:
        totals[row["year"]] += row["applications"]
    return [
        {"year": year, "applications": applications}
        for year, applications in sorted(totals.items())
    ]


def _circle_comparison(connection: Any, circle_no: int | None) -> list[dict[str, Any]]:
    if circle_no is None:
        rows = connection.execute(
            """
            SELECT circle_no, circle_name, year, SUM(applications) AS applications
            FROM trade_license_monthly
            GROUP BY circle_no, circle_name, year
            ORDER BY circle_no, year
            """
        ).fetchall()
    else:
        rows = connection.execute(
            """
            SELECT circle_no, circle_name, year, SUM(applications) AS applications
            FROM trade_license_monthly
            WHERE circle_no = ?
            GROUP BY circle_no, circle_name, year
            ORDER BY circle_no, year
            """,
            (circle_no,),
        ).fetchall()
    circles: dict[int, dict[str, Any]] = {}
    for row in rows:
        circle_id = int(row["circle_no"])
        entry = circles.setdefault(
            circle_id,
            {
                "circle_no": circle_id,
                "circle_name": row["circle_name"],
                "applications_by_year": {},
            },
        )
        entry["applications_by_year"][str(int(row["year"]))] = int(
            row["applications"] or 0
        )
    result = []
    for entry in circles.values():
        year_values = entry["applications_by_year"]
        value_2022 = year_values.get("2022")
        value_2023 = year_values.get("2023")
        change = None
        if value_2022 is not None and value_2023 is not None:
            change = percentage(value_2023 - value_2022, value_2022)
        result.append(
            {
                **entry,
                "total_2022_2023": sum(year_values.values()),
                "yoy_change_2022_to_2023_pct": change,
            }
        )
    result.sort(key=lambda item: (-item["total_2022_2023"], item["circle_name"]))
    return result


def _google_trends(connection: Any, category_id: str) -> dict[str, Any] | None:
    if category_id not in TREND_CATEGORY_IDS:
        return None
    rows = connection.execute(
        """
        SELECT term, term_label, mapped_category_id, week_start, interest
        FROM search_trends
        WHERE mapped_category_id = ?
        ORDER BY week_start
        """,
        (category_id,),
    ).fetchall()
    if not rows:
        return None
    weekly = [
        {
            "week_start": row["week_start"],
            "interest": int(row["interest"]),
        }
        for row in rows
    ]
    monthly_values: dict[str, list[int]] = defaultdict(list)
    for row in rows:
        monthly_values[row["week_start"][:7]].append(int(row["interest"]))
    monthly = [
        {
            "period": period,
            "average_interest": round(sum(values) / len(values), 2),
        }
        for period, values in sorted(monthly_values.items())
    ]
    latest_week = weekly[-1]["week_start"]
    latest_interest = weekly[-1]["interest"]
    recent = [row["interest"] for row in weekly[-52:]]
    previous = [row["interest"] for row in weekly[-104:-52]]
    recent_average = sum(recent) / len(recent) if recent else None
    previous_average = sum(previous) / len(previous) if previous else None
    yoy_change = None
    if recent_average is not None and previous_average:
        yoy_change = percentage(recent_average - previous_average, previous_average)
    return {
        "term": rows[0]["term"],
        "term_label": rows[0]["term_label"],
        "mapped_category_id": category_id,
        "scale": "0-100 relative search interest",
        "geography_scope": "Telangana",
        "latest_week": latest_week,
        "latest_interest": latest_interest,
        "recent_52_week_average": round_or_none(recent_average),
        "previous_52_week_average": round_or_none(previous_average),
        "last_52_weeks_vs_previous_52_weeks_change_pct": yoy_change,
        "weekly": weekly,
        "monthly": monthly,
        "note": (
            "Google Trends values are relative interest, not search volume, "
            "customers, revenue, or market demand."
        ),
    }


def trends_overview(
    connection: Any,
    category_id: str | None = None,
    circle_no: int | None = None,
) -> dict[str, Any]:
    selected_id = category_id or "cafes"
    if selected_id not in CATEGORY_BY_ID:
        raise ValueError(f"Unknown category: {selected_id}")
    monthly = _monthly_activity(connection, circle_no)
    annual = _annual_totals(monthly)
    if circle_no is not None and not monthly:
        raise ValueError(f"Unknown GHMC circle number: {circle_no}")
    annual_by_year = {row["year"]: row["applications"] for row in annual}
    value_2022 = annual_by_year.get(2022)
    value_2023 = annual_by_year.get(2023)
    yoy_change = None
    if value_2022 is not None and value_2023 is not None:
        yoy_change = percentage(value_2023 - value_2022, value_2022)
    circles = _circle_comparison(connection, circle_no)
    google_trends = _google_trends(connection, selected_id)
    return {
        "category": {
            "id": selected_id,
            "name": CATEGORY_BY_ID[selected_id]["name"],
        },
        "ghmc_licence_activity": {
            "source": "GHMC monthly trade licence application aggregates",
            "reference_years": [2022, 2023],
            "monthly": monthly,
            "annual_totals": annual,
            "yoy_change_2022_to_2023_pct": yoy_change,
            "circles": circles,
            "circle_count": len(circles),
            "data_notes": [
                "Values are reported licence applications, not approved business openings.",
                "The data is aggregated by GHMC circle and cannot identify locality-level openings.",
                "GHMC data covers 2022-2023 and is not a current market growth series.",
            ],
        },
        "google_trends": google_trends,
        "google_trends_available": google_trends is not None,
        "google_trends_note": (
            None
            if google_trends is not None
            else "No Google Trends term is mapped to this category in the supplied dataset. "
            "Available trend categories are restaurants, grocery, fashion, pharmacy, and fitness."
        ),
        "data_status": "available" if monthly or google_trends else "insufficient_data",
    }
