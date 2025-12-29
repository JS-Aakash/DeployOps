import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Project, ProjectMember, User } from '@/models';
import { authorize, authError } from '@/lib/auth-utils';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    await dbConnect();
    try {
        const members = await ProjectMember.find({ projectId: id })
            .populate('userId')
            .sort({ createdAt: -1 });
        return NextResponse.json(members);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    if (!(await authorize(id, ['admin']))) return authError();

    await dbConnect();
    try {
        const body = await req.json();
        const { email, name, role } = body;

        if (!email || !role) {
            return NextResponse.json({ error: "Email and Role are required" }, { status: 400 });
        }

        // Find or create user
        let user = await User.findOne({ email });
        if (!user) {
            if (!name) {
                return NextResponse.json({ error: "Name is required for new users" }, { status: 400 });
            }
            user = await User.create({ email, name, source: 'manual' });
        }

        // Add to project
        const member = await ProjectMember.findOneAndUpdate(
            { projectId: id, userId: user._id },
            { $set: { role } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return NextResponse.json(member);
    } catch (error: any) {
        console.error("Add Member Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
