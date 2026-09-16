// Source: Google Maps Platform Code Assist
// Google Maps Platform attribution identifier
export const GMP_ATTRIBUTION_ID = "gmp_mcp_codeassist_v1_aistudio";

export interface GeoLocation {
  name: string;
  stateOrProvince: string;
  country: string;
  lat: number;
  lng: number;
  region: "pacific-nw" | "california" | "southwest" | "mountain-west" | "midwest" | "northeast" | "southeast" | "ontario" | "quebec" | "western-canada" | "other";
}

// Curated reference database of major cities and destinations across US and Canada
export const REFERENCE_CITIES: GeoLocation[] = [
  // Pacific Northwest
  { name: "Seattle", stateOrProvince: "WA", country: "USA", lat: 47.6062, lng: -122.3321, region: "pacific-nw" },
  { name: "Portland", stateOrProvince: "OR", country: "USA", lat: 45.5152, lng: -122.6784, region: "pacific-nw" },
  { name: "Tacoma", stateOrProvince: "WA", country: "USA", lat: 47.2529, lng: -122.4443, region: "pacific-nw" },
  { name: "Spokane", stateOrProvince: "WA", country: "USA", lat: 47.6588, lng: -117.426, region: "pacific-nw" },
  { name: "Eugene", stateOrProvince: "OR", country: "USA", lat: 44.0521, lng: -123.0868, region: "pacific-nw" },
  { name: "Bend", stateOrProvince: "OR", country: "USA", lat: 44.0582, lng: -121.3153, region: "pacific-nw" },
  { name: "Olympia", stateOrProvince: "WA", country: "USA", lat: 47.0379, lng: -122.9007, region: "pacific-nw" },
  { name: "Bellingham", stateOrProvince: "WA", country: "USA", lat: 48.7519, lng: -122.4787, region: "pacific-nw" },

  // California
  { name: "San Francisco", stateOrProvince: "CA", country: "USA", lat: 37.7749, lng: -122.4194, region: "california" },
  { name: "Los Angeles", stateOrProvince: "CA", country: "USA", lat: 34.0522, lng: -118.2437, region: "california" },
  { name: "San Diego", stateOrProvince: "CA", country: "USA", lat: 32.7157, lng: -117.1611, region: "california" },
  { name: "San Jose", stateOrProvince: "CA", country: "USA", lat: 37.3382, lng: -121.8863, region: "california" },
  { name: "Sacramento", stateOrProvince: "CA", country: "USA", lat: 38.5816, lng: -121.4944, region: "california" },
  { name: "Oakland", stateOrProvince: "CA", country: "USA", lat: 37.8044, lng: -122.2712, region: "california" },
  { name: "Fresno", stateOrProvince: "CA", country: "USA", lat: 36.7468, lng: -119.7726, region: "california" },
  { name: "Santa Barbara", stateOrProvince: "CA", country: "USA", lat: 34.4208, lng: -119.6982, region: "california" },
  { name: "Tahoe City", stateOrProvince: "CA", country: "USA", lat: 39.1724, lng: -120.1457, region: "california" },
  { name: "Monterey", stateOrProvince: "CA", country: "USA", lat: 36.6002, lng: -121.8947, region: "california" },

  // Mountain West / Rockies
  { name: "Denver", stateOrProvince: "CO", country: "USA", lat: 39.7392, lng: -104.9903, region: "mountain-west" },
  { name: "Boulder", stateOrProvince: "CO", country: "USA", lat: 40.015, lng: -105.2705, region: "mountain-west" },
  { name: "Colorado Springs", stateOrProvince: "CO", country: "USA", lat: 38.8339, lng: -104.8214, region: "mountain-west" },
  { name: "Salt Lake City", stateOrProvince: "UT", country: "USA", lat: 40.7608, lng: -111.891, region: "mountain-west" },
  { name: "Boise", stateOrProvince: "ID", country: "USA", lat: 43.615, lng: -116.2023, region: "mountain-west" },
  { name: "Bozeman", stateOrProvince: "MT", country: "USA", lat: 45.677, lng: -111.0429, region: "mountain-west" },
  { name: "Fort Collins", stateOrProvince: "CO", country: "USA", lat: 40.5853, lng: -105.0844, region: "mountain-west" },
  { name: "Moab", stateOrProvince: "UT", country: "USA", lat: 38.5733, lng: -109.5498, region: "mountain-west" },

  // Southwest
  { name: "Austin", stateOrProvince: "TX", country: "USA", lat: 30.2672, lng: -97.7431, region: "southwest" },
  { name: "Dallas", stateOrProvince: "TX", country: "USA", lat: 32.7767, lng: -96.797, region: "southwest" },
  { name: "Houston", stateOrProvince: "TX", country: "USA", lat: 29.7604, lng: -95.3698, region: "southwest" },
  { name: "San Antonio", stateOrProvince: "TX", country: "USA", lat: 29.4241, lng: -98.4936, region: "southwest" },
  { name: "Phoenix", stateOrProvince: "AZ", country: "USA", lat: 33.4484, lng: -112.074, region: "southwest" },
  { name: "Tucson", stateOrProvince: "AZ", country: "USA", lat: 32.2226, lng: -110.9747, region: "southwest" },
  { name: "Albuquerque", stateOrProvince: "NM", country: "USA", lat: 35.0844, lng: -106.6504, region: "southwest" },
  { name: "Las Vegas", stateOrProvince: "NV", country: "USA", lat: 36.1699, lng: -115.1398, region: "southwest" },

  // Midwest
  { name: "Chicago", stateOrProvince: "IL", country: "USA", lat: 41.8781, lng: -87.6298, region: "midwest" },
  { name: "Minneapolis", stateOrProvince: "MN", country: "USA", lat: 44.9778, lng: -93.265, region: "midwest" },
  { name: "Madison", stateOrProvince: "WI", country: "USA", lat: 43.0731, lng: -89.4012, region: "midwest" },
  { name: "Detroit", stateOrProvince: "MI", country: "USA", lat: 42.3314, lng: -83.0458, region: "midwest" },
  { name: "Indianapolis", stateOrProvince: "IN", country: "USA", lat: 39.7684, lng: -86.1581, region: "midwest" },
  { name: "Columbus", stateOrProvince: "OH", country: "USA", lat: 39.9612, lng: -82.9988, region: "midwest" },
  { name: "Milwaukee", stateOrProvince: "WI", country: "USA", lat: 43.0389, lng: -87.9065, region: "midwest" },

  // Northeast
  { name: "New York", stateOrProvince: "NY", country: "USA", lat: 40.7128, lng: -74.006, region: "northeast" },
  { name: "Boston", stateOrProvince: "MA", country: "USA", lat: 42.3601, lng: -71.0589, region: "northeast" },
  { name: "Philadelphia", stateOrProvince: "PA", country: "USA", lat: 39.9526, lng: -75.1652, region: "northeast" },
  { name: "Pittsburgh", stateOrProvince: "PA", country: "USA", lat: 40.4406, lng: -79.9959, region: "northeast" },
  { name: "Buffalo", stateOrProvince: "NY", country: "USA", lat: 42.8864, lng: -78.8784, region: "northeast" },
  { name: "Burlington", stateOrProvince: "VT", country: "USA", lat: 44.4759, lng: -73.2121, region: "northeast" },
  { name: "Portland", stateOrProvince: "ME", country: "USA", lat: 43.6591, lng: -70.2568, region: "northeast" },

  // Southeast
  { name: "Atlanta", stateOrProvince: "GA", country: "USA", lat: 33.749, lng: -84.388, region: "southeast" },
  { name: "Charlotte", stateOrProvince: "NC", country: "USA", lat: 35.2271, lng: -80.8431, region: "southeast" },
  { name: "Nashville", stateOrProvince: "TN", country: "USA", lat: 36.1627, lng: -86.7816, region: "southeast" },
  { name: "Raleigh", stateOrProvince: "NC", country: "USA", lat: 35.7796, lng: -78.6382, region: "southeast" },
  { name: "Orlando", stateOrProvince: "FL", country: "USA", lat: 28.5383, lng: -81.3792, region: "southeast" },
  { name: "Asheville", stateOrProvince: "NC", country: "USA", lat: 35.5951, lng: -82.5515, region: "southeast" },
  { name: "Tampa", stateOrProvince: "FL", country: "USA", lat: 27.9506, lng: -82.4572, region: "southeast" },

  // Ontario, Canada
  { name: "Toronto", stateOrProvince: "ON", country: "Canada", lat: 43.6532, lng: -79.3832, region: "ontario" },
  { name: "Ottawa", stateOrProvince: "ON", country: "Canada", lat: 45.4215, lng: -75.6972, region: "ontario" },
  { name: "Hamilton", stateOrProvince: "ON", country: "Canada", lat: 43.2557, lng: -79.8711, region: "ontario" },
  { name: "London", stateOrProvince: "ON", country: "Canada", lat: 42.9849, lng: -81.2453, region: "ontario" },
  { name: "Kitchener-Waterloo", stateOrProvince: "ON", country: "Canada", lat: 43.4516, lng: -80.4925, region: "ontario" },
  { name: "Barrie", stateOrProvince: "ON", country: "Canada", lat: 44.3894, lng: -79.6903, region: "ontario" },
  { name: "Kingston", stateOrProvince: "ON", country: "Canada", lat: 44.2312, lng: -76.486, region: "ontario" },
  { name: "Sudbury", stateOrProvince: "ON", country: "Canada", lat: 46.4917, lng: -80.993, region: "ontario" },

  // Western Canada
  { name: "Vancouver", stateOrProvince: "BC", country: "Canada", lat: 49.2827, lng: -123.1207, region: "western-canada" },
  { name: "Calgary", stateOrProvince: "AB", country: "Canada", lat: 51.0447, lng: -114.0719, region: "western-canada" },
  { name: "Edmonton", stateOrProvince: "AB", country: "Canada", lat: 53.5461, lng: -113.4938, region: "western-canada" },
  { name: "Victoria", stateOrProvince: "BC", country: "Canada", lat: 48.4284, lng: -123.3656, region: "western-canada" },
  { name: "Kelowna", stateOrProvince: "BC", country: "Canada", lat: 49.888, lng: -119.496, region: "western-canada" },
  { name: "Banff", stateOrProvince: "AB", country: "Canada", lat: 51.1784, lng: -115.5708, region: "western-canada" },

  // Quebec
  { name: "Montreal", stateOrProvince: "QC", country: "Canada", lat: 45.5017, lng: -73.5673, region: "quebec" },
  { name: "Quebec City", stateOrProvince: "QC", country: "Canada", lat: 46.8139, lng: -71.208, region: "quebec" }
];

// Calculate Haversine distance in miles
export function calculateDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Find closest reference city to coordinates
export function findClosestCity(lat: number, lng: number): GeoLocation {
  let closest = REFERENCE_CITIES[0];
  let minDistance = Infinity;

  for (const city of REFERENCE_CITIES) {
    const dist = calculateDistanceMiles(lat, lng, city.lat, city.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = city;
    }
  }
  return closest;
}

// Detect region from starting location string or coordinates
export function detectLocationRegion(locationStr: string, coords?: { lat: number; lng: number }): string {
  if (coords && coords.lat && coords.lng) {
    const nearest = findClosestCity(coords.lat, coords.lng);
    return nearest.region;
  }

  const loc = locationStr.toLowerCase();

  // Province / State abbreviations & keywords
  if (loc.includes(", wa") || loc.includes("washington") || loc.includes(", or") || loc.includes("oregon") || loc.includes("seattle") || loc.includes("portland")) {
    return "pacific-nw";
  }
  if (loc.includes(", ca") || loc.includes("california") || loc.includes("san francisco") || loc.includes("los angeles") || loc.includes("san diego") || loc.includes("sacramento") || loc.includes("bay area")) {
    return "california";
  }
  if (loc.includes(", co") || loc.includes("colorado") || loc.includes("denver") || loc.includes("boulder") || loc.includes("utah") || loc.includes(", ut") || loc.includes("salt lake") || loc.includes("boise") || loc.includes("idaho") || loc.includes("montana")) {
    return "mountain-west";
  }
  if (loc.includes(", tx") || loc.includes("texas") || loc.includes("austin") || loc.includes("dallas") || loc.includes("houston") || loc.includes("san antonio") || loc.includes("arizona") || loc.includes(", az") || loc.includes("phoenix") || loc.includes("new mexico") || loc.includes("nevada")) {
    return "southwest";
  }
  if (loc.includes(", il") || loc.includes("illinois") || loc.includes("chicago") || loc.includes("michigan") || loc.includes(", mi") || loc.includes("wisconsin") || loc.includes(", wi") || loc.includes("minnesota") || loc.includes(", mn") || loc.includes("indiana") || loc.includes("ohio")) {
    return "midwest";
  }
  if (loc.includes(", ny") || loc.includes("new york") || loc.includes("boston") || loc.includes(", ma") || loc.includes("pennsylvania") || loc.includes(", pa") || loc.includes("vermont") || loc.includes("maine")) {
    return "northeast";
  }
  if (loc.includes(", ga") || loc.includes("georgia") || loc.includes("atlanta") || loc.includes("north carolina") || loc.includes(", nc") || loc.includes("tennessee") || loc.includes(", tn") || loc.includes("florida") || loc.includes(", fl")) {
    return "southeast";
  }
  if (loc.includes("on") || loc.includes("ontario") || loc.includes("toronto") || loc.includes("ottawa") || loc.includes("hamilton") || loc.includes("barrie") || loc.includes("kingston")) {
    return "ontario";
  }
  if (loc.includes("bc") || loc.includes("british columbia") || loc.includes("vancouver") || loc.includes("alberta") || loc.includes("ab") || loc.includes("calgary") || loc.includes("edmonton") || loc.includes("banff")) {
    return "western-canada";
  }
  if (loc.includes("qc") || loc.includes("quebec") || loc.includes("montreal")) {
    return "quebec";
  }

  return "general";
}

// Curated authentic real campgrounds mapped strictly by region and drive distance
export interface ParkRecommendation {
  name: string;
  location: string;
  driveDistance: string;
  pricePerNight: string;
  experienceLevel: string;
  restrictions: string[];
  amenities: string[];
  activities: string[];
  description: string;
}

export const REGIONAL_PARKS: Record<string, Record<string, ParkRecommendation[]>> = {
  // Pacific Northwest (Seattle, Portland, etc.)
  "pacific-nw": {
    "within 2 hrs": [
      {
        name: "Deception Pass State Park - Cranberry Lake Campground",
        location: "Oak Harbor, WA",
        driveDistance: "approx 1 hr 25 min drive (78 miles) from departure",
        pricePerNight: "$37 - $45 / night",
        experienceLevel: "Beginner",
        restrictions: ["Discover Pass required for vehicles", "Campfires only in designated fire rings", "Quiet hours 10 PM - 6:30 AM", "Max 8 people per group site"],
        amenities: ["Hot coin showers and flush toilets", "Direct freshwater lake & saltwater beach", "Camp store with firewood", "Covered group picnic shelter"],
        activities: ["Hiking Goose Rock Trail", "Canoeing Cranberry Lake", "Beachcombing", "Campfire Dutch Oven Cooking"],
        description: "Spectacular dramatic tidal pass views with sheltered old-growth forest campsites and two distinct water bodies for multi-group coordination."
      },
      {
        name: "Wallace Falls State Park - Tent Camp",
        location: "Gold Bar, WA",
        driveDistance: "approx 1 hr 15 min drive (46 miles) via US-2 E",
        pricePerNight: "$32 - $40 / night",
        experienceLevel: "Intermediate",
        restrictions: ["Bear canisters recommended for backcountry loops", "Pack-it-in, pack-it-out waste policy", "No motorized equipment on upper trail"],
        amenities: ["Vault toilets and potable water near trailheads", "Dedicated tent pads", "Riverside picnic spots"],
        activities: ["Woody Trail Waterfall Hike", "Photography", "Wilderness Stargazing", "Campfire Cooking"],
        description: "Pristine Cascade foothills campsite framed by moss-draped conifers and roaring tiered waterfalls, ideal for active hiking groups."
      },
      {
        name: "Dash Point State Park Campground",
        location: "Federal Way, WA",
        driveDistance: "approx 45 min drive (28 miles) along Puget Sound",
        pricePerNight: "$35 - $42 / night",
        experienceLevel: "Beginner",
        restrictions: ["Strict 10 PM quiet hours", "Alcohol restricted to registered campsite boundary", "Pet leash required"],
        amenities: ["Flush comfort stations with hot showers", "Utility hookup loops", "Direct sandy beach access"],
        activities: ["Low-tide Skimboarding", "Lakeside Walking", "Sunset Photography", "Outdoor Grilling"],
        description: "Effortless drive-in camping with quick access to saltwater beaches, perfect for first-time multi-family and mixed camper groups."
      }
    ],
    "3-4 hrs drive": [
      {
        name: "Olympic National Park - Kalaloch Campground",
        location: "Forks, WA",
        driveDistance: "approx 3 hrs 15 min drive (155 miles) via US-101",
        pricePerNight: "$24 - $34 / night",
        experienceLevel: "Intermediate",
        restrictions: ["Food must be secured in bear-proof containers or vehicle trunks", "No firewood collection on beach", "Strict group size limits on bluff loops"],
        amenities: ["Flush toilets and potable water stations", "Oceanside interpretive trails", "Direct wooden stair access to coastal driftwood beach"],
        activities: ["Ruby Beach Tidepooling", "Driftwood Campfires", "Coastal Whale Watching", "Stargazing"],
        description: "Perched atop scenic coastal bluffs with panoramic Pacific ocean sunsets and direct trail access to pristine marine wilderness."
      },
      {
        name: "Mount Rainier National Park - Cougar Rock Campground",
        location: "Ashford, WA",
        driveDistance: "approx 2 hrs 30 min drive (95 miles) via WA-706",
        pricePerNight: "$30 / night",
        experienceLevel: "Intermediate",
        restrictions: ["Mandatory wildlife food storage regulations", "No collecting fallen timber or rocks", "Generators strictly prohibited after 8 PM"],
        amenities: ["Flush toilets and dishwashing sinks", "Ranger amphitheater talks", "Camp store at Longmire nearby"],
        activities: ["Skyline Trail Day Hike", "Glacier River Exploration", "Alpine Meadow Photography", "Group Campfire Stews"],
        description: "Centrally positioned in dense subalpine firs along the Nisqually River with breathtaking immediate views of Mount Rainier's glaciated peak."
      },
      {
        name: "Lake Chelan State Park Campground",
        location: "Chelan, WA",
        driveDistance: "approx 3 hrs 30 min drive (175 miles) over Stevens Pass",
        pricePerNight: "$38 - $48 / night",
        experienceLevel: "Beginner",
        restrictions: ["Quiet hours strictly enforced 10 PM - 6:30 AM", "Boat mooring permits separate", "Max 2 vehicles per standard site"],
        amenities: ["Modern flush restrooms with hot showers", "Dedicated boat launch & docks", "Lakeside swimming area", "Large group camp area"],
        activities: ["Boating & Kayaking", "Water Skiing", "Evening BBQ Grills", "Vineyard & Orchard Trail Walking"],
        description: "Sunny, semi-arid lakeside oasis with warm water swimming and spacious multi-site layouts ideal for cooperative cooking and watersports."
      }
    ]
  },

  // California (SF Bay, LA, San Diego, etc.)
  "california": {
    "within 2 hrs": [
      {
        name: "Samuel P. Taylor State Park - Madrone Group Camp",
        location: "Lagunitas, CA (Marin County)",
        driveDistance: "approx 1 hr drive (32 miles) from departure",
        pricePerNight: "$35 standard / $120 group site",
        experienceLevel: "Beginner",
        restrictions: ["No collecting forest wood or kindling", "Strict food locker (bear box) usage", "No dogs on dirt trails"],
        amenities: ["Flush toilets and hot token showers", "Bear-resistant food lockers at all sites", "Paved camp bicycle trail", "Piped drinking water"],
        activities: ["Cross Marin Trail Cycling", "Old-Growth Redwood Walks", "Campfire Stew Cooking", "Lagunitas Creek Birding"],
        description: "Nestled beneath towering second-growth coastal redwoods along Lagunitas Creek, providing cooling shade and secluded multi-site group clusters."
      },
      {
        name: "Half Moon Bay State Beach - Francis Beach Campground",
        location: "Half Moon Bay, CA",
        driveDistance: "approx 45 min drive (30 miles) via CA-1",
        pricePerNight: "$35 - $50 / night",
        experienceLevel: "Beginner",
        restrictions: ["No wood fires directly on sand (designated rings only)", "No alcohol on beach", "10 PM strict quiet hours"],
        amenities: ["Heated coin showers and modern restrooms", "Direct paved Coastside Trail", "Electric hookup options", "Picnic tables with windbreaks"],
        activities: ["Coastal Bluff Walking", "Sunset Photography", "Surfing & Bodysurfing", "Beach Volleyball"],
        description: "Bluff-top oceanfront camping right above crashing Pacific swells with miles of accessible coastal hiking directly out of camp."
      },
      {
        name: "Mount Tamalpais State Park - Pantoll & Bootjack Camp",
        location: "Mill Valley, CA",
        driveDistance: "approx 50 min drive (22 miles) via Panoramic Hwy",
        pricePerNight: "$25 - $30 / night",
        experienceLevel: "Intermediate",
        restrictions: ["Walk-in tent sites only (parking ~100 yds)", "Wood fires prohibited during dry fire season", "Max 8 persons per site"],
        amenities: ["Piped drinking water", "Flush toilets", "Trailhead hub for 50+ miles of trails"],
        activities: ["Steep Ravine Trail Hike", "Sunset Fog-Line Viewing", "Matt Davis Ridge Run", "Night Stargazing"],
        description: "High elevation coastal ridge camping where campers overlook rolling marine fog banks and the golden glow of the Pacific sunset."
      }
    ],
    "3-4 hrs drive": [
      {
        name: "Big Sur - Pfeiffer Big Sur State Park",
        location: "Big Sur, CA",
        driveDistance: "approx 2 hrs 45 min drive (140 miles) down CA-1",
        pricePerNight: "$35 - $45 / night",
        experienceLevel: "Intermediate",
        restrictions: ["Raccoon & wildlife food storage mandatory", "Strict firewood quarantine zones", "Vehicle length restrictions on winding route"],
        amenities: ["Lodge camp store with wood and groceries", "Coin-operated hot showers", "Big Sur River swimming holes"],
        activities: ["Pfeiffer Falls Hike", "River Gorge Swimming", "Coastal Vista Photography", "Campfire Astronomy"],
        description: "Classic dramatic central coast camping beneath towering redwood canopies alongside the gentle currents of the Big Sur River."
      },
      {
        name: "Pinnacles National Park - Pinnacles Campground",
        location: "Paicines, CA",
        driveDistance: "approx 2 hrs 15 min drive (125 miles) via US-101 S",
        pricePerNight: "$40 - $50 / night",
        experienceLevel: "Intermediate",
        restrictions: ["Bear-resistant food storage required", "Headlamps mandatory for Bear Gulch Cave", "No drone operations"],
        amenities: ["Swimming pool open in season", "Flush comfort stations", "Camp store with ice and snacks", "Electrical RV hookup sites"],
        activities: ["Talus Cave Exploration", "California Condor Birding", "High Peaks Rock Scrambling", "Milky Way Astrophotography"],
        description: "Extraterrestrial volcanic rock spires, talus caves, and premier dark skies where majestic wild California Condors soar overhead."
      }
    ]
  },

  // Mountain West / Colorado (Denver, Boulder, etc.)
  "mountain-west": {
    "within 2 hrs": [
      {
        name: "Golden Gate Canyon State Park - Reverends Ridge Campground",
        location: "Golden, CO",
        driveDistance: "approx 50 min drive (35 miles) via CO-93 N & Golden Gate Canyon Rd",
        pricePerNight: "$36 - $44 / night",
        experienceLevel: "Intermediate",
        restrictions: ["Bear-proof food lockers mandatory", "Firewood must be certified pest-free", "Quiet hours 10 PM - 6 AM"],
        amenities: ["Flush toilets & hot token showers", "Camper services building with laundry", "Paved tent and camper pads", "Group camping loops"],
        activities: ["Panorama Point Overlook Hike", "Mule Deer & Elk Wildlife Watching", "Mountain Biking", "Campfire Cooking"],
        description: "Lush dense lodgepole pine and aspen groves with sweeping panoramic views of the Continental Divide just minutes outside the Denver metro."
      },
      {
        name: "Chatfield State Park Campground",
        location: "Littleton, CO",
        driveDistance: "approx 35 min drive (22 miles) via US-85 S",
        pricePerNight: "$36 - $42 / night",
        experienceLevel: "Beginner",
        restrictions: ["Colorado state parks vehicle pass required", "Pet leashes required", "No swimming outside designated beach"],
        amenities: ["Full hookup & tent sites with hot showers", "Marina with boat & paddleboard rentals", "Swim beach and paved bike loops"],
        activities: ["Paddleboarding & Kayaking", "Lakeside Cycling", "Fishing for Walleye & Bass", "Group Sunset Barbecue"],
        description: "Spacious multi-group reservoir camping with immediate boating and watersports access, ideal for social summer gatherings."
      },
      {
        name: "St. Vrain State Park Campground",
        location: "Firestone, CO",
        driveDistance: "approx 40 min drive (32 miles) north on I-25",
        pricePerNight: "$34 - $40 / night",
        experienceLevel: "Beginner",
        restrictions: ["No wake boating only (electric motors/paddles)", "Fire in designated steel rings only", "No swimming in ponds"],
        amenities: ["Comfort stations with modern showers", "Concrete camper pads", "Multiple stocked fishing ponds", "Level grassy tent spots"],
        activities: ["Trout & Bass Fishing", "Birdwatching for Bald Eagles", "Evening Sunset Walks", "Campfire Stargazing"],
        description: "Peaceful pond-studded open plains camping with clear western vistas of Longs Peak and the front range Rocky Mountains."
      }
    ],
    "3-4 hrs drive": [
      {
        name: "Rocky Mountain National Park - Moraine Park Campground",
        location: "Estes Park, CO",
        driveDistance: "approx 1 hr 45 min drive (68 miles) via US-36 W",
        pricePerNight: "$35 / night",
        experienceLevel: "Intermediate",
        restrictions: ["Mandatory bear food storage at all times", "Timed park entry reservation coordination", "Wood fires only in metal grates"],
        amenities: ["Flush toilets and solar-heated water sinks", "Park shuttle bus stop right inside camp", "Ranger education programs"],
        activities: ["Elk Rut Bugling Observation", "Bear Lake & Emerald Lake Treks", "Alpine Photography", "Campfire Chili Stews"],
        description: "World-class alpine valley camping framed by towering granite summits where large elk herds graze right across the meadow."
      },
      {
        name: "State Forest State Park - North Michigan Reservoir",
        location: "Walden, CO",
        driveDistance: "approx 3 hrs 15 min drive (150 miles) via US-287 N & CO-14 W",
        pricePerNight: "$32 - $40 / night",
        experienceLevel: "Backcountry / Expert",
        restrictions: ["Active moose territory - maintain 50ft distance", "Bear-aware food discipline required", "High elevation weather preparedness (9,000+ ft)"],
        amenities: ["Vault toilets and hand-pump well water", "Boat launch for non-motorized craft", "Rustic multi-group campsite setups"],
        activities: ["Moose Safari Watching", "High Altitude Trout Fishing", "Nokhu Crags Trek", "Night Sky Milky Way Photography"],
        description: "The official moose capital of Colorado featuring rugged glacial peaks, sapphire reservoir waters, and remote high-altitude wilderness."
      }
    ]
  },

  // Texas / Southwest (Austin, Dallas, Houston, etc.)
  "southwest": {
    "within 2 hrs": [
      {
        name: "Pedernales Falls State Park - Multi-Group Tent Camp",
        location: "Johnson City, TX",
        driveDistance: "approx 1 hr drive (42 miles) west of departure",
        pricePerNight: "$26 - $32 / night",
        experienceLevel: "Beginner",
        restrictions: ["No swimming in Pedernales Falls area (flash flood hazards)", "River swimming permitted in designated lower reaches", "Alcohol containers must not be visible"],
        amenities: ["Restrooms with hot showers", "Water and 30-amp electric hookups", "Covered group pavilion", "Bird-viewing blind"],
        activities: ["Limestone Slab River Scrambling", "Wolf Mountain Trail Hike", "Tubing Lower River", "Dutch Oven Campfire Cooking"],
        description: "Sculpted limestone riverbeds, cascading turquoise river pools, and tranquil shaded cedar and oak campsites in the heart of Texas Hill Country."
      },
      {
        name: "McKinney Falls State Park Campground",
        location: "Austin, TX",
        driveDistance: "approx 20 min drive (12 miles) from departure",
        pricePerNight: "$24 - $30 / night",
        experienceLevel: "Beginner",
        restrictions: ["Campsite occupancy limited to 8 persons", "Pet leash required on all trails", "Quiet hours 10 PM - 6 AM"],
        amenities: ["Flush toilets and hot showers", "Water & 30/50 amp electric hookups", "Paved multi-use trail"],
        activities: ["Onion Creek Swimming", "Bouldering & Rock Climbing", "Historic Homestead Walks", "Campfire Cookouts"],
        description: "Urban Hill Country sanctuary boasting limestone waterfall ledges, deep emerald swimming holes, and massive centuries-old cypress trees."
      },
      {
        name: "Inks Lake State Park Campground",
        location: "Burnet, TX",
        driveDistance: "approx 1 hr 15 min drive (65 miles) northwest",
        pricePerNight: "$28 - $36 / night",
        experienceLevel: "Intermediate",
        restrictions: ["Devil's Waterhole cliff jumping at own risk", "Glass containers strictly banned throughout park", "Motorboat speed zones enforced"],
        amenities: ["Modern flush restrooms & hot showers", "Canoe & paddleboat rentals at park store", "Fish cleaning stations"],
        activities: ["Devil's Waterhole Cliff Leaping", "Pink Granite Boulder Scrambling", "Sunset Kayaking", "Cast Iron Searing"],
        description: "Pink gneiss rock formations contrasting against deep blue sparkling lake waters, offering prime group paddling and cooling afternoon swims."
      }
    ]
  },

  // Ontario, Canada (Toronto, Ottawa, etc.)
  "ontario": {
    "within 2 hrs": [
      {
        name: "Sibbald Point Provincial Park Campground",
        location: "Sutton West, ON (Lake Simcoe)",
        driveDistance: "approx 1 hr drive (85 km) north via Hwy 404",
        pricePerNight: "$42 - $52 / night",
        experienceLevel: "Beginner",
        restrictions: ["Zero alcohol and cannabis ban during Victoria Day weekend", "Quiet hours 10 PM - 7 AM", "Max 6 people & 3 shelters per site"],
        amenities: ["Comfort stations with hot flush showers", "Extensive sandy Lake Simcoe beach", "Camp store with ice, firewood & snacks", "Laundromat"],
        activities: ["Lake Simcoe Beach Swimming", "Maidenhead Trail Walking", "Sunset Lakefront Picnics", "Campfire S'mores"],
        description: "Expansive sandy freshwater beaches and wide grassy campsites shaded by mature hardwoods, making group coordination effortless."
      },
      {
        name: "Bronte Creek Provincial Park - Campground Loop",
        location: "Oakville, ON",
        driveDistance: "approx 40 min drive (45 km) via QEW West",
        pricePerNight: "$40 - $48 / night",
        experienceLevel: "Beginner",
        restrictions: ["Campfires in designated fire pits only", "No alcohol outside designated campsite boundary", "Pet-designated trail rules apply"],
        amenities: ["Modern comfort stations with laundry", "1.8-acre outdoor recreation swimming pool", "Paved multi-use bicycle trails", "Disc golf course"],
        activities: ["Ravine Trail Hiking", "Disc Golf Tournament", "Recreational Swimming", "Dutch Oven Campfire Stews"],
        description: "Surprisingly secluded nature escape right on the edge of the GTA, featuring deep forested ravine trails and spacious group-friendly loops."
      },
      {
        name: "Darlington Provincial Park Campground",
        location: "Bowmanville, ON (Lake Ontario)",
        driveDistance: "approx 50 min drive (65 km) east via Hwy 401",
        pricePerNight: "$38 - $46 / night",
        experienceLevel: "Beginner",
        restrictions: ["Quiet hours enforced 10 PM - 7 AM", "Firewood must not be transported from long distances", "Max 1 vehicle per basic site"],
        amenities: ["Flush comfort stations with showers", "Lake Ontario sandy swimming beach", "McLaughlin Bay canoe launch"],
        activities: ["McLaughlin Bay Paddling", "Lakefront Sunset Walks", "Migratory Bird Watching", "Campfire Grilling"],
        description: "Conveniently located waterfront park with peaceful coastal wetland marshes, quiet woodland loops, and expansive lake vistas."
      }
    ],
    "3-4 hrs drive": [
      {
        name: "Algonquin Provincial Park - Lake of Two Rivers",
        location: "Central Ontario, ON (Hwy 60 Corridor)",
        driveDistance: "approx 3 hrs 15 min drive (285 km) via Hwy 400 & Hwy 11 N",
        pricePerNight: "$46 - $55 / night",
        experienceLevel: "Intermediate",
        restrictions: ["Strict glass container ban on backcountry lakes", "Max 6 persons & 2 cars per campsite", "Firewood must be purchased locally", "Quiet hours strictly 10 PM - 7 AM"],
        amenities: ["Comfort stations with hot water & flush toilets", "Potable water filling stations", "On-site outfitter & canoe rental", "Camp store with ice, grill & groceries"],
        activities: ["Canoeing & Portage", "Centennial Ridges Day Hike", "Lakefront Stargazing", "Cast Iron Skillet Cooking"],
        description: "Iconic granite and white pine lakefront sites with immediate paddle access, ideal for adjacent multi-group campsite setups."
      },
      {
        name: "Awenda Provincial Park - Hawk Campground",
        location: "Tiny, ON (Georgian Bay)",
        driveDistance: "approx 2 hrs 15 min drive (170 km) north via Hwy 400",
        pricePerNight: "$42 - $50 / night",
        experienceLevel: "Intermediate",
        restrictions: ["Strict 10 PM quiet hours", "Pet leashes required outside dog beach", "Radios prohibited in radio-free loops"],
        amenities: ["Private oversized forested sites", "Comfort stations with showers", "Georgian Bay cobble & sand beaches"],
        activities: ["Georgian Bay Bluff Walking", "Kettle Lake Canoeing", "Sunset Beach Picnics", "Campfire Gatherings"],
        description: "Famous for exceptionally spacious, private campsites separated by dense mature deciduous forest, just a short trail walk from turquoise Georgian Bay."
      },
      {
        name: "Killarney Provincial Park - George Lake Campground",
        location: "Killarney, ON",
        driveDistance: "approx 4 hrs 15 min drive (410 km) via Hwy 400 & Hwy 69",
        pricePerNight: "$48 - $58 / night",
        experienceLevel: "Backcountry / Expert",
        restrictions: ["Cans and glass containers banned in interior", "Group sizes strictly monitored", "Bear proofing mandatory"],
        amenities: ["George Lake comfort station", "Canoe rentals on site", "Group camping loops available"],
        activities: ["The Crack Ridge Hike", "White Quartzite Peak Climbing", "Lake Canoeing", "Northern Lights Watching"],
        description: "The crown jewel of Ontario wilderness, showcasing gleaming white quartzite ridges, sapphire-blue waters, and dramatic Group of Seven landscapes."
      }
    ]
  }
};

// Fallback generator that selects genuine regional parks based on location and drive time
export function getCuratedRegionalParks(
  locationStr: string,
  driveDistanceStr: string,
  experienceStr: string,
  coords?: { lat: number; lng: number }
): ParkRecommendation[] {
  const region = detectLocationRegion(locationStr, coords);
  const regionData = REGIONAL_PARKS[region] || REGIONAL_PARKS["california"];

  // Match drive distance bracket
  let bracket = "within 2 hrs";
  const dist = (driveDistanceStr || "").toLowerCase();
  if (dist.includes("3") || dist.includes("4")) {
    bracket = "3-4 hrs drive";
  } else if (dist.includes("5") || dist.includes("remote")) {
    bracket = "3-4 hrs drive"; // Will use longest tier
  }

  const matches = regionData[bracket] || regionData["within 2 hrs"] || REGIONAL_PARKS["ontario"]["within 2 hrs"];

  // Dynamically tailor the distance label to the user's specific city
  const userCity = locationStr.trim() || "your location";
  return matches.map((park) => {
    let driveDistance = park.driveDistance;
    if (driveDistance.includes("from departure")) {
      driveDistance = driveDistance.replace("from departure", `from ${userCity}`);
    } else if (!driveDistance.includes(userCity)) {
      driveDistance = `${driveDistance} from ${userCity}`;
    }
    return {
      ...park,
      driveDistance
    };
  });
}
