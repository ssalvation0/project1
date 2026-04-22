import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { useFavorites } from '../contexts/FavoritesContext';
import TransmogCard from '../components/TransmogCard';
import '../styles/Favorites.css';

async function fetchFavoriteTransmogs(ids) {
  if (!ids.length) return [];
  const res = await fetch(`/api/transmogs/batch?ids=${ids.join(',')}`);
  if (!res.ok) throw new Error('Failed to fetch favorites');
  return res.json();
}

function Favorites() {
  const { favorites, isFavorite, toggleFavorite } = useFavorites();

  // Number.isFinite instead of Boolean: the latter would drop id=0. Sort so the
  // queryKey stays stable when the user adds favorites in a different order —
  // otherwise every toggle busts the cache.
  const numericIds = useMemo(() => {
    const nums = favorites.map(Number).filter(n => Number.isFinite(n));
    return [...nums].sort((a, b) => a - b);
  }, [favorites]);

  const { data: transmogs = [], isLoading, error } = useQuery({
    queryKey: ['favorites-batch', numericIds.join(',')],
    queryFn: () => fetchFavoriteTransmogs(numericIds),
    enabled: numericIds.length > 0,
    staleTime: 60000,
  });

  return (
    <div className="favorites-page">
      <Helmet>
        <title>My Favorites — TransmogVault</title>
        <meta name="description" content="Your saved World of Warcraft transmog sets." />
      </Helmet>

      <div className="favorites-container">
        <div className="favorites-header">
          <h1>My Favorites</h1>
          {favorites.length > 0 && (
            <span className="favorites-count">{favorites.length} set{favorites.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {isLoading ? (
          <div className="favorites-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="favorites-skeleton" />
            ))}
          </div>
        ) : error ? (
          <div className="favorites-empty">
            <div className="favorites-empty-icon">!</div>
            <h2>Couldn't load favorites</h2>
            <p>Please check your connection and try again.</p>
          </div>
        ) : favorites.length === 0 ? (
          <div className="favorites-empty">
            <div className="favorites-empty-icon">♡</div>
            <h2>No favorites yet</h2>
            <p>Browse the catalog and save sets you like</p>
            <Link to="/catalog" className="favorites-browse-btn">Browse Catalog</Link>
          </div>
        ) : (
          <div className="favorites-grid">
            {transmogs.map(transmog => (
              <TransmogCard
                key={transmog.id}
                transmog={transmog}
                isFavorite={isFavorite(transmog.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Favorites;
