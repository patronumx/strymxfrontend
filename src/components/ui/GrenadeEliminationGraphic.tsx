"use client"

import React from 'react';
import GenericEliminationOverlay from './GenericEliminationOverlay';

export default function GrenadeEliminationGraphic() {
    return (
        <GenericEliminationOverlay
            config={{
                overlayKey: 'grenade-kill',
                templateUrl: '/overlays/grenade-kill',
                displayName: 'Grenade Kill',
                titleDefault: 'GRENADE',
                subLabelDefault: 'ELIMINATION',
                imageAsset: '/assets/GRENADE.png',
                imageHueRotate: 290,
                imageSaturate: 250,
            }}
        />
    );
}
