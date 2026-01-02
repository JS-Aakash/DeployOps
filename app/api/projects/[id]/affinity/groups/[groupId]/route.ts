import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { AffinityGroup, AffinityItem } from "@/models";

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string, groupId: string }> }
) {
    const { groupId } = await params;
    await dbConnect();

    try {
        // 1. Delete the group
        await AffinityGroup.findByIdAndDelete(groupId);

        // 2. Ungroup items that belonged to this group
        await AffinityItem.updateMany(
            { groupId },
            { $set: { groupId: null } }
        );

        return new NextResponse(null, { status: 204 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
