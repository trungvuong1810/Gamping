import express from "express";
import { recommendParksWithGrok, generateCustomParkWithGrok, generateEquipmentSuggestionsWithGrok, generatePackingListWithGrok, generateMealSuggestionsWithGrok, isGrokConfigured } from "../grok.js";

export const router = express.Router();

// ==========================================
// AI TRIP INTELLIGENCE ENDPOINTS (Grok Persona via Gemini Backend)
// ==========================================

// 1. Long weekends (Current year CA & US holidays dynamically calculated)
router.get("/api/ai/long-weekends", async (req, res) => {
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

// 2. Booking / Park Recommendation (Grok engine exclusively)
router.post("/api/ai/recommend-parks", async (req, res) => {
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

// 2b. Custom Park Details Generator (Grok engine exclusively)
router.post("/api/ai/generate-custom-park", async (req, res) => {
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

// 3. Equipment Draft Suggestions (Grok engine exclusively)
router.post("/api/ai/equipment-suggestions", async (req, res) => {
  const { location, startDate, endDate, activities, groupName, season, groupSize, notes, existingItems, weatherSummary } = req.body;

  const result = await generateEquipmentSuggestionsWithGrok({
    location,
    startDate,
    endDate,
    activities,
    groupName,
    season,
    groupSize: Number(groupSize) || undefined,
    notes: typeof notes === "string" ? notes.slice(0, 500) : undefined,
    existingItems: Array.isArray(existingItems) ? existingItems.map(String) : [],
    weatherSummary: typeof weatherSummary === "string" ? weatherSummary.slice(0, 300) : undefined
  });

  return res.json({
    equipment: result.suggestions,
    source: result.source,
    grokConfigured: isGrokConfigured()
  });
});

// 4. Packing List Generator (Grok Engine Exclusively)
router.post("/api/ai/packing-list", async (req, res) => {
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
      engine: "Grok"
    }
  });
});

// 5. Collaborative Meal Suggestions (Grok Engine Exclusively)
router.post("/api/ai/meal-suggestions", async (req, res) => {
  const { destination, season, groupSize, activities, preferences, existingMeals, daysCount } = req.body;
  const destName = destination || "Campground";
  const numCampers = groupSize || 6;
  const actList = Array.isArray(activities) ? activities : [];

  const result = await generateMealSuggestionsWithGrok({
    destination: destName,
    season: season || "Summer",
    groupSize: numCampers,
    activities: actList,
    preferences: typeof preferences === "string" ? preferences.slice(0, 500) : undefined,
    existingMeals: Array.isArray(existingMeals) ? existingMeals.map(String) : [],
    daysCount: Number(daysCount) || undefined
  });

  return res.json({
    meals: result.meals,
    source: result.source,
    grokConfigured: isGrokConfigured()
  });
});
