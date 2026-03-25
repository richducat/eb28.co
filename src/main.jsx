import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Dashboard from './Dashboard';
import AppBuilderStudio from './AppBuilderStudio';
import FundManager from './FundManager';
import AlarmClock from './AlarmClock';
import './index.css';
import { applyDocumentSeo } from './seo.js';
import { detectRouteKey } from './siteMeta.js';

const root = ReactDOM.createRoot(document.getElementById('root'));
const pathname = window.location.pathname.toLowerCase().replace(/\/$/, "");
const hostname = window.location.hostname.toLowerCase();
const routeKey = detectRouteKey({ pathname, hostname });

const isDashboardRoute =
  pathname === '/dash' ||
  hostname === 'dashboard.eb28.co' ||
  hostname === 'command-center.eb28.co';
const isAppBuilderRoute = pathname === '/appbuilder';
const isFundManagerRoute =
  pathname === '/fundmanager' ||
  hostname === 'fundmanager.eb28.co';
const isAlarmClockRoute = pathname === '/alarmclock' || hostname === 'app.wakeupyabish.com';

applyDocumentSeo(routeKey);

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
} else if (isAlarmClockRoute) {
  root.render(
    <React.StrictMode>
      <AlarmClock />
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
