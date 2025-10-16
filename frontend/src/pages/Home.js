import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Home.css';

// автоматично завантажуємо всі зображення з src/images
const imagesContext = require.context('../images', false, /\.(png|jpe?g|svg)$/);
const imagesMap = imagesContext.keys().reduce((map, filePath) => {
  const name = filePath.replace('./', '').replace(/\.(png|jpe?g|svg)$/, '');
  map[name] = imagesContext(filePath).default || imagesContext(filePath);
  return map;
}, {});

const warcraftClasses = [
  'Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Death Knight', 'Shaman',
  'Mage', 'Warlock', 'Monk', 'Druid', 'Demon Hunter', 'Evoker'
];

function Home() {
  const [showCards, setShowCards] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const navigate = useNavigate();
  const cardsRef = useRef(null);

  // Маппінг назв класів до назв файлів зображень
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
    const timer = setTimeout(() => {
      setShowCards(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Відстеження скролу для приховування індикатора
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setShowScrollIndicator(false);
      } else {
        setShowScrollIndicator(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleRandomTransmog = () => {
    const randomId = Math.floor(Math.random() * 13) + 1;
    navigate(`/transmog/${randomId}`);
  };

  const scrollToCards = () => {
    cardsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="home-bg">
      {/* Привітальний блок */}
      <section className="hero-section">
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
            <path d="M12 5v14m0 0l7-7m-7 7l-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </section>

      {/* Картки класів */}
      {showCards && (
        <div className="class-cards-grid three-rows" ref={cardsRef}>
          {warcraftClasses.map((cls, idx) => {
            const slug = cls.toLowerCase().replace(/ /g, '');
            const imageKey = classImageMap[slug] || slug;
            const src = imagesMap[imageKey] || `${process.env.PUBLIC_URL}/images/${imageKey}.jpg`;
            
            return (
              <div
                className="class-card animated-card"
                key={cls}
                data-class={slug}
                style={{
                  backgroundImage: `url(${src})`,
                  animationDelay: `${idx * 0.12}s`
                }}
                onClick={() => navigate(`/catalog?class=${slug}`)}
                onAnimationEnd={(e) => {
                  e.currentTarget.classList.remove('animated-card');
                }}
              >
                <div className="class-card-text">{cls}</div>
              </div>
            );
          })}
          <div 
            className="class-card view-all animated-card" 
            style={{ 
              backgroundImage: `url(${imagesMap['catalog'] || `${process.env.PUBLIC_URL}/images/catalog.jpg`})`,
              animationDelay: `${warcraftClasses.length * 0.12}s` 
            }}
            onAnimationEnd={(e) => e.currentTarget.classList.remove('animated-card')}
            onClick={() => navigate('/catalog')}
          >
            <div className="class-card-text">Catalog</div>
          </div>
          <div 
            className="class-card random-card animated-card" 
            style={{ 
              backgroundImage: `url(${imagesMap['random'] || `${process.env.PUBLIC_URL}/images/random.jpg`})`,
              animationDelay: `${(warcraftClasses.length + 1) * 0.12}s` 
            }}
            onAnimationEnd={(e) => e.currentTarget.classList.remove('animated-card')}
          >
            <div className="class-card-text">
              <button className="random-btn" onClick={handleRandomTransmog}>Random Transmog</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;