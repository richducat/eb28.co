import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Dashboard from './Dashboard';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
const pathname = window.location.pathname;
const hostname = window.location.hostname;
const isDashboardRoute =
  pathname === '/dash' ||
  pathname === '/dash/' ||
  hostname === 'dashboard.eb28.co';

if (isDashboardRoute) {
  root.render(
    <React.StrictMode>
      <Dashboard />
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
