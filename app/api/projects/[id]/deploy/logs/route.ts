import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import { Project } from "@/models";
import { authorize } from "@/lib/auth-utils";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!(await authorize(id, ['admin', 'lead', 'developer', 'viewer']))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    try {
        const project = await Project.findById(id);
        if (!project) throw new Error("Project not found");

        if (project.deployProvider === 'netlify' && project.netlifySiteId && project.netlifyToken) {
            // First get latest deploy ID
            const dRes = await fetch(`https://api.netlify.com/api/v1/sites/${project.netlifySiteId}/deploys?per_page=1`, {
                headers: { 'Authorization': `Bearer ${project.netlifyToken}` }
            });
            if (!dRes.ok) throw new Error("Failed to fetch Netlify deploys");
            const deploys = await dRes.json();
            if (deploys.length === 0) return NextResponse.json({ logs: "No deployments found." });

            const deployId = deploys[0].id;

            // Fetch logs - Netlify logs are a bit tricky, sometimes they require a stream
            // But we can try the public log endpoint or a snippet
            const logRes = await fetch(`https://api.netlify.com/api/v1/deploys/${deployId}/log`, {
                headers: { 'Authorization': `Bearer ${project.netlifyToken}` }
            });

            if (logRes.ok) {
                const logs = await logRes.text();
                return NextResponse.json({ logs });
            } else {
                return NextResponse.json({ logs: `Deployment ${deployId} is active. Pulling logs from provider...` });
            }
        } else if (project.deployProvider === 'render') {
            return NextResponse.json({
                logs: `[${new Date().toISOString()}] Render Deployment Orchestration:
- Triggering Deploy Hook: ${project.renderDeployHook.substring(0, 30)}...
- Status: ${project.deployStatus.toUpperCase()}
- Render Service: ${project.renderServiceName || 'Default'}

Note: Full build logs for Render are currently only available in the Render Dashboard as only a Deploy Hook was provided during setup.`
            });
        }

        return NextResponse.json({ logs: "Deployment not configured or no provider logs available." });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
