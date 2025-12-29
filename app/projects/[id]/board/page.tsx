"use client";

import { useEffect, useState, use } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
    Layout,
    Plus,
    Clock,
    CheckCircle2,
    Loader2,
    GitPullRequest,
    Bug,
    Sparkles,
    ArrowLeft,
    FileText,
    Bot,
    User as UserIcon,
    AlertCircle,
    X
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type IssueStatus = 'open' | 'ai_running' | 'pr_created' | 'closed';

interface Issue {
    _id: string;
    title: string;
    description: string;
    type: 'bug' | 'feature' | 'improvement';
    status: IssueStatus;
    requirementId?: { title: string };
    assignedTo: string;
}

const COLUMNS: { id: IssueStatus; title: string; color: string }[] = [
    { id: 'open', title: 'To Do', color: 'border-blue-500/20 text-blue-400 bg-blue-500/5' },
    { id: 'ai_running', title: 'In Progress', color: 'border-yellow-500/20 text-yellow-500 bg-yellow-500/5' },
    { id: 'pr_created', title: 'Review', color: 'border-purple-500/20 text-purple-400 bg-purple-500/5' },
    { id: 'closed', title: 'Done', color: 'border-green-500/20 text-green-500 bg-green-500/5' }
];

export default function KanbanBoardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [issues, setIssues] = useState<Issue[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Create Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newType, setNewType] = useState<'bug' | 'feature' | 'improvement'>('feature');
    const [isCreating, setIsCreating] = useState(false);

    const fetchIssues = async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            const res = await fetch(`/api/projects/${id}/issues`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setIssues(data);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchIssues();
        const interval = setInterval(() => fetchIssues(true), 10000); // Pool for automated transitions
        return () => clearInterval(interval);
    }, [id]);

    const handleCreateIssue = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle) return;

        setIsCreating(true);
        try {
            // Using existing POST endpoint for issues
            const res = await fetch(`/api/projects/${id}/issues`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: newTitle,
                    description: newDesc,
                    type: newType,
                    status: 'open', // Default status for Kanban creates
                    assignedTo: 'human' // Default to manual
                })
            });

            if (res.ok) {
                setShowCreateModal(false);
                setNewTitle("");
                setNewDesc("");
                setNewType("feature");
                fetchIssues(); // Refresh board
            } else {
                const data = await res.json();
                throw new Error(data.error || "Failed to create issue");
            }
        } catch (error: any) {
            setError(error.message);
        } finally {
            setIsCreating(false);
        }
    };

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const issue = issues.find(i => i._id === draggableId);
        if (!issue) return;

        // Validation: strict restriction ONLY for AI-assigned issues
        if (issue.assignedTo === 'ai') {
            alert("This issue is currently being managed by an AI Agent. Please wait for it to complete.");
            return;
        }

        // Optimistic Update
        const newStatus = destination.droppableId as IssueStatus;
        const updatedIssues = issues.map(i => i._id === draggableId ? { ...i, status: newStatus } : i);
        setIssues(updatedIssues);

        try {
            const res = await fetch(`/api/projects/${id}/issues/${draggableId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to update status");
            }
        } catch (e: any) {
            alert(e.message);
            fetchIssues(); // Revert
        }
    };

    const getColumnIssues = (status: IssueStatus) => issues.filter(i => i.status === status);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'bug': return <Bug className="w-3.5 h-3.5 text-red-500" />;
            case 'feature': return <Plus className="w-3.5 h-3.5 text-green-500" />;
            default: return <Sparkles className="w-3.5 h-3.5 text-blue-500" />;
        }
    };

    return (
        <div className="space-y-8 h-full relative">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/projects/${id}`} className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Execution Board</h2>
                        <p className="text-gray-400 mt-1">Real-time Kanban synced with AI automation and PR events.</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">AI Sync Active</span>
                    </div>
                    {/* New Issue Button */}
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Create Issue
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid grid-cols-4 gap-6 h-[calc(100vh-16rem)] min-h-[600px]">
                    {COLUMNS.map((col) => (
                        <div key={col.id} className="flex flex-col rounded-3xl bg-black/20 border border-gray-800/50 p-4">
                            <div className={`flex items-center justify-between p-3 rounded-2xl border ${col.color} mb-6`}>
                                <h3 className="font-bold uppercase tracking-widest text-[10px]">{col.title}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-lg bg-white/5 text-[10px] font-bold">{getColumnIssues(col.id).length}</span>
                                    {col.id === 'open' && (
                                        <button
                                            onClick={() => setShowCreateModal(true)}
                                            className="w-5 h-5 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <Droppable droppableId={col.id}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`flex-1 space-y-4 overflow-y-auto custom-scrollbar transition-all rounded-2xl ${snapshot.isDraggingOver ? 'bg-white/5 p-2' : ''
                                            }`}
                                    >
                                        {getColumnIssues(col.id).map((issue, index) => (
                                            <Draggable key={issue._id} draggableId={issue._id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className={`group p-5 rounded-2xl border border-gray-800 bg-gray-900/40 hover:bg-gray-900 override-bg-blur transition-all outline-none ${snapshot.isDragging ? 'shadow-2xl scale-105 border-blue-500/50 bg-gray-800' : ''
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-2">
                                                                {getTypeIcon(issue.type)}
                                                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">{issue.type}</span>
                                                            </div>
                                                            <div className={`w-2 h-2 rounded-full ${issue.status === 'ai_running' && issue.assignedTo === 'ai' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-700'}`} />
                                                        </div>

                                                        <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight leading-tight">
                                                            {issue.title}
                                                        </h4>

                                                        {issue.requirementId && (
                                                            <div className="mt-3 flex items-center gap-1.5 px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 w-fit">
                                                                <FileText className="w-3 h-3 text-purple-400" />
                                                                <span className="text-[9px] text-purple-400 font-bold uppercase truncate max-w-[120px]">
                                                                    {issue.requirementId.title}
                                                                </span>
                                                            </div>
                                                        )}

                                                        <div className="mt-4 pt-4 border-t border-gray-800/50 flex items-center justify-between">
                                                            <div className="flex items-center gap-2 text-gray-500">
                                                                <div className="w-6 h-6 rounded bg-gray-800 border border-gray-700 flex items-center justify-center">
                                                                    {issue.assignedTo === 'ai' ? <Bot className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
                                                                </div>
                                                                <span className="text-[10px] font-bold">{issue.assignedTo === 'ai' ? 'AI Agent' : 'Developer'}</span>
                                                            </div>
                                                            {issue.status === 'ai_running' && issue.assignedTo === 'ai' && (
                                                                <Loader2 className="w-3.5 h-3.5 text-yellow-500 animate-spin" />
                                                            )}
                                                            {issue.status === 'ai_running' && issue.assignedTo !== 'ai' && (
                                                                <Clock className="w-3.5 h-3.5 text-yellow-500" />
                                                            )}
                                                            {issue.status === 'pr_created' && (
                                                                <GitPullRequest className="w-3.5 h-3.5 text-purple-400" />
                                                            )}
                                                            {issue.status === 'closed' && (
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </DragDropContext>

            {/* Create Issue Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-gray-900 border border-gray-800 w-full max-w-lg rounded-3xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowCreateModal(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <Plus className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Create New Issue</h2>
                                <p className="text-sm text-gray-500">Add a new ticket to the Kanban board</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreateIssue} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Issue Title</label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="e.g. Fix login bug on mobile"
                                    className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Type</label>
                                <div className="flex bg-black/40 border border-gray-800 rounded-xl p-1">
                                    {(['feature', 'bug', 'improvement'] as const).map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setNewType(t)}
                                            className={cn(
                                                "flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all",
                                                newType === t
                                                    ? t === 'bug' ? "bg-red-500/10 text-red-500" :
                                                        t === 'improvement' ? "bg-blue-500/10 text-blue-500" :
                                                            "bg-green-500/10 text-green-500"
                                                    : "text-gray-500 hover:text-gray-300"
                                            )}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Description</label>
                                <textarea
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    placeholder="Add details about this issue..."
                                    className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors h-32 resize-none"
                                />
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isCreating ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        "Create Issue"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
