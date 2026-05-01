"use client"
import { API_URL , WS_URL} from '@/lib/api-config';

import React, { useEffect, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import EditableGraphicElement, {
    clearOverlayLayout, updateElementStyle, updateElementTransform,
    readElementStyle, readElementTransform,
    type ElementTransform, type ElementStyle,
} from './EditableGraphicElement';
import FraggersCardSidebar from './FraggersCardSidebar';
import DesignSwitcher from './DesignSwitcher';
import { getFontById, injectBroadcastFonts } from './broadcastFonts';

const OVERLAY_KEY = 'overall-mvp-cards';
const VIEWPORT = { width: 1920, height: 1080 };
const CARD_COUNT = 5;

interface PlayerStat {
    playerKey: string; name: string; teamName: string; killNum: number; damage: number;
    knockouts?: number; survivalTime: number; logoUrl?: string; mvpScore?: number;
}

const MOCK_PLAYERS: PlayerStat[] = [
    { playerKey: 'm1', name: 'PESMAAZ',  teamName: 'PATRONUM ESP', killNum: 14, damage: 2450, knockouts: 18, survivalTime: 1540, mvpScore: 51.7 },
    { playerKey: 'm2', name: 'MAAZZZ',   teamName: 'PATRONUM ESP', killNum: 12, damage: 2100, knockouts: 15, survivalTime: 1420, mvpScore: 44.1 },
    { playerKey: 'm3', name: 'HASAAN',   teamName: 'PATRONUM',     killNum: 10, damage: 1800, knockouts: 13, survivalTime: 1310, mvpScore: 38.2 },
    { playerKey: 'm4', name: 'STORM',    teamName: 'GOD SQUAD',    killNum: 9,  damage: 1620, knockouts: 11, survivalTime: 1180, mvpScore: 31.5 },
    { playerKey: 'm5', name: 'ACE',      teamName: 'INFINITY',     killNum: 7,  damage: 1440, knockouts: 9,  survivalTime: 1095, mvpScore: 25.8 },
];

const CARD_IDS = Array.from({ length: CARD_COUNT }, (_, i) => `mvpCard${i + 1}`);
const CARD_W = 340, CARD_H = 540, CARD_GAP = 20;
const TOTAL_W = CARD_COUNT * CARD_W + (CARD_COUNT - 1) * CARD_GAP;
const START_X = Math.round((VIEWPORT.width - TOTAL_W) / 2);
const START_Y = Math.round((VIEWPORT.height - CARD_H) / 2);

function defaultCardTransform(i: number): ElementTransform {
    return { x: START_X + i * (CARD_W + CARD_GAP), y: START_Y, width: CARD_W, height: CARD_H };
}

const DEFAULT_STYLE: ElementStyle = {
    bgColor: '#1a1a2e', borderColor: '#2d2d44',
    textColor: '#ffffff', gradientStart: '#e91e63', gradientEnd: '#a3e635',
    shadowColor: '#94a3b8', glowColor: '#64748b',
    fontSize: 20, borderRadius: 16, borderWidth: 2, opacity: 1,
};

function formatTime(s: number) { const m = Math.floor(s / 60); const sec = s % 60; return `${m}:${sec.toString().padStart(2, '0')}`; }

function MvpCardContent({ rank, player, style }: { rank: number; player: PlayerStat; style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'impact');
    const bg = style.bgColor || '#1a1a2e';
    const border = style.borderColor || '#2d2d44';
    const nameColor = style.textColor || '#ffffff';
    const teamColor = style.shadowColor || '#94a3b8';
    const elimsColor = style.gradientStart || '#e91e63';
    const damageColor = style.gradientEnd || '#a3e635';
    const statLabel = style.glowColor || '#64748b';
    const radius = style.borderRadius ?? 16;

    return (
        <div style={{ width: '100%', height: '100%', backgroundColor: bg, border: `${style.borderWidth ?? 2}px solid ${border}`, borderRadius: radius, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 30, width: 36, height: 36, borderRadius: '50%', background: elimsColor, boxShadow: `0 4px 12px ${elimsColor}60`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 900, fontStyle: 'italic', color: '#fff', fontFamily: font?.family }}>{rank}</span>
            </div>
            {player.logoUrl && (
                <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 30, width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', padding: 4 }}>
                    <img src={player.logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" />
                </div>
            )}
            <div style={{ flex: '0 0 50%', position: 'relative', overflow: 'hidden' }}>
                <img src={`${API_URL}/images/${player.playerKey}.png`} onError={e => { (e.currentTarget as HTMLImageElement).src = `${API_URL}/images/default.png`; }} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' }} alt={player.name} />
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(transparent 50%, ${bg} 100%)` }} />
            </div>
            <div style={{ padding: '0 16px' }}>
                <h3 style={{ fontSize: style.fontSize || 20, fontWeight: 900, color: nameColor, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0, fontFamily: font?.family }}>{player.name}</h3>
                <p style={{ fontSize: 10, fontWeight: 800, color: teamColor, textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 2 }}>{player.teamName}</p>
                <div style={{ fontSize: 26, fontWeight: 900, fontStyle: 'italic', color: elimsColor, marginTop: 4, fontFamily: font?.family }}>{(player.mvpScore || 0).toFixed(1)} <span style={{ fontSize: 9, fontWeight: 800, color: statLabel, letterSpacing: '0.2em' }}>RATING</span></div>
            </div>
            <div style={{ padding: '6px 12px 12px', flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <StatMini label="ELIMS" value={String(player.killNum)} color={elimsColor} labelColor={statLabel} font={font?.family} />
                <StatMini label="DAMAGE" value={String(Math.round(player.damage))} color={damageColor} labelColor={statLabel} font={font?.family} />
                <StatMini label="KNOCKS" value={String(player.knockouts || 0)} color={nameColor} labelColor={statLabel} font={font?.family} />
                <StatMini label="SUR. TIME" value={formatTime(player.survivalTime)} color={nameColor} labelColor={statLabel} font={font?.family} mono />
            </div>
        </div>
    );
}

function StatMini({ label, value, color, labelColor, font, mono }: { label: string; value: string; color: string; labelColor: string; font?: string; mono?: boolean }) {
    return (
        <div style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 8, fontWeight: 900, color: labelColor, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>{label}</span>
            <span style={{ fontSize: 24, fontWeight: 900, fontStyle: 'italic', color, lineHeight: 1, fontFamily: mono ? 'ui-monospace, monospace' : font }}>{value}</span>
        </div>
    );
}

export default function OverallMvpCardV2() {
    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [resetCounter, setResetCounter] = useState(0);
    const [styleTick, setStyleTick] = useState(0);
    const [pushCounter, setPushCounter] = useState(0);
    const [canvasScale, setCanvasScale] = useState(1);
    const [fetchedData, setFetchedData] = useState<PlayerStat[]>([]);

    useEffect(() => { injectBroadcastFonts(); }, []);
    useEffect(() => { if (new URLSearchParams(window.location.search).get('edit') === 'true') setEditMode(true); }, []);

    useEffect(() => {
        if (editMode) return;
        const socket = io(WS_URL);
        socket.on('match_state_update', (data) => { if (data?.activePlayers) setFetchedData(data.activePlayers); });
        socket.on('layout_push', (data: { overlayKey: string; layout: Record<string, any> }) => {
            if (data.overlayKey !== OVERLAY_KEY) return;
            Object.entries(data.layout).forEach(([id, config]) => { try { localStorage.setItem(`strymx_layout:${OVERLAY_KEY}:${id}`, JSON.stringify(config)); } catch {} });
            setPushCounter(c => c + 1);
        });
        return () => { socket.disconnect(); };
    }, [editMode]);

    useEffect(() => { const h = (e: StorageEvent) => { if (e.key?.startsWith(`strymx_layout:${OVERLAY_KEY}:`)) setStyleTick(t => t + 1); }; window.addEventListener('storage', h); return () => window.removeEventListener('storage', h); }, []);
    useEffect(() => { if (!editMode) return; const c = () => { setCanvasScale(Math.min((window.innerWidth - 480) / VIEWPORT.width, (window.innerHeight - 80) / VIEWPORT.height, 1)); }; c(); window.addEventListener('resize', c); return () => window.removeEventListener('resize', c); }, [editMode]);

    const topMvps = useMemo(() => {
        if (editMode || !fetchedData.length) return MOCK_PLAYERS;
        const valid = fetchedData.filter(p => p.name && p.name !== 'Unknown');
        const tS = valid.reduce((s, p) => s + (p.survivalTime || 0), 0);
        const tD = valid.reduce((s, p) => s + (p.damage || 0), 0);
        const tE = valid.reduce((s, p) => s + (p.killNum || 0), 0);
        return valid.map(p => {
            const sp = tS > 0 ? ((p.survivalTime || 0) / tS) * 0.2 : 0;
            const dp = tD > 0 ? ((p.damage || 0) / tD) * 0.4 : 0;
            const ep = tE > 0 ? ((p.killNum || 0) / tE) * 0.4 : 0;
            return { ...p, mvpScore: (sp + dp + ep) * 100 };
        }).sort((a, b) => (b.mvpScore || 0) - (a.mvpScore || 0)).slice(0, CARD_COUNT);
    }, [editMode, fetchedData]);

    const padded: PlayerStat[] = Array.from({ length: CARD_COUNT }, (_, i) => topMvps[i] || { playerKey: `e${i}`, name: '—', teamName: '—', killNum: 0, damage: 0, knockouts: 0, survivalTime: 0, mvpScore: 0 });

    const allStyles: Record<string, ElementStyle> = {};
    const allTransforms: Record<string, ElementTransform> = {};
    CARD_IDS.forEach((id, i) => {
        allStyles[id] = { ...DEFAULT_STYLE, ...readElementStyle(OVERLAY_KEY, id) };
        allTransforms[id] = { ...defaultCardTransform(i), ...readElementTransform(OVERLAY_KEY, id) };
    });

    const handleReset = () => { clearOverlayLayout(OVERLAY_KEY); setResetCounter(c => c + 1); setStyleTick(t => t + 1); setSelectedId(null); };
    const handleStyleChangeAll = (patch: Partial<ElementStyle>) => { CARD_IDS.forEach(id => updateElementStyle(OVERLAY_KEY, id, patch)); setStyleTick(t => t + 1); };
    const handleSave = async (): Promise<boolean> => {
        const layout: Record<string, any> = {};
        for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith(`strymx_layout:${OVERLAY_KEY}:`)) { try { layout[k.replace(`strymx_layout:${OVERLAY_KEY}:`, '')] = JSON.parse(localStorage.getItem(k)!); } catch {} } }
        try { return (await fetch(`${API_URL}/api/layouts/push`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ overlayKey: OVERLAY_KEY, layout }) })).ok; } catch { return false; }
    };

    const cls = 'mvp-cards-canvas-bounds';

    const viewportNode = (
        <div className={cls} style={{ width: VIEWPORT.width, height: VIEWPORT.height, overflow: 'hidden', position: 'relative', fontFamily: 'Impact, "Arial Black", system-ui, sans-serif', userSelect: 'none', background: editMode ? 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.7))' : 'transparent', border: editMode ? '2px dashed rgba(59,130,246,0.25)' : undefined, borderRadius: editMode ? 12 : 0 }}>
            {editMode && <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />}
            {editMode && selectedId && <div onClick={() => setSelectedId(null)} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />}

            {CARD_IDS.map((id, idx) => (
                <EditableGraphicElement key={editMode ? `${id}-${resetCounter}` : `${id}-${resetCounter}-${pushCounter}`}
                    id={id} overlayKey={OVERLAY_KEY}
                    defaultTransform={defaultCardTransform(idx)} defaultStyle={DEFAULT_STYLE}
                    editMode={editMode} selected={selectedId === id}
                    onSelect={setSelectedId} label={`MVP #${idx + 1}`}
                    bounds={`.${cls}`} scale={canvasScale}>
                    {(style) => <MvpCardContent rank={idx + 1} player={padded[idx]} style={style} />}
                </EditableGraphicElement>
            ))}
        </div>
    );

    if (!editMode) return <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'transparent' }}>{viewportNode}</div>;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at center, rgba(30,41,59,0.95), rgba(2,6,23,0.98))', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
            <DesignSwitcher currentDesign="cards" overlayPath="/overlay/overall-mvp" />
            <div style={{ position: 'absolute', left: 0, top: 0, right: 400, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, pointerEvents: 'none' }}>
                <div style={{ width: VIEWPORT.width * canvasScale, height: VIEWPORT.height * canvasScale, position: 'relative', pointerEvents: 'auto' }}>
                    <div style={{ width: VIEWPORT.width, height: VIEWPORT.height, transform: `scale(${canvasScale})`, transformOrigin: 'top left' }}>{viewportNode}</div>
                </div>
            </div>
            <FraggersCardSidebar
                cardIds={CARD_IDS.map((id, i) => ({ id, label: `MVP #${i + 1}` }))}
                elementStyles={allStyles} elementTransforms={allTransforms}
                onStyleChange={(id, p) => { updateElementStyle(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onStyleChangeAll={handleStyleChangeAll}
                onTransformChange={(id, p) => { updateElementTransform(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onReset={handleReset} onClose={() => { window.location.href = window.location.pathname; }}
                onSave={handleSave} selectedId={selectedId}
                obsUrlPath="/overlay/overall-mvp?layout=custom&design=cards"
            />
        </div>
    );
}
