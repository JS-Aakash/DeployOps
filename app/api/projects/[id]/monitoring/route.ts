import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Monitoring, Project, Issue } from '@/models';
import { checkProjectHealth } from '@/lib/monitoring-service';
import { authorize } from '@/lib/auth-utils';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    await dbConnect();

    // Verification
    const isAuthorized = await authorize(id, ['admin', 'lead', 'developer', 'viewer']);
    if (!isAuthorized) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        // Fetch project with absolute latest data and lean() to bypass schema-based field stripping
        const project = await Project.findById(id).setOptions({ allowDiskUse: true }).lean();
        if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        const isConfigured = !!((project.vercelProjectId && project.vercelToken) || (project.netlifySiteId && project.netlifyToken));
        const provider = project.vercelProjectId ? 'vercel' : project.netlifySiteId ? 'netlify' : null;

        console.log(`[Monitoring API] Project ${id} isConfigured: ${isConfigured} (Provider: ${provider})`);

        // Return structured data even if not configured
        if (!isConfigured) {
            let monitoring = await Monitoring.findOne({ projectId: new mongoose.Types.ObjectId(id) });
            if (!monitoring) {
                monitoring = await Monitoring.create({
                    projectId: new mongoose.Types.ObjectId(id),
                    status: 'healthy',
                    metrics: { errorRate: 0, latency: 0, failureCount: 0, uptime: 100 }
                });
            }
            // Even if not configured for uptime, we still track PR activity
            const recentPrs = await Issue.find({
                projectId: id,
                prUrl: { $exists: true, $ne: "" }
            })
                .sort({ updatedAt: -1 })
                .limit(3)
                .lean();

            return NextResponse.json({
                ...monitoring.toObject(),
                isConfigured: false,
                projectName: project.name,
                recentPrs, // Attach recent PRs even if unconfigured
                config: null
            });
        }

        // Fetch Recent PRs from Issues
        const recentPrs = await Issue.find({
            projectId: id,
            prUrl: { $exists: true, $ne: "" }
        })
            .sort({ updatedAt: -1 })
            .limit(3)
            .lean();

        // Pass the fresh project object directly
        const status = await checkProjectHealth(id, project);
        return NextResponse.json({
            ...status.toObject(),
            isConfigured: true,
            projectName: project.name,
            provider,
            recentPrs, // Attach recent PRs
            config: {
                vercelProjectId: project.vercelProjectId,
                netlifySiteId: project.netlifySiteId,
                renderDeployHook: project.renderDeployHook,
                renderServiceName: project.renderServiceName,
                deployProvider: project.deployProvider,
                deployStatus: project.deployStatus
            }
        });
    } catch (error: any) {
        console.error("Monitoring GET error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
