"use client";

import { useState, useEffect, useRef } from "react";
import {
    Bot,
    X,
    Send,
    Loader2,
    Sparkles,
    MessageSquare,
    Terminal,
    Github,
    Play,
    RotateCcw,
    PlusCircle
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Message {
    role: "user" | "assistant";
    content: string;
    action?: any;
    timestamp: Date;
}

export function AiAssistant() {
    const { status } = useSession();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [siteData, setSiteData] = useState<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const isHidden = pathname === "/login" || status !== "authenticated";

    // Load messages
    useEffect(() => {
        const savedMessages = localStorage.getItem("ai_assistant_messages");
        if (savedMessages) {
            try {
                const parsed = JSON.parse(savedMessages);
                setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
            } catch (e) {
                console.error("Failed to load AI messages", e);
            }
        }
    }, []);

    // Save messages
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem("ai_assistant_messages", JSON.stringify(messages));
        }
    }, [messages]);

    // Fetch context
    const fetchContext = async () => {
        try {
            const res = await fetch("/api/stats");
            const data = await res.json();
            setSiteData(data);
        } catch (e) {
            console.error("Failed to fetch AI context", e);
        }
    };

    useEffect(() => {
        fetchContext();
        const interval = setInterval(fetchContext, 60000);
        return () => clearInterval(interval);
    }, []);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading, isOpen]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const userMsg: Message = {
            role: "user",
            content: inputValue,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/ai-assistant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: messages.concat(userMsg).map(m => ({ role: m.role, content: m.content })),
                    context: {
                        currentRoute: pathname,
                        siteData: siteData
                    }
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            const assistantMsg: Message = {
                role: "assistant",
                content: data.message,
                action: data.action,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMsg]);
        } catch (error: any) {
            setMessages(prev => [...prev, {
                role: "assistant",
                content: `❌ Error: ${error.message}. Please try again.`,
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const executeAction = async (action: any, msgIndex: number) => {
        try {
            setIsLoading(true);
            let endpoint = "";
            let body: any = {};

            switch (action.type) {
                case 'create_issue':
                    endpoint = `/api/projects/${action.params.projectId}/issues`;
                    body = {
                        title: action.params.title,
                        description: action.params.description,
                        type: action.params.priority === 'critical' ? 'bug' : 'improvement',
                        assignedTo: 'ai'
                    };
                    break;
                case 'create_task':
                    endpoint = `/api/tasks`;
                    body = {
                        title: action.params.title,
                        description: action.params.description,
                        priority: action.params.priority || 'medium',
                        projectId: action.params.projectId,
                        assignedTo: action.params.assignedTo
                    };
                    break;
                case 'sync_github':
                    endpoint = `/api/projects/${action.params.projectId}/sync-github`;
                    break;
                case 'trigger_autofix':
                    endpoint = `/api/autofix`;
                    body = {
                        issueUrl: action.params.issueUrl,
                        repoUrl: action.params.repoUrl,
                        projectId: action.params.projectId
                    };
                    break;
                case 'deploy':
                    endpoint = `/api/projects/${action.params.projectId}/deploy/trigger`;
                    break;
                case 'merge':
                    endpoint = `/api/monitoring/pull-requests/${action.params.prId}/merge`;
                    body = { mergeMethod: action.params.mergeMethod || 'squash' };
                    break;
                case 'rollback':
                    endpoint = `/api/projects/${action.params.projectId}/rollback`;
                    body = {
                        prNumber: action.params.prNumber,
                        commitSha: action.params.commitSha
                    };
                    break;
            }

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            const result = await res.json();
            if (res.ok) {
                setMessages(prev => [...prev, {
                    role: "assistant",
                    content: `✅ Action Successful: ${action.type.replace('_', ' ')} has been executed.`,
                    timestamp: new Date()
                }]);
                setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, action: null } : m));
                fetchContext();
            } else {
                throw new Error(result.error || "Action failed");
            }
        } catch (e: any) {
            setMessages(prev => [...prev, {
                role: "assistant",
                content: `❌ Action Failed: ${e.message}`,
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (isHidden) return null;

    return (
        <>
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "fixed bottom-6 right-6 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl z-[100] transition-all",
                    isOpen ? "bg-red-500 hover:bg-red-600 rotate-90" : "bg-gradient-to-br from-blue-600 to-purple-600 hover:shadow-blue-500/50"
                )}
            >
                {isOpen ? <X className="w-8 h-8 text-white" /> : <Bot className="w-8 h-8 text-white" />}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
                    </span>
                )}
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed bottom-24 right-6 w-[450px] h-[650px] bg-[#0A0A0A] border border-gray-800 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] z-[99] flex flex-col overflow-hidden"
                    >
                        <div className="p-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-b border-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                                    <Bot className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white uppercase tracking-widest text-sm flex items-center gap-2">
                                        DeployOps Copilot <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />
                                    </h3>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">DevOps AI Assistant • Online</p>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                                    <MessageSquare className="w-12 h-12 text-gray-600" />
                                    <div>
                                        <p className="text-white font-bold uppercase tracking-widest text-xs">Awaiting Instructions</p>
                                        <p className="text-[10px] text-gray-500 mt-1 max-w-[200px]">Ask about deployments, PRs, or issues. I can also perform actions like rollbacks or merges.</p>
                                    </div>
                                </div>
                            )}

                            {messages.map((msg, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={cn("flex flex-col gap-2", msg.role === 'user' ? "items-end" : "items-start")}
                                >
                                    <div className={cn(
                                        "max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed",
                                        msg.role === 'user' ? "bg-blue-600 text-white rounded-tr-none" : "bg-gray-900 border border-gray-800 text-gray-200 rounded-tl-none font-medium"
                                    )}>
                                        <div className="prose prose-invert prose-sm max-w-none">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    </div>

                                    {msg.action && (
                                        <div className="mt-2 w-full max-w-[85%] animate-in fade-in slide-in-from-top-2">
                                            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                                                <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-widest">
                                                    <Terminal className="w-3 h-3" /> Pending Action: {msg.action.type.replace('_', ' ')}
                                                </div>
                                                <button
                                                    onClick={() => executeAction(msg.action, idx)}
                                                    className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20"
                                                >
                                                    {msg.action.type === 'deploy' && <Play className="w-3 h-3" />}
                                                    {msg.action.type === 'rollback' && <RotateCcw className="w-3 h-3" />}
                                                    {msg.action.type === 'create_issue' && <PlusCircle className="w-3 h-3" />}
                                                    {msg.action.type === 'merge' && <Github className="w-3 h-3" />}
                                                    Execute Action
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <span className="text-[10px] text-gray-600 font-mono">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </motion.div>
                            ))}

                            {isLoading && (
                                <div className="flex items-center gap-3 italic text-gray-500 text-xs px-2 animate-pulse">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Copilot is thinking...
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-gray-900/50 border-t border-gray-800">
                            <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Ask DeployOps Copilot..."
                                    className="flex-1 bg-black/50 border border-gray-700 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all placeholder-gray-600 pr-12"
                                />
                                <button type="submit" disabled={!inputValue.trim() || isLoading} className="absolute right-2 p-3 bg-blue-600 rounded-xl text-white hover:bg-blue-500 disabled:opacity-50 transition-all">
                                    <Send className="w-4 h-4" />
                                </button>
                            </form>
                            <p className="mt-3 text-[10px] text-gray-600 text-center uppercase font-black tracking-widest opacity-50">Secure Intranet Assistant • End-to-End Encrypted</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
