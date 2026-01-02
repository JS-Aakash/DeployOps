import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from '@/lib/mongodb';
import { Project, ProjectMember, User } from '@/models';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    try {
        const user = await User.findOne({ email: session.user.email.toLowerCase() });
        if (!user) {
            return NextResponse.json([]);
        }

        // Find project IDs where the user is a member
        const memberships = await ProjectMember.find({ userId: user._id }).select('projectId');
        const projectIds = memberships.map(m => m.projectId);

        const projects = await Project.find({ _id: { $in: projectIds } }).sort({ createdAt: -1 });
        return NextResponse.json(projects);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import { Octokit } from '@octokit/rest';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    try {
        const body = await req.json();
        const { name, description, repoUrl, createRepo, isPrivate } = body;
        const accessToken = (session as any).accessToken;

        let finalRepoUrl = repoUrl;
        let owner = '';
        let repo = '';

        // Case 1: Create a brand new repo on GitHub
        if (createRepo) {
            if (!accessToken) throw new Error("GitHub access token not found. Re-login required.");

            const octokit = new Octokit({ auth: accessToken });

            try {
                const { data: newRepo } = await octokit.repos.createForAuthenticatedUser({
                    name: name.replace(/\s+/g, '-').toLowerCase(),
                    description: description || "Project created via DeployOps",
                    private: isPrivate === true,
                    auto_init: true // Create README so it's not empty
                });

                finalRepoUrl = newRepo.html_url;
                owner = newRepo.owner.login;
                repo = newRepo.name;
            } catch (githubError: any) {
                console.error("GitHub Repo Creation Error:", githubError);
                if (githubError.status === 422) {
                    throw new Error("A repository with this name already exists on your GitHub account.");
                }
                throw new Error(`GitHub Error: ${githubError.message}`);
            }
        }
        // Case 2: Import existing repo
        else {
            if (!repoUrl) throw new Error("Repository URL is required for import.");

            const match = repoUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
            if (match) {
                owner = match[1];
                repo = match[2];
            } else {
                throw new Error("Invalid GitHub repository URL.");
            }
        }

        const project = await Project.create({
            name,
            description,
            repoUrl: finalRepoUrl,
            owner,
            repo
        });

        // Automatically add creator as Admin
        const user = await User.findOne({ email: session.user.email.toLowerCase() });
        if (user) {
            await ProjectMember.create({
                projectId: project._id,
                userId: user._id,
                role: 'admin'
            });
        }

        return NextResponse.json(project, { status: 201 });
    } catch (error: any) {
        console.error("Project Selection Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
