import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Terminal, Activity, Calendar as CalendarIcon, PhoneMissed,
    Target, TrendingUp, AlertTriangle, CheckCircle2, Palette
} from 'lucide-react';

/* ───────────────────────── Theme Definitions ───────────────────────── */
const THEMES = {
    matrix: {
        name: 'MATRIX',
        primary: '#39ff14',
        accent: '#00ff41',
        warn: '#f59e0b',
        danger: '#ef4444',
        bg: '#000000',
        panelBg: 'rgba(0,0,0,0.5)',
    },
    amber: {
        name: 'AMBER',
        primary: '#ffbf00',
        accent: '#ffd866',
        warn: '#ff6b35',
        danger: '#ff3333',
        bg: '#0a0800',
        panelBg: 'rgba(10,8,0,0.5)',
    },
    cyberpunk: {
        name: 'CYBERPUNK',
        primary: '#ff00ff',
        accent: '#00ffff',
        warn: '#ff6ec7',
        danger: '#ff073a',
        bg: '#0d0221',
        panelBg: 'rgba(13,2,33,0.5)',
    },
};

/* ───────────────────────── Boot Sequence Lines ─────────────────────── */
const BOOT_LINES = [
    'EB28.OS BIOS v2.4.1',
    'Copyright (c) 2026 EB28 Systems Corp.',
    '',
    'Initializing memory.............. 64MB OK',
    'Loading kernel modules........... OK',
    'Mounting /dev/zoho............... OK',
    'Mounting /dev/ringcentral........ OK',
    'Mounting /dev/calendar........... OK',
    'Starting IMAP sync daemon........ OK',
    'Checking database latency........ 24ms',
    '',
    'Running system diagnostics.......',
    '  > API endpoints .............. ONLINE',
    '  > Telephony trunk ............ ONLINE',
    '  > Mail sync .................. LAGGING [!]',
    '',
    'Loading dashboard interface.......',
    '',
    '████████████████████████████████████████ 100%',
    '',
    'Welcome back, Richard.',
    'Type "help" for available commands.',
    '',
];

/* ───────────────────────── Boot Screen Component ───────────────────── */
const BootScreen = ({ onComplete, theme }) => {
    const [lines, setLines] = useState([]);
    const [done, setDone] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        let i = 0;
        let fadeTimeout;
        let completeTimeout;

        const interval = setInterval(() => {
            if (i < BOOT_LINES.length) {
                setLines(prev => [...prev, BOOT_LINES[i]]);
                i++;
            } else {
                clearInterval(interval);
                fadeTimeout = setTimeout(() => {
                    setDone(true);
                    completeTimeout = setTimeout(onComplete, 400);
                }, 600);
            }
        }, 80);

        return () => {
            clearInterval(interval);
            clearTimeout(fadeTimeout);
            clearTimeout(completeTimeout);
        };
    }, [onComplete]);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [lines]);

    return (
        <div
            className={`min-h-screen font-mono p-8 flex flex-col justify-center transition-opacity duration-500 ${done ? 'opacity-0' : 'opacity-100'}`}
            style={{ background: theme.bg, color: theme.primary }}
        >
            <div ref={containerRef} className="max-w-3xl mx-auto w-full overflow-y-auto max-h-[80vh]">
                {lines.map((line, i) => (
                    <div key={i} className="retro-text leading-relaxed whitespace-pre">
                        {line}
                    </div>
                ))}
                {!done && <span className="inline-block animate-pulse">█</span>}
            </div>
        </div>
    );
};

/* ───────────────────────── Activity Log Component ──────────────────── */
const ActivityLog = ({ theme }) => {
    const [entries, setEntries] = useState([
        { time: '21:30:12', msg: 'System boot complete' },
        { time: '21:30:14', msg: 'Dashboard modules loaded' },
        { time: '21:30:18', msg: 'IMAP sync: 3 new messages' },
    ]);
    const logRef = useRef(null);

    const LOG_MESSAGES = [
        'Heartbeat pulse OK',
        'Zoho CRM: lead updated',
        'RingCentral: call queued',
        'Calendar sync complete',
        'Pipeline stage change detected',
        'IMAP: new message received',
        'DB checkpoint written',
        'Memory GC completed',
        'API rate limit: 842/1000',
        'Lead score recalculated',
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const ts = now.toLocaleTimeString('en-US', { hour12: false });
            const msg = LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)];
            setEntries(prev => [...prev.slice(-15), { time: ts, msg }]);
        }, 3000 + Math.random() * 4000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [entries]);

    return (
        <div
            className="border p-4 retro-text transition-all h-full"
            style={{ borderColor: theme.primary, background: theme.panelBg, color: theme.primary }}
        >
            <h2 className="text-xl font-bold mb-3 border-b pb-2 flex items-center gap-2"
                style={{ borderColor: `${theme.primary}80` }}>
                <Terminal size={20} /> ACTIVITY LOG
            </h2>
            <div ref={logRef} className="space-y-1 text-xs max-h-40 overflow-y-auto scrollbar-hide">
                {entries.map((e, i) => (
                    <div key={i} className="flex gap-3 opacity-80 hover:opacity-100 transition-opacity">
                        <span style={{ color: `${theme.primary}99` }}>[{e.time}]</span>
                        <span>{e.msg}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ───────────────────────── CLI Component ───────────────────────────── */
const CLIInput = ({ onCommand, theme, history, inputRef }) => {
    const [input, setInput] = useState('');
    const [historyIdx, setHistoryIdx] = useState(-1);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        onCommand(input.trim());
        setInput('');
        setHistoryIdx(-1);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const newIdx = Math.min(historyIdx + 1, history.length - 1);
            setHistoryIdx(newIdx);
            if (history[history.length - 1 - newIdx]) {
                setInput(history[history.length - 1 - newIdx]);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const newIdx = Math.max(historyIdx - 1, -1);
            setHistoryIdx(newIdx);
            setInput(newIdx === -1 ? '' : history[history.length - 1 - newIdx] || '');
        }
    };

    useEffect(() => {
        inputRef.current?.focus();
    }, [inputRef]);

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <span className="retro-text font-bold whitespace-nowrap" style={{ color: theme.primary }}>
                root@eb28:~$
            </span>
            <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent outline-none font-mono text-sm caret-current"
                style={{ color: theme.primary }}
                autoComplete="off"
                spellCheck="false"
            />
        </form>
    );
};

/* ───────────────────────── Main Dashboard ──────────────────────────── */
const Dashboard = () => {
    const [booted, setBooted] = useState(true);
    const [themeKey, setThemeKey] = useState('matrix');
    const [time, setTime] = useState(new Date());
    const [cmdHistory, setCmdHistory] = useState([]);
    const [cmdOutput, setCmdOutput] = useState([]);
    const cliInputRef = useRef(null);
    const [priorities, setPriorities] = useState([
        { id: 1, text: 'Finalize Q3 Strategy Deck', status: 'pending' },
        { id: 2, text: 'Review Enterprise Contracts', status: 'urgent' },
        { id: 3, text: 'Sync w/ Engineering Lead', status: 'done' },
    ]);

    const theme = THEMES[themeKey];

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatDate = (d) =>
        d.toLocaleString('en-US', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
        });

    const metrics = { revenue: '$124,500', calls: '42/50', conversion: '18.5%' };

    const pipeline = [
        { stage: 'Discovery', count: 12, value: '$45k' },
        { stage: 'Demo', count: 8, value: '$80k' },
        { stage: 'Negotiation', count: 3, value: '$120k' },
    ];

    const conflicts = [
        { time: '14:00', event1: 'Client Sync', event2: 'Internal Review' },
    ];

    const missedComms = [
        { type: 'Call', from: 'Sarah Jenkins', time: '10:45 AM' },
        { type: 'Email', from: 'Finance Dept', time: '11:20 AM', urgent: true },
    ];

    /* ── Command handler ── */
    const handleCommand = useCallback((raw) => {
        setCmdHistory(prev => [...prev, raw]);
        const trimmed = raw.trim();
        const firstSpace = trimmed.indexOf(' ');
        const cmd = (firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace)).toLowerCase();
        const arg = firstSpace === -1 ? '' : trimmed.slice(firstSpace + 1).trim();

        switch (cmd) {
            case 'help':
                setCmdOutput(prev => [
                    ...prev,
                    '> Available commands:',
                    '  theme [matrix|amber|cyberpunk]  – Switch color theme',
                    '  add <task description>          – Add a new priority',
                    '  done <task number>              – Mark priority as done',
                    '  clear                           – Clear command output',
                    '  status                          – Show system summary',
                    '  reboot                          – Replay boot sequence',
                    '  help                            – Show this message',
                ]);
                break;
            case 'theme':
                if (THEMES[arg.toLowerCase()]) {
                    const nextTheme = THEMES[arg.toLowerCase()];
                    setThemeKey(arg.toLowerCase());
                    setCmdOutput(prev => [...prev, `> Theme switched to ${nextTheme.name}`]);
                } else {
                    setCmdOutput(prev => [
                        ...prev,
                        `> Unknown theme "${arg}". Available: ${Object.keys(THEMES).join(', ')}`,
                    ]);
                }
                break;
            case 'add':
                if (arg) {
                    setPriorities(prev => [...prev, { id: Date.now(), text: arg, status: 'pending' }]);
                    setCmdOutput(prev => [...prev, `> Added priority: "${arg}"`]);
                } else {
                    setCmdOutput(prev => [...prev, '> Usage: add <task description>']);
                }
                break;
            case 'done': {
                const idx = parseInt(arg, 10) - 1;
                if (!isNaN(idx) && idx >= 0 && idx < priorities.length) {
                    setPriorities(prev => prev.map((p, i) => i === idx ? { ...p, status: 'done' } : p));
                    setCmdOutput(prev => [...prev, `> Marked task #${idx + 1} as done`]);
                } else {
                    setCmdOutput(prev => [...prev, '> Usage: done <task number>']);
                }
                break;
            }
            case 'clear':
                setCmdOutput([]);
                break;
            case 'status':
                setCmdOutput(prev => [
                    ...prev,
                    `> EB28.OS Status Report – ${formatDate(new Date())}`,
                    `  Theme: ${theme.name} | Priorities: ${priorities.length} | Pipeline value: $245k`,
                    `  Uptime: ${Math.floor((Date.now() % 86400000) / 3600000)}h ${Math.floor((Date.now() % 3600000) / 60000)}m`,
                ]);
                break;
            case 'reboot':
                setCmdOutput([]);
                setBooted(false);
                break;
            default:
                setCmdOutput(prev => [...prev, `> Unknown command: "${cmd}". Type "help" for options.`]);
        }
    }, [priorities.length, theme.name]);

    const handleRootClick = useCallback((event) => {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }

        if (target.closest('button, a, input, textarea, select, label, [role="button"], [contenteditable="true"]')) {
            return;
        }

        cliInputRef.current?.focus();
    }, []);

    /* ── Boot gate ── */
    if (!booted) {
        return <BootScreen onComplete={() => setBooted(true)} theme={theme} />;
    }

    return (
        <div
            className="min-h-screen font-mono p-4 md:p-8 relative overflow-hidden select-none"
            style={{ background: theme.bg, color: theme.primary }}
            onClick={handleRootClick}
        >
            {/* CRT Scanline Overlay */}
            <div className="absolute inset-0 crt-overlay"></div>

            {/* Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto relative z-10 flex flex-col gap-6">

                {/* Header */}
                <header
                    className="border-b-2 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 retro-text"
                    style={{ borderColor: theme.primary }}
                >
                    <div>
                        <h1 className="text-3xl md:text-5xl font-bold tracking-wider flex items-center gap-4">
                            <Terminal size={40} className="animate-pulse" />
                            EB28.OS
                        </h1>
                        <p className="text-sm mt-2 opacity-80 uppercase tracking-widest cursor-blink">
                            System Control Terminal v2.4
                        </p>
                    </div>
                    <div className="flex items-center gap-6">
                        {/* Theme Switcher */}
                        <div className="flex items-center gap-2 text-sm">
                            <Palette size={16} />
                            {Object.entries(THEMES).map(([key, t]) => (
                                <button
                                    key={key}
                                    onClick={(e) => { e.stopPropagation(); setThemeKey(key); }}
                                    className="w-4 h-4 rounded-full border-2 transition-transform hover:scale-125"
                                    style={{
                                        background: t.primary,
                                        borderColor: themeKey === key ? '#fff' : t.primary,
                                        transform: themeKey === key ? 'scale(1.3)' : 'scale(1)',
                                    }}
                                    title={t.name}
                                />
                            ))}
                        </div>
                        <div className="text-right text-lg md:text-xl">{formatDate(time)}</div>
                    </div>
                </header>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">

                    {/* ─── Priorities ─── */}
                    <div
                        className="border p-4 retro-text transition-all"
                        style={{ borderColor: theme.primary, background: theme.panelBg }}
                    >
                        <h2 className="text-xl font-bold mb-4 border-b pb-2 flex items-center gap-2"
                            style={{ borderColor: `${theme.primary}80` }}>
                            <Target size={20} /> TODAY'S PRIORITIES
                        </h2>
                        <ul className="space-y-3">
                            {priorities.map((p, idx) => (
                                <li key={p.id} className="flex items-start gap-3">
                                    <span className="opacity-40 text-xs mt-1">{idx + 1}.</span>
                                    <span className={`mt-0.5 ${p.status === 'urgent' ? '' : p.status === 'done' ? 'opacity-40' : ''}`}
                                        style={{ color: p.status === 'urgent' ? theme.danger : undefined }}>
                                        {p.status === 'done' ? '[X]' : '[ ]'}
                                    </span>
                                    <span className={
                                        p.status === 'urgent' ? 'animate-pulse' :
                                            p.status === 'done' ? 'line-through opacity-40' : ''
                                    } style={{ color: p.status === 'urgent' ? theme.danger : undefined }}>
                                        {p.text}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* ─── Sales Metrics ─── */}
                    <div
                        className="border p-4 retro-text transition-all"
                        style={{ borderColor: theme.primary, background: theme.panelBg }}
                    >
                        <h2 className="text-xl font-bold mb-4 border-b pb-2 flex items-center gap-2"
                            style={{ borderColor: `${theme.primary}80` }}>
                            <TrendingUp size={20} /> ZOHO / RINGCENTRAL
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="border p-2" style={{ borderColor: `${theme.primary}4d` }}>
                                <div className="text-xs opacity-70">MRR</div>
                                <div className="text-2xl">{metrics.revenue}</div>
                            </div>
                            <div className="border p-2" style={{ borderColor: `${theme.primary}4d` }}>
                                <div className="text-xs opacity-70">CALLS</div>
                                <div className="text-2xl">{metrics.calls}</div>
                            </div>
                            <div className="border p-2 col-span-2" style={{ borderColor: `${theme.primary}4d` }}>
                                <div className="text-xs opacity-70">CONVERSION</div>
                                <div className="text-2xl" style={{ color: theme.warn }}>{metrics.conversion}</div>
                            </div>
                        </div>
                    </div>

                    {/* ─── Pipeline ─── */}
                    <div
                        className="border p-4 retro-text transition-all"
                        style={{ borderColor: theme.primary, background: theme.panelBg }}
                    >
                        <h2 className="text-xl font-bold mb-4 border-b pb-2 flex items-center gap-2"
                            style={{ borderColor: `${theme.primary}80` }}>
                            <Activity size={20} /> PIPELINE STATUS
                        </h2>
                        <div className="space-y-4">
                            {pipeline.map((s, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>{s.stage} ({s.count})</span>
                                        <span>{s.value}</span>
                                    </div>
                                    <div className="h-2 w-full bg-black border overflow-hidden"
                                        style={{ borderColor: `${theme.primary}80` }}>
                                        <div className="h-full transition-all duration-700"
                                            style={{ width: `${(s.count / 20) * 100}%`, background: theme.primary }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ─── Missed Comms ─── */}
                    <div className="border p-4 retro-text"
                        style={{ borderColor: theme.danger, color: theme.danger, background: 'rgba(127,29,29,0.12)' }}>
                        <h2 className="text-xl font-bold mb-4 border-b pb-2 flex items-center gap-2"
                            style={{ borderColor: `${theme.danger}80` }}>
                            <PhoneMissed size={20} /> MISSED COMMS
                        </h2>
                        <ul className="space-y-3">
                            {missedComms.map((c, i) => (
                                <li key={i} className={`flex justify-between items-center ${c.urgent ? 'animate-pulse' : ''}`}>
                                    <div className="flex flex-col">
                                        <span className="font-bold">[{c.type}] {c.from}</span>
                                        <span className="text-xs opacity-80">{c.urgent ? 'URGENT' : 'Standard'}</span>
                                    </div>
                                    <span>{c.time}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* ─── Calendar Conflicts ─── */}
                    <div className="border p-4 retro-text"
                        style={{ borderColor: theme.warn, color: theme.warn, background: 'rgba(120,53,15,0.12)' }}>
                        <h2 className="text-xl font-bold mb-4 border-b pb-2 flex items-center gap-2"
                            style={{ borderColor: `${theme.warn}80` }}>
                            <CalendarIcon size={20} /> SCHEDULING CONFLICTS
                        </h2>
                        {conflicts.length > 0 ? (
                            <ul className="space-y-3">
                                {conflicts.map((c, i) => (
                                    <li key={i} className="flex flex-col border-l-2 pl-3"
                                        style={{ borderColor: theme.warn }}>
                                        <span className="text-lg font-bold">{c.time}</span>
                                        <span className="text-sm">ERR: {c.event1}</span>
                                        <span className="text-sm">ERR: {c.event2}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center py-4 opacity-50">NO CONFLICTS DETECTED</div>
                        )}
                    </div>

                    {/* ─── System Health ─── */}
                    <div
                        className="border p-4 retro-text transition-all"
                        style={{ borderColor: theme.primary, background: theme.panelBg }}
                    >
                        <h2 className="text-xl font-bold mb-4 border-b pb-2 flex items-center gap-2"
                            style={{ borderColor: `${theme.primary}80` }}>
                            <Terminal size={20} /> SYSTEM HEALTH
                        </h2>
                        <div className="space-y-2 text-sm">
                            {[
                                { label: 'Zoho API', status: 'ONLINE', ok: true },
                                { label: 'RingCentral', status: 'ONLINE', ok: true },
                                { label: 'IMAP Sync', status: 'LAGGING', ok: false },
                            ].map((s, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <span>{s.label}</span>
                                    <span className="flex items-center gap-1"
                                        style={{ color: s.ok ? theme.primary : theme.warn }}>
                                        {s.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                                        {s.status}
                                    </span>
                                </div>
                            ))}
                            <div className="flex justify-between"><span>DB Latency</span><span>24ms</span></div>
                            <div className="flex justify-between"><span>Memory Use</span><span>64%</span></div>
                        </div>
                    </div>

                </div>

                {/* ─── Activity Log (full width) ─── */}
                <ActivityLog theme={theme} />

                {/* ─── CLI Terminal ─── */}
                <div
                    id="cli-input"
                    className="border p-4 retro-text"
                    style={{ borderColor: theme.primary, background: theme.panelBg }}
                >
                    {cmdOutput.length > 0 && (
                        <div className="mb-3 space-y-1 text-sm max-h-32 overflow-y-auto scrollbar-hide">
                            {cmdOutput.map((line, i) => (
                                <div key={i} className="opacity-80 whitespace-pre">{line}</div>
                            ))}
                        </div>
                    )}
                    <CLIInput onCommand={handleCommand} theme={theme} history={cmdHistory} inputRef={cliInputRef} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
