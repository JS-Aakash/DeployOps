import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Documentation, User } from '@/models';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { authorize, authError } from "@/lib/auth-utils";
import { logAudit } from "@/lib/audit-service";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // Authorization Check
    if (!(await authorize(id, ['admin', 'lead', 'developer', 'viewer']))) {
        return authError();
    }

    console.log(`GET Docs reached for project: ${id}`);
    await dbConnect();
    try {
        const docs = await Documentation.find({ projectId: new mongoose.Types.ObjectId(id) })
            .populate('createdBy', 'name')
            .sort({ category: 1, title: 1 });
        console.log(`Found ${docs.length} docs`);
        return NextResponse.json(docs);
    } catch (error: any) {
        console.error("GET Docs Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

import mongoose from 'mongoose';

// POST /api/projects/[id]/docs - Create a new doc (Admins/Leads only)
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // RBAC: Only admins or leads can create documentation
    if (!(await authorize(id, ['admin', 'lead']))) {
        return authError();
    }

    await dbConnect();
    try {
        const user = await User.findOne({ email: session.user.email });
        const body = await req.json();
        const { title, content, category } = body;

        const doc = await Documentation.create({
            projectId: id,
            title,
            content,
            category,
            createdBy: user._id
        });

        // Log documentation creation
        await logAudit({
            actorId: user._id.toString(),
            actorName: user.name,
            actorType: 'user',
            action: 'docs_create',
            entityType: 'requirement', // Mapping docs to requirement category for simplicity in audit model
            entityId: doc._id.toString(),
            projectId: id,
            description: `${user.name} created documentation: ${doc.title}`
        });

        return NextResponse.json(doc, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
