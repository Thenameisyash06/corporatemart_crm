import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const toast = {
  success: (message, title = 'Success') => {
    window.dispatchEvent(
      new CustomEvent('cm_toast_event', {
        detail: { type: 'success', title, message: String(message) },
      })
    );
  },
  error: (message, title = 'Operation Failed') => {
    window.dispatchEvent(
      new CustomEvent('cm_toast_event', {
        detail: { type: 'error', title, message: String(message) },
      })
    );
  },
  info: (message, title = 'Information') => {
    window.dispatchEvent(
      new CustomEvent('cm_toast_event', {
        detail: { type: 'info', title, message: String(message) },
      })
    );
  },
  warning: (message, title = 'Attention') => {
    window.dispatchEvent(
      new CustomEvent('cm_toast_event', {
        detail: { type: 'warning', title, message: String(message) },
      })
    );
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'info', title, message, duration = 5000 }) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast = { id, type, title, message, duration, createdAt: Date.now() };

    setToasts((prev) => [newToast, ...prev].slice(0, 5)); // Keep max 5 visible toasts

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  useEffect(() => {
    const handleEvent = (e) => {
      if (e.detail) {
        addToast(e.detail);
      }
    };
    window.addEventListener('cm_toast_event', handleEvent);
    return () => window.removeEventListener('cm_toast_event', handleEvent);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, toast }}>
      {children}
      {/* Toast Notification Container */}
      <aside
        aria-live="polite"
        className="fixed top-4 right-4 sm:top-5 sm:right-5 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-[92vw] sm:w-[400px] pointer-events-none"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </aside>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast: t, onClose }) {
  const isError = t.type === 'error';
  const isSuccess = t.type === 'success';
  const isWarning = t.type === 'warning';

  let borderClass = 'border-slate-200 bg-white text-slate-900';
  let badgeClass = 'bg-slate-100 text-slate-700';
  let progressBg = 'bg-slate-700';
  let Icon = Info;
  let iconColor = 'text-sky-500';

  if (isSuccess) {
    borderClass = 'border-emerald-200 bg-emerald-50/95 text-emerald-950 shadow-emerald-900/10';
    badgeClass = 'bg-emerald-100 text-emerald-800 border border-emerald-300/60';
    progressBg = 'bg-emerald-500';
    Icon = CheckCircle2;
    iconColor = 'text-emerald-600';
  } else if (isError) {
    borderClass = 'border-rose-200 bg-rose-50/95 text-rose-950 shadow-rose-900/10';
    badgeClass = 'bg-rose-100 text-rose-800 border border-rose-300/60';
    progressBg = 'bg-rose-500';
    Icon = AlertCircle;
    iconColor = 'text-rose-600';
  } else if (isWarning) {
    borderClass = 'border-amber-200 bg-amber-50/95 text-amber-950 shadow-amber-900/10';
    badgeClass = 'bg-amber-100 text-amber-800 border border-amber-300/60';
    progressBg = 'bg-amber-500';
    Icon = AlertTriangle;
    iconColor = 'text-amber-600';
  } else {
    borderClass = 'border-indigo-200 bg-indigo-50/95 text-indigo-950 shadow-indigo-900/10';
    badgeClass = 'bg-indigo-100 text-indigo-800 border border-indigo-300/60';
    progressBg = 'bg-indigo-500';
    Icon = Info;
    iconColor = 'text-indigo-600';
  }

  return (
    <div
      role="alert"
      className={`pointer-events-auto rounded-xl border p-3.5 shadow-xl transition-all duration-200 backdrop-blur-md transform animate-in fade-in slide-in-from-top-3 flex flex-col relative overflow-hidden ${borderClass}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-1 rounded-lg shrink-0 mt-0.5">
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold leading-tight tracking-tight">{t.title}</h4>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold uppercase tracking-wider ${badgeClass}`}>
              {t.type}
            </span>
          </div>
          <p className="text-xs mt-1 leading-relaxed opacity-90 break-words font-medium">
            {t.message}
          </p>
        </div>
        <button
          onClick={onClose}
          type="button"
          aria-label="Dismiss notification"
          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-black/5 rounded-lg transition shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Subtle Auto-dismiss Progress Bar */}
      {t.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 overflow-hidden">
          <div
            className={`h-full ${progressBg} origin-left transition-all`}
            style={{
              animation: `toastProgress ${t.duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      addToast: () => {},
      removeToast: () => {},
      toast,
    };
  }
  return context;
}

export default ToastContext;
