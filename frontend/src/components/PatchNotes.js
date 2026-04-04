import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import './PatchNotes.css';

async function fetchPatchNotes() {
  const { data, error } = await supabase
    .from('patch_notes')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(3);

  if (error) throw error;
  return data || [];
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

const PatchNotes = () => {
  const navigate = useNavigate();

  const { data: patches = [], isLoading } = useQuery({
    queryKey: ['patch-notes'],
    queryFn: fetchPatchNotes,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  return (
    <section className="patch-notes-section">
      <div className="patch-header">
        <h2>Latest Updates</h2>
        <span className="live-indicator">● LIVE</span>
      </div>

      <div className="patch-grid">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="patch-card patch-card--skeleton" />
          ))
        ) : patches.length === 0 ? (
          <div className="patch-empty">No updates yet</div>
        ) : (
          patches.map(patch => (
            <div key={patch.id} className="patch-card">
              <div className="patch-meta">
                <span className="patch-version">Patch {patch.version}</span>
                <span className="patch-date">{formatDate(patch.published_at)}</span>
              </div>
              <h3>{patch.title}</h3>
              <p>{patch.content}</p>
              <button
                className="patch-link-btn"
                onClick={() => navigate('/catalog')}
              >
                View New Sets
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default PatchNotes;
