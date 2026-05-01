import { API_URL } from '@/lib/api-config';
"use client"

import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

interface PlayerStat {
    name: string;
    teamTag: string;
    damage: number;
    elims: number;
    surTime: string;
    photoUrl?: string;
    logoUrl?: string;
}

interface GraphicCommand {
    templateUrl?: string;
    action: 'PLAY' | 'STOP' | 'UPDATE' | 'CLEAR';
    data?: any;
}

const mockFraggers = [
    { name: 'PLAYER NAME', teamTag: 'TEAM TAG', damage: 0, elims: 0, surTime: '00:00', photoUrl: 'http://localhost:3001/images/default.png', logoUrl: '/placeholder-logo.png' },
    { name: 'PLAYER NAME', teamTag: 'TEAM TAG', damage: 0, elims: 0, surTime: '00:00', photoUrl: 'http://localhost:3001/images/default.png', logoUrl: '/placeholder-logo.png' },
    { name: 'PLAYER NAME', teamTag: 'TEAM TAG', damage: 0, elims: 0, surTime: '00:00', photoUrl: 'http://localhost:3001/images/default.png', logoUrl: '/placeholder-logo.png' },
    { name: 'PLAYER NAME', teamTag: 'TEAM TAG', damage: 0, elims: 0, surTime: '00:00', photoUrl: 'http://localhost:3001/images/default.png', logoUrl: '/placeholder-logo.png' },
];

export default function RamadanTopFraggersListGraphic() {
    const { theme } = useTheme();
    const [fraggers, setFraggers] = useState<PlayerStat[]>(mockFraggers);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const socket = io(`${API_URL}`);

        socket.on('graphic_command', (cmd: GraphicCommand) => {
            if (cmd.templateUrl?.includes('/overlays/top-fraggers-list')) {
                if (cmd.action === 'PLAY') setIsVisible(true);
                else if (cmd.action === 'STOP' || cmd.action === 'CLEAR') setIsVisible(false);
            }
        });

        socket.on('match_state_update', (data: any) => {
            if (data?.activePlayers && Array.isArray(data.activePlayers)) {
                // Sort by Kills, then Damage
                const sorted = [...data.activePlayers].sort((a, b) => {
                    const killsDiff = (b.killNum || 0) - (a.killNum || 0);
                    if (killsDiff !== 0) return killsDiff;
                    const dmgDiff = (b.damage || 0) - (a.damage || 0);
                    if (dmgDiff !== 0) return dmgDiff;
                    return (a.playerKey || '').localeCompare(b.playerKey || '') || (a.playerName || '').localeCompare(b.playerName || '');
                });

                const topFour = sorted.slice(0, 4).map(p => ({
                    name: p.name || 'UNKNOWN',
                    teamTag: p.teamName || 'TEAM',
                    damage: p.damage || 0,
                    elims: p.killNum || 0,
                    surTime: p.survivalTime ? `${Math.floor(Number(p.survivalTime) / 60)}:${String(Number(p.survivalTime) % 60).padStart(2, '0')}` : '00:00',
                    photoUrl: p.photoUrl,
                    logoUrl: p.logoUrl || '/placeholder-logo.png'
                }));

                // Ensure exactly 4 rows render
                while (topFour.length < 4) {
                    topFour.push({ name: 'PLAYER NAME', teamTag: 'TEAM TAG', damage: 0, elims: 0, surTime: '00:00', photoUrl: 'http://localhost:3001/images/default.png', logoUrl: '/placeholder-logo.png' });
                }

                setFraggers(topFour);
            }
        });

        return () => {
            socket.disconnect();
        }
    }, []);

    return (
        <AnimatePresence mode="wait">
            {isVisible && (
                <motion.div
                    key="ramadan-fraggers-list-template-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-[1920px] h-[1080px] overflow-hidden relative font-['Inter'] flex bg-transparent"
                >
                    {/* The Background Template image provided by the Designer */}
                    <img
                        src="/templates/top-fraggers-list.jpg"
                        alt="Background Template"
                        className="absolute inset-0 w-full h-full object-cover z-0"
                    />

                    {/* DYNAMIC PLAYER ROWS */}
                    <div className="absolute top-[313px] left-[138px] h-[550px] w-[1400px] z-[10] flex flex-col justify-between">
                        {fraggers.map((p, i) => (
                            <div key={i} className="flex items-center w-full h-[115px] relative">

                                {/* Photo Area: Absolutely positioned covering the empty grey suit spot */}
                                <div className="absolute left-[0px] w-[115px] h-[115px] bg-white overflow-hidden flex items-end justify-center">
                                    <img
                                        src={p.photoUrl || 'http://localhost:3001/images/default.png'}
                                        onError={(e) => { e.currentTarget.src = 'http://localhost:3001/images/default.png'; e.currentTarget.onerror = null; }}
                                        className="h-full object-cover relative pointer-events-none"
                                        alt=""
                                    />
                                </div>

                                {/* Text Area: Absolutely positioned covering the white gap next to photo */}
                                <div className="absolute left-[130px] flex flex-col justify-center h-full w-[310px] bg-white pt-2 border-r border-gray-100">
                                    <h3 
                                        className="font-black italic uppercase leading-none"
                                        style={{ 
                                            color: theme.primary,
                                            fontSize: p.name.length > 12 ? (p.name.length > 18 ? '1.4rem' : '1.7rem') : '2.2rem',
                                            transition: 'font-size 0.2s ease'
                                        }}
                                    >
                                        {p.name || 'NAME'}
                                    </h3>
                                    <div className="flex items-center gap-3 w-fit mt-2 bg-white">
                                        <div className="h-[2px] w-6 bg-gray-300" />
                                        <p className="text-[1rem] font-bold text-gray-500 uppercase tracking-widest truncate max-w-[200px]">{p.teamTag || 'TEAM'}</p>
                                    </div>
                                </div>

                                {/* Stats Area: Covering the 3 large placeholder numbers perfectly inside the green rows */}
                                <div className="absolute left-[460px] w-[800px] h-full flex items-center pt-8 pr-12">
                                    {/* Damage block */}
                                    <div className="w-[180px] text-center relative" style={{ backgroundColor: theme.secondary }}>
                                        <p className="text-[3.8rem] tracking-tight font-black italic leading-none" style={{ color: theme.primary }}>{Math.round(p.damage || 0).toString().padStart(3, '0')}</p>
                                        <span className="absolute -top-4 left-0 text-[10px] font-black text-white px-1 tracking-widest" style={{ backgroundColor: theme.primary }}>DMG</span>
                                    </div>

                                    {/* Elims block */}
                                    <div className="w-[180px] ml-[30px] text-center relative" style={{ backgroundColor: theme.secondary }}>
                                        <p className="text-[3.8rem] tracking-tight font-black italic leading-none" style={{ color: theme.primary }}>{(p.elims || 0).toString().padStart(2, '0')}</p>
                                        <span className="absolute -top-4 left-0 text-[10px] font-black text-white px-1 tracking-widest" style={{ backgroundColor: theme.primary }}>ELIMS</span>
                                    </div>

                                    {/* Sur Time block */}
                                    <div className="w-[180px] ml-[30px] text-center relative" style={{ backgroundColor: theme.secondary }}>
                                        <p className="text-[3.8rem] tracking-tight font-black italic leading-none" style={{ color: theme.primary }}>{p.surTime || '00:00'}</p>
                                        <span className="absolute -top-4 left-0 text-[10px] font-black text-white px-1 tracking-widest" style={{ backgroundColor: theme.primary }}>SURV</span>
                                    </div>
                                </div>

                            </div>
                        ))}
                    </div>

                    {/* DYNAMIC TEAM LOGOS */}
                    <div className="absolute top-[313px] left-[138px] h-[550px] w-full z-[12] flex flex-col justify-between pointer-events-none opacity-60">
                        {fraggers.map((p, i) => (
                            <div key={`logo-${i}`} className="h-[115px] flex items-center justify-start pl-[415px]">
                                {p.logoUrl && (
                                    <div className="w-[40px] h-[40px] bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center p-1 border border-white/20">
                                        <img src={p.logoUrl} className="max-w-full max-h-full object-contain" alt="Logo" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                </motion.div>
            )}
        </AnimatePresence>
    );
}
