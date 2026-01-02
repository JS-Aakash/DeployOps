"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Sparkles,
    Settings,
    ShieldCheck,
    Files,
    CheckSquare,
    Activity,
    Github,
    LogOut,
    User as UserIcon,
    Bell,
    Play
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Files, label: "Projects", href: "/projects" },
    { icon: Play, label: "Code Editor", href: "/editor" },
    { icon: Sparkles, label: "AI Fixer", href: "/ai-fix" },
    { icon: CheckSquare, label: "Tasks", href: "/tasks" },
    { icon: Bell, label: "Notifications", href: "/notifications" },
    { icon: Activity, label: "Monitoring", href: "/monitoring" },
    { icon: ShieldCheck, label: "Admin", href: "/admin" },
];

export function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [stats, setStats] = useState({ projects: 0, issues: 0 });

    useEffect(() => {
        fetch('/api/stats')
            .then(res => res.json())
            .then(data => setStats({ projects: data.stats?.projects || 0, issues: data.stats?.issues || 0 }))
            .catch(() => { });
    }, []);

    return (
        <aside className="w-64 bg-black/50 border-r border-gray-800 flex flex-col h-screen sticky top-0">
            <div className="p-6 border-b border-gray-800 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                    <span className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                        DeployOps
                    </span>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">AI DevOps Platform</p>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                isActive
                                    ? "bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
                                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                            )}
                        >
                            <item.icon className={cn(
                                "w-5 h-5 transition-colors",
                                isActive ? "text-blue-500" : "text-gray-500 group-hover:text-gray-400"
                            )} />
                            <span className="font-medium">{item.label}</span>
                            {isActive && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,1)]" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-800 space-y-4">
                {session?.user && (
                    <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-2xl flex items-center gap-3 group">
                        {session.user.image ? (
                            <img src={session.user.image} alt="" className="w-10 h-10 rounded-xl object-cover border border-gray-700" />
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center">
                                <UserIcon className="w-5 h-5 text-gray-400" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{session.user.name}</p>
                            <button
                                onClick={() => signOut()}
                                className="text-[10px] text-gray-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                            >
                                <LogOut className="w-3 h-3" />
                                Sign Out
                            </button>
                        </div>
                    </div>
                )}
                <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Activity className="w-3 h-3" />
                            <span>Live Stats</span>
                        </div>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Projects</span>
                            <span className="text-white font-bold">{stats.projects}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Issues</span>
                            <span className="text-white font-bold">{stats.issues}</span>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
