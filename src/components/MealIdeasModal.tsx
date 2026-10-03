import React, { useState } from 'react';
import { Trip, MealSuggestionItem, User, MealTime } from '../types';
import { getAiMealSuggestions, addFoodItem } from '../api/client';
import { Sparkles, X, Plus, ChefHat, Clock, Flame, AlertCircle, Check, Coffee, Sandwich, Utensils, Apple } from 'lucide-react';

interface MealIdeasModalProps {
  trip: Trip;
  currentUser: User;
  targetGroupId: string;
  isOpen: boolean;
  onClose: () => void;
  onDishAdded: () => void;
}

export const MealIdeasModal: React.FC<MealIdeasModalProps> = ({
  trip,
  currentUser,
  targetGroupId,
  isOpen,
  onClose,
  onDishAdded
}) => {
  const [activeFilter, setActiveFilter] = useState<MealTime | 'all'>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [ideas, setIdeas] = useState<MealSuggestionItem[] | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [adoptingIndex, setAdoptingIndex] = useState<number | null>(null);
  const [adoptedIndices, setAdoptedIndices] = useState<number[]>([]);

  if (!isOpen) return null;

  const handleFetchIdeas = async () => {
    setIsGenerating(true);
    setErrorMsg('');
    try {
      const res = await getAiMealSuggestions({
        destination: trip.location,
        season: 'Summer',
        groupSize: 8,
        activities: ['Hiking', 'Swimming']
      });
      setIdeas(res.meals);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch meal ideas from Grok');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAdoptMeal = async (item: MealSuggestionItem, idx: number) => {
    setAdoptingIndex(idx);
    setErrorMsg('');
    try {
      await addFoodItem(trip.id, {
        userId: currentUser.id,
        groupId: targetGroupId,
        mealTime: item.mealTime,
        mealType: item.mealTime.charAt(0).toUpperCase() + item.mealTime.slice(1),
        title: item.title,
        description: `${item.description} (Cook Method: ${item.cookMethod}, Prep: ${item.prepTime})`,
        ingredientsOrItems: item.ingredients,
        dayLabel: `${item.mealTime.charAt(0).toUpperCase() + item.mealTime.slice(1)} Dish`,
        suggestedBy: { userId: currentUser.id, name: currentUser.name },
        preparers: [],
        ingredientBringers: []
      });
      setAdoptedIndices([...adoptedIndices, idx]);
      onDishAdded();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to adopt dish into meal plan');
    } finally {
      setAdoptingIndex(null);
    }
  };

  const filteredIdeas = ideas
    ? activeFilter === 'all'
      ? ideas
      : ideas.filter(m => m.mealTime === activeFilter)
    : [];

  const getMealTimeIcon = (time: MealTime) => {
    switch (time) {
      case 'breakfast': return Coffee;
      case 'lunch': return Sandwich;
      case 'dinner': return Utensils;
      case 'snacks': return Apple;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 flex items-start justify-between bg-neutral-50/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-neutral-900 text-white font-mono">
                <Sparkles className="w-3 h-3 text-amber-300" />
                AI Engine: Grok only
              </span>
              <span className="text-xs text-neutral-500 font-medium">
                Camp Menu Brainstorming
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-950">
              Grok Camping Meal Inspiration
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Hearty, cast-iron & portable recipes optimized for campsite cooking, categorized by meal time.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!ideas ? (
            <div className="text-center py-12 px-4 space-y-4 border border-dashed border-neutral-200 rounded-2xl bg-neutral-50/40">
              <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center mx-auto shadow-sm">
                <ChefHat className="w-6 h-6 text-amber-300" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Generate Curated Camp Recipes
                </h3>
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                  Grok will generate campfire breakfasts, midday trail lunches, hearty skillet dinners, and high-energy trail snacks.
                </p>
              </div>

              <button
                onClick={handleFetchIdeas}
                disabled={isGenerating}
                className="px-5 py-2.5 rounded-xl bg-neutral-950 text-white text-xs font-semibold hover:bg-neutral-800 transition inline-flex items-center gap-2 shadow-sm"
              >
                <Sparkles className={`w-4 h-4 text-amber-300 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Grok Designing Menu...' : 'Generate Meal Suggestions'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Category tabs */}
              <div className="flex items-center justify-between gap-2 border-b border-neutral-200 pb-2 flex-wrap">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button
                    onClick={() => setActiveFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      activeFilter === 'all'
                        ? 'bg-neutral-950 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    All Meals ({ideas.length})
                  </button>

                  {(['breakfast', 'lunch', 'dinner', 'snacks'] as const).map((t) => {
                    const count = ideas.filter(m => m.mealTime === t).length;
                    const Icon = getMealTimeIcon(t);
                    return (
                      <button
                        key={t}
                        onClick={() => setActiveFilter(t)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 capitalize ${
                          activeFilter === t
                            ? 'bg-neutral-950 text-white'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{t}</span>
                        <span className="text-[10px] font-mono px-1 rounded bg-black/10">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={handleFetchIdeas}
                  disabled={isGenerating}
                  className="text-xs text-neutral-600 hover:text-neutral-950 font-medium flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Regenerate</span>
                </button>
              </div>

              {/* Suggestions Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredIdeas.map((item, idx) => {
                  const Icon = getMealTimeIcon(item.mealTime);
                  const isAdopted = adoptedIndices.includes(idx);
                  const isCurrentlyAdopting = adoptingIndex === idx;

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 transition flex flex-col justify-between space-y-3 shadow-2xs"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800">
                            <Icon className="w-3 h-3" />
                            {item.mealTime}
                          </span>

                          <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-medium">
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {item.prepTime}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Flame className="w-2.5 h-2.5 text-[#D6B588]" />
                              {item.cookMethod}
                            </span>
                          </div>
                        </div>

                        <h4 className="font-semibold text-sm text-neutral-950">
                          {item.title}
                        </h4>

                        <p className="text-xs text-neutral-600 leading-relaxed">
                          {item.description}
                        </p>

                        <div className="pt-1.5 border-t border-neutral-100">
                          <span className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider block mb-1">
                            Key Ingredients:
                          </span>
                          <p className="text-[11px] text-neutral-700 bg-neutral-50 p-2 rounded-lg leading-relaxed font-mono">
                            {item.ingredients}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2">
                        {isAdopted ? (
                          <div className="w-full py-1.5 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-center gap-1.5">
                            <Check className="w-3.5 h-3.5" />
                            <span>Added to Meal Plan</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAdoptMeal(item, idx)}
                            disabled={isCurrentlyAdopting}
                            className="w-full py-1.5 px-3 rounded-lg bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{isCurrentlyAdopting ? 'Adding Dish...' : 'Add to Collaborative Plan'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            Dishes added here appear on the collaborative meal board where members can volunteer to cook or bring ingredients.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-xl transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
