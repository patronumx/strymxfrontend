import React, { Suspense } from 'react';
import DropLootedGraphicV2 from '@/components/ui/DropLootedGraphicV2';

export default function DropLootedOverlayPage() {
    return (
        <Suspense fallback={null}>
            <DropLootedGraphicV2 />
        </Suspense>
    );
}
