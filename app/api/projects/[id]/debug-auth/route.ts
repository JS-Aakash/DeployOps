import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from '@/lib/mongodb';
import { User, ProjectMember } from '@/models';

import mongoose from 'mongoose';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ authenticated: false, session });

    await dbConnect();
    const user = await User.findOne({ email: session.user.email.toLowerCase() });
    if (!user) return NextResponse.json({ authenticated: true, userFound: false, email: session.user.email });

    const member = await ProjectMember.findOne({
        projectId: new mongoose.Types.ObjectId(id),
        userId: user._id
    });

    const allMembers = await ProjectMember.find({ projectId: new mongoose.Types.ObjectId(id) }).populate('userId');

    return NextResponse.json({
        authenticated: true,
        userEmail: session.user.email,
        mongoUserId: user._id,
        projectId: id,
        memberRole: member?.role || "NONE",
        totalProjectMembers: allMembers.length,
        sessionUserId: (session.user as any)?.id,
        membersInfo: allMembers.map(m => ({
            role: m.role,
            email: (m.userId as any)?.email,
            id: (m.userId as any)?._id
        }))
    });
}
