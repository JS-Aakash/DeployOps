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
            const res = await fetch(`https://api.netlify.com/api/v1/sites/${project.netlifySiteId}/deploys?per_page=1`, {
                headers: { 'Authorization': `Bearer ${project.netlifyToken}` }
            });
            if (res.ok) {
                const deploys = await res.json();
                if (deploys.length > 0) {
                    const latest = deploys[0];
                    let status: string = 'building';
                    if (latest.state === 'ready') status = 'live';
                    else if (['error', 'failed', 'canceled'].includes(latest.state)) status = 'failed';

                    // Update project status if changed
                    if (project.deployStatus !== status) {
                        project.deployStatus = status as any;
                        await project.save();
                    }

                    return NextResponse.json({
                        status: status,
                        deployId: latest.id,
                        url: latest.deploy_url || latest.url,
                        createdAt: latest.created_at,
                        commitRef: latest.commit_ref
                    });
                }
            }
        } else if (project.deployProvider === 'render') {
            // Render hooks don't provide easy status without full API Key
            // We'll return the last known status from the project
            return NextResponse.json({
                status: project.deployStatus,
                url: project.repoUrl, // Fallback
                info: "Render status via hook is limited. Refer to Render Dashboard for detailed logs."
            });
        }

        return NextResponse.json({ status: project.deployStatus || 'not_configured' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
