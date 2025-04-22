'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

// Import map component dynamically to avoid SSR issues
const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div>Loading map...</div>
});

export default function Home() {
  const [view, setView] = useState<'map' | 'list'>('map');
  const [showZipDialog, setShowZipDialog] = useState(false);
  const [zipCode, setZipCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [userId] = useState('test-user'); // TODO: Replace with actual user ID from auth

  useEffect(() => {
    // Fetch current ZIP code when dialog opens
    if (showZipDialog) {
      fetch(`/api/user/preferences?userId=${userId}`)
        .then(response => response.json())
        .then(data => {
          if (data.user?.defaultZipCode) {
            setZipCode(data.user.defaultZipCode);
          }
        })
        .catch(error => {
          console.error('Error fetching current ZIP code:', error);
        });
    }
  }, [showZipDialog, userId]);

  const handleZipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          zipCode,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update zip code');
      }

      setShowZipDialog(false);
      // Refresh map to use new location
      window.location.reload();
    } catch (error) {
      console.error('Error updating zip code:', error);
      setError(error instanceof Error ? error.message : 'Failed to update zip code');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Cards on the Go</h1>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setShowZipDialog(true)}
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 flex items-center gap-2"
              title="Set Default Location"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              Location
            </button>
            <button
              onClick={() => setView('map')}
              className={`px-4 py-2 rounded ${view === 'map' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              Map View
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              List View
            </button>
          </div>
        </div>

        {view === 'map' ? (
          <div className="h-[600px] rounded-lg overflow-hidden">
            <Map />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Event and business cards will go here */}
            <p className="col-span-full text-center text-gray-500">Loading events and businesses...</p>
          </div>
        )}

        {showZipDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">Set Default Location</h2>
                <button
                  onClick={() => setShowZipDialog(false)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleZipSubmit}>
                <div className="mb-4">
                  <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    id="zipCode"
                    value={zipCode}
                    onChange={(e) => {
                      setError('');
                      setZipCode(e.target.value);
                    }}
                    placeholder="Enter ZIP code"
                    pattern="^\d{5}(-\d{4})?$"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={isSubmitting}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Enter a 5-digit ZIP code to set your default map location
                  </p>
                  {error && (
                    <p className="mt-2 text-sm text-red-600">{error}</p>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowZipDialog(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Saving...
                      </>
                    ) : (
                      'Save'
                    )}
                  </button>