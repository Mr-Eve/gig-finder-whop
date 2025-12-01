export interface Job {
  id: string;
  platform: 'Upwork' | 'Fiverr' | 'Freelancer' | 'Other';
  external_id: string;
  title: string;
  description: string;
  link: string;
  budget: string;
  posted_at: string; // ISO string
  tags: string[];
}

export interface ScraperResult {
  jobs: Job[];
  error?: string;
}

export interface Scraper {
  name: string;
  search(query: string): Promise<ScraperResult>;
}

