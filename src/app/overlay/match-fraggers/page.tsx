"use client"

import React, { Suspense, useEffect, useState } from 'react';
import MatchFraggersClassic from '@/components/ui/MatchFraggersClassic';
import MatchFraggersCardDesign from '@/components/ui/MatchFraggersCardDesign';
import MatchFraggersGraphicV2 from '@/components/ui/MatchFraggersGraphicV2';
import MatchFraggersCardV2 from '@/components/ui/MatchFraggersCardV2';

/**
 * Match Fraggers Overlay Router
 * ──────────────────────────────
 * Routes:
 *   ?edit=true               → V2 drag-drop editor (classic row layout)
 *   ?edit=true&design=cards  → V2 drag-drop editor (card grid layout)
 *   ?layout=custom           → premium broadcast (classic row, saved layout)
 *   ?layout=custom&design=cards → premium broadcast (card grid, saved layout)
 *   (no params)              → free-tier, picks design based on saved config
 */
type Mode = 'classic' | 'cards' | 'edit-classic' | 'edit-cards' | 'custom-classic' | 'custom-cards';

function getDesignFromStorage(): 'classic' | 'cards' {
    try {
        const saved = localStorage.getItem('strymx_overlay_configs');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed['match-fraggers']?.designStyle === 'cards') return 'cards';
        }
    } catch {}
    return 'classic';
}

function MatchFraggersRouter() {
    const [mode, setMode] = useState<Mode | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const design = params.get('design') || getDesignFromStorage();

        if (params.get('edit') === 'true') {
            setMode(design === 'cards' ? 'edit-cards' : 'edit-classic');
            return;
        }
        if (params.get('layout') === 'custom') {
            setMode(design === 'cards' ? 'custom-cards' : 'custom-classic');
            return;
        }
        setMode(design === 'cards' ? 'cards' : 'classic');
    }, []);

    // Listen for design style changes from studio via postMessage
    useEffect(() => {
        const handler = (e: MessageEvent) => {
            const ds = e.data?.config?.designStyle;
            if (!ds) return;
            if (
                (e.data?.type === 'strymx_overlay_config' || e.data?.type === 'strymx_batch_update') &&
                e.data.overlayType === 'match-fraggers'
            ) {
                setMode(ds === 'cards' ? 'cards' : 'classic');
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    // Cross-tab sync
    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key === 'strymx_overlay_configs' && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue);
                    const ds = parsed['match-fraggers']?.designStyle;
                    if (ds === 'classic' || ds === 'cards') setMode(ds);
                } catch {}
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    if (mode === null) return null;

    switch (mode) {
        case 'edit-classic':    return <MatchFraggersGraphicV2 />;
        case 'edit-cards':      return <MatchFraggersCardV2 />;
        case 'custom-classic':  return <MatchFraggersGraphicV2 />;
        case 'custom-cards':    return <MatchFraggersCardV2 />;
        case 'cards':           return <MatchFraggersCardDesign />;
        default:                return <MatchFraggersClassic />;
    }
}

export default function MatchFraggersOverlay() {
    return (
        <Suspense fallback={<div className="bg-transparent w-screen h-screen" />}>
            <MatchFraggersRouter />
        </Suspense>
    );
}
