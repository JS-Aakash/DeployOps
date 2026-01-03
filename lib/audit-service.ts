import { AuditLog } from "@/models";
import dbConnect from "./mongodb";

export type ActorType = 'user' | 'ai' | 'system';
export type EntityType = 'project' | 'issue' | 'requirement' | 'pr' | 'deployment' | 'auth';

interface AuditLogOptions {
    actorId?: string;
    actorName: string;
    actorType: ActorType;
    action: string;
    entityType: EntityType;
    entityId: string;
    projectId?: string;
    description: string;
    metadata?: any;
}

/**
 * Reusable utility to record system events for accountability.
 * Design Principle: Fail-safe. Errors in logging should not block the main operation.
 */
export async function logAudit(opts: AuditLogOptions) {
    try {
        await dbConnect();
        await AuditLog.create({
            actorId: opts.actorId,
            actorName: opts.actorName,
            actorType: opts.actorType,
            action: opts.action,
            entityType: opts.entityType,
            entityId: opts.entityId,
            projectId: opts.projectId,
            description: opts.description,
            metadata: opts.metadata
        });
    } catch (error) {
        // We do not want audit logging to ever crash the application flow
        console.error("[AuditLog] Failed to record event:", error);
    }
}

/**
 * Specialized helpers for common events to ensure consistent descriptions
 */
export const AuditEvents = {
    // Auth
    LOGIN: (userName: string, userId: string) => ({
        actorId: userId,
        actorName: userName,
        actorType: 'user' as const,
        action: 'login',
        entityType: 'auth' as const,
        entityId: userId,
        description: `${userName} logged in`
    }),

    // AI Fixer
    AI_FIX_START: (projectId: string, issueId: string, issueTitle: string) => ({
        actorId: 'ai-fixer',
        actorName: 'AI Solver',
        actorType: 'ai' as const,
        action: 'ai_fix_start',
        entityType: 'issue' as const,
        entityId: issueId,
        projectId,
        description: `AI Solver started fixing Issue: ${issueTitle}`
    }),

    AI_PR_CREATED: (projectId: string, issueId: string, prUrl: string) => ({
        actorId: 'ai-fixer',
        actorName: 'AI Solver',
        actorType: 'ai' as const,
        action: 'pr_created',
        entityType: 'pr' as const,
        entityId: prUrl,
        projectId,
        description: `AI Solver created PR for Issue #${issueId}`
    }),

    // Operations
    DEPLOY_TRIGGER: (userName: string, userId: string, projectId: string, projectName: string, provider: string) => ({
        actorId: userId,
        actorName: userName,
        actorType: 'user' as const,
        action: 'deploy_trigger',
        entityType: 'deployment' as const,
        entityId: projectId,
        projectId,
        description: `${userName} triggered deployment for ${projectName} to ${provider}`
    })
};
