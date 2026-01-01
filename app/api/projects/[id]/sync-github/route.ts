import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Project, ProjectMember, User, Issue } from '@/models';
import { Octokit } from '@octokit/rest';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    await dbConnect();

    const session = await getServerSession(authOptions);
    const githubToken = (session as any)?.accessToken || process.env.GITHUB_TOKEN;
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
            const login = cont.login;
            if (!login) continue;

            // 1. Find the User record (authoritative lookup)
            // Use static string matching first for performance, then regex if needed
            let user = await User.findOne({
                $or: [
                    { githubUsername: login },
                    { githubUsername: { $regex: new RegExp(`^${login}$`, 'i') } }
                ]
            });

            // 2. Owner Fallback: Special check for repo owner
            if (!user && login.toLowerCase() === project.owner?.toLowerCase()) {
                const admins = await ProjectMember.find({ projectId: project._id, role: 'admin' }).populate('userId');
                const adminMatch = admins.find((m: any) =>
                    m.userId && (m.userId.email.toLowerCase() === (session?.user?.email || '').toLowerCase())
                );
                if (adminMatch) user = adminMatch.userId;
            }

            // 3. Last Resort user lookup
            if (!user) {
                user = await User.findOne({
                    $or: [
                        { name: { $regex: new RegExp(`^${login}$`, 'i') } },
                        { email: `${login.toLowerCase()}@github.com` }
                    ]
                });
            }

            // 4. Creation/Heal
            if (!user) {
                user = await User.create({
                    name: login,
                    email: `${login.toLowerCase()}@github.com`,
                    githubUsername: login,
                    image: cont.avatar_url,
                    source: 'github'
                });
            } else if (!user.githubUsername || !user.image) {
                user.githubUsername = user.githubUsername || login;
                user.image = user.image || cont.avatar_url;
                await user.save();
            }

            // 5. AGGRESSIVE DEDUPLICATION: 
            // Look for any existing member records for this project that match this user's identity
            // but might be attached to different User IDs (due to account splitting)
            const allMembers = await ProjectMember.find({ projectId: project._id }).populate('userId');

            // Primary record for the current 'user'
            let primaryMember = await ProjectMember.findOne({
                projectId: project._id,
                userId: user._id
            });

            // Find any "other" records that really belong to this person
            const duplicates = allMembers.filter((m: any) =>
                m.userId &&
                m.userId._id.toString() !== user?._id.toString() &&
                (
                    (m.userId.githubUsername && m.userId.githubUsername.toLowerCase() === login?.toLowerCase()) ||
                    (m.userId.email && user?.email && m.userId.email.toLowerCase() === user.email.toLowerCase())
                )
            );

            const rolesPriority = { 'admin': 3, 'lead': 2, 'developer': 1, 'viewer': 0 };

            for (const dupe of duplicates) {
                console.log(`Deduplicating: found redundant record with role ${dupe.role}`);

                if (!primaryMember) {
                    // If we have no record for the "correct" user ID but found one for a "split" ID,
                    // migrate the record instead of creating a new one.
                    dupe.userId = user?._id;
                    await dupe.save();
                    primaryMember = dupe;
                } else {
                    // Both exist. Merge role to the primary and delete the duplicate.
                    const primaryRole = (primaryMember.role || 'developer') as string;
                    const dupeRole = (dupe.role || 'developer') as string;

                    if ((rolesPriority as any)[dupeRole] > (rolesPriority as any)[primaryRole]) {
                        primaryMember.role = dupeRole;
                        await primaryMember.save();
                    }
                    await ProjectMember.findByIdAndDelete(dupe._id);
                }
            }

            // Ensure at least a developer record exists
            if (!primaryMember) {
                await ProjectMember.create({
                    projectId: project._id,
                    userId: user._id,
                    role: 'developer'
                });
                syncResults.members++;
            }
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
