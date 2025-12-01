import asyncio
from playwright.async_api import async_playwright
from datetime import datetime
import json
import re

async def scrape_remoteok(query: str):
    print(f"[RemoteOK] 🚀 Starting scrape for: '{query}'")
    jobs = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        tag = query.lower().replace(" ", "-")
        url = f"https://remoteok.com/api?tag={tag}"
        print(f"[RemoteOK] Fetching API: {url}")
        
        try:
            response = await page.goto(url, timeout=30000)
            content = await page.evaluate("() => document.body.innerText")
            
            try:
                data = json.loads(content)
                if not isinstance(data, list):
                     print(f"[RemoteOK] Empty or invalid response: {data}")
                     return []

                print(f"[RemoteOK] API returned {len(data)} items")
                
                for item in data:
                    if "legal" in item or "slug" not in item: continue

                    title = item.get('position', 'No Title')
                    company = item.get('company', '')
                    external_id = str(item.get('id', 'unknown'))
                    link = item.get('url', '')
                    tags = item.get('tags', [])
                    description = item.get('description', '')
                    
                    budget = "N/A"
                    
                    # 1. Check explicit fields
                    # Sometimes RemoteOK puts range in 'location' if it's global
                    salary_field = item.get('salary', '') or item.get('location', '')
                    extracted_salary = extract_salary(salary_field)
                    
                    if extracted_salary:
                        budget = extracted_salary
                    else:
                        # 2. Check Tags
                        for t in tags:
                            extracted = extract_salary(t)
                            if extracted:
                                budget = extracted
                                break
                    
                    # 3. Last resort: Check description for patterns like "$60k" or "$100,000"
                    # Only if description is short or we really want to try hard.
                    # Often description has too many numbers, so we skip it to avoid false positives.

                    job = {
                        "platform": "RemoteOK",
                        "external_id": external_id,
                        "title": f"{title} at {company}",
                        "url": link,
                        "budget": budget,
                        "description": description[:300] + "...", 
                        "posted_at": item.get('date', datetime.now().isoformat())
                    }
                    jobs.append(job)
                    
                    if len(jobs) >= 50: break
                    
            except json.JSONDecodeError:
                 print(f"[RemoteOK] Failed to decode JSON.")
                 
        except Exception as e:
            print(f"[RemoteOK] 💥 Error: {e}")
            
        finally:
            await browser.close()
            
    return jobs

def extract_salary(text):
    """
    Extracts salary patterns from a string.
    Returns the cleaned salary string if found, else None.
    """
    if not text: return None
    text = str(text).strip()
    
    # Pattern 1: $Xk - $Yk (e.g. $60k-$100k) or $Xk+
    # Pattern 2: $X,000 - $Y,000
    # Pattern 3: €/£ symbols
    
    # Regex for currency ranges
    # Matches: $50k, $50k-$80k, $100,000, 50000 USD, 60k EUR
    # Captures things starting with currency OR ending with currency code
    
    currency_symbols = r'[$€£¥]'
    currency_codes = r'(?:USD|EUR|GBP|CAD|AUD)'
    
    # Look for "$50k" or "$50,000" style
    # \d{2,} means at least 2 digits to avoid "$1" matching randomly
    
    # Case 1: Symbols ($50k or $50,000)
    match = re.search(rf'{currency_symbols}\s*\d+(?:,\d+)*(?:k)?(?:\s*-\s*{currency_symbols}?\s*\d+(?:,\d+)*(?:k)?)?', text, re.IGNORECASE)
    if match:
        return match.group(0)
        
    # Case 2: Codes (50k USD)
    match_code = re.search(rf'\d+(?:,\d+)*(?:k)?\s*{currency_codes}', text, re.IGNORECASE)
    if match_code:
        return match_code.group(0)
        
    # If the text ITSELF is just a salary "Global ($60k+)"
    # We try to be more permissive if the text is short (likely a tag)
    if len(text) < 20:
        if any(c in text for c in ['$', '€', '£']) and any(c.isdigit() for c in text):
             return text
             
    return None
