import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import './Collections.css';

async function fetchUserCollections(userId) {
  const { data } = await supabase
    .from('collections')
    .select('id, name, set_ids, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data || [];
}

function Collections() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['collections', user?.id],
    queryFn: () => fetchUserCollections(user.id),
    enabled: Boolean(user),
    staleTime: 30000,
  });

  if (!user) {
    return (
      <div className="collections-page">
        <div className="collections-empty-state">
          <div className="collections-empty-icon">📚</div>
          <h2>Log in to view your collections</h2>
          <p>Create collections to organize your favourite transmog sets.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="collections-page">
      <div className="collections-container">
        <div className="collections-header">
          <h1>My Collections</h1>
          <button className="collections-back-btn" onClick={() => navigate('/catalog')}>
            ← Catalog
          </button>
        </div>

        {isLoading ? (
          <div className="collections-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="collection-card-skeleton" />
            ))}
          </div>
        ) : collections.length === 0 ? (
          <div className="collections-empty-state">
            <div className="collections-empty-icon">📂</div>
            <h2>No collections yet</h2>
            <p>Open any transmog set and save it to a new collection.</p>
            <Link to="/catalog" className="collections-browse-btn">Browse Catalog</Link>
          </div>
        ) : (
          <div className="collections-grid">
            {collections.map(col => (
              <Link
                key={col.id}
                to={`/collections/${col.id}`}
                className="collection-card"
              >
                <div className="collection-card-icon">📁</div>
                <div className="collection-card-info">
                  <h3>{col.name}</h3>
                  <span className="collection-card-count">
                    {(col.set_ids || []).length} {(col.set_ids || []).length === 1 ? 'set' : 'sets'}
                  </span>
                </div>
                <div className="collection-card-arrow">→</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Collections;
