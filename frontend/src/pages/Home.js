import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileCard from '../components/ProfileCard';
import NewsCarousel from '../components/NewsCarousel';
import OnboardingWizard from '../components/OnboardingWizard';
import FeaturedSection from '../components/FeaturedSection';
import PatchNotes from '../components/PatchNotes';
import '../styles/Home.css';

const imagesContext = require.context('../images', false, /\.(png|jpe?g|svg)$/);
const imagesMap = imagesContext.keys().reduce((map, filePath) => {
  const name = filePath.replace('./', '').replace(/\.(png|jpe?g|svg)$/, '');
  map[name] = imagesContext(filePath).default || imagesContext(filePath);
  return map;
}, {});

// Mock data generator for showcases
const generateMockTransmogs = (count, baseId, type) => {
  return Array.from({ length: count }, (_, i) => ({
    id: baseId + i,
    name: `${type} Set ${i + 1}`,
    class: ['Warrior', 'Paladin', 'Mage', 'Rogue'][i % 4],
    stars: 4 + (i % 2) * 0.5,
    votes: 10 + i * 5,
    image: imagesMap[['warrior', 'paladin', 'mage', 'rogue'][i % 4]] || process.env.PUBLIC_URL + '/images/warrior.jpg',
    source: i % 2 === 0 ? 'Raid' : 'PvP',
    expansion: 'Dragonflight'
  }));
};

const FEATURED_ITEMS = generateMockTransmogs(6, 100, 'Featured');
const TRENDING_ITEMS = generateMockTransmogs(6, 200, 'Trending');

const CLASS_METADATA = {
  'Death Knight': {
    roles: ['Tank', 'DPS'],
    specs: ['Blood', 'Frost', 'Unholy'],
    bestSources: ['Icecrown Citadel', 'Naxxramas', 'Torghast'],
    accent: '#C41F3B',
    title: 'Suffering Well'
  },
  'Paladin': {
    roles: ['Tank', 'Healer', 'DPS'],
    specs: ['Holy', 'Protection', 'Retribution'],
    bestSources: ['Legion Order Hall', 'Tomb of Sargeras'],
    accent: '#F58CBA',
    title: 'Justice Demands Retribution'
  },
  'Warrior': {
    roles: ['Tank', 'DPS'],
    specs: ['Arms', 'Fury', 'Protection'],
    bestSources: ['Blackrock Foundry', 'Trial of Valor'],
    accent: '#C79C6E',
    title: 'For the Horde/Alliance!'
  },
  'Hunter': {
    roles: ['DPS'],
    specs: ['Beast Mastery', 'Marksmanship', 'Survival'],
    bestSources: ['Nighthold', 'Antorus'],
    accent: '#ABD473',
    title: 'Hunt or Be Hunted'
  },
  'Rogue': {
    roles: ['DPS'],
    specs: ['Assassination', 'Outlaw', 'Subtlety'],
    bestSources: ['Black Temple', 'Vault of the Incarnates'],
    accent: '#FFF569',
    title: 'From the Shadows'
  },
  'Priest': {
    roles: ['Healer', 'DPS'],
    specs: ['Discipline', 'Holy', 'Shadow'],
    bestSources: ['Ulduar', 'Tomb of Sargeras'],
    accent: '#FFFFFF',
    title: 'Light and Void'
  },
  'Shaman': {
    roles: ['Healer', 'DPS'],
    specs: ['Elemental', 'Enhancement', 'Restoration'],
    bestSources: ['Throne of Thunder', 'Firelands'],
    accent: '#0070DE',
    title: 'Elements Guide Me'
  },
  'Mage': {
    roles: ['DPS'],
    specs: ['Arcane', 'Fire', 'Frost'],
    bestSources: ['Dalaran', 'Firelands', 'Nighthold'],
    accent: '#40C7EB',
    title: 'Master of the Arcane'
  },
  'Warlock': {
    roles: ['DPS'],
    specs: ['Affliction', 'Demonology', 'Destruction'],
    bestSources: ['Black Temple', 'Hellfire Citadel'],
    accent: '#8787ED',
    title: 'Power Overwhelming'
  },
  'Monk': {
    roles: ['Tank', 'Healer', 'DPS'],
    specs: ['Brewmaster', 'Mistweaver', 'Windwalker'],
    bestSources: ['Throne of Thunder', 'Mogu’shan Vaults'],
    accent: '#00FF96',
    title: 'Balance in All Things'
  },
  'Druid': {
    roles: ['Tank', 'Healer', 'DPS'],
    specs: ['Balance', 'Feral', 'Guardian', 'Restoration'],
    bestSources: ['Emerald Nightmare', 'Firelands'],
    accent: '#FF7D0A',
    title: 'Nature Protects'
  },
  'Demon Hunter': {
    roles: ['Tank', 'DPS'],
    specs: ['Havoc', 'Vengeance'],
    bestSources: ['Nighthold', 'Black Temple'],
    accent: '#A330C9',
    title: 'I Am My Scars'
  },
  'Evoker': {
    roles: ['Healer', 'DPS'],
    specs: ['Devastation', 'Preservation', 'Augmentation'],
    bestSources: ['Vault of the Incarnates', 'Aberrus'],
    accent: '#33937F',
    title: 'Fly With Me'
  }
};

const warcraftClasses = [
  { name: 'Warrior' },
  { name: 'Paladin' },
  { name: 'Hunter' },
  { name: 'Rogue' },
  { name: 'Priest' },
  { name: 'Death Knight' },
  { name: 'Shaman' },
  { name: 'Mage' },
  { name: 'Warlock' },
  { name: 'Monk' },
  { name: 'Druid' },
  { name: 'Demon Hunter' },
  { name: 'Evoker' }
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
  const [isWizardOpen, setIsWizardOpen] = useState(false);
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

  const openWizard = useCallback(() => {
    setIsWizardOpen(true);
  }, []);

  // Memoize class cards to prevent re-renders
  const classCards = useMemo(() => {
    return warcraftClasses.map((cls, idx) => {
      const slug = cls.name.toLowerCase().replace(/ /g, '');
      const imageKey = classImageMap[slug] || slug;
      const src = imagesMap[imageKey] || `${process.env.PUBLIC_URL}/images/${imageKey}.jpg`;
      const isAboveFold = idx < 4;

      // Get metadata
      const meta = CLASS_METADATA[cls.name] || {};
      const accent = meta.accent || '#e5d3b3';

      return (
        <div
          key={cls.name}
          className="card-item"
          style={{ '--card-index': idx }}
        >
          <ProfileCard
            avatarUrl={src}
            name={cls.name}
            title={meta.title || cls.name}
            contactText="View Sets"
            showUserInfo={true}
            enableTilt={true}
            enableMobileTilt={false}
            className={`class-${slug}`}
            onClick={() => navigate(`/catalog?class=${slug}`)}
            onContactClick={() => navigate(`/catalog?class=${slug}`)}
            behindGradient={`radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y), ${accent}66 4%, ${accent}44 10%, ${accent}22 50%, transparent 100%)`}
            imageLoading={isAboveFold ? 'eager' : 'lazy'}
            imageFetchPriority={isAboveFold ? 'high' : 'low'}
            imageSizes="(max-width: 768px) 50vw, 25vw"
            imageWidth={400}
            imageHeight={600}
            roles={meta.roles}
            specs={meta.specs}
            bestSources={meta.bestSources}
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
            <button className="hero-btn primary" onClick={openWizard}>
              Start Transmog Build
            </button>
            <button className="hero-btn secondary" onClick={navigateToCatalog}>
              Browse All Sets
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

          {/* Featured Showcase */}
          <div className={`showcase-wrapper ${animateCards ? 'animate' : ''}`}>
            <FeaturedSection
              title="Featured This Week"
              tagline="Curated sets from the community"
              items={FEATURED_ITEMS}
              viewAllLink="/catalog?sort=featured"
            />
          </div>

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

          {/* Trending Showcase */}
          <div className={`showcase-wrapper ${animateCards ? 'animate' : ''}`}>
            <FeaturedSection
              title="Trending Now"
              tagline="Highest rated by the community"
              items={TRENDING_ITEMS}
              viewAllLink="/catalog?sort=top_rated"
            />
          </div>

          <PatchNotes />

          <div
            ref={newsRef}
            className={`news-section-wrapper ${animateNews ? 'animate' : ''}`}
          >
            <NewsCarousel />
          </div>
        </main>
      )}

      {/* Onboarding Wizard */}
      <OnboardingWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />
    </div>
  );
}

export default React.memo(Home);