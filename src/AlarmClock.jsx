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
import {
  Activity,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Home,
  Settings,
  ShieldCheck,
  User,
  Volume2,
  X,
  Zap
} from 'lucide-react';
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
import {
  cancelWakeUpNativeAlarm,
  getWakeUpNativeAlarmAuthorization,
  requestWakeUpNativeAlarmAuthorization,
  scheduleWakeUpNativeAlarm
} from './wakeUpNativeAlarm';
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
const NATIVE_ALARMKIT_ALARM_ID = '00000000-0000-0000-0000-000000000601';

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

const QUOTES_OF_THE_DAY = [
  {
    text: "When one part of your day gets disrupted, do not call the whole day ruined. Ask what is my next best move now, and do only that.",
    author: "Wake Up Ya Bish"
  },
  {
    text: "The win is not a perfect morning. The win is returning to the mission before the day gets away from you.",
    author: "Wake Up Ya Bish"
  },
  {
    text: "Energy follows the first honest action. Start small, start now, and let momentum catch up.",
    author: "Wake Up Ya Bish"
  },
  {
    text: "Discipline gets easier when the next step is obvious. Make the next step small enough to do immediately.",
    author: "Wake Up Ya Bish"
  },
  {
    text: "Your calendar does not need more pressure. It needs fewer loose ends and one clear priority.",
    author: "Wake Up Ya Bish"
  },
  {
    text: "A streak is built by ordinary days handled on purpose.",
    author: "Wake Up Ya Bish"
  },
  {
    text: "Do the part that proves you are back in the driver's seat.",
    author: "Wake Up Ya Bish"
  }
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
  const [nativeAlarmKitState, setNativeAlarmKitState] = useState(() => getSaved('eb28_alarmkit_authorization_state', 'unknown'));
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

  const syncNativeAlarmKitState = useCallback(async ({ requestAccess = false } = {}) => {
    if (!Capacitor.isNativePlatform()) return { available: false, authorized: false };

    try {
      const result = requestAccess
        ? await requestWakeUpNativeAlarmAuthorization()
        : await getWakeUpNativeAlarmAuthorization();
      const authorization = result?.authorization || 'unknown';
      const available = Boolean(result?.available);
      setNativeAlarmKitState(available ? authorization : 'unavailable');
      return {
        available,
        authorized: authorization === 'authorized',
        authorization,
        errorMessage: result?.errorMessage || ''
      };
    } catch (err) {
      console.warn('AlarmKit permission check failed', err);
      setNativeAlarmKitState('error');
      return { available: false, authorized: false, authorization: 'error', errorMessage: err?.message || '' };
    }
  }, []);

  const ensureNotificationPermission = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return true;

    const [granted, alarmKit] = await Promise.all([
      syncNotificationPermissionState({ requestAccess: true }),
      syncNativeAlarmKitState({ requestAccess: true })
    ]);
    setNotificationSetupMessage(
      alarmKit.authorized
        ? 'System alarms are armed through iOS AlarmKit for Lock Screen delivery.'
        : granted
          ? 'Notification fallback is armed. Enable Alarm access for the most reliable Lock Screen alarm.'
          : 'Alerts are turned off. Enable Alarm or Notification access so alarms can fire after the app closes.'
    );
    return alarmKit.authorized || granted;
  }, [syncNativeAlarmKitState, syncNotificationPermissionState]);

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
    localStorage.setItem('eb28_alarmkit_authorization_state', JSON.stringify(nativeAlarmKitState));
  }, [nativeAlarmKitState]);

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
        await cancelWakeUpNativeAlarm(NATIVE_ALARMKIT_ALARM_ID);
      } catch (err) {
        console.warn('Failed to cancel AlarmKit alarm', err);
      }
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
    syncNativeAlarmKitState()
      .catch((err) => {
        console.warn('AlarmKit permission check failed', err);
      });
  }, [syncNativeAlarmKitState, syncNotificationPermissionState]);

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

  const getNativeAlarmDeliveryTarget = useCallback((overrides = {}) => {
    const nextIsAlarmActive = typeof overrides.isAlarmActive === 'boolean'
      ? overrides.isAlarmActive
      : isAlarmActive;
    if (!nextIsAlarmActive) return null;

    const nextCountdownTarget = Object.prototype.hasOwnProperty.call(overrides, 'countdownTarget')
      ? overrides.countdownTarget
      : countdownTarget;
    const nextAlarmHours = overrides.alarmHours ?? alarmHours;
    const nextAlarmMinutes = overrides.alarmMinutes ?? alarmMinutes;
    const nextAlarmAmPm = overrides.alarmAmPm ?? alarmAmPm;

    const now = new Date();
    let targetH = parseInt(nextAlarmHours, 10);
    if (nextAlarmAmPm === 'PM' && targetH < 12) targetH += 12;
    if (nextAlarmAmPm === 'AM' && targetH === 12) targetH = 0;

    const targetTime = nextCountdownTarget
      ? new Date(nextCountdownTarget)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate(), targetH, parseInt(nextAlarmMinutes, 10), 0);

    if (!nextCountdownTarget && targetTime.getTime() <= now.getTime()) {
      targetTime.setDate(targetTime.getDate() + 1);
    }

    return {
      mode: nextCountdownTarget ? 'countdown' : 'clock',
      targetTime,
      hour24: targetH,
      minute: parseInt(nextAlarmMinutes, 10),
      label: nextCountdownTarget
        ? 'WAKE UP YA BISH TIMER'
        : `WAKE UP YA BISH - ${nextAlarmHours}:${nextAlarmMinutes} ${nextAlarmAmPm}`
    };
  }, [alarmAmPm, alarmHours, alarmMinutes, countdownTarget, isAlarmActive]);

  const scheduleLocalNotificationAlarm = useCallback(async (target) => {
    await LocalNotifications.schedule({
      notifications: [{
        title: "⚠️ WAKE UP, YA BISH",
        body: target.mode === 'countdown'
          ? 'Your timer is up. Get back on mission.'
          : 'It is time. Your wake-up alarm is sounding.',
        id: NATIVE_ALARM_NOTIFICATION_ID,
        schedule: target.mode === 'countdown'
          ? { allowWhileIdle: true, at: target.targetTime }
          : { allowWhileIdle: true, on: { hour: target.hour24, minute: target.minute, second: 0 } },
        ...(!isMuted ? { sound: getNativeNotificationSound(selectedVoice) } : {}),
        actionTypeId: "",
        extra: {
          voiceId: selectedVoice,
          targetIso: target.targetTime.toISOString(),
          alarmMode: target.mode,
          deliveryEngine: 'local-notification'
        }
      }]
    });
  }, [isMuted, selectedVoice]);

  const scheduleNativeAlarmDelivery = useCallback(async (overrides = {}) => {
    if (!Capacitor.isNativePlatform()) return true;

    const target = getNativeAlarmDeliveryTarget(overrides);

    try {
      await cancelWakeUpNativeAlarm(NATIVE_ALARMKIT_ALARM_ID);
    } catch (err) {
      console.warn('Failed to clear AlarmKit alarm before reschedule', err);
    }
    await LocalNotifications.cancel({ notifications: [{ id: NATIVE_ALARM_NOTIFICATION_ID }] });

    if (!target) return true;

    const alarmKitResult = await scheduleWakeUpNativeAlarm({
      id: NATIVE_ALARMKIT_ALARM_ID,
      title: target.label,
      mode: target.mode,
      hour: target.hour24,
      minute: target.minute,
      targetIso: target.mode === 'countdown' ? target.targetTime.toISOString() : null,
      repeatsDaily: target.mode === 'clock',
      requestAuthorization: Boolean(overrides.requestAuthorization)
    });

    if (alarmKitResult?.available) {
      setNativeAlarmKitState(alarmKitResult.authorization || 'unknown');
    }

    if (alarmKitResult?.scheduled) {
      setNotificationSetupMessage('System alarm scheduled with iOS AlarmKit. It can alert from the Lock Screen at the set time.');
      return true;
    }

    if (alarmKitResult?.available && alarmKitResult?.authorization === 'denied') {
      setNotificationSetupMessage('Alarm access is denied in iOS Settings, so the app is using notification fallback.');
    } else if (alarmKitResult?.available && alarmKitResult?.errorMessage) {
      setNotificationSetupMessage(`AlarmKit fallback active: ${alarmKitResult.errorMessage}`);
    }

    const granted = hasNativeNotificationAccess
      || await syncNotificationPermissionState({ requestAccess: Boolean(overrides.requestAuthorization) });
    if (!granted) {
      setNotificationSetupMessage('No alarm delivery permission is enabled. Turn on Alarm or Notification access in iOS Settings.');
      return false;
    }

    await scheduleLocalNotificationAlarm(target);
    setNotificationSetupMessage('Notification fallback scheduled. For the strongest Lock Screen alarm, enable Alarm access in iOS Settings.');
    return true;
  }, [
    getNativeAlarmDeliveryTarget,
    hasNativeNotificationAccess,
    scheduleLocalNotificationAlarm,
    syncNotificationPermissionState
  ]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const syncNativeAlarm = async () => {
      await scheduleNativeAlarmDelivery();
    };

    syncNativeAlarm().catch(err => {
      console.error('Native alarm scheduling failed', err);
    });
  }, [scheduleNativeAlarmDelivery]);

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
  const [activeScreen, setActiveScreen] = useState('home');
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date());

  useEffect(() => {
    document.documentElement.classList.add('wake-native-shell');
    document.body.classList.add('wake-native-shell');

    return () => {
      document.documentElement.classList.remove('wake-native-shell');
      document.body.classList.remove('wake-native-shell');
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeScreen]);

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
    if (!(await scheduleNativeAlarmDelivery({
      requestAuthorization: true,
      isAlarmActive: true,
      countdownTarget: null,
      alarmHours: finalHStr,
      alarmMinutes: mStr,
      alarmAmPm: ampm
    }))) return;
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
    const targetTime = time.getTime() + minutesAdded * 60000;
    if (!(await scheduleNativeAlarmDelivery({
      requestAuthorization: true,
      isAlarmActive: true,
      countdownTarget: targetTime
    }))) return;
    await warmAudioEngine();
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
  const bottomNavHeightPx = isCompactViewport ? 68 : 74;
  const sponsorMessage = SPONSORED_MESSAGES[phraseIndex % SPONSORED_MESSAGES.length];
  const removeAdsPriceLabel = formatRemoveAdsPrice(removeAdsState);
  const renewalLabel = removeAdsState.expirationDate
    ? new Date(removeAdsState.expirationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
    : null;
  const alarmVoiceLabel = ALARM_VOICES.find(v => v.id === selectedVoice)?.name || 'Alarm';
  const alarmStatusLabel = countdownTarget
    ? 'Countdown armed'
    : isAlarmActive
      ? `Alarm: ${alarmVoiceLabel} - ${alarmHours}:${alarmMinutes} ${alarmAmPm}`
      : `Alarm ready - ${alarmHours}:${alarmMinutes} ${alarmAmPm}`;
  const habitProgress = Math.min(100, Math.max(8, Math.round((habitState.currentDay / 67) * 100)));
  const missionFocusHours = Math.max(1, Math.round(habitState.currentDay * 2.5 * 10) / 10);
  const completedMissionCount = Math.max(0, habitState.currentDay - 1 + (isHabitCompletedToday ? 1 : 0));
  const monthLabel = calendarViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
  const monthStart = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1);
  const daysInMonth = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 0).getDate();
  const calendarCells = [
    ...Array.from({ length: monthStart.getDay() }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1)
  ];
  const todayDateNumber = time.getMonth() === calendarViewDate.getMonth()
    && time.getFullYear() === calendarViewDate.getFullYear()
    ? time.getDate()
    : null;
  const nextEventDateNumber = upcomingEvent?.start?.getMonth() === calendarViewDate.getMonth()
    && upcomingEvent?.start?.getFullYear() === calendarViewDate.getFullYear()
    ? upcomingEvent.start.getDate()
    : null;
  const upcomingIntel = upcomingEvent
    ? [
        {
          label: nextEventStatusLabel,
          title: nextEventSummary || 'Wake-Up Routine',
          icon: CalendarDays,
          color: 'cyan'
        }
      ]
    : [];
  const recentMissions = [
    {
      title: `Day ${habitState.currentDay}: ${currentHabit.title || 'Daily Mission'}`,
      subtitle: isHabitCompletedToday ? 'Completed today' : 'Pending today',
      duration: isHabitCompletedToday ? 'Done' : 'Now',
      color: isHabitCompletedToday ? '#00ffff' : '#ff00ff'
    },
    ...(habitState.currentDay > 1 ? [{
      title: `Day ${habitState.currentDay - 1}: Previous Mission`,
      subtitle: 'Completed',
      duration: 'Done',
      color: '#ffff00'
    }] : []),
    {
      title: 'Alarm Routine',
      subtitle: isAlarmActive || countdownTarget ? 'Armed' : 'Ready',
      duration: countdownTarget ? 'Timer' : `${alarmHours}:${alarmMinutes}`,
      color: isAlarmActive || countdownTarget ? '#00ffcc' : '#7c52aa'
    }
  ];
  const quoteOfDay = QUOTES_OF_THE_DAY[
    Math.abs(Math.floor(time.getTime() / 86400000)) % QUOTES_OF_THE_DAY.length
  ];

  const toggleAlarmState = async () => {
    if (countdownTarget) {
      await cancelScheduledAlarm();
      return;
    }

    if (isAlarmActive) {
      setIsAlarmActive(false);
      await disarmBackgroundEngine();
      return;
    }

    if (!(await scheduleNativeAlarmDelivery({
      requestAuthorization: true,
      isAlarmActive: true,
      countdownTarget: null
    }))) return;
    await warmAudioEngine();
    setCountdownTarget(null);
    setIsAlarmActive(true);
    armBackgroundEngine(`Set for ${alarmHours}:${alarmMinutes} ${alarmAmPm}`);
  };

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
  const openCalendarConnection = () => {
    if (Capacitor.isNativePlatform()) {
      openSettingsPanel();
      return;
    }

    openProfilePanel();
  };
  const shiftCalendarMonth = (offset) => {
    setCalendarViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
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
        upcomingEventStart: upcomingEvent?.start ? upcomingEvent.start.toISOString() : null,
        habitDay: Math.min(67, Math.max(1, Number(habitState.currentDay) || 1)),
        habitProgress,
        habitCompletedToday: Boolean(isHabitCompletedToday),
        habitTitle: normalizeWidgetText(currentHabit.title || currentHabit.actionTip || 'Daily Mission', 32),
        quoteText: normalizeWidgetText(quoteOfDay.text, 180),
        quoteAuthor: normalizeWidgetText(quoteOfDay.author, 36)
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
    currentHabit.actionTip,
    currentHabit.title,
    habitProgress,
    habitState.currentDay,
    isAlarmActive,
    isCalendarLinked,
    isHabitCompletedToday,
    isMuted,
    nextEventSummary,
    quoteOfDay.author,
    quoteOfDay.text,
    selectedVoice,
    upcomingEvent
  ]);

  useEffect(() => {
    void syncHomeWidgetState();
  }, [syncHomeWidgetState]);

  const renderRemoveAdsPanel = () => (
    <div className="rounded-[1.25rem] border-2 border-[#00ffff]/45 bg-[#120916]/92 p-4 text-left shadow-[0_0_20px_rgba(0,255,255,0.14)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-[#00ffff] drop-shadow-[0_0_5px_#00ffff]">
            Ad-Free Pass
          </span>
          <span className="mt-2 block text-[11px] uppercase leading-relaxed text-white/70">
            {isAdFree
              ? 'Sponsor panels are hidden on this device.'
              : 'Free tier keeps sponsor panels visible. Subscribe to clean up the dashboard.'}
          </span>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${
          isAdFree
            ? 'bg-[#14301a] border-[#39ff14]/50 text-[#39ff14]'
            : 'bg-[#2a0c1f] border-[#ff00aa]/50 text-[#ff8fd6]'
        }`}>
          {isAdFree ? 'Active' : removeAdsPriceLabel}
        </span>
      </div>

      <div className="mt-3 text-[10px] uppercase leading-relaxed text-white/48">
        {isAdFree && renewalLabel
          ? `Entitlement good through ${renewalLabel}.`
          : 'Auto-renewable monthly subscription. Cancel anytime in Apple ID subscriptions.'}
      </div>

      <div className="mt-3 rounded-xl border border-[#00ffff]/25 bg-[#081017]/90 px-3 py-3 text-[10px] leading-relaxed text-white/68">
        <span className="block font-black uppercase tracking-[0.16em] text-[#00ffff]">
          Subscription Details
        </span>
        <span className="mt-2 block">
          Remove Ads renews monthly at {removeAdsPriceLabel}. Payment is charged to your Apple ID at confirmation and renews automatically unless cancelled at least 24 hours before the current period ends.
        </span>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openExternalResource(SUBSCRIPTION_PRIVACY_URL)}
            className="rounded-full border border-[#ffff00]/45 px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-[#ffff00]"
          >
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={() => openExternalResource(SUBSCRIPTION_TERMS_URL)}
            className="rounded-full border border-[#00ffff]/45 px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-[#00ffff]"
          >
            Terms of Use
          </button>
        </div>
      </div>

      {subscriptionMessage ? (
        <div className="mt-3 rounded-xl border border-[#ff00ff]/35 bg-[#250818] px-3 py-2 text-[10px] uppercase leading-relaxed text-[#ffd4ef]">
          {subscriptionMessage}
        </div>
      ) : null}

      {removeAdsState.errorMessage ? (
        <div className="mt-3 rounded-xl border border-[#ff6b6b]/35 bg-[#2a0c0c] px-3 py-2 text-[10px] uppercase leading-relaxed text-[#ffd2d2]">
          {removeAdsState.errorMessage}
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            void handlePurchaseRemoveAds();
          }}
          disabled={isPurchaseBusy || removeAdsState.loading || !Capacitor.isNativePlatform() || !removeAdsState.canMakePayments || isAdFree}
          className={`min-h-12 rounded-xl px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] transition-all ${
            isPurchaseBusy || removeAdsState.loading || !Capacitor.isNativePlatform() || !removeAdsState.canMakePayments || isAdFree
              ? 'bg-white/10 text-white/35 cursor-not-allowed'
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
          className={`min-h-12 rounded-xl px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] transition-all ${
            isPurchaseBusy || !Capacitor.isNativePlatform()
              ? 'bg-white/10 text-white/35 cursor-not-allowed'
              : 'bg-[#00f0ff] border-b-[4px] border-[#0099aa] text-black hover:brightness-110 active:translate-y-1 active:border-b-0'
          }`}
        >
          {isPurchaseBusy ? 'Working...' : 'Restore'}
        </button>
      </div>

      {!Capacitor.isNativePlatform() ? (
        <span className="mt-3 block text-[10px] uppercase leading-relaxed text-white/45">
          Purchases are available in the native iOS app build.
        </span>
      ) : null}
    </div>
  );

  const renderDeviceAccessPanel = () => (
    <div className="space-y-3">
      {Capacitor.isNativePlatform() ? (
        <>
          <div className="rounded-[1.25rem] border border-[#00ffff]/40 bg-[#0b1118]/92 p-4 text-left shadow-[0_0_18px_rgba(0,255,255,0.12)]">
            <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-[#00ffff] drop-shadow-[0_0_5px_#00ffff]">
              Notifications
            </span>
            <span className="mt-2 block text-[11px] uppercase leading-relaxed text-white/70">
              {hasNativeNotificationAccess
                ? 'Alarms can fire after the app closes.'
                : 'Grant alert permission so alarms and countdowns can ring on device.'}
            </span>
            {notificationSetupMessage ? (
              <span className="mt-2 block text-[10px] uppercase leading-relaxed text-[#00ffcc]">
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
                className={`min-h-12 flex-1 rounded-xl px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] transition-all ${
                  isNotificationSetupBusy
                    ? 'bg-white/10 text-white/35 cursor-wait'
                    : 'bg-[#00ffff] border-b-[4px] border-[#0099aa] text-black hover:brightness-110 active:translate-y-1 active:border-b-0'
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

          <div className="rounded-[1.25rem] border border-[#ffff00]/40 bg-[#17140a]/90 p-4 text-left shadow-[0_0_18px_rgba(255,255,0,0.11)]">
            <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-[#ffff00] drop-shadow-[0_0_5px_#ffff00]">
              Calendar Access
            </span>
            <span className="mt-2 block text-[11px] uppercase leading-relaxed text-white/70">
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
                className="min-h-12 flex-1 rounded-xl bg-[#ffff00] border-b-[4px] border-[#9e9e00] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-black hover:brightness-110 active:translate-y-1 active:border-b-0"
              >
                {calendarPermissionState === 'granted' ? 'Refresh Next Event' : 'Connect Calendar'}
              </button>
            </div>
          </div>

          {hasNativeAdMobBanner ? (
            <div className="rounded-[1.25rem] border border-[#ff00ff]/40 bg-[#160b1f]/92 p-4 text-left shadow-[0_0_18px_rgba(255,0,255,0.12)]">
              <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-[#ff00ff] drop-shadow-[0_0_5px_#ff00ff]">
                Ad Privacy
              </span>
              <span className="mt-2 block text-[11px] uppercase leading-relaxed text-white/70">
                {adPrivacyOptionsRequired
                  ? 'Google requires a privacy options button for this device. Open it here anytime.'
                  : isAdFree
                    ? 'Ads are removed on this device, but you can still review the ad privacy policy.'
                    : 'Review the ad privacy policy or reopen Google ad choices for this device.'}
              </span>
              {adPrivacyMessage ? (
                <span className="mt-2 block text-[10px] uppercase leading-relaxed text-[#ffd4ef]">
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
                  className={`min-h-12 rounded-xl px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] transition-all ${
                    isAdPrivacyBusy
                      ? 'bg-white/10 text-white/35 cursor-wait'
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
                  className="min-h-12 rounded-xl border border-[#00ffff]/45 bg-[#0b1118] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#00ffff] hover:brightness-110"
                >
                  Policy
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="rounded-[1.25rem] border border-[#ffff00]/40 bg-[#17140a]/90 p-4 text-left shadow-[0_0_18px_rgba(255,255,0,0.11)]">
          <span className="block text-[11px] font-black uppercase tracking-[0.18em] text-[#ffff00] drop-shadow-[0_0_5px_#ffff00]">
            Calendar Feed
          </span>
          <span className="mt-2 block text-[11px] uppercase leading-relaxed text-white/70">
            Paste a private .ics feed if you want the dashboard to show your next event on the web version.
          </span>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="Paste .ics URL"
              value={tempCalUrl}
              onChange={e => setTempCalUrl(e.target.value)}
              className="min-h-12 flex-1 rounded-xl border border-[#00ffff]/35 bg-black text-[10px] text-[#00ffff] outline-none p-3"
            />
            <button
              type="button"
              onClick={() => {
                if (tempCalUrl.trim()) {
                  localStorage.setItem('eb28_calendar_url', tempCalUrl.trim());
                  setCalendarUrl(tempCalUrl.trim());
                }
              }}
              className="min-h-12 rounded-xl bg-[#ffff00] border-b-[4px] border-[#9e9e00] px-4 text-[10px] font-black uppercase tracking-[0.14em] text-black hover:brightness-110 active:translate-y-1 active:border-b-0"
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

  const closeSettingsPanel = () => {
    setShowSettings(false);
    cancelSpeechSynthesis();
    safeStopAudio();
  };

  const MenuSheet = ({ tone = 'cyan', eyebrow, title, onClose, children }) => {
    const toneClass = tone === 'pink'
      ? 'border-[#ff00ff]/70 shadow-[0_0_42px_rgba(255,0,255,0.24)]'
      : 'border-[#00ffff]/70 shadow-[0_0_42px_rgba(0,255,255,0.22)]';
    const titleClass = tone === 'pink' ? 'text-[#ff00ff]' : 'text-[#00ffff]';
    const closeClass = tone === 'pink'
      ? 'border-[#00ffff]/55 bg-[#00ffff]/10 text-[#00ffff]'
      : 'border-[#ffff00]/55 bg-[#ffff00]/10 text-[#ffff00]';

    return (
      <div className="fixed inset-0 z-[140] flex items-center justify-center bg-[#05030a]/86 px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm animate-fade-in pointer-events-auto">
        <div className={`wake-menu-sheet tech-border-notch bg-[#0d141e]/95 w-full max-w-[460px] overflow-hidden border-[3px] ${toneClass}`}>
          <div className="flex items-center justify-between gap-4 border-b border-[#00ffff]/20 px-4 pb-3 pt-3">
            <div className="min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-white/48">{eyebrow}</span>
              <h2 className={`wake-neon-title mt-1 truncate text-base font-black uppercase italic tracking-[0.12em] ${titleClass}`}>{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`wake-action-press grid h-11 w-11 shrink-0 place-items-center rounded-full border ${closeClass}`}
              aria-label={`Close ${title}`}
            >
              <X className="h-5 w-5" strokeWidth={3} />
            </button>
          </div>
          <div className="wake-menu-content max-h-[min(78dvh,720px)] overflow-y-auto px-4 pb-5 pt-4">
            {children}
          </div>
        </div>
      </div>
    );
  };

  const MenuSection = ({ label, children }) => (
    <section className="wake-menu-section">
      <h3 className="px-1 pb-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/44">{label}</h3>
      <div className="overflow-hidden rounded-[1.2rem] border border-white/10 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        {children}
      </div>
    </section>
  );

  const MenuRow = ({ icon: Icon, label, detail, value, accent = '#00ffff', children, onClick, disabled = false }) => {
    const content = (
      <>
        <div className="flex min-w-0 items-center gap-3">
          {Icon ? (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border bg-black/24" style={{ borderColor: `${accent}66`, color: accent }}>
              <Icon className="h-5 w-5" strokeWidth={3} />
            </span>
          ) : null}
          <div className="min-w-0 text-left">
            <span className="block truncate text-[12px] font-black uppercase tracking-[0.08em] text-white">{label}</span>
            {detail ? <span className="mt-1 block text-[11px] leading-snug text-white/52">{detail}</span> : null}
          </div>
        </div>
        <div className="ml-3 flex shrink-0 items-center gap-2">
          {value ? (
            <span className="max-w-[7rem] truncate rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em]" style={{ borderColor: `${accent}5f`, color: accent, backgroundColor: `${accent}18` }}>
              {value}
            </span>
          ) : null}
          {children}
          {onClick ? <ChevronRight className="h-4 w-4 text-white/32" strokeWidth={3} /> : null}
        </div>
      </>
    );

    if (onClick) {
      return (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="wake-menu-row wake-action-press flex min-h-[64px] w-full items-center justify-between border-b border-white/8 px-3 py-3 text-left last:border-b-0 disabled:opacity-45"
        >
          {content}
        </button>
      );
    }

    return (
      <div className="wake-menu-row flex min-h-[64px] w-full items-center justify-between border-b border-white/8 px-3 py-3 last:border-b-0">
        {content}
      </div>
    );
  };

  return (
    <div
      className={`fixed inset-0 h-[100dvh] w-full overflow-hidden bg-[#110b1a] text-white touch-manipulation overscroll-none ${isCompactViewport ? 'wake-compact' : ''}`}
      style={{
        fontFamily: '"DM Sans", "Inter", system-ui, sans-serif',
        '--wake-native-banner-reserve': `${nativeBannerReservedBottom}px`,
        '--wake-bottom-nav-height': `${bottomNavHeightPx}px`,
        '--wake-header-height': 'calc(env(safe-area-inset-top) + 3.5rem)'
      }}
    >
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..1000;1,9..40,700..1000&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        .wake-redesign {
          --neon-pink: #ff00ff;
          --neon-cyan: #00ffff;
          --neon-yellow: #ffff00;
          --neon-teal: #00ffcc;
          --panel: rgba(28, 14, 30, 0.86);
          --panel-deep: rgba(10, 6, 16, 0.94);
          background-image:
            radial-gradient(circle at 18% 8%, rgba(255, 0, 255, 0.16), transparent 34%),
            radial-gradient(circle at 86% 24%, rgba(0, 255, 255, 0.1), transparent 32%),
            linear-gradient(rgba(255, 0, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.08) 1px, transparent 1px);
          background-size: 32px 32px;
        }
        html.wake-native-shell,
        body.wake-native-shell {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          margin: 0;
          overflow: hidden;
          overscroll-behavior: none;
          background: #110b1a;
        }
        body.wake-native-shell #root {
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        .wake-screen-stack {
          min-height: 0;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .wake-screen-stack::-webkit-scrollbar {
          display: none;
        }
        .wake-home-screen {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          overflow-y: hidden;
          overflow-x: hidden;
          scrollbar-width: none;
        }
        .wake-home-screen::-webkit-scrollbar {
          display: none;
        }
        .wake-home-screen > section {
          flex: 0 0 auto;
        }
        .wake-home-clock {
          min-height: 152px;
        }
        .wake-home-quote {
          flex: 1 1 auto !important;
          min-height: 76px;
        }
        .wake-card-surface {
          background:
            linear-gradient(150deg, rgba(255,255,255,0.095), transparent 32%),
            rgba(16, 9, 22, 0.88);
          backdrop-filter: blur(18px) saturate(1.25);
          -webkit-backdrop-filter: blur(18px) saturate(1.25);
        }
        .wake-bottom-tab {
          min-width: 0;
        }
        .wake-neon-title {
          text-shadow: 0 0 12px currentColor;
        }
        .wake-card-glow-cyan {
          box-shadow: 0 0 22px rgba(0, 255, 255, 0.38), inset 0 0 24px rgba(0, 255, 255, 0.08);
        }
        .wake-card-glow-pink {
          box-shadow: 0 0 24px rgba(255, 0, 255, 0.42), inset 0 0 24px rgba(255, 0, 255, 0.1);
        }
        .wake-card-glow-yellow {
          box-shadow: 0 0 24px rgba(255, 255, 0, 0.32), inset 0 0 20px rgba(255, 255, 0, 0.08);
        }
        .wake-action-press {
          transition: transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1), filter 160ms ease;
        }
        .wake-action-press:active {
          transform: scale(0.96);
        }
        .wake-bottom-nav {
          min-height: var(--wake-bottom-nav-height);
        }
        .wake-bottom-rail {
          min-height: calc(var(--wake-bottom-nav-height) - 10px);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.025)),
            rgba(13, 6, 17, 0.86);
          backdrop-filter: blur(22px) saturate(1.35);
          -webkit-backdrop-filter: blur(22px) saturate(1.35);
        }
        .wake-menu-sheet {
          background-image:
            linear-gradient(rgba(255, 0, 255, 0.075) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.055) 1px, transparent 1px),
            linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015));
          background-size: 32px 32px, 32px 32px, 100% 100%;
          background-color: rgba(10, 6, 16, 0.98);
          backdrop-filter: blur(22px) saturate(1.25);
          -webkit-backdrop-filter: blur(22px) saturate(1.25);
        }
        .wake-menu-content {
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .wake-menu-content::-webkit-scrollbar {
          display: none;
        }
        .wake-menu-section + .wake-menu-section {
          margin-top: 1rem;
        }
        .wake-menu-row {
          background: transparent;
        }
        .wake-menu-row:active {
          background: rgba(255,255,255,0.045);
        }
        .wake-ios-button {
          min-height: 48px;
          border-radius: 999px;
        }
        @keyframes wakePulse {
          0%, 100% { opacity: 0.62; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.03); }
        }
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
        .wake-compact .wake-home-screen {
          gap: 0.5rem;
        }
        .wake-compact .wake-home-clock {
          min-height: 132px;
          padding: 0.7rem;
        }
        .wake-compact .wake-home-clock-time {
          font-size: clamp(2.65rem, 14vw, 4.35rem) !important;
        }
        .wake-compact .wake-home-date {
          margin-top: 0.35rem;
          font-size: 0.82rem;
        }
        .wake-compact .wake-home-actions {
          margin-top: 0.55rem;
        }
        .wake-compact .wake-home-actions button {
          min-height: 34px;
          padding-top: 0.4rem;
          padding-bottom: 0.4rem;
          font-size: 9px;
        }
        .wake-compact .wake-home-timers {
          gap: 0.48rem;
        }
        .wake-compact .wake-home-timers button {
          min-height: 48px;
          padding-top: 0.55rem;
          padding-bottom: 0.55rem;
        }
        .wake-compact .wake-home-timers span:first-child {
          font-size: 0.9rem;
        }
        .wake-compact .wake-home-timers span:last-child {
          margin-top: 0.35rem;
          font-size: 0.5rem;
        }
        .wake-compact .wake-home-event {
          padding: 0.7rem;
        }
        .wake-compact .wake-home-event-title {
          font-size: 0.95rem;
        }
        .wake-compact .wake-bottom-tab {
          height: 52px;
          border-radius: 1rem;
        }
        .wake-compact .wake-bottom-tab span {
          font-size: 8px;
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

      <div className="fixed inset-0 wake-redesign pointer-events-none bg-radio-grid" />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* Floating Geo Elements */}
        <div className="absolute left-4 top-40 w-6 h-6 border-2 border-cyan-400 rotate-45 opacity-40"></div>
        <div className="absolute right-8 top-32 w-4 h-4 rounded-full border-2 border-magenta-500 opacity-60"></div>
        <div className="absolute left-10 bottom-48 w-8 h-8 border-t-2 border-r-2 border-yellow-400 opacity-40"></div>
      </div>

      <div className="relative z-10 mx-auto flex h-[calc(100dvh-var(--wake-native-banner-reserve))] min-h-0 w-full max-w-[460px] flex-col px-3 pb-[var(--wake-bottom-nav-height)] pt-[var(--wake-header-height)]">
        <header className="fixed inset-x-0 top-0 z-50 border-b border-[#ff00ff]/50 bg-[#160a18]/88 pt-[env(safe-area-inset-top)] shadow-[0_4px_22px_rgba(255,0,255,0.22)] backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[460px] items-center justify-between px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <Activity className="h-6 w-6 shrink-0 text-[#00ffff] drop-shadow-[0_0_8px_#00ffff]" strokeWidth={3} />
              <h1 className="wake-neon-title truncate text-base font-black uppercase italic tracking-[0.1em] text-[#ff00ff] sm:text-lg sm:tracking-[0.14em]">
                WAKE UP YA BISH
              </h1>
            </div>
            <button
              type="button"
              onClick={openSettingsPanel}
              className="wake-action-press grid h-11 w-11 place-items-center rounded-full border border-[#ffff00]/70 bg-[#ffff00]/10 text-[#ffff00] shadow-[0_0_14px_rgba(255,255,0,0.38)]"
              aria-label="Open alarm settings"
            >
              <Settings className="h-6 w-6" strokeWidth={3} />
            </button>
          </div>
        </header>

        <main className="relative z-10 min-h-0 flex-1 pb-2">
          {activeScreen === 'calendar' ? (
            <div className="wake-screen-stack flex h-full flex-col gap-3 overflow-y-auto overflow-x-hidden pr-0.5">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setActiveScreen('home')}
                  className="wake-action-press inline-flex min-h-10 items-center gap-2 rounded-full border border-[#ff00ff]/65 bg-[#ff00ff]/10 px-4 text-[11px] font-black uppercase tracking-[0.12em] text-[#ff00ff] shadow-[0_0_12px_rgba(255,0,255,0.22)]"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={3} />
                  Console
                </button>
                <span className="rounded-full border border-[#00ffff]/35 bg-[#00ffff]/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#00ffff]">
                  Calendar
                </span>
              </div>

              <section className="wake-card-surface relative overflow-hidden tech-border-notch bg-[#0d141e]/80 border-2 border-[#3b4b61] p-4 shadow-[0_0_15px_rgba(0,255,255,0.1)]">
                <div className="flex justify-between text-[8px] font-black text-[#00ffff] tracking-[0.1em] mb-2 px-1">
                  <span>SYS V.10.2</span>
                  <span>CALENDAR LINK</span>
                </div>
                <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[#ff00ff]/15 blur-2xl" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-[#ff00ff] wake-neon-title">
                      Next Event
                    </span>
                    <h2 className="mt-2 line-clamp-2 text-xl font-black uppercase italic leading-tight text-white">
                      {nextEventSummary || (isCalendarLinked ? 'No Event Loaded' : 'Connect Calendar')}
                    </h2>
                  </div>
                  <span className="shrink-0 rounded-full border border-[#00ffff]/42 bg-[#00ffff]/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.08em] text-[#00ffff]">
                    {nextEventStatusLabel}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 rounded-[1.1rem] border border-white/10 bg-black/24 px-3 py-2.5">
                  <span className="inline-flex min-w-0 items-center gap-2 text-[11px] font-black uppercase tracking-[0.1em] text-white/70">
                    <Clock3 className="h-4 w-4 shrink-0 text-[#ffff00]" strokeWidth={3} />
                    <span className="truncate">{isCalendarLinked ? 'Device schedule synced' : 'No calendar source'}</span>
                  </span>
                  {!upcomingEvent ? (
                    <button
                      type="button"
                      onClick={openCalendarConnection}
                      className="wake-action-press shrink-0 rounded-full bg-[#00ffff] px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-black"
                    >
                      Connect
                    </button>
                  ) : null}
                </div>
              </section>

              <section className="wake-card-surface relative tech-border-notch bg-[#0d141e]/80 border-2 border-[#3b4b61] p-3.5 shadow-[0_0_15px_rgba(0,255,255,0.1)]">
                <div className="flex justify-between text-[8px] font-black text-[#00ffff] tracking-[0.1em] mb-2 px-1">
                  <span>DATA 0.50DAG</span>
                  <span>MONTHLY VIEW</span>
                </div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="flex min-w-0 items-center gap-2 text-lg font-black uppercase tracking-[0.02em]">
                    <CalendarDays className="h-5 w-5 shrink-0 text-[#00ffff] drop-shadow-[0_0_8px_#00ffff]" />
                    <span className="truncate">{monthLabel}</span>
                  </h3>
                  <div className="flex gap-1.5">
                    <button onClick={() => shiftCalendarMonth(-1)} className="wake-action-press grid h-10 w-10 place-items-center rounded-full border border-[#00ffff]/42 bg-[#00ffff]/8 text-[#00ffff]" type="button" aria-label="Previous month">
                      <ChevronLeft className="h-4 w-4" strokeWidth={3} />
                    </button>
                    <button onClick={() => shiftCalendarMonth(1)} className="wake-action-press grid h-10 w-10 place-items-center rounded-full border border-[#00ffff]/42 bg-[#00ffff]/8 text-[#00ffff]" type="button" aria-label="Next month">
                      <ChevronLeft className="h-4 w-4 rotate-180" strokeWidth={3} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="pb-1 text-center text-[9px] font-black uppercase tracking-[0.08em] text-white/42">
                      {day}
                    </div>
                  ))}
                  {calendarCells.map((day, index) => {
                    const isToday = day === todayDateNumber;
                    const isNext = day && day === nextEventDateNumber;
                    return (
                      <div
                        key={`${day || 'blank'}-${index}`}
                        className={`aspect-square rounded-[0.95rem] border text-[12px] font-black ${
                          !day
                            ? 'border-white/5 bg-white/[0.025] opacity-50'
                            : isNext
                              ? 'border-[#ff00ff]/90 bg-[#ff00ff]/82 text-white shadow-[0_0_16px_rgba(255,0,255,0.6)]'
                              : isToday
                                ? 'border-[#ffff00]/80 bg-[#ffff00]/12 text-[#ffff00] shadow-[0_0_14px_rgba(255,255,0,0.38)]'
                                : 'border-white/10 bg-black/18 text-white/84'
                        } flex flex-col items-center justify-center`}
                      >
                        {day}
                        {isNext ? <span className="mt-0.5 text-[7px] uppercase leading-none tracking-[0.06em]">Next</span> : null}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="grid gap-2 pb-2">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.22em] text-white/46">Upcoming Intel</h4>
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#ff00ff]">{upcomingIntel.length || 0} live</span>
                </div>
                {upcomingIntel.length > 0 ? upcomingIntel.map((item) => {
                  const IntelIcon = item.icon;
                  return (
                    <article key={`${item.label}-${item.title}`} className="wake-card-surface flex min-h-[76px] items-center gap-3 rounded-[1.25rem] border border-[#00ffff]/42 p-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#00ffff]/14 text-[#00ffff]">
                        <IntelIcon className="h-5 w-5" strokeWidth={3} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#00ffff]">{item.label}</p>
                        <h5 className="mt-1 truncate text-[15px] font-black uppercase italic text-white">{item.title}</h5>
                      </div>
                    </article>
                  );
                }) : (
                  <article className="wake-card-surface rounded-[1.25rem] border border-[#00ffff]/34 p-4 text-left">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#00ffff]">No Calendar Event Loaded</p>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-white/60">
                      {isCalendarLinked ? 'Refresh access from settings to pull the next event.' : 'Connect a calendar to make this screen useful.'}
                    </p>
                    <button
                      type="button"
                      onClick={openCalendarConnection}
                      className="wake-action-press mt-3 min-h-10 rounded-full bg-[#00ffff] px-4 text-[10px] font-black uppercase tracking-[0.14em] text-black"
                    >
                      {isCalendarLinked ? 'Refresh Access' : 'Connect Calendar'}
                    </button>
                  </article>
                )}
              </section>
            </div>
          ) : activeScreen === 'habit' ? (
            <div className="wake-screen-stack flex h-full flex-col gap-3 overflow-y-auto overflow-x-hidden pr-0.5">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setActiveScreen('home')}
                  className="wake-action-press inline-flex min-h-10 items-center gap-2 rounded-full border border-[#ff00ff]/65 bg-[#ff00ff]/10 px-4 text-[11px] font-black uppercase tracking-[0.12em] text-[#ff00ff] shadow-[0_0_12px_rgba(255,0,255,0.22)]"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={3} />
                  Console
                </button>
                <span className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] ${isHabitCompletedToday ? 'border-[#00ffcc]/45 bg-[#00ffcc]/12 text-[#00ffcc]' : 'border-[#ffff00]/45 bg-[#ffff00]/10 text-[#ffff00]'}`}>
                  {isHabitCompletedToday ? 'Done Today' : 'Mission Open'}
                </span>
              </div>

              <section className="wake-card-surface relative overflow-hidden tech-border-notch bg-[#0d141e]/80 border-2 border-[#3b4b61] p-4 shadow-[0_0_15px_rgba(0,255,255,0.1)]">
                <div className="flex justify-between text-[8px] font-black text-[#00ffff] tracking-[0.1em] mb-2 px-1">
                  <span>SYS V.10.2</span>
                  <span>HABIT DAY {habitState.currentDay}</span>
                </div>
                <div className="flex items-start justify-between gap-4 mt-2">
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-[#00ffff] wake-neon-title">Protocol Status</span>
                    <h2 className="mt-2 text-2xl font-black uppercase italic leading-none text-white drop-shadow-md">
                      {currentHabit.title || currentHabit.actionTip.substring(0, 20)}...
                    </h2>
                  </div>
                  <div className="relative grid h-24 w-24 shrink-0 place-items-center">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="49" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                      <circle
                        cx="60"
                        cy="60"
                        r="49"
                        fill="transparent"
                        stroke="#00ffff"
                        strokeDasharray="308"
                        strokeDashoffset={308 - (308 * habitProgress) / 100}
                        strokeLinecap="round"
                        strokeWidth="12"
                        className="drop-shadow-[0_0_10px_#00ffff]"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black italic drop-shadow-[0_0_8px_#00ffff] text-[#00ffff]">{habitProgress}%</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-md border border-[#00ffff]/20 bg-black/40 px-3 py-3 text-[11px] font-code font-bold uppercase leading-relaxed text-[#00ffff]/80 tracking-wide text-center">
                  "{currentHabit.actionTip}"
                </div>
              </section>

              <section className="grid grid-cols-3 gap-2">
                {[
                  ['Streak', habitState.currentDay, '#ff00ff', 'shape-slant-left'],
                  ['Complete', `${habitProgress}%`, '#00ffff', 'shape-pill'],
                  ['Missions', completedMissionCount, '#ffff00', 'shape-slant-right']
                ].map(([label, value, color, shapeClass]) => (
                  <div key={label} className={`wake-card-surface border-2 p-3 text-center flex flex-col items-center justify-center ${shapeClass}`} style={{ borderColor: color, backgroundColor: `${color}22`, boxShadow: `0 0 10px ${color}66` }}>
                    <span className="block text-[8px] font-black uppercase tracking-[0.12em] text-white/70">{label}</span>
                    <span className="mt-1 block truncate text-xl font-black italic leading-none" style={{ color, textShadow: `0 0 8px ${color}` }}>{value}</span>
                  </div>
                ))}
              </section>

              <section className="wake-card-surface rounded-[1.35rem] border border-[#ffff00]/42 p-4 shadow-[0_0_18px_rgba(255,255,0,0.14)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#ffff00] wake-neon-title">Mission Stats</span>
                    <h3 className="mt-1 text-lg font-black uppercase italic text-white">Focus Console</h3>
                  </div>
                  <span className="rounded-full border border-[#ffff00]/45 bg-[#ffff00]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#ffff00]">
                    {missionFocusHours} HRS
                  </span>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-[#ffff00] shadow-[0_0_10px_#ffff00]" style={{ width: `${habitProgress}%` }} />
                </div>
              </section>

              <section className="grid gap-2 pb-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.22em] text-white/46">Recent Missions</h3>
                  <button type="button" onClick={() => setShowHabitModal(true)} className="text-[10px] font-black uppercase tracking-[0.14em] text-[#00ffff] wake-neon-title">
                    Logs
                  </button>
                </div>
                {recentMissions.slice(0, 2).map(({ title, subtitle, duration, color }) => (
                  <article key={title} className="wake-card-surface flex min-h-[68px] items-center gap-3 rounded-[1.2rem] border p-3" style={{ borderColor: `${color}66`, boxShadow: `0 0 14px ${color}28` }}>
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ backgroundColor: `${color}26`, color }}>
                      <CheckCircle2 className="h-5 w-5" strokeWidth={3} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-[12px] font-black uppercase">{title}</h4>
                      <p className="mt-1 truncate text-[11px] text-white/54">{subtitle}</p>
                    </div>
                    <span className="shrink-0 text-[13px] font-black uppercase italic" style={{ color, textShadow: `0 0 10px ${color}` }}>{duration}</span>
                  </article>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    if (isHabitCompletedToday) {
                      setHabitState(prev => ({ ...prev, completedDate: null }));
                      return;
                    }
                    initAudioContext();
                    completeHabitForToday();
                  }}
                  className={`wake-action-press min-h-14 w-full rounded-[1.25rem] px-5 text-[13px] font-black uppercase tracking-[0.14em] ${
                    isHabitCompletedToday
                      ? 'border border-[#00ffff]/60 bg-[#00ffff]/14 text-[#00ffff]'
                      : 'bg-[#ff00ff] text-white shadow-[0_0_22px_rgba(255,0,255,0.52)]'
                  }`}
                >
                  {isHabitCompletedToday ? 'Undo Mission Complete' : 'Complete Today'}
                </button>
              </section>
            </div>
          ) : (
            <div className="wake-screen-stack wake-home-screen h-full">
              <section className="wake-home-clock wake-card-surface relative overflow-hidden tech-border-notch bg-[#0d141e]/80 border-2 border-[#3b4b61] p-3 shadow-[0_0_15px_rgba(0,255,255,0.1)]">
                <div className="flex justify-between text-[8px] font-black text-[#00ffff] tracking-[0.1em] mb-2 px-1">
                  <span>SYS V.10.2</span>
                  <span>BATTERY 76%</span>
                </div>
                
                <div className="text-center mb-1">
                  <span className="text-[#647c94] text-[10px] font-black tracking-[0.2em]">RADIO-TEK</span>
                </div>

                <div className="flex items-end justify-center gap-x-2 my-2">
                  <span className={`wake-home-clock-time font-code neon-text-yellow ${displayData.mode === 'COUNTDOWN' ? 'text-[clamp(3.5rem,15vw,5rem)]' : 'text-[clamp(4.2rem,18vw,6.5rem)]'}`}>
                    {displayData.mainString}
                  </span>
                  <span className={`mb-3 font-black text-[#ff00ff] wake-neon-title text-2xl`}>{displayData.mode}</span>
                </div>

                <div className="flex justify-between items-center px-1 text-[#00ffff] text-[11px] font-code font-black mb-3">
                  <div className="w-1/3 leading-tight opacity-50 text-[6px]">
                    DATA 0.50DAG NETH2L/25T<br/>DOTA AF155.0NTSSSO
                  </div>
                  <div className="w-1/3 text-center text-[14px] uppercase tracking-[0.1em]">
                    {displayDateStrFull.substring(0, 15)}
                  </div>
                  <div className="w-1/3 text-right leading-tight opacity-50 text-[6px]">
                    DATA S:CRONK.5-0TBB<br/>RAYS ST0R0K S2:7865S
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 border-t border-[#00ffff]/20 pt-2 pb-1">
                  <span className="text-[#00ffff] text-[12px] font-black tracking-widest">ALARM:</span>
                  <span className="text-[#ffff00] text-[12px] font-black uppercase tracking-wider">{alarmVoiceLabel} - {alarmHours}:{alarmMinutes} {alarmAmPm}</span>
                  <input
                    ref={alarmTimeInputRef}
                    type="time"
                    className="sr-only"
                    onChange={handleTimePickerChange}
                    value={get24HourString()}
                    aria-label="Pick alarm time"
                  />
                </div>
              </section>

              <section className="wake-home-timers grid grid-cols-2 gap-x-3 gap-y-4 mt-6 pb-4">
                {[
                  ['BLAST', '1 MIN', 1, '#ff00ff', 'rounded-[12px]', 'text-black'],
                  ['BREATHE', '3 MIN', 3, '#2266ff', 'shape-slant-right', 'text-black'],
                  ['PWR NAP', '5 MIN', 5, '#ffff00', 'shape-pill', 'text-black'],
                  ['HUSTLE', '15 MIN', 15, '#00ffff', 'shape-slant-right', 'text-black'],
                  ['POMODORO', '25 MIN', 25, '#aa00ff', 'shape-slant-left', 'text-black'],
                  ['GRIND', '60 MIN', 60, '#ff3388', 'shape-oval', 'text-black']
                ].map(([label, detail, minutes, color, shapeClass, textClass]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      void setTimerMinutes(minutes);
                    }}
                    className={`wake-action-press relative flex flex-col items-center justify-center min-h-[64px] border-4 p-2 ${shapeClass} ${textClass}`}
                    style={{
                      borderColor: color,
                      backgroundColor: `${color}`,
                      boxShadow: `0 0 15px ${color}, inset 0 0 10px rgba(255,255,255,0.5)`
                    }}
                  >
                    <span className="block truncate text-[20px] font-black uppercase leading-none text-black drop-shadow-sm">{label}</span>
                    <span className="mt-0.5 block text-[13px] font-black uppercase tracking-[0.05em] text-black/80">{detail}</span>
                  </button>
                ))}
              </section>

              <section className="grid gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!upcomingEvent && !isCalendarLinked) {
                      openCalendarConnection();
                      return;
                    }
                    setActiveScreen('calendar');
                  }}
                  className="wake-action-press wake-card-surface flex min-h-[70px] w-full min-w-0 items-center justify-between gap-3 overflow-hidden rounded-[1.35rem] border border-[#00ffff]/55 p-3 text-left wake-card-glow-cyan"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#00ffff]/14 text-[#00ffff]">
                      <CalendarDays className="h-5 w-5" strokeWidth={3} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#ff00ff] wake-neon-title">Next Event</span>
                      <span className="wake-home-event-title mt-1 block truncate text-[15px] font-black uppercase italic">{nextEventDetailLabel}</span>
                    </div>
                  </div>
                  <span className="max-w-[36%] shrink-0 truncate rounded-full border border-[#00ffff]/45 bg-[#00ffff]/10 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.06em] text-[#00ffff]">
                    {upcomingEvent ? nextEventStatusLabel : isCalendarLinked ? 'No Event' : 'Connect'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveScreen('habit')}
                  className="wake-action-press wake-card-surface flex min-h-[72px] w-full min-w-0 items-center justify-between gap-3 overflow-hidden rounded-[1.35rem] border border-[#ff00ff]/60 p-3 text-left wake-card-glow-pink"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#ffff00] text-black shadow-[0_0_18px_rgba(255,255,0,0.55)]">
                      <Zap className="h-5 w-5" strokeWidth={3} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-black uppercase italic text-[#ff00ff] wake-neon-title">
                        Habit Day {habitState.currentDay}
                      </span>
                      <span className="mt-1 block truncate text-[10px] font-bold uppercase leading-tight text-white/62">
                        {isHabitCompletedToday ? 'Mission complete' : currentHabit.actionTip}
                      </span>
                    </div>
                  </div>
                  <div className="w-16 shrink-0">
                    <div className="mb-1 text-right text-[10px] font-black uppercase text-[#ffff00]">{habitProgress}%</div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/14">
                      <div className="h-full rounded-full bg-[#ffff00] shadow-[0_0_8px_rgba(255,255,0,0.72)]" style={{ width: `${habitProgress}%` }} />
                    </div>
                  </div>
                </button>
              </section>

              {!shouldShowNativeBanner ? (
                <section className="wake-home-quote wake-card-surface flex flex-col justify-between rounded-[1.35rem] border border-[#ffff00]/32 p-3.5 shadow-[0_0_18px_rgba(255,255,0,0.12)]">
                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-[#ffff00] wake-neon-title">Quote of the Day</span>
                    <p className="mt-2 line-clamp-3 text-sm font-black uppercase italic leading-snug text-white/78">
                      "{quoteOfDay.text}"
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      ['Sound', alarmVoiceLabel],
                      ['Habit', `Day ${habitState.currentDay}`],
                      ['Calendar', isCalendarLinked ? 'Linked' : 'Open']
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[0.9rem] border border-white/10 bg-black/20 px-2 py-2 text-center">
                        <span className="block text-[8px] font-black uppercase tracking-[0.12em] text-white/38">{label}</span>
                        <span className="mt-1 block truncate text-[10px] font-black uppercase tracking-[0.04em] text-white/76">{value}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {!isAdFree && (!Capacitor.isNativePlatform() || !hasNativeAdMobBanner) ? (
                <section className="hidden rounded-[1.5rem] border border-[#ff00ff]/45 bg-[#110b1a]/70 p-3 sm:block">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-[#00ffff]">Sponsored</span>
                      <h3 className="mt-1 truncate text-sm font-black uppercase">{sponsorMessage.headline}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={openSponsoredDestination}
                      className="wake-action-press shrink-0 rounded-full bg-[#00ffff] px-4 py-2.5 text-xs font-black uppercase text-black"
                    >
                      {sponsorMessage.cta}
                    </button>
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </main>

        <nav
          className="wake-bottom-nav fixed inset-x-0 bottom-0 z-50 bg-gradient-to-t from-[#0b0611] via-[#0b0611]/92 to-transparent px-3 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-2"
          style={{ bottom: shouldShowNativeBanner ? 'var(--wake-native-banner-reserve)' : undefined }}
        >
          <div className="wake-bottom-rail mx-auto grid max-w-[460px] grid-cols-3 items-center bg-[#0d141e]/90 border-t-2 border-b-2 border-[#ff00ff] p-2 shadow-[0_0_20px_rgba(255,0,255,0.3)]">
            <button type="button" onClick={() => setActiveScreen('home')} className={`wake-bottom-tab wake-action-press flex flex-col items-center justify-center gap-1 h-12 ${activeScreen === 'home' ? 'text-[#00ffff] drop-shadow-[0_0_8px_#00ffff]' : 'text-white/50'}`}>
              <Settings className="h-6 w-6" strokeWidth={2.5} />
              <span className="text-[10px] font-black uppercase tracking-wider">Settings</span>
            </button>
            <button type="button" onClick={() => setActiveScreen('habit')} className={`wake-bottom-tab wake-action-press flex flex-col items-center justify-center gap-1 h-12 ${activeScreen === 'habit' ? 'text-[#00ffff] drop-shadow-[0_0_8px_#00ffff]' : 'text-white/50'}`}>
              <CheckCircle2 className="h-6 w-6" strokeWidth={2.5} />
              <span className="text-[10px] font-black uppercase tracking-wider">Tasks</span>
            </button>
            <button type="button" onClick={openProfilePanel} className={`wake-bottom-tab wake-action-press flex flex-col items-center justify-center gap-1 h-12 text-white/50`}>
              <User className="h-6 w-6" strokeWidth={2.5} />
              <span className="text-[10px] font-black uppercase tracking-wider">Profile</span>
            </button>
          </div>
        </nav>
        
        {showSettings ? renderViewportOverlay(
          <MenuSheet tone="cyan" eyebrow="Console Menu" title="Settings" onClose={closeSettingsPanel}>
            <div className="space-y-4">
              <MenuSection label="Alarm Setup">
                <MenuRow
                  icon={BellRing}
                  label="Alarm Time"
                  detail="Tap to change the wake-up target."
                  value={`${alarmHours}:${alarmMinutes} ${alarmAmPm}`}
                  accent="#ffff00"
                  onClick={() => {
                    const timeInput = alarmTimeInputRef.current;
                    if (!timeInput) return;
                    if (typeof timeInput.showPicker === 'function') timeInput.showPicker();
                    else timeInput.click();
                  }}
                />
                <MenuRow
                  icon={Volume2}
                  label="Current Sound"
                  detail="Selected alarm voice and audio preset."
                  value={alarmVoiceLabel}
                  accent="#ff00ff"
                />
              </MenuSection>

              <MenuSection label="Sound Pack">
                {ALARM_VOICES.map((voice) => (
                  <button
                    key={voice.id}
                    type="button"
                    onPointerDown={() => {
                      void warmAudioEngine();
                    }}
                    onClick={(event) => {
                      setSelectedVoice(voice.id);
                      playSample(voice.id, event);
                    }}
                    className={`wake-menu-row wake-action-press flex min-h-[62px] w-full items-center justify-between border-b border-white/8 px-3 py-3 text-left last:border-b-0 ${selectedVoice === voice.id ? 'bg-[#ff00ff]/12 text-white' : 'text-white/76'}`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#ff00ff]/40 bg-[#ff00ff]/10 text-xl">{voice.icon}</span>
                      <span className="truncate text-[12px] font-black uppercase tracking-[0.1em]">{voice.name}</span>
                    </span>
                    {selectedVoice === voice.id ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-[#00ffff]" strokeWidth={3} />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-white/26" strokeWidth={3} />
                    )}
                  </button>
                ))}
              </MenuSection>

              <div>
                <h3 className="px-1 pb-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/44">Device Access</h3>
                {renderDeviceAccessPanel()}
              </div>
            </div>
          </MenuSheet>,
        ) : null}

        {/* PROFILE OVERLAY */}
        {showProfile ? renderViewportOverlay(
          <MenuSheet tone="pink" eyebrow="Account Menu" title="Profile" onClose={() => setShowProfile(false)}>
            {!userProfile ? (
              <div className="space-y-4">
                <div className="rounded-[1.25rem] border border-[#00ffff]/24 bg-[#00ffff]/8 p-4 text-center">
                  <span className="block text-[11px] uppercase leading-relaxed text-white/68">Create a local profile for device settings, calendar links, and purchase state.</span>
                </div>
                <MenuSection label="Local Profile">
                  <div className="space-y-2 p-3">
                    <input type="text" placeholder="CALLSIGN / NAME" value={tempName} onChange={e => setTempName(e.target.value)} className="w-full min-h-12 rounded-xl border border-[#00ffff]/36 bg-black/52 p-4 text-center text-sm font-black uppercase tracking-[0.12em] text-[#00ffff] outline-none focus:border-[#00ffff]" />
                    <input type="email" placeholder="EMAIL ADDRESS" value={tempEmail} onChange={e => setTempEmail(e.target.value)} className="w-full min-h-12 rounded-xl border border-[#00ffff]/36 bg-black/52 p-4 text-center text-sm font-black uppercase tracking-[0.12em] text-[#00ffff] outline-none focus:border-[#00ffff]" />
                    <button
                      type="button"
                      onClick={() => {
                        if(tempName.trim()) {
                          const profile = { name: tempName.trim(), email: tempEmail.trim() };
                          localStorage.setItem('eb28_user_profile', JSON.stringify(profile));
                          setUserProfile(profile);
                        }
                      }}
                      className="wake-action-press wake-ios-button w-full bg-[#ff00ff] px-4 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_0_18px_rgba(255,0,255,0.5)]"
                    >
                      Save Profile
                    </button>
                  </div>
                </MenuSection>
                {renderRemoveAdsPanel()}
                {renderDeviceAccessPanel()}
              </div>
            ) : (
              <div className="space-y-4">
                <MenuSection label="Operator">
                  <div className="flex items-center gap-4 p-4">
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-white/35 bg-[#ff00ff] text-3xl font-black text-white shadow-[0_0_24px_rgba(255,0,255,0.55)]">
                      {userProfile.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 text-left">
                      <h3 className="truncate text-xl font-black uppercase tracking-[0.1em] text-[#00ffff] wake-neon-title">{userProfile.name}</h3>
                      <p className="mt-1 truncate text-[10px] uppercase tracking-[0.16em] text-white/48">{userProfile.email || 'Guest Profile'}</p>
                    </div>
                  </div>
                  <MenuRow
                    icon={ShieldCheck}
                    label="Device State"
                    detail="Habit mastery and local settings are active on this iPhone."
                    value="Linked"
                    accent="#00ffcc"
                  />
                </MenuSection>

                {renderRemoveAdsPanel()}
                {renderDeviceAccessPanel()}

                <button
                  type="button"
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
                  className="wake-action-press wake-ios-button w-full border border-[#ff4fc8]/35 bg-[#ff00ff]/8 px-4 text-[11px] font-black uppercase tracking-[0.16em] text-[#ff8fed]"
                >
                  Unlink This Device
                </button>
              </div>
            )}
          </MenuSheet>,
        ) : null}

        {/* MORNING MINDSET INTERCEPTION MODAL */}
        {showHabitModal ? renderViewportOverlay(
          <div className="fixed inset-0 z-[160] flex flex-col justify-center items-center bg-[#05030a]/94 backdrop-blur-md p-4 animate-fade-in text-center pointer-events-auto">
             <div className="wake-redesign tech-border-notch w-full max-w-sm border-[3px] border-[#00ffff] shadow-[0_0_46px_rgba(0,255,255,0.25)] bg-[#0d141e]/96 p-5 pb-8 relative flex flex-col overflow-hidden">
                <div className="flex justify-between text-[8px] font-black text-[#00ffff] tracking-[0.1em] mb-4 px-1">
                  <span>SYS V.10.2</span>
                  <span>INTERCEPTION PROTOCOL</span>
                </div>
                <h1 className="text-[#ffff00] text-4xl uppercase font-black italic mb-1 mt-2 drop-shadow-[0_2px_10px_#ffff00]">
                  DAY {currentHabit.day}
                </h1>
                <h2 className="text-[#00ffff] text-[11px] tracking-[0.16em] uppercase leading-snug drop-shadow-[0_0_8px_#00ffff]">
                  {currentHabit.title}
                </h2>
                
                <div className="mt-5 max-h-[35vh] overflow-y-auto overflow-x-hidden rounded-xl border border-white/10 bg-black/24 p-4 pr-3 text-left text-sm leading-relaxed text-white/78 custom-scrollbar">
                   {currentHabit.morningMindset}
                </div>

                <div className="mt-6 border-t border-[#ff00ff]/30 pt-5">
                   <div className="w-full flex justify-center mb-4">
                      <span className="text-[#ff00ff] text-[9px] font-black tracking-[0.22em] uppercase bg-[#ff00ff]/12 px-4 py-1.5 rounded-full border border-[#ff00ff]/50 shadow-[0_0_10px_rgba(255,0,255,0.2)]">
                        MISSION BRIEFING
                      </span>
                   </div>
                   <p className="text-white text-[15px] font-bold leading-snug text-left">
                     {currentHabit.actionTip}
                   </p>
                </div>

                <button 
                  onClick={() => {
                     completeHabitForToday();
                     setShowHabitModal(false);
                  }}
                  className="wake-action-press mt-7 w-full bg-[#00ffff] text-black font-black uppercase text-sm tracking-[0.16em] py-4 rounded-xl border-b-[5px] border-[#009999] active:translate-y-1 active:border-b-0 transition-transform shadow-[0_5px_20px_rgba(0,255,255,0.3)] cursor-pointer touch-manipulation hover:brightness-110"
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
