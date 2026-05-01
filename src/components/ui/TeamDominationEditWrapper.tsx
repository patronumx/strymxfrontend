"use client"
import React from 'react';
import GenericEliminationOverlay from './GenericEliminationOverlay';

export default function TeamDominationEditWrapper() {
    return (
        <GenericEliminationOverlay config={{
            overlayKey: 'team-domination',
            templateUrl: '/overlays/team-domination',
            displayName: 'Team Domination',
            titleDefault: 'DOMINATING',
            subLabelDefault: '5+ KILLS',
            imageAsset: '/assets/Eliminations.png',
            imageHueRotate: 260,
            imageSaturate: 300,
        }} />
    );
}
