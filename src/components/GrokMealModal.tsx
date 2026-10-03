import React, { useState } from 'react';
import { Group, MealTime } from '../types';
import { Utensils, Sparkles, Plus, Loader2, Clock, Flame, AlertCircle } from 'lucide-react';

interface GrokMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination: string;
  season?: string;
  groups: Group[];
  daysCount?: number;
  defaultGroupSize?: number;
  existingMeals?: string[];
  onAddMeal: (meal: {
    title: string;
    mealTime: MealTime;
    groupId: string;
    ingredientsOrItems: string;
    description: string;
    cookOrBringer: string;
    dayLabel: string;
  }) => void;
}

interface MealIdea {
  title: string;
  mealTime: MealTime;
  description: string;
  ingredients: string;
  prepTime: string;
  cookMethod: string;
}

export const GrokMealModal: React.FC<GrokMealModalProps> = ({
  isOpen,
  onClose,
  destination,
  season = 'Summer',
  groups,
  daysCount = 3,
  defaultGroupSize,
  existingMeals = [],
  onAddMeal,
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string>(groups[0]?.id || '');
  const [selectedDay, setSelectedDay] = useState<string>('Day 1');
  const [groupSize, setGroupSize] = useState<number>(defaultGroupSize && defaultGroupSize > 1 ? defaultGroupSize : 6);
  const [preferences, setPreferences] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mealIdeas, setMealIdeas] = useState<MealIdea[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/ai/meal-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: destination || 'Campsite',
          season,
          groupSize,
          activities: ['Campfire Cooking', 'Hiking'],
          preferences,
          existingMeals,
          daysCount
        })
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve Grok culinary suggestions');
      }

      const data = await res.json();
      const meals: MealIdea[] = (data.meals || []).map((m: any) => ({
        title: m.title || 'Campfire Meal',
        mealTime: (m.mealTime as MealTime) || 'dinner',
        description: m.description || 'Delicious camp recipe.',
        ingredients: m.ingredients || 'Fresh ingredients',
        prepTime: m.prepTime || '20 min',
        cookMethod: m.cookMethod || 'Cast Iron Skillet / Open Fire'
      }));

      setMealIdeas(meals);
      setHasGenerated(true);
    } catch (err: any) {
      console.error('Grok meal suggestion error:', err);
      setErrorMsg('Could not fetch AI recipes right now. Using campfire classics.');
      setMealIdeas([
        {
          title: 'Campfire Breakfast Burritos with Chorizo & Scrambled Eggs',
          mealTime: 'breakfast',
          description: 'Hearty scrambled eggs, spicy chorizo, cheddar, and roasted peppers wrapped in warm flour tortillas.',
          ingredients: 'Eggs (12), chorizo or bacon (1 lb), tortillas, shredded sharp cheddar, salsa, sour cream',
          prepTime: '15 min prep',
          cookMethod: 'Camp Stove Cast Iron Skillet'
        },
        {
          title: 'Cast Iron Garlic Butter Ribeyes & Smashed Potatoes',
          mealTime: 'dinner',
          description: 'Seared tender ribeye steaks with rosemary-infused butter and campfire-charred baby yellow potatoes.',
          ingredients: 'Ribeye steaks (3-4 large), baby potatoes, Kerrygold butter, fresh rosemary, whole garlic heads',
          prepTime: '20 min prep',
          cookMethod: 'Campfire Grate / Heavy Skillet'
        },
        {
          title: 'Dutch Oven Campfire Chili with Cornbread Topping',
          mealTime: 'dinner',
          description: 'Smoky beef and kidney bean chili baked beneath a golden, bubbling honey cornbread crust.',
          ingredients: 'Ground beef (2 lbs), canned black & kidney beans, diced tomatoes, chili powder, cornbread mix',
          prepTime: '25 min prep',
          cookMethod: 'Cast Iron Dutch Oven on Coals'
        },
        {
          title: 'Gourmet S\'mores with Dark Chocolate & Salted Caramel',
          mealTime: 'snacks',
          description: 'Toasted golden marshmallows paired with sea-salt dark chocolate squares between crisp graham crackers.',
          ingredients: 'Marshmallows, artisanal dark chocolate, graham crackers, caramel sauce drizzle',
          prepTime: '5 min prep',
          cookMethod: 'Campfire Roasting Sticks'
        }
      ]);
      setHasGenerated(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMealToPlan = (idea: MealIdea) => {
    onAddMeal({
      title: idea.title,
      mealTime: idea.mealTime,
      groupId: selectedGroup || groups[0]?.id || '',
      ingredientsOrItems: idea.ingredients,
      description: `${idea.description} (${idea.cookMethod})`,
      cookOrBringer: groups.find(g => g.id === selectedGroup)?.name || 'Camp Chef',
      dayLabel: selectedDay
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
      <div className="bg-white border-2 border-black max-w-xl w-full p-6 text-black max-h-[90dvh] flex flex-col animate-slide-up space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black">
          <div>
            <h3 className="font-black text-black text-base uppercase tracking-tight">Grok Campfire Culinary Assistant</h3>
            <p className="text-xs text-black/70">Group-sized campfire menus and ingredient checklists</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-black hover:opacity-60 text-xl font-bold p-1 cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Content body */}
        <div className="py-2 overflow-y-auto space-y-4 touch-scroll flex-1">
          {/* Target Group & Day Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                Assign Cooking To:
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-black focus:outline-hidden font-medium"
              >
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                Trip Day:
              </label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-black focus:outline-hidden font-medium"
              >
                {Array.from({ length: Math.max(daysCount, 3) }).map((_, idx) => (
                  <option key={idx} value={`Day ${idx + 1}`}>{`Day ${idx + 1}`}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                Portion Size (Eaters):
              </label>
              <input
                type="number"
                min={2}
                max={20}
                value={groupSize}
                onChange={(e) => setGroupSize(parseInt(e.target.value, 10) || 6)}
                className="w-full text-xs px-3 py-2 bg-white border border-black focus:outline-hidden font-medium"
              />
            </div>
          </div>

          {/* Food preferences */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
              Cuisine / dietary preferences (optional)
            </label>
            <input
              type="text"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              placeholder="e.g. Vietnamese & Korean BBQ, one vegetarian, kid-friendly, no pork"
              className="w-full text-xs px-3 py-2 bg-white border border-black focus:outline-hidden font-medium"
            />
          </div>

          {/* Generate Button */}
          {!hasGenerated && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full py-3 px-4 text-xs font-bold uppercase tracking-wider text-white bg-[#D6B588] hover:bg-[#c9a676] border border-black transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Campfire Menus with Grok...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Suggest Campfire Meals
                  </>
                )}
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 border border-black bg-neutral-50 text-black text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Results list */}
          {hasGenerated && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-black">
                  {mealIdeas.length} Suggested Campfire Recipes
                </span>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="text-xs text-black font-bold uppercase hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  Get More Ideas
                </button>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {mealIdeas.map((idea, idx) => (
                  <div
                    key={idx}
                    className="p-4 border border-black bg-white flex flex-col gap-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs uppercase text-black">{idea.title}</span>
                          <span className="bg-[#D6B588] text-white font-bold text-[10px] px-2 py-0.5 border border-black uppercase">
                            {idea.mealTime}
                          </span>
                        </div>
                        <p className="text-xs text-black/70 mt-1 leading-relaxed">{idea.description}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddMealToPlan(idea)}
                        className="shrink-0 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white bg-[#D6B588] hover:bg-[#c9a676] border border-black flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add to {selectedDay}
                      </button>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-black/70 pt-1 border-t border-black/10 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-black" />
                        {idea.prepTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-black" />
                        {idea.cookMethod}
                      </span>
                    </div>

                    <div className="text-xs text-black bg-neutral-50 p-2.5 border border-black">
                      <strong className="uppercase">Ingredients needed:</strong> {idea.ingredients}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-black flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-black bg-white border border-black hover:bg-neutral-100 cursor-pointer uppercase"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
