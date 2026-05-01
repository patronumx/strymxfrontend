import { API_URL } from '@/lib/api-config';
"use client"

import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

// --- Interfaces ---

interface PlayerStat {
    playerKey: string;
    name?: string;
    teamName: string;
    teamId?: number;
    health: number;
    liveState: number; // 0=Alive, 1=Knocked, 2=Dead
    killNum: number;
    damage: number;
    survivalTime: number;
    photoUrl?: string;
    logoUrl?: string;
    country?: string;
    countryFlagUrl?: string;
    teamColor?: { r: number, g: number, b: number, a: number };
    placePts?: number;
    killPts?: number;
    matchPts?: number;
    placement?: number | null;
}

interface TeamScore {
    rank: number;
    name: string;
    logoUrl: string;
    countryFlagUrl?: string;
    placePts: number;
    elims: number;
    totalPts: number;
    country?: string;
    teamId?: number;
    teamColor?: { r: number, g: number, b: number, a: number };
    players?: { name: string; photoUrl: string; health: number; liveState: number; playerKey: string }[];
    placement?: number | null;
}

interface GraphicCommand {
    templateUrl?: string;
    action: 'PLAY' | 'STOP' | 'UPDATE' | 'CLEAR';
    data?: any;
}

// --- Sub-Components ---

const TeamRow = ({ team, index, isEliminated }: { team: TeamScore, index: number, isEliminated: boolean }) => {
    // Health Bar Logic
    // GREEN  = alive (plane, full HP, parachute — liveState=0 regardless of health)
    // YELLOW = alive and damaged (liveState=0, health 1–99)
    // RED    = knocked (liveState=1 with HP remaining)
    // GREY   = eliminated — EITHER the TEAM has a placement (authoritative backend signal)
    //          OR the individual player's liveState=2 OR knocked+0hp
    const bars = Array(4).fill(null).map((_, i) => {
        const p = team.players && team.players[i];

        // If the whole TEAM is eliminated (backend placed them), all bars go grey.
        // This prevents PCOB's stale liveState=5 data from making dead players look alive.
        if (!p || isEliminated) {
            return { color: "bg-slate-600", height: "0%", isImage: false };
        }

        // Individual player dead (liveState=2) or a bad 0-HP alive tick mid-match.
        if (p.liveState === 2 || (p.liveState === 0 && (p.health ?? 0) <= 0 && team.players?.some(tp => tp.playerKey !== p.playerKey && ((tp.health ?? 0) > 0 || tp.liveState === 1)))) {
            return { color: "bg-slate-600", height: "0%", isImage: false };
        }

        // ALIVE (liveState=0): always show a full green bar.
        // Covers plane, parachute, spawn island — health may be 0 but player is alive.
        if (p.liveState === 0) {
            const rawH = p.health ?? 0;
            if (rawH > 0 && rawH < 100) return { color: "bg-amber-400", height: `${rawH}%` };
            return { color: "bg-emerald-500", height: "100%" };
        }

        // KNOCKED (liveState=1): red while bleeding, grey once HP has dropped to 0.
        if (p.liveState === 1) {
            const rawH = p.health ?? 0;
            if (rawH > 0) return { color: "bg-red-600", height: `${rawH}%` };
            return { color: "bg-slate-600", height: "0%", isImage: false };
        }

        // DEFAULT: grey (for eliminated or unrecognized states like liveState=5)
        return { color: "bg-slate-600", height: "0%" };
    });

    const visualBars = [...bars].sort((a, b) => {
        const aIsActive = a.color !== "bg-slate-600";
        const bIsActive = b.color !== "bg-slate-600";
        if (aIsActive === bIsActive) return 0;
        return aIsActive ? -1 : 1;
    });

    const { theme } = useTheme();
    const teamBg = team.teamColor 
        ? `rgba(${team.teamColor.r}, ${team.teamColor.g}, ${team.teamColor.b}, 1)` 
        : (index === 0 ? theme.secondary : theme.primary);

    return (
        <div className="flex h-[36px] w-full mb-[3px] shadow-[0_1px_2px_rgba(0,0,0,0.1)] relative overflow-hidden">
            {/* Rank Block */}
            <div 
                className="w-[45px] h-full flex items-center justify-center text-white text-xl z-20"
                style={{ backgroundColor: teamBg }}
            >
                <span className="transform font-black drop-shadow-sm ml-1">{team.rank}</span>
            </div>

            <div 
                className="absolute top-0 left-[35px] w-[20px] h-full z-20 skew-x-12"
                style={{ backgroundColor: teamBg }}
            ></div>

            {/* Team Background Block */}
            <div className="absolute top-0 left-[45px] right-[170px] h-full bg-[#f2f4f8] z-10 skew-x-12 px-6 overflow-hidden origin-bottom-left shadow-[-4px_0_4px_rgba(0,0,0,0.1)]"></div>

            {/* Flag & Logo Section */}
            <div className="absolute top-0 left-[62px] h-full flex items-center z-30">
                {/* Flag */}
                <div className="flex items-center w-[24px] justify-center">
                    {team.countryFlagUrl ? (
                         <img 
                            src={team.countryFlagUrl} 
                            className="w-[20px] h-[12px] object-cover shadow-sm border-[0.5px] border-black/10" 
                            alt="" 
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                    ) : (
                        <div className="w-[18px] h-[12px] bg-transparent" />
                    )}
                </div>

                <div className="w-[1px] h-[14px] bg-gray-400/30 mx-2" />

                {/* Logo */}
                <div className="flex items-center min-w-[28px] justify-center">
                    <img 
                        src={team.logoUrl || "/placeholder-logo.png"} 
                        className="h-[18px] max-w-[28px] object-contain drop-shadow-sm" 
                        alt="" 
                        onError={(e) => { e.currentTarget.src = "/placeholder-logo.png"; }}
                    />
                </div>
            </div>

            {/* Team Name */}
            <div className="absolute top-0 left-[140px] right-[155px] h-full flex items-center z-30 overflow-hidden">
                <span 
                    className="font-black text-[#333] uppercase tracking-tighter truncate"
                    style={{ 
                        fontSize: team.name.length > 12 ? (team.name.length > 18 ? '13px' : '14px') : '17px',
                        transition: 'font-size 0.2s ease'
                    }}
                >
                    {team.name}
                </span>
            </div>

            {/* Stats Section */}
            <div className="absolute right-0 top-0 bottom-0 w-[155px] flex items-center px-1 z-10 bg-[#f2f4f8]">
                <div className="absolute top-0 bottom-0 left-[-10px] w-[20px] bg-[#f2f4f8] skew-x-12"></div>
                
                {/* Health Indicators */}
                <div className="w-[70px] h-full bg-[#cdcecf]/30 flex items-center justify-center gap-[3px] relative z-20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                    <div className="absolute left-[-5px] top-0 bottom-0 w-[10px] bg-[#cdcecf]/30 skew-x-12"></div>
                    {visualBars.map((bar, i) => (
                        <div key={i} className="w-[6px] h-[20px] bg-black/10 shadow-sm z-30 relative overflow-hidden flex flex-col justify-end">
                            <div 
                                className={`w-full transition-all duration-500 ease-out`}
                                style={{ 
                                    height: bar.height,
                                    background: bar.color === 'bg-red-600' 
                                        ? 'linear-gradient(to top, #dc2626, #ef4444)' 
                                        : bar.color === 'bg-amber-400'
                                        ? 'linear-gradient(to top, #fbbf24, #f59e0b)'
                                        : bar.color === 'bg-emerald-500'
                                        ? 'linear-gradient(to top, #10b981, #34d399)'
                                        : '#475569' // fallback slate for grey
                                }}
                            ></div>
                        </div>
                    ))}
                </div>

                {/* Points */}
                <div className="w-[35px] text-center text-[18px] text-black drop-shadow-sm font-black mt-0.5 mix-blend-hard-light relative z-20">{team.totalPts}</div>
                <div className="w-[45px] text-center text-[18px] text-black drop-shadow-sm font-black mt-0.5 mix-blend-hard-light relative z-20">{team.elims}</div>
            </div>
        </div>
    );
};

// --- Main Application Component ---

export default function RamadanRankingGraphic({ matchId = "test-match-001" }: { matchId?: string }) {
    const { theme, isDataOnly, isTransparent } = useTheme();
    const [teams, setTeams] = useState<TeamScore[]>([]);
    const [isVisible, setIsVisible] = useState(true);
    // Frozen slot order: locked in on first data receive, never changes unless scores differ
    const frozenOrderRef = useRef<string[]>([]);

    const processData = (activePlayers: PlayerStat[]) => {
        const teamMap = new Map<string, TeamScore>();

        activePlayers.forEach(p => {
            // Normalize team name to match INI entries
            const tName = (p.teamName || 'Unknown').replace(/^scout\s+/i, '');
            if (!teamMap.has(tName)) {
                teamMap.set(tName, {
                    rank: 0,
                    name: tName,
                    logoUrl: p.logoUrl || "/placeholder-logo.png",
                    countryFlagUrl: p.countryFlagUrl,
                    country: p.country || 'PK',
                    teamColor: p.teamColor,
                    elims: 0,
                    placePts: 0, 
                    totalPts: 0,
                    players: [],
                    placement: null
                });
            }
            const t = teamMap.get(tName)!;
            if (p.country) t.country = p.country;
            if (p.teamId !== undefined) t.teamId = p.teamId;
            if (p.placePts !== undefined) t.placePts = p.placePts;
            if (p.placement !== undefined) t.placement = p.placement;

            // Deduplicate: if same playerKey already added, update it instead of adding again
            const existingIdx = t.players!.findIndex(ep => ep.playerKey === p.playerKey);
            const playerEntry = {
                name: p.name || 'UNKNOWN',
                playerKey: p.playerKey,
                health: p.health || 0,
                liveState: p.liveState !== undefined ? p.liveState : 0,
                photoUrl: p.photoUrl ? `http://localhost:3001/images/${p.playerKey}.png` : 'http://localhost:3001/images/default.png'
            };
            if (existingIdx >= 0) {
                t.players![existingIdx] = playerEntry; // update existing
            } else {
                t.elims += p.killNum; // only count kills for new (unique) players
                t.players!.push(playerEntry);
            }
        });

        // Finalize team scores
        const allTeams = Array.from(teamMap.values()).map(t => {
            t.totalPts = t.elims + t.placePts;
            
            // Stable slot sorting: never sort by liveState/health, otherwise players will swap places
            // when someone dies, which looks like a alive player suddenly regaining health because they 
            // moved into the dead player's old slot.
            if (t.players) {
                t.players.sort((a, b) => a.playerKey.localeCompare(b.playerKey));
            }

            t.players = t.players?.slice(0, 4);
            return t;
        });

        // === FROZEN SLOT SYSTEM ===
        // On first data receive, lock in the team order. Never shuffle unless scores differ.
        if (frozenOrderRef.current.length === 0) {
            // Initial order: sort by scores then alphabetically
            const initial = [...allTeams].sort((a, b) =>
                b.totalPts - a.totalPts ||
                b.elims - a.elims ||
                (a.teamId || 0) - (b.teamId || 0) ||
                a.name.localeCompare(b.name)
            );
            frozenOrderRef.current = initial.map(t => t.name);
        }

        // Sort: alive teams first, then score desc, frozen slot as final tie-breaker
        const frozenOrder = frozenOrderRef.current;
        // A team is "alive" if the backend has NOT given them a placement yet.
        // placement !== null means our backend tracker has locked this team as eliminated.
        // We use placement as the authoritative signal because PCOB may keep sending
        // stale liveState=5 data for dead players long after they're eliminated.
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
            // Tier 4: Frozen slot (prevents shuffling among tied teams)
            const slotA = frozenOrder.indexOf(a.name);
            const slotB = frozenOrder.indexOf(b.name);
            const frozenDiff = (slotA === -1 ? 9999 : slotA) - (slotB === -1 ? 9999 : slotB);
            if (frozenDiff !== 0) return frozenDiff;
            return a.name.localeCompare(b.name);
        });

        // Assign ranks
        sorted.forEach((team, index) => {
            team.rank = index + 1;
        });

        setTeams(sorted);
    };

    useEffect(() => {
        let fetchInterval: NodeJS.Timeout | null = null;

        const tryFetch = () => {
            fetch(`${API_URL}/api/match-state/${matchId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.activePlayers && data.activePlayers.length > 0) {
                        processData(data.activePlayers);
                        // Stop polling once we get data — socket takes over from here
                        if (fetchInterval) clearInterval(fetchInterval);
                    }
                })
                .catch(() => {
                    // Backend not ready yet, retry quietly — no red dev overlay
                    console.warn('[RamadanRanking] Backend/PCOB not reachable, retrying in 5s...');
                });
        };

        // Try immediately, then retry every 5s until backend responds
        tryFetch();
        fetchInterval = setInterval(tryFetch, 5000);

        // Socket Connection
        const socket = io(`${API_URL}`);

        socket.on('match_state_update', (data: any) => {
            if (data?.activePlayers) processData(data.activePlayers);
        });

        socket.on('graphic_command', (cmd: GraphicCommand) => {
            if (cmd.templateUrl?.includes('/overlays/match-rankings')) {
                if (cmd.action === 'PLAY') setIsVisible(true);
                else if (cmd.action === 'STOP' || cmd.action === 'CLEAR') setIsVisible(false);
                else if (cmd.action === 'UPDATE' && cmd.data?.activePlayers) {
                    processData(cmd.data.activePlayers);
                }
            }
        });

        return () => {
            if (fetchInterval) clearInterval(fetchInterval);
            socket.disconnect();
        };
    }, []);

    const displayTeams = teams.slice(0, 18);

    return (
        <AnimatePresence mode="wait">
            {isVisible && (
                <motion.div
                    key="ramadan-ranking-overlay"
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className={`w-[1920px] h-[1080px] overflow-hidden absolute inset-0 select-none font-sans bg-transparent`}
                >
                    <div className="absolute top-[40px] left-[40px] w-[500px] h-auto flex flex-col font-black">
                        
                        {/* Header Row */}
                        <div className="w-full h-8 flex items-end relative overflow-hidden text-white uppercase text-[15px] tracking-tight">
                            {!isDataOnly && (
                                <div className="absolute inset-0 z-0" style={{ background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})` }}></div>
                            )}
                            <div className="relative z-10 w-[45px] h-[30px] flex items-center justify-center" style={{ backgroundColor: theme.primary }}>
                                <span className="transform -skew-x-12 ml-2">#</span>
                                <div className="absolute top-0 right-[-10px] w-[20px] h-full skew-x-12" style={{ backgroundColor: theme.primary }}></div>
                            </div>
                            <div className="relative z-10 flex-1 pl-4 h-full flex items-center bg-transparent">
                                TEAM
                            </div>
                            <div className="relative z-10 w-[155px] h-full flex items-center px-1">
                                <div className="w-[70px] text-center text-[11px]">ALIVE</div>
                                <div className="w-[35px] text-center text-[11px]">PTS</div>
                                <div className="w-[45px] text-center text-[11px]">ELIMS</div>
                            </div>
                        </div>

                        {/* Team List Container */}
                        <div className={`w-full flex flex-col relative ${!isDataOnly ? 'bg-gradient-to-b from-[#f2f4f8] to-[#e1e5eb] border-b-4' : ''}`} style={{ borderColor: theme.secondary }}>
                            {!isDataOnly && (
                                <div className="absolute top-0 bottom-0 right-0 w-[110px] bg-gradient-to-b from-black/5 to-transparent pointer-events-none"></div>
                            )}

                            {displayTeams.map((team, idx) => (
                                <TeamRow key={team.name} team={team} index={idx} isEliminated={team.placement !== null && team.placement !== undefined} />
                            ))}
                        </div>

                        {/* Legend */}
                        <div className="w-full h-8 bg-[#313032] flex items-center px-4 gap-6 text-[10px] text-white tracking-[0.1em] font-normal border-t-2 border-[#1c1c1c]">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-[#00ff1a]"></div> ALIVE
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-[#ff0000]"></div> KNOCKED
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-[#555555]"></div> ELIMINATED
                            </div>
                        </div>

                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

