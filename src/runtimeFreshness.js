import { BUILD_ID, VERSION_FILE_PATH } from './buildMeta.js';

const BUILD_META_SELECTOR = 'meta[name="eb28-build-id"]';
const VERSION_QUERY_PARAM = '_eb28v';
const VERSION_SESSION_KEY = 'eb28-latest-build-refresh';

function getCurrentBuildId() {
  if (typeof document === 'undefined') {
    return BUILD_ID;
  }

  return document.head.querySelector(BUILD_META_SELECTOR)?.content || BUILD_ID;
}

function getServiceWorkerScriptUrl(registration) {
  return (
    registration.active?.scriptURL ||
    registration.waiting?.scriptURL ||
    registration.installing?.scriptURL ||
    ''
  );
}

async function clearBrowserCaches() {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return;
  }

  const keys = await window.caches.keys();
  await Promise.all(keys.map((key) => window.caches.delete(key)));
}

async function cleanupLegacyServiceWorkers({ hostname, isAlarmClockRoute }) {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    window.location.protocol !== 'https:'
  ) {
    return;
  }

  const isDedicatedAlarmHost = hostname === 'app.wakeupyabish.com';
  const registrations = await navigator.serviceWorker.getRegistrations();

  await Promise.all(
    registrations.map(async (registration) => {
      const scriptUrl = getServiceWorkerScriptUrl(registration);
      const isRootAlarmWorker = scriptUrl.endsWith('/sw.js');
      const isAlarmScopedWorker = scriptUrl.endsWith('/alarmclock/sw.js');

      if (isDedicatedAlarmHost) {
        if (isAlarmScopedWorker) {
          await registration.unregister();
        }
        return;
      }

      if (!isAlarmClockRoute && (isRootAlarmWorker || isAlarmScopedWorker)) {
        await registration.unregister();
        return;
      }

      if (
        isAlarmClockRoute &&
        isRootAlarmWorker &&
        registration.scope === `${window.location.origin}/`
      ) {
        await registration.unregister();
      }
    }),
  );
}

function maybeStripVersionParam(currentBuildId) {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  if (url.searchParams.get(VERSION_QUERY_PARAM) !== currentBuildId) {
    return;
  }

  url.searchParams.delete(VERSION_QUERY_PARAM);
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, '', nextUrl);
}

export async function ensureLatestBuild({
  hostname,
  isAlarmClockRoute,
  isNativeAlarmClockApp,
}) {
  if (typeof window === 'undefined') {
    return false;
  }

  const currentBuildId = getCurrentBuildId();
  maybeStripVersionParam(currentBuildId);

  try {
    await cleanupLegacyServiceWorkers({ hostname, isAlarmClockRoute });
  } catch (error) {
    console.warn('Service worker cleanup failed:', error);
  }

  if (import.meta.env.DEV || isNativeAlarmClockApp || window.location.protocol === 'file:') {
    return false;
  }

  try {
    const versionUrl = new URL(VERSION_FILE_PATH, window.location.origin);
    versionUrl.searchParams.set('_ts', Date.now().toString());

    const response = await fetch(versionUrl.toString(), {
      cache: 'no-store',
      headers: {
        'cache-control': 'no-cache',
      },
    });

    if (!response.ok) {
      return false;
    }

    const payload = await response.json();
    const latestBuildId = String(payload?.buildId || '').trim();

    if (!latestBuildId || latestBuildId === currentBuildId) {
      window.sessionStorage.removeItem(VERSION_SESSION_KEY);
      maybeStripVersionParam(currentBuildId);
      return false;
    }

    if (window.sessionStorage.getItem(VERSION_SESSION_KEY) === latestBuildId) {
      return false;
    }

    window.sessionStorage.setItem(VERSION_SESSION_KEY, latestBuildId);

    await cleanupLegacyServiceWorkers({ hostname, isAlarmClockRoute });
    await clearBrowserCaches();

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set(VERSION_QUERY_PARAM, latestBuildId);
    window.location.replace(nextUrl.toString());
    return true;
  } catch (error) {
    console.warn('Build freshness check failed:', error);
    return false;
  }
}
