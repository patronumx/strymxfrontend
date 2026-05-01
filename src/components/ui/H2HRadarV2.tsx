"use client"

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import MatchSummaryEditSidebar from './MatchSummaryEditSidebar';
import EditableGraphicElement, {
    clearOverlayLayout, updateElementStyle, updateElementTransform,
    readElementStyle, readElementTransform,
    type ElementTransform, type ElementStyle,
} from './EditableGraphicElement';
import { defaultHeadToHeadConfig, type HeadToHeadConfig } from '@/context/OverlayConfigContext';
import { PentagonRadar, PlayerCard, type RadarPlayerStat } from './H2HRadarGraphic';

const OVERLAY_KEY = 'h2h-radar';
const VIEWPORT = { width: 1920, height: 1080 };
const OBS_URL = '/overlay/head-to-head?layout=custom';
const CLS = 'h2h-radar-bounds';

const MOCK_P1: RadarPlayerStat = { playerKey: 'm1', name: 'PESMAAZ', teamName: 'PATRONUM ESP', killNum: 14, damage: 2450, headShotNum: 6, survivalTime: 1540, assists: 3 };
const MOCK_P2: RadarPlayerStat = { playerKey: 'm2', name: 'MAAZZZ',  teamName: 'PATRONUM ESP', killNum: 12, damage: 2100, headShotNum: 4, survivalTime: 1420, assists: 5 };

const BLOCK = { p1: 'radarP1', p2: 'radarP2', center: 'radarCenter' };
const ALL_IDS = Object.values(BLOCK);

const DEFAULTS: Record<string, { transform: ElementTransform; style: ElementStyle }> = {
    [BLOCK.p1]: {
        transform: { x: 40,   y: 190, width: 380, height: 700 },
        style: { bgColor: '#0a0d14', borderColor: '#FF3D60', textColor: '#E91E63', gradientStart: '#FF3D60', gradientEnd: '#FFD700', borderRadius: 0, fontSize: 22 },
    },
    [BLOCK.p2]: {
        transform: { x: 1500, y: 190, width: 380, height: 700 },
        style: { bgColor: '#0a0d14', borderColor: '#FFD700', textColor: '#E91E63', gradientStart: '#FFD700', gradientEnd: '#FFD700', borderRadius: 0, fontSize: 22 },
    },
    [BLOCK.center]: {
        transform: { x: 460,  y: 80,  width: 1000, height: 920 },
        style: { bgColor: '#0A5F5F', borderColor: '#FF3D60', textColor: '#ffffff', gradientStart: '#FF3D60', gradientEnd: '#FFD700', borderRadius: 0, fontSize: 52 },
    },
};

function readH2HConfig(): HeadToHeadConfig {
    try {
        const raw = localStorage.getItem('strymx_overlay_configs');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed['head-to-head']) return { ...defaultHeadToHeadConfig, ...parsed['head-to-head'] };
        }
    } catch { }
    return { ...defaultHeadToHeadConfig };
}

function writeH2HConfig(patch: Partial<HeadToHeadConfig>) {
    try {
        const raw = localStorage.getItem('strymx_overlay_configs') || '{}';
        const all = JSON.parse(raw);
        all['head-to-head'] = { ...(all['head-to-head'] || defaultHeadToHeadConfig), ...patch };
        localStorage.setItem('strymx_overlay_configs', JSON.stringify(all));
    } catch { }
}

// Map sidebar ElementStyle → HeadToHeadConfig
function styleToConfig(patch: Partial<ElementStyle>): Partial<HeadToHeadConfig> {
    const out: Partial<HeadToHeadConfig> = {};
    if (patch.bgColor       !== undefined) out.cardBgColor      = patch.bgColor;
    if (patch.borderColor   !== undefined) out.cardBorderColor  = patch.borderColor;
    if (patch.textColor     !== undefined) out.playerNameColor  = patch.textColor;
    if (patch.gradientStart !== undefined) out.vsBadgeColor     = patch.gradientStart;
    if (patch.gradientEnd   !== undefined) out.statValueColor   = patch.gradientEnd;
    return out;
}

function configToStyle(id: string, cfg: HeadToHeadConfig): ElementStyle {
    if (id === BLOCK.p1)     return { ...DEFAULTS[BLOCK.p1].style,     bgColor: cfg.cardBgColor, borderColor: cfg.vsBadgeColor || '#FF3D60', textColor: cfg.playerNameColor };
    if (id === BLOCK.p2)     return { ...DEFAULTS[BLOCK.p2].style,     bgColor: cfg.cardBgColor, borderColor: cfg.statValueColor || '#FFD700', textColor: cfg.playerNameColor };
    if (id === BLOCK.center) return { ...DEFAULTS[BLOCK.center].style, bgColor: cfg.cardBorderColor || '#0A5F5F', textColor: cfg.headerTextColor, gradientStart: cfg.vsBadgeColor, gradientEnd: cfg.statValueColor };
    return DEFAULTS[id]?.style ?? {};
}

// ── Center element content (header + radar + legend) ──────────────────────────
function RadarCenter({ p1, p2, s, cfg }: { p1: RadarPlayerStat; p2: RadarPlayerStat; s: ElementStyle; cfg: HeadToHeadConfig }) {
    const fmtTime = (sec: number) => `${Math.floor(sec / 60).toString().padStart(2, '0')}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
    const fmtPct  = (v: number, total: number) => total > 0 ? `${Math.round((v / total) * 100)}%` : '0%';
    const totalKills = (p1.killNum ?? 0) + (p2.killNum ?? 0);
    const totalHs    = (p1.headShotNum ?? 0) + (p2.headShotNum ?? 0);

    const axes = useMemo(() => [
        { label: 'AVG. ELIMINATIONS', v1: p1.killNum ?? 0,     v2: p2.killNum ?? 0,     fmt: (v: number) => fmtPct(v, totalKills || 1) },
        { label: 'TEAM CONTRIB.',     v1: p1.headShotNum ?? 0, v2: p2.headShotNum ?? 0, fmt: (v: number) => fmtPct(v, totalHs || 1) },
        { label: 'LONGEST ELIM.',     v1: p1.assists ?? 0,     v2: p2.assists ?? 0,     fmt: (v: number) => `${v}m` },
        { label: 'AVG. SURVIVAL',     v1: p1.survivalTime ?? 0, v2: p2.survivalTime ?? 0, fmt: (v: number) => fmtTime(v) },
        { label: 'AVG. DAMAGE',       v1: p1.damage ?? 0,      v2: p2.damage ?? 0,      fmt: (v: number) => Math.round(v).toString().padStart(4, '0') },
    ], [p1, p2]);

    const radarNorm = axes.map(a => {
        const mx = Math.max(a.v1, a.v2, 0.001);
        return { norm1: (a.v1 / mx) * 100, norm2: (a.v2 / mx) * 100 };
    });
    const radarAxes = axes.map(a => ({ label: a.label, v1: a.fmt(a.v1), v2: a.fmt(a.v2) }));

    const p1Color = s.gradientStart || '#FF3D60';
    const p2Color = s.gradientEnd   || '#FFD700';

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {cfg.showHeader && (
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', marginBottom: 4 }}>
                        {cfg.headerSubtitle || 'MATCH COMPARISON'}
                    </p>
                    <h1 style={{ fontSize: s.fontSize || 52, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: s.textColor || '#fff', lineHeight: 1, letterSpacing: '-0.03em', margin: 0 }}>
                        HEAD <span style={{ color: p1Color }}>VS</span> HEAD
                    </h1>
                </div>
            )}
            <PentagonRadar
                p1Stats={radarNorm.map(r => r.norm1)}
                p2Stats={radarNorm.map(r => r.norm2)}
                axes={radarAxes}
                size={380}
                chartBg={s.bgColor}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 16, height: 3, background: p1Color, borderRadius: 2 }} />
                    <span style={{ fontSize: 10, fontWeight: 800, color: p1Color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{p1.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 16, height: 3, background: p2Color, borderRadius: 2 }} />
                    <span style={{ fontSize: 10, fontWeight: 800, color: p2Color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{p2.name}</span>
                </div>
            </div>
        </div>
    );
}

// ── Player card adaptor for ElementStyle ──────────────────────────────────────
function RadarCardEdit({ player, side, s, cfg }: { player: RadarPlayerStat; side: 'left' | 'right'; s: ElementStyle; cfg: HeadToHeadConfig }) {
    const merged: HeadToHeadConfig = {
        ...cfg,
        cardBgColor:    s.bgColor      ?? cfg.cardBgColor,
        cardBorderColor: s.borderColor ?? cfg.cardBorderColor,
        playerNameColor: s.textColor   ?? cfg.playerNameColor,
        vsBadgeColor:   s.gradientStart ?? cfg.vsBadgeColor,
    };
    return <PlayerCard player={player} side={side} backendHost="localhost" config={merged} />;
}

// ── Main V2 editor ────────────────────────────────────────────────────────────
export default function H2HRadarV2() {
    const [canvasScale, setCanvasScale] = useState(1);
    const [cfg, setCfg] = useState<HeadToHeadConfig>(defaultHeadToHeadConfig);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [resetCounter, setResetCounter] = useState(0);
    const [styleTick, setStyleTick] = useState(0);

    useEffect(() => {
        const calc = () => setCanvasScale(Math.min(
            (window.innerWidth  - 440) / VIEWPORT.width,
            (window.innerHeight -  80) / VIEWPORT.height,
            1
        ));
        calc();
        window.addEventListener('resize', calc);
        return () => window.removeEventListener('resize', calc);
    }, []);

    useEffect(() => { setCfg(readH2HConfig()); }, []);

    // Merge per-element style (from EditableGraphicElement localStorage) with config
    const allStyles: Record<string, ElementStyle> = {};
    const allTransforms: Record<string, ElementTransform> = {};
    ALL_IDS.forEach(id => {
        allStyles[id]    = { ...configToStyle(id, cfg), ...readElementStyle(OVERLAY_KEY, id) };
        allTransforms[id] = { ...DEFAULTS[id].transform,  ...readElementTransform(OVERLAY_KEY, id) };
    });

    const handleStyleChange = useCallback((id: string, patch: Partial<ElementStyle>) => {
        updateElementStyle(OVERLAY_KEY, id, patch);
        const configPatch = styleToConfig(patch);
        writeH2HConfig(configPatch);
        setCfg(prev => ({ ...prev, ...configPatch }));
        setStyleTick(t => t + 1);
    }, []);

    const handleStyleChangeAll = useCallback((patch: Partial<ElementStyle>) => {
        ALL_IDS.forEach(id => updateElementStyle(OVERLAY_KEY, id, patch));
        const configPatch = styleToConfig(patch);
        writeH2HConfig(configPatch);
        setCfg(prev => ({ ...prev, ...configPatch }));
        setStyleTick(t => t + 1);
    }, []);

    const handleTransformChange = useCallback((id: string, patch: Partial<ElementTransform>) => {
        updateElementTransform(OVERLAY_KEY, id, patch);
        setStyleTick(t => t + 1);
    }, []);

    const handleReset = useCallback(() => {
        clearOverlayLayout(OVERLAY_KEY);
        const defaults: Partial<HeadToHeadConfig> = {
            cardBgColor:     defaultHeadToHeadConfig.cardBgColor,
            cardBorderColor: defaultHeadToHeadConfig.cardBorderColor,
            playerNameColor: defaultHeadToHeadConfig.playerNameColor,
            vsBadgeColor:    defaultHeadToHeadConfig.vsBadgeColor,
            statValueColor:  defaultHeadToHeadConfig.statValueColor,
            headerTextColor: defaultHeadToHeadConfig.headerTextColor,
            teamNameColor:   defaultHeadToHeadConfig.teamNameColor,
        };
        writeH2HConfig(defaults);
        setCfg(prev => ({ ...prev, ...defaults }));
        setResetCounter(c => c + 1);
        setStyleTick(t => t + 1);
        setSelectedId(null);
    }, []);

    const handleSave = useCallback(async (): Promise<boolean> => {
        const layout: Record<string, any> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k?.startsWith(`strymx_layout:${OVERLAY_KEY}:`)) {
                try { layout[k.replace(`strymx_layout:${OVERLAY_KEY}:`, '')] = JSON.parse(localStorage.getItem(k)!); } catch {}
            }
        }
        try {
            return (await fetch('http://localhost:4000/api/layouts/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ overlayKey: OVERLAY_KEY, layout }),
            })).ok;
        } catch { return false; }
    }, []);

    const handleClose = useCallback(() => { window.location.href = window.location.pathname; }, []);

    const viewport = (
        <div className={CLS} style={{
            width: VIEWPORT.width, height: VIEWPORT.height,
            position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(30,41,59,0.55), rgba(15,23,42,0.65))',
            border: '2px dashed rgba(59,130,246,0.25)', borderRadius: 12,
            userSelect: 'none',
        }}>
            {/* Grid */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
                backgroundImage: 'linear-gradient(rgba(148,163,184,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.10) 1px, transparent 1px)',
                backgroundSize: '40px 40px' }} />

            {/* Deselect on canvas click */}
            {selectedId && <div onClick={() => setSelectedId(null)} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />}

            {/* Player 1 card */}
            <EditableGraphicElement
                key={`p1-${resetCounter}`}
                id={BLOCK.p1} overlayKey={OVERLAY_KEY}
                defaultTransform={DEFAULTS[BLOCK.p1].transform}
                defaultStyle={allStyles[BLOCK.p1]}
                editMode={true} selected={selectedId === BLOCK.p1}
                onSelect={setSelectedId} label="Player 1"
                bounds={`.${CLS}`} scale={canvasScale}
            >
                {(s) => <RadarCardEdit player={MOCK_P1} side="left" s={s} cfg={cfg} />}
            </EditableGraphicElement>

            {/* Player 2 card */}
            <EditableGraphicElement
                key={`p2-${resetCounter}`}
                id={BLOCK.p2} overlayKey={OVERLAY_KEY}
                defaultTransform={DEFAULTS[BLOCK.p2].transform}
                defaultStyle={allStyles[BLOCK.p2]}
                editMode={true} selected={selectedId === BLOCK.p2}
                onSelect={setSelectedId} label="Player 2"
                bounds={`.${CLS}`} scale={canvasScale}
            >
                {(s) => <RadarCardEdit player={MOCK_P2} side="right" s={s} cfg={cfg} />}
            </EditableGraphicElement>

            {/* Center — header + radar + legend */}
            <EditableGraphicElement
                key={`center-${resetCounter}`}
                id={BLOCK.center} overlayKey={OVERLAY_KEY}
                defaultTransform={DEFAULTS[BLOCK.center].transform}
                defaultStyle={allStyles[BLOCK.center]}
                editMode={true} selected={selectedId === BLOCK.center}
                onSelect={setSelectedId} label="Radar Center"
                bounds={`.${CLS}`} scale={canvasScale}
            >
                {(s) => <RadarCenter p1={MOCK_P1} p2={MOCK_P2} s={s} cfg={cfg} />}
            </EditableGraphicElement>
        </div>
    );

    return (
        <div style={{ position: 'fixed', inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(30,41,59,0.95), rgba(2,6,23,0.98))',
            overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>

            {/* Canvas area */}
            <div style={{ position: 'absolute', left: 0, top: 0, right: 400, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <div style={{ width: VIEWPORT.width * canvasScale, height: VIEWPORT.height * canvasScale,
                    position: 'relative' }}>
                    <div style={{ width: VIEWPORT.width, height: VIEWPORT.height,
                        transform: `scale(${canvasScale})`, transformOrigin: 'top left' }}>
                        {viewport}
                    </div>
                </div>
            </div>

            {/* Sidebar */}
            <MatchSummaryEditSidebar
                statCards={[
                    { id: BLOCK.p1,     label: 'Player 1 Card' },
                    { id: BLOCK.p2,     label: 'Player 2 Card' },
                    { id: BLOCK.center, label: 'Radar Center' },
                ]}
                elementStyles={allStyles}
                elementTransforms={allTransforms}
                onStyleChange={handleStyleChange}
                onStyleChangeAll={handleStyleChangeAll}
                onTransformChange={handleTransformChange}
                onReset={handleReset}
                onClose={handleClose}
                onSave={handleSave}
                selectedId={selectedId}
                obsUrlPath={OBS_URL}
            />
        </div>
    );
}
