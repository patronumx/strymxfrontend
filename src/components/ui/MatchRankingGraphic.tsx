import { API_URL } from '@/lib/api-config';
"use client"

import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import { Rnd } from 'react-rnd';

export interface LayoutBlockConfig {
    visible: boolean;
    x: number;
    y: number;
    scale: number;
}
export interface MatchRankingLayout {
    header: LayoutBlockConfig;
    topTeam: LayoutBlockConfig;
    standings: LayoutBlockConfig;
}

export const DEFAULT_MR_LAYOUT: MatchRankingLayout = {
    header: { visible: true, x: 80, y: 64, scale: 1 },
    topTeam: { visible: true, x: 80, y: 220, scale: 1 },
    standings: { visible: true, x: 80, y: 640, scale: 1 }
};

function WidgetBlock({ id, config, designerMode, onLayoutChange, children, w }: any) {
    if (!config?.visible) return null;

    if (designerMode) {
        return (
            <Rnd
                position={{ x: config.x, y: config.y }}
                scale={config.scale}
                onDragStop={(e, d) => onLayoutChange(id, { x: Math.round(d.x), y: Math.round(d.y) })}
                enableResizing={false}
                className="hover:outline-dashed hover:outline-2 hover:outline-indigo-500 hover:bg-indigo-500/10 cursor-move z-50 rounded"
                style={{ width: w }}
            >
                <div style={{ transform: `scale(${config.scale})`, transformOrigin: 'top left', width: '100%', height: '100%' }}>
                    {children}
                </div>
            </Rnd>
        );
    }
    return (
        <div style={{ position: 'absolute', left: config.x, top: config.y, width: w, transform: `scale(${config.scale})`, transformOrigin: 'top left' }}>
            {children}
        </div>
    );
}


// WebSockets power the React Overlay instead of CasparCG amcp

interface PlayerStat {
    playerKey: string;
    name?: string;
    teamName: string;
    teamId?: number;
    health: number;
    liveState: number;
    killNum: number;
    damage: number;
    assists: number;
    survivalTime: number;
    photoUrl?: string;
    logoUrl?: string;
    placePts?: number;
    killPts?: number;
    matchPts?: number;
    placement?: number | null;
}

interface TeamScore {
    name: string;
    logoUrl: string;
    elims: number;
    placePts: number;
    totalPts: number;
    teamId?: number;
    placement?: number | null;
    players: (PlayerStat & { playerKey: string })[];
}

function PlayerPortrait({ photoUrl, playerKey, name, theme }: { 
    photoUrl?: string; 
    playerKey: string; 
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
        <div className="relative h-full w-full flex items-end justify-center">
            {!failed && imgSrc ? (
                <img 
                    src={imgSrc} 
                    onError={() => {
                        // Fallback to backend port 4000 if 3000 fails
                        if (imgSrc?.includes(':3000')) {
                            setImgSrc(`${API_URL}/images/${playerKey}.png`);
                        } else {
                            setFailed(true);
                        }
                    }} 
                    className="h-full object-cover object-top mask-image-bottom" 
                    alt={name} 
                />
            ) : (
                <div 
                    className="w-[280px] h-[80%] rounded-t-full border-4 flex items-center justify-center flex-col shadow-xl"
                    style={{ 
                        backgroundColor: `${theme.primary}22`, 
                        borderColor: theme.primary 
                    }}
                >
                    <div className="text-9xl font-black opacity-40 uppercase" style={{ color: theme.primary }}>
                        {name?.charAt(0) || '?'}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function MatchRankingGraphic({ 
    matchId = "test-match-001",
    designerMode = false,
    layoutConfig = DEFAULT_MR_LAYOUT,
    onLayoutChange
}: { 
    matchId?: string, 
    designerMode?: boolean,
    layoutConfig?: MatchRankingLayout,
    onLayoutChange?: (id: string, config: Partial<LayoutBlockConfig>) => void
}) {
    const { theme } = useTheme();
    const [teams, setTeams] = useState<TeamScore[]>([]);
    const [matchInfo, setMatchInfo] = useState({
        stageName: 'Stage 1',
        groupName: 'Lobby',
        dayNumber: 1,
        matchNumber: 1,
        mapName: 'Erangel'
    });
    const [isVisible, setIsVisible] = useState(false); // Controlled by CasparCG
    const [playKey, setPlayKey] = useState(0);
    // Frozen slot order: locked in on first data receive, never changes unless scores differ
    const frozenOrderRef = useRef<string[]>([]);

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
                    placePts: 0, 
                    totalPts: 0,
                    teamId: p.teamId,
                    placement: null,
                    players: []
                });
            }
            const t = teamMap.get(tName)!;
            if (p.placePts !== undefined) t.placePts = p.placePts;
            if (p.placement !== undefined) t.placement = p.placement;
            t.elims += p.killNum;
            t.players.push(p);
        });

        // Finalize team scores
        const allTeams = Array.from(teamMap.values()).map(t => {
            t.totalPts = t.elims + t.placePts;
            
            // Stable slot sorting: never sort by liveState/health, otherwise players will swap places
            // when someone dies, which looks like an alive player suddenly regaining health because they 
            // moved into the dead player's old slot.
            t.players.sort((a, b) => a.playerKey.localeCompare(b.playerKey));
            
            return t;
        });

        // === FROZEN SLOT SYSTEM ===
        // Lock in team order on first data receive. Never shuffle when scores are tied.
        if (frozenOrderRef.current.length === 0) {
            const initial = [...allTeams].sort((a, b) =>
                b.totalPts - a.totalPts ||
                b.elims - a.elims ||
                (a.teamId || 0) - (b.teamId || 0) ||
                a.name.localeCompare(b.name)
            );
            frozenOrderRef.current = initial.map(t => t.name);
        }

        const frozenOrder = frozenOrderRef.current;
        // placement is the authoritative backend signal that a team has been fully eliminated.
        const teamIsEliminated = (t: TeamScore) => t.placement !== null && t.placement !== undefined;

        const sorted = [...allTeams].sort((a, b) => {
            // Tier 1: Alive teams rank above fully-eliminated teams
            const aliveA = teamIsEliminated(a) ? 1 : 0;
            const aliveB = teamIsEliminated(b) ? 1 : 0;
            if (aliveA !== aliveB) return aliveA - aliveB;
            // Tier 2: Higher points first
            const ptsDiff = b.totalPts - a.totalPts;
            if (ptsDiff !== 0) return ptsDiff;
            // Tier 3: Higher elims first
            const elimsDiff = b.elims - a.elims;
            if (elimsDiff !== 0) return elimsDiff;
            // Tier 4: Frozen slot — stable tie-breaker
            const slotA = frozenOrder.indexOf(a.name);
            const slotB = frozenOrder.indexOf(b.name);
            return (slotA === -1 ? 9999 : slotA) - (slotB === -1 ? 9999 : slotB);
        });

        setTeams(sorted);
    };

    useEffect(() => {
        // Fetch initial
        fetch(`${API_URL}/api/match-state/${matchId}`)
            .then(res => res.json())
            .then(data => {
                if (data.activePlayers) processData(data.activePlayers, data.matchInfo);
            })
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
            if (cmd.templateUrl && !cmd.templateUrl.includes('/overlays/match-ranking')) return;

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

    if (teams.length === 0) return null;

    const top8 = teams.slice(0, 8);
    const topTeam = top8[0];
    const leftCol = top8.slice(0, 4);
    const rightCol = top8.slice(4, 8);

    return (
        <AnimatePresence mode="wait">
            {isVisible && (
                <motion.div
                    key={playKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-[1920px] h-[1080px] overflow-hidden relative font-sans select-none bg-transparent">

                    <WidgetBlock id="header" config={layoutConfig.header} designerMode={designerMode} onLayoutChange={onLayoutChange}>
                        {/* Header */}
                        <motion.div
                            initial={{ y: designerMode ? 0 : -100, opacity: designerMode ? 1 : 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: designerMode ? 0 : 0.2, type: 'spring', damping: 20 }}
                            className="">
                        <h1 className="text-8xl font-black tracking-tighter uppercase" 
                            style={{ 
                                color: theme.primary,
                                WebkitTextStroke: '2px rgba(255,255,255,0.5)' 
                            }}>{matchInfo.stageName} Ranking</h1>
                            <p className="text-3xl font-bold tracking-widest mt-2 uppercase"
                                style={{ color: theme.secondary }}>{matchInfo.groupName} Day {matchInfo.dayNumber} M{matchInfo.matchNumber} {matchInfo.mapName}</p>
                        </motion.div>
                    </WidgetBlock>

                    <WidgetBlock id="topTeam" config={layoutConfig.topTeam} designerMode={designerMode} onLayoutChange={onLayoutChange} w={1760}>
                        {/* Top Team Focus Container */}
                        <motion.div
                            initial={{ x: designerMode ? 0 : -1000, opacity: designerMode ? 1 : 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: designerMode ? 0 : 0.4, type: 'spring', damping: 25 }}
                            className="h-[380px] flex relative border-t-4 border-b-4"
                            style={{ 
                                background: `linear-gradient(to right, ${theme.secondary}33, ${theme.secondary}11, transparent)`,
                                borderColor: theme.secondary
                            }}>

                        {/* Left Side: Team Score */}
                        <div className="w-1/2 h-full flex flex-col justify-center px-12 relative z-10">
                            <motion.div
                                initial={{ x: -50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.7 }}
                                className="flex items-center gap-6">
                                <span className="text-8xl font-black border-b-4 pb-2" style={{ color: theme.primary, borderColor: theme.primary }}>#1</span>
                                <img src={topTeam.logoUrl.replace('http:', `${API_URL}`)} onError={(e) => e.currentTarget.style.display = 'none'} className="h-24 object-contain" alt="" />
                                <span className="text-6xl font-black lowercase" style={{ color: theme.primary }}>{topTeam.name}</span>
                            </motion.div>

                            <div className="flex items-center gap-10 mt-10">
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 }} className="flex flex-col items-center">
                                    <span className="text-7xl font-black" style={{ color: theme.primary }}>{topTeam.placePts}</span>
                                    <span className="text-xl font-bold tracking-wider" style={{ color: theme.secondary }}>PLACE PTS</span>
                                </motion.div>
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.9 }} className="flex flex-col items-center">
                                    <span className="text-7xl font-black" style={{ color: theme.primary }}>{topTeam.elims}</span>
                                    <span className="text-xl font-bold tracking-wider" style={{ color: theme.secondary }}>ELIMS</span>
                                </motion.div>
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.0 }} className="flex flex-col items-center">
                                    <span className="text-7xl font-black" style={{ color: theme.primary }}>{topTeam.totalPts}</span>
                                    <span className="text-xl font-bold tracking-wider" style={{ color: theme.secondary }}>TOTAL PTS</span>
                                </motion.div>
                            </div>
                        </div>

                        {/* Right Side: 4 Players */}
                        <div className="absolute right-0 bottom-0 top-0 w-1/2 flex items-end justify-end overflow-hidden">
                            {topTeam.players.slice(0, 4).map((p, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ y: 200, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 1 + (idx * 0.15), type: 'spring', damping: 20 }}
                                    className="relative h-[110%] w-[300px] -ml-16 flex items-end z-[1]" style={{ zIndex: 4 - idx }}>
                                    <PlayerPortrait 
                                        photoUrl={p.photoUrl} 
                                        playerKey={p.playerKey} 
                                        name={p.name || ''} 
                                        theme={theme} 
                                    />
                                    <div className="absolute bottom-6 w-full text-center">
                                        <div className="inline-block text-white text-xl font-bold px-6 py-2 rounded uppercase shadow-lg border"
                                             style={{ 
                                                 backgroundColor: theme.primary,
                                                 borderColor: 'rgba(255,255,255,0.2)'
                                             }}>{p.name}</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                        </motion.div>
                    </WidgetBlock>

                    <WidgetBlock id="standings" config={layoutConfig.standings} designerMode={designerMode} onLayoutChange={onLayoutChange} w={1760}>
                        {/* Bottom Section: Two Columns of Top 8 Standings */}
                        <div className="grid grid-cols-2 gap-8 w-full">

                            {/* Left Column 1-4 */}
                            <div className="flex flex-col gap-3">
                                <motion.div
                                    initial={{ opacity: designerMode ? 1 : 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: designerMode ? 0 : 1.2 }}
                                    className="flex font-bold text-white text-xl px-6 py-3 uppercase"
                                    style={{ backgroundColor: theme.primary }}>
                                <div className="w-24">Rank</div>
                                <div className="flex-1">Team</div>
                                <div className="w-32 text-center">Place Pts</div>
                                <div className="w-32 text-center">Elims</div>
                                <div className="w-32 text-center">Total Pts</div>
                            </motion.div>
                                {leftCol.map((t, i) => (                                 
                                    <motion.div
                                        key={t.name}
                                        initial={{ x: designerMode ? 0 : -50, opacity: designerMode ? 1 : 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: designerMode ? 0 : 1.3 + (i * 0.1) }}
                                        className="flex font-bold text-2xl h-[70px] items-center px-6 text-white border-l-[6px] shadow-lg"
                                    style={{ 
                                        backgroundColor: `${theme.primary}cc`,
                                        borderColor: theme.secondary
                                    }}>
                                    <div className="w-24 text-4xl">#{i + 1}</div>
                                    <div className="flex-1 flex items-center gap-4">
                                        <img src={t.logoUrl.replace('http:', `${API_URL}`)} onError={(e) => e.currentTarget.style.display = 'none'} className="h-10 object-contain" alt="" />
                                        <span className="lowercase">{t.name}</span>
                                    </div>
                                    <div className="w-32 text-center">{t.placePts}</div>
                                    <div className="w-32 text-center">{t.elims}</div>
                                    <div className="w-32 text-center text-3xl" style={{ color: theme.secondary }}>{t.totalPts}</div>
                                </motion.div>

                            ))}
                        </div>

                        {/* Right Column 5-8 */}
                        <div className="flex flex-col gap-3">
                                <motion.div
                                    initial={{ opacity: designerMode ? 1 : 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: designerMode ? 0 : 1.2 }}
                                    className="flex font-bold text-white text-xl px-6 py-3 uppercase"
                                    style={{ backgroundColor: theme.primary }}>
                                    <div className="w-24">Rank</div>
                                    <div className="flex-1">Team</div>
                                    <div className="w-32 text-center">Place Pts</div>
                                    <div className="w-32 text-center">Elims</div>
                                    <div className="w-32 text-center">Total Pts</div>
                                </motion.div>
                                {rightCol.map((t, i) => (                                 
                                    <motion.div
                                        key={t.name}
                                        initial={{ x: designerMode ? 0 : 50, opacity: designerMode ? 1 : 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: designerMode ? 0 : 1.7 + (i * 0.1) }}
                                        className="flex font-bold text-2xl h-[70px] bg-white/20 items-center px-6 text-white border-l-[6px] shadow-lg"
                                    style={{ borderColor: theme.secondary }}>
                                    <div className="w-24 text-4xl">#{i + 5}</div>
                                    <div className="flex-1 flex items-center gap-4">
                                        <img src={t.logoUrl.replace('http:', `${API_URL}`)} onError={(e) => e.currentTarget.style.display = 'none'} className="h-10 object-contain" alt="" />
                                        <span className="lowercase">{t.name}</span>
                                    </div>
                                    <div className="w-32 text-center">{t.placePts}</div>
                                    <div className="w-32 text-center">{t.elims}</div>
                                    <div className="w-32 text-center text-3xl">{t.totalPts}</div>
                                </motion.div>

                            ))}
                        </div>
                        </div>

                    </WidgetBlock>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

