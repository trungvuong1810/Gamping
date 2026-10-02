import React, { useState } from 'react';
import { Trip, WeatherReport, WeatherForecastDay } from '../types';
import {
  CloudSun,
  Sun,
  CloudRain,
  Wind,
  Droplets,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface WeatherTabProps {
  trip: Trip;
  weatherReport: WeatherReport | null;
  onRefreshWeather: () => Promise<void>;
}

export const WeatherTab: React.FC<WeatherTabProps> = ({
  trip,
  weatherReport,
  onRefreshWeather
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const days: WeatherForecastDay[] = weatherReport?.forecastDays || [];
  const primaryDay = days[0];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshWeather();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getWeatherIcon = (cond: string) => {
    const c = (cond || '').toLowerCase();
    if (c.includes('rain') || c.includes('shower') || c.includes('storm')) {
      return <CloudRain className="w-6 h-6 text-black" />;
    }
    if (c.includes('cloud') || c.includes('overcast')) {
      return <CloudSun className="w-6 h-6 text-black" />;
    }
    if (c.includes('wind')) {
      return <Wind className="w-6 h-6 text-black" />;
    }
    return <Sun className="w-6 h-6 text-black" />;
  };

  return (
    <div className="space-y-8 bg-white text-black">
      {/* Top Banner */}
      <div className="p-6 border-2 border-black bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CloudSun className="w-5 h-5 text-black" />
            <h2 className="text-lg font-black uppercase tracking-tight text-black">Campground Weather & Outdoor Advisories</h2>
          </div>
          <p className="text-xs text-black/70 mt-1">
            Google Weather & Maps Platform live data for {trip.location}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sand box with inner white text */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-[#D6B588] hover:bg-[#c9a676] text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 border border-black transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Updating Forecast...' : 'Refresh Forecast'}</span>
          </button>
        </div>
      </div>

      {/* Hero Weather Card: Sand box with inner white text */}
      {primaryDay && (
        <div className="bg-[#D6B588] text-white p-8 border-2 border-black space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-black text-white font-bold text-xs uppercase tracking-wider px-2.5 py-0.5 border border-white/40">
                  Departure Day Weather • {primaryDay.dayName}
                </span>
                <span className="text-xs text-white/90 font-medium">{primaryDay.date}</span>
              </div>

              <div className="flex items-baseline gap-4 mt-2">
                <div className="text-5xl font-black text-white">
                  {primaryDay.maxTempF}°F
                </div>
                <div className="text-2xl text-white/90 font-medium">
                  / {primaryDay.minTempF}°F ({primaryDay.maxTempC}°C / {primaryDay.minTempC}°C)
                </div>
              </div>

              <div className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2 pt-1">
                <span>Condition: {primaryDay.condition}</span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 border border-white bg-black/10 p-4 shrink-0">
              <div className="text-center px-3">
                <Droplets className="w-5 h-5 text-white mx-auto" />
                <div className="text-[11px] uppercase tracking-wider text-white/80 mt-1 font-bold">Rain %</div>
                <div className="text-base font-black text-white mt-0.5">{primaryDay.precipitationPercent}%</div>
              </div>

              <div className="text-center px-3 border-x border-white/30">
                <Wind className="w-5 h-5 text-white mx-auto" />
                <div className="text-[11px] uppercase tracking-wider text-white/80 mt-1 font-bold">Wind</div>
                <div className="text-base font-black text-white mt-0.5">{primaryDay.windSpeedMph} mph</div>
              </div>

              <div className="text-center px-3">
                <Sun className="w-5 h-5 text-white mx-auto" />
                <div className="text-[11px] uppercase tracking-wider text-white/80 mt-1 font-bold">UV Index</div>
                <div className="text-base font-black text-white mt-0.5">{primaryDay.uvIndex}</div>
              </div>
            </div>
          </div>

          {/* Camping Weather Advisory banner */}
          {primaryDay.advisory && (
            <div className="pt-4 border-t border-white/30 flex items-start gap-2.5 text-xs text-white bg-black/10 p-3.5 border border-white">
              <AlertTriangle className="w-4 h-4 text-white shrink-0 mt-0.5" />
              <span className="font-medium">{primaryDay.advisory}</span>
            </div>
          )}
        </div>
      )}

      {/* 7-Day Forecast Grid */}
      <div className="border border-black bg-white p-6 space-y-4">
        <h3 className="font-black text-sm uppercase tracking-wider text-black">7-Day Daily Campground Forecast</h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {days.map((day, idx) => (
            <div
              key={idx}
              className={`p-4 border text-center space-y-3 flex flex-col justify-between ${
                idx === 0 ? 'border-2 border-black bg-neutral-50' : 'border border-black bg-white'
              }`}
            >
              <div>
                <div className="font-black text-xs uppercase tracking-tight text-black">{day.dayName}</div>
                <div className="text-[10px] text-black/60 font-medium">{day.date}</div>
              </div>

              <div className="my-1 flex justify-center">
                {getWeatherIcon(day.condition)}
              </div>

              <div>
                <div className="font-black text-xs text-black">
                  {day.maxTempF}° / <span className="text-black/60 font-normal">{day.minTempF}°</span>
                </div>
                <div className="text-[10px] text-black/70 uppercase font-semibold truncate mt-0.5">
                  {day.condition}
                </div>
              </div>

              <div className="pt-2 border-t border-black/20 text-[10px] text-black font-bold flex items-center justify-center gap-1">
                <Droplets className="w-3 h-3 text-black" />
                <span>{day.precipitationPercent}% rain</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Outdoor Gear & Weather Advisories */}
      {weatherReport?.gearRecommendations && weatherReport.gearRecommendations.length > 0 && (
        <div className="border border-black bg-white p-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-black" />
            <h3 className="font-black text-sm uppercase tracking-wider text-black">Weather-Derived Gear Recommendations</h3>
          </div>
          <p className="text-xs text-black/70">
            Based on the forecasted temperatures and precipitation for {trip.location}:
          </p>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-black">
            {weatherReport.gearRecommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2.5 p-3.5 border border-black bg-neutral-50">
                <span className="w-2 h-2 bg-[#D6B588] mt-1 shrink-0"></span>
                <span className="font-medium text-black leading-relaxed">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
