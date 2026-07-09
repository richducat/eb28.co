import { Capacitor, registerPlugin } from '@capacitor/core';

const WakeUpNativeAlarm = Capacitor.isNativePlatform()
  ? registerPlugin('WakeUpNativeAlarm')
  : null;

export const getWakeUpNativeAlarmAuthorization = async () => {
  if (!WakeUpNativeAlarm) {
    return { available: false, authorization: 'unavailable' };
  }

  return WakeUpNativeAlarm.getAuthorizationState();
};

export const requestWakeUpNativeAlarmAuthorization = async () => {
  if (!WakeUpNativeAlarm) {
    return { available: false, authorization: 'unavailable' };
  }

  return WakeUpNativeAlarm.requestAuthorization();
};

export const scheduleWakeUpNativeAlarm = async (options) => {
  if (!WakeUpNativeAlarm) {
    return { available: false, scheduled: false, authorization: 'unavailable' };
  }

  return WakeUpNativeAlarm.schedule(options);
};

export const cancelWakeUpNativeAlarm = async (id) => {
  if (!WakeUpNativeAlarm) {
    return { available: false, cancelled: false };
  }

  return WakeUpNativeAlarm.cancel({ id });
};
