"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Plus,
    Github,
    Folder,
    ArrowRight,
    X,
    Loader2,
    ExternalLink,
    AlertCircle
} from "lucide-react";

export default function ProjectsPage() {
    const [projects, setProjects] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        repoUrl: ""
    });

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setIsModalOpen(false);
                setFormData({ name: "", description: "", repoUrl: "" });
                fetchProjects();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to create project");
            }
        } catch (e: any) {
            console.error(e);
            alert(e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-white">Project Portfolio</h2>
                    <p className="text-gray-400 mt-1">Manage and track your software development projects.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20"
                >
                    <Plus className="w-5 h-5" />
                    Create New Project
                </button>
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
                    <p className="text-gray-400">No projects found. Create your first one!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <div key={project._id} className="group p-6 rounded-3xl border border-gray-800 bg-gray-900/20 hover:border-gray-700 transition-all flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                        <Github className="w-6 h-6 text-blue-500" />
                                    </div>
                                    <Link
                                        href={project.repoUrl}
                                        target="_blank"
                                        className="text-gray-500 hover:text-white"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </Link>
                                </div>
                                <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                                    {project.name}
                                </h3>
                                <p className="text-sm text-gray-400 mt-2 line-clamp-2 italic">
                                    {project.description || "No description provided."}
                                </p>
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-800 flex items-center justify-between">
                                <span className="text-xs text-gray-500 font-mono">
                                    {project.owner}/{project.repo}
                                </span>
                                <Link
                                    href={`/projects/${project._id}`}
                                    className="p-2 rounded-lg bg-gray-800 hover:bg-blue-500/10 hover:text-blue-400 transition-all"
                                >
                                    <ArrowRight className="w-5 h-5" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Project Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl relative">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-6 right-6 text-gray-400 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <h3 className="text-2xl font-bold text-white mb-6">Create Project</h3>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Project Name</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Finance Core System"
                                    className="w-full px-4 py-3 bg-black/50 border border-gray-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Description</label>
                                <textarea
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="What is this project about?"
                                    className="w-full px-4 py-3 bg-black/50 border border-gray-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all resize-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">GitHub Repository URL</label>
                                <input
                                    required
                                    type="url"
                                    value={formData.repoUrl}
                                    onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })}
                                    placeholder="https://github.com/owner/repo"
                                    className="w-full px-4 py-3 bg-black/50 border border-gray-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                            >
                                {isSubmitting ? "Creating..." : "Launch Project"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
