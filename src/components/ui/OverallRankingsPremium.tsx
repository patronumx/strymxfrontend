"use client"
import { API_URL } from '@/lib/api-config';

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

const OVERLAY_KEY = 'overall-rankings-premium';
const VIEWPORT = { width: 1920, height: 1080 };

interface StandingRow {
    teamId: number;
    teamName: string;
    logoUrl: string;
    tag?: string;
    matchesPlayed: number;
    wwcd: number;
    killPoints: number;
    placementPoints: number;
    totalPoints: number;
    rank: number;
}

const BLOCK_IDS = {
    header: 'orPremiumHeader',
    column1: 'orPremiumCol1',
    column2: 'orPremiumCol2',
};

const DEFAULTS: Record<string, { transform: ElementTransform; style: ElementStyle }> = {
    [BLOCK_IDS.header]: { 
        transform: { x: 190, y: 35, width: 1540, height: 150 }, 
        style: { textColor: '#e7ff00', gradientStart: '#ff4b5c', fontSize: 130, text: 'OVERALL RANKINGS', fontFamily: 'ttlakes', fontWeight: 900, fontStyle: 'normal' } 
    },
    [BLOCK_IDS.column1]: { 
        transform: { x: 45, y: 190, width: 900, height: 830 }, 
        style: { bgColor: 'rgba(11, 110, 112, 0.7)', borderColor: '#ffffff', textColor: '#ffffff', fontSize: 24, fontFamily: 'ttlakes', fontWeight: 700, fontStyle: 'normal' } 
    },
    [BLOCK_IDS.column2]: { 
        transform: { x: 975, y: 190, width: 900, height: 830 }, 
        style: { bgColor: 'rgba(11, 110, 112, 0.7)', borderColor: '#ffffff', textColor: '#ffffff', fontSize: 24, fontFamily: 'ttlakes', fontWeight: 700, fontStyle: 'normal' } 
    },
};

const ALL_IDS = Object.values(BLOCK_IDS);

// MOCK DATA for Edit Mode
const MOCK_STANDINGS: StandingRow[] = Array.from({ length: 16 }).map((_, i) => ({
    teamId: i + 1,
    teamName: `TEAM ${i + 1}`,
    logoUrl: `${API_URL}/placeholder.png`,
    tag: 'TAG',
    matchesPlayed: 12,
    wwcd: Math.floor(Math.random() * 3),
    killPoints: Math.floor(Math.random() * 60),
    placementPoints: Math.floor(Math.random() * 40),
    totalPoints: 100 - i * 5,
    rank: i + 1,
}));

function HeaderBlock({ style, tournamentInfo }: { style: ElementStyle, tournamentInfo: any }) {
    const font = getFontById(style.fontFamily || 'ttlakes');
    const accent = style.gradientStart || '#ff4b5c';
    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Main Title */}
            <h1 style={{ 
                fontSize: style.fontSize || 130, 
                fontWeight: style.fontWeight || 900, 
                color: style.textColor || '#e7ff00', 
                fontFamily: font?.family,
                margin: 0,
                lineHeight: 1,
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
                textShadow: '0 4px 15px rgba(0,0,0,0.5)',
                fontStyle: style.fontStyle || 'normal'
            }}>
                {style.text || 'OVERALL RANKINGS'}
            </h1>

            {/* Right Side: Info */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <span style={{ 
                    fontSize: 48, 
                    fontWeight: 900, 
                    color: '#ffffff', 
                    fontFamily: font?.family, 
                    textTransform: 'uppercase', 
                    lineHeight: 1,
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}>
                    DAY {tournamentInfo.dayNumber || 1} MATCH {tournamentInfo.currentMatch || 1}/{tournamentInfo.totalMatches || 18}
                </span>
                <div style={{ 
                    backgroundColor: accent, 
                    padding: '6px 40px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    minWidth: 150
                }}>
                    <span style={{ 
                        fontSize: 42, 
                        fontWeight: 900, 
                        color: '#ffffff', 
                        fontFamily: font?.family, 
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        {tournamentInfo.stageName || 'FINALS'}
                    </span>
                </div>
            </div>
        </div>
    );
}

function StandingsColumn({ teams, style }: { teams: StandingRow[], style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'ttlakes');
    const bg = style.bgColor || 'rgba(11, 110, 112, 0.7)';
    const textColor = style.textColor || '#ffffff';

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: bg, borderTop: '2px solid rgba(255,255,255,0.3)', position: 'relative', overflow: 'hidden' }}>
             {/* Header Row */}
             <div style={{ display: 'flex', padding: '10px 0', borderBottom: '2px solid rgba(0,255,255,0.3)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                <div style={{ width: 120 }}></div>
                <div style={{ flex: 1 }}></div>
                <div style={{ display: 'flex', gap: 10, paddingRight: 30 }}>
                    <span style={{ width: 70, textAlign: 'center', fontSize: 18, fontStyle: 'italic', fontWeight: 900, color: '#00ffff', fontFamily: font?.family }}>ELIMS</span>
                    <span style={{ width: 70, textAlign: 'center', fontSize: 18, fontStyle: 'italic', fontWeight: 900, color: '#00ffff', fontFamily: font?.family }}>PLACE</span>
                    <span style={{ width: 70, textAlign: 'center', fontSize: 18, fontStyle: 'italic', fontWeight: 900, color: '#00ffff', fontFamily: font?.family }}>WWCD</span>
                    <span style={{ width: 90, textAlign: 'center', fontSize: 18, fontStyle: 'italic', fontWeight: 900, color: '#00ffff', fontFamily: font?.family }}>TOTAL</span>
                </div>
            </div>

            {/* Rows */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {teams.map((t, idx) => (
                    <div key={idx} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        flex: 1, 
                        borderBottom: '1px solid rgba(255,255,255,0.1)', 
                        background: idx % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent'
                    }}>
                        {/* Rank */}
                        <div style={{ 
                            width: 100, 
                            height: '100%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            borderRight: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <span style={{ fontSize: 42, fontWeight: 900, color: textColor, fontFamily: font?.family, fontStyle: 'italic' }}>#{t.rank}</span>
                        </div>

                        {/* Team Info */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 15, paddingLeft: 20 }}>
                             <img src={t.logoUrl} onError={(e) => e.currentTarget.style.opacity = '0'} style={{ height: 45, width: 45, objectFit: 'contain' }} alt="" />
                             <span style={{ fontSize: 32, fontWeight: 900, color: '#ff4b5c', fontFamily: font?.family, textTransform: 'uppercase' }}>{t.tag || 'TAG'}</span>
                        </div>

                        {/* Stats */}
                        <div style={{ display: 'flex', gap: 10, paddingRight: 30 }}>
                            <span style={{ width: 70, textAlign: 'center', fontSize: 36, fontWeight: 900, color: textColor, fontFamily: font?.family }}>{String(t.killPoints).padStart(2, '0')}</span>
                            <span style={{ width: 70, textAlign: 'center', fontSize: 36, fontWeight: 900, color: textColor, fontFamily: font?.family }}>{String(t.placementPoints).padStart(2, '0')}</span>
                            <span style={{ width: 70, textAlign: 'center', fontSize: 36, fontWeight: 900, color: textColor, fontFamily: font?.family }}>{String(t.wwcd).padStart(2, '0')}</span>
                            <span style={{ width: 90, textAlign: 'center', fontSize: 38, fontWeight: 900, color: textColor, fontFamily: font?.family, backgroundColor: 'rgba(0,0,0,0.2)' }}>{String(t.totalPoints).padStart(2, '0')}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function OverallRankingsPremium() {
    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [resetCounter, setResetCounter] = useState(0);
    const [styleTick, setStyleTick] = useState(0);
    const [pushCounter, setPushCounter] = useState(0);
    const [canvasScale, setCanvasScale] = useState(1);
    
    const [standings, setStandings] = useState<StandingRow[]>([]);
    const [tournamentInfo, setTournamentInfo] = useState({
        stageName: 'FINALS',
        dayNumber: 1,
        currentMatch: 1,
        totalMatches: 18
    });

    useEffect(() => { injectBroadcastFonts(); }, []);
    useEffect(() => { const p = new URLSearchParams(window.location.search); if (p.get('edit') === 'true') setEditMode(true); }, []);

    const fetchData = async () => {
        const p = new URLSearchParams(window.location.search);
        const tId = p.get('tournamentId');
        if (!tId) return;

        try {
            let url = `${API_URL}/api/tournaments/${tId}/standings`;
            const dayNum = p.get('dayNumber');
            if (dayNum) url += `?dayNumber=${dayNum}`;

            const res = await fetch(url);
            const data = await res.json();
            if (Array.isArray(data)) {
                setStandings(data.slice(0, 16)); // Show top 16
            }
            
            // Fetch tournament details for header info
            const tRes = await fetch(`${API_URL}/api/tournaments/${tId}`);
            const tData = await tRes.json();
            if (tData) {
                // Try to find current stage/match info
                const stage = tData.stages?.[0]; // Default to first stage
                setTournamentInfo({
                    stageName: stage?.name || 'FINALS',
                    dayNumber: p.get('dayNumber') ? Number(p.get('dayNumber')) : 1,
                    currentMatch: 1, // Logic to determine match number could be more complex
                    totalMatches: stage ? stage.daysCount * stage.matchesCount : 18
                });
            }
        } catch (error) {
            console.error("Failed to fetch standings:", error);
        }
    };

    useEffect(() => {
        if (editMode) return;
        fetchData();
        const interval = setInterval(fetchData, 30000); // Refresh every 30s
        
        const socket = io(`http://${window.location.hostname}:4000`);
        socket.on('layout_push', (data: { overlayKey: string; layout: Record<string, any> }) => {
            if (data.overlayKey !== OVERLAY_KEY) return;
            Object.entries(data.layout).forEach(([id, config]) => { try { localStorage.setItem(`strymx_layout:${OVERLAY_KEY}:${id}`, JSON.stringify(config)); } catch {} });
            setPushCounter(c => c + 1);
        });
        return () => { socket.disconnect(); clearInterval(interval); };
    }, [editMode]);

    useEffect(() => { const h = (e: StorageEvent) => { if (e.key?.startsWith(`strymx_layout:${OVERLAY_KEY}:`)) setStyleTick(t => t + 1); }; window.addEventListener('storage', h); return () => window.removeEventListener('storage', h); }, []);
    useEffect(() => { if (!editMode) return; const c = () => { setCanvasScale(Math.min((window.innerWidth - 480) / VIEWPORT.width, (window.innerHeight - 80) / VIEWPORT.height, 1)); }; c(); window.addEventListener('resize', c); return () => window.removeEventListener('resize', c); }, [editMode]);

    const activeStandings = editMode ? MOCK_STANDINGS : standings;
    const col1Teams = activeStandings.slice(0, 8);
    const col2Teams = activeStandings.slice(8, 16);

    const allStyles: Record<string, ElementStyle> = {};
    const allTransforms: Record<string, ElementTransform> = {};
    ALL_IDS.forEach(id => { allStyles[id] = { ...DEFAULTS[id].style, ...readElementStyle(OVERLAY_KEY, id) }; allTransforms[id] = { ...DEFAULTS[id].transform, ...readElementTransform(OVERLAY_KEY, id) }; });

    const handleReset = () => { clearOverlayLayout(OVERLAY_KEY); setResetCounter(c => c + 1); setStyleTick(t => t + 1); setSelectedId(null); };
    const handleStyleChangeAll = (patch: Partial<ElementStyle>) => { ALL_IDS.forEach(id => updateElementStyle(OVERLAY_KEY, id, patch)); setStyleTick(t => t + 1); };
    const handleSave = async (): Promise<boolean> => { const layout: Record<string, any> = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith(`strymx_layout:${OVERLAY_KEY}:`)) { try { layout[k.replace(`strymx_layout:${OVERLAY_KEY}:`, '')] = JSON.parse(localStorage.getItem(k)!); } catch {} } } try { return (await fetch(`${API_URL}/api/layouts/push`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ overlayKey: OVERLAY_KEY, layout }) })).ok; } catch { return false; } };

    const cls = 'or-canvas-bounds';

    const viewportNode = (
        <div className={cls} style={{ width: VIEWPORT.width, height: VIEWPORT.height, overflow: 'hidden', position: 'relative', background: editMode ? 'rgba(15,23,42,0.8)' : 'transparent', border: editMode ? '2px dashed rgba(59,130,246,0.3)' : undefined, borderRadius: editMode ? 12 : 0 }}>
            {editMode && <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(148,163,184,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />}
            
            <EditableGraphicElement key={editMode ? `h-${resetCounter}` : `h-${resetCounter}-${pushCounter}`} id={BLOCK_IDS.header} overlayKey={OVERLAY_KEY} defaultTransform={DEFAULTS[BLOCK_IDS.header].transform} defaultStyle={DEFAULTS[BLOCK_IDS.header].style} editMode={editMode} selected={selectedId === BLOCK_IDS.header} onSelect={setSelectedId} label="Header Title" bounds={`.${cls}`} scale={canvasScale}>
                {(s) => <HeaderBlock style={s} tournamentInfo={tournamentInfo} />}
            </EditableGraphicElement>

            {col1Teams.length > 0 && (
                <EditableGraphicElement key={editMode ? `c1-${resetCounter}` : `c1-${resetCounter}-${pushCounter}`} id={BLOCK_IDS.column1} overlayKey={OVERLAY_KEY} defaultTransform={DEFAULTS[BLOCK_IDS.column1].transform} defaultStyle={DEFAULTS[BLOCK_IDS.column1].style} editMode={editMode} selected={selectedId === BLOCK_IDS.column1} onSelect={setSelectedId} label="Standings Column 1" bounds={`.${cls}`} scale={canvasScale}>
                    {(s) => <StandingsColumn teams={col1Teams} style={s} />}
                </EditableGraphicElement>
            )}

            {col2Teams.length > 0 && (
                <EditableGraphicElement key={editMode ? `c2-${resetCounter}` : `c2-${resetCounter}-${pushCounter}`} id={BLOCK_IDS.column2} overlayKey={OVERLAY_KEY} defaultTransform={DEFAULTS[BLOCK_IDS.column2].transform} defaultStyle={DEFAULTS[BLOCK_IDS.column2].style} editMode={editMode} selected={selectedId === BLOCK_IDS.column2} onSelect={setSelectedId} label="Standings Column 2" bounds={`.${cls}`} scale={canvasScale}>
                    {(s) => <StandingsColumn teams={col2Teams} style={s} />}
                </EditableGraphicElement>
            )}
        </div>
    );

    if (!editMode) return <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'transparent' }}>{viewportNode}</div>;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at center, rgba(30,41,59,0.95), rgba(2,6,23,0.98))', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, right: 400, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <div style={{ width: VIEWPORT.width * canvasScale, height: VIEWPORT.height * canvasScale, position: 'relative' }}>
                    <div style={{ width: VIEWPORT.width, height: VIEWPORT.height, transform: `scale(${canvasScale})`, transformOrigin: 'top left' }}>{viewportNode}</div>
                </div>
            </div>
            <MatchSummaryEditSidebar
                statCards={[{ id: BLOCK_IDS.header, label: 'Main Header' }, { id: BLOCK_IDS.column1, label: 'Standings (Col 1)' }, { id: BLOCK_IDS.column2, label: 'Standings (Col 2)' }]}
                elementStyles={allStyles} elementTransforms={allTransforms}
                onStyleChange={(id, p) => { updateElementStyle(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onStyleChangeAll={handleStyleChangeAll}
                onTransformChange={(id, p) => { updateElementTransform(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onReset={handleReset} onClose={() => { window.close(); }}
                onSave={handleSave} selectedId={selectedId}
                obsUrlPath={`/overlays/overall-standings?design=premium&tournamentId=${new URLSearchParams(window.location.search).get('tournamentId')}`}
                currentDesign="premium"
                onDesignChange={(d) => { window.location.href = `/overlays/overall-standings?edit=true&design=${d}&tournamentId=${new URLSearchParams(window.location.search).get('tournamentId')}`; }}
            />
        </div>
    );
}
