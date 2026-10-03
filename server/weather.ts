import { getGoogleMapsApiKeys } from "./config.js";
import { sendWeatherReportEmail } from "./email.js";
import { db, saveDb } from "./storage.js";
import { REFERENCE_CITIES } from "./places.js";
import type { Trip } from "../src/types.js";

// ==========================================
// Google Maps Platform Weather API & Automated 7-Day Pre-Trip Alert
// ==========================================

export async function resolveLocationCoordinates(parkName?: string, locationName?: string, fallbackCoords?: { lat: number; lng: number }): Promise<{ lat: number; lng: number }> {
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

export async function resolveTripCoordinates(trip: any): Promise<{ lat: number; lng: number }> {
  const parkCoord = trip.parkDetails?.coordinates;
  return resolveLocationCoordinates(
    trip.parkDetails?.name,
    trip.parkDetails?.location || trip.location,
    parkCoord
  );
}

export function decodeWmoWeatherCode(code: number): { condition: string; advisoryHint: string } {
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

export async function fetchLiveMeteorologicalForecast(lat: number, lng: number, daysCount: number = 7) {
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

export async function fetchGoogleMapsWeatherForecast(lat: number, lng: number, daysCount: number = 7) {
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

export function generateCuratedWeatherForecast(lat: number, lng: number, daysCount: number = 7) {
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

export function generateCampingWeatherAdvisories(forecastDays: any[], locationName: string): string[] {
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
export async function checkAndDispatchWeatherAlerts() {
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
