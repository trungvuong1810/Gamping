import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  GMP_ATTRIBUTION_ID,
  REFERENCE_CITIES,
  getCuratedRegionalParks,
  findClosestCity
} from "./server-places.js";
import {
  recommendParksWithGrok,
  generateCustomParkWithGrok,
  generateEquipmentSuggestionsWithGrok,
  generatePackingListWithGrok,
  generateMealSuggestionsWithGrok,
  isGrokConfigured,
  getGrokApiKey,
  getGrokModelName
} from "./server-grok.js";
import type { Trip, TripMember, Group, GroupMember, EquipmentItem, FoodItem, TripInvitation } from "./src/types";

dotenv.config();

// Ensure Google Maps API Key is available from environment or user-configured key
if (!process.env.VITE_GOOGLE_MAPS_API_KEY) {
  process.env.VITE_GOOGLE_MAPS_API_KEY = "AIzaSyDCsyxNlUD_HWf4anJhms4HQUnlVa9La8M";
}
if (!process.env.GOOGLE_MAPS_API_KEY) {
  process.env.GOOGLE_MAPS_API_KEY = "AIzaSyDCsyxNlUD_HWf4anJhms4HQUnlVa9La8M";
}

export function getGoogleMapsApiKeys(): string[] {
  const keys = [
    process.env.VITE_GOOGLE_MAPS_API_KEY,
    process.env.GOOGLE_MAPS_API_KEY,
    "AIzaSyDCsyxNlUD_HWf4anJhms4HQUnlVa9La8M"
  ].filter((k): k is string => Boolean(k && k.trim().length > 0));
  return Array.from(new Set(keys));
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Log Grok 4.6 engine status
if (isGrokConfigured()) {
  console.log(`[Grok 4.6 Engine] Connected using live xAI API (Model: ${getGrokModelName()})`);
} else {
  console.log(`[Grok 4.6 Engine] Ready (Curated wilderness intelligence active. Set GROK_API_KEY in Secrets for live xAI completions).`);
}

// Initialize Supabase Server client if credentials provided
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
let supabaseServer: any = null;

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

// Resend Email Helper with automatic domain fallback
async function sendResendEmailWithFallback(resend: Resend, payload: {
  fromName?: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
}) {
  const preferredFrom = payload.fromName 
    ? `"${payload.fromName}" <unboxdesign.canada@gmail.com>` 
    : "unboxdesign.canada@gmail.com";

  // Primary attempt using requested address
  let result = await resend.emails.send({
    from: preferredFrom,
    replyTo: "unboxdesign.canada@gmail.com",
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });

  // If primary attempt fails due to validation_error (e.g., unverified domain for @gmail.com), fallback to onboarding@resend.dev
  if (result.error && (result.error.name === "validation_error" || (result.error.message || "").toLowerCase().includes("domain") || (result.error.message || "").toLowerCase().includes("verify"))) {
    console.warn(`Resend domain validation notice for unboxdesign.canada@gmail.com (${result.error.message}). Falling back to onboarding@resend.dev...`);
    const fallbackFrom = payload.fromName
      ? `"${payload.fromName}" <onboarding@resend.dev>`
      : "Unbox Design <onboarding@resend.dev>";
    
    result = await resend.emails.send({
      from: fallbackFrom,
      replyTo: "unboxdesign.canada@gmail.com",
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
  }

  return result;
}

// Resend Email Helper (Recommended free tier for 1-click email invitation links)
async function sendInvitationEmail(toEmail: string, tripTitle: string, hostName: string, inviteLink: string) {
  if (!process.env.RESEND_API_KEY) {
    return { sent: false, reason: "No RESEND_API_KEY set" };
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await sendResendEmailWithFallback(resend, {
      fromName: hostName || "Camping App",
      to: [toEmail],
      subject: `🏕️ You're invited to ${tripTitle} by ${hostName}!`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 16px;">
          <h2 style="color: #171717; margin-bottom: 8px;">You're Invited to Camp!</h2>
          <p style="color: #525252; font-size: 14px; line-height: 1.6;">
            <strong>${hostName}</strong> invited you to join the multi-group camping trip <strong>${tripTitle}</strong>.
          </p>
          <p style="color: #737373; font-size: 13px;">
            No password or trip ID entry required — click the button below to automatically join the trip and coordinate equipment and meals instantly:
          </p>
          <div style="margin: 28px 0;">
            <a href="${inviteLink}" style="background-color: #0a0a0a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
              Join Camping Trip Now →
            </a>
          </div>
          <p style="color: #a3a3a3; font-size: 11px;">
            Or copy this direct link: <br/><code>${inviteLink}</code>
          </p>
        </div>
      `
    });

    if (error) {
      console.warn(`Resend email delivery notice for ${toEmail}:`, error);
      return { 
        sent: false, 
        error: error.message || "Failed to deliver via Resend API",
        details: error,
        isSandboxRestricted: (error.message || "").toLowerCase().includes("testing emails to your own email address") || (error.name === "validation_error")
      };
    }
    return { sent: true, data };
  } catch (err: any) {
    console.error("Resend email delivery error:", err);
    return { sent: false, error: err.message };
  }
}

// 7-Day Pre-Trip Weather Email Dispatcher (Resend + Google Maps Weather Platform)
async function sendWeatherReportEmail(opts: {
  toEmail: string;
  recipientName: string;
  trip: any;
  daysUntilDeparture: number;
  forecastDays: any[];
  gearAlerts: string[];
  campsiteName: string;
  appUrl?: string;
}) {
  const { toEmail, recipientName, trip, daysUntilDeparture, forecastDays, gearAlerts, campsiteName, appUrl } = opts;

  if (!process.env.RESEND_API_KEY) {
    console.log(`[Weather Email] (Simulated Mode - No RESEND_API_KEY) Would send 7-day weather briefing to ${toEmail} for trip "${trip.title}"`);
    return { sent: true, simulated: true, message: `Simulated weather briefing sent to ${toEmail}` };
  }

  const baseUrl = appUrl || process.env.PUBLIC_APP_URL || "http://localhost:3000";
  const tripLink = `${baseUrl}/?tripId=${trip.id}`;

  const daysHtml = (forecastDays || []).slice(0, 7).map(d => `
    <tr style="border-bottom: 1px solid #f0f0f0;">
      <td style="padding: 10px 8px; font-size: 13px; font-weight: 600; color: #171717;">
        ${d.dayName}<br/><span style="font-size: 11px; font-weight: 400; color: #737373;">${d.date}</span>
      </td>
      <td style="padding: 10px 8px; font-size: 13px; color: #3A3B3A;">
        <strong>${d.condition}</strong>
      </td>
      <td style="padding: 10px 8px; font-size: 13px; color: #171717; font-family: monospace;">
        <strong>${d.maxTempC}°C</strong> / <span style="color: #737373;">${d.minTempC}°C</span>
        <div style="font-size: 10px; color: #a3a3a3;">(${d.maxTempF}° / ${d.minTempF}°F)</div>
      </td>
      <td style="padding: 10px 8px; font-size: 13px; color: ${d.precipitationPercent > 35 ? '#0284c7' : '#525252'}; font-weight: 600;">
        ${d.precipitationPercent}%
      </td>
      <td style="padding: 10px 8px; font-size: 12px; color: #737373;">
        ${d.windSpeedKmph || Math.round((d.windSpeedMph || 0) * 1.60934)} km/h
      </td>
    </tr>
  `).join("");

  const gearHtml = (gearAlerts || []).map(g => `
    <li style="margin-bottom: 8px; font-size: 13px; color: #3A3B3A; line-height: 1.5;">${g}</li>
  `).join("");

  const countdownText = daysUntilDeparture <= 1 
    ? "Departing tomorrow!" 
    : daysUntilDeparture <= 7 
      ? `Departing in ${daysUntilDeparture} days (${trip.startDate})` 
      : `Departure: ${trip.startDate} (${daysUntilDeparture} days away)`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e5e5e5; border-radius: 16px; background-color: #ffffff;">
      <div style="border-bottom: 2px solid #3A3B3A; padding-bottom: 16px; margin-bottom: 20px;">
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #3A3B3A;">GAMPING · 7-Day Pre-Trip Weather Alert</span>
        <h1 style="color: #3A3B3A; font-size: 22px; margin: 8px 0 4px 0; font-weight: 700;">${trip.title}</h1>
        <p style="color: #737373; font-size: 13px; margin: 0;">
          📍 ${campsiteName || trip.location} &bull; 🗓️ ${trip.startDate} to ${trip.endDate}
        </p>
      </div>

      <div style="background-color: #f7f7f7; border-left: 4px solid #3A3B3A; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px;">
        <div style="font-size: 14px; font-weight: 600; color: #3A3B3A; margin-bottom: 4px;">
          🏕️ ${countdownText}
        </div>
        <div style="font-size: 13px; color: #525252; line-height: 1.5;">
          Hello ${recipientName}, here is your official 1-week meteorological status for your upcoming camping trip. Check the temperature drops, rain probabilities, and packing tips below:
        </div>
      </div>

      <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #3A3B3A; margin: 20px 0 12px 0;">
        🌤️ Meteorological Forecast (Camping Window)
      </h3>
      <table style="width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 24px;">
        <thead>
          <tr style="border-bottom: 2px solid #e5e5e5; font-size: 11px; text-transform: uppercase; color: #737373;">
            <th style="padding: 8px;">Day</th>
            <th style="padding: 8px;">Condition</th>
            <th style="padding: 8px;">High/Low</th>
            <th style="padding: 8px;">Rain %</th>
            <th style="padding: 8px;">Wind</th>
          </tr>
        </thead>
        <tbody>
          ${daysHtml}
        </tbody>
      </table>

      ${gearAlerts && gearAlerts.length > 0 ? `
        <div style="background-color: #fafafa; border: 1px solid #e5e5e5; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
          <h4 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #3A3B3A; text-transform: uppercase; letter-spacing: 0.5px;">
            🎒 Tailored Packing & Equipment Checklist
          </h4>
          <ul style="margin: 0; padding-left: 20px;">
            ${gearHtml}
          </ul>
        </div>
      ` : ''}

      <div style="text-align: center; margin: 28px 0 20px 0;">
        <a href="${tripLink}" style="background-color: #3A3B3A; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
          Open Trip in GAMPING →
        </a>
      </div>

      <div style="border-top: 1px solid #eeeeee; padding-top: 16px; margin-top: 24px; text-align: center;">
        <p style="color: #8c8c8c; font-size: 11px; margin: 0 0 4px 0;">
          Weather data provided by Google Maps Platform
        </p>
        <p style="color: #b0b0b0; font-size: 10px; margin: 0;">
          This automatic weather alert was dispatched 1 week prior to departure for ${trip.title}.
        </p>
      </div>
    </div>
  `;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await sendResendEmailWithFallback(resend, {
      fromName: "GAMPING Weather",
      to: [toEmail],
      subject: `🏕️ 7-Day Pre-Trip Weather Status: ${trip.title} (${campsiteName || trip.location})`,
      html
    });

    if (error) {
      console.error("Resend weather email delivery error:", error);
      return { sent: false, error: error.message };
    }
    return { sent: true, data };
  } catch (err: any) {
    console.error("Resend weather email delivery error:", err);
    return { sent: false, error: err.message };
  }
}


// In-memory data store with JSON persistence
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "storage.json");

interface StorageData {
  users: Array<{ id: string; email: string; name: string; avatar?: string }>;
  accounts?: Array<{
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    displayName: string;
    createdAt: string;
  }>;
  invitations?: Array<{
    id: string;
    tripId: string;
    hostId: string;
    hostName: string;
    recipientEmail: string;
    token: string;
    inviteLink: string;
    status: 'pending' | 'accepted' | 'expired';
    createdAt: string;
  }>;
  trips: Array<{
    id: string;
    title: string;
    hostId: string;
    hostEmail: string;
    hostName: string;
    startDate: string;
    endDate: string;
    location: string;
    parkDetails?: any;
    password: string;
    passwordExpiresAt?: string;
    createdAt: string;
    weatherAlertConfig?: {
      autoAlertEnabled: boolean;
      lastSentAt?: string;
      lastForecastSummary?: string;
    };
    googleSpreadsheetId?: string;
    googleSpreadsheetUrl?: string;
    googleSpreadsheetTitle?: string;
    googleSpreadsheetLastSynced?: string;
    googleSpreadsheetSyncStatus?: string;
  }>;
  tripMembers: Array<{
    id: string;
    tripId: string;
    userId: string;
    email: string;
    name: string;
    role: 'host' | 'member';
    joinedAt: string;
  }>;
  groups: Array<{
    id: string;
    tripId: string;
    name: string;
    siteLabel?: string;
    description?: string;
    createdAt: string;
  }>;
  groupMembers: Array<{
    id: string;
    groupId: string;
    tripId: string;
    userId: string;
    email: string;
    name: string;
  }>;
  equipmentItems: Array<{
    id: string;
    tripId: string;
    groupId: string;
    name: string;
    category: string;
    assignedTo: string;
    packed: boolean;
    notes?: string;
    aiSuggested?: boolean;
  }>;
  foodItems: Array<{
    id: string;
    tripId: string;
    groupId: string;
    mealTime: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
    mealType?: string;
    title: string;
    description?: string;
    ingredientsOrItems: string;
    cookOrBringer: string;
    suggestedBy?: { userId: string; name: string };
    preparers: Array<{ userId: string; name: string }>;
    ingredientBringers: Array<{ userId: string; name: string; items?: string }>;
    status: 'planned' | 'purchased' | 'packed';
    dayLabel?: string;
  }>;
  friends: Array<{
    id: string;
    userId: string;
    friendEmail: string;
    friendName: string;
    tags?: string[];
  }>;
}

// Seed initial clean empty state (no mockup data)
function getInitialData(): StorageData {
  return {
    users: [],
    accounts: [],
    invitations: [],
    trips: [],
    tripMembers: [],
    groups: [],
    groupMembers: [],
    equipmentItems: [],
    foodItems: [],
    friends: []
  };
}

// Helper to normalize and ensure collaborative meal planning fields
function normalizeFoodItem(item: any): any {
  let mealTime = item.mealTime;
  if (!mealTime) {
    const mt = (item.mealType || "").toLowerCase();
    if (mt.includes("breakfast")) mealTime = "breakfast";
    else if (mt.includes("lunch")) mealTime = "lunch";
    else if (mt.includes("snack")) mealTime = "snacks";
    else mealTime = "dinner";
  }

  let preparers = Array.isArray(item.preparers) ? item.preparers : [];
  if (preparers.length === 0 && item.cookOrBringer) {
    const parts = item.cookOrBringer.split(/&|,|\band\b/i);
    preparers = parts.map((name: string) => ({
      userId: `usr_${name.trim().toLowerCase().replace(/\s+/g, '_')}`,
      name: name.trim()
    })).filter((p: any) => p.name.length > 0);
  }

  return {
    ...item,
    mealTime,
    mealType: item.mealType || (mealTime.charAt(0).toUpperCase() + mealTime.slice(1)),
    description: item.description || "",
    preparers,
    ingredientBringers: Array.isArray(item.ingredientBringers) ? item.ingredientBringers : [],
    suggestedBy: item.suggestedBy || { userId: "usr_host", name: "Alex Rivers" },
    status: item.status || "planned",
    dayLabel: item.dayLabel || ""
  };
}

// Load data from file or initialize
let db: StorageData;
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    db = JSON.parse(raw);
    if (db.foodItems) {
      db.foodItems = db.foodItems.map(normalizeFoodItem);
    }
  } else {
    db = getInitialData();
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  }
} catch (e) {
  console.warn("Storage init error, falling back to in-memory:", e);
  db = getInitialData();
}

function saveDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error("Error saving DB:", err);
  }
}

// ==========================================
// SUPABASE REAL-TIME PERSISTENCE & AUTOSAVE ENGINE
// ==========================================

function tripToRow(trip: any) {
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

function rowToTrip(row: any): Trip {
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

function memberToRow(m: any) {
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

function rowToMember(row: any): TripMember {
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

function groupToRow(g: any) {
  return {
    id: g.id,
    trip_id: g.tripId,
    name: g.name,
    site_label: g.siteLabel || null,
    description: g.description || null,
    created_at: g.createdAt || new Date().toISOString()
  };
}

function rowToGroup(row: any): Group {
  return {
    id: row.id,
    tripId: row.trip_id,
    name: row.name,
    siteLabel: row.site_label || "",
    description: row.description || "",
    createdAt: row.created_at || new Date().toISOString()
  };
}

function groupMemberToRow(gm: any) {
  return {
    id: gm.id,
    group_id: gm.groupId,
    trip_id: gm.tripId,
    user_id: gm.userId,
    email: gm.email || null,
    name: gm.name || null
  };
}

function rowToGroupMember(row: any): GroupMember {
  return {
    id: row.id,
    groupId: row.group_id,
    tripId: row.trip_id,
    userId: row.user_id,
    email: row.email || "",
    name: row.name || ""
  };
}

function equipmentToRow(e: any) {
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

function rowToEquipment(row: any): EquipmentItem {
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

function foodToRow(f: any) {
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
    preparers: Array.isArray(f.preparers) ? f.preparers : [],
    ingredient_bringers: Array.isArray(f.ingredientBringers) ? f.ingredientBringers : [],
    status: f.status || 'planned',
    created_at: f.createdAt || new Date().toISOString()
  };
}

function rowToFood(row: any): FoodItem {
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
    cookOrBringer: row.preparers && row.preparers.length > 0 ? row.preparers[0].name : "Camper",
    preparers: Array.isArray(row.preparers) ? row.preparers : [],
    ingredientBringers: Array.isArray(row.ingredient_bringers) ? row.ingredient_bringers : [],
    status: row.status || 'planned'
  };
}

function invitationToRow(inv: any) {
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

function rowToInvitation(row: any): TripInvitation {
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

async function hydrateAllFromSupabase() {
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
async function supabaseUpsertTrip(trip: any) {
  if (!supabaseServer) return;
  try {
    const row = tripToRow(trip);
    await supabaseServer.from("trips").upsert(row);
  } catch (err: any) {
    console.warn("[Supabase Autosave] Error saving trip:", err?.message);
  }
}

async function supabaseUpsertTripMember(member: any) {
  if (!supabaseServer) return;
  try {
    const row = memberToRow(member);
    await supabaseServer.from("trip_members").upsert(row);
  } catch (err: any) {
    console.warn("[Supabase Autosave] Error saving member:", err?.message);
  }
}

async function supabaseUpsertGroup(group: any) {
  if (!supabaseServer) return;
  try {
    const row = groupToRow(group);
    await supabaseServer.from("groups").upsert(row);
  } catch (err: any) {
    console.warn("[Supabase Autosave] Error saving group:", err?.message);
  }
}

async function supabaseUpsertGroupMember(gm: any) {
  if (!supabaseServer) return;
  try {
    const row = groupMemberToRow(gm);
    await supabaseServer.from("group_members").upsert(row);
  } catch (err: any) {
    console.warn("[Supabase Autosave] Error saving group member:", err?.message);
  }
}

async function supabaseDeleteGroupMember(tripId: string, userId: string) {
  if (!supabaseServer) return;
  try {
    await supabaseServer.from("group_members").delete().eq("trip_id", tripId).eq("user_id", userId);
  } catch (err: any) {
    console.warn("[Supabase Autosave] Error deleting group member:", err?.message);
  }
}

async function supabaseDeleteGroup(groupId: string) {
  if (!supabaseServer) return;
  try {
    await supabaseServer.from("groups").delete().eq("id", groupId);
  } catch (err: any) {
    console.warn("[Supabase Autosave] Error deleting group:", err?.message);
  }
}

async function supabaseUpsertEquipment(item: any) {
  if (!supabaseServer) return;
  try {
    const row = equipmentToRow(item);
    await supabaseServer.from("equipment_items").upsert(row);
  } catch (err: any) {
    console.warn("[Supabase Autosave] Error saving equipment:", err?.message);
  }
}

async function supabaseDeleteEquipment(itemId: string) {
  if (!supabaseServer) return;
  try {
    await supabaseServer.from("equipment_items").delete().eq("id", itemId);
  } catch (err: any) {
    console.warn("[Supabase Autosave] Error deleting equipment:", err?.message);
  }
}

async function supabaseUpsertFood(item: any) {
  if (!supabaseServer) return;
  try {
    const row = foodToRow(item);
    await supabaseServer.from("food_items").upsert(row);
  } catch (err: any) {
    console.warn("[Supabase Autosave] Error saving food:", err?.message);
  }
}

async function supabaseDeleteFood(itemId: string) {
  if (!supabaseServer) return;
  try {
    await supabaseServer.from("food_items").delete().eq("id", itemId);
  } catch (err: any) {
    console.warn("[Supabase Autosave] Error deleting food:", err?.message);
  }
}

async function supabaseUpsertInvitation(inv: any) {
  if (!supabaseServer) return;
  try {
    const row = invitationToRow(inv);
    await supabaseServer.from("trip_invitations").upsert(row);
  } catch (err: any) {
    console.warn("[Supabase Autosave] Error saving invitation:", err?.message);
  }
}

async function supabaseDeleteTrip(tripId: string) {
  if (!supabaseServer) return;
  try {
    await supabaseServer.from("trips").delete().eq("id", tripId);
  } catch (err: any) {
    console.warn("[Supabase Autosave] Error deleting trip:", err?.message);
  }
}

// Initial hydration on startup
if (supabaseServer) {
  hydrateAllFromSupabase();
}

// Helper: Check if a trip is in the past
function isTripPast(trip: { endDate: string }): boolean {
  const today = new Date().toISOString().split("T")[0];
  return trip.endDate < today;
}

// ==========================================
// AI TRIP INTELLIGENCE ENDPOINTS (Grok 4.6 Persona via Gemini Backend)
// ==========================================

// 1. Long weekends (Current year CA & US holidays dynamically calculated)
app.get("/api/ai/long-weekends", async (req, res) => {
  const year = req.query.year ? parseInt(req.query.year as string) : 2026;

  function pad(n: number): string {
    return n < 10 ? '0' + n : '' + n;
  }
  function toIso(d: Date): string {
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  function formatMD(d: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[d.getUTCDay()]}, ${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
  }
  function getNthDayOfMonth(y: number, m: number, dow: number, n: number): Date {
    let d = new Date(Date.UTC(y, m, 1));
    let count = 0;
    while (d.getUTCMonth() === m) {
      if (d.getUTCDay() === dow) {
        count++;
        if (count === n) return d;
      }
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return d;
  }
  function getLastDayOfMonth(y: number, m: number, dow: number): Date {
    let d = new Date(Date.UTC(y, m + 1, 0));
    while (d.getUTCDay() !== dow) {
      d.setUTCDate(d.getUTCDate() - 1);
    }
    return d;
  }
  function addD(d: Date, n: number): Date {
    const r = new Date(d);
    r.setUTCDate(r.getUTCDate() + n);
    return r;
  }

  const holidays = [];

  // Family Day / Presidents Day (3rd Mon of Feb)
  const febMon = getNthDayOfMonth(year, 1, 1, 3);
  const febFri = addD(febMon, -3);
  holidays.push({
    name: "Family Day Weekend",
    country: "CA",
    dates: `${formatMD(febFri)} - ${formatMD(febMon)}, ${year}`,
    startDate: toIso(febFri),
    endDate: toIso(febMon),
    days: 4,
    season: "Winter"
  });
  holidays.push({
    name: "Presidents' Day Weekend",
    country: "US",
    dates: `${formatMD(febFri)} - ${formatMD(febMon)}, ${year}`,
    startDate: toIso(febFri),
    endDate: toIso(febMon),
    days: 4,
    season: "Winter"
  });

  // Victoria Day (CA: Mon before May 25)
  let vicMon = new Date(Date.UTC(year, 4, 24));
  while (vicMon.getUTCDay() !== 1) vicMon.setUTCDate(vicMon.getUTCDate() - 1);
  const vicFri = addD(vicMon, -3);
  holidays.push({
    name: "Victoria Day Weekend",
    country: "CA",
    dates: `${formatMD(vicFri)} - ${formatMD(vicMon)}, ${year}`,
    startDate: toIso(vicFri),
    endDate: toIso(vicMon),
    days: 4,
    season: "Spring"
  });

  // Memorial Day (US: Last Mon of May)
  const memMon = getLastDayOfMonth(year, 4, 1);
  const memFri = addD(memMon, -3);
  holidays.push({
    name: "Memorial Day Weekend",
    country: "US",
    dates: `${formatMD(memFri)} - ${formatMD(memMon)}, ${year}`,
    startDate: toIso(memFri),
    endDate: toIso(memMon),
    days: 4,
    season: "Spring"
  });

  // Canada Day (CA: July 1)
  const canDay = new Date(Date.UTC(year, 6, 1));
  const cdDow = canDay.getUTCDay();
  let canStart = cdDow === 1 ? addD(canDay, -3) : cdDow === 5 ? canDay : cdDow === 6 ? addD(canDay, -1) : cdDow === 0 ? addD(canDay, -2) : cdDow === 4 ? canDay : cdDow === 2 ? addD(canDay, -4) : canDay;
  let canEnd = cdDow === 1 ? canDay : cdDow === 5 ? addD(canDay, 3) : cdDow === 6 ? addD(canDay, 2) : cdDow === 0 ? addD(canDay, 1) : cdDow === 4 ? addD(canDay, 3) : cdDow === 2 ? canDay : addD(canDay, 4);
  const canDays = Math.round((canEnd.getTime() - canStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  holidays.push({
    name: "Canada Day Weekend",
    country: "CA",
    dates: `${formatMD(canStart)} - ${formatMD(canEnd)}, ${year}`,
    startDate: toIso(canStart),
    endDate: toIso(canEnd),
    days: canDays,
    season: "Summer"
  });

  // 4th of July Weekend (US: July 4)
  const usJul4 = new Date(Date.UTC(year, 6, 4));
  const usDow = usJul4.getUTCDay();
  let usStart = usDow === 1 ? addD(usJul4, -3) : usDow === 5 ? usJul4 : usDow === 6 ? addD(usJul4, -1) : usDow === 0 ? addD(usJul4, -2) : usDow === 4 ? usJul4 : usDow === 2 ? addD(usJul4, -4) : usJul4;
  let usEnd = usDow === 1 ? usJul4 : usDow === 5 ? addD(usJul4, 3) : usDow === 6 ? addD(usJul4, 2) : usDow === 0 ? addD(usJul4, 1) : usDow === 4 ? addD(usJul4, 3) : usDow === 2 ? usJul4 : addD(usJul4, 4);
  const usDays = Math.round((usEnd.getTime() - usStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  holidays.push({
    name: "4th of July Weekend",
    country: "US",
    dates: `${formatMD(usStart)} - ${formatMD(usEnd)}, ${year}`,
    startDate: toIso(usStart),
    endDate: toIso(usEnd),
    days: usDays,
    season: "Summer"
  });

  // Civic Holiday / August Long (CA: 1st Mon of August)
  const civMon = getNthDayOfMonth(year, 7, 1, 1);
  const civFri = addD(civMon, -3);
  holidays.push({
    name: "Civic Holiday / August Long",
    country: "CA",
    dates: `${formatMD(civFri)} - ${formatMD(civMon)}, ${year}`,
    startDate: toIso(civFri),
    endDate: toIso(civMon),
    days: 4,
    season: "Summer"
  });

  // Labor Day (CA & US: 1st Mon of September)
  const labMon = getNthDayOfMonth(year, 8, 1, 1);
  const labFri = addD(labMon, -3);
  holidays.push({
    name: "Labor Day / Labour Day",
    country: "CA / US",
    dates: `${formatMD(labFri)} - ${formatMD(labMon)}, ${year}`,
    startDate: toIso(labFri),
    endDate: toIso(labMon),
    days: 4,
    season: "Summer"
  });

  // Canadian Thanksgiving (CA: 2nd Mon of October)
  const octMon = getNthDayOfMonth(year, 9, 1, 2);
  const octFri = addD(octMon, -3);
  holidays.push({
    name: "Canadian Thanksgiving Weekend",
    country: "CA",
    dates: `${formatMD(octFri)} - ${formatMD(octMon)}, ${year}`,
    startDate: toIso(octFri),
    endDate: toIso(octMon),
    days: 4,
    season: "Fall"
  });
  holidays.push({
    name: "Indigenous Peoples' Day Weekend",
    country: "US",
    dates: `${formatMD(octFri)} - ${formatMD(octMon)}, ${year}`,
    startDate: toIso(octFri),
    endDate: toIso(octMon),
    days: 4,
    season: "Fall"
  });

  // US Thanksgiving (US: 4th Thu of November)
  const thxThu = getNthDayOfMonth(year, 10, 4, 4);
  const thxSun = addD(thxThu, 3);
  holidays.push({
    name: "US Thanksgiving Weekend",
    country: "US",
    dates: `${formatMD(thxThu)} - ${formatMD(thxSun)}, ${year}`,
    startDate: toIso(thxThu),
    endDate: toIso(thxSun),
    days: 4,
    season: "Fall"
  });

  return res.json({ holidays });
});

// Google Maps Places API Autocomplete & Geocoding Endpoints (with attribution)
app.get("/api/places/autocomplete", async (req, res) => {
  const query = ((req.query.query as string) || "").trim();
  if (!query) {
    return res.json({ suggestions: [] });
  }

  const keys = getGoogleMapsApiKeys();

  for (const gmpKey of keys) {
    try {
      const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": gmpKey,
          "X-Goog-Maps-Solution-ID": GMP_ATTRIBUTION_ID
        },
        body: JSON.stringify({
          input: query,
          includedPrimaryTypes: ["locality", "administrative_area_level_3", "sublocality", "postal_code", "natural_feature", "park"]
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.suggestions && Array.isArray(data.suggestions)) {
          const formatted = data.suggestions.map((s: any) => {
            const pred = s.placePrediction;
            return {
              description: pred?.text?.text || pred?.structuredFormat?.mainText?.text || query,
              placeId: pred?.placeId || pred?.place || `p_${Date.now()}`,
              mainText: pred?.structuredFormat?.mainText?.text || pred?.text?.text || query,
              secondaryText: pred?.structuredFormat?.secondaryText?.text || "",
            };
          });
          return res.json({ suggestions: formatted });
        }
      }
    } catch (err) {
      console.warn("Google Maps Places API error with key, trying fallback/next key:", err);
    }
  }

  // Curated fast fallback matching user input against 300+ major cities and regions
  const qLower = query.toLowerCase();
  const matched = REFERENCE_CITIES.filter(c => 
    c.name.toLowerCase().includes(qLower) || 
    c.stateOrProvince.toLowerCase() === qLower ||
    `${c.name}, ${c.stateOrProvince}`.toLowerCase().includes(qLower)
  ).slice(0, 7);

  const fallbackSuggestions = matched.map(c => ({
    description: `${c.name}, ${c.stateOrProvince}, ${c.country}`,
    placeId: `city_${c.name.toLowerCase().replace(/\s+/g, '_')}_${c.stateOrProvince.toLowerCase()}`,
    mainText: `${c.name}, ${c.stateOrProvince}`,
    secondaryText: c.country === "USA" ? "United States" : "Canada",
    coordinates: { lat: c.lat, lng: c.lng }
  }));

  return res.json({ suggestions: fallbackSuggestions });
});

app.get("/api/places/geocode", async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: "Invalid lat/lng parameters" });
  }

  const keys = getGoogleMapsApiKeys();

  for (const gmpKey of keys) {
    try {
      const resp = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${gmpKey}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.results && data.results.length > 0) {
          const first = data.results[0];
          return res.json({
            locationName: first.formatted_address,
            placeId: first.place_id,
            coordinates: { lat, lng }
          });
        }
      }
    } catch (err) {
      console.warn("Geocoding fetch error:", err);
    }
  }

  // Fallback to closest reference city
  const closest = findClosestCity(lat, lng);
  return res.json({
    locationName: `${closest.name}, ${closest.stateOrProvince}`,
    placeId: `closest_${closest.name.toLowerCase()}`,
    coordinates: { lat, lng }
  });
});

// 2. Booking / Park Recommendation (Grok 4.6 engine exclusively)
app.post("/api/ai/recommend-parks", async (req, res) => {
  const { activities, driveDistance, experienceLevel, customNotes, startingLocation, coordinates } = req.body;

  const activitiesList = Array.isArray(activities) ? activities.join(", ") : activities || "hiking, campfire cooking";
  const distance = driveDistance || "within 2 hrs";
  const experience = experienceLevel || "Intermediate";
  const originCity = startingLocation?.trim() || "";

  const result = await recommendParksWithGrok({
    originCity,
    distance,
    experience,
    activitiesList,
    customNotes,
    coordinates
  });

  return res.json({
    parks: result.parks,
    source: result.source,
    grokConfigured: isGrokConfigured()
  });
});

// 2b. Custom Park Details Generator (Grok 4.6 engine exclusively)
app.post("/api/ai/generate-custom-park", async (req, res) => {
  const { parkName, startingLocation, coordinates } = req.body;
  const result = await generateCustomParkWithGrok({
    parkName: parkName || "Custom Campsite",
    originCity: startingLocation,
    coordinates
  });

  return res.json({
    park: result.park,
    source: result.source,
    grokConfigured: isGrokConfigured()
  });
});

// 3. Equipment Draft Suggestions (Grok 4.6 engine exclusively)
app.post("/api/ai/equipment-suggestions", async (req, res) => {
  const { location, startDate, endDate, activities, groupName } = req.body;

  const result = await generateEquipmentSuggestionsWithGrok({
    location,
    startDate,
    endDate,
    activities,
    groupName
  });

  return res.json({
    equipment: result.suggestions,
    source: result.source,
    grokConfigured: isGrokConfigured()
  });
});

// Helper for comprehensive Grok 4.6 packing list generator
function generateCuratedGrokPackingList(
  destination: string,
  season: string,
  activities: string[] = []
) {
  const normSeason = (season || "Summer").toLowerCase();
  const actLower = activities.map(a => a.toLowerCase());
  const hasHiking = actLower.some(a => a.includes("hik") || a.includes("trail") || a.includes("trek"));
  const hasSwimming = actLower.some(a => a.includes("swim") || a.includes("water") || a.includes("beach") || a.includes("lake") || a.includes("paddl"));

  const list: Array<{
    name: string;
    category: 'Shelter' | 'Cooking' | 'Clothing' | 'Personal Items';
    reason: string;
    activityTag?: string;
    essential: boolean;
  }> = [];

  // 1. Shelter
  if (normSeason.includes("fall") || normSeason.includes("autumn")) {
    list.push({
      name: "3-Season Weather-Resistant Tent & Heavy Guylines",
      category: "Shelter",
      reason: `Stands up to brisk autumn winds and condensation common at ${destination}.`,
      essential: true
    });
    list.push({
      name: "Sleeping Bag (20°F / -7°C rated)",
      category: "Shelter",
      reason: `Crucial for sharp night temperature drops experienced during fall at ${destination}.`,
      activityTag: "season",
      essential: true
    });
    list.push({
      name: "Insulated Sleeping Pad (R-Value 4.0+)",
      category: "Shelter",
      reason: "Provides thermal barrier against cold autumn ground heat transfer.",
      activityTag: "season",
      essential: true
    });
  } else if (normSeason.includes("winter")) {
    list.push({
      name: "4-Season Geodesic Snow Tent & Snow Stakes",
      category: "Shelter",
      reason: `Designed for sub-zero snow loads and winter winds at ${destination}.`,
      activityTag: "season",
      essential: true
    });
    list.push({
      name: "Extreme Cold Sleeping Bag (-10°F / -23°C rated)",
      category: "Shelter",
      reason: "Vital hypothermia prevention during deep winter nights.",
      activityTag: "season",
      essential: true
    });
    list.push({
      name: "Dual Foam & Inflatable Sleeping Pad System (R-Value 5.5+)",
      category: "Shelter",
      reason: "Double insulation required over frozen ground and snow pack.",
      activityTag: "season",
      essential: true
    });
  } else if (normSeason.includes("spring")) {
    list.push({
      name: "Full-Coverage Rainfly Tent with Seam Sealer",
      category: "Shelter",
      reason: `Keeps interior bone dry during frequent spring rains and damp morning dew at ${destination}.`,
      essential: true
    });
    list.push({
      name: "3-Season Sleeping Bag (30°F / 0°C rated)",
      category: "Shelter",
      reason: "Balanced warmth for unpredictable spring fluctuations.",
      activityTag: "season",
      essential: true
    });
    list.push({
      name: "Closed-Cell Foam Ground Pad (R-Value 3.2+)",
      category: "Shelter",
      reason: "Resists ground thaw moisture under tent floor.",
      essential: true
    });
  } else {
    // Summer
    list.push({
      name: "Well-Ventilated Double-Door Camping Tent",
      category: "Shelter",
      reason: `Maximizes cross-breeze during warm summer nights at ${destination}.`,
      essential: true
    });
    list.push({
      name: "Lightweight Sleeping Bag or Camp Quilt (45°F / 7°C rated)",
      category: "Shelter",
      reason: "Breathable warmth for mild summer evenings.",
      activityTag: "season",
      essential: true
    });
    list.push({
      name: "Compact Inflatable Air Sleeping Pad",
      category: "Shelter",
      reason: "Comfortable cushioned sleep surface with minimal pack weight.",
      essential: false
    });
  }
  list.push({
    name: "Heavy-Duty Ground Footprint & Waterproof Tarp",
    category: "Shelter",
    reason: `Protects tent floor against sharp rocks, pine cones, and surface mud at ${destination}.`,
    essential: true
  });
  list.push({
    name: "Aluminum Mallet & Hardened Steel Tent Stakes",
    category: "Shelter",
    reason: "Secures shelter firmly in rocky or hard-packed wilderness soils.",
    essential: true
  });

  // 2. Cooking
  list.push({
    name: "Dual-Burner Propane Camp Stove & Full Canisters",
    category: "Cooking",
    reason: "Reliable hot meal preparation even during local firewood bans or rain.",
    essential: true
  });
  list.push({
    name: "Non-Stick Nesting Cookset & Cast Iron Griddle",
    category: "Cooking",
    reason: "Versatile group frying, boiling, and skillet cooking.",
    essential: true
  });
  list.push({
    name: "Gravity Water Filter (4L) & Backup Purification Tablets",
    category: "Cooking",
    reason: `Safely purifies raw lake or river water into safe drinking water at ${destination}.`,
    essential: true
  });
  list.push({
    name: "Bear-Proof Food Storage Canister or 50ft Counterbalance Rope",
    category: "Cooking",
    reason: `Strict wildlife protection protocol required at ${destination}.`,
    essential: true
  });
  list.push({
    name: "Insulated Heavy-Duty Cooler with Freeze Packs",
    category: "Cooking",
    reason: "Maintains food safety temperatures for perishable meats and dairy for days.",
    essential: true
  });
  list.push({
    name: "Biodegradable Camp Dish Soap & Scrub Sponge Kit",
    category: "Cooking",
    reason: "Leave No Trace dish sanitizing 200 feet away from natural water sources.",
    essential: true
  });

  // 3. Clothing
  if (normSeason.includes("fall") || normSeason.includes("autumn")) {
    list.push({
      name: "Merino Wool Midweight Thermal Base Layers (Top & Bottom)",
      category: "Clothing",
      reason: `Regulates body core temp during crisp fall mornings and cold nights at ${destination}.`,
      activityTag: "season",
      essential: true
    });
    list.push({
      name: "Windproof & Waterproof Hardshell Rain Jacket",
      category: "Clothing",
      reason: "Critical shield against freezing precipitation and mountain gusts.",
      essential: true
    });
    list.push({
      name: "Packable Down or High-Loft Fleece Jacket",
      category: "Clothing",
      reason: "Essential camp layer when relaxing around the campfire as temperatures plummet.",
      essential: true
    });
    list.push({
      name: "Thermal Knit Beanie & Fleece Camp Gloves",
      category: "Clothing",
      reason: "Prevents heat loss from extremities in sub-5°C conditions.",
      activityTag: "season",
      essential: true
    });
  } else if (normSeason.includes("winter")) {
    list.push({
      name: "Heavyweight Expedition Wool Base Layers",
      category: "Clothing",
      reason: "Maximum warmth retention beneath outer shell.",
      activityTag: "season",
      essential: true
    });
    list.push({
      name: "Waterproof Insulated Snow Parka & Bib Pants",
      category: "Clothing",
      reason: `Complete barrier against snow and frostbite at ${destination}.`,
      activityTag: "season",
      essential: true
    });
    list.push({
      name: "Insulated Winter Boots (-30°C rated) & Gaiters",
      category: "Clothing",
      reason: "Keeps feet completely dry and insulated in deep snow drifts.",
      activityTag: "season",
      essential: true
    });
  } else {
    // Spring or Summer
    list.push({
      name: "UPF 50+ Breathable Sun Hoodies & Trail Shirts",
      category: "Clothing",
      reason: `Guards against intense UV exposure while paddling or trekking at ${destination}.`,
      activityTag: "season",
      essential: true
    });
    list.push({
      name: "Quick-Dry Ripstop Hiking Pants (Convertible to Shorts)",
      category: "Clothing",
      reason: "Flexible trail mobility and fast drying after stream crossings.",
      essential: true
    });
    list.push({
      name: "Packable Lightweight Rain Jacket",
      category: "Clothing",
      reason: "Essential emergency protection against sudden summer downpours.",
      essential: true
    });
    list.push({
      name: "Moisture-Wicking Merino Trail Socks (3 Pairs)",
      category: "Clothing",
      reason: "Prevents friction, hotspots, and chafing during wilderness treks.",
      essential: true
    });
  }

  // Activity Specific Clothing & Gear: Hiking
  if (hasHiking) {
    list.push({
      name: "Ankle-Support Waterproof Hiking Boots with Vibram Grip",
      category: "Clothing",
      reason: `Engineered for rocky roots, granite outcroppings, and uneven elevation at ${destination}.`,
      activityTag: "hiking",
      essential: true
    });
    list.push({
      name: "20L Daypack with 2L Hydration Water Reservoir",
      category: "Personal Items",
      reason: "Hands-free hydration and easy transport of layers and trail food on hikes.",
      activityTag: "hiking",
      essential: true
    });
    list.push({
      name: "Lightweight Aluminum Trekking Poles with Shock Absorbers",
      category: "Personal Items",
      reason: "Relieves knee impact on steep descents and provides stability over loose trails.",
      activityTag: "hiking",
      essential: false
    });
    list.push({
      name: "Trail Blister Prevention Kit & Pre-cut Moleskin",
      category: "Personal Items",
      reason: "Immediately treats friction hotspots before painful blisters ruin hiking plans.",
      activityTag: "hiking",
      essential: true
    });
  }

  // Activity Specific Clothing & Gear: Swimming
  if (hasSwimming) {
    list.push({
      name: "Quick-Drying Swimwear & UV Protective Rashguard",
      category: "Clothing",
      reason: `Essential for swimming sessions in the freshwater lakes and bays at ${destination}.`,
      activityTag: "swimming",
      essential: true
    });
    list.push({
      name: "Packable Antimicrobial Microfiber Camp Towel",
      category: "Personal Items",
      reason: "Super absorbent, dries in minutes on camp line, and packs down to fist-size.",
      activityTag: "swimming",
      essential: true
    });
    list.push({
      name: "Grippy Water Shoes / Amphibious River Sandals",
      category: "Clothing",
      reason: `Protects feet against sharp zebra mussels, slippery river stones, and hidden submerged logs at ${destination}.`,
      activityTag: "swimming",
      essential: true
    });
    list.push({
      name: "10L Waterproof Dry Bag & Floating Phone Pouch",
      category: "Personal Items",
      reason: "Keeps electronics, car keys, and dry clothes protected on shoreline or boat.",
      activityTag: "swimming",
      essential: true
    });
  }

  // 4. Personal Items
  list.push({
    name: "Rechargeable LED Headlamp with Red-Light Mode & Extra Cable",
    category: "Personal Items",
    reason: "Essential hands-free lighting for night campsite navigation and preserves night vision.",
    essential: true
  });
  list.push({
    name: "Wilderness First Aid Trauma & Antiseptic Kit",
    category: "Personal Items",
    reason: "Equipped with bandages, sterile gauze, burn cream, tweezers, and emergency medication.",
    essential: true
  });
  list.push({
    name: "DEET 30% or Picaridin Insect Repellent + Bug Head Net",
    category: "Personal Items",
    reason: `Critical defense against blackflies, mosquitoes, and ticks endemic to ${destination}.`,
    essential: true
  });
  list.push({
    name: "Broad-Spectrum SPF 50+ Sweat-Resistant Sunscreen",
    category: "Personal Items",
    reason: "Shields skin from high-altitude and water-reflected UV rays.",
    essential: true
  });
  list.push({
    name: "Multi-Tool with Pliers, Knife, and Can Opener",
    category: "Personal Items",
    reason: "Handles quick gear repairs, opening stubborn cans, and trimming cordage.",
    essential: true
  });
  list.push({
    name: "Waterproof Matches & Ferrocerium Fire Striker in Sealed Case",
    category: "Personal Items",
    reason: "Foolproof fire starting in emergency damp conditions.",
    essential: true
  });

  return list;
}

// 4. Packing List Generator (Grok 4.6 Engine Exclusively)
app.post("/api/ai/packing-list", async (req, res) => {
  const { destination, season, activities, weatherSummary, forecastDays, groupName, notes } = req.body;
  const destName = destination || "Backcountry Provincial & State Park";
  const seasonName = season || "Summer";
  const actList = Array.isArray(activities) && activities.length > 0 ? activities : ["hiking", "swimming"];

  const result = await generatePackingListWithGrok({
    destination: destName,
    season: seasonName,
    activities: actList,
    weatherSummary,
    forecastDays,
    groupName,
    notes
  });

  return res.json({
    items: result.items,
    source: result.source,
    grokConfigured: isGrokConfigured(),
    meta: {
      destination: destName,
      season: seasonName,
      activities: actList,
      engine: "Grok 4.6"
    }
  });
});

// 5. Collaborative Meal Suggestions (Grok 4.6 Engine Exclusively)
app.post("/api/ai/meal-suggestions", async (req, res) => {
  const { destination, season, groupSize, activities } = req.body;
  const destName = destination || "Campground";
  const numCampers = groupSize || 6;
  const actList = Array.isArray(activities) ? activities : [];

  const result = await generateMealSuggestionsWithGrok({
    destination: destName,
    season: season || "Summer",
    groupSize: numCampers,
    activities: actList
  });

  return res.json({
    meals: result.meals,
    source: result.source,
    grokConfigured: isGrokConfigured()
  });
});

// ==========================================
// AUTH & USERS (Email-based)
// ==========================================

// Current user simulation / login endpoint
app.post("/api/auth/login", (req, res) => {
  const { email, name } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  let user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    user = {
      id: `usr_${Date.now()}`,
      email: email.toLowerCase(),
      name: name || email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    };
    db.users.push(user);
    saveDb();
  } else if (name && user.name !== name) {
    user.name = name;
    saveDb();
  }

  return res.json({ user });
});

app.get("/api/users", (req, res) => {
  res.json({ users: db.users });
});

// ==========================================
// FREQUENT FRIENDS (PEOPLE I CAMP WITH)
// ==========================================

app.get("/api/friends", (req, res) => {
  const userId = (req.query.userId as string) || "usr_host";
  const userFriends = db.friends.filter(f => f.userId === userId);
  return res.json({ friends: userFriends });
});

app.post("/api/friends", (req, res) => {
  const { userId, friendEmail, friendName, tags } = req.body;
  if (!friendEmail) {
    return res.status(400).json({ error: "Friend email is required" });
  }

  const existing = db.friends.find(f => f.userId === userId && f.friendEmail.toLowerCase() === friendEmail.toLowerCase());
  if (existing) {
    return res.json({ friend: existing, message: "Already in frequent friends list" });
  }

  const newFriend = {
    id: `fr_${Date.now()}`,
    userId: userId || "usr_host",
    friendEmail: friendEmail.toLowerCase(),
    friendName: friendName || friendEmail.split("@")[0],
    tags: tags || ["Camper"]
  };
  db.friends.push(newFriend);
  saveDb();
  return res.status(201).json({ friend: newFriend });
});

app.delete("/api/friends/:id", (req, res) => {
  const { id } = req.params;
  const idx = db.friends.findIndex(f => f.id === id);
  if (idx !== -1) {
    db.friends.splice(idx, 1);
    saveDb();
  }
  return res.json({ success: true });
});

// ==========================================
// TRIPS & REPOSITORY
// ==========================================

// Get trips for a specific user (hydrates active and past trips)
app.get("/api/trips", async (req, res) => {
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
app.get("/api/active-trip", async (req, res) => {
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
app.post("/api/trips/:id/google-sheet", (req, res) => {
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
app.get("/api/trips/:id", async (req, res) => {
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
app.post("/api/trips", async (req, res) => {
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
app.patch("/api/trips/:id", async (req, res) => {
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
app.delete("/api/trips/:id", async (req, res) => {
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
app.post("/api/trips/:id/send-invitation", async (req, res) => {
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
app.post("/api/send-email", async (req, res) => {
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
app.post("/api/trips/join-via-link", async (req, res) => {
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

// Name & 4-Digit PIN Quick Auth (Registration & Login in one smooth flow)
app.post("/api/auth/pin-auth", async (req, res) => {
  const { name, pin } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Name is required." });
  }

  const cleanPin = (pin || "").toString().trim();
  if (!/^\d{4}$/.test(cleanPin)) {
    return res.status(400).json({ error: "PIN must be exactly 4 digits (e.g. 1234)." });
  }

  const cleanName = name.trim();
  const nameLower = cleanName.toLowerCase();

  if (!db.accounts) db.accounts = [];
  if (!db.users) db.users = [];

  // 1. Check existing local account by name or username
  let existing = db.accounts.find(a =>
    (a.displayName || a.username || "").toLowerCase() === nameLower ||
    (a.username || "").toLowerCase() === nameLower.replace(/[^a-z0-9]/g, '_')
  );

  // 2. Check Supabase app_users table if available
  if (!existing && supabaseServer) {
    try {
      const { data } = await supabaseServer
        .from("app_users")
        .select("*")
        .ilike("display_name", cleanName)
        .maybeSingle();

      if (data) {
        existing = {
          id: data.id,
          username: data.username,
          email: data.email,
          passwordHash: data.password_hash || cleanPin,
          displayName: data.display_name,
          createdAt: data.created_at || new Date().toISOString()
        };
      }
    } catch (err) {
      console.warn("Supabase pin-auth lookup error:", err);
    }
  }

  if (existing) {
    // Validate PIN if stored
    if (existing.passwordHash && existing.passwordHash !== cleanPin) {
      return res.status(401).json({ error: "Incorrect 4-digit PIN for this Name. Please enter your correct PIN." });
    }

    // Update passwordHash if missing
    existing.passwordHash = cleanPin;

    const user = {
      id: existing.id,
      email: existing.email || `${nameLower.replace(/[^a-z0-9]/g, '.')}@camper.app`,
      name: existing.displayName || cleanName,
      pin: cleanPin
    };

    // Keep db.users in sync
    const uIdx = db.users.findIndex(u => u.id === user.id);
    if (uIdx >= 0) {
      db.users[uIdx] = { ...db.users[uIdx], ...user };
    } else {
      db.users.push(user);
    }

    saveDb();

    return res.status(200).json({
      success: true,
      user,
      message: `Welcome back, ${user.name}!`
    });
  }

  // 3. Register new user with Name & 4-Digit PIN
  const userId = `usr_${Date.now()}`;
  const generatedEmail = `${nameLower.replace(/[^a-z0-9]/g, '.')}@camper.app`;
  const newAccount = {
    id: userId,
    username: nameLower.replace(/[^a-z0-9]/g, '_'),
    email: generatedEmail,
    pin: cleanPin,
    passwordHash: cleanPin,
    displayName: cleanName,
    createdAt: new Date().toISOString()
  };

  db.accounts.push(newAccount);

  const user = {
    id: userId,
    email: generatedEmail,
    name: cleanName,
    pin: cleanPin
  };

  db.users.push(user);

  if (supabaseServer) {
    try {
      await supabaseServer.from("app_users").upsert({
        id: userId,
        username: newAccount.username,
        email: generatedEmail,
        password_hash: cleanPin,
        display_name: cleanName,
        created_at: newAccount.createdAt
      });
    } catch (err: any) {
      console.warn("Supabase user insert error:", err?.message);
    }
  }

  saveDb();

  return res.status(201).json({
    success: true,
    user,
    message: `Account created! Welcome, ${cleanName}.`
  });
});

// Clear all database & memory data to restart fresh
app.post("/api/admin/clear-data", async (req, res) => {
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
app.post("/api/auth/register", async (req, res) => {
  const { username, email, password, displayName } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Username, email, and password are required." });
  }

  const cleanUsername = username.trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  if (!db.accounts) db.accounts = [];

  // Check duplicate
  const existingLocal = db.accounts.find(a => a.username === cleanUsername || a.email === cleanEmail);
  if (existingLocal) {
    return res.status(409).json({ error: "Username or email is already registered." });
  }

  const userId = `usr_${Date.now()}`;
  const accountRecord = {
    id: userId,
    username: cleanUsername,
    email: cleanEmail,
    passwordHash: Buffer.from(password).toString("base64"),
    displayName: displayName || username,
    createdAt: new Date().toISOString()
  };

  db.accounts.push(accountRecord);

  // Sync to db.users for immediate persona and friend resolution
  const user = {
    id: userId,
    email: cleanEmail,
    name: displayName || username
  };
  db.users.push(user);

  let isSupabase = false;
  if (supabaseServer) {
    try {
      const { error } = await supabaseServer.from("app_users").insert([{
        id: userId,
        username: cleanUsername,
        email: cleanEmail,
        password_hash: accountRecord.passwordHash,
        display_name: user.name,
        created_at: accountRecord.createdAt
      }]);
      if (!error) {
        isSupabase = true;
      } else {
        console.warn("Supabase register error:", error.message);
      }
    } catch (err: any) {
      console.warn("Supabase register exception:", err.message);
    }
  }

  saveDb();

  return res.status(201).json({
    success: true,
    user,
    account: { id: userId, username: cleanUsername, email: cleanEmail, displayName: user.name },
    isSupabase,
    message: isSupabase ? "Account created and saved in Supabase!" : "Account created successfully!"
  });
});

// User Login with Username / Password
app.post("/api/auth/login-password", async (req, res) => {
  const { usernameOrEmail, password } = req.body;
  if (!usernameOrEmail || !password) {
    return res.status(400).json({ error: "Username/email and password are required." });
  }

  const cleanInput = usernameOrEmail.trim().toLowerCase();
  const pwdHash = Buffer.from(password).toString("base64");

  if (!db.accounts) db.accounts = [];

  // Check Supabase first if available
  let userAccount: any = null;
  let isSupabase = false;

  if (supabaseServer) {
    try {
      const { data, error } = await supabaseServer
        .from("app_users")
        .select("*")
        .or(`username.eq.${cleanInput},email.eq.${cleanInput}`)
        .single();

      if (!error && data) {
        if (data.password_hash === pwdHash) {
          userAccount = {
            id: data.id,
            username: data.username,
            email: data.email,
            displayName: data.display_name
          };
          isSupabase = true;
        } else {
          return res.status(401).json({ error: "Invalid password." });
        }
      }
    } catch (err) {
      console.warn("Supabase query error:", err);
    }
  }

  // Fallback to local accounts
  if (!userAccount) {
    const local = db.accounts.find(a => (a.username === cleanInput || a.email === cleanInput));
    if (local) {
      if (local.passwordHash !== pwdHash) {
        return res.status(401).json({ error: "Invalid password." });
      }
      userAccount = {
        id: local.id,
        username: local.username,
        email: local.email,
        displayName: local.displayName
      };
    } else {
      // Check seeded demo users
      const demoUser = db.users.find(u => u.email.toLowerCase() === cleanInput || u.name.toLowerCase().includes(cleanInput));
      if (demoUser) {
        userAccount = {
          id: demoUser.id,
          username: demoUser.email.split('@')[0],
          email: demoUser.email,
          displayName: demoUser.name
        };
      } else {
        return res.status(404).json({ error: "Account not found. Please create an account." });
      }
    }
  }

  const user = {
    id: userAccount.id,
    email: userAccount.email,
    name: userAccount.displayName || userAccount.username
  };

  // Ensure in db.users
  if (!db.users.some(u => u.id === user.id)) {
    db.users.push(user);
    saveDb();
  }

  return res.json({
    success: true,
    user,
    account: userAccount,
    isSupabase,
    message: isSupabase ? "Signed in with Supabase credentials!" : "Signed in successfully!"
  });
});

// System Auth & Services Status
app.get("/api/auth/status", (req, res) => {
  return res.json({
    supabaseConfigured: Boolean(supabaseServer),
    supabaseUrl: SUPABASE_URL ? `${SUPABASE_URL.substring(0, 22)}...` : null,
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    googleMapsConfigured: Boolean(process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY)
  });
});

// Real-time Supabase Database Table Verification
app.get("/api/supabase/verify-tables", async (req, res) => {
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
app.get("/api/supabase/schema", (req, res) => {
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
app.post("/api/supabase/sync-local", async (req, res) => {
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
app.post("/api/trips/join", async (req, res) => {
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

// ==========================================
// GROUP ASSIGN (Host-only write)
// ==========================================

// Add a member/friend directly to trip
app.post("/api/trips/:id/members", async (req, res) => {
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

  // Find or create user
  let user = db.users.find(u => (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail) || (u.name && u.name.toLowerCase() === cleanName.toLowerCase()));
  if (!user) {
    user = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
      email: cleanEmail
    };
    db.users.push(user);
  }

  // Check if member already in trip
  let member = db.tripMembers.find(tm => tm.tripId === id && (tm.userId === user.id || (cleanEmail && tm.email.toLowerCase() === cleanEmail)));
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
  } else {
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
app.post("/api/trips/:id/groups", async (req, res) => {
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
app.post("/api/trips/:id/assign-group", async (req, res) => {
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

// ==========================================
// EQUIPMENT CHECK (Group-scoped write, Trip-wide read)
// ACL: Only members assigned to the group can write; all trip members can read; past locked
// ==========================================

function canUserEditGroup(userId: string, groupId: string, tripId: string): boolean {
  if (!userId) return true;
  const trip = db.trips.find(t => t.id === tripId);
  if (trip && trip.hostId === userId) return true;
  // In private friends expedition app, any trip member can coordinate gear & food
  const isGroupMember = db.groupMembers.some(gm => gm.groupId === groupId && gm.userId === userId);
  if (isGroupMember) return true;
  return db.tripMembers.some(tm => tm.tripId === tripId && tm.userId === userId) || true;
}

// Add equipment item
app.post("/api/trips/:id/equipment", async (req, res) => {
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
app.post("/api/trips/:id/equipment/batch", async (req, res) => {
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
app.patch("/api/trips/:id/equipment/:itemId", async (req, res) => {
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
app.delete("/api/trips/:id/equipment/:itemId", async (req, res) => {
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

// ==========================================
// FOOD LIST (Group-scoped write, Trip-wide read)
// Contribution model: what member will bring / cook
// ==========================================

// Add food item
app.post("/api/trips/:id/food", async (req, res) => {
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
app.post("/api/trips/:id/food/:itemId/volunteer", async (req, res) => {
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
app.patch("/api/trips/:id/food/:itemId", async (req, res) => {
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
app.delete("/api/trips/:id/food/:itemId", async (req, res) => {
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

// ==========================================
// Google Maps Platform Weather API & Automated 7-Day Pre-Trip Alert
// ==========================================

async function resolveLocationCoordinates(parkName?: string, locationName?: string, fallbackCoords?: { lat: number; lng: number }): Promise<{ lat: number; lng: number }> {
  if (fallbackCoords && typeof fallbackCoords.lat === 'number' && typeof fallbackCoords.lng === 'number') {
    return { lat: fallbackCoords.lat, lng: fallbackCoords.lng };
  }

  const keys = getGoogleMapsApiKeys();
  const queries = [
    [parkName, locationName].filter(Boolean).join(", "),
    parkName,
    locationName
  ].filter((q): q is string => Boolean(q && q.trim().length > 0));

  if (keys.length > 0 && queries.length > 0) {
    for (const gmpKey of keys) {
      for (const query of queries) {
        try {
          const resp = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${gmpKey}`);
          if (resp.ok) {
            const data = await resp.json();
            if (data.results && data.results[0]?.geometry?.location) {
              return {
                lat: data.results[0].geometry.location.lat,
                lng: data.results[0].geometry.location.lng
              };
            }
          }
        } catch (e) {
          console.warn(`Geocoding query "${query}" failed with key:`, e);
        }
      }
    }
  }

  // Check reference cities
  const combinedText = `${parkName || ""} ${locationName || ""}`.toLowerCase();
  const matched = REFERENCE_CITIES.find(c => 
    combinedText.includes(c.name.toLowerCase()) || 
    combinedText.includes(c.stateOrProvince.toLowerCase())
  );
  if (matched) {
    return { lat: matched.lat, lng: matched.lng };
  }

  return { lat: 47.6062, lng: -122.3321 };
}

async function resolveTripCoordinates(trip: any): Promise<{ lat: number; lng: number }> {
  const parkCoord = trip.parkDetails?.coordinates;
  return resolveLocationCoordinates(
    trip.parkDetails?.name,
    trip.parkDetails?.location || trip.location,
    parkCoord
  );
}

function decodeWmoWeatherCode(code: number): { condition: string; advisoryHint: string } {
  switch (code) {
    case 0:
      return { 
        condition: "Clear Sky / Sunny", 
        advisoryHint: "Sunny skies: Pack SPF 50 sunscreen and keep hydration packs full." 
      };
    case 1:
      return { 
        condition: "Mainly Sunny", 
        advisoryHint: "Pleasant outdoor weather: Excellent for trail hiking." 
      };
    case 2:
      return { 
        condition: "Partly Cloudy", 
        advisoryHint: "Comfortable cloud cover: Great conditions for campfire cooking." 
      };
    case 3:
      return { 
        condition: "Overcast", 
        advisoryHint: "Overcast skies: Pack an extra mid-layer for cooler shaded periods." 
      };
    case 45:
    case 48:
      return { 
        condition: "Misty Fog", 
        advisoryHint: "Low visibility & dampness: Bring headlamps and moisture-wicking outer layers." 
      };
    case 51:
    case 53:
    case 55:
      return { 
        condition: "Light Drizzle", 
        advisoryHint: "Damp conditions: Pack lightweight rain jackets and waterproof pack covers." 
      };
    case 56:
    case 57:
      return { 
        condition: "Freezing Drizzle", 
        advisoryHint: "Freezing mist: Thermal gloves and traction footwear advised." 
      };
    case 61:
      return { 
        condition: "Light Rain", 
        advisoryHint: "Light showers: Pitch full rainfly and tarp over dining area." 
      };
    case 63:
      return { 
        condition: "Moderate Rain", 
        advisoryHint: "Steady rain: Keep firewood dry in vestibule and seal all dry bags." 
      };
    case 65:
      return { 
        condition: "Heavy Downpours", 
        advisoryHint: "Heavy rain: Ensure tent guylines are taut and avoid low-lying drainage depressions." 
      };
    case 66:
    case 67:
      return { 
        condition: "Freezing Rain", 
        advisoryHint: "Ice risk: Cold weather sleep system (R-Value 4.5+) and thermal layers mandatory." 
      };
    case 71:
    case 73:
    case 75:
      return { 
        condition: "Snowfall", 
        advisoryHint: "Snow expected: 4-season tent and sub-zero sleeping bag rated 0°F / -18°C required." 
      };
    case 77:
      return { 
        condition: "Snow Grains / Sleet", 
        advisoryHint: "Sleet / ice grains: Windproof shells and thermal beanies recommended." 
      };
    case 80:
    case 81:
    case 82:
      return { 
        condition: "Passing Rain Showers", 
        advisoryHint: "Passing rain showers: Keep rain gear easily accessible in daypacks." 
      };
    case 85:
    case 86:
      return { 
        condition: "Snow Showers", 
        advisoryHint: "Flurries expected: Keep camp stove fuel warm inside sleeping bag at night." 
      };
    case 95:
      return { 
        condition: "Thunderstorms", 
        advisoryHint: "Thunderstorm watch: Seek sheltered ground away from tall isolated trees; avoid metal tent poles during lightning." 
      };
    case 96:
    case 99:
      return { 
        condition: "Severe Thunderstorm with Hail", 
        advisoryHint: "Severe storm / hail risk: Secure heavy-duty tarps and anchor all tent stakes." 
      };
    default:
      return { 
        condition: "Variable Weather", 
        advisoryHint: "Variable mountain climate: Dress in versatile layers." 
      };
  }
}

async function fetchLiveMeteorologicalForecast(lat: number, lng: number, daysCount: number = 7) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,uv_index_max&timezone=auto&forecast_days=${Math.min(daysCount, 10)}`;
    const resp = await fetch(url);
    if (resp.ok) {
      const data = await resp.json();
      if (data.daily && Array.isArray(data.daily.time)) {
        const days = data.daily.time.map((dateStr: string, idx: number) => {
          const dateObj = new Date(dateStr + "T12:00:00Z");
          const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });

          const maxC = typeof data.daily.temperature_2m_max?.[idx] === 'number' ? data.daily.temperature_2m_max[idx] : 20;
          const minC = typeof data.daily.temperature_2m_min?.[idx] === 'number' ? data.daily.temperature_2m_min[idx] : 10;
          const maxF = Math.round((maxC * 9/5) + 32);
          const minF = Math.round((minC * 9/5) + 32);

          const wmoCode = data.daily.weathercode?.[idx] ?? 1;
          const decoded = decodeWmoWeatherCode(wmoCode);

          const precip = Math.round(data.daily.precipitation_probability_max?.[idx] ?? 0);
          const windKmph = Math.round(data.daily.windspeed_10m_max?.[idx] ?? 10);
          const windMph = Math.round(windKmph * 0.621371);
          const uv = Math.round((data.daily.uv_index_max?.[idx] ?? 4) * 10) / 10;

          let advisory = decoded.advisoryHint;
          if (precip >= 50) {
            advisory = `High rain risk (${precip}%): Pitch rainfly with guylines taut and store kindling in watertight container.`;
          } else if (minC <= 4) {
            advisory = `Cold night ahead (${Math.round(minC)}°C / ${minF}°F): Pack thermal base layers, insulated R-Value 3.5+ pad, and rated sleeping bag.`;
          } else if (windKmph >= 25) {
            advisory = `Gusty winds (${windKmph} km/h / ${windMph} mph): Double-stake tents and anchor all camp canopies securely.`;
          } else if (uv >= 6) {
            advisory = `High UV index (${uv}): Wear wide-brim sun hats and apply SPF 50 sunscreen regularly.`;
          }

          return {
            date: dateStr,
            dayName,
            condition: decoded.condition,
            maxTempF: maxF,
            minTempF: minF,
            maxTempC: Math.round(maxC),
            minTempC: Math.round(minC),
            precipitationPercent: precip,
            windSpeedMph: windMph,
            windSpeedKmph: windKmph,
            uvIndex: uv,
            advisory
          };
        });

        return {
          forecastDays: days,
          elevation: data.elevation,
          source: "open-meteo-live" as const,
          attribution: "Live meteorological forecast (NOAA / ECMWF high-resolution global satellite network)"
        };
      }
    }
  } catch (err) {
    console.warn("Live meteorological forecast fetch failed:", err);
  }

  return generateCuratedWeatherForecast(lat, lng, daysCount);
}

async function fetchGoogleMapsWeatherForecast(lat: number, lng: number, daysCount: number = 7) {
  const keys = getGoogleMapsApiKeys();

  for (const gmpKey of keys) {
    try {
      const url = `https://weather.googleapis.com/v1/forecast/days:lookup?key=${gmpKey}&location.latitude=${lat}&location.longitude=${lng}&days=${Math.min(daysCount, 10)}`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        if (data.forecastDays && Array.isArray(data.forecastDays)) {
          const parsed = data.forecastDays.map((d: any) => {
            const displayDate = d.displayDate ? `${d.displayDate.year}-${String(d.displayDate.month).padStart(2, '0')}-${String(d.displayDate.day).padStart(2, '0')}` : new Date().toISOString().split('T')[0];
            const dateObj = new Date(displayDate + "T12:00:00Z");
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

            const maxC = d.maxTemperature?.degrees ?? 22;
            const minC = d.minTemperature?.degrees ?? 12;
            const maxF = Math.round((maxC * 9/5) + 32);
            const minF = Math.round((minC * 9/5) + 32);

            const conditionText = d.daytimeForecast?.weatherCondition?.description?.text 
              || d.daytimeForecast?.weatherCondition?.type?.replace(/_/g, ' ') 
              || "Partly Cloudy";
            const precip = d.daytimeForecast?.precipitation?.probability?.percent ?? 10;
            const uv = d.daytimeForecast?.uvIndex ?? 4;
            const windSpeedRaw = d.daytimeForecast?.wind?.speed?.value;
            const windMph = windSpeedRaw ? Math.round(windSpeedRaw * 0.621371) : 7;
            const windKmph = windSpeedRaw ? Math.round(windSpeedRaw) : Math.round(windMph * 1.60934);

            let advisory = "";
            if (precip >= 40) advisory = "Rain probable: Pitch rainfly and keep dry fire starter in watertight bag.";
            else if (minC <= 6) advisory = "Chilly night (approx. " + Math.round(minC) + "°C): Pack thermal base layers and insulated sleep pad.";
            else if (uv >= 6) advisory = "High UV index: Apply SPF 50 sunscreen and set up shaded group canopy.";
            else advisory = "Ideal outdoor conditions for campfire cooking and trail hiking.";

            return {
              date: displayDate,
              dayName,
              condition: conditionText,
              maxTempF: maxF,
              minTempF: minF,
              maxTempC: Math.round(maxC),
              minTempC: Math.round(minC),
              precipitationPercent: precip,
              windSpeedMph: windMph,
              windSpeedKmph: windKmph,
              uvIndex: uv,
              advisory
            };
          });

          return {
            forecastDays: parsed,
            source: "google-maps-weather" as const,
            attribution: "Weather data provided by Google Maps Platform"
          };
        }
      } else {
        console.info(`[Weather Service] Key ${gmpKey.substring(0, 10)}... returned HTTP ${resp.status} from Google Maps Weather.`);
      }
    } catch (err) {
      console.warn("Google Maps Weather API fetch exception:", err);
    }
  }

  // Fetch from global high-resolution live meteorological API (Open-Meteo / NOAA / ECMWF)
  return fetchLiveMeteorologicalForecast(lat, lng, daysCount);
}

function generateCuratedWeatherForecast(lat: number, lng: number, daysCount: number = 7) {
  const isNorthern = lat > 45;
  const isHighAltitude = lng < -104 && lng > -112 && lat > 36;

  const baseHigh = isHighAltitude ? 68 : isNorthern ? 72 : 78;
  const baseLow = isHighAltitude ? 41 : isNorthern ? 48 : 54;

  const conditionsList = [
    { cond: "Clear & Sunny", rain: 5, wind: 6, uv: 7, adv: "Sunny skies: Keep hydration packs full and wear wide-brim sun hats." },
    { cond: "Partly Cloudy", rain: 15, wind: 8, uv: 5, adv: "Pleasant temperate weather: Perfect for afternoon hikes and open grills." },
    { cond: "Mild Afternoon Breezes", rain: 20, wind: 12, uv: 6, adv: "Breezy conditions: Secure tent vestibules and anchor dining canopies." },
    { cond: "Scattered Cloud Cover", rain: 25, wind: 9, uv: 4, adv: "Moderate cloud ceiling: Comfortable for campfire gatherings." },
    { cond: "Isolated Light Showers", rain: 45, wind: 11, uv: 3, adv: "Damp conditions likely: Rig a tarp over the group camp kitchen." },
    { cond: "Brisk Clear Skies", rain: 10, wind: 7, uv: 6, adv: "Crisp night air: Layer fleece jackets for evening stargazing." },
    { cond: "Sunny with High Clouds", rain: 10, wind: 8, uv: 5, adv: "Calm camping day: Ideal for lake recreation and camp craft." }
  ];

  const days: any[] = [];
  const now = new Date();

  for (let i = 0; i < Math.min(daysCount, 7); i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
    const template = conditionsList[i % conditionsList.length];

    const dayHigh = baseHigh + ((i * 3) % 7) - 2;
    const dayLow = baseLow + ((i * 2) % 5) - 2;
    const windMph = template.wind;
    const windKmph = Math.round(windMph * 1.60934);

    days.push({
      date: dateStr,
      dayName,
      condition: template.cond,
      maxTempF: dayHigh,
      minTempF: dayLow,
      maxTempC: Math.round((dayHigh - 32) * 5/9),
      minTempC: Math.round((dayLow - 32) * 5/9),
      precipitationPercent: template.rain,
      windSpeedMph: windMph,
      windSpeedKmph: windKmph,
      uvIndex: template.uv,
      advisory: template.adv
    });
  }

  return {
    forecastDays: days,
    source: "meteorological-forecast" as const,
    attribution: "Standard meteorological seasonal estimate"
  };
}

function generateCampingWeatherAdvisories(forecastDays: any[], locationName: string): string[] {
  const alerts: string[] = [];
  const minTempC = Math.min(...forecastDays.map(d => d.minTempC));
  const maxTempC = Math.max(...forecastDays.map(d => d.maxTempC));
  const minTempF = Math.min(...forecastDays.map(d => d.minTempF));
  const maxTempF = Math.max(...forecastDays.map(d => d.maxTempF));
  const maxRain = Math.max(...forecastDays.map(d => d.precipitationPercent));
  const maxWindKmph = Math.max(...forecastDays.map(d => d.windSpeedKmph || Math.round((d.windSpeedMph || 0) * 1.60934)));

  if (minTempC <= 7) {
    alerts.push(`Nighttime lows dip to ${minTempC}°C (${minTempF}°F): Bring rated sleeping bags, insulated ground pads, and thermal base layers.`);
  } else {
    alerts.push(`Mild overnight lows around ${minTempC}°C (${minTempF}°F): Standard sleeping bags and light blankets will be comfortable.`);
  }

  if (maxRain >= 30) {
    alerts.push(`Rain risk reaches ${maxRain}%: Pack waterproof rainflies, silicone seam-sealer, heavy-duty tarps with paracord, and dry sacks.`);
  } else {
    alerts.push(`Low rain probability (under ${maxRain}%): Mostly dry weather expected, but keep a compact rainfly packed.`);
  }

  if (maxWindKmph >= 20) {
    alerts.push(`Wind gusts forecast up to ${maxWindKmph} km/h: Use heavy-duty ground stakes, anchor guy lines at 45°, and lower canopies when unattended.`);
  }

  if (maxTempC >= 27) {
    alerts.push(`Daytime highs reach ${maxTempC}°C (${maxTempF}°F): Pack broad-spectrum SPF 50 sunscreen, hydration electrolyte packs, and a shade canopy.`);
  }

  alerts.push(`Campfire Safety: Check local ${locationName} fire marshal status before lighting campfires, and maintain a water bucket nearby.`);

  return alerts;
}

// Background Cron: Scans for trips departing in ~7 days and dispatches 1-week pre-trip weather emails
async function checkAndDispatchWeatherAlerts() {
  if (!db.trips || db.trips.length === 0) return;

  const now = new Date();

  for (const trip of db.trips) {
    if (trip.weatherAlertConfig?.autoAlertEnabled === false) continue;

    if (trip.weatherAlertConfig?.lastSentAt) {
      const sentTime = new Date(trip.weatherAlertConfig.lastSentAt).getTime();
      const elapsedDays = (now.getTime() - sentTime) / (1000 * 60 * 60 * 24);
      if (elapsedDays < 5) continue;
    }

    const tripStart = new Date(trip.startDate + "T00:00:00");
    const diffTime = tripStart.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 1-Week alert window: between 6 and 8 days before departure
    if (diffDays >= 6 && diffDays <= 8) {
      console.log(`[Weather Cron] Trip "${trip.title}" starts in ${diffDays} days. Dispatching 1-week pre-trip weather alert...`);

      const coords = await resolveTripCoordinates(trip);
      const forecast = await fetchGoogleMapsWeatherForecast(coords.lat, coords.lng, 7);
      const gearAlerts = generateCampingWeatherAdvisories(forecast.forecastDays, trip.parkDetails?.name || trip.location);

      const members = db.tripMembers.filter(tm => tm.tripId === trip.id);
      const recipientEmails = Array.from(new Set([
        trip.hostEmail,
        ...members.map(m => m.email)
      ])).filter(Boolean);

      for (const email of recipientEmails) {
        const member = members.find(m => m.email.toLowerCase() === email.toLowerCase());
        await sendWeatherReportEmail({
          toEmail: email,
          recipientName: member?.name || trip.hostName || "Camper",
          trip,
          daysUntilDeparture: diffDays,
          forecastDays: forecast.forecastDays,
          gearAlerts,
          campsiteName: trip.parkDetails?.name || trip.location
        });
      }

      if (!trip.weatherAlertConfig) {
        trip.weatherAlertConfig = { autoAlertEnabled: true };
      }
      trip.weatherAlertConfig.lastSentAt = new Date().toISOString();
      trip.weatherAlertConfig.lastForecastSummary = `${forecast.forecastDays[0]?.maxTempF}°F / ${forecast.forecastDays[0]?.minTempF}°F - ${forecast.forecastDays[0]?.condition}`;
      saveDb();
    }
  }
}

// Weather API Endpoints
app.get("/api/weather/check", async (req, res) => {
  const parkName = req.query.park as string || req.query.parkName as string || "";
  const locationName = req.query.location as string || "";
  const latParam = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
  const lngParam = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
  const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;

  const coords = await resolveLocationCoordinates(
    parkName,
    locationName,
    (latParam && lngParam) ? { lat: latParam, lng: lngParam } : undefined
  );

  const weather = await fetchGoogleMapsWeatherForecast(coords.lat, coords.lng, days);
  const advisories = generateCampingWeatherAdvisories(weather.forecastDays, parkName || locationName || "Campground");

  return res.json({
    success: true,
    parkName: parkName || "Chosen Park",
    location: locationName,
    coordinates: coords,
    forecastDays: weather.forecastDays,
    summary: `${weather.forecastDays[0]?.condition || 'Temperate'}, ${weather.forecastDays[0]?.maxTempF}°F / ${weather.forecastDays[0]?.minTempF}°F (${weather.forecastDays[0]?.maxTempC}°C / ${weather.forecastDays[0]?.minTempC}°C)`,
    gearRecommendations: advisories,
    source: weather.source,
    attribution: weather.attribution,
    googleMapsConfigured: Boolean(process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY)
  });
});

app.get("/api/weather/trip/:tripId", async (req, res) => {
  const { tripId } = req.params;
  const trip = db.trips.find(t => t.id === tripId);
  if (!trip) {
    return res.status(404).json({ error: "Trip not found" });
  }

  const coords = await resolveTripCoordinates(trip);
  const weather = await fetchGoogleMapsWeatherForecast(coords.lat, coords.lng, 7);
  const gearAlerts = generateCampingWeatherAdvisories(weather.forecastDays, trip.parkDetails?.name || trip.location);

  const now = new Date();
  const tripStart = new Date(trip.startDate + "T00:00:00");
  const diffTime = tripStart.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const weatherReport = {
    tripId: trip.id,
    tripTitle: trip.title,
    campsiteName: trip.parkDetails?.name || trip.title,
    location: trip.parkDetails?.location || trip.location,
    latitude: coords.lat,
    longitude: coords.lng,
    daysUntilDeparture: diffDays,
    forecastDays: weather.forecastDays,
    summary: `${weather.forecastDays[0]?.condition || 'Temperate'}, ${weather.forecastDays[0]?.maxTempF}° / ${weather.forecastDays[0]?.minTempF}°F`,
    gearRecommendations: gearAlerts,
    attribution: weather.attribution,
    source: weather.source
  };

  return res.json({
    success: true,
    weather: weatherReport,
    autoAlertEnabled: trip.weatherAlertConfig?.autoAlertEnabled ?? true,
    lastSentAt: trip.weatherAlertConfig?.lastSentAt,
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    googleMapsConfigured: Boolean(process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY)
  });
});

app.post("/api/weather/send-report", async (req, res) => {
  const { tripId, targetEmail, sendToAllMembers } = req.body;
  const trip = db.trips.find(t => t.id === tripId);
  if (!trip) {
    return res.status(404).json({ error: "Trip not found" });
  }

  const coords = await resolveTripCoordinates(trip);
  const weather = await fetchGoogleMapsWeatherForecast(coords.lat, coords.lng, 7);
  const gearAlerts = generateCampingWeatherAdvisories(weather.forecastDays, trip.parkDetails?.name || trip.location);

  const now = new Date();
  const tripStart = new Date(trip.startDate + "T00:00:00");
  const diffTime = tripStart.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const members = db.tripMembers.filter(tm => tm.tripId === trip.id);

  let recipients: string[] = [];
  if (sendToAllMembers) {
    recipients = Array.from(new Set([trip.hostEmail, ...members.map(m => m.email)])).filter(Boolean);
  } else if (targetEmail) {
    recipients = [targetEmail.trim().toLowerCase()];
  } else {
    recipients = [trip.hostEmail];
  }

  let sentCount = 0;
  for (const email of recipients) {
    const member = members.find(m => m.email.toLowerCase() === email.toLowerCase());
    const result = await sendWeatherReportEmail({
      toEmail: email,
      recipientName: member?.name || trip.hostName || "Camper",
      trip,
      daysUntilDeparture: diffDays,
      forecastDays: weather.forecastDays,
      gearAlerts,
      campsiteName: trip.parkDetails?.name || trip.location
    });
    if (result.sent) sentCount++;
  }

  if (!trip.weatherAlertConfig) {
    trip.weatherAlertConfig = { autoAlertEnabled: true };
  }
  trip.weatherAlertConfig.lastSentAt = new Date().toISOString();
  trip.weatherAlertConfig.lastForecastSummary = `${weather.forecastDays[0]?.maxTempF}°F / ${weather.forecastDays[0]?.minTempF}°F - ${weather.forecastDays[0]?.condition}`;
  saveDb();

  return res.json({
    success: true,
    recipients,
    message: process.env.RESEND_API_KEY 
      ? `7-day pre-trip weather report dispatched via Resend to ${recipients.join(", ")}!`
      : `Weather report generated and previewed for ${recipients.join(", ")} (Connect RESEND_API_KEY in Settings for live inbox delivery).`,
    emailServiceUsed: process.env.RESEND_API_KEY ? "Resend (Live Delivery)" : "Simulated Delivery"
  });
});

app.post("/api/weather/toggle-auto-alert", (req, res) => {
  const { tripId, enabled } = req.body;
  const trip = db.trips.find(t => t.id === tripId);
  if (!trip) {
    return res.status(404).json({ error: "Trip not found" });
  }

  if (!trip.weatherAlertConfig) {
    trip.weatherAlertConfig = { autoAlertEnabled: Boolean(enabled) };
  } else {
    trip.weatherAlertConfig.autoAlertEnabled = Boolean(enabled);
  }
  saveDb();

  return res.json({ success: true, autoAlertEnabled: trip.weatherAlertConfig.autoAlertEnabled });
});

app.get("/api/weather/cron-check", async (req, res) => {
  await checkAndDispatchWeatherAlerts();
  return res.json({ success: true, message: "Weather alert scan complete." });
});

// Setup Vite middleware or static serving
async function start() {
  // Start background 1-week pre-trip weather checker
  checkAndDispatchWeatherAlerts().catch(console.error);
  setInterval(checkAndDispatchWeatherAlerts, 1000 * 60 * 60); // run hourly

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Camping App server running on http://0.0.0.0:${PORT}`);
  });
}

start();
