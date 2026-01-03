"use client";

import { useEffect, useState } from "react";
import {
    Activity,
    Search,
    Filter,
    ArrowUpRight,
    ShieldCheck,
    AlertTriangle,
    Zap,
    Loader2,
    ShieldAlert,
    Github
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function GlobalMonitoringPage() {
    const [projects, setProjects] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchProjects = async () => {
        try {
            // First get all projects
            const res = await fetch("/api/projects");
            const data = await res.json();

            // For each project, fetch its monitoring status with no-cache to prevent leakage
            const projectsWithStatus = await Promise.all(data.map(async (project: any) => {
                const statusRes = await fetch(`/api/projects/${project._id}/monitoring`, { cache: 'no-store' });
                const statusData = await statusRes.json();
                return { ...project, monitoring: statusData };
            }));

            setProjects(projectsWithStatus);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <p className="text-gray-400 font-medium">Scanning Infrastructure...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div>
                <h1 className="text-4xl font-black text-white tracking-widest uppercase italic">DeployOps Command</h1>
                <p className="text-gray-400 mt-2 font-medium flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    Centralized health dashboard for all connected workloads
                </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-6 rounded-3xl bg-gray-900/50 border border-gray-800">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-1">Total Assets</p>
                    <p className="text-3xl font-black text-white">{projects.length}</p>
                </div>
                <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20">
                    <p className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-[0.2em] mb-1">Healthy</p>
                    <p className="text-3xl font-black text-emerald-400">{projects.filter(p => p.monitoring?.status === 'healthy' && p.monitoring?.isConfigured).length}</p>
                </div>
                <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/20">
                    <p className="text-[10px] font-bold text-amber-500/60 uppercase tracking-[0.2em] mb-1">Unconfigured</p>
                    <p className="text-3xl font-black text-amber-400">{projects.filter(p => !p.monitoring?.isConfigured).length}</p>
                </div>
                <div className="p-6 rounded-3xl bg-red-500/5 border border-red-500/20">
                    <p className="text-[10px] font-bold text-red-500/60 uppercase tracking-[0.2em] mb-1">Critical</p>
                    <p className="text-3xl font-black text-red-400">{projects.filter(p => p.monitoring?.status === 'critical').length}</p>
                </div>
            </div>

            {/* Filter Bar & Activity Toggle */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Filter projects by identifier..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-gray-900 border border-gray-800 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-white font-medium"
                    />
                </div>
                <Link
                    href="/"
                    className="flex items-center gap-2 px-6 py-4 bg-gray-900 border border-gray-800 rounded-2xl text-gray-400 hover:text-white transition-all font-bold"
                >
                    <Activity className="w-5 h-5" />
                    Activity Logs
                </Link>
            </div>

            {/* Recent PR Activity */}
            <div className="p-8 rounded-[2rem] bg-gradient-to-br from-blue-900/10 to-transparent border border-gray-800">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Github className="w-6 h-6 text-blue-500" />
                        Active Code Changes
                    </h3>
                    <span className="text-xs text-blue-400 font-bold px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                        LIVE FEED
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.flatMap(p => p.monitoring?.recentPrs || []).slice(0, 3).map((pr: any) => (
                        <Link
                            key={pr._id}
                            href={`/monitoring/pull-requests/${pr._id}`}
                            className="p-4 rounded-2xl bg-black/40 border border-gray-800 hover:border-blue-500/50 transition-all group"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
                                    <Github className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors uppercase">{pr.title}</h4>
                                    <p className="text-[10px] text-gray-500 mt-1 uppercase font-mono tracking-tighter">Status: {pr.status}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                    {projects.every(p => !p.monitoring?.recentPrs?.length) && (
                        <div className="col-span-full py-8 text-center text-gray-600 italic text-sm">
                            No active code changes detected in monitored projects.
                        </div>
                    )}
                </div>
            </div>

            {/* Projects Health Grid */}
            {filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredProjects.map((project) => {
                        const status = project.monitoring?.status || 'healthy';
                        const isConfigured = project.monitoring?.isConfigured;
                        return (
                            <div
                                key={project._id}
                                className="group p-1 rounded-[2rem] bg-gradient-to-br from-gray-800 to-gray-900 hover:from-blue-600/20 hover:to-purple-600/20 transition-all duration-500"
                            >
                                <div className="p-7 bg-black/40 rounded-[1.9rem] h-full flex flex-col backdrop-blur-md">
                                    <div className="flex items-start justify-between mb-6">
                                        <div>
                                            <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{project.name}</h3>
                                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                <Zap className="w-3 h-3" />
                                                {project.owner}/{project.repo}
                                            </p>
                                        </div>
                                        <div className={cn(
                                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                                            !isConfigured ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                                                status === 'healthy' ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                                                    status === 'degraded' ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                                                        "text-red-400 bg-red-500/10 border-red-500/20"
                                        )}>
                                            {!isConfigured ? "Setup Required" : status}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-auto">
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase">Errors</p>
                                            <p className="text-xl font-black text-white">
                                                {isConfigured ? (project.monitoring?.metrics?.errorRate * 100 || 0).toFixed(2) : "--"}%
                                            </p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase">Uptime</p>
                                            <p className="text-xl font-black text-white">
                                                {isConfigured ? (project.monitoring?.metrics?.uptime || 100).toFixed(1) : "--"}%
                                            </p>
                                        </div>
                                    </div>

                                    <Link
                                        href={`/projects/${project._id}/monitoring`}
                                        className={cn(
                                            "mt-6 flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-sm font-bold transition-all border",
                                            !isConfigured
                                                ? "bg-blue-600 text-white border-blue-500 hover:bg-blue-500 shadow-lg shadow-blue-500/20"
                                                : "bg-gray-900 text-white border-gray-800 hover:bg-white hover:text-black"
                                        )}
                                    >
                                        {!isConfigured ? "Setup Monitoring" : "Inspect Infrastructure"}
                                        <ArrowUpRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="py-20 text-center space-y-6 bg-gray-900/20 rounded-[3rem] border border-dashed border-gray-800">
                    <div className="w-20 h-20 bg-gray-800/50 rounded-[2rem] flex items-center justify-center mx-auto">
                        <Activity className="w-10 h-10 text-gray-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">No Projects Found</h3>
                        <p className="text-gray-500 max-w-xs mx-auto mt-2">Projects added in the Portfolio will appear here for monitoring configuration.</p>
                        <Link href="/projects" className="inline-block mt-6 text-blue-500 font-bold hover:underline">
                            Go to Portfolio →
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
