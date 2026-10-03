import express from "express";
import { Resend } from "resend";
import { sendWeatherReportEmail } from "../email.js";
import { db, saveDb } from "../storage.js";
import { resolveLocationCoordinates, resolveTripCoordinates, fetchGoogleMapsWeatherForecast, generateCampingWeatherAdvisories, checkAndDispatchWeatherAlerts } from "../weather.js";
import type { Trip } from "../../src/types.js";

export const router = express.Router();

router.get("/api/weather/check", async (req, res) => {
  const parkName = req.query.park as string || req.query.parkName as string || "";
  const locationName = req.query.location as string || "";
  const latParam = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
  const lngParam = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
  const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;

  const coords = await resolveLocationCoordinates(
    parkName,
    locationName,
    (latParam && lngParam) ? { lat: latParam, lng: lngParam } : undefined
  );

  const weather = await fetchGoogleMapsWeatherForecast(coords.lat, coords.lng, days);
  const advisories = generateCampingWeatherAdvisories(weather.forecastDays, parkName || locationName || "Campground");

  return res.json({
    success: true,
    parkName: parkName || "Chosen Park",
    location: locationName,
    coordinates: coords,
    forecastDays: weather.forecastDays,
    summary: `${weather.forecastDays[0]?.condition || 'Temperate'}, ${weather.forecastDays[0]?.maxTempF}°F / ${weather.forecastDays[0]?.minTempF}°F (${weather.forecastDays[0]?.maxTempC}°C / ${weather.forecastDays[0]?.minTempC}°C)`,
    gearRecommendations: advisories,
    source: weather.source,
    attribution: weather.attribution,
    googleMapsConfigured: Boolean(process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY)
  });
});

router.get("/api/weather/trip/:tripId", async (req, res) => {
  const { tripId } = req.params;
  const trip = db.trips.find(t => t.id === tripId);
  if (!trip) {
    return res.status(404).json({ error: "Trip not found" });
  }

  const coords = await resolveTripCoordinates(trip);
  const weather = await fetchGoogleMapsWeatherForecast(coords.lat, coords.lng, 7);
  const gearAlerts = generateCampingWeatherAdvisories(weather.forecastDays, trip.parkDetails?.name || trip.location);

  const now = new Date();
  const tripStart = new Date(trip.startDate + "T00:00:00");
  const diffTime = tripStart.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const weatherReport = {
    tripId: trip.id,
    tripTitle: trip.title,
    campsiteName: trip.parkDetails?.name || trip.title,
    location: trip.parkDetails?.location || trip.location,
    latitude: coords.lat,
    longitude: coords.lng,
    daysUntilDeparture: diffDays,
    forecastDays: weather.forecastDays,
    summary: `${weather.forecastDays[0]?.condition || 'Temperate'}, ${weather.forecastDays[0]?.maxTempF}° / ${weather.forecastDays[0]?.minTempF}°F`,
    gearRecommendations: gearAlerts,
    attribution: weather.attribution,
    source: weather.source
  };

  return res.json({
    success: true,
    weather: weatherReport,
    autoAlertEnabled: trip.weatherAlertConfig?.autoAlertEnabled ?? true,
    lastSentAt: trip.weatherAlertConfig?.lastSentAt,
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    googleMapsConfigured: Boolean(process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY)
  });
});

router.post("/api/weather/send-report", async (req, res) => {
  const { tripId, targetEmail, sendToAllMembers } = req.body;
  const trip = db.trips.find(t => t.id === tripId);
  if (!trip) {
    return res.status(404).json({ error: "Trip not found" });
  }

  const coords = await resolveTripCoordinates(trip);
  const weather = await fetchGoogleMapsWeatherForecast(coords.lat, coords.lng, 7);
  const gearAlerts = generateCampingWeatherAdvisories(weather.forecastDays, trip.parkDetails?.name || trip.location);

  const now = new Date();
  const tripStart = new Date(trip.startDate + "T00:00:00");
  const diffTime = tripStart.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const members = db.tripMembers.filter(tm => tm.tripId === trip.id);

  let recipients: string[] = [];
  if (sendToAllMembers) {
    recipients = Array.from(new Set([trip.hostEmail, ...members.map(m => m.email)])).filter(Boolean);
  } else if (targetEmail) {
    recipients = [targetEmail.trim().toLowerCase()];
  } else {
    recipients = [trip.hostEmail];
  }

  let sentCount = 0;
  for (const email of recipients) {
    const member = members.find(m => m.email.toLowerCase() === email.toLowerCase());
    const result = await sendWeatherReportEmail({
      toEmail: email,
      recipientName: member?.name || trip.hostName || "Camper",
      trip,
      daysUntilDeparture: diffDays,
      forecastDays: weather.forecastDays,
      gearAlerts,
      campsiteName: trip.parkDetails?.name || trip.location
    });
    if (result.sent) sentCount++;
  }

  if (!trip.weatherAlertConfig) {
    trip.weatherAlertConfig = { autoAlertEnabled: true };
  }
  trip.weatherAlertConfig.lastSentAt = new Date().toISOString();
  trip.weatherAlertConfig.lastForecastSummary = `${weather.forecastDays[0]?.maxTempF}°F / ${weather.forecastDays[0]?.minTempF}°F - ${weather.forecastDays[0]?.condition}`;
  saveDb();

  return res.json({
    success: true,
    recipients,
    message: process.env.RESEND_API_KEY 
      ? `7-day pre-trip weather report dispatched via Resend to ${recipients.join(", ")}!`
      : `Weather report generated and previewed for ${recipients.join(", ")} (Connect RESEND_API_KEY in Settings for live inbox delivery).`,
    emailServiceUsed: process.env.RESEND_API_KEY ? "Resend (Live Delivery)" : "Simulated Delivery"
  });
});

router.post("/api/weather/toggle-auto-alert", (req, res) => {
  const { tripId, enabled } = req.body;
  const trip = db.trips.find(t => t.id === tripId);
  if (!trip) {
    return res.status(404).json({ error: "Trip not found" });
  }

  if (!trip.weatherAlertConfig) {
    trip.weatherAlertConfig = { autoAlertEnabled: Boolean(enabled) };
  } else {
    trip.weatherAlertConfig.autoAlertEnabled = Boolean(enabled);
  }
  saveDb();

  return res.json({ success: true, autoAlertEnabled: trip.weatherAlertConfig.autoAlertEnabled });
});

router.get("/api/weather/cron-check", async (req, res) => {
  await checkAndDispatchWeatherAlerts();
  return res.json({ success: true, message: "Weather alert scan complete." });
});
