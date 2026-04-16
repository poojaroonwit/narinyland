"use client";

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Interaction } from '../types';

// Fix for default marker icon in react-leaflet
// Fix for default marker icon in react-leaflet using an inline SVG DivIcon
const createCustomIcon = () => {
  return L.divIcon({
    className: 'custom-marker-icon',
    html: `<div style="
      width: 28px;
      height: 28px;
      background-color: #ec4899;
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 10px;
        height: 10px;
        background-color: white;
        border-radius: 50%;
        transform: rotate(45deg);
      "></div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
};
const DefaultIcon = createCustomIcon();
L.Marker.prototype.options.icon = DefaultIcon;


interface World2DMapProps {
  timeline: Interaction[];
  onFlagClick: (item: Interaction) => void;
  onZoomOut: () => void;
}

function ZoomHandler({ onZoomOut }: { onZoomOut: () => void }) {
  useMapEvents({
    zoomend: (e) => {
      if (e.target.getZoom() < 3) {
        onZoomOut();
      }
    }
  });
  return null;
}

export default function World2DMap({ timeline, onFlagClick, onZoomOut }: World2DMapProps) {
  const defaultCenter: [number, number] = [20, 0];

  return (
    <div className="w-full h-full absolute inset-0 z-10 animate-fade-in bg-slate-900">
      <MapContainer 
        center={defaultCenter} 
        zoom={3} 
        minZoom={2} 
        style={{ height: '100%', width: '100%', zIndex: 10 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomHandler onZoomOut={onZoomOut} />
        
        {timeline.filter(t => {
          const lat = typeof t.latitude === 'string' ? parseFloat(t.latitude) : t.latitude;
          const lng = typeof t.longitude === 'string' ? parseFloat(t.longitude) : t.longitude;
          return lat != null && lng != null && isFinite(lat) && isFinite(lng);
        }).map((item) => {
          const lat = typeof item.latitude === 'string' ? parseFloat(item.latitude) : item.latitude!;
          const lng = typeof item.longitude === 'string' ? parseFloat(item.longitude) : item.longitude!;
          return (
            <Marker 
              key={item.id} 
              position={[lat, lng]}
              eventHandlers={{
                click: () => onFlagClick(item),
              }}
            >

            <Popup>
               <div className="text-center">
                  <p className="font-bold text-sm mb-1">{item.location || item.text}</p>
                  <p className="text-xs text-gray-500 mb-2">{new Date(item.timestamp).toLocaleDateString()}</p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onFlagClick(item); }}
                    className="text-xs bg-pink-500 text-white px-3 py-1 rounded w-full hover:bg-pink-600 transition-colors"
                  >
                    View Memory
                  </button>
               </div>
            </Popup>
          </Marker>
          );
        })}
      </MapContainer>
      
      <button 
        onClick={onZoomOut}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] bg-white text-pink-600 px-6 py-3 rounded-full font-bold shadow-xl border border-pink-100 hover:bg-pink-50 transition-colors flex items-center gap-2"
      >
        <i className="fas fa-globe"></i> Back to 3D Globe
      </button>
    </div>
  );
}
