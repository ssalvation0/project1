import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Catalog.css';
import { getTransmogs } from '../services/api';

function Catalog() {
  const [transmogs, setTransmogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTransmogs();
  }, [currentPage, filter]);

  const fetchTransmogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching transmogs from API...');
      const data = await getTransmogs(currentPage, 20, filter, searchQuery);
      
      console.log('✅ Received data:', data);
      setTransmogs(data.sets || []);
      setTotalPages(data.totalPages || 0);
      setLoading(false);
    } catch (err) {
      console.error('❌ Error fetching transmogs:', err);
      setError('Failed to load transmogs. Make sure backend is running on http://localhost:5000');
      setLoading(false);
    }
  };

  // Пошук з debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== '') {
        setCurrentPage(0); // Reset to first page
        fetchTransmogs();
      } else if (searchQuery === '' && transmogs.length === 0) {
        fetchTransmogs();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const clearSearch = () => {
    setSearchQuery('');
    setCurrentPage(0);
  };

  // Отримати preview зображення з API
  const getPreviewImage = (transmog) => {
    // Спробуємо знайти preview appearance
    if (transmog.appearance_set?.preview_appearance?.display_string) {
      return transmog.appearance_set.preview_appearance.display_string;
    }
    
    // Fallback на перший предмет
    if (transmog.appearance_set?.items?.[0]?.media?.assets?.[0]?.value) {
      return transmog.appearance_set.items[0].media.assets[0].value;
    }
    
    return null;
  };

  // Отримати класи для бейджів
  const getClassNames = (transmog) => {
    if (!transmog.appearance_set?.class_restrictions) return [];
    return transmog.appearance_set.class_restrictions.map(c => c.name);
  };

  if (loading) {
    return (
      <div className="catalog-loading">
        <div className="loading-spinner"></div>
        <p>Loading transmogs from Battle.net API...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="catalog-error">
        <p>{error}</p>
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
          {searchQuery && (
            <button className="clear-search" onClick={clearSearch}>
              ✕
            </button>
          )}
          <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </div>

        {/* Фільтр по класах */}
        <div className="catalog-filters">
          <button 
            className={filter === 'all' ? 'active' : ''} 
            onClick={() => setFilter('all')}
          >
            All
          </button>
          {['warrior', 'paladin', 'hunter', 'rogue', 'priest', 'deathknight', 'shaman', 'mage', 'warlock', 'monk', 'druid', 'demonhunter', 'evoker'].map(cls => (
            <button 
              key={cls}
              className={filter === cls ? 'active' : ''} 
              onClick={() => setFilter(cls)}
            >
              {cls === 'deathknight' ? 'Death Knight' : cls === 'demonhunter' ? 'Demon Hunter' : cls.charAt(0).toUpperCase() + cls.slice(1)}
            </button>
          ))}
        </div>

        {/* Результати пошуку */}
        {searchQuery && (
          <div className="search-results-info">
            Found {transmogs.length} result{transmogs.length !== 1 ? 's' : ''} for "{searchQuery}"
          </div>
        )}
      </div>

      {/* Сітка трансмогів */}
      <div className="catalog-grid">
        {transmogs.length > 0 ? (
          transmogs.map(transmog => {
            const previewImage = getPreviewImage(transmog);
            const classes = getClassNames(transmog);
            
            return (
              <div 
                key={transmog.id}
                className="catalog-item"
                onClick={() => navigate(`/transmog/${transmog.id}`)}
                style={{ 
                  backgroundImage: previewImage ? `url(${previewImage})` : 'none',
                  backgroundColor: previewImage ? 'transparent' : '#2a2a2a'
                }}
              >
                <div className="catalog-item-info">
                  <h3>{transmog.name}</h3>
                  <div className="class-badges">
                    {classes.length > 0 ? (
                      classes.map((className, idx) => (
                        <span 
                          key={idx} 
                          className={`class-badge ${className.toLowerCase().replace(/\s+/g, '')}`}
                        >
                          {className}
                        </span>
                      ))
                    ) : (
                      <span className="class-badge">All Classes</span>
                    )}
                  </div>
                  {transmog.appearance_set?.items && (
                    <span className="item-count">
                      {transmog.appearance_set.items.length} items
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-results">
            <p>No transmogs found{searchQuery && ` for "${searchQuery}"`}</p>
            {searchQuery && (
              <button className="clear-search-btn" onClick={clearSearch}>
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Пагінація */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
          >
            ← Previous
          </button>
          <span>Page {currentPage + 1} of {totalPages}</span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage >= totalPages - 1}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

export default Catalog;