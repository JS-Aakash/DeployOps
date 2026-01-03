import { NextResponse } from 'next/server';
import { isGlobalAdmin } from '@/lib/auth-utils';

export async function GET() {
    const isAdmin = await isGlobalAdmin();
    return NextResponse.json({ isAdmin });
}
