import React, { useState, useEffect } from 'react';
import { User, Trip, Friend } from '../types';
import { fetchFriends, addFriend, deleteFriend, registerAccount, loginAccountWithPassword, getAuthStatus, verifySupabaseTables, syncLocalToSupabase, fetchSupabaseSchema } from '../api/client';
import { UserCheck, Lock, Calendar, MapPin, Users, Plus, Trash2, ArrowLeft, ShieldCheck, Mail, Tag, Check, Database, Key, Server, Sparkles, Eye, EyeOff, AlertCircle, ExternalLink, Copy, RefreshCw, CloudSun } from 'lucide-react';

interface AccountViewProps {
  currentUser: User | null;
  activeTrips: Trip[];
  pastTrips: Trip[];
  onSelectTrip: (trip: Trip) => void;
  onBack: () => void;
  onUserLoggedIn?: (user: User) => void;
}

export const AccountView: React.FC<AccountViewProps> = ({
  currentUser,
  activeTrips,
  pastTrips,
  onSelectTrip,
  onBack,
  onUserLoggedIn
}) => {
  // Only the host/admin (e.g. qtru49@gmail.com or primary host accounts) can see Supabase infrastructure
  const isHostAdmin = Boolean(
    currentUser && (
      currentUser.email.toLowerCase() === 'qtru49@gmail.com' ||
      currentUser.email.toLowerCase().includes('host') ||
      currentUser.id === 'usr_host' ||
      activeTrips.some(t => t.hostEmail.toLowerCase() === currentUser.email.toLowerCase() || t.hostId === currentUser.id)
    )
  );

  const [activeTab, setActiveTab] = useState<'create-account' | 'friends' | 'memory' | 'supabase'>(currentUser ? 'friends' : 'create-account');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendName, setFriendName] = useState('');
  const [friendEmail, setFriendEmail] = useState('');
  const [friendTag, setFriendTag] = useState('Paddlers');
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Account creation / Login state
  const [authMode, setAuthMode] = useState<'register' | 'login'>('login');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');
  const [authErrorMsg, setAuthErrorMsg] = useState('');

  // Supabase status & Table health
  const [supabaseStatus, setSupabaseStatus] = useState<{
    supabaseConfigured: boolean;
    supabaseUrl: string | null;
    resendConfigured: boolean;
    googleMapsConfigured?: boolean;
  }>({ supabaseConfigured: false, supabaseUrl: null, resendConfigured: false });

  const [tableHealth, setTableHealth] = useState<{
    configured: boolean;
    projectRef?: string;
    sqlEditorUrl?: string;
    tables: Record<string, { exists: boolean; error?: string }>;
    allReady: boolean;
    readyCount: number;
    totalCount: number;
    message: string;
  } | null>(null);

  const [isCheckingTables, setIsCheckingTables] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      const status = await getAuthStatus();
      setSupabaseStatus(status);
    } catch (e) {
      console.error(e);
    }
  };

  const checkTableHealth = async () => {
    setIsCheckingTables(true);
    try {
      const health = await verifySupabaseTables();
      setTableHealth(health);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCheckingTables(false);
    }
  };

  const handleCopySchema = async () => {
    try {
      const { sql } = await fetchSupabaseSchema();
      await navigator.clipboard.writeText(sql);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSyncToSupabase = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await syncLocalToSupabase();
      setSyncFeedback(res.message);
      await checkTableHealth();
    } catch (e: any) {
      setSyncFeedback(e.message || 'Failed to synchronize with Supabase');
    } finally {
      setIsSyncing(false);
    }
  };


  const loadFriends = async () => {
    if (!currentUser?.id) return;
    try {
      const data = await fetchFriends(currentUser.id);
      setFriends(data.friends || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      loadFriends();
    }
    loadStatus();
    if (activeTab === 'supabase') {
      checkTableHealth();
    }
  }, [currentUser?.id, activeTab]);


  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regEmail.trim() || !regPassword.trim()) {
      setAuthErrorMsg('Please fill in all required fields.');
      return;
    }
    if (regPassword.length < 6) {
      setAuthErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsAuthLoading(true);
    setAuthErrorMsg('');
    setAuthSuccessMsg('');

    try {
      const result = await registerAccount({
        username: regUsername.trim(),
        email: regEmail.trim(),
        password: regPassword.trim(),
        displayName: regDisplayName.trim() || regUsername.trim()
      });

      setAuthSuccessMsg(result.message || 'Account successfully created!');
      if (onUserLoggedIn) {
        onUserLoggedIn(result.user);
      }
      setRegUsername('');
      setRegPassword('');
      setRegEmail('');
      setRegDisplayName('');
    } catch (err: any) {
      setAuthErrorMsg(err.message || 'Failed to create account.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regPassword.trim()) {
      setAuthErrorMsg('Please enter your username/email and password.');
      return;
    }

    setIsAuthLoading(true);
    setAuthErrorMsg('');
    setAuthSuccessMsg('');

    try {
      const result = await loginAccountWithPassword({
        usernameOrEmail: regUsername.trim(),
        password: regPassword.trim()
      });

      setAuthSuccessMsg(result.message || 'Signed in successfully!');
      if (onUserLoggedIn) {
        onUserLoggedIn(result.user);
      }
      setRegPassword('');
    } catch (err: any) {
      setAuthErrorMsg(err.message || 'Failed to sign in.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendName.trim() || !friendEmail.trim()) return;

    setIsAddingFriend(true);
    setErrorMsg('');
    try {
      await addFriend({
        userId: currentUser.id,
        friendName: friendName.trim(),
        friendEmail: friendEmail.trim().toLowerCase(),
        tags: friendTag.trim() ? [friendTag.trim()] : []
      });
      setFriendName('');
      setFriendEmail('');
      setShowAddFriend(false);
      loadFriends();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add friend');
    } finally {
      setIsAddingFriend(false);
    }
  };

  const handleDeleteFriend = async (friendId: string) => {
    try {
      await deleteFriend(friendId);
      loadFriends();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 space-y-8">
      
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-medium text-neutral-600 hover:text-neutral-950 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Clearing</span>
      </button>

      {/* Account Info Header */}
      <div className="p-6 rounded-2xl border border-neutral-200 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-neutral-950 text-white flex items-center justify-center font-bold text-lg">
              {currentUser ? currentUser.name.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-neutral-950">
                  {currentUser ? currentUser.name : 'Sign In Required'}
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                  {supabaseStatus.supabaseConfigured ? 'Supabase Sync Active' : 'Local Storage Mode'}
                </span>
              </div>
              <div className="text-xs text-neutral-500 font-mono">
                {currentUser ? currentUser.email : 'Please sign in or create an account to view your camper profile'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-neutral-600">
            <div className="px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200">
              <span className="font-semibold text-neutral-950">{activeTrips.length}</span> Active Trips
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200">
              <span className="font-semibold text-neutral-950">{pastTrips.length}</span> Past Trips
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-neutral-100">
          {!currentUser && (
            <button
              onClick={() => setActiveTab('create-account')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'create-account'
                  ? 'bg-neutral-950 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Sign In / Create Account</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('friends')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'friends'
                ? 'bg-neutral-950 text-white'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>People I Camp With ({friends.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('memory')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'memory'
                ? 'bg-neutral-950 text-white'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Trip Memory ({pastTrips.length})</span>
          </button>

          {/* Supabase & Cloud Infrastructure button: Host/Admin only */}
          {isHostAdmin && (
            <button
              onClick={() => setActiveTab('supabase')}
              id="account-supabase-tab-btn"
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'supabase'
                  ? 'bg-neutral-950 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Supabase & Resend Status</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= TAB 1: CREATE ACCOUNT & AUTH ================= */}
      {activeTab === 'create-account' && (
        <div className="p-6 rounded-2xl border border-neutral-200 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-950">
                {authMode === 'register' ? 'Create New Account' : 'Sign In to Account'}
              </h2>
              <p className="text-xs text-neutral-500">
                {authMode === 'register'
                  ? 'All account information, username, and credentials are saved to Supabase (app_users table).'
                  : 'Enter your username or email and password to hydrate your trips and profile.'}
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setAuthErrorMsg(''); setAuthSuccessMsg(''); }}
                className={`px-3 py-1 rounded-md transition ${authMode === 'register' ? 'bg-white shadow-xs text-neutral-950' : 'text-neutral-500'}`}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setAuthErrorMsg(''); setAuthSuccessMsg(''); }}
                className={`px-3 py-1 rounded-md transition ${authMode === 'login' ? 'bg-white shadow-xs text-neutral-950' : 'text-neutral-500'}`}
              >
                Sign In
              </button>
            </div>
          </div>

          {authSuccessMsg && (
            <div className="mb-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{authSuccessMsg}</span>
            </div>
          )}

          {authErrorMsg && (
            <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{authErrorMsg}</span>
            </div>
          )}

          {authMode === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-4 max-w-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1 uppercase tracking-wide">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. camper_alex"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:border-neutral-950 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1 uppercase tracking-wide">
                    Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Alex Rivers"
                    value={regDisplayName}
                    onChange={(e) => setRegDisplayName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:border-neutral-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1 uppercase tracking-wide">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="alex.camper@gmail.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:border-neutral-950"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1 uppercase tracking-wide">
                  Password * (min 6 characters)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full text-xs px-3 py-2 pr-9 rounded-lg border border-neutral-300 focus:outline-none focus:border-neutral-950 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-700"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-neutral-100 bg-neutral-50/80 text-[11px] text-neutral-500 flex items-start gap-2">
                <Database className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Supabase Persistence: </strong>
                  Account record is saved to the PostgreSQL <code>app_users</code> table with hashed password security.
                </div>
              </div>

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold bg-neutral-950 text-white rounded-lg hover:bg-neutral-800 transition flex items-center justify-center gap-2"
              >
                {isAuthLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving to Supabase...</span>
                  </>
                ) : (
                  <span>Create Account & Sign In</span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1 uppercase tracking-wide">
                  Username or Email *
                </label>
                <input
                  type="text"
                  required
                  placeholder="camper_alex or alex@example.com"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:border-neutral-950 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1 uppercase tracking-wide">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full text-xs px-3 py-2 pr-9 rounded-lg border border-neutral-300 focus:outline-none focus:border-neutral-950 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-700"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold bg-neutral-950 text-white rounded-lg hover:bg-neutral-800 transition flex items-center justify-center gap-2"
              >
                {isAuthLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ================= TAB 2: FRIENDS ================= */}
      {activeTab === 'friends' && (
        <div className="p-6 rounded-2xl border border-neutral-200 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-neutral-950">
                People I Camp With ({friends.length})
              </h2>
              <p className="text-xs text-neutral-500">
                Your reusable roster. When creating trips, check any frequent friend to invite without retyping emails.
              </p>
            </div>

            <button
              onClick={() => setShowAddFriend(!showAddFriend)}
              className="px-3 py-1.5 text-xs font-medium bg-neutral-950 text-white rounded-lg hover:bg-neutral-800 transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Friend</span>
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs">
              {errorMsg}
            </div>
          )}

          {showAddFriend && (
            <form onSubmit={handleAddFriend} className="mb-6 p-4 rounded-xl border border-neutral-200 bg-neutral-50/80 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Friend Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Maya Lin"
                    value={friendName}
                    onChange={(e) => setFriendName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    placeholder="maya@example.com"
                    value={friendEmail}
                    onChange={(e) => setFriendEmail(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                    Tag / Affinity
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paddlers or Family"
                    value={friendTag}
                    onChange={(e) => setFriendTag(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddFriend(false)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-950"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingFriend}
                  className="px-4 py-1.5 text-xs bg-neutral-950 text-white rounded-lg hover:bg-neutral-800 font-medium"
                >
                  {isAddingFriend ? 'Saving...' : 'Save to Friends'}
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {friends.map((f) => (
              <div
                key={f.id}
                className="p-3.5 rounded-xl border border-neutral-200 bg-white flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-neutral-950 truncate">{f.friendName}</div>
                  <div className="text-[11px] text-neutral-400 font-mono truncate">{f.friendEmail}</div>
                  {f.tags && f.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {f.tags.map((t, idx) => (
                        <span key={idx} className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteFriend(f.id)}
                  className="text-neutral-300 hover:text-red-600 p-1"
                  title="Remove friend"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 3: TRIP MEMORY ================= */}
      {activeTab === 'memory' && (
        <div className="p-6 rounded-2xl border border-neutral-200 bg-neutral-50/50">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-neutral-500" />
            <h2 className="text-base font-semibold text-neutral-950">
              Trip Memory & Past Trips (Immutable)
            </h2>
          </div>
          <p className="text-xs text-neutral-500 mb-4">
            After the camping date has passed, trips are permanently locked. Checklists reopen as read-only historical memory to serve as a packing baseline for future trips.
          </p>

          {pastTrips.length > 0 ? (
            <div className="space-y-3">
              {pastTrips.map((pt) => (
                <div
                  key={pt.id}
                  onClick={() => onSelectTrip(pt)}
                  className="p-4 rounded-xl border border-neutral-200 bg-white/80 hover:bg-white transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 opacity-80 hover:opacity-100"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-800 text-sm">{pt.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-200 text-neutral-700">
                        Completed
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1">
                      <span>{pt.startDate} to {pt.endDate}</span>
                      <span>•</span>
                      <span>{pt.location}</span>
                    </div>
                  </div>

                  <button className="px-3 py-1.5 text-xs font-medium border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-100 transition self-end sm:self-center">
                    Review Packing Baseline
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-dashed border-neutral-200 text-center text-xs text-neutral-400">
              No completed trips yet.
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 4: SUPABASE & RESEND & GOOGLE MAPS STATUS ================= */}
      {activeTab === 'supabase' && (
        <div className="p-6 rounded-2xl border border-neutral-200 bg-white shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#3A3B3A] text-white flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-medium text-[#3A3B3A]">
                  Cloud Services & Database Health
                </h2>
                <p className="text-xs text-neutral-500">Live connection status for Supabase PostgreSQL, Resend email & Google Maps</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  await loadStatus();
                  await checkTableHealth();
                }}
                disabled={isCheckingTables}
                className="px-3 py-1.5 text-xs font-medium border border-neutral-200 rounded-lg hover:bg-neutral-50 transition flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingTables ? 'animate-spin' : ''}`} />
                <span>Verify All Services</span>
              </button>
            </div>
          </div>

          {/* Connection Status Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Supabase Card */}
            <div className={`p-4 rounded-xl border ${
              supabaseStatus.supabaseConfigured ? 'border-emerald-200 bg-emerald-50/60' : 'border-neutral-200 bg-neutral-50'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-700" />
                  <span className="font-medium text-xs text-neutral-900">Supabase DB</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${supabaseStatus.supabaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`}></div>
                  <span className={`text-[11px] font-medium ${supabaseStatus.supabaseConfigured ? 'text-emerald-700' : 'text-neutral-500'}`}>
                    {supabaseStatus.supabaseConfigured ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
              </div>
              <div className="text-[11px] font-mono text-neutral-600 truncate">
                {supabaseStatus.supabaseConfigured ? `URL: ${supabaseStatus.supabaseUrl}` : 'Mode: Local Storage Fallback'}
              </div>
            </div>

            {/* 2. Resend Email Card */}
            <div className={`p-4 rounded-xl border ${
              supabaseStatus.resendConfigured ? 'border-emerald-200 bg-emerald-50/60' : 'border-neutral-200 bg-neutral-50'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-xs text-neutral-900">Resend Email</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${supabaseStatus.resendConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`}></div>
                  <span className={`text-[11px] font-medium ${supabaseStatus.resendConfigured ? 'text-emerald-700' : 'text-neutral-500'}`}>
                    {supabaseStatus.resendConfigured ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
              </div>
              <div className="text-[11px] font-mono text-neutral-600 truncate">
                {supabaseStatus.resendConfigured ? 'Status: Real email delivery' : 'Mode: 1-click magic link fallback'}
              </div>
            </div>

            {/* 3. Google Maps Places Card */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-700" />
                  <span className="font-medium text-xs text-neutral-900">Google Places API</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[11px] font-medium text-emerald-700">
                    Active & Ready
                  </span>
                </div>
              </div>
              <div className="text-[11px] font-mono text-neutral-600 truncate">
                Live autocomplete & geocoding
              </div>
            </div>

            {/* 4. Google Maps Weather API Card */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CloudSun className="w-4 h-4 text-amber-600" />
                  <span className="font-medium text-xs text-neutral-900">GMP Weather API</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[11px] font-medium text-emerald-700">
                    1-Wk Alert Active
                  </span>
                </div>
              </div>
              <div className="text-[11px] font-mono text-neutral-600 truncate">
                7-day departure alert & packing tips
              </div>
            </div>
          </div>

          {/* Real-Time Supabase Database Table Inspector */}
          <div className="p-5 rounded-xl border border-neutral-200 bg-neutral-50 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 pb-3">
              <div>
                <h3 className="font-medium text-sm text-[#3A3B3A] flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span>Supabase Database Table Status</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Checks each PostgreSQL table in your Supabase project schema
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  tableHealth?.allReady
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {tableHealth ? `${tableHealth.readyCount} / ${tableHealth.totalCount} Tables Ready` : 'Checking tables...'}
                </span>
                <button
                  onClick={checkTableHealth}
                  disabled={isCheckingTables}
                  className="px-2.5 py-1 text-xs border border-neutral-300 rounded bg-white hover:bg-neutral-100 transition"
                >
                  {isCheckingTables ? 'Verifying...' : 'Re-check'}
                </button>
              </div>
            </div>

            {/* Tables Grid */}
            {tableHealth && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { key: 'app_users', label: 'app_users (Accounts)' },
                  { key: 'trips', label: 'trips (Camping Trips)' },
                  { key: 'trip_members', label: 'trip_members (Campers)' },
                  { key: 'groups', label: 'groups (Campsites)' },
                  { key: 'group_members', label: 'group_members (Members)' },
                  { key: 'equipment_items', label: 'equipment_items (Gear)' },
                  { key: 'food_items', label: 'food_items (Meals)' },
                  { key: 'friends', label: 'friends (Frequent)' },
                ].map(({ key, label }) => {
                  const exists = tableHealth.tables?.[key]?.exists;
                  return (
                    <div
                      key={key}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                        exists
                          ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
                          : 'border-neutral-200 bg-white text-neutral-500'
                      }`}
                    >
                      <span className="font-mono text-[11px] truncate">{label}</span>
                      {exists ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <span className="text-[10px] uppercase font-bold text-amber-600 shrink-0">Missing</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Explanation & 1-Click Fix Instructions */}
            {(!tableHealth || !tableHealth.allReady) && (
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-amber-900">
                      Why don't I see any tables in Supabase after creating an account?
                    </h4>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      When you create a new project in Supabase, PostgreSQL starts with a <strong>clean, empty public schema</strong>. Web applications interact with your database using data queries (<code className="bg-amber-100/70 px-1 py-0.5 rounded font-mono">SELECT</code>, <code className="bg-amber-100/70 px-1 py-0.5 rounded font-mono">INSERT</code>), but PostgreSQL deliberately <strong>blocks applications from executing <code className="bg-amber-100/70 px-1 py-0.5 rounded font-mono">CREATE TABLE</code> over the REST API</strong> for security.
                    </p>
                    <p className="text-xs text-amber-800 mt-1.5 leading-relaxed">
                      To initialize all 8 tables in 10 seconds:
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                  <div className="p-3 bg-white rounded-lg border border-amber-200 flex flex-col justify-between gap-2">
                    <div>
                      <span className="font-bold text-amber-900">Step 1</span>
                      <p className="text-neutral-600 text-[11px] mt-0.5">Copy the pre-written schema script containing all 8 tables and indexes.</p>
                    </div>
                    <button
                      onClick={handleCopySchema}
                      className="w-full py-1.5 px-2 bg-[#3A3B3A] text-white rounded text-xs font-medium hover:bg-neutral-800 transition flex items-center justify-center gap-1.5"
                    >
                      {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Schema'}</span>
                    </button>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-amber-200 flex flex-col justify-between gap-2">
                    <div>
                      <span className="font-bold text-amber-900">Step 2</span>
                      <p className="text-neutral-600 text-[11px] mt-0.5">Open your Supabase SQL Editor in a new tab, paste the code, and click <strong>Run</strong>.</p>
                    </div>
                    <a
                      href={tableHealth?.sqlEditorUrl || 'https://supabase.com/dashboard'}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-1.5 px-2 border border-neutral-300 bg-white text-neutral-800 rounded text-xs font-medium hover:bg-neutral-50 transition flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open SQL Editor</span>
                    </a>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-amber-200 flex flex-col justify-between gap-2">
                    <div>
                      <span className="font-bold text-amber-900">Step 3</span>
                      <p className="text-neutral-600 text-[11px] mt-0.5">Return here and click Verify. All 8 table badges will turn green immediately!</p>
                    </div>
                    <button
                      onClick={checkTableHealth}
                      className="w-full py-1.5 px-2 border border-emerald-600 text-emerald-700 bg-emerald-50 rounded text-xs font-medium hover:bg-emerald-100 transition flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Verify Tables</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* When all tables ready: Sync local data button */}
            {tableHealth && tableHealth.allReady && (
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-emerald-900">All Database Tables Verified!</div>
                    <p className="text-[11px] text-emerald-700 mt-0.5">You can now synchronize any accounts or trips created locally directly into Supabase.</p>
                  </div>
                </div>
                <button
                  onClick={handleSyncToSupabase}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-[#3A3B3A] text-white rounded-lg text-xs font-medium hover:bg-neutral-800 transition flex items-center gap-2 self-start sm:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Synchronizing...' : 'Sync Local Data to Supabase'}</span>
                </button>
              </div>
            )}

            {syncFeedback && (
              <div className="p-3 rounded-lg bg-emerald-100 text-emerald-900 text-xs font-medium flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-700" />
                <span>{syncFeedback}</span>
              </div>
            )}
          </div>
        </div>
      )}


    </div>
  );
};

