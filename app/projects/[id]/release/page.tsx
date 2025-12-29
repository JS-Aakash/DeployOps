"use client";

import { useEffect, useState, use } from "react";
import {
    ShieldCheck,
    ShieldAlert,
    ShieldBan,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    ArrowLeft,
    Sparkles,
    Loader2,
    ExternalLink
} from "lucide-react";
import Link from "next/link";

interface Signal {
    type: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    link: string;
}

interface ReadinessData {
    status: 'READY' | 'CAUTION' | 'BLOCKED';
    signals: Signal[];
}

export default function ReleaseReadinessPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [data, setData] = useState<ReadinessData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        fetchReadiness();
    }, [id]);

    const fetchReadiness = async () => {
        try {
            const res = await fetch(`/api/projects/${id}/release-readiness`);
            const json = await res.json();
            setData(json);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAskAI = () => {
        if (!data) return;
        setIsAnalyzing(true);

        // Simulate AI Analysis of the signals
        setTimeout(() => {
            let analysis = "";
            if (data.status === 'BLOCKED') {
                analysis = "🚫 **Release Risk: CRITICAL**\n\nThe release is strictly blocked due to active critical issues or production incidents. Deploying now would likely result in immediate service disruption. \n\n**Recommendation:** Prioritize fixing the critical issues listed above before attempting ANY deployment.";
            } else if (data.status === 'CAUTION') {
                analysis = "⚠️ **Release Risk: MODERATE**\n\nWhile there are no hard blockers, there are checking pending items (PRs or Tasks) that could affect stability. \n\n**Recommendation:** Review the pending PRs manually. If they are low-risk feature flags or documentation, you may proceed. Otherwise, wait for approval.";
            } else {
                analysis = "✅ **Release Risk: LOW**\n\nAll operational signals are green. Critical paths are clear, and production is healthy. \n\n**Recommendation:** Proceed with deployment sequence when ready.";
            }
            setAiAnalysis(analysis);
            setIsAnalyzing(false);
        }, 1500);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'READY': return 'text-green-400 bg-green-900/20 border-green-500/30';
            case 'CAUTION': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
            case 'BLOCKED': return 'text-red-400 bg-red-900/20 border-red-500/30';
            default: return 'text-gray-400';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'READY': return <ShieldCheck className="w-16 h-16" />;
            case 'CAUTION': return <ShieldAlert className="w-16 h-16" />;
            case 'BLOCKED': return <ShieldBan className="w-16 h-16" />;
            default: return null;
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href={`/projects/${id}`} className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-all">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Release Readiness</h2>
                    <p className="text-gray-400 mt-1">Operational guardrail to assess deployment safety.</p>
                </div>
            </div>

            {/* Main Status */}
            {data && (
                <div className={`p-10 rounded-3xl border-2 flex flex-col items-center justify-center text-center ${getStatusColor(data.status)}`}>
                    <div className="mb-6">{getStatusIcon(data.status)}</div>
                    <h1 className="text-5xl font-black tracking-tighter mb-4">{data.status}</h1>
                    <p className="text-lg opacity-90 max-w-2xl">
                        {data.status === 'READY' && "All systems go. The project is stable and ready for release."}
                        {data.status === 'CAUTION' && "Proceed with care. There are pending items that require human review."}
                        {data.status === 'BLOCKED' && "STOP. Critical blockers detected. Do not deploy."}
                    </p>
                </div>
            )}

            {/* Signals Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Checklist */}
                <div className="p-6 rounded-3xl border border-gray-800 bg-black/40">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-blue-500" />
                        Usage Signals
                    </h3>

                    {data?.signals.length === 0 ? (
                        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="font-bold">No issues detected. Clean slate.</span>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data?.signals.map((signal, i) => (
                                <Link
                                    key={i}
                                    href={signal.link}
                                    className={`flex items-start gap-4 p-4 rounded-xl border transition-all hover:bg-white/5 ${signal.severity === 'error' ? 'bg-red-500/5 border-red-500/20' :
                                            signal.severity === 'warning' ? 'bg-yellow-500/5 border-yellow-500/20' :
                                                'bg-blue-500/5 border-blue-500/20'
                                        }`}
                                >
                                    <div className="mt-0.5">
                                        {signal.severity === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
                                        {signal.severity === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className={`font-bold text-sm ${signal.severity === 'error' ? 'text-red-400' : 'text-yellow-400'
                                            }`}>
                                            {signal.message}
                                        </p>
                                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                            View Details <ExternalLink className="w-3 h-3" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* AI Analysis */}
                <div className="p-6 rounded-3xl border border-gray-800 bg-gradient-to-br from-purple-900/10 to-black/40">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        AI Risk Assessment
                    </h3>

                    {!aiAnalysis ? (
                        <div className="text-center py-10">
                            <p className="text-gray-400 mb-6">Ask DeployOps AI to analyze these signals and assess the deployment risk.</p>
                            <button
                                onClick={handleAskAI}
                                disabled={isAnalyzing}
                                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-500 transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50 flex items-center gap-2 mx-auto"
                            >
                                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                Analyze Release Risk
                            </button>
                        </div>
                    ) : (
                        <div className="animate-in fade-in zoom-in duration-300">
                            <div className="prose prose-invert prose-sm">
                                <div className="whitespace-pre-wrap text-gray-300 font-medium leading-relaxed">
                                    {aiAnalysis}
                                </div>
                            </div>
                            <button
                                onClick={() => setAiAnalysis(null)}
                                className="mt-8 text-xs text-gray-500 hover:text-white"
                            >
                                Reset Analysis
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
