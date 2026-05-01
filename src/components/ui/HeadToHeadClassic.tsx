"use client"
import { API_URL } from '@/lib/api-config';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { io } from 'socket.io-client';
import { Swords, Target, TrendingUp, Clock, Award } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { type HeadToHeadConfig, defaultHeadToHeadConfig } from '@/context/OverlayConfigContext';

interface PlayerStat {
    playerKey: string;
    name: string;
    teamName: string;
    killNum: number;
    damage: number;
    headShotNum: number;
    assists: number;
    survivalTime: number;
    logoUrl?: string;
    photoUrl?: string;
}

function PlayerPortrait({ photoUrl, playerKey, name, backendHost, themeColor, flipped }: {
    photoUrl?: string;
    playerKey: string;
    name: string;
    backendHost: string;
    themeColor: string;
    flipped: boolean;
}) {
    const [imgSrc, setImgSrc] = useState<string | null>(
        photoUrl || (playerKey && !playerKey.startsWith('dummy') ? `${API_URL}/images/${playerKey}.png` : null)
    );
    const [failed, setFailed] = useState(false);

    // Update src if backendHost changes (hydration)
    useEffect(() => {
        if (!photoUrl && playerKey && !playerKey.startsWith('dummy')) {
            // Try port 3000 first (dedicated getplayer service)
            setImgSrc(`${API_URL}/images/${playerKey}.png`);
            setFailed(false);
        }
    }, [photoUrl, playerKey]);

    const initials = name?.charAt(0)?.toUpperCase() || '?';
    const borderClass = flipped ? 'border-l-4' : 'border-r-4';

    return (
        <div className={`w-48 h-full bg-[#111116] overflow-hidden flex items-start justify-center relative ${borderClass} border-slate-200`}>
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
                    className="h-[120%] w-full object-cover object-top mt-2 drop-shadow-premium" 
                    style={flipped ? { transform: 'scaleX(-1)' } : undefined}
                    alt="" 
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <div
                        className="w-24 h-24 rounded-full flex items-center justify-center font-black text-5xl text-white shadow-2xl border-4"
                        style={{ backgroundColor: `${themeColor}33`, borderColor: themeColor, color: themeColor }}
                    >
                        {initials}
                    </div>
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
    );
}

function HeadToHeadContent() {
    const { theme, isTransparent: themeTransparent, isDataOnly: themeDataOnly } = useTheme();
    const searchParams = useSearchParams();
    const isDataOnly = themeDataOnly || searchParams.get('dataOnly') === 'true';
    const isTransparent = themeTransparent || searchParams.get('transparent') !== 'false';

    const [fetchedData, setFetchedData] = useState<PlayerStat[]>([]);
    const [backendHost, setBackendHost] = useState('localhost');
    const [config, setConfig] = useState<HeadToHeadConfig>(defaultHeadToHeadConfig);

    useEffect(() => {
        const saved = localStorage.getItem('strymx_overlay_configs');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed['head-to-head']) setConfig(prev => ({ ...prev, ...parsed['head-to-head'] }));
            } catch (e) {}
        }
    }, []);

    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data?.type === 'strymx_overlay_config' && e.data.overlayType === 'head-to-head' && e.data.config) {
                setConfig(prev => ({ ...prev, ...e.data.config }));
            }
            if (e.data?.type === 'strymx_batch_update' && e.data.overlayType === 'head-to-head' && e.data.config) {
                setConfig(prev => ({ ...prev, ...e.data.config }));
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    useEffect(() => {
        // Safely read window.location.hostname on client only
        setBackendHost(window.location.hostname || 'localhost');
    }, []);

    useEffect(() => {
        const socket = io(`${API_URL}`);
        socket.on('connect', () => console.log('Head to Head connected'));
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

    const displayPlayers = useMemo(() => {
        if (!fetchedData || fetchedData.length === 0) {
            return [
                { playerKey: 'dummy-1', name: 'WAITING', teamName: 'TEAM A', killNum: 0, damage: 0, headShotNum: 0, assists: 0, survivalTime: 0 },
                { playerKey: 'dummy-2', name: 'WAITING', teamName: 'TEAM B', killNum: 0, damage: 0, headShotNum: 0, assists: 0, survivalTime: 0 }
            ];
        }
        
        const validPlayers = fetchedData.filter(p => p.name && p.name !== 'Unknown');
        const sorted = [...validPlayers].sort((a, b) => b.killNum - a.killNum);
        
        const final = sorted.slice(0, 2);
        while (final.length < 2) {
            final.push({ 
                playerKey: `dummy-${final.length}`, 
                name: '...', 
                teamName: '...', 
                killNum: 0, 
                damage: 0, 
                headShotNum: 0, 
                assists: 0, 
                survivalTime: 0 
            });
        }
        return final;
    }, [fetchedData]);

    const metrics = [
        { label: "ELIMINATIONS", key: "killNum", icon: Target, visible: config.showEliminations },
        { label: "DAMAGE", key: "damage", icon: TrendingUp, visible: config.showDamage },
        { label: "HEADSHOTS", key: "headShotNum", icon: Award, visible: config.showHeadshots },
        { label: "SURVIVAL TIME", key: "survivalTime", icon: Clock, visible: config.showSurvival },
    ].filter(m => m.visible);

    return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: 'transparent' }}>
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
                className={`overflow-hidden relative font-sans transition-all duration-1000 ${isTransparent ? 'bg-transparent' : 'bg-[#0a0a0f]'}`}
                style={{ width: '1920px', height: '1080px', transform: `scale(${scale})`, transformOrigin: 'top left' }}
            >
                {/* Background Pattern */}
                {!isTransparent && (
                    <div className="absolute inset-0 opacity-10" style={{ 
                        backgroundImage: `radial-gradient(${theme.secondary} 1px, transparent 1px)`, 
                        backgroundSize: '80px 80px' 
                    }} />
                )}

                {/* Header: HEAD VS HEAD */}
                {config.showHeader && (
                <div className={`absolute z-30 flex flex-col pointer-events-none transition-all duration-1000 ${
                    isTransparent ? 'top-12 left-24 items-start translate-x-0' : 'top-16 left-1/2 -translate-x-1/2 items-center w-full'
                }`}>
                    <div className={`flex items-center gap-6 mb-2 ${isTransparent ? 'hidden' : 'flex'}`}>
                        <div className="h-1 w-24 bg-theme-secondary rounded-full" style={{ backgroundColor: theme.secondary, boxShadow: `0 0 15px ${theme.secondary}` }} />
                        <p className="text-xl font-black text-white/50 uppercase tracking-[0.5em] italic">{config.headerSubtitle}</p>
                        <div className="h-1 w-24 bg-theme-secondary rounded-full" style={{ backgroundColor: theme.secondary, boxShadow: `0 0 15px ${theme.secondary}` }} />
                    </div>

                    <h1
                        className={`font-black italic uppercase leading-none drop-shadow-premium ${
                            isTransparent ? 'text-7xl' : 'text-[110px] text-white'
                        }`}
                        style={{ color: isTransparent ? theme.primary : '#fff' }}
                    >
                        HEAD <span style={{ color: theme.secondary }}>VS</span> HEAD
                    </h1>
                </div>
                )}

                {/* Main Versus Area */}
                <div 
                    className={`absolute z-20 flex transition-all duration-700 ${
                        isTransparent 
                            ? 'top-52 left-24 w-[1600px] gap-8' 
                            : 'top-[320px] left-1/2 -translate-x-1/2 w-[1700px] justify-between items-center'
                    }`}
                >
                    {/* Player 1 Card (Left) */}
                    <div className="flex-1 flex flex-col group">
                        <div
                            className="relative h-40 w-full bg-white shadow-2xl overflow-hidden border-l-[12px] transition-all group-hover:scale-[1.02]"
                            style={{ borderLeftColor: theme.primary }}
                        >
                            <div className="flex h-full w-full items-center">
                                {/* Portrait Container */}
                                {config.showPlayerPortrait && (
                                <PlayerPortrait
                                    photoUrl={displayPlayers[0].photoUrl}
                                    playerKey={displayPlayers[0].playerKey}
                                    name={displayPlayers[0].name}
                                    backendHost={backendHost}
                                    themeColor={theme.primary}
                                    flipped={false}
                                />
                                )}

                                {/* Identity */}
                                <div className="flex-1 px-10 flex flex-col justify-center">
                                    <p className="text-sm font-black uppercase tracking-widest mb-1" style={{ color: config.teamNameColor || '#94a3b8' }}>{displayPlayers[0].teamName || '...'}</p>
                                    <h2 className="text-6xl font-black italic uppercase tracking-tighter leading-none" style={{ color: config.playerNameColor || theme.primary }}>
                                        {displayPlayers[0].name}
                                    </h2>
                                </div>
                            </div>
                        </div>

                        {/* Stats Array Left */}
                        <div className="mt-6 flex flex-col gap-4">
                            {metrics.map((m, idx) => (
                                <div
                                    key={m.label}
                                    className="relative flex h-20 items-center overflow-hidden shadow-lg"
                                >
                                    <div className="flex-1 h-full border-r-4 flex items-center justify-end px-12" style={{ backgroundColor: config.cardBgColor || '#0f172a', borderRightColor: theme.secondary }}>
                                        <span className="text-5xl font-black italic leading-none" style={{ color: config.statValueColor || '#ffffff' }}>
                                            {m.key === 'survivalTime' 
                                                ? `${Math.floor(displayPlayers[0].survivalTime / 60)}:${String(Math.round(displayPlayers[0].survivalTime % 60)).padStart(2, '0')}`
                                                : m.key === 'damage' ? Math.round(displayPlayers[0].damage) : displayPlayers[0][m.key as keyof PlayerStat]}
                                        </span>
                                    </div>
                                    <div className="w-1/3 h-full flex items-center px-6" style={{ backgroundColor: theme.secondary }}>
                                        <span className="text-xs font-black uppercase tracking-wider" style={{ color: config.statLabelColor || '#000000' }}>{m.label}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* VS Middle Divider (Hidden in Transparent Mode or refined) */}
                    {config.showVsBadge && (
                    <div className={`flex flex-col items-center justify-center px-8 ${isTransparent ? 'hidden' : 'flex'}`}>
                        <div className="h-32 w-1 bg-gradient-to-b from-transparent via-theme-secondary to-transparent opacity-50" style={{ backgroundColor: theme.secondary }} />
                        <div className="my-8 relative">
                            <div
                                className="absolute -inset-6 border-4 border-dashed border-theme-secondary/30 rounded-full animate-spin"
                                style={{ borderColor: `${theme.secondary}33`, animationDuration: '10s' }}
                            />
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.4)] z-10 relative">
                                <Swords size={48} style={{ color: theme.primary }} />
                            </div>
                        </div>
                        <div className="h-32 w-1 bg-gradient-to-t from-transparent via-theme-secondary to-transparent opacity-50" style={{ backgroundColor: theme.secondary }} />
                    </div>
                    )}

                    {/* Player 2 Card (Right) */}
                    <div className="flex-1 flex flex-col group">
                        <div
                            className="relative h-40 w-full bg-white shadow-2xl overflow-hidden border-r-[12px] transition-all group-hover:scale-[1.02]"
                            style={{ borderRightColor: theme.primary }}
                        >
                            <div className="flex h-full w-full items-center flex-row-reverse">
                                {/* Portrait Container */}
                                {config.showPlayerPortrait && (
                                <PlayerPortrait
                                    photoUrl={displayPlayers[1].photoUrl}
                                    playerKey={displayPlayers[1].playerKey}
                                    name={displayPlayers[1].name}
                                    backendHost={backendHost}
                                    themeColor={theme.primary}
                                    flipped={true}
                                />
                                )}

                                {/* Identity */}
                                <div className="flex-1 px-10 flex flex-col justify-center items-end">
                                    <p className="text-sm font-black uppercase tracking-widest mb-1" style={{ color: config.teamNameColor || '#94a3b8' }}>{displayPlayers[1].teamName || '...'}</p>
                                    <h2 className="text-6xl font-black italic uppercase tracking-tighter leading-none" style={{ color: config.playerNameColor || theme.primary }}>
                                        {displayPlayers[1].name}
                                    </h2>
                                </div>
                            </div>
                        </div>

                        {/* Stats Array Right */}
                        <div className="mt-6 flex flex-col gap-4">
                            {metrics.map((m, idx) => (
                                <div
                                    key={m.label}
                                    className="relative flex h-20 items-center overflow-hidden shadow-lg flex-row-reverse"
                                >
                                    <div className="flex-1 h-full border-l-4 flex items-center justify-start px-12" style={{ backgroundColor: config.cardBgColor || '#0f172a', borderLeftColor: theme.secondary }}>
                                        <span className="text-5xl font-black italic leading-none" style={{ color: config.statValueColor || '#ffffff' }}>
                                            {m.key === 'survivalTime' 
                                                ? `${Math.floor(displayPlayers[1].survivalTime / 60)}:${String(Math.round(displayPlayers[1].survivalTime % 60)).padStart(2, '0')}`
                                                : m.key === 'damage' ? Math.round(displayPlayers[1].damage) : displayPlayers[1][m.key as keyof PlayerStat]}
                                        </span>
                                    </div>
                                    <div className="w-1/3 h-full flex items-center justify-end px-6 text-right" style={{ backgroundColor: theme.secondary }}>
                                        <span className="text-xs font-black uppercase tracking-wider" style={{ color: config.statLabelColor || '#000000' }}>{m.label}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom Accents */}
                {!isTransparent && (
                    <div className="absolute bottom-0 left-0 w-full h-8 flex">
                        <div className="flex-1" style={{ backgroundColor: theme.primary }} />
                        <div className="w-48 skew-x-[-45deg] bg-white translate-y-2" />
                        <div className="flex-1" style={{ backgroundColor: theme.secondary }} />
                    </div>
                )}
            </div>
        </div>
    )
}

export default function HeadToHeadClassic() { return <Suspense fallback={<div className="bg-transparent w-screen h-screen" />}><HeadToHeadContent /></Suspense>; }