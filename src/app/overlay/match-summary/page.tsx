"use client"

import React, { Suspense, useEffect, useState } from 'react';
import MatchSummaryClassic from '@/components/ui/MatchSummaryClassic';
import MatchSummaryGraphicV2 from '@/components/ui/MatchSummaryGraphicV2';

/**
 * Match Summary Overlay Router
 * ─────────────────────────────
 * Three completely separate rendering paths:
 *
 *   /overlay/match-summary                → CLASSIC design (free tier)
 *                                           - Fixed grid layout (flex-wrap at bottom)
 *                                           - Colors from OverlayConfigContext (Edit Overlay)
 *                                           - Used by broadcast output for free-tier users
 *
 *   /overlay/match-summary?edit=true      → PREMIUM drag-drop editor (V2 with handles)
 *                                           - Editor canvas + sidebar with tabs
 *                                           - Layout saved to `strymx_layout:match-summary:*`
 *
 *   /overlay/match-summary?layout=custom  → PREMIUM broadcast output (V2 no handles)
 *                                           - Renders saved layout with real live data
 *                                           - This is the URL premium users add to OBS
 */
type Mode = 'classic' | 'edit' | 'custom-layout';

function MatchSummaryRouter() {
    const [mode, setMode] = useState<Mode | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('edit') === 'true') setMode('edit');
        else if (params.get('layout') === 'custom') setMode('custom-layout');
        else setMode('classic');
    }, []);

    if (mode === null) return null; // avoid hydration mismatch

    if (mode === 'edit' || mode === 'custom-layout') {
        return <MatchSummaryGraphicV2 />;
    }

    return <MatchSummaryClassic />;
}

export default function MatchSummaryOverlay() {
    return (
        <Suspense fallback={<div className="bg-transparent w-screen h-screen" />}>
            <MatchSummaryRouter />
        </Suspense>
    );
}
