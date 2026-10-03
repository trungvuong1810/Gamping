import React, { useState } from 'react';
import { Trip, TripMember, Group } from '../types';
import { Users, Plus, UserPlus, Trash2, UserCheck } from 'lucide-react';

interface GroupsMembersTabProps {
  trip: Trip;
  groups: Group[];
  members: TripMember[];
  currentMember?: TripMember | null;
  onSelectCurrentMember: (member: TripMember) => void;
  onAddMember: (data: { name: string; email: string; groupId: string; role: 'host' | 'member' }) => Promise<void>;
  onAddGroup: (data: { name: string; siteLabel?: string; description?: string }) => Promise<void>;
  onRemoveMember?: (memberId: string) => Promise<void>;
}

export const GroupsMembersTab: React.FC<GroupsMembersTabProps> = ({
  trip,
  groups,
  members,
  currentMember,
  onSelectCurrentMember,
  onAddMember,
  onAddGroup,
  onRemoveMember
}) => {
  const [showAddMemberModal, setShowAddMemberModal] = useState<string | null>(null);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);

  // New member form state
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);

  // New group form state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupSite, setNewGroupSite] = useState('');
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !showAddMemberModal) return;

    setIsSubmittingMember(true);
    try {
      await onAddMember({
        name: newMemberName.trim(),
        email: newMemberEmail.trim() || `${newMemberName.toLowerCase().replace(/\s+/g, '')}@camp.local`,
        groupId: showAddMemberModal,
        role: 'member'
      });
      setNewMemberName('');
      setNewMemberEmail('');
      setShowAddMemberModal(null);
    } catch (err) {
      console.error('Failed to add member:', err);
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setIsSubmittingGroup(true);
    try {
      await onAddGroup({
        name: newGroupName.trim(),
        siteLabel: newGroupSite.trim() || undefined
      });
      setNewGroupName('');
      setNewGroupSite('');
      setShowAddGroupModal(false);
    } catch (err) {
      console.error('Failed to create group:', err);
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  return (
    <div className="space-y-8 bg-white text-black">
      {/* Identity Banner: White background, black border, sand box for active camper */}
      <div className="p-6 border-2 border-black bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border border-black bg-white flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5 text-black" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-black/70">Camper Identity on this Device</div>
            <div className="text-base font-black uppercase text-black flex items-center gap-2 mt-0.5">
              <span>{currentMember ? currentMember.name : 'Select or Add Your Name Below'}</span>
              {currentMember && (
                <span className="bg-[#D6B588] text-white font-bold text-[10px] px-2 py-0.5 border border-black">
                  {currentMember.role === 'host' ? 'Host' : 'Camper'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick switcher dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-black shrink-0">Switch camper:</span>
          <select
            value={currentMember?.id || ''}
            onChange={(e) => {
              const found = members.find(m => m.id === e.target.value);
              if (found) onSelectCurrentMember(found);
            }}
            className="w-full sm:w-auto min-w-0 text-xs px-3 py-2 bg-white text-black border border-black focus:outline-hidden font-medium"
          >
            <option value="" disabled>Select camper identity</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} {m.role === 'host' ? '(Host)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-black uppercase tracking-tight text-black">Expedition Groups & Rosters</h2>
          <p className="text-xs text-black/70 mt-0.5">
            Each group coordinates their respective gear list and meal contributions before the trip starts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddGroupModal(true)}
          className="bg-[#D6B588] hover:bg-[#c9a676] text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 border border-black transition-all self-start cursor-pointer shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Group</span>
        </button>
      </div>

      {/* Group Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {groups.map((group) => {
          const groupMembers = members.filter(m => (m as any).groupId === group.id);

          return (
            <div
              key={group.id}
              className="border-2 border-black bg-white p-6 flex flex-col justify-between space-y-5"
            >
              {/* Group Title Bar */}
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-base text-black uppercase tracking-tight">{group.name}</h3>
                  {group.siteLabel && (
                    <span className="text-xs px-2.5 py-0.5 border border-black bg-white text-black font-semibold uppercase">
                      {group.siteLabel}
                    </span>
                  )}
                </div>
                {group.description && (
                  <p className="text-xs text-black/70 mt-1">{group.description}</p>
                )}
              </div>

              {/* Members in this Group */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-black pb-1 border-b border-black">
                  <span>Campers ({groupMembers.length})</span>
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(group.id)}
                    className="tap-target text-xs text-black hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    + Add Camper
                  </button>
                </div>

                {groupMembers.length === 0 ? (
                  <div className="text-center py-6 px-4 border border-black bg-neutral-50 text-xs text-black/60">
                    No campers assigned to this group yet. Click "+ Add Camper" to invite friends.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groupMembers.map((member) => {
                      const isMe = currentMember?.id === member.id;

                      return (
                        <div
                          key={member.id}
                          className={`p-3 border border-black bg-white flex items-center justify-between transition-all ${
                            isMe ? 'ring-2 ring-[#D6B588]' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 border border-black bg-white text-black font-bold text-xs flex items-center justify-center uppercase">
                              {member.name.charAt(0)}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-black uppercase">{member.name}</span>
                                {isMe && (
                                  <span className="bg-[#D6B588] text-white font-bold text-[10px] px-1.5 py-0.2 border border-black uppercase">
                                    You
                                  </span>
                                )}
                                {member.role === 'host' && (
                                  <span className="border border-black bg-white text-black font-semibold text-[10px] px-1.5 py-0.2 uppercase">
                                    Host
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-black/60 block truncate max-w-[180px]">
                                {member.email}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {!isMe && (
                              <button
                                type="button"
                                onClick={() => onSelectCurrentMember(member)}
                                className="text-xs px-2.5 py-1 text-black hover:bg-neutral-100 font-semibold border border-black transition-colors cursor-pointer uppercase"
                              >
                                I am {member.name.split(' ')[0]}
                              </button>
                            )}

                            {onRemoveMember && member.role !== 'host' && (
                              <button
                                type="button"
                                onClick={() => onRemoveMember(member.id)}
                                className="p-1 text-black/40 hover:text-black transition-colors cursor-pointer"
                                title="Remove member"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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

      {/* Add Camper Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
          <div className="bg-white border-2 border-black max-w-sm w-full p-6 text-black space-y-4 animate-slide-up max-h-[90dvh] overflow-y-auto">
            <h3 className="font-black text-black text-base uppercase tracking-tight">
              Add Camper to {groups.find(g => g.id === showAddMemberModal)?.name}
            </h3>

            <form onSubmit={handleCreateMember} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                  Friend / Camper Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex, Sarah, David"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-black focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="friend@camp.local"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-black focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-black bg-white border border-black hover:bg-neutral-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newMemberName.trim() || isSubmittingMember}
                  className="bg-[#D6B588] hover:bg-[#c9a676] text-white font-semibold text-xs px-5 py-2 border border-black transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingMember ? 'Adding...' : 'Add to Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Group Modal */}
      {showAddGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
          <div className="bg-white border-2 border-black max-w-sm w-full p-6 text-black space-y-4 animate-slide-up max-h-[90dvh] overflow-y-auto">
            <h3 className="font-black text-black text-base uppercase tracking-tight">Create New Camping Group</h3>

            <form onSubmit={handleCreateGroup} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Group Gamma, Camp Chefs, Tent 2"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-black focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                  Site / Tent Label (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Campsite #14, North Loop"
                  value={newGroupSite}
                  onChange={(e) => setNewGroupSite(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-black focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddGroupModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-black bg-white border border-black hover:bg-neutral-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newGroupName.trim() || isSubmittingGroup}
                  className="bg-[#D6B588] hover:bg-[#c9a676] text-white font-semibold text-xs px-5 py-2 border border-black transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingGroup ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
