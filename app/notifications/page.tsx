"use client";

import { useEffect, useState } from "react";
import {
    Bell,
    Check,
    GitPullRequest,
    AlertTriangle,
    FileText,
    Activity,
    MessageSquare,
    Zap,
    ExternalLink,
    CheckCircle2,
    Clock
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
        _id: string;
        name: string;
    };
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (e) {
            console.error("Failed to fetch notifications");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markAsRead = async (id: string) => {
        try {
            await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
            setNotifications(prev =>
                prev.map(n => n._id === id ? { ...n, isRead: true } : n)
            );
        } catch (e) {
            console.error("Failed to mark read");
        }
    };

    const markAllAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.isRead).map(n => n._id);
        await Promise.all(unreadIds.map(id => markAsRead(id)));
    };

    const getIcon = (type: Notification["type"]) => {
        switch (type) {
            case 'pr_created': return <GitPullRequest className="w-5 h-5 text-blue-400" />;
            case 'pr_merged': return <Zap className="w-5 h-5 text-purple-400" />;
            case 'ops_incident': return <AlertTriangle className="w-5 h-5 text-red-500" />;
            case 'task_assigned': return <FileText className="w-5 h-5 text-green-400" />;
            case 'conflict': return <Activity className="w-5 h-5 text-amber-400" />;
            default: return <MessageSquare className="w-5 h-5 text-gray-400" />;
        }
    };

    const getTypeLabel = (type: Notification["type"]) => {
        switch (type) {
            case 'pr_created': return 'Pull Request Created';
            case 'pr_merged': return 'Pull Request Merged';
            case 'ops_incident': return 'Ops Incident';
            case 'task_assigned': return 'Task Assigned';
            case 'conflict': return 'Conflict Detected';
            default: return 'Notification';
        }
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'unread') return !n.isRead;
        if (filter === 'critical') return n.isCritical;
        return true;
    });

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const criticalCount = notifications.filter(n => n.isCritical).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Bell className="w-8 h-8 text-blue-500" />
                        Notifications
                    </h1>
                    <p className="text-gray-400 mt-1">Stay updated on all project activities</p>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="px-4 py-2 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-600/20 transition-all flex items-center gap-2"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Mark All as Read
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Total</span>
                        <Bell className="w-4 h-4 text-gray-500" />
                    </div>
                    <p className="text-2xl font-bold text-white mt-2">{notifications.length}</p>
                </div>
                <div className="p-4 bg-blue-900/20 border border-blue-800/30 rounded-xl">
                    <div className="flex items-center justify-between">
                        <span className="text-blue-400 text-sm">Unread</span>
                        <Clock className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold text-blue-400 mt-2">{unreadCount}</p>
                </div>
                <div className="p-4 bg-red-900/20 border border-red-800/30 rounded-xl">
                    <div className="flex items-center justify-between">
                        <span className="text-red-400 text-sm">Critical</span>
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                    </div>
                    <p className="text-2xl font-bold text-red-400 mt-2">{criticalCount}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                <button
                    onClick={() => setFilter('all')}
                    className={cn(
                        "px-4 py-2 rounded-xl transition-all text-sm font-medium",
                        filter === 'all'
                            ? "bg-blue-600/20 border border-blue-500/30 text-blue-400"
                            : "bg-gray-900/50 border border-gray-800 text-gray-400 hover:bg-gray-800"
                    )}
                >
                    All ({notifications.length})
                </button>
                <button
                    onClick={() => setFilter('unread')}
                    className={cn(
                        "px-4 py-2 rounded-xl transition-all text-sm font-medium",
                        filter === 'unread'
                            ? "bg-blue-600/20 border border-blue-500/30 text-blue-400"
                            : "bg-gray-900/50 border border-gray-800 text-gray-400 hover:bg-gray-800"
                    )}
                >
                    Unread ({unreadCount})
                </button>
                <button
                    onClick={() => setFilter('critical')}
                    className={cn(
                        "px-4 py-2 rounded-xl transition-all text-sm font-medium",
                        filter === 'critical'
                            ? "bg-red-600/20 border border-red-500/30 text-red-400"
                            : "bg-gray-900/50 border border-gray-800 text-gray-400 hover:bg-gray-800"
                    )}
                >
                    Critical ({criticalCount})
                </button>
            </div>

            {/* Notifications List */}
            <div className="space-y-3">
                {filteredNotifications.length === 0 ? (
                    <div className="py-20 text-center">
                        <Bell className="w-16 h-16 opacity-10 mx-auto mb-4 text-gray-500" />
                        <p className="text-gray-500 text-lg">No notifications found</p>
                        <p className="text-gray-600 text-sm mt-1">You're all caught up!</p>
                    </div>
                ) : (
                    filteredNotifications.map(n => (
                        <div
                            key={n._id}
                            className={cn(
                                "p-5 rounded-xl border transition-all group relative",
                                !n.isRead
                                    ? "bg-white/5 border-white/10 hover:bg-white/10"
                                    : "bg-gray-900/30 border-gray-800 hover:bg-gray-900/50",
                                n.isCritical && "border-l-4 border-l-red-500"
                            )}
                        >
                            <div className="flex gap-4">
                                {/* Icon */}
                                <div className={cn(
                                    "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border",
                                    n.isCritical
                                        ? "bg-red-500/10 border-red-500/30"
                                        : "bg-gray-900 border-gray-800"
                                )}>
                                    {getIcon(n.type)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={cn(
                                                    "text-xs font-bold px-2 py-0.5 rounded border",
                                                    n.isCritical
                                                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                                                        : "bg-gray-800 text-gray-400 border-gray-700"
                                                )}>
                                                    {getTypeLabel(n.type)}
                                                </span>
                                                {!n.isRead && (
                                                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                                )}
                                            </div>
                                            <p className={cn(
                                                "text-sm leading-relaxed",
                                                !n.isRead ? "text-gray-200 font-medium" : "text-gray-400"
                                            )}>
                                                {n.message}
                                            </p>
                                        </div>
                                        {!n.isRead && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); markAsRead(n._id); }}
                                                className="text-gray-600 hover:text-blue-400 transition-colors p-1 rounded"
                                                title="Mark as read"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Metadata */}
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        {n.projectId && (
                                            <span className="flex items-center gap-1">
                                                <FileText className="w-3 h-3" />
                                                {n.projectId.name}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(n.createdAt).toLocaleString()}
                                        </span>
                                        {n.link && (
                                            <Link
                                                href={(() => {
                                                    const match = n.link.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
                                                    if (match) {
                                                        const owner = match[1];
                                                        const repo = match[2];
                                                        const prNum = match[3];
                                                        // Use internal project ID if available for rock-solid resolution
                                                        if (n.projectId?._id) {
                                                            return `/monitoring/pull-requests/gh-${n.projectId._id}---${prNum}`;
                                                        }
                                                        return `/monitoring/pull-requests/gh-external---${prNum}---${repo}---${owner}`;
                                                    }
                                                    return n.link;
                                                })()}
                                                onClick={() => markAsRead(n._id)}
                                                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors ml-auto"
                                            >
                                                View Details
                                                <ExternalLink className="w-3 h-3" />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
