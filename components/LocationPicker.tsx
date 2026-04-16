"use client";

import React, { useState, useEffect, useRef } from 'react';

interface LocationPickerProps {
  location: string;
  latitude?: number;
  longitude?: number;
  onChange: (location: string, latitude?: number, longitude?: number) => void;
  isFutureDate?: boolean;
}

export default function LocationPicker({ location, latitude, longitude, onChange, isFutureDate }: LocationPickerProps) {
  const [searchText, setSearchText] = useState(location);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Click outside to close dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isTyping) return;
    
    const delayDebounceFn = setTimeout(async () => {
      if (searchText.trim()) {
        setIsSearching(true);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}`);
          const data = await res.json();
          setSuggestions(data || []);
          setShowDropdown(true);
        } catch (e) {
          console.error("Search failed", e);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchText, isTyping]);

  const handleSelectLocation = (suggestion: any) => {
    const newLat = parseFloat(suggestion.lat);
    const newLng = parseFloat(suggestion.lon);
    setIsTyping(false); // don't search again when selecting
    setSearchText(suggestion.display_name);
    setShowDropdown(false);
    onChange(suggestion.display_name, newLat, newLng);
  };

  const colorFocus = isFutureDate ? 'focus:ring-purple-300 border-purple-50' : 'focus:ring-pink-300 border-pink-50';
  const colorText = isFutureDate ? 'text-purple-400' : 'text-pink-400';

  return (
    <div className="flex flex-col gap-3 relative" ref={dropdownRef}>
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Location</label>
      
      <div className="relative group">
        <input 
          type="text" 
          value={searchText} 
          onChange={(e) => {
            setSearchText(e.target.value);
            setIsTyping(true);
            // Optimistically update location text without changing lat/lng yet
            onChange(e.target.value, latitude, longitude);
          }}
          className={`w-full border-2 rounded-md p-4 pr-10 text-sm font-bold text-gray-700 outline-none transition-all bg-white shadow-sm hover:border-pink-100 ${colorFocus}`}
          placeholder="Enter location..."
        />
        {isSearching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <i className={`fas fa-circle-notch fa-spin text-sm ${colorText}`}></i>
          </div>
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 max-h-[280px] overflow-y-auto bg-white/95 backdrop-blur-md border border-gray-100 rounded-md shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-[100] p-2 divide-y divide-gray-50 scale-in-center">
          {suggestions.map((suggestion, idx) => (
            <div 
              key={idx}
              onClick={() => handleSelectLocation(suggestion)}
              className="p-4 hover:bg-pink-50/50 cursor-pointer flex items-center gap-4 transition-all first:rounded-t-md last:rounded-b-md group/item"
            >
              <div className="w-8 h-8 rounded-full bg-gray-50 group-hover/item:bg-white flex items-center justify-center shrink-0 transition-colors shadow-sm">
                <i className="fas fa-location-arrow text-pink-400 text-xs"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-gray-800 truncate">{suggestion.display_name.split(',')[0]}</p>
                <p className="text-[10px] text-gray-400 font-bold truncate">{suggestion.display_name.split(',').slice(1).join(',').trim()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

