import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const prisma = new PrismaClient();
const DEFAULT_ZIP = '61273';

interface UserResponse {
  user: {
    id: string;
    defaultZipCode: string | null;
  };
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// Common headers for CORS
const getCorsHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
};

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
    // If zip code not found, try default zip code
    if (zipCode !== DEFAULT_ZIP) {
      console.log(`ZIP code ${zipCode} not found, trying default ${DEFAULT_ZIP}`);
      return getCoordinatesFromZipCode(DEFAULT_ZIP);
    }
    return null;
  } catch (error) {
    console.error('Error geocoding zip code:', error);
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        {
          status: 401,
          headers: getCorsHeaders(),
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const includeCoords = searchParams.get('includeCoords') === 'true';

    // Ensure the user can only access their own preferences
    if (userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        {
          status: 403,
          headers: getCorsHeaders(),
        }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        {
          status: 400,
          headers: getCorsHeaders(),
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
      return NextResponse.json(
        { error: 'User not found' },
        {
          status: 404,
          headers: getCorsHeaders(),
        }
      );
    }

    let responseData: UserResponse = { user };

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

    return NextResponse.json(responseData, {
      status: 200,
      headers: getCorsHeaders(),
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: getCorsHeaders(),
      }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        {
          status: 401,
          headers: getCorsHeaders(),
        }
      );
    }

    const { userId, zipCode } = await request.json();
    
    // Ensure the user can only update their own preferences
    if (userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        {
          status: 403,
          headers: getCorsHeaders(),
        }
      );
    }

    if (!userId || !zipCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        {
          status: 400,
          headers: getCorsHeaders(),
        }
      );
    }

    // Validate zip code format
    if (!/^\d{5}(-\d{4})?$/.test(zipCode)) {
      return NextResponse.json(
        { error: 'Invalid zip code format' },
        {
          status: 400,
          headers: getCorsHeaders(),
        }
      );
    }

    // Verify zip code exists by attempting to geocode it
    const coordinates = await getCoordinatesFromZipCode(zipCode);
    if (!coordinates) {
      return NextResponse.json(
        { error: 'Invalid zip code' },
        {
          status: 400,
          headers: getCorsHeaders(),
        }
      );
    }

    // Use upsert to create or update user with a temporary email if creating
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: { defaultZipCode: zipCode },
      create: {
        id: userId,
        email: `${userId}@temporary.com`, // Temporary email until auth is implemented
        defaultZipCode: zipCode
      }
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          defaultZipCode: user.defaultZipCode
        },
        coordinates
      },
      {
        status: 200,
        headers: getCorsHeaders(),
      }
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error updating user preferences:', error.message);
      // Check if it's a Prisma error with a known error code
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'User already exists with different ID' },
          {
            status: 409,
            headers: getCorsHeaders(),
          }
        );
      }
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: getCorsHeaders(),
      }
    );
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 204,
      headers: getCorsHeaders(),
    }
  );
}