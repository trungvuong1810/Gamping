import React, { useState } from 'react';
import { Trip, TripMember, Group, GroupMember, User } from '../types';
import { createGroup, assignGroupMember, addTripMember } from '../api/client';
import { Users, Plus, Shield, UserCheck, AlertCircle, ArrowRight, UserPlus, Info, Lock, RefreshCw, CheckCircle2, Clock, Sparkles, UserMinus } from 'lucide-react';

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

  // Host quick add friend modal state
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');
  const [newFriendEmail, setNewFriendEmail] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);

  // State feedback
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Find user's assigned group
  const myAssignment = groupMembers.find(gm => gm.userId === currentUser.id);
  const myGroup = myAssignment ? groups.find(g => g.id === myAssignment.groupId) : null;

  // Identify assigned and unassigned trip members
  const memberGroupMap = new Map<string, GroupMember>();
  groupMembers.forEach(gm => {
    memberGroupMap.set(gm.userId, gm);
  });

  const assignedUserIds = new Set(groupMembers.map(gm => gm.userId));
  const unassignedMembers = members.filter(m => !assignedUserIds.has(m.userId));

  const showFlashSuccess = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(''), 3500);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshTrip();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !isHost || isPast) return;

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
      showFlashSuccess(`Group "${newGroupName.trim()}" created successfully!`);
      onRefreshTrip();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create group');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleAssignUser = async (targetUserId: string, targetGroupId: string, userEmail: string, userName: string) => {
    if (!isHost || isPast) return;
    setErrorMsg('');
    try {
      await assignGroupMember(trip.id, {
        hostUserId: currentUser.id,
        targetUserId,
        groupId: targetGroupId === 'unassign' ? '' : targetGroupId,
        userEmail,
        userName
      });
      
      const grp = groups.find(g => g.id === targetGroupId);
      if (grp) {
        showFlashSuccess(`Assigned ${userName} to ${grp.name}.`);
      } else {
        showFlashSuccess(`${userName} unassigned from group.`);
      }
      onRefreshTrip();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to assign camper to group.');
    }
  };

  const handleAddFriendDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendName.trim() || !isHost || isPast) return;

    setIsAddingFriend(true);
    setErrorMsg('');
    try {
      await addTripMember(trip.id, {
        hostUserId: currentUser.id,
        name: newFriendName.trim(),
        email: newFriendEmail.trim() || undefined
      });
      showFlashSuccess(`Added ${newFriendName.trim()} to trip members! They can now be assigned to a group.`);
      setNewFriendName('');
      setNewFriendEmail('');
      setShowAddFriend(false);
      onRefreshTrip();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add friend to trip.');
    } finally {
      setIsAddingFriend(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Role and Permissions Authority Banner */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border ${
        isHost
          ? 'border-neutral-900/20 bg-neutral-950 text-white'
          : 'border-neutral-200 bg-white text-neutral-900'
      } shadow-xs`}>
        <div className="flex items-start sm:items-center gap-3.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isHost ? 'bg-white/10 text-white' : 'bg-neutral-100 text-neutral-800'
          }`}>
            {isHost ? <Shield className="w-5 h-5 text-emerald-400" /> : <Lock className="w-5 h-5 text-neutral-600" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${isHost ? 'text-white' : 'text-neutral-900'}`}>
                {isHost ? 'Host Authority Mode: Group Management' : 'Campers & Group Roster'}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                isHost ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-neutral-100 text-neutral-600'
              }`}>
                {isHost ? 'Host Only' : 'Member View (Read-Only)'}
              </span>
            </div>
            <p className={`text-xs mt-1 leading-relaxed ${isHost ? 'text-neutral-300' : 'text-neutral-500'}`}>
              {isHost
                ? 'Only you (the trip host) have permission to assign friends to groups and create campsites. Groups define who can edit equipment and food lists.'
                : `Only the trip host (${trip.hostName || 'the Host'}) can assign campers to groups. You are currently ${
                    myGroup ? `assigned to ${myGroup.name}` : 'unassigned (awaiting host placement)'
                  }.`}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            title="Refresh member roster"
            className={`px-3 py-2 text-xs font-medium rounded-xl transition flex items-center gap-1.5 ${
              isHost
                ? 'bg-white/10 text-white hover:bg-white/20 border border-white/15'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync Roster</span>
          </button>

          {isHost && !isPast && (
            <>
              <button
                onClick={() => {
                  setShowAddFriend(!showAddFriend);
                  setShowAddGroup(false);
                }}
                id="host-add-friend-btn"
                className="px-3.5 py-2 text-xs font-semibold bg-white/15 text-white hover:bg-white/25 rounded-xl transition flex items-center gap-1.5 border border-white/20"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>+ Add Friend</span>
              </button>

              <button
                onClick={() => {
                  setShowAddGroup(!showAddGroup);
                  setShowAddFriend(false);
                }}
                id="host-create-group-btn"
                className="px-3.5 py-2 text-xs font-semibold bg-white text-neutral-950 hover:bg-neutral-100 rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Group</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccessMsg && (
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{actionSuccessMsg}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Host Quick Add Friend Form */}
      {showAddFriend && isHost && (
        <div className="p-5 rounded-2xl border border-neutral-300 bg-neutral-50 shadow-xs animate-in fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-neutral-900" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                Add Friend to Trip Members
              </h4>
            </div>
            <button
              onClick={() => setShowAddFriend(false)}
              className="text-xs text-neutral-400 hover:text-neutral-700"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-neutral-500 mb-3">
            Add a friend directly by name. They will appear immediately in the unassigned list below so you can assign them to a group!
          </p>

          <form onSubmit={handleAddFriendDirect} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Friend Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Jenkins"
                  value={newFriendName}
                  onChange={(e) => setNewFriendName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. sarah@gmail.com"
                  value={newFriendEmail}
                  onChange={(e) => setNewFriendEmail(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddFriend(false)}
                className="px-3.5 py-2 text-xs text-neutral-600 hover:text-neutral-950"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAddingFriend}
                className="px-4 py-2 text-xs bg-neutral-950 text-white rounded-xl hover:bg-neutral-800 font-semibold transition"
              >
                {isAddingFriend ? 'Adding Friend...' : 'Add Friend to Roster'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* New Group Creation Form */}
      {showAddGroup && isHost && (
        <div className="p-5 rounded-2xl border border-neutral-300 bg-neutral-50 shadow-xs animate-in fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-900" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                Create New Campsite Group
              </h4>
            </div>
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
                  placeholder="e.g. Group Beta (Lakeside B)"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
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
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
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
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-neutral-950"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddGroup(false)}
                className="px-3.5 py-2 text-xs text-neutral-600 hover:text-neutral-950"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingGroup}
                className="px-4 py-2 text-xs bg-neutral-950 text-white rounded-xl hover:bg-neutral-800 font-semibold transition"
              >
                {isCreatingGroup ? 'Creating...' : 'Save Group'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* UNASSIGNED CAMPERS SECTION (When friends join, their names appear here!) */}
      {/* ========================================================================= */}
      <div className={`p-5 rounded-2xl border transition ${
        unassignedMembers.length > 0
          ? 'border-amber-200 bg-amber-50/50'
          : 'border-neutral-200 bg-neutral-50/60'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
              unassignedMembers.length > 0 ? 'bg-amber-100 text-amber-900' : 'bg-neutral-200 text-neutral-700'
            }`}>
              {unassignedMembers.length}
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-2">
                <span>Joined Friends Waiting for Group Assignment</span>
                {unassignedMembers.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-semibold animate-pulse">
                    Action Needed
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-neutral-500">
                {isHost
                  ? 'When friends join with the trip password, their names appear here. Select a group below to assign them.'
                  : 'Friends who have joined the trip and are currently waiting for the host to assign them to a campsite group.'}
              </p>
            </div>
          </div>

          <div className="text-[11px] text-neutral-400 font-mono self-start sm:self-center">
            {unassignedMembers.length} unassigned / {members.length} total camper{members.length === 1 ? '' : 's'}
          </div>
        </div>

        {unassignedMembers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            {unassignedMembers.map((m) => (
              <div
                key={m.id}
                id={`unassigned-camper-${m.id}`}
                className="p-3.5 rounded-xl border border-neutral-200 bg-white shadow-xs flex flex-col justify-between gap-3"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-neutral-950 text-xs truncate">
                        {m.name}
                      </span>
                      {m.userId === currentUser.id && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-700">
                          You
                        </span>
                      )}
                      {m.userId === trip.hostId && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                          Host
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                      {m.email || 'Joined via Trip Password'}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-700 font-medium">
                      <Clock className="w-3 h-3" />
                      <span>Unassigned</span>
                    </div>
                  </div>
                </div>

                {/* Host Assignment Controls */}
                {isHost && !isPast ? (
                  <div className="pt-2.5 border-t border-neutral-100 space-y-1.5">
                    <div className="text-[10px] uppercase font-semibold text-neutral-500 tracking-wider">
                      Assign to Group:
                    </div>
                    {groups.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {groups.map((g) => (
                          <button
                            key={g.id}
                            onClick={() => handleAssignUser(m.userId, g.id, m.email, m.name)}
                            id={`btn-assign-${m.id}-to-${g.id}`}
                            className="px-2.5 py-1 text-[11px] font-medium bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition flex items-center gap-1 shrink-0"
                          >
                            <span>+ {g.name}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-neutral-500 flex items-center gap-2">
                        <span>No groups exist yet.</span>
                        <button
                          onClick={() => setShowAddGroup(true)}
                          className="font-semibold text-neutral-900 underline"
                        >
                          Create one now
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pt-2.5 border-t border-neutral-100 flex items-center gap-1.5 text-[11px] text-neutral-500">
                    <Lock className="w-3 h-3 text-neutral-400" />
                    <span>Only Host ({trip.hostName}) can assign</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-5 text-center text-xs text-neutral-500 bg-white/70 rounded-xl border border-dashed border-neutral-200 mt-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1.5" />
            <p className="font-medium text-neutral-800">All joined friends are currently assigned to groups!</p>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              When a new friend enters the trip password and joins, their name will appear here.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* GROUPS GRID & ASSIGNED CAMPERS */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-neutral-950">
              Campsite Groups ({groups.length})
            </h3>
            <p className="text-xs text-neutral-500">
              Members of each group have exclusive write permissions for their group equipment and food lists.
            </p>
          </div>
          {isHost && !isPast && (
            <button
              onClick={() => setShowAddGroup(true)}
              className="text-xs font-semibold text-neutral-900 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Group</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group) => {
            const membersInGroup = groupMembers.filter(gm => gm.groupId === group.id);
            const isMyGroup = myGroup?.id === group.id;

            return (
              <div
                key={group.id}
                id={`group-card-${group.id}`}
                className={`p-5 rounded-2xl border transition ${
                  isMyGroup
                    ? 'border-neutral-950 bg-white ring-1 ring-neutral-950 shadow-xs'
                    : 'border-neutral-200 bg-white shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-neutral-950 text-sm">{group.name}</h4>
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
                      <div className="text-xs text-neutral-500 mt-1 leading-relaxed">
                        {group.description}
                      </div>
                    )}
                  </div>

                  <span className="text-xs font-mono px-2 py-1 rounded-md bg-neutral-100 text-neutral-700 font-semibold shrink-0">
                    {membersInGroup.length} camper{membersInGroup.length === 1 ? '' : 's'}
                  </span>
                </div>

                {/* Campers in Group Roster */}
                <div className="space-y-1.5 pt-2.5 border-t border-neutral-100 mb-3">
                  <div className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider mb-1.5">
                    Assigned Campers:
                  </div>

                  {membersInGroup.length > 0 ? (
                    membersInGroup.map((gm) => (
                      <div
                        key={gm.id}
                        className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-neutral-50 border border-transparent hover:border-neutral-200 transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {gm.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-neutral-900 truncate">{gm.name}</span>
                          {gm.userId === trip.hostId && (
                            <span className="text-[9px] text-neutral-500 font-mono px-1 py-0.2 rounded bg-neutral-100 shrink-0">Host</span>
                          )}
                          {gm.userId === currentUser.id && (
                            <span className="text-[9px] text-neutral-600 font-semibold px-1 py-0.2 rounded bg-neutral-200 shrink-0">You</span>
                          )}
                        </div>

                        {/* Host controls: Move to another group or unassign */}
                        {isHost && !isPast ? (
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <select
                              value={group.id}
                              onChange={(e) => {
                                handleAssignUser(gm.userId, e.target.value, gm.email, gm.name);
                              }}
                              aria-label={`Move ${gm.name} to another group`}
                              className="text-[11px] text-neutral-600 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-md px-2 py-0.5 cursor-pointer focus:outline-none"
                            >
                              <option value={group.id}>In {group.name}</option>
                              {groups.filter(g => g.id !== group.id).map(g => (
                                <option key={g.id} value={g.id}>Move to {g.name}</option>
                              ))}
                              <option value="unassign">Unassign to Pool</option>
                            </select>
                          </div>
                        ) : (
                          <span className="text-[10px] text-neutral-400 font-mono">
                            Assigned
                          </span>
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
                <div className="pt-2.5 border-t border-neutral-100 text-[11px] text-neutral-500 flex items-center justify-between">
                  <span>Group gear & meal check</span>
                  <span className={`font-medium ${isMyGroup ? 'text-neutral-950 font-semibold' : 'text-neutral-400'}`}>
                    {isMyGroup ? '✓ You can edit' : 'Read-only'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COMPLETE TRIP ROSTER (All friends who joined this trip) */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-2xl border border-neutral-200 bg-white shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-neutral-800" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Complete Trip Roster ({members.length} Camper{members.length === 1 ? '' : 's'})
            </h3>
          </div>
          <span className="text-[11px] text-neutral-400">
            {isHost ? 'Host controls enabled' : 'Read-only view'}
          </span>
        </div>

        <div className="divide-y divide-neutral-100">
          {members.map((m) => {
            const memberGroup = memberGroupMap.get(m.userId);
            const groupObj = memberGroup ? groups.find(g => g.id === memberGroup.groupId) : null;
            const isMemberHost = m.userId === trip.hostId;
            const isMe = m.userId === currentUser.id;

            return (
              <div
                key={m.id}
                className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-800 flex items-center justify-center font-bold text-[11px] shrink-0">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-950">{m.name}</span>
                      {isMemberHost && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-950 text-white font-medium">
                          Host
                        </span>
                      )}
                      {isMe && (
                        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-neutral-200 text-neutral-800">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      {m.email || 'Joined via password'} • Joined {new Date(m.joinedAt || Date.now()).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  {groupObj ? (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {groupObj.name}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Unassigned
                    </span>
                  )}

                  {/* Host assignment selector */}
                  {isHost && !isPast && (
                    <select
                      value={groupObj ? groupObj.id : ''}
                      onChange={(e) => {
                        handleAssignUser(m.userId, e.target.value, m.email, m.name);
                      }}
                      className="text-[11px] px-2 py-1 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-800 focus:outline-none cursor-pointer"
                    >
                      <option value="" disabled>Change Group...</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                      {groupObj && <option value="unassign">Unassign</option>}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
