import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          color: '#ff5555', 
          backgroundColor: '#000', 
          height: '100vh', 
          width: '100vw', 
          padding: '2rem', 
          boxSizing: 'border-box', 
          fontFamily: 'monospace',
          overflow: 'auto',
          zIndex: 9999,
          position: 'relative'
        }}>
          <h1 style={{fontSize: '1.5rem', marginBottom: '1rem'}}>Runtime Error</h1>
          <p style={{marginBottom: '1rem'}}>The application crashed with the following error:</p>
          <pre style={{
            backgroundColor: '#111', 
            padding: '1rem', 
            borderRadius: '4px', 
            overflowX: 'auto',
            border: '1px solid #333'
          }}>
            {this.state.error?.toString()}
          </pre>
          <details style={{marginTop: '1rem'}}>
            <summary style={{cursor: 'pointer', color: '#888'}}>Stack Trace</summary>
            <pre style={{fontSize: '0.8rem', marginTop: '0.5rem', color: '#aaa'}}>
              {this.state.error?.stack}
            </pre>
          </details>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '2rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#333',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);