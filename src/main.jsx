import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App';
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
const isFreeWebsiteBuildRoute =
  pathname === '/free-website-build' ||
  pathname === '/free-local-business-website';
const isGetStartedRoute = pathname === '/get-started';
const isWeedAuthorityRoute =
  pathname === '/weedauthority' ||
  pathname.startsWith('/weedauthority/') ||
  hostname === 'weedauthority.eb28.co' ||
  hostname === 'weedauthority.ed28.co';
const isCadetCatchRoute =
  pathname === '/cc' ||
  hostname === 'cadetcatch.com' ||
  hostname === 'www.cadetcatch.com';
const isAlarmClockRoute =
  isNativeAlarmClockApp ||
  pathname === '/alarmclock' ||
  isDedicatedAlarmClockHostname;
const isFindMyCustomersRoute =
  pathname === '/findmycustomers' ||
  hostname === 'findmycustomers.eb28.co';
const isWelcomeRoute =
  pathname === '/welcome' ||
  pathname.startsWith('/welcome/');
const isStartRoute =
  pathname === '/start' ||
  pathname === '/links';
const isDayTradingBotHost =
  hostname === 'daytradingbot.net' ||
  hostname === 'www.daytradingbot.net';
const isBluechipRoute =
  pathname === '/bluechip' ||
  pathname.startsWith('/bluechip/') ||
  (isDayTradingBotHost && (pathname === '' || pathname === '/'));
const isSetupPortalRoute =
  pathname === '/setup' ||
  pathname.startsWith('/setup/');

function renderComponent(Component) {
  root.render(
    <React.StrictMode>
      <Component />
    </React.StrictMode>
  );
}

async function renderRoute(loadComponent) {
  const module = await loadComponent();
  renderComponent(module.default);
}

async function renderApp() {
  if (isDashboardRoute) {
    await renderRoute(() => import('./Dashboard'));
    return;
  }

  if (isAppBuilderRoute) {
    await renderRoute(() => import('./AppBuilderStudio'));
    return;
  }

  if (isFundManagerRoute) {
    await renderRoute(() => import('./FundManager'));
    return;
  }

  if (isReconAgentRoute) {
    await renderRoute(() => import('./ReconAgentPage'));
    return;
  }

  if (isThomasCustomHomesRoute) {
    await renderRoute(() => import('./ThomasCustomHomesPage'));
    return;
  }

  if (isMelbourneWebStudioRoute) {
    await renderRoute(() => import('./MelbourneWebStudioPage.tsx'));
    return;
  }

  if (isFreeWebsiteBuildRoute) {
    await renderRoute(() => import('./FreeWebsiteBuildPage.jsx'));
    return;
  }

  if (isGetStartedRoute) {
    await renderRoute(() => import('./GetStartedPage.jsx'));
    return;
  }

  if (isWeedAuthorityRoute) {
    await renderRoute(() => import('./WeedAuthorityPage.jsx'));
    return;
  }

  if (isCadetCatchRoute) {
    await renderRoute(() => import('./CadetCatch'));
    return;
  }

  if (isAlarmClockRoute) {
    await renderRoute(() => import('./AlarmClock'));
    return;
  }

  if (isFindMyCustomersRoute) {
    await renderRoute(() => import('./FindMyCustomers/App.jsx'));
    return;
  }

  if (isWelcomeRoute) {
    await renderRoute(() => import('./WelcomePage.jsx'));
    return;
  }

  if (isStartRoute) {
    await renderRoute(() => import('./StartPage.jsx'));
    return;
  }

  if (isBluechipRoute) {
    await renderRoute(() => import('./BluechipPage.jsx'));
    return;
  }

  if (isSetupPortalRoute) {
    await renderRoute(() => import('./SetupPortal.jsx'));
    return;
  }

  renderComponent(App);
}

async function boot() {
  applyDocumentSeo({ pathname, hostname });
  await renderApp();

  void ensureLatestBuild({
    hostname,
    isAlarmClockRoute,
    isNativeAlarmClockApp,
  });
}

void boot();
