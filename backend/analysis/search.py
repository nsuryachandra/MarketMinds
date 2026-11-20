"""Deterministic natural-language interpretation for category and business searches."""

from __future__ import annotations

import re
import unicodedata
from difflib import SequenceMatcher
from typing import Any

from analysis import market
from data.data_cleaning import (
    CATEGORY_ALIASES,
    CATEGORY_BY_ID,
    CATEGORY_DEFINITIONS,
    CATEGORY_SEARCH_NOTES,
    haversine_km,
)

GENERIC_TOKENS = {
    "a",
    "an",
    "and",
    "any",
    "best",
    "business",
    "businesses",
    "center",
    "centre",
    "company",
    "companies",
    "find",
    "for",
    "good",
    "in",
    "local",
    "looking",
    "me",
    "near",
    "nearby",
    "new",
    "office",
    "open",
    "opening",
    "outlet",
    "outlets",
    "please",
    "search",
    "service",
    "services",
    "shop",
    "show",
    "store",
    "the",
    "to",
    "want",
}

LEADING_STOPWORDS = {
    "analyze",
    "analyse",
    "best",
    "find",
    "for",
    "good",
    "i",
    "look",
    "looking",
    "nearby",
    "new",
    "open",
    "opening",
    "please",
    "search",
    "show",
    "the",
    "want",
}

TRAILING_STOPWORDS = {
    "area",
    "around",
    "at",
    "for",
    "hyderabad",
    "in",
    "locality",
    "me",
    "near",
    "nearby",
    "please",
    "telangana",
    "within",
}

GENERIC_LOCALITY_WORDS = {"here", "me"}

LOCALITY_ALIASES: dict[str, list[str]] = {
    "ameerpet": ["ameerpet", "ameer pet"],
    "banjara-hills": ["banjara hills", "banjarahills", "banjara"],
    "begumpet": ["begumpet"],
    "charminar": ["charminar", "char minar"],
    "dilsukhnagar": ["dilsukhnagar", "dilshuknagar", "dilsukh nagar"],
    "gachibowli": ["gachibowli", "gachi bowli"],
    "hitec-city": [
        "hitec city",
        "hitech city",
        "hi tech city",
        "hitec-city",
        "hitech-city",
        "cyber city",
    ],
    "jubilee-hills": ["jubilee hills", "jubileehills", "jubilee"],
    "kokapet": ["kokapet"],
    "kondapur": ["kondapur"],
    "kukatpally": ["kukatpally", "kukatpalli", "kukat pally"],
    "lb-nagar": ["lb nagar", "l b nagar", "lbnagar"],
    "manikonda": ["manikonda"],
    "miyapur": ["miyapur"],
    "secunderabad": ["secunderabad", "secbad"],
    "uppal": ["uppal"],
    # Expanded Hyderabad localities
    "moti-nagar": ["moti nagar", "mothinagar", "mothi nagar", "motinagar", "moti-nagar"],
    "srinagar-colony": ["srinagar colony", "sri nagar colony", "srinagar", "sri nagar", "srinagarcolony"],
    "sr-nagar": ["sr nagar", "s r nagar", "sanjeeva reddy nagar", "srnagar", "sanjeevareddynagar"],
    "madhapur": ["madhapur"],
    "kphb-colony": ["kphb colony", "kphb", "kukatpally housing board", "kphb phase 1", "kphb phase 2"],
    "panjagutta": ["panjagutta", "punjagutta", "panja gutta", "punja gutta"],
    "somajiguda": ["somajiguda", "somajiguda circle"],
    "khairatabad": ["khairatabad", "khairtabad"],
    "masab-tank": ["masab tank", "masabtank"],
    "financial-district": ["financial district", "nanakramguda", "waverock"],
    "mehdipatnam": ["mehdipatnam", "mehdi patnam"],
    "tolichowki": ["tolichowki", "toli chowki"],
    "film-nagar": ["film nagar", "filmnagar"],
    "sanath-nagar": ["sanath nagar", "sanathnagar"],
    "erragadda": ["erragadda", "erra gadda"],
    "alwal": ["alwal"],
    "malkajgiri": ["malkajgiri"],
    "tarnaka": ["tarnaka"],
    "habsiguda": ["habsiguda"],
    "himayatnagar": ["himayatnagar", "himayat nagar"],
    "abids": ["abids", "abid road"],
    "koti": ["koti"],
    "kachiguda": ["kachiguda", "kacheguda"],
    "nampally": ["nampally"],
    "chikkadpally": ["chikkadpally", "chikkadapally"],
    "narayanaguda": ["narayanaguda", "narayan guda"],
    "musheerabad": ["musheerabad", "mushirabad"],
    "attapur": ["attapur"],
    "bowenpally": ["bowenpally", "bowen pally"],
    "amberpet": ["amberpet", "amber pet"],
    "malakpet": ["malakpet", "malak pet"],
    "santoshnagar": ["santoshnagar", "santosh nagar"],
    "chandanagar": ["chandanagar", "chanda nagar"],
    "nallagandla": ["nallagandla"],
    "nizampet": ["nizampet", "nizampet village"],
    "balanagar": ["balanagar", "bala nagar"],
    "jeedimetla": ["jeedimetla", "jeedimetla ida"],
    "lingampally": ["lingampally", "bhel", "serilingampally"],
}


def normalize_text(value: str | None) -> str:
    if not value:
        return ""
    normalized = unicodedata.normalize("NFKD", value)
    without_marks = "".join(
        character
        for character in normalized
        if not unicodedata.combining(character)
    )
    normalized = without_marks.casefold().replace("&", " and ")
    normalized = re.sub(r"[^a-z0-9]+", " ", normalized)
    return " ".join(normalized.split())


def _phrase_contains(phrase: str, alias: str) -> bool:
    if not phrase or not alias:
        return False
    return re.search(
        rf"(?<![a-z0-9]){re.escape(alias)}(?![a-z0-9])",
        phrase,
    ) is not None


def _subtract_tokens(tokens: list[str], alias_tokens: list[str]) -> list[str]:
    remaining = list(tokens)
    for token in alias_tokens:
        if token not in remaining:
            return tokens
        remaining.remove(token)
    return remaining


def _clean_phrase(value: str) -> str:
    tokens = value.split()
    while tokens and (tokens[0] in LEADING_STOPWORDS or tokens[0] in GENERIC_TOKENS):
        tokens.pop(0)
    while tokens and tokens[-1] in TRAILING_STOPWORDS:
        tokens.pop()
    return " ".join(tokens)


def _locality_alias_pairs(localities: list[dict[str, Any]]) -> list[tuple[str, str]]:
    pairs: list[tuple[str, str]] = []
    for locality in localities:
        names = {normalize_text(locality["name"]), locality["id"].replace("-", " ")}
        names.update(LOCALITY_ALIASES.get(locality["id"], []))
        for alias in names:
            normalized_alias = normalize_text(alias)
            if normalized_alias:
                pairs.append((normalized_alias, locality["id"]))
    return sorted(set(pairs), key=lambda item: (-len(item[0]), item[0]))


def _public_locality(locality: dict[str, Any] | None) -> dict[str, Any] | None:
    if locality is None:
        return None
    return {
        "id": locality["id"],
        "name": locality["name"],
        "zone": locality["zone"],
        "latitude": locality["latitude"],
        "longitude": locality["longitude"],
        "is_approximate": bool(locality["is_approximate"]),
        "ward_id": locality.get("ward_id"),
        "ward_no": locality.get("ward_no"),
    }


def _locality_options(connection: Any) -> list[dict[str, Any]]:
    return [
        {
            "id": locality["id"],
            "name": locality["name"],
            "zone": locality["zone"],
        }
        for locality in market.list_localities(connection)
    ]


def _match_locality(
    connection: Any,
    text: str,
    locality_id: str | None,
) -> dict[str, Any]:
    localities = market.list_localities(connection)
    if locality_id:
        selected = market.get_locality_or_raise(connection, locality_id)
        return {
            "locality": selected,
            "remaining_text": _remove_locality_alias(text, localities, selected["id"]),
            "ambiguous": [],
            "unknown_phrase": None,
            "note": None,
        }

    matches: list[tuple[str, str]] = []
    for alias, matched_id in _locality_alias_pairs(localities):
        if _phrase_contains(text, alias):
            matches.append((alias, matched_id))

    if matches:
        longest_alias, longest_id = matches[0]
        matched_ids = sorted({matched_id for _, matched_id in matches})
        selected = market.get_locality_or_raise(connection, longest_id)
        return {
            "locality": selected,
            "remaining_text": _remove_text_alias(text, longest_alias),
            "ambiguous": (
                [
                    _public_locality(market.get_locality_or_raise(connection, item))
                    for item in matched_ids
                    if item != longest_id
                ]
                if len(matched_ids) > 1
                else []
            ),
            "unknown_phrase": None,
            "note": None,
        }

    preposition = re.search(
        r"(?:^|\s)(?:in|at|near|around|within)\s+(.+)$",
        text,
    )
    if preposition:
        candidate = _clean_phrase(preposition.group(1))
        if candidate and candidate not in GENERIC_LOCALITY_WORDS:
            best_id = None
            best_score = 0.0
            second_score = 0.0
            for alias, candidate_id in _locality_alias_pairs(localities):
                score = SequenceMatcher(None, candidate, alias).ratio()
                if score > best_score:
                    second_score = best_score
                    best_score = score
                    best_id = candidate_id
                elif score > second_score:
                    second_score = score
            if best_id and best_score >= 0.86 and best_score - second_score >= 0.02:
                selected = market.get_locality_or_raise(connection, best_id)
                return {
                    "locality": selected,
                    "remaining_text": text[: preposition.start()],
                    "ambiguous": [],
                    "unknown_phrase": None,
                    "note": (
                        f"Approximately matched locality wording to {selected['name']}."
                    ),
                }
            return {
                "locality": None,
                "remaining_text": text[: preposition.start()],
                "ambiguous": [],
                "unknown_phrase": preposition.group(1).strip(),
                "note": None,
            }

    return {
        "locality": None,
        "remaining_text": text,
        "ambiguous": [],
        "unknown_phrase": None,
        "note": None,
    }


def _remove_text_alias(text: str, alias: str) -> str:
    return re.sub(
        rf"(?<![a-z0-9]){re.escape(alias)}(?![a-z0-9])",
        " ",
        text,
        count=1,
    )


def _remove_locality_alias(
    text: str,
    localities: list[dict[str, Any]],
    locality_id: str,
) -> str:
    for alias, matched_id in _locality_alias_pairs(localities):
        if matched_id == locality_id and _phrase_contains(text, alias):
            return _remove_text_alias(text, alias)
    return text


def _category_vocabulary(category: dict[str, Any]) -> set[str]:
    values = [category["name"], *CATEGORY_ALIASES.get(category["id"], [])]
    tokens: set[str] = set()
    for value in values:
        tokens.update(normalize_text(value).split())
    return tokens


def _best_category_alias(phrase: str, category: dict[str, Any]) -> str | None:
    values = [category["name"], *CATEGORY_ALIASES.get(category["id"], [])]
    matches = [
        normalize_text(value)
        for value in values
        if _phrase_contains(phrase, normalize_text(value))
    ]
    if not matches:
        return None
    return max(matches, key=len)


def _category_matches(phrase: str) -> list[dict[str, Any]]:
    tokens = phrase.split()
    if not tokens:
        return []
    specific_tokens = [token for token in tokens if token not in GENERIC_TOKENS]
    if not specific_tokens:
        return []
    matches: list[dict[str, Any]] = []
    for category in CATEGORY_DEFINITIONS:
        vocabulary = _category_vocabulary(category)
        uncovered = [
            token
            for token in tokens
            if token not in GENERIC_TOKENS and token not in vocabulary
        ]
        if uncovered:
            continue
        category_tokens = [token for token in specific_tokens if token in vocabulary]
        if not category_tokens:
            continue
        alias = _best_category_alias(phrase, category)
        exact = phrase in {
            normalize_text(category["name"]),
            *(normalize_text(item) for item in CATEGORY_ALIASES.get(category["id"], [])),
        }
        matches.append(
            {
                "category": category,
                "alias": alias or normalize_text(category["name"]),
                "confidence": 0.99 if exact else 0.92,
                "specific_token_count": len(category_tokens),
            }
        )
    matches.sort(
        key=lambda item: (
            -item["specific_token_count"],
            -item["confidence"],
            item["category"]["id"],
        )
    )
    return matches


def _category_payload(
    category: dict[str, Any],
    alias: str | None,
    confidence: float,
) -> dict[str, Any]:
    return {
        "id": category["id"],
        "name": category["name"],
        "short_name": category["short_name"],
        "icon": category["icon"],
        "tint": category["tint"],
        "matched_alias": alias,
        "mapping_note": CATEGORY_SEARCH_NOTES.get(category["id"]),
        "confidence": confidence,
    }


def _category_hint(phrase: str) -> dict[str, Any] | None:
    tokens = set(phrase.split()) - GENERIC_TOKENS
    scored: list[tuple[int, dict[str, Any], str | None]] = []
    for category in CATEGORY_DEFINITIONS:
        vocabulary = _category_vocabulary(category)
        count = len(tokens & vocabulary)
        if count:
            scored.append(
                (
                    count,
                    category,
                    _best_category_alias(phrase, category),
                )
            )
    if not scored:
        return None
    scored.sort(key=lambda item: (-item[0], item[1]["id"]))
    count, category, alias = scored[0]
    return _category_payload(category, alias, 0.55 if count else 0.4)


def _business_rows(connection: Any) -> list[dict[str, Any]]:
    return [
        {
            "osm_id": row["osm_id"],
            "name": row["name"],
            "category_id": row["category_id"],
            "category_name": row["category_name"],
            "latitude": row["latitude"],
            "longitude": row["longitude"],
        }
        for row in connection.execute(
            """
            SELECT osm_id, name, category_id, category_name, latitude, longitude
            FROM businesses
            WHERE name IS NOT NULL AND category_id IS NOT NULL
            """
        ).fetchall()
    ]


def _business_score(query: str, name: str) -> float:
    if not query or not name:
        return 0.0
    if query == name:
        return 1.0
    query_tokens = set(query.split())
    name_tokens = set(name.split())
    if not query_tokens:
        return 0.0
    coverage = len(query_tokens & name_tokens) / len(query_tokens)
    similarity = SequenceMatcher(None, query, name).ratio()
    if query in name and (len(query_tokens) >= 2 or len(query) >= 5):
        containment = 0.9 if len(query_tokens) > 1 else 0.85
    else:
        containment = 0.0
    if len(query_tokens) == 1 and len(query) < 3:
        return 0.0
    return max(similarity, containment, coverage * 0.94)


def _business_matches(
    connection: Any,
    phrase: str,
    locality: dict[str, Any] | None,
    limit: int = 5,
) -> list[dict[str, Any]]:
    if not phrase:
        return []
    matches: list[dict[str, Any]] = []
    for row in _business_rows(connection):
        normalized_name = normalize_text(row["name"])
        score = _business_score(phrase, normalized_name)
        if score < 0.78:
            continue
        nearest = market.nearest_locality(
            connection,
            row["latitude"],
            row["longitude"],
        )
        locality_distance = None
        if locality is not None:
            locality_distance = round(
                haversine_km(
                    locality["latitude"],
                    locality["longitude"],
                    row["latitude"],
                    row["longitude"],
                )
                * 1000.0,
                1,
            )
        category = CATEGORY_BY_ID.get(row["category_id"])
        matches.append(
            {
                "osm_id": row["osm_id"],
                "name": row["name"],
                "display_name": row["name"],
                "category": {
                    "id": row["category_id"],
                    "name": row["category_name"]
                    or (category["name"] if category else row["category_id"]),
                },
                "latitude": row["latitude"],
                "longitude": row["longitude"],
                "match_score": round(score, 3),
                "nearest_locality": _public_locality(nearest),
                "distance_from_selected_locality_m": locality_distance,
            }
        )
    matches.sort(
        key=lambda item: (
            item["distance_from_selected_locality_m"]
            if item["distance_from_selected_locality_m"] is not None
            else 0.0,
            -item["match_score"],
            item["name"].casefold(),
            item["osm_id"],
        )
    )
    return matches[:limit]


def interpret_search(
    connection: Any,
    query: str,
    locality_id: str | None = None,
) -> dict[str, Any]:
    original_query = (query or "").strip()
    normalized_query = normalize_text(original_query)
    if not normalized_query:
        raise ValueError("query must not be empty")

    locality_match = _match_locality(connection, normalized_query, locality_id)
    selected_locality = locality_match["locality"]
    remaining = _clean_phrase(locality_match["remaining_text"])
    category_matches = _category_matches(remaining)
    notes: list[str] = []
    if locality_match["note"]:
        notes.append(locality_match["note"])
    if locality_match["ambiguous"]:
        options = [
            _public_locality(selected_locality),
            *locality_match["ambiguous"],
        ]
        return {
            "query": original_query,
            "normalized_query": normalized_query,
            "search_type": "category" if category_matches else "unsupported",
            "match_status": "needs_clarification",
            "confidence": 0.5,
            "category": (
                _category_payload(
                    category_matches[0]["category"],
                    category_matches[0]["alias"],
                    category_matches[0]["confidence"],
                )
                if len(category_matches) == 1
                else None
            ),
            "category_hint": None,
            "locality": None,
            "business": None,
            "business_matches": [],
            "clarification": {
                "required": True,
                "type": "locality",
                "message": "More than one locality matched. Choose one to continue.",
                "options": [item for item in options if item is not None],
            },
            "notes": notes,
        }

    if locality_id and locality_match["locality"] is None:
        market.get_locality_or_raise(connection, locality_id)

    if not remaining:
        return {
            "query": original_query,
            "normalized_query": normalized_query,
            "search_type": "unsupported",
            "match_status": "needs_clarification",
            "confidence": 0.3,
            "category": None,
            "category_hint": None,
            "locality": _public_locality(selected_locality),
            "business": None,
            "business_matches": [],
            "clarification": {
                "required": True,
                "type": "query",
                "message": "Tell us what type of business or which business name to analyse.",
                "options": [],
            },
            "notes": notes,
        }

    if len(category_matches) > 1:
        categories = [
            _category_payload(item["category"], item["alias"], item["confidence"])
            for item in category_matches
        ]
        return {
            "query": original_query,
            "normalized_query": normalized_query,
            "search_type": "category",
            "match_status": "needs_clarification",
            "confidence": 0.6,
            "category": None,
            "category_hint": None,
            "locality": _public_locality(selected_locality),
            "business": None,
            "business_matches": [],
            "clarification": {
                "required": True,
                "type": "category",
                "message": (
                    "More than one approved category matched. Choose the closest "
                    "category to continue."
                ),
                "options": categories,
            },
            "notes": notes,
        }

    if len(category_matches) == 1:
        match = category_matches[0]
        category_payload = _category_payload(
            match["category"],
            match["alias"],
            match["confidence"],
        )
        if category_payload["mapping_note"]:
            notes.append(category_payload["mapping_note"])
        if locality_match["unknown_phrase"]:
            return {
                "query": original_query,
                "normalized_query": normalized_query,
                "search_type": "category",
                "match_status": "needs_clarification",
                "confidence": 0.7,
                "category": category_payload,
                "category_hint": None,
                "locality": None,
                "business": None,
                "business_matches": [],
                "clarification": {
                    "required": True,
                    "type": "locality",
                    "message": (
                        f'We could not match "{locality_match["unknown_phrase"]}" to '
                        "one of the supported localities. Choose a locality to continue."
                    ),
                    "options": _locality_options(connection),
                },
                "notes": notes,
            }
        if selected_locality is None:
            return {
                "query": original_query,
                "normalized_query": normalized_query,
                "search_type": "category",
                "match_status": "needs_clarification",
                "confidence": 0.85,
                "category": category_payload,
                "category_hint": None,
                "locality": None,
                "business": None,
                "business_matches": [],
                "clarification": {
                    "required": True,
                    "type": "locality",
                    "message": (
                        "Which locality should this analysis use? "
                        "Choose one of the supported localities."
                    ),
                    "options": _locality_options(connection),
                },
                "notes": notes,
            }
        return {
            "query": original_query,
            "normalized_query": normalized_query,
            "search_type": "category",
            "match_status": "matched",
            "confidence": category_payload["confidence"],
            "category": category_payload,
            "category_hint": None,
            "locality": _public_locality(selected_locality),
            "business": None,
            "business_matches": [],
            "clarification": None,
            "notes": notes,
        }

    matches = _business_matches(connection, remaining, selected_locality)
    category_hint = _category_hint(remaining)
    if len(matches) == 1:
        match = matches[0]
        category = CATEGORY_BY_ID.get(match["category"]["id"])
        category_payload = (
            _category_payload(category, match["name"], 0.9)
            if category is not None
            else None
        )
        if category_payload and category_payload["mapping_note"]:
            notes.append(category_payload["mapping_note"])
        notes.append(
            "Business rows are OpenStreetMap records; operation status is not verified."
        )
        return {
            "query": original_query,
            "normalized_query": normalized_query,
            "search_type": "business",
            "match_status": "matched",
            "confidence": match["match_score"],
            "category": category_payload,
            "category_hint": None,
            "locality": _public_locality(selected_locality)
            or match["nearest_locality"],
            "business": match,
            "business_matches": [],
            "clarification": None,
            "notes": notes,
        }

    if len(matches) > 1:
        notes.append(
            "Multiple mapped businesses matched this name or chain. "
            "Choose the exact outlet to analyse."
        )
        return {
            "query": original_query,
            "normalized_query": normalized_query,
            "search_type": "business",
            "match_status": "needs_clarification",
            "confidence": matches[0]["match_score"],
            "category": None,
            "category_hint": None,
            "locality": _public_locality(selected_locality),
            "business": None,
            "business_matches": matches,
            "clarification": {
                "required": True,
                "type": "business",
                "message": (
                    "Multiple mapped businesses matched. Choose the outlet you mean; "
                    "the list is ordered by distance when a locality was supplied."
                ),
                "options": matches,
            },
            "notes": notes,
        }

    if category_hint is not None:
        if category_hint["mapping_note"]:
            notes.append(category_hint["mapping_note"])
        return {
            "query": original_query,
            "normalized_query": normalized_query,
            "search_type": "business",
            "match_status": "not_found",
            "confidence": 0.4,
            "category": None,
            "category_hint": category_hint,
            "locality": _public_locality(selected_locality),
            "business": None,
            "business_matches": [],
            "clarification": None,
            "message": (
                "No mapped business name matched. You can continue with the closest "
                f'category, {category_hint["name"]}, or try another name.'
            ),
            "notes": notes,
        }

    return {
        "query": original_query,
        "normalized_query": normalized_query,
        "search_type": "unsupported",
        "match_status": "not_found",
        "confidence": 0.2,
        "category": None,
        "category_hint": None,
        "locality": _public_locality(selected_locality),
        "business": None,
        "business_matches": [],
        "clarification": None,
        "message": (
            "No supported category or mapped business name matched. Try a category "
            "such as cafe, pharmacy, gym, bakery, or supermarket, or an exact "
            "OpenStreetMap business name."
        ),
        "notes": notes,
    }
