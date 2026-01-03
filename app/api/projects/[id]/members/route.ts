import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Project, ProjectMember, User } from '@/models';
import { authorize, authError } from '@/lib/auth-utils';
import { logAudit } from '@/lib/audit-service';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from 'mongoose';

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
        const members = await ProjectMember.find({ projectId: new mongoose.Types.ObjectId(id) })
            .populate('userId')
            .sort({ createdAt: -1 });
        return NextResponse.json(members);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    if (!(await authorize(id, ['admin']))) return authError();

    await dbConnect();
    try {
        const body = await req.json();
        const { email, name, role, githubUsername } = body;

        if (!email || !role) {
            return NextResponse.json({ error: "Email and Role are required" }, { status: 400 });
        }

        const project = await Project.findById(id);
        if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        // profile enrichment tools
        const { Octokit } = require("@octokit/rest");
        const session = await getServerSession(authOptions);
        const githubToken = (session as any)?.accessToken || process.env.GITHUB_TOKEN;
        const octokit = new Octokit({ auth: githubToken });

        // 1. Fetch GitHub Profile if username provided
        let ghProfile: any = null;
        if (githubUsername) {
            try {
                const { data } = await octokit.users.getByUsername({ username: githubUsername });
                ghProfile = data;
            } catch (err) {
                console.error("Could not fetch GH profile for manual add:", err);
            }
        }

        // 2. Find or create user (with robust reconciliation)
        let user = null;

        // Try to match by githubUsername first (strongest link)
        if (githubUsername) {
            user = await User.findOne({ githubUsername: { $regex: new RegExp(`^${githubUsername}$`, 'i') } });
        }

        // Try to match by Email second
        if (!user) {
            user = await User.findOne({ email: email.toLowerCase() });
        }

        if (!user) {
            user = await User.create({
                email: email.toLowerCase(),
                name: ghProfile?.name || name || githubUsername,
                githubUsername: githubUsername || undefined,
                image: ghProfile?.avatar_url || undefined,
                source: githubUsername ? 'github' : 'manual'
            });
        } else {
            // Heal record: Link the githubUsername and Avatar if missing
            let changed = false;
            if (githubUsername && !user.githubUsername) {
                user.githubUsername = githubUsername;
                changed = true;
            }
            if (ghProfile?.avatar_url && !user.image) {
                user.image = ghProfile.avatar_url;
                changed = true;
            }
            if (changed) await user.save();
        }

        // 3. Add to project database record
        const member = await ProjectMember.findOneAndUpdate(
            { projectId: id, userId: user._id },
            { $set: { role } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // 1. Send Email Notification
        const { sendInviteEmail, createNotification } = require('@/lib/notification-service');
        await sendInviteEmail(email, user.name, project.name, role);

        // 2. Add Internal Notification
        await createNotification(user._id.toString(), {
            projectId: project._id.toString(),
            type: 'task_assigned', // Reusing this for general "invited" event
            message: `You have been added to ${project.name} as a ${role}`,
            link: `/projects/${project._id}`
        });

        // 2. Try to Invite to GitHub Repository
        if (user.githubUsername && project.owner && project.repo) {
            try {
                const { Octokit } = require("@octokit/rest");

                const session = await getServerSession(authOptions);
                const githubToken = (session as any)?.accessToken || process.env.GITHUB_TOKEN;

                if (githubToken) {
                    const octokit = new Octokit({ auth: githubToken });
                    await octokit.repos.addCollaborator({
                        owner: project.owner,
                        repo: project.repo,
                        username: user.githubUsername,
                        permission: role === 'admin' ? 'admin' : (role === 'lead' ? 'maintain' : 'push')
                    });
                    console.log(`GitHub invitation sent to ${user.githubUsername}`);
                }
            } catch (ghError) {
                console.error("GitHub Invitation Failed (User might already be a member or token lacks permission):", ghError);
            }
        }

        // Log the member change
        await logAudit({
            actorId: (session?.user as any).id,
            actorName: session?.user?.name || 'Admin',
            actorType: 'user',
            action: 'member_update',
            entityType: 'project',
            entityId: id,
            projectId: id,
            description: `${session?.user?.name} updated/added member ${user.name} with role ${role}`
        });

        return NextResponse.json({ success: true, member });
    } catch (error: any) {
        console.error("Add Member Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('memberId');

    if (!(await authorize(projectId, ['admin']))) return authError();

    if (!memberId) {
        return NextResponse.json({ error: "Member ID is required" }, { status: 400 });
    }

    await dbConnect();
    try {
        const member = await ProjectMember.findById(memberId).populate('userId');
        await ProjectMember.findByIdAndDelete(memberId);

        const session = await getServerSession(authOptions);

        // Log the member removal
        await logAudit({
            actorId: (session?.user as any).id,
            actorName: session?.user?.name || 'Admin',
            actorType: 'user',
            action: 'member_remove',
            entityType: 'project',
            entityId: projectId,
            projectId: projectId,
            description: `${session?.user?.name} removed member ${(member as any)?.userId?.name || 'Unknown'} from project`
        });

        return NextResponse.json({ message: "Member removed successfully" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
