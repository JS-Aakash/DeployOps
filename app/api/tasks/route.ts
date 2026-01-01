import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from '@/lib/mongodb';
import { Task, Project, ProjectMember, User, Notification } from '@/models';
import { createNotification } from '@/lib/notification-service';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    try {
        const body = await req.json();
        const { title, description, priority, projectId, assignedTo: bodyAssignedTo } = body;

        const user = await User.findOne({ email: session.user.email.toLowerCase() });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Verify project existence
        const project = await Project.findById(projectId);
        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const targetAssigneeId = bodyAssignedTo || user._id;

        // Create Task
        const task = await Task.create({
            title,
            description,
            priority,
            projectId,
            assignedTo: targetAssigneeId,
            createdBy: user._id,
            status: 'todo'
        });

        // Send Notification if assigned to someone else
        if (targetAssigneeId.toString() !== user._id.toString()) {
            await createNotification(targetAssigneeId.toString(), {
                type: 'task_assigned',
                message: `You have been assigned a new task: ${title}`,
                link: '/tasks',
                projectId: project._id,
                isCritical: priority === 'high'
            });
        }

        return NextResponse.json(task, { status: 201 });
    } catch (e: any) {
        console.error("Task creation error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email.toLowerCase() });

    // Fetch tasks where user is assignee OR creator
    const tasks = await Task.find({
        $or: [
            { assignedTo: user._id },
            { createdBy: user._id }
        ]
    })
        .populate('projectId', 'name')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 });

    return NextResponse.json(tasks);
}
