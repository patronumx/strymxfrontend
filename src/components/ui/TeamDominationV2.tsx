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

const OVERLAY_KEY = 'team-domination-layout';
const VIEWPORT = { width: 1920, height: 1080 };

interface TeamData { teamName: string; teamTag?: string; logoUrl?: string; kills: number; }
const MOCK: TeamData = { teamName: 'PARADISE GRACE', teamTag: 'PRG', logoUrl: '', kills: 5 };

const BLOCK_IDS = { killsPill: 'tdKills', infoBox: 'tdInfo', logoBox: 'tdLogo' };
const ALL_IDS = Object.values(BLOCK_IDS);

const DEFAULTS: Record<string, { transform: ElementTransform; style: ElementStyle }> = {
    [BLOCK_IDS.killsPill]: { transform: { x: 1340, y: 180, width: 160, height: 100 }, style: { bgColor: '#7c3aed', gradientStart: '#8b5cf6', textColor: '#ffffff', fontSize: 52 } },
    [BLOCK_IDS.infoBox]:   { transform: { x: 1500, y: 180, width: 260, height: 100 }, style: { bgColor: '#1e2746', textColor: '#a78bfa', gradientStart: '#94a3b8', fontSize: 22 } },
    [BLOCK_IDS.logoBox]:   { transform: { x: 1700, y: 190, width: 80, height: 80 },   style: { bgColor: '#7c3aed', borderColor: '#7c3aed', borderRadius: 14 } },
};

function KillsPill({ data, style }: { data: TeamData; style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'impact');
    return (
        <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${style.bgColor || '#7c3aed'}, ${style.gradientStart || '#8b5cf6'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px', gap: 8, borderRadius: '16px 0 0 16px', position: 'relative', overflow: 'hidden' }}>
            <span style={{ fontSize: style.fontSize || 52, fontWeight: 900, fontStyle: 'italic', color: style.textColor || '#fff', lineHeight: 1, fontFamily: font?.family, textShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>{data.kills}</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: font?.family }}>ELIMS</span>
        </div>
    );
}

function InfoBox({ data, style }: { data: TeamData; style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'impact');
    return (
        <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${style.bgColor || '#1e2746'}, #0f1729)`, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px' }}>
            <span style={{ fontSize: style.fontSize || 22, fontWeight: 900, color: style.textColor || '#a78bfa', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: font?.family, textShadow: `0 0 20px ${style.textColor || '#7c3aed'}60`, lineHeight: 1 }}>DOMINATING</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: style.gradientStart || '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>{data.teamName}</span>
        </div>
    );
}

function LogoBox({ data, style }: { data: TeamData; style: ElementStyle }) {
    return (
        <div style={{ width: '100%', height: '100%', borderRadius: style.borderRadius ?? 14, background: `${style.bgColor || '#7c3aed'}20`, border: `2px solid ${style.borderColor || '#7c3aed'}40`, padding: 10, boxShadow: `0 0 30px ${style.bgColor || '#7c3aed'}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={data.logoUrl || `${API_URL}/placeholder-logo.png`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" />
        </div>
    );
}

export default function TeamDominationV2() {
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
            if (cmd.templateUrl === '/overlays/team-domination' && cmd.action === 'PLAY') { setTeam(cmd.data); setIsVisible(true); setTimeout(() => setIsVisible(false), 6000); }
            else if (cmd.templateUrl === '/overlays/team-domination' && (cmd.action === 'STOP' || cmd.action === 'CLEAR')) setIsVisible(false);
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

    const cls = 'td-canvas-bounds';
    const comps: Record<string, React.FC<{ data: TeamData; style: ElementStyle }>> = { [BLOCK_IDS.killsPill]: KillsPill, [BLOCK_IDS.infoBox]: InfoBox, [BLOCK_IDS.logoBox]: LogoBox };
    const labels: Record<string, string> = { [BLOCK_IDS.killsPill]: 'Kill Count', [BLOCK_IDS.infoBox]: 'Dominating Text', [BLOCK_IDS.logoBox]: 'Team Logo' };

    const viewportNode = (
        <div className={cls} style={{ width: VIEWPORT.width, height: VIEWPORT.height, overflow: 'hidden', position: 'relative', fontFamily: 'Impact, "Arial Black", system-ui, sans-serif', userSelect: 'none', background: editMode ? 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.7))' : 'transparent', border: editMode ? '2px dashed rgba(59,130,246,0.25)' : undefined, borderRadius: editMode ? 12 : 0 }}>
            {editMode && <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />}
            {editMode && selectedId && <div onClick={() => setSelectedId(null)} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />}

            {isVisible && ALL_IDS.map(id => {
                const Comp = comps[id];
                return (
                    <EditableGraphicElement key={editMode ? `${id}-${resetCounter}` : `${id}-${resetCounter}-${pushCounter}`}
                        id={id} overlayKey={OVERLAY_KEY}
                        defaultTransform={DEFAULTS[id].transform} defaultStyle={DEFAULTS[id].style}
                        editMode={editMode} selected={selectedId === id}
                        onSelect={setSelectedId} label={labels[id]}
                        bounds={`.${cls}`} scale={canvasScale}>
                        {(style) => <Comp data={team} style={style} />}
                    </EditableGraphicElement>
                );
            })}
        </div>
    );

    if (!editMode) return <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'transparent' }}><div style={{ width: VIEWPORT.width, height: VIEWPORT.height, transform: `scale(${typeof window !== 'undefined' ? Math.min(window.innerWidth / VIEWPORT.width, window.innerHeight / VIEWPORT.height, 1) : 1})`, transformOrigin: 'top left' }}>{viewportNode}</div></div>;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at center, rgba(30,41,59,0.95), rgba(2,6,23,0.98))', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, right: 400, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, pointerEvents: 'none' }}>
                <div style={{ width: VIEWPORT.width * canvasScale, height: VIEWPORT.height * canvasScale, position: 'relative', pointerEvents: 'auto' }}>
                    <div style={{ width: VIEWPORT.width, height: VIEWPORT.height, transform: `scale(${canvasScale})`, transformOrigin: 'top left' }}>{viewportNode}</div>
                </div>
            </div>
            <MatchSummaryEditSidebar
                statCards={[{ id: BLOCK_IDS.killsPill, label: 'Kill Count Pill' }, { id: BLOCK_IDS.infoBox, label: 'Dominating Text' }, { id: BLOCK_IDS.logoBox, label: 'Team Logo' }]}
                elementStyles={allStyles} elementTransforms={allTransforms}
                onStyleChange={(id, p) => { updateElementStyle(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onStyleChangeAll={handleStyleChangeAll}
                onTransformChange={(id, p) => { updateElementTransform(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onReset={handleReset} onClose={() => { window.location.href = window.location.pathname; }}
                onSave={handleSave} selectedId={selectedId}
                obsUrlPath="/overlays/team-domination?layout=custom"
            />
        </div>
    );
}
