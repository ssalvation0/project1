import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './TransmogCard.css';

const TransmogCard = ({ transmog, isFavorite, onToggleFavorite }) => {
    const navigate = useNavigate();
    const [imageError, setImageError] = useState(false);

    const handleClick = () => {
        navigate(`/transmog/${transmog.id}`);
    };

    const handleFavoriteClick = (e) => {
        e.stopPropagation();
        onToggleFavorite(transmog.id);
    };

    // Determine which image to show
    // Priority: iconUrl (from Wowhead) -> placeholder
    const imageUrl = transmog.iconUrl;
    const showPlaceholder = !imageUrl || imageError;

    // Get quality color for border/glow
    const getQualityColor = (quality) => {
        switch (quality?.toLowerCase()) {
            case 'poor': return '#9d9d9d';
            case 'common': return '#ffffff';
            case 'uncommon': return '#1eff00';
            case 'rare': return '#0070dd';
            case 'epic': return '#a335ee';
            case 'legendary': return '#ff8000';
            case 'artifact': return '#e6cc80';
            default: return '#ffffff';
        }
    };

    const qualityColor = getQualityColor(transmog.quality);

    return (
        <div
            className="transmog-card"
            onClick={handleClick}
            style={{ '--quality-color': qualityColor }}
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
                        onError={() => setImageError(true)}
                    />
                )}

                <div className="transmog-card-overlay">
                    <span className="view-details-text">View Details</span>
                </div>
            </div>

            <div className="transmog-card-content">
                <h3 className="transmog-name" style={{ color: qualityColor }}>
                    {transmog.name}
                </h3>

                <div className="transmog-meta">
                    {transmog.classes && transmog.classes.length > 0 && transmog.classes[0] !== 'All' && (
                        <span className={`class-badge ${transmog.classes[0].toLowerCase().replace(/\s+/g, '')}`}>
                            {transmog.classes[0]}
                        </span>
                    )}
                    {transmog.expansion && transmog.expansion !== 'Unknown' && (
                        <span className="expansion-badge">{transmog.expansion}</span>
                    )}
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

export default TransmogCard;
