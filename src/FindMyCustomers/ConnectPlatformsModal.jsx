import React from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, ChevronRight } from 'lucide-react';

const platforms = [
  { id: 'google', name: 'Google Ads', connected: true, color: 'var(--google-green)' },
  { id: 'meta', name: 'Meta (Facebook/IG)', connected: false, color: 'var(--meta-blue)' },
  { id: 'tiktok', name: 'TikTok Ads', connected: false, color: 'var(--tiktok-pink)' },
  { id: 'apple', name: 'Apple Search Ads', connected: false, color: 'var(--apple-gray)' },
  { id: 'x', name: 'X Ads', connected: false, color: 'var(--text-primary)' },
];

export default function ConnectPlatformsModal({ onClose }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-card"
        style={{ width: '100%', maxWidth: '500px', background: 'var(--bg-secondary)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem' }}>Connect Platforms</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>
        
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.5 }}>
          One-click secure authentication. Our browser agents will securely handshake with each platform API.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {platforms.map(platform => (
            <div key={platform.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1rem 1.5rem', borderRadius: '16px',
              background: 'var(--bg-glass)', border: '1px solid var(--border-glass)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: platform.color }}></div>
                <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{platform.name}</span>
              </div>
              {platform.connected ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--google-green)' }}>
                  <CheckCircle size={20} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Connected</span>
                </div>
              ) : (
                <button className="btn-glass" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Connect <ChevronRight size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
