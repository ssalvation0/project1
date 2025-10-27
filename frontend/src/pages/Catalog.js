import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Catalog.css';

const API_URL = 'http://localhost:5001/api/transmogs'; // Змінити на 5001

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
    try {
      setLoading(true);
      setError(null);
      
      const url = `${API_URL}?page=${currentPage}&limit=20`;
      console.log('Fetching:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received data:', data);
      
      // Фільтрація на клієнті якщо потрібно
      let filteredTransmogs = data.transmogs || [];
      if (filter !== 'all') {
        filteredTransmogs = filteredTransmogs.filter(t => 
          t.class.toLowerCase() === filter.toLowerCase()
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
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(0);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleTransmogClick = (id) => {
    navigate(`/transmog/${id}`);
  };

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
          <button 
            className={filter === 'all' ? 'active' : ''} 
            onClick={() => handleFilterChange('all')}
          >
            All
          </button>
          <button 
            className={filter === 'warrior' ? 'active' : ''} 
            onClick={() => handleFilterChange('warrior')}
          >
            Warrior
          </button>
          <button 
            className={filter === 'paladin' ? 'active' : ''} 
            onClick={() => handleFilterChange('paladin')}
          >
            Paladin
          </button>
          <button 
            className={filter === 'hunter' ? 'active' : ''} 
            onClick={() => handleFilterChange('hunter')}
          >
            Hunter
          </button>
          <button 
            className={filter === 'rogue' ? 'active' : ''} 
            onClick={() => handleFilterChange('rogue')}
          >
            Rogue
          </button>
          <button 
            className={filter === 'priest' ? 'active' : ''} 
            onClick={() => handleFilterChange('priest')}
          >
            Priest
          </button>
          <button 
            className={filter === 'deathknight' ? 'active' : ''} 
            onClick={() => handleFilterChange('deathknight')}
          >
            Death Knight
          </button>
          <button 
            className={filter === 'shaman' ? 'active' : ''} 
            onClick={() => handleFilterChange('shaman')}
          >
            Shaman
          </button>
          <button 
            className={filter === 'mage' ? 'active' : ''} 
            onClick={() => handleFilterChange('mage')}
          >
            Mage
          </button>
          <button 
            className={filter === 'warlock' ? 'active' : ''} 
            onClick={() => handleFilterChange('warlock')}
          >
            Warlock
          </button>
          <button 
            className={filter === 'monk' ? 'active' : ''} 
            onClick={() => handleFilterChange('monk')}
          >
            Monk
          </button>
          <button 
            className={filter === 'druid' ? 'active' : ''} 
            onClick={() => handleFilterChange('druid')}
          >
            Druid
          </button>
          <button 
            className={filter === 'demonhunter' ? 'active' : ''} 
            onClick={() => handleFilterChange('demonhunter')}
          >
            Demon Hunter
          </button>
          <button 
            className={filter === 'evoker' ? 'active' : ''} 
            onClick={() => handleFilterChange('evoker')}
          >
            Evoker
          </button>
        </div>
      </div>

      {transmogs.length === 0 ? (
        <div className="no-results">
          <p>No transmogs found</p>
        </div>
      ) : (
        <>
          <div className="catalog-grid">
            {transmogs.map((transmog) => (
              <div
                key={transmog.id}
                className="catalog-item"
                onClick={() => handleTransmogClick(transmog.id)}
                style={{ 
                  backgroundImage: transmog.iconUrl 
                    ? `url(${transmog.iconUrl})` 
                    : 'none',
                  backgroundColor: !transmog.iconUrl ? 'rgba(40, 30, 20, 0.8)' : 'transparent'
                }}
              >
                <div className="catalog-item-info">
                  <h3>{transmog.name}</h3>
                  <span className={`class-badge ${transmog.class?.toLowerCase().replace(' ', '')}`}>
                    {transmog.class}
                  </span>
                </div>
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