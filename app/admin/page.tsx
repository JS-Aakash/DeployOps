"use client";

import { useEffect, useState } from "react";
import {
    Users,
    Shield,
    Search,
    MoreHorizontal,
    UserPlus,
    RefreshCcw,
    Settings2,
    Github,
    Folder,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Edit,
    Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
    _id: string;
    name: string;
    email: string;
    image?: string;
    githubUsername?: string;
    source: string;
    primaryRole: string;
    projectCount: number;
    projects: Array<{
        projectId: string;
        projectName: string;
        role: string;
    }>;
    createdAt: string;
}

interface Project {
    _id: string;
    name: string;
    description?: string;
    repoUrl: string;
    owner: string;
    repo: string;
    memberCount: number;
    members: Array<{
        userId: string;
        name: string;
        email: string;
        image?: string;
        role: string;
    }>;
    hasVercel: boolean;
    hasNetlify: boolean;
    deployProvider?: string;
    deployStatus?: string;
    createdAt: string;
}

export default function AdminPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeTab, setActiveTab] = useState("users");
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, projectsRes] = await Promise.all([
                fetch('/api/admin/users'),
                fetch('/api/admin/projects')
            ]);

            if (usersRes.ok) {
                const usersData = await usersRes.json();
                setUsers(usersData);
            }

            if (projectsRes.ok) {
                const projectsData = await projectsRes.json();
                setProjects(projectsData);
            }
        } catch (error) {
            console.error("Failed to fetch admin data:", error);
        } finally {
            setLoading(false);
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'lead': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'developer': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        }
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredProjects = projects.filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-800/30">
                    <div className="flex items-center justify-between mb-2">
                        <Users className="w-8 h-8 text-blue-400" />
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-3xl font-bold text-white">{users.length}</p>
                    <p className="text-sm text-blue-400 mt-1">Total Users</p>
                </div>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-900/20 to-purple-800/10 border border-purple-800/30">
                    <div className="flex items-center justify-between mb-2">
                        <Folder className="w-8 h-8 text-purple-400" />
                        <TrendingUp className="w-4 h-4 text-purple-500" />
                    </div>
                    <p className="text-3xl font-bold text-white">{projects.length}</p>
                    <p className="text-sm text-purple-400 mt-1">Active Projects</p>
                </div>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-800/30">
                    <div className="flex items-center justify-between mb-2">
                        <Shield className="w-8 h-8 text-green-400" />
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </div>
                    <p className="text-3xl font-bold text-white">
                        {users.filter(u => u.primaryRole === 'admin').length}
                    </p>
                    <p className="text-sm text-green-400 mt-1">Admins</p>
                </div>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-900/20 to-amber-800/10 border border-amber-800/30">
                    <div className="flex items-center justify-between mb-2">
                        <Github className="w-8 h-8 text-amber-400" />
                        <CheckCircle2 className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-3xl font-bold text-white">
                        {users.filter(u => u.source === 'github').length}
                    </p>
                    <p className="text-sm text-amber-400 mt-1">GitHub Users</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-gray-900/50 p-1 rounded-2xl w-fit border border-gray-800">
                <button
                    onClick={() => setActiveTab("users")}
                    className={cn(
                        "px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
                        activeTab === 'users'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'text-gray-400 hover:text-gray-200'
                    )}
                >
                    User Management
                </button>
                <button
                    onClick={() => setActiveTab("projects")}
                    className={cn(
                        "px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
                        activeTab === 'projects'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'text-gray-400 hover:text-gray-200'
                    )}
                >
                    Projects Overview
                </button>
                <button
                    onClick={() => setActiveTab("integrations")}
                    className={cn(
                        "px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
                        activeTab === 'integrations'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'text-gray-400 hover:text-gray-200'
                    )}
                >
                    Integrations
                </button>
            </div>

            {/* Users Tab */}
            {activeTab === "users" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl w-full md:w-96 group focus-within:border-blue-500/50">
                            <Search className="w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none focus:outline-none text-sm w-full text-gray-300"
                            />
                        </div>
                        <button
                            onClick={fetchData}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>

                    <div className="rounded-3xl border border-gray-800 bg-black/40 overflow-hidden backdrop-blur-md">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900/50 border-b border-gray-800">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">User</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Source</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Primary Role</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Projects</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {filteredUsers.map((user) => (
                                    <tr key={user._id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {user.image ? (
                                                    <img src={user.image} alt="" className="w-10 h-10 rounded-xl bg-gray-800" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
                                                        <Users className="w-5 h-5 text-gray-500" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-bold text-white">{user.name}</p>
                                                    <p className="text-xs text-gray-500">{user.email}</p>
                                                    {user.githubUsername && (
                                                        <p className="text-xs text-blue-400 flex items-center gap-1 mt-0.5">
                                                            <Github className="w-3 h-3" />
                                                            {user.githubUsername}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2 py-1 rounded-md text-[10px] font-bold uppercase border",
                                                user.source === 'github'
                                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                    : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                            )}>
                                                {user.source}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2 py-1 rounded-md text-[10px] font-bold uppercase border",
                                                getRoleBadgeColor(user.primaryRole)
                                            )}>
                                                {user.primaryRole}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Folder className="w-4 h-4 text-gray-500" />
                                                <span className="text-sm text-gray-300">{user.projectCount}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-400">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Projects Tab */}
            {activeTab === "projects" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl w-full md:w-96">
                        <Search className="w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none focus:outline-none text-sm w-full text-gray-300"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredProjects.map((project) => (
                            <div
                                key={project._id}
                                className="p-6 rounded-2xl border border-gray-800 bg-black/40 hover:border-blue-500/30 transition-all space-y-4"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-white">{project.name}</h3>
                                        {project.description && (
                                            <p className="text-sm text-gray-400 mt-1">{project.description}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        {project.deployProvider === 'render' && (
                                            <div className="w-6 h-6 rounded bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center" title="Render">
                                                <span className="text-[8px] font-bold text-indigo-400">R</span>
                                            </div>
                                        )}
                                        {project.hasVercel && (
                                            <div className="w-6 h-6 rounded bg-black border border-gray-700 flex items-center justify-center" title="Vercel">
                                                <span className="text-[8px] font-bold text-white">V</span>
                                            </div>
                                        )}
                                        {(project.hasNetlify || project.deployProvider === 'netlify') && (
                                            <div className="w-6 h-6 rounded bg-teal-500/20 border border-teal-500/30 flex items-center justify-center" title="Netlify">
                                                <span className="text-[8px] font-bold text-teal-400">N</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {project.deployStatus && project.deployStatus !== 'not_configured' && (
                                    <div className={cn(
                                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border",
                                        project.deployStatus === 'live' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                            project.deployStatus === 'deploying' ? "bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse" :
                                                "bg-red-500/10 text-red-400 border-red-500/20"
                                    )}>
                                        <div className={cn("w-1 h-1 rounded-full", project.deployStatus === 'live' ? "bg-emerald-500" : project.deployStatus === 'deploying' ? "bg-blue-500" : "bg-red-500")} />
                                        {project.deployStatus}
                                    </div>
                                )}

                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Github className="w-3 h-3" />
                                    <span>{project.owner}/{project.repo}</span>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm text-gray-400">{project.memberCount} members</span>
                                    </div>
                                    <div className="flex -space-x-2">
                                        {project.members.slice(0, 3).map((member) => (
                                            member.image ? (
                                                <img
                                                    key={member.userId}
                                                    src={member.image}
                                                    alt={member.name}
                                                    className="w-8 h-8 rounded-full border-2 border-black"
                                                    title={member.name}
                                                />
                                            ) : (
                                                <div
                                                    key={member.userId}
                                                    className="w-8 h-8 rounded-full border-2 border-black bg-gray-800 flex items-center justify-center"
                                                    title={member.name}
                                                >
                                                    <Users className="w-4 h-4 text-gray-500" />
                                                </div>
                                            )
                                        ))}
                                        {project.memberCount > 3 && (
                                            <div className="w-8 h-8 rounded-full border-2 border-black bg-gray-800 flex items-center justify-center">
                                                <span className="text-[10px] text-gray-400">+{project.memberCount - 3}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Integrations Tab */}
            {activeTab === "integrations" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-8 rounded-3xl border border-gray-800 bg-gradient-to-br from-gray-900 to-black space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center">
                                <Github className="w-10 h-10 text-black" />
                            </div>
                            <div className="px-4 py-1.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-xs font-bold uppercase">
                                Connected
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white">GitHub Enterprise</h3>
                            <p className="text-gray-400 mt-2 text-sm leading-relaxed">
                                Project-wide integration for repository tracking, issue monitoring, and automated PR generation.
                            </p>
                        </div>
                        <div className="space-y-4 pt-4 font-mono text-xs">
                            <div className="flex justify-between py-2 border-b border-gray-800">
                                <span className="text-gray-500">Status</span>
                                <span className="text-green-400">Active</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-800">
                                <span className="text-gray-500">Projects</span>
                                <span className="text-blue-400">{projects.length}</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-gray-500">Users</span>
                                <span className="text-gray-300">{users.filter(u => u.source === 'github').length}</span>
                            </div>
                        </div>
                        <div className="flex gap-4 pt-6">
                            <button
                                onClick={fetchData}
                                className="flex-1 py-3 px-6 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCcw className="w-4 h-4" /> Sync Now
                            </button>
                            <button className="py-3 px-4 bg-gray-800 hover:bg-gray-700 rounded-xl text-white transition-all">
                                <Settings2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-xl font-bold text-white">System Health</h3>
                        <div className="space-y-4">
                            <div className="p-5 rounded-2xl border border-gray-800 bg-black/40 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    <div>
                                        <p className="text-sm font-bold text-white">Database</p>
                                        <p className="text-[10px] text-gray-500">MongoDB Connected</p>
                                    </div>
                                </div>
                                <span className="text-xs text-green-400">Healthy</span>
                            </div>
                            <div className="p-5 rounded-2xl border border-gray-800 bg-black/40 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    <div>
                                        <p className="text-sm font-bold text-white">GitHub API</p>
                                        <p className="text-[10px] text-gray-500">OAuth Active</p>
                                    </div>
                                </div>
                                <span className="text-xs text-green-400">Healthy</span>
                            </div>
                            <div className="p-5 rounded-2xl border border-gray-800 bg-black/40 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    <div>
                                        <p className="text-sm font-bold text-white">AI Service</p>
                                        <p className="text-[10px] text-gray-500">Cerebras Connected</p>
                                    </div>
                                </div>
                                <span className="text-xs text-green-400">Healthy</span>
                            </div>
                            <div className="p-5 rounded-2xl border border-gray-800 bg-black/40 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Shield className="w-5 h-5 text-indigo-500" />
                                    <div>
                                        <p className="text-sm font-bold text-white">Production</p>
                                        <p className="text-[10px] text-gray-500">
                                            {projects.filter(p => p.deployProvider && p.deployProvider !== 'none').length} Environments Active
                                        </p>
                                    </div>
                                </div>
                                <span className={cn("text-xs", projects.every(p => p.deployStatus !== 'failed') ? "text-green-400" : "text-red-400")}>
                                    {projects.every(p => p.deployStatus !== 'failed') ? "Stable" : "Attention Needed"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
