"use client"
import React, { Suspense, useEffect, useState } from 'react';
import TeamEliminatedGraphic from '@/components/ui/TeamEliminatedGraphic';
import TeamEliminatedV2 from '@/components/ui/TeamEliminatedV2';
import TeamEliminatedPremium from '@/components/ui/TeamEliminatedPremium';

function TeamElimRouter() {
    const [isEdit, setIsEdit] = useState<boolean | null>(null);
    const [design, setDesign] = useState<string>('classic');

    useEffect(() => {
        const p = new URLSearchParams(window.location.search);
        setIsEdit(p.get('edit') === 'true' || p.get('layout') === 'custom');
        setDesign(p.get('design') || 'classic');
    }, []);

    if (isEdit === null) return null;

    if (design === 'premium') return <TeamEliminatedPremium />;
    if (design === 'v2') return <TeamEliminatedV2 />;
    if (isEdit) return <TeamEliminatedPremium />; // Default to premium for editing
    return <TeamEliminatedGraphic />;
}

export default function TeamEliminatedOverlayPage() {
    return <Suspense fallback={null}><TeamElimRouter /></Suspense>;
}
