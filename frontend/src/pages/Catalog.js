import React, { useState, useEffect, useCallback } from 'react';
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

function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();

  // State initialization from URL
  const [filter, setFilter] = useState(searchParams.get('class') || 'all');
  const [expansionFilter, setExpansionFilter] = useState(searchParams.get('expansion') || 'all');
  const [qualityFilter, setQualityFilter] = useState(searchParams.get('quality') || 'all');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '0', 10));

  const [favorites, setFavorites] = useState([]);
  const { showToast } = useToast();

  // Load favorites
  useEffect(() => {
    const savedFavorites = JSON.parse(localStorage.getItem('favoriteTransmogs') || '[]');
    setFavorites(savedFavorites);
  }, []);

  // Fetch filters options
  const { data: filterOptions } = useQuery({
    queryKey: ['transmogFilters'],
    queryFn: fetchFiltersRequest,
    staleTime: 5 * 60 * 1000
  });

  // Fetch transmogs
  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ['transmogs', currentPage, filter, expansionFilter, qualityFilter, searchQuery],
    queryFn: () => fetchTransmogsRequest({
      page: currentPage,
      filter,
      expansion: expansionFilter,
      quality: qualityFilter,
      search: searchQuery
    }),
    keepPreviousData: true,
    staleTime: 30000
  });

  // Update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('class', filter);
    if (expansionFilter !== 'all') params.set('expansion', expansionFilter);
    if (qualityFilter !== 'all') params.set('quality', qualityFilter);
    if (searchQuery) params.set('search', searchQuery);
    if (currentPage > 0) params.set('page', currentPage.toString());

    setSearchParams(params, { replace: true });
  }, [filter, expansionFilter, qualityFilter, searchQuery, currentPage, setSearchParams]);

  // Debounced search handler
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(0);
  };

  const handleFilterChange = (type, value) => {
    setCurrentPage(0);
    if (type === 'class') setFilter(value);
    if (type === 'expansion') setExpansionFilter(value);
    if (type === 'quality') setQualityFilter(value);
  };

  const toggleFavorite = useCallback((transmogId) => {
    const already = favorites.includes(transmogId);
    const newFavorites = already
      ? favorites.filter(favId => favId !== transmogId)
      : [...favorites, transmogId];
    setFavorites(newFavorites);
    localStorage.setItem('favoriteTransmogs', JSON.stringify(newFavorites));
    showToast(already ? 'Removed from favorites' : 'Added to favorites', { type: already ? 'info' : 'success' });
  }, [favorites, showToast]);

  const transmogs = data?.transmogs || [];
  const totalPages = data?.pagination?.totalPages || 0;
  const totalItems = data?.pagination?.totalItems || 0;

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
          {/* Class Filter */}
          <div className="filter-group">
            <span className="filter-label">Class:</span>
            <select
              value={filter}
              onChange={(e) => handleFilterChange('class', e.target.value)}
              className="filter-select"
            >
              <option value="all">All Classes</option>
              {filterOptions?.classes?.map(cls => (
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
              {filterOptions?.expansions?.map(exp => (
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
              {filterOptions?.qualities?.map(q => (
                <option key={q} value={q}>{q}</option>
              ))}
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
              <TransmogCard
                key={transmog.id}
                transmog={transmog}
                isFavorite={favorites.includes(transmog.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>

          <div className="pagination">
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              ← Previous
            </button>
            <span>
              Page {currentPage + 1} of {totalPages || 1}
              <span className="results-count"> ({totalItems} items)</span>
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
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

export default Catalog;