import React, { Suspense } from 'react';
import FirstBloodGraphicV2 from '@/components/ui/FirstBloodGraphicV2';

export default function FirstBloodOverlayPage() {
    return (
        <Suspense fallback={null}>
            <FirstBloodGraphicV2 />
        </Suspense>
    );
}
