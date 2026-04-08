import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App';
import Dashboard from './Dashboard';
import AppBuilderStudio from './AppBuilderStudio';
import FundManager from './FundManager';
import ReconAgentPage from './ReconAgentPage';
import AlarmClock from './AlarmClock';
import ThomasCustomHomesPage from './ThomasCustomHomesPage';
import MelbourneWebStudioPage from './MelbourneWebStudioPage.tsx';
import './index.css';
import { applyDocumentSeo } from './seo.js';
import { ensureLatestBuild } from './runtimeFreshness.js';

const root = ReactDOM.createRoot(document.getElementById('root'));
const pathname = window.location.pathname.toLowerCase().replace(/\/$/, "");
const hostname = window.location.hostname.toLowerCase();
const isNativeAlarmClockApp = Capacitor.isNativePlatform();
const isDedicatedAlarmClockHostname = hostname === 'app.wakeupyabish.com';

const isDashboardRoute =
  pathname === '/dash' ||
  hostname === 'dashboard.eb28.co' ||
  hostname === 'command-center.eb28.co';
const isAppBuilderRoute = pathname === '/appbuilder';
const isFundManagerRoute =
  pathname === '/fundmanager' ||
  hostname === 'fundmanager.eb28.co';
const isReconAgentRoute =
  pathname === '/reconcile' ||
  hostname === 'reconcile.eb28.co';
const isThomasCustomHomesRoute =
  pathname === '/tch' ||
  pathname.startsWith('/tch/') ||
  hostname === 'thomascustom.homes' ||
  hostname === 'www.thomascustom.homes';
const isMelbourneWebStudioRoute =
  pathname === '/melbournewebstudio' ||
  hostname === 'melbournewebstudio.eb28.co';
const isAlarmClockRoute =
  isNativeAlarmClockApp ||
  pathname === '/alarmclock' ||
  isDedicatedAlarmClockHostname;

function renderApp() {
  if (isDashboardRoute) {
    root.render(
      <React.StrictMode>
        <Dashboard />
      </React.StrictMode>
    );
    return;
  }

  if (isAppBuilderRoute) {
    root.render(
      <React.StrictMode>
        <AppBuilderStudio />
      </React.StrictMode>
    );
    return;
  }

  if (isFundManagerRoute) {
    root.render(
      <React.StrictMode>
        <FundManager />
      </React.StrictMode>
    );
    return;
  }

  if (isReconAgentRoute) {
    root.render(
      <React.StrictMode>
        <ReconAgentPage />
      </React.StrictMode>
    );
    return;
  }

  if (isThomasCustomHomesRoute) {
    root.render(
      <React.StrictMode>
        <ThomasCustomHomesPage />
      </React.StrictMode>
    );
    return;
  }

  if (isMelbourneWebStudioRoute) {
    root.render(
      <React.StrictMode>
        <MelbourneWebStudioPage />
      </React.StrictMode>
    );
    return;
  }

  if (isAlarmClockRoute) {
    root.render(
      <React.StrictMode>
        <AlarmClock />
      </React.StrictMode>
    );
    return;
  }

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

async function boot() {
  const redirectedToFreshBuild = await ensureLatestBuild({
    hostname,
    isAlarmClockRoute,
    isNativeAlarmClockApp,
  });

  if (redirectedToFreshBuild) {
    return;
  }

  applyDocumentSeo({ pathname, hostname });
  renderApp();
}

void boot();
