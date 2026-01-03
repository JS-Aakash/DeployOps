import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Issue, Project, AuditLog } from '@/models';
import { Octokit } from '@octokit/rest';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { authorize } from "@/lib/auth-utils";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ prId: string }> }
) {
    const { prId } = await params;
    await dbConnect();

    try {
        let projectId: string | null = null;
        let prNumber: number;
        let linkedIssueId: string | null = null;
        let owner: string | null = null;
        let repo: string | null = null;

        // 1. Resolve Project and PR Number
        if (prId.startsWith('gh-')) {
            if (prId.includes('---')) {
                // Robust format: gh-external---number---repo---owner
                // OR: gh-PROJECTID---NUMBER
                const comps = prId.split('---');
                if (comps.length === 2 && comps[0].startsWith('gh-') && comps[0] !== 'gh-external') {
                    // Internal Project linked PR: gh-projectId---prNumber
                    projectId = comps[0].replace('gh-', '');
                    prNumber = parseInt(comps[1]);
                } else {
                    // external format: gh-external---number---repo---owner
                    prNumber = parseInt(comps[1]);
                    // Handle cases where repo or owner might contain the separator
                    owner = comps[comps.length - 1];
                    repo = comps.slice(2, comps.length - 1).join('---');
                }
            } else {
                const parts = prId.split('-');
                if (parts[1] === 'external') {
                    // Format: gh-external-number-repo-owner (Ambiguous if hyphens in name)
                    prNumber = parseInt(parts[2]);
                    repo = parts[3];
                    // Join the rest for owner in case it has hyphens
                    owner = parts.slice(4).join('-') || 'JS-Aakash';
                } else if (parts.length >= 3) {
                    // Format: gh-projectId-prNumber
                    projectId = parts[1];
                    prNumber = parseInt(parts[2]);
                } else {
                    return NextResponse.json({ error: "Invalid PR ID format" }, { status: 400 });
                }
            }
        } else {
            // Internal Issue ID
            const issue = await Issue.findById(prId);
            if (!issue) {
                return NextResponse.json({ error: "Issue not found" }, { status: 404 });
            }
            projectId = issue.projectId.toString();
            linkedIssueId = prId;

            if (!issue.prUrl) {
                return NextResponse.json({ error: "No PR associated with this issue" }, { status: 404 });
            }

            const match = issue.prUrl.match(/\/pull\/(\d+)/);
            if (!match) {
                return NextResponse.json({ error: "Invalid PR URL" }, { status: 400 });
            }
            prNumber = parseInt(match[1]);
        }

        // 2. Fetch Project/Repo Details
        let project: any = null;
        if (projectId) {
            project = await Project.findById(projectId);
            if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
            owner = project.owner;
            repo = project.repo;

            // Authorization
            if (!(await authorize(projectId, ['admin', 'lead', 'developer', 'viewer']))) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
            }
        }

        if (!owner || !repo) {
            return NextResponse.json({ error: "Repository identification failed" }, { status: 400 });
        }

        const session = await getServerSession(authOptions);
        const githubToken = (session as any)?.accessToken || process.env.GITHUB_TOKEN;
        const octokit = new Octokit({ auth: githubToken });

        // 3. Fetch PR Details from GitHub
        const { data: pr } = await octokit.pulls.get({
            owner: owner!,
            repo: repo!,
            pull_number: prNumber
        });

        // 4. Fetch Files for Diff
        const { data: files } = await octokit.pulls.listFiles({
            owner: owner!,
            repo: repo!,
            pull_number: prNumber
        });

        // 5. Fetch AI Logs / Audit Logs
        // We look for audit logs related to this PR or linked issue
        const auditLogs = await AuditLog.find({
            $or: [
                { entityId: pr.html_url },
                { entityId: linkedIssueId },
                { projectId: projectId, action: { $regex: /pr|ai/i } }
            ].filter(q => q.projectId || q.entityId)
        }).sort({ createdAt: -1 }).limit(20);

        const internalIssue = linkedIssueId ? await Issue.findById(linkedIssueId) : null;

        return NextResponse.json({
            pr: {
                number: pr.number,
                title: pr.title,
                body: pr.body,
                state: pr.state,
                merged: pr.merged,
                mergeable: pr.mergeable,
                mergeable_state: pr.mergeable_state,
                html_url: pr.html_url,
                user: {
                    login: pr.user.login,
                    avatar_url: pr.user.avatar_url
                },
                created_at: pr.created_at,
                base: pr.base.ref,
                head: pr.head.ref,
            },
            files: files.map(f => ({
                filename: f.filename,
                status: f.status,
                additions: f.additions,
                deletions: f.deletions,
                patch: f.patch, // The actual diff string
                raw_url: f.raw_url
            })),
            project: project ? {
                id: project._id,
                name: project.name,
                owner: project.owner,
                repo: project.repo
            } : {
                id: `ext-${repo}`,
                name: repo,
                owner: owner,
                repo: repo
            },
            aiContext: internalIssue ? {
                explanation: internalIssue.aiExplanation,
                title: internalIssue.title
            } : null,
            auditLogs
        });

    } catch (error: any) {
        console.error("Fetch PR details error:", error);
        return NextResponse.json({
            error: error.message,
            debugInfo: { owner, repo, prNumber }
        }, { status: 500 });
    }
}
