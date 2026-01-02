"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Play,
    Github,
    Folder,
    ArrowRight,
    Loader2,
    ExternalLink,
    AlertCircle,
    Zap,
    Code2,
    MonitorPlay
} from "lucide-react";

export default function CodeEditorPortalPage() {
    const [projects, setProjects] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProjects = async () => {
        try {
            setError(null);
            const res = await fetch("/api/projects");
            const data = await res.json();
            if (Array.isArray(data)) {
                setProjects(data);
            } else if (data.error) {
                setError(data.error);
                setProjects([]);
            } else {
                setProjects([]);
            }
        } catch (e: any) {
            console.error(e);
            setError(e.message);
            setProjects([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        Code Editor Center
                        <Code2 className="w-8 h-8 text-blue-500" />
                    </h2>
                    <p className="text-gray-400 mt-1">Select a project to enter the high-performance live editing environment.</p>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            ) : projects.length === 0 ? (
                <div className="p-12 text-center rounded-3xl border border-dashed border-gray-800 bg-gray-900/10">
                    <Folder className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-400">No projects found. Add a project to start using the editor.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <Link
                            key={project._id}
                            href={`/editor/${project._id}`}
                            className="group p-6 rounded-3xl border border-gray-800 bg-gray-900/20 hover:border-blue-500/50 hover:bg-blue-500/[0.02] transition-all flex flex-col items-start relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MonitorPlay className="w-6 h-6 text-blue-500 animate-pulse" />
                            </div>

                            <div className="w-12 h-12 rounded-2xl bg-gray-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Github className="w-6 h-6 text-gray-400 group-hover:text-blue-400" />
                            </div>

                            <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                                {project.name}
                            </h3>
                            <p className="text-sm text-gray-500 mt-2 line-clamp-2 italic mb-6">
                                {project.description || "Deploy with real-time editing and sandboxed execution."}
                            </p>

                            <div className="mt-auto w-full pt-6 border-t border-gray-800 flex items-center justify-between text-xs font-mono text-gray-600">
                                <span>{project.owner}/{project.repo}</span>
                                <div className="flex items-center gap-1 text-blue-500 font-bold group-hover:translate-x-1 transition-transform uppercase">
                                    Open Workspace <ArrowRight className="w-3 h-3" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
