import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "DeployOps - AI-Powered DevOps Platform",
    description: "Intelligent DevOps automation with AI-driven issue resolution, monitoring, and team collaboration.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <body className={`${inter.className} bg-gray-950 text-gray-200 antialiased`}>
                <Providers>
                    <div className="flex h-screen overflow-hidden">
                        <Sidebar />
                        <div className="flex-1 flex flex-col min-w-0">
                            <Header />
                            <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                <div className="max-w-7xl mx-auto">
                                    {children}
                                </div>
                            </main>
                        </div>
                    </div>
                </Providers>
            </body>
        </html>
    );
}
