import React, { useState } from 'react';
import { Trip, TripMember, Group, GroupMember, User } from '../types';
import { createGroup, assignGroupMember } from '../api/client';
import { Users, Plus, Shield, UserCheck, AlertCircle, ArrowRight, UserPlus, Info } from 'lucide-react';

interface GroupAssignViewProps {
  trip: Trip;
  currentUser: User;
  members: TripMember[];
  groups: Group[];
  groupMembers: GroupMember[];
  isPast: boolean;
  onRefreshTrip: () => void;
}

export const GroupAssignView: React.FC<GroupAssignViewProps> = ({
  trip,
  currentUser,
  members,
  groups,
  groupMembers,
  isPast,
  onRefreshTrip
}) => {
  const isHost = trip.hostId === currentUser.id;

  // New group creation modal state
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newSiteLabel, setNewSiteLabel] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Find user's assigned group
  const myAssignment = groupMembers.find(gm => gm.userId === currentUser.id);
  const myGroup = myAssignment ? groups.find(g => g.id === myAssignment.groupId) : null;

  // Identify unassigned trip members
  const assignedUserIds = new Set(groupMembers.map(gm => gm.userId));
  const unassignedMembers = members.filter(m => !assignedUserIds.has(m.userId));

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setIsCreatingGroup(true);
    setErrorMsg('');
    try {
      await createGroup(trip.id, {
        userId: currentUser.id,
        name: newGroupName.trim(),
        siteLabel: newSiteLabel.trim(),
        description: newGroupDesc.trim()
      });
      setNewGroupName('');
      setNewSiteLabel('');
      setNewGroupDesc('');
      setShowAddGroup(false);
      onRefreshTrip();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create group');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleAssignUser = async (targetUserId: string, targetGroupId: string, userEmail: string, userName: string) => {
    if (!isHost || isPast) return;
    try {
      await assignGroupMember(trip.id, {
        hostUserId: currentUser.id,
        targetUserId,
        groupId: targetGroupId,
        userEmail,
        userName
      });
      onRefreshTrip();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to assign camper');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Role and Permissions Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-neutral-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800 shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-neutral-900">
              {isHost ? 'Host Authority: Group Assignment' : 'Group Boundaries & Permissions'}
            </div>
            <div className="text-[11px] text-neutral-500">
              {isHost
                ? 'Only the host assigns campers to groups. Groups define write access for equipment and food lists.'
                : `You are currently assigned to: ${myGroup ? myGroup.name : 'Unassigned (Awaiting Host)'}.`}
            </div>
          </div>
        </div>

        {isHost && !isPast && (
          <button
            onClick={() => setShowAddGroup(true)}
            className="px-3 py-1.5 text-xs font-medium bg-neutral-950 text-white rounded-lg hover:bg-neutral-800 transition flex items-center gap-1.5 self-start sm:self-center shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Group</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* New Group Modal / Inline Form */}
      {showAddGroup && isHost && (
        <div className="p-5 rounded-xl border border-neutral-300 bg-neutral-50/70 shadow-sm animate-in fade-in">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-900">
              New Group Configuration
            </h4>
            <button
              onClick={() => setShowAddGroup(false)}
              className="text-xs text-neutral-400 hover:text-neutral-700"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateGroup} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Group Gamma (Lakeside B)"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Site / Tent Identifier
                </label>
                <input
                  type="text"
                  placeholder="e.g. Campsite 16 / Tent 2"
                  value={newSiteLabel}
                  onChange={(e) => setNewSiteLabel(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                Description / Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Tent campers, early risers, shared cooler"
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddGroup(false)}
                className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-950"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingGroup}
                className="px-4 py-1.5 text-xs bg-neutral-950 text-white rounded-lg hover:bg-neutral-800 font-medium"
              >
                {isCreatingGroup ? 'Creating...' : 'Save Group'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Unassigned Campers Dock (If Host) */}
      {unassignedMembers.length > 0 && (
        <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-700 flex items-center gap-2">
              <span>Unassigned Campers</span>
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-neutral-200 text-neutral-800">
                {unassignedMembers.length}
              </span>
            </span>
            <span className="text-[11px] text-neutral-400">
              {isHost ? 'Assign each camper to a group below' : 'Awaiting host group placement'}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {unassignedMembers.map((m) => (
              <div
                key={m.id}
                className="p-2.5 rounded-lg border border-neutral-200 bg-white flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-semibold text-neutral-900">{m.name}</div>
                  <div className="text-[10px] text-neutral-400">{m.email}</div>
                </div>

                {isHost && !isPast && groups.length > 0 && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAssignUser(m.userId, e.target.value, m.email, m.name);
                      }
                    }}
                    defaultValue=""
                    className="text-[11px] px-2 py-1 rounded border border-neutral-200 bg-neutral-50 text-neutral-800 focus:outline-none"
                  >
                    <option value="" disabled>Assign to...</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map((group) => {
          const membersInGroup = groupMembers.filter(gm => gm.groupId === group.id);
          const isMyGroup = myGroup?.id === group.id;

          return (
            <div
              key={group.id}
              className={`p-5 rounded-xl border transition ${
                isMyGroup
                  ? 'border-neutral-950 bg-white ring-1 ring-neutral-950'
                  : 'border-neutral-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-neutral-950 text-sm">{group.name}</h3>
                    {isMyGroup && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-950 text-white font-medium">
                        Your Group
                      </span>
                    )}
                  </div>
                  {group.siteLabel && (
                    <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                      {group.siteLabel}
                    </div>
                  )}
                  {group.description && (
                    <div className="text-xs text-neutral-500 mt-1">
                      {group.description}
                    </div>
                  )}
                </div>

                <span className="text-xs font-mono text-neutral-400">
                  {membersInGroup.length} camper{membersInGroup.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Members in Group Roster */}
              <div className="space-y-1.5 pt-2 border-t border-neutral-100 mb-3">
                {membersInGroup.length > 0 ? (
                  membersInGroup.map((gm) => (
                    <div
                      key={gm.id}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-neutral-50"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center text-[10px] font-medium">
                          {gm.name.charAt(0)}
                        </div>
                        <span className="font-medium text-neutral-800">{gm.name}</span>
                        {gm.userId === trip.hostId && (
                          <span className="text-[10px] text-neutral-400 font-mono">(Host)</span>
                        )}
                        {gm.userId === currentUser.id && (
                          <span className="text-[10px] text-neutral-500 font-medium">(You)</span>
                        )}
                      </div>

                      {/* Host can move camper to another group */}
                      {isHost && !isPast && (
                        <select
                          value={group.id}
                          onChange={(e) => {
                            handleAssignUser(gm.userId, e.target.value, gm.email, gm.name);
                          }}
                          className="text-[10px] text-neutral-500 bg-transparent hover:bg-neutral-100 border-none rounded px-1 cursor-pointer"
                        >
                          <option value={group.id}>Move...</option>
                          {groups.filter(g => g.id !== group.id).map(g => (
                            <option key={g.id} value={g.id}>To {g.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-neutral-400 italic py-2">
                    No campers assigned to this group yet.
                  </div>
                )}
              </div>

              {/* Group scope capability explanation */}
              <div className="pt-2 border-t border-neutral-100 text-[11px] text-neutral-400 flex items-center justify-between">
                <span>Owns equipment & food lists</span>
                <span className="text-neutral-500">
                  {isMyGroup ? '✓ You can edit' : 'Read-only to others'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
