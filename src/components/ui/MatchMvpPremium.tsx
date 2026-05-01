import { API_URL } from '@/lib/api-config';
"use client"

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import EditableGraphicElement, {
    clearOverlayLayout,
    updateElementStyle,
    updateElementTransform,
    readElementStyle,
    readElementTransform,
    type ElementTransform,
    type ElementStyle,
} from './EditableGraphicElement';
import MatchSummaryEditSidebar from './MatchSummaryEditSidebar';
import { getFontById, injectBroadcastFonts } from './broadcastFonts';

const OVERLAY_KEY = 'match-mvp-premium';
const VIEWPORT = { width: 1920, height: 1080 };

interface PlayerStat {
    playerKey: string;
    name?: string;
    teamName: string;
    teamId?: number;
    health: number;
    liveState: number;
    killNum: number;
    damage: number;
    assists: number;
    survivalTime: number;
    photoUrl?: string;
    logoUrl?: string;
    teamContri?: string;
}

const BLOCK_IDS = {
    title: 'mvpPremiumTitle',
    playerInfo: 'mvpPremiumPlayerInfo',
    stats: 'mvpPremiumStats',
    portrait: 'mvpPremiumPortrait',
};

const DEFAULTS: Record<string, { transform: ElementTransform; style: ElementStyle }> = {
    [BLOCK_IDS.title]: { 
        transform: { x: 100, y: 150, width: 600, height: 400 }, 
        style: { textColor: '#f1c40f', gradientStart: '#ff4b5c', fontSize: 240, text: 'MVP', fontFamily: 'ttlakes', fontWeight: 900, fontStyle: 'normal' } 
    },
    [BLOCK_IDS.playerInfo]: { 
        transform: { x: 100, y: 620, width: 600, height: 100 }, 
        style: { bgColor: '#0b6e70', accentColor: '#ff4b5c', textColor: '#ffffff', fontSize: 48, fontFamily: 'ttlakes', fontWeight: 900, fontStyle: 'normal' } 
    },
    [BLOCK_IDS.stats]: { 
        transform: { x: 100, y: 760, width: 1720, height: 220 }, 
        style: { bgColor: '#0b6e70', borderColor: '#ffffff', textColor: '#ffffff', fontSize: 24, fontFamily: 'ttlakes', fontWeight: 700, fontStyle: 'normal' } 
    },
    [BLOCK_IDS.portrait]: { 
        transform: { x: 750, y: 50, width: 1100, height: 1030 }, 
        style: { opacity: 1 } 
    },
};

const ALL_IDS = Object.values(BLOCK_IDS);

const MOCK_MVP: PlayerStat = {
    playerKey: 'mock-mvp',
    name: 'PLAYER NAME',
    teamName: 'TEAM NAME',
    health: 0,
    liveState: 1,
    killNum: 7,
    damage: 1240,
    assists: 3,
    survivalTime: 1145,
    teamContri: '34.50%',
    photoUrl: '',
    logoUrl: `${API_URL}/placeholder.png`
};

function PlayerPortrait({ photoUrl, playerKey, name }: { photoUrl?: string; playerKey: string; name: string }) {
    const [imgSrc, setImgSrc] = useState<string | null>(photoUrl || (playerKey ? `${API_URL}/images/${playerKey}.png` : null));
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!photoUrl && playerKey) {
            setImgSrc(`${API_URL}/images/${playerKey}.png`);
            setFailed(false);
        }
    }, [photoUrl, playerKey]);

    return (
        <div className="relative h-full w-full flex items-end justify-center">
            {!failed && imgSrc ? (
                <img 
                    src={imgSrc} 
                    onError={() => {
                        if (imgSrc?.includes(':3000')) {
                            setImgSrc(`${API_URL}/images/${playerKey}.png`);
                        } else {
                            setFailed(true);
                        }
                    }} 
                    className="h-full w-auto object-contain object-bottom drop-shadow-2xl translate-y-10" 
                    alt={name} 
                />
            ) : null}
        </div>
    );
}

function TitleBlock({ style, matchInfo }: { style: ElementStyle, matchInfo: any }) {
    const font = getFontById(style.fontFamily || 'ttlakes');
    const accent = style.gradientStart || '#ff4b5c';
    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 style={{ 
                fontSize: style.fontSize || 240, 
                fontWeight: style.fontWeight || 900, 
                color: style.textColor || '#f1c40f', 
                fontFamily: font?.family,
                margin: 0,
                lineHeight: 0.8,
                letterSpacing: '-0.04em',
                textTransform: 'uppercase',
                textShadow: '0 8px 30px rgba(0,0,0,0.5)'
            }}>
                {style.text || 'MVP'}
            </h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 20 }}>
                <div style={{ backgroundColor: accent, padding: '4px 20px', alignSelf: 'flex-start' }}>
                    <span style={{ fontSize: 32, fontWeight: 900, color: '#ffffff', fontFamily: font?.family, textTransform: 'uppercase' }}>
                        {matchInfo.stageName}
                    </span>
                </div>
                <span style={{ fontSize: 36, fontWeight: 900, color: '#ffffff', fontFamily: font?.family, textTransform: 'uppercase', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                    {matchInfo.groupName} - MATCH {matchInfo.matchNumber}
                </span>
            </div>
        </div>
    );
}

function PlayerInfoBlock({ player, style }: { player: PlayerStat, style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'ttlakes');
    const bg = style.bgColor || '#0b6e70';
    const accent = style.accentColor || '#ff4b5c';
    const textColor = style.textColor || '#ffffff';

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'stretch' }}>
            <div style={{ width: 80, backgroundColor: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                <img src={player.logoUrl?.replace('http:', `${API_URL}`)} onError={(e) => e.currentTarget.style.display = 'none'} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" />
            </div>
            <div style={{ flex: 1, backgroundColor: bg, display: 'flex', alignItems: 'center', padding: '0 30px' }}>
                <span style={{ fontSize: style.fontSize || 48, fontWeight: 900, color: textColor, fontFamily: font?.family, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {player.name}
                </span>
            </div>
        </div>
    );
}

function StatsBlock({ player, style }: { player: PlayerStat, style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'ttlakes');
    const bg = style.bgColor || '#0b6e70';
    const textColor = style.textColor || '#ffffff';

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const StatItem = ({ label, value, showBorder = true }: any) => (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: showBorder ? '2px solid rgba(255,255,255,0.1)' : 'none' }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: textColor, fontFamily: font?.family, opacity: 0.8, marginBottom: 10 }}>{label}</span>
            <span style={{ fontSize: 80, fontWeight: 900, color: '#f1c40f', fontFamily: font?.family, lineHeight: 1 }}>{value}</span>
        </div>
    );

    return (
        <div style={{ width: '100%', height: '100%', backgroundColor: bg, display: 'flex', padding: '20px 0' }}>
            <StatItem label="ELIMS" value={String(player.killNum).padStart(2, '0')} />
            <StatItem label="DAMAGE" value={String(player.damage).padStart(3, '0')} />
            <StatItem label="ASSIST" value={String(player.assists).padStart(2, '0')} />
            <StatItem label="TEAM CONTRI" value={player.teamContri || '00.00%'} />
            <StatItem label="SURV TIME" value={formatTime(player.survivalTime)} showBorder={false} />
        </div>
    );
}

export default function MatchMvpPremium() {
    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [resetCounter, setResetCounter] = useState(0);
    const [styleTick, setStyleTick] = useState(0);
    const [pushCounter, setPushCounter] = useState(0);
    const [canvasScale, setCanvasScale] = useState(1);
    
    const [mvp, setMvp] = useState<PlayerStat | null>(null);
    const [matchInfo, setMatchInfo] = useState({
        stageName: 'FINALS',
        groupName: 'DAY 1',
        dayNumber: 1,
        matchNumber: 1,
    });

    useEffect(() => { injectBroadcastFonts(); }, []);
    useEffect(() => { const p = new URLSearchParams(window.location.search); if (p.get('edit') === 'true') setEditMode(true); }, []);

    const processData = (activePlayers: PlayerStat[], info?: any) => {
        if (info) setMatchInfo(info);
        if (activePlayers.length === 0) return;

        // Find MVP: Highest Elims, then highest Damage
        const sorted = [...activePlayers].sort((a, b) => 
            b.killNum - a.killNum || 
            b.damage - a.damage || 
            b.survivalTime - a.survivalTime
        );
        
        const top = sorted[0];
        
        // Calculate team contribution (total kills in match)
        const teamKills = activePlayers
            .filter(p => p.teamName === top.teamName)
            .reduce((sum, p) => sum + p.killNum, 0);
        
        const contri = teamKills > 0 ? (top.killNum / teamKills * 100).toFixed(2) : '00.00';

        setMvp({
            ...top,
            teamContri: `${contri}%`
        });
    };

    useEffect(() => {
        if (editMode) return;
        fetch(`${API_URL}/api/match-state/test-match-001`)
            .then(res => res.json())
            .then(data => { if (data.activePlayers) processData(data.activePlayers, data.matchInfo); })
            .catch(console.error);

        const socket = io(`http://${window.location.hostname}:4000`);
        socket.on('match_state_update', (data) => { if (data?.activePlayers) processData(data.activePlayers, data.matchInfo); });
        socket.on('layout_push', (data: { overlayKey: string; layout: Record<string, any> }) => {
            if (data.overlayKey !== OVERLAY_KEY) return;
            Object.entries(data.layout).forEach(([id, config]) => { try { localStorage.setItem(`strymx_layout:${OVERLAY_KEY}:${id}`, JSON.stringify(config)); } catch {} });
            setPushCounter(c => c + 1);
        });
        return () => { socket.disconnect(); };
    }, [editMode]);

    useEffect(() => { const h = (e: StorageEvent) => { if (e.key?.startsWith(`strymx_layout:${OVERLAY_KEY}:`)) setStyleTick(t => t + 1); }; window.addEventListener('storage', h); return () => window.removeEventListener('storage', h); }, []);
    useEffect(() => { if (!editMode) return; const c = () => { setCanvasScale(Math.min((window.innerWidth - 480) / VIEWPORT.width, (window.innerHeight - 80) / VIEWPORT.height, 1)); }; c(); window.addEventListener('resize', c); return () => window.removeEventListener('resize', c); }, [editMode]);

    const activeMvp = editMode ? MOCK_MVP : mvp;
    
    const allStyles: Record<string, ElementStyle> = {};
    const allTransforms: Record<string, ElementTransform> = {};
    ALL_IDS.forEach(id => { allStyles[id] = { ...DEFAULTS[id].style, ...readElementStyle(OVERLAY_KEY, id) }; allTransforms[id] = { ...DEFAULTS[id].transform, ...readElementTransform(OVERLAY_KEY, id) }; });

    const handleReset = () => { clearOverlayLayout(OVERLAY_KEY); setResetCounter(c => c + 1); setStyleTick(t => t + 1); setSelectedId(null); };
    const handleStyleChangeAll = (patch: Partial<ElementStyle>) => { ALL_IDS.forEach(id => updateElementStyle(OVERLAY_KEY, id, patch)); setStyleTick(t => t + 1); };
    const handleSave = async (): Promise<boolean> => { const layout: Record<string, any> = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith(`strymx_layout:${OVERLAY_KEY}:`)) { try { layout[k.replace(`strymx_layout:${OVERLAY_KEY}:`, '')] = JSON.parse(localStorage.getItem(k)!); } catch {} } } try { return (await fetch(`${API_URL}/api/layouts/push`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ overlayKey: OVERLAY_KEY, layout }) })).ok; } catch { return false; } };

    const cls = 'mvp-canvas-bounds';

    const viewportNode = (
        <div className={cls} style={{ width: VIEWPORT.width, height: VIEWPORT.height, overflow: 'hidden', position: 'relative', background: editMode ? 'rgba(15,23,42,0.8)' : 'transparent', border: editMode ? '2px dashed rgba(59,130,246,0.3)' : undefined, borderRadius: editMode ? 12 : 0 }}>
            {editMode && <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(148,163,184,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />}

            <EditableGraphicElement key={editMode ? `t-${resetCounter}` : `t-${resetCounter}-${pushCounter}`} id={BLOCK_IDS.title} overlayKey={OVERLAY_KEY} defaultTransform={DEFAULTS[BLOCK_IDS.title].transform} defaultStyle={DEFAULTS[BLOCK_IDS.title].style} editMode={editMode} selected={selectedId === BLOCK_IDS.title} onSelect={setSelectedId} label="MVP Title Block" bounds={`.${cls}`} scale={canvasScale}>
                {(s) => <TitleBlock style={s} matchInfo={matchInfo} />}
            </EditableGraphicElement>

            {activeMvp && (
                <EditableGraphicElement key={editMode ? `p-${resetCounter}` : `p-${resetCounter}-${pushCounter}`} id={BLOCK_IDS.portrait} overlayKey={OVERLAY_KEY} defaultTransform={DEFAULTS[BLOCK_IDS.portrait].transform} defaultStyle={DEFAULTS[BLOCK_IDS.portrait].style} editMode={editMode} selected={selectedId === BLOCK_IDS.portrait} onSelect={setSelectedId} label="MVP Portrait" bounds={`.${cls}`} scale={canvasScale}>
                    {(s) => <PlayerPortrait photoUrl={activeMvp.photoUrl} playerKey={activeMvp.playerKey} name={activeMvp.name || ''} />}
                </EditableGraphicElement>
            )}

            {activeMvp && (
                <EditableGraphicElement key={editMode ? `info-${resetCounter}` : `info-${resetCounter}-${pushCounter}`} id={BLOCK_IDS.playerInfo} overlayKey={OVERLAY_KEY} defaultTransform={DEFAULTS[BLOCK_IDS.playerInfo].transform} defaultStyle={DEFAULTS[BLOCK_IDS.playerInfo].style} editMode={editMode} selected={selectedId === BLOCK_IDS.playerInfo} onSelect={setSelectedId} label="Player Name Block" bounds={`.${cls}`} scale={canvasScale}>
                    {(s) => <PlayerInfoBlock player={activeMvp} style={s} />}
                </EditableGraphicElement>
            )}

            {activeMvp && (
                <EditableGraphicElement key={editMode ? `stats-${resetCounter}` : `stats-${resetCounter}-${pushCounter}`} id={BLOCK_IDS.stats} overlayKey={OVERLAY_KEY} defaultTransform={DEFAULTS[BLOCK_IDS.stats].transform} defaultStyle={DEFAULTS[BLOCK_IDS.stats].style} editMode={editMode} selected={selectedId === BLOCK_IDS.stats} onSelect={setSelectedId} label="MVP Stats Bar" bounds={`.${cls}`} scale={canvasScale}>
                    {(s) => <StatsBlock player={activeMvp} style={s} />}
                </EditableGraphicElement>
            )}
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
                statCards={[{ id: BLOCK_IDS.title, label: 'MVP Title & Match' }, { id: BLOCK_IDS.playerInfo, label: 'Player & Team' }, { id: BLOCK_IDS.stats, label: 'Stats Bar' }, { id: BLOCK_IDS.portrait, label: 'Player Portrait' }]}
                elementStyles={allStyles} elementTransforms={allTransforms}
                onStyleChange={(id, p) => { updateElementStyle(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onStyleChangeAll={handleStyleChangeAll}
                onTransformChange={(id, p) => { updateElementTransform(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onReset={handleReset} onClose={() => { window.location.href = window.location.pathname; }}
                onSave={handleSave} selectedId={selectedId}
                obsUrlPath="/overlays/match-mvp?layout=custom&design=premium"
                currentDesign="premium"
                onDesignChange={(d) => { window.location.href = `/overlays/match-mvp?edit=true&design=${d}`; }}
            />
        </div>
    );
}
