"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
    Clock,
    User,
    Bot,
    Settings,
    FileText,
    GitPullRequest,
    Zap,
    ChevronLeft,
    ChevronRight,
    Filter,
    Shield,
    Database,
    Tag,
    AlertCircle,
    ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface AuditLogEntry {
    _id: string;
    actorId: string;
    actorName: string;
    actorType: 'user' | 'ai' | 'system';
    action: string;
    entityType: 'project' | 'issue' | 'requirement' | 'pr' | 'deployment' | 'auth';
    entityId: string;
    projectId: {
        _id: string;
        name: string;
    } | null;
    description: string;
    createdAt: string;
}

export default function AuditLogsPage() {
    const { data: session } = useSession();
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        actorType: '',
        entityType: '',
    });

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '15',
                ...(filters.actorType && { actorType: filters.actorType }),
                ...(filters.entityType && { entityType: filters.entityType }),
            });
            const res = await fetch(`/api/admin/audit-logs?${params}`);
            if (!res.ok) {
                if (res.status === 403) throw new Error("Access Denied: Admin role required.");
                throw new Error("Failed to fetch audit logs");
            }
            const data = await res.json();
            setLogs(data.logs);
            setTotalPages(data.pagination.pages);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, filters]);

    const getActorIcon = (type: string) => {
        switch (type) {
            case 'user': return <User className="w-4 h-4 text-blue-400" />;
            case 'ai': return <Bot className="w-4 h-4 text-purple-400" />;
            case 'system': return <Settings className="w-4 h-4 text-gray-400" />;
            default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
        }
    };

    const getEntityIcon = (type: string) => {
        switch (type) {
            case 'project': return <Database className="w-4 h-4 text-blue-500" />;
            case 'issue': return <AlertCircle className="w-4 h-4 text-red-400" />;
            case 'requirement': return <FileText className="w-4 h-4 text-amber-400" />;
            case 'pr': return <GitPullRequest className="w-4 h-4 text-green-400" />;
            case 'deployment': return <Zap className="w-4 h-4 text-orange-400" />;
            case 'auth': return <Shield className="w-4 h-4 text-indigo-400" />;
            default: return <Tag className="w-4 h-4 text-gray-400" />;
        }
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Access Control Violation</h1>
                <p className="text-gray-400 max-w-md">{error}</p>
                <Link href="/" className="mt-8 px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all">
                    Return to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
                            <Shield className="w-10 h-10 text-blue-500" />
                            AUDIT LOGS
                        </h1>
                        <p className="text-gray-500 mt-1 font-medium italic">Enterprise-grade immutable activity ledger.</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 px-3 py-2 rounded-xl">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            className="bg-transparent text-sm text-gray-300 focus:outline-none"
                            value={filters.actorType}
                            onChange={(e) => setFilters({ ...filters, actorType: e.target.value })}
                        >
                            <option value="">All Actors</option>
                            <option value="user">Users</option>
                            <option value="ai">AI Agent</option>
                            <option value="system">System</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 px-3 py-2 rounded-xl">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            className="bg-transparent text-sm text-gray-300 focus:outline-none"
                            value={filters.entityType}
                            onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
                        >
                            <option value="">All Entities</option>
                            <option value="auth">Auth</option>
                            <option value="project">Projects</option>
                            <option value="issue">Issues</option>
                            <option value="requirement">Requirements</option>
                            <option value="deployment">Deployments</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Audit Table */}
            <div className="overflow-hidden bg-gray-900/40 border border-gray-800 rounded-3xl backdrop-blur-sm">
                <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 border-b border-gray-800">
                                <th className="p-5 text-xs font-black text-gray-500 uppercase tracking-widest">Timestamp</th>
                                <th className="p-5 text-xs font-black text-gray-500 uppercase tracking-widest">Actor</th>
                                <th className="p-5 text-xs font-black text-gray-500 uppercase tracking-widest">Entity</th>
                                <th className="p-5 text-xs font-black text-gray-500 uppercase tracking-widest">Action</th>
                                <th className="p-5 text-xs font-black text-gray-500 uppercase tracking-widest">Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="p-8">
                                            <div className="h-4 bg-gray-800 rounded-full w-full opacity-20" />
                                        </td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center text-gray-600">
                                        <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <p className="font-medium">No logs found for the selected filters.</p>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log._id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-5">
                                            <div className="flex flex-col">
                                                <span className="text-gray-300 text-sm font-bold">
                                                    {new Date(log.createdAt).toLocaleTimeString()}
                                                </span>
                                                <span className="text-[10px] text-gray-600 uppercase font-black">
                                                    {new Date(log.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-gray-700 transition-colors">
                                                    {getActorIcon(log.actorType)}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-white text-sm font-bold truncate">{log.actorName}</span>
                                                    <span className="text-[10px] text-gray-600 uppercase tracking-tighter">{log.actorType}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-gray-700 transition-colors">
                                                    {getEntityIcon(log.entityType)}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-gray-400 text-xs font-bold uppercase tracking-tight">{log.entityType}</span>
                                                    {log.projectId && (
                                                        <span className="text-[10px] text-blue-500/80 font-mono truncate">{log.projectId.name}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <span className="px-2 py-1 bg-gray-800 text-gray-400 rounded-md text-[10px] font-black uppercase tracking-widest border border-gray-700/50 group-hover:border-gray-600 transition-all">
                                                {log.action.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="p-5">
                                            <p className="text-gray-300 text-sm leading-relaxed max-w-md">
                                                {log.description}
                                            </p>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-5 bg-white/5 border-t border-gray-800 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                        Showing Page <span className="font-bold text-white">{page}</span> of <span className="font-bold text-white">{totalPages}</span>
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            className="p-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(page + 1)}
                            className="p-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-3xl border border-blue-500/20 bg-blue-500/5">
                    <div className="flex items-center gap-3 mb-4">
                        <Shield className="w-5 h-5 text-blue-500" />
                        <h4 className="text-sm font-bold text-white">Compliance Standard</h4>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                        These logs meet SOC2 Type I standards for system observability. All entries are cryptographically linked to their respective actors.
                    </p>
                </div>
                <div className="p-6 rounded-3xl border border-purple-500/20 bg-purple-500/5">
                    <div className="flex items-center gap-3 mb-4">
                        <Bot className="w-5 h-5 text-purple-500" />
                        <h4 className="text-sm font-bold text-white">AI Accountability</h4>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                        Every autonomous action taken by the AI solver is recorded. Developers can trace PR creation back to the original LLM prompt.
                    </p>
                </div>
                <div className="p-6 rounded-3xl border border-green-500/20 bg-green-500/5">
                    <div className="flex items-center gap-3 mb-4">
                        <Zap className="w-5 h-5 text-green-500" />
                        <h4 className="text-sm font-bold text-white">Real-time Ingestion</h4>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                        Logs are ingested into the immutable ledger within 100ms of the event occurrence, ensuring zero-latency monitoring.
                    </p>
                </div>
            </div>
        </div>
    );
}
