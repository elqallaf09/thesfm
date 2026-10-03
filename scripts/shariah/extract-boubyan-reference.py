#!/usr/bin/env python3
"""Extract the supplied Boubyan Q2 2026 source PDFs without inferring financial rulings.

Requires PyMuPDF (fitz). Reads kse.pdf, gcc.pdf, usa.pdf from --input-dir.
Retains exact ticker and exchange text, page/row provenance, visible markers,
PDF hashes, and extraction/identity ambiguities. Fails on missing/extra sequence
numbers, a mismatched repeated row number, an empty required cell, or an
unrecognized market/header, so a later layout change requires deliberate review.
The result is a dated source membership list, not a current exchange security master.
"""
from __future__ import annotations
import argparse
import collections
import datetime
import hashlib
import json
import pathlib
import re
import unicodedata
import fitz

URLS = {
    "kse": "https://boubyancapital.com/media/filer_public/45/5f/455ff834-e011-4fa9-89b0-f05ee7f5d47b/kse-list-q2-2026.pdf",
    "gcc": "https://boubyancapital.com/media/filer_public/38/a7/38a7d683-14b6-4233-bdde-af812d4f69a0/gcc-list-q2-2026.pdf",
    "usa": "https://boubyancapital.com/media/filer_public/02/2c/022ce190-c020-4163-8dc7-0da726e48941/usa-tradinglist-q2-2026.pdf",
}
LANDING = "https://boubyancapital.com/ar/brokerage-ar/"
MARKETS = {
    "Kuwait Stock Exchange": "KW",
    "Saudi Market": "SA",
    "UAE Stock Markets": "AE",
    "Oman Stock Market": "OM",
    "Qatar Stock Market": "QA",
    "Bahrain Stock Market": "BH",
    "US Markets": "US",
}
EXPECTED = {
    "kse": {("KW", "Premier Market"): 27, ("KW", "Main Market"): 73, ("KW", "REITS"): 1},
    "gcc": {("SA", None): 355, ("AE", None): 110, ("OM", None): 40, ("QA", None): 35, ("BH", None): 18},
    "usa": {("US", None): 2623},
}
ARROWS = "\uf083\uf084"


def clean(s: str) -> str:
    return re.sub(r"\s+", " ", "".join(c for c in s if not unicodedata.category(c).startswith("C"))).strip()


def cell_words(words, x0, x1, y0, y1):
    # Keep PDF text order, which is logical Arabic word order in these files.
    return [w for w in words if x0 <= (w[0]+w[2])/2 < x1 and y0 <= (w[1]+w[3])/2 < y1]


def cell_text(words, x0, x1, y0, y1):
    return " ".join(w[4] for w in cell_words(words, x0, x1, y0, y1))


def color_hex(rgb):
    return "#" + "".join(f"{round(c * 255):02x}" for c in rgb)


def marker_for_color(rgb):
    r,g,b = rgb
    if g > .6 and r < .7 and b < .65 and g > r+.12:
        return "new_entrant"
    if r > .8 and .35 < g < .8 and b < .55:
        return "name_changed"
    return "unrecognized_colored_marker"


def extract_file(path: pathlib.Path, key: str, retrieved_at: str):
    binary = path.read_bytes()
    doc = fitz.open(stream=binary, filetype="pdf")
    rows = []
    per_page = []
    section = None
    legend_annotations = []
    footer_nondata_words = []
    table_colored_drawings = []
    for page_index, page in enumerate(doc):
        words = page.get_text("words")
        body = page.get_text()
        heading = re.search(r"List of Sharia Compliant Companies available for trading in the (.*?) as of Q([1-4]) (\d{4})\s*-\s*Issue Date (\d{2})/(\d{2})/(\d{4})", body)
        if not heading:
            raise ValueError(f"Unrecognized header {key} p{page_index+1}")
        market_name, q, year, dd, mm, yyyy = heading.groups()
        if market_name not in MARKETS:
            raise ValueError(f"Unrecognized market {market_name}")
        market = MARKETS[market_name]
        quarter = f"{year}-Q{q}"
        issue_date = f"{yyyy}-{mm}-{dd}"
        if quarter != "2026-Q2":
            raise ValueError("This reviewed layout/count version only accepts 2026-Q2; review a new quarter explicitly")
        is_us = key == "usa"
        x_no_end = 85 if is_us else 60
        y_min, y_max = (130, 770) if is_us else (110, 480)
        anchors = sorted((w for w in words if 20 < w[0] and w[2] < x_no_end and y_min < w[1] < y_max and re.fullmatch(r"\d+", w[4])), key=lambda w:w[1])
        if not anchors:
            raise ValueError(f"No numbered rows {key} p{page_index+1}")
        if is_us:
            name_x=(157,460); ticker_x=(85,157); exchange_x=(460,552.8); arabic_x=None
        elif market=="SA":
            name_x=(60,430); ticker_x=(430,498); arabic_x=(498,787); exchange_x=None
        else:
            name_x=(53,380); ticker_x=(380,464); arabic_x=(464,790); exchange_x=None
        drawings = page.get_drawings()
        colored = [d for d in drawings if d["fill"] and d["rect"].y0 > 100 and d["rect"].y1 < (770 if is_us else 480) and max(d["fill"])-min(d["fill"])>.08]
        table_colored_drawings.extend({"page":page_index+1,"color":color_hex(d["fill"]),"bbox":[round(n,3) for n in d["rect"]],"marker":marker_for_color(d["fill"])} for d in colored)
        for idx, anchor in enumerate(anchors):
            n=int(anchor[4])
            # All row-number text is on the first line of a row. A following
            # line in a US company name belongs to that row, until next anchor.
            y0=anchor[1]-0.5
            next_y0=anchors[idx+1][1] if idx+1<len(anchors) else anchor[1]+18.3
            y1=(next_y0-0.5) if is_us else min(next_y0-0.5, anchor[1]+15.2)
            if key=="kse":
                previous_headers = [(w[1],w[4]) for w in words if 100<w[1]<anchor[1] and w[4] in ("Premier","Main","REITS")]
                if previous_headers:
                    s=max(previous_headers)[1]
                    section={"Premier":"Premier Market","Main":"Main Market","REITS":"REITS"}[s]
                if section is None:
                    raise ValueError("KSE table section not recognized")
            raw_name=cell_text(words,*name_x,y0,y1)
            raw_ticker=cell_text(words,*ticker_x,y0,y1)
            raw_ar=cell_text(words,*arabic_x,y0,y1) if arabic_x else None
            raw_exchange=cell_text(words,*exchange_x,y0,y1) if exchange_x else None
            if not raw_name or not raw_ticker or (is_us and not raw_exchange):
                raise ValueError(f"Missing required cell {key} p{page_index+1} row {n}: {raw_name!r} {raw_ticker!r} {raw_exchange!r}")
            if not is_us:
                repeat=[w[4].translate(str.maketrans("","",ARROWS)) for w in cell_words(words,787,815,y0,y1) if re.fullmatch(r"[\uf083\uf084]*\d+",w[4])]
                if repeat != [str(n)]:
                    raise ValueError(f"Repeated row number mismatch {key} p{page_index+1} row {n}: {repeat}")
            center=(anchor[1]+anchor[3])/2
            fills=[{"color":color_hex(d["fill"]),"marker":marker_for_color(d["fill"]),"bbox":[round(n,3) for n in d["rect"]]} for d in colored if d["rect"].y0 <= center < d["rect"].y1]
            markers=sorted({x["marker"] for x in fills})
            arrow=any(c in raw_name+(raw_ar or "") for c in ARROWS)
            name=clean(raw_name.translate(str.maketrans("","",ARROWS)))
            ticker=clean(raw_ticker)
            ar=clean((raw_ar or "").translate(str.maketrans("","",ARROWS))) if raw_ar else None
            flags=[]
            if raw_ar and any(unicodedata.category(c).startswith("C") for c in raw_ar):
                flags.append("arabic_pdf_text_contains_control_or_private_glyphs")
            if market=="AE": flags.append("individual_uae_exchange_not_specified")
            if is_us and "." in ticker: flags.append("ticker_contains_dot_preserve_source_no_suffix_stripping")
            if is_us and re.search(r"\bPR\b",ticker): flags.append("preferred_share_marker_preserve_class")
            if is_us and re.search(r"\b(ETF|ETN|Fund|Funds|Trust|Portfolio)\b",name,re.I): flags.append("fund_or_trust_name_requires_instrument_type_match")
            if raw_exchange and raw_exchange not in {"NSDQ","NYSE","AMEX"}: flags.append("unrecognized_source_exchange")
            if markers and markers != ["new_entrant"] and markers != ["name_changed"]:
                flags.append("unrecognized_or_conflicting_change_marker")
            rows.append({
                "id":f"boubyan-{key}-2026-q2-{market.lower()}-{(section or 'all').lower().replace(' ','-')}-{n}",
                "sourceList":key,"quarter":quarter,"issueDate":issue_date,
                "sourcePage":page_index+1,"sourceRowNumber":n,"sourceTableSection":section if key=="kse" else None,
                "marketCode":market,"marketNameRaw":market_name,
                "tickerRaw":raw_ticker,"ticker":ticker,
                "companyNameRaw":raw_name,"companyName":name,
                "companyNameArRaw":raw_ar,"companyNameArExtracted":ar,
                "exchangeRaw":raw_exchange,
                "sourceMembership":"included_in_sharia_compliant_trading_list",
                "operatesUnderIslamicProvisionsMarker":arrow,
                "changeMarkers":markers,"markerFills":fills,
                "exitMarkerDetected":False,"exitStatus":"not_indicated",
                "identityVerifiedAgainstExchange":False,
                "qualityFlags":flags,
            })
        per_page.append({"page":page_index+1,"marketCode":market,"rows":len(anchors),"firstRow":int(anchors[0][4]),"lastRow":int(anchors[-1][4])})
        if not is_us:
            # Source places added tickers within the legend on several GCC
            # pages. They repeat the body rows and are not additional records.
            for w in words:
                if 380 < (w[0]+w[2])/2 < 500 and 511 < w[1] < 544:
                    footer_nondata_words.append({"page":page_index+1,"text":w[4],"bbox":[round(n,3) for n in w[:4]]})
            for b in page.get_text("dict")["blocks"]:
                if "lines" not in b: continue
                for line in b["lines"]:
                    spans=line["spans"]
                    if 380<line["bbox"][0]<500 and 511<line["bbox"][1]<544:
                        legend_annotations.append({"page":page_index+1,"text":" ".join(s["text"] for s in spans),"bbox":[round(n,3) for n in line["bbox"]]})
    grouped=collections.defaultdict(list)
    for row in rows: grouped[(row["marketCode"],row["sourceTableSection"])].append(row["sourceRowNumber"])
    expected=EXPECTED[key]
    if set(grouped)!=set(expected): raise ValueError(f"Unexpected groups {key}: {set(grouped)}")
    for group, end in expected.items():
        if grouped[group] != list(range(1,end+1)):
            raise ValueError(f"Incomplete/nonsequential rows {key} {group}")
    meta={
        "id":key,"sourceUrl":URLS[key],"landingPageUrl":LANDING,
        "quarter":quarter,"issueDate":issue_date,"retrievedAt":retrieved_at,
        "sha256":hashlib.sha256(binary).hexdigest(),"bytes":len(binary),"pages":len(doc),
        "rowCount":len(rows),"pageRowCounts":per_page,
        "marketRowCounts":dict(collections.Counter(r["marketCode"] for r in rows)),
        "sectionRowCounts":dict(collections.Counter(r["sourceTableSection"] for r in rows)) if key=="kse" else None,
        "exchangeRowCounts":dict(collections.Counter(r["exchangeRaw"] for r in rows)) if key=="usa" else None,
        "newEntrantRows":[{"ticker":r["ticker"],"market":r["marketCode"],"page":r["sourcePage"],"row":r["sourceRowNumber"]} for r in rows if "new_entrant" in r["changeMarkers"]],
        "nameChangedRows":[{"ticker":r["ticker"],"market":r["marketCode"],"page":r["sourcePage"],"row":r["sourceRowNumber"]} for r in rows if "name_changed" in r["changeMarkers"]],
        "tableColoredDrawings":table_colored_drawings,
        "legendAnnotations":legend_annotations,"footerNonDataWords":footer_nondata_words,
        "pdfMetadata":doc.metadata,
        "completeSequenceValidated":True,
    }
    return meta,rows


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir",type=pathlib.Path,default=pathlib.Path(__file__).resolve().parent)
    parser.add_argument("--output",type=pathlib.Path)
    parser.add_argument("--retrieved-at",required=True,help="Actual retrieval/check timestamp; ISO UTC")
    args=parser.parse_args()
    out=args.output or args.input_dir/"normalized.json"
    docs=[]; rows=[]
    for key in URLS:
        meta,rr=extract_file(args.input_dir/(key+".pdf"),key,args.retrieved_at)
        docs.append(meta);rows.extend(rr)
    duplicates=[]
    by_key=collections.defaultdict(list)
    by_ticker=collections.defaultdict(list)
    for row in rows:
        by_key[(row["sourceList"],row["marketCode"],row["exchangeRaw"],row["ticker"])].append(row)
        by_ticker[(row["sourceList"],row["marketCode"],row["ticker"])].append(row)
    for (source,market,ex,ticker),group in by_key.items():
        if len(group)>1:
            ids=[r["id"] for r in group]
            duplicates.append({"kind":"same_market_exchange_ticker","sourceList":source,"marketCode":market,"exchange":ex,"ticker":ticker,"rows":ids,"names":[r["companyName"] for r in group]})
            for r in group:r["qualityFlags"].append("duplicate_source_market_exchange_ticker")
    for (source,market,ticker),group in by_ticker.items():
        if len(group)>1 and len({r["exchangeRaw"] for r in group})>1:
            ids=[r["id"] for r in group]
            duplicates.append({"kind":"same_ticker_multiple_exchanges","sourceList":source,"marketCode":market,"ticker":ticker,"rows":ids,"exchanges":[r["exchangeRaw"] for r in group],"names":[r["companyName"] for r in group]})
            for r in group:r["qualityFlags"].append("source_ticker_listed_on_multiple_exchanges")
    result={
        "schemaVersion":1,"publisher":"Boubyan Capital","approvingAuthority":"Boubyan Capital Sharia Advisory Board",
        "landingPageUrl":LANDING,"quarter":"2026-Q2","retrievedAt":args.retrieved_at,
        "totalRows":len(rows),"documents":docs,
        "semantics":{
            "membership":"Document inclusion is attributed to Boubyan Capital for its stated quarter; it is not a fresh independent screen.",
            "absence":"Absence from a list, or disappearance between versions, is not evidence of non-compliance. Keep absent/not covered separate.",
            "exit":"No explicit negative/exit body marker was identified in these Q2 documents. KSE/GCC Exited/De-listed legend swatch is blank/white; ordinary white zebra rows must not be treated as exited. exitStatus not_indicated is not a current trading-status guarantee.",
            "triangle":"KSE/GCC black triangle marks companies described by the publisher as operating in accordance with Islamic-law provisions. Its absence does not negate inclusion in the overall list.",
            "green":"New entrant in KSE/GCC; not a distinct Sharia pass level.",
            "orange":"Changed company name in KSE/GCC; not a Sharia-status change.",
            "red":"Red visible text is page headings/branding, not a row compliance code in these documents.",
            "usa":"US PDF has no change-color legend; source exchange codes preserved exactly as NSDQ, NYSE, AMEX. Includes non-common-stock instruments and repeated ticker/exchange rows.",
            "purification":"No purification amounts, formulas, ratios, or per-security purification rates were found in these three PDFs. Do not default missing amounts to zero.",
            "matching":"Match source market, exact symbol including class/suffix, issuer identity and instrument type. Verify any alias/rename/reused symbol against authoritative identity data; never strip dotted suffixes blindly.",
            "uae":"UAE source lists the country-wide stock markets without per-row ADX/DFM identifiers; those exchanges must not be inferred solely from row order.",
            "freshness":"Keep quarter, issue date, retrieval time and PDF hash distinct. Discover next PDF URLs from landing page; UUID paths are not predictable. Never replace last valid data with a failed parse/download.",
        },
        "validation":{
            "sequenceCoverage":"All source row sequences exactly accounted for, independently cross-checked against repeated Arabic-side row numbers for KSE/GCC.",
            "expectedRowCounts":{"kse":101,"gcc":558,"usa":2623},
            "unaccountedNumberedRows":0,
            "unverifiedIdentityNote":"All rows are source extraction only; current exchange identity/tradability has not been verified.",
            "duplicateGroups":duplicates,
            "qualityFlagCounts":dict(collections.Counter(flag for r in rows for flag in r["qualityFlags"])),
        },
        "rows":rows,
    }
    out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"output":str(out),"totalRows":len(rows),"counts":{d["id"]:d["rowCount"] for d in docs},"duplicates":len(duplicates),"qualityFlagCounts":result["validation"]["qualityFlagCounts"],"newEntrants":{d["id"]:d["newEntrantRows"] for d in docs}},ensure_ascii=False))

if __name__=="__main__":main()
