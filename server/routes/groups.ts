import express from "express";
import { supabaseServer, supabaseUpsertTripMember, supabaseUpsertGroup, supabaseUpsertGroupMember, supabaseDeleteGroupMember, supabaseDeleteTripMember } from "../supabase.js";
import { db, saveDb, isTripPast } from "../storage.js";
import type { Trip, Group, GroupMember } from "../../src/types.js";

export const router = express.Router();

// ==========================================
// GROUP ASSIGN (Host-only write)
// ==========================================

// Remove a camper from the trip (the host can't be removed)
router.delete("/api/trips/:id/members/:memberId", async (req, res) => {
  const { id, memberId } = req.params;
  const trip = db.trips.find(t => t.id === id);
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  const member = db.tripMembers.find(tm => tm.id === memberId && tm.tripId === id);
  if (!member) return res.status(404).json({ error: "Camper not found" });
  if (member.role === "host" || member.userId === trip.hostId) {
    return res.status(403).json({ error: "The trip host can't be removed." });
  }

  db.tripMembers = db.tripMembers.filter(tm => tm.id !== memberId);
  // Only drop group membership if no other trip-member entry shares this user
  if (!db.tripMembers.some(tm => tm.tripId === id && tm.userId === member.userId)) {
    db.groupMembers = db.groupMembers.filter(gm => !(gm.tripId === id && gm.userId === member.userId));
    if (supabaseServer) await supabaseDeleteGroupMember(id, member.userId);
  }
  saveDb();
  if (supabaseServer) await supabaseDeleteTripMember(memberId);

  return res.json({ success: true, removedMemberId: memberId });
});

// Add a member/friend directly to trip
router.post("/api/trips/:id/members", async (req, res) => {
  const { id } = req.params;
  const { hostUserId, name, email, groupId, role } = req.body;

  const trip = db.trips.find(t => t.id === id);
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  if (hostUserId && trip.hostId !== hostUserId) {
    return res.status(403).json({ error: "Permission denied: Only the trip host can add members directly." });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Friend's name is required." });
  }

  const cleanName = name.trim();
  const cleanEmail = (email || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@camp.local`).toLowerCase().trim();

  // Same camper already on this trip? (match by email, or by name when no real email was given)
  const sameName = (n?: string) => (n || "").trim().toLowerCase() === cleanName.toLowerCase();
  const existingMember = db.tripMembers.find(tm =>
    tm.tripId === id && ((email && tm.email && tm.email.toLowerCase() === cleanEmail) || sameName(tm.name))
  );

  // Find or create user
  let user = existingMember
    ? (db.users.find(u => u.id === existingMember.userId) || { id: existingMember.userId, name: existingMember.name, email: existingMember.email })
    : db.users.find(u => (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail) || (u.name && u.name.toLowerCase() === cleanName.toLowerCase()));
  if (existingMember && !db.users.some(u => u.id === user!.id)) db.users.push(user);
  if (!user) {
    user = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
      email: cleanEmail
    };
    db.users.push(user);
  }

  // Check if member already in trip
  let member = existingMember || db.tripMembers.find(tm => tm.tripId === id && (tm.userId === user!.id || (cleanEmail && tm.email.toLowerCase() === cleanEmail)));
  if (!member) {
    member = {
      id: `tm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tripId: id,
      userId: user.id,
      email: user.email,
      name: user.name,
      role: role || "member",
      joinedAt: new Date().toISOString()
    };
    db.tripMembers.push(member);
  } else if (!sameName(member.name)) {
    member.name = cleanName;
  }

  // Assign to group if groupId is provided
  if (groupId) {
    const existingGm = db.groupMembers.find(gm => gm.tripId === id && gm.userId === user.id);
    if (existingGm) {
      existingGm.groupId = groupId;
    } else {
      const newGm: GroupMember = {
        id: `gm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        groupId,
        tripId: id,
        userId: user.id,
        email: user.email,
        name: user.name
      };
      db.groupMembers.push(newGm);
    }
  }

  saveDb();

  // Supabase autosave
  if (supabaseServer) {
    await supabaseUpsertTripMember(member);
  }

  return res.status(201).json({
    success: true,
    member,
    members: db.tripMembers.filter(tm => tm.tripId === id)
  });
});

// Create group in trip
router.post("/api/trips/:id/groups", async (req, res) => {
  const { id } = req.params;
  const { userId, name, siteLabel, description } = req.body;

  const trip = db.trips.find(t => t.id === id);
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  if (userId && trip.hostId !== userId && !db.tripMembers.some(tm => tm.tripId === id && tm.userId === userId)) {
    return res.status(403).json({ error: "Permission denied to create groups." });
  }

  if (!name) return res.status(400).json({ error: "Group name is required." });

  const newGroup = {
    id: `grp_${Date.now()}`,
    tripId: id,
    name,
    siteLabel: siteLabel || "",
    description: description || "",
    createdAt: new Date().toISOString()
  };

  db.groups.push(newGroup);
  saveDb();

  // Supabase autosave
  if (supabaseServer) {
    await supabaseUpsertGroup(newGroup);
  }

  return res.status(201).json({ group: newGroup });
});

// Assign or move a member to a group (Host only)
router.post("/api/trips/:id/assign-group", async (req, res) => {
  const { id } = req.params;
  const { hostUserId, targetUserId, groupId, userEmail, userName } = req.body;

  const trip = db.trips.find(t => t.id === id);
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  if (isTripPast(trip)) {
    return res.status(403).json({ error: "Past trips are locked." });
  }

  if (trip.hostId !== hostUserId) {
    return res.status(403).json({ error: "Permission denied: Only the host can assign groups." });
  }

  // Remove existing assignment for this user in this trip
  const existingIndex = db.groupMembers.findIndex(gm => gm.tripId === id && gm.userId === targetUserId);
  if (existingIndex !== -1) {
    db.groupMembers.splice(existingIndex, 1);
  }

  let assignment: any = null;
  // Add to new group if valid groupId is provided
  if (groupId && groupId !== "unassign" && groupId !== "none") {
    // Verify group exists in this trip
    const validGroup = db.groups.find(g => g.id === groupId && g.tripId === id);
    if (!validGroup) {
      return res.status(400).json({ error: "Target group does not exist in this trip." });
    }

    assignment = {
      id: `gm_${Date.now()}`,
      groupId,
      tripId: id,
      userId: targetUserId,
      email: userEmail || "",
      name: userName || "Camper"
    };
    db.groupMembers.push(assignment);
  }

  saveDb();

  // Supabase autosave
  if (supabaseServer) {
    await supabaseDeleteGroupMember(id, targetUserId);
    if (assignment) {
      await supabaseUpsertGroupMember(assignment);
    }
  }

  return res.json({
    success: true,
    groupMembers: db.groupMembers.filter(gm => gm.tripId === id),
    members: db.tripMembers.filter(tm => tm.tripId === id)
  });
});
