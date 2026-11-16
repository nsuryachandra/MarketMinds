"""Transparent financial feasibility calculations from user inputs only."""

from __future__ import annotations

from typing import Any


SCENARIO_MULTIPLIERS = {
    "conservative": 0.85,
    "base": 1.0,
    "optimistic": 1.15,
}
CASH_FLOW_MONTHS = 12


def _money(value: float) -> float:
    return round(value, 2)


def _validated_non_negative(value: float | None, name: str) -> float:
    if value is None:
        raise ValueError(f"{name} is required")
    if value < 0:
        raise ValueError(f"{name} cannot be negative")
    return float(value)


def estimate_financials(
    method: str,
    monthly_rent: float,
    staff_expenses: float,
    other_monthly_expenses: float,
    initial_investment: float,
    expected_monthly_revenue: float | None = None,
    daily_customers: float | None = None,
    average_selling_price: float | None = None,
    working_days: int = 26,
) -> dict[str, Any]:
    if method not in {"revenue", "customers"}:
        raise ValueError("method must be 'revenue' or 'customers'")
    rent = _validated_non_negative(monthly_rent, "monthly_rent")
    staff = _validated_non_negative(staff_expenses, "staff_expenses")
    other = _validated_non_negative(other_monthly_expenses, "other_monthly_expenses")
    investment = _validated_non_negative(initial_investment, "initial_investment")
    if not 1 <= int(working_days) <= 31:
        raise ValueError("working_days must be between 1 and 31")
    working_days = int(working_days)
    monthly_operating_costs = rent + staff + other

    if method == "revenue":
        if expected_monthly_revenue is None or expected_monthly_revenue <= 0:
            raise ValueError("expected_monthly_revenue must be greater than zero")
        base_monthly_revenue = float(expected_monthly_revenue)
        method_inputs = {
            "expected_monthly_revenue": base_monthly_revenue,
        }
        break_even_customers_per_day = None
    else:
        if daily_customers is None or daily_customers <= 0:
            raise ValueError("daily_customers must be greater than zero")
        if average_selling_price is None or average_selling_price <= 0:
            raise ValueError("average_selling_price must be greater than zero")
        daily_customers = float(daily_customers)
        average_selling_price = float(average_selling_price)
        base_monthly_revenue = daily_customers * average_selling_price * working_days
        method_inputs = {
            "daily_customers": daily_customers,
            "average_selling_price": average_selling_price,
            "working_days": working_days,
        }
        break_even_customers_per_day = (
            monthly_operating_costs / (average_selling_price * working_days)
        )

    scenarios: dict[str, Any] = {}
    for name, multiplier in SCENARIO_MULTIPLIERS.items():
        monthly_revenue = base_monthly_revenue * multiplier
        monthly_profit = monthly_revenue - monthly_operating_costs
        margin_pct = (
            (monthly_profit / monthly_revenue) * 100 if monthly_revenue > 0 else None
        )
        payback_months = (
            investment / monthly_profit if monthly_profit > 0 else None
        )
        cash_flow = []
        cumulative_profit = 0.0
        for month in range(1, CASH_FLOW_MONTHS + 1):
            cumulative_profit += monthly_profit
            cash_flow.append(
                {
                    "month": month,
                    "monthly_revenue": _money(monthly_revenue),
                    "monthly_costs": _money(monthly_operating_costs),
                    "monthly_profit": _money(monthly_profit),
                    "cumulative_operating_profit": _money(cumulative_profit),
                    "cumulative_cash_after_investment": _money(
                        cumulative_profit - investment
                    ),
                }
            )
        scenarios[name] = {
            "revenue_multiplier": multiplier,
            "monthly_revenue": _money(monthly_revenue),
            "monthly_operating_costs": _money(monthly_operating_costs),
            "monthly_profit": _money(monthly_profit),
            "margin_pct": round(margin_pct, 2) if margin_pct is not None else None,
            "annual_revenue": _money(monthly_revenue * 12),
            "annual_operating_costs": _money(monthly_operating_costs * 12),
            "annual_profit": _money(monthly_profit * 12),
            "break_even_revenue": _money(monthly_operating_costs),
            "break_even_customers_per_day": (
                round(break_even_customers_per_day, 2)
                if break_even_customers_per_day is not None
                else None
            ),
            "monthly_break_even": monthly_profit >= 0,
            "investment_payback_months": (
                round(payback_months, 2) if payback_months is not None else None
            ),
            "investment_payback_within_12_months": bool(
                payback_months is not None and payback_months <= 12
            ),
            "cash_flow_projection": cash_flow,
        }

    return {
        "currency": "INR",
        "method": method,
        "method_inputs": method_inputs,
        "cost_inputs": {
            "monthly_rent": _money(rent),
            "staff_expenses": _money(staff),
            "other_monthly_expenses": _money(other),
            "initial_investment": _money(investment),
            "monthly_operating_costs": _money(monthly_operating_costs),
        },
        "base_monthly_revenue": _money(base_monthly_revenue),
        "scenarios": scenarios,
        "assumptions": {
            "scenario_revenue_multipliers": SCENARIO_MULTIPLIERS,
            "costs_held_constant_across_scenarios": True,
            "working_days_per_month": working_days,
            "cash_flow_projection_months": CASH_FLOW_MONTHS,
            "taxes_financing_depreciation_and_variable_cost_of_goods_excluded": True,
            "all_revenue_and_cost_values_are_user_supplied": True,
        },
        "data_notes": [
            "No rent benchmark, footfall, sales, or demand value was inferred from the datasets.",
            "Scenario multipliers are transparent planning assumptions, not market forecasts.",
            "Payback is initial investment divided by positive monthly operating profit.",
            "The model excludes taxes, financing costs, depreciation, and cost-of-goods changes.",
        ],
    }
