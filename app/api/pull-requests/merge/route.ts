import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Issue } from '@/models';
import { Octokit } from '@octokit/rest';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
    await dbConnect();

    try {
        const body = await req.json();
        const { issueId, confirm } = body;

        if (!confirm) {
            return NextResponse.json({ error: "Merge confirmation required" }, { status: 400 });
        }

        const issue = await Issue.findById(issueId);
        if (!issue || !issue.prUrl) {
            return NextResponse.json({ error: "Issue or PR URL not found" }, { status: 404 });
        }

        // Authorization check
        const { authorize, authError } = require('@/lib/auth-utils');
        if (!(await authorize(issue.projectId.toString(), ['admin', 'lead']))) {
            return authError();
        }

        // Parse PR URL
        const urlParts = issue.prUrl.split('/');
        const owner = urlParts[3];
        const repo = urlParts[4];
        const pullNumber = parseInt(urlParts[6]);

        const session = await getServerSession(authOptions);
        const githubToken = (session as any)?.accessToken || process.env.GITHUB_TOKEN;
        const octokit = new Octokit({ auth: githubToken });

        // 1. Perform Merge on GitHub
        try {
            await octokit.pulls.merge({
                owner,
                repo,
                pull_number: pullNumber,
                merge_method: 'squash',
                commit_title: `Merge AI-generated PR #${pullNumber} for issue: ${issue.title}`,
                commit_message: `Approved via USDMP Portal.\n\nExplanation: ${issue.aiExplanation || 'AI resolve'}`
            });
        } catch (ghError: any) {
            console.error("GitHub Merge Error:", ghError);
            return NextResponse.json({
                error: `GitHub Rejected Merge: ${ghError.message}. Ensure the PR has no conflicts and GITHUB_TOKEN has merge permissions.`
            }, { status: 500 });
        }

        // 2. Update Database State
        issue.status = 'closed';
        issue.mergedAt = new Date();
        await issue.save();

        // 3. Auto-complete linked tasks (Requirements Integration)
        try {
            const { Task } = require('@/models');
            await Task.updateMany(
                { issueId: issue._id, status: { $ne: 'done' } },
                { $set: { status: 'done' } }
            );
        } catch (taskError) {
            console.error("Auto-task completion failed:", taskError);
        }

        return NextResponse.json({
            success: true,
            message: "PR successfully merged and issue closed."
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
