"use client"

import React, { useEffect, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import { Swords } from 'lucide-react';
import EditableGraphicElement, {
    clearOverlayLayout, updateElementStyle, updateElementTransform,
    readElementStyle, readElementTransform,
    type ElementTransform, type ElementStyle,
} from './EditableGraphicElement';
import MatchSummaryEditSidebar from './MatchSummaryEditSidebar';
import { getFontById, injectBroadcastFonts } from './broadcastFonts';

const OVERLAY_KEY = 'head-to-head';
const VIEWPORT = { width: 1920, height: 1080 };

interface PlayerStat { playerKey: string; name: string; teamName: string; killNum: number; damage: number; headShotNum: number; survivalTime: number; logoUrl?: string; }

const MOCK_P1: PlayerStat = { playerKey: 'm1', name: 'PESMAAZ', teamName: 'PATRONUM ESP', killNum: 14, damage: 2450, headShotNum: 6, survivalTime: 1540 };
const MOCK_P2: PlayerStat = { playerKey: 'm2', name: 'MAAZZZ', teamName: 'PATRONUM ESP', killNum: 12, damage: 2100, headShotNum: 4, survivalTime: 1420 };

const BLOCK_IDS = { header: 'h2hHeader', player1: 'h2hP1', vsBadge: 'h2hVs', player2: 'h2hP2' };
const ALL_IDS = Object.values(BLOCK_IDS);

const DEFAULTS: Record<string, { transform: ElementTransform; style: ElementStyle }> = {
    [BLOCK_IDS.header]:  { transform: { x: 560, y: 40, width: 800, height: 140 }, style: { textColor: '#ffffff', gradientStart: '#e91e63', gradientEnd: '#a3e635', fontSize: 80, text: 'HEAD TO HEAD' } },
    [BLOCK_IDS.player1]: { transform: { x: 80, y: 220, width: 780, height: 740 }, style: { bgColor: '#0f172a', borderColor: '#e91e63', textColor: '#ffffff', gradientStart: '#e91e63', fontSize: 48, borderRadius: 20 } },
    [BLOCK_IDS.vsBadge]: { transform: { x: 835, y: 440, width: 250, height: 250 }, style: { bgColor: '#e91e63', textColor: '#ffffff', fontSize: 80, borderRadius: 999 } },
    [BLOCK_IDS.player2]: { transform: { x: 1060, y: 220, width: 780, height: 740 }, style: { bgColor: '#0f172a', borderColor: '#a3e635', textColor: '#ffffff', gradientStart: '#a3e635', fontSize: 48, borderRadius: 20 } },
};

function PlayerCard({ player, style, accentSide }: { player: PlayerStat; style: ElementStyle; accentSide: 'left' | 'right' }) {
    const font = getFontById(style.fontFamily || 'impact');
    const bg = style.bgColor || '#0f172a';
    const border = style.borderColor || '#e91e63';
    const accent = style.gradientStart || '#e91e63';
    const textColor = style.textColor || '#ffffff';
    const radius = style.borderRadius ?? 20;

    const formatTime = (s: number) => { const m = Math.floor(s / 60); const sec = s % 60; return `${m}:${sec.toString().padStart(2, '0')}`; };

    return (
        <div style={{ width: '100%', height: '100%', background: bg, border: `3px solid ${border}`, borderRadius: radius, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${border}20` }}>
            {/* Photo */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', [accentSide]: 0, top: 0, bottom: 0, width: 8, background: accent }} />
                <img src={`http://localhost:4000/images/${player.playerKey}.png`} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} style={{ height: '120%', width: 'auto', objectFit: 'contain', marginTop: 80, filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.5))' }} alt={player.name} />
            </div>
            {/* Info */}
            <div style={{ padding: '20px 28px', borderTop: `3px solid ${border}`, background: `linear-gradient(135deg, ${bg}, rgba(15,23,42,0.95))` }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#64748b', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4, fontFamily: font?.family }}>{player.teamName}</div>
                <h2 style={{ fontSize: style.fontSize || 48, fontWeight: 900, fontStyle: 'italic', color: accent, fontFamily: font?.family, margin: 0, textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 1 }}>{player.name}</h2>
                <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
                    {[{ label: 'ELIMS', value: player.killNum }, { label: 'DAMAGE', value: Math.round(player.damage) }, { label: 'HEADSHOTS', value: player.headShotNum }, { label: 'SURVIVAL', value: formatTime(player.survivalTime) }].map(s => (
                        <div key={s.label}>
                            <span style={{ fontSize: 9, fontWeight: 900, color: '#64748b', letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block' }}>{s.label}</span>
                            <span style={{ fontSize: 36, fontWeight: 900, fontStyle: 'italic', color: textColor, fontFamily: font?.family, lineHeight: 1 }}>{s.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function VsBadge({ style }: { style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'impact');
    return (
        <div style={{ width: '100%', height: '100%', borderRadius: style.borderRadius ?? 999, background: style.bgColor || '#e91e63', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 60px ${style.bgColor || '#e91e63'}80, 0 20px 40px rgba(0,0,0,0.5)`, border: '4px solid rgba(255,255,255,0.3)' }}>
            <span style={{ fontSize: style.fontSize || 80, fontWeight: 900, fontStyle: 'italic', color: style.textColor || '#ffffff', fontFamily: font?.family, textShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>VS</span>
        </div>
    );
}

function H2HHeader({ style }: { style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'impact');
    const text = style.text || 'HEAD TO HEAD';
    const words = text.split(' ');
    const last = words.pop() || '';
    const first = words.join(' ');

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <h1 style={{ fontSize: style.fontSize || 80, fontWeight: 900, fontStyle: 'italic', color: style.textColor || '#ffffff', fontFamily: font?.family, textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 0.9, margin: 0, textShadow: '0 6px 20px rgba(0,0,0,0.5)', textAlign: 'center' }}>
                {first && <>{first} </>}<span style={{ color: style.gradientEnd || '#a3e635' }}>{last}</span>
            </h1>
        </div>
    );
}

export default function HeadToHeadGraphicV2() {
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

    const [p1, p2] = useMemo(() => {
        if (editMode) return [MOCK_P1, MOCK_P2];
        if (!fetchedData.length) return [MOCK_P1, MOCK_P2];
        const sorted = [...fetchedData].filter(p => p.name && p.name !== 'Unknown').sort((a, b) => b.killNum - a.killNum || b.damage - a.damage);
        return [sorted[0] || MOCK_P1, sorted[1] || MOCK_P2];
    }, [editMode, fetchedData]);

    const allStyles: Record<string, ElementStyle> = {};
    const allTransforms: Record<string, ElementTransform> = {};
    ALL_IDS.forEach(id => { allStyles[id] = { ...DEFAULTS[id].style, ...readElementStyle(OVERLAY_KEY, id) }; allTransforms[id] = { ...DEFAULTS[id].transform, ...readElementTransform(OVERLAY_KEY, id) }; });

    const handleReset = () => { clearOverlayLayout(OVERLAY_KEY); setResetCounter(c => c + 1); setStyleTick(t => t + 1); setSelectedId(null); };
    const handleStyleChangeAll = (patch: Partial<ElementStyle>) => { ALL_IDS.forEach(id => updateElementStyle(OVERLAY_KEY, id, patch)); setStyleTick(t => t + 1); };
    const handleSave = async (): Promise<boolean> => { const layout: Record<string, any> = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith(`strymx_layout:${OVERLAY_KEY}:`)) { try { layout[k.replace(`strymx_layout:${OVERLAY_KEY}:`, '')] = JSON.parse(localStorage.getItem(k)!); } catch {} } } try { return (await fetch('http://localhost:4000/api/layouts/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ overlayKey: OVERLAY_KEY, layout }) })).ok; } catch { return false; } };

    const cls = 'h2h-canvas-bounds';

    const viewportNode = (
        <div className={cls} style={{ width: VIEWPORT.width, height: VIEWPORT.height, overflow: 'hidden', position: 'relative', fontFamily: 'Impact, "Arial Black", system-ui, sans-serif', userSelect: 'none', background: editMode ? 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.7))' : 'transparent', border: editMode ? '2px dashed rgba(59,130,246,0.25)' : undefined, borderRadius: editMode ? 12 : 0 }}>
            {editMode && <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />}
            {editMode && selectedId && <div onClick={() => setSelectedId(null)} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />}

            <EditableGraphicElement key={editMode ? `h-${resetCounter}` : `h-${resetCounter}-${pushCounter}`} id={BLOCK_IDS.header} overlayKey={OVERLAY_KEY} defaultTransform={DEFAULTS[BLOCK_IDS.header].transform} defaultStyle={DEFAULTS[BLOCK_IDS.header].style} editMode={editMode} selected={selectedId === BLOCK_IDS.header} onSelect={setSelectedId} label="Header" bounds={`.${cls}`} scale={canvasScale}>
                {(s) => <H2HHeader style={s} />}
            </EditableGraphicElement>

            <EditableGraphicElement key={editMode ? `p1-${resetCounter}` : `p1-${resetCounter}-${pushCounter}`} id={BLOCK_IDS.player1} overlayKey={OVERLAY_KEY} defaultTransform={DEFAULTS[BLOCK_IDS.player1].transform} defaultStyle={DEFAULTS[BLOCK_IDS.player1].style} editMode={editMode} selected={selectedId === BLOCK_IDS.player1} onSelect={setSelectedId} label="Player 1" bounds={`.${cls}`} scale={canvasScale}>
                {(s) => <PlayerCard player={p1} style={s} accentSide="left" />}
            </EditableGraphicElement>

            <EditableGraphicElement key={editMode ? `vs-${resetCounter}` : `vs-${resetCounter}-${pushCounter}`} id={BLOCK_IDS.vsBadge} overlayKey={OVERLAY_KEY} defaultTransform={DEFAULTS[BLOCK_IDS.vsBadge].transform} defaultStyle={DEFAULTS[BLOCK_IDS.vsBadge].style} editMode={editMode} selected={selectedId === BLOCK_IDS.vsBadge} onSelect={setSelectedId} label="VS Badge" bounds={`.${cls}`} scale={canvasScale} lockAspect>
                {(s) => <VsBadge style={s} />}
            </EditableGraphicElement>

            <EditableGraphicElement key={editMode ? `p2-${resetCounter}` : `p2-${resetCounter}-${pushCounter}`} id={BLOCK_IDS.player2} overlayKey={OVERLAY_KEY} defaultTransform={DEFAULTS[BLOCK_IDS.player2].transform} defaultStyle={DEFAULTS[BLOCK_IDS.player2].style} editMode={editMode} selected={selectedId === BLOCK_IDS.player2} onSelect={setSelectedId} label="Player 2" bounds={`.${cls}`} scale={canvasScale}>
                {(s) => <PlayerCard player={p2} style={s} accentSide="right" />}
            </EditableGraphicElement>
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
                statCards={[{ id: BLOCK_IDS.header, label: 'Header' }, { id: BLOCK_IDS.player1, label: 'Player 1 Card' }, { id: BLOCK_IDS.vsBadge, label: 'VS Badge' }, { id: BLOCK_IDS.player2, label: 'Player 2 Card' }]}
                elementStyles={allStyles} elementTransforms={allTransforms}
                onStyleChange={(id, p) => { updateElementStyle(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onStyleChangeAll={handleStyleChangeAll}
                onTransformChange={(id, p) => { updateElementTransform(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onReset={handleReset} onClose={() => { window.location.href = window.location.pathname; }}
                onSave={handleSave} selectedId={selectedId} obsUrlPath="/overlay/head-to-head?layout=custom"
            />
        </div>
    );
}
