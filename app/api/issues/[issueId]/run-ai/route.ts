import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Issue, Project, Requirement } from '@/models';
import { runAutofix } from '@/lib/autofix-service';
import { Octokit } from '@octokit/rest';
import { notifyAllProjectMembers, createNotification } from '@/lib/notification-service';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ issueId: string }> }
) {
    const { issueId } = await params;
    await dbConnect();

    try {
        // 1. Validate Issue & Project
        const issue = await Issue.findById(issueId).populate({ path: 'requirementId', strictPopulate: false });
        if (!issue) {
            return NextResponse.json({ error: "Issue not found" }, { status: 404 });
        }

        // Authorization check
        const { authorize, authError } = require('@/lib/auth-utils');
        if (!(await authorize(issue.projectId.toString(), ['admin', 'lead', 'developer']))) {
            return authError();
        }

        // TODO: IF issue.requirementId exists and status is 'approved', 
        // fetch the requirement description and append it to the 'body' 
        // below to provide the AI with structured architectural context.

        const project = await Project.findById(issue.projectId);
        if (!project) {
            return NextResponse.json({ error: "Associated project not found" }, { status: 404 });
        }

        // 2. Update status to 'ai_running'
        issue.status = 'ai_running';
        await issue.save();

        // 3. Orchestration
        const { getServerSession } = require("next-auth/next");
        const { authOptions } = require("@/app/api/auth/[...nextauth]/route");
        const session = await getServerSession(authOptions);

        const githubToken = (session as any)?.accessToken || process.env.GITHUB_TOKEN;
        const aiKey = process.env.API_KEY;

        if (!githubToken || !aiKey) {
            issue.status = 'open';
            await issue.save();
            return NextResponse.json({
                error: !githubToken ? "Missing GitHub Token: Please sign in again." : "Server misconfigured: Missing API_KEY"
            }, { status: 500 });
        }

        const octokit = new Octokit({ auth: githubToken });

        // 4. Create "Shadow Issue" on GitHub to get a valid URL for the black-box solver
        // This allows the existing runAutofix to fetch the context naturally.
        const mention = (session as any)?.user?.githubUsername ? `@${(session as any).user.githubUsername}` : '';
        const { data: ghIssue } = await octokit.issues.create({
            owner: project.owner,
            repo: project.repo,
            title: `[USDMP] ${issue.title}`,
            body: `**Issue Type**: ${issue.type.toUpperCase()}\n\n${issue.description}\n\n*Triggered by ${mention} via DeployOps Portal*`,
        });

        // 5. Invoke AI Solver (Black Box)
        console.log(`Starting AI Solver for issue ${issue._id} using GitHub Issue ${ghIssue.html_url}`);

        try {
            const result = await runAutofix({
                issueUrl: ghIssue.html_url,
                repoUrl: project.repoUrl,
                githubToken: githubToken,
                openaiKey: aiKey,
                onLog: (msg, level) => {
                    console.log(`[AI Solver Log] [${level || 'info'}] ${msg}`);
                    // Optional: We could stream these logs to the client via Socket.io or SSE in the future
                }
            });

            // 6. On Success
            if (result && result.status === 'SUCCESS') {
                issue.status = 'pr_created';
                issue.prUrl = result.prUrl;
                issue.aiExplanation = `Successfully generated a fix for: "${issue.title}". \n\nChanges include code refactoring to address the core issue and potential bug fixes. \n\nRisks: Low. Unit tests should be socialized before merging.`;
                await issue.save();

                // Trigger Smart Notification for PR
                await notifyAllProjectMembers(project._id.toString(), {
                    type: 'pr_created',
                    message: `⚡ AI created a Pull Request for "${issue.title}" @${(session as any)?.user?.githubUsername || ''}`,
                    link: result.prUrl,
                    isCritical: false
                });

                // 8. Auto-create "Review PR" task for humans (Requirements Integration)
                try {
                    const { Task, User: UserModel } = require('@/models');
                    const session = await (require("next-auth/next")).getServerSession((require("@/app/api/auth/[...nextauth]/route")).authOptions);
                    if (session?.user?.email) {
                        const currentUser = await UserModel.findOne({ email: session.user.email });
                        if (currentUser) {
                            await Task.create({
                                title: `Review AI PR for: ${issue.title}`,
                                description: `The AI has generated a fix and created a Pull Request. Please conduct a human review of the changes at ${result.prUrl}`,
                                status: 'todo',
                                priority: 'high',
                                assignedTo: currentUser._id,
                                projectId: project._id,
                                issueId: issue._id,
                                prUrl: result.prUrl,
                                createdBy: currentUser._id
                            });

                            // Trigger Smart Notification for Task
                            await createNotification(currentUser._id.toString(), {
                                type: 'task_assigned',
                                message: `📝 Requirement Review: AI PR for "${issue.title}"`,
                                projectId: project._id,
                                link: result.prUrl,
                                isCritical: true
                            });
                        }
                    }
                } catch (taskError) {
                    console.error("Auto-task creation failed:", taskError);
                }

                return NextResponse.json({ success: true, prUrl: result.prUrl });
            } else {
                throw new Error("AI Solver failed to generate a fix.");
            }

        } catch (solverError: any) {
            console.error("AI Solver Execution Error:", solverError);
            // 7. On Failure
            issue.status = 'open';
            // Store error info in description or a new field if we wanted, but keeping it minimal as per constraints.
            await issue.save();
            return NextResponse.json({ error: solverError.message }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Orchestration Error:", error);
        let message = error.message;
        if (message.includes("Bad credentials")) {
            message = "GitHub Bad Credentials: Your GITHUB_TOKEN in .env.local is likely invalid or expired.";
        }

        // Safety: Revert status if it got stuck in ai_running
        try {
            await Issue.findByIdAndUpdate(issueId, { status: 'open' });
        } catch (e) { }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
