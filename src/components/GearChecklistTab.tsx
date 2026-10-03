import React, { useState } from 'react';
import { Trip, TripMember, Group, EquipmentItem, PackingCategory } from '../types';
import {
  Backpack,
  Plus,
  Sparkles,
  CheckCircle2,
  Circle,
  Trash2,
  User,
  Search
} from 'lucide-react';
import { GrokGearModal } from './GrokGearModal';

interface GearChecklistTabProps {
  trip: Trip;
  groups: Group[];
  members: TripMember[];
  equipment: EquipmentItem[];
  currentMember?: TripMember | null;
  onTogglePacked: (itemId: string, packed: boolean) => Promise<void>;
  onAddItem: (data: { name: string; category: PackingCategory; groupId: string; assignedTo?: string; notes?: string }) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onBatchAddItems: (items: Array<{ name: string; category: PackingCategory; groupId: string; notes: string; aiSuggested: boolean }>) => Promise<void>;
}

export const GearChecklistTab: React.FC<GearChecklistTabProps> = ({
  trip,
  groups,
  members,
  equipment,
  currentMember,
  onTogglePacked,
  onAddItem,
  onDeleteItem,
  onBatchAddItems
}) => {
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGrokModalOpen, setIsGrokModalOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New item form
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<PackingCategory>('Shelter & Sleep');
  const [newItemGroupId, setNewItemGroupId] = useState<string>(groups[0]?.id || '');
  const [newItemAssignee, setNewItemAssignee] = useState<string>(currentMember?.name || '');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories: PackingCategory[] = [
    'Shelter & Sleep',
    'Cooking & Water',
    'Lighting & Power',
    'Tools & First Aid',
    'Weather & Layers',
    'Personal Items',
    'General'
  ];

  const filteredGear = equipment.filter((item) => {
    if (selectedGroupFilter !== 'all' && item.groupId !== selectedGroupFilter) return false;
    if (selectedCategoryFilter !== 'all' && item.category !== selectedCategoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchAssignee = (item.assignedTo || '').toLowerCase().includes(q);
      const matchNotes = (item.notes || '').toLowerCase().includes(q);
      if (!matchName && !matchAssignee && !matchNotes) return false;
    }
    return true;
  });

  const totalCount = equipment.length;
  const packedCount = equipment.filter(e => e.packed).length;
  const packedPercent = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemGroupId) return;

    setIsSubmitting(true);
    try {
      await onAddItem({
        name: newItemName.trim(),
        category: newItemCategory,
        groupId: newItemGroupId,
        assignedTo: newItemAssignee.trim() || undefined,
        notes: newItemNotes.trim() || undefined
      });
      setNewItemName('');
      setNewItemNotes('');
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to add item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 bg-white text-black">
      {/* Top Banner & Progress */}
      <div className="p-6 border-2 border-black bg-white space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Backpack className="w-5 h-5 text-black" />
              <h2 className="text-lg font-black uppercase tracking-tight text-black">Group Gear & Equipment Checklist</h2>
            </div>
            <p className="text-xs text-black/70 mt-1">
              Coordinated by group so each team packs their designated equipment without duplicates.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* #D6B588 box with inner white text */}
            <button
              type="button"
              onClick={() => setIsGrokModalOpen(true)}
              className="bg-[#D6B588] hover:bg-[#c9a676] text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 border border-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-4 h-4" />
              <span>Grok AI Packing Suggestions</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 border border-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Gear Item</span>
            </button>
          </div>
        </div>

        {/* Progress Bar with Sand Fill */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span className="text-black">
              Packing Progress: {packedCount} of {totalCount} items ready
            </span>
            <span className="bg-[#D6B588] text-white px-2 py-0.5 border border-black">
              {packedPercent}%
            </span>
          </div>
          <div className="w-full h-3 border border-black bg-white overflow-hidden">
            <div
              className="h-full bg-[#D6B588] transition-all duration-300"
              style={{ width: `${packedPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 border border-black space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-black/50" />
            <input
              type="text"
              placeholder="Search gear by name, assignee, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-black text-black placeholder-neutral-400 focus:outline-hidden"
            />
          </div>

          {/* Group Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 touch-scroll">
            <button
              type="button"
              onClick={() => setSelectedGroupFilter('all')}
              className={`text-xs px-3.5 py-1.5 font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer border border-black ${
                selectedGroupFilter === 'all'
                  ? 'bg-[#D6B588] text-white'
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              All Groups ({equipment.length})
            </button>

            {groups.map((g) => {
              const gCount = equipment.filter(e => e.groupId === g.id).length;
              const isSelected = selectedGroupFilter === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGroupFilter(g.id)}
                  className={`text-xs px-3.5 py-1.5 font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer border border-black ${
                    isSelected
                      ? 'bg-[#D6B588] text-white'
                      : 'bg-white text-black hover:bg-neutral-100'
                  }`}
                >
                  {g.name} ({gCount})
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 touch-scroll border-t border-black/10">
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('all')}
            className={`text-xs px-3 py-1 uppercase font-semibold shrink-0 transition-colors cursor-pointer border ${
              selectedCategoryFilter === 'all'
                ? 'border-black bg-black text-white'
                : 'border-transparent text-black/70 hover:border-black'
            }`}
          >
            All Categories
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategoryFilter(cat)}
              className={`text-xs px-3 py-1 uppercase font-semibold shrink-0 transition-colors cursor-pointer border ${
                selectedCategoryFilter === cat
                  ? 'border-black bg-black text-white'
                  : 'border-transparent text-black/70 hover:border-black'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment List */}
      <div className="space-y-3">
        {filteredGear.length === 0 ? (
          <div className="text-center py-12 px-4 border-2 border-black bg-white space-y-3">
            <Backpack className="w-8 h-8 text-black/40 mx-auto" />
            <h4 className="font-bold text-black text-sm uppercase">No gear items found</h4>
            <p className="text-xs text-black/70 max-w-sm mx-auto">
              Add custom items or use Grok AI Packing Suggestions to automatically generate a complete camping gear checklist.
            </p>
            <button
              type="button"
              onClick={() => setIsGrokModalOpen(true)}
              className="bg-[#D6B588] hover:bg-[#c9a676] text-white font-bold text-xs uppercase px-5 py-2.5 border border-black transition-all cursor-pointer shadow-xs inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Gear with Grok</span>
            </button>
          </div>
        ) : (
          filteredGear.map((item) => {
            const group = groups.find(g => g.id === item.groupId);

            return (
              <div
                key={item.id}
                className={`p-4 border border-black bg-white transition-all flex items-center justify-between gap-4 ${
                  item.packed ? 'opacity-85 bg-neutral-50' : ''
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* Packed Checkbox */}
                  <button
                    type="button"
                    onClick={() => onTogglePacked(item.id, !item.packed)}
                    aria-label={item.packed ? 'Mark as not packed' : 'Mark as packed'}
                    className="shrink-0 text-black cursor-pointer"
                  >
                    {item.packed ? (
                      <CheckCircle2 className="w-5 h-5 text-black fill-[#D6B588]" />
                    ) : (
                      <Circle className="w-5 h-5 text-black/40 hover:text-black" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold text-xs uppercase tracking-tight ${item.packed ? 'line-through text-black/50' : 'text-black'}`}>
                        {item.name}
                      </span>

                      {/* Group Pill (#D6B588 Box with Inner White Text if packed or special) */}
                      {group && (
                        <span className="bg-[#D6B588] text-white font-bold text-[10px] px-2 py-0.5 border border-black uppercase">
                          {group.name}
                        </span>
                      )}

                      {/* Category Pill */}
                      <span className="border border-black bg-white text-black font-semibold text-[10px] px-2 py-0.5 uppercase">
                        {item.category}
                      </span>

                      {/* AI tag */}
                      {item.aiSuggested && (
                        <span className="border border-black bg-black text-white font-bold text-[10px] px-1.5 py-0.2 uppercase">
                          Grok AI
                        </span>
                      )}
                    </div>

                    {/* Assignee & Notes */}
                    <div className="flex items-center gap-3 text-xs text-black/70 mt-1 flex-wrap">
                      {item.assignedTo && (
                        <span className="flex items-center gap-1 font-bold text-black uppercase">
                          <User className="w-3 h-3 text-black" />
                          {item.assignedTo}
                        </span>
                      )}
                      {item.notes && (
                        <span className="truncate max-w-sm text-black/80 font-normal">{item.notes}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delete action */}
                <button
                  type="button"
                  onClick={() => onDeleteItem(item.id)}
                  className="p-1.5 text-black/40 hover:text-black transition-colors shrink-0 cursor-pointer"
                  title="Remove gear item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Add Gear Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
          <div className="bg-white border-2 border-black max-w-md w-full p-6 text-black space-y-4 animate-slide-up max-h-[90dvh] overflow-y-auto">
            <h3 className="font-black text-black text-base uppercase tracking-tight">Add Camping Gear Item</h3>

            <form onSubmit={handleCreateItem} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 6-Person Tent, Cast Iron Griddle, Fire Axe"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-black focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                    Group Responsible *
                  </label>
                  <select
                    value={newItemGroupId}
                    onChange={(e) => setNewItemGroupId(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-black focus:outline-hidden font-medium"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                    Category *
                  </label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as PackingCategory)}
                    className="w-full text-xs px-3 py-2 bg-white border border-black focus:outline-hidden font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                  Assigned Camper (Who is packing it?)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Trung, Sarah, or Unassigned"
                  value={newItemAssignee}
                  onChange={(e) => setNewItemAssignee(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-black focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                  Notes / Specs (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Check ground stakes, needs 2 C batteries"
                  value={newItemNotes}
                  onChange={(e) => setNewItemNotes(e.target.value)}
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
                  disabled={!newItemName.trim() || isSubmitting}
                  className="bg-[#D6B588] hover:bg-[#c9a676] text-white font-semibold text-xs px-5 py-2 border border-black transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Add Gear Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grok Gear Suggestion Modal */}
      <GrokGearModal
        isOpen={isGrokModalOpen}
        onClose={() => setIsGrokModalOpen(false)}
        destination={trip.location || 'Wilderness Campground'}
        startDate={trip.startDate}
        endDate={trip.endDate}
        groups={groups}
        activeGroupId={selectedGroupFilter !== 'all' ? selectedGroupFilter : groups[0]?.id}
        groupSize={members.length || undefined}
        existingItems={equipment.map(e => e.name)}
        onAddItems={onBatchAddItems}
      />
    </div>
  );
};
