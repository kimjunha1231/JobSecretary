import { NextResponse } from 'next/server';
import { userProfileService } from '@/entities/user/api/user-profile.service';
import { logger } from "@/shared/lib";

// GET: Check if user profile exists and has consent
export async function GET() {
    try {
        const data = await userProfileService.getUserProfile();
        return NextResponse.json(data);
    } catch (error: unknown) {
        logger.error('Error fetching user profile:', error);
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json(
            { error: 'Failed to fetch user profile' },
            { status: 500 }
        );
    }
}

// POST: Create or update user profile with consent
export async function POST(request: Request) {
    try {
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
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
            return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 });
        }
        return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 });
    }
}
