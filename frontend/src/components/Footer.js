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
      <div className="footer__inner">
        <div className="footer__brand">
          <span className="footer__brand-name">TransmogVault</span>
          <p className="footer__brand-text">
            A fan-made catalog for World of Warcraft transmog collectors.
          </p>
        </div>

        <div className="footer__section">
          <h4 className="footer__title">Explore</h4>
          <nav className="footer__nav" aria-label="Explore footer links">
            <Link to="/catalog" className="footer__link">Catalog</Link>
            <Link to="/collections" className="footer__link">Collections</Link>
            <Link to="/favorites" className="footer__link">Favorites</Link>
          </nav>
        </div>

        <div className="footer__section">
          <h4 className="footer__title">Support</h4>
          <nav className="footer__nav" aria-label="Support footer links">
            <a href="https://t.me/ssalvation" target="_blank" rel="noopener noreferrer" className="footer__link">
              <TelegramIcon /> <span>@ssalvation</span>
            </a>
            <a href="https://t.me/Wellasosb" target="_blank" rel="noopener noreferrer" className="footer__link">
              <TelegramIcon /> <span>@Wellasosb</span>
            </a>
          </nav>
        </div>

        <div className="footer__section">
          <h4 className="footer__title">Data</h4>
          <nav className="footer__nav" aria-label="Data source footer links">
            <a href="https://www.wowhead.com/" target="_blank" rel="noopener noreferrer" className="footer__link">Wowhead</a>
            <a href="https://develop.battle.net/documentation" target="_blank" rel="noopener noreferrer" className="footer__link">Blizzard API</a>
          </nav>
        </div>
      </div>

      <div className="footer__legal">
        <p className="footer__legal-text">
          World of Warcraft and Blizzard Entertainment are trademarks or registered
          trademarks of Blizzard Entertainment, Inc. TransmogVault is a fan project
          and is not affiliated with or endorsed by Blizzard Entertainment.
        </p>
        <p className="footer__copy">© {new Date().getFullYear()} TransmogVault</p>
      </div>
    </footer>
  );
};

export default Footer;
