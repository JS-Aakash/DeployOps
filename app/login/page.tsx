"use client";

import { signIn } from "next-auth/react";
import { Github, Sparkles, ShieldCheck, Lock, Rocket, Cpu, Layers, ArrowRight, Zap, Activity, Globe } from "lucide-react";
import { motion, Variants } from "framer-motion";

export default function LoginPage() {
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: "spring", stiffness: 100 }
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-[#020617] flex items-center justify-center px-4 py-12 selection:bg-blue-500/30">
            {/* Dynamic Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[10%] left-[5%] w-[40rem] h-[40rem] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[10%] right-[5%] w-[35rem] h-[35rem] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)]" />

                {/* Animated Grid */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
                <div
                    className="absolute inset-0 opacity-[0.1]"
                    style={{
                        backgroundImage: `linear-gradient(#475569 1px, transparent 1px), linear-gradient(90deg, #475569 1px, transparent 1px)`,
                        backgroundSize: '40px 40px'
                    }}
                />
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
            >
                {/* Left Side: Branding & Value Prop */}
                <div className="hidden lg:flex flex-col space-y-8">
                    <motion.div variants={itemVariants} className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Rocket className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-black text-white tracking-tighter uppercase">DeployOps</span>
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-4">
                        <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight tracking-tight">
                            Ship Faster with <br />
                            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                AI Intelligence
                            </span>
                        </h1>
                        <p className="text-gray-400 text-lg max-w-md leading-relaxed">
                            Unified platform for Project Management, AI-Assisted Development, and Safe Operations. Bridge the gap between planning and production.
                        </p>
                    </motion.div>

                    {/* Feature highlights */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4">
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-white/20 transition-all group">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Zap className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm tracking-tight">AI Issue Fixer</h3>
                                <p className="text-gray-500 text-xs">Automate code fixes & PRs</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-white/20 transition-all group">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <ShieldCheck className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm tracking-tight">Release Guardrails</h3>
                                <p className="text-gray-500 text-xs">Predict risks before you deploy</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-white/20 transition-all group">
                            <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Cpu className="w-5 h-5 text-pink-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm tracking-tight">RAG Documentation</h3>
                                <p className="text-gray-500 text-xs">AI grounded in your own code</p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Right Side: Login Card */}
                <motion.div
                    variants={itemVariants}
                    className="relative group"
                >
                    {/* Decorative Glow */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />

                    <div className="relative bg-gray-900/40 border border-white/10 rounded-[2.5rem] p-8 md:p-12 backdrop-blur-2xl shadow-2xl overflow-hidden">
                        {/* Form Header */}
                        <div className="mb-10 text-center lg:text-left">
                            <div className="lg:hidden flex justify-center mb-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <Rocket className="w-8 h-8 text-white" />
                                </div>
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-3">Welcome Back</h2>
                            <p className="text-gray-400 font-medium">Connect your GitHub workspace to start building.</p>
                        </div>

                        {/* Login Button */}
                        <div className="space-y-4">
                            <button
                                onClick={() => signIn("github", { callbackUrl: "/" })}
                                className="group w-full relative h-[64px] flex items-center justify-center gap-4 bg-white text-black rounded-2xl font-black text-lg hover:bg-gray-100 transition-all duration-300 shadow-xl overflow-hidden active:scale-95"
                            >
                                <div className="absolute inset-0 w-0 bg-blue-500 group-hover:w-full transition-all duration-500 ease-out -z-10" />
                                <Github className="w-6 h-6 transition-transform group-hover:rotate-12" />
                                <span className="relative z-10 transition-colors">Sign in with GitHub</span>
                                <ArrowRight className="w-5 h-5 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all delay-100" />
                            </button>

                            <p className="text-center text-gray-500 text-xs py-2">
                                By signing in, you agree to our <span className="text-gray-400 hover:text-blue-400 cursor-pointer transition-colors underline underline-offset-4">Terms of Service</span>
                            </p>
                        </div>

                        {/* System Status Tray */}
                        <div className="mt-12 pt-8 border-t border-white/5 space-y-4">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="flex items-center justify-between px-5 py-4 bg-white/[0.03] rounded-2xl border border-white/5 group hover:border-white/10 transition-all cursor-default"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="p-2 bg-blue-500/10 rounded-lg">
                                            <Globe className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-0.5">Global Cluster</h4>
                                        <p className="text-[10px] text-gray-500 font-medium">24 Nodes Active • Latency 12ms</p>
                                    </div>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <div className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">
                                        99.9% UP
                                    </div>
                                </div>
                            </motion.div>

                            <div className="flex items-center justify-around py-2">
                                <div className="flex items-center gap-2 group transition-all">
                                    <div className="w-1 h-1 rounded-full bg-blue-400 group-hover:scale-150 transition-transform" />
                                    <span className="text-[9px] font-bold text-gray-500 group-hover:text-blue-400 uppercase tracking-widest transition-colors">Encrypted</span>
                                </div>
                                <div className="flex items-center gap-2 group transition-all">
                                    <div className="w-1 h-1 rounded-full bg-purple-400 group-hover:scale-150 transition-transform" />
                                    <span className="text-[9px] font-bold text-gray-500 group-hover:text-purple-400 uppercase tracking-widest transition-colors">AI Grounded</span>
                                </div>
                                <div className="flex items-center gap-2 group transition-all">
                                    <div className="w-1 h-1 rounded-full bg-pink-400 group-hover:scale-150 transition-transform" />
                                    <span className="text-[9px] font-bold text-gray-500 group-hover:text-pink-400 uppercase tracking-widest transition-colors">Pro Tier</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Live Security Feed */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                transition={{ delay: 1 }}
                className="absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-lg hidden lg:block"
            >
                <div className="flex items-center justify-center gap-8 text-[9px] font-mono text-blue-400 uppercase tracking-widest">
                    <span className="flex items-center gap-2 animate-pulse"><div className="w-1 h-1 bg-blue-400 rounded-full" /> AUTH_SERVICE: LISTENING</span>
                    <span className="flex items-center gap-2"><div className="w-1 h-1 bg-blue-400 rounded-full" /> ENCRYPTION: AES_256_ACTIVE</span>
                    <span className="flex items-center gap-2"><div className="w-1 h-1 bg-blue-400 rounded-full" /> REGION: US_EAST_1</span>
                </div>
            </motion.div>

            {/* Footer Decoration */}
            <div className="absolute bottom-8 left-0 w-full px-12 flex items-center justify-between opacity-40">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em]">
                    DeployOps • High Performance CI/CD
                </p>
                <div className="flex gap-6 text-[10px] font-mono text-gray-600">
                    <span>BUILD_ID: 0x2A4F</span>
                    <span>v1.2.0-STABLE</span>
                </div>
            </div>
        </div>
    );
}
