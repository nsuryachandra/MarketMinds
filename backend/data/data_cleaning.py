"""Cleaning, category mapping, and geospatial helpers for MarketMinds data."""

from __future__ import annotations

import json
import math
import re
from typing import Any, Iterable

EARTH_RADIUS_KM = 6371.0088
RADIUS_OPTIONS_M = (500, 1000, 2000)
DEFAULT_RADIUS_M = 2000


CATEGORY_DEFINITIONS: list[dict[str, Any]] = [
    {
        "id": "cafes",
        "name": "Cafés & Coffee",
        "short_name": "Cafés",
        "icon": "coffee",
        "tint": "gold",
        "description": "Mapped cafés and coffee-focused outlets.",
        "osm_tag_rules": ["amenity=cafe"],
        "risk_weights": {
            "competition": 0.30,
            "activity": 0.20,
            "access": 0.15,
            "financial": 0.25,
            "data_quality": 0.10,
        },
    },
    {
        "id": "restaurants",
        "name": "Restaurants",
        "short_name": "Restaurants",
        "icon": "restaurant",
        "tint": "coral",
        "description": "Mapped restaurants, fast-food outlets, and food courts.",
        "osm_tag_rules": [
            "amenity=restaurant",
            "amenity=fast_food",
            "amenity=food_court",
        ],
        "risk_weights": {
            "competition": 0.32,
            "activity": 0.20,
            "access": 0.15,
            "financial": 0.23,
            "data_quality": 0.10,
        },
    },
    {
        "id": "grocery",
        "name": "Grocery & Retail",
        "short_name": "Grocery",
        "icon": "grocery",
        "tint": "jade",
        "description": "Mapped grocery, convenience, general, and everyday retail outlets.",
        "osm_tag_rules": [
            "shop=supermarket",
            "shop=convenience",
            "shop=general",
            "amenity=marketplace",
            "shop=greengrocer",
            "shop=department_store",
        ],
        "risk_weights": {
            "competition": 0.30,
            "activity": 0.15,
            "access": 0.18,
            "financial": 0.27,
            "data_quality": 0.10,
        },
    },
    {
        "id": "fashion",
        "name": "Fashion & Apparel",
        "short_name": "Fashion",
        "icon": "fashion",
        "tint": "brand",
        "description": "Mapped clothing, footwear, jewellery, and tailoring businesses.",
        "osm_tag_rules": [
            "shop=clothes",
            "shop=shoes",
            "shop=jewelry",
            "shop=tailor",
            "shop=bag",
            "shop=boutique",
            "shop=fabric",
            "shop=leather",
        ],
        "risk_weights": {
            "competition": 0.35,
            "activity": 0.18,
            "access": 0.12,
            "financial": 0.25,
            "data_quality": 0.10,
        },
    },
    {
        "id": "wellness",
        "name": "Health & Wellness",
        "short_name": "Wellness",
        "icon": "wellness",
        "tint": "sea",
        "description": "Mapped clinics, doctors, dentists, and wellness services.",
        "osm_tag_rules": [
            "amenity=clinic",
            "healthcare=clinic",
            "amenity=dentist",
            "healthcare=dentist",
            "healthcare=doctor",
            "amenity=doctors",
            "healthcare=physiotherapist",
            "healthcare=centre",
        ],
        "risk_weights": {
            "competition": 0.28,
            "activity": 0.16,
            "access": 0.14,
            "financial": 0.30,
            "data_quality": 0.12,
        },
    },
    {
        "id": "fitness",
        "name": "Gyms & Fitness",
        "short_name": "Fitness",
        "icon": "fitness",
        "tint": "coral",
        "description": "Mapped fitness centres and gyms.",
        "osm_tag_rules": ["leisure=fitness_centre"],
        "risk_weights": {
            "competition": 0.30,
            "activity": 0.18,
            "access": 0.12,
            "financial": 0.28,
            "data_quality": 0.12,
        },
    },
    {
        "id": "education",
        "name": "Education & Coaching",
        "short_name": "Education",
        "icon": "education",
        "tint": "brand",
        "description": "Mapped schools, colleges, universities, and educational institutions.",
        "osm_tag_rules": [
            "amenity=school",
            "amenity=university",
            "amenity=college",
            "office=educational_institution",
        ],
        "risk_weights": {
            "competition": 0.30,
            "activity": 0.14,
            "access": 0.16,
            "financial": 0.28,
            "data_quality": 0.12,
        },
    },
    {
        "id": "tech",
        "name": "IT & Tech Services",
        "short_name": "Tech Services",
        "icon": "tech",
        "tint": "sea",
        "description": "Mapped IT offices and technology-service businesses.",
        "osm_tag_rules": ["office=it"],
        "risk_weights": {
            "competition": 0.28,
            "activity": 0.18,
            "access": 0.10,
            "financial": 0.34,
            "data_quality": 0.10,
        },
    },
    {
        "id": "salon",
        "name": "Beauty & Salons",
        "short_name": "Salons",
        "icon": "salon",
        "tint": "coral",
        "description": "Mapped hair and beauty service businesses.",
        "osm_tag_rules": ["shop=hairdresser", "shop=beauty"],
        "risk_weights": {
            "competition": 0.30,
            "activity": 0.16,
            "access": 0.14,
            "financial": 0.28,
            "data_quality": 0.12,
        },
    },
    {
        "id": "bakery",
        "name": "Bakeries & Desserts",
        "short_name": "Bakeries",
        "icon": "bakery",
        "tint": "gold",
        "description": "Mapped bakeries and confectionery outlets.",
        "osm_tag_rules": ["shop=bakery", "shop=confectionery"],
        "risk_weights": {
            "competition": 0.30,
            "activity": 0.18,
            "access": 0.14,
            "financial": 0.28,
            "data_quality": 0.10,
        },
    },
    {
        "id": "pharmacy",
        "name": "Pharmacies",
        "short_name": "Pharmacies",
        "icon": "pharmacy",
        "tint": "jade",
        "description": "Mapped pharmacies and medical-supply retailers.",
        "osm_tag_rules": [
            "amenity=pharmacy",
            "healthcare=pharmacy",
            "shop=medical_supply",
        ],
        "risk_weights": {
            "competition": 0.34,
            "activity": 0.12,
            "access": 0.14,
            "financial": 0.28,
            "data_quality": 0.12,
        },
    },
    {
        "id": "realestate",
        "name": "Real Estate Services",
        "short_name": "Real Estate",
        "icon": "realestate",
        "tint": "slate",
        "description": "Mapped real-estate agencies and property offices.",
        "osm_tag_rules": [
            "office=estate_agent",
            "shop=estate_agent",
            "office=real_estate",
            "shop=real_estate",
            "office=property_management",
        ],
        "risk_weights": {
            "competition": 0.36,
            "activity": 0.15,
            "access": 0.12,
            "financial": 0.27,
            "data_quality": 0.10,
        },
    },
    {
        "id": "meat",
        "name": "Meat & Poultry",
        "short_name": "Meat",
        "icon": "meat",
        "tint": "coral",
        "description": "Mapped butcher shops and seafood outlets.",
        "osm_tag_rules": ["shop=butcher", "shop=seafood"],
        "risk_weights": {
            "competition": 0.28,
            "activity": 0.15,
            "access": 0.18,
            "financial": 0.29,
            "data_quality": 0.10,
        },
    },
]

CATEGORY_BY_ID = {category["id"]: category for category in CATEGORY_DEFINITIONS}
SUPPORTED_CATEGORY_IDS = tuple(CATEGORY_BY_ID)
CATEGORY_NAMES = {category["id"]: category["name"] for category in CATEGORY_DEFINITIONS}

CATEGORY_ALIASES: dict[str, list[str]] = {
    "cafes": [
        "cafe",
        "café",
        "coffee",
        "coffee shop",
        "coffee house",
        "coffee bar",
        "tea shop",
        "tea stall",
        "tea house",
        "chai",
        "chai point",
        "juice",
        "juice shop",
        "juice centre",
        "juice center",
        "juice corner",
        "juice bar",
        "beverage shop",
        "ice cream parlour",
        "ice cream parlor",
        "dessert cafe",
    ],
    "restaurants": [
        "restaurant",
        "eatery",
        "dining",
        "dine",
        "fast food",
        "food court",
        "cloud kitchen",
        "dhaba",
        "biryani",
        "biryani shop",
        "meal",
        "hotel restaurant",
    ],
    "grocery": [
        "grocery",
        "grocery store",
        "supermarket",
        "super market",
        "kirana",
        "kirana store",
        "convenience store",
        "general store",
        "provisions",
        "daily needs",
        "department store",
        "greengrocer",
        "vegetable shop",
        "fruit shop",
        "market",
    ],
    "fashion": [
        "fashion",
        "clothing",
        "clothing store",
        "clothing shop",
        "clothes",
        "clothes shop",
        "apparel",
        "garment",
        "garment store",
        "boutique",
        "shoe store",
        "footwear",
        "jewellery",
        "jewelry",
        "tailor",
        "fabric store",
        "bag store",
    ],
    "wellness": [
        "wellness",
        "health wellness",
        "clinic",
        "health clinic",
        "doctor",
        "doctors",
        "dentist",
        "dental clinic",
        "physiotherapist",
        "physiotherapy",
        "wellness centre",
        "wellness center",
        "medical clinic",
    ],
    "fitness": [
        "gym",
        "fitness",
        "fitness centre",
        "fitness center",
        "fitness studio",
        "crossfit",
        "pilates",
        "yoga studio",
        "yoga centre",
        "health club",
    ],
    "education": [
        "education",
        "school",
        "college",
        "university",
        "coaching",
        "coaching centre",
        "coaching center",
        "tuition",
        "tuition centre",
        "tuition center",
        "learning centre",
        "learning center",
        "test prep",
        "test preparation",
        "institute",
    ],
    "tech": [
        "tech",
        "it",
        "it service",
        "it services",
        "software",
        "software company",
        "software studio",
        "technology",
        "tech service",
        "tech services",
        "it office",
        "app development",
        "digital agency",
    ],
    "salon": [
        "salon",
        "beauty salon",
        "beauty parlour",
        "beauty parlor",
        "beauty",
        "spa",
        "grooming",
        "barber",
        "barber shop",
        "hairdresser",
        "hair salon",
        "nail salon",
    ],
    "bakery": [
        "bakery",
        "bakeshop",
        "bake shop",
        "patisserie",
        "dessert",
        "dessert shop",
        "cake shop",
        "confectionery",
        "sweet shop",
        "sweets",
        "pastry shop",
    ],
    "pharmacy": [
        "pharmacy",
        "medical store",
        "medical shop",
        "chemist",
        "chemist shop",
        "drugstore",
        "drug store",
        "medical supply",
        "healthcare retail",
        "medicine shop",
    ],
    "realestate": [
        "real estate",
        "realestate",
        "realty",
        "property",
        "property dealer",
        "property consultant",
        "estate agent",
        "estate agency",
        "broker",
        "land agent",
    ],
    "meat": [
        "meat",
        "meat shop",
        "meat market",
        "butcher",
        "butcher shop",
        "poultry",
        "poultry shop",
        "chicken shop",
        "mutton shop",
        "fish shop",
        "seafood",
        "seafood shop",
    ],
}

CATEGORY_SEARCH_NOTES: dict[str, str | None] = {
    "cafes": (
        "Juice, tea, and coffee-shop wording is mapped to Cafés & Coffee, "
        "the closest approved category."
    ),
    "restaurants": None,
    "grocery": None,
    "fashion": None,
    "wellness": None,
    "fitness": None,
    "education": None,
    "tech": None,
    "salon": None,
    "bakery": None,
    "pharmacy": None,
    "realestate": None,
    "meat": None,
}


def _build_category_rules() -> list[tuple[tuple[str, str], str]]:
    rules: list[tuple[tuple[str, str], str]] = []
    for category in CATEGORY_DEFINITIONS:
        for rule in category["osm_tag_rules"]:
            key, value = rule.split("=", 1)
            rules.append(((key, value), category["id"]))
    return rules


CATEGORY_OSM_RULES = _build_category_rules()


def category_for_tags(tags: dict[str, Any]) -> tuple[str | None, str | None, str | None, str | None]:
    """Return the first supported category matched by an OSM tag set."""
    for (key, value), category_id in CATEGORY_OSM_RULES:
        if str(tags.get(key, "")).strip().lower() == value:
            return category_id, value, key, value
    return None, None, None, None


def name_status(name: Any) -> str:
    """Classify a POI name without inventing one."""
    return "named" if clean_text(name) else "unnamed"


def clean_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def to_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return None


def to_int(value: Any) -> int | None:
    parsed = to_float(value)
    if parsed is None:
        return None
    return int(parsed)


def valid_lat_lon(latitude: float | None, longitude: float | None) -> bool:
    return (
        latitude is not None
        and longitude is not None
        and -90.0 <= latitude <= 90.0
        and -180.0 <= longitude <= 180.0
    )


def clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return max(minimum, min(maximum, value))


def round_or_none(value: float | None, digits: int = 2) -> float | None:
    return None if value is None else round(value, digits)


def percentage(numerator: float, denominator: float) -> float | None:
    if denominator == 0:
        return None
    return round((numerator / denominator) * 100, 2)


_PREFIX_LABEL_RE = re.compile(r"^\s*(\d+)\s*(?:/\s*\d+)?\s*[-\u2013\u2014]\s*(.+?)\s*$")
_SCHOOL_WARD_RE = re.compile(r"ward\s*no\.?\s*(\d+)", re.IGNORECASE)


def parse_prefixed_label(value: Any) -> tuple[int | None, str | None]:
    """Split values such as ``93-BANJARA HILLS`` into number and label."""
    text = clean_text(value)
    if not text:
        return None, None
    match = _PREFIX_LABEL_RE.match(text)
    if not match:
        return None, text
    return int(match.group(1)), match.group(2).strip()


def parse_school_ward(value: Any) -> int | None:
    text = clean_text(value)
    if not text:
        return None
    match = _SCHOOL_WARD_RE.search(text)
    return int(match.group(1)) if match else None


def parse_kml_coordinates(text: str | None) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    if not text:
        return points
    for token in text.replace("\n", " ").split():
        parts = token.split(",")
        if len(parts) < 2:
            continue
        longitude = to_float(parts[0])
        latitude = to_float(parts[1])
        if valid_lat_lon(latitude, longitude):
            points.append((longitude, latitude))
    if len(points) > 1 and points[0] != points[-1]:
        points.append(points[0])
    return points


def _ring_centroid(ring: list[tuple[float, float]]) -> tuple[float, float, float]:
    if not ring:
        return 0.0, 0.0, 0.0
    if len(ring) < 3:
        return (
            sum(point[0] for point in ring) / len(ring),
            sum(point[1] for point in ring) / len(ring),
            0.0,
        )
    twice_area = 0.0
    longitude_sum = 0.0
    latitude_sum = 0.0
    for index, (longitude_a, latitude_a) in enumerate(ring):
        longitude_b, latitude_b = ring[(index + 1) % len(ring)]
        cross = longitude_a * latitude_b - longitude_b * latitude_a
        twice_area += cross
        longitude_sum += (longitude_a + longitude_b) * cross
        latitude_sum += (latitude_a + latitude_b) * cross
    signed_area = twice_area / 2.0
    if abs(signed_area) < 1e-12:
        return (
            sum(point[0] for point in ring) / len(ring),
            sum(point[1] for point in ring) / len(ring),
            0.0,
        )
    return (
        longitude_sum / (6.0 * signed_area),
        latitude_sum / (6.0 * signed_area),
        abs(signed_area),
    )


def _polygon_coordinates(geometry: dict[str, Any]) -> list[list[list[Any]]]:
    coordinates = geometry.get("coordinates", [])
    if geometry.get("type") == "Polygon":
        return [coordinates]
    return coordinates


def geometry_centroid(geometry: dict[str, Any]) -> tuple[float, float]:
    """Return a (latitude, longitude) centroid for a GeoJSON Polygon/MultiPolygon."""
    polygons = _polygon_coordinates(geometry)
    weighted_longitude = 0.0
    weighted_latitude = 0.0
    total_area = 0.0
    fallback_points: list[tuple[float, float]] = []

    for polygon in polygons:
        if not polygon:
            continue
        outer_ring = polygon[0]
        if outer_ring:
            fallback_points.extend(outer_ring)
        longitude, latitude, area = _ring_centroid(outer_ring)
        weighted_longitude += longitude * area
        weighted_latitude += latitude * area
        total_area += area

    if total_area > 0:
        return weighted_latitude / total_area, weighted_longitude / total_area
    if fallback_points:
        return (
            sum(point[1] for point in fallback_points) / len(fallback_points),
            sum(point[0] for point in fallback_points) / len(fallback_points),
        )
    return 0.0, 0.0


def geometry_bbox(geometry: dict[str, Any]) -> tuple[float, float, float, float] | None:
    points: list[tuple[float, float]] = []
    for polygon in _polygon_coordinates(geometry):
        for ring in polygon:
            points.extend(ring)
    if not points:
        return None
    longitudes = [point[0] for point in points]
    latitudes = [point[1] for point in points]
    return min(longitudes), min(latitudes), max(longitudes), max(latitudes)


def _point_on_segment(
    longitude: float,
    latitude: float,
    longitude_a: float,
    latitude_a: float,
    longitude_b: float,
    latitude_b: float,
) -> bool:
    cross = (
        (longitude - longitude_a) * (latitude_b - latitude_a)
        - (latitude - latitude_a) * (longitude_b - longitude_a)
    )
    if abs(cross) > 1e-12:
        return False
    dot = (
        (longitude - longitude_a) * (longitude_b - longitude_a)
        + (latitude - latitude_a) * (latitude_b - latitude_a)
    )
    if dot < -1e-12:
        return False
    squared_length = (longitude_b - longitude_a) ** 2 + (latitude_b - latitude_a) ** 2
    return dot <= squared_length + 1e-12


def point_in_ring(longitude: float, latitude: float, ring: list[tuple[float, float]]) -> bool:
    if len(ring) < 3:
        return False
    inside = False
    previous_index = len(ring) - 1
    for current_index, (longitude_a, latitude_a) in enumerate(ring):
        longitude_b, latitude_b = ring[previous_index]
        if _point_on_segment(
            longitude,
            latitude,
            longitude_a,
            latitude_a,
            longitude_b,
            latitude_b,
        ):
            return True
        crosses_latitude = (latitude_a > latitude) != (latitude_b > latitude)
        if crosses_latitude:
            intersection = (
                (longitude_b - longitude_a) * (latitude - latitude_a)
                / (latitude_b - latitude_a)
                + longitude_a
            )
            if longitude < intersection:
                inside = not inside
        previous_index = current_index
    return inside


def point_in_polygon(longitude: float, latitude: float, rings: list[list[tuple[float, float]]]) -> bool:
    if not rings or not point_in_ring(longitude, latitude, rings[0]):
        return False
    for hole in rings[1:]:
        if point_in_ring(longitude, latitude, hole):
            return False
    return True


def point_in_geometry(latitude: float, longitude: float, geometry: dict[str, Any]) -> bool:
    for polygon in _polygon_coordinates(geometry):
        if point_in_polygon(longitude, latitude, polygon):
            return True
    return False


def haversine_km(
    latitude_a: float,
    longitude_a: float,
    latitude_b: float,
    longitude_b: float,
) -> float:
    latitude_a_rad = math.radians(latitude_a)
    latitude_b_rad = math.radians(latitude_b)
    latitude_delta = latitude_b_rad - latitude_a_rad
    longitude_delta = math.radians(longitude_b - longitude_a)
    haversine = (
        math.sin(latitude_delta / 2.0) ** 2
        + math.cos(latitude_a_rad)
        * math.cos(latitude_b_rad)
        * math.sin(longitude_delta / 2.0) ** 2
    )
    return 2.0 * EARTH_RADIUS_KM * math.asin(min(1.0, math.sqrt(haversine)))


def geometry_to_json(geometry: dict[str, Any]) -> str:
    return json.dumps(geometry, separators=(",", ":"))


def geometry_from_json(value: str | None) -> dict[str, Any] | None:
    if not value:
        return None
    try:
        parsed = json.loads(value)
    except (TypeError, ValueError):
        return None
    return parsed if isinstance(parsed, dict) else None


def categories_metadata() -> list[dict[str, Any]]:
    return [
        {
            "id": category["id"],
            "name": category["name"],
            "short_name": category["short_name"],
            "icon": category["icon"],
            "tint": category["tint"],
            "description": category["description"],
            "osm_tag_rules": list(category["osm_tag_rules"]),
            "risk_weights": dict(category["risk_weights"]),
            "aliases": list(CATEGORY_ALIASES.get(category["id"], [])),
            "search_note": CATEGORY_SEARCH_NOTES.get(category["id"]),
        }
        for category in CATEGORY_DEFINITIONS
    ]


def unique_preserving_order(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value not in seen:
            seen.add(value)
            result.append(value)
    return result
