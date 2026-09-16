import React, { useState } from 'react';
import { Trip, TripMember, Group, GroupMember, EquipmentItem, FoodItem, User } from '../types';
import { GroupAssignView } from './GroupAssignView';
import { EquipmentView } from './EquipmentView';
import { FoodListView } from './FoodListView';
import { EmailInviteModal } from './EmailInviteModal';
import { WeatherAlertView } from './WeatherAlertView';
import { updateTrip } from '../api/client';
import { Calendar, MapPin, KeyRound, Copy, Check, Lock, RotateCw, Users, ShieldAlert, ArrowLeft, ExternalLink, Sparkles, ChevronDown, ChevronUp, Mail, CloudSun, Trash2 } from 'lucide-react';

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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const isHost = trip.hostId === currentUser.id;

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
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-medium text-neutral-600 hover:text-neutral-950 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Clearing</span>
        </button>

        <div className="flex items-center gap-2">
          {onDeleteTrip && (
            <button
              onClick={() => setShowDeleteModal(true)}
              title="Delete this camping trip"
              className="px-3 py-1 rounded-full text-[11px] font-semibold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete Trip</span>
            </button>
          )}

          {isPast ? (
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-neutral-200 text-neutral-700 flex items-center gap-1.5 font-medium">
              <Lock className="w-3 h-3 text-neutral-600" />
              Past Trip • Historical Memory (Locked)
            </span>
          ) : (
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-neutral-950 text-white flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Active Multi-Group Trip
            </span>
          )}
        </div>
      </div>

      {/* Main Trip Card Header */}
      <div className="p-6 sm:p-7 rounded-2xl border border-neutral-200 bg-white shadow-xs mb-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950 mb-1.5">
              {trip.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                {trip.startDate} to {trip.endDate}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                {trip.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-neutral-400" />
                {members.length} camper{members.length === 1 ? '' : 's'} across {groups.length} group{groups.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {/* Trip Password Pill & Copy Link */}
          <div className="flex items-center gap-2 self-start bg-neutral-50 p-2 rounded-xl border border-neutral-200/80">
            <div className="text-right pl-1">
              <div className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">
                Gate Password
              </div>
              <div className="font-mono text-xs font-semibold text-neutral-900">
                {trip.password}
              </div>
            </div>

            <button
              onClick={handleCopyPassword}
              id="copy-trip-password-btn"
              title="Copy password to clipboard"
              className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-600 transition"
            >
              {copiedPassword ? <Check className="w-3.5 h-3.5 text-neutral-950" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {isHost && !isPast && (
              <button
                onClick={handleRotatePassword}
                disabled={isRotatingPassword}
                title="Rotate trip password"
                className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-600 transition"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRotatingPassword ? 'animate-spin' : ''}`} />
              </button>
            )}

            {!isPast && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950 text-white rounded-lg hover:bg-neutral-800 transition text-xs font-medium shrink-0 ml-1"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Invite Friends (Email Link)</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Site & Restrictions Quick View */}
        {trip.parkDetails && (
          <div className="pt-3 border-t border-neutral-100">
            <button
              onClick={() => setShowParkDetails(!showParkDetails)}
              className="w-full flex items-center justify-between text-xs text-neutral-600 hover:text-neutral-950 transition font-medium"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-neutral-800" />
                <span>Park site rules, pricing & amenities ({trip.parkDetails.name})</span>
              </div>
              {showParkDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showParkDetails && (
              <div className="mt-3 p-4 rounded-xl border border-neutral-200 bg-neutral-50/70 text-xs space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between font-mono text-[11px] text-neutral-600">
                  <span>Drive: {trip.parkDetails.driveDistance}</span>
                  <span>Rate: {trip.parkDetails.pricePerNight}</span>
                  <span>Level: {trip.parkDetails.experienceLevel}</span>
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

      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-neutral-200 mb-6 text-xs sm:text-sm">
        <button
          onClick={() => setActiveTab('groups')}
          id="tab-group-assign"
          className={`px-4 py-2.5 font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === 'groups'
              ? 'border-neutral-950 text-neutral-950 font-semibold'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Group Assign</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-700">
            {groups.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('equipment')}
          id="tab-equipment-check"
          className={`px-4 py-2.5 font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === 'equipment'
              ? 'border-neutral-950 text-neutral-950 font-semibold'
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
          className={`px-4 py-2.5 font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === 'food'
              ? 'border-neutral-950 text-neutral-950 font-semibold'
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
          className={`px-4 py-2.5 font-medium border-b-2 transition flex items-center gap-2 ${
            activeTab === 'weather'
              ? 'border-neutral-950 text-neutral-950 font-semibold'
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

      {showInviteModal && (
        <EmailInviteModal
          trip={trip}
          currentUser={currentUser}
          onClose={() => setShowInviteModal(false)}
          onInvitationsSent={() => onRefreshTrip()}
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
