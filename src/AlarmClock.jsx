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
  const displayDateStr = time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();

  // STYLES TO PERFECTLY MATCH THE IMAGE
  const neonBorderStyle = {
    borderColor: '#ff1f1f',
    boxShadow: '0 0 8px rgba(255, 30, 30, 0.4), inset 0 0 8px rgba(255, 30, 30, 0.4)'
  };
  const neonTextStyle = {
    color: '#ff3030',
    textShadow: '0 0 4px #ff3030, 0 0 8px #ff0000',
    letterSpacing: '0.15em',
    fontWeight: '800',
    fontFamily: '"Inter", sans-serif'
  };
  const digitalFont = {
    fontFamily: '"Digital-7 Mono", "Digital-7", "Share Tech Mono", monospace',
    color: '#ff2525',
    textShadow: '0 0 10px #ff0000, 0 0 20px #ff0000, 0 0 40px #ff0000'
  };

  return (
    <div className="relative w-full min-h-screen bg-black flex justify-center items-center overflow-x-hidden" style={{ fontFamily: '"Inter", sans-serif' }}>
      
      {/* Import Inter and Digital-7 fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap');
        @import url('https://fonts.cdnfonts.com/css/digital-7-mono');
        .squircle { border-radius: 12px; }
      `}</style>

      {/* Background synthwave image */}
      <div className="fixed inset-0 bg-[url('/synthwave-bg.png')] bg-cover bg-center bg-no-repeat opacity-80" />
      
      {/* Phone container mockup boundaries */}
      <div className="relative w-full h-[100dvh] md:max-w-[420px] md:h-[850px] bg-black/50 backdrop-blur-[2px] md:rounded-[40px] border-y-0 md:border-2 border-slate-800 shadow-[0_0_30px_#000] flex flex-col mx-auto overflow-hidden">
        
        {/* TOP STATUS/PREMIUM BAR */}
        {!isUnlocked && (
          <div className="w-full bg-[#ef4444] pt-[env(safe-area-inset-top,10px)] pb-3 px-4 flex justify-between items-center shadow-[0_2px_15px_#ff0000] z-20" style={{borderBottomRightRadius: '10px', borderBottomLeftRadius: '10px'}}>
            <div className="w-full text-center">
              <span className="text-white text-[10px] font-bold tracking-[0.1em] uppercase shadow-sm">
                UNLOCK PREMIUM FOR $1/MO 
              </span>
              <button onClick={() => setShowLogin(true)} className="ml-2 bg-black text-[#ef4444] text-[9px] font-black px-2 py-1 rounded tracking-widest shadow-inner">
                SUBSCRIBE
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col px-5 pt-6 pb-6 w-full">
          
          {/* TOAST SYSTEM */}
          {toastMessage && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-600/90 backdrop-blur text-white px-6 py-2 rounded-full font-bold uppercase tracking-widest z-50 animate-bounce shadow-[0_0_15px_#ff0000] text-xs">
              {toastMessage}
            </div>
          )}

          {/* VIEW ROUTER */}
          {showSettings ? (
            /* EXACT SETTINGS MODAL MATCH */
            <div className="flex-1 flex flex-col animate-fade-in z-10 w-full h-full pb-[80px]">
              <div className="flex justify-between items-start mb-8 border-b border-red-900/40 pb-4">
                <button onClick={() => setShowSettings(false)} className="text-[#ff3030] hover:text-red-400 font-bold uppercase tracking-[0.2em] text-[11px] pt-1" style={neonTextStyle}>
                  &larr; BACK
                </button>
                <div className="text-right flex flex-col items-end">
                  <span className="text-[9px] text-red-500/80 font-bold uppercase tracking-[0.3em] mb-1">80S ALARM</span>
                  <span className="text-[22px] font-black uppercase tracking-[0.2em]" style={neonTextStyle}>SETTINGS</span>
                </div>
              </div>
              
              <h2 className="text-center font-black uppercase tracking-[0.2em] mb-4 text-[12px]" style={neonTextStyle}>MOTIVATOR AUDIO</h2>
              
              <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1 mb-6">
                {ALARM_VOICES.map((voice) => (
                  <button 
                    key={voice.id}
                    onClick={() => {
                       if (voice.type === 'premium' && !isUnlocked) setShowLogin(true);
                       else setSelectedVoice(voice.id);
                    }}
                    className="w-full relative flex items-center justify-between p-4 rounded-[16px] border-[1.5px] transition-all group bg-black/60"
                    style={selectedVoice === voice.id ? neonBorderStyle : { borderColor: 'rgba(255,45,45,0.3)' }}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">{voice.icon}</span>
                      <div className="flex flex-col text-left">
                        <span className="font-bold tracking-[0.1em] text-[13px] text-[#ff3030] group-hover:drop-shadow-[0_0_5px_#ff0000] transition-all">
                          {voice.name}
                        </span>
                        {(voice.type === 'premium' && !isUnlocked) && (
                          <span className="text-[9px] text-[#ffaa00] font-black uppercase tracking-[0.2em] mt-1 drop-shadow-[0_0_2px_#ffaa00]">
                            <Lock className="w-2 h-2 inline mr-1 -mt-0.5"/> LOCKED
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full border border-red-700 flex justify-center items-center text-[#ff3030] hover:bg-[#ff3030]/20 transition-all">
                      <Volume2 className="w-[14px] h-[14px]" />
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-auto border-t border-red-900/40 pt-5 space-y-5 pb-2 w-full px-2">
                <div className="flex justify-between items-center w-full">
                  <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#ff3030]">VOLUME CONTROL</span>
                  <input type="range" min="0" max="100" defaultValue="80" className="w-[100px] h-1.5 bg-red-900 rounded-lg appearance-none cursor-pointer accent-[#ff3030]" />
                </div>
                <div className="flex justify-between items-center w-full">
                  <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#ff3030]">MUTE MODE</span>
                  <button onClick={() => setIsMuted(!isMuted)} className={`w-[40px] h-[22px] rounded-full relative transition-all shadow-[0_0_5px_#ff0000_inset] ${isMuted ? 'bg-[#ff3030]' : 'bg-[#1a1a1a] border border-red-900'}`}>
                    <div className={`w-[16px] h-[16px] rounded-full bg-white absolute top-[2px] transition-all shadow-md ${isMuted ? 'right-[3px]' : 'left-[3px]'}`} />
                  </button>
                </div>
                <div className="flex justify-between items-center w-full pt-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#ff3030]">CUSTOM PACKS</span>
                  <span className="text-[10px] text-white font-black hover:text-red-400 cursor-pointer tracking-[0.2em] uppercase">EXPLORE</span>
                </div>
              </div>
            </div>
          ) : (
            /* EXACT MAIN PAGE MOCKUP MATCH */
            <div className="flex flex-col flex-1 z-10 w-full items-center relative h-full">
              
              {/* CLOCK BOX */}
              <div className="w-full relative border-[2px] rounded-[30px] p-6 lg:p-8 flex flex-col items-center justify-center bg-[#0a0000]/40 backdrop-blur-[1px]" style={neonBorderStyle}>
                 <div className="text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-[#ffffff] uppercase mb-1 drop-shadow-md">
                   {displayDateStr}
                 </div>
                 <div className="flex items-baseline w-full justify-center mt-[-5px]">
                   <div className="leading-none text-[6.5rem] md:text-[7.5rem] tracking-tight" style={digitalFont}>
                     {formatHours(time)}
                     <span className={`mx-0.5 ${time.getSeconds() % 2 === 0 ? 'opacity-100' : 'opacity-[0.25]'}`}>:</span>
                     {formatMinutes(time)}
                   </div>
                   <div className="text-[1.8rem] ml-1 mb-5" style={digitalFont}>
                     {getAmPm(time)}
                   </div>
                 </div>
              </div>

              {/* MIDDLE ROW (ALARM / SNOOZE / TOGGLES) */}
              <div className="w-full flex justify-between items-center mt-4 px-1">
                 {/* Left Column */}
                 <div className="flex flex-col w-[30%] gap-1.5">
                    <span className="text-[7.5px] whitespace-nowrap lg:text-[8px] text-[#ff3030] font-black tracking-[0.15em] uppercase" style={{textShadow: '0 0 5px #ff0000'}}>
                      ALARM: {alarmHours}:{alarmMinutes} {alarmAmPm}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setIsAlarmActive(!isAlarmActive)} className={`w-8 h-4 rounded-full relative transition-all ${isAlarmActive ? 'bg-[#ff3030]' : 'bg-[#1a1a1a] border border-red-900'}`}>
                        <div className={`w-3 h-3 rounded-full bg-white absolute top-[2px] transition-all shadow-[0_0_3px_#000] ${isAlarmActive ? 'right-[2px]' : 'left-[2px]'}`} />
                      </button>
                      <span className="text-[7.5px] font-black text-[#ff3030] tracking-[0.2em]">ON</span>
                    </div>
                 </div>

                 {/* Center Pill */}
                 <div className="flex-1 flex justify-center min-w-max mx-2">
                    <button 
                      onClick={() => isRinging ? stopAlarm() : setShowSettings(true)}
                      className="border-[2px] border-[#ff2a2a] rounded-[30px] px-8 py-2.5 bg-[#0a0000]/60 shadow-[0_0_15px_rgba(255,0,0,0.5),inset_0_0_10px_rgba(255,0,0,0.3)] transition-transform active:scale-95"
                    >
                      <span className="text-[13px] font-black tracking-[0.3em] uppercase" style={neonTextStyle}>
                        {isRinging ? 'STOP' : 'SNOOZE'}
                      </span>
                    </button>
                 </div>

                 {/* Right Column */}
                 <div className="flex flex-col w-[30%] gap-1.5 items-end">
                    <div className="flex items-center gap-2">
                      <span className="text-[7.5px] text-[#ff3030] font-black tracking-[0.1em] uppercase" style={{textShadow: '0 0 5px #ff0000'}}>MOTIVATION:</span>
                      <button onClick={() => setMotivationState(!motivationState)} className={`w-6 h-3 rounded-full relative transition-all ${motivationState ? 'bg-[#ff3030]' : 'bg-[#1a1a1a] border border-red-900'}`}>
                        <div className={`w-2 h-2 rounded-full bg-white absolute top-[2px] transition-all ${motivationState ? 'right-[2px]' : 'left-[2px]'}`} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[7.5px] text-[#ff3030] font-black tracking-[0.1em] uppercase" style={{textShadow: '0 0 5px #ff0000'}}>VOLUME:</span>
                      <button onClick={() => setIsMuted(!isMuted)} className={`w-6 h-3 rounded-full relative transition-all ${!isMuted ? 'bg-[#ff3030]' : 'bg-[#1a1a1a] border border-red-900'}`}>
                        <div className={`w-2 h-2 rounded-full bg-white absolute top-[2px] transition-all ${!isMuted ? 'right-[2px]' : 'left-[2px]'}`} />
                      </button>
                    </div>
                 </div>
              </div>

              {/* MOTIVATION BOX */}
              {isRinging ? (
                <div className="mt-8 relative w-full border-[2px] rounded-[30px] p-6 bg-[#ff0000]/30 backdrop-blur-md flex flex-col justify-center items-center flex-1 shadow-[0_0_50px_#ff0000]" style={neonBorderStyle}>
                  <BellRing className="w-16 h-16 text-white animate-bounce drop-shadow-[0_0_20px_#ff0000]" />
                  <div className="text-3xl font-black mt-4 text-white uppercase tracking-[0.2em] drop-shadow-[0_0_15px_#ff0000]">WAKE UP!</div>
                </div>
              ) : (
                <div className="mt-6 w-full relative border-[2px] rounded-[30px] flex flex-col items-center justify-center flex-1 bg-[#0a0000]/40 text-center px-6 pb-4" style={neonBorderStyle}>
                  
                  {/* Floating Title intersecting border */}
                  <div className="absolute -top-[14px] left-1/2 -translate-x-1/2 border-[2px] border-[#ff1f1f] bg-[#0d0404] rounded-[20px] px-5 py-1.5 whitespace-nowrap shadow-[0_0_10px_rgba(255,0,0,0.5)] z-20">
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white drop-shadow-[0_0_3px_#ffffff]">
                      WAKE UP LIKE A CHAMPION
                    </span>
                  </div>

                  <div className="w-full flex-1 flex flex-col justify-center gap-5 mt-4">
                    <span className="text-[12px] md:text-[14px] font-black tracking-[0.25em] uppercase" style={neonTextStyle}>RISE & GRIND!</span>
                    <span className="text-[12px] md:text-[14px] font-black tracking-[0.25em] uppercase" style={neonTextStyle}>STAY HUNGRY</span>
                    <span className="text-[12px] md:text-[14px] font-black tracking-[0.25em] uppercase" style={neonTextStyle}>EMBRACE THE DAY</span>
                    <span className="text-[12px] md:text-[14px] font-black tracking-[0.25em] uppercase" style={neonTextStyle}>YOUR GOALS WAIT</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM NAV TABS (FLOATING OVER BACKGROUND) */}
        {!showLogin && (
          <div className="absolute bottom-[20px] left-0 w-full flex justify-between items-center px-12 z-20 pb-[env(safe-area-inset-bottom,0px)]">
            <button onClick={() => setShowSettings(!showSettings)} className="w-12 h-12 rounded-full border-[1.5px] bg-[#0a0000]/80 flex justify-center items-center hover:bg-[#ff3030]/20 transition-all text-[#ff3030]" style={neonBorderStyle}>
              <Settings className="w-5 h-5 drop-shadow-[0_0_3px_#ff0000]" />
            </button>
            <button onClick={cycleCategory} className="w-[60px] h-11 squircle border-[1.5px] bg-[#0a0000]/80 flex justify-center items-center hover:bg-[#ff3030]/20 transition-all text-[#ff3030]" style={neonBorderStyle}>
              <List className="w-6 h-6 drop-shadow-[0_0_3px_#ff0000]" />
            </button>
            <button onClick={() => setShowLogin(true)} className="w-12 h-12 rounded-full border-[1.5px] bg-[#0a0000]/80 flex justify-center items-center hover:bg-[#ff3030]/20 transition-all text-[#ff3030]" style={neonBorderStyle}>
              <User className="w-5 h-5 drop-shadow-[0_0_3px_#ff0000]" />
            </button>
          </div>
        )}

      </div>

      {/* LOGIN OVERLAY */}
      {showLogin && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-black border-[2px] border-[#ff2a2a] rounded-[24px] w-full max-w-[320px] p-6 shadow-[0_0_40px_rgba(255,0,0,0.4)] relative">
            <button onClick={() => setShowLogin(false)} className="absolute top-4 right-5 text-[#ff3030] hover:text-white font-bold text-lg drop-shadow-[0_0_4px_#ff3030]">✕</button>
            <h2 className="text-lg font-black uppercase tracking-[0.1em] text-white flex items-center mb-1 drop-shadow-[0_0_3px_#ffffff]"><Lock className="w-4 h-4 mr-2 text-[#ff3030]"/> ADMIN LOGIN</h2>
            <p className="text-[9px] text-red-500 font-bold mb-6 uppercase tracking-[0.15em]" style={neonTextStyle}>Access custom sounds & packs.</p>
            
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] text-[#ff3030] font-black tracking-[0.15em] mb-1.5 uppercase" style={{textShadow: '0 0 5px #ff0000'}}>Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-[#0a0000] border border-red-900 focus:border-[#ff3030] rounded-xl px-4 py-2 text-white outline-none shadow-[inset_0_0_10px_rgba(255,0,0,0.2)]" autoFocus />
              </div>
              <div>
                <label className="block text-[10px] text-[#ff3030] font-black tracking-[0.15em] mb-1.5 uppercase" style={{textShadow: '0 0 5px #ff0000'}}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#0a0000] border border-red-900 focus:border-[#ff3030] rounded-xl px-4 py-2 text-white outline-none shadow-[inset_0_0_10px_rgba(255,0,0,0.2)]" />
              </div>
              <button type="submit" className="w-full py-3 bg-[#ff3030] hover:bg-red-500 text-white font-black uppercase tracking-[0.2em] rounded-xl transition-all mt-4 shadow-[0_0_20px_rgba(255,0,0,0.6)]">UNLOCK</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
