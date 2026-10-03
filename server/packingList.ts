// Helper for comprehensive Grok packing list generator
export function generateCuratedGrokPackingList(
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
