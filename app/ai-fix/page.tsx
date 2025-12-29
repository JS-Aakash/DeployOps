"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { RepoSelector } from "@/components/repo-selector";
import { IssueList } from "@/components/issue-list";
import { LiveLogs } from "@/components/live-logs";
import { Github, LogOut, Sparkles, Zap, Code, GitBranch, Rabbit } from "lucide-react";

export default function AiFixPage() {
    const { data: session, status } = useSession();
    const [selectedRepo, setSelectedRepo] = useState<any>(null);
    const [selectedIssue, setSelectedIssue] = useState<any>(null);
    const [jobId, setJobId] = useState<string | null>(null);
    const [isFixing, setIsFixing] = useState(false);
    const [customApiKey, setCustomApiKey] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [autofixConfig, setAutofixConfig] = useState<any>(null);

    const openFixDialog = () => {
        if (!selectedIssue || !selectedRepo) return;
        setIsDialogOpen(true);
    };

    const confirmFix = async () => {
        setIsDialogOpen(false);
        setIsFixing(true);

        const config = {
            issueUrl: selectedIssue.html_url,
            repoUrl: selectedRepo.html_url,
            githubToken: (session as any)?.accessToken || '',
            openaiKey: customApiKey
        };

        setAutofixConfig(config);
        setJobId("direct"); // Switch view
        setIsFixing(false);
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-400">Loading Module...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <Sparkles className="w-16 h-16 text-blue-500 mb-4 animate-pulse" />
                <h2 className="text-2xl font-bold text-white mb-2">Login Required</h2>
                <p className="text-gray-400 mb-6">You need to be signed in to access the AI Fixer.</p>
                <button onClick={() => signIn("github")} className="px-6 py-3 bg-blue-600 rounded-xl font-bold text-white">Sign in with GitHub</button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {!jobId ? (
                <div className="space-y-8">
                    {/* Step indicator */}
                    <div className="flex items-center justify-center gap-4 mb-8">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${selectedRepo ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-blue-500/20 border-blue-500/50 text-blue-400'} border`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${selectedRepo ? 'bg-green-500' : 'bg-blue-500'}`}>
                                1
                            </div>
                            <span className="text-sm font-medium">Select Repository</span>
                        </div>
                        <div className="w-12 h-0.5 bg-gray-700"></div>
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${selectedIssue ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-500'} border`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${selectedIssue ? 'bg-green-500' : 'bg-gray-700'}`}>
                                2
                            </div>
                            <span className="text-sm font-medium">Choose Issue</span>
                        </div>
                        <div className="w-12 h-0.5 bg-gray-700"></div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800 border border-gray-700 text-gray-500">
                            <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold">
                                3
                            </div>
                            <span className="text-sm font-medium">Fix Issue</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Repository Selection */}
                        <div className="space-y-4">
                            <RepoSelector
                                onSelect={setSelectedRepo}
                                selectedRepo={selectedRepo}
                            />
                            {selectedRepo && (
                                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                                    ✓ Selected: <strong>{selectedRepo.full_name}</strong>
                                </div>
                            )}
                        </div>

                        {/* Issue Selection */}
                        <div className="space-y-4">
                            {selectedRepo ? (
                                <>
                                    <IssueList
                                        repo={selectedRepo}
                                        onSelect={setSelectedIssue}
                                        selectedIssue={selectedIssue}
                                    />
                                    {selectedIssue && (
                                        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                                            ✓ Selected: <strong>#{selectedIssue.number} - {selectedIssue.title}</strong>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="h-[400px] flex items-center justify-center bg-gray-900 border border-gray-800 rounded-xl">
                                    <p className="text-gray-500">Select a repository first</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Button */}
                    {selectedIssue && (
                        <div className="mt-8">
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                {/* CodeRabbit Integration */}
                                <a
                                    href="https://github.com/apps/coderabbitai"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex flex-col items-center justify-center gap-1 px-8 py-4 bg-[#FF5700]/10 hover:bg-[#FF5700]/20 border border-[#FF5700]/30 rounded-xl transition-all h-[72px] min-w-[200px]"
                                >
                                    <div className="flex items-center gap-2 text-[#FF5700]">
                                        <Rabbit className="w-5 h-5" />
                                        <span className="font-bold">Enable AI Reviews</span>
                                    </div>
                                    <span className="text-[10px] text-gray-400 group-hover:text-[#FF5700]/80">
                                        Partner Integration
                                    </span>
                                </a>

                                {/* Main Action Button */}
                                <button
                                    onClick={openFixDialog}
                                    disabled={isFixing}
                                    className="group relative px-12 py-5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-bold text-white shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 h-[72px]"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-xl opacity-0 group-hover:opacity-100 blur transition-opacity"></div>
                                    <div className="relative flex items-center gap-3">
                                        {isFixing ? (
                                            <>
                                                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span className="text-lg">Starting AI Fix...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="w-6 h-6" />
                                                <span className="text-lg">Auto-Fix Issue with AI</span>
                                            </>
                                        )}
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Config Dialog */}
                    {isDialogOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6">
                                <h3 className="text-xl font-bold text-white mb-2">Start AI Autofix</h3>
                                <p className="text-gray-400 text-sm mb-6">
                                    Ready to fix issue <strong>#{selectedIssue?.number}</strong>. You can optionally provide your own AI API key to prioritize your quota.
                                </p>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-300">Custom API Key (Optional)</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Code className="h-4 w-4 text-gray-500" />
                                            </div>
                                            <input
                                                type="password"
                                                name="custom-api-key"
                                                autoComplete="new-password"
                                                data-lpignore="true"
                                                data-form-type="other"
                                                value={customApiKey}
                                                onChange={(e) => setCustomApiKey(e.target.value)}
                                                placeholder="sk-..., csk-..., or together_..."
                                                className="w-full pl-10 pr-4 py-3 bg-black/50 border border-gray-700 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all font-mono text-sm"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Supports OpenAI, Groq, Cerebras, OpenRouter, Together AI, and Ollama (e.g. <code>ollama:llama3</code>).
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => setIsDialogOpen(false)}
                                        className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmFix}
                                        className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/20 transition-all"
                                    >
                                        Start Fix 🚀
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Execution Header */}
                    <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-xl p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">AI is fixing your issue...</h2>
                                <p className="text-gray-400">
                                    Repository: <span className="text-blue-400 font-mono">{selectedRepo?.full_name}</span> •
                                    Issue: <span className="text-purple-400">#{selectedIssue?.number}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setJobId(null);
                                    setAutofixConfig(null);
                                    setSelectedIssue(null);
                                }}
                                className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 transition-all"
                            >
                                Start New Fix
                            </button>
                        </div>
                    </div>

                    {/* Live Logs */}
                    <LiveLogs
                        directStreamConfig={autofixConfig}
                        onBack={() => {
                            setJobId(null);
                            setAutofixConfig(null);
                            setSelectedIssue(null);
                        }}
                    />
                </div>
            )}
        </div>
    );
}
