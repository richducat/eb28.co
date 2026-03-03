import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Dashboard from './Dashboard';
import AppBuilderStudio from './AppBuilderStudio';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
const pathname = window.location.pathname;
const hostname = window.location.hostname;
const isDashboardRoute =
  pathname === '/dash' ||
  pathname === '/dash/' ||
  hostname === 'dashboard.eb28.co' ||
  hostname === 'command-center.eb28.co';
const isAppBuilderRoute = pathname === '/appbuilder' || pathname === '/appbuilder/';

if (isDashboardRoute) {
  root.render(
    <React.StrictMode>
      <Dashboard />
    </React.StrictMode>
  );
} else if (isAppBuilderRoute) {
  root.render(
    <React.StrictMode>
      <AppBuilderStudio />
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
