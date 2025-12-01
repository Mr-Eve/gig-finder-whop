import { Job, Scraper, ScraperResult } from './types';
import { ApifyClient } from 'apify-client';

// Initialize Apify Client
// NOTE: This requires APIFY_API_TOKEN to be set in .env.local
const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

// --- Helper to normalize generic Apify results ---
// You may need to adjust the mapping fields based on the specific Actor's output.
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
  description: `Seller: ${item.sellerName} - ${item.rating} stars (${item.ratingCount} reviews)`,
  link: item.url || 'https://www.fiverr.com',
  budget: item.price || 'See Gig',
  posted_at: new Date().toISOString(), // Fiverr gigs don't always have a posted date
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


// --- Upwork Scraper (Real) ---
export const UpworkScraper: Scraper = {
  name: 'Upwork',
  search: async (query: string): Promise<ScraperResult> => {
    console.log(`[Upwork] Searching via Apify for: ${query}`);
    
    try {
      // Using 'trudax/upwork-scraper' (Subject to change if actor is deprecated)
      const run = await apifyClient.actor('trudax/upwork-scraper').call({
        search: query,
        limit: 5, // Limit to save costs/time
      });

      const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
      return { jobs: items.map(normalizeUpworkJob) };

    } catch (error) {
      console.error('[Upwork] Scraper failed:', error);
      // Fallback to mock data if API fails or token is missing
      return { jobs: [] }; 
    }
  },
};

// --- Fiverr Scraper (Real) ---
export const FiverrScraper: Scraper = {
  name: 'Fiverr',
  search: async (query: string): Promise<ScraperResult> => {
    console.log(`[Fiverr] Searching via Apify for: ${query}`);

    try {
      // Using 'trudax/fiverr-scraper'
      const run = await apifyClient.actor('trudax/fiverr-scraper').call({
        search: query,
        limit: 5,
      });

      const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
      return { jobs: items.map(normalizeFiverrJob) };

    } catch (error) {
      console.error('[Fiverr] Scraper failed:', error);
      return { jobs: [] };
    }
  },
};

// --- Freelancer Scraper (Real) ---
export const FreelancerScraper: Scraper = {
  name: 'Freelancer',
  search: async (query: string): Promise<ScraperResult> => {
    console.log(`[Freelancer] Searching via Apify for: ${query}`);

    try {
      // Using 'trudax/freelancer-scraper' or similar
      const run = await apifyClient.actor('trudax/freelancer-scraper').call({
        query: query,
        limit: 5,
      });

      const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
      return { jobs: items.map(normalizeFreelancerJob) };

    } catch (error) {
      console.error('[Freelancer] Scraper failed:', error);
      return { jobs: [] };
    }
  },
};
