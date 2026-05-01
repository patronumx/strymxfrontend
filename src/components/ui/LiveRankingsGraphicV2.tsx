"use client"
import { API_URL , WS_URL} from '@/lib/api-config';

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
import LiveRankingsEditSidebar, { type LayoutElementDef } from './LiveRankingsEditSidebar';
import { injectBroadcastFonts } from './broadcastFonts';

const OVERLAY_KEY = 'live-rankings';
const VIEWPORT = { width: 1920, height: 1080 };

const ELEMENTS: LayoutElementDef[] = [
    { id: 'lr-header', label: 'Top Team Info' },
    { id: 'lr-portraits', label: 'Player Portraits' },
    { id: 'lr-table',  label: 'Rankings Table' },
    { id: 'lr-legend', label: 'Health Legend' },
];

const DEFAULT_TRANSFORMS: Record<string, ElementTransform> = {
    'lr-header': { x: 32, y: 32, width: 300, height: 170 },
    'lr-portraits': { x: 332, y: 32, width: 200, height: 170 },
    'lr-table':  { x: 32, y: 210, width: 500, height: 600 },
    'lr-legend': { x: 32, y: 820, width: 500, height: 40 },
};

const DEFAULT_STYLES: Record<string, ElementStyle> = {
    'lr-header': {
        gradientStart: '#fd5564', // pink/red
        textColor: '#ffffff',
        fontFamily: 'impact',
        visible: true,
        text: 'LIVE RANKINGS',
        borderRadius: 0,
        opacity: 1,
    },
    'lr-portraits': {
        bgColor: '#003340',
        visible: true,
        opacity: 1,
        borderRadius: 0,
    },
    'lr-table': {
        bgColor: '#003340',
        gradientEnd: '#00c0b5',
        borderColor: '#ffffff',
        gradientStart: '#fd5564', // rank bg
        shadowColor: '#ffffff', // rank text
        textColor: '#ffffff', // team name
        glowColor: '#ffffff', // elims text
        fontFamily: 'impact',
        visible: true,
        opacity: 1,
    },
    'lr-legend': {
        bgColor: '#ffffff',
        textColor: '#000000',
        fontFamily: 'impact',
        visible: true,
        opacity: 1,
    }
};

export default function LiveRankingsGraphicV2() {
    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [resetCounter, setResetCounter] = useState(0);
    const [styleTick, setStyleTick] = useState(0);
    const [pushCounter, setPushCounter] = useState(0);
    const [canvasScale, setCanvasScale] = useState(1);
    
    const [fetchedData, setFetchedData] = useState<any[]>([]);
    const lastDataRef = useRef<string>('');

    useEffect(() => { injectBroadcastFonts(); }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('edit') === 'true') setEditMode(true);
    }, []);

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
        const socket = io(WS_URL);
        socket.on('match_state_update', handleUpdate);

        socket.on('layout_push', (data: { overlayKey: string; layout: Record<string, any> }) => {
            if (data.overlayKey !== OVERLAY_KEY) return;
            Object.entries(data.layout).forEach(([elementId, config]) => {
                const key = `strymx_layout:${OVERLAY_KEY}:${elementId}`;
                try { localStorage.setItem(key, JSON.stringify(config)); } catch {}
            });
            setPushCounter(c => c + 1);
        });

        return () => { socket.disconnect(); };
    }, [handleUpdate]);

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

    const allElementStyles: Record<string, ElementStyle> = {};
    const allElementTransforms: Record<string, ElementTransform> = {};
    ELEMENTS.forEach(def => {
        const savedStyle = readElementStyle(OVERLAY_KEY, def.id);
        const savedTransform = readElementTransform(OVERLAY_KEY, def.id);
        allElementStyles[def.id] = { ...DEFAULT_STYLES[def.id], ...savedStyle };
        allElementTransforms[def.id] = { ...DEFAULT_TRANSFORMS[def.id], ...savedTransform };
    });

    const handleReset = () => {
        clearOverlayLayout(OVERLAY_KEY);
        setResetCounter(c => c + 1);
        setStyleTick(t => t + 1);
        setSelectedId(null);
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
            const res = await fetch(`${API_URL}/api/layouts/push`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ overlayKey: OVERLAY_KEY, layout }),
            });
            return res.ok;
        } catch { return false; }
    };

    // --- Data Processing ---
    const teamsData = useMemo(() => {
        if (!fetchedData || fetchedData.length === 0) return [];
        const teamMap = new Map<string, any>();
        fetchedData.forEach((p: any) => {
            const nameStr = p.playerName || p.PlayerName || '';
            if ((nameStr === '' || nameStr === 'Unknown') && (!p.damage && !p.killNum)) return;
            const tName = p.teamName || p.teamId || 'Unknown';
            if (!teamMap.has(tName)) {
                teamMap.set(tName, { teamName: tName, elims: 0, placePts: 0, totalPts: 0, players: [], logoUrl: p.logoUrl });
            }
            const team = teamMap.get(tName);
            team.players.push(p);
            team.elims += (p.killNum || p.KillNum || 0);
            team.placePts = Math.max(team.placePts, p.placePts || 0);
        });

        const sortedTeams = Array.from(teamMap.values()).map(t => ({
            ...t, totalPts: t.elims + t.placePts
        })).sort((a, b) => b.totalPts - a.totalPts);

        return sortedTeams.map((t, index) => ({ ...t, rank: index + 1 }));
    }, [fetchedData]);

    const totalTeamsNeeded = 16;
    const displayTeams = teamsData.length > 0 ? teamsData : Array.from({ length: totalTeamsNeeded }).map((_, i) => ({
        rank: i + 1, teamName: i === 0 ? "WAITING" : "TAG", placePts: 0, elims: 0, totalPts: 0,
        players: Array.from({ length: 4 }).map((_, j) => ({
            playerKey: `dummy-${i}-${j}`, name: '-', killNum: 0, liveState: j === 2 ? 1 : j === 3 ? 2 : 0
        }))
    }));

    const fullDisplayTeams = [...displayTeams];
    while (fullDisplayTeams.length < totalTeamsNeeded) {
        fullDisplayTeams.push({
            rank: fullDisplayTeams.length + 1, teamName: `TAG`, elims: 0,
            players: Array.from({ length: 4 }).map((_, j) => ({ playerKey: `dummy-${fullDisplayTeams.length}-${j}`, liveState: 0 }))
        });
    }

    const renderHealthBars = (players: any[]) => (
        <div className="flex gap-1 items-center justify-center">
            {players.slice(0, 4).map((p, idx) => {
                const state = p.liveState ?? 0;
                let bgColor = '#f5eb49';
                if (state === 1) bgColor = '#fd5564';
                else if (state === 2) bgColor = '#003b46';
                return <div key={idx} className="w-[10px] h-6" style={{ backgroundColor: bgColor }} />;
            })}
        </div>
    );

    const canvasBoundsClass = 'lr-canvas-bounds';

    const viewportNode = (
        <div
            className={canvasBoundsClass}
            style={{
                width: VIEWPORT.width, height: VIEWPORT.height,
                overflow: 'hidden', position: 'relative',
                fontFamily: 'system-ui, sans-serif',
                userSelect: 'none',
                background: editMode ? 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.7))' : 'transparent',
                border: editMode ? '2px dashed rgba(249,115,22,0.25)' : undefined,
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
            {editMode && selectedId && <div onClick={() => setSelectedId(null)} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />}

            {/* HEADER ELEMENT */}
            <EditableGraphicElement
                key={`lr-header-${resetCounter}-${pushCounter}`}
                id="lr-header"
                overlayKey={OVERLAY_KEY}
                defaultTransform={DEFAULT_TRANSFORMS['lr-header']}
                defaultStyle={DEFAULT_STYLES['lr-header']}
                editMode={editMode}
                selected={selectedId === 'lr-header'}
                onSelect={setSelectedId}
                label="Top Team Info"
                bounds={`.${canvasBoundsClass}`}
                scale={canvasScale}
            >
                {(style) => {
                    const topTeam = fullDisplayTeams[0];
                    const topPlayers = [...(topTeam.players || [])];
                    while (topPlayers.length < 4) topPlayers.push({ playerKey: `dummy-top`, liveState: 0 });

                    return (
                        <div className="w-full h-full overflow-hidden" 
                            style={{ 
                                background: style.gradientStart,
                                borderRadius: style.borderRadius || 0,
                                opacity: style.opacity
                            }}>
                            <div className="flex flex-col p-4 h-full relative">
                                <div className="font-black text-2xl uppercase tracking-wider mb-2" style={{ color: style.textColor, fontFamily: style.fontFamily }}>
                                    {style.text}
                                </div>
                                <div className="flex items-center gap-3 mb-4">
                                    {topTeam.logoUrl ? (
                                        <img src={topTeam.logoUrl} className="w-12 h-12 object-contain drop-shadow-md" alt="" />
                                    ) : (
                                        <div className="w-12 h-12 flex items-center justify-center font-black text-3xl drop-shadow-md" style={{ color: style.textColor, fontFamily: style.fontFamily }}>
                                            {topTeam.teamName.charAt(0)}
                                        </div>
                                    )}
                                    <div className="w-1 h-10 bg-white/50"></div>
                                    <span className="font-black text-3xl leading-none tracking-tighter drop-shadow-md truncate" style={{ color: style.textColor, fontFamily: style.fontFamily }}>
                                        {topTeam.teamName.replace(/^scout\s+/i, '')}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between mt-auto">
                                    {renderHealthBars(topPlayers)}
                                    <div className="font-black text-3xl leading-none drop-shadow-md" style={{ color: style.textColor, fontFamily: style.fontFamily }}>
                                        {topTeam.elims}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                }}
            </EditableGraphicElement>

            {/* PORTRAITS ELEMENT */}
            <EditableGraphicElement
                key={`lr-portraits-${resetCounter}-${pushCounter}`}
                id="lr-portraits"
                overlayKey={OVERLAY_KEY}
                defaultTransform={DEFAULT_TRANSFORMS['lr-portraits']}
                defaultStyle={DEFAULT_STYLES['lr-portraits']}
                editMode={editMode}
                selected={selectedId === 'lr-portraits'}
                onSelect={setSelectedId}
                label="Portraits"
                bounds={`.${canvasBoundsClass}`}
                scale={canvasScale}
            >
                {(style) => {
                    const topTeam = fullDisplayTeams[0];
                    const topPlayers = [...(topTeam.players || [])];
                    while (topPlayers.length < 4) topPlayers.push({ playerKey: `dummy-top`, liveState: 0 });

                    return (
                        <div className="w-full h-full grid grid-cols-2 grid-rows-2 overflow-hidden"
                            style={{
                                backgroundColor: style.bgColor,
                                borderRadius: style.borderRadius || 0,
                                opacity: style.opacity
                            }}>
                            {topPlayers.slice(0, 4).map((p, idx) => (
                                <div key={idx} className="relative overflow-hidden bg-slate-800">
                                    <img 
                                        src={`${API_URL}/images/${p.playerKey}.png`} 
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        className="w-full h-full object-cover object-top" 
                                        alt="" 
                                    />
                                    {p.liveState === 2 && <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"></div>}
                                    {p.liveState === 1 && <div className="absolute inset-0 bg-red-500/20"></div>}
                                </div>
                            ))}
                        </div>
                    );
                }}
            </EditableGraphicElement>

            {/* TABLE ELEMENT */}
            <EditableGraphicElement
                key={`lr-table-${resetCounter}-${pushCounter}`}
                id="lr-table"
                overlayKey={OVERLAY_KEY}
                defaultTransform={DEFAULT_TRANSFORMS['lr-table']}
                defaultStyle={DEFAULT_STYLES['lr-table']}
                editMode={editMode}
                selected={selectedId === 'lr-table'}
                onSelect={setSelectedId}
                label="Rankings Table"
                bounds={`.${canvasBoundsClass}`}
                scale={canvasScale}
            >
                {(style) => {
                    const rowHeight = `${100 / 16}%`; // 1 row for header, 15 for teams
                    return (
                        <div className="w-full h-full flex flex-col shadow-2xl overflow-hidden" style={{ borderRadius: style.borderRadius || 0, opacity: style.opacity }}>
                            {/* Table Header */}
                            <div className="flex items-center w-full" style={{ height: rowHeight, backgroundColor: style.gradientStart }}>
                                <div className="w-12"></div>
                                <div className="flex-1 px-3 font-black uppercase text-sm tracking-widest" style={{ color: style.bgColor, fontFamily: style.fontFamily }}>TEAM</div>
                                <div className="w-20 text-center font-black uppercase text-sm tracking-widest" style={{ color: style.bgColor, fontFamily: style.fontFamily }}>ALIVE</div>
                                <div className="w-16 text-center font-black uppercase text-sm tracking-widest" style={{ color: style.bgColor, fontFamily: style.fontFamily }}>ELIMS</div>
                            </div>
                            
                            {/* Table Rows */}
                            {fullDisplayTeams.slice(1, 16).map((team: any, idx: number) => (
                                <div key={idx} className="flex items-center w-full relative" style={{ height: rowHeight }}>
                                    <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ backgroundColor: style.borderColor, opacity: 0.3 }} />
                                    
                                    <div className="w-12 h-full flex items-center justify-center font-black text-xl" 
                                        style={{ backgroundColor: style.gradientStart, color: style.shadowColor, fontFamily: style.fontFamily }}>
                                        {team.rank}
                                    </div>
                                    
                                    <div className="flex-1 h-full flex items-center gap-3 px-3 overflow-hidden relative" style={{ backgroundColor: style.bgColor }}>
                                        {idx % 2 === 1 && <div className="absolute inset-0 bg-black/10" />}
                                        <div className="text-white/50 relative z-10">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                        </div>
                                        <span className="font-black uppercase text-lg truncate drop-shadow-md relative z-10" style={{ color: style.textColor, fontFamily: style.fontFamily }}>
                                            {team.teamName.replace(/^scout\s+/i, '')}
                                        </span>
                                    </div>
                                    
                                    <div className="relative h-full flex" style={{ backgroundColor: style.gradientEnd }}>
                                        {idx % 2 === 1 && <div className="absolute inset-0 bg-black/10" />}
                                        <div className="absolute top-0 bottom-0 -left-[10px] w-[10px]" style={{ color: style.gradientEnd }}>
                                            <svg preserveAspectRatio="none" viewBox="0 0 10 100" className="w-full h-full" fill="currentColor">
                                                <polygon points="10,0 0,16 10,33 0,50 10,66 0,83 10,100" />
                                            </svg>
                                            {idx % 2 === 1 && <div className="absolute inset-0 bg-black/10" />}
                                        </div>
                                        <div className="w-20 h-full flex items-center justify-center relative z-10">
                                            {renderHealthBars(team.players)}
                                        </div>
                                        <div className="w-16 h-full flex items-center justify-center font-black text-xl drop-shadow-md relative z-10" style={{ color: style.glowColor, fontFamily: style.fontFamily }}>
                                            {team.elims}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                }}
            </EditableGraphicElement>

            {/* LEGEND ELEMENT */}
            <EditableGraphicElement
                key={`lr-legend-${resetCounter}-${pushCounter}`}
                id="lr-legend"
                overlayKey={OVERLAY_KEY}
                defaultTransform={DEFAULT_TRANSFORMS['lr-legend']}
                defaultStyle={DEFAULT_STYLES['lr-legend']}
                editMode={editMode}
                selected={selectedId === 'lr-legend'}
                onSelect={setSelectedId}
                label="Legend"
                bounds={`.${canvasBoundsClass}`}
                scale={canvasScale}
            >
                {(style) => (
                    <div className="w-full h-full flex items-center justify-center gap-6 shadow-xl" 
                        style={{ 
                            backgroundColor: style.bgColor, 
                            color: style.textColor, 
                            fontFamily: style.fontFamily,
                            borderRadius: style.borderRadius || 0,
                            opacity: style.opacity
                        }}>
                        <div className="flex items-center gap-2 font-black uppercase text-sm tracking-widest drop-shadow-sm">
                            <div className="w-4 h-4 bg-[#f5eb49] shadow-inner" /> ALIVE
                        </div>
                        <div className="flex items-center gap-2 font-black uppercase text-sm tracking-widest drop-shadow-sm">
                            <div className="w-4 h-4 bg-[#fd5564] shadow-inner" /> KNOCK
                        </div>
                        <div className="flex items-center gap-2 font-black uppercase text-sm tracking-widest drop-shadow-sm">
                            <div className="w-4 h-4 bg-[#003b46] border border-black/20 shadow-inner" /> ELIM
                        </div>
                    </div>
                )}
            </EditableGraphicElement>
        </div>
    );

    if (!editMode) {
        return <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>{viewportNode}</div>;
    }

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(30,41,59,0.95), rgba(2,6,23,0.98))',
            overflow: 'hidden',
        }}>
            <div style={{
                position: 'absolute', left: 0, top: 0, right: 400, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 20, pointerEvents: 'none',
            }}>
                <div style={{
                    width: VIEWPORT.width * canvasScale, height: VIEWPORT.height * canvasScale,
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

            <LiveRankingsEditSidebar
                elements={ELEMENTS}
                elementStyles={allElementStyles}
                elementTransforms={allElementTransforms}
                onStyleChange={(id, patch) => { updateElementStyle(OVERLAY_KEY, id, patch); setStyleTick(t => t + 1); }}
                onStyleChangeAll={(patch) => { ELEMENTS.forEach(e => updateElementStyle(OVERLAY_KEY, e.id, patch)); setStyleTick(t => t + 1); }}
                onTransformChange={(id, patch) => { updateElementTransform(OVERLAY_KEY, id, patch); setStyleTick(t => t + 1); }}
                onReset={handleReset}
                onClose={() => { window.location.href = window.location.pathname; }}
                onSave={handleSaveAndPush}
                selectedId={selectedId}
                obsUrlPath="/overlay/live-rankings?layout=custom"
            />
        </div>
    );
}
