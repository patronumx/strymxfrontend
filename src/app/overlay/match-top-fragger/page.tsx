"use client"

import React, { Suspense, useEffect, useState } from 'react';
import TopFraggerClassic from '@/components/ui/TopFraggerClassic';
import TopFraggerGraphicV2 from '@/components/ui/TopFraggerGraphicV2';

type Mode = 'classic' | 'edit' | 'custom-layout';

function TopFraggerRouter() {
    const [mode, setMode] = useState<Mode | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('edit') === 'true') setMode('edit');
        else if (params.get('layout') === 'custom') setMode('custom-layout');
        else setMode('classic');
    }, []);

    if (mode === null) return null;
    if (mode === 'edit' || mode === 'custom-layout') return <TopFraggerGraphicV2 />;
    return <TopFraggerClassic />;
}

export default function MatchTopFraggerOverlay() {
    return (
        <Suspense fallback={<div className="bg-transparent w-screen h-screen" />}>
            <TopFraggerRouter />
        </Suspense>
    );
}
