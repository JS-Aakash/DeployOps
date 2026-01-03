"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Sparkles,
  GitPullRequest,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Users,
  Code2,
  Activity,
  TrendingUp,
  Clock,
  Zap,
  GitBranch,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Rocket,
  Target,
  BarChart3,
  Calendar,
  Bell,
  FileText
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface DashboardData {
  stats: {
    issues: number;
    prs: number;
    aiFixes: number;
    projects: number;
    members: number;
    criticalIssues: number;
    healthyProjects: number;
    tasksCompleted: number;
    mergedPrs: number;
  };
  recentActivity: any[];
  projectHealth: Array<{
    _id: string;
    name: string;
    status: 'healthy' | 'degraded' | 'critical';
    errorRate: number;
  }>;
  upcomingTasks: any[];
  notifications: any[];
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    fetch("/api/stats")
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const statsList = [
    {
      label: "Active Issues",
      value: data?.stats.issues || 0,
      change: "+12%",
      trend: "up",
      icon: AlertCircle,
      color: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/20"
    },
    {
      label: "PRs Created",
      value: data?.stats.prs || 0,
      change: "+24%",
      trend: "up",
      icon: GitPullRequest,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20"
    },
    {
      label: "AI Fixes",
      value: data?.stats.aiFixes || 0,
      change: "+156%",
      trend: "up",
      icon: Sparkles,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20"
    },
    {
      label: "Projects",
      value: data?.stats.projects || 0,
      change: "Stable",
      trend: "neutral",
      icon: Rocket,
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/20"
    },
  ];

  const quickActions = [
    { label: "Create Project", icon: Rocket, href: "/projects", color: "blue" },
    { label: "AI Fixer", icon: Sparkles, href: "/ai-fix", color: "purple" },
    { label: "View Tasks", icon: CheckCircle2, href: "/tasks", color: "green" },
    { label: "Monitoring", icon: Activity, href: "/monitoring", color: "amber" },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden p-8 md:p-12 rounded-3xl border border-gray-800 bg-gradient-to-br from-blue-950/30 via-gray-900 to-purple-950/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] -z-10 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/10 blur-[120px] -z-10 animate-pulse" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-6 text-center lg:text-left flex-1">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-bold">
              <Zap className="w-4 h-4" />
              AI-Powered DevOps Platform
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight">
              {greeting}, <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                {session?.user?.name?.split(' ')[0] || "Developer"}
              </span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl">
              Managing <span className="text-white font-bold">{data?.stats.projects || 0} active projects</span> with{" "}
              <span className="text-blue-400 font-bold">{data?.stats.aiFixes || 0} AI fixes</span> deployed.
              Your team is operating at peak efficiency.
            </p>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3 pt-4 justify-center lg:justify-start">
              {quickActions.map((action, i) => (
                <Link
                  key={i}
                  href={action.href}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all shadow-lg",
                    action.color === "blue" && "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20",
                    action.color === "purple" && "bg-purple-600 text-white hover:bg-purple-500 shadow-purple-500/20",
                    action.color === "green" && "bg-green-600 text-white hover:bg-green-500 shadow-green-500/20",
                    action.color === "amber" && "bg-amber-600 text-white hover:bg-amber-500 shadow-amber-500/20"
                  )}
                >
                  <action.icon className="w-4 h-4" />
                  {action.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Animated Visual */}
          <div className="relative">
            <div className="w-64 h-64 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-1 animate-spin-slow">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                <Code2 className="w-24 h-24 text-blue-400 animate-pulse" />
              </div>
            </div>
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-blue-500/20 rounded-full blur-xl animate-ping" />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-purple-500/20 rounded-full blur-xl animate-ping" style={{ animationDelay: '1s' }} />
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsList.map((stat, i) => (
          <div
            key={i}
            className={cn(
              "p-6 rounded-2xl border bg-black/40 backdrop-blur-sm group hover:scale-105 transition-all duration-300 cursor-pointer",
              stat.border
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center", stat.bg)}>
                <stat.icon className={cn("w-7 h-7", stat.color)} />
              </div>
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold",
                stat.trend === "up" ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"
              )}>
                {stat.trend === "up" && <TrendingUp className="w-3 h-3" />}
                {stat.change}
              </div>
            </div>
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">{stat.label}</p>
            <h3 className="text-4xl font-bold text-white mt-2">
              {isLoading ? "..." : stat.value}
            </h3>
          </div>
        ))}
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-500" />
              Recent AI Activity
            </h3>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-400 font-bold">Live</span>
            </div>
          </div>

          <div className="space-y-4 max-h-[740px] overflow-y-auto pr-2 custom-scrollbar">
            {isLoading ? (
              <div className="p-16 text-center border border-dashed border-gray-800 rounded-3xl">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
                <p className="text-gray-500">Loading activity...</p>
              </div>
            ) : data?.recentActivity.length === 0 ? (
              <div className="p-16 text-center bg-gray-900/20 rounded-3xl border border-gray-800">
                <Sparkles className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-400 text-lg font-medium">No recent AI fixes</p>
                <p className="text-gray-600 text-sm mt-2">Start by running an AI fix on your issues</p>
                <Link
                  href="/ai-fix"
                  className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  Start AI Fix
                </Link>
              </div>
            ) : (
              data?.recentActivity.map((item, i) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between p-5 rounded-2xl border border-gray-800 bg-gradient-to-r from-gray-900/50 to-gray-900/30 hover:border-blue-500/30 transition-all group"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={cn(
                      "w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform",
                      item.type === 'requirement' ? "bg-purple-500/10 border-purple-500/20" :
                        item.status === 'ai_running' ? "bg-amber-500/10 border-amber-500/20" :
                          item.status === 'closed' ? "bg-blue-500/10 border-blue-500/20" :
                            "bg-green-500/10 border-green-500/20"
                    )}>
                      {item.type === 'requirement' ? (
                        <FileText className="w-6 h-6 text-purple-500" />
                      ) : item.status === 'ai_running' ? (
                        <Zap className="w-6 h-6 text-amber-500 animate-pulse" />
                      ) : item.status === 'closed' ? (
                        <GitPullRequest className="w-6 h-6 text-blue-500" />
                      ) : (
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-bold truncate tracking-tight">{item.title}</h4>
                      <p className="text-sm text-gray-500 truncate">{item.description || 'AI-generated content'}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-600 font-mono">
                          {item.projectId?.repo || "deployops"}
                        </span>
                        <div className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          item.type === 'requirement' ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                            item.status === 'ai_running' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                              item.status === 'pr_created' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                                "bg-green-500/10 text-green-400 border border-green-500/20"
                        )}>
                          {item.type === 'requirement' ? "Technical Spec" : item.status === 'ai_running' ? "AI Scaling" : item.status === 'pr_created' ? "PR Created" : "Completed"}
                        </div>
                      </div>
                    </div>
                  </div>
                  {(item.prUrl || item.status === 'pr_created') ? (
                    <Link
                      href={`/monitoring/pull-requests/${item._id}`}
                      className="px-4 py-2 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-lg text-sm font-bold hover:bg-blue-600/20 transition-all shrink-0"
                    >
                      {item.prUrl ? "Review Fix" : "Processing"}
                    </Link>
                  ) : item.type === 'requirement' && (
                    <Link
                      href={`/projects/${item.projectId?._id || item.projectId}/requirements`}
                      className="px-4 py-2 bg-purple-600/10 border border-purple-500/20 text-purple-400 rounded-lg text-sm font-bold hover:bg-purple-600/20 transition-all shrink-0"
                    >
                      View Spec
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 mb-12">
          {/* Project Health */}
          <div className="p-6 rounded-3xl border border-gray-800 bg-gradient-to-br from-gray-900/50 to-black/50 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-green-500" />
                Project Health
              </h3>
              <Link href="/monitoring" className="text-xs text-blue-400 hover:text-blue-300">
                View All →
              </Link>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-300">Healthy</span>
                </div>
                <span className="text-lg font-bold text-green-400">
                  {data?.stats.healthyProjects || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-gray-300">Critical</span>
                </div>
                <span className="text-lg font-bold text-red-400">
                  {data?.stats.criticalIssues || 0}
                </span>
              </div>
            </div>

            <Link
              href="/monitoring"
              className="block w-full text-center py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm font-bold text-gray-300 hover:bg-gray-700 transition-all"
            >
              View Dashboard
            </Link>
          </div>

          {/* Team Overview */}
          <div className="p-6 rounded-3xl border border-gray-800 bg-gradient-to-br from-purple-900/10 to-black/50 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              Team Overview
            </h3>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Users className="w-8 h-8 text-purple-500" />
              </div>
              <div>
                <h4 className="text-2xl font-bold text-white">{data?.stats.members || 0}</h4>
                <p className="text-sm text-gray-500">Active Members</p>
              </div>
            </div>

            <div className="flex -space-x-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full border-2 border-black bg-gray-800 overflow-hidden ring-2 ring-gray-900"
                >
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 123}`} alt="user" />
                </div>
              ))}
              {(data?.stats.members || 0) > 5 && (
                <div className="w-10 h-10 rounded-full border-2 border-black bg-purple-600 flex items-center justify-center text-xs font-bold text-white ring-2 ring-gray-900">
                  +{(data?.stats.members || 0) - 5}
                </div>
              )}
            </div>

            <Link
              href="/admin"
              className="block w-full text-center py-3 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-500 transition-all"
            >
              Manage Team
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="p-6 rounded-3xl border border-gray-800 bg-gradient-to-br from-blue-900/10 to-black/50 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              This Week
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Tasks Completed</span>
                <span className="text-lg font-bold text-white">{data?.stats.tasksCompleted || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">PRs Merged</span>
                <span className="text-lg font-bold text-white">{data?.stats.mergedPrs || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Issues Resolved</span>
                <span className="text-lg font-bold text-white">{data?.recentActivity.filter(i => i.status === 'closed').length || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
