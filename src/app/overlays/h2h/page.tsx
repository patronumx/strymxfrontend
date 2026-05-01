import React, { Suspense } from 'react';
import RamadanH2HGraphic from '@/components/ui/RamadanH2HGraphic';

export default function RamadanH2HOverlayPage() {
    return (
        <Suspense fallback={null}>
            <RamadanH2HGraphic />
        </Suspense>
    );
}
