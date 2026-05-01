"use client"

import React from 'react';
import GenericEliminationOverlay from './GenericEliminationOverlay';

export default function DropLootedGraphicV2() {
    return (
        <GenericEliminationOverlay
            config={{
                overlayKey: 'drop-looted',
                templateUrl: '/overlays/drop-looted',
                displayName: 'Drop Looted',
                titleDefault: 'DROP',
                subLabelDefault: 'LOOTED',
                imageAsset: '/assets/AIRDROP.png',
                imageHueRotate: 290,
                imageSaturate: 250,
            }}
        />
    );
}
