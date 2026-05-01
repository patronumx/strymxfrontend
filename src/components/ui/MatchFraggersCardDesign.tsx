import { API_URL } from '@/lib/api-config';
"use client"

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useTheme } from '@/context/ThemeContext';
import { type FraggersConfig, defaultFraggersConfig } from '@/context/OverlayConfigContext';
import { useSearchParams } from 'next/navigation';

interface PlayerStat {
    playerKey: string;
    name: string;
    teamName: string;
    killNum: number;
    damage: number;
    knockouts?: number;
    survivalTime?: string | number;
    logoUrl?: string;
}

/**
 * MatchFraggersCardDesign — Design B (card grid)
 *
 * Shows top fraggers as individual vertical cards in a horizontal row.
 * Each card shows: rank, photo, player name, team name, team logo,
 * and stats (elims, damage, knocks, survival time).
 *
 * Free-tier rendering. Colors from OverlayConfigContext.
 */
export default function MatchFraggersCardDesign() {
    const { theme, isTransparent: themeTransparent } = useTheme();
    const searchParams = useSearchParams();
    const isTransparent = themeTransparent || searchParams.get('transparent') !== 'false';
    const [fetchedData, setFetchedData] = useState<PlayerStat[]>([]);
    const [config, setConfig] = useState<FraggersConfig>(defaultFraggersConfig);

    useEffect(() => {
        const saved = localStorage.getItem('strymx_overlay_configs');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed['match-fraggers']) setConfig(prev => ({ ...prev, ...parsed['match-fraggers'] }));
            } catch {}
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
        playerKey: `dummy-${i}`, name: 'WAITING', teamName: 'FOR DATA', killNum: 0, damage: 0, knockouts: 0, survivalTime: '00:00', logoUrl: ''
    }));

    const formatTime = (s: any) => {
        if (!s) return '00:00';
        if (typeof s === 'string' && s.includes(':')) return s;
        const total = parseInt(s) || 0;
        const mins = Math.floor(total / 60);
        const secs = total % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const cardBg = config.cardBgColor || '#1a1a2e';
    const cardBorder = config.cardBorderColor || '#2d2d44';
    const nameColor = config.playerNameColor || '#ffffff';
    const teamColor = config.teamNameColor || '#94a3b8';
    const elimsColor = config.elimsColor || theme.primary;
    const damageColor = config.damageColor || theme.secondary;
    const statLabel = config.statLabelColor || '#64748b';
    const rankText = config.rankTextColor || '#ffffff';
    const radius = config.cardCornerRadius;

    return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: 'transparent' }}>
            <div
                className="relative font-sans text-white overflow-hidden"
                style={{ width: '1920px', height: '1080px', transform: `scale(${scale})`, transformOrigin: 'top left' }}
            >
                {/* Background pattern */}
                {!isTransparent && (
                    <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
                        style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                )}

                {/* Cards container — horizontally centered */}
                <div
                    className="absolute z-20 flex items-stretch justify-center"
                    style={{
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        gap: config.cardGap,
                    }}
                >
                    {displayFraggers.map((player, idx) => (
                        <div
                            key={player.playerKey || idx}
                            className="group relative flex flex-col overflow-hidden transition-all duration-300"
                            style={{
                                width: 320,
                                backgroundColor: cardBg,
                                border: `2px solid ${cardBorder}`,
                                borderRadius: radius,
                                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                            }}
                        >
                            {/* Rank number badge */}
                            <div
                                className="absolute top-3 left-3 z-30 flex items-center justify-center"
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '50%',
                                    backgroundColor: theme.primary,
                                    boxShadow: `0 4px 12px ${theme.primary}60`,
                                }}
                            >
                                <span style={{
                                    fontSize: 16,
                                    fontWeight: 900,
                                    color: rankText,
                                    fontStyle: 'italic',
                                }}>{idx + 1}</span>
                            </div>

                            {/* Team logo badge */}
                            {player.logoUrl && (
                                <div
                                    className="absolute top-3 right-3 z-30"
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 8,
                                        backgroundColor: 'rgba(255,255,255,0.1)',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        backdropFilter: 'blur(8px)',
                                        padding: 4,
                                    }}
                                >
                                    <img src={player.logoUrl} className="w-full h-full object-contain" alt="" />
                                </div>
                            )}

                            {/* Player photo area */}
                            {config.showPlayerPortrait && (
                                <div
                                    className="relative overflow-hidden"
                                    style={{
                                        height: 280,
                                        background: `linear-gradient(180deg, transparent 0%, ${cardBg} 100%)`,
                                    }}
                                >
                                    <img
                                        src={`${API_URL}/images/${player.playerKey}.png`}
                                        onError={(e) => { e.currentTarget.src = `${API_URL}/images/default.png`; }}
                                        className="w-full h-full object-cover object-top"
                                        alt={player.name}
                                        style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' }}
                                    />
                                    {/* Gradient overlay at bottom */}
                                    <div
                                        className="absolute inset-x-0 bottom-0 h-24"
                                        style={{ background: `linear-gradient(transparent, ${cardBg})` }}
                                    />
                                </div>
                            )}

                            {/* Player name and team */}
                            <div className="px-5 pt-2 pb-3">
                                <h3 style={{
                                    fontSize: 22,
                                    fontWeight: 900,
                                    color: nameColor,
                                    textTransform: 'uppercase',
                                    letterSpacing: '-0.02em',
                                    lineHeight: 1.1,
                                    margin: 0,
                                }}>{player.name}</h3>
                                {config.showTeamName && (
                                    <p style={{
                                        fontSize: 11,
                                        fontWeight: 800,
                                        color: teamColor,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.15em',
                                        marginTop: 2,
                                    }}>{player.teamName.replace(/^scout\s+/i, '')}</p>
                                )}
                            </div>

                            {/* Stats grid */}
                            <div
                                className="px-4 pb-4 flex-1"
                                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}
                            >
                                {config.showElims && (
                                    <StatCell label="ELIMS" value={String(player.killNum)} color={elimsColor} labelColor={statLabel} />
                                )}
                                {config.showDamage && (
                                    <StatCell label="DAMAGE" value={String(Math.round(player.damage))} color={damageColor} labelColor={statLabel} />
                                )}
                                {config.showKnocks && (
                                    <StatCell label="KNOCKS" value={String(player.knockouts || 0)} color={nameColor} labelColor={statLabel} />
                                )}
                                {config.showSurvival && (
                                    <StatCell label="SUR. TIME" value={formatTime(player.survivalTime)} color={nameColor} labelColor={statLabel} mono />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function StatCell({ label, value, color, labelColor, mono }: {
    label: string;
    value: string;
    color: string;
    labelColor: string;
    mono?: boolean;
}) {
    return (
        <div style={{
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
        }}>
            <span style={{
                fontSize: 9,
                fontWeight: 900,
                color: labelColor,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: 4,
            }}>{label}</span>
            <span style={{
                fontSize: 28,
                fontWeight: 900,
                fontStyle: 'italic',
                color: color,
                lineHeight: 1,
                fontFamily: mono ? 'ui-monospace, monospace' : undefined,
            }}>{value}</span>
        </div>
    );
}
