"use client"

import React from 'react';
import GenericEliminationOverlay from './GenericEliminationOverlay';

export default function VehicleEliminationGraphic() {
    return (
        <GenericEliminationOverlay
            config={{
                overlayKey: 'vehicle-kill',
                templateUrl: '/overlays/vehicle-kill',
                displayName: 'Vehicle Kill',
                titleDefault: 'VEHICLE',
                subLabelDefault: 'ELIMINATION',
                imageAsset: '/assets/UAZ.png',
                imageHueRotate: 290,
                imageSaturate: 250,
            }}
        />
    );
}
