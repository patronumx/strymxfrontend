import { API_URL } from '@/lib/api-config';
"use client"

import React, { useState } from 'react';
import { Play, Square, Zap, Package, Trophy, User } from 'lucide-react';

export default function TestControls() {
    const [status, setStatus] = useState<string>('Ready');

    const triggerGraphic = async (templateUrl: string, data: any, layer: number = 10) => {
        try {
            setStatus(`Triggering ${templateUrl}...`);
            const res = await fetch(`${API_URL}/api/agent/trigger-graphic`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templateUrl, data, layer, action: 'PLAY' })
            });
            const result = await res.json();
            setStatus(`Last Action: ${result.msg}`);
        } catch (err: any) {
            setStatus(`Error: ${err.message}`);
        }
    };

    const mockPlayerData = {
        playerKey: "test-player-123",
        name: "PATRONUM_PRO",
        teamName: "PATRONUM ESPORTS",
        teamTag: "PTR",
        logoUrl: "https://placehold.co/400x400/e91e63/ffffff?text=PTR",
        photoUrl: "https://www.pubg.com/wp-content/uploads/2021/11/DEFAULT_PHOTO.png"
    };

    return (
        <div className="p-8 bg-slate-950 min-h-screen text-white font-sans">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-black uppercase tracking-tighter mb-2 italic">Broadcast Test Controller</h1>
                <p className="text-slate-500 mb-8 font-bold uppercase tracking-widest text-xs">Simulation & Verification Suite</p>

                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className={`w-3 h-3 rounded-full animate-pulse ${status.includes('Error') ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                        <span className="font-mono text-sm text-slate-300">{status}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* First Blood */}
                        <button 
                            onClick={() => triggerGraphic('/overlays/first-blood', mockPlayerData, 10)}
                            className="bg-slate-800 hover:bg-slate-700 p-4 rounded-xl flex items-center gap-4 transition-all group"
                        >
                            <div className="w-12 h-12 bg-rose-500/20 rounded-lg flex items-center justify-center text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-all">
                                <Zap size={24} />
                            </div>
                            <div className="text-left">
                                <div className="font-black uppercase text-sm">First Blood</div>
                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Trigger Layer 10</div>
                            </div>
                        </button>

                        {/* Drop Looted */}
                        <button 
                            onClick={() => triggerGraphic('/overlays/drop-looted', mockPlayerData, 11)}
                            className="bg-slate-800 hover:bg-slate-700 p-4 rounded-xl flex items-center gap-4 transition-all group"
                        >
                            <div className="w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-all">
                                <Package size={24} />
                            </div>
                            <div className="text-left">
                                <div className="font-black uppercase text-sm">Drop Looted</div>
                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Trigger Layer 11</div>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                        Overlay: /overlays/first-blood
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                        Overlay: /overlays/drop-looted
                    </div>
                </div>
            </div>
        </div>
    );
}
