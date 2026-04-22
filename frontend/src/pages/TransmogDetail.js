import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '../components/ToastProvider';
import ReactMarkdown from 'react-markdown';
import { Helmet } from 'react-helmet-async';
import RatingWidget from '../components/RatingWidget';
import CommentsSection from '../components/CommentsSection';
import AddToCollectionModal from '../components/AddToCollectionModal';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';
import {
  Sword, BookOpenText, Link as LinkIcon, Check, Bookmarks,
  SquaresFour
} from '@phosphor-icons/react';
import '../styles/TransmogDetail.css';

const API_URL = '/api/transmogs';

async function fetchGuide(id) {
  const res = await fetch(`${API_URL}/${id}/guide`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchTransmogById(id) {
  const res = await fetch(`${API_URL}/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Fetch similar sets (same expansion + source if possible, fall back to expansion only)
async function fetchSimilarSets(expansion, currentId, source) {
  // Try same expansion + same source first
  if (source) {
    const params = new URLSearchParams({ expansion, source, limit: 8 });
    const res = await fetch(`${API_URL}?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      const filtered = (data.transmogs || []).filter(t => t.id !== currentId);
      if (filtered.length >= 2) return filtered.slice(0, 4);
    }
  }
  // Fall back to same expansion
  const params = new URLSearchParams({ expansion, limit: 8 });
  const res = await fetch(`${API_URL}?${params.toString()}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.transmogs || []).filter(t => t.id !== currentId).slice(0, 4);
}

function TransmogDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { isFavorite: isFavoriteFn, toggleFavorite: ctxToggleFavorite } = useFavorites();
  const isFavorite = isFavoriteFn(id);
  const [isAnimating, setIsAnimating] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);

  // Update recently-viewed history when set changes
  useEffect(() => {
    const transmogId = parseInt(id, 10);
    try {
      const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewedTransmogs') || '[]');
      const filtered = recentlyViewed.filter(item => item.id !== transmogId);
      const newHistory = [
        { id: transmogId, timestamp: Date.now() },
        ...filtered
      ].slice(0, 10);
      localStorage.setItem('recentlyViewedTransmogs', JSON.stringify(newHistory));
    } catch {
      // Ignore localStorage errors
    }
  }, [id]);

  const { data: transmog, isLoading, error, refetch } = useQuery({
    queryKey: ['transmog', id],
    queryFn: () => fetchTransmogById(id),
    enabled: Boolean(id),
    staleTime: 60000 // Cache for 1 minute
  });

  // Fetch AI guide
  const { data: guideData, isLoading: guideLoading } = useQuery({
    queryKey: ['guide', id],
    queryFn: () => fetchGuide(id),
    enabled: Boolean(id),
    staleTime: Infinity,
    retry: false,
    gcTime: Infinity,
  });

  // Track how long guide has been loading
  const [guideLoadingTooLong, setGuideLoadingTooLong] = useState(false);
  useEffect(() => {
    if (!guideLoading) { setGuideLoadingTooLong(false); return; }
    const t = setTimeout(() => setGuideLoadingTooLong(true), 30000);
    return () => clearTimeout(t);
  }, [guideLoading, id]);

  // Re-bind Wowhead tooltips after items render
  useEffect(() => {
    if (typeof window.WH !== 'undefined' && typeof window.WH.bindLinks === 'function') {
      window.WH.bindLinks();
    }
  }, [transmog?.items?.length]);

  // Fetch similar sets
  const { data: similarSets = [] } = useQuery({
    queryKey: ['similarSets', transmog?.expansion, transmog?.source, id],
    queryFn: () => fetchSimilarSets(transmog?.expansion, parseInt(id), transmog?.source),
    enabled: Boolean(transmog?.expansion),
    staleTime: 60000
  });

  useEffect(() => {
    if (error) {
      showToast('Failed to load set details. Please retry.', { type: 'error', duration: 3000 });
    }
  }, [error, showToast]);

  // Stash the most recent animation timer in a ref so we can clear it on unmount
  // or when the user double-taps fav (avoids a setState on unmounted component).
  const animTimerRef = React.useRef(null);
  useEffect(() => () => { if (animTimerRef.current) clearTimeout(animTimerRef.current); }, []);

  const toggleFavorite = useCallback(() => {
    setIsAnimating(true);
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    animTimerRef.current = setTimeout(() => setIsAnimating(false), 500);

    const wasFavorite = isFavoriteFn(id);
    ctxToggleFavorite(id);
    showToast(
      wasFavorite ? 'Removed from favorites' : 'Added to favorites',
      { type: wasFavorite ? 'info' : 'success' }
    );
  }, [id, showToast, isFavoriteFn, ctxToggleFavorite]);

  const navigateToCatalog = useCallback(() => {
    navigate('/catalog');
  }, [navigate]);

  // Copy link to clipboard
  const copyTimerRef = React.useRef(null);
  useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);

  const copyLink = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      showToast('Link copied to clipboard!', { type: 'success' });
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setLinkCopied(false), 2000);
    }).catch(() => {
      showToast('Failed to copy link', { type: 'error' });
    });
  }, [showToast]);

  // Memoize classes list
  const classesList = useMemo(() => {
    return transmog?.classes || (transmog?.class ? [transmog.class] : ['All']);
  }, [transmog?.classes, transmog?.class]);

  const isAllClasses = useMemo(() => classesList.includes('All'), [classesList]);

  // Memoize background style
  const bgStyle = useMemo(() => ({
    backgroundImage: transmog?.iconUrl ? `url(${transmog.iconUrl})` : 'none'
  }), [transmog?.iconUrl]);


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
        <button onClick={navigateToCatalog}>Back to Catalog</button>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  if (!transmog) {
    return (
      <div className="transmog-detail-error">
        <p>Transmog not found</p>
        <button onClick={navigateToCatalog}>Back to Catalog</button>
      </div>
    );
  }

  const seoTitle = transmog ? `${transmog.name} - TransmogVault` : 'TransmogVault';
  const seoDescription = transmog
    ? `${transmog.name} transmog set for ${classesList.join(', ')} from ${transmog.expansion}. ${transmog.items?.length || 0} pieces. Farm guide and tips.`
    : 'World of Warcraft transmog set details.';
  const seoImage = transmog?.previewUrl || transmog?.iconUrl || '';

  return (
    <div className="transmog-detail-page">
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:type" content="article" />
        {seoImage && <meta property="og:image" content={seoImage} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        {seoImage && <meta name="twitter:image" content={seoImage} />}
      </Helmet>

      {/* Background Blur Effect */}
      <div className="detail-bg-blur" style={bgStyle}></div>

      <div className="transmog-detail-container">
        <div className="transmog-detail-header">
          <button className="back-button" onClick={navigateToCatalog}>
            ← Back to Catalog
          </button>
        </div>

        <nav className="detail-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to={`/catalog${transmog.expansion ? `?expansion=${encodeURIComponent(transmog.expansion)}` : ''}`}>
            {transmog.expansion || 'Catalog'}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="detail-breadcrumbs-current" aria-current="page">
            {transmog.name}
          </span>
        </nav>

        <div className="transmog-detail-content-card">
          <div className="detail-top-section">
            <div className="detail-image-wrapper">
              {(transmog.previewUrl || transmog.iconUrl) ? (
                <img
                  src={transmog.previewUrl || transmog.iconUrl}
                  alt={transmog.name}
                  className="detail-main-icon"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <div className="detail-icon-placeholder">
                  <Sword size={48} opacity={0.4} />
                </div>
              )}
              <div className="detail-image-glow"></div>
            </div>

            <div className="detail-info-wrapper">
              <div className="detail-info-top">
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

              <RatingWidget setId={parseInt(id)} />

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
              </div>
              </div>

              <div className="detail-stats-center">
                {(transmog.items?.length > 0 || transmog.source) && (
                  <div className="detail-stats-grid">
                    {transmog.items?.length > 0 && (
                      <div className="detail-stat">
                        <span className="detail-stat-value">{transmog.items.length}</span>
                        <span className="detail-stat-label">Pieces</span>
                      </div>
                    )}
                    {transmog.source && (
                      <div className="detail-stat">
                        <span className="detail-stat-value">{transmog.source}</span>
                        <span className="detail-stat-label">Source</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="detail-actions">
                <button
                  className={`td-btn td-btn--fav ${isFavorite ? 'is-favorited' : ''} ${isAnimating ? 'animating' : ''}`}
                  onClick={toggleFavorite}
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  {isFavorite ? 'Favorited' : 'Favorite'}
                </button>
                <a
                  href={`https://www.wowhead.com/transmog-set=${transmog.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="td-btn td-btn--wowhead"
                >
                  View on Wowhead <span className="external-icon">↗</span>
                </a>
                <button
                  className={`td-btn ${linkCopied ? 'td-btn--success' : ''}`}
                  onClick={copyLink}
                >
                  {linkCopied ? <><Check size={16} /> Copied!</> : <><LinkIcon size={16} /> Share</>}
                </button>
                {user && (
                  <button
                    className="td-btn"
                    onClick={() => setShowCollectionModal(true)}
                  >
                    <Bookmarks size={16} /> Save to Collection
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* AI Guide Section */}
          <div className="guide-section">
            <h3><BookOpenText size={16} weight="bold" /> Set Guide</h3>
            {guideLoading ? (
              <div className="guide-loading">
                <div className="guide-loading-spinner"></div>
                <span>{guideLoadingTooLong ? 'Still generating... this can take up to a minute.' : 'Generating guide with AI...'}</span>
              </div>
            ) : guideData?.guide ? (
              <div className="guide-content" data-nowh="true">
                <ReactMarkdown>{guideData.guide}</ReactMarkdown>
              </div>
            ) : (
              <div className="guide-unavailable">
                <BookOpenText size={28} weight="light" />
                <h4>Guide coming soon</h4>
                <p>
                  Farming guides are AI-generated in batches. This one isn't ready yet —
                  check back in a few days, or request priority generation.
                </p>
                <a
                  href="https://t.me/ssalvation"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="td-btn td-btn--ghost"
                >
                  Request via Telegram
                </a>
              </div>
            )}
          </div>

          <div className="detail-items-section">
            <h3><Sword size={16} weight="bold" /> Set Components</h3>
            {(() => {
              const namedItems = (transmog.items || []).filter(i => i.name && !i.name.startsWith('Item '));
              const hasRealItems = namedItems.length > 0;
              if (!hasRealItems) {
                return (
                  <div className="items-wowhead-redirect">
                    <p>View the full piece list on Wowhead:</p>
                    <a
                      href={`https://www.wowhead.com/transmog-set=${transmog.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="td-btn td-btn--wowhead"
                    >
                      Open on Wowhead ↗
                    </a>
                  </div>
                );
              }
              return (
                <div className="detail-items-grid">
                  {namedItems.map((item, index) => (
                    <div key={item.id || index} className="detail-item-card">
                      <a href={`https://www.wowhead.com/item=${item.id}`} target="_blank" rel="noopener noreferrer" className="item-card-link nwh">
                        <div className="item-icon-wrapper">
                          {item.iconUrl ? (
                            <img src={item.iconUrl} alt={item.name} loading="lazy" decoding="async" width="40" height="40" />
                          ) : (
                            <img src="https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg" alt="?" width="40" height="40" />
                          )}
                        </div>
                        <div className="item-info">
                          <h4 data-wowhead={`item=${item.id}`}>{item.name}</h4>
                          {item.slot && <span className="item-slot">{item.slot}</span>}
                        </div>
                      </a>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Comments Section */}
          <CommentsSection setId={parseInt(id)} />

          {similarSets.length > 0 && (
            <div className="similar-sets-section">
              <h3><SquaresFour size={16} /> Similar Sets from {transmog.expansion}</h3>
              <div className="similar-sets-grid">
                {similarSets.map(set => (
                  <Link
                    key={set.id}
                    to={`/transmog/${set.id}`}
                    className="similar-set-card"
                  >
                    <div className="similar-set-image">
                      {(set.previewUrl || set.iconUrl) ? (
                        <img
                          src={set.previewUrl || set.iconUrl}
                          alt={set.name}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="similar-set-placeholder"><Sword size={32} opacity={0.3} /></div>
                      )}
                    </div>
                    <div className="similar-set-info">
                      <h4>{set.name}</h4>
                      {set.quality && set.quality !== 'Unknown' && (
                        <span className={`quality-badge-sm ${set.quality.toLowerCase()}`}>
                          {set.quality}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    {showCollectionModal && transmog && (
      <AddToCollectionModal
        setId={parseInt(id)}
        setName={transmog.name}
        onClose={() => setShowCollectionModal(false)}
      />
    )}
    </div>
  );
}

export default React.memo(TransmogDetail);
