import React, { createContext, useContext, useCallback, useMemo, useState, useRef, useEffect } from 'react';
import './ToastProvider.css';

const ToastContext = createContext({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, opts = {}) => {
    const id = ++idRef.current;
    const toast = {
      id,
      message: String(message || ''),
      type: opts.type || 'info', // 'success' | 'error' | 'info'
      duration: typeof opts.duration === 'number' ? opts.duration : 2500,
    };
    setToasts((prev) => [...prev, toast]);
    if (toast.duration > 0) {
      setTimeout(() => remove(id), toast.duration);
    }
  }, [remove]);

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
          <div key={t.id} className={`toast ${t.type}`} role="status">
            <span className="toast-message">{t.message}</span>
            <button className="toast-close" onClick={() => remove(t.id)} aria-label="Close notification">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
