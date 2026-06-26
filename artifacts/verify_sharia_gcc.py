from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = "http://127.0.0.1:4799"
OUT = Path("artifacts")
OUT.mkdir(exist_ok=True)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1366, "height": 768})
        context.add_init_script(
            """
            localStorage.setItem('the-sfm-trader-settings', JSON.stringify({ language: 'en', selectedMarketId: 'gcc' }));
            localStorage.setItem('the-sfm-trader-watchlist', JSON.stringify([
              { symbol: 'AAPL', notes: 'Apple Inc.' },
              { symbol: 'EUR/USD', notes: 'Euro / Dollar' }
            ]));
            """
        )
        page = context.new_page()
        page.set_default_navigation_timeout(90000)
        page.set_default_timeout(45000)
        console_messages = []
        page.on("console", lambda msg: console_messages.append(f"{msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: console_messages.append(f"pageerror: {err}"))
        page.goto(f"{BASE}/index.html?route=markets/stocks", wait_until="domcontentloaded")
        page.wait_for_timeout(2000)
        if not page.locator("#app").is_visible():
            print("\n".join(console_messages[-20:]))
            print(page.locator("body").evaluate("el => el.className"))
        expect(page.locator("#app")).to_be_visible()
        expect(page.locator('.market-hub-tile[data-market-select="stocks"]')).to_be_visible(timeout=30000)
        assert page.locator('.market-hub-tile[data-market-select="gcc"]').count() == 0, "GCC market tile should be removed"
        for market_id in ["kuwait", "saudi", "uae", "qatar", "bahrain", "oman"]:
            assert page.locator(f'.market-hub-tile[data-market-select="{market_id}"]').count() == 1, f"{market_id} market tile missing"
        page.screenshot(path=str(OUT / "markets-sharia-gcc-desktop.png"), full_page=True)

        page.goto(f"{BASE}/index.html?route=watchlist", wait_until="domcontentloaded")
        expect(page.locator(".terminal-table")).to_be_visible()
        badges = [text.strip() for text in page.locator(".sharia-badge").all_inner_texts()]
        assert any("Review required" in text for text in badges), f"Expected review-required Sharia badge, got {badges}"
        assert page.locator("text=EUR/USD").count() >= 1, "Forex watchlist row missing"
        page.screenshot(path=str(OUT / "watchlist-sharia-badges-desktop.png"), full_page=True)

        mobile = browser.new_context(viewport={"width": 390, "height": 844})
        mobile.add_init_script(
            """
            localStorage.setItem('the-sfm-trader-settings', JSON.stringify({ language: 'en' }));
            localStorage.setItem('the-sfm-trader-watchlist', JSON.stringify([{ symbol: 'AAPL', notes: 'Apple Inc.' }]));
            """
        )
        mpage = mobile.new_page()
        mpage.set_default_navigation_timeout(90000)
        mpage.set_default_timeout(45000)
        mpage.goto(f"{BASE}/index.html?route=markets/stocks", wait_until="domcontentloaded")
        expect(mpage.locator('.market-hub-tile[data-market-select="stocks"]')).to_be_visible(timeout=30000)
        assert mpage.locator('.market-hub-tile[data-market-select="gcc"]').count() == 0
        mpage.screenshot(path=str(OUT / "markets-sharia-gcc-mobile.png"), full_page=True)
        browser.close()


if __name__ == "__main__":
    main()
