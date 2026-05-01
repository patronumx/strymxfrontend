"use client"

import React, { Suspense, useEffect, useState } from 'react';
import OverallMvpClassic from '@/components/ui/OverallMvpClassic';
import OverallMvpCardDesign from '@/components/ui/OverallMvpCardDesign';
import OverallMvpGraphicV2 from '@/components/ui/OverallMvpGraphicV2';
import OverallMvpCardV2 from '@/components/ui/OverallMvpCardV2';

type Mode = 'classic' | 'cards' | 'edit-classic' | 'edit-cards' | 'custom-classic' | 'custom-cards';

function getDesignFromStorage(): 'classic' | 'cards' {
    try {
        const saved = localStorage.getItem('strymx_overlay_configs');
        if (saved) { const p = JSON.parse(saved); if (p['overall-mvp']?.designStyle === 'cards') return 'cards'; }
    } catch {}
    return 'classic';
}

function OverallMvpRouter() {
    const [mode, setMode] = useState<Mode | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const design = params.get('design') || getDesignFromStorage();
        if (params.get('edit') === 'true') { setMode(design === 'cards' ? 'edit-cards' : 'edit-classic'); return; }
        if (params.get('layout') === 'custom') { setMode(design === 'cards' ? 'custom-cards' : 'custom-classic'); return; }
        setMode(design === 'cards' ? 'cards' : 'classic');
    }, []);

    useEffect(() => {
        const h = (e: MessageEvent) => {
            const ds = e.data?.config?.designStyle;
            if (!ds) return;
            if ((e.data?.type === 'strymx_overlay_config' || e.data?.type === 'strymx_batch_update') && e.data.overlayType === 'overall-mvp')
                setMode(ds === 'cards' ? 'cards' : 'classic');
        };
        window.addEventListener('message', h); return () => window.removeEventListener('message', h);
    }, []);

    useEffect(() => {
        const h = (e: StorageEvent) => {
            if (e.key === 'strymx_overlay_configs' && e.newValue) {
                try { const p = JSON.parse(e.newValue); const ds = p['overall-mvp']?.designStyle; if (ds === 'classic' || ds === 'cards') setMode(ds); } catch {}
            }
        };
        window.addEventListener('storage', h); return () => window.removeEventListener('storage', h);
    }, []);

    if (mode === null) return null;
    switch (mode) {
        case 'edit-classic':   return <OverallMvpGraphicV2 />;
        case 'edit-cards':     return <OverallMvpCardV2 />;
        case 'custom-classic': return <OverallMvpGraphicV2 />;
        case 'custom-cards':   return <OverallMvpCardV2 />;
        case 'cards':          return <OverallMvpCardDesign />;
        default:               return <OverallMvpClassic />;
    }
}

export default function OverallMvpOverlay() {
    return (
        <Suspense fallback={<div className="bg-transparent w-screen h-screen" />}>
            <OverallMvpRouter />
        </Suspense>
    );
}
