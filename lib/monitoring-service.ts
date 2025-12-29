import { Project, Issue, Monitoring } from '@/models';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import { notifyProjectAdmins } from './notification-service';

export interface VercelMetrics {
    status: 'healthy' | 'degraded' | 'critical';
    errorRate: number;
    latency: number;
    failureCount: number;
}

export async function checkProjectHealth(projectId: string, projectData?: any) {
    await dbConnect();

    // 1. Fetch Metrics from available provider
    const metrics = await fetchProviderMetrics(projectId, projectData);

    // 2. Update Monitoring Record
    let monitoring = await Monitoring.findOne({ projectId: new mongoose.Types.ObjectId(projectId) });
    if (!monitoring) {
        monitoring = new Monitoring({ projectId: new mongoose.Types.ObjectId(projectId) });
    }

    const previousStatus = monitoring.status;
    monitoring.status = metrics.status;
    monitoring.metrics = {
        errorRate: metrics.errorRate,
        latency: metrics.latency,
        failureCount: metrics.failureCount,
        uptime: 100 - (metrics.errorRate * 100)
    };
    monitoring.lastChecked = new Date();

    // 3. Threshold Evaluation & Auto-Healing Trigger
    if (metrics.status === 'critical' && previousStatus !== 'critical') {
        await handleCriticalIncident(projectId, metrics, monitoring);
    }

    await monitoring.save();
    return monitoring;
}

async function fetchProviderMetrics(projectId: string, projectData?: any): Promise<VercelMetrics> {
    const project = projectData || await Project.findById(projectId).lean();
    if (!project) throw new Error("Project not found");

    if (project.vercelProjectId && project.vercelToken) {
        return fetchVercelMetrics(projectId, project);
    } else if (project.netlifySiteId && project.netlifyToken) {
        return fetchNetlifyMetrics(projectId, project);
    }

    throw new Error("Project not configured for production monitoring");
}

async function fetchNetlifyMetrics(projectId: string, projectData: any): Promise<VercelMetrics> {
    try {
        const response = await fetch(
            `https://api.netlify.com/api/v1/sites/${projectData.netlifySiteId}/deploys?per_page=5`,
            {
                headers: {
                    Authorization: `Bearer ${projectData.netlifyToken}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Netlify API error: ${response.statusText}`);
        }

        const deploys = await response.json();

        // Netlify states: error, ready, enqueued, building, processing, uploading, preprocessing
        const failedDeploys = deploys.filter((d: any) => d.state === 'error');

        let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
        let errorRate = 0;

        if (deploys.length > 0) {
            errorRate = failedDeploys.length / deploys.length;
            if (errorRate > 0.4) status = 'critical';
            else if (errorRate > 0) status = 'degraded';
        }

        return {
            status,
            errorRate,
            latency: 0,
            failureCount: failedDeploys.length
        };
    } catch (e) {
        console.error("[DeployOps] Netlify Fetch Error:", e);
        throw e;
    }
}

async function fetchVercelMetrics(projectId: string, projectData?: any): Promise<VercelMetrics> {
    const project = projectData || await Project.findById(projectId).lean();

    if (!project || !project.vercelProjectId || !project.vercelToken) {
        console.error(`[fetchVercelMetrics] Configuration missing for ${projectId}. PID: ${project?.vercelProjectId}`);
        throw new Error("Project not configured for Vercel monitoring");
    }

    try {
        // Fetch recent deployments from Vercel
        const response = await fetch(
            `https://api.vercel.com/v6/deployments?projectId=${project.vercelProjectId}&limit=5`,
            {
                headers: {
                    Authorization: `Bearer ${project.vercelToken}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Vercel API error: ${response.statusText}`);
        }

        const data = await response.json();
        const deployments = data.deployments || [];

        // Real-time evaluation: check the state of the last 5 deployments
        const failedDeployments = deployments.filter((d: any) =>
            d.state === 'ERROR' || d.readyState === 'ERROR' || d.readyState === 'FAILED'
        );

        let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
        let errorRate = 0;

        if (deployments.length > 0) {
            errorRate = failedDeployments.length / deployments.length;
            if (errorRate > 0.4) status = 'critical';
            else if (errorRate > 0) status = 'degraded';
        }

        return {
            status,
            errorRate,
            latency: 0, // Vercel Deployments API does not provide runtime latency
            failureCount: failedDeployments.length
        };
    } catch (e) {
        console.error("[DeployOps] Vercel Error:", e);
        throw e;
    }
}

async function handleCriticalIncident(projectId: string, metrics: VercelMetrics, monitoring: any) {
    const project = await Project.findById(projectId);
    if (!project) return;

    // 1. Create a Critical Issue with logs
    const issueTitle = `🚨 CRITICAL: Production Failure Detected (${(metrics.errorRate * 100).toFixed(1)}% Error Rate)`;
    const issueDescription = `
## Incident Report
- **Project**: ${project.name}
- **Timestamp**: ${new Date().toISOString()}
- **Error Rate**: ${(metrics.errorRate * 100).toFixed(1)}%
- **Failure Count**: ${metrics.failureCount}
- **Latency**: ${metrics.latency}ms

**Status**: [PENDING_REVIEW]
This issue was automatically created by DeployOps Monitoring due to a production failure.
Please review the deployment logs for more details.
    `;

    const issue = await Issue.create({
        projectId: projectId,
        title: issueTitle,
        description: issueDescription,
        type: 'bug',
        priority: 'critical',
        status: 'open',
        assignedTo: null
    });

    // Store in monitoring record
    monitoring.lastIncident = {
        timestamp: new Date(),
        description: `Threshold Breach: ${(metrics.errorRate * 100).toFixed(1)}% errors`,
        issueId: issue._id
    };

    // Trigger Smart Notification for all project admins/leads
    await notifyProjectAdmins(projectId, {
        type: 'ops_incident',
        message: `🚨 Critical failure on ${project.name}: ${(metrics.errorRate * 100).toFixed(1)}% error rate.`,
        link: `/projects/${projectId}/monitoring`,
        isCritical: true // Only critical events trigger email
    });

    console.log(`[DeployOps] Critical incident logged and admins notified.`);
}
