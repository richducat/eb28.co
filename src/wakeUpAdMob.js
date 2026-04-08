import { Capacitor, registerPlugin } from '@capacitor/core';

const WakeUpAdMob = Capacitor.isNativePlatform()
  ? registerPlugin('WakeUpAdMob')
  : null;

// The publisher line the user provided belongs in app-ads.txt. Until the
// production AdMob app/unit IDs are available, the native bridge falls back to
// Google's published iOS test banner configuration so the integration can be
// verified safely in development.
export const WAKE_UP_ADS = Object.freeze({
  publisherLine: 'google.com, pub-9665484869013517, DIRECT, f08c47fec0942fa0',
  testAppId: 'ca-app-pub-3940256099942544~1458002511',
  testBannerAdUnitId: 'ca-app-pub-3940256099942544/2435281174'
});

const getConfiguredNativeBannerAdUnitId = () => (
  import.meta.env.DEV ? WAKE_UP_ADS.testBannerAdUnitId : null
);

export const hasConfiguredWakeUpAdMobBanner = Boolean(getConfiguredNativeBannerAdUnitId());

export const syncWakeUpAdBanner = async ({ visible }) => {
  if (!WakeUpAdMob) return { visible: false };

  if (!visible || !hasConfiguredWakeUpAdMobBanner) {
    return WakeUpAdMob.hideBanner();
  }

  return WakeUpAdMob.showBanner({
    adUnitId: getConfiguredNativeBannerAdUnitId(),
    isTest: import.meta.env.DEV
  });
};
