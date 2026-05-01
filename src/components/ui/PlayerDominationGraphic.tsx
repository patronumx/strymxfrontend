"use client"

import React from 'react';
import GenericEliminationOverlay from './GenericEliminationOverlay';

export default function PlayerDominationGraphic() {
    return (
        <GenericEliminationOverlay
            config={{
                overlayKey: 'player-domination',
                templateUrl: '/overlays/player-domination',
                displayName: 'Player Domination',
                titleDefault: 'PLAYER',
                subLabelDefault: 'DOMINATION',
                imageAsset: '/assets/Eliminations.png',
                imageHueRotate: 290,
                imageSaturate: 250,
            }}
        />
    );
}
