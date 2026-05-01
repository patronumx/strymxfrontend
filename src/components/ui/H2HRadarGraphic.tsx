"use client"
import { API_URL } from '@/lib/api-config';
import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { io } from 'socket.io-client';
import { useSearchParams } from 'next/navigation';
import { type HeadToHeadConfig, defaultHeadToHeadConfig } from '@/context/OverlayConfigContext';

export interface RadarPlayerStat {
    playerKey: string;
    name: string;
    teamName: string;
    killNum: number;
    damage: number;
    headShotNum: number;
    assists: number;
    survivalTime: number;
    knockNum?: number;
    logoUrl?: string;
    photoUrl?: string;
}

// ── Pentagon radar SVG ──────────────────────────────────────────────────────
export function PentagonRadar({
    p1Stats,
    p2Stats,
    axes,
    size = 380,
    chartBg,
}: {
    p1Stats: number[];
    p2Stats: number[];
    axes: { label: string; v1: string; v2: string }[];
    size: number;
    chartBg?: string;
}) {
    const cx = size / 2;
    const cy = size / 2;
    const maxR = size * 0.37;
    const P1_COLOR = '#FF3D60';
    const P2_COLOR = '#FFD700';
    const BG_COLOR = chartBg || '#0A5F5F';

    function pt(pct: number, idx: number) {
        const angle = -Math.PI / 2 + idx * (2 * Math.PI / 5);
        const r = (Math.max(0, Math.min(100, pct)) / 100) * maxR;
        return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    }
    function poly(stats: number[]) {
        return stats.map((v, i) => { const p = pt(v, i); return `${p.x},${p.y}`; }).join(' ');
    }
    function gridPoly(pct: number) {
        return Array.from({ length: 5 }, (_, i) => { const p = pt(pct, i); return `${p.x},${p.y}`; }).join(' ');
    }
    const outerPts = Array.from({ length: 5 }, (_, i) => {
        const angle = -Math.PI / 2 + i * (2 * Math.PI / 5);
        return { x: cx + maxR * Math.cos(angle), y: cy + maxR * Math.sin(angle) };
    });
    const labelPts = Array.from({ length: 5 }, (_, i) => {
        const angle = -Math.PI / 2 + i * (2 * Math.PI / 5);
        const r = maxR + 52;
        return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    });

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
            <polygon points={gridPoly(100)} fill={BG_COLOR} stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
            {[33, 66].map(p => (
                <polygon key={p} points={gridPoly(p)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            ))}
            {outerPts.map((v, i) => (
                <line key={i} x1={cx} y1={cy} x2={v.x} y2={v.y} stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
            ))}
            <polygon points={poly(p1Stats)} fill="none" stroke={P1_COLOR} strokeWidth="2.5" strokeLinejoin="round" />
            <polygon points={poly(p2Stats)} fill="none" stroke={P2_COLOR} strokeWidth="2.5" strokeLinejoin="round" />
            {p1Stats.map((v, i) => { const p = pt(v, i); return <circle key={`p1-${i}`} cx={p.x} cy={p.y} r={4} fill={P1_COLOR} />; })}
            {p2Stats.map((v, i) => { const p = pt(v, i); return <circle key={`p2-${i}`} cx={p.x} cy={p.y} r={4} fill={P2_COLOR} />; })}
            {labelPts.map((lp, i) => {
                const isLeft = lp.x < cx - 10;
                const isRight = lp.x > cx + 10;
                const anchor = isLeft ? 'end' : isRight ? 'start' : 'middle';
                const a = axes[i];
                if (i === 0) {
                    return (
                        <g key={i}>
                            <text x={lp.x} y={lp.y - 10} textAnchor="middle" fontSize="11" fontWeight="900" fontFamily="monospace">
                                <tspan fill={P1_COLOR}>{a.v1}</tspan>
                                <tspan fill="rgba(255,255,255,0.5)"> - </tspan>
                                <tspan fill={P2_COLOR}>{a.v2}</tspan>
                            </text>
                            <text x={lp.x} y={lp.y + 6} textAnchor="middle" fontSize="8" fontWeight="800"
                                fill="rgba(255,255,255,0.6)" fontFamily="sans-serif" letterSpacing="1">
                                {a.label.toUpperCase()}
                            </text>
                        </g>
                    );
                }
                return (
                    <g key={i}>
                        <text x={lp.x} y={lp.y - 10} textAnchor={anchor} fontSize="11" fontWeight="900" fill={P1_COLOR} fontFamily="monospace">{a.v1}</text>
                        <text x={lp.x} y={lp.y + 4} textAnchor={anchor} fontSize="8" fontWeight="800" fill="rgba(255,255,255,0.55)" fontFamily="sans-serif" letterSpacing="1">{a.label.toUpperCase()}</text>
                        <text x={lp.x} y={lp.y + 17} textAnchor={anchor} fontSize="11" fontWeight="900" fill={P2_COLOR} fontFamily="monospace">{a.v2}</text>
                    </g>
                );
            })}
        </svg>
    );
}

// ── Player card ─────────────────────────────────────────────────────────────
export function PlayerCard({
    player, side, backendHost, config,
}: {
    player: RadarPlayerStat;
    side: 'left' | 'right';
    backendHost: string;
    config: HeadToHeadConfig;
}) {
    const isDummy = player.playerKey?.startsWith('dummy') || player.playerKey?.startsWith('m');
    const photoSrc = player.photoUrl || (!isDummy ? `${API_URL}/images/${player.playerKey}.png` : null);
    const logoSrc  = player.logoUrl  || (!isDummy ? `${API_URL}/logos/${player.teamName}.png`  : null);
    const [imgFailed,  setImgFailed]  = useState(false);
    const [logoFailed, setLogoFailed] = useState(false);
    const accentColor  = config.vsBadgeColor  || '#FF3D60';
    const nameColor    = config.playerNameColor || '#E91E63';
    const mvpBgColor   = config.cardBorderColor || '#0ABABA';

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
            {/* Photo — fills all but bottom 18% (footer 10% + mvp row 8%) */}
            <div style={{ position: 'absolute', inset: 0, bottom: '18%' }}>
                {config.showPlayerPortrait && photoSrc && !imgFailed ? (
                    <img src={photoSrc} alt="" onError={() => setImgFailed(true)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center',
                            transform: side === 'right' ? 'scaleX(-1)' : undefined }} />
                ) : (
                    <div style={{ width: '100%', height: '100%', background: `${accentColor}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 120, fontWeight: 900, fontStyle: 'italic', color: `${accentColor}30` }}>
                            {player.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                    </div>
                )}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
                    background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.25))' }} />
            </div>

            {/* Corner triangle */}
            <div style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0,
                borderTop: `48px solid ${accentColor}`, borderLeft: '48px solid transparent' }} />

            {/* Footer — logo + name (10% height, sits above MVP row) */}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: '8%', height: '10%',
                background: config.cardBgColor && config.cardBgColor !== '#0a0a0c' ? config.cardBgColor : '#ffffff',
                display: 'flex', alignItems: 'center', paddingLeft: 12, paddingRight: 12, gap: 10 }}>
                {!logoFailed && logoSrc ? (
                    <img src={logoSrc} alt="" onError={() => setLogoFailed(true)}
                        style={{ height: '70%', width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
                ) : (
                    <div style={{ width: 36, height: 36, background: '#eee', borderRadius: 4, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 14, fontWeight: 900, color: '#999' }}>?</span>
                    </div>
                )}
                <span style={{ fontSize: 22, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase',
                    color: nameColor, letterSpacing: '-0.02em', lineHeight: 1,
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1 }}>
                    {player.name || 'PLAYER NAME'}
                </span>
            </div>

            {/* MVP row — 8% height, pinned to bottom */}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '8%', display: 'flex' }}>
                <div style={{ flex: 1, background: mvpBgColor, display: 'flex', alignItems: 'center', paddingLeft: 14 }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        MVP TIMES
                    </span>
                </div>
                <div style={{ width: 60, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 24, fontWeight: 900, color: '#1a1a1a' }}>{player.killNum ?? 0}</span>
                </div>
            </div>

            {/* Border */}
            <div style={{ position: 'absolute', inset: 0, border: `2px solid ${accentColor}40`, pointerEvents: 'none' }} />
        </div>
    );
}

// ── Pure canvas — accepts props, no socket/localStorage ─────────────────────
export function H2HRadarCanvas({
    p1,
    p2,
    config,
    transparent = false,
    backendHost = 'localhost',
    scale = 1,
}: {
    p1: RadarPlayerStat;
    p2: RadarPlayerStat;
    config: HeadToHeadConfig;
    transparent?: boolean;
    backendHost?: string;
    scale?: number;
}) {
    const fmtTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${String(Math.round(s % 60)).padStart(2, '0')}`;
    const fmtPct  = (v: number, total: number) => total > 0 ? `${Math.round((v / total) * 100)}%` : '0%';

    const totalKills = (p1.killNum ?? 0) + (p2.killNum ?? 0);
    const totalHs    = (p1.headShotNum ?? 0) + (p2.headShotNum ?? 0);

    const axes = [
        { label: 'AVG. ELIMINATIONS', v1: p1.killNum ?? 0,    v2: p2.killNum ?? 0,    fmt: (v: number) => fmtPct(v, totalKills || 1) },
        { label: 'TEAM CONTRIB.',     v1: p1.headShotNum ?? 0, v2: p2.headShotNum ?? 0, fmt: (v: number) => fmtPct(v, totalHs || 1) },
        { label: 'LONGEST ELIM.',     v1: p1.assists ?? 0,     v2: p2.assists ?? 0,     fmt: (v: number) => `${v}m` },
        { label: 'AVG. SURVIVAL',     v1: p1.survivalTime ?? 0, v2: p2.survivalTime ?? 0, fmt: (v: number) => fmtTime(v) },
        { label: 'AVG. DAMAGE',       v1: p1.damage ?? 0,      v2: p2.damage ?? 0,      fmt: (v: number) => Math.round(v).toString().padStart(4, '0') },
    ];

    const radarNorm = axes.map(a => {
        const mx = Math.max(a.v1, a.v2, 0.001);
        return { norm1: (a.v1 / mx) * 100, norm2: (a.v2 / mx) * 100 };
    });
    const radarAxes = axes.map(a => ({ label: a.label, v1: a.fmt(a.v1), v2: a.fmt(a.v2) }));

    const CARD_W = 380, CARD_H = 700, RADAR_SIZE = 420;

    const bgStyle = transparent
        ? 'transparent'
        : 'linear-gradient(135deg, #0A9090 0%, #0CC0C0 40%, #08A0A0 100%)';

    return (
        <div style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: 'top left',
            position: 'relative', overflow: 'hidden', background: bgStyle }}>

            {!transparent && (
                <div style={{ position: 'absolute', inset: 0,
                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
                    backgroundSize: '40px 40px' }} />
            )}

            {/* Left card */}
            <div style={{ position: 'absolute', left: 40, top: (1080 - CARD_H) / 2, width: CARD_W, height: CARD_H }}>
                <PlayerCard player={p1} side="left" backendHost={backendHost} config={config} />
            </div>

            {/* Right card */}
            <div style={{ position: 'absolute', right: 40, top: (1080 - CARD_H) / 2, width: CARD_W, height: CARD_H }}>
                <PlayerCard player={p2} side="right" backendHost={backendHost} config={config} />
            </div>

            {/* Center */}
            <div style={{ position: 'absolute', left: CARD_W + 40, right: CARD_W + 40, top: 0, bottom: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

                {config.showHeader && (
                    <div style={{ marginBottom: 16, textAlign: 'center' }}>
                        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.3em',
                            color: transparent ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.7)',
                            textTransform: 'uppercase', marginBottom: 4 }}>
                            {config.headerSubtitle || 'MATCH COMPARISON'}
                        </p>
                        <h1 style={{ fontSize: 52, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase',
                            color: config.headerTextColor || '#fff', lineHeight: 1, letterSpacing: '-0.03em', margin: 0 }}>
                            HEAD <span style={{ color: config.vsBadgeColor || '#FF3D60' }}>VS</span> HEAD
                        </h1>
                    </div>
                )}

                <PentagonRadar
                    p1Stats={radarNorm.map(r => r.norm1)}
                    p2Stats={radarNorm.map(r => r.norm2)}
                    axes={radarAxes}
                    size={RADAR_SIZE}
                    chartBg={config.cardBgColor !== '#0a0a0c' ? config.cardBgColor : undefined}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 18, height: 3, background: '#FF3D60', borderRadius: 2 }} />
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#FF3D60', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            {p1.name || 'PLAYER 1'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 18, height: 3, background: '#FFD700', borderRadius: 2 }} />
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#FFD700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            {p2.name || 'PLAYER 2'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Live mode — reads socket + localStorage ──────────────────────────────────
function H2HRadarContent() {
    const searchParams = useSearchParams();
    const isTransparent = searchParams.get('transparent') === 'true';

    const [fetchedData, setFetchedData] = useState<RadarPlayerStat[]>([]);
    const [backendHost, setBackendHost] = useState('localhost');
    const [config, setConfig] = useState<HeadToHeadConfig>(defaultHeadToHeadConfig);
    const [scale, setScale] = useState(1);

    useEffect(() => { setBackendHost(window.location.hostname || 'localhost'); }, []);

    useEffect(() => {
        const saved = localStorage.getItem('strymx_overlay_configs');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed['head-to-head']) setConfig(prev => ({ ...prev, ...parsed['head-to-head'] }));
            } catch { }
        }
    }, []);

    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if ((e.data?.type === 'strymx_overlay_config' || e.data?.type === 'strymx_batch_update')
                && e.data.overlayType === 'head-to-head' && e.data.config) {
                setConfig(prev => ({ ...prev, ...e.data.config }));
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    useEffect(() => {
        const socket = io(`${API_URL}`);
        socket.on('match_state_update', (data) => {
            if (data?.activePlayers) setFetchedData(data.activePlayers);
        });
        return () => { socket.disconnect(); };
    }, []);

    useEffect(() => {
        const resize = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080, 1));
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    const displayPlayers = useMemo(() => {
        const valid = (fetchedData || []).filter(p => p.name && p.name !== 'Unknown');
        const sorted = [...valid].sort((a, b) => (b.killNum ?? 0) - (a.killNum ?? 0));
        const final = sorted.slice(0, 2);
        while (final.length < 2) {
            final.push({ playerKey: `dummy-${final.length}`, name: 'PLAYER NAME', teamName: '...', killNum: 0, damage: 0, headShotNum: 0, assists: 0, survivalTime: 0 });
        }
        return final;
    }, [fetchedData]);

    return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'transparent' }}>
            <H2HRadarCanvas
                p1={displayPlayers[0]}
                p2={displayPlayers[1]}
                config={config}
                transparent={isTransparent}
                backendHost={backendHost}
                scale={scale}
            />
        </div>
    );
}

export default function H2HRadarGraphic() {
    return (
        <Suspense fallback={<div style={{ background: 'transparent', width: '100vw', height: '100vh' }} />}>
            <H2HRadarContent />
        </Suspense>
    );
}
