"use client"
import React from 'react';
import { LayoutDashboard, Users, Activity, Settings, LogOut, Menu, X, Database, Palette } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import AnimatedBackground from './AnimatedBackground';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const pathname = usePathname();

    const tabs = [
        { id: 'live', label: 'Live Overview', icon: Activity, href: '/live-overview' },
        { id: 'tournaments', label: 'Tournaments', icon: Database, href: '/tournaments' },
        { id: 'teams', label: 'Teams', icon: Users, href: '/teams' },
        { id: 'design', label: 'Overlay Design', icon: Palette, href: '/overlay-design' },
        { id: 'ini', label: 'INI Generator', icon: Settings, href: '/ini-generator' },
    ];

    return (
        <main className="min-h-screen p-4 sm:p-6 md:p-8 font-sans relative flex flex-col">
            <AnimatedBackground />
            <div className="w-full max-w-[1700px] mx-auto space-y-6 relative z-10 flex-1 flex flex-col">

                {/* Integrated Header & Control Panel */}
                <header className="flex flex-col lg:flex-row items-center justify-between p-2.5 bg-slate-900/50 backdrop-blur-3xl border border-white/5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.05)] gap-4 ring-1 ring-slate-800/50">
                    <div className="flex items-center gap-5 shrink-0 px-4 py-2 lg:border-r lg:border-white/5 lg:pr-8">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-700 animate-pulse"></div>
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 flex items-center justify-center shadow-[0_8px_24px_rgba(37,99,235,0.3)] relative z-10 border border-white/10">
                                <span className="text-white font-black text-xl tracking-tighter">SX</span>
                            </div>
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-[-0.02em] text-white leading-none flex items-center gap-2">
                                <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent uppercase tracking-tight">STRYMX</span>
                                <span className="px-1.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[9px] text-blue-400 font-bold uppercase tracking-[0.15em]">PRO</span>
                            </h1>
                            <p className="text-slate-500 text-[9px] mt-1.5 uppercase tracking-[0.4em] font-black opacity-60">
                                Production Engine
                            </p>
                        </div>
                    </div>

                    {/* Horizontal Navigation */}
                    <nav className="flex items-center justify-center gap-1 flex-1 px-4 relative flex-nowrap whitespace-nowrap">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = pathname === tab.href;
                            return (
                                <Link
                                    key={tab.id}
                                    href={tab.href}
                                    className={cn(
                                        "flex items-center gap-2 px-5 py-3 rounded-2xl text-[11px] font-black transition-all duration-300 relative group uppercase tracking-[0.1em]",
                                        isActive ? "text-white" : "text-slate-400 hover:text-slate-200"
                                    )}
                                >
                                    {isActive && (
                                        <motion.div 
                                            layoutId="activeTabBackground"
                                            className="absolute inset-0 bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-white/5 rounded-2xl shadow-lg z-0"
                                            transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
                                        />
                                    )}
                                    <Icon className={cn(
                                        "w-4 h-4 transition-all duration-300 relative z-10", 
                                        isActive ? "text-blue-400 scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "text-slate-500 group-hover:text-slate-300 group-hover:scale-110"
                                    )} />
                                    <span className="relative z-10">{tab.label}</span>
                                </Link>
                            )
                        })}
                    </nav>

                    <div className="shrink-0 px-4 lg:pl-8 lg:border-l lg:border-white/5 opacity-0 pointer-events-none">
                        {/* Placeholder to keep balance if needed, or just remove if flex-1 is enough */}
                    </div>
                </header>

                <div className="flex-1 w-full bg-slate-900/20 backdrop-blur-2xl border border-slate-800/40 rounded-[2.5rem] p-6 lg:p-10 shadow-[0_12px_48px_rgb(0,0,0,0.2)] relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/2 pointer-events-none"></div>

                    <div className="flex-1 relative z-10 flex flex-col">
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="h-full"
                        >
                            {children}
                        </motion.div>
                    </div>
                </div>
            </div>
        </main>
    );
}
