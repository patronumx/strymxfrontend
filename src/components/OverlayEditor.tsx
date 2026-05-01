"use client";

import React, { useEffect } from 'react';
import { useOverlayEditor, OverlayEditorProvider } from '@/context/OverlayEditorContext';
import { useTheme } from '@/context/ThemeContext';
import { MousePointer2, Layers, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import OverallStandingsOverlay from '@/app/overlays/overall-standings/page';

function EditorSidebar() {
    const { selectedElementId, getOverride, setOverride } = useOverlayEditor();
    const { theme, updateTheme } = useTheme();
    
    const presets = [
        { name: 'Emerald Combo', primary: '#10b981', secondary: '#e91e63', accent: '#ffffff' },
        { name: 'Lime Fusion', primary: '#a3e635', secondary: '#ec4899', accent: '#ffffff' },
        { name: 'Midnight Neon', primary: '#8b5cf6', secondary: '#06b6d4', accent: '#ffffff' },
        { name: 'Cyberpunk', primary: '#ff00ff', secondary: '#00ffff', accent: '#ffffff' },
        { name: 'Solar Flare', primary: '#f59e0b', secondary: '#ef4444', accent: '#ffffff' },
    ];

    if (!selectedElementId) {
        return (
            <div className="p-6 h-full flex flex-col gap-8 bg-slate-900/30 backdrop-blur-md border-l border-slate-800/60">
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                        <ZoomIn size={12} className="text-secondary" style={{ color: theme.secondary }} /> Quick Styles
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                        {presets.map((p) => (
                            <button 
                                key={p.name}
                                onClick={() => updateTheme(p)}
                                className={cn(
                                    "px-3 py-2 rounded-lg border border-slate-800/50 bg-slate-900/50 hover:border-secondary/30 transition-all text-left group flex items-center justify-between",
                                    theme.primary === p.primary && "border-secondary/40 bg-secondary/5"
                                )}
                            >
                                <span className={cn(
                                    "text-[9px] font-black uppercase tracking-widest",
                                    theme.primary === p.primary ? "text-secondary" : "text-slate-500 group-hover:text-slate-300"
                                )}>{p.name}</span>
                                <div className="flex -space-x-1">
                                    <div className="w-2 h-2 rounded-full border border-slate-950" style={{ backgroundColor: p.primary }}></div>
                                    <div className="w-2 h-2 rounded-full border border-slate-950" style={{ backgroundColor: p.secondary }}></div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-center items-center text-slate-500 font-bold uppercase tracking-widest text-[8px] text-center opacity-50 px-4">
                    <p>Select any element to edit position & colors</p>
                </div>
            </div>
        );
    }

    const override = getOverride(selectedElementId) || {};

    return (
        <div className="p-6 h-full flex flex-col gap-6 border-l border-slate-800/60 bg-slate-900/30 backdrop-blur-md">
            <div>
                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                    <Layers size={18} className="text-secondary" style={{ color: theme.secondary }} />
                    Properties
                </h3>
                <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" style={{ backgroundColor: theme.secondary }}></div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[8px] break-all">{selectedElementId}</p>
                </div>
            </div>
            
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Position (X, Y)</label>
                    <div className="flex gap-2">
                        <input type="number" value={override.x ?? ''} onChange={e => setOverride(selectedElementId, { x: parseInt(e.target.value) || 0 })} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-xs" placeholder="Auto" />
                        <input type="number" value={override.y ?? ''} onChange={e => setOverride(selectedElementId, { y: parseInt(e.target.value) || 0 })} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono text-xs" placeholder="Auto" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Scale</label>
                    <input 
                        type="range" min="0.1" max="3" step="0.05" 
                        value={override.scale ?? 1} 
                        onChange={e => setOverride(selectedElementId, { scale: parseFloat(e.target.value) })} 
                        className="w-full accent-blue-500" 
                    />
                    <div className="text-right text-[10px] font-mono text-slate-500">{override.scale ?? 1}x</div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Color Override</label>
                    <div className="flex gap-2 items-center">
                        <input type="color" value={override.color ?? '#ffffff'} onChange={e => setOverride(selectedElementId, { color: e.target.value })} className="bg-transparent rounded-lg border-none w-8 h-8 cursor-pointer" />
                        <button onClick={() => setOverride(selectedElementId, { color: undefined })} className="text-[10px] text-slate-400 hover:text-white uppercase font-black uppercase transition-colors">Clear</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function EditorCanvas({ children }: { children?: React.ReactNode }) {
    const { setIsEditMode, setSelectedElementId } = useOverlayEditor();
    const { theme } = useTheme();

    useEffect(() => {
        setIsEditMode(true);
        return () => setIsEditMode(false);
    }, [setIsEditMode]);

    return (
        <div 
            className="flex-1 overflow-visible bg-black relative flex items-center justify-center p-8 cursor-crosshair"
            onClick={() => setSelectedElementId(null)} // click off to deselect
        >
            <div 
                className="relative overflow-hidden ring-1 ring-slate-800 shadow-[0_0_100px_rgba(0,0,0,0.8)] shrink-0" 
                style={{ 
                    width: 1920, 
                    height: 1080, 
                    transform: 'scale(0.35)', 
                    transformOrigin: 'center center',
                    background: `linear-gradient(to bottom right, #000, #050505)`
                }}
            >
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `radial-gradient(${theme.secondary} 1px, transparent 0)`, backgroundSize: '40px 40px' }}></div>
                {children}
            </div>
        </div>
    );
}


export default function OverlayEditor({ children }: { children?: React.ReactNode }) {
    const { theme } = useTheme();
    
    return (
        <OverlayEditorProvider>
            <div className="space-y-4">
                <div className="flex items-center justify-between px-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-secondary/10 border border-secondary/20" style={{ color: theme.secondary }}>
                            <MousePointer2 size={16} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Green Combo Editor</h2>
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-[8px]">Live Coordination & Branding Sync</p>
                        </div>
                    </div>
                </div>

                <div 
                    className="w-full h-[650px] border rounded-[2.5rem] overflow-hidden flex bg-slate-950 shadow-2xl transition-all duration-500 border-slate-800/80"
                    style={{ 
                        boxShadow: `0 0 100px ${theme.secondary}10, inset 0 0 50px ${theme.secondary}05`
                    }}
                >
                    <EditorCanvas>{children}</EditorCanvas>
                    <div className="w-80 shrink-0">
                        <EditorSidebar />
                    </div>
                </div>
            </div>
        </OverlayEditorProvider>
    );
}
