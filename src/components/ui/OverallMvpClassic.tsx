"use client"
import { API_URL } from '@/lib/api-config';
import React, { useEffect, useState, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { type OverallMvpConfig, defaultOverallMvpConfig } from '@/context/OverlayConfigContext';
import { io } from 'socket.io-client';
import { useSearchParams } from 'next/navigation';

interface PlayerStat {
    playerKey: string;
    name: string;
    teamName: string;
    killNum: number;
    damage: number;
    survivalTime: number;
    logoUrl?: string;
    mvpScore?: number;
}

/** OverallMvpClassic — free-tier MVP list overlay. Fixed list layout. */
export default function OverallMvpClassic() {
    const { theme, isTransparent: themeTransparent, isDataOnly: themeDataOnly } = useTheme();
    const searchParams = useSearchParams();
    const isDataOnly = themeDataOnly || searchParams.get('dataOnly') === 'true';
    const isTransparent = themeTransparent || searchParams.get('transparent') !== 'false';
    const [fetchedData, setFetchedData] = useState<PlayerStat[]>([]);
    const [config, setConfig] = useState<OverallMvpConfig>(defaultOverallMvpConfig);

    useEffect(() => {
        const saved = localStorage.getItem('strymx_overlay_configs');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed['overall-mvp']) setConfig(prev => ({ ...prev, ...parsed['overall-mvp'] }));
            } catch (e) {}
        }
    }, []);

    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data?.type === 'strymx_overlay_config' && e.data.overlayType === 'overall-mvp' && e.data.config) {
                setConfig(prev => ({ ...prev, ...e.data.config }));
            }
            if (e.data?.type === 'strymx_batch_update' && e.data.overlayType === 'overall-mvp' && e.data.config) {
                setConfig(prev => ({ ...prev, ...e.data.config }));
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    useEffect(() => {
        const socket = io(`${API_URL}`);
        socket.on('match_state_update', (data) => {
            if (data && data.activePlayers) setFetchedData(data.activePlayers);
        });
        return () => { socket.disconnect(); };
    }, []);

    const [scale, setScale] = useState(1);
    useEffect(() => {
        const handleResize = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080, 1));
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const topMvpPlayers = useMemo(() => {
        if (!fetchedData || fetchedData.length === 0) return [];
        const validPlayers = fetchedData.filter(p => p.name && p.name !== 'Unknown');
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

        return scoredPlayers
            .sort((a, b) => {
                if (b.mvpScore !== a.mvpScore) return (b.mvpScore || 0) - (a.mvpScore || 0);
                return (a.name || '').localeCompare(b.name || '');
            })
            .slice(0, config.playerCount);
    }, [fetchedData, config.playerCount]);

    const displayMvps = useMemo(() => {
        const base = [...topMvpPlayers.slice(0, config.playerCount)];
        while (base.length < config.playerCount) {
            base.push({ playerKey: `dummy-${base.length}`, name: 'WAITING FOR DATA', teamName: '...', killNum: 0, damage: 0, survivalTime: 0, mvpScore: 0 });
        }
        return base;
    }, [topMvpPlayers, config.playerCount]);

    return (
        <div style={{ width: '100vw', height: '100vh', backgroundColor: 'transparent', overflow: 'hidden' }}>
            {isDataOnly && (
                <style dangerouslySetInnerHTML={{ __html: `* { background-color: transparent !important; background-image: none !important; border-color: transparent !important; box-shadow: none !important; backdrop-filter: none !important; }` }} />
            )}
            <div className="bg-transparent relative font-sans text-white overflow-hidden" style={{ width: '1920px', height: '1080px', transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                {!isTransparent && (
                    <>
                        <div className="absolute inset-0 bg-slate-950/20" />
                        <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-theme-secondary/10 to-transparent" />
                    </>
                )}

                {config.showHeader && (
                    <div className={`absolute z-30 flex flex-col pointer-events-none ${isTransparent ? 'top-8 left-16 items-start translate-x-0' : 'top-10 left-1/2 -translate-x-1/2 items-center w-full'}`}>
                        <div className={`flex items-center gap-6 mb-1 ${isTransparent ? 'hidden' : 'flex'}`}>
                            <div className="h-1 w-24 bg-theme-secondary rounded-full" style={{ backgroundColor: theme.secondary, boxShadow: `0 0 10px ${theme.secondary}` }} />
                            <p className="text-xl font-black text-theme-secondary tracking-[0.5em] uppercase opacity-80" style={{ color: theme.secondary }}>{config.headerSubtitle}</p>
                            <div className="h-1 w-24 bg-theme-secondary rounded-full" style={{ backgroundColor: theme.secondary, boxShadow: `0 0 10px ${theme.secondary}` }} />
                        </div>
                        <h1 className={`font-black text-white uppercase tracking-tighter italic leading-none drop-shadow-premium whitespace-nowrap ${isTransparent ? 'text-6xl mb-4' : 'text-[120px]'}`}>
                            {config.headerTitle.includes(' ') ? (
                                <>{config.headerTitle.split(' ').slice(0, -1).join(' ')} <span className="text-theme-secondary" style={{ color: theme.secondary }}>{config.headerTitle.split(' ').slice(-1)[0]}</span></>
                            ) : (
                                <span className="text-theme-secondary" style={{ color: theme.secondary }}>{config.headerTitle}</span>
                            )}
                        </h1>
                    </div>
                )}

                <div className={`absolute z-20 w-[1400px] flex flex-col ${isTransparent ? 'top-28 left-16 translate-x-0' : 'top-60 left-1/2 -translate-x-1/2'}`} style={{ gap: `${config.cardGap}px` }}>
                    {displayMvps.map((player, idx) => (
                        <div key={player.playerKey || idx} className="relative flex items-center group overflow-hidden shadow-2xl" style={{ height: `${config.cardHeight}px` }}>
                            <div className="relative w-32 h-full flex items-center justify-center z-30 border-r-4 border-white/20" style={{ backgroundColor: config.rankBadgeColor || theme.primary }}>
                                <span className="text-6xl font-black text-white italic tracking-tighter drop-shadow-xl">#{idx + 1}</span>
                            </div>
                            {config.showPlayerPortrait && (
                                <div className="relative w-44 h-full flex items-center justify-center bg-white border-r border-slate-100 overflow-hidden">
                                    <div className="absolute inset-y-0 left-0 w-3 bg-theme-secondary" style={{ backgroundColor: theme.secondary }} />
                                    <img src={`${API_URL}/images/${player.playerKey}.png`} onError={(e) => { e.currentTarget.src = `${API_URL}/images/default.png`; }} className="h-[160%] w-auto object-contain object-bottom mt-16 relative z-10 drop-shadow-2xl" alt="" />
                                </div>
                            )}
                            <div className="flex-[1.8] px-10 flex flex-col justify-center bg-white h-full relative z-10">
                                <div className="flex items-center gap-3 mb-1">
                                    {config.showTeamLogo && player.logoUrl && <img src={player.logoUrl} className="w-8 h-8 object-contain opacity-80" alt="" />}
                                    <span className="text-lg font-black uppercase tracking-widest leading-none truncate" style={{ color: config.teamNameColor || '#94a3b8' }}>
                                        {player.teamName.replace(/^scout\s+/i, '')}
                                    </span>
                                </div>
                                <h2 className="text-5xl font-black uppercase tracking-tighter italic leading-none drop-shadow-sm truncate" style={{ color: config.playerNameColor || theme.primary }}>
                                    {player.name}
                                </h2>
                            </div>
                            <div className="relative flex-1 h-full flex items-center z-20">
                                <div className="absolute inset-y-0 -left-8 w-16 bg-theme-secondary skew-x-[-15deg] z-10" style={{ backgroundColor: theme.secondary }} />
                                <div className="relative flex-1 h-full bg-theme-secondary flex items-center justify-around px-8 z-20" style={{ backgroundColor: theme.secondary }}>
                                    {config.showDamage && (
                                        <>
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: config.statLabelColor || '#00000099' }}>DAMAGE</span>
                                                <span className="text-5xl font-black italic leading-none tracking-tighter" style={{ color: config.damageColor || theme.primary }}>{Math.round(player.damage)}</span>
                                            </div>
                                            <div className="w-[2px] h-16 bg-slate-900/10" />
                                        </>
                                    )}
                                    {config.showElims && (
                                        <>
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: config.statLabelColor || '#00000099' }}>ELIMS</span>
                                                <span className="text-5xl font-black italic leading-none tracking-tighter" style={{ color: config.elimsColor || theme.primary }}>{player.killNum}</span>
                                            </div>
                                            <div className="w-[2px] h-16 bg-slate-900/10" />
                                        </>
                                    )}
                                    <div className="flex flex-col items-center">
                                        <span className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: config.statLabelColor || '#00000099' }}>SUR. TIME</span>
                                        <span className="text-5xl font-black italic leading-none tracking-tighter" style={{ color: config.damageColor || theme.primary }}>
                                            {(() => {
                                                const totalSeconds = Math.floor(player.survivalTime || 0);
                                                const mins = Math.floor(totalSeconds / 60);
                                                const secs = totalSeconds % 60;
                                                return `${mins}:${secs.toString().padStart(2, '0')}`;
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
