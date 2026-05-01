"use client"

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import MatchMvpPremium from '@/components/ui/MatchMvpPremium';

function MatchMvpRouter() {
    const searchParams = useSearchParams();
    const design = searchParams.get('design') || 'premium';

    // Currently only Premium is supported for MVP in this flow
    return <MatchMvpPremium />;
}

export default function MatchMvpPage() {
    return (
        <Suspense fallback={<div>Loading MVP Overlay...</div>}>
            <MatchMvpRouter />
        </Suspense>
    );
}
