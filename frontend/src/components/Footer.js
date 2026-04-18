import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const TelegramIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161l-1.84 8.673c-.137.627-.503.781-.992.486l-2.738-2.02-1.32 1.27c-.146.147-.268.269-.551.269l.197-2.8 5.072-4.584c.22-.196-.048-.305-.341-.11l-6.27 3.948-2.7-.844c-.587-.184-.6-.587.123-.871l10.558-4.068c.489-.177.916.108.756.871z"/>
  </svg>
);

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-col footer-col--brand">
          <span className="footer-brand">TransmogVault</span>
          <p className="footer-tagline">
            A fan-made catalog for World of Warcraft transmog collectors.
          </p>
        </div>

        <div className="footer-col">
          <h4 className="footer-heading">Explore</h4>
          <Link to="/catalog" className="footer-link">Catalog</Link>
          <Link to="/collections" className="footer-link">Collections</Link>
          <Link to="/favorites" className="footer-link">Favorites</Link>
        </div>

        <div className="footer-col">
          <h4 className="footer-heading">Support</h4>
          <a href="https://t.me/ssalvation" target="_blank" rel="noopener noreferrer" className="footer-link">
            <TelegramIcon /> @ssalvation
          </a>
          <a href="https://t.me/Wellasosb" target="_blank" rel="noopener noreferrer" className="footer-link">
            <TelegramIcon /> @Wellasosb
          </a>
        </div>

        <div className="footer-col">
          <h4 className="footer-heading">Data</h4>
          <a href="https://www.wowhead.com/" target="_blank" rel="noopener noreferrer" className="footer-link">Wowhead</a>
          <a href="https://develop.battle.net/documentation" target="_blank" rel="noopener noreferrer" className="footer-link">Blizzard API</a>
        </div>
      </div>

      <div className="footer-legal">
        <p>
          World of Warcraft and Blizzard Entertainment are trademarks or registered
          trademarks of Blizzard Entertainment, Inc. TransmogVault is a fan project
          and is not affiliated with or endorsed by Blizzard Entertainment.
        </p>
        <p className="footer-copy">© {new Date().getFullYear()} TransmogVault</p>
      </div>
    </footer>
  );
};

export default Footer;
