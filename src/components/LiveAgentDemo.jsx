import React, { useState, useEffect, useRef } from 'react';
import { Bot, ShieldCheck, MessageSquare, Lock } from 'lucide-react';

const LiveAgentDemo = ({ scrollToSection }) => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [options, setOptions] = useState([]);
  const [hasStarted, setHasStarted] = useState(false);
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    const container = chatContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isTyping]);

  const addMessage = (text, type = 'bot', nextOptions = []) => {
    if (type === 'bot') {
      const chunks = text.split('\n\n').filter(Boolean);
      let delay = 0;

      chunks.forEach((chunk, index) => {
        const isLast = index === chunks.length - 1;

        setTimeout(() => {
          setIsTyping(true);
          setTimeout(() => {
            setIsTyping(false);
            setMessages((prev) => [...prev, { text: chunk, type: 'bot' }]);
            if (isLast) setOptions(nextOptions);
          }, 1200);
        }, delay);

        delay += 2000;
      });
    } else {
      setMessages((prev) => [...prev, { text, type }]);
      setOptions([]);
    }
  };

  const startDemo = () => {
    setHasStarted(true);
    addMessage(
      "Hello! I am an autonomous AI Agent built by EB 28.\n\nI'm actively running on this site right now to demonstrate our capabilities. What would you like to explore?",
      'bot',
      [
        { label: 'Cost Savings & Roles', next: 'costs' },
        { label: 'Employee Augmentation', next: 'augmentation' },
        { label: 'Build a System', next: 'build' },
      ]
    );
  };

  const handleOption = (opt) => {
    addMessage(opt.label, 'user');

    if (opt.next === 'costs') {
      addMessage(
        'Custom LLMs can autonomously execute complex tasks that traditionally require full-time staff.\n\nBased on US national averages, we frequently automate workflows corresponding to:\n- L1 Customer Support ($45,000/yr)\n- Sales Dev Rep / Lead Qual ($65,000/yr)\n- Intake & Data Entry ($40,000/yr)\n\nOur systems deploy for a fraction of that cost, operating 24/7/365 with zero sick days.',
        'bot',
        [
          { label: 'Will this replace my staff?', next: 'augmentation' },
          { label: "Let's build one.", next: 'build' },
        ]
      );
    }

    if (opt.next === 'augmentation') {
      addMessage(
        "That's a great question. Actually, our core philosophy isn't replacement - it's augmentation.\n\nWe understand that most business owners value their team and don't want to let them go. Our goal isn't to fire your staff; it's to give them superpowers.\n\nOur AI models act as intelligent co-pilots for your current employees. By offloading repetitive work (answering FAQs, formatting data, qualifying leads), your staff becomes more productive and can focus on strategy, closing deals, and driving real revenue.",
        'bot',
        [
          { label: 'That sounds perfect.', next: 'build' },
          { label: 'Show me infrastructure options.', action: 'scroll-services' },
        ]
      );
    }

    if (opt.next === 'build') {
      addMessage(
        'Excellent. We can start small with a $10 proof-of-concept, or architect a fully private on-premise AI server tailored to your data.\n\nShall I direct you to the intake form?',
        'bot',
        [
          { label: "Yes, let's start.", action: 'scroll-contact' },
          { label: 'View $10 Offer', action: 'scroll-packages' },
        ]
      );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[600px] w-full max-w-4xl mx-auto relative z-20">
      <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-blue-900/50 border border-blue-500 flex items-center justify-center text-blue-400">
              <Bot size={20} />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-800 rounded-full animate-pulse"></div>
          </div>
          <div>
            <p className="text-white font-bold text-sm">EB 28 Autonomous Agent</p>
            <p className="text-slate-400 text-xs font-medium">Live Demonstration • Private Server</p>
          </div>
        </div>
        <div className="bg-blue-900/30 border border-blue-500/30 px-3 py-1 rounded-full text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
          <ShieldCheck size={12} /> Encrypted
        </div>
      </div>

      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-900 custom-scrollbar">
        {!hasStarted ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-20 h-20 bg-blue-900/20 rounded-full flex items-center justify-center mb-6">
              <MessageSquare className="text-blue-500 w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Experience the AI</h2>
            <p className="text-slate-400 text-sm max-w-md mb-8">
              Interact with our live agent to see how custom LLMs handle logic, objections, and sales routing autonomously.
            </p>
            <button
              onClick={startDemo}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-blue-600/20"
            >
              Initialize Agent
            </button>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`
                    max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                    ${
                      msg.type === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-900/20'
                        : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-none'
                    }
                  `}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl rounded-bl-none flex gap-1 items-center h-[52px]">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {hasStarted && (
        <div className="p-4 bg-slate-800 border-t border-slate-700 shrink-0 min-h-[90px] flex items-center justify-center">
          {options.length > 0 ? (
            <div className="flex flex-wrap gap-2 justify-center w-full">
              {options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (opt.action && scrollToSection) {
                      if (opt.action === 'scroll-contact') scrollToSection('contact');
                      else if (opt.action === 'scroll-services') scrollToSection('services');
                      else if (opt.action === 'scroll-packages') scrollToSection('packages');
                    } else {
                      handleOption(opt);
                    }
                  }}
                  className="bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm active:scale-95"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic flex items-center gap-2">
              <Lock size={12} /> Agent is processing...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveAgentDemo;
