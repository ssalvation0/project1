import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileCard from '../components/ProfileCard';
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

function Home() {
  const [showCards, setShowCards] = useState(false);
  const [animateCards, setAnimateCards] = useState(false);
  const [animateNews, setAnimateNews] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const navigate = useNavigate();
  const cardsRef = useRef(null);
  const newsRef = useRef(null);
  const heroRef = useRef(null);

  // Track if animations have been triggered (only animate once)
  const animationsTriggeredRef = useRef({ cards: false, news: false });

  useEffect(() => {
    setShowCards(true);
  }, []);

  useEffect(() => {
    let rafId;
    let lastScrollY = 0;
    let ticking = false;

    const handleScroll = () => {
      lastScrollY = window.scrollY;

      if (!ticking) {
        rafId = requestAnimationFrame(() => {
          // Update scroll indicator
          setShowScrollIndicator(lastScrollY <= 100);

          // Parallax effect
          if (heroRef.current) {
            heroRef.current.style.setProperty('--hero-parallax', `${lastScrollY}`);
          }

          // Cards animation - only check if not yet triggered
          if (!animationsTriggeredRef.current.cards && cardsRef.current) {
            const rect = cardsRef.current.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.75) {
              animationsTriggeredRef.current.cards = true;
              setAnimateCards(true);
            }
          }

          // News animation - only check if not yet triggered
          if (!animationsTriggeredRef.current.news && newsRef.current) {
            const rect = newsRef.current.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.8) {
              animationsTriggeredRef.current.news = true;
              setAnimateNews(true);
            }
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []); // Empty deps - scroll handler doesn't need to re-register

  const handleRandomTransmog = useCallback(() => {
    const randomId = Math.floor(Math.random() * 13) + 1;
    navigate(`/transmog/${randomId}`);
  }, [navigate]);

  const scrollToCards = useCallback(() => {
    cardsRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const navigateToCatalog = useCallback(() => {
    navigate('/catalog');
  }, [navigate]);

  // Memoize class cards to prevent re-renders
  const classCards = useMemo(() => {
    return warcraftClasses.map((cls, idx) => {
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
            imageWidth={400}
            imageHeight={600}
          />
        </div>
      );
    });
  }, [navigate]);

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
            <button className="hero-btn secondary" onClick={navigateToCatalog}>
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
            {classCards}

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
                onClick={navigateToCatalog}
                onContactClick={navigateToCatalog}
                behindGradient="radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y), #DAA52066 4%, #DAA52044 10%, #DAA52022 50%, transparent 100%)"
                imageWidth={400}
                imageHeight={600}
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
                imageWidth={400}
                imageHeight={600}
              />
            </div>
          </div>
          <div
            ref={newsRef}
            className={`news-section-wrapper ${animateNews ? 'animate' : ''}`}
          >
            <NewsCarousel />
          </div>
        </main>
      )}
    </div>
  );
}

export default React.memo(Home);