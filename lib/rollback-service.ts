import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { Octokit } from '@octokit/rest';

interface RollbackOptions {
    repoUrl: string;
    branchName: string; // 'main' or 'master'
    commitSha: string;
    prNumber: number;
    githubToken: string;
    onLog?: (msg: string) => void;
}

export async function runRollback(opts: RollbackOptions) {
    const { repoUrl, commitSha, prNumber, githubToken, onLog } = opts;
    const log = onLog || console.log;

    const workspaceId = Math.random().toString(36).substring(7);
    const workspaceDir = path.join(os.tmpdir(), `rollback-${workspaceId}`);

    try {
        log(`Creating workspace at ${workspaceDir}`);
        fs.mkdirSync(workspaceDir, { recursive: true });

        // Authenticated URL
        const authRepoUrl = repoUrl.replace('https://', `https://${githubToken}@`);

        const runCmd = (cmd: string) => {
            try {
                execSync(cmd, { cwd: workspaceDir, stdio: 'pipe', encoding: 'utf-8' });
            } catch (e: any) {
                throw new Error(`Command failed: ${cmd}\n${e.stderr || e.message}`);
            }
        };

        // 1. Clone
        log('⬇️ Cloning repository...');
        runCmd(`git clone ${authRepoUrl} .`);
        runCmd(`git config user.name "DeployOps Revert Bot"`);
        runCmd(`git config user.email "bot@deployops.ai"`);

        // 2. Create Revert Branch
        const revertBranch = `revert/pr-${prNumber}-${Date.now()}`;
        log(`🌿 Creating branch ${revertBranch}...`);
        runCmd(`git checkout -b ${revertBranch}`);

        // 3. Revert the commit
        // -m 1 is usually needed if it was a merge commit (reverting to parent 1)
        // We assume most PR merges are merge commits. If it fails, we try without -m 1
        log(`Undo-ing commit ${commitSha}...`);
        try {
            runCmd(`git revert -m 1 ${commitSha} --no-edit`);
        } catch (e) {
            log('Standard revert failed (maybe not a merge commit?), trying plain revert...');
            runCmd(`git revert ${commitSha} --no-edit`);
        }

        // 4. Push
        log('⬆️ Pushing revert branch...');
        runCmd(`git push origin ${revertBranch}`);

        // 5. Open Pull Request
        log('📝 Opening Pull Request...');
        const octokit = new Octokit({ auth: githubToken });

        // Parse owner/repo
        const urlParts = repoUrl.replace('.git', '').split('/');
        const owner = urlParts[urlParts.length - 2];
        const repo = urlParts[urlParts.length - 1];

        const pr = await octokit.pulls.create({
            owner,
            repo,
            title: `revert: rollback PR #${prNumber}`,
            head: revertBranch,
            base: 'main', // Assuming main, ideally should detect default branch
            body: `This PR reverts the changes from PR #${prNumber} (Commit ${commitSha}).\n\nGenerated automatically by DeployOps Safe Rollback System.`
        });

        log(`✅ Revert PR Created: ${pr.data.html_url}`);
        return { success: true, prUrl: pr.data.html_url, prNumber: pr.data.number };

    } catch (e: any) {
        log(`❌ Rollback failed: ${e.message}`);
        throw e;
    } finally {
        // Cleanup (optional, sometimes good to keep for debug in dev)
        try {
            fs.rmSync(workspaceDir, { recursive: true, force: true });
        } catch (e) { /* ignore */ }
    }
}
