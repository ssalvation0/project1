import React, { useState, useEffect, useRef } from 'react';
import './NewsCarousel.css';

// Import images directly to ensure Webpack handles them
import druidImg from '../images/druid.jpg';
import warriorImg from '../images/paladin.jpg'; // Fallback since warrior.jpg is missing
import catalogImg from '../images/catalog.jpg';
import randomImg from '../images/random.jpg';

const newsItems = [
    {
        id: 1,
        title: "Patch 10.2.5: Seeds of Renewal",
        description: "Discover the new public events, dragonriding updates, and the reclamation of Gilneas.",
        image: druidImg,
        date: "Jan 16, 2024",
        category: "Update"
    },
    {
        id: 2,
        title: "The War Within: Hero Talents",
        description: "A deep dive into the new Hero Talent trees coming in the next expansion.",
        image: warriorImg,
        date: "Dec 19, 2023",
        category: "Preview"
    },
    {
        id: 3,
        title: "Trading Post: February Rewards",
        description: "Earn the new Love Witch's attire and other romantic rewards this month.",
        image: catalogImg,
        date: "Feb 1, 2024",
        category: "Event"
    },
    {
        id: 4,
        title: "Amirdrassil Race to World First",
        description: "Echo claims victory in the race to defeat Fyrakk the Blazing.",
        image: randomImg,
        date: "Nov 26, 2023",
        category: "Esports"
    }
];

const NewsCarousel = () => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);
    const autoPlayRef = useRef(null);

    useEffect(() => {
        if (isAutoPlaying) {
            autoPlayRef.current = setInterval(() => {
                setActiveIndex((prev) => (prev + 1) % newsItems.length);
            }, 5000);
        }
        return () => clearInterval(autoPlayRef.current);
    }, [isAutoPlaying]);

    const handleDotClick = (index) => {
        setActiveIndex(index);
        setIsAutoPlaying(false);
        // Resume autoplay after 10s of inactivity
        setTimeout(() => setIsAutoPlaying(true), 10000);
    };

    const handlePrev = () => {
        setActiveIndex((prev) => (prev === 0 ? newsItems.length - 1 : prev - 1));
    };

    const handleNext = () => {
        setActiveIndex((prev) => (prev === newsItems.length - 1 ? 0 : prev + 1));
    };

    return (
        <section className="news-carousel-section">
            <div className="carousel-container">
                <div className="carousel-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
                    {newsItems.map((item) => (
                        <div key={item.id} className="carousel-slide">
                            <div className="news-card">
                                <div className="news-image-wrapper">
                                    <span className="news-category">{item.category}</span>
                                    <img src={item.image} alt={item.title} className="news-image" />
                                </div>
                                <div className="news-content">
                                    <div className="news-date">{item.date}</div>
                                    <h3 className="news-title">{item.title}</h3>
                                    <p className="news-description">{item.description}</p>
                                    <button className="news-btn">Read More</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <button className="carousel-arrow prev" onClick={handlePrev} aria-label="Previous slide">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </button>

                <button className="carousel-arrow next" onClick={handleNext} aria-label="Next slide">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </button>

                <div className="carousel-indicators">
                    {newsItems.map((_, index) => (
                        <button
                            key={index}
                            className={`carousel-dot ${index === activeIndex ? 'active' : ''}`}
                            onClick={() => setActiveIndex(index)}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default NewsCarousel;
