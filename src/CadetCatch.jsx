import React, { useRef, useState } from 'react';
import {
  Bell,
  BookOpen,
  Bookmark,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Image as ImageIcon,
  Loader2,
  Lock,
  LogOut,
  Plus,
  Search,
  Shield,
  Sparkles,
  Target,
  UploadCloud,
  User,
  Users,
  X,
} from 'lucide-react';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-3-flash-preview';

export default function CadetCatch() {
  const [navStack, setNavStack] = useState(['onboarding']);
  const [activeTab, setActiveTab] = useState('scanner');

  const [userProfile, setUserProfile] = useState({ name: '', email: '', notifications: true });
  const [subscription, setSubscription] = useState('none');

  const [cadets, setCadets] = useState([]);
  const [activeCadetId, setActiveCadetId] = useState(null);
  const [isAddingCadet, setIsAddingCadet] = useState(false);
  const [newCadetForm, setNewCadetForm] = useState({ name: '', unit: '', photo: null });

  const [matches, setMatches] = useState([]);
  const [savedPhotos, setSavedPhotos] = useState([]);
  const [intelTab, setIntelTab] = useState('recent');

  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const [selectedMatch, setSelectedMatch] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [saveButtonText, setSaveButtonText] = useState('Save Asset');

  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [jargonTerm, setJargonTerm] = useState('');
  const [jargonExplanation, setJargonExplanation] = useState('');
  const [isDecoding, setIsDecoding] = useState(false);

  const cadetPhotoInputRef = useRef(null);

  const theme = {
    bg: 'bg-stone-900',
    surface: 'bg-stone-800',
    surfaceElevated: 'bg-stone-700',
    primary: 'text-amber-500',
    primaryBg: 'bg-amber-500',
    primaryActive: 'active:bg-amber-600',
    secondaryBg: 'bg-green-800',
    secondaryActive: 'active:bg-green-900',
    textSecondary: 'text-stone-400',
    border: 'border-stone-700',
  };

  const mockMatches = [
    'https://images.unsplash.com/photo-1541845157-a6d2d100c931?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1510925758641-869d353cecc7?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=400&q=80',
  ];

  const pushNav = (view) => setNavStack((prev) => [...prev, view]);
  const popNav = () => setNavStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  const currentView = navStack[navStack.length - 1];

  const handleLogin = (event) => {
    event.preventDefault();
    setUserProfile((prev) => ({ ...prev, email: 'parent@hq.com', name: 'Alex M.' }));
    pushNav('paywall');
  };

  const handleClearanceSelect = (tier) => {
    setSubscription(tier);
    pushNav('main');
  };

  const handleLogout = () => {
    setSubscription('none');
    setCadets([]);
    setSavedPhotos([]);
    setMatches([]);
    setNavStack(['onboarding']);
  };

  const handleAddCadetPhoto = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setNewCadetForm((prev) => ({ ...prev, photo: URL.createObjectURL(file) }));
    }
  };

  const saveNewCadet = () => {
    if (!newCadetForm.name || !newCadetForm.photo) return;

    const newCadet = {
      id: Date.now().toString(),
      ...newCadetForm,
    };

    setCadets((prev) => [...prev, newCadet]);
    if (!activeCadetId) setActiveCadetId(newCadet.id);
    setNewCadetForm({ name: '', unit: '', photo: null });
    setIsAddingCadet(false);

    if (cadets.length === 0) {
      setActiveTab('scanner');
    }
  };

  const savePhotoToArchive = () => {
    if (selectedMatch && !savedPhotos.includes(selectedMatch)) {
      setSavedPhotos((prev) => [selectedMatch, ...prev]);
      setSaveButtonText('Saved!');
      setTimeout(() => setSaveButtonText('Save Asset'), 2000);
    }
  };

  const simulateScan = () => {
    if (!activeCadetId) return;

    setIsScanning(true);
    setScanProgress(0);
    setMatches([]);
    setIntelTab('recent');

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 100);

    setTimeout(() => {
      setIsScanning(false);
      setMatches(mockMatches);
      setActiveTab('intel');
    }, 2500);
  };

  const fetchWithRetry = async (url, options, retries = 3) => {
    const delays = [1000, 2000, 4000];

    for (let attempt = 0; attempt < retries; attempt += 1) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        return await response.json();
      } catch (error) {
        if (attempt === retries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
      }
    }

    return null;
  };

  const getBase64FromUrl = async (url) => {
    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleAnalyzePhoto = async (imageUrl) => {
    setIsAnalyzing(true);
    setAiAnalysis('');

    try {
      if (!GEMINI_API_KEY) throw new Error('Missing Gemini API key');

      const base64Image = await getBase64FromUrl(imageUrl);
      const prompt = 'You are a helpful assistant for parents of military cadets. Look at this photo. Describe what activity is happening (e.g. drills, PT). Then, draft a short, sweet, encouraging letter the parent could send based on this activity.';

      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            ],
          },
        ],
        systemInstruction: { parts: [{ text: 'Keep it to 2 short paragraphs.' }] },
      };

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      const data = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      setAiAnalysis(text || 'Analysis complete: Standby for manual review.');
    } catch {
      setAiAnalysis('Comms error: Failed to establish uplink with AI analysis module.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDecodeJargon = async () => {
    if (!jargonTerm.trim()) return;
    setIsDecoding(true);
    setJargonExplanation('');

    try {
      if (!GEMINI_API_KEY) throw new Error('Missing Gemini API key');

      const prompt = `Define the military acronym/jargon: "${jargonTerm.trim()}". Explain what it means to a parent simply.`;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      const data = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      setJargonExplanation(text || 'Term unlisted.');
    } catch {
      setJargonExplanation('Decryption failed due to signal interference. Please retry.');
    } finally {
      setIsDecoding(false);
    }
  };

  const NavBar = ({ title, leftButton, rightButton }) => (
    <div className={`w-full ${theme.bg}/90 backdrop-blur-xl border-b ${theme.border} pt-safe px-4 pb-3 flex items-center justify-between z-30 shrink-0`}>
      <div className="w-1/3 flex justify-start">{leftButton}</div>
      <h1 className="w-1/3 text-center text-base font-bold uppercase tracking-widest text-white">{title}</h1>
      <div className="w-1/3 flex justify-end">{rightButton}</div>
    </div>
  );

  const TabBar = () => (
    <div className={`w-full ${theme.bg}/95 backdrop-blur-xl border-t ${theme.border} pb-safe pt-2 px-4 flex justify-between shrink-0 z-30`}>
      {[
        { id: 'scanner', icon: Target, label: 'Radar' },
        { id: 'intel', icon: ImageIcon, label: 'Intel', badge: matches.length > 0 },
        { id: 'roster', icon: Users, label: 'Roster', badge: cadets.length === 0 },
        { id: 'decoder', icon: BookOpen, label: 'Decoder' },
        { id: 'profile', icon: User, label: 'Profile' },
      ].map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 w-[20%] relative transition-colors ${isActive ? theme.primary : theme.textSecondary}`}
            aria-label={tab.label}
          >
            <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[9px] font-bold uppercase tracking-wider">{tab.label}</span>
            {tab.badge && <span className="absolute top-0 right-[25%] w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-stone-900" />}
          </button>
        );
      })}
    </div>
  );

  const ViewOnboarding = () => (
    <div className={`h-full w-full flex flex-col ${theme.bg} relative`}>
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1541845157-a6d2d100c931?auto=format&fit=crop&w=800&q=80"
          alt="Cadets training"
          className="w-full h-full object-cover opacity-20 grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/80 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col h-full justify-end p-8 pb-12">
        <div className="mb-auto pt-12">
          <div className={`inline-block px-3 py-1 bg-amber-500/20 ${theme.primary} font-bold uppercase tracking-widest text-xs rounded-md border border-amber-500/30 mb-6`}>
            Operation: Photo Recovery
          </div>
        </div>

        <Shield className={`w-16 h-16 ${theme.primary} mb-4`} />
        <h1 className="text-4xl font-black text-white mb-3 tracking-tight uppercase">CadetCatch</h1>
        <p className="text-lg text-stone-300 mb-8 font-medium leading-snug">
          Stop playing "Where's Waldo" with Academy photos. Tactical AI recon for military parents.
        </p>
        <button
          type="button"
          onClick={() => pushNav('auth')}
          className={`w-full ${theme.primaryBg} ${theme.primaryActive} text-stone-900 font-black uppercase tracking-widest text-lg py-4 rounded-2xl transition-transform active:scale-[0.98] shadow-lg flex items-center justify-center gap-2`}
        >
          Initiate Link <Crosshair className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const ViewAuth = () => (
    <div className={`h-full w-full flex flex-col ${theme.bg}`}>
      <NavBar
        title="Command Center"
        leftButton={(
          <button type="button" onClick={popNav} className={`flex items-center ${theme.primary} active:opacity-50`} aria-label="Back">
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
      />
      <div className="flex-1 px-6 py-8 overflow-y-auto no-scrollbar flex flex-col justify-center">
        <div className="flex justify-center mb-8">
          <div className={`w-20 h-20 rounded-3xl ${theme.surfaceElevated} flex items-center justify-center shadow-lg border-2 border-stone-600`}>
            <Lock className="w-10 h-10 text-stone-300" />
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className={`${theme.surface} rounded-2xl overflow-hidden border ${theme.border}`}>
            <div className="relative border-b border-stone-700">
              <User className={`w-5 h-5 ${theme.textSecondary} absolute left-4 top-4`} />
              <input type="email" placeholder="Parent ID / Email" required className="w-full pl-12 pr-4 py-4 bg-transparent text-white outline-none font-mono text-sm placeholder-stone-500" />
            </div>
            <div className="relative">
              <Lock className={`w-5 h-5 ${theme.textSecondary} absolute left-4 top-4`} />
              <input type="password" placeholder="Passcode" required className="w-full pl-12 pr-4 py-4 bg-transparent text-white outline-none font-mono text-sm placeholder-stone-500" />
            </div>
          </div>

          <button type="submit" className={`w-full ${theme.secondaryBg} ${theme.secondaryActive} text-white font-bold uppercase tracking-widest text-base py-4 rounded-2xl active:scale-[0.98] transition-all shadow-md mt-4 border-b-4 border-green-950`}>
            Establish Uplink
          </button>
        </form>
      </div>
    </div>
  );

  const ViewPaywall = () => (
    <div className={`h-full w-full flex flex-col ${theme.bg}`}>
      <div className="flex-1 px-5 pt-10 pb-8 overflow-y-auto no-scrollbar flex flex-col">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black mb-2 uppercase tracking-widest text-white">Select Clearance</h2>
          <p className={`${theme.textSecondary} text-sm font-medium leading-relaxed`}>Choose your recon capabilities.</p>
        </div>

        <div className={`w-full ${theme.surface} rounded-3xl p-6 border-2 border-amber-500 mb-4 relative overflow-hidden shadow-lg`}>
          <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500" />
          <div className="absolute top-4 right-4 bg-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded">Recommended</div>

          <h3 className="text-xl font-black uppercase tracking-wider text-white mt-2">Tactical AI</h3>
          <div className="text-3xl font-black text-amber-500 my-2">
            $9.99<span className="text-sm font-normal text-stone-400">/mo</span>
          </div>

          <ul className="space-y-3 mb-6 mt-4">
            {['Automated AI Facial Recon', 'Instant match push alerts', 'Unlimited high-res saves', 'Supports Photo Volunteers'].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle className={`w-5 h-5 ${theme.primary} shrink-0`} />
                <span className="text-sm font-medium text-stone-200">{item}</span>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => handleClearanceSelect('premium')} className={`w-full ${theme.primaryBg} ${theme.primaryActive} text-stone-900 font-black uppercase tracking-widest text-sm py-4 rounded-xl active:scale-[0.98] transition-transform`}>
            Upgrade to Tactical
          </button>
        </div>

        <div className={`w-full ${theme.surfaceElevated} rounded-3xl p-6 border ${theme.border} mb-6`}>
          <h3 className="text-lg font-black uppercase tracking-wider text-stone-300">Civilian Access</h3>
          <div className="text-xl font-black text-white my-1">Free</div>
          <ul className="space-y-2 mb-6 mt-3">
            <li className="flex items-center gap-2 text-stone-400 text-sm font-medium"><CheckCircle className="w-4 h-4" /> Manual scanning</li>
            <li className="flex items-center gap-2 text-stone-400 text-sm font-medium"><CheckCircle className="w-4 h-4" /> Basic Decoder access</li>
          </ul>
          <button type="button" onClick={() => handleClearanceSelect('free')} className="w-full bg-stone-600 active:bg-stone-500 text-white font-bold uppercase tracking-widest text-sm py-3.5 rounded-xl active:scale-[0.98] transition-colors border border-stone-500">
            Continue with Free
          </button>
        </div>
      </div>
    </div>
  );

  const TabRoster = () => (
    <div className="h-full flex flex-col">
      <NavBar
        title="Target Roster"
        rightButton={(
          <button type="button" onClick={() => setIsAddingCadet(true)} className="p-1 text-amber-500 active:opacity-50" aria-label="Add cadet">
            <Plus className="w-6 h-6" />
          </button>
        )}
      />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-6">
        {isAddingCadet ? (
          <div className={`${theme.surface} p-5 rounded-3xl border border-stone-600 animate-in fade-in slide-in-from-bottom-4`}>
            <h3 className="font-black text-white uppercase tracking-wider mb-4">Register New Cadet</h3>

            <div className="flex justify-center mb-6">
              <input type="file" accept="image/*" ref={cadetPhotoInputRef} onChange={handleAddCadetPhoto} className="hidden" />
              <button
                type="button"
                onClick={() => cadetPhotoInputRef.current?.click()}
                className={`w-28 h-28 rounded-full border-2 border-dashed ${newCadetForm.photo ? 'border-green-500 p-1' : 'border-stone-500 flex flex-col justify-center items-center'} overflow-hidden relative active:scale-95 transition-transform`}
                aria-label="Add cadet base photo"
              >
                {newCadetForm.photo ? (
                  <img src={newCadetForm.photo} alt="Preview" className="w-full h-full object-cover rounded-full grayscale-[20%]" />
                ) : (
                  <>
                    <UploadCloud className="w-8 h-8 text-stone-400 mb-1" />
                    <span className="text-[9px] uppercase font-bold text-stone-400 tracking-wider">Base Photo</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <input type="text" placeholder="Cadet Name (e.g. John D.)" value={newCadetForm.name} onChange={(event) => setNewCadetForm({ ...newCadetForm, name: event.target.value })} className="w-full p-4 rounded-xl bg-stone-900 text-white font-medium placeholder-stone-500 border border-stone-700 outline-none focus:border-amber-500" />
              <input type="text" placeholder="Unit/Company (e.g. Alpha Co.)" value={newCadetForm.unit} onChange={(event) => setNewCadetForm({ ...newCadetForm, unit: event.target.value })} className="w-full p-4 rounded-xl bg-stone-900 text-white font-medium placeholder-stone-500 border border-stone-700 outline-none focus:border-amber-500" />
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setIsAddingCadet(false)} className="flex-1 py-3.5 rounded-xl bg-stone-700 text-white font-bold uppercase tracking-wider text-sm active:bg-stone-600">Cancel</button>
              <button type="button" onClick={saveNewCadet} disabled={!newCadetForm.name || !newCadetForm.photo} className="flex-1 py-3.5 rounded-xl bg-amber-500 text-stone-900 font-black uppercase tracking-wider text-sm active:bg-amber-400 disabled:opacity-50">Register</button>
            </div>
          </div>
        ) : cadets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 pb-12">
            <div className={`w-20 h-20 rounded-full ${theme.surfaceElevated} flex items-center justify-center mb-6`}>
              <Users className="w-10 h-10 text-stone-400" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-wider mb-2 text-white">Empty Roster</h3>
            <p className={`text-sm ${theme.textSecondary} font-medium mb-8 leading-relaxed`}>Add family members or friends to your roster to begin tracking their photos.</p>
            <button type="button" onClick={() => setIsAddingCadet(true)} className={`w-full py-4 rounded-xl ${theme.secondaryBg} ${theme.secondaryActive} text-white font-bold uppercase tracking-widest flex justify-center gap-2 border-b-4 border-green-950`}>
              <Plus className="w-5 h-5" /> Add Cadet
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {cadets.map((cadet) => (
              <div key={cadet.id} className={`${theme.surface} p-4 rounded-3xl border border-stone-700 flex items-center gap-4`}>
                <img src={cadet.photo} alt={cadet.name} className="w-16 h-16 rounded-full object-cover border-2 border-stone-600 grayscale-[20%]" />
                <div className="flex-1">
                  <h4 className="font-black text-white text-lg uppercase tracking-wider">{cadet.name}</h4>
                  <p className="text-xs text-amber-500 font-mono uppercase tracking-widest">{cadet.unit || 'Unknown Unit'}</p>
                </div>
                <button type="button" onClick={() => { setActiveCadetId(cadet.id); setActiveTab('scanner'); }} className={`w-10 h-10 rounded-full ${theme.surfaceElevated} flex items-center justify-center active:bg-stone-600 text-white`} aria-label={`Track ${cadet.name}`}>
                  <Target className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const TabScanner = () => {
    const activeCadet = cadets.find((cadet) => cadet.id === activeCadetId) || cadets[0];

    return (
      <div className="h-full flex flex-col">
        <NavBar title="AI Radar" />
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-6">
          {cadets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 pb-12">
              <Target className="w-16 h-16 text-stone-600 mb-6" />
              <h3 className="text-lg font-black uppercase tracking-wider mb-2 text-stone-300">Target Required</h3>
              <p className={`text-sm ${theme.textSecondary} mb-8 font-medium`}>You must add a cadet to your roster before initiating a radar sweep.</p>
              <button type="button" onClick={() => setActiveTab('roster')} className={`px-8 py-3.5 rounded-xl ${theme.primaryBg} ${theme.primaryActive} text-stone-900 font-bold uppercase tracking-widest text-sm shadow-lg`}>Go to Roster</button>
            </div>
          ) : (
            <>
              <div className="mb-6 flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {cadets.map((cadet) => (
                  <button
                    type="button"
                    key={cadet.id}
                    onClick={() => setActiveCadetId(cadet.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${activeCadetId === cadet.id ? 'border-amber-500 bg-amber-500/20 text-amber-500' : 'border-stone-600 bg-stone-800 text-stone-400'} transition-colors whitespace-nowrap`}
                  >
                    <img src={cadet.photo} alt="" className="w-5 h-5 rounded-full object-cover grayscale-[30%]" />
                    <span className="text-xs font-bold uppercase tracking-wider">{cadet.name}</span>
                  </button>
                ))}
              </div>

              <div className={`${theme.surface} rounded-[2rem] p-6 mb-6 shadow-md border border-stone-700 relative overflow-hidden`}>
                <div className="absolute top-0 left-0 w-full h-1 bg-green-700" />

                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-base font-black uppercase tracking-wider text-white">Target Locked</h3>
                    <p className={`text-xs mt-1 ${theme.textSecondary} font-mono uppercase`}>{activeCadet.unit}</p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-green-900 text-green-400 border border-green-700">READY</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className={`relative w-40 h-40 rounded-full ${theme.surfaceElevated} border-4 border-green-500 overflow-hidden mb-8 shadow-inner`}>
                    <img src={activeCadet.photo} alt="Target" className="w-full h-full object-cover grayscale-[10%]" />
                    {isScanning && (
                      <div className="absolute inset-0 bg-green-500/20 mix-blend-color-burn">
                        <div className="w-full h-2 bg-green-400 shadow-[0_0_15px_#4ade80] absolute top-0 animate-[scan_1.5s_ease-in-out_infinite]" />
                      </div>
                    )}
                    <Crosshair className="absolute text-white/30 w-full h-full p-6 pointer-events-none" />
                  </div>

                  <button
                    type="button"
                    onClick={simulateScan}
                    disabled={isScanning}
                    className={`w-full py-4 rounded-xl ${theme.primaryBg} ${theme.primaryActive} text-stone-900 font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50`}
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Sweeping Networks...
                      </>
                    ) : (
                      <>
                        <Crosshair className="w-5 h-5" /> Initiate Sweep
                      </>
                    )}
                  </button>
                </div>
              </div>

              {isScanning && (
                <div className="px-2 mt-4 animate-in fade-in">
                  <div className="flex justify-between text-[10px] font-bold text-stone-500 mb-2 font-mono uppercase tracking-widest">
                    <span>Scanning Web Guy databanks...</span>
                    <span className="text-green-500">{scanProgress}%</span>
                  </div>
                  <div className={`h-2.5 w-full ${theme.surfaceElevated} rounded-full overflow-hidden`}>
                    <div className="h-full bg-green-600 transition-all duration-300 relative" style={{ width: `${scanProgress}%` }} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const TabIntel = () => {
    const displayPhotos = intelTab === 'recent' ? matches : savedPhotos;

    return (
      <div className="h-full flex flex-col">
        <NavBar title="Intelligence" />

        <div className="px-4 py-3 shrink-0">
          <div className="flex bg-stone-800 p-1 rounded-lg border border-stone-700">
            <button type="button" onClick={() => setIntelTab('recent')} className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${intelTab === 'recent' ? 'bg-stone-600 text-white shadow-sm' : 'text-stone-400'}`}>Recent Sweeps</button>
            <button type="button" onClick={() => setIntelTab('saved')} className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${intelTab === 'saved' ? 'bg-stone-600 text-white shadow-sm' : 'text-stone-400'}`}>Archived</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-2">
          {displayPhotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4">
              {intelTab === 'recent' ? (
                <>
                  <ImageIcon className="w-12 h-12 text-stone-600 mb-4" />
                  <h3 className="font-bold text-stone-400 uppercase tracking-wider">No Recent Intel</h3>
                </>
              ) : (
                <>
                  <Bookmark className="w-12 h-12 text-stone-600 mb-4" />
                  <h3 className="font-bold text-stone-400 uppercase tracking-wider">Archive Empty</h3>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-6">
              {displayPhotos.map((url) => (
                <button
                  type="button"
                  key={url}
                  onClick={() => {
                    setSelectedMatch(url);
                    setIsSheetOpen(true);
                    setSaveButtonText(savedPhotos.includes(url) ? 'Saved' : 'Save Asset');
                  }}
                  className={`aspect-square rounded-2xl overflow-hidden relative active:scale-95 transition-transform ${theme.surfaceElevated} border-2 border-stone-600 shadow-md`}
                >
                  <img src={url} alt="Match" className="w-full h-full object-cover grayscale-[10%]" />
                  {savedPhotos.includes(url) && (
                    <div className="absolute top-2 right-2 bg-stone-900/80 backdrop-blur-md rounded-full p-1 border border-stone-600">
                      <Bookmark className={`w-3 h-3 ${theme.primary} fill-amber-500`} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const TabProfile = () => (
    <div className="h-full flex flex-col">
      <NavBar title="Settings" />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-6">
        <div className="flex items-center gap-4 mb-8 px-2">
          <div className="w-16 h-16 rounded-full bg-stone-700 border-2 border-amber-500 flex items-center justify-center">
            <User className="w-8 h-8 text-stone-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">{userProfile.name}</h2>
            <p className="text-sm text-stone-400 font-mono">{userProfile.email}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-stone-800 rounded-2xl overflow-hidden border border-stone-700">
            <div className="px-4 py-3 flex justify-between items-center border-b border-stone-700">
              <span className="text-sm font-bold text-white uppercase tracking-wider">Push Notifications</span>
              <button
                type="button"
                onClick={() => setUserProfile((profile) => ({ ...profile, notifications: !profile.notifications }))}
                className={`w-12 h-6 rounded-full relative transition-colors ${userProfile.notifications ? 'bg-green-500' : 'bg-stone-600'}`}
                aria-label="Toggle push notifications"
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${userProfile.notifications ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-sm font-bold text-white uppercase tracking-wider">Clearance Level</span>
              <span className="text-xs font-black uppercase tracking-widest text-amber-500 bg-amber-500/20 px-2 py-1 rounded">
                {subscription === 'premium' ? 'Tactical' : 'Civilian'}
              </span>
            </div>
          </div>

          <div className="bg-stone-800 rounded-2xl overflow-hidden border border-stone-700">
            <button type="button" className="w-full px-4 py-4 flex justify-between items-center border-b border-stone-700 active:bg-stone-700 transition-colors text-left">
              <span className="text-sm font-bold text-white uppercase tracking-wider">Edit Profile</span>
              <ChevronRight className="w-5 h-5 text-stone-500" />
            </button>
            <button type="button" className="w-full px-4 py-4 flex justify-between items-center active:bg-stone-700 transition-colors text-left">
              <span className="text-sm font-bold text-white uppercase tracking-wider">Manage Subscription</span>
              <ChevronRight className="w-5 h-5 text-stone-500" />
            </button>
          </div>

          <button type="button" onClick={handleLogout} className="w-full bg-red-900/20 border border-red-900 text-red-500 font-bold uppercase tracking-wider py-4 rounded-2xl flex items-center justify-center gap-2 active:bg-red-900/40 transition-colors">
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );

  const TabDecoder = () => (
    <div className="h-full flex flex-col">
      <NavBar title="Decoder" />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-6">
        <p className={`${theme.textSecondary} text-sm mb-6 leading-relaxed px-1 font-medium`}>
          Translate military acronyms and academy slang into plain English.
        </p>

        <div className="space-y-4">
          <div className={`${theme.surface} rounded-xl p-2 flex items-center border border-stone-700 focus-within:border-amber-500 transition-colors`}>
            <Search className={`w-5 h-5 ml-2 ${theme.textSecondary}`} />
            <input
              type="text"
              value={jargonTerm}
              onChange={(event) => setJargonTerm(event.target.value)}
              placeholder="e.g., 'Swab Summer'"
              className="flex-1 bg-transparent text-white px-3 py-2 outline-none font-mono text-sm uppercase"
            />
            {jargonTerm && (
              <button type="button" onClick={() => setJargonTerm('')} className="p-2" aria-label="Clear term">
                <X className={`w-4 h-4 ${theme.textSecondary}`} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleDecodeJargon}
            disabled={isDecoding || !jargonTerm}
            className={`w-full py-4 rounded-xl ${theme.secondaryBg} ${theme.secondaryActive} text-white font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:bg-stone-700 border-b-4 border-green-950 disabled:border-stone-700`}
          >
            {isDecoding ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Decrypt Term'}
          </button>
        </div>

        {jargonExplanation && (
          <div className={`mt-8 ${theme.surface} rounded-2xl p-6 shadow-lg border border-stone-700 relative animate-in fade-in slide-in-from-bottom-4`}>
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-stone-700">
              <Sparkles className={`w-5 h-5 ${theme.primary}`} />
              <h4 className="font-black text-sm uppercase tracking-wider text-white">Decryption Result</h4>
            </div>
            <p className="text-sm leading-relaxed text-stone-300 font-mono">{jargonExplanation}</p>
          </div>
        )}
      </div>
    </div>
  );

  const PhotoDetailSheet = () => (
    <div aria-hidden={!isSheetOpen} className={`absolute inset-0 z-50 transition-all duration-300 ${isSheetOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <button
        type="button"
        aria-label="Close asset dossier"
        className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${isSheetOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => { setIsSheetOpen(false); setAiAnalysis(''); }}
      />

      <div className={`absolute bottom-0 w-full h-[92%] ${theme.bg} rounded-t-[2.5rem] shadow-2xl flex flex-col transition-transform duration-300 transform ${isSheetOpen ? 'translate-y-0' : 'translate-y-full'} border-t border-stone-700`}>
        <div className="w-full flex flex-col items-center pt-3 pb-2 shrink-0">
          <div className="w-12 h-1.5 bg-stone-600 rounded-full mb-3" />
          <div className="w-full flex justify-between items-center px-6">
            <h3 className="text-base font-black uppercase tracking-widest text-white">Asset Dossier</h3>
            <button type="button" onClick={() => { setIsSheetOpen(false); setAiAnalysis(''); }} className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center active:bg-stone-700" aria-label="Close">
              <X className="w-4 h-4 text-stone-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-safe px-4 pt-2">
          <div className="w-full aspect-square rounded-3xl overflow-hidden bg-stone-950 mb-6 relative border-2 border-stone-700">
            {selectedMatch && <img src={selectedMatch} alt="Intel" className="w-full h-full object-contain" />}
          </div>

          <div className="flex gap-3 mb-8">
            <button type="button" onClick={savePhotoToArchive} disabled={saveButtonText === 'Saved!'} className={`flex-1 py-3.5 rounded-xl ${saveButtonText === 'Saved!' ? 'bg-stone-700 text-stone-400' : `${theme.primaryBg} ${theme.primaryActive} text-stone-900`} font-black uppercase tracking-wider text-sm transition-colors flex items-center justify-center gap-2`}>
              {saveButtonText === 'Saved!' ? <CheckCircle className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />} {saveButtonText}
            </button>
          </div>

          <div className={`${theme.surface} rounded-3xl p-6 border border-stone-700 relative overflow-hidden mb-8`}>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-green-500" />
              <h4 className="font-black text-sm uppercase tracking-wider text-white">AI Sitrep Analysis</h4>
            </div>
            <p className={`text-xs ${theme.textSecondary} mb-5 font-medium`}>
              Analyze activity and draft a letter based on this photo.
            </p>

            {!aiAnalysis ? (
              <button type="button" onClick={() => selectedMatch && handleAnalyzePhoto(selectedMatch)} disabled={isAnalyzing || !selectedMatch} className="w-full py-3.5 rounded-xl bg-stone-900 border border-stone-700 text-white font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 active:bg-stone-800">
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className={`w-4 h-4 ${theme.primary}`} /> Generate Sitrep</>}
              </button>
            ) : (
              <div className="bg-stone-900/50 rounded-xl p-4 mt-2 border border-stone-800">
                <p className="text-xs leading-relaxed text-stone-300 font-mono whitespace-pre-wrap">{aiAnalysis}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-black sm:py-8 flex justify-center items-center font-sans text-stone-100 select-none">
      <div className="relative w-full h-[100dvh] sm:h-[844px] sm:max-w-[390px] bg-stone-900 sm:rounded-[3rem] sm:border-[12px] border-stone-800 overflow-hidden shadow-2xl flex flex-col">
        <div className="flex-1 relative overflow-hidden flex flex-col">
          {currentView === 'onboarding' && <ViewOnboarding />}
          {currentView === 'auth' && <ViewAuth />}
          {currentView === 'paywall' && <ViewPaywall />}

          {currentView === 'main' && (
            <div className="h-full w-full flex flex-col relative bg-stone-950">
              <div className="flex-1 relative overflow-hidden bg-stone-950">
                {activeTab === 'scanner' && <TabScanner />}
                {activeTab === 'intel' && <TabIntel />}
                {activeTab === 'roster' && <TabRoster />}
                {activeTab === 'decoder' && <TabDecoder />}
                {activeTab === 'profile' && <TabProfile />}
              </div>
              <TabBar />
            </div>
          )}
        </div>

        {isSheetOpen && <PhotoDetailSheet />}
      </div>

      <style>{`
        :root { color-scheme: dark; }
        body { margin: 0; background-color: #000; -webkit-font-smoothing: antialiased; -webkit-tap-highlight-color: transparent; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 24px); }
        .pt-safe { padding-top: env(safe-area-inset-top, 44px); }
      `}</style>
    </div>
  );
}
