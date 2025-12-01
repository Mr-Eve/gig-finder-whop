import { NextResponse } from "next/server";

// Mock data for gigs
const MOCK_GIGS = [
  { id: '1', title: 'Logo Design', description: 'Create a modern minimalist logo for a tech startup.', price: '$200', tags: ['design', 'graphic', 'logo'] },
  { id: '2', title: 'React Frontend Developer', description: 'Build a responsive landing page using React and Tailwind CSS.', price: '$500', tags: ['development', 'react', 'web', 'frontend'] },
  { id: '3', title: 'Content Writer', description: 'Write 5 SEO-optimized blog posts about digital marketing.', price: '$150', tags: ['writing', 'content', 'marketing'] },
  { id: '4', title: 'Video Editor', description: 'Edit a 10-minute YouTube tutorial video with captions.', price: '$300', tags: ['video', 'editing', 'youtube'] },
  { id: '5', title: 'Social Media Manager', description: 'Manage Instagram and Twitter accounts for 1 month.', price: '$400', tags: ['social media', 'marketing', 'management'] },
  { id: '6', title: 'Python Scripting', description: 'Write a script to scrape data from a real estate website.', price: '$250', tags: ['development', 'python', 'scripting'] },
  { id: '7', title: 'Virtual Assistant', description: 'Help with email management and scheduling for a CEO.', price: '$20/hr', tags: ['admin', 'assistant', 'virtual'] },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase() || '';

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (!query) {
    return NextResponse.json({ gigs: [] });
  }

  const filteredGigs = MOCK_GIGS.filter((gig) => 
    gig.title.toLowerCase().includes(query) || 
    gig.description.toLowerCase().includes(query) ||
    gig.tags.some(tag => tag.toLowerCase().includes(query))
  );

  return NextResponse.json({ gigs: filteredGigs });
}

