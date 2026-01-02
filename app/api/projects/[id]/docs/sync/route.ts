import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import { Project, Documentation, User } from "@/models";
import { callAI } from "@/lib/ai-service";
import { authorize } from "@/lib/auth-utils";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

export const maxDuration = 300;

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

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "docs-sync-"));

    try {
        const project = await Project.findById(id);
        const user = await User.findOne({ email: session.user.email });
        if (!project) throw new Error("Project not found");

        const githubToken = (session as any)?.accessToken || process.env.GITHUB_TOKEN;
        const repoUrl = project.repoUrl;

        // Clone
        const repoMatch = repoUrl.match(/github\.com\/(.+?)\/(.+?)(\.git)?$/);
        const [_, owner, repoName] = repoMatch!;
        const authRepoUrl = `https://${githubToken}@github.com/${owner}/${repoName}.git`;

        execSync(`git clone --depth 1 "${authRepoUrl}" .`, { cwd: tempDir });

        // Read primary files
        const readme = fs.existsSync(path.join(tempDir, "README.md"))
            ? fs.readFileSync(path.join(tempDir, "README.md"), "utf8")
            : "No README found";

        const packageJson = fs.existsSync(path.join(tempDir, "package.json"))
            ? fs.readFileSync(path.join(tempDir, "package.json"), "utf8")
            : "{}";

        // Scan for API routes
        const apiDir = path.join(tempDir, "app", "api");
        let apiFiles = "No API routes found";
        if (fs.existsSync(apiDir)) {
            const getFiles = (dir: string): string[] => {
                let results: string[] = [];
                const list = fs.readdirSync(dir);
                list.forEach(file => {
                    const filePath = path.join(dir, file);
                    const stat = fs.statSync(filePath);
                    if (stat && stat.isDirectory()) results = results.concat(getFiles(filePath));
                    else if (file === 'route.ts' || file === 'route.js') results.push(path.relative(tempDir, filePath));
                });
                return results;
            };
            apiFiles = getFiles(apiDir).join("\n");
        }

        const prompt = `
            You are a technical writer. Based on the following codebase overview, generate three authoritative documentation sections.
            
            1. **System Architecture**: High-level overview of how the app works based on package.json and folder structure.
            2. **API Specification**: A clean list of endpoints found in the app/api directory. Describe what they likely do based on their paths.
            3. **Setup Guide**: Detailed instructions on how to run this project based on README and package.json.

            README Content:
            ${readme.substring(0, 5000)}

            Package JSON:
            ${packageJson}

            API Files Found:
            ${apiFiles}

            Return a RAW JSON object (no markdown formatting) with this structure:
            {
                "architecture": "Markdown content...",
                "api": "Markdown content...",
                "setup": "Markdown content..."
            }
        `;

        const aiResponse = await callAI(prompt, "You generate professional technical documentation.", true);
        if (!aiResponse) throw new Error("AI failed to generate docs");

        const docsData = JSON.parse(aiResponse);

        const syncDoc = async (title: string, category: string, content: string) => {
            await Documentation.findOneAndUpdate(
                { projectId: id, category, title: { $regex: new RegExp(`^${title}`, 'i') } },
                {
                    projectId: id,
                    title,
                    content,
                    category,
                    createdBy: user._id
                },
                { upsert: true, new: true }
            );
        };

        await syncDoc("System Architecture", "architecture", docsData.architecture);
        await syncDoc("API Specification", "api", docsData.api);
        await syncDoc("Initial Setup", "setup", docsData.setup);

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("Docs sync error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}
