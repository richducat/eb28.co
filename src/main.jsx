import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Dashboard from './Dashboard';
import RorkStudio from './RorkStudio';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
const pathname = window.location.pathname;
const hostname = window.location.hostname;
const isDashboardRoute =
  pathname === '/dash' ||
  pathname === '/dash/' ||
  hostname === 'dashboard.eb28.co' ||
  hostname === 'command-center.eb28.co';
const isRorkRoute =
  pathname === '/rork' ||
  pathname === '/rork/' ||
  pathname === '/appbuilder' ||
  pathname === '/appbuilder/';

if (isDashboardRoute) {
  root.render(
    <React.StrictMode>
      <Dashboard />
    </React.StrictMode>
  );
} else if (isRorkRoute) {
  root.render(
    <React.StrictMode>
      <RorkStudio />
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
