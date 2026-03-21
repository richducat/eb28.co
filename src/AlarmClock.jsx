import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Settings, Clock, User, Zap, Lock, BellRing, ChevronUp, ChevronDown } from 'lucide-react';

// Skin/Voice options matching the Synthwave Redesign
const ALARM_VOICES = [
  { id: 'standard', name: 'Classic Beep', type: 'free', icon: '🔔', sample: 'Beep beep beep... time to wake up.' },
  { id: 'zen', name: 'Zen Master (Gentle)', type: 'free', icon: '☯️', sample: 'Breathe in... Breathe out... Welcome to a new day.' },
  { id: 'retro', name: 'Retro Synth', type: 'free', icon: '🕹️', sample: 'Synthesizer sounds fading in...' },
  { id: 'nuclear', name: 'Nuclear Countdown', type: 'premium', icon: '☢️', sample: 'Warning. Nuclear launch sequence initiated. 10, 9, 8...' },
  { id: 'cyber', name: 'Cyber Strike', type: 'premium', icon: '🚀', sample: 'Cyber strike inbound. Wake up.' },
  { id: 'power', name: 'Power Chord', type: 'premium', icon: '⚡', sample: 'Electric guitar shredding loudly!' },
  { id: 'blast', name: 'Blast Radius', type: 'premium', icon: '💣', sample: 'Explosions! Wake up now!' },
  { id: 'neon', name: 'Neon Pursuit', type: 'premium', icon: '🕶️', sample: 'Fast paced 80s synthwave chasing music.' },
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

  // Synthwave Visual Styles
  const neonMain = {
    color: '#ff2a2a',
    textShadow: '0 0 5px #ff0000, 0 0 10px #ff0000, 0 0 20px #cc0000',
    fontFamily: '"Share Tech Mono", "Courier New", monospace'
  };
  const neonBox = {
    boxShadow: '0 0 15px rgba(239, 68, 68, 0.4), inset 0 0 15px rgba(239, 68, 68, 0.4)',
    border: '2px solid #ef4444'
  };
  const neonTextOnly = {
    textShadow: '0 0 8px rgba(239, 68, 68, 0.8)'
  };
  
  const selectedVoiceObj = ALARM_VOICES.find(v => v.id === selectedVoice);

  return (
    <div className="relative min-h-screen bg-slate-950 flex flex-col items-center overflow-x-hidden selection:bg-red-500 selection:text-white font-sans">
      
      {/* Dynamic Keyframes for Grid */}
      <style>{`
        @keyframes gridMove {
          0% { background-position: 0 0; }
          100% { background-position: 0 40px; }
        }
        @keyframes sunPulse {
          0%, 100% { opacity: 0.8; filter: drop-shadow(0 0 20px #ef4444); }
          50% { opacity: 1; filter: drop-shadow(0 0 40px #ef4444); }
        }
      `}</style>

      {/* Synthwave Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Sky gradient */}
        <div className="absolute top-0 w-full h-[55%] bg-gradient-to-b from-slate-950 via-purple-950 to-red-900/40" />
        
        {/* Retro Sun */}
        <div className="absolute top-[35%] left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-gradient-to-t from-red-500 to-yellow-300 opacity-90"
             style={{ 
               clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)',
               animation: 'sunPulse 6s ease-in-out infinite' 
             }}>
          {/* Sun cuts */}
          <div className="absolute bottom-[55%] w-full h-1 bg-slate-950"></div>
          <div className="absolute bottom-[65%] w-full h-2 bg-slate-950"></div>
          <div className="absolute bottom-[75%] w-full h-3 bg-slate-950"></div>
        </div>
        
        {/* Neon Grid Floor */}
        <div className="absolute bottom-0 w-full h-[55%]" style={{ perspective: '800px' }}>
          <div className="absolute inset-0 bg-slate-950" 
               style={{
                 backgroundImage: `linear-gradient(transparent 0%, rgba(2ef, 68, 68, 0.7) 2%, transparent 3%), linear-gradient(90deg, transparent 0%, rgba(239, 68, 68, 0.7) 2%, transparent 3%)`,
                 backgroundSize: '40px 40px',
                 transform: 'rotateX(75deg) scale(3) translateZ(0)',
                 transformOrigin: 'top center',
                 animation: 'gridMove 2s linear infinite'
               }}>
          </div>
          {/* Horizon fade */}
          <div className="absolute top-0 w-full h-24 bg-gradient-to-b from-slate-950 to-transparent"></div>
        </div>
      </div>
      
      {/* Premium Subscription Banner */}
      {!isUnlocked && (
        <div className="absolute top-0 w-full bg-red-600/90 backdrop-blur-md p-3 text-center text-white text-xs sm:text-sm font-bold shadow-[0_0_20px_#ef4444] z-50 flex flex-wrap justify-center items-center gap-2 border-b-2 border-red-500">
          <Zap className="w-4 h-4 animate-pulse" />
          <span style={neonTextOnly}>UNLOCK PREMIUM ALARMS & REMOVE ADS FOR $1/MO</span>
          <button onClick={() => setShowLogin(true)} className="ml-2 px-3 py-1 bg-black text-red-500 border border-red-500 rounded text-[10px] hover:bg-red-500 hover:text-black transition-colors uppercase tracking-widest shadow-[0_0_10px_#ef4444]">
            Subscribe
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="relative z-10 max-w-sm w-full mt-16 sm:mt-24 px-4 flex flex-col items-center">
        
        {/* Settings View */}
        {showSettings ? (
          <div className="w-full bg-black/80 backdrop-blur-lg rounded-2xl p-6 mb-8 text-red-500 animate-fade-in-up" style={neonBox}>
            <div className="flex justify-between items-center mb-6 border-b border-red-900 pb-4">
              <button onClick={() => setShowSettings(false)} className="text-red-500 hover:text-red-300 transition-colors uppercase font-mono tracking-widest text-sm flex items-center gap-2">
                &larr; Back
              </button>
              <div className="text-right">
                <span className="block text-xs uppercase tracking-widest text-red-700 font-bold">80s Alarm</span>
                <span className="text-xl font-black uppercase tracking-widest" style={neonTextOnly}>Settings</span>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-center font-bold tracking-widest uppercase mb-4" style={neonTextOnly}>Motivator Audio</h3>
              <div className="space-y-3">
                {ALARM_VOICES.map((voice) => (
                  <div key={voice.id} className="relative">
                    <button 
                      onClick={() => handleVoiceSelect(voice)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${selectedVoice === voice.id ? 'bg-red-900/40 border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-black border-red-900/50 hover:border-red-500/50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{voice.icon}</span>
                        <div className="flex flex-col text-left">
                          <span className={`${selectedVoice === voice.id ? 'text-white' : 'text-red-400'} font-bold text-sm tracking-wide`}>{voice.name}</span>
                          {(voice.type === 'premium' && !isUnlocked) && (
                             <span className="text-[10px] text-yellow-500 uppercase tracking-widest mt-1 flex items-center"><Lock className="w-3 h-3 mr-1"/> Locked</span>
                          )}
                        </div>
                      </div>
                      
                      <button onClick={(e) => playSample(voice.id, e)} className="p-2 text-red-500 hover:text-white transition-colors bg-red-950/50 rounded-full border border-red-900 hover:border-red-400">
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </button>
                    
                    {/* Admin Backdoor Upload underneath */}
                    {isUnlocked && selectedVoice === voice.id && (
                       <div className="mt-2 text-center pb-2">
                         <label className="text-xs text-red-300 uppercase tracking-widest cursor-pointer hover:text-white border-b border-red-500/30 pb-1">
                           {customAudioMap[voice.id] ? 'Change Custom Audio (.mp3)' : 'Upload Custom Audio (.mp3)'}
                           <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleAudioUpload(voice.id, e)} />
                         </label>
                       </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-red-900/50">
              <div className="flex justify-between items-center text-sm font-bold uppercase tracking-widest">
                <span>Volume Control</span>
                <input type="range" min="0" max="100" defaultValue="80" className="w-24 accent-red-500" />
              </div>
              <div className="flex justify-between items-center text-sm font-bold uppercase tracking-widest">
                <span>Mute Mode</span>
                <button onClick={() => setIsMuted(!isMuted)} className={`w-12 h-6 rounded-full relative transition-colors ${isMuted ? 'bg-red-500' : 'bg-slate-800'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${isMuted ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
              <div className="flex justify-between items-center text-sm font-bold uppercase tracking-widest pt-4">
                <span>Custom Packs</span>
                <span className="text-red-400 cursor-pointer hover:text-white">Explore</span>
              </div>
            </div>
            
            {/* Time Adjuster in Settings */}
            <div className="mt-8 bg-black/50 p-4 rounded-xl border border-red-900/50">
               <h3 className="text-center text-xs text-red-500 font-bold uppercase tracking-widest mb-3">Adjust Alarm Time</h3>
               <div className="flex justify-center items-center gap-2 font-mono text-2xl text-white">
                 <div className="flex flex-col items-center">
                   <button onClick={() => setAlarmHours(incrementValue(alarmHours, 12))} className="text-red-500 hover:text-white"><ChevronUp/></button>
                   <span>{alarmHours}</span>
                   <button onClick={() => setAlarmHours(decrementValue(alarmHours, 12))} className="text-red-500 hover:text-white"><ChevronDown/></button>
                 </div>
                 <span className="text-red-500 pb-2">:</span>
                 <div className="flex flex-col items-center">
                   <button onClick={() => setAlarmMinutes(incrementValue(alarmMinutes, 59))} className="text-red-500 hover:text-white"><ChevronUp/></button>
                   <span>{alarmMinutes}</span>
                   <button onClick={() => setAlarmMinutes(decrementValue(alarmMinutes, 59))} className="text-red-500 hover:text-white"><ChevronDown/></button>
                 </div>
                 <div className="flex flex-col items-center ml-2 border-l border-red-900/50 pl-4 text-xl">
                   <button onClick={() => setAlarmAmPm(alarmAmPm === 'AM' ? 'PM' : 'AM')} className="text-red-500 hover:text-white"><ChevronUp/></button>
                   <span className="text-red-400">{alarmAmPm}</span>
                   <button onClick={() => setAlarmAmPm(alarmAmPm === 'AM' ? 'PM' : 'AM')} className="text-red-500 hover:text-white"><ChevronDown/></button>
                 </div>
               </div>
            </div>
          </div>
        ) : (
          /* Main Clock View */
          <div className="w-full flex justify-center mt-8">
            <div className="relative bg-black/70 backdrop-blur-md rounded-3xl p-6 sm:p-8 w-full border-[3px] border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5),inset_0_0_30px_rgba(239,68,68,0.2)]">
              
              <div className="absolute top-4 right-4 flex gap-2">
                 <div className={`w-2 h-2 rounded-full ${getAmPm(time) === 'AM' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-red-900'}`}/>
                 <div className={`w-2 h-2 rounded-full ${getAmPm(time) === 'PM' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-red-900'}`}/>
              </div>

              <div className="text-center mb-2">
                <span className="text-red-500/80 font-mono text-xs uppercase tracking-[0.3em] font-bold block" style={neonTextOnly}>
                  Current Time
                </span>
              </div>
              
              <div className="flex justify-center items-center my-6">
                <div className={`text-7xl sm:text-8xl flex items-baseline leading-none ${isRinging ? 'animate-pulse' : ''}`} style={neonMain}>
                  <span>{formatHours(time)}</span>
                  <span className={`mx-1 sm:mx-2 pb-2 ${time.getSeconds() % 2 === 0 ? 'opacity-100' : 'opacity-20'}`}>:</span>
                  <span>{formatMinutes(time)}</span>
                </div>
              </div>

              {/* Alarm Status & Snooze Panel */}
              <div className="mt-8 pt-6 border-t border-red-900/50 space-y-4">
                <div className="flex justify-between items-center text-xs text-red-500 font-bold uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <span style={neonTextOnly}>ALARM: {alarmHours}:{alarmMinutes} {alarmAmPm}</span>
                    <button onClick={toggleAlarm} className={`px-2 py-0.5 rounded text-[10px] ${isAlarmActive ? 'bg-red-600 text-white shadow-[0_0_8px_#ef4444]' : 'bg-red-950/50 text-red-700 border border-red-900'}`}>
                      {isAlarmActive ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={neonTextOnly}>AUDIO</span>
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-700"/> : <Volume2 className="w-4 h-4 text-red-500 drop-shadow-[0_0_5px_#ef4444]"/>}
                  </div>
                </div>
                
                {/* Snooze/Stop Pill Button */}
                <button 
                  onClick={() => isRinging ? stopAlarm() : setShowSettings(true)}
                  className={`w-full py-4 rounded-full border-2 border-red-500 flex justify-center items-center gap-2 transition-all ${isRinging ? 'bg-red-600/90 text-white animate-pulse shadow-[0_0_20px_#ef4444,inset_0_0_10px_#ffffff]' : 'bg-black/50 text-red-500 hover:bg-red-900/30 shadow-[inset_0_0_15px_rgba(239,68,68,0.5)]'}`}
                >
                  <span className="text-lg font-black uppercase tracking-[0.2em] font-mono leading-none" style={!isRinging ? neonTextOnly : {}}>
                    {isRinging ? 'STOP ALARM' : 'SNOOZE'}
                  </span>
                </button>
              </div>

              {/* Motivation Box */}
              <div className="mt-8 border border-red-500/50 rounded-xl p-4 bg-black/80 shadow-[inset_0_0_15px_rgba(239,68,68,0.2)]">
                <h2 className="text-center font-bold text-red-500 uppercase tracking-widest border-b border-red-900 pb-2 mb-3" style={neonTextOnly}>Wake Up Like A Champion</h2>
                <div className="text-center text-sm font-bold tracking-widest text-red-400 space-y-2 uppercase leading-relaxed font-mono">
                   <p>Rise & Grind!</p>
                   <p>Stay Hungry.</p>
                   <p>Embrace The Day.</p>
                   <p>Your Goals Wait For No One.</p>
                </div>
                <div className="mt-4 pt-4 border-t border-red-900 text-center">
                  <span className="text-xs text-red-600 uppercase tracking-widest">Active Motivator: {selectedVoiceObj?.name}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Nav */}
        <div className="fixed bottom-6 flex gap-8">
          <button onClick={() => setShowSettings(!showSettings)} className="text-red-500 hover:text-white transition-colors bg-black/50 p-3 rounded-full border border-red-900 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
            <Settings className="w-6 h-6" />
          </button>
          <button onClick={() => setShowLogin(true)} className="text-red-500 hover:text-white transition-colors bg-black/50 p-3 rounded-full border border-red-900 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
            <User className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Login Overlay */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-950 border-2 border-red-500 rounded-xl max-w-sm w-full p-6 shadow-[0_0_30px_#ef4444] relative">
            <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-red-500 hover:text-white font-mono text-xl">
              ✕
            </button>
            <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-widest flex items-center gap-3" style={neonTextOnly}>
              <Lock className="w-6 h-6 text-red-500" /> Admin Access
            </h2>
            <p className="text-red-400 text-xs uppercase mb-6 tracking-wider">Unlock all premium motivators & custom sounds.</p>
            
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && <div className="p-3 bg-red-900/40 border border-red-500 text-red-300 text-xs font-mono uppercase tracking-widest rounded">{loginError}</div>}
              <div>
                <label className="block text-red-500 text-xs font-bold uppercase tracking-widest mb-1.5">Username</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-black border border-red-900 focus:border-red-500 rounded px-3 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-red-500 shadow-[inset_0_0_10px_rgba(239,68,68,0.2)]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-red-500 text-xs font-bold uppercase tracking-widest mb-1.5">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-black border border-red-900 focus:border-red-500 rounded px-3 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-red-500 shadow-[inset_0_0_10px_rgba(239,68,68,0.2)]"
                />
              </div>
              <button type="submit" className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded font-black uppercase tracking-widest transition-colors mt-6 shadow-[0_0_15px_#ef4444]">
                Authorize
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
