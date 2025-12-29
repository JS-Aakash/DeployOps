import { Notification, ProjectMember, User, Project } from "@/models";
import dbConnect from "@/lib/mongodb";
import { Resend } from 'resend';
import mongoose from 'mongoose';

const resend = new Resend(process.env.RESEND_API_KEY || 're_123'); // Default for avoids crashes if key missing

export type NotificationType = 'pr_created' | 'pr_merged' | 'task_assigned' | 'ops_incident' | 'conflict';

interface NotificationPayload {
    projectId?: string;
    type: NotificationType;
    message: string;
    link?: string;
    isCritical?: boolean;
}

/**
 * Creates a notification for a specific user
 */
export async function createNotification(userId: string, payload: NotificationPayload) {
    await dbConnect();

    const { projectId, type, message, link, isCritical = false } = payload;

    const notification = await Notification.create({
        userId: new mongoose.Types.ObjectId(userId),
        projectId: projectId ? new mongoose.Types.ObjectId(projectId) : undefined,
        type,
        message,
        link,
        isCritical
    });

    // If critical, trigger email via Resend
    if (isCritical) {
        try {
            const user = await User.findById(userId);
            const project = projectId ? await Project.findById(projectId) : null;

            if (user?.email) {
                await resend.emails.send({
                    from: 'DeployOps <alerts@jsaakash.com>', // Assuming this domain is verified or using Resend default
                    to: user.email,
                    subject: `🚨 Critical Alert: ${project?.name || 'DeployOps'}`,
                    html: `
                        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #d32f2f;">Critical Event Detected</h2>
                            <p><strong>Project:</strong> ${project?.name || 'Global'}</p>
                            <p><strong>Event:</strong> ${message}</p>
                            ${link ? `<a href="${process.env.NEXTAUTH_URL}${link}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 5px; margin-top: 10px;">View Incident</a>` : ''}
                            <hr style="margin: 20px 0; border: 0; border-top: 1px solid #eee;" />
                            <p style="font-size: 12px; color: #666;">This is an automated production alert from DeployOps Monitoring.</p>
                        </div>
                    `
                });
            }
        } catch (error) {
            console.error("[NotificationService] Email error:", error);
        }
    }

    return notification;
}

/**
 * Notifies all admins and leads of a project
 */
export async function notifyProjectAdmins(projectId: string, payload: Omit<NotificationPayload, 'projectId'>) {
    await dbConnect();
    const members = await ProjectMember.find({
        projectId: new mongoose.Types.ObjectId(projectId),
        role: { $in: ['admin', 'lead'] }
    });

    const notifications = await Promise.all(members.map(member =>
        createNotification(member.userId.toString(), { ...payload, projectId })
    ));

    return notifications;
}

/**
 * Notifies all members of a project
 */
export async function notifyAllProjectMembers(projectId: string, payload: Omit<NotificationPayload, 'projectId'>) {
    await dbConnect();
    const members = await ProjectMember.find({
        projectId: new mongoose.Types.ObjectId(projectId)
    });

    const notifications = await Promise.all(members.map(member =>
        createNotification(member.userId.toString(), { ...payload, projectId })
    ));

    return notifications;
}
