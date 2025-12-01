import { NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

// Helper to format jobs from backend
function formatGigs(jobsData: any[], query: string) {
  return jobsData.map((job: any) => ({
    id: job.id.toString(),
    platform: job.platform,
    external_id: job.external_id,
    title: job.title,
    description: job.description,
    link: job.url,
    budget: job.budget,
    posted_at: job.posted_at,
    tags: [job.platform.toLowerCase(), query]
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase() || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 50;
  const offset = (page - 1) * limit;

  if (!query) {
    return NextResponse.json({ gigs: [] });
  }

  try {
    // OPTIMIZATION: Return cached results IMMEDIATELY, trigger scrape in background
    if (page === 1) {
      console.log(`[NextJS] Fast search for: ${query}`);
      
      // 1. First, get cached results from DB immediately (fast!)
      const cachedRes = await fetch(`${backendUrl}/jobs?query=${encodeURIComponent(query)}&limit=${limit}&offset=0`);
      const cachedJobs = cachedRes.ok ? await cachedRes.json() : [];
      
      // 2. Fire off scrapers in background (don't await)
      const allPlatforms = ['freelancer', 'upwork', 'remoteok', 'weworkremotely'];
      console.log(`[NextJS] Triggering background scrape for ${allPlatforms.length} platforms`);
      
      // Fire and forget - don't block the response
      Promise.all(
        allPlatforms.map(p =>
          fetch(`${backendUrl}/scrape/${p}?query=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(data => console.log(`[NextJS] ${p} done: ${data.new_jobs_count} new`))
            .catch(err => console.log(`[NextJS] ${p} error: ${err.message}`))
        )
      );

      // 3. Return cached results immediately
      console.log(`[NextJS] Returning ${cachedJobs.length} cached results immediately`);
      return NextResponse.json({ 
        gigs: formatGigs(cachedJobs, query),
        cached: true,
        message: cachedJobs.length === 0 ? 'Searching platforms... refresh in a few seconds' : undefined
      });
    }

    // For subsequent pages, just fetch from DB
    console.log(`[NextJS] Fetching page ${page} (offset ${offset}) for: ${query}`);
    const jobsRes = await fetch(`${backendUrl}/jobs?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`);

    if (!jobsRes.ok) {
      throw new Error(`Backend responded with ${jobsRes.status}`);
    }

    const jobsData = await jobsRes.json();
    console.log(`[NextJS] DB returned ${jobsData.length} jobs`);

    return NextResponse.json({ gigs: formatGigs(jobsData, query) });

  } catch (error) {
    console.error("Search error:", error);
    
    // If backend is unavailable, return helpful message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
      return NextResponse.json({ 
        gigs: [],
        error: "Backend service unavailable. The scraping backend needs to be running to fetch gigs.",
        backendRequired: true
      });
    }
    
    return NextResponse.json({ error: "Failed to fetch gigs from backend" }, { status: 500 });
  }
}
