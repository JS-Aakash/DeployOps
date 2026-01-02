import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import { AffinityGroup, AffinityItem } from "@/models";
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
        const items = await AffinityItem.find({ projectId: id });
        const existingGroups = await AffinityGroup.find({ projectId: id });

        if (items.length === 0) {
            return NextResponse.json({ error: "No items to categorize" }, { status: 400 });
        }

        const prompt = `
            Analyze the following brainstormed ideas and group them into logical categories.
            Existing Categories: ${existingGroups.map(g => g.title).join(", ") || "None"}
            
            Ideas:
            ${items.map(i => `- [${i._id}] ${i.content}`).join("\n")}

            Return a JSON object with:
            1. "newGroups": Array of strings (new category titles to create)
            2. "assignments": Array of { itemId: string, groupTitle: string }

            Be precise and creative. Group similar functional features together.
        `;

        const aiResponse = await callAI(prompt, "You are a product manager expert in affinity mapping.", true);
        if (!aiResponse) throw new Error("AI failed to respond");

        const result = JSON.parse(aiResponse);
        const { newGroups, assignments } = result;

        // 1. Create New Groups
        const groupMap: Record<string, string> = {}; // title -> id
        existingGroups.forEach(g => groupMap[g.title] = g._id.toString());

        for (const title of newGroups) {
            if (!groupMap[title]) {
                const group = await AffinityGroup.create({
                    projectId: id,
                    title,
                    color: "bg-gray-800",
                    order: Object.keys(groupMap).length
                });
                groupMap[title] = group._id.toString();
            }
        }

        // 2. Update Items
        for (const assignment of assignments) {
            const groupId = groupMap[assignment.groupTitle];
            if (groupId) {
                await AffinityItem.findByIdAndUpdate(assignment.itemId, { groupId });
            }
        }

        return NextResponse.json({ success: true, groupsCreated: newGroups.length });

    } catch (e: any) {
        console.error("Categorize error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
