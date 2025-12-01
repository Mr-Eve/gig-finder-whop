from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import sys
import os

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from scrapers.freelancer import scrape_freelancer
from scrapers.upwork import scrape_upwork
from scrapers.remoteok import scrape_remoteok
from scrapers.weworkremotely import scrape_weworkremotely

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory cache (resets on cold start, but helps during warm instances)
jobs_cache = {}

@app.get("/api")
def read_root():
    return {"message": "Gig Finder API is running on Vercel"}

@app.get("/api/scrape/freelancer")
async def scrape_freelancer_endpoint(query: str = Query(..., min_length=1), page: int = 1):
    jobs = await scrape_freelancer(query, page_num=page)
    # Cache results
    for job in jobs:
        key = f"{job['platform']}_{job['external_id']}"
        jobs_cache[key] = job
    return {"status": "success", "new_jobs_count": len(jobs), "jobs": jobs}

@app.get("/api/scrape/upwork")
async def scrape_upwork_endpoint(query: str = Query(..., min_length=1)):
    jobs = await scrape_upwork(query)
    for job in jobs:
        key = f"{job['platform']}_{job['external_id']}"
        jobs_cache[key] = job
    return {"status": "success", "new_jobs_count": len(jobs), "jobs": jobs}

@app.get("/api/scrape/remoteok")
async def scrape_remoteok_endpoint(query: str = Query(..., min_length=1)):
    jobs = await scrape_remoteok(query)
    for job in jobs:
        key = f"{job['platform']}_{job['external_id']}"
        jobs_cache[key] = job
    return {"status": "success", "new_jobs_count": len(jobs), "jobs": jobs}

@app.get("/api/scrape/weworkremotely")
async def scrape_wwr_endpoint(query: str = Query(..., min_length=1)):
    jobs = await scrape_weworkremotely(query)
    for job in jobs:
        key = f"{job['platform']}_{job['external_id']}"
        jobs_cache[key] = job
    return {"status": "success", "new_jobs_count": len(jobs), "jobs": jobs}

@app.get("/api/jobs")
def list_jobs(query: Optional[str] = None, offset: int = 0, limit: int = 50):
    """Return cached jobs, filtered by query if provided"""
    all_jobs = list(jobs_cache.values())
    
    if query:
        query_lower = query.lower()
        keywords = [w for w in query_lower.split() if len(w) > 2]
        
        filtered = []
        for job in all_jobs:
            title = job.get('title', '').lower()
            desc = job.get('description', '').lower()
            if any(kw in title or kw in desc for kw in keywords):
                filtered.append(job)
        all_jobs = filtered
    
    # Sort by posted_at descending
    all_jobs.sort(key=lambda x: x.get('posted_at', ''), reverse=True)
    
    return all_jobs[offset:offset + limit]

