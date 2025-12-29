"use client";

import { useEffect, useState, use } from "react";
import {
    FileText,
    Plus,
    X,
    Loader2,
    ArrowLeft,
    CheckCircle2,
    Clock,
    AlertCircle,
    Edit3,
    ChevronRight,
    Search,
    Filter
} from "lucide-react";
import Link from "next/link";

type Priority = 'low' | 'medium' | 'high';
type Status = 'draft' | 'approved';

interface Requirement {
    _id: string;
    title: string;
    description: string;
    priority: Priority;
    status: Status;
    createdBy: string;
    createdAt: string;
}

export default function ProjectRequirementsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [requirements, setRequirements] = useState<Requirement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [headerError, setHeaderError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        priority: "medium" as Priority,
        status: "draft" as Status
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    const fetchRequirements = async () => {
        try {
            setHeaderError(null);
            const res = await fetch(`/api/projects/${id}/requirements`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setRequirements(data);
            } else if (data.error) {
                setHeaderError(data.error);
            }
        } catch (e: any) {
            setHeaderError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequirements();
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const url = editingId
                ? `/api/projects/${id}/requirements/${editingId}`
                : `/api/projects/${id}/requirements`;

            const res = await fetch(url, {
                method: editingId ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setFormData({ title: "", description: "", priority: "medium", status: "draft" });
                setEditingId(null);
                fetchRequirements();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to save requirement");
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (req: Requirement) => {
        setFormData({
            title: req.title,
            description: req.description,
            priority: req.priority,
            status: req.status
        });
        setEditingId(req._id);
        setIsModalOpen(true);
    };

    const getPriorityBadge = (priority: Priority) => {
        const colors = {
            low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
            high: 'bg-red-500/10 text-red-500 border-red-500/20'
        };
        return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${colors[priority]}`}>{priority}</span>;
    };

    const getStatusBadge = (status: Status) => {
        return status === 'approved'
            ? <span className="flex items-center gap-1 text-green-500 text-xs font-bold bg-green-500/10 px-2 py-1 rounded-lg border border-green-500/20"><CheckCircle2 className="w-3 h-3" /> Approved</span>
            : <span className="flex items-center gap-1 text-gray-400 text-xs font-bold bg-gray-500/10 px-2 py-1 rounded-lg border border-gray-500/20"><Clock className="w-3 h-3" /> Draft</span>;
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/projects/${id}`} className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Requirements & Docs</h2>
                        <p className="text-gray-400 mt-1">Define core features and technical specifications.</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setFormData({ title: "", description: "", priority: "medium", status: "draft" });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20"
                >
                    <Plus className="w-5 h-5" />
                    Add Requirement
                </button>
            </div>

            {headerError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm font-medium">{headerError}</p>
                </div>
            )}

            {/* Content Area */}
            <div className="grid grid-cols-1 gap-6">
                {isLoading ? (
                    <div className="p-20 flex justify-center">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    </div>
                ) : requirements.length === 0 ? (
                    <div className="p-20 text-center border-2 border-dashed border-gray-800 rounded-3xl bg-black/20">
                        <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white">No requirements yet</h3>
                        <p className="text-gray-500 mt-2 max-w-sm mx-auto">Start by defining the first requirement for this project to provide context for AI development.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {requirements.map((req) => (
                            <div key={req._id} className="group p-6 rounded-3xl border border-gray-800 bg-gray-900/20 hover:bg-gray-900/40 transition-all relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => openEditModal(req)}
                                        className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white border border-gray-700"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between mb-4">
                                    {getPriorityBadge(req.priority)}
                                    {getStatusBadge(req.status)}
                                </div>
                                <h4 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">{req.title}</h4>
                                <div className="mt-4 p-4 rounded-2xl bg-black/40 border border-gray-800/50 min-h-[100px]">
                                    <p className="text-sm text-gray-400 line-clamp-4 font-mono leading-relaxed">
                                        {req.description || "No description provided."}
                                    </p>
                                </div>
                                <div className="mt-6 pt-6 border-t border-gray-800 flex items-center justify-between text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                                    <span>By {req.createdBy}</span>
                                    <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-6 right-6 text-gray-400 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <h3 className="text-2xl font-bold text-white mb-6">
                            {editingId ? "Edit Requirement" : "Create New Requirement"}
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Requirement Title</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. User Authentication System"
                                    className="w-full px-5 py-4 bg-black/50 border border-gray-800 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-white font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Priority</label>
                                    <select
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
                                        className="w-full px-5 py-4 bg-black/50 border border-gray-800 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-gray-300 font-medium"
                                    >
                                        <option value="low">🔵 Low</option>
                                        <option value="medium">🟡 Medium</option>
                                        <option value="high">🔴 High</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as Status })}
                                        className="w-full px-5 py-4 bg-black/50 border border-gray-800 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-gray-300 font-medium"
                                    >
                                        <option value="draft">📝 Draft</option>
                                        <option value="approved">✅ Approved</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Technical Description (Markdown)</label>
                                <textarea
                                    rows={8}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Provide context, acceptance criteria, or architectural guidelines..."
                                    className="w-full px-5 py-4 bg-black/50 border border-gray-800 rounded-2xl focus:outline-none focus:border-blue-500 transition-all resize-none text-white font-mono text-sm leading-relaxed"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 text-lg"
                            >
                                {isSubmitting ? "Saving..." : (editingId ? "Update Requirement" : "Create Requirement")}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
