import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Issue, Project, AuditLog, Task } from '@/models';
import { Octokit } from '@octokit/rest';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { authorize } from "@/lib/auth-utils";
import { logAudit } from '@/lib/audit-service';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ prId: string }> }
) {
    const { prId } = await params;
    await dbConnect();

    try {
        let owner: string | null = null;
        let repo: string | null = null;
        let projectId: string = "";
        let prNumber: number = 0;
        let linkedIssueId: string | null = null;
        let prUrl: string = "";

        // 1. Resolve Project and PR Number
        if (prId.startsWith('gh-')) {
            if (prId.includes('---')) {
                // Robust format: gh-PROJECTID---NUMBER OR gh-external---number---repo---owner
                const comps = prId.split('---');
                if (comps.length === 2 && comps[0].startsWith('gh-') && comps[0] !== 'gh-external') {
                    // Internal Portfolio PR: gh-projectId---prNumber
                    projectId = comps[0].replace('gh-', '');
                    prNumber = parseInt(comps[1]);
                } else {
                    // External PR format
                    prNumber = parseInt(comps[1]);
                    repo = comps.slice(2, -1).join('---');
                    owner = comps[comps.length - 1];
                    // Search for a project that matches this owner/repo to get proper context
                    const projectMatch = await Project.findOne({ owner, repo });
                    if (projectMatch) {
                        projectId = projectMatch._id.toString();
                    } else {
                        return NextResponse.json({ error: "Cannot merge an external PR without a linked project." }, { status: 400 });
                    }
                }
            } else {
                // Legacy format support
                const parts = prId.split('-');
                projectId = parts[1];
                prNumber = parseInt(parts[2]);
            }
        } else {
            const issue = await Issue.findById(prId);
            if (!issue || !issue.prUrl) {
                return NextResponse.json({ error: "Issue or associated PR not found" }, { status: 404 });
            }
            projectId = issue.projectId.toString();
            linkedIssueId = prId;
            const match = issue.prUrl.match(/\/pull\/(\d+)/);
            prNumber = match ? parseInt(match[1]) : 0;
            prUrl = issue.prUrl;
        }

        // 2. Authorization (Only Admin/Lead)
        if (!(await authorize(projectId, ['admin', 'lead']))) {
            return NextResponse.json({ error: "Only administrators can merge pull requests in this portal." }, { status: 403 });
        }

        const project = await Project.findById(projectId);
        if (!project || !project.owner || !project.repo) {
            return NextResponse.json({ error: "Project configuration missing" }, { status: 404 });
        }

        const body = await req.json();
        const { mergeMethod = 'squash', comment = '' } = body;

        const session = await getServerSession(authOptions);
        const githubToken = (session as any)?.accessToken || process.env.GITHUB_TOKEN;
        const octokit = new Octokit({ auth: githubToken });

        // 3. Perform Merge on GitHub
        try {
            await octokit.pulls.merge({
                owner: project.owner,
                repo: project.repo,
                pull_number: prNumber,
                merge_method: mergeMethod as any,
                commit_title: `Merge PR #${prNumber} approved via Internal Portal`,
                commit_message: comment || `Review and Merge verified by ${session?.user?.name || 'Authorized Admin'}`
            });
        } catch (ghError: any) {
            return NextResponse.json({
                error: `GitHub Rejected Merge: ${ghError.message}`
            }, { status: 500 });
        }

        // 4. Update Internal State
        if (linkedIssueId) {
            await Issue.findByIdAndUpdate(linkedIssueId, {
                status: 'closed',
                mergedAt: new Date()
            });

            // Update associated tasks
            await Task.updateMany(
                { issueId: linkedIssueId, status: { $ne: 'done' } },
                { $set: { status: 'done' } }
            );
        }

        // 5. Audit Logging
        await logAudit({
            actorId: (session?.user as any).id,
            actorName: session?.user?.name || 'System Admin',
            actorType: 'user',
            action: 'pr_merge_internal',
            entityType: 'pr',
            entityId: prUrl! || `PR#${prNumber}`,
            projectId: projectId,
            description: `Merged PR #${prNumber} for project ${project.name} using ${mergeMethod}`,
            metadata: { comment, prNumber, prId }
        });

        return NextResponse.json({
            success: true,
            message: "PR successfully merged. Audit ledger updated."
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
