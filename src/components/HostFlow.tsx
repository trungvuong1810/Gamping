import React, { useState, useEffect } from 'react';
import { User, Trip, LongWeekendOption, ParkRecommendation, Friend } from '../types';
import { fetchLongWeekends, getAiParkRecommendations, fetchFriends, createTrip } from '../api/client';
import { Calendar, Users, Sparkles, MapPin, DollarSign, AlertCircle, ArrowLeft, ArrowRight, Check, Key, Plus, Trash2, Clock, Shield } from 'lucide-react';
import { LocationAutocompleteInput, LocationSuggestion } from './LocationAutocompleteInput';

interface HostFlowProps {
  currentUser: User;
  onTripCreated: (trip: Trip) => void;
  onCancel: () => void;
  activeTrips?: Trip[];
  onDeleteTrip?: (tripId: string) => void;
}

export const HostFlow: React.FC<HostFlowProps> = ({
  currentUser,
  onTripCreated,
  onCancel,
  activeTrips = [],
  onDeleteTrip
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Dates state
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('2026-10-09');
  const [endDate, setEndDate] = useState('2026-10-12');
  const [longWeekends, setLongWeekends] = useState<LongWeekendOption[]>([]);
  const [selectedLongWeekend, setSelectedLongWeekend] = useState<string | null>(null);

  // Step 2: Invite & Friends state
  const [password, setPassword] = useState(`camp-${Math.random().toString(36).substring(2, 6)}-2026`);
  const [frequentFriends, setFrequentFriends] = useState<Friend[]>([]);
  const [selectedFriendEmails, setSelectedFriendEmails] = useState<string[]>([]);
  const [newFriendEmail, setNewFriendEmail] = useState('');
  const [newFriendName, setNewFriendName] = useState('');

  // Step 3: Booking (Grok 4.6) state
  const [startingLocation, setStartingLocation] = useState('Toronto, ON');
  const [startingCoordinates, setStartingCoordinates] = useState<{ lat: number; lng: number } | undefined>();
  const [activities, setActivities] = useState<string[]>(['Hiking', 'Canoeing & Portage', 'Campfire Cooking']);
  const [driveDistance, setDriveDistance] = useState('3-4 hrs drive');
  const [experienceLevel, setExperienceLevel] = useState<'Beginner' | 'Intermediate' | 'Backcountry / Expert'>('Intermediate');
  const [customNotes, setCustomNotes] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [recommendedParks, setRecommendedParks] = useState<ParkRecommendation[]>([]);
  const [selectedPark, setSelectedPark] = useState<ParkRecommendation | null>(null);
  const [customParkName, setCustomParkName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);

  // Pre-load statutory holidays and frequent friends
  useEffect(() => {
    fetchLongWeekends(2026)
      .then((data) => setLongWeekends(data.holidays || []))
      .catch(() => {});

    fetchFriends(currentUser.id)
      .then((data) => {
        setFrequentFriends(data.friends || []);
        // Pre-select frequent friends by default for speed
        if (data.friends && data.friends.length > 0) {
          setSelectedFriendEmails(data.friends.map(f => f.friendEmail));
        }
      })
      .catch(() => {});
  }, [currentUser.id]);

  // Handle holiday long weekend selection
  const handleSelectLongWeekend = (lw: LongWeekendOption) => {
    setSelectedLongWeekend(lw.name);
    setStartDate(lw.startDate);
    setEndDate(lw.endDate);
    if (!title) {
      setTitle(`${lw.name} Multi-Site Camp`);
    }
  };

  // Quick suggestion chips for Grok 4.6 booking
  const quickSuggestions = [
    {
      label: 'Family-friendly lakefront within 3 hrs',
      activities: ['Swimming', 'Campfire Cooking', 'Paddleboarding'],
      drive: 'within 3 hrs',
      level: 'Beginner' as const
    },
    {
      label: 'Backcountry solitude & canoe portage',
      activities: ['Canoeing & Portage', 'Hiking', 'Fishing', 'Stargazing'],
      drive: '4-5 hrs drive',
      level: 'Backcountry / Expert' as const
    },
    {
      label: 'Fall foliage & dark sky stargazing',
      activities: ['Hiking', 'Night Stargazing', 'Campfire Cooking'],
      drive: '2-3 hrs drive',
      level: 'Intermediate' as const
    }
  ];

  const applySuggestionChip = (chip: typeof quickSuggestions[0]) => {
    setActivities(chip.activities);
    setDriveDistance(chip.drive);
    setExperienceLevel(chip.level);
    handleSearchParks(chip.activities, chip.drive, chip.level);
  };

  const toggleActivity = (act: string) => {
    if (activities.includes(act)) {
      setActivities(activities.filter(a => a !== act));
    } else {
      setActivities([...activities, act]);
    }
  };

  const handleSearchParks = async (
    acts: string[] = activities,
    dist: string = driveDistance,
    exp: string = experienceLevel,
    startLoc: string = startingLocation,
    coords: { lat: number; lng: number } | undefined = startingCoordinates
  ) => {
    setIsAiLoading(true);
    setErrorMsg('');
    try {
      const data = await getAiParkRecommendations({
        activities: acts,
        driveDistance: dist,
        experienceLevel: exp,
        startingLocation: startLoc,
        coordinates: coords,
        customNotes
      });
      setRecommendedParks(data.parks);
      if (data.parks.length > 0) {
        setSelectedPark(data.parks[0]);
      }
    } catch (err: any) {
      setErrorMsg('Could not retrieve recommendations. You can enter a park name manually.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Auto-search parks when entering step 3 if not loaded yet
  useEffect(() => {
    if (step === 3 && recommendedParks.length === 0) {
      handleSearchParks();
    }
  }, [step]);

  const toggleFriend = (email: string) => {
    if (selectedFriendEmails.includes(email)) {
      setSelectedFriendEmails(selectedFriendEmails.filter(e => e !== email));
    } else {
      setSelectedFriendEmails([...selectedFriendEmails, email]);
    }
  };

  const handleAddManualFriend = () => {
    if (!newFriendEmail.trim()) return;
    const cleanEmail = newFriendEmail.trim().toLowerCase();
    if (!selectedFriendEmails.includes(cleanEmail)) {
      setSelectedFriendEmails([...selectedFriendEmails, cleanEmail]);
    }
    setNewFriendEmail('');
    setNewFriendName('');
  };

  const handleFinalSubmit = async () => {
    if (!title.trim()) {
      setErrorMsg('Please specify a trip title.');
      setStep(1);
      return;
    }
    if (!password.trim()) {
      setErrorMsg('A trip join password is required.');
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const destinationLocation = selectedPark
      ? `${selectedPark.name} (${selectedPark.location})`
      : (customParkName.trim() || 'Wilderness Campsite');

    try {
      const result = await createTrip({
        title: title.trim(),
        hostId: currentUser.id,
        hostEmail: currentUser.email,
        hostName: currentUser.name,
        startDate,
        endDate,
        location: destinationLocation,
        parkDetails: selectedPark || null,
        password: password.trim(),
        friendEmails: selectedFriendEmails
      });

      onTripCreated(result.trip);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create trip');
      setIsSubmitting(false);
    }
  };

  const activityPills = [
    'Hiking',
    'Canoeing & Portage',
    'Campfire Cooking',
    'Night Stargazing',
    'Swimming',
    'Fishing',
    'Bouldering & Climbing',
    'Photography',
    'Mountain Biking'
  ];

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6">
      
      {/* Top back button & step progression */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={step === 1 ? onCancel : () => setStep((s) => (s - 1) as any)}
          className="flex items-center gap-2 text-xs font-medium text-neutral-600 hover:text-neutral-950 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{step === 1 ? 'Cancel to Home' : 'Previous Step'}</span>
        </button>

        {/* Step Indicator */}
        <div className="flex items-center gap-2">
          <div className={`px-2.5 py-1 rounded-md text-xs font-medium ${step === 1 ? 'bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-600'}`}>
            1. Dates
          </div>
          <span className="text-neutral-300">/</span>
          <div className={`px-2.5 py-1 rounded-md text-xs font-medium ${step === 2 ? 'bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-600'}`}>
            2. Invite & Friends
          </div>
          <span className="text-neutral-300">/</span>
          <div className={`px-2.5 py-1 rounded-md text-xs font-medium ${step === 3 ? 'bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-600'}`}>
            3. Grok 4.6 Booking
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ================= STEP 1: DATES ================= */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-950 mb-1">
            Pick Trip Dates
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mb-6">
            Enter exact calendar dates or choose from the current-year statutory holiday long weekend set.
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1.5 uppercase tracking-wide">
                Trip Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Algonquin Lakefront Multi-Site Camp"
                className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-950"
              />
            </div>

            {/* Custom Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1.5 uppercase tracking-wide">
                  Start Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setSelectedLongWeekend(null);
                    }}
                    className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1.5 uppercase tracking-wide">
                  End Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setSelectedLongWeekend(null);
                    }}
                    className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-950"
                  />
                </div>
              </div>
            </div>

            {/* Curated Statutory Long-Weekend Set */}
            <div className="pt-4 border-t border-neutral-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  Or select current-year statutory long weekend (CA / US)
                </span>
                <span className="text-[11px] text-neutral-400">Maintained holiday set</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {longWeekends.map((lw) => {
                  const isSelected = selectedLongWeekend === lw.name;
                  return (
                    <button
                      type="button"
                      key={`${lw.name}-${lw.startDate}`}
                      onClick={() => handleSelectLongWeekend(lw)}
                      className={`text-left p-3 rounded-xl border text-xs transition flex items-center justify-between ${
                        isSelected
                          ? 'border-neutral-950 bg-neutral-950 text-white'
                          : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800'
                      }`}
                    >
                      <div>
                        <div className="font-semibold flex items-center gap-1.5">
                          <span>{lw.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isSelected ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-200 text-neutral-700'}`}>
                            {lw.country}
                          </span>
                        </div>
                        <div className={`text-[11px] mt-0.5 ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                          {lw.dates} ({lw.days} days)
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Trips Quick Management at Step 1 */}
            {activeTrips && activeTrips.length > 0 && (
              <div className="pt-4 border-t border-neutral-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    Active Trips ({activeTrips.length})
                  </span>
                  <span className="text-[11px] text-neutral-400">Manage or delete existing trips</span>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {activeTrips.map((at) => (
                    <div
                      key={at.id}
                      className="p-3 rounded-lg border border-neutral-200 bg-neutral-50 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-neutral-900 truncate">{at.title}</div>
                        <div className="text-[11px] text-neutral-500 font-mono">
                          {at.startDate} to {at.endDate} • {at.location}
                        </div>
                      </div>
                      {onDeleteTrip && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTripToDelete(at);
                          }}
                          title="Delete trip"
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!title.trim()) {
                    setTitle('Camping Trip 2026');
                  }
                  setStep(2);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-neutral-950 text-white rounded-lg hover:bg-neutral-800 transition text-xs font-medium"
              >
                <span>Continue to Invite & Friends</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= STEP 2: INVITE & FRIENDS ================= */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-950 mb-1">
            Trip Password & Friends
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mb-6">
            The password binds campers to this event. Select from your frequent-friends list so you never re-type emails.
          </p>

          <div className="space-y-6">
            
            {/* Password Generator */}
            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50">
              <label className="block text-xs font-semibold text-neutral-800 mb-1 uppercase tracking-wide">
                Trip Access Password
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full font-mono text-sm px-3 py-2 rounded-lg border border-neutral-300 bg-white focus:outline-none focus:border-neutral-950"
                />
                <button
                  type="button"
                  onClick={() => setPassword(`camp-${Math.random().toString(36).substring(2, 6)}-2026`)}
                  className="px-3 py-2 text-xs font-medium border border-neutral-300 bg-white hover:bg-neutral-100 rounded-lg transition shrink-0"
                >
                  Regenerate
                </button>
              </div>
              <p className="text-[11px] text-neutral-400 mt-2">
                Failure copy at gate is explicit: "Wrong password, please ask Host for the correct one."
              </p>
            </div>

            {/* People I Camp With (Frequent Friends) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wide">
                  People I Camp With ({frequentFriends.length})
                </label>
                <span className="text-[11px] text-neutral-400">Select to include in invite</span>
              </div>

              {frequentFriends.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {frequentFriends.map((friend) => {
                    const isChecked = selectedFriendEmails.includes(friend.friendEmail);
                    return (
                      <div
                        key={friend.id}
                        onClick={() => toggleFriend(friend.friendEmail)}
                        className={`p-3 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition ${
                          isChecked
                            ? 'border-neutral-950 bg-neutral-900 text-white'
                            : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800'
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{friend.friendName}</div>
                          <div className={`text-[11px] truncate max-w-[180px] ${isChecked ? 'text-neutral-300' : 'text-neutral-500'}`}>
                            {friend.friendEmail}
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isChecked ? 'bg-white text-neutral-950 border-white' : 'border-neutral-300'}`}>
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-neutral-200 text-center text-xs text-neutral-400">
                  No frequent friends saved yet. Add emails below to start your list.
                </div>
              )}
            </div>

            {/* Add More Camper Emails */}
            <div className="pt-3 border-t border-neutral-100">
              <label className="block text-xs font-semibold text-neutral-800 mb-1.5 uppercase tracking-wide">
                Add More Campers by Email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newFriendEmail}
                  onChange={(e) => setNewFriendEmail(e.target.value)}
                  placeholder="camper@example.com"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-950"
                />
                <button
                  type="button"
                  onClick={handleAddManualFriend}
                  className="px-4 py-2 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-lg transition shrink-0"
                >
                  + Add
                </button>
              </div>

              {selectedFriendEmails.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {selectedFriendEmails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => toggleFriend(email)}
                        className="hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-950 transition"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-5 py-2.5 bg-neutral-950 text-white rounded-lg hover:bg-neutral-800 transition text-xs font-medium"
              >
                <span>Proceed to Grok 4.6 Booking</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= STEP 3: BOOKING (GROK 4.6) ================= */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-6 h-6 rounded-md bg-neutral-950 text-white flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">
              Grok 4.6 Trip Intelligence
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mb-6">
            Sole recommendation engine for multi-group destination ranking: site restrictions, pricing, and amenities.
          </p>

          {/* Quick-suggestion chips */}
          <div className="mb-6 p-4 rounded-xl border border-neutral-100 bg-neutral-50/70">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">
              Quick Suggestions (No blank forms)
            </span>
            <div className="flex flex-wrap gap-2">
              {quickSuggestions.map((qs, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => applySuggestionChip(qs)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:border-neutral-950 transition text-neutral-800 font-medium"
                >
                  ⚡ {qs.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Parameters */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-2 uppercase tracking-wide">
                Preferred Activities
              </label>
              <div className="flex flex-wrap gap-1.5">
                {activityPills.map((act) => {
                  const active = activities.includes(act);
                  return (
                    <button
                      type="button"
                      key={act}
                      onClick={() => toggleActivity(act)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                        active
                          ? 'border-neutral-950 bg-neutral-950 text-white font-medium'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      {act}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Starting Location for distance calculation with Google Maps address suggestions */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wide">
                  Where do you start from? (Departure Point & Current Location)
                </label>
                <span className="text-[10px] text-neutral-500 font-medium">Google Maps Autocomplete</span>
              </div>
              <LocationAutocompleteInput
                value={startingLocation}
                onChange={(val, coords) => {
                  setStartingLocation(val);
                  if (coords) setStartingCoordinates(coords);
                }}
                onSelectSuggestion={(suggestion) => {
                  setStartingLocation(suggestion.description);
                  if (suggestion.coordinates) {
                    setStartingCoordinates(suggestion.coordinates);
                    handleSearchParks(activities, driveDistance, experienceLevel, suggestion.description, suggestion.coordinates);
                  } else {
                    handleSearchParks(activities, driveDistance, experienceLevel, suggestion.description, undefined);
                  }
                }}
                placeholder="Type city or address (e.g. Seattle, WA, Austin, TX, Denver, CO) or use GPS..."
                id="host-departure-point-input"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                Grok 4.6 enforces a strict driving radius originating directly from this location to recommend authentic, reachable campsites.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1.5 uppercase tracking-wide">
                  Driving Distance
                </label>
                <select
                  value={driveDistance}
                  onChange={(e) => setDriveDistance(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
                >
                  <option value="within 2 hrs">Within 2 hrs</option>
                  <option value="3-4 hrs drive">3-4 hrs drive</option>
                  <option value="5+ hrs drive">5+ hrs drive / remote</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1.5 uppercase tracking-wide">
                  Experience Level
                </label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
                >
                  <option value="Beginner">Beginner (Drive-in / Comfort stations)</option>
                  <option value="Intermediate">Intermediate (Canoe / Semi-wilderness)</option>
                  <option value="Backcountry / Expert">Backcountry / Expert (Portage / Bear Cache)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleSearchParks()}
                disabled={isAiLoading}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium border border-neutral-950 bg-white hover:bg-neutral-50 text-neutral-950 rounded-lg transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAiLoading ? 'Grok 4.6 analyzing...' : 'Re-run Grok 4.6 Engine'}</span>
              </button>
            </div>
          </div>

          {/* AI Recommended Parks Output */}
          <div className="space-y-4 mb-8">
            <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-600">
              Recommended Parks & Sites
            </span>

            {isAiLoading ? (
              <div className="p-8 border border-neutral-200 rounded-xl text-center bg-neutral-50/50">
                <div className="inline-block animate-spin w-5 h-5 border-2 border-neutral-950 border-t-transparent rounded-full mb-2"></div>
                <div className="text-xs font-medium text-neutral-700">Evaluating multi-group campsites & restrictions...</div>
                <div className="text-[11px] text-neutral-400 mt-1">Cross-referencing drive distance, water access, and seasonal conditions</div>
              </div>
            ) : recommendedParks.length > 0 ? (
              <div className="space-y-3">
                {recommendedParks.map((park, idx) => {
                  const isSelected = selectedPark?.name === park.name;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedPark(park)}
                      className={`p-4 rounded-xl border text-xs cursor-pointer transition ${
                        isSelected
                          ? 'border-neutral-950 bg-neutral-50 ring-1 ring-neutral-950'
                          : 'border-neutral-200 bg-white hover:border-neutral-400'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="font-semibold text-neutral-950 text-sm flex items-center gap-2">
                            <span>{park.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-neutral-200 text-neutral-800">
                              {park.experienceLevel}
                            </span>
                          </div>
                          <div className="text-neutral-500 flex items-center gap-3 mt-0.5">
                            <span>{park.location}</span>
                            <span>•</span>
                            <span>{park.driveDistance}</span>
                          </div>
                        </div>
                        <div className="text-right self-start">
                          <div className="font-mono font-semibold text-neutral-900">{park.pricePerNight}</div>
                        </div>
                      </div>

                      <p className="text-neutral-600 mb-3 leading-relaxed">
                        {park.description}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-neutral-200/60 text-[11px]">
                        <div>
                          <span className="font-semibold text-neutral-800 block mb-0.5">Site Restrictions:</span>
                          <ul className="list-disc list-inside text-neutral-500 space-y-0.5">
                            {park.restrictions?.slice(0, 3).map((r, ri) => (
                              <li key={ri}>{r}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="font-semibold text-neutral-800 block mb-0.5">Amenities:</span>
                          <ul className="list-disc list-inside text-neutral-500 space-y-0.5">
                            {park.amenities?.slice(0, 3).map((a, ai) => (
                              <li key={ai}>{a}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-neutral-200/60">
                        <span className="text-[11px] text-neutral-400">
                          {isSelected ? '✓ Selected as Trip Destination' : 'Tap to select this park'}
                        </span>
                        <div className={`px-2.5 py-1 rounded text-[11px] font-medium ${isSelected ? 'bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-700'}`}>
                          {isSelected ? 'Selected' : 'Choose Park'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 border border-neutral-200 rounded-xl">
                <input
                  type="text"
                  placeholder="Or manually enter park / campground name..."
                  value={customParkName}
                  onChange={(e) => setCustomParkName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-950"
                />
              </div>
            )}
          </div>

          {/* Creation confirmation */}
          <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-950 transition"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              id="host-create-trip-submit-btn"
              className="flex items-center gap-2 px-6 py-3 bg-neutral-950 text-white rounded-lg hover:bg-neutral-800 transition text-xs font-semibold shadow"
            >
              <span>{isSubmitting ? 'Creating Event...' : 'Create Event & Assign Groups'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
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
                <h3 className="text-base font-bold text-neutral-950">Delete Active Trip?</h3>
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
                onClick={() => {
                  if (tripToDelete && onDeleteTrip) {
                    onDeleteTrip(tripToDelete.id);
                  }
                  setTripToDelete(null);
                }}
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
