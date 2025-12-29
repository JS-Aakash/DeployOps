"use client";

import { useEffect, useState, use } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
    Plus,
    StickyNote as NoteIcon,
    Layout,
    ArrowLeft,
    Loader2,
    MoreVertical,
    FileText,
    ArrowRight
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AffinityGroup {
    _id: string;
    title: string;
    color: string;
}

interface AffinityItem {
    _id: string;
    content: string;
    groupId: string | null; // null for ungrouped
    color: string;
}

export default function AffinityBoardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [groups, setGroups] = useState<AffinityGroup[]>([]);
    const [items, setItems] = useState<AffinityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal States
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [noteContent, setNoteContent] = useState("");

    const [showGroupModal, setShowGroupModal] = useState(false);
    const [groupTitle, setGroupTitle] = useState("");

    const fetchBoard = async () => {
        try {
            const res = await fetch(`/api/projects/${id}/affinity`);
            const data = await res.json();
            if (data.groups) setGroups(data.groups);
            if (data.items) setItems(data.items);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBoard();
    }, [id]);

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        // Destination ID determines the group (or 'ungrouped')
        const newGroupId = destination.droppableId === 'ungrouped' ? null : destination.droppableId;

        // Optimistic Update
        const updatedItems = items.map(item =>
            item._id === draggableId ? { ...item, groupId: newGroupId } : item
        );
        setItems(updatedItems);

        // API Call
        try {
            await fetch(`/api/projects/${id}/affinity/items/${draggableId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ groupId: newGroupId })
            });
        } catch (e) {
            console.error("Failed to move item", e);
            fetchBoard(); // Revert on failure
        }
    };

    const handleCreateNote = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/projects/${id}/affinity`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: 'item',
                    content: noteContent,
                    color: 'bg-yellow-200' // Default yellow sticky
                })
            });
            if (res.ok) {
                setNoteContent("");
                setShowNoteModal(false);
                fetchBoard();
            }
        } catch (e) { console.error(e); }
    };

    const GROUP_COLORS = [
        'bg-red-900/40 border-red-900/60',
        'bg-green-900/40 border-green-900/60',
        'bg-blue-900/40 border-blue-900/60',
        'bg-purple-900/40 border-purple-900/60',
        'bg-orange-900/40 border-orange-900/60',
        'bg-teal-900/40 border-teal-900/60',
        'bg-pink-900/40 border-pink-900/60',
    ];

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const randomColor = GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)];

            const res = await fetch(`/api/projects/${id}/affinity`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: 'group',
                    title: groupTitle,
                    color: randomColor
                })
            });
            if (res.ok) {
                setGroupTitle("");
                setShowGroupModal(false);
                fetchBoard();
            }
        } catch (e) { console.error(e); }
    };

    const convertToRequirement = async (groupId: string) => {
        if (!confirm("This will create a new drafted Requirement from this group. Continue?")) return;

        try {
            const res = await fetch(`/api/projects/${id}/affinity/groups/${groupId}/convert`, {
                method: "POST"
            });
            const data = await res.json();
            if (res.ok) {
                alert("Requirement Created! Check the Requirements tab.");
            } else {
                alert("Error: " + data.error);
            }
        } catch (e) {
            alert("Failed to convert");
        }
    };

    // Filter items
    const ungroupedItems = items.filter(i => i.groupId === null);
    const getGroupItems = (groupId: string) => items.filter(i => i.groupId === groupId);

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                    <Link href={`/projects/${id}`} className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Affinity Ideation</h2>
                        <p className="text-gray-400 mt-1">Group raw ideas into concepts before defining requirements.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowGroupModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-xl font-bold hover:bg-gray-700 transition-all"
                    >
                        <Layout className="w-4 h-4" />
                        New Group
                    </button>
                    <button
                        onClick={() => setShowNoteModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        Add Note
                    </button>
                </div>
            </div>

            {/* Board Area */}
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 min-h-0 flex overflow-hidden pb-4">

                    {/* Ungrouped Column (Fixed Left Sidebar) */}
                    <div className="w-72 flex-shrink-0 flex flex-col h-full border-r border-gray-800 pr-6 mr-6">
                        <div className="p-4 rounded-t-2xl bg-gray-900/80 border border-gray-800 backdrop-blur-sm border-b-0 flex-shrink-0">
                            <h3 className="font-bold text-gray-400 uppercase tracking-widest text-xs flex items-center justify-between">
                                Ungrouped Ideas
                                <span className="bg-gray-800 px-2 py-0.5 rounded text-white">{ungroupedItems.length}</span>
                            </h3>
                        </div>
                        <Droppable droppableId="ungrouped">
                            {(provided, snapshot) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className={`flex-1 bg-black/20 border border-gray-800 rounded-b-2xl p-4 overflow-y-auto custom-scrollbar space-y-3 ${snapshot.isDraggingOver ? 'bg-white/5' : ''
                                        }`}
                                >
                                    {ungroupedItems.map((item, index) => (
                                        <Draggable key={item._id} draggableId={item._id} index={index}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className={`p-4 rounded-xl text-gray-900 font-medium shadow-sm transform rotate-1 hover:rotate-0 transition-transform ${item.color}`}
                                                >
                                                    {item.content}
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                    {ungroupedItems.length === 0 && (
                                        <div className="text-center py-10 text-gray-600 text-sm italic border-2 border-dashed border-gray-800 rounded-xl">
                                            Drop ideas here
                                        </div>
                                    )}
                                </div>
                            )}
                        </Droppable>
                    </div>

                    {/* Groups Area (Scrollable Grid) */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6 pb-20">
                            {groups.map((group) => (
                                <div key={group._id} className="flex flex-col h-[400px]">
                                    <div className={`p-4 rounded-2xl flex flex-col h-full border backdrop-blur-sm ${group.color || 'bg-gray-900 border-gray-800'}`}>
                                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                            <h3 className="font-bold text-lg text-white">{group.title}</h3>
                                            <button
                                                onClick={() => convertToRequirement(group._id)}
                                                className="p-1.5 hover:bg-black/20 rounded text-white/50 hover:text-white transition-colors"
                                                title="Convert to Requirement"
                                            >
                                                <FileText className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <Droppable droppableId={group._id}>
                                            {(provided, snapshot) => (
                                                <div
                                                    {...provided.droppableProps}
                                                    ref={provided.innerRef}
                                                    className={`flex-1 rounded-xl p-3 overflow-y-auto custom-scrollbar space-y-3 ${snapshot.isDraggingOver ? 'bg-black/20' : ''
                                                        }`}
                                                >
                                                    {getGroupItems(group._id).map((item, index) => (
                                                        <Draggable key={item._id} draggableId={item._id} index={index}>
                                                            {(provided) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    className={`p-4 rounded-xl text-gray-900 font-medium shadow-sm ${item.color}`}
                                                                >
                                                                    {item.content}
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </div>
                                            )}
                                        </Droppable>

                                        <div className="mt-3 pt-3 border-t border-white/10 flex justify-center flex-shrink-0">
                                            <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">
                                                {getGroupItems(group._id).length} Items
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* New Group CTA (Grid Item) */}
                            <button
                                onClick={() => setShowGroupModal(true)}
                                className="flex flex-col h-[400px] justify-center items-center border-2 border-dashed border-gray-800 rounded-3xl opacity-50 hover:opacity-100 hover:bg-gray-900/50 hover:border-gray-700 transition-all group"
                            >
                                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Plus className="w-8 h-8 text-gray-500 group-hover:text-blue-500" />
                                </div>
                                <p className="text-gray-500 font-bold text-lg group-hover:text-white">Create New Group</p>
                            </button>
                        </div>
                    </div>

                </div>
            </DragDropContext>


            {/* Modals */}
            {/* Note Modal */}
            {showNoteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <form onSubmit={handleCreateNote} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl w-full max-w-md">
                        <h3 className="text-xl font-bold text-white mb-4">New Sticky Note</h3>
                        <textarea
                            autoFocus
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            className="w-full h-32 bg-yellow-100 text-gray-900 p-4 rounded-xl font-medium text-lg placeholder:text-gray-500/50 mb-4 focus:outline-none"
                            placeholder="Type your idea..."
                        />
                        <div className="flex gap-3 justify-end">
                            <button type="button" onClick={() => setShowNoteModal(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold">Add Stickie</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Group Modal */}
            {showGroupModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <form onSubmit={handleCreateGroup} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl w-full max-w-md">
                        <h3 className="text-xl font-bold text-white mb-4">New Theme Group</h3>
                        <input
                            autoFocus
                            type="text"
                            value={groupTitle}
                            onChange={(e) => setGroupTitle(e.target.value)}
                            className="w-full bg-black border border-gray-800 text-white p-3 rounded-xl mb-4 focus:outline-none focus:border-blue-500"
                            placeholder="Group Title (e.g. 'User Auth', 'Reporting')"
                        />
                        <div className="flex gap-3 justify-end">
                            <button type="button" onClick={() => setShowGroupModal(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold">Create Group</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
