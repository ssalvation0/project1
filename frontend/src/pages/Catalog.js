import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '../components/ToastProvider';
import RecentlyViewed from '../components/RecentlyViewed';
import TransmogCard from '../components/TransmogCard';
import '../styles/Catalog.css';

const API_URL = '/api/transmogs';

async function fetchTransmogsRequest({ page, filter, expansion, quality, search }) {
  const params = new URLSearchParams({
    page,
    limit: 20,
    class: filter,
    expansion,
    quality,
    search
  });

  const res = await fetch(`${API_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchFiltersRequest() {
  const res = await fetch(`${API_URL}/filters`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Debounce hook for search
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Memoized TransmogCard wrapper
const MemoizedTransmogCard = React.memo(TransmogCard);

// Expansion order for sorting
const EXPANSION_ORDER = [
  'Classic', 'Burning Crusade', 'Wrath of the Lich King', 'Cataclysm',
  'Mists of Pandaria', 'Warlords of Draenor', 'Legion', 'Battle for Azeroth',
  'Shadowlands', 'Dragonflight', 'The War Within'
];

function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();

  // State initialization from URL
  const [filter, setFilter] = useState(searchParams.get('class') || 'all');
  const [expansionFilter, setExpansionFilter] = useState(searchParams.get('expansion') || 'all');
  const [qualityFilter, setQualityFilter] = useState(searchParams.get('quality') || 'all');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '0', 10));
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(searchParams.get('favorites') === 'true');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'name-asc');

  // Debounce search query - wait 300ms after user stops typing
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [favorites, setFavorites] = useState(() => {
    // Initialize from localStorage once
    try {
      return JSON.parse(localStorage.getItem('favoriteTransmogs') || '[]');
    } catch {
      return [];
    }
  });

  const { showToast } = useToast();

  // Fetch filters options
  const { data: filterOptions } = useQuery({
    queryKey: ['transmogFilters'],
    queryFn: fetchFiltersRequest,
    staleTime: 5 * 60 * 1000
  });

  // Fetch transmogs - uses debounced search
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['transmogs', currentPage, filter, expansionFilter, qualityFilter, debouncedSearch],
    queryFn: () => fetchTransmogsRequest({
      page: currentPage,
      filter,
      expansion: expansionFilter,
      quality: qualityFilter,
      search: debouncedSearch
    }),
    keepPreviousData: true,
    staleTime: 30000
  });

  // Update URL when state changes (use debounced search for URL too)
  useEffect(() => {
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('class', filter);
    if (expansionFilter !== 'all') params.set('expansion', expansionFilter);
    if (qualityFilter !== 'all') params.set('quality', qualityFilter);
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (currentPage > 0) params.set('page', currentPage.toString());
    if (showFavoritesOnly) params.set('favorites', 'true');
    if (sortBy !== 'name-asc') params.set('sort', sortBy);

    setSearchParams(params, { replace: true });
  }, [filter, expansionFilter, qualityFilter, debouncedSearch, currentPage, showFavoritesOnly, sortBy, setSearchParams]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearch]);

  // Stable search handler
  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleFilterChange = useCallback((type, value) => {
    setCurrentPage(0);
    if (type === 'class') setFilter(value);
    if (type === 'expansion') setExpansionFilter(value);
    if (type === 'quality') setQualityFilter(value);
    if (type === 'sort') setSortBy(value);
  }, []);

  // Toggle favorites filter
  const toggleFavoritesOnly = useCallback(() => {
    setShowFavoritesOnly(prev => !prev);
    setCurrentPage(0);
  }, []);

  // Stable favorite toggle with optimistic update
  const toggleFavorite = useCallback((transmogId) => {
    // Check current state before updating
    const already = favorites.includes(transmogId);

    setFavorites(prevFavorites => {
      const newFavorites = already
        ? prevFavorites.filter(favId => favId !== transmogId)
        : [...prevFavorites, transmogId];

      localStorage.setItem('favoriteTransmogs', JSON.stringify(newFavorites));
      return newFavorites;
    });

    // Show toast outside of state updater to avoid double-firing in StrictMode
    showToast(already ? 'Removed from favorites' : 'Added to favorites', {
      type: already ? 'info' : 'success'
    });
  }, [favorites, showToast]);

  // Memoize favorites Set for O(1) lookup
  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);

  // Filter and sort transmogs
  const processedTransmogs = useMemo(() => {
    let result = data?.transmogs || [];

    // Filter by favorites if enabled
    if (showFavoritesOnly) {
      result = result.filter(t => favoritesSet.has(t.id));
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'expansion-asc':
          return EXPANSION_ORDER.indexOf(a.expansion) - EXPANSION_ORDER.indexOf(b.expansion);
        case 'expansion-desc':
          return EXPANSION_ORDER.indexOf(b.expansion) - EXPANSION_ORDER.indexOf(a.expansion);
        case 'id-asc':
          return a.id - b.id;
        case 'id-desc':
          return b.id - a.id;
        default:
          return 0;
      }
    });

    return result;
  }, [data?.transmogs, showFavoritesOnly, favoritesSet, sortBy]);

  const transmogs = processedTransmogs;
  const totalPages = data?.pagination?.totalPages || 0;
  const totalItems = showFavoritesOnly ? processedTransmogs.length : (data?.pagination?.totalItems || 0);

  // Memoize pagination handlers
  const goToPrevPage = useCallback(() => {
    setCurrentPage(p => Math.max(0, p - 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setCurrentPage(p => Math.min(totalPages - 1, p + 1));
  }, [totalPages]);

  if (error) {
    return (
      <div className="catalog-error">
        <p>Error loading transmogs: {error.message}</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="catalog-page">
      <RecentlyViewed limit={5} />

      <div className="catalog-header">
        <h1>Transmog Catalog</h1>

        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search transmogs..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        <div className="catalog-filters">
          {/* Favorites Toggle */}
          <button
            className={`favorites-toggle ${showFavoritesOnly ? 'active' : ''}`}
            onClick={toggleFavoritesOnly}
            title={showFavoritesOnly ? 'Show all transmogs' : 'Show favorites only'}
          >
            <svg className="heart-icon-svg" viewBox="0 0 24 24" fill={showFavoritesOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span>{showFavoritesOnly ? 'Favorites' : 'All'}</span>
          </button>

          {/* Class Filter */}
          <div className="filter-group">
            <span className="filter-label">Class:</span>
            <select
              value={filter}
              onChange={(e) => handleFilterChange('class', e.target.value)}
              className="filter-select"
            >
              <option value="all">All Classes</option>
              {filterOptions?.classes?.filter(cls => cls !== 'All').map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          {/* Expansion Filter */}
          <div className="filter-group">
            <span className="filter-label">Expansion:</span>
            <select
              value={expansionFilter}
              onChange={(e) => handleFilterChange('expansion', e.target.value)}
              className="filter-select"
            >
              <option value="all">All Expansions</option>
              {filterOptions?.expansions?.filter(exp => exp !== 'All').map(exp => (
                <option key={exp} value={exp}>{exp}</option>
              ))}
            </select>
          </div>

          {/* Quality Filter */}
          <div className="filter-group">
            <span className="filter-label">Quality:</span>
            <select
              value={qualityFilter}
              onChange={(e) => handleFilterChange('quality', e.target.value)}
              className="filter-select"
            >
              <option value="all">All Qualities</option>
              {filterOptions?.qualities?.filter(q => q !== 'All').map(q => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="filter-group">
            <span className="filter-label">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="filter-select"
            >
              <option value="name-asc">Name (A → Z)</option>
              <option value="name-desc">Name (Z → A)</option>
              <option value="expansion-asc">Expansion (Old → New)</option>
              <option value="expansion-desc">Expansion (New → Old)</option>
              <option value="id-asc">ID (Low → High)</option>
              <option value="id-desc">ID (High → Low)</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="catalog-skeleton-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-shimmer" />
            </div>
          ))}
        </div>
      ) : transmogs.length === 0 ? (
        <div className="no-results">
          <p>No transmogs found matching your criteria</p>
        </div>
      ) : (
        <>
          <div className="catalog-grid">
            {transmogs.map((transmog) => (
              <MemoizedTransmogCard
                key={transmog.id}
                transmog={transmog}
                isFavorite={favoritesSet.has(transmog.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>

          <div className="pagination">
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 0}
            >
              ← Previous
            </button>
            <span>
              Page {currentPage + 1} of {totalPages || 1}
              <span className="results-count"> ({totalItems} items)</span>
            </span>
            <button
              onClick={goToNextPage}
              disabled={currentPage >= totalPages - 1}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default React.memo(Catalog);