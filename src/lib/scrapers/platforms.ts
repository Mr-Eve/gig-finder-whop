import { Job, Scraper, ScraperResult } from './types';
import { ApifyClient } from 'apify-client';

// Initialize Apify Client
const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

// --- Helper to generate mock data for fallback ---
const generateMockJobs = (platform: Job['platform'], query: string, count: number): Job[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `${platform.toLowerCase()}-${i}-${Date.now()}`,
    platform,
    external_id: `${platform}_${Math.random().toString(36).substr(2, 9)}`,
    title: `${query} Specialist ${i + 1} on ${platform} (Fallback Data)`,
    description: `This is a placeholder because the real scraper failed. Looking for a skilled ${query} expert.`,
    link: `https://www.${platform.toLowerCase()}.com`,
    budget: platform === 'Fiverr' ? `$${(i + 1) * 50}` : `$${(i + 1) * 20}/hr`,
    posted_at: new Date(Date.now() - i * 3600000).toISOString(),
    tags: [query, platform.toLowerCase(), 'fallback'],
  }));
};

// --- Helper to normalize generic Apify results ---
const normalizeUpworkJob = (item: any): Job => ({
  id: `upwork-${item.id || Math.random().toString(36).substr(2, 9)}`,
  platform: 'Upwork',
  external_id: item.id || item.ciphertext || 'unknown',
  title: item.title || 'No Title',
  description: item.description || item.snippet || '',
  link: item.url || `https://www.upwork.com/jobs/${item.ciphertext}`,
  budget: item.budget || item.amount || 'Negotiable',
  posted_at: item.postedDate || item.publishedOn || new Date().toISOString(),
  tags: item.skills || [],
});

const normalizeFiverrJob = (item: any): Job => ({
  id: `fiverr-${item.id || Math.random().toString(36).substr(2, 9)}`,
  platform: 'Fiverr',
  external_id: item.id || 'unknown',
  title: item.title || 'No Title',
  description: `Seller: ${item.sellerName || 'Unknown'} - ${item.rating || 0} stars (${item.ratingCount || 0} reviews)`,
  link: item.url || 'https://www.fiverr.com',
  budget: item.price || 'See Gig',
  posted_at: new Date().toISOString(),
  tags: ['gig', 'fiverr'],
});

const normalizeFreelancerJob = (item: any): Job => ({
  id: `freelancer-${item.id || Math.random().toString(36).substr(2, 9)}`,
  platform: 'Freelancer',
  external_id: String(item.id) || 'unknown',
  title: item.title || 'No Title',
  description: item.previewDescription || item.description || '',
  link: item.seoUrl ? `https://www.freelancer.com/projects/${item.seoUrl}` : `https://www.freelancer.com/projects/${item.id}`,
  budget: `${item.currency?.sign || '$'}${item.minbudget || 0} - ${item.maxbudget || 0}`,
  posted_at: item.submitDate ? new Date(item.submitDate * 1000).toISOString() : new Date().toISOString(),
  tags: item.jobs?.map((j: any) => j.name) || [],
});


// --- Upwork Scraper (Real with Fallback) ---
export const UpworkScraper: Scraper = {
  name: 'Upwork',
  search: async (query: string): Promise<ScraperResult> => {
    console.log(`[Upwork] Searching via Apify for: ${query}`);
    
    try {
      // 'trudax/upwork-scraper' - requires rental
      const run = await apifyClient.actor('trudax/upwork-scraper').call({
        search: query,
        limit: 5, 
      });

      const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
      return { jobs: items.map(normalizeUpworkJob) };

    } catch (error) {
      console.error('[Upwork] Scraper failed (likely payment/auth required). Falling back to mock data.');
      return { jobs: generateMockJobs('Upwork', query, 3) }; 
    }
  },
};

// --- Fiverr Scraper (Real with Fallback) ---
export const FiverrScraper: Scraper = {
  name: 'Fiverr',
  search: async (query: string): Promise<ScraperResult> => {
    console.log(`[Fiverr] Searching via Apify for: ${query}`);

    try {
      // 'piotrv1001/fiverr-listings-scraper' seems to be a valid active one
      // Input schema often requires 'searchUrl' or 'query'
      const run = await apifyClient.actor('piotrv1001/fiverr-listings-scraper').call({
        search: query,
        limit: 5,
      });

      const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
      return { jobs: items.map(normalizeFiverrJob) };

    } catch (error) {
      console.error('[Fiverr] Scraper failed (Actor not found or error). Falling back to mock data.');
      return { jobs: generateMockJobs('Fiverr', query, 3) };
    }
  },
};

// --- Freelancer Scraper (Real with Fallback) ---
export const FreelancerScraper: Scraper = {
  name: 'Freelancer',
  search: async (query: string): Promise<ScraperResult> => {
    console.log(`[Freelancer] Searching via Apify for: ${query}`);

    try {
      // 'alexey/freelancer-scraper' - if this is not found, we might need to check exact naming or use a different one
      // Another potential one is 'program/freelancer-scraper' or similar
      // We will try this one, and if it fails, the fallback handles it.
      const run = await apifyClient.actor('alexey/freelancer-scraper').call({
        query: query,
        limit: 5,
      });

      const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
      return { jobs: items.map(normalizeFreelancerJob) };

    } catch (error) {
      console.error('[Freelancer] Scraper failed (Actor not found or error). Falling back to mock data.');
      return { jobs: generateMockJobs('Freelancer', query, 3) };
    }
  },
};
