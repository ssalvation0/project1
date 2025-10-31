import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const urlClass = searchParams.get('class') || 'all';
  const urlSearch = searchParams.get('search') || '';
  
  const [filter, setFilter] = useState(urlClass);
  const [expansionFilter, setExpansionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [sortBy, setSortBy] = useState('name'); // name, expansion, class
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc
  const [currentPage, setCurrentPage] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Синхронізуємо фільтр з URL параметром
  useEffect(() => {
    if (urlClass && urlClass !== filter) {
      setFilter(urlClass);
    }
  }, [urlClass]);

  // Синхронізуємо пошук з URL параметром
  useEffect(() => {
    if (urlSearch && urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
    }
  }, [urlSearch]);

  useEffect(() => {
    const savedFavorites = JSON.parse(localStorage.getItem('favoriteTransmogs') || '[]');
    setFavorites(savedFavorites);
  }, []);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['transmogs', currentPage],
    queryFn: () => fetchTransmogsRequest(currentPage),
    staleTime: 30_000, // Зменшено до 30 секунд для швидшого оновлення
    cacheTime: 5 * 60 * 1000, // Кеш на 5 хвилин
    refetchOnWindowFocus: true, // Оновлювати при поверненні на вкладку
    keepPreviousData: true
  });

  useEffect(() => {
    if (error) {
      showToast('Failed to load catalog. Please retry.', { type: 'error', duration: 3000 });
    }
  }, [error, showToast]);

  // Debounce для пошуку та оновлення URL
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(0);
      const newParams = new URLSearchParams(searchParams);
      if (searchQuery.trim()) {
        newParams.set('search', searchQuery.trim());
      } else {
        newParams.delete('search');
      }
      setSearchParams(newParams, { replace: true });
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchParams, setSearchParams]);

  const transmogsRaw = data?.transmogs || [];
  const totalPages = data?.pagination?.totalPages || 0;

  const filteredTransmogs = useMemo(() => {
    let arr = transmogsRaw;
    
    // Фільтрація за класом
    if (filter !== 'all') {
      arr = arr.filter(t => {
        const transmogClass = (t.class || 'All').toLowerCase().replace(/\s+/g, '');
        const filterClass = filter.toLowerCase();
        
        // Якщо клас трансмогу "All", показуємо його для всіх фільтрів (універсальні сети)
        if (transmogClass === 'all') {
          return true; // Показуємо універсальні сети для всіх класів
        }
        
        return transmogClass === filterClass || transmogClass.includes(filterClass);
      });
    }
    
    // Фільтрація за expansion
    if (expansionFilter !== 'all') {
      arr = arr.filter(t => {
        const expansion = (t.expansion || 'Unknown').toLowerCase();
        return expansion === expansionFilter.toLowerCase() || expansion.includes(expansionFilter.toLowerCase());
      });
    }
    
    // Фільтрація за пошуковим запитом
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      arr = arr.filter(transmog =>
        transmog.name?.toLowerCase().includes(q) ||
        transmog.class?.toLowerCase().includes(q) ||
        transmog.expansion?.toLowerCase().includes(q)
      );
    }
    
    // Сортування
    arr.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'expansion':
          comparison = (a.expansion || 'Unknown').localeCompare(b.expansion || 'Unknown');
          break;
        case 'class':
          comparison = (a.class || 'All').localeCompare(b.class || 'All');
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return arr;
  }, [transmogsRaw, filter, expansionFilter, searchQuery, sortBy, sortOrder]);
  
  // Отримуємо унікальні expansions для фільтра
  const availableExpansions = useMemo(() => {
    const expansions = new Set();
    transmogsRaw.forEach(t => {
      if (t.expansion && t.expansion !== 'Unknown') {
        expansions.add(t.expansion);
      }
    });
    return Array.from(expansions).sort();
  }, [transmogsRaw]);

  const handleFilterChange = useCallback((newFilter) => {
    setFilter(newFilter);
    setCurrentPage(0);
    // Оновлюємо URL без перезавантаження сторінки
    const newParams = new URLSearchParams(searchParams);
    if (newFilter === 'all') {
      newParams.delete('class');
    } else {
      newParams.set('class', newFilter);
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

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
          <div className="filter-group">
            <span className="filter-label">Class:</span>
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
          
          {availableExpansions.length > 0 && (
            <div className="filter-group">
              <span className="filter-label">Expansion:</span>
              <button
                className={expansionFilter === 'all' ? 'active' : ''}
                onClick={() => setExpansionFilter('all')}
              >
                All
              </button>
              {availableExpansions.map((exp) => (
                <button
                  key={exp}
                  className={expansionFilter === exp.toLowerCase() ? 'active' : ''}
                  onClick={() => setExpansionFilter(exp.toLowerCase())}
                >
                  {exp}
                </button>
              ))}
            </div>
          )}
          
          <div className="filter-group">
            <span className="filter-label">Sort:</span>
            <select 
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name">Name</option>
              <option value="expansion">Expansion</option>
              <option value="class">Class</option>
            </select>
            <button
              className={`sort-order-btn ${sortOrder === 'desc' ? 'active' : ''}`}
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
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
              >
                {(() => {
                  // Пріоритет: imageUrl (велике зображення предмета) -> iconUrl -> placeholder
                  const imageUrl = transmog.imageUrl || transmog.iconUrl;
                  
                  // Якщо немає зображення або це placeholder/share-icon, показуємо дефолтне
                  if (!imageUrl || imageUrl.includes('questionmark') || imageUrl.includes('share-icon')) {
                    return (
                      <div className="catalog-item-placeholder">
                        <span className="placeholder-icon">⚔️</span>
                        <span className="placeholder-text">{transmog.name}</span>
                      </div>
                    );
                  }
                  
                  // Спробуємо завантажити зображення
                  return (
                    <img
                      src={imageUrl}
                      alt={transmog.name || 'Transmog set'}
                      className="catalog-bg-img"
                      loading="lazy"
                      decoding="async"
                      fetchpriority="low"
                      sizes="(max-width: 768px) 100vw, 33vw"
                      onError={(e) => {
                        // Якщо зображення не завантажилося, показуємо placeholder
                        e.target.style.display = 'none';
                        if (!e.target.nextElementSibling || !e.target.nextElementSibling.classList.contains('catalog-item-placeholder')) {
                          const placeholder = document.createElement('div');
                          placeholder.className = 'catalog-item-placeholder';
                          placeholder.innerHTML = `
                            <span class="placeholder-icon">⚔️</span>
                            <span class="placeholder-text">${transmog.name}</span>
                          `;
                          e.target.parentElement.appendChild(placeholder);
                        }
                      }}
                    />
                  );
                })()}
                <div 
                  className="catalog-item-content"
                  onClick={() => handleTransmogClick(transmog.id)}
                >
                  <div className="catalog-item-info">
                    <h3>{transmog.name}</h3>
                    <div className="catalog-item-meta">
                      <span className={`class-badge ${transmog.class?.toLowerCase().replace(/\s+/g, '')}`}>
                        {transmog.class}
                      </span>
                      {transmog.expansion && transmog.expansion !== 'Unknown' && (
                        <span className="expansion-badge">{transmog.expansion}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <button
                  className={`favorite-button ${favorites.includes(transmog.id) ? 'favorited' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(transmog.id);
                  }}
                  title={favorites.includes(transmog.id) ? 'Remove from favorites' : 'Add to favorites'}
                  aria-label={favorites.includes(transmog.id) ? 'Remove from favorites' : 'Add to favorites'}
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
            <span>
              Page {currentPage + 1} of {totalPages || 1}
              {filteredTransmogs.length > 0 && (
                <span className="results-count"> ({filteredTransmogs.length} {filteredTransmogs.length === 1 ? 'result' : 'results'})</span>
              )}
            </span>
            <button 
              onClick={handleNextPage} 
              disabled={currentPage >= totalPages - 1 || filteredTransmogs.length === 0}
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