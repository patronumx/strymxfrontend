"use client"
import { API_URL } from '@/lib/api-config';


import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

// WebSockets power the React Overlay instead of CasparCG amcp

interface PlayerStat {
    playerKey: string;
    name?: string;
    teamName: string;
    teamId?: string;
    killNum: number;
    damage: number;
    knockouts: number;
    inDamage: number;
    placement?: number;
    rank?: number;
    photoUrl?: string;
    logoUrl?: string;
}

interface TeamScore {
    name: string;
    logoUrl: string;
    elims: number;
    totalPts: number;
    players: PlayerStat[];
}

function PlayerPortrait({ photoUrl, playerKey, name, theme }: { 
    photoUrl?: string; 
    playerKey: string; 
    name: string; 
    theme: any; 
}) {
    const [imgSrc, setImgSrc] = useState<string | null>(
        photoUrl || (playerKey && !playerKey.startsWith('pad') ? `${API_URL}/images/${playerKey}.png` : null)
    );
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!photoUrl && playerKey && !playerKey.startsWith('pad')) {
            setImgSrc(`${API_URL}/images/${playerKey}.png`);
            setFailed(false);
        }
    }, [photoUrl, playerKey]);

    if (name === '-') return null;

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
                    className="h-[95%] object-cover object-bottom filter drop-shadow-2xl" 
                    alt={name} 
                />
            ) : (
                <div className="w-[80%] h-[70%] bg-white/5 rounded-t-full mt-auto mr-12 border-4 border-white/10 flex items-center justify-center">
                    <span className="text-9xl text-white/20 font-black uppercase">{name?.charAt(0) || '?'}</span>
                </div>
            )}
        </div>
    );
}

export default function WWCDStatsGraphic({ matchId = "test-match-001" }: { matchId?: string }) {
    const { theme, isDataOnly, isTransparent } = useTheme();
    const [team, setTeam] = useState<TeamScore | null>(null);
    const [matchInfo, setMatchInfo] = useState({
        stageName: 'Stage 1',
        groupName: 'Lobby',
        dayNumber: 1,
        matchNumber: 1,
        mapName: 'Erangel'
    });
    const [isVisible, setIsVisible] = useState(false); // Controlled by CasparCG
    const [playKey, setPlayKey] = useState(0);

    const processData = (activePlayers: PlayerStat[], info?: any) => {
        if (info) setMatchInfo(info);
        const teamMap = new Map<string, TeamScore>();

        activePlayers.forEach((p) => {
            const tName = p.teamName;
            if (!teamMap.has(tName)) {
                teamMap.set(tName, {
                    name: tName,
                    logoUrl: p.logoUrl || `${API_URL}/placeholder.png`,
                    elims: 0,
                    totalPts: 0,
                    players: []
                });
            }
            const t = teamMap.get(tName)!;
            t.elims += p.killNum;
            t.players.push(p);
            
            if (p.placement === 1 || p.rank === 1) {
                (t as any).isWWCD = true;
            }
        });

        Array.from(teamMap.values()).forEach(t => t.totalPts = t.elims);
        const sorted = Array.from(teamMap.values()).sort((a, b) => b.totalPts - a.totalPts);
        
        const winner = Array.from(teamMap.values()).find((t: any) => t.isWWCD) || (sorted.length > 0 ? sorted[0] : null);

        if (winner) {
            setTeam(winner);
        }
    };

    useEffect(() => {
        fetch(`${API_URL}/api/match-state/${matchId}`)
            .then(res => res.json())
            .then(data => { if (data.activePlayers) processData(data.activePlayers, data.matchInfo); })
            .catch(console.error);

        const socketUrl = `http://${window.location.hostname}:4000`;
        const socket = io(socketUrl, {
            transports: ['websocket'],
            reconnectionAttempts: 5
        });

        socket.on('connect', () => {
            console.log('[SOCKET] Connected to broadcast server:', socketUrl);
        });

        socket.on('connect_error', (err) => {
            console.error('[SOCKET] Connection error:', err);
        });

        socket.on('match_state_update', (data) => {
            console.log('[SOCKET] Match state update received:', data.matchId);
            if (data.activePlayers) processData(data.activePlayers, data.matchInfo);
        });

        // WebSocket Control Listener for OBS
        socket.on('graphic_command', (cmd) => {
            if (cmd.templateUrl && !cmd.templateUrl.includes('/overlays/wwcd')) return;

            if (cmd.action === 'PLAY') {
                setPlayKey(Date.now());
                setIsVisible(true);
            } else if (cmd.action === 'STOP' || cmd.action === 'CLEAR') {
                setIsVisible(false);
            } else if (cmd.action === 'UPDATE' && cmd.data) {
                try {
                    const parsed = typeof cmd.data === 'string' ? JSON.parse(cmd.data) : cmd.data;
                    if (parsed.activePlayers) processData(parsed.activePlayers, parsed.matchInfo);
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

    if (!team) return null;

    const displayPlayers = team.players.slice(0, 4);
    // Pad array if a team has less than 4 players live to keep layout stable
    while (displayPlayers.length < 4) {
        displayPlayers.push({
            playerKey: `pad-${displayPlayers.length}`,
            name: '-',
            teamName: team.name,
            killNum: 0,
            damage: 0,
            knockouts: 0,
            inDamage: 0
        });
    }

    return (
        <AnimatePresence mode="wait">
            {isVisible && (
                <motion.div
                    key={playKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className={`w-[1920px] h-[1080px] flex flex-col items-center pt-24 font-sans select-none overflow-hidden relative bg-transparent`}>

                    {/* Header */}
                    <div className="flex flex-col items-center z-10">
                        <motion.h1
                            initial={{ y: -50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-8xl font-black tracking-tighter uppercase" 
                            style={{ 
                                color: theme.primary,
                                WebkitTextStroke: '1px rgba(255,255,255,0.3)' 
                            }}>{matchInfo.stageName} Stats</motion.h1>
                        <motion.p
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="text-2xl font-bold tracking-[0.3em] mt-4 uppercase"
                            style={{ color: theme.secondary }}>{matchInfo.groupName} Day {matchInfo.dayNumber} M{matchInfo.matchNumber} {matchInfo.mapName}</motion.p>
                    </div>

                    {/* Main Panel Wrapper */}
                    <motion.div
                        initial={{ y: 200, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ type: 'spring', damping: 20, delay: 0.7 }}
                        className={`mt-16 w-[1700px] h-[600px] flex rounded-xl border-[6px] shadow-2xl relative ${isDataOnly ? 'border-transparent' : ''}`}
                        style={{ 
                            borderColor: !isDataOnly ? theme.secondary : 'transparent',
                            background: !isDataOnly ? `linear-gradient(to bottom, ${theme.primary}, ${theme.primary}dd)` : 'transparent'
                        }}>

                        {/* Far Left Team Logo Box */}
                        <div className="w-[350px] h-full flex items-center justify-center p-12 relative z-10 border-r"
                             style={{ 
                                 backgroundColor: theme.primary,
                                 borderColor: 'rgba(255,255,255,0.1)'
                             }}>
                            <motion.img
                                initial={{ scale: 0, rotate: -45 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', delay: 1 }}
                                src={team.logoUrl.replace('http:', `${API_URL}`)} onError={(e) => e.currentTarget.style.display = 'none'} className="max-w-full max-h-full object-contain filter drop-shadow-xl" alt={team.name} />
                        </div>

                        {/* 4 Player Columns */}
                        <div className="flex-1 flex pb-16">
                            {displayPlayers.map((p, idx) => (
                                <motion.div
                                    key={p.playerKey}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 1.2 + (idx * 0.2) }}
                                    className="flex-1 relative border-r overflow-hidden group"
                                    style={{ borderColor: 'rgba(255,255,255,0.1)' }}>

                                    {/* Player Cutout Image */}
                                    <div className="absolute -right-8 bottom-0 h-[105%] w-[130%] flex items-end justify-end pointer-events-none z-[1]">
                                        <PlayerPortrait 
                                            photoUrl={p.photoUrl} 
                                            playerKey={p.playerKey} 
                                            name={p.name || ''} 
                                            theme={theme} 
                                        />
                                    </div>

                                    {/* White Text Overlay Stats */}
                                    <div className="absolute top-20 left-6 z-10 flex flex-col gap-8">
                                        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 1.8 + (idx * 0.2) }}>
                                            <div className="text-5xl font-black text-white leading-none">{p.killNum}</div>
                                            <div className="text-sm font-bold tracking-widest uppercase mt-1" style={{ color: theme.secondary }}>Elims</div>
                                        </motion.div>
                                        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 1.9 + (idx * 0.2) }}>
                                            <div className="text-5xl font-black text-white leading-none">{Math.round(p.damage)}</div>
                                            <div className="text-sm font-bold tracking-widest uppercase mt-1" style={{ color: theme.secondary }}>Damage</div>
                                        </motion.div>
                                        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 2.0 + (idx * 0.2) }}>
                                            <div className="text-5xl font-black text-white leading-none">{p.knockouts}</div>
                                            <div className="text-sm font-bold tracking-widest uppercase mt-1" style={{ color: theme.secondary }}>Knockouts</div>
                                        </motion.div>
                                        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 2.1 + (idx * 0.2) }}>
                                            <div className="text-5xl font-black text-white leading-none">{Math.round(p.inDamage)}</div>
                                            <div className="text-sm font-bold tracking-widest uppercase mt-1" style={{ color: theme.secondary }}>Dmg Taken</div>
                                        </motion.div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Bottom Footer Name Bar */}
                        {!isDataOnly && (
                            <div className="absolute bottom-0 left-0 w-full h-[80px] bg-white flex">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 2.5 }}
                                className="w-[350px] h-full flex items-center justify-center border-r-4"
                                style={{ 
                                    backgroundColor: theme.primary,
                                    borderColor: theme.secondary
                                }}>
                                <span className="text-4xl font-black text-white lowercase tracking-widest">{team.name}</span>
                            </motion.div>
                            <div className="flex-1 flex">
                                {displayPlayers.map((p, idx) => (
                                    <motion.div
                                        key={`foot-${idx}`}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 2.7 + (idx * 0.1) }}
                                        className={`flex-1 flex items-center justify-center border-l ${idx !== 0 ? 'border-slate-300' : 'border-transparent'}`}>
                                        <span className="text-3xl font-bold lowercase" style={{ color: theme.primary }}>
                                            <span className="font-medium text-slate-500 mr-2">{team.name}</span> 
                                            {p.name}
                                        </span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                        )}

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
