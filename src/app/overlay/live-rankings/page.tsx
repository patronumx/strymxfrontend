"use client"
import { API_URL } from '@/lib/api-config';
import React, { useEffect, useState, Suspense } from 'react';
import { io } from 'socket.io-client';
import { useSearchParams } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { type LiveRankingsConfig, defaultLiveRankingsConfig } from '@/context/OverlayConfigContext';
import LiveRankingsGraphicV2 from '@/components/ui/LiveRankingsGraphicV2';

export function LiveRankingsClassic({ designerMode = false }: { designerMode?: boolean }) {
    const { isTransparent: themeTransparent, isDataOnly: themeDataOnly, theme } = useTheme();
    const searchParams = useSearchParams();
    const isDataOnly = themeDataOnly || searchParams.get('dataOnly') === 'true';
    const isTransparent = themeTransparent || searchParams.get('transparent') === 'true';
    const [fetchedData, setFetchedData] = useState<any[]>([]);
    const [config, setConfig] = useState<LiveRankingsConfig>(defaultLiveRankingsConfig);

    // Load config from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('strymx_overlay_configs');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed['live-rankings']) {
                    setConfig(prev => ({ ...prev, ...parsed['live-rankings'] }));
                }
            } catch (e) {
                console.error('Failed to parse overlay configs', e);
            }
        }
    }, []);

    // Listen for live config updates from studio via postMessage
    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data?.type === 'strymx_overlay_config' && e.data.overlayType === 'live-rankings' && e.data.config) {
                setConfig(prev => ({ ...prev, ...e.data.config }));
            }
            if (e.data?.type === 'strymx_batch_update' && e.data.overlayType === 'live-rankings' && e.data.config) {
                setConfig(prev => ({ ...prev, ...e.data.config }));
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const matchId = urlParams.get('matchId') || 'pmtm-s4-match-1';

        // Fetch initial data
        fetch(`${API_URL}/api/match-state/${matchId}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.activePlayers) setFetchedData(data.activePlayers);
            })
            .catch(err => console.warn("Initial fetch error:", err));

        const socket = io(`${API_URL}`);
        socket.on('connect', () => console.log('Live Rankings connected to live data feed'));
        socket.on('match_state_update', (data) => {
            if (data && data.activePlayers) setFetchedData(data.activePlayers);
        });
        return () => { socket.disconnect(); };
    }, []);

    const teamsData = React.useMemo(() => {
        if (!fetchedData || fetchedData.length === 0) return [];
        const teamMap = new Map<string, any>();

        fetchedData.forEach((p: any) => {
            const nameStr = p.playerName || p.PlayerName || '';
            if ((nameStr === '' || nameStr === 'Unknown') && (!p.damage && !p.killNum)) return;

            const tName = p.teamName || p.teamId || 'Unknown';
            if (!teamMap.has(tName)) {
                teamMap.set(tName, { teamName: tName, elims: 0, placePts: 0, totalPts: 0, players: [], logoUrl: p.logoUrl });
            }

            const team = teamMap.get(tName);
            team.players.push(p);
            team.elims += (p.killNum || p.KillNum || 0);
            team.placePts = Math.max(team.placePts, p.placePts || 0);
        });

        const sortedTeams = Array.from(teamMap.values()).map(t => ({
            ...t,
            totalPts: t.elims + t.placePts
        })).sort((a, b) => b.totalPts - a.totalPts);

        return sortedTeams.map((t, index) => ({ ...t, rank: index + 1 }));
    }, [fetchedData]);

    const totalTeamsNeeded = 16;
    const displayTeams = teamsData.length > 0 ? teamsData : Array.from({ length: totalTeamsNeeded }).map((_, i) => ({
        rank: i + 1,
        teamName: i === 0 ? "WAITING" : "TAG",
        placePts: 0,
        elims: 0,
        totalPts: 0,
        logoUrl: undefined,
        players: Array.from({ length: 4 }).map((_, j) => ({
            playerKey: `dummy-${i}-${j}`, name: '-', teamName: '...', killNum: 0, damage: 0, rank: 0, photoUrl: undefined, liveState: j === 2 ? 1 : j === 3 ? 2 : 0
        }))
    }));

    // Pad to needed count
    const fullDisplayTeams = [...displayTeams];
    while (fullDisplayTeams.length < totalTeamsNeeded) {
        const i = fullDisplayTeams.length;
        fullDisplayTeams.push({
            rank: i + 1,
            teamName: `TAG`,
            logoUrl: undefined,
            placePts: 0,
            elims: 0,
            totalPts: 0,
            players: Array.from({ length: 4 }).map((_, j) => ({
                playerKey: `dummy-${i}-${j}`, name: '-', teamName: '...', killNum: 0, damage: 0, rank: 0, photoUrl: undefined, liveState: 0
            }))
        });
    }

    const topTeam = fullDisplayTeams[0];
    const topPlayers = [...(topTeam.players || [])];
    while (topPlayers.length < 4) {
        topPlayers.push({ playerKey: `dummy-top-${topPlayers.length}`, name: '-', teamName: '...', killNum: 0, liveState: 0 });
    }

    // Helper to render health bars
    const renderHealthBars = (players: any[]) => {
        return (
            <div className="flex gap-1 items-center justify-center">
                {players.slice(0, 4).map((p, idx) => {
                    // default to alive (0) if no data
                    const state = p.liveState ?? 0;
                    let bgColor = '#f5eb49'; // Alive (Yellow)
                    if (state === 1) bgColor = '#fd5564'; // Knock (Red/Pink)
                    else if (state === 2) bgColor = '#003b46'; // Elim (Dark blue)

                    return (
                        <div key={idx} className="w-[10px] h-6" style={{ backgroundColor: bgColor }} />
                    );
                })}
            </div>
        );
    };

    return (
        <div className={`w-[1920px] h-[1080px] overflow-hidden relative ${isTransparent ? 'bg-transparent' : 'bg-white/5'} font-sans text-slate-900 border-none`}>
            {isDataOnly && (
                <style dangerouslySetInnerHTML={{ __html: `
                    * {
                        background-color: transparent !important;
                        background-image: none !important;
                        border-color: transparent !important;
                        box-shadow: none !important;
                        backdrop-filter: none !important;
                    }
                `}} />
            )}
            
            {/* Main Widget Container */}
            <div className="absolute top-8 left-8 w-[500px] flex flex-col drop-shadow-2xl">
                
                {/* Hero Showcase (Top Team) */}
                <div className="flex w-full bg-slate-900 border-b-8" style={{ borderBottomColor: config.borderBottomColor }}>
                    {/* Left Info */}
                    <div className="flex-[1.5] flex flex-col p-4 relative" style={{ background: `linear-gradient(110deg, ${config.headerBgStart} 70%, ${config.headerBgEnd} 70%)` }}>
                        {/* Title */}
                        <div className="text-white font-black italic text-2xl uppercase tracking-wider mb-2">
                            {config.headerLabel || "LIVE RANKINGS"}
                        </div>
                        
                        {/* Team Name / Logo */}
                        <div className="flex items-center gap-3 mb-4">
                            {topTeam.logoUrl ? (
                                <img src={topTeam.logoUrl} className="w-12 h-12 object-contain" alt="" />
                            ) : (
                                <div className="text-white">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                            )}
                            <div className="h-8 w-1 bg-white/30" />
                            <div className="text-4xl font-black text-white italic uppercase tracking-tighter">
                                {topTeam.teamName.replace(/^scout\s+/i, '')}
                            </div>
                        </div>

                        {/* Health Bars & Elims */}
                        <div className="flex items-center justify-between mt-auto bg-black/20 p-2">
                            {renderHealthBars(topPlayers)}
                            <div className="text-3xl font-black ml-auto" style={{ color: config.elimsColor }}>
                                {topTeam.elims}
                            </div>
                        </div>
                    </div>

                    {/* Right Portraits */}
                    <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-1 p-1 bg-slate-800">
                        {topPlayers.slice(0, 4).map((p: any, idx: number) => (
                            <div key={idx} className="relative bg-slate-700 overflow-hidden">
                                <img
                                    src={`${API_URL}/images/${p.playerKey}.png`}
                                    onError={(e) => { e.currentTarget.src = `${API_URL}/images/default.png`; }}
                                    className="w-full h-full object-cover object-top opacity-90"
                                    alt=""
                                />
                                {/* Gradient overlay for portrait */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Table Header */}
                <div className="flex items-center px-4 py-2" style={{ backgroundColor: config.borderBottomColor }}>
                    <div className="text-white font-black italic uppercase text-sm tracking-widest w-12" />
                    <div className="text-white font-black italic uppercase text-sm tracking-widest flex-1 text-center pr-4">TEAM</div>
                    <div className="text-white font-black italic uppercase text-sm tracking-widest w-20 text-center">ALIVE</div>
                    <div className="text-white font-black italic uppercase text-sm tracking-widest w-16 text-center">ELIMS</div>
                </div>

                {/* Table Rows (2 to 16) */}
                <div className="flex flex-col bg-slate-900/95 backdrop-blur">
                    {fullDisplayTeams.slice(1, config.teamsShown + 1).map((team: any, idx: number) => {
                        // Alternate row backgrounds slightly using opacity to simulate
                        return (
                            <div key={team.rank} className="flex items-center h-10 border-b border-white/5 relative group" style={{ background: `linear-gradient(110deg, ${config.teamBgColor} 70%, ${config.statsBgColor} 70%)` }}>
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-white transition-opacity pointer-events-none" />
                                
                                {/* Rank */}
                                <div className="w-12 h-full flex items-center justify-center font-black italic text-xl" style={{ backgroundColor: config.borderBottomColor, color: config.rankTextColor }}>
                                    {team.rank}
                                </div>
                                
                                {/* Team */}
                                <div className="flex-1 flex items-center gap-3 px-3 overflow-hidden">
                                    <div className="text-white/50">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <span className="font-black uppercase italic text-lg truncate" style={{ color: config.teamNameColor }}>
                                        {team.teamName.replace(/^scout\s+/i, '')}
                                    </span>
                                </div>
                                
                                {/* Alive */}
                                <div className="w-20 flex items-center justify-center">
                                    {renderHealthBars(team.players)}
                                </div>
                                
                                {/* Elims */}
                                <div className="w-16 h-full flex items-center justify-center font-black italic text-xl" style={{ color: config.elimsColor }}>
                                    {team.elims}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                {config.showLegend && (
                    <div className="flex items-center justify-center gap-6 py-3 font-black uppercase text-sm italic tracking-widest mt-1" style={{ backgroundColor: config.legendBgColor, color: '#000' }}>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-[#f5eb49]" /> ALIVE
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-[#fd5564]" /> KNOCK
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-[#003b46] border border-white/20" /> ELIM
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

type Mode = 'classic' | 'edit' | 'custom-layout';

function LiveRankingsRouter() {
    const [mode, setMode] = useState<Mode | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('edit') === 'true') setMode('edit');
        else if (params.get('layout') === 'custom') setMode('custom-layout');
        else setMode('classic');
    }, []);

    if (mode === null) return null;

    if (mode === 'edit' || mode === 'custom-layout') {
        return <LiveRankingsGraphicV2 />;
    }

    return <LiveRankingsClassic />;
}

export default function LiveRankingsPage() {
    return (
        <Suspense fallback={<div className="bg-transparent w-screen h-screen" />}>
            <LiveRankingsRouter />
        </Suspense>
    );
}
