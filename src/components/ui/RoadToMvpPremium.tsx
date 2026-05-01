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

const OVERLAY_KEY = 'road-to-mvp-premium';
const VIEWPORT = { width: 1920, height: 1080 };

interface PlayerStanding {
    playerName: string;
    teamName: string;
    logoUrl?: string;
    photoUrl?: string;
    playerKey?: string;
    matches: number;
    kills: number;
    damage: number;
    avgSurvivalTime: string;
    rank: number;
}

const BLOCK_IDS = {
    header: 'rtmPremiumHeader',
    mainPlayer: 'rtmPremiumMain',
    player2: 'rtmPremiumP2',
    player3: 'rtmPremiumP3',
    player4: 'rtmPremiumP4',
    player5: 'rtmPremiumP5',
};

const DEFAULTS: Record<string, { transform: ElementTransform; style: ElementStyle }> = {
    [BLOCK_IDS.header]: { 
        transform: { x: 50, y: 40, width: 600, height: 200 }, 
        style: { textColor: '#e7ff00', gradientStart: '#ff4b5c', fontSize: 90, text: 'ROAD TO MVP', fontFamily: 'ttlakes', fontWeight: 900, fontStyle: 'normal' } 
    },
    [BLOCK_IDS.mainPlayer]: { 
        transform: { x: 50, y: 280, width: 750, height: 750 }, 
        style: { bgColor: 'rgba(11, 110, 112, 0.7)', borderColor: '#ff4b5c', textColor: '#ffffff', fontSize: 32, fontFamily: 'ttlakes', fontWeight: 700, fontStyle: 'normal' } 
    },
    [BLOCK_IDS.player2]: { 
        transform: { x: 850, y: 50, width: 480, height: 480 }, 
        style: { bgColor: 'rgba(11, 110, 112, 0.7)', borderColor: '#ff4b5c', textColor: '#ffffff', fontSize: 24, fontFamily: 'ttlakes', fontWeight: 700, fontStyle: 'normal' } 
    },
    [BLOCK_IDS.player3]: { 
        transform: { x: 1380, y: 50, width: 480, height: 480 }, 
        style: { bgColor: 'rgba(11, 110, 112, 0.7)', borderColor: '#ff4b5c', textColor: '#ffffff', fontSize: 24, fontFamily: 'ttlakes', fontWeight: 700, fontStyle: 'normal' } 
    },
    [BLOCK_IDS.player4]: { 
        transform: { x: 850, y: 550, width: 480, height: 480 }, 
        style: { bgColor: 'rgba(11, 110, 112, 0.7)', borderColor: '#ff4b5c', textColor: '#ffffff', fontSize: 24, fontFamily: 'ttlakes', fontWeight: 700, fontStyle: 'normal' } 
    },
    [BLOCK_IDS.player5]: { 
        transform: { x: 1380, y: 550, width: 480, height: 480 }, 
        style: { bgColor: 'rgba(11, 110, 112, 0.7)', borderColor: '#ff4b5c', textColor: '#ffffff', fontSize: 24, fontFamily: 'ttlakes', fontWeight: 700, fontStyle: 'normal' } 
    },
};

const ALL_IDS = Object.values(BLOCK_IDS);

// MOCK DATA
const MOCK_PLAYERS: PlayerStanding[] = Array.from({ length: 5 }).map((_, i) => ({
    playerName: `PLAYER NAME ${i + 1}`,
    teamName: `TEAM NAME ${i + 1}`,
    logoUrl: `${API_URL}/placeholder.png`,
    photoUrl: `${API_URL}/placeholder.png`,
    playerKey: `mock-${i}`,
    matches: 12,
    kills: 24 - i * 2,
    damage: 4800 - i * 300,
    avgSurvivalTime: '22:45',
    rank: i + 1,
}));

function PlayerPortrait({ photoUrl, playerKey, name }: { photoUrl?: string; playerKey?: string; name: string }) {
    const [imgSrc, setImgSrc] = useState<string | null>(photoUrl || (playerKey ? `${API_URL}/images/${playerKey}.png` : null));
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!photoUrl && playerKey) {
            setImgSrc(`${API_URL}/images/${playerKey}.png`);
            setFailed(false);
        }
    }, [photoUrl, playerKey]);

    return (
        <div className="relative h-full w-full flex items-end justify-center overflow-hidden">
            {!failed && imgSrc ? (
                <img 
                    src={imgSrc} 
                    onError={() => setFailed(true)} 
                    className="h-[120%] max-w-none object-cover object-top mask-image-bottom drop-shadow-2xl translate-y-4" 
                    alt={name} 
                />
            ) : null}
        </div>
    );
}

function HeaderBlock({ style, tournamentInfo }: { style: ElementStyle, tournamentInfo: any }) {
    const font = getFontById(style.fontFamily || 'ttlakes');
    const accent = style.gradientStart || '#ff4b5c';
    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h1 style={{ 
                fontSize: style.fontSize || 90, 
                fontWeight: style.fontWeight || 900, 
                color: style.textColor || '#e7ff00', 
                fontFamily: font?.family,
                margin: 0,
                lineHeight: 1,
                textTransform: 'uppercase',
                textShadow: '0 4px 15px rgba(0,0,0,0.5)',
                fontStyle: style.fontStyle || 'normal'
            }}>
                {style.text || 'ROAD TO MVP'}
            </h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 32, fontWeight: 900, color: '#ffffff', fontFamily: font?.family, textTransform: 'uppercase' }}>
                    {tournamentInfo.stageName || 'FINALS'} - MATCH {tournamentInfo.currentMatch || 1}/{tournamentInfo.totalMatches || 18}
                </span>
            </div>
        </div>
    );
}

function StatRow({ label, value, style }: { label: string, value: string, style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'ttlakes');
    const accent = style.borderColor || '#ff4b5c';
    
    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginBottom: 15 }}>
            <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '10px 20px', borderLeft: `8px solid ${accent}` }}>
                <span style={{ fontSize: 42, fontWeight: 900, color: '#ffffff', fontFamily: font?.family, lineHeight: 1 }}>{value}</span>
            </div>
            <div style={{ backgroundColor: accent, padding: '4px 20px' }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#ffffff', fontFamily: font?.family, textTransform: 'uppercase' }}>{label}</span>
            </div>
        </div>
    );
}

function PlayerCard({ player, style, size = 'large' }: { player: PlayerStanding, style: ElementStyle, size?: 'large' | 'small' }) {
    const font = getFontById(style.fontFamily || 'ttlakes');
    const bg = style.bgColor || 'rgba(11, 110, 112, 0.7)';
    const accent = style.borderColor || '#ff4b5c';
    const textColor = style.textColor || '#ffffff';
    
    const isSmall = size === 'small';
    const cardPadding = isSmall ? 20 : 40;

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* Background */}
            <div style={{ position: 'absolute', inset: 0, backgroundColor: bg, clipPath: 'polygon(0 0, 100% 5%, 100% 100%, 0 100%)', zIndex: 0 }} />
            
            {/* Rank Badge */}
            <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
                <span style={{ fontSize: isSmall ? 32 : 48, fontWeight: 900, color: accent, fontFamily: font?.family, fontStyle: 'italic' }}>#{player.rank}</span>
            </div>

            <div style={{ flex: 1, display: 'flex', zIndex: 5, marginTop: 20 }}>
                {/* Left: Portrait */}
                <div style={{ flex: 1.2, position: 'relative' }}>
                    <PlayerPortrait photoUrl={player.photoUrl} playerKey={player.playerKey} name={player.playerName} />
                </div>

                {/* Right: Stats */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: cardPadding }}>
                    <StatRow label="AVERAGE ELIMS" value={(player.kills / (player.matches || 1)).toFixed(2)} style={style} />
                    <StatRow label="AVERAGE DAMAGE" value={(player.damage / (player.matches || 1)).toFixed(2)} style={style} />
                    <StatRow label="AVERAGE SURVIVAL" value={player.avgSurvivalTime} style={style} />
                </div>
            </div>

            {/* Bottom Bar: Name & Team */}
            <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '15px 20px', zIndex: 10, display: 'flex', alignItems: 'center', gap: 15 }}>
                <div style={{ width: 8, height: isSmall ? 50 : 70, backgroundColor: accent }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: isSmall ? 28 : 36, fontWeight: 900, color: accent, fontFamily: font?.family, textTransform: 'uppercase', lineHeight: 1 }}>{player.playerName}</span>
                    <span style={{ fontSize: isSmall ? 32 : 42, fontWeight: 900, color: textColor, fontFamily: font?.family, textTransform: 'uppercase', lineHeight: 1 }}>{player.teamName}</span>
                </div>
            </div>
        </div>
    );
}

export default function RoadToMvpPremium() {
    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [resetCounter, setResetCounter] = useState(0);
    const [styleTick, setStyleTick] = useState(0);
    const [pushCounter, setPushCounter] = useState(0);
    const [canvasScale, setCanvasScale] = useState(1);
    
    const [players, setPlayers] = useState<PlayerStanding[]>([]);
    const [tournamentInfo, setTournamentInfo] = useState({
        stageName: 'FINALS',
        currentMatch: 1,
        totalMatches: 18
    });

    useEffect(() => { injectBroadcastFonts(); }, []);
    useEffect(() => { const p = new URLSearchParams(window.location.search); if (p.get('edit') === 'true') setEditMode(true); }, []);

    const fetchData = async () => {
        const p = new URLSearchParams(window.location.search);
        let tId = p.get('tournamentId');
        
        // If no tournamentId in params, check localStorage for "Live" tournament
        if (!tId) {
            tId = localStorage.getItem('strymx_active_tournament_id');
        }

        if (!tId) return;

        try {
            const res = await fetch(`${API_URL}/api/tournaments/${tId}/player-standings`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setPlayers(data.slice(0, 5).map((p, idx) => ({ ...p, rank: idx + 1 })));
            }
            
            const tRes = await fetch(`${API_URL}/api/tournaments/${tId}`);
            const tData = await tRes.json();
            if (tData) {
                const stage = tData.stages?.[0];
                setTournamentInfo({
                    stageName: stage?.name || 'FINALS',
                    currentMatch: 1,
                    totalMatches: stage ? stage.daysCount * stage.matchesCount : 18
                });
            }
        } catch (error) {
            console.error("Failed to fetch Road to MVP data:", error);
        }
    };

    useEffect(() => {
        if (editMode) return;
        fetchData();
        const interval = setInterval(fetchData, 30000);
        
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

    const activePlayers = editMode ? MOCK_PLAYERS : players;
    
    const allStyles: Record<string, ElementStyle> = {};
    const allTransforms: Record<string, ElementTransform> = {};
    ALL_IDS.forEach(id => { allStyles[id] = { ...DEFAULTS[id].style, ...readElementStyle(OVERLAY_KEY, id) }; allTransforms[id] = { ...DEFAULTS[id].transform, ...readElementTransform(OVERLAY_KEY, id) }; });

    const handleReset = () => { clearOverlayLayout(OVERLAY_KEY); setResetCounter(c => c + 1); setStyleTick(t => t + 1); setSelectedId(null); };
    const handleStyleChangeAll = (patch: Partial<ElementStyle>) => { ALL_IDS.forEach(id => updateElementStyle(OVERLAY_KEY, id, patch)); setStyleTick(t => t + 1); };
    const handleSave = async (): Promise<boolean> => { const layout: Record<string, any> = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith(`strymx_layout:${OVERLAY_KEY}:`)) { try { layout[k.replace(`strymx_layout:${OVERLAY_KEY}:`, '')] = JSON.parse(localStorage.getItem(k)!); } catch {} } } try { return (await fetch(`${API_URL}/api/layouts/push`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ overlayKey: OVERLAY_KEY, layout }) })).ok; } catch { return false; } };

    const cls = 'rtm-canvas-bounds';

    const viewportNode = (
        <div className={cls} style={{ width: VIEWPORT.width, height: VIEWPORT.height, overflow: 'hidden', position: 'relative', background: editMode ? 'rgba(15,23,42,0.8)' : 'transparent', border: editMode ? '2px dashed rgba(59,130,246,0.3)' : undefined, borderRadius: editMode ? 12 : 0 }}>
            {editMode && <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(148,163,184,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />}
            
            <EditableGraphicElement key={editMode ? `h-${resetCounter}` : `h-${resetCounter}-${pushCounter}`} id={BLOCK_IDS.header} overlayKey={OVERLAY_KEY} defaultTransform={DEFAULTS[BLOCK_IDS.header].transform} defaultStyle={DEFAULTS[BLOCK_IDS.header].style} editMode={editMode} selected={selectedId === BLOCK_IDS.header} onSelect={setSelectedId} label="Header Title" bounds={`.${cls}`} scale={canvasScale}>
                {(s) => <HeaderBlock style={s} tournamentInfo={tournamentInfo} />}
            </EditableGraphicElement>

            {activePlayers[0] && (
                <EditableGraphicElement key={editMode ? `p1-${resetCounter}` : `p1-${resetCounter}-${pushCounter}`} id={BLOCK_IDS.mainPlayer} overlayKey={OVERLAY_KEY} defaultTransform={DEFAULTS[BLOCK_IDS.mainPlayer].transform} defaultStyle={DEFAULTS[BLOCK_IDS.mainPlayer].style} editMode={editMode} selected={selectedId === BLOCK_IDS.mainPlayer} onSelect={setSelectedId} label="#1 Player Showcase" bounds={`.${cls}`} scale={canvasScale}>
                    {(s) => <PlayerCard player={activePlayers[0]} style={s} size="large" />}
                </EditableGraphicElement>
            )}

            {[2, 3, 4, 5].map(rank => {
                const id = (BLOCK_IDS as any)[`player${rank}`];
                const player = activePlayers[rank - 1];
                if (!player) return null;
                return (
                    <EditableGraphicElement key={editMode ? `p${rank}-${resetCounter}` : `p${rank}-${resetCounter}-${pushCounter}`} id={id} overlayKey={OVERLAY_KEY} defaultTransform={DEFAULTS[id].transform} defaultStyle={DEFAULTS[id].style} editMode={editMode} selected={selectedId === id} onSelect={setSelectedId} label={`#${rank} Player Card`} bounds={`.${cls}`} scale={canvasScale}>
                        {(s) => <PlayerCard player={player} style={s} size="small" />}
                    </EditableGraphicElement>
                );
            })}
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
                statCards={[{ id: BLOCK_IDS.header, label: 'Main Header' }, { id: BLOCK_IDS.mainPlayer, label: '#1 Player Showcase' }, { id: BLOCK_IDS.player2, label: '#2 Player' }, { id: BLOCK_IDS.player3, label: '#3 Player' }, { id: BLOCK_IDS.player4, label: '#4 Player' }, { id: BLOCK_IDS.player5, label: '#5 Player' }]}
                elementStyles={allStyles} elementTransforms={allTransforms}
                onStyleChange={(id, p) => { updateElementStyle(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onStyleChangeAll={handleStyleChangeAll}
                onTransformChange={(id, p) => { updateElementTransform(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onReset={handleReset} onClose={() => { window.close(); }}
                onSave={handleSave} selectedId={selectedId}
                obsUrlPath={`/overlays/road-to-mvp?design=premium&tournamentId=${new URLSearchParams(window.location.search).get('tournamentId') || ''}`}
                currentDesign="premium"
                onDesignChange={(d) => { window.location.href = `/overlays/road-to-mvp?edit=true&design=${d}&tournamentId=${new URLSearchParams(window.location.search).get('tournamentId') || ''}`; }}
            />
        </div>
    );
}
