import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Documentation } from '@/models';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { authorize, authError } from "@/lib/auth-utils";

// PATCH /api/projects/[id]/docs/[docId] - Update documentation
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string, docId: string }> }
) {
    const { id, docId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // RBAC: Only admins or leads can update documentation
    if (!(await authorize(id, ['admin', 'lead']))) {
        return authError();
    }

    await dbConnect();
    try {
        const body = await req.json();
        const { title, content, category } = body;

        const doc = await Documentation.findByIdAndUpdate(
            docId,
            { title, content, category },
            { new: true }
        );

        if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

        return NextResponse.json(doc);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
