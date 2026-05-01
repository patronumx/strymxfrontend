"use client"

import React, { Suspense, useEffect, useState } from 'react';
import MatchRankingGraphic from '@/components/ui/MatchRankingGraphic';
import MatchRankingPremium from '@/components/ui/MatchRankingPremium';

type Mode = 'classic' | 'premium' | 'premium-edit' | 'premium-custom';

function MatchRankingRouter() {
    const [mode, setMode] = useState<Mode | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const design = params.get('design');
        const edit = params.get('edit') === 'true';
        const layout = params.get('layout');

        if (design === 'premium' || edit || layout === 'custom') {
            if (edit) setMode('premium-edit');
            else if (layout === 'custom') setMode('premium-custom');
            else setMode('premium');
        } else {
            setMode('classic');
        }
    }, []);

    if (mode === null) return null;

    if (mode.startsWith('premium')) {
        return <MatchRankingPremium />;
    }

    return <MatchRankingGraphic matchId="test-match-001" />;
}

export default function MatchRankingOverlayPage() {
    return (
        <Suspense fallback={<div className="bg-transparent w-screen h-screen" />}>
            <MatchRankingRouter />
        </Suspense>
    );
}
