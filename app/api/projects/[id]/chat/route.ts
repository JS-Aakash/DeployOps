import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Project, ChatMessage, Requirement, Issue, Notification, User, Task, AffinityItem } from '@/models';
import OpenAI from 'openai';

// Helper to get AI Response (Read-Only Advice)
async function getChatAIResponse(projectId: string, userMessage: string, recentMessages: any[]) {
    await dbConnect();
    const { Documentation } = require('@/models'); // Dynamic import to avoid circular dep issues just in case

    const project = await Project.findById(projectId);
    const requirements = await Requirement.find({ projectId, status: 'approved' });
    const docs = await Documentation.find({ projectId }).limit(20);
    const issues = await Issue.find({ projectId }).limit(10).sort({ updatedAt: -1 });
    const tasks = await Task.find({ projectId }).limit(10);
    const affinityItems = await AffinityItem.find({ projectId }).limit(20);

    const apiKey = process.env.API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) return "AI Configuration Error: API Key missing.";

    // Determine model/baseURL same as autofix-service
    const isGroq = apiKey.startsWith('gsk_');
    const isOllama = apiKey.startsWith('ollama:');
    const isOpenRouter = apiKey.startsWith('sk-or-');
    const isCerebras = apiKey.startsWith('csk-');
    const isTogether = apiKey.startsWith('together_');
    const isDeepSeek = apiKey.startsWith('sk-') && apiKey.length > 50; // Generic check, usually requires explicit URL

    let baseURL = undefined;
    if (isOpenRouter) baseURL = 'https://openrouter.ai/api/v1';
    else if (isGroq) baseURL = 'https://api.groq.com/openai/v1';
    else if (isOllama) baseURL = 'http://localhost:11434/v1';
    else if (isCerebras) baseURL = 'https://api.cerebras.ai/v1';
    else if (isTogether) baseURL = 'https://api.together.xyz/v1';

    const openai = new OpenAI({
        apiKey: isOllama ? 'ollama' : apiKey,
        baseURL
    });

    let modelName = 'gpt-4o';
    if (isGroq) modelName = 'llama3-70b-8192';
    else if (isOpenRouter) modelName = 'google/gemini-2.0-flash-exp:free';
    else if (isOllama) modelName = apiKey.split(':')[1] || 'llama3';
    else if (isCerebras) modelName = 'llama3.1-8b';
    else if (isTogether) modelName = 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';

    const contextPrompt = `
You are a Senior Technical Lead and Consultant for the project "${project?.name}".
Your goal is to provide detailed, actionable, and intelligent responses. You have access to the project's full context.

CONTEXT:
Project: ${project?.name} - ${project?.description}

ARCHITECTURE & DOCS:
${docs.map((d: any) => `[${d.category.toUpperCase()}] ${d.title}: ${d.content.substring(0, 500)}`).join('\n')}

REQUIREMENTS:
${requirements.map(r => `- ${r.title}: ${r.description?.substring(0, 100)}`).join('\n')}

ACTIVE ISSUES:
${issues.map(i => `- [${i.priority}] ${i.title} (${i.status})`).join('\n')}

RECENT TASKS:
${tasks.map(t => `- ${t.title} (${t.status})`).join('\n')}

IDEATION (Affinity Board):
${affinityItems.map(a => `- ${a.content}`).join('\n')}

RECENT CHAT HISTORY:
${recentMessages.map(m => `${m.senderName}: ${m.content}`).join('\n')}

USER QUESTION:
${userMessage}

INSTRUCTIONS:
1. BE DETAILED: Do not give one-line answers unless asked. Explain your reasoning.
2. BE CONTEXT-AWARE: Reference specific issues, requirements, or documentation titles when relevant.
3. BE HELPFUL: If the user asks "How do I implement X?", give a high-level architectural overview or code snippet if appropriate.
4. DO NOT hallucinate features not in the DB.
5. If asked to write code, provide it but remind them to check it out via "Run Auto-Fix" or submitting a PR.
`;

    try {
        const completion = await openai.chat.completions.create({
            messages: [{ role: 'system', content: contextPrompt }],
            model: modelName,
            max_tokens: 1500,
            temperature: 0.7
        });

        return completion.choices[0].message.content;
    } catch (err: any) {
        console.error("Chat AI Error:", err);
        return "I'm experiencing high latency. Please ask again in a moment.";
    }
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    await dbConnect();
    try {
        const messages = await ChatMessage.find({ projectId: id }).sort({ createdAt: 1 }).limit(100);
        return NextResponse.json(messages);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    await dbConnect();
    try {
        const body = await req.json();
        const { content, senderName, senderId } = body;

        // 1. Save Human Message
        const message = await ChatMessage.create({
            projectId: id,
            senderType: 'human',
            senderId,
            senderName,
            content
        });

        // 2. Process Notifications (@User mentions)
        // Regex for quoted names: @"John Doe" and simple names: @Warwick
        const quotedMentions = content.match(/@"([^"]+)"/g) || [];
        const simpleMentions = content.match(/@([a-zA-Z0-9_]+)/g) || [];

        const mentionedNames = [
            ...quotedMentions.map((m: string) => m.substring(2, m.length - 1)), // Remove @" and "
            ...simpleMentions.map((m: string) => m.substring(1)) // Remove @
        ].filter((name: string) => name.toLowerCase() !== 'ai'); // ignore @ai

        if (mentionedNames.length > 0) {
            // Find users matching names (Partial match or Exact match)
            const users = await User.find({
                name: { $in: mentionedNames.map((n: string) => new RegExp(n, 'i')) }
            });

            // Create notifications
            const notifications = [];
            for (const user of users) {
                // Don't notify self
                if (user.email === senderId) continue;

                notifications.push({
                    userId: user._id,
                    projectId: id,
                    type: 'task_assigned', // Reusing task_assigned generic type
                    message: `${senderName} mentioned you in Project Chat: "${content.substring(0, 50)}..."`,
                    link: `/projects/${id}/chat`,
                    isRead: false
                });
            }

            if (notifications.length > 0) {
                await Notification.insertMany(notifications);
            }
        }

        // 3. Process AI (@ai mention)
        if (content.toLowerCase().includes('@ai')) {
            const recentMessages = await ChatMessage.find({ projectId: id }).sort({ createdAt: -1 }).limit(10);
            const aiContent = await getChatAIResponse(id, content, recentMessages.reverse());

            // Save AI Response
            await ChatMessage.create({
                projectId: id,
                senderType: 'ai',
                senderId: 'ai',
                senderName: 'USDMP AI Assistant',
                content: aiContent
            });
        }

        return NextResponse.json(message, { status: 201 });
    } catch (error: any) {
        console.error("Chat Post Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
