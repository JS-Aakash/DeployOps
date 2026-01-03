"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import {
    GitPullRequest,
    CheckCircle2,
    X,
    Loader2,
    ArrowLeft,
    AlertCircle,
    Info,
    FileCode,
    Sparkles,
    Shield,
    Clock,
    User,
    ChevronDown,
    ChevronRight,
    Split,
    LayoutList,
} from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface PRDetails {
    pr: {
        number: number;
        title: string;
        body: string;
        state: string;
        merged: boolean;
        mergeable: boolean;
        mergeable_state: string;
        html_url: string;
        user: {
            login: string;
            avatar_url: string;
        };
        created_at: string;
        base: string;
        head: string;
    };
    files: {
        filename: string;
        status: string;
        additions: number;
        deletions: number;
        patch: string;
        raw_url: string;
    }[];
    project: {
        id: string;
        name: string;
        owner: string;
        repo: string;
    };
    aiContext?: {
        explanation: string;
        title: string;
    };
    auditLogs: any[];
}

export default function PRDetailsPage({ params }: { params: Promise<{ prId: string }> }) {
    const { prId } = use(params);
    const { data: session } = useSession();
    const [data, setData] = useState<PRDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"overview" | "files" | "ai-logs">("overview");
    const [isMerging, setIsMerging] = useState(false);
    const [mergeMethod, setMergeMethod] = useState<"squash" | "merge" | "rebase">("squash");
    const [viewMode, setViewMode] = useState<"split" | "unified">("split");

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/monitoring/pull-requests/${prId}`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to fetch PR details");
            }
            const json = await res.json();
            setData(json);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [prId]);

    const handleMerge = async () => {
        if (!data) return;
        setIsMerging(true);
        try {
            const res = await fetch(`/api/monitoring/pull-requests/${prId}/merge`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mergeMethod })
            });
            const result = await res.json();
            if (res.ok) {
                alert("Merged Successfully!");
                fetchData();
            } else {
                alert(result.error || "Merge failed");
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsMerging(false);
        }
    };

    const isAdmin = (session?.user as any)?.role === 'admin' || (session?.user as any)?.role === 'lead';

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-400 font-mono animate-pulse uppercase tracking-widest text-xs">Analyzing Code Changes...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-8 max-w-4xl mx-auto text-center space-y-6">
                <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-tighter">PR Fetch Failed</h2>
                    <p className="text-gray-400">{error || "Could not load pull request data."}</p>
                </div>
                <Link href="/projects" className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 border border-gray-800 text-white rounded-xl hover:bg-gray-800 transition-all">
                    <ArrowLeft className="w-4 h-4" /> Return to Projects
                </Link>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Navigation & Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4">
                    <Link
                        href={`/projects/${data.project.id}/pull-requests`}
                        className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-blue-400 transition-colors uppercase tracking-widest"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Review List
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                            <GitPullRequest className="w-8 h-8 text-blue-500" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-4xl font-black text-white tracking-tighter uppercase whitespace-pre-wrap">
                                    PR #{data.pr.number}: {data.pr.title}
                                </h1>
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase border",
                                    data.pr.merged ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                        data.pr.state === 'open' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                                            "bg-red-500/10 text-red-400 border-red-500/20"
                                )}>
                                    {data.pr.merged ? "Merged" : data.pr.state}
                                </span>
                            </div>
                            <p className="text-gray-500 mt-2 flex items-center gap-2 font-medium">
                                <User className="w-4 h-4" />
                                <span className="text-blue-400">{data.pr.user.login}</span>
                                <span>wants to merge into</span>
                                <span className="px-2 py-0.5 bg-gray-800 rounded font-mono text-xs text-gray-300">{data.pr.base}</span>
                                <span>from</span>
                                <span className="px-2 py-0.5 bg-gray-800 rounded font-mono text-xs text-gray-300">{data.pr.head}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {isAdmin && !data.pr.merged && data.pr.state === 'open' && (
                    <div className="flex items-center gap-3 p-4 bg-gray-900/50 border border-gray-800 rounded-3xl animate-in slide-in-from-right-8 duration-700">
                        <select
                            value={mergeMethod}
                            onChange={(e) => setMergeMethod(e.target.value as any)}
                            className="bg-black/50 border border-gray-700 text-xs text-white px-4 py-2 rounded-xl focus:outline-none focus:border-blue-500"
                        >
                            <option value="squash">Squash and merge</option>
                            <option value="merge">Create a merge commit</option>
                            <option value="rebase">Rebase and merge</option>
                        </select>
                        <button
                            onClick={handleMerge}
                            disabled={isMerging || !data.pr.mergeable}
                            className={cn(
                                "flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                                data.pr.mergeable
                                    ? "bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-500/20"
                                    : "bg-gray-800 text-gray-500 cursor-not-allowed"
                            )}
                        >
                            {isMerging ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {isMerging ? "Merging..." : "Confirm Merge"}
                        </button>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-gray-900/50 p-1.5 rounded-2xl w-fit border border-gray-800">
                <button
                    onClick={() => setActiveTab("overview")}
                    className={cn(
                        "px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                        activeTab === 'overview'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-gray-500 hover:text-gray-300'
                    )}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab("files")}
                    className={cn(
                        "px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2",
                        activeTab === 'files'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-gray-500 hover:text-gray-300'
                    )}
                >
                    Files Changed
                    <span className="px-1.5 py-0.5 bg-black/30 rounded text-[8px]">{data.files.length}</span>
                </button>
                <button
                    onClick={() => setActiveTab("ai-logs")}
                    className={cn(
                        "px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                        activeTab === 'ai-logs'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-gray-500 hover:text-gray-300'
                    )}
                >
                    AI Fix Logs
                </button>
            </div>

            {/* Tab content */}
            <div className="min-h-[500px]">
                {activeTab === "overview" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="lg:col-span-2 space-y-8">
                            {/* PR Description */}
                            <div className="bg-gray-900/30 border border-gray-800 rounded-3xl p-8 backdrop-blur-md">
                                <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight flex items-center gap-2">
                                    <Info className="w-5 h-5 text-blue-400" />
                                    Description
                                </h3>
                                <div className="prose prose-invert max-w-none text-gray-300 font-medium">
                                    {data.pr.body ? (
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {data.pr.body}
                                        </ReactMarkdown>
                                    ) : (
                                        "No description provided."
                                    )}
                                </div>
                            </div>

                            {/* Files Summary */}
                            <div className="bg-gray-900/30 border border-gray-800 rounded-3xl p-8 backdrop-blur-md">
                                <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Impact Surface</h3>
                                <div className="space-y-3">
                                    {data.files.map((file, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-black/20 border border-gray-800 rounded-2xl hover:border-gray-700 transition-all">
                                            <div className="flex items-center gap-3">
                                                <FileCode className="w-5 h-5 text-gray-500" />
                                                <span className="text-sm font-mono text-gray-300">{file.filename}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-green-500">+{file.additions}</span>
                                                <span className="text-xs font-bold text-red-500">-{file.deletions}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            {/* AI Context Card */}
                            {data.aiContext && (
                                <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-3xl p-8 space-y-6 backdrop-blur-md relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <Sparkles className="w-24 h-24 text-blue-400" />
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-black text-blue-400 uppercase tracking-widest">
                                        <Shield className="w-4 h-4" />
                                        AI Agent Explanation
                                    </div>
                                    <p className="text-gray-300 text-sm leading-relaxed font-medium italic">
                                        "{data.aiContext.explanation}"
                                    </p>
                                    <div className="pt-4 border-t border-blue-500/10">
                                        <p className="text-[10px] text-gray-500 uppercase font-black">Linked Context</p>
                                        <p className="text-white text-sm font-bold mt-1">{data.aiContext.title}</p>
                                    </div>
                                </div>
                            )}

                            {/* Merge Status Card */}
                            <div className="bg-gray-900/30 border border-gray-800 rounded-3xl p-8 space-y-6">
                                <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">Mergeability Status</h4>
                                {!data.pr.merged ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl">
                                            <span className="text-sm text-gray-400">Conflicts</span>
                                            {data.pr.mergeable ? (
                                                <span className="text-xs font-bold text-green-500 flex items-center gap-1">
                                                    <CheckCircle2 className="w-4 h-4" /> None
                                                </span>
                                            ) : (
                                                <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                                                    <X className="w-4 h-4" /> High Risk
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl">
                                            <span className="text-sm text-gray-400">State</span>
                                            <span className="text-xs font-bold text-blue-400 uppercase">{data.pr.mergeable_state}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center space-y-3">
                                        <CheckCircle2 className="w-12 h-12 text-purple-500 mx-auto" />
                                        <p className="text-white font-bold uppercase tracking-tight">Code Successfully Integrated</p>
                                        <p className="text-xs text-gray-500">This pull request is closed and merged into the primary production branch.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "files" && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Diff Controls */}
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white uppercase tracking-tighter">Files Changed</h3>
                            <div className="flex items-center gap-2 bg-gray-900/50 p-1 rounded-xl border border-gray-800">
                                <button
                                    onClick={() => setViewMode("split")}
                                    className={cn("p-2 rounded-lg transition-all", viewMode === "split" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-white")}
                                >
                                    <Split className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode("unified")}
                                    className={cn("p-2 rounded-lg transition-all", viewMode === "unified" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-white")}
                                >
                                    <LayoutList className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Diff Viewer Component List */}
                        <div className="space-y-8">
                            {data.files.map((file, i) => (
                                <DiffViewer key={i} file={file} mode={viewMode} />
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === "ai-logs" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-gray-900/30 border border-gray-800 rounded-3xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 border-b border-gray-800">
                                    <tr>
                                        <th className="p-5 text-xs font-black text-gray-500 uppercase tracking-widest">Event</th>
                                        <th className="p-5 text-xs font-black text-gray-500 uppercase tracking-widest">Actor</th>
                                        <th className="p-5 text-xs font-black text-gray-500 uppercase tracking-widest">Timestamp</th>
                                        <th className="p-5 text-xs font-black text-gray-500 uppercase tracking-widest">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/50 text-sm">
                                    {data.auditLogs.map((log, i) => (
                                        <tr key={i} className="hover:bg-white/5 transition-colors group italic">
                                            <td className="p-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400">
                                                        {log.actorType === 'ai' ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                                    </div>
                                                    <span className="text-gray-300 font-medium">{log.description}</span>
                                                </div>
                                            </td>
                                            <td className="p-5 text-blue-400 font-bold">{log.actorName}</td>
                                            <td className="p-5 text-gray-500 font-mono text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                                            <td className="p-5 whitespace-nowrap">
                                                <span className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-[10px] text-gray-400 uppercase font-black tracking-tighter">
                                                    {log.action.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {data.auditLogs.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-20 text-center text-gray-600 font-mono uppercase tracking-widest text-xs">
                                                Zero relevant events found for this code revision.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function DiffViewer({ file, mode }: { file: any, mode: "split" | "unified" }) {
    const [isExpanded, setIsExpanded] = useState(true);

    if (!file.patch) {
        return (
            <div className="border border-gray-800 bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
                <div className="bg-gray-800 p-4 border-b border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileCode className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-black text-white font-mono uppercase tracking-tighter">{file.filename}</span>
                        <span className="text-[10px] text-gray-500 uppercase font-black bg-black/30 px-2 py-0.5 rounded italic">Binary or Empty File</span>
                    </div>
                </div>
            </div>
        );
    }

    const lines = file.patch.split("\n");

    return (
        <div className="border border-gray-800 bg-gray-900/40 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
            <div
                className="bg-gray-800/80 p-5 border-b border-gray-800 flex items-center justify-between cursor-pointer hover:bg-gray-800 transition-all"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                    <FileCode className="w-5 h-5 text-blue-400" />
                    <span className="text-sm font-black text-white font-mono tracking-tight">{file.filename}</span>
                    <span className={cn(
                        "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border font-sans",
                        file.status === 'modified' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                            file.status === 'added' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                                "bg-red-500/10 text-red-500 border-red-500/20"
                    )}>
                        {file.status}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 font-mono text-xs">
                        <span className="text-green-500 font-bold">+{file.additions}</span>
                        <span className="text-red-500 font-bold">-{file.deletions}</span>
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="overflow-x-auto">
                    <div className="min-w-full font-mono text-[12px] leading-6 py-2">
                        {mode === "unified" ? (
                            lines.map((line: string, idx: number) => {
                                let type = "neutral";
                                if (line.startsWith("+")) type = "add";
                                if (line.startsWith("-")) type = "sub";
                                if (line.startsWith("@@")) type = "info";

                                return (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "flex gap-4 px-6 whitespace-pre border-l-4",
                                            type === 'add' ? "bg-green-500/10 border-green-500/50 text-green-300" :
                                                type === 'sub' ? "bg-red-500/10 border-red-500/50 text-red-300" :
                                                    type === 'info' ? "bg-gray-800/50 border-gray-500/20 text-gray-500 italic py-2 mt-2" :
                                                        "border-transparent text-gray-400"
                                        )}
                                    >
                                        <span className="w-8 shrink-0 text-right opacity-30 select-none">{idx + 1}</span>
                                        <span>{line}</span>
                                    </div>
                                );
                            })
                        ) : (
                            <SplitDiff lines={lines} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function SplitDiff({ lines }: { lines: string[] }) {
    // Basic attempt at a split view from a patch. 
    // This is hard to do perfectly without raw files, but we can separate +/- for visual representation.
    const left: any[] = [];
    const right: any[] = [];

    lines.forEach((line) => {
        if (line.startsWith("@@")) {
            left.push({ type: 'info', content: line });
            right.push({ type: 'info', content: line });
        } else if (line.startsWith("-")) {
            left.push({ type: 'sub', content: line });
        } else if (line.startsWith("+")) {
            right.push({ type: 'add', content: line });
        } else {
            // Unchanged: try to align by keeping them in both or padding
            left.push({ type: 'neutral', content: line });
            right.push({ type: 'neutral', content: line });
        }
    });

    const maxLines = Math.max(left.length, right.length);
    const alignedRows: any[] = [];

    // Simplistic alignment for mock
    let lIdx = 0;
    let rIdx = 0;
    while (lIdx < left.length || rIdx < right.length) {
        const l = left[lIdx];
        const r = right[rIdx];

        if (l?.type === 'info') {
            alignedRows.push({ left: l, right: r });
            lIdx++; rIdx++;
        } else if (l?.type === 'sub' && r?.type !== 'add') {
            alignedRows.push({ left: l, right: null });
            lIdx++;
        } else if (r?.type === 'add' && l?.type !== 'sub') {
            alignedRows.push({ left: null, right: r });
            rIdx++;
        } else {
            alignedRows.push({ left: l, right: r });
            lIdx++; rIdx++;
        }
    }

    return (
        <div className="grid grid-cols-2 divide-x divide-gray-800 border-t border-gray-800">
            <div className="bg-black/20">
                <div className="px-4 py-2 bg-gray-900/50 border-b border-gray-800 text-[10px] font-black uppercase text-gray-500 tracking-widest">Previous</div>
                {alignedRows.map((row, i) => (
                    <div key={i} className={cn(
                        "px-4 whitespace-pre h-6 flex gap-3",
                        row.left?.type === 'sub' ? "bg-red-500/10 text-red-400" : row.left?.type === 'info' ? "bg-gray-800/30 text-gray-600" : "text-gray-500 opacity-50"
                    )}>
                        <span className="w-6 shrink-0 text-right opacity-20 select-none text-[8px]">{i + 1}</span>
                        <span className="truncate">{row.left?.content || ""}</span>
                    </div>
                ))}
            </div>
            <div className="bg-black/10">
                <div className="px-4 py-2 bg-gray-900/50 border-b border-gray-800 text-[10px] font-black uppercase text-gray-500 tracking-widest">Modified</div>
                {alignedRows.map((row, i) => (
                    <div key={i} className={cn(
                        "px-4 whitespace-pre h-6 flex gap-3",
                        row.right?.type === 'add' ? "bg-green-500/10 text-green-400 font-bold" : row.right?.type === 'info' ? "bg-gray-800/30 text-gray-600" : "text-gray-300"
                    )}>
                        <span className="w-6 shrink-0 text-right opacity-20 select-none text-[8px]">{i + 1}</span>
                        <span className="truncate">{row.right?.content || ""}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
