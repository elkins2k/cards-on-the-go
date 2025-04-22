import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const includeCoords = searchParams.get('includeCoords') === 'true';

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        defaultZipCode: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (includeCoords && user.defaultZipCode) {
      const coordinates = await getCoordinatesFromZipCode(user.defaultZipCode);
      if (coordinates) {
        return NextResponse.json({ user, coordinates });
      }
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { userId, zipCode } = await request.json();
    
    if (!userId || !zipCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate zip code format
    if (!/^\d{5}(-\d{4})?$/.test(zipCode)) {
      return NextResponse.json({ error: 'Invalid zip code format' }, { status: 400 });
    }

    // Verify zip code exists by attempting to geocode it
    const coordinates = await getCoordinatesFromZipCode(zipCode);
    if (!coordinates) {
      return NextResponse.json({ error: 'Invalid zip code' }, { status: 400 });
    }

    // Update user preferences
    const user = await prisma.user.update({
      where: { id: userId },
      data: { defaultZipCode: zipCode }
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        defaultZipCode: user.defaultZipCode
      },
      coordinates
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}