import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import { Project } from "@/models";
import { authorize } from "@/lib/auth-utils";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!(await authorize(id, ['admin', 'lead', 'developer']))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    try {
        const body = await req.json();
        const { provider, netlifySiteId, netlifyToken, renderDeployHook, renderServiceName, productionUrl } = body;

        if (!['netlify', 'render'].includes(provider)) {
            return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
        }

        const updateData: any = {
            deployProvider: provider,
            deployStatus: 'ready',
            productionUrl: productionUrl || ""
        };

        if (provider === 'netlify') {
            if (!netlifySiteId || !netlifyToken) throw new Error("Netlify Site ID and Token are required");
            updateData.netlifySiteId = netlifySiteId;
            updateData.netlifyToken = netlifyToken;
        } else if (provider === 'render') {
            if (!renderDeployHook) throw new Error("Render Deploy Hook URL is required");
            updateData.renderDeployHook = renderDeployHook;
            updateData.renderServiceName = renderServiceName || "";
        }

        const project = await Project.findByIdAndUpdate(id, updateData, { new: true });
        if (!project) throw new Error("Project not found");

        return NextResponse.json({ success: true, project });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
