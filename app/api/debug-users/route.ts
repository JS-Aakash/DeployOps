import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Project, ProjectMember, User } from '@/models';

export async function GET(req: Request) {
    await dbConnect();
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId');

    try {
        const result: any = {};

        if (projectId) {
            const members = await ProjectMember.find({
                projectId: new mongoose.Types.ObjectId(projectId)
            }).populate('userId');

            result.projectMembers = members;
            result.projectId = projectId;
        }

        const allUsers = await User.find({ email: /jsaakash/i });
        result.matchingUsers = allUsers;

        return NextResponse.json(result);
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
import mongoose from 'mongoose';
