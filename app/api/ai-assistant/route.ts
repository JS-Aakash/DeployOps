import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import OpenAI from "openai";
import dbConnect from "@/lib/mongodb";
import { Project, Issue, Task, AuditLog, User } from "@/models";
import { authorize } from "@/lib/auth-utils";
import { logAudit } from "@/lib/audit-service";

const openai = new OpenAI({
    apiKey: process.env.API_KEY || process.env.OPENAI_API_KEY,
    baseURL: "https://api.cerebras.ai/v1",
});

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { messages, context } = await req.json();

        const response = await openai.chat.completions.create({
            model: "llama-3.3-70b",
            messages: [
                {
                    role: "system",
                    content: `You are the DeployOps Copilot, an internal AI assistant for a DevOps and Project Management platform.
User Role: ${(session.user as any).role || 'user'}
Current Route: ${context.currentRoute}

KNOWLEDGE CONTEXT:
${JSON.stringify(context.siteData, null, 2)}

CAPABILITIES:
1. Question Answering: Use the KNOWLEDGE CONTEXT to answer user questions about projects, PRs, deployments, and issues.
2. Actions: You can detect intent to perform actions. If the user wants to take an action, you should respond with a special JSON format (explained below).

ACTION MODE:
If the user intent is to perform an action (Create Issue, Create Task, Sync GitHub, Deploy, Merge, Rollback, Fix Issue), you MUST include an "action" field in your JSON response.

RESPONSE FORMAT:
You must ALWAYS respond in JSON format with the following structure:
{
  "message": "Your helpful response to the user in Markdown format",
  "action": null | {
    "type": "create_issue" | "create_task" | "sync_github" | "deploy" | "merge" | "rollback" | "trigger_autofix",
    "params": { ... depend on type ... },
    "confirmationRequired": boolean
  }
}

ACTION GUIDELINES:
- Only "admin" or "lead" roles can perform Destructive actions (Merge, Rollback, Deploy).
- Users can always Create Issues or Tasks.
- For "create_issue", params: { projectId, title, description, priority }.
- For "create_task", params: { projectId, title, description, priority, assignedTo? }.
- For "sync_github", params: { projectId }.
- For "trigger_autofix", params: { issueUrl, repoUrl, projectId }. Use this when the user says "fix this issue" or "resolve #[ID]".
- For "deploy", params: { projectId }.
- For "merge", params: { prId, projectId }.
- For "rollback", params: { projectId, prNumber, commitSha }.

BEHAVIOR:
- Be factual. If data is missing, suggest where to find it.
- If an action is requested but user lacks permission, explain politely.
- If an action is requested but params are ambiguous (e.g. which project?), ask for clarification.
`
                },
                ...messages
            ],
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content || "{}");

        // Handle Auto-Execution for non-destructive or if confirmed (for now, let's keep it simple and handle on frontend or backend)
        // The requirements say "Detect intent and perform actions".
        // I'll implement a basic executor here if no confirmation is needed, or just return the action metadata.

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("AI Assistant Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
