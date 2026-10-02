import React, { useState, useEffect } from 'react';
import { Trip, TripMember, Group, GroupMember, EquipmentItem, FoodItem, User } from '../types';
import { GroupAssignView } from './GroupAssignView';
import { EquipmentView } from './EquipmentView';
import { FoodListView } from './FoodListView';
import { ShareTripModal } from './ShareTripModal';
import { WeatherAlertView } from './WeatherAlertView';
import { updateTrip } from '../api/client';
import { Calendar, MapPin, KeyRound, Copy, Check, Lock, RotateCw, Users, ShieldAlert, ArrowLeft, ExternalLink, Sparkles, ChevronDown, ChevronUp, Share2, CloudSun, Trash2, ArrowRight, UserCheck } from 'lucide-react';

interface TripViewProps {
  trip: Trip;
  currentUser: User;
  members: TripMember[];
  groups: Group[];
  groupMembers: GroupMember[];
  equipment: EquipmentItem[];
  food: FoodItem[];
  isPast: boolean;
  onRefreshTrip: () => void;
  onBack: () => void;
  onDeleteTrip?: (tripId: string) => void;
}

export const TripView: React.FC<TripViewProps> = ({
  trip,
  currentUser,
  members,
  groups,
  groupMembers,
  equipment,
  food,
  isPast,
  onRefreshTrip,
  onBack,
  onDeleteTrip
}) => {
  const [activeTab, setActiveTab] = useState<'groups' | 'equipment' | 'food' | 'weather'>('groups');
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [isRotatingPassword, setIsRotatingPassword] = useState(false);
  const [showParkDetails, setShowParkDetails] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const isHost = trip.hostId === currentUser.id;

  // Real-time polling so newly joined friends appear live without manual reloading
  useEffect(() => {
    const pollInterval = setInterval(() => {
      onRefreshTrip();
    }, 6000);
    return () => clearInterval(pollInterval);
  }, [onRefreshTrip]);

  // Identify assigned vs unassigned campers
  const assignedUserIds = new Set(groupMembers.map(gm => gm.userId));
  const unassignedMembers = members.filter(m => !assignedUserIds.has(m.userId));

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(trip.password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleRotatePassword = async () => {
    if (!isHost || isPast) return;
    const newPass = `camp-${Math.random().toString(36).substring(2, 6)}-2026`;
    setIsRotatingPassword(true);
    try {
      await updateTrip(trip.id, {
        userId: currentUser.id,
        password: newPass
      });
      onRefreshTrip();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRotatingPassword(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      
      {/* Top back navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-neutral-600 hover:text-neutral-950 transition min-h-[44px] py-2 px-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Clearing</span>
        </button>

        <div className="flex items-center gap-2">
          {onDeleteTrip && (
            <button
              onClick={() => setShowDeleteModal(true)}
              title="Delete this camping trip"
              className="min-h-[36px] px-3 py-1.5 rounded-full text-[11px] font-semibold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete Trip</span>
            </button>
          )}

          {isPast ? (
            <span className="text-[11px] font-mono px-3 py-1.5 rounded-full bg-neutral-200 text-neutral-700 flex items-center gap-1.5 font-semibold">
              <Lock className="w-3 h-3 text-neutral-600" />
              Past Trip (Locked)
            </span>
          ) : (
            <span className="text-[11px] font-mono px-3 py-1.5 rounded-full bg-neutral-950 text-white flex items-center gap-1.5 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Active Trip
            </span>
          )}
        </div>
      </div>

      {/* Main Trip Card Header */}
      <div className="p-4 sm:p-7 rounded-2xl border border-neutral-200 bg-white shadow-xs mb-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950">
              {trip.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-600">
              <span className="flex items-center gap-1.5 font-semibold">
                <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                {trip.startDate} to {trip.endDate}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                {trip.location}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Users className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                {members.length} camper{members.length === 1 ? '' : 's'} ({groups.length} group{groups.length === 1 ? '' : 's'})
              </span>
            </div>
          </div>

          {/* Trip Password Pill & Copy Link */}
          <div className="flex flex-wrap items-center gap-2 self-start bg-neutral-50 p-2 sm:p-2.5 rounded-xl border border-neutral-200/80 w-full lg:w-auto">
            <div className="text-left lg:text-right pl-1 min-w-[100px]">
              <div className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">
                Gate Password
              </div>
              <div className="font-mono text-xs font-bold text-neutral-900">
                {trip.password}
              </div>
            </div>

            <div className="flex items-center gap-1 ml-auto lg:ml-0">
              <button
                onClick={handleCopyPassword}
                id="copy-trip-password-btn"
                title="Copy password to clipboard"
                className="min-h-[38px] min-w-[38px] p-2 rounded-lg hover:bg-neutral-200 text-neutral-700 transition flex items-center justify-center border border-neutral-200 bg-white"
              >
                {copiedPassword ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>

              {isHost && !isPast && (
                <button
                  onClick={handleRotatePassword}
                  disabled={isRotatingPassword}
                  title="Rotate trip password"
                  className="min-h-[38px] min-w-[38px] p-2 rounded-lg hover:bg-neutral-200 text-neutral-700 transition flex items-center justify-center border border-neutral-200 bg-white"
                >
                  <RotateCw className={`w-4 h-4 ${isRotatingPassword ? 'animate-spin' : ''}`} />
                </button>
              )}

              {!isPast && (
                <button
                  onClick={() => setShowShareModal(true)}
                  className="min-h-[38px] flex items-center gap-1.5 px-3 py-2 bg-neutral-950 text-white rounded-lg hover:bg-neutral-800 transition text-xs font-semibold shrink-0"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Trip Details</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Collapsible Site & Restrictions Quick View */}
        {trip.parkDetails && (
          <div className="pt-3 border-t border-neutral-100">
            <button
              onClick={() => setShowParkDetails(!showParkDetails)}
              className="w-full flex items-center justify-between text-xs text-neutral-600 hover:text-neutral-950 transition font-semibold min-h-[40px]"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-neutral-800" />
                <span>Park site rules & amenities ({trip.parkDetails?.name || trip.location})</span>
              </div>
              {showParkDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showParkDetails && (
              <div className="mt-3 p-4 rounded-xl border border-neutral-200 bg-neutral-50/70 text-xs space-y-3 animate-in fade-in">
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-neutral-700 bg-white p-2.5 rounded-lg border border-neutral-200">
                  <span>Drive: <strong>{trip.parkDetails.driveDistance}</strong></span>
                  <span>Rate: <strong>{trip.parkDetails.pricePerNight}</strong></span>
                  <span>Level: <strong>{trip.parkDetails.experienceLevel}</strong></span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="font-semibold text-neutral-900 block mb-1">Key Site Restrictions:</span>
                    <ul className="list-disc list-inside text-neutral-600 space-y-0.5">
                      {trip.parkDetails.restrictions?.map((r: string, i: number) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="font-semibold text-neutral-900 block mb-1">Amenities on Site:</span>
                    <ul className="list-disc list-inside text-neutral-600 space-y-0.5">
                      {trip.parkDetails.amenities?.map((a: string, i: number) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Joined Friends & Campers Quick Roster Bar */}
        <div className="pt-3 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
              Joined Campers:
            </span>
            <div className="flex items-center -space-x-1.5 overflow-hidden">
              {members.slice(0, 7).map((m) => (
                <div
                  key={m.id}
                  title={`${m.name} (${m.userId === trip.hostId ? 'Host' : 'Camper'})`}
                  className="w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-[10px] ring-2 ring-white"
                >
                  {m.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {members.length > 7 && (
                <div className="w-6 h-6 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center font-bold text-[10px] ring-2 ring-white">
                  +{members.length - 7}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap text-neutral-800 font-medium">
              {members.map((m, idx) => (
                <span key={m.id} className="inline-flex items-center">
                  <span className={m.userId === trip.hostId ? 'font-bold' : ''}>
                    {m.name}{m.userId === trip.hostId ? ' (Host)' : ''}
                  </span>
                  {idx < members.length - 1 && <span className="text-neutral-300 ml-1.5">•</span>}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={() => setActiveTab('groups')}
            className="text-[11px] font-semibold text-neutral-900 hover:underline flex items-center gap-1 shrink-0 self-start sm:self-center"
          >
            <span>Manage Groups</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

      </div>

      {/* Unassigned Campers Notification Banner (When friends join trip) */}
      {unassignedMembers.length > 0 && (
        <div className="mb-6 animate-in fade-in">
          {isHost ? (
            <button
              onClick={() => setActiveTab('groups')}
              id="host-unassigned-alert-banner"
              className="w-full p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 text-xs font-semibold flex items-center justify-between hover:bg-amber-500/20 transition shadow-xs"
            >
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></div>
                <div>
                  <div className="font-bold text-amber-900">
                    ⚡ {unassignedMembers.length} friend{unassignedMembers.length === 1 ? '' : 's'} joined this trip!
                  </div>
                  <div className="text-[11px] text-amber-800 font-normal">
                    {unassignedMembers.map(m => m.name).join(', ')} {unassignedMembers.length === 1 ? 'is' : 'are'} waiting to be assigned to a campsite group. Only you (Host) can assign them.
                  </div>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-amber-900 text-white text-[11px] font-bold flex items-center gap-1 shrink-0 ml-2">
                <span>Assign Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          ) : (
            <div className="p-3.5 rounded-2xl bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-neutral-500" />
                <span>
                  <strong>{unassignedMembers.length} camper{unassignedMembers.length === 1 ? '' : 's'}</strong> ({unassignedMembers.map(m => m.name).join(', ')}) joined and {unassignedMembers.length === 1 ? 'is' : 'are'} awaiting group assignment by Host ({trip.hostName}).
                </span>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">Host assigns groups</span>
            </div>
          )}
        </div>
      )}

      {/* Main Tabs Navigation (Touch scrollable on mobile) */}
      <div className="flex items-center gap-1 border-b border-neutral-200 mb-6 text-xs sm:text-sm overflow-x-auto scrollbar-none touch-scroll pb-1">
        <button
          onClick={() => setActiveTab('groups')}
          id="tab-group-assign"
          className={`px-3.5 sm:px-4 py-3 font-semibold border-b-2 transition flex items-center gap-2 shrink-0 min-h-[44px] ${
            activeTab === 'groups'
              ? 'border-neutral-950 text-neutral-950'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Group Assign</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-700">
            {groups.length}
          </span>
          {unassignedMembers.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 font-bold font-mono">
              {unassignedMembers.length} unassigned
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('equipment')}
          id="tab-equipment-check"
          className={`px-3.5 sm:px-4 py-3 font-semibold border-b-2 transition flex items-center gap-2 shrink-0 min-h-[44px] ${
            activeTab === 'equipment'
              ? 'border-neutral-950 text-neutral-950'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Equipment Check</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-700">
            {equipment.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('food')}
          id="tab-food-list"
          className={`px-3.5 sm:px-4 py-3 font-semibold border-b-2 transition flex items-center gap-2 shrink-0 min-h-[44px] ${
            activeTab === 'food'
              ? 'border-neutral-950 text-neutral-950'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Food List</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-700">
            {food.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('weather')}
          id="tab-weather-alert"
          className={`px-3.5 sm:px-4 py-3 font-semibold border-b-2 transition flex items-center gap-2 shrink-0 min-h-[44px] ${
            activeTab === 'weather'
              ? 'border-neutral-950 text-neutral-950'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <CloudSun className="w-4 h-4" />
          <span>Weather & 1-Wk Alert</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-700">
            Forecast
          </span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'groups' && (
        <GroupAssignView
          trip={trip}
          currentUser={currentUser}
          members={members}
          groups={groups}
          groupMembers={groupMembers}
          isPast={isPast}
          onRefreshTrip={onRefreshTrip}
        />
      )}

      {activeTab === 'equipment' && (
        <EquipmentView
          trip={trip}
          currentUser={currentUser}
          groups={groups}
          groupMembers={groupMembers}
          equipment={equipment}
          isPast={isPast}
          onRefreshTrip={onRefreshTrip}
        />
      )}

      {activeTab === 'food' && (
        <FoodListView
          trip={trip}
          currentUser={currentUser}
          groups={groups}
          groupMembers={groupMembers}
          food={food}
          isPast={isPast}
          onRefreshTrip={onRefreshTrip}
        />
      )}

      {activeTab === 'weather' && (
        <WeatherAlertView
          trip={trip}
          currentUser={currentUser}
          members={members}
          onRefreshTrip={onRefreshTrip}
        />
      )}

      {showShareModal && (
        <ShareTripModal
          trip={trip}
          currentUser={currentUser}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Delete Trip Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-950">Delete This Camping Trip?</h3>
                <p className="text-xs text-neutral-500">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-3 rounded-xl border border-neutral-100">
              Are you sure you want to delete <strong className="text-neutral-950">"{trip.title}"</strong> ({trip.location})? All associated groups, assigned equipment checklist items, and planned menus will be removed.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-950 transition rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  if (onDeleteTrip) {
                    onDeleteTrip(trip.id);
                  }
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
