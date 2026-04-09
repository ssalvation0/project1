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
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);

  // Initialize favorite state and update history
  useEffect(() => {
    const transmogId = parseInt(id);

    // Check favorites
    try {
      const favorites = JSON.parse(localStorage.getItem('favoriteTransmogs') || '[]');
      setIsFavorite(favorites.includes(transmogId));
    } catch {
      setIsFavorite(false);
    }

    // Add to history
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

  const toggleFavorite = useCallback(() => {
    const transmogId = parseInt(id);

    setIsAnimating(true);
    const timeoutId = setTimeout(() => setIsAnimating(false), 500);

    setIsFavorite(prevIsFavorite => {
      const newIsFavorite = !prevIsFavorite;

      try {
        const favorites = JSON.parse(localStorage.getItem('favoriteTransmogs') || '[]');
        const newFavorites = newIsFavorite
          ? [...favorites, transmogId]
          : favorites.filter(favId => favId !== transmogId);
        localStorage.setItem('favoriteTransmogs', JSON.stringify(newFavorites));
      } catch {
        // Ignore localStorage errors
      }

      showToast(
        newIsFavorite ? 'Added to favorites' : 'Removed from favorites',
        { type: newIsFavorite ? 'success' : 'info' }
      );

      return newIsFavorite;
    });

    return () => clearTimeout(timeoutId);
  }, [id, showToast]);

  const navigateToCatalog = useCallback(() => {
    navigate('/catalog');
  }, [navigate]);

  // Copy link to clipboard
  const copyLink = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      showToast('Link copied to clipboard!', { type: 'success' });
      setTimeout(() => setLinkCopied(false), 2000);
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
          <button
            className="back-button detail-btn-base"
            onClick={navigateToCatalog}
          >
            ← Back to Catalog
          </button>

          <button
            className={`detail-favorite-button detail-btn-base ${isFavorite ? 'favorited' : ''} ${isAnimating ? 'animating' : ''}`}
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

                {transmog.id && (
                  <div className="meta-row-clean">
                    <span className="meta-label-clean">Set ID:</span>
                    <span className="id-value-clean">{transmog.id}</span>
                  </div>
                )}
              </div>

              <div className="detail-actions">
                <a
                  href={`https://www.wowhead.com/transmog-set=${transmog.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wowhead-button"
                >
                  View on Wowhead <span className="external-icon">↗</span>
                </a>
                <button
                  className={`share-button ${linkCopied ? 'copied' : ''}`}
                  onClick={copyLink}
                >
                  {linkCopied ? '✓ Copied!' : '🔗 Share'}
                </button>
                {user && (
                  <button
                    className="save-collection-button"
                    onClick={() => setShowCollectionModal(true)}
                  >
                    📚 Save to Collection
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* AI Guide Section */}
          <div className="guide-section">
            <h2>📖 Set Guide</h2>
            {guideLoading ? (
              <div className="guide-loading">
                <div className="guide-loading-spinner"></div>
                <span>{guideLoadingTooLong ? 'Still generating... this can take up to a minute.' : 'Generating guide with AI...'}</span>
              </div>
            ) : guideData?.guide ? (
              <div className="guide-content">
                <ReactMarkdown>{guideData.guide}</ReactMarkdown>
              </div>
            ) : (
              <p className="guide-unavailable">Guide not available for this set.</p>
            )}
          </div>

          <div className="detail-items-section">
            <h2>⚔️ Set Components</h2>
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
                      className="wowhead-button"
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
                      <a
                        href={`https://www.wowhead.com/item=${item.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="item-card-link"
                      >
                        <div className="item-card-inner">
                          <div className="item-icon-wrapper">
                            {item.iconUrl ? (
                              <img
                                src={item.iconUrl}
                                alt={item.name}
                                loading="lazy"
                                decoding="async"
                                width="64"
                                height="64"
                              />
                            ) : (
                              <div className="item-placeholder">
                                <img
                                  src={`https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg`}
                                  alt="?"
                                  width="64"
                                  height="64"
                                />
                              </div>
                            )}
                          </div>
                          <div className="item-details">
                            <h4>{item.name}</h4>
                            {item.slot && <span className="item-slot">{item.slot}</span>}
                          </div>
                        </div>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Similar Sets Section */}
          <CommentsSection setId={parseInt(id)} />

          {similarSets.length > 0 && (
            <div className="similar-sets-section">
              <h2>🎭 Similar Sets from {transmog.expansion}</h2>
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
                        <div className="similar-set-placeholder">⚔️</div>
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
