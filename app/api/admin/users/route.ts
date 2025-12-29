import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from '@/lib/mongodb';
import { User, ProjectMember, Project } from '@/models';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    try {
        // Get current user
        const currentUser = await User.findOne({ email: session.user.email.toLowerCase() });
        if (!currentUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check if user is admin on any project
        const adminMembership = await ProjectMember.findOne({
            userId: currentUser._id,
            role: 'admin'
        });

        if (!adminMembership) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        // Fetch all users with their project memberships
        const allUsers = await User.find({}).lean();

        const usersWithDetails = await Promise.all(allUsers.map(async (user) => {
            const memberships = await ProjectMember.find({ userId: user._id })
                .populate('projectId', 'name')
                .lean();

            const projectCount = memberships.length;
            const roles = [...new Set(memberships.map(m => m.role))];
            const primaryRole = roles.includes('admin') ? 'admin' :
                roles.includes('lead') ? 'lead' :
                    roles.includes('developer') ? 'developer' :
                        roles[0] || 'viewer';

            return {
                _id: user._id,
                name: user.name,
                email: user.email,
                image: user.image,
                githubUsername: user.githubUsername,
                source: user.source,
                primaryRole,
                projectCount,
                projects: memberships.map(m => ({
                    projectId: m.projectId._id,
                    projectName: m.projectId.name,
                    role: m.role
                })),
                createdAt: user.createdAt
            };
        }));

        return NextResponse.json(usersWithDetails);
    } catch (error: any) {
        console.error("Admin users fetch error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
