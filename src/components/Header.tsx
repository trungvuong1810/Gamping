import React, { useState } from 'react';
import { User, Trip } from '../types';
import { Compass, Users, User as UserIcon, Calendar, Lock, CheckCircle2, ChevronDown, LogIn, UserPlus, LogOut } from 'lucide-react';

interface HeaderProps {
  currentUser: User | null;
  isSignedIn: boolean;
  onSelectUser: (user: User) => void;
  availableUsers: User[];
  currentTrip?: Trip | null;
  onNavigate: (view: 'home' | 'trip' | 'host' | 'join' | 'account') => void;
  currentView: string;
  onOpenCreateAccount: () => void;
  onOpenLogIn: (reason?: string) => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  isSignedIn,
  onSelectUser,
  availableUsers,
  currentTrip,
  onNavigate,
  currentView,
  onOpenCreateAccount,
  onOpenLogIn,
  onSignOut
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [customEmail, setCustomEmail] = useState('');

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    const name = customEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    onSelectUser({
      id: `usr_${Date.now()}`,
      email: customEmail.trim().toLowerCase(),
      name
    });
    setCustomEmail('');
    setShowUserDropdown(false);
  };

  const handleAccountClick = () => {
    if (!isSignedIn || !currentUser) {
      onOpenLogIn('Please sign in or create an account to view your Account & History.');
      return;
    }
    onNavigate('account');
  };

  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Brand / Home navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 text-left group transition"
            id="header-brand-btn"
          >
            <div className="w-8 h-8 rounded-lg bg-neutral-950 text-white flex items-center justify-center font-bold tracking-tight text-sm">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold tracking-tight text-neutral-950 text-base">GAMPING</span>
              <span className="hidden sm:inline-block ml-2 text-xs text-neutral-400 font-mono">multi-group</span>
            </div>
          </button>

          {currentTrip && currentView === 'trip' && (
            <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-neutral-200 text-sm">
              <span className="text-neutral-400">/</span>
              <span className="font-medium text-neutral-800 truncate max-w-xs">{currentTrip.title}</span>
            </div>
          )}
        </div>

        {/* Action navigation */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => {
              if (!isSignedIn) {
                onOpenLogIn('Please sign in or create an account to host a trip.');
                return;
              }
              onNavigate('host');
            }}
            id="header-create-trip-btn"
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition ${
              currentView === 'host'
                ? 'bg-neutral-950 text-white'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            + Host Trip
          </button>

          {/* Account & History Button - checks sign in state */}
          <button
            onClick={handleAccountClick}
            id="header-account-btn"
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition ${
              currentView === 'account'
                ? 'bg-neutral-950 text-white'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            Account & History
          </button>

          {/* Logged Out Controls: Create Account & Log In */}
          {!isSignedIn || !currentUser ? (
            <div className="flex items-center gap-1.5 sm:gap-2 ml-1">
              <button
                type="button"
                onClick={() => onOpenLogIn()}
                id="header-login-btn"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950 transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In</span>
              </button>

              <button
                type="button"
                onClick={onOpenCreateAccount}
                id="header-create-account-btn"
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-neutral-950 text-white hover:bg-neutral-800 shadow-xs transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Account</span>
              </button>
            </div>
          ) : (
            /* Logged In User Profile & Persona Switcher */
            <div className="relative ml-1 sm:ml-2">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                id="header-user-switcher-btn"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 transition text-xs"
                title="Account menu and camper switcher"
              >
                <div className="w-5 h-5 rounded-full bg-neutral-950 text-white flex items-center justify-center text-[10px] font-semibold">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'C'}
                </div>
                <span className="font-medium text-neutral-800 hidden sm:inline-block max-w-[110px] truncate">
                  {currentUser.name || currentUser.email}
                </span>
                <ChevronDown className="w-3 h-3 text-neutral-400" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-neutral-200 py-2 z-50">
                  <div className="px-3 py-2 border-b border-neutral-100">
                    <div className="text-xs font-semibold text-neutral-900">{currentUser.name}</div>
                    <div className="text-xs text-neutral-500 truncate">{currentUser.email}</div>
                    <div className="text-[11px] text-neutral-400 mt-1">
                      Signed in camper
                    </div>
                  </div>

                  <div className="p-2 border-b border-neutral-100">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onNavigate('account');
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950 transition flex items-center justify-between"
                    >
                      <span>View Account & Past Trips</span>
                      <ChevronDown className="w-3 h-3 -rotate-90 text-neutral-400" />
                    </button>
                  </div>

                  {/* Switch Camper / Test Personas */}
                  <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Switch Camper (Demo)
                  </div>
                  <div className="py-1 max-h-36 overflow-y-auto">
                    {availableUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          onSelectUser(u);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-neutral-50 transition ${
                          u.id === currentUser.id ? 'bg-neutral-100/70 font-semibold text-neutral-950' : 'text-neutral-700'
                        }`}
                      >
                        <div className="truncate">
                          <div>{u.name}</div>
                          <div className="text-[10px] text-neutral-400">{u.email}</div>
                        </div>
                        {u.id === currentUser.id && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900 shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="p-2 border-t border-neutral-100 bg-neutral-50/50">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        onSignOut();
                      }}
                      id="header-signout-btn"
                      className="w-full py-1.5 px-3 text-xs text-red-600 hover:bg-red-50 rounded-lg font-medium flex items-center justify-center gap-1.5 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </header>
  );
};

