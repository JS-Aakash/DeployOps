"use client";

import { useEffect, useState, use } from "react";
import {
    GitCommit,
    GitPullRequest,
    RotateCcw,
    AlertTriangle,
    CheckCircle2,
    ArrowLeft,
    Clock,
    User as UserIcon,
    ShieldAlert,
    ExternalLink,
    Loader2
} from "lucide-react";
import Link from "next/link";
// import { formatDistanceToNow } from 'date-fns'; // Removed

function timeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";

    return Math.floor(seconds) + " seconds ago";
}

interface Version {
    id: number;
    number: number;
    title: string;
    commitSha: string;
    mergedAt: string;
    author: {
        name: string;
        avatar: string;
        isBot: boolean;
    };
    url: string;
}

export default function VersionsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [versions, setVersions] = useState<Version[]>([]);
    const [repoInfo, setRepoInfo] = useState<{ owner: string, repo: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
    const [isRollingBack, setIsRollingBack] = useState(false);
    const [rollbackResult, setRollbackResult] = useState<{ success: boolean; prUrl?: string; prId?: string; error?: string } | null>(null);

    useEffect(() => {
        fetchVersions();
    }, [id]);

    const fetchVersions = async () => {
        try {
            const res = await fetch(`/api/projects/${id}/versions`);
            const data = await res.json();
            if (data.versions) {
                setVersions(data.versions);
                setRepoInfo({ owner: data.owner, repo: data.repo });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRollback = async () => {
        if (!selectedVersion) return;
        setIsRollingBack(true);
        setRollbackResult(null);

        try {
            const res = await fetch(`/api/projects/${id}/rollback`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prNumber: selectedVersion.number,
                    commitSha: selectedVersion.commitSha
                })
            });
            const data = await res.json();

            if (res.ok) {
                const prNum = data.prUrl.match(/\/pull\/(\d+)/)?.[1];
                setRollbackResult({
                    success: true,
                    prUrl: data.prUrl,
                    prId: prNum ? `gh-${id}---${prNum}` : undefined
                });
            } else {
                setRollbackResult({ success: false, error: data.error });
            }
        } catch (e: any) {
            setRollbackResult({ success: false, error: e.message });
        } finally {
            setIsRollingBack(false);
        }
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/projects/${id}`} className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Version History & Rollbacks</h2>
                        <p className="text-gray-400 mt-1">Track deployment versions and safely revert changes via GitHub.</p>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="rounded-3xl border border-gray-800 bg-black/40 overflow-hidden backdrop-blur-md">
                <table className="w-full text-left">
                    <thead className="bg-gray-900/50 border-b border-gray-800">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Version / PR</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Commit SHA</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Merged</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Author</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center">
                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                                    <p className="text-gray-500 mt-2">Fetching history from GitHub...</p>
                                </td>
                            </tr>
                        ) : versions.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    No merged pull requests found.
                                </td>
                            </tr>
                        ) : (
                            versions.map((version) => (
                                <tr key={version.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-start gap-3">
                                            <GitPullRequest className="w-5 h-5 text-purple-400 mt-0.5" />
                                            <div>
                                                <Link
                                                    href={`/monitoring/pull-requests/gh-${id}---${version.number}`}
                                                    className="text-sm font-bold text-white hover:text-blue-400"
                                                >
                                                    {version.title}
                                                </Link>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-gray-500">PR #{version.number}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-xs font-mono text-gray-400 bg-gray-900 border border-gray-800 px-2 py-1 rounded w-fit">
                                            <GitCommit className="w-3 h-3" />
                                            {version.commitSha.substring(0, 7)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                            <Clock className="w-3 h-3" />
                                            {timeAgo(version.mergedAt)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {version.author.avatar ? (
                                                <img src={version.author.avatar} className="w-6 h-6 rounded-full" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
                                                    <UserIcon className="w-3 h-3 text-gray-400" />
                                                </div>
                                            )}
                                            <span className="text-sm text-gray-300">{version.author.name}</span>
                                            {version.author.isBot && (
                                                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">BOT</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setSelectedVersion(version)}
                                            className="px-3 py-1.5 bg-red-900/20 border border-red-900/40 text-red-400 rounded-lg text-xs font-bold hover:bg-red-900/40 transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2 ml-auto"
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                            Rollback
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Rollback Confirmation Modal */}
            {selectedVersion && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-gray-900 border border-red-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                        {/* Background Effect */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 blur-[100px] -z-10" />

                        <div className="flex items-center gap-4 mb-6 text-red-500">
                            <div className="p-3 bg-red-500/10 rounded-full border border-red-500/20">
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-bold">Confirm Rollback</h3>
                        </div>

                        {!rollbackResult ? (
                            <>
                                <div className="space-y-4 text-gray-300">
                                    <p>You are about to revert the version:</p>
                                    <div className="p-4 bg-black/50 rounded-xl border border-gray-800">
                                        <p className="font-bold text-white">PR #{selectedVersion.number}: {selectedVersion.title}</p>
                                        <p className="text-xs text-gray-500 mt-1 font-mono">{selectedVersion.commitSha}</p>
                                    </div>
                                    <div className="text-sm bg-red-900/20 border border-red-900/30 p-4 rounded-xl text-red-200 flex gap-3">
                                        <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                                        <p>
                                            This action creates a <strong>new Pull Request</strong> that reverses the code changes.
                                            It does not delete history. You must merge the new PR manually to complete the rollback.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-8">
                                    <button
                                        onClick={() => setSelectedVersion(null)}
                                        disabled={isRollingBack}
                                        className="flex-1 py-3 bg-gray-800 text-gray-300 rounded-xl font-bold hover:bg-gray-700 transition-all border border-gray-700 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleRollback}
                                        disabled={isRollingBack}
                                        className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isRollingBack ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <RotateCcw className="w-4 h-4" />
                                                Create Revert PR
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center">
                                {rollbackResult.success ? (
                                    <>
                                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                        <h4 className="text-xl font-bold text-white mb-2">Rollback PR Created!</h4>
                                        <p className="text-gray-400 mb-6">A new Pull Request to revert these changes is now available.</p>
                                        <div className="flex gap-3">
                                            {rollbackResult.prId ? (
                                                <Link
                                                    href={`/monitoring/pull-requests/${rollbackResult.prId}`}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all"
                                                >
                                                    Review Rollback PR
                                                </Link>
                                            ) : (
                                                <a
                                                    href={rollbackResult.prUrl}
                                                    target="_blank"
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all"
                                                >
                                                    View PR on GitHub <ExternalLink className="w-4 h-4" />
                                                </a>
                                            )}
                                            <button
                                                onClick={() => { setSelectedVersion(null); fetchVersions(); }}
                                                className="px-6 py-3 bg-gray-800 text-gray-300 rounded-xl font-bold hover:bg-gray-700 transition-all border border-gray-700"
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                                        <h4 className="text-xl font-bold text-white mb-2">Rollback Failed</h4>
                                        <p className="text-red-400 mb-6 bg-red-500/10 p-3 rounded-xl border border-red-500/20 text-sm">
                                            {rollbackResult.error || "Unknown error occurred"}
                                        </p>
                                        <button
                                            onClick={() => setSelectedVersion(null)}
                                            className="w-full py-3 bg-gray-800 text-gray-300 rounded-xl font-bold hover:bg-gray-700 transition-all border border-gray-700"
                                        >
                                            Close
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
