import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import { ProjectMember, User, Project } from "@/models";
import { NextResponse } from "next/server";
import mongoose from 'mongoose';

export async function getProjectRole(projectId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        console.log("No session email found", session);
        return null;
    }

    const email = session.user.email.toLowerCase();
    await dbConnect();
    let user = await User.findOne({ email });

    // Backup: try finding by session.user.id if email lookup fails
    if (!user && (session.user as any).id) {
        user = await User.findById((session.user as any).id);
    }

    if (!user) {
        console.log(`User not found for email: ${email} or ID: ${(session.user as any)?.id}`);
        return null;
    }

    console.log(`User found: ${user._id} (${email}). Checking member for project: ${projectId}`);

    let member = await ProjectMember.findOne({
        projectId: new mongoose.Types.ObjectId(projectId),
        userId: user._id
    });

    console.log(`Checking role for ${email} on project ${projectId}. Found member: ${!!member}`);

    // IDENTITY RECONCILIATION:
    // If no member found by ID, look for a member with the same EMAIL 
    // (This heals legacy splits where the user might have two DB records)
    if (!member) {
        console.log(`Direct lookup failed for ${user._id}. Searching by email/github reconciliation...`);

        const searchCriteria: any[] = [{ email: email }];
        if (user.githubUsername) {
            searchCriteria.push({ githubUsername: user.githubUsername });
        }

        const otherUsers = await User.find({ $or: searchCriteria });
        const otherUserIds = otherUsers.map(u => u._id);

        member = await ProjectMember.findOne({
            projectId: new mongoose.Types.ObjectId(projectId),
            userId: { $in: otherUserIds }
        });

        if (member) {
            console.log(`RECONCILED: Found member via email/github match. Migrating membership to current ID ${user._id}`);
            member.userId = user._id;
            await member.save();
        }
    }

    // OWNER ELEVATION:
    // If still no member OR if member is not an admin/lead, check if they are the repo owner
    const project = await Project.findById(projectId);
    if (project && user.githubUsername && project.owner === user.githubUsername) {
        if (!member) {
            console.log(`OWNER DETECTED: Auto-creating Admin record for repo owner ${user.githubUsername}`);
            member = await ProjectMember.create({
                projectId,
                userId: user._id,
                role: 'admin'
            });
        } else if (member.role !== 'admin' && member.role !== 'lead') {
            console.log(`OWNER DETECTED: Elevating ${user.githubUsername} from ${member.role} to admin`);
            member.role = 'admin';
            await member.save();
        }
    }

    // Fallback: If project has NO members at all, automatically make the first interactor an Admin
    if (!member) {
        const allProjectMembers = await ProjectMember.find({ projectId: new mongoose.Types.ObjectId(projectId) }).populate('userId');
        console.log(`Still no member found. TOTAL PROJECT MEMBERS: ${allProjectMembers.length}`);

        allProjectMembers.forEach((m: any, i) => {
            console.log(`Member ${i}: UserID=${m.userId?._id}, Email=${m.userId?.email}, Role=${m.role}`);
        });

        // Final safety: if the project somehow has no one with this email, and total members is 0, claim it.
        if (allProjectMembers.length === 0) {
            console.log(`Auto-assigning Admin role to ${email}`);
            member = await ProjectMember.create({
                projectId,
                userId: user._id,
                role: 'admin'
            });
        }
    }

    console.log(`Final role for ${email}: ${member?.role}`);
    return member?.role || null;
}

export async function authorize(projectId: string, allowedRoles: string[]) {
    const role = await getProjectRole(projectId);
    console.log(`Authorize: User has role ${role}, Allowed ${allowedRoles}`);
    if (!role || !allowedRoles.includes(role)) {
        return false;
    }
    return true;
}

export function authError() {
    return NextResponse.json({ error: "Unauthorized. You do not have permission to perform this action." }, { status: 403 });
}


