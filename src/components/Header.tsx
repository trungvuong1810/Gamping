import React, { useState } from 'react';
import { User, Trip } from '../types';
import { Compass, Users, User as UserIcon, Calendar, Lock, CheckCircle2, ChevronDown, LogIn, UserPlus, LogOut, Menu, X, PlusCircle, History, KeyRound } from 'lucide-react';

interface HeaderProps {
  currentUser: User | null;
  isSignedIn: boolean;
  onSelectUser: (user: User) => void;
  availableUsers: User[];
  currentTrip?: Trip | null;
  onNavigate: (view: 'home' | 'trip' | 'host' | 'join' | 'account') => void;
  currentView: string;
  onOpenCreateAccount: (reason?: string, nextView?: 'home' | 'host' | 'join' | 'trip' | 'account') => void;
  onOpenLogIn: (reason?: string, nextView?: 'home' | 'host' | 'join' | 'trip' | 'account') => void;
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleAccountClick = () => {
    if (!isSignedIn || !currentUser) {
      onOpenLogIn('Please sign in or create an account to view your Account & History.');
      return;
    }
    onNavigate('account');
    setMobileMenuOpen(false);
  };

  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-40 shadow-2xs">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Brand / Home navigation */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => {
              onNavigate('home');
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-2 text-left group transition min-h-[44px] py-1"
            id="header-brand-btn"
          >
            <div className="w-9 h-9 rounded-xl bg-neutral-950 text-white flex items-center justify-center font-bold tracking-tight text-sm shadow-xs">
              <Compass className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="font-semibold tracking-tight text-neutral-950 text-base sm:text-lg">GAMPING</span>
              <span className="hidden sm:inline-block ml-2 text-xs text-neutral-400 font-mono">multi-group</span>
            </div>
          </button>

          {currentTrip && currentView === 'trip' && (
            <div className="hidden md:flex items-center gap-2 ml-3 pl-3 border-l border-neutral-200 text-xs sm:text-sm">
              <span className="text-neutral-400">/</span>
              <span className="font-medium text-neutral-800 truncate max-w-[160px] lg:max-w-xs">{currentTrip.title}</span>
            </div>
          )}
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => {
              if (!isSignedIn) {
                onOpenLogIn('Please sign in or create an account to host a trip.', 'host');
                return;
              }
              onNavigate('host');
            }}
            id="header-create-trip-btn"
            className={`min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition flex items-center gap-1.5 ${
              currentView === 'host'
                ? 'bg-neutral-950 text-white'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Host Trip</span>
          </button>

          {/* Join Trip Button */}
          <button
            onClick={() => {
              if (!isSignedIn) {
                onOpenLogIn('Please log in with your Name & 4-digit PIN before joining a trip. If you do not have an account yet, you can create one quickly.', 'join');
                return;
              }
              onNavigate('join');
            }}
            id="header-join-trip-btn"
            className={`min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition flex items-center gap-1.5 ${
              currentView === 'join'
                ? 'bg-neutral-950 text-white'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <KeyRound className="w-4 h-4 text-amber-600" />
            <span>Join Trip</span>
          </button>

          {/* Account & History Button */}
          <button
            onClick={handleAccountClick}
            id="header-account-btn"
            className={`min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition flex items-center gap-1.5 ${
              currentView === 'account'
                ? 'bg-neutral-950 text-white'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Account & History</span>
          </button>

          {/* Logged Out Controls */}
          {!isSignedIn || !currentUser ? (
            <div className="flex items-center gap-2 ml-1">
              <button
                type="button"
                onClick={() => onOpenLogIn()}
                id="header-login-btn"
                className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl text-neutral-700 hover:bg-neutral-100 transition"
              >
                <LogIn className="w-4 h-4" />
                <span>Log In</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenCreateAccount()}
                id="header-create-account-btn"
                className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 shadow-xs transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </button>
            </div>
          ) : (
            /* Logged In User Profile Switcher */
            <div className="relative ml-1">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                id="header-user-switcher-btn"
                className="min-h-[44px] flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 transition text-xs font-medium"
                title="Account menu & camper switcher"
              >
                <div className="w-6 h-6 rounded-full bg-neutral-950 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'C'}
                </div>
                <span className="font-semibold text-neutral-800 max-w-[120px] truncate">
                  {currentUser.name || currentUser.email}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-neutral-200 py-2 z-50">
                  <div className="px-4 py-2.5 border-b border-neutral-100">
                    <div className="text-xs font-bold text-neutral-900">{currentUser.name}</div>
                    <div className="text-xs text-neutral-500 truncate">{currentUser.email}</div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">Signed in camper</div>
                  </div>

                  <div className="p-2 border-b border-neutral-100">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onNavigate('account');
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold rounded-xl text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950 transition flex items-center justify-between min-h-[40px]"
                    >
                      <span>View Account & Past Trips</span>
                      <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-neutral-400" />
                    </button>
                  </div>

                  <div className="p-2 bg-neutral-50/50">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        onSignOut();
                      }}
                      id="header-signout-btn"
                      className="w-full py-2 px-3 text-xs text-red-600 hover:bg-red-50 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition min-h-[40px]"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Header Controls (< md:) */}
        <div className="flex md:hidden items-center gap-1.5">
          <button
            onClick={() => {
              if (!isSignedIn) {
                onOpenLogIn('Please sign in or create an account to host a trip.');
                return;
              }
              onNavigate('host');
            }}
            className={`min-h-[44px] min-w-[44px] px-2.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1 transition ${
              currentView === 'host' ? 'bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-800'
            }`}
            title="Host new trip"
          >
            <PlusCircle className="w-4 h-4 text-amber-500" />
            <span className="text-[11px]">Host</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 flex items-center justify-center transition"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Overlay & Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-4 py-4 space-y-4 animate-in slide-in-from-top-2 duration-150 shadow-lg">
          
          {currentTrip && currentView === 'trip' && (
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center gap-2 text-xs text-neutral-700">
              <span className="font-semibold text-neutral-950">Active Trip:</span>
              <span className="truncate">{currentTrip.title}</span>
            </div>
          )}

          {/* Mobile primary links */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onNavigate('home');
                setMobileMenuOpen(false);
              }}
              className={`min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition ${
                currentView === 'home' ? 'bg-neutral-950 text-white border-neutral-950' : 'bg-neutral-50 text-neutral-800 border-neutral-200'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Clearing</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (!isSignedIn) {
                  onOpenLogIn('Please sign in or create an account to host a trip.', 'host');
                  return;
                }
                onNavigate('host');
              }}
              className={`min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition ${
                currentView === 'host' ? 'bg-neutral-950 text-white border-neutral-950' : 'bg-neutral-50 text-neutral-800 border-neutral-200'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Host Trip</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (!isSignedIn) {
                  onOpenLogIn('Please log in with your Name & 4-digit PIN before joining a trip. If you do not have an account yet, you can create one quickly.', 'join');
                  return;
                }
                onNavigate('join');
              }}
              className={`min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition ${
                currentView === 'join' ? 'bg-neutral-950 text-white border-neutral-950' : 'bg-neutral-50 text-neutral-800 border-neutral-200'
              }`}
            >
              <KeyRound className="w-4 h-4 text-amber-600" />
              <span>Join Trip</span>
            </button>

            <button
              onClick={handleAccountClick}
              className={`min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition ${
                currentView === 'account' ? 'bg-neutral-950 text-white border-neutral-950' : 'bg-neutral-50 text-neutral-800 border-neutral-200'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Account & History</span>
            </button>
          </div>

          {/* Authentication & User controls */}
          {!isSignedIn || !currentUser ? (
            <div className="space-y-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLogIn();
                }}
                className="w-full min-h-[44px] py-2.5 px-4 text-xs font-semibold rounded-xl border border-neutral-200 bg-white text-neutral-800 flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Log In to Existing Account</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenCreateAccount();
                }}
                className="w-full min-h-[44px] py-2.5 px-4 text-xs font-semibold rounded-xl bg-neutral-950 text-white flex items-center justify-center gap-2 shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create New Camper Account</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-2 border-t border-neutral-100">
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-neutral-900">{currentUser.name}</div>
                  <div className="text-[11px] text-neutral-500 truncate">{currentUser.email}</div>
                </div>
                <div className="w-7 h-7 rounded-full bg-neutral-950 text-white flex items-center justify-center text-xs font-bold">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'C'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSignOut();
                }}
                className="w-full min-h-[44px] py-2.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-xl font-semibold flex items-center justify-center gap-2 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}

        </div>
      )}
    </header>
  );
};


