import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '../components/ToastProvider';
import '../styles/TransmogDetail.css';

const API_URL = '/api/transmogs';

async function fetchTransmogById(id) {
  const res = await fetch(`${API_URL}/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Fetch similar sets (same expansion, different ID)
async function fetchSimilarSets(expansion, currentId) {
  const params = new URLSearchParams({ expansion, limit: 6 });
  const res = await fetch(`${API_URL}?${params.toString()}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.transmogs || []).filter(t => t.id !== currentId).slice(0, 4);
}

// Helper: Get acquisition info based on expansion and quality
function getAcquisitionInfo(expansion, quality, classes) {
  const info = {
    source: '',
    description: '',
    tips: [],
    difficulty: 'Medium'
  };

  // Expansion-specific sources
  const expansionSources = {
    'Classic': {
      source: 'Classic Raids & Dungeons',
      description: 'These sets were originally obtained from Molten Core, Blackwing Lair, Onyxia\'s Lair, and other Classic-era content.',
      tips: [
        'Most Classic raids are now easily soloable at max level',
        'Check Auction House for BoE pieces',
        'Some sets have look-alike alternatives from quests'
      ],
      difficulty: 'Easy'
    },
    'Burning Crusade': {
      source: 'Outland Raids & Heroics',
      description: 'Originally from Karazhan, Serpentshrine Cavern, Tempest Keep, Black Temple and more.',
      tips: [
        'All TBC raids are soloable at level 70+',
        'Some pieces drop from heroic dungeons',
        'Tier tokens need to be exchanged in Shattrath'
      ],
      difficulty: 'Easy'
    },
    'Wrath of the Lich King': {
      source: 'Northrend Raids',
      description: 'From iconic raids like Naxxramas, Ulduar, Trial of the Crusader, and Icecrown Citadel.',
      tips: [
        'ICC has some of the most iconic tier sets',
        'Ulduar hard modes drop unique visuals',
        'Check for 10-man and 25-man color variants'
      ],
      difficulty: 'Easy'
    },
    'Cataclysm': {
      source: 'Cataclysm Raids',
      description: 'Obtained from Blackwing Descent, Bastion of Twilight, Firelands, and Dragon Soul.',
      tips: [
        'Firelands has stunning fire-themed armor',
        'Dragon Soul drops Raid Finder color variants',
        'Some sets have heroic recolors'
      ],
      difficulty: 'Easy'
    },
    'Mists of Pandaria': {
      source: 'Pandaria Raids',
      description: 'From Mogu\'shan Vaults, Heart of Fear, Terrace of Endless Spring, Throne of Thunder, and Siege of Orgrimmar.',
      tips: [
        'Throne of Thunder has highly detailed sets',
        'Challenge Mode appearances are no longer obtainable',
        'LFR, Normal, Heroic have different colors'
      ],
      difficulty: 'Easy'
    },
    'Warlords of Draenor': {
      source: 'Draenor Raids & Garrison',
      description: 'From Highmaul, Blackrock Foundry, and Hellfire Citadel. Some sets from garrison missions.',
      tips: [
        'Mythic Hellfire Citadel has unique fel-corrupted looks',
        'Some sets available from Garrison Salvage Yard',
        'Ashran PvP sets share models with raid gear'
      ],
      difficulty: 'Easy'
    },
    'Legion': {
      source: 'Legion Raids & World Content',
      description: 'From Emerald Nightmare, Nighthold, Tomb of Sargeras, and Antorus.',
      tips: [
        'Tier sets are class-specific with unique themes',
        'Antorus has the final "tier" armor designs',
        'Some appearances tied to Mage Tower (limited)'
      ],
      difficulty: 'Easy'
    },
    'Battle for Azeroth': {
      source: 'BfA Raids & Warfronts',
      description: 'From Uldir, Battle of Dazar\'alor, Crucible of Storms, Eternal Palace, and Ny\'alotha.',
      tips: [
        'Warfront sets are faction-specific',
        'Heritage armor requires reputation grinding',
        'Island Expedition drops unique transmog pieces'
      ],
      difficulty: 'Medium'
    },
    'Shadowlands': {
      source: 'Shadowlands Raids & Covenants',
      description: 'From Castle Nathria, Sanctum of Domination, and Sepulcher of the First Ones.',
      tips: [
        'Covenant armor requires specific covenant membership',
        'Mythic raids have unique color variants',
        'Some sets from Torghast or Maw activities'
      ],
      difficulty: 'Medium'
    },
    'Dragonflight': {
      source: 'Dragon Isles Raids',
      description: 'From Vault of the Incarnates, Aberrus, and Amirdrassil.',
      tips: [
        'Tier sets return with set bonuses',
        'Catalyst system converts gear to tier appearance',
        'Revival Catalyst unlocks weekly'
      ],
      difficulty: 'Medium'
    },
    'The War Within': {
      source: 'Current Content',
      description: 'From the latest expansion\'s raids and activities.',
      tips: [
        'Current tier - actively dropping from raids',
        'Check group finder for raid groups',
        'Mythic+ also provides tier appearances via Catalyst'
      ],
      difficulty: 'Hard'
    }
  };

  const expInfo = expansionSources[expansion] || {
    source: 'Various Sources',
    description: 'This set can be obtained from various in-game activities.',
    tips: ['Check Wowhead for specific drop locations'],
    difficulty: 'Unknown'
  };

  // Quality-specific modifications
  if (quality === 'Epic') {
    expInfo.tips.push('Epic quality typically drops from raid bosses');
  } else if (quality === 'Rare') {
    expInfo.tips.push('Rare items often come from dungeons or world drops');
  }

  // Class-specific tip
  if (classes && classes.length === 1 && classes[0] !== 'All') {
    expInfo.tips.unshift(`This is a ${classes[0]}-specific set`);
  }

  return expInfo;
}

function TransmogDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

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

  // Fetch similar sets
  const { data: similarSets = [] } = useQuery({
    queryKey: ['similarSets', transmog?.expansion, id],
    queryFn: () => fetchSimilarSets(transmog?.expansion, parseInt(id)),
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

  // Get acquisition info
  const acquisitionInfo = useMemo(() => {
    if (!transmog) return null;
    return getAcquisitionInfo(transmog.expansion, transmog.quality, transmog.classes);
  }, [transmog]);

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

  return (
    <div className="transmog-detail-page">
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
              {transmog.iconUrl ? (
                <img
                  src={transmog.iconUrl}
                  alt={transmog.name}
                  className="detail-main-icon"
                  loading="eager"
                  decoding="async"
                  width="256"
                  height="256"
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
                <button
                  className={`share-button ${linkCopied ? 'copied' : ''}`}
                  onClick={copyLink}
                >
                  {linkCopied ? '✓ Copied!' : '🔗 Share'}
                </button>
              </div>
            </div>
          </div>

          {/* How to Obtain Section */}
          {acquisitionInfo && (
            <div className="acquisition-section">
              <h2>📍 How to Obtain</h2>
              <div className="acquisition-content">
                <div className="acquisition-header">
                  <span className="acquisition-source">{acquisitionInfo.source}</span>
                  <span className={`difficulty-badge ${acquisitionInfo.difficulty.toLowerCase()}`}>
                    {acquisitionInfo.difficulty}
                  </span>
                </div>
                <p className="acquisition-description">{acquisitionInfo.description}</p>

                <div className="acquisition-tips">
                  <h3>💡 Tips</h3>
                  <ul>
                    {acquisitionInfo.tips.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="detail-items-section">
            <h2>⚔️ Set Components</h2>
            <div className="detail-items-grid">
              {transmog.items && transmog.items.length > 0 ? (
                transmog.items.map((item, index) => (
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
                            <div className="item-placeholder">?</div>
                          )}
                        </div>
                        <div className="item-details">
                          <h4>{item.name}</h4>
                          {item.slot && <span className="item-slot">{item.slot}</span>}
                        </div>
                      </div>
                    </a>
                  </div>
                ))
              ) : (
                <div className="no-items-message">
                  <p>Item details are currently being updated by the server.</p>
                </div>
              )}
            </div>
          </div>

          {/* Similar Sets Section */}
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
                      {set.iconUrl ? (
                        <img
                          src={set.iconUrl}
                          alt={set.name}
                          loading="lazy"
                          width="128"
                          height="128"
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
    </div>
  );
}

export default React.memo(TransmogDetail);
