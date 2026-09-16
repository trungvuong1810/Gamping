// Source: Google Maps Platform Code Assist
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Loader2, X, Check } from 'lucide-react';

export interface LocationSuggestion {
  description: string;
  placeId: string;
  mainText: string;
  secondaryText: string;
  coordinates?: { lat: number; lng: number };
}

interface LocationAutocompleteInputProps {
  value: string;
  onChange: (value: string, coords?: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  onSelectSuggestion?: (suggestion: LocationSuggestion) => void;
}

export const LocationAutocompleteInput: React.FC<LocationAutocompleteInputProps> = ({
  value,
  onChange,
  placeholder = 'e.g. Seattle, WA or Toronto, ON or Denver, CO',
  className = '',
  id = 'location-autocomplete-input',
  onSelectSuggestion,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [geoNotice, setGeoNotice] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Sync incoming value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle outside click to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions with debounce
  const fetchSuggestions = (query: string) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places/autocomplete?query=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (data.suggestions && data.suggestions.length > 0) {
            setSuggestions(data.suggestions);
            setIsOpen(true);
          } else {
            setSuggestions([]);
          }
        }
      } catch (err) {
        console.warn('Autocomplete fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
    setActiveIdx(-1);
    fetchSuggestions(val);
  };

  const handleSelect = (s: LocationSuggestion) => {
    setInputValue(s.description);
    onChange(s.description, s.coordinates);
    if (onSelectSuggestion) {
      onSelectSuggestion(s);
    }
    setIsOpen(false);
    setSuggestions([]);
  };

  // Browser Geolocation: "Use my current location"
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoNotice('Geolocation is not supported by your browser.');
      setTimeout(() => setGeoNotice(null), 3500);
      return;
    }

    setIsLocating(true);
    setGeoNotice(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`/api/places/geocode?lat=${latitude}&lng=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            const locationName = data.locationName || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setInputValue(locationName);
            onChange(locationName, { lat: latitude, lng: longitude });
            setGeoNotice(`📍 Detected: ${locationName}`);
          } else {
            const fallbackStr = `GPS (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`;
            setInputValue(fallbackStr);
            onChange(fallbackStr, { lat: latitude, lng: longitude });
          }
        } catch (err) {
          const fallbackStr = `GPS (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`;
          setInputValue(fallbackStr);
          onChange(fallbackStr, { lat: latitude, lng: longitude });
        } finally {
          setIsLocating(false);
          setTimeout(() => setGeoNotice(null), 4000);
        }
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Unable to retrieve location.';
        if (err.code === 1) msg = 'Location access permission was denied.';
        else if (err.code === 2) msg = 'Location position unavailable.';
        else if (err.code === 3) msg = 'Location request timed out.';
        setGeoNotice(msg);
        setTimeout(() => setGeoNotice(null), 4000);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && activeIdx < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[activeIdx]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <MapPin className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full text-xs pl-9 pr-24 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:border-neutral-900 font-medium transition ${className}`}
        />

        {/* Clear input button */}
        {inputValue && (
          <button
            type="button"
            onClick={() => {
              setInputValue('');
              onChange('');
              setSuggestions([]);
              setIsOpen(false);
            }}
            className="absolute right-16 p-1 text-neutral-400 hover:text-neutral-700 transition"
            title="Clear location"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* GPS Quick-Detect Button */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          title="Detect my current location via GPS"
          className="absolute right-2 px-2 py-1 text-[11px] font-medium text-neutral-700 hover:text-neutral-950 bg-neutral-100 hover:bg-neutral-200 rounded flex items-center gap-1 transition"
        >
          {isLocating ? (
            <Loader2 className="w-3 h-3 animate-spin text-neutral-600" />
          ) : (
            <Navigation className="w-3 h-3 text-neutral-700" />
          )}
          <span>{isLocating ? 'Locating...' : 'My GPS'}</span>
        </button>
      </div>

      {/* Geolocation status / error banner */}
      {geoNotice && (
        <div className="mt-1 text-[11px] px-2 py-1 bg-neutral-100 text-neutral-700 rounded border border-neutral-200 flex items-center gap-1.5 animate-in fade-in">
          <span>{geoNotice}</span>
        </div>
      )}

      {/* Autocomplete Suggestion Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl border border-neutral-200 shadow-xl overflow-hidden animate-in fade-in duration-150">
          <div className="px-3 py-1.5 bg-neutral-50 border-b border-neutral-100 text-[10px] font-semibold tracking-wider text-neutral-500 uppercase flex items-center justify-between">
            <span>Google Maps Address Suggestions</span>
            {isLoading && <Loader2 className="w-2.5 h-2.5 animate-spin text-neutral-400" />}
          </div>

          <ul className="max-h-60 overflow-y-auto divide-y divide-neutral-100">
            {suggestions.map((s, idx) => {
              const isSelected = idx === activeIdx;
              return (
                <li
                  key={s.placeId || idx}
                  onClick={() => handleSelect(s)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  className={`px-3 py-2.5 cursor-pointer transition flex items-start gap-2.5 ${
                    isSelected ? 'bg-neutral-100 text-neutral-950' : 'hover:bg-neutral-50 text-neutral-800'
                  }`}
                >
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-2.5 h-2.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-neutral-900 truncate">
                      {s.mainText}
                    </div>
                    {s.secondaryText && (
                      <div className="text-[11px] text-neutral-500 truncate">
                        {s.secondaryText}
                      </div>
                    )}
                  </div>
                  {inputValue.toLowerCase() === s.description.toLowerCase() && (
                    <Check className="w-3.5 h-3.5 text-neutral-950 shrink-0 self-center" />
                  )}
                </li>
              );
            })}
          </ul>

          <div className="px-3 py-1 bg-neutral-50/80 border-t border-neutral-100 text-[10px] text-neutral-400 flex items-center justify-between">
            <span>Use ↑↓ keys to navigate, Enter to select</span>
            <span className="font-mono text-[9px] tracking-tight">Google Maps Platform</span>
          </div>
        </div>
      )}
    </div>
  );
};
