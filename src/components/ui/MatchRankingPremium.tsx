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

const OVERLAY_KEY = 'match-ranking-premium';
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
    placePts?: number;
    killPts?: number;
    matchPts?: number;
    placement?: number | null;
}

interface TeamScore {
    name: string;
    logoUrl: string;
    elims: number;
    placePts: number;
    totalPts: number;
    teamId?: number;
    placement?: number | null;
    players: (PlayerStat & { playerKey: string })[];
}

const BLOCK_IDS = {
    header: 'mrPremiumHeader',
    topTeam: 'mrPremiumTopTeam',
    column1: 'mrPremiumCol1',
    column2: 'mrPremiumCol2',
};

const DEFAULTS: Record<string, { transform: ElementTransform; style: ElementStyle }> = {
    [BLOCK_IDS.header]: { 
        transform: { x: 100, y: 50, width: 1000, height: 180 }, 
        style: { textColor: '#f1c40f', gradientStart: '#ff4b5c', fontSize: 110, text: 'MATCH RANKINGS', fontFamily: 'ttlakes', fontWeight: 900, fontStyle: 'normal' } 
    },
    [BLOCK_IDS.topTeam]: { 
        transform: { x: 80, y: 240, width: 680, height: 750 }, 
        style: { bgColor: '#0b6e70', borderColor: '#ff4b5c', textColor: '#ffffff', fontSize: 48, fontFamily: 'ttlakes', fontWeight: 700, fontStyle: 'normal' } 
    },
    [BLOCK_IDS.column1]: { 
        transform: { x: 780, y: 240, width: 520, height: 750 }, 
        style: { bgColor: '#0b6e70', borderColor: '#ffffff', textColor: '#ffffff', fontSize: 24, fontFamily: 'ttlakes', fontWeight: 700, fontStyle: 'normal' } 
    },
    [BLOCK_IDS.column2]: { 
        transform: { x: 1320, y: 240, width: 520, height: 750 }, 
        style: { bgColor: '#0b6e70', borderColor: '#ffffff', textColor: '#ffffff', fontSize: 24, fontFamily: 'ttlakes', fontWeight: 700, fontStyle: 'normal' } 
    },
};

const ALL_IDS = Object.values(BLOCK_IDS);

// MOCK DATA for Edit Mode
const MOCK_TEAMS: TeamScore[] = Array.from({ length: 17 }).map((_, i) => ({
    name: `TEAM ${i + 1}`,
    logoUrl: 'http://localhost:4000/placeholder.png',
    elims: Math.floor(Math.random() * 20),
    placePts: Math.floor(Math.random() * 10),
    totalPts: Math.floor(Math.random() * 30),
    placement: i + 1,
    players: Array.from({ length: 4 }).map((__, j) => ({
        playerKey: `mock-${i}-${j}`,
        name: `PLAYER${j+1}`,
        teamName: `TEAM ${i + 1}`,
        health: 100,
        liveState: 0,
        killNum: 0,
        damage: 0,
        assists: 0,
        survivalTime: 0
    }))
})).sort((a, b) => b.totalPts - a.totalPts);

function PlayerPortrait({ photoUrl, playerKey, name }: { photoUrl?: string; playerKey: string; name: string }) {
    const [imgSrc, setImgSrc] = useState<string | null>(photoUrl || (playerKey ? `http://localhost:4000/images/${playerKey}.png` : null));
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!photoUrl && playerKey) {
            setImgSrc(`http://localhost:4000/images/${playerKey}.png`);
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
                            setImgSrc(`http://localhost:4000/images/${playerKey}.png`);
                        } else {
                            setFailed(true);
                        }
                    }} 
                    className="h-[120%] max-w-none object-cover object-top mask-image-bottom drop-shadow-2xl translate-y-4" 
                    alt={name} 
                />
            ) : null}
        </div>
    );
}

function HeaderBlock({ style, matchInfo }: { style: ElementStyle, matchInfo: any }) {
    const font = getFontById(style.fontFamily || 'ttlakes');
    const accent = style.gradientStart || '#ff4b5c';
    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: 40 }}>
            {/* Left Side: Main Title */}
            <h1 style={{ 
                fontSize: style.fontSize || 110, 
                fontWeight: style.fontWeight || 900, 
                fontStyle: style.fontStyle || 'normal', 
                color: style.textColor || '#f1c40f', 
                fontFamily: font?.family,
                margin: 0,
                lineHeight: 1,
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
                textShadow: '0 4px 15px rgba(0,0,0,0.5)'
            }}>
                {style.text || 'MATCH RANKINGS'}
            </h1>

            {/* Right Side: Dynamic Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                <span style={{ 
                    fontSize: 48, 
                    fontWeight: 900, 
                    color: '#ffffff', 
                    fontFamily: font?.family, 
                    textTransform: 'uppercase', 
                    lineHeight: 1,
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}>
                    {matchInfo.groupName} MATCH {matchInfo.matchNumber}
                </span>
                <div style={{ 
                    backgroundColor: accent, 
                    padding: '6px 20px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    minWidth: 120
                }}>
                    <span style={{ 
                        fontSize: 36, 
                        fontWeight: 900, 
                        color: '#ffffff', 
                        fontFamily: font?.family, 
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        {matchInfo.stageName}
                    </span>
                </div>
            </div>
        </div>
    );
}

function TopTeamBlock({ team, style }: { team: TeamScore, style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'ttlakes');
    const bg = style.bgColor || '#0b6e70';
    const accent = style.borderColor || '#ff4b5c';
    const textColor = style.textColor || '#ffffff';
    
    if (!team) return null;

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* Background shape */}
            <div style={{ position: 'absolute', inset: 0, backgroundColor: bg, clipPath: 'polygon(0 0, 100% 10%, 100% 100%, 0 100%)', zIndex: 0 }} />
            
            {/* Large #1 */}
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
                <span style={{ fontSize: 120, fontWeight: 900, color: textColor, fontFamily: font?.family, textShadow: '0 4px 20px rgba(0,0,0,0.3)', lineHeight: 1 }}>#1</span>
            </div>

            {/* Players */}
            <div style={{ flex: 1, display: 'flex', position: 'relative', zIndex: 5, marginTop: 40 }}>
                {team.players.slice(0, 4).map((p, idx) => (
                    <div key={idx} style={{ flex: 1, position: 'relative' }}>
                        <PlayerPortrait photoUrl={p.photoUrl} playerKey={p.playerKey} name={p.name || ''} />
                    </div>
                ))}
            </div>

            {/* Team Name Bar */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 40px', marginBottom: 20, zIndex: 10 }}>
                <img src={team.logoUrl.replace('http:', 'http://localhost:4000')} onError={(e) => e.currentTarget.style.display = 'none'} style={{ height: 80, width: 80, objectFit: 'contain', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }} alt="" />
                <span style={{ fontSize: 64, fontWeight: 900, color: textColor, fontFamily: font?.family, marginLeft: 20, textTransform: 'uppercase' }}>{team.name}</span>
            </div>

            {/* Stats Bar */}
            <div style={{ display: 'flex', backgroundColor: accent, padding: '20px 40px', zIndex: 10 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRight: '2px solid rgba(255,255,255,0.3)' }}>
                    <span style={{ fontSize: 64, fontWeight: 900, color: textColor, fontFamily: font?.family, lineHeight: 1 }}>{String(team.elims).padStart(2, '0')}</span>
                    <span style={{ fontSize: 24, fontWeight: 900, color: textColor, fontFamily: font?.family, marginTop: 4 }}>ELIMS</span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRight: '2px solid rgba(255,255,255,0.3)' }}>
                    <span style={{ fontSize: 64, fontWeight: 900, color: textColor, fontFamily: font?.family, lineHeight: 1 }}>{String(team.placePts).padStart(2, '0')}</span>
                    <span style={{ fontSize: 24, fontWeight: 900, color: textColor, fontFamily: font?.family, marginTop: 4 }}>PLACEMENT</span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: 64, fontWeight: 900, color: textColor, fontFamily: font?.family, lineHeight: 1 }}>{String(team.totalPts).padStart(2, '0')}</span>
                    <span style={{ fontSize: 24, fontWeight: 900, color: textColor, fontFamily: font?.family, marginTop: 4 }}>TOTAL</span>
                </div>
            </div>
        </div>
    );
}

function StandingsColumn({ teams, startIndex, style }: { teams: TeamScore[], startIndex: number, style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'ttlakes');
    const bg = style.bgColor || '#0b6e70';
    const textColor = style.textColor || '#ffffff';

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: bg, padding: '20px 0' }}>
            {/* Header Row */}
            <div style={{ display: 'flex', paddingBottom: 10, paddingLeft: 120, paddingRight: 30, borderBottom: '2px solid rgba(255,255,255,0.2)' }}>
                <div style={{ flex: 1 }}></div>
                <div style={{ display: 'flex', gap: 20 }}>
                    <span style={{ width: 60, textAlign: 'center', fontSize: 16, fontWeight: 700, color: textColor, fontFamily: font?.family }}>ELIMS</span>
                    <span style={{ width: 60, textAlign: 'center', fontSize: 16, fontWeight: 700, color: textColor, fontFamily: font?.family }}>PLACE</span>
                    <span style={{ width: 60, textAlign: 'center', fontSize: 16, fontWeight: 700, color: textColor, fontFamily: font?.family }}>TOTAL</span>
                </div>
            </div>

            {/* Team Rows */}
            {teams.map((team, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', flex: 1, borderBottom: idx < teams.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none', paddingRight: 30 }}>
                    <div style={{ 
                        width: 100, 
                        height: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        backgroundColor: '#002b33', // Dark blue background for rank
                        marginRight: 20,
                        borderRight: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <span style={{ fontSize: 36, fontWeight: 900, color: textColor, fontFamily: font?.family }}>#{startIndex + idx}</span>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 0 }}>
                        <img src={team.logoUrl.replace('http:', 'http://localhost:4000')} onError={(e) => e.currentTarget.style.display = 'none'} style={{ height: 36, width: 36, objectFit: 'contain' }} alt="" />
                        <span style={{ fontSize: 28, fontWeight: 900, color: textColor, fontFamily: font?.family, textTransform: 'uppercase' }}>{team.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 20 }}>
                        <span style={{ width: 60, textAlign: 'center', fontSize: 32, fontWeight: 900, color: textColor, fontFamily: font?.family }}>{String(team.elims).padStart(2, '0')}</span>
                        <span style={{ width: 60, textAlign: 'center', fontSize: 32, fontWeight: 900, color: textColor, fontFamily: font?.family }}>{String(team.placePts).padStart(2, '0')}</span>
                        <span style={{ width: 60, textAlign: 'center', fontSize: 32, fontWeight: 900, color: textColor, fontFamily: font?.family }}>{String(team.totalPts).padStart(2, '0')}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function MatchRankingPremium() {
    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [resetCounter, setResetCounter] = useState(0);
    const [styleTick, setStyleTick] = useState(0);
    const [pushCounter, setPushCounter] = useState(0);
    const [canvasScale, setCanvasScale] = useState(1);
    
    const [teams, setTeams] = useState<TeamScore[]>([]);
    const [matchInfo, setMatchInfo] = useState({
        stageName: 'FINALS',
        groupName: 'DAY 1',
        dayNumber: 1,
        matchNumber: 1,
        mapName: 'Erangel'
    });
    
    const frozenOrderRef = useRef<string[]>([]);

    useEffect(() => { injectBroadcastFonts(); }, []);
    useEffect(() => { const p = new URLSearchParams(window.location.search); if (p.get('edit') === 'true') setEditMode(true); }, []);

    const processData = (activePlayers: PlayerStat[], info?: any) => {
        if (info) setMatchInfo(info);
        const teamMap = new Map<string, TeamScore>();

        activePlayers.forEach((p) => {
            const tName = p.teamName;
            if (!teamMap.has(tName)) {
                teamMap.set(tName, {
                    name: tName,
                    logoUrl: p.logoUrl || "http://localhost:4000/placeholder.png",
                    elims: 0,
                    placePts: 0, 
                    totalPts: 0,
                    teamId: p.teamId,
                    placement: null,
                    players: []
                });
            }
            const t = teamMap.get(tName)!;
            if (p.placePts !== undefined) t.placePts = p.placePts;
            if (p.placement !== undefined) t.placement = p.placement;
            t.elims += p.killNum;
            t.players.push(p);
        });

        const allTeams = Array.from(teamMap.values()).map(t => {
            t.totalPts = t.elims + t.placePts;
            t.players.sort((a, b) => a.playerKey.localeCompare(b.playerKey));
            return t;
        });

        if (frozenOrderRef.current.length === 0) {
            const initial = [...allTeams].sort((a, b) =>
                b.totalPts - a.totalPts ||
                b.elims - a.elims ||
                (a.teamId || 0) - (b.teamId || 0) ||
                a.name.localeCompare(b.name)
            );
            frozenOrderRef.current = initial.map(t => t.name);
        }

        const frozenOrder = frozenOrderRef.current;
        const teamIsEliminated = (t: TeamScore) => t.placement !== null && t.placement !== undefined;

        const sorted = [...allTeams].sort((a, b) => {
            const aliveA = teamIsEliminated(a) ? 1 : 0;
            const aliveB = teamIsEliminated(b) ? 1 : 0;
            if (aliveA !== aliveB) return aliveA - aliveB;
            const ptsDiff = b.totalPts - a.totalPts;
            if (ptsDiff !== 0) return ptsDiff;
            const elimsDiff = b.elims - a.elims;
            if (elimsDiff !== 0) return elimsDiff;
            const slotA = frozenOrder.indexOf(a.name);
            const slotB = frozenOrder.indexOf(b.name);
            return (slotA === -1 ? 9999 : slotA) - (slotB === -1 ? 9999 : slotB);
        });

        setTeams(sorted);
    };

    useEffect(() => {
        if (editMode) return;
        fetch(`http://localhost:4000/api/match-state/test-match-001`)
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

    const activeTeams = editMode ? MOCK_TEAMS : teams;
    const topTeam = activeTeams[0];
    
    // Dynamic splitting of remaining teams
    const remainingTeams = activeTeams.slice(1);
    const half = Math.ceil(remainingTeams.length / 2);
    // Limit to 8 rows per column maximum for design integrity
    const col1Teams = remainingTeams.slice(0, Math.min(half, 8));
    const col2Teams = remainingTeams.slice(half, Math.min(half + 8, remainingTeams.length));

    const allStyles: Record<string, ElementStyle> = {};
    const allTransforms: Record<string, ElementTransform> = {};
    ALL_IDS.forEach(id => { allStyles[id] = { ...DEFAULTS[id].style, ...readElementStyle(OVERLAY_KEY, id) }; allTransforms[id] = { ...DEFAULTS[id].transform, ...readElementTransform(OVERLAY_KEY, id) }; });

    const handleReset = () => { clearOverlayLayout(OVERLAY_KEY); setResetCounter(c => c + 1); setStyleTick(t => t + 1); setSelectedId(null); };
    const handleStyleChangeAll = (patch: Partial<ElementStyle>) => { ALL_IDS.forEach(id => updateElementStyle(OVERLAY_KEY, id, patch)); setStyleTick(t => t + 1); };
    const handleSave = async (): Promise<boolean> => { const layout: Record<string, any> = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith(`strymx_layout:${OVERLAY_KEY}:`)) { try { layout[k.replace(`strymx_layout:${OVERLAY_KEY}:`, '')] = JSON.parse(localStorage.getItem(k)!); } catch {} } } try { return (await fetch('http://localhost:4000/api/layouts/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ overlayKey: OVERLAY_KEY, layout }) })).ok; } catch { return false; } };

    const cls = 'mr-canvas-bounds';

    const viewportNode = (
        <div className={cls} style={{ width: VIEWPORT.width, height: VIEWPORT.height, overflow: 'hidden', position: 'relative', fontFamily: 'system-ui, sans-serif', userSelect: 'none', background: editMode ? 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.7))' : 'transparent', border: editMode ? '2px dashed rgba(59,130,246,0.25)' : undefined, borderRadius: editMode ? 12 : 0 }}>
            {editMode && <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />}
            {editMode && selectedId && <div onClick={() => setSelectedId(null)} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />}

            {/* Cyan background wave layer from mockup? Omitted to let OBS handle background, or we could add a subtle teal gradient */}
            {!editMode && (
                <div style={{ position: 'absolute', inset: 0, zIndex: -1, background: 'radial-gradient(ellipse at top right, rgba(11,110,112,0.15), transparent 60%)' }} />
            )}

            <EditableGraphicElement key={editMode ? `h-${resetCounter}` : `h-${resetCounter}-${pushCounter}`} id={BLOCK_IDS.header} overlayKey={OVERLAY_KEY} defaultTransform={DEFAULTS[BLOCK_IDS.header].transform} defaultStyle={DEFAULTS[BLOCK_IDS.header].style} editMode={editMode} selected={selectedId === BLOCK_IDS.header} onSelect={setSelectedId} label="Header Title" bounds={`.${cls}`} scale={canvasScale}>
                {(s) => <HeaderBlock style={s} matchInfo={matchInfo} />}
            </EditableGraphicElement>

            {topTeam && (
                <EditableGraphicElement key={editMode ? `t1-${resetCounter}` : `t1-${resetCounter}-${pushCounter}`} id={BLOCK_IDS.topTeam} overlayKey={OVERLAY_KEY} defaultTransform={DEFAULTS[BLOCK_IDS.topTeam].transform} defaultStyle={DEFAULTS[BLOCK_IDS.topTeam].style} editMode={editMode} selected={selectedId === BLOCK_IDS.topTeam} onSelect={setSelectedId} label="#1 Team Block" bounds={`.${cls}`} scale={canvasScale}>
                    {(s) => <TopTeamBlock team={topTeam} style={s} />}
                </EditableGraphicElement>
            )}

            {col1Teams.length > 0 && (
                <EditableGraphicElement key={editMode ? `c1-${resetCounter}` : `c1-${resetCounter}-${pushCounter}`} id={BLOCK_IDS.column1} overlayKey={OVERLAY_KEY} defaultTransform={DEFAULTS[BLOCK_IDS.column1].transform} defaultStyle={DEFAULTS[BLOCK_IDS.column1].style} editMode={editMode} selected={selectedId === BLOCK_IDS.column1} onSelect={setSelectedId} label="Standings Column 1" bounds={`.${cls}`} scale={canvasScale}>
                    {(s) => <StandingsColumn teams={col1Teams} startIndex={2} style={s} />}
                </EditableGraphicElement>
            )}

            {col2Teams.length > 0 && (
                <EditableGraphicElement key={editMode ? `c2-${resetCounter}` : `c2-${resetCounter}-${pushCounter}`} id={BLOCK_IDS.column2} overlayKey={OVERLAY_KEY} defaultTransform={DEFAULTS[BLOCK_IDS.column2].transform} defaultStyle={DEFAULTS[BLOCK_IDS.column2].style} editMode={editMode} selected={selectedId === BLOCK_IDS.column2} onSelect={setSelectedId} label="Standings Column 2" bounds={`.${cls}`} scale={canvasScale}>
                    {(s) => <StandingsColumn teams={col2Teams} startIndex={2 + col1Teams.length} style={s} />}
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
                statCards={[{ id: BLOCK_IDS.header, label: 'Main Header' }, { id: BLOCK_IDS.topTeam, label: '#1 Team Showcase' }, { id: BLOCK_IDS.column1, label: 'Standings (Col 1)' }, { id: BLOCK_IDS.column2, label: 'Standings (Col 2)' }]}
                elementStyles={allStyles} elementTransforms={allTransforms}
                onStyleChange={(id, p) => { updateElementStyle(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onStyleChangeAll={handleStyleChangeAll}
                onTransformChange={(id, p) => { updateElementTransform(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onReset={handleReset} onClose={() => { window.location.href = window.location.pathname; }}
                onSave={handleSave} selectedId={selectedId}
                obsUrlPath="/overlays/match-ranking?layout=custom&design=premium"
                currentDesign="premium"
                onDesignChange={(d) => { window.location.href = `/overlays/match-ranking?edit=true&design=${d}`; }}
            />
        </div>
    );
}
