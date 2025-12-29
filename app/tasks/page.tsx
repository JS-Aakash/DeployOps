"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
    CheckSquare,
    Clock,
    CheckCircle2,
    Loader2,
    Briefcase,
    ExternalLink,
    User as UserIcon,
    Plus,
    X,
    Calendar,
    Flag,
    AlertCircle
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Task {
    _id: string;
    title: string;
    description: string;
    status: 'todo' | 'in_progress' | 'done';
    priority: 'low' | 'medium' | 'high';
    projectId: { _id: string, name: string };
    createdBy: { name: string };
    issueId?: string;
    prUrl?: string;
}

interface Project {
    _id: string;
    name: string;
}

export default function MyTasksPage() {
    const { data: session } = useSession();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);

    // Form State
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskDesc, setNewTaskDesc] = useState("");
    const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [newTaskProject, setNewTaskProject] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const fetchTasks = async () => {
        try {
            const res = await fetch('/api/tasks');
            const data = await res.json();
            if (Array.isArray(data)) {
                setTasks(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/projects');
            const data = await res.json();
            setProjects(data);
            if (data.length > 0) setNewTaskProject(data[0]._id);
        } catch (e) {
            console.error("Failed to fetch projects");
        }
    };

    useEffect(() => {
        fetchTasks();
        fetchProjects();
        const interval = setInterval(() => fetchTasks(), 10000); // 10s auto-refresh
        return () => clearInterval(interval);
    }, []);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle || !newTaskProject) return;

        setIsCreating(true);
        try {
            const res = await fetch('/api/tasks', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: newTaskTitle,
                    description: newTaskDesc,
                    priority: newTaskPriority,
                    projectId: newTaskProject,
                })
            });

            if (res.ok) {
                setShowCreateModal(false);
                setNewTaskTitle("");
                setNewTaskDesc("");
                setNewTaskPriority("medium");
                fetchTasks(); // Refresh list
            }
        } catch (error) {
            console.error("Failed to create task", error);
        } finally {
            setIsCreating(false);
        }
    };

    const updateTaskStatus = async (taskId: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                setTasks(tasks.map(t => t._id === taskId ? { ...t, status: newStatus as any } : t));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const getPriorityStyle = (p: string) => {
        switch (p) {
            case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        }
    };

    const sortedTasks = {
        todo: tasks.filter(t => t.status === 'todo'),
        in_progress: tasks.filter(t => t.status === 'in_progress'),
        done: tasks.filter(t => t.status === 'done')
    };

    return (
        <div className="space-y-10 relative">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
                        <CheckSquare className="w-10 h-10 text-blue-500" />
                        My Assignments
                    </h1>
                    <p className="text-gray-400 mt-2 text-lg">Manage your personal task queue across all active projects.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20"
                >
                    <Plus className="w-5 h-5" />
                    New Task
                </button>
            </div>

            {isLoading ? (
                <div className="p-20 flex justify-center">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                </div>
            ) : tasks.length === 0 ? (
                <div className="p-20 text-center border-2 border-dashed border-gray-800 rounded-3xl bg-black/20">
                    <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-800 text-gray-600">
                        <CheckSquare className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-white">No tasks assigned</h3>
                    <p className="text-gray-500 mt-2 max-w-sm mx-auto">Create a task to get started or wait for assignments.</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-6 text-blue-400 hover:text-blue-300 font-bold text-sm"
                    >
                        Create your first task →
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {Object.entries(sortedTasks).map(([status, list]) => (
                        <div key={status} className="space-y-6">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-800/50">
                                <h3 className="font-black text-xs uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                    {status === 'todo' && <Clock className="w-4 h-4 text-blue-400" />}
                                    {status === 'in_progress' && <Loader2 className="w-4 h-4 text-yellow-500" />}
                                    {status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                    {status.replace('_', ' ')}
                                </h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-400">{list.length}</span>
                            </div>

                            <div className="space-y-4">
                                {list.map(task => (
                                    <div key={task._id} className="p-6 rounded-2xl border border-gray-800 bg-gray-900/40 hover:bg-gray-900 transition-all group">
                                        <div className="flex items-start justify-between mb-4">
                                            <span className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase border", getPriorityStyle(task.priority))}>
                                                {task.priority}
                                            </span>
                                            {task.prUrl && (
                                                <a href={task.prUrl} target="_blank" className="text-purple-400 hover:text-purple-300 transition-colors">
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            )}
                                        </div>

                                        <h4 className="text-white font-bold mb-2 group-hover:text-blue-400 transition-colors tracking-tight line-clamp-2 uppercase">
                                            {task.title}
                                        </h4>
                                        <p className="text-xs text-gray-500 line-clamp-2 mb-4 italic">
                                            {task.description || "No description provided."}
                                        </p>

                                        <div className="space-y-3 mb-6">
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600 uppercase">
                                                <Briefcase className="w-3 h-3" />
                                                <Link href={`/projects/${task.projectId?._id}`} className="hover:text-blue-400 transition-colors">
                                                    {task.projectId?.name || "System Project"}
                                                </Link>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600 uppercase">
                                                <UserIcon className="w-3 h-3" />
                                                By {task.createdBy?.name || "Lead"}
                                            </div>
                                        </div>

                                        {/* Status Controls */}
                                        <div className="grid grid-cols-3 gap-2">
                                            {status !== 'todo' && (
                                                <button
                                                    onClick={() => updateTaskStatus(task._id, 'todo')}
                                                    className="py-2 text-[9px] font-bold bg-gray-800 hover:bg-blue-600/20 text-gray-400 rounded-lg transition-all uppercase"
                                                >
                                                    Todo
                                                </button>
                                            )}
                                            {status !== 'in_progress' && (
                                                <button
                                                    onClick={() => updateTaskStatus(task._id, 'in_progress')}
                                                    className="py-2 text-[9px] font-bold bg-gray-800 hover:bg-yellow-600/20 text-gray-400 rounded-lg transition-all uppercase"
                                                >
                                                    Start
                                                </button>
                                            )}
                                            {status !== 'done' && (
                                                <button
                                                    onClick={() => updateTaskStatus(task._id, 'done')}
                                                    className="py-2 text-[9px] font-bold bg-gray-800 hover:bg-green-600/20 text-gray-400 rounded-lg transition-all uppercase col-span-1"
                                                >
                                                    Finish
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Task Modal */}
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
                                <h2 className="text-xl font-bold text-white">Create New Task</h2>
                                <p className="text-sm text-gray-500">Add a new item to your personal board</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreateTask} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Task Title</label>
                                <input
                                    type="text"
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    placeholder="e.g. Update documentation"
                                    className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Priority</label>
                                    <div className="flex bg-black/40 border border-gray-800 rounded-xl p-1">
                                        {(['low', 'medium', 'high'] as const).map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setNewTaskPriority(p)}
                                                className={cn(
                                                    "flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all",
                                                    newTaskPriority === p
                                                        ? getPriorityStyle(p)
                                                        : "text-gray-500 hover:text-gray-300"
                                                )}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Project</label>
                                    <select
                                        value={newTaskProject}
                                        onChange={(e) => setNewTaskProject(e.target.value)}
                                        className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                                        required
                                    >
                                        <option value="" disabled>Select Project</option>
                                        {projects.map(p => (
                                            <option key={p._id} value={p._id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Description</label>
                                <textarea
                                    value={newTaskDesc}
                                    onChange={(e) => setNewTaskDesc(e.target.value)}
                                    placeholder="Add details about this task..."
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
                                        "Create Task"
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
