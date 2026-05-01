"use client"
import { API_URL , WS_URL} from '@/lib/api-config';

import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import EditableGraphicElement, {
    clearOverlayLayout, updateElementStyle, updateElementTransform,
    readElementStyle, readElementTransform,
    type ElementTransform, type ElementStyle,
} from './EditableGraphicElement';
import MatchSummaryEditSidebar from './MatchSummaryEditSidebar';
import { injectBroadcastFonts, getFontById } from './broadcastFonts';

const OVERLAY_KEY = 'wwcd-stats-premium';
const VIEWPORT = { width: 1920, height: 1080 };

interface PlayerStat {
    playerKey: string;
    name?: string;
    killNum: number;
    damage: number;
    survivalTime: number;
    photoUrl?: string;
}

interface TeamScore {
    name: string;
    teamTag?: string;
    logoUrl: string;
    players: PlayerStat[];
}

const MOCK_TEAM: TeamScore = {
    name: 'STX',
    logoUrl: '',
    players: Array.from({ length: 4 }).map((_, i) => ({
        playerKey: `p${i}`,
        name: 'PLAYER NAME',
        killNum: 0,
        damage: 0,
        survivalTime: 0,
    }))
};

const BLOCK_IDS = {
    header: 'wwcdHeader',
    matchInfo: 'wwcdMatchInfo',
    // Split players into Portrait and Stats
    p1Portrait: 'wwcdP1Port', p1Stats: 'wwcdP1Stats',
    p2Portrait: 'wwcdP2Port', p2Stats: 'wwcdP2Stats',
    p3Portrait: 'wwcdP3Port', p3Stats: 'wwcdP3Stats',
    p4Portrait: 'wwcdP4Port', p4Stats: 'wwcdP4Stats',
};
const ALL_IDS = Object.values(BLOCK_IDS);

const DEFAULTS: Record<string, { transform: ElementTransform; style: ElementStyle }> = {
    [BLOCK_IDS.header]: { transform: { x: 50, y: 50, width: 1300, height: 140 }, style: { bgColor: '#00c0b5', textColor: '#fff000', fontFamily: 'ttlakes', fontWeight: 700, fontStyle: 'normal' } },
    [BLOCK_IDS.matchInfo]: { transform: { x: 1250, y: 50, width: 620, height: 140 }, style: { bgColor: '#fd5564', textColor: '#fff000', fontFamily: 'ttlakes', fontWeight: 700, fontStyle: 'normal' } },
    
    [BLOCK_IDS.p1Portrait]: { transform: { x: 50, y: 220, width: 440, height: 500 }, style: { bgColor: '#00c0b5', opacity: 1, fontFamily: 'ttlakes' } },
    [BLOCK_IDS.p1Stats]: { transform: { x: 50, y: 720, width: 440, height: 250 }, style: { bgColor: '#00c0b5', textColor: '#fd5564', opacity: 1, fontFamily: 'ttlakes', fontWeight: 700, fontStyle: 'normal' } },
    
    [BLOCK_IDS.p2Portrait]: { transform: { x: 510, y: 220, width: 440, height: 500 }, style: { bgColor: '#00c0b5', opacity: 1, fontFamily: 'ttlakes' } },
    [BLOCK_IDS.p2Stats]: { transform: { x: 510, y: 720, width: 440, height: 250 }, style: { bgColor: '#00c0b5', textColor: '#fd5564', opacity: 1, fontFamily: 'ttlakes', fontWeight: 700, fontStyle: 'normal' } },
    
    [BLOCK_IDS.p3Portrait]: { transform: { x: 970, y: 220, width: 440, height: 500 }, style: { bgColor: '#00c0b5', opacity: 1, fontFamily: 'ttlakes' } },
    [BLOCK_IDS.p3Stats]: { transform: { x: 970, y: 720, width: 440, height: 250 }, style: { bgColor: '#00c0b5', textColor: '#fd5564', opacity: 1, fontFamily: 'ttlakes', fontWeight: 700, fontStyle: 'normal' } },
    
    [BLOCK_IDS.p4Portrait]: { transform: { x: 1430, y: 220, width: 440, height: 500 }, style: { bgColor: '#00c0b5', opacity: 1, fontFamily: 'ttlakes' } },
    [BLOCK_IDS.p4Stats]: { transform: { x: 1430, y: 720, width: 440, height: 250 }, style: { bgColor: '#00c0b5', textColor: '#fd5564', opacity: 1, fontFamily: 'ttlakes', fontWeight: 700, fontStyle: 'normal' } },
};

function PlayerPortrait({ playerKey, photoUrl, failed, setFailed }: { playerKey: string, photoUrl?: string, failed: boolean, setFailed: (v: boolean) => void }) {
    const imgSrc = photoUrl || (playerKey && !playerKey.startsWith('pad') ? `${API_URL}/images/${playerKey}.png` : null);
    if (failed || !imgSrc) return <div className="w-full h-full bg-black/20 flex items-center justify-center"><span className="text-white/10 text-9xl font-black">?</span></div>;
    return <img src={imgSrc} onError={() => setFailed(true)} className="w-full h-full object-cover object-bottom" alt="" />;
}

function PlayerPortraitBox({ player, style }: { player: PlayerStat; style: ElementStyle }) {
    const [failed, setFailed] = useState(false);
    const opacity = style.opacity ?? 1;
    return (
        <div className="w-full h-full relative overflow-hidden" style={{ 
            borderRadius: style.borderRadius || 0, 
            background: `rgba(0,0,0, ${opacity * 0.4})`, 
            border: style.borderWidth ? `${style.borderWidth}px solid ${style.borderColor || 'white'}` : undefined 
        }}>
            {/* CSS Grid Pattern replacement for missing png */}
            <div className="absolute inset-0 z-0" style={{ 
                opacity: opacity * 0.15,
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)',
                backgroundSize: '30px 30px'
            }} />
            
            <div className="absolute inset-0 z-10">
                <PlayerPortrait playerKey={player.playerKey} photoUrl={player.photoUrl} failed={failed} setFailed={setFailed} />
            </div>
        </div>
    );
}

function PlayerStatsBox({ player, style }: { player: PlayerStat; style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'impact');
    const bgOpacity = style.opacity ?? 1;

    return (
        <div className="w-full h-full flex flex-col overflow-hidden" style={{ borderRadius: style.borderRadius || 0 }}>
            {/* Name Bar */}
            <div style={{ 
                background: hexToRgba(style.textColor || '#fd5564', bgOpacity), 
                padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 15,
                borderTopLeftRadius: style.borderRadius || 0, borderTopRightRadius: style.borderRadius || 0
            }}>
                {/* SVG Icon replacement for missing png */}
                <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current opacity-80">
                        <path d="M12 2L1 21h22L12 2zm0 3.45l8.27 14.3H3.73L12 5.45zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
                    </svg>
                </div>
                <div className="text-white text-3xl tracking-tighter" style={{ 
                    fontFamily: font?.family,
                    fontWeight: style.fontWeight || 700,
                    fontStyle: style.fontStyle || 'normal'
                }}>
                    {player.name?.toUpperCase() || 'PLAYER NAME'}
                </div>
            </div>

            {/* Stats Table */}
            <div className="flex flex-col flex-1" style={{ 
                background: `rgba(255,255,255,${bgOpacity * 0.95})`, 
                borderBottomLeftRadius: style.borderRadius || 0, 
                borderBottomRightRadius: style.borderRadius || 0 
            }}>
                <StatRow label="DAMAGE" value={Math.round(player.damage)} bgColor={style.bgColor || '#00c0b5'} textColor={style.textColor || '#fd5564'} font={font} bgOpacity={bgOpacity} style={style} />
                <StatRow label="ELIMS" value={player.killNum} bgColor={style.bgColor || '#00c0b5'} textColor={style.textColor || '#fd5564'} font={font} bgOpacity={bgOpacity} style={style} />
                <StatRow label="SURV. TIME" value={formatTime(player.survivalTime)} bgColor={style.bgColor || '#00c0b5'} textColor={style.textColor || '#fd5564'} font={font} bgOpacity={bgOpacity} style={style} />
            </div>
        </div>
    );
}

function StatRow({ label, value, bgColor, textColor, font, bgOpacity, style }: { label: string; value: any, bgColor: string, textColor: string, font: any, bgOpacity: number, style: ElementStyle }) {
    return (
        <div className="flex border-b border-black/5 last:border-0 flex-1">
            <div style={{ 
                background: hexToRgba(bgColor, bgOpacity), 
                width: '60%', display: 'flex', alignItems: 'center', padding: '0 20px' 
            }}>
                <span className="text-white text-2xl tracking-widest" style={{ 
                    fontFamily: font?.family,
                    fontWeight: style.fontWeight || 700,
                    fontStyle: style.fontStyle || 'normal'
                }}>{label}</span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ 
                    color: textColor, 
                    fontSize: 36, 
                    fontFamily: font?.family,
                    fontWeight: style.fontWeight || 700,
                    fontStyle: style.fontStyle || 'normal'
                }}>{value}</span>
            </div>
        </div>
    );
}

/** Helper to convert hex to rgba for backgrounds */
function hexToRgba(hex: string, alpha: number): string {
    let r = 0, g = 0, b = 0;
    // Handle #RGB
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } 
    // Handle #RRGGBB
    else if (hex.length >= 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function WWCDTeamStatsPremium() {
    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [resetCounter, setResetCounter] = useState(0);
    const [styleTick, setStyleTick] = useState(0);
    const [pushCounter, setPushCounter] = useState(0);
    const [canvasScale, setCanvasScale] = useState(1);
    const [team, setTeam] = useState<TeamScore>(MOCK_TEAM);
    const [matchInfo, setMatchInfo] = useState({ stage: 'FINALS', day: 1, match: 1, totalMatches: 18 });
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => { injectBroadcastFonts(); }, []);
    useEffect(() => {
        const p = new URLSearchParams(window.location.search);
        if (p.get('edit') === 'true') { setEditMode(true); setIsVisible(true); }
        if (p.get('layout') === 'custom') setIsVisible(true);
    }, []);

    useEffect(() => {
        const socket = io(WS_URL);
        socket.on('graphic_command', (cmd) => {
            if (cmd.templateUrl === '/overlays/wwcd' && cmd.action === 'PLAY') {
                if (cmd.data) setTeam(cmd.data);
                if (cmd.matchInfo) setMatchInfo(cmd.matchInfo);
                setIsVisible(true);
            } else if (cmd.templateUrl === '/overlays/wwcd' && (cmd.action === 'STOP' || cmd.action === 'CLEAR')) {
                if (!editMode) setIsVisible(false);
            }
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

    const cls = 'wwcd-premium-canvas';

    const viewportNode = (
        <div className={cls} style={{ width: VIEWPORT.width, height: VIEWPORT.height, overflow: 'hidden', position: 'relative', userSelect: 'none', background: editMode ? 'rgba(15,23,42,0.6)' : 'transparent' }}>
            <AnimatePresence>
                {isVisible && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full relative">
                        {/* Header Box */}
                        <EditableGraphicElement key={`header-${resetCounter}`} id={BLOCK_IDS.header} overlayKey={OVERLAY_KEY} defaultTransform={DEFAULTS[BLOCK_IDS.header].transform} defaultStyle={DEFAULTS[BLOCK_IDS.header].style} editMode={editMode} selected={selectedId === BLOCK_IDS.header} onSelect={setSelectedId} label="Main Header" scale={canvasScale}>
                            {(style) => (
                                <div className="w-full h-full flex items-center px-12" style={{ 
                                    background: style.bgColor || '#00c0b5', 
                                    clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0 100%)',
                                    borderRadius: style.borderRadius || 0,
                                    border: style.borderWidth ? `${style.borderWidth}px solid ${style.borderColor || 'white'}` : undefined,
                                    opacity: style.opacity ?? 1
                                }}>
                                    <div className="text-white" style={{ 
                                        fontSize: style.fontSize || 90, 
                                        color: style.textColor || '#fff000', 
                                        fontFamily: getFontById(style.fontFamily || 'ttlakes')?.family,
                                        fontWeight: style.fontWeight || 700,
                                        fontStyle: style.fontStyle || 'normal'
                                    }}>
                                        {style.text || 'WWCD TEAM STATS'}
                                    </div>
                                </div>
                            )}
                        </EditableGraphicElement>

                        {/* Match Info Box */}
                        <EditableGraphicElement key={`info-${resetCounter}`} id={BLOCK_IDS.matchInfo} overlayKey={OVERLAY_KEY} defaultTransform={DEFAULTS[BLOCK_IDS.matchInfo].transform} defaultStyle={DEFAULTS[BLOCK_IDS.matchInfo].style} editMode={editMode} selected={selectedId === BLOCK_IDS.matchInfo} onSelect={setSelectedId} label="Match Info" scale={canvasScale}>
                            {(style) => (
                                <div className="w-full h-full flex flex-col items-end justify-center px-12" style={{ 
                                    background: style.bgColor || '#fd5564', 
                                    clipPath: 'polygon(5% 0, 100% 0, 100% 100%, 0 100%)',
                                    borderRadius: style.borderRadius || 0,
                                    border: style.borderWidth ? `${style.borderWidth}px solid ${style.borderColor || 'white'}` : undefined,
                                    opacity: style.opacity ?? 1
                                }}>
                                    <div className="text-white text-3xl tracking-tighter" style={{ color: style.textColor || '#fff000', fontFamily: getFontById(style.fontFamily || 'ttlakes')?.family, fontWeight: style.fontWeight || 700, fontStyle: style.fontStyle || 'normal' }}>
                                        {style.text ? style.text.split('\n')[0] : `DAY ${matchInfo.day} MATCH ${matchInfo.match}/${matchInfo.totalMatches}`}
                                    </div>
                                    <div className="bg-white/20 px-6 py-1 mt-2 text-white text-4xl" style={{ color: style.textColor || '#fff000', fontFamily: getFontById(style.fontFamily || 'ttlakes')?.family, fontWeight: style.fontWeight || 700, fontStyle: style.fontStyle || 'normal' }}>
                                        {style.text?.includes('\n') ? style.text.split('\n')[1] : matchInfo.stage}
                                    </div>
                                </div>
                            )}
                        </EditableGraphicElement>

                        {/* Player Rendering Loop */}
                        {[1, 2, 3, 4].map((num) => {
                            const portId = (BLOCK_IDS as any)[`p${num}Portrait`];
                            const statsId = (BLOCK_IDS as any)[`p${num}Stats`];
                            const player = team.players[num - 1] || MOCK_TEAM.players[0];
                            
                            return (
                                <React.Fragment key={`p${num}-frag`}>
                                    {/* Portrait Area */}
                                    <EditableGraphicElement key={`${portId}-${resetCounter}`} id={portId} overlayKey={OVERLAY_KEY} defaultTransform={DEFAULTS[portId].transform} defaultStyle={DEFAULTS[portId].style} editMode={editMode} selected={selectedId === portId} onSelect={setSelectedId} label={`P${num} Image`} scale={canvasScale}>
                                        {(style) => <PlayerPortraitBox player={player} style={style} />}
                                    </EditableGraphicElement>
                                    
                                    {/* Stats Area */}
                                    <EditableGraphicElement key={`${statsId}-${resetCounter}`} id={statsId} overlayKey={OVERLAY_KEY} defaultTransform={DEFAULTS[statsId].transform} defaultStyle={DEFAULTS[statsId].style} editMode={editMode} selected={selectedId === statsId} onSelect={setSelectedId} label={`P${num} Stats`} scale={canvasScale}>
                                        {(style) => <PlayerStatsBox player={player} style={style} />}
                                    </EditableGraphicElement>
                                </React.Fragment>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
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
                statCards={[
                    { id: BLOCK_IDS.header, label: 'Main Header' },
                    { id: BLOCK_IDS.matchInfo, label: 'Match Info' },
                    { id: BLOCK_IDS.p1Portrait, label: 'P1 Image' }, { id: BLOCK_IDS.p1Stats, label: 'P1 Stats' },
                    { id: BLOCK_IDS.p2Portrait, label: 'P2 Image' }, { id: BLOCK_IDS.p2Stats, label: 'P2 Stats' },
                    { id: BLOCK_IDS.p3Portrait, label: 'P3 Image' }, { id: BLOCK_IDS.p3Stats, label: 'P3 Stats' },
                    { id: BLOCK_IDS.p4Portrait, label: 'P4 Image' }, { id: BLOCK_IDS.p4Stats, label: 'P4 Stats' },
                ]}
                elementStyles={allStyles} elementTransforms={allTransforms}
                onStyleChange={(id, p) => { updateElementStyle(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onStyleChangeAll={handleStyleChangeAll}
                onTransformChange={(id, p) => { updateElementTransform(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onReset={handleReset} onClose={() => { window.location.href = window.location.pathname; }}
                onSave={handleSave} selectedId={selectedId}
                obsUrlPath="/overlays/wwcd?layout=custom&design=premium"
                currentDesign="premium"
                onDesignChange={(d) => { window.location.href = `/overlays/wwcd?edit=true&design=${d}`; }}
            />
        </div>
    );
}
