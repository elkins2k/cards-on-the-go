'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

// Import map component dynamically to avoid SSR issues
const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div>Loading map...</div>
});

export default function Home() {
  const [view, setView] = useState<'map' | 'list'>('map');

  return (
    <main className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Cards on the Go</h1>
          <div className="flex gap-2">
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
      </div>
    </main>
  );
}
