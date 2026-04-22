import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import TransmogCard from '../components/TransmogCard';
import { PencilSimple, Trash } from '@phosphor-icons/react';
import './CollectionDetail.css';

async function fetchCollection(id) {
  // maybeSingle() returns data:null on 0 rows instead of throwing PGRST116 —
  // cleaner "not found" handling without distinguishing error codes in the caller.
  const { data, error } = await supabase
    .from('collections')
    .select('id, name, set_ids, created_at, user_id')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('[collection] fetch failed', error);
    throw error;
  }
  return data;
}

async function fetchSetsBatch(ids) {
  if (!ids || ids.length === 0) return [];
  const res = await fetch(`/api/transmogs/batch?ids=${ids.join(',')}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function CollectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const { data: collection, isLoading: colLoading } = useQuery({
    queryKey: ['collection', id],
    queryFn: () => fetchCollection(id),
    staleTime: 30000,
  });

  const { data: sets = [], isLoading: setsLoading } = useQuery({
    queryKey: ['collection-sets', id, collection?.set_ids],
    queryFn: () => fetchSetsBatch(collection.set_ids),
    enabled: Boolean(collection?.set_ids?.length),
    staleTime: 60000,
  });

  const isOwner = user && collection && user.id === collection.user_id;

  // Belt-and-braces: always defer to RLS, but the extra `.eq('user_id', user.id)`
  // and client-side `isOwner` guard make the intent obvious and keep buttons from
  // firing requests that RLS will reject anyway.
  const handleDelete = async () => {
    if (!isOwner) return;
    if (!window.confirm(`Delete collection "${collection?.name}"?`)) return;
    setDeleting(true);
    const { error: delErr } = await supabase
      .from('collections').delete().eq('id', id).eq('user_id', user.id);
    if (delErr) {
      console.error('[collection] delete failed', delErr);
      alert('Failed to delete. Please try again.');
      setDeleting(false);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['collections', user?.id] });
    navigate('/collections');
  };

  const handleRename = async (e) => {
    e.preventDefault();
    if (!isOwner) return;
    if (!newName.trim()) return;
    setSavingName(true);
    const { error: renameErr } = await supabase
      .from('collections').update({ name: newName.trim() }).eq('id', id).eq('user_id', user.id);
    if (renameErr) {
      console.error('[collection] rename failed', renameErr);
      setSavingName(false);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['collection', id] });
    queryClient.invalidateQueries({ queryKey: ['collections', user?.id] });
    setRenaming(false);
    setSavingName(false);
    setNewName('');
  };

  const handleRemoveSet = async (setId) => {
    if (!isOwner) return;
    const newIds = (collection.set_ids || []).filter(s => s !== setId);
    const { error: updateErr } = await supabase
      .from('collections').update({ set_ids: newIds }).eq('id', id).eq('user_id', user.id);
    if (updateErr) {
      console.error('[collection] remove set failed', updateErr);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['collection', id] });
  };

  if (colLoading) {
    return (
      <div className="col-detail-page">
        <div className="col-detail-container">
          <div className="col-detail-skeleton-header" />
          <div className="collections-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="transmog-card-skeleton" style={{ height: 320 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="col-detail-page">
        <div className="col-detail-container">
          <div className="col-detail-not-found">
            <p>Collection not found.</p>
            <Link to="/collections" className="collections-browse-btn">← My Collections</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="col-detail-page">
      <div className="col-detail-container">

        <div className="col-detail-header">
          <div className="col-detail-breadcrumb">
            <Link to="/collections" className="col-breadcrumb-link">My Collections</Link>
            <span className="col-breadcrumb-sep">›</span>
            {renaming ? (
              <form className="col-rename-form" onSubmit={handleRename}>
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder={collection.name}
                  maxLength={50}
                  className="col-rename-input"
                />
                <button type="submit" className="col-rename-save" disabled={!newName.trim() || savingName}>
                  {savingName ? '...' : 'Save'}
                </button>
                <button type="button" className="col-rename-cancel" onClick={() => { setRenaming(false); setNewName(''); }}>
                  Cancel
                </button>
              </form>
            ) : (
              <h1 className="col-detail-title">{collection.name}</h1>
            )}
          </div>

          <div className="col-detail-actions">
            {isOwner && !renaming && (
              <>
                <button
                  className="col-action-btn"
                  onClick={() => { setRenaming(true); setNewName(collection.name); }}
                >
                  <PencilSimple size={15} /> Rename
                </button>
                <button
                  className="col-action-btn col-action-btn--danger"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  <Trash size={15} /> Delete
                </button>
              </>
            )}
          </div>
        </div>

        <p className="col-detail-meta">
          {(collection.set_ids || []).length} {(collection.set_ids || []).length === 1 ? 'set' : 'sets'}
        </p>

        {setsLoading ? (
          <div className="col-sets-grid">
            {[...Array(Math.min(collection.set_ids?.length || 2, 6))].map((_, i) => (
              <div key={i} className="transmog-card-skeleton" />
            ))}
          </div>
        ) : sets.length === 0 ? (
          <div className="col-detail-empty">
            <div className="collections-empty-icon">🪣</div>
            <h2>This collection is empty</h2>
            <p>Add sets from the catalog using the bookmark button.</p>
            <Link to="/catalog" className="collections-browse-btn">Browse Catalog</Link>
          </div>
        ) : (
          <div className="col-sets-grid">
            {sets.map(set => (
              <div key={set.id} className="col-set-wrapper">
                <TransmogCard transmog={set} />
                {isOwner && (
                  <button
                    className="col-remove-btn"
                    onClick={() => handleRemoveSet(set.id)}
                    aria-label="Remove from collection"
                    title="Remove from collection"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

export default CollectionDetail;
