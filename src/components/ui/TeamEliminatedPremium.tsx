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

const OVERLAY_KEY = 'team-eliminated-premium';
const VIEWPORT = { width: 1920, height: 1080 };

interface TeamData {
    teamName: string; teamTag?: string; logoUrl?: string; placement: number; kills: number;
}

const MOCK: TeamData = { teamName: 'EFEX', teamTag: 'EFX', logoUrl: '', placement: 16, kills: 0 };

const BLOCK_IDS = { 
    mainContainer: 'teMain',
    leftInfo: 'teLeft',
    rightElims: 'teRight',
    bottomBar: 'teBottom'
};
const ALL_IDS = Object.values(BLOCK_IDS);

const DEFAULTS: Record<string, { transform: ElementTransform; style: ElementStyle }> = {
    [BLOCK_IDS.mainContainer]: { 
        transform: { x: 1300, y: 150, width: 500, height: 260 }, 
        style: { opacity: 1, visible: true, fontFamily: 'ttlakes' } 
    },
    [BLOCK_IDS.leftInfo]: { 
        transform: { x: 0, y: 0, width: 260, height: 180 }, 
        style: { gradientStart: '#fd5564', textColor: '#ffffff', fontFamily: 'ttlakes', fontWeight: 700, fontStyle: 'normal' } 
    },
    [BLOCK_IDS.rightElims]: { 
        transform: { x: 240, y: 0, width: 260, height: 180 }, 
        style: { gradientStart: '#00c0b5', textColor: '#ffffff', fontFamily: 'ttlakes', fontWeight: 700, fontStyle: 'normal' } 
    },
    [BLOCK_IDS.bottomBar]: { 
        transform: { x: 0, y: 170, width: 500, height: 80 }, 
        style: { gradientStart: '#d4ff00', textColor: '#003340', shadowColor: '#ffffff', fontFamily: 'ttlakes', fontWeight: 700, fontStyle: 'normal' } 
    },
};

export default function TeamEliminatedPremium() {
    const [editMode, setEditMode] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [resetCounter, setResetCounter] = useState(0);
    const [styleTick, setStyleTick] = useState(0);
    const [pushCounter, setPushCounter] = useState(0);
    const [canvasScale, setCanvasScale] = useState(1);
    const [team, setTeam] = useState<TeamData>(MOCK);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => { injectBroadcastFonts(); }, []);
    useEffect(() => {
        const p = new URLSearchParams(window.location.search);
        if (p.get('edit') === 'true') { setEditMode(true); setIsVisible(true); }
        if (p.get('layout') === 'custom') setIsVisible(true);
    }, []);

    useEffect(() => {
        if (editMode) return;
        const socket = io(WS_URL);
        socket.on('graphic_command', (cmd) => {
            if (cmd.templateUrl === '/overlays/team-eliminated' && cmd.action === 'PLAY') {
                setTeam(cmd.data); setIsVisible(true);
                setTimeout(() => setIsVisible(false), 6000);
            } else if (cmd.templateUrl === '/overlays/team-eliminated' && (cmd.action === 'STOP' || cmd.action === 'CLEAR')) setIsVisible(false);
        });
        return () => { socket.disconnect(); };
    }, [editMode]);

    useEffect(() => { 
        const h = (e: StorageEvent) => { 
            if (e.key?.startsWith(`strymx_layout:${OVERLAY_KEY}:`)) setStyleTick(t => t + 1); 
        }; 
        window.addEventListener('storage', h); 
        return () => window.removeEventListener('storage', h); 
    }, []);

    useEffect(() => { 
        if (!editMode) return; 
        const c = () => { 
            setCanvasScale(Math.min((window.innerWidth - 480) / VIEWPORT.width, (window.innerHeight - 80) / VIEWPORT.height, 1)); 
        }; 
        c(); 
        window.addEventListener('resize', c); 
        return () => window.removeEventListener('resize', c); 
    }, [editMode]);

    const allStyles: Record<string, ElementStyle> = {};
    const allTransforms: Record<string, ElementTransform> = {};
    ALL_IDS.forEach(id => { 
        allStyles[id] = { ...DEFAULTS[id].style, ...readElementStyle(OVERLAY_KEY, id) }; 
        allTransforms[id] = { ...DEFAULTS[id].transform, ...readElementTransform(OVERLAY_KEY, id) }; 
    });

    const handleReset = () => { 
        clearOverlayLayout(OVERLAY_KEY); 
        setResetCounter(c => c + 1); 
        setStyleTick(t => t + 1); 
        setSelectedId(null); 
    };

    const handleSave = async (): Promise<boolean> => { 
        const layout: Record<string, any> = {}; 
        for (let i = 0; i < localStorage.length; i++) { 
            const k = localStorage.key(i); 
            if (k?.startsWith(`strymx_layout:${OVERLAY_KEY}:`)) { 
                try { 
                    layout[k.replace(`strymx_layout:${OVERLAY_KEY}:`, '')] = JSON.parse(localStorage.getItem(k)!); 
                } catch {} 
            } 
        } 
        try { 
            return (await fetch(`${API_URL}/api/layouts/push`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ overlayKey: OVERLAY_KEY, layout }) 
            })).ok; 
        } catch { return false; } 
    };

    const cls = 'te-premium-canvas-bounds';

    const viewportNode = (
        <div className={cls} style={{ 
            width: VIEWPORT.width, height: VIEWPORT.height, overflow: 'hidden', position: 'relative', 
            fontFamily: 'Impact, "Arial Black", system-ui, sans-serif', userSelect: 'none', 
            background: editMode ? 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.7))' : 'transparent', 
            border: editMode ? '2px dashed rgba(59,130,246,0.25)' : undefined, 
            borderRadius: editMode ? 12 : 0 
        }}>
            {editMode && <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />}
            
            {isVisible && (
                <EditableGraphicElement
                    id={BLOCK_IDS.mainContainer}
                    overlayKey={OVERLAY_KEY}
                    defaultTransform={DEFAULTS[BLOCK_IDS.mainContainer].transform}
                    defaultStyle={DEFAULTS[BLOCK_IDS.mainContainer].style}
                    editMode={editMode}
                    selected={selectedId === BLOCK_IDS.mainContainer}
                    onSelect={setSelectedId}
                    label="Main Container"
                    bounds={`.${cls}`}
                    scale={canvasScale}
                >
                    {(mainStyle) => (
                        <div className="relative w-full h-full" style={{ opacity: mainStyle.opacity }}>
                            {/* Left Section (Logo) */}
                            <div className="absolute" style={{
                                left: allTransforms[BLOCK_IDS.leftInfo].x,
                                top: allTransforms[BLOCK_IDS.leftInfo].y,
                                width: allTransforms[BLOCK_IDS.leftInfo].width,
                                height: allTransforms[BLOCK_IDS.leftInfo].height,
                                background: allStyles[BLOCK_IDS.leftInfo].gradientStart || '#fd5564',
                                clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingRight: '15%'
                            }}>
                                {team.logoUrl ? (
                                    <img src={team.logoUrl} className="w-3/4 h-3/4 object-contain" alt="" />
                                ) : (
                                    <div className="text-white text-6xl" style={{ 
                                        fontFamily: getFontById(allStyles[BLOCK_IDS.leftInfo].fontFamily || 'ttlakes')?.family,
                                        fontWeight: allStyles[BLOCK_IDS.leftInfo].fontWeight || 700,
                                        fontStyle: allStyles[BLOCK_IDS.leftInfo].fontStyle || 'normal'
                                    }}>
                                        {team.teamName.charAt(0)}
                                    </div>
                                )}
                            </div>

                            {/* Right Section (Elims) */}
                             <div className="absolute" style={{
                                left: allTransforms[BLOCK_IDS.rightElims].x,
                                top: allTransforms[BLOCK_IDS.rightElims].y,
                                width: allTransforms[BLOCK_IDS.rightElims].width,
                                height: allTransforms[BLOCK_IDS.rightElims].height,
                                background: allStyles[BLOCK_IDS.rightElims].gradientStart || '#00c0b5',
                                clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0 100%)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingLeft: '15%'
                            }}>
                                <div className="text-white text-7xl leading-none" style={{ 
                                    fontFamily: getFontById(allStyles[BLOCK_IDS.rightElims].fontFamily || 'ttlakes')?.family,
                                    fontWeight: allStyles[BLOCK_IDS.rightElims].fontWeight || 700,
                                    fontStyle: allStyles[BLOCK_IDS.rightElims].fontStyle || 'normal'
                                }}>
                                    {team.kills}
                                </div>
                                <div className="text-white text-2xl tracking-widest uppercase" style={{ 
                                    fontFamily: getFontById(allStyles[BLOCK_IDS.rightElims].fontFamily || 'ttlakes')?.family,
                                    fontWeight: allStyles[BLOCK_IDS.rightElims].fontWeight || 700,
                                    fontStyle: allStyles[BLOCK_IDS.rightElims].fontStyle || 'normal'
                                }}>
                                    ELIMS
                                </div>
                            </div>

                            {/* Bottom Section (Banner) */}
                            <div className="absolute overflow-hidden" style={{
                                left: allTransforms[BLOCK_IDS.bottomBar].x,
                                top: allTransforms[BLOCK_IDS.bottomBar].y,
                                width: allTransforms[BLOCK_IDS.bottomBar].width,
                                height: allTransforms[BLOCK_IDS.bottomBar].height,
                                display: 'flex',
                                alignItems: 'stretch'
                            }}>
                                {/* Rank part */}
                                <div style={{
                                    width: '30%',
                                    background: '#00c0b5',
                                    clipPath: 'polygon(0 0, 100% 0, 80% 100%, 0 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#ffffff',
                                    fontSize: 48,
                                    paddingRight: '5%',
                                    fontFamily: getFontById(allStyles[BLOCK_IDS.bottomBar].fontFamily || 'ttlakes')?.family,
                                    fontWeight: allStyles[BLOCK_IDS.bottomBar].fontWeight || 700,
                                    fontStyle: allStyles[BLOCK_IDS.bottomBar].fontStyle || 'normal'
                                }}>
                                    #{team.placement}
                                </div>
                                {/* Eliminated text part */}
                                <div style={{
                                    flex: 1,
                                    marginLeft: '-5%',
                                    background: allStyles[BLOCK_IDS.bottomBar].gradientStart || '#d4ff00',
                                    clipPath: 'polygon(10% 0, 100% 0, 100% 100%, 0 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: allStyles[BLOCK_IDS.bottomBar].textColor || '#003340',
                                    fontSize: 42,
                                    letterSpacing: '0.1em',
                                    fontFamily: getFontById(allStyles[BLOCK_IDS.bottomBar].fontFamily || 'ttlakes')?.family,
                                    fontWeight: allStyles[BLOCK_IDS.bottomBar].fontWeight || 700,
                                    fontStyle: allStyles[BLOCK_IDS.bottomBar].fontStyle || 'normal'
                                }}>
                                    ELIMINATED
                                </div>
                            </div>
                        </div>
                    )}
                </EditableGraphicElement>
            )}
        </div>
    );

    if (!editMode) return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'transparent' }}>
            <div style={{ 
                width: VIEWPORT.width, height: VIEWPORT.height, 
                transform: `scale(${Math.min(typeof window !== 'undefined' ? window.innerWidth / VIEWPORT.width : 1, typeof window !== 'undefined' ? window.innerHeight / VIEWPORT.height : 1, 1)})`, 
                transformOrigin: 'top left' 
            }}>
                {viewportNode}
            </div>
        </div>
    );

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at center, rgba(30,41,59,0.95), rgba(2,6,23,0.98))', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, right: 400, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, pointerEvents: 'none' }}>
                <div style={{ width: VIEWPORT.width * canvasScale, height: VIEWPORT.height * canvasScale, position: 'relative', pointerEvents: 'auto' }}>
                    <div style={{ width: VIEWPORT.width, height: VIEWPORT.height, transform: `scale(${canvasScale})`, transformOrigin: 'top left' }}>{viewportNode}</div>
                </div>
            </div>
            <MatchSummaryEditSidebar
                statCards={[
                    { id: BLOCK_IDS.mainContainer, label: 'Main Box' },
                    { id: BLOCK_IDS.leftInfo, label: 'Logo Section' },
                    { id: BLOCK_IDS.rightElims, label: 'Elims Section' },
                    { id: BLOCK_IDS.bottomBar, label: 'Bottom Banner' }
                ]}
                elementStyles={allStyles} elementTransforms={allTransforms}
                onStyleChange={(id, p) => { updateElementStyle(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onStyleChangeAll={() => {}}
                onTransformChange={(id, p) => { updateElementTransform(OVERLAY_KEY, id, p); setStyleTick(t => t + 1); }}
                onReset={handleReset} onClose={() => { window.location.href = window.location.pathname; }}
                onSave={handleSave} selectedId={selectedId}
                obsUrlPath="/overlays/team-eliminated?layout=custom&design=premium"
                currentDesign="premium"
                onDesignChange={(d) => { window.location.href = `/overlays/team-eliminated?edit=true&design=${d}`; }}
            />
        </div>
    );
}
