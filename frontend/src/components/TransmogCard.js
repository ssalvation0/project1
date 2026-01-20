import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './TransmogCard.css';

// Quality color map - defined outside component to prevent recreation
const QUALITY_COLORS = {
    poor: '#9d9d9d',
    common: '#ffffff',
    uncommon: '#1eff00',
    rare: '#0070dd',
    epic: '#a335ee',
    legendary: '#ff8000',
    artifact: '#e6cc80'
};

const getQualityColor = (quality) => {
    return QUALITY_COLORS[quality?.toLowerCase()] || '#ffffff';
};

const TransmogCard = ({ transmog, isFavorite, onToggleFavorite }) => {
    const navigate = useNavigate();
    const [imageError, setImageError] = useState(false);

    // Mock data for source and rating if not present
    const source = transmog.source || ['Raid', 'PvP', 'Dungeon', 'Crafted'][Math.floor(Math.random() * 4)];
    const rating = transmog.rating || (Math.random() * 2 + 3).toFixed(1); // 3.0 to 5.0
    const ratingCount = transmog.ratingCount || Math.floor(Math.random() * 100);

    const handleClick = useCallback(() => {
        navigate(`/transmog/${transmog.id}`);
    }, [navigate, transmog.id]);

    const handleFavoriteClick = useCallback((e) => {
        e.stopPropagation();
        onToggleFavorite(transmog.id);
    }, [onToggleFavorite, transmog.id]);

    const handleImageError = useCallback(() => {
        setImageError(true);
    }, []);

    // Memoize computed values
    const imageUrl = transmog.iconUrl;
    const showPlaceholder = !imageUrl || imageError;
    const qualityColor = useMemo(() => getQualityColor(transmog.quality), [transmog.quality]);

    // Memoize style object
    const cardStyle = useMemo(() => ({
        '--quality-color': qualityColor
    }), [qualityColor]);

    // Memoize class badge info
    const classBadge = useMemo(() => {
        if (transmog.classes && transmog.classes.length > 0 && transmog.classes[0] !== 'All') {
            return {
                className: `class-badge ${transmog.classes[0].toLowerCase().replace(/\s+/g, '')}`,
                text: transmog.classes[0]
            };
        }
        return null;
    }, [transmog.classes]);

    return (
        <div
            className="transmog-card"
            onClick={handleClick}
            style={cardStyle}
            title={`${transmog.type || 'Plate'} • ${source} • ${transmog.difficulty || 'Mythic'}`} // Simple tooltip
        >
            <div className="transmog-card-image-container">
                {showPlaceholder ? (
                    <div className="transmog-card-placeholder">
                        <span className="placeholder-icon">⚔️</span>
                    </div>
                ) : (
                    <img
                        src={imageUrl}
                        alt={transmog.name}
                        className="transmog-card-image"
                        loading="lazy"
                        decoding="async"
                        onError={handleImageError}
                        width="128"
                        height="128"
                    />
                )}

                <div className="transmog-card-overlay">
                    <div className="card-overlay-content">
                        <p className="overlay-meta">{transmog.type || 'Plate'} • {source}</p>
                        <span className="view-details-btn">Details</span>
                    </div>
                </div>
            </div>

            <div className="transmog-card-content">
                <div className="card-header-row">
                    <h3 className="transmog-name" style={{ color: qualityColor }}>
                        {transmog.name}
                    </h3>
                </div>

                <div className="card-rating-row">
                    <span className="star-icon">★</span>
                    <span className="rating-value">{rating}</span>
                    <span className="rating-count">({ratingCount})</span>
                </div>

                <div className="transmog-meta">
                    {classBadge && (
                        <span className={classBadge.className}>
                            {classBadge.text}
                        </span>
                    )}
                    <span className="expansion-badge source-badge">{source}</span>
                </div>
            </div>

            <button
                className={`card-favorite-button ${isFavorite ? 'favorited' : ''}`}
                onClick={handleFavoriteClick}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
                <svg viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
            </button>
        </div>
    );
};

// Use React.memo with custom comparison for better performance
export default React.memo(TransmogCard, (prevProps, nextProps) => {
    return (
        prevProps.transmog.id === nextProps.transmog.id &&
        prevProps.isFavorite === nextProps.isFavorite &&
        prevProps.onToggleFavorite === nextProps.onToggleFavorite
    );
});
