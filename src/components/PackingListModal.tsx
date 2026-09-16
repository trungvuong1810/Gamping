import React, { useState, useMemo, useEffect } from 'react';
import { Trip, Group, PackingSuggestionItem, User, WeatherReport } from '../types';
import { getAiPackingList, batchAddEquipment, fetchTripWeather } from '../api/client';
import {
  Sparkles,
  X,
  Check,
  Compass,
  Calendar,
  Layers,
  ShoppingBag,
  CheckSquare,
  Square,
  Copy,
  AlertCircle,
  Tent,
  UtensilsCrossed,
  Shirt,
  Package,
  Footprints,
  Waves,
  CloudSun,
  Thermometer,
  Droplets,
  Wind,
  Sun,
  CloudRain
} from 'lucide-react';

interface PackingListModalProps {
  trip: Trip;
  currentUser: User;
  selectedGroup?: Group;
  isOpen: boolean;
  onClose: () => void;
  onItemsAdded: () => void;
}

export const PackingListModal: React.FC<PackingListModalProps> = ({
  trip,
  currentUser,
  selectedGroup,
  isOpen,
  onClose,
  onItemsAdded
}) => {
  // Infer season from start date
  const inferredSeason = useMemo<'Spring' | 'Summer' | 'Fall' | 'Winter'>(() => {
    if (!trip?.startDate) return 'Summer';
    const month = new Date(trip.startDate).getMonth(); // 0-11
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    if (month >= 8 && month <= 10) return 'Fall';
    return 'Winter';
  }, [trip?.startDate]);

  const [destination, setDestination] = useState(trip?.location || 'Wilderness Park');
  const [season, setSeason] = useState<'Spring' | 'Summer' | 'Fall' | 'Winter'>(inferredSeason);
  const [activities, setActivities] = useState<string[]>(['Hiking', 'Swimming']);
  const [customActivityInput, setCustomActivityInput] = useState('');
  const [notes, setNotes] = useState('');

  // Live weather report state
  const [weatherReport, setWeatherReport] = useState<WeatherReport | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestedItems, setSuggestedItems] = useState<PackingSuggestionItem[] | null>(null);
  const [selectedItemIndices, setSelectedItemIndices] = useState<number[]>([]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All');
  const [errorMsg, setErrorMsg] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Single-item adopt tracking (matching MealIdeasModal behavior)
  const [adoptingIndex, setAdoptingIndex] = useState<number | null>(null);
  const [adoptedIndices, setAdoptedIndices] = useState<number[]>([]);

  // Load weather when modal opens
  useEffect(() => {
    if (!isOpen || !trip?.id) return;
    let isMounted = true;
    setIsLoadingWeather(true);
    fetchTripWeather(trip.id)
      .then((res) => {
        if (isMounted && res?.weather) {
          setWeatherReport(res.weather);
        }
      })
      .catch((err) => {
        console.warn('Weather fetch error in PackingListModal:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingWeather(false);
      });
    return () => {
      isMounted = false;
    };
  }, [isOpen, trip?.id]);

  const groupName = selectedGroup?.name || 'Campers';
  const groupId = selectedGroup?.id || '';

  const defaultActivitiesList = [
    { id: 'Hiking', label: 'Hiking', icon: Footprints, desc: 'Boots, hydration, blister kit, daypack' },
    { id: 'Swimming', label: 'Swimming', icon: Waves, desc: 'Swimwear, microfiber towel, water shoes, dry bag' },
    { id: 'Canoeing / Paddling', label: 'Canoeing', icon: Compass, desc: 'PFD, bailer, dry bags' },
    { id: 'Campfire Cooking', label: 'Campfire Cooking', icon: UtensilsCrossed, desc: 'Cast iron, tongs, heat gloves' },
    { id: 'Stargazing', label: 'Stargazing', icon: Sparkles, desc: 'Red-light headlamp, binoculars' },
    { id: 'Fishing', label: 'Fishing', icon: Package, desc: 'Rod, tackle, license' }
  ];

  const toggleActivity = (act: string) => {
    if (activities.includes(act)) {
      setActivities(activities.filter(a => a !== act));
    } else {
      setActivities([...activities, act]);
    }
  };

  const handleAddCustomActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customActivityInput.trim()) return;
    const trimmed = customActivityInput.trim();
    if (!activities.includes(trimmed)) {
      setActivities([...activities, trimmed]);
    }
    setCustomActivityInput('');
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg('');
    try {
      const res = await getAiPackingList({
        destination,
        season,
        activities,
        weatherSummary: weatherReport?.summary,
        forecastDays: weatherReport?.forecastDays,
        groupName,
        notes: notes.trim()
      });

      if (res && Array.isArray(res.items)) {
        setSuggestedItems(res.items);
        setSelectedItemIndices(res.items.map((_, i) => i));
      } else {
        throw new Error('Invalid equipment data format received from Grok 4.6.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate packing list with Grok 4.6');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelectItem = (index: number) => {
    if (selectedItemIndices.includes(index)) {
      setSelectedItemIndices(selectedItemIndices.filter(i => i !== index));
    } else {
      setSelectedItemIndices([...selectedItemIndices, index]);
    }
  };

  const toggleSelectAll = () => {
    if (!suggestedItems) return;
    if (selectedItemIndices.length === suggestedItems.length) {
      setSelectedItemIndices([]);
    } else {
      setSelectedItemIndices(suggestedItems.map((_, i) => i));
    }
  };

  const mapToEquipmentCategory = (cat: string): any => {
    if (cat === 'Shelter') return 'Shelter & Sleep';
    if (cat === 'Cooking') return 'Cooking & Water';
    if (cat === 'Clothing') return 'Weather & Layers';
    if (cat === 'Personal Items') return 'Tools & First Aid';
    return 'General';
  };

  const handleAdoptSingleItem = async (item: PackingSuggestionItem, originalIndex: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAdoptingIndex(originalIndex);
    setErrorMsg('');
    try {
      await batchAddEquipment(trip.id, {
        userId: currentUser.id,
        groupId: groupId,
        items: [{
          name: item.name,
          category: mapToEquipmentCategory(item.category),
          notes: `${item.reason}${item.activityTag ? ` [${item.activityTag}]` : ''}`
        }]
      });
      setAdoptedIndices(prev => [...prev, originalIndex]);
      onItemsAdded();
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to add ${item.name} to equipment list`);
    } finally {
      setAdoptingIndex(null);
    }
  };

  const handleCommitSelected = async () => {
    if (!suggestedItems || selectedItemIndices.length === 0) return;
    setIsCommitting(true);
    setErrorMsg('');
    try {
      const itemsToCommit = selectedItemIndices.map(i => {
        const item = suggestedItems[i];
        return {
          name: item.name,
          category: mapToEquipmentCategory(item.category),
          notes: `${item.reason}${item.activityTag ? ` [${item.activityTag}]` : ''}`
        };
      });

      await batchAddEquipment(trip.id, {
        userId: currentUser.id,
        groupId: groupId,
        items: itemsToCommit
      });

      onItemsAdded();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add items to group equipment checklist');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleCopyFormatted = () => {
    if (!suggestedItems) return;
    const categories: Array<'Shelter' | 'Cooking' | 'Clothing' | 'Personal Items'> = [
      'Shelter',
      'Cooking',
      'Clothing',
      'Personal Items'
    ];

    let text = `# Camping Packing List — ${destination}\n`;
    text += `Season: ${season} | Activities: ${activities.join(', ')}\n`;
    if (weatherReport?.summary) {
      text += `Weather Forecast: ${weatherReport.summary}\n`;
    }
    text += `AI Engine: Grok 4.6 only\n\n`;

    categories.forEach(cat => {
      const catItems = suggestedItems.filter(item => item.category === cat);
      if (catItems.length > 0) {
        text += `## ${cat}\n`;
        catItems.forEach(item => {
          text += `[ ] ${item.name} — ${item.reason}\n`;
        });
        text += `\n`;
      }
    });

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  const categoryIcons: Record<string, any> = {
    'Shelter': Tent,
    'Cooking': UtensilsCrossed,
    'Clothing': Shirt,
    'Personal Items': Package
  };

  const filteredItems = useMemo(() => {
    if (!suggestedItems) return [];
    if (activeCategoryFilter === 'All') return suggestedItems;
    return suggestedItems.filter(item => item.category === activeCategoryFilter);
  }, [suggestedItems, activeCategoryFilter]);

  const categoryCounts = useMemo(() => {
    if (!suggestedItems) return { Shelter: 0, Cooking: 0, Clothing: 0, 'Personal Items': 0 };
    return {
      Shelter: suggestedItems.filter(i => i.category === 'Shelter').length,
      Cooking: suggestedItems.filter(i => i.category === 'Cooking').length,
      Clothing: suggestedItems.filter(i => i.category === 'Clothing').length,
      'Personal Items': suggestedItems.filter(i => i.category === 'Personal Items').length,
    };
  }, [suggestedItems]);

  // Compute key forecast indicators for badges
  const forecastHighlight = useMemo(() => {
    if (!weatherReport?.forecastDays || weatherReport.forecastDays.length === 0) return null;
    const days = weatherReport.forecastDays;
    const minTemp = Math.min(...days.map(d => typeof d.minTempC === 'number' ? d.minTempC : Math.round(((d.minTempF || 50) - 32) * 5 / 9)));
    const maxTemp = Math.max(...days.map(d => typeof d.maxTempC === 'number' ? d.maxTempC : Math.round(((d.maxTempF || 70) - 32) * 5 / 9)));
    const maxRain = Math.max(...days.map(d => d.precipitationPercent || 0));
    return { minTemp, maxTemp, maxRain, firstCond: days[0].condition };
  }, [weatherReport]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 flex items-start justify-between bg-neutral-50/50">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-neutral-900 text-white font-mono">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Grok 4.6 AI Packing Engine
              </span>
              <span className="text-xs text-neutral-500 font-medium">
                for {groupName}
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-950">
              Customized Camping Packing List
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Grok 4.6 synthesizes your chosen <strong className="text-neutral-800">location</strong>, <strong className="text-neutral-800">season</strong>, and <strong className="text-neutral-800">weather forecast</strong> into gear recommendations.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          
          {errorMsg && (
            <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Configuration Form & Weather Intelligence Panel */}
          <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 space-y-4">
            
            {/* Live Meteorological & Weather Forecast Card */}
            <div className="p-3.5 rounded-xl border border-neutral-200 bg-white shadow-xs space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CloudSun className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-neutral-900">
                    Location, Season & Weather Synthesis
                  </span>
                </div>

                {isLoadingWeather ? (
                  <span className="text-[11px] text-neutral-400 font-mono flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    Fetching forecast...
                  </span>
                ) : weatherReport ? (
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live Forecast Connected
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-neutral-500">
                    Default Season Climate Mode
                  </span>
                )}
              </div>

              {/* Weather metric highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-neutral-100">
                <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                  <div className="text-[10px] text-neutral-400 uppercase font-mono">Location</div>
                  <div className="font-semibold text-neutral-900 truncate">{destination}</div>
                </div>

                <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                  <div className="text-[10px] text-neutral-400 uppercase font-mono">Season</div>
                  <div className="font-semibold text-neutral-900">{season}</div>
                </div>

                <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                  <div className="text-[10px] text-neutral-400 uppercase font-mono">Forecast High / Low</div>
                  <div className="font-semibold text-neutral-900 flex items-center gap-1">
                    <Thermometer className="w-3 h-3 text-red-500" />
                    {forecastHighlight ? `${forecastHighlight.maxTemp}°C / ${forecastHighlight.minTemp}°C` : '22°C / 10°C'}
                  </div>
                </div>

                <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                  <div className="text-[10px] text-neutral-400 uppercase font-mono">Rain Probability</div>
                  <div className="font-semibold text-neutral-900 flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-sky-500" />
                    {forecastHighlight ? `${forecastHighlight.maxRain}% Max` : '15% Chance'}
                  </div>
                </div>
              </div>

              {/* AI Weather Adaptation Guidance Pill */}
              <div className="text-[11px] text-neutral-600 bg-amber-50/70 border border-amber-200/60 p-2.5 rounded-lg flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-neutral-900">Grok 4.6 Customization: </strong>
                  {forecastHighlight && forecastHighlight.minTemp < 10
                    ? `Night temperatures dropping to ${forecastHighlight.minTemp}°C require thermal sleeping bags, insulated R-Value 3.5+ pads, and layered fleece.`
                    : forecastHighlight && forecastHighlight.maxRain > 25
                    ? `Precipitation risk of ${forecastHighlight.maxRain}% mandates seam-sealed rain flys, waterproof dry bags, and pack covers.`
                    : `Grok 4.6 tailors clothing warmth, rain fly specs, and shelter ratings to ${destination} in ${season}.`}
                </div>
              </div>
            </div>

            {/* Destination & Season Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-800 mb-1 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-neutral-500" />
                  Chosen Location & Campsite
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Algonquin Provincial Park, Lake of Two Rivers"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                  Season / Time of Year
                </label>
                <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-lg border border-neutral-200">
                  {(['Spring', 'Summer', 'Fall', 'Winter'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSeason(s)}
                      className={`text-[11px] py-1 px-1.5 rounded font-medium transition ${
                        season === s
                          ? 'bg-neutral-950 text-white shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Planned Activities */}
            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1.5">
                Planned Activities <span className="text-neutral-400 font-normal">(Grok 4.6 adds activity-specific footwear & safety gear)</span>
              </label>
              
              <div className="flex flex-wrap gap-2">
                {defaultActivitiesList.map((act) => {
                  const isSelected = activities.includes(act.id);
                  const Icon = act.icon || Footprints;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => toggleActivity(act.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-neutral-950 text-white border-neutral-950'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{act.label}</span>
                      {isSelected && <Check className="w-3 h-3 text-white ml-0.5" />}
                    </button>
                  );
                })}

                {/* Additional custom activities entered by user */}
                {activities
                  .filter(a => !defaultActivitiesList.some(d => d.id === a))
                  .map(a => (
                    <span
                      key={a}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-950 text-white flex items-center gap-1"
                    >
                      <span>{a}</span>
                      <button
                        type="button"
                        onClick={() => toggleActivity(a)}
                        className="hover:text-red-300 ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
              </div>

              {/* Add custom activity input */}
              <form onSubmit={handleAddCustomActivity} className="flex gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Add custom activity (e.g. Bouldering, Kayaking)..."
                  value={customActivityInput}
                  onChange={(e) => setCustomActivityInput(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950 flex-1 max-w-sm"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-lg transition font-medium"
                >
                  Add
                </button>
              </form>
            </div>

            {/* Additional Notes & Generate Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-neutral-200/60">
              <div className="text-[11px] text-neutral-500">
                Grok 4.6 categorizes into: <strong className="text-neutral-800">Shelter</strong>, <strong className="text-neutral-800">Cooking</strong>, <strong className="text-neutral-800">Clothing</strong>, and <strong className="text-neutral-800">Personal Items</strong>.
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                id="generate-grok-packing-btn"
                className="px-4 py-2 text-xs font-semibold bg-neutral-950 text-white rounded-xl hover:bg-neutral-800 transition flex items-center justify-center gap-2 shadow-sm shrink-0"
              >
                <Sparkles className={`w-4 h-4 text-amber-300 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Grok 4.6 Generating List...' : (suggestedItems ? 'Regenerate List' : 'Generate Suggested Packing List')}</span>
              </button>
            </div>

          </div>

          {/* Results Display */}
          {suggestedItems && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Category Filter Tabs & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200">
                
                {/* Category tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button
                    onClick={() => setActiveCategoryFilter('All')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                      activeCategoryFilter === 'All'
                        ? 'bg-neutral-950 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    All Items ({suggestedItems.length})
                  </button>

                  {(['Shelter', 'Cooking', 'Clothing', 'Personal Items'] as const).map((cat) => {
                    const count = categoryCounts[cat] || 0;
                    const Icon = categoryIcons[cat] || Package;
                    return (
                      <button
                        key={cat}
                        onClick={() => setActiveCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                          activeCategoryFilter === cat
                            ? 'bg-neutral-950 text-white'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{cat}</span>
                        <span className="text-[10px] font-mono px-1 rounded bg-black/10 text-current">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Bulk Select / Copy */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={toggleSelectAll}
                    className="text-xs text-neutral-600 hover:text-neutral-950 font-medium px-2 py-1"
                  >
                    {selectedItemIndices.length === suggestedItems.length ? 'Deselect All' : 'Select All'}
                  </button>

                  <button
                    onClick={handleCopyFormatted}
                    title="Copy formatted markdown list"
                    className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-600 text-xs flex items-center gap-1"
                  >
                    {copiedNotification ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{copiedNotification ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>

              </div>

              {/* Items List */}
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {filteredItems.map((item) => {
                  const originalIndex = suggestedItems ? suggestedItems.indexOf(item) : -1;
                  const isChecked = selectedItemIndices.includes(originalIndex);
                  const isAdopted = adoptedIndices.includes(originalIndex);
                  const isAdopting = adoptingIndex === originalIndex;
                  const CatIcon = categoryIcons[item.category] || Package;

                  return (
                    <div
                      key={originalIndex >= 0 ? originalIndex : item.name}
                      onClick={() => originalIndex >= 0 && toggleSelectItem(originalIndex)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                        isAdopted
                          ? 'border-emerald-300 bg-emerald-50/40'
                          : isChecked
                          ? 'border-neutral-400 bg-neutral-50/50'
                          : 'border-neutral-200 bg-white opacity-80 hover:opacity-100 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          className="mt-0.5 text-neutral-900 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (originalIndex >= 0) toggleSelectItem(originalIndex);
                          }}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-neutral-950 fill-neutral-950 text-white" />
                          ) : (
                            <Square className="w-4 h-4 text-neutral-300" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-xs text-neutral-950">
                              {item.name}
                            </span>

                            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700">
                              <CatIcon className="w-2.5 h-2.5" />
                              {item.category}
                            </span>

                            {item.activityTag && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 capitalize flex items-center gap-1">
                                {item.activityTag === 'hiking' ? <Footprints className="w-2.5 h-2.5" /> : null}
                                {item.activityTag === 'swimming' ? <Waves className="w-2.5 h-2.5" /> : null}
                                {item.activityTag}
                              </span>
                            )}

                            {item.essential && (
                              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                                Essential
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-neutral-600 leading-relaxed">
                            {item.reason}
                          </p>
                        </div>
                      </div>

                      {/* Adopt / Add Single Item Button */}
                      <button
                        type="button"
                        disabled={isAdopted || isAdopting}
                        onClick={(e) => handleAdoptSingleItem(item, originalIndex, e)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 flex items-center gap-1.5 border shadow-2xs ${
                          isAdopted
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-800 cursor-default'
                            : 'bg-white border-neutral-200 text-neutral-800 hover:bg-neutral-950 hover:text-white hover:border-neutral-950'
                        }`}
                      >
                        {isAdopting ? (
                          <>
                            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span>Adding...</span>
                          </>
                        ) : isAdopted ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Added ✓</span>
                          </>
                        ) : (
                          <>
                            <span className="text-amber-500 font-bold">+</span>
                            <span>Add Item</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            {suggestedItems ? (
              <span>
                <strong>{selectedItemIndices.length}</strong> of {suggestedItems.length} items selected
              </span>
            ) : (
              <span>Engineered specifically with Grok 4.6 weather & location prompt specs</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-950 transition"
            >
              Cancel
            </button>

            {suggestedItems && (
              <button
                type="button"
                onClick={handleCommitSelected}
                disabled={isCommitting || selectedItemIndices.length === 0}
                className="px-4 py-2 text-xs font-semibold bg-neutral-950 text-white rounded-xl hover:bg-neutral-800 transition flex items-center gap-2 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {isCommitting
                    ? 'Adding to Checklist...'
                    : `Add ${selectedItemIndices.length} Item${selectedItemIndices.length === 1 ? '' : 's'} to ${groupName}`}
                </span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
