import path from "path";
import fs from "fs";

// In-memory data store with JSON persistence
export const DATA_DIR = path.join(process.cwd(), "data");
export const DATA_FILE = path.join(DATA_DIR, "storage.json");

export interface StorageData {
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
export function getInitialData(): StorageData {
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
export function normalizeFoodItem(item: any): any {
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
export let db: StorageData;
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

export function saveDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error("Error saving DB:", err);
  }
}

// Helper: Check if a trip is in the past
export function isTripPast(trip: { endDate: string }): boolean {
  const today = new Date().toISOString().split("T")[0];
  return trip.endDate < today;
}
