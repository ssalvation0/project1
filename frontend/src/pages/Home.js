import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Home.css';

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

  // Блокуємо hover/pointer під час анімації появи карток
  useEffect(() => {
    if (!showCards) return;
    const container = cardsRef.current;
    if (!container) return;

    container.classList.add('animating'); // додає CSS-клас, який вимикає pointer-events

    const inners = Array.from(container.querySelectorAll('.class-card-inner'));
    let remaining = inners.length;
    const listeners = new Map();

    const onEnd = (ev) => {
      const el = ev.currentTarget;
      el.removeEventListener('animationend', listeners.get(el));
      listeners.delete(el);
      remaining -= 1;
      if (remaining <= 0) {
        container.classList.remove('animating');
        clearTimeout(fallback);
      }
    };

    inners.forEach(el => {
      const fn = onEnd.bind(null);
      listeners.set(el, fn);
      el.addEventListener('animationend', fn);
    });

    // fallback: якщо щось пішло не так, зняти блокування через 1.5s
    const fallback = setTimeout(() => {
      container.classList.remove('animating');
      listeners.forEach((fn, el) => el.removeEventListener('animationend', fn));
      listeners.clear();
    }, 1500);

    return () => {
      container.classList.remove('animating');
      listeners.forEach((fn, el) => el.removeEventListener('animationend', fn));
      listeners.clear();
      clearTimeout(fallback);
    };
  }, [showCards]);

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
          {warcraftClasses.map((cls, idx) => (
            <div
              className="class-card animated-card"
              key={cls}
              style={{
                backgroundImage: `url(/images/${cls.toLowerCase().replace(/ /g, '-')}.jpg)`,
                animationDelay: `${idx * 0.12}s`
              }}
            >
              <div className="class-card-inner" style={{ animationDelay: `${idx * 0.12}s` }}>
                <div className="class-card-text">{cls}</div>
              </div>
            </div>
          ))}
          {/* також для view-all / random-card: */}
          <div className="class-card view-all animated-card" style={{ animationDelay: `${warcraftClasses.length * 0.12}s` }}>
            <div className="class-card-inner" style={{ animationDelay: `${warcraftClasses.length * 0.12}s` }}>
              <a href="/catalog">Catalog</a>
            </div>
          </div>
          <div className="class-card random-card animated-card" style={{ animationDelay: `${(warcraftClasses.length + 1) * 0.12}s` }}>
            <div className="class-card-inner" style={{ animationDelay: `${(warcraftClasses.length + 1) * 0.12}s` }}>
              <button className="random-btn" onClick={handleRandomTransmog}>Random Transmog</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;