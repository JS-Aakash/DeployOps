import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Requirement } from '@/models';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    await dbConnect();
    try {
        const requirements = await Requirement.find({ projectId: id }).sort({ createdAt: -1 });
        return NextResponse.json(requirements);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    await dbConnect();
    try {
        const body = await req.json();
        const { title, description, priority, status, createdBy } = body;

        const requirement = await Requirement.create({
            projectId: id,
            title,
            description,
            priority: priority || 'medium',
            status: status || 'draft',
            createdBy: createdBy || 'admin'
        });

        return NextResponse.json(requirement, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
