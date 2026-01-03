import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Requirement } from '@/models';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logAudit } from '@/lib/audit-service';

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string, reqId: string }> }
) {
    const { reqId } = await params;
    await dbConnect();
    try {
        const body = await req.json();
        const requirement = await Requirement.findByIdAndUpdate(
            reqId,
            { ...body },
            { new: true }
        );

        if (!requirement) {
            return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
        }

        const session = await getServerSession(authOptions);

        // Determine if this was an approval
        const action = body.status === 'approved' ? 'requirement_approve' : 'requirement_update';

        // Log requirement update
        await logAudit({
            actorId: session?.user ? (session.user as any).id : 'system',
            actorName: session?.user?.name || 'User',
            actorType: 'user',
            action,
            entityType: 'requirement',
            entityId: requirement._id.toString(),
            projectId: requirement.projectId.toString(),
            description: `${session?.user?.name || 'User'} updated requirement: ${requirement.title}${body.status === 'approved' ? ' (APPROVED)' : ''}`
        });

        return NextResponse.json(requirement);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
