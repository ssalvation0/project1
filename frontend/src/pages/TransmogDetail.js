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

    // Add to history
    const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewedTransmogs') || '[]');
    const transmogId = parseInt(id);

    const filtered = recentlyViewed.filter(item => item.id !== transmogId);

    const newHistory = [
      { id: transmogId, timestamp: Date.now() },
      ...filtered
    ].slice(0, 10);

    localStorage.setItem('recentlyViewedTransmogs', JSON.stringify(newHistory));
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

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);

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
        <p>Summoning set details...</p>
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

  // Handle classes array safely
  const classesList = transmog.classes || (transmog.class ? [transmog.class] : ['All']);
  const isAllClasses = classesList.includes('All');

  return (
    <div className="transmog-detail-page">
      {/* Background Blur Effect */}
      <div className="detail-bg-blur" style={{ backgroundImage: `url(${transmog.iconUrl})` }}></div>

      <div className="transmog-detail-container">
        <div className="transmog-detail-header">
          <button
            className="back-button"
            onClick={() => navigate('/catalog')}
          >
            ← Back to Catalog
          </button>

          <button
            className={`detail-favorite-button ${isFavorite ? 'favorited' : ''} ${isAnimating ? 'animating' : ''}`}
            onClick={toggleFavorite}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <span className="favorite-icon-wrapper">
              <svg
                className="heart-icon"
                viewBox="0 0 24 24"
                fill={isFavorite ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </span>
            <span className="favorite-button-text">
              {isFavorite ? 'Favorited' : 'Add to Favorites'}
            </span>
          </button>
        </div>

        <div className="transmog-detail-content-card">
          <div className="detail-top-section">
            <div className="detail-image-wrapper">
              {transmog.iconUrl ? (
                <img
                  src={transmog.iconUrl}
                  alt={transmog.name}
                  className="detail-main-icon"
                />
              ) : (
                <div className="detail-icon-placeholder">
                  <span>⚔️</span>
                </div>
              )}
              <div className="detail-image-glow"></div>
            </div>

            <div className="detail-info-wrapper">
              <h1 className="detail-title">{transmog.name}</h1>

              <div className="detail-badges">
                {/* Quality Badge */}
                {transmog.quality && transmog.quality !== 'Unknown' && (
                  <span className={`quality-badge ${transmog.quality.toLowerCase()}`}>
                    {transmog.quality}
                  </span>
                )}

                {/* Expansion Badge */}
                {transmog.expansion && transmog.expansion !== 'Unknown' && (
                  <span className="expansion-badge-detail">
                    {transmog.expansion}
                  </span>
                )}
              </div>

              <div className="detail-meta-clean">
                <div className="meta-row-clean">
                  <span className="meta-label-clean">Classes:</span>
                  <div className="class-badges-list">
                    {isAllClasses ? (
                      <span className="class-badge-detail all">All Classes</span>
                    ) : (
                      classesList.map(cls => (
                        <span key={cls} className={`class-badge-detail ${cls.toLowerCase().replace(' ', '')}`}>
                          {cls}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {transmog.id && (
                  <div className="meta-row-clean">
                    <span className="meta-label-clean">Set ID:</span>
                    <span className="id-value-clean">{transmog.id}</span>
                  </div>
                )}
              </div>

              <div className="detail-actions">
                <a
                  href={`https://www.wowhead.com/item-set=${transmog.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wowhead-button"
                >
                  View on Wowhead <span className="external-icon">↗</span>
                </a>
              </div>
            </div>
          </div>

          <div className="detail-items-section">
            <h2>Set Components</h2>
            <div className="detail-items-grid">
              {transmog.items && transmog.items.length > 0 ? (
                transmog.items.map((item, index) => (
                  <div key={index} className="detail-item-card">
                    <div className="item-card-inner">
                      <div className="item-icon-wrapper">
                        {item.iconUrl ? (
                          <img src={item.iconUrl} alt={item.name} />
                        ) : (
                          <div className="item-placeholder">?</div>
                        )}
                      </div>
                      <div className="item-details">
                        <h4>{item.name}</h4>
                        {item.slot && <span className="item-slot">{item.slot}</span>}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-items-message">
                  <p>Item details are currently being updated by the server.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TransmogDetail;
