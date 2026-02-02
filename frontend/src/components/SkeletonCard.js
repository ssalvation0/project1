import React from 'react';
import './SkeletonCard.css';

/**
 * SkeletonCard - Loading placeholder for TransmogCard
 * Displays a shimmer animation while content is loading
 */
const SkeletonCard = () => {
    return (
        <div className="skeleton-card">
            <div className="skeleton-image" />
            <div className="skeleton-content">
                <div className="skeleton-title" />
                <div className="skeleton-badges">
                    <div className="skeleton-badge" />
                    <div className="skeleton-badge" />
                </div>
            </div>
        </div>
    );
};

export default SkeletonCard;
