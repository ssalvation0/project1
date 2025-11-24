import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileCard from '../components/ProfileCard';
import RecentlyViewed from '../components/RecentlyViewed';
import NewsCarousel from '../components/NewsCarousel';
import '../styles/Home.css';

const imagesContext = require.context('../images', false, /\.(png|jpe?g|svg)$/);
const imagesMap = imagesContext.keys().reduce((map, filePath) => {
  const name = filePath.replace('./', '').replace(/\.(png|jpe?g|svg)$/, '');
  map[name] = imagesContext(filePath).default || imagesContext(filePath);
  return map;
}, {});

const warcraftClasses = [
  { name: 'Warrior', role: 'Tank / DPS' },
  { name: 'Paladin', role: 'Tank / Healer / DPS' },
  { name: 'Hunter', role: 'Ranged DPS' },
  { name: 'Rogue', role: 'Melee DPS' },
  { name: 'Priest', role: 'Healer / DPS' },
  { name: 'Death Knight', role: 'Tank / DPS' },
  { name: 'Shaman', role: 'Healer / DPS' },
  { name: 'Mage', role: 'Ranged DPS' },
  { name: 'Warlock', role: 'Ranged DPS' },
  { name: 'Monk', role: 'Tank / Healer / DPS' },
  { name: 'Druid', role: 'Tank / Healer / DPS' },
  { name: 'Demon Hunter', role: 'Tank / DPS' },
  { name: 'Evoker', role: 'Healer / DPS' }
];

function Home() {
  const [showCards, setShowCards] = useState(false);
  const [animateCards, setAnimateCards] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const navigate = useNavigate();
  const cardsRef = useRef(null);
  const heroRef = useRef(null);

  const classImageMap = {
    'warrior': 'warrior',
    'paladin': 'paladin',
    'hunter': 'hunter',
    'rogue': 'rogue',
    'priest': 'priest',
    'deathknight': 'deathknight',
    'shaman': 'shaman',
    'mage': 'mage',
    'warlock': 'warlock',
    'monk': 'monk',
    'druid': 'druid',
    'demonhunter': 'demonhunter',
    'evoker': 'evoker'
  };

  useEffect(() => {
    setShowCards(true);
  }, []);

  useEffect(() => {
    let rafId;
    const updateParallax = () => {
      if (heroRef.current) {
        const y = window.scrollY || 0;
        heroRef.current.style.setProperty('--hero-parallax', `${y}`);
      }
    };

    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (window.scrollY > 100) {
          setShowScrollIndicator(false);
        } else {
          setShowScrollIndicator(true);
        }

        updateParallax();

        if (cardsRef.current && !animateCards) {
          const rect = cardsRef.current.getBoundingClientRect();
          const isVisible = rect.top < window.innerHeight * 0.75;
          if (isVisible) setAnimateCards(true);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [animateCards]);

  const handleRandomTransmog = () => {
    const randomId = Math.floor(Math.random() * 13) + 1;
    navigate(`/transmog/${randomId}`);
  };

  const scrollToCards = () => {
    cardsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="home-bg">
      <section className="hero-section" ref={heroRef}>
        <div className="hero-content">
          <h1 className="hero-title">
            Explore epic transmogs that
            <br />
            define your style
          </h1>
          <div className="hero-buttons">
            <button className="hero-btn primary" onClick={scrollToCards}>
              Get Started
            </button>
            <button className="hero-btn secondary" onClick={() => navigate('/catalog')}>
              Browse Catalog
            </button>
          </div>
        </div>
        <div
          className={`scroll-indicator ${!showScrollIndicator ? 'hidden' : ''}`}
          onClick={scrollToCards}
        >
          <span>SCROLL TO EXPLORE</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14m0 0l7-7m-7 7l-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {showCards && (
        <main className="profile-cards-container" ref={cardsRef}>
          <div className={`cards-grid ${animateCards ? 'animate' : ''}`}>
            {warcraftClasses.map((cls, idx) => {
              const slug = cls.name.toLowerCase().replace(/ /g, '');
              const imageKey = classImageMap[slug] || slug;
              const src = imagesMap[imageKey] || `${process.env.PUBLIC_URL}/images/${imageKey}.jpg`;
              const isAboveFold = idx < 4;

              return (
                <div
                  key={cls.name}
                  className="card-item"
                  style={{ '--card-index': idx }}
                >
                  <ProfileCard
                    avatarUrl={src}
                    name={cls.name}
                    title={cls.role}
                    contactText="View Sets"
                    showUserInfo={true}
                    enableTilt={true}
                    enableMobileTilt={false}
                    className={`class-${slug}`}
                    onClick={() => navigate(`/catalog?class=${slug}`)}
                    onContactClick={() => navigate(`/catalog?class=${slug}`)}
                    behindGradient={`radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y), ${cls.color}66 4%, ${cls.color}44 10%, ${cls.color}22 50%, transparent 100%)`}
                    imageLoading={isAboveFold ? 'eager' : 'lazy'}
                    imageFetchPriority={isAboveFold ? 'high' : 'low'}
                    imageSizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
              );
            })}

            {/* Catalog Card */}
            <div
              className="card-item"
              style={{ '--card-index': warcraftClasses.length }}
            >
              <ProfileCard
                avatarUrl={imagesMap['catalog'] || `${process.env.PUBLIC_URL}/images/catalog.jpg`}
                name="Full Catalog"
                title="All Collections"
                contactText="Explore"
                showUserInfo={true}
                enableTilt={true}
                className="special-card catalog-card"
                onClick={() => navigate('/catalog')}
                onContactClick={() => navigate('/catalog')}
                behindGradient="radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y), #DAA52066 4%, #DAA52044 10%, #DAA52022 50%, transparent 100%)"
              />
            </div>

            {/* Random Card */}
            <div
              className="card-item"
              style={{ '--card-index': warcraftClasses.length + 1 }}
            >
              <ProfileCard
                avatarUrl={imagesMap['random'] || `${process.env.PUBLIC_URL}/images/random.jpg`}
                name="Feeling Lucky?"
                title="Random Discovery"
                contactText="Randomize"
                showUserInfo={true}
                enableTilt={true}
                className="special-card random-card"
                onClick={handleRandomTransmog}
                onContactClick={handleRandomTransmog}
                behindGradient="radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y), #FF006666 4%, #FF006644 10%, #FF006622 50%, transparent 100%)"
              />
            </div>
          </div>
          <NewsCarousel />
        </main>
      )}
    </div>
  );
}

export default Home;