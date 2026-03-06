import React, { useState, useEffect } from 'react';

const AGENTS = [
    { id: 'goldman', name: 'Goldman Fundamental', roles: ['trading-research', 'quant-analyst'], color: '#22d3ee', gridPos: { x: 0, y: 0 } },
    { id: 'jpm', name: 'JPM Technical', roles: ['crypto-levels', 'trading-research', 'ccxt'], color: '#818cf8', gridPos: { x: 1, y: 0 } },
    { id: 'ms', name: 'Morgan Stanley DCF', roles: ['quant-analyst', 'valuation-templates'], color: '#fbbf24', gridPos: { x: 2, y: 0 } },
    { id: 'bridgewater', name: 'Bridgewater Macro', roles: ['trading-research', 'polymarket-signal-sniper'], color: '#34d399', gridPos: { x: 3, y: 0 } },
    { id: 'cathie', name: 'Cathie Wood Disruption', roles: ['polymarket-signal-sniper', 'trading-research'], color: '#f472b6', gridPos: { x: 0, y: 1 } },
    { id: 'buffett', name: 'Buffett Value', roles: ['quant-analyst', 'trading-research'], color: '#94a3b8', gridPos: { x: 1, y: 1 } },
    { id: 'renaissance', name: 'Renaissance Quant', roles: ['polymarket-fast-loop', 'polymarket-ai-divergence', 'ccxt'], color: '#a78bfa', gridPos: { x: 2, y: 1 } },
    { id: 'blackrock', name: 'BlackRock Risk Matrix', roles: ['prediction-trade-journal', 'openclaw-security-monitor', 'risk-runbooks'], color: '#f87171', gridPos: { x: 3, y: 1 } },
    { id: 'lynch', name: 'Peter Lynch Deep Dive', roles: ['trading-research', 'polymarket-signal-sniper'], color: '#fb923c', gridPos: { x: 0, y: 2 } },
    { id: 'ackman', name: 'Bill Ackman Activist', roles: ['polymarket-signal-sniper', 'trading-research'], color: '#e879f9', gridPos: { x: 1, y: 2 } },
    { id: 'citadel', name: 'Citadel Options Architect', roles: ['funding-rate-trader', 'hummingbot'], color: '#2dd4bf', gridPos: { x: 2, y: 2 } },
    { id: 'sequoia', name: 'Sequoia VC Lens', roles: ['trading-research', 'quant-analyst'], color: '#4ade80', gridPos: { x: 3, y: 2 } },
];

const EXECUTION_ROLES = [
    { id: 'pm', name: 'PM Orchestrator', task: 'Combining outputs and optimizing capital allocation...', iconPos: { x: 0, y: 0 } },
    { id: 'exec', name: 'Execution Agent', task: 'Executing Polymarket & Kalshi trades...', iconPos: { x: 1, y: 0 } },
    { id: 'wallet', name: 'Wallet/Payments Ops', task: 'Managing crypto-wallet cycles and 1ly-payments...', iconPos: { x: 1, y: 1 } },
];

const STATUS_TYPES = ['ACTIVE', 'RESEARCHING', 'CALCULATING', 'IDLE', 'TRADING'];

const FundManager = () => {
    const [agentStatus, setAgentStatus] = useState({});
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        // Initialize statuses
        const initialStatus = {};
        AGENTS.forEach(agent => {
            initialStatus[agent.id] = {
                status: 'IDLE',
                task: 'Waiting for signal...',
                activity: 0
            };
        });
        setAgentStatus(initialStatus);

        // Simulation loop
        const interval = setInterval(() => {
            const randomAgent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
            const newStatus = STATUS_TYPES[Math.floor(Math.random() * STATUS_TYPES.length)];

            setAgentStatus(prev => ({
                ...prev,
                [randomAgent.id]: {
                    status: newStatus,
                    task: `Performing ${randomAgent.roles[Math.floor(Math.random() * randomAgent.roles.length)]}...`,
                    activity: Math.random() * 100
                }
            }));

            // Update logs
            const logEntry = `[${new Date().toLocaleTimeString()}] ${randomAgent.name.split(' ')[0].toUpperCase()}: ${newStatus} - Running ${randomAgent.roles[0]}`;
            setLogs(prev => [logEntry, ...prev].slice(0, 10));
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-[#020617] text-[#22d3ee] font-mono p-4 overflow-hidden relative selection:bg-[#22d3ee] selection:text-[#020617]">
            {/* CRT Scanline Overlay */}
            <div className="fixed inset-0 crt-overlay opacity-10 pointer-events-none z-50"></div>

            {/* Background Noise/Grid */}
            <div className="fixed inset-0 eb28-appbuilder-noise opacity-5 pointer-events-none"></div>

            {/* Header / PM Orchestrator */}
            <header className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-[#22d3ee]/20 pb-4">
                <div className="flex items-center gap-4">
                    <div className="text-4xl animate-pulse">ᗧ</div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tighter">FUNDMANAGER.EB28.CO</h1>
                        <p className="text-[10px] opacity-50 uppercase">Autonomous Trading Matrix v3.2</p>
                    </div>
                </div>

                <div className="md:col-span-2 flex items-center justify-end gap-6 text-[11px]">
                    <div className="flex flex-col items-end">
                        <span className="opacity-50">SYSTEM STATUS</span>
                        <span className="text-green-400">● NOMINAL</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="opacity-50">PORTFOLIO HEAT</span>
                        <span className="text-orange-400">OPERATIONAL</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="opacity-50">UPTIME</span>
                        <span className="text-blue-400">99.98%</span>
                    </div>
                </div>
            </header>

            {/* Main Grid: Research Agents */}
            <main className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20 overflow-y-auto custom-scrollbar h-[calc(100vh-280px)]">
                {AGENTS.map(agent => (
                    <div
                        key={agent.id}
                        className="eb28-panel border border-[#22d3ee]/10 p-3 hover:border-[#22d3ee]/40 transition-all group overflow-hidden relative"
                    >
                        {/* Status Indicator */}
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${agentStatus[agent.id]?.status === 'ACTIVE' || agentStatus[agent.id]?.status === 'TRADING' ? 'bg-green-400' : 'bg-yellow-400'
                                }`}></span>
                            <span className="text-[9px] font-bold opacity-70">{agentStatus[agent.id]?.status || 'IDLE'}</span>
                        </div>

                        <div className="flex items-start gap-4">
                            {/* Agent Avatar (Pixel Art Grid Slicing) */}
                            <div className="w-16 h-16 bg-[#0f172a] border border-[#22d3ee]/20 flex-shrink-0 pixel-art overflow-hidden rounded-sm ring-1 ring-[#22d3ee]/10">
                                <div
                                    className="w-full h-full bg-no-repeat grayscale group-hover:grayscale-0 transition-all duration-300 transform scale-110"
                                    style={{
                                        backgroundImage: `url('/assets/agents_grid.png')`,
                                        backgroundSize: '400% 300%',
                                        backgroundPosition: `${(agent.gridPos.x * 100) / 3}% ${(agent.gridPos.y * 100) / 2}%`
                                    }}
                                ></div>
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold truncate leading-tight mb-1" style={{ color: agent.color }}>
                                    {agent.name.toUpperCase()}
                                </h3>
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {agent.roles.map(role => (
                                        <span key={role} className="text-[8px] bg-[#22d3ee]/10 px-1 border border-[#22d3ee]/5 opacity-60">
                                            {role.replace('-', ' ')}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Task Activity Bar */}
                        <div className="mt-3">
                            <div className="flex justify-between items-center text-[9px] mb-1 opacity-70">
                                <span className="truncate w-3/4">{agentStatus[agent.id]?.task}</span>
                                <span>{Math.round(agentStatus[agent.id]?.activity || 0)}%</span>
                            </div>
                            <div className="w-full h-[3px] bg-slate-900 border border-[#22d3ee]/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#22d3ee] transition-all duration-1000"
                                    style={{ width: `${agentStatus[agent.id]?.activity || 0}%`, backgroundColor: agent.color }}
                                ></div>
                            </div>
                        </div>
                    </div>
                ))}
            </main>

            {/* Footer: Execution & Terminal */}
            <footer className="fixed bottom-0 left-0 right-0 h-48 bg-[#020617]/95 border-t border-[#22d3ee]/20 p-4 grid grid-cols-1 md:grid-cols-4 gap-6 z-40 backdrop-blur-xl">
                <div className="md:col-span-1 border-r border-[#22d3ee]/10 pr-4">
                    <h4 className="text-[10px] font-bold opacity-50 mb-3 tracking-widest uppercase flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-[#22d3ee] rounded-full"></span>
                        Execution Layer
                    </h4>
                    <div className="space-y-3">
                        {EXECUTION_ROLES.map(role => (
                            <div key={role.id} className="flex items-center gap-3 group">
                                <div className="w-8 h-8 rounded border border-[#22d3ee]/20 overflow-hidden pixel-art bg-[#0f172a]">
                                    <div
                                        className="w-full h-full bg-no-repeat"
                                        style={{
                                            backgroundImage: `url('/assets/execution_grid.png')`,
                                            backgroundSize: '200% 200%',
                                            backgroundPosition: `${role.iconPos.x * 100}% ${role.iconPos.y * 100}%`
                                        }}
                                    ></div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-bold group-hover:text-white transition-colors uppercase">{role.name}</div>
                                    <div className="text-[8px] opacity-60 truncate">{role.task}</div>
                                </div>
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="md:col-span-3">
                    <h4 className="text-[10px] font-bold opacity-50 mb-2 tracking-widest uppercase flex justify-between">
                        <span>Live System Telemetry</span>
                        <span className="text-red-500 animate-pulse">● REC</span>
                    </h4>
                    <div className="bg-[#22d3ee]/5 border border-[#22d3ee]/10 p-2 h-32 overflow-hidden text-[11px] font-mono leading-relaxed custom-scrollbar">
                        {logs.map((log, i) => (
                            <div key={i} className={`mb-1 ${i === 0 ? 'text-[#22d3ee]' : 'opacity-40'}`}>
                                <span className="opacity-30 mr-2 text-[9px]">{i === 0 ? '>' : ' '}</span>
                                {log}
                            </div>
                        ))}
                        <div className="cursor-blink opacity-60 text-[10px] mt-2 text-white/40">SYSTEM://RESOURCING_AGENT_MATRICES_...</div>
                    </div>
                </div>
            </footer>

            <style dangerouslySetInnerHTML={{
                __html: `
        .crt-overlay {
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%),
                      linear-gradient(90deg, rgba(255, 0, 0, .03), rgba(0, 255, 0, .01), rgba(0, 0, 255, .03));
          background-size: 100% 3px, 3px 100%;
        }
        .pixel-art {
          image-rendering: -moz-crisp-edges;
          image-rendering: -webkit-optimize-contrast;
          image-rendering: pixelated;
          image-rendering: optimize-speed;
        }
      `}} />
        </div>
    );
};

export default FundManager;
