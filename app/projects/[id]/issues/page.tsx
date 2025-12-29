"use client";

import { useEffect, useState, use } from "react";
import {
    AlertCircle,
    Plus,
    X,
    Loader2,
    ArrowLeft,
    Zap,
    CheckCircle2,
    Clock,
    Bug,
    Sparkles,
    ExternalLink,
    GitPullRequest,
    RefreshCcw,
    Github,
    FileText
} from "lucide-react";
import Link from "next/link";

type IssueType = 'bug' | 'feature' | 'improvement';
type IssueStatus = 'open' | 'ai_running' | 'pr_created' | 'closed';

interface Requirement {
    _id: string;
    title: string;
}

interface Issue {
    _id: string;
    projectId: string;
    requirementId?: string;
    title: string;
    description: string;
    type: IssueType;
    status: IssueStatus;
    assignedTo: string;
    prUrl?: string;
    createdAt: string;
}

export default function ProjectIssuesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [issues, setIssues] = useState<Issue[]>([]);
    const [requirements, setRequirements] = useState<Requirement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fixingIssueId, setFixingIssueId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        type: "bug" as IssueType,
        assignedTo: "ai",
        requirementId: ""
    });

    const fetchRequirements = async () => {
        try {
            const res = await fetch(`/api/projects/${id}/requirements`);
            const data = await res.json();
            if (Array.isArray(data)) {
                // Only show approved ones for linking
                setRequirements(data.filter(r => r.status === 'approved' || r.status === 'draft'));
            }
        } catch (e) { }
    };

    const fetchIssues = async () => {
        try {
            setError(null);
            const res = await fetch(`/api/projects/${id}/issues`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setIssues(data);
            } else if (data.error) {
                setError(data.error);
                setIssues([]);
            } else {
                setIssues([]);
            }
        } catch (e: any) {
            console.error(e);
            setError(e.message);
            setIssues([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRunAI = async (issueId: string) => {
        setFixingIssueId(issueId);
        try {
            const res = await fetch(`/api/issues/${issueId}/run-ai`, {
                method: "POST"
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "AI Fix failed");

            // Reload issues to reflect status change and PR URL
            fetchIssues();
            alert("AI Fix Completed! Pull Request created successfully.");
        } catch (e: any) {
            alert("Error running AI Fix: " + e.message);
            fetchIssues(); // Refresh to reset status to open
        } finally {
            setFixingIssueId(null);
        }
    };

    useEffect(() => {
        fetchIssues();
        fetchRequirements();
    }, [id]);

    const handleSyncGitHub = async () => {
        setIsSyncing(true);
        try {
            const res = await fetch(`/api/projects/${id}/sync-github`, {
                method: "POST"
            });
            const data = await res.json();
            if (res.ok) {
                fetchIssues();
                alert(data.message);
            } else {
                alert(data.error);
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/projects/${id}/issues`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setIsModalOpen(false);
                setFormData({ title: "", description: "", type: "bug", assignedTo: "ai", requirementId: "" });
                fetchIssues();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to create issue");
            }
        } catch (e: any) {
            console.error(e);
            alert(e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status: IssueStatus) => {
        switch (status) {
            case 'open':
                return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase border border-blue-500/20"><Clock className="w-3 h-3" /> Open</span>;
            case 'ai_running':
                return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-[10px] font-bold uppercase border border-yellow-500/20 animate-pulse"><Loader2 className="w-3 h-3 animate-spin" /> AI Running</span>;
            case 'pr_created':
                return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase border border-purple-500/20"><GitPullRequest className="w-3 h-3" /> PR Created</span>;
            case 'closed':
                return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold uppercase border border-green-500/20"><CheckCircle2 className="w-3 h-3" /> Closed</span>;
        }
    };

    const getTypeIcon = (type: IssueType) => {
        switch (type) {
            case 'bug': return <Bug className="w-4 h-4 text-red-500" />;
            case 'feature': return <Plus className="w-4 h-4 text-green-500" />;
            case 'improvement': return <Zap className="w-4 h-4 text-blue-500" />;
        }
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
                        <h2 className="text-3xl font-bold text-white tracking-tight">Project Issues</h2>
                        <p className="text-gray-400 mt-1">Track bugs, features, and AI-powered fixes.</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={handleSyncGitHub}
                        disabled={isSyncing}
                        className="flex items-center gap-2 px-6 py-3.5 bg-gray-800 text-gray-300 rounded-2xl font-bold hover:bg-gray-700 transition-all border border-gray-700 disabled:opacity-50"
                    >
                        <RefreshCcw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                        Sync GitHub Issues
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20"
                    >
                        <Plus className="w-5 h-5" />
                        New Issue
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Issues List */}
            <div className="rounded-3xl border border-gray-800 bg-black/40 overflow-hidden backdrop-blur-md">
                <table className="w-full text-left">
                    <thead className="bg-gray-900/50 border-b border-gray-800">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Issue</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Assigned</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {isLoading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center">
                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                                </td>
                            </tr>
                        ) : issues.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic">
                                    No issues found for this project.
                                </td>
                            </tr>
                        ) : (
                            issues.map((issue) => (
                                <tr key={issue._id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-6">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 p-2 bg-gray-900 border border-gray-800 rounded-lg">
                                                {getTypeIcon(issue.type)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-white font-bold group-hover:text-blue-400 transition-colors uppercase tracking-tight">{issue.title}</h4>
                                                    {issue.requirementId && (
                                                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-800 text-[9px] text-gray-400 font-bold border border-gray-700">
                                                            <FileText className="w-2.5 h-2.5" />
                                                            REQ LINKED
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500 mt-1 line-clamp-1">{issue.description || "No description provided."}</p>
                                                <p className="text-[10px] text-gray-600 font-mono mt-2">{new Date(issue.createdAt).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        {getStatusBadge(issue.status)}
                                        {issue.prUrl && (
                                            <Link
                                                href={issue.prUrl}
                                                target="_blank"
                                                className="flex items-center gap-1 text-[10px] text-purple-400 mt-2 hover:underline"
                                            >
                                                <ExternalLink className="w-3 h-3" /> View PR
                                            </Link>
                                        )}
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="flex items-center gap-2">
                                            {issue.assignedTo === 'ai' ? (
                                                <>
                                                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                                        <Sparkles className="w-4 h-4 text-blue-500" />
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-300">AI Agent</span>
                                                </>
                                            ) : (
                                                <span className="text-xs text-gray-400">User: {issue.assignedTo}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-right">
                                        {issue.status === 'open' && (
                                            <button
                                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 ml-auto hover:shadow-lg hover:shadow-blue-500/20 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-100 disabled:cursor-not-allowed"
                                                disabled={fixingIssueId === issue._id}
                                                onClick={() => handleRunAI(issue._id)}
                                            >
                                                {fixingIssueId === issue._id ? (
                                                    <>
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        Processing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Zap className="w-3.5 h-3.5" />
                                                        Run AI Fix
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* New Issue Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-xl bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl relative">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-6 right-6 text-gray-400 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <h3 className="text-2xl font-bold text-white mb-6">Create New Issue</h3>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Issue Title</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. Fix race condition in auth flow"
                                    className="w-full px-5 py-4 bg-black/50 border border-gray-800 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-white font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as IssueType })}
                                        className="w-full px-5 py-4 bg-black/50 border border-gray-800 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-gray-300 font-medium"
                                    >
                                        <option value="bug">🐛 Bug</option>
                                        <option value="feature">✨ Feature</option>
                                        <option value="improvement">⚡ Improvement</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Assignee</label>
                                    <select
                                        value={formData.assignedTo}
                                        onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                                        className="w-full px-5 py-4 bg-black/50 border border-gray-800 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-gray-300 font-medium"
                                    >
                                        <option value="ai">🤖 AI Agent</option>
                                        <option value="manual">👤 Manual Developer</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Linked Requirement (Optional)</label>
                                <select
                                    value={formData.requirementId}
                                    onChange={(e) => setFormData({ ...formData, requirementId: e.target.value })}
                                    className="w-full px-5 py-4 bg-black/50 border border-gray-800 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-gray-300 font-medium"
                                >
                                    <option value="">None (Standalone Issue)</option>
                                    {requirements.map(req => (
                                        <option key={req._id} value={req._id}>{req.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Detailed Description</label>
                                <textarea
                                    rows={4}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe the issue or the feature requirement..."
                                    className="w-full px-5 py-4 bg-black/50 border border-gray-800 rounded-2xl focus:outline-none focus:border-blue-500 transition-all resize-none text-white font-medium"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 text-lg"
                            >
                                {isSubmitting ? "Creating..." : "Generate Issue"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
