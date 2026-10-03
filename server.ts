import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { PORT } from "./server/config.js";
import { isGrokConfigured, getGrokModelName } from "./server/grok.js";
import { supabaseServer, hydrateAllFromSupabase } from "./server/supabase.js";
import { checkAndDispatchWeatherAlerts } from "./server/weather.js";
import { router as aiRoutes } from "./server/routes/ai.js";
import { router as placesRoutes } from "./server/routes/places.js";
import { router as authRoutes } from "./server/routes/auth.js";
import { router as tripsRoutes } from "./server/routes/trips.js";
import { router as adminRoutes } from "./server/routes/admin.js";
import { router as groupsRoutes } from "./server/routes/groups.js";
import { router as equipmentRoutes } from "./server/routes/equipment.js";
import { router as foodRoutes } from "./server/routes/food.js";
import { router as weatherRoutes } from "./server/routes/weather.js";

const app = express();
app.use(express.json());

if (isGrokConfigured()) {
  console.log(`[Grok] Connected using live xAI API (model: ${getGrokModelName()})`);
} else {
  console.log("[Grok] No GROK_API_KEY set — using curated offline suggestions.");
}

app.use(aiRoutes);
app.use(placesRoutes);
app.use(authRoutes);
app.use(tripsRoutes);
app.use(adminRoutes);
app.use(groupsRoutes);
app.use(equipmentRoutes);
app.use(foodRoutes);
app.use(weatherRoutes);

// Setup Vite middleware or static serving
async function start() {
  // Load saved data from Supabase before accepting requests, so nobody sees stale local data
  if (supabaseServer) {
    await hydrateAllFromSupabase();
  }

  // Start background 1-week pre-trip weather checker
  checkAndDispatchWeatherAlerts().catch(console.error);
  setInterval(checkAndDispatchWeatherAlerts, 1000 * 60 * 60); // run hourly

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Gamping server running on http://0.0.0.0:${PORT}`);
  });
}

start();
