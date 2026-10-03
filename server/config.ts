import dotenv from "dotenv";

dotenv.config();

export const PORT = Number(process.env.PORT) || 3000;

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
