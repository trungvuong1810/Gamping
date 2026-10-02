import React, { useState } from 'react';
import { Trip, ParkRecommendation } from '../types';
import { LocationAutocompleteInput } from './LocationAutocompleteInput';
import { calculateHolidayLongWeekends } from '../utils/holidays';
import { Calendar, Compass, Users, X } from 'lucide-react';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tripData: {
    title: string;
    location: string;
    startDate: string;
    endDate: string;
    hostName: string;
    hostEmail: string;
    initialGroups: string[];
    parkDetails?: ParkRecommendation | null;
  }) => Promise<void>;
  initialTrip?: Trip | null;
}

export const CreateTripModal: React.FC<CreateTripModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialTrip
}) => {
  const [title, setTitle] = useState(initialTrip?.title || '');
  const [location, setLocation] = useState(initialTrip?.location || 'Yosemite National Park, CA');
  const [startDate, setStartDate] = useState(initialTrip?.startDate || '2026-10-10');
  const [endDate, setEndDate] = useState(initialTrip?.endDate || '2026-10-13');
  const [hostName, setHostName] = useState(initialTrip?.hostName || 'Camper Organizer');
  const [hostEmail, setHostEmail] = useState(initialTrip?.hostEmail || 'organizer@camp.local');
  const [group1, setGroup1] = useState('Group Alpha (Tent 1)');
  const [group2, setGroup2] = useState('Group Beta (Camp Chefs)');
  const [selectedHoliday, setSelectedHoliday] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const holidayPresets = React.useMemo(() => {
    return [
      ...calculateHolidayLongWeekends(2026),
      ...calculateHolidayLongWeekends(2027)
    ];
  }, []);

  if (!isOpen) return null;

  const handleSelectHolidayPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedHoliday(val);
    if (!val) return;

    const found = holidayPresets.find(h => `${h.name}-${h.startDate}` === val);
    if (found) {
      setStartDate(found.startDate);
      setEndDate(found.endDate);
      if (!title.trim() || title === 'Camp Expedition') {
        setTitle(`${found.name} Camp Trip`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate) return;

    setIsSubmitting(true);
    try {
      const groups = [group1.trim(), group2.trim()].filter(Boolean);
      await onSubmit({
        title: title.trim(),
        location: location.trim() || 'Wilderness Campground',
        startDate,
        endDate,
        hostName: hostName.trim() || 'Trip Host',
        hostEmail: hostEmail.trim() || 'organizer@camp.local',
        initialGroups: groups.length > 0 ? groups : ['Group Alpha', 'Group Beta'],
        parkDetails: initialTrip?.parkDetails || null
      });
      onClose();
    } catch (err) {
      console.error('Failed to create trip:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
      <div className="bg-white border-2 border-black max-w-lg w-full p-6 text-black max-h-[90vh] flex flex-col animate-slide-up space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black">
          <div>
            <h3 className="font-black text-black text-base uppercase tracking-tight">
              {initialTrip ? 'Edit Camping Trip Details' : 'Plan Camping Trip with Friends'}
            </h3>
            <p className="text-xs text-black/70">
              Synchronized with Google Sheets across all devices
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-black hover:opacity-60 text-xl font-bold p-1 cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="py-2 overflow-y-auto space-y-4 touch-scroll flex-1">
          {/* Trip Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
              Expedition / Trip Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Redwood Coast Canoe & Camp, Algonquin Summer Trip"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-white border border-black focus:outline-hidden font-medium"
            />
          </div>

          {/* Destination with Google Maps Autocomplete */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
              Campground / Destination (Google Maps Places) *
            </label>
            <LocationAutocompleteInput
              value={location}
              onChange={(val) => setLocation(val)}
              placeholder="Search national park, provincial park, or city..."
            />
          </div>

          {/* Holiday Presets Selection */}
          <div className="p-4 border border-black bg-neutral-50 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-black">
              <Calendar className="w-3.5 h-3.5 text-black" />
              <span>Holiday & Long Weekend Presets</span>
            </div>
            <p className="text-xs text-black/70 leading-relaxed">
              Choosing a preset automatically updates the From and To calendar dates:
            </p>
            <select
              value={selectedHoliday}
              onChange={handleSelectHolidayPreset}
              className="w-full text-xs px-3 py-2 bg-white border border-black focus:outline-hidden font-medium text-black"
            >
              <option value="">Select a holiday long weekend...</option>
              {holidayPresets.map((h, i) => (
                <option key={i} value={`${h.name}-${h.startDate}`}>
                  {h.name} ({h.dates}) - {h.country}
                </option>
              ))}
            </select>
          </div>

          {/* Dates From & To */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                From (Departure Date) *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-black focus:outline-hidden font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                To (Return Date) *
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-black focus:outline-hidden font-medium"
              />
            </div>
          </div>

          {/* Initial Groups Setup (if new trip) */}
          {!initialTrip && (
            <div className="p-4 border border-black bg-white space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-black">
                <Users className="w-3.5 h-3.5 text-black" />
                <span>Initial Camping Groups</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Group 1 name"
                  value={group1}
                  onChange={(e) => setGroup1(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 bg-white border border-black text-black focus:outline-hidden font-medium"
                />
                <input
                  type="text"
                  placeholder="Group 2 name"
                  value={group2}
                  onChange={(e) => setGroup2(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 bg-white border border-black text-black focus:outline-hidden font-medium"
                />
              </div>
            </div>
          )}

          {/* Organizer Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                Your Name (Organizer) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Trung"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-black focus:outline-hidden font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                Your Email
              </label>
              <input
                type="email"
                placeholder="organizer@camp.local"
                value={hostEmail}
                onChange={(e) => setHostEmail(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-black focus:outline-hidden font-medium"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-black flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-black bg-white border border-black hover:bg-neutral-100 cursor-pointer uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="bg-[#D6B588] hover:bg-[#c9a676] text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 border border-black transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : initialTrip ? 'Update Trip' : 'Create Expedition'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
