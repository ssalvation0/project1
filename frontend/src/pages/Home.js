import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Home.css';

const warcraftClasses = [
  'Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Death Knight', 'Shaman',
  'Mage', 'Warlock', 'Monk', 'Druid', 'Demon Hunter', 'Evoker'
];

function Home() {
  const [showCards, setShowCards] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) setShowCards(true);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleRandomTransmog = () => {
    const randomId = Math.floor(Math.random() * 13) + 1;
    navigate(`/transmog/${randomId}`);
  };

  return (
    <div className="home-bg">
      <div style={{height: '2000px'}}></div>
      {showCards && (
        <div className="class-cards-grid three-rows">
          {warcraftClasses.map(cls => (
            <div className="class-card" key={cls} style={{ backgroundImage: `url(/images/${cls.toLowerCase().replace(/ /g, '-')}.jpg)` }}>
              <div className="class-card-text">{cls}</div>
            </div>
          ))}
          <div className="class-card view-all">
            <a href="/catalog">Catalog</a>
          </div>
          <div className="class-card random-card">
            <button className="random-btn" onClick={handleRandomTransmog}>
              Random Transmog
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;