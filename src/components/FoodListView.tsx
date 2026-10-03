import React, { useState, useMemo } from 'react';
import { Trip, Group, GroupMember, FoodItem, User, MealTime } from '../types';
import { addFoodItem, updateFoodItem, deleteFoodItem, volunteerForMeal } from '../api/client';
import { MealIdeasModal } from './MealIdeasModal';
import {
  Utensils,
  Plus,
  Trash2,
  Lock,
  Check,
  AlertCircle,
  ChefHat,
  ShoppingBag,
  Sparkles,
  Coffee,
  Sandwich,
  Apple,
  Calendar,
  Layers,
  Users,
  Info,
  Edit2
} from 'lucide-react';

interface FoodListViewProps {
  trip: Trip;
  currentUser: User;
  groups: Group[];
  groupMembers: GroupMember[];
  food: FoodItem[];
  isPast: boolean;
  onRefreshTrip: () => void;
}

export const FoodListView: React.FC<FoodListViewProps> = ({
  trip,
  currentUser,
  groups,
  groupMembers,
  food,
  isPast,
  onRefreshTrip
}) => {
  // Determine user's assigned group
  const myAssignment = groupMembers.find(gm => gm.userId === currentUser.id);
  const myGroupId = myAssignment ? myAssignment.groupId : null;

  // Selected group tab ('all' or groupId)
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  
  // Meal time category filter
  const [selectedMealTime, setSelectedMealTime] = useState<MealTime | 'all'>('all');

  // Modal / form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [showIdeasModal, setShowIdeasModal] = useState(false);

  // New Dish Form State
  const [newTitle, setNewTitle] = useState('');
  const [newMealTime, setNewMealTime] = useState<MealTime>('dinner');
  const [newDescription, setNewDescription] = useState('');
  const [newIngredients, setNewIngredients] = useState('');
  const [newDayLabel, setNewDayLabel] = useState('Saturday Dinner');
  const [newTargetGroupId, setNewTargetGroupId] = useState<string>(myGroupId || groups[0]?.id || '');
  const [willPrepare, setWillPrepare] = useState(false);
  const [willBringIngredients, setWillBringIngredients] = useState(false);
  const [ingredientNotes, setIngredientNotes] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Volunteering state
  const [volunteeringItemId, setVolunteeringItemId] = useState<string | null>(null);
  const [ingredientPromptItemId, setIngredientPromptItemId] = useState<string | null>(null);
  const [customIngredientInput, setCustomIngredientInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Helper for meal time icon
  const getMealTimeIcon = (time?: MealTime) => {
    switch (time) {
      case 'breakfast': return Coffee;
      case 'lunch': return Sandwich;
      case 'dinner': return Utensils;
      case 'snacks': return Apple;
      default: return Utensils;
    }
  };

  const getMealTimeBadgeColor = (time?: MealTime) => {
    switch (time) {
      case 'breakfast': return 'bg-amber-100 text-amber-900 border-amber-200';
      case 'lunch': return 'bg-sky-100 text-sky-900 border-sky-200';
      case 'dinner': return 'bg-[#D6B588]/20 text-neutral-900 border-[#D6B588]';
      case 'snacks': return 'bg-emerald-100 text-emerald-900 border-emerald-200';
      default: return 'bg-neutral-100 text-neutral-900 border-neutral-200';
    }
  };

  // Filtered dishes
  const filteredFood = useMemo(() => {
    return food.filter((item) => {
      // Group filter
      if (selectedGroupFilter !== 'all' && item.groupId !== selectedGroupFilter) {
        return false;
      }
      // Meal time filter
      if (selectedMealTime !== 'all') {
        const itemMealTime = item.mealTime || (item.mealType?.toLowerCase().includes('breakfast') ? 'breakfast' : item.mealType?.toLowerCase().includes('lunch') ? 'lunch' : item.mealType?.toLowerCase().includes('snack') ? 'snacks' : 'dinner');
        if (itemMealTime !== selectedMealTime) return false;
      }
      return true;
    });
  }, [food, selectedGroupFilter, selectedMealTime]);

  // Counts by meal time
  const mealTimeCounts = useMemo(() => {
    const counts = { breakfast: 0, lunch: 0, dinner: 0, snacks: 0 };
    food.forEach((item) => {
      const mt = item.mealTime || (item.mealType?.toLowerCase().includes('breakfast') ? 'breakfast' : item.mealType?.toLowerCase().includes('lunch') ? 'lunch' : item.mealType?.toLowerCase().includes('snack') ? 'snacks' : 'dinner');
      if (mt && counts[mt] !== undefined) {
        counts[mt]++;
      }
    });
    return counts;
  }, [food]);

  // Handle submit new meal
  const handleCreateMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsAdding(true);
    setErrorMsg('');
    try {
      const preparersList = willPrepare
        ? [{ userId: currentUser.id, name: currentUser.name }]
        : [];

      const ingredientBringersList = willBringIngredients
        ? [{
            userId: currentUser.id,
            name: currentUser.name,
            items: ingredientNotes.trim() || 'All required ingredients'
          }]
        : [];

      await addFoodItem(trip.id, {
        userId: currentUser.id,
        groupId: newTargetGroupId || myGroupId || groups[0]?.id,
        mealTime: newMealTime,
        mealType: newMealTime.charAt(0).toUpperCase() + newMealTime.slice(1),
        title: newTitle.trim(),
        description: newDescription.trim(),
        ingredientsOrItems: newIngredients.trim(),
        dayLabel: newDayLabel.trim(),
        suggestedBy: { userId: currentUser.id, name: currentUser.name },
        preparers: preparersList,
        ingredientBringers: ingredientBringersList
      });

      // Reset form
      setNewTitle('');
      setNewDescription('');
      setNewIngredients('');
      setWillPrepare(false);
      setWillBringIngredients(false);
      setIngredientNotes('');
      setShowAddForm(false);
      onRefreshTrip();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to suggest meal');
    } finally {
      setIsAdding(false);
    }
  };

  // Volunteer to prepare dish
  const handleTogglePrepare = async (item: FoodItem) => {
    if (isPast) return;
    setVolunteeringItemId(item.id);
    setErrorMsg('');
    try {
      await volunteerForMeal(trip.id, item.id, {
        userId: currentUser.id,
        role: 'prepare',
        action: 'toggle'
      });
      onRefreshTrip();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update preparation volunteer status');
    } finally {
      setVolunteeringItemId(null);
    }
  };

  // Volunteer to bring ingredients
  const handleSaveIngredientsVolunteer = async (item: FoodItem, customItems?: string) => {
    if (isPast) return;
    setVolunteeringItemId(item.id);
    setErrorMsg('');
    try {
      await volunteerForMeal(trip.id, item.id, {
        userId: currentUser.id,
        role: 'ingredient',
        action: 'add',
        items: customItems || customIngredientInput.trim() || 'Ingredients'
      });
      setIngredientPromptItemId(null);
      setCustomIngredientInput('');
      onRefreshTrip();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update ingredient volunteer status');
    } finally {
      setVolunteeringItemId(null);
    }
  };

  // Remove ingredient pledge
  const handleRemoveIngredientVolunteer = async (item: FoodItem) => {
    if (isPast) return;
    setVolunteeringItemId(item.id);
    setErrorMsg('');
    try {
      await volunteerForMeal(trip.id, item.id, {
        userId: currentUser.id,
        role: 'ingredient',
        action: 'remove'
      });
      setIngredientPromptItemId(null);
      onRefreshTrip();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to remove volunteer pledge');
    } finally {
      setVolunteeringItemId(null);
    }
  };

  // Update status (planned -> purchased -> packed)
  const handleStatusChange = async (item: FoodItem, newStatus: FoodItem['status']) => {
    if (isPast) return;
    try {
      await updateFoodItem(trip.id, item.id, {
        userId: currentUser.id,
        status: newStatus
      });
      onRefreshTrip();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update status');
    }
  };

  // Delete dish
  const handleDeleteFood = async (item: FoodItem) => {
    if (isPast) return;
    try {
      await deleteFoodItem(trip.id, item.id, currentUser.id);
      onRefreshTrip();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete food item');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-neutral-200 bg-white shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-neutral-900 text-white font-mono">
              <Sparkles className="w-3 h-3 text-amber-300" />
              Collaborative Meal Planning
            </span>
            <span className="text-xs text-neutral-500 font-medium">
              Multi-Group Camping Coordination
            </span>
          </div>
          <h2 className="text-lg font-bold text-neutral-950">
            Campfire Menus & Shared Food Provisions
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Suggest camp dishes, pledge to prepare them, or sign up to bring specific ingredients.
          </p>
        </div>

        {/* Action Buttons */}
        {!isPast && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={() => setShowIdeasModal(true)}
              id="open-grok-meal-ideas-btn"
              className="px-3.5 py-2 text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 rounded-xl transition flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Grok Menu Ideas</span>
            </button>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              id="open-suggest-dish-form-btn"
              className="px-3.5 py-2 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-xl transition flex items-center gap-1.5 border border-neutral-300"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Suggest a Dish</span>
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Suggest a Meal Form Modal / Accordion */}
      {showAddForm && !isPast && (
        <form onSubmit={handleCreateMeal} className="p-5 rounded-2xl border border-neutral-300 bg-neutral-50/70 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
            <div className="flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-neutral-900" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                Suggest a New Camping Dish
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-neutral-500 hover:text-neutral-900"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-800 mb-1">
                Dish or Meal Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Campfire Shakshuka with Feta & Sourdough"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1">
                Meal Time Category *
              </label>
              <select
                value={newMealTime}
                onChange={(e) => setNewMealTime(e.target.value as MealTime)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950 capitalize font-medium"
              >
                <option value="breakfast">🌅 Breakfast</option>
                <option value="lunch">🥪 Lunch</option>
                <option value="dinner">🍲 Dinner</option>
                <option value="snacks">🍎 Snacks</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1">
                Day / Time Label
              </label>
              <input
                type="text"
                placeholder="e.g. Saturday Morning or Post-Hike Lunch"
                value={newDayLabel}
                onChange={(e) => setNewDayLabel(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1">
                Associated Campsite Group
              </label>
              <select
                value={newTargetGroupId}
                onChange={(e) => setNewTargetGroupId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} {g.id === myGroupId ? '(Your Group)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1">
              Description & Preparation Style
            </label>
            <input
              type="text"
              placeholder="e.g. Cooked over open embers in 12-inch cast iron skillet. Great with hot coffee."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-800 mb-1">
              Ingredients & Supplies Needed
            </label>
            <textarea
              rows={2}
              placeholder="e.g. 12 eggs, canned crushed tomatoes, bell peppers, onion, garlic, cumin, smoked paprika, feta block, crusty bread loaf"
              value={newIngredients}
              onChange={(e) => setNewIngredients(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
            />
          </div>

          {/* Initial Volunteering Checkboxes */}
          <div className="p-3 rounded-xl border border-neutral-200 bg-white space-y-2">
            <div className="text-xs font-semibold text-neutral-800 mb-1">
              Your Contributions for this Dish:
            </div>

            <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={willPrepare}
                onChange={(e) => setWillPrepare(e.target.checked)}
                className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-950"
              />
              <span className="font-medium">I will prepare / cook this dish at camp</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={willBringIngredients}
                onChange={(e) => setWillBringIngredients(e.target.checked)}
                className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-950"
              />
              <span className="font-medium">I will bring ingredients for this dish</span>
            </label>

            {willBringIngredients && (
              <div className="pt-1 pl-6">
                <input
                  type="text"
                  placeholder="Specify which ingredients (or leave blank for 'All ingredients')..."
                  value={ingredientNotes}
                  onChange={(e) => setIngredientNotes(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 focus:outline-none focus:border-neutral-950"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-1.5 text-xs text-neutral-600 hover:text-neutral-950"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAdding}
              className="px-4 py-2 text-xs font-semibold bg-neutral-950 text-white rounded-xl hover:bg-neutral-800 transition shadow-xs"
            >
              {isAdding ? 'Saving Dish...' : 'Publish Dish to Trip Plan'}
            </button>
          </div>
        </form>
      )}

      {/* Navigation Bars: Meal Time Categories + Campsite Group Filter */}
      <div className="space-y-3">
        
        {/* Meal Time Categories (Breakfast, Lunch, Dinner, Snacks) */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none touch-scroll pb-1 border-b border-neutral-200">
          <button
            onClick={() => setSelectedMealTime('all')}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
              selectedMealTime === 'all'
                ? 'bg-neutral-950 text-white shadow-xs'
                : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
            }`}
          >
            <span>All Meal Times</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/10">
              {food.length}
            </span>
          </button>

          {(['breakfast', 'lunch', 'dinner', 'snacks'] as const).map((time) => {
            const count = mealTimeCounts[time] || 0;
            const Icon = getMealTimeIcon(time);
            const isSelected = selectedMealTime === time;

            return (
              <button
                key={time}
                onClick={() => setSelectedMealTime(time)}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 capitalize whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-neutral-950 text-white shadow-xs'
                    : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{time}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Group Sub-Tabs (Cross-group visibility) */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none touch-scroll text-xs font-medium text-neutral-600 pb-1">
          <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold shrink-0">
            Campsite:
          </span>

          <button
            onClick={() => setSelectedGroupFilter('all')}
            className={`min-h-[36px] px-3 py-1.5 rounded-lg transition whitespace-nowrap shrink-0 ${
              selectedGroupFilter === 'all'
                ? 'bg-neutral-200 text-neutral-900 font-semibold'
                : 'hover:bg-neutral-100 text-neutral-600'
            }`}
          >
            All Groups (Trip-Wide Menu)
          </button>

          {groups.map((g) => {
            const isSelected = selectedGroupFilter === g.id;
            const isMyGroup = g.id === myGroupId;
            const count = food.filter(f => f.groupId === g.id).length;

            return (
              <button
                key={g.id}
                onClick={() => setSelectedGroupFilter(g.id)}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-neutral-200 text-neutral-900 font-semibold'
                    : 'hover:bg-neutral-100 text-neutral-600'
                }`}
              >
                <span>{g.name}</span>
                {isMyGroup && <span className="w-1.5 h-1.5 rounded-full bg-neutral-950"></span>}
                <span className="text-[10px] font-mono text-neutral-400">({count})</span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Dishes List */}
      <div className="space-y-4">
        {filteredFood.length > 0 ? (
          filteredFood.map((dish) => {
            const dishMealTime: MealTime = dish.mealTime || (dish.mealType?.toLowerCase().includes('breakfast') ? 'breakfast' : dish.mealType?.toLowerCase().includes('lunch') ? 'lunch' : dish.mealType?.toLowerCase().includes('snack') ? 'snacks' : 'dinner');
            const Icon = getMealTimeIcon(dishMealTime);
            const badgeColor = getMealTimeBadgeColor(dishMealTime);

            // Check if current user is a volunteer
            const isUserPreparing = dish.preparers?.some(p => p.userId === currentUser.id);
            const userIngredientPledge = dish.ingredientBringers?.find(b => b.userId === currentUser.id);
            const hasPreparers = (dish.preparers?.length || 0) > 0;
            const hasBringers = (dish.ingredientBringers?.length || 0) > 0;

            // Readiness assessment
            const isFullyStaffed = hasPreparers && hasBringers;
            const isPartiallyStaffed = hasPreparers || hasBringers;

            const group = groups.find(g => g.id === dish.groupId);
            const canManageDish = !isPast && (dish.suggestedBy?.userId === currentUser.id || trip.hostId === currentUser.id || dish.groupId === myGroupId);

            return (
              <div
                key={dish.id}
                className="p-5 rounded-2xl border border-neutral-200 bg-white hover:border-neutral-300 transition space-y-4 shadow-2xs"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-neutral-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${badgeColor}`}>
                        <Icon className="w-3 h-3" />
                        {dishMealTime}
                      </span>

                      {dish.dayLabel && (
                        <span className="text-[11px] font-medium text-neutral-600 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-neutral-400" />
                          {dish.dayLabel}
                        </span>
                      )}

                      {group && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                          {group.name}
                        </span>
                      )}

                      {/* Readiness status indicator */}
                      {isFullyStaffed ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          Ready to Feast
                        </span>
                      ) : !hasPreparers && hasBringers ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Needs Chef / Preparer
                        </span>
                      ) : hasPreparers && !hasBringers ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#D6B588]/20 text-neutral-800">
                          Needs Ingredients
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                          Open Proposal
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-neutral-950 pt-0.5">
                      {dish.title}
                    </h3>

                    {dish.suggestedBy && (
                      <p className="text-[11px] text-neutral-400">
                        Suggested by <strong className="text-neutral-700 font-medium">{dish.suggestedBy.name}</strong>
                      </p>
                    )}
                  </div>

                  {/* Actions (Status dropdown & delete) */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    {canManageDish ? (
                      <select
                        value={dish.status}
                        onChange={(e) => handleStatusChange(dish, e.target.value as any)}
                        className="text-xs font-mono px-2.5 py-1 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-800 focus:outline-none cursor-pointer"
                      >
                        <option value="planned">Planned</option>
                        <option value="purchased">Purchased</option>
                        <option value="packed">Packed in Cooler</option>
                      </select>
                    ) : (
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-600 capitalize">
                        {dish.status}
                      </span>
                    )}

                    {canManageDish && (
                      <button
                        onClick={() => handleDeleteFood(dish)}
                        className="text-neutral-300 hover:text-red-600 transition p-1"
                        title="Remove dish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Description & Ingredients Box */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {dish.description && (
                    <div className="p-3 rounded-xl bg-neutral-50/70 border border-neutral-200/60">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block mb-1">
                        Preparation Notes:
                      </span>
                      <p className="text-neutral-700 leading-relaxed">
                        {dish.description}
                      </p>
                    </div>
                  )}

                  {dish.ingredientsOrItems && (
                    <div className="p-3 rounded-xl bg-neutral-50/70 border border-neutral-200/60">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block mb-1">
                        Required Ingredients & Pantry Items:
                      </span>
                      <p className="text-neutral-700 leading-relaxed font-mono text-[11px]">
                        {dish.ingredientsOrItems}
                      </p>
                    </div>
                  )}
                </div>

                {/* Collaborative Volunteer Station */}
                <div className="p-4 rounded-xl border border-neutral-200/80 bg-neutral-50/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-neutral-500" />
                      Camper Collaboration & Roles
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Any trip camper can volunteer
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* Role 1: Preparers / Cooks */}
                    <div className="p-3 rounded-xl border border-neutral-200 bg-white flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
                            <ChefHat className="w-3.5 h-3.5 text-amber-600" />
                            Dish Preparer(s)
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400">
                            {dish.preparers?.length || 0} pledged
                          </span>
                        </div>

                        {dish.preparers && dish.preparers.length > 0 ? (
                          <div className="space-y-1">
                            {dish.preparers.map((p, idx) => (
                              <div
                                key={idx}
                                className="text-xs font-medium text-neutral-800 bg-amber-50/70 border border-amber-200/60 px-2 py-1 rounded-md flex items-center justify-between"
                              >
                                <span>{p.name} {p.userId === currentUser.id ? '(You)' : ''}</span>
                                <span className="text-[10px] text-amber-800 font-semibold">Chef</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-neutral-400 italic">
                            No chef assigned yet. Who wants to cook this?
                          </p>
                        )}
                      </div>

                      {!isPast && (
                        <button
                          onClick={() => handleTogglePrepare(dish)}
                          disabled={volunteeringItemId === dish.id}
                          className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                            isUserPreparing
                              ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                              : 'bg-neutral-950 hover:bg-neutral-800 text-white'
                          }`}
                        >
                          <ChefHat className="w-3.5 h-3.5" />
                          <span>
                            {isUserPreparing
                              ? '✓ You’re Cooking (Leave Duty)'
                              : '🙋 I’ll Prepare / Cook This'}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Role 2: Ingredient Bringers */}
                    <div className="p-3 rounded-xl border border-neutral-200 bg-white flex flex-col justify-between space-y-2">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5">
                            <ShoppingBag className="w-3.5 h-3.5 text-sky-600" />
                            Ingredient Bringer(s)
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400">
                            {dish.ingredientBringers?.length || 0} pledged
                          </span>
                        </div>

                        {dish.ingredientBringers && dish.ingredientBringers.length > 0 ? (
                          <div className="space-y-1">
                            {dish.ingredientBringers.map((b, idx) => (
                              <div
                                key={idx}
                                className="text-xs text-neutral-800 bg-sky-50/70 border border-sky-200/60 p-1.5 rounded-md space-y-0.5"
                              >
                                <div className="flex items-center justify-between font-medium">
                                  <span>{b.name} {b.userId === currentUser.id ? '(You)' : ''}</span>
                                  <span className="text-[10px] text-sky-800 font-semibold">Groceries</span>
                                </div>
                                {b.items && (
                                  <div className="text-[11px] text-neutral-600 font-mono">
                                    Pledged: {b.items}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-neutral-400 italic">
                            No camper has claimed ingredients yet.
                          </p>
                        )}
                      </div>

                      {!isPast && (
                        <div>
                          {ingredientPromptItemId === dish.id ? (
                            <div className="p-2 bg-neutral-50 rounded-lg border border-neutral-200 space-y-1.5">
                              <label className="block text-[10px] font-semibold text-neutral-700">
                                What will you bring?
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Eggs & bacon or All ingredients"
                                value={customIngredientInput}
                                onChange={(e) => setCustomIngredientInput(e.target.value)}
                                className="w-full text-xs px-2.5 py-1 rounded border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
                              />
                              <div className="flex items-center justify-end gap-1 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setIngredientPromptItemId(null)}
                                  className="text-[10px] text-neutral-500 hover:text-neutral-900 px-2 py-0.5"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveIngredientsVolunteer(dish)}
                                  className="text-[10px] font-semibold bg-neutral-950 text-white px-2.5 py-1 rounded hover:bg-neutral-800"
                                >
                                  Save Pledge
                                </button>
                              </div>
                            </div>
                          ) : userIngredientPledge ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setIngredientPromptItemId(dish.id);
                                  setCustomIngredientInput(userIngredientPledge.items || '');
                                }}
                                className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300 transition flex items-center justify-center gap-1"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Edit Pledge</span>
                              </button>
                              <button
                                onClick={() => handleRemoveIngredientVolunteer(dish)}
                                className="py-1.5 px-2 rounded-lg text-xs font-semibold bg-neutral-100 hover:bg-red-50 hover:text-red-700 text-neutral-600 border border-neutral-200 transition"
                                title="Remove your ingredient pledge"
                              >
                                Withdraw
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setIngredientPromptItemId(dish.id);
                                setCustomIngredientInput(dish.ingredientsOrItems || 'All ingredients');
                              }}
                              disabled={volunteeringItemId === dish.id}
                              className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-neutral-950 hover:bg-neutral-800 text-white transition flex items-center justify-center gap-1.5"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>🛒 I’ll Bring Ingredients</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                </div>

              </div>
            );
          })
        ) : (
          <div className="p-10 rounded-2xl border border-dashed border-neutral-200 text-center bg-white space-y-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-600 flex items-center justify-center mx-auto">
              <Utensils className="w-5 h-5 text-neutral-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-neutral-800">
                No dishes scheduled for this view yet.
              </div>
              <div className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
                {selectedMealTime !== 'all'
                  ? `There are no ${selectedMealTime} dishes planned yet. Click "Suggest a Dish" or use "Grok Menu Ideas" to start.`
                  : 'Start planning camp meals together so everyone knows what to pack and cook.'}
              </div>
            </div>

            {!isPast && (
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={() => setShowIdeasModal(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>Grok Menu Ideas</span>
                </button>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition border border-neutral-300"
                >
                  Suggest a Dish
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grok Meal Ideas Modal */}
      <MealIdeasModal
        trip={trip}
        currentUser={currentUser}
        targetGroupId={myGroupId || groups[0]?.id || ''}
        isOpen={showIdeasModal}
        onClose={() => setShowIdeasModal(false)}
        onDishAdded={() => {
          onRefreshTrip();
        }}
      />

    </div>
  );
};
