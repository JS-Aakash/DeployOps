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
        const user = await User.findOne({ email: session.user.email.toLowerCase() });
        if (!user) {
            return NextResponse.json([]);
        }

        // Find project IDs where the user is a member
        const memberships = await ProjectMember.find({ userId: user._id }).select('projectId');
        const projectIds = memberships.map(m => m.projectId);

        const projects = await Project.find({ _id: { $in: projectIds } }).sort({ createdAt: -1 });
        return NextResponse.json(projects);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    try {
        const body = await req.json();
        const { name, description, repoUrl } = body;

        // Parse GitHub URL
        const match = repoUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
        let owner = '';
        let repo = '';
        if (match) {
            owner = match[1];
            repo = match[2];
        }

        const project = await Project.create({
            name,
            description,
            repoUrl,
            owner,
            repo
        });

        // Automatically add creator as Admin
        const user = await User.findOne({ email: session.user.email.toLowerCase() });
        if (user) {
            await ProjectMember.create({
                projectId: project._id,
                userId: user._id,
                role: 'admin'
            });
        }

        return NextResponse.json(project, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
