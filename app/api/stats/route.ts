import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Project, Issue, ProjectMember, User, Monitoring, Task } from '@/models';

export async function GET() {
    await dbConnect();
    try {
        const projectCount = await Project.countDocuments({});
        const issueCount = await Issue.countDocuments({ status: 'open' });

        // PR count should include anything with a PR URL, regardless of status
        const prCount = await Issue.countDocuments({
            prUrl: { $exists: true, $ne: "" }
        });

        const memberCount = await User.countDocuments({});

        // AI Fixes should include running, created, and resolved ones
        const aiFixCount = await Issue.countDocuments({
            assignedTo: 'ai',
            status: { $in: ['ai_running', 'pr_created', 'closed'] }
        });

        // Fetch AI Code Fixes
        const aiIssues = await Issue.find({
            $or: [
                { status: { $in: ['ai_running', 'pr_created'] } },
                { prUrl: { $exists: true, $ne: "" } }
            ]
        })
            .populate('projectId')
            .sort({ updatedAt: -1 })
            .limit(10);

        // Fetch AI-generated Requirements
        const { Requirement } = await import('@/models');
        const aiRequirements = await Requirement.find({
            $or: [
                { createdBy: 'AI Designer' },
                { createdBy: 'ai' }
            ]
        })
            .populate('projectId')
            .sort({ updatedAt: -1 })
            .limit(5);

        // Merge and Format Activity
        const mixedActivity = [
            ...aiIssues.map((i: any) => ({
                _id: i._id,
                title: i.title,
                description: i.description,
                type: 'fix',
                status: i.status,
                prUrl: i.prUrl,
                updatedAt: i.updatedAt,
                projectId: i.projectId
            })),
            ...aiRequirements.map((r: any) => ({
                _id: r._id,
                title: r.title,
                description: `Formalized requirement: ${r.title}`,
                type: 'requirement',
                status: 'completed',
                updatedAt: r.updatedAt,
                projectId: r.projectId
            }))
        ]
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 10);

        const healthyCount = await Monitoring.countDocuments({ status: 'healthy' });
        const criticalCount = await Issue.countDocuments({ priority: 'critical', status: 'open' });
        const mergedPrCount = await Issue.countDocuments({ status: 'closed', prUrl: { $exists: true, $ne: "" } });
        const tasksCompletedCount = await Task.countDocuments({ status: 'done' });

        return NextResponse.json({
            stats: {
                projects: projectCount,
                issues: issueCount,
                prs: prCount,
                mergedPrs: mergedPrCount,
                members: memberCount,
                aiFixes: aiFixCount,
                healthyProjects: healthyCount,
                criticalIssues: criticalCount,
                tasksCompleted: tasksCompletedCount
            },
            recentActivity: mixedActivity
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
