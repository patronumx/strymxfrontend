"use client";
import React, { useState } from 'react';
import { Palette, Layout, Flame, Sparkles, Check, X } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Per-overlay element colors that each preset pushes to all overlay configs
export interface PresetOverlayColors {
    cardBgColor: string;
    cardBorderColor: string;
    playerNameColor: string;
    teamNameColor: string;
    elimsColor: string;
    damageColor: string;
    survivalColor: string;
    statLabelColor: string;
    statValueColor: string;
    headerBgColor: string;
    headerTextColor: string;
    rankBadgeColor: string;
    rankTextColor: string;
    statBgColor: string;
    vsBadgeColor: string;
    iconColor: string;
    tableHeaderColor: string;
    totalBadgeColor: string;
    rowEvenColor: string;
    rowOddColor: string;
}

export const designPresets = [
    {
        id: 'signature-design',
        name: 'Signature Design',
        description: 'Clean, professional esports broadcast standard.',
        themeOverrides: {
            primary: '#10b981',
            secondary: '#3b82f6',
            accent: '#f59e0b',
            background: 'transparent',
            headerBg: '#0f172a',
            headerText: '#ffffff',
            cardBg: '#1e293b',
            cardBorder: '#334155',
            cardText: '#e2e8f0',
            gradientStart: '#10b981',
            gradientEnd: '#3b82f6',
            glowEnabled: false,
            glassmorphism: true
        },
        overlayColors: {
            cardBgColor: '#0f172a',
            cardBorderColor: '#334155',
            playerNameColor: '#ffffff',
            teamNameColor: '#94a3b8',
            elimsColor: '#10b981',
            damageColor: '#3b82f6',
            survivalColor: '#ffffff',
            statLabelColor: '#cbd5e1',
            statValueColor: '#ffffff',
            headerBgColor: '#0f172a',
            headerTextColor: '#ffffff',
            rankBadgeColor: '#10b981',
            rankTextColor: '#ffffff',
            statBgColor: '#1e293b',
            vsBadgeColor: '#10b981',
            iconColor: '#10b981',
            tableHeaderColor: '#10b981',
            totalBadgeColor: '#3b82f6',
            rowEvenColor: '#0f172a',
            rowOddColor: '#1e293b',
        } as PresetOverlayColors,
    },
    {
        id: 'cyber-neon',
        name: 'Cyber Neon UX',
        description: 'High-contrast, cyberpunk aesthetic with heavy glowing elements.',
        themeOverrides: {
            primary: '#ec4899',
            secondary: '#06b6d4',
            accent: '#8b5cf6',
            background: '#09090b',
            headerBg: '#18181b',
            headerText: '#fdf2f8',
            cardBg: '#18181b',
            cardBorder: '#ec4899',
            cardText: '#e2e8f0',
            gradientStart: '#ec4899',
            gradientEnd: '#8b5cf6',
            glowEnabled: true,
            glassmorphism: true
        },
        overlayColors: {
            cardBgColor: '#18181b',
            cardBorderColor: '#4a1731',
            playerNameColor: '#fdf2f8',
            teamNameColor: '#06b6d4',
            elimsColor: '#ec4899',
            damageColor: '#06b6d4',
            survivalColor: '#8b5cf6',
            statLabelColor: '#a1a1aa',
            statValueColor: '#fdf2f8',
            headerBgColor: '#18181b',
            headerTextColor: '#fdf2f8',
            rankBadgeColor: '#ec4899',
            rankTextColor: '#ffffff',
            statBgColor: '#27272a',
            vsBadgeColor: '#ec4899',
            iconColor: '#ec4899',
            tableHeaderColor: '#ec4899',
            totalBadgeColor: '#06b6d4',
            rowEvenColor: '#18181b',
            rowOddColor: '#27272a',
        } as PresetOverlayColors,
    },
    {
        id: 'golden-prestige',
        name: 'Golden Prestige',
        description: 'Luxurious gold and black theme for grand finals.',
        themeOverrides: {
            primary: '#eab308',
            secondary: '#fef08a',
            accent: '#ffffff',
            background: '#000000',
            headerBg: '#1a1a1a',
            headerText: '#eab308',
            cardBg: '#0a0a0a',
            cardBorder: '#eab308',
            cardText: '#ffffff',
            gradientStart: '#ca8a04',
            gradientEnd: '#fef08a',
            glowEnabled: true,
            glassmorphism: false
        },
        overlayColors: {
            cardBgColor: '#0a0a0a',
            cardBorderColor: '#3d2f02',
            playerNameColor: '#fef08a',
            teamNameColor: '#ca8a04',
            elimsColor: '#eab308',
            damageColor: '#fef08a',
            survivalColor: '#ffffff',
            statLabelColor: '#a3a3a3',
            statValueColor: '#ffffff',
            headerBgColor: '#1a1a1a',
            headerTextColor: '#eab308',
            rankBadgeColor: '#eab308',
            rankTextColor: '#000000',
            statBgColor: '#1a1a1a',
            vsBadgeColor: '#eab308',
            iconColor: '#eab308',
            tableHeaderColor: '#eab308',
            totalBadgeColor: '#ca8a04',
            rowEvenColor: '#0a0a0a',
            rowOddColor: '#1a1a1a',
        } as PresetOverlayColors,
    }
];

interface ThemeCustomizerPanelProps {
    variant?: 'full' | 'sidebar';
    onClose?: () => void;
}

export default function ThemeCustomizerPanel({ variant = 'full', onClose }: ThemeCustomizerPanelProps) {
    const { theme, updateTheme } = useTheme();
    const [selectedDesign, setSelectedDesign] = useState<string>('signature-design');

    const handleColorChange = (key: keyof typeof theme, value: string) => {
        updateTheme({ [key]: value });
    };

    const handleDesignSelect = (designId: string) => {
        const preset = designPresets.find(p => p.id === designId);
        if (preset) {
            updateTheme(preset.themeOverrides);
            setSelectedDesign(preset.id);
        }
    };

    const isSidebar = variant === 'sidebar';

    return (
        <div className={cn("flex flex-col gap-6 w-full h-full", isSidebar ? "p-0" : "max-w-4xl")}>
            
            {/* Header for Drawer */}
            {isSidebar && (
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                            <Palette size={18} style={{ color: theme.primary }} />
                        </div>
                        <h2 className="text-sm font-black text-white uppercase tracking-widest">Theme Engine</h2>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors">
                            <X size={18} />
                        </button>
                    )}
                </div>
            )}

            {/* Design Package Selection */}
            <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Layout size={12} className="text-white opacity-50" /> Preset Themes
                </h3>
                <div className={cn("grid gap-2", isSidebar ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3')}>
                    {designPresets.map((preset) => (
                        <div 
                            key={preset.id}
                            onClick={() => handleDesignSelect(preset.id)}
                            className={cn(
                                "p-3 rounded-xl border cursor-pointer transition-all duration-300 relative overflow-hidden group",
                                selectedDesign === preset.id 
                                    ? "bg-white/5 border-white/20 shadow-lg ring-1 ring-white/10" 
                                    : "bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/40"
                            )}
                        >
                            <div 
                                className="absolute top-0 right-0 w-16 h-16 rounded-full blur-[30px] opacity-10 group-hover:opacity-20 transition-opacity"
                                style={{ backgroundColor: preset.themeOverrides.primary }}
                            ></div>
                            <div className="flex justify-between items-center relative z-10">
                                <h4 className="font-black text-white text-[10px] uppercase tracking-wider">{preset.name}</h4>
                                {selectedDesign === preset.id && (
                                    <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                                        <Check size={10} strokeWidth={4} />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Control Pickers */}
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-10">
                {/* Base Colors */}
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                    <h3 className="text-[9px] font-black text-white uppercase tracking-[0.2em] mb-4 opacity-50 flex items-center gap-2">
                        <Palette size={12} style={{color: theme.primary}}/> Core Colors
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { id: 'primary', label: 'Primary', value: theme.primary },
                            { id: 'secondary', label: 'Secondary', value: theme.secondary },
                            { id: 'accent', label: 'Accent', value: theme.accent },
                            { id: 'background', label: 'BG', value: theme.background },
                        ].map((picker) => (
                            <div key={picker.id} className="flex flex-col gap-1.5 items-center bg-slate-950/40 p-2 rounded-xl border border-white/5">
                                <div className="relative group w-8 h-8">
                                    <div 
                                        className="w-full h-full rounded-lg border border-white/10 flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 shadow-lg"
                                        style={{ backgroundColor: picker.value, boxShadow: theme.glowEnabled ? `0 0 10px ${picker.value}30` : 'none' }}
                                    >
                                        <input 
                                            type="color" 
                                            value={picker.value}
                                            onChange={(e) => handleColorChange(picker.id as any, e.target.value)}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                        />
                                    </div>
                                </div>
                                <label className="block text-[8px] font-black uppercase tracking-widest text-slate-500">{picker.label}</label>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Effects */}
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                    <h3 className="text-[9px] font-black text-white uppercase tracking-[0.2em] mb-4 opacity-50 flex items-center gap-2">
                        <Sparkles size={12} className="text-cyan-400" /> Style Engine
                    </h3>
                    <div className="flex flex-col gap-3">
                        <label className="flex items-center justify-between cursor-pointer group px-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">Glow FX</span>
                            <div className={cn("w-8 h-4 rounded-full transition-colors relative", theme.glowEnabled ? "bg-emerald-500" : "bg-slate-800")}>
                                <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all", theme.glowEnabled ? "left-4.5" : "left-0.5")} />
                            </div>
                            <input type="checkbox" className="hidden" checked={theme.glowEnabled} onChange={(e) => updateTheme({ glowEnabled: e.target.checked })} />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer group px-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">Glass Glass</span>
                            <div className={cn("w-8 h-4 rounded-full transition-colors relative", theme.glassmorphism ? "bg-emerald-500" : "bg-slate-800")}>
                                <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all", theme.glassmorphism ? "left-4.5" : "left-0.5")} />
                            </div>
                            <input type="checkbox" className="hidden" checked={theme.glassmorphism} onChange={(e) => updateTheme({ glassmorphism: e.target.checked })} />
                        </label>
                    </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                        <Check className="text-emerald-500 flex-shrink-0" size={12} />
                        <h4 className="text-[9px] font-black text-white uppercase tracking-widest">Auto Sync</h4>
                    </div>
                    <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest leading-normal">
                        Changes broadcast live to all OBS endpoints via Neural Link.
                    </p>
                </div>
            </div>
        </div>
    );
}
