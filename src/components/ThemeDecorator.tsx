"use client"

import { Palette, RefreshCcw, Check, Layout, Pipette, Zap, Sparkles, Flame, Shield, ArrowLeft, Activity } from 'lucide-react';

import { useTheme } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import React from 'react';

export default function ThemeDecorator({ designId }: { designId?: string }) {
    const { theme, updateTheme } = useTheme();

    const designPresets = [
        {
            id: 'signature-design',
            name: 'Signature Design',
            description: 'The high-impact match rankings with team showcase and player portraits.',
            icon: Layout,
            status: 'active',
            image: '/assets/previews/rankings.png'
        },
        {
            id: 'live-rankings',
            name: 'Live Rankings',
            description: 'Real-time health status, eliminations, and placement across all active teams.',
            icon: Activity,
            status: 'active',
            image: null
        },
        {
            id: 'design-03',
            name: 'Franchise Duel',
            description: 'Coming Soon: Intense head-to-head analytics for top-tier rivalries.',
            icon: Zap,
            status: 'coming-soon',
            image: null
        }
    ];

    const premiumThemes = [
        { 
            id: 'emerald-combo',
            name: 'Emerald Combo', 
            description: 'The signature broadcast look with vibrant green and deep pink accents.',
            primary: '#10b981', 
            secondary: '#e91e63', 
            accent: '#ffffff',
            icon: Sparkles,
            glow: 'rgba(16, 185, 129, 0.3)'
        },
        { 
            id: 'cyber-pulse',
            name: 'Cyber Pulse', 
            description: 'High-energy neon indigo and cyan for futuristic gaming vibes.',
            primary: '#6366f1', 
            secondary: '#22d3ee', 
            accent: '#ffffff',
            icon: Zap,
            glow: 'rgba(99, 102, 241, 0.3)'
        },
        { 
            id: 'golden-horizon',
            name: 'Golden Horizon', 
            description: 'Luxury championship palette with gold, orange, and deep red.',
            primary: '#f59e0b', 
            secondary: '#ef4444', 
            accent: '#ffffff',
            icon: Flame,
            glow: 'rgba(245, 158, 11, 0.3)'
        },
    ];

    const handleColorChange = (key: 'primary' | 'secondary' | 'accent', value: string) => {
        updateTheme({ [key]: value });
    };

    const resetTheme = () => {
        updateTheme({
            primary: '#10b981',
            secondary: '#e91e63',
            accent: '#ffffff',
        });
    };

    const selectedDesign = designId || null;

    return (
        <div className="flex flex-col gap-16 min-h-[60vh]">
            <AnimatePresence mode="wait">
                {!selectedDesign ? (
                    <motion.div
                        key="gallery-view"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="space-y-6"
                    >
                        {/* Design Selection Gallery */}
                        <div className="flex items-center gap-3">
                    <div className="w-10 h-1 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)]" style={{ backgroundColor: theme.primary }}></div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-widest italic drop-shadow-md">Graphic Design Packages</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {designPresets.map((d) => (
                        <Link href={`/overlay-design/${d.id}`} key={d.id} className="block">
                        <motion.div
                            whileHover={{ y: -8, scale: 1.02 }}
                            className={cn(
                                "group relative overflow-hidden rounded-[2.5rem] p-[2px] transition-all duration-500 shadow-2xl h-full",
                                d.status !== 'active' && "opacity-70 grayscale hover:grayscale-0"
                            )}
                        >
                            {/* Colorful Gradient Border on Hover */}
                            <div className={cn(
                                "absolute inset-0 bg-gradient-to-br opacity-20 group-hover:opacity-100 transition-opacity duration-700",
                                d.id === 'signature-design' ? 'from-emerald-400 via-teal-500 to-cyan-500' : 
                                d.id === 'live-rankings' ? 'from-indigo-500 via-purple-500 to-pink-500' :
                                'from-orange-500 via-red-500 to-rose-500'
                            )} />

                            <div className="bg-slate-950/95 backdrop-blur-3xl rounded-[2.4rem] p-6 lg:p-8 h-full flex flex-col gap-6 relative overflow-hidden z-10">
                                {/* Internal Glow Orb */}
                                <div className={cn(
                                    "absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[90px] pointer-events-none opacity-10 group-hover:opacity-40 transition-opacity duration-700",
                                    d.id === 'signature-design' ? 'bg-emerald-500' : 
                                    d.id === 'live-rankings' ? 'bg-indigo-500' :
                                    'bg-rose-500'
                                )} />

                                <div className="flex items-center gap-4 lg:gap-5 relative z-20">
                                    <div 
                                        className={cn(
                                            "w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center transition-all duration-500 shrink-0 border border-white/10 shadow-lg group-hover:scale-110 group-hover:rotate-3",
                                            selectedDesign === d.id ? "bg-white text-slate-900" : "bg-slate-900/80 text-slate-300 group-hover:text-white"
                                        )}
                                        style={selectedDesign === d.id ? { backgroundColor: theme.primary, color: '#fff' } : {}}
                                    >
                                        <d.icon size={28} strokeWidth={2.5} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-lg lg:text-xl font-black text-white italic uppercase tracking-tighter truncate drop-shadow-md">{d.name}</h3>
                                        <div className="flex items-center flex-wrap gap-2 mt-1">
                                            <p className={cn(
                                                "text-[9px] font-bold uppercase tracking-widest leading-none transition-colors",
                                                d.id === 'signature-design' ? 'text-emerald-400' : 'text-slate-400'
                                            )}>Premium</p>
                                            {d.status !== 'active' && (
                                                <span className="px-2 py-0.5 bg-white/10 border border-white/20 rounded-full text-[7px] font-black uppercase tracking-widest text-slate-300 leading-none backdrop-blur-md">
                                                    Coming Soon
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
 
                                <p className="text-slate-300 text-xs font-medium leading-relaxed tracking-wide relative z-20 group-hover:text-white transition-colors">
                                    {d.description}
                                </p>
 
                                <div className="mt-auto pt-6 flex items-center justify-between border-t border-white/10 relative z-20">
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-950 bg-slate-800 shadow-sm" />
                                        ))}
                                    </div>
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-300 transition-colors">
                                        Static Assets Ready
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                        </Link>
                    ))}
                </div>
            </motion.div>
        ) : (
            <motion.div
                key="settings-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col gap-10 w-full"
            >
                {/* Header for Settings */}
                <div className="flex items-center gap-6 pb-6 border-b border-white/5">
                    <Link 
                        href="/overlay-design"
                        className="w-14 h-14 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white transition-all hover:scale-105 shadow-xl shrink-0"
                    >
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">
                            {designPresets.find(p => p.id === selectedDesign)?.name}
                        </h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Configure package settings</p>
                    </div>
                </div>

                {['signature-design', 'live-rankings'].includes(selectedDesign as string) ? (
                    <div className="space-y-16">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-1 bg-primary rounded-full" style={{ backgroundColor: theme.secondary }}></div>
                            <h2 className="text-xl font-bold text-white uppercase tracking-widest italic">Global Brand Tokens</h2>
                        </div>

            {/* Theme Selection Gallery */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {premiumThemes.map((t) => (
                    <motion.div
                        key={t.id}
                        whileHover={{ y: -8 }}
                        onClick={() => updateTheme({ primary: t.primary, secondary: t.secondary, accent: t.accent })}
                        className={cn(
                            "relative group cursor-pointer rounded-[2.5rem] p-1 transition-all duration-500 overflow-hidden",
                            theme.primary === t.primary ? "bg-white/10 shadow-2xl" : "bg-slate-900/40 opacity-70 hover:opacity-100"
                        )}
                        style={{ 
                            boxShadow: theme.primary === t.primary ? `0 20px 40px ${t.glow}` : 'none'
                        }}
                    >
                        {/* Selected Indicator */}
                        <AnimatePresence>
                            {theme.primary === t.primary && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="absolute top-6 right-6 z-20 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg"
                                >
                                    <Check size={16} className="text-slate-900 font-bold" />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="bg-slate-950/80 backdrop-blur-3xl rounded-[2.3rem] p-8 h-full flex flex-col gap-6 relative overflow-hidden border border-white/5">
                            {/* Decorative Background Glow */}
                            <div 
                                className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity"
                                style={{ backgroundColor: t.primary }}
                            ></div>

                            <div className="flex items-center gap-4">
                                <div 
                                    className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform"
                                    style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})` }}
                                >
                                    <t.icon className="text-white" size={28} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">{t.name}</h3>
                                    <div className="flex gap-1.5 mt-1">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.primary }}></div>
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.secondary }}></div>
                                    </div>
                                </div>
                            </div>

                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                                {t.description}
                            </p>

                            {/* Mini Preview */}
                            <div className="mt-auto pt-4 flex gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                    <motion.div 
                                        className="h-full" 
                                        style={{ backgroundColor: t.primary }}
                                        animate={{ width: theme.primary === t.primary ? '100%' : '30%' }}
                                    />
                                </div>
                                <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                    <motion.div 
                                        className="h-full" 
                                        style={{ backgroundColor: t.secondary }}
                                        animate={{ width: theme.primary === t.primary ? '100%' : '60%' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>


        </div>
    ) : (
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-[3rem] p-20 flex flex-col items-center justify-center text-center gap-6 mt-8">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-slate-500 mb-4">
                <Sparkles size={40} />
            </div>
            <h3 className="text-3xl font-black text-white uppercase tracking-tight">Design Settings Coming Soon</h3>
            <p className="text-slate-400 max-w-md mx-auto text-sm font-medium leading-relaxed">
                We're currently architecting the unique layout engine for <span className="text-white italic font-bold">"{designPresets.find(p => p.id === selectedDesign)?.name}"</span>. 
                Custom themes and brand tokens for this package will be available in the next update.
            </p>
        </div>
    )}
</motion.div>
)}
</AnimatePresence>
</div>
);
}
