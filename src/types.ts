export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface ParkRecommendation {
  name: string;
  location: string;
  driveDistance: string;
  pricePerNight: string;
  experienceLevel: 'Beginner' | 'Intermediate' | 'Backcountry / Expert';
  restrictions: string[];
  amenities: string[];
  activities: string[];
  description: string;
}

export interface WeatherAlertConfig {
  autoAlertEnabled: boolean;
  lastSentAt?: string;
  lastForecastSummary?: string;
}

export interface WeatherForecastDay {
  date: string;
  dayName: string;
  condition: string;
  maxTempF: number;
  minTempF: number;
  maxTempC: number;
  minTempC: number;
  precipitationPercent: number;
  windSpeedMph: number;
  windSpeedKmph?: number;
  uvIndex: number;
  advisory?: string;
}

export interface WeatherReport {
  tripId: string;
  tripTitle: string;
  campsiteName: string;
  location: string;
  latitude: number;
  longitude: number;
  daysUntilDeparture: number;
  forecastDays: WeatherForecastDay[];
  summary: string;
  gearRecommendations: string[];
  attribution: string;
  source: 'google-maps-weather' | 'meteorological-forecast';
}

export interface Trip {
  id: string;
  title: string;
  hostId: string;
  hostEmail: string;
  hostName: string;
  startDate: string;
  endDate: string;
  location: string;
  parkDetails?: ParkRecommendation;
  password: string;
  passwordExpiresAt?: string;
  createdAt: string;
  weatherAlertConfig?: WeatherAlertConfig;
}

export interface TripMember {
  id: string;
  tripId: string;
  userId: string;
  email: string;
  name: string;
  role: 'host' | 'member';
  joinedAt: string;
}

export interface Group {
  id: string;
  tripId: string;
  name: string;
  siteLabel?: string;
  description?: string;
  createdAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  tripId: string;
  userId: string;
  email: string;
  name: string;
}

export type PackingCategory = 'Shelter' | 'Cooking' | 'Clothing' | 'Personal Items' | 'Shelter & Sleep' | 'Cooking & Water' | 'Lighting & Power' | 'Weather & Layers' | 'Tools & First Aid' | 'General';

export interface EquipmentItem {
  id: string;
  tripId: string;
  groupId: string;
  name: string;
  category: PackingCategory;
  assignedTo: string;
  packed: boolean;
  notes?: string;
  aiSuggested?: boolean;
  activityTag?: string;
  essential?: boolean;
}

export interface PackingSuggestionItem {
  name: string;
  category: 'Shelter' | 'Cooking' | 'Clothing' | 'Personal Items';
  reason: string;
  activityTag?: string;
  essential: boolean;
}

export interface PackingListRequest {
  destination: string;
  season: 'Spring' | 'Summer' | 'Fall' | 'Winter';
  activities: string[];
  notes?: string;
  groupName?: string;
}

export type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export interface MealVolunteer {
  userId: string;
  name: string;
  items?: string;
}

export interface FoodItem {
  id: string;
  tripId: string;
  groupId: string;
  mealTime: MealTime;
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
}

export interface MealSuggestionItem {
  mealTime: MealTime;
  title: string;
  description: string;
  ingredients: string;
  prepTime: string;
  cookMethod: string;
}

export interface Friend {
  id: string;
  userId: string;
  friendEmail: string;
  friendName: string;
  tags?: string[];
}

export interface LongWeekendOption {
  name: string;
  country: 'CA' | 'US';
  dates: string;
  startDate: string;
  endDate: string;
  days: number;
  season: 'Spring' | 'Summer' | 'Fall' | 'Winter';
}

export interface BookingSearchInput {
  activities: string[];
  driveDistance: string;
  experienceLevel: 'Beginner' | 'Intermediate' | 'Backcountry / Expert';
  customNotes?: string;
  startingLocation?: string;
}

export interface TripInvitation {
  id: string;
  tripId: string;
  hostId: string;
  hostName: string;
  recipientEmail: string;
  token: string;
  inviteLink: string;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: string;
}

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  isSupabase?: boolean;
}

export interface TripDetailsResponse {
  trip: Trip;
  isPast: boolean;
  members: TripMember[];
  groups: Group[];
  groupMembers: GroupMember[];
  equipment: EquipmentItem[];
  food: FoodItem[];
}
