"use client"

import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

interface PlayerData {
    playerKey: string;
    name: string;
    teamName: string;
    teamTag?: string;
    logoUrl?: string;
    photoUrl?: string;
}

/**
 * RecallAnimationGraphic
 * ──────────────────────
 * Unique digital/glitch recall overlay. When a player is recalled,
 * their silhouette materializes with scan lines + a pulsing cyan glow.
 * Completely different visual from the elimination banners.
 */
export default function RecallAnimationGraphic() {
    const { theme } = useTheme();
    const [isVisible, setIsVisible] = useState(false);
    const [player, setPlayer] = useState<PlayerData | null>(null);
    const [playKey, setPlayKey] = useState(0);
    const [isStudioPreview, setIsStudioPreview] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('transparent') === 'true' || params.get('preview') === 'true') {
            setIsStudioPreview(true);
            setPlayer({ playerKey: 'preview', name: 'PLAYER NAME', teamName: 'TEAM', teamTag: 'TAG' });
            setIsVisible(true);
        }
        if (params.get('edit') === 'true') {
            setPlayer({ playerKey: 'preview', name: 'PLAYER NAME', teamName: 'TEAM', teamTag: 'TAG' });
            setIsVisible(true);
        }
    }, []);

    useEffect(() => {
        const socket = io(`http://localhost:4000`);
        socket.on('graphic_command', (cmd) => {
            if (cmd.templateUrl === '/overlays/recall') {
                if (cmd.action === 'PLAY') {
                    setPlayer(cmd.data);
                    setPlayKey(Date.now());
                    setIsVisible(true);
                    setTimeout(() => setIsVisible(false), 6000);
                } else if (cmd.action === 'STOP' || cmd.action === 'CLEAR') {
                    setIsVisible(false);
                }
            }
        });
        return () => { socket.disconnect(); };
    }, []);

    const [scale, setScale] = useState(1);
    useEffect(() => {
        const h = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080, 1));
        h(); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h);
    }, []);

    if (!player) return null;

    // In studio preview, use theme colors. Otherwise use defaults.
    const cyan = isStudioPreview ? theme.primary : '#06b6d4';
    const cyanDark = isStudioPreview ? theme.secondary : '#0891b2';
    const cyanGlow = isStudioPreview ? theme.accent : '#22d3ee';

    return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'transparent' }}>
            <div style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'relative', fontFamily: 'Impact, "Arial Black", system-ui, sans-serif' }}>
                <AnimatePresence>
                    {isVisible && (
                        <motion.div
                            key={playKey}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Main container — positioned center-right */}
                            <motion.div
                                initial={{ x: 200, opacity: 0, scaleX: 0.8 }}
                                animate={{ x: 0, opacity: 1, scaleX: 1 }}
                                exit={{ x: 200, opacity: 0 }}
                                transition={{ type: 'spring', damping: 22, stiffness: 120 }}
                                style={{
                                    position: 'absolute',
                                    top: 340,
                                    right: 120,
                                    width: 680,
                                    height: 400,
                                }}
                            >
                                {/* Background with scan lines */}
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    background: `linear-gradient(135deg, rgba(6,182,212,0.15), rgba(8,145,178,0.08))`,
                                    borderRadius: 24,
                                    border: `2px solid ${cyan}40`,
                                    backdropFilter: 'blur(20px)',
                                    overflow: 'hidden',
                                }}>
                                    {/* Scan lines */}
                                    <div style={{
                                        position: 'absolute', inset: 0,
                                        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 3px, ${cyan}08 3px, ${cyan}08 4px)`,
                                        pointerEvents: 'none',
                                    }} />
                                    {/* Top accent line */}
                                    <motion.div
                                        animate={{ x: ['-100%', '200%'] }}
                                        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                                        style={{
                                            position: 'absolute', top: 0, left: 0,
                                            width: '40%', height: 3,
                                            background: `linear-gradient(90deg, transparent, ${cyanGlow}, transparent)`,
                                        }}
                                    />
                                </div>

                                {/* Player photo — materializing */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 1.2, filter: 'blur(20px) brightness(3)' }}
                                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px) brightness(1)' }}
                                    transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
                                    style={{
                                        position: 'absolute',
                                        left: 30,
                                        bottom: 0,
                                        width: 280,
                                        height: 420,
                                        zIndex: 10,
                                    }}
                                >
                                    <img
                                        src={player.photoUrl || `http://localhost:4000/images/${player.playerKey}.png`}
                                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                        style={{
                                            width: '100%', height: '100%',
                                            objectFit: 'contain', objectPosition: 'bottom',
                                            filter: `drop-shadow(0 0 30px ${cyan}60) drop-shadow(0 10px 30px rgba(0,0,0,0.5))`,
                                        }}
                                        alt={player.name}
                                    />
                                    {/* Glitch overlay on photo */}
                                    <motion.div
                                        animate={{ opacity: [0, 0.3, 0, 0.2, 0] }}
                                        transition={{ repeat: 3, duration: 0.15, delay: 0.3 }}
                                        style={{
                                            position: 'absolute', inset: 0,
                                            background: `linear-gradient(180deg, ${cyanGlow}40 0%, transparent 30%, ${cyan}20 60%, transparent 100%)`,
                                            mixBlendMode: 'screen',
                                        }}
                                    />
                                </motion.div>

                                {/* Text area */}
                                <div style={{
                                    position: 'absolute',
                                    right: 40,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: 320,
                                    zIndex: 20,
                                    textAlign: 'right',
                                }}>
                                    {/* Team logo */}
                                    <motion.div
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ delay: 0.5, type: 'spring' }}
                                        style={{
                                            width: 56, height: 56,
                                            borderRadius: 14,
                                            background: `${cyan}20`,
                                            border: `2px solid ${cyan}50`,
                                            padding: 8,
                                            marginLeft: 'auto',
                                            marginBottom: 16,
                                            boxShadow: `0 0 30px ${cyan}30`,
                                        }}
                                    >
                                        <img
                                            src={player.logoUrl || 'http://localhost:4000/placeholder-logo.png'}
                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            alt=""
                                        />
                                    </motion.div>

                                    {/* RECALLED text */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                    >
                                        <div style={{
                                            fontSize: 14,
                                            fontWeight: 900,
                                            color: cyanGlow,
                                            letterSpacing: '0.5em',
                                            textTransform: 'uppercase',
                                            marginBottom: 4,
                                            textShadow: `0 0 20px ${cyan}`,
                                        }}>PLAYER RECALLED</div>
                                        <h2 style={{
                                            fontSize: 64,
                                            fontWeight: 900,
                                            fontStyle: 'italic',
                                            color: '#ffffff',
                                            lineHeight: 0.9,
                                            margin: 0,
                                            letterSpacing: '-0.04em',
                                            textShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 40px ${cyan}40`,
                                        }}>{player.name}</h2>
                                    </motion.div>

                                    {/* Team name bar */}
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '100%' }}
                                        transition={{ delay: 0.6, duration: 0.4 }}
                                        style={{
                                            marginTop: 16,
                                            height: 44,
                                            background: `linear-gradient(90deg, transparent, ${cyan})`,
                                            borderRadius: 8,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'flex-end',
                                            paddingRight: 16,
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <span style={{
                                            fontSize: 18,
                                            fontWeight: 900,
                                            color: '#ffffff',
                                            letterSpacing: '0.2em',
                                            textTransform: 'uppercase',
                                            textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                                        }}>{player.teamTag || player.teamName.substring(0, 3).toUpperCase()}</span>
                                    </motion.div>

                                    {/* "Back in action" subtitle */}
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.8 }}
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 800,
                                            color: `${cyan}80`,
                                            letterSpacing: '0.3em',
                                            textTransform: 'uppercase',
                                            marginTop: 10,
                                        }}
                                    >BACK IN ACTION</motion.p>
                                </div>

                                {/* Pulsing glow ring */}
                                <motion.div
                                    animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    style={{
                                        position: 'absolute',
                                        left: 100, top: '50%', transform: 'translateY(-50%)',
                                        width: 200, height: 200,
                                        borderRadius: '50%',
                                        border: `3px solid ${cyan}30`,
                                        boxShadow: `0 0 60px ${cyan}20, inset 0 0 60px ${cyan}10`,
                                        zIndex: 5,
                                    }}
                                />
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
