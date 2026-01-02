import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Project } from '@/models';
import dbConnect from '@/lib/mongodb';
import { authorize } from '@/lib/auth-utils';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const execAsync = promisify(exec);

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
    const project = await Project.findById(id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const body = await req.json();
    const { modifiedFiles } = body;

    // Use a persistent directory per project to enable Docker layer caching
    const workspaceId = crypto.createHash('md5').update(id).digest('hex').substring(0, 12);
    const tempDir = path.join(os.tmpdir(), 'deployops-workspaces', workspaceId);
    const sessionId = crypto.randomUUID();
    const encoder = new TextEncoder();

    return new Response(new ReadableStream({
        async start(controller) {
            const send = (data: string) => controller.enqueue(encoder.encode(data));
            const cleanup = async (imageName: string, containerName: string) => {
                try {
                    send(`\n>>> Stopping instance [${containerName}]...\n`);
                    await execAsync(`docker stop ${containerName}`).catch(() => { });
                    // NOTE: We keep the image for caching purposes, but delete old ones if needed
                    console.log(`Cleaned up container for ${sessionId}`);
                } catch (e) {
                    console.error("Cleanup error:", e);
                }
            };

            try {
                // 1. Prepare Workspace (Sync only if changed or first time)
                send(">>> Preparing cached workspace...\n");
                let exists = false;
                try {
                    await fs.access(tempDir);
                    exists = true;
                } catch { }

                const githubToken = (session as any)?.accessToken || process.env.GITHUB_TOKEN;
                const repoUrl = project.repoUrl.replace('https://', `https://${githubToken}@`);

                if (!exists) {
                    send(">>> First time setup: Cloning repository...\n");
                    await fs.mkdir(tempDir, { recursive: true });
                    await execAsync(`git clone ${repoUrl} ${tempDir}`);
                } else {
                    send(">>> Workspace ready (Cache hit). Syncing with GitHub...\n");
                    try {
                        await execAsync(`git fetch origin`, { cwd: tempDir });
                        // Prefer main, fallback to master
                        try {
                            await execAsync(`git reset --hard origin/main`, { cwd: tempDir });
                        } catch {
                            await execAsync(`git reset --hard origin/master`, { cwd: tempDir });
                        }
                    } catch (e: any) {
                        send(`>>> Warning: Sync failed (${e.message}). Proceeding with cached state...\n`);
                    }
                }

                // 2. Validate & Modify
                const dockerfilePath = path.join(tempDir, 'Dockerfile');
                try {
                    await fs.access(dockerfilePath);
                } catch {
                    send("\n[ERROR] Dockerfile not found in repository root.\n");
                    controller.close();
                    return;
                }

                if (modifiedFiles && Array.isArray(modifiedFiles)) {
                    send(`>>> Applying ${modifiedFiles.length} local modifications...\n`);
                    for (const file of modifiedFiles) {
                        const fullPath = path.join(tempDir, file.path);
                        if (!fullPath.startsWith(tempDir)) continue;
                        await fs.writeFile(fullPath, file.content);
                    }
                }

                // 3. Build Docker Image (Streaming)
                const imageName = `deployops-run-${sessionId.split('-')[0].toLowerCase()}`;
                send(`\n>>> Starting Docker Build [${imageName}]...\n`);

                const buildProcess = spawn('docker', ['build', '-t', imageName, tempDir]);

                buildProcess.stdout.on('data', (data) => send(data.toString()));
                buildProcess.stderr.on('data', (data) => send(data.toString()));

                const buildExitCode = await new Promise<number>((resolve) => {
                    buildProcess.on('close', resolve);
                });

                if (buildExitCode !== 0) {
                    send(`\n[BUILD FAILED] Build process exited with code ${buildExitCode}\n`);
                    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });
                    controller.close();
                    return;
                }

                // 4. Run Container
                const dockerfileContent = await fs.readFile(dockerfilePath, 'utf-8');
                const exposeMatch = dockerfileContent.match(/EXPOSE\s+(\d+)/i);
                const targetPort = exposeMatch ? exposeMatch[1] : null;
                const containerName = `container-${sessionId}`;
                const hostPort = targetPort ? Math.floor(Math.random() * (60000 - 10000) + 10000) : null;

                send(`\n>>> Launching Container [${containerName}]...\n`);
                if (hostPort) {
                    send(`>>> Exposed Port: ${targetPort} mapped to ${hostPort}\n`);
                }

                const runProcess = spawn('docker', [
                    'run', '--rm',
                    '--name', containerName,
                    '--memory', '512m',
                    '--cpus', '1',
                    ...(hostPort ? ['-p', `${hostPort}:${targetPort}`] : []),
                    imageName
                ]);

                let isTerminated = false;
                const executionTimeout = setTimeout(async () => {
                    if (isTerminated) return;
                    isTerminated = true;
                    send(`\n\n[DeployOps] Session limit reached (10m). Terminating...\n`);
                    runProcess.kill();
                    await cleanup(imageName, containerName);
                    controller.close();
                }, 600000); // Increased to 10 minutes since manual stop is now available

                if (hostPort) {
                    // Send preview URL update signal
                    send(`\n[PREVIEW_URL] http://localhost:${hostPort}\n`);
                }

                runProcess.stdout.on('data', (data) => send(data.toString()));
                runProcess.stderr.on('data', (data) => send(data.toString()));

                runProcess.on('close', async (code) => {
                    if (isTerminated) return;
                    isTerminated = true;
                    clearTimeout(executionTimeout);
                    send(`\n\n[DeployOps] Instance terminated (Code ${code})\n`);
                    await cleanup(imageName, containerName);
                    controller.close();
                });

                runProcess.on('error', async (err) => {
                    if (isTerminated) return;
                    isTerminated = true;
                    clearTimeout(executionTimeout);
                    send(`\n\n[DeployOps] Runtime Error: ${err.message}\n`);
                    await cleanup(imageName, containerName);
                    controller.close();
                });

            } catch (error: any) {
                send(`\n\n[SYSTEM ERROR] ${error.message}\n`);
                await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });
                controller.close();
            }
        }
    }), {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
    });
}
