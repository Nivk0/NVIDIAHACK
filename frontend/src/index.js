import React from 'react';
import ReactDOM from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const domain = process.env.REACT_APP_AUTH0_DOMAIN;
const clientId = process.env.REACT_APP_AUTH0_CLIENT_ID;
const audience = process.env.REACT_APP_AUTH0_AUDIENCE;

// Debug: Log environment variables (remove in production)
console.log('🔍 Auth0 Environment Check:');
console.log('Domain:', domain || '❌ MISSING');
console.log('Client ID:', clientId ? `${clientId.substring(0, 10)}...` : '❌ MISSING');
console.log('Audience:', audience || '(not set)');

// Validate required environment variables
if (!domain || !clientId) {
  const errorMsg = `
    ⚠️ AUTH0 CONFIGURATION ERROR ⚠️
    
    Missing required environment variables!
    Domain: ${domain || 'undefined'}
    Client ID: ${clientId || 'undefined'}
    
    SOLUTION:
    1. Make sure .env file exists in frontend/ directory
    2. STOP your dev server (Ctrl+C)
    3. RESTART: npm start
    4. Environment variables only load on server startup!
    
    Your .env should contain:
    REACT_APP_AUTH0_DOMAIN=dev-w0z7um1c0uzv5dm8.us.auth0.com
    REACT_APP_AUTH0_CLIENT_ID=nCUpzsQCTZEyt6UyaJI2ravBdemFQ5Ex
  `;
  console.error(errorMsg);
  
  // Show error in UI without breaking React
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1a1a1a; color: #ff6b6b; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
        <div style="max-width: 600px; background: #0f0f0f; padding: 30px; border-radius: 8px; border: 2px solid #ff6b6b;">
          <h1 style="margin-top: 0; color: #ff6b6b;">⚠️ Auth0 Configuration Error</h1>
          <p><strong>Missing environment variables!</strong></p>
          <p style="background: #1a1a1a; padding: 10px; border-radius: 4px; font-family: monospace;">
            Domain: ${domain || 'undefined'}<br>
            Client ID: ${clientId || 'undefined'}
          </p>
          <hr style="border-color: #333; margin: 20px 0;">
          <h2 style="color: #fff;">Fix Steps:</h2>
          <ol style="line-height: 1.8;">
            <li>Make sure <code style="background: #1a1a1a; padding: 2px 6px; border-radius: 3px;">.env</code> file exists in <code style="background: #1a1a1a; padding: 2px 6px; border-radius: 3px;">frontend/</code> directory</li>
            <li><strong>STOP</strong> your dev server (Ctrl+C in terminal)</li>
            <li><strong>RESTART:</strong> <code style="background: #1a1a1a; padding: 2px 6px; border-radius: 3px;">npm start</code></li>
            <li>Environment variables only load when server starts!</li>
          </ol>
          <p style="margin-top: 20px; color: #888; font-size: 0.9rem;">Check browser console (F12) for more details.</p>
        </div>
      </div>
    `;
  }
  // Don't try to render React if env vars are missing
  throw new Error('Auth0 configuration missing. See console for details.');
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found. Make sure index.html has <div id="root"></div>');
}

const root = ReactDOM.createRoot(rootElement);

// Build authorization params, only include audience if it's set
const authorizationParams = {
  redirect_uri: window.location.origin,
};

if (audience) {
  authorizationParams.audience = audience;
}

root.render(
  <React.StrictMode>
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={authorizationParams}
      cacheLocation="localstorage"
    >
    <App />
    </Auth0Provider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
