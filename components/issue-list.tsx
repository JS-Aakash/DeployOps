"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { AlertCircle, Loader2, MessageSquare, User, Calendar, CheckCircle2, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface Issue {
    id: number;
    number: number;
    title: string;
    body: string;
    html_url: string;
    user: {
        login: string;
        avatar_url: string;
    };
    created_at: string;
    comments: number;
    labels: Array<{
        name: string;
        color: string;
    }>;
}

interface IssueListProps {
    repo: any;
    onSelect: (issue: Issue) => void;
    selectedIssue: Issue | null;
}

export function IssueList({ repo, onSelect, selectedIssue }: IssueListProps) {
    const { data: session } = useSession();
    const token = (session as any)?.accessToken;

    const { data: issues, isLoading } = useQuery<Issue[]>({
        queryKey: ["issues", repo.full_name],
        enabled: !!repo && !!token,
        queryFn: async () => {
            const res = await fetch(
                `https://api.github.com/repos/${repo.full_name}/issues?state=open&per_page=50`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) throw new Error("Failed to fetch issues");
            const data = await res.json();
            return data.filter((issue: any) => !issue.pull_request);
        }
    });

    return (
        <div className="w-full h-[500px] flex flex-col bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-gray-800 bg-gradient-to-r from-purple-900/20 to-pink-900/20">
                <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-purple-400" />
                    <h2 className="text-lg font-bold text-white">Open Issues</h2>
                </div>
                <p className="text-sm text-gray-400">
                    {repo.full_name} • {issues?.length || 0} open issues
                </p>
            </div>

            {/* Issues List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center text-gray-500">
                        <div className="text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-purple-500" />
                            <p className="text-sm">Loading issues...</p>
                        </div>
                    </div>
                ) : issues?.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center text-gray-500">
                            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
                            <p className="font-medium">No open issues!</p>
                            <p className="text-sm mt-1">This repository is all clear</p>
                        </div>
                    </div>
                ) : (
                    issues?.map(issue => (
                        <button
                            key={issue.id}
                            onClick={() => onSelect(issue)}
                            className={cn(
                                "w-full text-left p-4 rounded-lg transition-all duration-200 group relative border",
                                selectedIssue?.id === issue.id
                                    ? "bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-500/20"
                                    : "bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/60 hover:border-gray-600"
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start gap-2 mb-2">
                                        <span className={cn(
                                            "font-bold text-base flex-shrink-0",
                                            selectedIssue?.id === issue.id ? "text-purple-200" : "text-white"
                                        )}>
                                            #{issue.number}
                                        </span>
                                        <h3 className="font-semibold text-base text-white line-clamp-2 flex-1">
                                            {issue.title}
                                        </h3>
                                    </div>

                                    {issue.body && (
                                        <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                                            {issue.body.substring(0, 150)}...
                                        </p>
                                    )}

                                    {/* Labels */}
                                    {issue.labels.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-3">
                                            {issue.labels.slice(0, 3).map((label, idx) => (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
                                                    style={{
                                                        backgroundColor: `#${label.color}20`,
                                                        borderColor: `#${label.color}40`,
                                                        color: `#${label.color}`
                                                    }}
                                                >
                                                    <Tag className="w-3 h-3" />
                                                    {label.name}
                                                </span>
                                            ))}
                                            {issue.labels.length > 3 && (
                                                <span className="text-xs text-gray-500">
                                                    +{issue.labels.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Metadata */}
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            <span>{issue.user.login}</span>
                                        </div>
                                        <span>•</span>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                                        </div>
                                        {issue.comments > 0 && (
                                            <>
                                                <span>•</span>
                                                <div className="flex items-center gap-1">
                                                    <MessageSquare className="w-3 h-3" />
                                                    <span>{issue.comments}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {selectedIssue?.id === issue.id && (
                                    <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0" />
                                )}
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
