"use client"

import React, { Suspense, useEffect, useState } from 'react';
import HeadToHeadClassic from '@/components/ui/HeadToHeadClassic';
import HeadToHeadGraphicV2 from '@/components/ui/HeadToHeadGraphicV2';
import H2HRadarGraphic from '@/components/ui/H2HRadarGraphic';
import H2HRadarV2 from '@/components/ui/H2HRadarV2';

type Mode = 'classic' | 'edit' | 'custom-layout';

function H2HRouter() {
    const [mode, setMode] = useState<Mode | null>(null);
    const [designStyle, setDesignStyle] = useState<'classic' | 'radar'>('classic');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('edit') === 'true') setMode('edit');
        else if (params.get('layout') === 'custom') setMode('custom-layout');
        else setMode('classic');

        // Read saved design style from overlay config
        try {
            const saved = localStorage.getItem('strymx_overlay_configs');
            if (saved) {
                const parsed = JSON.parse(saved);
                const style = parsed?.['head-to-head']?.designStyle;
                if (style === 'radar' || style === 'classic') setDesignStyle(style);
            }
        } catch { }

        // Listen for live config updates from studio (postMessage)
        const handler = (e: MessageEvent) => {
            if ((e.data?.type === 'strymx_overlay_config' || e.data?.type === 'strymx_batch_update')
                && e.data.overlayType === 'head-to-head' && e.data.config?.designStyle) {
                setDesignStyle(e.data.config.designStyle);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    if (mode === null) return null;
    if (mode === 'edit' || mode === 'custom-layout') {
        if (designStyle === 'radar') return <H2HRadarV2 />;
        return <HeadToHeadGraphicV2 />;
    }
    if (designStyle === 'radar') return <H2HRadarGraphic />;
    return <HeadToHeadClassic />;
}

export default function HeadToHeadOverlay() {
    return (
        <Suspense fallback={<div className="bg-transparent w-screen h-screen" />}>
            <H2HRouter />
        </Suspense>
    );
}
