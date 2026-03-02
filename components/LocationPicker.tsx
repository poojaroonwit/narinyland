"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('./LocationPickerMap'), { ssr: false, loading: () => <div className="w-full h-[250px] bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-gray-400">Loading Map...</div> });

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

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const first = data[0];
        const newLat = parseFloat(first.lat);
        const newLng = parseFloat(first.lon);
        onChange(first.display_name, newLat, newLng);
      } else {
        alert("Location not found! Try searching for a broader area.");
        onChange(searchText, latitude, longitude); // Keep original lat/lng if not found
      }
    } catch (e) {
      console.error("Search failed", e);
    } finally {
      setIsSearching(false);
    }
  };

  const colorFocus = isFutureDate ? 'focus:ring-purple-300 border-purple-50' : 'focus:ring-pink-300 border-pink-50';
  const colorText = isFutureDate ? 'text-purple-400' : 'text-pink-400';
  const colorBg = isFutureDate ? 'bg-purple-50 hover:bg-purple-100 text-purple-600' : 'bg-pink-50 hover:bg-pink-100 text-pink-600';

  return (
    <div className="flex flex-col gap-3">
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Location</label>
      
      <div className="flex gap-2">
        <div className="relative flex-1">
          <i className={`fas fa-map-pin absolute left-4 top-1/2 -translate-y-1/2 ${colorText}`}></i>
          <input 
            type="text" 
            value={searchText} 
            onChange={(e) => {
              setSearchText(e.target.value);
              // Optimistically update location text without changing lat/lng yet
              onChange(e.target.value, latitude, longitude);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className={`w-full border-2 rounded-xl p-4 pl-10 text-sm font-bold text-gray-700 outline-none transition-all bg-gray-50/50 ${colorFocus}`}
            placeholder="Where did it happen?"
          />
        </div>
        <button 
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className={`px-4 rounded-xl font-bold transition-colors ${colorBg}`}
        >
          {isSearching ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
        </button>
      </div>

      <Map 
        latitude={latitude || 0} 
        longitude={longitude || 0} 
        onLocationSelect={(lat, lng) => onChange(searchText || location, lat, lng)} 
      />
      <p className="text-[10px] font-bold text-gray-400 text-center">Click on the map to pin exact coordinates</p>
    </div>
  );
}
