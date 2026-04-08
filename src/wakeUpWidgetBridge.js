import { Capacitor, registerPlugin } from '@capacitor/core';

const WakeUpWidgetBridge = Capacitor.isNativePlatform()
  ? registerPlugin('WakeUpWidgetBridge')
  : null;

export const syncWakeUpWidgetState = async (state) => {
  if (!WakeUpWidgetBridge) {
    return { synced: false, platform: Capacitor.getPlatform() };
  }

  return WakeUpWidgetBridge.syncWidgetState(state);
};
