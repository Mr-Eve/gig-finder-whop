import { Job, Scraper } from './types';
import { UpworkScraper, FiverrScraper, FreelancerScraper } from './platforms';

const SCRAPERS: Scraper[] = [UpworkScraper, FiverrScraper, FreelancerScraper];

// Map to track seen IDs for deduplication
const seenJobIds = new Set<string>();

export async function searchAllGigs(query: string): Promise<Job[]> {
  if (!query) return [];

  console.log(`Aggregating results for query: "${query}"...`);

  // Run all scrapers in parallel
  const promises = SCRAPERS.map(scraper => scraper.search(query).catch(err => {
    console.error(`Error in ${scraper.name} scraper:`, err);
    return { jobs: [] }; // Return empty on error to not break the whole request
  }));

  const results = await Promise.all(promises);

  // Flatten results
  const allJobs = results.flatMap(r => r.jobs);

  // Normalize & Dedupe
  const uniqueJobs: Job[] = [];
  
  // Reset seen IDs for this new search context if needed, 
  // BUT for a real app you might want to persist 'seen' IDs in a DB to filter out old ones globally.
  // For a simple search-on-demand, we just dedupe within the current result set + maybe simple memory cache?
  // Let's just dedupe within this result set for now.
  const currentSearchSeen = new Set<string>();

  for (const job of allJobs) {
    // Create a unique signature
    const signature = `${job.platform}:${job.external_id}`;
    
    if (!currentSearchSeen.has(signature)) {
      currentSearchSeen.add(signature);
      uniqueJobs.push(job);
    }
  }

  // Sort by date (newest first)
  return uniqueJobs.sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime());
}

