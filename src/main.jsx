import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Dashboard from './Dashboard';
import AppBuilderStudio from './AppBuilderStudio';
import FundManager from './FundManager';
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
const isFundManagerRoute =
  pathname === '/fundmanager' ||
  pathname === '/fundmanager/' ||
  hostname === 'fundmanager.eb28.co';

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
} else if (isFundManagerRoute) {
  root.render(
    <React.StrictMode>
      <FundManager />
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
