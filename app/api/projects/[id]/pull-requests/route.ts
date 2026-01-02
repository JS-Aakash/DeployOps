import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Issue, Project, Requirement } from '@/models';
import { Octokit } from '@octokit/rest';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { authorize, authError } from "@/lib/auth-utils";

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
        const project = await Project.findById(id);
        if (!project || !project.owner || !project.repo) {
            return NextResponse.json({ error: "Project or repository config not found" }, { status: 404 });
        }

        const session = await getServerSession(authOptions);
        const githubToken = (session as any)?.accessToken || process.env.GITHUB_TOKEN;
        const octokit = new Octokit({ auth: githubToken });

        // 1. Fetch ALL PRs from GitHub (latest 30)
        const { data: githubPrs } = await octokit.pulls.list({
            owner: project.owner,
            repo: project.repo,
            state: 'all',
            sort: 'updated',
            direction: 'desc',
            per_page: 30
        });

        // 2. Find internal issues to link context
        const internalIssues = await Issue.find({ projectId: id }).populate({ path: 'requirementId', strictPopulate: false });

        // 3. Enrich GitHub PRs with internal context and file lists
        const enrichedPrs = await Promise.all(githubPrs.map(async (pr) => {
            const linkedIssue = internalIssues.find(i => i.prUrl === pr.html_url);

            try {
                // Fetch files for each PR to show change summary
                const { data: files } = await octokit.pulls.listFiles({
                    owner: project.owner,
                    repo: project.repo,
                    pull_number: pr.number
                });

                return {
                    issueId: linkedIssue?._id || `gh-${pr.number}`,
                    issueTitle: linkedIssue?.title || pr.title,
                    requirement: (linkedIssue as any)?.requirementId,
                    prUrl: pr.html_url,
                    prStatus: pr.state,
                    isMerged: !!pr.merged_at,
                    ghTitle: pr.title,
                    filesChanged: files.map(f => f.filename),
                    aiExplanation: linkedIssue?.aiExplanation || (pr.body?.includes("AI") ? "This PR appears to be AI-generated or assisted." : "Standard manual pull request contribution."),
                    createdAt: pr.created_at,
                    mergedAt: pr.merged_at,
                    author: {
                        name: pr.user?.login,
                        avatar: pr.user?.avatar_url
                    },
                    isAI: !!linkedIssue || pr.body?.toLowerCase().includes('ai agent')
                };
            } catch (err) {
                return {
                    issueId: linkedIssue?._id || `gh-${pr.number}`,
                    issueTitle: linkedIssue?.title || pr.title,
                    prUrl: pr.html_url,
                    prStatus: pr.state,
                    isMerged: !!pr.merged_at,
                    ghTitle: pr.title,
                    author: { name: pr.user?.login, avatar: pr.user?.avatar_url },
                    error: "Partial data (failed to fetch file list)"
                };
            }
        }));

        return NextResponse.json(enrichedPrs);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
