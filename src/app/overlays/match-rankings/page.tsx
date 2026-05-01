import React, { Suspense } from 'react';
import RamadanRankingGraphic from '@/components/ui/RamadanRankingGraphic';

export default function RamadanRankingOverlayPage() {
    return (
        <Suspense fallback={null}>
            <RamadanRankingGraphic />
        </Suspense>
    );
}
