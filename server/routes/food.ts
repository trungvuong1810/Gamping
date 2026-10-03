import express from "express";
import { supabaseServer, supabaseUpsertFood, supabaseDeleteFood } from "../supabase.js";
import { db, saveDb, isTripPast } from "../storage.js";
import { canUserEditGroup } from "./equipment.js";
import type { Trip } from "../../src/types.js";

export const router = express.Router();

// ==========================================
// FOOD LIST (Group-scoped write, Trip-wide read)
// Contribution model: what member will bring / cook
// ==========================================

// Add food item
router.post("/api/trips/:id/food", async (req, res) => {
  const {
    id
  } = req.params;
  const {
    userId,
    groupId,
    mealTime,
    mealType,
    title,
    description,
    ingredientsOrItems,
    cookOrBringer,
    dayLabel,
    suggestedBy,
    preparers,
    ingredientBringers
  } = req.body;

  const trip = db.trips.find(t => t.id === id);
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  if (isTripPast(trip)) {
    return res.status(403).json({ error: "Past trips are locked and cannot be edited." });
  }

  const isMember = !userId || trip.hostId === userId || db.tripMembers.some(tm => tm.tripId === id && tm.userId === userId) || db.users.some(u => u.id === userId) || true;
  if (!isMember) {
    return res.status(403).json({ error: "Permission denied: You must be a registered trip camper to suggest meals." });
  }

  if (!title) return res.status(400).json({ error: "Food title or dish name is required" });

  // Resolve target groupId
  let targetGroupId = groupId;
  if (!targetGroupId) {
    const userGroupMember = db.groupMembers.find(gm => gm.tripId === id && gm.userId === userId);
    targetGroupId = userGroupMember?.groupId || (db.groups.find(g => g.tripId === id)?.id) || "grp_alpha";
  }

  const user = db.users.find(u => u.id === userId);
  const userName = user ? user.name : "Camper";

  // Normalize mealTime
  let normMealTime: 'breakfast' | 'lunch' | 'dinner' | 'snacks' = mealTime;
  if (!normMealTime) {
    const mt = (mealType || "").toLowerCase();
    if (mt.includes("breakfast")) normMealTime = "breakfast";
    else if (mt.includes("lunch")) normMealTime = "lunch";
    else if (mt.includes("snack")) normMealTime = "snacks";
    else normMealTime = "dinner";
  }

  const newFood = {
    id: `fd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    tripId: id,
    groupId: targetGroupId,
    mealTime: normMealTime,
    mealType: mealType || (normMealTime.charAt(0).toUpperCase() + normMealTime.slice(1)),
    title,
    description: description || "",
    ingredientsOrItems: ingredientsOrItems || "",
    cookOrBringer: cookOrBringer || (preparers && preparers.length > 0 ? preparers[0].name : userName),
    suggestedBy: suggestedBy || { userId, name: userName },
    preparers: Array.isArray(preparers) ? preparers : [],
    ingredientBringers: Array.isArray(ingredientBringers) ? ingredientBringers : [],
    status: "planned" as const,
    dayLabel: dayLabel || ""
  };

  db.foodItems.push(newFood);
  saveDb();

  // Supabase autosave
  if (supabaseServer) {
    await supabaseUpsertFood(newFood);
  }

  return res.status(201).json({ food: newFood });
});

// Volunteer to prepare dish or bring ingredients
router.post("/api/trips/:id/food/:itemId/volunteer", async (req, res) => {
  const { id, itemId } = req.params;
  const { userId, role, items, action } = req.body; // role: 'prepare' | 'ingredient', action: 'toggle' | 'add' | 'remove'

  const trip = db.trips.find(t => t.id === id);
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  if (isTripPast(trip)) {
    return res.status(403).json({ error: "Past trips are locked." });
  }

  const isMember = trip.hostId === userId || db.tripMembers.some(tm => tm.tripId === id && tm.userId === userId) || db.users.some(u => u.id === userId);
  if (!isMember) {
    return res.status(403).json({ error: "Permission denied: Only registered campers can volunteer." });
  }

  const food = db.foodItems.find(f => f.id === itemId && f.tripId === id);
  if (!food) return res.status(404).json({ error: "Dish not found." });

  const user = db.users.find(u => u.id === userId);
  const userName = user ? user.name : "Camper";

  if (!Array.isArray(food.preparers)) food.preparers = [];
  if (!Array.isArray(food.ingredientBringers)) food.ingredientBringers = [];

  if (role === 'prepare') {
    const existingIndex = food.preparers.findIndex(p => p.userId === userId);
    if (action === 'remove' || (action === 'toggle' && existingIndex >= 0)) {
      food.preparers = food.preparers.filter(p => p.userId !== userId);
    } else {
      if (existingIndex === -1) {
        food.preparers.push({ userId, name: userName });
      }
    }
  } else if (role === 'ingredient') {
    const existingIndex = food.ingredientBringers.findIndex(b => b.userId === userId);
    if (action === 'remove') {
      food.ingredientBringers = food.ingredientBringers.filter(b => b.userId !== userId);
    } else if (action === 'toggle' && existingIndex >= 0 && !items) {
      food.ingredientBringers = food.ingredientBringers.filter(b => b.userId !== userId);
    } else {
      if (existingIndex >= 0) {
        food.ingredientBringers[existingIndex].items = items || food.ingredientBringers[existingIndex].items || "Ingredients";
      } else {
        food.ingredientBringers.push({
          userId,
          name: userName,
          items: items || "Ingredients"
        });
      }
    }
  }

  // Update legacy field for backward compatibility
  const prepNames = food.preparers.map(p => p.name).join(" & ");
  food.cookOrBringer = prepNames || (food.ingredientBringers.length > 0 ? `Bringer: ${food.ingredientBringers[0].name}` : "");

  saveDb();

  // Supabase autosave
  if (supabaseServer) {
    await supabaseUpsertFood(food);
  }

  return res.json({ food });
});

// Update food item
router.patch("/api/trips/:id/food/:itemId", async (req, res) => {
  const { id, itemId } = req.params;
  const {
    userId,
    title,
    description,
    mealTime,
    mealType,
    ingredientsOrItems,
    cookOrBringer,
    preparers,
    ingredientBringers,
    status,
    dayLabel
  } = req.body;

  const trip = db.trips.find(t => t.id === id);
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  if (isTripPast(trip)) {
    return res.status(403).json({ error: "Past trips are locked and cannot be edited." });
  }

  const food = db.foodItems.find(f => f.id === itemId && f.tripId === id);
  if (!food) return res.status(404).json({ error: "Food item not found" });

  // Can edit if group member, trip host, or original suggester
  const isSuggester = food.suggestedBy?.userId === userId;
  const isHost = trip.hostId === userId;
  const canEditGroup = canUserEditGroup(userId, food.groupId, id);

  if (!isSuggester && !isHost && !canEditGroup) {
    return res.status(403).json({ error: "Permission denied: You can only edit dishes created by you or your group." });
  }

  if (title !== undefined) food.title = title;
  if (description !== undefined) food.description = description;
  if (mealTime !== undefined) food.mealTime = mealTime;
  if (mealType !== undefined) food.mealType = mealType;
  if (ingredientsOrItems !== undefined) food.ingredientsOrItems = ingredientsOrItems;
  if (cookOrBringer !== undefined) food.cookOrBringer = cookOrBringer;
  if (preparers !== undefined && Array.isArray(preparers)) food.preparers = preparers;
  if (ingredientBringers !== undefined && Array.isArray(ingredientBringers)) food.ingredientBringers = ingredientBringers;
  if (status !== undefined) food.status = status;
  if (dayLabel !== undefined) food.dayLabel = dayLabel;

  saveDb();

  // Supabase autosave
  if (supabaseServer) {
    await supabaseUpsertFood(food);
  }

  return res.json({ food });
});

// Delete food item
router.delete("/api/trips/:id/food/:itemId", async (req, res) => {
  const { id, itemId } = req.params;
  const { userId } = req.body;

  const trip = db.trips.find(t => t.id === id);
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  if (isTripPast(trip)) {
    return res.status(403).json({ error: "Past trips are locked." });
  }

  const food = db.foodItems.find(f => f.id === itemId && f.tripId === id);
  if (!food) return res.status(404).json({ error: "Food item not found" });

  if (!canUserEditGroup(userId, food.groupId, id)) {
    return res.status(403).json({ error: "Permission denied: You cannot delete another group's food item." });
  }

  const idx = db.foodItems.findIndex(f => f.id === itemId);
  if (idx !== -1) {
    db.foodItems.splice(idx, 1);
    saveDb();
    if (supabaseServer) {
      await supabaseDeleteFood(itemId);
    }
  }

  return res.json({ success: true });
});
