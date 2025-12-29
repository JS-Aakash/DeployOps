import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Project, ProjectMember, User, Issue } from '@/models';
import { Octokit } from '@octokit/rest';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    await dbConnect();
    const githubToken = process.env.GITHUB_TOKEN;
    const octokit = new Octokit({ auth: githubToken });

    try {
        const project = await Project.findById(id);
        if (!project || !project.owner || !project.repo) {
            return NextResponse.json({ error: "Project not found or invalid GitHub info" }, { status: 404 });
        }

        // 1. Fetch Contributors
        const { data: contributors } = await octokit.repos.listContributors({
            owner: project.owner,
            repo: project.repo,
        });

        const syncResults = { members: 0, issues: 0 };

        for (const cont of contributors) {
            if (!cont.login) continue;
            let user = await User.findOne({ githubUsername: cont.login });
            if (!user) {
                user = await User.create({
                    name: cont.login,
                    email: `${cont.login}@github.com`,
                    githubUsername: cont.login,
                    image: cont.avatar_url,
                    source: 'github'
                });
            }
            await ProjectMember.findOneAndUpdate(
                { projectId: project._id, userId: user._id },
                { role: 'developer' },
                { upsert: true }
            );
            syncResults.members++;
        }

        // 2. Fetch GitHub Issues
        const { data: githubIssues } = await octokit.issues.listForRepo({
            owner: project.owner,
            repo: project.repo,
            state: 'open',
            per_page: 50
        });

        for (const ghIssue of githubIssues) {
            if (ghIssue.pull_request) continue; // Skip PRs

            const existing = await Issue.findOne({
                projectId: project._id,
                githubId: ghIssue.id.toString()
            });

            if (!existing) {
                await Issue.create({
                    projectId: project._id,
                    title: ghIssue.title,
                    description: ghIssue.body || '',
                    type: (ghIssue.labels as any[]).some(l => l.name.toLowerCase().includes('bug')) ? 'bug' : 'feature',
                    status: 'open',
                    assignedTo: 'ai',
                    githubId: ghIssue.id.toString()
                });
                syncResults.issues++;
            }
        }

        return NextResponse.json({
            message: `Synced ${syncResults.members} members and ${syncResults.issues} new issues from GitHub.`,
            stats: syncResults
        });
    } catch (error: any) {
        console.error("Sync Error:", error);
        let message = error.message;
        if (message.includes("Bad credentials")) {
            message = "GitHub Bad Credentials: Please check if your GITHUB_TOKEN in .env.local is valid and has repo permissions.";
        }
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
