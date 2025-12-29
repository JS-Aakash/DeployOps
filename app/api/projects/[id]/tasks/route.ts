import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Task } from '@/models';
import mongoose from 'mongoose';

// GET /api/projects/[id]/tasks - List tasks for a specific project
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    await dbConnect();
    try {
        const tasks = await Task.find({ projectId: new mongoose.Types.ObjectId(id) })
            .populate('assignedTo', 'name email image')
            .populate('createdBy', 'name')
            .populate('projectId', 'name')
            .sort({ createdAt: -1 });
        return NextResponse.json(tasks);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
