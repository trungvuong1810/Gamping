import React, { useState } from 'react';
import { Trip, User } from '../types';
import { Compass, UserCheck, Plus, Calendar, ArrowRight, ShieldCheck, MapPin, Users, Lock, Trash2, UserPlus, LogIn, Sparkles, KeyRound } from 'lucide-react';

interface EntryForkProps {
  currentUser: User | null;
  isSignedIn: boolean;
  activeTrips: Trip[];
  pastTrips: Trip[];
  onSelectTrip: (trip: Trip) => void;
  onNavigate: (view: 'host' | 'join' | 'account') => void;
  onOpenCreateAccount: (reason?: string, nextView?: 'home' | 'host' | 'join' | 'trip' | 'account') => void;
  onOpenLogIn: (reason?: string, nextView?: 'home' | 'host' | 'join' | 'trip' | 'account') => void;
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
      onOpenLogIn('Please log in or create an account to host a trip.', 'host');
      return;
    }
    onNavigate('host');
  };

  const handleJoinClick = () => {
    if (!isSignedIn || !currentUser) {
      onOpenLogIn('Please log in with your Name & 4-digit PIN before joining a trip. If you do not have an account yet, you can create one quickly below.', 'join');
      return;
    }
    onNavigate('join');
  };

  const handleAccountClick = () => {
    if (!isSignedIn || !currentUser) {
      onOpenLogIn('Please sign in or create an account to view your Account & History.', 'account');
      return;
    }
    onNavigate('account');
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6">
      
      {/* Editorial Clearing Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-black mb-3 uppercase">
          GAMPING
        </h1>
        <p className="text-sm sm:text-base text-neutral-500 font-normal leading-relaxed">
          Multi-group camping coordination. One system of record for dates, site choices, group boundaries, and AI-informed equipment and food lists.
        </p>

        {/* Quick Action Hero Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <button
            type="button"
            onClick={handleHostClick}
            id="hero-host-trip-btn"
            className="min-h-[44px] px-5 py-2.5 bg-neutral-950 text-white rounded-xl hover:bg-neutral-800 transition text-xs font-semibold flex items-center gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Host a Trip</span>
          </button>
          <button
            type="button"
            onClick={handleJoinClick}
            id="hero-join-trip-btn"
            className="min-h-[44px] px-5 py-2.5 bg-white border border-neutral-300 text-neutral-900 rounded-xl hover:bg-neutral-50 transition text-xs font-semibold flex items-center gap-2 shadow-2xs"
          >
            <KeyRound className="w-4 h-4 text-amber-600" />
            <span>Join a Trip</span>
          </button>
        </div>
      </div>

      {/* The Core Paths */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
        
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
              Pick dates (calendar or statutory holiday long weekends), share Trip Name &amp; Password with friends in chat, get AI destination recommendations, and configure groups.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-950 group-hover:translate-x-1 transition pt-2 border-t border-neutral-100">
            <span>Create new trip</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Path 2: Join a Trip */}
        <div
          onClick={handleJoinClick}
          id="entry-join-trip-card"
          className="group text-left p-6 rounded-2xl border border-neutral-200 bg-white hover:border-neutral-900 transition-all duration-200 shadow-sm flex flex-col justify-between cursor-pointer"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-900 flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <KeyRound className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-950 mb-1.5">Join a Trip</h2>
            <p className="text-xs text-neutral-500 leading-relaxed mb-4">
              Received a Trip Name and Password in your group chat? Enter them to unlock and join your squad's camping trip.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-950 group-hover:translate-x-1 transition pt-2 border-t border-neutral-100">
            <span>Enter Trip Credentials</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

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
            <h2 className="text-lg font-semibold text-neutral-950 mb-1.5">Account &amp; History</h2>
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

      {/* Guest Welcome & Auth Banner when not signed in */}
      {!isSignedIn && (
        <div className="mb-10 p-6 rounded-2xl border border-neutral-200 bg-neutral-50/90 text-center shadow-xs">
          <div className="max-w-lg mx-auto">
            <h3 className="text-base font-semibold text-neutral-950 mb-1.5">
              Have a trip password or planning a new adventure?
            </h3>
            <p className="text-xs text-neutral-500 mb-5 leading-relaxed">
              Log in with your Name &amp; 4-digit PIN to join existing trips or view your past camping memories. Don't have an account yet? Create one in seconds.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={handleJoinClick}
                id="entry-banner-join-btn"
                className="px-4 py-2.5 text-xs font-semibold bg-neutral-950 text-white rounded-xl hover:bg-neutral-800 transition flex items-center gap-1.5 shadow-xs"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                <span>Join a Trip</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenLogIn('Please log in with your Name & 4-digit PIN.')}
                id="entry-banner-login-btn"
                className="px-4 py-2.5 text-xs font-semibold bg-white border border-neutral-300 text-neutral-800 rounded-xl hover:bg-neutral-100 transition flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenCreateAccount('Create your camper profile with Name & 4-digit PIN.')}
                id="entry-banner-create-btn"
                className="px-4 py-2.5 text-xs font-semibold bg-neutral-200/80 text-neutral-900 rounded-xl hover:bg-neutral-200 transition flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Account</span>
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
            <span className="text-xs text-neutral-400">Camper: {currentUser.name}</span>
          </div>

          <div className="space-y-3">
            {activeTrips.map((trip) => (
              <div
                key={trip.id}
                onClick={() => onSelectTrip(trip)}
                className="p-5 rounded-xl border border-neutral-200 bg-white hover:border-neutral-900 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
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

      {/* Past Trips Archive Section (Shown when user is signed in) */}
      {isSignedIn && currentUser && pastTrips.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-4">
            Past Trips Archive ({pastTrips.length})
          </h2>

          <div className="space-y-3 opacity-80 hover:opacity-100 transition-opacity">
            {pastTrips.map((trip) => (
              <div
                key={trip.id}
                onClick={() => onSelectTrip(trip)}
                className="p-5 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-white hover:border-neutral-400 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-medium text-neutral-700 text-base">{trip.title}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-neutral-200/60 text-neutral-600 font-medium">
                      Archived (Read-Only)
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {trip.startDate} to {trip.endDate}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {trip.location}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={(e) => confirmDelete(trip, e)}
                    title="Delete archived trip"
                    className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button className="px-3.5 py-1.5 text-xs font-medium border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-100 transition">
                    View Archive
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Delete */}
      {tripToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-semibold text-neutral-950 mb-2">Delete Trip</h3>
            <p className="text-xs text-neutral-600 mb-6 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-neutral-900">"{tripToDelete.title}"</strong>? This will remove all associated group records, equipment, and meal allocations.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTripToDelete(null)}
                className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-4 py-2 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition shadow-xs"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
