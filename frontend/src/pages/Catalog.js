import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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

function Catalog() {
  const [transmogs, setTransmogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const navigate = useNavigate();

  // Завантаження улюблених з localStorage
  useEffect(() => {
    const savedFavorites = JSON.parse(localStorage.getItem('favoriteTransmogs') || '[]');
    setFavorites(savedFavorites);
  }, []);

  const fetchTransmogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = `${API_URL}?page=${currentPage}&limit=20`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Фільтрація на клієнті
      let filteredTransmogs = data.transmogs || [];
      if (filter !== 'all') {
        filteredTransmogs = filteredTransmogs.filter(t => 
          t.class?.toLowerCase() === filter.toLowerCase()
        );
      }
      
      setTransmogs(filteredTransmogs);
      setTotalPages(data.pagination?.totalPages || 0);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching transmogs:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [currentPage, filter]);

  useEffect(() => {
    fetchTransmogs();
  }, [fetchTransmogs]);

  // Debounce для пошуку
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Фільтрація по пошуковому запиту
      if (searchQuery) {
        setCurrentPage(0);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Фільтрація пошуку
  const filteredTransmogs = useMemo(() => {
    if (!searchQuery) return transmogs;
    
    const query = searchQuery.toLowerCase();
    return transmogs.filter(transmog =>
      transmog.name?.toLowerCase().includes(query) ||
      transmog.class?.toLowerCase().includes(query) ||
      transmog.expansion?.toLowerCase().includes(query)
    );
  }, [transmogs, searchQuery]);

  const handleFilterChange = useCallback((newFilter) => {
    setFilter(newFilter);
    setCurrentPage(0);
  }, []);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const handleTransmogClick = useCallback((id) => {
    navigate(`/transmog/${id}`);
  }, [navigate]);

  const toggleFavorite = useCallback((transmogId) => {
    const newFavorites = favorites.includes(transmogId)
      ? favorites.filter(favId => favId !== transmogId)
      : [...favorites, transmogId];
    
    setFavorites(newFavorites);
    localStorage.setItem('favoriteTransmogs', JSON.stringify(newFavorites));
  }, [favorites]);

  if (loading) {
    return (
      <div className="catalog-loading">
        <div className="loading-spinner"></div>
        <p>Loading transmogs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="catalog-error">
        <p>Error loading transmogs: {error}</p>
        <button onClick={fetchTransmogs}>Retry</button>
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
                  backgroundImage: transmog.iconUrl 
                    ? `url(${transmog.iconUrl})` 
                    : 'none',
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