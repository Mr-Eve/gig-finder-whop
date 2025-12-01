'use client';

import { useState } from 'react';

export default function ExperiencePage({ params }: { params: { slug: string } }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [gigs, setGigs] = useState<{ id: string; title: string; description: string; price: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setGigs(data.gigs || []);
    } catch (error) {
      console.error('Failed to fetch gigs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
            Find Your Next Gig
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Search for opportunities that match your skills.
          </p>
        </header>

        <form onSubmit={handleSearch} className="mb-10">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
              </svg>
            </div>
            <input
              type="search"
              className="block w-full p-4 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 shadow-sm"
              placeholder="Search for gigs (e.g., 'web design', 'writing')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="text-white absolute right-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        <div className="space-y-4">
          {gigs.length > 0 ? (
            gigs.map((gig) => (
              <div key={gig.id} className="p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {gig.title}
                  </h5>
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">
                    {gig.price}
                  </span>
                </div>
                <p className="font-normal text-gray-700 dark:text-gray-400">
                  {gig.description}
                </p>
              </div>
            ))
          ) : (
            !loading && searchQuery && (
              <p className="text-center text-gray-500 dark:text-gray-400 mt-8">
                No gigs found for "{searchQuery}". Try a different term.
              </p>
            )
          )}
          {!loading && !searchQuery && gigs.length === 0 && (
             <div className="text-center py-10">
               <p className="text-gray-500 dark:text-gray-400">Start by typing a keyword above.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
