"use client"
import React, { useEffect, useState, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { type FraggersConfig, defaultFraggersConfig } from '@/context/OverlayConfigContext';
import { io } from 'socket.io-client';
import { useSearchParams } from 'next/navigation';
import { Clock, Target, TrendingUp } from 'lucide-react';

interface PlayerStat {
    playerKey: string;
    name: string;
    teamName: string;
    killNum: number;
    damage: number;
    survivalTime?: string;
    logoUrl?: string;
}

/**
 * MatchFraggersClassic — ORIGINAL match-fraggers design.
 *
 * Free-tier rendering. Reads colors and visibility toggles from
 * OverlayConfigContext (via the "Edit Overlay" studio). Fixed vertical
 * list layout — no drag/drop. This is what broadcast output uses.
 */
export default function MatchFraggersClassic() {
    const { theme, isTransparent: themeTransparent, isDataOnly: themeDataOnly } = useTheme();
    const searchParams = useSearchParams();
    const isDataOnly = themeDataOnly || searchParams.get('dataOnly') === 'true';
    const isTransparent = themeTransparent || searchParams.get('transparent') !== 'false';
    const [fetchedData, setFetchedData] = useState<PlayerStat[]>([]);
    const [config, setConfig] = useState<FraggersConfig>(defaultFraggersConfig);

    useEffect(() => {
        const saved = localStorage.getItem('strymx_overlay_configs');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed['match-fraggers']) setConfig(prev => ({ ...prev, ...parsed['match-fraggers'] }));
            } catch (e) {}
        }
    }, []);

    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data?.type === 'strymx_overlay_config' && e.data.overlayType === 'match-fraggers' && e.data.config) {
                setConfig(prev => ({ ...prev, ...e.data.config }));
            }
            if (e.data?.type === 'strymx_batch_update' && e.data.overlayType === 'match-fraggers' && e.data.config) {
                setConfig(prev => ({ ...prev, ...e.data.config }));
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    useEffect(() => {
        const socket = io('http://localhost:4000');
        socket.on('connect', () => console.log('Match Fraggers (Classic) connected'));
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

    const topFraggers = useMemo(() => {
        if (!fetchedData || fetchedData.length === 0) return [];
        return [...fetchedData]
            .filter(p => p.name && p.name !== 'Unknown')
            .sort((a, b) => {
                if (b.killNum !== a.killNum) return b.killNum - a.killNum;
                if (b.damage !== a.damage) return b.damage - a.damage;
                return (a.name || '').localeCompare(b.name || '');
            })
            .slice(0, config.playerCount);
    }, [fetchedData, config.playerCount]);

    const displayFraggers = topFraggers.length > 0 ? topFraggers : Array.from({ length: config.playerCount }).map((_, i) => ({
        playerKey: `dummy-${i}`, name: 'WAITING FOR DATA', teamName: '...', killNum: 0, damage: 0, survivalTime: '24:15', logoUrl: ''
    }));

    const formatTime = (s: any) => {
        if (!s) return '00:00';
        if (typeof s === 'string' && s.includes(':')) return s;
        const total = parseInt(s) || 0;
        const mins = Math.floor(total / 60);
        const secs = total % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

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
                className="bg-transparent relative font-sans text-white"
                style={{ width: '1920px', height: '1080px', transform: `scale(${scale})`, transformOrigin: 'top left' }}
            >
                {!isTransparent && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-theme-primary/5 blur-[150px] pointer-events-none" />
                )}

                {!isTransparent && config.showHeader && (
                    <div className="absolute top-16 left-16 z-30 flex flex-col">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="h-1 w-20 bg-theme-primary rounded-full" style={{ backgroundColor: theme.primary, boxShadow: `0 0 10px ${theme.primary}` }} />
                            <p className="text-2xl font-black text-theme-primary tracking-[0.4em] uppercase" style={{ color: theme.primary }}>{config.headerTitle}</p>
                        </div>
                        <h1 className="text-8xl font-black text-white uppercase tracking-tighter italic leading-none">
                            MATCH <span className="text-theme-secondary" style={{ color: theme.secondary }}>FRAGGERS</span>
                        </h1>
                        <p className="mt-4 text-slate-400 font-bold uppercase tracking-[0.2em] px-2 border-l-2 border-white/10">
                            {config.headerSubtitle}
                        </p>
                    </div>
                )}

                <div className={`absolute top-64 z-20 flex flex-col
                    ${isTransparent
                        ? 'left-24 w-[1200px] translate-x-0'
                        : 'left-1/2 -translate-x-1/2 w-[1300px]'}`}
                    style={{ gap: config.cardGap }}
                >
                    {displayFraggers.map((p, idx) => (
                        <div
                            key={p.playerKey || idx}
                            className="group relative flex items-center"
                            style={{ height: config.cardHeight }}
                        >
                            <div className={`absolute inset-0 ${isTransparent ? 'opacity-[0.98]' : 'shadow-2xl'} border group-hover:border-theme-secondary/30 transition-all duration-500 shadow-premium`} style={{ borderRadius: config.cardCornerRadius, backgroundColor: config.cardBgColor || '#0a0a0c', borderColor: config.cardBorderColor || '#1e293b' }} />

                            {config.showRankBadge && (
                                <div className="relative w-28 h-full flex flex-col items-center justify-center border-r border-white/10 overflow-hidden">
                                    <span className="text-sm font-black text-slate-500 uppercase tracking-widest mb-1 opacity-60">RANK</span>
                                    <span className="text-6xl font-black italic tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" style={{ color: config.rankTextColor || '#ffffff' }}>
                                        #{idx + 1}
                                    </span>
                                </div>
                            )}

                            {config.showPlayerPortrait && (
                                <div className="relative w-44 h-full flex items-center justify-center overflow-hidden">
                                    <div className="absolute inset-x-4 bottom-4 top-10 bg-theme-primary/10 rounded-full blur-3xl opacity-40 group-hover:bg-theme-secondary/10 transition-colors" />
                                    <img
                                        src={`http://localhost:4000/images/${p.playerKey}.png`}
                                        onError={(e) => { e.currentTarget.src = 'http://localhost:4000/images/default.png'; }}
                                        className="h-[160%] w-auto object-contain object-bottom mt-16 relative z-10 transition-transform duration-700 group-hover:scale-110 drop-shadow-2xl"
                                        alt=""
                                    />
                                </div>
                            )}

                            <div className="flex-[1.8] px-10 flex flex-col justify-center gap-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    {p.logoUrl && (
                                        <img src={p.logoUrl} className="w-9 h-9 object-contain z-20 bg-white/10 p-1.5 rounded-md border border-white/10 shadow-lg" alt="" />
                                    )}
                                    {config.showTeamName && (
                                        <span className="text-xl font-black uppercase tracking-[0.1em] leading-none mb-1 drop-shadow-sm" style={{ color: config.teamNameColor || '#94a3b8' }}>
                                            {p.teamName.replace(/^scout\s+/i, '')}
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-4xl font-black uppercase tracking-tighter italic leading-none drop-shadow-lg py-1" style={{ color: config.playerNameColor || '#ffffff' }}>
                                    {p.name}
                                </h2>
                            </div>

                            <div className="flex-[2.2] flex items-center justify-center gap-6 px-6 h-[75%] border-l border-white/20 mx-2 rounded-2xl relative" style={{ backgroundColor: config.statBgColor || '#1a1a2e' }}>
                                {config.showDamage && (
                                    <div className="flex-1 flex flex-col items-center justify-center py-2 group-hover:bg-theme-primary/10 transition-colors rounded-xl">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <TrendingUp size={14} style={{ color: config.damageColor || theme.primary }} />
                                            <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: config.statLabelColor || '#f1f5f9' }}>Damage</span>
                                        </div>
                                        <span className="text-5xl font-black italic tracking-tighter leading-none" style={{ color: config.damageColor || '#ffffff' }}>{Math.round(p.damage)}</span>
                                    </div>
                                )}

                                {config.showDamage && config.showElims && <div className="w-[1px] h-16 bg-white/20" />}

                                {config.showElims && (
                                    <div className="flex-1 flex flex-col items-center justify-center py-2 group-hover:bg-theme-secondary/10 transition-colors rounded-xl">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Target size={14} style={{ color: config.elimsColor || theme.secondary }} />
                                            <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: config.statLabelColor || '#f1f5f9' }}>Elims</span>
                                        </div>
                                        <span className="text-5xl font-black italic tracking-tighter leading-none" style={{ color: config.elimsColor || theme.secondary }}>
                                            {p.killNum}
                                        </span>
                                    </div>
                                )}

                                {config.showElims && config.showSurvival && <div className="w-[1px] h-16 bg-white/20" />}

                                {config.showSurvival && (
                                    <div className="flex-1 flex flex-col items-center justify-center py-2 group-hover:bg-white/10 transition-colors rounded-xl min-w-[140px]">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Clock size={14} style={{ color: config.survivalColor || '#ffffff' }} />
                                            <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: config.statLabelColor || '#f1f5f9' }}>SUR. TIME</span>
                                        </div>
                                        <span className="text-5xl font-black italic tracking-tighter leading-none font-mono" style={{ color: config.survivalColor || '#ffffff' }}>
                                            {formatTime(p.survivalTime)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
