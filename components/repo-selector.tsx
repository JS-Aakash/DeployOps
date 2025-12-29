"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { GitFork, Loader2, Search, Star, Lock, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Repo {
    id: number;
    name: string;
    full_name: string;
    description: string;
    private: boolean;
    updated_at: string;
    stargazers_count: number;
    html_url: string;
}

interface RepoSelectorProps {
    onSelect: (repo: Repo) => void;
    selectedRepo: Repo | null;
}

export function RepoSelector({ onSelect, selectedRepo }: RepoSelectorProps) {
    const { data: session } = useSession();
    const token = (session as any)?.accessToken;
    const [search, setSearch] = useState("");

    const { data: repos, isLoading } = useQuery<Repo[]>({
        queryKey: ["repos"],
        enabled: !!token,
        queryFn: async () => {
            const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch repos");
            return res.json();
        }
    });

    const filteredRepos = repos?.filter(repo =>
        repo.full_name.toLowerCase().includes(search.toLowerCase()) ||
        repo.description?.toLowerCase().includes(search.toLowerCase())
    ) || [];

    return (
        <div className="w-full h-[500px] flex flex-col bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-gray-800 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
                <div className="flex items-center gap-2 mb-3">
                    <GitFork className="w-5 h-5 text-blue-400" />
                    <h2 className="text-lg font-bold text-white">Select Repository</h2>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search repositories..."
                        className="w-full bg-black/50 border border-gray-700 text-gray-200 rounded-lg pl-11 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-gray-600"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center text-gray-500">
                        <div className="text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
                            <p className="text-sm">Loading repositories...</p>
                        </div>
                    </div>
                ) : filteredRepos.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center text-gray-500">
                            <GitFork className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p className="text-sm">No repositories found</p>
                        </div>
                    </div>
                ) : (
                    filteredRepos.map(repo => (
                        <button
                            key={repo.id}
                            onClick={() => onSelect(repo)}
                            className={cn(
                                "w-full text-left p-4 rounded-lg transition-all duration-200 group relative border",
                                selectedRepo?.id === repo.id
                                    ? "bg-blue-600/20 border-blue-500/50 shadow-lg shadow-blue-500/20"
                                    : "bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/60 hover:border-gray-600"
                            )}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={cn(
                                            "font-bold text-base truncate",
                                            selectedRepo?.id === repo.id ? "text-blue-200" : "text-white"
                                        )}>
                                            {repo.full_name}
                                        </span>
                                        {repo.private && (
                                            <Lock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                                        )}
                                    </div>
                                    {repo.description && (
                                        <p className="text-sm text-gray-400 line-clamp-1 mb-2">
                                            {repo.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <Star className="w-3 h-3" />
                                            <span>{repo.stargazers_count}</span>
                                        </div>
                                        <span>•</span>
                                        <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                {selectedRepo?.id === repo.id && (
                                    <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                                )}
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
