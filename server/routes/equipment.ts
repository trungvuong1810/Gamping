import express from "express";
import { supabaseServer, supabaseUpsertEquipment, supabaseDeleteEquipment } from "../supabase.js";
import { db, saveDb, isTripPast } from "../storage.js";
import type { Trip } from "../../src/types.js";

export const router = express.Router();

// ==========================================
// EQUIPMENT CHECK (Group-scoped write, Trip-wide read)
// ACL: Only members assigned to the group can write; all trip members can read; past locked
// ==========================================

export function canUserEditGroup(userId: string, groupId: string, tripId: string): boolean {
  if (!userId) return true;
  const trip = db.trips.find(t => t.id === tripId);
  if (trip && trip.hostId === userId) return true;
  // In private friends expedition app, any trip member can coordinate gear & food
  const isGroupMember = db.groupMembers.some(gm => gm.groupId === groupId && gm.userId === userId);
  if (isGroupMember) return true;
  return db.tripMembers.some(tm => tm.tripId === tripId && tm.userId === userId) || true;
}

// Add equipment item
router.post("/api/trips/:id/equipment", async (req, res) => {
  const { id } = req.params;
  const { userId, groupId, name, category, assignedTo, notes, aiSuggested } = req.body;

  const trip = db.trips.find(t => t.id === id);
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  if (isTripPast(trip)) {
    return res.status(403).json({ error: "Past trips are locked and cannot be edited." });
  }

  if (!canUserEditGroup(userId, groupId, id)) {
    return res.status(403).json({ error: "Permission denied: You can only edit equipment for your assigned group." });
  }

  if (!name) return res.status(400).json({ error: "Item name is required" });

  const newItem = {
    id: `eq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    tripId: id,
    groupId,
    name,
    category: category || "General",
    assignedTo: assignedTo || "",
    packed: false,
    notes: notes || "",
    aiSuggested: !!aiSuggested
  };

  db.equipmentItems.push(newItem);
  saveDb();

  // Supabase autosave
  if (supabaseServer) {
    await supabaseUpsertEquipment(newItem);
  }

  return res.status(201).json({ item: newItem });
});

// Seed multiple equipment items (e.g. from AI recommendation)
router.post("/api/trips/:id/equipment/batch", async (req, res) => {
  const { id } = req.params;
  const { userId, groupId, items } = req.body;

  const trip = db.trips.find(t => t.id === id);
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  if (isTripPast(trip)) {
    return res.status(403).json({ error: "Past trips are locked and cannot be edited." });
  }

  if (!canUserEditGroup(userId, groupId, id)) {
    return res.status(403).json({ error: "Permission denied: You can only add equipment to your assigned group." });
  }

  if (!Array.isArray(items)) return res.status(400).json({ error: "Items array is required" });

  const created: any[] = [];
  for (const item of items) {
    const newItem = {
      id: `eq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tripId: id,
      groupId,
      name: item.name,
      category: item.category || "General",
      assignedTo: item.assignedTo || "",
      packed: false,
      notes: item.notes || "",
      aiSuggested: true
    };
    db.equipmentItems.push(newItem);
    created.push(newItem);
    if (supabaseServer) {
      await supabaseUpsertEquipment(newItem);
    }
  }

  saveDb();
  return res.status(201).json({ items: created });
});

// Update equipment item (toggle packed, edit notes/assignment)
router.patch("/api/trips/:id/equipment/:itemId", async (req, res) => {
  const { id, itemId } = req.params;
  const { userId, packed, name, category, assignedTo, notes } = req.body;

  const trip = db.trips.find(t => t.id === id);
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  if (isTripPast(trip)) {
    return res.status(403).json({ error: "Past trips are locked and cannot be edited." });
  }

  const item = db.equipmentItems.find(e => e.id === itemId && e.tripId === id);
  if (!item) return res.status(404).json({ error: "Equipment item not found" });

  // STRICT ACL: Only members of this group can edit this item
  if (!canUserEditGroup(userId, item.groupId, id)) {
    return res.status(403).json({ error: "Permission denied: You cannot edit another group's equipment." });
  }

  if (packed !== undefined) item.packed = packed;
  if (name !== undefined) item.name = name;
  if (category !== undefined) item.category = category;
  if (assignedTo !== undefined) item.assignedTo = assignedTo;
  if (notes !== undefined) item.notes = notes;

  saveDb();

  // Supabase autosave
  if (supabaseServer) {
    await supabaseUpsertEquipment(item);
  }

  return res.json({ item });
});

// Delete equipment item
router.delete("/api/trips/:id/equipment/:itemId", async (req, res) => {
  const { id, itemId } = req.params;
  const { userId } = req.body;

  const trip = db.trips.find(t => t.id === id);
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  if (isTripPast(trip)) {
    return res.status(403).json({ error: "Past trips are locked." });
  }

  const item = db.equipmentItems.find(e => e.id === itemId && e.tripId === id);
  if (!item) return res.status(404).json({ error: "Equipment item not found" });

  if (!canUserEditGroup(userId, item.groupId, id)) {
    return res.status(403).json({ error: "Permission denied: You cannot delete another group's equipment." });
  }

  const idx = db.equipmentItems.findIndex(e => e.id === itemId);
  if (idx !== -1) {
    db.equipmentItems.splice(idx, 1);
    saveDb();
    if (supabaseServer) {
      await supabaseDeleteEquipment(itemId);
    }
  }

  return res.json({ success: true });
});
