import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { registerAccount, loginAccountWithPassword } from '../api/client';
import { UserPlus, LogIn, Lock, Mail, User as UserIcon, Eye, EyeOff, CheckCircle2, AlertCircle, X, Compass, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'register' | 'login';
  promptReason?: string | null;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'register',
  promptReason = null,
  onClose,
  onSuccess
}) => {
  const [mode, setMode] = useState<'register' | 'login'>(initialMode);
  
  // Register state
  const [regUsername, setRegUsername] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Login state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setMode(initialMode);
    setErrorMsg('');
    setSuccessMsg('');
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMsg('Please enter a username, email, and password.');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await registerAccount({
        username: regUsername.trim(),
        displayName: regDisplayName.trim() || regUsername.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword.trim()
      });

      setSuccessMsg(res.message || 'Account created successfully!');
      setTimeout(() => {
        onSuccess(res.user);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setErrorMsg('Please enter your username/email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await loginAccountWithPassword({
        usernameOrEmail: loginIdentifier.trim(),
        password: loginPassword.trim()
      });

      setSuccessMsg(res.message || 'Signed in successfully!');
      setTimeout(() => {
        onSuccess(res.user);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid login credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick demo persona login
  const handleQuickDemo = (demo: { id: string; email: string; name: string }) => {
    onSuccess(demo);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Close */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-950 text-white flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-900 leading-tight">
                {mode === 'register' ? 'Create Camper Account' : 'Camper Log In'}
              </h3>
              <p className="text-[11px] text-neutral-400">GAMPING multi-group coordination</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reason / Prompt notice if triggered by protected action */}
        {promptReason && (
          <div className="mx-6 mt-4 p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Sign In Required</span>
              <span>{promptReason}</span>
            </div>
          </div>
        )}

        {/* Tabs: Create Account vs Log In */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 p-1 bg-neutral-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2 rounded-lg transition text-center ${
                mode === 'register'
                  ? 'bg-white text-neutral-950 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2 rounded-lg transition text-center ${
                mode === 'login'
                  ? 'bg-white text-neutral-950 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Log In
            </button>
          </div>
        </div>

        {/* Error / Success Notifications */}
        <div className="px-6 pt-3">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Form Body */}
        <div className="p-6 pt-3">
          {mode === 'register' ? (
            /* CREATE ACCOUNT FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="e.g. outdoor_camper"
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Full / Display Name
                </label>
                <input
                  type="text"
                  value={regDisplayName}
                  onChange={(e) => setRegDisplayName(e.target.value)}
                  placeholder="e.g. Jordan Miller"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="jordan@example.com"
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full text-xs pl-9 pr-9 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-neutral-950 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isLoading ? 'Creating Account...' : 'Create Account'}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                  }}
                  className="text-xs text-neutral-500 hover:text-neutral-900 transition"
                >
                  Already have an account? <span className="font-semibold underline">Log in</span>
                </button>
              </div>
            </form>
          ) : (
            /* LOG IN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Username or Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="alex.camper@gmail.com or username"
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full text-xs pl-9 pr-9 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-neutral-950 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{isLoading ? 'Signing In...' : 'Log In'}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg('');
                  }}
                  className="text-xs text-neutral-500 hover:text-neutral-900 transition"
                >
                  Don't have an account yet? <span className="font-semibold underline">Create account</span>
                </button>
              </div>
            </form>
          )}

          {/* Quick Demo Personas Shortcut */}
          <div className="mt-5 pt-4 border-t border-neutral-100">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2 text-center">
              Quick 1-Click Demo Login
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo({ id: 'usr_host', email: 'alex.camper@gmail.com', name: 'Alex Rivers (Host)' })}
                className="p-2 rounded-lg border border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50 transition text-left"
              >
                <div className="font-semibold text-neutral-900 text-[11px] truncate">Alex Rivers</div>
                <div className="text-[10px] text-neutral-400 truncate">Trip Host</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo({ id: 'usr_sara', email: 'sara.k@gmail.com', name: 'Sara Kelly (Group Alpha)' })}
                className="p-2 rounded-lg border border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50 transition text-left"
              >
                <div className="font-semibold text-neutral-900 text-[11px] truncate">Sara Kelly</div>
                <div className="text-[10px] text-neutral-400 truncate">Group Alpha</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo({ id: 'usr_elena', email: 'elena.v@gmail.com', name: 'Elena Vance (Group Bravo)' })}
                className="p-2 rounded-lg border border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50 transition text-left"
              >
                <div className="font-semibold text-neutral-900 text-[11px] truncate">Elena Vance</div>
                <div className="text-[10px] text-neutral-400 truncate">Group Bravo</div>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
