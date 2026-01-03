"use client";

import { useEffect, useState, use } from "react";
import {
    Plus,
    Sparkles,
    Trash2,
    ArrowLeft,
    Lightbulb,
    CheckCircle2,
    Loader2,
    Save,
    Layout,
    RefreshCw
} from "lucide-react";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

interface AffinityItem {
    _id: string;
    content: string;
    groupId: string | null;
    color: string;
}

interface AffinityGroup {
    _id: string;
    title: string;
    color: string;
    order: number;
}

const STICKY_COLORS = [
    { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-100', hover: 'hover:shadow-yellow-500/5', accent: 'bg-yellow-500' },
    { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-100', hover: 'hover:shadow-green-500/5', accent: 'bg-green-500' },
    { bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-100', hover: 'hover:shadow-pink-500/5', accent: 'bg-pink-500' },
    { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-100', hover: 'hover:shadow-blue-500/5', accent: 'bg-blue-500' },
    { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-100', hover: 'hover:shadow-purple-500/5', accent: 'bg-purple-500' },
    { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-100', hover: 'hover:shadow-orange-500/5', accent: 'bg-orange-500' },
];

export default function AffinityBoardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [groups, setGroups] = useState<AffinityGroup[]>([]);
    const [items, setItems] = useState<AffinityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAILearning, setIsAILearning] = useState(false);
    const [isConverting, setIsConverting] = useState(false);

    // Modals/Input state
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [newItemContent, setNewItemContent] = useState("");
    const [isAddingGroup, setIsAddingGroup] = useState(false);
    const [newGroupTitle, setNewGroupTitle] = useState("");

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`/api/projects/${id}/affinity`);
            const data = await res.json();
            setGroups(data.groups || []);
            setItems(data.items || []);
        } catch (e) {
            console.error("Fetch error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const onDragEnd = async (result: any) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        // Move item locally
        const newGroupId = destination.droppableId === 'ungrouped' ? null : destination.droppableId;

        setItems(prevItems => prevItems.map(item =>
            item._id === draggableId ? { ...item, groupId: newGroupId } : item
        ));

        // Sync to API
        try {
            await fetch(`/api/projects/${id}/affinity/items/${draggableId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId: newGroupId })
            });
        } catch (e) {
            console.error(e);
            // Revert state on error for consistency
            fetchData();
        }
    };

    const handleAddItem = async () => {
        if (!newItemContent.trim()) return;
        try {
            const res = await fetch(`/api/projects/${id}/affinity`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'item', content: newItemContent })
            });
            const data = await res.json();
            setItems([...items, data.data]);
            setNewItemContent("");
            setIsAddingItem(false);
        } catch (e) {
            console.error(e);
        }
    };

    const handleAddGroup = async () => {
        if (!newGroupTitle.trim()) return;
        try {
            const res = await fetch(`/api/projects/${id}/affinity`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'group', title: newGroupTitle, color: 'bg-gray-800' })
            });
            const data = await res.json();
            setGroups([...groups, data.data]);
            setNewGroupTitle("");
            setIsAddingGroup(false);
        } catch (e) {
            console.error(e);
        }
    };

    const handleMagicCategorize = async () => {
        setIsAILearning(true);
        try {
            const res = await fetch(`/api/projects/${id}/affinity/categorize`, { method: 'POST' });
            if (res.ok) {
                fetchData();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsAILearning(false);
        }
    };

    const handleConvertToRequirements = async () => {
        if (!confirm("This will generate formal requirements based on these groups. Proceed?")) return;
        setIsConverting(true);
        try {
            const res = await fetch(`/api/projects/${id}/affinity/convert-to-requirements`, { method: 'POST' });
            if (res.ok) {
                alert("Requirements generated successfully!");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsConverting(false);
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        try {
            await fetch(`/api/projects/${id}/affinity/items/${itemId}`, { method: 'DELETE' });
            setItems(items.filter(i => i._id !== itemId));
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteGroup = async (groupId: string) => {
        if (!confirm("Are you sure? Items in this group will be ungrouped.")) return;
        try {
            await fetch(`/api/projects/${id}/affinity/groups/${groupId}`, { method: 'DELETE' });
            setGroups(groups.filter(g => g._id !== groupId));
            setItems(items.map(i => i.groupId === groupId ? { ...i, groupId: null } : i));
        } catch (e) {
            console.error(e);
        }
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-black"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;

    return (
        <div className="flex flex-col min-h-screen bg-black overflow-x-hidden">
            {/* Header */}
            <header className="px-8 py-6 border-b border-gray-800 bg-black/50 backdrop-blur-md flex items-center justify-between shrink-0 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Link href={`/projects/${id}`} className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            Ideation Board
                            <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
                        </h1>
                        <p className="text-gray-400 text-sm mt-0.5">Brainstorm and map out features with AI-powered clusterization.</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleMagicCategorize}
                        disabled={isAILearning}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
                    >
                        {isAILearning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        AI Magic Categorize
                    </button>
                    <button
                        onClick={handleConvertToRequirements}
                        disabled={isConverting}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isConverting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Export to Requirements
                    </button>
                </div>
            </header>

            {/* Board Area - GRID LAYOUT */}
            <main className="flex-1 p-10">
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 items-start">
                        {/* UNGROUPED Column */}
                        <div className="shrink-0 bg-gray-900/40 border border-dashed border-gray-700 rounded-3xl p-6 flex flex-col gap-6 h-[400px] max-sm:order-first">
                            <div className="flex items-center justify-between shrink-0">
                                <h3 className="text-sm font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4 text-yellow-500" />
                                    Ungrouped Ideas
                                </h3>
                                <button
                                    onClick={() => setIsAddingItem(true)}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            {isAddingItem && (
                                <div className="space-y-4 p-4 bg-gray-800 rounded-2xl border border-gray-700 animate-in fade-in slide-in-from-top-4">
                                    <textarea
                                        autoFocus
                                        value={newItemContent}
                                        onChange={(e) => setNewItemContent(e.target.value)}
                                        placeholder="Type an idea..."
                                        className="w-full bg-transparent border-none text-white text-sm focus:ring-0 resize-none min-h-[100px]"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={handleAddItem} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500">Save Idea</button>
                                        <button onClick={() => setIsAddingItem(false)} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-xl text-xs font-bold hover:bg-gray-600">Cancel</button>
                                    </div>
                                </div>
                            )}

                            <Droppable droppableId="ungrouped">
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-col gap-4 flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
                                        {items.filter(i => !i.groupId).map((item, index) => (
                                            <Draggable key={item._id} draggableId={item._id} index={index}>
                                                {(provided) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className={`p-6 bg-yellow-400/5 border border-yellow-400/20 text-yellow-100 rounded-2xl shadow-xl hover:shadow-yellow-500/5 transition-all group relative`}
                                                    >
                                                        <button
                                                            onClick={() => handleDeleteItem(item._id)}
                                                            className="absolute top-2 right-2 p-1 rounded-md bg-black/40 text-gray-500 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <p className="text-sm font-medium leading-relaxed">{item.content}</p>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>

                        {/* Group Columns */}
                        {groups.map((group, index) => {
                            const color = STICKY_COLORS[index % STICKY_COLORS.length];
                            return (
                                <div key={group._id} className="bg-gray-900 border border-gray-800 rounded-3xl p-6 flex flex-col gap-6 shadow-2xl overflow-hidden relative group/col h-[400px]">
                                    <div className={`absolute top-0 left-0 w-full h-1 ${color.accent}/40 shadow-[0_0_15px_rgba(59,130,246,0.3)]`} />

                                    <div className="flex items-center justify-between shrink-0">
                                        <h3 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${color.accent} shadow-[0_0_8px_rgba(59,130,246,0.5)]`} />
                                            {group.title}
                                        </h3>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-gray-600 bg-gray-800 px-2.5 py-1 rounded-full border border-gray-700">
                                                {items.filter(i => i.groupId === group._id).length}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteGroup(group._id)}
                                                className="p-1 rounded-md text-gray-600 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover/col:opacity-100"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <Droppable droppableId={group._id}>
                                        {(provided) => (
                                            <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-col gap-4 flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
                                                {items.filter(i => i.groupId === group._id).map((item, index) => (
                                                    <Draggable key={item._id} draggableId={item._id} index={index}>
                                                        {(provided) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                className={`p-6 ${color.bg} border ${color.border} ${color.text} rounded-2xl shadow-lg ${color.hover} transition-all group relative`}
                                                            >
                                                                <button
                                                                    onClick={() => handleDeleteItem(item._id)}
                                                                    className="absolute top-2 right-2 p-1 rounded-md bg-black/40 text-gray-500 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <p className="text-sm font-medium leading-relaxed">{item.content}</p>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            );
                        })}

                        {/* Add Group Column */}
                        <div className="shrink-0 h-40 border border-dashed border-gray-800 rounded-3xl p-6 flex items-center justify-center hover:bg-gray-900/40 transition-all hover:border-gray-600">
                            {isAddingGroup ? (
                                <div className="w-full space-y-4">
                                    <input
                                        autoFocus
                                        value={newGroupTitle}
                                        onChange={(e) => setNewGroupTitle(e.target.value)}
                                        placeholder="Group Name..."
                                        className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-xl focus:outline-none focus:border-blue-500"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={handleAddGroup} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20">Add Group</button>
                                        <button onClick={() => setIsAddingGroup(false)} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-xl text-xs font-bold">X</button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsAddingGroup(true)}
                                    className="flex flex-col items-center gap-3 text-gray-500 hover:text-gray-300 group"
                                >
                                    <div className="p-4 rounded-2xl bg-gray-900 border border-gray-800 group-hover:border-gray-600 transition-all">
                                        <Layout className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest">New Category</span>
                                </button>
                            )}
                        </div>
                    </div>
                </DragDropContext>
            </main>
        </div>
    );
}
