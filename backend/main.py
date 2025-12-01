from fastapi import FastAPI, Query
from typing import List, Optional
import uvicorn
from pydantic import BaseModel
from db import init_db, insert_job, get_jobs
from scrapers.freelancer import scrape_freelancer
from scrapers.upwork import scrape_upwork
from scrapers.remoteok import scrape_remoteok
from scrapers.weworkremotely import scrape_weworkremotely

app = FastAPI()

class Job(BaseModel):
    platform: str
    external_id: str
    title: str
    url: str
    budget: str
    description: str
    posted_at: str
    
@app.on_event("startup")
def startup_event():
    init_db()

# --- Generic Helper to Run Scrape & Save ---
async def run_scraper(scraper_func, query, platform_name, **kwargs):
    print(f"[API] Triggering {platform_name} scrape for: {query} args={kwargs}")
    try:
        jobs = await scraper_func(query, **kwargs)
        added = 0
        for job in jobs:
            if insert_job(job):
                added += 1
        print(f"[API] {platform_name} finished. Found {len(jobs)}, Added {added}")
        return jobs, added
    except Exception as e:
        print(f"[API] {platform_name} failed: {e}")
        return [], 0

@app.get("/scrape/freelancer")
async def scrape_freelancer_endpoint(query: str = Query(..., min_length=1), page: int = 1):
    # Only Freelancer supports page param in our implementation so far
    jobs, added = await run_scraper(scrape_freelancer, query, "Freelancer", page_num=page)
    return {"status": "success", "new_jobs_count": added, "jobs": jobs}

@app.get("/scrape/upwork")
async def scrape_upwork_endpoint(query: str = Query(..., min_length=1)):
    jobs, added = await run_scraper(scrape_upwork, query, "Upwork")
    return {"status": "success", "new_jobs_count": added, "jobs": jobs}

@app.get("/scrape/remoteok")
async def scrape_remoteok_endpoint(query: str = Query(..., min_length=1)):
    jobs, added = await run_scraper(scrape_remoteok, query, "RemoteOK")
    return {"status": "success", "new_jobs_count": added, "jobs": jobs}

@app.get("/scrape/weworkremotely")
async def scrape_wwr_endpoint(query: str = Query(..., min_length=1)):
    jobs, added = await run_scraper(scrape_weworkremotely, query, "WeWorkRemotely")
    return {"status": "success", "new_jobs_count": added, "jobs": jobs}

@app.get("/jobs")
def list_jobs(query: Optional[str] = None, offset: int = 0, limit: int = 50):
    print(f"[API] Fetching jobs from DB with query: {query}, offset: {offset}, limit: {limit}")
    jobs = get_jobs(query, limit, offset)
    return jobs

@app.get("/")
def read_root():
    return {"message": "Gig Finder Scraper API is running"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
