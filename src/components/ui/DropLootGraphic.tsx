"use client"
import { API_URL } from '@/lib/api-config';


import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import { Package } from 'lucide-react';

interface PlayerData {
    playerKey: string;
    name: string;
    teamName: string;
    teamId?: number;
    logoUrl?: string;
    photoUrl?: string;
    teamTag?: string;
}

function PlayerPortrait({ photoUrl, playerKey, name }: {
    photoUrl?: string;
    playerKey: string;
    name: string;
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
        <div className="relative h-full w-full flex items-end justify-center">
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
                    className="h-[120%] object-contain drop-shadow-[0_20px_20px_rgba(0,0,0,0.5)]"
                    alt={name}
                />
            ) : (
                <div className="w-[80%] h-[70%] bg-white/10 rounded-t-full mt-auto mb-4 border-4 border-white/20 flex items-center justify-center">
                    <span className="text-9xl text-white/30 font-black uppercase">{name?.charAt(0) || '?'}</span>
                </div>
            )}
        </div>
    );
}

export default function DropLootGraphic() {
    const { theme } = useTheme();
    const [isVisible, setIsVisible] = useState(false);
    const [player, setPlayer] = useState<PlayerData | null>(null);
    const [playKey, setPlayKey] = useState(0);

    useEffect(() => {
        const socket = io(`${API_URL}`);

        socket.on('graphic_command', (cmd) => {
            if (cmd.templateUrl === '/overlays/drop-looted') {
                if (cmd.action === 'PLAY') {
                    setPlayer(cmd.data);
                    setPlayKey(Date.now());
                    setIsVisible(true);

                    // Auto-hide after 8 seconds
                    setTimeout(() => setIsVisible(false), 8000);
                } else if (cmd.action === 'STOP' || cmd.action === 'CLEAR') {
                    setIsVisible(false);
                }
            }
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    if (!player) return null;

    return (
        <AnimatePresence mode="wait">
            {isVisible && (
                <motion.div
                    key={playKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-[1920px] h-[1080px] overflow-hidden relative font-sans select-none bg-transparent"
                >
                    {/* MAIN CONTAINER SLIDE IN */}
                    <motion.div
                        initial={{ x: -1000 }}
                        animate={{ x: 0 }}
                        exit={{ x: -1000 }}
                        transition={{ type: "spring", damping: 25, stiffness: 120 }}
                        className="absolute top-[300px] left-[100px] w-[1000px] h-[350px] flex items-center"
                    >
                        {/* LIME SLASH BACKGROUND */}
                        <div className="absolute inset-0 bg-[#95c11f] transform -skew-x-12 z-0 border-r-[10px] border-[#7aa31a] shadow-2xl" />

                        {/* PLAYER PHOTO */}
                        <motion.div
                            initial={{ opacity: 0, x: -100 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="relative z-10 h-full w-[350px] flex items-end justify-center ml-12"
                        >
                            <PlayerPortrait
                                photoUrl={player.photoUrl}
                                playerKey={player.playerKey}
                                name={player.name}
                            />

                            {/* TEAM LOGO OVERLAY ON PHOTO */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.6, type: "spring" }}
                                className="absolute top-20 left-0 w-24 h-24 bg-white/10 backdrop-blur-md rounded-full p-2 border border-white/20 shadow-xl"
                            >
                                <img
                                    src={player.logoUrl || `${API_URL}/placeholder-logo.png`}
                                    className="w-full h-full object-contain filter drop-shadow-md"
                                    alt={player.teamName}
                                />
                            </motion.div>
                        </motion.div>

                        {/* TEXT AREA */}
                        <div className="flex flex-col ml-8 z-10">
                            <motion.h2
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-[140px] font-black italic tracking-tighter text-[#e91e63] leading-none uppercase drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)]"
                            >
                                DROP
                            </motion.h2>
                            <motion.h3
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="text-[70px] font-bold tracking-[0.1em] text-white leading-none uppercase -mt-4 drop-shadow-md"
                            >
                                LOOTED
                            </motion.h3>
                        </div>

                        {/* PINK AIR DROP IMAGE (ANIMATED) */}
                        <motion.div
                            initial={{ scale: 0, rotate: -20, x: 200 }}
                            animate={{ scale: 1, rotate: 0, x: 0 }}
                            transition={{ delay: 0.7, type: "spring", stiffness: 100 }}
                            className="absolute right-[-150px] top-1/2 -translate-y-1/2 z-20"
                        >
                            <img
                                src="/images/pink_drop.png"
                                alt="Hot Pink Drop"
                                className="w-[500px] drop-shadow-[0_30px_50px_rgba(233,30,99,0.5)]"
                            />
                            <motion.div
                                animate={{ y: [0, -20, 0] }}
                                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                className="absolute inset-0 bg-pink-500/10 blur-[100px] rounded-full -z-10"
                            />
                        </motion.div>
                    </motion.div>

                    {/* PLAYER NAME BAR (BOTTOM SLIDE) */}
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ delay: 0.8 }}
                        className="absolute top-[650px] left-[100px] w-[850px] h-24 bg-[#e91e63] flex items-center px-16 transform -skew-x-12 z-20 shadow-2xl border-l-[10px] border-white/30"
                    >
                        <span className="text-5xl font-black text-white italic tracking-widest uppercase skew-x-12 drop-shadow-md">
                            {player.name}
                        </span>
                        <div className="ml-auto min-w-[100px] h-14 bg-white/20 rounded-md skew-x-12 flex items-center justify-center border border-white/30">
                            <span className="text-white font-black text-xl px-4">{player.teamTag || player.teamName.substring(0, 3)}</span>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
