import React, { useState } from 'react';
import { Trip, User } from '../types';
import { Compass, UserCheck, Plus, Calendar, ArrowRight, ShieldCheck, MapPin, Users, Lock, Trash2, UserPlus, LogIn, Sparkles } from 'lucide-react';

interface EntryForkProps {
  currentUser: User | null;
  isSignedIn: boolean;
  activeTrips: Trip[];
  pastTrips: Trip[];
  onSelectTrip: (trip: Trip) => void;
  onNavigate: (view: 'host' | 'join' | 'account') => void;
  onOpenCreateAccount: () => void;
  onOpenLogIn: (reason?: string) => void;
  onDeleteTrip?: (tripId: string) => void;
}

export const EntryFork: React.FC<EntryForkProps> = ({
  currentUser,
  isSignedIn,
  activeTrips,
  pastTrips,
  onSelectTrip,
  onNavigate,
  onOpenCreateAccount,
  onOpenLogIn,
  onDeleteTrip
}) => {
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);

  const confirmDelete = (trip: Trip, e: React.MouseEvent) => {
    e.stopPropagation();
    setTripToDelete(trip);
  };

  const handleExecuteDelete = () => {
    if (tripToDelete && onDeleteTrip) {
      onDeleteTrip(tripToDelete.id);
    }
    setTripToDelete(null);
  };

  const handleHostClick = () => {
    if (!isSignedIn || !currentUser) {
      onOpenLogIn('Please sign in or create an account to host a trip.');
      return;
    }
    onNavigate('host');
  };

  const handleAccountClick = () => {
    if (!isSignedIn || !currentUser) {
      onOpenLogIn('Please sign in or create an account to view your Account & History.');
      return;
    }
    onNavigate('account');
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      
      {/* Editorial Clearing Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[#3A3B3A] mb-3 uppercase">
          GAMPING
        </h1>
        <p className="text-sm sm:text-base text-neutral-500 font-normal leading-relaxed">
          Multi-group camping coordination. One system of record for dates, site choices, group boundaries, and AI-informed equipment and food lists.
        </p>
      </div>


      {/* The Core Paths */}
      <div className={`grid grid-cols-1 ${!isSignedIn || !currentUser ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-5 mb-14`}>
        
        {/* Path 1: Host Trip */}
        <div
          onClick={handleHostClick}
          id="entry-host-trip-btn"
          className="group text-left p-6 rounded-2xl border border-neutral-200 bg-white hover:border-neutral-900 transition-all duration-200 shadow-sm flex flex-col justify-between cursor-pointer"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-neutral-950 text-white flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <Plus className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-950 mb-1.5">Host a Trip</h2>
            <p className="text-xs text-neutral-500 leading-relaxed mb-4">
              Pick dates (calendar or statutory holiday long weekends), invite friends via email, get AI destination recommendations, and configure groups.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-950 group-hover:translate-x-1 transition pt-2 border-t border-neutral-100">
            <span>Create new trip</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Path 2: Create Account / Log In (Only shown when not signed in) */}
        {(!isSignedIn || !currentUser) && (
          <div
            id="entry-auth-card"
            className="group text-left p-6 rounded-2xl border border-neutral-200 bg-white hover:border-neutral-900 transition-all duration-200 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center mb-4 group-hover:bg-neutral-200 transition">
                <UserPlus className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-950 mb-1.5">Create Account</h2>
              <p className="text-xs text-neutral-500 leading-relaxed mb-4">
                Create your camper profile with username, email, and password to save trips, track equipment, and coordinate meals.
              </p>
            </div>
            <div className="pt-2 border-t border-neutral-100 space-y-2">
              <button
                type="button"
                onClick={onOpenCreateAccount}
                id="entry-create-account-btn"
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg bg-neutral-950 text-white hover:bg-neutral-800 transition shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Account</span>
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => onOpenLogIn()}
                  id="entry-login-btn"
                  className="text-xs text-neutral-500 hover:text-neutral-950 transition font-medium"
                >
                  Already have an account? <span className="font-semibold underline">Log In</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Path 3: Account & History */}
        <div
          onClick={handleAccountClick}
          id="entry-account-btn"
          className="group text-left p-6 rounded-2xl border border-neutral-200 bg-white hover:border-neutral-900 transition-all duration-200 shadow-sm flex flex-col justify-between cursor-pointer"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center mb-4 group-hover:bg-neutral-200 transition">
              <UserCheck className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-950 mb-1.5">Account & History</h2>
            <p className="text-xs text-neutral-500 leading-relaxed mb-4">
              {isSignedIn && currentUser
                ? `Signed in as ${currentUser.name}. Review past archived trips, frequent friends roster, and group settings.`
                : 'Sign in to access your saved trips, past trip history memory, and "People I camp with" frequent friends roster.'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-950 group-hover:translate-x-1 transition pt-2 border-t border-neutral-100">
            <span>{isSignedIn ? 'View Account & History' : 'Sign in to view History'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

      </div>

      {/* Guest Welcome Banner when not signed in */}
      {!isSignedIn && (
        <div className="mb-10 p-6 rounded-2xl border border-neutral-200 bg-neutral-50/80 text-center">
          <div className="max-w-md mx-auto">
            <h3 className="text-sm font-semibold text-neutral-950 mb-1.5">
              Ready to coordinate your next camping adventure?
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Sign in or create an account to view your active trips, manage gear, and collaborate on food with your camp crew.
            </p>
            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={onOpenCreateAccount}
                className="px-4 py-2 text-xs font-semibold bg-neutral-950 text-white rounded-lg hover:bg-neutral-800 transition"
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => onOpenLogIn()}
                className="px-4 py-2 text-xs font-semibold bg-white border border-neutral-200 text-neutral-800 rounded-lg hover:bg-neutral-100 transition"
              >
                Log In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Trips Section (Shown when user is signed in) */}
      {isSignedIn && currentUser && activeTrips.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Active Trips ({activeTrips.length})
            </h2>
            <span className="text-xs text-neutral-400">Camper: {currentUser.email}</span>
          </div>

          <div className="space-y-3">
            {activeTrips.map((trip) => (
              <div
                key={trip.id}
                onClick={() => onSelectTrip(trip)}
                className="p-5 rounded-xl border border-neutral-200 bg-white hover:border-neutral-950 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-semibold text-neutral-950 text-base">{trip.title}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-medium">
                      {trip.hostId === currentUser.id ? 'Host' : 'Member'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                      {trip.startDate} to {trip.endDate}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                      {trip.location}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <div className="text-right hidden sm:block mr-1">
                    <div className="text-[11px] text-neutral-400">Password</div>
                    <div className="font-mono text-xs text-neutral-800 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-100">
                      {trip.password}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => confirmDelete(trip, e)}
                    title="Delete active trip"
                    className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button className="px-3.5 py-1.5 text-xs font-medium bg-neutral-950 text-white rounded-lg hover:bg-neutral-800 transition">
                    Open Trip
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Trips Snapshot */}
      {isSignedIn && pastTrips.length > 0 && (
        <div className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-neutral-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Past Trips (Locked & Read-Only)
              </h3>
            </div>
            <button
              onClick={() => onNavigate('account')}
              className="text-xs text-neutral-600 hover:text-neutral-950 underline underline-offset-2"
            >
              View in Memory
            </button>
          </div>

          <div className="space-y-2">
            {pastTrips.map((pt) => (
              <div
                key={pt.id}
                onClick={() => onSelectTrip(pt)}
                className="p-3.5 rounded-lg border border-neutral-200/80 bg-white/70 hover:bg-white transition cursor-pointer flex items-center justify-between opacity-80 hover:opacity-100"
              >
                <div>
                  <div className="text-sm font-medium text-neutral-700">{pt.title}</div>
                  <div className="text-xs text-neutral-400">{pt.startDate} • {pt.location}</div>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-500">
                  Frozen
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Trip Confirmation Modal */}
      {tripToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-950">Delete Camping Trip?</h3>
                <p className="text-xs text-neutral-500">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-3 rounded-xl border border-neutral-100">
              Are you sure you want to delete <strong className="text-neutral-950">"{tripToDelete.title}"</strong> ({tripToDelete.location})? All associated groups, assigned gear, and planned menus will be removed.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setTripToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-950 transition rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete Trip</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

