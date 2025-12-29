import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Issue } from '@/models';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    await dbConnect();
    try {
        const issues = await Issue.find({ projectId: id }).sort({ createdAt: -1 });
        return NextResponse.json(issues);
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
        const { title, description, type, assignedTo } = body;

        const issue = await Issue.create({
            projectId: id,
            title,
            description,
            type,
            assignedTo: assignedTo || 'ai'
        });

        return NextResponse.json(issue, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
