import React, { Suspense } from 'react';
import PlayerDominationGraphic from '@/components/ui/PlayerDominationGraphic';

export default function PlayerDominationOverlayPage() {
    return (
        <Suspense fallback={null}>
            <PlayerDominationGraphic />
        </Suspense>
    );
}
