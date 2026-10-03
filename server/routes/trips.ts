import express from "express";
import { PORT } from "../config.js";
import { Resend } from "resend";
import { supabaseServer, rowToTrip, rowToMember, rowToGroup, rowToGroupMember, rowToEquipment, rowToFood, supabaseUpsertTrip, supabaseUpsertTripMember, supabaseUpsertGroup, supabaseUpsertGroupMember } from "../supabase.js";
import { sendResendEmailWithFallback, sendInvitationEmail } from "../email.js";
import { db, saveDb, isTripPast } from "../storage.js";
import type { Trip, TripMember, Group, GroupMember } from "../../src/types.js";

export const router = express.Router();

// ==========================================
// TRIPS & REPOSITORY
// ==========================================

// Get trips for a specific user (hydrates active and past trips)
router.get("/api/trips", async (req, res) => {
  const userId = req.query.userId as string;
  const userEmail = (req.query.email as string)?.toLowerCase();

  // If Supabase is active, ensure we fetch latest cloud trips
  if (supabaseServer) {
    try {
      const { data: sbTrips } = await supabaseServer.from("trips").select("*");
      if (sbTrips && sbTrips.length > 0) {
        for (const raw of sbTrips) {
          const trip = rowToTrip(raw);
          const existingIdx = db.trips.findIndex(t => t.id === trip.id);
          if (existingIdx >= 0) {
            db.trips[existingIdx] = trip;
          } else {
            db.trips.push(trip);
          }
        }
      }
      const { data: sbMembers } = await supabaseServer.from("trip_members").select("*");
      if (sbMembers && sbMembers.length > 0) {
        for (const raw of sbMembers) {
          const mem = rowToMember(raw);
          const existingIdx = db.tripMembers.findIndex(m => m.id === mem.id);
          if (existingIdx >= 0) {
            db.tripMembers[existingIdx] = mem;
          } else {
            db.tripMembers.push(mem);
          }
        }
      }
    } catch (err) {
      console.warn("[Supabase] GET /api/trips sync notice:", err);
    }
  }

  let userTrips = db.trips;

  if (userId || userEmail) {
    const memberTripIds = new Set(
      db.tripMembers
        .filter(tm => (userId && tm.userId === userId) || (userEmail && tm.email && tm.email.toLowerCase() === userEmail))
        .map(tm => tm.tripId)
    );
    // Also include if host
    userTrips = db.trips.filter(t => (userId && t.hostId === userId) || (userEmail && t.hostEmail && t.hostEmail.toLowerCase() === userEmail) || memberTripIds.has(t.id));
  }

  const activeTrips = userTrips.filter(t => !isTripPast(t));
  const pastTrips = userTrips.filter(t => isTripPast(t));

  return res.json({ trips: userTrips, activeTrips, pastTrips });
});

// Get the latest active camping trip for real-time auto sync across all devices
router.get("/api/active-trip", async (req, res) => {
  let activeTrip = db.trips.slice().reverse().find(t => !isTripPast(t)) || db.trips[db.trips.length - 1];
  if (!activeTrip) {
    return res.json({ trip: null });
  }

  const id = activeTrip.id;
  const members = db.tripMembers.filter(tm => tm.tripId === id);
  const groups = db.groups.filter(g => g.tripId === id);
  const groupMembers = db.groupMembers.filter(gm => gm.tripId === id);
  const equipment = db.equipmentItems.filter(e => e.tripId === id);
  const food = db.foodItems.filter(f => f.tripId === id);
  const isPast = isTripPast(activeTrip);

  return res.json({
    trip: activeTrip,
    isPast,
    members,
    groups,
    groupMembers,
    equipment,
    food
  });
});

// Connect or update Google Spreadsheet metadata for a trip
router.post("/api/trips/:id/google-sheet", (req, res) => {
  const { id } = req.params;
  const {
    googleSpreadsheetId,
    googleSpreadsheetUrl,
    googleSpreadsheetTitle,
    googleSpreadsheetLastSynced,
    googleSpreadsheetSyncStatus
  } = req.body;

  const trip = db.trips.find(t => t.id === id);
  if (!trip) {
    return res.status(404).json({ error: "Trip not found" });
  }

  if (googleSpreadsheetId !== undefined) trip.googleSpreadsheetId = googleSpreadsheetId;
  if (googleSpreadsheetUrl !== undefined) trip.googleSpreadsheetUrl = googleSpreadsheetUrl;
  if (googleSpreadsheetTitle !== undefined) trip.googleSpreadsheetTitle = googleSpreadsheetTitle;
  trip.googleSpreadsheetLastSynced = googleSpreadsheetLastSynced || new Date().toISOString();
  trip.googleSpreadsheetSyncStatus = googleSpreadsheetSyncStatus || "connected";
  saveDb();

  return res.json({ success: true, trip });
});

// Get single trip with all details, members, groups, lists
router.get("/api/trips/:id", async (req, res) => {
  const { id } = req.params;
  let trip = db.trips.find(t => t.id === id);

  if (supabaseServer) {
    try {
      if (!trip) {
        const { data: sbTrip } = await supabaseServer.from("trips").select("*").eq("id", id).maybeSingle();
        if (sbTrip) {
          trip = rowToTrip(sbTrip);
          db.trips.push(trip);
        }
      }

      const [mRes, gRes, gmRes, eqRes, fdRes] = await Promise.all([
        supabaseServer.from("trip_members").select("*").eq("trip_id", id),
        supabaseServer.from("groups").select("*").eq("trip_id", id),
        supabaseServer.from("group_members").select("*").eq("trip_id", id),
        supabaseServer.from("equipment_items").select("*").eq("trip_id", id),
        supabaseServer.from("food_items").select("*").eq("trip_id", id),
      ]);

      if (mRes.data && mRes.data.length > 0) {
        db.tripMembers = db.tripMembers.filter(m => m.tripId !== id).concat(mRes.data.map(rowToMember));
      }
      if (gRes.data && gRes.data.length > 0) {
        db.groups = db.groups.filter(g => g.tripId !== id).concat(gRes.data.map(rowToGroup));
      }
      if (gmRes.data && gmRes.data.length > 0) {
        db.groupMembers = db.groupMembers.filter(gm => gm.tripId !== id).concat(gmRes.data.map(rowToGroupMember));
      }
      if (eqRes.data && eqRes.data.length > 0) {
        db.equipmentItems = db.equipmentItems.filter(eq => eq.tripId !== id).concat(eqRes.data.map(rowToEquipment));
      }
      if (fdRes.data && fdRes.data.length > 0) {
        db.foodItems = db.foodItems.filter(fd => fd.tripId !== id).concat(fdRes.data.map(rowToFood));
      }
    } catch (err) {
      console.warn("[Supabase] GET /api/trips/:id fetch notice:", err);
    }
  }

  if (!trip) {
    return res.status(404).json({ error: "Trip not found" });
  }

  const members = db.tripMembers.filter(tm => tm.tripId === id);
  const groups = db.groups.filter(g => g.tripId === id);
  const groupMembers = db.groupMembers.filter(gm => gm.tripId === id);
  const equipment = db.equipmentItems.filter(e => e.tripId === id);
  const food = db.foodItems.filter(f => f.tripId === id);

  const isPast = isTripPast(trip);

  return res.json({
    trip,
    isPast,
    members,
    groups,
    groupMembers,
    equipment,
    food
  });
});

// Create new trip (Host flow)
router.post("/api/trips", async (req, res) => {
  const { title, hostId, hostEmail, hostName, startDate, endDate, location, parkDetails, password, friendEmails } = req.body;

  if (!title || !startDate || !endDate || !password) {
    return res.status(400).json({ error: "Title, start date, end date, and password are required." });
  }

  const tripId = `trip_${Date.now()}`;
  const newTrip = {
    id: tripId,
    title,
    hostId: hostId || "usr_host",
    hostEmail: hostEmail || "organizer@camp.local",
    hostName: hostName || "Camp Organizer",
    startDate,
    endDate,
    location: location || (parkDetails?.name || "State / Provincial Park"),
    parkDetails: parkDetails || null,
    password: password.trim(),
    passwordExpiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0],
    createdAt: new Date().toISOString()
  };

  db.trips.push(newTrip);

  // Add host as first member
  const hostMember: TripMember = {
    id: `tm_${Date.now()}_host`,
    tripId,
    userId: newTrip.hostId,
    email: newTrip.hostEmail,
    name: newTrip.hostName,
    role: "host",
    joinedAt: new Date().toISOString()
  };
  db.tripMembers.push(hostMember);

  // Create initial group for Host
  const defaultGroupId = `grp_${Date.now()}_1`;
  const defaultGroup: Group = {
    id: defaultGroupId,
    tripId,
    name: "Group Alpha (Host Site)",
    siteLabel: "Site 1",
    description: "Initial group",
    createdAt: new Date().toISOString()
  };
  db.groups.push(defaultGroup);

  const hostGroupMember: GroupMember = {
    id: `gm_${Date.now()}_host`,
    groupId: defaultGroupId,
    tripId,
    userId: newTrip.hostId,
    email: newTrip.hostEmail,
    name: newTrip.hostName
  };
  db.groupMembers.push(hostGroupMember);

  // If host provided friend emails, save them to friend list if not already present
  if (Array.isArray(friendEmails)) {
    friendEmails.forEach(email => {
      if (email && !db.friends.some(f => f.userId === newTrip.hostId && f.friendEmail.toLowerCase() === email.toLowerCase())) {
        db.friends.push({
          id: `fr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: newTrip.hostId,
          friendEmail: email.toLowerCase(),
          friendName: email.split("@")[0],
          tags: ["Co-Camper"]
        });
      }
    });
  }

  saveDb();

  // Real-time autosave to Supabase cloud
  if (supabaseServer) {
    try {
      await supabaseUpsertTrip(newTrip);
      await supabaseUpsertTripMember(hostMember);
      await supabaseUpsertGroup(defaultGroup);
      await supabaseUpsertGroupMember(hostGroupMember);
      console.log(`[Supabase Autosave] Successfully autosaved new trip "${newTrip.title}" (${newTrip.id}) to Supabase!`);
    } catch (err: any) {
      console.warn("[Supabase Autosave] Error autosaving trip:", err?.message);
    }
  }

  return res.status(201).json({ trip: newTrip });
});

// Update trip details / password rotation (Host only)
router.patch("/api/trips/:id", async (req, res) => {
  const { id } = req.params;
  const { userId, title, startDate, endDate, password, parkDetails, location } = req.body;

  const trip = db.trips.find(t => t.id === id);
  if (!trip) {
    return res.status(404).json({ error: "Trip not found" });
  }

  // Allow host to update trip and reschedule dates
  if (trip.hostId !== userId && userId) {
    return res.status(403).json({ error: "Only the host can modify trip details." });
  }

  if (title) trip.title = title;
  if (startDate) trip.startDate = startDate;
  if (endDate) trip.endDate = endDate;
  if (password) trip.password = password.trim();
  if (parkDetails) trip.parkDetails = parkDetails;
  if (location) trip.location = location;

  saveDb();

  // Autosave to Supabase
  if (supabaseServer) {
    await supabaseUpsertTrip(trip);
  }

  return res.json({ trip });
});

// Delete active trip (Cascade delete from local storage and Supabase if connected)
router.delete("/api/trips/:id", async (req, res) => {
  const { id } = req.params;
  const tripIndex = db.trips.findIndex(t => t.id === id);
  if (tripIndex === -1) {
    return res.status(404).json({ error: "Trip not found" });
  }

  const deletedTrip = db.trips[tripIndex];

  // Remove cascade
  db.trips.splice(tripIndex, 1);
  db.tripMembers = db.tripMembers.filter(tm => tm.tripId !== id);
  db.groups = db.groups.filter(g => g.tripId !== id);
  db.groupMembers = db.groupMembers.filter(gm => gm.tripId !== id);
  db.equipmentItems = db.equipmentItems.filter(e => e.tripId !== id);
  db.foodItems = db.foodItems.filter(f => f.tripId !== id);
  if (db.invitations) {
    db.invitations = db.invitations.filter(inv => inv.tripId !== id);
  }

  // Supabase cascade deletion if configured
  if (supabaseServer) {
    try {
      await supabaseServer.from("trips").delete().eq("id", id);
    } catch (err) {
      console.warn("Supabase trip delete warning:", err);
    }
  }

  saveDb();
  return res.json({ success: true, deletedTripId: id, title: deletedTrip.title });
});

// Send 1-click invitation link via email (or generate direct magic link)
router.post("/api/trips/:id/send-invitation", async (req, res) => {
  const { id } = req.params;
  const { hostId, hostName, recipientEmails, customMessage } = req.body;

  const trip = db.trips.find(t => t.id === id);
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  if (!Array.isArray(recipientEmails) || recipientEmails.length === 0) {
    return res.status(400).json({ error: "At least one recipient email is required." });
  }

  if (!db.invitations) db.invitations = [];

  const origin = req.headers.origin || (process.env.APP_URL ? process.env.APP_URL : `http://localhost:${PORT}`);
  const createdInvitations: any[] = [];

  const dispatchResults: Array<{ email: string; sent: boolean; reason?: string; isSandboxRestricted?: boolean }> = [];

  for (const rawEmail of recipientEmails) {
    const email = rawEmail.trim().toLowerCase();
    if (!email) continue;

    const token = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const inviteLink = `${origin}/?invite=${trip.id}&token=${token}&email=${encodeURIComponent(email)}`;

    const invitation = {
      id: `invid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tripId: trip.id,
      hostId: hostId || trip.hostId,
      hostName: hostName || trip.hostName,
      recipientEmail: email,
      token,
      inviteLink,
      status: 'pending' as const,
      createdAt: new Date().toISOString()
    };

    db.invitations.push(invitation);
    createdInvitations.push(invitation);

    // Save to Supabase if configured
    if (supabaseServer) {
      try {
        await supabaseServer.from("trip_invitations").insert([{
          id: invitation.id,
          trip_id: invitation.tripId,
          host_id: invitation.hostId,
          host_name: invitation.hostName,
          recipient_email: invitation.recipientEmail,
          token: invitation.token,
          invite_link: invitation.inviteLink,
          status: 'pending'
        }]);
      } catch (err) {
        console.warn("Supabase invitation insert error:", err);
      }
    }

    // Attempt real email dispatch via Resend if configured
    if (process.env.RESEND_API_KEY) {
      try {
        const sendResult = await sendInvitationEmail(email, trip.title, hostName || trip.hostName, inviteLink);
        dispatchResults.push({
          email,
          sent: sendResult.sent,
          reason: sendResult.sent ? "Delivered to inbox" : sendResult.error,
          isSandboxRestricted: sendResult.isSandboxRestricted
        });
      } catch (err: any) {
        dispatchResults.push({ email, sent: false, reason: err.message });
      }
    } else {
      dispatchResults.push({ email, sent: false, reason: "No RESEND_API_KEY set (1-click link generated)" });
    }
  }

  saveDb();

  const anySandboxBlocked = dispatchResults.some(r => r.isSandboxRestricted);
  const deliveredCount = dispatchResults.filter(r => r.sent).length;

  let message = "";
  if (process.env.RESEND_API_KEY) {
    if (deliveredCount === createdInvitations.length) {
      message = `Invitations successfully sent to all ${createdInvitations.length} friends!`;
    } else if (deliveredCount > 0) {
      message = `Invitations delivered to ${deliveredCount} of ${createdInvitations.length} friends. Direct 1-click links generated for the rest!`;
    } else if (anySandboxBlocked) {
      message = `Resend is in Sandbox Mode (only verified email 'qtru49@gmail.com' can receive test emails). Instant 1-click magic links generated below for all friends to copy & join!`;
    } else {
      message = `1-Click invitation links generated for ${createdInvitations.length} friends!`;
    }
  } else {
    message = `1-Click invitation links generated for ${createdInvitations.length} friends!`;
  }

  return res.json({
    success: true,
    invitations: createdInvitations,
    dispatchResults,
    anySandboxBlocked,
    emailServiceUsed: process.env.RESEND_API_KEY ? "Resend (Cloud Email Delivery)" : "Direct 1-Click Magic Link",
    message
  });
});

// Backend endpoint using Resend SDK to send email from unboxdesign.canada@gmail.com
router.post("/api/send-email", async (req, res) => {
  try {
    const { to, subject, html, text, message, fromName } = req.body;

    if (!to) {
      return res.status(400).json({ error: "Recipient email ('to') is required." });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: "RESEND_API_KEY environment variable is not configured. Please set process.env.RESEND_API_KEY."
      });
    }

    const resend = new Resend(apiKey);

    const recipientList = Array.isArray(to) ? to : [to];
    const emailSubject = subject || "Notification";
    const bodyText = text || message;

    const { data, error } = await sendResendEmailWithFallback(resend, {
      fromName: fromName || "Unbox Design",
      to: recipientList,
      subject: emailSubject,
      html: html || (bodyText ? undefined : "<p>Message sent from application.</p>"),
      text: bodyText || undefined,
    });

    if (error) {
      console.error("Resend send email error:", error);
      return res.status(400).json({ 
        error: error.message || "Failed to send email via Resend SDK.",
        details: error
      });
    }

    return res.json({ success: true, data });
  } catch (err: any) {
    console.error("Error sending email via /api/send-email:", err);
    return res.status(500).json({ error: err.message || "Internal server error while sending email." });
  }
});

// Join trip automatically via 1-click invitation link (No password entry required!)
router.post("/api/trips/join-via-link", async (req, res) => {
  const { tripId, token, email, name } = req.body;

  let targetTripId = tripId;

  // Look up trip ID by invitation token if tripId wasn't passed directly
  if (!targetTripId && token && db.invitations) {
    const inv = db.invitations.find(i => i.token === token);
    if (inv) {
      targetTripId = inv.tripId;
    }
  }

  if (!targetTripId) return res.status(400).json({ error: "Trip ID or valid invitation token is required" });

  const trip = db.trips.find(t => t.id === targetTripId);
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  // Update invitation status if token provided
  if (db.invitations && token) {
    const inv = db.invitations.find(i => i.token === token || i.tripId === targetTripId);
    if (inv) {
      inv.status = 'accepted';
    }
  }

  // Ensure user exists
  const userEmail = (email || "friend@camp.com").toLowerCase();
  const userName = name || userEmail.split("@")[0];

  let targetUser = db.users.find(u => u.email.toLowerCase() === userEmail);
  if (!targetUser) {
    targetUser = {
      id: `usr_${Date.now()}`,
      email: userEmail,
      name: userName
    };
    db.users.push(targetUser);
  }

  // Add to tripMembers if not already present
  let member = db.tripMembers.find(tm => tm.tripId === trip.id && (tm.userId === targetUser.id || tm.email.toLowerCase() === userEmail));
  if (!member) {
    member = {
      id: `tm_${Date.now()}`,
      tripId: trip.id,
      userId: targetUser.id,
      email: userEmail,
      name: userName,
      role: "member",
      joinedAt: new Date().toISOString()
    };
    db.tripMembers.push(member);
  } else if (userName && member.name !== userName) {
    member.name = userName;
  }

  saveDb();

  if (supabaseServer) {
    await supabaseUpsertTripMember(member);
  }

  return res.json({
    success: true,
    trip,
    member,
    user: targetUser,
    message: `Successfully joined ${trip.title}!`
  });
});

router.post("/api/trips/join", async (req, res) => {
  const { tripTitle, password, userEmail, userName, userId } = req.body;

  if (!password) {
    return res.status(400).json({ error: "Wrong password, please ask Host for the correct one" });
  }

  const cleanPassword = password.trim().toLowerCase();
  const cleanTitle = (tripTitle || "").trim().toLowerCase();

  let trip = db.trips.find(t => {
    const passwordMatch = t.password.toLowerCase() === cleanPassword;
    if (!passwordMatch) return false;
    if (cleanTitle) {
      return t.title.toLowerCase().includes(cleanTitle);
    }
    return true;
  });

  if (!trip && supabaseServer) {
    try {
      const { data: sbTrips } = await supabaseServer.from("trips").select("*");
      if (sbTrips) {
        for (const raw of sbTrips) {
          const t = rowToTrip(raw);
          if (t.password.toLowerCase() === cleanPassword && (!cleanTitle || t.title.toLowerCase().includes(cleanTitle))) {
            trip = t;
            if (!db.trips.some(existing => existing.id === trip.id)) {
              db.trips.push(trip);
            }
            break;
          }
        }
      }
    } catch (err) {
      console.warn("Supabase trip search notice:", err);
    }
  }

  if (!trip) {
    return res.status(401).json({ error: "Wrong trip name or password, please ask Host for the correct one" });
  }

  // Ensure user exists
  const cleanEmail = (userEmail || "").trim().toLowerCase();
  const cleanName = (userName || "").trim();

  let targetUser = db.users.find(u =>
    (userId && u.id === userId) ||
    (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail) ||
    (cleanName && u.name && u.name.toLowerCase() === cleanName.toLowerCase())
  );

  if (!targetUser) {
    targetUser = {
      id: userId || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email: cleanEmail || `${(cleanName || "camper").toLowerCase().replace(/[^a-z0-9]/g, '.')}@camper.app`,
      name: cleanName || "Camper"
    };
    db.users.push(targetUser);
  } else if (cleanName && targetUser.name !== cleanName) {
    targetUser.name = cleanName;
  }

  const memberUserId = targetUser.id;
  const memberEmail = targetUser.email || cleanEmail || "camper@camper.app";
  const memberName = cleanName || targetUser.name || "Camper";

  // Check if already in trip_members
  let member = db.tripMembers.find(tm => tm.tripId === trip.id && (tm.userId === memberUserId || (cleanEmail && tm.email && tm.email.toLowerCase() === cleanEmail)));
  if (!member) {
    member = {
      id: `tm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tripId: trip.id,
      userId: memberUserId,
      email: memberEmail,
      name: memberName,
      role: "member",
      joinedAt: new Date().toISOString()
    };
    db.tripMembers.push(member);
    saveDb();
    if (supabaseServer) {
      supabaseUpsertTripMember(member);
    }
  } else if (cleanName && member.name !== cleanName) {
    member.name = cleanName;
    saveDb();
    if (supabaseServer) {
      supabaseUpsertTripMember(member);
    }
  }

  return res.json({
    success: true,
    tripId: trip.id,
    trip,
    member
  });
});
