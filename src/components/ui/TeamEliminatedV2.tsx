"use client"
import { API_URL } from '@/lib/api-config';

import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import EditableGraphicElement, {
    clearOverlayLayout, updateElementStyle, updateElementTransform,
    readElementStyle, readElementTransform,
    type ElementTransform, type ElementStyle,
} from './EditableGraphicElement';
import MatchSummaryEditSidebar from './MatchSummaryEditSidebar';
import { injectBroadcastFonts, getFontById } from './broadcastFonts';
import { motion, AnimatePresence } from 'framer-motion';

const OVERLAY_KEY = 'team-eliminated-layout';
const VIEWPORT = { width: 1920, height: 1080 };

interface TeamData {
    teamName: string; teamTag?: string; logoUrl?: string; flagUrl?: string; placement: number; kills: number;
}

const MOCK: TeamData = { teamName: 'TEAM APEX', teamTag: 'APX', logoUrl: '', flagUrl: '', placement: 13, kills: 2 };

const BLOCK_IDS = { placementBox: 'tePlace', logoBox: 'teLogo', killsBox: 'teKills', elimBar: 'teElimBar' };
const ALL_IDS = Object.values(BLOCK_IDS);

const DEFAULTS: Record<string, { transform: ElementTransform; style: ElementStyle }> = {
    [BLOCK_IDS.placementBox]: { transform: { x: 1340, y: 180, width: 100, height: 100 }, style: { bgColor: '#0f1729', textColor: '#ffffff', fontSize: 48 } },
    [BLOCK_IDS.logoBox]:      { transform: { x: 1440, y: 180, width: 100, height: 100 }, style: { bgColor: '#1a2340' } },
    [BLOCK_IDS.killsBox]:     { transform: { x: 1540, y: 180, width: 240, height: 100 }, style: { bgColor: '#1e2746', textColor: '#e8c547', gradientStart: '#c9a227', fontSize: 42 } },
    [BLOCK_IDS.elimBar]:      { transform: { x: 1540, y: 244, width: 240, height: 36 },  style: { bgColor: '#c9a227', textColor: '#0f1729', fontSize: 14, borderRadius: 6 } },
};

function PlacementBlock({ data, style }: { data: TeamData; style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'impact');
    return (
        <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${style.bgColor || '#0f1729'}, #1a2340)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '16px 0 0 16px', borderRight: `3px solid ${style.gradientStart || '#c9a227'}40` }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: '#64748b', letterSpacing: '0.2em' }}>#</span>
            <span style={{ fontSize: style.fontSize || 48, fontWeight: 900, fontStyle: 'italic', color: style.textColor || '#fff', lineHeight: 0.9, fontFamily: font?.family }}>{data.placement}</span>
        </div>
    );
}

function LogoBlock({ data, style }: { data: TeamData; style: ElementStyle }) {
    return (
        <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${style.bgColor || '#1a2340'}, #1e2746)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={data.logoUrl || `${API_URL}/placeholder-logo.png`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" />
            </div>
            {data.flagUrl && <img src={data.flagUrl} style={{ width: 28, height: 18, objectFit: 'cover', borderRadius: 3, border: '1px solid rgba(255,255,255,0.2)' }} alt="" />}
        </div>
    );
}

function KillsBlock({ data, style }: { data: TeamData; style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'impact');
    return (
        <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${style.bgColor || '#1e2746'}, #0f1729)`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 8, borderRadius: '0 16px 16px 0' }}>
            <span style={{ fontSize: style.fontSize || 42, fontWeight: 900, fontStyle: 'italic', color: style.textColor || '#e8c547', lineHeight: 1, fontFamily: font?.family, textShadow: `0 0 20px ${style.gradientStart || '#c9a227'}60` }}>{data.kills}</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#ffffff', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: font?.family }}>ELIMS</span>
        </div>
    );
}

function ElimBarBlock({ style }: { style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'impact');
    return (
        <div style={{ width: '100%', height: '100%', background: `linear-gradient(90deg, ${style.bgColor || '#c9a227'}, ${style.bgColor || '#c9a227'}cc)`, borderRadius: style.borderRadius ?? 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: style.fontSize || 14, fontWeight: 900, color: style.textColor || '#0f1729', letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: font?.family }}>ELIMINATED</span>
        </div>
    );
}

export default function TeamEliminatedV2() {
    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [resetCounter, setResetCounter] = useState(0);
    const [styleTick, setStyleTick] = useState(0);
    const [pushCounter, setPushCounter] = useState(0);
    const [canvasScale, setCanvasScale] = useState(1);
    const [team, setTeam] = useState<TeamData>(MOCK);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => { injectBroadcastFonts(); }, []);
    useEffect(() => {
        const p = new URLSearchParams(window.location.search);
        if (p.get('edit') === 'true') { setEditMode(true); setIsVisible(true); }
        if (p.get('layout') === 'custom') setIsVisible(true);
    }, []);

    useEffect(() => {
        if (editMode) return;
        const socket = io(`http://${window.location.hostname}:4000`);
        socket.on('graphic_command', (cmd) => {
            if (cmd.templateUrl === '/overlays/team-eliminated' && cmd.action === 'PLAY') {
                setTeam(cmd.data); setIsVisible(true);
                setTimeout(() => setIsVisible(false), 6000);
            } else if (cmd.templateUrl === '/overlays/team-eliminated' && (cmd.action === 'STOP' || cmd.action === 'CLEAR')) setIsVisible(false);
        });
        socket.on('layout_push', (data: { overlayKey: string; layout: Record<string, any> }) => {
            if (data.overlayKey !== OVERLAY_KEY) return;
            Object.entries(data.layout).forEach(([id, config]) => { try { localStorage.setItem(`strymx_layout:${OVERLAY_KEY}:${id}`, JSON.stringify(config)); } catch {} });
            setPushCounter(c => c + 1);
        });
        return () => { socket.disconnect(); };
    }, [editMode]);

    useEffect(() => { const h = (e: StorageEvent) => { if (e.key?.startsWith(`strymx_layout:${OVERLAY_KEY}:`)) setStyleTick(t => t + 1); }; window.addEventListener('storage', h); return () => window.removeEventListener('storage', h); }, []);
    useEffect(() => { if (!editMode) return; const c = () => { setCanvasScale(Math.min((window.innerWidth - 480) / VIEWPORT.width, (window.innerHeight - 80) / VIEWPORT.height, 1)); }; c(); window.addEventListener('resize', c); return () => window.removeEventListener('resize', c); }, [editMode]);

    const allStyles: Record<string, ElementStyle> = {};
    const allTransforms: Record<string, ElementTransform> = {};
    ALL_IDS.forEach(id => { allStyles[id] = { ...DEFAULTS[id].style, ...readElementStyle(OVERLAY_KEY, id) }; allTransforms[id] = { ...DEFAULTS[id].transform, ...readElementTransform(OVERLAY_KEY, id) }; });

    const handleReset = () => { clearOverlayLayout(OVERLAY_KEY); setResetCounter(c => c + 1); setStyleTick(t => t + 1); setSelectedId(null); };
    const handleStyleChangeAll = (patch: Partial<ElementStyle>) => { ALL_IDS.forEach(id => updateElementStyle(OVERLAY_KEY, id, patch)); setStyleTick(t => t + 1); };
    const handleSave = async (): Promise<boolean> => { const layout: Record<string, any> = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith(`strymx_layout:${OVERLAY_KEY}:`)) { try { layout[k.replace(`strymx_layout:${OVERLAY_KEY}:`, '')] = JSON.parse(localStorage.getItem(k)!); } catch {} } } try { return (await fetch(`${API_URL}/api/layouts/push`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ overlayKey: OVERLAY_KEY, layout }) })).ok; } catch { return false; } };

    const cls = 'te-canvas-bounds';

    const viewportNode = (
        <div className={cls} style={{ width: VIEWPORT.width, height: VIEWPORT.height, overflow: 'hidden', position: 'relative', fontFamily: 'Impact, "Arial Black", system-ui, sans-serif', userSelect: 'none', background: editMode ? 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.7))' : 'transparent', border: editMode ? '2px dashed rgba(59,130,246,0.25)' : undefined, borderRadius: editMode ? 12 : 0 }}>
            {editMode && <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />}
            {editMode && selectedId && <div onClick={() => setSelectedId(null)} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />}

            {isVisible && ALL_IDS.map(id => {
                const Comp = id === BLOCK_IDS.placementBox ? PlacementBlock
                    : id === BLOCK_IDS.logoBox ? LogoBlock
                    : id === BLOCK_IDS.killsBox ? KillsBlock
                    : ElimBarBlock;
                return (
                    <EditableGraphicElement key={editMode ? `${id}-${resetCounter}` : `${id}-${resetCounter}-${pushCounter}`}
                        id={id} overlayKey={OVERLAY_KEY}
                        defaultTransform={DEFAULTS[id].transform} defaultStyle={DEFAULTS[id].style}
                        editMode={editMode} selected={selectedId === id}
                        onSelect={setSelectedId} label={id === BLOCK_IDS.placementBox ? 'Placement' : id === BLOCK_IDS.logoBox ? 'Logo' : id === BLOCK_IDS.killsBox ? 'Kills' : 'Elim Bar'}
                        bounds={`.${cls}`} scale={canvasScale}>
                        {(style) => <Comp data={team} style={style} />}
                    </EditableGraphicElement>
                );
            })}
        </div>
    );

    if (!editMode) return <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'transparent' }}><div style={{ width: VIEWPORT.width, height: VIEWPORT.height, transform: `scale(${Math.min(typeof window !== 'undefined' ? window.innerWidth / VIEWPORT.width : 1, typeof window !== 'undefined' ? window.innerHeight / VIEWPORT.height : 1, 1)})`, transformOrigin: 'top left' }}>{viewportNode}</div></div>;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at center, rgba(30,41,59,0.95), rgba(2,6,23,0.98))', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, right: 400, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, pointerEvents: 'none' }}>
                <div style={{ width: VIEWPORT.width * canvasScale, height: VIEWPORT.height * canvasScale, position: 'relative', pointerEvents: 'auto' }}>
                    <div style={{ width: VIEWPORT.width, height: VIEWPORT.height, transform: `scale(${canvasScale})`, transformOrigin: 'top left' }}>{viewportNode}</div>
                </div>
            </div>
            <MatchSummaryEditSidebar
                statCards={[{ id: BLOCK_IDS.placementBox, label: 'Placement #' }, { id: BLOCK_IDS.logoBox, label: 'Team Logo' }, { id: BLOCK_IDS.killsBox, label: 'Kill Count' }, { id: BLOCK_IDS.elimBar, label: 'Eliminated Bar' }]}
                elementStyles={allStyles} elementTransforms={allTransforms}
                onStyleChange={(id, p) => { updateElementStyle(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onStyleChangeAll={handleStyleChangeAll}
                onTransformChange={(id, p) => { updateElementTransform(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onReset={handleReset} onClose={() => { window.location.href = window.location.pathname; }}
                onSave={handleSave} selectedId={selectedId}
                obsUrlPath="/overlays/team-eliminated?layout=custom&design=v2"
                currentDesign="v2"
                onDesignChange={(d) => { window.location.href = `/overlays/team-eliminated?edit=true&design=${d}`; }}
            />
        </div>
    );
}
