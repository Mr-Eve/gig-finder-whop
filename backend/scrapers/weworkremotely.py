import httpx
from datetime import datetime
from bs4 import BeautifulSoup

async def scrape_weworkremotely(query: str):
    """Scrape WeWorkRemotely using HTTP requests (no browser needed)"""
    print(f"[WWR] 🚀 Starting scrape for: '{query}'")
    jobs = []
    
    url = f"https://weworkremotely.com/remote-jobs/search?term={query}"
    print(f"[WWR] Fetching: {url}")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers, follow_redirects=True)
            
            if response.status_code != 200:
                print(f"[WWR] ⚠️ Got status {response.status_code}")
                return []
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find job listings
            cards = soup.select('section.jobs article ul li')
            print(f"[WWR] Found {len(cards)} potential cards")
            
            for card in cards:
                try:
                    # Skip view-all buttons
                    if card.select_one('span.view-all'):
                        continue
                    
                    link_el = card.select_one('a')
                    if not link_el:
                        continue
                    
                    relative_link = link_el.get('href', '')
                    if not relative_link or 'remote-jobs' not in relative_link:
                        continue
                    
                    link = f"https://weworkremotely.com{relative_link}"
                    external_id = relative_link.split('/')[-1]
                    
                    title_el = card.select_one('span.title')
                    company_el = card.select_one('span.company')
                    
                    title = title_el.get_text(strip=True) if title_el else "No Title"
                    company = company_el.get_text(strip=True) if company_el else ""
                    
                    if not title or title == "No Title":
                        continue
                    
                    date_el = card.select_one('span.date')
                    date_posted = date_el.get_text(strip=True) if date_el else ""
                    
                    job = {
                        "platform": "WeWorkRemotely",
                        "external_id": external_id,
                        "title": f"{title} ({company})" if company else title,
                        "url": link,
                        "budget": "See Job",
                        "description": f"Remote job at {company}. Posted: {date_posted}",
                        "posted_at": datetime.now().isoformat()
                    }
                    jobs.append(job)
                    
                    if len(jobs) >= 50:
                        break
                        
                except Exception as e:
                    continue
                    
    except Exception as e:
        print(f"[WWR] 💥 Error: {e}")
    
    print(f"[WWR] Extracted {len(jobs)} jobs")
    return jobs
