import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Octokit } from '@octokit/rest';
import { Project } from '@/models';
import dbConnect from '@/lib/mongodb';
import { authorize } from '@/lib/auth-utils';

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
    const project = await Project.findById(id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const githubToken = (session as any)?.accessToken || process.env.GITHUB_TOKEN;
    const octokit = new Octokit({ auth: githubToken });

    try {
        const { searchParams } = new URL(req.url);
        const path = searchParams.get('path') || '';

        const { data } = await octokit.repos.getContent({
            owner: project.owner,
            repo: project.repo,
            path: path,
        });

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Fetch Files Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
