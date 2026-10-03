#!/usr/bin/env python3
"""Pack an audited Boubyan extraction into a server-only source snapshot.

This copies source facts, not a tradable security master. It does not invent
instrument types, venues for UAE rows, ticker aliases, financial ratios or
purification amounts. Run the PDF extractor and review its validation first.
"""
from __future__ import annotations

import argparse
import collections
import json
import pathlib


LIST_IDS = {"kse": "kuwait", "gcc": "gcc", "usa": "usa"}
REGIONAL_EXCHANGES = {
    "KW": "BOURSA_KUWAIT", "SA": "TADAWUL", "QA": "QSE",
    "BH": "BAHRAIN_BOURSE", "OM": "MUSCAT",
}
BLOCKING_FLAGS = {
    "unrecognized_source_exchange", "unrecognized_or_conflicting_change_marker",
}


def pack(normalized):
    if normalized.get("schemaVersion") != 1:
        raise ValueError("Unsupported extraction schema")
    if normalized.get("validation", {}).get("unaccountedNumberedRows") != 0:
        raise ValueError("Incomplete numbered row coverage")
    if not normalized.get("retrievedAt"):
        raise ValueError("A real source retrieval timestamp is required")
    docs = {doc["id"]: doc for doc in normalized["documents"]}
    if set(docs) != set(LIST_IDS):
        raise ValueError("Expected exactly the three reviewed source documents")
    expected = normalized["validation"]["expectedRowCounts"]
    actual = collections.Counter(row["sourceList"] for row in normalized["rows"])
    if dict(actual) != expected or sum(actual.values()) != normalized["totalRows"]:
        raise ValueError("Row totals disagree with the audited extraction")
    for key, doc in docs.items():
        if not doc.get("completeSequenceValidated") or doc["rowCount"] != actual[key]:
            raise ValueError(f"Source sequence was not validated: {key}")
        if not doc["sourceUrl"].startswith("https://boubyancapital.com/"):
            raise ValueError("A source is outside the official publisher domain")
    rows = []
    seen = set()
    for raw in normalized["rows"]:
        doc = docs[raw["sourceList"]]
        if raw["quarter"] != doc["quarter"] or raw["issueDate"] != doc["issueDate"]:
            raise ValueError("Row publication period differs from its document")
        if not raw["ticker"] or not raw["companyName"]:
            raise ValueError("Empty source ticker or issuer name")
        key = (raw["sourceList"], raw["sourcePage"], raw["sourceRowNumber"])
        if key in seen:
            raise ValueError(f"Duplicate source provenance: {key}")
        seen.add(key)
        exchange = raw["exchangeRaw"] or REGIONAL_EXCHANGES.get(raw["marketCode"])
        issue = sorted(BLOCKING_FLAGS.intersection(raw.get("qualityFlags", [])))
        rows.append({
            "listId": LIST_IDS[raw["sourceList"]],
            "symbol": raw["ticker"],
            "name": raw["companyName"],
            "exchange": exchange,
            "country": raw["marketCode"],
            "page": raw["sourcePage"],
            "row": raw["sourceRowNumber"],
            "assetType": "security",
            "publishedStatus": "excluded" if raw["exitMarkerDetected"] else "compliant",
            "sourceRowId": raw["id"],
            **({"sourceSection": raw["sourceTableSection"]} if raw["sourceTableSection"] else {}),
            **({"changeMarkers": raw["changeMarkers"]} if raw["changeMarkers"] else {}),
            **({"operatesUnderIslamicProvisions": True} if raw["operatesUnderIslamicProvisionsMarker"] else {}),
            **({"qualityFlags": raw["qualityFlags"]} if raw["qualityFlags"] else {}),
            **({"identityIssue": "; ".join(issue)} if issue else {}),
        })
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=pathlib.Path)
    parser.add_argument("--output", required=True, type=pathlib.Path)
    args = parser.parse_args()
    normalized = json.loads(args.input.read_text(encoding="utf-8"))
    rows = pack(normalized)
    # One row per line keeps the complete source diff reviewable and compact.
    payload = "[\n" + ",\n".join(
        "  " + json.dumps(row, ensure_ascii=False, separators=(",", ":"))
        for row in rows
    ) + "\n]\n"
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(payload, encoding="utf-8")
    print(json.dumps({"rows": len(rows), "bytes": len(payload.encode()),
                      "counts": dict(collections.Counter(row["listId"] for row in rows))}))


if __name__ == "__main__":
    main()
