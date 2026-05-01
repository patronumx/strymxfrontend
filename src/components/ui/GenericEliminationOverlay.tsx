"use client"

import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import EditableGraphicElement, {
    clearOverlayLayout,
    updateElementStyle,
    updateElementTransform,
    readElementStyle,
    readElementTransform,
    type ElementTransform,
    type ElementStyle,
} from './EditableGraphicElement';
import GrenadeEditSidebar from './GrenadeEditSidebar';
import { getFontById, injectBroadcastFonts } from './broadcastFonts';
import { useTheme } from '@/context/ThemeContext';

interface PlayerData {
    playerKey: string;
    name: string;
    teamName: string;
    teamId?: number;
    logoUrl?: string;
    photoUrl?: string;
    teamTag?: string;
}

const VIEWPORT = { width: 1920, height: 1080 };
const ALL_ELEMENT_IDS = ['background', 'playerPhoto', 'teamLogo', 'oliveBranch', 'grenadeText', 'eliminationBar', 'grenadeImage', 'nameBar'];

export interface EliminationOverlayConfig {
    /** Unique key for localStorage layout persistence — must differ per overlay */
    overlayKey: string;
    /** The templateUrl that graphic_command messages should target */
    templateUrl: string;
    /** Display name shown in the edit sidebar header */
    displayName: string;
    /** Default title text (e.g. "GRENADE", "VEHICLE") */
    titleDefault: string;
    /** Default sub-label text (e.g. "ELIMINATION", "LOOTED") */
    subLabelDefault: string;
    /** Path to the right-side image asset */
    imageAsset: string;
    /** Optional hue-rotate degrees to tint the image (defaults to 290 for pink) */
    imageHueRotate?: number;
    /** Optional saturate percentage for the image tint */
    imageSaturate?: number;
}

// Default positions are shared across all elimination-style overlays
const DEFAULT_LAYOUT = {
    background: {
        transform: { x: 410, y: 350, width: 1100, height: 260 },
        style: { gradientStart: '#a3e635', gradientEnd: '#65a30d', borderRadius: 24 } as ElementStyle,
    },
    playerPhoto: {
        transform: { x: 430, y: 310, width: 320, height: 320 },
        style: {} as ElementStyle,
    },
    teamLogo: {
        transform: { x: 442, y: 370, width: 56, height: 56 },
        style: { borderColor: '#ffffff', bgColor: '#ffffff33' } as ElementStyle,
    },
    oliveBranch: {
        transform: { x: 755, y: 360, width: 60, height: 60 },
        style: { fontSize: 48 } as ElementStyle,
    },
    grenadeText: {
        transform: { x: 770, y: 390, width: 560, height: 160 },
        style: { textColor: '#e91e63', shadowColor: '#c2185b', fontSize: 130 } as ElementStyle,
    },
    eliminationBar: {
        transform: { x: 780, y: 540, width: 380, height: 56 },
        style: {
            gradientStart: '#65a30d',
            gradientEnd: '#84cc16',
            textColor: '#ffffff',
            borderColor: '#ffffff',
            borderRadius: 8,
            fontSize: 30,
        } as ElementStyle,
    },
    grenadeImage: {
        transform: { x: 1340, y: 330, width: 320, height: 320 },
        style: { glowColor: '#e91e63', hueRotate: 290, saturate: 250 } as ElementStyle,
    },
    nameBar: {
        transform: { x: 410, y: 610, width: 1100, height: 100 },
        style: {
            gradientStart: '#e91e63',
            gradientEnd: '#c2185b',
            textColor: '#ffffff',
            borderRadius: 24,
            fontSize: 44,
        } as ElementStyle,
    },
};

function PlayerPortrait({ photoUrl, playerKey, name }: { photoUrl?: string; playerKey: string; name: string }) {
    const [imgSrc, setImgSrc] = useState<string | null>(
        photoUrl || (playerKey ? `http://localhost:4000/images/${playerKey}.png` : null)
    );
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!photoUrl && playerKey) {
            setImgSrc(`http://localhost:4000/images/${playerKey}.png`);
            setFailed(false);
        }
    }, [photoUrl, playerKey]);

    return (
        <div style={{ position: 'relative', height: '100%', width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            {!failed && imgSrc ? (
                <img
                    src={imgSrc}
                    onError={() => {
                        if (imgSrc?.includes(':3000')) setImgSrc(`http://localhost:4000/images/${playerKey}.png`);
                        else setFailed(true);
                    }}
                    style={{
                        height: '100%', width: 'auto', objectFit: 'contain', objectPosition: 'bottom',
                        filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.55))',
                    }}
                    alt={name}
                />
            ) : (
                <div style={{
                    width: '80%', height: '75%', background: 'rgba(255,255,255,0.15)',
                    borderTopLeftRadius: 200, borderTopRightRadius: 200, marginBottom: 8,
                    border: '4px solid rgba(255,255,255,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <span style={{ fontSize: 96, color: 'rgba(255,255,255,0.4)', fontWeight: 900 }}>
                        {name?.charAt(0) || '?'}
                    </span>
                </div>
            )}
        </div>
    );
}

export default function GenericEliminationOverlay({ config }: { config: EliminationOverlayConfig }) {
    const BASE_OVERLAY_KEY = config.overlayKey;
    const { theme } = useTheme();

    const [isVisible, setIsVisible] = useState(false);
    const [player, setPlayer] = useState<PlayerData | null>(null);
    const [playKey, setPlayKey] = useState(0);
    const [editMode, setEditMode] = useState(false);
    // When true, reads saved layout from localStorage. When false, uses defaults only.
    const [useCustomLayout, setUseCustomLayout] = useState(false);
    // When true, theme colors from ThemeContext are applied (only in studio iframe preview)
    const [isStudioPreview, setIsStudioPreview] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [resetCounter, setResetCounter] = useState(0);
    const [styleTick, setStyleTick] = useState(0);
    const [canvasScale, setCanvasScale] = useState(1);
    // Auto-scale for output/preview mode so overlay fits any iframe size
    const [outputScale, setOutputScale] = useState(1);

    // Use a different storage key for preview mode so it doesn't read Edit Layout data
    const OVERLAY_KEY = useCustomLayout ? BASE_OVERLAY_KEY : `${BASE_OVERLAY_KEY}__preview`;

    useEffect(() => { injectBroadcastFonts(); }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('edit') === 'true') {
            setEditMode(true);
            setUseCustomLayout(true);
            setPlayer({ playerKey: 'preview', name: 'PLAYER NAME', teamName: 'TEAM', teamTag: 'TAG' });
            setIsVisible(true);
        } else if (params.get('layout') === 'custom') {
            // Premium broadcast output — use saved layout
            setUseCustomLayout(true);
        }
        // Studio preview mode — show with mock data, use theme colors, DEFAULT positions
        if (params.get('transparent') === 'true' || params.get('preview') === 'true') {
            setIsStudioPreview(true);
            setPlayer(prev => prev || { playerKey: 'preview', name: 'PLAYER NAME', teamName: 'TEAM', teamTag: 'TAG' });
            setIsVisible(true);
        }
    }, []);

    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key?.startsWith(`strymx_layout:${OVERLAY_KEY}:`)) setStyleTick(t => t + 1);
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, [OVERLAY_KEY]);

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

    // Auto-scale for output/preview mode (fits studio iframe or any viewport)
    useEffect(() => {
        if (editMode) return;
        const compute = () => {
            setOutputScale(Math.min(window.innerWidth / VIEWPORT.width, window.innerHeight / VIEWPORT.height, 1));
        };
        compute();
        window.addEventListener('resize', compute);
        return () => window.removeEventListener('resize', compute);
    }, [editMode]);

    useEffect(() => {
        if (editMode) return;
        const socket = io(`http://localhost:4000`);
        socket.on('graphic_command', (cmd) => {
            if (cmd.templateUrl === config.templateUrl) {
                if (cmd.action === 'PLAY') {
                    setPlayer(cmd.data);
                    setPlayKey(Date.now());
                    setIsVisible(true);
                    setTimeout(() => setIsVisible(false), 8000);
                } else if (cmd.action === 'STOP' || cmd.action === 'CLEAR') {
                    setIsVisible(false);
                }
            }
        });
        return () => { socket.disconnect(); };
    }, [editMode, config.templateUrl]);

    if (!player) return null;

    const handleReset = () => {
        clearOverlayLayout(OVERLAY_KEY);
        setResetCounter(c => c + 1);
        setStyleTick(t => t + 1);
        setSelectedId(null);
    };

    // Override defaults with config tint values AND live theme colors (for studio preview)
    // In preview mode (not custom layout), map theme colors to overlay elements:
    //   theme.primary   → title text, name bar, grenade glow
    //   theme.secondary → lime background, elimination bar
    //   theme.accent    → accent/text elements
    // Only apply theme colors when inside the studio iframe preview.
    // Standalone overlay pages and ?layout=custom broadcasts use hardcoded defaults.
    const themeOverrides = isStudioPreview ? {
        background: {
            style: {
                gradientStart: theme.secondary,
                gradientEnd: theme.gradientEnd || (theme.secondary + '99'),
            },
        },
        playerPhoto: { style: {} },
        teamLogo: {
            style: {
                borderColor: theme.accent || '#ffffff',
                bgColor: (theme.accent || '#ffffff') + '33',
            },
        },
        oliveBranch: { style: {} },
        grenadeText: {
            style: {
                textColor: theme.primary,
                shadowColor: theme.primary + 'aa',
            },
        },
        eliminationBar: {
            style: {
                gradientStart: theme.gradientStart || (theme.secondary + 'cc'),
                gradientEnd: theme.gradientEnd || theme.secondary,
                textColor: theme.headerText || '#ffffff',
                borderColor: theme.accent || '#ffffff',
            },
        },
        grenadeImage: {
            style: {
                glowColor: theme.primary,
            },
        },
        nameBar: {
            style: {
                gradientStart: theme.primary,
                gradientEnd: theme.primary + 'cc',
                textColor: theme.headerText || '#ffffff',
            },
        },
    } : {};

    // Build effective layout: merge defaults + config overrides + theme overrides (studio only)
    const effectiveLayout: typeof DEFAULT_LAYOUT = {} as any;
    for (const key of Object.keys(DEFAULT_LAYOUT) as (keyof typeof DEFAULT_LAYOUT)[]) {
        const defEntry = DEFAULT_LAYOUT[key];
        const overrideStyle = (themeOverrides as any)[key]?.style || {};
        (effectiveLayout as any)[key] = {
            transform: { ...defEntry.transform },
            style: { ...defEntry.style, ...overrideStyle },
        };
    }
    // Apply config-level image tint
    effectiveLayout.grenadeImage.style.hueRotate = config.imageHueRotate ?? effectiveLayout.grenadeImage.style.hueRotate ?? 290;
    effectiveLayout.grenadeImage.style.saturate = config.imageSaturate ?? effectiveLayout.grenadeImage.style.saturate ?? 250;

    // Build merged maps
    const allElementStyles: Record<string, ElementStyle> = {};
    const allElementTransforms: Record<string, ElementTransform> = {};
    for (const id of ALL_ELEMENT_IDS) {
        const defStyle = (effectiveLayout as any)[id]?.style || {};
        const defTransform = (effectiveLayout as any)[id]?.transform || {};
        allElementStyles[id] = { ...defStyle, ...readElementStyle(OVERLAY_KEY, id) };
        allElementTransforms[id] = { ...defTransform, ...readElementTransform(OVERLAY_KEY, id) };
    }

    const canvasBoundsClass = `overlay-canvas-bounds-${config.overlayKey}`;

    // In studio preview mode, include theme colors in element keys so they
    // remount when the theme changes. Without this, EditableGraphicElement's
    // internal useState caches the old defaultStyle from mount and ignores
    // new theme-derived props on re-render.
    const themeKey = isStudioPreview
        ? `${theme.primary}-${theme.secondary}-${theme.accent}-${theme.gradientStart}-${theme.gradientEnd}-${theme.headerText}`
        : '';

    const viewportNode = (
        <AnimatePresence mode="wait">
            {isVisible && (
                <motion.div
                    key={`${playKey}-${resetCounter}`}
                    initial={editMode ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
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
                            backgroundSize: '40px 40px',
                            pointerEvents: 'none',
                        }} />
                    )}

                    {editMode && selectedId && (
                        <div onClick={() => setSelectedId(null)} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
                    )}

                    <motion.div
                        initial={editMode ? false : { x: -1200, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -1200, opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 110 }}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                        key={`canvas-${styleTick}`}
                    >
                        {/* Background */}
                        <EditableGraphicElement id="background" overlayKey={OVERLAY_KEY}
                            defaultTransform={effectiveLayout.background.transform}
                            defaultStyle={effectiveLayout.background.style}
                            editMode={editMode} selected={selectedId === 'background'}
                            onSelect={setSelectedId} label="Background"
                            bounds={`.${canvasBoundsClass}`} scale={canvasScale}
                            key={`background-${resetCounter}-${themeKey}`}>
                            {(style) => (
                                <div style={{
                                    width: '100%', height: '100%',
                                    background: `linear-gradient(135deg, ${style.gradientStart || '#a3e635'} 0%, ${style.gradientEnd || '#65a30d'} 100%)`,
                                    borderTopLeftRadius: style.borderRadius ?? 24,
                                    borderTopRightRadius: style.borderRadius ?? 24,
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                                }} />
                            )}
                        </EditableGraphicElement>

                        {/* Player Photo */}
                        <EditableGraphicElement id="playerPhoto" overlayKey={OVERLAY_KEY}
                            defaultTransform={effectiveLayout.playerPhoto.transform}
                            editMode={editMode} selected={selectedId === 'playerPhoto'}
                            onSelect={setSelectedId} label="Player Photo"
                            bounds={`.${canvasBoundsClass}`} scale={canvasScale}
                            key={`playerPhoto-${resetCounter}-${themeKey}`}>
                            <PlayerPortrait photoUrl={player.photoUrl} playerKey={player.playerKey} name={player.name} />
                        </EditableGraphicElement>

                        {/* Team Logo */}
                        <EditableGraphicElement id="teamLogo" overlayKey={OVERLAY_KEY}
                            defaultTransform={effectiveLayout.teamLogo.transform}
                            defaultStyle={effectiveLayout.teamLogo.style}
                            editMode={editMode} selected={selectedId === 'teamLogo'}
                            onSelect={setSelectedId} label="Team Logo" lockAspect
                            bounds={`.${canvasBoundsClass}`} scale={canvasScale}
                            key={`teamLogo-${resetCounter}-${themeKey}`}>
                            {(style) => (
                                <div style={{
                                    width: '100%', height: '100%',
                                    background: style.bgColor || 'rgba(255,255,255,0.2)',
                                    backdropFilter: 'blur(8px)',
                                    borderRadius: '50%',
                                    padding: 4,
                                    border: `${style.borderWidth ?? 2}px solid ${style.borderColor || 'rgba(255,255,255,0.5)'}`,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                }}>
                                    <img src={player.logoUrl || 'http://localhost:4000/placeholder-logo.png'}
                                        alt={player.teamName}
                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                        onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }}
                                    />
                                </div>
                            )}
                        </EditableGraphicElement>

                        {/* Decoration */}
                        <EditableGraphicElement id="oliveBranch" overlayKey={OVERLAY_KEY}
                            defaultTransform={effectiveLayout.oliveBranch.transform}
                            defaultStyle={effectiveLayout.oliveBranch.style}
                            editMode={editMode} selected={selectedId === 'oliveBranch'}
                            onSelect={setSelectedId} label="Decoration"
                            bounds={`.${canvasBoundsClass}`} scale={canvasScale}
                            key={`oliveBranch-${resetCounter}-${themeKey}`}>
                            {(style) => (
                                <div style={{
                                    width: '100%', height: '100%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: style.fontSize || 48,
                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
                                }}>
                                    {style.text || '🌿'}
                                </div>
                            )}
                        </EditableGraphicElement>

                        {/* Title text */}
                        <EditableGraphicElement id="grenadeText" overlayKey={OVERLAY_KEY}
                            defaultTransform={effectiveLayout.grenadeText.transform}
                            defaultStyle={effectiveLayout.grenadeText.style}
                            editMode={editMode} selected={selectedId === 'grenadeText'}
                            onSelect={setSelectedId} label="Title"
                            bounds={`.${canvasBoundsClass}`} scale={canvasScale}
                            key={`grenadeText-${resetCounter}-${themeKey}`}>
                            {(style) => {
                                const font = getFontById(style.fontFamily || 'impact');
                                return (
                                    <div style={{
                                        width: '100%', height: '100%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                                    }}>
                                        <h2 style={{
                                            fontSize: style.fontSize || 130,
                                            fontWeight: 900,
                                            fontStyle: style.fontStyle || 'italic',
                                            fontFamily: font?.family || 'Impact, "Arial Black", sans-serif',
                                            color: style.textColor || '#e91e63',
                                            letterSpacing: style.letterSpacing !== undefined ? `${style.letterSpacing}px` : '-4px',
                                            lineHeight: 0.9,
                                            textTransform: 'uppercase',
                                            textShadow: `0 5px 0 ${style.shadowColor || '#c2185b'}, 0 8px 24px rgba(0,0,0,0.4)`,
                                            WebkitTextStroke: '1px rgba(0,0,0,0.2)',
                                            margin: 0,
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {style.text || config.titleDefault}
                                        </h2>
                                    </div>
                                );
                            }}
                        </EditableGraphicElement>

                        {/* Sub-label bar */}
                        <EditableGraphicElement id="eliminationBar" overlayKey={OVERLAY_KEY}
                            defaultTransform={effectiveLayout.eliminationBar.transform}
                            defaultStyle={effectiveLayout.eliminationBar.style}
                            editMode={editMode} selected={selectedId === 'eliminationBar'}
                            onSelect={setSelectedId} label="Sub-label Bar"
                            bounds={`.${canvasBoundsClass}`} scale={canvasScale}
                            key={`eliminationBar-${resetCounter}-${themeKey}`}>
                            {(style) => {
                                const font = getFontById(style.fontFamily || 'impact');
                                return (
                                    <div style={{
                                        width: '100%', height: '100%',
                                        background: `linear-gradient(90deg, ${style.gradientStart || '#65a30d'}, ${style.gradientEnd || '#84cc16'})`,
                                        borderRadius: style.borderRadius ?? 8,
                                        border: `2px solid ${style.borderColor || 'rgba(255,255,255,0.3)'}`,
                                        boxShadow: '0 6px 18px rgba(0,0,0,0.3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <span style={{
                                            fontSize: style.fontSize || 30,
                                            fontWeight: 900,
                                            fontFamily: font?.family || 'Impact, "Arial Black", sans-serif',
                                            color: style.textColor || '#ffffff',
                                            letterSpacing: style.letterSpacing !== undefined ? `${style.letterSpacing}px` : '9px',
                                            textTransform: 'uppercase',
                                            textShadow: '0 2px 4px rgba(0,0,0,0.4)',
                                        }}>
                                            {style.text || config.subLabelDefault}
                                        </span>
                                    </div>
                                );
                            }}
                        </EditableGraphicElement>

                        {/* Side image */}
                        <EditableGraphicElement id="grenadeImage" overlayKey={OVERLAY_KEY}
                            defaultTransform={effectiveLayout.grenadeImage.transform}
                            defaultStyle={effectiveLayout.grenadeImage.style}
                            editMode={editMode} selected={selectedId === 'grenadeImage'}
                            onSelect={setSelectedId} label="Image"
                            bounds={`.${canvasBoundsClass}`} scale={canvasScale}
                            key={`grenadeImage-${resetCounter}-${themeKey}`}>
                            {(style) => (
                                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                    <img src={config.imageAsset} alt={config.displayName}
                                        style={{
                                            width: '100%', height: '100%', objectFit: 'contain',
                                            transform: 'rotate(10deg)',
                                            filter: `hue-rotate(${style.hueRotate ?? 290}deg) saturate(${(style.saturate ?? 250) / 100}) brightness(1.05) drop-shadow(0 15px 30px rgba(0,0,0,0.55)) drop-shadow(0 0 30px ${style.glowColor || '#e91e63'}90)`,
                                        }}
                                    />
                                    <div style={{
                                        position: 'absolute', inset: 0, borderRadius: '50%',
                                        background: `${style.glowColor || '#e91e63'}55`,
                                        filter: 'blur(60px)', zIndex: -1,
                                    }} />
                                </div>
                            )}
                        </EditableGraphicElement>

                        {/* Name bar */}
                        <EditableGraphicElement id="nameBar" overlayKey={OVERLAY_KEY}
                            defaultTransform={effectiveLayout.nameBar.transform}
                            defaultStyle={effectiveLayout.nameBar.style}
                            editMode={editMode} selected={selectedId === 'nameBar'}
                            onSelect={setSelectedId} label="Name Bar"
                            bounds={`.${canvasBoundsClass}`} scale={canvasScale}
                            key={`nameBar-${resetCounter}-${themeKey}`}>
                            {(style) => {
                                const font = getFontById(style.fontFamily || 'impact');
                                return (
                                    <div style={{
                                        width: '100%', height: '100%',
                                        background: `linear-gradient(90deg, ${style.gradientStart || '#e91e63'} 0%, ${style.gradientEnd || '#c2185b'} 100%)`,
                                        borderBottomLeftRadius: style.borderRadius ?? 24,
                                        borderBottomRightRadius: style.borderRadius ?? 24,
                                        borderTop: '4px solid rgba(255,255,255,0.35)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '0 40px 0 360px',
                                        boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
                                    }}>
                                        <span style={{
                                            fontSize: style.fontSize || 44,
                                            fontWeight: 900,
                                            fontFamily: font?.family || 'Impact, "Arial Black", sans-serif',
                                            color: style.textColor || '#ffffff',
                                            fontStyle: style.fontStyle || 'italic',
                                            letterSpacing: style.letterSpacing !== undefined ? `${style.letterSpacing}px` : '7px',
                                            textTransform: 'uppercase',
                                            textShadow: '0 3px 6px rgba(0,0,0,0.4)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}>
                                            {player.name}
                                        </span>
                                        <div style={{
                                            minWidth: 100, height: 56,
                                            background: 'rgba(255,255,255,0.22)',
                                            border: '1.5px solid rgba(255,255,255,0.5)',
                                            borderRadius: 8,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            padding: '0 18px', marginLeft: 16,
                                        }}>
                                            <span style={{
                                                fontSize: 24, fontWeight: 900,
                                                fontFamily: font?.family || 'Impact, "Arial Black", sans-serif',
                                                color: style.textColor || '#ffffff',
                                                letterSpacing: '0.1em',
                                            }}>
                                                {player.teamTag || player.teamName.substring(0, 3).toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                );
                            }}
                        </EditableGraphicElement>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    // OUTPUT / PREVIEW MODE — scale to fit viewport (studio iframe or OBS)
    if (!editMode) {
        return (
            <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'transparent' }}>
                <div style={{
                    width: VIEWPORT.width,
                    height: VIEWPORT.height,
                    transform: `scale(${outputScale})`,
                    transformOrigin: 'top left',
                }}>
                    {viewportNode}
                </div>
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

            <GrenadeEditSidebar
                overlayTitle={config.displayName}
                elementStyles={allElementStyles}
                elementTransforms={allElementTransforms}
                titleDefault={config.titleDefault}
                subLabelDefault={config.subLabelDefault}
                effectsLabel={`${config.displayName} FX`}
                effectsImageKey="grenadeImage"
                onStyleChange={(id, patch) => {
                    updateElementStyle(OVERLAY_KEY, id, patch);
                    setStyleTick(t => t + 1);
                }}
                onTransformChange={(id, patch) => {
                    updateElementTransform(OVERLAY_KEY, id, patch);
                    setStyleTick(t => t + 1);
                }}
                onReset={handleReset}
                onClose={() => { window.location.href = window.location.pathname; }}
                selectedId={selectedId}
            />
        </div>
    );
}
