import React from 'react';
import { User } from 'firebase/auth';
import { Search, LogIn, LogOut, User as UserIcon } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
}

export default function Navbar({ user, onLogin, onLogout }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 bg-warm-bg/80 backdrop-blur-md border-b border-olive/10" id="main-nav">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="font-serif text-2xl text-olive font-bold tracking-tight">
          FlavorFeed
        </div>

        <div className="flex-1 max-w-md mx-8 hidden sm:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-olive/40" size={18} />
            <input 
              type="text" 
              placeholder="Search recipes..." 
              className="w-full bg-white/50 border border-olive/10 rounded-full py-1.5 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-olive/30 transition-all"
              id="recipe-search"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold">{user.displayName}</p>
                <button 
                  onClick={onLogout}
                  className="text-[10px] uppercase tracking-wider text-olive/60 hover:text-olive transition-colors"
                >
                  Sign Out
                </button>
              </div>
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || ''} 
                  className="w-8 h-8 rounded-full border border-olive/20"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-olive/10 flex items-center justify-center text-olive">
                  <UserIcon size={16} />
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={onLogin}
              className="flex items-center gap-2 bg-olive text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-olive/90 transition-all shadow-sm"
              id="login-btn"
            >
              <LogIn size={16} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
