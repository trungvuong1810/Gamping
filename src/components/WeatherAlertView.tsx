import React, { useState, useEffect } from 'react';
import { Trip, TripMember, User, WeatherReport, WeatherForecastDay } from '../types';
import { fetchTripWeather, sendTripWeatherReport, toggleTripWeatherAutoAlert } from '../api/client';
import { 
  CloudSun, 
  CloudRain, 
  Sun, 
  Wind, 
  Thermometer, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles, 
  Calendar, 
  MapPin, 
  Mail, 
  RefreshCw, 
  Info,
  Layers,
  ChevronRight
} from 'lucide-react';

interface WeatherAlertViewProps {
  trip: Trip;
  currentUser: User;
  members: TripMember[];
  onRefreshTrip: () => void;
}

export const WeatherAlertView: React.FC<WeatherAlertViewProps> = ({
  trip,
  currentUser,
  members,
  onRefreshTrip
}) => {
  const [loading, setLoading] = useState(true);
  const [weatherData, setWeatherData] = useState<WeatherReport | null>(null);
  const [autoAlert, setAutoAlert] = useState(trip.weatherAlertConfig?.autoAlertEnabled ?? true);
  const [lastSentAt, setLastSentAt] = useState<string | undefined>(trip.weatherAlertConfig?.lastSentAt);
  const [resendReady, setResendReady] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);
  const [sendToAll, setSendToAll] = useState(true);
  const [customEmail, setCustomEmail] = useState(currentUser.email);
  const [sending, setSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [toggling, setToggling] = useState(false);
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');

  const loadWeather = async () => {
    setLoading(true);
    try {
      const res = await fetchTripWeather(trip.id);
      setWeatherData(res.weather);
      setAutoAlert(res.autoAlertEnabled);
      setLastSentAt(res.lastSentAt);
      setResendReady(res.resendConfigured);
      setMapsReady(res.googleMapsConfigured);
    } catch (err: any) {
      console.error('Failed to load weather:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();
  }, [trip.id]);

  const handleToggleAutoAlert = async () => {
    const nextVal = !autoAlert;
    setToggling(true);
    try {
      await toggleTripWeatherAutoAlert(trip.id, nextVal);
      setAutoAlert(nextVal);
      onRefreshTrip();
    } catch (err) {
      console.error(err);
    } finally {
      setToggling(false);
    }
  };

  const handleSendReport = async () => {
    setSending(true);
    setSendFeedback(null);
    try {
      const res = await sendTripWeatherReport({
        tripId: trip.id,
        targetEmail: sendToAll ? undefined : customEmail,
        sendToAllMembers: sendToAll
      });
      setSendFeedback({
        type: 'success',
        message: res.message
      });
      setLastSentAt(new Date().toISOString());
      onRefreshTrip();
    } catch (err: any) {
      setSendFeedback({
        type: 'error',
        message: err.message || 'Failed to send weather briefing.'
      });
    } finally {
      setSending(false);
    }
  };

  const getWeatherIcon = (condition: string, precip: number) => {
    const c = condition.toLowerCase();
    if (c.includes('rain') || c.includes('shower') || precip > 50) {
      return <CloudRain className="w-6 h-6 text-neutral-800" />;
    }
    if (c.includes('clear') || c.includes('sunny')) {
      return <Sun className="w-6 h-6 text-[#3A3B3A]" />;
    }
    if (c.includes('wind')) {
      return <Wind className="w-6 h-6 text-neutral-700" />;
    }
    return <CloudSun className="w-6 h-6 text-[#3A3B3A]" />;
  };

  // Calculate days until trip departure
  const today = new Date();
  const tripStart = new Date(trip.startDate + "T00:00:00");
  const diffTime = tripStart.getTime() - today.getTime();
  const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12" id="weather-alert-panel">
      
      {/* 1. Header Banner & Status */}
      <div className="p-6 rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-neutral-100 text-[#3A3B3A] border border-neutral-200">
                Google Maps Weather Service
              </span>
              {daysUntil > 0 && daysUntil <= 7 ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Departure in {daysUntil} Days (1-Wk Alert Window)
                </span>
              ) : daysUntil > 7 ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-neutral-100 text-neutral-700 border border-neutral-200 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Departs in {daysUntil} Days
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-neutral-100 text-neutral-700 border border-neutral-200">
                  Current / Past Trip
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#3A3B3A]">
              7-Day Pre-Trip Weather Briefing
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{trip.parkDetails?.name || trip.title} &bull; {trip.location}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={loadWeather}
              disabled={loading}
              title="Refresh weather data"
              className="p-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Status description pill */}
        <div className="mt-5 p-4 rounded-xl border border-neutral-200 bg-neutral-50/70 text-xs sm:text-sm text-[#3A3B3A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#3A3B3A] text-white flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-neutral-900">
                Automated 1-Week Pre-Trip Weather Report: <span className={autoAlert ? "text-emerald-700 font-semibold" : "text-neutral-500"}>{autoAlert ? "Active (Armed)" : "Paused"}</span>
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Automatically emails real-time campsite weather forecasts and packing advisories to all campers 7 days before departure.
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleAutoAlert}
            disabled={toggling}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
              autoAlert 
                ? 'bg-neutral-200 text-neutral-800 hover:bg-neutral-300' 
                : 'bg-[#3A3B3A] text-white hover:bg-neutral-800'
            }`}
          >
            {autoAlert ? 'Disable Auto-Alert' : 'Enable 1-Wk Alert'}
          </button>
        </div>
      </div>

      {/* 2. Dispatch / Test Email Action Card */}
      <div className="p-6 rounded-2xl border border-neutral-200 bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#3A3B3A]" />
            <h3 className="text-sm font-semibold text-[#3A3B3A] uppercase tracking-wider">
              Deliver Weather Briefing to Email
            </h3>
          </div>
          {lastSentAt && (
            <span className="text-[11px] text-neutral-500 flex items-center gap-1 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Last dispatched: {new Date(lastSentAt).toLocaleDateString()} at {new Date(lastSentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
          Test or immediately send the full 7-day weather briefing with day-by-day temperature highs/lows, rain probabilities, wind conditions, and automated packing advice.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer select-none">
              <input 
                type="radio" 
                name="recipientChoice" 
                checked={sendToAll} 
                onChange={() => setSendToAll(true)}
                className="text-[#3A3B3A] focus:ring-[#3A3B3A]"
              />
              <span>Send to all {members.length} trip members</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer select-none">
              <input 
                type="radio" 
                name="recipientChoice" 
                checked={!sendToAll} 
                onChange={() => setSendToAll(false)}
                className="text-[#3A3B3A] focus:ring-[#3A3B3A]"
              />
              <span>Send test to my email</span>
            </label>
          </div>

          {!sendToAll && (
            <input
              type="email"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              placeholder="camper@example.com"
              className="px-3 py-1.5 text-xs rounded-lg border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-[#3A3B3A] flex-1 max-w-xs"
            />
          )}

          <button
            onClick={handleSendReport}
            disabled={sending || loading}
            id="btn-dispatch-weather-email"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#3A3B3A] text-white text-xs font-semibold rounded-xl hover:bg-neutral-800 transition disabled:opacity-50 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sending ? 'Dispatching Email...' : 'Send 7-Day Weather Briefing Now'}</span>
          </button>
        </div>

        {sendFeedback && (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            sendFeedback.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {sendFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{sendFeedback.message}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-neutral-400 pt-2 border-t border-neutral-100">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${resendReady ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
            Resend Email Service: {resendReady ? 'Live Connected' : 'Simulated / Sandbox'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${mapsReady ? 'bg-emerald-500' : 'bg-neutral-400'}`}></span>
            Google Maps Platform: {mapsReady ? 'Live Weather API' : 'Curated Fallback'}
          </span>
        </div>
      </div>

      {/* 3. Day-by-Day Forecast Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#3A3B3A] uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Camping Days Meteorological Forecast
          </h3>
          <div className="flex items-center gap-3">
            {/* Unit Switcher */}
            <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg text-xs border border-neutral-200">
              <button
                type="button"
                onClick={() => setUnitSystem('metric')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  unitSystem === 'metric'
                    ? 'bg-white text-neutral-950 font-semibold shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                °C / km/h (Metric)
              </button>
              <button
                type="button"
                onClick={() => setUnitSystem('imperial')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  unitSystem === 'imperial'
                    ? 'bg-white text-neutral-950 font-semibold shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                °F / mph (Imperial)
              </button>
            </div>
            <span className="text-xs text-neutral-500 font-mono hidden sm:inline">
              {weatherData?.forecastDays?.length || 0} Days Available
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center border border-neutral-200 rounded-2xl bg-white">
            <RefreshCw className="w-6 h-6 animate-spin text-[#3A3B3A] mx-auto mb-2" />
            <p className="text-xs text-neutral-500">Querying Google Maps Platform Weather API for campsite coordinates...</p>
          </div>
        ) : weatherData?.forecastDays && weatherData.forecastDays.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {weatherData.forecastDays.map((day: WeatherForecastDay, idx: number) => {
              const maxTemp = unitSystem === 'metric' ? `${day.maxTempC}°C` : `${day.maxTempF}°F`;
              const minTemp = unitSystem === 'metric' ? `${day.minTempC}°C` : `${day.minTempF}°F`;
              const altTemp = unitSystem === 'metric' ? `${day.maxTempF}° / ${day.minTempF}°F` : `${day.maxTempC}° / ${day.minTempC}°C`;
              const windSpeed = unitSystem === 'metric' 
                ? `${day.windSpeedKmph || Math.round((day.windSpeedMph || 0) * 1.60934)} km/h` 
                : `${day.windSpeedMph} mph`;

              return (
                <div 
                  key={day.date || idx}
                  className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-sm flex flex-col justify-between space-y-3 hover:border-neutral-400 transition"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                      <span className="font-semibold text-neutral-900">{day.dayName}</span>
                      <span className="font-mono text-[11px]">{day.date}</span>
                    </div>

                    <div className="flex items-center gap-3 my-2">
                      <div className="p-2 rounded-xl bg-neutral-100 shrink-0">
                        {getWeatherIcon(day.condition, day.precipitationPercent)}
                      </div>
                      <div>
                        <div className="text-base font-bold text-neutral-950">
                          {maxTemp} / <span className="text-neutral-500 font-normal">{minTemp}</span>
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          {altTemp}
                        </div>
                        <div className="text-xs text-neutral-600 font-medium capitalize mt-0.5">
                          {day.condition}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-neutral-100 text-[11px]">
                    <div className="flex items-center justify-between text-neutral-600">
                      <span>Precipitation:</span>
                      <span className={`font-semibold ${
                        day.precipitationPercent > 40 ? 'text-blue-700' : 'text-neutral-800'
                      }`}>
                        {day.precipitationPercent}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-neutral-600">
                      <span>Wind:</span>
                      <span className="font-medium text-neutral-800">{windSpeed}</span>
                    </div>

                    <div className="flex items-center justify-between text-neutral-600">
                      <span>UV Index:</span>
                      <span className="font-medium text-neutral-800">{day.uvIndex} / 10</span>
                    </div>

                    {day.advisory && (
                      <div className="mt-2 p-1.5 rounded-lg bg-neutral-50 text-[10px] text-neutral-600 border border-neutral-200 leading-tight">
                        💡 {day.advisory}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center border border-neutral-200 rounded-2xl bg-white text-xs text-neutral-500">
            No weather forecast available for this location.
          </div>
        )}
      </div>

      {/* 4. Smart Camping Gear Advisory */}
      {weatherData?.gearRecommendations && weatherData.gearRecommendations.length > 0 && (
        <div className="p-6 rounded-2xl border border-neutral-200 bg-white shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#3A3B3A]" />
            <h3 className="text-sm font-semibold text-[#3A3B3A] uppercase tracking-wider">
              Automated Camping Pack & Gear Advisories
            </h3>
          </div>
          <p className="text-xs text-neutral-500">
            Based on the forecasted temperatures, precipitation, and winds at {trip.parkDetails?.name || trip.location}:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {weatherData.gearRecommendations.map((gear: string, i: number) => (
              <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl border border-neutral-100 bg-neutral-50/70 text-xs text-neutral-700">
                <span className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{gear}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Mandatory Google Maps Platform Attribution (dedicated separate line) */}
      <div className="text-center pt-4 pb-2 border-t border-neutral-200">
        <p className="text-xs text-neutral-400 font-normal">
          Weather data provided by Google Maps Platform
        </p>
      </div>

    </div>
  );
};
