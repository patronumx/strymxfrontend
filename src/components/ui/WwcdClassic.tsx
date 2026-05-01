"use client"
import { API_URL } from '@/lib/api-config';
import React, { useEffect, useState, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { type WwcdConfig, defaultWwcdConfig } from '@/context/OverlayConfigContext';
import { io } from 'socket.io-client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Crown, Target, TrendingUp, Clock, Zap } from 'lucide-react';

interface PlayerStat {
    playerKey: string;
    name: string;
    teamName: string;
    teamTag?: string;
    killNum: number;
    damage: number;
    survivalTime: number;
    rank?: number;
    placement?: number;
    logoUrl?: string;
}

function WwcdStatsContent() {
    const { theme } = useTheme();
    const searchParams = useSearchParams();
    const isDataOnly = searchParams.get('dataOnly') === 'true';
    const isTransparent = searchParams.get('transparent') === 'true' || isDataOnly;
    const [fetchedData, setFetchedData] = useState<PlayerStat[]>([]);
    const [config, setConfig] = useState<WwcdConfig>(defaultWwcdConfig);

    useEffect(() => {
        const socket = io(`${API_URL}`);
        socket.on('connect', () => console.log('WWCD Stats connected'));
        socket.on('match_state_update', (data) => {
            if (data && data.activePlayers) setFetchedData(data.activePlayers);
        });
        return () => { socket.disconnect(); };
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem('strymx_overlay_configs');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed['wwcd-stats']) setConfig(prev => ({ ...prev, ...parsed['wwcd-stats'] }));
            } catch (e) {}
        }
    }, []);

    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data?.type === 'strymx_overlay_config' && e.data.overlayType === 'wwcd-stats' && e.data.config) {
                setConfig(prev => ({ ...prev, ...e.data.config }));
            }
            if (e.data?.type === 'strymx_batch_update' && e.data.overlayType === 'wwcd-stats' && e.data.config) {
                setConfig(prev => ({ ...prev, ...e.data.config }));
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const [scale, setScale] = useState(1);
    useEffect(() => {
        const handleResize = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080, 1));
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const wwcdTeamInfo = useMemo(() => {
        if (!fetchedData || fetchedData.length === 0) return { teamName: 'WAITING FOR DATA', teamTag: '...', players: [], logoUrl: '' };

        const validPlayers = fetchedData.filter(p => p.name && p.name !== 'Unknown');
        const teams = validPlayers.reduce((acc: any, player) => {
            if (!acc[player.teamName]) acc[player.teamName] = { players: [], totalScore: 0, isWWCD: false, logoUrl: player.logoUrl, teamTag: player.teamTag };
            acc[player.teamName].players.push(player);
            acc[player.teamName].totalScore += player.killNum + (player.damage / 100);
            if (player.placement === 1 || player.rank === 1) acc[player.teamName].isWWCD = true;
            return acc;
        }, {});

        let teamPlayers: PlayerStat[] = [];
        let tName = "";
        let tLogo = "";
        let tTag = "";

        const wwcdEntry = Object.entries(teams).find(([_, data]: any) => data.isWWCD);
        if (wwcdEntry) {
            tName = wwcdEntry[0];
            teamPlayers = (wwcdEntry[1] as any).players;
            tLogo = (wwcdEntry[1] as any).logoUrl;
            tTag = (wwcdEntry[1] as any).teamTag;
        } else {
            const sortedTeams = Object.entries(teams).sort((a: any, b: any) => b[1].totalScore - a[1].totalScore);
            if (sortedTeams.length > 0) {
                tName = sortedTeams[0][0];
                teamPlayers = (sortedTeams[0][1] as any).players;
                tLogo = (sortedTeams[0][1] as any).logoUrl;
                tTag = (sortedTeams[0][1] as any).teamTag;
            }
        }

        const top4 = [...teamPlayers].sort((a, b) => b.killNum - a.killNum).slice(0, config.playerCount);
        const finalTag = tTag || tName.slice(0, 3).toUpperCase();

        while (top4.length > 0 && top4.length < config.playerCount) {
            top4.push({
                playerKey: `dummy-${top4.length}`,
                name: '...',
                teamName: tName,
                killNum: 0,
                damage: 0,
                survivalTime: 0
            });
        }
        return { teamName: tName, teamTag: finalTag, players: top4.length > 0 ? top4 : Array.from({ length: config.playerCount }).map((_, i) => ({ playerKey: `dummy-${i}`, name: '...', teamName: '...', killNum: 0, damage: 0, survivalTime: 0, rank: 0 })), logoUrl: tLogo };
    }, [fetchedData, config.playerCount]);

    return (
        <div style={{ width: '100vw', height: '100vh', backgroundColor: 'transparent', overflow: 'hidden' }}>
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
            <div 
                className="bg-transparent relative font-sans text-white overflow-hidden"
                style={{ width: '1920px', height: '1080px', transform: `scale(${scale})`, transformOrigin: 'top left' }}
            >
                {!isTransparent && (
                    <>
                        <div className="absolute inset-0 z-0 bg-slate-950/20" />
                        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-theme-primary/10 to-transparent blur-3xl opacity-30" />
                    </>
                )}
                
                {config.showParticles && !isTransparent && [...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 bg-theme-secondary rounded-full opacity-20 blur-sm"
                        style={{
                            left: `${15 + i * 15}%`,
                            bottom: '-5%'
                        }}
                    />
                ))}

                {config.showHeader && (
                <div
                    className={`absolute z-30 flex flex-col pointer-events-none transition-all duration-1000 ${
                        isTransparent ? 'top-12 left-24 items-start translate-x-0' : 'top-16 left-1/2 -translate-x-1/2 items-center w-full'
                    }`}
                >
                    <div
                        className={`flex items-center gap-6 mb-2 ${isTransparent ? 'hidden' : 'flex'}`}
                    >
                        <div className="h-1 w-24 bg-theme-secondary rounded-full" style={{ backgroundColor: theme.secondary, boxShadow: `0 0 10px ${theme.secondary}` }} />
                        <p className="text-xl font-black text-white/60 uppercase tracking-[0.5em] italic">{config.headerSubtitle}</p>
                        <div className="h-1 w-24 bg-theme-secondary rounded-full" style={{ backgroundColor: theme.secondary, boxShadow: `0 0 10px ${theme.secondary}` }} />
                    </div>

                    <h1
                        className={`font-black text-white uppercase tracking-tighter italic leading-none drop-shadow-premium mb-6 ${
                            isTransparent ? 'text-7xl' : 'text-[120px]'
                        }`}
                    >
                        {config.headerTitle}
                    </h1>

                    <div
                        className={`flex items-center gap-6 bg-slate-900/80 backdrop-blur-xl px-12 py-3 rounded-xl border-2 border-white/20 shadow-2xl ${
                            isTransparent ? 'scale-75 origin-left' : ''
                        }`}
                    >
                        {config.showTeamLogo && wwcdTeamInfo.logoUrl && (
                            <img src={wwcdTeamInfo.logoUrl} className="w-14 h-14 object-contain drop-shadow-lg" alt="" />
                        )}
                        <span className="text-6xl font-black text-white uppercase tracking-tighter italic leading-none drop-shadow-premium">
                            {wwcdTeamInfo.teamTag || wwcdTeamInfo.teamName.replace(/^scout\s+/i, '')}
                        </span>
                        <div className="p-2 bg-theme-secondary rounded-lg shadow-glow-secondary" style={{ backgroundColor: theme.secondary }}>
                            <Crown size={32} className="text-slate-950 fill-slate-950" />
                        </div>
                    </div>
                </div>
                )}

                <div 
                    className={`absolute z-20 w-[1450px] flex flex-col gap-4 transition-all duration-700 ${
                        isTransparent ? 'top-60 left-24 translate-x-0' : 'top-[360px] left-1/2 -translate-x-1/2'
                    }`}
                >
                        {wwcdTeamInfo.players.map((player, idx) => (
                            <div
                                key={player.playerKey || idx}
                                className="relative flex h-36 items-center group overflow-hidden shadow-2xl bg-white border-b-4 border-theme-secondary"
                                style={{ borderBottomColor: theme.secondary }}
                            >
                                {config.showPlayerPortrait && (
                                <div className="h-full w-48 bg-[#111116] flex items-start justify-center relative overflow-hidden shrink-0 border-r-4 border-theme-secondary" style={{ borderColor: theme.secondary }}>
                                    <img
                                        src={`${API_URL}/images/${player.playerKey}.png`}
                                        onError={(e) => { e.currentTarget.src = `${API_URL}/images/default.png`; }}
                                        className="h-[150%] w-full object-cover object-top translate-x-6 relative z-10 mt-2"
                                        alt=""
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                                </div>
                                )}
                                
                                <div className="flex-1 px-14 flex flex-col justify-center h-full relative z-10 overflow-hidden bg-white" 
                                     style={{ 
                                         backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 86c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm66-3c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm-40-39c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm0-22c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM9 42c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm67 0c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zM56 7c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm0 64c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zM12 8c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28 28c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm56 56c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0-44c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-44 0c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0-44c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm40 80c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm0-44c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm-40-44c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm40 0c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23000000' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                                         backgroundSize: '150px 150px' 
                                     }}>
                                    <div className="flex flex-col relative z-20">
                                        <h2 className="text-5xl font-black uppercase tracking-tighter italic leading-none" style={{ color: config.playerNameColor || theme.primary }}>
                                            {player.name}
                                        </h2>
                                        <p className="text-xl font-black tracking-[0.2em] uppercase opacity-70 mt-1" style={{ color: config.teamNameColor || '#1e293b' }}>{wwcdTeamInfo.teamTag || wwcdTeamInfo.teamName || '...'}</p>
                                    </div>
                                    <div className="absolute right-0 top-0 h-full w-2 bg-theme-primary opacity-20" style={{ backgroundColor: theme.primary }} />
                                </div>

                                <div className="relative w-[45%] flex h-full bg-theme-secondary text-slate-900 items-center px-4 overflow-hidden border-l-4 border-slate-900/10" 
                                     style={{ backgroundColor: theme.secondary }}>
                                    <div className="flex w-full items-center justify-around relative z-10 px-2">
                                        {config.showDamage && (
                                        <div className="flex flex-col items-center flex-1">
                                            <span className="text-[10px] font-black uppercase tracking-tight leading-tight" style={{ color: config.statLabelColor || '#00000099' }}>DAMAGE</span>
                                            <span className="text-4xl font-black leading-none mt-1" style={{ color: config.damageColor || theme.primary }}>{Math.round(player.damage)}</span>
                                        </div>
                                        )}
                                        {config.showDamage && config.showElims && <div className="h-12 w-[1.5px] bg-slate-900/10 shrink-0 mx-2" />}
                                        {config.showElims && (
                                        <div className="flex flex-col items-center flex-1">
                                            <span className="text-[10px] font-black uppercase tracking-tight leading-tight" style={{ color: config.statLabelColor || '#00000099' }}>ELIMS</span>
                                            <span className="text-4xl font-black leading-none mt-1" style={{ color: config.elimsColor || theme.primary }}>{player.killNum}</span>
                                        </div>
                                        )}
                                        {config.showElims && config.showSurvival && <div className="h-12 w-[1.5px] bg-slate-900/10 shrink-0 mx-2" />}
                                        {config.showSurvival && (
                                        <div className="flex flex-col items-center flex-1">
                                            <span className="text-[10px] font-black uppercase tracking-tight whitespace-nowrap leading-tight" style={{ color: config.statLabelColor || '#00000099' }}>SURVIVAL TIME</span>
                                            <span className="text-3xl font-black leading-none mt-1" style={{ color: config.survivalColor || theme.primary }}>
                                                {(() => {
                                                    const totalSeconds = Math.floor(player.survivalTime || 0);
                                                    const mins = Math.floor(totalSeconds / 60);
                                                    const secs = totalSeconds % 60;
                                                    return `${mins}:${secs.toString().padStart(2, '0')}`;
                                                })()}
                                            </span>
                                        </div>
                                        )}
                                    </div>
                                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/10 to-transparent opacity-30 pointer-events-none" />
                                </div>
                            </div>
                        ))}
                </div>

                {!isTransparent && <div className="absolute bottom-0 left-0 w-full h-8 bg-theme-primary z-40 shadow-[0_-10px_30px_rgba(233,30,99,0.5)]" />}
            </div>
        </div>
    );
}

export default function WwcdClassic() { return <Suspense fallback={<div className="bg-transparent w-screen h-screen" />}><WwcdStatsContent /></Suspense>; }