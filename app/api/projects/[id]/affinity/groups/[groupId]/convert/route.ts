import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import { AffinityGroup, AffinityItem, Requirement, User } from "@/models";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string, groupId: string }> }
) {
    const { id, groupId } = await params;

    // 1. Auth Check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    try {
        const user = await User.findOne({ email: session.user.email.toLowerCase() });

        // 2. Fetch Group and Items
        const group = await AffinityGroup.findById(groupId);
        if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

        const items = await AffinityItem.find({ groupId: groupId });
        if (items.length === 0) {
            return NextResponse.json({ error: "Cannot convert empty group" }, { status: 400 });
        }

        // 3. Construct Requirement Description
        // We'll combine the items into a markdown list
        const description = items.map(item => `- ${item.content}`).join('\n');
        const header = `### Derived from Ideation Group: ${group.title}\n\nThe following points were gathered during the affinity mapping session:\n\n`;

        // 4. Create Draft Requirement
        const requirement = await Requirement.create({
            projectId: id,
            title: group.title,
            description: header + description,
            priority: 'medium',
            status: 'draft', // Explicitly DRAFT as requested
            createdBy: user.name || 'Admin',
        });

        // Optional: AI could be triggered here to summarize, but strictly per instructions:
        // "AI Assists but does not decide". We do a literal conversion first.

        return NextResponse.json({
            success: true,
            requirementId: requirement._id,
            message: "Group converted to draft requirement successfully."
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
