import { createClient } from "@supabase/supabase-js";
import "./config.js";
import { db, saveDb, cookToPreparers } from "./storage.js";
import type { Trip, TripMember, Group, GroupMember, EquipmentItem, FoodItem, TripInvitation } from "../src/types.js";

// Initialize Supabase Server client if credentials provided
export const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
export const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
export let supabaseServer: any = null;

if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabaseServer = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    });
    console.log("Supabase backend client connected successfully");
  } catch (err) {
    console.warn("Could not connect to Supabase server client:", err);
  }
}

// ==========================================
// SUPABASE REAL-TIME PERSISTENCE & AUTOSAVE ENGINE
// ==========================================

export function tripToRow(trip: any) {
  return {
    id: trip.id,
    title: trip.title,
    host_id: trip.hostId,
    host_email: trip.hostEmail,
    host_name: trip.hostName,
    start_date: trip.startDate,
    end_date: trip.endDate,
    location: trip.location,
    park_details: trip.parkDetails || null,
    password: trip.password || "",
    password_expires_at: trip.passwordExpiresAt || null,
    created_at: trip.createdAt || new Date().toISOString()
  };
}

export function rowToTrip(row: any): Trip {
  return {
    id: row.id,
    title: row.title,
    hostId: row.host_id,
    hostEmail: row.host_email,
    hostName: row.host_name,
    startDate: row.start_date,
    endDate: row.end_date,
    location: row.location,
    parkDetails: row.park_details || null,
    password: row.password || "",
    passwordExpiresAt: row.password_expires_at || "",
    createdAt: row.created_at || new Date().toISOString()
  };
}

export function memberToRow(m: any) {
  return {
    id: m.id,
    trip_id: m.tripId,
    user_id: m.userId,
    email: m.email,
    name: m.name,
    role: m.role || 'member',
    joined_at: m.joinedAt || new Date().toISOString()
  };
}

export function rowToMember(row: any): TripMember {
  return {
    id: row.id,
    tripId: row.trip_id,
    userId: row.user_id,
    email: row.email,
    name: row.name,
    role: (row.role as 'host' | 'member') || 'member',
    joinedAt: row.joined_at || new Date().toISOString()
  };
}

export function groupToRow(g: any) {
  return {
    id: g.id,
    trip_id: g.tripId,
    name: g.name,
    site_label: g.siteLabel || null,
    description: g.description || null,
    created_at: g.createdAt || new Date().toISOString()
  };
}

export function rowToGroup(row: any): Group {
  return {
    id: row.id,
    tripId: row.trip_id,
    name: row.name,
    siteLabel: row.site_label || "",
    description: row.description || "",
    createdAt: row.created_at || new Date().toISOString()
  };
}

export function groupMemberToRow(gm: any) {
  return {
    id: gm.id,
    group_id: gm.groupId,
    trip_id: gm.tripId,
    user_id: gm.userId,
    email: gm.email || null,
    name: gm.name || null
  };
}

export function rowToGroupMember(row: any): GroupMember {
  return {
    id: row.id,
    groupId: row.group_id,
    tripId: row.trip_id,
    userId: row.user_id,
    email: row.email || "",
    name: row.name || ""
  };
}

export function equipmentToRow(e: any) {
  return {
    id: e.id,
    trip_id: e.tripId,
    group_id: e.groupId,
    user_id: e.userId || null,
    name: e.name,
    category: e.category || 'General',
    status: e.status || (e.packed ? 'packed' : 'needed'),
    assigned_to: e.assignedTo ? (typeof e.assignedTo === 'object' ? e.assignedTo : { name: e.assignedTo }) : null,
    notes: e.notes || null,
    essential: Boolean(e.essential || e.aiSuggested),
    created_at: e.createdAt || new Date().toISOString()
  };
}

export function rowToEquipment(row: any): EquipmentItem {
  return {
    id: row.id,
    tripId: row.trip_id,
    groupId: row.group_id,
    name: row.name,
    category: row.category || "General",
    packed: row.status === 'packed' || Boolean(row.packed),
    assignedTo: row.assigned_to ? (typeof row.assigned_to === 'object' ? row.assigned_to.name || JSON.stringify(row.assigned_to) : row.assigned_to) : "",
    notes: row.notes || "",
    essential: Boolean(row.essential),
    aiSuggested: Boolean(row.essential || row.ai_suggested)
  };
}

export function foodToRow(f: any) {
  return {
    id: f.id,
    trip_id: f.tripId,
    group_id: f.groupId,
    meal_time: f.mealTime || 'dinner',
    meal_type: f.mealType || null,
    title: f.title,
    description: f.description || null,
    ingredients_or_items: f.ingredientsOrItems || null,
    day_label: f.dayLabel || null,
    suggested_by: f.suggestedBy || null,
    preparers: Array.isArray(f.preparers) && f.preparers.length > 0 ? f.preparers : cookToPreparers(f.cookOrBringer),
    ingredient_bringers: Array.isArray(f.ingredientBringers) ? f.ingredientBringers : [],
    status: f.status || 'planned',
    created_at: f.createdAt || new Date().toISOString()
  };
}

export function rowToFood(row: any): FoodItem {
  return {
    id: row.id,
    tripId: row.trip_id,
    groupId: row.group_id,
    mealTime: row.meal_time || 'dinner',
    mealType: row.meal_type || (row.meal_time ? (row.meal_time.charAt(0).toUpperCase() + row.meal_time.slice(1)) : 'Dinner'),
    title: row.title,
    description: row.description || "",
    ingredientsOrItems: row.ingredients_or_items || "",
    dayLabel: row.day_label || "",
    suggestedBy: row.suggested_by || { userId: "usr_host", name: "Host" },
    cookOrBringer: Array.isArray(row.preparers) ? row.preparers.map((p: any) => p?.name).filter(Boolean).join(" & ") : "",
    preparers: Array.isArray(row.preparers) ? row.preparers : [],
    ingredientBringers: Array.isArray(row.ingredient_bringers) ? row.ingredient_bringers : [],
    status: row.status || 'planned'
  };
}

export function invitationToRow(inv: any) {
  return {
    id: inv.id,
    trip_id: inv.tripId,
    host_id: inv.hostId,
    host_name: inv.hostName,
    recipient_email: inv.recipientEmail,
    token: inv.token,
    invite_link: inv.inviteLink,
    status: inv.status || 'pending',
    created_at: inv.createdAt || new Date().toISOString()
  };
}

export function rowToInvitation(row: any): TripInvitation {
  return {
    id: row.id,
    tripId: row.trip_id,
    hostId: row.host_id,
    hostName: row.host_name,
    recipientEmail: row.recipient_email,
    token: row.token,
    inviteLink: row.invite_link,
    status: row.status || 'pending',
    createdAt: row.created_at || new Date().toISOString()
  };
}

export async function hydrateAllFromSupabase() {
  if (!supabaseServer) return;
  try {
    console.log("[Supabase Sync] Hydrating application state from Supabase PostgreSQL...");

    // 1. Fetch Users
    const { data: usersData, error: uErr } = await supabaseServer.from("app_users").select("*");
    if (!uErr && usersData && usersData.length > 0) {
      if (!db.accounts) db.accounts = [];
      if (!db.users) db.users = [];
      for (const u of usersData) {
        if (!db.accounts.some(a => a.id === u.id || (a.email && a.email.toLowerCase() === u.email.toLowerCase()))) {
          db.accounts.push({
            id: u.id,
            username: u.username,
            email: u.email,
            passwordHash: u.password_hash,
            displayName: u.display_name || u.username,
            createdAt: u.created_at
          });
        }
        if (!db.users.some(usr => usr.id === u.id || (usr.email && usr.email.toLowerCase() === u.email.toLowerCase()))) {
          db.users.push({
            id: u.id,
            name: u.display_name || u.username,
            email: u.email
          });
        }
      }
    }

    // 2. Fetch Trips
    const { data: tripsData, error: tErr } = await supabaseServer.from("trips").select("*");
    if (!tErr && tripsData && tripsData.length > 0) {
      db.trips = tripsData.map(rowToTrip);

      // 3. Fetch Trip Members
      const { data: membersData } = await supabaseServer.from("trip_members").select("*");
      if (membersData) db.tripMembers = membersData.map(rowToMember);

      // 4. Fetch Groups
      const { data: groupsData } = await supabaseServer.from("groups").select("*");
      if (groupsData) db.groups = groupsData.map(rowToGroup);

      // 5. Fetch Group Members
      const { data: gmData } = await supabaseServer.from("group_members").select("*");
      if (gmData) db.groupMembers = gmData.map(rowToGroupMember);

      // 6. Fetch Equipment
      const { data: eqData } = await supabaseServer.from("equipment_items").select("*");
      if (eqData) db.equipmentItems = eqData.map(rowToEquipment);

      // 7. Fetch Food
      const { data: fdData } = await supabaseServer.from("food_items").select("*");
      if (fdData) db.foodItems = fdData.map(rowToFood);

      // 8. Fetch Invitations
      const { data: invData } = await supabaseServer.from("trip_invitations").select("*");
      if (invData) db.invitations = invData.map(rowToInvitation);

      console.log(`[Supabase Sync] Hydrated ${db.trips.length} trips, ${db.tripMembers.length} members, ${db.groups.length} groups, ${db.equipmentItems.length} equipment, ${db.foodItems.length} meals from Supabase.`);
      saveDb();
    } else if (db.trips && db.trips.length > 0) {
      // Supabase is empty, seed initial dataset to Supabase so it is backed up!
      console.log("[Supabase Sync] Supabase trips table empty. Initializing and seeding base dataset to Supabase...");
      for (const trip of db.trips) {
        await supabaseServer.from("trips").upsert(tripToRow(trip));
      }
      for (const m of db.tripMembers) {
        await supabaseServer.from("trip_members").upsert(memberToRow(m));
      }
      for (const g of db.groups) {
        await supabaseServer.from("groups").upsert(groupToRow(g));
      }
      for (const gm of db.groupMembers) {
        await supabaseServer.from("group_members").upsert(groupMemberToRow(gm));
      }
      for (const eq of db.equipmentItems) {
        await supabaseServer.from("equipment_items").upsert(equipmentToRow(eq));
      }
      for (const fd of db.foodItems) {
        await supabaseServer.from("food_items").upsert(foodToRow(fd));
      }
      console.log("[Supabase Sync] Initial seed complete.");
    }
  } catch (err: any) {
    console.warn("[Supabase Sync] Hydration warning:", err?.message);
  }
}

// Real-Time Autosave Helpers
export async function supabaseUpsertTrip(trip: any) {
  if (!supabaseServer) return;
  try {
    const row = tripToRow(trip);
    await supabaseServer.from("trips").upsert(row);
  } catch (err: any) {
    console.warn("[Supabase Autosave] Error saving trip:", err?.message);
  }
}

export async function supabaseUpsertTripMember(member: any) {
  if (!supabaseServer) return;
  try {
    const row = memberToRow(member);
    await supabaseServer.from("trip_members").upsert(row);
  } catch (err: any) {
    console.warn("[Supabase Autosave] Error saving member:", err?.message);
  }
}

export async function supabaseUpsertGroup(group: any) {
  if (!supabaseServer) return;
  try {
    const row = groupToRow(group);
    await supabaseServer.from("groups").upsert(row);
  } catch (err: any) {
    console.warn("[Supabase Autosave] Error saving group:", err?.message);
  }
}

export async function supabaseUpsertGroupMember(gm: any) {
  if (!supabaseServer) return;
  try {
    const row = groupMemberToRow(gm);
    await supabaseServer.from("group_members").upsert(row);
  } catch (err: any) {
    console.warn("[Supabase Autosave] Error saving group member:", err?.message);
  }
}

export async function supabaseDeleteTripMember(memberId: string) {
  if (!supabaseServer) return;
  try {
    await supabaseServer.from("trip_members").delete().eq("id", memberId);
  } catch (err: any) {
    console.warn("[Supabase Autosave] Error deleting trip member:", err?.message);
  }
}

export async function supabaseDeleteGroupMember(tripId: string, userId: string) {
  if (!supabaseServer) return;
  try {
    await supabaseServer.from("group_members").delete().eq("trip_id", tripId).eq("user_id", userId);
  } catch (err: any) {
    console.warn("[Supabase Autosave] Error deleting group member:", err?.message);
  }
}

export async function supabaseDeleteGroup(groupId: string) {
  if (!supabaseServer) return;
  try {
    await supabaseServer.from("groups").delete().eq("id", groupId);
  } catch (err: any) {
    console.warn("[Supabase Autosave] Error deleting group:", err?.message);
  }
}

export async function supabaseUpsertEquipment(item: any) {
  if (!supabaseServer) return;
  try {
    const row = equipmentToRow(item);
    await supabaseServer.from("equipment_items").upsert(row);
  } catch (err: any) {
    console.warn("[Supabase Autosave] Error saving equipment:", err?.message);
  }
}

export async function supabaseDeleteEquipment(itemId: string) {
  if (!supabaseServer) return;
  try {
    await supabaseServer.from("equipment_items").delete().eq("id", itemId);
  } catch (err: any) {
    console.warn("[Supabase Autosave] Error deleting equipment:", err?.message);
  }
}

export async function supabaseUpsertFood(item: any) {
  if (!supabaseServer) return;
  try {
    const row = foodToRow(item);
    await supabaseServer.from("food_items").upsert(row);
  } catch (err: any) {
    console.warn("[Supabase Autosave] Error saving food:", err?.message);
  }
}

export async function supabaseDeleteFood(itemId: string) {
  if (!supabaseServer) return;
  try {
    await supabaseServer.from("food_items").delete().eq("id", itemId);
  } catch (err: any) {
    console.warn("[Supabase Autosave] Error deleting food:", err?.message);
  }
}

export async function supabaseUpsertInvitation(inv: any) {
  if (!supabaseServer) return;
  try {
    const row = invitationToRow(inv);
    await supabaseServer.from("trip_invitations").upsert(row);
  } catch (err: any) {
    console.warn("[Supabase Autosave] Error saving invitation:", err?.message);
  }
}

export async function supabaseDeleteTrip(tripId: string) {
  if (!supabaseServer) return;
  try {
    await supabaseServer.from("trips").delete().eq("id", tripId);
  } catch (err: any) {
    console.warn("[Supabase Autosave] Error deleting trip:", err?.message);
  }
}

if (!supabaseServer) {
  console.warn(
    "[Storage] Supabase is NOT configured. Data is saved only to data/storage.json on this server, " +
    "which is wiped whenever the host restarts or redeploys (e.g. AI Studio / Cloud Run). " +
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to keep data permanently — see README."
  );
}
