import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '../components/ToastProvider';
import '../styles/Catalog.css';

const API_URL = '/api/transmogs';

const WARCRAFT_CLASSES = [
  { value: 'all', label: 'All' },
  { value: 'warrior', label: 'Warrior' },
  { value: 'paladin', label: 'Paladin' },
  { value: 'hunter', label: 'Hunter' },
  { value: 'rogue', label: 'Rogue' },
  { value: 'priest', label: 'Priest' },
  { value: 'deathknight', label: 'Death Knight' },
  { value: 'shaman', label: 'Shaman' },
  { value: 'mage', label: 'Mage' },
  { value: 'warlock', label: 'Warlock' },
  { value: 'monk', label: 'Monk' },
  { value: 'druid', label: 'Druid' },
  { value: 'demonhunter', label: 'Demon Hunter' },
  { value: 'evoker', label: 'Evoker' }
];

async function fetchTransmogsRequest(page) {
  const url = `${API_URL}?page=${page}&limit=20`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function Catalog() {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    const savedFavorites = JSON.parse(localStorage.getItem('favoriteTransmogs') || '[]');
    setFavorites(savedFavorites);
  }, []);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['transmogs', currentPage],
    queryFn: () => fetchTransmogsRequest(currentPage),
    staleTime: 60_000,
    keepPreviousData: true
  });

  useEffect(() => {
    if (error) {
      showToast('Failed to load catalog. Please retry.', { type: 'error', duration: 3000 });
    }
  }, [error, showToast]);

  // Debounce для пошуку
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) setCurrentPage(0);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const transmogsRaw = data?.transmogs || [];
  const totalPages = data?.pagination?.totalPages || 0;

  const filteredTransmogs = useMemo(() => {
    let arr = transmogsRaw;
    if (filter !== 'all') {
      arr = arr.filter(t => t.class?.toLowerCase() === filter.toLowerCase());
    }
    if (!searchQuery) return arr;
    const q = searchQuery.toLowerCase();
    return arr.filter(transmog =>
      transmog.name?.toLowerCase().includes(q) ||
      transmog.class?.toLowerCase().includes(q) ||
      transmog.expansion?.toLowerCase().includes(q)
    );
  }, [transmogsRaw, filter, searchQuery]);

  const handleFilterChange = useCallback((newFilter) => {
    setFilter(newFilter);
    setCurrentPage(0);
  }, []);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages - 1) setCurrentPage(prev => prev + 1);
  }, [currentPage, totalPages]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 0) setCurrentPage(prev => prev - 1);
  }, [currentPage]);

  const handleTransmogClick = useCallback((id) => {
    navigate(`/transmog/${id}`);
  }, [navigate]);

  const toggleFavorite = useCallback((transmogId) => {
    const already = favorites.includes(transmogId);
    const newFavorites = already
      ? favorites.filter(favId => favId !== transmogId)
      : [...favorites, transmogId];
    setFavorites(newFavorites);
    localStorage.setItem('favoriteTransmogs', JSON.stringify(newFavorites));
    showToast(already ? 'Removed from favorites' : 'Added to favorites', { type: already ? 'info' : 'success' });
  }, [favorites, showToast]);

  if (isLoading || isFetching) {
    return (
      <div className="catalog-page">
        <div className="catalog-header">
          <h1>Transmog Catalog</h1>
          <div className="search-container">
            <input type="text" className="search-input" placeholder="Search transmogs..." disabled />
          </div>
        </div>
        <div className="catalog-skeleton-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-shimmer" />
              <div className="skeleton-footer">
                <div className="skeleton-title" />
                <div className="skeleton-badge" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

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
      <div className="catalog-header">
        <h1>Transmog Catalog</h1>
        
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search transmogs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="catalog-filters">
          {WARCRAFT_CLASSES.map((cls) => (
            <button
              key={cls.value}
              className={filter === cls.value ? 'active' : ''}
              onClick={() => handleFilterChange(cls.value)}
            >
              {cls.label}
            </button>
          ))}
        </div>
      </div>

      {filteredTransmogs.length === 0 ? (
        <div className="no-results">
          <p>No transmogs found{searchQuery && ` matching "${searchQuery}"`}</p>
        </div>
      ) : (
        <>
          <div className="catalog-grid">
            {filteredTransmogs.map((transmog) => (
              <div
                key={transmog.id}
                className="catalog-item"
                style={{ 
                  backgroundImage: transmog.iconUrl ? `url(${transmog.iconUrl})` : 'none',
                  backgroundColor: !transmog.iconUrl ? 'rgba(40, 30, 20, 0.8)' : 'transparent'
                }}
              >
                <div 
                  className="catalog-item-content"
                  onClick={() => handleTransmogClick(transmog.id)}
                >
                  <div className="catalog-item-info">
                    <h3>{transmog.name}</h3>
                    <span className={`class-badge ${transmog.class?.toLowerCase().replace(' ', '')}`}>
                      {transmog.class}
                    </span>
                  </div>
                </div>
                
                <button
                  className={`favorite-button ${favorites.includes(transmog.id) ? 'favorited' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(transmog.id);
                  }}
                  title={favorites.includes(transmog.id) ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {favorites.includes(transmog.id) ? '❤️' : '🤍'}
                </button>
              </div>
            ))}
          </div>

          <div className="pagination">
            <button 
              onClick={handlePrevPage} 
              disabled={currentPage === 0}
            >
              ← Previous
            </button>
            <span>Page {currentPage + 1} of {totalPages}</span>
            <button 
              onClick={handleNextPage} 
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