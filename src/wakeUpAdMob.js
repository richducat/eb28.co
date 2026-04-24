import { Capacitor, registerPlugin } from '@capacitor/core';

const WakeUpAdMob = Capacitor.isNativePlatform()
  ? registerPlugin('WakeUpAdMob')
  : null;

// The publisher line belongs in app-ads.txt. Development still uses Google's
// published iOS test banner configuration, while production uses the live
// AdMob app and banner ids from the approved account.
export const WAKE_UP_ADS = Object.freeze({
  publisherLine: 'google.com, pub-9665484869013517, DIRECT, f08c47fec0942fa0',
  productionAppId: 'ca-app-pub-9665484869013517~7542730122',
  productionBannerAdUnitId: 'ca-app-pub-9665484869013517/8527770042',
  testAppId: 'ca-app-pub-3940256099942544~1458002511',
  testBannerAdUnitId: 'ca-app-pub-3940256099942544/2435281174'
});

const getConfiguredNativeBannerAdUnitId = () => (
  import.meta.env.DEV
    ? WAKE_UP_ADS.testBannerAdUnitId
    : WAKE_UP_ADS.productionBannerAdUnitId
);

export const hasConfiguredWakeUpAdMobBanner = Boolean(getConfiguredNativeBannerAdUnitId());

const hiddenBannerLayout = Object.freeze({
  visible: false,
  bannerHeight: 0,
  bannerWidth: 0,
  safeAreaBottom: 0
});

export const syncWakeUpAdBanner = async ({ visible }) => {
  if (!WakeUpAdMob) {
    return {
      ...hiddenBannerLayout,
      canRequestAds: false,
      privacyOptionsRequired: false
    };
  }

  if (!visible || !hasConfiguredWakeUpAdMobBanner) {
    return WakeUpAdMob.hideBanner();
  }

  return WakeUpAdMob.showBanner({
    adUnitId: getConfiguredNativeBannerAdUnitId(),
    isTest: import.meta.env.DEV
  });
};

export const presentWakeUpAdPrivacyOptions = async () => {
  if (!WakeUpAdMob) {
    return {
      presented: false,
      available: false,
      privacyOptionsRequired: false
    };
  }

  return WakeUpAdMob.presentPrivacyOptions();
};
