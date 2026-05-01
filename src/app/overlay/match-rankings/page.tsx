"use client"
import { API_URL } from '@/lib/api-config';
import React, { useEffect, useState, Suspense } from 'react';
import { io } from 'socket.io-client';
import { useSearchParams } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { type RankingsConfig, defaultRankingsConfig } from '@/context/OverlayConfigContext';
import { cn } from '@/lib/utils';

export function MatchRankingsContent({ designerMode = false }: { designerMode?: boolean }) {
    const { isTransparent: themeTransparent, isDataOnly: themeDataOnly } = useTheme();
    const searchParams = useSearchParams();
    const isDataOnly = themeDataOnly || searchParams.get('dataOnly') === 'true';
    const isTransparent = themeTransparent || searchParams.get('transparent') === 'true';
    const [fetchedData, setFetchedData] = useState<any[]>([]);
    const [config, setConfig] = useState<RankingsConfig>(defaultRankingsConfig);

    // Load config from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('strymx_overlay_configs');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed['match-rankings']) {
                    setConfig(prev => ({ ...prev, ...parsed['match-rankings'] }));
                }
            } catch (e) {
                console.error('Failed to parse overlay configs', e);
            }
        }
    }, []);

    // Listen for live config updates from studio via postMessage
    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data?.type === 'strymx_overlay_config' && e.data.overlayType === 'match-rankings' && e.data.config) {
                setConfig(prev => ({ ...prev, ...e.data.config }));
            }
            if (e.data?.type === 'strymx_batch_update' && e.data.overlayType === 'match-rankings' && e.data.config) {
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
        socket.on('connect', () => console.log('OBS Overlay connected to live data feed'));
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
            const tTag = p.teamTag || tName.slice(0, 3).toUpperCase();
            if (!teamMap.has(tName)) {
                teamMap.set(tName, { teamName: tName, teamTag: tTag, elims: 0, placePts: 0, totalPts: 0, players: [], logoUrl: p.logoUrl });
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

    const totalTeamsNeeded = config.teamsShown + 1; // +1 for top team
    const displayTeams = teamsData.length > 0 ? teamsData : Array.from({ length: totalTeamsNeeded }).map((_, i) => ({
        rank: i + 1,
        teamName: i === 0 ? "WAITING FOR DATA" : "...",
        placePts: 0,
        elims: 0,
        totalPts: 0,
        logoUrl: undefined,
        players: Array.from({ length: 4 }).map((_, j) => ({
            playerKey: `dummy-${i}-${j}`, name: '-', teamName: '...', killNum: 0, damage: 0, rank: 0, photoUrl: undefined
        }))
    }));

    // Pad to needed count
    const fullDisplayTeams = [...displayTeams];
    while (fullDisplayTeams.length < totalTeamsNeeded) {
        const i = fullDisplayTeams.length;
        fullDisplayTeams.push({
            rank: i + 1,
            teamName: `Team ${i + 1}`,
            logoUrl: undefined,
            placePts: 0,
            elims: 0,
            totalPts: 0,
            players: Array.from({ length: 4 }).map((_, j) => ({
                playerKey: `dummy-${i}-${j}`, name: '-', teamName: '...', killNum: 0, damage: 0, rank: 0, photoUrl: undefined
            }))
        });
    }

    const topTeam = fullDisplayTeams[0];
    const topPlayers = [...(topTeam.players || [])];
    while (topPlayers.length < config.playerPortraitCount) {
        topPlayers.push({ playerKey: `dummy-top-${topPlayers.length}`, name: '-', teamName: '...', killNum: 0 });
    }

    // Animation helpers
    const getDelay = (base: number, idx: number) => {
        if (config.animationSpeed === 'none') return 0;
        const mult = config.animationSpeed === 'fast' ? 0.5 : config.animationSpeed === 'slow' ? 2 : 1;
        return (base + idx * config.staggerDelay) * mult;
    };
    const getDamping = () => config.animationSpeed === 'fast' ? 35 : config.animationSpeed === 'slow' ? 15 : 25;
    const isAnimated = config.animationSpeed !== 'none';

    // Table teams: split remaining into 2 columns
    const tableTeams = fullDisplayTeams.slice(1, config.teamsShown + 1);
    const halfCount = Math.ceil(tableTeams.length / 2);
    const tableColumns = [tableTeams.slice(0, halfCount), tableTeams.slice(halfCount)];

    // Stat columns for table header
    const statColumns = [
        config.showPlaceColumn && { label: 'Place', key: 'placePts' },
        config.showElimsColumn && { label: 'Elims', key: 'elims' },
        config.showTotalColumn && { label: 'Total', key: 'totalPts' },
    ].filter(Boolean) as { label: string; key: string }[];

    return (
        <div className={`w-[1920px] h-[1080px] overflow-hidden relative ${isTransparent ? 'bg-transparent' : 'bg-white shadow-2xl'} font-sans text-slate-900 border-none`}>
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
                {/* Background Pattern */}
                {!isTransparent && !designerMode && (
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                )}

                {/* Header Section */}
                <div className="absolute" style={{ left: 64, top: 32 }}>
                    <div className="z-30">
                        <h1 className="font-black italic tracking-tighter uppercase leading-none" style={{ fontSize: `${config.headerTitleSize}px` }}>
                            {config.headerTitle.includes(' ') ? (
                                <>
                                    <span style={{ color: config.totalBadgeColor }}>{config.headerTitle.split(' ')[0]}</span>{' '}
                                    <span className="text-slate-800">{config.headerTitle.split(' ').slice(1).join(' ')}</span>
                                </>
                            ) : (
                                <span style={{ color: config.totalBadgeColor }}>{config.headerTitle}</span>
                            )}
                        </h1>
                        <h2 className="text-5xl font-black text-slate-800 tracking-tighter mt-1 uppercase italic opacity-60">
                            {config.headerSubtitle}
                        </h2>
                    </div>
                </div>

                {/* Hero Showcase (Team #1) */}
                {config.showTopTeamShowcase && (
                    <div className="absolute" style={{ left: 64, top: 180, width: 1792 }}>
                        <div className="h-[400px] z-20">
                        <div
                            className="relative w-full h-full bg-white shadow-[0_40px_80px_rgba(0,0,0,0.1)] flex overflow-hidden"
                            style={{
                                borderRadius: `${config.cornerRadius + 22}px`,
                                borderBottom: `16px solid ${config.totalBadgeColor}`,
                            }}
                        >
                            {/* Left Side - Team Info */}
                            <div className={`flex-[1.1] p-8 py-6 flex flex-col justify-between ${isTransparent ? 'bg-transparent' : 'border-r border-slate-100 bg-white'} relative z-20`}>
                                <div className="flex items-center gap-6">
                                    <span className="text-7xl font-black text-slate-800 italic shrink-0">#1</span>
                                    {topTeam.logoUrl && (
                                        <img src={topTeam.logoUrl} className="h-24 w-auto object-contain shrink-0" alt="" />
                                    ) || (
                                        <div className="w-20 h-20 bg-slate-50 rounded-2xl border-2 border-slate-100 flex items-center justify-center text-slate-200 font-black text-xl shrink-0">LOGO</div>
                                    )}
                                    <div className="h-20 w-[4px] rounded-full shrink-0" style={{ backgroundColor: `${config.totalBadgeColor}33` }} />
                                    <div className="flex flex-col flex-1 min-w-0 pr-4">
                                        <h2 className="text-6xl font-black text-slate-800 uppercase tracking-tighter italic leading-none whitespace-normal break-words py-1">
                                            {topTeam.teamTag || topTeam.teamName.replace(/^scout\s+/i, '')}
                                        </h2>
                                    </div>
                                </div>

                                {/* Hero Stats */}
                                <div className="flex gap-4 mt-2">
                                    {config.showPlaceColumn && (
                                        <div className={`flex flex-col items-center flex-1 ${isTransparent ? 'bg-black/5' : 'bg-slate-50/50'} rounded-2xl p-3`}>
                                            <div className="text-[85px] font-black leading-none mb-1" style={{ color: config.totalBadgeColor }}>
                                                {String(topTeam.placePts).padStart(2, '0')}
                                            </div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Place Pts</div>
                                        </div>
                                    )}
                                    {config.showElimsColumn && (
                                        <div className={`flex flex-col items-center flex-1 ${isTransparent ? 'bg-black/5' : 'bg-slate-50/50'} rounded-2xl p-3`}>
                                            <div className="text-[85px] font-black leading-none mb-1" style={{ color: config.totalBadgeColor }}>
                                                {String(topTeam.elims).padStart(2, '0')}
                                            </div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Elims</div>
                                        </div>
                                    )}
                                    {config.showTotalColumn && (
                                        <div className={`flex flex-col items-center flex-1 rounded-2xl p-3`} style={{ backgroundColor: `${config.totalBadgeColor}10`, border: `1px solid ${config.totalBadgeColor}20` }}>
                                            <div className="text-[85px] font-black leading-none mb-1" style={{ color: config.totalBadgeColor }}>
                                                {String(topTeam.totalPts).padStart(2, '0')}
                                            </div>
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Total Points</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Side - Player Portraits */}
                            {config.showPlayerPortraits && (
                                <div className={`flex-[1.8] relative ${isTransparent ? 'bg-transparent' : 'bg-gradient-to-br from-slate-50/50 to-white'} flex items-end justify-center px-6 gap-2`}>
                                     {!isTransparent && (
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[400px] font-black text-slate-100 italic select-none">
                                            {topTeam.teamName.slice(0, 3).toUpperCase()}
                                        </div>
                                     )}

                                     {topPlayers.slice(0, config.playerPortraitCount).map((p: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className="relative flex-1 h-[115%] flex flex-col justify-end z-10"
                                        >
                                            <img
                                                src={`${API_URL}/images/${p.playerKey}.png`}
                                                onError={(e) => { e.currentTarget.src = `${API_URL}/images/default.png`; }}
                                                className="w-full h-auto scale-110 object-contain object-bottom drop-shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
                                                alt=""
                                            />
                                            <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 ${isTransparent ? 'bg-white font-black' : 'bg-white/95 backdrop-blur'} shadow-xl px-4 py-1.5 rounded-2xl border border-slate-100 text-[12px] font-black uppercase tracking-tighter truncate w-[90%] text-center`}>
                                                {p.name}
                                            </div>
                                        </div>
                                     ))}
                                </div>
                            )}
                        </div>
                        </div>
                    </div>
                )}

                {/* Table Section */}
                <div className="absolute" style={{ left: 64, top: config.showTopTeamShowcase ? 640 : 200, width: 1792 }}>
                    <div className="z-10">
                        <div className="grid grid-cols-2 gap-8">
                        {tableColumns.map((col, colIdx) => (
                            <div key={colIdx} className="flex flex-col gap-1.5 w-full">
                                <div
                                    className="flex items-center h-12 px-6 text-white font-black text-lg uppercase tracking-tighter italic"
                                    style={{ backgroundColor: config.tableHeaderColor, borderRadius: `${config.cornerRadius}px ${config.cornerRadius}px 0 0` }}
                                >
                                    <span className="w-16">Rank</span>
                                    <span className="flex-1">Team</span>
                                    {statColumns.map(sc => (
                                        <span key={sc.key} className={cn('text-center shrink-0', sc.key === 'totalPts' ? 'w-22' : 'w-20')}>{sc.label}</span>
                                    ))}
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    {col.map((team: any, idx: number) => (
                                        <div
                                            key={team.rank}
                                            className={`flex items-center h-[68px] ${isTransparent ? 'bg-black/5' : 'bg-[#f9fafb] border border-slate-100 shadow-sm'} overflow-hidden hover:shadow-md hover:bg-white transition-all group`}
                                            style={{ borderRadius: `${config.cornerRadius}px` }}
                                        >
                                            <div
                                                className="w-16 h-full flex items-center justify-center font-black text-2xl text-white italic"
                                                style={{ backgroundColor: config.rankBadgeColor }}
                                            >
                                                #{team.rank}
                                            </div>
                                            <div className="flex-1 flex items-center gap-4 px-6 overflow-hidden">
                                                {team.logoUrl ? (
                                                    <img src={team.logoUrl} className="w-9 h-9 object-contain" alt="" />
                                                ) : (
                                                    <div className="w-9 h-9 bg-slate-200 rounded-xl" />
                                                )}
                                                <div className="h-6 w-[2px] bg-slate-200 shrink-0" />
                                                <span className="text-xl font-black text-slate-800 uppercase tracking-tighter italic whitespace-nowrap">
                                                    {team.teamTag || team.teamName.replace(/^scout\s+/i, '')}
                                                </span>
                                            </div>
                                            {config.showPlaceColumn && (
                                                <div className="w-20 text-center font-black text-2xl text-slate-400 shrink-0">
                                                    {String(team.placePts).padStart(2, '0')}
                                                </div>
                                            )}
                                            {config.showElimsColumn && (
                                                <div className="w-20 text-center font-black text-2xl text-slate-400 shrink-0">
                                                    {String(team.elims).padStart(2, '0')}
                                                </div>
                                            )}
                                            {config.showTotalColumn && (
                                                config.showSkewedTotal ? (
                                                    <div
                                                        className="w-22 h-full flex items-center justify-center font-black text-3xl text-white italic skew-x-[-15deg] translate-x-3 shrink-0"
                                                        style={{ backgroundColor: config.totalBadgeColor }}
                                                    >
                                                        <span className="skew-x-[15deg]">{String(team.totalPts).padStart(2, '0')}</span>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="w-22 h-full flex items-center justify-center font-black text-3xl text-white italic shrink-0"
                                                        style={{ backgroundColor: config.totalBadgeColor }}
                                                    >
                                                        {String(team.totalPts).padStart(2, '0')}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                </div>

            </div>
    );
}

export default function MatchRankingsOverlay() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <MatchRankingsContent />
        </Suspense>
    );
}
