'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import L from 'leaflet';

export default function Map({ userId }: { userId?: string }) {
  const DEFAULT_ZIP = '61273';
  const [userLocation, setUserLocation] = useState<[number, number]>([40.7128, -74.0060]); // Temporary default until we get coordinates
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fix Leaflet default marker icons
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: 'marker-icon.png',
      iconRetinaUrl: 'marker-icon-2x.png',
      shadowUrl: 'marker-shadow.png',
    });
  }, []);

  useEffect(() => {
    async function getDefaultLocation() {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${DEFAULT_ZIP}&countrycodes=us`,
          {
            headers: {
              'User-Agent': 'CardsOnTheGo/1.0',
              'Accept-Language': 'en-US'
            }
          }
        );
        const data = await response.json();
        if (data?.[0]) {
          return [parseFloat(data[0].lat), parseFloat(data[0].lon)] as [number, number];
        }
        throw new Error('Could not get coordinates for default zip code');
      } catch (error) {
        console.error('Error getting default location:', error);
        return [40.7128, -74.0060] as [number, number]; // Fallback if geocoding fails
      }
    }

    async function initializeLocation() {
      setIsLoading(true);
      setError(null);

      // Try browser geolocation first
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            });
          });
          
          setUserLocation([position.coords.latitude, position.coords.longitude]);
          setIsLoading(false);
          return;
        } catch (error) {
          console.error('Error getting browser location:', error);
        }
      }

      // Try user preferences if available
      if (userId) {
        try {
          const response = await fetch(`/api/user/preferences?userId=${userId}&includeCoords=true`);
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch location');
          }
          
          if (data.coordinates) {
            setUserLocation([data.coordinates.latitude, data.coordinates.longitude]);
            setError('Using your saved location. Allow location access to see your current position.');
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error('Error fetching user preferences:', error);
        }
      }

      // Use default zip code location
      try {
        const defaultLocation = await getDefaultLocation();
        setUserLocation(defaultLocation);
        setError('Could not determine your location. Using default location (61273).');
      } catch (error) {
        console.error('Error setting default location:', error);
      } finally {
        setIsLoading(false);
      }
    }

    initializeLocation();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white px-4 py-2 rounded-lg shadow-lg border border-red-200">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      <MapContainer
        center={userLocation}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={userLocation}>
          <Popup>You are here</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}