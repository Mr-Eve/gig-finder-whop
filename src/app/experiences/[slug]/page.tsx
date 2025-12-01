'use client';

import { useState, useMemo } from 'react';

interface Gig {
  id: string;
  title: string;
  description: string;
  budget: string;
  platform: string;
  link: string;
  posted_at: string;
}

type SortOption = 'date' | 'budget' | 'title';

export default function ExperiencePage({ params }: { params: { slug: string } }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('date');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [noMoreResults, setNoMoreResults] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGigs([]); 
    setPage(1);
    setHasMore(true);
    setNoMoreResults(false);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&page=1`);
      if (!res.ok) throw new Error('Search request failed');
      
      const data = await res.json();
      const initialGigs = data.gigs || [];
      setGigs(initialGigs);
      
      if (initialGigs.length < 50) {
          setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to fetch gigs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&page=${nextPage}`);
      
      if (!res.ok) {
          console.error(`Load more failed with status: ${res.status}`);
          setLoadingMore(false);
          return;
      }

      const data = await res.json();
      const newGigs = data.gigs || [];
      
      if (newGigs.length === 0) {
          setHasMore(false);
          setNoMoreResults(true);
      } else {
          setGigs(prev => {
              const existingIds = new Set(prev.map(g => g.id));
              const uniqueNew = newGigs.filter((g: Gig) => !existingIds.has(g.id));
              return [...prev, ...uniqueNew];
          });
          setPage(nextPage);
          if (newGigs.length < 50) {
              setHasMore(false);
              setNoMoreResults(true);
          }
      }
      
    } catch (error) {
      console.error('Failed to load more gigs:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const sortedGigs = useMemo(() => {
    const items = [...gigs];
    switch (sortOption) {
      case 'date':
        return items.sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime());
      case 'title':
        return items.sort((a, b) => a.title.localeCompare(b.title));
      case 'budget':
        const extractBudget = (s: string) => {
            const match = s.match(/\d+/);
            return match ? parseInt(match[0]) : 0;
        };
        return items.sort((a, b) => extractBudget(b.budget) - extractBudget(a.budget));
      default:
        return items;
    }
  }, [gigs, sortOption]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="gig-page-container">
      <div className="gig-content-wrapper">
        <header className="gig-header">
          <h1 className="gig-title">
            Find Your Next Gig
          </h1>
          <p className="gig-subtitle">
            Search for opportunities that match your skills across multiple platforms.
          </p>
        </header>

        <form onSubmit={handleSearch} className="search-form">
          <div className="search-container">
            <div className="search-icon-wrapper">
              <svg className="search-icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
              </svg>
            </div>
            <input
              type="search"
              className="search-input"
              placeholder="Search for gigs (e.g., 'web design', 'writing')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="search-button"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {gigs.length > 0 && (
            <div className="sort-controls">
                <label className="sort-label">Sort by:</label>
                <select 
                    className="sort-select"
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                >
                    <option value="date">Newest</option>
                    <option value="budget">Budget (High to Low)</option>
                    <option value="title">Title (A-Z)</option>
                </select>
            </div>
        )}

        <div className="gigs-grid">
          {sortedGigs.length > 0 ? (
            sortedGigs.map((gig) => (
              <div key={gig.id} className="gig-card">
                <div>
                    <div className="gig-platform-badge-wrapper">
                        <span className={`
                            gig-platform-badge
                            ${gig.platform === 'Freelancer' ? 'badge-freelancer' : ''}
                            ${gig.platform === 'Upwork' ? 'badge-upwork' : ''}
                            ${gig.platform === 'RemoteOK' ? 'badge-remoteok' : ''}
                            ${gig.platform === 'WeWorkRemotely' ? 'badge-wwr' : 'badge-default'}
                        `}>
                        {gig.platform || 'Unknown'}
                        </span>
                    </div>

                    <div className="gig-card-header">
                        <h5 className="gig-card-title">
                            <a href={gig.link} target="_blank" rel="noopener noreferrer">
                                {gig.title}
                            </a>
                        </h5>
                        <span className="gig-budget">
                            {gig.budget}
                        </span>
                    </div>
                    
                    <div className="gig-meta">
                        <svg className="gig-meta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span>Posted {formatTimeAgo(gig.posted_at)}</span>
                    </div>

                    <p className="gig-description">
                    {gig.description}
                    </p>
                </div>
                
                <a 
                    href={gig.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="gig-view-link"
                >
                    View Gig
                    <svg style={{ width: '1rem', height: '1rem', marginLeft: '0.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                </a>
              </div>
            ))
          ) : null}
        </div>

        {/* Load More Button */}
        {hasMore && gigs.length > 0 && (
            <div className="load-more-container">
                <button 
                    onClick={handleLoadMore} 
                    className="load-more-button"
                    disabled={loadingMore}
                >
                    {loadingMore ? 'Loading...' : 'Load More Gigs'}
                </button>
            </div>
        )}

        {/* End of List Message */}
        {noMoreResults && gigs.length > 0 && (
            <div className="empty-state">
                <p>No more gigs available for this search.</p>
            </div>
        )}

        {!loading && searchQuery && gigs.length === 0 && (
            <div className="error-state">
                <p>
                No gigs found for "{searchQuery}". Try a different term.
                </p>
            </div>
        )}
        {!loading && !searchQuery && gigs.length === 0 && (
            <div className="empty-state">
            <p>Start by typing a keyword above.</p>
            </div>
        )}

        {loading && (
            <div className="empty-state">
                <p>Searching...</p>
            </div>
        )}

      </div>
    </div>
  );
}
