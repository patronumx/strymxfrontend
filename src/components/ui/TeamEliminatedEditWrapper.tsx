"use client"
import React from 'react';
import GenericEliminationOverlay from './GenericEliminationOverlay';

export default function TeamEliminatedEditWrapper() {
    return (
        <GenericEliminationOverlay config={{
            overlayKey: 'team-eliminated',
            templateUrl: '/overlays/team-eliminated',
            displayName: 'Team Eliminated',
            titleDefault: 'ELIMINATED',
            subLabelDefault: 'TEAM WIPED',
            imageAsset: '/assets/Eliminations.png',
            imageHueRotate: 40,
            imageSaturate: 200,
        }} />
    );
}
