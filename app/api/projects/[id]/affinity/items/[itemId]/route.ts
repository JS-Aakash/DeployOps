import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import { AffinityItem } from "@/models";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string, itemId: string }> }
) {
    const { itemId } = await params;

    await dbConnect();

    try {
        const body = await req.json();
        const { groupId } = body;

        // Ensure groupId is either a valid ID or null (for ungrouped)
        const updateData: any = { groupId: groupId || null };

        const item = await AffinityItem.findByIdAndUpdate(
            itemId,
            updateData,
            { new: true }
        );

        if (!item) {
            return NextResponse.json({ error: "Item not found" }, { status: 404 });
        }

        return NextResponse.json(item);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
