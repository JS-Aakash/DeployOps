import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Requirement } from '@/models';

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string, reqId: string }> }
) {
    const { reqId } = await params;
    await dbConnect();
    try {
        const body = await req.json();
        const requirement = await Requirement.findByIdAndUpdate(
            reqId,
            { ...body },
            { new: true }
        );

        if (!requirement) {
            return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
        }

        return NextResponse.json(requirement);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
