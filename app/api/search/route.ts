import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from '@/lib/mongodb';
import { Project, Issue, Task, Documentation, User, ProjectMember } from '@/models';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
        return NextResponse.json({ results: [] });
    }

    await dbConnect();

    try {
        const user = await User.findOne({ email: session.user.email.toLowerCase() });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Get user's accessible projects
        const memberships = await ProjectMember.find({ userId: user._id });
        const projectIds = memberships.map(m => m.projectId);

        const searchRegex = new RegExp(query, 'i');

        // Search across multiple collections
        const [projects, issues, tasks, docs] = await Promise.all([
            // Projects
            Project.find({
                _id: { $in: projectIds },
                $or: [
                    { name: searchRegex },
                    { description: searchRegex },
                    { repo: searchRegex }
                ]
            }).limit(5).lean(),

            // Issues
            Issue.find({
                projectId: { $in: projectIds },
                $or: [
                    { title: searchRegex },
                    { description: searchRegex }
                ]
            }).populate('projectId', 'name').limit(10).lean(),

            // Tasks
            Task.find({
                projectId: { $in: projectIds },
                $or: [
                    { title: searchRegex },
                    { description: searchRegex }
                ]
            }).populate('projectId', 'name').limit(10).lean(),

            // Documentation
            Documentation.find({
                projectId: { $in: projectIds },
                $or: [
                    { title: searchRegex },
                    { content: searchRegex }
                ]
            }).populate('projectId', 'name').limit(5).lean()
        ]);

        const results = {
            projects: projects.map(p => ({
                id: p._id,
                type: 'project',
                title: p.name,
                description: p.description,
                link: `/projects/${p._id}`
            })),
            issues: issues.map(i => ({
                id: i._id,
                type: 'issue',
                title: i.title,
                description: i.description,
                project: i.projectId?.name,
                link: `/projects/${i.projectId?._id}/issues`
            })),
            tasks: tasks.map(t => ({
                id: t._id,
                type: 'task',
                title: t.title,
                description: t.description,
                project: t.projectId?.name,
                link: `/tasks`
            })),
            docs: docs.map(d => ({
                id: d._id,
                type: 'documentation',
                title: d.title,
                description: d.content?.substring(0, 100),
                project: d.projectId?.name,
                link: `/projects/${d.projectId?._id}/docs`
            }))
        };

        return NextResponse.json(results);
    } catch (error: any) {
        console.error("Search error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
