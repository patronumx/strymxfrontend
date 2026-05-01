"use client"
import { API_URL } from '@/lib/api-config';

import React, { useState } from 'react';
import { Play, Square, RefreshCcw, Monitor, Image as ImageIcon, Terminal, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const GRAPHICS = [
    { id: 'match-ranking', name: 'Match Ranking (Top 8)', layer: 20, url: 'http://localhost:3001/overlays/match-rankings', color: 'from-blue-500 to-indigo-600' },
    { id: 'wwcd', name: 'WWCD Team Stats', layer: 21, url: 'http://localhost:3001/overlays/wwcd', color: 'from-amber-500 to-orange-600' },
    { id: 'mvp', name: 'MVP Spotlight', layer: 22, url: 'http://localhost:3001/overlays/mvp', color: 'from-emerald-500 to-teal-600' },
    { id: 'grenade-kill', name: 'Grenade Elimination', layer: 23, url: 'http://localhost:3001/overlays/grenade-kill', color: 'from-lime-500 to-green-600' },
];

export default function PlayoutController() {
    const [statusLog, setStatusLog] = useState<{ msg: string, type: 'info' | 'success' | 'error', time: Date }[]>([]);
    const [channel, setChannel] = useState(1);

    const logCommand = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
        setStatusLog(prev => [{ msg, type, time: new Date() }, ...prev].slice(0, 15));
    };

    const sendCommand = async (layer: number, templateUrl: string, action: string) => {
        try {
            logCommand(`Sending ${action} to Layer ${layer}...`, 'info');
            const res = await fetch(`${API_URL}/api/graphics/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ layer, templateUrl, action })
            });
            const result = await res.json();
            if (result.success) {
                logCommand(`SUCCESS: ${result.message}`, 'success');
            } else {
                logCommand(`ERROR: ${result.error || 'Unknown'}`, 'error');
            }
        } catch (e: any) {
            logCommand(`FAILED: ${e.message}`, 'error');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full text-slate-200 space-y-8"
        >
            {/* Header Section */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
                        <Monitor className="text-indigo-500" size={32} />
                        OBS Graphic Playout
                    </h1>
                    <p className="text-slate-400 mt-2 font-medium">Broadcast-Grade WebSocket Control Interface</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Graphics Pool */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-slate-300 uppercase tracking-widest">
                        <ImageIcon size={20} className="text-indigo-400" /> Graphic Pool
                    </h2>

                    <div className="space-y-4">
                        {GRAPHICS.map((g, idx) => (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                key={g.id}
                                className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl overflow-hidden shadow-lg transition-all group relative"
                            >
                                <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${g.color}`} />
                                <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ml-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-black text-xl text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-400 transition-all">{g.name}</h3>
                                            <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-900/30 border border-indigo-500/30 px-2.5 py-1 rounded-full uppercase tracking-wider">Layer {g.layer}</span>
                                        </div>
                                        <p className="text-sm border border-slate-700 bg-slate-950/50 text-slate-400 mt-3 font-mono break-all py-1.5 px-3 rounded-md line-clamp-1">{g.url}</p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => sendCommand(g.layer, g.url, 'PLAY')}
                                            className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/50 px-5 py-2.5 rounded-lg text-sm font-black tracking-wider flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                                        >
                                            <Play size={16} fill="currentColor" /> PLAY
                                        </button>
                                        <button
                                            onClick={() => sendCommand(g.layer, g.url, 'UPDATE')}
                                            className="bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white border border-blue-500/50 px-4 py-2.5 rounded-lg text-sm font-black flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                                            title="Re-inject Data without restarting animation"
                                        >
                                            <RefreshCcw size={16} />
                                        </button>
                                        <button
                                            onClick={() => sendCommand(g.layer, g.url, 'STOP')}
                                            className="bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/50 px-4 py-2.5 rounded-lg text-sm font-black flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                                        >
                                            <Square size={16} fill="currentColor" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <button
                        onClick={() => sendCommand(0, '', 'CLEAR')}
                        className="w-full mt-6 bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/30 p-4 rounded-xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 active:translate-y-0 shadow-lg"
                    >
                        <Square fill="currentColor" size={20} /> CLEAR ALL GRAPHICS
                    </button>
                </div>

                {/* Event Log Terminal */}
                <div className="flex flex-col h-full">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-slate-300 uppercase tracking-widest mb-6 border-b border-transparent">
                        <Terminal size={20} className="text-slate-400" /> Action Log
                    </h2>

                    <div className="flex-1 bg-black rounded-xl border border-slate-800 shadow-[inset_0_4px_20px_rgba(0,0,0,0.5)] p-5 font-mono text-sm relative min-h-[400px]">
                        {/* Fake terminal window buttons */}
                        <div className="absolute top-3 right-4 flex gap-1.5 opacity-50">
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                        </div>

                        <div className="mt-4 flex flex-col justify-end space-y-1">
                            {statusLog.length === 0 && (
                                <div className="text-slate-600 font-bold flex items-center gap-2 animate-pulse mt-2">
                                    <span className="w-2 h-4 bg-slate-500 inline-block animate-ping rounded-sm" /> Waiting for commands...
                                </div>
                            )}

                            {statusLog.map((log, i) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={i}
                                    className={`flex items-start gap-3 py-1 ${log.type === 'error' ? 'text-red-400 bg-red-950/20 px-2 rounded' :
                                        log.type === 'success' ? 'text-green-400' :
                                            'text-blue-300'
                                        }`}
                                >
                                    <span className="text-slate-600 shrink-0">[{log.time.toLocaleTimeString('en-US', { hour12: false })}]</span>
                                    <span className="font-medium break-words leading-relaxed">{log.msg}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </motion.div>
    );
}
