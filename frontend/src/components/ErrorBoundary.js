import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          textAlign: 'center',
        }}>
          <h2 style={{
            fontFamily: "'Cinzel', serif",
            color: '#f2e6c9',
            fontSize: '1.5rem',
            marginBottom: '12px',
          }}>Something went wrong</h2>
          <p style={{
            fontFamily: "'Raleway', sans-serif",
            color: 'rgba(229,211,179,0.6)',
            marginBottom: '24px',
          }}>An unexpected error occurred. Please try refreshing the page.</p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              border: '1px solid rgba(200,160,40,0.4)',
              background: 'rgba(86,68,34,0.85)',
              color: '#fff1c7',
              fontFamily: "'Cinzel', serif",
              fontSize: '0.95rem',
              cursor: 'pointer',
            }}
          >Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
