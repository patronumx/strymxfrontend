"use client"
import { API_URL } from '@/lib/api-config';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Clock, Target, TrendingUp } from 'lucide-react';
import EditableGraphicElement, {
    clearOverlayLayout,
    updateElementStyle,
    updateElementTransform,
    readElementStyle,
    readElementTransform,
    type ElementTransform,
    type ElementStyle,
} from './EditableGraphicElement';
import MatchFraggersEditSidebar from './MatchFraggersEditSidebar';
import DesignSwitcher from './DesignSwitcher';
import { getFontById, injectBroadcastFonts } from './broadcastFonts';

const OVERLAY_KEY = 'match-fraggers';
const VIEWPORT = { width: 1920, height: 1080 };
const ROW_COUNT = 5;

interface PlayerStat {
    playerKey: string;
    name: string;
    teamName: string;
    killNum: number;
    damage: number;
    survivalTime?: string;
    logoUrl?: string;
}

const MOCK_PLAYERS: PlayerStat[] = [
    { playerKey: 'm1', name: 'HASAAN',  teamName: 'STX', killNum: 14, damage: 2150, survivalTime: '24:15' },
    { playerKey: 'm2', name: 'PESMAAZ', teamName: 'PAT', killNum: 12, damage: 1980, survivalTime: '22:48' },
    { playerKey: 'm3', name: 'KHILARI', teamName: 'NXG', killNum: 11, damage: 1720, survivalTime: '21:02' },
    { playerKey: 'm4', name: 'STORM',   teamName: 'GOD', killNum: 10, damage: 1600, survivalTime: '19:55' },
    { playerKey: 'm5', name: 'ACE',     teamName: 'I8',  killNum: 9,  damage: 1430, survivalTime: '18:22' },
];

const ROW_IDS = Array.from({ length: ROW_COUNT }, (_, i) => `fraggerRow${i + 1}`);
const HEADER_ID = 'fraggerHeader';

const HEADER_DEFAULT_TRANSFORM: ElementTransform = { x: 80, y: 60, width: 1000, height: 220 };
const ROW_DEFAULT_WIDTH = 1400;
const ROW_DEFAULT_HEIGHT = 140;
const ROW_START_Y = 320;
const ROW_GAP = 20;

function defaultRowTransform(index: number): ElementTransform {
    return {
        x: Math.round((VIEWPORT.width - ROW_DEFAULT_WIDTH) / 2),
        y: ROW_START_Y + index * (ROW_DEFAULT_HEIGHT + ROW_GAP),
        width: ROW_DEFAULT_WIDTH,
        height: ROW_DEFAULT_HEIGHT,
    };
}

const DEFAULT_ROW_STYLE: ElementStyle = {
    bgColor: '#0a0a0c',
    borderColor: '#1e293b',
    textColor: '#ffffff',        // rank
    gradientStart: '#ffffff',    // player name
    gradientEnd: '#94a3b8',      // team name
    shadowColor: '#1a1a2e',      // stats bg
    glowColor: '#e91e63',        // damage accent
    fontSize: 36,
    borderRadius: 12,
    borderWidth: 2,
    opacity: 1,
};

const DEFAULT_HEADER_STYLE: ElementStyle = {
    textColor: '#ffffff',
    gradientStart: '#e91e63',
    gradientEnd: '#a3e635',
    fontSize: 96,
    text: 'MATCH FRAGGERS',
};

function formatTime(s: any) {
    if (!s) return '00:00';
    if (typeof s === 'string' && s.includes(':')) return s;
    const total = parseInt(s) || 0;
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function FraggerRowCard({ rank, player, style }: { rank: number; player: PlayerStat; style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'impact');
    const bgColor = style.bgColor || '#0a0a0c';
    const borderColor = style.borderColor || '#1e293b';
    const rankColor = style.textColor || '#ffffff';
    const nameColor = style.gradientStart || '#ffffff';
    const teamColor = style.gradientEnd || '#94a3b8';
    const statsBg = style.shadowColor || '#1a1a2e';
    const accentColor = style.glowColor || '#e91e63';
    const radius = style.borderRadius ?? 12;
    const borderWidth = style.borderWidth ?? 2;

    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: bgColor,
            border: `${borderWidth}px solid ${borderColor}`,
            borderRadius: radius,
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            overflow: 'hidden',
        }}>
            {/* Rank */}
            <div style={{
                width: 120,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRight: '1px solid rgba(255,255,255,0.08)',
                flexShrink: 0,
            }}>
                <span style={{
                    fontSize: 11, fontWeight: 900, color: '#64748b',
                    letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 2,
                }}>RANK</span>
                <span style={{
                    fontSize: 56, fontWeight: 900, fontStyle: 'italic',
                    color: rankColor, lineHeight: 1,
                    fontFamily: font?.family,
                    textShadow: '0 0 15px rgba(255,255,255,0.15)',
                }}>#{rank}</span>
            </div>

            {/* Portrait */}
            <div style={{
                width: 140, height: '100%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
            }}>
                <img
                    src={`${API_URL}/images/${player.playerKey}.png`}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    style={{
                        height: '140%', width: 'auto', objectFit: 'contain',
                        objectPosition: 'bottom', marginTop: 60,
                        filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))',
                    }}
                    alt={player.name}
                />
            </div>

            {/* Identity */}
            <div style={{
                flex: 1.8, minWidth: 0, padding: '0 24px',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4,
            }}>
                <span style={{
                    fontSize: 17, fontWeight: 900,
                    color: teamColor, letterSpacing: '0.1em',
                    textTransform: 'uppercase', fontFamily: font?.family,
                }}>{player.teamName}</span>
                <h2 style={{
                    fontSize: style.fontSize || 36,
                    fontWeight: 900, fontStyle: 'italic',
                    color: nameColor, letterSpacing: '-0.02em',
                    lineHeight: 1, fontFamily: font?.family,
                    margin: 0, textTransform: 'uppercase',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                }}>{player.name}</h2>
            </div>

            {/* Stats Panel */}
            <div style={{
                flex: 2.2, height: '75%', margin: '0 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                padding: '0 20px', borderRadius: 14,
                backgroundColor: statsBg,
                borderLeft: '1px solid rgba(255,255,255,0.12)',
            }}>
                <StatColumn
                    icon={<TrendingUp size={14} color={accentColor} />}
                    label="DAMAGE"
                    value={String(Math.round(player.damage))}
                    valueColor="#ffffff"
                    font={font?.family}
                />
                <div style={{ width: 1, height: 50, background: 'rgba(255,255,255,0.2)' }} />
                <StatColumn
                    icon={<Target size={14} color="#a3e635" />}
                    label="ELIMS"
                    value={String(player.killNum)}
                    valueColor="#a3e635"
                    font={font?.family}
                />
                <div style={{ width: 1, height: 50, background: 'rgba(255,255,255,0.2)' }} />
                <StatColumn
                    icon={<Clock size={14} color="#ffffff" />}
                    label="SUR. TIME"
                    value={formatTime(player.survivalTime)}
                    valueColor="#ffffff"
                    font={font?.family}
                    mono
                />
            </div>
        </div>
    );
}

function StatColumn({ icon, label, value, valueColor, font, mono }: {
    icon: React.ReactNode; label: string; value: string; valueColor: string; font?: string; mono?: boolean;
}) {
    return (
        <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 4,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {icon}
                <span style={{
                    fontSize: 10, fontWeight: 900, color: '#f1f5f9',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>{label}</span>
            </div>
            <span style={{
                fontSize: 42, fontWeight: 900, fontStyle: 'italic',
                color: valueColor, lineHeight: 1,
                fontFamily: mono ? 'ui-monospace, monospace' : (font || 'Impact'),
                letterSpacing: '-0.02em',
            }}>{value}</span>
        </div>
    );
}

function FraggerHeaderBlock({ style }: { style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'impact');
    const titleColor = style.textColor || '#ffffff';
    const accentColor = style.gradientStart || '#e91e63';
    const highlightColor = style.gradientEnd || '#a3e635';
    const titleText = style.text || 'MATCH FRAGGERS';
    const fontSize = style.fontSize || 96;

    // Split title into two words for a highlighted second word
    const words = titleText.split(' ');
    const firstWord = words.length > 1 ? words.slice(0, -1).join(' ') : titleText;
    const secondWord = words.length > 1 ? words[words.length - 1] : '';

    return (
        <div style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            padding: 16,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6 }}>
                <div style={{
                    height: 4, width: 80, borderRadius: 2,
                    backgroundColor: accentColor,
                    boxShadow: `0 0 12px ${accentColor}`,
                }} />
                <span style={{
                    fontSize: 18, fontWeight: 900, color: accentColor,
                    letterSpacing: '0.4em', textTransform: 'uppercase',
                    fontFamily: font?.family,
                }}>LIVE</span>
            </div>
            <h1 style={{
                fontSize, fontWeight: 900, fontStyle: 'italic',
                color: titleColor, letterSpacing: '-0.04em', lineHeight: 0.9,
                textTransform: 'uppercase', margin: 0,
                fontFamily: font?.family,
                textShadow: '0 6px 20px rgba(0,0,0,0.6)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
                {firstWord}
                {secondWord && <> <span style={{ color: highlightColor }}>{secondWord}</span></>}
            </h1>
        </div>
    );
}

export default function MatchFraggersGraphicV2() {
    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [resetCounter, setResetCounter] = useState(0);
    const [styleTick, setStyleTick] = useState(0);
    // Bumps only when a layout_push socket event arrives (output mode)
    const [pushCounter, setPushCounter] = useState(0);
    const [canvasScale, setCanvasScale] = useState(1);
    const [fetchedData, setFetchedData] = useState<PlayerStat[]>([]);

    useEffect(() => { injectBroadcastFonts(); }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('edit') === 'true') setEditMode(true);
    }, []);

    useEffect(() => {
        if (editMode) return;
        const socket = io(`http://${window.location.hostname}:4000`);
        socket.on('match_state_update', (data) => {
            if (data && data.activePlayers) setFetchedData(data.activePlayers);
        });

        // Listen for premium layout pushes from the Edit Layout tool
        socket.on('layout_push', (data: { overlayKey: string; layout: Record<string, any> }) => {
            if (data.overlayKey !== OVERLAY_KEY) return;
            console.log(`[LAYOUT RECV] Applying ${Object.keys(data.layout).length} elements for ${OVERLAY_KEY}`);
            Object.entries(data.layout).forEach(([elementId, config]) => {
                const key = `strymx_layout:${OVERLAY_KEY}:${elementId}`;
                try {
                    localStorage.setItem(key, JSON.stringify(config));
                } catch (err) {
                    console.error('Failed to apply pushed layout', err);
                }
            });
            setPushCounter(c => c + 1);
        });

        return () => { socket.disconnect(); };
    }, [editMode]);

    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key?.startsWith(`strymx_layout:${OVERLAY_KEY}:`)) setStyleTick(t => t + 1);
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    useEffect(() => {
        if (!editMode) return;
        const compute = () => {
            const SIDEBAR_WIDTH = 400;
            const MARGIN = 80;
            const availW = Math.max(300, window.innerWidth - SIDEBAR_WIDTH - MARGIN);
            const availH = Math.max(200, window.innerHeight - MARGIN);
            setCanvasScale(Math.min(availW / VIEWPORT.width, availH / VIEWPORT.height, 1));
        };
        compute();
        window.addEventListener('resize', compute);
        return () => window.removeEventListener('resize', compute);
    }, [editMode]);

    const topFraggers = useMemo(() => {
        if (editMode || !fetchedData || fetchedData.length === 0) return MOCK_PLAYERS;
        return [...fetchedData]
            .filter(p => p.name && p.name !== 'Unknown')
            .sort((a, b) => {
                if (b.killNum !== a.killNum) return b.killNum - a.killNum;
                if (b.damage !== a.damage) return b.damage - a.damage;
                return (a.name || '').localeCompare(b.name || '');
            })
            .slice(0, ROW_COUNT);
    }, [editMode, fetchedData]);

    // Pad with empty slots if fewer than ROW_COUNT players
    const paddedPlayers: PlayerStat[] = Array.from({ length: ROW_COUNT }, (_, i) =>
        topFraggers[i] || { playerKey: `empty-${i}`, name: '—', teamName: '—', killNum: 0, damage: 0, survivalTime: '00:00' }
    );

    const allElementStyles: Record<string, ElementStyle> = {};
    const allElementTransforms: Record<string, ElementTransform> = {};

    allElementStyles[HEADER_ID] = { ...DEFAULT_HEADER_STYLE, ...readElementStyle(OVERLAY_KEY, HEADER_ID) };
    allElementTransforms[HEADER_ID] = { ...HEADER_DEFAULT_TRANSFORM, ...readElementTransform(OVERLAY_KEY, HEADER_ID) };

    ROW_IDS.forEach((id, idx) => {
        allElementStyles[id] = { ...DEFAULT_ROW_STYLE, ...readElementStyle(OVERLAY_KEY, id) };
        allElementTransforms[id] = { ...defaultRowTransform(idx), ...readElementTransform(OVERLAY_KEY, id) };
    });

    const handleReset = () => {
        clearOverlayLayout(OVERLAY_KEY);
        setResetCounter(c => c + 1);
        setStyleTick(t => t + 1);
        setSelectedId(null);
    };

    const handleStyleChangeAllRows = (patch: Partial<ElementStyle>) => {
        ROW_IDS.forEach(id => updateElementStyle(OVERLAY_KEY, id, patch));
        setStyleTick(t => t + 1);
    };

    /** Gather the current layout from localStorage and push it to all overlay clients */
    const handleSaveAndPush = async (): Promise<boolean> => {
        const layout: Record<string, any> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(`strymx_layout:${OVERLAY_KEY}:`)) {
                const elementId = key.replace(`strymx_layout:${OVERLAY_KEY}:`, '');
                try {
                    layout[elementId] = JSON.parse(localStorage.getItem(key) || '{}');
                } catch { /* ignore */ }
            }
        }
        try {
            const res = await fetch(`${API_URL}/api/layouts/push`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ overlayKey: OVERLAY_KEY, layout }),
            });
            return res.ok;
        } catch {
            return false;
        }
    };

    const canvasBoundsClass = 'match-fraggers-canvas-bounds';

    const viewportNode = (
        <div
            className={canvasBoundsClass}
            style={{
                width: VIEWPORT.width,
                height: VIEWPORT.height,
                overflow: 'hidden',
                position: 'relative',
                fontFamily: 'Impact, "Arial Black", system-ui, sans-serif',
                userSelect: 'none',
                background: editMode ? 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.7))' : 'transparent',
                border: editMode ? '2px dashed rgba(59,130,246,0.25)' : undefined,
                borderRadius: editMode ? 12 : 0,
            }}
        >
            {editMode && (
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)',
                    backgroundSize: '40px 40px', pointerEvents: 'none',
                }} />
            )}

            {editMode && selectedId && (
                <div onClick={() => setSelectedId(null)} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
            )}

            {/* Header */}
            <EditableGraphicElement
                id={HEADER_ID}
                overlayKey={OVERLAY_KEY}
                defaultTransform={HEADER_DEFAULT_TRANSFORM}
                defaultStyle={DEFAULT_HEADER_STYLE}
                editMode={editMode}
                selected={selectedId === HEADER_ID}
                onSelect={setSelectedId}
                label="Header Block"
                bounds={`.${canvasBoundsClass}`}
                scale={canvasScale}
                key={editMode
                    ? `${HEADER_ID}-${resetCounter}`
                    : `${HEADER_ID}-${resetCounter}-${pushCounter}`}
            >
                {(style) => <FraggerHeaderBlock style={style} />}
            </EditableGraphicElement>

            {/* Player Rows */}
            {ROW_IDS.map((rowId, idx) => (
                <EditableGraphicElement
                    key={editMode
                        ? `${rowId}-${resetCounter}`
                        : `${rowId}-${resetCounter}-${pushCounter}`}
                    id={rowId}
                    overlayKey={OVERLAY_KEY}
                    defaultTransform={defaultRowTransform(idx)}
                    defaultStyle={DEFAULT_ROW_STYLE}
                    editMode={editMode}
                    selected={selectedId === rowId}
                    onSelect={setSelectedId}
                    label={`Rank #${idx + 1}`}
                    bounds={`.${canvasBoundsClass}`}
                    scale={canvasScale}
                >
                    {(style) => <FraggerRowCard rank={idx + 1} player={paddedPlayers[idx]} style={style} />}
                </EditableGraphicElement>
            ))}
        </div>
    );

    if (!editMode) {
        return (
            <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'transparent' }}>
                {viewportNode}
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(30,41,59,0.95), rgba(2,6,23,0.98))',
            overflow: 'hidden',
            fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
            <DesignSwitcher currentDesign="classic" overlayPath="/overlay/match-fraggers" />
            <div style={{
                position: 'absolute', left: 0, top: 0, right: 400, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 20, pointerEvents: 'none',
            }}>
                <div style={{
                    width: VIEWPORT.width * canvasScale,
                    height: VIEWPORT.height * canvasScale,
                    position: 'relative', pointerEvents: 'auto',
                }}>
                    <div style={{
                        width: VIEWPORT.width, height: VIEWPORT.height,
                        transform: `scale(${canvasScale})`, transformOrigin: 'top left',
                    }}>
                        {viewportNode}
                    </div>
                </div>
            </div>

            <MatchFraggersEditSidebar
                rows={ROW_IDS.map((id, i) => ({ id, label: `Rank #${i + 1}` }))}
                headerId={HEADER_ID}
                elementStyles={allElementStyles}
                elementTransforms={allElementTransforms}
                onStyleChange={(id, patch) => {
                    updateElementStyle(OVERLAY_KEY, id, patch);
                    setStyleTick(t => t + 1);
                }}
                onStyleChangeAllRows={handleStyleChangeAllRows}
                onTransformChange={(id, patch) => {
                    updateElementTransform(OVERLAY_KEY, id, patch);
                    setStyleTick(t => t + 1);
                }}
                onReset={handleReset}
                onClose={() => { window.location.href = window.location.pathname; }}
                onSave={handleSaveAndPush}
                selectedId={selectedId}
                obsUrlPath="/overlay/match-fraggers?layout=custom"
            />
        </div>
    );
}
