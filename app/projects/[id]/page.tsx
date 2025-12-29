"use client";

import { useEffect, useState, use } from "react";
import {
    Users,
    UserPlus,
    Github,
    RefreshCcw,
    Shield,
    MoreHorizontal,
    ArrowBigLeft,
    Loader2,
    Trash2,
    Mail,
    User as UserIcon,
    AlertCircle,
    FileText,
    GitPullRequest,
    MessageSquare,
    Layout,
    Map,
    CheckSquare,
    Book,
    Activity,
    Clock,
    Zap,
    Target,
    ShieldCheck
} from "lucide-react";
import Link from "next/link";

export default function ProjectDashboardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [members, setMembers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newMember, setNewMember] = useState({ name: "", email: "", role: "developer" });
    const [error, setError] = useState<string | null>(null);

    const fetchMembers = async () => {
        try {
            setError(null);
            const res = await fetch(`/api/projects/${id}/members`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setMembers(data);
            } else if (data.error) {
                setError(data.error);
                setMembers([]);
            } else {
                setMembers([]);
            }
        } catch (e: any) {
            console.error(e);
            setError(e.message);
            setMembers([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, [id]);

    const handleManualAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/projects/${id}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newMember)
            });
            if (res.ok) {
                setIsModalOpen(false);
                setNewMember({ name: "", email: "", role: "developer" });
                fetchMembers();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to add member");
            }
        } catch (e: any) {
            console.error(e);
            alert(e.message);
        }
    };

    const syncGitHub = async () => {
        setIsSyncing(true);
        try {
            const res = await fetch(`/api/projects/${id}/sync-github`, {
                method: "POST"
            });
            if (res.ok) {
                fetchMembers();
            } else {
                const data = await res.json();
                alert(data.error || "GitHub sync failed");
            }
        } catch (e: any) {
            console.error(e);
            alert(e.message);
        } finally {
            setIsSyncing(false);
        }
    };

    // Tool Categories
    const toolGroups = [
        {
            title: "Define & Plan",
            description: "Shape your product vision",
            color: "text-purple-400",
            bg: "bg-purple-900/10 border-purple-500/20",
            tools: [
                { name: "Affinity Figure", icon: Layout, href: `/projects/${id}/affinity` },
                { name: "Requirements", icon: FileText, href: `/projects/${id}/requirements` },
                { name: "Roadmap", icon: Map, href: `/projects/${id}/roadmap` },
                { name: "Documentation", icon: Book, href: `/projects/${id}/docs` },
            ]
        },
        {
            title: "Build & Track",
            description: "Execute tasks efficiently",
            color: "text-blue-400",
            bg: "bg-blue-900/10 border-blue-500/20",
            tools: [
                { name: "Kanban Board", icon: Layout, href: `/projects/${id}/board` },
                { name: "Tasks", icon: CheckSquare, href: `/projects/${id}/tasks` },
                { name: "Issues", icon: AlertCircle, href: `/projects/${id}/issues` },
                { name: "Team Chat", icon: MessageSquare, href: `/projects/${id}/chat` },
            ]
        },
        {
            title: "Deploy & Operations",
            description: "Release and monitor stability",
            color: "text-green-400",
            bg: "bg-green-900/10 border-green-500/20",
            tools: [
                { name: "Pull Requests", icon: GitPullRequest, href: `/projects/${id}/pull-requests` },
                { name: "Versions", icon: Clock, href: `/projects/${id}/versions` },
                { name: "Release Readiness", icon: ShieldCheck, href: `/projects/${id}/release` },
                { name: "Monitoring", icon: Activity, href: `/projects/${id}/monitoring` },
            ]
        }
    ];

    return (
        <div className="space-y-12 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/projects" className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-all">
                    <ArrowBigLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h2 className="text-3xl font-bold text-white">Project Dashboard</h2>
                    <p className="text-gray-400 mt-1">Central command for all project activities.</p>
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {toolGroups.map((group, idx) => (
                    <div key={idx} className={`p-6 rounded-3xl border ${group.bg} flex flex-col`}>
                        <div className="mb-6">
                            <h3 className={`text-xl font-bold ${group.color} flex items-center gap-2`}>
                                {idx === 0 && <Target className="w-5 h-5" />}
                                {idx === 1 && <Zap className="w-5 h-5" />}
                                {idx === 2 && <Shield className="w-5 h-5" />}
                                {group.title}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">{group.description}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {group.tools.map((tool) => (
                                <Link
                                    key={tool.name}
                                    href={tool.href}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-transparent hover:border-gray-700 hover:bg-black/60 transition-all group"
                                >
                                    <div className="p-2 rounded-lg bg-gray-900 text-gray-400 group-hover:text-white transition-colors">
                                        <tool.icon className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-300 group-hover:text-white">{tool.name}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Team Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-bold text-white">Team Members</h3>
                        <p className="text-gray-400 text-sm mt-1">Manage contributors and access roles.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={syncGitHub}
                            disabled={isSyncing}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-xl font-bold hover:bg-gray-700 transition-all border border-gray-700 disabled:opacity-50 text-sm"
                        >
                            <RefreshCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            Sync GitHub
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 text-sm"
                        >
                            <UserPlus className="w-4 h-4" />
                            Add Member
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                <div className="rounded-3xl border border-gray-800 bg-black/40 overflow-hidden backdrop-blur-md">
                    <table className="w-full text-left">
                        <thead className="bg-gray-900/50 border-b border-gray-800">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">User</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Role</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Source</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center">
                                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : members.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        No members yet. Tip: Try syncing with GitHub!
                                    </td>
                                </tr>
                            ) : (
                                members.map((member) => (
                                    <tr key={member._id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {member.userId?.image ? (
                                                    <img src={member.userId.image} className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 shadow-sm" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center">
                                                        <UserIcon className="w-5 h-5 text-gray-500" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-bold text-white transition-colors group-hover:text-blue-400">{member.userId?.name || "Unknown User"}</p>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Mail className="w-3 h-3" />
                                                        {member.userId?.email || "No Email"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Shield className="w-4 h-4 text-blue-500" />
                                                <span className="text-xs font-bold text-gray-300 uppercase tracking-tighter bg-gray-800 px-2 py-1 rounded">
                                                    {member.role}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {member.userId?.source === 'github' ? (
                                                <div className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 w-fit px-2 py-1 rounded-full border border-blue-500/20">
                                                    <Github className="w-3.5 h-3.5" />
                                                    GitHub
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-500/10 w-fit px-2 py-1 rounded-full border border-gray-500/20">
                                                    Manual
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Manual Add Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl">
                        <h3 className="text-2xl font-bold text-white mb-6">Add New Member</h3>
                        <form onSubmit={handleManualAdd} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400 text-uppercase tracking-widest">Full Name</label>
                                <input
                                    required
                                    type="text"
                                    value={newMember.name}
                                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-black/50 border border-gray-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all font-medium text-gray-200"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400 text-uppercase tracking-widest">Email Address</label>
                                <input
                                    required
                                    type="email"
                                    value={newMember.email}
                                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-black/50 border border-gray-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all font-medium text-gray-200"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400 text-uppercase tracking-widest">Assigned Role</label>
                                <select
                                    value={newMember.role}
                                    onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                                    className="w-full px-4 py-3 bg-black/50 border border-gray-800 rounded-xl focus:outline-none focus:border-blue-500 transition-all font-medium text-gray-200"
                                >
                                    <option value="developer">Developer</option>
                                    <option value="lead">Lead</option>
                                    <option value="admin">Admin</option>
                                    <option value="viewer">Viewer</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 text-gray-400 font-bold hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20"
                                >
                                    Confirm Addition
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
