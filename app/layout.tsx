import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { MainLayout } from "@/components/main-layout";
import { AiAssistant } from "@/components/ai-assistant";

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
                    <MainLayout>{children}</MainLayout>
                    <AiAssistant />
                </Providers>
            </body>
        </html>
    );
}
