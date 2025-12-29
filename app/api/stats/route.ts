import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Project, Issue, ProjectMember, User, Monitoring } from '@/models';

export async function GET() {
    await dbConnect();
    try {
        const projectCount = await Project.countDocuments({});
        const issueCount = await Issue.countDocuments({ status: 'open' });
        const prCount = await Issue.countDocuments({ status: 'pr_created' });
        const memberCount = await User.countDocuments({});
        const aiFixCount = await Issue.countDocuments({ status: 'pr_created' }); // Using pr_created as proxy for success AI fix

        // Fetch recent activity
        const recentIssues = await Issue.find({ status: 'pr_created' })
            .populate('projectId')
            .sort({ updatedAt: -1 })
            .limit(5);

        const healthyCount = await Monitoring.countDocuments({ status: 'healthy' });
        const criticalCount = await Issue.countDocuments({ priority: 'critical', status: 'open' });

        return NextResponse.json({
            stats: {
                projects: projectCount,
                issues: issueCount,
                prs: prCount,
                members: memberCount,
                aiFixes: aiFixCount,
                healthyProjects: healthyCount,
                criticalIssues: criticalCount
            },
            recentActivity: recentIssues
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
