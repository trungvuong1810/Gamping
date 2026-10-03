import React, { useState } from 'react';
import { Trip, TripMember, Group, FoodItem, MealTime } from '../types';
import {
  Utensils,
  Plus,
  Sparkles,
  Trash2,
  User,
  Coffee,
  Sun,
  Flame,
  Cookie
} from 'lucide-react';
import { GrokMealModal } from './GrokMealModal';

interface CampMenuTabProps {
  trip: Trip;
  groups: Group[];
  members: TripMember[];
  food: FoodItem[];
  currentMember?: TripMember | null;
  onAddMeal: (data: {
    title: string;
    mealTime: MealTime;
    groupId: string;
    ingredientsOrItems: string;
    description: string;
    cookOrBringer: string;
    dayLabel: string;
  }) => Promise<void>;
  onUpdateMealStatus: (foodId: string, status: 'planned' | 'purchased' | 'packed') => Promise<void>;
  onDeleteMeal: (foodId: string) => Promise<void>;
}

export const CampMenuTab: React.FC<CampMenuTabProps> = ({
  trip,
  groups,
  members,
  food,
  currentMember,
  onAddMeal,
  onUpdateMealStatus,
  onDeleteMeal
}) => {
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [isGrokModalOpen, setIsGrokModalOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New meal form state
  const [newTitle, setNewTitle] = useState('');
  const [newMealTime, setNewMealTime] = useState<MealTime>('dinner');
  const [newGroupId, setNewGroupId] = useState<string>(groups[0]?.id || '');
  const [newDayLabel, setNewDayLabel] = useState<string>('Day 1');
  const [newCook, setNewCook] = useState<string>(currentMember?.name || '');
  const [newIngredients, setNewIngredients] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Days list (e.g. Day 1, Day 2, Day 3...)
  const startD = new Date(trip.startDate);
  const endD = new Date(trip.endDate);
  const diffDays = Math.max(Math.ceil(Math.abs(endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1, 3);
  const daysList = Array.from({ length: diffDays }).map((_, i) => `Day ${i + 1}`);

  const mealIcons: Record<MealTime, React.ReactNode> = {
    breakfast: <Coffee className="w-4 h-4 text-black" />,
    lunch: <Sun className="w-4 h-4 text-black" />,
    dinner: <Flame className="w-4 h-4 text-black" />,
    snacks: <Cookie className="w-4 h-4 text-black" />
  };

  const filteredFood = food.filter(item => {
    if (selectedGroupFilter !== 'all' && item.groupId !== selectedGroupFilter) return false;
    return true;
  });

  const handleCreateMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newGroupId) return;

    setIsSubmitting(true);
    try {
      await onAddMeal({
        title: newTitle.trim(),
        mealTime: newMealTime,
        groupId: newGroupId,
        ingredientsOrItems: newIngredients.trim(),
        description: newDescription.trim() || 'Camp cooking',
        cookOrBringer: newCook.trim() || groups.find(g => g.id === newGroupId)?.name || 'Camp Chef',
        dayLabel: newDayLabel
      });
      setNewTitle('');
      setNewIngredients('');
      setNewDescription('');
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to add meal:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 bg-white text-black">
      {/* Header Banner */}
      <div className="p-6 border-2 border-black bg-white space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Utensils className="w-5 h-5 text-black" />
              <h2 className="text-lg font-black uppercase tracking-tight text-black">Camp Menu & Food Contributions</h2>
            </div>
            <p className="text-xs text-black/70 mt-1">
              Coordinated group meals so each team knows who is cooking and what ingredients are needed.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Sand box with inner white text */}
            <button
              type="button"
              onClick={() => setIsGrokModalOpen(true)}
              className="bg-[#D6B588] hover:bg-[#c9a676] text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 border border-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-4 h-4" />
              <span>Grok Campfire Meal Ideas</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 border border-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Meal Contribution</span>
            </button>
          </div>
        </div>

        {/* Group Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 touch-scroll border-t border-black">
          <button
            type="button"
            onClick={() => setSelectedGroupFilter('all')}
            className={`text-xs px-3.5 py-1.5 font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer border border-black ${
              selectedGroupFilter === 'all'
                ? 'bg-[#D6B588] text-white'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            All Groups' Meals ({food.length})
          </button>
          {groups.map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelectedGroupFilter(g.id)}
              className={`text-xs px-3.5 py-1.5 font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer border border-black ${
                selectedGroupFilter === g.id
                  ? 'bg-[#D6B588] text-white'
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              {g.name} ({food.filter(f => f.groupId === g.id).length})
            </button>
          ))}
        </div>
      </div>

      {/* Days Schedule */}
      <div className="space-y-6">
        {daysList.map((day) => {
          const dayMeals = filteredFood.filter(f => (f.dayLabel || 'Day 1') === day);

          return (
            <div key={day} className="border-2 border-black bg-white">
              {/* Day Header */}
              <div className="px-6 py-4 bg-white border-b border-black flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm uppercase tracking-tight text-black">{day}</span>
                  <span className="text-xs text-black/60 font-medium">
                    • {dayMeals.length} {dayMeals.length === 1 ? 'meal planned' : 'meals planned'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setNewDayLabel(day);
                    setShowAddModal(true);
                  }}
                  className="text-xs font-bold text-black hover:underline uppercase flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add to {day}
                </button>
              </div>

              {/* Day Meals Body */}
              <div className="p-6">
                {dayMeals.length === 0 ? (
                  <div className="text-center py-6 text-xs text-black/50 border border-black/20 bg-neutral-50">
                    No meals scheduled yet for {day}. Use "Add to {day}" or ask Grok for campfire recipes.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dayMeals.map((meal) => {
                      const group = groups.find(g => g.id === meal.groupId);

                      return (
                        <div
                          key={meal.id}
                          className="p-4 border border-black bg-white flex flex-col justify-between space-y-3"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="p-1 border border-black bg-white">
                                  {mealIcons[meal.mealTime] || <Utensils className="w-4 h-4 text-black" />}
                                </span>
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-black/60 block">
                                    {meal.mealTime}
                                  </span>
                                  <h4 className="font-black text-xs uppercase tracking-tight text-black">
                                    {meal.title}
                                  </h4>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => onDeleteMeal(meal.id)}
                                className="p-1 text-black/40 hover:text-black transition-colors cursor-pointer"
                                title="Remove meal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {meal.description && (
                              <p className="text-xs text-black/80 mt-2 leading-relaxed">
                                {meal.description}
                              </p>
                            )}

                            {/* Ingredients section */}
                            {meal.ingredientsOrItems && (
                              <div className="mt-3 p-3 border border-black bg-neutral-50 text-xs text-black">
                                <span className="font-bold uppercase tracking-wider block mb-1">
                                  Needed Ingredients:
                                </span>
                                <div className="text-[11px] text-black/80 leading-relaxed">
                                  {meal.ingredientsOrItems}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Footer with Group, Cook, and Status */}
                          <div className="pt-3 border-t border-black flex items-center justify-between gap-2 text-xs flex-wrap">
                            <div className="flex items-center gap-2">
                              {/* Sand box with inner white text */}
                              {group && (
                                <span className="bg-[#D6B588] text-white font-bold text-[10px] px-2 py-0.5 border border-black uppercase">
                                  {group.name}
                                </span>
                              )}
                              {meal.cookOrBringer && (
                                <span className="flex items-center gap-1 text-[11px] font-bold uppercase text-black">
                                  <User className="w-3 h-3 text-black" />
                                  {meal.cookOrBringer}
                                </span>
                              )}
                            </div>

                            {/* Status Picker */}
                            <select
                              value={meal.status || 'planned'}
                              onChange={(e) => onUpdateMealStatus(meal.id, e.target.value as any)}
                              className="text-[10px] font-bold uppercase px-2 py-1 bg-white text-black border border-black cursor-pointer"
                            >
                              <option value="planned">Planned</option>
                              <option value="purchased">Purchased</option>
                              <option value="packed">Packed</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Meal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
          <div className="bg-white border-2 border-black max-w-md w-full p-6 text-black space-y-4 animate-slide-up">
            <h3 className="font-black text-black text-base uppercase tracking-tight">Add Meal Contribution</h3>

            <form onSubmit={handleCreateMeal} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                  Meal Title / Recipe *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Campfire Pancakes & Bacon, Cast Iron Chili"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-black focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                    Trip Day *
                  </label>
                  <select
                    value={newDayLabel}
                    onChange={(e) => setNewDayLabel(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-black focus:outline-hidden font-medium"
                  >
                    {daysList.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                    Meal Time *
                  </label>
                  <select
                    value={newMealTime}
                    onChange={(e) => setNewMealTime(e.target.value as MealTime)}
                    className="w-full text-xs px-3 py-2 bg-white border border-black focus:outline-hidden font-medium"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snacks">Snacks & S'mores</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                    Group Cooking *
                  </label>
                  <select
                    value={newGroupId}
                    onChange={(e) => setNewGroupId(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-black focus:outline-hidden font-medium"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                    Lead Cook / Bringer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sarah & Alex"
                    value={newCook}
                    onChange={(e) => setNewCook(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-black focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                  Ingredients Needed (Items to buy/pack)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Pancake mix, eggs, bacon, maple syrup, butter"
                  value={newIngredients}
                  onChange={(e) => setNewIngredients(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-black focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                  Prep & Cooking Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pre-mix batter at home, needs ice cooler for bacon"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-black focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-black bg-white border border-black hover:bg-neutral-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim() || isSubmitting}
                  className="bg-[#D6B588] hover:bg-[#c9a676] text-white font-semibold text-xs px-5 py-2 border border-black transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Add Meal Contribution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grok Culinary Modal */}
      <GrokMealModal
        isOpen={isGrokModalOpen}
        onClose={() => setIsGrokModalOpen(false)}
        destination={trip.location || 'Campground'}
        groups={groups}
        daysCount={diffDays}
        onAddMeal={onAddMeal}
      />
    </div>
  );
};
