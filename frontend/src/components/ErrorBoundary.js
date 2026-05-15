import React from 'react';
import './ErrorBoundary.css';

/**
 * Top-level error boundary. Catches React render errors below it and shows
 * a "something went wrong" panel with a reload button instead of a blank
 * page. Sentry (when configured) still receives the error via the global
 * window error handler — this is purely the user-visible fallback.
 */
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

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2 className="error-boundary__heading">Something went wrong</h2>
          <p className="error-boundary__text">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button className="error-boundary__btn" onClick={this.handleReload}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
