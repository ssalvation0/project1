import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TransmogCard from './TransmogCard';
import './FeaturedSection.css';

const FeaturedSection = ({ title, tagline, items = [], className = '', viewAllLink, onViewAll }) => {
    const scrollContainerRef = useRef(null);
    const navigate = useNavigate();

    const handleViewAll = () => {
        if (onViewAll) onViewAll();
        else if (viewAllLink) navigate(viewAllLink);
    };

    const scroll = (direction) => {
        if (scrollContainerRef.current) {
            const { current } = scrollContainerRef;
            const scrollAmount = 350; // Approx card width + gap
            if (direction === 'left') {
                current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            } else {
                current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        }
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
                    >
                        ←
                    </button>
                    <button
                        className="control-btn next"
                        onClick={() => scroll('right')}
                        aria-label="Scroll right"
                    >
                        →
                    </button>
                </div>
            </div>

            <div className="featured-scroll-container" ref={scrollContainerRef}>
                {items.map((item, index) => (
                    <div key={item.id || index} className="featured-item-wrapper">
                        <TransmogCard
                            transmog={item}
                            onToggleFavorite={(id) => console.log('Toggle fav', id)}
                            isFavorite={false} // Mock for now
                        />
                    </div>
                ))}
            </div>
        </section>
    );
};

export default FeaturedSection;
