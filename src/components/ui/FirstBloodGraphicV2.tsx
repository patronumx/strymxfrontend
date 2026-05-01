"use client"

import React from 'react';
import GenericEliminationOverlay from './GenericEliminationOverlay';

export default function FirstBloodGraphicV2() {
    return (
        <GenericEliminationOverlay
            config={{
                overlayKey: 'first-blood',
                templateUrl: '/overlays/first-blood',
                displayName: 'First Blood',
                titleDefault: 'FIRST',
                subLabelDefault: 'BLOOD',
                imageAsset: '/assets/Headshots.png',
                imageHueRotate: 290,
                imageSaturate: 250,
            }}
        />
    );
}
