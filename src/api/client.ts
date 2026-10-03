import { Trip, TripMember, Group, GroupMember, EquipmentItem, FoodItem, Friend, ParkRecommendation, LongWeekendOption, User, WeatherReport } from '../types';

export async function fetchUserTrips(userId?: string, email?: string): Promise<{ trips: Trip[]; activeTrips: Trip[]; pastTrips: Trip[] }> {
  const query = new URLSearchParams();
  if (userId) query.set('userId', userId);
  if (email) query.set('email', email);
  
  const res = await fetch(`/api/trips?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch trips');
  return res.json();
}

export async function fetchTripDetails(tripId: string): Promise<{
  trip: Trip;
  isPast: boolean;
  members: TripMember[];
  groups: Group[];
  groupMembers: GroupMember[];
  equipment: EquipmentItem[];
  food: FoodItem[];
}> {
  const res = await fetch(`/api/trips/${tripId}`);
  if (!res.ok) throw new Error('Trip not found');
  return res.json();
}

export async function createTrip(data: {
  title: string;
  hostId: string;
  hostEmail: string;
  hostName: string;
  startDate: string;
  endDate: string;
  location: string;
  parkDetails?: ParkRecommendation | null;
  password: string;
  friendEmails?: string[];
}): Promise<{ trip: Trip }> {
  const res = await fetch('/api/trips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create trip');
  }
  return res.json();
}

export async function updateTrip(tripId: string, data: {
  userId: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  password?: string;
  location?: string;
  parkDetails?: any;
}): Promise<{ trip: Trip }> {
  const res = await fetch(`/api/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update trip');
  }
  return res.json();
}

export async function joinTrip(data: {
  tripTitle?: string;
  password: string;
  userEmail?: string;
  userName?: string;
  userId?: string;
}): Promise<{ success: boolean; tripId: string; trip: Trip; member: TripMember }> {
  const res = await fetch('/api/trips/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Wrong password, please ask Host for the correct one');
  }
  return res.json();
}

export async function createGroup(tripId: string, data: {
  userId: string;
  name: string;
  siteLabel?: string;
  description?: string;
}): Promise<{ group: Group }> {
  const res = await fetch(`/api/trips/${tripId}/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create group');
  }
  return res.json();
}

export async function assignGroupMember(tripId: string, data: {
  hostUserId: string;
  targetUserId: string;
  groupId: string;
  userEmail?: string;
  userName?: string;
}): Promise<{ success: boolean; groupMembers: GroupMember[]; members?: TripMember[] }> {
  const res = await fetch(`/api/trips/${tripId}/assign-group`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to assign member');
  }
  return res.json();
}

export async function addTripMember(tripId: string, data: {
  hostUserId: string;
  name: string;
  email?: string;
}): Promise<{ success: boolean; member: TripMember; members: TripMember[] }> {
  const res = await fetch(`/api/trips/${tripId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to add member to trip');
  }
  return res.json();
}

export async function addEquipmentItem(tripId: string, data: {
  userId: string;
  groupId: string;
  name: string;
  category?: string;
  assignedTo?: string;
  notes?: string;
  aiSuggested?: boolean;
}): Promise<{ item: EquipmentItem }> {
  const res = await fetch(`/api/trips/${tripId}/equipment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to add equipment item');
  }
  return res.json();
}

export async function batchAddEquipment(tripId: string, data: {
  userId: string;
  groupId: string;
  items: Array<{ name: string; category?: string; notes?: string }>;
}): Promise<{ items: EquipmentItem[] }> {
  const res = await fetch(`/api/trips/${tripId}/equipment/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to seed equipment');
  }
  return res.json();
}

export async function updateEquipmentItem(tripId: string, itemId: string, data: {
  userId: string;
  packed?: boolean;
  name?: string;
  category?: string;
  assignedTo?: string;
  notes?: string;
}): Promise<{ item: EquipmentItem }> {
  const res = await fetch(`/api/trips/${tripId}/equipment/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update item');
  }
  return res.json();
}

export async function deleteEquipmentItem(tripId: string, itemId: string, userId: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/trips/${tripId}/equipment/${itemId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete item');
  }
  return res.json();
}

export async function addFoodItem(tripId: string, data: {
  userId: string;
  groupId?: string;
  mealTime: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  mealType?: string;
  title: string;
  description?: string;
  ingredientsOrItems: string;
  cookOrBringer?: string;
  dayLabel?: string;
  preparers?: Array<{ userId: string; name: string }>;
  ingredientBringers?: Array<{ userId: string; name: string; items?: string }>;
  suggestedBy?: { userId: string; name: string };
}): Promise<{ food: FoodItem }> {
  const res = await fetch(`/api/trips/${tripId}/food`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to add food item');
  }
  return res.json();
}

export async function updateFoodItem(tripId: string, itemId: string, data: {
  userId: string;
  title?: string;
  description?: string;
  mealTime?: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  mealType?: string;
  ingredientsOrItems?: string;
  cookOrBringer?: string;
  preparers?: Array<{ userId: string; name: string }>;
  ingredientBringers?: Array<{ userId: string; name: string; items?: string }>;
  status?: 'planned' | 'purchased' | 'packed';
  dayLabel?: string;
}): Promise<{ food: FoodItem }> {
  const res = await fetch(`/api/trips/${tripId}/food/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update food item');
  }
  return res.json();
}

export async function volunteerForMeal(tripId: string, itemId: string, data: {
  userId: string;
  role: 'prepare' | 'ingredient';
  action: 'toggle' | 'add' | 'remove';
  items?: string;
}): Promise<{ food: FoodItem }> {
  const res = await fetch(`/api/trips/${tripId}/food/${itemId}/volunteer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to volunteer for meal');
  }
  return res.json();
}

export async function deleteFoodItem(tripId: string, itemId: string, userId: string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/trips/${tripId}/food/${itemId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete food item');
  }
  return res.json();
}

export async function getAiPackingList(data: {
  destination: string;
  season: 'Spring' | 'Summer' | 'Fall' | 'Winter';
  activities: string[];
  weatherSummary?: string;
  forecastDays?: any[];
  notes?: string;
  groupName?: string;
}): Promise<{
  items: Array<{
    name: string;
    category: 'Shelter' | 'Cooking' | 'Clothing' | 'Personal Items';
    reason: string;
    activityTag?: string;
    essential: boolean;
  }>;
  source: string;
  meta: { destination: string; season: string; activities: string[]; engine: string };
}> {
  const res = await fetch('/api/ai/packing-list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to generate suggested packing list');
  return res.json();
}

export async function getAiMealSuggestions(data: {
  destination: string;
  season: string;
  groupSize?: number;
  activities?: string[];
}): Promise<{
  meals: Array<{
    mealTime: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
    title: string;
    description: string;
    ingredients: string;
    prepTime: string;
    cookMethod: string;
  }>;
  source: string;
}> {
  const res = await fetch('/api/ai/meal-suggestions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to get meal suggestions');
  return res.json();
}

export async function fetchLongWeekends(year: number = 2026): Promise<{ holidays: LongWeekendOption[] }> {
  const res = await fetch(`/api/ai/long-weekends?year=${year}`);
  if (!res.ok) throw new Error('Failed to fetch long weekends');
  return res.json();
}

export async function getAiParkRecommendations(data: {
  activities: string[];
  driveDistance: string;
  experienceLevel: string;
  startingLocation?: string;
  coordinates?: { lat: number; lng: number };
  customNotes?: string;
}): Promise<{ parks: ParkRecommendation[]; source: string }> {
  const res = await fetch('/api/ai/recommend-parks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to get park recommendations');
  return res.json();
}

export async function verifySupabaseTables(): Promise<{
  configured: boolean;
  projectRef?: string;
  sqlEditorUrl?: string;
  tables: Record<string, { exists: boolean; error?: string }>;
  allReady: boolean;
  readyCount: number;
  totalCount: number;
  message: string;
}> {
  const res = await fetch('/api/supabase/verify-tables');
  if (!res.ok) throw new Error('Failed to verify Supabase tables');
  return res.json();
}

export async function syncLocalToSupabase(): Promise<{
  success: boolean;
  syncedUsers: number;
  syncedTrips: number;
  message: string;
}> {
  const res = await fetch('/api/supabase/sync-local', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to sync to Supabase');
  return res.json();
}

export async function fetchSupabaseSchema(): Promise<{ sql: string }> {
  const res = await fetch('/api/supabase/schema');
  if (!res.ok) throw new Error('Failed to fetch SQL schema');
  return res.json();
}




export async function getAiEquipmentDraft(data: {
  location: string;
  startDate: string;
  endDate: string;
  activities?: string[];
  groupName?: string;
}): Promise<{ equipment: Array<{ name: string; category: string; notes: string }>; source: string }> {
  const res = await fetch('/api/ai/equipment-suggestions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to get equipment suggestions');
  return res.json();
}

export async function loginUser(email: string, name?: string): Promise<{ user: User }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name })
  });
  if (!res.ok) throw new Error('Login failed');
  return res.json();
}

export async function deleteTrip(tripId: string, userId?: string): Promise<{ success: boolean; deletedTripId: string }> {
  const res = await fetch(`/api/trips/${tripId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete trip');
  }
  return res.json();
}

export async function sendTripInvitations(tripId: string, data: {
  hostId: string;
  hostName: string;
  recipientEmails: string[];
  customMessage?: string;
}): Promise<{
  success: boolean;
  invitations: any[];
  dispatchResults?: Array<{ email: string; sent: boolean; reason?: string; isSandboxRestricted?: boolean }>;
  anySandboxBlocked?: boolean;
  emailServiceUsed: string;
  message: string;
}> {
  const res = await fetch(`/api/trips/${tripId}/send-invitation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to send invitations');
  }
  return res.json();
}

export async function joinTripViaLink(
  paramsOrTripId: string | { tripId?: string; token: string; camperEmail?: string; camperName?: string; email?: string; name?: string },
  tokenArg?: string,
  emailArg?: string,
  nameArg?: string
): Promise<{
  success: boolean;
  trip: Trip;
  member: any;
  camper: User;
  message?: string;
}> {
  let tripId = '';
  let token = '';
  let email = '';
  let name = '';

  if (typeof paramsOrTripId === 'object') {
    tripId = paramsOrTripId.tripId || '';
    token = paramsOrTripId.token;
    email = paramsOrTripId.camperEmail || paramsOrTripId.email || '';
    name = paramsOrTripId.camperName || paramsOrTripId.name || '';
  } else {
    tripId = paramsOrTripId;
    token = tokenArg || '';
    email = emailArg || '';
    name = nameArg || '';
  }

  const res = await fetch('/api/trips/join-via-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tripId, token, email, name })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to join trip via link');
  }
  const data = await res.json();
  return {
    ...data,
    camper: data.camper || {
      id: data.member?.userId || `usr_${Date.now()}`,
      email: data.member?.email || email || 'camper@example.com',
      name: data.member?.name || name || 'Camper'
    }
  };
}

export async function loginOrRegisterWithPin(data: {
  name: string;
  pin: string;
}): Promise<{
  user: User;
  message: string;
}> {
  const res = await fetch('/api/auth/pin-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to authenticate with Name & 4-digit PIN');
  }
  return res.json();
}

export async function registerAccount(data: {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}): Promise<{
  user: User;
  account: any;
  isSupabase: boolean;
  message: string;
}> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create account');
  }
  return res.json();
}

export async function loginAccountWithPassword(data: {
  usernameOrEmail: string;
  password: string;
}): Promise<{
  user: User;
  account: any;
  isSupabase: boolean;
  message: string;
}> {
  const res = await fetch('/api/auth/login-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to sign in');
  }
  return res.json();
}

export async function getAuthStatus(): Promise<{
  supabaseConfigured: boolean;
  supabaseUrl: string | null;
  resendConfigured: boolean;
}> {
  try {
    const res = await fetch('/api/auth/status');
    if (!res.ok) return { supabaseConfigured: false, supabaseUrl: null, resendConfigured: false };
    return res.json();
  } catch {
    return { supabaseConfigured: false, supabaseUrl: null, resendConfigured: false };
  }
}

export async function fetchUsers(): Promise<{ users: User[] }> {
  const res = await fetch('/api/users');
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function fetchTripWeather(tripId: string): Promise<{
  success: boolean;
  weather: WeatherReport;
  autoAlertEnabled: boolean;
  lastSentAt?: string;
  resendConfigured: boolean;
  googleMapsConfigured: boolean;
}> {
  const res = await fetch(`/api/weather/trip/${tripId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch weather for trip');
  }
  return res.json();
}

export async function sendTripWeatherReport(data: {
  tripId: string;
  targetEmail?: string;
  sendToAllMembers?: boolean;
}): Promise<{
  success: boolean;
  recipients: string[];
  message: string;
  emailServiceUsed: string;
}> {
  const res = await fetch('/api/weather/send-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to dispatch weather report');
  }
  return res.json();
}

export async function toggleTripWeatherAutoAlert(tripId: string, enabled: boolean): Promise<{
  success: boolean;
  autoAlertEnabled: boolean;
}> {
  const res = await fetch('/api/weather/toggle-auto-alert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tripId, enabled })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update weather alert setting');
  }
  return res.json();
}

export async function fetchActiveTrip(): Promise<{
  trip: Trip | null;
  isPast?: boolean;
  members?: TripMember[];
  groups?: Group[];
  groupMembers?: GroupMember[];
  equipment?: EquipmentItem[];
  food?: FoodItem[];
}> {
  const res = await fetch('/api/active-trip');
  if (!res.ok) throw new Error('Failed to fetch active trip');
  return res.json();
}



