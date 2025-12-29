"use client";

import { useEffect, useState, use } from "react";
import {
    Map,
    ArrowLeft,
    CheckCircle2,
    Loader2,
    FileText,
    AlertCircle,
    ChevronRight,
    Target,
    Activity,
    Trophy
} from "lucide-react";
import Link from "next/link";

interface Requirement {
    _id: string;
    title: string;
    description: string;
    status: 'draft' | 'approved';
    priority: 'low' | 'medium' | 'high';
}

interface Issue {
    _id: string;
    requirementId?: string;
    status: string;
}

interface RoadmapItem extends Requirement {
    totalIssues: number;
    doneIssues: number;
    progress: number;
}

export default function ProjectRoadmapPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [overallProgress, setOverallProgress] = useState(0);

    const fetchRoadmapData = async () => {
        try {
            setIsLoading(true);
            const [reqRes, issueRes] = await Promise.all([
                fetch(`/api/projects/${id}/requirements`),
                fetch(`/api/projects/${id}/issues`)
            ]);

            const requirements: Requirement[] = await reqRes.json();
            const issues: Issue[] = await issueRes.json();

            if (!Array.isArray(requirements) || !Array.isArray(issues)) return;

            // Filter only approved requirements for roadmap if desired, 
            // but requirements module says approved requirements are the context.
            // Let's show all for now to see full plan.

            const items = requirements.map(req => {
                const linkedIssues = issues.filter(i => {
                    // issue.requirementId might be populated or ID string
                    const rId = (i.requirementId as any)?._id || i.requirementId;
                    return rId === req._id;
                });
                const total = linkedIssues.length;
                const done = linkedIssues.filter(i => i.status === 'closed').length;
                const progress = total > 0 ? Math.round((done / total) * 100) : 0;

                return {
                    ...req,
                    totalIssues: total,
                    doneIssues: done,
                    progress
                };
            });

            setRoadmap(items);

            const totalTasks = items.reduce((sum, item) => sum + item.totalIssues, 0);
            const doneTasks = items.reduce((sum, item) => sum + item.doneIssues, 0);
            setOverallProgress(totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0);

        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRoadmapData();
    }, [id]);

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'high': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
            default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
        }
    };

    return (
        <div className="space-y-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/projects/${id}`} className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Project Roadmap</h2>
                        <p className="text-gray-400 mt-1">Strategic milestones and requirement completion tracking.</p>
                    </div>
                </div>
                <div className="px-6 py-3 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center gap-3">
                    <Target className="w-5 h-5 text-blue-500" />
                    <div>
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Total Velocity</p>
                        <p className="text-xl font-bold text-white leading-none">{overallProgress}%</p>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="p-20 flex justify-center">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                </div>
            ) : roadmap.length === 0 ? (
                <div className="p-20 text-center border-2 border-dashed border-gray-800 rounded-3xl bg-black/20">
                    <Map className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white">Roadmap is empty</h3>
                    <p className="text-gray-500 mt-2 max-w-sm mx-auto">Create and link requirements to issues to see your project timeline here.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Overall Progress Tracker */}
                    <div className="p-8 rounded-3xl border border-gray-800 bg-gray-900/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Activity className="w-32 h-32 text-blue-500" />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                            <div className="w-24 h-24 rounded-full border-4 border-blue-500/20 flex items-center justify-center relative">
                                <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin-slow rotate-45" />
                                <span className="text-2xl font-black text-white">{overallProgress}%</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold text-white mb-2">Project Completion Status</h3>
                                <p className="text-gray-400 max-w-xl">
                                    Overall progress is calculated based on completed issues across all defined requirements.
                                    Strategic alignment is at <span className="text-blue-400 font-bold">{overallProgress}%</span> efficiency.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Requirement Timeline */}
                    <div className="grid grid-cols-1 gap-6">
                        {roadmap.map((item, index) => (
                            <div key={item._id} className="group relative flex gap-6">
                                {/* Connection Line */}
                                {index !== roadmap.length - 1 && (
                                    <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-800 -mb-6" />
                                )}

                                <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border-2 z-10 ${item.progress === 100 ? 'bg-green-500 border-green-400 text-white' : 'bg-gray-900 border-gray-800 text-gray-400'
                                    }`}>
                                    {item.progress === 100 ? <Trophy className="w-5 h-5" /> : <span className="font-bold">{index + 1}</span>}
                                </div>

                                <div className="flex-1 p-8 rounded-3xl border border-gray-800 bg-gray-900/40 hover:bg-gray-900 transition-all">
                                    <div className="flex items-start justify-between mb-6">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${getPriorityColor(item.priority)}`}>
                                                    {item.priority} priority
                                                </span>
                                                {item.status === 'approved' && (
                                                    <span className="flex items-center gap-1 text-[10px] text-green-500 font-bold uppercase tracking-tighter">
                                                        <CheckCircle2 className="w-3 h-3" /> Approved Context
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{item.title}</h4>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-white">{item.progress}%</p>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase">Requirement Progress</p>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-6">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-1000"
                                            style={{ width: `${item.progress}%` }}
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="p-4 rounded-2xl bg-black/40 border border-gray-800/50">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Total Tasks</p>
                                            <p className="text-white font-bold">{item.totalIssues || "No tasks linked"}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-black/40 border border-gray-800/50">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Execution State</p>
                                            <p className="text-white font-bold">{item.totalIssues === 0 ? "Not Started" : item.progress === 100 ? "Completed" : "In Progress"}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-black/40 border border-gray-800/50">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Issues Resolved</p>
                                            <p className="text-white font-bold text-green-500">{item.doneIssues} / {item.totalIssues}</p>
                                        </div>
                                    </div>

                                    <p className="mt-6 text-sm text-gray-500 font-medium leading-relaxed italic line-clamp-2">
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

const spinSlow = `
@keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
.animate-spin-slow {
    animation: spin-slow 8s linear infinite;
}
`;
