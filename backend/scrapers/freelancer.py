import asyncio
from playwright.async_api import async_playwright
from datetime import datetime

# Modified to accept a 'page' argument for on-demand scraping
async def scrape_freelancer(query: str, page_num: int = 1):
    print(f"[Freelancer] 🚀 Starting scrape for: '{query}' (Page {page_num})")
    jobs = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Scrape ONLY the requested page (much faster)
        url = f"https://www.freelancer.com/jobs/{page_num}/?keyword={query}&status=open&s=new"
        print(f"[Freelancer] Navigating to: {url}")
        
        try:
            await page.goto(url, timeout=30000)
            try:
                await page.wait_for_selector('.JobSearchCard-item', timeout=10000)
            except Exception as e:
                print(f"[Freelancer] ⚠️ Timed out waiting for selectors on page {page_num}.")
                await browser.close()
                return []
            
            cards = await page.locator('.JobSearchCard-item').all()
            print(f"[Freelancer] Found {len(cards)} cards on page {page_num}")
            
            for card in cards:
                try:
                    title_el = card.locator('.JobSearchCard-primary-heading a')
                    title = await title_el.inner_text()
                    relative_link = await title_el.get_attribute('href')
                    link = f"https://www.freelancer.com{relative_link}"
                    external_id = relative_link.split('/')[-1] if relative_link else 'unknown'
                    
                    budget_el = card.locator('.JobSearchCard-primary-price')
                    budget = await budget_el.inner_text() if await budget_el.count() > 0 else "N/A"
                    
                    desc_el = card.locator('.JobSearchCard-primary-description')
                    description = await desc_el.inner_text() if await desc_el.count() > 0 else ""
                    
                    job = {
                        "platform": "Freelancer",
                        "external_id": external_id,
                        "title": title.strip(),
                        "url": link,
                        "budget": budget.strip(),
                        "description": description.strip(),
                        "posted_at": datetime.now().isoformat()
                    }
                    jobs.append(job)
                    
                except Exception as e:
                    continue
            
        except Exception as e:
            print(f"[Freelancer] 💥 Error on page {page_num}: {e}")
        
        finally:
            await browser.close()
            
    return jobs
