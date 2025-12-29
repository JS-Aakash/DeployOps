import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Project } from '@/models';
import { authorize } from '@/lib/auth-utils';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    await dbConnect();

    // Only Admin/Lead can update project config
    const isAuthorized = await authorize(id, ['admin', 'lead']);
    if (!isAuthorized) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        console.log(`[Project Settings] RECEIVED BODY:`, JSON.stringify(body));
        const { vercelProjectId, vercelToken, netlifySiteId, netlifyToken } = body;

        const updateData: any = {};
        if (vercelProjectId && vercelProjectId.trim()) updateData.vercelProjectId = vercelProjectId.trim();
        if (vercelToken && vercelToken.trim()) updateData.vercelToken = vercelToken.trim();
        if (netlifySiteId && netlifySiteId.trim()) updateData.netlifySiteId = netlifySiteId.trim();
        if (netlifyToken && netlifyToken.trim()) updateData.netlifyToken = netlifyToken.trim();

        console.log(`[Project Settings] DATABASE_UPDATE_ID: ${id}`);
        console.log(`[Project Settings] FIELDS_TO_UPDATE:`, Object.keys(updateData));

        // Use collection directly to bypass Mongoose schema caching issues
        const result = await Project.collection.updateOne(
            { _id: new mongoose.Types.ObjectId(id) },
            { $set: updateData }
        );

        console.log(`[Project Settings] DB_MATCHED: ${result.matchedCount}, DB_MODIFIED: ${result.modifiedCount}`);

        if (result.matchedCount === 0) {
            console.error(`[Project Settings] ERROR: Project ${id} not found in DB`);
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const project = await Project.findById(id);
        console.log(`[Project Settings] SUCCESS: Updated ${id}. isConfigured in DB: ${!!(project?.vercelProjectId && project?.vercelToken)}`);
        return NextResponse.json({ message: "Project updated successfully", project });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
