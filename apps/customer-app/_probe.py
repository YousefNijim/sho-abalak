from playwright.sync_api import sync_playwright

errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.on("console", lambda m: errors.append(f"[{m.type}] {m.text}"))
    page.on("pageerror", lambda e: errors.append(f"[pageerror] {e}"))
    page.goto("http://localhost:8081", wait_until="networkidle", timeout=120000)
    page.wait_for_timeout(4000)
    page.screenshot(path="_probe.png", full_page=True)
    print("=== CONSOLE / ERRORS ===")
    for e in errors:
        print(e)
    browser.close()
