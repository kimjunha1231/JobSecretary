import { NextResponse } from 'next/server';
import { userProfileService } from '@/entities/user/server/user-profile.service';
import { logger } from "@/shared/lib";

// GET: Check if user profile exists and has consent
export async function GET() {
    try {
        const data = await userProfileService.getUserProfile();
        return NextResponse.json(data);
    } catch (error: unknown) {
        logger.error('Error fetching user profile:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// POST: Create or update user profile with consent
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const data = await userProfileService.upsertUserProfile(body);
        return NextResponse.json(data);
    } catch (error: unknown) {
        logger.error('Error creating user profile:', error);
        if (error instanceof Error) {
            if (error.message === 'Unauthorized') {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            if (error.message === 'Both consents are required') {
                return NextResponse.json({ error: error.message }, { status: 400 });
            }
            // Fallback for other known errors
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        // Fallback for unknown errors
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
