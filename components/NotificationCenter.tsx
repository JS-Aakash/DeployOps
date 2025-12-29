"use client";

import { useEffect, useState } from "react";
import {
    Bell,
    Check,
    GitPullRequest,
    AlertTriangle,
    FileText,
    Activity,
    X,
    MessageSquare,
    Zap
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Notification {
    _id: string;
    type: 'pr_created' | 'pr_merged' | 'task_assigned' | 'ops_incident' | 'conflict';
    message: string;
    link?: string;
    isRead: boolean;
    isCritical: boolean;
    createdAt: string;
    projectId?: {
        name: string;
    };
}

export function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
                setUnreadCount(data.filter((n: Notification) => !n.isRead).length);
            }
        } catch (e) {
            console.error("Failed to fetch notifications");
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const markAsRead = async (id: string) => {
        try {
            await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
            setNotifications(prev =>
                prev.map(n => n._id === id ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (e) {
            console.error("Failed to mark read");
        }
    };

    const getIcon = (type: Notification["type"]) => {
        switch (type) {
            case 'pr_created': return <GitPullRequest className="w-4 h-4 text-blue-400" />;
            case 'pr_merged': return <Zap className="w-4 h-4 text-purple-400" />;
            case 'ops_incident': return <AlertTriangle className="w-4 h-4 text-red-500" />;
            case 'task_assigned': return <FileText className="w-4 h-4 text-green-400" />;
            case 'conflict': return <Activity className="w-4 h-4 text-amber-400" />;
            default: return <MessageSquare className="w-4 h-4 text-gray-400" />;
        }
    };

    return (
        <div className="relative z-50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black" />
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-transparent"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-4 w-96 max-h-[80vh] overflow-hidden bg-[#0A0A0A] border border-gray-800 rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
                            <h3 className="font-bold text-white text-sm">Notifications</h3>
                            <div className="flex items-center gap-2">
                                <span className="bg-blue-500/10 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/20">
                                    {unreadCount} New
                                </span>
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1 p-2 space-y-1">
                            {notifications.length === 0 ? (
                                <div className="py-12 text-center text-gray-500 text-sm">
                                    <Bell className="w-8 h-8 opacity-20 mx-auto mb-2" />
                                    No notifications
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <div
                                        key={n._id}
                                        className={cn(
                                            "relative p-3 rounded-xl transition-all border group",
                                            !n.isRead ? "bg-white/5 border-white/10" : "bg-transparent border-transparent hover:bg-white/5"
                                        )}
                                    >
                                        <div className="flex gap-3">
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-black/40 border border-gray-800",
                                                n.isCritical && "border-red-500/30 bg-red-500/10"
                                            )}>
                                                {getIcon(n.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={cn("text-xs leading-relaxed", !n.isRead ? "text-gray-200 font-medium" : "text-gray-500")}>
                                                        {n.message}
                                                    </p>
                                                    {!n.isRead && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); markAsRead(n._id); }}
                                                            className="text-gray-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="Mark as read"
                                                        >
                                                            <Check className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="mt-2 flex items-center gap-2">
                                                    {n.projectId && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                                                            {n.projectId.name}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-gray-600">
                                                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {n.link && (
                                            <Link
                                                href={n.link}
                                                onClick={() => markAsRead(n._id)}
                                                className="absolute inset-0 rounded-xl"
                                                role="button"
                                                tabIndex={0}
                                            >
                                                <span className="sr-only">View details</span>
                                            </Link>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
