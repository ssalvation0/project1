import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sword } from '@phosphor-icons/react';
import './RecentlyViewed.css';

const API_URL = '/api/transmogs';

// Move mouse handler outside component to prevent recreation
const handleMouseMove = (e) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  card.style.setProperty('--mouse-x', `${x}%`);
  card.style.setProperty('--mouse-y', `${y}%`);
};

function RecentlyViewed({ limit = 5 }) {
  const [recentTransmogs, setRecentTransmogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    // Single controller used by both branches so unmount/limit change cancels
    // in-flight requests (not just their state updates).
    const controller = new AbortController();

    const loadRecentlyViewed = async () => {
      try {
        const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewedTransmogs') || '[]');

        if (recentlyViewed.length === 0) {
          if (isMounted) setLoading(false);
          return;
        }

        const idsToFetch = recentlyViewed.slice(0, limit).map(item => item.id);

        // OPTIMIZATION: Single batch request instead of N separate requests.
        // Try batch endpoint first, fallback to individual requests.
        try {
          const batchRes = await fetch(`${API_URL}/batch?ids=${idsToFetch.join(',')}`, { signal: controller.signal });
          if (batchRes.ok) {
            const transmogs = await batchRes.json();
            // Preserve the recently-viewed order — the batch endpoint doesn't
            // guarantee it. Filter out any 404s (null/missing entries).
            const byId = new Map((transmogs || []).map(t => [t.id, t]));
            const ordered = idsToFetch.map(id => byId.get(id)).filter(Boolean);
            if (isMounted) {
              setRecentTransmogs(ordered);
              setLoading(false);
            }
            return;
          }
        } catch (err) {
          if (err.name === 'AbortError') return;
          // Batch endpoint failed (not aborted) — fall through to per-id
        }

        // Fallback path
        const transmogPromises = idsToFetch.map(id =>
          fetch(`${API_URL}/${id}`, { signal: controller.signal })
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
        );

        const transmogs = await Promise.all(transmogPromises);
        const validTransmogs = transmogs.filter(t => t !== null);

        if (isMounted) {
          setRecentTransmogs(validTransmogs);
          setLoading(false);
        }
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Error loading recently viewed:', error);
        if (isMounted) setLoading(false);
      }
    };

    loadRecentlyViewed();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [limit]);

  const clearHistory = useCallback(() => {
    localStorage.removeItem('recentlyViewedTransmogs');
    setRecentTransmogs([]);
  }, []);

  // Memoize click handler creator
  const handleCardClick = useCallback((id) => {
    navigate(`/transmog/${id}`);
  }, [navigate]);

  // Memoize the rendered cards
  const renderedCards = useMemo(() => {
    return recentTransmogs.map((transmog) => (
      <div
        key={transmog.id}
        className="recently-viewed-card"
        onClick={() => handleCardClick(transmog.id)}
        onMouseMove={handleMouseMove}
      >
        <div className="recently-viewed-image">
          {(transmog.previewUrl || transmog.iconUrl) ? (
            <img
              src={transmog.previewUrl || transmog.iconUrl}
              alt={transmog.name}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="recently-viewed-placeholder"><Sword size={32} opacity={0.3} /></div>
          )}
        </div>
        <div className="recently-viewed-info">
          <h3>{transmog.name}</h3>
          <span className={`class-badge ${transmog.class?.toLowerCase().replace(' ', '')}`}>
            {transmog.class}
          </span>
        </div>
      </div>
    ));
  }, [recentTransmogs, handleCardClick]);

  if (loading || recentTransmogs.length === 0) {
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
        {renderedCards}
      </div>
    </div>
  );
}

export default React.memo(RecentlyViewed);
