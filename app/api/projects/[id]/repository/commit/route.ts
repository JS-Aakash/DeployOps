import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Octokit } from '@octokit/rest';
import { Project } from '@/models';
import dbConnect from '@/lib/mongodb';
import { authorize } from '@/lib/auth-utils';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!(await authorize(id, ['admin', 'lead', 'developer']))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();
    const project = await Project.findById(id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const body = await req.json();
    const { modifiedFiles, deletedFiles = [], commitMessage, mode = 'pr' } = body;

    if ((!modifiedFiles || modifiedFiles.length === 0) && (!deletedFiles || deletedFiles.length === 0)) {
        return NextResponse.json({ error: "No changes to commit." }, { status: 400 });
    }

    const githubToken = (session as any)?.accessToken || process.env.GITHUB_TOKEN;
    const octokit = new Octokit({ auth: githubToken });

    try {
        const owner = project.owner;
        const repo = project.repo;

        // 1. Get default branch
        const { data: repoInfo } = await octokit.repos.get({ owner, repo });
        const defaultBranch = repoInfo.default_branch;

        // 2. Get latest commit of default branch
        const { data: refData } = await octokit.git.getRef({
            owner,
            repo,
            ref: `heads/${defaultBranch}`,
        });
        const lastCommitSha = refData.object.sha;

        // 3. Create blobs for modified/new files
        const modifiedTreeItems = await Promise.all((modifiedFiles || []).map(async (file: any) => {
            const { data: blobData } = await octokit.git.createBlob({
                owner,
                repo,
                content: file.content,
                encoding: 'utf-8',
            });
            return {
                path: file.path,
                mode: '100644', // normal file
                type: 'blob',
                sha: blobData.sha,
            };
        }));

        // 4. Create deletion entries (setting sha to null deletes the path when using base_tree)
        const deletedTreeItems = (deletedFiles || []).map((path: string) => ({
            path,
            mode: '100644',
            type: 'blob',
            sha: null,
        }));

        const treeItems = [...modifiedTreeItems, ...deletedTreeItems];

        // 5. Create a new tree
        const { data: treeData } = await octokit.git.createTree({
            owner,
            repo,
            base_tree: lastCommitSha,
            tree: treeItems as any,
        });

        // 5. Create a commit
        const { data: commitData } = await octokit.git.createCommit({
            owner,
            repo,
            message: commitMessage || "Updates from DeployOps Editor",
            tree: treeData.sha,
            parents: [lastCommitSha],
        });

        if (mode === 'merge') {
            // Direct update of default branch
            await octokit.git.updateRef({
                owner,
                repo,
                ref: `heads/${defaultBranch}`,
                sha: commitData.sha,
            });

            return NextResponse.json({
                success: true,
                mode: 'merge',
                branch: defaultBranch,
                sha: commitData.sha
            });
        } else {
            // Create a new branch and PR
            const newBranchName = `deployops/editor-${Date.now()}`;
            await octokit.git.createRef({
                owner,
                repo,
                ref: `refs/heads/${newBranchName}`,
                sha: commitData.sha,
            });

            const { data: prData } = await octokit.pulls.create({
                owner,
                repo,
                title: commitMessage || "Updates from DeployOps Editor",
                head: newBranchName,
                base: defaultBranch,
                body: "This PR contains changes made within the DeployOps Code Editor.",
            });

            return NextResponse.json({
                success: true,
                mode: 'pr',
                branch: newBranchName,
                prUrl: prData.html_url
            });
        }

    } catch (error: any) {
        console.error("Commit Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
