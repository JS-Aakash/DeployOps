import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from '@/lib/mongodb';
import { Notification, User } from '@/models';

export async function PATCH(
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
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const notification = await Notification.findOneAndUpdate(
            { _id: id, userId: user._id },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return NextResponse.json({ error: "Notification not found" }, { status: 404 });
        }

        return NextResponse.json(notification);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
