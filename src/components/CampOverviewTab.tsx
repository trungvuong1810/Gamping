import React, { useState } from 'react';
import { Trip, TripMember, Group, EquipmentItem, FoodItem, WeatherReport } from '../types';
import {
  Calendar,
  MapPin,
  Users,
  Backpack,
  Utensils,
  Share2,
  Check,
  ExternalLink
} from 'lucide-react';
import { formatFriendlyDate } from '../utils/holidays';

interface CampOverviewTabProps {
  trip: Trip;
  members: TripMember[];
  groups: Group[];
  equipment: EquipmentItem[];
  food: FoodItem[];
  weather?: WeatherReport | null;
  onNavigateTab: (tab: 'overview' | 'groups' | 'gear' | 'food' | 'weather') => void;
  onEditTrip?: () => void;
}

export const CampOverviewTab: React.FC<CampOverviewTabProps> = ({
  trip,
  members,
  groups,
  equipment,
  food,
  weather,
  onNavigateTab,
  onEditTrip
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isBlackAndWhiteMap, setIsBlackAndWhiteMap] = useState(true);

  // Packing stats
  const totalGear = equipment.length;
  const packedGear = equipment.filter(e => e.packed).length;
  const gearPercent = totalGear > 0 ? Math.round((packedGear / totalGear) * 100) : 0;

  // Meal stats
  const totalMeals = food.length;

  // Days calculation
  const startD = new Date(trip.startDate);
  const endD = new Date(trip.endDate);
  const diffTime = Math.abs(endD.getTime() - startD.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // Countdown to departure
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const timeToStart = startD.getTime() - today.getTime();
  const daysUntil = Math.ceil(timeToStart / (1000 * 60 * 60 * 24));

  const handleCopyShareLink = () => {
    const url = window.location.origin;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="space-y-8 bg-white text-black">
      {/* Hero Banner: Clean Minimalist White & Black Outline with #D6B588 Boxes */}
      <div className="border-2 border-black p-8 bg-white space-y-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              {/* #D6B588 box with inner white text */}
              <span className="bg-[#D6B588] text-white font-bold text-xs uppercase tracking-wider px-3 py-1 border border-black">
                Camping Expedition
              </span>
              {daysUntil > 0 ? (
                <span className="text-xs font-semibold text-black uppercase tracking-wider border border-black px-2.5 py-1">
                  Departing in {daysUntil} {daysUntil === 1 ? 'day' : 'days'}
                </span>
              ) : daysUntil === 0 ? (
                <span className="bg-[#D6B588] text-white font-bold text-xs uppercase tracking-wider px-2.5 py-1 border border-black animate-pulse">
                  Departure is Today
                </span>
              ) : (
                <span className="text-xs text-black/60 font-medium">Past Expedition</span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-black tracking-tight uppercase leading-tight">
              {trip.title}
            </h1>

            <div className="flex items-center gap-4 text-xs sm:text-sm text-black flex-wrap font-medium">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-black" />
                <span>{trip.location || 'Camping Grounds'}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-black" />
                <span>{formatFriendlyDate(trip.startDate)} to {formatFriendlyDate(trip.endDate)} ({diffDays} Days)</span>
              </div>
            </div>
          </div>

          {/* Action buttons (#D6B588 box with inner white text) */}
          <div className="flex items-center gap-3 flex-wrap shrink-0">
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="bg-white hover:bg-neutral-100 text-black text-xs font-bold uppercase tracking-wider px-4 py-2.5 border border-black transition-all flex items-center gap-2 cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-black" /> : <Share2 className="w-4 h-4 text-black" />}
              <span>{copiedLink ? 'Link Copied' : 'Share Trip Link'}</span>
            </button>

            {onEditTrip && (
              <button
                type="button"
                onClick={onEditTrip}
                className="bg-[#D6B588] hover:bg-[#c9a676] text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 border border-black transition-all cursor-pointer shadow-xs"
              >
                Edit Trip Details
              </button>
            )}
          </div>
        </div>

        {/* 4 Metric Boxes: #D6B588 Boxes with Inner White Texts */}
        <div className="pt-6 border-t border-black grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Box 1 */}
          <div className="bg-[#D6B588] text-white p-5 border border-black">
            <div className="text-[11px] font-bold uppercase tracking-widest text-white/90">Total Campers</div>
            <div className="text-3xl font-black text-white mt-1">
              {members.length}
            </div>
            <div className="text-xs text-white/90 mt-1 font-medium">
              Across {groups.length} groups
            </div>
          </div>

          {/* Box 2 */}
          <div
            onClick={() => onNavigateTab('gear')}
            className="bg-[#D6B588] text-white p-5 border border-black hover:opacity-95 transition-all cursor-pointer"
          >
            <div className="text-[11px] font-bold uppercase tracking-widest text-white/90 flex items-center justify-between">
              <span>Gear Checklist</span>
              <span>{gearPercent}%</span>
            </div>
            <div className="text-3xl font-black text-white mt-1">
              {packedGear}/{totalGear}
            </div>
            <div className="text-xs text-white/90 mt-1 font-medium">
              Items packed & ready
            </div>
          </div>

          {/* Box 3 */}
          <div
            onClick={() => onNavigateTab('food')}
            className="bg-[#D6B588] text-white p-5 border border-black hover:opacity-95 transition-all cursor-pointer"
          >
            <div className="text-[11px] font-bold uppercase tracking-widest text-white/90">Camp Menus</div>
            <div className="text-3xl font-black text-white mt-1">
              {totalMeals}
            </div>
            <div className="text-xs text-white/90 mt-1 font-medium">
              Meals scheduled
            </div>
          </div>

          {/* Box 4 */}
          <div
            onClick={() => onNavigateTab('weather')}
            className="bg-[#D6B588] text-white p-5 border border-black hover:opacity-95 transition-all cursor-pointer"
          >
            <div className="text-[11px] font-bold uppercase tracking-widest text-white/90">Google Weather</div>
            <div className="text-xl font-black text-white mt-2 truncate">
              {weather?.summary ? weather.summary.split(',')[0] : 'Live Forecast'}
            </div>
            <div className="text-xs text-white/90 mt-1 font-medium">
              View daily forecast →
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Black & White Google Maps / Destination card & Group Coordination */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Destination & Black and White Map */}
        <div className="lg:col-span-2 space-y-8">
          {/* Destination Details with Black and White Google Maps View */}
          <div className="border border-black p-6 bg-white space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-black" />
                <h3 className="font-bold text-black text-sm uppercase tracking-wider">Destination & Campsite</h3>
                {isBlackAndWhiteMap && (
                  <span className="bg-[#D6B588] text-white text-[10px] font-bold uppercase px-2 py-0.5 border border-black">
                    Monochrome Map
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsBlackAndWhiteMap(!isBlackAndWhiteMap)}
                  className={`text-[11px] font-bold uppercase cursor-pointer border border-black px-2.5 py-1 transition-all ${
                    isBlackAndWhiteMap
                      ? 'bg-black text-white hover:bg-neutral-800'
                      : 'bg-white text-black hover:bg-neutral-100'
                  }`}
                >
                  {isBlackAndWhiteMap ? '✓ Black & White Map' : 'Switch to B&W Map'}
                </button>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.location || 'Campground')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-black hover:underline font-bold uppercase flex items-center gap-1"
                >
                  <span>Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Black and White Google Map Container */}
            <div className="w-full h-80 sm:h-96 border-2 border-black bg-neutral-100 overflow-hidden relative">
              <iframe
                title="Campground Location"
                width="100%"
                height="100%"
                style={{
                  border: 0,
                  filter: isBlackAndWhiteMap
                    ? 'grayscale(100%) contrast(125%) brightness(98%)'
                    : 'none',
                  WebkitFilter: isBlackAndWhiteMap
                    ? 'grayscale(100%) contrast(125%) brightness(98%)'
                    : 'none'
                }}
                loading="lazy"
                allowFullScreen
                src={`https://maps.google.com/maps?q=${encodeURIComponent(trip.location || 'Camping')}&t=&z=12&ie=UTF8&iwloc=&output=embed`}
              ></iframe>

              {/* Corner badge indicating active map filter */}
              {isBlackAndWhiteMap && (
                <div className="absolute bottom-2 left-2 pointer-events-none bg-black/90 text-white text-[10px] font-mono uppercase px-2 py-0.5 border border-black backdrop-blur-xs">
                  B&W Map Mode
                </div>
              )}
            </div>

            {trip.parkDetails && (
              <div className="p-4 border border-black bg-white space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase">
                  <span>{trip.parkDetails.name}</span>
                  <span className="text-black/70">{trip.parkDetails.driveDistance}</span>
                </div>
                <p className="text-xs text-black/80 leading-relaxed">{trip.parkDetails.description}</p>
              </div>
            )}
          </div>

          {/* Quick Groups Breakdown */}
          <div className="border border-black p-6 bg-white space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-black" />
                <h3 className="font-bold text-black text-sm uppercase tracking-wider">Expedition Groups</h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('groups')}
                className="text-xs font-bold text-black hover:underline uppercase"
              >
                Manage Groups →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {groups.map((g) => {
                const groupMembers = members.filter(m => (m as any).groupId === g.id);
                const groupGear = equipment.filter(e => e.groupId === g.id);
                const groupFood = food.filter(f => f.groupId === g.id);

                return (
                  <div
                    key={g.id}
                    onClick={() => onNavigateTab('groups')}
                    className="p-4 border border-black bg-white hover:bg-neutral-50 transition-all cursor-pointer space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs uppercase tracking-tight text-black">{g.name}</span>
                      <span className="bg-[#D6B588] text-white font-bold text-[10px] px-2 py-0.5 border border-black">
                        {groupMembers.length} {groupMembers.length === 1 ? 'Camper' : 'Campers'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-black pt-1 font-medium">
                      <span className="flex items-center gap-1">
                        <Backpack className="w-3.5 h-3.5 text-black" />
                        {groupGear.length} Gear items
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Utensils className="w-3.5 h-3.5 text-black" />
                        {groupFood.length} Meals
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Quick AI Grok Assistant Card */}
          <div className="border border-black p-6 bg-white space-y-3">
            <h3 className="font-bold text-black text-sm uppercase tracking-wider">Grok Expedition AI</h3>
            <p className="text-xs text-black/80 leading-relaxed">
              Generate gear checklists and campfire culinary menus tailored to your campground's terrain, weather, and party size.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => onNavigateTab('gear')}
                className="bg-[#D6B588] hover:bg-[#c9a676] text-white font-bold text-xs uppercase tracking-wider py-2.5 px-3 border border-black transition-all text-center cursor-pointer shadow-xs"
              >
                Gear Ideas
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('food')}
                className="bg-[#D6B588] hover:bg-[#c9a676] text-white font-bold text-xs uppercase tracking-wider py-2.5 px-3 border border-black transition-all text-center cursor-pointer shadow-xs"
              >
                Campfire Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
