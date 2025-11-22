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
                className={`favorite-button ${isFavorite ? 'favorited' : ''}`}
                onClick={handleFavoriteClick}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
                <svg width="20" height="18" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M10 18L8.55 16.63C3.4 12.15 0 9.15 0 5.4C0 2.37 2.25 0 5 0C6.65 0 8.2 0.8 9 2.1C9.8 0.8 11.35 0 13 0C15.75 0 18 2.37 18 5.4C18 9.15 14.6 12.15 9.45 16.63L10 18Z"
                        fill={isFavorite ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth={isFavorite ? "0" : "2"}
                    />
                </svg>
            </button>
        </div>
    );
};

export default TransmogCard;
