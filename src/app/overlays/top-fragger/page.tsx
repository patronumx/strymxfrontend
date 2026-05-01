import React, { Suspense } from 'react';
import RamadanTopFraggerGraphic from '@/components/ui/RamadanTopFraggerGraphic';

export default function RamadanTopFraggerOverlayPage() {
    return (
        <Suspense fallback={null}>
            <RamadanTopFraggerGraphic />
        </Suspense>
    );
}
