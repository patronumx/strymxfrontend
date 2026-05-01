import { API_URL } from '@/lib/api-config';
"use client"

import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import EditableGraphicElement, {
    clearOverlayLayout, updateElementStyle, updateElementTransform,
    readElementStyle, readElementTransform,
    type ElementTransform, type ElementStyle,
} from './EditableGraphicElement';
import MatchSummaryEditSidebar from './MatchSummaryEditSidebar';
import { injectBroadcastFonts, getFontById } from './broadcastFonts';

const OVERLAY_KEY = 'recall-layout';
const VIEWPORT = { width: 1920, height: 1080 };

interface PlayerData { playerKey: string; name: string; teamName: string; teamTag?: string; logoUrl?: string; photoUrl?: string; }
const MOCK: PlayerData = { playerKey: 'preview', name: 'PLAYER NAME', teamName: 'TEAM', teamTag: 'TAG' };

const BLOCK_IDS = { glassPanel: 'rcPanel', photo: 'rcPhoto', titleText: 'rcTitle', nameText: 'rcName', teamBar: 'rcTeam', logo: 'rcLogo' };
const ALL_IDS = Object.values(BLOCK_IDS);

const DEFAULTS: Record<string, { transform: ElementTransform; style: ElementStyle }> = {
    [BLOCK_IDS.glassPanel]: { transform: { x: 1100, y: 340, width: 700, height: 400 }, style: { bgColor: '#06b6d4', borderColor: '#06b6d4', borderRadius: 24, opacity: 0.15 } },
    [BLOCK_IDS.photo]:      { transform: { x: 1130, y: 280, width: 280, height: 420 }, style: {} },
    [BLOCK_IDS.logo]:       { transform: { x: 1480, y: 380, width: 56, height: 56 },   style: { bgColor: '#06b6d4', borderColor: '#06b6d4', borderRadius: 14 } },
    [BLOCK_IDS.titleText]:  { transform: { x: 1440, y: 440, width: 330, height: 40 },  style: { textColor: '#22d3ee', fontSize: 14, text: 'PLAYER RECALLED' } },
    [BLOCK_IDS.nameText]:   { transform: { x: 1440, y: 480, width: 330, height: 80 },  style: { textColor: '#ffffff', fontSize: 56 } },
    [BLOCK_IDS.teamBar]:    { transform: { x: 1440, y: 570, width: 330, height: 44 },  style: { bgColor: '#06b6d4', textColor: '#ffffff', fontSize: 18, borderRadius: 8, text: 'BACK IN ACTION' } },
};

function GlassPanel({ style }: { style: ElementStyle }) {
    return (
        <div style={{ width: '100%', height: '100%', background: `${style.bgColor || '#06b6d4'}${Math.round((style.opacity ?? 0.15) * 255).toString(16).padStart(2, '0')}`, borderRadius: style.borderRadius ?? 24, border: `2px solid ${style.borderColor || '#06b6d4'}40`, backdropFilter: 'blur(20px)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 3px, ${style.bgColor || '#06b6d4'}08 3px, ${style.bgColor || '#06b6d4'}08 4px)`, pointerEvents: 'none' }} />
        </div>
    );
}

function PhotoBlock({ data }: { data: PlayerData }) {
    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <img src={data.photoUrl || `${API_URL}/images/${data.playerKey}.png`} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom', filter: 'drop-shadow(0 0 30px #06b6d460) drop-shadow(0 10px 30px rgba(0,0,0,0.5))' }} alt={data.name} />
        </div>
    );
}

function LogoBlock({ data, style }: { data: PlayerData; style: ElementStyle }) {
    return (
        <div style={{ width: '100%', height: '100%', borderRadius: style.borderRadius ?? 14, background: `${style.bgColor || '#06b6d4'}20`, border: `2px solid ${style.borderColor || '#06b6d4'}50`, padding: 8, boxShadow: `0 0 30px ${style.bgColor || '#06b6d4'}30` }}>
            <img src={data.logoUrl || `${API_URL}/placeholder-logo.png`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" />
        </div>
    );
}

function TitleText({ style }: { style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'impact');
    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: style.fontSize || 14, fontWeight: 900, color: style.textColor || '#22d3ee', letterSpacing: '0.5em', textTransform: 'uppercase', fontFamily: font?.family, textShadow: `0 0 20px ${style.textColor || '#06b6d4'}` }}>{style.text || 'PLAYER RECALLED'}</span>
        </div>
    );
}

function NameText({ data, style }: { data: PlayerData; style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'impact');
    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <h2 style={{ fontSize: style.fontSize || 56, fontWeight: 900, fontStyle: 'italic', color: style.textColor || '#ffffff', lineHeight: 0.9, margin: 0, letterSpacing: '-0.04em', fontFamily: font?.family, textShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 40px #06b6d440', textAlign: 'right' }}>{data.name}</h2>
        </div>
    );
}

function TeamBar({ data, style }: { data: PlayerData; style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'impact');
    return (
        <div style={{ width: '100%', height: '100%', background: `linear-gradient(90deg, transparent, ${style.bgColor || '#06b6d4'})`, borderRadius: style.borderRadius ?? 8, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 16, overflow: 'hidden' }}>
            <span style={{ fontSize: style.fontSize || 18, fontWeight: 900, color: style.textColor || '#ffffff', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: font?.family, textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>{data.teamTag || data.teamName.substring(0, 3).toUpperCase()}</span>
        </div>
    );
}

export default function RecallV2() {
    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [resetCounter, setResetCounter] = useState(0);
    const [styleTick, setStyleTick] = useState(0);
    const [pushCounter, setPushCounter] = useState(0);
    const [canvasScale, setCanvasScale] = useState(1);
    const [player, setPlayer] = useState<PlayerData>(MOCK);
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
            if (cmd.templateUrl === '/overlays/recall' && cmd.action === 'PLAY') { setPlayer(cmd.data); setIsVisible(true); setTimeout(() => setIsVisible(false), 6000); }
            else if (cmd.templateUrl === '/overlays/recall' && (cmd.action === 'STOP' || cmd.action === 'CLEAR')) setIsVisible(false);
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

    const cls = 'rc-canvas-bounds';
    const comps: Record<string, React.FC<any>> = { [BLOCK_IDS.glassPanel]: GlassPanel, [BLOCK_IDS.photo]: PhotoBlock, [BLOCK_IDS.logo]: LogoBlock, [BLOCK_IDS.titleText]: TitleText, [BLOCK_IDS.nameText]: NameText, [BLOCK_IDS.teamBar]: TeamBar };
    const compLabels: Record<string, string> = { [BLOCK_IDS.glassPanel]: 'Glass Panel', [BLOCK_IDS.photo]: 'Player Photo', [BLOCK_IDS.logo]: 'Team Logo', [BLOCK_IDS.titleText]: 'Recall Title', [BLOCK_IDS.nameText]: 'Player Name', [BLOCK_IDS.teamBar]: 'Team Bar' };

    const viewportNode = (
        <div className={cls} style={{ width: VIEWPORT.width, height: VIEWPORT.height, overflow: 'hidden', position: 'relative', fontFamily: 'Impact, "Arial Black", system-ui, sans-serif', userSelect: 'none', background: editMode ? 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.7))' : 'transparent', border: editMode ? '2px dashed rgba(59,130,246,0.25)' : undefined, borderRadius: editMode ? 12 : 0 }}>
            {editMode && <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />}
            {editMode && selectedId && <div onClick={() => setSelectedId(null)} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />}

            {isVisible && ALL_IDS.map(id => {
                const Comp = comps[id];
                const needsData = [BLOCK_IDS.photo, BLOCK_IDS.logo, BLOCK_IDS.nameText, BLOCK_IDS.teamBar].includes(id);
                return (
                    <EditableGraphicElement key={editMode ? `${id}-${resetCounter}` : `${id}-${resetCounter}-${pushCounter}`}
                        id={id} overlayKey={OVERLAY_KEY}
                        defaultTransform={DEFAULTS[id].transform} defaultStyle={DEFAULTS[id].style}
                        editMode={editMode} selected={selectedId === id}
                        onSelect={setSelectedId} label={compLabels[id]}
                        bounds={`.${cls}`} scale={canvasScale}>
                        {(style) => needsData ? <Comp data={player} style={style} /> : <Comp style={style} />}
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
                statCards={[{ id: BLOCK_IDS.glassPanel, label: 'Glass Panel' }, { id: BLOCK_IDS.photo, label: 'Player Photo' }, { id: BLOCK_IDS.logo, label: 'Team Logo' }, { id: BLOCK_IDS.titleText, label: 'Recall Title' }, { id: BLOCK_IDS.nameText, label: 'Player Name' }, { id: BLOCK_IDS.teamBar, label: 'Team Bar' }]}
                elementStyles={allStyles} elementTransforms={allTransforms}
                onStyleChange={(id, p) => { updateElementStyle(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onStyleChangeAll={handleStyleChangeAll}
                onTransformChange={(id, p) => { updateElementTransform(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onReset={handleReset} onClose={() => { window.location.href = window.location.pathname; }}
                onSave={handleSave} selectedId={selectedId}
                obsUrlPath="/overlays/recall?layout=custom"
            />
        </div>
    );
}
