import React, { useState, useEffect, useCallback } from 'react';
import {
  Trip,
  TripMember,
  Group,
  EquipmentItem,
  FoodItem,
  PackingCategory,
  MealTime,
  WeatherReport
} from './types';
import {
  fetchActiveTrip,
  fetchTripDetails,
  createTrip,
  updateTrip,
  createGroup,
  fetchTripWeather
} from './api/client';
import { CampOverviewTab } from './components/CampOverviewTab';
import { GroupsMembersTab } from './components/GroupsMembersTab';
import { GearChecklistTab } from './components/GearChecklistTab';
import { CampMenuTab } from './components/CampMenuTab';
import { WeatherTab } from './components/WeatherTab';
import { CreateTripModal } from './components/CreateTripModal';
import {
  Compass,
  Users,
  Backpack,
  Utensils,
  CloudSun,
  Plus,
  Cloud,
  User as UserIcon
} from 'lucide-react';

type ActiveTab = 'overview' | 'groups' | 'gear' | 'food' | 'weather';

export default function App() {
  // Active trip state
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [food, setFood] = useState<FoodItem[]>([]);
  const [weatherReport, setWeatherReport] = useState<WeatherReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Active camper remembered on this device
  const [currentMember, setCurrentMember] = useState<TripMember | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditTripModal, setShowEditTripModal] = useState(false);

  // Load initial active trip
  const loadTripData = useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    try {
      const data = await fetchActiveTrip();
      if (data && data.trip) {
        setTrip(data.trip);
        setMembers(data.members || []);
        setGroups(data.groups || []);
        setEquipment(data.equipment || []);
        setFood(data.food || []);

        // Reconcile saved camper identity for this device
        const savedCamperId = localStorage.getItem('camping_active_camper_id');
        const matched = (data.members || []).find((m) => m.id === savedCamperId);
        if (matched) {
          setCurrentMember(matched);
        } else if (data.members && data.members.length > 0 && !currentMember) {
          setCurrentMember(data.members[0]);
        }

        // Fetch weather for this trip
        fetchTripWeather(data.trip.id)
          .then((wRes) => {
            if (wRes?.weather) {
              setWeatherReport(wRes.weather);
            }
          })
          .catch((e) => console.warn('Weather fetch notice:', e));
      } else {
        setTrip(null);
      }
    } catch (err) {
      console.error('Failed to load active trip:', err);
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, [currentMember]);

  // Initial load
  useEffect(() => {
    loadTripData(true);
  }, []);

  // Background real-time synchronization polling every 10 seconds across all devices
  useEffect(() => {
    if (!trip?.id) return;

    const interval = setInterval(async () => {
      try {
        const details = await fetchTripDetails(trip.id);
        if (details && details.trip) {
          setTrip(details.trip);
          setMembers(details.members || []);
          setGroups(details.groups || []);
          setEquipment(details.equipment || []);
          setFood(details.food || []);
        }
      } catch (err) {
        // Silent background poll
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [trip?.id]);

  // Select camper identity on this device
  const handleSelectCurrentMember = (member: TripMember) => {
    setCurrentMember(member);
    localStorage.setItem('camping_active_camper_id', member.id);
  };

  // Handle Trip creation
  const handleCreateTripSubmit = async (tripData: {
    title: string;
    location: string;
    startDate: string;
    endDate: string;
    hostName: string;
    hostEmail: string;
    initialGroups: string[];
  }) => {
    const res = await createTrip({
      title: tripData.title,
      location: tripData.location,
      startDate: tripData.startDate,
      endDate: tripData.endDate,
      hostName: tripData.hostName,
      hostEmail: tripData.hostEmail,
      hostId: `usr_${Date.now()}`,
      password: 'camp'
    });

    const createdTrip = res.trip;
    setTrip(createdTrip);

    if (tripData.initialGroups.length > 1) {
      for (let i = 1; i < tripData.initialGroups.length; i++) {
        await createGroup(createdTrip.id, {
          userId: createdTrip.hostId,
          name: tripData.initialGroups[i]
        });
      }
    }

    await loadTripData(true);
  };

  // Handle Trip edit
  const handleEditTripSubmit = async (tripData: {
    title: string;
    location: string;
    startDate: string;
    endDate: string;
    hostName: string;
    hostEmail: string;
  }) => {
    if (!trip) return;
    const res = await updateTrip(trip.id, {
      userId: trip.hostId,
      title: tripData.title,
      location: tripData.location,
      startDate: tripData.startDate,
      endDate: tripData.endDate
    });
    setTrip(res.trip);
    await loadTripData();
  };

  // Toggle equipment packed status
  const handleTogglePacked = async (itemId: string, packed: boolean) => {
    if (!trip) return;
    const updated = equipment.map((e) => (e.id === itemId ? { ...e, packed } : e));
    setEquipment(updated);

    try {
      await fetch(`/api/trips/${trip.id}/equipment/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packed, userId: currentMember?.userId || trip.hostId })
      });
    } catch (err) {
      console.error('Failed to toggle packed:', err);
    }
  };

  // Add single equipment item
  const handleAddEquipment = async (data: {
    name: string;
    category: PackingCategory;
    groupId: string;
    assignedTo?: string;
    notes?: string;
  }) => {
    if (!trip) return;
    const newItem: EquipmentItem = {
      id: `eq_${Date.now()}`,
      tripId: trip.id,
      groupId: data.groupId,
      name: data.name,
      category: data.category,
      assignedTo: data.assignedTo || 'Unassigned',
      packed: false,
      notes: data.notes
    };

    const updated = [newItem, ...equipment];
    setEquipment(updated);

    try {
      await fetch(`/api/trips/${trip.id}/equipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentMember?.userId || trip.hostId,
          ...data
        })
      });
    } catch (err) {
      console.error('Failed to add equipment:', err);
    }
  };

  // Delete equipment item
  const handleDeleteEquipment = async (itemId: string) => {
    if (!trip) return;
    const updated = equipment.filter((e) => e.id !== itemId);
    setEquipment(updated);

    try {
      await fetch(`/api/trips/${trip.id}/equipment/${itemId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentMember?.userId || trip.hostId })
      });
    } catch (err) {
      console.error('Failed to delete equipment:', err);
    }
  };

  // Batch add equipment from Grok
  const handleBatchAddEquipment = async (
    items: Array<{ name: string; category: PackingCategory; groupId: string; notes: string; aiSuggested: boolean }>
  ) => {
    if (!trip || items.length === 0) return;

    const newItems: EquipmentItem[] = items.map((it, idx) => ({
      id: `eq_ai_${Date.now()}_${idx}`,
      tripId: trip.id,
      groupId: it.groupId,
      name: it.name,
      category: it.category,
      assignedTo: 'Unassigned',
      packed: false,
      notes: it.notes,
      aiSuggested: true
    }));

    const updated = [...newItems, ...equipment];
    setEquipment(updated);

    try {
      for (const item of items) {
        await fetch(`/api/trips/${trip.id}/equipment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentMember?.userId || trip.hostId,
            name: item.name,
            category: item.category,
            groupId: item.groupId,
            notes: item.notes,
            aiSuggested: true
          })
        });
      }
    } catch (err) {
      console.error('Failed to batch add equipment:', err);
    }
  };

  // Add meal item
  const handleAddMeal = async (data: {
    title: string;
    mealTime: MealTime;
    groupId: string;
    ingredientsOrItems: string;
    description: string;
    cookOrBringer: string;
    dayLabel: string;
  }) => {
    if (!trip) return;
    const newMeal: FoodItem = {
      id: `fd_${Date.now()}`,
      tripId: trip.id,
      groupId: data.groupId,
      title: data.title,
      mealTime: data.mealTime,
      description: data.description,
      ingredientsOrItems: data.ingredientsOrItems,
      cookOrBringer: data.cookOrBringer,
      preparers: [],
      ingredientBringers: [],
      status: 'planned',
      dayLabel: data.dayLabel
    };

    const updated = [...food, newMeal];
    setFood(updated);

    try {
      await fetch(`/api/trips/${trip.id}/food`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentMember?.userId || trip.hostId,
          ...data
        })
      });
    } catch (err) {
      console.error('Failed to add meal:', err);
    }
  };

  // Update meal status
  const handleUpdateMealStatus = async (foodId: string, status: 'planned' | 'purchased' | 'packed') => {
    if (!trip) return;
    const updated = food.map((f) => (f.id === foodId ? { ...f, status } : f));
    setFood(updated);

    try {
      await fetch(`/api/trips/${trip.id}/food/${foodId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, userId: currentMember?.userId || trip.hostId })
      });
    } catch (err) {
      console.error('Failed to update meal status:', err);
    }
  };

  // Delete meal
  const handleDeleteMeal = async (foodId: string) => {
    if (!trip) return;
    const updated = food.filter((f) => f.id !== foodId);
    setFood(updated);

    try {
      await fetch(`/api/trips/${trip.id}/food/${foodId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentMember?.userId || trip.hostId })
      });
    } catch (err) {
      console.error('Failed to delete meal:', err);
    }
  };

  // Add member to group
  const handleAddMember = async (data: { name: string; email: string; groupId: string; role: 'host' | 'member' }) => {
    if (!trip) return;
    try {
      const res = await fetch(`/api/trips/${trip.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        await loadTripData();
      }
    } catch (err) {
      console.error('Failed to add member:', err);
    }
  };

  // Add new group
  const handleAddGroup = async (data: { name: string; siteLabel?: string; description?: string }) => {
    if (!trip) return;
    try {
      await createGroup(trip.id, {
        userId: trip.hostId,
        ...data
      });
      await loadTripData();
    } catch (err) {
      console.error('Failed to add group:', err);
    }
  };

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-2 border-black bg-white flex items-center justify-center mx-auto animate-pulse">
            <Compass className="w-6 h-6 text-black animate-spin" />
          </div>
          <h2 className="font-black uppercase text-sm tracking-widest text-black">Loading Camping Expedition...</h2>
          <p className="text-xs text-black/60">Loading your trip</p>
        </div>
      </div>
    );
  }

  // Welcome Screen (if database is empty)
  if (!trip) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col justify-between">
        {/* Navigation Bar */}
        <header className="border-b border-black px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-black bg-white flex items-center justify-center font-bold text-lg">
              🏕️
            </div>
            <div>
              <span className="font-black text-base tracking-tight uppercase text-black block">CAMPING SYNC</span>
              <span className="text-[11px] text-black/70 font-semibold uppercase tracking-wider block -mt-0.5">Group Camping Trip Planner</span>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="max-w-4xl mx-auto px-6 py-16 text-center space-y-8">
          <div className="inline-block bg-[#D6B588] text-white font-bold text-xs uppercase tracking-wider px-3.5 py-1.5 border border-black">
            Private Camping Planner for You & Friends
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-black tracking-tight uppercase max-w-2xl mx-auto leading-tight">
            Plan your group camping trip together.
          </h1>

          <p className="text-sm sm:text-base text-black/80 max-w-xl mx-auto leading-relaxed">
            Everyone who opens the link — on any phone or computer — sees the same gear lists, group menus and weather updates, saved safely in the cloud.
          </p>

          <div className="pt-4 flex items-center justify-center">
            {/* #D6B588 box with inner white text */}
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="bg-[#D6B588] hover:bg-[#c9a676] text-white font-bold text-xs uppercase tracking-wider px-8 py-3.5 border border-black transition-all cursor-pointer flex items-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Plan Camping Trip</span>
            </button>
          </div>

          {/* Highlights */}
          <div className="pt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <div className="p-6 border border-black bg-white space-y-2">
              <Cloud className="w-6 h-6 text-black" />
              <h3 className="font-black uppercase text-sm text-black">Saved in the Cloud</h3>
              <p className="text-xs text-black/70 leading-relaxed">
                Trips, groups, gear and meals are stored in a real database, so nothing disappears and every device sees the latest plan.
              </p>
            </div>

            <div className="p-6 border border-black bg-white space-y-2">
              <Users className="w-6 h-6 text-black" />
              <h3 className="font-black uppercase text-sm text-black">Grouped Gear & Menus</h3>
              <p className="text-xs text-black/70 leading-relaxed">
                Each group manages their own food contribution and gear list so everyone stays organized without duplicate items.
              </p>
            </div>

            <div className="p-6 border border-black bg-white space-y-2">
              <CloudSun className="w-6 h-6 text-black" />
              <h3 className="font-black uppercase text-sm text-black">Google Weather & Grok AI</h3>
              <p className="text-xs text-black/70 leading-relaxed">
                Live campground weather forecasts and Grok AI suggestions for gear checklists and campfire culinary recipes.
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-black py-6 text-center text-xs font-semibold uppercase tracking-wider text-black/60">
          Private Camping Expedition Planner
        </footer>

        {/* Create Trip Modal */}
        <CreateTripModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTripSubmit}
        />
      </div>
    );
  }

  // Active Camping Workspace View: Monochrome Black/White with #D6B588 Box Accents
  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b-2 border-black sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18">
            {/* Logo & Trip Title */}
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 border border-black bg-white flex items-center justify-center font-bold text-lg">
                🏕️
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-black text-base sm:text-lg tracking-tight uppercase text-black truncate max-w-[200px] sm:max-w-xs">
                    {trip.title}
                  </h1>
                  <span className="bg-[#D6B588] text-white font-bold text-[10px] px-2 py-0.5 border border-black uppercase tracking-wider">
                    Active Trip
                  </span>
                </div>
                <div className="text-xs font-medium text-black/70 truncate mt-0.5">
                  {trip.location}
                </div>
              </div>
            </div>

            {/* Right: Camper Profile (no Firebase button) */}
            <div className="flex items-center gap-3">
              {currentMember && (
                <div className="flex items-center gap-2 px-3.5 py-1.5 border border-black bg-white text-xs">
                  <UserIcon className="w-3.5 h-3.5 text-black" />
                  <span className="text-black font-bold uppercase tracking-wider">{currentMember.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar: White background, black borders, #D6B588 boxes for active tab */}
        <div className="border-t border-black bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-2 sm:space-x-3 overflow-x-auto touch-scroll py-2.5">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer border border-black ${
                  activeTab === 'overview'
                    ? 'bg-[#D6B588] text-white shadow-xs'
                    : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Trip Hub & Sync</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('groups')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer border border-black ${
                  activeTab === 'groups'
                    ? 'bg-[#D6B588] text-white shadow-xs'
                    : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Groups & Campers ({members.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('gear')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer border border-black ${
                  activeTab === 'gear'
                    ? 'bg-[#D6B588] text-white shadow-xs'
                    : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                <Backpack className="w-4 h-4" />
                <span>Gear Checklist ({equipment.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('food')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer border border-black ${
                  activeTab === 'food'
                    ? 'bg-[#D6B588] text-white shadow-xs'
                    : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                <Utensils className="w-4 h-4" />
                <span>Camp Menu ({food.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('weather')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 cursor-pointer border border-black ${
                  activeTab === 'weather'
                    ? 'bg-[#D6B588] text-white shadow-xs'
                    : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                <CloudSun className="w-4 h-4" />
                <span>Google Weather</span>
              </button>
            </nav>
          </div>
        </div>
      </header>


      {/* Main Tab Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 flex-1 w-full bg-white">
        {activeTab === 'overview' && (
          <CampOverviewTab
            trip={trip}
            members={members}
            groups={groups}
            equipment={equipment}
            food={food}
            weather={weatherReport}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onEditTrip={() => setShowEditTripModal(true)}
          />
        )}

        {activeTab === 'groups' && (
          <GroupsMembersTab
            trip={trip}
            groups={groups}
            members={members}
            currentMember={currentMember}
            onSelectCurrentMember={handleSelectCurrentMember}
            onAddMember={handleAddMember}
            onAddGroup={handleAddGroup}
            onRemoveMember={async (mId) => {
              await fetch(`/api/trips/${trip.id}/members/${mId}`, { method: 'DELETE' });
              await loadTripData();
            }}
          />
        )}

        {activeTab === 'gear' && (
          <GearChecklistTab
            trip={trip}
            groups={groups}
            members={members}
            equipment={equipment}
            currentMember={currentMember}
            onTogglePacked={handleTogglePacked}
            onAddItem={handleAddEquipment}
            onDeleteItem={handleDeleteEquipment}
            onBatchAddItems={handleBatchAddEquipment}
          />
        )}

        {activeTab === 'food' && (
          <CampMenuTab
            trip={trip}
            groups={groups}
            members={members}
            food={food}
            currentMember={currentMember}
            onAddMeal={handleAddMeal}
            onUpdateMealStatus={handleUpdateMealStatus}
            onDeleteMeal={handleDeleteMeal}
          />
        )}

        {activeTab === 'weather' && (
          <WeatherTab
            trip={trip}
            weatherReport={weatherReport}
            onRefreshWeather={async () => {
              if (trip) {
                const res = await fetchTripWeather(trip.id);
                if (res?.weather) setWeatherReport(res.weather);
              }
            }}
          />
        )}
      </main>

      {/* Edit Trip Modal */}
      <CreateTripModal
        isOpen={showEditTripModal}
        onClose={() => setShowEditTripModal(false)}
        onSubmit={handleEditTripSubmit}
        initialTrip={trip}
      />
    </div>
  );
}
