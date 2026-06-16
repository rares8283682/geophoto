import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2>Oops! Something went wrong. 😢</h2>
          <p>
            Please refresh the page or contact support at{' '}
            <a 
              href="mailto:rares-calin.olteanu@psl.eu" 
              style={{ color: '#0070f3', textDecoration: 'underline'}}
              
            >
              rares-calin.olteanu@psl.eu
            </a>.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
