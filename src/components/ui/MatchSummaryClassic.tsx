"use client"
import { WS_URL } from '@/lib/api-config';
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useTheme } from '@/context/ThemeContext';
import { type MatchSummaryConfig, defaultMatchSummaryConfig } from '@/context/OverlayConfigContext';

import airdropImg from '@/assets/AIRDROP.png';
import eliminationsImg from '@/assets/Eliminations.png';
import grenadeImg from '@/assets/GRENADE.png';
import headshotsImg from '@/assets/Headshots.png';
import panImg from '@/assets/PAN.png';
import smokesImg from '@/assets/SMOKES & NADES.png';
import uazImg from '@/assets/UAZ.png';

/**
 * MatchSummaryClassic — the ORIGINAL match-summary design.
 *
 * Free-tier rendering. Reads colors and visibility toggles from
 * OverlayConfigContext (via the "Edit Overlay" studio). Fixed grid
 * layout — no drag/drop positions. This is what the broadcast output
 * uses by default.
 */
export default function MatchSummaryClassic() {
    const { theme, isDataOnly, isTransparent } = useTheme();
    const [fetchedData, setFetchedData] = useState<any[]>([]);
    const lastDataRef = useRef<string>('');

    const handleUpdate = useCallback((data: any) => {
        if (data && data.activePlayers) {
            const serialized = JSON.stringify(data.activePlayers);
            if (serialized !== lastDataRef.current) {
                lastDataRef.current = serialized;
                setFetchedData(data.activePlayers);
            }
        }
    }, []);

    useEffect(() => {
        const socket = io(WS_URL);
        socket.on('connect', () => console.log('Match Summary (Classic) connected'));
        socket.on('match_state_update', handleUpdate);
        return () => { socket.disconnect(); };
    }, [handleUpdate]);

    const [config, setConfig] = useState<MatchSummaryConfig>(defaultMatchSummaryConfig);

    useEffect(() => {
        const saved = localStorage.getItem('strymx_overlay_configs');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed['match-summary']) setConfig(prev => ({ ...prev, ...parsed['match-summary'] }));
            } catch (e) {}
        }
    }, []);

    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data?.type === 'strymx_overlay_config' && e.data.overlayType === 'match-summary' && e.data.config) {
                setConfig(prev => ({ ...prev, ...e.data.config }));
            }
            if (e.data?.type === 'strymx_batch_update' && e.data.overlayType === 'match-summary' && e.data.config) {
                setConfig(prev => ({ ...prev, ...e.data.config }));
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const [scale, setScale] = useState(1);
    useEffect(() => {
        const handleResize = () => {
            setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080, 1));
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const matchSummaryStats = useMemo(() => {
        const stats = { totalKills: 0, totalKnocks: 0, totalHeadshots: 0, smokesAndNades: 0, vehicleKills: 0, grenadeKills: 0, airdropLooted: 0 };
        if (!fetchedData || fetchedData.length === 0) return stats;
        fetchedData.forEach(p => {
            stats.totalKills += p.killNum || 0;
            stats.totalKnocks += p.knockouts || 0;
            stats.totalHeadshots += p.headShotNum || 0;
            stats.smokesAndNades += (p.useSmokeGrenadeNum || 0) + (p.useFragGrenadeNum || 0) + (p.useBurnGrenadeNum || 0) + (p.useFlashGrenadeNum || 0);
            stats.vehicleKills += p.killNumInVehicle || 0;
            stats.grenadeKills += p.killNumByGrenade || 0;
            stats.airdropLooted += p.gotAirDropNum || 0;
        });
        return stats;
    }, [fetchedData]);

    const allStatCards = [
        { title: "Total Kills", value: matchSummaryStats.totalKills, img: eliminationsImg, visible: config.showTotalKills },
        { title: "Total Knocks", value: matchSummaryStats.totalKnocks, img: panImg, visible: config.showTotalKnocks },
        { title: "Total Headshots", value: matchSummaryStats.totalHeadshots, img: headshotsImg, visible: config.showHeadshots },
        { title: "Smokes & Nades", value: matchSummaryStats.smokesAndNades, img: smokesImg, visible: config.showSmokesNades },
        { title: "Vehicle Kills", value: matchSummaryStats.vehicleKills, img: uazImg, visible: config.showVehicleKills },
        { title: "Grenade Kills", value: matchSummaryStats.grenadeKills, img: grenadeImg, visible: config.showGrenadeKills },
        { title: "Airdrops Looted", value: matchSummaryStats.airdropLooted, img: airdropImg, visible: config.showAirdrops },
    ];
    const statCards = allStatCards.filter(c => c.visible);

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
                className="bg-transparent overflow-hidden relative font-sans text-white"
                style={{ width: '1920px', height: '1080px', transform: `scale(${scale})`, transformOrigin: 'top left' }}
            >
                {!isTransparent && (
                    <div className="absolute inset-0 z-0 bg-white/5 opacity-50" style={{ backgroundImage: 'radial-gradient(var(--theme-primary) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                )}

                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 w-[1500px]">
                    <div className="flex flex-wrap justify-center gap-6 w-full">
                        {statCards.map((card) => (
                            <div
                                key={card.title}
                                className="flex flex-col shadow-[0_15px_50px_rgba(0,0,0,0.5)] relative overflow-hidden group"
                                style={{ width: config.cardWidth, clipPath: config.cardClipPath ? 'polygon(5% 0, 100% 0, 95% 100%, 0% 100%)' : undefined }}
                            >
                                <div className="h-36 flex items-center justify-center relative border-b-4" style={{ backgroundColor: config.cardBgColor || (isTransparent ? 'rgba(15,23,42,0.6)' : 'rgba(15,23,42,0.9)'), borderColor: config.cardBorderColor || 'var(--theme-secondary)' }}>
                                    <div className="absolute inset-0" style={{ backgroundColor: config.iconColor ? `${config.iconColor}1a` : 'var(--theme-primary-10, rgba(255,255,255,0.1))' }}></div>
                                    <img src={card.img.src} className="h-20 w-auto object-contain relative z-10" alt="" style={{ filter: `drop-shadow(0 0 15px ${config.iconColor || 'var(--theme-primary)'})` }} />
                                    {!isTransparent && <img src={card.img.src} className="h-44 w-auto object-contain opacity-5 absolute right-[-20px] bottom-[-40px] pointer-events-none" alt="" />}
                                </div>
                                <div className="py-3 text-center border-b border-black/20" style={{ backgroundColor: config.headerBgColor || 'var(--theme-primary)' }}>
                                    <span className="text-sm font-black uppercase tracking-[0.3em] drop-shadow-sm" style={{ color: config.headerTextColor || '#ffffff' }}>
                                        {card.title}
                                    </span>
                                </div>
                                <div className="py-8 text-center" style={{ background: `linear-gradient(to top right, ${theme.secondary}cc, ${theme.secondary})` }}>
                                    <span className="text-7xl font-black italic leading-none drop-shadow-md" style={{ color: config.statValueColor || 'var(--theme-primary)' }}>
                                        {String(card.value).padStart(config.valuePadding, '0')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
