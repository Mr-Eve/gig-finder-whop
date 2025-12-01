import { NextResponse } from "next/server";

// Use relative URL for same-origin API calls on Vercel, or localhost for dev
const getBackendUrl = () => {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return process.env.BACKEND_URL || 'http://127.0.0.1:8000';
};

const backendUrl = getBackendUrl();

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
    if (page === 1) {
      console.log(`[NextJS] Searching for: ${query}`);
      
      // Run all scrapers in parallel and wait for results
      const allPlatforms = ['freelancer', 'remoteok', 'weworkremotely'];
      console.log(`[NextJS] Scraping ${allPlatforms.length} platforms...`);
      
      const scrapeResults = await Promise.all(
        allPlatforms.map(p =>
          fetch(`${backendUrl}/api/scrape/${p}?query=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(data => {
              console.log(`[NextJS] ${p} done: ${data.new_jobs_count} jobs`);
              return data.jobs || [];
            })
            .catch(err => {
              console.log(`[NextJS] ${p} error: ${err.message}`);
              return [];
            })
        )
      );

      // Flatten all results
      const allJobs = scrapeResults.flat();
      console.log(`[NextJS] Total jobs found: ${allJobs.length}`);

      // Format and return
      const gigs = allJobs.map((job: any) => ({
        id: job.external_id || job.id?.toString() || Math.random().toString(),
        platform: job.platform,
        external_id: job.external_id,
        title: job.title,
        description: job.description,
        link: job.url,
        budget: job.budget,
        posted_at: job.posted_at,
        tags: [job.platform?.toLowerCase(), query]
      }));

      return NextResponse.json({ gigs });
    }

    // For subsequent pages, just fetch from DB
    console.log(`[NextJS] Fetching page ${page} (offset ${offset}) for: ${query}`);
    const jobsRes = await fetch(`${backendUrl}/api/jobs?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`);

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
