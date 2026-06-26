import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("TRADER_AUDIT_URL", "http://127.0.0.1:4307/thesfm-trader-own/app/index.html?route=markets%2Fforex")
OUT = Path("artifacts/markets-audit")
OUT.mkdir(parents=True, exist_ok=True)

VIEWPORTS = [
    (1728, 886),
    (1920, 1080),
    (1440, 900),
    (1366, 768),
    (1024, 768),
    (390, 844),
]


def main():
    report = {"viewports": {}, "console": [], "requests": []}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for width, height in VIEWPORTS:
            page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
            page.on("console", lambda msg: report["console"].append({"type": msg.type, "text": msg.text}))

            def on_response(response):
                url = response.url
                if "/api/trader" not in url and "styles.css" not in url and "app.js" not in url:
                    return
                entry = {
                    "url": url,
                    "status": response.status,
                    "contentType": response.headers.get("content-type", ""),
                }
                try:
                    text = response.text()
                    entry["bodyPreview"] = text[:400]
                except Exception as exc:
                    entry["bodyPreview"] = f"<unavailable: {exc}>"
                report["requests"].append(entry)

            page.on("response", on_response)
            page.goto(BASE_URL, wait_until="domcontentloaded", timeout=60000)
            page.wait_for_selector(".terminal-root", timeout=30000)
            page.wait_for_timeout(3000)
            screenshot = OUT / f"markets-{width}x{height}.png"
            page.screenshot(path=str(screenshot), full_page=True)

            data = page.evaluate(
                """
                () => {
                  const rect = (selector) => {
                    const el = document.querySelector(selector);
                    if (!el) return null;
                    const r = el.getBoundingClientRect();
                    const cs = getComputedStyle(el);
                    return {
                      x: Math.round(r.x),
                      y: Math.round(r.y),
                      width: Math.round(r.width),
                      height: Math.round(r.height),
                      bottom: Math.round(r.bottom),
                      top: Math.round(r.top),
                      position: cs.position,
                      zIndex: cs.zIndex,
                      overflow: cs.overflow,
                      pointerEvents: cs.pointerEvents,
                      backdropFilter: cs.backdropFilter,
                    };
                  };
                  const fixed = Array.from(document.querySelectorAll("*")).map((el) => {
                    const cs = getComputedStyle(el);
                    if (cs.position !== "fixed") return null;
                    const r = el.getBoundingClientRect();
                    if (r.width < 20 || r.height < 20) return null;
                    return {
                      tag: el.tagName.toLowerCase(),
                      className: String(el.className || ""),
                      x: Math.round(r.x),
                      y: Math.round(r.y),
                      width: Math.round(r.width),
                      height: Math.round(r.height),
                      bottom: Math.round(r.bottom),
                      zIndex: cs.zIndex,
                      pointerEvents: cs.pointerEvents,
                      backdropFilter: cs.backdropFilter,
                    };
                  }).filter(Boolean);
                  return {
                    documentWidth: document.documentElement.scrollWidth,
                    viewportWidth: window.innerWidth,
                    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
                    statusbar: rect(".terminal-statusbar"),
                    main: rect(".terminal-main"),
                    marketsGrid: rect(".markets-grid"),
                    opportunities: rect(".market-opportunity-layout"),
                    qualityStrip: rect(".markets-quality-strip"),
                    fixedLayers: fixed,
                    metricTexts: Array.from(document.querySelectorAll(".markets-stats-grid .metric-card")).map((el) => el.innerText),
                    marketTiles: Array.from(document.querySelectorAll(".market-hub-tile")).slice(0, 10).map((el) => {
                      const r = el.getBoundingClientRect();
                      return {
                        text: el.innerText,
                        width: Math.round(r.width),
                        height: Math.round(r.height),
                        title: el.getAttribute("title"),
                      };
                    }),
                    qualityText: document.querySelector(".markets-quality-strip")?.innerText || "",
                  };
                }
                """
            )
            report["viewports"][f"{width}x{height}"] = data
            page.close()
        browser.close()
    (OUT / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
