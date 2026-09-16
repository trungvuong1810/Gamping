import React, { useState, useEffect, useCallback } from 'react';
import { User, Trip, TripDetailsResponse } from './types';
import { fetchUserTrips, fetchTripDetails, deleteTrip, joinTripViaLink } from './api/client';
import { Header } from './components/Header';
import { EntryFork } from './components/EntryFork';
import { HostFlow } from './components/HostFlow';
import { JoinFlow } from './components/JoinFlow';
import { TripView } from './components/TripView';
import { AccountView } from './components/AccountView';
import { AuthModal } from './components/AuthModal';

// Pre-configured test personas to easily test cross-group permissions & host controls
const DEMO_USERS: User[] = [
  { id: 'usr_host', email: 'alex.camper@gmail.com', name: 'Alex Rivers (Host)' },
  { id: 'usr_sara', email: 'sara.k@gmail.com', name: 'Sara Kelly (Group Alpha)' },
  { id: 'usr_elena', email: 'elena.v@gmail.com', name: 'Elena Vance (Group Bravo)' },
  { id: 'usr_marcus', email: 'marcus.t@gmail.com', name: 'Marcus Thorne (Alpha Camper)' },
  { id: 'usr_david', email: 'david.c@gmail.com', name: 'David Chen (Bravo Camper)' },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('camping_app_logged_in_user');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return null;
  });

  const [view, setView] = useState<'home' | 'host' | 'join' | 'trip' | 'account'>('home');
  const [autoJoinNotice, setAutoJoinNotice] = useState<string | null>(null);

  // Auth modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'register' | 'login'>('register');
  const [authModalPrompt, setAuthModalPrompt] = useState<string | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<('home' | 'host' | 'join' | 'trip' | 'account') | null>(null);

  // Trip collections for active user
  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);
  const [pastTrips, setPastTrips] = useState<Trip[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);

  // Selected trip state
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [tripDetails, setTripDetails] = useState<TripDetailsResponse | null>(null);
  const [isLoadingTripDetails, setIsLoadingTripDetails] = useState(false);

  // Load user trips
  const loadTrips = useCallback(async () => {
    if (!currentUser) {
      setActiveTrips([]);
      setPastTrips([]);
      return;
    }
    setIsLoadingTrips(true);
    try {
      const data = await fetchUserTrips(currentUser.id, currentUser.email);
      setActiveTrips(data.activeTrips || []);
      setPastTrips(data.pastTrips || []);
    } catch (err) {
      console.error('Failed to load trips:', err);
    } finally {
      setIsLoadingTrips(false);
    }
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  // Auth Modal Triggers
  const openCreateAccount = () => {
    setAuthModalMode('register');
    setAuthModalPrompt(null);
    setPendingNavigation(null);
    setIsAuthModalOpen(true);
  };

  const openLogIn = (reason?: string, nextView?: 'home' | 'host' | 'join' | 'trip' | 'account') => {
    setAuthModalMode('login');
    setAuthModalPrompt(reason || null);
    setPendingNavigation(nextView || null);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('camping_app_logged_in_user', JSON.stringify(user));
    } catch (e) {}
    if (pendingNavigation) {
      setView(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('camping_app_logged_in_user');
    } catch (e) {}
    setActiveTrips([]);
    setPastTrips([]);
    setView('home');
    setSelectedTripId(null);
    setTripDetails(null);
  };

  // Check URL query parameters for 1-click email invitation links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const inviteTripId = params.get('invite') || params.get('tripId');
    const inviteEmail = params.get('email');

    if (token) {
      const camperEmail = (inviteEmail || (currentUser ? currentUser.email : '') || 'camper@example.com').toLowerCase();
      const camperName = camperEmail.split('@')[0].replace(/[._]/g, ' ');

      joinTripViaLink({
        token,
        camperEmail,
        camperName
      }).then((res) => {
        window.history.replaceState({}, document.title, window.location.pathname);
        setCurrentUser(res.camper);
        try {
          localStorage.setItem('camping_app_logged_in_user', JSON.stringify(res.camper));
        } catch (e) {}
        setAutoJoinNotice(`🎉 You automatically joined "${res.trip.title}" via your email invitation!`);
        setSelectedTripId(res.trip.id);
        setView('trip');
        loadTrips();
      }).catch((err) => {
        console.error('Auto-join via link error:', err);
        setAutoJoinNotice(err.message || 'Invitation link expired or already accepted.');
      });
    }
  }, []);

  // Delete trip handler
  const handleDeleteTrip = async (tripId: string) => {
    try {
      await deleteTrip(tripId);
      if (selectedTripId === tripId) {
        setSelectedTripId(null);
        setTripDetails(null);
        setView('home');
      }
      loadTrips();
    } catch (err: any) {
      alert(err.message || 'Failed to delete trip.');
    }
  };

  // Load selected trip full bundle (groups, equipment, food, members)
  const loadTripDetails = useCallback(async (tripId: string) => {
    setIsLoadingTripDetails(true);
    try {
      const details = await fetchTripDetails(tripId);
      setTripDetails(details);
    } catch (err) {
      console.error('Failed to load trip details:', err);
    } finally {
      setIsLoadingTripDetails(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTripId) {
      loadTripDetails(selectedTripId);
    }
  }, [selectedTripId, loadTripDetails]);

  // Handler when user selects a trip to open
  const handleOpenTrip = (trip: Trip) => {
    setSelectedTripId(trip.id);
    setView('trip');
  };

  // Handler when a new trip is created by the host
  const handleTripCreated = (newTrip: Trip) => {
    loadTrips();
    setSelectedTripId(newTrip.id);
    setView('trip');
  };

  // Handler when camper joins via password gate
  const handleTripJoined = (joinedTrip: Trip) => {
    loadTrips();
    setSelectedTripId(joinedTrip.id);
    setView('trip');
  };

  // Handler for user persona switch
  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('camping_app_logged_in_user', JSON.stringify(user));
    } catch (e) {}
    if (selectedTripId) {
      loadTripDetails(selectedTripId);
    }
  };

  const isSelectedTripPast = tripDetails
    ? new Date(tripDetails.trip.endDate) < new Date('2026-09-01')
    : false;

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col font-sans selection:bg-neutral-900 selection:text-white">
      
      {/* Top Header & Quiet Navigation */}
      <Header
        currentUser={currentUser}
        isSignedIn={Boolean(currentUser)}
        onSelectUser={handleSelectUser}
        availableUsers={DEMO_USERS}
        currentTrip={tripDetails?.trip}
        currentView={view}
        onNavigate={(v) => {
          if (v === 'account' && !currentUser) {
            openLogIn('Please sign in or create an account to view your Account & History.', 'account');
            return;
          }
          if (v === 'host' && !currentUser) {
            openLogIn('Please sign in or create an account to host a trip.', 'host');
            return;
          }
          setView(v);
          if (v === 'home') {
            setSelectedTripId(null);
            setTripDetails(null);
          }
        }}
        onOpenCreateAccount={openCreateAccount}
        onOpenLogIn={(reason) => openLogIn(reason)}
        onSignOut={handleSignOut}
      />

      {/* Auto-join banner notification */}
      {autoJoinNotice && (
        <div className="bg-neutral-900 text-white py-2 px-4 text-center text-xs font-medium flex items-center justify-center gap-3">
          <span>{autoJoinNotice}</span>
          <button
            onClick={() => setAutoJoinNotice(null)}
            className="text-neutral-400 hover:text-white font-bold ml-2 text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1">
        {view === 'home' && (
          <EntryFork
            currentUser={currentUser}
            isSignedIn={Boolean(currentUser)}
            activeTrips={activeTrips}
            pastTrips={pastTrips}
            onSelectTrip={handleOpenTrip}
            onNavigate={(v) => {
              if (v === 'account' && !currentUser) {
                openLogIn('Please sign in or create an account to view your Account & History.', 'account');
                return;
              }
              if (v === 'host' && !currentUser) {
                openLogIn('Please sign in or create an account to host a trip.', 'host');
                return;
              }
              setView(v);
            }}
            onOpenCreateAccount={openCreateAccount}
            onOpenLogIn={(reason) => openLogIn(reason)}
            onDeleteTrip={handleDeleteTrip}
          />
        )}

        {view === 'host' && (
          <HostFlow
            currentUser={currentUser || DEMO_USERS[0]}
            onTripCreated={handleTripCreated}
            onCancel={() => setView('home')}
            activeTrips={activeTrips}
            onDeleteTrip={handleDeleteTrip}
          />
        )}

        {view === 'join' && (
          <JoinFlow
            currentUser={currentUser || DEMO_USERS[0]}
            onJoinedTrip={handleTripJoined}
            onCancel={() => setView('home')}
          />
        )}

        {view === 'trip' && tripDetails && (
          <TripView
            trip={tripDetails.trip}
            currentUser={currentUser || { id: 'usr_guest', email: 'guest@camp.com', name: 'Guest Camper' }}
            members={tripDetails.members}
            groups={tripDetails.groups}
            groupMembers={tripDetails.groupMembers}
            equipment={tripDetails.equipment}
            food={tripDetails.food}
            isPast={isSelectedTripPast}
            onRefreshTrip={() => {
              if (selectedTripId) loadTripDetails(selectedTripId);
              loadTrips();
            }}
            onBack={() => {
              setView('home');
              setSelectedTripId(null);
              setTripDetails(null);
            }}
            onDeleteTrip={handleDeleteTrip}
          />
        )}

        {view === 'trip' && !tripDetails && isLoadingTripDetails && (
          <div className="max-w-2xl mx-auto py-24 text-center">
            <div className="inline-block animate-spin w-6 h-6 border-2 border-neutral-950 border-t-transparent rounded-full mb-3"></div>
            <div className="text-xs font-medium text-neutral-600">Retrieving trip coordination state...</div>
          </div>
        )}

        {view === 'account' && (
          <AccountView
            currentUser={currentUser}
            activeTrips={activeTrips}
            pastTrips={pastTrips}
            onSelectTrip={handleOpenTrip}
            onBack={() => setView('home')}
            onUserLoggedIn={(newUser) => {
              handleAuthSuccess(newUser);
              loadTrips();
            }}
          />
        )}
      </main>

      {/* Create Account & Log In Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        promptReason={authModalPrompt}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingNavigation(null);
        }}
        onSuccess={handleAuthSuccess}
      />

      {/* Quiet Footer */}
      <footer className="border-t border-neutral-100 py-6 text-center text-xs text-neutral-400">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>GAMPING • Multi-Group Trip Coordination</span>
          <span className="font-mono text-[11px]">Grok 4.6 intelligence • Group-scoped write • Trip-wide read</span>
        </div>
      </footer>

    </div>
  );
}

