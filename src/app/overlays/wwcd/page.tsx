"use client"

import React, { Suspense, useEffect, useState } from 'react';
import WWCDStatsGraphic from '@/components/ui/WWCDStatsGraphic';
import WWCDTeamStatsPremium from '@/components/ui/WWCDTeamStatsPremium';

import WwcdGraphicV2 from '@/components/ui/WwcdGraphicV2';

function WWCDRouter() {
    const [isEdit, setIsEdit] = useState<boolean | null>(null);
    const [design, setDesign] = useState<string>('classic');

    useEffect(() => {
        const p = new URLSearchParams(window.location.search);
        setIsEdit(p.get('edit') === 'true' || p.get('layout') === 'custom');
        setDesign(p.get('design') || 'classic');
    }, []);

    if (isEdit === null) return null;

    if (design === 'premium') return <WWCDTeamStatsPremium />;
    if (design === 'v2') return <WwcdGraphicV2 />;
    
    // Default fallback
    if (isEdit) return <WWCDTeamStatsPremium />; 
    return <WWCDStatsGraphic matchId="test-match-001" />;
}

export default function WWCDOverlayPage() {
    return (
        <Suspense fallback={null}>
            <WWCDRouter />
        </Suspense>
    );
}
