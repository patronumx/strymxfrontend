import { API_URL } from '@/lib/api-config';
"use client"

import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

interface TeamData {
    teamName: string;
    teamTag?: string;
    logoUrl?: string;
    flagUrl?: string;
    kills: number;
}

/**
 * TeamDominationGraphic
 * ─────────────────────
 * Compact right-side banner shown when a team hits 5+ kills (dominating).
 * Shows: kill count, "DOMINATING" label, team logo, team name.
 */
export default function TeamDominationGraphic() {
    const { theme } = useTheme();
    const [isVisible, setIsVisible] = useState(false);
    const [team, setTeam] = useState<TeamData | null>(null);
    const [playKey, setPlayKey] = useState(0);
    const [isStudioPreview, setIsStudioPreview] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('transparent') === 'true' || params.get('preview') === 'true') {
            setIsStudioPreview(true);
            setTeam({ teamName: 'PARADISE GRACE', teamTag: 'PRG', logoUrl: '', kills: 5 });
            setIsVisible(true);
        }
        if (params.get('edit') === 'true') {
            setTeam({ teamName: 'PARADISE GRACE', teamTag: 'PRG', logoUrl: '', kills: 5 });
            setIsVisible(true);
        }
    }, []);

    useEffect(() => {
        const socket = io(`${API_URL}`);
        socket.on('graphic_command', (cmd) => {
            if (cmd.templateUrl === '/overlays/team-domination') {
                if (cmd.action === 'PLAY') {
                    setTeam(cmd.data);
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

    if (!team) return null;

    const navy = isStudioPreview ? theme.cardBg : '#1e2746';
    const purple = isStudioPreview ? theme.primary : '#7c3aed';
    const purpleLight = isStudioPreview ? theme.secondary : '#a78bfa';
    const purpleGlow = isStudioPreview ? theme.accent : '#8b5cf6';

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
                        >
                            {/* Compact banner — top-right */}
                            <motion.div
                                initial={{ x: 600, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: 600, opacity: 0 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 130 }}
                                style={{
                                    position: 'absolute',
                                    top: 180,
                                    right: 80,
                                    display: 'flex',
                                    alignItems: 'stretch',
                                    height: 100,
                                    borderRadius: 16,
                                    overflow: 'hidden',
                                    boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 40px ${purple}20, 0 0 0 1px rgba(255,255,255,0.08)`,
                                }}
                            >
                                {/* Kill count section */}
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: 'spring' }}
                                    style={{
                                        background: `linear-gradient(135deg, ${purple}, ${purpleGlow})`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '0 28px',
                                        gap: 10,
                                        position: 'relative',
                                    }}
                                >
                                    <span style={{
                                        fontSize: 52,
                                        fontWeight: 900,
                                        fontStyle: 'italic',
                                        color: '#ffffff',
                                        lineHeight: 1,
                                        textShadow: '0 4px 12px rgba(0,0,0,0.4)',
                                    }}>{team.kills}</span>
                                    <span style={{
                                        fontSize: 18,
                                        fontWeight: 900,
                                        color: 'rgba(255,255,255,0.85)',
                                        letterSpacing: '0.1em',
                                        textTransform: 'uppercase',
                                    }}>ELIMS</span>
                                    {/* Pulse effect */}
                                    <motion.div
                                        animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                        style={{
                                            position: 'absolute', inset: 0,
                                            borderRadius: 16,
                                            border: `2px solid rgba(255,255,255,0.3)`,
                                        }}
                                    />
                                </motion.div>

                                {/* DOMINATING + team info */}
                                <div style={{
                                    background: `linear-gradient(135deg, ${navy}, #0f1729)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '0 24px',
                                    gap: 16,
                                    minWidth: 300,
                                }}>
                                    {/* DOMINATING text */}
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.35 }}
                                        style={{ flex: 1 }}
                                    >
                                        <div style={{
                                            fontSize: 22,
                                            fontWeight: 900,
                                            color: purpleLight,
                                            letterSpacing: '0.15em',
                                            textTransform: 'uppercase',
                                            textShadow: `0 0 20px ${purple}60`,
                                            lineHeight: 1,
                                        }}>DOMINATING</div>
                                        <div style={{
                                            fontSize: 13,
                                            fontWeight: 800,
                                            color: '#94a3b8',
                                            letterSpacing: '0.1em',
                                            textTransform: 'uppercase',
                                            marginTop: 4,
                                        }}>{team.teamName}</div>
                                    </motion.div>

                                    {/* Team logo */}
                                    <motion.div
                                        initial={{ scale: 0, rotate: -90 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ delay: 0.5, type: 'spring' }}
                                        style={{
                                            width: 60, height: 60,
                                            borderRadius: 14,
                                            background: `${purple}20`,
                                            border: `2px solid ${purple}40`,
                                            padding: 8,
                                            boxShadow: `0 0 30px ${purple}30`,
                                            flexShrink: 0,
                                        }}
                                    >
                                        <img
                                            src={team.logoUrl || `${API_URL}/placeholder-logo.png`}
                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            alt=""
                                        />
                                    </motion.div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
