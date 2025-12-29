import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from '@/lib/mongodb';
import { ProjectMember, User } from '@/models';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    const { userId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    try {
        const currentUser = await User.findOne({ email: session.user.email.toLowerCase() });
        if (!currentUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check if current user is admin
        const adminMembership = await ProjectMember.findOne({
            userId: currentUser._id,
            role: 'admin'
        });

        if (!adminMembership) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const body = await req.json();
        const { projectId, role } = body;

        // Update the user's role for the specific project
        const membership = await ProjectMember.findOneAndUpdate(
            { userId, projectId },
            { role },
            { new: true }
        );

        if (!membership) {
            return NextResponse.json({ error: "Membership not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, membership });
    } catch (error: any) {
        console.error("Update user role error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    const { userId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    try {
        const currentUser = await User.findOne({ email: session.user.email.toLowerCase() });
        if (!currentUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check if current user is admin
        const adminMembership = await ProjectMember.findOne({
            userId: currentUser._id,
            role: 'admin'
        });

        if (!adminMembership) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get('projectId');

        if (projectId) {
            // Remove from specific project
            await ProjectMember.findOneAndDelete({ userId, projectId });
        } else {
            // Remove from all projects
            await ProjectMember.deleteMany({ userId });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Remove user error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
