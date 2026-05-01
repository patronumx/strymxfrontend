"use client"
import { API_URL } from '@/lib/api-config';

import React, { useEffect, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import { useTheme } from '@/context/ThemeContext';
import { type OverallMvpConfig, defaultOverallMvpConfig } from '@/context/OverlayConfigContext';
import { useSearchParams } from 'next/navigation';

interface PlayerStat {
    playerKey: string; name: string; teamName: string; killNum: number; damage: number;
    knockouts?: number; survivalTime: number; logoUrl?: string; mvpScore?: number;
}

export default function OverallMvpCardDesign() {
    const { theme, isTransparent: themeTransparent } = useTheme();
    const searchParams = useSearchParams();
    const isTransparent = themeTransparent || searchParams.get('transparent') !== 'false';
    const [fetchedData, setFetchedData] = useState<PlayerStat[]>([]);
    const [config, setConfig] = useState<OverallMvpConfig>(defaultOverallMvpConfig);

    useEffect(() => {
        const saved = localStorage.getItem('strymx_overlay_configs');
        if (saved) { try { const p = JSON.parse(saved); if (p['overall-mvp']) setConfig(prev => ({ ...prev, ...p['overall-mvp'] })); } catch {} }
    }, []);

    useEffect(() => {
        const h = (e: MessageEvent) => {
            if ((e.data?.type === 'strymx_overlay_config' || e.data?.type === 'strymx_batch_update') && e.data.overlayType === 'overall-mvp' && e.data.config) setConfig(prev => ({ ...prev, ...e.data.config }));
        };
        window.addEventListener('message', h); return () => window.removeEventListener('message', h);
    }, []);

    useEffect(() => {
        const socket = io(`${API_URL}`);
        socket.on('match_state_update', (data) => { if (data?.activePlayers) setFetchedData(data.activePlayers); });
        return () => { socket.disconnect(); };
    }, []);

    const [scale, setScale] = useState(1);
    useEffect(() => {
        const h = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080, 1));
        h(); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h);
    }, []);

    const topMvps = useMemo(() => {
        if (!fetchedData.length) return [];
        const valid = fetchedData.filter(p => p.name && p.name !== 'Unknown');
        const tS = valid.reduce((s, p) => s + (p.survivalTime || 0), 0);
        const tD = valid.reduce((s, p) => s + (p.damage || 0), 0);
        const tE = valid.reduce((s, p) => s + (p.killNum || 0), 0);
        return valid.map(p => {
            const sp = tS > 0 ? ((p.survivalTime || 0) / tS) * 0.2 : 0;
            const dp = tD > 0 ? ((p.damage || 0) / tD) * 0.4 : 0;
            const ep = tE > 0 ? ((p.killNum || 0) / tE) * 0.4 : 0;
            return { ...p, mvpScore: (sp + dp + ep) * 100 };
        }).sort((a, b) => (b.mvpScore || 0) - (a.mvpScore || 0)).slice(0, config.playerCount);
    }, [fetchedData, config.playerCount]);

    const display = useMemo(() => {
        const base = [...topMvps];
        while (base.length < config.playerCount) base.push({ playerKey: `d${base.length}`, name: 'WAITING', teamName: '...', killNum: 0, damage: 0, knockouts: 0, survivalTime: 0, mvpScore: 0 });
        return base;
    }, [topMvps, config.playerCount]);

    const formatTime = (s: number) => { const m = Math.floor(s / 60); const sec = s % 60; return `${m}:${sec.toString().padStart(2, '0')}`; };

    return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: 'transparent' }}>
            <div className="relative font-sans text-white overflow-hidden" style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                {!isTransparent && <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />}

                <div className="absolute z-20 flex items-stretch justify-center" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', gap: config.cardGap }}>
                    {display.map((player, idx) => (
                        <div key={player.playerKey || idx} className="group relative flex flex-col overflow-hidden" style={{
                            width: 320, backgroundColor: config.cardBgColor || '#1a1a2e',
                            border: `2px solid ${config.cardBorderColor || '#2d2d44'}`,
                            borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        }}>
                            <div className="absolute top-3 left-3 z-30 flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: config.rankBadgeColor || theme.primary, boxShadow: `0 4px 12px ${theme.primary}60` }}>
                                <span style={{ fontSize: 16, fontWeight: 900, fontStyle: 'italic', color: '#fff' }}>{idx + 1}</span>
                            </div>
                            {player.logoUrl && (
                                <div className="absolute top-3 right-3 z-30" style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', padding: 4 }}>
                                    <img src={player.logoUrl} className="w-full h-full object-contain" alt="" />
                                </div>
                            )}
                                {config.showPlayerPortrait && (
                                    <div className="relative overflow-hidden" style={{ height: 260, background: `linear-gradient(180deg, transparent 0%, ${config.cardBgColor || '#1a1a2e'} 100%)` }}>
                                        <img 
                                            src={`${API_URL}/api/assets/photo?playerKey=${player.playerKey}`} 
                                            onError={e => { 
                                                // If cloud/primary fails, try local agent
                                                if (!e.currentTarget.src.includes('127.0.0.1')) {
                                                    e.currentTarget.src = `http://127.0.0.1:4000/api/assets/photo?playerKey=${player.playerKey}`;
                                                } else {
                                                    e.currentTarget.src = `${API_URL}/images/default.png`; 
                                                }
                                            }} 
                                            className="w-full h-full object-cover object-top" 
                                            style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' }} 
                                            alt="" 
                                        />
                                        <div className="absolute inset-x-0 bottom-0 h-24" style={{ background: `linear-gradient(transparent, ${config.cardBgColor || '#1a1a2e'})` }} />
                                    </div>
                                )}
                            <div className="px-5 pt-2 pb-2">
                                <h3 style={{ fontSize: 20, fontWeight: 900, color: config.playerNameColor || '#fff', textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0 }}>{player.name}</h3>
                                <p style={{ fontSize: 11, fontWeight: 800, color: config.teamNameColor || '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 2 }}>{player.teamName}</p>
                                <div style={{ fontSize: 28, fontWeight: 900, fontStyle: 'italic', color: theme.primary, marginTop: 4 }}>{(player.mvpScore || 0).toFixed(1)} <span style={{ fontSize: 10, fontWeight: 800, color: config.statLabelColor || '#64748b', letterSpacing: '0.2em' }}>RATING</span></div>
                            </div>
                            <div className="px-4 pb-4 flex-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                {config.showElims && <StatCell label="ELIMS" value={String(player.killNum)} color={config.elimsColor || theme.primary} labelColor={config.statLabelColor || '#64748b'} />}
                                {config.showDamage && <StatCell label="DAMAGE" value={String(Math.round(player.damage))} color={config.damageColor || theme.secondary} labelColor={config.statLabelColor || '#64748b'} />}
                                {config.showKnocks && <StatCell label="KNOCKS" value={String(player.knockouts || 0)} color="#fff" labelColor={config.statLabelColor || '#64748b'} />}
                                <StatCell label="SUR. TIME" value={formatTime(player.survivalTime)} color="#fff" labelColor={config.statLabelColor || '#64748b'} mono />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function StatCell({ label, value, color, labelColor, mono }: { label: string; value: string; color: string; labelColor: string; mono?: boolean }) {
    return (
        <div style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 9, fontWeight: 900, color: labelColor, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>{label}</span>
            <span style={{ fontSize: 26, fontWeight: 900, fontStyle: 'italic', color, lineHeight: 1, fontFamily: mono ? 'ui-monospace, monospace' : undefined }}>{value}</span>
        </div>
    );
}
