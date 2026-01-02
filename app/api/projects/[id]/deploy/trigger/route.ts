import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import { Project } from "@/models";
import { authorize } from "@/lib/auth-utils";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!(await authorize(id, ['admin', 'lead', 'developer']))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    try {
        const project = await Project.findById(id);
        if (!project) throw new Error("Project not found");
        if (project.deployProvider === 'none' || !project.deployProvider) {
            throw new Error("Deployment not configured for this project");
        }

        let deployInfo = null;

        if (project.deployProvider === 'netlify') {
            const res = await fetch(`https://api.netlify.com/api/v1/sites/${project.netlifySiteId}/deploys`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${project.netlifyToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Netlify deployment failed to trigger");
            }
            deployInfo = await res.json();
        } else if (project.deployProvider === 'render') {
            const res = await fetch(project.renderDeployHook, { method: 'POST' });
            if (!res.ok) {
                throw new Error("Render deployment failed to trigger. Check your Hook URL.");
            }
            // Render hooks don't return much, often just success
            deployInfo = { status: 'triggered' };
        }

        project.deployStatus = 'deploying';
        await project.save();

        return NextResponse.json({ success: true, deployInfo });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
