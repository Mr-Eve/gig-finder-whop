import httpx
from datetime import datetime
from bs4 import BeautifulSoup

async def scrape_freelancer(query: str, page_num: int = 1):
    """Scrape Freelancer using HTTP requests (no browser needed)"""
    print(f"[Freelancer] 🚀 Starting scrape for: '{query}' (Page {page_num})")
    jobs = []
    
    url = f"https://www.freelancer.com/jobs/{page_num}/?keyword={query}&status=open&s=new"
    print(f"[Freelancer] Fetching: {url}")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers, follow_redirects=True)
            
            if response.status_code != 200:
                print(f"[Freelancer] ⚠️ Got status {response.status_code}")
                return []
            
            soup = BeautifulSoup(response.text, 'html.parser')
            cards = soup.select('.JobSearchCard-item')
            print(f"[Freelancer] Found {len(cards)} cards")
            
            for card in cards:
                try:
                    title_el = card.select_one('.JobSearchCard-primary-heading a')
                    if not title_el:
                        continue
                    
                    title = title_el.get_text(strip=True)
                    relative_link = title_el.get('href', '')
                    link = f"https://www.freelancer.com{relative_link}"
                    external_id = relative_link.split('/')[-1] if relative_link else 'unknown'
                    
                    budget_el = card.select_one('.JobSearchCard-primary-price')
                    budget = budget_el.get_text(strip=True) if budget_el else "N/A"
                    
                    desc_el = card.select_one('.JobSearchCard-primary-description')
                    description = desc_el.get_text(strip=True) if desc_el else ""
                    
                    job = {
                        "platform": "Freelancer",
                        "external_id": external_id,
                        "title": title,
                        "url": link,
                        "budget": budget,
                        "description": description[:500],
                        "posted_at": datetime.now().isoformat()
                    }
                    jobs.append(job)
                    
                except Exception as e:
                    print(f"[Freelancer] Error parsing card: {e}")
                    continue
                    
    except Exception as e:
        print(f"[Freelancer] 💥 Error: {e}")
    
    print(f"[Freelancer] Extracted {len(jobs)} jobs")
    return jobs
