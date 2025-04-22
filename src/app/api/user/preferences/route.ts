import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { headers } from 'next/headers';

const prisma = new PrismaClient();

// Rate limiting for OpenStreetMap API
const RATE_LIMIT_WINDOW = 1000; // 1 second minimum between requests
let lastRequestTime = 0;

async function getCoordinatesFromZipCode(zipCode: string) {
  try {
    // Ensure minimum delay between requests
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < RATE_LIMIT_WINDOW) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_WINDOW - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${zipCode}&countrycodes=us`,
      {
        headers: {
          'User-Agent': 'CardsOnTheGo/1.0',
          'Accept-Language': 'en-US'
        }
      }
    );
    
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a few seconds.');
    }
    
    if (!response.ok) {
      throw new Error(`Geocoding failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data[0]) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error('Error geocoding zip code:', error);
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const headersList = headers();
    const origin = headersList.get('origin') || '*';

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const includeCoords = searchParams.get('includeCoords') === 'true';

    if (!userId) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing userId parameter' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        defaultZipCode: true
      }
    });

    if (!user) {
      return new NextResponse(
        JSON.stringify({ error: 'User not found' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    let responseData = { user };

    if (includeCoords && user.defaultZipCode) {
      try {
        const coordinates = await getCoordinatesFromZipCode(user.defaultZipCode);
        if (coordinates) {
          responseData = { ...responseData, coordinates };
        }
      } catch (error) {
        console.error('Error getting coordinates:', error);
        // Continue without coordinates
      }
    }

    return new NextResponse(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const headersList = headers();
    const origin = headersList.get('origin') || '*';

    const { userId, zipCode } = await request.json();
    
    if (!userId || !zipCode) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Validate zip code format
    if (!/^\d{5}(-\d{4})?$/.test(zipCode)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid zip code format' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Verify zip code exists by attempting to geocode it
    const coordinates = await getCoordinatesFromZipCode(zipCode);
    if (!coordinates) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid zip code' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Update user preferences
    const user = await prisma.user.update({
      where: { id: userId },
      data: { defaultZipCode: zipCode }
    });

    return new NextResponse(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          defaultZipCode: user.defaultZipCode
        },
        coordinates
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: Request) {
  const headersList = headers();
  const origin = headersList.get('origin') || '*';

  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}