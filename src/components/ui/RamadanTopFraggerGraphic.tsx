import { API_URL } from '@/lib/api-config';
"use client"

import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

interface PlayerStat {
    name: string;
    teamTag: string;
    elims: number;
    damage: number;
    avgSurvival: string;
    photoUrl?: string;
    logoUrl?: string;
    playerKey?: string;
}

function PlayerPortrait({ photoUrl, playerKey, name, theme }: { 
    photoUrl?: string; 
    playerKey?: string; 
    name: string; 
    theme: any; 
}) {
    const [imgSrc, setImgSrc] = useState<string | null>(
        photoUrl || (playerKey ? `${API_URL}/images/${playerKey}.png` : null)
    );
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!photoUrl && playerKey) {
            setImgSrc(`${API_URL}/images/${playerKey}.png`);
            setFailed(false);
        }
    }, [photoUrl, playerKey]);

    return (
        <div className="absolute top-[120px] left-[78px] w-[540px] h-[610px] z-[5] overflow-hidden flex items-end justify-center">
            {!failed && imgSrc ? (
                <img 
                    src={imgSrc} 
                    onError={() => {
                        if (imgSrc?.includes(':3000')) {
                            setImgSrc(`${API_URL}/images/${playerKey}.png`);
                        } else {
                            setFailed(true);
                        }
                    }} 
                    className="h-full object-bottom object-cover relative drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]" 
                    alt={name} 
                />
            ) : (
                <div className="w-[80%] h-[70%] bg-white/10 rounded-t-full mb-10 border-4 border-white/20 flex items-center justify-center">
                    <span className="text-[200px] text-white/30 font-black uppercase">{name?.charAt(0) || '?'}</span>
                </div>
            )}
        </div>
    );
}

interface GraphicCommand {
    templateUrl?: string;
    action: 'PLAY' | 'STOP' | 'UPDATE' | 'CLEAR';
    data?: any;
}

const mockPlayer: PlayerStat = {
    name: 'PLAYER NAME',
    teamTag: 'TEAM TAG',
    elims: 0,
    damage: 0,
    avgSurvival: '00.00',
    photoUrl: '/placeholder-player.png',
    logoUrl: '/placeholder-logo.png'
};

export default function RamadanTopFraggerGraphic() {
    const { theme, isDataOnly, isTransparent } = useTheme();
    const [player, setPlayer] = useState<PlayerStat>(mockPlayer);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const socket = io(`${API_URL}`);

        socket.on('graphic_command', (cmd: GraphicCommand) => {
            if (cmd.templateUrl?.includes('/overlays/top-fragger')) {
                if (cmd.action === 'PLAY') setIsVisible(true);
                else if (cmd.action === 'STOP' || cmd.action === 'CLEAR') setIsVisible(false);
            }
        });

        socket.on('match_state_update', (data: any) => {
            if (data?.activePlayers && Array.isArray(data.activePlayers)) {
                // Find Top Fragger (Highest Eliminators then Damage)
                const sorted = [...data.activePlayers].sort((a, b) => {
                    const killsDiff = (b.killNum || 0) - (a.killNum || 0);
                    if (killsDiff !== 0) return killsDiff;
                    const dmgDiff = (b.damage || 0) - (a.damage || 0);
                    if (dmgDiff !== 0) return dmgDiff;
                    return (a.playerKey || '').localeCompare(b.playerKey || '');
                });

                if (sorted.length > 0) {
                    const top = sorted[0];
                    setPlayer({
                        name: top.name || 'UNKNOWN',
                        teamTag: top.teamName || 'TEAM',
                        elims: top.killNum || 0,
                        damage: top.damage || 0,
                        avgSurvival: top.survivalTime ? `${Math.floor(Number(top.survivalTime) / 60)}:${String(Number(top.survivalTime) % 60).padStart(2, '0')}` : '00.00',
                        photoUrl: top.photoUrl,
                        logoUrl: top.logoUrl || '/placeholder-logo.png',
                        playerKey: top.playerKey
                    });
                }
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
                    key="ramadan-match-top-fragger-template-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`w-[1920px] h-[1080px] overflow-hidden relative font-['Inter'] bg-transparent`}
                >
                    {/* THE BACKGROUND TEMPLATE */}
                    {!isDataOnly && (
                        <>
                            <img
                                src="/templates/top-fragger.jpg"
                                alt="Background Template"
                                className="absolute inset-0 w-full h-full object-cover z-0"
                            />
                            {/* PREMIUM OVERLAYS */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent z-[1] pointer-events-none" />
                            <div className="absolute inset-0 z-[1] pointer-events-none" 
                                 style={{ background: `radial-gradient(circle at 30% 50%, ${theme.primary}1a, transparent 70%)` }} />
                        </>
                    )}

                    {/* DYNAMIC PLAYER PHOTO */}
                    <PlayerPortrait 
                        photoUrl={player.photoUrl} 
                        playerKey={player.playerKey} 
                        name={player.name} 
                        theme={theme} 
                    />

                    {/* DYNAMIC PLAYER TEAM LOGO */}
                    <motion.div 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.4, type: "spring", damping: 15 }}
                        className="absolute top-[520px] left-[450px] w-[160px] h-[160px] z-[6] flex items-center justify-center pointer-events-none bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-2xl"
                    >
                        <img src={player.logoUrl || '/placeholder-logo.png'} className="max-w-[70%] max-h-[70%] object-contain drop-shadow-lg" alt="Logo" />
                    </motion.div>

                    {/* DYNAMIC TEXT GROUP: Player Name & Team */}
                    <motion.div 
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.5 }}
                        className="absolute top-[750px] left-[100px] w-[550px] h-[140px] bg-white/95 backdrop-blur-xl z-10 flex flex-col justify-center px-8 border-l-[12px] shadow-2xl overflow-hidden"
                        style={{ borderColor: theme.primary }}
                    >
                        <h2 
                            className="font-black uppercase leading-[0.9] tracking-tighter"
                            style={{ 
                                color: theme.primary,
                                fontSize: player.name.length > 12 ? (player.name.length > 18 ? '2.2rem' : '2.8rem') : '3.8rem',
                                transition: 'font-size 0.3s ease'
                            }}
                        >
                            {player.name}
                        </h2>
                        <div className="flex items-center gap-3 mt-2">
                             <div className="h-[2px] w-12 bg-gray-300" />
                             <h3 className="text-xl font-bold text-gray-600 uppercase tracking-[0.3em] font-mono">{player.teamTag}</h3>
                        </div>
                    </motion.div>

                    {/* DYNAMIC TEXT GROUP: Stats Area */}
                    <div className="absolute top-[250px] left-[615px] w-[270px] h-[400px] z-10 flex flex-col justify-between text-center gap-[40px] pt-[20px]">

                        {[
                            { label: 'ELIMINATIONS', value: player.elims.toString().padStart(2, '0'), delay: 0.8 },
                            { label: 'DAMAGE', value: Math.round(player.damage).toString().padStart(3, '0'), delay: 0.9, top: 30 },
                            { label: 'AVG SURVIVAL', value: player.avgSurvival, delay: 1.0, top: 65 }
                        ].map((stat, i) => (
                            <motion.div 
                                key={i}
                                initial={{ x: 50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: stat.delay, duration: 0.4 }}
                                className="flex flex-col items-center justify-center px-4 w-full h-[70px] shadow-lg relative"
                                style={{ 
                                    top: stat.top ? `${stat.top}px` : '0',
                                    backgroundColor: theme.secondary
                                }}
                            >
                                <div className="absolute -left-2 top-0 bottom-0 w-1" style={{ backgroundColor: theme.primary }} />
                                <p className="text-[3.8rem] font-black leading-none mb-1 drop-shadow-sm font-mono tracking-tighter" style={{ color: theme.primary }}>{stat.value}</p>
                                <p className="absolute -bottom-6 left-0 text-[10px] font-black text-white px-2 py-0.5 tracking-widest" style={{ backgroundColor: theme.primary }}>{stat.label}</p>
                            </motion.div>
                        ))}

                    </div>

                </motion.div>
            )}
        </AnimatePresence>
    );
}
