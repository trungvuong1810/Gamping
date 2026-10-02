import React, { useState, useEffect } from 'react';
import { User, Trip, LongWeekendOption, ParkRecommendation, Friend } from '../types';
import { fetchLongWeekends, getAiParkRecommendations, fetchFriends, createTrip } from '../api/client';
import { Calendar, Users, Sparkles, MapPin, DollarSign, AlertCircle, ArrowLeft, ArrowRight, Check, Key, Plus, Trash2, Clock, Shield, Filter, CalendarDays } from 'lucide-react';
import { LocationAutocompleteInput, LocationSuggestion } from './LocationAutocompleteInput';
import { calculateHolidayLongWeekends, formatFriendlyDate } from '../utils/holidays';

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
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [countryFilter, setCountryFilter] = useState<'ALL' | 'CA' | 'US'>('ALL');
  const [longWeekends, setLongWeekends] = useState<LongWeekendOption[]>(() => calculateHolidayLongWeekends(2026));
  const [selectedLongWeekend, setSelectedLongWeekend] = useState<string | null>('Canadian Thanksgiving Weekend');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('2026-10-09');
  const [endDate, setEndDate] = useState('2026-10-12');
  const [datesAutoUpdatedNotice, setDatesAutoUpdatedNotice] = useState<string | null>(null);
  const [pulseAnimation, setPulseAnimation] = useState(false);

  // Helper to calculate total calendar days
  const calculateDaysCount = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 0;
  };

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
  const [parkFilterQuery, setParkFilterQuery] = useState('');
  const [selectedPark, setSelectedPark] = useState<ParkRecommendation | null>(null);
  const [customParkName, setCustomParkName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);

  // Update holidays when selectedYear changes, and sync with server
  useEffect(() => {
    const calculated = calculateHolidayLongWeekends(selectedYear);
    setLongWeekends(calculated);

    // If a holiday is already selected, update From & To dates for the new year
    if (selectedLongWeekend) {
      const match = calculated.find(h => h.name === selectedLongWeekend);
      if (match) {
        setStartDate(match.startDate);
        setEndDate(match.endDate);
        setDatesAutoUpdatedNotice(`Updated From & To boxes to ${match.name} (${selectedYear}): ${match.dates} (${match.days} days)`);
        setPulseAnimation(true);
        setTimeout(() => setPulseAnimation(false), 1200);
      }
    }

    fetchLongWeekends(selectedYear)
      .then((data) => {
        if (data.holidays && data.holidays.length > 0) {
          setLongWeekends(data.holidays);
        }
      })
      .catch(() => {});
  }, [selectedYear]);

  // Load frequent friends
  useEffect(() => {
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

  // Handle holiday long weekend selection - automatically updates From & To boxes
  const handleSelectLongWeekend = (lw: LongWeekendOption) => {
    setSelectedLongWeekend(lw.name);
    setStartDate(lw.startDate);
    setEndDate(lw.endDate);
    setDatesAutoUpdatedNotice(`Auto-filled From & To boxes for ${lw.name}: ${lw.dates} (${lw.days} days)`);
    setPulseAnimation(true);
    setTimeout(() => setPulseAnimation(false), 1200);

    if (!title || longWeekends.some(h => title.includes(h.name) || title.includes('Multi-Site Camp'))) {
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

            {/* Trip Dates: From & To box */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wide flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-neutral-700" />
                  <span>Trip Dates (From &amp; To)</span>
                </label>
                {startDate && endDate && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      <span>{calculateDaysCount(startDate, endDate)} Days</span>
                    </span>
                    {selectedLongWeekend && (
                      <span className="text-[11px] font-medium text-neutral-600 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-full">
                        Preset: {selectedLongWeekend}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* FROM BOX */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  pulseAnimation
                    ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-300'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                }`}>
                  <label htmlFor="trip-date-from" className="block text-xs font-semibold text-neutral-800 mb-1 uppercase tracking-wide flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-black">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      From (Start Date)
                    </span>
                    <span className="text-[10px] font-normal text-neutral-400">Departure</span>
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      id="trip-date-from"
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setSelectedLongWeekend(null);
                        setDatesAutoUpdatedNotice(null);
                      }}
                      className="w-full text-sm font-medium px-3 py-2 rounded-lg border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>
                  <div className="mt-1.5 text-[11px] text-neutral-600 flex items-center gap-1 min-h-[16px]">
                    {startDate ? (
                      <span className="font-medium text-black">📅 {formatFriendlyDate(startDate)}</span>
                    ) : (
                      <span className="text-neutral-400">Select start date</span>
                    )}
                  </div>
                </div>

                {/* TO BOX */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  pulseAnimation
                    ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-300'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                }`}>
                  <label htmlFor="trip-date-to" className="block text-xs font-semibold text-neutral-800 mb-1 uppercase tracking-wide flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-black">
                      <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                      To (End Date)
                    </span>
                    <span className="text-[10px] font-normal text-neutral-400">Return</span>
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      id="trip-date-to"
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setSelectedLongWeekend(null);
                        setDatesAutoUpdatedNotice(null);
                      }}
                      className="w-full text-sm font-medium px-3 py-2 rounded-lg border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>
                  <div className="mt-1.5 text-[11px] text-neutral-600 flex items-center gap-1 min-h-[16px]">
                    {endDate ? (
                      <span className="font-medium text-black">📅 {formatFriendlyDate(endDate)}</span>
                    ) : (
                      <span className="text-neutral-400">Select end date</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Automatic update confirmation notification */}
              {datesAutoUpdatedNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900 animate-in fade-in duration-200">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span className="font-medium">{datesAutoUpdatedNotice}</span>
                </div>
              )}
            </div>

            {/* Curated Statutory Long-Weekend Holiday Presets */}
            <div className="pt-5 border-t border-neutral-200 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h3 className="text-sm font-semibold text-black flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-neutral-800" />
                    <span>Holiday Presets (Statutory Long Weekends)</span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Choose any statutory holiday preset below to automatically update the <strong>From</strong> and <strong>To</strong> calendar boxes with the exact days.
                  </p>
                </div>

                {/* Year Selector */}
                <div className="flex items-center gap-1 self-start sm:self-auto bg-neutral-100 p-1 rounded-lg border border-neutral-200">
                  <span className="text-[11px] font-medium text-neutral-500 px-1.5">Year:</span>
                  {[2025, 2026, 2027].map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setSelectedYear(yr)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                        selectedYear === yr
                          ? 'bg-black text-white shadow-xs'
                          : 'text-neutral-600 hover:text-black hover:bg-neutral-200'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Holiday Presets Dropdown & Country Filter */}
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label htmlFor="holiday-preset-select" className="text-xs font-semibold text-black uppercase tracking-wide">
                    Choose Holiday Preset:
                  </label>
                  {/* Country Filter Tabs */}
                  <div className="flex items-center gap-1 self-start sm:self-auto">
                    {(['ALL', 'CA', 'US'] as const).map((ctry) => (
                      <button
                        key={ctry}
                        type="button"
                        onClick={() => setCountryFilter(ctry)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md border transition ${
                          countryFilter === ctry
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                        }`}
                      >
                        {ctry === 'ALL' ? 'All Holidays' : ctry === 'CA' ? '🇨🇦 Canada' : '🇺🇸 US'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <select
                    id="holiday-preset-select"
                    value={selectedLongWeekend || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const match = longWeekends.find(lw => lw.name === val);
                      if (match) {
                        handleSelectLongWeekend(match);
                      } else {
                        setSelectedLongWeekend(null);
                        setDatesAutoUpdatedNotice(null);
                      }
                    }}
                    className="w-full text-sm font-medium px-3.5 py-2.5 rounded-lg border border-neutral-300 bg-white text-black focus:outline-none focus:border-black cursor-pointer shadow-xs"
                  >
                    <option value="">— Select Holiday Preset (Auto-updates From &amp; To) —</option>
                    {longWeekends
                      .filter(lw => countryFilter === 'ALL' || lw.country.includes(countryFilter))
                      .map((lw) => (
                        <option key={`opt-${lw.name}-${lw.startDate}`} value={lw.name}>
                          {lw.name} ({lw.country}) — {lw.dates} ({lw.days} days: From {lw.startDate} To {lw.endDate})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Curated Grid of Holiday Presets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {longWeekends
                  .filter(lw => countryFilter === 'ALL' || lw.country.includes(countryFilter))
                  .map((lw) => {
                    const isSelected = selectedLongWeekend === lw.name;
                    return (
                      <button
                        type="button"
                        key={`${lw.name}-${lw.startDate}`}
                        onClick={() => handleSelectLongWeekend(lw)}
                        className={`text-left p-3.5 rounded-xl border text-xs transition flex items-center justify-between group ${
                          isSelected
                            ? 'border-black bg-black text-white shadow-xs'
                            : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-300 text-neutral-800'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="font-semibold flex items-center gap-1.5">
                            <span className={isSelected ? 'text-white' : 'text-black'}>{lw.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                              isSelected ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-200 text-neutral-700'
                            }`}>
                              {lw.country}
                            </span>
                          </div>
                          <div className={`text-[11px] ${isSelected ? 'text-neutral-300' : 'text-neutral-600'}`}>
                            {lw.dates} ({lw.days} days)
                          </div>
                          <div className={`text-[10px] font-mono ${isSelected ? 'text-emerald-300' : 'text-neutral-500'}`}>
                            From: <strong className={isSelected ? 'text-white' : 'text-black'}>{lw.startDate}</strong> → To: <strong className={isSelected ? 'text-white' : 'text-black'}>{lw.endDate}</strong>
                          </div>
                        </div>
                        <div className="ml-2 shrink-0">
                          {isSelected ? (
                            <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <span className="text-[11px] font-medium text-neutral-400 group-hover:text-black">
                              Apply
                            </span>
                          )}
                        </div>
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

      {/* ================= STEP 2: TRIP PASSWORD & ACCESS ================= */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-950 mb-1">
            Trip Password &amp; Access
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mb-6">
            Set the password for your trip. Your friends will use the <strong>Trip Name</strong> and <strong>Password</strong> to join via the chat message you send them.
          </p>

          <div className="space-y-6">
            
            {/* Trip Name Confirmation */}
            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/80">
              <label className="block text-xs font-semibold text-neutral-700 mb-1 uppercase tracking-wide">
                Trip Name
              </label>
              <div className="font-bold text-sm text-neutral-950">
                {title || 'Untitled Camping Trip'}
              </div>
            </div>

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
                Ask your friends to enter this password when joining.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-neutral-200 bg-amber-50/70 text-xs text-amber-900 leading-relaxed">
              💬 <strong>Group Chat Ready:</strong> After completing setup, you can copy the Trip Name &amp; Password with one click and send it directly to your group chat.
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-600">
                Top 10 Recommended Parks & Campsites ({recommendedParks.length} loaded)
              </span>
              {recommendedParks.length > 0 && (
                <div className="relative max-w-xs w-full">
                  <input
                    type="text"
                    placeholder="Quick filter 10 parks..."
                    value={parkFilterQuery}
                    onChange={(e) => setParkFilterQuery(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-neutral-300 focus:outline-none focus:border-neutral-950 bg-white"
                  />
                </div>
              )}
            </div>

            {isAiLoading ? (
              <div className="p-8 border border-neutral-200 rounded-xl text-center bg-neutral-50/50">
                <div className="inline-block animate-spin w-5 h-5 border-2 border-neutral-950 border-t-transparent rounded-full mb-2"></div>
                <div className="text-xs font-medium text-neutral-700">Grok 4.6 synthesizing 10 verified regional campgrounds...</div>
                <div className="text-[11px] text-neutral-400 mt-1">Cross-referencing drive distance, water access, site capacity, and seasonal rules</div>
              </div>
            ) : recommendedParks.length > 0 ? (
              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {recommendedParks
                  .filter((park) => {
                    if (!parkFilterQuery.trim()) return true;
                    const q = parkFilterQuery.toLowerCase();
                    return (
                      park.name.toLowerCase().includes(q) ||
                      park.location.toLowerCase().includes(q) ||
                      park.description.toLowerCase().includes(q) ||
                      (park.experienceLevel && park.experienceLevel.toLowerCase().includes(q))
                    );
                  })
                  .map((park, idx) => {
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
