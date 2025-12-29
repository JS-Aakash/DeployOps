"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { LogOut, Search, User, X, Folder, FileText, CheckSquare, BookOpen, ArrowRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface SearchResult {
    id: string;
    type: 'project' | 'issue' | 'task' | 'documentation';
    title: string;
    description?: string;
    project?: string;
    link: string;
}

interface SearchResults {
    projects: SearchResult[];
    issues: SearchResult[];
    tasks: SearchResult[];
    docs: SearchResult[];
}

export function Header() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const getPageTitle = () => {
        const path = pathname.split("/")[1];
        if (!path) return "Dashboard";
        return path.charAt(0).toUpperCase() + path.slice(1).replace("-", " ");
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchQuery.length >= 2) {
                performSearch(searchQuery);
            } else {
                setSearchResults(null);
                setShowResults(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const performSearch = async (query: string) => {
        setIsSearching(true);
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                setSearchResults(data);
                setShowResults(true);
            }
        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleResultClick = (link: string) => {
        router.push(link);
        setShowResults(false);
        setSearchQuery("");
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'project': return <Folder className="w-4 h-4 text-blue-400" />;
            case 'issue': return <FileText className="w-4 h-4 text-red-400" />;
            case 'task': return <CheckSquare className="w-4 h-4 text-green-400" />;
            case 'documentation': return <BookOpen className="w-4 h-4 text-purple-400" />;
            default: return <FileText className="w-4 h-4 text-gray-400" />;
        }
    };

    const totalResults = searchResults
        ? searchResults.projects.length + searchResults.issues.length + searchResults.tasks.length + searchResults.docs.length
        : 0;

    return (
        <header className="h-16 border-b border-gray-800 bg-black/50 backdrop-blur-xl px-8 flex items-center justify-between z-40">
            <div className="flex items-center gap-8">
                <h2 className="text-lg font-semibold text-white">{getPageTitle()}</h2>

                <div className="relative" ref={searchRef}>
                    <div className={cn(
                        "flex items-center gap-3 px-4 py-2 bg-gray-900 border rounded-xl w-96 transition-all",
                        showResults ? "border-blue-500/50 ring-2 ring-blue-500/20" : "border-gray-800 focus-within:border-blue-500/50"
                    )}>
                        <Search className={cn(
                            "w-4 h-4 transition-colors",
                            showResults ? "text-blue-500" : "text-gray-500"
                        )} />
                        <input
                            type="text"
                            placeholder="Search projects, issues, tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none focus:outline-none text-sm w-full text-gray-300 placeholder:text-gray-600"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => {
                                    setSearchQuery("");
                                    setShowResults(false);
                                }}
                                className="text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                        {isSearching && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                        )}
                    </div>

                    {/* Search Results Dropdown */}
                    {showResults && searchResults && (
                        <div className="absolute top-full mt-2 w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl shadow-black/50 max-h-[70vh] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            {totalResults === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>No results found for "{searchQuery}"</p>
                                </div>
                            ) : (
                                <div className="overflow-y-auto max-h-[70vh] custom-scrollbar">
                                    {/* Projects */}
                                    {searchResults.projects.length > 0 && (
                                        <div className="p-3 border-b border-gray-800">
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-3 mb-2">
                                                Projects ({searchResults.projects.length})
                                            </p>
                                            {searchResults.projects.map((result) => (
                                                <button
                                                    key={result.id}
                                                    onClick={() => handleResultClick(result.link)}
                                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-blue-500/10 transition-all group text-left"
                                                >
                                                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                                                        {getIcon(result.type)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-white truncate">{result.title}</p>
                                                        {result.description && (
                                                            <p className="text-xs text-gray-500 truncate">{result.description}</p>
                                                        )}
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors" />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Issues */}
                                    {searchResults.issues.length > 0 && (
                                        <div className="p-3 border-b border-gray-800">
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-3 mb-2">
                                                Issues ({searchResults.issues.length})
                                            </p>
                                            {searchResults.issues.map((result) => (
                                                <button
                                                    key={result.id}
                                                    onClick={() => handleResultClick(result.link)}
                                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 transition-all group text-left"
                                                >
                                                    <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                                                        {getIcon(result.type)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-white truncate">{result.title}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {result.project && (
                                                                <span className="text-xs text-gray-600">{result.project}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-red-400 transition-colors" />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Tasks */}
                                    {searchResults.tasks.length > 0 && (
                                        <div className="p-3 border-b border-gray-800">
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-3 mb-2">
                                                Tasks ({searchResults.tasks.length})
                                            </p>
                                            {searchResults.tasks.map((result) => (
                                                <button
                                                    key={result.id}
                                                    onClick={() => handleResultClick(result.link)}
                                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-green-500/10 transition-all group text-left"
                                                >
                                                    <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                                                        {getIcon(result.type)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-white truncate">{result.title}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {result.project && (
                                                                <span className="text-xs text-gray-600">{result.project}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-green-400 transition-colors" />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Documentation */}
                                    {searchResults.docs.length > 0 && (
                                        <div className="p-3">
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-3 mb-2">
                                                Documentation ({searchResults.docs.length})
                                            </p>
                                            {searchResults.docs.map((result) => (
                                                <button
                                                    key={result.id}
                                                    onClick={() => handleResultClick(result.link)}
                                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-purple-500/10 transition-all group text-left"
                                                >
                                                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                                                        {getIcon(result.type)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-white truncate">{result.title}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {result.project && (
                                                                <span className="text-xs text-gray-600">{result.project}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-purple-400 transition-colors" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="h-8 w-px bg-gray-800" />

                {session ? (
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-white">{session.user?.name}</p>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Developer</p>
                            </div>
                            <img
                                src={session.user?.image || ""}
                                alt="Avatar"
                                className="w-10 h-10 rounded-xl border border-gray-800"
                            />
                        </div>
                        <button
                            onClick={() => signOut()}
                            className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all"
                            title="Sign Out"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-gray-400">
                        <User className="w-5 h-5" />
                        <span className="text-sm">Not Signed In</span>
                    </div>
                )}
            </div>
        </header>
    );
}
