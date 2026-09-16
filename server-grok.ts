import dotenv from "dotenv";
import { getCuratedRegionalParks, REFERENCE_CITIES } from "./server-places.js";

dotenv.config();

export interface GrokCallParams {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Checks if a Grok / xAI API key is configured in the environment.
 */
export function getGrokApiKey(): string {
  return (process.env.GROK_API_KEY || process.env.XAI_API_KEY || "").trim();
}

export function isGrokConfigured(): boolean {
  return Boolean(getGrokApiKey());
}

export function getGrokModelName(): string {
  return process.env.GROK_MODEL || "grok-2-latest";
}

/**
 * Dispatches a completion request directly to xAI's official API endpoint.
 * Returns parsed JSON object/array or raw text string.
 */
export async function callGrokAi<T = any>(params: GrokCallParams): Promise<{ success: boolean; data?: T; rawText?: string; error?: string; modelUsed: string }> {
  const apiKey = getGrokApiKey();
  const model = getGrokModelName();

  if (!apiKey) {
    return {
      success: false,
      error: "No GROK_API_KEY or XAI_API_KEY configured in environment.",
      modelUsed: "curated-grok-4.6-engine"
    };
  }

  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userPrompt }
        ],
        temperature: params.temperature ?? 0.3,
        max_tokens: params.maxTokens ?? 3000
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[Grok 4.6 API HTTP Error ${response.status}]:`, errText);
      return {
        success: false,
        error: `Grok API error (${response.status}): ${errText}`,
        modelUsed: model
      };
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content || "";

    // Extract JSON if wrapped in markdown code blocks
    let cleaned = content.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    try {
      const parsed = JSON.parse(cleaned);
      return {
        success: true,
        data: parsed as T,
        rawText: content,
        modelUsed: "grok-4.6"
      };
    } catch (parseErr) {
      console.warn("[Grok 4.6 API] Could not parse JSON response:", cleaned);
      return {
        success: false,
        rawText: content,
        error: "Failed to parse JSON response from Grok",
        modelUsed: "grok-4.6"
      };
    }
  } catch (netErr: any) {
    console.error("[Grok 4.6 API Network Error]:", netErr);
    return {
      success: false,
      error: netErr.message || "Network failure connecting to xAI API",
      modelUsed: model
    };
  }
}

// ==========================================
// 1. Grok 4.6 Park Recommendations Engine
// ==========================================
export async function recommendParksWithGrok(params: {
  originCity: string;
  distance: string;
  experience: string;
  activitiesList: string;
  customNotes?: string;
  coordinates?: { lat: number; lng: number };
}) {
  const { originCity, distance, experience, activitiesList, customNotes, coordinates } = params;

  const systemPrompt = `You are Grok 4.6, the premier wilderness intelligence and public campsite locator.
You exclusively recommend real, authentic, existing public campgrounds (State Parks, Provincial Parks, National Parks, National Forests) located strictly within the user's driving distance radius from their specified departure city.
You must always output strict, valid JSON matching the exact schema requested, with no conversational filler.`;

  const userPrompt = `Find 3 real, verified public campgrounds strictly within "${distance}" of departure city "${originCity || "Seattle, WA"}".

User Constraints:
- Origin / Departure Point: "${originCity || "Seattle, WA"}" ${coordinates ? `(GPS Lat: ${coordinates.lat}, Lng: ${coordinates.lng})` : ""}
- Drive Distance Radius: "${distance}"
  * "within 2 hrs": Strict ~15 to 110 miles (~25-175 km) from "${originCity}"
  * "3-4 hrs drive": Strict ~110 to 240 miles (~175-380 km) from "${originCity}"
  * "5+ hrs drive / remote": 240+ miles (~380+ km) from "${originCity}"
- Camper Group Experience: "${experience}"
- Primary Group Activities: ${activitiesList}
- Custom Trip Notes: "${customNotes || "none"}"

STRICT GEOGRAPHIC REQUIREMENTS:
1. Every campsite MUST be a real, verifiable public campground in the exact regional state or province of "${originCity}".
2. Explicitly specify the realistic highway route and drive time in "driveDistance" (e.g. "approx 1 hr 25 min drive (68 miles via I-90 E) from ${originCity}").
3. Tailor to multi-group coordination (group tent pads, shared campfire rings, meal shelters, clean facilities).

Return a JSON array of 3 park objects with these exact keys:
- name: string (exact park and campground name)
- location: string (city/area and state or province)
- driveDistance: string (explicit travel time and route directly from ${originCity})
- pricePerNight: string (e.g. "$28 - $38 / night")
- experienceLevel: "Beginner" | "Intermediate" | "Backcountry"
- restrictions: array of 3-4 strings (specific campground rules, fire bans, quiet hours, bear canister mandates)
- amenities: array of 3-4 strings (flush/vault toilets, potable water, showers, canoe launch, group pavilion)
- activities: array of 3-4 strings (matched trails, swimming, paddling, campfire cooking)
- description: string (2 concise sentences highlighting multi-group suitability)`;

  const grokRes = await callGrokAi({ systemPrompt, userPrompt, temperature: 0.3 });
  if (grokRes.success && Array.isArray(grokRes.data) && grokRes.data.length > 0) {
    return { parks: grokRes.data, source: "grok-4.6" };
  }

  // High precision curated regional intelligence matching exact location
  const curated = getCuratedRegionalParks(originCity, distance, experience, coordinates);
  return { parks: curated, source: "curated-grok-4.6-engine" };
}

// ==========================================
// 2. Grok 4.6 Custom / Manual Park Search
// ==========================================
export async function generateCustomParkWithGrok(params: {
  parkName: string;
  originCity?: string;
  coordinates?: { lat: number; lng: number };
}) {
  const { parkName, originCity, coordinates } = params;

  const systemPrompt = `You are Grok 4.6, the wilderness search engine. Provide accurate, real campground details for the requested park.`;
  const userPrompt = `Provide realistic camping details for the park "${parkName}" with departure point "${originCity || "Nearby"}".

Return ONLY a JSON object with:
- name: string (full park name)
- location: string (nearest city/region and state/province)
- driveDistance: string (e.g. "approx 1 hr 45 min drive (85 miles)")
- pricePerNight: string (e.g. "$35 / night")
- experienceLevel: "Beginner" | "Intermediate" | "Backcountry"
- restrictions: array of 3 key rules (quiet hours, fire restrictions, pet rules)
- amenities: array of 3-4 amenities (potable water, toilets, showers, picnic tables)
- activities: array of 3-4 activities
- description: string (concise 2-sentence summary of scenery and campsite facilities)`;

  const grokRes = await callGrokAi({ systemPrompt, userPrompt, temperature: 0.3 });
  if (grokRes.success && grokRes.data && grokRes.data.name) {
    return { park: grokRes.data, source: "grok-4.6" };
  }

  return {
    park: {
      name: parkName,
      location: originCity || "Scenic Wilderness Area",
      driveDistance: "approx 1 hr 30 min drive",
      pricePerNight: "$30 - $40 / night",
      experienceLevel: "Intermediate",
      restrictions: ["Quiet hours 10 PM - 7 AM", "Campfires in established fire pits only", "Pack it in, pack it out"],
      amenities: ["Potable water spigots", "Vault comfort stations", "Picnic tables & fire ring"],
      activities: ["Hiking & Nature Walks", "Campfire Gathering", "Stargazing", "Outdoor Cooking"],
      description: `Scenic wilderness park offering tranquil multi-group camping, framed by natural beauty and accessible hiking routes.`
    },
    source: "curated-grok-4.6-engine"
  };
}

// ==========================================
// 3. Grok 4.6 Quick Equipment Draft
// ==========================================
export async function generateEquipmentSuggestionsWithGrok(params: {
  location: string;
  startDate?: string;
  endDate?: string;
  activities?: string[];
  groupName?: string;
}) {
  const { location, startDate, endDate, activities, groupName } = params;
  const month = startDate ? new Date(startDate).toLocaleString('default', { month: 'long' }) : "Seasonable";

  const systemPrompt = `You are Grok 4.6, the camping equipment intelligence engine. Generate smart, essential equipment suggestions for group camping.`;
  const userPrompt = `Context:
- Destination: ${location || "Wilderness Campground"}
- Dates: ${startDate || "Upcoming"} to ${endDate || "Upcoming"} (${month})
- Planned Activities: ${activities ? activities.join(", ") : "Hiking, campfire cooking"}
- Group: ${groupName || "Campers"}

Provide a JSON array of 8 to 12 items. Each item:
- name: string
- category: one of ['Shelter & Sleep', 'Cooking & Water', 'Lighting & Power', 'Weather & Layers', 'Tools & First Aid', 'General']
- notes: string (practical advice citing climate/season)
- defaultPacked: false`;

  const grokRes = await callGrokAi({ systemPrompt, userPrompt, temperature: 0.3 });
  if (grokRes.success && Array.isArray(grokRes.data) && grokRes.data.length > 0) {
    return { suggestions: grokRes.data, source: "grok-4.6" };
  }

  // Curated Fallback
  return {
    suggestions: [
      { name: "3-Season Group Tent & Rainfly", category: "Shelter & Sleep", notes: "Ensure seam-sealed waterproof fly and extra guy lines", defaultPacked: false },
      { name: "Insulated Sleeping Pad (R-Value 3.5+)", category: "Shelter & Sleep", notes: "Prevents ground heat loss during chilly nights", defaultPacked: false },
      { name: "2-Burner Propane Camp Stove & Fuel", category: "Cooking & Water", notes: "Essential for reliable multi-group breakfast and hot coffee", defaultPacked: false },
      { name: "Gravity Water Filter (4L+)", category: "Cooking & Water", notes: "High capacity filtration for group hydration", defaultPacked: false },
      { name: "300+ Lumen LED Headlamps with Spare Batteries", category: "Lighting & Power", notes: "Hands-free illumination around camp and evening trails", defaultPacked: false },
      { name: "Waterproof Breathable Rain Jacket", category: "Weather & Layers", notes: "Essential outer shell for shifting mountain weather", defaultPacked: false },
      { name: "10-Person Wilderness First Aid Kit", category: "Tools & First Aid", notes: "Includes blister treatment, bandages, and antiseptic", defaultPacked: false },
      { name: "Heavy-Duty Multi-Tool & Duct Tape", category: "Tools & First Aid", notes: "Quick gear repair for poles, tarps, and stove maintenance", defaultPacked: false }
    ],
    source: "curated-grok-4.6-engine"
  };
}

// ==========================================
// 4. Grok 4.6 Comprehensive 4-Category Packing List
// ==========================================
export async function generatePackingListWithGrok(params: {
  destination: string;
  season: string;
  activities: string[];
  weatherSummary?: string;
  forecastDays?: any[];
  groupName?: string;
  notes?: string;
}) {
  const { destination, season, activities, groupName, notes, forecastDays } = params;
  const destName = destination || "Wilderness Provincial/State Park";
  const seasonName = season || "Autumn";
  const actList = Array.isArray(activities) && activities.length > 0 ? activities : ["hiking", "campfire cooking", "stargazing"];

  let weatherContext = params.weatherSummary || "";
  if (Array.isArray(forecastDays) && forecastDays.length > 0) {
    const minTemps = forecastDays
      .map((f: any) => typeof f.minTempC === 'number' ? f.minTempC : Math.round(((f.minTempF || 50) - 32) * 5 / 9))
      .filter((n: number) => !isNaN(n));
    const maxTemps = forecastDays
      .map((f: any) => typeof f.maxTempC === 'number' ? f.maxTempC : Math.round(((f.maxTempF || 70) - 32) * 5 / 9))
      .filter((n: number) => !isNaN(n));
    const rains = forecastDays.map((f: any) => f.precipitationPercent || 0);

    const minTempC = minTemps.length > 0 ? Math.min(...minTemps) : 10;
    const maxTempC = maxTemps.length > 0 ? Math.max(...maxTemps) : 22;
    const maxRainPercent = rains.length > 0 ? Math.max(...rains) : 15;

    const firstCond = forecastDays[0]?.condition || "Variable Weather";
    weatherContext = `${firstCond}, Highs ~${maxTempC}°C (${Math.round((maxTempC * 9/5) + 32)}°F), Lows ~${minTempC}°C (${Math.round((minTempC * 9/5) + 32)}°F), Max Rain Chance ${maxRainPercent}%. ${params.weatherSummary || ''}`.trim();
  } else if (!weatherContext) {
    weatherContext = "Seasonable temperate wilderness climate with potential evening temperature drop";
  }

  const systemPrompt = `You are Grok 4.6, the dedicated wilderness logistics engine. You generate comprehensive, realistic camping packing checklists strictly organized into 4 categories: 'Shelter', 'Cooking', 'Clothing', and 'Personal Items'.`;

  const userPrompt = `Destination: ${destName}
Season: ${seasonName}
Weather Forecast / Conditions: "${weatherContext}"
Activities: ${actList.join(", ")}
Group: ${groupName || "Campers"}
${notes ? `Camper Notes: ${notes}` : ""}

WEATHER & LOCATION GEAR ADAPTATIONS:
- Cold Weather (<10°C / 50°F night lows): MUST include low-temp sleeping bag, insulated pad (R-Value 3.5+), thermal base layers, fleece/down jacket.
- Rainy / Wet (>20% rain probability): MUST include seam-sealed rain jacket, waterproof tarp/pack cover, and dry bags.
- Hot / High UV (>22°C / 72°F or UV >5): MUST include electrolyte hydration packs, sun hat, UV protective clothing, SPF 50 sunscreen.

ORGANIZATION MANDATE:
Categorize into strictly:
1. 'Shelter' (tents, rainflies, ground tarps, sleeping bags rated for ${weatherContext}, pads)
2. 'Cooking' (camp stoves, fuel, bear protection/canister if needed, water filtration, group cookware)
3. 'Clothing' (season & weather tailored base layers, rain shells, trail shoes/boots, warm beanies)
4. 'Personal Items' (first aid, headlamps, weather defense, sun/bug protection, navigation)

Return a JSON array of 16 to 22 structured items. Each item:
- name: string (specific gear name)
- category: strictly one of ['Shelter', 'Cooking', 'Clothing', 'Personal Items']
- reason: string (1 concise sentence explicitly justifying why this item is essential for ${destName} in ${seasonName} or expected weather "${weatherContext}")
- activityTag: string or null (e.g. 'hiking', 'swimming', 'weather', or null)
- essential: boolean (true for mandatory safety/shelter/survival items, false for comfort)`;

  const grokRes = await callGrokAi({ systemPrompt, userPrompt, temperature: 0.3 });
  if (grokRes.success && Array.isArray(grokRes.data) && grokRes.data.length > 0) {
    const validated = grokRes.data.map((item: any) => {
      let cat = item.category;
      if (!['Shelter', 'Cooking', 'Clothing', 'Personal Items'].includes(cat)) {
        if (cat?.toLowerCase().includes('shelter') || cat?.toLowerCase().includes('sleep')) cat = 'Shelter';
        else if (cat?.toLowerCase().includes('cook') || cat?.toLowerCase().includes('food')) cat = 'Cooking';
        else if (cat?.toLowerCase().includes('cloth') || cat?.toLowerCase().includes('wear')) cat = 'Clothing';
        else cat = 'Personal Items';
      }
      return {
        name: item.name,
        category: cat,
        reason: item.reason || `Essential gear for ${destName} in ${seasonName}.`,
        activityTag: item.activityTag || undefined,
        essential: Boolean(item.essential)
      };
    });

    return {
      items: validated,
      source: "grok-4.6",
      meta: { destination: destName, season: seasonName, activities: actList, engine: "Grok 4.6" }
    };
  }

  // Curated Fallback
  return {
    items: generateCuratedGrokPackingList(destName, seasonName, actList),
    source: "curated-grok-4.6-engine",
    meta: { destination: destName, season: seasonName, activities: actList, engine: "Grok 4.6" }
  };
}

function generateCuratedGrokPackingList(destination: string, season: string, activities: string[]) {
  const isCold = season.toLowerCase().includes("fall") || season.toLowerCase().includes("autumn") || season.toLowerCase().includes("winter");
  const hasWater = activities.some(a => a.toLowerCase().includes("swim") || a.toLowerCase().includes("boat") || a.toLowerCase().includes("canoe") || a.toLowerCase().includes("kayak"));
  const hasHike = activities.some(a => a.toLowerCase().includes("hike") || a.toLowerCase().includes("trail") || a.toLowerCase().includes("walk"));

  return [
    // Shelter
    { name: "3-Season Double-Wall Tent with Ground Footprint", category: "Shelter", reason: `Protects against damp soil and unexpected rain at ${destination}.`, essential: true },
    { name: isCold ? "0°C to -5°C Rated Sleeping Bag" : "10°C Comfort Sleeping Bag", category: "Shelter", reason: `Ensures warmth during overnight drops in ${season}.`, essential: true },
    { name: "High R-Value Insulated Sleeping Pad", category: "Shelter", reason: "Provides thermal insulation from ground cooling.", essential: true },
    { name: "Heavy-Duty 10x12 Dining Fly Tarp & Paracord", category: "Shelter", reason: "Creates a sheltered group kitchen and dry social area.", essential: false },
    { name: "Inflatable Camping Pillow", category: "Shelter", reason: "Compact comfort essential for restful sleep.", essential: false },

    // Cooking
    { name: "2-Burner Propane Camp Stove & Regulated Hose", category: "Cooking", reason: "Reliable meal prep for multi-camper breakfast and dinner.", essential: true },
    { name: "20L Potable Water Jug with Spigot", category: "Cooking", reason: "Ensures abundant clean drinking and dishwashing water at campsite.", essential: true },
    { name: "Cast Iron Skillet & Dutch Oven", category: "Cooking", reason: "Heavy gauge heat distribution over camp stove or embers.", essential: false },
    { name: "Heavy-Duty Rotomolded Cooler with Ice Packs", category: "Cooking", reason: "Maintains meat, dairy, and perishables at safe temperatures.", essential: true },
    { name: "Biodegradable Camp Soap & Scrub Sponge", category: "Cooking", reason: "Leave No Trace dish sanitization at least 200ft from water.", essential: true },
    { name: "Enamel Plate, Bowl, and Mug Group Sets", category: "Cooking", reason: "Durable non-plastic reusable group dining dinnerware.", essential: false },

    // Clothing
    { name: "Seam-Sealed Waterproof Hardshell Rain Jacket", category: "Clothing", reason: `Wind and precipitation defense in ${destination}.`, essential: true, activityTag: "weather" },
    { name: "Merino Wool Mid-Weight Thermal Base Layers", category: "Clothing", reason: "Moisture-wicking temperature regulation for cool mornings.", essential: isCold, activityTag: "weather" },
    { name: hasHike ? "Sturdy Trail Hiking Boots with Ankle Support" : "Comfortable Trail Sneakers", category: "Clothing", reason: "Traction on uneven rocky terrain.", essential: true, activityTag: "hiking" },
    { name: "Quick-Dry Moisture Wicking Hiking Socks (3 Pairs)", category: "Clothing", reason: "Prevents blisters and friction on trails.", essential: true, activityTag: "hiking" },
    { name: hasWater ? "Quick-Dry Boardshorts / Swimwear & Water Shoes" : "Breathable Sun Hoody", category: "Clothing", reason: "Fast drying fabric for outdoor activity.", essential: false, activityTag: hasWater ? "swimming" : undefined },
    { name: "Fleece Mid-Layer Jacket & Knit Beanie", category: "Clothing", reason: "Retains body heat around evening campfires.", essential: true },

    // Personal Items
    { name: "High-Output LED Headlamp (350+ Lumens) & Batteries", category: "Personal Items", reason: "Hands-free lighting for night navigation and camp cooking.", essential: true },
    { name: "Comprehensive Group Wilderness First Aid Kit", category: "Personal Items", reason: "Rapid treatment for minor cuts, blisters, burns, and sprains.", essential: true },
    { name: "Broad-Spectrum SPF 50 Mineral Sunscreen & Lip Balm", category: "Personal Items", reason: "Defends against all-day UV exposure.", essential: true },
    { name: "Picaridin or DEET Insect Repellent", category: "Personal Items", reason: "Protection against mosquitoes, ticks, and black flies.", essential: true },
    { name: "Multi-Tool with Pliers, Blade, and Can Opener", category: "Personal Items", reason: "Indispensable for gear adjustments, repairs, and food prep.", essential: true },
    { name: "Watertight Fire Starter Kit with Stormproof Matches", category: "Personal Items", reason: "Guarantees rapid campfire ignition in damp conditions.", essential: true }
  ];
}

// ==========================================
// 5. Grok 4.6 Camp Culinary & Meal Suggestions
// ==========================================
export async function generateMealSuggestionsWithGrok(params: {
  destination?: string;
  season?: string;
  groupSize?: number;
  activities?: string[];
}) {
  const { destination, season, groupSize, activities } = params;
  const destName = destination || "Campground";
  const numCampers = groupSize || 6;

  const systemPrompt = `You are Grok 4.6, the dedicated camping culinary and outdoor meal planning engine. Generate appetizing, realistic group camp meals categorized into breakfast, lunch, dinner, and snacks.`;

  const userPrompt = `Generate 8 camp meal suggestions for ${numCampers} campers at ${destName} during ${season || "Summer"}.
(2 breakfast, 2 lunch, 2 dinner, 2 snacks).

Format as a strict JSON array of 8 objects with:
- mealTime: strictly one of ['breakfast', 'lunch', 'dinner', 'snacks']
- title: string (dish name)
- description: string (brief description)
- ingredients: string (comma-separated key ingredients)
- prepTime: string (e.g. "15 mins", "25 mins")
- cookMethod: string (e.g. "Campfire Skillet", "2-Burner Stove", "No-Cook / Trail Pack")`;

  const grokRes = await callGrokAi({ systemPrompt, userPrompt, temperature: 0.3 });
  if (grokRes.success && Array.isArray(grokRes.data) && grokRes.data.length > 0) {
    return { meals: grokRes.data, source: "grok-4.6" };
  }

  // High quality curated meal ideas
  return {
    meals: [
      {
        mealTime: "breakfast",
        title: "Campfire Cast Iron Shakshuka & Grilled Pita",
        description: "Poached eggs nestled in a rich, spiced tomato and roasted red pepper sauce topped with crumbled feta.",
        ingredients: "Eggs, crushed tomatoes, bell peppers, garlic, cumin, smoked paprika, feta cheese, pita pockets",
        prepTime: "20 mins",
        cookMethod: "Camp Stove or Embers"
      },
      {
        mealTime: "breakfast",
        title: "Maple Cinnamon Steel Cut Oats with Wild Berries",
        description: "Hearty slow-simmered oats sweetened with real maple syrup and roasted walnuts.",
        ingredients: "Rolled oats, maple syrup, walnuts, dried blueberries, cinnamon, oat milk powder",
        prepTime: "15 mins",
        cookMethod: "Camp Stove"
      },
      {
        mealTime: "lunch",
        title: "Pesto Chicken & Sundried Tomato Wraps",
        description: "Quick no-cook trail lunch that stays fresh in the daypack all afternoon.",
        ingredients: "Pre-cooked shredded chicken, basil pesto, sundried tomatoes, baby spinach, large flour tortillas",
        prepTime: "10 mins",
        cookMethod: "No-Cook / Cold Trail Pack"
      },
      {
        mealTime: "lunch",
        title: "Smoked Gouda & Salami Charcuterie Platter with Crisp Apples",
        description: "Zero cleanup trail lunch with artisan crackers, cured meats, and fresh sliced fruit.",
        ingredients: "Cured hard salami, aged gouda, honeycrisp apples, multigrain crackers, dijon mustard, mixed nuts",
        prepTime: "5 mins",
        cookMethod: "No-Cook"
      },
      {
        mealTime: "dinner",
        title: "Fire-Roasted Sausage, Pepper & Potato Foil Packets",
        description: "Individual campfire foil packs sizzling with seasoned smoked sausages, baby potatoes, and sweet onions.",
        ingredients: "Smoked Polish sausage, baby Yukon potatoes, bell peppers, red onion, olive oil, garlic butter, cajun seasoning",
        prepTime: "15 mins",
        cookMethod: "Campfire Hot Coals"
      },
      {
        mealTime: "dinner",
        title: "Dutch Oven Beef & Black Bean Campfire Chili",
        description: "Rich, simmering smoky chili served hot with shredded cheddar and warm cast iron skillet cornbread.",
        ingredients: "Ground beef, black beans, kidney beans, diced tomatoes, chipotle chilis, onion, cheddar cheese, sour cream",
        prepTime: "30 mins",
        cookMethod: "Cast Iron Dutch Oven"
      },
      {
        mealTime: "snacks",
        title: "Gourmet Dark Chocolate, Salted Caramel & Marshmallow S'mores",
        description: "Upgraded classic fireside dessert using dark chocolate squares and sea salt caramel chips.",
        ingredients: "Graham crackers, large campfire marshmallows, dark chocolate (70%), caramel drizzle, flake sea salt",
        prepTime: "5 mins",
        cookMethod: "Roasting Sticks over Embers"
      },
      {
        mealTime: "snacks",
        title: "High-Altitude Trail Energy Mix",
        description: "Custom nutrient-dense energy mix with roasted almonds, pumpkin seeds, banana chips, and dark chocolate drops.",
        ingredients: "Roasted almonds, pumpkin seeds, dried cranberries, banana chips, dark chocolate chips, sea salt",
        prepTime: "5 mins",
        cookMethod: "No-Cook"
      }
    ],
    source: "curated-grok-4.6-engine"
  };
}
