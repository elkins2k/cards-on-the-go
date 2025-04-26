'use client';

import { useEffect, useState } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '100%'
};

export default function Map({ userId }: { userId?: string }) {
  const DEFAULT_ZIP = '61273';
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 40.7128,
    lng: -74.0060
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getDefaultLocation = async (): Promise<{ lat: number; lng: number }> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${DEFAULT_ZIP}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`,
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch default location');
      }

      const data = await response.json();
      if (data.results?.[0]?.geometry?.location) {
        return data.results[0].geometry.location;
      }
      throw new Error('Could not get coordinates for default zip code');
    } catch (error) {
      return { lat: 40.7128, lng: -74.0060 }; // NYC coordinates as fallback
    }
  };

  const initializeLocation = async () => {
    setIsLoading(true);
    setError(null);

    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });
        
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsLoading(false);
        return;
      } catch (geoError) {
        setError('Location access denied. Using alternative location.');
      }
    }

    if (userId) {
      try {
        const response = await fetch(`/api/user/preferences?userId=${userId}&includeCoords=true`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch location');
        }
        
        if (data.coordinates) {
          setUserLocation({
            lat: data.coordinates.latitude,
            lng: data.coordinates.longitude
          });
          setError('Using your saved location. Allow location access to see your current position.');
          setIsLoading(false);
          return;
        }
      } catch (prefError) {
        setError('Could not load saved location. Using default location.');
      }
    }

    const defaultLocation = await getDefaultLocation();
    setUserLocation(defaultLocation);
    if (!error) {
      setError('Using default location (61273).');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    initializeLocation();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-red-600">Google Maps API key is not configured</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      {error && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[1000] bg-white px-4 py-2 rounded-lg shadow-lg border border-red-200">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={userLocation}
          zoom={13}
        >
          <Marker position={userLocation} />
        </GoogleMap>
      </LoadScript>
    </div>
  );
}