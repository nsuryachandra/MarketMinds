"""SQLite database setup and small shared database helpers.

The schema is created automatically when the backend starts. Raw datasets are
never modified; imported records keep source and reference-date information.
"""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parent / "marketminds.db"

SCHEMA_SQL = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS data_sources (
    source_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    source_type TEXT NOT NULL,
    file_path TEXT,
    license TEXT,
    attribution TEXT,
    reference_date TEXT,
    geography_level TEXT,
    is_estimated INTEGER NOT NULL DEFAULT 0,
    is_synthetic INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    last_loaded_at TEXT,
    record_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS wards (
    ward_id TEXT PRIMARY KEY,
    ward_no INTEGER,
    ward_name TEXT NOT NULL,
    circle_no INTEGER,
    circle_name TEXT,
    zone TEXT,
    area_sqm REAL,
    centroid_lat REAL,
    centroid_lon REAL,
    geometry_json TEXT NOT NULL,
    min_lon REAL,
    min_lat REAL,
    max_lon REAL,
    max_lat REAL,
    source_id TEXT NOT NULL,
    as_of_date TEXT,
    FOREIGN KEY (source_id) REFERENCES data_sources(source_id)
);
CREATE INDEX IF NOT EXISTS idx_wards_ward_no ON wards(ward_no);
CREATE INDEX IF NOT EXISTS idx_wards_circle_no ON wards(circle_no);

CREATE TABLE IF NOT EXISTS businesses (
    osm_id TEXT PRIMARY KEY,
    name TEXT,
    name_status TEXT NOT NULL,
    category_id TEXT,
    category_name TEXT,
    subtype TEXT,
    osm_key TEXT,
    osm_value TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    ward_id TEXT,
    inside_ghmc INTEGER NOT NULL DEFAULT 0,
    tags_json TEXT,
    source_id TEXT NOT NULL,
    source_file TEXT,
    as_of_date TEXT,
    is_estimated INTEGER NOT NULL DEFAULT 0,
    is_synthetic INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (source_id) REFERENCES data_sources(source_id),
    FOREIGN KEY (ward_id) REFERENCES wards(ward_id)
);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category_id);
CREATE INDEX IF NOT EXISTS idx_businesses_location ON businesses(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_businesses_ward ON businesses(ward_id);

CREATE TABLE IF NOT EXISTS trade_license_monthly (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id TEXT NOT NULL,
    circle_no INTEGER NOT NULL,
    circle_name TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    applications INTEGER NOT NULL CHECK (applications >= 0),
    as_of_date TEXT,
    UNIQUE (source_id, circle_no, year, month),
    FOREIGN KEY (source_id) REFERENCES data_sources(source_id)
);
CREATE INDEX IF NOT EXISTS idx_trade_license_period
    ON trade_license_monthly(year, month);
CREATE INDEX IF NOT EXISTS idx_trade_license_circle
    ON trade_license_monthly(circle_no);

CREATE TABLE IF NOT EXISTS ghmc_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id TEXT NOT NULL,
    period_start TEXT NOT NULL,
    approval_count INTEGER NOT NULL CHECK (approval_count >= 0),
    green_fund REAL,
    annual_license_fees REAL,
    total_fees REAL,
    geography_level TEXT NOT NULL DEFAULT 'city',
    as_of_date TEXT,
    UNIQUE (source_id, period_start),
    FOREIGN KEY (source_id) REFERENCES data_sources(source_id)
);
CREATE INDEX IF NOT EXISTS idx_ghmc_activity_period
    ON ghmc_activity(period_start);

CREATE TABLE IF NOT EXISTS census_records (
    record_key TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    district_code INTEGER,
    division_name TEXT,
    district_name TEXT,
    mandal_code INTEGER,
    mandal_name TEXT,
    village_code INTEGER,
    ward_no INTEGER,
    level1 TEXT,
    vname TEXT,
    tru TEXT,
    households INTEGER,
    population INTEGER,
    male INTEGER,
    female INTEGER,
    literate INTEGER,
    workers INTEGER,
    reference_year INTEGER NOT NULL,
    geography_level TEXT,
    is_estimated INTEGER NOT NULL DEFAULT 0,
    is_synthetic INTEGER NOT NULL DEFAULT 0,
    as_of_date TEXT,
    FOREIGN KEY (source_id) REFERENCES data_sources(source_id)
);
CREATE INDEX IF NOT EXISTS idx_census_mandal ON census_records(mandal_name);
CREATE INDEX IF NOT EXISTS idx_census_ward ON census_records(ward_no);

CREATE TABLE IF NOT EXISTS schools (
    pseudocode TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    state TEXT,
    district TEXT,
    block TEXT,
    rural_urban INTEGER,
    local_body_name TEXT,
    ward_name TEXT,
    ward_no INTEGER,
    school_category INTEGER,
    school_type INTEGER,
    management INTEGER,
    pincode INTEGER,
    low_class INTEGER,
    high_class INTEGER,
    reference_year TEXT,
    geography_level TEXT NOT NULL DEFAULT 'school',
    as_of_date TEXT,
    is_estimated INTEGER NOT NULL DEFAULT 0,
    is_synthetic INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (source_id) REFERENCES data_sources(source_id)
);
CREATE INDEX IF NOT EXISTS idx_schools_ward ON schools(ward_no);

CREATE TABLE IF NOT EXISTS metro_stations (
    stop_id TEXT PRIMARY KEY,
    stop_name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    location_type INTEGER,
    parent_station TEXT,
    source_id TEXT NOT NULL,
    as_of_date TEXT,
    FOREIGN KEY (source_id) REFERENCES data_sources(source_id)
);
CREATE INDEX IF NOT EXISTS idx_metro_location ON metro_stations(latitude, longitude);

CREATE TABLE IF NOT EXISTS bus_stops (
    stop_id TEXT PRIMARY KEY,
    stop_name TEXT NOT NULL,
    zone_id TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    description TEXT,
    source_id TEXT NOT NULL,
    as_of_date TEXT,
    FOREIGN KEY (source_id) REFERENCES data_sources(source_id)
);
CREATE INDEX IF NOT EXISTS idx_bus_location ON bus_stops(latitude, longitude);

CREATE TABLE IF NOT EXISTS search_trends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id TEXT NOT NULL,
    term TEXT NOT NULL,
    term_label TEXT,
    mapped_category_id TEXT,
    week_start TEXT NOT NULL,
    interest INTEGER NOT NULL CHECK (interest BETWEEN 0 AND 100),
    geography_scope TEXT NOT NULL,
    as_of_date TEXT,
    UNIQUE (source_id, term, week_start),
    FOREIGN KEY (source_id) REFERENCES data_sources(source_id)
);
CREATE INDEX IF NOT EXISTS idx_search_trends_category
    ON search_trends(mapped_category_id, week_start);

CREATE TABLE IF NOT EXISTS localities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    zone TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    coordinate_source TEXT,
    is_approximate INTEGER NOT NULL DEFAULT 1,
    ward_id TEXT,
    ward_no INTEGER,
    circle_no INTEGER,
    circle_name TEXT,
    ward_assignment_method TEXT,
    population_2011 INTEGER,
    population_reference_year INTEGER,
    population_note TEXT,
    source_id TEXT NOT NULL,
    as_of_date TEXT,
    is_estimated INTEGER NOT NULL DEFAULT 1,
    is_synthetic INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (source_id) REFERENCES data_sources(source_id),
    FOREIGN KEY (ward_id) REFERENCES wards(ward_id)
);
CREATE INDEX IF NOT EXISTS idx_localities_ward ON localities(ward_id);

CREATE TABLE IF NOT EXISTS import_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    status TEXT NOT NULL,
    records_read INTEGER NOT NULL DEFAULT 0,
    records_imported INTEGER NOT NULL DEFAULT 0,
    records_rejected INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (source_id) REFERENCES data_sources(source_id)
);
CREATE INDEX IF NOT EXISTS idx_import_logs_source ON import_logs(source_id);
"""

TABLE_NAMES = [
    "data_sources",
    "wards",
    "businesses",
    "trade_license_monthly",
    "ghmc_activity",
    "census_records",
    "schools",
    "metro_stations",
    "bus_stops",
    "search_trends",
    "localities",
    "import_logs",
]


def utc_now() -> str:
    """Return an ISO UTC timestamp for provenance fields."""
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def get_connection() -> sqlite3.Connection:
    """Open a SQLite connection with row access by column name."""
    connection = sqlite3.connect(DB_PATH, timeout=30)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db() -> None:
    """Create the database and all tables if they do not already exist."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_connection() as connection:
        connection.executescript(SCHEMA_SQL)
        connection.commit()


def table_counts(connection: sqlite3.Connection) -> dict[str, int]:
    """Return row counts for the main tables."""
    counts: dict[str, int] = {}
    for table in TABLE_NAMES:
        row = connection.execute(f"SELECT COUNT(*) AS count FROM {table}").fetchone()
        counts[table] = int(row["count"])
    return counts


def source_loaded(connection: sqlite3.Connection, source_id: str) -> bool:
    """Check whether a source already has a successful non-empty import."""
    row = connection.execute(
        """
        SELECT 1
        FROM import_logs
        WHERE source_id = ?
          AND status = 'success'
          AND records_imported > 0
        ORDER BY id DESC
        LIMIT 1
        """,
        (source_id,),
    ).fetchone()
    return row is not None


def log_import(
    connection: sqlite3.Connection,
    source_id: str,
    status: str,
    records_read: int,
    records_imported: int,
    records_rejected: int,
    notes: str = "",
    started_at: str | None = None,
) -> None:
    """Record one import attempt, including failures and reject counts."""
    connection.execute(
        """
        INSERT INTO import_logs (
            source_id, started_at, finished_at, status,
            records_read, records_imported, records_rejected, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            source_id,
            started_at or utc_now(),
            utc_now(),
            status,
            records_read,
            records_imported,
            records_rejected,
            notes,
        ),
    )
    connection.commit()


def update_source_loaded(
    connection: sqlite3.Connection,
    source_id: str,
    record_count: int,
) -> None:
    """Update the source row after a successful import."""
    connection.execute(
        """
        UPDATE data_sources
        SET last_loaded_at = ?, record_count = ?
        WHERE source_id = ?
        """,
        (utc_now(), record_count, source_id),
    )
    connection.commit()


def rows_to_dicts(rows: list[sqlite3.Row] | list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Convert SQLite rows to serialisable dictionaries."""
    return [dict(row) for row in rows]
