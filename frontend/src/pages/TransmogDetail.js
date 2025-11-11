import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '../components/ToastProvider';
import '../styles/TransmogDetail.css';

const API_URL = '/api/transmogs';

async function fetchTransmogById(id) {
  const res = await fetch(`${API_URL}/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function TransmogDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const favorites = JSON.parse(localStorage.getItem('favoriteTransmogs') || '[]');
    setIsFavorite(favorites.includes(parseInt(id)));
  }, [id]);

  const { data: transmog, isLoading, error, refetch } = useQuery({
    queryKey: ['transmog', id],
    queryFn: () => fetchTransmogById(id),
    enabled: Boolean(id)
  });

  useEffect(() => {
    if (error) {
      showToast('Failed to load set details. Please retry.', { type: 'error', duration: 3000 });
    }
  }, [error, showToast]);


  const toggleFavorite = useCallback(() => {
    const favorites = JSON.parse(localStorage.getItem('favoriteTransmogs') || '[]');
    const transmogId = parseInt(id);
    const newIsFavorite = !isFavorite;
    
    // Запускаємо анімацію
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);
    
    // Оновлюємо стан безпечно
    if (newIsFavorite) {
      const newFavorites = [...favorites, transmogId];
      localStorage.setItem('favoriteTransmogs', JSON.stringify(newFavorites));
      showToast('Added to favorites', { type: 'success' });
    } else {
      const newFavorites = favorites.filter(favId => favId !== transmogId);
      localStorage.setItem('favoriteTransmogs', JSON.stringify(newFavorites));
      showToast('Removed from favorites', { type: 'info' });
    }
    setIsFavorite(newIsFavorite);
  }, [id, isFavorite, showToast]);

  if (isLoading) {
    return (
      <div className="transmog-detail-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="transmog-detail-error">
        <p>Error loading transmog: {error.message}</p>
        <button onClick={() => navigate('/catalog')}>Back to Catalog</button>
        <button onClick={() => refetch()}>Retry</button>
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
        
        <button 
          className={`favorite-button ${isFavorite ? 'favorited' : ''} ${isAnimating ? 'animating' : ''}`}
          onClick={toggleFavorite}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <span className="favorite-icon">
            {isFavorite ? (
              <svg viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
                <path d="M10 18L8.55 16.63C3.4 12.15 0 9.15 0 5.4C0 2.37 2.25 0 5 0C6.65 0 8.2 0.8 9 2.1C9.8 0.8 11.35 0 13 0C15.75 0 18 2.37 18 5.4C18 9.15 14.6 12.15 9.45 16.63L10 18Z" fill="currentColor"/>
              </svg>
            ) : (
              <svg viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
                <path d="M10 18L8.55 16.63C3.4 12.15 0 9.15 0 5.4C0 2.37 2.25 0 5 0C6.65 0 8.2 0.8 9 2.1C9.8 0.8 11.35 0 13 0C15.75 0 18 2.37 18 5.4C18 9.15 14.6 12.15 9.45 16.63L10 18Z" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
            )}
          </span>
          <span className="favorite-button-text">
            {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
          </span>
        </button>
      </div>

      <div className="transmog-detail-content">
        <div className="transmog-detail-main">
          <div className="transmog-detail-image">
            {transmog.iconUrl ? (
              <img 
                src={transmog.iconUrl} 
                alt={transmog.name}
                className="transmog-icon"
                loading="lazy"
                decoding="async"
                fetchpriority="low"
                sizes="(max-width: 768px) 90vw, 600px"
              />
            ) : (
              <div className="transmog-icon-placeholder">
                <span>⚔️</span>
              </div>
            )}
          </div>

          <div className="transmog-detail-info">
            <h1 className="transmog-detail-title">{transmog.name}</h1>
            
            <div className="transmog-detail-meta">
              <div className="meta-item">
                <span className="meta-label">Class:</span>
                <span className={`class-badge ${transmog.class?.toLowerCase().replace(' ', '')}`}>
                  {transmog.class === 'All' ? 'All Classes' : transmog.class}
                </span>
              </div>
              
              {transmog.expansion && transmog.expansion !== 'Unknown' && (
                <div className="meta-item">
                  <span className="meta-label">Expansion:</span>
                  <span className="expansion-badge">{transmog.expansion}</span>
                </div>
              )}
              
              {transmog.setId && (
                <div className="meta-item">
                  <span className="meta-label">Set ID:</span>
                  <span className="set-id">{transmog.setId}</span>
                </div>
              )}
            </div>

            {transmog.description && transmog.description !== 'Epic transmog set from World of Warcraft' && (
              <div className="transmog-detail-description">
                <h3>Description</h3>
                <p>{transmog.description}</p>
              </div>
            )}
          </div>
        </div>

        <div className="transmog-detail-items">
          <h2>Set Items</h2>
          {transmog.items && transmog.items.length > 0 ? (
            <div className="items-grid">
              {transmog.items.map((item, index) => (
                <div key={index} className="item-card">
                  <div className="item-icon">
                    {item.iconUrl ? (
                      <img src={item.iconUrl} alt={item.name} loading="lazy" decoding="async" fetchpriority="low" />
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
          ) : (
            <div className="items-empty">
              <div className="empty-icon">🎮</div>
              <p>Set items information is being updated...</p>
              {transmog.setId && (
                <a 
                  href={`https://www.wowhead.com/item-set=${transmog.setId}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="wowhead-link"
                >
                  View on Wowhead →
                </a>
              )}
            </div>
          )}
        </div>

        <div className="transmog-detail-actions-bottom">
          <button 
            className="action-button primary"
            onClick={() => navigate('/catalog')}
          >
            Browse More Sets
          </button>
          
          {transmog.class && transmog.class !== 'All' && (
            <button 
              className="action-button secondary"
              onClick={() => navigate('/catalog?class=' + transmog.class?.toLowerCase().replace(' ', ''))}
            >
              {transmog.class} Sets
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TransmogDetail;
