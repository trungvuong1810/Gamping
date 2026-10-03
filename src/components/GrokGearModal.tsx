import React, { useState } from 'react';
import { Group, PackingCategory } from '../types';
import { Sparkles, Check, Plus, Loader2, X, AlertCircle } from 'lucide-react';

interface GrokGearModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination: string;
  startDate?: string;
  endDate?: string;
  groups: Group[];
  activeGroupId?: string;
  groupSize?: number;
  existingItems?: string[];
  onAddItems: (items: Array<{ name: string; category: PackingCategory; groupId: string; notes: string; aiSuggested: boolean }>) => void;
}

interface GearSuggestion {
  name: string;
  category: PackingCategory;
  reason: string;
  essential?: boolean;
  selected?: boolean;
}

export const GrokGearModal: React.FC<GrokGearModalProps> = ({
  isOpen,
  onClose,
  destination,
  startDate,
  endDate,
  groups,
  activeGroupId,
  groupSize,
  existingItems = [],
  onAddItems,
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string>(activeGroupId || groups[0]?.id || '');
  const [activities, setActivities] = useState<string[]>(['Campfire Cooking', 'Day Hiking']);
  const [season, setSeason] = useState<string>('Summer');
  const [customNote, setCustomNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<GearSuggestion[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const activityOptions = [
    'Day Hiking',
    'Campfire Cooking',
    'Lake / River Swimming',
    'Kayaking / Paddling',
    'Stargazing',
    'Fishing',
    'Cold Weather / High Altitude',
    'Rain / Wet Weather'
  ];

  const toggleActivity = (act: string) => {
    setActivities(prev =>
      prev.includes(act) ? prev.filter(a => a !== act) : [...prev, act]
    );
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/ai/equipment-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: destination || 'Wilderness Campground',
          startDate: startDate || '2026-07-01',
          endDate: endDate || '2026-07-04',
          activities,
          groupName: groups.find(g => g.id === selectedGroup)?.name || 'Camp Group',
          season,
          groupSize,
          existingItems,
          notes: customNote
        })
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve Grok suggestions');
      }

      const data = await res.json();
      const rawList = data.equipment || [];

      const formatted: GearSuggestion[] = rawList.map((item: any) => ({
        name: typeof item === 'string' ? item : item.name || 'Camping Gear',
        category: (item.category as PackingCategory) || 'Tools & First Aid',
        reason: item.reason || item.notes || `Recommended for ${destination}.`,
        essential: item.essential !== false,
        selected: true
      }));

      setSuggestions(formatted);
      setHasGenerated(true);
    } catch (err: any) {
      console.error('Grok gear suggestion error:', err);
      setErrorMsg('Could not fetch suggestions right now. Using offline camp recommendations.');
      setSuggestions([
        { name: '4-Person Weatherproof Tent with Rainfly', category: 'Shelter & Sleep', reason: 'High protection against wind and unexpected showers.', essential: true, selected: true },
        { name: 'Insulated Sleeping Pad (R-Value 3.5+)', category: 'Shelter & Sleep', reason: 'Critical ground thermal barrier.', essential: true, selected: true },
        { name: '2-Burner Propane Camp Stove & Fuel', category: 'Cooking & Water', reason: 'Fast and reliable hot meals for the entire group.', essential: true, selected: true },
        { name: 'Gravity Water Filter System (4L)', category: 'Cooking & Water', reason: 'High volume hydration without tedious pump effort.', essential: true, selected: true },
        { name: 'Bear-Proof Food Canister / Hanging Bag', category: 'Tools & First Aid', reason: 'Essential wildlife safety at wilderness campsites.', essential: true, selected: true },
        { name: '500 Lumen LED Camp Lantern', category: 'Lighting & Power', reason: 'Illuminates kitchen prep and game tables after dark.', essential: false, selected: true },
        { name: 'Compact First Aid & Blister Kit', category: 'Tools & First Aid', reason: 'Trail and campsite injury readiness.', essential: true, selected: true }
      ]);
      setHasGenerated(true);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelect = (index: number) => {
    setSuggestions(prev =>
      prev.map((s, idx) => (idx === index ? { ...s, selected: !s.selected } : s))
    );
  };

  const handleApply = () => {
    const chosen = suggestions.filter(s => s.selected);
    if (chosen.length === 0) return;

    onAddItems(
      chosen.map(item => ({
        name: item.name,
        category: item.category,
        groupId: selectedGroup || groups[0]?.id || '',
        notes: `Grok AI: ${item.reason}`,
        aiSuggested: true
      }))
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
      <div className="bg-white border-2 border-black max-w-xl w-full p-6 text-black max-h-[90dvh] flex flex-col animate-slide-up space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black">
          <div>
            <h3 className="font-black text-black text-base uppercase tracking-tight">Grok Gear Intelligence</h3>
            <p className="text-xs text-black/70">Destination & weather tailored packing recommendations</p>
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
          {/* Destination & Group assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                Assign Gear To:
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
                Camp Season / Climate:
              </label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-black focus:outline-hidden font-medium"
              >
                <option value="Summer">Summer (Warm days, mild nights)</option>
                <option value="Fall">Fall / Autumn (Crisp, cold nights)</option>
                <option value="Spring">Spring (Showers, damp, variable)</option>
                <option value="Winter">Winter (Snow, sub-zero protection)</option>
              </select>
            </div>
          </div>

          {/* Activities Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
              Planned Activities:
            </label>
            <div className="flex flex-wrap gap-2">
              {activityOptions.map(act => {
                const isSelected = activities.includes(act);
                return (
                  <button
                    key={act}
                    type="button"
                    onClick={() => toggleActivity(act)}
                    className={`text-xs px-3 py-1 font-semibold uppercase tracking-wider border border-black transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#D6B588] text-white'
                        : 'bg-white text-black hover:bg-neutral-100'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                    {act}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Special requests */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
              Anything specific? (optional)
            </label>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. bringing a dog, canoe day trip, kids under 5, cold nights"
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
                    Consulting Grok Engine for {destination}...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Tailored Gear Checklist
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
                  {suggestions.filter(s => s.selected).length} Items Selected
                </span>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="text-xs text-black font-bold uppercase hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  Regenerate
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {suggestions.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleSelect(idx)}
                    className={`p-3 border border-black transition-all cursor-pointer flex items-start gap-3 ${
                      item.selected ? 'bg-neutral-50' : 'opacity-50 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => {}}
                      className="mt-0.5 w-4 h-4 accent-[#D6B588]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs uppercase text-black">{item.name}</span>
                        <span className="border border-black bg-white text-[10px] px-1.5 py-0.2 uppercase font-semibold text-black">
                          {item.category}
                        </span>
                        {item.essential && (
                          <span className="bg-[#D6B588] text-white font-bold text-[10px] px-1.5 py-0.2 border border-black uppercase">
                            Essential
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-black/70 mt-0.5 leading-relaxed">{item.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="pt-3 border-t border-black flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-black bg-white border border-black hover:bg-neutral-100 cursor-pointer uppercase"
          >
            Cancel
          </button>

          {hasGenerated && (
            <button
              type="button"
              onClick={handleApply}
              disabled={suggestions.filter(s => s.selected).length === 0}
              className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-[#D6B588] hover:bg-[#c9a676] border border-black transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add {suggestions.filter(s => s.selected).length} Items to {groups.find(g => g.id === selectedGroup)?.name || 'Group'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
