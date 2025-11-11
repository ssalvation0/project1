import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './RecentlyViewed.css';

const API_URL = '/api/transmogs';

function RecentlyViewed({ limit = 5 }) {
  const [recentTransmogs, setRecentTransmogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadRecentlyViewed = async () => {
      try {
        const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewedTransmogs') || '[]');
        
        if (recentlyViewed.length === 0) {
          setLoading(false);
          return;
        }

        // Беремо тільки потрібну кількість
        const idsToFetch = recentlyViewed.slice(0, limit).map(item => item.id);
        
        // Завантажуємо дані для кожного трансмогу
        const transmogPromises = idsToFetch.map(id => 
          fetch(`${API_URL}/${id}`)
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
        );
        
        const transmogs = await Promise.all(transmogPromises);
        const validTransmogs = transmogs.filter(t => t !== null);
        
        setRecentTransmogs(validTransmogs);
        setLoading(false);
      } catch (error) {
        console.error('Error loading recently viewed:', error);
        setLoading(false);
      }
    };

    loadRecentlyViewed();
  }, [limit]);

  const clearHistory = () => {
    localStorage.removeItem('recentlyViewedTransmogs');
    setRecentTransmogs([]);
  };

  if (loading) {
    return null; // Не показуємо нічого під час завантаження
  }

  if (recentTransmogs.length === 0) {
    return null;
  }

  return (
    <div className="recently-viewed-section">
      <div className="recently-viewed-header">
        <h2>Recently Viewed</h2>
        <button className="clear-history-btn" onClick={clearHistory}>
          Clear History
        </button>
      </div>
      
      <div className="recently-viewed-grid">
        {recentTransmogs.map((transmog) => (
          <div 
            key={transmog.id}
            className="recently-viewed-card"
            onClick={() => navigate(`/transmog/${transmog.id}`)}
            onMouseMove={(e) => {
              const card = e.currentTarget;
              const rect = card.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 100;
              const y = ((e.clientY - rect.top) / rect.height) * 100;
              card.style.setProperty('--mouse-x', `${x}%`);
              card.style.setProperty('--mouse-y', `${y}%`);
            }}
          >
            <div className="recently-viewed-image">
              {transmog.iconUrl ? (
                <img 
                  src={transmog.iconUrl} 
                  alt={transmog.name}
                  loading="lazy"
                />
              ) : (
                <div className="recently-viewed-placeholder">⚔️</div>
              )}
            </div>
            <div className="recently-viewed-info">
              <h3>{transmog.name}</h3>
              <span className={`class-badge ${transmog.class?.toLowerCase().replace(' ', '')}`}>
                {transmog.class}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecentlyViewed;
