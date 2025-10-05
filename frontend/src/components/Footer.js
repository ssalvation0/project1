import React from 'react';
import './Footer.css';

const TelegramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161l-1.84 8.673c-.137.627-.503.781-.992.486l-2.738-2.02-1.32 1.27c-.146.147-.268.269-.551.269l.197-2.8 5.072-4.584c.22-.196-.048-.305-.341-.11l-6.27 3.948-2.7-.844c-.587-.184-.6-.587.123-.871l10.558-4.068c.489-.177.916.108.756.871z"/>
  </svg>
);

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <a 
          href="https://t.me/ssalvation" 
          target="_blank" 
          rel="noopener noreferrer"
          className="footer-link"
        >
          <TelegramIcon />
          <span>@ssalvation</span>
        </a>
        
        <a 
          href="https://t.me/Wellasosb" 
          target="_blank" 
          rel="noopener noreferrer"
          className="footer-link"
        >
          <TelegramIcon />
          <span>@Wellasosb</span>
        </a>
      </div>
    </footer>
  );
};

export default Footer;