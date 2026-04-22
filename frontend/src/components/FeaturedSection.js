import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TransmogCard from './TransmogCard';
import { useFavorites } from '../contexts/FavoritesContext';
import './FeaturedSection.css';

const FeaturedSection = ({ title, tagline, items = [], className = '', viewAllLink, onViewAll }) => {
    const { isFavorite, toggleFavorite } = useFavorites();
    const scrollContainerRef = useRef(null);
    const navigate = useNavigate();
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const touchStartX = useRef(0);

    const handleViewAll = () => {
        if (onViewAll) onViewAll();
        else if (viewAllLink) navigate(viewAllLink);
    };

    const updateScrollState = useCallback(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 4);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    }, []);

    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        el.addEventListener('scroll', updateScrollState, { passive: true });
        updateScrollState();
        return () => el.removeEventListener('scroll', updateScrollState);
    }, [updateScrollState, items]);

    const scroll = (direction) => {
        if (!scrollContainerRef.current) return;
        const scrollAmount = 350;
        scrollContainerRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth',
        });
    };

    // Touch swipe
    const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
    const handleTouchEnd = (e) => {
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) scroll(diff > 0 ? 'right' : 'left');
    };

    if (!items || items.length === 0) return null;

    return (
        <section className={`featured-section ${className}`}>
            <div className="featured-header">
                <div className="featured-title-group">
                    <h2>{title}</h2>
                    {tagline && <p className="featured-tagline">{tagline}</p>}
                </div>
                <div className="featured-controls">
                    <button
                        className="control-btn prev"
                        onClick={() => scroll('left')}
                        aria-label="Scroll left"
                        disabled={!canScrollLeft}
                    >
                        ←
                    </button>
                    <button
                        className="control-btn next"
                        onClick={() => scroll('right')}
                        aria-label="Scroll right"
                        disabled={!canScrollRight}
                    >
                        →
                    </button>
                </div>
            </div>

            <div
                className="featured-scroll-container"
                ref={scrollContainerRef}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {items.map((item, index) => (
                    <div key={item.id || index} className="featured-item-wrapper">
                        <TransmogCard
                            transmog={item}
                            onToggleFavorite={toggleFavorite}
                            isFavorite={isFavorite(item.id)}
                        />
                    </div>
                ))}
            </div>
        </section>
    );
};

export default FeaturedSection;
