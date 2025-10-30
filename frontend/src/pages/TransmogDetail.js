import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/TransmogDetail.css';

const API_URL = '/api/transmogs';

function TransmogDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transmog, setTransmog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);

  // Завантаження улюблених з localStorage
  useEffect(() => {
    const favorites = JSON.parse(localStorage.getItem('favoriteTransmogs') || '[]');
    setIsFavorite(favorites.includes(parseInt(id)));
  }, [id]);

  // Завантаження деталей transmog
  useEffect(() => {
    const fetchTransmogDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`${API_URL}/${id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setTransmog(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching transmog details:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    if (id) {
      fetchTransmogDetails();
    }
  }, [id]);

  // Додавання/видалення з улюблених
  const toggleFavorite = useCallback(() => {
    const favorites = JSON.parse(localStorage.getItem('favoriteTransmogs') || '[]');
    const transmogId = parseInt(id);
    
    if (isFavorite) {
      const newFavorites = favorites.filter(favId => favId !== transmogId);
      localStorage.setItem('favoriteTransmogs', JSON.stringify(newFavorites));
    } else {
      const newFavorites = [...favorites, transmogId];
      localStorage.setItem('favoriteTransmogs', JSON.stringify(newFavorites));
    }
    
    setIsFavorite(!isFavorite);
  }, [id, isFavorite]);

  if (loading) {
    return (
      <div className="transmog-detail-loading">
        <div className="loading-spinner"></div>
        <p>Loading transmog details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="transmog-detail-error">
        <p>Error loading transmog: {error}</p>
        <button onClick={() => navigate('/catalog')}>Back to Catalog</button>
      </div>
    );
  }

  if (!transmog) {
    return (
      <div className="transmog-detail-error">
        <p>Transmog not found</p>
        <button onClick={() => navigate('/catalog')}>Back to Catalog</button>
      </div>
    );
  }

  return (
    <div className="transmog-detail-page">
      <div className="transmog-detail-header">
        <button 
          className="back-button"
          onClick={() => navigate('/catalog')}
        >
          ← Back to Catalog
        </button>
        
        <div className="transmog-detail-actions">
          <button 
            className={`favorite-button ${isFavorite ? 'favorited' : ''}`}
            onClick={toggleFavorite}
          >
            {isFavorite ? '❤️' : '🤍'} 
            {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
          </button>
        </div>
      </div>

      <div className="transmog-detail-content">
        <div className="transmog-detail-main">
          <div className="transmog-detail-image">
            {transmog.iconUrl ? (
              <img 
                src={transmog.iconUrl} 
                alt={transmog.name}
                className="transmog-icon"
              />
            ) : (
              <div className="transmog-icon-placeholder">
                <span>No Image</span>
              </div>
            )}
          </div>

          <div className="transmog-detail-info">
            <h1 className="transmog-detail-title">{transmog.name}</h1>
            
            <div className="transmog-detail-meta">
              <div className="meta-item">
                <span className="meta-label">Class:</span>
                <span className={`class-badge ${transmog.class?.toLowerCase().replace(' ', '')}`}>
                  {transmog.class}
                </span>
              </div>
              
              {transmog.expansion && (
                <div className="meta-item">
                  <span className="meta-label">Expansion:</span>
                  <span className="expansion-badge">{transmog.expansion}</span>
                </div>
              )}
              
              <div className="meta-item">
                <span className="meta-label">Set ID:</span>
                <span className="set-id">{transmog.id}</span>
              </div>
            </div>

            {transmog.description && (
              <div className="transmog-detail-description">
                <h3>Description</h3>
                <p>{transmog.description}</p>
              </div>
            )}
          </div>
        </div>

        {transmog.items && transmog.items.length > 0 && (
          <div className="transmog-detail-items">
            <h2>Set Items</h2>
            <div className="items-grid">
              {transmog.items.map((item, index) => (
                <div key={index} className="item-card">
                  <div className="item-icon">
                    {item.iconUrl ? (
                      <img src={item.iconUrl} alt={item.name} />
                    ) : (
                      <div className="item-icon-placeholder">?</div>
                    )}
                  </div>
                  <div className="item-info">
                    <h4>{item.name}</h4>
                    <p>{item.slot}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="transmog-detail-actions-bottom">
          <button 
            className="action-button primary"
            onClick={() => navigate('/catalog')}
          >
            Browse More Sets
          </button>
          
          <button 
            className="action-button secondary"
            onClick={() => navigate('/catalog?class=' + transmog.class?.toLowerCase().replace(' ', ''))}
          >
            View {transmog.class} Sets
          </button>
        </div>
      </div>
    </div>
  );
}

export default TransmogDetail;
