import { NextResponse } from 'next/server';
import { userProfileService } from '@/entities/user-profile/server/user-profile.service';

// GET: Check if user profile exists and has consent
export async function GET() {
    try {
        const data = await userProfileService.getUserProfile();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error fetching user profile:', error);
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST: Create or update user profile with consent
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const data = await userProfileService.upsertUserProfile(body);
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error creating user profile:', error);
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error.message === 'Both consents are required') {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
