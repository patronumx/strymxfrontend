import { API_URL } from '@/lib/api-config';
"use client"

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
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
import MatchSummaryEditSidebar, { type StatCardDef } from './MatchSummaryEditSidebar';
import { getFontById, injectBroadcastFonts } from './broadcastFonts';

import airdropImg from '@/assets/AIRDROP.png';
import eliminationsImg from '@/assets/Eliminations.png';
import grenadeImg from '@/assets/GRENADE.png';
import headshotsImg from '@/assets/Headshots.png';
import panImg from '@/assets/PAN.png';
import smokesImg from '@/assets/SMOKES & NADES.png';
import uazImg from '@/assets/UAZ.png';

const OVERLAY_KEY = 'match-summary';
const VIEWPORT = { width: 1920, height: 1080 };

// Stat card definitions (id matches the element id in storage)
interface StatCardDefinition extends StatCardDef {
    img: { src: string };
    getValue: (stats: Record<string, number>) => number;
}

const STAT_DEFINITIONS: StatCardDefinition[] = [
    { id: 'statTotalKills',  label: 'Total Kills',     img: eliminationsImg, getValue: s => s.totalKills },
    { id: 'statTotalKnocks', label: 'Total Knocks',    img: panImg,          getValue: s => s.totalKnocks },
    { id: 'statHeadshots',   label: 'Total Headshots', img: headshotsImg,    getValue: s => s.totalHeadshots },
    { id: 'statSmokesNades', label: 'Smokes & Nades',  img: smokesImg,       getValue: s => s.smokesAndNades },
    { id: 'statVehicleKills',label: 'Vehicle Kills',   img: uazImg,          getValue: s => s.vehicleKills },
    { id: 'statGrenadeKills',label: 'Grenade Kills',   img: grenadeImg,      getValue: s => s.grenadeKills },
    { id: 'statAirdrops',    label: 'Airdrops Looted', img: airdropImg,      getValue: s => s.airdropLooted },
];

// Default positions: 7 cards in a row, centered horizontally near bottom
const CARD_WIDTH = 200;
const CARD_HEIGHT = 320;
const CARD_GAP = 18;
const TOTAL_WIDTH = STAT_DEFINITIONS.length * CARD_WIDTH + (STAT_DEFINITIONS.length - 1) * CARD_GAP;
const START_X = Math.round((VIEWPORT.width - TOTAL_WIDTH) / 2);
const START_Y = 660;

function defaultTransformFor(index: number): ElementTransform {
    return {
        x: START_X + index * (CARD_WIDTH + CARD_GAP),
        y: START_Y,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
    };
}

const DEFAULT_STYLE: ElementStyle = {
    bgColor: '#0f172a',
    borderColor: '#a3e635',
    gradientStart: '#e91e63',   // header bar bg
    gradientEnd: '#a3e635',     // value bar bg
    textColor: '#ffffff',       // header text
    shadowColor: '#e91e63',     // value text
    glowColor: '#e91e63',
    fontSize: 16,
    borderRadius: 0,
    borderWidth: 4,
    opacity: 1,
};

// Mock stats for edit mode
const MOCK_STATS = {
    totalKills: 88, totalKnocks: 142, totalHeadshots: 35,
    smokesAndNades: 210, vehicleKills: 9, grenadeKills: 14, airdropLooted: 6,
};

interface StatCardProps {
    title: string;
    value: number;
    imgSrc: string;
    style: ElementStyle;
}

function StatCardContent({ title, value, imgSrc, style }: StatCardProps) {
    const font = getFontById(style.fontFamily || 'impact');
    const bgColor = style.bgColor || '#0f172a';
    const borderColor = style.borderColor || '#a3e635';
    const headerBg = style.gradientStart || '#e91e63';
    const headerText = style.textColor || '#ffffff';
    const valueBgStart = style.gradientEnd || '#a3e635';
    const valueBgEnd = (style.gradientEnd || '#a3e635') + 'cc';
    const valueText = style.shadowColor || '#e91e63';
    const glowColor = style.glowColor || '#e91e63';
    const borderRadius = style.borderRadius ?? 0;
    const borderWidth = style.borderWidth ?? 4;

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderRadius,
                boxShadow: '0 15px 50px rgba(0,0,0,0.5)',
            }}
        >
            {/* Icon area */}
            <div
                style={{
                    flex: '1 1 50%',
                    minHeight: 0,
                    background: bgColor,
                    borderBottom: `${borderWidth}px solid ${borderColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                }}
            >
                <img
                    src={imgSrc}
                    alt={title}
                    style={{
                        height: '60%', width: 'auto', objectFit: 'contain',
                        filter: `drop-shadow(0 0 15px ${glowColor})`,
                    }}
                />
            </div>

            {/* Header bar */}
            <div
                style={{
                    background: headerBg,
                    padding: '10px 8px',
                    textAlign: 'center',
                    borderBottom: '1px solid rgba(0,0,0,0.25)',
                }}
            >
                <span
                    style={{
                        fontSize: style.fontSize || 14,
                        fontWeight: 900,
                        color: headerText,
                        letterSpacing: '0.25em',
                        textTransform: 'uppercase',
                        fontFamily: font?.family,
                        display: 'inline-block',
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                    }}
                >
                    {title}
                </span>
            </div>

            {/* Value bar */}
            <div
                style={{
                    flex: '0 0 38%',
                    background: `linear-gradient(to top right, ${valueBgEnd}, ${valueBgStart})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px 4px',
                }}
            >
                <span
                    style={{
                        fontSize: 64,
                        fontWeight: 900,
                        fontStyle: 'italic',
                        color: valueText,
                        fontFamily: font?.family,
                        lineHeight: 1,
                        textShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    }}
                >
                    {String(value).padStart(3, '0')}
                </span>
            </div>
        </div>
    );
}

export default function MatchSummaryGraphicV2() {
    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [resetCounter, setResetCounter] = useState(0);
    const [styleTick, setStyleTick] = useState(0);
    // Bumps only when a layout_push socket event arrives (output mode).
    // Included in element keys to force remount + re-read of fresh localStorage.
    const [pushCounter, setPushCounter] = useState(0);
    const [canvasScale, setCanvasScale] = useState(1);
    const [fetchedData, setFetchedData] = useState<any[]>([]);
    const lastDataRef = useRef<string>('');

    useEffect(() => { injectBroadcastFonts(); }, []);

    // Detect ?edit=true
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('edit') === 'true') setEditMode(true);
    }, []);

    // Live data socket (skipped in edit mode — we use MOCK_STATS)
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
        if (editMode) return;
        const socket = io(`http://${window.location.hostname}:4000`);
        socket.on('match_state_update', handleUpdate);

        // Listen for premium layout pushes from the Edit Layout tool.
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
            // Bump pushCounter — this is included in each element's key,
            // forcing remount so they re-read fresh localStorage on next render.
            setPushCounter(c => c + 1);
        });

        return () => { socket.disconnect(); };
    }, [editMode, handleUpdate]);

    // Listen for storage updates so sidebar edits re-render the canvas
    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key?.startsWith(`strymx_layout:${OVERLAY_KEY}:`)) setStyleTick(t => t + 1);
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    // Canvas scale-to-fit when in edit mode
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

    // Compute real stats from telemetry
    const realStats = useMemo(() => {
        const stats = {
            totalKills: 0, totalKnocks: 0, totalHeadshots: 0,
            smokesAndNades: 0, vehicleKills: 0, grenadeKills: 0, airdropLooted: 0,
        };
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

    const statsToShow = editMode ? MOCK_STATS : realStats;

    // Build merged styles/transforms for sidebar consumption
    const allElementStyles: Record<string, ElementStyle> = {};
    const allElementTransforms: Record<string, ElementTransform> = {};
    STAT_DEFINITIONS.forEach((def, idx) => {
        const savedStyle = readElementStyle(OVERLAY_KEY, def.id);
        const savedTransform = readElementTransform(OVERLAY_KEY, def.id);
        allElementStyles[def.id] = { ...DEFAULT_STYLE, ...savedStyle };
        allElementTransforms[def.id] = { ...defaultTransformFor(idx), ...savedTransform };
    });

    const handleReset = () => {
        clearOverlayLayout(OVERLAY_KEY);
        setResetCounter(c => c + 1);
        setStyleTick(t => t + 1);
        setSelectedId(null);
    };

    const handleStyleChangeAll = (patch: Partial<ElementStyle>) => {
        STAT_DEFINITIONS.forEach(def => {
            updateElementStyle(OVERLAY_KEY, def.id, patch);
        });
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

    const canvasBoundsClass = 'match-summary-canvas-bounds';

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

            {STAT_DEFINITIONS.map((def, idx) => {
                const defaultT = defaultTransformFor(idx);
                const value = def.getValue(statsToShow);
                return (
                    <EditableGraphicElement
                        key={editMode
                            ? `${def.id}-${resetCounter}`
                            : `${def.id}-${resetCounter}-${pushCounter}`}
                        id={def.id}
                        overlayKey={OVERLAY_KEY}
                        defaultTransform={defaultT}
                        defaultStyle={DEFAULT_STYLE}
                        editMode={editMode}
                        selected={selectedId === def.id}
                        onSelect={setSelectedId}
                        label={def.label}
                        bounds={`.${canvasBoundsClass}`}
                        scale={canvasScale}
                    >
                        {(style) => (
                            <StatCardContent
                                title={style.text || def.label}
                                value={value}
                                imgSrc={def.img.src}
                                style={style}
                            />
                        )}
                    </EditableGraphicElement>
                );
            })}
        </div>
    );

    // OUTPUT MODE — render at native 1920×1080, no frame
    if (!editMode) {
        return (
            <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'transparent' }}>
                {viewportNode}
            </div>
        );
    }

    // EDIT MODE — scaled canvas + sidebar
    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(30,41,59,0.95), rgba(2,6,23,0.98))',
            overflow: 'hidden',
            fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
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

            <MatchSummaryEditSidebar
                statCards={STAT_DEFINITIONS.map(d => ({ id: d.id, label: d.label }))}
                elementStyles={allElementStyles}
                elementTransforms={allElementTransforms}
                onStyleChange={(id, patch) => {
                    updateElementStyle(OVERLAY_KEY, id, patch);
                    setStyleTick(t => t + 1);
                }}
                onStyleChangeAll={handleStyleChangeAll}
                onTransformChange={(id, patch) => {
                    updateElementTransform(OVERLAY_KEY, id, patch);
                    setStyleTick(t => t + 1);
                }}
                onReset={handleReset}
                onClose={() => { window.location.href = window.location.pathname; }}
                onSave={handleSaveAndPush}
                selectedId={selectedId}
                obsUrlPath="/overlay/match-summary?layout=custom"
            />
        </div>
    );
}
