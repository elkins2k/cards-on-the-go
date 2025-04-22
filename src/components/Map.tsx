'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import L from 'leaflet';
import NodeGeocoder from 'node-geocoder';
import { LatLngExpression } from 'leaflet';

const geocoder = NodeGeocoder({
  provider: 'openstreetmap'
});

// Fix Leaflet default marker icons
const defaultIcon = L.icon({
  iconUrl: '/marker-icon.png',
  iconRetinaUrl: '/marker-icon-2x.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = defaultIcon;

export default function Map({ userId }: { userId?: string }) {
  const [userLocation, setUserLocation] = useState<LatLngExpression>([40.7128, -74.0060]); // Default to NYC

  useEffect(() => {
    async function initializeLocation() {
      if (userId) {
        try {
          const response = await fetch(`/api/user/preferences?userId=${userId}`);
          const data = await response.json();
          
          if (data.user?.defaultZipCode) {
            const locations = await geocoder.geocode(data.user.defaultZipCode);
            if (locations?.[0]?.latitude != null && locations[0]?.longitude != null) {
              setUserLocation([
                locations[0].latitude as number,
                locations[0].longitude as number
              ]);
              return;
            }
          }
        } catch (error) {
          console.error('Error fetching user preferences:', error);
        }
      }

      // Fall back to browser geolocation if no zip code or error
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation([position.coords.latitude, position.coords.longitude]);
          },
          (error) => {
            console.error('Error getting location:', error);
          }
        );
      }
    }

    initializeLocation();
  }, [userId]);

  return (
    <MapContainer
      center={userLocation as LatLngExpression}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={userLocation as LatLngExpression}>
        <Popup>You are here</Popup>
      </Marker>
    </MapContainer>
  );
}