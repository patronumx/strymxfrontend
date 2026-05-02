"use client"
import { API_URL, WS_URL } from '@/lib/api-config';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { io, Socket } from 'socket.io-client';
import { Users, Crosshair, MapPin, Activity, ShieldAlert, Download, Radio, Eye, AlertCircle, Clock, Trophy, Crown, Zap, CookingPot, Shield, Flame, Truck, Bomb, Box, Save, CheckCircle, Layers, ChevronRight, Info, X, Plus, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import airdropImg from '@/assets/AIRDROP.png';
import eliminationsImg from '@/assets/Eliminations.png';
import grenadeImg from '@/assets/GRENADE.png';
import headshotsImg from '@/assets/Headshots.png';
import panImg from '@/assets/PAN.png';
import smokesImg from '@/assets/SMOKES & NADES.png';
import uazImg from '@/assets/UAZ.png';
import { useTheme } from '@/context/ThemeContext';
import ConfirmationModal from './ConfirmationModal';
import { cn } from '@/lib/utils';

interface PlayerStat {
    playerKey: string;
    name?: string;
    teamName: string;
    teamId?: number;
    health: number;
    liveState: number; // 0=Alive, 1=Knocked, 2=Dead
    killNum: number;
    damage: number;
    assists: number;
    survivalTime: number;
    photoUrl?: string;
    logoUrl?: string;
    rank?: number;
    // New metrics
    knockouts: number;
    heal: number;
    headShotNum: number;
    marchDistance: number;
    rescueTimes: number;
    gotAirDropNum: number;
    killNumInVehicle: number;
    killNumByGrenade: number;
    inDamage: number;
    // Grenade and Item usage
    useSmokeGrenadeNum?: number;
    useFragGrenadeNum?: number;
    useBurnGrenadeNum?: number;
    useFlashGrenadeNum?: number;
    // Scoring fields from backend
    placePts?: number;
    killPts?: number;
    matchPts?: number;
    placement?: number | null;
}

interface TeamRanking {
    name: string;
    logoUrl: string;
    elims: number;
    placePts: number;
    totalPts: number;
    teamId?: number;
    placement?: number | null;
    players: PlayerStat[];
}

function H2HDesignToggle() {
    const [design, setDesign] = React.useState<'classic' | 'radar'>('classic');

    React.useEffect(() => {
        try {
            const saved = localStorage.getItem('strymx_overlay_configs');
            if (saved) {
                const parsed = JSON.parse(saved);
                const style = parsed?.['head-to-head']?.designStyle;
                if (style === 'radar' || style === 'classic') setDesign(style);
            }
        } catch { }
    }, []);

    const select = (d: 'classic' | 'radar') => {
        setDesign(d);
        try {
            const raw = localStorage.getItem('strymx_overlay_configs') || '{}';
            const parsed = JSON.parse(raw);
            parsed['head-to-head'] = { ...(parsed['head-to-head'] || {}), designStyle: d };
            localStorage.setItem('strymx_overlay_configs', JSON.stringify(parsed));
        } catch { }
    };

    return (
        <div className="flex items-center gap-2 mb-2 bg-slate-900/60 border border-white/8 rounded-2xl p-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-3">Design</span>
            {([
                { id: 'classic' as const, label: 'Classic', desc: 'Stats cards' },
                { id: 'radar'   as const, label: 'Radar',   desc: 'Pentagon chart' },
            ]).map(d => (
                <button
                    key={d.id}
                    onClick={() => select(d.id)}
                    className={cn(
                        'flex flex-col items-center px-6 py-2 rounded-xl transition-all text-center',
                        design === d.id
                            ? 'bg-pink-500/20 border border-pink-500/50 text-pink-400'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                    )}
                >
                    <span className="text-xs font-black uppercase tracking-wider">{d.label}</span>
                    <span className="text-[9px] font-bold opacity-60">{d.desc}</span>
                </button>
            ))}
        </div>
    );
}

export default function LiveMatchControl() {
    const { theme } = useTheme();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<number | null>(null);
    const [players, setPlayers] = useState<PlayerStat[]>([]);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [isThemePanelOpen, setIsThemePanelOpen] = useState(false);
    const lastToastTime = useRef<number>(0);

    const notificationTimerRef = useRef<NodeJS.Timeout | null>(null);

    const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        console.log(`[Notification] ${type.toUpperCase()}: ${message}`);
        if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
        setNotification({ message, type });
        notificationTimerRef.current = setTimeout(() => {
            setNotification(null);
            notificationTimerRef.current = null;
        }, 5000);
    };
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);


    // Backup Mode
    const [backupMode, setBackupMode] = useState(false);
    const [pcobReachable, setPcobReachable] = useState<boolean | null>(null);
    const [backupSheetUrl, setBackupSheetUrl] = useState('');
    const [backupLoading, setBackupLoading] = useState(false);
    const [showBackupSetup, setShowBackupSetup] = useState(false);

    // Poll PCOB status and backup mode state
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch(`${API_URL}/api/backup-mode/status`);
                const data = await res.json();
                setBackupMode(data.backupMode);
                if (data.sheetStatus?.url) setBackupSheetUrl(data.sheetStatus.url);
            } catch {}
            try {
                const res = await fetch(`${API_URL}/api/pcob/status`);
                const data = await res.json();
                setPcobReachable(data.reachable);
            } catch { setPcobReachable(false); }
        };
        checkStatus();
        const interval = setInterval(checkStatus, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleToggleBackup = async () => {
        if (!backupMode && !backupSheetUrl.trim()) {
            setShowBackupSetup(true);
            return;
        }
        setBackupLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/backup-mode/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enabled: !backupMode,
                    sheetUrl: backupSheetUrl,
                    pollInterval: 5000
                })
            });
            const data = await res.json();
            setBackupMode(data.backupMode);
            setShowBackupSetup(false);
            showNotification(
                data.backupMode
                    ? 'BACKUP MODE ON — Sheet data is now feeding overlays'
                    : 'BACKUP MODE OFF — PCOB is the active source',
                data.backupMode ? 'error' : 'success'
            );
        } catch {
            showNotification('Failed to toggle backup mode', 'error');
        }
        setBackupLoading(false);
    };

    // Save to Match State (Sticky Bar)
    const [scheduledMatches, setScheduledMatches] = useState<any[]>([]);

    const [tournaments, setTournaments] = useState<any[]>([]);
    const [selectedTournament, setSelectedTournament] = useState('');
    const [selectedStage, setSelectedStage] = useState('');
    const [selectedTargetMatch, setSelectedTargetMatch] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [agentMatchId, setAgentMatchId] = useState('pmtm-s4-match-1');
    const [remoteActiveMatchId, setRemoteActiveMatchId] = useState<string | null>(null);
    const [liveTournamentId, setLiveTournamentId] = useState<string | null>(null);

    // Synchronize UI with Backend Active Match state periodically
    useEffect(() => {
        const syncActiveMatch = async () => {
            try {
                const res = await fetch(`${API_URL}/api/agent/active-match`);
                const data = await res.json();
                if (data.matchId !== remoteActiveMatchId) {
                    setRemoteActiveMatchId(data.matchId);
                    if (data.matchId) {
                        setAgentMatchId(data.matchId);
                        localStorage.setItem('strymx_agent_match_id', data.matchId);
                    }
                }
            } catch {}
        };
        const interval = setInterval(syncActiveMatch, 5000);
        syncActiveMatch(); // Immediate check
        return () => clearInterval(interval);
    }, [remoteActiveMatchId]);

    useEffect(() => {
        const savedAgentId = localStorage.getItem('strymx_agent_match_id');
        if (savedAgentId) setAgentMatchId(savedAgentId);
    }, []);


    const toggleLive = () => {
        if (!selectedTournament) return;
        if (liveTournamentId === selectedTournament) {
            localStorage.removeItem('strymx_active_tournament_id');
            setLiveTournamentId(null);
            showNotification("Tournament live sync deactivated", "info");
        } else {
            localStorage.setItem('strymx_active_tournament_id', selectedTournament);
            setLiveTournamentId(selectedTournament);
            showNotification(`Tournament live sync active: ${tournaments.find(t => t.id === selectedTournament)?.name}`, "success");
        }
    };

    useEffect(() => {
        fetchDataForPersistence(); // Pre-fetch for the control bar
        
        const backendUrl = WS_URL;
        
        const currentAgentId = localStorage.getItem('strymx_agent_match_id') || 'pmtm-s4-match-1';
        console.log(`[STRYMX-INIT] Dashboard booting. Agent Match ID: "${currentAgentId}"`);
        
        fetch(`${backendUrl}/api/match-state/${currentAgentId}`)
            .then(res => res.json())
            .then(data => {
                if (data.activePlayers && data.activePlayers.length > 0) {
                    console.log(`[STRYMX-INIT] Initial fetch for "${currentAgentId}": ${data.activePlayers.length} players loaded`);
                    setPlayers(data.activePlayers);
                    if (data.timestamp) setLastUpdate(data.timestamp);
                } else {
                    console.log(`[STRYMX-INIT] Initial fetch for "${currentAgentId}": No players found (empty match)`);
                }
            })
            .catch(err => console.warn("[STRYMX-INIT] Initial fetch error:", err));

        const newSocket = io(backendUrl);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('[STRYMX-WS] Connected to backend');
            setIsConnected(true);
        });
        newSocket.on('disconnect', () => {
            console.log('[STRYMX-WS] Disconnected from backend');
            setIsConnected(false);
        });

        // Load live tournament state
        setLiveTournamentId(localStorage.getItem('strymx_active_tournament_id'));

        newSocket.on('match_state_update', (data) => {
            // ═══════════════════════════════════════════════════════════════════
            // CRITICAL: Filter by matchId to prevent cross-match data pollution
            // The backend broadcasts ALL match updates on the same socket.
            // Without this gate, data from match-4 would merge into match-5.
            // ═══════════════════════════════════════════════════════════════════
            const expectedMatchId = localStorage.getItem('strymx_agent_match_id') || 'pmtm-s4-match-1';
            const incomingMatchId = data.matchId;

            if (incomingMatchId && incomingMatchId !== expectedMatchId) {
                // If the remote active match on backend is the one incoming, auto-sync local dashboard
                if (remoteActiveMatchId && incomingMatchId === remoteActiveMatchId) {
                    localStorage.setItem('strymx_agent_match_id', incomingMatchId);
                    setAgentMatchId(incomingMatchId);
                    console.log(`[STRYMX-WS] 🔄 Auto-synced dashboard to active match: ${incomingMatchId}`);
                } else {
                    // Silently ignore if it's just old data still in flight, only warn if it persists
                    // console.warn(`[STRYMX-WS] ⛔ REJECTED update from match "${incomingMatchId}" (expected: "${expectedMatchId}")`);
                    return; 
                }
            }

            if (!data.activePlayers || data.activePlayers.length === 0) {
                console.log(`[STRYMX-WS] ⚠️ Empty player array from match "${incomingMatchId || 'unknown'}". Category: ${data.category || 'N/A'}`);
                if (data.category === 'MANUAL_RESET') {
                    console.log(`[STRYMX-WS] 🔄 Manual reset detected. Clearing all state.`);
                    setPlayers([]);
                    localStorage.removeItem('strymx_team_slots');
                }
                setLastUpdate(data.timestamp);
                return;
            }

            const uniqueKeys = new Set(data.activePlayers.map((p: any) => p.playerKey)).size;
            const teamNames = new Set(data.activePlayers.map((p: any) => p.teamName));
            console.log(
                `[STRYMX-WS] ✅ ACCEPTED update | Match: "${incomingMatchId}" | Players: ${data.activePlayers.length} (${uniqueKeys} unique) | Teams: ${teamNames.size} | Category: ${data.category || 'N/A'}`
            );

            setLastUpdate(data.timestamp);
            setPlayers(data.activePlayers);
        });

        newSocket.on('data_ingested', () => {
            console.log("[STRYMX-WS] Live Telemetry Synced");
            lastToastTime.current = Date.now();
        });

        return () => { newSocket.close(); };
    }, []);

    const validPlayers = React.useMemo(() => {
        const uniquePlayerMap = new Map<string, any>();
        players.forEach(p => {
            const existing = uniquePlayerMap.get(p.playerKey);
            if (!existing) {
                uniquePlayerMap.set(p.playerKey, p);
            } else {
                // Keep whichever version has more recent/complete data
                if ((p.killNum ?? 0) >= (existing.killNum ?? 0) &&
                    (p.damage ?? 0) >= (existing.damage ?? 0)) {
                    uniquePlayerMap.set(p.playerKey, p);
                }
            }
        });

        return Array.from(uniquePlayerMap.values()).filter(p => {
            const isUnknown = !p.name || p.name === 'Unknown' || p.name === '-';
            const hasNoStats = (p.killNum || 0) === 0 && (p.damage || 0) === 0;
            if (isUnknown && hasNoStats) return false;
            return true;
        });
    }, [players]);

    const teamRankings = React.useMemo(() => {
        // ── Deduplicate players by playerKey ──────────────────────────────────
        const uniquePlayerMap = new Map<string, any>();
        players.forEach(p => {
            const existing = uniquePlayerMap.get(p.playerKey);
            if (!existing) {
                uniquePlayerMap.set(p.playerKey, p);
            } else {
                if ((p.killNum ?? 0) >= (existing.killNum ?? 0) &&
                    (p.damage ?? 0) >= (existing.damage ?? 0)) {
                    uniquePlayerMap.set(p.playerKey, p);
                }
            }
        });
        const dedupedPlayers = Array.from(uniquePlayerMap.values())
            .filter((p: any) => !(p.name === 'Unknown' && p.damage === 0 && p.killNum === 0));

        // ── Build team map ─────────────────────────────────────────────────────
        const teamMap = new Map<string, TeamRanking>();
        dedupedPlayers.forEach((p: any) => {
            const tName = p.teamName;
            if (!teamMap.has(tName)) {
                teamMap.set(tName, {
                    name: tName,
                    logoUrl: p.logoUrl || "",
                    elims: 0,
                    placePts: 0,
                    totalPts: 0,
                    teamId: p.teamId,
                    placement: null,
                    players: []
                });
            }
            const t = teamMap.get(tName)!;
            if (p.placePts !== undefined && p.placePts > t.placePts) t.placePts = p.placePts;
            if (p.placement !== undefined) t.placement = p.placement;
            t.elims += p.killNum;
            t.players.push(p);
        });

        const allTeams = Array.from(teamMap.values()).map(t => {
            t.totalPts = t.elims + t.placePts;
            t.players.sort((a: any, b: any) => a.playerKey.localeCompare(b.playerKey));
            return t;
        });

        // ── Persistent slot order via localStorage ─────────────────────────────
        // Shared key with the overlay so both show the same team order
        let savedSlots: Record<string, number> = {};
        try { savedSlots = JSON.parse(localStorage.getItem('strymx_team_slots') || '{}'); } catch { savedSlots = {}; }
        let changed = false;
        allTeams.forEach(t => {
            if (!(t.name in savedSlots)) {
                savedSlots[t.name] = Object.keys(savedSlots).length;
                changed = true;
            }
        });
        if (changed) { try { localStorage.setItem('strymx_team_slots', JSON.stringify(savedSlots)); } catch { /* ignore */ } }

        // ── Stable sort ────────────────────────────────────────────────────────
        // ── Official Tournament Sort: Total Points > Placement Points > Elims > Placement > Alive Status ──
        const teamIsEliminated = (t: TeamRanking) => t.placement !== null && t.placement !== undefined;
        return allTeams.sort((a, b) => {
            // 1. Total Points (Primary)
            const ptsDiff = b.totalPts - a.totalPts;
            if (ptsDiff !== 0) return ptsDiff;

            // 2. Placement Points (First Tie-breaker)
            const placePtsDiff = b.placePts - a.placePts;
            if (placePtsDiff !== 0) return placePtsDiff;

            // 3. Elimination Points (Second Tie-breaker)
            const elimsDiff = b.elims - a.elims;
            if (elimsDiff !== 0) return elimsDiff;

            // 4. Best Placement (Tertiary Tie-breaker: 1st > 2nd > 3rd)
            const placeA = a.placement || 999;
            const placeB = b.placement || 999;
            if (placeA !== placeB) return placeA - placeB;

            // 5. Alive Status (Final Tie-breaker: Alive (0) > Eliminated (1))
            const aliveA = teamIsEliminated(a) ? 1 : 0;
            const aliveB = teamIsEliminated(b) ? 1 : 0;
            if (aliveA !== aliveB) return aliveA - aliveB;

            // 6. Name sort
            return a.name.localeCompare(b.name);
        });
    }, [validPlayers]);

    const matchSummaryStats = React.useMemo(() => {
        const stats = {
            totalKills: 0,
            totalKnocks: 0,
            totalHeadshots: 0,
            smokesAndNades: 0,
            vehicleKills: 0,
            grenadeKills: 0,
            airdropLooted: 0
        };

        validPlayers.forEach(p => {
            stats.totalKills += p.killNum || 0;
            stats.totalKnocks += p.knockouts || 0;
            stats.totalHeadshots += p.headShotNum || 0;
            stats.smokesAndNades += (p.useSmokeGrenadeNum || 0) + (p.useFragGrenadeNum || 0) + (p.useBurnGrenadeNum || 0) + (p.useFlashGrenadeNum || 0);
            stats.vehicleKills += p.killNumInVehicle || 0;
            stats.grenadeKills += p.killNumByGrenade || 0;
            stats.airdropLooted += p.gotAirDropNum || 0;
        });

        return stats;
    }, [validPlayers]);

    const isPlayerAlive = (p: PlayerStat) => {
        // liveState: 0=Alive, 1=Knocked, 2=Dead
        if (p.liveState !== undefined && p.liveState !== null) return p.liveState < 2;
        return p.health > 0;
    };

    // Calculate total combat activity to help detect if the match has actually started
    const totalMatchKills = validPlayers.reduce((sum, p) => sum + (p.killNum || 0), 0);
    const totalMatchDamage = validPlayers.reduce((sum, p) => sum + (p.damage || 0), 0);

    // Detect if the data is a "lobby reset" or "waiting" state
    // We treat it as a lobby if:
    // 1. Data is stale (>30s) OR
    // 2. Everyone is alive AND there has been ZERO combat (0 kills, 0 damage)
    const isDataStale = !lastUpdate || (Date.now() - lastUpdate) > 30000;
    const allPlayersIdenticalAliveState = validPlayers.length > 0 && validPlayers.every(p => (p.liveState === 0 || p.liveState === undefined || p.liveState === null));
    const isLobbyResetState = isDataStale || (allPlayersIdenticalAliveState && totalMatchKills === 0 && totalMatchDamage === 0);

    // Log alive/dead diagnostic info
    if (validPlayers.length > 0) {
        const liveStateCounts = validPlayers.reduce((acc, p) => {
            const state = p.liveState ?? 'undef';
            acc[state] = (acc[state] || 0) + 1;
            return acc;
        }, {} as Record<string | number, number>);
        console.log(`[STRYMX-KPI] Players: ${validPlayers.length} | Kills: ${totalMatchKills} | Dmg: ${totalMatchDamage} | Stale: ${isDataStale} | LobbyReset: ${isLobbyResetState}`);
    }

    const alivePlayers = isLobbyResetState ? 0 : validPlayers.filter(isPlayerAlive).length;
    const deadPlayers = isLobbyResetState ? 0 : validPlayers.filter(p => !isPlayerAlive(p)).length;
    // Group by both ID and Name to ensure unique team counting even with placeholder names
    const activeTeams = isLobbyResetState ? 0 : new Set(validPlayers.filter(isPlayerAlive).map(p => `${p.teamId}-${p.teamName}`)).size;
    const topDamageLeaders = [...validPlayers]
        .sort((a, b) => {
            if (b.killNum !== a.killNum) {
                return b.killNum - a.killNum; // Kills first
            }
            return b.damage - a.damage; // Damage second
        })
        .slice(0, 5);

    // Calculate MVP Scores
    const totalSurv = validPlayers.reduce((sum, p) => sum + (p.survivalTime || 0), 0);
    const totalDmg = validPlayers.reduce((sum, p) => sum + (p.damage || 0), 0);
    const totalElims = validPlayers.reduce((sum, p) => sum + (p.killNum || 0), 0);

    const scoredPlayers = validPlayers.map(p => {
        const survival_point = totalSurv > 0 ? ((p.survivalTime || 0) / totalSurv) * 0.2 : 0;
        const damage_point = totalDmg > 0 ? ((p.damage || 0) / totalDmg) * 0.4 : 0;
        const elimination_point = totalElims > 0 ? ((p.killNum || 0) / totalElims) * 0.4 : 0;

        const mvpScore = (survival_point + damage_point + elimination_point) * 100;
        return { ...p, mvpScore };
    });

    const topMvpPlayers = scoredPlayers.sort((a, b) => b.mvpScore - a.mvpScore).slice(0, 5);
    const headToHeadPlayers = topMvpPlayers.slice(0, 2);

    const headToHeadMetrics = [
        { label: "AVG. ELIMINATIONS", key: "killNum", format: (v: any) => v.toString() },
        { label: "AVG. DAMAGE", key: "damage", format: (v: any) => Math.round(v).toString() },
        { label: "AVG. HEADSHOTS", key: "headShotNum", format: (v: any) => v.toString() },
        { label: "AVG. ASSISTS", key: "assists", format: (v: any) => v.toString() },
        { label: "AVG. SURVIVAL TIME", key: "survivalTime", format: (v: any) => `${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, '0')}` },
    ];

    // WWCD Team Logic
    const teams = validPlayers.reduce((acc: any, player) => {
        if (!acc[player.teamName]) acc[player.teamName] = { players: [], totalScore: 0, isWWCD: false, logoUrl: player.logoUrl };
        acc[player.teamName].players.push(player);
        acc[player.teamName].totalScore += player.killNum + (player.damage / 100);
        if (player.rank === 1) acc[player.teamName].isWWCD = true;
        return acc;
    }, {});

    let wwcdTeamPlayers: PlayerStat[] = [];
    let wwcdTeamName = "";
    let wwcdTeamLogo = "";

    const wwcdTeamEntry = Object.entries(teams).find(([_, data]: any) => data.isWWCD);
    if (wwcdTeamEntry) {
        wwcdTeamName = wwcdTeamEntry[0];
        wwcdTeamPlayers = (wwcdTeamEntry[1] as any).players;
        wwcdTeamLogo = (wwcdTeamEntry[1] as any).logoUrl;
    } else {
        const sortedTeams = Object.entries(teams).sort((a: any, b: any) => b[1].totalScore - a[1].totalScore);
        if (sortedTeams.length > 0) {
            wwcdTeamName = sortedTeams[0][0];
            wwcdTeamPlayers = (sortedTeams[0][1] as any).players;
            wwcdTeamLogo = (sortedTeams[0][1] as any).logoUrl;
        }
    }

    const displayWwcdPlayers = [...wwcdTeamPlayers].sort((a, b) => b.killNum - a.killNum).slice(0, 4);

    const handleResetMatch = async () => {
        try {
            console.log('Attempting to reset match at ${API_URL}/api/agent/reset...');
            const response = await fetch(`${API_URL}/api/agent/reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matchId: agentMatchId })
            });
            
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(`Server returned ${response.status}: ${JSON.stringify(errData)}`);
            }
            
            console.log('Reset successful');
            localStorage.removeItem('strymx_team_slots'); // Clear team slot order for fresh match
            setPlayers([]); // Optimistically clear frontend
            setIsResetModalOpen(false);
            showNotification('Match reset successfully!', 'success');
        } catch (e: any) {
            console.error('Failed to reset match:', e);
            showNotification(`Reset failed: ${e.message}`, 'error');
        }
    };

    const fetchDataForPersistence = async () => {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || WS_URL;
        try {
            console.log(`[PERSISTENCE] Fetching from ${backendUrl}`);
            const mRes = await fetch(`${backendUrl}/api/matches`);
            if (mRes.ok) {
                const data = await mRes.json();
                setScheduledMatches(data);
            }
            const tRes = await fetch(`${backendUrl}/api/tournaments`);
            if (tRes.ok) {
                const data = await tRes.json();
                setTournaments(data);
            }
        } catch (err) {
            console.error('[PERSISTENCE-FETCH-ERROR]', err);
            showNotification('Failed to fetch persistence data. Check if backend is online.', 'error');
        }
    };


    const handleStartConnector = async () => {
        if (!agentMatchId) return showNotification("Please enter or select a Match ID.", 'error');
        
        try {
            const res = await fetch(`${API_URL}/api/agent/active-match`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matchId: agentMatchId, reset: true })
            });
            const data = await res.json();
            if (data.success) {
                setRemoteActiveMatchId(agentMatchId);
                localStorage.setItem('strymx_agent_match_id', agentMatchId);
                showNotification(`Connector started for: ${agentMatchId}`, 'success');
                
                // Also trigger a reset on the backend for this match ID to clear old data
                fetch(`${API_URL}/api/agent/reset`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ matchId: agentMatchId })
                }).catch(() => {});
            }
        } catch {
            showNotification("Failed to start connector.", 'error');
        }
    };

    const handleStopConnector = async () => {
        try {
            const res = await fetch(`${API_URL}/api/agent/active-match`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matchId: null })
            });
            const data = await res.json();
            if (data.success) {
                setRemoteActiveMatchId(null);
                showNotification("Connector stopped.", "info");
            }
        } catch {
            showNotification("Failed to stop connector.", 'error');
        }
    };

    const handleSaveToMatch = async () => {
        const targetId = selectedTargetMatch || agentMatchId;
        if (!targetId || targetId === 'custom') return showNotification("Please select a target match.", 'error');
        
        // 1. Check if already saved (COMPLETED)
        const existingMatch = scheduledMatches.find(m => m.id === targetId);
        if (existingMatch?.status === 'COMPLETED') {
            return showNotification("This match has already been saved and finalized.", 'info');
        }

        // 2. Check if match is actually finished (has a winner)
        const hasWinner = validPlayers.some(p => p.rank === 1);
        const teamsAlive = teamRankings.filter(t => t.placement === null || t.placement === undefined).length;
        
        if (!hasWinner && teamsAlive > 1) {
            return showNotification("Match is still in progress! Wait for a Chicken Dinner before saving.", 'warning');
        }

        setIsSaving(true);
        const backendUrl = WS_URL;
        try {
            const res = await fetch(`${backendUrl}/api/matches/${targetId}/save-live-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceMatchId: agentMatchId })
            });
            if (res.ok) {
                const data = await res.json();
                showNotification(data.message || 'Successfully saved live data to destination match!', 'success');
                setSelectedTargetMatch('');
                fetchDataForPersistence(); // Re-fetch to hide the completed match
            } else {
                let errorMsg = 'Failed to save data.';
                try {
                    const err = await res.json();
                    errorMsg = err.error || errorMsg;
                } catch (e) {}
                throw new Error(errorMsg);
            }
        } catch (error: any) {
            showNotification(error.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Stable Sorting for Telemetry Table
    const sortedTelemetryPlayers = React.useMemo(() => {
        return [...validPlayers].sort((a, b) => {
            // Tier 1: Damage DESC
            const dmgA = Math.round(a.damage || 0);
            const dmgB = Math.round(b.damage || 0);
            if (dmgB !== dmgA) return dmgB - dmgA;
            
            // Tier 2: Elims DESC
            const killsA = a.killNum || 0;
            const killsB = b.killNum || 0;
            if (killsB !== killsA) return killsB - killsA;
            
            // Tier 3: Stable Tie-breaker (Team + Name)
            const stableA = `${a.teamName}-${a.name}`.toLowerCase();
            const stableB = `${b.teamName}-${b.name}`.toLowerCase();
            return stableA.localeCompare(stableB);
        });
    }, [validPlayers]);

    const handleExportCSV = () => {
        if (validPlayers.length === 0) return showNotification('No data to export.', 'error');

        const headers = [
            'Player Name', 
            'Team Name', 
            'Matches', 
            'Kills', 
            'Damage', 
            'Avg Survival Time', 
            'Assists', 
            'Knockouts', 
            'Heal', 
            'Headshots', 
            'March Distance', 
            'Rescue Times', 
            'Airdrops', 
            'Vehicle Kills', 
            'Grenade Kills', 
            'In-Damage'
        ];
        const rows = validPlayers.map(p => {
            return [
                p.name || p.playerKey,
                p.teamName.replace(/^scout\s+/i, ''),
                1, // Matches (placeholder for single match context)
                p.killNum,
                Math.round(p.damage),
                p.survivalTime ? `${Math.floor(p.survivalTime / 60)}:${String(Math.round(p.survivalTime % 60)).padStart(2, '0')}` : '0',
                p.assists || 0,
                p.knockouts || 0,
                Math.round(p.heal || 0),
                p.headShotNum || 0,
                Math.round(p.marchDistance || 0),
                p.rescueTimes || 0,
                p.gotAirDropNum || 0,
                p.killNumInVehicle || 0,
                p.killNumByGrenade || 0,
                Math.round(p.inDamage || 0)
            ].join(',');
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `match_results_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
        {/* Notification Toast - Moved to absolute root and top-center for guaranteed visibility */}
        <AnimatePresence>
            {notification && (
                <motion.div
                    initial={{ opacity: 0, y: -100, x: '-50%', scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
                    exit={{ opacity: 0, y: -100, x: '-50%', scale: 0.95 }}
                    className="fixed top-10 left-1/2 z-[9999] min-w-[320px] max-w-md"
                >
                    <div className={cn(
                        "flex items-center gap-4 p-5 rounded-2xl backdrop-blur-3xl border shadow-[0_20px_50px_rgba(0,0,0,0.5)]",
                        notification.type === 'success' && "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-emerald-500/20",
                        notification.type === 'error' && "bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-rose-500/20",
                        notification.type === 'info' && "bg-blue-500/20 border-blue-500/40 text-blue-300 shadow-blue-500/20"
                    )}>
                        <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner",
                            notification.type === 'success' && "bg-emerald-500/30",
                            notification.type === 'error' && "bg-rose-500/30",
                            notification.type === 'info' && "bg-blue-500/30"
                        )}>
                            {notification.type === 'success' && <CheckCircle size={24} />}
                            {notification.type === 'error' && <AlertCircle size={24} />}
                            {notification.type === 'info' && <Info size={24} />}
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-60 mb-1">
                                {notification.type}
                            </p>
                            <p className="text-base font-bold text-white leading-tight">
                                {notification.message}
                            </p>
                        </div>
                        <button 
                            onClick={() => setNotification(null)}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors opacity-50 hover:opacity-100"
                        >
                            <X size={20} className="text-white" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-slate-200 space-y-8 p-4 min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.1),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(244,63,94,0.05),transparent_50%)]"
        >
            {/* Header Section */}
            <div className="flex items-center justify-between border-b border-slate-800/50 pb-8 mb-8 relative">
                <div className="absolute -top-24 -left-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div>
                    <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">
                        <Radio className="text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" size={32} />
                        Live Match Dashboard
                    </h2>
                    <p className="text-slate-400 mt-2 font-medium">
                        {backupMode ? (
                            <span className="text-amber-400 font-black uppercase tracking-widest text-xs">
                                ⚠ Backup Mode — Sheet Data Active
                            </span>
                        ) : 'Real-Time PCOB Telemetry Monitor'}
                    </p>
                </div>

                <div className="flex items-center gap-6 bg-slate-900/40 backdrop-blur-xl px-6 py-3 rounded-2xl border border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                    <div className="flex items-center gap-3">
                        <div className="relative flex h-3 w-3">
                            {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                            <span className={`relative inline-flex rounded-full h-3 w-3 shadow-[0_0_10px_currentColor] ${isConnected ? 'bg-emerald-500 text-emerald-500' : 'bg-rose-500 text-rose-500'}`}></span>
                        </div>
                        <span className="text-sm font-bold tracking-[0.2em] uppercase text-slate-300">
                            {isConnected ? 'Agent Active' : 'Agent Offline'}
                        </span>
                    </div>
                    <div className="w-px h-6 bg-slate-700/50"></div>
                    <div className="text-sm font-black tracking-widest text-slate-400">
                        {lastUpdate ? new Date(lastUpdate).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
                    </div>
                    <button
                        onClick={() => setIsResetModalOpen(true)}
                        className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-2 rounded-xl font-bold transition-all text-xs uppercase tracking-[0.2em] ml-2 hover:shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:-translate-y-0.5"
                    >
                        <ShieldAlert size={14} /> Reset
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl font-bold transition-all text-xs uppercase tracking-[0.2em] ml-2 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:-translate-y-0.5"
                    >
                        <Download size={14} /> CSV
                    </button>
                    <div className="w-px h-6 bg-slate-700/50"></div>
                    <button
                        onClick={handleToggleBackup}
                        disabled={backupLoading}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all text-xs uppercase tracking-[0.2em] ml-2 hover:-translate-y-0.5 ${
                            backupMode
                                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse'
                                : 'bg-slate-700/30 hover:bg-amber-500/10 text-slate-400 hover:text-amber-400 border border-slate-600/30 hover:border-amber-500/30'
                        }`}
                    >
                        <Shield size={14} /> {backupMode ? 'Backup ON' : 'Backup'}
                    </button>
                    <div className="w-px h-6 bg-slate-700/50"></div>
                    <button
                        onClick={() => setIsThemePanelOpen(true)}
                        className="flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/30 px-4 py-2 rounded-xl font-bold transition-all text-xs uppercase tracking-[0.2em] ml-2 hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:-translate-y-0.5 group"
                    >
                        <Palette size={14} className="group-hover:rotate-12 transition-transform" /> Live Customize
                    </button>
                </div>
            </div>

            {/* CONNECTOR CONTROL PANEL */}
            <div className="bg-slate-900/60 border border-slate-800/50 rounded-3xl p-6 mb-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 opacity-20 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-6">
                        <div className={cn(
                            "w-16 h-16 rounded-2xl flex items-center justify-center relative",
                            remoteActiveMatchId ? "bg-emerald-500/10 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]" : "bg-slate-800 text-slate-500"
                        )}>
                            <Radio className={cn("w-8 h-8", remoteActiveMatchId && "animate-pulse")} />
                            {remoteActiveMatchId && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                                </span>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Connector Control</h3>
                                <div className={cn(
                                    "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-[0.2em] border",
                                    remoteActiveMatchId 
                                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                                        : "bg-slate-800 border-slate-700 text-slate-500"
                                )}>
                                    {remoteActiveMatchId ? 'Data Flowing' : 'Idle'}
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 font-bold mt-1">Target Match: <span className="text-slate-300 italic">{remoteActiveMatchId || 'None'}</span></p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 flex-1 max-w-xl">
                        <div className="flex flex-col flex-1 gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex-1 relative group/tourn">
                                    <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/tourn:text-indigo-400 transition-colors" size={16} />
                                    <select 
                                        value={selectedTournament}
                                        onChange={e => {
                                            setSelectedTournament(e.target.value);
                                            setSelectedStage('');
                                        }}
                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3 pl-12 pr-10 text-[11px] font-black uppercase tracking-wider text-white focus:outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">Filter By Tournament</option>
                                        {tournaments.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                                {selectedTournament && (
                                    <button
                                        onClick={toggleLive}
                                        className={cn(
                                            "px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shrink-0 flex items-center gap-2 border shadow-lg",
                                            liveTournamentId === selectedTournament
                                                ? "bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/20 animate-pulse"
                                                : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                                        )}
                                    >
                                        <div className={cn("w-2 h-2 rounded-full", liveTournamentId === selectedTournament ? "bg-white" : "bg-slate-500")} />
                                        {liveTournamentId === selectedTournament ? "Live Sync Active" : "Set Live Context"}
                                    </button>
                                )}
                            </div>

                            <div className="relative group/input">
                                <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-emerald-500 transition-colors" size={18} />
                                <select 
                                    value={agentMatchId}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setAgentMatchId(val);
                                        setSelectedTargetMatch(val); // Sync for saving!
                                    }}
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-10 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">-- Choose a Scheduled Match --</option>
                                    {scheduledMatches
                                        .filter(m => m.status !== 'COMPLETED')
                                        .filter(m => !selectedTournament || m.tournamentId === selectedTournament)
                                        .map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.matchName || m.id} ({m.tournament?.name || 'Tournament'})
                                            </option>
                                        ))
                                    }
                                    <option value="custom">-- Custom Match ID --</option>
                                </select>
                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none group-focus-within/input:rotate-90 transition-transform" size={16} />
                            </div>
                        </div>

                        {!remoteActiveMatchId ? (
                            <button
                                onClick={handleStartConnector}
                                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:shadow-[0_15px_40px_rgba(16,185,129,0.5)] hover:-translate-y-1 flex items-center gap-3 mt-5"
                            >
                                <Zap size={20} fill="currentColor" /> Start Live Stream
                            </button>
                        ) : (
                            <button
                                onClick={async () => {
                                    // 1. Save data first
                                    await handleSaveToMatch();
                                    // 2. Then stop connector
                                    await handleStopConnector();
                                }}
                                className="bg-rose-500 hover:bg-rose-400 text-white px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-[0_10px_30px_rgba(244,63,94,0.3)] hover:shadow-[0_15px_40px_rgba(244,63,94,0.5)] hover:-translate-y-1 flex items-center gap-3 mt-5"
                            >
                                <CheckCircle size={20} /> End Match & Save
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* BACKUP MODE BANNER */}
            <AnimatePresence>
                {backupMode && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -20, height: 0 }}
                        className="mb-4"
                    >
                        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 flex items-center justify-between backdrop-blur-xl">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-500/20 rounded-xl">
                                    <Shield size={24} className="text-amber-400" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-amber-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                                        Backup Mode Active
                                    </h4>
                                    <p className="text-[11px] font-bold text-amber-400/60 mt-0.5">
                                        Google Sheet data is feeding overlays instead of PCOB. Activate only when PCOB is offline.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right mr-2">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">PCOB Status</span>
                                    <span className={`text-[11px] font-black uppercase tracking-widest ${pcobReachable ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {pcobReachable === null ? 'Checking...' : pcobReachable ? 'Reachable' : 'Offline'}
                                    </span>
                                </div>
                                <button
                                    onClick={handleToggleBackup}
                                    disabled={backupLoading}
                                    className="px-5 py-2.5 bg-amber-500/20 hover:bg-rose-500/20 text-amber-400 hover:text-rose-400 border border-amber-500/30 hover:border-rose-500/30 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all"
                                >
                                    {backupLoading ? 'Switching...' : 'Deactivate Backup'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* PCOB OFFLINE WARNING (when not in backup mode) */}
            <AnimatePresence>
                {!backupMode && pcobReachable === false && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-4"
                    >
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <AlertCircle size={20} className="text-rose-400" />
                                <div>
                                    <span className="text-[11px] font-black text-rose-400 uppercase tracking-widest">PCOB is Offline</span>
                                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">No live data coming in. Enable Backup Mode to feed overlays from Google Sheet.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => backupSheetUrl ? handleToggleBackup() : setShowBackupSetup(true)}
                                className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                            >
                                Enable Backup
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Backup Setup Modal moved to fragment root (outside motion.div) */}


            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                {[
                    { title: "Teams Alive", value: activeTeams, max: teamRankings.length || 16, icon: Users, color: "text-blue-400", border: "border-blue-500/30", bg: "from-blue-500/10" },
                    { title: "Players Alive", value: alivePlayers, max: validPlayers.length || 64, icon: Eye, color: "text-emerald-400", border: "border-emerald-500/30", bg: "from-emerald-500/10" },
                    { title: "Casualties", value: deadPlayers, max: validPlayers.length || 64, icon: ShieldAlert, color: "text-rose-400", border: "border-rose-500/30", bg: "from-rose-500/10" },
                    { title: "Net Connection", value: isConnected ? "Stable" : "Lost", max: null, icon: Activity, color: isConnected ? "text-emerald-400" : "text-rose-400", border: isConnected ? "border-emerald-500/30" : "border-rose-500/30", bg: isConnected ? "from-emerald-500/10" : "from-rose-500/10" }
                ].map((kpi, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`bg-slate-900/40 backdrop-blur-xl border ${kpi.border} rounded-2xl p-6 relative overflow-hidden group hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1`}
                    >
                        {/* Soft Top Glow */}
                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r transparent via-current to-transparent opacity-0 group-hover:opacity-100 transition-opacity ${kpi.color}`}></div>

                        <div className={`absolute inset-0 bg-gradient-to-br ${kpi.bg} to-transparent opacity-20 group-hover:opacity-40 transition-opacity`}></div>

                        <div className={`absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity ${kpi.color}`}>
                            <kpi.icon size={100} />
                        </div>
                        <div className={`text-[10px] font-bold ${kpi.color} mb-2 flex items-center gap-2 uppercase tracking-[0.2em]`}>
                            <kpi.icon className={kpi.color} size={16} /> {kpi.title}
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-4xl font-black ${kpi.color}`}>{kpi.value}</span>
                            {kpi.max && <span className="text-xl text-slate-600 font-bold">/ {kpi.max}</span>}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Telemetry Monitor Table */}
            <div className="w-full border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl rounded-2xl flex flex-col overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                <div className="p-5 border-b border-slate-800/50 bg-slate-800/20 flex justify-between items-center">
                    <h3 className="font-black text-blue-400 uppercase tracking-widest flex items-center gap-2 drop-shadow-[0_0_10px_rgba(96,165,250,0.3)]">
                        <Activity size={18} /> Main Roster Monitor
                    </h3>
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:-translate-y-0.5"
                    >
                        <Download size={12} /> Export CSV
                    </button>
                </div>

                <div className="flex-1 overflow-x-auto">
                    {validPlayers.length === 0 ? (
                        <div className="flex items-center justify-center h-full min-h-[400px]">
                            <span className="text-slate-600 font-mono animate-pulse uppercase tracking-[0.2em] text-xs font-bold">awaiting_data_stream...</span>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="text-[10px] text-slate-500 uppercase font-black bg-slate-950/60 sticky top-0 z-10 backdrop-blur-md tracking-widest shadow-sm">
                                <tr>
                                    <th className="px-6 py-5 border-b border-slate-800/80 bg-slate-900/50">Player Name</th>
                                    <th className="px-4 py-5 border-b border-slate-800/80 bg-slate-900/50">Team Name</th>
                                    <th className="px-2 py-5 border-b border-slate-800/80 text-center text-rose-500 font-black">KNOCKS</th>
                                    <th className="px-2 py-5 border-b border-slate-800/80 text-center text-emerald-500 font-black">HEALS</th>
                                    <th className="px-2 py-5 border-b border-slate-800/80 text-center text-amber-500 font-black">KILLS</th>
                                    <th className="px-2 py-5 border-b border-slate-800/80 text-center text-indigo-400 font-black">ASSTS</th>
                                    <th className="px-2 py-5 border-b border-slate-800/80 text-center text-orange-400 font-black">HS</th>
                                    <th className="px-2 py-5 border-b border-slate-800/80 text-center text-cyan-400 font-black">DIST</th>
                                    <th className="px-2 py-5 border-b border-slate-800/80 text-center text-purple-400 font-black">RESC</th>
                                    <th className="px-2 py-5 border-b border-slate-800/80 text-center text-yellow-400 font-black">DROP</th>
                                    <th className="px-2 py-5 border-b border-slate-800/80 text-center text-blue-400 font-black">VEH</th>
                                    <th className="px-2 py-5 border-b border-slate-800/80 text-center text-red-500 font-black">NADE</th>
                                    <th className="px-2 py-5 border-b border-slate-800/80 text-center text-emerald-400 font-black uppercase">Survival</th>
                                    <th className="px-6 py-5 border-b border-slate-800/80 text-right text-rose-400 font-black">IN-DMG</th>
                                    <th className="px-6 py-5 border-b border-slate-800/80 text-right text-white font-black bg-white/5">TOTAL DAMAGE</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/30 font-medium text-xs">
                                <AnimatePresence mode="popLayout">
                                    {sortedTelemetryPlayers.map((p, idx) => (
                                        <motion.tr 
                                            layout
                                            key={p.playerKey || `player-${idx}-${p.name}`} 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="hover:bg-blue-900/20 transition-colors group border-b border-slate-800/20 last:border-0"
                                        >
                                            <td className="px-6 py-4 font-black text-slate-100 text-sm">{p.name || p.playerKey}</td>
                                            <td className="px-4 py-4 font-bold text-slate-400 uppercase tracking-tighter">{p.teamName.replace(/^scout\s+/i, '')}</td>
                                            <td className="px-2 py-4 font-black text-center text-rose-400 text-lg">{p.knockouts || 0}</td>
                                            <td className="px-2 py-4 font-black text-center text-emerald-400">{Math.round(p.heal || 0)}</td>
                                            <td className="px-2 py-4 font-black text-center text-white text-lg">{p.killNum}</td>
                                            <td className="px-2 py-4 font-black text-center text-slate-500 group-hover:text-slate-300">{p.assists || 0}</td>
                                            <td className="px-2 py-4 font-black text-center text-orange-400">{p.headShotNum || 0}</td>
                                            <td className="px-2 py-4 font-mono text-center text-cyan-400">{Math.round(p.marchDistance || 0)}</td>
                                            <td className="px-2 py-4 font-black text-center text-purple-400">{p.rescueTimes || 0}</td>
                                            <td className="px-2 py-4 font-black text-center text-yellow-400">{p.gotAirDropNum || 0}</td>
                                            <td className="px-2 py-4 font-black text-center text-blue-400">{p.killNumInVehicle || 0}</td>
                                            <td className="px-2 py-4 font-black text-center text-red-400">{p.killNumByGrenade || 0}</td>
                                            <td className="px-2 py-4 font-mono text-center text-slate-400 lowercase italic">
                                                {p.survivalTime ? `${Math.floor(p.survivalTime / 60)}:${String(Math.round(p.survivalTime % 60)).padStart(2, '0')}` : '0:00'}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-right text-rose-300 font-bold">{Math.round(p.inDamage || 0)}</td>
                                            <td className="px-6 py-4 font-mono text-right text-emerald-400 font-black text-base bg-emerald-500/5">{Math.round(p.damage)}</td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Match Rankings Section (New) */}
            <div className="w-full border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl rounded-2xl flex flex-col overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -z-10"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/5 rounded-full blur-[80px] -z-10"></div>
                
                <div className="p-6 border-b border-slate-800/50 bg-slate-800/20 flex justify-between items-center">
                    <div className="flex justify-between items-center w-full">
                        <div>
                            <h3 className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 uppercase tracking-tighter flex items-center gap-3">
                                <Trophy className="text-emerald-500" size={24} /> Match Rankings
                            </h3>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1">Real-time standings • Match 1/16</p>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    const params = new URLSearchParams();
                                    params.set('primary', theme.primary.replace('#', ''));
                                    params.set('secondary', theme.secondary.replace('#', ''));
                                    window.open(`/overlay/match-rankings?${params.toString()}`, '_blank', 'width=1920,height=1080');
                                }}
                                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                            >
                                Gen Full Overlay
                            </button>
                            <button 
                                onClick={() => {
                                    const params = new URLSearchParams();
                                    params.set('transparent', 'true');
                                    params.set('primary', theme.primary.replace('#', ''));
                                    params.set('secondary', theme.secondary.replace('#', ''));
                                    window.open(`/overlay/match-rankings?${params.toString()}`, '_blank', 'width=1920,height=1080');
                                }}
                                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                            >
                                Gen Transparent Overlay
                            </button>
                            <button
                                onClick={() => window.open(`/overlay-studio?type=match-rankings`, '_blank')}
                                className="bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                            >
                                Edit Overlay
                            </button>
                            <button
                                onClick={() => window.open(`/overlays/match-ranking?edit=true&design=premium`, '_blank')}
                                className="bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(217,70,239,0.2)]"
                            >
                                Edit Layout
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-8">
                    {teamRankings.length > 0 ? (
                        <>
                            {/* #1 Team Highlight */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-2xl p-8 flex items-center gap-12 relative overflow-hidden group"
                            >
                                <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
                                
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-6xl font-black text-emerald-500 italic">#1</span>
                                    <div className="relative">
                                        <img 
                                            src={teamRankings[0].logoUrl || `${API_URL}/images/default.png`} 
                                            className="w-24 h-24 object-contain drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]" 
                                            alt="" 
                                        />
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <div className="text-4xl font-black text-white uppercase tracking-tighter mb-4 group-hover:text-emerald-400 transition-colors">
                                        {teamRankings[0].name}
                                    </div>
                                    <div className="flex gap-12">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Place Pts</span>
                                            <span className="text-4xl font-black text-white">{teamRankings[0].placePts}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Elims</span>
                                            <span className="text-4xl font-black text-white">{teamRankings[0].elims}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mb-1">Total Points</span>
                                            <span className="text-5xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                                                {teamRankings[0].totalPts}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Top Team Players (Visual hints) */}
                                <div className="flex -space-x-4 items-end pr-4">
                                    {teamRankings[0].players.slice(0, 4).map((p, i) => (
                                        <div key={i} className="relative group/player">
                                            <img 
                                                src={`${API_URL}/images/${p.playerKey}.png`} 
                                                onError={(e) => { 
                                                    e.currentTarget.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
                                                    e.currentTarget.onerror = null; 
                                                }}
                                                className="w-16 h-16 rounded-full border-2 border-slate-800 object-cover bg-slate-900 group-hover/player:border-emerald-500 transition-colors" 
                                                alt="" 
                                            />
                                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-emerald-500 text-[8px] font-black text-black px-1.5 py-0.5 rounded opacity-0 group-hover/player:opacity-100 transition-opacity uppercase whitespace-nowrap z-20">
                                                {p.name}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Standings Table (2 Columns) */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-4">
                                {Array.from({ length: 2 }).map((_, colIdx) => {
                                    const colRankings = teamRankings.slice(1 + (colIdx * Math.ceil((teamRankings.length - 1) / 2)), 1 + ((colIdx + 1) * Math.ceil((teamRankings.length - 1) / 2)));
                                    return (
                                        <div key={colIdx} className="space-y-2">
                                            <div className="flex text-[9px] font-black text-slate-500 uppercase tracking-widest px-4 pb-2 border-b border-slate-800/50">
                                                <div className="w-12">Rank</div>
                                                <div className="flex-1">Team</div>
                                                <div className="w-16 text-center">Place</div>
                                                <div className="w-16 text-center">Elims</div>
                                                <div className="w-20 text-right">Total</div>
                                            </div>
                                            <div className="space-y-1">
                                                {colRankings.map((team, tIdx) => {
                                                    const rank = teamRankings.indexOf(team) + 1;
                                                    return (
                                                        <motion.div 
                                                            layout
                                                            key={team.teamId || team.name || `team-${tIdx}`}
                                                            className="flex items-center px-4 py-3 rounded-xl bg-slate-800/20 border border-slate-800/50 hover:bg-slate-800/40 hover:border-emerald-500/30 transition-all group"
                                                        >
                                                            <div className="w-12 font-black text-slate-400 group-hover:text-emerald-500 transition-colors">#{rank}</div>
                                                            <div className="flex-1 flex items-center gap-3">
                                                                <img 
                                                                    src={team.logoUrl || `${API_URL}/images/default.png`} 
                                                                    className="w-6 h-6 object-contain" 
                                                                    alt="" 
                                                                />
                                                                <span className="font-bold text-slate-200 uppercase tracking-tighter text-sm">{team.name}</span>
                                                            </div>
                                                            <div className="w-16 text-center text-slate-400 font-bold">{team.placePts}</div>
                                                            <div className="w-16 text-center text-slate-400 font-bold">{team.elims}</div>
                                                            <div className="w-20 text-right font-black text-emerald-400 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">{team.totalPts}</div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="py-20 text-center text-slate-600 font-mono italic animate-pulse">Calculating rankings...</div>
                    )}
                </div>
            </div>

            <div className="w-full border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl rounded-2xl flex flex-col overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative mb-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] -z-10"></div>
                <div className="p-6 border-b border-slate-800/50 bg-slate-800/20 flex justify-between items-center">
                    <div className="flex justify-between items-center w-full">
                        <div>
                            <h3 className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400 uppercase tracking-tighter flex items-center gap-3">
                                <Crown className="text-amber-500" size={24} /> Match MVP
                            </h3>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1">Player performance spotlight • Premium</p>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    const params = new URLSearchParams();
                                    params.set('primary', theme.primary.replace('#', ''));
                                    params.set('secondary', theme.secondary.replace('#', ''));
                                    window.open(`/overlays/match-mvp?${params.toString()}`, '_blank', 'width=1920,height=1080');
                                }}
                                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                            >
                                Gen Full Overlay
                            </button>
                            <button 
                                onClick={() => {
                                    const params = new URLSearchParams();
                                    params.set('transparent', 'true');
                                    params.set('primary', theme.primary.replace('#', ''));
                                    params.set('secondary', theme.secondary.replace('#', ''));
                                    window.open(`/overlays/match-mvp?${params.toString()}`, '_blank', 'width=1920,height=1080');
                                }}
                                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                            >
                                Gen Transparent Overlay
                            </button>
                            <button
                                onClick={() => window.open(`/overlay-studio?type=match-mvp`, '_blank')}
                                className="bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                            >
                                Edit Overlay
                            </button>
                            <button
                                onClick={() => window.open(`/overlays/match-mvp?edit=true&design=premium`, '_blank')}
                                className="bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(217,70,239,0.2)]"
                            >
                                Edit Layout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Road to MVP Section (New) */}
            <div className="w-full border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl rounded-2xl flex flex-col overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative mb-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] -z-10"></div>
                <div className="p-6 border-b border-slate-800/50 bg-slate-800/20 flex justify-between items-center">
                    <div className="flex justify-between items-center w-full">
                        <div>
                            <h3 className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 uppercase tracking-tighter flex items-center gap-3">
                                <Zap className="text-cyan-500" size={24} /> Road to MVP
                            </h3>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1">Tournament-wide top performers • Premium</p>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    const params = new URLSearchParams();
                                    params.set('design', 'premium');
                                    params.set('tournamentId', selectedTournament || liveTournamentId || '');
                                    window.open(`/overlays/road-to-mvp?${params.toString()}`, '_blank', 'width=1920,height=1080');
                                }}
                                className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                            >
                                Gen Full Overlay
                            </button>
                            <button 
                                onClick={() => {
                                    const params = new URLSearchParams();
                                    params.set('design', 'premium');
                                    params.set('transparent', 'true');
                                    params.set('tournamentId', selectedTournament || liveTournamentId || '');
                                    window.open(`/overlays/road-to-mvp?${params.toString()}`, '_blank', 'width=1920,height=1080');
                                }}
                                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                            >
                                Gen Transparent Overlay
                            </button>
                            <button
                                onClick={() => window.open(`/overlay-studio?type=road-to-mvp`, '_blank')}
                                className="bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                            >
                                Edit Overlay
                            </button>
                            <button
                                onClick={() => {
                                    const tId = selectedTournament || liveTournamentId || '';
                                    window.open(`/overlays/road-to-mvp?edit=true&design=premium&tournamentId=${tId}`, '_blank');
                                }}
                                className="bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(217,70,239,0.2)]"
                            >
                                Edit Layout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Rankings Overlay */}
            <div className="w-full border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl rounded-2xl flex flex-col overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-[80px] -z-10"></div>
                <div className="p-6 border-b border-slate-800/50 bg-slate-800/20 flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400 uppercase tracking-tighter flex items-center gap-3">
                            <Radio className="text-orange-500" size={24} /> Live Rankings
                        </h3>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1">Real-time health bars & standings</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                const params = new URLSearchParams();
                                params.set('primary', theme.primary.replace('#', ''));
                                params.set('secondary', theme.secondary.replace('#', ''));
                                window.open(`/overlay/live-rankings?${params.toString()}`, '_blank', 'width=1920,height=1080');
                            }}
                            className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(249,115,22,0.2)]"
                        >
                            Gen Full Overlay
                        </button>
                        <button
                            onClick={() => {
                                const params = new URLSearchParams();
                                params.set('transparent', 'true');
                                params.set('primary', theme.primary.replace('#', ''));
                                params.set('secondary', theme.secondary.replace('#', ''));
                                window.open(`/overlay/live-rankings?${params.toString()}`, '_blank', 'width=1920,height=1080');
                            }}
                            className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                        >
                            Gen Transparent Overlay
                        </button>
                        <button
                            onClick={() => window.open(`/overlay-studio?type=live-rankings`, '_blank')}
                            className="bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                        >
                            Edit Overlay
                        </button>
                        <button
                            onClick={() => window.open(`/overlay/live-rankings?edit=true`, '_blank')}
                            className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(59,130,246,0.25)] flex items-center gap-1.5"
                            title="Drag & drop layout editor (Premium)"
                        >
                            <Layers size={11} />
                            Edit Layout
                        </button>
                        <button
                            onClick={() => {
                                const params = new URLSearchParams();
                                params.set('dataOnly', 'true');
                                params.set('primary', theme.primary.replace('#', ''));
                                params.set('secondary', theme.secondary.replace('#', ''));
                                window.open(`/overlay/live-rankings?${params.toString()}`, '_blank', 'width=1920,height=1080');
                            }}
                            className="bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 border border-slate-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest"
                        >
                            Gen Data-Only Overlay
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {teamRankings.length > 0 ? (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                            {teamRankings.slice(0, 18).map((team, idx) => (
                                <div key={team.name || idx} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/30 border border-slate-800/50">
                                    <span className="text-lg font-black text-orange-400 w-8">#{idx + 1}</span>
                                    <img src={team.logoUrl || `${API_URL}/images/default.png`} className="w-6 h-6 object-contain" alt="" />
                                    <span className="font-bold text-slate-200 uppercase tracking-tighter text-sm flex-1 truncate">{team.name}</span>
                                    <div className="flex gap-4 text-xs">
                                        <span className="text-slate-400 font-bold">{team.totalPts} <span className="text-slate-600">pts</span></span>
                                        <span className="text-orange-400 font-bold">{team.elims} <span className="text-slate-600">elims</span></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-slate-600 font-mono italic animate-pulse">Waiting for live data...</div>
                    )}
                </div>
            </div>

            {/* Match Summary Global Stats (New) */}
            <div className="w-full border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl rounded-2xl flex flex-col overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                <div className="p-5 border-b border-slate-800/50 bg-slate-800/20 flex justify-between items-center w-full">
                    <h3 className="font-black text-[#E91E63] uppercase tracking-widest flex items-center gap-2 drop-shadow-[0_0_10px_rgba(233,30,99,0.3)]">
                        <Zap size={18} /> Match Summary
                    </h3>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => {
                                const params = new URLSearchParams();
                                params.set('primary', theme.primary.replace('#', ''));
                                params.set('secondary', theme.secondary.replace('#', ''));
                                window.open(`/overlay/match-summary?${params.toString()}`, '_blank', 'width=1920,height=1080');
                            }}
                            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(244,63,94,0.2)]"
                        >
                            Gen Full Overlay
                        </button>
                        <button 
                            onClick={() => {
                                const params = new URLSearchParams();
                                params.set('transparent', 'true');
                                params.set('primary', theme.primary.replace('#', ''));
                                params.set('secondary', theme.secondary.replace('#', ''));
                                window.open(`/overlay/match-summary?${params.toString()}`, '_blank', 'width=1920,height=1080');
                            }}
                            className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                        >
                            Gen Transparent Overlay
                        </button>
                        <button
                            onClick={() => window.open(`/overlay-studio?type=match-summary`, '_blank')}
                            className="bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                            title="Quick color and toggle customization (Free)"
                        >
                            Edit Overlay
                        </button>
                        <button
                            onClick={() => window.open(`/overlay/match-summary?edit=true`, '_blank')}
                            className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(59,130,246,0.25)] flex items-center gap-1.5"
                            title="Drag & drop layout editor (Premium)"
                        >
                            <Layers size={11} />
                            Edit Layout
                        </button>
                        <button
                            onClick={() => {
                                const params = new URLSearchParams();
                                params.set('dataOnly', 'true');
                                params.set('primary', theme.primary.replace('#', ''));
                                params.set('secondary', theme.secondary.replace('#', ''));
                                window.open(`/overlay/match-summary?${params.toString()}`, '_blank', 'width=1920,height=1080');
                            }}
                            className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                        >
                            Gen Data-Only Overlay
                        </button>
                    </div>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        {[
                            { title: "Total Kills", value: matchSummaryStats.totalKills, img: eliminationsImg, color: "text-rose-500" },
                            { title: "Total Knocks", value: matchSummaryStats.totalKnocks, img: panImg, color: "text-rose-500" },
                            { title: "Total Headshots", value: matchSummaryStats.totalHeadshots, img: headshotsImg, color: "text-rose-500" },
                            { title: "Smokes & Nades", value: matchSummaryStats.smokesAndNades, img: smokesImg, color: "text-rose-500" },
                            { title: "Vehicle Kills", value: matchSummaryStats.vehicleKills, img: uazImg, color: "text-rose-500" },
                            { title: "Grenade Kills", value: matchSummaryStats.grenadeKills, img: grenadeImg, color: "text-rose-500" },
                            { title: "Airdrop Looted", value: matchSummaryStats.airdropLooted, img: airdropImg, color: "text-rose-500" },
                        ].map((card, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex flex-col h-full shadow-2xl overflow-hidden group hover:-translate-y-2 transition-transform duration-300"
                            >
                                <div className="flex-1 bg-white/10 backdrop-blur-md p-4 flex items-center justify-center relative overflow-hidden min-h-[120px]">
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20"></div>
                                    <img 
                                        src={card.img.src} 
                                        className="h-14 w-auto object-contain drop-shadow-[0_0_15px_rgba(244,63,94,0.6)] relative z-10 group-hover:scale-110 transition-transform" 
                                        alt=""
                                    />
                                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <img src={card.img.src} className="h-32 w-auto object-contain" alt="" />
                                    </div>
                                </div>
                                <div className="bg-[#E91E63] py-2 px-1 text-center border-b border-black/20">
                                    <span className="text-[11px] font-black text-white uppercase tracking-tighter">
                                        {card.title}
                                    </span>
                                </div>
                                <div className="bg-[#A3E635] py-4 text-center">
                                    <span className="text-5xl font-black text-[#E91E63] italic leading-none block drop-shadow-sm">
                                        {String(card.value).padStart(3, '0')}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-8 relative z-10">
                {/* Elimination Overlays (merged — all 5 types) */}
                <div className="w-full border border-pink-500/30 bg-slate-900/40 backdrop-blur-xl rounded-2xl flex flex-col overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                    <div className="p-5 border-b border-slate-800/50 bg-slate-800/20">
                        <h3 className="font-black text-pink-400 uppercase tracking-widest flex items-center gap-2 drop-shadow-[0_0_10px_rgba(236,72,153,0.3)]">
                            <Flame size={18} /> Elimination Overlays
                        </h3>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                            Event-triggered overlays with drag-and-drop customization
                        </p>
                    </div>

                    {/* All 5 overlay types in a compact grid */}
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[
                            { id: 'grenade-kill',      label: 'Grenade Kill',      sub: 'Grenade Elimination',  path: '/overlays/grenade-kill',      hasLayout: true },
                            { id: 'vehicle-kill',      label: 'Vehicle Kill',      sub: 'Vehicle Elimination',  path: '/overlays/vehicle-kill',      hasLayout: true },
                            { id: 'drop-looted',       label: 'Drop Looted',       sub: 'Airdrop Looted',       path: '/overlays/drop-looted',       hasLayout: true },
                            { id: 'player-domination', label: 'Player Domination', sub: 'Player Domination',    path: '/overlays/player-domination', hasLayout: true },
                            { id: 'first-blood',       label: 'First Blood',       sub: 'First Blood',          path: '/overlays/first-blood',       hasLayout: true },
                            { id: 'recall',            label: 'Player Recall',     sub: 'Back In Action',       path: '/overlays/recall',            hasLayout: true },
                            { id: 'team-eliminated',   label: 'Team Eliminated',   sub: 'Team Wiped Out',       path: '/overlays/team-eliminated',   hasLayout: true },
                            { id: 'team-domination',   label: 'Team Domination',   sub: '5+ Kills Milestone',   path: '/overlays/team-domination',   hasLayout: true },
                        ].map(o => (
                            <div
                                key={o.id}
                                className="group flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800/60 hover:border-pink-500/40 transition-all"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black text-white uppercase tracking-wider truncate">{o.label}</p>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate">{o.sub}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        onClick={() => window.open(`/overlay-studio?type=${o.id}`, '_blank')}
                                        className="px-2.5 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 text-[8px] font-black uppercase tracking-widest transition-all"
                                        title="Quick color customization (Free)"
                                    >
                                        Edit Overlay
                                    </button>
                                    {o.hasLayout && (
                                    <button
                                        onClick={() => window.open(`${o.path}?edit=true`, '_blank')}
                                        className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-1"
                                        title="Drag & drop layout editor (Premium)"
                                    >
                                        <Layers size={10} />
                                        Edit Layout
                                    </button>
                                    )}
                                    <button
                                        onClick={() => window.open(o.path, '_blank')}
                                        className="px-2.5 py-1.5 rounded-lg bg-lime-500/10 hover:bg-lime-500/20 text-lime-400 border border-lime-500/30 text-[8px] font-black uppercase tracking-widest transition-all"
                                        title="Open Overlay URL"
                                    >
                                        Open
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Match MVP Section */}
                    <div className="px-5 pb-5 pt-0">
                        <div className="border-t border-slate-800/50 pt-4">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-[11px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                                    <Crown size={14} /> Match MVP Overlays
                                </h4>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => window.open(`/overlay-studio?type=match-mvp`, '_blank')}
                                        className="px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 text-[9px] font-black uppercase tracking-widest transition-all"
                                    >
                                        Edit Overlay
                                    </button>
                                    <button
                                        onClick={() => window.open(`/overlays/match-mvp?edit=true`, '_blank')}
                                        className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1"
                                    >
                                        <Layers size={10} /> Edit Layout
                                    </button>
                                    <button
                                        onClick={() => window.open(`/overlays/match-mvp`, '_blank')}
                                        className="px-3 py-1.5 rounded-lg bg-lime-500/10 hover:bg-lime-500/20 text-lime-400 border border-lime-500/30 text-[9px] font-black uppercase tracking-widest transition-all"
                                    >
                                        Open
                                    </button>
                                </div>
                            </div>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                                Feature the best performing player of the match with premium graphics
                            </p>
                        </div>
                    </div>

                    {/* Grenade kill live triggers (players with nade kills) */}
                    {(() => {
                        const nadeKillers = players
                            .filter(p => (p.killNumByGrenade || 0) > 0)
                            .sort((a, b) => (b.killNumByGrenade || 0) - (a.killNumByGrenade || 0));

                        if (nadeKillers.length === 0) return null;

                        return (
                            <div className="px-5 pb-5 pt-0">
                                <div className="border-t border-slate-800/50 pt-4">
                                    <p className="text-[9px] font-black text-lime-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                        <Bomb size={10} /> Live Grenade Kill Triggers
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {nadeKillers.map(p => (
                                            <div
                                                key={p.playerKey}
                                                className="group flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 hover:border-lime-500/40 transition-all"
                                            >
                                                <div className="relative w-10 h-10 shrink-0 rounded-lg bg-slate-800/60 border border-slate-700/60 overflow-hidden">
                                                    <img
                                                        src={p.photoUrl || `${API_URL}/images/${p.playerKey}.png`}
                                                        alt={p.name}
                                                        className="w-full h-full object-cover"
                                                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-black text-white uppercase tracking-wider truncate">{p.name || 'Unknown'}</p>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <Bomb size={9} className="text-lime-400" />
                                                        <span className="text-[8px] font-black text-lime-400 tracking-wider">{p.killNumByGrenade} NADE KILL{p.killNumByGrenade !== 1 ? 'S' : ''}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const res = await fetch(`${API_URL}/api/graphics/command`, {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    layer: 23,
                                                                    templateUrl: '/overlays/grenade-kill',
                                                                    action: 'PLAY',
                                                                    data: {
                                                                        playerKey: p.playerKey,
                                                                        name: p.name || 'UNKNOWN',
                                                                        teamName: p.teamName,
                                                                        teamId: p.teamId,
                                                                        photoUrl: p.photoUrl,
                                                                        logoUrl: p.logoUrl,
                                                                        teamTag: p.teamName?.substring(0, 3).toUpperCase(),
                                                                    },
                                                                }),
                                                            });
                                                            if (res.ok) showNotification(`Triggered grenade overlay for ${p.name}`, 'success');
                                                            else showNotification('Trigger failed', 'error');
                                                        } catch { showNotification('Backend not reachable', 'error'); }
                                                    }}
                                                    className="shrink-0 px-2.5 py-1.5 rounded-lg bg-lime-500/15 hover:bg-lime-500 text-lime-400 hover:text-white border border-lime-500/40 font-black text-[8px] uppercase tracking-widest transition-all flex items-center gap-1"
                                                >
                                                    <Bomb size={9} /> Trigger
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Damage Leaders Widget */}
                <div className="w-full border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl rounded-2xl flex flex-col overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                    <div className="p-5 border-b border-slate-800/50 bg-slate-800/20 flex justify-between items-center w-full">
                        <h3 className="font-black text-rose-500 uppercase tracking-widest flex items-center gap-2 drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                            <Crosshair size={18} /> Match Fraggers
                        </h3>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    const params = new URLSearchParams();
                                    params.set('primary', theme.primary.replace('#', ''));
                                    params.set('secondary', theme.secondary.replace('#', ''));
                                    window.open(`/overlay/match-fraggers?${params.toString()}`, '_blank', 'width=1920,height=1080');
                                }}
                                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(244,63,94,0.2)]"
                            >
                                Gen Full Overlay
                            </button>
                            <button 
                                onClick={() => {
                                    const params = new URLSearchParams();
                                    params.set('transparent', 'true');
                                    params.set('primary', theme.primary.replace('#', ''));
                                    params.set('secondary', theme.secondary.replace('#', ''));
                                    window.open(`/overlay/match-fraggers?${params.toString()}`, '_blank', 'width=1920,height=1080');
                                }}
                                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                            >
                                Gen Transparent Overlay
                            </button>
                            <button
                                onClick={() => window.open(`/overlay-studio?type=match-fraggers`, '_blank')}
                                className="bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                                title="Quick color and toggle customization (Free)"
                            >
                                Edit Overlay
                            </button>
                            <button
                                onClick={() => {
                                    // Detect current design style and open the right editor
                                    let design = 'classic';
                                    try {
                                        const saved = localStorage.getItem('strymx_overlay_configs');
                                        if (saved) {
                                            const parsed = JSON.parse(saved);
                                            if (parsed['match-fraggers']?.designStyle === 'cards') design = 'cards';
                                        }
                                    } catch {}
                                    window.open(`/overlay/match-fraggers?edit=true&design=${design}`, '_blank');
                                }}
                                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(59,130,246,0.25)] flex items-center gap-1.5"
                                title="Drag & drop layout editor (Premium)"
                            >
                                <Layers size={11} />
                                Edit Layout
                            </button>
                            <button
                                onClick={() => {
                                    const params = new URLSearchParams();
                                    params.set('dataOnly', 'true');
                                    params.set('primary', theme.primary.replace('#', ''));
                                    params.set('secondary', theme.secondary.replace('#', ''));
                                    window.open(`/overlay/match-fraggers?${params.toString()}`, '_blank', 'width=1920,height=1080');
                                }}
                                className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                            >
                                Gen Data-Only Overlay
                            </button>
                        </div>
                    </div>

                    <div className="p-4 flex flex-wrap gap-4">
                        <AnimatePresence>
                            {topDamageLeaders.length === 0 && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-slate-500 font-mono py-12 italic text-sm">Waiting for telemetry...</motion.div>
                            )}
                            {topDamageLeaders.map((player, idx) => (
                                <motion.div
                                    key={player.playerKey}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="flex-1 min-w-[380px] max-w-full bg-slate-950/60 rounded-xl p-5 flex items-center gap-5 hover:bg-slate-900/80 transition-all border border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.3)] group"
                                >
                                    <div className="w-8 text-center font-black text-slate-700 group-hover:text-rose-500/70 transition-colors text-xl">#{idx + 1}</div>
                                    <div className="relative shrink-0">
                                        <img
                                            src={`${API_URL}/images/${player.playerKey}.png`}
                                            onError={(e) => { e.currentTarget.src = `${API_URL}/images/default.png`; e.currentTarget.onerror = null; }}
                                            alt=""
                                            className="w-16 h-16 rounded-full object-cover border-2 border-slate-700 shadow-lg group-hover:border-rose-500 transition-colors"
                                        />
                                        {player.logoUrl && (
                                            <img src={player.logoUrl} className="absolute -bottom-1 -right-1 w-6 h-6 object-contain bg-slate-900 rounded-full border border-slate-700 p-1 shadow-md" alt="" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className="font-black text-white truncate group-hover:text-rose-400 transition-colors uppercase tracking-tight text-xl leading-none mb-1">{player.name}</div>
                                        <div className="text-xs text-slate-500 font-bold tracking-[0.1em] truncate uppercase">{player.teamName.replace(/^scout\s+/i, '')}</div>
                                    </div>
                                    <div className="text-right whitespace-nowrap shrink-0 border-l border-slate-800/80 pl-5">
                                        <div className="text-2xl font-black text-amber-500 drop-shadow-sm leading-none">{Math.round(player.damage)} <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest block mt-1">DAMAGE</span></div>
                                        <div className="flex items-center justify-end gap-3 mt-2">
                                            <div className="text-xs font-black tracking-widest text-rose-500 uppercase">{player.killNum} KILLS</div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Match Top Fragger Widget (New) */}
                <div className="w-full border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl rounded-2xl flex flex-col overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                    <div className="p-5 border-b border-slate-800/50 bg-slate-800/20 flex justify-between items-center w-full">
                        <h3 className="font-black text-rose-500 uppercase tracking-widest flex items-center gap-2 drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                            <Crosshair size={18} /> Match Top Fragger
                        </h3>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    const params = new URLSearchParams();
                                    params.set('primary', theme.primary.replace('#', ''));
                                    params.set('secondary', theme.secondary.replace('#', ''));
                                    window.open(`/overlay/match-top-fragger?${params.toString()}`, '_blank', 'width=1920,height=1080');
                                }}
                                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(244,63,94,0.2)]"
                            >
                                Gen Full Overlay
                            </button>
                            <button 
                                onClick={() => {
                                    const params = new URLSearchParams();
                                    params.set('transparent', 'true');
                                    params.set('primary', theme.primary.replace('#', ''));
                                    params.set('secondary', theme.secondary.replace('#', ''));
                                    window.open(`/overlay/match-top-fragger?${params.toString()}`, '_blank', 'width=1920,height=1080');
                                }}
                                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                            >
                                Gen Transparent Overlay
                            </button>
                            <button
                                onClick={() => window.open(`/overlay-studio?type=match-top-fragger`, '_blank')}
                                className="bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                                title="Quick color and toggle customization (Free)"
                            >
                                Edit Overlay
                            </button>
                            <button
                                onClick={() => window.open(`/overlay/match-top-fragger?edit=true`, '_blank')}
                                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(59,130,246,0.25)] flex items-center gap-1.5"
                                title="Drag & drop layout editor (Premium)"
                            >
                                <Layers size={11} />
                                Edit Layout
                            </button>
                        </div>
                    </div>
                    <div className="p-4 flex flex-wrap gap-4">
                        <AnimatePresence>
                            {topDamageLeaders.length > 0 && (
                                <motion.div
                                    key={topDamageLeaders[0].playerKey}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex-1 min-w-[380px] max-w-full bg-slate-950/60 rounded-xl p-5 flex items-center gap-5 hover:bg-slate-900/80 transition-all border border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.3)] group"
                                >
                                    <div className="w-8 text-center font-black text-rose-500/70 text-xl">#1</div>
                                    <div className="relative shrink-0">
                                        <img
                                            src={`${API_URL}/images/${topDamageLeaders[0].playerKey}.png`}
                                            onError={(e) => { e.currentTarget.src = `${API_URL}/images/default.png`; e.currentTarget.onerror = null; }}
                                            alt=""
                                            className="w-16 h-16 rounded-full object-cover border-2 border-rose-500 shadow-lg"
                                        />
                                        {topDamageLeaders[0].logoUrl && (
                                            <img src={topDamageLeaders[0].logoUrl} className="absolute -bottom-1 -right-1 w-6 h-6 object-contain bg-slate-900 rounded-full border border-slate-700 p-1 shadow-md" alt="" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className="font-black text-rose-400 uppercase tracking-tight text-xl leading-none mb-1">{topDamageLeaders[0].name}</div>
                                        <div className="text-xs text-slate-500 font-bold tracking-[0.1em] truncate uppercase">{topDamageLeaders[0].teamName.replace(/^scout\s+/i, '')}</div>
                                    </div>
                                    <div className="text-right whitespace-nowrap shrink-0 border-l border-slate-800/80 pl-5">
                                        <div className="text-2xl font-black text-amber-500 drop-shadow-sm leading-none">{Math.round(topDamageLeaders[0].damage)} <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest block mt-1">DAMAGE</span></div>
                                        <div className="flex items-center justify-end gap-3 mt-2">
                                            <div className="text-xs font-black tracking-widest text-rose-500 uppercase">{topDamageLeaders[0].killNum} KILLS</div>
                                            <div className="text-xs font-black tracking-widest text-emerald-500 uppercase">
                                                {topDamageLeaders[0].survivalTime ? `${Math.floor(topDamageLeaders[0].survivalTime / 60)}:${String(Math.round(topDamageLeaders[0].survivalTime % 60)).padStart(2, '0')}` : '00:00'} SURVIVAL
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Overall MVP List Widget */}
                <div className="w-full border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl rounded-2xl flex flex-col overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                    <div className="p-5 border-b border-slate-800/50 bg-slate-800/20 flex justify-between items-center w-full">
                        <h3 className="font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                            <Trophy size={18} /> Overall MVP List (Top 5)
                        </h3>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    const params = new URLSearchParams();
                                    params.set('primary', theme.primary.replace('#', ''));
                                    params.set('secondary', theme.secondary.replace('#', ''));
                                    window.open(`/overlay/overall-mvp?${params.toString()}`, '_blank', 'width=1920,height=1080');
                                }}
                                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                            >
                                Gen Full Overlay
                            </button>
                            <button 
                                onClick={() => {
                                    const params = new URLSearchParams();
                                    params.set('transparent', 'true');
                                    params.set('primary', theme.primary.replace('#', ''));
                                    params.set('secondary', theme.secondary.replace('#', ''));
                                    window.open(`/overlay/overall-mvp?${params.toString()}`, '_blank', 'width=1920,height=1080');
                                }}
                                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                            >
                                Gen Transparent Overlay
                            </button>
                            <button
                                onClick={() => window.open(`/overlay-studio?type=overall-mvp`, '_blank')}
                                className="bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                                title="Quick color and toggle customization (Free)"
                            >
                                Edit Overlay
                            </button>
                            <button
                                onClick={() => {
                                    let design = 'classic';
                                    try {
                                        const saved = localStorage.getItem('strymx_overlay_configs');
                                        if (saved) { const p = JSON.parse(saved); if (p['overall-mvp']?.designStyle === 'cards') design = 'cards'; }
                                    } catch {}
                                    window.open(`/overlay/overall-mvp?edit=true&design=${design}`, '_blank');
                                }}
                                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(59,130,246,0.25)] flex items-center gap-1.5"
                                title="Drag & drop layout editor (Premium)"
                            >
                                <Layers size={11} />
                                Edit Layout
                            </button>
                            <button
                                onClick={() => {
                                    const params = new URLSearchParams();
                                    params.set('dataOnly', 'true');
                                    params.set('primary', theme.primary.replace('#', ''));
                                    params.set('secondary', theme.secondary.replace('#', ''));
                                    window.open(`/overlay/overall-mvp?${params.toString()}`, '_blank', 'width=1920,height=1080');
                                }}
                                className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                            >
                                Gen Data-Only Overlay
                            </button>
                        </div>
                    </div>

                    <div className="p-4 flex flex-wrap gap-4">
                        <AnimatePresence>
                            {topMvpPlayers.length === 0 && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-slate-500 font-mono py-12 italic text-sm">Waiting for telemetry...</motion.div>
                            )}
                            {topMvpPlayers.map((player, idx) => (
                                <motion.div
                                    key={player.playerKey}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="flex-1 min-w-[380px] max-w-full bg-slate-950/60 rounded-xl p-5 flex items-center gap-5 hover:bg-slate-900/80 transition-all border border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.3)] group"
                                >
                                    <div className="w-8 text-center font-black text-slate-700 group-hover:text-emerald-500/70 transition-colors text-xl">#{idx + 1}</div>
                                    <div className="relative shrink-0">
                                        <img
                                            src={`${API_URL}/images/${player.playerKey}.png`}
                                            onError={(e) => { e.currentTarget.src = `${API_URL}/images/default.png`; e.currentTarget.onerror = null; }}
                                            alt=""
                                            className="w-16 h-16 rounded-full object-cover border-2 border-slate-700 shadow-lg group-hover:border-emerald-500 transition-colors"
                                        />
                                        {player.logoUrl && (
                                            <img src={player.logoUrl} className="absolute -bottom-1 -right-1 w-6 h-6 object-contain bg-slate-900 rounded-full border border-slate-700 p-1 shadow-md" alt="" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className="font-black text-white truncate group-hover:text-emerald-400 transition-colors uppercase tracking-tight text-xl leading-none mb-1">{player.name}</div>
                                        <div className="text-xs text-slate-500 font-bold tracking-[0.1em] truncate uppercase">{player.teamName.replace(/^scout\s+/i, '')}</div>
                                    </div>
                                    <div className="text-right whitespace-nowrap shrink-0 border-l border-slate-800/80 pl-5">
                                        <div className="text-2xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.4)] leading-none">{player.mvpScore?.toFixed(1)} <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest block mt-1">RATING</span></div>
                                        <div className="flex items-center justify-end gap-3 mt-2">
                                            <div className="text-xs font-black tracking-widest text-emerald-500 uppercase">{player.killNum} ELIMS</div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* WWCD Team Stats Widget */}
                <div className="w-full border border-slate-800/60 bg-slate-900/40 backdrop-blur-xl rounded-2xl flex flex-col overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                    <div className="p-5 border-b border-slate-800/50 bg-slate-800/20 flex justify-between items-center w-full">
                        <div className="flex items-center gap-4">
                            <h3 className="font-black text-amber-500 uppercase tracking-widest flex items-center gap-2 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                                <Crown size={18} /> Top Team Stats (WWCD)
                            </h3>
                            {wwcdTeamName && (
                                <div className="flex items-center gap-3 bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/30">
                                    {wwcdTeamLogo && <img src={wwcdTeamLogo} className="w-6 h-6 object-contain mix-blend-screen" alt="Team Logo" />}
                                    <span className="font-bold text-amber-400 uppercase tracking-widest text-sm">{wwcdTeamName}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    const params = new URLSearchParams();
                                    params.set('primary', theme.primary.replace('#', ''));
                                    params.set('secondary', theme.secondary.replace('#', ''));
                                    window.open(`/overlay/wwcd-stats?${params.toString()}`, '_blank', 'width=1920,height=1080');
                                }}
                                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                            >
                                Gen Full Overlay
                            </button>
                            <button 
                                onClick={() => {
                                    const params = new URLSearchParams();
                                    params.set('transparent', 'true');
                                    params.set('primary', theme.primary.replace('#', ''));
                                    params.set('secondary', theme.secondary.replace('#', ''));
                                    window.open(`/overlay/wwcd-stats?${params.toString()}`, '_blank', 'width=1920,height=1080');
                                }}
                                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                            >
                                Gen Transparent Overlay
                            </button>
                            <button
                                onClick={() => window.open(`/overlay-studio?type=wwcd-stats`, '_blank')}
                                className="bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                                title="Quick color and toggle customization (Free)"
                            >
                                Edit Overlay
                            </button>
                            <button
                                onClick={() => window.open(`/overlay/wwcd-stats?edit=true`, '_blank')}
                                className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(59,130,246,0.25)] flex items-center gap-1.5"
                                title="Drag & drop layout editor (Premium)"
                            >
                                <Layers size={11} />
                                Edit Layout
                            </button>
                        </div>
                    </div>

                    <div className="p-4 flex flex-wrap gap-4">
                        <AnimatePresence>
                            {displayWwcdPlayers.length === 0 && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-slate-500 font-mono py-12 italic text-sm w-full">Waiting for team telemetry...</motion.div>
                            )}
                            {displayWwcdPlayers.map((player, idx) => (
                                <motion.div
                                    key={player.playerKey || idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="flex-1 min-w-[280px] max-w-full bg-slate-950/40 rounded-xl p-4 flex items-center gap-4 hover:bg-slate-800/60 transition-colors border border-slate-800/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full pointer-events-none group-hover:bg-amber-500/10 transition-colors"></div>
                                    <div className="relative z-10">
                                        <img
                                            src={`${API_URL}/images/${player.playerKey}.png`}
                                            onError={(e) => { e.currentTarget.src = `${API_URL}/images/default.png`; e.currentTarget.onerror = null; }}
                                            alt=""
                                            className="w-14 h-14 rounded-full object-cover border-2 border-slate-700/50 shadow-md group-hover:border-amber-500/50 transition-colors bg-slate-800"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0 pr-4 z-10">
                                        <div className="font-black text-slate-100 truncate group-hover:text-amber-400 transition-colors uppercase tracking-tight text-xl leading-tight">{player.name}</div>
                                        <div className="text-[10px] text-slate-500 font-black tracking-[0.2em] truncate uppercase mb-1">{player.teamName.replace(/^scout\s+/i, '')}</div>
                                        <div className="flex gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black leading-none mb-0.5">Elims</span>
                                                <span className="text-sm text-slate-200 font-bold font-mono">{player.killNum}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black leading-none mb-0.5">Damage</span>
                                                <span className="text-sm text-slate-200 font-bold font-mono">{Math.round(player.damage)}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black leading-none mb-0.5">Survival</span>
                                                <span className="text-sm text-slate-200 font-bold font-mono">
                                                    {player.survivalTime ? `${Math.floor(player.survivalTime / 60)}:${String(Math.round(player.survivalTime % 60)).padStart(2, '0')}` : '00:00'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                </div>

            </div>
            </div>

            {/* HEAD TO HEAD Section (New) */}
            {headToHeadPlayers.length >= 2 && (
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mt-24 mb-32 flex flex-col items-center w-full px-4"
                >
                    <h2 className="text-8xl font-black text-[#E91E63] italic tracking-tighter uppercase mb-6 drop-shadow-[0_4px_10px_rgba(233,30,99,0.2)]">
                        HEAD TO HEAD
                    </h2>

                    {/* Design Style Toggle */}
                    <H2HDesignToggle />

                    <div className="flex gap-4 mb-16 mt-4">
                        <button
                            onClick={() => {
                                const params = new URLSearchParams();
                                params.set('primary', theme.primary.replace('#', ''));
                                params.set('secondary', theme.secondary.replace('#', ''));
                                window.open(`/overlay/head-to-head?${params.toString()}`, '_blank', 'width=1920,height=1080');
                            }}
                            className="bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 border border-pink-500/50 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-colors shadow-[0_4px_20px_rgba(233,30,99,0.3)] hover:-translate-y-1"
                        >
                            Gen Full Overlay
                        </button>
                        <button
                            onClick={() => {
                                const params = new URLSearchParams();
                                params.set('transparent', 'true');
                                params.set('primary', theme.primary.replace('#', ''));
                                params.set('secondary', theme.secondary.replace('#', ''));
                                window.open(`/overlay/head-to-head?${params.toString()}`, '_blank', 'width=1920,height=1080');
                            }}
                            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/50 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-colors shadow-[0_4px_20px_rgba(59,130,246,0.3)] hover:-translate-y-1"
                        >
                            Gen Transparent Overlay
                        </button>
                        <button
                            onClick={() => window.open(`/overlay-studio?type=head-to-head`, '_blank')}
                            className="bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 border border-violet-500/50 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-colors shadow-[0_4px_20px_rgba(139,92,246,0.3)] hover:-translate-y-1"
                            title="Quick color and toggle customization (Free)"
                        >
                            Edit Overlay
                        </button>
                        <button
                            onClick={() => window.open(`/overlay/head-to-head?edit=true`, '_blank')}
                            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/50 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-colors shadow-[0_4px_20px_rgba(59,130,246,0.3)] hover:-translate-y-1 flex items-center gap-2"
                            title="Drag & drop layout editor (Premium)"
                        >
                            <Layers size={14} />
                            Edit Layout
                        </button>
                    </div>
                    
                    <div className="flex w-full max-w-7xl gap-0 items-center justify-between">
                        {/* Player 1 Info & Photo */}
                        <motion.div 
                            initial={{ x: -50, opacity: 0 }}
                            whileInView={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-col items-center text-center w-64 pt-8"
                        >
                            <div className="relative mb-6 flex justify-center">
                                <img 
                                    src={`${API_URL}/images/${headToHeadPlayers[0].playerKey}.png`} 
                                    onError={(e) => { e.currentTarget.src = `${API_URL}/images/default.png`; e.currentTarget.onerror = null; }}
                                    className="h-[400px] w-auto object-contain relative z-10 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]" 
                                    alt="" 
                                />
                            </div>
                            <div className="text-4xl font-black text-white uppercase tracking-tighter mb-1 drop-shadow-md">{headToHeadPlayers[0].name}</div>
                            <div className="text-sm font-black text-[#A3E635] uppercase tracking-[0.3em]">{headToHeadPlayers[0].teamName.replace(/^scout\s+/i, '')}</div>
                        </motion.div>

                        {/* Comparison Stats */}
                        <div className="flex flex-col gap-3 flex-1 max-w-3xl px-12">
                            {headToHeadMetrics.map((m: any, idx) => (
                                <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="flex h-16 w-full relative group cursor-default"
                                >
                                    {/* Left Value */}
                                    <div 
                                        className="w-32 bg-[#E91E63] flex items-center justify-center relative overflow-hidden" 
                                        style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)' }}
                                    >
                                        <span className="text-3xl font-black text-white italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                                            {m.format(headToHeadPlayers[0][m.key as keyof PlayerStat])}
                                        </span>
                                    </div>
                                    
                                    {/* Center Label */}
                                    <div 
                                        className="flex-1 bg-[#A3E635] flex items-center justify-center relative overflow-hidden mx-[-10px] z-10"
                                        style={{ clipPath: 'polygon(5% 0, 95% 0, 100% 100%, 0 100%)' }}
                                    >
                                        <div className="absolute inset-0 opacity-10 pointer-events-none group-hover:opacity-30 transition-opacity">
                                            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                                                <pattern id={`waves-${idx}`} width="60" height="30" patternUnits="userSpaceOnUse">
                                                    <path d="M0 15 Q15 0 30 15 T60 15" fill="none" stroke="#E91E63" strokeWidth="3" />
                                                </pattern>
                                                <rect width="100%" height="100%" fill={`url(#waves-${idx})`} />
                                            </svg>
                                        </div>
                                        <span className="text-2xl font-black text-[#E91E63] uppercase italic relative z-20 tracking-tighter drop-shadow-sm">
                                            {m.label}
                                        </span>
                                    </div>
                                    
                                    {/* Right Value */}
                                    <div 
                                        className="w-32 bg-[#E91E63] flex items-center justify-center relative overflow-hidden"
                                        style={{ clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0 100%)' }}
                                    >
                                        <span className="text-3xl font-black text-white italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                                            {m.format(headToHeadPlayers[1][m.key as keyof PlayerStat])}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Player 2 Info & Photo */}
                        <motion.div 
                            initial={{ x: 50, opacity: 0 }}
                            whileInView={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-col items-center text-center w-64 pt-8"
                        >
                            <div className="relative mb-6 flex justify-center">
                                <img 
                                    src={`${API_URL}/images/${headToHeadPlayers[1].playerKey}.png`} 
                                    onError={(e) => { 
                                        e.currentTarget.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='; 
                                        e.currentTarget.onerror = null; 
                                    }}
                                    className="h-[400px] w-auto object-contain relative z-10 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]" 
                                    alt="" 
                                />
                            </div>
                            <div className="text-4xl font-black text-white uppercase tracking-tighter mb-1 drop-shadow-md">{headToHeadPlayers[1].name}</div>
                            <div className="text-sm font-black text-[#A3E635] uppercase tracking-[0.3em]">{headToHeadPlayers[1].teamName.replace(/^scout\s+/i, '')}</div>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </motion.div>

        <ConfirmationModal
            isOpen={isResetModalOpen}
            onClose={() => setIsResetModalOpen(false)}
            onConfirm={handleResetMatch}
            title="Reset For New Match?"
            message="This will clear the live match tracker and scoring state so overlays start fresh for the next game. Use this after every match before the new lobby begins. This action cannot be undone."
            confirmText="Reset Now"
            type="danger"
        />

    {/* BACKUP MODE SHEET URL SETUP MODAL — portal to document.body to escape overflow/transform traps */}
    {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
            {showBackupSetup && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                >
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowBackupSetup(false)} />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
                    >
                        <h3 className="text-lg font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                            <Shield className="text-amber-400" size={20} />
                            Setup Backup Mode
                        </h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                            Paste a published Google Sheet CSV URL to use as backup data source
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                                    Google Sheet URL (Publish to Web → CSV)
                                </label>
                                <input
                                    type="text"
                                    value={backupSheetUrl}
                                    onChange={e => setBackupSheetUrl(e.target.value)}
                                    placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                                    className="w-full px-4 py-2.5 text-[11px] font-bold text-white bg-slate-950/60 border border-slate-700/50 rounded-xl focus:outline-none focus:border-amber-500/50 placeholder:text-slate-600"
                                />
                            </div>
                            <div className="bg-slate-950/40 border border-slate-800/50 rounded-xl p-3">
                                <p className="text-[9px] text-slate-500 font-bold leading-relaxed">
                                    This uses the <span className="text-blue-400">Publish to Web</span> CSV URL from Google Sheets.
                                    Go to File → Share → Publish to Web → select CSV → copy the URL.
                                    The sheet should have columns: <span className="text-slate-400">name, team, kills</span> (minimum).
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowBackupSetup(false)}
                                    className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleToggleBackup}
                                    disabled={backupLoading || !backupSheetUrl.trim()}
                                    className="flex-1 px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-40"
                                >
                                    {backupLoading ? 'Activating...' : 'Activate Backup Mode'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    )}

    </>
    );
}
