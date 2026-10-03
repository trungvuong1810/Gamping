import { Resend } from "resend";
import "./config.js";
import type { Trip } from "../src/types.js";

// Resend Email Helper with automatic domain fallback
export async function sendResendEmailWithFallback(resend: Resend, payload: {
  fromName?: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
}) {
  const preferredFrom = payload.fromName 
    ? `"${payload.fromName}" <unboxdesign.canada@gmail.com>` 
    : "unboxdesign.canada@gmail.com";

  // Primary attempt using requested address
  let result = await resend.emails.send({
    from: preferredFrom,
    replyTo: "unboxdesign.canada@gmail.com",
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });

  // If primary attempt fails due to validation_error (e.g., unverified domain for @gmail.com), fallback to onboarding@resend.dev
  if (result.error && (result.error.name === "validation_error" || (result.error.message || "").toLowerCase().includes("domain") || (result.error.message || "").toLowerCase().includes("verify"))) {
    console.warn(`Resend domain validation notice for unboxdesign.canada@gmail.com (${result.error.message}). Falling back to onboarding@resend.dev...`);
    const fallbackFrom = payload.fromName
      ? `"${payload.fromName}" <onboarding@resend.dev>`
      : "Unbox Design <onboarding@resend.dev>";
    
    result = await resend.emails.send({
      from: fallbackFrom,
      replyTo: "unboxdesign.canada@gmail.com",
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
  }

  return result;
}

// Resend Email Helper (Recommended free tier for 1-click email invitation links)
export async function sendInvitationEmail(toEmail: string, tripTitle: string, hostName: string, inviteLink: string) {
  if (!process.env.RESEND_API_KEY) {
    return { sent: false, reason: "No RESEND_API_KEY set" };
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await sendResendEmailWithFallback(resend, {
      fromName: hostName || "Camping App",
      to: [toEmail],
      subject: `🏕️ You're invited to ${tripTitle} by ${hostName}!`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 16px;">
          <h2 style="color: #171717; margin-bottom: 8px;">You're Invited to Camp!</h2>
          <p style="color: #525252; font-size: 14px; line-height: 1.6;">
            <strong>${hostName}</strong> invited you to join the multi-group camping trip <strong>${tripTitle}</strong>.
          </p>
          <p style="color: #737373; font-size: 13px;">
            No password or trip ID entry required — click the button below to automatically join the trip and coordinate equipment and meals instantly:
          </p>
          <div style="margin: 28px 0;">
            <a href="${inviteLink}" style="background-color: #0a0a0a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
              Join Camping Trip Now →
            </a>
          </div>
          <p style="color: #a3a3a3; font-size: 11px;">
            Or copy this direct link: <br/><code>${inviteLink}</code>
          </p>
        </div>
      `
    });

    if (error) {
      console.warn(`Resend email delivery notice for ${toEmail}:`, error);
      return { 
        sent: false, 
        error: error.message || "Failed to deliver via Resend API",
        details: error,
        isSandboxRestricted: (error.message || "").toLowerCase().includes("testing emails to your own email address") || (error.name === "validation_error")
      };
    }
    return { sent: true, data };
  } catch (err: any) {
    console.error("Resend email delivery error:", err);
    return { sent: false, error: err.message };
  }
}

// 7-Day Pre-Trip Weather Email Dispatcher (Resend + Google Maps Weather Platform)
export async function sendWeatherReportEmail(opts: {
  toEmail: string;
  recipientName: string;
  trip: any;
  daysUntilDeparture: number;
  forecastDays: any[];
  gearAlerts: string[];
  campsiteName: string;
  appUrl?: string;
}) {
  const { toEmail, recipientName, trip, daysUntilDeparture, forecastDays, gearAlerts, campsiteName, appUrl } = opts;

  if (!process.env.RESEND_API_KEY) {
    console.log(`[Weather Email] (Simulated Mode - No RESEND_API_KEY) Would send 7-day weather briefing to ${toEmail} for trip "${trip.title}"`);
    return { sent: true, simulated: true, message: `Simulated weather briefing sent to ${toEmail}` };
  }

  const baseUrl = appUrl || process.env.PUBLIC_APP_URL || "http://localhost:3000";
  const tripLink = `${baseUrl}/?tripId=${trip.id}`;

  const daysHtml = (forecastDays || []).slice(0, 7).map(d => `
    <tr style="border-bottom: 1px solid #f0f0f0;">
      <td style="padding: 10px 8px; font-size: 13px; font-weight: 600; color: #171717;">
        ${d.dayName}<br/><span style="font-size: 11px; font-weight: 400; color: #737373;">${d.date}</span>
      </td>
      <td style="padding: 10px 8px; font-size: 13px; color: #3A3B3A;">
        <strong>${d.condition}</strong>
      </td>
      <td style="padding: 10px 8px; font-size: 13px; color: #171717; font-family: monospace;">
        <strong>${d.maxTempC}°C</strong> / <span style="color: #737373;">${d.minTempC}°C</span>
        <div style="font-size: 10px; color: #a3a3a3;">(${d.maxTempF}° / ${d.minTempF}°F)</div>
      </td>
      <td style="padding: 10px 8px; font-size: 13px; color: ${d.precipitationPercent > 35 ? '#0284c7' : '#525252'}; font-weight: 600;">
        ${d.precipitationPercent}%
      </td>
      <td style="padding: 10px 8px; font-size: 12px; color: #737373;">
        ${d.windSpeedKmph || Math.round((d.windSpeedMph || 0) * 1.60934)} km/h
      </td>
    </tr>
  `).join("");

  const gearHtml = (gearAlerts || []).map(g => `
    <li style="margin-bottom: 8px; font-size: 13px; color: #3A3B3A; line-height: 1.5;">${g}</li>
  `).join("");

  const countdownText = daysUntilDeparture <= 1 
    ? "Departing tomorrow!" 
    : daysUntilDeparture <= 7 
      ? `Departing in ${daysUntilDeparture} days (${trip.startDate})` 
      : `Departure: ${trip.startDate} (${daysUntilDeparture} days away)`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e5e5e5; border-radius: 16px; background-color: #ffffff;">
      <div style="border-bottom: 2px solid #3A3B3A; padding-bottom: 16px; margin-bottom: 20px;">
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #3A3B3A;">GAMPING · 7-Day Pre-Trip Weather Alert</span>
        <h1 style="color: #3A3B3A; font-size: 22px; margin: 8px 0 4px 0; font-weight: 700;">${trip.title}</h1>
        <p style="color: #737373; font-size: 13px; margin: 0;">
          📍 ${campsiteName || trip.location} &bull; 🗓️ ${trip.startDate} to ${trip.endDate}
        </p>
      </div>

      <div style="background-color: #f7f7f7; border-left: 4px solid #3A3B3A; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px;">
        <div style="font-size: 14px; font-weight: 600; color: #3A3B3A; margin-bottom: 4px;">
          🏕️ ${countdownText}
        </div>
        <div style="font-size: 13px; color: #525252; line-height: 1.5;">
          Hello ${recipientName}, here is your official 1-week meteorological status for your upcoming camping trip. Check the temperature drops, rain probabilities, and packing tips below:
        </div>
      </div>

      <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #3A3B3A; margin: 20px 0 12px 0;">
        🌤️ Meteorological Forecast (Camping Window)
      </h3>
      <table style="width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 24px;">
        <thead>
          <tr style="border-bottom: 2px solid #e5e5e5; font-size: 11px; text-transform: uppercase; color: #737373;">
            <th style="padding: 8px;">Day</th>
            <th style="padding: 8px;">Condition</th>
            <th style="padding: 8px;">High/Low</th>
            <th style="padding: 8px;">Rain %</th>
            <th style="padding: 8px;">Wind</th>
          </tr>
        </thead>
        <tbody>
          ${daysHtml}
        </tbody>
      </table>

      ${gearAlerts && gearAlerts.length > 0 ? `
        <div style="background-color: #fafafa; border: 1px solid #e5e5e5; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
          <h4 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #3A3B3A; text-transform: uppercase; letter-spacing: 0.5px;">
            🎒 Tailored Packing & Equipment Checklist
          </h4>
          <ul style="margin: 0; padding-left: 20px;">
            ${gearHtml}
          </ul>
        </div>
      ` : ''}

      <div style="text-align: center; margin: 28px 0 20px 0;">
        <a href="${tripLink}" style="background-color: #3A3B3A; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
          Open Trip in GAMPING →
        </a>
      </div>

      <div style="border-top: 1px solid #eeeeee; padding-top: 16px; margin-top: 24px; text-align: center;">
        <p style="color: #8c8c8c; font-size: 11px; margin: 0 0 4px 0;">
          Weather data provided by Google Maps Platform
        </p>
        <p style="color: #b0b0b0; font-size: 10px; margin: 0;">
          This automatic weather alert was dispatched 1 week prior to departure for ${trip.title}.
        </p>
      </div>
    </div>
  `;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await sendResendEmailWithFallback(resend, {
      fromName: "GAMPING Weather",
      to: [toEmail],
      subject: `🏕️ 7-Day Pre-Trip Weather Status: ${trip.title} (${campsiteName || trip.location})`,
      html
    });

    if (error) {
      console.error("Resend weather email delivery error:", error);
      return { sent: false, error: error.message };
    }
    return { sent: true, data };
  } catch (err: any) {
    console.error("Resend weather email delivery error:", err);
    return { sent: false, error: err.message };
  }
}
