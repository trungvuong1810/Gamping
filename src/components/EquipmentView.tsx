import React, { useState } from 'react';
import { Trip, Group, GroupMember, EquipmentItem, User } from '../types';
import { addEquipmentItem, updateEquipmentItem, deleteEquipmentItem, getAiEquipmentDraft, batchAddEquipment } from '../api/client';
import { PackingListModal } from './PackingListModal';
import { CheckSquare, Square, Plus, Sparkles, Trash2, Lock, ShieldCheck, AlertCircle, Filter, Check, User as UserIcon, ListChecks } from 'lucide-react';

interface EquipmentViewProps {
  trip: Trip;
  currentUser: User;
  groups: Group[];
  groupMembers: GroupMember[];
  equipment: EquipmentItem[];
  isPast: boolean;
  onRefreshTrip: () => void;
}

export const EquipmentView: React.FC<EquipmentViewProps> = ({
  trip,
  currentUser,
  groups,
  groupMembers,
  equipment,
  isPast,
  onRefreshTrip
}) => {
  // Determine user's assigned group
  const myAssignment = groupMembers.find(gm => gm.userId === currentUser.id);
  const myGroupId = myAssignment ? myAssignment.groupId : null;

  // Selected group tab (defaults to user's group or first group)
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    myGroupId || (groups[0]?.id || '')
  );

  const selectedGroup = groups.find(g => g.id === selectedGroupId) || groups[0];
  const isHost = trip.hostId === currentUser.id;
  const canEditSelectedGroup = !isPast && (isHost || myGroupId === selectedGroupId);

  // State for adding manual item
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<EquipmentItem['category']>('Shelter & Sleep');
  const [newItemAssigned, setNewItemAssigned] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Grok 4.6 Suggested Packing List Modal state
  const [showPackingModal, setShowPackingModal] = useState(false);

  // AI draft state (Grok 4.6)
  const [isAiDrafting, setIsAiDrafting] = useState(false);
  const [aiDraftItems, setAiDraftItems] = useState<Array<{ name: string; category: string; notes: string }> | null>(null);
  const [selectedDraftIndices, setSelectedDraftIndices] = useState<number[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [errorMsg, setErrorMsg] = useState('');

  const groupItems = equipment.filter(e => e.tripId === trip.id && e.groupId === selectedGroupId);
  const filteredItems = categoryFilter === 'All'
    ? groupItems
    : groupItems.filter(e => e.category === categoryFilter);

  const packedCount = groupItems.filter(e => e.packed).length;

  const categories: Array<EquipmentItem['category']> = [
    'Shelter & Sleep',
    'Cooking & Water',
    'Lighting & Power',
    'Weather & Layers',
    'Tools & First Aid',
    'General'
  ];

  // Toggle item packed status (with strict permission verification)
  const handleTogglePacked = async (item: EquipmentItem) => {
    if (!canEditSelectedGroup) {
      setErrorMsg('Permission denied: You can only edit your own group’s equipment list.');
      return;
    }
    try {
      await updateEquipmentItem(trip.id, item.id, {
        userId: currentUser.id,
        packed: !item.packed
      });
      onRefreshTrip();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update item');
    }
  };

  // Add new manual gear item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !canEditSelectedGroup) return;

    setIsAdding(true);
    setErrorMsg('');
    try {
      await addEquipmentItem(trip.id, {
        userId: currentUser.id,
        groupId: selectedGroupId,
        name: newItemName.trim(),
        category: newItemCategory,
        assignedTo: newItemAssigned.trim() || currentUser.name,
        notes: newItemNotes.trim()
      });
      setNewItemName('');
      setNewItemNotes('');
      setShowAddForm(false);
      onRefreshTrip();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add item');
    } finally {
      setIsAdding(false);
    }
  };

  // Delete item
  const handleDeleteItem = async (itemId: string) => {
    if (!canEditSelectedGroup) return;
    try {
      await deleteEquipmentItem(trip.id, itemId, currentUser.id);
      onRefreshTrip();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete item');
    }
  };

  // Trigger Grok 4.6 gear draft
  const handleRunAiDraft = async () => {
    if (!canEditSelectedGroup) return;
    setIsAiDrafting(true);
    setErrorMsg('');
    try {
      const res = await getAiEquipmentDraft({
        location: trip.location,
        startDate: trip.startDate,
        endDate: trip.endDate,
        groupName: selectedGroup?.name
      });
      setAiDraftItems(res.equipment);
      // Select all by default
      setSelectedDraftIndices(res.equipment.map((_, i) => i));
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate gear draft');
    } finally {
      setIsAiDrafting(false);
    }
  };

  // Accept and commit selected AI draft items into group's checklist
  const handleCommitDraft = async () => {
    if (!aiDraftItems || selectedDraftIndices.length === 0 || !canEditSelectedGroup) return;

    setIsSeeding(true);
    setErrorMsg('');
    try {
      const itemsToSeed = selectedDraftIndices.map(i => aiDraftItems[i]);
      await batchAddEquipment(trip.id, {
        userId: currentUser.id,
        groupId: selectedGroupId,
        items: itemsToSeed
      });
      setAiDraftItems(null);
      setSelectedDraftIndices([]);
      onRefreshTrip();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to seed equipment draft');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Group Navigation Tabs (Cross-group visibility) */}
      <div className="border-b border-neutral-200">
        <div className="flex items-center gap-2 overflow-x-auto pb-px">
          {groups.map((grp) => {
            const isSelected = grp.id === selectedGroupId;
            const isUserGroup = grp.id === myGroupId;
            const count = equipment.filter(e => e.groupId === grp.id).length;

            return (
              <button
                key={grp.id}
                onClick={() => {
                  setSelectedGroupId(grp.id);
                  setErrorMsg('');
                }}
                className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center gap-2 border-b-2 whitespace-nowrap ${
                  isSelected
                    ? 'border-neutral-950 text-neutral-950 bg-neutral-50/70 font-semibold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <span>{grp.name}</span>
                <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-neutral-200/80 text-neutral-700">
                  {count}
                </span>
                {isUserGroup && (
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-950"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Permission & Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-neutral-200 bg-white">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-neutral-950 text-sm">
              {selectedGroup?.name} Equipment
            </h3>
            {canEditSelectedGroup ? (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-950 text-white font-medium flex items-center gap-1">
                <Check className="w-3 h-3" /> {isHost ? 'Trip Host • Coordinator Access' : 'Group Member • Edit Access'}
              </span>
            ) : (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-medium flex items-center gap-1 border border-neutral-200">
                <Lock className="w-3 h-3 text-neutral-400" />
                {isPast ? 'Past Trip Locked' : 'Cross-Group Visibility (Read-Only)'}
              </span>
            )}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            {canEditSelectedGroup
              ? 'You can add, edit, and check off items for your assigned group.'
              : isPast
              ? 'Past trips are preserved as immutable historical memory.'
              : 'You have full cross-group visibility, but only assigned members can edit this list.'}
          </div>
        </div>

        {/* Action buttons (Only for assigned group members) */}
        {canEditSelectedGroup && (
          <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
            <button
              onClick={() => setShowPackingModal(true)}
              id="open-grok-packing-modal-btn"
              className="px-3 py-1.5 text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 rounded-lg transition flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Grok 4.6 Packing List</span>
            </button>

            <button
              onClick={() => setShowPackingModal(true)}
              className="px-3 py-1.5 text-xs font-medium border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 rounded-lg transition flex items-center gap-1.5"
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>Grok Gear Ideas</span>
            </button>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 text-xs font-medium bg-neutral-950 text-white rounded-lg hover:bg-neutral-800 transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grok 4.6 AI Equipment Draft Modal / Review Area */}
      {aiDraftItems && canEditSelectedGroup && (
        <div className="p-5 rounded-2xl border border-neutral-900 bg-neutral-50 shadow-sm animate-in fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-neutral-950" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-950">
                Grok 4.6 Seasonal Equipment Draft ({aiDraftItems.length} items suggested)
              </h4>
            </div>
            <button
              onClick={() => setAiDraftItems(null)}
              className="text-xs text-neutral-400 hover:text-neutral-700"
            >
              Dismiss
            </button>
          </div>

          <p className="text-xs text-neutral-500 mb-4">
            Context: {trip.location} ({trip.startDate} to {trip.endDate}). Factoring in typical seasonal night temperatures and multi-group shelter needs.
          </p>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 mb-4">
            {aiDraftItems.map((item, idx) => {
              const isChecked = selectedDraftIndices.includes(idx);
              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (isChecked) {
                      setSelectedDraftIndices(selectedDraftIndices.filter(i => i !== idx));
                    } else {
                      setSelectedDraftIndices([...selectedDraftIndices, idx]);
                    }
                  }}
                  className={`p-3 rounded-lg border text-xs cursor-pointer flex items-start justify-between transition ${
                    isChecked
                      ? 'border-neutral-950 bg-white ring-1 ring-neutral-950'
                      : 'border-neutral-200 bg-white/70 opacity-70'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-neutral-900 flex items-center gap-2">
                      <span>{item.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600">
                        {item.category}
                      </span>
                    </div>
                    {item.notes && (
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        {item.notes}
                      </div>
                    )}
                  </div>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${isChecked ? 'bg-neutral-950 text-white border-neutral-950' : 'border-neutral-300'}`}>
                    {isChecked && <Check className="w-3 h-3" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-neutral-200">
            <span className="text-xs text-neutral-500">
              {selectedDraftIndices.length} items selected to add
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAiDraftItems(null)}
                className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-950"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCommitDraft}
                disabled={isSeeding || selectedDraftIndices.length === 0}
                className="px-4 py-1.5 text-xs bg-neutral-950 text-white rounded-lg hover:bg-neutral-800 font-medium"
              >
                {isSeeding ? 'Adding Items...' : 'Accept & Add to Group List'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Manual Gear Item Form */}
      {showAddForm && canEditSelectedGroup && (
        <form onSubmit={handleAddItem} className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                Equipment Name *
              </label>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g. 2-Burner Camp Stove"
                className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                Category
              </label>
              <select
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value as any)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                Assigned Camper
              </label>
              <input
                type="text"
                value={newItemAssigned}
                onChange={(e) => setNewItemAssigned(e.target.value)}
                placeholder={`e.g. ${currentUser.name}`}
                className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                Notes / Specs
              </label>
              <input
                type="text"
                value={newItemNotes}
                onChange={(e) => setNewItemNotes(e.target.value)}
                placeholder="e.g. Bring 2x 1lb propane bottles"
                className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-950"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAdding}
              className="px-4 py-1.5 text-xs bg-neutral-950 text-white rounded-lg hover:bg-neutral-800 font-medium"
            >
              {isAdding ? 'Adding...' : 'Save Gear Item'}
            </button>
          </div>
        </form>
      )}

      {/* Category Filter Pills & Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setCategoryFilter('All')}
            className={`px-2.5 py-1 rounded-lg border transition ${
              categoryFilter === 'All'
                ? 'bg-neutral-950 text-white border-neutral-950 font-medium'
                : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            All ({groupItems.length})
          </button>
          {categories.map((cat) => {
            const cCount = groupItems.filter(e => e.category === cat).length;
            if (cCount === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg border transition whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'bg-neutral-950 text-white border-neutral-950 font-medium'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                {cat} ({cCount})
              </button>
            );
          })}
        </div>

        <div className="text-xs font-mono text-neutral-500 shrink-0">
          {packedCount} / {groupItems.length} packed ({groupItems.length > 0 ? Math.round((packedCount / groupItems.length) * 100) : 0}%)
        </div>
      </div>

      {/* Equipment Items Checklist */}
      <div className="space-y-2">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                item.packed
                  ? 'border-neutral-200 bg-neutral-50/60 opacity-80'
                  : 'border-neutral-200 bg-white hover:border-neutral-300'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                {/* Packed Checkbox: interactive if canEdit, disabled with Lock if read-only */}
                <button
                  type="button"
                  onClick={() => handleTogglePacked(item)}
                  disabled={!canEditSelectedGroup}
                  title={canEditSelectedGroup ? 'Toggle packed' : 'Read-only: only members of this group can edit'}
                  className={`mt-0.5 rounded p-0.5 transition ${
                    canEditSelectedGroup ? 'hover:bg-neutral-100 cursor-pointer' : 'cursor-not-allowed opacity-50'
                  }`}
                >
                  {item.packed ? (
                    <CheckSquare className="w-4 h-4 text-neutral-950" />
                  ) : (
                    <Square className="w-4 h-4 text-neutral-400" />
                  )}
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium ${item.packed ? 'line-through text-neutral-400' : 'text-neutral-950'}`}>
                      {item.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600">
                      {item.category}
                    </span>
                    {item.aiSuggested && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-500 flex items-center gap-1 font-mono">
                        <Sparkles className="w-2.5 h-2.5" /> AI
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-neutral-500 mt-0.5">
                    {item.assignedTo && (
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3 h-3 text-neutral-400" />
                        {item.assignedTo}
                      </span>
                    )}
                    {item.notes && (
                      <span className="text-neutral-400 italic truncate max-w-sm">
                        • {item.notes}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action items */}
              {canEditSelectedGroup && (
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-neutral-300 hover:text-red-600 transition p-1"
                  title="Remove item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="p-8 rounded-xl border border-dashed border-neutral-200 text-center bg-white">
            <div className="text-xs font-medium text-neutral-600 mb-1">No equipment items listed yet.</div>
            <div className="text-[11px] text-neutral-400 max-w-xs mx-auto">
              {canEditSelectedGroup
                ? 'Add your group’s essential shelter, cooking, and layers, or click "AI Gear Draft" for instant suggestions.'
                : 'This group has not yet populated their equipment checklist.'}
            </div>
          </div>
        )}
      </div>

      {/* Grok 4.6 Suggested Packing List Modal */}
      <PackingListModal
        trip={trip}
        currentUser={currentUser}
        selectedGroup={selectedGroup}
        isOpen={showPackingModal}
        onClose={() => setShowPackingModal(false)}
        onItemsAdded={() => {
          onRefreshTrip();
        }}
      />

    </div>
  );
};
