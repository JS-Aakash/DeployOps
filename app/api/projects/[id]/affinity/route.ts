import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import { AffinityGroup, AffinityItem, Project, User } from "@/models";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    await dbConnect();

    try {
        const groups = await AffinityGroup.find({ projectId: id }).sort({ order: 1 });
        const items = await AffinityItem.find({ projectId: id });

        return NextResponse.json({
            groups,
            items
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    try {
        const user = await User.findOne({ email: session.user.email.toLowerCase() });
        const body = await req.json();
        const { type } = body; // 'group' or 'item'

        if (type === 'group') {
            const { title, color } = body;
            const group = await AffinityGroup.create({
                projectId: id,
                title,
                color,
                order: await AffinityGroup.countDocuments({ projectId: id })
            });
            return NextResponse.json({ type: 'group', data: group });
        }

        if (type === 'item') {
            const { content, groupId, color } = body;
            const item = await AffinityItem.create({
                projectId: id,
                content,
                groupId: groupId || null,
                createdBy: user._id,
                color: color || 'bg-yellow-200'
            });
            return NextResponse.json({ type: 'item', data: item });
        }

        return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
