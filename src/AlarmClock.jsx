import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Settings, User, List, Lock, BellRing } from 'lucide-react';
import '@fontsource/inter';
import '@fontsource/share-tech-mono';

const ALARM_VOICES = [
  { id: 'standard', name: 'Classic Beep', type: 'free', icon: '🔔', sample: 'Beep beep beep... time to wake up.', category: 'calm' },
  { id: 'zen', name: 'Zen Master', type: 'free', icon: '☯️', sample: 'Breathe in... Breathe out...', category: 'calm' },
  { id: 'retro', name: 'Retro Synth', type: 'free', icon: '🕹️', sample: 'Synthesizer sounds fading in...', category: 'funny' },
  { id: 'nuclear', name: 'Nuclear Countdown', type: 'premium', icon: '☢️', sample: 'Warning. Nuclear launch.', category: 'motivational' },
  { id: 'cyber', name: 'Cyber Strike', type: 'premium', icon: '🚀', sample: 'Cyber strike inbound.', category: 'motivational' },
  { id: 'power', name: 'Power Chord', type: 'premium', icon: '⚡', sample: 'Electric guitar shredding!', category: 'motivational' },
  { id: 'blast', name: 'Blast Radius', type: 'premium', icon: '💣', sample: 'Explosions! Wake up now!', category: 'motivational' },
  { id: 'neon', name: 'Neon Pursuit', type: 'premium', icon: '🕶️', sample: 'Fast paced 80s synthwave.', category: 'motivational' },
];

const CATEGORIES = ['motivational', 'calm', 'funny'];

export default function AlarmClock() {
  const [time, setTime] = useState(new Date());
  
  // Premium / Login
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [customAudioMap, setCustomAudioMap] = useState({});
  const [activeAudioObj, setActiveAudioObj] = useState(null);

  // States
  const [alarmHours, setAlarmHours] = useState('06');
  const [alarmMinutes, setAlarmMinutes] = useState('00');
  const [alarmAmPm, setAlarmAmPm] = useState('AM');
  const [isAlarmActive, setIsAlarmActive] = useState(true);
  const [isRinging, setIsRinging] = useState(false);
  
  const [selectedVoice, setSelectedVoice] = useState(ALARM_VOICES[0].id);
  const [isMuted, setIsMuted] = useState(false);
  const [motivationState, setMotivationState] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  // Navigation State
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    try {
      const savedAudio = localStorage.getItem('eb28_custom_audio');
      if (savedAudio) setCustomAudioMap(JSON.parse(savedAudio));
    } catch (e) {
      console.warn('Failed to load custom audio', e);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now);
      checkAlarm(now);
    }, 1000);
    return () => clearInterval(timer);
  }, [alarmHours, alarmMinutes, alarmAmPm, isAlarmActive, isRinging]);

  const checkAlarm = (currentTime) => {
    if (!isAlarmActive || isRinging) return;
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
  };

  const stopAlarm = () => {
    setIsRinging(false);
    setIsAlarmActive(false);
    window.speechSynthesis.cancel();
    if (activeAudioObj) {
      activeAudioObj.pause();
      activeAudioObj.currentTime = 0;
      setActiveAudioObj(null);
    }
  };

  const playSample = (voiceId, e) => {
    if (e) e.stopPropagation();
    window.speechSynthesis.cancel();
    if (activeAudioObj) {
      activeAudioObj.pause();
      activeAudioObj.currentTime = 0;
    }
    if (customAudioMap[voiceId]) {
      const audio = new Audio(customAudioMap[voiceId]);
      audio.play().catch(err => console.error('Audio play failed', err));
      setActiveAudioObj(audio);
      return;
    }
    const voice = ALARM_VOICES.find(v => v.id === voiceId);
    if (voice) {
      const utterance = new SpeechSynthesisUtterance(voice.sample);
      utterance.rate = voice.id === 'jerky' ? 1.2 : 0.9;
      if (voice.id === 'nuclear') utterance.pitch = 0.5;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAudioUpload = (voiceId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert("Please upload a file smaller than 2MB.");
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Audio = event.target.result;
      const newMap = { ...customAudioMap, [voiceId]: base64Audio };
      setCustomAudioMap(newMap);
      try { localStorage.setItem('eb28_custom_audio', JSON.stringify(newMap)); } 
      catch (err) { alert("File too large for cache."); console.error(err); }
    };
    reader.readAsDataURL(file);
  };

  const handleVoiceSelect = (voice) => {
    if (voice.type === 'premium' && !isUnlocked) return setShowLogin(true);
    setSelectedVoice(voice.id);
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      setIsUnlocked(true); setShowLogin(false); setUsername(''); setPassword('');
    } else alert('Invalid credentials');
  };

  const cycleCategory = () => {
    const nextIdx = (activeCategoryIndex + 1) % CATEGORIES.length;
    setActiveCategoryIndex(nextIdx);
    setToastMessage(`Category: ${CATEGORIES[nextIdx].toUpperCase()}`);
    setTimeout(() => setToastMessage(''), 2000);
  };

  const formatHours = (date) => (date.getHours() % 12 || 12).toString().padStart(2, '0');
  const formatMinutes = (date) => date.getMinutes().toString().padStart(2, '0');
  const getAmPm = (date) => date.getHours() >= 12 ? 'PM' : 'AM';
  const displayDateStr = time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();

  // STYLES TO MATCH MOCKUP
  const globalFont = { fontFamily: '"Inter", sans-serif' };
  const clockFont = { fontFamily: '"Share Tech Mono", monospace' };
  const neonGlowBox = {
    boxShadow: '0 0 20px rgba(255, 30, 30, 0.4), inset 0 0 15px rgba(255, 30, 30, 0.3)',
    borderColor: '#ff2d2d'
  };
  const neonText = {
    color: '#ff2d2d',
    textShadow: '0 0 8px #ff2d2d, 0 0 20px #ff2d2d, 0 0 40px #ff0000',
  };
  const neonTextSoft = {
    color: '#ff2d2d',
    textShadow: '0 0 5px rgba(255, 45, 45, 0.8)',
  };

  const ContainerWrapper = ({ children }) => (
    <div className="relative w-full h-screen overflow-hidden bg-black flex justify-center items-center" style={globalFont}>
      {/* Background Image Base */}
      <div className="absolute inset-0 bg-[url('/synthwave-bg.png')] bg-cover bg-center bg-no-repeat opacity-80" />
      {/* Container constraints corresponding to phone screen mockup proportions */}
      <div className="relative w-full max-w-[440px] h-[95%] sm:h-[880px] sm:max-h-screen bg-black/40 backdrop-blur-[2px] rounded-[40px] overflow-hidden flex flex-col p-6 shadow-[0_0_50px_rgba(0,0,0,1)] border-4 border-slate-900 mx-auto">
        {children}
      </div>
      
      {toastMessage && (
        <div className="absolute top-10 bg-red-600 text-white px-6 py-2 rounded-full font-bold uppercase tracking-widest z-50 animate-bounce shadow-[0_0_15px_#ff0000]">
          {toastMessage}
        </div>
      )}
    </div>
  );

  if (showSettings) {
    return (
      <ContainerWrapper>
        <div className="flex-1 flex flex-col h-full animate-fade-in text-white/90">
          <div className="flex justify-between items-center mb-8 border-b-2 border-red-900/50 pb-4">
            <button onClick={() => setShowSettings(false)} className="text-red-500 hover:text-red-400 font-bold uppercase tracking-[0.2em] text-sm" style={neonTextSoft}>
              &#8592; BACK
            </button>
            <div className="text-right">
              <div className="text-[10px] text-red-500/70 font-bold uppercase tracking-[0.3em]">80S ALARM</div>
              <div className="text-2xl font-black uppercase tracking-widest" style={neonText}>SETTINGS</div>
            </div>
          </div>
          
          <h2 className="text-center font-black uppercase tracking-[0.25em] mb-4 text-sm" style={neonTextSoft}>MOTIVATOR AUDIO</h2>
          
          <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2 mb-6">
            {ALARM_VOICES.map((voice) => (
              <div key={voice.id} className="relative">
                <button 
                  onClick={() => handleVoiceSelect(voice)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all 
                   ${selectedVoice === voice.id ? 'bg-red-950/40 border-red-500 shadow-[0_0_15px_rgba(255,45,45,0.4)]' : 'bg-black/60 border-red-900/40 hover:border-red-600/60'}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl drop-shadow-[0_0_5px_#ffffff]">{voice.icon}</span>
                    <div className="flex flex-col text-left">
                      <span className={`font-bold tracking-widest text-sm ${selectedVoice === voice.id ? 'text-red-400' : 'text-slate-300'}`}>{voice.name}</span>
                      {(voice.type === 'premium' && !isUnlocked) && (
                        <span className="text-[10px] text-yellow-500 uppercase tracking-widest mt-0.5 flex items-center"><Lock className="w-3 h-3 mr-1"/> LOCKED</span>
                      )}
                    </div>
                  </div>
                  
                  <div onClick={(e) => playSample(voice.id, e)} className="p-2.5 rounded-full border border-red-900 hover:bg-red-900/30 text-red-500 transition-colors cursor-pointer">
                    <Volume2 className="w-4 h-4" />
                  </div>
                </button>
                {isUnlocked && selectedVoice === voice.id && (
                  <div className="mt-2 text-center pb-2">
                    <label className="text-[10px] text-red-400/80 uppercase tracking-widest cursor-pointer hover:text-red-300 border-b border-red-900 pb-1">
                      {customAudioMap[voice.id] ? 'Custom Audio Active (Click to Replace)' : 'Upload Custom Audio (.mp3)'}
                      <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleAudioUpload(voice.id, e)} />
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-auto border-t-2 border-red-900/50 pt-6 space-y-6 pb-2">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-red-500" style={neonTextSoft}>
              <span>VOLUME CONTROL</span>
              <input type="range" min="0" max="100" defaultValue="80" className="w-24 accent-red-500 cursor-pointer" />
            </div>
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-red-500" style={neonTextSoft}>
              <span>MUTE MODE</span>
              <button onClick={() => setIsMuted(!isMuted)} className={`w-12 h-6 rounded-full relative transition-colors ${isMuted ? 'bg-red-500' : 'bg-slate-700'}`}>
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${isMuted ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-red-500" style={neonTextSoft}>
              <span>CUSTOM PACKS</span>
              <span className="text-white hover:text-red-400 cursor-pointer tracking-widest">EXPLORE</span>
            </div>
          </div>
        </div>
      </ContainerWrapper>
    );
  }

  return (
    <ContainerWrapper>
      {/* Promo Notification Banner (if needed) */}
      {!isUnlocked && (
        <div className="absolute top-0 left-0 w-full bg-red-600 p-2 text-center text-white text-[10px] font-bold uppercase tracking-widest shadow-[0_0_15px_#ff0000] flex justify-center items-center gap-2 z-50">
          UNLOCK PREMIUM FOR $1/MO <button onClick={() => setShowLogin(true)} className="bg-black text-red-500 px-2 py-0.5 rounded ml-2 border border-red-600">SUBSCRIBE</button>
        </div>
      )}
      
      <div className="flex-1 flex flex-col pt-8">
        
        {/* CLOCK BLOCK EXACT MATCH */}
        <div 
          className="w-full border-2 rounded-3xl p-6 flex flex-col items-center justify-center relative bg-black/40 backdrop-blur-sm shadow-[0_0_30px_rgba(255,0,0,0.3),inset_0_0_20px_rgba(255,0,0,0.2)]"
          style={{ borderColor: '#ff2d2d' }}
        >
          <div className="text-[12px] font-bold tracking-[0.25em] uppercase text-white/90 mb-1 drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">
            {displayDateStr}
          </div>
          
          <div className="flex items-baseline relative mt-2" style={clockFont}>
            <div className="text-[6.5rem] leading-[0.8] tracking-widest" style={neonText}>
              {formatHours(time)}
              <span className={`mx-0.5 ${time.getSeconds() % 2 === 0 ? 'opacity-100' : 'opacity-40'}`}>:</span>
              {formatMinutes(time)}
            </div>
            <div className="text-xl font-black mt-auto mb-3 ml-2 tracking-widest" style={neonText}>
              {getAmPm(time)}
            </div>
          </div>
        </div>
        
        {/* MIDDLE CONTROLS ROW */}
        <div className="flex w-full mt-6 justify-between items-center px-1">
          {/* Left Block */}
          <div className="flex flex-col items-center gap-1.5 w-1/4">
             <div className="text-[8px] font-black uppercase tracking-[0.15em] text-red-500/90 drop-shadow-[0_0_3px_#ff0000]">
               ALARM: {alarmHours}:{alarmMinutes} {alarmAmPm}
             </div>
             <div className="flex items-center gap-1.5">
               <button onClick={() => setIsAlarmActive(!isAlarmActive)} className="w-8 h-4 bg-slate-800 rounded-full relative shadow-[0_0_5px_#ff0000]">
                 <div className={`w-3 h-3 rounded-full bg-red-500 shadow-[0_0_5px_#ff0000] absolute top-0.5 transition-all ${isAlarmActive ? 'right-0.5' : 'left-0.5'}`} />
               </button>
               <span className="text-[8px] font-black uppercase tracking-widest text-red-500/80">{isAlarmActive ? 'ON' : 'OFF'}</span>
             </div>
          </div>

          {/* Center SNOOZE Pill */}
          <div className="flex-1 flex justify-center">
             <button 
               onClick={() => isRinging ? stopAlarm() : null}
               className={`border-[2.5px] rounded-full px-8 py-2.5 transition-all flex justify-center items-center shadow-[0_0_15px_rgba(255,0,0,0.4),inset_0_0_10px_rgba(255,0,0,0.4)]
               ${isRinging ? 'bg-red-600 animate-pulse text-white' : 'bg-black/40 hover:bg-red-950/50'}`}
               style={{ borderColor: '#ff2d2d' }}
             >
               <span className="text-base font-black uppercase tracking-[0.25em]" style={isRinging ? {} : neonText}>
                 SNOOZE
               </span>
             </button>
          </div>
          
          {/* Right Block */}
          <div className="flex flex-col items-center gap-2 w-1/4">
             <div className="flex items-center justify-between w-full">
               <span className="text-[7.5px] font-black uppercase tracking-[0.1em] text-red-500/80">MOTIVATION:</span>
               <button onClick={() => setMotivationState(!motivationState)} className="w-5 h-2.5 bg-slate-800 rounded-full relative shadow-[0_0_3px_#ff0000]">
                 <div className={`w-2 h-2 rounded-full bg-red-500 absolute transition-all ${motivationState ? 'right-px' : 'left-px'} top-[1px]`} />
               </button>
             </div>
             <div className="flex items-center justify-between w-full">
               <span className="text-[7.5px] font-black uppercase tracking-[0.1em] text-red-500/80">VOLUME:</span>
               <button onClick={() => setIsMuted(!isMuted)} className="w-5 h-2.5 bg-slate-800 rounded-full relative shadow-[0_0_3px_#ff0000]">
                 <div className={`w-2 h-2 rounded-full bg-red-500 absolute transition-all ${!isMuted ? 'right-px' : 'left-px'} top-[1px]`} />
               </button>
             </div>
          </div>
        </div>

        {/* IS RINGING OVERLAY (if active, covers motivation box optionally) */}
        {isRinging && (
           <div className="mt-8 relative w-full border-2 rounded-3xl p-6 bg-red-600/30 backdrop-blur-md flex flex-col justify-center items-center z-20 shadow-[0_0_50px_#ff0000,inset_0_0_30px_#ff0000]" style={{ borderColor: '#ff2d2d' }}>
             <BellRing className="w-16 h-16 text-white animate-bounce drop-shadow-[0_0_20px_#ff0000]" />
             <div className="text-3xl font-black mt-4 text-white uppercase tracking-[0.2em] drop-shadow-[0_0_15px_#ff0000]">WAKE UP!</div>
           </div>
        )}

        {/* MOTIVATION TEXT BOX EXACT MATCH */}
        {!isRinging && (
          <div className="mt-7 w-full border-2 rounded-[2rem] p-6 relative bg-black/50 backdrop-blur-sm flex-1 mb-2" style={neonGlowBox}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black/80 px-4 rounded-full border border-red-500 shadow-[0_0_10px_#ff0000] whitespace-nowrap">
              <span className="text-[12px] font-bold tracking-[0.15em] uppercase text-white/90 drop-shadow-[0_0_5px_#ff0000]">WAKE UP LIKE A CHAMPION</span>
            </div>

            <div className="flex flex-col items-center justify-center h-full text-center space-y-3.5 mt-2">
               <div className="text-[15px] font-black tracking-[0.25em] uppercase" style={neonText}>RISE & GRIND!</div>
               <div className="text-[15px] font-black tracking-[0.25em] uppercase" style={neonText}>STAY HUNGRY</div>
               <div className="text-[15px] font-black tracking-[0.25em] uppercase" style={neonText}>EMBRACE THE DAY</div>
               <div className="text-[15px] font-black tracking-[0.25em] uppercase" style={neonText}>YOUR GOALS WAIT</div>
            </div>
          </div>
        )}

        {/* BOTTOM NAVIGATION FIXED POSITION INSIDE PHONE SCREEN */}
        <div className="mt-auto mb-2 w-full flex justify-between items-center px-6">
          <button onClick={() => setShowSettings(true)} className="p-3 bg-black/60 border border-red-900 rounded-full hover:bg-black/80 transition-all text-red-500 hover:text-red-400 shadow-[0_0_10px_rgba(255,0,0,0.3)]">
            <Settings className="w-6 h-6 drop-shadow-[0_0_5px_#ff0000]" />
          </button>
          
          <button onClick={cycleCategory} className="p-3 bg-black/60 border border-red-900 rounded-lg w-16 flex justify-center items-center hover:bg-black/80 transition-all text-red-500 hover:text-red-400 shadow-[0_0_10px_rgba(255,0,0,0.3)]">
            <List className="w-7 h-7 drop-shadow-[0_0_5px_#ff0000]" />
          </button>
          
          <button onClick={() => setShowLogin(true)} className="p-3 bg-black/60 border border-red-900 rounded-full hover:bg-black/80 transition-all text-red-500 hover:text-red-400 shadow-[0_0_10px_rgba(255,0,0,0.3)]">
            <User className="w-6 h-6 drop-shadow-[0_0_5px_#ff0000]" />
          </button>
        </div>

      </div>

      {/* LOGIN OVERLAY */}
      {showLogin && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-black/90 border-2 border-red-500 rounded-2xl w-full max-w-[320px] p-6 shadow-[0_0_40px_rgba(255,0,0,0.5)] relative">
            <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-red-500 hover:text-red-300 font-bold">✕</button>
            <h2 className="text-xl font-black uppercase tracking-[0.1em] text-white flex items-center mb-2" style={neonText}><Lock className="w-5 h-5 mr-2"/> ADMIN LOGIN</h2>
            <p className="text-[10px] text-red-400 mb-6 uppercase tracking-widest">Access custom sounds & motivation packs.</p>
            
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] text-red-500 font-bold tracking-widest mb-1 uppercase">Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-black border border-red-900 focus:border-red-500 rounded px-3 py-2 text-white outline-none shadow-[inset_0_0_10px_rgba(255,0,0,0.2)]" autoFocus />
              </div>
              <div>
                <label className="block text-[10px] text-red-500 font-bold tracking-widest mb-1 uppercase">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black border border-red-900 focus:border-red-500 rounded px-3 py-2 text-white outline-none shadow-[inset_0_0_10px_rgba(255,0,0,0.2)]" />
              </div>
              <button type="submit" className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest rounded transition-all mt-4 shadow-[0_0_20px_rgba(255,0,0,0.6)]">UNLOCK</button>
            </form>
          </div>
        </div>
      )}
    </ContainerWrapper>
  );
}
