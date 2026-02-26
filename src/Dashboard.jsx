import React, { useState, useEffect } from 'react';
import { Terminal, Activity, Calendar as CalendarIcon, PhoneMissed, Target, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

const Dashboard = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Mock Data
  const priorities = [
    { id: 1, text: "Finalize Q3 Strategy Deck", status: "pending" },
    { id: 2, text: "Review Enterprise Contracts", status: "urgent" },
    { id: 3, text: "Sync w/ Engineering Lead", status: "done" },
  ];

  const metrics = {
    revenue: "$124,500",
    calls: "42/50",
    conversion: "18.5%"
  };

  const pipeline = [
    { stage: "Discovery", count: 12, value: "$45k" },
    { stage: "Demo", count: 8, value: "$80k" },
    { stage: "Negotiation", count: 3, value: "$120k" }
  ];

  const conflicts = [
    { time: "14:00", event1: "Client Sync", event2: "Internal Review" }
  ];

  const missedComms = [
    { type: "Call", from: "Sarah Jenkins", time: "10:45 AM" },
    { type: "Email", from: "Finance Dept", time: "11:20 AM", urgent: true }
  ];

  return (
    <div className="min-h-screen bg-black text-[#39ff14] font-mono p-4 md:p-8 relative overflow-hidden select-none">
      {/* CRT Scanline Overlay */}
      <div className="absolute inset-0 crt-overlay"></div>
      
      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10 flex flex-col gap-6">
        
        {/* Header */}
        <header className="border-b-2 border-[#39ff14] pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 retro-text">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-wider flex items-center gap-4">
              <Terminal size={40} className="animate-pulse" />
              EB28.OS
            </h1>
            <p className="text-sm mt-2 opacity-80 uppercase tracking-widest cursor-blink">System Control Terminal v2.4</p>
          </div>
          <div className="text-right text-lg md:text-xl">
            {formatDate(time)}
          </div>
        </header>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">

          {/* Priorities Panel */}
          <div className="border border-[#39ff14] bg-black/50 p-4 retro-text transition-all hover:bg-[#39ff14]/5">
            <h2 className="text-xl font-bold mb-4 border-b border-[#39ff14]/50 pb-2 flex items-center gap-2">
              <Target size={20} />
              TODAY'S PRIORITIES
            </h2>
            <ul className="space-y-3">
              {priorities.map(p => (
                <li key={p.id} className="flex items-start gap-3">
                  <span className={`mt-1 ${p.status === 'urgent' ? 'text-red-500' : p.status === 'done' ? 'text-gray-500' : ''}`}>
                    {p.status === 'done' ? '[X]' : '[ ]'}
                  </span>
                  <span className={`${p.status === 'urgent' ? 'text-red-500 animate-pulse' : ''} ${p.status === 'done' ? 'line-through text-gray-500' : ''}`}>
                    {p.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Sales Metrics Panel */}
          <div className="border border-[#39ff14] bg-black/50 p-4 retro-text transition-all hover:bg-[#39ff14]/5">
            <h2 className="text-xl font-bold mb-4 border-b border-[#39ff14]/50 pb-2 flex items-center gap-2">
              <TrendingUp size={20} />
              ZOHO / RINGCENTRAL
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-[#39ff14]/30 p-2">
                <div className="text-xs opacity-70">MRR</div>
                <div className="text-2xl">{metrics.revenue}</div>
              </div>
              <div className="border border-[#39ff14]/30 p-2">
                <div className="text-xs opacity-70">CALLS</div>
                <div className="text-2xl">{metrics.calls}</div>
              </div>
              <div className="border border-[#39ff14]/30 p-2 col-span-2">
                <div className="text-xs opacity-70">CONVERSION</div>
                <div className="text-2xl text-amber-400">{metrics.conversion}</div>
              </div>
            </div>
          </div>

          {/* Pipeline Panel */}
          <div className="border border-[#39ff14] bg-black/50 p-4 retro-text transition-all hover:bg-[#39ff14]/5">
            <h2 className="text-xl font-bold mb-4 border-b border-[#39ff14]/50 pb-2 flex items-center gap-2">
              <Activity size={20} />
              PIPELINE STATUS
            </h2>
            <div className="space-y-4">
              {pipeline.map((stage, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{stage.stage} ({stage.count})</span>
                    <span>{stage.value}</span>
                  </div>
                  <div className="h-2 w-full bg-black border border-[#39ff14]/50 overflow-hidden">
                    <div 
                      className="h-full bg-[#39ff14]" 
                      style={{ width: `${(stage.count / 20) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comms & Calendar Group */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Missed Comms */}
            <div className="border border-red-500 text-red-500 bg-red-950/20 p-4 retro-text">
              <h2 className="text-xl font-bold mb-4 border-b border-red-500/50 pb-2 flex items-center gap-2">
                <PhoneMissed size={20} />
                MISSED COMMS
              </h2>
              <ul className="space-y-3 relative">
                {missedComms.map((comm, i) => (
                  <li key={i} className={`flex justify-between items-center ${comm.urgent ? 'animate-pulse' : ''}`}>
                    <div className="flex flex-col">
                      <span className="font-bold">[{comm.type}] {comm.from}</span>
                      <span className="text-xs opacity-80">{comm.urgent ? 'URGENT' : 'Standard'}</span>
                    </div>
                    <span>{comm.time}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Calendar Conflicts */}
            <div className="border border-amber-500 text-amber-500 bg-amber-950/20 p-4 retro-text">
              <h2 className="text-xl font-bold mb-4 border-b border-amber-500/50 pb-2 flex items-center gap-2">
                <CalendarIcon size={20} />
                SCHEDULING CONFLICTS
              </h2>
              {conflicts.length > 0 ? (
                <ul className="space-y-3">
                  {conflicts.map((c, i) => (
                    <li key={i} className="flex flex-col border-l-2 border-amber-500 pl-3">
                      <span className="text-lg font-bold">{c.time}</span>
                      <span className="text-sm">ERR: {c.event1}</span>
                      <span className="text-sm">ERR: {c.event2}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-4 text-amber-500/50">NO CONFLICTS DETECTED</div>
              )}
            </div>

          </div>

          {/* System Health */}
          <div className="border border-[#39ff14] bg-black/50 p-4 retro-text transition-all hover:bg-[#39ff14]/5">
            <h2 className="text-xl font-bold mb-4 border-b border-[#39ff14]/50 pb-2 flex items-center gap-2">
              <Terminal size={20} />
              SYSTEM HEALTH
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span>Zoho API</span>
                <span className="flex items-center gap-1 text-[#39ff14]"><CheckCircle2 size={14}/> ONLINE</span>
              </div>
              <div className="flex justify-between items-center">
                <span>RingCentral Trunk</span>
                <span className="flex items-center gap-1 text-[#39ff14]"><CheckCircle2 size={14}/> ONLINE</span>
              </div>
              <div className="flex justify-between items-center">
                <span>IMAP Sync</span>
                <span className="flex items-center gap-1 text-amber-500"><AlertTriangle size={14}/> LAGGING</span>
              </div>
              <div className="flex justify-between items-center">
                <span>DB Latency</span>
                <span>24ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Memory Use</span>
                <span>64%</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
