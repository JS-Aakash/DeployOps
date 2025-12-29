import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Issue } from '@/models';

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string, issueId: string }> }
) {
    const { issueId } = await params;
    await dbConnect();
    try {
        const body = await req.json();
        const { status, prUrl, assignedTo } = body;

        // TODO: When status is changed to 'ai_running', verify if AI solver should be invoked here 
        // or if the frontend triggers it separately.

        const currentIssue = await Issue.findById(issueId);
        if (!currentIssue) {
            return NextResponse.json({ error: "Issue not found" }, { status: 404 });
        }

        // Safety validation: Only lock if explicitly assigned to AI
        if (currentIssue.status === 'ai_running' && currentIssue.assignedTo === 'ai') {
            return NextResponse.json({ error: "Cannot manually move an issue that is being processed by AI Agent." }, { status: 400 });
        }

        if (currentIssue.status === 'closed') {
            return NextResponse.json({ error: "Completed issues are read-only. Use GitHub to reopen if needed." }, { status: 400 });
        }

        const issue = await Issue.findByIdAndUpdate(
            issueId,
            { status, prUrl, assignedTo },
            { new: true }
        );

        if (!issue) {
            return NextResponse.json({ error: "Issue not found" }, { status: 404 });
        }

        return NextResponse.json(issue);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
