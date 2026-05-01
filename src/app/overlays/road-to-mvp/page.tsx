"use client"

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import RoadToMvpPremium from '@/components/ui/RoadToMvpPremium';

function RoadToMvpRouter() {
    const searchParams = useSearchParams();
    const design = searchParams.get('design') || 'standard';

    if (design === 'premium') {
        return <RoadToMvpPremium />;
    }

    // Fallback or Standard Design
    return (
        <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">ROAD TO MVP</h1>
                <p className="text-slate-400 italic">Standard design coming soon or use ?design=premium</p>
            </div>
        </div>
    );
}

export default function RoadToMvpPage() {
    return (
        <Suspense fallback={<div className="h-screen bg-black" />}>
            <RoadToMvpRouter />
        </Suspense>
    );
}
