import asyncio
from playwright.async_api import async_playwright
from datetime import datetime

async def scrape_weworkremotely(query: str):
    print(f"[WWR] 🚀 Starting scrape for: '{query}'")
    jobs = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        url = f"https://weworkremotely.com/remote-jobs/search?term={query}"
        print(f"[WWR] Navigating to: {url}")
        
        try:
            await page.goto(url, timeout=30000)
            
            # Selector update: WWR sometimes puts results in 'div.jobs-container section.jobs article ul li'
            # Let's try a more generic selector for the 'li' items
            
            try:
                await page.wait_for_selector('section.jobs', timeout=10000)
            except:
                print("[WWR] No jobs section found. Check if page loaded correctly.")
                # Debug: print title
                print(f"[WWR] Page Title: {await page.title()}")
                return []

            # Get all LI elements that look like jobs
            # They have class 'feature' or just generic LI inside the ULs
            cards = await page.locator('section.jobs article ul li').all()
            print(f"[WWR] Found {len(cards)} potential cards")
            
            for card in cards:
                try:
                    # Ignore "view all" buttons or ads
                    if await card.locator('span.view-all').count() > 0: continue
                    
                    # Link is usually direct child 'a' or inside
                    link_el = card.locator('a').first
                    if await link_el.count() == 0: continue
                    
                    # WWR links are relative
                    relative_link = await link_el.get_attribute('href')
                    if not relative_link or 'remote-jobs' not in relative_link: continue
                    
                    link = f"https://weworkremotely.com{relative_link}"
                    external_id = relative_link.split('/')[-1]
                    
                    title_el = card.locator('span.title')
                    company_el = card.locator('span.company')
                    
                    title = await title_el.inner_text() if await title_el.count() > 0 else "No Title"
                    company = await company_el.inner_text() if await company_el.count() > 0 else ""
                    
                    # Skip if empty title (some list items are dividers)
                    if not title or title == "No Title": continue

                    date_el = card.locator('span.date')
                    date_posted = await date_el.inner_text() if await date_el.count() > 0 else ""
                    
                    job = {
                        "platform": "WeWorkRemotely",
                        "external_id": external_id,
                        "title": f"{title} ({company})",
                        "url": link,
                        "budget": "See Job",
                        "description": f"Remote job at {company}. Posted: {date_posted}",
                        "posted_at": datetime.now().isoformat()
                    }
                    jobs.append(job)
                    
                    # INCREASE LIMIT
                    if len(jobs) >= 50: break
                    
                except Exception as e:
                    # print(f"[WWR] Error parsing card: {e}")
                    continue
            
            print(f"[WWR] Successfully extracted {len(jobs)} jobs")
                    
        except Exception as e:
            print(f"[WWR] 💥 Error: {e}")
            
        finally:
            await browser.close()
            
    return jobs
