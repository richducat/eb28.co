import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Settings, Clock, User, Zap, Lock, BellRing, ChevronUp, ChevronDown } from 'lucide-react';

// Skin/Voice options
const ALARM_VOICES = [
  { id: 'standard', name: 'Classic Beep', type: 'free', icon: '🔔', sample: 'Beep beep beep... time to wake up.' },
  { id: 'nuclear', name: 'Nuclear Countdown', type: 'premium', icon: '☢️', sample: 'Warning. Nuclear launch sequence initiated. 10, 9, 8...' },
  { id: 'rocky', name: 'Boxing Champion Theme', type: 'premium', icon: '🥊', sample: 'Dun dun dun... Get up champ, it is time to train!' },
  { id: 'jerky', name: '"Hey Loser, Wake Up!"', type: 'premium', icon: '🤬', sample: 'Hey loser! Yeah, you! Get out of bed!' },
  { id: 'zen', name: 'Zen Master (Gentle)', type: 'free', icon: '☯️', sample: 'Breathe in... Breathe out... Welcome to a new day.' }
];

export default function AlarmClock() {
  const [time, setTime] = useState(new Date());
  
  // Premium / Login state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [customAudioMap, setCustomAudioMap] = useState({});
  const [activeAudioObj, setActiveAudioObj] = useState(null);

  // Load custom audio on mount
  useEffect(() => {
    try {
      const savedAudio = localStorage.getItem('eb28_custom_audio');
      if (savedAudio) {
        setCustomAudioMap(JSON.parse(savedAudio));
      }
    } catch (e) {
      console.warn('Failed to load custom audio', e);
    }
  }, []);

  // Alarm state
  const [alarmHours, setAlarmHours] = useState('06');
  const [alarmMinutes, setAlarmMinutes] = useState('00');
  const [alarmAmPm, setAlarmAmPm] = useState('AM');
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  
  // Settings state
  const [selectedVoice, setSelectedVoice] = useState(ALARM_VOICES[0].id);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Refs for audio simulation
  const audioRef = useRef(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now);
      checkAlarm(now);
    }, 1000);
    return () => clearInterval(timer);
  }, [alarmHours, alarmMinutes, alarmAmPm, isAlarmActive, isRinging]);

  const checkAlarm = (currentTime) => {
    if (!isAlarmActive) return;
    if (isRinging) return;
    
    // Parse current time to 12-hour format string
    let _h = currentTime.getHours();
    const ampm = _h >= 12 ? 'PM' : 'AM';
    _h = _h % 12;
    _h = _h ? _h : 12; 
    const currentH = _h.toString().padStart(2, '0');
    const currentM = currentTime.getMinutes().toString().padStart(2, '0');

    if (currentH === alarmHours && currentM === alarmMinutes && ampm === alarmAmPm) {
      if (currentTime.getSeconds() === 0) {
        triggerAlarm();
      }
    }
  };

  const triggerAlarm = () => {
    setIsRinging(true);
    if (!isMuted) {
      playSample(selectedVoice);
    }
  };

  const stopAlarm = () => {
    setIsRinging(false);
    setIsAlarmActive(false); // Turn off after ringing once
    window.speechSynthesis.cancel();
    if (activeAudioObj) {
      activeAudioObj.pause();
      activeAudioObj.currentTime = 0;
      setActiveAudioObj(null);
    }
  };

  const toggleAlarm = () => {
    setIsAlarmActive(!isAlarmActive);
  };

  const playSample = (voiceId, e) => {
    if (e) {
      e.stopPropagation();
    }
    // Stop any existing audio
    window.speechSynthesis.cancel();
    if (activeAudioObj) {
      activeAudioObj.pause();
      activeAudioObj.currentTime = 0;
    }

    // Check for custom audio override
    if (customAudioMap[voiceId]) {
      const audio = new Audio(customAudioMap[voiceId]);
      audio.play().catch(err => console.error('Audio play failed', err));
      setActiveAudioObj(audio);
      return;
    }

    // Fallback to TTS
    const voice = ALARM_VOICES.find(v => v.id === voiceId);
    if (voice) {
      const utterance = new SpeechSynthesisUtterance(voice.sample);
      utterance.rate = 0.9;
      if (voice.id === 'jerky') utterance.rate = 1.2;
      if (voice.id === 'nuclear') utterance.pitch = 0.5;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAudioUpload = (voiceId, e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Please upload a file smaller than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Audio = event.target.result;
      const newMap = { ...customAudioMap, [voiceId]: base64Audio };
      setCustomAudioMap(newMap);
      try {
        localStorage.setItem('eb28_custom_audio', JSON.stringify(newMap));
      } catch (err) {
        alert("Audio file is too large to save to browser storage. Try a shorter clip.");
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleVoiceSelect = (voice) => {
    if (voice.type === 'premium' && !isUnlocked) {
      setShowLogin(true);
      return;
    }
    setSelectedVoice(voice.id);
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      setIsUnlocked(true);
      setShowLogin(false);
      setUsername('');
      setPassword('');
      setLoginError('');
    } else {
      setLoginError('Invalid credentials');
    }
  };

  // Time formatters for Display
  const formatHours = (date) => {
    let h = date.getHours();
    h = h % 12;
    h = h ? h : 12; 
    return h.toString().padStart(2, '0');
  };
  
  const formatMinutes = (date) => {
    return date.getMinutes().toString().padStart(2, '0');
  };

  const getAmPm = (date) => {
    return date.getHours() >= 12 ? 'PM' : 'AM';
  };

  const incrementValue = (val, max, pad = true) => {
    let num = parseInt(val, 10);
    num = num + 1 > max ? (max === 12 ? 1 : 0) : num + 1;
    return pad ? num.toString().padStart(2, '0') : num.toString();
  };

  const decrementValue = (val, max, pad = true) => {
    let num = parseInt(val, 10);
    num = num - 1 < (max === 12 ? 1 : 0) ? max : num - 1;
    return pad ? num.toString().padStart(2, '0') : num.toString();
  };

  // Font setup for digital clock (would ideally be a web font like Share Tech Mono)
  // Inline styles for the glowing 80s effect
  const digitalFont = "font-mono tracking-widest";
  const glowRed = {
    color: '#ff2a2a',
    textShadow: '0 0 10px #ff0000, 0 0 20px #cc0000, 0 0 30px #990000',
    fontFamily: '"Share Tech Mono", "Courier New", monospace'
  };
  const glowDim = {
    color: '#4a0f0f',
    fontFamily: '"Share Tech Mono", "Courier New", monospace'
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 selection:bg-red-500 selection:text-white"
         style={{ 
           backgroundImage: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)' 
         }}>
      
      {/* Premium Subscription Banner */}
      {!isUnlocked && (
        <div className="absolute top-0 w-full bg-gradient-to-r from-red-600 via-yellow-600 to-red-600 p-3 text-center text-white text-sm font-bold shadow-2xl z-20 flex justify-center items-center gap-2">
          <Zap className="w-4 h-4" />
          Unlock Premium Alarms (Nuclear, Boxing Theme) for just $1/month!
          <button onClick={() => setShowLogin(true)} className="ml-4 px-4 py-1 bg-white text-red-700 rounded-full text-xs hover:bg-red-50 hover:scale-105 transition-transform uppercase tracking-wider">
            Subscribe Now
          </button>
        </div>
      )}

      <div className="max-w-2xl w-full perspective-1000 mt-16">
        
        {/* 80s Table Clock Casing */}
        <div className="relative bg-amber-900 rounded-xl shadow-2xl border-b-8 border-amber-950 p-6 sm:p-10 transform-style-3d rotate-x-6"
             style={{
               boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 2px 4px rgba(255, 255, 255, 0.1)',
               backgroundImage: `linear-gradient(90deg, #5c2c16 0%, #4a2110 50%, #5c2c16 100%), url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
               backgroundBlendMode: 'overlay'
             }}>
          
          {/* Top Buttons Panel */}
          <div className="absolute top-0 left-0 w-full h-8 bg-black/40 rounded-t-xl flex justify-between px-10 items-end pb-1 border-b border-white/10">
            <div className="flex gap-4">
              <button className="w-16 h-4 bg-slate-800 rounded-t hover:bg-slate-700 active:h-3 active:mt-1 transition-all border border-slate-600" />
              <button className="w-12 h-4 bg-slate-800 rounded-t hover:bg-slate-700 active:h-3 active:mt-1 transition-all border border-slate-600" />
            </div>
            
            {/* Snooze Button */}
            <button 
              onClick={() => isRinging && stopAlarm()}
              className={`w-32 h-6 rounded-t transition-all border border-slate-800 ${isRinging ? 'bg-red-600 animate-pulse mt-0' : 'bg-slate-800 hover:bg-slate-700 active:h-4 active:mt-2'}`}
              style={{ boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2)' }}
            >
              <span className="text-[10px] uppercase font-bold text-white/50">{isRinging ? 'SNOOZE / STOP' : 'SNOOZE'}</span>
            </button>
          </div>

          <div className="flex justify-between items-center mb-4 mt-4">
            <span className="text-amber-500/80 font-serif text-sm italic tracking-widest">EB-28</span>
            <div className="flex gap-2">
              <span className="text-[10px] text-amber-500/60 font-mono uppercase">Solid State</span>
              <span className="text-[10px] text-amber-500/60 font-mono uppercase">Motivation</span>
            </div>
          </div>

          {/* LED Display Screen area */}
          <div className="bg-black rounded-lg p-6 sm:p-12 border-4 border-slate-900 shadow-inner relative overflow-hidden"
               style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,1)' }}>
            
            {/* Screen Glare overlay */}
            <div className="absolute top-0 left-0 w-full h-[50%] bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-t"></div>

            <div className="flex justify-between items-center relative z-10">
              
              {/* Status Indicators */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${getAmPm(time) === 'AM' ? 'bg-red-500 shadow-[0_0_8px_#ff0000]' : 'bg-red-900'}`}></div>
                  <span className="text-white/30 text-[10px] font-bold uppercase">AM</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${getAmPm(time) === 'PM' ? 'bg-red-500 shadow-[0_0_8px_#ff0000]' : 'bg-red-900'}`}></div>
                  <span className="text-white/30 text-[10px] font-bold uppercase">PM</span>
                </div>
                <div className="flex items-center mt-6">
                  <div className={`w-2 h-2 rounded-full mr-2 ${isAlarmActive ? 'bg-red-500 shadow-[0_0_8px_#ff0000]' : 'bg-red-900'}`}></div>
                  <span className="text-white/30 text-[10px] font-bold uppercase">AL</span>
                </div>
              </div>

              {/* Main Time Display */}
              <div className={`text-6xl sm:text-8xl flex items-baseline ${isRinging ? 'animate-pulse' : ''}`} style={glowRed}>
                <span>{formatHours(time)}</span>
                <span className={`mx-2 ${time.getSeconds() % 2 === 0 ? 'opacity-100' : 'opacity-20'}`}>:</span>
                <span>{formatMinutes(time)}</span>
              </div>
              
            </div>

            {/* Is Ringing Overlay */}
            {isRinging && (
              <div className="absolute inset-0 bg-red-600/20 backdrop-blur-sm flex items-center justify-center z-20">
                <div className="text-center">
                  <BellRing className="w-16 h-16 text-white mx-auto mb-4 animate-bounce" />
                  <h2 className="text-3xl font-bold text-white uppercase tracking-widest" style={{ textShadow: '0 0 20px #ff0000' }}>WAKE UP!</h2>
                  <p className="text-white/80 mt-2 font-mono">"{ALARM_VOICES.find(v => v.id === selectedVoice)?.name} is calling..."</p>
                  <button onClick={stopAlarm} className="mt-6 px-8 py-3 bg-white text-red-600 rounded-full font-bold uppercase hover:bg-red-100 transition-colors">
                    Stop Alarm
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Controls Panel */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 bg-amber-950/40 p-4 rounded border border-white/5">
            
            {/* Alarm Set Toggle */}
            <div className="flex items-center justify-between bg-black/20 p-3 rounded h-full">
              <div>
                <span className="text-amber-500/70 text-xs font-mono uppercase block mb-1">Alarm Switch</span>
                <span className="text-white font-bold">{isAlarmActive ? 'ON' : 'OFF'}</span>
              </div>
              <button 
                onClick={toggleAlarm}
                className="relative w-16 h-8 rounded-full bg-slate-900 border border-slate-700 shadow-inner flex items-center px-1"
              >
                <div className={`w-6 h-6 rounded-full transition-transform ${isAlarmActive ? 'bg-red-500 translate-x-8 shadow-[0_0_10px_#ff0000]' : 'bg-slate-600 translate-x-0'}`}></div>
              </button>
            </div>

            {/* Set Time Modal Invoke */}
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center justify-between p-3 rounded h-full border transition-colors ${showSettings ? 'bg-amber-800/50 border-amber-600/50' : 'bg-black/20 border-transparent hover:bg-black/30'}`}
            >
              <div className="text-left">
                <span className="text-amber-500/70 text-xs font-mono uppercase block mb-1">Set Alarm Type</span>
                <span className="text-white font-bold flex items-center">
                  {alarmHours}:{alarmMinutes} {alarmAmPm}
                </span>
              </div>
              <Settings className="w-5 h-5 text-amber-500/60" />
            </button>
          </div>
          
        </div>
        
        {/* Settings Drawer */}
        {showSettings && (
          <div className="mt-4 bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl animate-fade-in-up">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center"><Clock className="w-5 h-5 mr-2 text-blue-400"/> Configure Motivation</h3>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Time Setter */}
              <div>
                <label className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-4 block">Set Time</label>
                <div className="flex items-center gap-4 text-white text-3xl font-mono">
                  {/* Hours */}
                  <div className="flex flex-col items-center bg-slate-900 p-2 rounded-lg border border-slate-700">
                    <button onClick={() => setAlarmHours(incrementValue(alarmHours, 12))} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><ChevronUp /></button>
                    <span className="my-2">{alarmHours}</span>
                    <button onClick={() => setAlarmHours(decrementValue(alarmHours, 12))} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><ChevronDown /></button>
                  </div>
                  <span>:</span>
                  {/* Minutes */}
                  <div className="flex flex-col items-center bg-slate-900 p-2 rounded-lg border border-slate-700">
                    <button onClick={() => setAlarmMinutes(incrementValue(alarmMinutes, 59))} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><ChevronUp /></button>
                    <span className="my-2">{alarmMinutes}</span>
                    <button onClick={() => setAlarmMinutes(decrementValue(alarmMinutes, 59))} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><ChevronDown /></button>
                  </div>
                  {/* AM/PM */}
                  <div className="flex flex-col items-center bg-slate-900 p-2 rounded-lg border border-slate-700 ml-4 text-xl">
                    <button onClick={() => setAlarmAmPm(alarmAmPm === 'AM' ? 'PM' : 'AM')} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><ChevronUp /></button>
                    <span className="my-3">{alarmAmPm}</span>
                    <button onClick={() => setAlarmAmPm(alarmAmPm === 'AM' ? 'PM' : 'AM')} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"><ChevronDown /></button>
                  </div>
                </div>
              </div>

              {/* Voice / Skin Setter */}
              <div>
                <label className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-4 block">Select Motivator (Audio)</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {ALARM_VOICES.map((voice) => (
                    <button 
                      key={voice.id}
                      onClick={() => handleVoiceSelect(voice)}
                      className={`w-full text-left p-3 rounded-lg border flex items-center justify-between transition-all ${selectedVoice === voice.id ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}
                    >
                      <div className="flex items-center">
                        <span className="text-xl mr-3">{voice.icon}</span>
                        <div className="flex flex-col">
                          <span className={`font-medium ${selectedVoice === voice.id ? 'text-white' : 'text-slate-300'}`}>{voice.name}</span>
                          <span 
                            onClick={(e) => playSample(voice.id, e)} 
                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center mt-1 cursor-pointer w-max"
                          >
                            <Volume2 className="w-3 h-3 mr-1" /> Sample
                          </span>
                        </div>
                      </div>
                      {voice.type === 'premium' && !isUnlocked && (
                         <span className="flex items-center text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
                           <Lock className="w-3 h-3 mr-1" /> Locked
                         </span>
                      )}
                      {isUnlocked && (
                         <div className="flex flex-col ml-4 border-l border-slate-700 pl-4" onClick={e => e.stopPropagation()}>
                           <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 cursor-pointer hover:text-white transition-colors">
                             {customAudioMap[voice.id] ? 'Change Custom Audio' : 'Upload Custom Audio'}
                             <input 
                               type="file" 
                               accept="audio/*" 
                               className="hidden" 
                               onChange={(e) => handleAudioUpload(voice.id, e)}
                             />
                           </label>
                           {customAudioMap[voice.id] && (
                             <span className="text-[10px] text-green-400">Custom Audio Set</span>
                           )}
                         </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
               <button onClick={() => setShowSettings(false)} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition-colors">
                 Save & Close
               </button>
            </div>
          </div>
        )}
        {/* Bottom Login Trigger */}
        <div className="mt-12 text-center pb-8">
          <button 
            onClick={() => setShowLogin(true)}
            className="text-slate-500 hover:text-slate-300 text-sm flex items-center mx-auto transition-colors"
          >
            <User className="w-4 h-4 mr-2" />
            {isUnlocked ? 'Admin Mode Active' : 'Admin Login'}
          </button>
        </div>

      </div>

      {/* Login Overlay */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-6 shadow-2xl relative">
            <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              ✕
            </button>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Lock className="w-5 h-5 mr-3 text-blue-500" /> Admin Access
            </h2>
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && <div className="p-2 bg-red-500/20 border border-red-500 text-red-400 text-sm rounded">{loginError}</div>}
              <div>
                <label className="block text-slate-400 text-xs uppercase mb-1">Username</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-slate-400 text-xs uppercase mb-1">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition-colors mt-4">
                Unlock Premium
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
