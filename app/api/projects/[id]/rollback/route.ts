import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import { Project, ProjectMember, User } from "@/models";
import { runRollback } from "@/lib/rollback-service";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // 1. Auth & Role Check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    try {
        const user = await User.findOne({ email: session.user.email.toLowerCase() });
        const member = await ProjectMember.findOne({ projectId: id, userId: user._id });

        if (!member || !['admin', 'lead'].includes(member.role)) {
            return NextResponse.json({ error: "Insufficient permissions. Only Admins or Leads can perform rollbacks." }, { status: 403 });
        }

        const project = await Project.findById(id);
        if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        const body = await req.json();
        const { prNumber, commitSha } = body;

        if (!prNumber || !commitSha) {
            return NextResponse.json({ error: "Missing prNumber or commitSha" }, { status: 400 });
        }

        // 2. Run Safe Rollback
        // Note: This operation can be slow. In a real app, use a queue.
        // Vercel serverless functions have a timeout (usually 10-60s). 
        // Cloning a large repo might timeout.

        const result = await runRollback({
            repoUrl: project.repoUrl,
            branchName: 'main', // TODO: Fetch default branch from project settings if available
            commitSha,
            prNumber,
            githubToken: (session as any)?.accessToken || project.vercelToken || process.env.GITHUB_TOKEN || "", // Fallback
            onLog: (msg) => console.log(`[Rollback-${id}] ${msg}`)
        });

        return NextResponse.json(result);

    } catch (e: any) {
        console.error("Rollback API Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
