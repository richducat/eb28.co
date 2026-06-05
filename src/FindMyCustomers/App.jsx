import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowUp, Zap, Target, BarChart2 } from 'lucide-react';
import ConnectPlatformsModal from './ConnectPlatformsModal';
import { generateAdMasterResponse } from './agent';
import './index.css';

export default function App() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your AdMaster AI. What would you like to promote today? (e.g., 'Spend $50 a day selling these shoes to teenagers on TikTok and Instagram.')"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = { id: Date.now().toString(), role: 'user', content: inputValue };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInputValue('');
    setIsTyping(true);

    try {
      const responseText = await generateAdMasterResponse(inputValue, messages);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseText
        }
      ]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="findmycustomers-wrapper">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'var(--font-main)' }}>
        <header style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'var(--accent-gradient)', padding: '0.5rem', borderRadius: '12px' }}>
            <Zap color="white" size={24} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>AdMaster<span style={{ color: 'var(--tiktok-cyan)' }}>.ai</span></h1>
        </div>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-glass" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target size={18} /> Campaigns
          </button>
          <button className="btn-glass" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart2 size={18} /> Analytics
          </button>
          <button className="btn-primary" onClick={() => setShowConnectModal(true)}>Connect Platforms</button>
        </nav>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                }}
              >
                <div
                  className="glass-card"
                  style={{
                    padding: '1.5rem',
                    background: msg.role === 'user' ? 'rgba(255,255,255,0.1)' : 'var(--bg-glass)',
                    border: msg.role === 'user' ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border-glass)',
                  }}
                >
                  {msg.role === 'assistant' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--tiktok-cyan)' }}>
                      <Sparkles size={18} />
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>AdMaster Agent</span>
                    </div>
                  )}
                  <p style={{ lineHeight: 1.6, fontSize: '1.1rem' }}>{msg.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ alignSelf: 'flex-start' }}
            >
              <div className="glass-card" style={{ padding: '1rem 1.5rem', display: 'flex', gap: '0.5rem' }}>
                <span className="dot" style={{ width: 8, height: 8, background: 'var(--text-secondary)', borderRadius: '50%', animation: 'fadeIn 1s infinite alternate' }}></span>
                <span className="dot" style={{ width: 8, height: 8, background: 'var(--text-secondary)', borderRadius: '50%', animation: 'fadeIn 1s infinite alternate 0.2s' }}></span>
                <span className="dot" style={{ width: 8, height: 8, background: 'var(--text-secondary)', borderRadius: '50%', animation: 'fadeIn 1s infinite alternate 0.4s' }}></span>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <footer style={{ padding: '2rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-glass)' }}>
        <form onSubmit={handleSubmit} className="chat-input-wrapper">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your campaign idea..."
            className="chat-input"
          />
          <button type="submit" className="chat-submit" disabled={!inputValue.trim() || isTyping}>
            <ArrowUp size={24} />
          </button>
        </form>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '1rem' }}>
          AdMaster AI can make mistakes. Please review budgets before deploying.
        </p>
      </footer>

        <AnimatePresence>
          {showConnectModal && <ConnectPlatformsModal onClose={() => setShowConnectModal(false)} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
