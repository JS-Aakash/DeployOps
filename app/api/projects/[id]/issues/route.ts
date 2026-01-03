import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from '@/lib/mongodb';
import { Issue, Project } from '@/models';
import { authorize, authError } from "@/lib/auth-utils";
import { Octokit } from '@octokit/rest';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // Authorization Check
    if (!(await authorize(id, ['admin', 'lead', 'developer', 'viewer']))) {
        return authError();
    }

    await dbConnect();
    try {
        const issues = await Issue.find({ projectId: id }).sort({ createdAt: -1 });
        return NextResponse.json(issues);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    // Authorization Check: Developers and above can create issues
    if (!(await authorize(id, ['admin', 'lead', 'developer']))) {
        return authError();
    }

    await dbConnect();
    try {
        const body = await req.json();
        const { title, description, type, assignedTo } = body;

        let githubId = undefined;

        // GitHub Synchronization
        const project = await Project.findById(id);
        const accessToken = (session as any)?.accessToken;

        if (project?.owner && project?.repo && accessToken) {
            try {
                const octokit = new Octokit({ auth: accessToken });
                const { data: githubIssue } = await octokit.issues.create({
                    owner: project.owner,
                    repo: project.repo,
                    title: title,
                    body: description || "",
                    labels: ['deployops', type],
                });
                githubId = githubIssue.number.toString();
            } catch (ghError) {
                console.error("Failed to sync issue to GitHub:", ghError);
                // We continue to create the local issue even if GitHub sync fails
            }
        }

        const issue = await Issue.create({
            projectId: id,
            title,
            description,
            type,
            assignedTo: assignedTo || 'ai',
            githubId // Store the GitHub Issue ID if created
        });

        return NextResponse.json(issue, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
