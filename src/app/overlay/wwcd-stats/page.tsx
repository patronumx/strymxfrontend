"use client"

import React, { Suspense, useEffect, useState } from 'react';
import WwcdClassic from '@/components/ui/WwcdClassic';
import WwcdGraphicV2 from '@/components/ui/WwcdGraphicV2';
import WWCDTeamStatsPremium from '@/components/ui/WWCDTeamStatsPremium';

type Mode = 'classic' | 'edit' | 'custom-layout';

function WwcdRouter() {
    const [mode, setMode] = useState<Mode | null>(null);
    const [design, setDesign] = useState<string>('classic');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('edit') === 'true') setMode('edit');
        else if (params.get('layout') === 'custom') setMode('custom-layout');
        else setMode('classic');
        setDesign(params.get('design') || 'classic');
    }, []);

    if (mode === null) return null;
    
    if (design === 'premium') return <WWCDTeamStatsPremium />;
    if (mode === 'edit' || mode === 'custom-layout') {
        if (design === 'v2') return <WwcdGraphicV2 />;
        return <WWCDTeamStatsPremium />; // Default to premium for editing
    }
    return <WwcdClassic />;
}

export default function WwcdStatsOverlay() {
    return (
        <Suspense fallback={<div className="bg-transparent w-screen h-screen" />}>
            <WwcdRouter />
        </Suspense>
    );
}
