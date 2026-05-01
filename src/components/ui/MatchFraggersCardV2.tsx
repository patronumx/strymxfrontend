"use client"
import { API_URL , WS_URL} from '@/lib/api-config';

import React, { useEffect, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import EditableGraphicElement, {
    clearOverlayLayout, updateElementStyle, updateElementTransform,
    readElementStyle, readElementTransform,
    type ElementTransform, type ElementStyle,
} from './EditableGraphicElement';
import FraggersCardSidebar from './FraggersCardSidebar';
import DesignSwitcher from './DesignSwitcher';
import { getFontById, injectBroadcastFonts } from './broadcastFonts';

const OVERLAY_KEY = 'match-fraggers-cards';
const VIEWPORT = { width: 1920, height: 1080 };
const CARD_COUNT = 5;

interface PlayerStat {
    playerKey: string;
    name: string;
    teamName: string;
    killNum: number;
    damage: number;
    knockouts?: number;
    survivalTime?: string | number;
    logoUrl?: string;
}

const MOCK_PLAYERS: PlayerStat[] = [
    { playerKey: 'm1', name: 'AT FALAK',     teamName: 'TEAM APEX',    killNum: 14, damage: 2150, knockouts: 18, survivalTime: '24:15' },
    { playerKey: 'm2', name: 'KOLORD',       teamName: 'FNATIC',       killNum: 12, damage: 1980, knockouts: 15, survivalTime: '22:48' },
    { playerKey: 'm3', name: 'OUTLAW2117',   teamName: 'OUTLAWS',      killNum: 11, damage: 1720, knockouts: 13, survivalTime: '21:02' },
    { playerKey: 'm4', name: 'TARZAN',       teamName: 'FPX',          killNum: 10, damage: 1600, knockouts: 12, survivalTime: '19:55' },
    { playerKey: 'm5', name: 'PR_DEMONMVP',  teamName: 'PARADIGM',     killNum: 9,  damage: 1430, knockouts: 10, survivalTime: '18:22' },
];

const CARD_IDS = Array.from({ length: CARD_COUNT }, (_, i) => `fragCard${i + 1}`);

const CARD_W = 340;
const CARD_H = 520;
const CARD_GAP = 20;
const TOTAL_W = CARD_COUNT * CARD_W + (CARD_COUNT - 1) * CARD_GAP;
const START_X = Math.round((VIEWPORT.width - TOTAL_W) / 2);
const START_Y = Math.round((VIEWPORT.height - CARD_H) / 2);

function defaultCardTransform(i: number): ElementTransform {
    return {
        x: START_X + i * (CARD_W + CARD_GAP),
        y: START_Y,
        width: CARD_W,
        height: CARD_H,
    };
}

const DEFAULT_CARD_STYLE: ElementStyle = {
    bgColor: '#1a1a2e',
    borderColor: '#2d2d44',
    textColor: '#ffffff',       // player name
    gradientStart: '#e91e63',   // rank badge + elims color
    gradientEnd: '#a3e635',     // damage color
    shadowColor: '#94a3b8',     // team name color
    glowColor: '#64748b',       // stat label color
    fontSize: 22,
    borderRadius: 16,
    borderWidth: 2,
    opacity: 1,
};

function formatTime(s: any) {
    if (!s) return '00:00';
    if (typeof s === 'string' && s.includes(':')) return s;
    const total = parseInt(s) || 0;
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function PlayerCardContent({ rank, player, style }: { rank: number; player: PlayerStat; style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'impact');
    const bg = style.bgColor || '#1a1a2e';
    const border = style.borderColor || '#2d2d44';
    const nameColor = style.textColor || '#ffffff';
    const teamColor = style.shadowColor || '#94a3b8';
    const elimsColor = style.gradientStart || '#e91e63';
    const damageColor = style.gradientEnd || '#a3e635';
    const statLabel = style.glowColor || '#64748b';
    const radius = style.borderRadius ?? 16;

    return (
        <div style={{
            width: '100%', height: '100%',
            backgroundColor: bg,
            border: `${style.borderWidth ?? 2}px solid ${border}`,
            borderRadius: radius,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
            {/* Rank badge */}
            <div style={{
                position: 'absolute', top: 12, left: 12, zIndex: 30,
                width: 36, height: 36, borderRadius: '50%',
                background: elimsColor,
                boxShadow: `0 4px 12px ${elimsColor}60`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <span style={{
                    fontSize: 16, fontWeight: 900, fontStyle: 'italic',
                    color: '#ffffff', fontFamily: font?.family,
                }}>{rank}</span>
            </div>

            {/* Team logo */}
            {player.logoUrl && (
                <div style={{
                    position: 'absolute', top: 12, right: 12, zIndex: 30,
                    width: 36, height: 36, borderRadius: 8,
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(8px)',
                    padding: 4,
                }}>
                    <img src={player.logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" />
                </div>
            )}

            {/* Photo */}
            <div style={{
                flex: '0 0 55%', position: 'relative', overflow: 'hidden',
            }}>
                <img
                    src={`${API_URL}/images/${player.playerKey}.png`}
                    onError={e => { (e.currentTarget as HTMLImageElement).src = `${API_URL}/images/default.png`; }}
                    style={{
                        width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top',
                        filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))',
                    }}
                    alt={player.name}
                />
                <div style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(transparent 50%, ${bg} 100%)`,
                }} />
            </div>

            {/* Name */}
            <div style={{ padding: '0 16px' }}>
                <h3 style={{
                    fontSize: style.fontSize || 22,
                    fontWeight: 900, color: nameColor,
                    textTransform: 'uppercase', letterSpacing: '-0.02em',
                    lineHeight: 1.1, margin: 0,
                    fontFamily: font?.family,
                }}>{player.name}</h3>
                <p style={{
                    fontSize: 10, fontWeight: 800, color: teamColor,
                    textTransform: 'uppercase', letterSpacing: '0.15em',
                    marginTop: 2,
                }}>{player.teamName}</p>
            </div>

            {/* Stats 2x2 */}
            <div style={{
                padding: '8px 12px 12px', flex: 1,
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
            }}>
                <StatMini label="ELIMS" value={String(player.killNum)} color={elimsColor} labelColor={statLabel} font={font?.family} />
                <StatMini label="DAMAGE" value={String(Math.round(player.damage))} color={damageColor} labelColor={statLabel} font={font?.family} />
                <StatMini label="KNOCKS" value={String(player.knockouts || 0)} color={nameColor} labelColor={statLabel} font={font?.family} />
                <StatMini label="SUR. TIME" value={formatTime(player.survivalTime)} color={nameColor} labelColor={statLabel} font={font?.family} mono />
            </div>
        </div>
    );
}

function StatMini({ label, value, color, labelColor, font, mono }: {
    label: string; value: string; color: string; labelColor: string; font?: string; mono?: boolean;
}) {
    return (
        <div style={{
            padding: '8px 10px', borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
        }}>
            <span style={{
                fontSize: 8, fontWeight: 900, color: labelColor,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                display: 'block', marginBottom: 3,
            }}>{label}</span>
            <span style={{
                fontSize: 24, fontWeight: 900, fontStyle: 'italic',
                color, lineHeight: 1,
                fontFamily: mono ? 'ui-monospace, monospace' : font,
            }}>{value}</span>
        </div>
    );
}

export default function MatchFraggersCardV2() {
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
        const socket = io(WS_URL);
        socket.on('match_state_update', (data) => { if (data?.activePlayers) setFetchedData(data.activePlayers); });
        socket.on('layout_push', (data: { overlayKey: string; layout: Record<string, any> }) => {
            if (data.overlayKey !== OVERLAY_KEY) return;
            Object.entries(data.layout).forEach(([id, config]) => {
                try { localStorage.setItem(`strymx_layout:${OVERLAY_KEY}:${id}`, JSON.stringify(config)); } catch {}
            });
            setPushCounter(c => c + 1);
        });
        return () => { socket.disconnect(); };
    }, [editMode]);

    useEffect(() => {
        const h = (e: StorageEvent) => { if (e.key?.startsWith(`strymx_layout:${OVERLAY_KEY}:`)) setStyleTick(t => t + 1); };
        window.addEventListener('storage', h);
        return () => window.removeEventListener('storage', h);
    }, []);

    useEffect(() => {
        if (!editMode) return;
        const c = () => { setCanvasScale(Math.min((window.innerWidth - 480) / VIEWPORT.width, (window.innerHeight - 80) / VIEWPORT.height, 1)); };
        c(); window.addEventListener('resize', c); return () => window.removeEventListener('resize', c);
    }, [editMode]);

    const topFraggers = useMemo(() => {
        if (editMode || !fetchedData.length) return MOCK_PLAYERS;
        return [...fetchedData]
            .filter(p => p.name && p.name !== 'Unknown')
            .sort((a, b) => b.killNum - a.killNum || b.damage - a.damage)
            .slice(0, CARD_COUNT);
    }, [editMode, fetchedData]);

    const padded: PlayerStat[] = Array.from({ length: CARD_COUNT }, (_, i) =>
        topFraggers[i] || { playerKey: `e${i}`, name: '—', teamName: '—', killNum: 0, damage: 0, knockouts: 0, survivalTime: '00:00' }
    );

    const allStyles: Record<string, ElementStyle> = {};
    const allTransforms: Record<string, ElementTransform> = {};
    CARD_IDS.forEach((id, i) => {
        allStyles[id] = { ...DEFAULT_CARD_STYLE, ...readElementStyle(OVERLAY_KEY, id) };
        allTransforms[id] = { ...defaultCardTransform(i), ...readElementTransform(OVERLAY_KEY, id) };
    });

    const handleReset = () => { clearOverlayLayout(OVERLAY_KEY); setResetCounter(c => c + 1); setStyleTick(t => t + 1); setSelectedId(null); };
    const handleStyleChangeAll = (patch: Partial<ElementStyle>) => { CARD_IDS.forEach(id => updateElementStyle(OVERLAY_KEY, id, patch)); setStyleTick(t => t + 1); };
    const handleSave = async (): Promise<boolean> => {
        const layout: Record<string, any> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k?.startsWith(`strymx_layout:${OVERLAY_KEY}:`)) {
                try { layout[k.replace(`strymx_layout:${OVERLAY_KEY}:`, '')] = JSON.parse(localStorage.getItem(k)!); } catch {}
            }
        }
        try { return (await fetch(`${API_URL}/api/layouts/push`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ overlayKey: OVERLAY_KEY, layout }) })).ok; } catch { return false; }
    };

    const cls = 'fraggers-cards-canvas-bounds';

    const viewportNode = (
        <div className={cls} style={{
            width: VIEWPORT.width, height: VIEWPORT.height,
            overflow: 'hidden', position: 'relative',
            fontFamily: 'Impact, "Arial Black", system-ui, sans-serif',
            userSelect: 'none',
            background: editMode ? 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.7))' : 'transparent',
            border: editMode ? '2px dashed rgba(59,130,246,0.25)' : undefined,
            borderRadius: editMode ? 12 : 0,
        }}>
            {editMode && <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />}
            {editMode && selectedId && <div onClick={() => setSelectedId(null)} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />}

            {CARD_IDS.map((id, idx) => (
                <EditableGraphicElement
                    key={editMode ? `${id}-${resetCounter}` : `${id}-${resetCounter}-${pushCounter}`}
                    id={id} overlayKey={OVERLAY_KEY}
                    defaultTransform={defaultCardTransform(idx)}
                    defaultStyle={DEFAULT_CARD_STYLE}
                    editMode={editMode} selected={selectedId === id}
                    onSelect={setSelectedId} label={`Card #${idx + 1}`}
                    bounds={`.${cls}`} scale={canvasScale}
                >
                    {(style) => <PlayerCardContent rank={idx + 1} player={padded[idx]} style={style} />}
                </EditableGraphicElement>
            ))}
        </div>
    );

    if (!editMode) {
        return <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'transparent' }}>{viewportNode}</div>;
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at center, rgba(30,41,59,0.95), rgba(2,6,23,0.98))', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
            <DesignSwitcher currentDesign="cards" overlayPath="/overlay/match-fraggers" />
            <div style={{ position: 'absolute', left: 0, top: 0, right: 400, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, pointerEvents: 'none' }}>
                <div style={{ width: VIEWPORT.width * canvasScale, height: VIEWPORT.height * canvasScale, position: 'relative', pointerEvents: 'auto' }}>
                    <div style={{ width: VIEWPORT.width, height: VIEWPORT.height, transform: `scale(${canvasScale})`, transformOrigin: 'top left' }}>
                        {viewportNode}
                    </div>
                </div>
            </div>
            <FraggersCardSidebar
                cardIds={CARD_IDS.map((id, i) => ({ id, label: `Card #${i + 1}` }))}
                elementStyles={allStyles} elementTransforms={allTransforms}
                onStyleChange={(id, p) => { updateElementStyle(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onStyleChangeAll={handleStyleChangeAll}
                onTransformChange={(id, p) => { updateElementTransform(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onReset={handleReset}
                onClose={() => { window.location.href = window.location.pathname; }}
                onSave={handleSave} selectedId={selectedId}
                obsUrlPath="/overlay/match-fraggers?layout=custom&design=cards"
            />
        </div>
    );
}
