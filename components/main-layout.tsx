"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { cn } from "@/lib/utils";

export function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLoginPage = pathname === "/login";

    if (isLoginPage) {
        return <>{children}</>;
    }

    const isEditorPage = pathname.startsWith("/editor/");

    return (
        <div className="flex h-screen overflow-hidden text-gray-200 antialiased">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <Header />
                <main className={cn(
                    "flex-1 overflow-hidden custom-scrollbar",
                    isEditorPage ? "p-4" : "p-8 overflow-y-auto"
                )}>
                    <div className={cn(
                        "h-full w-full",
                        isEditorPage ? "max-w-none ml-0" : "max-w-7xl mx-auto"
                    )}>
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
