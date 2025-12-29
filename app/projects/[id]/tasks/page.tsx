"use client";

import { useEffect, useState, use } from "react";
import {
    CheckSquare,
    Plus,
    X,
    User as UserIcon,
    ArrowLeft,
    Loader2,
    Clock,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import Link from "next/link";

import { useSession } from "next-auth/react";

interface Member {
    userId: { _id: string, name: string, email: string };
    role: string;
}

interface Task {
    _id: string;
    title: string;
    description: string;
    status: 'todo' | 'in_progress' | 'done';
    priority: 'low' | 'medium' | 'high';
    assignedTo: { _id: string, name: string };
    createdBy: { name: string };
}

export default function ProjectTasksPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: session, status } = useSession();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    // Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [assignedTo, setAssignedTo] = useState("");

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [taskRes, memberRes] = await Promise.all([
                fetch(`/api/projects/${id}/tasks`),
                fetch(`/api/projects/${id}/members`)
            ]);
            setTasks(await taskRes.json());
            setMembers(await memberRes.json());
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(), 10000);
        return () => clearInterval(interval);
    }, [id]);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/tasks', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title, description, priority, assignedTo, projectId: id
                })
            });
            if (res.ok) {
                setIsAdding(false);
                setTitle("");
                setDescription("");
                fetchData();
            } else {
                const data = await res.json();
                alert(`Failed to create task: ${data.error || "Unknown error"}`);
            }
        } catch (e: any) {
            console.error(e);
            alert(`Network error: ${e.message}`);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/projects/${id}`} className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Team Tasks</h2>
                        <p className="text-gray-400 mt-1">Coordinate human execution for this project.</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20"
                >
                    <Plus className="w-5 h-5" />
                    Assign Task
                </button>
            </div>

            {isAdding && (
                <div className="p-8 rounded-3xl border border-blue-500/30 bg-blue-500/5 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <CheckSquare className="w-5 h-5 text-blue-500" />
                            New Human Assignment
                        </h3>
                        <button onClick={() => setIsAdding(false)} className="text-gray-500 hover:text-white"><X className="w-6 h-6" /></button>
                    </div>
                    <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Task Title</label>
                                <input
                                    value={title} onChange={e => setTitle(e.target.value)} required
                                    className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                                    placeholder="e.g. Code Review for Module X"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Description</label>
                                <textarea
                                    value={description} onChange={e => setDescription(e.target.value)}
                                    className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none h-32"
                                    placeholder="What needs to be done?"
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Assign Member</label>
                                <select
                                    value={assignedTo} onChange={e => setAssignedTo(e.target.value)} required
                                    className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                                >
                                    <option value="">Select a human developer...</option>
                                    {/* Ensure current user is always selectable */}
                                    <optgroup label="Me">
                                        <option value={status === 'authenticated' ? (session?.user as any)?.id || "" : ""}>
                                            {session?.user?.name} (You)
                                        </option>
                                    </optgroup>
                                    <optgroup label="Team Members">
                                        {members.filter(m => m.userId && m.userId._id !== (session?.user as any)?.id).map(m => (
                                            <option key={m.userId._id} value={m.userId._id}>{m.userId.name} ({m.role})</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Priority</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['low', 'medium', 'high'].map(p => (
                                        <button
                                            key={p} type="button"
                                            onClick={() => setPriority(p as any)}
                                            className={`py-3 rounded-xl border text-xs font-bold uppercase transition-all ${priority === p ? 'bg-blue-600 border-blue-500 text-white' : 'bg-black/20 border-gray-800 text-gray-500 hover:border-gray-700'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-4">
                                <button type="submit" className="w-full py-4 bg-blue-600 rounded-xl font-black text-white hover:bg-blue-500 shadow-xl shadow-blue-500/20 transition-all uppercase tracking-widest">
                                    Assign Now
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {isLoading ? (
                <div className="p-20 flex justify-center"><Loader2 className="w-10 h-10 text-blue-500 animate-spin" /></div>
            ) : tasks.length === 0 ? (
                <div className="p-20 text-center border-2 border-dashed border-gray-800 rounded-3xl bg-black/20 italic text-gray-500">
                    No tasks assigned to this project yet.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tasks.map(task => (
                        <div key={task._id} className="p-6 rounded-2xl border border-gray-800 bg-gray-900/20 hover:border-gray-700 transition-all flex flex-col h-full">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${task.status === 'done' ? 'bg-green-500' : task.status === 'in_progress' ? 'bg-yellow-500 animate-pulse' : 'bg-blue-500'
                                        }`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{task.status}</span>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${task.priority === 'high' ? 'border-red-500/20 text-red-500' : 'border-gray-700 text-gray-500'
                                    }`}>
                                    {task.priority}
                                </span>
                            </div>
                            <h4 className="text-white font-bold mb-4 uppercase tracking-tight">{task.title}</h4>
                            <div className="mt-auto pt-4 border-t border-gray-800 flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center border border-gray-700">
                                        <UserIcon className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="truncate max-w-[80px]">{task.assignedTo?.name}</span>
                                </div>
                                <span>By {task.createdBy?.name}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
