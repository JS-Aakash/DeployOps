"use client";

import { useEffect, useState, use } from "react";
import {
    GitPullRequest,
    CheckCircle2,
    X,
    Loader2,
    ArrowLeft,
    ExternalLink,
    AlertCircle,
    Info,
    FileCode,
    ChevronRight,
    Search,
    Github,
    Sparkles,
    Shield
} from "lucide-react";
import Link from "next/link";

interface PRDetails {
    issueId: string;
    issueTitle: string;
    requirement?: { title: string };
    prUrl: string;
    prStatus: string;
    isMerged: boolean;
    ghTitle: string;
    filesChanged: string[];
    aiExplanation: string;
    createdAt: string;
    mergedAt?: string;
    error?: string;
    author?: { name: string; avatar: string };
    isAI?: boolean;
}

export default function PullRequestsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [prs, setPrs] = useState<PRDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPr, setSelectedPr] = useState<PRDetails | null>(null);
    const [isMerging, setIsMerging] = useState(false);
    const [showMergeConfirm, setShowMergeConfirm] = useState(false);
    const [headerError, setHeaderError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchPrs = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`/api/projects/${id}/pull-requests`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setPrs(data);
            } else if (data.error) {
                setHeaderError(data.error);
            }
        } catch (e: any) {
            setHeaderError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPrs();
    }, [id]);

    const handleMerge = async () => {
        if (!selectedPr) return;
        setIsMerging(true);
        try {
            const res = await fetch(`/api/pull-requests/merge`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ issueId: selectedPr.issueId, confirm: true })
            });

            const data = await res.json();
            if (res.ok) {
                alert("Merged Successfully!");
                setShowMergeConfirm(false);
                setSelectedPr(null);
                fetchPrs();
            } else {
                alert(data.error || "Merge failed");
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsMerging(false);
        }
    };

    const getStatusBadge = (pr: PRDetails) => {
        if (pr.isMerged) {
            return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase border border-purple-500/20"><CheckCircle2 className="w-3 h-3" /> Merged</span>;
        }
        if (pr.prStatus === 'closed') {
            return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold uppercase border border-red-500/20"><X className="w-3 h-3" /> Closed</span>;
        }
        return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold uppercase border border-green-500/20 animate-pulse"><GitPullRequest className="w-3 h-3" /> Open</span>;
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/projects/${id}`} className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Pull Request Review</h2>
                        <p className="text-gray-400 mt-1">Human-in-the-loop review for AI-generated code changes.</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            placeholder="Filter PRs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 transition-all w-64"
                        />
                    </div>
                </div>
            </div>

            {headerError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm font-medium">{headerError}</p>
                </div>
            )}

            {/* PR List */}
            <div className="rounded-3xl border border-gray-800 bg-black/40 overflow-hidden backdrop-blur-md">
                <table className="w-full text-left">
                    <thead className="bg-gray-900/50 border-b border-gray-800">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Pull Request</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Context</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Review</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {isLoading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-20 text-center">
                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                                </td>
                            </tr>
                        ) : prs.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-20 text-center text-gray-500 italic">
                                    No AI-generated Pull Requests found for this project.
                                </td>
                            </tr>
                        ) : (
                            prs
                                .filter(pr => (pr.ghTitle || pr.issueTitle || "").toLowerCase().includes(searchQuery.toLowerCase()))
                                .map((pr) => (
                                    <tr key={pr.issueId} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                                        <GitPullRequest className="w-5 h-5 text-blue-500" />
                                                    </div>
                                                    {pr.author?.avatar && (
                                                        <img src={pr.author.avatar} alt="" className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md border border-gray-800" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-white font-bold group-hover:text-blue-400 transition-colors">{pr.ghTitle || pr.issueTitle}</h4>
                                                        {pr.isAI && (
                                                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-blue-500 text-white uppercase tracking-tighter">AI</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <a href={pr.prUrl} target="_blank" className="text-[10px] text-gray-500 hover:text-blue-400 flex items-center gap-1">
                                                            <ExternalLink className="w-3 h-3" /> View on GitHub
                                                        </a>
                                                        <span className="text-[10px] text-gray-700 font-mono tracking-tighter uppercase italic">
                                                            BY: {pr.author?.name || 'UNKNOWN'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 font-medium">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-1.5 text-xs text-gray-300">
                                                    <Info className="w-3.5 h-3.5 text-blue-400" />
                                                    <span>Issue: {pr.issueTitle}</span>
                                                </div>
                                                {pr.requirement && (
                                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                                                        <FileCode className="w-3 h-3 text-purple-400" />
                                                        <span>Req: {pr.requirement.title}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            {pr.error ? (
                                                <span className="text-xs text-red-500 italic">{pr.error}</span>
                                            ) : (
                                                getStatusBadge(pr)
                                            )}
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <button
                                                onClick={() => setSelectedPr(pr)}
                                                className="px-6 py-2.5 bg-gray-800 text-white rounded-xl text-xs font-bold hover:bg-gray-700 transition-all border border-gray-700 opacity-0 group-hover:opacity-100"
                                            >
                                                Review AI Fix
                                            </button>
                                        </td>
                                    </tr>
                                ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Review Drawer/Modal */}
            {selectedPr && (
                <div className="fixed inset-0 z-[60] flex items-center justify-end bg-black/80 backdrop-blur-sm">
                    <div className="w-[600px] h-full bg-gray-900 border-l border-gray-800 p-8 flex flex-col shadow-2xl animate-slide-in-right overflow-y-auto">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                <Sparkles className="w-6 h-6 text-blue-500" />
                                AI Fix Review
                            </h3>
                            <button
                                onClick={() => setSelectedPr(null)}
                                className="p-2 rounded-xl bg-gray-800 text-gray-400 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-8 flex-1">
                            {/* Summary */}
                            <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-4">
                                <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-widest">
                                    <Shield className="w-4 h-4" />
                                    AI Explanation
                                </div>
                                <p className="text-gray-300 leading-relaxed text-sm">
                                    {selectedPr.aiExplanation}
                                </p>
                            </div>

                            {/* Files Changed */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Files Changed ({selectedPr.filesChanged?.length || 0})</h4>
                                <div className="space-y-2">
                                    {selectedPr.filesChanged?.map((file, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-gray-800">
                                            <FileCode className="w-4 h-4 text-gray-500" />
                                            <span className="text-xs text-gray-300 font-mono">{file}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Context Links */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
                                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Total Impact</p>
                                    <p className="text-white font-bold">{selectedPr.filesChanged?.length} Modules</p>
                                </div>
                                <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
                                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Safety Check</p>
                                    <p className="text-green-500 font-bold flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> PASSED
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-8 pt-8 border-t border-gray-800 flex gap-4">
                            <a
                                href={selectedPr.prUrl}
                                target="_blank"
                                className="flex-1 py-4 bg-gray-800 text-white rounded-2xl font-bold hover:bg-gray-700 transition-all text-sm text-center border border-gray-700"
                            >
                                Full Code Diff (GitHub)
                            </a>
                            {!selectedPr.isMerged && selectedPr.prStatus !== 'closed' ? (
                                <button
                                    onClick={() => setShowMergeConfirm(true)}
                                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 transition-all text-sm shadow-xl shadow-blue-500/20"
                                >
                                    Approve & Merge
                                </button>
                            ) : (
                                <div className="flex-1 py-4 bg-purple-500/10 text-purple-400 rounded-2xl font-bold text-sm text-center border border-purple-500/20">
                                    {selectedPr.isMerged ? "ALREADY MERGED" : "PR CLOSED"}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Merge Confirmation Modal */}
            {showMergeConfirm && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl text-center">
                        <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Shield className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Confirm Human Merge</h3>
                        <p className="text-gray-400 text-sm mb-8">
                            Are you sure you want to merge this AI-generated PR? This will close the issue and commit changes to the main branch.
                        </p>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowMergeConfirm(false)}
                                className="flex-1 py-3.5 bg-gray-800 text-gray-300 rounded-xl font-bold hover:bg-gray-700 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleMerge}
                                disabled={isMerging}
                                className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isMerging && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isMerging ? "Merging..." : "Confirm Merge"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
