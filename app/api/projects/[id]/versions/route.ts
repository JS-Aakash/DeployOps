import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import { Project } from "@/models";
import { Octokit } from "@octokit/rest";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    try {
        const project = await Project.findById(id);
        if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        // Initialize GitHub Client
        // Note: In production, we should decrypt the token. Ideally project.githubToken if it exists, 
        // or a global token if using an app. For now we assume a process env fallback or project token.
        const token = project.vercelToken || process.env.GITHUB_TOKEN; // Fallback for demo
        if (!token) {
            return NextResponse.json({ error: "GitHub token not configured for this project" }, { status: 400 });
        }

        const octokit = new Octokit({ auth: token });

        // Parse owner/repo from URL
        // Format: https://github.com/owner/repo
        const repoUrlParts = project.repoUrl.split('/');
        const owner = repoUrlParts[repoUrlParts.length - 2];
        const repo = repoUrlParts[repoUrlParts.length - 1].replace('.git', '');

        // Fetch Merged Pull Requests
        const { data: pullRequests } = await octokit.pulls.list({
            owner,
            repo,
            state: 'closed',
            sort: 'updated',
            direction: 'desc',
            per_page: 20
        });

        // Filter only merged PRs and map to cleaner Version object
        const versions = pullRequests
            .filter(pr => pr.merged_at !== null)
            .map(pr => ({
                id: pr.id,
                number: pr.number,
                title: pr.title,
                commitSha: pr.merge_commit_sha,
                mergedAt: pr.merged_at,
                author: {
                    name: pr.user?.login,
                    avatar: pr.user?.avatar_url,
                    isBot: pr.user?.type === 'Bot'
                },
                url: pr.html_url,
                body: pr.body
            }));

        return NextResponse.json(versions);

    } catch (e: any) {
        console.error("Fetch versions failed:", e);
        return NextResponse.json({ error: e.message || "Failed to fetch version history" }, { status: 500 });
    }
}
