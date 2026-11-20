"""MarketMinds FastAPI application."""

from __future__ import annotations

import asyncio
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Literal

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from analysis import (
    competitors,
    financial,
    location,
    machine_learning,
    market,
    risk,
    search,
    trends,
)
from assistant import AssistantError, chat as assistant_chat, get_configuration
from data.data_cleaning import (
    CATEGORY_BY_ID,
    DEFAULT_RADIUS_M,
    RADIUS_OPTIONS_M,
    categories_metadata,
)
from data.data_loader import run_imports
from database import DB_PATH, get_connection, table_counts


API_VERSION = "v1"
APPLICATION_NAME = "MarketMinds API"


class RiskRequest(BaseModel):
    locality: str = Field(..., min_length=1)
    category: str = "cafes"
    radius_m: int = DEFAULT_RADIUS_M
    monthly_rent: float | None = Field(default=None, ge=0)
    staff_expenses: float | None = Field(default=None, ge=0)
    other_monthly_expenses: float | None = Field(default=None, ge=0)
    expected_monthly_revenue: float | None = Field(default=None, gt=0)


class FinancialEstimateRequest(BaseModel):
    method: Literal["revenue", "customers"]
    monthly_rent: float = Field(..., ge=0)
    staff_expenses: float = Field(..., ge=0)
    other_monthly_expenses: float = Field(..., ge=0)
    initial_investment: float = Field(..., ge=0)
    expected_monthly_revenue: float | None = Field(default=None, gt=0)
    daily_customers: float | None = Field(default=None, gt=0)
    average_selling_price: float | None = Field(default=None, gt=0)
    working_days: int = Field(default=26, ge=1, le=31)


class SearchInterpretRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=240)
    locality_id: str | None = Field(default=None, min_length=1)


class BusinessRiskRequest(BaseModel):
    osm_id: str = Field(..., min_length=1)
    category: str | None = None
    radius_m: int = DEFAULT_RADIUS_M
    monthly_rent: float | None = Field(default=None, ge=0)
    staff_expenses: float | None = Field(default=None, ge=0)
    other_monthly_expenses: float | None = Field(default=None, ge=0)
    expected_monthly_revenue: float | None = Field(default=None, gt=0)


class AssistantMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=12_000)


class AssistantChatRequest(BaseModel):
    messages: list[AssistantMessage] = Field(..., min_length=1, max_length=20)
    context: dict[str, Any] = Field(default_factory=dict)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.import_results = run_imports()
    yield


app = FastAPI(
    title=APPLICATION_NAME,
    version="0.1.0",
    description=(
        "Data-backed Hyderabad market intelligence API. "
        "Mapped POIs, GHMC licence aggregates, UDISE schools, transport access, "
        "and Google Trends relative interest are returned with source limitations."
    ),
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def get_db():
    connection = get_connection()
    try:
        yield connection
    finally:
        connection.close()


def _error_payload(code: str, message: str, details: Any = None) -> dict[str, Any]:
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details,
        }
    }


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exception: HTTPException) -> JSONResponse:
    code = "http_error"
    if exception.status_code == 404:
        code = "not_found"
    elif exception.status_code == 422:
        code = "unprocessable_request"
    return JSONResponse(
        status_code=exception.status_code,
        content=_error_payload(code, str(exception.detail)),
    )


@app.exception_handler(AssistantError)
async def assistant_exception_handler(
    request: Request,
    exception: AssistantError,
) -> JSONResponse:
    return JSONResponse(
        status_code=exception.status_code,
        content=_error_payload(exception.code, exception.message),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exception: RequestValidationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=_error_payload(
            "validation_error",
            "Request validation failed.",
            jsonable_encoder(exception.errors()),
        ),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exception: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content=_error_payload(
            "internal_error",
            "An unexpected server error occurred.",
        ),
    )


def _client_error(error: ValueError) -> HTTPException:
    message = str(error)
    status_code = 422
    if (
        message.startswith("Unknown locality")
        or message.startswith("Unknown GHMC circle")
        or message.startswith("Unknown business")
    ):
        status_code = 404
    return HTTPException(status_code=status_code, detail=message)


@app.get("/api/v1/health")
def health(request: Request, connection: Any = Depends(get_db)) -> dict[str, Any]:
    source_rows = connection.execute(
        """
        SELECT ds.source_id, ds.name, ds.last_loaded_at, ds.record_count,
               (
                   SELECT il.status
                   FROM import_logs AS il
                   WHERE il.source_id = ds.source_id
                   ORDER BY il.id DESC
                   LIMIT 1
               ) AS latest_status
        FROM data_sources AS ds
        ORDER BY ds.source_id
        """
    ).fetchall()
    sources = [dict(row) for row in source_rows]
    counts = table_counts(connection)
    failed_sources = [
        source for source in sources if source["latest_status"] == "failed"
    ]
    loaded_sources = [
        source for source in sources if source["latest_status"] == "success"
    ]
    return {
        "status": "ok" if counts["businesses"] > 0 else "degraded",
        "application": APPLICATION_NAME,
        "api_version": API_VERSION,
        "database_path": str(DB_PATH),
        "database_ready": counts["businesses"] > 0,
        "table_counts": counts,
        "sources": {
            "total": len(sources),
            "loaded": len(loaded_sources),
            "failed": len(failed_sources),
            "pending": len(sources) - len(loaded_sources) - len(failed_sources),
            "failed_source_ids": [source["source_id"] for source in failed_sources],
        },
        "startup_import_results": getattr(request.app.state, "import_results", []),
        "assistant": get_configuration(),
        "notes": [
            "Business counts are mapped OpenStreetMap POIs, not a verified register.",
            "The API does not silently substitute mock data.",
        ],
    }


@app.get("/api/v1/meta/categories")
def category_metadata(connection: Any = Depends(get_db)) -> dict[str, Any]:
    counts = market.city_category_counts(connection)
    categories = []
    for category in categories_metadata():
        categories.append(
            {
                **category,
                "shortName": category["short_name"],
                "mapped_poi_count": counts[category["id"]]["mapped_poi_count"],
                "inside_ghmc_count": counts[category["id"]]["inside_ghmc_count"],
                "named_count": counts[category["id"]]["named_count"],
            }
        )
    return {
        "count": len(categories),
        "default_category": "cafes",
        "default_radius_m": DEFAULT_RADIUS_M,
        "radius_options_m": list(RADIUS_OPTIONS_M),
        "categories": categories,
        "notes": [
            "Categories are heuristic mappings of OpenStreetMap tags.",
            "Meat & Poultry is a separate category and is not included in grocery.",
            "Counts are mapped POIs, not registered or verified businesses.",
        ],
    }


@app.get("/api/v1/meta/localities")
def locality_metadata(connection: Any = Depends(get_db)) -> dict[str, Any]:
    localities = market.list_localities(connection)
    return {
        "count": len(localities),
        "default_locality": "banjara-hills",
        "default_radius_m": DEFAULT_RADIUS_M,
        "radius_options_m": list(RADIUS_OPTIONS_M),
        "localities": localities,
        "notes": [
            "Locality coordinates are approximate reference points, not official boundaries.",
            "Circular catchments may overlap and must not be summed as unique city totals.",
            "Population is intentionally null because 2011 census wards do not align with current localities.",
        ],
    }


@app.post("/api/v1/search/interpret")
def interpret_search(
    payload: SearchInterpretRequest,
    connection: Any = Depends(get_db),
) -> dict[str, Any]:
    try:
        return search.interpret_search(
            connection,
            payload.query,
            payload.locality_id,
        )
    except ValueError as error:
        raise _client_error(error) from error


@app.get("/api/v1/meta/data-sources")
def data_source_metadata(connection: Any = Depends(get_db)) -> dict[str, Any]:
    rows = connection.execute(
        """
        SELECT ds.source_id, ds.name, ds.source_type, ds.file_path, ds.license,
               ds.attribution, ds.reference_date, ds.geography_level,
               ds.is_estimated, ds.is_synthetic, ds.notes, ds.last_loaded_at,
               ds.record_count,
               (
                   SELECT il.status
                   FROM import_logs AS il
                   WHERE il.source_id = ds.source_id
                   ORDER BY il.id DESC
                   LIMIT 1
               ) AS latest_status,
               (
                   SELECT il.finished_at
                   FROM import_logs AS il
                   WHERE il.source_id = ds.source_id
                   ORDER BY il.id DESC
                   LIMIT 1
               ) AS latest_import_at
        FROM data_sources AS ds
        ORDER BY ds.source_id
        """
    ).fetchall()
    sources = []
    for row in rows:
        source = dict(row)
        source["is_estimated"] = bool(source["is_estimated"])
        source["is_synthetic"] = bool(source["is_synthetic"])
        sources.append(source)
    return {
        "count": len(sources),
        "sources": sources,
        "notes": [
            "Source-level limitations are recorded in each source notes field.",
            "OpenStreetMap is community-maintained and incomplete.",
            "GHMC licence data is aggregated and cannot identify individual businesses.",
            "Google Trends measures relative search interest, not demand volume.",
            "Rent is not available as a dataset and is accepted only as user input.",
        ],
    }


@app.get("/api/v1/analytics/market-insights")
def market_analytics(
    locality: str = Query(...),
    category: str = Query(default="cafes"),
    radius_m: int = Query(default=DEFAULT_RADIUS_M),
    connection: Any = Depends(get_db),
) -> dict[str, Any]:
    try:
        return machine_learning.market_insights(
            connection,
            locality,
            category,
            radius_m,
        )
    except ValueError as error:
        raise _client_error(error) from error


@app.get("/api/v1/analytics/eda")
def exploratory_data_analysis(connection: Any = Depends(get_db)) -> dict[str, Any]:
    try:
        return machine_learning.run_full_eda(connection)
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.get("/api/v1/analytics/models")
def machine_learning_models(
    category: str = Query(default="restaurants"),
    radius_m: int = Query(default=DEFAULT_RADIUS_M),
    connection: Any = Depends(get_db),
) -> dict[str, Any]:
    try:
        return {
            "search_interest_regression": machine_learning.evaluate_search_interest_regression(
                connection, category
            ),
            "ghmc_activity_regression": machine_learning.evaluate_ghmc_activity_regression(
                connection
            ),
            "clustering_and_pca": machine_learning.cluster_and_pca_bundle(
                machine_learning.get_locality_features(connection, category, radius_m)
            ).get("model"),
            "decision_tree_classification": machine_learning.evaluate_decision_tree_classification(
                connection
            ),
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.get("/api/v1/market/overview")
def market_overview(
    category: str = Query(default="cafes"),
    radius_m: int = Query(default=DEFAULT_RADIUS_M),
    connection: Any = Depends(get_db),
) -> dict[str, Any]:
    try:
        return market.city_overview(connection, category, radius_m)
    except ValueError as error:
        raise _client_error(error) from error


@app.get("/api/v1/market/locality")
def market_locality(
    locality: str = Query(...),
    category: str = Query(default="cafes"),
    radius_m: int = Query(default=DEFAULT_RADIUS_M),
    connection: Any = Depends(get_db),
) -> dict[str, Any]:
    try:
        return market.locality_market_metrics(
            connection,
            locality,
            category,
            radius_m,
        )
    except ValueError as error:
        raise _client_error(error) from error


@app.get("/api/v1/market/localities")
def market_localities(
    category: str = Query(default="cafes"),
    radius_m: int = Query(default=DEFAULT_RADIUS_M),
    connection: Any = Depends(get_db),
) -> dict[str, Any]:
    try:
        return market.all_locality_metrics(connection, category, radius_m)
    except ValueError as error:
        raise _client_error(error) from error


@app.get("/api/v1/market/business")
def market_business(
    osm_id: str = Query(..., min_length=1),
    category: str | None = Query(default=None),
    radius_m: int = Query(default=DEFAULT_RADIUS_M),
    connection: Any = Depends(get_db),
) -> dict[str, Any]:
    try:
        return market.business_market_metrics(
            connection,
            osm_id,
            category,
            radius_m,
        )
    except ValueError as error:
        raise _client_error(error) from error


@app.get("/api/v1/market/business/competitors")
def market_business_competitors(
    osm_id: str = Query(..., min_length=1),
    category: str | None = Query(default=None),
    radius_m: int = Query(default=DEFAULT_RADIUS_M),
    limit: int = Query(default=50, ge=1, le=200),
    connection: Any = Depends(get_db),
) -> dict[str, Any]:
    try:
        return competitors.nearby_competitors_for_business(
            connection,
            osm_id,
            category,
            radius_m,
            limit,
        )
    except ValueError as error:
        raise _client_error(error) from error


@app.get("/api/v1/market/competitors")
def market_competitors(
    locality: str = Query(...),
    category: str = Query(default="cafes"),
    radius_m: int = Query(default=DEFAULT_RADIUS_M),
    limit: int = Query(default=50, ge=1, le=200),
    connection: Any = Depends(get_db),
) -> dict[str, Any]:
    try:
        return competitors.nearby_competitors(
            connection,
            locality,
            category,
            radius_m,
            limit,
        )
    except ValueError as error:
        raise _client_error(error) from error


@app.get("/api/v1/market/trends")
def market_trends(
    category: str = Query(default="cafes"),
    circle_no: int | None = Query(default=None),
    connection: Any = Depends(get_db),
) -> dict[str, Any]:
    try:
        return trends.trends_overview(connection, category, circle_no)
    except ValueError as error:
        raise _client_error(error) from error


@app.get("/api/v1/market/location-comparison")
def market_location_comparison(
    localities: str = Query(..., description="Comma-separated locality IDs"),
    category: str = Query(default="cafes"),
    radius_m: int = Query(default=DEFAULT_RADIUS_M),
    connection: Any = Depends(get_db),
) -> dict[str, Any]:
    locality_ids = [value.strip() for value in localities.split(",") if value.strip()]
    try:
        return location.compare_localities(
            connection,
            locality_ids,
            category,
            radius_m,
        )
    except ValueError as error:
        raise _client_error(error) from error


@app.post("/api/v1/market/risk")
def market_risk(
    payload: RiskRequest,
    connection: Any = Depends(get_db),
) -> dict[str, Any]:
    try:
        return risk.estimate_risk(
            connection,
            payload.locality,
            payload.category,
            payload.radius_m,
            payload.monthly_rent,
            payload.staff_expenses,
            payload.other_monthly_expenses,
            payload.expected_monthly_revenue,
        )
    except ValueError as error:
        raise _client_error(error) from error


@app.post("/api/v1/market/business/risk")
def market_business_risk(
    payload: BusinessRiskRequest,
    connection: Any = Depends(get_db),
) -> dict[str, Any]:
    try:
        return risk.estimate_risk_for_business(
            connection,
            payload.osm_id,
            payload.category,
            payload.radius_m,
            payload.monthly_rent,
            payload.staff_expenses,
            payload.other_monthly_expenses,
            payload.expected_monthly_revenue,
        )
    except ValueError as error:
        raise _client_error(error) from error


@app.post("/api/v1/financial/estimate")
def financial_estimate(payload: FinancialEstimateRequest) -> dict[str, Any]:
    try:
        return financial.estimate_financials(
            payload.method,
            payload.monthly_rent,
            payload.staff_expenses,
            payload.other_monthly_expenses,
            payload.initial_investment,
            payload.expected_monthly_revenue,
            payload.daily_customers,
            payload.average_selling_price,
            payload.working_days,
        )
    except ValueError as error:
        raise _client_error(error) from error


@app.post("/api/v1/assistant/chat")
async def market_assistant(payload: AssistantChatRequest) -> dict[str, Any]:
    messages = [message.model_dump() for message in payload.messages]
    return await asyncio.to_thread(assistant_chat, messages, payload.context)
