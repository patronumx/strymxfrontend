"use client"
import { API_URL } from '@/lib/api-config';


import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import { Target } from 'lucide-react';

interface PlayerData {
    playerKey: string;
    name: string;
    teamName: string;
    teamId?: number;
    logoUrl?: string;
    photoUrl?: string;
    teamTag?: string;
}

export default function RamadanFirstBloodGraphic() {
    const { theme } = useTheme();
    const [isVisible, setIsVisible] = useState(false);
    const [player, setPlayer] = useState<PlayerData | null>(null);
    const [playKey, setPlayKey] = useState(0);

    useEffect(() => {
        const socket = io(`${API_URL}`);
        
        socket.on('graphic_command', (cmd) => {
            if (cmd.templateUrl === '/overlays/first-blood') {
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
                        className="absolute top-[300px] left-[100px] w-[900px] h-[350px] flex items-center"
                    >
                        {/* THE LIME SLASH BACKGROUND */}
                        <div className="absolute inset-0 bg-[#95c11f] transform -skew-x-12 z-0 border-r-[10px] border-[#7aa31a]" />
                        
                        {/* PLAYER PHOTO */}
                        <motion.div
                            initial={{ opacity: 0, x: -100 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="relative z-10 h-full w-[350px] flex items-end justify-center ml-12"
                        >
                            <img 
                                src={player.photoUrl || `${typeof window !== "undefined" ? window.location.origin : ""}/images/${player.playerKey}.png`}
                                alt={player.name}
                                className="h-[120%] object-contain drop-shadow-[0_20px_20px_rgba(0,0,0,0.5)]"
                                onError={(e) => {
                                    e.currentTarget.src = "https://www.pubg.com/wp-content/uploads/2021/11/DEFAULT_PHOTO.png";
                                }}
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
                                className="text-[120px] font-black italic tracking-tighter text-[#e91e63] leading-none uppercase drop-shadow-lg"
                            >
                                FIRST
                            </motion.h2>
                            <motion.h3 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="text-[60px] font-bold tracking-[0.2em] text-white leading-none uppercase -mt-4 drop-shadow-md"
                            >
                                BLOOD
                            </motion.h3>
                        </div>

                        {/* PINK TARGET ICON */}
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.7, type: "spring" }}
                            className="absolute right-[-80px] top-1/2 -translate-y-1/2 z-20"
                        >
                            <div className="relative">
                                <Target size={220} color="#e91e63" strokeWidth={3} className="drop-shadow-[0_10px_20px_rgba(233,30,99,0.4)]" />
                                <motion.div 
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                    className="absolute inset-0 bg-[#e91e63]/20 rounded-full blur-xl scale-125"
                                />
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* PLAYER NAME BAR (BOTTOM SLIDE) */}
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ delay: 0.8 }}
                        className="absolute top-[650px] left-[100px] w-[800px] h-20 bg-[#e91e63] flex items-center px-12 transform -skew-x-12 z-20 shadow-2xl"
                    >
                        <span className="text-4xl font-black text-white italic tracking-widest uppercase skew-x-12">
                            {player.name}
                        </span>
                        <div className="ml-auto w-12 h-12 bg-white/20 rounded-sm skew-x-12 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">{player.teamTag || player.teamName.substring(0, 3)}</span>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
