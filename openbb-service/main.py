from __future__ import annotations

import math
import os
from datetime import datetime, timezone
from typing import Any

import numpy as np
import pandas as pd
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


def timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean_symbol(symbol: str) -> str | None:
    normalized = (symbol or "").strip().upper()
    if not normalized or len(normalized) > 24:
        return None
    if not all(char.isalnum() or char in ".-/:=" for char in normalized):
        return None
    return normalized


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


def fetch_history_dataframe(symbol: str, asset_type: str, period: str | None = None) -> pd.DataFrame:
    obb = get_obb()
    days = period_to_days(period)
    provider = os.getenv("OPENBB_PROVIDER", "yfinance")

    if asset_type in {"stock", "etf"}:
        result = obb.equity.price.historical(symbol=symbol, provider=provider)
    elif asset_type == "crypto":
        result = obb.crypto.price.historical(symbol=symbol, provider=provider)
    elif asset_type == "forex":
        result = obb.currency.price.historical(symbol=symbol, provider=provider)
    else:
        openbb_symbol = "GC=F" if asset_type == "gold" and symbol in {"XAU", "GOLD"} else symbol
        result = obb.derivatives.futures.historical(symbol=openbb_symbol, provider=provider)

    return normalize_dataframe(openbb_to_dataframe(result)).tail(days)


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


def calculate_analysis(symbol: str, asset_type: str, df: pd.DataFrame, source: str = "openbb") -> dict[str, Any]:
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
        "symbol": symbol,
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
    if source == "mock":
        response["fallback"] = True
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


def fallback_analysis(symbol: str, asset_type: str) -> dict[str, Any]:
    return calculate_analysis(symbol, asset_type, mock_dataframe(symbol), source="mock")


def error_response(symbol: str, asset_type: str, message: str = "Unable to fetch market data") -> dict[str, Any]:
    return {"success": False, "error": message, "symbol": symbol, "assetType": asset_type}


@app.get("/")
def root() -> dict[str, Any]:
    return {"ok": True, "service": "openbb-service", "status": "working", "timestamp": timestamp()}


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "service": "openbb-service", "status": "working", "timestamp": timestamp()}


@app.get("/market/analyze")
def market_analyze(symbol: str = Query(..., min_length=1), assetType: str = Query("stock")) -> dict[str, Any]:
    clean = clean_symbol(symbol)
    asset_type = normalize_asset_type(assetType)
    if not clean:
        return error_response(symbol, asset_type, "Invalid symbol")

    try:
        return calculate_analysis(clean, asset_type, fetch_history_dataframe(clean, asset_type, "6m"))
    except Exception:
        return fallback_analysis(clean, asset_type)


@app.get("/market/history")
def market_history(
    symbol: str = Query(..., min_length=1),
    assetType: str = Query("stock"),
    period: str = Query("6m"),
) -> dict[str, Any]:
    clean = clean_symbol(symbol)
    asset_type = normalize_asset_type(assetType)
    if not clean:
        return error_response(symbol, asset_type, "Invalid symbol")

    try:
        df = fetch_history_dataframe(clean, asset_type, period)
        source = "openbb"
    except Exception:
        df = mock_dataframe(clean, period_to_days(period))
        source = "mock"

    history = calculate_analysis(clean, asset_type, df, source=source)["history"]
    return {"success": True, "source": source, "fallback": source == "mock", "symbol": clean, "assetType": asset_type, "period": period, "history": history}


@app.get("/market/compare")
def market_compare(symbols: str = Query(..., min_length=1), assetType: str = Query("stock")) -> dict[str, Any]:
    asset_type = normalize_asset_type(assetType)
    results = []
    for raw_symbol in symbols.split(",")[:8]:
        clean = clean_symbol(raw_symbol)
        if not clean:
            continue
        try:
            results.append(calculate_analysis(clean, asset_type, fetch_history_dataframe(clean, asset_type, "6m")))
        except Exception:
            results.append(fallback_analysis(clean, asset_type))
    return {"success": True, "results": results}


@app.get("/market/search")
def market_search(q: str = Query("", max_length=64)) -> dict[str, Any]:
    query = q.strip().upper()
    if not query:
        return {"success": True, "results": []}
    return {
        "success": True,
        "source": "mock",
        "fallback": True,
        "results": [
            {"symbol": query, "name": f"{query} market instrument", "assetType": "stock"},
            {"symbol": f"{query}-USD", "name": f"{query} crypto pair", "assetType": "crypto"},
        ],
    }
