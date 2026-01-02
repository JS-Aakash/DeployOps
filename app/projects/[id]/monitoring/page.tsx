"use client";

import { useEffect, useState, use } from "react";
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    Clock,
    Zap,
    Bug,
    ArrowUpRight,
    RefreshCw,
    ShieldAlert,
    Terminal,
    Loader2,
    Globe,
    Rocket,
    Server,
    ExternalLink,
    Sparkles,
    Layers,
    Save as SaveIcon
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function MonitoringPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isConfiguring, setIsConfiguring] = useState(false);
    const [provider, setProvider] = useState<'vercel' | 'netlify'>('vercel');
    const [config, setConfig] = useState({
        vercelProjectId: "",
        vercelToken: "",
        netlifySiteId: "",
        netlifyToken: ""
    });
    const [isSaving, setIsSaving] = useState(false);
    const [setupMode, setSetupMode] = useState<'link' | 'provision'>('provision');

    // Deployment State
    const [isDeploying, setIsDeploying] = useState(false);
    const [deployLogs, setDeployLogs] = useState<string>("");
    const [deployStatus, setDeployStatus] = useState<string>("ready");
    const [showDeploySetup, setShowDeploySetup] = useState(false);
    const [isConfiguringDeploy, setIsConfiguringDeploy] = useState(false);
    const [deployConfig, setDeployConfig] = useState({
        provider: 'netlify' as 'netlify' | 'render',
        netlifySiteId: "",
        netlifyToken: "",
        renderDeployHook: "",
        renderServiceName: "",
        productionUrl: ""
    });

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/projects/${id}/monitoring`, { cache: 'no-store' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to fetch monitoring data");
            }
            const json = await res.json();
            setData(json);
            if (json.config) {
                setConfig(prev => ({
                    ...prev,
                    vercelProjectId: json.config.vercelProjectId || "",
                    netlifySiteId: json.config.netlifySiteId || ""
                }));
                if (json.provider) setProvider(json.provider);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => {
            fetchData();
            if (isDeploying) {
                fetchDeployStatus();
                fetchDeployLogs();
            }
        }, 8000);
        return () => clearInterval(interval);
    }, [id, isDeploying]);

    const fetchDeployStatus = async () => {
        try {
            const res = await fetch(`/api/projects/${id}/deploy/status`);
            const json = await res.json();
            if (json.status) setDeployStatus(json.status);
            if (json.status === 'live' || json.status === 'failed') {
                setIsDeploying(false);
            }
        } catch (e) { console.error(e); }
    };

    const fetchDeployLogs = async () => {
        try {
            const res = await fetch(`/api/projects/${id}/deploy/logs`);
            const json = await res.json();
            if (json.logs) setDeployLogs(json.logs);
        } catch (e) { console.error(e); }
    };

    const handleTriggerDeploy = async () => {
        setIsDeploying(true);
        setDeployLogs("Initializing deployment orchestration...\nContacting provider API...");
        try {
            const res = await fetch(`/api/projects/${id}/deploy/trigger`, { method: 'POST' });
            if (!res.ok) throw new Error("Trigger failed");
            fetchDeployStatus();
            fetchDeployLogs();
        } catch (e: any) {
            alert(e.message);
            setIsDeploying(false);
        }
    };

    const handleSaveDeployConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch(`/api/projects/${id}/deploy/setup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(deployConfig)
            });
            if (!res.ok) throw new Error("Failed to save deployment configuration");
            setShowDeploySetup(false);
            fetchData();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const endpoint = setupMode === 'provision'
                ? `/api/projects/${id}/deploy/provision`
                : `/api/projects/${id}/settings`;

            const payload = setupMode === 'provision'
                ? {
                    provider,
                    token: provider === 'vercel' ? config.vercelToken : config.netlifyToken,
                    projectName: config.vercelProjectId || config.netlifySiteId // Re-using existing fields for name in provision mode
                }
                : config;

            const res = await fetch(endpoint, {
                method: setupMode === 'provision' ? "POST" : "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to save configuration");
            }

            setIsConfiguring(false);
            fetchData();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <p className="text-gray-400 font-medium animate-pulse">Initializing DeployOps Monitoring...</p>
            </div>
        );
    }

    if (!data?.isConfigured && !isConfiguring) {
        return (
            <div className="max-w-4xl mx-auto py-20 px-4 text-center space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-blue-500/10 rounded-[2rem] flex items-center justify-center mx-auto border border-blue-500/20 shadow-2xl shadow-blue-500/10">
                    <Activity className="w-12 h-12 text-blue-500" />
                </div>
                <div className="space-y-4">
                    <h1 className="text-4xl font-black text-white">Connect Infrastructure</h1>
                    <p className="text-gray-400 max-w-lg mx-auto leading-relaxed">
                        To enable live monitoring and production health tracking, you must link this project to its deployment metrics.
                    </p>
                </div>

                {error && (
                    <div className="max-w-md mx-auto p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-medium text-left">{error}</p>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                        onClick={() => { setIsConfiguring(true); setProvider('vercel'); }}
                        className="px-8 py-4 bg-white text-black rounded-2xl font-bold hover:bg-gray-200 transition-all shadow-xl flex items-center gap-2"
                    >
                        <Zap className="w-5 h-5" />
                        Configure Vercel
                    </button>
                    <button
                        onClick={() => { setIsConfiguring(true); setProvider('netlify'); }}
                        className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-xl flex items-center gap-2"
                    >
                        <Globe className="w-5 h-5" />
                        Configure Netlify
                    </button>
                </div>
            </div>
        );
    }

    // Configuration View
    if (isConfiguring) {
        return (
            <div className="max-w-2xl mx-auto py-12 px-4 animate-in slide-in-from-bottom-8 duration-500">
                <div className="bg-gray-900/50 border border-gray-800 rounded-[3rem] p-10 backdrop-blur-xl">
                    <div className="flex items-center gap-4 mb-8 p-1 bg-black/40 rounded-2xl">
                        <button
                            onClick={() => setProvider('vercel')}
                            className={cn(
                                "flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                                provider === 'vercel' ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white"
                            )}
                        >
                            <Zap className="w-4 h-4" />
                            Vercel
                        </button>
                        <button
                            onClick={() => setProvider('netlify')}
                            className={cn(
                                "flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                                provider === 'netlify' ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-white"
                            )}
                        >
                            <Globe className="w-4 h-4" />
                            Netlify
                        </button>
                    </div>

                    <div className="flex p-1 bg-blue-500/5 border border-blue-500/10 rounded-2xl mb-8">
                        <button
                            type="button"
                            onClick={() => setSetupMode('provision')}
                            className={cn(
                                "flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all gap-2 flex items-center justify-center",
                                setupMode === 'provision' ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-gray-500"
                            )}
                        >
                            <Sparkles className="w-3 h-3" />
                            Automatic Provision
                        </button>
                        <button
                            type="button"
                            onClick={() => setSetupMode('link')}
                            className={cn(
                                "flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all gap-2 flex items-center justify-center",
                                setupMode === 'link' ? "bg-white/10 text-white border border-white/20" : "text-gray-500"
                            )}
                        >
                            <Layers className="w-3 h-3" />
                            Link Existing
                        </button>
                    </div>

                    <h2 className="text-3xl font-black text-white mb-2">
                        {setupMode === 'provision' ? 'Automated Provisioning' : `Setup ${provider === 'vercel' ? 'Vercel Edge' : 'Netlify Core'}`}
                    </h2>
                    <p className="text-gray-500 mb-10 text-sm font-medium">
                        {setupMode === 'provision'
                            ? `DeployOps will create a new ${provider} project and link your GitHub repo automatically.`
                            : `Provision live health signals for the DeployOps layer.`
                        }
                    </p>

                    <form onSubmit={handleSaveConfig} className="space-y-6">
                        {provider === 'vercel' ? (
                            <>
                                {setupMode === 'link' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Vercel Project ID</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="prj_..."
                                            value={config.vercelProjectId}
                                            onChange={(e) => setConfig({ ...config, vercelProjectId: e.target.value })}
                                            className="w-full px-6 py-4 bg-black/50 border border-gray-800 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-white font-mono text-sm"
                                        />
                                    </div>
                                )}
                                {setupMode === 'provision' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Project Display Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. my-awesome-app"
                                            value={config.vercelProjectId}
                                            onChange={(e) => setConfig({ ...config, vercelProjectId: e.target.value })}
                                            className="w-full px-6 py-4 bg-black/50 border border-gray-800 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-white font-mono text-sm"
                                        />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Vercel API Token</label>
                                    <input
                                        required
                                        type="password"
                                        placeholder="Personal Access Token"
                                        value={config.vercelToken}
                                        onChange={(e) => setConfig({ ...config, vercelToken: e.target.value })}
                                        className="w-full px-6 py-4 bg-black/50 border border-gray-800 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-white font-mono text-sm"
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                {setupMode === 'link' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Netlify Site ID</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="API ID from Site Settings"
                                            value={config.netlifySiteId}
                                            onChange={(e) => setConfig({ ...config, netlifySiteId: e.target.value })}
                                            className="w-full px-6 py-4 bg-black/50 border border-gray-800 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-white font-mono text-sm"
                                        />
                                    </div>
                                )}
                                {setupMode === 'provision' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Site Custom Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. cloud-dashboard-prod"
                                            value={config.netlifySiteId}
                                            onChange={(e) => setConfig({ ...config, netlifySiteId: e.target.value })}
                                            className="w-full px-6 py-4 bg-black/50 border border-gray-800 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-white font-mono text-sm"
                                        />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Netlify API Token</label>
                                    <input
                                        required
                                        type="password"
                                        placeholder="Personal Access Token"
                                        value={config.netlifyToken}
                                        onChange={(e) => setConfig({ ...config, netlifyToken: e.target.value })}
                                        className="w-full px-6 py-4 bg-black/50 border border-gray-800 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-white font-mono text-sm"
                                    />
                                </div>
                            </>
                        )}

                        <div className="flex gap-4 pt-4">
                            <button
                                type="button"
                                onClick={() => setIsConfiguring(false)}
                                className="flex-1 py-4 text-gray-500 font-bold hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <div className="flex items-center gap-2 justify-center">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Provisionsing...</span>
                                    </div>
                                ) : (
                                    setupMode === 'provision' ? "Provision & Connect" : "Verify & Connect"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    const statusColors = {
        healthy: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/20",
        degraded: "text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-amber-500/20",
        critical: "text-red-400 bg-red-500/10 border-red-500/20 shadow-red-500/20",
    };

    const statusIcons = {
        healthy: CheckCircle2,
        degraded: AlertCircle,
        critical: ShieldAlert,
    };

    const StatusIcon = statusIcons[data?.status as keyof typeof statusIcons] || Activity;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Content */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
                        <Activity className="w-10 h-10 text-blue-500" />
                        Infrastructure Health
                    </h1>
                    <p className="text-gray-400 mt-2 font-medium flex items-center gap-2">
                        {data?.provider === 'vercel' ? <Zap className="w-4 h-4 text-amber-500" /> : <Globe className="w-4 h-4 text-blue-500" />}
                        Live production monitoring via {data?.provider === 'vercel' ? 'Vercel Edge' : 'Netlify'} Metrics
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsConfiguring(true)}
                        className="p-3 rounded-2xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-all active:scale-95 flex items-center gap-2 px-4 text-sm font-bold"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Update Config
                    </button>
                    <button
                        onClick={fetchData}
                        className="p-3 rounded-2xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-all active:scale-95"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Main Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Global Health Status */}
                <div className={cn(
                    "md:col-span-2 p-8 rounded-[2.5rem] border backdrop-blur-xl relative overflow-hidden transition-all duration-500",
                    statusColors[data?.status as keyof typeof statusColors]
                )}>
                    <div className="relative z-10 flex flex-col h-full justify-between gap-12">
                        <div className="flex items-start justify-between">
                            <div>
                                <span className="text-xs font-black uppercase tracking-[0.2em] opacity-60">System Runtime</span>
                                <h2 className="text-5xl font-black mt-2 capitalize">{data?.status}</h2>
                            </div>
                            <StatusIcon className="w-20 h-20 opacity-20" />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="px-4 py-2 bg-black/20 rounded-xl border border-white/10 backdrop-blur-md">
                                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Uptime</p>
                                <p className="text-xl font-black">{data?.metrics?.uptime?.toFixed(2)}%</p>
                            </div>
                            <div className="px-4 py-2 bg-black/20 rounded-xl border border-white/10 backdrop-blur-md">
                                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Target Site</p>
                                <p className="text-xl font-black font-mono">
                                    {(data?.config?.vercelProjectId || data?.config?.netlifySiteId)?.substring(0, 10)}...
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Background Glow */}
                    <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-current opacity-[0.05] rounded-full blur-[100px]" />
                </div>

                {/* Quick Stats */}
                <div className="space-y-4">
                    <div className="p-6 rounded-[2rem] bg-gray-900/50 border border-gray-800 hover:border-blue-500/30 transition-all group">
                        <div className="flex items-center justify-between mb-2">
                            <Bug className="w-5 h-5 text-red-400" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Incident Rate</span>
                        </div>
                        <p className="text-3xl font-black text-white">{(data?.metrics?.errorRate * 100).toFixed(2)}%</p>
                        <div className="w-full h-1.5 bg-gray-800 rounded-full mt-4 overflow-hidden">
                            <div
                                className="h-full bg-red-500 transition-all duration-1000"
                                style={{ width: `${Math.min(data?.metrics?.errorRate * 400, 100)}%` }}
                            />
                        </div>
                    </div>
                    <div className="p-6 rounded-[2rem] bg-gray-900/50 border border-gray-800 hover:border-purple-500/30 transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <Clock className="w-5 h-5 text-purple-400" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">P95 Latency</span>
                        </div>
                        <p className="text-3xl font-black text-white">{data?.metrics?.latency}ms</p>
                        <p className="text-xs text-blue-400 mt-2 font-medium">Synced with {data?.provider === 'vercel' ? 'Vercel Edge' : 'Netlify'}</p>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Incidents & Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Active Incident / Last Incident */}
                <div className="bg-black/40 border border-gray-800 rounded-[2.5rem] p-8 overflow-hidden relative">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-red-500" />
                        Incident Management
                    </h3>

                    {data?.lastIncident ? (
                        <div className="space-y-6">
                            <div className="p-6 rounded-3xl bg-red-500/5 border border-red-500/20">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <p className="text-sm font-bold text-red-400">Critical Breach Detected</p>
                                        <p className="text-xs text-gray-500 mt-1">{new Date(data.lastIncident.timestamp).toLocaleString()}</p>
                                    </div>
                                    <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-[10px] font-black uppercase">Active</span>
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                                    {data.lastIncident.description}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <Link
                                        href={`/projects/${id}/issues`}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs font-bold text-white hover:border-blue-500/50 transition-all"
                                    >
                                        <Bug className="w-3.5 h-3.5 text-blue-400" />
                                        View Generated Issue
                                        <ArrowUpRight className="w-3 h-3" />
                                    </Link>
                                    <Link
                                        href={`/projects/${id}/pull-requests`}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs font-bold text-white hover:border-purple-500/50 transition-all"
                                    >
                                        <GitPullRequest className="w-3.5 h-3.5 text-purple-400" />
                                        Review AI Proposal
                                        <ExternalLink className="w-3 h-3" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-3xl text-gray-600 gap-2">
                            <CheckCircle2 className="w-8 h-8 opacity-20" />
                            <p className="text-sm font-medium italic">No active incidents found</p>
                        </div>
                    )}
                </div>

                {/* Audit Logs / Raw Metrics */}
                <div className="bg-black/40 border border-gray-800 rounded-[2.5rem] p-8">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-gray-400" />
                        DeployOps Stream
                    </h3>
                    <div className="space-y-3 font-mono text-[11px]">
                        <div className="flex items-center gap-3 text-gray-500">
                            <span className="text-blue-500 opacity-50">[{new Date().toLocaleTimeString()}]</span>
                            <span>FETCHING_REAL_{data?.provider?.toUpperCase()}_METRICS</span>
                            <span className="ml-auto text-green-500">OK</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-500">
                            <span className="text-blue-500 opacity-50">[{new Date().toLocaleTimeString()}]</span>
                            <span>EVALUATING_THRESHOLDS</span>
                            <span className="ml-auto text-green-500">NOMINAL</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-400 bg-white/5 p-2 rounded-lg">
                            <span className="text-blue-500 opacity-80">[{new Date(data?.lastChecked).toLocaleTimeString()}]</span>
                            <span>HEARTBEAT_SAVED_TO_MONGO</span>
                            <span className="ml-auto text-blue-400">VERIFIED</span>
                        </div>
                        <div className="h-px bg-gray-800 my-4" />
                        <div className="text-gray-600 italic">
                            Waiting for system events on {data?.provider}...
                        </div>
                    </div>
                </div>
            </div>
            {/* Deployment Orchestration Section */}
            <div className="pt-8 border-t border-gray-800/50">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-white flex items-center gap-3">
                            <Rocket className="w-8 h-8 text-indigo-500" />
                            Deployment Orchestration
                        </h2>
                        <p className="text-gray-500 mt-1 font-medium italic">Triggered builds & real-time delivery logs.</p>
                    </div>
                    {data?.config?.deployProvider && !showDeploySetup && (
                        <button
                            onClick={() => {
                                setShowDeploySetup(true);
                                setDeployConfig({
                                    provider: data.config.deployProvider,
                                    netlifySiteId: data.config.netlifySiteId || "",
                                    netlifyToken: data.config.netlifyToken || "",
                                    renderDeployHook: data.config.renderDeployHook || "",
                                    renderServiceName: data.config.renderServiceName || "",
                                    productionUrl: data.config.productionUrl || ""
                                });
                            }}
                            className="text-[10px] font-black uppercase text-gray-500 hover:text-white transition-colors flex items-center gap-2"
                        >
                            <Server className="w-3 h-3" />
                            Change Provider
                        </button>
                    )}
                </div>

                {!data?.config?.deployProvider || showDeploySetup ? (
                    <div className="bg-gray-900/30 border border-dashed border-gray-800 rounded-[3rem] p-12 text-center animate-in zoom-in-95 duration-500">
                        <div className="max-w-md mx-auto space-y-8">
                            <div className="p-1 bg-black/40 rounded-2xl flex">
                                <button
                                    onClick={() => setDeployConfig({ ...deployConfig, provider: 'netlify' })}
                                    className={cn("flex-1 py-3 rounded-xl font-bold transition-all", deployConfig.provider === 'netlify' ? "bg-white text-black" : "text-gray-500 hover:text-white")}
                                >
                                    Netlify
                                </button>
                                <button
                                    onClick={() => setDeployConfig({ ...deployConfig, provider: 'render' })}
                                    className={cn("flex-1 py-3 rounded-xl font-bold transition-all", deployConfig.provider === 'render' ? "bg-blue-600 text-white" : "text-gray-500 hover:text-white")}
                                >
                                    Render
                                </button>
                            </div>

                            <form onSubmit={handleSaveDeployConfig} className="space-y-6 text-left">
                                {deployConfig.provider === 'netlify' ? (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Netlify Site ID</label>
                                            <input
                                                required
                                                value={deployConfig.netlifySiteId}
                                                onChange={e => setDeployConfig({ ...deployConfig, netlifySiteId: e.target.value })}
                                                className="w-full px-6 py-4 bg-black/50 border border-gray-800 rounded-2xl text-white font-mono text-sm focus:border-blue-500 outline-none"
                                                placeholder="e.g. 5a2b3c4d..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Personal Access Token</label>
                                            <input
                                                required
                                                type="password"
                                                value={deployConfig.netlifyToken}
                                                onChange={e => setDeployConfig({ ...deployConfig, netlifyToken: e.target.value })}
                                                className="w-full px-6 py-4 bg-black/50 border border-gray-800 rounded-2xl text-white font-mono text-sm focus:border-blue-500 outline-none"
                                                placeholder="nfp_..."
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Deploy Hook URL</label>
                                            <input
                                                required
                                                value={deployConfig.renderDeployHook}
                                                onChange={e => setDeployConfig({ ...deployConfig, renderDeployHook: e.target.value })}
                                                className="w-full px-6 py-4 bg-black/50 border border-gray-800 rounded-2xl text-white font-mono text-sm focus:border-blue-500 outline-none"
                                                placeholder="https://api.render.com/deploy/..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Service Name (Optional)</label>
                                            <input
                                                value={deployConfig.renderServiceName}
                                                onChange={e => setDeployConfig({ ...deployConfig, renderServiceName: e.target.value })}
                                                className="w-full px-6 py-4 bg-black/50 border border-gray-800 rounded-2xl text-white font-mono text-sm focus:border-blue-500 outline-none"
                                                placeholder="e.g. frontend-prod"
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Production URL (Optional)</label>
                                    <input
                                        type="url"
                                        value={deployConfig.productionUrl}
                                        onChange={e => setDeployConfig({ ...deployConfig, productionUrl: e.target.value })}
                                        className="w-full px-6 py-4 bg-black/50 border border-gray-800 rounded-2xl text-white font-mono text-sm focus:border-blue-500 outline-none"
                                        placeholder="https://your-site.com"
                                    />
                                </div>

                                <div className="flex gap-4">
                                    {data?.config?.deployProvider && <button type="button" onClick={() => setShowDeploySetup(false)} className="flex-1 py-4 font-bold text-gray-500">Cancel</button>}
                                    <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50">
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Save Configuration"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        <div className="xl:col-span-1 space-y-6">
                            <div className="p-8 rounded-[2.5rem] bg-gray-900/50 border border-gray-800 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    {data?.config?.deployProvider === 'netlify' ? <Globe className="w-20 h-20" /> : <Server className="w-20 h-20" />}
                                </div>
                                <div className="space-y-6 relative z-10">
                                    <div className="flex items-center justify-between">
                                        <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                                            {data?.config?.deployProvider}
                                        </div>
                                        <div className={cn(
                                            "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                            deployStatus === 'live' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                                deployStatus === 'deploying' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse" :
                                                    "bg-red-500/10 text-red-400 border border-red-500/20"
                                        )}>
                                            <div className={cn("w-1.5 h-1.5 rounded-full", deployStatus === 'live' ? "bg-emerald-500" : deployStatus === 'deploying' ? "bg-blue-500" : "bg-red-500")} />
                                            {deployStatus}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Authenticated Site</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xl font-bold text-white font-mono truncate">
                                                {data?.config?.renderDeployHook ? "Render Service" : data?.config?.netlifySiteId}
                                            </p>
                                            {data?.config?.productionUrl && (
                                                <Link href={data.config.productionUrl} target="_blank" className="text-blue-500 hover:text-blue-400">
                                                    <ExternalLink className="w-4 h-4" />
                                                </Link>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleTriggerDeploy}
                                        disabled={isDeploying || deployStatus === 'deploying'}
                                        className="w-full py-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                                    >
                                        {isDeploying || deployStatus === 'deploying' ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Deploying...
                                            </>
                                        ) : (
                                            <>
                                                <Rocket className="w-5 h-5" />
                                                Deploy Now
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="xl:col-span-2">
                            <div className="bg-black border border-gray-800 rounded-[2.5rem] p-1 overflow-hidden h-full flex flex-col shadow-2xl">
                                <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Terminal className="w-4 h-4 text-gray-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Provider Build Logs</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20" />
                                    </div>
                                </div>
                                <div className="flex-1 p-6 font-mono text-[11px] text-gray-400 overflow-y-auto max-h-[350px] custom-scrollbar bg-black/50">
                                    {deployLogs ? (
                                        <pre className="whitespace-pre-wrap leading-relaxed">
                                            {deployLogs}
                                        </pre>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center gap-3 opacity-20">
                                            <Terminal className="w-8 h-8" />
                                            <p className="font-bold uppercase tracking-tighter">Ready for orchestration</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function GitPullRequest(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="18" cy="18" r="3" />
            <circle cx="6" cy="6" r="3" />
            <path d="M13 6h3a2 2 0 0 1 2 2v7" />
            <line x1="6" y1="9" x2="6" y2="21" />
        </svg>
    );
}
