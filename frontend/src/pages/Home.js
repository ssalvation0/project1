import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Home.css';

const imagesContext = require.context('../images', false, /\.(png|jpe?g|svg)$/);

// Кольори класів WoW
const classColors = {
  'warrior': '#C79C6E',
  'paladin': '#F58CBA',
  'hunter': '#ABD473',
  'rogue': '#FFF569',
  'priest': '#FFFFFF',
  'death-knight': '#C41F3B',
  'shaman': '#0070DE',
  'mage': '#69CCF0',
  'warlock': '#9482C9',
  'monk': '#00FF96',
  'druid': '#FF7D0A',
  'demon-hunter': '#A330C9',
  'evoker': '#33937F'
};

function Home() {
  const [showCards, setShowCards] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false); // новий стан
  const centerRef = useRef(null);
  const cardsRef = useRef(null);
  const navigate = useNavigate();

  const warcraftClasses = [
    'Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest',
    'Death Knight', 'Shaman', 'Mage', 'Warlock', 'Monk',
    'Druid', 'Demon Hunter', 'Evoker'
  ];

  const imagesMap = {};
  imagesContext.keys().forEach((key) => {
    const match = key.match(/\.\/(.+)\.(png|jpe?g|svg)$/);
    if (match) {
      const name = match[1].toLowerCase();
      imagesMap[name] = imagesContext(key);
    }
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCards(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Простий Intersection Observer
  useEffect(() => {
    if (!showCards || !cardsRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setCardsVisible(true);
          
          // Дозволяємо hover після завершення всіх анімацій
          setTimeout(() => {
            setAnimationComplete(true);
          }, 2000); // час на всі анімації (13 карток * 0.1s + 0.6s transition = ~2s)
          
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(cardsRef.current);
    return () => observer.disconnect();
  }, [showCards]);

  const handleRandomTransmog = () => {
    const randomClass = warcraftClasses[Math.floor(Math.random() * warcraftClasses.length)];
    const slug = randomClass.toLowerCase().replace(/ /g, '-');
    navigate(`/class/${slug}`);
  };

  return (
    <div className="home-bg">
      <div className="center-logo" ref={centerRef}>
        <div className="home-header">
          {/* заголовок */}
        </div>
      </div>

      {showCards && (
        <div className="class-cards-grid three-rows" ref={cardsRef}>
          {warcraftClasses.map((cls, idx) => {
            const slug = cls.toLowerCase().replace(/ /g, '-');
            const src = cls === 'Warrior'
              ? (imagesMap['warrior'] || `${process.env.PUBLIC_URL}/images/warrior.jpg`)
              : (imagesMap[slug] || `${process.env.PUBLIC_URL}/images/${slug}.jpg`);
            return (
              <div
                className={`class-card ${cardsVisible ? 'visible' : 'hidden'} ${animationComplete ? 'hover-enabled' : ''}`}
                key={cls}
                data-class={slug}
                style={{
                  backgroundImage: `url(${src})`,
                  '--class-color': classColors[slug] || '#e5d3b3',
                  '--animation-delay': `${idx * 0.1}s`
                }}
              >
                <div className="class-card-text">{cls}</div>
              </div>
            );
          })}
          
          {/* Catalog картка */}
          <div 
            className={`class-card view-all ${cardsVisible ? 'visible' : 'hidden'} ${animationComplete ? 'hover-enabled' : ''}`}
            style={{ 
              backgroundImage: `url(${imagesMap['catalog'] || `${process.env.PUBLIC_URL}/images/catalog.jpg`})`,
              '--class-color': '#e5d3b3',
              '--animation-delay': `${warcraftClasses.length * 0.1}s`
            }}
          >
            <div className="class-card-text">
              <a href="/catalog">Catalog</a>
            </div>
          </div>
          
          {/* Random картка */}
          <div 
            className={`class-card random-card ${cardsVisible ? 'visible' : 'hidden'} ${animationComplete ? 'hover-enabled' : ''}`}
            style={{ 
              backgroundImage: `url(${imagesMap['random'] || `${process.env.PUBLIC_URL}/images/random.jpg`})`,
              '--class-color': '#e5d3b3',
              '--animation-delay': `${(warcraftClasses.length + 1) * 0.1}s`
            }}
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