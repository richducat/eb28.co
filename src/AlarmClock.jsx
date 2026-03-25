import React, { useState, useEffect, useCallback, useRef } from 'react';

// iOS Background Persistence & Native Lock Screen Widget Enablers
let wakeLock = null;
const silentAudioElement = new Audio('/silence.mp3');
silentAudioElement.loop = true;
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
  if ('mediaSession' in navigator) {
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

const ALARM_VOICES = [
  { id: 'standard', name: 'Classic Beep', type: 'free', icon: '🔔', sample: 'Standard digital clock piezo buzzer.', category: 'calm' },
  { id: 'zen', name: 'Zen Master', type: 'free', icon: '☯️', sample: 'Breathe in... Breathe out...', category: 'calm' },
  { id: 'retro', name: 'Retro Arcade', type: 'free', icon: '🕹️', sample: '8-bit square wave sequence.', category: 'funny' },
  { id: 'nuclear', name: 'Nuclear Siren', type: 'premium', icon: '☢️', sample: 'High-frequency klaxon sweep.', category: 'motivational' },
  { id: 'cyber', name: 'Cyber Laser', type: 'premium', icon: '🚀', sample: 'Sci-fi laser drop synth.', category: 'motivational' },
  { id: 'power', name: 'Power Chord', type: 'premium', icon: '⚡', sample: 'Electric guitar shredding!', category: 'motivational' },
  { id: 'blast', name: 'Blast Radius', type: 'premium', icon: '💣', sample: 'Explosions! Wake up now!', category: 'motivational' },
  { id: 'neon', name: 'Neon Pursuit', type: 'premium', icon: '🕶️', sample: 'Fast paced 80s synthwave.', category: 'motivational' },
];

let globalAudioCtx = null;

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
  } else if (type === 'nuclear') {
    osc.type = 'sawtooth';
    gain.gain.value = 0.5;
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 1.0);
    osc.frequency.exponentialRampToValueAtTime(300, now + 2.0);
    osc.start(now);
    osc.stop(now + 2.0);
  } else if (type === 'cyber') {
    osc.type = 'triangle';
    gain.gain.value = 0.6;
    for(let i=0; i<10; i++) {
       const t = now + (i*0.2);
       osc.frequency.setValueAtTime(400 + (i*150), t);
       gain.gain.setValueAtTime(1, t);
       gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    }
    osc.start(now);
    osc.stop(now + 2.0);
  } else if (type === 'retro') {
    osc.type = 'square';
    for(let i=0; i<4; i++) {
       const t = now + (i*0.5);
       osc.frequency.setValueAtTime(440, t);
       osc.frequency.setValueAtTime(880, t + 0.1);
       osc.frequency.setValueAtTime(440, t + 0.2);
       gain.gain.setValueAtTime(0.5, t);
       gain.gain.linearRampToValueAtTime(0, t + 0.4);
    }
    osc.start(now);
    osc.stop(now + 2.0);
  } else {
    return null; 
  }

  return {
    pause: () => {
      try { osc.stop(); } catch(e){}
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

export default function AlarmClock() {
  const [time, setTime] = useState(new Date());
  const [countdownTarget, setCountdownTarget] = useState(null);
  const [customAudioMap, setCustomAudioMap] = useState({});
  const [activeAudioObj, setActiveAudioObj] = useState(null);

  const [alarmHours, setAlarmHours] = useState('06');
  const [alarmMinutes, setAlarmMinutes] = useState('00');
  const [alarmAmPm, setAlarmAmPm] = useState('AM');
  const [isAlarmActive, setIsAlarmActive] = useState(true);
  const [isRinging, setIsRinging] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(ALARM_VOICES[0].id);
  const [isMuted, setIsMuted] = useState(false);

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
  const [tempCalUrl, setTempCalUrl] = useState('');
  const [motivationState, setMotivationState] = useState(true);
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
    
    // Globally register click listeners to unlock browser AudioContext policies
    const unlocker = () => initAudioContext();
    document.addEventListener('click', unlocker);
    document.addEventListener('touchstart', unlocker);
    
    // Register Service Worker for iOS Native Push Notifications API
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
    }

    return () => {
      document.removeEventListener('click', unlocker);
      document.removeEventListener('touchstart', unlocker);
    };
  }, []);

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

  const fetchNativeCalendar = async () => {
    try {
       const now = Date.now();
       const endOfDay = new Date();
       endOfDay.setHours(23, 59, 59, 999);
       
       const { result } = await CapacitorCalendar.listEventsInRange({
          startDate: now,
          endDate: endOfDay.getTime()
       });
       
       if (result && result.length > 0) {
          const events = result.map(e => ({
             summary: e.title,
             start: new Date(e.startDate)
          })).sort((a,b) => a.start - b.start);
          
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
    }
  };

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    
    if (isNative) {
       fetchNativeCalendar();
       const calInterval = setInterval(() => fetchNativeCalendar(), 15 * 60 * 1000);
       return () => clearInterval(calInterval);
    } else {
       if (calendarUrl) fetchCalendar(calendarUrl);
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
  }, [alarmHours, alarmMinutes, alarmAmPm, isAlarmActive, isRinging]);

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

  const triggerAlarm = () => {
    setIsRinging(true);
    if (!isMuted) playSample(selectedVoice);
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

  const stopAlarm = () => {
    setIsRinging(false);
    setIsAlarmActive(false);
    window.speechSynthesis.cancel();
    if (activeAudioObj) { activeAudioObj.pause(); activeAudioObj.currentTime = 0; setActiveAudioObj(null); }
    
    // Trigger Habit Mastery Morning Intercept if it hasn't been completed today!
    if (!isHabitCompletedToday) {
       setShowHabitModal(true);
    }
  };

  const handleSnoozeLight = () => {
    if (isRinging) {
      stopAlarm();
    } else {
      setIsLightOn(true);
      setTimeout(() => setIsLightOn(false), 2500);
    }
  };

  const handleTimePickerChange = (e) => {
    const val = e.target.value;
    if (!val) return;
    const [hStr, mStr] = val.split(':');
    let h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const finalHStr = h.toString().padStart(2, '0');
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

  const setTimerMinutes = (minutesAdded) => {
    const targetTime = time.getTime() + minutesAdded * 60000;
    setCountdownTarget(targetTime);
    setIsAlarmActive(true);
  };

  const playSample = (voiceId, e) => {
    if (e) e.stopPropagation();
    window.speechSynthesis.cancel();
    if (activeAudioObj) { activeAudioObj.pause(); activeAudioObj.currentTime = 0; }
    
    // First Priority: User Uploaded Custom Audio
    if (customAudioMap[voiceId]) {
      const audio = new Audio(customAudioMap[voiceId]);
      audio.loop = true; // Loop alarms
      audio.play().catch(err => console.error('Audio play failed', err));
      setActiveAudioObj(audio);
      return;
    }
    
    // Synthesize Retro Sounds dynamically
    const syntheticObj = synthesizeRetroAlarm(voiceId);
    if (syntheticObj) {
      setActiveAudioObj(syntheticObj);
      return;
    }

    // Hardcoded special cases
    if (voiceId === 'nuclear_file') {
      const audio = new Audio('/tacnuke.mp3');
      audio.loop = true;
      audio.play().catch(err => console.error('Tacnuke play failed', err));
      setActiveAudioObj(audio);
      return;
    }

    // Default Fallback: Text-TO-Speech
    const voice = ALARM_VOICES.find(v => v.id === voiceId);
    if (voice) {
      const utterance = new SpeechSynthesisUtterance(voice.sample);
      utterance.rate = 0.9;
      // Loop the speech synthesis while alarm is ringing
      utterance.onend = () => {
         if (isRinging) window.speechSynthesis.speak(utterance);
      };
      window.speechSynthesis.speak(utterance);
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

  return (
    <div className="relative w-full overflow-x-hidden overflow-y-auto min-h-screen pt-[8dvh] lg:pt-0 pb-16 flex items-start lg:items-center justify-center bg-[#000b12]" style={{fontFamily: '"Press Start 2P", monospace'}}>
      
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
             <button onClick={() => setTimerMinutes(5)} className="w-full h-[40px] bg-[#1a0011] border border-[#ff00aa] text-[#00f0ff] text-[10px] uppercase hover:bg-[#ff00aa] hover:text-white transition-colors">
                5 Minute Power Nap
             </button>
             <button onClick={() => setTimerMinutes(15)} className="w-full h-[40px] bg-[#1a0011] border border-[#ff00aa] text-[#00f0ff] text-[10px] uppercase hover:bg-[#ff00aa] hover:text-white transition-colors">
                15 Min Hustle
             </button>
             <button onClick={() => setTimerMinutes(60)} className="w-full h-[40px] bg-[#1a0011] border border-[#ff00aa] text-[#00f0ff] text-[10px] uppercase hover:bg-[#ff00aa] hover:text-white transition-colors">
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
      <div className="relative w-full max-w-[440px] m-auto flex flex-col justify-center px-4 z-50 pointer-events-auto drop-shadow-[0_40px_40px_rgba(0,0,0,0.6)]">
        
        {/* Main Plastic Shell - Miami Vice Gray/White aesthetic */}
        <div className="w-full relative bg-[#e0e5ec] rounded-[24px] rounded-t-[40px] shadow-[inset_-5px_-5px_15px_rgba(0,0,0,0.2),_inset_5px_5px_15px_rgba(255,255,255,0.8)] border-[2px] border-[#cbd2d9] pb-8 pt-4 px-4 md:px-6 flex flex-col overflow-hidden">
          
          {/* Hardware Decal Logo Top Center */}
          <div className="text-center w-full mb-3 flex items-center justify-center gap-3">
             <div className="h-[2px] w-8 bg-[#ff00aa] shadow-[0_4px_0_#00f0ff]" />
             <span className="text-[8px] text-slate-500 tracking-widest uppercase">
               {userProfile ? `WELCOME, ${userProfile.name}` : 'RADIO-TEK'}
             </span>
             <div className="h-[2px] w-8 bg-[#ff00aa] shadow-[0_4px_0_#00f0ff]" />
          </div>

          {/* SNOOZE BAR AT THE TOP (Massive chunky physical button) */}
          <button 
            onClick={handleSnoozeLight}
            className={`w-full relative h-[70px] bg-[#ff00aa] rounded-[16px] mb-6 flex items-center justify-center border-b-[8px] border-r-[4px] border-[#990066] active:scale-[0.98] outline-none shadow-lg transition-all cursor-pointer touch-manipulation ${isRinging ? 'animate-pulse bg-[#ff0055]' : ''} ${isLightOn ? 'bg-[#ff66cc] shadow-[0_0_40px_#ff00aa] border-[#cc0088]' : ''}`}
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
          <div className={`w-full bg-[#0a0f12] rounded-xl border-t-[8px] border-l-[8px] border-[#05080a] border-b-[2px] border-r-[2px] border-[#151f26] shadow-[inset_0_5px_25px_rgba(0,0,0,1)] p-4 relative overflow-hidden flex flex-col transition-all duration-300 ${isLightOn ? 'shadow-[0_0_60px_#00f0ff]' : ''}`}>
              
              <div className={`absolute top-0 left-0 w-full h-[50%] bg-gradient-to-b from-white/10 to-transparent pointer-events-none transition-opacity duration-300 ${isLightOn ? 'from-white/40' : ''}`} />
              
              <div className="flex justify-between items-center w-full px-2 mt-1 z-10">
                 <span className="text-[8px] md:text-[9px] text-[#00f0ff] drop-shadow-[0_0_8px_#00f0ff] uppercase">{displayDateStrFull}</span>
                 <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className="text-[5px] text-slate-500 mb-1">ALM</span>
                      <div className={`w-[6px] h-[6px] rounded-full border border-black ${isAlarmActive ? 'bg-[#ff00aa] shadow-[0_0_8px_#ff00aa]' : 'bg-slate-800'}`} />
                    </div>
                 </div>
              </div>

              <div className="w-full flex justify-center items-center mt-4 mb-2 relative z-10 pl-2">
                 <div className="text-center flex items-center justify-center -ml-2" 
                      style={{
                        fontFamily: '"Digital-7", monospace',
                        fontSize: 'clamp(4.5rem, 21vw, 7.5rem)', 
                        lineHeight: '0.8',
                        color: isAlarmActive ? '#ffb3e6' : '#550033',
                        textShadow: isAlarmActive ? `0 0 10px #ff00aa, 0 0 20px #ff00aa, 0 0 35px #ff00aa` : 'none',
                        WebkitTextStroke: isAlarmActive ? `0.5px #ff00aa` : '1px #33001a', 
                        fontStyle: 'italic',
                        letterSpacing: '-0.01em'
                      }}>
                   {displayData.mainString.split(':')[0]}
                   <span className={`opacity-90 -mx-1 md:-mx-2 mb-[10%] ${countdownTarget ? '' : 'animate-pulse'}`}>:</span>
                   {displayData.mainString.split(':')[1]}
                 </div>
                 <div className="flex flex-col ml-3 gap-2 mt-4 md:mt-0">
                    <span className={`text-[8px] font-['Press_Start_2P'] uppercase ${displayData.mode === 'AM' || displayData.mode === 'COUNTDOWN' ? 'text-[#00f0ff] drop-shadow-[0_0_8px_#00f0ff]' : 'text-slate-700'}`}>
                      {countdownTarget ? 'MIN' : 'AM'}
                    </span>
                    <span className={`text-[8px] font-['Press_Start_2P'] uppercase ${displayData.mode === 'PM' || displayData.mode === 'COUNTDOWN' ? 'text-[#00f0ff] drop-shadow-[0_0_8px_#00f0ff]' : 'text-slate-700'}`}>
                      {countdownTarget ? 'SEC' : 'PM'}
                    </span>
                 </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#1a252d] w-full flex justify-between items-center z-10 px-2 lg:hidden">
                <span className="text-[6px] text-slate-500 uppercase">FEED:</span>
                <span className="text-[7px] md:text-[8px] text-[#39ff14] drop-shadow-[0_0_8px_#39ff14] !leading-snug">
                  {MOTIVATIONAL_PHRASES[phraseIndex]}
                </span>
              </div>
          </div>

          {/* HARDWARE CONTROL DECK */}
          <div className="w-full mt-6 grid grid-cols-4 gap-3 md:gap-4 px-2">
             {/* LEFT SIDE: ALARM TIME */}
             <div className="col-span-2 row-span-2 flex flex-col items-start bg-[#cfd6e0] px-2 py-3 rounded-lg shadow-[inset_1px_1px_5px_rgba(0,0,0,0.1)] relative overflow-hidden">
               <div className="text-[6.5px] md:text-[7px] font-bold text-slate-700 uppercase mb-2 flex flex-col gap-1 w-full">
                 {countdownTarget ? (
                   <span className="text-[#ff00aa] text-center leading-tight py-1">COUNTDOWN<br/>ACTIVE</span>
                 ) : (
                   <>
                     <span>ALARM SET:</span>
                     <span className="text-black bg-white/50 px-1.5 py-0.5 rounded cursor-pointer touch-manipulation hover:bg-white transition-colors self-start shadow-sm border border-white/60">
                       {alarmHours}:{alarmMinutes} {alarmAmPm}
                     </span>
                   </>
                 )}
               </div>
               
               {/* Hidden native time input overlay */}
               {!countdownTarget && (
                 <input 
                   type="time" 
                   className="absolute inset-0 opacity-0 cursor-pointer touch-manipulation w-full h-1/2" 
                   onChange={handleTimePickerChange}
                   value={get24HourString()}
                 />
               )}

               <div className="mt-auto w-full">
                 <button 
                    onClick={() => {
                      if (countdownTarget) {
                        setCountdownTarget(null); // Cancel countdown
                        disarmBackgroundEngine();
                      } else {
                        setIsAlarmActive(!isAlarmActive); // Toggle normal alarm
                        if (!isAlarmActive) armBackgroundEngine(`Set for ${alarmHours}:${alarmMinutes} ${alarmAmPm}`);
                        else disarmBackgroundEngine();
                      }
                    }}
                    className="w-[60px] h-[24px] bg-slate-800 rounded-full chunky-track relative flex items-center px-1 shrink-0 z-10 cursor-pointer touch-manipulation"
                 >
                    <div className={`w-[20px] h-[20px] rounded-full absolute border-b-[3px] transition-all duration-200 ${isAlarmActive ? 'border-[#0099aa] left-[36px]' : 'bg-slate-400 border-slate-500 left-1'}`} style={isAlarmActive ? {backgroundColor: '#00f0ff'} : {}} />
                 </button>
               </div>
             </div>

             {/* RIGHT SIDE TOP: TOGGLES */}
             <div className="col-span-2 flex flex-row gap-2 h-full">
                <div className="flex-1 flex flex-col justify-evenly items-center bg-[#cfd6e0] p-2 py-3 rounded-lg shadow-[inset_1px_1px_5px_rgba(0,0,0,0.1)] h-full">
                  <span className="text-[5.5px] md:text-[6px] text-slate-700 uppercase leading-[1.2] text-center font-bold">VOL<br/>MUTE</span>
                  <button onClick={() => setIsMuted(!isMuted)} className={`w-[22px] h-[22px] rounded-md border-b-[3px] active:scale-95 cursor-pointer touch-manipulation transition-transform mt-1 shadow-sm ${isMuted ? 'bg-[#ff00aa] border-[#990066]' : 'bg-slate-400 border-slate-500'}`} />
                </div>
                <div className="flex-1 flex flex-col justify-evenly items-center bg-[#cfd6e0] p-2 py-3 rounded-lg shadow-[inset_1px_1px_5px_rgba(0,0,0,0.1)] h-full">
                  <span className="text-[5.5px] md:text-[6px] text-slate-700 uppercase leading-[1.2] text-center font-bold">MOTV<br/>FEED</span>
                  <button onClick={() => setMotivationState(!motivationState)} className={`w-[22px] h-[22px] rounded-md border-b-[3px] active:scale-95 cursor-pointer touch-manipulation transition-transform mt-1 shadow-sm ${motivationState ? 'bg-[#39ff14] border-[#1b9900]' : 'bg-slate-400 border-slate-500'}`} />
                </div>
             </div>
          </div>

          {/* DEDICATED QUICK TIMERS HARDWARE ROW */}
          <div className="w-full px-2 mt-5 grid grid-cols-2 md:flex gap-3">
             <button 
                onClick={() => {
                  setTimerMinutes(25);
                  armBackgroundEngine('25 Min Pomodoro');
                }} 
                className="flex-1 relative h-[50px] bg-[#00f0ff] rounded-[12px] flex items-center justify-center border-b-[6px] border-r-[3px] border-[#0099aa] active:scale-[0.98] outline-none shadow-md cursor-pointer touch-manipulation transition-transform hover:brightness-110"
             >
                <span className="text-[10px] md:text-[11.5px] text-black uppercase font-black drop-shadow-[1px_1px_0px_rgba(255,255,255,0.8)] tracking-wide">
                  POMODORO
                </span>
             </button>
             
             <button 
                onClick={() => {
                  setTimerMinutes(15);
                  armBackgroundEngine('15 Min Hustle');
                }} 
                className="flex-1 relative h-[50px] bg-[#39ff14] rounded-[12px] flex flex-col items-center justify-center border-b-[6px] border-r-[3px] border-[#1b9900] active:scale-[0.98] outline-none shadow-md cursor-pointer touch-manipulation transition-transform hover:brightness-110"
             >
                <span className="text-[10px] text-black uppercase font-black drop-shadow-[1px_1px_0px_rgba(255,255,255,0.8)] tracking-wide">
                  HUSTLE
                </span>
                <span className="text-[6px] text-[#0d3300] font-bold mt-1 tracking-widest">
                  15 MIN
                </span>
             </button>

             {/* Mobile-injected additional timers (originally hiding in desktop Jumbotrons) */}
             <button 
                onClick={() => {
                  setTimerMinutes(60);
                  armBackgroundEngine('1 Hour Grind');
                }} 
                className="flex-1 relative h-[50px] bg-[#ff00aa] rounded-[12px] flex flex-col items-center justify-center border-b-[6px] border-r-[3px] border-[#990066] active:scale-[0.98] outline-none shadow-md cursor-pointer touch-manipulation transition-transform hover:brightness-110 md:hidden"
             >
                <span className="text-[10px] text-white uppercase font-black drop-shadow-[1px_1px_0px_rgba(0,0,0,0.8)] tracking-wide">
                  GRIND
                </span>
                <span className="text-[6px] text-[#ffb3e6] font-bold mt-1 tracking-widest">
                  60 MIN
                </span>
             </button>

             <button 
                onClick={() => {
                  setTimerMinutes(5);
                  armBackgroundEngine('5 Min Power Nap');
                }} 
                className="flex-1 relative h-[50px] bg-[#ffaa00] rounded-[12px] flex flex-col items-center justify-center border-b-[6px] border-r-[3px] border-[#996600] active:scale-[0.98] outline-none shadow-md cursor-pointer touch-manipulation transition-transform hover:brightness-110 md:hidden"
             >
                <span className="text-[10px] text-black uppercase font-black drop-shadow-[1px_1px_0px_rgba(255,255,255,0.8)] tracking-wide">
                  PWR NAP
                </span>
                <span className="text-[6px] text-[#664400] font-bold mt-1 tracking-widest">
                  5 MIN
                </span>
             </button>
          </div>

          {/* QUICK ALARM PRESETS */}
          <div className="w-full px-2 mt-3 grid grid-cols-3 gap-2">
             {[5, 6, 7].map(hour => {
               const isActivePreset = isAlarmActive && !countdownTarget && alarmHours === hour.toString().padStart(2, '0') && alarmMinutes === '00' && alarmAmPm === 'AM';
               return (
                 <button 
                   key={hour}
                   onClick={() => {
                     initAudioContext();
                     const hStr = hour.toString().padStart(2, '0');
                     setAlarmHours(hStr);
                     setAlarmMinutes('00');
                     setAlarmAmPm('AM');
                     setIsAlarmActive(true);
                     setCountdownTarget(null);
                     armBackgroundEngine(`Set for ${hStr}:00 AM`);
                   }}
                   className={`relative h-[36px] rounded-[8px] flex items-center justify-center border-b-[4px] border-r-[2px] active:scale-[0.98] outline-none cursor-pointer touch-manipulation transition-all ${
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

          {/* HABIT MASTERY PROGRESS HUD */}
          <div className="w-full mt-5 px-2">
            <div className="bg-[#1a252d] border-[3px] border-[#0a0f12] rounded-xl p-3 pb-2 shadow-[inset_0_3px_15px_rgba(0,0,0,0.8)] relative flex flex-col justify-between">
              <div className="absolute -top-3 left-4 flex gap-2">
                <span className="bg-[#e0e5ec] text-[#000] text-[8px] font-black px-2 py-0.5 border-[2px] border-[#1a252d] uppercase drop-shadow-md">
                   HABIT MASTERY: DAY {habitState.currentDay}
                </span>
                <button onClick={() => setShowHabitModal(true)} className="bg-[#ff00aa] text-white text-[7px] font-black px-2 py-0.5 border-[2px] border-[#1a252d] uppercase hover:brightness-125 cursor-pointer touch-manipulation">
                   VIEW INTEL
                </button>
              </div>

              <div className="mt-2 text-[10px] leading-relaxed text-[#00f0ff] drop-shadow-[0_0_5px_#00f0ff] font-['Space_Grotesk'] uppercase mb-3 pr-2 max-h-[60px] overflow-y-auto custom-scrollbar border-l-[3px] border-[#ff00aa] pl-2">
                 "{currentHabit.morningMindset}"
              </div>

              <div className="text-[10px] leading-relaxed text-[#00f0ff] drop-shadow-[0_0_5px_#00f0ff] font-['Space_Grotesk'] uppercase mb-3 border-t border-[#334654] pt-2">
                 <span className="text-[#ff00aa] font-black tracking-widest text-[7px] block mb-1">MISSION DIRECTIVE:</span>
                 {isHabitCompletedToday ? currentHabit.eveningWindDown : currentHabit.actionTip}
              </div>

              <div className="flex justify-between items-center w-full mt-1 border-t border-[#334654] pt-2">
                 <span className={`text-[7px] font-['Press_Start_2P'] uppercase tracking-tighter ${isHabitCompletedToday ? 'text-[#39ff14] drop-shadow-[0_0_5px_#39ff14]' : 'text-[#ff00aa] drop-shadow-[0_0_5px_#ff00aa]'}`}>
                   {isHabitCompletedToday ? 'SYNC: COMPLETE' : 'MISSION: PENDING'}
                 </span>
                 <button 
                    onClick={() => {
                       initAudioContext();
                       if (!isHabitCompletedToday) completeHabitForToday();
                       else setHabitState(prev => ({...prev, completedDate: null}));
                    }}
                    className={`w-[45px] h-[18px] rounded flex items-center justify-center border-[2px] cursor-pointer touch-manipulation active:scale-[0.9] transition-transform ${isHabitCompletedToday ? 'bg-slate-800 border-slate-700 active:bg-slate-700' : 'bg-[#00f0ff] border-[#0099aa] shadow-[0_0_10px_#00f0ff] hover:brightness-110'}`}
                 >
                    <span className={`text-[7px] font-black uppercase ${isHabitCompletedToday ? 'text-slate-500' : 'text-black'}`}>
                      {isHabitCompletedToday ? 'UNDO' : 'DONE'}
                    </span>
                 </button>
              </div>
            </div>
          </div>

          <div className="w-full flex justify-between gap-4 mt-6 px-2">
             <button onClick={() => setShowSettings(!showSettings)} className="flex-1 bg-[#1a202c] border-b-[6px] border-[#0d1218] active:scale-95 rounded-xl h-[45px] flex items-center justify-center p-2 group cursor-pointer touch-manipulation transition-all">
                <Settings className="w-[18px] h-[18px] text-[#00f0ff] drop-shadow-[0_0_5px_#00f0ff] pointer-events-none" strokeWidth={3} />
             </button>
             <button onClick={() => setShowHabitModal(true)} className="flex-1 bg-[#1a202c] border-b-[6px] border-[#0d1218] active:scale-95 rounded-xl h-[45px] flex items-center justify-center p-2 group cursor-pointer touch-manipulation transition-all hover:brightness-125">
                <ListTodo className="w-[18px] h-[18px] text-[#39ff14] drop-shadow-[0_0_5px_#39ff14] pointer-events-none" strokeWidth={3} />
             </button>
             <button onClick={() => setShowProfile(true)} className="flex-1 bg-[#1a202c] border-b-[6px] border-[#0d1218] active:scale-95 rounded-xl h-[45px] flex items-center justify-center p-2 group cursor-pointer touch-manipulation transition-all hover:brightness-125">
                <User className="w-[18px] h-[18px] text-[#ff00aa] drop-shadow-[0_0_5px_#ff00aa] pointer-events-none" strokeWidth={3} />
             </button>
          </div>

        </div>
        
        {showSettings && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
             <div className="w-full bg-[#1e2530] border-t-8 border-[#0a0e14] rounded-t-3xl p-6 relative max-h-[80%] overflow-y-auto">
               <button onClick={() => setShowSettings(false)} className="absolute top-4 right-5 text-white bg-slate-800 rounded-lg border-b-4 border-slate-900 active:border-b-0 active:translate-y-1 z-10 cursor-pointer touch-manipulation w-10 h-10 flex items-center justify-center font-black text-lg transition-transform hover:scale-105">✕</button>
               <h2 className="text-[12px] text-[#00f0ff] uppercase mb-6 mt-2 drop-shadow-[0_0_5px_#00f0ff]">Audio Settings</h2>
               <div className="space-y-3">
                 {ALARM_VOICES.map((voice) => (
                   <button 
                     key={voice.id}
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
               
               {userProfile && (
                  <div className="mt-8 border-t-2 border-slate-700 pt-6">
                     <h2 className="text-[10px] text-[#39ff14] uppercase mb-4 drop-shadow-[0_0_5px_#39ff14]">Premium Custom Audio</h2>
                     {ALARM_VOICES.map((voice) => (
                        <div key={`custom-${voice.id}`} className="w-full flex justify-between items-center mb-4 bg-slate-900 p-3 rounded-lg border border-slate-700">
                           <span className="text-[8px] text-slate-300 uppercase">{voice.name} Override</span>
                           <label className="bg-[#39ff14] text-black text-[7px] font-black uppercase px-3 py-1.5 rounded cursor-pointer active:scale-95 hover:brightness-110">
                              UPLOAD
                              <input type="file" accept="audio/*" className="hidden" onChange={(e) => {
                                 const file = e.target.files?.[0];
                                 if (!file) return;
                                 const reader = new FileReader();
                                 reader.onload = (ev) => {
                                    const b64 = ev.target.result;
                                    const newMap = { ...customAudioMap, [voice.id]: b64 };
                                    setCustomAudioMap(newMap);
                                    localStorage.setItem('eb28_custom_audio', JSON.stringify(newMap));
                                 };
                                 reader.readAsDataURL(file);
                              }} />
                           </label>
                        </div>
                     ))}
                  </div>
               )}
             </div>
          </div>
        )}

        {/* PROFILE OVERLAY */}
        {showProfile && (
          <div className="fixed inset-0 z-50 flex flex-col justify-center items-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
             <div className="w-full max-w-[360px] bg-[#1e2530] border-[3px] border-[#ff00aa] shadow-[0_0_50px_rgba(255,0,170,0.3)] rounded-3xl p-6 relative flex flex-col">
               <button onClick={() => setShowProfile(false)} className="absolute top-4 right-5 text-slate-400 text-[20px] font-black hover:text-[#ff00aa] transition-colors">✕</button>
               
               <h2 className="text-[12px] text-[#ff00aa] uppercase mb-6 mt-2 text-center drop-shadow-[0_0_5px_#ff00aa] font-black tracking-widest">
                  OPERATOR PROFILE
               </h2>
               
               {!userProfile ? (
                 <div className="space-y-4">
                   <div className="text-center mb-6">
                      <span className="text-slate-400 text-[9px] uppercase leading-relaxed block">Create a local auth profile to unlock premium features and cross-session retention.</span>
                   </div>
                   <input type="text" placeholder="CALLSIGN / NAME" value={tempName} onChange={e => setTempName(e.target.value)} className="w-full bg-slate-900 text-[#00f0ff] p-4 rounded-xl border-2 border-slate-700 focus:border-[#00f0ff] outline-none font-['Space_Grotesk'] tracking-widest uppercase text-center" />
                   <input type="email" placeholder="EMAIL ADDRESS" value={tempEmail} onChange={e => setTempEmail(e.target.value)} className="w-full bg-slate-900 text-[#00f0ff] p-4 rounded-xl border-2 border-slate-700 focus:border-[#00f0ff] outline-none font-['Space_Grotesk'] tracking-widest uppercase text-center" />
                   <input type="text" placeholder="iCal Secret URL (Optional)" value={tempCalUrl} onChange={e => setTempCalUrl(e.target.value)} className="w-full bg-slate-900 text-[#00f0ff] p-4 rounded-xl border-2 border-slate-700 focus:border-[#00f0ff] outline-none font-['Space_Grotesk'] tracking-widest uppercase text-center text-[10px]" />
                   <button 
                     onClick={() => {
                        if(tempName.trim()) {
                          const profile = { name: tempName.trim(), email: tempEmail.trim() };
                          localStorage.setItem('eb28_user_profile', JSON.stringify(profile));
                          setUserProfile(profile);
                          
                          if(tempCalUrl.trim()) {
                             localStorage.setItem('eb28_calendar_url', tempCalUrl.trim());
                             setCalendarUrl(tempCalUrl.trim());
                          }
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
                   
                   <div className="bg-[#0a120e] border border-[#39ff14] rounded-xl p-4 mb-8 shadow-[0_0_20px_rgba(57,255,20,0.1)] relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-[#39ff14]" />
                      <span className="text-[#39ff14] text-[12px] uppercase font-black tracking-widest block drop-shadow-[0_0_8px_#39ff14] mb-2">AUTH LINKED</span>
                      <span className="text-slate-400 text-[9px] uppercase block leading-relaxed">Habit Mastery & Custom Audio Uploads are fully authorized.</span>
                      {calendarUrl ? (
                         <span className="text-[#00f0ff] text-[8px] mt-3 uppercase block border-t border-[#39ff14]/30 pt-2 break-all overflow-hidden text-ellipsis line-clamp-1 opacity-70">
                            iCal Sync: {calendarUrl.substring(0, 40)}...
                         </span>
                      ) : Capacitor.isNativePlatform() ? (
                         <div className="mt-3 pt-3 border-t border-[#39ff14]/30">
                            <span className="text-slate-500 text-[8px] uppercase block mb-2">Native iOS EventKit Sync</span>
                            <button 
                              onClick={async () => {
                                 try {
                                    // Request the native OS permissions panel from EventKit
                                    await CapacitorCalendar.requestFullCalendarAccess();
                                    fetchNativeCalendar();
                                 } catch(e) { console.error('Native Auth Rejection', e); }
                              }}
                              className="w-full bg-[#39ff14] text-black px-3 py-2 text-[8px] font-black rounded hover:brightness-110 active:scale-95 cursor-pointer touch-manipulation uppercase"
                            >
                              CONNECT DEVICE CALENDAR
                            </button>
                         </div>
                      ) : (
                         <div className="mt-3 pt-3 border-t border-[#39ff14]/30">
                            <span className="text-slate-500 text-[8px] uppercase block mb-2">Connect Google/Apple Calendar</span>
                            <div className="flex gap-2">
                               <input type="text" placeholder="Paste .ics URL" value={tempCalUrl} onChange={e => setTempCalUrl(e.target.value)} className="flex-1 bg-black text-[#00f0ff] text-[8px] p-2 rounded outline-none border border-slate-700" />
                               <button 
                                 onClick={() => {
                                    if(tempCalUrl.trim()) {
                                       localStorage.setItem('eb28_calendar_url', tempCalUrl.trim());
                                       setCalendarUrl(tempCalUrl.trim());
                                    }
                                 }}
                                 className="bg-[#39ff14] text-black px-3 text-[8px] font-black rounded hover:brightness-110 active:scale-95 cursor-pointer touch-manipulation"
                               >
                                 SYNC
                               </button>
                            </div>
                         </div>
                      )}
                   </div>

                   <button 
                      onClick={() => { 
                         localStorage.removeItem('eb28_user_profile'); 
                         localStorage.removeItem('eb28_calendar_url');
                         setUserProfile(null); 
                         setCalendarUrl('');
                      }} 
                      className="w-full text-slate-500 text-[9px] uppercase tracking-[0.2em] p-3 rounded-xl border border-slate-800 active:bg-slate-900 hover:text-white transition-colors cursor-pointer touch-manipulation"
                   >
                     OVERRIDE / UNLINK DEVICE
                   </button>
                 </div>
               )}
             </div>
          </div>
        )}

        {/* MORNING MINDSET INTERCEPTION MODAL */}
        {showHabitModal && (
          <div className="absolute inset-0 z-[100] flex flex-col justify-center items-center bg-[#05080a]/95 backdrop-blur-md p-6 animate-fade-in text-center px-4 md:px-0">
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
                  onClick={() => setShowHabitModal(false)}
                  className="mt-8 w-full bg-[#39ff14] text-black font-black uppercase text-sm tracking-widest py-4 rounded-xl border-b-[6px] border-[#1b9900] active:translate-y-1 active:border-b-0 transition-transform shadow-[0_5px_20px_rgba(57,255,20,0.3)] cursor-pointer touch-manipulation hover:brightness-110"
                >
                  ACKNOWLEDGE
                </button>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}
