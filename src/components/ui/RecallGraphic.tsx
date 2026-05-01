"use client"

import React from 'react';
import GenericEliminationOverlay from './GenericEliminationOverlay';

/**
 * RecallGraphic
 * ─────────────
 * Event-triggered overlay shown when a player is recalled (revived/respawned).
 * Uses a cyan/blue color scheme to visually distinguish from elimination overlays.
 *
 * Structure: same as elimination overlays (GenericEliminationOverlay) but with
 * different title, subtitle, image tint, and default colors.
 */
export default function RecallGraphic() {
    return (
        <GenericEliminationOverlay
            config={{
                overlayKey: 'recall',
                templateUrl: '/overlays/recall',
                displayName: 'Player Recall',
                titleDefault: 'RECALL',
                subLabelDefault: 'BACK IN ACTION',
                imageAsset: '/assets/Headshots.png',
                // Cyan/blue hue-shift to give a "respawn" digital feel
                imageHueRotate: 180,
                imageSaturate: 300,
            }}
        />
    );
}
