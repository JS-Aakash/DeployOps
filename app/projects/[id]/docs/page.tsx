"use client";

import { useEffect, useState, use } from "react";
import {
    Book,
    Plus,
    Edit3,
    Save,
    X,
    ChevronRight,
    FileText,
    Code,
    Settings,
    Cpu,
    Info,
    ArrowLeft,
    Loader2,
    Sparkles,
    RefreshCw
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Doc {
    _id: string;
    title: string;
    content: string;
    category: 'architecture' | 'api' | 'setup' | 'ai-decisions' | 'general';
    createdBy: { name: string };
    updatedAt: string;
}

const CATEGORIES = [
    { id: 'architecture', label: 'Architecture', icon: Cpu, color: 'text-purple-400' },
    { id: 'api', label: 'API Reference', icon: Code, color: 'text-blue-400' },
    { id: 'setup', label: 'Setup Guide', icon: Settings, color: 'text-green-400' },
    { id: 'ai-decisions', label: 'AI Decisions', icon: Sparkles, color: 'text-yellow-400' },
    { id: 'general', label: 'General', icon: Info, color: 'text-gray-400' }
];


export default function ProjectDocsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: session } = useSession();
    const [docs, setDocs] = useState<Doc[]>([]);
    const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Form State
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState<Doc['category']>('general');

    const fetchDocs = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`/api/projects/${id}/docs`);
            const data = await res.json();
            setDocs(data);
            if (data.length > 0 && !selectedDoc) {
                setSelectedDoc(data[0]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDocs();
    }, [id]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = isCreating ? `/api/projects/${id}/docs` : `/api/projects/${id}/docs/${selectedDoc?._id}`;
        const method = isCreating ? "POST" : "PATCH";

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content, category })
            });

            if (res.ok) {
                const updated = await res.json();
                setIsEditing(false);
                setIsCreating(false);
                fetchDocs();
                setSelectedDoc(updated);
            } else {
                const err = await res.json();
                alert(`Error: ${err.error}`);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const startEdit = () => {
        if (!selectedDoc) return;
        setTitle(selectedDoc.title);
        setContent(selectedDoc.content);
        setCategory(selectedDoc.category);
        setIsEditing(true);
        setIsCreating(false);
    };

    const startCreate = () => {
        setTitle("");
        setContent("");
        setCategory('general');
        setIsCreating(true);
        setIsEditing(true);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <Link href={`/projects/${id}`} className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Technical Knowledge</h2>
                        <p className="text-gray-400 mt-1 italic">AUTHORITATIVE DOCUMENTATION • NOT PLANNING</p>
                    </div>
                </div>
                {!isEditing && (
                    <div className="flex gap-4">
                        <button
                            onClick={async () => {
                                setIsSyncing(true);
                                try {
                                    const res = await fetch(`/api/projects/${id}/docs/sync`, { method: 'POST' });
                                    if (res.ok) {
                                        fetchDocs();
                                        alert("Documentation synced with codebase!");
                                    } else {
                                        const err = await res.json();
                                        alert(`Sync failed: ${err.error}`);
                                    }
                                } finally {
                                    setIsSyncing(false);
                                }
                            }}
                            disabled={isSyncing}
                            className="flex items-center gap-2 px-6 py-3 bg-gray-900 border border-gray-800 text-gray-300 rounded-xl font-bold hover:bg-gray-800 hover:text-white transition-all disabled:opacity-50"
                        >
                            {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5 text-blue-500" />}
                            Auto-Sync Specs
                        </button>
                        <button
                            onClick={startCreate}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20"
                        >
                            <Plus className="w-5 h-5" />
                            Create Document
                        </button>
                    </div>
                )}
            </div>

            <div className="flex gap-8 h-full overflow-hidden">
                {/* Sidebar */}
                <aside className="w-72 flex-shrink-0 overflow-y-auto pr-2 space-y-8 custom-scrollbar">
                    {CATEGORIES.map(cat => {
                        const catDocs = docs.filter(d => d.category === cat.id);
                        if (catDocs.length === 0 && !isCreating) return null;

                        return (
                            <div key={cat.id} className="space-y-3">
                                <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${cat.color} flex items-center gap-2`}>
                                    <cat.icon className="w-3.5 h-3.5" />
                                    {cat.label}
                                </h3>
                                <div className="space-y-1">
                                    {catDocs.map(doc => (
                                        <button
                                            key={doc._id}
                                            onClick={() => {
                                                setSelectedDoc(doc);
                                                setIsEditing(false);
                                                setIsCreating(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-between group ${selectedDoc?._id === doc._id
                                                ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                                                : "text-gray-500 hover:bg-gray-800/50 hover:text-gray-300 border border-transparent"
                                                }`}
                                        >
                                            <span className="truncate uppercase tracking-tight">{doc.title}</span>
                                            <ChevronRight className={`w-4 h-4 transition-transform ${selectedDoc?._id === doc._id ? "translate-x-0" : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"}`} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                    {docs.length === 0 && !isLoading && !isCreating && (
                        <div className="text-center py-10 opacity-30 italic text-gray-400">
                            NO DOCUMENTS FOUND
                        </div>
                    )}
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 bg-gray-900/30 border border-gray-800 rounded-3xl overflow-hidden flex flex-col relative">
                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                        </div>
                    ) : isEditing ? (
                        <form onSubmit={handleSave} className="flex-1 flex flex-col p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                    {isCreating ? "New Document" : "Edit Document"}
                                </h3>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setIsEditing(false); setIsCreating(false); }}
                                        className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition-all font-bold text-xs uppercase"
                                    >
                                        <X className="w-4 h-4 mb-0.5 inline mr-1" /> Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-all font-bold text-xs uppercase shadow-lg shadow-blue-500/20"
                                    >
                                        <Save className="w-4 h-4 mb-0.5 inline mr-1" /> Save Knowledge
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Title</label>
                                    <input
                                        value={title} onChange={e => setTitle(e.target.value)} required
                                        className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none uppercase font-bold"
                                        placeholder="DOCUMENT TITLE..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Category</label>
                                    <select
                                        value={category} onChange={e => setCategory(e.target.value as any)}
                                        className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none uppercase font-bold appearance-none cursor-pointer"
                                    >
                                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5" /> Content (Markdown Supported)
                                </label>
                                <textarea
                                    value={content} onChange={e => setContent(e.target.value)} required
                                    className="flex-1 w-full bg-black/50 border border-gray-700 rounded-2xl px-6 py-5 text-gray-300 focus:border-blue-500 outline-none font-mono text-sm resize-none custom-scrollbar"
                                    placeholder="# Document Content..."
                                />
                            </div>
                        </form>
                    ) : selectedDoc ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="p-8 border-b border-gray-800 flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-blue-900/5 to-transparent">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase ${CATEGORIES.find(c => c.id === selectedDoc.category)?.color.replace('text', 'border').replace('400', '500/30')} bg-white/5`}>
                                            {selectedDoc.category}
                                        </span>
                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Updated {new Date(selectedDoc.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">{selectedDoc.title}</h1>
                                </div>
                                <button
                                    onClick={startEdit}
                                    className="p-3 rounded-xl bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-all border border-gray-700"
                                >
                                    <Edit3 className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar prose prose-invert max-w-none">
                                <div className="bg-blue-500/5 border-l-4 border-blue-500 p-4 mb-8 rounded-r-xl italic text-gray-400 text-sm">
                                    This documentation provides authoritative technical context for the AI and team.
                                </div>
                                <div className="prose prose-invert prose-blue max-w-none">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {selectedDoc.content}
                                    </ReactMarkdown>
                                </div>

                                <div className="mt-12 pt-8 border-t border-gray-800 flex items-center justify-between text-[10px] font-black text-gray-600 uppercase tracking-widest">
                                    <span>Created By: {selectedDoc.createdBy.name}</span>
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-3 h-3 text-blue-500" />
                                        <span>AI Context Optimized</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-20">
                            <Book className="w-16 h-16 text-gray-800 mb-6" />
                            <h3 className="text-xl font-bold text-gray-400 uppercase tracking-widest">No Document Selected</h3>
                            <p className="text-gray-600 mt-2 max-w-xs uppercase text-xs font-bold leading-relaxed">
                                Choose a technical guide from the sidebar or create a new architectural document.
                            </p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
