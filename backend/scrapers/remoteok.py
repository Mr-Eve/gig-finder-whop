import httpx
from datetime import datetime
import json
import re

async def scrape_remoteok(query: str):
    """Scrape RemoteOK using their JSON API (no browser needed)"""
    print(f"[RemoteOK] 🚀 Starting scrape for: '{query}'")
    jobs = []
    
    tag = query.lower().replace(" ", "-")
    url = f"https://remoteok.com/api?tag={tag}"
    print(f"[RemoteOK] Fetching API: {url}")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers, follow_redirects=True)
            
            if response.status_code != 200:
                print(f"[RemoteOK] ⚠️ Got status {response.status_code}")
                return []
            
            try:
                data = response.json()
            except:
                print(f"[RemoteOK] Failed to parse JSON")
                return []
            
            if not isinstance(data, list):
                print(f"[RemoteOK] Invalid response format")
                return []
            
            print(f"[RemoteOK] API returned {len(data)} items")
            
            for item in data:
                if "legal" in item or "slug" not in item:
                    continue
                
                title = item.get('position', 'No Title')
                company = item.get('company', '')
                external_id = str(item.get('id', 'unknown'))
                link = item.get('url', '')
                tags = item.get('tags', [])
                description = item.get('description', '')
                
                budget = "N/A"
                salary_field = item.get('salary', '') or item.get('location', '')
                extracted_salary = extract_salary(salary_field)
                
                if extracted_salary:
                    budget = extracted_salary
                else:
                    for t in tags:
                        extracted = extract_salary(t)
                        if extracted:
                            budget = extracted
                            break
                
                job = {
                    "platform": "RemoteOK",
                    "external_id": external_id,
                    "title": f"{title} at {company}" if company else title,
                    "url": link,
                    "budget": budget,
                    "description": description[:300] + "..." if len(description) > 300 else description,
                    "posted_at": item.get('date', datetime.now().isoformat())
                }
                jobs.append(job)
                
                if len(jobs) >= 50:
                    break
                    
    except Exception as e:
        print(f"[RemoteOK] 💥 Error: {e}")
    
    print(f"[RemoteOK] Extracted {len(jobs)} jobs")
    return jobs


def extract_salary(text):
    """Extract salary patterns from a string."""
    if not text:
        return None
    text = str(text).strip()
    
    currency_symbols = r'[$€£¥]'
    currency_codes = r'(?:USD|EUR|GBP|CAD|AUD)'
    
    match = re.search(rf'{currency_symbols}\s*\d+(?:,\d+)*(?:k)?(?:\s*-\s*{currency_symbols}?\s*\d+(?:,\d+)*(?:k)?)?', text, re.IGNORECASE)
    if match:
        return match.group(0)
    
    match_code = re.search(rf'\d+(?:,\d+)*(?:k)?\s*{currency_codes}', text, re.IGNORECASE)
    if match_code:
        return match_code.group(0)
    
    if len(text) < 20:
        if any(c in text for c in ['$', '€', '£']) and any(c.isdigit() for c in text):
            return text
    
    return None
