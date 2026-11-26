import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './context/ToastContext.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CRM Uncaught UI Error:', error, errorInfo);
  }

  handleReset = () => {
    localStorage.clear();
    if (window.desktopAPI?.hardReload) {
      window.desktopAPI.hardReload();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '24px', fontFamily: 'sans-serif' }}>
          <div style={{ maxWidth: '480px', width: '100%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>Something went wrong</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              The application encountered an error while rendering.
            </p>
            <pre style={{ fontSize: '12px', color: '#be123c', background: '#fff1f2', padding: '12px', borderRadius: '8px', overflowX: 'auto', marginBottom: '16px' }}>
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  if (window.desktopAPI?.hardReload) {
                    window.desktopAPI.hardReload();
                  } else {
                    window.location.reload();
                  }
                }}
                style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
              >
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                style={{ padding: '8px 16px', background: '#f1f5f9', color: '#334155', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
              >
                Clear Cache & Restart
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Globally prevent mouse-wheel scrolling on number inputs from accidentally changing values
if (typeof window !== 'undefined') {
  window.addEventListener(
    'wheel',
    () => {
      if (document.activeElement && document.activeElement.type === 'number') {
        document.activeElement.blur();
      }
    },
    { passive: true }
  );

  document.addEventListener(
    'wheel',
    (e) => {
      if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'number') {
        e.target.blur();
      }
    },
    { passive: true }
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
)
