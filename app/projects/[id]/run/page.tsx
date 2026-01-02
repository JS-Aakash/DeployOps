"use client";

import { useEffect, useState, use } from "react";
import {
    Play,
    Save,
    FileText,
    Folder,
    X,
    ChevronRight,
    ChevronDown,
    Loader2,
    ArrowLeft,
    Github,
    Code,
    Terminal,
    ExternalLink,
    AlertCircle,
    CheckCircle2,
    GitBranch
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'dir';
    sha: string;
    children?: FileNode[];
}

export default function RunProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: session } = useSession();

    // State
    const [files, setFiles] = useState<FileNode[]>([]);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['']));
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string>("");
    const [modifiedFiles, setModifiedFiles] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isRunning, setIsRunning] = useState(false);
    const [isPushing, setIsPushing] = useState(false);
    const [logs, setLogs] = useState<string>("");
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'building' | 'running' | 'success' | 'error'>('idle');

    // Fetch initial file tree
    const fetchFiles = async (path: string = "") => {
        try {
            const res = await fetch(`/api/projects/${id}/repository?path=${path}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                const nodes: FileNode[] = data.map(item => ({
                    name: item.name,
                    path: item.path,
                    type: item.type === 'dir' ? 'dir' : 'file',
                    sha: item.sha
                }));
                return nodes;
            }
            return [];
        } catch (e) {
            console.error(e);
            return [];
        }
    };

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            const rootFiles = await fetchFiles();
            setFiles(rootFiles);
            setIsLoading(false);
        };
        init();
    }, [id]);

    const toggleFolder = async (path: string) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);
            // Load children if not already loaded
            const updateTree = (nodes: FileNode[]): FileNode[] => {
                return nodes.map(node => {
                    if (node.path === path && !node.children) {
                        return { ...node, isLoading: true };
                    }
                    if (node.children) {
                        return { ...node, children: updateTree(node.children) };
                    }
                    return node;
                });
            };

            setFiles(prev => updateTree(prev));
            const children = await fetchFiles(path);

            const setChildren = (nodes: FileNode[]): FileNode[] => {
                return nodes.map(node => {
                    if (node.path === path) {
                        return { ...node, children, isLoading: false };
                    }
                    if (node.children) {
                        return { ...node, children: setChildren(node.children) };
                    }
                    return node;
                });
            };
            setFiles(prev => setChildren(prev));
        }
        setExpandedFolders(newExpanded);
    };

    const loadFileContent = async (path: string) => {
        if (modifiedFiles[path]) {
            setFileContent(modifiedFiles[path]);
            setSelectedFile(path);
            return;
        }

        try {
            setSelectedFile(path);
            setFileContent("// Loading...");
            const res = await fetch(`/api/projects/${id}/repository?path=${path}`);
            const data = await res.json();
            if (data.content) {
                const decoded = atob(data.content.replace(/\n/g, ''));
                setFileContent(decoded);
            }
        } catch (e) {
            console.error(e);
            setFileContent("// Error loading file");
        }
    };

    const handleFileChange = (content: string) => {
        setFileContent(content);
        if (selectedFile) {
            setModifiedFiles(prev => ({
                ...prev,
                [selectedFile]: content
            }));
        }
    };

    const handleRun = async () => {
        setIsRunning(true);
        setStatus('building');
        setLogs(">>> Initializing temporary sandbox...\n>>> Cloning repository...\n");
        setPreviewUrl(null);

        try {
            const res = await fetch(`/api/projects/${id}/run`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    modifiedFiles: Object.entries(modifiedFiles).map(([path, content]) => ({ path, content }))
                })
            });
            const data = await res.json();

            if (data.error) {
                setLogs(prev => prev + `\n[ERROR] ${data.error}`);
                setStatus('error');
            } else {
                setLogs(data.logs);
                setPreviewUrl(data.previewUrl);
                setStatus('success');
            }
        } catch (e: any) {
            setLogs(prev => prev + `\n[SYSTEM ERROR] ${e.message}`);
            setStatus('error');
        } finally {
            setIsRunning(false);
        }
    };

    const handleCommit = async () => {
        if (Object.keys(modifiedFiles).length === 0) {
            alert("No changes to commit!");
            return;
        }

        const message = prompt("Enter commit message:", "Updates from DeployOps Sandbox");
        if (!message) return;

        setIsPushing(true);
        try {
            const res = await fetch(`/api/projects/${id}/repository/commit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    modifiedFiles: Object.entries(modifiedFiles).map(([path, content]) => ({ path, content })),
                    commitMessage: message
                })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Successfully pushed to ${data.branch}\nPR Created: ${data.prUrl}`);
                setModifiedFiles({});
            } else {
                alert(`Push failed: ${data.error}`);
            }
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        } finally {
            setIsPushing(false);
        }
    };

    const renderTree = (nodes: FileNode[], depth: number = 0) => {
        return nodes.map(node => (
            <div key={node.path}>
                <div
                    className={`flex items-center gap-2 py-1.5 px-3 rounded-lg cursor-pointer hover:bg-white/5 transition-colors ${selectedFile === node.path ? 'bg-blue-500/10 text-blue-400' : 'text-gray-400'}`}
                    style={{ paddingLeft: `${depth * 1.2 + 0.75}rem` }}
                    onClick={() => node.type === 'dir' ? toggleFolder(node.path) : loadFileContent(node.path)}
                >
                    {node.type === 'dir' ? (
                        <>
                            {expandedFolders.has(node.path) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <Folder className="w-4 h-4 text-blue-500" />
                        </>
                    ) : (
                        <FileText className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="text-sm truncate font-medium">{node.name}</span>
                    {modifiedFiles[node.path] && (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-auto" title="Uncommitted changes" />
                    )}
                </div>
                {node.type === 'dir' && expandedFolders.has(node.path) && node.children && (
                    <div>{renderTree(node.children, depth + 1)}</div>
                )}
                {node.type === 'dir' && expandedFolders.has(node.path) && (node as any).isLoading && (
                    <div className="py-1 px-3 text-xs text-gray-600 animate-pulse" style={{ paddingLeft: `${(depth + 1) * 1.2 + 0.75}rem` }}>Loading...</div>
                )}
            </div>
        ));
    };

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] gap-6">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Link href={`/projects/${id}`} className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            Run Project
                            <span className="text-xs font-bold uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded">Sandbox</span>
                        </h2>
                        <p className="text-gray-400 mt-1">Execute ephemeral environments directly from source.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCommit}
                        disabled={isPushing || Object.keys(modifiedFiles).length === 0}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 text-gray-300 rounded-xl font-bold hover:bg-gray-700 transition-all border border-gray-700 disabled:opacity-50"
                    >
                        <GitBranch className="w-4 h-4" />
                        Commit & Push
                    </button>
                    <button
                        onClick={handleRun}
                        disabled={isRunning}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                    >
                        {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        Run Project
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 gap-6 min-h-0">
                {/* File Sidebar */}
                <div className="w-64 flex flex-col bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/60 flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-gray-500 tracking-widest">Repository</span>
                        <Github className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-600">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span className="text-xs">Fetching tree...</span>
                            </div>
                        ) : (
                            renderTree(files)
                        )}
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 flex flex-col bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden">
                    {selectedFile ? (
                        <>
                            <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/60 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Code className="w-4 h-4 text-blue-400" />
                                    <span className="text-sm font-medium text-gray-300">{selectedFile}</span>
                                    {modifiedFiles[selectedFile] && (
                                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">modified</span>
                                    )}
                                </div>
                                <button onClick={() => setSelectedFile(null)} className="text-gray-600 hover:text-white"><X className="w-4 h-4" /></button>
                            </div>
                            <textarea
                                value={fileContent}
                                onChange={(e) => handleFileChange(e.target.value)}
                                className="flex-1 w-full p-6 bg-transparent text-gray-300 font-mono text-sm resize-none focus:outline-none custom-scrollbar"
                                spellCheck={false}
                            />
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-600 gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gray-800/50 flex items-center justify-center border border-gray-700/50">
                                <FileText className="w-8 h-8 opacity-20" />
                            </div>
                            <p className="text-sm">Select a file from the repository to edit</p>
                        </div>
                    )}
                </div>

                {/* Logs & Preview Area */}
                <div className="w-96 flex flex-col gap-6 shrink-0">
                    {/* Execution Status */}
                    <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 space-y-4">
                        <h4 className="text-xs font-black uppercase text-gray-500 tracking-widest flex items-center justify-between">
                            Execution Output
                            {status === 'success' && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                        </h4>

                        <div className="bg-black/50 border border-gray-800 rounded-xl p-4 font-mono text-xs text-gray-400 h-64 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                            {logs || ">>> Ready to execute..."}
                            {isRunning && (
                                <div className="mt-2 flex items-center gap-2 text-blue-400">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>{status === 'building' ? "Building Docker image..." : "Container running..."}</span>
                                </div>
                            )}
                        </div>

                        {previewUrl && (
                            <div className="pt-2">
                                <a
                                    href={previewUrl}
                                    target="_blank"
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-500 transition-all shadow-lg shadow-green-500/20"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Open Preview
                                </a>
                            </div>
                        )}

                        {!previewUrl && status === 'success' && (
                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-3 text-blue-400">
                                <CheckCircle2 className="w-5 h-5 shrink-0" />
                                <p className="text-xs leading-relaxed">Execution finished. See logs above for output.</p>
                            </div>
                        )}
                    </div>

                    {/* Quick Specs */}
                    <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6">
                        <h4 className="text-xs font-black uppercase text-gray-500 tracking-widest mb-4">Sandbox Constraints</h4>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">Memory Limit</span>
                                <span className="text-white font-bold">512 MB</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">CPU Count</span>
                                <span className="text-white font-bold">1 Core</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">Timeout</span>
                                <span className="text-white font-bold">60 Seconds</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">State</span>
                                <span className="text-blue-400 font-bold uppercase tracking-tighter">Ephemeral</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
