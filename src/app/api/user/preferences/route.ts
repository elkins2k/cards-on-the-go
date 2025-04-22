import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import NodeGeocoder from 'node-geocoder';

const prisma = new PrismaClient();
const geocoder = NodeGeocoder({
  provider: 'openstreetmap'
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

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

    // Get coordinates for the zip code
    const locations = await geocoder.geocode(zipCode);
    if (!locations || locations.length === 0) {
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
      }
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}