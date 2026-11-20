"""Repeatable dataset import pipeline for MarketMinds."""

from __future__ import annotations

import argparse
import csv
import io
import json
import xml.etree.ElementTree as ElementTree
import zipfile
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path
from typing import Any, Callable

import openpyxl

from database import (
    DB_PATH,
    get_connection,
    init_db,
    log_import,
    source_loaded,
    table_counts,
    update_source_loaded,
    utc_now,
)
from data.data_cleaning import (
    CATEGORY_NAMES,
    category_for_tags,
    clean_text,
    geometry_bbox,
    geometry_centroid,
    geometry_to_json,
    haversine_km,
    name_status,
    parse_kml_coordinates,
    parse_prefixed_label,
    parse_school_ward,
    point_in_geometry,
    round_or_none,
    to_float,
    to_int,
    valid_lat_lon,
)


PROJECT_ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = PROJECT_ROOT / "datasets" / "raw"
PROCESSED_DIR = PROJECT_ROOT / "datasets" / "processed"
KML_NAMESPACE = {"kml": "http://www.opengis.net/kml/2.2"}

SOURCE_DEFINITIONS: list[dict[str, Any]] = [
    {
        "source_id": "osm_business_pois",
        "name": "OpenStreetMap business POIs - Hyderabad extract",
        "source_type": "GeoJSON",
        "file_path": "datasets/raw/business_pois/hyderabad_business_pois.geojson",
        "license": "OpenStreetMap data is available under the ODbL 1.0",
        "attribution": "© OpenStreetMap contributors",
        "reference_date": "2026-11-15",
        "geography_level": "POI / point",
        "is_estimated": 0,
        "is_synthetic": 0,
        "notes": (
            "Community-maintained mapped POIs, not a verified business register. "
            "Counts understate real supply and do not include revenue, ratings, "
            "footfall, or closures."
        ),
    },
    {
        "source_id": "ghmc_wards",
        "name": "GHMC ward boundaries",
        "source_type": "KML",
        "file_path": "datasets/raw/geography/hyderabad_ghmc_wards.kml",
        "license": "License not stated in the supplied file",
        "attribution": "Greater Hyderabad Municipal Corporation (GHMC)",
        "reference_date": "2026-11-15",
        "geography_level": "ward polygon",
        "is_estimated": 0,
        "is_synthetic": 0,
        "notes": (
            "Ward, circle, zone, and polygon geometry supplied in the KML. "
            "The file date is a snapshot date, not a boundary notification date."
        ),
    },
    {
        "source_id": "ghmc_trade_licences_2022",
        "name": "GHMC trade licence applications 2022",
        "source_type": "CSV",
        "file_path": "datasets/raw/ghmc/ghmc_trade_licences_2022.csv",
        "license": "License not stated in the supplied file",
        "attribution": "Greater Hyderabad Municipal Corporation (GHMC)",
        "reference_date": "2022-12-31",
        "geography_level": "circle / month",
        "is_estimated": 0,
        "is_synthetic": 0,
        "notes": (
            "Reported trade-licence applications aggregated by GHMC circle and "
            "month. These are not business openings, closures, or locality counts."
        ),
    },
    {
        "source_id": "ghmc_trade_licences_2023",
        "name": "GHMC trade licence applications 2023",
        "source_type": "CSV",
        "file_path": "datasets/raw/ghmc/ghmc_trade_licences_2023.csv",
        "license": "License not stated in the supplied file",
        "attribution": "Greater Hyderabad Municipal Corporation (GHMC)",
        "reference_date": "2023-12-31",
        "geography_level": "circle / month",
        "is_estimated": 0,
        "is_synthetic": 0,
        "notes": (
            "Reported trade-licence applications aggregated by GHMC circle and "
            "month. These are not business openings, closures, or locality counts."
        ),
    },
    {
        "source_id": "ghmc_activity",
        "name": "GHMC trade licence approval activity",
        "source_type": "XLSX",
        "file_path": "datasets/raw/ghmc/ghmc_trade_licence_dashboard.xlsx",
        "license": "License not stated in the supplied file",
        "attribution": "Greater Hyderabad Municipal Corporation (GHMC)",
        "reference_date": "2026-11-15",
        "geography_level": "city / month",
        "is_estimated": 0,
        "is_synthetic": 0,
        "notes": (
            "Application-level export aggregated by approval month and fees. "
            "The workbook has no business names or categories, and monthly "
            "approval activity must not be described as business growth."
        ),
    },
    {
        "source_id": "census_2011",
        "name": "Census of India 2011 - Hyderabad wards",
        "source_type": "CSV",
        "file_path": "datasets/raw/demographics/hyderabad_census_2011.csv.csv",
        "license": "License not stated in the supplied file",
        "attribution": "Office of the Registrar General & Census Commissioner, India",
        "reference_date": "2011-03-01",
        "geography_level": "2011 census ward",
        "is_estimated": 0,
        "is_synthetic": 0,
        "notes": (
            "Historical 2011 context only. Census ward numbering does not match "
            "current GHMC ward numbers, so no locality population is assigned."
        ),
    },
    {
        "source_id": "udise_schools_2024_25",
        "name": "UDISE+ school profile 2024-25 - Hyderabad",
        "source_type": "CSV",
        "file_path": "datasets/raw/education/hyderabad_udise_2024_25/Hyderabad Profile Part 1.csv",
        "license": "License not stated in the supplied file",
        "attribution": "UDISE+, Ministry of Education, Government of India",
        "reference_date": "2024-25",
        "geography_level": "school / ward label",
        "is_estimated": 0,
        "is_synthetic": 0,
        "notes": (
            "School profile records contain no latitude or longitude. Ward labels "
            "are parsed where available. Enrolment files were inspected but not "
            "imported because their item-group rows cannot be summed safely "
            "without the official item code dictionary."
        ),
    },
    {
        "source_id": "bus_stops",
        "name": "Hyderabad bus stops",
        "source_type": "CSV",
        "file_path": "datasets/raw/transport/hyderabad_bus_stops.csv",
        "license": "License not stated in the supplied file",
        "attribution": "Supplied Hyderabad bus-stop dataset",
        "reference_date": "2026-11-15",
        "geography_level": "stop / point",
        "is_estimated": 0,
        "is_synthetic": 0,
        "notes": (
            "Mapped stop locations only. The file has no service frequency, "
            "ridership, or route reliability information."
        ),
    },
    {
        "source_id": "metro_gtfs",
        "name": "Hyderabad Metro GTFS feed 2026-07",
        "source_type": "GTFS ZIP",
        "file_path": "datasets/raw/transport/hyderabad_metro_gtfs_2026_07.zip",
        "license": "License not stated in the supplied file",
        "attribution": "Hyderabad Metro Rail GTFS feed supplied with the project",
        "reference_date": "2026-07-01",
        "geography_level": "station / point",
        "is_estimated": 0,
        "is_synthetic": 0,
        "notes": (
            "Only parent station records with location_type=1 are imported. "
            "Platform and entrance rows are excluded from station counts."
        ),
    },
    {
        "source_id": "google_trends",
        "name": "Google Trends - Hyderabad/Telangana",
        "source_type": "CSV",
        "file_path": "datasets/raw/demand/google_trends_hyderabad.csv",
        "license": "Google Trends terms and attribution apply",
        "attribution": "Google Trends",
        "reference_date": "2026-11-15",
        "geography_level": "region / week",
        "is_estimated": 0,
        "is_synthetic": 0,
        "notes": (
            "Relative search interest on a 0-100 scale, not search volume, "
            "customers, revenue, or market demand. Five query terms map to "
            "supported categories."
        ),
    },
    {
        "source_id": "locality_reference_points",
        "name": "Approximate locality reference points",
        "source_type": "manual reference",
        "file_path": None,
        "license": "Coordinates looked up via Nominatim/OpenStreetMap",
        "attribution": "Nominatim and © OpenStreetMap contributors",
        "reference_date": "2026-11-15",
        "geography_level": "locality centroid",
        "is_estimated": 1,
        "is_synthetic": 0,
        "notes": (
            "Approximate centre points used only for circular catchments. "
            "They are not official locality boundaries, and catchments overlap."
        ),
    },
]

SOURCE_BY_ID = {source["source_id"]: source for source in SOURCE_DEFINITIONS}

LOCALITY_REFERENCE_POINTS: list[dict[str, Any]] = [
    # Core Central & West Commercial
    {"id": "banjara-hills", "name": "Banjara Hills", "zone": "Central", "latitude": 17.4177464, "longitude": 78.4399014},
    {"id": "jubilee-hills", "name": "Jubilee Hills", "zone": "Central", "latitude": 17.4308362, "longitude": 78.4102882},
    {"id": "gachibowli", "name": "Gachibowli", "zone": "West", "latitude": 17.4436222, "longitude": 78.3519638},
    {"id": "hitec-city", "name": "HITEC City", "zone": "West", "latitude": 17.4490055, "longitude": 78.3831376},
    {"id": "kondapur", "name": "Kondapur", "zone": "West", "latitude": 17.4587912, "longitude": 78.3730556},
    {"id": "madhapur", "name": "Madhapur", "zone": "West", "latitude": 17.4483, "longitude": 78.3915},
    {"id": "kukatpally", "name": "Kukatpally", "zone": "North-West", "latitude": 17.4930841, "longitude": 78.4054408},
    {"id": "kphb-colony", "name": "KPHB Colony", "zone": "North-West", "latitude": 17.4935, "longitude": 78.3970},
    {"id": "miyapur", "name": "Miyapur", "zone": "North-West", "latitude": 17.4981608, "longitude": 78.3567628},
    {"id": "chandanagar", "name": "Chandanagar", "zone": "North-West", "latitude": 17.4930, "longitude": 78.3280},
    {"id": "nizampet", "name": "Nizampet", "zone": "North-West", "latitude": 17.5140, "longitude": 78.3795},

    # Central Transit & Commercial Corridor
    {"id": "ameerpet", "name": "Ameerpet", "zone": "Central", "latitude": 17.4375012, "longitude": 78.4482505},
    {"id": "sr-nagar", "name": "SR Nagar", "zone": "Central", "latitude": 17.4430, "longitude": 78.4445},
    {"id": "srinagar-colony", "name": "Srinagar Colony", "zone": "Central", "latitude": 17.4285, "longitude": 78.4355},
    {"id": "moti-nagar", "name": "Moti Nagar", "zone": "Central-West", "latitude": 17.4525, "longitude": 78.4215},
    {"id": "erragadda", "name": "Erragadda", "zone": "Central-West", "latitude": 17.4550, "longitude": 78.4330},
    {"id": "sanath-nagar", "name": "Sanath Nagar", "zone": "North-West", "latitude": 17.4580, "longitude": 78.4410},
    {"id": "begumpet", "name": "Begumpet", "zone": "Central", "latitude": 17.4461950, "longitude": 78.4630160},
    {"id": "panjagutta", "name": "Panjagutta", "zone": "Central", "latitude": 17.4290, "longitude": 78.4505},
    {"id": "somajiguda", "name": "Somajiguda", "zone": "Central", "latitude": 17.4265, "longitude": 78.4570},
    {"id": "khairatabad", "name": "Khairatabad", "zone": "Central", "latitude": 17.4130, "longitude": 78.4580},
    {"id": "masab-tank", "name": "Masab Tank", "zone": "Central", "latitude": 17.4050, "longitude": 78.4510},

    # Tech & Expansion Spine (West & South-West)
    {"id": "financial-district", "name": "Financial District", "zone": "West", "latitude": 17.4150, "longitude": 78.3490},
    {"id": "kokapet", "name": "Kokapet", "zone": "West", "latitude": 17.3948624, "longitude": 78.3365214},
    {"id": "manikonda", "name": "Manikonda", "zone": "West", "latitude": 17.3999951, "longitude": 78.3861689},
    {"id": "nallagandla", "name": "Nallagandla", "zone": "West", "latitude": 17.4720, "longitude": 78.3120},
    {"id": "lingampally", "name": "Lingampally", "zone": "West", "latitude": 17.4890, "longitude": 78.3180},
    {"id": "film-nagar", "name": "Film Nagar", "zone": "Central-West", "latitude": 17.4160, "longitude": 78.4060},
    {"id": "tolichowki", "name": "Tolichowki", "zone": "West", "latitude": 17.4020, "longitude": 78.4110},
    {"id": "mehdipatnam", "name": "Mehdipatnam", "zone": "South-West", "latitude": 17.3940, "longitude": 78.4380},
    {"id": "attapur", "name": "Attapur", "zone": "South-West", "latitude": 17.3680, "longitude": 78.4340},

    # North & Secunderabad Cluster
    {"id": "secunderabad", "name": "Secunderabad", "zone": "North", "latitude": 17.4337246, "longitude": 78.5006827},
    {"id": "bowenpally", "name": "Bowenpally", "zone": "North", "latitude": 17.4730, "longitude": 78.4870},
    {"id": "alwal", "name": "Alwal", "zone": "North", "latitude": 17.5020, "longitude": 78.5080},
    {"id": "malkajgiri", "name": "Malkajgiri", "zone": "North", "latitude": 17.4510, "longitude": 78.5305},
    {"id": "balanagar", "name": "Balanagar", "zone": "North", "latitude": 17.4680, "longitude": 78.4520},
    {"id": "jeedimetla", "name": "Jeedimetla", "zone": "North", "latitude": 17.5180, "longitude": 78.4550},

    # East & North-East Industrial/Transit Hubs
    {"id": "tarnaka", "name": "Tarnaka", "zone": "North-East", "latitude": 17.4280, "longitude": 78.5340},
    {"id": "habsiguda", "name": "Habsiguda", "zone": "East", "latitude": 17.4170, "longitude": 78.5440},
    {"id": "uppal", "name": "Uppal", "zone": "East", "latitude": 17.4025091, "longitude": 78.5612562},
    {"id": "amberpet", "name": "Amberpet", "zone": "East", "latitude": 17.3970, "longitude": 78.5140},
    {"id": "lb-nagar", "name": "LB Nagar", "zone": "East", "latitude": 17.3501617, "longitude": 78.5510938},
    {"id": "dilsukhnagar", "name": "Dilsukhnagar", "zone": "South-East", "latitude": 17.3684433, "longitude": 78.5228597},

    # Heritage, Civic & Old City
    {"id": "himayatnagar", "name": "Himayatnagar", "zone": "Central", "latitude": 17.4045, "longitude": 78.4870},
    {"id": "abids", "name": "Abids", "zone": "Central", "latitude": 17.3910, "longitude": 78.4740},
    {"id": "koti", "name": "Koti", "zone": "Central", "latitude": 17.3850, "longitude": 78.4865},
    {"id": "nampally", "name": "Nampally", "zone": "Central", "latitude": 17.3930, "longitude": 78.4680},
    {"id": "kachiguda", "name": "Kachiguda", "zone": "Central", "latitude": 17.3920, "longitude": 78.4980},
    {"id": "narayanaguda", "name": "Narayanaguda", "zone": "Central", "latitude": 17.3965, "longitude": 78.4915},
    {"id": "chikkadpally", "name": "Chikkadpally", "zone": "Central", "latitude": 17.4040, "longitude": 78.4990},
    {"id": "musheerabad", "name": "Musheerabad", "zone": "Central-North", "latitude": 17.4210, "longitude": 78.4970},
    {"id": "charminar", "name": "Charminar", "zone": "Old City", "latitude": 17.3616024, "longitude": 78.4746421},
    {"id": "malakpet", "name": "Malakpet", "zone": "South-East", "latitude": 17.3750, "longitude": 78.4980},
    {"id": "santoshnagar", "name": "Santoshnagar", "zone": "South", "latitude": 17.3480, "longitude": 78.5080},
]

TREND_COLUMNS = {
    "Restaurant: (Telangana)": ("Restaurant", "restaurants"),
    "Supermarket: (Telangana)": ("Supermarket", "grocery"),
    "Clothing store: (Telangana)": ("Clothing store", "fashion"),
    "Pharmacy: (Telangana)": ("Pharmacy", "pharmacy"),
    "gym: (Telangana)": ("gym", "fitness"),
}


def relative_source_path(source: dict[str, Any]) -> str | None:
    value = source.get("file_path")
    if not value:
        return None
    return str(Path(value))


def seed_data_sources(connection: Any) -> None:
    for source in SOURCE_DEFINITIONS:
        connection.execute(
            """
            INSERT INTO data_sources (
                source_id, name, source_type, file_path, license, attribution,
                reference_date, geography_level, is_estimated, is_synthetic, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(source_id) DO UPDATE SET
                name = excluded.name,
                source_type = excluded.source_type,
                file_path = excluded.file_path,
                license = excluded.license,
                attribution = excluded.attribution,
                reference_date = excluded.reference_date,
                geography_level = excluded.geography_level,
                is_estimated = excluded.is_estimated,
                is_synthetic = excluded.is_synthetic,
                notes = excluded.notes
            """,
            (
                source["source_id"],
                source["name"],
                source["source_type"],
                relative_source_path(source),
                source["license"],
                source["attribution"],
                source["reference_date"],
                source["geography_level"],
                source["is_estimated"],
                source["is_synthetic"],
                source["notes"],
            ),
        )
    connection.commit()


def _source_path(source_id: str) -> Path:
    source = SOURCE_BY_ID[source_id]
    return PROJECT_ROOT / str(source["file_path"])


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        rows: list[dict[str, str]] = []
        for row in reader:
            cleaned: dict[str, str] = {}
            for key, value in row.items():
                if key is None:
                    continue
                cleaned[str(key).strip()] = value.strip() if isinstance(value, str) else value
            rows.append(cleaned)
        return rows


def _write_csv(filename: str, fieldnames: list[str], rows: list[dict[str, Any]]) -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    output_path = PROCESSED_DIR / filename
    with output_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def _write_json(filename: str, payload: dict[str, Any]) -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    output_path = PROCESSED_DIR / filename
    output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def _coerce_date(value: Any) -> date | None:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    for candidate in (text[:10], text):
        try:
            return datetime.fromisoformat(candidate).date()
        except ValueError:
            continue
    for pattern in ("%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(text, pattern).date()
        except ValueError:
            continue
    return None


def _kml_polygons(placemark: ElementTree.Element) -> list[list[list[tuple[float, float]]]]:
    polygons: list[list[list[tuple[float, float]]]] = []
    for polygon_element in placemark.findall(".//kml:Polygon", KML_NAMESPACE):
        rings: list[list[tuple[float, float]]] = []
        outer = polygon_element.find(
            "./kml:outerBoundaryIs/kml:LinearRing/kml:coordinates",
            KML_NAMESPACE,
        )
        if outer is not None:
            outer_ring = parse_kml_coordinates(outer.text)
            if len(outer_ring) >= 4:
                rings.append(outer_ring)
        if not rings:
            continue
        for inner in polygon_element.findall(
            "./kml:innerBoundaryIs/kml:LinearRing/kml:coordinates",
            KML_NAMESPACE,
        ):
            inner_ring = parse_kml_coordinates(inner.text)
            if len(inner_ring) >= 4:
                rings.append(inner_ring)
        polygons.append(rings)
    return polygons


def _load_ward_polygons(connection: Any) -> list[dict[str, Any]]:
    rows = connection.execute(
        """
        SELECT ward_id, ward_no, ward_name, circle_no, circle_name, zone,
               centroid_lat, centroid_lon, geometry_json,
               min_lon, min_lat, max_lon, max_lat
        FROM wards
        ORDER BY ward_no, ward_id
        """
    ).fetchall()
    wards: list[dict[str, Any]] = []
    for row in rows:
        ward = dict(row)
        ward["geometry"] = json.loads(ward["geometry_json"])
        wards.append(ward)
    return wards


def _inside_bbox(ward: dict[str, Any], longitude: float, latitude: float) -> bool:
    return (
        ward["min_lon"] is not None
        and ward["max_lon"] is not None
        and ward["min_lat"] is not None
        and ward["max_lat"] is not None
        and ward["min_lon"] <= longitude <= ward["max_lon"]
        and ward["min_lat"] <= latitude <= ward["max_lat"]
    )


def _find_containing_ward(
    wards: list[dict[str, Any]],
    latitude: float,
    longitude: float,
) -> dict[str, Any] | None:
    for ward in wards:
        if _inside_bbox(ward, longitude, latitude) and point_in_geometry(
            latitude,
            longitude,
            ward["geometry"],
        ):
            return ward
    return None


def _nearest_ward(
    wards: list[dict[str, Any]],
    latitude: float,
    longitude: float,
) -> tuple[dict[str, Any] | None, float | None]:
    nearest_ward = None
    nearest_distance = None
    for ward in wards:
        ward_latitude = ward.get("centroid_lat")
        ward_longitude = ward.get("centroid_lon")
        if not valid_lat_lon(ward_latitude, ward_longitude):
            continue
        distance = haversine_km(latitude, longitude, ward_latitude, ward_longitude)
        if nearest_distance is None or distance < nearest_distance:
            nearest_ward = ward
            nearest_distance = distance
    return nearest_ward, nearest_distance


def _feature_point(feature: dict[str, Any]) -> tuple[float, float] | None:
    geometry = feature.get("geometry") or {}
    geometry_type = geometry.get("type")
    coordinates = geometry.get("coordinates")
    if geometry_type == "Point" and isinstance(coordinates, list) and len(coordinates) >= 2:
        longitude = to_float(coordinates[0])
        latitude = to_float(coordinates[1])
        if valid_lat_lon(latitude, longitude):
            return latitude, longitude
    if geometry_type in {"Polygon", "MultiPolygon"}:
        latitude, longitude = geometry_centroid(geometry)
        if valid_lat_lon(latitude, longitude):
            return latitude, longitude
    if geometry_type in {"LineString", "MultiLineString"}:
        points: list[tuple[float, float]] = []
        stack = list(coordinates or [])
        while stack:
            item = stack.pop()
            if (
                isinstance(item, list)
                and len(item) >= 2
                and isinstance(item[0], (int, float))
                and isinstance(item[1], (int, float))
            ):
                longitude = to_float(item[0])
                latitude = to_float(item[1])
                if valid_lat_lon(latitude, longitude):
                    points.append((longitude, latitude))
            elif isinstance(item, list):
                stack.extend(item)
        if points:
            return (
                sum(point[1] for point in points) / len(points),
                sum(point[0] for point in points) / len(points),
            )
    return None


def import_wards(connection: Any) -> dict[str, Any]:
    source_id = "ghmc_wards"
    source = SOURCE_BY_ID[source_id]
    path = _source_path(source_id)
    tree = ElementTree.parse(path)
    root = tree.getroot()
    placemarks = root.findall(".//kml:Placemark", KML_NAMESPACE)
    processed_rows: list[dict[str, Any]] = []
    imported = 0
    rejected = 0

    for index, placemark in enumerate(placemarks, start=1):
        simple_data = {
            element.attrib.get("name"): clean_text(element.text)
            for element in placemark.findall(".//kml:SimpleData", KML_NAMESPACE)
        }
        polygons = _kml_polygons(placemark)
        if not polygons:
            rejected += 1
            continue
        geometry = {"type": "MultiPolygon", "coordinates": polygons}
        bbox = geometry_bbox(geometry)
        if bbox is None:
            rejected += 1
            continue
        latitude, longitude = geometry_centroid(geometry)
        if not valid_lat_lon(latitude, longitude):
            rejected += 1
            continue
        ward_no, ward_name = parse_prefixed_label(simple_data.get("ward"))
        circle_no, circle_name = parse_prefixed_label(simple_data.get("CIRCLE"))
        if not ward_name:
            rejected += 1
            continue
        object_id = simple_data.get("OBJECTID") or str(index)
        ward_id = f"ghmc-ward-{object_id}"
        area_sqm = to_float(simple_data.get("AREA_IN_SQ"))
        zone = clean_text(simple_data.get("ZONE"))
        connection.execute(
            """
            INSERT INTO wards (
                ward_id, ward_no, ward_name, circle_no, circle_name, zone,
                area_sqm, centroid_lat, centroid_lon, geometry_json,
                min_lon, min_lat, max_lon, max_lat, source_id, as_of_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(ward_id) DO UPDATE SET
                ward_no = excluded.ward_no,
                ward_name = excluded.ward_name,
                circle_no = excluded.circle_no,
                circle_name = excluded.circle_name,
                zone = excluded.zone,
                area_sqm = excluded.area_sqm,
                centroid_lat = excluded.centroid_lat,
                centroid_lon = excluded.centroid_lon,
                geometry_json = excluded.geometry_json,
                min_lon = excluded.min_lon,
                min_lat = excluded.min_lat,
                max_lon = excluded.max_lon,
                max_lat = excluded.max_lat,
                source_id = excluded.source_id,
                as_of_date = excluded.as_of_date
            """,
            (
                ward_id,
                ward_no,
                ward_name,
                circle_no,
                circle_name,
                zone,
                area_sqm,
                latitude,
                longitude,
                geometry_to_json(geometry),
                bbox[0],
                bbox[1],
                bbox[2],
                bbox[3],
                source_id,
                source["reference_date"],
            ),
        )
        imported += 1
        processed_rows.append(
            {
                "ward_id": ward_id,
                "ward_no": ward_no,
                "ward_name": ward_name,
                "circle_no": circle_no,
                "circle_name": circle_name,
                "zone": zone,
                "area_sqm": round_or_none(area_sqm),
                "centroid_lat": round(latitude, 7),
                "centroid_lon": round(longitude, 7),
                "min_lon": bbox[0],
                "min_lat": bbox[1],
                "max_lon": bbox[2],
                "max_lat": bbox[3],
                "source_id": source_id,
            }
        )

    _write_csv(
        "wards_clean.csv",
        [
            "ward_id",
            "ward_no",
            "ward_name",
            "circle_no",
            "circle_name",
            "zone",
            "area_sqm",
            "centroid_lat",
            "centroid_lon",
            "min_lon",
            "min_lat",
            "max_lon",
            "max_lat",
            "source_id",
        ],
        processed_rows,
    )
    return {
        "records_read": len(placemarks),
        "records_imported": imported,
        "records_rejected": rejected,
        "notes": f"Parsed {imported} GHMC ward polygons from the KML ExtendedData fields.",
    }


def import_osm_businesses(connection: Any) -> dict[str, Any]:
    source_id = "osm_business_pois"
    source = SOURCE_BY_ID[source_id]
    path = _source_path(source_id)
    payload = json.loads(path.read_text(encoding="utf-8"))
    features = payload.get("features", [])
    wards = _load_ward_polygons(connection)
    processed_rows: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    imported = 0
    rejected = 0
    duplicate_ids = 0
    invalid_geometry = 0
    mapped = 0
    inside_ghmc = 0
    named = 0

    for index, feature in enumerate(features, start=1):
        properties = feature.get("properties") or {}
        osm_id = clean_text(properties.get("@id")) or clean_text(feature.get("id"))
        osm_id = osm_id or f"osm-feature-{index}"
        if osm_id in seen_ids:
            rejected += 1
            duplicate_ids += 1
            continue
        seen_ids.add(osm_id)
        point = _feature_point(feature)
        if point is None:
            rejected += 1
            invalid_geometry += 1
            continue
        latitude, longitude = point
        ward = _find_containing_ward(wards, latitude, longitude)
        category_id, subtype, osm_key, osm_value = category_for_tags(properties)
        name = clean_text(properties.get("name"))
        category_name = CATEGORY_NAMES.get(category_id) if category_id else None
        tags_json = json.dumps(properties, ensure_ascii=False, separators=(",", ":"))
        connection.execute(
            """
            INSERT INTO businesses (
                osm_id, name, name_status, category_id, category_name, subtype,
                osm_key, osm_value, latitude, longitude, ward_id, inside_ghmc,
                tags_json, source_id, source_file, as_of_date,
                is_estimated, is_synthetic
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
            ON CONFLICT(osm_id) DO UPDATE SET
                name = excluded.name,
                name_status = excluded.name_status,
                category_id = excluded.category_id,
                category_name = excluded.category_name,
                subtype = excluded.subtype,
                osm_key = excluded.osm_key,
                osm_value = excluded.osm_value,
                latitude = excluded.latitude,
                longitude = excluded.longitude,
                ward_id = excluded.ward_id,
                inside_ghmc = excluded.inside_ghmc,
                tags_json = excluded.tags_json,
                source_id = excluded.source_id,
                source_file = excluded.source_file,
                as_of_date = excluded.as_of_date
            """,
            (
                osm_id,
                name,
                name_status(name),
                category_id,
                category_name,
                subtype,
                osm_key,
                osm_value,
                latitude,
                longitude,
                ward["ward_id"] if ward else None,
                1 if ward else 0,
                tags_json,
                source_id,
                relative_source_path(source),
                source["reference_date"],
            ),
        )
        imported += 1
        mapped += 1 if category_id else 0
        inside_ghmc += 1 if ward else 0
        named += 1 if name else 0
        processed_rows.append(
            {
                "osm_id": osm_id,
                "name": name or "",
                "name_status": name_status(name),
                "category_id": category_id or "",
                "category_name": category_name or "",
                "subtype": subtype or "",
                "osm_key": osm_key or "",
                "osm_value": osm_value or "",
                "latitude": latitude,
                "longitude": longitude,
                "ward_id": ward["ward_id"] if ward else "",
                "inside_ghmc": 1 if ward else 0,
            }
        )

    _write_csv(
        "osm_business_pois_clean.csv",
        [
            "osm_id",
            "name",
            "name_status",
            "category_id",
            "category_name",
            "subtype",
            "osm_key",
            "osm_value",
            "latitude",
            "longitude",
            "ward_id",
            "inside_ghmc",
        ],
        processed_rows,
    )
    notes = (
        f"Imported {imported} valid POIs; {mapped} mapped to a supported category, "
        f"{inside_ghmc} inside a GHMC ward polygon, and {named} named. "
        f"Rejected {duplicate_ids} duplicate IDs and {invalid_geometry} invalid geometries."
    )
    return {
        "records_read": len(features),
        "records_imported": imported,
        "records_rejected": rejected,
        "notes": notes,
    }


def _import_trade_licences(connection: Any, source_id: str) -> dict[str, Any]:
    source = SOURCE_BY_ID[source_id]
    path = _source_path(source_id)
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        fieldnames = [str(field).strip() for field in (reader.fieldnames or [])]
        rows = [
            {
                str(key).strip(): value.strip() if isinstance(value, str) else value
                for key, value in row.items()
                if key is not None
            }
            for row in reader
        ]

    processed_rows: list[dict[str, Any]] = []
    imported = 0
    rejected = 0
    total_applications = 0
    month_fields = fieldnames[2:]

    for row in rows:
        circle_no = to_int(row.get("CirclenNo"))
        circle_name = clean_text(row.get("Circlename"))
        if circle_no is None or not circle_name:
            rejected += 1
            continue
        for month_field in month_fields:
            try:
                month_date = datetime.strptime(month_field, "%b-%y")
            except ValueError:
                rejected += 1
                continue
            applications = to_int(row.get(month_field))
            if applications is None or applications < 0:
                rejected += 1
                continue
            connection.execute(
                """
                INSERT INTO trade_license_monthly (
                    source_id, circle_no, circle_name, year, month,
                    applications, as_of_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(source_id, circle_no, year, month) DO UPDATE SET
                    circle_name = excluded.circle_name,
                    applications = excluded.applications,
                    as_of_date = excluded.as_of_date
                """,
                (
                    source_id,
                    circle_no,
                    circle_name,
                    month_date.year,
                    month_date.month,
                    applications,
                    source["reference_date"],
                ),
            )
            imported += 1
            total_applications += applications
            processed_rows.append(
                {
                    "source_id": source_id,
                    "circle_no": circle_no,
                    "circle_name": circle_name,
                    "year": month_date.year,
                    "month": month_date.month,
                    "applications": applications,
                }
            )

    _write_csv(
        f"{source_id}_clean.csv",
        ["source_id", "circle_no", "circle_name", "year", "month", "applications"],
        processed_rows,
    )
    return {
        "records_read": len(rows) * len(month_fields),
        "records_imported": imported,
        "records_rejected": rejected,
        "notes": (
            f"Imported {imported} circle-month application aggregates "
            f"totalling {total_applications:,} reported applications. "
            "These are not business openings or locality-level counts."
        ),
    }


def import_trade_licences_2022(connection: Any) -> dict[str, Any]:
    return _import_trade_licences(connection, "ghmc_trade_licences_2022")


def import_trade_licences_2023(connection: Any) -> dict[str, Any]:
    return _import_trade_licences(connection, "ghmc_trade_licences_2023")


def import_ghmc_activity(connection: Any) -> dict[str, Any]:
    source_id = "ghmc_activity"
    source = SOURCE_BY_ID[source_id]
    path = _source_path(source_id)
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        sheet = workbook["Projects 3 "]
        periods: dict[str, dict[str, float]] = defaultdict(
            lambda: {"count": 0.0, "green": 0.0, "annual": 0.0, "total": 0.0}
        )
        records_read = 0
        imported = 0
        rejected = 0
        for row in sheet.iter_rows(min_row=4, values_only=True):
            records_read += 1
            approval_date = _coerce_date(row[3] if len(row) > 3 else None)
            if approval_date is None:
                rejected += 1
                continue
            period_start = approval_date.replace(day=1).isoformat()
            entry = periods[period_start]
            entry["count"] += 1
            entry["green"] += to_float(row[4] if len(row) > 4 else None) or 0.0
            entry["annual"] += to_float(row[5] if len(row) > 5 else None) or 0.0
            total_fee = to_float(row[6] if len(row) > 6 else None)
            if total_fee is None:
                total_fee = (to_float(row[4] if len(row) > 4 else None) or 0.0) + (
                    to_float(row[5] if len(row) > 5 else None) or 0.0
                )
            entry["total"] += total_fee
            imported += 1
    finally:
        workbook.close()

    processed_rows: list[dict[str, Any]] = []
    for period_start in sorted(periods):
        entry = periods[period_start]
        connection.execute(
            """
            INSERT INTO ghmc_activity (
                source_id, period_start, approval_count, green_fund,
                annual_license_fees, total_fees, geography_level, as_of_date
            ) VALUES (?, ?, ?, ?, ?, ?, 'city', ?)
            ON CONFLICT(source_id, period_start) DO UPDATE SET
                approval_count = excluded.approval_count,
                green_fund = excluded.green_fund,
                annual_license_fees = excluded.annual_license_fees,
                total_fees = excluded.total_fees,
                geography_level = excluded.geography_level,
                as_of_date = excluded.as_of_date
            """,
            (
                source_id,
                period_start,
                int(entry["count"]),
                entry["green"],
                entry["annual"],
                entry["total"],
                source["reference_date"],
            ),
        )
        processed_rows.append(
            {
                "source_id": source_id,
                "period_start": period_start,
                "approval_count": int(entry["count"]),
                "green_fund": round(entry["green"], 2),
                "annual_license_fees": round(entry["annual"], 2),
                "total_fees": round(entry["total"], 2),
            }
        )

    _write_csv(
        "ghmc_activity_monthly_clean.csv",
        [
            "source_id",
            "period_start",
            "approval_count",
            "green_fund",
            "annual_license_fees",
            "total_fees",
        ],
        processed_rows,
    )
    return {
        "records_read": records_read,
        "records_imported": imported,
        "records_rejected": rejected,
        "notes": (
            f"Aggregated {imported:,} approval records into {len(processed_rows)} "
            "monthly city-level rows. Monthly approvals are recorded activity, "
            "not business growth."
        ),
    }


def import_census(connection: Any) -> dict[str, Any]:
    source_id = "census_2011"
    source = SOURCE_BY_ID[source_id]
    path = _source_path(source_id)
    rows = _read_csv(path)
    processed_rows: list[dict[str, Any]] = []
    imported = 0
    rejected = 0

    for index, row in enumerate(rows, start=1):
        district_code = to_int(row.get("DISTRICT_CODE"))
        mandal_code = to_int(row.get("Mandal_Code"))
        village_code = to_int(row.get("Village_Code"))
        ward_no = to_int(row.get("Ward"))
        if district_code is None or mandal_code is None:
            rejected += 1
            continue
        record_key = (
            f"census-2011-{district_code}-{mandal_code}-"
            f"{village_code or index}-{ward_no or index}-{clean_text(row.get('TRU')) or 'unknown'}"
        )
        connection.execute(
            """
            INSERT INTO census_records (
                record_key, source_id, district_code, division_name, district_name,
                mandal_code, mandal_name, village_code, ward_no, level1, vname, tru,
                households, population, male, female, literate, workers,
                reference_year, geography_level, is_estimated, is_synthetic,
                as_of_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2011, 'ward', 0, 0, ?)
            ON CONFLICT(record_key) DO UPDATE SET
                division_name = excluded.division_name,
                district_name = excluded.district_name,
                mandal_name = excluded.mandal_name,
                ward_no = excluded.ward_no,
                vname = excluded.vname,
                tru = excluded.tru,
                households = excluded.households,
                population = excluded.population,
                male = excluded.male,
                female = excluded.female,
                literate = excluded.literate,
                workers = excluded.workers,
                as_of_date = excluded.as_of_date
            """,
            (
                record_key,
                source_id,
                district_code,
                clean_text(row.get("DIVISION_NAME")),
                clean_text(row.get("Name_District")),
                mandal_code,
                clean_text(row.get("Name_Mandal")),
                village_code,
                ward_no,
                clean_text(row.get("Level1")),
                clean_text(row.get("VName")),
                clean_text(row.get("TRU")),
                to_int(row.get("No_HH")),
                to_int(row.get("TOT_P")),
                to_int(row.get("TOT_M")),
                to_int(row.get("TOT_F")),
                to_int(row.get("P_LIT")),
                to_int(row.get("TOT_WORK_P")),
                source["reference_date"],
            ),
        )
        imported += 1
        processed_rows.append(
            {
                "record_key": record_key,
                "mandal_name": clean_text(row.get("Name_Mandal")) or "",
                "vname": clean_text(row.get("VName")) or "",
                "ward_no": ward_no or "",
                "tru": clean_text(row.get("TRU")) or "",
                "households": to_int(row.get("No_HH")) or "",
                "population": to_int(row.get("TOT_P")) or "",
                "male": to_int(row.get("TOT_M")) or "",
                "female": to_int(row.get("TOT_F")) or "",
                "literate": to_int(row.get("P_LIT")) or "",
                "workers": to_int(row.get("TOT_WORK_P")) or "",
                "reference_year": 2011,
            }
        )

    _write_csv(
        "census_2011_clean.csv",
        [
            "record_key",
            "mandal_name",
            "vname",
            "ward_no",
            "tru",
            "households",
            "population",
            "male",
            "female",
            "literate",
            "workers",
            "reference_year",
        ],
        processed_rows,
    )
    return {
        "records_read": len(rows),
        "records_imported": imported,
        "records_rejected": rejected,
        "notes": (
            "Imported 2011 census ward records as historical context only. "
            "No locality population was assigned because ward boundaries differ."
        ),
    }


def import_schools(connection: Any) -> dict[str, Any]:
    source_id = "udise_schools_2024_25"
    source = SOURCE_BY_ID[source_id]
    path = _source_path(source_id)
    rows = _read_csv(path)
    processed_rows: list[dict[str, Any]] = []
    imported = 0
    rejected = 0

    for row in rows:
        pseudocode = clean_text(row.get("pseudocode"))
        if not pseudocode:
            rejected += 1
            continue
        ward_label = clean_text(row.get("lgd_ward_name"))
        ward_no = parse_school_ward(ward_label)
        connection.execute(
            """
            INSERT INTO schools (
                pseudocode, source_id, state, district, block, rural_urban,
                local_body_name, ward_name, ward_no, school_category, school_type,
                management, pincode, low_class, high_class, reference_year,
                geography_level, as_of_date, is_estimated, is_synthetic
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'school', ?, 0, 0)
            ON CONFLICT(pseudocode) DO UPDATE SET
                state = excluded.state,
                district = excluded.district,
                block = excluded.block,
                rural_urban = excluded.rural_urban,
                local_body_name = excluded.local_body_name,
                ward_name = excluded.ward_name,
                ward_no = excluded.ward_no,
                school_category = excluded.school_category,
                school_type = excluded.school_type,
                management = excluded.management,
                pincode = excluded.pincode,
                low_class = excluded.low_class,
                high_class = excluded.high_class,
                reference_year = excluded.reference_year,
                as_of_date = excluded.as_of_date
            """,
            (
                pseudocode,
                source_id,
                clean_text(row.get("state")),
                clean_text(row.get("district")),
                clean_text(row.get("block")),
                to_int(row.get("rural_urban")),
                clean_text(row.get("lgd_urban_local_body_name")),
                ward_label,
                ward_no,
                to_int(row.get("school_category")),
                to_int(row.get("school_type")),
                to_int(row.get("managment")),
                to_int(row.get("pincode")),
                to_int(row.get("lowclass")),
                to_int(row.get("highclass")),
                source["reference_date"],
                source["reference_date"],
            ),
        )
        imported += 1
        processed_rows.append(
            {
                "pseudocode": pseudocode,
                "state": clean_text(row.get("state")) or "",
                "district": clean_text(row.get("district")) or "",
                "block": clean_text(row.get("block")) or "",
                "rural_urban": to_int(row.get("rural_urban")) or "",
                "local_body_name": clean_text(row.get("lgd_urban_local_body_name")) or "",
                "ward_name": ward_label or "",
                "ward_no": ward_no or "",
                "school_category": to_int(row.get("school_category")) or "",
                "school_type": to_int(row.get("school_type")) or "",
                "management": to_int(row.get("managment")) or "",
                "reference_year": source["reference_date"],
            }
        )

    _write_csv(
        "udise_schools_clean.csv",
        [
            "pseudocode",
            "state",
            "district",
            "block",
            "rural_urban",
            "local_body_name",
            "ward_name",
            "ward_no",
            "school_category",
            "school_type",
            "management",
            "reference_year",
        ],
        processed_rows,
    )
    ward_matches = sum(1 for row in processed_rows if row["ward_no"])
    return {
        "records_read": len(rows),
        "records_imported": imported,
        "records_rejected": rejected,
        "notes": (
            f"Imported {imported} school profile records; {ward_matches} have a "
            "parsed ward number. School locations are unavailable, so ward access "
            "is approximate and not a radius count."
        ),
    }


def import_bus_stops(connection: Any) -> dict[str, Any]:
    source_id = "bus_stops"
    source = SOURCE_BY_ID[source_id]
    path = _source_path(source_id)
    rows = _read_csv(path)
    processed_rows: list[dict[str, Any]] = []
    imported = 0
    rejected = 0

    for row in rows:
        stop_id = clean_text(row.get("stop_id"))
        stop_name = clean_text(row.get("stop_name"))
        latitude = to_float(row.get("stop_lat"))
        longitude = to_float(row.get("stop_lon"))
        if not stop_id or not stop_name or not valid_lat_lon(latitude, longitude):
            rejected += 1
            continue
        connection.execute(
            """
            INSERT INTO bus_stops (
                stop_id, stop_name, zone_id, latitude, longitude, description,
                source_id, as_of_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(stop_id) DO UPDATE SET
                stop_name = excluded.stop_name,
                zone_id = excluded.zone_id,
                latitude = excluded.latitude,
                longitude = excluded.longitude,
                description = excluded.description,
                source_id = excluded.source_id,
                as_of_date = excluded.as_of_date
            """,
            (
                stop_id,
                stop_name,
                clean_text(row.get("zone_id")),
                latitude,
                longitude,
                clean_text(row.get("stop_desc")),
                source_id,
                source["reference_date"],
            ),
        )
        imported += 1
        processed_rows.append(
            {
                "stop_id": stop_id,
                "stop_name": stop_name,
                "zone_id": clean_text(row.get("zone_id")) or "",
                "latitude": latitude,
                "longitude": longitude,
                "description": clean_text(row.get("stop_desc")) or "",
            }
        )

    _write_csv(
        "bus_stops_clean.csv",
        ["stop_id", "stop_name", "zone_id", "latitude", "longitude", "description"],
        processed_rows,
    )
    return {
        "records_read": len(rows),
        "records_imported": imported,
        "records_rejected": rejected,
        "notes": "Imported mapped bus-stop points; no service frequency or ridership is available.",
    }


def import_metro_stations(connection: Any) -> dict[str, Any]:
    source_id = "metro_gtfs"
    source = SOURCE_BY_ID[source_id]
    path = _source_path(source_id)
    processed_rows: list[dict[str, Any]] = []
    imported = 0
    rejected = 0
    records_read = 0
    with zipfile.ZipFile(path) as archive:
        with archive.open("stops.txt") as handle:
            reader = csv.DictReader(io.TextIOWrapper(handle, encoding="utf-8-sig"))
            for row in reader:
                if str(row.get("location_type", "")).strip() != "1":
                    continue
                records_read += 1
                stop_id = clean_text(row.get("stop_id"))
                stop_name = clean_text(row.get("stop_name"))
                latitude = to_float(row.get("stop_lat"))
                longitude = to_float(row.get("stop_lon"))
                if not stop_id or not stop_name or not valid_lat_lon(latitude, longitude):
                    rejected += 1
                    continue
                connection.execute(
                    """
                    INSERT INTO metro_stations (
                        stop_id, stop_name, latitude, longitude, location_type,
                        parent_station, source_id, as_of_date
                    ) VALUES (?, ?, ?, ?, 1, ?, ?, ?)
                    ON CONFLICT(stop_id) DO UPDATE SET
                        stop_name = excluded.stop_name,
                        latitude = excluded.latitude,
                        longitude = excluded.longitude,
                        parent_station = excluded.parent_station,
                        source_id = excluded.source_id,
                        as_of_date = excluded.as_of_date
                    """,
                    (
                        stop_id,
                        stop_name,
                        latitude,
                        longitude,
                        clean_text(row.get("parent_station")),
                        source_id,
                        source["reference_date"],
                    ),
                )
                imported += 1
                processed_rows.append(
                    {
                        "stop_id": stop_id,
                        "stop_name": stop_name,
                        "latitude": latitude,
                        "longitude": longitude,
                        "parent_station": clean_text(row.get("parent_station")) or "",
                    }
                )

    _write_csv(
        "metro_stations_clean.csv",
        ["stop_id", "stop_name", "latitude", "longitude", "parent_station"],
        processed_rows,
    )
    return {
        "records_read": records_read,
        "records_imported": imported,
        "records_rejected": rejected,
        "notes": "Imported parent metro station records only; platform and entrance rows were excluded.",
    }


def import_google_trends(connection: Any) -> dict[str, Any]:
    source_id = "google_trends"
    source = SOURCE_BY_ID[source_id]
    path = _source_path(source_id)
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        lines = handle.readlines()
    header_index = next(
        (index for index, line in enumerate(lines) if line.strip().startswith("Week")),
        None,
    )
    if header_index is None:
        raise ValueError("Google Trends header row was not found")
    reader = csv.DictReader(lines[header_index:])
    processed_rows: list[dict[str, Any]] = []
    imported = 0
    rejected = 0
    week_count = 0
    latest_week = None

    for row in reader:
        week_text = clean_text(row.get("Week"))
        if not week_text:
            continue
        week_count += 1
        week_date = _coerce_date(week_text)
        if week_date is None:
            rejected += len(TREND_COLUMNS)
            continue
        latest_week = week_date if latest_week is None or week_date > latest_week else latest_week
        for column, (term, category_id) in TREND_COLUMNS.items():
            raw_value = row.get(column)
            interest = to_int(raw_value)
            if interest is None or not 0 <= interest <= 100:
                rejected += 1
                continue
            connection.execute(
                """
                INSERT INTO search_trends (
                    source_id, term, term_label, mapped_category_id, week_start,
                    interest, geography_scope, as_of_date
                ) VALUES (?, ?, ?, ?, ?, ?, 'Telangana', ?)
                ON CONFLICT(source_id, term, week_start) DO UPDATE SET
                    term_label = excluded.term_label,
                    mapped_category_id = excluded.mapped_category_id,
                    interest = excluded.interest,
                    geography_scope = excluded.geography_scope,
                    as_of_date = excluded.as_of_date
                """,
                (
                    source_id,
                    term,
                    column,
                    category_id,
                    week_date.isoformat(),
                    interest,
                    source["reference_date"],
                ),
            )
            imported += 1
            processed_rows.append(
                {
                    "source_id": source_id,
                    "term": term,
                    "term_label": column,
                    "mapped_category_id": category_id,
                    "week_start": week_date.isoformat(),
                    "interest": interest,
                }
            )

    _write_csv(
        "google_trends_hyderabad_clean.csv",
        ["source_id", "term", "term_label", "mapped_category_id", "week_start", "interest"],
        processed_rows,
    )
    return {
        "records_read": week_count * len(TREND_COLUMNS),
        "records_imported": imported,
        "records_rejected": rejected,
        "notes": (
            f"Imported {imported} weekly relative-interest values across "
            f"{week_count} weeks through {latest_week.isoformat() if latest_week else 'unknown'}. "
            "Values are relative search interest, not demand volume."
        ),
    }


def seed_localities(connection: Any) -> dict[str, Any]:
    source_id = "locality_reference_points"
    source = SOURCE_BY_ID[source_id]
    wards = _load_ward_polygons(connection)
    processed_rows: list[dict[str, Any]] = []

    for locality in LOCALITY_REFERENCE_POINTS:
        latitude = locality["latitude"]
        longitude = locality["longitude"]
        ward = _find_containing_ward(wards, latitude, longitude)
        assignment_method = "polygon_containment" if ward else None
        if ward is None:
            ward, _ = _nearest_ward(wards, latitude, longitude)
            assignment_method = "nearest_ward_centroid" if ward else "unassigned"
        connection.execute(
            """
            INSERT INTO localities (
                id, name, zone, latitude, longitude, coordinate_source,
                is_approximate, ward_id, ward_no, circle_no, circle_name,
                ward_assignment_method, population_2011, population_reference_year,
                population_note, source_id, as_of_date, is_estimated, is_synthetic
            ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, 1, 0)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                zone = excluded.zone,
                latitude = excluded.latitude,
                longitude = excluded.longitude,
                coordinate_source = excluded.coordinate_source,
                is_approximate = excluded.is_approximate,
                ward_id = excluded.ward_id,
                ward_no = excluded.ward_no,
                circle_no = excluded.circle_no,
                circle_name = excluded.circle_name,
                ward_assignment_method = excluded.ward_assignment_method,
                population_2011 = excluded.population_2011,
                population_reference_year = excluded.population_reference_year,
                population_note = excluded.population_note,
                source_id = excluded.source_id,
                as_of_date = excluded.as_of_date,
                is_estimated = excluded.is_estimated
            """,
            (
                locality["id"],
                locality["name"],
                locality["zone"],
                latitude,
                longitude,
                "Nominatim/OpenStreetMap lookup; approximate centre point",
                ward["ward_id"] if ward else None,
                ward["ward_no"] if ward else None,
                ward["circle_no"] if ward else None,
                ward["circle_name"] if ward else None,
                assignment_method,
                (
                    "No locality population assigned: 2011 census ward numbering "
                    "does not align with current GHMC wards or locality boundaries."
                ),
                source_id,
                source["reference_date"],
            ),
        )
        processed_rows.append(
            {
                "id": locality["id"],
                "name": locality["name"],
                "zone": locality["zone"],
                "latitude": latitude,
                "longitude": longitude,
                "ward_id": ward["ward_id"] if ward else "",
                "ward_no": ward["ward_no"] if ward else "",
                "circle_no": ward["circle_no"] if ward else "",
                "circle_name": ward["circle_name"] if ward else "",
                "ward_assignment_method": assignment_method or "unassigned",
            }
        )

    _write_csv(
        "localities_clean.csv",
        [
            "id",
            "name",
            "zone",
            "latitude",
            "longitude",
            "ward_id",
            "ward_no",
            "circle_no",
            "circle_name",
            "ward_assignment_method",
        ],
        processed_rows,
    )
    return {
        "records_read": len(LOCALITY_REFERENCE_POINTS),
        "records_imported": len(processed_rows),
        "records_rejected": 0,
        "notes": (
            "Seeded approximate locality centre points. These are not official "
            "boundaries; circular catchments overlap and must not be summed."
        ),
    }


IMPORT_SEQUENCE: list[tuple[str, Callable[[Any], dict[str, Any]]]] = [
    ("ghmc_wards", import_wards),
    ("osm_business_pois", import_osm_businesses),
    ("ghmc_trade_licences_2022", import_trade_licences_2022),
    ("ghmc_trade_licences_2023", import_trade_licences_2023),
    ("ghmc_activity", import_ghmc_activity),
    ("census_2011", import_census),
    ("udise_schools_2024_25", import_schools),
    ("bus_stops", import_bus_stops),
    ("metro_gtfs", import_metro_stations),
    ("google_trends", import_google_trends),
]


def _write_import_summary(connection: Any, results: list[dict[str, Any]]) -> None:
    sources = [
        dict(row)
        for row in connection.execute(
            """
            SELECT source_id, name, source_type, file_path, reference_date,
                   geography_level, last_loaded_at, record_count, notes
            FROM data_sources
            ORDER BY source_id
            """
        ).fetchall()
    ]
    payload = {
        "generated_at": utc_now(),
        "database_path": str(DB_PATH),
        "table_counts": table_counts(connection),
        "sources": sources,
        "last_import_results": results,
    }
    _write_json("import_summary.json", payload)


def run_imports(force: bool = False) -> list[dict[str, Any]]:
    init_db()
    connection = get_connection()
    results: list[dict[str, Any]] = []
    try:
        seed_data_sources(connection)
        for source_id, importer in IMPORT_SEQUENCE:
            if not force and source_loaded(connection, source_id):
                results.append(
                    {
                        "source_id": source_id,
                        "status": "skipped",
                        "records_read": 0,
                        "records_imported": 0,
                        "records_rejected": 0,
                        "notes": "Existing successful import found.",
                    }
                )
                continue
            started_at = utc_now()
            try:
                with connection:
                    import_result = importer(connection)
                log_import(
                    connection,
                    source_id,
                    "success",
                    import_result["records_read"],
                    import_result["records_imported"],
                    import_result["records_rejected"],
                    import_result["notes"],
                    started_at,
                )
                update_source_loaded(
                    connection,
                    source_id,
                    import_result["records_imported"],
                )
                results.append(
                    {
                        "source_id": source_id,
                        "status": "success",
                        **import_result,
                    }
                )
            except Exception as error:
                connection.rollback()
                log_import(
                    connection,
                    source_id,
                    "failed",
                    0,
                    0,
                    0,
                    str(error),
                    started_at,
                )
                results.append(
                    {
                        "source_id": source_id,
                        "status": "failed",
                        "records_read": 0,
                        "records_imported": 0,
                        "records_rejected": 0,
                        "notes": str(error),
                    }
                )

        locality_source_id = "locality_reference_points"
        if force or not source_loaded(connection, locality_source_id):
            started_at = utc_now()
            try:
                with connection:
                    locality_result = seed_localities(connection)
                log_import(
                    connection,
                    locality_source_id,
                    "success",
                    locality_result["records_read"],
                    locality_result["records_imported"],
                    locality_result["records_rejected"],
                    locality_result["notes"],
                    started_at,
                )
                update_source_loaded(
                    connection,
                    locality_source_id,
                    locality_result["records_imported"],
                )
                results.append(
                    {
                        "source_id": locality_source_id,
                        "status": "success",
                        **locality_result,
                    }
                )
            except Exception as error:
                connection.rollback()
                log_import(
                    connection,
                    locality_source_id,
                    "failed",
                    0,
                    0,
                    0,
                    str(error),
                    started_at,
                )
                results.append(
                    {
                        "source_id": locality_source_id,
                        "status": "failed",
                        "records_read": 0,
                        "records_imported": 0,
                        "records_rejected": 0,
                        "notes": str(error),
                    }
                )
        else:
            with connection:
                seed_localities(connection)
            results.append(
                {
                    "source_id": locality_source_id,
                    "status": "refreshed",
                    "records_read": len(LOCALITY_REFERENCE_POINTS),
                    "records_imported": len(LOCALITY_REFERENCE_POINTS),
                    "records_rejected": 0,
                    "notes": "Locality reference points refreshed without a new import log.",
                }
            )

        _write_import_summary(connection, results)
    finally:
        connection.close()
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Import MarketMinds datasets into SQLite")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-run imports even if a successful import is recorded",
    )
    arguments = parser.parse_args()
    results = run_imports(force=arguments.force)
    connection = get_connection()
    try:
        payload = {
            "database_path": str(DB_PATH),
            "table_counts": table_counts(connection),
            "results": results,
        }
        print(json.dumps(payload, indent=2))
    finally:
        connection.close()


if __name__ == "__main__":
    main()
