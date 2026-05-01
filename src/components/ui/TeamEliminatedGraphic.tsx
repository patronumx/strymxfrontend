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
    placement: number;
    kills: number;
    playerCount?: number;
}

/**
 * TeamEliminatedGraphic
 * ─────────────────────
 * Compact right-side banner shown when a team is fully eliminated.
 * Shows: placement #, team logo, country flag, kill count, "ELIMINATED" label.
 */
export default function TeamEliminatedGraphic() {
    const { theme } = useTheme();
    const [isVisible, setIsVisible] = useState(false);
    const [team, setTeam] = useState<TeamData | null>(null);
    const [playKey, setPlayKey] = useState(0);
    const [isStudioPreview, setIsStudioPreview] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('transparent') === 'true' || params.get('preview') === 'true') {
            setIsStudioPreview(true);
            setTeam({ teamName: 'TEAM APEX', teamTag: 'APX', logoUrl: '', flagUrl: '', placement: 13, kills: 2 });
            setIsVisible(true);
        }
        if (params.get('edit') === 'true') {
            setTeam({ teamName: 'TEAM APEX', teamTag: 'APX', logoUrl: '', flagUrl: '', placement: 13, kills: 2 });
            setIsVisible(true);
        }
    }, []);

    useEffect(() => {
        const socket = io(`http://localhost:4000`);
        socket.on('graphic_command', (cmd) => {
            if (cmd.templateUrl === '/overlays/team-eliminated') {
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
    const gold = isStudioPreview ? theme.primary : '#c9a227';
    const goldLight = isStudioPreview ? theme.secondary : '#e8c547';

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
                            {/* Compact banner — top-right area */}
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
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)',
                                }}
                            >
                                {/* Placement number */}
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: 'spring' }}
                                    style={{
                                        width: 100,
                                        background: `linear-gradient(135deg, ${navy}, #0f1729)`,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRight: `3px solid ${gold}40`,
                                        position: 'relative',
                                    }}
                                >
                                    <span style={{
                                        fontSize: 11,
                                        fontWeight: 900,
                                        color: '#64748b',
                                        letterSpacing: '0.2em',
                                        textTransform: 'uppercase',
                                    }}>#</span>
                                    <span style={{
                                        fontSize: 48,
                                        fontWeight: 900,
                                        fontStyle: 'italic',
                                        color: '#ffffff',
                                        lineHeight: 0.9,
                                        textShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                    }}>{team.placement}</span>
                                </motion.div>

                                {/* Team logo + flag */}
                                <div style={{
                                    width: 100,
                                    background: `linear-gradient(135deg, ${navy}, #1a2340)`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    padding: 10,
                                }}>
                                    {/* Team logo */}
                                    <div style={{
                                        width: 44, height: 44,
                                        borderRadius: 10,
                                        background: 'rgba(255,255,255,0.08)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        padding: 4,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <img
                                            src={team.logoUrl || 'http://localhost:4000/placeholder-logo.png'}
                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            alt=""
                                        />
                                    </div>
                                    {/* Country flag */}
                                    {team.flagUrl && (
                                        <img
                                            src={team.flagUrl}
                                            style={{ width: 28, height: 18, objectFit: 'cover', borderRadius: 3, border: '1px solid rgba(255,255,255,0.2)' }}
                                            alt=""
                                        />
                                    )}
                                </div>

                                {/* Kill count + ELIMINATED text */}
                                <div style={{
                                    background: `linear-gradient(135deg, ${navy}, #1a2340)`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    padding: '0 30px',
                                    minWidth: 220,
                                }}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                            <span style={{
                                                fontSize: 42,
                                                fontWeight: 900,
                                                fontStyle: 'italic',
                                                color: goldLight,
                                                lineHeight: 1,
                                                textShadow: `0 0 20px ${gold}60`,
                                            }}>{team.kills}</span>
                                            <span style={{
                                                fontSize: 20,
                                                fontWeight: 900,
                                                color: '#ffffff',
                                                letterSpacing: '0.1em',
                                                textTransform: 'uppercase',
                                            }}>ELIMS</span>
                                        </div>
                                    </motion.div>

                                    {/* ELIMINATED bar */}
                                    <motion.div
                                        initial={{ scaleX: 0, originX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        transition={{ delay: 0.45, duration: 0.3 }}
                                        style={{
                                            marginTop: 6,
                                            background: `linear-gradient(90deg, ${gold}, ${goldLight})`,
                                            padding: '5px 16px',
                                            borderRadius: 6,
                                            display: 'inline-block',
                                        }}
                                    >
                                        <span style={{
                                            fontSize: 14,
                                            fontWeight: 900,
                                            color: '#0f1729',
                                            letterSpacing: '0.25em',
                                            textTransform: 'uppercase',
                                        }}>ELIMINATED</span>
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
