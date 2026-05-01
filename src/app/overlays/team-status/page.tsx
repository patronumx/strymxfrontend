"use client"
import { API_URL } from '@/lib/api-config';


import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';

// Similar interface to the dashboard, but styled for broadcast
interface PlayerStat {
    playerKey: string;
    name?: string;
    teamName: string;
    health: number;
    liveState: number; // 0=Alive, 1=Knocked, 2=Dead
    killNum: number;
    damage: number;
}

export default function TeamStatusOverlay() {
    const [players, setPlayers] = useState<PlayerStat[]>([]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const matchId = urlParams.get('matchId') || 'pmtm-s4-match-1';

        // Fetch initial state for OBS
        fetch(`${API_URL}/api/match-state/${matchId}`)
            .then(res => res.json())
            .then(data => {
                if (data.activePlayers && data.activePlayers.length > 0) {
                    setPlayers(data.activePlayers);
                }
            })
            .catch(err => console.error("Initial fetch error:", err));

        // Hidden connection to backend (no UI indicators needed for broadcast)
        const newSocket = io(`${API_URL}`);

        newSocket.on('match_state_update', (data) => {
            if (data.activePlayers) {
                setPlayers(data.activePlayers);
            }
        });

        return () => {
            newSocket.close();
        };
    }, []);

    // Group players by team for the overlay
    const teamsMap = players.reduce((acc, player) => {
        if (!acc[player.teamName]) {
            acc[player.teamName] = [];
        }
        acc[player.teamName].push(player);
        return acc;
    }, {} as Record<string, PlayerStat[]>);

    // Convert map to array and sort by alive players then totally by Kills (example logic)
    const teamsList = Object.keys(teamsMap).map(teamName => {
        const roster = teamsMap[teamName];
        const aliveCount = roster.filter(p => p.liveState !== 2).length;
        const totalKills = roster.reduce((sum, p) => sum + p.killNum, 0);
        return { teamName, roster, aliveCount, totalKills };
    }).sort((a, b) => b.aliveCount - a.aliveCount || b.totalKills - a.totalKills);

    // If match hasn't started or no data, render nothing (transparent)
    if (teamsList.length === 0) return null;

    return (
        <div className="w-full h-full p-8 flex flex-col justify-end items-start pointer-events-none font-sans">
            {/* OBS Overlay container - positioned bottom-left */}
            <div className="w-[450px] space-y-2">

                <AnimatePresence>
                    {teamsList.map((team) => (
                        // Only show teams that are still alive in this specific widget
                        team.aliveCount > 0 && (
                            <motion.div
                                key={team.teamName}
                                initial={{ opacity: 0, x: -50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.5, type: 'spring' }}
                                className="bg-slate-900/90 backdrop-blur-md border-l-4 border-blue-500 rounded-r-lg shadow-2xl overflow-hidden"
                            >
                                <div className="px-4 py-2 flex justify-between items-center bg-gradient-to-r from-slate-800/80 to-transparent">
                                    <span className="font-bold text-white text-lg tracking-wider drop-shadow-md">
                                        {team.teamName}
                                    </span>
                                    <span className="text-white font-black bg-slate-950/50 px-3 py-1 rounded">
                                        {team.totalKills} KILLS
                                    </span>
                                </div>

                                <div className="px-3 pb-3 pt-1 space-y-1">
                                    {team.roster.map(p => (
                                        <div key={p.playerKey} className="flex items-center gap-3">
                                            {/* Status Indicator */}
                                            <div className={`w-2 h-2 rounded-full ${p.liveState === 0 ? 'bg-emerald-400' :
                                                p.liveState === 1 ? 'bg-amber-400 animate-pulse' :
                                                    'bg-red-600'
                                                }`} />

                                            {/* Name */}
                                            <span className={`text-sm w-24 truncate font-medium drop-shadow ${p.liveState === 2 ? 'text-slate-500 line-through' : 'text-slate-200'
                                                }`}>
                                                {p.name || p.playerKey.slice(-5)}
                                            </span>

                                            {/* HP Bar */}
                                            {p.liveState !== 2 ? (
                                                <div className="flex-1 h-3 bg-slate-950/50 rounded-full overflow-hidden border border-slate-700/50">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.max(0, p.health)}%` }}
                                                        transition={{ duration: 0.3 }}
                                                        className={`h-full ${p.health > 40 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex-1 text-xs text-red-500 tracking-widest font-bold opacity-70">
                                                    ELIMINATED
                                                </div>
                                            )}

                                            {/* Individual Kills */}
                                            {p.liveState !== 2 && (
                                                <span className="text-xs font-bold text-blue-300 w-4 text-right">
                                                    {p.killNum}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )
                    ))}
                </AnimatePresence>

            </div>
        </div>
    );
}
