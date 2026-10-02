import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { loginOrRegisterWithPin } from '../api/client';
import { UserPlus, LogIn, Lock, User as UserIcon, CheckCircle2, AlertCircle, X, Compass, KeyRound } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'register' | 'login';
  promptReason?: string | null;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  promptReason = null,
  onClose,
  onSuccess
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter your Name.');
      return;
    }
    if (!/^\d{4}$/.test(pin.trim())) {
      setErrorMsg('Please enter a 4-digit PIN (numbers only, e.g. 1234).');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await loginOrRegisterWithPin({
        name: name.trim(),
        pin: pin.trim()
      });

      setSuccessMsg(res.message || (mode === 'register' ? 'Account created successfully!' : 'Welcome back!'));
      setTimeout(() => {
        onSuccess(res.user);
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to authenticate with Name & PIN.');
    } finally {
      setIsLoading(false);
    }
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
                {mode === 'login' ? 'Camper Log In' : 'Create Camper Account'}
              </h3>
              <p className="text-[11px] text-neutral-400">Quick access with Name &amp; 4-digit PIN</p>
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

        {/* Tab Switcher: Log In vs Create Account */}
        <div className="flex border-b border-neutral-100 bg-neutral-50/70 p-1.5 gap-1">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(''); }}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
              mode === 'login' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Log In</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(''); }}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
              mode === 'register' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        {/* Reason / Prompt notice if triggered by protected action */}
        {typeof promptReason === 'string' && promptReason.trim().length > 0 && (
          <div className="mx-6 mt-4 p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">
                  {mode === 'login' ? 'Log In Required' : 'Account Required'}
                </span>
                <span>{promptReason}</span>
              </div>
            </div>
            {mode === 'login' && (
              <div className="pt-2 border-t border-amber-200 flex items-center justify-between">
                <span className="text-[11px] text-amber-800">Don't have an account yet?</span>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setErrorMsg(''); }}
                  className="text-[11px] font-bold text-neutral-900 bg-amber-200/60 hover:bg-amber-200 px-2 py-0.5 rounded transition"
                >
                  Create an account →
                </button>
              </div>
            )}
          </div>
        )}

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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                {mode === 'register' ? 'Choose Your Name' : 'Your Name'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={mode === 'register' ? 'e.g. Jordan River' : 'e.g. Jordan River'}
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950 font-medium"
                />
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                {mode === 'register' ? 'This name will identify you in trips, gear lists, and meal plans.' : 'Enter the name associated with your account.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                {mode === 'register' ? 'Create a 4-Digit PIN' : 'Your 4-Digit PIN'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="•••• (4 digits)"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950 font-mono text-center tracking-widest text-sm font-bold"
                />
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                {mode === 'register' ? 'Pick 4 numbers (e.g. 1234) you will remember to sign in anytime.' : 'Enter your 4-digit PIN to sign in.'}
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-neutral-950 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2 shadow-xs"
            >
              {mode === 'register' ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>{isLoading ? 'Creating Profile...' : 'Create Account & Continue'}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{isLoading ? 'Signing In...' : 'Log In & Continue'}</span>
                </>
              )}
            </button>
          </form>

          {/* Mode Switcher footer link */}
          <div className="mt-4 pt-3 border-t border-neutral-100 text-center">
            {mode === 'login' ? (
              <p className="text-xs text-neutral-500">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setErrorMsg(''); }}
                  className="font-semibold text-neutral-950 hover:underline inline-flex items-center gap-0.5"
                >
                  Create an account now
                </button>
              </p>
            ) : (
              <p className="text-xs text-neutral-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(''); }}
                  className="font-semibold text-neutral-950 hover:underline inline-flex items-center gap-0.5"
                >
                  Log In instead
                </button>
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
