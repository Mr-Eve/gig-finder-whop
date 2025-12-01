import asyncio
from playwright.async_api import async_playwright
from datetime import datetime

async def scrape_upwork(query: str):
    print(f"[Upwork] 🚀 Starting scrape for: '{query}'")
    jobs = []
    
    async with async_playwright() as p:
        print(f"[Upwork] Launching browser...")
        # Upwork often detects headless, so we might need to tweak args or use a stealth plugin in the future.
        # For now, we try standard headless but with a user agent.
        browser = await p.chromium.launch(headless=True, args=["--disable-blink-features=AutomationControlled"])
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        # Upwork search URL
        url = f"https://www.upwork.com/nx/search/jobs/?q={query}&sort=recency"
        print(f"[Upwork] Navigating to: {url}")
        
        try:
            await page.goto(url, timeout=60000) # Upwork can be slow
            
            # Check for captcha title
            title = await page.title()
            print(f"[Upwork] Page title: {title}")
            if "Just a moment" in title or "Access denied" in title:
                print("[Upwork] ⛔ Blocked by anti-bot protection.")
                await browser.close()
                return []

            print(f"[Upwork] Waiting for job sections...")
            try:
                # Upwork structure changes often. Look for general article or section tags inside the feed.
                # Common recent selector: 'article.job-tile' or 'section.up-card-section'
                # We wait for the main feed container usually
                await page.wait_for_selector('article, section.up-card-section', timeout=15000)
            except Exception as e:
                print(f"[Upwork] ⚠️ Timed out waiting for content. Page might be empty or blocked.")
            
            # Try to find job cards
            # Strategy: Get all 'article' elements which are usually the job cards
            cards = await page.locator('article').all()
            if not cards:
                cards = await page.locator('section.up-card-section').all()
                
            print(f"[Upwork] Found {len(cards)} cards")
            
            for i, card in enumerate(cards[:10]):
                try:
                    # Title is usually in an h3 or h2 -> a
                    title_el = card.locator('h3 a, h2 a').first
                    if await title_el.count() == 0:
                         # Fallback
                         title_el = card.locator('a.up-n-link').first
                    
                    if await title_el.count() == 0:
                        continue

                    title = await title_el.inner_text()
                    relative_link = await title_el.get_attribute('href')
                    link = f"https://www.upwork.com{relative_link}"
                    
                    # External ID usually in url (~012345...)
                    external_id = relative_link.split('~')[-1] if relative_link and '~' in relative_link else 'unknown'
                    if external_id == 'unknown':
                        # Fallback hash
                        import hashlib
                        external_id = hashlib.md5(link.encode()).hexdigest()

                    # Budget/Type
                    # Often in a list: <li data-test="job-type">Fixed-price</li>
                    # or <strong data-test="budget">$500</strong>
                    budget_text = "N/A"
                    
                    # Try to find specific budget indicators
                    budget_items = card.locator('li[data-test="job-type"], li[data-test="budget"], strong')
                    count = await budget_items.count()
                    for j in range(count):
                        text = await budget_items.nth(j).inner_text()
                        if '$' in text or 'Hourly' in text or 'Fixed' in text:
                            budget_text = text
                            break
                    
                    # Description
                    # Upwork usually has a span or div with the snippet
                    desc_el = card.locator('.up-line-clamp-v2, p').first
                    description = await desc_el.inner_text() if await desc_el.count() > 0 else ""
                    
                    print(f"[Upwork] Extracted: {title[:30]}... ({budget_text})")

                    job = {
                        "platform": "Upwork",
                        "external_id": external_id,
                        "title": title.strip(),
                        "url": link,
                        "budget": budget_text.strip(),
                        "description": description.strip(),
                        "posted_at": datetime.now().isoformat()
                    }
                    jobs.append(job)
                    
                except Exception as e:
                    print(f"[Upwork] ❌ Error parsing card {i}: {e}")
                    continue
                    
        except Exception as e:
            print(f"[Upwork] 💥 Error during scrape: {e}")
            
        finally:
            await browser.close()
            
    return jobs

