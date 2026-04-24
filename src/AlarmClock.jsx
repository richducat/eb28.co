import { Capacitor } from "@capacitor/core";
import { CalendarPermissionScope, CapacitorCalendar } from "@ebarooni/capacitor-calendar";
import { LocalNotifications } from "@capacitor/local-notifications";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

// iOS Background Persistence & Native Lock Screen Widget Enablers
let wakeLock = null;
const silentAudioElement = new Audio('/silence.mp3');
silentAudioElement.loop = true;
silentAudioElement.preload = 'auto';
silentAudioElement.playsInline = true;
let silentOscillator = null;

const armBackgroundEngine = async (titleStr) => {
  initAudioContext();
  try { silentAudioElement.play().catch(e => console.log('Silent bg blocked:', e)); } catch(e){}
  
  if (!silentOscillator && globalAudioCtx) {
    try {
      silentOscillator = globalAudioCtx.createOscillator();
      const gainNode = globalAudioCtx.createGain();
      gainNode.gain.value = 0.0001;
      silentOscillator.connect(gainNode);
      gainNode.connect(globalAudioCtx.destination);
      silentOscillator.start();
    } catch(e) {}
  }

  if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
    try { Notification.requestPermission(); } catch(e){}
  }
  if ('wakeLock' in navigator && !wakeLock) {
    try { wakeLock = await navigator.wakeLock.request('screen'); } catch (err) {}
  }
  if ('mediaSession' in navigator && typeof window.MediaMetadata === 'function') {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `WAKE UP YA BISH ALARM`,
      artist: titleStr,
      album: 'Habit Mastery Protocol',
      artwork: [{ src: 'https://wakeupyabish.com/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }]
    });
    navigator.mediaSession.setActionHandler('play', () => {});
    navigator.mediaSession.setActionHandler('pause', () => {});
  }
};

const disarmBackgroundEngine = async () => {
  try { silentAudioElement.pause(); } catch(e){}
  if (silentOscillator) {
    try { silentOscillator.stop(); silentOscillator.disconnect(); } catch(e){}
    silentOscillator = null;
  }
  if (wakeLock) { await wakeLock.release().catch(console.error); wakeLock = null; }
  if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
};
import { Settings, User, Lock, BellRing, ListTodo } from 'lucide-react';
import habitSteps from './data/67steps.json';
import tacticalNukeUrl from './assets/tactical_nuke.mp3';
import quarteredAtDawnUrl from './assets/Quartered_at_Dawn.mp3';
import matterOfSpiteUrl from './assets/A_Matter_of_Spite.mp3';
import rainbowBunnyUrl from './assets/rainbowbunnyboi.mp3';
import zenUrl from './assets/zenalarm.mp3';
import metalWakeupUrl from './assets/metal_wakeup_track.mp3';
import trapWakeupUrl from './assets/trap_wakeup.mp3';
import breakUrl from './assets/take_a_break.mp3';
import {
  formatRemoveAdsPrice,
  getRemoveAdsCatalog,
  getRemoveAdsStatus,
  purchaseRemoveAdsSubscription,
  restoreRemoveAdsSubscription
} from './wakeUpPurchases';
import {
  hasConfiguredWakeUpAdMobBanner,
  presentWakeUpAdPrivacyOptions,
  syncWakeUpAdBanner
} from './wakeUpAdMob';
import { syncWakeUpWidgetState } from './wakeUpWidgetBridge';

const ALARM_VOICES = [
  { id: 'standard', name: 'Classic Beep', type: 'free', icon: '🔔', sample: 'Standard digital clock piezo buzzer.', category: 'calm' },
  { id: 'zen', name: 'Zen Master', type: 'free', icon: '☯️', sample: 'Zen meditation bells audio.', category: 'calm' },
  { id: 'nuclear', name: 'Nuclear Siren', type: 'premium', icon: '☢️', sample: 'High-frequency klaxon sweep.', category: 'motivational' },
  { id: 'quarter', name: 'Wake up or else', type: 'premium', icon: '💀', sample: 'Quartered at Dawn audio.', category: 'motivational' },
  { id: 'spite', name: 'Spiteful Pomodoro', type: 'premium', icon: '🍅', sample: 'A Matter of Spite.', category: 'motivational' },
  { id: 'rainbow', name: '80s Rainbow Bunny Anthem', type: 'premium', icon: '🐰', sample: 'Rainbow Bunny!', category: 'motivational' },
  { id: 'metal', name: 'Heavy Metal Wakeup', type: 'premium', icon: '🎸', sample: 'Heavy metal vibes!', category: 'motivational' },
  { id: 'trap', name: 'TrapBoi Wake Up Anthem', type: 'premium', icon: '🔥', sample: 'Trap 808s!', category: 'motivational' },
  { id: 'break', name: 'Take a break bish', type: 'premium', icon: '🛑', sample: 'Take a break!', category: 'motivational' },
];

const NATIVE_NOTIFICATION_SOUND_MAP = {
  standard: 'alarm_standard.caf',
  zen: 'alarm_zen.caf',
  nuclear: 'alarm_nuclear.caf',
  quarter: 'alarm_quarter.caf',
  spite: 'alarm_spite.caf',
  rainbow: 'alarm_rainbow.caf',
  metal: 'alarm_metal.caf',
  trap: 'alarm_trap.caf',
  break: 'alarm_break.caf'
};

const getNativeNotificationSound = (voiceId) => (
  NATIVE_NOTIFICATION_SOUND_MAP[voiceId] || NATIVE_NOTIFICATION_SOUND_MAP.standard
);

const NATIVE_ALARM_NOTIFICATION_ID = 1;
const NATIVE_NOTIFICATION_TEST_ID = 99;

let globalAudioCtx = null;

const cancelSpeechSynthesis = () => {
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (err) {
      console.warn('Speech synthesis cancel failed', err);
    }
  }
};

const toCountdownDate = (value) => {
  if (!value) return null;
  const countdownDate = value instanceof Date ? value : new Date(value);
  return Number.isNaN(countdownDate.getTime()) ? null : countdownDate;
};

export const initAudioContext = () => {
  if (!globalAudioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      globalAudioCtx = new AudioContext();
    }
  }
  if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume();
  }
};

const synthesizeRetroAlarm = (type) => {
  initAudioContext();
  if (!globalAudioCtx) return null;
  const ctx = globalAudioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;

  if (type === 'standard') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, now);
    for(let i=0; i<8; i++) {
       const t = now + (i * 0.25);
       gain.gain.setValueAtTime(0, t);
       gain.gain.setValueAtTime(0.5, t + 0.05);
       gain.gain.setValueAtTime(0, t + 0.15);
    }
    osc.start(now);
    osc.stop(now + 2.0);

  } else {
    return null; 
  }

  return {
    osc,
    pause: () => {
      try { osc.onended = null; osc.stop(); } catch(e){}
    }
  };
};

const MOTIVATIONAL_PHRASES = [
  "RISE & GRIND!",
  "STAY HUNGRY",
  "EMBRACE THE DAY",
  "YOUR GOALS WAIT",
  "NO EXCUSES",
  "KEEP PUSHING",
  "ELEVATE YOUR MIND"
];

const SPONSORED_MESSAGES = [
  {
    id: 'appbuilder',
    headline: 'EB28 APP BUILDER',
    body: 'Spin rough ideas into live apps and AI tools faster than your morning coffee hits.',
    cta: 'OPEN BUILDER',
    url: 'https://eb28.co/appbuilder/'
  },
  {
    id: 'fundmanager',
    headline: 'FUND MANAGER LIVE',
    body: 'Check the autonomous desk feed and see how the other half wakes up.',
    cta: 'OPEN DASH',
    url: 'https://eb28.co/fundmanager/'
  },
  {
    id: 'upgrade',
    headline: 'CLEAN SCREEN MODE',
    body: 'Stay on the free tier with sponsor panels, or kill the noise with ad-free mode.',
    cta: 'REMOVE ADS',
    action: 'upgrade'
  }
];

const SUBSCRIPTION_PRIVACY_URL = 'https://eb28.co/alarmclock/privacy/';
const SUBSCRIPTION_TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

const DEFAULT_REMOVE_ADS_STATE = {
  available: false,
  canMakePayments: false,
  loading: false,
  isSubscribed: false,
  displayName: 'Remove Ads',
  description: 'Hide sponsored panels and keep the alarm dashboard clean.',
  displayPrice: '$0.99',
  subscriptionPeriodUnit: 'month',
  subscriptionPeriodValue: 1,
  errorMessage: ''
};

const COLOR_SCHEMES = {
  standard: { active: '#ffb3e6', shadow: '#ff00aa', inactive: '#550033', strokeActive: '#ff00aa', strokeInactive: '#33001a' },
  blue: { active: '#b3ecff', shadow: '#00ccff', inactive: '#004466', strokeActive: '#00ccff', strokeInactive: '#002233' },
  green: { active: '#b3ffcc', shadow: '#00ff88', inactive: '#006633', strokeActive: '#00ff88', strokeInactive: '#00331a' },
  red: { active: '#ffb3b3', shadow: '#ff3333', inactive: '#660000', strokeActive: '#ff3333', strokeInactive: '#330000' },
  yellow: { active: '#ffffb3', shadow: '#ffea00', inactive: '#665c00', strokeActive: '#ffea00', strokeInactive: '#332e00' },
  purple: { active: '#ebb3ff', shadow: '#aa00ff', inactive: '#440066', strokeActive: '#aa00ff', strokeInactive: '#220033' }
};

const DEFAULT_NATIVE_BANNER_LAYOUT = Object.freeze({
  visible: false,
  bannerHeight: 0,
  bannerWidth: 0,
  safeAreaBottom: 0
});

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeWidgetText = (value, maxLength) => {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
};

export default function AlarmClock() {
  const getSaved = (key, defaultVal) => {
    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? JSON.parse(saved) : defaultVal;
    } catch { return defaultVal; }
  };

  const getViewportHeight = () => {
    if (typeof window === 'undefined') return 900;
    const visualViewportHeight = Math.round(window.visualViewport?.height || 0);
    const innerHeight = Math.round(window.innerHeight || 0);
    return Math.min(
      visualViewportHeight || Number.POSITIVE_INFINITY,
      innerHeight || Number.POSITIVE_INFINITY
    );
  };

  const [colorSchemeKey, setColorSchemeKey] = useState(() => getSaved('eb28_color_scheme', 'standard'));
  useEffect(() => localStorage.setItem('eb28_color_scheme', JSON.stringify(colorSchemeKey)), [colorSchemeKey]);
  const [time, setTime] = useState(new Date());
  const [viewportHeight, setViewportHeight] = useState(() => getViewportHeight());
  const [countdownTarget, setCountdownTarget] = useState(null);
  const [customAudioMap, setCustomAudioMap] = useState({});
  const [activeAudioObj, setActiveAudioObj] = useState(null);
  const activeAudioRef = useRef(null);
  const alarmTimeInputRef = useRef(null);

  const safeSetAudio = (audioObj) => {
    setActiveAudioObj(audioObj);
    activeAudioRef.current = audioObj;
  };

  const safeStopAudio = () => {
    if (activeAudioRef.current) {
        try { activeAudioRef.current.pause(); } catch(e){}
        if (activeAudioRef.current.currentTime !== undefined) activeAudioRef.current.currentTime = 0;
        activeAudioRef.current = null;
    }
    setActiveAudioObj(null);
  };

  const [alarmHours, setAlarmHours] = useState(() => getSaved('eb28_alarm_hours', '06'));
  const [alarmMinutes, setAlarmMinutes] = useState(() => getSaved('eb28_alarm_minutes', '00'));
  const [alarmAmPm, setAlarmAmPm] = useState(() => getSaved('eb28_alarm_ampm', 'AM'));
  const [isAlarmActive, setIsAlarmActive] = useState(() => getSaved('eb28_alarm_active', false));
  const [isRinging, setIsRinging] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(() => getSaved('eb28_alarm_voice', ALARM_VOICES[0].id));
  const [isMuted, setIsMuted] = useState(() => getSaved('eb28_alarm_muted', false));
  const [hasNativeNotificationAccess, setHasNativeNotificationAccess] = useState(() => getSaved('eb28_notification_permission_granted', false));
  const [calendarPermissionState, setCalendarPermissionState] = useState(() => getSaved('eb28_calendar_permission_state', 'prompt'));
  const [removeAdsState, setRemoveAdsState] = useState(() => ({
    ...DEFAULT_REMOVE_ADS_STATE,
    ...getSaved('eb28_remove_ads_state', {})
  }));
  const [isPurchaseBusy, setIsPurchaseBusy] = useState(false);
  const [subscriptionMessage, setSubscriptionMessage] = useState('');
  const [notificationSetupMessage, setNotificationSetupMessage] = useState('');
  const [isNotificationSetupBusy, setIsNotificationSetupBusy] = useState(false);
  const [adPrivacyMessage, setAdPrivacyMessage] = useState('');
  const [isAdPrivacyBusy, setIsAdPrivacyBusy] = useState(false);
  const [adPrivacyOptionsRequired, setAdPrivacyOptionsRequired] = useState(false);
  const [nativeBannerLayout, setNativeBannerLayout] = useState(DEFAULT_NATIVE_BANNER_LAYOUT);

  const syncNotificationPermissionState = useCallback(async ({ requestAccess = false } = {}) => {
    if (!Capacitor.isNativePlatform()) return true;

    try {
      const permission = requestAccess
        ? await LocalNotifications.requestPermissions()
        : await LocalNotifications.checkPermissions();
      const granted = permission.display === 'granted';
      setHasNativeNotificationAccess(granted);
      return granted;
    } catch (err) {
      console.error('Notification permission request failed', err);
      setHasNativeNotificationAccess(false);
      return false;
    }
  }, []);

  const ensureNotificationPermission = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return true;

    const granted = await syncNotificationPermissionState({ requestAccess: true });
    setNotificationSetupMessage(
      granted
        ? 'Notifications are armed on this device.'
        : 'Notifications are turned off. Enable them so alarms can fire after the app closes.'
    );
    return granted;
  }, [syncNotificationPermissionState]);

  useEffect(() => {
    localStorage.setItem('eb28_alarm_hours', JSON.stringify(alarmHours));
    localStorage.setItem('eb28_alarm_minutes', JSON.stringify(alarmMinutes));
    localStorage.setItem('eb28_alarm_ampm', JSON.stringify(alarmAmPm));
    localStorage.setItem('eb28_alarm_active', JSON.stringify(isAlarmActive));
    localStorage.setItem('eb28_alarm_voice', JSON.stringify(selectedVoice));
    localStorage.setItem('eb28_alarm_muted', JSON.stringify(isMuted));
  }, [alarmHours, alarmMinutes, alarmAmPm, isAlarmActive, selectedVoice, isMuted]);

  useEffect(() => {
    localStorage.setItem('eb28_notification_permission_granted', JSON.stringify(hasNativeNotificationAccess));
  }, [hasNativeNotificationAccess]);

  useEffect(() => {
    localStorage.setItem('eb28_calendar_permission_state', JSON.stringify(calendarPermissionState));
  }, [calendarPermissionState]);

  useEffect(() => {
    localStorage.setItem('eb28_remove_ads_state', JSON.stringify({
      ...removeAdsState,
      loading: false
    }));
  }, [removeAdsState]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncViewportHeight = () => {
      setViewportHeight(getViewportHeight());
    };

    syncViewportHeight();
    window.addEventListener('resize', syncViewportHeight);
    window.visualViewport?.addEventListener('resize', syncViewportHeight);

    return () => {
      window.removeEventListener('resize', syncViewportHeight);
      window.visualViewport?.removeEventListener('resize', syncViewportHeight);
    };
  }, []);

  const isRingingRef = useRef(false);
  useEffect(() => {
     isRingingRef.current = isRinging;
  }, [isRinging]);

  const warmAudioEngine = useCallback(async () => {
    initAudioContext();
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      try {
        await globalAudioCtx.resume();
      } catch (err) {
        console.warn('Audio context resume failed', err);
      }
    }

    try {
      silentAudioElement.muted = true;
      silentAudioElement.currentTime = 0;
      const unlockAttempt = silentAudioElement.play();
      if (unlockAttempt && typeof unlockAttempt.then === 'function') {
        await unlockAttempt;
        silentAudioElement.pause();
        silentAudioElement.currentTime = 0;
      }
    } catch (err) {
      console.warn('Silent audio warmup failed', err);
    } finally {
      silentAudioElement.muted = false;
    }

    return globalAudioCtx;
  }, []);

  const syncRemoveAdsState = useCallback(async ({ silent = false } = {}) => {
    if (!Capacitor.isNativePlatform()) {
      setRemoveAdsState(prev => ({
        ...prev,
        ...DEFAULT_REMOVE_ADS_STATE,
        loading: false
      }));
      return;
    }

    if (!silent) {
      setRemoveAdsState(prev => ({
        ...prev,
        loading: true,
        errorMessage: ''
      }));
    }

    try {
      const [statusOutcome, catalogOutcome] = await Promise.allSettled([
        getRemoveAdsStatus(),
        getRemoveAdsCatalog()
      ]);
      const statusResult = statusOutcome.status === 'fulfilled' ? statusOutcome.value : {};
      const catalogResult = catalogOutcome.status === 'fulfilled' ? catalogOutcome.value : {};
      const catalogProduct = catalogResult?.products?.[0] || {};
      const hasTemporaryStoreIssue = [statusOutcome, catalogOutcome].some((outcome) => (
        outcome.status === 'rejected'
        && /app store product|reach the app store|storekit/i.test(outcome.reason?.message || '')
      ));

      setRemoveAdsState(prev => ({
        ...prev,
        ...DEFAULT_REMOVE_ADS_STATE,
        ...catalogProduct,
        ...statusResult,
        available: Boolean(
          statusResult?.available
          || statusResult?.productId
          || catalogProduct?.productId
          || (catalogResult?.products && catalogResult.products.length)
        ),
        canMakePayments: typeof statusResult?.canMakePayments === 'boolean'
          ? statusResult.canMakePayments
          : typeof catalogResult?.canMakePayments === 'boolean'
            ? catalogResult.canMakePayments
            : Capacitor.isNativePlatform(),
        loading: false,
        errorMessage: hasTemporaryStoreIssue && !silent
          ? 'The App Store is still loading subscription info on this device. If Remove Ads does not appear right away, wait a moment and try again.'
          : ''
      }));
    } catch (err) {
      console.error('Failed to sync remove-ads subscription state', err);
      setRemoveAdsState(prev => ({
        ...prev,
        loading: false,
        canMakePayments: Capacitor.isNativePlatform(),
        errorMessage: 'The App Store is still loading subscription info on this device. If Remove Ads does not appear right away, wait a moment and try again.'
      }));
    }
  }, []);

  const handlePurchaseRemoveAds = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      setSubscriptionMessage('Subscriptions are only available inside the iOS app build.');
      return;
    }

    setIsPurchaseBusy(true);
    setSubscriptionMessage('Connecting to the App Store...');

    try {
      const result = await purchaseRemoveAdsSubscription();
      setRemoveAdsState(prev => ({
        ...prev,
        ...DEFAULT_REMOVE_ADS_STATE,
        ...prev,
        ...result,
        available: true,
        loading: false,
        errorMessage: ''
      }));

      if (result?.cancelled) {
        setSubscriptionMessage('Purchase cancelled. Sponsor panels stay on for now.');
      } else if (result?.pending) {
        setSubscriptionMessage('Purchase is pending approval. Ad-free mode will unlock once Apple clears it.');
      } else if (result?.isSubscribed) {
        setSubscriptionMessage('Ad-free mode is active on this device.');
      } else if (result?.source === 'storefront') {
        setSubscriptionMessage('The App Store sheet closed. If the subscription did not unlock yet, give it a moment and tap Restore.');
      } else {
        setSubscriptionMessage('Purchase completed, but the App Store has not granted the entitlement yet.');
      }
    } catch (err) {
      console.error('Remove-ads purchase failed', err);
      setSubscriptionMessage(
        /app store product/i.test(err?.message || '')
          ? 'The App Store is still warming up subscription products on this device. Wait a moment and tap Remove Ads again.'
          : err?.message || 'The App Store purchase failed.'
      );
    } finally {
      setIsPurchaseBusy(false);
    }
  }, []);

  const handleRestoreRemoveAds = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      setSubscriptionMessage('Restore is only available inside the iOS app build.');
      return;
    }

    setIsPurchaseBusy(true);
    setSubscriptionMessage('Checking your previous App Store purchases...');

    try {
      const result = await restoreRemoveAdsSubscription();
      setRemoveAdsState(prev => ({
        ...prev,
        ...DEFAULT_REMOVE_ADS_STATE,
        ...prev,
        ...result,
        available: true,
        loading: false,
        errorMessage: ''
      }));
      setSubscriptionMessage(
        result?.isSubscribed
          ? 'Previous subscription restored. Ad-free mode is active.'
          : 'No active remove-ads subscription was found on this Apple ID.'
      );
    } catch (err) {
      console.error('Restore purchases failed', err);
      setSubscriptionMessage(err?.message || 'Unable to restore purchases right now.');
    } finally {
      setIsPurchaseBusy(false);
    }
  }, []);

  const openExternalResource = useCallback((url) => {
    const popup = window.open(url, '_blank', 'noopener,noreferrer');
    if (!popup) {
      window.location.assign(url);
    }
  }, []);

  const handleAdPrivacyOptions = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      openExternalResource(SUBSCRIPTION_PRIVACY_URL);
      return;
    }

    setIsAdPrivacyBusy(true);
    setAdPrivacyMessage('Checking ad privacy choices...');

    try {
      const result = await presentWakeUpAdPrivacyOptions();
      setAdPrivacyOptionsRequired(Boolean(result?.privacyOptionsRequired));
      setAdPrivacyMessage(
        result?.message
        || (result?.presented
          ? 'Ad privacy choices updated.'
          : 'No additional ad privacy form is available right now.')
      );
    } catch (err) {
      console.error('Ad privacy options failed', err);
      setAdPrivacyMessage(err?.message || 'Unable to open ad privacy options right now.');
    } finally {
      setIsAdPrivacyBusy(false);
    }
  }, [openExternalResource]);

  const clearDeliveredNativeNotifications = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await LocalNotifications.removeAllDeliveredNotifications();
    } catch (err) {
      console.warn('Failed to clear delivered notifications', err);
    }
  };

  const cancelScheduledAlarm = async () => {
    setCountdownTarget(null);
    setIsAlarmActive(false);
    setIsRinging(false);
    isRingingRef.current = false;
    cancelSpeechSynthesis();
    safeStopAudio();
    await disarmBackgroundEngine();
    await clearDeliveredNativeNotifications();
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.cancel({
          notifications: [
            { id: NATIVE_ALARM_NOTIFICATION_ID },
            { id: NATIVE_NOTIFICATION_TEST_ID }
          ]
        });
      } catch (err) {
        console.warn('Failed to cancel pending native alarm', err);
      }
    }
  };

  function handleNativeAlarmEvent(notificationPayload) {
    const notificationKind = notificationPayload?.notification?.extra?.kind
      || notificationPayload?.extra?.kind;
    if (notificationKind === 'setup-test') {
      setNotificationSetupMessage('Notification test delivered. Closed-app alarms are ready.');
      return;
    }

    const voiceId = notificationPayload?.notification?.extra?.voiceId
      || notificationPayload?.extra?.voiceId
      || selectedVoice;
    const alarmMode = notificationPayload?.notification?.extra?.alarmMode
      || notificationPayload?.extra?.alarmMode
      || 'clock';
    if (alarmMode === 'countdown') {
      setCountdownTarget(null);
      setIsAlarmActive(false);
    }
    setIsRinging(true);
    isRingingRef.current = true;
    if (!isMuted) {
      void playSample(voiceId, null, false);
    }
  }

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    syncNotificationPermissionState()
      .catch((err) => {
        console.warn('Notification permission check failed', err);
      });
  }, [syncNotificationPermissionState]);

  useEffect(() => {
    void syncRemoveAdsState();

    const refreshEntitlements = () => {
      if (document.visibilityState === 'visible') {
        void syncRemoveAdsState({ silent: true });
      }
    };

    document.addEventListener('visibilitychange', refreshEntitlements);

    return () => {
      document.removeEventListener('visibilitychange', refreshEntitlements);
    };
  }, [syncRemoveAdsState]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !hasNativeNotificationAccess) return;

    const actionL = LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
       handleNativeAlarmEvent(notificationAction);
    });
    const receiveL = LocalNotifications.addListener('localNotificationReceived', (notification) => {
       handleNativeAlarmEvent(notification);
    });
    return () => {
       actionL.then(l => l.remove());
       receiveL.then(l => l.remove());
    };
  }, [hasNativeNotificationAccess, isMuted, selectedVoice]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const syncNativeAlarm = async () => {
      await LocalNotifications.cancel({ notifications: [{ id: NATIVE_ALARM_NOTIFICATION_ID }] });

      if (!isAlarmActive) {
        return;
      }

      if (!hasNativeNotificationAccess) return;

      const now = new Date();
      let targetH = parseInt(alarmHours, 10);
      if (alarmAmPm === 'PM' && targetH < 12) targetH += 12;
      if (alarmAmPm === 'AM' && targetH === 12) targetH = 0;

      const targetTime = countdownTarget
        ? new Date(countdownTarget)
        : new Date(now.getFullYear(), now.getMonth(), now.getDate(), targetH, parseInt(alarmMinutes, 10), 0);
      if (!countdownTarget && targetTime.getTime() <= now.getTime()) {
        targetTime.setDate(targetTime.getDate() + 1);
      }

      await LocalNotifications.schedule({
        notifications: [{
            title: "⚠️ WAKE UP, YA BISH",
            body: "Time to grind. Your alarm is sounding.",
            id: NATIVE_ALARM_NOTIFICATION_ID,
            schedule: countdownTarget
              ? { allowWhileIdle: true, at: targetTime }
              : { allowWhileIdle: true, on: { hour: targetH, minute: parseInt(alarmMinutes, 10), second: 0 } },
            ...(!isMuted ? { sound: getNativeNotificationSound(selectedVoice) } : {}),
            actionTypeId: "",
            extra: {
              voiceId: selectedVoice,
              targetIso: targetTime.toISOString(),
              alarmMode: countdownTarget ? 'countdown' : 'clock'
            }
        }]
      });
    };

    syncNativeAlarm().catch(err => {
      console.error('Native alarm scheduling failed', err);
    });
  }, [hasNativeNotificationAccess, isAlarmActive, alarmHours, alarmMinutes, alarmAmPm, countdownTarget, selectedVoice, isMuted]);

  // User Profile & Mock-Authentication State
  const [showProfile, setShowProfile] = useState(false);
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('eb28_user_profile');
      return saved ? JSON.parse(saved) : null;
    } catch(e) { return null; }
  });
  const [tempName, setTempName] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  
  // Calendar Intercept State
  const [calendarUrl, setCalendarUrl] = useState(() => {
    try { return localStorage.getItem('eb28_calendar_url') || ''; } catch(e) { return ''; }
  });
  const [upcomingEvent, setUpcomingEvent] = useState(null);
  const [tempCalUrl, setTempCalUrl] = useState(() => {
    try { return localStorage.getItem('eb28_calendar_url') || ''; } catch(e) { return ''; }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isLightOn, setIsLightOn] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);

  const [habitState, setHabitState] = useState(() => {
    try {
      const saved = localStorage.getItem('eb28_habit_mastery');
      return saved ? JSON.parse(saved) : { currentDay: 1, completedDate: null };
    } catch(e) { return { currentDay: 1, completedDate: null }; }
  });
  const [showHabitModal, setShowHabitModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('eb28_habit_mastery', JSON.stringify(habitState));
  }, [habitState]);

  const currentHabit = habitSteps.find(h => h.day === habitState.currentDay) || habitSteps[0];
  const isHabitCompletedToday = habitState.completedDate === new Date().toLocaleDateString('en-US');

  const completeHabitForToday = () => {
    setHabitState(prev => ({
      ...prev,
      completedDate: new Date().toLocaleDateString('en-US')
    }));
  };

  useEffect(() => {
    const todayStr = new Date().toLocaleDateString('en-US');
    if (habitState.completedDate && habitState.completedDate !== todayStr) {
      setHabitState(prev => ({
        currentDay: Math.min(prev.currentDay + 1, 67),
        completedDate: null
      }));
    }
  }, [time]);

  useEffect(() => {
    try {
      const savedAudio = localStorage.getItem('eb28_custom_audio');
      if (savedAudio) setCustomAudioMap(JSON.parse(savedAudio));
    } catch (e) { console.warn('Failed to load storage', e); }

    let unlocked = false;
    const removeUnlocker = () => {
      document.removeEventListener('click', unlocker);
      document.removeEventListener('touchstart', unlocker);
    };

    // Warm audio once on first interaction instead of doing work on every tap.
    const unlocker = () => {
      if (unlocked) return;
      void warmAudioEngine().finally(() => {
        unlocked = true;
        removeUnlocker();
      });
    };
    document.addEventListener('click', unlocker);
    document.addEventListener('touchstart', unlocker);
    
    // Keep the alarm service worker scoped so it does not control the entire eb28.co origin.
    if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
      const normalizedHostname = window.location.hostname.toLowerCase();
      const isDedicatedAlarmHost = normalizedHostname === 'app.wakeupyabish.com';
      const serviceWorkerUrl = isDedicatedAlarmHost ? '/sw.js' : '/alarmclock/sw.js';
      const serviceWorkerOptions = isDedicatedAlarmHost ? undefined : { scope: '/alarmclock/' };

      navigator.serviceWorker
        .register(serviceWorkerUrl, serviceWorkerOptions)
        .catch(err => console.log('SW registration failed:', err));
    }

    return () => {
      removeUnlocker();
    };
  }, [warmAudioEngine]);

  // -- Google Calendar / iCal Feed Sync Engine --
  const fetchCalendar = async (url) => {
    if (!url) {
      setUpcomingEvent(null);
      return;
    }
    try {
      // Free CORS proxy to bypass cross-origin browser bans on public .ics files
      const proxyUrl = (url.startsWith('http://localhost') || url.startsWith('/')) 
         ? url 
         : `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error('CORS fetch failure');
      const text = await res.text();
      
      const events = [];
      const lines = text.split(/\r?\n/);
      let inEvent = false;
      let currentEvent = {};
      
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        // Handle RFC 5545 folded lines 
        while (i + 1 < lines.length && (lines[i+1].startsWith(' ') || lines[i+1].startsWith('\t'))) {
           i++;
           line += lines[i].substring(1);
        }

        if (line === 'BEGIN:VEVENT') {
          inEvent = true;
          currentEvent = {};
        } else if (line === 'END:VEVENT') {
          inEvent = false;
          if (currentEvent.start && currentEvent.summary) {
             events.push({...currentEvent});
          }
        } else if (inEvent) {
          if (line.startsWith('SUMMARY:')) {
             currentEvent.summary = line.substring(8);
          }
          else if (line.startsWith('DTSTART')) {
             // Parse basic DTSTART arrays e.g DTSTART:20240501T120000Z or DTSTART;TZID=America/New_York:20250325T140000
             const dateMatch = line.match(/:(\d{8})(T\d{6}Z?)?/);
             if (dateMatch) {
                const ds = dateMatch[1]; // YYYYMMDD
                const ts = dateMatch[2] || 'T000000'; // THHMMSS
                const year = parseInt(ds.substring(0,4), 10);
                const month = parseInt(ds.substring(4,6), 10) - 1;
                const day = parseInt(ds.substring(6,8), 10);
                
                let hr = 0, min = 0, sec = 0;
                if (ts.length >= 7) {
                  hr = parseInt(ts.substring(1,3), 10);
                  min = parseInt(ts.substring(3,5), 10);
                  sec = parseInt(ts.substring(5,7), 10);
                }
                
                // If it ends in Z, it's UTC. Otherwise assume strictly local wall-time for simplicity
                const isUtc = ts.endsWith('Z');
                let eventDate;
                if (isUtc) {
                  eventDate = new Date(Date.UTC(year, month, day, hr, min, sec));
                } else {
                  eventDate = new Date(year, month, day, hr, min, sec);
                }
                currentEvent.start = eventDate;
             }
          }
        }
      }

      const now = new Date();
      // Only show events originating in the future today
      const upcoming = events
         .filter(e => e.start > now)
         .sort((a,b) => a.start - b.start);
         
      if (upcoming.length > 0) {
         // Pick the absolute closest next event
         setUpcomingEvent(upcoming[0]);
      } else {
         setUpcomingEvent(null);
      }
    } catch(err) {
      console.error('ICS Parse Error: Sync aborted.', err);
      setUpcomingEvent(null);
    }
  };

  const syncNativeCalendarPermission = async (requestAccess = false) => {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      const permission = requestAccess
        ? (typeof CapacitorCalendar.requestFullCalendarAccess === 'function'
            ? await CapacitorCalendar.requestFullCalendarAccess()
            : await CapacitorCalendar.requestPermission({ scope: CalendarPermissionScope.READ_CALENDAR }))
        : await CapacitorCalendar.checkPermission({ scope: CalendarPermissionScope.READ_CALENDAR });
      const granted = permission.result === 'granted';
      setCalendarPermissionState(permission.result);
      if (!granted) {
        setUpcomingEvent(null);
      }
      return granted;
    } catch (err) {
      console.error('Calendar permission sync failed', err);
      setCalendarPermissionState('denied');
      setUpcomingEvent(null);
      return false;
    }
  };

  const fetchNativeCalendar = async (requestAccess = false) => {
    if (!(await syncNativeCalendarPermission(requestAccess))) return;

    try {
       const now = Date.now();
       const endOfRange = new Date(now + (7 * 24 * 60 * 60 * 1000));
       
       const { result } = await CapacitorCalendar.listEventsInRange({
          from: now,
          to: endOfRange.getTime()
       });
       
       if (result && result.length > 0) {
          const events = result
            .map(e => ({
               summary: e.title,
               start: new Date(e.startDate)
            }))
            .filter(event => event.start.getTime() >= now)
            .sort((a,b) => a.start - b.start);
          
          if (events.length > 0) {
             setUpcomingEvent(events[0]);
          } else {
             setUpcomingEvent(null);
          }
       } else {
          setUpcomingEvent(null);
       }
    } catch(err) {
       console.error('Native Calendar EventKit failed', err);
       setUpcomingEvent(null);
    }
  };

  const scheduleNotificationSetupTest = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;

    const fireDate = new Date(Date.now() + 5000);
    await LocalNotifications.cancel({ notifications: [{ id: NATIVE_NOTIFICATION_TEST_ID }] });
    await LocalNotifications.schedule({
      notifications: [{
        id: NATIVE_NOTIFICATION_TEST_ID,
        title: 'Wake Up Ya Bish',
        body: 'Notification test ping. Closed-app alarms should now work.',
        schedule: { at: fireDate, allowWhileIdle: true },
        sound: getNativeNotificationSound(selectedVoice),
        extra: {
          kind: 'setup-test',
          voiceId: selectedVoice
        }
      }]
    });

    setNotificationSetupMessage(`Test ping armed for ${fireDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}.`);
  }, [selectedVoice]);

  const handleNotificationSetup = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;

    setIsNotificationSetupBusy(true);
    try {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        return;
      }
      await scheduleNotificationSetupTest();
    } catch (err) {
      console.error('Notification setup failed', err);
      setNotificationSetupMessage('Notification setup failed. Try again in iOS and keep alerts enabled.');
    } finally {
      setIsNotificationSetupBusy(false);
    }
  }, [ensureNotificationPermission, scheduleNotificationSetupTest]);

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    
    if (isNative) {
       void fetchNativeCalendar();
       const calInterval = setInterval(() => {
         void fetchNativeCalendar();
       }, 15 * 60 * 1000);
       const refreshOnVisible = () => {
         if (document.visibilityState === 'visible') {
           void fetchNativeCalendar();
         }
       };
       document.addEventListener('visibilitychange', refreshOnVisible);
       return () => {
         clearInterval(calInterval);
         document.removeEventListener('visibilitychange', refreshOnVisible);
       };
    } else {
       if (calendarUrl) fetchCalendar(calendarUrl);
       else setUpcomingEvent(null);
       const calInterval = setInterval(() => {
          if (calendarUrl) fetchCalendar(calendarUrl);
       }, 15 * 60 * 1000);
       return () => clearInterval(calInterval);
    }
  }, [calendarUrl]);


  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now);
      checkAlarm(now);
    }, 1000);
    return () => clearInterval(timer);
  }, [alarmHours, alarmMinutes, alarmAmPm, isAlarmActive, isRinging, countdownTarget]);

  // Rotate motivational phrases on the dynamic background billboard
  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex(prev => (prev + 1) % MOTIVATIONAL_PHRASES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkAlarm = (currentTime) => {
    if (!isAlarmActive || isRinging) return;

    if (countdownTarget) {
      if (currentTime.getTime() >= countdownTarget) {
        setCountdownTarget(null);
        setIsAlarmActive(false);
        triggerAlarm();
      }
      return;
    }

    let _h = currentTime.getHours();
    const ampm = _h >= 12 ? 'PM' : 'AM';
    _h = _h % 12 || 12;
    const currentH = _h.toString().padStart(2, '0');
    const currentM = currentTime.getMinutes().toString().padStart(2, '0');

    if (currentH === alarmHours && currentM === alarmMinutes && ampm === alarmAmPm) {
      if (currentTime.getSeconds() === 0) triggerAlarm();
    }
  };

  const triggerAlarm = (voiceId = selectedVoice) => {
    setIsRinging(true);
    isRingingRef.current = true;
    if (!isMuted) {
      void playSample(voiceId, null, false);
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification('⚠️ WAKE UP, YA BISH', {
            body: 'Time to grind. Your alarm is sounding.',
            icon: 'https://wakeupyabish.com/apple-touch-icon.png',
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200, 100, 200]
          });
        });
      } else {
        new Notification('⚠️ WAKE UP, YA BISH', {
          body: 'Time to grind. Your alarm is sounding.',
          icon: 'https://wakeupyabish.com/apple-touch-icon.png',
          requireInteraction: true
        });
      }
    }
  };

  const stopAlarm = async () => {
    setIsRinging(false);
    isRingingRef.current = false;
    cancelSpeechSynthesis();
    safeStopAudio();
    await clearDeliveredNativeNotifications();
    
    // Trigger Habit Mastery Morning Intercept if it hasn't been completed today!
    if (!isHabitCompletedToday) {
       setShowHabitModal(true);
    }
  };

  const handleSnoozeLight = () => {
    if (isRinging) {
      void stopAlarm();
    } else {
      setIsLightOn(true);
      setTimeout(() => setIsLightOn(false), 2500);
    }
  };

  const handleTimePickerChange = async (e) => {
    const val = e.target.value;
    if (!val) return;
    const [hStr, mStr] = val.split(':');
    let h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const finalHStr = h.toString().padStart(2, '0');
    if (!(await ensureNotificationPermission())) return;
    await warmAudioEngine();
    setAlarmHours(finalHStr);
    setAlarmMinutes(mStr);
    setAlarmAmPm(ampm);
    setIsAlarmActive(true);
    armBackgroundEngine(`Set for ${finalHStr}:${mStr} ${ampm}`);
  };

  const get24HourString = () => {
    let h = parseInt(alarmHours, 10);
    if (alarmAmPm === 'PM' && h !== 12) h += 12;
    if (alarmAmPm === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${alarmMinutes}`;
  };

  const setTimerMinutes = async (minutesAdded) => {
    if (!(await ensureNotificationPermission())) return;
    await warmAudioEngine();
    const targetTime = time.getTime() + minutesAdded * 60000;
    setCountdownTarget(targetTime);
    setIsAlarmActive(true);
    armBackgroundEngine(`${minutesAdded} Min Timer`);
  };

  const ALARM_URLS = {
    nuclear: tacticalNukeUrl,
    quarter: quarteredAtDawnUrl,
    spite: matterOfSpiteUrl,
    rainbow: rainbowBunnyUrl,
    zen: zenUrl,
    metal: metalWakeupUrl,
    trap: trapWakeupUrl,
    break: breakUrl
  };

  const playSample = async (voiceId, e, isPreview = true) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    cancelSpeechSynthesis();
    safeStopAudio();
    await warmAudioEngine();
    
    // Synthesize Retro Sounds dynamically with infinite recursive looping
    const playSyntheticLoop = () => {
       if (!isRingingRef.current && !isPreview) return false;
       const syntheticObj = synthesizeRetroAlarm(voiceId);
       if (syntheticObj) {
         safeSetAudio(syntheticObj);
         if (!isPreview) {
            syntheticObj.osc.onended = () => {
               if (isRingingRef.current) playSyntheticLoop();
            };
         }
         return true;
       }
       return false;
    };

    if (playSyntheticLoop()) return;

    if (ALARM_URLS[voiceId]) {
      try {
        const mediaEl = new Audio(ALARM_URLS[voiceId]);
        mediaEl.preload = 'auto';
        mediaEl.playsInline = true;
        mediaEl.loop = !isPreview;
        await mediaEl.play();
        safeSetAudio(mediaEl);
        return;
      } catch (err) {
        console.warn("HTML audio playback failed, falling back to Web Audio:", err);
      }
    }

    // Web Audio API Buffer Playback fallback
    if (ALARM_URLS[voiceId] && globalAudioCtx) {
      try {
        const response = await fetch(ALARM_URLS[voiceId]);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await globalAudioCtx.decodeAudioData(arrayBuffer);

        const source = globalAudioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = !isPreview;

        const gainNode = globalAudioCtx.createGain();
        gainNode.gain.value = 1.0;

        source.connect(gainNode);
        gainNode.connect(globalAudioCtx.destination);
        source.start(0);

        safeSetAudio({
          pause: () => {
             try { source.stop(); } catch(err){}
          },
          currentTime: 0
        });
        return;
      } catch (err) {
        console.error("Failed to decode mp3 buffer natively:", err);
      }
    }

    // Default Fallback: Text-TO-Speech
    const voice = ALARM_VOICES.find(v => v.id === voiceId);
    if (voice) {
      const utterance = new SpeechSynthesisUtterance(voice.sample);
      utterance.rate = 0.9;
      // Loop the speech synthesis while alarm is ringing
      if (!isPreview) {
         utterance.onend = () => {
            if (isRingingRef.current && 'speechSynthesis' in window) window.speechSynthesis.speak(utterance);
         };
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const formatHours = (date) => (date.getHours() % 12 || 12).toString().padStart(2, '0');
  const formatMinutes = (date) => date.getMinutes().toString().padStart(2, '0');
  const getAmPm = (date) => date.getHours() >= 12 ? 'PM' : 'AM';
  
  const getDisplayMain = () => {
    if (countdownTarget) {
      const diffStr = Math.max(0, Math.floor((countdownTarget - time.getTime()) / 1000));
      const m = Math.floor(diffStr / 60).toString().padStart(2, '0');
      const s = (diffStr % 60).toString().padStart(2, '0');
      return { mainString: `${m}:${s}`, mode: 'COUNTDOWN' };
    }
    return { mainString: `${formatHours(time)}:${formatMinutes(time)}`, mode: getAmPm(time) };
  };
  
  const displayData = getDisplayMain();
  
  const displayDateStrFull = `${time.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()} ${time.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })}`;
  
  const currentScheme = COLOR_SCHEMES[colorSchemeKey];
  const isCalendarLinked = Capacitor.isNativePlatform()
    ? calendarPermissionState === 'granted'
    : Boolean(calendarUrl);
  const nextEventTimeLabel = upcomingEvent
    ? upcomingEvent.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toUpperCase()
    : null;
  const nextEventDayLabel = upcomingEvent
    ? (upcomingEvent.start.toDateString() === new Date().toDateString()
        ? 'TODAY'
        : upcomingEvent.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase())
    : null;
  const nextEventSummary = upcomingEvent?.summary?.trim() || '';
  const nextEventStatusLabel = upcomingEvent
    ? `${nextEventDayLabel} ${nextEventTimeLabel}`.trim()
    : (isCalendarLinked ? 'NO UPCOMING EVENT' : 'CALENDAR NOT CONNECTED');
  const nextEventDetailLabel = upcomingEvent
    ? nextEventSummary
    : (Capacitor.isNativePlatform() ? 'Connect device calendar in settings.' : 'Paste an iCal feed in profile.');
  const canCancelAlarm = Boolean(isAlarmActive || countdownTarget || isRinging);
  const isAdFree = Boolean(removeAdsState.isSubscribed);
  const hasNativeAdMobBanner = Capacitor.isNativePlatform() && hasConfiguredWakeUpAdMobBanner;
  const shouldShowNativeBanner = hasNativeAdMobBanner
    && !isAdFree
    && !showSettings
    && !showProfile
    && !showHabitModal
    && !isRinging;
  const measuredNativeBannerHeight = Math.max(0, toFiniteNumber(nativeBannerLayout.bannerHeight));
  const measuredNativeSafeAreaBottom = Math.max(0, toFiniteNumber(nativeBannerLayout.safeAreaBottom));
  const nativeBannerReservedBottom = shouldShowNativeBanner
    ? Math.ceil(Math.max(118, measuredNativeBannerHeight + measuredNativeSafeAreaBottom + 20))
    : 0;
  const effectiveViewportHeight = Math.max(0, viewportHeight - nativeBannerReservedBottom);
  const isCompactViewport = effectiveViewportHeight <= (Capacitor.isNativePlatform() ? 820 : 860);
  const isExtraCompactViewport = effectiveViewportHeight <= (Capacitor.isNativePlatform() ? 700 : 760);
  const sponsorMessage = SPONSORED_MESSAGES[phraseIndex % SPONSORED_MESSAGES.length];
  const removeAdsPriceLabel = formatRemoveAdsPrice(removeAdsState);
  const renewalLabel = removeAdsState.expirationDate
    ? new Date(removeAdsState.expirationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
    : null;

  const openSettingsPanel = () => {
    setNotificationSetupMessage('');
    setAdPrivacyMessage('');
    if (Capacitor.isNativePlatform()) {
      void syncNotificationPermissionState();
      void fetchNativeCalendar();
    }
    setShowSettings(true);
  };
  const openProfilePanel = () => {
    setTempCalUrl(calendarUrl);
    setSubscriptionMessage('');
    setNotificationSetupMessage('');
    setAdPrivacyMessage('');
    if (Capacitor.isNativePlatform()) {
      void syncNotificationPermissionState();
      void fetchNativeCalendar();
    }
    void syncRemoveAdsState({ silent: true });
    setShowProfile(true);
  };

  const openSponsoredDestination = () => {
    if (sponsorMessage.action === 'upgrade') {
      openProfilePanel();
      return;
    }

    if (sponsorMessage.url) {
      window.open(sponsorMessage.url, '_blank', 'noopener,noreferrer');
    }
  };

  useEffect(() => {
    let cancelled = false;

    const syncBanner = async () => {
      try {
        const result = await syncWakeUpAdBanner({ visible: shouldShowNativeBanner });
        if (!cancelled) {
          if (typeof result?.privacyOptionsRequired === 'boolean') {
            setAdPrivacyOptionsRequired(Boolean(result.privacyOptionsRequired));
          }

          setNativeBannerLayout({
            visible: Boolean(result?.visible && shouldShowNativeBanner),
            bannerHeight: Math.max(0, toFiniteNumber(result?.bannerHeight)),
            bannerWidth: Math.max(0, toFiniteNumber(result?.bannerWidth)),
            safeAreaBottom: Math.max(0, toFiniteNumber(result?.safeAreaBottom))
          });
        }
      } catch (err) {
        console.warn('Ad banner sync failed', err);
        if (!cancelled) {
          setNativeBannerLayout(DEFAULT_NATIVE_BANNER_LAYOUT);
        }
      }
    };

    void syncBanner();

    return () => {
      cancelled = true;
    };
  }, [shouldShowNativeBanner]);

  const syncHomeWidgetState = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await syncWakeUpWidgetState({
        colorSchemeKey,
        alarmHours: normalizeWidgetText(alarmHours, 2) || '06',
        alarmMinutes: normalizeWidgetText(alarmMinutes, 2) || '00',
        alarmAmPm: normalizeWidgetText(alarmAmPm, 2) || 'AM',
        isAlarmActive: Boolean(isAlarmActive),
        isMuted: Boolean(isMuted),
        selectedVoice: normalizeWidgetText(selectedVoice, 24) || 'standard',
        calendarLinked: Boolean(isCalendarLinked),
        countdownTarget: toCountdownDate(countdownTarget)?.toISOString() ?? null,
        upcomingEventSummary: nextEventSummary ? normalizeWidgetText(nextEventSummary, 42) : null,
        upcomingEventStart: upcomingEvent?.start ? upcomingEvent.start.toISOString() : null
      });
    } catch (err) {
      console.warn('Widget sync failed', err);
    }
  }, [
    alarmAmPm,
    alarmHours,
    alarmMinutes,
    colorSchemeKey,
    countdownTarget,
    isAlarmActive,
    isCalendarLinked,
    isMuted,
    nextEventSummary,
    selectedVoice,
    upcomingEvent
  ]);

  useEffect(() => {
    void syncHomeWidgetState();
  }, [syncHomeWidgetState]);

  const renderRemoveAdsPanel = () => (
    <div className="bg-[#10141a] border border-[#00f0ff]/35 rounded-xl p-4 shadow-[0_0_20px_rgba(0,240,255,0.08)] text-left">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[#00f0ff] text-[10px] uppercase font-black tracking-[0.2em] block drop-shadow-[0_0_5px_#00f0ff]">
            Ad-Free Pass
          </span>
          <span className="text-slate-300 text-[9px] uppercase block mt-2 leading-relaxed">
            {isAdFree
              ? 'Sponsor panels are hidden on this device.'
              : 'Free tier keeps sponsor panels visible. Subscribe to clean up the dashboard.'}
          </span>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-[0.2em] border ${
          isAdFree
            ? 'bg-[#14301a] border-[#39ff14]/50 text-[#39ff14]'
            : 'bg-[#2a0c1f] border-[#ff00aa]/50 text-[#ff8fd6]'
        }`}>
          {isAdFree ? 'Active' : removeAdsPriceLabel}
        </span>
      </div>

      <div className="mt-3 text-[8px] uppercase leading-relaxed text-slate-500">
        {isAdFree && renewalLabel
          ? `Entitlement good through ${renewalLabel}.`
          : 'Auto-renewable monthly subscription. Cancel anytime in Apple ID subscriptions.'}
      </div>

      <div className="mt-3 rounded-lg border border-[#00f0ff]/20 bg-[#081017] px-3 py-3 text-[8px] leading-relaxed text-slate-300">
        <span className="block uppercase tracking-[0.18em] text-[#00f0ff]">
          Subscription Details
        </span>
        <span className="mt-2 block">
          Remove Ads renews monthly at {removeAdsPriceLabel}. Payment is charged to your Apple ID at confirmation and renews automatically unless cancelled at least 24 hours before the current period ends.
        </span>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openExternalResource(SUBSCRIPTION_PRIVACY_URL)}
            className="rounded-full border border-[#39ff14]/35 px-3 py-2 text-[8px] font-black uppercase tracking-[0.16em] text-[#39ff14]"
          >
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={() => openExternalResource(SUBSCRIPTION_TERMS_URL)}
            className="rounded-full border border-[#00f0ff]/35 px-3 py-2 text-[8px] font-black uppercase tracking-[0.16em] text-[#00f0ff]"
          >
            Terms of Use
          </button>
        </div>
      </div>

      {subscriptionMessage ? (
        <div className="mt-3 rounded-lg border border-[#ff00aa]/25 bg-[#250818] px-3 py-2 text-[8px] uppercase leading-relaxed text-[#ffd4ef]">
          {subscriptionMessage}
        </div>
      ) : null}

      {removeAdsState.errorMessage ? (
        <div className="mt-3 rounded-lg border border-[#ff6b6b]/25 bg-[#2a0c0c] px-3 py-2 text-[8px] uppercase leading-relaxed text-[#ffd2d2]">
          {removeAdsState.errorMessage}
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            void handlePurchaseRemoveAds();
          }}
          disabled={isPurchaseBusy || removeAdsState.loading || !Capacitor.isNativePlatform() || !removeAdsState.canMakePayments || isAdFree}
          className={`rounded-xl px-3 py-3 text-[8px] font-black uppercase tracking-[0.18em] transition-all ${
            isPurchaseBusy || removeAdsState.loading || !Capacitor.isNativePlatform() || !removeAdsState.canMakePayments || isAdFree
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-[#ff00aa] border-b-[4px] border-[#990066] text-white hover:brightness-110 active:translate-y-1 active:border-b-0'
          }`}
        >
          {isAdFree
            ? 'Ad-Free On'
            : isPurchaseBusy
              ? 'Working...'
              : removeAdsState.loading
                ? 'Checking...'
                : 'Remove Ads'}
        </button>
        <button
          onClick={() => {
            void handleRestoreRemoveAds();
          }}
          disabled={isPurchaseBusy || !Capacitor.isNativePlatform()}
          className={`rounded-xl px-3 py-3 text-[8px] font-black uppercase tracking-[0.18em] transition-all ${
            isPurchaseBusy || !Capacitor.isNativePlatform()
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-[#00f0ff] border-b-[4px] border-[#0099aa] text-black hover:brightness-110 active:translate-y-1 active:border-b-0'
          }`}
        >
          {isPurchaseBusy ? 'Working...' : 'Restore'}
        </button>
      </div>

      {!Capacitor.isNativePlatform() ? (
        <span className="mt-3 text-slate-500 text-[8px] uppercase block leading-relaxed">
          Purchases are available in the native iOS app build.
        </span>
      ) : null}
    </div>
  );

  const renderDeviceAccessPanel = () => (
    <div className="space-y-3">
      {Capacitor.isNativePlatform() ? (
        <>
          <div className="bg-[#0b1118] border border-[#00f0ff]/30 rounded-xl p-4 text-left shadow-[0_0_18px_rgba(0,240,255,0.08)]">
            <span className="text-[#00f0ff] text-[10px] uppercase font-black tracking-[0.2em] block drop-shadow-[0_0_5px_#00f0ff]">
              Notifications
            </span>
            <span className="mt-2 text-slate-300 text-[9px] uppercase block leading-relaxed">
              {hasNativeNotificationAccess
                ? 'Alarms can fire after the app closes.'
                : 'Grant alert permission so alarms and countdowns can ring on device.'}
            </span>
            {notificationSetupMessage ? (
              <span className="mt-2 block text-[8px] uppercase leading-relaxed text-[#39ff14]">
                {notificationSetupMessage}
              </span>
            ) : null}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  void handleNotificationSetup();
                }}
                disabled={isNotificationSetupBusy}
                className={`flex-1 rounded-xl px-3 py-3 text-[8px] font-black uppercase tracking-[0.18em] transition-all ${
                  isNotificationSetupBusy
                    ? 'bg-slate-700 text-slate-400 cursor-wait'
                    : 'bg-[#00f0ff] border-b-[4px] border-[#0099aa] text-black hover:brightness-110 active:translate-y-1 active:border-b-0'
                }`}
              >
                {isNotificationSetupBusy
                  ? 'Working...'
                  : hasNativeNotificationAccess
                    ? 'Send Test Ping'
                    : 'Enable Alerts'}
              </button>
            </div>
          </div>

          <div className="bg-[#0a120e] border border-[#39ff14]/35 rounded-xl p-4 text-left shadow-[0_0_18px_rgba(57,255,20,0.08)]">
            <span className="text-[#39ff14] text-[10px] uppercase font-black tracking-[0.2em] block drop-shadow-[0_0_5px_#39ff14]">
              Calendar Access
            </span>
            <span className="mt-2 text-slate-300 text-[9px] uppercase block leading-relaxed">
              {calendarPermissionState === 'granted'
                ? upcomingEvent
                  ? `Next event locked: ${nextEventStatusLabel} / ${nextEventSummary}.`
                  : 'Calendar linked. Pulling your next event from iOS EventKit.'
                : 'Connect device calendar so the active alarm card can show your next event.'}
            </span>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  void fetchNativeCalendar(true);
                }}
                className="flex-1 rounded-xl bg-[#39ff14] border-b-[4px] border-[#1b9900] px-3 py-3 text-[8px] font-black uppercase tracking-[0.18em] text-black hover:brightness-110 active:translate-y-1 active:border-b-0"
              >
                {calendarPermissionState === 'granted' ? 'Refresh Next Event' : 'Connect Calendar'}
              </button>
            </div>
          </div>

          {hasNativeAdMobBanner ? (
            <div className="bg-[#160b1f] border border-[#ff00aa]/35 rounded-xl p-4 text-left shadow-[0_0_18px_rgba(255,0,170,0.08)]">
              <span className="text-[#ff00aa] text-[10px] uppercase font-black tracking-[0.2em] block drop-shadow-[0_0_5px_#ff00aa]">
                Ad Privacy
              </span>
              <span className="mt-2 text-slate-300 text-[9px] uppercase block leading-relaxed">
                {adPrivacyOptionsRequired
                  ? 'Google requires a privacy options button for this device. Open it here anytime.'
                  : isAdFree
                    ? 'Ads are removed on this device, but you can still review the ad privacy policy.'
                    : 'Review the ad privacy policy or reopen Google ad choices for this device.'}
              </span>
              {adPrivacyMessage ? (
                <span className="mt-2 block text-[8px] uppercase leading-relaxed text-[#ffd4ef]">
                  {adPrivacyMessage}
                </span>
              ) : null}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleAdPrivacyOptions();
                  }}
                  disabled={isAdPrivacyBusy}
                  className={`rounded-xl px-3 py-3 text-[8px] font-black uppercase tracking-[0.18em] transition-all ${
                    isAdPrivacyBusy
                      ? 'bg-slate-700 text-slate-400 cursor-wait'
                      : 'bg-[#ff00aa] border-b-[4px] border-[#990066] text-white hover:brightness-110 active:translate-y-1 active:border-b-0'
                  }`}
                >
                  {isAdPrivacyBusy
                    ? 'Working...'
                    : adPrivacyOptionsRequired
                      ? 'Manage Choices'
                      : 'Review Choices'}
                </button>
                <button
                  type="button"
                  onClick={() => openExternalResource(SUBSCRIPTION_PRIVACY_URL)}
                  className="rounded-xl bg-[#0b1118] border border-[#00f0ff]/30 px-3 py-3 text-[8px] font-black uppercase tracking-[0.18em] text-[#00f0ff] hover:brightness-110"
                >
                  Policy
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="bg-[#0a120e] border border-[#39ff14]/35 rounded-xl p-4 text-left shadow-[0_0_18px_rgba(57,255,20,0.08)]">
          <span className="text-[#39ff14] text-[10px] uppercase font-black tracking-[0.2em] block drop-shadow-[0_0_5px_#39ff14]">
            Calendar Feed
          </span>
          <span className="mt-2 text-slate-300 text-[9px] uppercase block leading-relaxed">
            Paste a private .ics feed if you want the dashboard to show your next event on the web version.
          </span>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="Paste .ics URL"
              value={tempCalUrl}
              onChange={e => setTempCalUrl(e.target.value)}
              className="flex-1 bg-black text-[#00f0ff] text-[8px] p-3 rounded-xl outline-none border border-slate-700"
            />
            <button
              type="button"
              onClick={() => {
                if (tempCalUrl.trim()) {
                  localStorage.setItem('eb28_calendar_url', tempCalUrl.trim());
                  setCalendarUrl(tempCalUrl.trim());
                }
              }}
              className="rounded-xl bg-[#39ff14] border-b-[4px] border-[#1b9900] px-4 text-[8px] font-black uppercase tracking-[0.18em] text-black hover:brightness-110 active:translate-y-1 active:border-b-0"
            >
              Sync
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderViewportOverlay = (overlay) => {
    if (typeof document === 'undefined') {
      return null;
    }

    return createPortal(overlay, document.body);
  };

  return (
    <div
      className={`relative w-full overflow-x-hidden overflow-y-auto min-h-[100dvh] flex items-start lg:items-center justify-center bg-[#000b12] touch-manipulation overscroll-contain ${isCompactViewport ? 'wake-compact' : ''}`}
      style={{
        fontFamily: '"Press Start 2P", monospace',
        '--wake-native-banner-reserve': `${nativeBannerReservedBottom}px`,
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingBottom: shouldShowNativeBanner
          ? 'var(--wake-native-banner-reserve)'
          : 'max(1rem, calc(env(safe-area-inset-bottom) + 0.75rem))',
        scrollPaddingBottom: shouldShowNativeBanner
          ? 'var(--wake-native-banner-reserve)'
          : undefined
      }}
    >
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        @font-face {
          font-family: 'Digital-7';
          font-style: italic;
          font-weight: 700;
          src: url('https://fonts.cdnfonts.com/s/14227/digital-7.woff') format('woff');
        }
        .chunky-track {
           box-shadow: inset 0 6px 10px rgba(0,0,0,0.8);
        }
        
        /* DYNAMIC ANIMATED SYNTHWAVE SCENE */
        .grid-container {
           position: absolute;
           bottom: 0;
           left: 0;
           width: 100%;
           height: 50vh;
           perspective: 600px;
           overflow: hidden;
           z-index: 1;
        }
        .vaporwave-grid {
           position: absolute;
           bottom: -50vh;
           left: -50vw;
           width: 200vw;
           height: 200vh;
           background-image: 
             linear-gradient(rgba(0, 240, 255, 0.4) 3px, transparent 3px),
             linear-gradient(90deg, rgba(0, 240, 255, 0.4) 3px, transparent 3px);
           background-size: 60px 60px;
           transform-origin: top;
           transform: rotateX(75deg);
           animation: moveGrid 1.5s linear infinite;
        }
        .grid-fade {
           position: absolute;
           bottom: 0;
           left: 0;
           width: 100%;
           height: 100%;
           background: linear-gradient(to top, transparent 0%, rgba(0,11,18,1) 90%);
        }
        @keyframes moveGrid {
           0% { background-position: 0 0; }
           100% { background-position: 0 60px; }
        }
        
        /* GLOWING SUN */
        .cyber-sun {
           position: absolute;
           bottom: 40vh; /* Sit exactly over the grid horizon */
           left: 50%;
           transform: translateX(-50%);
           width: 40vw;
           height: 40vw;
           max-width: 500px;
           max-height: 500px;
           border-radius: 50%;
           background: linear-gradient(to bottom, #ff00aa 0%, #ffff00 100%);
           box-shadow: 0 0 80px #ff00aa;
           z-index: 0;
        }
        .sun-lines {
           position: absolute;
           bottom: 0; left: 0; width: 100%; height: 50%;
           background: repeating-linear-gradient(
             to bottom,
             transparent 0%, transparent 8%,
             #000b12 8%, #000b12 12%
           );
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.3);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #39ff14;
          border-radius: 10px;
        }
        .wake-compact .wake-shell {
          max-width: 400px;
        }
        .wake-compact .wake-shell-frame {
          padding-top: 0.75rem;
          padding-right: 0.75rem;
          padding-bottom: 1rem;
          padding-left: 0.75rem;
        }
        .wake-compact .wake-snooze {
          height: 42px;
          margin-bottom: 0.5rem;
        }
        .wake-compact .wake-snooze span {
          font-size: 11px;
          line-height: 1.2;
          max-width: 78%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .wake-compact .wake-screen {
          padding: 0.65rem;
        }
        .wake-compact .wake-screen-clock {
          font-size: clamp(2.75rem, 14vw, 5.8rem) !important;
        }
        .wake-compact .wake-control-deck {
          margin-top: 0.5rem;
          gap: 0.375rem;
        }
        .wake-compact .wake-mobile-actions {
          margin-top: 0.5rem;
        }
        .wake-compact .wake-mobile-actions button {
          height: 40px;
        }
        .wake-compact .wake-timers {
          margin-top: 0.5rem;
          gap: 0.35rem;
        }
        .wake-compact .wake-timers button {
          min-width: 0;
          height: 34px;
          border-bottom-width: 4px;
        }
        .wake-compact .wake-timers span:first-child {
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 7px;
          letter-spacing: 0;
        }
        .wake-compact .wake-presets {
          margin-top: 0.45rem;
          gap: 0.35rem;
        }
        .wake-compact .wake-presets button {
          height: 28px;
        }
        .wake-compact .wake-presets span {
          font-size: 7px;
          letter-spacing: 0;
        }
        .wake-compact .wake-mobile-feed {
          display: none;
        }
        .wake-compact .wake-habit-mobile {
          display: block;
          margin-top: 0.5rem;
          padding-left: 0.25rem;
          padding-right: 0.25rem;
        }
        .wake-compact .wake-habit-mobile > div {
          padding: 0.55rem;
          border-width: 2px;
        }
        @media (max-height: 860px) {
          .wake-shell {
            max-width: 408px;
          }
          .wake-shell-frame {
            padding-top: 0.75rem;
            padding-right: 0.75rem;
            padding-bottom: 1.25rem;
            padding-left: 0.75rem;
          }
          .wake-snooze {
            height: 44px;
            margin-bottom: 0.5rem;
          }
          .wake-screen {
            padding: 0.75rem;
          }
          .wake-screen-clock {
            font-size: clamp(3.1rem, 16vw, 6.2rem) !important;
          }
          .wake-control-deck {
            margin-top: 0.5rem;
            gap: 0.375rem;
          }
          .wake-mobile-actions {
            margin-top: 0.625rem;
          }
          .wake-timers {
            margin-top: 0.625rem;
            gap: 0.375rem;
          }
          .wake-timers button {
            height: 38px;
          }
          .wake-presets {
            margin-top: 0.5rem;
            gap: 0.375rem;
          }
          .wake-presets button {
            height: 28px;
          }
          .wake-mobile-feed {
            display: none;
          }
          .wake-sponsored-card h3 {
            font-size: 10px;
          }
          .wake-sponsored-card p {
            display: none;
          }
          .wake-sponsored-card button {
            padding-top: 0.45rem;
            padding-bottom: 0.45rem;
          }
          .wake-habit-mobile {
            display: none;
          }
        }
      `}</style>

      {/* BACKGROUND LAYER */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-gradient-to-b from-[#00050a] to-[#001826]">
        <div className="cyber-sun"><div className="sun-lines" /></div>
        <div className="grid-container">
           <div className="vaporwave-grid" />
           <div className="grid-fade" />
        </div>
      </div>

      {/* DYNAMIC JUMBOTRONS Ticker boards in background layer */}
      <div className="fixed top-0 left-0 w-full h-[50vh] z-[5] pointer-events-none hidden lg:flex justify-between p-12">
        {/* Left Jumbotron - Motivation */}
        <div className="pointer-events-auto w-[350px] h-[180px] border-4 border-[#00f0ff] bg-black shadow-[0_0_30px_#00f0ff] flex flex-col pt-2 relative overflow-hidden">
          <div className="text-[10px] text-white text-center border-b border-[#00f0ff] pb-2">STADIUM MOTIVATION</div>
          <div className="flex-1 flex justify-center items-center px-4">
             <span key={phraseIndex} className="text-[#39ff14] text-[18px] text-center leading-[1.6] drop-shadow-[0_0_8px_#39ff14] animate-fade-in uppercase">
               {MOTIVATIONAL_PHRASES[phraseIndex]}
             </span>
          </div>
          {/* Decorative screws */}
          <div className="absolute top-1 left-1 w-2 h-2 rounded-full border border-gray-500 bg-gray-800"/>
          <div className="absolute top-1 right-1 w-2 h-2 rounded-full border border-gray-500 bg-gray-800"/>
          <div className="absolute bottom-1 left-1 w-2 h-2 rounded-full border border-gray-500 bg-gray-800"/>
          <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-gray-500 bg-gray-800"/>
        </div>

        {/* Right Jumbotron - Auto Select Timers */}
        <div className="pointer-events-auto w-[350px] h-[220px] border-4 border-[#ff00aa] bg-black shadow-[0_0_30px_#ff00aa] flex flex-col pt-2 relative overflow-hidden">
          <div className="text-[10px] text-white text-center border-b border-[#ff00aa] pb-2 uppercase">Auto-Select Timers</div>
          <div className="flex-1 flex flex-col justify-center gap-3 px-4 mt-2">
             <button onClick={() => { void setTimerMinutes(5); }} className="w-full h-[40px] bg-[#1a0011] border border-[#ff00aa] text-[#00f0ff] text-[10px] uppercase hover:bg-[#ff00aa] hover:text-white transition-colors">
                5 Minute Power Nap
             </button>
             <button onClick={() => { void setTimerMinutes(15); }} className="w-full h-[40px] bg-[#1a0011] border border-[#ff00aa] text-[#00f0ff] text-[10px] uppercase hover:bg-[#ff00aa] hover:text-white transition-colors">
                15 Min Hustle
             </button>
             <button onClick={() => { void setTimerMinutes(60); }} className="w-full h-[40px] bg-[#1a0011] border border-[#ff00aa] text-[#00f0ff] text-[10px] uppercase hover:bg-[#ff00aa] hover:text-white transition-colors">
                1 Hour Grind
             </button>
          </div>
          <div className="absolute top-1 left-1 w-2 h-2 rounded-full border border-gray-500 bg-gray-800"/>
          <div className="absolute top-1 right-1 w-2 h-2 rounded-full border border-gray-500 bg-gray-800"/>
          <div className="absolute bottom-1 left-1 w-2 h-2 rounded-full border border-gray-500 bg-gray-800"/>
          <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-gray-500 bg-gray-800"/>
        </div>
      </div>

      
      {/* 
        ======================================================================
        THE CLOCK HARDWARE: Centered fully logic
        ======================================================================
      */}
      <div
        className={`wake-shell relative w-full ${isCompactViewport ? 'max-w-[400px]' : 'max-w-[430px]'} mx-auto flex flex-col justify-start px-3 sm:px-4 z-50 pointer-events-auto drop-shadow-[0_40px_40px_rgba(0,0,0,0.6)]`}
        style={{ paddingBottom: shouldShowNativeBanner ? '1rem' : undefined }}
      >
        
        {/* Main Plastic Shell - Miami Vice Gray/White aesthetic */}
        <div className={`wake-shell-frame w-full relative bg-[#e0e5ec] rounded-[24px] rounded-t-[40px] shadow-[inset_-5px_-5px_15px_rgba(0,0,0,0.2),_inset_5px_5px_15px_rgba(255,255,255,0.8)] border-[2px] border-[#cbd2d9] ${isCompactViewport ? 'pb-5 pt-3 px-3' : 'pb-8 pt-4 px-4 md:px-6'} flex flex-col overflow-hidden`}>
          
          {/* Hardware Decal Logo Top Center */}
          <div className="text-center w-full mb-3 flex items-center justify-center gap-3">
             <div className="h-[2px] w-8 bg-[#ff00aa] shadow-[0_4px_0_#00f0ff]" />
             <span className="text-[8px] text-slate-500 tracking-widest uppercase">
               {userProfile ? `WELCOME, ${userProfile.name}` : 'RADIO-TEK'}
             </span>
             {isAdFree ? (
               <span className="rounded-full border border-[#39ff14]/50 bg-[#14301a] px-2 py-1 text-[6px] text-[#39ff14] tracking-[0.2em] uppercase shadow-[0_0_10px_rgba(57,255,20,0.15)]">
                 Ad-Free
               </span>
             ) : null}
             <div className="h-[2px] w-8 bg-[#ff00aa] shadow-[0_4px_0_#00f0ff]" />
          </div>

          {/* SNOOZE BAR AT THE TOP (Massive chunky physical button) */}
          <button 
            onClick={handleSnoozeLight}
            className={`wake-snooze w-full relative ${isCompactViewport ? 'h-[44px] mb-2' : 'h-[50px] md:h-[70px] mb-3 md:mb-6'} rounded-[16px] flex items-center justify-center border-b-[8px] border-r-[4px] active:scale-[0.98] outline-none transition-all cursor-pointer touch-manipulation ${isRinging ? 'animate-pulse' : ''}`}
            style={{
               backgroundColor: isRinging ? currentScheme.active : (isLightOn ? currentScheme.active : currentScheme.shadow),
               borderColor: isLightOn ? currentScheme.shadow : currentScheme.inactive,
               boxShadow: isLightOn || isRinging ? `0 0 30px ${currentScheme.shadow}` : '0 10px 15px -3px rgba(0,0,0,0.3)',
            }}
          >
             <span className="text-[14px] md:text-[16px] text-white drop-shadow-[2px_2px_0px_#000]">
               {isRinging ? 'SLAM TO STOP' : 'SNOOZE / LIGHT'}
             </span>
             {/* Small ribbed texture lines for the snooze button */}
             <div className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1">
               <div className="w-[10px] h-[2px] bg-black/20" /><div className="w-[10px] h-[2px] bg-black/20" /><div className="w-[10px] h-[2px] bg-black/20" />
             </div>
             <div className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1">
               <div className="w-[10px] h-[2px] bg-black/20" /><div className="w-[10px] h-[2px] bg-black/20" /><div className="w-[10px] h-[2px] bg-black/20" />
             </div>
          </button>

          {/* LCD SCREEN WINDOW */}
          <div className={`wake-screen w-full bg-[#0a0f12] rounded-xl border-t-[8px] border-l-[8px] border-[#05080a] border-b-[2px] border-r-[2px] border-[#151f26] shadow-[inset_0_5px_25px_rgba(0,0,0,1)] ${isCompactViewport ? 'p-3' : 'p-4'} relative overflow-hidden flex flex-col transition-all duration-300 ${isLightOn ? 'shadow-[0_0_60px_#00f0ff]' : ''}`}>
              
              <div className={`absolute top-0 left-0 w-full h-[50%] bg-gradient-to-b from-white/10 to-transparent pointer-events-none transition-opacity duration-300 ${isLightOn ? 'from-white/40' : ''}`} />
              
              <div className="flex justify-between items-center w-full px-2 mt-1 z-10">
                 <span className="text-[8px] md:text-[9px] text-[#00f0ff] drop-shadow-[0_0_8px_#00f0ff] uppercase">{displayDateStrFull}</span>
                 <div className="flex gap-4 items-center">
                    <div className="flex gap-1.5 z-20">
                      {Object.keys(COLOR_SCHEMES).map(key => (
                        <button 
                          key={key} 
                          onClick={() => setColorSchemeKey(key)}
                          className={`w-2.5 h-2.5 rounded-full border border-black transition-all cursor-pointer ${colorSchemeKey === key ? 'ring-1 ring-white scale-110' : 'opacity-40 hover:opacity-100'}`}
                          style={{ backgroundColor: COLOR_SCHEMES[key].shadow, boxShadow: colorSchemeKey === key ? `0 0 5px ${COLOR_SCHEMES[key].shadow}` : 'none' }}
                          title={`Color: ${key}`}
                        />
                      ))}
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[5px] text-slate-500 mb-1">ALM</span>
                      <div className={`w-[6px] h-[6px] rounded-full border border-black ${isAlarmActive ? 'bg-[#ff00aa] shadow-[0_0_8px_#ff00aa]' : 'bg-slate-800'}`} />
                    </div>
                 </div>
              </div>

              <div className={`w-full flex justify-center items-center ${isCompactViewport ? 'mt-2.5 mb-1' : 'mt-4 mb-2'} relative z-10 pl-2`}>
                  <div className="wake-screen-clock text-center flex items-center justify-center -ml-2" 
                      style={{
                        fontFamily: '"Digital-7", monospace',
                        fontSize: isCompactViewport ? 'clamp(2.9rem, 15vw, 6.2rem)' : 'clamp(3.5rem, 18vw, 7.5rem)',
                        lineHeight: '0.8',
                        color: isAlarmActive ? currentScheme.active : currentScheme.inactive,
                        textShadow: isAlarmActive ? `0 0 10px ${currentScheme.shadow}, 0 0 20px ${currentScheme.shadow}, 0 0 35px ${currentScheme.shadow}` : 'none',
                        WebkitTextStroke: isAlarmActive ? `0.5px ${currentScheme.strokeActive}` : `1px ${currentScheme.strokeInactive}`, 
                        fontStyle: 'italic',
                        letterSpacing: 0
                      }}>
                   {displayData.mainString.split(':')[0]}
                   <span className={`opacity-90 -mx-1 md:-mx-2 mb-[10%] ${countdownTarget ? '' : 'animate-pulse'}`}>:</span>
                   {displayData.mainString.split(':')[1]}
                 </div>
                 <div className={`flex flex-col ml-3 ${isCompactViewport ? 'gap-1.5 mt-3' : 'gap-2 mt-4 md:mt-0'}`}>
                    <span className={`text-[8px] font-['Press_Start_2P'] uppercase ${displayData.mode === 'AM' || displayData.mode === 'COUNTDOWN' ? 'text-[#00f0ff] drop-shadow-[0_0_8px_#00f0ff]' : 'text-slate-700'}`}>
                      {countdownTarget ? 'MIN' : 'AM'}
                    </span>
                    <span className={`text-[8px] font-['Press_Start_2P'] uppercase ${displayData.mode === 'PM' || displayData.mode === 'COUNTDOWN' ? 'text-[#00f0ff] drop-shadow-[0_0_8px_#00f0ff]' : 'text-slate-700'}`}>
                      {countdownTarget ? 'SEC' : 'PM'}
                    </span>
                 </div>
              </div>

              {!isCompactViewport ? (
              <div className="wake-mobile-feed mt-4 pt-3 w-full flex flex-col z-10 px-2 lg:hidden gap-2">
                <div className="flex items-center gap-3 overflow-hidden w-full px-1">
                  <span className="text-[7px] md:text-[8px] text-slate-400 font-bold uppercase shrink-0 tracking-widest">FEED</span>
                  <span className="text-[7px] md:text-[8px] text-[#39ff14] font-bold drop-shadow-[0_0_8px_#39ff14] truncate tracking-wider">
                    {currentHabit.title}
                  </span>
                </div>
                
                <div className="w-full h-[2px] bg-[#1a252d] opacity-50"></div>
                
                <div 
                  onClick={openSettingsPanel}
                  className="flex items-center gap-2 overflow-hidden w-full cursor-pointer bg-black py-2 px-1 hover:bg-[#111] active:scale-95 transition-all mb-1"
                >
                  <span className="text-[7px] md:text-[8px] text-[#c026d3] font-bold uppercase shrink-0 drop-shadow-[0_0_5px_#c026d3]">ALARM:</span>
                  <span className="text-[7px] md:text-[8px] text-[#39ff14] font-bold drop-shadow-[0_0_8px_#39ff14] truncate tracking-wider">
                    {ALARM_VOICES.find(v => v.id === selectedVoice)?.name?.toUpperCase() || 'ALARM'}
                  </span>
                </div>
              </div>
              ) : null}
          </div>

          {/* HARDWARE CONTROL DECK */}
          <div className={`wake-control-deck w-full ${isCompactViewport ? 'mt-2 grid gap-1.5 px-1' : 'mt-3 md:mt-6 grid gap-2 md:gap-4 px-2'} grid-cols-4`}>
             {/* LEFT SIDE: ALARM TIME */}
             <div className="col-span-2 row-span-2 flex flex-col items-start bg-[#cfd6e0] px-2 py-2 md:py-3 rounded-lg shadow-[inset_1px_1px_5px_rgba(0,0,0,0.1)] relative overflow-hidden">
	               <div className="text-[6.5px] md:text-[7px] font-bold text-slate-700 uppercase mb-2 flex flex-col gap-1 w-full">
	                 {countdownTarget ? (
	                   <span className="text-[#ff00aa] text-center leading-tight py-1 animate-pulse">COUNTDOWN<br/>ACTIVE</span>
	                 ) : (
	                   <>
	                     <span>ALARM SET:</span>
	                     <button
	                       type="button"
	                       onClick={() => {
	                         const timeInput = alarmTimeInputRef.current;
	                         if (!timeInput) return;
	                         if (typeof timeInput.showPicker === 'function') {
	                           timeInput.showPicker();
	                           return;
	                         }
	                         timeInput.click();
	                       }}
	                       className="text-black bg-white/50 px-1.5 py-0.5 rounded cursor-pointer touch-manipulation hover:bg-white transition-colors self-start shadow-sm border border-white/60"
	                     >
	                       {alarmHours}:{alarmMinutes} {alarmAmPm}
	                     </button>
	                   </>
	                 )}
	               </div>
	               {!countdownTarget && (
	                 <input
	                   ref={alarmTimeInputRef}
	                   type="time"
	                   className="sr-only"
	                   onChange={handleTimePickerChange}
	                   value={get24HourString()}
	                   aria-label="Pick alarm time"
	                 />
	               )}

               <div className={`w-full rounded-lg border border-white/40 bg-white/55 px-2 ${isCompactViewport ? 'py-1.5 mb-2' : 'py-2 mb-3'} shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]`}>
                 <span className="text-[6px] font-black tracking-[0.2em] text-slate-500 uppercase block mb-1">Next Event</span>
                 <span className={`${isCompactViewport ? 'text-[7px]' : 'text-[8px]'} font-black text-slate-800 uppercase leading-tight block`}>
                   {nextEventStatusLabel}
                 </span>
                 <span className={`${isCompactViewport ? 'text-[6px]' : 'text-[7px]'} text-slate-600 leading-tight uppercase block mt-1 line-clamp-2`}>
                   {nextEventDetailLabel}
                 </span>
               </div>

               <div className="mt-auto w-full relative z-50">
                 <button 
                    onClick={async () => {
                      if (countdownTarget) {
                        await cancelScheduledAlarm();
                      } else {
                        if (isAlarmActive) {
                          setIsAlarmActive(false);
                          await disarmBackgroundEngine();
                        } else {
                          if (!(await ensureNotificationPermission())) return;
                          await warmAudioEngine();
                          setCountdownTarget(null);
                          setIsAlarmActive(true);
                          armBackgroundEngine(`Set for ${alarmHours}:${alarmMinutes} ${alarmAmPm}`);
                        }
                      }
                    }}
                    className="w-[60px] h-[24px] bg-slate-800 rounded-full chunky-track relative flex items-center px-1 shrink-0 z-10 cursor-pointer touch-manipulation shadow-[0_2px_5px_rgba(0,0,0,0.3)]"
                 >
                    <div className={`w-[20px] h-[20px] rounded-full absolute border-b-[3px] transition-all duration-200 ${isAlarmActive ? 'border-[#0099aa] left-[36px]' : 'bg-slate-400 border-slate-500 left-1'}`} style={isAlarmActive ? {backgroundColor: '#00f0ff'} : {}} />
                 </button>
               </div>
             </div>

             {/* RIGHT SIDE TOP: TOGGLES */}
             <div className="col-span-2 flex flex-row gap-2 h-full">
                <div className="flex-1 flex flex-col justify-evenly items-center bg-[#cfd6e0] p-1 py-2 md:p-2 md:py-3 rounded-lg shadow-[inset_1px_1px_5px_rgba(0,0,0,0.1)] h-full">
                  <span className="text-[5.5px] md:text-[6px] text-slate-700 uppercase leading-[1.2] text-center font-bold">VOL<br/>MUTE</span>
                  <button onClick={() => setIsMuted(!isMuted)} className={`w-[22px] h-[22px] rounded-md border-b-[3px] active:scale-95 cursor-pointer touch-manipulation transition-transform mt-1 shadow-sm ${isMuted ? 'bg-[#ff00aa] border-[#990066]' : 'bg-slate-400 border-slate-500'}`} />
                </div>
                <div className="flex-1 flex flex-col justify-evenly items-center bg-[#cfd6e0] p-1 py-2 md:p-2 md:py-3 rounded-lg shadow-[inset_1px_1px_5px_rgba(0,0,0,0.1)] h-full">
                  <span className="text-[5.5px] md:text-[6px] text-slate-700 uppercase leading-[1.2] text-center font-bold">PRESS<br/>CANCEL</span>
                  <button
                    onClick={() => {
                      void cancelScheduledAlarm();
                    }}
                    disabled={!canCancelAlarm}
                    className={`w-full max-w-[68px] h-[26px] rounded-md border-b-[3px] active:scale-95 cursor-pointer touch-manipulation transition-transform mt-1 shadow-sm text-[6px] font-black tracking-[0.15em] uppercase ${
                      canCancelAlarm
                        ? 'bg-[#ff6b6b] border-[#b42323] text-white'
                        : 'bg-slate-300 border-slate-400 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
             </div>
          </div>

          {Capacitor.isNativePlatform() ? (
            <div className={`wake-mobile-actions w-full flex justify-between ${isCompactViewport ? 'gap-2 mt-2 px-1' : 'gap-4 mt-3 px-2'}`}>
               <button onClick={openSettingsPanel} className="flex-1 bg-[#1a202c] border-b-[6px] border-[#0d1218] active:scale-95 rounded-xl h-[45px] flex items-center justify-center p-2 group cursor-pointer touch-manipulation transition-all">
                  <Settings className="w-[18px] h-[18px] text-[#00f0ff] drop-shadow-[0_0_5px_#00f0ff] pointer-events-none" strokeWidth={3} />
               </button>
               <button onClick={() => setShowHabitModal(true)} className="flex-1 bg-[#1a202c] border-b-[6px] border-[#0d1218] active:scale-95 rounded-xl h-[45px] flex items-center justify-center p-2 group cursor-pointer touch-manipulation transition-all hover:brightness-125">
                  <ListTodo className="w-[18px] h-[18px] text-[#39ff14] drop-shadow-[0_0_5px_#39ff14] pointer-events-none" strokeWidth={3} />
               </button>
               <button onClick={openProfilePanel} className="flex-1 bg-[#1a202c] border-b-[6px] border-[#0d1218] active:scale-95 rounded-xl h-[45px] flex items-center justify-center p-2 group cursor-pointer touch-manipulation transition-all hover:brightness-125">
                  <User className="w-[18px] h-[18px] text-[#ff00aa] drop-shadow-[0_0_5px_#ff00aa] pointer-events-none" strokeWidth={3} />
               </button>
            </div>
          ) : null}

          {/* DEDICATED QUICK TIMERS HARDWARE ROW */}
          <div className={`wake-timers w-full ${isCompactViewport ? 'px-1 mt-2 gap-1.5 grid grid-cols-3' : 'px-2 mt-3 md:mt-5 gap-2 grid grid-cols-2 md:flex md:flex-wrap'}`}>
             <button 
                onClick={() => {
                  void setTimerMinutes(1);
                }} 
                className={`flex-1 min-w-0 relative ${isCompactViewport ? 'h-[36px]' : 'h-[42px] md:h-[50px]'} bg-[#ff2a2a] rounded-[12px] flex flex-col items-center justify-center border-b-[6px] border-r-[3px] border-[#990000] active:scale-[0.98] outline-none shadow-md cursor-pointer touch-manipulation transition-transform hover:brightness-110`}
             >
                <span className="text-[9px] md:text-[10px] text-white uppercase font-black drop-shadow-[1px_1px_0px_rgba(0,0,0,0.8)] tracking-wide">BLAST</span>
                <span className="text-[6px] text-[#ffcccc] font-bold mt-0.5 tracking-widest">1 MIN</span>
             </button>

             <button 
                onClick={() => {
                  void setTimerMinutes(3);
                }} 
                className={`flex-1 min-w-0 relative ${isCompactViewport ? 'h-[36px]' : 'h-[42px] md:h-[50px]'} bg-[#9d00ff] rounded-[12px] flex flex-col items-center justify-center border-b-[6px] border-r-[3px] border-[#550099] active:scale-[0.98] outline-none shadow-md cursor-pointer touch-manipulation transition-transform hover:brightness-110`}
             >
                <span className="text-[9px] md:text-[10px] text-white uppercase font-black drop-shadow-[1px_1px_0px_rgba(0,0,0,0.8)] tracking-wide">BREATHE</span>
                <span className="text-[6px] text-[#e6ccff] font-bold mt-0.5 tracking-widest">3 MIN</span>
             </button>

             <button 
                onClick={() => {
                  void setTimerMinutes(5);
                }} 
                className={`flex-1 min-w-0 relative ${isCompactViewport ? 'h-[36px]' : 'h-[42px] md:h-[50px]'} bg-[#ffaa00] rounded-[12px] flex flex-col items-center justify-center border-b-[6px] border-r-[3px] border-[#996600] active:scale-[0.98] outline-none shadow-md cursor-pointer touch-manipulation transition-transform hover:brightness-110`}
             >
                <span className="text-[9px] md:text-[10px] text-black uppercase font-black drop-shadow-[1px_1px_0px_rgba(255,255,255,0.8)] tracking-wide">PWR NAP</span>
                <span className="text-[6px] text-[#664400] font-bold mt-0.5 tracking-widest">5 MIN</span>
             </button>

             <button 
                onClick={() => {
                  void setTimerMinutes(15);
                }} 
                className={`flex-1 min-w-0 relative ${isCompactViewport ? 'h-[36px]' : 'h-[42px] md:h-[50px]'} bg-[#39ff14] rounded-[12px] flex flex-col items-center justify-center border-b-[6px] border-r-[3px] border-[#1b9900] active:scale-[0.98] outline-none shadow-md cursor-pointer touch-manipulation transition-transform hover:brightness-110`}
             >
                <span className="text-[9px] md:text-[10px] text-black uppercase font-black drop-shadow-[1px_1px_0px_rgba(255,255,255,0.8)] tracking-wide">HUSTLE</span>
                <span className="text-[6px] text-[#0d3300] font-bold mt-0.5 tracking-widest">15 MIN</span>
             </button>
             
             <button 
                onClick={() => {
                  void setTimerMinutes(25);
                }} 
                className={`flex-1 min-w-0 relative ${isCompactViewport ? 'h-[36px]' : 'h-[42px] md:h-[50px]'} bg-[#00f0ff] rounded-[12px] flex flex-col items-center justify-center border-b-[6px] border-r-[3px] border-[#0099aa] active:scale-[0.98] outline-none shadow-md cursor-pointer touch-manipulation transition-transform hover:brightness-110`}
             >
                <span className="text-[9px] md:text-[10px] text-black uppercase font-black drop-shadow-[1px_1px_0px_rgba(255,255,255,0.8)] tracking-wide">POMODORO</span>
                <span className="text-[6px] text-[#004455] font-bold mt-0.5 tracking-widest">25 MIN</span>
             </button>

             <button 
                onClick={() => {
                  void setTimerMinutes(60);
                }} 
                className={`flex-1 min-w-0 relative ${isCompactViewport ? 'h-[36px]' : 'h-[42px] md:h-[50px]'} bg-[#ff00aa] rounded-[12px] flex flex-col items-center justify-center border-b-[6px] border-r-[3px] border-[#990066] active:scale-[0.98] outline-none shadow-md cursor-pointer touch-manipulation transition-transform hover:brightness-110`}
             >
                <span className="text-[9px] md:text-[10px] text-white uppercase font-black drop-shadow-[1px_1px_0px_rgba(0,0,0,0.8)] tracking-wide">GRIND</span>
                <span className="text-[6px] text-[#ffb3e6] font-bold mt-0.5 tracking-widest">60 MIN</span>
             </button>
          </div>

          {/* QUICK ALARM PRESETS */}
          <div className={`wake-presets w-full ${isCompactViewport ? 'px-1 mt-1.5 gap-1.5' : 'px-2 mt-2 md:mt-3 gap-2'} grid grid-cols-3`}>
             {[5, 6, 7].map(hour => {
               const isActivePreset = isAlarmActive && !countdownTarget && alarmHours === hour.toString().padStart(2, '0') && alarmMinutes === '00' && alarmAmPm === 'AM';
               return (
                 <button 
                   key={hour}
                   onClick={async () => {
                     if (!(await ensureNotificationPermission())) return;
                     await warmAudioEngine();
                     const hStr = hour.toString().padStart(2, '0');
                     setAlarmHours(hStr);
                     setAlarmMinutes('00');
                     setAlarmAmPm('AM');
                     setIsAlarmActive(true);
                     setCountdownTarget(null);
                     armBackgroundEngine(`Set for ${hStr}:00 AM`);
                   }}
                   className={`relative ${isCompactViewport ? 'h-[28px]' : 'h-[32px] md:h-[36px]'} rounded-[8px] flex items-center justify-center border-b-[4px] border-r-[2px] active:scale-[0.98] outline-none cursor-pointer touch-manipulation transition-all ${
                     isActivePreset 
                       ? 'bg-[#00f0ff] border-[#0099aa] shadow-[0_0_10px_#00f0ff,inset_1px_1px_3px_rgba(255,255,255,0.8)]' 
                       : 'bg-[#cfd6e0] border-[#8a96a8] shadow-[inset_1px_1px_3px_rgba(255,255,255,0.8)] hover:brightness-105'
                   }`}
                 >
                   <span className={`text-[9px] md:text-[10px] uppercase font-black tracking-widest text-shadow-sm transition-colors ${
                     isActivePreset ? 'text-black drop-shadow-[1px_1px_0px_rgba(255,255,255,0.8)]' : 'text-slate-800'
                   }`}>
                     {hour}:00 AM
                   </span>
                   {/* Hardware active LED indicator */}
                   <div className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full border border-black/20 ${isActivePreset ? 'bg-[#ff00aa] shadow-[0_0_5px_#ff00aa]' : 'bg-black/20'}`} />
                 </button>
               );
             })}
          </div>

          {!isAdFree && (!Capacitor.isNativePlatform() || !hasNativeAdMobBanner) ? (
            <div className="wake-sponsored-card w-full mt-3 px-2">
              {isCompactViewport ? (
                <div className="relative overflow-hidden rounded-xl border-[3px] border-[#ff00aa] bg-gradient-to-r from-[#140713] via-[#120814] to-[#071220] p-2.5 shadow-[0_0_20px_rgba(255,0,170,0.15)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[#00f0ff] text-[6px] uppercase tracking-[0.22em] block">
                        Sponsored
                      </span>
                      <h3 className="mt-1 text-white text-[9px] font-black uppercase tracking-[0.14em] truncate">
                        {sponsorMessage.headline}
                      </h3>
                    </div>
                    <button
                      onClick={openSponsoredDestination}
                      className="shrink-0 rounded-lg bg-[#00f0ff] border-b-[4px] border-[#0099aa] px-3 py-2 text-[6px] font-black uppercase tracking-[0.18em] text-black hover:brightness-110 active:translate-y-1 active:border-b-0"
                    >
                      {isExtraCompactViewport ? 'Open' : sponsorMessage.cta}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-xl border-[3px] border-[#ff00aa] bg-gradient-to-r from-[#140713] via-[#120814] to-[#071220] p-3 shadow-[0_0_20px_rgba(255,0,170,0.15)]">
                  <div className="absolute top-2 right-2 rounded-full bg-[#ffea00] px-2 py-1 text-[6px] font-black uppercase tracking-[0.2em] text-black">
                    Sponsored
                  </div>
                  <span className="text-[#00f0ff] text-[7px] uppercase tracking-[0.22em] block mb-2">
                    Free Tier Signal
                  </span>
                  <h3 className="text-white text-[12px] font-black uppercase tracking-[0.14em] pr-16">
                    {sponsorMessage.headline}
                  </h3>
                  <p className="mt-2 text-[8px] uppercase leading-relaxed text-slate-300 max-w-[95%]">
                    {sponsorMessage.body}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={openSponsoredDestination}
                      className="rounded-lg bg-[#00f0ff] border-b-[4px] border-[#0099aa] px-3 py-2 text-[7px] font-black uppercase tracking-[0.18em] text-black hover:brightness-110 active:translate-y-1 active:border-b-0"
                    >
                      {sponsorMessage.cta}
                    </button>
                    <button
                      onClick={openProfilePanel}
                      className="rounded-lg bg-[#ff00aa] border-b-[4px] border-[#990066] px-3 py-2 text-[7px] font-black uppercase tracking-[0.18em] text-white hover:brightness-110 active:translate-y-1 active:border-b-0"
                    >
                      Remove Ads
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* HABIT MASTERY PROGRESS HUD */}
          {!isExtraCompactViewport ? (
          <div className="wake-habit-mobile w-full mt-3 px-2 md:hidden">
            <div className="bg-[#1a252d] border-[3px] border-[#0a0f12] rounded-xl p-3 shadow-[inset_0_3px_15px_rgba(0,0,0,0.8)] relative">
              <div className="flex items-center justify-between gap-2">
                <span className="bg-[#e0e5ec] text-[#000] text-[7px] font-black px-2 py-1 border-[2px] border-[#1a252d] uppercase">
                  HABIT DAY {habitState.currentDay}
                </span>
                <button
                  onClick={() => setShowHabitModal(true)}
                  className="bg-[#ff00aa] text-white text-[7px] font-black px-2 py-1 border-[2px] border-[#1a252d] uppercase hover:brightness-125 cursor-pointer touch-manipulation"
                >
                  VIEW INTEL
                </button>
              </div>

              <div className={`mt-3 text-[9px] leading-relaxed text-[#00f0ff] drop-shadow-[0_0_5px_#00f0ff] font-['Space_Grotesk'] uppercase border-l-[3px] border-[#ff00aa] pl-2 ${isCompactViewport ? 'line-clamp-2 text-[7px] leading-snug' : ''}`}>
                {isHabitCompletedToday ? 'Mission cleared for today.' : currentHabit.actionTip}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#334654] pt-3">
                <span className={`text-[7px] uppercase tracking-[0.18em] ${isHabitCompletedToday ? 'text-[#39ff14]' : 'text-[#ff00aa]'}`}>
                  {isHabitCompletedToday ? 'Mission Complete' : 'Mission Pending'}
                </span>
                <button
                  onClick={() => {
                    if (isHabitCompletedToday) {
                      setHabitState(prev => ({ ...prev, completedDate: null }));
                      return;
                    }
                    initAudioContext();
                    completeHabitForToday();
                  }}
                  className={`rounded-lg px-3 py-2 text-[7px] font-black uppercase tracking-[0.16em] ${
                    isHabitCompletedToday
                      ? 'bg-slate-700 text-slate-200'
                      : 'bg-[#00f0ff] text-black'
                  }`}
                >
                  {isHabitCompletedToday ? 'Undo' : 'Done'}
                </button>
              </div>
            </div>
          </div>
          ) : null}

          <div className="hidden w-full mt-3 md:mt-5 px-2 md:block">
            <div className="bg-[#1a252d] border-[3px] border-[#0a0f12] rounded-xl p-2 pb-2 md:p-3 md:pb-2 shadow-[inset_0_3px_15px_rgba(0,0,0,0.8)] relative flex flex-col justify-between">
              <div className="absolute -top-3 left-4 flex gap-2">
                <span className="bg-[#e0e5ec] text-[#000] text-[8px] font-black px-2 py-0.5 border-[2px] border-[#1a252d] uppercase drop-shadow-md">
                   HABIT MASTERY: DAY {habitState.currentDay}
                </span>
                <button onClick={() => setShowHabitModal(true)} className="bg-[#ff00aa] text-white text-[7px] font-black px-2 py-0.5 border-[2px] border-[#1a252d] uppercase hover:brightness-125 cursor-pointer touch-manipulation">
                   VIEW INTEL
                </button>
              </div>

              {!isHabitCompletedToday ? (
                 <>
                    <div className="mt-2 text-[10px] leading-relaxed text-[#00f0ff] drop-shadow-[0_0_5px_#00f0ff] font-['Space_Grotesk'] uppercase mb-3 pr-2 max-h-[60px] overflow-y-auto custom-scrollbar border-l-[3px] border-[#ff00aa] pl-2">
                       "{currentHabit.morningMindset}"
                    </div>

                    <div className="text-[10px] leading-relaxed text-[#00f0ff] drop-shadow-[0_0_5px_#00f0ff] font-['Space_Grotesk'] uppercase mb-3 border-t border-[#334654] pt-2">
                       <span className="text-[#ff00aa] font-black tracking-widest text-[7px] block mb-1">MISSION DIRECTIVE:</span>
                       {currentHabit.actionTip}
                    </div>

                    <div className="flex justify-between items-center w-full mt-1 border-t border-[#334654] pt-2">
                       <span className="text-[7px] font-['Press_Start_2P'] uppercase tracking-tighter text-[#ff00aa] drop-shadow-[0_0_5px_#ff00aa]">
                         MISSION: PENDING
                       </span>
                       <button 
                          onClick={() => {
                             initAudioContext();
                             completeHabitForToday();
                          }}
                          className="w-[45px] h-[18px] rounded flex items-center justify-center border-[2px] cursor-pointer touch-manipulation active:scale-[0.9] transition-transform bg-[#00f0ff] border-[#0099aa] shadow-[0_0_10px_#00f0ff] hover:brightness-110"
                       >
                          <span className="text-[7px] font-black uppercase text-black">
                            DONE
                          </span>
                       </button>
                    </div>
                 </>
              ) : (
                 <div className="mt-4 flex justify-between items-center w-full bg-[#0a120e] border border-[#39ff14]/40 rounded-lg p-3 shadow-[0_0_15px_rgba(57,255,20,0.1)]">
                    <div className="flex items-center gap-3">
                       <div className="w-1.5 h-1.5 rounded-full bg-[#39ff14] animate-pulse shadow-[0_0_8px_#39ff14]" />
                       <span className="text-[#39ff14] text-[8px] font-black uppercase tracking-widest drop-shadow-[0_0_5px_#39ff14]">
                          DAY {habitState.currentDay} COMPLETE
                       </span>
                    </div>
                    <button 
                       onClick={() => setHabitState(prev => ({...prev, completedDate: null}))}
                       className="text-[6px] text-slate-500 font-['Press_Start_2P'] uppercase tracking-tighter hover:text-slate-300 active:scale-95 cursor-pointer touch-manipulation"
                    >
                       [UNDO]
                    </button>
                 </div>
              )}
            </div>
          </div>

          {!Capacitor.isNativePlatform() ? (
            <div className="hidden w-full justify-between gap-4 mt-4 md:mt-6 px-2 md:flex">
             <button onClick={openSettingsPanel} className="flex-1 bg-[#1a202c] border-b-[6px] border-[#0d1218] active:scale-95 rounded-xl h-[45px] flex items-center justify-center p-2 group cursor-pointer touch-manipulation transition-all">
                <Settings className="w-[18px] h-[18px] text-[#00f0ff] drop-shadow-[0_0_5px_#00f0ff] pointer-events-none" strokeWidth={3} />
             </button>
             <button onClick={() => setShowHabitModal(true)} className="flex-1 bg-[#1a202c] border-b-[6px] border-[#0d1218] active:scale-95 rounded-xl h-[45px] flex items-center justify-center p-2 group cursor-pointer touch-manipulation transition-all hover:brightness-125">
                <ListTodo className="w-[18px] h-[18px] text-[#39ff14] drop-shadow-[0_0_5px_#39ff14] pointer-events-none" strokeWidth={3} />
             </button>
             <button onClick={openProfilePanel} className="flex-1 bg-[#1a202c] border-b-[6px] border-[#0d1218] active:scale-95 rounded-xl h-[45px] flex items-center justify-center p-2 group cursor-pointer touch-manipulation transition-all hover:brightness-125">
                <User className="w-[18px] h-[18px] text-[#ff00aa] drop-shadow-[0_0_5px_#ff00aa] pointer-events-none" strokeWidth={3} />
             </button>
            </div>
          ) : null}

        </div>
        
        {showSettings ? renderViewportOverlay(
          <div className="fixed inset-0 z-[140] flex flex-col justify-end bg-black/70 p-4 animate-fade-in pointer-events-auto">
             <div className="w-full max-w-[430px] mx-auto bg-[#1e2530] border-t-8 border-[#0a0e14] rounded-t-3xl p-6 relative max-h-[min(34rem,80dvh)] overflow-y-auto shadow-[0_-20px_60px_rgba(0,0,0,0.55)]">
               <div className="sticky top-0 z-20 -mx-2 -mt-2 mb-4 flex items-center justify-between gap-4 bg-[#1e2530]/95 px-2 pb-3 pt-2 backdrop-blur">
                 <h2 className="text-[12px] text-[#00f0ff] uppercase drop-shadow-[0_0_5px_#00f0ff] leading-snug">Alarm & Device Settings</h2>
                 <button onClick={() => { setShowSettings(false); cancelSpeechSynthesis(); safeStopAudio(); }} className="shrink-0 text-white bg-slate-800 rounded-lg border-b-4 border-slate-900 active:border-b-0 active:translate-y-1 cursor-pointer touch-manipulation w-10 h-10 flex items-center justify-center font-black text-lg transition-transform hover:scale-105">✕</button>
               </div>
               <div className="mb-4">
                 {renderDeviceAccessPanel()}
               </div>
               <div className="space-y-3">
                 {ALARM_VOICES.map((voice) => (
                 <button 
                     key={voice.id}
                     onPointerDown={() => {
                        void warmAudioEngine();
                     }}
                     onClick={(e) => {
                        setSelectedVoice(voice.id);
                        playSample(voice.id, e); // Give instant audio preview feedback!
                     }}
                     className={`w-full flex items-center justify-between p-4 rounded-xl border-b-4 active:scale-[0.98] cursor-pointer touch-manipulation transition-all ${selectedVoice === voice.id ? 'bg-[#10141a] border-[#ff00aa]' : 'bg-slate-800 border-slate-900'}`}
                   >
                     <div className="flex items-center gap-4 pointer-events-none">
                       <span className="text-2xl">{voice.icon}</span>
                       <div className="flex flex-col text-left gap-2">
                         <span className="text-[8px] text-white uppercase">{voice.name}</span>
                       </div>
                     </div>
                   </button>
                 ))}
               </div>


             </div>
          </div>,
        ) : null}

        {/* PROFILE OVERLAY */}
        {showProfile ? renderViewportOverlay(
          <div className="fixed inset-0 z-[140] flex flex-col justify-center items-center overflow-y-auto bg-black/85 p-4 animate-fade-in pointer-events-auto">
             <div className="w-full max-w-[360px] max-h-[min(40rem,88dvh)] overflow-y-auto bg-[#1e2530] border-[3px] border-[#ff00aa] shadow-[0_0_50px_rgba(255,0,170,0.3)] rounded-3xl p-6 relative flex flex-col">
               <div className="sticky top-0 z-20 -mx-2 -mt-2 mb-4 flex items-center justify-between gap-4 bg-[#1e2530]/95 px-2 pb-3 pt-2 backdrop-blur">
                 <h2 className="text-[12px] text-[#ff00aa] uppercase text-center drop-shadow-[0_0_5px_#ff00aa] font-black tracking-widest leading-snug">
                    OPERATOR PROFILE
                 </h2>
                 <button onClick={() => setShowProfile(false)} className="shrink-0 text-slate-300 bg-slate-900 rounded-lg border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 cursor-pointer touch-manipulation w-10 h-10 flex items-center justify-center text-[20px] font-black hover:text-[#ff00aa] transition-colors">✕</button>
               </div>
               
               {!userProfile ? (
                 <div className="space-y-4">
                   <div className="text-center mb-6">
                      <span className="text-slate-400 text-[9px] uppercase leading-relaxed block">Create a local auth profile to save your alarm setup, calendar link, and subscription state locally.</span>
                    </div>
                   {renderRemoveAdsPanel()}
                   {renderDeviceAccessPanel()}
                   <input type="text" placeholder="CALLSIGN / NAME" value={tempName} onChange={e => setTempName(e.target.value)} className="w-full bg-slate-900 text-[#00f0ff] p-4 rounded-xl border-2 border-slate-700 focus:border-[#00f0ff] outline-none font-['Space_Grotesk'] tracking-widest uppercase text-center" />
                   <input type="email" placeholder="EMAIL ADDRESS" value={tempEmail} onChange={e => setTempEmail(e.target.value)} className="w-full bg-slate-900 text-[#00f0ff] p-4 rounded-xl border-2 border-slate-700 focus:border-[#00f0ff] outline-none font-['Space_Grotesk'] tracking-widest uppercase text-center" />
                   <button 
                     onClick={() => {
                        if(tempName.trim()) {
                          const profile = { name: tempName.trim(), email: tempEmail.trim() };
                          localStorage.setItem('eb28_user_profile', JSON.stringify(profile));
                          setUserProfile(profile);
                        }
                     }}
                     className="w-full mt-4 bg-[#ff00aa] text-white font-black uppercase tracking-widest p-4 rounded-xl border-b-[6px] border-[#990066] active:border-b-0 active:translate-y-1 shadow-[0_0_15px_#ff00aa] hover:brightness-110 transition-all cursor-pointer touch-manipulation"
                   >
                     INITIALIZE UPLINK
                   </button>
                 </div>
               ) : (
                 <div className="text-center py-4">
                   <div className="w-20 h-20 bg-[#ff00aa] rounded-full mx-auto mb-4 flex items-center justify-center text-4xl font-black text-white shadow-[0_0_30px_#ff00aa] border-[3px] border-white">
                      {userProfile.name.charAt(0).toUpperCase()}
                   </div>
                   <h3 className="text-[#00f0ff] text-[22px] font-black uppercase tracking-widest drop-shadow-[0_0_8px_#00f0ff]">
                      {userProfile.name}
                   </h3>
                   <p className="text-slate-400 text-[10px] mt-2 mb-8 uppercase tracking-widest">
                      {userProfile.email || 'GUEST PROXY'}
                   </p>

                   <div className="mb-6">
                     {renderRemoveAdsPanel()}
                   </div>
                   
                   <div className="bg-[#0a120e] border border-[#39ff14] rounded-xl p-4 mb-8 shadow-[0_0_20px_rgba(57,255,20,0.1)] relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-[#39ff14]" />
                      <span className="text-[#39ff14] text-[12px] uppercase font-black tracking-widest block drop-shadow-[0_0_8px_#39ff14] mb-2">AUTH LINKED</span>
                      <span className="text-slate-400 text-[9px] uppercase block leading-relaxed">Habit Mastery & Custom Audio Uploads are fully authorized.</span>
                   </div>

                   <div className="mb-8">
                     {renderDeviceAccessPanel()}
                   </div>

                   <button 
                      onClick={() => { 
                         localStorage.removeItem('eb28_user_profile'); 
                         localStorage.removeItem('eb28_calendar_url');
                         localStorage.removeItem('eb28_calendar_permission_state');
                         setUserProfile(null); 
                         setCalendarUrl('');
                         setTempCalUrl('');
                         setCalendarPermissionState('prompt');
                         setUpcomingEvent(null);
                      }} 
                      className="w-full text-slate-500 text-[9px] uppercase tracking-[0.2em] p-3 rounded-xl border border-slate-800 active:bg-slate-900 hover:text-white transition-colors cursor-pointer touch-manipulation"
                   >
                     OVERRIDE / UNLINK DEVICE
                   </button>
                 </div>
               )}
             </div>
          </div>,
        ) : null}

        {/* MORNING MINDSET INTERCEPTION MODAL */}
        {showHabitModal ? renderViewportOverlay(
          <div className="fixed inset-0 z-[160] flex flex-col justify-center items-center bg-[#05080a]/95 backdrop-blur-md p-6 animate-fade-in text-center px-4 md:px-0 pointer-events-auto">
             <div className="w-full max-w-sm border-[3px] border-[#39ff14] shadow-[0_0_50px_rgba(57,255,20,0.3)] bg-gradient-to-b from-[#0a120e] to-[#040806] rounded-3xl p-6 relative flex flex-col overflow-hidden">
                <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-24 h-1.5 bg-[#39ff14] shadow-[0_2px_15px_#39ff14]" />
                
                <h1 className="text-[#39ff14] font-['Space_Grotesk'] text-5xl uppercase font-black tracking-tighter mb-1 mt-2 drop-shadow-[0_2px_10px_#39ff14]">
                  DAY {currentHabit.day}
                </h1>
                <h2 className="text-[#00f0ff] text-[11px] tracking-widest uppercase leading-snug drop-shadow-[0_0_8px_#00f0ff]">
                  {currentHabit.title}
                </h2>
                
                <div className="text-slate-200 mt-6 font-['Inter'] text-[14px] leading-relaxed text-left max-h-[35vh] overflow-y-auto overflow-x-hidden pr-3 custom-scrollbar">
                   {currentHabit.morningMindset}
                </div>

                <div className="mt-8 border-t border-[#39ff14]/30 pt-6">
                   <div className="w-full flex justify-center mb-4">
                      <span className="text-[#39ff14] text-[9px] font-black tracking-[0.3em] uppercase bg-[#14301a] px-4 py-1.5 rounded-full border border-[#39ff14]/50 shadow-[0_0_10px_rgba(57,255,20,0.2)]">
                        MISSION BRIEFING
                      </span>
                   </div>
                   <p className="text-white font-['Space_Grotesk'] text-[15px] font-bold tracking-tight leading-snug text-left">
                     {currentHabit.actionTip}
                   </p>
                </div>

                <button 
                  onClick={() => {
                     completeHabitForToday();
                     setShowHabitModal(false);
                  }}
                  className="mt-8 w-full bg-[#39ff14] text-black font-black uppercase text-sm tracking-widest py-4 rounded-xl border-b-[6px] border-[#1b9900] active:translate-y-1 active:border-b-0 transition-transform shadow-[0_5px_20px_rgba(57,255,20,0.3)] cursor-pointer touch-manipulation hover:brightness-110"
                >
                  ACKNOWLEDGE
                </button>
             </div>
          </div>,
        ) : null}

        {/* ALARM RINGING FULL-SCREEN OVERLAY */}
        {isRinging ? renderViewportOverlay(
          <div 
            onClick={handleSnoozeLight}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm cursor-pointer animate-pulse px-4"
          >
             <h1 
               className="text-5xl md:text-8xl font-black tracking-widest text-center uppercase" 
               style={{ 
                 color: currentScheme.active, 
                 textShadow: `0 0 20px ${currentScheme.shadow}, 0 0 60px ${currentScheme.shadow}`,
                 fontFamily: '"Space Grotesk", sans-serif'
               }}
             >
               SLAM<br/>TO<br/>STOP<br/>ALARM
             </h1>
          </div>
        ) : null}

      </div>
    </div>
  );
}
