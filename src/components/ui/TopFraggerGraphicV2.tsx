"use client"
import { API_URL , WS_URL} from '@/lib/api-config';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
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
import MatchSummaryEditSidebar from './MatchSummaryEditSidebar';
import { getFontById, injectBroadcastFonts } from './broadcastFonts';

const OVERLAY_KEY = 'match-top-fragger';
const VIEWPORT = { width: 1920, height: 1080 };

interface PlayerStat {
    playerKey: string;
    name: string;
    teamName: string;
    teamTag?: string;
    killNum: number;
    damage: number;
    survivalTime?: string | number;
    logoUrl?: string;
}

const MOCK_PLAYER: PlayerStat = {
    playerKey: 'preview', name: 'PESMAAZ', teamName: 'PATRONUM ESPORTS',
    killNum: 14, damage: 2450, survivalTime: '25:40',
};

// Editable block IDs — each can be dragged and styled independently
const BLOCK_IDS = {
    greenBg: 'tfGreenBg',
    title: 'tfTitle',
    photo: 'tfPhoto',
    nameBanner: 'tfNameBanner',
    elims: 'tfElims',
    damage: 'tfDamage',
    survival: 'tfSurvival',
};

const DEFAULTS: Record<string, { transform: ElementTransform; style: ElementStyle }> = {
    [BLOCK_IDS.greenBg]: {
        transform: { x: 0, y: 0, width: 1060, height: 1080 },
        style: { bgColor: '#a3e635', gradientStart: '#a3e635', gradientEnd: '#84cc16' },
    },
    [BLOCK_IDS.title]: {
        transform: { x: 1180, y: 380, width: 680, height: 300 },
        style: { textColor: '#0f172a', gradientStart: '#e91e63', fontSize: 95, text: 'MATCH TOP FRAGGER' },
    },
    [BLOCK_IDS.photo]: {
        transform: { x: 60, y: 280, width: 550, height: 720 },
        style: {},
    },
    [BLOCK_IDS.nameBanner]: {
        transform: { x: 100, y: 870, width: 620, height: 160 },
        style: { bgColor: '#ffffff', gradientStart: '#e91e63', gradientEnd: '#1e293b', fontSize: 60, text: '' },
    },
    [BLOCK_IDS.elims]: {
        transform: { x: 720, y: 240, width: 280, height: 220 },
        style: { bgColor: 'transparent', gradientStart: '#e91e63', gradientEnd: '#1e293b', shadowColor: '#e91e63', fontSize: 22, text: 'ELIMINATIONS' },
    },
    [BLOCK_IDS.damage]: {
        transform: { x: 720, y: 470, width: 280, height: 220 },
        style: { bgColor: 'transparent', gradientStart: '#e91e63', gradientEnd: '#1e293b', shadowColor: '#e91e63', fontSize: 22, text: 'DAMAGE' },
    },
    [BLOCK_IDS.survival]: {
        transform: { x: 720, y: 700, width: 280, height: 220 },
        style: { bgColor: 'transparent', gradientStart: '#e91e63', gradientEnd: '#1e293b', shadowColor: '#e91e63', fontSize: 22, text: 'AVG. SURVIVAL' },
    },
};

const ALL_IDS = Object.values(BLOCK_IDS);

function formatTime(s: any) {
    if (!s) return '00.00';
    if (typeof s === 'string' && s.includes(':')) return s.replace(':', '.');
    const total = parseInt(s) || 0;
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, '0')}.${secs.toString().padStart(2, '0')}`;
}

function PlayerPhoto({ player }: { player: PlayerStat }) {
    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <img
                src={`${API_URL}/images/${player.playerKey}.png`}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom', filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.5))' }}
                alt={player.name}
            />
        </div>
    );
}

function NameBannerBlock({ player, style }: { player: PlayerStat; style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'impact');
    return (
        <div style={{
            width: '100%', height: '100%',
            background: style.bgColor || '#ffffff',
            clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0 100%)',
            padding: '24px 40px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
            <h1 style={{
                fontSize: style.fontSize || 60,
                fontWeight: 900, fontStyle: 'italic', lineHeight: 0.9,
                color: style.gradientStart || '#e91e63',
                margin: 0, textTransform: 'uppercase',
                fontFamily: font?.family,
                letterSpacing: '-0.04em',
            }}>{player.name}</h1>
            <h2 style={{
                fontSize: Math.round((style.fontSize || 60) * 0.45),
                fontWeight: 900, marginTop: 8,
                color: style.gradientEnd || '#1e293b',
                letterSpacing: '0.15em', textTransform: 'uppercase',
                fontFamily: font?.family,
            }}>{player.teamTag || player.teamName.replace(/^scout\s+/i, '')}</h2>
        </div>
    );
}

function StatBlockContent({ label, value, style }: { label: string; value: string; style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'impact');
    return (
        <div style={{
            width: '100%', height: '100%',
            background: style.bgColor && style.bgColor !== 'transparent' ? style.bgColor : 'transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 12,
        }}>
            <span style={{
                fontSize: style.fontSize || 22,
                fontWeight: 900, color: style.gradientEnd || '#1e293b',
                letterSpacing: '0.15em', textTransform: 'uppercase',
                fontFamily: font?.family, marginBottom: 6,
            }}>{label}</span>
            <span style={{
                fontSize: Math.round((style.fontSize || 22) * 4.8),
                fontWeight: 900, fontStyle: 'italic',
                color: style.shadowColor || style.gradientStart || '#e91e63',
                lineHeight: 0.85, letterSpacing: '-0.04em',
                fontFamily: font?.family,
            }}>{value}</span>
        </div>
    );
}

function TitleBlock({ style }: { style: ElementStyle }) {
    const font = getFontById(style.fontFamily || 'impact');
    const titleText = style.text || 'MATCH TOP FRAGGER';
    const words = titleText.split(' ');
    const firstWord = words[0] || '';
    const restWords = words.slice(1).join(' ') || '';

    return (
        <div style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            paddingLeft: 40,
            borderLeft: `6px solid ${style.gradientStart || '#e91e63'}`,
        }}>
            <span style={{
                fontSize: Math.round((style.fontSize || 95) * 0.58),
                fontWeight: 900, color: style.gradientStart || '#e91e63',
                letterSpacing: '0.25em', textTransform: 'uppercase',
                fontFamily: font?.family, marginBottom: -10,
            }}>{firstWord}</span>
            <span style={{
                fontSize: style.fontSize || 95,
                fontWeight: 900, color: style.textColor || '#0f172a',
                letterSpacing: '-0.04em', textTransform: 'uppercase',
                lineHeight: 0.95,
                fontFamily: font?.family,
                whiteSpace: 'pre-wrap',
            }}>{restWords}</span>
        </div>
    );
}

export default function TopFraggerGraphicV2() {
    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [resetCounter, setResetCounter] = useState(0);
    const [styleTick, setStyleTick] = useState(0);
    const [pushCounter, setPushCounter] = useState(0);
    const [canvasScale, setCanvasScale] = useState(1);
    const [fetchedData, setFetchedData] = useState<PlayerStat[]>([]);
    const lastDataRef = useRef('');

    useEffect(() => { injectBroadcastFonts(); }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('edit') === 'true') setEditMode(true);
    }, []);

    useEffect(() => {
        if (editMode) return;
        const urlParams = new URLSearchParams(window.location.search);
        const matchId = urlParams.get('matchId') || 'pmtm-s4-match-1';

        // Fetch initial data
        fetch(`${API_URL}/api/match-state/${matchId}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.activePlayers) setFetchedData(data.activePlayers);
            })
            .catch(err => console.warn("Initial fetch error:", err));

        const socket = io(WS_URL);
        socket.on('match_state_update', (data) => {
            if (data && data.activePlayers) {
                const serialized = JSON.stringify(data.activePlayers);
                if (serialized !== lastDataRef.current) {
                    lastDataRef.current = serialized;
                    setFetchedData(data.activePlayers);
                }
            }
        });
        socket.on('layout_push', (data: { overlayKey: string; layout: Record<string, any> }) => {
            if (data.overlayKey !== OVERLAY_KEY) return;
            console.log(`[LAYOUT RECV] Applying ${Object.keys(data.layout).length} elements for ${OVERLAY_KEY}`);
            Object.entries(data.layout).forEach(([elementId, config]) => {
                const key = `strymx_layout:${OVERLAY_KEY}:${elementId}`;
                try { localStorage.setItem(key, JSON.stringify(config)); } catch {}
            });
            setPushCounter(c => c + 1);
        });
        return () => { socket.disconnect(); };
    }, [editMode]);

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
            const availW = Math.max(300, window.innerWidth - 400 - 80);
            const availH = Math.max(200, window.innerHeight - 80);
            setCanvasScale(Math.min(availW / VIEWPORT.width, availH / VIEWPORT.height, 1));
        };
        compute();
        window.addEventListener('resize', compute);
        return () => window.removeEventListener('resize', compute);
    }, [editMode]);

    const topFragger = useMemo(() => {
        if (editMode) return MOCK_PLAYER;
        if (!fetchedData || fetchedData.length === 0) return MOCK_PLAYER;
        return [...fetchedData]
            .filter(p => p.name && p.name !== 'Unknown')
            .sort((a, b) => {
                if (b.killNum !== a.killNum) return b.killNum - a.killNum;
                if (b.damage !== a.damage) return b.damage - a.damage;
                return (a.name || '').localeCompare(b.name || '');
            })[0] || MOCK_PLAYER;
    }, [editMode, fetchedData]);

    const allElementStyles: Record<string, ElementStyle> = {};
    const allElementTransforms: Record<string, ElementTransform> = {};
    ALL_IDS.forEach(id => {
        const def = DEFAULTS[id];
        allElementStyles[id] = { ...def.style, ...readElementStyle(OVERLAY_KEY, id) };
        allElementTransforms[id] = { ...def.transform, ...readElementTransform(OVERLAY_KEY, id) };
    });

    const handleReset = () => {
        clearOverlayLayout(OVERLAY_KEY);
        setResetCounter(c => c + 1);
        setStyleTick(t => t + 1);
        setSelectedId(null);
    };

    const handleStyleChangeAll = (patch: Partial<ElementStyle>) => {
        ALL_IDS.forEach(id => updateElementStyle(OVERLAY_KEY, id, patch));
        setStyleTick(t => t + 1);
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

    const canvasBoundsClass = 'top-fragger-canvas-bounds';

    const viewportNode = (
        <div
            className={canvasBoundsClass}
            style={{
                width: VIEWPORT.width,
                height: VIEWPORT.height,
                overflow: 'hidden',
                position: 'relative',
                fontFamily: 'Impact, "Arial Black", system-ui, sans-serif',
                userSelect: 'none',
                background: editMode ? 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.7))' : 'transparent',
                border: editMode ? '2px dashed rgba(59,130,246,0.25)' : undefined,
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
            {editMode && selectedId && (
                <div onClick={() => setSelectedId(null)} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
            )}

            {/* Green slanted background */}
            <EditableGraphicElement
                key={editMode ? `${BLOCK_IDS.greenBg}-${resetCounter}` : `${BLOCK_IDS.greenBg}-${resetCounter}-${pushCounter}`}
                id={BLOCK_IDS.greenBg} overlayKey={OVERLAY_KEY}
                defaultTransform={DEFAULTS[BLOCK_IDS.greenBg].transform}
                defaultStyle={DEFAULTS[BLOCK_IDS.greenBg].style}
                editMode={editMode} selected={selectedId === BLOCK_IDS.greenBg}
                onSelect={setSelectedId} label="Green BG"
                bounds={`.${canvasBoundsClass}`} scale={canvasScale}
            >
                {(style) => (
                    <div style={{
                        width: '100%', height: '100%',
                        background: `linear-gradient(135deg, ${style.gradientStart || '#a3e635'}, ${style.gradientEnd || '#84cc16'})`,
                        clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0% 100%)',
                    }} />
                )}
            </EditableGraphicElement>

            {/* Title block */}
            <EditableGraphicElement
                key={editMode ? `${BLOCK_IDS.title}-${resetCounter}` : `${BLOCK_IDS.title}-${resetCounter}-${pushCounter}`}
                id={BLOCK_IDS.title} overlayKey={OVERLAY_KEY}
                defaultTransform={DEFAULTS[BLOCK_IDS.title].transform}
                defaultStyle={DEFAULTS[BLOCK_IDS.title].style}
                editMode={editMode} selected={selectedId === BLOCK_IDS.title}
                onSelect={setSelectedId} label="Title"
                bounds={`.${canvasBoundsClass}`} scale={canvasScale}
            >
                {(style) => <TitleBlock style={style} />}
            </EditableGraphicElement>

            {/* Player photo */}
            <EditableGraphicElement
                key={editMode ? `${BLOCK_IDS.photo}-${resetCounter}` : `${BLOCK_IDS.photo}-${resetCounter}-${pushCounter}`}
                id={BLOCK_IDS.photo} overlayKey={OVERLAY_KEY}
                defaultTransform={DEFAULTS[BLOCK_IDS.photo].transform}
                defaultStyle={DEFAULTS[BLOCK_IDS.photo].style}
                editMode={editMode} selected={selectedId === BLOCK_IDS.photo}
                onSelect={setSelectedId} label="Player Photo"
                bounds={`.${canvasBoundsClass}`} scale={canvasScale}
            >
                <PlayerPhoto player={topFragger} />
            </EditableGraphicElement>

            {/* Name banner */}
            <EditableGraphicElement
                key={editMode ? `${BLOCK_IDS.nameBanner}-${resetCounter}` : `${BLOCK_IDS.nameBanner}-${resetCounter}-${pushCounter}`}
                id={BLOCK_IDS.nameBanner} overlayKey={OVERLAY_KEY}
                defaultTransform={DEFAULTS[BLOCK_IDS.nameBanner].transform}
                defaultStyle={DEFAULTS[BLOCK_IDS.nameBanner].style}
                editMode={editMode} selected={selectedId === BLOCK_IDS.nameBanner}
                onSelect={setSelectedId} label="Name Banner"
                bounds={`.${canvasBoundsClass}`} scale={canvasScale}
            >
                {(style) => <NameBannerBlock player={topFragger} style={style} />}
            </EditableGraphicElement>

            {/* Elims block */}
            <EditableGraphicElement
                key={editMode ? `${BLOCK_IDS.elims}-${resetCounter}` : `${BLOCK_IDS.elims}-${resetCounter}-${pushCounter}`}
                id={BLOCK_IDS.elims} overlayKey={OVERLAY_KEY}
                defaultTransform={DEFAULTS[BLOCK_IDS.elims].transform}
                defaultStyle={DEFAULTS[BLOCK_IDS.elims].style}
                editMode={editMode} selected={selectedId === BLOCK_IDS.elims}
                onSelect={setSelectedId} label="Elims"
                bounds={`.${canvasBoundsClass}`} scale={canvasScale}
            >
                {(style) => <StatBlockContent label={style.text || 'ELIMINATIONS'} value={String(topFragger.killNum).padStart(2, '0')} style={style} />}
            </EditableGraphicElement>

            {/* Damage block */}
            <EditableGraphicElement
                key={editMode ? `${BLOCK_IDS.damage}-${resetCounter}` : `${BLOCK_IDS.damage}-${resetCounter}-${pushCounter}`}
                id={BLOCK_IDS.damage} overlayKey={OVERLAY_KEY}
                defaultTransform={DEFAULTS[BLOCK_IDS.damage].transform}
                defaultStyle={DEFAULTS[BLOCK_IDS.damage].style}
                editMode={editMode} selected={selectedId === BLOCK_IDS.damage}
                onSelect={setSelectedId} label="Damage"
                bounds={`.${canvasBoundsClass}`} scale={canvasScale}
            >
                {(style) => <StatBlockContent label={style.text || 'DAMAGE'} value={String(Math.round(topFragger.damage)).padStart(3, '0')} style={style} />}
            </EditableGraphicElement>

            {/* Survival block */}
            <EditableGraphicElement
                key={editMode ? `${BLOCK_IDS.survival}-${resetCounter}` : `${BLOCK_IDS.survival}-${resetCounter}-${pushCounter}`}
                id={BLOCK_IDS.survival} overlayKey={OVERLAY_KEY}
                defaultTransform={DEFAULTS[BLOCK_IDS.survival].transform}
                defaultStyle={DEFAULTS[BLOCK_IDS.survival].style}
                editMode={editMode} selected={selectedId === BLOCK_IDS.survival}
                onSelect={setSelectedId} label="Survival"
                bounds={`.${canvasBoundsClass}`} scale={canvasScale}
            >
                {(style) => <StatBlockContent label={style.text || 'AVG. SURVIVAL'} value={formatTime(topFragger.survivalTime)} style={style} />}
            </EditableGraphicElement>
        </div>
    );

    if (!editMode) {
        return (
            <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'transparent' }}>
                {viewportNode}
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(30,41,59,0.95), rgba(2,6,23,0.98))',
            overflow: 'hidden',
            fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
            <div style={{
                position: 'absolute', left: 0, top: 0, right: 400, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 20, pointerEvents: 'none',
            }}>
                <div style={{
                    width: VIEWPORT.width * canvasScale,
                    height: VIEWPORT.height * canvasScale,
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

            <MatchSummaryEditSidebar
                statCards={[
                    { id: BLOCK_IDS.greenBg,    label: 'Green BG' },
                    { id: BLOCK_IDS.title,      label: 'Title Block' },
                    { id: BLOCK_IDS.photo,      label: 'Player Photo' },
                    { id: BLOCK_IDS.nameBanner, label: 'Name Banner' },
                    { id: BLOCK_IDS.elims,      label: 'Eliminations' },
                    { id: BLOCK_IDS.damage,     label: 'Damage' },
                    { id: BLOCK_IDS.survival,   label: 'Survival' },
                ]}
                elementStyles={allElementStyles}
                elementTransforms={allElementTransforms}
                onStyleChange={(id, patch) => {
                    updateElementStyle(OVERLAY_KEY, id, patch);
                    setStyleTick(t => t + 1);
                }}
                onStyleChangeAll={handleStyleChangeAll}
                onTransformChange={(id, patch) => {
                    updateElementTransform(OVERLAY_KEY, id, patch);
                    setStyleTick(t => t + 1);
                }}
                onReset={handleReset}
                onClose={() => { window.location.href = window.location.pathname; }}
                onSave={handleSaveAndPush}
                selectedId={selectedId}
                obsUrlPath="/overlay/match-top-fragger?layout=custom"
            />
        </div>
    );
}
