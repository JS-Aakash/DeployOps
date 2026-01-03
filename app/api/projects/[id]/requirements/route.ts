import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Requirement } from '@/models';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logAudit } from '@/lib/audit-service';

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

        const session = await getServerSession(authOptions);

        // Log requirement creation
        await logAudit({
            actorId: session?.user ? (session.user as any).id : 'system',
            actorName: session?.user?.name || 'AI Designer',
            actorType: session?.user ? 'user' : 'ai',
            action: 'requirement_create',
            entityType: 'requirement',
            entityId: requirement._id.toString(),
            projectId: id,
            description: `${session?.user?.name || 'AI Designer'} created requirement: ${requirement.title}`
        });

        return NextResponse.json(requirement, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
