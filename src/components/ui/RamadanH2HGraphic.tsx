import { API_URL } from '@/lib/api-config';
"use client"

import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

interface PlayerStat {
    name: string;
    teamTag: string;
    avgElims: number;
    avgDamage: number;
    avgHeadshots: number;
    avgAssists: number;
    avgSurvival: string;
    photoUrl?: string;
    playerKey?: string;
}

function PlayerPortrait({ photoUrl, playerKey, name, theme, color }: { 
    photoUrl?: string; 
    playerKey?: string; 
    name: string; 
    theme: any; 
    color: string;
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
        <div className="absolute inset-0 flex items-end justify-center">
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
                    className="h-full object-contain absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none" 
                    alt={name} 
                />
            ) : (
                <div className="w-[80%] h-[70%] bg-gray-200 rounded-t-full mb-10 border-4 flex items-center justify-center" style={{ borderColor: color }}>
                    <span className="text-[150px] font-black uppercase" style={{ color: `${color}44` }}>{name?.charAt(0) || '?'}</span>
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

const mockPlayer1: PlayerStat = {
    name: 'Atif',
    teamTag: 'TAG',
    avgElims: 1.5,
    avgDamage: 450,
    avgHeadshots: 0.8,
    avgAssists: 1.2,
    avgSurvival: '18:25',
    photoUrl: '/placeholder-player.png'
};

const mockPlayer2: PlayerStat = {
    name: 'Jon',
    teamTag: 'TAG',
    avgElims: 2.1,
    avgDamage: 520,
    avgHeadshots: 1.1,
    avgAssists: 0.9,
    avgSurvival: '21:10',
    photoUrl: '/placeholder-player.png'
};

export default function RamadanH2HGraphic() {
    const { theme, isDataOnly, isTransparent } = useTheme();
    const [player1, setPlayer1] = useState<PlayerStat>(mockPlayer1);
    const [player2, setPlayer2] = useState<PlayerStat>(mockPlayer2);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const socket = io(`${API_URL}`);

        socket.on('graphic_command', (cmd: GraphicCommand) => {
            if (cmd.templateUrl?.includes('/overlays/h2h')) {
                if (cmd.action === 'PLAY') setIsVisible(true);
                else if (cmd.action === 'STOP' || cmd.action === 'CLEAR') setIsVisible(false);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const StatBar = ({ label, p1Value, p2Value, max }: { label: string, p1Value: number | string, p2Value: number | string, max: number }) => {
        const p1Num = typeof p1Value === 'number' ? p1Value : 0;
        const p2Num = typeof p2Value === 'number' ? p2Value : 0;

        return (
            <div className="flex flex-col gap-1 w-full max-w-[800px]">
                <div className="flex justify-between px-10">
                    <span className="text-4xl font-black italic" style={{ color: theme.primary }}>{p1Value}</span>
                    <span className="text-xl font-bold uppercase tracking-widest text-[#121212]">{label}</span>
                    <span className="text-4xl font-black italic" style={{ color: theme.secondary }}>{p2Value}</span>
                </div>
                <div className="h-10 flex w-full bg-gray-200">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(p1Num / max) * 100}%` }}
                        className="h-full"
                        style={{ backgroundColor: theme.primary }}
                    />
                    <div className="flex-1 bg-gray-200" />
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(p2Num / max) * 100}%` }}
                        className="h-full"
                        style={{ backgroundColor: theme.secondary }}
                    />
                </div>
            </div>
        );
    };

    return (
        <AnimatePresence mode="wait">
            {isVisible && (
                <motion.div
                    key="ramadan-h2h-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`overlay-container flex flex-col items-center justify-center bg-transparent`}
                >
                    {/* Background Slants */}
                    {!isDataOnly && (
                        <>
                            <div className="absolute top-0 left-0 w-1/3 h-full slanted-bg-pink opacity-5 z-0" />
                            <div className="absolute top-0 right-0 w-1/3 h-full slanted-bg-lime opacity-5 z-0" />
                        </>
                    )}

                    {/* Header */}
                    <div className="absolute top-20 flex flex-col items-center">
                        <h1 className="text-6xl font-black italic" style={{ color: theme.primary }}>HEAD TO HEAD</h1>
                        <div className="w-40 h-1 mt-2" style={{ backgroundColor: theme.secondary }} />
                    </div>

                    {/* Players Section */}
                    <div className="flex items-center justify-between w-full px-40 z-10">
                        {/* Player 1 Image placeholder */}
                        <motion.div
                            initial={{ x: -100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="w-[400px] h-[600px] bg-gray-100 border-b-8 relative"
                            style={{ borderBottomColor: theme.primary }}
                        >
                            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center w-full focus-within:z-50">
                                <h2 className="text-6xl font-black italic uppercase" style={{ color: theme.primary }}>{player1?.name || 'NAME'}</h2>
                                <p className="text-2xl font-bold text-gray-500">TEAM {player1?.teamTag || 'TEAM'}</p>
                            </div>
                            <PlayerPortrait 
                                photoUrl={player1.photoUrl} 
                                playerKey={player1.playerKey} 
                                name={player1.name} 
                                theme={theme} 
                                color={theme.primary} 
                            />
                        </motion.div>

                        {/* Mid Stats */}
                        <div className="flex flex-col gap-6 flex-1 items-center">
                            <StatBar label="Avg. Eliminations" p1Value={player1?.avgElims || 0} p2Value={player2?.avgElims || 0} max={5} />
                            <StatBar label="Avg. Damage" p1Value={player1?.avgDamage || 0} p2Value={player2?.avgDamage || 0} max={1000} />
                            <StatBar label="Avg. Headshots" p1Value={player1?.avgHeadshots || 0} p2Value={player2?.avgHeadshots || 0} max={3} />
                            <StatBar label="Avg. Assists" p1Value={player1?.avgAssists || 0} p2Value={player2?.avgAssists || 0} max={5} />
                            <StatBar label="Avg. Survival Time" p1Value={player1?.avgSurvival || '00:00'} p2Value={player2?.avgSurvival || '00:00'} max={1} />
                        </div>

                        {/* Player 2 Image placeholder */}
                        <motion.div
                            initial={{ x: 100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="w-[400px] h-[600px] bg-gray-100 border-b-8 relative"
                            style={{ borderBottomColor: theme.secondary }}
                        >
                            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center w-full">
                                <h2 className="text-6xl font-black italic uppercase" style={{ color: theme.secondary }}>{player2?.name || 'NAME'}</h2>
                                <p className="text-2xl font-bold text-gray-500">TEAM {player2?.teamTag || 'TEAM'}</p>
                            </div>
                            <PlayerPortrait 
                                photoUrl={player2.photoUrl} 
                                playerKey={player2.playerKey} 
                                name={player2.name} 
                                theme={theme} 
                                color={theme.secondary} 
                            />
                        </motion.div>
                    </div>

                    {/* Footer logos - simple text for now */}
                    <div className="absolute bottom-10 w-full flex justify-between px-20 text-xs font-bold text-gray-400">
                        <div>KRAFTON | LEVEL INFINITE | LIGHTSPEED STUDIOS</div>
                        <div className="text-center font-black text-pink-500">POWERED BY<br /><span className="text-xl">STRYMX</span></div>
                        <div>ZONG 4G | LET'S GET DIGITAL</div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
