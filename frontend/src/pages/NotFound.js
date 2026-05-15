import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import './NotFound.css';

function NotFound() {
  const location = useLocation();

  return (
    <div className="notfound-page">
      <Helmet>
        <title>Page Not Found — TransmogVault</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="notfound-inner">
        <h1 className="notfound-code">404</h1>
        <h2 className="notfound-title">This appearance hasn't been catalogued</h2>
        <p className="notfound-text">
          The page <code>{location.pathname}</code> doesn't exist on TransmogVault.
          It may have been moved, or the link might be broken.
        </p>

        <div className="notfound-actions">
          <Link to="/" className="notfound-btn notfound-btn--primary">Back to Home</Link>
          <Link to="/catalog" className="notfound-btn">Browse Catalog</Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
