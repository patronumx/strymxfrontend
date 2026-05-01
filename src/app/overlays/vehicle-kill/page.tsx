import React, { Suspense } from 'react';
import VehicleEliminationGraphic from '@/components/ui/VehicleEliminationGraphic';

export default function VehicleKillOverlayPage() {
    return (
        <Suspense fallback={null}>
            <VehicleEliminationGraphic />
        </Suspense>
    );
}
