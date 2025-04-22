'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import L from 'leaflet';

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
  const [userLocation, setUserLocation] = useState<[number, number]>([40.7128, -74.0060]); // Default to NYC
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function tryGeolocation(options: PositionOptions): Promise<GeolocationPosition> {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });
    }

    async function initializeLocation() {
      setIsLoading(true);
      setError(null);

      // Try browser geolocation with different accuracy levels
      if (navigator.geolocation) {
        try {
          // First try with high accuracy
          try {
            const position = await tryGeolocation({
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            });
            setUserLocation([position.coords.latitude, position.coords.longitude]);
            setIsLoading(false);
            return;
          } catch (error) {
            console.log('High accuracy location failed, trying low accuracy...');
            
            // If high accuracy fails, try with low accuracy
            const position = await tryGeolocation({
              enableHighAccuracy: false,
              timeout: 15000,
              maximumAge: 30000
            });
            setUserLocation([position.coords.latitude, position.coords.longitude]);
            setError('Using approximate location. For better accuracy, try again in a place with better GPS signal.');
            setIsLoading(false);
            return;
          }
        } catch (error) {
          let errorMessage = 'Could not access your location. ';
          if (error instanceof GeolocationPositionError) {
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage += 'Please allow location access in your browser settings.';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage += 'Location information is unavailable.';
                break;
              case error.TIMEOUT:
                errorMessage += 'Location request timed out.';
                break;
              default:
                errorMessage += 'An unknown error occurred.';
            }
          }
          console.error('Geolocation error:', error);
          setError(errorMessage);
          
          // Try to fall back to user preferences
          if (userId) {
            try {
              const response = await fetch(`/api/user/preferences?userId=${userId}&includeCoords=true`);
              const data = await response.json();
              
              if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch location');
              }
              
              if (data.coordinates) {
                setUserLocation([data.coordinates.latitude, data.coordinates.longitude]);
                setError(errorMessage + ' Using your saved location instead.');
                setIsLoading(false);
                return;
              }
            } catch (prefError) {
              console.error('Error fetching user preferences:', prefError);
            }
          }
        }
      } else {
        setError('Your browser does not support geolocation. Please use a modern browser or set a default location.');
      }

      // If all else fails, use default NYC location
      setError((prev) => (prev ? `${prev} Using default location.` : 'Could not determine your location. Using default location.'));
      setIsLoading(false);
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