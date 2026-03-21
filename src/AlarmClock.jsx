import React, { useState, useEffect } from 'react';
import { Settings, User, List, Lock, BellRing, Volume2 } from 'lucide-react';

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
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [customAudioMap, setCustomAudioMap] = useState({});
  const [activeAudioObj, setActiveAudioObj] = useState(null);

  const [alarmHours, setAlarmHours] = useState('06');
  const [alarmMinutes, setAlarmMinutes] = useState('00');
  const [alarmAmPm, setAlarmAmPm] = useState('AM');
  const [isAlarmActive, setIsAlarmActive] = useState(true);
  const [isRinging, setIsRinging] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(ALARM_VOICES[0].id);
  const [isMuted, setIsMuted] = useState(false);
  const [motivationState, setMotivationState] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    try {
      const savedAudio = localStorage.getItem('eb28_custom_audio');
      if (savedAudio) setCustomAudioMap(JSON.parse(savedAudio));
    } catch (e) {
       console.warn('Failed to load storage', e);
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

  const cycleCategory = () => {
    const nextIdx = (activeCategoryIndex + 1) % CATEGORIES.length;
    setActiveCategoryIndex(nextIdx);
    setToastMessage(`Category: ${CATEGORIES[nextIdx].toUpperCase()}`);
    setTimeout(() => setToastMessage(''), 2000);
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      setIsUnlocked(true); setShowLogin(false); setUsername(''); setPassword('');
    } else alert('Invalid credentials');
  };

  const formatHours = (date) => (date.getHours() % 12 || 12).toString().padStart(2, '0');
  const formatMinutes = (date) => date.getMinutes().toString().padStart(2, '0');
  const getAmPm = (date) => date.getHours() >= 12 ? 'PM' : 'AM';
  const displayDateStr = time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
  const displayDateStrFull = time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();

  // PRECISE STYLES
  const colorNeon = '#ff4444';
  const colorNeonBright = '#ff6b6b';
  const colorNeonDark = '#a01212';
  
  const neonBorderStyle = {
    borderColor: colorNeon,
    boxShadow: `0 0 10px rgba(255, 68, 68, 0.4), inset 0 0 10px rgba(255, 68, 68, 0.2)`
  };
  const neonTextStyle = {
    color: colorNeonBright,
    textShadow: `0 0 5px ${colorNeon}, 0 0 10px ${colorNeon}`,
    letterSpacing: '0.15em',
    fontWeight: '800',
    fontFamily: '"Inter", sans-serif'
  };
  const neonTextSoft = {
    color: colorNeon,
    textShadow: `0 0 4px ${colorNeonDark}`,
    letterSpacing: '0.1em',
    fontWeight: '700',
    fontFamily: '"Inter", sans-serif'
  };
  const digitalFont = {
    fontFamily: '"DSEG7Classic", "Orbitron", monospace',
    color: colorNeonBright,
    textShadow: `0 0 8px ${colorNeon}, 0 0 15px ${colorNeon}, 0 0 25px ${colorNeonDark}`,
    WebkitTextStroke: `2px ${colorNeon}`
  };
  
  const digitalFontSmall = {
    fontFamily: '"DSEG7Classic", "Orbitron", monospace',
    color: colorNeonBright,
    textShadow: `0 0 5px ${colorNeon}, 0 0 10px ${colorNeonDark}`,
    WebkitTextStroke: `1px ${colorNeon}`
  };

  return (
    <div className="relative w-full overflow-hidden min-h-screen bg-black flex justify-center items-center" style={{ fontFamily: '"Inter", sans-serif' }}>
      
      {/* Import Inter and reliable DSEG7 Classic font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&family=Orbitron:wght@700;900&display=swap');
        @font-face {
          font-family: 'DSEG7Classic';
          src: url('https://cdn.jsdelivr.net/npm/dseg@0.46.0/fonts/DSEG7-Classic/DSEG7Classic-Regular.woff2') format('woff2');
        }
        .custom-squircle { border-radius: 14px; }
      `}</style>

      {/* Background synthwave image */}
      <div className="fixed inset-0 bg-[url('/synthwave-bg.png')] bg-cover bg-center bg-no-repeat opacity-90" />
      
      {/* Phone container mockup boundaries */}
      <div className="relative w-full h-[100dvh] md:max-w-[420px] md:h-[880px] bg-black/40 backdrop-blur-[3px] md:rounded-[45px] md:border-4 border-slate-900 shadow-[0_0_50px_#000] flex flex-col mx-auto overflow-hidden">
        
        {/* TOP STATUS/PREMIUM BAR */}
        {!isUnlocked && (
          <div className="w-full bg-[#e63946] pt-[env(safe-area-inset-top,20px)] pb-2 px-5 flex justify-center items-center rounded-b-2xl shadow-[0_5px_15px_rgba(255,0,0,0.4)] z-50">
            <span className="text-white text-[9px] font-black tracking-[0.1em] uppercase shadow-sm">
              UNLOCK PREMIUM FOR $1/MO 
            </span>
            <button onClick={() => setShowLogin(true)} className="ml-3 bg-[#111] text-[#e63946] text-[8px] font-black px-3 py-1.5 rounded uppercase tracking-[0.2em] shadow-[0_0_5px_rgba(0,0,0,0.5)] cursor-pointer">
              SUBSCRIBE
            </button>
          </div>
        )}

        <div className="flex-1 flex flex-col px-5 pt-8 pb-8 w-full relative">
          
          {/* TOAST SYSTEM */}
          {toastMessage && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-[#ff2222]/90 backdrop-blur text-white px-6 py-2 rounded-full font-bold uppercase tracking-widest z-[60] animate-bounce shadow-[0_0_20px_#ff0000] text-[10px]">
              {toastMessage}
            </div>
          )}

          {/* VIEW ROUTER */}
          {showSettings ? (
            /* EXACT SETTINGS MODAL MATCH */
            <div className="flex-1 flex flex-col animate-fade-in z-10 w-full h-full pb-[20px]">
              <div className="flex justify-between items-start mb-10 border-b border-red-900/50 pb-5">
                <button onClick={() => setShowSettings(false)} className="text-[#ff5555] hover:text-[#fff] font-bold uppercase tracking-[0.2em] text-[10px] pt-1 transition-colors drop-shadow-[0_0_5px_#ff0000]">
                  &larr; BACK
                </button>
                <div className="text-right flex flex-col items-end">
                  <span className="text-[9px] text-[#ff4444]/80 font-bold uppercase tracking-[0.3em] mb-1">80S ALARM</span>
                  <span className="text-[24px] font-black uppercase tracking-[0.2em]" style={neonTextStyle}>SETTINGS</span>
                </div>
              </div>
              
              <h2 className="text-center font-black uppercase tracking-[0.2em] mb-6 text-[11px]" style={neonTextStyle}>MOTIVATOR AUDIO</h2>
              
              <div className="space-y-4 flex-1 overflow-y-auto pr-2 pb-6">
                {ALARM_VOICES.map((voice) => (
                  <div key={voice.id} className="relative flex flex-col mb-1 group">
                    <button 
                      onClick={() => {
                        if (voice.type === 'premium' && !isUnlocked) setShowLogin(true);
                        else setSelectedVoice(voice.id);
                      }}
                      className="w-full relative flex items-center justify-between p-4 rounded-[18px] border-[1.5px] transition-all bg-[#0a0000]/70"
                      style={selectedVoice === voice.id ? neonBorderStyle : { borderColor: 'rgba(255,45,45,0.2)' }}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]">{voice.icon}</span>
                        <div className="flex flex-col text-left">
                          <span className="font-bold tracking-[0.15em] text-[13px] text-[#ff5555] drop-shadow-[0_0_4px_#ff0000]">
                            {voice.name}
                          </span>
                          {(voice.type === 'premium' && !isUnlocked) && (
                            <span className="text-[8px] text-[#ffcc00] font-black uppercase tracking-[0.2em] mt-1 drop-shadow-[0_0_3px_#ffcc00]">
                              <Lock className="w-2.5 h-2.5 inline mr-1 -mt-0.5"/> LOCKED
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-[34px] h-[34px] rounded-full border-[1.5px] border-[#ff2222]/50 flex justify-center items-center text-[#ff4444] hover:bg-[#ff3030]/20 transition-all cursor-pointer shadow-[inset_0_0_8px_rgba(255,0,0,0.3)]">
                        <Volume2 className="w-[15px] h-[15px] drop-shadow-[0_0_3px_#ff0000]" />
                      </div>
                    </button>
                    {isUnlocked && selectedVoice === voice.id && (
                       <label className="text-[9px] text-[#ff6666] uppercase tracking-[0.1em] cursor-pointer hover:text-white mt-1 pt-2 pb-1 text-center w-full transition-colors drop-shadow-[0_0_3px_#ff0000]">
                         {customAudioMap[voice.id] ? '(Custom Audio Active - Click to Replace)' : '+ Upload Custom Optional Audio'}
                         <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleAudioUpload(voice.id, e)} />
                       </label>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-auto border-t border-red-900/50 pt-5 space-y-6 pb-2 w-full px-2">
                <div className="flex justify-between items-center w-full">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#ff5555] drop-shadow-[0_0_3px_#ff0000]">VOLUME CONTROL</span>
                  <input type="range" min="0" max="100" defaultValue="80" className="w-[120px] h-2 bg-[#4a0a0a] rounded-lg appearance-none cursor-pointer accent-[#ff3333] shadow-[0_0_5px_#ff0000]" />
                </div>
                <div className="flex justify-between items-center w-full">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#ff5555] drop-shadow-[0_0_3px_#ff0000]">MUTE MODE</span>
                  <button onClick={() => setIsMuted(!isMuted)} className={`w-[44px] h-[24px] rounded-full relative transition-all shadow-[0_0_8px_#ff0000_inset] border border-[#ff3333]/50 ${isMuted ? 'bg-[#ff3333]' : 'bg-[#111]'}`}>
                    <div className={`w-[18px] h-[18px] rounded-full bg-white absolute top-[2px] transition-all shadow-md ${isMuted ? 'right-[2px]' : 'left-[2px]'}`} />
                  </button>
                </div>
                <div className="flex justify-between items-center w-full pt-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#ff5555] drop-shadow-[0_0_3px_#ff0000]">CUSTOM PACKS</span>
                  <span className="text-[10px] text-white font-black hover:text-[#ff3333] cursor-pointer tracking-[0.2em] uppercase drop-shadow-[0_0_2px_#fff]">EXPLORE</span>
                </div>
              </div>
            </div>
          ) : (
            /* EXACT MAIN PAGE MOCKUP MATCH */
            <div className="flex flex-col flex-1 z-10 w-full items-center relative h-full">
              
              {/* CLOCK BOX - Precisely aligned to mockup */}
              <div className="w-full relative border-[2px] rounded-[30px] p-6 lg:p-7 flex flex-col items-center justify-center bg-[#0d0202]/60 backdrop-blur-[2px]" style={neonBorderStyle}>
                 <div className="text-[10px] lg:text-[11px] font-black tracking-[0.2em] text-[#fff] uppercase mb-4 drop-shadow-[0_0_4px_#fff]">
                   {displayDateStrFull}
                 </div>
                 
                 <div className="flex items-end w-full justify-center">
                   <div className="leading-[0.8] mb-1 z-10" style={{ ...digitalFont, fontSize: 'min(7rem, 28vw)' }}>
                     {formatHours(time)}
                     <span className={`mx-0.5 ${time.getSeconds() % 2 === 0 ? 'opacity-100' : 'opacity-[0.15]'}`}>:</span>
                     {formatMinutes(time)}
                   </div>
                   <div className="mb-2 ml-1 z-10" style={{ ...digitalFontSmall, fontSize: 'min(2rem, 8vw)' }}>
                     {getAmPm(time)}
                   </div>
                 </div>
              </div>

              {/* MIDDLE ROW (ALARM / SNOOZE / TOGGLES) */}
              <div className="w-full flex justify-between items-center mt-6 px-1">
                 {/* Left Column */}
                 <div className="flex flex-col w-[30%] gap-2 items-start pl-1">
                    <span className="text-[7.5px] lg:text-[8px] text-[#ff4444] font-black tracking-[0.15em] uppercase whitespace-nowrap" style={{textShadow: '0 0 4px #ff0000'}}>
                      ALARM: {alarmHours}:{alarmMinutes} {alarmAmPm}
                    </span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setIsAlarmActive(!isAlarmActive)} className={`w-[26px] h-[14px] rounded-full relative transition-all border border-red-900 ${isAlarmActive ? 'bg-[#ff3333]' : 'bg-[#111]'}`}>
                        <div className={`w-[10px] h-[10px] rounded-full bg-white absolute top-[1px] transition-all shadow-[0_0_3px_#000] ${isAlarmActive ? 'right-[1px]' : 'left-[1px]'}`} />
                      </button>
                      <span className="text-[7.5px] font-black text-[#ff4444] tracking-[0.15em] uppercase">ON</span>
                    </div>
                 </div>

                 {/* Center Pill - Thick Hollow Glow */}
                 <div className="flex-1 flex justify-center min-w-max mx-2">
                    <button 
                      onClick={() => isRinging ? stopAlarm() : null}
                      className="border-[2px] rounded-[30px] px-8 py-3 bg-[#0a0000]/60 transition-transform active:scale-95"
                      style={neonBorderStyle}
                    >
                      <span className="text-[14px] font-black tracking-[0.3em] uppercase" style={neonTextStyle}>
                        {isRinging ? 'STOP' : 'SNOOZE'}
                      </span>
                    </button>
                 </div>

                 {/* Right Column */}
                 <div className="flex flex-col w-[30%] gap-2 items-end pr-1">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-[7.5px] text-[#ff4444] font-black tracking-[0.1em] uppercase" style={{textShadow: '0 0 4px #ff0000'}}>MOTIVATION:</span>
                      <button onClick={() => setMotivationState(!motivationState)} className={`w-[26px] h-[14px] rounded-full relative transition-all border border-red-900 ${motivationState ? 'bg-[#ff3333]' : 'bg-[#111]'}`}>
                        <div className={`w-[10px] h-[10px] rounded-full bg-white absolute top-[1px] transition-all ${motivationState ? 'right-[1px]' : 'left-[1px]'}`} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-[7.5px] text-[#ff4444] font-black tracking-[0.1em] uppercase" style={{textShadow: '0 0 4px #ff0000'}}>VOLUME:</span>
                      <button onClick={() => setIsMuted(!isMuted)} className={`w-[26px] h-[14px] rounded-full relative transition-all border border-red-900 ${!isMuted ? 'bg-[#ff3333]' : 'bg-[#111]'}`}>
                        <div className={`w-[10px] h-[10px] rounded-full bg-white absolute top-[1px] transition-all ${!isMuted ? 'right-[1px]' : 'left-[1px]'}`} />
                      </button>
                    </div>
                 </div>
              </div>

              {/* MOTIVATION BOX */}
              {isRinging ? (
                <div className="mt-8 relative w-full border-[2px] rounded-[30px] p-6 bg-[#aa0000]/40 backdrop-blur-md flex flex-col justify-center items-center flex-1" style={neonBorderStyle}>
                  <BellRing className="w-20 h-20 text-[#fff] animate-ping drop-shadow-[0_0_25px_#ff0000]" />
                  <div className="text-4xl font-black mt-6 text-white uppercase tracking-[0.2em] drop-shadow-[0_0_20px_#ff0000]">WAKE UP!</div>
                </div>
              ) : (
                <div className="mt-8 w-full relative border-[2px] rounded-[32px] flex flex-col items-center justify-between flex-1 bg-[#0d0202]/60 text-center px-4 py-8 mb-20" style={neonBorderStyle}>
                  
                  {/* Floating Title intersecting border exactly */}
                  <div className="absolute -top-[14px] left-1/2 -translate-x-1/2 border-[2px] border-[#ff2222] bg-[#0c0303] rounded-full px-5 py-[-2px] whitespace-nowrap z-20 shadow-[0_0_8px_rgba(255,0,0,0.4)] flex items-center justify-center min-h-[26px]">
                    <span className="text-[10px] font-black tracking-[0.15em] uppercase text-white drop-shadow-[0_0_3px_#fff] pb-0.5">
                      WAKE UP LIKE A CHAMPION
                    </span>
                  </div>

                  <div className="w-full flex-1 flex flex-col justify-evenly items-center my-4 h-full">
                    <span className="text-[13px] md:text-[15px] font-black tracking-[0.3em] uppercase" style={neonTextStyle}>RISE & GRIND!</span>
                    <span className="text-[13px] md:text-[15px] font-black tracking-[0.3em] uppercase" style={neonTextStyle}>STAY HUNGRY</span>
                    <span className="text-[13px] md:text-[15px] font-black tracking-[0.3em] uppercase" style={neonTextStyle}>EMBRACE THE DAY</span>
                    <span className="text-[13px] md:text-[15px] font-black tracking-[0.3em] uppercase" style={neonTextStyle}>YOUR GOALS WAIT</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM NAV TABS (FLOATING OVER BACKGROUND, Absolute to phone container) */}
        {!showLogin && !showSettings && (
          <div className="absolute bottom-[28px] left-0 w-full flex justify-between items-center px-12 z-20 pb-[env(safe-area-inset-bottom,0px)]">
            <button onClick={() => setShowSettings(true)} className="w-[50px] h-[50px] rounded-full border-[2px] bg-[#0c0303]/80 flex justify-center items-center hover:bg-[#ff4444]/30 transition-all text-[#ff4444]" style={neonBorderStyle}>
              <Settings className="w-[20px] h-[20px] drop-shadow-[0_0_5px_#ff0000]" />
            </button>
            <button onClick={cycleCategory} className="w-[65px] h-[48px] custom-squircle border-[2px] bg-[#0c0303]/80 flex justify-center items-center hover:bg-[#ff4444]/30 transition-all text-[#ff4444]" style={neonBorderStyle}>
              <List className="w-[24px] h-[24px] drop-shadow-[0_0_5px_#ff0000]" />
            </button>
            <button onClick={() => setShowLogin(true)} className="w-[50px] h-[50px] rounded-full border-[2px] bg-[#0c0303]/80 flex justify-center items-center hover:bg-[#ff4444]/30 transition-all text-[#ff4444]" style={neonBorderStyle}>
              <User className="w-[20px] h-[20px] drop-shadow-[0_0_5px_#ff0000]" />
            </button>
          </div>
        )}

      </div>

      {/* LOGIN OVERLAY */}
      {showLogin && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-[#050000] border-[2px] border-[#ff3333] rounded-[24px] w-full max-w-[320px] p-6 shadow-[0_0_40px_rgba(255,0,0,0.5)] relative">
            <button onClick={() => setShowLogin(false)} className="absolute top-4 right-5 text-[#ff4444] hover:text-white font-bold text-lg drop-shadow-[0_0_5px_#ff0000]">✕</button>
            <h2 className="text-lg font-black uppercase tracking-[0.1em] text-white flex items-center mb-1 drop-shadow-[0_0_4px_#ffffff]"><Lock className="w-4 h-4 mr-2 text-[#ff4444]"/> ADMIN LOGIN</h2>
            <p className="text-[9px] text-[#ff5555] font-bold mb-6 uppercase tracking-[0.15em] drop-shadow-[0_0_2px_#ff0000]">Access custom sounds & packs.</p>
            
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] text-[#ff4444] font-black tracking-[0.15em] mb-1.5 uppercase drop-shadow-[0_0_3px_#ff0000]">Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-[#0a0000] border border-red-900 focus:border-[#ff4444] rounded-xl px-4 py-3 text-white outline-none shadow-[inset_0_0_15px_rgba(255,0,0,0.3)] transition-all font-['Inter'] font-bold tracking-widest" autoFocus />
              </div>
              <div>
                <label className="block text-[10px] text-[#ff4444] font-black tracking-[0.15em] mb-1.5 uppercase drop-shadow-[0_0_3px_#ff0000]">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#0a0000] border border-red-900 focus:border-[#ff4444] rounded-xl px-4 py-3 text-white outline-none shadow-[inset_0_0_15px_rgba(255,0,0,0.3)] transition-all font-['Inter'] font-bold tracking-widest" />
              </div>
              <button type="submit" className="w-full py-4 bg-[#ff3333] hover:bg-red-500 text-white font-black uppercase tracking-[0.2em] rounded-xl transition-all mt-6 shadow-[0_0_25px_rgba(255,0,0,0.6)]">UNLOCK</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
