"use client"

import React, { useEffect, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import { Crown } from 'lucide-react';
import EditableGraphicElement, {
    clearOverlayLayout, updateElementStyle, updateElementTransform,
    readElementStyle, readElementTransform,
    type ElementTransform, type ElementStyle,
} from './EditableGraphicElement';
import MatchSummaryEditSidebar from './MatchSummaryEditSidebar';
import { getFontById, injectBroadcastFonts } from './broadcastFonts';

const OVERLAY_KEY = 'wwcd-stats';
const VIEWPORT = { width: 1920, height: 1080 };

interface PlayerStat { playerKey: string; name: string; teamName: string; killNum: number; damage: number; survivalTime: number; rank?: number; logoUrl?: string; }

const MOCK_PLAYERS: PlayerStat[] = [
    { playerKey: 'm1', name: 'PESMAAZ', teamName: 'PATRONUM', killNum: 6, damage: 980, survivalTime: 1540, rank: 1 },
    { playerKey: 'm2', name: 'MAAZZZ',  teamName: 'PATRONUM', killNum: 4, damage: 720, survivalTime: 1540, rank: 1 },
    { playerKey: 'm3', name: 'HASAAN',  teamName: 'PATRONUM', killNum: 3, damage: 550, survivalTime: 1540, rank: 1 },
    { playerKey: 'm4', name: 'STORM',   teamName: 'PATRONUM', killNum: 2, damage: 410, survivalTime: 1540, rank: 1 },
];

const BLOCK_IDS = {
    header: 'wwcdHeader',
    player1: 'wwcdP1', player2: 'wwcdP2', player3: 'wwcdP3', player4: 'wwcdP4',
};
const ALL_IDS = Object.values(BLOCK_IDS);

const DEFAULTS: Record<string, { transform: ElementTransform; style: ElementStyle }> = {
    [BLOCK_IDS.header]:  { transform: { x: 560, y: 60, width: 800, height: 180 }, style: { textColor: '#ffffff', gradientStart: '#eab308', fontSize: 90, text: 'WINNER WINNER CHICKEN DINNER', fontFamily: 'ttlakes', fontWeight: 700, fontStyle: 'normal' } },
    [BLOCK_IDS.player1]: { transform: { x: 160, y: 300, width: 380, height: 600 }, style: { bgColor: '#0f172a', borderColor: '#eab308', textColor: '#ffffff', gradientStart: '#eab308', fontSize: 24, fontFamily: 'ttlakes', fontWeight: 700, fontStyle: 'normal' } },
    [BLOCK_IDS.player2]: { transform: { x: 570, y: 300, width: 380, height: 600 }, style: { bgColor: '#0f172a', borderColor: '#eab308', textColor: '#ffffff', gradientStart: '#eab308', fontSize: 24, fontFamily: 'ttlakes', fontWeight: 700, fontStyle: 'normal' } },
    [BLOCK_IDS.player3]: { transform: { x: 980, y: 300, width: 380, height: 600 }, style: { bgColor: '#0f172a', borderColor: '#eab308', textColor: '#ffffff', gradientStart: '#eab308', fontSize: 24, fontFamily: 'ttlakes', fontWeight: 700, fontStyle: 'normal' } },
    [BLOCK_IDS.player4]: { transform: { x: 1390, y: 300, width: 380, height: 600 }, style: { bgColor: '#0f172a', borderColor: '#eab308', textColor: '#ffffff', gradientStart: '#eab308', fontSize: 24, fontFamily: 'ttlakes', fontWeight: 700, fontStyle: 'normal' } },
};

function WwcdPlayerCard({ player, style }: { player: PlayerStat; style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'ttlakes');
    const bg = style.bgColor || '#0f172a';
    const border = style.borderColor || '#eab308';
    const accent = style.gradientStart || '#eab308';
    const textColor = style.textColor || '#ffffff';
    const fontSize = style.fontSize || 24;

    return (
        <div style={{ width: '100%', height: '100%', background: bg, border: `3px solid ${border}`, borderRadius: style.borderRadius ?? 16, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                <img src={`http://localhost:4000/images/${player.playerKey}.png`} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} style={{ height: '130%', width: 'auto', objectFit: 'contain', marginTop: 60, filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' }} alt={player.name} />
            </div>
            <div style={{ padding: '16px 20px', borderTop: `3px solid ${border}`, background: `linear-gradient(135deg, ${bg}, rgba(15,23,42,0.9))` }}>
                <h3 style={{ fontSize, fontWeight: style.fontWeight || 700, fontStyle: style.fontStyle || 'normal', color: accent, fontFamily: font?.family, margin: 0, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1 }}>{player.name}</h3>
                <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                    <div><span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.15em', textTransform: 'uppercase' }}>ELIMS</span><div style={{ fontSize: 32, fontWeight: style.fontWeight || 700, fontStyle: style.fontStyle || 'normal', color: textColor, fontFamily: font?.family, lineHeight: 1 }}>{player.killNum}</div></div>
                    <div><span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.15em', textTransform: 'uppercase' }}>DMG</span><div style={{ fontSize: 32, fontWeight: style.fontWeight || 700, fontStyle: style.fontStyle || 'normal', color: textColor, fontFamily: font?.family, lineHeight: 1 }}>{Math.round(player.damage)}</div></div>
                </div>
            </div>
        </div>
    );
}

function WwcdHeaderBlock({ style }: { style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'ttlakes');
    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Crown size={40} color={style.gradientStart || '#eab308'} style={{ marginBottom: 10, filter: `drop-shadow(0 0 20px ${style.gradientStart || '#eab308'})` }} />
            <h1 style={{ fontSize: style.fontSize || 90, fontWeight: style.fontWeight || 700, fontStyle: style.fontStyle || 'normal', color: style.textColor || '#ffffff', fontFamily: font?.family, textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 0.85, textAlign: 'center', margin: 0, textShadow: `0 6px 24px rgba(0,0,0,0.5)` }}>
                {(style.text || 'CHICKEN DINNER').split(' ').map((w, i, arr) => i === arr.length - 1 ? <span key={i} style={{ color: style.gradientStart || '#eab308' }}>{w}</span> : <span key={i}>{w} </span>)}
            </h1>
        </div>
    );
}

export default function WwcdGraphicV2() {
    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [resetCounter, setResetCounter] = useState(0);
    const [styleTick, setStyleTick] = useState(0);
    const [pushCounter, setPushCounter] = useState(0);
    const [canvasScale, setCanvasScale] = useState(1);
    const [fetchedData, setFetchedData] = useState<PlayerStat[]>([]);

    useEffect(() => { injectBroadcastFonts(); }, []);
    useEffect(() => { const p = new URLSearchParams(window.location.search); if (p.get('edit') === 'true') setEditMode(true); }, []);

    useEffect(() => {
        if (editMode) return;
        const socket = io(`http://${window.location.hostname}:4000`);
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

    const wwcdPlayers = useMemo(() => {
        if (editMode) return MOCK_PLAYERS;
        if (!fetchedData.length) return MOCK_PLAYERS;
        const wwcd = fetchedData.filter(p => p.rank === 1 && p.name && p.name !== 'Unknown').sort((a, b) => b.killNum - a.killNum).slice(0, 4);
        return wwcd.length > 0 ? wwcd : MOCK_PLAYERS;
    }, [editMode, fetchedData]);

    const padded = Array.from({ length: 4 }, (_, i) => wwcdPlayers[i] || { playerKey: `e${i}`, name: '—', teamName: '—', killNum: 0, damage: 0, survivalTime: 0 });

    const allStyles: Record<string, ElementStyle> = {};
    const allTransforms: Record<string, ElementTransform> = {};
    ALL_IDS.forEach(id => { allStyles[id] = { ...DEFAULTS[id].style, ...readElementStyle(OVERLAY_KEY, id) }; allTransforms[id] = { ...DEFAULTS[id].transform, ...readElementTransform(OVERLAY_KEY, id) }; });

    const handleReset = () => { clearOverlayLayout(OVERLAY_KEY); setResetCounter(c => c + 1); setStyleTick(t => t + 1); setSelectedId(null); };
    const handleStyleChangeAll = (patch: Partial<ElementStyle>) => { ALL_IDS.forEach(id => updateElementStyle(OVERLAY_KEY, id, patch)); setStyleTick(t => t + 1); };
    const handleSave = async (): Promise<boolean> => { const layout: Record<string, any> = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith(`strymx_layout:${OVERLAY_KEY}:`)) { try { layout[k.replace(`strymx_layout:${OVERLAY_KEY}:`, '')] = JSON.parse(localStorage.getItem(k)!); } catch {} } } try { return (await fetch('http://localhost:4000/api/layouts/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ overlayKey: OVERLAY_KEY, layout }) })).ok; } catch { return false; } };

    const cls = 'wwcd-canvas-bounds';
    const playerBlockIds = [BLOCK_IDS.player1, BLOCK_IDS.player2, BLOCK_IDS.player3, BLOCK_IDS.player4];

    const viewportNode = (
        <div className={cls} style={{ width: VIEWPORT.width, height: VIEWPORT.height, overflow: 'hidden', position: 'relative', fontFamily: 'Impact, "Arial Black", system-ui, sans-serif', userSelect: 'none', background: editMode ? 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.7))' : 'transparent', border: editMode ? '2px dashed rgba(59,130,246,0.25)' : undefined, borderRadius: editMode ? 12 : 0 }}>
            {editMode && <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />}
            {editMode && selectedId && <div onClick={() => setSelectedId(null)} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />}

            <EditableGraphicElement key={editMode ? `h-${resetCounter}` : `h-${resetCounter}-${pushCounter}`} id={BLOCK_IDS.header} overlayKey={OVERLAY_KEY} defaultTransform={DEFAULTS[BLOCK_IDS.header].transform} defaultStyle={DEFAULTS[BLOCK_IDS.header].style} editMode={editMode} selected={selectedId === BLOCK_IDS.header} onSelect={setSelectedId} label="Header" bounds={`.${cls}`} scale={canvasScale}>
                {(s) => <WwcdHeaderBlock style={s} />}
            </EditableGraphicElement>

            {playerBlockIds.map((id, idx) => (
                <EditableGraphicElement key={editMode ? `${id}-${resetCounter}` : `${id}-${resetCounter}-${pushCounter}`} id={id} overlayKey={OVERLAY_KEY} defaultTransform={DEFAULTS[id].transform} defaultStyle={DEFAULTS[id].style} editMode={editMode} selected={selectedId === id} onSelect={setSelectedId} label={`Player ${idx + 1}`} bounds={`.${cls}`} scale={canvasScale}>
                    {(s) => <WwcdPlayerCard player={padded[idx]} style={s} />}
                </EditableGraphicElement>
            ))}
        </div>
    );

    if (!editMode) return <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'transparent' }}>{viewportNode}</div>;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at center, rgba(30,41,59,0.95), rgba(2,6,23,0.98))', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, right: 400, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, pointerEvents: 'none' }}>
                <div style={{ width: VIEWPORT.width * canvasScale, height: VIEWPORT.height * canvasScale, position: 'relative', pointerEvents: 'auto' }}>
                    <div style={{ width: VIEWPORT.width, height: VIEWPORT.height, transform: `scale(${canvasScale})`, transformOrigin: 'top left' }}>{viewportNode}</div>
                </div>
            </div>
            <MatchSummaryEditSidebar
                statCards={[{ id: BLOCK_IDS.header, label: 'Header' }, { id: BLOCK_IDS.player1, label: 'Player 1' }, { id: BLOCK_IDS.player2, label: 'Player 2' }, { id: BLOCK_IDS.player3, label: 'Player 3' }, { id: BLOCK_IDS.player4, label: 'Player 4' }]}
                elementStyles={allStyles} elementTransforms={allTransforms}
                onStyleChange={(id, p) => { updateElementStyle(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onStyleChangeAll={handleStyleChangeAll}
                onTransformChange={(id, p) => { updateElementTransform(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onReset={handleReset} onClose={() => { window.location.href = window.location.pathname; }}
                onSave={handleSave} selectedId={selectedId} obsUrlPath="/overlays/wwcd?layout=custom&design=v2"
                currentDesign="v2"
                onDesignChange={(d) => { window.location.href = `/overlays/wwcd?edit=true&design=${d}`; }}
            />
        </div>
    );
}
