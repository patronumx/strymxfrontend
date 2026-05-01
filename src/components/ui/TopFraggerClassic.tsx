"use client"
import { API_URL } from '@/lib/api-config';
import React, { useEffect, useState, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { type TopFraggerConfig, defaultTopFraggerConfig } from '@/context/OverlayConfigContext';
import { io } from 'socket.io-client';
import { useSearchParams } from 'next/navigation';

interface PlayerStat {
    playerKey: string;
    name: string;
    teamName: string;
    killNum: number;
    damage: number;
    survivalTime?: string | number;
    logoUrl?: string;
}

/** TopFraggerClassic — original free-tier design. Fixed slanted hero layout. */
export default function TopFraggerClassic() {
    const { theme, isTransparent: themeTransparent, isDataOnly: themeDataOnly } = useTheme();
    const searchParams = useSearchParams();
    const isDataOnly = themeDataOnly || searchParams.get('dataOnly') === 'true';
    const isTransparent = themeTransparent || searchParams.get('transparent') !== 'false';
    const [fetchedData, setFetchedData] = useState<PlayerStat[]>([]);
    const [config, setConfig] = useState<TopFraggerConfig>(defaultTopFraggerConfig);

    useEffect(() => {
        const saved = localStorage.getItem('strymx_overlay_configs');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed['match-top-fragger']) setConfig(prev => ({ ...prev, ...parsed['match-top-fragger'] }));
            } catch (e) {}
        }
    }, []);

    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data?.type === 'strymx_overlay_config' && e.data.overlayType === 'match-top-fragger' && e.data.config) {
                setConfig(prev => ({ ...prev, ...e.data.config }));
            }
            if (e.data?.type === 'strymx_batch_update' && e.data.overlayType === 'match-top-fragger' && e.data.config) {
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

    const topFragger = useMemo(() => {
        if (!fetchedData || fetchedData.length === 0) return null;
        return [...fetchedData]
            .filter(p => p.name && p.name !== 'Unknown')
            .sort((a, b) => {
                if (b.killNum !== a.killNum) return b.killNum - a.killNum;
                if (b.damage !== a.damage) return b.damage - a.damage;
                return (a.name || '').localeCompare(b.name || '');
            })[0];
    }, [fetchedData]);

    const formatTime = (s: any) => {
        if (!s) return '00.00';
        if (typeof s === 'string' && s.includes(':')) return s.replace(':', '.');
        const total = parseInt(s) || 0;
        const mins = Math.floor(total / 60);
        const secs = total % 60;
        return `${mins.toString().padStart(2, '0')}.${secs.toString().padStart(2, '0')}`;
    };

    const displayPlayer = topFragger || { playerKey: 'dummy', name: 'WAITING', teamName: 'FOR DATA', killNum: 0, damage: 0, survivalTime: '24:15', logoUrl: '' };

    return (
        <div style={{ width: '100vw', height: '100vh', backgroundColor: 'transparent', overflow: 'hidden' }}>
            {isDataOnly && (
                <style dangerouslySetInnerHTML={{ __html: `* { background-color: transparent !important; background-image: none !important; border-color: transparent !important; box-shadow: none !important; backdrop-filter: none !important; }` }} />
            )}
            <div
                className="relative font-sans text-slate-900 overflow-hidden"
                style={{ width: '1920px', height: '1080px', transform: `scale(${scale})`, transformOrigin: 'top left' }}
            >
                {!isTransparent && (
                    <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                )}

                <div key={displayPlayer.playerKey} className="absolute inset-0 z-10">
                    <div
                        className="absolute left-0 top-0 bottom-0 w-[55%] bg-theme-secondary z-10"
                        style={{ backgroundColor: theme.secondary, clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0% 100%)' }}
                    >
                        <div className="absolute bottom-16 left-12 flex flex-col items-start z-30">
                            {config.showPlayerPortrait && (
                                <div className="w-[550px] h-[720px] flex justify-center items-end -mb-8 relative z-10">
                                    <img src={`${API_URL}/images/${displayPlayer.playerKey}.png`}
                                        onError={(e) => { e.currentTarget.src = `${API_URL}/images/default.png`; }}
                                        className="w-full h-auto object-contain object-bottom drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)]" alt="" />
                                </div>
                            )}
                            <div className="bg-white px-10 py-6 pr-20 w-auto min-w-[500px] max-w-[650px] relative z-20" style={{ clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0 100%)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                                <h1 className="text-[60px] font-black uppercase tracking-tighter leading-[0.9]" style={{ color: config.playerNameColor || theme.primary }}>
                                    {displayPlayer.name}
                                </h1>
                                <h2 className="text-[28px] font-black uppercase tracking-widest mt-2" style={{ color: config.teamNameColor || '#1e293b' }}>
                                    {displayPlayer.teamName.replace(/^scout\s+/i, '')}
                                </h2>
                            </div>
                        </div>

                        <div className="absolute top-1/2 -translate-y-1/2 right-[12%] flex flex-col gap-10 items-center z-30 w-[340px]">
                            {config.showEliminations && (
                                <div className="flex flex-col items-center border-b border-black/10 pb-6 w-full">
                                    <span className="text-2xl font-black uppercase tracking-widest mb-1 drop-shadow-sm" style={{ color: config.statLabelColor || '#1e293b' }}>Eliminations</span>
                                    <span className="text-[110px] font-black leading-[0.9] tracking-tighter drop-shadow-sm" style={{ color: config.elimsColor || theme.primary }}>
                                        {String(displayPlayer.killNum).padStart(2, '0')}
                                    </span>
                                </div>
                            )}
                            {config.showDamage && (
                                <div className="flex flex-col items-center border-b border-black/10 pb-6 w-full">
                                    <span className="text-2xl font-black uppercase tracking-widest mb-1 drop-shadow-sm" style={{ color: config.statLabelColor || '#1e293b' }}>Damage</span>
                                    <span className="text-[110px] font-black leading-[0.9] tracking-tighter drop-shadow-sm" style={{ color: config.damageColor || theme.primary }}>
                                        {String(Math.round(displayPlayer.damage)).padStart(3, '0')}
                                    </span>
                                </div>
                            )}
                            {config.showSurvival && (
                                <div className="flex flex-col items-center w-full">
                                    <span className="text-2xl font-black uppercase tracking-widest mb-1 drop-shadow-sm" style={{ color: config.statLabelColor || '#1e293b' }}>Avg. Survival</span>
                                    <span className="text-[100px] font-black leading-[0.9] tracking-tighter font-mono drop-shadow-sm" style={{ color: config.survivalColor || theme.primary }}>
                                        {formatTime(displayPlayer.survivalTime)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {config.showHeader && (
                        <div className="absolute right-[12%] top-1/2 -translate-y-[40%] flex flex-col items-start z-10 w-[600px] pl-[10%]">
                            <div className="flex flex-col border-l-[6px] border-theme-primary pl-10" style={{ borderColor: theme.primary }}>
                                <span className="text-[55px] font-black text-theme-primary uppercase tracking-widest mb-[-15px]" style={{ color: theme.primary }}>MATCH</span>
                                <span className="text-[95px] font-black text-slate-900 uppercase tracking-tighter leading-none mt-1">TOP</span>
                                <span className="text-[95px] font-black text-slate-900 uppercase tracking-tighter leading-none mt-0">FRAGGER</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
