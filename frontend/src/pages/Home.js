import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Home.css';

// автоматично завантажуємо всі зображення з src/images
const imagesContext = require.context('../images', false, /\.(png|jpe?g|svg)$/);
const imagesMap = imagesContext.keys().reduce((map, filePath) => {
  const name = filePath.replace('./', '').replace(/\.(png|jpe?g|svg)$/, ''); // наприклад "warrior"
  map[name] = imagesContext(filePath).default || imagesContext(filePath);
  return map;
}, {});

const warcraftClasses = [
  'Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Death Knight', 'Shaman',
  'Mage', 'Warlock', 'Monk', 'Druid', 'Demon Hunter', 'Evoker'
];

function Home() {
  const [showCards, setShowCards] = useState(false);
  const [spacerHeight, setSpacerHeight] = useState(0); // NEW
  const navigate = useNavigate();
  const centerRef = useRef(null);
  const cardsRef = useRef(null);

  useEffect(() => {
    const el = centerRef.current;
    if (!el) return;

    const buffer = 20; // px
    const canScroll = () => document.body.scrollHeight > window.innerHeight;
    const triggerAt = () => el.offsetTop + el.offsetHeight - buffer;

    const checkAndShow = () => {
      if ((window.scrollY || window.pageYOffset) >= triggerAt()) {
        setShowCards(true);
        return true;
      }
      return false;
    };

    // якщо сторінка коротка — додаємо spacer один раз, щоб можна було проскролити під заголовок
    if (!canScroll() && spacerHeight === 0) {
      const extra = Math.round(window.innerHeight * 0.6);
      setSpacerHeight(window.innerHeight + extra);
      // не повертаємось — слухачі реєструються далі
    }

    // Використовуємо IntersectionObserver щоб показати картки при прокрутці під блок
    let io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(entries => {
        const entry = entries[0];
        if (!entry) return;
        // коли низ centerRef опиняється під видимою зоною, показати картки
        if (entry.boundingClientRect.bottom <= window.innerHeight - buffer) {
          setShowCards(true);
          if (io) io.disconnect();
        }
      }, { threshold: [0, 0.01] });
      io.observe(el);
    }

    const onScroll = () => {
      if (checkAndShow()) {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    // початкова перевірка (на випадок, якщо сторінка вже проскролена)
    checkAndShow();

    return () => {
      if (io && io.disconnect) io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [spacerHeight]);

  const handleRandomTransmog = () => {
    const randomId = Math.floor(Math.random() * 13) + 1;
    navigate(`/transmog/${randomId}`);
  };

  return (
    <div className="home-bg">
      <div className="center-logo" ref={centerRef}>
        <div className="home-header">
          {/* заголовок */}
        </div>
      </div>

      {/* spacer removed to avoid extra empty space */}
      {showCards && (
        <div className="class-cards-grid three-rows" ref={cardsRef}>
          {warcraftClasses.map((cls, idx) => {
            const slug = cls.toLowerCase().replace(/ /g, '-');
            const src = cls === 'Warrior'
              ? (imagesMap['warrior'] || `${process.env.PUBLIC_URL}/images/warrior.jpg`)
              : (imagesMap[slug] || `${process.env.PUBLIC_URL}/images/${slug}.jpg`);
            return (
              <div
                className="class-card animated-card"
                key={cls}
                style={{
                  backgroundImage: `url(${src})`,
                  animationDelay: `${idx * 0.12}s`
                }}
                onAnimationEnd={(e) => {
                  // Після завершення анімації видаляємо клас, щоб не конфліктувати з :hover
                  e.currentTarget.classList.remove('animated-card');
                }}
              >
                <div className="class-card-text">{cls}</div>
              </div>
            );
          })}
          <div 
            className="class-card view-all animated-card" 
            style={{ animationDelay: `${warcraftClasses.length * 0.12}s` }}
            onAnimationEnd={(e) => e.currentTarget.classList.remove('animated-card')}
          >
            <a href="/catalog">Catalog</a>
          </div>
          <div 
            className="class-card random-card animated-card" 
            style={{ animationDelay: `${(warcraftClasses.length + 1) * 0.12}s` }}
            onAnimationEnd={(e) => e.currentTarget.classList.remove('animated-card')}
          >
            <button className="random-btn" onClick={handleRandomTransmog}>Random Transmog</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;