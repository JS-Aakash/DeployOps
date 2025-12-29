"use client";

import { signIn } from "next-auth/react";
import { Github, Sparkles, ShieldCheck, Lock } from "lucide-react";

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
            <div className="max-w-md w-full">
                {/* Logo & Branding */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-2xl shadow-blue-500/20 mb-6 animate-pulse">
                        <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-3">
                        USDMP <span className="text-blue-500">PORTAL</span>
                    </h1>
                    <p className="text-gray-400 text-sm font-medium uppercase tracking-widest bg-gray-900/50 py-2 px-4 rounded-full inline-block border border-gray-800">
                        Unified Software Development Management
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-[2.5rem] p-10 backdrop-blur-xl shadow-2xl">
                    <div className="mb-8 text-center">
                        <h2 className="text-2xl font-bold text-white mb-2">Secure Access</h2>
                        <p className="text-gray-500 text-sm">Sign in with your GitHub account to continue to your dashboard.</p>
                    </div>

                    <button
                        onClick={() => signIn("github", { callbackUrl: "/" })}
                        className="w-full flex items-center justify-center gap-4 py-4 px-6 bg-white text-black rounded-2xl font-black hover:bg-gray-200 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-white/5"
                    >
                        <Github className="w-6 h-6" />
                        Sign in with GitHub
                    </button>

                    <div className="mt-8 pt-8 border-t border-gray-800 grid grid-cols-2 gap-4">
                        <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-black/40 border border-gray-800">
                            <ShieldCheck className="w-5 h-5 text-green-500" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Role Base Auth</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-black/40 border border-gray-800">
                            <Lock className="w-5 h-5 text-blue-500" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase">JWT Secured</span>
                        </div>
                    </div>
                </div>

                <p className="mt-8 text-center text-gray-600 text-[10px] font-bold uppercase tracking-widest">
                    Authorized Personnel Only • USDMP Security v2.0
                </p>
            </div>
        </div>
    );
}
