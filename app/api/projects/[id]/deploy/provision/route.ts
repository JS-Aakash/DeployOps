import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import { Project, Monitoring } from "@/models";
import { authorize } from "@/lib/auth-utils";
import mongoose from "mongoose";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!(await authorize(id, ['admin', 'lead']))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    try {
        const body = await req.json();
        const { provider, token, projectName } = body;

        const project = await Project.findById(id);
        if (!project) throw new Error("Project not found");

        if (!project.owner || !project.repo) {
            throw new Error("GitHub repository must be linked before provisioning.");
        }

        let providerData: any = {};

        if (provider === 'vercel') {
            // 1. Create Vercel Project
            const vRes = await fetch('https://api.vercel.com/v9/projects', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: projectName || project.name.replace(/\s+/g, '-').toLowerCase(),
                    framework: 'nextjs', // Default for this portal
                    gitRepository: {
                        type: 'github',
                        repo: `${project.owner}/${project.repo}`
                    }
                })
            });

            const vData = await vRes.json();
            if (!vRes.ok) throw new Error(vData.error?.message || "Vercel provisioning failed");

            providerData = {
                vercelProjectId: vData.id,
                vercelToken: token,
                deployProvider: 'netlify', // We use Netlify for the orchestration layer in this demo if Vercel is just for health
                // Actually, let's stick to the user's choice. 
                // However, the monitoring-service currently supports Vercel and Netlify.
            };

            // Link Vercel as mirroring the primary monitoring if that's what's selected
            project.vercelProjectId = vData.id;
            project.vercelToken = token;

        } else if (provider === 'netlify') {
            // 1. Create Netlify Site
            const nRes = await fetch('https://api.netlify.com/api/v1/sites', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: projectName || project.name.replace(/\s+/g, '-').toLowerCase(),
                    repo: {
                        provider: 'github',
                        repo: `${project.owner}/${project.repo}`,
                        private: true,
                        branch: 'main'
                    }
                })
            });

            const nData = await nRes.json();
            if (!nRes.ok) throw new Error(nData.message || "Netlify provisioning failed");

            project.netlifySiteId = nData.id;
            project.netlifyToken = token;
            project.deployProvider = 'netlify';
            project.deployStatus = 'ready';
        }

        await project.save();

        // Initialize monitoring record
        await Monitoring.findOneAndUpdate(
            { projectId: project._id },
            {
                $setOnInsert: {
                    status: 'healthy',
                    metrics: { errorRate: 0, latency: 0, uptime: 100, failureCount: 0 }
                }
            },
            { upsert: true }
        );

        return NextResponse.json({ success: true, project });
    } catch (e: any) {
        console.error("Provisioning Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
