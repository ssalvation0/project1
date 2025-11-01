import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [isTextVisible, setIsTextVisible] = useState(true);
  const favoriteButtonRef = useRef(null);

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
    
    if (favoriteButtonRef.current) {
      // Фіксуємо поточну ширину перед зміною тексту
      const currentWidth = favoriteButtonRef.current.offsetWidth;
      favoriteButtonRef.current.style.width = `${currentWidth}px`;
    }
    
    // Спочатку ховаємо текст (fade out)
    setIsTextVisible(false);
    
    // Після завершення fade out оновлюємо стан і показуємо новий текст
    setTimeout(() => {
      // Оновлюємо стан
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
      
      // Вимірюємо нову ширину після повного оновлення DOM
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (favoriteButtonRef.current && favoriteButtonRef.current.style.width) {
              const button = favoriteButtonRef.current;
              
              // Тимчасово знімаємо обмеження ширини для точного виміру
              const tempWidth = button.style.width;
              button.style.width = 'auto';
              
              // Чекаємо один кадр для оновлення розмірів
              requestAnimationFrame(() => {
                const newWidth = button.offsetWidth;
                // Повертаємо стару ширину перед встановленням нової
                button.style.width = tempWidth;
                
                // Встановлюємо нову ширину з transition у наступному кадрі
                requestAnimationFrame(() => {
                  if (button && button.style.width) {
                    // Переконаємося, що transition активний
                    button.style.transition = 'width 0.45s cubic-bezier(0.4, 0, 0.2, 1)';
                    button.style.width = `${newWidth}px`;
                    
                    // Показуємо новий текст (fade in) після початку анімації ширини
                    setTimeout(() => {
                      setIsTextVisible(true);
                    }, 50);
                  }
                });
              });
            }
          });
        });
      });
    }, 200); // Чекаємо завершення fade out
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
          ref={favoriteButtonRef}
          className={`favorite-button ${isFavorite ? 'favorited' : ''}`}
          onClick={toggleFavorite}
        >
          {isFavorite ? (
            <svg width="20" height="18" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, overflow: 'visible' }}>
              <path d="M10 18L8.55 16.63C3.4 12.15 0 9.15 0 5.4C0 2.37 2.25 0 5 0C6.65 0 8.2 0.8 9 2.1C9.8 0.8 11.35 0 13 0C15.75 0 18 2.37 18 5.4C18 9.15 14.6 12.15 9.45 16.63L10 18Z" fill="currentColor"/>
            </svg>
          ) : (
            <svg width="20" height="18" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, overflow: 'visible' }}>
              <path d="M10 18L8.55 16.63C3.4 12.15 0 9.15 0 5.4C0 2.37 2.25 0 5 0C6.65 0 8.2 0.8 9 2.1C9.8 0.8 11.35 0 13 0C15.75 0 18 2.37 18 5.4C18 9.15 14.6 12.15 9.45 16.63L10 18Z" stroke="currentColor" strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke"/>
            </svg>
          )}
          <span className={`favorite-button-text ${isTextVisible ? 'visible' : 'hidden'}`}>
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
