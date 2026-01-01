import { Notification, ProjectMember, User, Project } from "@/models";
import dbConnect from "@/lib/mongodb";
import { Resend } from 'resend';
import mongoose from 'mongoose';

const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey || resendApiKey === 're_123') {
    console.warn("[NotificationService] RESEND_API_KEY is missing or placeholder. Emails will not be sent.");
}
const resend = new Resend(resendApiKey || 're_123');

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
                    from: 'DeployOps <alerts@resend.dev>', // Assuming this domain is verified or using Resend default
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

/**
 * Sends a project invitation email
 */
export async function sendInviteEmail(email: string, name: string, projectName: string, role: string) {
    try {
        await resend.emails.send({
            from: 'DeployOps <onboarding@resend.dev>',
            to: email,
            subject: `🚀 You've been invited to ${projectName} on DeployOps`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 24px; background: #ffffff;">
                    <div style="margin-bottom: 32px; text-align: center;">
                        <h1 style="color: #0f172a; font-size: 24px; font-weight: 800; margin: 0;">DeployOps</h1>
                    </div>
                    <h2 style="color: #1e293b; font-size: 20px; font-weight: 700; margin-bottom: 16px;">Hello ${name},</h2>
                    <p style="color: #475569; font-size: 16px; line-height: 24px; margin-bottom: 24px;">
                        You have been invited to join the project <strong>${projectName}</strong> as a <strong>${role.toUpperCase()}</strong>.
                    </p>
                    <div style="text-align: center; margin-bottom: 32px;">
                        <a href="${process.env.NEXTAUTH_URL}/projects" style="display: inline-block; padding: 14px 32px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                            Accept Invitation
                        </a>
                    </div>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                    <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">
                        This is an automated message from DeployOps. If you weren't expecting this, you can safely ignore this email.
                    </p>
                </div>
            `
        });
        return true;
    } catch (error) {
        console.error("[NotificationService] Invitation email error:", error);
        return false;
    }
}
