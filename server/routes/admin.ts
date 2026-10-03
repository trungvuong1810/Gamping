import express from "express";
import path from "path";
import fs from "fs";
import { SUPABASE_URL, supabaseServer } from "../supabase.js";
import { db, saveDb } from "../storage.js";

export const router = express.Router();

// Clear all database & memory data to restart fresh
router.post("/api/admin/clear-data", async (req, res) => {
  try {
    db.trips = [];
    db.users = [];
    db.accounts = [];
    db.invitations = [];
    db.tripMembers = [];
    db.groups = [];
    db.groupMembers = [];
    db.equipmentItems = [];
    db.foodItems = [];
    db.friends = [];
    saveDb();

    let supabaseCleared = false;
    if (supabaseServer) {
      try {
        await supabaseServer.from("trip_invitations").delete().neq("id", "0");
        await supabaseServer.from("group_members").delete().neq("id", "0");
        await supabaseServer.from("groups").delete().neq("id", "0");
        await supabaseServer.from("equipment_items").delete().neq("id", "0");
        await supabaseServer.from("food_items").delete().neq("id", "0");
        await supabaseServer.from("trip_members").delete().neq("id", "0");
        await supabaseServer.from("trips").delete().neq("id", "0");
        await supabaseServer.from("app_users").delete().neq("id", "0");
        supabaseCleared = true;
      } catch (sbErr: any) {
        console.warn("Supabase clear error:", sbErr?.message);
      }
    }

    return res.status(200).json({
      success: true,
      supabaseCleared,
      message: supabaseCleared
        ? "All trip data, users, and invitations cleared from Supabase and local memory."
        : "All local trip data, users, and invitations cleared successfully."
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to clear data" });
  }
});

router.get("/api/supabase/verify-tables", async (req, res) => {
  if (!supabaseServer) {
    return res.json({
      configured: false,
      message: "Supabase credentials (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) are not set in .env",
      tables: {},
      allReady: false
    });
  }

  const tablesToCheck = [
    "app_users",
    "trips",
    "trip_members",
    "groups",
    "group_members",
    "equipment_items",
    "food_items",
    "friends"
  ];

  const tableStatus: Record<string, { exists: boolean; error?: string }> = {};
  let existingCount = 0;

  for (const table of tablesToCheck) {
    try {
      const { error } = await supabaseServer.from(table).select("id").limit(1);
      if (error) {
        // Table does not exist in public schema
        tableStatus[table] = { exists: false, error: error.message };
      } else {
        tableStatus[table] = { exists: true };
        existingCount++;
      }
    } catch (err: any) {
      tableStatus[table] = { exists: false, error: err.message };
    }
  }

  // Extract project ref from SUPABASE_URL (e.g. https://zwvwosgyfxkxagpwlcyp.supabase.co)
  let projectRef = "";
  try {
    const u = new URL(SUPABASE_URL);
    projectRef = u.hostname.split(".")[0];
  } catch {}

  const allReady = existingCount === tablesToCheck.length;

  return res.json({
    configured: true,
    projectRef,
    sqlEditorUrl: projectRef ? `https://supabase.com/dashboard/project/${projectRef}/sql/new` : "https://supabase.com/dashboard",
    tables: tableStatus,
    allReady,
    readyCount: existingCount,
    totalCount: tablesToCheck.length,
    message: allReady 
      ? "All database tables are created and connected in Supabase!" 
      : `${existingCount} of ${tablesToCheck.length} tables found. Please run the SQL schema in your Supabase SQL Editor.`
  });
});

// Provide raw SQL schema for one-click setup
router.get("/api/supabase/schema", (req, res) => {
  try {
    const schemaPath = path.join(process.cwd(), "supabase-schema.sql");
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, "utf-8");
      return res.json({ sql });
    }
  } catch (err) {
    console.warn("Failed reading supabase-schema.sql:", err);
  }
  return res.status(404).json({ error: "supabase-schema.sql file not found" });
});


// Auto-sync local accounts and trips into Supabase tables once they exist
router.post("/api/supabase/sync-local", async (req, res) => {
  if (!supabaseServer) {
    return res.status(400).json({ error: "Supabase is not configured" });
  }

  let syncedUsers = 0;
  let syncedTrips = 0;

  try {
    // 1. Sync accounts
    if (db.accounts && db.accounts.length > 0) {
      for (const acc of db.accounts) {
        const { error } = await supabaseServer.from("app_users").upsert({
          id: acc.id,
          username: acc.username,
          email: acc.email,
          password_hash: acc.passwordHash,
          display_name: acc.displayName || acc.username,
          created_at: acc.createdAt || new Date().toISOString()
        }, { onConflict: "email" });
        if (!error) syncedUsers++;
      }
    }

    // 2. Sync trips
    if (db.trips && db.trips.length > 0) {
      for (const trip of db.trips) {
        const { error } = await supabaseServer.from("trips").upsert({
          id: trip.id,
          title: trip.title,
          host_id: trip.hostId,
          host_email: trip.hostEmail,
          host_name: trip.hostName,
          start_date: trip.startDate,
          end_date: trip.endDate,
          location: trip.location,
          park_details: trip.parkDetails || null,
          password: trip.password,
          password_expires_at: trip.passwordExpiresAt || null,
          created_at: trip.createdAt || new Date().toISOString()
        }, { onConflict: "id" });
        if (!error) syncedTrips++;
      }
    }


    return res.json({
      success: true,
      syncedUsers,
      syncedTrips,
      message: `Successfully synchronized ${syncedUsers} user accounts and ${syncedTrips} trips to Supabase!`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// JOIN TRIP VIA TRIP NAME & PASSWORD GATE
