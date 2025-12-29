import React, { createContext, useContext, useCallback, useMemo, useState, useRef, useEffect } from 'react';
import './ToastProvider.css';

const ToastContext = createContext({ showToast: () => { } });

export function useToast() {
  return useContext(ToastContext);
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  // Start exit animation, then remove after animation completes
  const startExit = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => t.id === id ? { ...t, exiting: true } : t)
    );
    // Remove from DOM after exit animation (300ms)
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const showToast = useCallback((message, opts = {}) => {
    const id = ++idRef.current;
    const toast = {
      id,
      message: String(message || ''),
      type: opts.type || 'info', // 'success' | 'error' | 'info'
      duration: typeof opts.duration === 'number' ? opts.duration : 2500,
      exiting: false,
    };
    setToasts((prev) => [...prev, toast]);
    if (toast.duration > 0) {
      setTimeout(() => startExit(id), toast.duration);
    }
  }, [startExit]);

  // Auto-remove on route change visibility (defensive)
  useEffect(() => {
    const onBlur = () => setToasts([]);
    window.addEventListener('beforeunload', onBlur);
    return () => window.removeEventListener('beforeunload', onBlur);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast ${t.type} ${t.exiting ? 'exiting' : ''}`}
            role="status"
          >
            <span className="toast-message">{t.message}</span>
            <button
              className="toast-close"
              onClick={() => startExit(t.id)}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
