import React from 'react';
import './Footer.css';

const TelegramIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#e5d3b3" xmlns="http://www.w3.org/2000/svg" style={{verticalAlign: 'middle', marginRight: '6px'}}>
    <path d="M9.999 15.999l-.001-3.999 7.001-5.001-7.001 3.001-7.001-2.001 14.001-5.999-7.999 13.999z"/>
  </svg>
);

function Footer() {
  return (
    <footer className="site-footer">
      <a href="https://t.me/sssalvation" target="_blank" rel="noopener noreferrer">
        <TelegramIcon />
        @sssalvation
      </a>
      <span> | </span>
      <a href="https://t.me/Wellasosb" target="_blank" rel="noopener noreferrer">
        <TelegramIcon />
        @Wellasosb
      </a>
    </footer>
  );
}

export default Footer;