import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { AuditLog } from '@/models';
import { isGlobalAdmin } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    if (!(await isGlobalAdmin())) {
        return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    await dbConnect();

    try {
        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get('projectId');
        const actorType = searchParams.get('actorType');
        const entityType = searchParams.get('entityType');
        const limit = parseInt(searchParams.get('limit') || '100');
        const page = parseInt(searchParams.get('page') || '1');

        const query: any = {};
        if (projectId) query.projectId = projectId;
        if (actorType) query.actorType = actorType;
        if (entityType) query.entityType = entityType;

        const total = await AuditLog.countDocuments(query);
        const logs = await AuditLog.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('projectId', 'name');

        return NextResponse.json({
            logs,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
