import { API_URL } from '@/lib/api-config';
"use client"

import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

// WebSockets power the React Overlay instead of CasparCG amcp

interface PlayerStat {
    playerKey: string;
    name?: string;
    teamName: string;
    killNum: number;
    damage: number;
    assists: number;
    survivalTime: number; // in seconds
    photoUrl?: string;
    logoUrl?: string;
    // New metrics
    knockouts: number;
    headShotNum: number;
}

export default function MVPGraphic({ matchId = "test-match-001" }: { matchId?: string }) {
    const { theme } = useTheme();
    const [mvp, setMvp] = useState<PlayerStat | null>(null);
    const [isVisible, setIsVisible] = useState(false); // Controlled by CasparCG
    const [playKey, setPlayKey] = useState(0);

    const processData = (activePlayers: PlayerStat[]) => {
        // For MVP, simplistic formula: Kills * 10 + Damage
        if (!activePlayers || activePlayers.length === 0) return;
        const valid = activePlayers.filter(p => p.name !== 'Unknown');
        const sorted = valid.sort((a, b) => (b.killNum * 10 + b.damage) - (a.killNum * 10 + a.damage));

        if (sorted.length > 0) {
            setMvp(sorted[0]);
        }
    };

    useEffect(() => {
        const processData = (activePlayers: PlayerStat[]) => {
            // For MVP, simplistic formula: Kills * 10 + Damage
            if (!activePlayers || activePlayers.length === 0) return;
            const valid = activePlayers.filter(p => p.name !== 'Unknown');
            const sorted = valid.sort((a, b) => (b.killNum * 10 + b.damage) - (a.killNum * 10 + a.damage));

            if (sorted.length > 0) {
                setMvp(sorted[0]);
            }
        };

        fetch(`${API_URL}/api/match-state/${matchId}`)
            .then(res => res.json())
            .then(data => { if (data.activePlayers) processData(data.activePlayers); })
            .catch(console.error);

        const socket = io(`${API_URL}`);
        socket.on('match_state_update', (data) => {
            if (data.activePlayers) processData(data.activePlayers);
        });

        // WebSocket Control Listener for OBS
        socket.on('graphic_command', (cmd) => {
            if (cmd.templateUrl && !cmd.templateUrl.includes('/overlays/mvp')) return;

            if (cmd.action === 'PLAY') {
                setPlayKey(Date.now());
                setIsVisible(true);
            } else if (cmd.action === 'STOP' || cmd.action === 'CLEAR') {
                setIsVisible(false);
            } else if (cmd.action === 'UPDATE' && cmd.data) {
                try {
                    const parsed = typeof cmd.data === 'string' ? JSON.parse(cmd.data) : cmd.data;
                    if (parsed.activePlayers) processData(parsed.activePlayers);
                } catch (e) { console.error('Update parse error', e); }
            }
        });

        // Optional: Local testing auto-play
        const t = setTimeout(() => setIsVisible(true), 500);

        return () => {
            clearTimeout(t);
            socket.off('graphic_command');
            socket.disconnect();
        }
    }, [matchId]);

    if (!mvp) return null;

    // Format survival time from seconds to MM:SS
    const minutes = Math.floor((mvp.survivalTime || 0) / 60);
    const seconds = Math.floor((mvp.survivalTime || 0) % 60);
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    return (

        <AnimatePresence mode="wait">
            {isVisible && (
                <motion.div
                    key={playKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-[1920px] h-[1080px] bg-transparent flex flex-col font-sans select-none overflow-hidden relative">


                    {/* PREMIUM BACKGROUND removed for absolute transparency */}

                    {/* Top Header Bar */}
                    <div className="absolute top-0 w-full h-[250px] flex items-center px-24 z-20 overflow-hidden">
                        <motion.div
                            initial={{ x: -200, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3, type: 'spring', damping: 20 }}
                            className="flex flex-col"
                        >
                            <div className="flex items-center gap-4 mb-2">
                                <div className="h-[4px] w-24" style={{ backgroundColor: theme.secondary }} />
                                <p className="text-2xl font-black tracking-[0.4em] uppercase" style={{ color: theme.secondary }}>Most Valuable Player</p>
                            </div>
                            <h1 className="text-[160px] font-black text-white tracking-tighter uppercase leading-[0.8] drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]">MVP</h1>
                            <p className="text-xl font-bold text-slate-400 tracking-widest mt-8 uppercase border-l-4 pl-6" style={{ borderColor: theme.secondary }}>Season Pro League | Match #5</p>
                        </motion.div>
                    </div>

                    {/* Central Player Cutout */}
                    <motion.div
                        initial={{ y: 400, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5, type: 'spring', damping: 25 }}
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[950px] w-[900px] flex items-end justify-center z-10">
                        {mvp.photoUrl ? (
                            <img src={`${API_URL}${mvp.photoUrl}`} className="h-full object-cover object-bottom filter drop-shadow-2xl" alt={mvp.name} />
                        ) : (
                            <div className="w-[600px] h-[800px] bg-slate-200 rounded-t-[300px] border-[12px] border-white flex items-center justify-center shadow-2xl">
                                <span className="text-[300px] text-slate-400 font-black">{mvp.name?.charAt(0)}</span>
                            </div>
                        )}
                    </motion.div>

                    {/* Right Side Stats Panel */}
                    <div className="absolute right-24 top-[35%] w-[450px] flex flex-col items-end z-20">

                        {/* Name Badge */}
                        <motion.div
                            initial={{ x: 200, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.7, type: 'spring', damping: 20 }}
                            className="flex items-center gap-8 mb-20 bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-3xl w-full"
                        >
                            <img src={mvp.logoUrl?.replace('http:', `${API_URL}`)} onError={(e) => e.currentTarget.style.display = 'none'} className="h-28 object-contain filter drop-shadow-2xl" alt="" />
                            <div className="flex flex-col">
                                <span className="text-xl font-black uppercase tracking-widest mb-1" style={{ color: theme.secondary }}>{mvp.teamName}</span>
                                <span 
                                    className="font-black text-white uppercase tracking-tighter"
                                    style={{ 
                                        fontSize: (mvp.name?.length || 0) > 12 ? '3.5rem' : '4.5rem',
                                        transition: 'font-size 0.3s ease'
                                    }}
                                >
                                    {mvp.name}
                                </span>
                            </div>
                        </motion.div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-x-12 gap-y-12 w-full">

                            {[
                                { label: 'Eliminations', value: mvp.killNum, delay: 1.0 },
                                { label: 'Damage', value: Math.round(mvp.damage), delay: 1.1 },
                                { label: 'Headshots', value: mvp.headShotNum || 0, delay: 1.2 },
                                { label: 'Knockouts', value: mvp.knockouts || 0, delay: 1.3 },
                                { label: 'Assists', value: mvp.assists, delay: 1.4 },
                                { label: 'Surv. Time', value: timeString, delay: 1.5 }
                            ].map((stat, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ scale: 0.8, opacity: 0 }} 
                                    animate={{ scale: 1, opacity: 1 }} 
                                    transition={{ delay: stat.delay, type: 'spring', damping: 15 }} 
                                    className="flex flex-col items-center bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-xl"
                                >
                                    <span className="text-7xl font-black leading-none" style={{ color: theme.primary }}>
                                        {stat.value}
                                    </span>
                                    <span className="text-sm font-black text-slate-500 tracking-[0.3em] uppercase mt-4">{stat.label}</span>
                                </motion.div>
                            ))}

                        </div>
                    </div>

                    {/* Left Side: Mock Damage Distribution */}
                    <motion.div
                        initial={{ opacity: 0, x: -100 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 2.0 }}
                        className="absolute left-32 bottom-32 w-[300px] flex flex-col items-center z-20">
                        <div className="w-[200px] h-[400px] opacity-40">
                            {/* Simplified stick figure proxy for Damage Distribution */}
                            <svg viewBox="0 0 100 200" className="w-full h-full stroke-indigo-900 stroke-[4] fill-transparent">
                                <circle cx="50" cy="30" r="15" className="fill-indigo-900/20" /> {/* Head */}
                                <path d="M50 45 v60" className="stroke-[8]" /> {/* Torso */}
                                <path d="M20 50 L50 45 L80 50 M20 100 L20 50 M80 100 L80 50" /> {/* Arms */}
                                <path d="M50 105 L30 180 M50 105 L70 180" className="stroke-[8]" /> {/* Legs */}

                                {/* Hit markers */}
                                <motion.circle initial={{ r: 0 }} animate={{ r: 6 }} transition={{ delay: 2.2, type: 'spring' }} cx="50" cy="70" className="fill-amber-500 stroke-none" />
                                <motion.circle initial={{ r: 0 }} animate={{ r: 6 }} transition={{ delay: 2.3, type: 'spring' }} cx="30" cy="140" className="fill-amber-500 stroke-none" />
                            </svg>
                        </div>
                        <div className="text-xl font-bold text-indigo-900 tracking-widest uppercase mt-4">Damage Distribution</div>
                    </motion.div>

                    {/* Bottom Gradient Overlay */}
                    <div className="absolute bottom-0 w-full h-[50px] bg-gradient-to-t from-black/20 to-transparent z-30 pointer-events-none" />

                </motion.div>
            )}
        </AnimatePresence>
    );
}
