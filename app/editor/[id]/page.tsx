"use client";

import { useEffect, useState, use, useRef } from "react";
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
    GitBranch,
    Send,
    GitCommit,
    GitMerge,
    GitPullRequest,
    History,
    PanelLeft,
    PanelBottom,
    Plus,
    Trash2,
    FolderPlus,
    Square
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import Editor from "@monaco-editor/react";

interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'dir';
    sha?: string;
    children?: FileNode[];
}

export default function CodeEditorProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: session } = useSession();

    // State
    const [files, setFiles] = useState<FileNode[]>([]);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['']));
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string>("");
    const [modifiedFiles, setModifiedFiles] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);

    // Browser close confirmation
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (Object.keys(modifiedFiles).length > 0) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [modifiedFiles]);
    const [isRunning, setIsRunning] = useState(false);
    const [isPushing, setIsPushing] = useState(false);
    const [logs, setLogs] = useState<string>("");
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'building' | 'running' | 'success' | 'error'>('idle');

    // UI Toggles
    const [showSidebar, setShowSidebar] = useState(true);
    const [showTerminal, setShowTerminal] = useState(true);

    const [deletedFiles, setDeletedFiles] = useState<Set<string>>(new Set());
    const terminalRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Auto-scroll terminal
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [logs]);

    // Helper: Detect language from file path
    const getLanguage = (path: string | null) => {
        if (!path) return "plaintext";
        const ext = path.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'js':
            case 'jsx': return 'javascript';
            case 'ts':
            case 'tsx': return 'typescript';
            case 'py': return 'python';
            case 'go': return 'go';
            case 'java': return 'java';
            case 'c':
            case 'cpp':
            case 'h': return 'cpp';
            case 'cs': return 'csharp';
            case 'rb': return 'ruby';
            case 'php': return 'php';
            case 'html': return 'html';
            case 'css': return 'css';
            case 'json': return 'json';
            case 'md': return 'markdown';
            case 'yml':
            case 'yaml': return 'yaml';
            case 'dockerfile': return 'dockerfile';
            case 'sh': return 'shell';
            case 'sql': return 'sql';
            default: return 'plaintext';
        }
    };

    // Commit Modal State
    const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
    const [commitMessage, setCommitMessage] = useState("");
    const [commitMode, setCommitMode] = useState<'pr' | 'merge'>('pr');
    const [commitLogs, setCommitLogs] = useState<string[]>([]);
    const [commitStatus, setCommitStatus] = useState<'idle' | 'working' | 'success' | 'error'>('idle');

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

    const handleCreate = async (parentPath: string | null, type: 'file' | 'dir') => {
        const name = prompt(`Enter ${type} name:`);
        if (!name || name.trim() === "") return;

        const path = parentPath ? `${parentPath}/${name}` : name;

        if (type === 'file') {
            setModifiedFiles(prev => ({ ...prev, [path]: "" }));
            setSelectedFile(path);
            setFileContent("");

            const newNode: FileNode = { name, path, type: 'file' };
            setFiles(prev => {
                const addNode = (nodes: FileNode[]): FileNode[] => {
                    if (!parentPath) return [...nodes, newNode];
                    return nodes.map(node => {
                        if (node.path === parentPath) {
                            // Only add if not already present
                            const exists = node.children?.some(c => c.path === path);
                            if (exists) return node;
                            return { ...node, children: [...(node.children || []), newNode] };
                        }
                        if (node.children) return { ...node, children: addNode(node.children) };
                        return node;
                    });
                };
                return addNode(prev);
            });
            if (parentPath) setExpandedFolders(prev => new Set(prev).add(parentPath));
        } else {
            // NOTE: Git doesn't track empty folders, so this will only persist 
            // if a file is eventually created inside it and committed.
            const newNode: FileNode = { name, path, type: 'dir', children: [] };
            setFiles(prev => {
                const addNode = (nodes: FileNode[]): FileNode[] => {
                    if (!parentPath) return [...nodes, newNode];
                    return nodes.map(node => {
                        if (node.path === parentPath) {
                            const exists = node.children?.some(c => c.path === path);
                            if (exists) return node;
                            return { ...node, children: [...(node.children || []), newNode] };
                        }
                        if (node.children) return { ...node, children: addNode(node.children) };
                        return node;
                    });
                };
                return addNode(prev);
            });
            if (parentPath) setExpandedFolders(prev => new Set(prev).add(parentPath));
            setExpandedFolders(prev => new Set(prev).add(path)); // Auto-expand new folder
        }
    };

    const handleDelete = (path: string, type: 'file' | 'dir') => {
        if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

        setDeletedFiles(prev => new Set(prev).add(path));

        // Remove from modified if present
        if (modifiedFiles[path]) {
            setModifiedFiles(prev => {
                const next = { ...prev };
                delete next[path];
                return next;
            });
        }

        if (selectedFile === path) {
            setSelectedFile(null);
            setFileContent("");
        }

        // Remove from local tree
        const removeNode = (nodes: FileNode[]): FileNode[] => {
            return nodes.filter(node => node.path !== path).map(node => {
                if (node.children) return { ...node, children: removeNode(node.children) };
                return node;
            });
        };
        setFiles(prev => removeNode(prev));
    };

    const loadFileContent = async (path: string, forceFresh: boolean = false) => {
        if (!forceFresh && modifiedFiles[path]) {
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

    const handleFileChange = (content: string | undefined) => {
        const newContent = content || "";
        setFileContent(newContent);
        if (selectedFile) {
            setModifiedFiles(prev => ({
                ...prev,
                [selectedFile]: newContent
            }));
        }
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setLogs(prev => prev + "\n[DeployOps] Aborting instance by user request...\n");
            setIsRunning(false);
            setStatus('idle');
            setPreviewUrl(null);
        }
    };

    const handleRun = async () => {
        setIsRunning(true);
        setStatus('building');
        setLogs("");
        setPreviewUrl(null);

        // Cleanup previous if exists
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();

        try {
            const res = await fetch(`/api/projects/${id}/run`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: abortControllerRef.current.signal,
                body: JSON.stringify({
                    modifiedFiles: Object.entries(modifiedFiles).map(([path, content]) => ({ path, content }))
                })
            });

            if (!res.body) throw new Error("No response body");

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedLogs = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                accumulatedLogs += chunk;

                // Check for Preview URL or status updates
                if (chunk.includes("[PREVIEW_URL]")) {
                    const match = chunk.match(/\[PREVIEW_URL\]\s*(https?:\/\/[^\s\n]+)/);
                    if (match && match[1]) {
                        setPreviewUrl(match[1]);
                        setStatus('success');
                    }
                } else if (chunk.includes(">>> Launching Container")) {
                    setStatus('running');
                }

                setLogs(accumulatedLogs.replace(/\[PREVIEW_URL\].*\n/g, ""));
            }
        } catch (e: any) {
            if (e.name === 'AbortError') {
                setLogs(prev => prev + `\n[DeployOps] Instance stopped.`);
            } else {
                setLogs(prev => prev + `\n[SYSTEM ERROR] ${e.message}`);
                setStatus('error');
            }
        } finally {
            setIsRunning(false);
            abortControllerRef.current = null;
        }
    };

    const handleCommitSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commitMessage.trim()) return;

        setIsPushing(true);
        setCommitStatus('working');
        setCommitLogs(["Connecting to GitHub..."]);

        try {
            const addLog = (log: string) => setCommitLogs(prev => [...prev, log]);

            setTimeout(() => addLog("Parsing modified files..."), 500);
            setTimeout(() => addLog("Creating Git blobs..."), 1200);
            setTimeout(() => addLog("Building tree structure..."), 2000);
            setTimeout(() => addLog("Finalizing commit..."), 2800);

            const res = await fetch(`/api/projects/${id}/repository/commit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    modifiedFiles: Object.entries(modifiedFiles).map(([path, content]) => ({ path, content })),
                    deletedFiles: Array.from(deletedFiles),
                    commitMessage,
                    mode: commitMode
                })
            });

            const data = await res.json();
            if (data.success) {
                addLog(`✓ Success! Changes ${commitMode === 'merge' ? 'merged into' : 'pushed to'} ${data.branch}`);
                if (data.prUrl) addLog(`✓ PR Created: ${data.prUrl}`);
                setCommitStatus('success');
                setModifiedFiles({});

                // Close modal after delay
                setTimeout(() => {
                    setIsCommitModalOpen(false);
                    setCommitStatus('idle');
                    setCommitLogs([]);
                    setCommitMessage("");
                    setDeletedFiles(new Set());
                }, 3000);
            } else {
                addLog(`✗ Error: ${data.error}`);
                setCommitStatus('error');
            }
        } catch (e: any) {
            setCommitLogs(prev => [...prev, `✗ Fatal Error: ${e.message}`]);
            setCommitStatus('error');
        } finally {
            setIsPushing(false);
        }
    };

    const renderTree = (nodes: FileNode[], depth: number = 0) => {
        return nodes.map(node => (
            <div key={node.path} className="group">
                <div
                    className={`flex items-center gap-2 py-1 px-3 rounded-lg cursor-pointer hover:bg-white/5 transition-colors relative ${selectedFile === node.path ? 'bg-blue-500/10 text-blue-400' : 'text-gray-400'}`}
                    style={{ paddingLeft: `${depth * 1 + 0.5}rem` }}
                    onClick={() => node.type === 'dir' ? toggleFolder(node.path) : loadFileContent(node.path)}
                >
                    {node.type === 'dir' ? (
                        <>
                            {expandedFolders.has(node.path) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            <Folder className="w-3.5 h-3.5 text-blue-500" />
                        </>
                    ) : (
                        <FileText className="w-3.5 h-3.5 text-gray-500" />
                    )}
                    <span className="text-xs truncate font-medium flex-1">{node.name}</span>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {node.type === 'dir' && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleCreate(node.path, 'file'); }}
                                    className="p-1 hover:text-blue-400 transition-colors"
                                    title="New File"
                                >
                                    <Plus className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleCreate(node.path, 'dir'); }}
                                    className="p-1 hover:text-blue-400 transition-colors"
                                    title="New Folder"
                                >
                                    <FolderPlus className="w-3 h-3" />
                                </button>
                            </>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(node.path, node.type); }}
                            className="p-1 hover:text-red-400 transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>

                    {modifiedFiles[node.path] && (
                        <div className="w-1 h-1 rounded-full bg-blue-500 ml-1" title="Uncommitted changes" />
                    )}
                </div>
                {node.type === 'dir' && expandedFolders.has(node.path) && node.children && (
                    <div>{renderTree(node.children, depth + 1)}</div>
                )}
                {node.type === 'dir' && expandedFolders.has(node.path) && (node as any).isLoading && (
                    <div className="py-1 px-3 text-[10px] text-gray-600 animate-pulse" style={{ paddingLeft: `${(depth + 1) * 1 + 0.5}rem` }}>Loading...</div>
                )}
            </div>
        ));
    };

    return (
        <div className="flex flex-col h-full gap-4 pb-2">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            if (Object.keys(modifiedFiles).length > 0) {
                                if (confirm("You have uncommitted changes. Are you sure you want to leave?")) {
                                    window.location.href = "/editor";
                                }
                            } else {
                                window.location.href = "/editor";
                            }
                        }}
                        className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                            Code Editor
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">Pro</span>
                        </h2>
                        <p className="text-gray-400 text-xs mt-0.5">Full access to source files with live execution sandbox.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-gray-900 border border-gray-800 rounded-xl p-1 mr-2">
                        <button
                            onClick={() => setShowSidebar(!showSidebar)}
                            className={`p-1.5 rounded-lg transition-all ${showSidebar ? 'bg-blue-600/10 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                            title="Toggle Sidebar"
                        >
                            <PanelLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setShowTerminal(!showTerminal)}
                            className={`p-1.5 rounded-lg transition-all ${showTerminal ? 'bg-blue-600/10 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                            title="Toggle Terminal"
                        >
                            <PanelBottom className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => setIsCommitModalOpen(true)}
                        disabled={Object.keys(modifiedFiles).length === 0 || isPushing}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-xl font-bold hover:bg-gray-700 transition-all border border-gray-700 disabled:opacity-50 text-sm"
                    >
                        <GitCommit className="w-4 h-4" />
                        Commit Changes
                        {Object.keys(modifiedFiles).length > 0 && (
                            <span className="ml-1 w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-[9px] font-black">{Object.keys(modifiedFiles).length}</span>
                        )}
                    </button>
                    {isRunning ? (
                        <button
                            onClick={handleStop}
                            className="flex items-center gap-2 px-5 py-2 bg-red-600/10 text-red-500 rounded-xl font-bold hover:bg-red-600/20 transition-all border border-red-500/30 text-sm shadow-lg shadow-red-500/10"
                        >
                            <Square className="w-4 h-4 fill-current" />
                            Stop Instance
                        </button>
                    ) : (
                        <button
                            onClick={handleRun}
                            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 text-sm"
                        >
                            <Play className="w-4 h-4" />
                            Run Instance
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className={`flex flex-1 min-h-0 gap-4`}>
                {/* File Sidebar */}
                {showSidebar && (
                    <div className="w-64 flex flex-col bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden shrink-0">
                        <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/60 flex items-center justify-between">
                            <span className="text-xs font-black uppercase text-gray-500 tracking-widest">Workspace</span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleCreate(null, 'file')}
                                    className="p-1 hover:text-blue-400 text-gray-500 transition-colors"
                                    title="New File at Root"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => handleCreate(null, 'dir')}
                                    className="p-1 hover:text-blue-400 text-gray-500 transition-colors"
                                    title="New Folder at Root"
                                >
                                    <FolderPlus className="w-3.5 h-3.5" />
                                </button>
                                <Github className="w-3.5 h-3.5 text-gray-600" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-600">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span className="text-xs">Initializing...</span>
                                </div>
                            ) : (
                                renderTree(files)
                            )}
                        </div>
                    </div>
                )}

                {/* Editor & Terminal Container */}
                <div className="flex-1 flex flex-col gap-4 min-w-0 min-h-0">
                    {/* Editor Area */}
                    <div className="flex-1 flex flex-col bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden min-h-0">
                        {selectedFile ? (
                            <>
                                <div className="px-4 py-1.5 border-b border-gray-800 bg-gray-900/60 flex items-center shrink-0 h-10 overflow-hidden relative border-t-0">
                                    <div className="flex-1 flex items-center gap-2 min-w-0 pr-16 bg-transparent overflow-hidden">
                                        <Code className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                        <span className="text-[13px] font-bold text-gray-300 truncate tracking-tight">{selectedFile}</span>
                                        {modifiedFiles[selectedFile] && (
                                            <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 uppercase font-black tracking-tighter shrink-0">Modified</span>
                                        )}
                                    </div>
                                    <div className="absolute right-2 top-0 bottom-0 flex items-center gap-1 bg-gray-900/80 pl-2 backdrop-blur-sm">
                                        <button
                                            onClick={() => {
                                                if (confirm("Revert all unsaved changes for this file?")) {
                                                    const path = selectedFile!;
                                                    setModifiedFiles(prev => {
                                                        const next = { ...prev };
                                                        delete next[path];
                                                        return next;
                                                    });
                                                    loadFileContent(path, true);
                                                }
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-red-400 transition-colors"
                                            title="Discard local changes"
                                        >
                                            <History className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => setSelectedFile(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 w-full bg-[#1e1e1e] relative min-h-0">
                                    <Editor
                                        height="100%"
                                        theme="vs-dark"
                                        language={getLanguage(selectedFile)}
                                        value={fileContent}
                                        onChange={handleFileChange}
                                        onMount={(editor, monaco) => {
                                            (window as any).monacoEditor = editor;
                                            // Completely disable all validation/diagnostics to hide all warnings/errors
                                            monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                                                noSemanticValidation: true,
                                                noSyntaxValidation: true,
                                            });
                                            monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                                                noSemanticValidation: true,
                                                noSyntaxValidation: true,
                                            });

                                            // Add Save shortcut (standard IDE behavior)
                                            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                                                // Since we handle changes in onChange, we just show a subtle feedback
                                                console.log("Saving changes internally...");
                                            });
                                        }}
                                        options={{
                                            minimap: { enabled: true },
                                            fontSize: 14,
                                            lineNumbers: 'on',
                                            roundedSelection: false,
                                            scrollBeyondLastLine: false,
                                            readOnly: false,
                                            cursorStyle: 'line',
                                            automaticLayout: true,
                                            fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace',
                                            tabSize: 4,
                                            padding: { top: 16 },
                                            insertSpaces: true,
                                            autoIndent: 'advanced',
                                            folding: true,
                                            renderValidationDecorations: 'off',
                                            renderLineHighlight: 'all',
                                            scrollbar: {
                                                vertical: 'visible',
                                                horizontal: 'visible',
                                            },
                                        }}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-600 gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-gray-800/50 flex items-center justify-center border border-gray-700/50">
                                    <FileText className="w-8 h-8 opacity-20" />
                                </div>
                                <p className="text-sm">Explore source files to begin editing</p>
                            </div>
                        )}
                    </div>

                    {/* Terminal at bottom */}
                    {showTerminal && (
                        <div className="h-[280px] bg-gray-900/40 border border-gray-800 rounded-2xl flex flex-col overflow-hidden shrink-0">
                            <div className="px-4 py-2.5 border-b border-gray-800 bg-gray-900/60 flex items-center justify-between shrink-0">
                                <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                                    <Terminal className="w-3.5 h-3.5" />
                                    Live Terminal
                                    {status === 'success' && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                                </h4>
                                {previewUrl && (
                                    <a
                                        href={previewUrl}
                                        target="_blank"
                                        className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 uppercase tracking-wider"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                        Launch Preview
                                    </a>
                                )}
                            </div>

                            <div
                                ref={terminalRef}
                                className="flex-1 bg-black/50 p-4 font-mono text-xs text-gray-400 overflow-y-auto custom-scrollbar whitespace-pre-wrap"
                            >
                                {logs || (
                                    <div className="flex flex-col gap-2 opacity-40 italic">
                                        <p>&gt;&gt;&gt; Ready for deployment instance...</p>
                                        <p>&gt;&gt;&gt; Click 'Run Instance' to start ephemeral build.</p>
                                    </div>
                                )}
                                {isRunning && (
                                    <div className="mt-2 flex items-center gap-2 text-blue-400">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        <span>{status === 'building' ? "Cloning & Building Container..." : "Executing Instance..."}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Commit Modal */}
            {isCommitModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-blue-600/20">
                            {commitStatus === 'working' && <div className="h-full bg-blue-500 animate-[loading_2s_ease-in-out_infinite]" />}
                        </div>

                        <button
                            onClick={() => !isPushing && setIsCommitModalOpen(false)}
                            className="absolute top-6 right-6 text-gray-400 hover:text-white disabled:opacity-50"
                            disabled={isPushing}
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                            <GitCommit className="w-6 h-6 text-blue-500" />
                            Synchronize to GitHub
                        </h3>
                        <p className="text-gray-400 text-sm mb-6">You have {Object.keys(modifiedFiles).length} modified files ready to be pushed.</p>

                        <form onSubmit={handleCommitSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-500">Commit Message</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={commitMessage}
                                    onChange={(e) => setCommitMessage(e.target.value)}
                                    placeholder="Briefly describe what you changed..."
                                    className="w-full px-4 py-3 bg-black/50 border border-gray-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all resize-none text-gray-300 font-medium"
                                    disabled={isPushing}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setCommitMode('pr')}
                                    className={`p-4 rounded-xl border transition-all text-left flex flex-col gap-2 ${commitMode === 'pr' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-transparent border-gray-800 text-gray-500 hover:border-gray-700'}`}
                                    disabled={isPushing}
                                >
                                    <GitPullRequest className="w-5 h-5" />
                                    <span className="font-bold text-sm">Create Pull Request</span>
                                    <span className="text-[10px] opacity-60">Safely review changes on a new branch.</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCommitMode('merge')}
                                    className={`p-4 rounded-xl border transition-all text-left flex flex-col gap-2 ${commitMode === 'merge' ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-transparent border-gray-800 text-gray-500 hover:border-gray-700'}`}
                                    disabled={isPushing}
                                >
                                    <GitMerge className="w-5 h-5" />
                                    <span className="font-bold text-sm">Direct Merge</span>
                                    <span className="text-[10px] opacity-60">Push directly to the default branch.</span>
                                </button>
                            </div>

                            {commitMode === 'merge' && (
                                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center gap-3 text-xs italic">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    Warning: This will skip code review and update 'main' directly.
                                </div>
                            )}

                            {commitLogs.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-gray-800">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-500">Operation Logs</label>
                                    <div className="bg-black p-4 rounded-xl font-mono text-[10px] text-blue-400/80 space-y-1 max-h-32 overflow-y-auto">
                                        {commitLogs.map((log, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <span className="opacity-40">[{i + 1}]</span>
                                                {log}
                                            </div>
                                        ))}
                                        {isPushing && <div className="animate-pulse">_</div>}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={isPushing || !commitMessage.trim()}
                                    className={`flex-1 py-4 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 ${commitMode === 'merge' ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'}`}
                                >
                                    {isPushing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Synchronizing...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            {commitMode === 'merge' ? "Confirm & Merge" : "Launch Pull Request"}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes loading {
                    0% { transform: translateX(-100%); width: 30%; }
                    50% { width: 60%; }
                    100% { transform: translateX(400%); width: 30%; }
                }
            `}</style>
        </div>
    );
}

