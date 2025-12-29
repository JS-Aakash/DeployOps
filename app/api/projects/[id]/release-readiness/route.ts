import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import { Issue, Task, Monitoring, Project } from "@/models";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    try {
        const project = await Project.findById(id);
        if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        const signals: any[] = [];
        let status = "READY";

        // 1. Check Critical Issues
        const criticalIssues = await Issue.find({
            projectId: id,
            priority: 'critical',
            status: { $in: ['open', 'ai_running'] }
        });

        if (criticalIssues.length > 0) {
            status = "BLOCKED";
            criticalIssues.forEach((issue: any) => {
                signals.push({
                    type: 'issue',
                    severity: 'error',
                    message: `Critical Issue Open: ${issue.title}`,
                    link: `/projects/${id}/issues`
                });
            });
        }

        // 2. Check Monitoring Incidents
        const monitoring = await Monitoring.findOne({ projectId: id });
        if (monitoring && monitoring.status !== 'healthy') {
            status = "BLOCKED";
            signals.push({
                type: 'monitoring',
                severity: 'error',
                message: `Production System is ${monitoring.status.toUpperCase()}`,
                link: `/projects/${id}/monitoring`
            });
        }

        // 3. Check Pending PRs (Caution)
        const pendingPRs = await Issue.find({
            projectId: id,
            status: 'pr_created'
        });

        if (pendingPRs.length > 0) {
            if (status === "READY") status = "CAUTION";
            signals.push({
                type: 'pr',
                severity: 'warning',
                message: `${pendingPRs.length} Pull Requests pending review`,
                link: `/projects/${id}/pull-requests`
            });
        }

        // 4. Check Deployment Tasks (Human)
        // Find tasks with 'deploy' or 'release' in title that are not done
        const blockingTasks = await Task.find({
            projectId: id,
            title: { $regex: /deploy|release/i },
            status: { $ne: 'done' }
        });

        if (blockingTasks.length > 0) {
            // These are procedural blockers usually
            if (status === "READY") status = "CAUTION";
            blockingTasks.forEach((task: any) => {
                signals.push({
                    type: 'task',
                    severity: 'warning',
                    message: `Incomplete Deployment Task: ${task.title}`,
                    link: `/projects/${id}/tasks`
                });
            });
        }

        return NextResponse.json({
            status,
            signals
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
