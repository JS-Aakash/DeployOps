"use client";

import { useEffect, useState, useRef, use } from "react";
import {
    MessageSquare,
    Send,
    Bot,
    User as UserIcon,
    ArrowLeft,
    Loader2,
    Sparkles,
    ShieldAlert
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Message {
    _id: string;
    senderType: 'human' | 'ai';
    senderName: string;
    content: string;
    createdAt: string;
}

export default function ProjectChatPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: session, status } = useSession();
    const [messages, setMessages] = useState<Message[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);

    // Mention Logic State
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionQuery, setSuggestionQuery] = useState("");
    const [cursorPosition, setCursorPosition] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchMessages = async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            const res = await fetch(`/api/projects/${id}/chat`);
            const data = await res.json();
            if (Array.isArray(data)) setMessages(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMembers = async () => {
        try {
            const res = await fetch(`/api/projects/${id}/members`);
            const data = await res.json();
            if (Array.isArray(data)) setMembers(data);
        } catch (e) { console.error(e); }
    };

    // Initial fetch and polling
    useEffect(() => {
        fetchMessages();
        fetchMembers();
        const interval = setInterval(() => fetchMessages(true), 3000);
        return () => clearInterval(interval);
    }, [id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Handle Input Change for Mentions
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const pos = e.target.selectionStart || 0;
        setInputValue(value);
        setCursorPosition(pos);

        // Check for active mention
        // Look backwards from cursor to find the last '@'
        const textBeforeCursor = value.substring(0, pos);
        const lastAt = textBeforeCursor.lastIndexOf('@');

        if (lastAt !== -1) {
            // Ensure @ is either at start or preceded by space
            const isValidStart = lastAt === 0 || textBeforeCursor[lastAt - 1] === ' ';
            if (isValidStart) {
                const query = textBeforeCursor.substring(lastAt + 1);
                // Only show if params are simple (no spaces yet, usually)
                // But we allow spaces for search if we want robust search
                // For now, let's stop search if newline or special char
                if (!query.includes('\n')) {
                    setSuggestionQuery(query);
                    setShowSuggestions(true);
                    return;
                }
            }
        }
        setShowSuggestions(false);
    };

    const insertMention = (memberName: string) => {
        const textBeforeCursor = inputValue.substring(0, cursorPosition);
        const textAfterCursor = inputValue.substring(cursorPosition);
        const lastAt = textBeforeCursor.lastIndexOf('@');

        // Format: @"Name Name" if space, else @Name
        const mentionText = memberName.includes(' ') ? `@"${memberName}"` : `@${memberName}`;

        const newText = textBeforeCursor.substring(0, lastAt) + mentionText + " " + textAfterCursor;

        setInputValue(newText);
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    // Filtered Suggestions
    const filteredMembers = members.filter(m =>
        m.userId?.name?.toLowerCase().includes(suggestionQuery.toLowerCase())
    );

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isSending) return;

        const content = inputValue;
        setInputValue("");
        setIsSending(true);
        setShowSuggestions(false);

        try {
            const res = await fetch(`/api/projects/${id}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content,
                    senderName: session?.user?.name || "Human Developer",
                    senderId: session?.user?.email || "mock-user-123"
                })
            });

            if (res.ok) fetchMessages(true);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSending(false);
        }
    };

    const renderContent = (content: string) => {
        // Regex for quoted mentions, simple mentions, and @ai
        // Matches: @"..." OR @word
        const parts = content.split(/(@"[^"]+")|(@[a-zA-Z0-9_]+)/g).filter(Boolean);

        return parts.map((part, i) => {
            if (part.toLowerCase() === '@ai') {
                return <span key={i} className="text-blue-400 font-bold bg-blue-500/10 px-1 rounded">@ai</span>;
            } else if (part.startsWith('@"') && part.endsWith('"')) {
                // Quoted mention
                const name = part.substring(2, part.length - 1);
                return <span key={i} className="text-purple-400 font-bold bg-purple-500/10 px-1 rounded">@{name}</span>;
            } else if (part.startsWith('@')) {
                // Simple mention
                return <span key={i} className="text-purple-400 font-bold bg-purple-500/10 px-1 rounded">{part}</span>;
            } else {
                return part;
            }
        });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-12rem)] bg-gray-950/50 border border-gray-800 rounded-3xl overflow-hidden backdrop-blur-xl">
            {/* Header */}
            <div className="p-6 border-b border-gray-800 bg-gray-900/30 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/projects/${id}`} className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-blue-500" />
                            Project Channel
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">Collaborate with your team and @ai assistant.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-500 uppercase">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Live
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                        <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mb-4 border border-gray-800">
                            <MessageSquare className="w-8 h-8 text-gray-600" />
                        </div>
                        <h3 className="text-lg font-bold text-white">No messages yet</h3>
                        <p className="text-sm text-gray-500 mt-2 max-w-xs">Be the first to say hello! Mention <span className="text-blue-400 font-bold">@ai</span> to get technical guidance.</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg._id} className={`flex gap-4 ${msg.senderType === 'ai' ? 'bg-blue-500/5 -mx-6 px-6 py-4' : ''}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${msg.senderType === 'ai'
                                ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                                : 'bg-gray-800 border-gray-700 text-gray-400'
                                }`}>
                                {msg.senderType === 'ai' ? (
                                    <Bot className="w-5 h-5" />
                                ) : (
                                    <UserIcon className="w-5 h-5" />
                                )}
                            </div>
                            <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold ${msg.senderType === 'ai' ? 'text-blue-400' : 'text-white'}`}>
                                        {msg.senderName}
                                        {msg.senderType === 'ai' && <span className="ml-2 text-[10px] bg-blue-500/20 px-1.5 py-0.5 rounded uppercase tracking-tighter">AI Consultant</span>}
                                    </span>
                                    <span className="text-[10px] text-gray-600 font-mono italic">
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                                    {renderContent(msg.content)}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-gray-800 bg-gray-900/20 relative">
                {/* Suggestions Popup */}
                {showSuggestions && (filteredMembers.length > 0 || suggestionQuery === '') && (
                    <div className="absolute bottom-24 left-6 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-20">
                        <div className="px-3 py-2 bg-black/40 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-800">
                            Suggestions
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                            {/* Always show AI option first if matching */}
                            {'ai assistant'.includes(suggestionQuery.toLowerCase()) && (
                                <button
                                    onClick={() => insertMention('ai')}
                                    className="w-full text-left px-4 py-3 hover:bg-blue-600/20 hover:text-blue-400 transition-colors flex items-center gap-2 text-sm text-gray-300"
                                >
                                    <Bot className="w-4 h-4 text-blue-500" />
                                    AI Assistant
                                </button>
                            )}
                            {filteredMembers.map(m => (
                                <button
                                    key={m._id}
                                    onClick={() => insertMention(m.userId?.name || 'Unknown')}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm text-gray-300"
                                >
                                    <UserIcon className="w-4 h-4 text-gray-500" />
                                    {m.userId?.name || m.userId?.email}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSend} className="relative">
                    <input
                        ref={inputRef}
                        value={inputValue}
                        onChange={handleInputChange}
                        onClick={() => setShowSuggestions(false)}
                        placeholder="Type a message... (@ai for help, @user to notify)"
                        className="w-full bg-black/50 border border-gray-800 rounded-2xl pl-5 pr-14 py-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-gray-600"
                    />
                    <button
                        type="submit"
                        disabled={isSending || !inputValue.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all disabled:opacity-50 disabled:bg-gray-800"
                    >
                        {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </form>
                <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                        <div className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-blue-500" />
                            Mention @ai for Guidance
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-purple-500 font-bold">@</span>
                            Type @ to mention team
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
