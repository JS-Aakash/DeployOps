import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import { AffinityGroup, AffinityItem, Requirement } from "@/models";
import { callAI } from "@/lib/ai-service";
import { authorize } from "@/lib/auth-utils";

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

    try {
        const groups = await AffinityGroup.find({ projectId: id });
        const items = await AffinityItem.find({ projectId: id });

        if (groups.length === 0) {
            return NextResponse.json({ error: "No groups found to convert" }, { status: 400 });
        }

        const context = groups.map(g => {
            const groupItems = items.filter(i => i.groupId?.toString() === g._id.toString());
            return `Group: ${g.title}\nIdeas:\n${groupItems.map(i => `- ${i.content}`).join("\n")}`;
        }).join("\n\n");

        const prompt = `
            Convert these brainstormed clusters into formal product requirements.
            For each group, generate a professional requirement title and a detailed technical description.

            Context:
            ${context}

            Return a JSON object with:
            {
              "requirements": [
                { "title": "Requirement Title", "description": "Detailed markdown description", "priority": "high|medium|low" }
              ]
            }
        `;

        const aiResponse = await callAI(prompt, "You are a professional systems analyst.", true);
        if (!aiResponse) throw new Error("AI failed to respond");

        const result = JSON.parse(aiResponse);
        const { requirements } = result;

        for (const reqData of requirements) {
            await Requirement.create({
                projectId: id,
                title: reqData.title,
                description: reqData.description,
                priority: reqData.priority || 'medium',
                status: 'draft',
                createdBy: 'AI Designer'
            });
        }

        return NextResponse.json({ success: true, count: requirements.length });

    } catch (e: any) {
        console.error("Convert error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
