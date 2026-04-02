import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getFavorites, addFavorite, removeFavorite } from '../services/db';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext(null);

const LS_KEY = 'favoriteTransmogs';

function getLocalFavorites() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}

function setLocalFavorites(ids) {
  localStorage.setItem(LS_KEY, JSON.stringify(ids));
}

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState(getLocalFavorites);
  const [synced, setSynced] = useState(false);

  // When user logs in — load from DB, merge with any localStorage items
  useEffect(() => {
    if (!user) {
      setSynced(false);
      setFavorites(getLocalFavorites());
      return;
    }

    let mounted = true;
    setSynced(false);

    getFavorites(user.id)
      .then(async (dbIds) => {
        if (!mounted) return;
        const localIds = getLocalFavorites();
        // Merge: upload any local items not yet in DB
        const toUpload = localIds.filter(id => !dbIds.includes(id));
        if (toUpload.length > 0) {
          await Promise.allSettled(toUpload.map(id => addFavorite(user.id, id)));
        }
        const merged = [...new Set([...dbIds, ...localIds])];
        setLocalFavorites(merged);
        setFavorites(merged);
        setSynced(true);
      })
      .catch(() => {
        // DB недоступна — використовуємо localStorage
        if (mounted) setSynced(true);
      });

    return () => { mounted = false; };
  }, [user]);

  const toggleFavorite = useCallback(async (transmogId) => {
    const id = String(transmogId);
    const isCurrentlyFav = favorites.includes(id);

    // Optimistic update
    setFavorites(prev => {
      const next = isCurrentlyFav ? prev.filter(f => f !== id) : [...prev, id];
      setLocalFavorites(next);
      return next;
    });

    if (user) {
      try {
        if (isCurrentlyFav) {
          await removeFavorite(user.id, id);
        } else {
          await addFavorite(user.id, id);
        }
      } catch {
        // Rollback on failure
        setFavorites(prev => {
          const rolled = isCurrentlyFav ? [...prev, id] : prev.filter(f => f !== id);
          setLocalFavorites(rolled);
          return rolled;
        });
      }
    }
  }, [favorites, user]);

  const isFavorite = useCallback((transmogId) => favorites.includes(String(transmogId)), [favorites]);

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite, synced }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used inside FavoritesProvider');
  return ctx;
}
