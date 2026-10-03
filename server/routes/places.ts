import express from "express";
import { getGoogleMapsApiKeys } from "../config.js";
import { GMP_ATTRIBUTION_ID, REFERENCE_CITIES, findClosestCity } from "../places.js";

export const router = express.Router();

// Google Maps Places API Autocomplete & Geocoding Endpoints (with attribution)
router.get("/api/places/autocomplete", async (req, res) => {
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

router.get("/api/places/geocode", async (req, res) => {
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
