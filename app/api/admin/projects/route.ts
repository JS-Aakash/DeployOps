import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from '@/lib/mongodb';
import { Project, ProjectMember, User } from '@/models';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    try {
        const currentUser = await User.findOne({ email: session.user.email.toLowerCase() });
        if (!currentUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check if user is admin
        const adminMembership = await ProjectMember.findOne({
            userId: currentUser._id,
            role: 'admin'
        });

        if (!adminMembership) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        // Get all projects
        const projects = await Project.find({}).lean();

        const projectsWithStats = await Promise.all(projects.map(async (project) => {
            const memberCount = await ProjectMember.countDocuments({ projectId: project._id });
            const members = await ProjectMember.find({ projectId: project._id })
                .populate('userId', 'name email image')
                .lean();

            return {
                _id: project._id,
                name: project.name,
                description: project.description,
                repoUrl: project.repoUrl,
                owner: project.owner,
                repo: project.repo,
                memberCount,
                members: members.map(m => ({
                    userId: m.userId._id,
                    name: m.userId.name,
                    email: m.userId.email,
                    image: m.userId.image,
                    role: m.role
                })),
                hasVercel: !!(project.vercelProjectId && project.vercelToken),
                hasNetlify: !!(project.netlifySiteId && project.netlifyToken),
                createdAt: project.createdAt
            };
        }));

        return NextResponse.json(projectsWithStats);
    } catch (error: any) {
        console.error("Admin projects fetch error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
