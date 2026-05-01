import React, { Suspense } from 'react';
import GrenadeEliminationGraphic from '@/components/ui/GrenadeEliminationGraphic';

export default function GrenadeKillOverlayPage() {
    return (
        <Suspense fallback={null}>
            <GrenadeEliminationGraphic />
        </Suspense>
    );
}
