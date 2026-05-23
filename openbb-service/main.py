from __future__ import annotations

import math
import os
import json
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import yfinance as yf
from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

app = FastAPI(title="THE SFM OpenBB Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ALLOW_ORIGINS", "*").split(","),
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

SUPPORTED_ASSET_TYPES = {"stock", "etf", "crypto", "forex", "commodity", "gold"}
OPENBB_PROVIDER = os.getenv("OPENBB_PROVIDER", "yfinance")
SYMBOL_DIRECTORY_PATH = Path(__file__).parent / "data" / "symbols.json"


def timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean_symbol(symbol: str) -> str | None:
    normalized = (symbol or "").strip().upper()
    if not normalized or len(normalized) > 24:
        return None
    if not all(char.isalnum() or char in ".-/:=" for char in normalized):
        return None
    return normalized


def clean_search_query(query: str) -> str:
    return " ".join((query or "").strip().split())[:64]


def normalize_asset_type(asset_type: str | None) -> str:
    value = (asset_type or "stock").strip().lower()
    aliases = {
        "stocks": "stock",
        "equity": "stock",
        "crypto-currency": "crypto",
        "commodities": "commodity",
        "xau": "gold",
    }
    value = aliases.get(value, value)
    return value if value in SUPPORTED_ASSET_TYPES else "stock"


def period_to_days(period: str | None) -> int:
    value = (period or "6m").strip().lower()
    try:
        if value.endswith("d"):
            return max(2, int(value[:-1] or "1"))
        if value.endswith("m"):
            return max(21, int(value[:-1] or "1") * 30)
        if value.endswith("y"):
            return max(252, int(value[:-1] or "1") * 365)
    except ValueError:
        return 180
    return 180


def get_obb() -> Any:
    from openbb import obb

    return obb


def openbb_to_dataframe(result: Any) -> pd.DataFrame:
    if hasattr(result, "to_dataframe"):
        return result.to_dataframe()
    if hasattr(result, "results"):
        return pd.DataFrame(result.results)
    return pd.DataFrame(result)


def safe_error_message(exc: Exception) -> str:
    message = str(exc).strip()
    if not message:
        return "Provider unavailable or missing dependency"
    lowered = message.lower()
    if "api" in lowered and "key" in lowered:
        return "Provider API key is missing or invalid"
    if "provider" in lowered or "extension" in lowered or "yfinance" in lowered:
        return "Provider unavailable or missing dependency"
    if "no market data" in lowered or "empty" in lowered:
        return "No market data returned"
    return message[:180]


def log_openbb_failure(symbol: str, asset_type: str, exc: Exception) -> None:
    print(
        "OpenBB fetch failed",
        {
            "symbol": symbol,
            "asset_type": asset_type,
            "error": repr(exc),
        },
        flush=True,
    )


def normalize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    next_df = df.copy()
    next_df.columns = [str(col).lower() for col in next_df.columns]

    if "date" not in next_df.columns:
        if "datetime" in next_df.columns:
            next_df["date"] = next_df["datetime"]
        elif next_df.index.name:
            next_df = next_df.reset_index().rename(columns={next_df.index.name: "date"})
        else:
            next_df = next_df.reset_index().rename(columns={"index": "date"})

    if "close" not in next_df.columns:
        for candidate in ("adj_close", "adjusted_close", "last_price", "price"):
            if candidate in next_df.columns:
                next_df["close"] = next_df[candidate]
                break

    if "close" not in next_df.columns:
        raise ValueError("Close column missing from OpenBB data")

    next_df["date"] = pd.to_datetime(next_df["date"], errors="coerce")
    for column in ("open", "high", "low", "close", "volume"):
        if column in next_df.columns:
            next_df[column] = pd.to_numeric(next_df[column], errors="coerce")
        elif column != "volume":
            next_df[column] = next_df["close"]
        else:
            next_df[column] = 0

    next_df = next_df.dropna(subset=["date", "close"]).sort_values("date")
    if next_df.empty:
        raise ValueError("No valid close prices returned")
    return next_df


def normalize_market_symbol(symbol: str, asset_type: str) -> dict[str, Any]:
    clean = clean_symbol(symbol) or symbol.strip().upper()
    base = clean.replace("/", "").replace(":", "")

    attempts: list[str]
    if asset_type in {"stock", "etf"}:
        attempts = [clean]
    elif asset_type == "crypto":
        if clean.endswith("-USD") or clean.endswith("USDT"):
            attempts = [clean]
        else:
            attempts = [f"{base}-USD", clean, f"{base}USDT"]
    elif asset_type == "forex":
        pair = base.replace("=X", "")
        attempts = [f"{pair}=X", pair]
    elif asset_type == "gold":
        if clean in {"XAU", "GOLD", "XAUUSD"}:
            attempts = ["GC=F", "XAUUSD=X", "XAUUSD", clean]
        else:
            attempts = [clean, "GC=F"]
    elif asset_type == "commodity":
        aliases = {
            "OIL": ["CL=F", "BZ=F", "OIL"],
            "WTI": ["CL=F", "WTI"],
            "BRENT": ["BZ=F", "BRENT"],
            "SILVER": ["SI=F", "SILVER"],
        }
        attempts = aliases.get(clean, [clean])
    else:
        attempts = [clean]

    unique_attempts = list(dict.fromkeys(attempts))
    return {"displaySymbol": clean, "providerSymbol": unique_attempts[0], "attempts": unique_attempts}


def directory_item(symbol: str, name: str, asset_type: str, exchange: str = "", country: str = "", provider_symbol: str | None = None) -> dict[str, Any]:
    normalized_type = normalize_asset_type(asset_type)
    normalized = normalize_market_symbol(provider_symbol or symbol, normalized_type)
    return {
        "symbol": (symbol or "").strip().upper(),
        "name": name or symbol.upper(),
        "assetType": normalized_type,
        "exchange": exchange,
        "country": country,
        "providerSymbol": provider_symbol or normalized["providerSymbol"],
    }


@lru_cache(maxsize=1)
def load_symbol_directory() -> list[dict[str, Any]]:
    try:
        with SYMBOL_DIRECTORY_PATH.open("r", encoding="utf-8") as handle:
            rows = json.load(handle)
    except Exception as exc:
        print("Symbol directory load failed", {"error": repr(exc)}, flush=True)
        rows = []

    directory: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        symbol = clean_symbol(str(row.get("symbol", "")))
        if not symbol:
            continue
        asset_type = normalize_asset_type(str(row.get("assetType") or row.get("asset_type") or "stock"))
        directory.append(directory_item(
            symbol=symbol,
            name=str(row.get("name") or symbol),
            asset_type=asset_type,
            exchange=str(row.get("exchange") or ""),
            country=str(row.get("country") or ""),
            provider_symbol=str(row.get("providerSymbol") or row.get("provider_symbol") or normalize_market_symbol(symbol, asset_type)["providerSymbol"]),
        ))
    return directory


def score_symbol_result(item: dict[str, Any], query: str) -> int:
    needle = query.lower()
    symbol = str(item.get("symbol", "")).lower()
    provider_symbol = str(item.get("providerSymbol", "")).lower()
    name = str(item.get("name", "")).lower()
    if symbol == needle or provider_symbol == needle:
        return 100
    if symbol.startswith(needle):
        return 88
    if name.startswith(needle):
        return 78
    if needle in symbol:
        return 62
    if needle in name:
        return 50
    if needle in str(item.get("assetType", "")).lower():
        return 35
    return 0


def search_symbol_directory(query: str, asset_type: str | None = None, limit: int = 20) -> list[dict[str, Any]]:
    directory = load_symbol_directory()
    normalized_query = query.strip().lower()
    normalized_type = normalize_asset_type(asset_type) if asset_type else None

    scored: list[tuple[int, dict[str, Any]]] = []
    for item in directory:
        if normalized_type and item["assetType"] != normalized_type:
            continue
        score = score_symbol_result(item, normalized_query) if normalized_query else 1
        if score:
            scored.append((score, item))

    scored.sort(key=lambda pair: (-pair[0], pair[1]["symbol"]))
    return [item for _score, item in scored[:limit]]


def infer_asset_type_from_quote_type(quote_type: str, fallback: str) -> str:
    value = (quote_type or "").strip().lower()
    if value in {"etf", "mutualfund"}:
        return "etf"
    if value in {"cryptocurrency", "crypto"}:
        return "crypto"
    if value in {"currency"}:
        return "forex"
    if value in {"future"}:
        return "commodity"
    if value in {"equity"}:
        return "stock"
    return fallback


def search_provider_yfinance(query: str, asset_type: str | None = None, limit: int = 10) -> list[dict[str, Any]]:
    try:
        matches = yf.Search(query, max_results=limit).quotes
    except Exception as exc:
        print("Provider symbol search failed", {"query": query, "error": repr(exc)}, flush=True)
        return []

    results: list[dict[str, Any]] = []
    requested_type = normalize_asset_type(asset_type) if asset_type else None
    for match in matches or []:
        symbol = clean_symbol(str(match.get("symbol", "")))
        if not symbol:
            continue
        inferred_type = normalize_asset_type(infer_asset_type_from_quote_type(str(match.get("quoteType", "")), requested_type or "stock"))
        if requested_type and inferred_type != requested_type:
            continue
        display_symbol = symbol.replace("-USD", "") if inferred_type == "crypto" else symbol.replace("=X", "") if inferred_type == "forex" else symbol
        normalized = normalize_market_symbol(display_symbol, inferred_type)
        provider_symbol = symbol if symbol in normalized["attempts"] else normalized["providerSymbol"]
        results.append(directory_item(
            symbol=display_symbol,
            name=str(match.get("shortname") or match.get("longname") or match.get("name") or display_symbol),
            asset_type=inferred_type,
            exchange=str(match.get("exchange") or match.get("exchDisp") or ""),
            country="",
            provider_symbol=provider_symbol,
        ))
    return results


def dedupe_symbol_results(results: list[dict[str, Any]], limit: int = 20) -> list[dict[str, Any]]:
    seen: set[tuple[str, str, str]] = set()
    unique: list[dict[str, Any]] = []
    for item in results:
        key = (str(item.get("symbol", "")).upper(), str(item.get("assetType", "")), str(item.get("providerSymbol", "")).upper())
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
        if len(unique) >= limit:
            break
    return unique


def fetch_openbb_history(provider_symbol: str, asset_type: str) -> pd.DataFrame:
    obb = get_obb()

    if asset_type in {"stock", "etf"}:
        attempts = (
            lambda: obb.equity.price.historical(symbol=provider_symbol, provider=OPENBB_PROVIDER),
            lambda: obb.equity.price.historical(symbol=provider_symbol),
            lambda: obb.equity.price.historical(provider_symbol, provider=OPENBB_PROVIDER),
            lambda: obb.equity.price.historical(provider_symbol),
        )
    elif asset_type == "crypto":
        attempts = (
            lambda: obb.crypto.price.historical(symbol=provider_symbol, provider=OPENBB_PROVIDER),
            lambda: obb.crypto.price.historical(symbol=provider_symbol),
            lambda: obb.equity.price.historical(symbol=provider_symbol, provider=OPENBB_PROVIDER),
        )
    elif asset_type == "forex":
        attempts = (
            lambda: obb.currency.price.historical(symbol=provider_symbol, provider=OPENBB_PROVIDER),
            lambda: obb.currency.price.historical(symbol=provider_symbol),
            lambda: obb.equity.price.historical(symbol=provider_symbol, provider=OPENBB_PROVIDER),
        )
    else:
        attempts = (
            lambda: obb.derivatives.futures.historical(symbol=provider_symbol, provider=OPENBB_PROVIDER),
            lambda: obb.derivatives.futures.historical(symbol=provider_symbol),
            lambda: obb.equity.price.historical(symbol=provider_symbol, provider=OPENBB_PROVIDER),
        )

    errors: list[Exception] = []
    for attempt in attempts:
        try:
            result = attempt()
            return normalize_dataframe(openbb_to_dataframe(result))
        except Exception as exc:
            errors.append(exc)
    raise RuntimeError("; ".join(safe_error_message(exc) for exc in errors))


def fetch_yfinance_history(provider_symbol: str) -> pd.DataFrame:
    df = yf.download(provider_symbol, period="1y", interval="1d", progress=False, auto_adjust=False, threads=False)
    if df.empty:
        raise ValueError("No market data returned")
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [str(col[0]).lower() for col in df.columns]
    return normalize_dataframe(df.reset_index())


def fetch_history_with_attempts(symbol: str, asset_type: str, period: str | None = None) -> tuple[pd.DataFrame, str, list[dict[str, Any]]]:
    days = period_to_days(period)
    normalized = normalize_market_symbol(symbol, asset_type)
    attempts_log: list[dict[str, Any]] = []

    for provider_symbol in normalized["attempts"]:
        try:
            df = fetch_openbb_history(provider_symbol, asset_type).tail(days)
            attempts_log.append({"symbol": provider_symbol, "method": "openbb", "success": True})
            return df, provider_symbol, attempts_log
        except Exception as exc:
            attempts_log.append({"symbol": provider_symbol, "method": "openbb", "success": False, "error": safe_error_message(exc)})

        try:
            df = fetch_yfinance_history(provider_symbol).tail(days)
            attempts_log.append({"symbol": provider_symbol, "method": "yfinance", "success": True})
            return df, provider_symbol, attempts_log
        except Exception as exc:
            attempts_log.append({"symbol": provider_symbol, "method": "yfinance", "success": False, "error": safe_error_message(exc)})

    raise RuntimeError("; ".join(f"{attempt['symbol']}: {attempt.get('error', 'failed')}" for attempt in attempts_log if not attempt["success"]))


def fetch_history_dataframe(symbol: str, asset_type: str, period: str | None = None) -> pd.DataFrame:
    df, _provider_symbol, _attempts = fetch_history_with_attempts(symbol, asset_type, period)
    return df


def clean_number(value: Any, digits: int = 4) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0
    if math.isnan(number) or math.isinf(number):
        return 0
    return round(number, digits)


def pct_change(current: float, previous: float) -> float:
    if not previous:
        return 0
    return clean_number(((current - previous) / previous) * 100)


def calculate_rsi(series: pd.Series, window: int = 14) -> float:
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(window).mean()
    loss = (-delta.clip(upper=0)).rolling(window).mean()
    relative_strength = gain / loss.replace(0, np.nan)
    value = 100 - (100 / (1 + relative_strength))
    latest = value.dropna()
    return clean_number(latest.iloc[-1] if not latest.empty else 50)


def calculate_analysis(symbol: str, asset_type: str, df: pd.DataFrame, source: str = "openbb", provider_symbol: str | None = None) -> dict[str, Any]:
    close = df["close"].astype(float)
    latest_price = clean_number(close.iloc[-1])
    previous_price = clean_number(close.iloc[-2] if len(close) > 1 else close.iloc[-1])
    sma20 = clean_number(close.rolling(20).mean().dropna().iloc[-1] if len(close) >= 20 else close.mean())
    sma50 = clean_number(close.rolling(50).mean().dropna().iloc[-1] if len(close) >= 50 else close.mean())
    volatility = clean_number(close.pct_change().dropna().std() * math.sqrt(252) * 100)
    rsi14 = calculate_rsi(close)

    if latest_price > sma20 > sma50:
        trend = "bullish"
    elif latest_price < sma20 < sma50:
        trend = "bearish"
    else:
        trend = "neutral"

    risk_level = "low" if volatility < 15 else "medium" if volatility < 35 else "high"

    def performance(days: int) -> float:
        if len(close) <= days:
            return pct_change(latest_price, close.iloc[0])
        return pct_change(latest_price, close.iloc[-days])

    history = [
        {
            "date": row.date.date().isoformat(),
            "open": clean_number(row.open),
            "high": clean_number(row.high),
            "low": clean_number(row.low),
            "close": clean_number(row.close),
            "volume": clean_number(row.volume, 0),
        }
        for row in df.tail(180).itertuples(index=False)
    ]

    response = {
        "success": True,
        "source": source,
        "fallback": source != "openbb",
        "symbol": symbol,
        "providerSymbol": provider_symbol or symbol,
        "assetType": asset_type,
        "latestPrice": latest_price,
        "changePercent": pct_change(latest_price, previous_price),
        "trend": trend,
        "riskLevel": risk_level,
        "indicators": {
            "rsi": rsi14,
            "sma20": sma20,
            "sma50": sma50,
            "volatility": volatility,
        },
        "performance": {
            "30d": performance(30),
            "90d": performance(90),
            "180d": performance(180),
        },
        "history": history,
        "summary": "Educational market summary only. This is not financial advice.",
    }
    return response


def mock_dataframe(symbol: str, days: int = 180) -> pd.DataFrame:
    seed = sum(ord(char) for char in symbol)
    base = 80 + (seed % 160)
    dates = pd.date_range(end=pd.Timestamp.utcnow().normalize(), periods=days)
    closes = [base + math.sin(index / 9) * 4 + index * 0.08 for index in range(days)]
    return pd.DataFrame(
        {
            "date": dates,
            "open": [value * 0.995 for value in closes],
            "high": [value * 1.012 for value in closes],
            "low": [value * 0.988 for value in closes],
            "close": closes,
            "volume": [1000000 + (seed * 1000) for _ in closes],
        }
    )


def fallback_analysis(symbol: str, asset_type: str, reason: str = "OpenBB provider unavailable", provider_symbol: str | None = None) -> dict[str, Any]:
    response = calculate_analysis(symbol, asset_type, mock_dataframe(symbol), source="mock", provider_symbol=provider_symbol or normalize_market_symbol(symbol, asset_type)["providerSymbol"])
    response["fallbackReason"] = reason
    return response


def error_response(symbol: str, asset_type: str, message: str = "Unable to fetch market data") -> dict[str, Any]:
    return {"success": False, "error": message, "symbol": symbol, "assetType": asset_type}


@app.get("/")
def root() -> dict[str, Any]:
    return {"ok": True, "service": "openbb-service", "status": "working", "timestamp": timestamp()}


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "service": "openbb-service", "status": "working", "timestamp": timestamp()}


@app.get("/market/analyze")
async def market_analyze(symbol: str = Query(..., min_length=1), assetType: str = Query("stock")) -> dict[str, Any]:
    clean = clean_symbol(symbol)
    asset_type = normalize_asset_type(assetType)
    if not clean:
        return error_response(symbol, asset_type, "Invalid symbol")

    normalized = normalize_market_symbol(clean, asset_type)
    try:
        df, provider_symbol, _attempts = fetch_history_with_attempts(clean, asset_type, "6m")
        return calculate_analysis(clean, asset_type, df, provider_symbol=provider_symbol)
    except Exception as exc:
        log_openbb_failure(clean, asset_type, exc)
        return fallback_analysis(clean, asset_type, f"OpenBB could not fetch real data for {normalized['providerSymbol']}: {safe_error_message(exc)}", normalized["providerSymbol"])


@app.get("/market/history")
async def market_history(
    symbol: str = Query(..., min_length=1),
    assetType: str = Query("stock"),
    period: str = Query("6m"),
) -> dict[str, Any]:
    clean = clean_symbol(symbol)
    asset_type = normalize_asset_type(assetType)
    if not clean:
        return error_response(symbol, asset_type, "Invalid symbol")

    normalized = normalize_market_symbol(clean, asset_type)
    try:
        df, provider_symbol, _attempts = fetch_history_with_attempts(clean, asset_type, period)
        source = "openbb"
        fallback_reason = None
    except Exception as exc:
        log_openbb_failure(clean, asset_type, exc)
        df = mock_dataframe(clean, period_to_days(period))
        provider_symbol = normalized["providerSymbol"]
        source = "mock"
        fallback_reason = f"OpenBB could not fetch real data for {provider_symbol}: {safe_error_message(exc)}"

    history = calculate_analysis(clean, asset_type, df, source=source, provider_symbol=provider_symbol)["history"]
    response = {"success": True, "source": source, "fallback": source == "mock", "symbol": clean, "providerSymbol": provider_symbol, "assetType": asset_type, "period": period, "history": history}
    if fallback_reason:
        response["fallbackReason"] = fallback_reason
    return response


@app.get("/market/compare")
async def market_compare(symbols: str = Query(..., min_length=1), assetType: str = Query("stock")) -> dict[str, Any]:
    asset_type = normalize_asset_type(assetType)
    results = []
    for raw_symbol in symbols.split(",")[:8]:
        clean = clean_symbol(raw_symbol)
        if not clean:
            continue
        normalized = normalize_market_symbol(clean, asset_type)
        try:
            df, provider_symbol, _attempts = fetch_history_with_attempts(clean, asset_type, "6m")
            results.append(calculate_analysis(clean, asset_type, df, provider_symbol=provider_symbol))
        except Exception as exc:
            log_openbb_failure(clean, asset_type, exc)
            results.append(fallback_analysis(clean, asset_type, f"OpenBB could not fetch real data for {normalized['providerSymbol']}: {safe_error_message(exc)}", normalized["providerSymbol"]))
    return {"success": True, "results": results}


@app.get("/debug/openbb")
async def debug_openbb(symbol: str = Query("AAPL", min_length=1), assetType: str = Query("stock")) -> dict[str, Any]:
    clean = clean_symbol(symbol)
    asset_type = normalize_asset_type(assetType)
    if not clean:
        return {
            "importOk": False,
            "fetchOk": False,
            "inputSymbol": symbol,
            "providerSymbol": None,
            "assetType": asset_type,
            "attempts": [],
            "finalSource": "error",
            "rowsReturned": 0,
            "columns": [],
            "errorType": "ValidationError",
            "safeErrorMessage": "Invalid symbol",
        }

    try:
        get_obb()
        import_ok = True
        import_error_type = None
        import_error = None
    except Exception as exc:
        return {
            "importOk": False,
            "fetchOk": False,
            "inputSymbol": clean,
            "providerSymbol": normalize_market_symbol(clean, asset_type)["providerSymbol"],
            "assetType": asset_type,
            "attempts": [],
            "finalSource": "error",
            "rowsReturned": 0,
            "columns": [],
            "errorType": type(exc).__name__,
            "safeErrorMessage": safe_error_message(exc),
        }

    normalized = normalize_market_symbol(clean, asset_type)
    try:
        df, provider_symbol, attempts = fetch_history_with_attempts(clean, asset_type, "6m")
        return {
            "inputSymbol": clean,
            "providerSymbol": provider_symbol,
            "assetType": asset_type,
            "attempts": attempts,
            "finalSource": "openbb",
            "importOk": import_ok,
            "fetchOk": True,
            "rowsReturned": int(len(df)),
            "columns": [str(column) for column in df.columns],
            "errorType": import_error_type,
            "safeErrorMessage": import_error,
        }
    except Exception as exc:
        log_openbb_failure(clean, asset_type, exc)
        return {
            "inputSymbol": clean,
            "providerSymbol": normalized["providerSymbol"],
            "assetType": asset_type,
            "attempts": [
                {"symbol": attempt, "success": False, "error": "See service logs"}
                for attempt in normalized["attempts"]
            ],
            "finalSource": "mock",
            "importOk": True,
            "fetchOk": False,
            "rowsReturned": 0,
            "columns": [],
            "errorType": type(exc).__name__,
            "safeErrorMessage": safe_error_message(exc),
        }


@app.get("/market/search")
def market_search(
    q: str = Query("", max_length=64),
    assetType: str | None = Query(None),
    limit: int = Query(12, ge=1, le=20),
) -> dict[str, Any]:
    query = clean_search_query(q)
    asset_type = normalize_asset_type(assetType) if assetType else None

    if not query:
        results = search_symbol_directory("", asset_type, limit)
        return {"success": True, "query": query, "results": results, "source": "cache"}

    provider_results = search_provider_yfinance(query, asset_type, limit)
    cache_results = search_symbol_directory(query, asset_type, limit)
    merged = dedupe_symbol_results([*provider_results, *cache_results], limit)

    source = "openbb" if provider_results else "cache" if cache_results else "fallback"
    fallback = not bool(provider_results)
    if not merged:
        direct_symbol = clean_symbol(query)
        if direct_symbol:
            inferred_type = asset_type or normalize_asset_type("stock")
            normalized = normalize_market_symbol(direct_symbol, inferred_type)
            merged = [directory_item(direct_symbol, f"{direct_symbol} market asset", inferred_type, provider_symbol=normalized["providerSymbol"])]
            source = "fallback"
            fallback = True

    return {
        "success": True,
        "query": query,
        "results": merged,
        "source": source,
        "fallback": fallback,
    }
