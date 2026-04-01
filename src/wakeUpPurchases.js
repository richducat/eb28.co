import { Capacitor, registerPlugin } from '@capacitor/core';

export const REMOVE_ADS_PRODUCT_ID = 'com.eb28.alarmclock.removeads.monthly';
export const REMOVE_ADS_FALLBACK_PRICE = '$0.99';

const WakeUpPurchasesPlugin = Capacitor.isNativePlatform()
  ? registerPlugin('WakeUpPurchases')
  : null;

const fallbackProduct = Object.freeze({
  available: false,
  canMakePayments: false,
  isSubscribed: false,
  productId: REMOVE_ADS_PRODUCT_ID,
  displayName: 'Remove Ads',
  description: 'Hide sponsored panels and keep the clock clean.',
  displayPrice: REMOVE_ADS_FALLBACK_PRICE,
  subscriptionPeriodUnit: 'month',
  subscriptionPeriodValue: 1
});

export const getRemoveAdsCatalog = async () => {
  if (!WakeUpPurchasesPlugin) {
    return {
      available: false,
      canMakePayments: false,
      products: [fallbackProduct]
    };
  }

  return WakeUpPurchasesPlugin.getProducts({
    productIds: [REMOVE_ADS_PRODUCT_ID]
  });
};

export const getRemoveAdsStatus = async () => {
  if (!WakeUpPurchasesPlugin) {
    return { ...fallbackProduct };
  }

  return WakeUpPurchasesPlugin.getSubscriptionStatus({
    productId: REMOVE_ADS_PRODUCT_ID
  });
};

export const purchaseRemoveAdsSubscription = async () => {
  if (!WakeUpPurchasesPlugin) {
    throw new Error('Subscriptions are only available in the iOS app.');
  }

  return WakeUpPurchasesPlugin.purchaseSubscription({
    productId: REMOVE_ADS_PRODUCT_ID
  });
};

export const restoreRemoveAdsSubscription = async () => {
  if (!WakeUpPurchasesPlugin) {
    throw new Error('Restore is only available in the iOS app.');
  }

  return WakeUpPurchasesPlugin.restorePurchases({
    productId: REMOVE_ADS_PRODUCT_ID
  });
};

export const formatRemoveAdsPrice = (details) => {
  const price = details?.displayPrice || REMOVE_ADS_FALLBACK_PRICE;
  const unit = details?.subscriptionPeriodUnit || 'month';
  const value = Number(details?.subscriptionPeriodValue || 1);

  if (value > 1) {
    return `${price} / ${value} ${unit.toUpperCase()}S`;
  }

  return `${price} / ${unit.toUpperCase()}`;
};
