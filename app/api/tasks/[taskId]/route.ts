import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from '@/lib/mongodb';
import { Task, User } from '@/models';

// PATCH /api/tasks/[taskId] - Update task status
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ taskId: string }> }
) {
    const { taskId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const currentUser = await User.findOne({ email: session.user.email });

    try {
        const body = await req.json();
        const { status } = body;

        // Validation: Only designated assignee or project admins should ideally update, 
        // but for simplicity in this module, we allow designated assignee or creator.
        const task = await Task.findById(taskId);
        if (!task) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        if (task.assignedTo.toString() !== currentUser._id.toString() &&
            task.createdBy.toString() !== currentUser._id.toString()) {
            return NextResponse.json({ error: "Unauthorized to update this task" }, { status: 403 });
        }

        task.status = status;
        await task.save();

        // TODO (Integration): If status changed to 'done' and task is linked to a PR, 
        // we might trigger an auto-check for PR merge state in the future.

        return NextResponse.json(task);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
