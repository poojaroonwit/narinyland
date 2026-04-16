"use client";

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in react-leaflet
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapLocationProps {
  latitude: number;
  longitude: number;
  onLocationSelect: (lat: number, lng: number) => void;
}

// Helper component to center map and handle clicks
function LocationMarker({ latitude, longitude, onLocationSelect }: MapLocationProps) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([latitude, longitude], map.getZoom());
  }, [latitude, longitude, map]);

  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return latitude !== 0 && longitude !== 0 ? (
    <Marker position={[latitude, longitude]} />
  ) : null;
}

export default function LocationPickerMap({ 
  latitude, 
  longitude, 
  onLocationSelect 
}: MapLocationProps) {
  // Default to somewhere (e.g., center of map or previous location)
  const defaultCenter: [number, number] = [13.7563, 100.5018]; // Bangkok as default

  const mapCenter: [number, number] = latitude !== 0 && longitude !== 0 
    ? [latitude, longitude] 
    : defaultCenter;

  return (
    <div className="w-full h-[250px] rounded-md overflow-hidden shadow-inner border-2 border-pink-50 relative z-0">
      <MapContainer 
        center={mapCenter} 
        zoom={13} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker 
          latitude={latitude} 
          longitude={longitude} 
          onLocationSelect={onLocationSelect} 
        />
      </MapContainer>
    </div>
  );
}

