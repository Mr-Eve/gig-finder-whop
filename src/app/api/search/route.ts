import { NextResponse } from "next/server";

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
    const backendUrl = 'http://127.0.0.1:8000';
    
    // If it's the first page, trigger a fresh scrape
    if (page === 1) {
        console.log(`[NextJS] Starting multi-platform search for: ${query}`);
        const allPlatforms = ['freelancer', 'upwork', 'remoteok', 'weworkremotely'];

        const scrapePromises = allPlatforms.map(p => 
            fetch(`${backendUrl}/scrape/${p}?query=${encodeURIComponent(query)}`)
                .then(res => res.json())
                .then(data => ({ platform: p, count: data.new_jobs_count, status: 'ok' }))
                .catch(err => ({ platform: p, error: err.message, status: 'error' }))
        );

        const scrapeResults = await Promise.all(scrapePromises);
        console.log("[NextJS] Scrape results:", scrapeResults);
    } else {
        console.log(`[NextJS] Fetching page ${page} (offset ${offset}) for: ${query}`);
    }

    // 2. Read from DB (Aggregated) with pagination
    console.log(`[NextJS] Fetching aggregated jobs from DB (offset ${offset})`);
    const jobsRes = await fetch(`${backendUrl}/jobs?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`);
    
    if (!jobsRes.ok) {
       throw new Error(`Backend responded with ${jobsRes.status}`);
    }
    
    const jobsData = await jobsRes.json();
    console.log(`[NextJS] DB returned ${jobsData.length} total jobs`);
    
    const gigs = jobsData.map((job: any) => ({
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

    return NextResponse.json({ gigs });
    
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Failed to fetch gigs from backend" }, { status: 500 });
  }
}
