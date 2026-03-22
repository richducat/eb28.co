import React, { useState, useEffect } from 'react';
import { Settings, User, Lock, BellRing, ListTodo, Power } from 'lucide-react';

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

export default function AlarmClock() {
  const [time, setTime] = useState(new Date());
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [customAudioMap, setCustomAudioMap] = useState({});
  const [activeAudioObj, setActiveAudioObj] = useState(null);

  const [alarmHours] = useState('06');
  const [alarmMinutes] = useState('00');
  const [alarmAmPm] = useState('AM');
  const [isAlarmActive, setIsAlarmActive] = useState(true);
  const [isRinging, setIsRinging] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(ALARM_VOICES[0].id);
  const [isMuted, setIsMuted] = useState(false);
  const [motivationState, setMotivationState] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  useEffect(() => {
    try {
      const savedAudio = localStorage.getItem('eb28_custom_audio');
      if (savedAudio) setCustomAudioMap(JSON.parse(savedAudio));
    } catch (e) { console.warn('Failed to load storage', e); }
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
    if (activeAudioObj) { activeAudioObj.pause(); activeAudioObj.currentTime = 0; setActiveAudioObj(null); }
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
    
    // Hardcoded special cases
    if (voiceId === 'nuclear') {
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

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      setIsUnlocked(true); setShowLogin(false); setUsername(''); setPassword('');
    } else alert('Invalid credentials');
  };

  const formatHours = (date) => (date.getHours() % 12 || 12).toString().padStart(2, '0');
  const formatMinutes = (date) => date.getMinutes().toString().padStart(2, '0');
  const getAmPm = (date) => date.getHours() >= 12 ? 'PM' : 'AM';
  
  const displayDateStrFull = `${time.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()} ${time.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })}`;

  return (
    <div className="relative w-full overflow-hidden min-h-screen flex justify-center items-center" style={{fontFamily: '"Press Start 2P", monospace', backgroundColor: '#5cdb95'}}>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        @font-face {
          font-family: 'Digital-7';
          font-style: italic;
          font-weight: 700;
          src: url('https://fonts.cdnfonts.com/s/14227/digital-7.woff') format('woff');
        }
        /* Make chunky physical toggle switch track */
        .chunky-track {
           box-shadow: inset 0 6px 10px rgba(0,0,0,0.8);
        }
      `}</style>

      {/* BACKGROUND IMAGE - Nintendo Track Field Miami Vice vibe */}
      <div className="fixed inset-0 bg-[url('/miami-track-bg.png')] bg-cover bg-bottom bg-no-repeat opacity-100" />
      
      {/* 
        ======================================================================
        THE CLOCK HARDWARE: Huge plastic RadioShack base standing on scene 
        ======================================================================
      */}
      <div className="relative flex-1 w-full max-w-[440px] mt-auto md:h-auto h-[100dvh] flex flex-col justify-end md:justify-center px-4 pb-8 md:pb-0 mx-auto z-10 drop-shadow-[0_40px_40px_rgba(0,0,0,0.6)]">
        
        {/* Main Plastic Shell - Miami Vice Gray/White aesthetic */}
        <div className="w-full relative bg-[#e0e5ec] rounded-[24px] rounded-t-[40px] shadow-[inset_-5px_-5px_15px_rgba(0,0,0,0.2),_inset_5px_5px_15px_rgba(255,255,255,0.8)] border-[2px] border-[#cbd2d9] pb-8 pt-4 px-4 md:px-6 flex flex-col overflow-hidden">
          
          {/* Hardware Decal Logo Top Center */}
          <div className="text-center w-full mb-3 flex items-center justify-center gap-3">
             <div className="h-[2px] w-8 bg-[#ff00aa] shadow-[0_4px_0_#00f0ff]" />
             <span className="text-[8px] text-slate-500 tracking-widest uppercase">RADIO-TEK</span>
             <div className="h-[2px] w-8 bg-[#ff00aa] shadow-[0_4px_0_#00f0ff]" />
          </div>

          {/* SNOOZE BAR AT THE TOP (Massive chunky physical button) */}
          <button 
            onClick={() => isRinging ? stopAlarm() : null}
            className={`w-full relative h-[70px] bg-[#ff00aa] rounded-[16px] mb-6 flex items-center justify-center border-b-[8px] border-r-[4px] border-[#990066] active:border-b-0 active:border-r-0 active:translate-y-2 active:translate-x-1 outline-none shadow-lg transition-all ${isRinging ? 'animate-pulse bg-[#ff0055]' : ''}`}
          >
             <span className="text-[14px] md:text-[16px] text-white drop-shadow-[2px_2px_0px_#000]">
               {isRinging ? 'SLAM TO STOP' : 'SNOOZE / LIGHT'}
             </span>
             {/* Small ribbed texture lines for the snooze button */}
             <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1">
               <div className="w-[10px] h-[2px] bg-black/20" /><div className="w-[10px] h-[2px] bg-black/20" /><div className="w-[10px] h-[2px] bg-black/20" />
             </div>
             <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1">
               <div className="w-[10px] h-[2px] bg-black/20" /><div className="w-[10px] h-[2px] bg-black/20" /><div className="w-[10px] h-[2px] bg-black/20" />
             </div>
          </button>

          {/* MAIN LCD SCREEN WINDOW - deeply recessed black glass */}
          <div className="w-full bg-[#0a0f12] rounded-xl border-t-[8px] border-l-[8px] border-[#05080a] border-b-[2px] border-r-[2px] border-[#151f26] shadow-[inset_0_5px_25px_rgba(0,0,0,1)] p-4 relative overflow-hidden flex flex-col">
              
              {/* Fake LCD Glass Reflection */}
              <div className="absolute top-0 left-0 w-full h-[30%] bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              
              {/* Screen Header row (Date & Status indicators) */}
              <div className="flex justify-between items-center w-full px-2 mt-1 z-10">
                 <span className="text-[8px] md:text-[9px] text-[#00f0ff] drop-shadow-[0_0_8px_#00f0ff] uppercase">{displayDateStrFull}</span>
                 <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className="text-[5px] text-slate-500 mb-1">ALM</span>
                      <div className={`w-[6px] h-[6px] rounded-full border border-black ${isAlarmActive ? 'bg-[#ff00aa] shadow-[0_0_8px_#ff00aa]' : 'bg-slate-800'}`} />
                    </div>
                 </div>
              </div>

              {/* Main Digital Clock 7-segment */}
              <div className="w-full flex justify-center items-center mt-4 mb-2 relative z-10 pl-2">
                 <div className="text-center flex items-center justify-center" 
                      style={{
                        fontFamily: '"Digital-7", monospace',
                        fontSize: 'clamp(5rem, 24vw, 7.5rem)', 
                        lineHeight: '0.8',
                        color: isAlarmActive ? '#ff00aa' : '#550033', // Dim if alarm off
                        textShadow: isAlarmActive ? `0 0 15px #ff00aa, 0 0 30px #ff00aa` : 'none',
                        WebkitTextStroke: isAlarmActive ? `4px #ff00aa` : '2px #550033', 
                        fontStyle: 'italic',
                        letterSpacing: '-0.02em'
                      }}>
                   {formatHours(time)}
                   <span className="opacity-90 -mx-1 md:-mx-2 mb-[10%]">:</span>
                   {formatMinutes(time)}
                 </div>
                 {/* AM/PM to the right inside the LCD */}
                 <div className="flex flex-col ml-3 gap-2">
                    <span className={`text-[8px] font-['Press_Start_2P'] uppercase ${getAmPm(time) === 'AM' ? 'text-[#00f0ff] drop-shadow-[0_0_8px_#00f0ff]' : 'text-slate-700'}`}>AM</span>
                    <span className={`text-[8px] font-['Press_Start_2P'] uppercase ${getAmPm(time) === 'PM' ? 'text-[#00f0ff] drop-shadow-[0_0_8px_#00f0ff]' : 'text-slate-700'}`}>PM</span>
                 </div>
              </div>

              {/* Secondary LCD Row: Motivation Track */}
              <div className="mt-4 pt-3 border-t border-[#1a252d] w-full flex justify-between items-center z-10 px-2">
                <span className="text-[6px] text-slate-500 uppercase">FEED:</span>
                <span className="text-[7.5px] md:text-[8.5px] text-[#39ff14] drop-shadow-[0_0_8px_#39ff14] animate-pulse">
                  {motivationState ? "WAKE UP CHAMPION!" : "SYSTEM RESTING"}
                </span>
              </div>
          </div>

          {/* HARDWARE CONTROL DECK (Toggles & Settings) */}
          <div className="w-full mt-6 grid grid-cols-4 gap-3 md:gap-4 px-2">
             
             {/* Alarm Toggle Switch */}
             <div className="col-span-2 flex flex-col items-start bg-[#cfd6e0] p-3 rounded-lg shadow-[inset_1px_1px_5px_rgba(0,0,0,0.1)]">
               <span className="text-[7px] text-slate-700 uppercase mb-3">ALARM SET ({alarmHours}:{alarmMinutes} AM)</span>
               <button 
                  onClick={() => setIsAlarmActive(!isAlarmActive)}
                  className="w-[60px] h-[24px] bg-slate-800 rounded-full chunky-track relative flex items-center px-1 shrink-0"
               >
                  <div className={`w-[20px] h-[20px] rounded-full absolute border-b-[3px] transition-all duration-200 ${isAlarmActive ? 'border-[#0099aa] left-[36px]' : 'bg-slate-400 border-slate-500 left-1'}`} style={isAlarmActive ? {backgroundColor: '#00f0ff'} : {}} />
               </button>
             </div>

             {/* Volume/Motivate Button Toggles */}
             <div className="col-span-2 flex flex-col gap-2">
                <div className="flex justify-between items-center bg-[#cfd6e0] p-2 rounded-lg shadow-[inset_1px_1px_5px_rgba(0,0,0,0.1)] h-full">
                  <span className="text-[6.5px] text-slate-700 uppercase leading-[1.2]">VOL<br/>MUTE</span>
                  <button onClick={() => setIsMuted(!isMuted)} className={`w-[24px] h-[24px] rounded-md border-b-[4px] active:border-b-0 active:translate-y-1 transition-all ${isMuted ? 'bg-[#ff00aa] border-[#990066]' : 'bg-slate-400 border-slate-500'}`} />
                </div>
                <div className="flex justify-between items-center bg-[#cfd6e0] p-2 rounded-lg shadow-[inset_1px_1px_5px_rgba(0,0,0,0.1)] h-full">
                  <span className="text-[6.5px] text-slate-700 uppercase leading-[1.2]">MOTV<br/>FEED</span>
                  <button onClick={() => setMotivationState(!motivationState)} className={`w-[24px] h-[24px] rounded-md border-b-[4px] active:border-b-0 active:translate-y-1 transition-all ${motivationState ? 'bg-[#39ff14] border-[#1b9900]' : 'bg-slate-400 border-slate-500'}`} />
                </div>
             </div>
          </div>

          {/* LOWER DECK: Deep chunky utility buttons */}
          <div className="w-full flex justify-between gap-4 mt-6 px-2">
             <button onClick={() => setShowSettings(!showSettings)} className="flex-1 bg-[#1a202c] border-b-[6px] border-[#0d1218] active:border-b-0 active:translate-y-1 rounded-xl h-[45px] flex items-center justify-center p-2 group transition-all">
                <Settings className="w-[18px] h-[18px] text-[#00f0ff] drop-shadow-[0_0_5px_#00f0ff]" strokeWidth={3} />
             </button>
             <button className="flex-1 bg-[#1a202c] border-b-[6px] border-[#0d1218] active:border-b-0 active:translate-y-1 rounded-xl h-[45px] flex items-center justify-center p-2 group transition-all">
                <ListTodo className="w-[18px] h-[18px] text-[#39ff14] drop-shadow-[0_0_5px_#39ff14]" strokeWidth={3} />
             </button>
             <button onClick={() => setShowLogin(true)} className="flex-1 bg-[#1a202c] border-b-[6px] border-[#0d1218] active:border-b-0 active:translate-y-1 rounded-xl h-[45px] flex items-center justify-center p-2 group transition-all">
                <User className="w-[18px] h-[18px] text-[#ff00aa] drop-shadow-[0_0_5px_#ff00aa]" strokeWidth={3} />
             </button>
          </div>

        </div>
        
        {/* SETTINGS OVERLAY - Takes up bottom portion of screen gracefully */}
        {showSettings && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
             <div className="w-full bg-[#1e2530] border-t-8 border-[#0a0e14] rounded-t-3xl p-6 relative max-h-[80%] overflow-y-auto">
               <button onClick={() => setShowSettings(false)} className="absolute top-4 right-5 text-white bg-slate-800 p-2 rounded-lg border-b-4 border-slate-900 active:border-b-0 active:translate-y-1">✕</button>
               <h2 className="text-[12px] text-[#00f0ff] uppercase mb-6 mt-2 drop-shadow-[0_0_5px_#00f0ff]">Audio Settings</h2>
               <div className="space-y-3">
                 {ALARM_VOICES.map((voice) => (
                   <button 
                     key={voice.id}
                     onClick={() => {
                        if (voice.type === 'premium' && !isUnlocked) setShowLogin(true);
                        else setSelectedVoice(voice.id);
                     }}
                     className={`w-full flex items-center justify-between p-4 rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all ${selectedVoice === voice.id ? 'bg-[#10141a] border-[#ff00aa]' : 'bg-slate-800 border-slate-900'}`}
                   >
                     <div className="flex items-center gap-4">
                       <span className="text-2xl">{voice.icon}</span>
                       <div className="flex flex-col text-left gap-2">
                         <span className="text-[8px] text-white uppercase">{voice.name}</span>
                         {(voice.type === 'premium' && !isUnlocked) && (
                           <span className="text-[6px] text-yellow-400 uppercase"><Lock className="w-[10px] h-[10px] inline mr-1 -mt-0.5"/> LOCKED</span>
                         )}
                       </div>
                     </div>
                   </button>
                 ))}
               </div>
             </div>
          </div>
        )}

        {/* LOGIN OVERLAY */}
        {showLogin && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <div className="bg-[#1e2530] border-b-8 border-r-8 border-[#0a0e14] rounded-2xl w-full max-w-[320px] p-8 relative">
              <button onClick={() => setShowLogin(false)} className="absolute top-[-15px] right-[-15px] w-10 h-10 flex items-center justify-center bg-red-500 border-b-4 border-red-800 active:border-b-0 active:translate-y-1 rounded-full text-white font-black text-xl z-10 box-shadow-xl">X</button>
              <h2 className="text-[10px] uppercase text-[#ff00aa] flex items-center mb-6"><Lock className="w-4 h-4 mr-2"/> PRO LOGIN</h2>
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div>
                  <label className="block text-[8px] text-[#00f0ff] mb-2 uppercase">Username</label>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-[#0a0f12] border-t-4 border-l-4 border-[#05080a] border-b-2 border-r-2 border-[#151f26] rounded-xl px-4 py-4 text-white outline-none active:border-[#ff00aa] text-[8px] font-['Press_Start_2P'] uppercase shadow-inner" autoFocus />
                </div>
                <div>
                  <label className="block text-[8px] text-[#00f0ff] mb-2 uppercase">Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#0a0f12] border-t-4 border-l-4 border-[#05080a] border-b-2 border-r-2 border-[#151f26] rounded-xl px-4 py-4 text-white outline-none active:border-[#ff00aa] text-[8px] font-['Press_Start_2P'] shadow-inner" />
                </div>
                <button type="submit" className="w-full py-4 bg-[#ff00aa] border-b-8 border-[#990066] active:border-b-0 active:translate-y-2 rounded-xl text-white text-[10px] uppercase mt-4 transition-all tracking-widest shadow-lg">UNLOCK</button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
