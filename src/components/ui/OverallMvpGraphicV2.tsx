"use client"

import React, { useEffect, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
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

const OVERLAY_KEY = 'overall-mvp';
const VIEWPORT = { width: 1920, height: 1080 };
const ROW_COUNT = 5;

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

const MOCK_PLAYERS: PlayerStat[] = [
    { playerKey: 'm1', name: 'PESMAAZ', teamName: 'PATRONUM ESP', killNum: 14, damage: 2450, survivalTime: 1540, mvpScore: 51.7 },
    { playerKey: 'm2', name: 'MAAZZZ',  teamName: 'PATRONUM ESP', killNum: 12, damage: 2100, survivalTime: 1420, mvpScore: 44.1 },
    { playerKey: 'm3', name: 'HASAAN',  teamName: 'PATRONUM',     killNum: 10, damage: 1800, survivalTime: 1310, mvpScore: 38.2 },
    { playerKey: 'm4', name: 'STORM',   teamName: 'GOD SQUAD',    killNum: 9,  damage: 1620, survivalTime: 1180, mvpScore: 31.5 },
    { playerKey: 'm5', name: 'ACE',     teamName: 'INFINITY',     killNum: 7,  damage: 1440, survivalTime: 1095, mvpScore: 25.8 },
];

const ROW_IDS = Array.from({ length: ROW_COUNT }, (_, i) => `mvpRow${i + 1}`);
const HEADER_ID = 'mvpHeader';

const HEADER_DEFAULT_TRANSFORM: ElementTransform = { x: 60, y: 40, width: 1400, height: 180 };
const ROW_W = 1400, ROW_H = 130, ROW_GAP = 16, ROW_START = 260;

function defaultRowTransform(i: number): ElementTransform {
    return {
        x: Math.round((VIEWPORT.width - ROW_W) / 2),
        y: ROW_START + i * (ROW_H + ROW_GAP),
        width: ROW_W,
        height: ROW_H,
    };
}

const DEFAULT_ROW_STYLE: ElementStyle = {
    bgColor: '#0a0a0c',
    borderColor: '#1e293b',
    textColor: '#ffffff',        // rank #
    gradientStart: '#e91e63',    // rank box bg
    gradientEnd: '#94a3b8',      // team name
    shadowColor: '#a3e635',      // stats panel bg
    glowColor: '#ffffff',        // value colors
    fontSize: 38,
    borderRadius: 0,
    borderWidth: 0,
    opacity: 1,
};

const DEFAULT_HEADER_STYLE: ElementStyle = {
    textColor: '#ffffff',
    gradientStart: '#a3e635',
    gradientEnd: '#a3e635',
    fontSize: 100,
    text: 'OVERALL MVP LIST',
};

function formatSurvival(s: number) {
    const total = Math.floor(s || 0);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function MvpRowCard({ rank, player, style }: { rank: number; player: PlayerStat; style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'impact');
    const rankBg = style.gradientStart || '#e91e63';
    const statsBg = style.shadowColor || '#a3e635';
    const teamColor = style.gradientEnd || '#94a3b8';
    const nameColor = '#e91e63';

    return (
        <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'stretch',
            overflow: 'hidden',
            borderRadius: style.borderRadius ?? 0,
            boxShadow: '0 15px 40px rgba(0,0,0,0.5)',
        }}>
            {/* Rank box */}
            <div style={{
                width: 120, background: rankBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRight: '4px solid rgba(255,255,255,0.2)',
                flexShrink: 0,
            }}>
                <span style={{
                    fontSize: 56, fontWeight: 900, fontStyle: 'italic',
                    color: style.textColor || '#ffffff',
                    lineHeight: 1, letterSpacing: '-0.04em',
                    fontFamily: font?.family,
                    textShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}>#{rank}</span>
            </div>

            {/* Photo */}
            <div style={{
                width: 160, background: '#ffffff',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                position: 'relative', overflow: 'hidden',
                flexShrink: 0,
            }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 10, background: '#a3e635' }} />
                <img
                    src={`http://localhost:4000/images/${player.playerKey}.png`}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    style={{ height: '140%', width: 'auto', objectFit: 'contain', marginTop: 40 }}
                    alt={player.name}
                />
            </div>

            {/* Identity */}
            <div style={{
                flex: 1.8, minWidth: 0, padding: '0 30px',
                background: '#ffffff',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4,
            }}>
                <span style={{
                    fontSize: 18, fontWeight: 900, color: teamColor,
                    letterSpacing: '0.15em', textTransform: 'uppercase',
                    fontFamily: font?.family,
                }}>{player.teamName.replace(/^scout\s+/i, '')}</span>
                <h2 style={{
                    fontSize: style.fontSize || 38,
                    fontWeight: 900, fontStyle: 'italic',
                    color: nameColor, letterSpacing: '-0.03em',
                    lineHeight: 0.9, margin: 0, textTransform: 'uppercase',
                    fontFamily: font?.family,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{player.name}</h2>
            </div>

            {/* Stats panel (slanted green) */}
            <div style={{
                flex: 1, position: 'relative', display: 'flex',
                alignItems: 'center',
            }}>
                <div style={{
                    position: 'absolute', inset: 0, left: -30, right: 0,
                    background: statsBg,
                    transform: 'skewX(-10deg)',
                    transformOrigin: 'top left',
                }} />
                <div style={{
                    position: 'relative', flex: 1, height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-around',
                    padding: '0 20px', zIndex: 2,
                }}>
                    <StatColumn label="RATING" value={player.mvpScore !== undefined ? player.mvpScore.toFixed(1) : '0.0'} font={font?.family} />
                    <div style={{ width: 2, height: 50, background: 'rgba(0,0,0,0.12)' }} />
                    <StatColumn label="ELIMS" value={String(player.killNum)} font={font?.family} />
                    <div style={{ width: 2, height: 50, background: 'rgba(0,0,0,0.12)' }} />
                    <StatColumn label="SUR. TIME" value={formatSurvival(player.survivalTime)} font={font?.family} mono />
                </div>
            </div>
        </div>
    );
}

function StatColumn({ label, value, font, mono }: { label: string; value: string; font?: string; mono?: boolean }) {
    return (
        <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
        }}>
            <span style={{
                fontSize: 11, fontWeight: 900, color: '#00000099',
                letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4,
            }}>{label}</span>
            <span style={{
                fontSize: 42, fontWeight: 900, fontStyle: 'italic',
                color: '#e91e63', lineHeight: 1,
                fontFamily: mono ? 'ui-monospace, monospace' : font,
                letterSpacing: '-0.04em',
            }}>{value}</span>
        </div>
    );
}

function MvpHeaderBlock({ style }: { style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'impact');
    const titleText = style.text || 'OVERALL MVP LIST';
    const words = titleText.split(' ');
    const first = words.length > 1 ? words.slice(0, -1).join(' ') : titleText;
    const last = words.length > 1 ? words[words.length - 1] : '';

    return (
        <div style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            padding: 16,
        }}>
            <h1 style={{
                fontSize: style.fontSize || 100,
                fontWeight: 900, fontStyle: 'italic',
                color: style.textColor || '#ffffff',
                letterSpacing: '-0.04em', lineHeight: 0.9,
                textTransform: 'uppercase', margin: 0,
                fontFamily: font?.family,
                textShadow: '0 8px 28px rgba(0,0,0,0.6)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
                {first}
                {last && <> <span style={{ color: style.gradientStart || '#a3e635' }}>{last}</span></>}
            </h1>
        </div>
    );
}

export default function OverallMvpGraphicV2() {
    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [resetCounter, setResetCounter] = useState(0);
    const [styleTick, setStyleTick] = useState(0);
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
        socket.on('layout_push', (data: { overlayKey: string; layout: Record<string, any> }) => {
            if (data.overlayKey !== OVERLAY_KEY) return;
            console.log(`[LAYOUT RECV] Applying ${Object.keys(data.layout).length} elements for ${OVERLAY_KEY}`);
            Object.entries(data.layout).forEach(([elementId, config]) => {
                const key = `strymx_layout:${OVERLAY_KEY}:${elementId}`;
                try { localStorage.setItem(key, JSON.stringify(config)); } catch {}
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
            const availW = Math.max(300, window.innerWidth - 400 - 80);
            const availH = Math.max(200, window.innerHeight - 80);
            setCanvasScale(Math.min(availW / VIEWPORT.width, availH / VIEWPORT.height, 1));
        };
        compute();
        window.addEventListener('resize', compute);
        return () => window.removeEventListener('resize', compute);
    }, [editMode]);

    const topMvps = useMemo(() => {
        if (editMode) return MOCK_PLAYERS;
        if (!fetchedData || fetchedData.length === 0) return MOCK_PLAYERS;
        const valid = fetchedData.filter(p => p.name && p.name !== 'Unknown');
        const totalSurv = valid.reduce((s, p) => s + (p.survivalTime || 0), 0);
        const totalDmg = valid.reduce((s, p) => s + (p.damage || 0), 0);
        const totalElims = valid.reduce((s, p) => s + (p.killNum || 0), 0);
        const scored = valid.map(p => {
            const sp = totalSurv > 0 ? ((p.survivalTime || 0) / totalSurv) * 0.2 : 0;
            const dp = totalDmg > 0 ? ((p.damage || 0) / totalDmg) * 0.4 : 0;
            const ep = totalElims > 0 ? ((p.killNum || 0) / totalElims) * 0.4 : 0;
            return { ...p, mvpScore: (sp + dp + ep) * 100 };
        });
        return scored.sort((a, b) => (b.mvpScore || 0) - (a.mvpScore || 0)).slice(0, ROW_COUNT);
    }, [editMode, fetchedData]);

    const padded: PlayerStat[] = Array.from({ length: ROW_COUNT }, (_, i) =>
        topMvps[i] || { playerKey: `empty-${i}`, name: '—', teamName: '—', killNum: 0, damage: 0, survivalTime: 0, mvpScore: 0 }
    );

    const allElementStyles: Record<string, ElementStyle> = {};
    const allElementTransforms: Record<string, ElementTransform> = {};
    allElementStyles[HEADER_ID] = { ...DEFAULT_HEADER_STYLE, ...readElementStyle(OVERLAY_KEY, HEADER_ID) };
    allElementTransforms[HEADER_ID] = { ...HEADER_DEFAULT_TRANSFORM, ...readElementTransform(OVERLAY_KEY, HEADER_ID) };
    ROW_IDS.forEach((id, i) => {
        allElementStyles[id] = { ...DEFAULT_ROW_STYLE, ...readElementStyle(OVERLAY_KEY, id) };
        allElementTransforms[id] = { ...defaultRowTransform(i), ...readElementTransform(OVERLAY_KEY, id) };
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

    const handleSaveAndPush = async (): Promise<boolean> => {
        const layout: Record<string, any> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(`strymx_layout:${OVERLAY_KEY}:`)) {
                const elementId = key.replace(`strymx_layout:${OVERLAY_KEY}:`, '');
                try { layout[elementId] = JSON.parse(localStorage.getItem(key) || '{}'); } catch {}
            }
        }
        try {
            const res = await fetch('http://localhost:4000/api/layouts/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ overlayKey: OVERLAY_KEY, layout }),
            });
            return res.ok;
        } catch { return false; }
    };

    const canvasBoundsClass = 'overall-mvp-canvas-bounds';

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

            <EditableGraphicElement
                key={editMode ? `${HEADER_ID}-${resetCounter}` : `${HEADER_ID}-${resetCounter}-${pushCounter}`}
                id={HEADER_ID} overlayKey={OVERLAY_KEY}
                defaultTransform={HEADER_DEFAULT_TRANSFORM}
                defaultStyle={DEFAULT_HEADER_STYLE}
                editMode={editMode} selected={selectedId === HEADER_ID}
                onSelect={setSelectedId} label="Header Block"
                bounds={`.${canvasBoundsClass}`} scale={canvasScale}
            >
                {(style) => <MvpHeaderBlock style={style} />}
            </EditableGraphicElement>

            {ROW_IDS.map((rowId, idx) => (
                <EditableGraphicElement
                    key={editMode ? `${rowId}-${resetCounter}` : `${rowId}-${resetCounter}-${pushCounter}`}
                    id={rowId} overlayKey={OVERLAY_KEY}
                    defaultTransform={defaultRowTransform(idx)}
                    defaultStyle={DEFAULT_ROW_STYLE}
                    editMode={editMode} selected={selectedId === rowId}
                    onSelect={setSelectedId} label={`Rank #${idx + 1}`}
                    bounds={`.${canvasBoundsClass}`} scale={canvasScale}
                >
                    {(style) => <MvpRowCard rank={idx + 1} player={padded[idx]} style={style} />}
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
            <DesignSwitcher currentDesign="classic" overlayPath="/overlay/overall-mvp" />
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
                obsUrlPath="/overlay/overall-mvp?layout=custom"
            />
        </div>
    );
}
